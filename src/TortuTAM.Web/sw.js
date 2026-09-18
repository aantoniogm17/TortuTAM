/*
  Service worker de TortuTAM (issue #15). Solo cachea el "app shell" propio
  del proyecto (HTML, CSS, JS y el icono) con estrategia cache-first, para
  que la app abra sin conexion en campo. No cachea:
    - Los tiles del mapa satelital de Esri (son de otro origen; el listener
      de fetch de abajo solo intercepta peticiones same-origin, asi que ni
      siquiera pasan por aqui). Sin conexion el mapa simplemente no muestra
      tiles, eso es esperado.
    - Las llamadas a /api/*: son datos vivos, se excluyen a proposito para
      no servir respuestas de la API desde cache.

  El nombre del cache va versionado (CACHE_NAME); al subir una version nueva,
  "activate" borra los caches viejos que empiecen con el mismo prefijo.
*/
var CACHE_VERSION = 'v1';
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
  'js/api.js',
  'js/sync-queue.js',
  'js/catalogos.js',
  'js/ficha-nueva.js',
  'js/fichas.js',
  'js/limpieza-nueva.js',
  'js/limpiezas.js',
  'js/panel.js',
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
    caches.match(request).then(function(cached){
      if(cached){ return cached; }
      return fetch(request).catch(function(){
        if(request.mode === 'navigate'){
          return caches.match('index.html');
        }
        return Promise.reject(new Error('sin conexion y recurso no cacheado: ' + request.url));
      });
    })
  );
});
