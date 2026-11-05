/*
  Cliente HTTP compartido hacia la API de TortuTAM. Pensado para que las
  vistas "Fichas" (#12), "Limpieza de nido" (#13), "Mapa de nidos" (#14),
  "Varamientos" y "Necropsia" reutilicen TortuTAM.api en lugar de repetir
  fetch() en cada una.

  El GPS es siempre obligatorio al crear una limpieza (a diferencia de la
  ficha de anidacion, donde solo es obligatorio si hay PIT); esa validacion
  se hace en el cliente antes de llamar a crearLimpieza, no aqui.

  Autenticacion: el token se lee desde localStorage bajo la clave
  TOKEN_KEY. js/auth.js (issue #42) es quien lo guarda ahi tras un login o
  registro exitoso, antes de recargar la pagina.
*/
(function(){
  var TOKEN_KEY = 'tortutam_token';
  var API_BASE = (window.TortuTAM_CONFIG && window.TortuTAM_CONFIG.apiBase) || '/api';

  function getToken(){
    try{
      return localStorage.getItem(TOKEN_KEY);
    }catch(e){
      return null;
    }
  }

  function buildHeaders(extra){
    var headers = {};
    if(extra){
      Object.keys(extra).forEach(function(key){ headers[key] = extra[key]; });
    }
    var token = getToken();
    if(token){
      headers['Authorization'] = 'Bearer ' + token;
    }
    return headers;
  }

  function parseErrorBody(response){
    return response.json().catch(function(){ return null; });
  }

  // Un 401 con token significa que la sesion guardada ya no es valida
  // (vencida, o firmada con otra llave). js/auth.js solo revisa que exista
  // un token, asi que sin esto la app se queda mostrando errores 401 sin
  // volver al login. Se borra la sesion y se recarga una sola vez; los
  // registros pendientes de la cola offline siguen en IndexedDB.
  var sesionCerrada = false;
  function cerrarSesionVencida(){
    if(sesionCerrada) return;
    sesionCerrada = true;
    try{
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('tortutam_nombre_completo');
      localStorage.removeItem('tortutam_roles');
    }catch(e){ /* sin localStorage no habia sesion que borrar */ }
    location.reload();
  }

  function request(path, options){
    options = options || {};
    var isFormData = (typeof FormData !== 'undefined') && (options.body instanceof FormData);
    var headers = buildHeaders(options.headers);
    var body = options.body;

    if(!isFormData && body !== undefined && typeof body !== 'string'){
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }

    return fetch(API_BASE + path, {
      method: options.method || 'GET',
      headers: headers,
      body: body
    }).then(function(response){
      if(response.status === 401 && headers['Authorization'] && path.indexOf('/auth/') !== 0){
        cerrarSesionVencida();
      }
      if(!response.ok){
        return parseErrorBody(response).then(function(data){
          var mensaje = (data && (data.mensaje || data.title)) || ('El servidor respondio con un error (' + response.status + ').');
          var error = new Error(mensaje);
          error.status = response.status;
          error.data = data;
          throw error;
        });
      }
      if(response.status === 204){ return null; }
      return response.json().catch(function(){ return null; });
    });
  }

  function buildQueryString(params){
    var esc = encodeURIComponent;
    var partes = [];
    Object.keys(params || {}).forEach(function(key){
      var valor = params[key];
      if(valor === undefined || valor === null || valor === ''){ return; }
      partes.push(esc(key) + '=' + esc(valor));
    });
    return partes.length ? ('?' + partes.join('&')) : '';
  }

  window.TortuTAM = window.TortuTAM || {};
  window.TortuTAM.api = {
    // Unicos endpoints publicos: no requieren Authorization. buildHeaders
    // igual agrega el header si ya hay un token viejo en localStorage, pero
    // el servidor no lo exige aqui, asi que no rompe nada.
    login: function(email, password){
      return request('/auth/login', { method:'POST', body:{ email: email, password: password } });
    },

    registrar: function(payload){
      return request('/auth/registro', { method:'POST', body: payload });
    },

    getPlayas: function(){ return request('/catalogos/playas'); },
    getEspecies: function(){ return request('/catalogos/especies'); },
    getAcciones: function(){ return request('/catalogos/acciones'); },
    getUsoNido: function(){ return request('/catalogos/uso-nido'); },
    getCategoriasConteo: function(){ return request('/catalogos/categorias-conteo'); },

    // headers es opcional; js/sync-queue.js (#15) lo usa para reenviar
    // Idempotency-Key al reintentar una ficha encolada sin conexion.
    crearFicha: function(payload, headers){
      return request('/fichas', { method:'POST', body: payload, headers: headers });
    },

    listarFichas: function(filtros){
      return request('/fichas' + buildQueryString(filtros));
    },

    obtenerFicha: function(id){
      return request('/fichas/' + id);
    },

    actualizarFicha: function(id, payload){
      return request('/fichas/' + id, { method:'PUT', body: payload });
    },

    subirFoto: function(fichaId, file){
      var formData = new FormData();
      formData.append('archivos', file);
      return request('/fichas/' + fichaId + '/fotos', { method:'POST', body: formData });
    },

    crearLimpieza: function(payload){
      return request('/limpiezas', { method:'POST', body: payload });
    },

    listarLimpiezas: function(filtros){
      return request('/limpiezas' + buildQueryString(filtros));
    },

    obtenerLimpieza: function(id){
      return request('/limpiezas/' + id);
    },

    // headers es opcional, igual que en crearFicha: la cola offline reenvia
    // el mismo Idempotency-Key en cada reintento.
    crearVaramiento: function(payload, headers){
      return request('/varamientos', { method:'POST', body: payload, headers: headers });
    },

    listarVaramientos: function(filtros){
      return request('/varamientos' + buildQueryString(filtros));
    },

    obtenerVaramiento: function(id){
      return request('/varamientos/' + id);
    },

    // Acepta un File o un arreglo de File; cada foto se manda en su propio
    // POST multipart (campo "archivos", el nombre del parámetro en la API), igual que las fotos de fichas.
    subirFotosVaramiento: function(varamientoId, fotos){
      function subirUna(file){
        var formData = new FormData();
        formData.append('archivos', file);
        return request('/varamientos/' + varamientoId + '/fotos', { method:'POST', body: formData });
      }
      if(Array.isArray(fotos)){ return Promise.all(fotos.map(subirUna)); }
      return subirUna(fotos);
    },

    // Descarga el archivo de una foto con el token de sesion y lo devuelve
    // como Blob, para mostrarlo con URL.createObjectURL (un <img src> directo
    // no manda el header Authorization).
    obtenerArchivoFotoVaramiento: function(varamientoId, fotoId){
      return fetch(API_BASE + '/varamientos/' + varamientoId + '/fotos/' + fotoId + '/archivo', {
        headers: buildHeaders()
      }).then(function(response){
        if(!response.ok){
          var error = new Error('No se pudo descargar la foto (' + response.status + ').');
          error.status = response.status;
          throw error;
        }
        return response.blob();
      });
    },

    crearNecropsia: function(payload){
      return request('/necropsias', { method:'POST', body: payload });
    },

    listarNecropsias: function(filtros){
      return request('/necropsias' + buildQueryString(filtros));
    },

    obtenerNecropsia: function(id){
      return request('/necropsias/' + id);
    },

    obtenerEstadisticasPanel: function(limite){
      return request('/panel/estadisticas' + buildQueryString({ limite: limite }));
    },

    obtenerReporteCorte: function(fecha, playaId){
      return request('/reportes/corte' + buildQueryString({ fecha: fecha, playaId: playaId }));
    },

    obtenerNidosMapa: function(){
      return request('/nidos/mapa');
    }
  };
})();
