/*
  Cache compartida de catalogos (playas, especies, acciones, uso de nido,
  categorias de conteo) sobre TortuTAM.api. Existe para que ninguna vista
  repita el fetch: el formulario de "Nueva ficha" (#11) y el listado de
  "Fichas" (#12) piden los mismos catalogos, y "Limpieza de nido" (#13)
  agrega categorias de conteo ademas de reutilizar playas/especies/uso de
  nido; "Mapa de nidos" (#14) tambien podra reutilizarlos.

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
  function getCategoriasConteo(){ return memo('categoriasConteo', function(){ return api.getCategoriasConteo(); }); }

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
    getCategoriasConteo: getCategoriasConteo,
    ready: ready
  };
})();
