/*
  Formulario "Nuevo varamiento" (subvista #sub-varamiento-nuevo). Sigue el
  orden de la ficha NOAA de varamientos (lado 1 y lado 2). Depende de
  js/api.js, js/catalogos.js, js/form-utils.js y js/codigos-campo.js.

  - GPS siempre obligatorio, igual que en Limpieza.
  - Las preguntas SI/NO son tri-estado (Sí / No / sin contestar) y se
    mandan como true / false / null. Los subcampos de una pregunta solo se
    muestran y se envian cuando la respuesta es Sí.
  - Material antropogenico y heridas se envian como "hallazgos": un
    elemento por cada tipo contestado con Sí, con sus ubicaciones en el
    cuerpo y un detalle opcional.
  - Cola offline: si el POST falla por falta de conexion, el varamiento se
    encola como tipo 'varamiento' (con Idempotency-Key y fotos), igual que
    las fichas de anidacion.
*/
(function(){
  var form = document.getElementById('varamientoForm');
  if(!form) return;

  var T = window.TortuTAM || {};
  var api = T.api;
  var catalogos = T.catalogos;
  var U = T.formUtils;
  var C = T.codigosCampo;
  if(!U || !C) return;

  var val = U.val;
  var numOrNull = U.numOrNull;
  var esc = U.escapeHtml;

  var MAX_ETIQUETAS = { aleta: 3, pit: 2 };
  var NOMBRE_ETIQUETA = { aleta: 'Etiqueta de aleta', pit: 'PIT' };

  var validador = U.crearValidador();
  var banner = U.crearBanner(document.getElementById('v_status'));
  var submitBtn = document.getElementById('guardarVaramientoBtn');

  /* ---------------- Material antropogenico y heridas ---------------- */

  function extrasHallazgo(categoria, codigo){
    if(categoria === 'material' && codigo === 'cuerda'){
      return '<div class="pregunta" data-sino="v_cuerda_algo_unido"><span class="pregunta-texto">¿Tenía algo unido a la cuerda? (ej. flotador, trampa de jaiba)</span></div>';
    }
    if(categoria === 'herida' && codigo === 'enredamiento'){
      return '<div class="pregunta" data-sino="v_herida_enredamiento_asociada"><span class="pregunta-texto">¿Está asociado con material notado arriba?</span></div>';
    }
    return '';
  }

  function etiquetaDetalle(categoria, codigo){
    if(categoria === 'material' && codigo === 'cuerda'){ return 'Si tenía algo unido, describe lo que estaba unido'; }
    if(categoria === 'material' && codigo === 'otro'){ return 'Describe el material'; }
    if(categoria === 'herida' && codigo === 'otro'){ return 'Favor de describir'; }
    return 'Detalle (opcional)';
  }

  function renderHallazgos(contenedor, categoria, definiciones){
    if(!contenedor) return;
    var html = '';
    definiciones.forEach(function(def){
      var base = 'h_' + categoria + '_' + def.codigo;
      html += '<div class="hallazgo" data-categoria="' + esc(categoria) + '" data-tipo="' + esc(def.codigo) + '">'
        + '<div class="pregunta" data-sino="' + base + '"><span class="pregunta-texto">' + esc(def.pregunta) + '</span></div>'
        + '<div class="cond-block" data-cuando="' + base + ':S" hidden>'
        + extrasHallazgo(categoria, def.codigo)
        + '<fieldset class="field"><legend>' + esc(def.donde) + '</legend>'
        + '<div class="chip-set" data-opciones="ubicacionesCuerpo" data-name="' + base + '_ubic" data-tipo="checkbox"></div></fieldset>'
        + '<div class="field"><label for="' + base + '_detalle">' + esc(etiquetaDetalle(categoria, def.codigo)) + '</label>'
        + '<input type="text" id="' + base + '_detalle" name="' + base + '_detalle" maxlength="500"></div>'
        + '</div></div>';
    });
    contenedor.innerHTML = html;
  }

  renderHallazgos(document.getElementById('v_materiales'), 'material', C.materiales);
  renderHallazgos(document.getElementById('v_heridas_lista'), 'herida', C.heridas);

  U.iniciarChipSets(form, C);
  U.iniciarSiNo(form);
  U.conectarFormulario(form);

  /* ---------------- Catalogos: campamento y especie ---------------- */

  var especieOpciones = document.getElementById('v_especieOpciones');

  function renderEspecies(items){
    var lista = (items || []).slice().sort(function(a, b){
      return (a.codigo === 'ni' ? 1 : 0) - (b.codigo === 'ni' ? 1 : 0);
    });
    if(!lista.length){
      especieOpciones.innerHTML = '<span class="hint">No hay especies en el catálogo.</span>';
      return;
    }
    especieOpciones.innerHTML = lista.map(function(e){
      return '<label class="chip"><input type="radio" name="v_especie_codigo" value="' + esc(e.codigo) + '"><span>' + esc(U.etiquetaEspecie(e)) + '</span></label>';
    }).join('');
  }

  function cargarCatalogos(){
    if(!catalogos){
      var playa = document.getElementById('v_playa');
      if(playa){ playa.innerHTML = '<option value="">No se pudo conectar con la API</option>'; playa.disabled = true; }
      especieOpciones.innerHTML = '<span class="hint">No se pudo conectar con la API.</span>';
      return;
    }
    U.llenarSelect(document.getElementById('v_playa'), catalogos.getPlayas(), function(p){
      return { value: p.id, label: p.nombre };
    }, 'Selecciona un campamento');

    catalogos.getEspecies().then(renderEspecies).catch(function(){
      especieOpciones.innerHTML = '<span class="hint">No se pudieron cargar las especies. Revisa la conexión y recarga la página.</span>';
    });
  }

  /* ---------------- Etiquetas dinamicas (aleta / PIT) ---------------- */

  var contadorEtiquetas = 0;

  function listaEtiquetas(tipo){ return document.getElementById('v_lista_' + tipo); }
  function botonAgregar(tipo){ return document.getElementById('v_agregar_' + tipo); }

  function renumerarEtiquetas(tipo){
    var filas = Array.prototype.slice.call(listaEtiquetas(tipo).querySelectorAll('.etiqueta-row'));
    filas.forEach(function(fila, i){
      var n = i + 1;
      fila.querySelector('.etiqueta-num-label').textContent = NOMBRE_ETIQUETA[tipo] + ' ' + n + ' · número';
      fila.querySelector('.etiqueta-quitar').setAttribute('aria-label', 'Quitar ' + NOMBRE_ETIQUETA[tipo].toLowerCase() + ' ' + n);
    });
    var boton = botonAgregar(tipo);
    if(boton){ boton.disabled = filas.length >= MAX_ETIQUETAS[tipo]; }
  }

  function agregarEtiqueta(tipo, enfocar){
    var lista = listaEtiquetas(tipo);
    if(!lista || lista.querySelectorAll('.etiqueta-row').length >= MAX_ETIQUETAS[tipo]) return;
    contadorEtiquetas += 1;
    var id = 'v_et_' + tipo + '_' + contadorEtiquetas;
    var fila = document.createElement('div');
    fila.className = 'etiqueta-row';
    fila.dataset.tipo = tipo;
    fila.innerHTML = '<div class="field"><label class="etiqueta-num-label" for="' + id + '_num"></label>'
      + '<input type="text" id="' + id + '_num" class="etiqueta-numero" maxlength="50" autocomplete="off"></div>'
      + '<div class="field"><label for="' + id + '_ubic">Ubicación</label>'
      + '<input type="text" id="' + id + '_ubic" class="etiqueta-ubicacion" maxlength="100" placeholder="Aleta delantera izquierda"></div>'
      + '<button type="button" class="btn ghost small etiqueta-quitar">Quitar</button>';
    fila.querySelector('.etiqueta-quitar').addEventListener('click', function(){
      fila.parentNode.removeChild(fila);
      renumerarEtiquetas(tipo);
      var boton = botonAgregar(tipo);
      if(boton){ boton.focus(); }
    });
    lista.appendChild(fila);
    renumerarEtiquetas(tipo);
    if(enfocar){ fila.querySelector('.etiqueta-numero').focus(); }
  }

  function reiniciarEtiquetas(){
    ['aleta', 'pit'].forEach(function(tipo){
      var lista = listaEtiquetas(tipo);
      if(lista){ lista.innerHTML = ''; }
      agregarEtiqueta(tipo, false);
    });
  }

  ['aleta', 'pit'].forEach(function(tipo){
    var boton = botonAgregar(tipo);
    if(boton){ boton.addEventListener('click', function(){ agregarEtiqueta(tipo, true); }); }
  });

  /* ---------------- GPS y fotos ---------------- */

  var TEXTO_GEO = 'Toca el botón parado junto a la tortuga, o captura las coordenadas manualmente.';
  var gps = U.conectarGps({
    boton: document.getElementById('v_locateBtn'),
    lat: document.getElementById('v_lat'),
    lng: document.getElementById('v_lng'),
    estado: document.getElementById('v_geoStatus'),
    validador: validador,
    textoInicial: TEXTO_GEO
  });

  var fotos = U.crearSelectorFotos(document.getElementById('v_fotos'), document.getElementById('v_fotoPreview'));

  /* ---------------- Validacion ---------------- */

  function validarNoNegativo(id, errores){
    var texto = val(id);
    if(texto === ''){ return; }
    var n = Number(texto);
    if(isNaN(n) || n < 0){ errores.push({ id: id, mensaje: 'Debe ser un número mayor o igual a 0.' }); }
  }

  function validar(){
    var errores = [];
    if(!val('v_observador')){ errores.push({ id: 'v_observador', mensaje: 'Ingresa el nombre del observador.' }); }
    if(!val('v_fecha')){ errores.push({ id: 'v_fecha', mensaje: 'Ingresa la fecha de varamiento.' }); }

    var numero = val('v_numero_dia');
    var n = Number(numero);
    if(!numero){
      errores.push({ id: 'v_numero_dia', mensaje: 'Ingresa el número de tortuga del día.' });
    }else if(isNaN(n) || n < 1 || n > 999 || Math.floor(n) !== n){
      errores.push({ id: 'v_numero_dia', mensaje: 'Debe ser un número entero entre 1 y 999.' });
    }

    var lat = val('v_lat');
    var lng = val('v_lng');
    if(!lat){ errores.push({ id: 'v_lat', mensaje: 'La latitud es obligatoria.' }); }
    else if(isNaN(Number(lat)) || Math.abs(Number(lat)) > 90){ errores.push({ id: 'v_lat', mensaje: 'La latitud debe estar entre -90 y 90.' }); }
    if(!lng){ errores.push({ id: 'v_lng', mensaje: 'La longitud es obligatoria.' }); }
    else if(isNaN(Number(lng)) || Math.abs(Number(lng)) > 180){ errores.push({ id: 'v_lng', mensaje: 'La longitud debe estar entre -180 y 180.' }); }

    if(!U.leerRadio(form, 'v_especie_codigo')){ errores.push({ id: 'v_especie', mensaje: 'Selecciona la especie (o No identificada).' }); }
    if(!U.leerRadio(form, 'v_condicion_codigo')){ errores.push({ id: 'v_condicion', mensaje: 'Selecciona la condición.' }); }

    validarNoNegativo('v_lcc', errores);
    if(U.leerRadio(form, 'v_cola') === 'si'){
      validarNoNegativo('v_cola_m1', errores);
      validarNoNegativo('v_cola_m2', errores);
    }
    return errores;
  }

  /* ---------------- Construccion del payload ---------------- */

  function tri(nombre){ return U.leerSiNo(form, nombre); }
  function esSi(nombre){ return tri(nombre) === true; }
  function marcado(id){
    var el = document.getElementById(id);
    return !!(el && el.checked);
  }

  function buildEtiquetas(){
    var etiquetas = [];
    [['aleta', 'v_etiquetas_aleta'], ['pit', 'v_pit']].forEach(function(par){
      if(!esSi(par[1])) return;
      Array.prototype.forEach.call(listaEtiquetas(par[0]).querySelectorAll('.etiqueta-row'), function(fila){
        var numero = fila.querySelector('.etiqueta-numero').value.trim();
        if(!numero) return;
        var ubicacion = fila.querySelector('.etiqueta-ubicacion').value.trim();
        etiquetas.push({ tipo: par[0], numero: numero, ubicacion: ubicacion || null });
      });
    });
    return etiquetas;
  }

  function buildHallazgos(){
    var hallazgos = [];
    [['material', 'v_material', C.materiales], ['herida', 'v_heridas', C.heridas]].forEach(function(grupo){
      if(!esSi(grupo[1])) return;
      grupo[2].forEach(function(def){
        var base = 'h_' + grupo[0] + '_' + def.codigo;
        if(!esSi(base)) return;
        hallazgos.push({
          categoria: grupo[0],
          tipoCodigo: def.codigo,
          ubicaciones: U.leerChecks(form, base + '_ubic'),
          detalle: U.textoOrNull(base + '_detalle')
        });
      });
    });
    return hallazgos;
  }

  function buildPayload(){
    var material = esSi('v_material');
    var heridas = esSi('v_heridas');
    var enfermedad = esSi('v_enfermedad');
    var cola = U.leerRadio(form, 'v_cola');

    return {
      observadorNombre: val('v_observador'),
      playaId: numOrNull(val('v_playa')),
      latitud: numOrNull(val('v_lat')),
      longitud: numOrNull(val('v_lng')),
      descripcionUbicacion: U.textoOrNull('v_descripcion_ubicacion'),
      fechaVaramiento: val('v_fecha'),
      numeroTortugaDia: numOrNull(val('v_numero_dia')),
      especieCodigo: U.leerRadio(form, 'v_especie_codigo'),
      condicionCodigo: U.leerRadio(form, 'v_condicion_codigo'),
      condicionFisica: U.leerChecks(form, 'v_condicion_fisica'),

      fotoDorsal: marcado('v_foto_dorsal'),
      fotoVentral: marcado('v_foto_ventral'),
      fotoHeridas: marcado('v_foto_heridas'),
      fotoMaterial: marcado('v_foto_material'),
      bocaRevisada: tri('v_boca_revisada'),
      necropsiaCompletada: tri('v_necropsia_completada'),

      etiquetasAletaEncontradas: tri('v_etiquetas_aleta'),
      cicatricesEtiqueta: tri('v_cicatrices'),
      cicatricesUbicaciones: esSi('v_cicatrices') ? U.leerChecks(form, 'v_cicatrices_ubic') : [],
      pitEscaneado: tri('v_pit'),
      etiquetaViva: tri('v_etiqueta_viva'),
      etiquetaVivaDetalle: esSi('v_etiqueta_viva') ? U.textoOrNull('v_etiqueta_viva_detalle') : null,
      equipoRastreo: tri('v_rastreo'),

      lccCm: numOrNull(val('v_lcc')),
      lccTipo: U.leerRadio(form, 'v_lcc_tipo'),
      colaExtendida: cola,
      colaMedida1Cm: cola === 'si' ? numOrNull(val('v_cola_m1')) : null,
      colaMedida2Cm: cola === 'si' ? numOrNull(val('v_cola_m2')) : null,

      materialEncontrado: tri('v_material'),
      materialFotos: material ? tri('v_material_fotos') : null,
      cuerdaAlgoUnido: (material && esSi('h_material_cuerda')) ? tri('v_cuerda_algo_unido') : null,
      heridasEncontradas: tri('v_heridas'),
      heridasFotos: heridas ? tri('v_heridas_fotos') : null,
      heridaEnredamientoAsociada: (heridas && esSi('h_herida_enredamiento')) ? tri('v_herida_enredamiento_asociada') : null,

      enfermedadObservada: tri('v_enfermedad'),
      enfermedadFotos: enfermedad ? tri('v_enfermedad_fotos') : null,
      demacrada: enfermedad ? tri('v_demacrada') : null,
      epibiontes: enfermedad ? tri('v_epibiontes') : null,
      fibropapiloma: enfermedad ? tri('v_fibropapiloma') : null,
      fibropapilomaRango: (enfermedad && esSi('v_fibropapiloma')) ? U.leerRadio(form, 'v_fibro_rango') : null,
      lesionesPiel: enfermedad ? tri('v_lesiones') : null,
      lesionesPielArea: (enfermedad && esSi('v_lesiones')) ? U.leerRadio(form, 'v_lesiones_area') : null,
      sanguijuelas: enfermedad ? tri('v_sanguijuelas') : null,
      sanguijuelasCantidad: (enfermedad && esSi('v_sanguijuelas')) ? U.leerRadio(form, 'v_sanguijuelas_cantidad') : null,

      comentarios: U.textoOrNull('v_comentarios'),
      etiquetas: buildEtiquetas(),
      hallazgos: buildHallazgos()
    };
  }

  /* ---------------- Reset ---------------- */

  // Con "siguiente" se conservan observador, campamento y fecha, y se
  // propone el siguiente número del día, para capturar varias tortugas
  // seguidas en la misma salida a playa.
  function resetForm(siguiente){
    var conservar = siguiente ? {
      observador: val('v_observador'),
      playa: val('v_playa'),
      fecha: val('v_fecha'),
      numero: numOrNull(val('v_numero_dia'))
    } : null;

    form.reset();
    U.resetSiNo(form);
    reiniciarEtiquetas();
    fotos.limpiar();
    validador.limpiarTodo();
    gps.reiniciar();
    document.getElementById('v_fecha').value = U.hoyIso();

    if(conservar){
      document.getElementById('v_observador').value = conservar.observador;
      document.getElementById('v_playa').value = conservar.playa;
      if(conservar.fecha){ document.getElementById('v_fecha').value = conservar.fecha; }
      if(conservar.numero && conservar.numero < 999){ document.getElementById('v_numero_dia').value = String(conservar.numero + 1); }
    }
    U.actualizarCondicionales(form);
  }

  var resetBtn = document.getElementById('resetVaramientoBtn');
  if(resetBtn){
    resetBtn.addEventListener('click', function(){
      resetForm();
      banner.ocultar();
    });
  }

  /* ---------------- Envio ---------------- */

  function describir(payload){
    return 'El varamiento del ' + U.formatFecha(payload.fechaVaramiento) + ' (tortuga ' + U.formatNumeroDia(payload.numeroTortugaDia) + ')';
  }

  function subirFotos(varamientoId, lista){
    if(!lista.length){ return Promise.resolve(0); }
    if(!varamientoId){ return Promise.resolve(lista.length); }
    var tareas = lista.map(function(file){
      return api.subirFotosVaramiento(varamientoId, file).then(function(){ return true; }).catch(function(){ return false; });
    });
    return Promise.all(tareas).then(function(resultados){
      return resultados.filter(function(ok){ return !ok; }).length;
    });
  }

  function notificarGuardado(){
    if(T.varamientos && T.varamientos.refrescar){ T.varamientos.refrescar(); }
    if(T.necropsiaForm && T.necropsiaForm.refrescarVaramientos){ T.necropsiaForm.refrescarVaramientos(); }
  }

  form.addEventListener('submit', function(evt){
    evt.preventDefault();

    if(!api){
      banner.mostrar('No se pudo conectar con la API. Revisa la configuración antes de guardar.', 'error');
      return;
    }

    validador.limpiarTodo();
    var errores = validar();
    if(errores.length){
      validador.aplicar(errores);
      banner.mostrar('Revisa los campos marcados antes de guardar.', 'error');
      return;
    }

    var payload = buildPayload();
    var listaFotos = fotos.obtener();
    banner.mostrar('Guardando varamiento...', 'loading');
    submitBtn.disabled = true;

    api.crearVaramiento(payload).then(function(varamiento){
      return subirFotos(varamiento && varamiento.id, listaFotos).then(function(fallidas){
        submitBtn.disabled = false;
        var aviso = payload.condicionCodigo !== 'vivo' ? ' Si se realizó necropsia, regístrala en el menú Necropsia.' : '';
        if(fallidas > 0){
          banner.mostrar(describir(payload) + ' se guardó, pero ' + fallidas + ' foto(s) no se pudieron subir.' + aviso, 'warning');
        }else{
          banner.mostrar(describir(payload) + ' se guardó correctamente.' + aviso, 'success');
        }
        resetForm(true);
        notificarGuardado();
      });
    }).catch(function(err){
      submitBtn.disabled = false;

      var syncQueue = T.syncQueue;
      if(U.esFallaDeRed(err) && syncQueue){
        syncQueue.encolar('varamiento', payload, listaFotos).then(function(){
          banner.mostrar('Sin conexión: ' + describir(payload).charAt(0).toLowerCase() + describir(payload).slice(1) + ' se guardó en este dispositivo y se sincronizará automáticamente cuando haya señal.', 'warning');
          resetForm(true);
        }).catch(function(){
          banner.mostrar('No se pudo guardar el varamiento ni dejarlo listo para sincronizar después: ' + U.mensajeError(err), 'error');
        });
        return;
      }

      if(err && err.status === 409){
        validador.aplicar([{ id: 'v_numero_dia', mensaje: 'Ya existe un varamiento con esta fecha, campamento y número del día.' }]);
      }
      banner.mostrar('No se pudo guardar el varamiento: ' + U.mensajeError(err), 'error');
    });
  });

  cargarCatalogos();
  resetForm();
})();
