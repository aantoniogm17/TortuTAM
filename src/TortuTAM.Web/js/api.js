/*
  Cliente HTTP compartido hacia la API de TortuTAM. Pensado para que las
  vistas "Fichas" (#12), "Limpieza de nido" (#13) y "Mapa de nidos" (#14)
  reutilicen TortuTAM.api en lugar de repetir fetch() en cada una.

  Autenticacion: el login real (ASP.NET Core Identity) todavia no esta
  construido. Mientras tanto se lee el token desde localStorage bajo la
  clave TOKEN_KEY, que es donde el futuro flujo de login debera guardarlo,
  para poder probar endpoints que ya exigen Authorization sin bloquear el
  desarrollo de este formulario.
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
    getPlayas: function(){ return request('/catalogos/playas'); },
    getEspecies: function(){ return request('/catalogos/especies'); },
    getAcciones: function(){ return request('/catalogos/acciones'); },
    getUsoNido: function(){ return request('/catalogos/uso-nido'); },

    crearFicha: function(payload){
      return request('/fichas', { method:'POST', body: payload });
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
      formData.append('foto', file);
      return request('/fichas/' + fichaId + '/fotos', { method:'POST', body: formData });
    }
  };
})();
