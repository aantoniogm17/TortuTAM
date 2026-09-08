/*
  Registro del service worker (sw.js) e indicador de sincronizacion del
  shell (issue #15). No implementa la logica de la cola: eso vive en
  js/sync-queue.js. Este archivo solo:

    1. Registra sw.js para que la app instale como PWA y el app shell
       quede disponible sin conexion.
    2. Mantiene el indicador #syncIndicator (sidebar/topbar) al dia con el
       estado de conexion y el numero de registros pendientes/atencion de
       la cola, escuchando el evento 'tortutam:cola-cambio' que dispara
       js/sync-queue.js despues de encolar o de intentar sincronizar.
    3. Dispara la sincronizacion automatica: al recuperar conexion (evento
       'online' del navegador) y al cargar la app si ya hay pendientes.
*/
(function(){
  var indicador = document.getElementById('syncIndicator');
  var texto = document.getElementById('syncText');

  function actualizarIndicador(counts){
    if(!indicador || !texto){ return; }
    var conectado = navigator.onLine;
    var pendientes = (counts && counts.pendientes) || 0;
    var atencion = (counts && counts.atencion) || 0;

    indicador.classList.toggle('is-offline', !conectado);
    indicador.classList.toggle('is-pendiente', conectado && pendientes > 0);
    indicador.classList.toggle('is-atencion', atencion > 0);

    var partes = [conectado ? 'En línea' : 'Sin conexión'];
    if(pendientes > 0){
      partes.push(pendientes + ' pendiente' + (pendientes === 1 ? '' : 's') + ' de sincronizar');
    }
    if(atencion > 0){
      partes.push(atencion + ' ' + (atencion === 1 ? 'requiere' : 'requieren') + ' atención');
    }
    if(pendientes === 0 && atencion === 0){
      partes.push('Todo sincronizado');
    }
    texto.textContent = partes.join(' · ');
  }

  function syncQueue(){
    return window.TortuTAM && window.TortuTAM.syncQueue;
  }

  function refrescarConteo(){
    var cola = syncQueue();
    if(!cola){ return; }
    cola.contarPendientes().then(actualizarIndicador);
  }

  function intentarSincronizarSiHayConexion(){
    var cola = syncQueue();
    if(!cola || !navigator.onLine){ return; }
    cola.intentarSincronizar().then(actualizarIndicador);
  }

  window.addEventListener('tortutam:cola-cambio', function(evt){
    actualizarIndicador(evt.detail);
  });

  window.addEventListener('online', function(){
    actualizarIndicador({});
    intentarSincronizarSiHayConexion();
  });

  window.addEventListener('offline', function(){
    refrescarConteo();
  });

  actualizarIndicador({});
  refrescarConteo();
  intentarSincronizarSiHayConexion();

  /* ---------------- Service worker ---------------- */

  if('serviceWorker' in navigator){
    window.addEventListener('load', function(){
      navigator.serviceWorker.register('sw.js').catch(function(){
        /* El registro puede fallar en desarrollo (p. ej. servido sin
           HTTPS/localhost) o si el navegador no lo soporta; la app sigue
           funcionando normalmente con conexion, solo sin el cacheo del
           app shell para uso sin conexion. */
      });
    });
  }
})();
