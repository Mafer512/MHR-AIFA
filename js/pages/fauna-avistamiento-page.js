/* ============================================================================
 * Notificación de Avistamiento de Fauna — Forma AFAC-SA-FAUNA-A/ene-22
 * Interacciones, validación y recolección de datos de la pestaña "Avistamiento".
 *
 * Expone window.MHRFaunaAvistamientoPage con init/collect/validate/reset.
 * ==========================================================================*/
(function () {
    'use strict';

    // Casilla 19 — el formato oficial numera A, B, C, E, F, G (omite la D).
    var ATRAYENTES = {
        A: 'Vertedero de basura',
        B: 'Cuerpo de agua',
        C: 'Vegetación',
        E: 'Actividades Agrícolas',
        F: 'Actividades Comerciales',
        G: 'Otro'
    };

    function wrap() { return document.getElementById('avi-form-wrap'); }

    function field(name) {
        var w = wrap();
        return w ? w.querySelector('[name="' + name + '"]') : null;
    }

    function val(name) {
        var el = field(name);
        return el ? (el.value || '').toString().trim() : '';
    }

    function radioVal(name) {
        var w = wrap();
        if (!w) return '';
        var el = w.querySelector('input[name="' + name + '"]:checked');
        return el ? el.value : '';
    }

    function checkedValues(name) {
        var w = wrap();
        if (!w) return [];
        return Array.prototype.map.call(
            w.querySelectorAll('input[name="' + name + '"]:checked'),
            function (el) { return el.value; }
        );
    }

    // "Si"/"No"/"" → true/false/null
    function triState(raw) {
        if (raw === 'Si') return true;
        if (raw === 'No') return false;
        return null;
    }

    /* ── Hora: 12 h + AM/PM (oficial) ⇄ 24 h ──────────────────────────── */

    function normalizeHora(el) {
        var m = /^(\d{1,2}):?([0-5]\d)?$/.exec((el.value || '').trim());
        if (!m) return;
        var h = parseInt(m[1], 10);
        var min = m[2] || '00';
        if (isNaN(h) || h > 23) return;

        var meridiano = '';
        if (h === 0) { h = 12; meridiano = 'AM'; }
        else if (h === 12) { meridiano = 'PM'; }
        else if (h > 12) { h -= 12; meridiano = 'PM'; }

        el.value = String(h).padStart(2, '0') + ':' + min;
        if (meridiano) {
            var r = document.querySelector('#avi-form-wrap input[name="avi_meridiano"][value="' + meridiano + '"]');
            if (r && !r.checked) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
        }
    }

    function hora24(hora12, meridiano) {
        var m = /^(\d{1,2}):([0-5]\d)$/.exec((hora12 || '').trim());
        if (!m) return '';
        var h = parseInt(m[1], 10);
        if (isNaN(h)) return '';
        if (meridiano === 'PM' && h < 12) h += 12;
        if (meridiano === 'AM' && h === 12) h = 0;
        if (h > 23) return '';
        return String(h).padStart(2, '0') + ':' + m[2];
    }

    /* ── Recolección ───────────────────────────────────────────────────── */

    function collect() {
        var horaOficial = val('avi_hora_evento');
        var meridiano = radioVal('avi_meridiano');
        var restos = triState(radioVal('avi_restos_fauna'));
        var efectos = triState(radioVal('avi_efectos_operacion'));
        var atrayentes = checkedValues('avi_atrayentes');

        var lugarEl = field('avi_ubicacion[lugar]');
        var lat = null, lng = null, ubicacionTexto = '';
        if (lugarEl) {
            ubicacionTexto = (lugarEl.value || '').trim();
            var la = parseFloat(lugarEl.dataset.lat);
            var ln = parseFloat(lugarEl.dataset.lng);
            if (!isNaN(la) && !isNaN(ln)) { lat = la; lng = ln; }
        }

        var avi = {
            // 1-2 · Momento del avistamiento
            fecha_evento: val('avi_fecha_evento') || null,
            hora_evento: horaOficial,
            meridiano: meridiano,
            hora_evento_24h: hora24(horaOficial, meridiano),
            // 3
            luz_solar: radioVal('avi_luz_solar'),
            // 4-7 · Lugar
            aerodromo: val('avi_aerodromo').toUpperCase(),
            altura_agl: val('avi_altura_agl'),
            ubicacion_aerodromo: val('avi_ubicacion_aerodromo'),
            ubicacion_ruta: val('avi_ubicacion_ruta'),
            // 8-9
            restos_fauna: restos,
            restos_descripcion: restos === true ? val('avi_restos_descripcion') : '',
            efectos_operacion: efectos,
            efectos_descripcion: efectos === true ? val('avi_efectos_descripcion') : '',
            // 10-13 · Meteorología
            condicion_cielo: radioVal('avi_condicion_cielo'),
            precipitacion: radioVal('avi_precipitacion'),
            temperatura: radioVal('avi_temperatura'),
            viento: radioVal('avi_viento'),
            // 14-18 · Fauna avistada
            especie_fauna: val('avi_especie'),
            tamano_ejemplares: radioVal('avi_tamano'),
            caracteristicas: val('avi_caracteristicas'),
            ejemplares_avistados: radioVal('avi_ejemplares'),
            comportamiento: val('avi_comportamiento'),
            // 19
            atrayentes: atrayentes,
            atrayentes_descripcion: val('avi_atrayentes_descripcion'),
            // 20-23 · Quien reporta
            reportado_por: val('avi_reportado_por'),
            puesto: val('avi_puesto'),
            empresa: val('avi_empresa'),
            fecha_reporte: val('avi_fecha_reporte') || null,
            // Apartado adicional AIFA
            ubicacion_texto: ubicacionTexto,
            ubicacion_lat: lat,
            ubicacion_lng: lng
        };

        avi.atrayentes_texto = atrayentes.map(function (c) { return ATRAYENTES[c] || c; });
        return avi;
    }

    /* ── Validación ────────────────────────────────────────────────────── */

    function markInvalid(el, invalid) {
        if (el) el.classList.toggle('afac-invalid', !!invalid);
    }

    function showStatus(msg, kind) {
        var box = document.getElementById('avi-status');
        if (!box) return;
        box.className = 'afac-status' + (msg ? ' afac-status-' + (kind || 'error') : '');
        box.innerHTML = msg || '';
        if (msg) box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function validate() {
        var w = wrap();
        if (!w) return { ok: false, errors: ['No se encontró el formulario de avistamiento.'] };

        var errors = [];

        Array.prototype.forEach.call(w.querySelectorAll('[data-afac-required]'), function (el) {
            var empty = !(el.value || '').trim();
            markInvalid(el, empty);
            if (empty) errors.push(el.getAttribute('data-afac-required'));
        });

        if (val('avi_hora_evento') && !radioVal('avi_meridiano')) {
            errors.push('AM / PM de la hora del evento (casilla 2)');
        }
        if (!radioVal('avi_ejemplares')) {
            errors.push('Número de ejemplares avistados (casilla 17)');
        }
        // El instructivo permite omitir la especie sólo si se describen las
        // características de la fauna avistada (casilla 16).
        if (!val('avi_especie') && !val('avi_caracteristicas')) {
            errors.push('Especie de fauna (casilla 14) o, si no se conoce, ' +
                'las características de la fauna avistada (casilla 16)');
        }

        showStatus(
            errors.length
                ? '<strong>Faltan datos obligatorios:</strong><br>• ' + errors.join('<br>• ')
                : '',
            'error'
        );

        return { ok: errors.length === 0, errors: errors };
    }

    /* ── Reset ─────────────────────────────────────────────────────────── */

    function todayISO() {
        var d = new Date();
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }

    function reset() {
        var w = wrap();
        if (!w) return;

        Array.prototype.forEach.call(w.querySelectorAll('input, textarea'), function (el) {
            if (el.type === 'checkbox' || el.type === 'radio') el.checked = false;
            else el.value = '';
            el.classList.remove('afac-invalid');
            delete el.dataset.lat;
            delete el.dataset.lng;
            delete el.dataset.mapImage;
            delete el.dataset.mapsUrl;
        });

        var aerodromo = field('avi_aerodromo');
        if (aerodromo) aerodromo.value = 'MMSM';
        var empresa = field('avi_empresa');
        if (empresa) empresa.value = 'Aeropuerto Internacional Felipe Ángeles';
        var fechaReporte = field('avi_fecha_reporte');
        if (fechaReporte) fechaReporte.value = todayISO();

        var thumb = document.getElementById('avi-map-thumb');
        if (thumb) { thumb.style.display = 'none'; thumb.removeAttribute('src'); }

        syncCheckStyles();
        toggleDescripciones();
        showStatus('');
    }

    function syncCheckStyles() {
        var w = wrap();
        if (!w) return;
        Array.prototype.forEach.call(w.querySelectorAll('.afac-check'), function (lbl) {
            var input = lbl.querySelector('input');
            lbl.classList.toggle('afac-check-on', !!(input && input.checked));
        });
    }

    // Casillas 8 y 9: la descripción sólo aplica cuando la respuesta es "Si"
    function toggleDescripciones() {
        [['avi_restos_fauna', 'avi_restos_descripcion'],
         ['avi_efectos_operacion', 'avi_efectos_descripcion']].forEach(function (pair) {
            var el = field(pair[1]);
            if (!el) return;
            var si = radioVal(pair[0]) === 'Si';
            el.disabled = !si;
            if (!si) el.value = '';
        });
    }

    /* ── Inicialización ────────────────────────────────────────────────── */

    var _wired = false;

    function init() {
        var w = wrap();
        if (!w || _wired) return;
        _wired = true;

        w.addEventListener('change', function (e) {
            if (e.target && (e.target.type === 'checkbox' || e.target.type === 'radio')) {
                syncCheckStyles();
                if (e.target.name === 'avi_restos_fauna' || e.target.name === 'avi_efectos_operacion') {
                    toggleDescripciones();
                }
            }
        });

        // Casilla 2 — máscara de hora
        var hora = field('avi_hora_evento');
        if (hora) {
            hora.addEventListener('input', function () {
                var v = hora.value.replace(/\D/g, '').slice(0, 4);
                if (v.length >= 3) v = v.slice(0, 2) + ':' + v.slice(2);
                hora.value = v;
            });
            hora.addEventListener('blur', function () { normalizeHora(hora); });
        }

        Array.prototype.forEach.call(w.querySelectorAll('[data-afac-required]'), function (el) {
            el.addEventListener('input', function () { markInvalid(el, false); });
        });

        var lugar = field('avi_ubicacion[lugar]');
        if (lugar) {
            lugar.addEventListener('change', function () {
                var thumb = document.getElementById('avi-map-thumb');
                if (!thumb) return;
                setTimeout(function () {
                    if (lugar.dataset.mapImage) {
                        thumb.src = lugar.dataset.mapImage;
                        thumb.style.display = 'block';
                    }
                }, 900);
            });
        }

        reset();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.MHRFaunaAvistamientoPage = {
        ATRAYENTES: ATRAYENTES,
        init: init,
        collect: collect,
        validate: validate,
        reset: reset,
        showStatus: showStatus,
        hora24: hora24
    };
})();
