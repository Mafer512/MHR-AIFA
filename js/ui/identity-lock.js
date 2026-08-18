/* ============================================================================
 * Identidad del autor del reporte.
 *
 * Quien elabora un reporte es SIEMPRE el usuario con la sesión iniciada: el
 * nombre y el puesto se toman de su perfil y quedan fijos, para que nadie
 * pueda firmar un reporte a nombre de otra persona.
 *
 * Este módulo sólo cubre la interfaz. El sello definitivo lo pone la base de
 * datos (migración 20260818_sellar_autor_reportes.sql), que reescribe el autor
 * con la identidad autenticada aunque el navegador envíe otra cosa.
 * ==========================================================================*/
(function () {
    'use strict';

    var AUTH_STORAGE_KEY = 'mhr_current_user';
    var identidad = null;      // { nombre, cargo }
    var cargando = null;

    // Selects de responsable / cargo por formulario
    var SELECTS = [
        {   // Revisión del Área de Movimiento
            nombre: 'report-authors-select', resetNombre: 'report-authors-reset',
            cargo: 'report-role', resetCargo: 'report-role-reset', cargoOtro: 'report-role-other'
        },
        {   // Fauna — Registro de impacto
            nombre: 'fauna_report-authors-select', resetNombre: 'fauna_report-authors-reset',
            cargo: 'fauna_report-role', resetCargo: 'fauna_report-role-reset', cargoOtro: 'fauna_report-role-other'
        },
        {   // Fauna — Rescate y reubicación
            nombre: 'fauna_report-authors-select-rescate', resetNombre: 'fauna_report-authors-reset-rescate',
            cargo: 'fauna_report-role-rescate', resetCargo: 'fauna_report-role-reset-rescate', cargoOtro: 'fauna_report-role-other-rescate'
        }
    ];

    // Campos de texto de las formas oficiales AFAC
    var TEXTOS = [
        { nombre: 'afac_reportado_por', cargo: 'afac_puesto' },   // Impacto, casillas 25 y 26
        { nombre: 'avi_reportado_por', cargo: 'avi_puesto' }      // Avistamiento, casillas 20 y 21
    ];

    function usuarioActual() {
        try {
            var raw = localStorage.getItem(AUTH_STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    /** Lee nombre y puesto del perfil autenticado (una sola vez por sesión). */
    function cargar(forzar) {
        if (identidad && !forzar) return Promise.resolve(identidad);
        if (cargando && !forzar) return cargando;

        cargando = (async function () {
            var user = usuarioActual();
            if (!user || !user.id) return null;

            var perfil = null;
            var client = window.supabaseClient;
            if (client && window.MHRUserService && window.MHRUserService.getUserProfile) {
                try { perfil = await window.MHRUserService.getUserProfile(client, user.id); } catch (e) { }
            }

            var meta = user.user_metadata || {};
            var nombre = (perfil && perfil.full_name) || user.full_name || meta.full_name ||
                (perfil && perfil.username) || '';
            var cargo = (perfil && perfil.cargo) || meta.cargo || '';

            identidad = {
                nombre: String(nombre || '').trim(),
                cargo: String(cargo || '').trim()
            };
            return identidad;
        })();

        return cargando;
    }

    /** Deja un <select> con un único valor posible y sin forma de cambiarlo. */
    function fijarSelect(select, valor, botonCambiar) {
        if (!select || !valor) return false;

        var existe = Array.prototype.some.call(select.options, function (o) {
            return o.value === valor || (o.text || '').trim() === valor;
        });
        if (!existe) {
            var opt = document.createElement('option');
            opt.value = valor;
            opt.textContent = valor;
            select.appendChild(opt);
        }

        select.value = valor;
        if (select.value !== valor) {
            // El valor coincidía por texto y no por value
            Array.prototype.forEach.call(select.options, function (o, i) {
                if ((o.text || '').trim() === valor) select.selectedIndex = i;
            });
        }

        select.disabled = true;
        select.dataset.mhrIdentidad = '1';
        select.title = 'Se toma de tu sesión y no puede modificarse';
        if (botonCambiar) botonCambiar.style.display = 'none';
        return true;
    }

    /** Deja un campo de texto en sólo lectura con el dato de la sesión. */
    function fijarTexto(input, valor) {
        if (!input || !valor) return false;
        input.value = valor;
        input.readOnly = true;
        input.dataset.mhrIdentidad = '1';
        input.title = 'Se toma de tu sesión y no puede modificarse';
        input.style.background = '#f1f5f9';
        input.style.color = '#475569';
        input.removeAttribute('list');
        return true;
    }

    /**
     * Aplica la identidad a todos los formularios. Es idempotente: se llama al
     * iniciar sesión y después de cada limpieza o envío, porque `form.reset()`
     * devuelve los selects a su opción inicial aunque estén deshabilitados.
     */
    function fijar() {
        if (!identidad || !identidad.nombre) return false;

        SELECTS.forEach(function (cfg) {
            fijarSelect(document.getElementById(cfg.nombre), identidad.nombre,
                document.getElementById(cfg.resetNombre));

            if (identidad.cargo) {
                var ok = fijarSelect(document.getElementById(cfg.cargo), identidad.cargo,
                    document.getElementById(cfg.resetCargo));
                if (ok) {
                    var otro = document.getElementById(cfg.cargoOtro);
                    if (otro) { otro.value = ''; otro.style.display = 'none'; }
                }
            }
        });

        TEXTOS.forEach(function (cfg) {
            fijarTexto(document.querySelector('[name="' + cfg.nombre + '"]'), identidad.nombre);
            if (identidad.cargo) {
                fijarTexto(document.querySelector('[name="' + cfg.cargo + '"]'), identidad.cargo);
            }
        });

        return true;
    }

    /** Carga la identidad y la aplica. Seguro de llamar cuantas veces sea. */
    function aplicar(forzar) {
        return cargar(forzar).then(function () { return fijar(); });
    }

    /** ¿Este campo quedó sellado con la identidad de la sesión? */
    function estaFijado(el) {
        return !!(el && el.dataset && el.dataset.mhrIdentidad === '1');
    }

    window.MHRIdentity = {
        cargar: cargar,
        fijar: fijar,
        aplicar: aplicar,
        estaFijado: estaFijado,
        get: function () { return identidad; }
    };

    // Reaplicar cuando el formulario se reinicia tras generar un reporte.
    document.addEventListener('reset', function (e) {
        if (e.target && e.target.tagName === 'FORM') setTimeout(fijar, 0);
    }, true);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { aplicar(); });
    } else {
        aplicar();
    }
})();
