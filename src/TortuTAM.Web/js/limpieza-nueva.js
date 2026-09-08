/*
  Logica del formulario "Nueva limpieza" (subvista #sub-limpieza-nueva,
  issue #13). Depende de js/api.js (window.TortuTAM.api) y js/catalogos.js
  (window.TortuTAM.catalogos), que deben cargarse antes.

  A diferencia de "Nueva ficha", aqui el GPS es siempre obligatorio (no solo
  cuando hay PIT), asi que se valida sin condicion antes de enviar.

  No hay modo de edicion: el contrato de la API solo define POST /api/limpiezas
  (crear). Al guardar con exito, si js/limpiezas.js ya expuso
  window.TortuTAM.limpiezas.refrescar (definido cuando la subvista de listado
  se activo al menos una vez), se llama para que el listado quede al dia sin
  acoplar ambos archivos directamente.
*/
(function(){
  var form = document.getElementById('limpiezaForm');
  if(!form) return;

  var api = window.TortuTAM && window.TortuTAM.api;
  var catalogos = window.TortuTAM && window.TortuTAM.catalogos;

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

  /* ---------------- Catalogos (playa, especie, uso de nido) ---------------- */

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
      ['l_playa','l_especie','l_uso_nido'].forEach(function(id){
        var select = document.getElementById(id);
        if(select){ select.innerHTML = '<option value="">No se pudo conectar con la API</option>'; select.disabled = true; }
      });
      return;
    }
    llenarSelect(document.getElementById('l_playa'), catalogos.getPlayas(), function(p){
      return { value: p.id, label: p.codigo + ' - ' + p.nombre };
    }, 'Selecciona una playa');

    llenarSelect(document.getElementById('l_especie'), catalogos.getEspecies(), function(e){
      return { value: e.codigo, label: e.nombreComun + ' (' + e.nombreCientifico + ')' };
    }, 'Selecciona una especie');

    llenarSelect(document.getElementById('l_uso_nido'), catalogos.getUsoNido(), function(u){
      return { value: u.codigo, label: u.descripcion };
    }, '—');
  }

  /* ---------------- Tabla de conteo (categorias desde la API) ---------------- */

  var conteoTableBody = document.getElementById('conteoTableBody');
  var categoriasCargadas = [];

  var ETIQUETAS_CAMPO = {
    normales: 'Normales',
    albina: 'Albina',
    deforme: 'Deforme',
    albinasDeformes: 'Albinas y deformes',
    total: 'Total'
  };

  function crearInputConteo(cat, campo){
    var input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.step = '1';
    input.inputMode = 'numeric';
    input.dataset.field = campo;
    input.className = 'conteo-input';
    input.setAttribute('aria-label', (cat.descripcion || cat.codigo) + ' - ' + ETIQUETAS_CAMPO[campo]);
    return input;
  }

  function wireAutoTotal(tr){
    var totalInput = tr.querySelector('input[data-field="total"]');
    var sumInputs = Array.prototype.slice.call(
      tr.querySelectorAll('input[data-field="normales"], input[data-field="albina"], input[data-field="deforme"], input[data-field="albinasDeformes"]')
    );
    if(!totalInput || !sumInputs.length) return;

    totalInput.addEventListener('input', function(){
      totalInput.dataset.manual = totalInput.value === '' ? '' : '1';
    });

    sumInputs.forEach(function(input){
      input.addEventListener('input', function(){
        if(totalInput.dataset.manual === '1') return;
        var algunoConValor = false;
        var suma = sumInputs.reduce(function(acc, i){
          if(i.value !== ''){ algunoConValor = true; }
          var n = Number(i.value);
          return acc + (i.value !== '' && !isNaN(n) ? n : 0);
        }, 0);
        totalInput.value = algunoConValor ? String(suma) : '';
      });
    });
  }

  function construirFilaConteo(cat){
    var tr = document.createElement('tr');
    tr.dataset.categoria = cat.codigo;

    var tdNombre = document.createElement('td');
    tdNombre.className = 'cat-name';
    var span = document.createElement('span');
    span.textContent = cat.descripcion || cat.codigo;
    tdNombre.appendChild(span);
    if(cat.soloTotal){
      var nota = document.createElement('span');
      nota.className = 'cat-note';
      nota.textContent = 'Solo total';
      tdNombre.appendChild(nota);
    }
    tr.appendChild(tdNombre);

    ['normales', 'albina', 'deforme', 'albinasDeformes'].forEach(function(campo){
      var td = document.createElement('td');
      if(cat.soloTotal){
        td.className = 'cell-na';
        td.innerHTML = '<span class="sr-only">No aplica</span><span aria-hidden="true">—</span>';
      }else{
        td.appendChild(crearInputConteo(cat, campo));
      }
      tr.appendChild(td);
    });

    var tdTotal = document.createElement('td');
    tdTotal.appendChild(crearInputConteo(cat, 'total'));
    tr.appendChild(tdTotal);

    wireAutoTotal(tr);
    return tr;
  }

  function renderConteoTabla(categorias){
    categoriasCargadas = categorias || [];
    conteoTableBody.innerHTML = '';
    if(!categoriasCargadas.length){
      var tr = document.createElement('tr');
      var td = document.createElement('td');
      td.colSpan = 6;
      td.className = 'cell-na';
      td.textContent = 'No se pudieron cargar las categorias de conteo.';
      tr.appendChild(td);
      conteoTableBody.appendChild(tr);
      return;
    }
    categoriasCargadas.forEach(function(cat){
      conteoTableBody.appendChild(construirFilaConteo(cat));
    });
  }

  function cargarCategoriasConteo(){
    if(!catalogos){
      renderConteoTabla([]);
      return;
    }
    catalogos.getCategoriasConteo().then(function(categorias){
      renderConteoTabla(categorias);
    }).catch(function(){
      renderConteoTabla([]);
    });
  }

  function buildConteos(){
    var filas = Array.prototype.slice.call(conteoTableBody.querySelectorAll('tr[data-categoria]'));
    return filas.map(function(tr){
      function campo(nombre){
        var input = tr.querySelector('input[data-field="' + nombre + '"]');
        return input ? numOrNull(input.value) : null;
      }
      return {
        categoriaCodigo: tr.dataset.categoria,
        normales: campo('normales'),
        albina: campo('albina'),
        deforme: campo('deforme'),
        albinasDeformes: campo('albinasDeformes'),
        total: campo('total')
      };
    });
  }

  function resetConteoManualFlags(){
    Array.prototype.forEach.call(conteoTableBody.querySelectorAll('input[data-field="total"]'), function(input){
      input.dataset.manual = '';
    });
  }

  /* ---------------- Condiciones del nido (chips Si/No) ---------------- */

  var chipGroups = Array.prototype.slice.call(form.querySelectorAll('.chip-toggle'));

  function syncChipGroup(group, valor){
    Array.prototype.forEach.call(group.querySelectorAll('button'), function(btn){
      var activo = valor !== '' && btn.dataset.val === valor;
      btn.setAttribute('aria-pressed', activo ? 'true' : 'false');
    });
  }

  chipGroups.forEach(function(group){
    var hidden = document.getElementById(group.dataset.field);
    if(!hidden) return;
    group.addEventListener('click', function(evt){
      var btn = evt.target.closest('button');
      if(!btn || !group.contains(btn)) return;
      var nuevoValor = hidden.value === btn.dataset.val ? '' : btn.dataset.val;
      hidden.value = nuevoValor;
      syncChipGroup(group, nuevoValor);
    });
  });

  function resetChips(){
    chipGroups.forEach(function(group){
      var hidden = document.getElementById(group.dataset.field);
      if(!hidden) return;
      hidden.value = '';
      syncChipGroup(group, '');
    });
  }

  /* ---------------- Vinculo con la ficha de anidacion ---------------- */

  var numeroInput = document.getElementById('l_numero');
  var numeroHint = document.getElementById('l_numeroHint');
  var fichaIdInput = document.getElementById('l_ficha_id');

  function limpiarFichaEncontrada(){
    if(fichaIdInput){ fichaIdInput.value = ''; }
    if(numeroHint){ numeroHint.textContent = ''; numeroHint.className = 'hint'; }
  }

  if(numeroInput){
    numeroInput.addEventListener('input', limpiarFichaEncontrada);
    numeroInput.addEventListener('blur', function(){
      var numero = numeroInput.value.trim();
      limpiarFichaEncontrada();
      if(!numero || !api) return;
      api.listarFichas({ numeroFicha: numero, page: 1, pageSize: 5 }).then(function(resp){
        var elementos = (resp && resp.elementos) || [];
        var exacto = elementos.filter(function(f){ return f.numeroFicha === numero; });
        if(exacto.length === 1){
          if(fichaIdInput){ fichaIdInput.value = exacto[0].id; }
          if(numeroHint){ numeroHint.textContent = 'Ficha encontrada y vinculada.'; numeroHint.className = 'hint is-ok'; }
        }else if(elementos.length === 0){
          if(numeroHint){
            numeroHint.textContent = 'No se encontro una ficha con ese numero; se guardara solo con el numero capturado.';
            numeroHint.className = 'hint';
          }
        }
      }).catch(function(){
        /* sin conexion o error al buscar: no bloquea el guardado, solo queda sin vincular */
      });
    });
  }

  /* ---------------- Geolocalizacion (siempre obligatoria) ---------------- */

  var geoStatus = document.getElementById('l_geoStatus');
  var locateBtn = document.getElementById('l_locateBtn');
  var latInput = document.getElementById('l_lat');
  var lngInput = document.getElementById('l_lng');
  var TEXTO_GEO_DEFECTO = 'Toca el boton parado junto al nido, o captura las coordenadas manualmente.';

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
        clearFieldError('l_lat');
        clearFieldError('l_lng');
        setGeoStatus('Ubicacion capturada (precision aprox. ' + Math.round(pos.coords.accuracy) + ' m).', 'ok');
      }, function(err){
        locateBtn.disabled = false;
        setGeoStatus('No se pudo obtener la ubicacion: ' + mensajeErrorGeo(err) + '. Captura las coordenadas manualmente.', 'error');
      }, { enableHighAccuracy: true, timeout: 10000 });
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

  function validar(){
    var errores = [];
    if(!val('l_numero')){ errores.push({ id: 'l_numero', mensaje: 'Ingresa el numero de ficha.' }); }
    if(!val('l_fecha_limpieza')){ errores.push({ id: 'l_fecha_limpieza', mensaje: 'Ingresa la fecha de limpieza.' }); }
    if(!val('l_lat')){ errores.push({ id: 'l_lat', mensaje: 'La latitud es obligatoria.' }); }
    if(!val('l_lng')){ errores.push({ id: 'l_lng', mensaje: 'La longitud es obligatoria.' }); }
    return errores;
  }

  /* ---------------- Construccion del payload ---------------- */

  function buildPayload(){
    return {
      numeroFicha: val('l_numero'),
      fichaAnidacionId: numOrNull(val('l_ficha_id')),
      playaId: numOrNull(val('l_playa')),
      corral: val('l_corral') || null,
      nido: val('l_nido') || null,
      fechaPrimeraEmergencia: val('l_fecha_emergencia') || null,
      fechaLimpieza: val('l_fecha_limpieza'),
      especieCodigo: val('l_especie') || null,
      usoNidoCodigo: numOrNull(val('l_uso_nido')),
      formulo: val('l_formulo') || null,
      latitud: numOrNull(val('l_lat')),
      longitud: numOrNull(val('l_lng')),
      hormigas: val('l_hormigas') || null,
      raices: val('l_raices') || null,
      larvas: val('l_larvas') || null,
      piedras: val('l_piedras') || null,
      huellas: val('l_huellas') || null,
      otros: val('l_otros') || null,
      otrosDetalle: val('l_otros_detalle') || null,
      conteos: buildConteos()
    };
  }

  /* ---------------- Estado de envio ---------------- */

  var statusBanner = document.getElementById('l_status');
  var submitBtn = document.getElementById('guardarLimpiezaBtn');

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

  /* ---------------- Reset ---------------- */

  function resetForm(){
    form.reset();
    limpiarFichaEncontrada();
    resetChips();
    resetConteoManualFlags();
    clearAllFieldErrors();
    setGeoStatus(TEXTO_GEO_DEFECTO);
  }

  var resetBtn = document.getElementById('resetLimpiezaBtn');
  if(resetBtn){
    resetBtn.addEventListener('click', function(){
      resetForm();
      clearStatus();
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
    setStatus('Guardando limpieza...', 'loading');
    toggleSubmitting(true);

    api.crearLimpieza(payload).then(function(){
      toggleSubmitting(false);
      setStatus('Limpieza de la ficha ' + payload.numeroFicha + ' guardada correctamente.', 'success');
      resetForm();
      if(window.TortuTAM && window.TortuTAM.limpiezas && window.TortuTAM.limpiezas.refrescar){
        window.TortuTAM.limpiezas.refrescar();
      }
    }).catch(function(err){
      toggleSubmitting(false);
      setStatus('No se pudo guardar la limpieza: ' + mensajeErrorGuardado(err), 'error');
    });
  });

  cargarCatalogos();
  cargarCategoriasConteo();
})();
