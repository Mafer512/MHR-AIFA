/* ============================================================================
 * Persistencia de la Notificación de Avistamiento de Fauna (forma AFAC).
 *
 * A diferencia de la notificación de impacto, este reporte no se replica en
 * public.fauna_reports: vive por completo en public.fauna_afac_avistamiento
 * y alimenta únicamente el tablero de Estadística AFAC.
 * ==========================================================================*/
(function () {
    'use strict';

    function buildRow(avi, folio, pdfUrl) {
        return {
            folio: folio,
            fecha_evento: avi.fecha_evento || null,
            hora_evento: avi.hora_evento || null,
            meridiano: avi.meridiano || null,
            hora_evento_24h: avi.hora_evento_24h || null,
            luz_solar: avi.luz_solar || null,
            aerodromo: avi.aerodromo || null,
            altura_agl: avi.altura_agl || null,
            ubicacion_aerodromo: avi.ubicacion_aerodromo || null,
            ubicacion_ruta: avi.ubicacion_ruta || null,
            restos_fauna: avi.restos_fauna,
            restos_descripcion: avi.restos_descripcion || null,
            efectos_operacion: avi.efectos_operacion,
            efectos_descripcion: avi.efectos_descripcion || null,
            condicion_cielo: avi.condicion_cielo || null,
            precipitacion: avi.precipitacion || null,
            temperatura: avi.temperatura || null,
            viento: avi.viento || null,
            especie_fauna: avi.especie_fauna || null,
            tamano_ejemplares: avi.tamano_ejemplares || null,
            caracteristicas: avi.caracteristicas || null,
            ejemplares_avistados: avi.ejemplares_avistados || null,
            comportamiento: avi.comportamiento || null,
            atrayentes: avi.atrayentes || [],
            atrayentes_descripcion: avi.atrayentes_descripcion || null,
            reportado_por: avi.reportado_por || null,
            puesto: avi.puesto || null,
            empresa: avi.empresa || null,
            fecha_reporte: avi.fecha_reporte || null,
            ubicacion_lat: avi.ubicacion_lat,
            ubicacion_lng: avi.ubicacion_lng,
            ubicacion_texto: avi.ubicacion_texto || null,
            pdf_url: pdfUrl || null
        };
    }

    window.MHRFaunaAvistamientoService = {
        buildRow: buildRow,

        async saveAvistamiento(client, opts) {
            var row = buildRow(opts.avi, opts.folio, opts.pdfUrl);
            var resp = await client.from('fauna_afac_avistamiento').insert([row]).select();
            if (resp.error) throw resp.error;
            return (resp.data && resp.data[0]) || null;
        },

        async getAvistamientos(client, filters) {
            filters = filters || {};
            var q = client.from('fauna_afac_avistamiento').select('*');
            if (filters.fechaDesde) q = q.gte('fecha_evento', filters.fechaDesde);
            if (filters.fechaHasta) q = q.lte('fecha_evento', filters.fechaHasta);
            if (filters.especie) q = q.eq('especie_fauna', filters.especie);
            var resp = await q.order('fecha_evento', { ascending: false });
            if (resp.error) throw resp.error;
            return resp.data || [];
        }
    };
})();
