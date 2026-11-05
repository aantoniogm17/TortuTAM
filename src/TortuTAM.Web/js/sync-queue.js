/*
  Cola de sincronizacion offline (issue #15). Cuando POST /api/fichas o
  POST /api/limpiezas fallan por falta de conexion, js/ficha-nueva.js y
  js/limpieza-nueva.js encolan el registro aqui en vez de solo mostrar un
  error. La cola vive en IndexedDB (no localStorage) porque una ficha puede
  traer fotos adjuntas como archivos binarios y localStorage no las soporta
  ni tiene espacio suficiente.

  Forma de cada registro guardado en el object store 'cola':
    {
      id: number (autoincrement),
      tipo: 'ficha' | 'limpieza' | 'varamiento' | 'necropsia',
      payload: object,          // mismo body que se le manda a la API
      fotos: File[],            // solo 'ficha' y 'varamiento'; [] en los demas
      idempotencyKey: string|null,  // solo 'ficha' y 'varamiento'; ver comentario abajo
      numeroFicha: string,      // descripcion para mostrar/depurar, no se usa para logica
                                // fichaIdServidor guarda tambien el id del varamiento creado
      estado: 'pendiente' | 'fotos_pendientes' | 'atencion',
      fichaIdServidor: number|null, // id que devolvio el servidor una vez creada la ficha
      intentos: number,
      mensajeError: string|null,
      creadoEn: string (ISO),
      actualizadoEn: string (ISO)
    }

  Estados:
    - pendiente: todavia no se logro enviar el POST principal (ficha o limpieza).
    - fotos_pendientes: la ficha ya se creo en el servidor (fichaIdServidor
      quedo lleno) pero aun faltan fotos por subir con POST /api/fichas/{id}/fotos.
    - atencion: el servidor respondio un error 4xx distinto de 409 (datos
      invalidos). No se reintenta solo: alguien debe revisar el registro.

  Idempotencia: POST /api/fichas acepta un header opcional Idempotency-Key.
  Se genera una vez al encolar y se reenvia igual en cada reintento, para
  que un mismo registro no se duplique si el POST tuvo exito en el servidor
  pero la respuesta no llego al cliente (p. ej. se perdio la señal justo
  despues de guardar). POST /api/limpiezas no tiene ese header todavia (fuera
  de alcance de este issue); para limpiezas se confia en que numero_ficha es
  unico y una respuesta 409 se trata como "ya se habia sincronizado antes".

  Este modulo no toca el DOM: dispara el evento 'tortutam:cola-cambio' en
  window con el conteo actualizado ({pendientes, atencion, total}) despues
  de cualquier cambio, para que js/pwa.js actualice el indicador sin que
  ambos archivos se acoplen directamente.
*/
(function(){
  var api = window.TortuTAM && window.TortuTAM.api;

  var DB_NAME = 'tortutam-sync-queue';
  var DB_VERSION = 1;
  var NOMBRE_STORE = 'cola';

  var dbPromise = null;

  function abrirDb(){
    if(dbPromise){ return dbPromise; }
    dbPromise = new Promise(function(resolve, reject){
      if(!window.indexedDB){
        reject(new Error('Este navegador no soporta IndexedDB; la cola de sincronizacion offline no esta disponible.'));
        return;
      }
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function(){
        var db = req.result;
        if(!db.objectStoreNames.contains(NOMBRE_STORE)){
          db.createObjectStore(NOMBRE_STORE, { keyPath: 'id', autoIncrement: true });
        }
      };
      req.onsuccess = function(){ resolve(req.result); };
      req.onerror = function(){ reject(req.error); };
    });
    return dbPromise;
  }

  function generarIdempotencyKey(){
    if(window.crypto && typeof window.crypto.randomUUID === 'function'){
      return window.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c){
      var r = Math.random() * 16 | 0;
      var v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /* ---------------- Acceso a IndexedDB ---------------- */

  function agregarRegistro(registro){
    return abrirDb().then(function(db){
      return new Promise(function(resolve, reject){
        var tx = db.transaction(NOMBRE_STORE, 'readwrite');
        var req = tx.objectStore(NOMBRE_STORE).add(registro);
        req.onsuccess = function(){ resolve(req.result); };
        req.onerror = function(){ reject(req.error); };
      });
    });
  }

  function guardarRegistro(registro){
    registro.actualizadoEn = new Date().toISOString();
    return abrirDb().then(function(db){
      return new Promise(function(resolve, reject){
        var tx = db.transaction(NOMBRE_STORE, 'readwrite');
        tx.objectStore(NOMBRE_STORE).put(registro);
        tx.oncomplete = function(){ resolve(); };
        tx.onerror = function(){ reject(tx.error); };
      });
    });
  }

  function eliminarRegistro(id){
    return abrirDb().then(function(db){
      return new Promise(function(resolve, reject){
        var tx = db.transaction(NOMBRE_STORE, 'readwrite');
        tx.objectStore(NOMBRE_STORE).delete(id);
        tx.oncomplete = function(){ resolve(); };
        tx.onerror = function(){ reject(tx.error); };
      });
    });
  }

  function listarPendientes(){
    return abrirDb().then(function(db){
      return new Promise(function(resolve, reject){
        var tx = db.transaction(NOMBRE_STORE, 'readonly');
        var req = tx.objectStore(NOMBRE_STORE).getAll();
        req.onsuccess = function(){ resolve(req.result || []); };
        req.onerror = function(){ reject(req.error); };
      });
    });
  }

  function contarPendientes(){
    return listarPendientes().then(function(items){
      var atencion = items.filter(function(r){ return r.estado === 'atencion'; }).length;
      return { pendientes: items.length - atencion, atencion: atencion, total: items.length };
    }).catch(function(){
      return { pendientes: 0, atencion: 0, total: 0 };
    });
  }

  /* ---------------- Notificacion al indicador (js/pwa.js) ---------------- */

  function notificarCambio(counts){
    function emitir(c){
      try{
        window.dispatchEvent(new CustomEvent('tortutam:cola-cambio', { detail: c }));
      }catch(e){
        /* CustomEvent no disponible en este navegador: el indicador se
           actualizara igual en la siguiente carga de la app. */
      }
    }
    if(counts){ emitir(counts); return Promise.resolve(counts); }
    return contarPendientes().then(function(c){ emitir(c); return c; });
  }

  /* ---------------- Encolar ---------------- */

  var TIPOS_VALIDOS = ['ficha', 'limpieza', 'varamiento', 'necropsia'];

  // Tipos cuyo POST acepta Idempotency-Key y que pueden llevar fotos
  // adjuntas que se suben despues de crear el registro.
  function usaIdempotenciaYFotos(tipo){
    return tipo === 'ficha' || tipo === 'varamiento';
  }

  function descripcionRegistro(tipo, payload){
    if(!payload){ return ''; }
    if(tipo === 'varamiento'){
      return 'Varamiento ' + (payload.fechaVaramiento || '') + ' #' + (payload.numeroTortugaDia || '');
    }
    if(tipo === 'necropsia'){
      return 'Necropsia del varamiento ' + (payload.varamientoId || '');
    }
    return payload.numeroFicha || '';
  }

  function encolar(tipo, payload, fotos){
    if(TIPOS_VALIDOS.indexOf(tipo) === -1){
      return Promise.reject(new Error('Tipo de registro no reconocido: ' + tipo));
    }
    var ahora = new Date().toISOString();
    var conFotos = usaIdempotenciaYFotos(tipo);
    var registro = {
      tipo: tipo,
      payload: payload,
      fotos: (conFotos && fotos && fotos.length) ? fotos.slice() : [],
      idempotencyKey: conFotos ? generarIdempotencyKey() : null,
      numeroFicha: descripcionRegistro(tipo, payload),
      estado: 'pendiente',
      fichaIdServidor: null,
      intentos: 0,
      mensajeError: null,
      creadoEn: ahora,
      actualizadoEn: ahora
    };
    return agregarRegistro(registro).then(function(id){
      registro.id = id;
      return notificarCambio().then(function(){ return registro; });
    });
  }

  /* ---------------- Sincronizacion ---------------- */

  function esFallaDeRed(err){
    return !(err && typeof err.status === 'number');
  }

  function manejarErrorEnvio(registro, err){
    if(err && err.status === 409 && registro.tipo === 'varamiento'){
      // En varamientos el reenvio duplicado ya lo resuelve Idempotency-Key;
      // un 409 significa que otro registro ya ocupa la misma fecha,
      // campamento y numero de tortuga del dia: requiere revision manual.
      registro.estado = 'atencion';
      registro.mensajeError = err.message || 'ya existe un varamiento con la misma fecha, campamento y número del día.';
      return guardarRegistro(registro).then(function(){ return 'atencion'; });
    }
    if(err && err.status === 409){
      // numero_ficha ya existe en el servidor: ya se habia sincronizado en
      // un intento anterior cuya respuesta no llego al cliente.
      return eliminarRegistro(registro.id).then(function(){ return 'sincronizado'; });
    }
    if(esFallaDeRed(err)){
      return guardarRegistro(registro).then(function(){ return 'pendiente'; });
    }
    if(typeof err.status === 'number' && err.status >= 400 && err.status < 500){
      registro.estado = 'atencion';
      registro.mensajeError = err.message || ('el servidor respondio con un error (' + err.status + ').');
      return guardarRegistro(registro).then(function(){ return 'atencion'; });
    }
    // Errores 5xx u otros inesperados: se tratan como transitorios y se
    // reintentan mas adelante, sin marcar el registro para revision manual.
    registro.mensajeError = (err && err.message) || null;
    return guardarRegistro(registro).then(function(){ return 'pendiente'; });
  }

  function subirFotosPendientes(registro){
    if(!registro.fotos.length){
      return eliminarRegistro(registro.id).then(function(){ return 'sincronizado'; });
    }
    var restantes = [];
    var subir = registro.tipo === 'varamiento'
      ? function(id, foto){ return api.subirFotosVaramiento(id, foto); }
      : function(id, foto){ return api.subirFoto(id, foto); };
    var tareas = registro.fotos.map(function(foto){
      return subir(registro.fichaIdServidor, foto).then(function(){
        return true;
      }).catch(function(){
        restantes.push(foto);
        return false;
      });
    });
    return Promise.all(tareas).then(function(){
      registro.fotos = restantes;
      if(!restantes.length){
        return eliminarRegistro(registro.id).then(function(){ return 'sincronizado'; });
      }
      return guardarRegistro(registro).then(function(){ return 'fotos_pendientes'; });
    });
  }

  function sincronizarConFotos(registro){
    registro.intentos += 1;
    var crear = registro.tipo === 'varamiento' ? api.crearVaramiento : api.crearFicha;
    return crear(registro.payload, { 'Idempotency-Key': registro.idempotencyKey }).then(function(ficha){
      var fichaId = ficha && ficha.id;
      if(registro.fotos.length && fichaId){
        registro.fichaIdServidor = fichaId;
        registro.estado = 'fotos_pendientes';
        registro.mensajeError = null;
        return guardarRegistro(registro).then(function(){ return subirFotosPendientes(registro); });
      }
      return eliminarRegistro(registro.id).then(function(){ return 'sincronizado'; });
    }).catch(function(err){
      return manejarErrorEnvio(registro, err);
    });
  }

  // Limpieza y necropsia no llevan Idempotency-Key: un 409 al reintentar
  // significa que ya se habia sincronizado (numero_ficha unico en limpiezas,
  // varamiento_id unico en necropsias).
  function sincronizarSinFotos(registro){
    registro.intentos += 1;
    var crear = registro.tipo === 'necropsia' ? api.crearNecropsia : api.crearLimpieza;
    return crear(registro.payload).then(function(){
      return eliminarRegistro(registro.id).then(function(){ return 'sincronizado'; });
    }).catch(function(err){
      return manejarErrorEnvio(registro, err);
    });
  }

  function procesarRegistro(registro){
    if(!api){ return Promise.resolve('pendiente'); }
    if(registro.estado === 'atencion'){ return Promise.resolve('atencion'); }
    if(registro.estado === 'fotos_pendientes'){ return subirFotosPendientes(registro); }
    return usaIdempotenciaYFotos(registro.tipo) ? sincronizarConFotos(registro) : sincronizarSinFotos(registro);
  }

  function intentarSincronizar(){
    return listarPendientes().then(function(items){
      // Se procesa un registro a la vez (no en paralelo) para no saturar
      // una conexion movil recien recuperada y para mantener el orden de
      // captura en campo.
      return items.reduce(function(promesa, registro){
        return promesa.then(function(){ return procesarRegistro(registro); });
      }, Promise.resolve());
    }).catch(function(){
      /* fallo al leer la cola (p. ej. IndexedDB no disponible): no hay nada
         que sincronizar en este intento. */
    }).then(function(){
      return contarPendientes();
    }).then(function(counts){
      return notificarCambio(counts).then(function(){ return counts; });
    });
  }

  window.TortuTAM = window.TortuTAM || {};
  window.TortuTAM.syncQueue = {
    encolar: encolar,
    listarPendientes: listarPendientes,
    contarPendientes: contarPendientes,
    intentarSincronizar: intentarSincronizar
  };
})();
