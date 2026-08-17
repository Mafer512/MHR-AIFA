/* ============================================================================
 * Envío de la Notificación de Avistamiento de Fauna (AFAC-SA-FAUNA-A/ene-22).
 *
 * Flujo: validar → recolectar → generar el PDF réplica → previsualizar →
 * subir a Storage → guardar en base de datos.
 * ==========================================================================*/
(function () {
    'use strict';

    var BUCKET = 'fauna_impact_pdfs';

    function pad(n) { return String(n).padStart(2, '0'); }

    function buildFolio(now) {
        return now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + '-' +
            pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());
    }

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
        var path = 'avistamientos/' + Date.now() + '-' + folio + '.pdf';
        try {
            var up = await client.storage.from(BUCKET).upload(path, blob, { contentType: 'application/pdf' });
            if (up.error) {
                console.warn('No se pudo subir el PDF de avistamiento:', up.error.message);
                return null;
            }
            var pub = client.storage.from(BUCKET).getPublicUrl(path);
            return (pub && pub.data && pub.data.publicUrl) || null;
        } catch (err) {
            console.warn('Excepción subiendo el PDF de avistamiento:', err);
            return null;
        }
    }

    async function submit(ctx) {
        ctx = ctx || {};
        var page = window.MHRFaunaAvistamientoPage;
        var renderer = window.MHRAvistamientoPdfRenderer;
        var service = window.MHRFaunaAvistamientoService;

        if (!page || !renderer || !service) {
            alert('No se pudieron cargar los componentes de la notificación de avistamiento.');
            return false;
        }

        var check = page.validate();
        if (!check.ok) return false;

        var client = ctx.client || window.supabaseClient;
        if (!client) {
            page.showStatus('No hay conexión con la base de datos. Intenta de nuevo.', 'error');
            return false;
        }

        var avi = page.collect();
        var folio = ctx.folio || buildFolio(new Date());
        var filename = 'AFAC-Avistamiento-Fauna-' + folio + '.pdf';

        page.showStatus('Generando la notificación en PDF…', 'ok');

        var result = await renderer.generate(avi, folio);
        showPreview(result.blob, filename);

        var pdfUrl = await uploadPdf(client, result.blob, folio);

        try {
            await service.saveAvistamiento(client, { avi: avi, folio: folio, pdfUrl: pdfUrl });
        } catch (err) {
            console.error('Error guardando la notificación de avistamiento:', err);
            page.showStatus(
                'El PDF se generó, pero no se pudo guardar en la base de datos: ' +
                (err.message || err) + '. Descarga el archivo y reintenta.', 'error');
            return false;
        }

        page.reset();
        page.showStatus('Notificación de avistamiento ' + folio + ' generada y guardada correctamente.', 'ok');
        return true;
    }

    window.MHRFaunaAvistamientoSubmitPage = { submit: submit, buildFolio: buildFolio };
})();
