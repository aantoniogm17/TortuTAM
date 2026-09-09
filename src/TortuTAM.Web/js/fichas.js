/*
  Listado de fichas registradas (vista #view-fichas, issue #12).
  Depende de js/api.js, js/catalogos.js y js/ficha-nueva.js (para el modo
  de edicion reutilizado dentro del drawer de detalle), que deben cargarse
  antes.
*/
(function(){
  var tbody = document.getElementById('fichasTableBody');
  if(!tbody) return;

  var api = window.TortuTAM && window.TortuTAM.api;
  var catalogos = window.TortuTAM && window.TortuTAM.catalogos;
  var fichaFormApi = window.TortuTAM && window.TortuTAM.fichaForm;

  var TAMANO_PAGINA = 20;
  var paginaActual = 1;
  var totalRegistros = 0;

  var catalogosCache = { playas: [], especies: [], acciones: [], usoNido: [] };

  var SEXOS = { H: 'Hembra', M: 'Macho', ND: 'No determinado' };
  var NUEVA_RECAP = { N: 'Nueva', R: 'Recaptura' };
  var POSICIONES = {
    '1': '1 - Menos de 1 cm',
    '2': '2 - De 1 a 4 cm',
    '3': '3 - De 4 a 10 cm',
    '4': '4 - Mas de 10 cm'
  };

  var ICONO_VER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>';
  var ICONO_EDITAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';

  function val(id){
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

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

  function debounce(fn, esperaMs){
    var temporizador = null;
    return function(){
      var args = arguments;
      window.clearTimeout(temporizador);
      temporizador = window.setTimeout(function(){ fn.apply(null, args); }, esperaMs);
    };
  }

  /* ---------------- Catalogos ---------------- */

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

  function nombreUsoNido(codigo){
    var u = buscarEnCatalogo(catalogosCache.usoNido, codigo, 'codigo');
    if(u){ return u.descripcion; }
    return (codigo !== null && codigo !== undefined && codigo !== '') ? String(codigo) : '—';
  }

  function llenarSelectFiltro(select, items, mapFn, textoVacio){
    if(!select) return;
    var actual = select.value;
    var opciones = '<option value="">' + escapeHtml(textoVacio) + '</option>';
    (items || []).forEach(function(item){
      var mapped = mapFn(item);
      opciones += '<option value="' + escapeHtml(mapped.value) + '">' + escapeHtml(mapped.label) + '</option>';
    });
    select.innerHTML = opciones;
    select.value = actual;
  }

  var playaFiltroSelect = document.getElementById('q_playa');
  var accionFiltroSelect = document.getElementById('q_accion');

  function iniciarCatalogos(){
    if(!catalogos){ return Promise.resolve(); }
    return catalogos.ready().then(function(datos){
      catalogosCache = datos;
      llenarSelectFiltro(playaFiltroSelect, datos.playas, function(p){
        return { value: p.id, label: p.codigo + ' - ' + p.nombre };
      }, 'Todas las playas');
      llenarSelectFiltro(accionFiltroSelect, datos.acciones, function(a){
        return { value: a.codigo, label: a.descripcion };
      }, 'Todas las acciones');
    }).catch(function(){
      catalogosCache = { playas: [], especies: [], acciones: [], usoNido: [] };
    });
  }

  /* ---------------- Tabla ---------------- */

  var tablaScroll = document.getElementById('fichasTableScroll');
  var emptyState = document.getElementById('fichasEmptyState');
  var estadoTabla = document.getElementById('fichasTablaStatus');
  var prevBtn = document.getElementById('fichasPrevBtn');
  var nextBtn = document.getElementById('fichasNextBtn');
  var pageInfo = document.getElementById('fichasPageInfo');

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
      pageInfo.textContent = 'Pagina ' + paginaActual + ' de ' + totalPaginas + ' (' + totalRegistros + ' ficha' + (totalRegistros === 1 ? '' : 's') + ')';
    }
    if(prevBtn){ prevBtn.disabled = paginaActual <= 1; }
    if(nextBtn){ nextBtn.disabled = paginaActual >= totalPaginas; }
  }

  function construirFila(f){
    var tr = document.createElement('tr');

    var tdNumero = document.createElement('td');
    tdNumero.textContent = f.numeroFicha || '—';
    tr.appendChild(tdNumero);

    var tdFecha = document.createElement('td');
    tdFecha.textContent = formatFecha(f.fecha);
    tr.appendChild(tdFecha);

    var tdPlaya = document.createElement('td');
    tdPlaya.textContent = nombrePlaya(f.playaId);
    tr.appendChild(tdPlaya);

    var tdEspecie = document.createElement('td');
    tdEspecie.textContent = nombreEspecie(f.especieCodigo);
    tr.appendChild(tdEspecie);

    var tdAccion = document.createElement('td');
    var pill = document.createElement('span');
    pill.className = 'pill';
    pill.textContent = nombreAccion(f.accionCodigo);
    tdAccion.appendChild(pill);
    tr.appendChild(tdAccion);

    var tdHuevos = document.createElement('td');
    tdHuevos.textContent = (f.huevosColectados === null || f.huevosColectados === undefined) ? '—' : f.huevosColectados;
    tr.appendChild(tdHuevos);

    var tdCorral = document.createElement('td');
    tdCorral.textContent = f.corral || '—';
    tr.appendChild(tdCorral);

    var tdAcciones = document.createElement('td');
    var contenedorAcciones = document.createElement('div');
    contenedorAcciones.className = 'row-actions';

    var verBtn = document.createElement('button');
    verBtn.type = 'button';
    verBtn.className = 'icon-btn';
    verBtn.title = 'Ver detalle';
    verBtn.setAttribute('aria-label', 'Ver detalle de la ficha ' + (f.numeroFicha || ''));
    verBtn.innerHTML = ICONO_VER;
    verBtn.addEventListener('click', function(){ abrirDrawer(f.id, 'ver', verBtn); });
    contenedorAcciones.appendChild(verBtn);

    var editarBtn = document.createElement('button');
    editarBtn.type = 'button';
    editarBtn.className = 'icon-btn';
    editarBtn.title = 'Editar';
    editarBtn.setAttribute('aria-label', 'Editar ficha ' + (f.numeroFicha || ''));
    editarBtn.innerHTML = ICONO_EDITAR;
    editarBtn.addEventListener('click', function(){ abrirDrawer(f.id, 'editar', editarBtn); });
    contenedorAcciones.appendChild(editarBtn);

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
      elementos.forEach(function(f){ tbody.appendChild(construirFila(f)); });
    }

    actualizarPaginacion();
  }

  function cargarFichas(){
    if(!api){
      mostrarEstadoTabla('No se pudo conectar con la API.', 'error');
      if(tablaScroll){ tablaScroll.hidden = true; }
      if(emptyState){ emptyState.hidden = true; }
      return;
    }

    mostrarEstadoTabla('Cargando fichas...', 'loading');

    var filtros = {
      numeroFicha: val('q_numero') || undefined,
      pit: val('q_pit') || undefined,
      playaId: val('q_playa') || undefined,
      accionCodigo: val('q_accion') || undefined,
      page: paginaActual,
      pageSize: TAMANO_PAGINA
    };

    api.listarFichas(filtros).then(function(resp){
      ocultarEstadoTabla();
      renderTabla(resp);
    }).catch(function(err){
      tbody.innerHTML = '';
      if(tablaScroll){ tablaScroll.hidden = true; }
      if(emptyState){ emptyState.hidden = true; }
      totalRegistros = 0;
      actualizarPaginacion();
      mostrarEstadoTabla('No se pudieron cargar las fichas: ' + mensajeError(err), 'error');
    });
  }

  function aplicarFiltros(){
    paginaActual = 1;
    cargarFichas();
  }

  var aplicarFiltrosDebounced = debounce(aplicarFiltros, 350);

  ['q_numero', 'q_pit'].forEach(function(id){
    var el = document.getElementById(id);
    if(el){ el.addEventListener('input', aplicarFiltrosDebounced); }
  });
  if(playaFiltroSelect){ playaFiltroSelect.addEventListener('change', aplicarFiltros); }
  if(accionFiltroSelect){ accionFiltroSelect.addEventListener('change', aplicarFiltros); }

  var limpiarFiltrosBtn = document.getElementById('q_limpiar');
  if(limpiarFiltrosBtn){
    limpiarFiltrosBtn.addEventListener('click', function(){
      ['q_numero', 'q_pit', 'q_playa', 'q_accion'].forEach(function(id){
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
      cargarFichas();
    });
  }
  if(nextBtn){
    nextBtn.addEventListener('click', function(){
      var totalPaginas = totalRegistros > 0 ? Math.ceil(totalRegistros / TAMANO_PAGINA) : 1;
      if(paginaActual >= totalPaginas) return;
      paginaActual += 1;
      cargarFichas();
    });
  }

  /* ---------------- Drawer de detalle / edicion ---------------- */

  var overlay = document.getElementById('fichaDrawerOverlay');
  var drawer = document.getElementById('fichaDrawer');
  var drawerTitle = document.getElementById('fichaDrawerTitle');
  var drawerBody = document.getElementById('fichaDrawerBody');
  var drawerCloseBtn = document.getElementById('fichaDrawerClose');

  var elementoDisparador = null;
  var detalleActual = null;

  function kv(etiqueta, valor){
    var texto = (valor === null || valor === undefined || valor === '') ? '—' : valor;
    return '<div class="kv"><div class="k">' + escapeHtml(etiqueta) + '</div><div class="v">' + escapeHtml(texto) + '</div></div>';
  }

  function construirBloqueMarcado(marcas){
    marcas = marcas || [];
    if(!marcas.length){
      return '<div class="detail-block"><h4>Marcado</h4><p class="hint">Sin marcado registrado en esta ficha.</p></div>';
    }
    var html = '';
    marcas.forEach(function(m){
      var titulo = m.aleta === 'izquierda' ? 'Aleta izquierda' : (m.aleta === 'derecha' ? 'Aleta derecha' : 'Marca');
      html += '<div class="detail-block"><h4>' + escapeHtml(titulo) + '</h4><div class="kv-grid">'
        + kv('PIT', m.pit)
        + kv('Marca', m.numeroMarca)
        + kv('Leyenda', m.leyenda)
        + kv('Nueva o recaptura', m.nuevaORecap ? (NUEVA_RECAP[m.nuevaORecap] || m.nuevaORecap) : '')
        + kv('Cicatriz de marca', m.cicatrizMarca ? 'Si' : 'No')
        + kv('Verifico', m.verifico ? 'Si' : 'No')
        + '</div></div>';
    });
    return html;
  }

  function construirEstadoCarga(){
    return '<div class="status-banner is-visible is-loading"><svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="9" opacity="0.25"/><path d="M21 12a9 9 0 0 0-9-9"/></svg><span>Cargando ficha...</span></div>';
  }

  function construirEstadoError(mensaje){
    return '<div class="status-banner is-visible is-error" role="alert"><span>' + escapeHtml(mensaje) + '</span></div>';
  }

  function construirDetalleLectura(detalle){
    var html = '';
    html += '<p class="hint">' + escapeHtml(formatFecha(detalle.fecha)) + ' · ' + escapeHtml(nombrePlaya(detalle.playaId)) + '</p>';

    html += '<div class="detail-block"><h4>Datos generales</h4><div class="kv-grid">'
      + kv('No. de ficha', detalle.numeroFicha)
      + kv('Estaca', detalle.estaca)
      + kv('Zona', detalle.zona)
      + kv('Especie', nombreEspecie(detalle.especieCodigo))
      + kv('Sexo', detalle.sexo ? (SEXOS[detalle.sexo] || detalle.sexo) : '')
      + kv('Formulo', detalle.formulo)
      + '</div></div>';

    html += '<div class="detail-block"><h4>Ubicacion del nido</h4><div class="kv-grid">'
      + kv('Latitud', detalle.latitud)
      + kv('Longitud', detalle.longitud)
      + '</div></div>';

    html += '<div class="detail-block"><h4>Accion, horarios y uso de nido</h4><div class="kv-grid">'
      + kv('Accion', nombreAccion(detalle.accionCodigo))
      + kv('Uso de nido', nombreUsoNido(detalle.usoNidoCodigo))
      + kv('Corral', detalle.corral)
      + kv('Num. nido', detalle.numeroNido)
      + kv('Hora A (arribo)', detalle.horaA)
      + kv('Hora B (colecta)', detalle.horaBColecta)
      + kv('Hora C (siembra)', detalle.horaCSiembra)
      + '</div></div>';

    html += '<div class="detail-block"><h4>Huevos</h4><div class="kv-grid">'
      + kv('Huevos colectados', detalle.huevosColectados)
      + kv('Huevos rotos', detalle.huevosRotos)
      + kv('Posicion', (detalle.posicionCodigo !== null && detalle.posicionCodigo !== undefined && detalle.posicionCodigo !== '') ? (POSICIONES[String(detalle.posicionCodigo)] || detalle.posicionCodigo) : '')
      + '</div></div>';

    html += construirBloqueMarcado(detalle.marcas);

    html += '<div class="detail-block"><h4>Biometrias del caparazon</h4><div class="kv-grid">'
      + kv('Muesca-punta mas larga (cm)', detalle.bioMuescaPuntaLargaCm)
      + kv('Punta-muesca (cm)', detalle.bioPuntaMuescaCm)
      + kv('Muesca-muesca (cm)', detalle.bioMuescaMuescaCm)
      + kv('Ancho (cm)', detalle.bioAnchoCm)
      + kv('Temperatura (C)', detalle.temperaturaC)
      + kv('Tumores / fibropapiloma', detalle.tumoresPresentes ? 'Presentes' : 'No observados')
      + '</div></div>';

    html += '<div class="detail-block"><h4>Observaciones</h4><p class="detail-text">' + escapeHtml(detalle.observaciones || 'Sin observaciones.') + '</p></div>';

    html += '<p class="hint detail-meta">Creado: ' + escapeHtml(formatFechaHora(detalle.creadoEn))
      + (detalle.actualizadoEn ? ' · Actualizado: ' + escapeHtml(formatFechaHora(detalle.actualizadoEn)) : '')
      + '</p>';

    html += '<div class="form-actions"><button type="button" class="btn" id="fichaDrawerEditarBtn">Editar ficha</button></div>';

    return html;
  }

  function mostrarDetalle(detalle){
    drawerTitle.textContent = 'Ficha ' + (detalle.numeroFicha || '');
    drawerBody.innerHTML = construirDetalleLectura(detalle);
    var editarBtn = document.getElementById('fichaDrawerEditarBtn');
    if(editarBtn){
      editarBtn.addEventListener('click', function(){ mostrarEdicion(detalle); });
    }
    enfocarDrawer();
  }

  function manejarFichaGuardada(){
    cargarFichas();
    window.setTimeout(function(){ cerrarDrawer(); }, 1100);
  }

  function mostrarEdicion(detalle){
    if(!fichaFormApi){
      drawerTitle.textContent = 'Ficha ' + (detalle.numeroFicha || '');
      drawerBody.innerHTML = construirEstadoError('No se pudo cargar el formulario de edicion.');
      return;
    }
    drawerTitle.textContent = 'Editar ficha ' + (detalle.numeroFicha || '');
    drawerBody.innerHTML = '';
    fichaFormApi.editar(detalle, {
      contenedor: drawerBody,
      onGuardado: manejarFichaGuardada,
      onCancelar: function(){ mostrarDetalle(detalle); }
    });
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

  function abrirDrawer(id, modoInicial, origen){
    elementoDisparador = origen || document.activeElement;
    detalleActual = null;
    overlay.hidden = false;
    document.body.classList.add('drawer-open');
    drawerTitle.textContent = 'Cargando ficha...';
    drawerBody.innerHTML = construirEstadoCarga();
    document.addEventListener('keydown', manejarTeclado, true);
    enfocarDrawer();

    if(!api){
      drawerBody.innerHTML = construirEstadoError('No se pudo conectar con la API.');
      return;
    }

    api.obtenerFicha(id).then(function(detalle){
      detalleActual = detalle;
      if(modoInicial === 'editar'){ mostrarEdicion(detalle); }
      else { mostrarDetalle(detalle); }
    }).catch(function(err){
      drawerTitle.textContent = 'Ficha';
      drawerBody.innerHTML = construirEstadoError('No se pudo cargar la ficha: ' + mensajeError(err));
    });
  }

  function cerrarDrawer(){
    if(overlay.hidden) return;
    if(fichaFormApi){ fichaFormApi.finalizarEdicion(); }
    document.removeEventListener('keydown', manejarTeclado, true);
    overlay.hidden = true;
    document.body.classList.remove('drawer-open');
    drawerBody.innerHTML = '';
    detalleActual = null;
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

  iniciarCatalogos().then(function(){ cargarFichas(); });
})();
