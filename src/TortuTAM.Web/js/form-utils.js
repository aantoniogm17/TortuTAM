/*
  Utilidades compartidas por los formularios de Varamientos y Necropsia
  (y por sus listados). Expone window.TortuTAM.formUtils.

  Convenciones de marcado que entiende este modulo:
    - [data-sino="nombre"]: contenedor de una pregunta SI/NO tri-estado
      (SI / NO / sin contestar). Se le agrega un .chip-toggle con botones
      data-val="S" / data-val="N"; el valor vive en el dataset del grupo.
      Debe contener un elemento .pregunta-texto que sirve de etiqueta.
    - [data-opciones="lista"][data-name="campo"][data-tipo="radio|checkbox"]:
      contenedor .chip-set que se llena con las opciones de la lista indicada
      del catalogo de codigos (js/codigos-campo.js).
    - [data-cuando="campo:valor1|valor2"]: elemento que solo se muestra
      cuando el campo tiene alguno de los valores. El campo puede ser un
      grupo SI/NO (valores S/N), un grupo de radios o de checkboxes.
*/
(function(){
  var SPINNER = '<svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="9" opacity="0.25"/><path d="M21 12a9 9 0 0 0-9-9"/></svg>';

  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, function(ch){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch];
    });
  }

  function val(id){
    var el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
  }

  function numOrNull(str){
    if(str === null || str === undefined || str === ''){ return null; }
    var n = Number(str);
    return isNaN(n) ? null : n;
  }

  function textoOrNull(id){
    return val(id) || null;
  }

  function hoyIso(){
    var d = new Date();
    var mes = String(d.getMonth() + 1);
    var dia = String(d.getDate());
    return d.getFullYear() + '-' + (mes.length < 2 ? '0' + mes : mes) + '-' + (dia.length < 2 ? '0' + dia : dia);
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

  function formatNumeroDia(n){
    if(n === null || n === undefined || n === ''){ return '—'; }
    var texto = String(n);
    while(texto.length < 3){ texto = '0' + texto; }
    return '#' + texto;
  }

  function esFallaDeRed(err){
    return !(err && typeof err.status === 'number');
  }

  function mensajeError(err){
    if(err && err.status){
      var lista = (err.data && Array.isArray(err.data.errores)) ? err.data.errores : [];
      var detalle = lista.length ? (' ' + lista.map(function(e){
        return typeof e === 'string' ? e : ((e && (e.mensaje || e.message)) || '');
      }).join(' ')) : '';
      return (err.message || ('el servidor respondió con un error (' + err.status + ').')) + detalle;
    }
    return 'sin conexión o el servidor no respondió.';
  }

  /* ---------------- Banner de estado ---------------- */

  function crearBanner(el){
    return {
      mostrar: function(mensaje, tipo){
        if(!el) return;
        el.className = 'status-banner is-visible is-' + tipo;
        el.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
        el.innerHTML = (tipo === 'loading' ? SPINNER : '') + '<span>' + escapeHtml(mensaje) + '</span>';
      },
      ocultar: function(){
        if(!el) return;
        el.className = 'status-banner';
        el.innerHTML = '';
      }
    };
  }

  /* ---------------- Errores por campo ---------------- */

  function crearValidador(){
    var conError = {};

    function mostrar(id, mensaje){
      var el = document.getElementById(id);
      if(!el) return;
      var campo = el.closest('.field');
      if(campo){ campo.classList.add('has-error'); }
      el.setAttribute('aria-invalid', 'true');
      var errorEl = document.getElementById('err_' + id);
      if(errorEl){ errorEl.textContent = mensaje; }
      conError[id] = true;
    }

    function limpiar(id){
      var el = document.getElementById(id);
      if(!el) return;
      var campo = el.closest('.field');
      if(campo){ campo.classList.remove('has-error'); }
      el.removeAttribute('aria-invalid');
      var errorEl = document.getElementById('err_' + id);
      if(errorEl){ errorEl.textContent = ''; }
      delete conError[id];
    }

    function limpiarTodo(){
      Object.keys(conError).forEach(limpiar);
    }

    function enfocar(id){
      var el = document.getElementById(id);
      if(!el) return;
      var objetivo = el.matches('input, select, textarea, button') ? el : el.querySelector('input, select, textarea, button');
      if(objetivo){ objetivo.focus(); }
    }

    function aplicar(errores){
      errores.forEach(function(e){ mostrar(e.id, e.mensaje); });
      if(errores.length){ enfocar(errores[0].id); }
    }

    return { mostrar: mostrar, limpiar: limpiar, limpiarTodo: limpiarTodo, enfocar: enfocar, aplicar: aplicar };
  }

  /* ---------------- Grupos de opciones (chips) ---------------- */

  function renderChipSet(contenedor, opciones, nombre, tipo){
    var html = '';
    (opciones || []).forEach(function(op){
      html += '<label class="chip"><input type="' + (tipo === 'radio' ? 'radio' : 'checkbox') + '" name="' + escapeHtml(nombre) + '" value="' + escapeHtml(op[0]) + '"><span>' + escapeHtml(op[1]) + '</span></label>';
    });
    contenedor.innerHTML = html;
  }

  function iniciarChipSets(root, codigos){
    Array.prototype.forEach.call(root.querySelectorAll('[data-opciones]'), function(cont){
      if(cont.dataset.renderizado === '1') return;
      renderChipSet(cont, codigos[cont.dataset.opciones], cont.dataset.name, cont.dataset.tipo);
      cont.dataset.renderizado = '1';
    });
  }

  function leerRadio(root, nombre){
    var el = root.querySelector('input[name="' + nombre + '"]:checked');
    return el ? el.value : null;
  }

  function leerChecks(root, nombre){
    return Array.prototype.map.call(root.querySelectorAll('input[name="' + nombre + '"]:checked'), function(el){ return el.value; });
  }

  function marcarValores(root, nombre, valores){
    var lista = Array.isArray(valores) ? valores.map(String) : (valores === null || valores === undefined ? [] : [String(valores)]);
    Array.prototype.forEach.call(root.querySelectorAll('input[name="' + nombre + '"]'), function(el){
      el.checked = lista.indexOf(el.value) !== -1;
    });
  }

  /* ---------------- Preguntas SI/NO tri-estado ---------------- */

  var contadorSiNo = 0;

  function iniciarSiNo(root){
    Array.prototype.forEach.call(root.querySelectorAll('[data-sino]'), function(cont){
      if(cont.querySelector('.chip-toggle')) return;
      var nombre = cont.dataset.sino;
      var texto = cont.querySelector('.pregunta-texto');
      if(texto && !texto.id){
        contadorSiNo += 1;
        texto.id = 'preg_' + nombre + '_' + contadorSiNo;
      }
      var grupo = document.createElement('div');
      grupo.className = 'chip-toggle';
      grupo.setAttribute('role', 'group');
      grupo.dataset.name = nombre;
      grupo.dataset.valor = '';
      if(texto){ grupo.setAttribute('aria-labelledby', texto.id); }
      grupo.innerHTML = '<button type="button" data-val="S" aria-pressed="false">Sí</button><button type="button" data-val="N" aria-pressed="false">No</button>';
      cont.appendChild(grupo);
    });
  }

  function fijarSiNo(grupo, valor){
    grupo.dataset.valor = valor;
    Array.prototype.forEach.call(grupo.querySelectorAll('button'), function(btn){
      btn.setAttribute('aria-pressed', valor !== '' && btn.dataset.val === valor ? 'true' : 'false');
    });
  }

  function leerSiNo(root, nombre){
    var grupo = root.querySelector('.chip-toggle[data-name="' + nombre + '"]');
    var v = grupo ? grupo.dataset.valor : '';
    if(v === 'S'){ return true; }
    if(v === 'N'){ return false; }
    return null;
  }

  function escribirSiNo(root, nombre, valor){
    var grupo = root.querySelector('.chip-toggle[data-name="' + nombre + '"]');
    if(!grupo) return;
    fijarSiNo(grupo, valor === true ? 'S' : (valor === false ? 'N' : ''));
  }

  function resetSiNo(root){
    Array.prototype.forEach.call(root.querySelectorAll('.chip-toggle[data-name]'), function(grupo){
      fijarSiNo(grupo, '');
    });
  }

  /* ---------------- Campos condicionales ---------------- */

  function valoresCampo(root, campo){
    var grupo = root.querySelector('.chip-toggle[data-name="' + campo + '"]');
    if(grupo){ return grupo.dataset.valor ? [grupo.dataset.valor] : []; }
    return leerChecks(root, campo);
  }

  function actualizarCondicionales(root){
    Array.prototype.forEach.call(root.querySelectorAll('[data-cuando]'), function(el){
      var partes = el.dataset.cuando.split(':');
      var esperados = (partes[1] || '').split('|');
      var actuales = valoresCampo(root, partes[0]);
      var visible = actuales.some(function(v){ return esperados.indexOf(v) !== -1; });
      el.hidden = !visible;
    });
  }

  function conectarFormulario(form){
    form.addEventListener('click', function(evt){
      var btn = evt.target.closest('.chip-toggle[data-name] button');
      if(!btn || !form.contains(btn)) return;
      var grupo = btn.parentNode;
      fijarSiNo(grupo, grupo.dataset.valor === btn.dataset.val ? '' : btn.dataset.val);
      actualizarCondicionales(form);
    });
    form.addEventListener('change', function(){ actualizarCondicionales(form); });
    actualizarCondicionales(form);
  }

  /* ---------------- Selects con catalogos ---------------- */

  function llenarSelect(select, promesa, mapFn, textoVacio){
    if(!select || !promesa) return Promise.resolve();
    select.disabled = true;
    select.innerHTML = '<option value="">Cargando...</option>';
    return promesa.then(function(items){
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

  function etiquetaEspecie(e){
    if(!e){ return '—'; }
    var codigo = String(e.codigo || '');
    return e.nombreComun || codigo;
  }

  /* ---------------- Geolocalizacion ---------------- */

  function mensajeErrorGeo(err){
    if(!err) return 'error desconocido';
    if(err.code === 1) return 'permiso de ubicación denegado';
    if(err.code === 2) return 'ubicación no disponible';
    if(err.code === 3) return 'tiempo de espera agotado';
    return err.message || 'error desconocido';
  }

  function conectarGps(opciones){
    var estado = opciones.estado;
    var boton = opciones.boton;

    function setEstado(mensaje, tipo){
      if(!estado) return;
      estado.textContent = mensaje;
      estado.classList.remove('is-error', 'is-ok');
      if(tipo){ estado.classList.add('is-' + tipo); }
    }

    if(boton){
      boton.addEventListener('click', function(){
        if(!navigator.geolocation){
          setEstado('Este dispositivo no soporta geolocalización. Captura las coordenadas manualmente.', 'error');
          return;
        }
        setEstado('Obteniendo ubicación...');
        boton.disabled = true;
        navigator.geolocation.getCurrentPosition(function(pos){
          boton.disabled = false;
          opciones.lat.value = pos.coords.latitude.toFixed(6);
          opciones.lng.value = pos.coords.longitude.toFixed(6);
          if(opciones.validador){
            opciones.validador.limpiar(opciones.lat.id);
            opciones.validador.limpiar(opciones.lng.id);
          }
          setEstado('Ubicación capturada (precisión aprox. ' + Math.round(pos.coords.accuracy) + ' m).', 'ok');
        }, function(err){
          boton.disabled = false;
          setEstado('No se pudo obtener la ubicación: ' + mensajeErrorGeo(err) + '. Captura las coordenadas manualmente.', 'error');
        }, { enableHighAccuracy: true, timeout: 10000 });
      });
    }

    return {
      reiniciar: function(){ setEstado(opciones.textoInicial || ''); }
    };
  }

  /* ---------------- Fotos adjuntas ---------------- */

  function crearSelectorFotos(input, preview){
    var fotos = [];
    var urls = [];

    function liberar(){
      urls.forEach(function(url){ URL.revokeObjectURL(url); });
      urls = [];
    }

    function render(){
      liberar();
      if(!preview) return;
      preview.innerHTML = '';
      if(!fotos.length){
        var vacio = document.createElement('p');
        vacio.className = 'photo-empty';
        vacio.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="6" width="18" height="14" rx="1.5"/><path d="M8 6l1.6-2.4h4.8L16 6"/><circle cx="12" cy="13" r="3.6"/></svg><span>Aún no se han agregado fotos.</span>';
        preview.appendChild(vacio);
        return;
      }
      fotos.forEach(function(file, index){
        var url = URL.createObjectURL(file);
        urls.push(url);
        var item = document.createElement('div');
        item.className = 'photo-item';
        var img = document.createElement('img');
        img.src = url;
        img.alt = 'Vista previa de foto ' + (index + 1);
        item.appendChild(img);
        var quitar = document.createElement('button');
        quitar.type = 'button';
        quitar.className = 'btn ghost';
        quitar.textContent = 'Quitar';
        quitar.setAttribute('aria-label', 'Quitar foto ' + (index + 1));
        quitar.addEventListener('click', function(){
          fotos.splice(index, 1);
          render();
        });
        item.appendChild(quitar);
        preview.appendChild(item);
      });
    }

    if(input){
      input.addEventListener('change', function(){
        Array.prototype.forEach.call(input.files, function(file){ fotos.push(file); });
        input.value = '';
        render();
      });
    }

    render();

    return {
      obtener: function(){ return fotos.slice(); },
      limpiar: function(){ fotos = []; render(); }
    };
  }

  /* ---------------- Panel de detalle (drawer) ---------------- */

  function crearDrawer(ids){
    var overlay = document.getElementById(ids.overlay);
    var drawer = document.getElementById(ids.drawer);
    var titulo = document.getElementById(ids.titulo);
    var cuerpo = document.getElementById(ids.cuerpo);
    var cerrarBtn = document.getElementById(ids.cerrar);
    var disparador = null;

    function focosables(){
      var selector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      return Array.prototype.slice.call(drawer.querySelectorAll(selector)).filter(function(el){
        return el.offsetParent !== null;
      });
    }

    function enfocar(){
      window.setTimeout(function(){
        var lista = focosables();
        if(lista.length){ lista[0].focus(); } else { drawer.focus(); }
      }, 0);
    }

    function teclado(evt){
      if(overlay.hidden) return;
      if(evt.key === 'Escape'){ evt.preventDefault(); cerrar(); return; }
      if(evt.key === 'Tab'){
        var lista = focosables();
        if(!lista.length) return;
        var primero = lista[0];
        var ultimo = lista[lista.length - 1];
        if(evt.shiftKey && (document.activeElement === primero || !drawer.contains(document.activeElement))){
          evt.preventDefault(); ultimo.focus();
        }else if(!evt.shiftKey && (document.activeElement === ultimo || !drawer.contains(document.activeElement))){
          evt.preventDefault(); primero.focus();
        }
      }
    }

    function abrir(origen){
      disparador = origen || document.activeElement;
      overlay.hidden = false;
      document.body.classList.add('drawer-open');
      titulo.textContent = 'Cargando registro...';
      cuerpo.innerHTML = '<div class="status-banner is-visible is-loading">' + SPINNER + '<span>Cargando registro...</span></div>';
      document.addEventListener('keydown', teclado, true);
      enfocar();
    }

    function mostrar(textoTitulo, html){
      titulo.textContent = textoTitulo;
      cuerpo.innerHTML = html;
      enfocar();
    }

    function error(textoTitulo, mensaje){
      titulo.textContent = textoTitulo;
      cuerpo.innerHTML = '<div class="status-banner is-visible is-error" role="alert"><span>' + escapeHtml(mensaje) + '</span></div>';
    }

    function cerrar(){
      if(overlay.hidden) return;
      document.removeEventListener('keydown', teclado, true);
      overlay.hidden = true;
      document.body.classList.remove('drawer-open');
      cuerpo.innerHTML = '';
      if(disparador && typeof disparador.focus === 'function'){ disparador.focus(); }
      disparador = null;
    }

    if(cerrarBtn){ cerrarBtn.addEventListener('click', cerrar); }
    if(overlay){
      overlay.addEventListener('click', function(evt){ if(evt.target === overlay){ cerrar(); } });
    }

    return { abrir: abrir, mostrar: mostrar, error: error, cerrar: cerrar };
  }

  function kv(etiqueta, valor){
    var vacio = valor === null || valor === undefined || valor === '' || (Array.isArray(valor) && !valor.length);
    var texto = vacio ? '—' : (Array.isArray(valor) ? valor.join(', ') : valor);
    return '<div class="kv"><div class="k">' + escapeHtml(etiqueta) + '</div><div class="v">' + escapeHtml(texto) + '</div></div>';
  }

  function textoSiNo(valor){
    if(valor === true){ return 'Sí'; }
    if(valor === false){ return 'No'; }
    return '—';
  }

  /* ---------------- Subvistas por pestañas ---------------- */

  function crearSubvistas(botones, paneles, alActivar){
    function activar(nombre){
      Object.keys(paneles).forEach(function(clave){
        var activo = clave === nombre;
        if(paneles[clave]){ paneles[clave].hidden = !activo; }
        var boton = botones[clave];
        if(boton){
          boton.classList.toggle('ghost', !activo);
          boton.setAttribute('aria-selected', activo ? 'true' : 'false');
          boton.setAttribute('tabindex', activo ? '0' : '-1');
        }
      });
      if(alActivar){ alActivar(nombre); }
    }
    Object.keys(botones).forEach(function(clave){
      if(botones[clave]){ botones[clave].addEventListener('click', function(){ activar(clave); }); }
    });
    return { activar: activar };
  }

  window.TortuTAM = window.TortuTAM || {};
  window.TortuTAM.formUtils = {
    escapeHtml: escapeHtml,
    val: val,
    numOrNull: numOrNull,
    textoOrNull: textoOrNull,
    hoyIso: hoyIso,
    formatFecha: formatFecha,
    formatFechaHora: formatFechaHora,
    formatNumeroDia: formatNumeroDia,
    esFallaDeRed: esFallaDeRed,
    mensajeError: mensajeError,
    crearBanner: crearBanner,
    crearValidador: crearValidador,
    iniciarChipSets: iniciarChipSets,
    leerRadio: leerRadio,
    leerChecks: leerChecks,
    marcarValores: marcarValores,
    iniciarSiNo: iniciarSiNo,
    leerSiNo: leerSiNo,
    escribirSiNo: escribirSiNo,
    resetSiNo: resetSiNo,
    actualizarCondicionales: actualizarCondicionales,
    conectarFormulario: conectarFormulario,
    llenarSelect: llenarSelect,
    etiquetaEspecie: etiquetaEspecie,
    conectarGps: conectarGps,
    crearSelectorFotos: crearSelectorFotos,
    crearDrawer: crearDrawer,
    kv: kv,
    textoSiNo: textoSiNo,
    crearSubvistas: crearSubvistas
  };
})();
