/*
  Service worker de TortuTAM (issue #15, estrategia revisada en #67). Solo
  cachea el "app shell" propio del proyecto (HTML, CSS, JS y el icono), con
  estrategia RED PRIMERO / CACHE DE RESPALDO: intenta la red primero y solo
  sirve desde cache si la red falla (sin conexion). Asi:
    - Con conexion (desarrollo o campo con señal), siempre se ve la version
      real mas reciente del shell, sin depender de que alguien recuerde
      subir CACHE_VERSION a mano ni de "Update on reload" de DevTools.
    - Sin conexion, se sigue sirviendo el shell cacheado (requisito offline
      del proyecto intacto).
  Cada respuesta de red exitosa reemplaza la entrada de cache correspondiente,
  asi el respaldo offline tambien se mantiene razonablemente al dia.

  No cachea:
    - Los tiles del mapa satelital de Esri (son de otro origen; el listener
      de fetch de abajo solo intercepta peticiones same-origin, asi que ni
      siquiera pasan por aqui). Sin conexion el mapa simplemente no muestra
      tiles, eso es esperado.
    - Las llamadas a /api/*: son datos vivos, se excluyen a proposito para
      no servir respuestas de la API desde cache.

  El nombre del cache va versionado (CACHE_NAME); al subir una version nueva,
  "activate" borra los caches viejos que empiecen con el mismo prefijo. El
  pipeline de despliegue (ver .github/workflows/) la actualiza sola en cada
  deploy real, a partir del commit, para no depender de que alguien la suba
  a mano.
*/
var CACHE_VERSION = 'v4';
var CACHE_NAME = 'tortutam-shell-' + CACHE_VERSION;

var APP_SHELL = [
  'index.html',
  'manifest.webmanifest',
  'img/icon.svg',
  'css/tokens.css',
  'css/base.css',
  'css/layout.css',
  'css/forms.css',
  'css/listado.css',
  'css/panel.css',
  'css/mapa.css',
  'css/registros-campo.css',
  'css/auth.css',
  'js/api.js',
  'js/auth.js',
  'js/sync-queue.js',
  'js/catalogos.js',
  'js/form-utils.js',
  'js/codigos-campo.js',
  'js/ficha-nueva.js',
  'js/fichas.js',
  'js/limpieza-nueva.js',
  'js/limpiezas.js',
  'js/varamiento-nuevo.js',
  'js/varamientos.js',
  'js/necropsia-nueva.js',
  'js/necropsias.js',
  'js/panel.js',
  'js/reportes.js',
  'vendor/jspdf.umd.min.js',
  'vendor/jspdf.plugin.autotable.min.js',
  'js/mapa-nidos.js',
  'js/nav.js',
  'js/pwa.js'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      // Se cachea archivo por archivo (en vez de cache.addAll, que aborta
      // la instalacion completa si un solo recurso falla) para que un 404
      // o un problema puntual con un asset no deje al service worker sin
      // instalar y a la app sin ningun soporte offline.
      return Promise.all(APP_SHELL.map(function(recurso){
        return cache.add(recurso).catch(function(){
          /* recurso no disponible al instalar: se ignora, el resto del
             app shell sigue cacheandose. */
        });
      }));
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(nombres){
      return Promise.all(
        nombres
          .filter(function(nombre){ return nombre.indexOf('tortutam-shell-') === 0 && nombre !== CACHE_NAME; })
          .map(function(nombre){ return caches.delete(nombre); })
      );
    }).then(function(){
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event){
  var request = event.request;
  if(request.method !== 'GET'){ return; }

  var url = new URL(request.url);
  if(url.origin !== self.location.origin){ return; }
  if(url.pathname.indexOf('/api/') !== -1){ return; }

  event.respondWith(
    fetch(request).then(function(respuestaRed){
      // Respuesta de red exitosa: se usa tal cual. Solo se refresca la
      // copia en cache si la respuesta es valida (2xx) -- un 404/500 no
      // debe quedar cacheado como si fuera el recurso real.
      if(respuestaRed.ok){
        var copia = respuestaRed.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(request, copia); });
      }
      return respuestaRed;
    }).catch(function(){
      // Sin conexion (o la red fallo): respaldo offline desde cache.
      return caches.match(request).then(function(cached){
        if(cached){ return cached; }
        if(request.mode === 'navigate'){
          return caches.match('index.html');
        }
        return Promise.reject(new Error('sin conexion y recurso no cacheado: ' + request.url));
      });
    })
  );
});
