/* Cola offline para el formulario de Control de Fauna. */
(function () {
    var KEY = 'mhr-offline-fauna-draft-v1';

    function serialize() {
        var form = document.getElementById('fauna-form');
        if (!form) return null;
        var values = {};
        Array.prototype.forEach.call(form.querySelectorAll('input,textarea,select'), function (el) {
            if (el.type === 'file' || (!el.name && !el.id)) return;
            var key = el.name || el.id;
            if (el.type === 'checkbox' || el.type === 'radio') {
                values[key] = values[key] || [];
                if (el.checked) values[key].push(el.value);
            } else values[key] = el.value;
        });
        var photos = {};
        Object.keys(window.faunaItemPhotos || {}).forEach(function (k) {
            photos[k] = (window.faunaItemPhotos[k] || []).map(function (p) {
                return { dataURL: p.dataURL, name: p.name || 'fauna.jpg' };
            });
        });
        var activeTab = document.querySelector('.fauna-tab-content.active');
        return {
            values: values,
            photos: photos,
            activeTab: activeTab ? activeTab.getAttribute('data-fauna-tab-content') : null,
            savedAt: Date.now()
        };
    }

    function restore(draft) {
        var form = document.getElementById('fauna-form');
        if (!form || !draft || !draft.values) return;

        // Restaurar la pestaña activa: determina qué reporte se vuelve a enviar
        // (Impacto, Rescate o la notificación oficial AFAC).
        if (draft.activeTab) {
            var tabBtn = document.querySelector('.fauna-tab[data-fauna-tab="' + draft.activeTab + '"]');
            if (tabBtn) tabBtn.click();
        }
        Object.keys(draft.values).forEach(function (key) {
            var selector = '[name="' + CSS.escape(key) + '"],#' + CSS.escape(key);
            Array.prototype.forEach.call(form.querySelectorAll(selector), function (el) {
                if (el.type === 'checkbox' || el.type === 'radio') {
                    el.checked = (draft.values[key] || []).indexOf(el.value) !== -1;
                } else el.value = draft.values[key];
                el.dispatchEvent(new Event('change', { bubbles: true }));
            });
        });
        window.faunaItemPhotos = draft.photos || {};
        form.dispatchEvent(new Event('input', { bubbles: true }));
    }

    window.saveFaunaFormOffline = function () {
        var draft = serialize();
        if (!draft) return;
        try {
            localStorage.setItem(KEY, JSON.stringify(draft));
            var banner = document.getElementById('offline-banner');
            if (banner) {
                banner.textContent = '📥 Sin conexión — reporte de fauna guardado localmente';
                banner.className = 'pending';
                banner.style.display = 'block';
            }
            alert('Reporte de fauna guardado en el dispositivo. Se enviará automáticamente al recuperar Internet.');
        } catch (e) {
            alert('No se pudo guardar el reporte de fauna localmente: ' + e.message);
        }
    };

    function retry() {
        if (!navigator.onLine) return;
        var raw;
        try { raw = localStorage.getItem(KEY); } catch (_) { return; }
        if (!raw || !window.MHRFaunaSubmitPage) return;
        var draft; try { draft = JSON.parse(raw); } catch (_) { return; }
        restore(draft);
        // Espera a que la sesión y los catálogos estén listos.
        setTimeout(function () {
            var form = document.getElementById('fauna-form');
            if (form) {
                window._mhrFaunaRetrying = true;
                form.requestSubmit();
            }
        }, 1200);
    }

    window.addEventListener('online', retry);
    window.addEventListener('load', function () {
        if (navigator.onLine) retry();
    });
})();
