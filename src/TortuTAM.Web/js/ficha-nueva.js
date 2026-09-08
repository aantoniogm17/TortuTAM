/*
  Logica del formulario "Nueva ficha" (vista #view-nueva, issue #11) y del
  modo de edicion reutilizado por el listado de fichas (issue #12).

  Depende de js/api.js (window.TortuTAM.api) y js/catalogos.js
  (window.TortuTAM.catalogos), que deben cargarse antes.

  El listado de fichas no duplica este formulario: reubica el mismo
  elemento <form id="fichaForm"> dentro del drawer de detalle llamando a
  TortuTAM.fichaForm.editar(detalle, opciones), y lo regresa a su lugar en
  la vista "Nueva ficha" con TortuTAM.fichaForm.finalizarEdicion(). Asi
  la validacion, los catalogos, el selector de posicion, la geolocalizacion
  y el manejo de fotos se comparten sin repetir codigo ni marcado.

  Fuera de alcance aqui: la cola offline (guardar en IndexedDB/localStorage
  y reintentar al recuperar conexion) es del issue #15. Si el guardado
  falla, solo se muestra un error claro sin limpiar el formulario.
*/
(function(){
  var form = document.getElementById('fichaForm');
  if(!form) return;

  var api = window.TortuTAM && window.TortuTAM.api;
  var catalogos = window.TortuTAM && window.TortuTAM.catalogos;

  var formHomeParent = form.parentNode;
  var formHomeSiguiente = form.nextSibling;

  var modo = 'crear';
  var fichaEditandoId = null;
  var opcionesEdicion = null;

  var fotos = [];
  var fotoObjectUrls = [];

  function val(id){
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function numOrNull(str){
    if(str === null || str === undefined || str === ''){ return null; }
    var n = Number(str);
    return isNaN(n) ? null : n;
  }

  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, function(ch){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch];
    });
  }

  /* ---------------- Catalogos ---------------- */

  function llenarSelect(select, promesa, mapFn, textoVacio){
    if(!select || !promesa) return;
    select.disabled = true;
    select.innerHTML = '<option value="">Cargando...</option>';
    promesa.then(function(items){
      var opciones = '<option value="">' + escapeHtml(textoVacio) + '</option>';
      (items || []).forEach(function(item){
        var mapped = mapFn(item);
        opciones += '<option value="' + escapeHtml(mapped.value) + '">' + escapeHtml(mapped.label) + '</option>';
      });
      select.innerHTML = opciones;
      select.disabled = false;
    }).catch(function(){
      select.innerHTML = '<option value="">No se pudieron cargar las opciones</option>';
      select.disabled = false;
    });
  }

  function cargarCatalogos(){
    if(!catalogos){
      ['f_playa','f_especie','f_accion','f_uso_nido'].forEach(function(id){
        var select = document.getElementById(id);
        if(select){ select.innerHTML = '<option value="">No se pudo conectar con la API</option>'; select.disabled = true; }
      });
      return;
    }
    llenarSelect(document.getElementById('f_playa'), catalogos.getPlayas(), function(p){
      return { value: p.id, label: p.codigo + ' - ' + p.nombre };
    }, 'Selecciona una playa');

    llenarSelect(document.getElementById('f_especie'), catalogos.getEspecies(), function(e){
      return { value: e.codigo, label: e.nombreComun + ' (' + e.nombreCientifico + ')' };
    }, 'Selecciona una especie');

    llenarSelect(document.getElementById('f_accion'), catalogos.getAcciones(), function(a){
      return { value: a.codigo, label: a.descripcion };
    }, '—');

    llenarSelect(document.getElementById('f_uso_nido'), catalogos.getUsoNido(), function(u){
      return { value: u.codigo, label: u.descripcion };
    }, '—');
  }

  /* ---------------- Selector de posicion ---------------- */

  var posInput = document.getElementById('f_posicion');
  var posButtons = Array.prototype.slice.call(document.querySelectorAll('#posPicker .pos-card'));

  posButtons.forEach(function(btn){
    btn.addEventListener('click', function(){
      var yaActivo = btn.classList.contains('active');
      posButtons.forEach(function(b){
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      if(yaActivo){
        posInput.value = '';
      }else{
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        posInput.value = btn.dataset.pos;
      }
    });
  });

  function setPosicion(codigo){
    posButtons.forEach(function(b){
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    posInput.value = '';
    if(codigo === null || codigo === undefined || codigo === ''){ return; }
    var objetivo = posButtons.filter(function(b){ return b.dataset.pos === String(codigo); })[0];
    if(objetivo){
      objetivo.classList.add('active');
      objetivo.setAttribute('aria-pressed', 'true');
      posInput.value = String(codigo);
    }
  }

  /* ---------------- Geolocalizacion ---------------- */

  var geoStatus = document.getElementById('f_geoStatus');
  var locateBtn = document.getElementById('f_locateBtn');
  var latInput = document.getElementById('f_lat');
  var lngInput = document.getElementById('f_lng');

  function setGeoStatus(mensaje, tipo){
    geoStatus.textContent = mensaje;
    geoStatus.classList.remove('is-error', 'is-ok');
    if(tipo){ geoStatus.classList.add('is-' + tipo); }
  }

  function mensajeErrorGeo(err){
    if(!err) return 'error desconocido';
    if(err.code === 1) return 'permiso de ubicacion denegado';
    if(err.code === 2) return 'ubicacion no disponible';
    if(err.code === 3) return 'tiempo de espera agotado';
    return err.message || 'error desconocido';
  }

  if(locateBtn){
    locateBtn.addEventListener('click', function(){
      if(!navigator.geolocation){
        setGeoStatus('Este dispositivo no soporta geolocalizacion. Captura las coordenadas manualmente.', 'error');
        return;
      }
      setGeoStatus('Obteniendo ubicacion...');
      locateBtn.disabled = true;
      navigator.geolocation.getCurrentPosition(function(pos){
        locateBtn.disabled = false;
        latInput.value = pos.coords.latitude.toFixed(6);
        lngInput.value = pos.coords.longitude.toFixed(6);
        clearFieldError('f_lat');
        clearFieldError('f_lng');
        setGeoStatus('Ubicacion capturada (precision aprox. ' + Math.round(pos.coords.accuracy) + ' m).', 'ok');
      }, function(err){
        locateBtn.disabled = false;
        setGeoStatus('No se pudo obtener la ubicacion: ' + mensajeErrorGeo(err) + '. Captura las coordenadas manualmente.', 'error');
      }, { enableHighAccuracy: true, timeout: 10000 });
    });
  }

  /* ---------------- Fotos ---------------- */

  var fotoInput = document.getElementById('f_fotos');
  var fotoPreview = document.getElementById('fotoPreview');

  function iconoFotoVacia(){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">' +
      '<rect x="3" y="6" width="18" height="14" rx="1.5"/><path d="M8 6l1.6-2.4h4.8L16 6"/><circle cx="12" cy="13" r="3.6"/>' +
      '</svg>';
  }

  function liberarObjectUrls(){
    fotoObjectUrls.forEach(function(url){ URL.revokeObjectURL(url); });
    fotoObjectUrls = [];
  }

  function renderFotos(){
    liberarObjectUrls();
    fotoPreview.innerHTML = '';

    if(!fotos.length){
      var vacio = document.createElement('p');
      vacio.className = 'photo-empty';
      vacio.id = 'fotoEmpty';
      vacio.innerHTML = iconoFotoVacia() + '<span>Aun no se han agregado fotos.</span>';
      fotoPreview.appendChild(vacio);
      return;
    }

    fotos.forEach(function(file, index){
      var url = URL.createObjectURL(file);
      fotoObjectUrls.push(url);

      var item = document.createElement('div');
      item.className = 'photo-item';

      var img = document.createElement('img');
      img.src = url;
      img.alt = 'Vista previa de foto ' + (index + 1);
      item.appendChild(img);

      var quitarBtn = document.createElement('button');
      quitarBtn.type = 'button';
      quitarBtn.className = 'btn ghost';
      quitarBtn.textContent = 'Quitar';
      quitarBtn.addEventListener('click', function(){
        fotos.splice(index, 1);
        renderFotos();
      });
      item.appendChild(quitarBtn);

      fotoPreview.appendChild(item);
    });
  }

  if(fotoInput){
    fotoInput.addEventListener('change', function(){
      Array.prototype.forEach.call(fotoInput.files, function(file){
        fotos.push(file);
      });
      fotoInput.value = '';
      renderFotos();
    });
  }

  /* ---------------- Validacion ---------------- */

  var camposConError = {};

  function showFieldError(id, mensaje){
    var el = document.getElementById(id);
    if(!el) return;
    var campo = el.closest('.field');
    if(campo){ campo.classList.add('has-error'); }
    el.setAttribute('aria-invalid', 'true');
    var errorEl = document.getElementById('err_' + id);
    if(errorEl){ errorEl.textContent = mensaje; }
    camposConError[id] = true;
  }

  function clearFieldError(id){
    var el = document.getElementById(id);
    if(!el) return;
    var campo = el.closest('.field');
    if(campo){ campo.classList.remove('has-error'); }
    el.removeAttribute('aria-invalid');
    var errorEl = document.getElementById('err_' + id);
    if(errorEl){ errorEl.textContent = ''; }
    delete camposConError[id];
  }

  function clearAllFieldErrors(){
    Object.keys(camposConError).forEach(clearFieldError);
  }

  function tienePit(){
    return !!(val('f_izq_pit') || val('f_der_pit'));
  }

  function validar(){
    var errores = [];

    if(!val('f_numero')){ errores.push({ id: 'f_numero', mensaje: 'Ingresa el numero de ficha.' }); }
    if(!val('f_fecha')){ errores.push({ id: 'f_fecha', mensaje: 'Ingresa la fecha.' }); }
    if(!val('f_playa')){ errores.push({ id: 'f_playa', mensaje: 'Selecciona la playa.' }); }

    if(tienePit()){
      if(!val('f_lat')){ errores.push({ id: 'f_lat', mensaje: 'La latitud es obligatoria cuando se captura un PIT.' }); }
      if(!val('f_lng')){ errores.push({ id: 'f_lng', mensaje: 'La longitud es obligatoria cuando se captura un PIT.' }); }
    }

    return errores;
  }

  /* ---------------- Construccion del payload ---------------- */

  function buildMarca(prefijo, aleta){
    var pit = val('f_' + prefijo + '_pit');
    var marca = val('f_' + prefijo + '_marca');
    var leyenda = val('f_' + prefijo + '_leyenda');
    var nuevaORecap = val('f_' + prefijo + '_nueva_recap');
    var cicatrizInput = document.querySelector('input[name="' + prefijo + '_cicatriz"]:checked');
    var cicatriz = !!cicatrizInput && cicatrizInput.value === 'si';

    if(!pit && !marca && !leyenda && !nuevaORecap && !cicatriz){ return null; }

    return {
      aleta: aleta,
      pit: pit || null,
      numeroMarca: marca || null,
      leyenda: leyenda || null,
      nuevaORecap: nuevaORecap || null,
      cicatrizMarca: cicatriz,
      verifico: false
    };
  }

  function buildMarcas(){
    var marcas = [];
    var izquierda = buildMarca('izq', 'izquierda');
    var derecha = buildMarca('der', 'derecha');
    if(izquierda){ marcas.push(izquierda); }
    if(derecha){ marcas.push(derecha); }
    return marcas;
  }

  function buildPayload(){
    var payload = {
      numeroFicha: val('f_numero'),
      playaId: numOrNull(val('f_playa')),
      estaca: val('f_estaca') || null,
      zona: val('f_zona') || null,
      fecha: val('f_fecha'),
      especieCodigo: val('f_especie') || null,
      formulo: val('f_formulo') || null,

      accionCodigo: numOrNull(val('f_accion')),
      horaA: val('f_hora_a') || null,
      horaBColecta: val('f_hora_b') || null,
      horaCSiembra: val('f_hora_c') || null,
      usoNidoCodigo: numOrNull(val('f_uso_nido')),
      corral: val('f_corral') || null,
      numeroNido: val('f_numero_nido') || null,

      huevosColectados: numOrNull(val('f_huevos_colectados')),
      huevosRotos: numOrNull(val('f_huevos_rotos')),
      posicionCodigo: numOrNull(posInput.value),

      latitud: numOrNull(val('f_lat')),
      longitud: numOrNull(val('f_lng')),

      observaciones: val('f_observaciones') || null,
      tumoresPresentes: document.getElementById('f_tumores').checked,
      bioMuescaPuntaLargaCm: numOrNull(val('f_bio_mp')),
      bioPuntaMuescaCm: numOrNull(val('f_bio_pm')),
      bioMuescaMuescaCm: numOrNull(val('f_bio_mm')),
      bioAnchoCm: numOrNull(val('f_bio_ancho')),

      marcas: buildMarcas()
    };

    var sexo = val('f_sexo');
    if(sexo){ payload.sexo = sexo; }

    return payload;
  }

  /* ---------------- Estado de envio ---------------- */

  var statusBanner = document.getElementById('fichaStatus');
  var submitBtn = document.getElementById('guardarFichaBtn');

  function setStatus(mensaje, tipo){
    statusBanner.className = 'status-banner is-visible is-' + tipo;
    statusBanner.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
    var spinner = tipo === 'loading' ? '<svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="9" opacity="0.25"/><path d="M21 12a9 9 0 0 0-9-9"/></svg>' : '';
    statusBanner.innerHTML = spinner + '<span>' + escapeHtml(mensaje) + '</span>';
  }

  function clearStatus(){
    statusBanner.className = 'status-banner';
    statusBanner.innerHTML = '';
  }

  function toggleSubmitting(activo){
    submitBtn.disabled = activo;
  }

  function mensajeErrorGuardado(err){
    if(err && err.status){
      return err.message || ('el servidor respondio con un error (' + err.status + ').');
    }
    return 'no se pudo guardar, sin conexion o el servidor no respondio.';
  }

  function subirFotosSiHay(ficha){
    if(!fotos.length){ return Promise.resolve({ fallidas: 0 }); }
    var fichaId = ficha && ficha.id;
    if(!fichaId){ return Promise.resolve({ fallidas: fotos.length }); }

    var tareas = fotos.map(function(file){
      return api.subirFoto(fichaId, file).then(function(){ return true; }).catch(function(){ return false; });
    });

    return Promise.all(tareas).then(function(resultados){
      var fallidas = resultados.filter(function(ok){ return !ok; }).length;
      return { fallidas: fallidas };
    });
  }

  /* ---------------- Reset ---------------- */

  function resetForm(){
    form.reset();
    posButtons.forEach(function(b){
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    posInput.value = '';
    fotos = [];
    renderFotos();
    clearAllFieldErrors();
  }

  var resetBtn = document.getElementById('resetFormBtn');

  /* ---------------- Modo edicion (reutilizado por el listado de fichas) ---------------- */

  function populateMarca(prefijo, marca){
    document.getElementById('f_' + prefijo + '_pit').value = (marca && marca.pit) || '';
    document.getElementById('f_' + prefijo + '_marca').value = (marca && marca.numeroMarca) || '';
    document.getElementById('f_' + prefijo + '_leyenda').value = (marca && marca.leyenda) || '';
    document.getElementById('f_' + prefijo + '_nueva_recap').value = (marca && marca.nuevaORecap) || '';
    var esCicatriz = !!(marca && marca.cicatrizMarca);
    var radios = document.querySelectorAll('input[name="' + prefijo + '_cicatriz"]');
    Array.prototype.forEach.call(radios, function(radio){
      radio.checked = (radio.value === (esCicatriz ? 'si' : 'no'));
    });
  }

  function populateForm(detalle){
    document.getElementById('f_numero').value = detalle.numeroFicha || '';
    document.getElementById('f_playa').value = detalle.playaId !== null && detalle.playaId !== undefined ? String(detalle.playaId) : '';
    document.getElementById('f_estaca').value = detalle.estaca || '';
    document.getElementById('f_zona').value = detalle.zona || '';
    document.getElementById('f_fecha').value = detalle.fecha ? String(detalle.fecha).substring(0, 10) : '';
    document.getElementById('f_especie').value = detalle.especieCodigo || '';
    document.getElementById('f_sexo').value = detalle.sexo || '';
    document.getElementById('f_formulo').value = detalle.formulo || '';

    document.getElementById('f_lat').value = detalle.latitud !== null && detalle.latitud !== undefined ? detalle.latitud : '';
    document.getElementById('f_lng').value = detalle.longitud !== null && detalle.longitud !== undefined ? detalle.longitud : '';

    document.getElementById('f_accion').value = detalle.accionCodigo !== null && detalle.accionCodigo !== undefined ? String(detalle.accionCodigo) : '';
    document.getElementById('f_uso_nido').value = detalle.usoNidoCodigo !== null && detalle.usoNidoCodigo !== undefined ? String(detalle.usoNidoCodigo) : '';
    document.getElementById('f_corral').value = detalle.corral || '';
    document.getElementById('f_numero_nido').value = detalle.numeroNido || '';
    document.getElementById('f_hora_a').value = detalle.horaA || '';
    document.getElementById('f_hora_b').value = detalle.horaBColecta || '';
    document.getElementById('f_hora_c').value = detalle.horaCSiembra || '';

    document.getElementById('f_huevos_colectados').value = detalle.huevosColectados !== null && detalle.huevosColectados !== undefined ? detalle.huevosColectados : '';
    document.getElementById('f_huevos_rotos').value = detalle.huevosRotos !== null && detalle.huevosRotos !== undefined ? detalle.huevosRotos : '';
    setPosicion(detalle.posicionCodigo);

    var marcas = detalle.marcas || [];
    populateMarca('izq', marcas.filter(function(m){ return m.aleta === 'izquierda'; })[0]);
    populateMarca('der', marcas.filter(function(m){ return m.aleta === 'derecha'; })[0]);

    document.getElementById('f_bio_mp').value = detalle.bioMuescaPuntaLargaCm !== null && detalle.bioMuescaPuntaLargaCm !== undefined ? detalle.bioMuescaPuntaLargaCm : '';
    document.getElementById('f_bio_pm').value = detalle.bioPuntaMuescaCm !== null && detalle.bioPuntaMuescaCm !== undefined ? detalle.bioPuntaMuescaCm : '';
    document.getElementById('f_bio_mm').value = detalle.bioMuescaMuescaCm !== null && detalle.bioMuescaMuescaCm !== undefined ? detalle.bioMuescaMuescaCm : '';
    document.getElementById('f_bio_ancho').value = detalle.bioAnchoCm !== null && detalle.bioAnchoCm !== undefined ? detalle.bioAnchoCm : '';
    document.getElementById('f_tumores').checked = !!detalle.tumoresPresentes;

    document.getElementById('f_observaciones').value = detalle.observaciones || '';

    fotos = [];
    renderFotos();
    clearAllFieldErrors();
    clearStatus();
    setGeoStatus('Coordenadas cargadas de la ficha. Actualizalas si es necesario.');
  }

  function finalizarEdicion(){
    modo = 'crear';
    fichaEditandoId = null;
    opcionesEdicion = null;
    submitBtn.textContent = 'Guardar ficha';
    resetBtn.textContent = 'Limpiar';
    formHomeParent.insertBefore(form, formHomeSiguiente);
    clearStatus();
  }

  function cancelarEdicion(){
    var alCancelar = opcionesEdicion && opcionesEdicion.onCancelar;
    finalizarEdicion();
    if(alCancelar){ alCancelar(); }
  }

  function editar(detalle, opciones){
    opciones = opciones || {};
    modo = 'editar';
    fichaEditandoId = detalle.id;
    opcionesEdicion = opciones;
    populateForm(detalle);
    if(opciones.contenedor){
      opciones.contenedor.appendChild(form);
    }
    submitBtn.textContent = 'Guardar cambios';
    resetBtn.textContent = 'Cancelar edicion';
  }

  if(resetBtn){
    resetBtn.addEventListener('click', function(){
      if(modo === 'editar'){
        cancelarEdicion();
      }else{
        resetForm();
        clearStatus();
      }
    });
  }

  /* ---------------- Envio ---------------- */

  form.addEventListener('submit', function(evt){
    evt.preventDefault();

    if(!api){
      setStatus('No se pudo conectar con la API. Revisa la configuracion antes de guardar.', 'error');
      return;
    }

    clearAllFieldErrors();
    var errores = validar();
    if(errores.length){
      errores.forEach(function(e){ showFieldError(e.id, e.mensaje); });
      var primero = document.getElementById(errores[0].id);
      if(primero){ primero.focus(); }
      setStatus('Revisa los campos marcados antes de guardar.', 'error');
      return;
    }

    var payload = buildPayload();
    var esEdicion = modo === 'editar';
    var idEnEdicion = fichaEditandoId;
    var callbackGuardado = opcionesEdicion && opcionesEdicion.onGuardado;

    setStatus(esEdicion ? 'Guardando cambios...' : 'Guardando ficha...', 'loading');
    toggleSubmitting(true);

    var promesaGuardado = esEdicion ? api.actualizarFicha(idEnEdicion, payload) : api.crearFicha(payload);

    promesaGuardado.then(function(ficha){
      var idParaFotos = esEdicion ? idEnEdicion : (ficha && ficha.id);
      return subirFotosSiHay({ id: idParaFotos }).then(function(resultadoFotos){
        toggleSubmitting(false);
        if(resultadoFotos.fallidas > 0){
          setStatus((esEdicion ? 'Ficha actualizada' : 'Ficha ' + payload.numeroFicha + ' guardada') + ', pero ' + resultadoFotos.fallidas + ' foto(s) no se pudieron subir. Intenta agregarlas de nuevo mas adelante.', 'warning');
        }else{
          setStatus(esEdicion ? 'Ficha actualizada correctamente.' : 'Ficha ' + payload.numeroFicha + ' guardada correctamente.', 'success');
          if(!esEdicion){ resetForm(); }
        }
        if(esEdicion && callbackGuardado){
          callbackGuardado({ id: idEnEdicion, numeroFicha: payload.numeroFicha });
        }
      });
    }).catch(function(err){
      toggleSubmitting(false);
      setStatus((esEdicion ? 'No se pudo guardar los cambios: ' : 'No se pudo guardar la ficha: ') + mensajeErrorGuardado(err), 'error');
    });
  });

  cargarCatalogos();
  renderFotos();

  window.TortuTAM = window.TortuTAM || {};
  window.TortuTAM.fichaForm = {
    editar: editar,
    finalizarEdicion: finalizarEdicion
  };
})();
