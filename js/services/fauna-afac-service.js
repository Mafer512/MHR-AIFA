/* ============================================================================
 * Persistencia de la Notificación de Impacto con Fauna (forma AFAC).
 *
 * El reporte se guarda en dos lugares complementarios:
 *   1. public.fauna_reports        → copia de compatibilidad para historial y
 *                                    georreferencia; Estadística AIFA la excluye.
 *   2. public.fauna_afac_impacto   → las 28 casillas de la forma oficial.
 * ==========================================================================*/
(function () {
    'use strict';

    function norm(v) {
        return (v || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    }

    var _claseMap = null;

    // Resuelve la clase (Ave, Mamífero, …) a partir de la especie capturada,
    // para que el reporte aparezca en los filtros de clase del mapa de fauna.
    async function resolveClase(client, especie) {
        if (!client || !especie) return '';
        if (!_claseMap) {
            _claseMap = new Map();
            try {
                var res = await Promise.all([
                    client.from('catalogo_especie').select('nombre, clase_id'),
                    client.from('catalogo_clase').select('id, nombre')
                ]);
                var clases = {};
                ((res[1] && res[1].data) || []).forEach(function (c) { clases[c.id] = c.nombre; });
                ((res[0] && res[0].data) || []).forEach(function (e) {
                    if (e && e.nombre) _claseMap.set(norm(e.nombre), clases[e.clase_id] || '');
                });
            } catch (err) {
                console.warn('No se pudo resolver la clase de la especie:', err);
            }
        }
        return _claseMap.get(norm(especie)) || '';
    }

    // Detalle en el mismo formato que consumen las gráficas de impacto
    function buildDetalleItems(afac) {
        var fields = [];
        function push(key, value) {
            if (value === null || value === undefined || value === '') return;
            fields.push({ key: key, value: String(value) });
        }
        push('Ubicación', afac.ubicacion_texto);
        push('Especie', afac.especie_fauna);
        push('Cantidad', afac.ejemplares_impactados);
        push('Tamaño', afac.tamano_ejemplares);
        push('Ejemplares avistados', afac.ejemplares_avistados);
        push('Fase de la operación', afac.fase_operacion);
        push('Luz solar', afac.luz_solar);
        push('Efecto en la operación', (afac.efecto_operacion || []).join(', '));
        push('Partes impactadas', (afac.partes_impactadas_texto || []).join(', '));
        push('Partes dañadas', (afac.partes_danadas_texto || []).join(', '));
        push('Altura (AGL)', afac.altura_agl);
        push('Velocidad (IAS)', afac.velocidad_ias);
        push('Matrícula', afac.matricula);
        push('Observaciones', afac.observaciones);
        return [{ type: 'Notificación AFAC de Impacto con Fauna', fields: fields }];
    }

    // Fila para public.fauna_afac_impacto
    function buildAfacRow(afac, folio, faunaReportId, pdfUrl) {
        return {
            fauna_report_id: faunaReportId || null,
            folio: folio,
            explotador: afac.explotador || null,
            marca_aeronave: afac.marca_aeronave || null,
            modelo_aeronave: afac.modelo_aeronave || null,
            matricula: afac.matricula || null,
            marca_motor: afac.marca_motor || null,
            modelo_motor: afac.modelo_motor || null,
            fecha_evento: afac.fecha_evento || null,
            hora_evento: afac.hora_evento || null,
            meridiano: afac.meridiano || null,
            hora_evento_24h: afac.hora_evento_24h || null,
            luz_solar: afac.luz_solar || null,
            aerodromo: afac.aerodromo || null,
            pista_utilizada: afac.pista_utilizada || null,
            ubicacion_ruta: afac.ubicacion_ruta || null,
            altura_agl: afac.altura_agl,
            velocidad_ias: afac.velocidad_ias,
            fase_operacion: afac.fase_operacion || null,
            partes_impactadas: afac.partes_impactadas || [],
            partes_danadas: afac.partes_danadas || [],
            partes_otro: afac.partes_otro || null,
            efecto_operacion: afac.efecto_operacion || [],
            efecto_otro: afac.efecto_otro || null,
            condicion_cielo: afac.condicion_cielo || null,
            precipitacion: afac.precipitacion || null,
            especie_fauna: afac.especie_fauna || null,
            tamano_ejemplares: afac.tamano_ejemplares || null,
            ejemplares_avistados: afac.ejemplares_avistados || null,
            ejemplares_impactados: afac.ejemplares_impactados || null,
            piloto_advertido: afac.piloto_advertido,
            piloto_advertido_por: afac.piloto_advertido_por || null,
            observaciones: afac.observaciones || null,
            reportado_por: afac.reportado_por || null,
            puesto: afac.puesto || null,
            empresa: afac.empresa || null,
            fecha_reporte: afac.fecha_reporte || null,
            ubicacion_lat: afac.ubicacion_lat,
            ubicacion_lng: afac.ubicacion_lng,
            ubicacion_texto: afac.ubicacion_texto || null,
            pdf_url: pdfUrl || null
        };
    }

    window.MHRFaunaAfacService = {
        resolveClase: resolveClase,
        buildDetalleItems: buildDetalleItems,
        buildAfacRow: buildAfacRow,

        /**
         * Guarda la notificación completa.
         * @returns {Promise<{faunaReport: object|null, afac: object|null}>}
         */
        async saveAfacReport(client, opts) {
            var afac = opts.afac;
            var mapped = opts.mapped;
            var folio = opts.folio;
            var pdfUrl = opts.pdfUrl || null;

            var clase = await resolveClase(client, afac.especie_fauna);

            var reportPayload = Object.assign({}, mapped, {
                folio: folio,
                clase: clase || null,
                observaciones: afac.observaciones || null,
                detalle_items: buildDetalleItems(afac),
                pdf_url: pdfUrl
            });

            var inserted;
            try {
                inserted = await window.MHRFaunaReportService.insertFaunaReport(client, reportPayload);
            } catch (err) {
                // `origen` sólo existe tras aplicar la migración 20260817. Si aún
                // no se ha ejecutado, se guarda igual sin esa marca informativa.
                var missingColumn = /origen/i.test(err && (err.message || '')) &&
                    /column|columna/i.test(err.message || '');
                if (!missingColumn) throw err;
                delete reportPayload.origen;
                inserted = await window.MHRFaunaReportService.insertFaunaReport(client, reportPayload);
            }
            var faunaReport = (inserted && inserted[0]) || null;

            var afacRow = buildAfacRow(afac, folio, faunaReport && faunaReport.id, pdfUrl);
            var resp = await client.from('fauna_afac_impacto').insert([afacRow]).select();
            if (resp.error) throw resp.error;

            return { faunaReport: faunaReport, afac: (resp.data && resp.data[0]) || null };
        },

        async getAfacReports(client, filters) {
            filters = filters || {};
            var q = client.from('fauna_afac_impacto').select('*');
            if (filters.fechaDesde) q = q.gte('fecha_evento', filters.fechaDesde);
            if (filters.fechaHasta) q = q.lte('fecha_evento', filters.fechaHasta);
            if (filters.explotador) q = q.eq('explotador', filters.explotador);
            var resp = await q.order('fecha_evento', { ascending: false });
            if (resp.error) throw resp.error;
            return resp.data || [];
        }
    };
})();
