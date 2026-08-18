/* ============================================================================
 * Notificación de Impacto con Fauna — Forma oficial AFAC-SA-FAUNA-I/ene-22
 * Interacciones, validación y recolección de datos de la pestaña "AFAC".
 *
 * Expone window.MHRFaunaAfacPage con:
 *   init()      — engancha los eventos del formulario
 *   collect()   — devuelve { afac, mapped } con los datos capturados
 *   validate()  — valida las casillas obligatorias
 *   reset()     — limpia el formulario y restablece valores por omisión
 * ==========================================================================*/
(function () {
    'use strict';

    // Casilla 16 — catálogo de partes de la aeronave (código oficial → etiqueta)
    var PARTES = {
        A: 'Radomo',
        B: 'Parabrisas',
        C: 'Sección de Nariz (Excepto A y B)',
        D: 'Motor No. 1',
        E: 'Motor No. 2',
        F: 'Motor No. 3',
        G: 'Motor No. 4',
        H: 'Hélice',
        I: 'Ala/Rotor',
        J: 'Fuselaje',
        K: 'Tren de Aterrizaje',
        L: 'Sección de Cola',
        M: 'Luces',
        N: 'Otro'
    };

    // Casilla 15 — fase de la operación → fase de vuelo usada por la estadística
    var FASE_A_VUELO = {
        'C. Carrera de Despegue': 'Despegue',
        'D. Ascenso': 'Despegue',
        'H. Aterrizaje': 'Aterrizaje',
        'G. Aproximación': 'Aterrizaje'
    };

    function $(sel) { return document.querySelector(sel); }
    function wrap() { return document.getElementById('afac-form-wrap'); }

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

    function intOrNull(raw) {
        var n = parseInt(raw, 10);
        return isNaN(n) ? null : n;
    }

    /* ── Hora: 12 h + AM/PM (oficial) ⇄ 24 h (estadística) ─────────────── */

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
            var r = document.querySelector('#afac-form-wrap input[name="afac_meridiano"][value="' + meridiano + '"]');
            if (r && !r.checked) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
        }
    }

    // "02:30" + "PM" → "14:30"
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
        var partesImpactadas = checkedValues('afac_parte_impactada');
        var partesDanadas = checkedValues('afac_parte_danada');
        var efecto = checkedValues('afac_efecto');
        var horaOficial = val('afac_hora_evento');
        var meridiano = radioVal('afac_meridiano');
        var faseOperacion = radioVal('afac_fase_operacion');
        var cielo = radioVal('afac_condicion_cielo');
        var precip = radioVal('afac_precipitacion');
        var especie = val('afac_especie');
        var pilotoAdvertido = radioVal('afac_piloto_advertido');

        var lugarEl = field('afac_ubicacion[lugar]');
        var lat = null, lng = null, ubicacionTexto = '';
        if (lugarEl) {
            ubicacionTexto = (lugarEl.value || '').trim();
            var la = parseFloat(lugarEl.dataset.lat);
            var ln = parseFloat(lugarEl.dataset.lng);
            if (!isNaN(la) && !isNaN(ln)) { lat = la; lng = ln; }
        }

        var afac = {
            // 1-6 · Identificación de la aeronave
            explotador: val('afac_explotador'),
            marca_aeronave: val('afac_marca_aeronave'),
            modelo_aeronave: val('afac_modelo_aeronave'),
            matricula: val('afac_matricula').toUpperCase(),
            marca_motor: val('afac_marca_motor'),
            modelo_motor: val('afac_modelo_motor'),
            // 7-8 · Momento del evento
            fecha_evento: val('afac_fecha_evento') || null,
            hora_evento: horaOficial,
            meridiano: meridiano,
            hora_evento_24h: hora24(horaOficial, meridiano),
            // 9
            luz_solar: radioVal('afac_luz_solar'),
            // 10-14 · Lugar del evento
            aerodromo: val('afac_aerodromo').toUpperCase(),
            pista_utilizada: val('afac_pista_utilizada'),
            ubicacion_ruta: val('afac_ubicacion_ruta'),
            altura_agl: intOrNull(val('afac_altura_agl')),
            velocidad_ias: intOrNull(val('afac_velocidad_ias')),
            // 15
            fase_operacion: faseOperacion,
            // 16
            partes_impactadas: partesImpactadas,
            partes_danadas: partesDanadas,
            partes_otro: val('afac_partes_otro'),
            // 17
            efecto_operacion: efecto,
            efecto_otro: val('afac_efecto_otro'),
            // 18-19 · Meteorología
            condicion_cielo: cielo,
            precipitacion: precip,
            // 20-22 · Fauna
            especie_fauna: especie,
            tamano_ejemplares: radioVal('afac_tamano'),
            ejemplares_avistados: radioVal('afac_avistados'),
            ejemplares_impactados: radioVal('afac_impactados'),
            // 23-24
            piloto_advertido: pilotoAdvertido ? (pilotoAdvertido === 'SI') : null,
            piloto_advertido_por: pilotoAdvertido === 'SI' ? val('afac_piloto_advertido_por') : '',
            observaciones: val('afac_observaciones'),
            // 25-28 · Quien reporta
            reportado_por: val('afac_reportado_por'),
            puesto: val('afac_puesto'),
            empresa: val('afac_empresa'),
            fecha_reporte: val('afac_fecha_reporte') || null,
            // Apartado adicional AIFA
            ubicacion_texto: ubicacionTexto,
            ubicacion_lat: lat,
            ubicacion_lng: lng
        };

        afac.partes_impactadas_texto = partesImpactadas.map(function (c) { return PARTES[c] || c; });
        afac.partes_danadas_texto = partesDanadas.map(function (c) { return PARTES[c] || c; });

        // Condición meteorológica combinada, en el vocabulario que ya usa el módulo
        var meteo = '';
        if (precip && precip !== 'Ninguna') meteo = precip;
        else if (cielo) meteo = cielo === 'Medio Nublado' ? 'Nublado' : cielo;

        // Campos que alimentan las estadísticas existentes de fauna
        var mapped = {
            evento: 'Impacto',
            tipo_reporte: 'Impacto',
            fase_vuelo: FASE_A_VUELO[faseOperacion] || faseOperacion,
            hora_evento: afac.hora_evento_24h || null,
            condicion_meteo: meteo || null,
            pista: afac.pista_utilizada || null,
            responsable: afac.reportado_por || null,
            cargo: afac.puesto || null,
            aerolinea: afac.explotador || null,
            parte_avion: afac.partes_impactadas_texto.join(', ') || null,
            especie: especie || null,
            zona: afac.ubicacion_ruta || null,
            ubicacion_texto: ubicacionTexto || null,
            ubicacion_lat: lat,
            ubicacion_lng: lng,
            fecha_reporte: afac.fecha_evento || afac.fecha_reporte || null,
            estado: 'completado',
            origen: 'AFAC'
        };

        return { afac: afac, mapped: mapped };
    }

    /* ── Validación ────────────────────────────────────────────────────── */

    function markInvalid(el, invalid) {
        if (!el) return;
        el.classList.toggle('afac-invalid', !!invalid);
    }

    function showStatus(msg, kind) {
        var box = document.getElementById('afac-status');
        if (!box) return;
        box.className = 'afac-status' + (msg ? ' afac-status-' + (kind || 'error') : '');
        box.innerHTML = msg || '';
        if (msg) box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function validate() {
        var w = wrap();
        if (!w) return { ok: false, errors: ['No se encontró el formulario AFAC.'] };

        var errors = [];

        Array.prototype.forEach.call(w.querySelectorAll('[data-afac-required]'), function (el) {
            var empty = !(el.value || '').trim();
            markInvalid(el, empty);
            if (empty) errors.push(el.getAttribute('data-afac-required'));
        });

        if (val('afac_hora_evento') && !radioVal('afac_meridiano')) {
            errors.push('AM / PM de la hora del evento (casilla 8)');
        }
        if (!radioVal('afac_fase_operacion')) {
            errors.push('Fase de la operación (casilla 15)');
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

        // Valores por omisión de la operación en AIFA
        var aerodromo = field('afac_aerodromo');
        if (aerodromo) aerodromo.value = 'MMSM';
        var empresa = field('afac_empresa');
        if (empresa) empresa.value = 'Aeropuerto Internacional Felipe Ángeles';
        var fechaReporte = field('afac_fecha_reporte');
        if (fechaReporte) fechaReporte.value = todayISO();

        var thumb = document.getElementById('afac-map-thumb');
        if (thumb) { thumb.style.display = 'none'; thumb.removeAttribute('src'); }

        // Volver a tomar de la sesión quién reporta y su puesto
        if (window.MHRIdentity) window.MHRIdentity.fijar();

        syncCheckStyles();
        togglePilotoField();
        showStatus('');
    }

    /* ── Realce visual de las casillas marcadas ────────────────────────── */

    function syncCheckStyles() {
        var w = wrap();
        if (!w) return;
        Array.prototype.forEach.call(w.querySelectorAll('.afac-check'), function (lbl) {
            var input = lbl.querySelector('input');
            lbl.classList.toggle('afac-check-on', !!(input && input.checked));
        });
    }

    /* ── Casilla 23: el campo "¿quién advirtió?" sólo aplica con SI ────── */

    function togglePilotoField() {
        var el = field('afac_piloto_advertido_por');
        if (!el) return;
        var si = radioVal('afac_piloto_advertido') === 'SI';
        el.disabled = !si;
        if (!si) el.value = '';
    }

    /* ── Catálogo de aerolíneas para la casilla 1 (Explotador) ─────────── */

    // Se reutiliza el mismo formato "IATA - Nombre" que la pestaña de Impacto,
    // de modo que ambos reportes se agrupen en la estadística por aerolínea.
    function normalizeText(v) {
        return (v || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
    }

    function splitCodeAndName(rawValue) {
        var raw = (rawValue || '').trim();
        var match = raw.match(/^([A-Z0-9]{2,3})\s*-\s*(.+)$/i);
        if (match) return { code: match[1].toUpperCase(), name: match[2].trim() };
        return { code: '', name: raw };
    }

    async function loadExplotadorOptions() {
        var list = document.getElementById('afac-aerolinea-options');
        var client = window.supabaseClient;
        if (!list || !client || !window.MHRCatalogService) return;

        try {
            var airlines = new Map();
            var frequency = new Map();

            function upsert(rawValue, preferredCode) {
                var parts = splitCodeAndName(rawValue);
                if (!parts.name) return;
                var key = normalizeText(parts.name);
                var code = (preferredCode || parts.code || '').trim().toUpperCase();
                var current = airlines.get(key);
                if (!current) { airlines.set(key, { key: key, name: parts.name, code: code }); return; }
                if (!current.code && code) current.code = code;
            }

            var catalogRows = await window.MHRCatalogService.getCatalogoAerolineas(client);
            (catalogRows || []).forEach(function (row) {
                upsert((row.nombre_aerolinea || '').trim(), (row.codigo_iata || '').trim());
            });

            var usageRows = await window.MHRCatalogService.getUsoAerolineas(client);
            (usageRows || []).forEach(function (row) {
                var parsed = splitCodeAndName((row.aerolinea || '').trim());
                var key = normalizeText(parsed.name);
                if (!key) return;
                frequency.set(key, (frequency.get(key) || 0) + 1);
                upsert((row.aerolinea || '').trim(), parsed.code);
            });

            var items = Array.from(airlines.values()).map(function (item) {
                return { label: item.code ? (item.code + ' - ' + item.name) : item.name, key: item.key };
            });

            items.sort(function (a, b) {
                var diff = (frequency.get(b.key) || 0) - (frequency.get(a.key) || 0);
                return diff !== 0 ? diff : a.label.localeCompare(b.label, 'es');
            });

            list.innerHTML = items.map(function (item) {
                return '<option value="' + item.label.replace(/"/g, '&quot;') + '"></option>';
            }).join('');
        } catch (err) {
            console.warn('No se pudo cargar el catálogo de aerolíneas para AFAC:', err);
        }
    }

    /* ── Inicialización ────────────────────────────────────────────────── */

    var _wired = false;

    function init() {
        var w = wrap();
        if (!w || _wired) return;
        _wired = true;

        // Marcado visual de casillas
        w.addEventListener('change', function (e) {
            if (e.target && (e.target.type === 'checkbox' || e.target.type === 'radio')) {
                syncCheckStyles();
                if (e.target.name === 'afac_piloto_advertido') togglePilotoField();
            }
        });

        // Casilla 8 — máscara de hora
        var hora = field('afac_hora_evento');
        if (hora) {
            hora.addEventListener('input', function () {
                var v = hora.value.replace(/\D/g, '').slice(0, 4);
                if (v.length >= 3) v = v.slice(0, 2) + ':' + v.slice(2);
                hora.value = v;
            });
            hora.addEventListener('blur', function () { normalizeHora(hora); });
        }

        // Limpiar el realce de error al corregir
        Array.prototype.forEach.call(w.querySelectorAll('[data-afac-required]'), function (el) {
            el.addEventListener('input', function () { markInvalid(el, false); });
        });

        // Apartado adicional: miniatura del mapa al elegir ubicación
        var lugar = field('afac_ubicacion[lugar]');
        if (lugar) {
            lugar.addEventListener('change', function () {
                var thumb = document.getElementById('afac-map-thumb');
                if (!thumb) return;
                // El capturador de mapa escribe dataset.mapImage de forma asíncrona
                setTimeout(function () {
                    if (lugar.dataset.mapImage) {
                        thumb.src = lugar.dataset.mapImage;
                        thumb.style.display = 'block';
                    }
                }, 900);
            });
        }

        reset();
        loadExplotadorOptions();
    }

    // init() es idempotente: se llama aquí para que los valores por omisión
    // queden puestos aunque el orquestador arranque después de DOMContentLoaded.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.MHRFaunaAfacPage = {
        PARTES: PARTES,
        init: init,
        collect: collect,
        validate: validate,
        reset: reset,
        showStatus: showStatus,
        hora24: hora24
    };
})();
