/* ============================================================================
 * Permisos de vistas por usuario.
 *
 * Se guardan en user_roles.permissions (jsonb), con dos listas:
 *
 *   {
 *     "allowed_sections":  ["revision", "historial"],   // qué puede VER
 *     "secciones_edicion": ["revision"]                 // dónde puede EDITAR
 *   }
 *
 * `allowed_sections` ya existía; `secciones_edicion` se añade para separar
 * "consultar" de "capturar". Ambas listas usan las mismas claves que los
 * botones del menú lateral (data-tab), de modo que ocultar una vista es
 * simplemente no incluir su clave.
 *
 * Compatibilidad: si un usuario no tiene listas configuradas, conserva el
 * acceso que tenía por su rol. Nadie pierde permisos al desplegar esto.
 * ==========================================================================*/
(function () {
    'use strict';

    // Catálogo de vistas. `key` coincide con data-tab del menú y con el id de
    // la sección (<key>-section). Es la única fuente de verdad, compartida por
    // la aplicación y el panel de administración.
    var VISTAS = [
        { grupo: 'Seguridad Operacional', key: 'revision', label: 'Formato de Revisión', editable: true },
        { grupo: 'Seguridad Operacional', key: 'historial', label: 'Historial SO', editable: false },
        { grupo: 'Seguridad Operacional', key: 'estadistica', label: 'Estadística SO', editable: false },
        { grupo: 'Control de Fauna', key: 'fauna', label: 'Captura de Fauna', editable: true },
        { grupo: 'Control de Fauna', key: 'historial-fauna', label: 'Historial de Fauna', editable: false },
        { grupo: 'Control de Fauna', key: 'estadistica-fauna', label: 'Estadística de Fauna', editable: false },
        { grupo: 'Administración', key: 'admin-usuarios', label: 'Administración', editable: false }
    ];

    // Roles con acceso completo: no dependen de las listas.
    var ROLES_TOTALES = ['admin', 'superuser', 'superadmin'];

    // Roles que históricamente podían capturar reportes. Se usan como valor por
    // omisión cuando el usuario aún no tiene `secciones_edicion` configurado.
    var ROLES_EDITORES = [
        'admin', 'editor', 'inspector', 'superuser', 'superadmin',
        'control_fauna', 'servicio_medico', 'colab_editor'
    ];

    function comoObjeto(valor) {
        if (!valor) return {};
        if (typeof valor === 'object') return valor;
        try { return JSON.parse(valor) || {}; } catch (e) { return {}; }
    }

    function comoLista(valor) {
        if (!Array.isArray(valor)) return null;
        return valor.map(function (v) { return String(v || '').trim(); }).filter(Boolean);
    }

    function todasLasClaves() {
        return VISTAS.map(function (v) { return v.key; });
    }

    /**
     * Traduce los permisos guardados a algo directamente utilizable.
     * @returns {{total:boolean, ver:string[], editar:string[]}}
     */
    function normalizar(permissions, role) {
        var rol = String(role || '').toLowerCase();
        var perms = comoObjeto(permissions);

        if (ROLES_TOTALES.indexOf(rol) !== -1) {
            return { total: true, ver: todasLasClaves(), editar: todasLasClaves() };
        }

        var ver = comoLista(perms.allowed_sections);
        if (ver === null) {
            // Sin configurar: conserva lo que veía antes (todo menos administración).
            ver = todasLasClaves().filter(function (k) { return k !== 'admin-usuarios'; });
        }

        var editar = comoLista(perms.secciones_edicion);
        if (editar === null) {
            // Sin configurar: se respeta la capacidad de captura de su rol.
            editar = ROLES_EDITORES.indexOf(rol) !== -1 ? ver.slice() : [];
        }

        // Sólo tiene sentido editar algo que se puede ver.
        editar = editar.filter(function (k) { return ver.indexOf(k) !== -1; });

        return { total: false, ver: ver, editar: editar };
    }

    function puedeVer(p, key) {
        return !!(p && (p.total || p.ver.indexOf(key) !== -1));
    }

    function puedeEditar(p, key) {
        return !!(p && (p.total || p.editar.indexOf(key) !== -1));
    }

    /** Lee de la base los permisos de un usuario y los normaliza. */
    async function cargarDeUsuario(client, userId, role) {
        if (!client || !userId) return normalizar(null, role);
        try {
            var r = await client.from('user_roles')
                .select('permissions, role')
                .eq('user_id', userId)
                .maybeSingle();
            if (r.error || !r.data) return normalizar(null, role);
            return normalizar(r.data.permissions, role || r.data.role);
        } catch (e) {
            console.warn('No se pudieron leer los permisos de vistas:', e);
            return normalizar(null, role);
        }
    }

    /** Construye el objeto a guardar en user_roles.permissions. */
    function construir(permissionsPrevias, ver, editar) {
        var perms = Object.assign({}, comoObjeto(permissionsPrevias));
        var claves = todasLasClaves();
        var listaVer = (ver || []).filter(function (k) { return claves.indexOf(k) !== -1; });
        var listaEditar = (editar || []).filter(function (k) {
            return claves.indexOf(k) !== -1 && listaVer.indexOf(k) !== -1;
        });
        perms.allowed_sections = listaVer;
        perms.secciones_edicion = listaEditar;
        return perms;
    }

    window.MHRPermissions = {
        VISTAS: VISTAS,
        ROLES_TOTALES: ROLES_TOTALES,
        ROLES_EDITORES: ROLES_EDITORES,
        todasLasClaves: todasLasClaves,
        normalizar: normalizar,
        puedeVer: puedeVer,
        puedeEditar: puedeEditar,
        cargarDeUsuario: cargarDeUsuario,
        construir: construir
    };
})();
