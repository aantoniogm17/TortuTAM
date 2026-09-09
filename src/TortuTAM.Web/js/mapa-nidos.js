/*
  Mapa de nidos (vista #view-mapa, issue #14). Consume
  GET /api/nidos/mapa via js/api.js (issue #27, contrato ya definitivo).

  Todo el codigo especifico de Leaflet (creacion del mapa, capa de tiles,
  marcadores, popups) vive dentro de ProveedorMapa, mas abajo. El resto del
  archivo solo conoce ese objeto y nunca llama a L.* directamente, para que
  cambiar de proveedor de mapa en el futuro quede contenido a ese bloque.

  El mapa de Leaflet no se puede inicializar mientras la vista esta oculta
  (contenedor con dimension 0), asi que la inicializacion se difiere hasta
  que la seccion #view-mapa recibe la clase is-active (ver MutationObserver
  al final del archivo). La carga de datos, en cambio, ocurre de inmediato
  al cargar el script, igual que en el resto de vistas.
*/
(function(){
  var seccion = document.getElementById('view-mapa');
  if(!seccion) return;

  var api = window.TortuTAM && window.TortuTAM.api;

  var elStatus = document.getElementById('mapaStatus');
  var elSideList = document.getElementById('mapaSideList');
  var elSideEmpty = document.getElementById('mapaEmptyState');
  var elMapEmptyOverlay = document.getElementById('mapaEmptyOverlay');
  var elContador = document.getElementById('mapaContador');

  var CANVAS_ID = 'mapaNidosCanvas';

  /* ---------------- Estatus: etiquetas, color y clase visual ----------------
     El color real se lee de css/tokens.css en tiempo de ejecucion (ver
     leerToken), para no duplicar la paleta aqui; Leaflet dibuja los
     marcadores en canvas/SVG y necesita el valor final, no la variable CSS. */
  var ESTATUS_META = {
    sin_coordenadas: { etiqueta: 'Sin coordenadas', token: null, claseDot: 'legend-dot--sin-coordenadas', claseLista: 'is-sin-coordenadas' },
    sin_limpieza: { etiqueta: 'Sin limpieza registrada', token: '--amber', claseDot: 'legend-dot--sin-limpieza', claseLista: 'is-sin-limpieza' },
    limpiado_sin_conteo: { etiqueta: 'Limpiado, sin conteo', token: '--ink-soft', claseDot: 'legend-dot--sin-conteo', claseLista: 'is-sin-conteo' },
    limpiado_exito_alto: { etiqueta: 'Limpiado, exito alto', token: '--ocean-mid', claseDot: 'legend-dot--exito-alto', claseLista: 'is-exito-alto' },
    limpiado_exito_bajo: { etiqueta: 'Limpiado, exito bajo', token: '--coral', claseDot: 'legend-dot--exito-bajo', claseLista: 'is-exito-bajo' }
  };
  var ESTATUS_DEFECTO = { etiqueta: 'Sin estatus', token: '--ink-soft', claseDot: 'legend-dot--sin-conteo', claseLista: '' };

  function metaDeEstatus(estatus){
    return ESTATUS_META[estatus] || ESTATUS_DEFECTO;
  }

  function leerToken(nombre, fallback){
    if(!nombre) return fallback;
    try{
      var valor = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
      return valor || fallback;
    }catch(e){
      return fallback;
    }
  }

  function tieneCoordenadas(nido){
    return nido.latitud !== null && nido.latitud !== undefined && nido.latitud !== ''
      && nido.longitud !== null && nido.longitud !== undefined && nido.longitud !== '';
  }

  /* ============================================================
     Proveedor de mapa (Leaflet + capa satelital Esri World Imagery).
     Unico bloque del archivo que llama a la API de Leaflet.
     ============================================================ */
  var ProveedorMapa = (function(){
    var mapa = null;
    var capaMarcadores = null;
    var marcadoresPorId = {};
    var onMarcadorClick = null;
    var VISTA_INICIAL = [22.27, -97.86];
    var ZOOM_INICIAL = 9;

    function inicializar(contenedorId){
      if(mapa || typeof L === 'undefined') return;

      mapa = L.map(contenedorId, { scrollWheelZoom: true }).setView(VISTA_INICIAL, ZOOM_INICIAL);

      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS community',
        maxZoom: 19
      }).addTo(mapa);

      capaMarcadores = L.layerGroup().addTo(mapa);
    }

    function limpiarMarcadores(){
      if(capaMarcadores){ capaMarcadores.clearLayers(); }
      marcadoresPorId = {};
    }

    function pintarMarcadores(nidos){
      if(!mapa) return;
      limpiarMarcadores();

      var puntos = [];
      (nidos || []).forEach(function(nido){
        var punto = [nido.latitud, nido.longitud];
        var marcador = L.circleMarker(punto, {
          radius: 9,
          weight: 2,
          color: '#ffffff',
          fillColor: nido.colorMarcador,
          fillOpacity: 0.95
        }).addTo(capaMarcadores);

        marcador.bindPopup(nido.popupHtml);
        marcador.on('click', function(){
          if(typeof onMarcadorClick === 'function'){ onMarcadorClick(nido.fichaId); }
        });

        marcadoresPorId[nido.fichaId] = marcador;
        puntos.push(punto);
      });

      if(puntos.length){
        mapa.fitBounds(L.latLngBounds(puntos), { padding: [30, 30], maxZoom: 15 });
      } else {
        mapa.setView(VISTA_INICIAL, ZOOM_INICIAL);
      }
      refrescarTamano();
    }

    function centrarYAbrir(fichaId){
      var marcador = marcadoresPorId[fichaId];
      if(!mapa || !marcador) return false;
      mapa.setView(marcador.getLatLng(), Math.max(mapa.getZoom(), 15));
      marcador.openPopup();
      return true;
    }

    function refrescarTamano(){
      if(!mapa) return;
      window.setTimeout(function(){ mapa.invalidateSize(); }, 60);
    }

    function alHacerClicEnMarcador(callback){
      onMarcadorClick = callback;
    }

    return {
      inicializar: inicializar,
      pintarMarcadores: pintarMarcadores,
      centrarYAbrir: centrarYAbrir,
      refrescarTamano: refrescarTamano,
      alHacerClicEnMarcador: alHacerClicEnMarcador,
      estaListo: function(){ return !!mapa; }
    };
  })();

  /* ---------------- Helpers de formato / texto ---------------- */

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

  function formatPorcentaje(valor){
    if(valor === null || valor === undefined || valor === ''){ return null; }
    var n = Number(valor);
    if(isNaN(n)){ return null; }
    return n.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
  }

  function filaPopup(etiqueta, valor){
    var texto = (valor === null || valor === undefined || valor === '') ? '—' : valor;
    return '<div class="popup-row"><span class="k">' + escapeHtml(etiqueta) + '</span><span>' + escapeHtml(texto) + '</span></div>';
  }

  function construirPopup(nido, meta){
    var html = '<b>Ficha ' + escapeHtml(nido.numeroFicha || '—') + '</b>';
    html += filaPopup('Corral', nido.corral);
    html += filaPopup('Nido', nido.numeroNido);
    html += filaPopup('Fecha', formatFecha(nido.fecha));
    html += filaPopup('Estatus', meta.etiqueta);
    var porcentaje = formatPorcentaje(nido.porcentajeEclosion);
    if(porcentaje){ html += filaPopup('Exito de eclosion', porcentaje); }
    return html;
  }

  /* ---------------- Estado / carga de datos ---------------- */

  var mapaInicializado = false;
  var nidosConCoordenadas = null;

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

  function construirItemLista(nido, meta){
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'map-side-item' + (meta.claseLista ? ' ' + meta.claseLista : '');
    btn.dataset.fichaId = nido.fichaId;
    btn.setAttribute('aria-pressed', 'false');

    var titulo = document.createElement('div');
    titulo.className = 'title';
    var texto = document.createElement('span');
    texto.textContent = 'Ficha ' + (nido.numeroFicha || '—');
    var dot = document.createElement('span');
    dot.className = 'legend-dot ' + meta.claseDot;
    dot.setAttribute('aria-hidden', 'true');
    titulo.appendChild(texto);
    titulo.appendChild(dot);
    btn.appendChild(titulo);

    var sub = document.createElement('div');
    sub.className = 'sub';
    sub.textContent = 'Corral ' + (nido.corral || '—') + ' · Nido ' + (nido.numeroNido || '—') + ' · ' + formatFecha(nido.fecha);
    btn.appendChild(sub);

    var estatusTexto = document.createElement('div');
    estatusTexto.className = 'status-text';
    estatusTexto.textContent = meta.etiqueta;
    btn.appendChild(estatusTexto);

    return btn;
  }

  function renderListaLateral(nidos){
    nidos = nidos || [];
    elSideList.innerHTML = '';
    if(elContador){ elContador.textContent = String(nidos.length); }

    if(!nidos.length){
      if(elSideEmpty){ elSideEmpty.hidden = false; }
      return;
    }
    if(elSideEmpty){ elSideEmpty.hidden = true; }

    nidos.forEach(function(nido){
      var meta = metaDeEstatus(nido.estatus);
      elSideList.appendChild(construirItemLista(nido, meta));
    });
  }

  function seleccionarNido(fichaId, opciones){
    opciones = opciones || {};
    var itemActivo = null;
    var items = elSideList.querySelectorAll('.map-side-item');
    items.forEach(function(el){
      var activo = String(el.dataset.fichaId) === String(fichaId);
      el.classList.toggle('is-active', activo);
      el.setAttribute('aria-pressed', activo ? 'true' : 'false');
      if(activo){ itemActivo = el; }
    });

    if(opciones.centrarMapa && mapaInicializado){
      ProveedorMapa.centrarYAbrir(fichaId);
    }
    if(opciones.scrollIntoView && itemActivo && typeof itemActivo.scrollIntoView === 'function'){
      itemActivo.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  if(elSideList){
    elSideList.addEventListener('click', function(evt){
      var item = evt.target.closest('.map-side-item');
      if(!item) return;
      seleccionarNido(item.dataset.fichaId, { centrarMapa: true });
    });
  }

  ProveedorMapa.alHacerClicEnMarcador(function(fichaId){
    seleccionarNido(fichaId, { scrollIntoView: true });
  });

  function intentarPintarMarcadores(){
    if(!mapaInicializado || nidosConCoordenadas === null) return;
    ProveedorMapa.pintarMarcadores(nidosConCoordenadas);
    if(elMapEmptyOverlay){ elMapEmptyOverlay.hidden = nidosConCoordenadas.length > 0; }
  }

  function procesarDatos(lista){
    var conCoordenadas = [];
    lista.forEach(function(nido){
      if(!tieneCoordenadas(nido)) return;
      var meta = metaDeEstatus(nido.estatus);
      nido.colorMarcador = leerToken(meta.token, '#8A93A0');
      nido.popupHtml = construirPopup(nido, meta);
      conCoordenadas.push(nido);
    });

    nidosConCoordenadas = conCoordenadas;
    renderListaLateral(lista);
    intentarPintarMarcadores();
  }

  function cargarDatos(){
    if(!api || !api.obtenerNidosMapa){
      mostrarEstado('No se pudo conectar con la API.', 'error');
      renderListaLateral([]);
      return;
    }

    mostrarEstado('Cargando nidos...', 'loading');

    api.obtenerNidosMapa().then(function(lista){
      ocultarEstado();
      procesarDatos(lista || []);
    }).catch(function(err){
      renderListaLateral([]);
      mostrarEstado('No se pudieron cargar los nidos: ' + mensajeError(err), 'error');
    });
  }

  /* ---------------- Activacion diferida de Leaflet ---------------- */

  function estaActiva(){
    return seccion.classList.contains('is-active');
  }

  function manejarActivacion(){
    if(!estaActiva()) return;
    if(!mapaInicializado){
      ProveedorMapa.inicializar(CANVAS_ID);
      mapaInicializado = true;
      intentarPintarMarcadores();
    } else {
      ProveedorMapa.refrescarTamano();
    }
  }

  var observadorVista = new MutationObserver(manejarActivacion);
  observadorVista.observe(seccion, { attributes: true, attributeFilter: ['class'] });

  var temporizadorResize = null;
  window.addEventListener('resize', function(){
    window.clearTimeout(temporizadorResize);
    temporizadorResize = window.setTimeout(function(){
      if(mapaInicializado){ ProveedorMapa.refrescarTamano(); }
    }, 200);
  });

  cargarDatos();
  manejarActivacion();
})();
