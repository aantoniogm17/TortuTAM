/*
  Formulario "Nueva necropsia" (subvista #sub-necropsia-nueva). Sigue el
  orden de la Ficha de Necropsia 2021 y se anexa a un varamiento ya
  registrado (relacion 1 a 0/1). Depende de js/api.js, js/catalogos.js,
  js/form-utils.js y js/codigos-campo.js.

  El primer campo es el selector del varamiento, que se llena con
  GET /api/varamientos?necropsiaPendiente=true (condicion distinta de vivo y
  sin necropsia). La lista se recarga cada vez que se entra a la vista.
  Un varamiento capturado sin conexion no aparece aqui hasta que la cola
  offline lo sincroniza, porque todavia no tiene id en el servidor.

  Cola offline: si el POST falla por falta de conexion, la necropsia se
  encola como tipo 'necropsia'; un 409 al reintentar significa que ese
  varamiento ya tenia necropsia (ya se habia sincronizado).
*/
(function(){
  var form = document.getElementById('necropsiaForm');
  if(!form) return;

  var T = window.TortuTAM || {};
  var api = T.api;
  var catalogos = T.catalogos;
  var U = T.formUtils;
  var C = T.codigosCampo;
  if(!U || !C) return;

  var val = U.val;
  var t = U.textoOrNull;
  var esc = U.escapeHtml;

  var validador = U.crearValidador();
  var banner = U.crearBanner(document.getElementById('n_status'));
  var submitBtn = document.getElementById('guardarNecropsiaBtn');
  var select = document.getElementById('n_varamiento');
  var hint = document.getElementById('n_varamientoHint');
  var recargarBtn = document.getElementById('n_recargarVaramientos');

  var TEXTO_HINT = 'Solo aparecen los varamientos sin necropsia y con condición distinta de Vivo.';

  U.iniciarChipSets(form, C);
  U.iniciarSiNo(form);
  U.conectarFormulario(form);

  /* ---------------- Selector de varamiento ---------------- */

  var cache = { playas: [], especies: [] };
  var idPreseleccion = null;
  var idsEnCola = {};
  var solicitudActual = 0;

  function buscar(lista, valor, campo){
    for(var i = 0; i < (lista || []).length; i++){
      if(String(lista[i][campo]) === String(valor)){ return lista[i]; }
    }
    return null;
  }

  function textoVaramiento(v){
    var playa = buscar(cache.playas, v.playaId, 'id');
    var especie = buscar(cache.especies, v.especieCodigo, 'codigo');
    return [
      U.formatFecha(v.fechaVaramiento),
      'tortuga ' + U.formatNumeroDia(v.numeroTortugaDia),
      playa ? playa.nombre : 'sin campamento',
      especie ? (especie.nombreComun || especie.codigo) : (v.especieCodigo || '—')
    ].join(' · ');
  }

  function setHint(mensaje, aviso){
    hint.textContent = mensaje;
    hint.className = aviso ? 'hint is-aviso' : 'hint';
  }

  function cargarVaramientos(){
    if(!api){
      select.innerHTML = '<option value="">No se pudo conectar con la API</option>';
      select.disabled = true;
      return;
    }
    solicitudActual += 1;
    var miSolicitud = solicitudActual;
    var previo = idPreseleccion || select.value;

    select.disabled = true;
    select.innerHTML = '<option value="">Cargando varamientos...</option>';
    if(recargarBtn){ recargarBtn.disabled = true; }

    var promesaCatalogos = catalogos ? catalogos.ready().catch(function(){ return null; }) : Promise.resolve(null);

    Promise.all([promesaCatalogos, api.listarVaramientos({ necropsiaPendiente: true, page: 1, pageSize: 100 })]).then(function(r){
      if(miSolicitud !== solicitudActual) return;
      if(r[0]){
        cache.playas = r[0].playas || [];
        cache.especies = r[0].especies || [];
      }
      var elementos = ((r[1] && r[1].elementos) || []).filter(function(v){ return !idsEnCola[v.id]; });
      if(recargarBtn){ recargarBtn.disabled = false; }

      if(!elementos.length){
        select.innerHTML = '<option value="">No hay varamientos pendientes de necropsia</option>';
        select.disabled = true;
        setHint('No hay varamientos pendientes de necropsia. Registra primero el varamiento en el menú Varamientos (con condición distinta de Vivo). Si lo capturaste sin conexión, espera a que se sincronice y toca "Actualizar lista".', true);
        idPreseleccion = null;
        return;
      }

      var opciones = '<option value="">Selecciona un varamiento</option>';
      elementos.forEach(function(v){
        opciones += '<option value="' + esc(v.id) + '">' + esc(textoVaramiento(v)) + '</option>';
      });
      select.innerHTML = opciones;
      select.disabled = false;
      if(previo && buscar(elementos, previo, 'id')){ select.value = String(previo); }
      idPreseleccion = null;
      setHint(TEXTO_HINT + ' ' + elementos.length + ' pendiente' + (elementos.length === 1 ? '' : 's') + '.', false);
    }).catch(function(err){
      if(miSolicitud !== solicitudActual) return;
      if(recargarBtn){ recargarBtn.disabled = false; }
      select.innerHTML = '<option value="">No se pudo cargar la lista</option>';
      select.disabled = true;
      setHint('No se pudo cargar la lista de varamientos: ' + U.mensajeError(err) + ' Toca "Actualizar lista" cuando haya conexión.', true);
    });
  }

  if(recargarBtn){ recargarBtn.addEventListener('click', cargarVaramientos); }
  select.addEventListener('change', function(){ validador.limpiar('n_varamiento'); });

  window.addEventListener('tortutam:vista-cambio', function(evt){
    if(evt.detail && evt.detail.vista === 'necropsia'){ cargarVaramientos(); }
  });

  /* ---------------- Validacion y payload ---------------- */

  function validar(){
    var errores = [];
    if(!val('n_varamiento')){
      errores.push({ id: 'n_varamiento', mensaje: 'Selecciona el varamiento al que se anexa esta necropsia.' });
    }
    return errores;
  }

  function radio(nombre){ return U.leerRadio(form, nombre); }
  function checks(nombre){ return U.leerChecks(form, nombre); }

  function contenidoGi(nombre){
    var estado = radio(nombre);
    return { estado: estado, descripcion: estado === 'contenido' ? t(nombre + '_desc') : null };
  }

  function buildPayload(){
    var tractoAnormal = checks('n_tracto').indexOf('anormal') !== -1;
    var materialIngerido = radio('n_mat_ing');
    var tumores = radio('n_tumores');
    var sexo = radio('n_sexo');
    var boca = contenidoGi('n_gi_boca');
    var estomago = contenidoGi('n_gi_estomago');
    var int1 = contenidoGi('n_gi_int1');
    var int2 = contenidoGi('n_gi_int2');

    return {
      varamientoId: U.numOrNull(val('n_varamiento')),
      fechaNecropsia: val('n_fecha') || null,
      realizo: t('n_realizo'),

      grasaCorporal: radio('n_grasa'),

      celoma: checks('n_celoma'),
      celomaComentarios: t('n_celoma_com'),
      tumoresFp: tumores,
      tumoresFpUbicaciones: tumores === 'si' ? t('n_tumores_ubic') : null,

      corazon: checks('n_corazon'),
      sangreCamaras: radio('n_sangre'),
      corazonComentarios: t('n_corazon_com'),

      higado: checks('n_higado'),
      higadoComentarios: t('n_higado_com'),

      tractoGi: checks('n_tracto'),
      bocaExaminada: U.leerSiNo(form, 'n_boca_examinada'),
      giAnormalidades: tractoAnormal ? checks('n_gi_anorm') : [],
      giDescripcion: tractoAnormal ? t('n_gi_desc') : null,
      materialAntropogenicoDetalle: t('n_material_antro'),
      materialIngerido: materialIngerido,
      materialIngeridoDescripcion: materialIngerido === 'si' ? t('n_mat_ing_desc') : null,
      materialFotoEscala: materialIngerido === 'si' ? U.leerSiNo(form, 'n_mat_foto') : null,

      giBocaEsofagoEstado: boca.estado,
      giBocaEsofagoDescripcion: boca.descripcion,
      giEstomagoEstado: estomago.estado,
      giEstomagoDescripcion: estomago.descripcion,
      giIntestino1Estado: int1.estado,
      giIntestino1Descripcion: int1.descripcion,
      giIntestino2Estado: int2.estado,
      giIntestino2Descripcion: int2.descripcion,

      urogenital: radio('n_urogenital'),
      sexo: sexo,
      testiculos: sexo === 'M' ? radio('n_testiculos') : null,
      epididimo: sexo === 'M' ? radio('n_epididimo') : null,
      ovarios: sexo === 'H' ? radio('n_ovarios') : null,
      oviducto: sexo === 'H' ? radio('n_oviducto') : null,
      urogenitalComentarios: t('n_uro_com'),

      traquea: checks('n_traquea'),
      pulmones: checks('n_pulmones'),
      respiratorioComentarios: t('n_resp_com'),

      cerebro: checks('n_cerebro'),
      cerebroComentarios: t('n_cerebro_com'),

      resumenHallazgos: t('n_resumen')
    };
  }

  /* ---------------- Reset ---------------- */

  function resetForm(){
    var seleccionado = select.value;
    form.reset();
    select.value = seleccionado;
    U.resetSiNo(form);
    validador.limpiarTodo();
    document.getElementById('n_fecha').value = U.hoyIso();
    U.actualizarCondicionales(form);
  }

  var resetBtn = document.getElementById('resetNecropsiaBtn');
  if(resetBtn){
    resetBtn.addEventListener('click', function(){
      resetForm();
      select.value = '';
      banner.ocultar();
    });
  }

  /* ---------------- Envio ---------------- */

  function textoSeleccionado(){
    var opcion = select.options[select.selectedIndex];
    return opcion ? opcion.textContent : '';
  }

  function notificarGuardado(){
    if(T.necropsias && T.necropsias.refrescar){ T.necropsias.refrescar(); }
    if(T.varamientos && T.varamientos.refrescar){ T.varamientos.refrescar(); }
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
    var descripcion = textoSeleccionado();
    banner.mostrar('Guardando necropsia...', 'loading');
    submitBtn.disabled = true;

    api.crearNecropsia(payload).then(function(){
      submitBtn.disabled = false;
      banner.mostrar('Necropsia del varamiento ' + descripcion + ' guardada correctamente.', 'success');
      resetForm();
      select.value = '';
      cargarVaramientos();
      notificarGuardado();
    }).catch(function(err){
      submitBtn.disabled = false;

      var syncQueue = T.syncQueue;
      if(U.esFallaDeRed(err) && syncQueue){
        syncQueue.encolar('necropsia', payload, []).then(function(){
          idsEnCola[payload.varamientoId] = true;
          var opcion = select.querySelector('option[value="' + payload.varamientoId + '"]');
          if(opcion){ opcion.parentNode.removeChild(opcion); }
          banner.mostrar('Sin conexión: la necropsia del varamiento ' + descripcion + ' se guardó en este dispositivo y se sincronizará automáticamente cuando haya señal.', 'warning');
          resetForm();
          select.value = '';
        }).catch(function(){
          banner.mostrar('No se pudo guardar la necropsia ni dejarla lista para sincronizar después: ' + U.mensajeError(err), 'error');
        });
        return;
      }

      if(err && err.status === 409){
        banner.mostrar('Ese varamiento ya tiene una necropsia registrada. Se actualizó la lista de pendientes.', 'error');
        select.value = '';
        cargarVaramientos();
        return;
      }
      banner.mostrar('No se pudo guardar la necropsia: ' + U.mensajeError(err), 'error');
    });
  });

  resetForm();
  cargarVaramientos();

  window.TortuTAM = window.TortuTAM || {};
  window.TortuTAM.necropsiaForm = {
    refrescarVaramientos: cargarVaramientos,
    // Abre "Nueva necropsia" con el varamiento indicado ya seleccionado
    // (se usa desde el listado de varamientos).
    iniciarCon: function(varamientoId){
      idPreseleccion = varamientoId;
      var tab = document.getElementById('tabNecropsiaNueva');
      if(tab){ tab.click(); }
      if(T.showView){ T.showView('necropsia'); } else { cargarVaramientos(); }
      window.scrollTo(0, 0);
    }
  };
})();
