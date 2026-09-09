/*
  Pantalla de acceso (issue #42): login y creacion de cuenta. Se ejecuta
  antes de que el resto de los modulos (catalogos.js, panel.js, etc.)
  disparen sus llamadas a la API, para decidir si se muestra #authScreen o
  .app segun haya o no un token valido en localStorage.

  Los demas modulos ya asumen que hay token al cargar; por eso, en vez de
  manejar la sesion en memoria, al loguearse o registrarse con exito se
  guarda el token y se recarga la pagina (location.reload()) para que todo
  vuelva a arrancar limpio.

  Usa la misma clave de localStorage que js/api.js (TOKEN_KEY), no una
  nueva.
*/
(function(){
  var TOKEN_KEY = 'tortutam_token';
  var NOMBRE_KEY = 'tortutam_nombre_completo';
  var ROLES_KEY = 'tortutam_roles';

  var authScreen = document.getElementById('authScreen');
  var appShell = document.querySelector('.app');
  if(!authScreen || !appShell) return;

  var api = window.TortuTAM && window.TortuTAM.api;

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  function val(id){
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, function(ch){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch];
    });
  }

  function getToken(){
    try{ return localStorage.getItem(TOKEN_KEY); }catch(e){ return null; }
  }

  function guardarSesion(data){
    try{
      localStorage.setItem(TOKEN_KEY, data.token);
      if(data.nombreCompleto){ localStorage.setItem(NOMBRE_KEY, data.nombreCompleto); }
      if(data.roles){ localStorage.setItem(ROLES_KEY, JSON.stringify(data.roles)); }
    }catch(e){
      /* Sin localStorage disponible (modo privado estricto, etc.) no hay
         forma de mantener sesion; se deja seguir para no bloquear con un
         error confuso, pero al recargar volvera a pedir acceso. */
    }
  }

  function mostrarAcceso(){
    appShell.hidden = true;
    authScreen.hidden = false;
  }

  function mostrarApp(){
    authScreen.hidden = true;
    appShell.hidden = false;
  }

  if(getToken()){
    mostrarApp();
  } else {
    mostrarAcceso();
  }

  /* ---------------- Pestañas login / registro ---------------- */

  var tabLogin = document.getElementById('authTabLogin');
  var tabRegistro = document.getElementById('authTabRegistro');
  var panelLogin = document.getElementById('authPanelLogin');
  var panelRegistro = document.getElementById('authPanelRegistro');
  var goToRegistro = document.getElementById('goToRegistro');
  var goToLogin = document.getElementById('goToLogin');

  function cambiarTab(activa){
    var esLogin = activa === 'login';

    tabLogin.classList.toggle('active', esLogin);
    tabLogin.setAttribute('aria-selected', esLogin ? 'true' : 'false');
    tabLogin.tabIndex = esLogin ? 0 : -1;

    tabRegistro.classList.toggle('active', !esLogin);
    tabRegistro.setAttribute('aria-selected', !esLogin ? 'true' : 'false');
    tabRegistro.tabIndex = esLogin ? -1 : 0;

    panelLogin.hidden = !esLogin;
    panelRegistro.hidden = esLogin;

    var campoFoco = document.getElementById(esLogin ? 'login_email' : 'reg_nombre');
    if(campoFoco){ campoFoco.focus(); }
  }

  tabLogin.addEventListener('click', function(){ cambiarTab('login'); });
  tabRegistro.addEventListener('click', function(){ cambiarTab('registro'); });
  if(goToRegistro){ goToRegistro.addEventListener('click', function(){ cambiarTab('registro'); }); }
  if(goToLogin){ goToLogin.addEventListener('click', function(){ cambiarTab('login'); }); }

  /* ---------------- Mostrar / ocultar contraseña ---------------- */

  function habilitarTogglePassword(inputId, btnId){
    var input = document.getElementById(inputId);
    var btn = document.getElementById(btnId);
    if(!input || !btn) return;
    btn.addEventListener('click', function(){
      var seVaAMostrar = input.type === 'password';
      input.type = seVaAMostrar ? 'text' : 'password';
      btn.classList.toggle('is-visible', seVaAMostrar);
      btn.setAttribute('aria-pressed', seVaAMostrar ? 'true' : 'false');
      btn.setAttribute('aria-label', seVaAMostrar ? 'Ocultar contraseña' : 'Mostrar contraseña');
    });
  }

  habilitarTogglePassword('login_password', 'login_togglePassword');
  habilitarTogglePassword('reg_password', 'reg_togglePassword');

  /* ---------------- Requisitos de contraseña (registro) ---------------- */

  var regPassword = document.getElementById('reg_password');
  var requisitos = document.querySelectorAll('#reg_passwordHint li');

  function actualizarRequisitos(){
    var v = regPassword ? regPassword.value : '';
    requisitos.forEach(function(li){
      var req = li.dataset.req;
      var cumple = false;
      if(req === 'len'){ cumple = v.length >= 8; }
      else if(req === 'upper'){ cumple = /[A-Z]/.test(v); }
      else if(req === 'lower'){ cumple = /[a-z]/.test(v); }
      else if(req === 'digit'){ cumple = /\d/.test(v); }
      li.classList.toggle('is-met', cumple);
    });
  }

  if(regPassword){
    regPassword.addEventListener('input', actualizarRequisitos);
  }

  /* ---------------- Errores de campo ---------------- */

  function showFieldError(id, mensaje){
    var el = document.getElementById(id);
    if(!el) return;
    var campo = el.closest('.field');
    if(campo){ campo.classList.add('has-error'); }
    el.setAttribute('aria-invalid', 'true');
    var errorEl = document.getElementById('err_' + id);
    if(errorEl){ errorEl.textContent = mensaje; }
  }

  function clearFieldError(id){
    var el = document.getElementById(id);
    if(!el) return;
    var campo = el.closest('.field');
    if(campo){ campo.classList.remove('has-error'); }
    el.removeAttribute('aria-invalid');
    var errorEl = document.getElementById('err_' + id);
    if(errorEl){ errorEl.textContent = ''; }
  }

  function clearFieldErrors(ids){
    ids.forEach(clearFieldError);
  }

  /* ---------------- Estado de envio ---------------- */

  function setStatus(banner, mensajeOMensajes, tipo){
    banner.className = 'status-banner is-visible is-' + tipo;
    banner.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
    var spinner = tipo === 'loading' ? '<svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="9" opacity="0.25"/><path d="M21 12a9 9 0 0 0-9-9"/></svg>' : '';

    if(Array.isArray(mensajeOMensajes)){
      var items = mensajeOMensajes.map(function(m){
        var texto = (typeof m === 'string') ? m : ((m && (m.mensaje || m.description || m.message)) || String(m));
        return '<li>' + escapeHtml(texto) + '</li>';
      }).join('');
      banner.innerHTML = spinner + '<ul class="form-errors-list">' + items + '</ul>';
    } else {
      banner.innerHTML = spinner + '<span>' + escapeHtml(mensajeOMensajes) + '</span>';
    }
  }

  function clearStatus(banner){
    banner.className = 'status-banner';
    banner.innerHTML = '';
  }

  function esFallaDeRed(err){
    return !(err && typeof err.status === 'number');
  }

  /* ---------------- Login ---------------- */

  var loginForm = document.getElementById('loginForm');
  var loginStatus = document.getElementById('loginStatus');
  var loginSubmitBtn = document.getElementById('loginSubmitBtn');

  function validarLogin(){
    clearFieldErrors(['login_email', 'login_password']);
    var ok = true;
    var email = val('login_email');
    if(!email){
      showFieldError('login_email', 'Ingresa tu correo.');
      ok = false;
    } else if(!EMAIL_RE.test(email)){
      showFieldError('login_email', 'Ingresa un correo valido.');
      ok = false;
    }
    if(!val('login_password')){
      showFieldError('login_password', 'Ingresa tu contraseña.');
      ok = false;
    }
    return ok;
  }

  if(loginForm){
    loginForm.addEventListener('submit', function(evt){
      evt.preventDefault();

      if(!api){
        setStatus(loginStatus, 'No se pudo conectar con la API. Revisa la configuracion.', 'error');
        return;
      }

      if(!validarLogin()){
        setStatus(loginStatus, 'Revisa los campos marcados.', 'error');
        return;
      }

      setStatus(loginStatus, 'Entrando...', 'loading');
      loginSubmitBtn.disabled = true;

      api.login(val('login_email'), val('login_password')).then(function(data){
        clearStatus(loginStatus);
        guardarSesion(data);
        location.reload();
      }).catch(function(err){
        loginSubmitBtn.disabled = false;
        if(err && err.status === 401){
          setStatus(loginStatus, 'Correo o contraseña incorrectos.', 'error');
        } else if(esFallaDeRed(err)){
          setStatus(loginStatus, 'No hay conexion con el servidor. Verifica tu conexion e intenta de nuevo.', 'error');
        } else {
          setStatus(loginStatus, (err && err.message) || 'No se pudo iniciar sesion. Intenta de nuevo.', 'error');
        }
      });
    });
  }

  /* ---------------- Registro ---------------- */

  var registroForm = document.getElementById('registroForm');
  var registroStatus = document.getElementById('registroStatus');
  var registroSubmitBtn = document.getElementById('registroSubmitBtn');

  function validarRegistro(){
    clearFieldErrors(['reg_nombre', 'reg_apellido', 'reg_email', 'reg_password']);
    var ok = true;

    if(!val('reg_nombre')){
      showFieldError('reg_nombre', 'Ingresa tu nombre.');
      ok = false;
    }
    if(!val('reg_apellido')){
      showFieldError('reg_apellido', 'Ingresa tu apellido.');
      ok = false;
    }

    var email = val('reg_email');
    if(!email){
      showFieldError('reg_email', 'Ingresa tu correo.');
      ok = false;
    } else if(!EMAIL_RE.test(email)){
      showFieldError('reg_email', 'Ingresa un correo valido.');
      ok = false;
    }

    var password = val('reg_password');
    if(!PASSWORD_RE.test(password)){
      showFieldError('reg_password', 'La contraseña no cumple los requisitos de abajo.');
      ok = false;
    }

    return ok;
  }

  if(registroForm){
    registroForm.addEventListener('submit', function(evt){
      evt.preventDefault();

      if(!api){
        setStatus(registroStatus, 'No se pudo conectar con la API. Revisa la configuracion.', 'error');
        return;
      }

      if(!validarRegistro()){
        setStatus(registroStatus, 'Revisa los campos marcados.', 'error');
        return;
      }

      var payload = {
        nombre: val('reg_nombre'),
        apellido: val('reg_apellido'),
        email: val('reg_email'),
        password: val('reg_password')
      };

      setStatus(registroStatus, 'Creando cuenta...', 'loading');
      registroSubmitBtn.disabled = true;

      api.registrar(payload).then(function(data){
        clearStatus(registroStatus);
        guardarSesion(data);
        location.reload();
      }).catch(function(err){
        registroSubmitBtn.disabled = false;

        if(err && err.status === 409){
          var mensaje = (err.data && err.data.mensaje) || 'Ese correo ya esta registrado.';
          showFieldError('reg_email', mensaje);
          setStatus(registroStatus, mensaje, 'error');
        } else if(err && err.status === 400 && err.data && Array.isArray(err.data.errores) && err.data.errores.length){
          showFieldError('reg_password', 'La contraseña no cumple los requisitos.');
          setStatus(registroStatus, err.data.errores, 'error');
        } else if(esFallaDeRed(err)){
          setStatus(registroStatus, 'No hay conexion con el servidor. Verifica tu conexion e intenta de nuevo.', 'error');
        } else {
          setStatus(registroStatus, (err && err.message) || 'No se pudo crear la cuenta. Intenta de nuevo.', 'error');
        }
      });
    });
  }
})();
