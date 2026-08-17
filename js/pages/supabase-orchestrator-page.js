window.MHRSupabaseOrchestratorPage = (function () {
  function init() {
    var supabase = window.supabaseClient;
    var helpers = window.MHRSupabaseHelpers || {};
    var APP_CONFIG = helpers.APP_CONFIG || {};
    var isSafeStoragePath = helpers.isSafeStoragePath || function (path) { return !!path; };
    var resolvePdfUrl = helpers.resolvePdfUrl || (async function () { return null; });

    if (!supabase) {
      console.error('Error inicializando Supabase: window.supabaseClient no disponible');
      return;
    }

    if (window.MHRAuthSessionPage && typeof window.MHRAuthSessionPage.init === 'function') {
      window.MHRAuthSessionPage.init({ supabase: supabase });
    }

    // Inicializar módulo de Estadísticas SO y capturar su API
    var estadisticaSoApi = null;
    if (window.MHREstadisticaSoPage && typeof window.MHREstadisticaSoPage.init === 'function') {
      estadisticaSoApi = window.MHREstadisticaSoPage.init();
    }

    if (window.MHRMainTabsPage && typeof window.MHRMainTabsPage.init === 'function') {
      window.MHRMainTabsPage.init({
        cargarCatalogosFauna: function () { if (typeof window.cargarCatalogosFauna === 'function') window.cargarCatalogosFauna(); },
        loadFaunaStatistics:  function () { if (typeof window.loadFaunaStatistics  === 'function') window.loadFaunaStatistics(); },
        loadFaunaReports:     function (f) { if (typeof window.loadFaunaReports    === 'function') window.loadFaunaReports(f || {}); },
        loadEstadisticas: estadisticaSoApi ? estadisticaSoApi.loadEstadisticas : null
      });
    }

    if (window.MHRFaunaSubmitPage && typeof window.MHRFaunaSubmitPage.init === 'function') {
      window.MHRFaunaSubmitPage.init({ supabase: supabase });
    }

    if (window.MHROfflineReportSyncPage && typeof window.MHROfflineReportSyncPage.init === 'function') {
      window.MHROfflineReportSyncPage.init({ supabase: supabase });
    }

    if (window.MHRFaunaDashboardPage && typeof window.MHRFaunaDashboardPage.init === 'function') {
      window.MHRFaunaDashboardPage.init({
        supabase: supabase,
        helpers: helpers,
        APP_CONFIG: APP_CONFIG,
        isSafeStoragePath: isSafeStoragePath,
        resolvePdfUrl: resolvePdfUrl
      });
    }

    // Función global para cargar todos los datos automáticamente tras el login
    window.mhrAutoLoadData = function () {
      // Pequeño delay para que Supabase client y módulos estén listos
      setTimeout(function () {
        try { if (typeof window.loadFaunaStatistics === 'function') window.loadFaunaStatistics(); } catch(e) {}
        try { if (typeof window.loadFaunaReports === 'function') window.loadFaunaReports({}); } catch(e) {}
        try { if (typeof window.loadAdminReports === 'function') window.loadAdminReports(); } catch(e) {}
        try { if (estadisticaSoApi && typeof estadisticaSoApi.loadEstadisticas === 'function') estadisticaSoApi.loadEstadisticas(); } catch(e) {}
      }, 800);
    };

    document.addEventListener('DOMContentLoaded', function () {
      if (window.MHRFaunaInteractionsPage && typeof window.MHRFaunaInteractionsPage.init === 'function') {
        window.MHRFaunaInteractionsPage.init({ cargarCatalogosFauna: window.cargarCatalogosFauna });
      }

      // Notificación de Impacto con Fauna (forma oficial AFAC)
      if (window.MHRFaunaAfacPage && typeof window.MHRFaunaAfacPage.init === 'function') {
        window.MHRFaunaAfacPage.init();
      }

      if (window.MHROfflineSyncPage && typeof window.MHROfflineSyncPage.init === 'function') {
        window.MHROfflineSyncPage.init({
          showOfflineBanner: window.showOfflineBanner,
          hideOfflineBanner: window.hideOfflineBanner,
          getPendingReports: window.getPendingReports
        });
      }
    });
  }

  return { init: init };
})();
