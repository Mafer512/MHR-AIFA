/* ============================================================================
 * Envío de la Notificación de Impacto con Fauna (forma AFAC-SA-FAUNA-I/ene-22).
 *
 * Flujo: validar → recolectar → generar el PDF réplica → previsualizar →
 * subir a Storage → guardar en base de datos → refrescar historial.
 * ==========================================================================*/
(function () {
    'use strict';

    var BUCKET = 'fauna_impact_pdfs';

    function pad(n) { return String(n).padStart(2, '0'); }

    function buildFolio(now) {
        return now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + '-' +
            pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());
    }

    // Reutiliza el visor de PDF de la aplicación
    function showPreview(blob, filename) {
        var blobUrl = URL.createObjectURL(blob);
        var container = document.getElementById('pdf-preview-container');
        var frame = document.getElementById('pdf-preview-frame');
        var backdrop = document.getElementById('pdf-modal-backdrop');
        var spinner = document.getElementById('pdf-spinner');
        var downloadBtn = document.getElementById('pdf-download-btn');
        var closeBtn = document.getElementById('pdf-preview-close');

        if (spinner) spinner.style.display = 'none';
        if (frame) frame.src = blobUrl;
        if (container) {
            container.style.setProperty('display', 'flex', 'important');
            container.setAttribute('aria-hidden', 'false');
        }
        if (backdrop) backdrop.style.setProperty('display', 'block', 'important');

        if (downloadBtn) {
            downloadBtn.onclick = function () {
                var a = document.createElement('a');
                a.href = blobUrl;
                a.download = filename;
                a.click();
            };
        }
        if (closeBtn) {
            closeBtn.onclick = function () {
                if (container) container.style.setProperty('display', 'none', 'important');
                if (backdrop) backdrop.style.setProperty('display', 'none', 'important');
                if (frame) frame.src = '';
            };
        }
        return blobUrl;
    }

    async function uploadPdf(client, blob, folio) {
        var path = 'afac/' + Date.now() + '-' + folio + '.pdf';
        try {
            var up = await client.storage.from(BUCKET).upload(path, blob, { contentType: 'application/pdf' });
            if (up.error) {
                console.warn('No se pudo subir el PDF AFAC:', up.error.message);
                return null;
            }
            var pub = client.storage.from(BUCKET).getPublicUrl(path);
            return (pub && pub.data && pub.data.publicUrl) || null;
        } catch (err) {
            console.warn('Excepción subiendo el PDF AFAC:', err);
            return null;
        }
    }

    /**
     * Procesa el envío de la pestaña AFAC.
     * @returns {Promise<boolean>} true si el reporte quedó guardado.
     */
    async function submit(ctx) {
        ctx = ctx || {};
        var page = window.MHRFaunaAfacPage;
        var renderer = window.MHRAfacPdfRenderer;
        var service = window.MHRFaunaAfacService;

        if (!page || !renderer || !service) {
            alert('No se pudieron cargar los componentes de la notificación AFAC.');
            return false;
        }

        var check = page.validate();
        if (!check.ok) return false;

        var client = ctx.client || window.supabaseClient;
        if (!client) {
            page.showStatus('No hay conexión con la base de datos. Intenta de nuevo.', 'error');
            return false;
        }

        var data = page.collect();
        var folio = ctx.folio || buildFolio(new Date());
        var filename = 'AFAC-Impacto-Fauna-' + folio + '.pdf';

        page.showStatus('Generando la notificación en PDF…', 'ok');

        var result = await renderer.generate(data.afac, folio);
        showPreview(result.blob, filename);

        var pdfUrl = await uploadPdf(client, result.blob, folio);

        try {
            await service.saveAfacReport(client, {
                afac: data.afac,
                mapped: data.mapped,
                folio: folio,
                pdfUrl: pdfUrl
            });
        } catch (err) {
            console.error('Error guardando la notificación AFAC:', err);
            page.showStatus(
                'El PDF se generó, pero no se pudo guardar en la base de datos: ' +
                (err.message || err) + '. Descarga el archivo y reintenta.', 'error');
            return false;
        }

        page.reset();
        page.showStatus('Notificación AFAC ' + folio + ' generada y guardada correctamente.', 'ok');

        if (typeof window.loadFaunaReports === 'function') {
            setTimeout(function () { window.loadFaunaReports({}); }, 500);
        }
        return true;
    }

    window.MHRFaunaAfacSubmitPage = { submit: submit, buildFolio: buildFolio };
})();
