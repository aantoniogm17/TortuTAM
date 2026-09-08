/*
  Subvistas "Nueva limpieza" / "Ver registros" de la vista Limpieza de nido
  (issue #13). Este archivo controla la alternancia entre ambas subvistas
  (estilo tabs), el listado de limpiezas registradas con filtros y
  paginacion, y el panel de detalle de solo lectura. Depende de js/api.js y
  js/catalogos.js, que deben cargarse antes.

  A diferencia del listado de fichas, aqui no hay modo de edicion: el
  contrato de la API solo define GET/POST para limpiezas, sin PUT.
*/
(function(){
  var tbody = document.getElementById('lq_tableBody');
  if(!tbody) return;

  var api = window.TortuTAM && window.TortuTAM.api;
  var catalogos = window.TortuTAM && window.TortuTAM.catalogos;

  var TAMANO_PAGINA = 20;
  var paginaActual = 1;
  var totalRegistros = 0;

  var catalogosCache = { playas: [], especies: [], usoNido: [] };
  var categoriasConteoCache = [];

  var ICONO_VER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>';

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

  function val(id){
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function formatFecha(iso){
    if(!iso){ return '—'; }
    var texto = String(iso);
    var fecha = new Date(texto.length <= 10 ? texto + 'T00:00:00' : texto);
    if(isNaN(fecha.getTime())){ return texto; }
    return fecha.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  function formatFechaHora(iso){
    if(!iso){ return '—'; }
    var fecha = new Date(iso);
    if(isNaN(fecha.getTime())){ return String(iso); }
    return fecha.toLocaleString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function formatPorcentaje(valor){
    if(valor === null || valor === undefined || valor === ''){ return '—'; }
    var n = Number(valor);
    if(isNaN(n)){ return '—'; }
    return (Math.round(n * 10) / 10) + '%';
  }

  function formatNumero(valor){
    return (valor === null || valor === undefined || valor === '') ? '—' : valor;
  }

  function debounce(fn, esperaMs){
    var temporizador = null;
    return function(){
      var args = arguments;
      window.clearTimeout(temporizador);
      temporizador = window.setTimeout(function(){ fn.apply(null, args); }, esperaMs);
    };
  }

  /* ---------------- Catalogos (para mostrar nombres en el detalle) ---------------- */

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

  function nombreUsoNido(codigo){
    var u = buscarEnCatalogo(catalogosCache.usoNido, codigo, 'codigo');
    if(u){ return u.descripcion; }
    return (codigo !== null && codigo !== undefined && codigo !== '') ? String(codigo) : '—';
  }

  function nombreCategoria(codigo){
    var c = buscarEnCatalogo(categoriasConteoCache, codigo, 'codigo');
    return c ? c.descripcion : codigo;
  }

  function textoSiNo(valor){
    if(valor === 'S'){ return 'Si'; }
    if(valor === 'N'){ return 'No'; }
    return '—';
  }

  function iniciarCatalogos(){
    if(!catalogos){ return Promise.resolve(); }
    return Promise.all([
      catalogos.ready(),
      catalogos.getCategoriasConteo().catch(function(){ return []; })
    ]).then(function(resultados){
      catalogosCache = resultados[0] || catalogosCache;
      categoriasConteoCache = resultados[1] || [];
    }).catch(function(){
      catalogosCache = { playas: [], especies: [], acciones: [], usoNido: [] };
      categoriasConteoCache = [];
    });
  }

  /* ---------------- Tabla ---------------- */

  var tablaScroll = document.getElementById('lq_tableScroll');
  var emptyState = document.getElementById('lq_emptyState');
  var estadoTabla = document.getElementById('lq_status');
  var prevBtn = document.getElementById('lq_prevBtn');
  var nextBtn = document.getElementById('lq_nextBtn');
  var pageInfo = document.getElementById('lq_pageInfo');

  function mostrarEstadoTabla(mensaje, tipo){
    if(!estadoTabla) return;
    estadoTabla.className = 'status-banner is-visible is-' + tipo;
    estadoTabla.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
    var spinner = tipo === 'loading' ? '<svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="9" opacity="0.25"/><path d="M21 12a9 9 0 0 0-9-9"/></svg>' : '';
    estadoTabla.innerHTML = spinner + '<span>' + escapeHtml(mensaje) + '</span>';
  }

  function ocultarEstadoTabla(){
    if(!estadoTabla) return;
    estadoTabla.className = 'status-banner';
    estadoTabla.innerHTML = '';
  }

  function actualizarPaginacion(){
    var totalPaginas = totalRegistros > 0 ? Math.ceil(totalRegistros / TAMANO_PAGINA) : 1;
    if(pageInfo){
      pageInfo.textContent = 'Pagina ' + paginaActual + ' de ' + totalPaginas + ' (' + totalRegistros + ' registro' + (totalRegistros === 1 ? '' : 's') + ')';
    }
    if(prevBtn){ prevBtn.disabled = paginaActual <= 1; }
    if(nextBtn){ nextBtn.disabled = paginaActual >= totalPaginas; }
  }

  function construirFila(l){
    var tr = document.createElement('tr');

    function addTd(texto){
      var td = document.createElement('td');
      td.textContent = (texto === null || texto === undefined || texto === '') ? '—' : texto;
      tr.appendChild(td);
      return td;
    }

    addTd(l.numeroFicha);
    addTd(formatFecha(l.fechaLimpieza));
    addTd(l.corral);
    addTd(l.nido);
    addTd(formatNumero(l.criasVivasTotales));
    addTd(formatNumero(l.huevosTotales));
    addTd(formatPorcentaje(l.porcentajeEclosion));

    var tdAcciones = document.createElement('td');
    var contenedorAcciones = document.createElement('div');
    contenedorAcciones.className = 'row-actions';

    var verBtn = document.createElement('button');
    verBtn.type = 'button';
    verBtn.className = 'icon-btn';
    verBtn.title = 'Ver detalle';
    verBtn.setAttribute('aria-label', 'Ver detalle de la limpieza de la ficha ' + (l.numeroFicha || ''));
    verBtn.innerHTML = ICONO_VER;
    verBtn.addEventListener('click', function(){ abrirDrawer(l.id, verBtn); });
    contenedorAcciones.appendChild(verBtn);

    tdAcciones.appendChild(contenedorAcciones);
    tr.appendChild(tdAcciones);

    return tr;
  }

  function renderTabla(resp){
    var elementos = (resp && resp.elementos) || [];
    totalRegistros = (resp && typeof resp.total === 'number') ? resp.total : elementos.length;

    tbody.innerHTML = '';

    if(!elementos.length){
      if(tablaScroll){ tablaScroll.hidden = true; }
      if(emptyState){ emptyState.hidden = false; }
    }else{
      if(tablaScroll){ tablaScroll.hidden = false; }
      if(emptyState){ emptyState.hidden = true; }
      elementos.forEach(function(l){ tbody.appendChild(construirFila(l)); });
    }

    actualizarPaginacion();
  }

  function cargarLimpiezas(){
    if(!api){
      mostrarEstadoTabla('No se pudo conectar con la API.', 'error');
      if(tablaScroll){ tablaScroll.hidden = true; }
      if(emptyState){ emptyState.hidden = true; }
      return;
    }

    mostrarEstadoTabla('Cargando registros...', 'loading');

    var filtros = {
      numeroFicha: val('lq_numero') || undefined,
      corral: val('lq_corral') || undefined,
      nido: val('lq_nido') || undefined,
      page: paginaActual,
      pageSize: TAMANO_PAGINA
    };

    api.listarLimpiezas(filtros).then(function(resp){
      ocultarEstadoTabla();
      renderTabla(resp);
    }).catch(function(err){
      tbody.innerHTML = '';
      if(tablaScroll){ tablaScroll.hidden = true; }
      if(emptyState){ emptyState.hidden = true; }
      totalRegistros = 0;
      actualizarPaginacion();
      mostrarEstadoTabla('No se pudieron cargar los registros: ' + mensajeError(err), 'error');
    });
  }

  function aplicarFiltros(){
    paginaActual = 1;
    cargarLimpiezas();
  }

  var aplicarFiltrosDebounced = debounce(aplicarFiltros, 350);

  ['lq_numero', 'lq_corral', 'lq_nido'].forEach(function(id){
    var el = document.getElementById(id);
    if(el){ el.addEventListener('input', aplicarFiltrosDebounced); }
  });

  var limpiarFiltrosBtn = document.getElementById('lq_limpiar');
  if(limpiarFiltrosBtn){
    limpiarFiltrosBtn.addEventListener('click', function(){
      ['lq_numero', 'lq_corral', 'lq_nido'].forEach(function(id){
        var el = document.getElementById(id);
        if(el){ el.value = ''; }
      });
      aplicarFiltros();
    });
  }

  if(prevBtn){
    prevBtn.addEventListener('click', function(){
      if(paginaActual <= 1) return;
      paginaActual -= 1;
      cargarLimpiezas();
    });
  }
  if(nextBtn){
    nextBtn.addEventListener('click', function(){
      var totalPaginas = totalRegistros > 0 ? Math.ceil(totalRegistros / TAMANO_PAGINA) : 1;
      if(paginaActual >= totalPaginas) return;
      paginaActual += 1;
      cargarLimpiezas();
    });
  }

  /* ---------------- Panel de detalle (solo lectura) ---------------- */

  var overlay = document.getElementById('limpiezaDrawerOverlay');
  var drawer = document.getElementById('limpiezaDrawer');
  var drawerTitle = document.getElementById('limpiezaDrawerTitle');
  var drawerBody = document.getElementById('limpiezaDrawerBody');
  var drawerCloseBtn = document.getElementById('limpiezaDrawerClose');

  var elementoDisparador = null;

  function kv(etiqueta, valor){
    var texto = (valor === null || valor === undefined || valor === '') ? '—' : valor;
    return '<div class="kv"><div class="k">' + escapeHtml(etiqueta) + '</div><div class="v">' + escapeHtml(texto) + '</div></div>';
  }

  function construirTablaConteo(conteos){
    conteos = conteos || [];
    if(!conteos.length){
      return '<p class="hint">Sin conteo registrado.</p>';
    }
    var filas = conteos.map(function(c){
      return '<tr>'
        + '<td>' + escapeHtml(nombreCategoria(c.categoriaCodigo)) + '</td>'
        + '<td>' + escapeHtml(formatNumero(c.normales)) + '</td>'
        + '<td>' + escapeHtml(formatNumero(c.albina)) + '</td>'
        + '<td>' + escapeHtml(formatNumero(c.deforme)) + '</td>'
        + '<td>' + escapeHtml(formatNumero(c.albinasDeformes)) + '</td>'
        + '<td>' + escapeHtml(formatNumero(c.total)) + '</td>'
        + '</tr>';
    }).join('');
    return '<div class="table-scroll"><table class="conteo-table">'
      + '<thead><tr><th scope="col">Categoria</th><th scope="col">Normales</th><th scope="col">Albina</th><th scope="col">Deforme</th><th scope="col">Albinas y deformes</th><th scope="col">Total</th></tr></thead>'
      + '<tbody>' + filas + '</tbody></table></div>';
  }

  function construirEstadoCarga(){
    return '<div class="status-banner is-visible is-loading"><svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="9" opacity="0.25"/><path d="M21 12a9 9 0 0 0-9-9"/></svg><span>Cargando registro...</span></div>';
  }

  function construirEstadoError(mensaje){
    return '<div class="status-banner is-visible is-error" role="alert"><span>' + escapeHtml(mensaje) + '</span></div>';
  }

  function construirDetalle(detalle){
    var html = '';
    html += '<p class="hint">' + escapeHtml(formatFecha(detalle.fechaLimpieza)) + ' · ' + escapeHtml(nombrePlaya(detalle.playaId)) + '</p>';

    html += '<div class="detail-block"><h4>Datos generales</h4><div class="kv-grid">'
      + kv('No. de ficha', detalle.numeroFicha)
      + kv('Corral', detalle.corral)
      + kv('Nido', detalle.nido)
      + kv('Especie', nombreEspecie(detalle.especieCodigo))
      + kv('Uso de nido', nombreUsoNido(detalle.usoNidoCodigo))
      + kv('Formulo', detalle.formulo)
      + kv('Fecha 1a. emergencia', formatFecha(detalle.fechaPrimeraEmergencia))
      + kv('Fecha de limpieza', formatFecha(detalle.fechaLimpieza))
      + '</div></div>';

    html += '<div class="detail-block"><h4>Ubicacion</h4><div class="kv-grid">'
      + kv('Latitud', detalle.latitud)
      + kv('Longitud', detalle.longitud)
      + '</div></div>';

    html += '<div class="detail-block"><h4>Conteo de crias y huevos</h4>' + construirTablaConteo(detalle.conteos) + '</div>';

    html += '<div class="detail-block"><h4>Condiciones del nido</h4><div class="kv-grid">'
      + kv('Hormigas', textoSiNo(detalle.hormigas))
      + kv('Raices', textoSiNo(detalle.raices))
      + kv('Larvas', textoSiNo(detalle.larvas))
      + kv('Piedras', textoSiNo(detalle.piedras))
      + kv('Huellas', textoSiNo(detalle.huellas))
      + kv('Otros', textoSiNo(detalle.otros))
      + '</div></div>';

    html += '<div class="detail-block"><h4>Detalle / observaciones</h4><p class="detail-text">' + escapeHtml(detalle.otrosDetalle || 'Sin observaciones.') + '</p></div>';

    html += '<p class="hint detail-meta">Creado: ' + escapeHtml(formatFechaHora(detalle.creadoEn)) + '</p>';

    return html;
  }

  function mostrarDetalle(detalle){
    drawerTitle.textContent = 'Limpieza de la ficha ' + (detalle.numeroFicha || '');
    drawerBody.innerHTML = construirDetalle(detalle);
    enfocarDrawer();
  }

  function obtenerFocosables(){
    var selector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return Array.prototype.slice.call(drawer.querySelectorAll(selector)).filter(function(el){
      return el.offsetParent !== null;
    });
  }

  function enfocarDrawer(){
    window.setTimeout(function(){
      var focosables = obtenerFocosables();
      if(focosables.length){ focosables[0].focus(); }
      else { drawer.focus(); }
    }, 0);
  }

  function manejarTeclado(evt){
    if(overlay.hidden) return;
    if(evt.key === 'Escape'){
      evt.preventDefault();
      cerrarDrawer();
      return;
    }
    if(evt.key === 'Tab'){
      var focosables = obtenerFocosables();
      if(!focosables.length) return;
      var primero = focosables[0];
      var ultimo = focosables[focosables.length - 1];
      if(evt.shiftKey){
        if(document.activeElement === primero || !drawer.contains(document.activeElement)){
          evt.preventDefault();
          ultimo.focus();
        }
      }else{
        if(document.activeElement === ultimo || !drawer.contains(document.activeElement)){
          evt.preventDefault();
          primero.focus();
        }
      }
    }
  }

  function abrirDrawer(id, origen){
    elementoDisparador = origen || document.activeElement;
    overlay.hidden = false;
    document.body.classList.add('drawer-open');
    drawerTitle.textContent = 'Cargando registro...';
    drawerBody.innerHTML = construirEstadoCarga();
    document.addEventListener('keydown', manejarTeclado, true);
    enfocarDrawer();

    if(!api){
      drawerBody.innerHTML = construirEstadoError('No se pudo conectar con la API.');
      return;
    }

    api.obtenerLimpieza(id).then(function(detalle){
      mostrarDetalle(detalle);
    }).catch(function(err){
      drawerTitle.textContent = 'Limpieza';
      drawerBody.innerHTML = construirEstadoError('No se pudo cargar el registro: ' + mensajeError(err));
    });
  }

  function cerrarDrawer(){
    if(overlay.hidden) return;
    document.removeEventListener('keydown', manejarTeclado, true);
    overlay.hidden = true;
    document.body.classList.remove('drawer-open');
    drawerBody.innerHTML = '';
    if(elementoDisparador && typeof elementoDisparador.focus === 'function'){
      elementoDisparador.focus();
    }
    elementoDisparador = null;
  }

  if(drawerCloseBtn){ drawerCloseBtn.addEventListener('click', cerrarDrawer); }
  if(overlay){
    overlay.addEventListener('click', function(evt){
      if(evt.target === overlay){ cerrarDrawer(); }
    });
  }

  /* ---------------- Subvistas por pestañas ---------------- */

  var tabButtons = {
    nueva: document.getElementById('tabLimpiezaNueva'),
    lista: document.getElementById('tabLimpiezaLista')
  };
  var subviews = {
    nueva: document.getElementById('sub-limpieza-nueva'),
    lista: document.getElementById('sub-limpieza-lista')
  };

  var listaInicializada = false;

  function activarSub(nombre){
    Object.keys(subviews).forEach(function(clave){
      var activo = clave === nombre;
      if(subviews[clave]){ subviews[clave].hidden = !activo; }
      var boton = tabButtons[clave];
      if(boton){
        boton.classList.toggle('ghost', !activo);
        boton.setAttribute('aria-selected', activo ? 'true' : 'false');
        boton.setAttribute('tabindex', activo ? '0' : '-1');
      }
    });

    if(nombre === 'lista' && !listaInicializada){
      listaInicializada = true;
      iniciarCatalogos().then(function(){ cargarLimpiezas(); });
    }
  }

  Object.keys(tabButtons).forEach(function(clave){
    var boton = tabButtons[clave];
    if(boton){
      boton.addEventListener('click', function(){ activarSub(clave); });
    }
  });

  window.TortuTAM = window.TortuTAM || {};
  window.TortuTAM.limpiezas = {
    refrescar: function(){
      if(listaInicializada){ cargarLimpiezas(); }
    }
  };
})();
