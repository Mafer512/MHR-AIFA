/* ============================================================================
 * Aplica los permisos de vistas en la aplicación.
 *
 * - Una vista sin permiso de lectura no aparece en el menú lateral, y su grupo
 *   se oculta si queda vacío.
 * - Una vista de sólo lectura se muestra, pero sin posibilidad de capturar.
 * - Si la vista activa deja de estar permitida, se salta a la primera válida.
 *
 * El catálogo y las reglas viven en js/services/permissions-service.js.
 * ==========================================================================*/
(function () {
    'use strict';

    var AUTH_STORAGE_KEY = 'mhr_current_user';
    var permisos = null;

    // Formulario de captura de cada vista editable
    var FORMULARIOS = {
        'revision': 'report-form',
        'fauna': 'fauna-form'
    };

    function usuarioActual() {
        try {
            var raw = localStorage.getItem(AUTH_STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function tabsDe(key) {
        return document.querySelectorAll('.sidebar-tab[data-tab="' + key + '"]');
    }

    /** Oculta del menú las vistas sin permiso de lectura. */
    function aplicarMenu(P) {
        var api = window.MHRPermissions;

        api.VISTAS.forEach(function (v) {
            if (v.key === 'admin-usuarios') return;   // se maneja aparte
            var visible = api.puedeVer(P, v.key);
            Array.prototype.forEach.call(tabsDe(v.key), function (tab) {
                tab.style.display = visible ? '' : 'none';
                tab.dataset.mhrPermitida = visible ? '1' : '0';
            });
            var seccion = document.getElementById(v.key + '-section');
            if (seccion && !visible) seccion.classList.remove('active');
        });

        // Un grupo sin vistas visibles no tiene por qué mostrarse.
        document.querySelectorAll('.sidebar-group').forEach(function (grupo) {
            var visibles = Array.prototype.filter.call(
                grupo.querySelectorAll('.sidebar-tab'),
                function (t) { return t.style.display !== 'none'; }
            );
            grupo.style.display = visibles.length ? '' : 'none';
        });

        // Entrada de Administración. Ojo: #admin-panel NO es esta entrada, es
        // la tabla del Historial SO (nombre heredado); se controla en aplicarHistorial.
        var admin = api.puedeVer(P, 'admin-usuarios');
        var popup = document.getElementById('sidebar-admin-popup');
        if (!admin && popup) popup.style.display = 'none';
        document.querySelectorAll('[onclick*="mhrOpenAdminPanel"]').forEach(function (el) {
            el.style.display = admin ? '' : 'none';
        });
    }

    /** Deja una vista en sólo lectura: sin formulario de captura. */
    function aplicarSoloLectura(key, puedeEditar) {
        var formId = FORMULARIOS[key];
        if (!formId) return;
        var form = document.getElementById(formId);
        if (!form) return;

        var aviso = document.getElementById('mhr-solo-lectura-' + key);

        if (puedeEditar) {
            form.style.display = '';
            if (aviso) aviso.style.display = 'none';
            return;
        }

        form.style.display = 'none';

        if (!aviso) {
            aviso = document.createElement('div');
            aviso.id = 'mhr-solo-lectura-' + key;
            aviso.style.cssText = 'max-width:760px;margin:0 auto;background:#fff7ed;' +
                'border:1px solid #fed7aa;border-radius:12px;padding:18px 22px;' +
                'color:#9a3412;font-size:14px;line-height:1.6;';
            aviso.innerHTML = '<strong>Consulta únicamente.</strong><br>' +
                'Tu usuario puede consultar esta sección, pero no tiene permiso para ' +
                'capturar reportes aquí. Si necesitas capturar, solicítalo al ' +
                'administrador del sistema.';
            if (form.parentNode) form.parentNode.insertBefore(aviso, form);
        }
        aviso.style.display = 'block';
    }

    /**
     * El Historial SO vive dentro de #admin-panel, oculto por omisión. Se
     * muestra a quien tenga permiso de verlo (ya no sólo a los roles admin) y
     * se marca de sólo lectura cuando no puede editarlo, lo que oculta los
     * botones de modificar y eliminar mediante CSS.
     */
    function aplicarHistorial(P) {
        var api = window.MHRPermissions;
        var panel = document.getElementById('admin-panel');
        var puedeVer = api.puedeVer(P, 'historial');
        if (panel) panel.style.display = puedeVer ? 'block' : 'none';

        var seccion = document.getElementById('historial-section');
        if (seccion) seccion.classList.toggle('mhr-sin-edicion', !api.puedeEditar(P, 'historial'));

        if (puedeVer && typeof window.loadAdminReports === 'function') {
            try { window.loadAdminReports(); } catch (e) { }
        }
    }

    /** Si la vista abierta ya no está permitida, mueve a la primera válida. */
    function asegurarVistaValida(P) {
        var api = window.MHRPermissions;
        var activa = document.querySelector('.content-section.active');
        var keyActiva = activa ? activa.id.replace(/-section$/, '') : null;

        if (keyActiva && api.puedeVer(P, keyActiva)) return;

        var primera = null;
        api.VISTAS.some(function (v) {
            if (v.key === 'admin-usuarios' || !api.puedeVer(P, v.key)) return false;
            var tab = document.querySelector('.sidebar-tab[data-tab="' + v.key + '"]');
            if (tab) { primera = tab; return true; }
            return false;
        });

        document.querySelectorAll('.content-section').forEach(function (s) { s.classList.remove('active'); });
        if (primera) primera.click();
    }

    /** Carga los permisos del usuario en sesión y los aplica. */
    async function aplicar() {
        var api = window.MHRPermissions;
        if (!api) return null;

        var user = usuarioActual();
        if (!user || !user.id) return null;

        var role = user.role || (user.user_metadata && user.user_metadata.role) || '';
        permisos = await api.cargarDeUsuario(window.supabaseClient, user.id, role);

        aplicarMenu(permisos);
        aplicarHistorial(permisos);
        api.VISTAS.forEach(function (v) {
            if (FORMULARIOS[v.key]) aplicarSoloLectura(v.key, api.puedeEditar(permisos, v.key));
        });
        asegurarVistaValida(permisos);

        return permisos;
    }

    window.MHRViewPermissions = {
        aplicar: aplicar,
        get: function () { return permisos; },
        puedeVer: function (key) { return window.MHRPermissions.puedeVer(permisos, key); },
        puedeEditar: function (key) { return window.MHRPermissions.puedeEditar(permisos, key); }
    };
})();
