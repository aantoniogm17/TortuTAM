/*
  Subvistas "Nueva necropsia" / "Ver registros" de la vista Necropsia.
  Controla las pestañas, el listado paginado y el panel de detalle de solo
  lectura. Depende de js/api.js, js/catalogos.js, js/form-utils.js y
  js/codigos-campo.js.
*/
(function(){
  var tbody = document.getElementById('nq_tableBody');
  if(!tbody) return;

  var T = window.TortuTAM || {};
  var api = T.api;
  var catalogos = T.catalogos;
  var U = T.formUtils;
  var C = T.codigosCampo;
  if(!U || !C) return;

  var esc = U.escapeHtml;
  var kv = U.kv;

  var TAMANO_PAGINA = 20;
  var paginaActual = 1;
  var totalRegistros = 0;
  var cache = { playas: [], especies: [] };

  var ICONO_VER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>';

  function buscar(lista, valor, campo){
    if(valor === null || valor === undefined || valor === ''){ return null; }
    for(var i = 0; i < (lista || []).length; i++){
      if(String(lista[i][campo]) === String(valor)){ return lista[i]; }
    }
    return null;
  }

  function nombrePlaya(id){
    var p = buscar(cache.playas, id, 'id');
    if(p){ return p.nombre; }
    return (id !== null && id !== undefined && id !== '') ? String(id) : '—';
  }

  function nombreEspecie(codigo){
    var e = buscar(cache.especies, codigo, 'codigo');
    return e ? U.etiquetaEspecie(e) : (codigo || '—');
  }

  function iniciarCatalogos(){
    if(!catalogos){ return Promise.resolve(); }
    return catalogos.ready().then(function(r){
      cache.playas = (r && r.playas) || [];
      cache.especies = (r && r.especies) || [];
    }).catch(function(){ /* se muestran los codigos tal cual */ });
  }

  function textoVaramiento(n){
    return U.formatFecha(n.fechaVaramiento) + ' · tortuga ' + U.formatNumeroDia(n.numeroTortugaDia);
  }

  /* ---------------- Tabla ---------------- */

  var tablaScroll = document.getElementById('nq_tableScroll');
  var emptyState = document.getElementById('nq_emptyState');
  var estado = U.crearBanner(document.getElementById('nq_status'));
  var prevBtn = document.getElementById('nq_prevBtn');
  var nextBtn = document.getElementById('nq_nextBtn');
  var pageInfo = document.getElementById('nq_pageInfo');

  function actualizarPaginacion(){
    var totalPaginas = totalRegistros > 0 ? Math.ceil(totalRegistros / TAMANO_PAGINA) : 1;
    if(pageInfo){
      pageInfo.textContent = 'Página ' + paginaActual + ' de ' + totalPaginas + ' (' + totalRegistros + ' registro' + (totalRegistros === 1 ? '' : 's') + ')';
    }
    if(prevBtn){ prevBtn.disabled = paginaActual <= 1; }
    if(nextBtn){ nextBtn.disabled = paginaActual >= totalPaginas; }
  }

  function construirFila(n){
    var tr = document.createElement('tr');
    function addTd(texto){
      var td = document.createElement('td');
      td.textContent = (texto === null || texto === undefined || texto === '') ? '—' : texto;
      tr.appendChild(td);
    }
    addTd(U.formatFecha(n.fechaNecropsia));
    addTd(textoVaramiento(n));
    addTd(nombrePlaya(n.playaId));
    addTd(nombreEspecie(n.especieCodigo));
    addTd(n.sexo ? C.etiqueta('sexo', n.sexo) : null);

    var tdAcc = document.createElement('td');
    var acciones = document.createElement('div');
    acciones.className = 'row-actions';
    var verBtn = document.createElement('button');
    verBtn.type = 'button';
    verBtn.className = 'icon-btn';
    verBtn.title = 'Ver detalle';
    verBtn.setAttribute('aria-label', 'Ver detalle de la necropsia del varamiento ' + textoVaramiento(n));
    verBtn.innerHTML = ICONO_VER;
    verBtn.addEventListener('click', function(){ abrirDetalle(n.id, verBtn); });
    acciones.appendChild(verBtn);
    tdAcc.appendChild(acciones);
    tr.appendChild(tdAcc);
    return tr;
  }

  function renderTabla(resp){
    var elementos = (resp && resp.elementos) || [];
    totalRegistros = (resp && typeof resp.total === 'number') ? resp.total : elementos.length;
    tbody.innerHTML = '';
    tablaScroll.hidden = !elementos.length;
    emptyState.hidden = !!elementos.length;
    elementos.forEach(function(n){ tbody.appendChild(construirFila(n)); });
    actualizarPaginacion();
  }

  function cargar(){
    if(!api){
      estado.mostrar('No se pudo conectar con la API.', 'error');
      tablaScroll.hidden = true;
      emptyState.hidden = true;
      return;
    }
    estado.mostrar('Cargando registros...', 'loading');
    api.listarNecropsias({ page: paginaActual, pageSize: TAMANO_PAGINA }).then(function(resp){
      estado.ocultar();
      renderTabla(resp);
    }).catch(function(err){
      tbody.innerHTML = '';
      tablaScroll.hidden = true;
      emptyState.hidden = true;
      totalRegistros = 0;
      actualizarPaginacion();
      estado.mostrar('No se pudieron cargar los registros: ' + U.mensajeError(err), 'error');
    });
  }

  if(prevBtn){
    prevBtn.addEventListener('click', function(){
      if(paginaActual <= 1) return;
      paginaActual -= 1;
      cargar();
    });
  }
  if(nextBtn){
    nextBtn.addEventListener('click', function(){
      var totalPaginas = totalRegistros > 0 ? Math.ceil(totalRegistros / TAMANO_PAGINA) : 1;
      if(paginaActual >= totalPaginas) return;
      paginaActual += 1;
      cargar();
    });
  }

  /* ---------------- Detalle ---------------- */

  var drawer = U.crearDrawer({
    overlay: 'necropsiaDrawerOverlay',
    drawer: 'necropsiaDrawer',
    titulo: 'necropsiaDrawerTitle',
    cuerpo: 'necropsiaDrawerBody',
    cerrar: 'necropsiaDrawerClose'
  });

  function bloque(titulo, contenidoKv, comentario){
    return '<div class="detail-block"><h4>' + esc(titulo) + '</h4><div class="kv-grid">' + contenidoKv + '</div>'
      + (comentario ? '<p class="detail-text">' + esc(comentario) + '</p>' : '') + '</div>';
  }

  function una(lista, valor){ return valor ? C.etiqueta(lista, valor) : null; }
  function varias(lista, valores){ return C.etiquetas(lista, valores); }

  function contenido(estadoGi, descripcion){
    if(!estadoGi){ return null; }
    var texto = C.etiqueta('giEstado', estadoGi);
    return descripcion ? texto + ': ' + descripcion : texto;
  }

  function construirDetalle(d){
    var html = '<p class="hint">Varamiento ' + esc(textoVaramiento(d)) + ' · ' + esc(nombrePlaya(d.playaId)) + ' · ' + esc(nombreEspecie(d.especieCodigo)) + '</p>';

    html += bloque('Datos de la necropsia',
      kv('Fecha de necropsia', U.formatFecha(d.fechaNecropsia))
      + kv('Realizó', d.realizo)
      + kv('Grasa corporal', una('grasaCorporal', d.grasaCorporal)));

    html += bloque('Celoma',
      kv('Celoma', varias('celoma', d.celoma))
      + kv('¿Tumores FP internos?', una('siNoCbd', d.tumoresFp))
      + kv('Ubicaciones de tumores', d.tumoresFpUbicaciones),
      d.celomaComentarios);

    html += bloque('Corazón y vasos sanguíneos principales',
      kv('Hallazgos', varias('corazon', d.corazon))
      + kv('¿Sangre en cámaras de corazón?', una('siNoCbd', d.sangreCamaras)),
      d.corazonComentarios);

    html += bloque('Hígado y vesícula biliar',
      kv('Hallazgos', varias('higado', d.higado)),
      d.higadoComentarios);

    html += bloque('Tracto GI',
      kv('Hallazgos', varias('tractoGi', d.tractoGi))
      + kv('Boca examinada', U.textoSiNo(d.bocaExaminada))
      + kv('Anomalías', varias('giAnormalidades', d.giAnormalidades))
      + kv('Descripción de anomalías', d.giDescripcion)
      + kv('¿Material antropogénico?', d.materialAntropogenicoDetalle)
      + kv('¿Material hecho por humano ingerido?', una('siNoCbd', d.materialIngerido))
      + kv('Material encontrado', d.materialIngeridoDescripcion)
      + kv('Foto con escala', U.textoSiNo(d.materialFotoEscala)));

    html += bloque('Contenido GI',
      kv('Boca/esófago', contenido(d.giBocaEsofagoEstado, d.giBocaEsofagoDescripcion))
      + kv('Estómago', contenido(d.giEstomagoEstado, d.giEstomagoDescripcion))
      + kv('Intestino (primer ½)', contenido(d.giIntestino1Estado, d.giIntestino1Descripcion))
      + kv('Intestino (última ½)', contenido(d.giIntestino2Estado, d.giIntestino2Descripcion)));

    html += bloque('Urogenital',
      kv('Urogenital', una('urogenital', d.urogenital))
      + kv('Sexo', una('sexo', d.sexo))
      + kv('Testículos', una('testiculos', d.testiculos))
      + kv('Epidídimo', una('epididimo', d.epididimo))
      + kv('Ovarios', una('ovarios', d.ovarios))
      + kv('Oviducto', una('oviducto', d.oviducto)),
      d.urogenitalComentarios);

    html += bloque('Respiratorio',
      kv('Tráquea/bronquios', varias('traquea', d.traquea))
      + kv('Pulmones', varias('pulmones', d.pulmones)),
      d.respiratorioComentarios);

    html += bloque('Cerebro y espina dorsal',
      kv('Hallazgos', varias('cerebro', d.cerebro)),
      d.cerebroComentarios);

    html += '<div class="detail-block"><h4>Resumen de hallazgos</h4><p class="detail-text">' + esc(d.resumenHallazgos || 'Sin resumen.') + '</p></div>';
    html += '<p class="hint detail-meta">Creado: ' + esc(U.formatFechaHora(d.creadoEn)) + '</p>';
    return html;
  }

  function abrirDetalle(id, origen){
    drawer.abrir(origen);
    if(!api){ drawer.error('Necropsia', 'No se pudo conectar con la API.'); return; }
    api.obtenerNecropsia(id).then(function(d){
      drawer.mostrar('Necropsia del varamiento ' + U.formatNumeroDia(d.numeroTortugaDia), construirDetalle(d));
    }).catch(function(err){
      drawer.error('Necropsia', 'No se pudo cargar el registro: ' + U.mensajeError(err));
    });
  }

  /* ---------------- Pestañas ---------------- */

  var listaIniciada = false;

  U.crearSubvistas(
    { nueva: document.getElementById('tabNecropsiaNueva'), lista: document.getElementById('tabNecropsiaLista') },
    { nueva: document.getElementById('sub-necropsia-nueva'), lista: document.getElementById('sub-necropsia-lista') },
    function(nombre){
      if(nombre !== 'lista') return;
      if(!listaIniciada){
        listaIniciada = true;
        iniciarCatalogos().then(cargar);
      }else{
        cargar();
      }
    }
  );

  window.TortuTAM = window.TortuTAM || {};
  window.TortuTAM.necropsias = {
    refrescar: function(){ if(listaIniciada){ cargar(); } }
  };
})();
