/*
  Panel / dashboard (vista #view-panel, issue #10). Consume
  GET /api/panel/estadisticas via js/api.js y resuelve los catalogos con
  js/catalogos.js, ambos deben cargarse antes que este archivo.
*/
(function(){
  var statGrid = document.getElementById('panelStatGrid');
  if(!statGrid) return;

  var api = window.TortuTAM && window.TortuTAM.api;
  var catalogos = window.TortuTAM && window.TortuTAM.catalogos;

  var LIMITE_RECIENTES = 10;
  var catalogosCache = { playas: [], especies: [], acciones: [], usoNido: [] };

  var elStatus = document.getElementById('panelStatus');
  var elBars = document.getElementById('panelBarsByPlaya');
  var elRecent = document.getElementById('panelRecentList');

  var statEls = {
    fichas: document.getElementById('statFichas'),
    huevos: document.getElementById('statHuevos'),
    nidos: document.getElementById('statNidos'),
    promedio: document.getElementById('statPromedio'),
    limpiezas: document.getElementById('statLimpiezas'),
    crias: document.getElementById('statCrias'),
    exito: document.getElementById('statExito')
  };

  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, function(ch){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch];
    });
  }

  function mensajeError(err){
    if(err && err.status){
      return err.message || ('el servidor respondio con un error (' + err.status + ').');
    }
    return 'sin conexion o el servidor no respondio.';
  }

  function mostrarEstado(mensaje, tipo){
    if(!elStatus) return;
    elStatus.className = 'status-banner is-visible is-' + tipo;
    elStatus.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
    var spinner = tipo === 'loading' ? '<svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="9" opacity="0.25"/><path d="M21 12a9 9 0 0 0-9-9"/></svg>' : '';
    elStatus.innerHTML = spinner + '<span>' + escapeHtml(mensaje) + '</span>';
  }

  function ocultarEstado(){
    if(!elStatus) return;
    elStatus.className = 'status-banner';
    elStatus.innerHTML = '';
  }

  function formatEntero(valor){
    if(valor === null || valor === undefined || valor === ''){ return '—'; }
    var n = Number(valor);
    if(isNaN(n)){ return '—'; }
    return n.toLocaleString('es-MX');
  }

  function formatDecimal(valor, decimales){
    if(valor === null || valor === undefined || valor === ''){ return '—'; }
    var n = Number(valor);
    if(isNaN(n)){ return '—'; }
    return n.toLocaleString('es-MX', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
  }

  function formatPorcentaje(valor){
    if(valor === null || valor === undefined || valor === ''){ return '—'; }
    var n = Number(valor);
    if(isNaN(n)){ return '—'; }
    return n.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
  }

  function formatFecha(iso){
    if(!iso){ return '—'; }
    var texto = String(iso);
    var fecha = new Date(texto.length <= 10 ? texto + 'T00:00:00' : texto);
    if(isNaN(fecha.getTime())){ return texto; }
    return fecha.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  function marcarCargando(){
    Object.keys(statEls).forEach(function(key){
      if(statEls[key]){ statEls[key].textContent = '…'; }
    });
  }

  function marcarSinDatos(){
    Object.keys(statEls).forEach(function(key){
      if(statEls[key]){ statEls[key].textContent = '—'; }
    });
  }

  function renderStats(datos){
    if(statEls.fichas){ statEls.fichas.textContent = formatEntero(datos.fichasRegistradas); }
    if(statEls.huevos){ statEls.huevos.textContent = formatEntero(datos.huevosColectados); }
    if(statEls.nidos){ statEls.nidos.textContent = formatEntero(datos.nidosEnCorral); }
    if(statEls.promedio){ statEls.promedio.textContent = formatDecimal(datos.promedioHuevosPorNido, 1); }
    if(statEls.limpiezas){ statEls.limpiezas.textContent = formatEntero(datos.nidosConLimpieza); }
    if(statEls.crias){ statEls.crias.textContent = formatEntero(datos.criasVivas); }
    if(statEls.exito){ statEls.exito.textContent = formatPorcentaje(datos.porcentajeExitoEclosionPromedio); }
  }

  function renderBarras(lista){
    lista = lista || [];
    if(!elBars) return;
    if(!lista.length){
      elBars.innerHTML = '<p class="hint">Aun no hay huevos colectados registrados.</p>';
      return;
    }

    var maxVal = lista.reduce(function(max, item){
      return Math.max(max, Number(item.huevosColectados) || 0);
    }, 0) || 1;

    var html = '';
    lista.forEach(function(item){
      var valor = Number(item.huevosColectados) || 0;
      var ancho = Math.round((valor / maxVal) * 100);
      var etiqueta = item.playaCodigo || item.playaNombre || 'Sin playa';
      html += '<div class="bar-row">'
        + '<div class="bar-label" title="' + escapeHtml(item.playaNombre || etiqueta) + '">' + escapeHtml(etiqueta) + '</div>'
        + '<div class="bar-track"><div class="bar-fill" style="width:' + ancho + '%"></div></div>'
        + '<div class="bar-val">' + formatEntero(valor) + '</div>'
        + '</div>';
    });
    elBars.innerHTML = html;
  }

  /* ---------------- Resolucion de catalogos ---------------- */

  function buscarEnCatalogo(lista, valor, campo){
    if(valor === null || valor === undefined || valor === ''){ return null; }
    var encontrado = null;
    (lista || []).some(function(item){
      if(String(item[campo]) === String(valor)){ encontrado = item; return true; }
      return false;
    });
    return encontrado;
  }

  function nombrePlaya(id){
    var p = buscarEnCatalogo(catalogosCache.playas, id, 'id');
    if(p){ return p.codigo + ' - ' + p.nombre; }
    return (id !== null && id !== undefined && id !== '') ? String(id) : '—';
  }

  function nombreEspecie(codigo){
    var e = buscarEnCatalogo(catalogosCache.especies, codigo, 'codigo');
    if(e){ return e.nombreComun; }
    return codigo || '—';
  }

  function nombreAccion(codigo){
    var a = buscarEnCatalogo(catalogosCache.acciones, codigo, 'codigo');
    if(a){ return a.descripcion; }
    return (codigo !== null && codigo !== undefined && codigo !== '') ? String(codigo) : '—';
  }

  function renderRecientes(lista){
    lista = lista || [];
    if(!elRecent) return;
    if(!lista.length){
      elRecent.innerHTML = '<p class="hint">Sin fichas registradas todavia.</p>';
      return;
    }

    var html = '';
    lista.forEach(function(f){
      var meta = [formatFecha(f.fecha)];
      if(f.especieCodigo){ meta.push(nombreEspecie(f.especieCodigo)); }
      if(f.accionCodigo){ meta.push(nombreAccion(f.accionCodigo)); }
      html += '<div class="recent-item">'
        + '<span>No. ' + escapeHtml(f.numeroFicha || '—') + ' · ' + escapeHtml(nombrePlaya(f.playaId)) + '</span>'
        + '<span class="meta">' + escapeHtml(meta.join(' · ')) + '</span>'
        + '</div>';
    });
    elRecent.innerHTML = html;
  }

  /* ---------------- Carga ---------------- */

  function cargarCatalogos(){
    if(!catalogos){ return Promise.resolve(); }
    return catalogos.ready().then(function(datos){
      catalogosCache = datos;
    }).catch(function(){
      catalogosCache = { playas: [], especies: [], acciones: [], usoNido: [] };
    });
  }

  function mostrarError(err){
    marcarSinDatos();
    if(elBars){ elBars.innerHTML = '<p class="hint">No se pudieron cargar los datos.</p>'; }
    if(elRecent){ elRecent.innerHTML = '<p class="hint">No se pudieron cargar los datos.</p>'; }
    mostrarEstado('No se pudieron cargar las estadisticas: ' + mensajeError(err), 'error');
  }

  function cargarPanel(){
    if(!api){
      mostrarError({});
      return;
    }

    marcarCargando();
    mostrarEstado('Cargando panel...', 'loading');

    cargarCatalogos().then(function(){
      return api.obtenerEstadisticasPanel(LIMITE_RECIENTES);
    }).then(function(datos){
      datos = datos || {};
      ocultarEstado();
      renderStats(datos);
      renderBarras(datos.huevosPorPlaya);
      renderRecientes(datos.ultimasFichas);
    }).catch(mostrarError);
  }

  cargarPanel();
})();
