/*
  Cache compartida de catalogos (playas, especies, acciones, uso de nido)
  sobre TortuTAM.api. Existe para que ninguna vista repita el fetch: el
  formulario de "Nueva ficha" (#11) y el listado de "Fichas" (#12) piden los
  mismos catalogos, y de aqui en adelante "Limpieza de nido" (#13) y "Mapa de
  nidos" (#14) tambien los necesitaran.

  Cada getX() devuelve la misma promesa mientras siga pendiente o resuelta;
  si falla, se limpia del cache para permitir reintentar en la siguiente
  llamada (por ejemplo al recuperar conexion).
*/
(function(){
  var api = window.TortuTAM && window.TortuTAM.api;
  var cache = {};

  function memo(clave, fetchFn){
    if(cache[clave]){ return cache[clave]; }
    if(!api){ return Promise.reject(new Error('API no disponible')); }
    var promesa = fetchFn().catch(function(err){
      delete cache[clave];
      throw err;
    });
    cache[clave] = promesa;
    return promesa;
  }

  function getPlayas(){ return memo('playas', function(){ return api.getPlayas(); }); }
  function getEspecies(){ return memo('especies', function(){ return api.getEspecies(); }); }
  function getAcciones(){ return memo('acciones', function(){ return api.getAcciones(); }); }
  function getUsoNido(){ return memo('usoNido', function(){ return api.getUsoNido(); }); }

  var promesaListos = null;

  function ready(){
    if(promesaListos){ return promesaListos; }
    promesaListos = Promise.all([
      getPlayas().catch(function(){ return []; }),
      getEspecies().catch(function(){ return []; }),
      getAcciones().catch(function(){ return []; }),
      getUsoNido().catch(function(){ return []; })
    ]).then(function(resultados){
      return {
        playas: resultados[0] || [],
        especies: resultados[1] || [],
        acciones: resultados[2] || [],
        usoNido: resultados[3] || []
      };
    });
    return promesaListos;
  }

  window.TortuTAM = window.TortuTAM || {};
  window.TortuTAM.catalogos = {
    getPlayas: getPlayas,
    getEspecies: getEspecies,
    getAcciones: getAcciones,
    getUsoNido: getUsoNido,
    ready: ready
  };
})();
