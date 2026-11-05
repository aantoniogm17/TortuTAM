(function(){
  var views = ['panel', 'nueva', 'limpieza', 'varamientos', 'necropsia', 'fichas', 'mapa'];

  function showView(name){
    if(views.indexOf(name) === -1){ name = 'panel'; }

    document.querySelectorAll('.view').forEach(function(section){
      section.classList.toggle('is-active', section.dataset.view === name);
    });

    document.querySelectorAll('.nav-item').forEach(function(item){
      var isActive = item.dataset.view === name;
      item.classList.toggle('active', isActive);
      if(isActive){
        item.setAttribute('aria-current', 'page');
      } else {
        item.removeAttribute('aria-current');
      }
    });

    if(window.history && history.replaceState){
      history.replaceState(null, '', '#' + name);
    }

    // Aviso para que las vistas refresquen datos al mostrarse (p. ej. la
    // lista de varamientos pendientes en Necropsia) sin acoplarse a nav.js.
    try{
      window.dispatchEvent(new CustomEvent('tortutam:vista-cambio', { detail: { vista: name } }));
    }catch(e){
      /* CustomEvent no disponible: las vistas cargan sus datos al iniciar. */
    }
  }

  var nav = document.getElementById('primaryNav');
  if(nav){
    nav.addEventListener('click', function(event){
      var item = event.target.closest('.nav-item');
      if(!item) return;
      showView(item.dataset.view);
    });
  }

  var initial = (window.location.hash || '').replace('#', '');
  showView(views.indexOf(initial) !== -1 ? initial : 'panel');

  window.TortuTAM = window.TortuTAM || {};
  window.TortuTAM.showView = showView;
})();
