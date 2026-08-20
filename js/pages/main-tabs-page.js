window.MHRMainTabsPage = (function () {
  function init(options) {
    options = options || {};
    var cargarCatalogosFauna = options.cargarCatalogosFauna;
    var loadFaunaStatistics = options.loadFaunaStatistics;
    var loadAfacStatistics = options.loadAfacStatistics;
    var loadFaunaReports = options.loadFaunaReports;
    var loadEstadisticas = options.loadEstadisticas;

    var tabs = document.querySelectorAll('.sidebar-tab');
    var sections = document.querySelectorAll('.content-section');

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var targetTab = this.getAttribute('data-tab');

        tabs.forEach(function (t) { t.classList.remove('active'); });
        this.classList.add('active');

        sections.forEach(function (section) { section.classList.remove('active'); });
        window.scrollTo(0, 0);
        // Los tableros AIFA y AFAC comparten el contenedor visual, pero cada
        // pestaña activa una fuente de datos independiente.
        var sectionKey = (targetTab === 'estadistica-aifa' || targetTab === 'estadistica-afac')
          ? 'estadistica-fauna'
          : targetTab;
        var targetSection = document.getElementById(sectionKey + '-section');
        if (targetSection) {
          targetSection.classList.add('active');

          var mainTitle = document.getElementById('main-title');
          if (mainTitle) {
            if (targetTab === 'revision') {
              mainTitle.textContent = 'Formato de Revisión del Área de Movimiento';
            } else if (targetTab === 'fauna') {
              mainTitle.textContent = 'Registro de Impacto o Posible Impacto';
              if (typeof cargarCatalogosFauna === 'function') cargarCatalogosFauna();
            } else if (targetTab === 'historial') {
              mainTitle.textContent = 'Historial de Reportes';
              if (typeof window.loadAdminReports === 'function') window.loadAdminReports();
              if (typeof window.resetHistorialFilters === 'function') window.resetHistorialFilters();
            } else if (targetTab === 'estadistica') {
              mainTitle.textContent = 'Estadísticas';
            } else if (targetTab === 'estadistica-aifa') {
              mainTitle.textContent = 'Estadística AIFA';
              if (typeof window.fesSwitchStatisticsScope === 'function') window.fesSwitchStatisticsScope('aifa');
              if (typeof cargarCatalogosFauna === 'function') cargarCatalogosFauna();
              if (typeof loadFaunaStatistics === 'function') loadFaunaStatistics();
            } else if (targetTab === 'estadistica-afac') {
              mainTitle.textContent = 'Estadística AFAC';
              if (typeof window.fesSwitchStatisticsScope === 'function') {
                window.fesSwitchStatisticsScope('afac');
              } else if (typeof loadAfacStatistics === 'function') {
                loadAfacStatistics();
              }
            } else if (targetTab === 'historial-fauna') {
              mainTitle.textContent = 'Historial de Reportes de Fauna';
              if (typeof cargarCatalogosFauna === 'function') cargarCatalogosFauna();
              if (typeof loadFaunaReports === 'function') loadFaunaReports({});
            }
          }

          if (targetTab === 'estadistica' && typeof loadEstadisticas === 'function') {
            loadEstadisticas();
          }
        }

        document.body.classList.add('sidebar-hidden');
      });
    });

    var menuToggleBtn = document.getElementById('menu-toggle-btn');
    if (menuToggleBtn) {
      menuToggleBtn.addEventListener('click', function () {
        document.body.classList.remove('sidebar-hidden');
      });
    }

    // Collapse sidebar button (inside brand)
    var collapseBtn = document.getElementById('sidebar-collapse-btn');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', function () {
        document.body.classList.add('sidebar-hidden');
      });
    }

    // Collapsible sidebar groups (using open class → CSS max-height animation)
    document.querySelectorAll('.sidebar-group-toggle').forEach(function (toggleBtn) {
      toggleBtn.addEventListener('click', function () {
        var group = this.closest('.sidebar-group');
        if (group) {
          group.classList.toggle('open');
        }
      });
    });

    // Update user avatar initial when user info is shown
    var userEmailEl = document.getElementById('user-email');
    if (userEmailEl) {
      var avatarEl = document.getElementById('sidebar-user-initial');
      var observer = new MutationObserver(function () {
        if (avatarEl) {
          var text = userEmailEl.textContent || '';
          avatarEl.textContent = text.charAt(0).toUpperCase() || 'U';
        }
      });
      observer.observe(userEmailEl, { childList: true, characterData: true, subtree: true });
    }
  }

  return { init: init };
})();
