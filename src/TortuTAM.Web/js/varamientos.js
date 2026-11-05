/*
  Subvistas "Nuevo varamiento" / "Ver registros" de la vista Varamientos.
  Controla las pestañas, el listado paginado y el panel de detalle de solo
  lectura (con miniaturas de las fotos). Desde el listado se puede saltar a
  "Nueva necropsia" con el varamiento ya seleccionado cuando la necropsia
  esta pendiente. Depende de js/api.js, js/catalogos.js, js/form-utils.js y
  js/codigos-campo.js.
*/
(function(){
  var tbody = document.getElementById('vq_tableBody');
  if(!tbody) return;

  var T = window.TortuTAM || {};
  var api = T.api;
  var catalogos = T.catalogos;
  var U = T.formUtils;
  var C = T.codigosCampo;
  if(!U || !C) return;

  var esc = U.escapeHtml;
  var kv = U.kv;
  var siNo = U.textoSiNo;

  var TAMANO_PAGINA = 20;
  var paginaActual = 1;
  var totalRegistros = 0;
  var cache = { playas: [], especies: [] };

  var ICONO_VER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>';
  var ICONO_NECROPSIA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="1"/><path d="M9 4V3h6v1M12 9v6M9 12h6"/></svg>';

  /* ---------------- Catalogos ---------------- */

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

  /* ---------------- Tabla ---------------- */

  var tablaScroll = document.getElementById('vq_tableScroll');
  var emptyState = document.getElementById('vq_emptyState');
  var estado = U.crearBanner(document.getElementById('vq_status'));
  var prevBtn = document.getElementById('vq_prevBtn');
  var nextBtn = document.getElementById('vq_nextBtn');
  var pageInfo = document.getElementById('vq_pageInfo');

  function actualizarPaginacion(){
    var totalPaginas = totalRegistros > 0 ? Math.ceil(totalRegistros / TAMANO_PAGINA) : 1;
    if(pageInfo){
      pageInfo.textContent = 'Página ' + paginaActual + ' de ' + totalPaginas + ' (' + totalRegistros + ' registro' + (totalRegistros === 1 ? '' : 's') + ')';
    }
    if(prevBtn){ prevBtn.disabled = paginaActual <= 1; }
    if(nextBtn){ nextBtn.disabled = paginaActual >= totalPaginas; }
  }

  function estadoNecropsia(v){
    if(v.necropsiaId){ return { texto: 'Registrada', clase: 'is-ok' }; }
    if(v.condicionCodigo === 'vivo'){ return { texto: 'No aplica', clase: 'is-na' }; }
    return { texto: 'Pendiente', clase: 'is-pendiente' };
  }

  function construirFila(v){
    var tr = document.createElement('tr');
    function addTd(texto){
      var td = document.createElement('td');
      td.textContent = (texto === null || texto === undefined || texto === '') ? '—' : texto;
      tr.appendChild(td);
      return td;
    }

    addTd(U.formatFecha(v.fechaVaramiento));
    addTd(U.formatNumeroDia(v.numeroTortugaDia));
    addTd(nombrePlaya(v.playaId));
    addTd(nombreEspecie(v.especieCodigo));
    addTd(C.etiqueta('condicion', v.condicionCodigo));

    var est = estadoNecropsia(v);
    var tdNec = document.createElement('td');
    tdNec.innerHTML = '<span class="pill ' + est.clase + '">' + esc(est.texto) + '</span>';
    tr.appendChild(tdNec);

    var tdAcc = document.createElement('td');
    var acciones = document.createElement('div');
    acciones.className = 'row-actions';
    var descripcion = U.formatFecha(v.fechaVaramiento) + ' tortuga ' + U.formatNumeroDia(v.numeroTortugaDia);

    var verBtn = document.createElement('button');
    verBtn.type = 'button';
    verBtn.className = 'icon-btn';
    verBtn.title = 'Ver detalle';
    verBtn.setAttribute('aria-label', 'Ver detalle del varamiento ' + descripcion);
    verBtn.innerHTML = ICONO_VER;
    verBtn.addEventListener('click', function(){ abrirDetalle(v.id, verBtn); });
    acciones.appendChild(verBtn);

    if(est.clase === 'is-pendiente' && T.necropsiaForm && T.necropsiaForm.iniciarCon){
      var necBtn = document.createElement('button');
      necBtn.type = 'button';
      necBtn.className = 'icon-btn';
      necBtn.title = 'Registrar necropsia';
      necBtn.setAttribute('aria-label', 'Registrar necropsia del varamiento ' + descripcion);
      necBtn.innerHTML = ICONO_NECROPSIA;
      necBtn.addEventListener('click', function(){ T.necropsiaForm.iniciarCon(v.id); });
      acciones.appendChild(necBtn);
    }

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
    elementos.forEach(function(v){ tbody.appendChild(construirFila(v)); });
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
    api.listarVaramientos({ page: paginaActual, pageSize: TAMANO_PAGINA }).then(function(resp){
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
    overlay: 'varamientoDrawerOverlay',
    drawer: 'varamientoDrawer',
    titulo: 'varamientoDrawerTitle',
    cuerpo: 'varamientoDrawerBody',
    cerrar: 'varamientoDrawerClose'
  });

  var urlsFotos = [];

  function liberarFotos(){
    urlsFotos.forEach(function(url){ URL.revokeObjectURL(url); });
    urlsFotos = [];
  }

  function bloque(titulo, contenido){
    return '<div class="detail-block"><h4>' + esc(titulo) + '</h4>' + contenido + '</div>';
  }

  function grid(html){ return '<div class="kv-grid">' + html + '</div>'; }

  function medida(valor){
    return (valor === null || valor === undefined || valor === '') ? null : valor + ' cm';
  }

  function construirEtiquetas(etiquetas){
    if(!etiquetas || !etiquetas.length){ return '<p class="hint">Sin etiquetas registradas.</p>'; }
    return grid(etiquetas.map(function(e){
      return kv(C.etiqueta('tipoEtiqueta', e.tipo), e.numero + (e.ubicacion ? ' · ' + e.ubicacion : ''));
    }).join(''));
  }

  function construirHallazgos(hallazgos, categoria){
    var lista = (hallazgos || []).filter(function(h){ return h.categoria === categoria; });
    if(!lista.length){ return '<p class="hint">Ningún tipo marcado.</p>'; }
    var catalogo = categoria === 'material' ? 'materiales' : 'heridas';
    return grid(lista.map(function(h){
      var ubic = C.etiquetas('ubicacionesCuerpo', h.ubicaciones).join(', ');
      var texto = [ubic, h.detalle].filter(function(t){ return !!t; }).join(' · ') || 'Sí';
      return kv(C.etiqueta(catalogo, h.tipoCodigo), texto);
    }).join(''));
  }

  function construirDetalle(d){
    var html = '<p class="hint">' + esc(U.formatFecha(d.fechaVaramiento)) + ' · ' + esc(nombrePlaya(d.playaId)) + '</p>';

    html += bloque('Observador y fecha', grid(
      kv('Observador', d.observadorNombre)
      + kv('Campamento', nombrePlaya(d.playaId))
      + kv('Fecha de varamiento', U.formatFecha(d.fechaVaramiento))
      + kv('Número de tortuga del día', U.formatNumeroDia(d.numeroTortugaDia))
    ));

    html += bloque('Ubicación de varamiento', grid(
      kv('Latitud', d.latitud) + kv('Longitud', d.longitud)
    ) + (d.descripcionUbicacion ? '<p class="detail-text">' + esc(d.descripcionUbicacion) + '</p>' : ''));

    html += bloque('Especie y condición', grid(
      kv('Especie', nombreEspecie(d.especieCodigo))
      + kv('Condición', C.etiqueta('condicion', d.condicionCodigo))
      + kv('Condición física', C.etiquetas('condicionFisica', d.condicionFisica))
    ));

    var fotosTomadas = [];
    if(d.fotoDorsal){ fotosTomadas.push('Lado dorsal completo'); }
    if(d.fotoVentral){ fotosTomadas.push('Lado ventral completo'); }
    if(d.fotoHeridas){ fotosTomadas.push('Heridas o anormalidades'); }
    if(d.fotoMaterial){ fotosTomadas.push('Material hecho por el hombre'); }
    html += bloque('Fotografías, boca y necropsia', grid(
      kv('Fotografías tomadas', fotosTomadas)
      + kv('Boca revisada', siNo(d.bocaRevisada))
      + kv('Necropsia completada', siNo(d.necropsiaCompletada))
    ));

    html += bloque('Etiquetas', grid(
      kv('¿Etiquetas en aletas encontradas?', siNo(d.etiquetasAletaEncontradas))
      + kv('¿Posibles cicatrices por etiquetas?', siNo(d.cicatricesEtiqueta))
      + kv('Ubicación de cicatrices', C.etiquetas('cicatricesUbicaciones', d.cicatricesUbicaciones))
      + kv('¿Escaneo de PIT realizado?', siNo(d.pitEscaneado))
      + kv('¿Etiqueta viva encontrada?', siNo(d.etiquetaViva))
      + kv('Escudo y lado', d.etiquetaVivaDetalle)
      + kv('¿Equipo de rastreo encontrado?', siNo(d.equipoRastreo))
    ) + construirEtiquetas(d.etiquetas));

    html += bloque('Medidas', grid(
      kv('Largo curvo (muesca-punta)', medida(d.lccCm))
      + kv('Las medidas son', C.etiqueta('lccTipo', d.lccTipo))
      + kv('¿Cola más allá del caparazón?', C.etiqueta('colaExtendida', d.colaExtendida))
      + kv('Medidas de cola', [medida(d.colaMedida1Cm), medida(d.colaMedida2Cm)].filter(function(m){ return !!m; }))
    ));

    html += bloque('Material antropogénico', grid(
      kv('¿Material hecho por humano?', siNo(d.materialEncontrado))
      + kv('¿Se tomaron fotografías?', siNo(d.materialFotos))
      + kv('¿Algo unido a la cuerda?', siNo(d.cuerdaAlgoUnido))
    ) + construirHallazgos(d.hallazgos, 'material'));

    html += bloque('Heridas', grid(
      kv('¿Heridas externas evidentes?', siNo(d.heridasEncontradas))
      + kv('¿Se tomaron fotografías?', siNo(d.heridasFotos))
      + kv('¿Enredamiento asociado a material?', siNo(d.heridaEnredamientoAsociada))
    ) + construirHallazgos(d.hallazgos, 'herida'));

    html += bloque('Enfermedad, epibiontes y sanguijuelas', grid(
      kv('¿Señas de enfermedad o sanguijuelas?', siNo(d.enfermedadObservada))
      + kv('¿Se tomaron fotografías?', siNo(d.enfermedadFotos))
      + kv('Demacrada', siNo(d.demacrada))
      + kv('Epibiontes', siNo(d.epibiontes))
      + kv('Fibropapiloma', d.fibropapiloma ? 'Sí (' + C.etiqueta('fibropapilomaRango', d.fibropapilomaRango) + ')' : siNo(d.fibropapiloma))
      + kv('Lesiones en la piel', d.lesionesPiel ? 'Sí (' + C.etiqueta('lesionesPielArea', d.lesionesPielArea) + ')' : siNo(d.lesionesPiel))
      + kv('Sanguijuelas', d.sanguijuelas ? 'Sí (' + C.etiqueta('sanguijuelasCantidad', d.sanguijuelasCantidad) + ')' : siNo(d.sanguijuelas))
    ));

    html += bloque('Comentarios adicionales', '<p class="detail-text">' + esc(d.comentarios || 'Sin comentarios.') + '</p>');

    var fotos = d.fotos || [];
    html += bloque('Fotos', fotos.length
      ? '<div class="photo-picker" id="varamientoDrawerFotos">' + fotos.map(function(f, i){
          return '<div class="photo-item"><img alt="Foto ' + (i + 1) + ' del varamiento" data-foto-id="' + esc(f.id) + '"></div>';
        }).join('') + '</div>'
      : '<p class="hint">Sin fotos adjuntas.</p>');

    html += '<p class="hint detail-meta">Creado: ' + esc(U.formatFechaHora(d.creadoEn)) + (d.necropsiaId ? ' · Tiene necropsia registrada' : '') + '</p>';
    return html;
  }

  function cargarMiniaturas(varamientoId){
    if(!api || !api.obtenerArchivoFotoVaramiento) return;
    var imgs = document.querySelectorAll('#varamientoDrawerFotos img[data-foto-id]');
    Array.prototype.forEach.call(imgs, function(img){
      api.obtenerArchivoFotoVaramiento(varamientoId, img.dataset.fotoId).then(function(blob){
        var url = URL.createObjectURL(blob);
        urlsFotos.push(url);
        img.src = url;
      }).catch(function(){
        img.alt = 'No se pudo cargar la foto';
      });
    });
  }

  function abrirDetalle(id, origen){
    liberarFotos();
    drawer.abrir(origen);
    if(!api){ drawer.error('Varamiento', 'No se pudo conectar con la API.'); return; }
    api.obtenerVaramiento(id).then(function(d){
      drawer.mostrar('Varamiento ' + U.formatNumeroDia(d.numeroTortugaDia) + ' del ' + U.formatFecha(d.fechaVaramiento), construirDetalle(d));
      cargarMiniaturas(d.id || id);
    }).catch(function(err){
      drawer.error('Varamiento', 'No se pudo cargar el registro: ' + U.mensajeError(err));
    });
  }

  /* ---------------- Pestañas ---------------- */

  var listaIniciada = false;

  U.crearSubvistas(
    { nuevo: document.getElementById('tabVaramientoNuevo'), lista: document.getElementById('tabVaramientoLista') },
    { nuevo: document.getElementById('sub-varamiento-nuevo'), lista: document.getElementById('sub-varamiento-lista') },
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
  window.TortuTAM.varamientos = {
    refrescar: function(){ if(listaIniciada){ cargar(); } }
  };
})();
