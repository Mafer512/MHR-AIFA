(function () {
    window.MHRUtils = window.MHRUtils || (function () {
        function toArray(nodes) { return Array.prototype.slice.call(nodes || []); }
        function pad2(n) { return n.toString().padStart(2, '0'); }

        function bindLockSelect(selectEl, resetBtn, opts) {
            if (!selectEl || !resetBtn) return;
            if (selectEl.dataset.mhrLockBound === '1') return;
            // El responsable y el cargo se toman de la sesión: no se desbloquean.
            if (selectEl.dataset.mhrIdentidad === '1') {
                resetBtn.style.display = 'none';
                return;
            }
            var options = opts || {};
            var clearOnReset = !!options.clearOnReset;

            selectEl.addEventListener('change', function () {
                if (!selectEl.value) return;
                selectEl.disabled = true;
                resetBtn.style.display = 'inline-block';
            });

            resetBtn.addEventListener('click', function () {
                if (selectEl.dataset.mhrIdentidad === '1') { resetBtn.style.display = 'none'; return; }
                selectEl.disabled = false;
                if (clearOnReset) selectEl.value = '';
                resetBtn.style.display = 'none';
            });
            selectEl.dataset.mhrLockBound = '1';
        }

        function bindTurnoVisibility(tipoName, sectionId, turnoName) {
            var tipoEls = toArray(document.getElementsByName(tipoName));
            var turnoSection = document.getElementById(sectionId);
            if (!tipoEls.length || !turnoSection) return;
            if (turnoSection.dataset.mhrTurnoBound === '1') return;

            function update() {
                var anyChecked = tipoEls.some(function (i) { return !!i.checked; });
                turnoSection.style.display = anyChecked ? 'block' : 'none';
                if (!anyChecked && turnoName) {
                    toArray(document.getElementsByName(turnoName)).forEach(function (r) { r.checked = false; });
                }
            }
            tipoEls.forEach(function (el) { el.addEventListener('change', update); });
            update();
            turnoSection.dataset.mhrTurnoBound = '1';
        }

        function debounce(fn, waitMs) {
            var timer = null;
            var wait = Number(waitMs || 250);
            return function () {
                var ctx = this;
                var args = arguments;
                if (timer) clearTimeout(timer);
                timer = setTimeout(function () { fn.apply(ctx, args); }, wait);
            };
        }

        function renderRows(containerEl, rowElements) {
            if (!containerEl || !rowElements || !rowElements.length) return;
            var frag = document.createDocumentFragment();
            rowElements.forEach(function (row) { if (row) frag.appendChild(row); });
            containerEl.appendChild(frag);
        }

        return {
            pad2: pad2,
            bindLockSelect: bindLockSelect,
            bindTurnoVisibility: bindTurnoVisibility,
            debounce: debounce,
            renderRows: renderRows
        };
    })();

    // ── Global PDF preview helper ──────────────────────────────────────────
    window.mhrOpenPdfPreview = function (url) {
        if (!url) return;
        // Normalizar URL: si viene relativa, intentar resolverla al origen actual
        try {
            if (typeof url === 'string' && !/^https?:\/\//i.test(url) && !url.startsWith('blob:') && !url.startsWith('data:')) {
                url = new URL(url, window.location.origin).href;
            }
        } catch (_) { /* noop */ }

        var preview  = document.getElementById('pdf-preview-container');
        var backdrop = document.getElementById('pdf-modal-backdrop');
        var iframe   = document.getElementById('pdf-preview-frame');
        var dlBtn    = document.getElementById('pdf-download-btn');
        var openTab  = document.getElementById('pdf-open-tab-btn');
        var closeBtn = document.getElementById('pdf-preview-close');
        var spinner  = document.getElementById('pdf-spinner');

        // Sin contenedor → abrir directo
        if (!preview || !iframe) {
            var a = document.createElement('a');
            a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            return;
        }

        // Detectar móvil/tablet Android/iOS: los iframes no renderizan PDFs en WebView/PWA
        var isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
                       (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent));

        // Reset estado previo
        iframe.onload = null;
        iframe.onerror = null;
        iframe.src = 'about:blank';

        var fallbackTimer;

        if (isMobile) {
            // ── Móvil: no usar iframe; mostrar panel con enlace directo ──────
            if (spinner) spinner.style.display = 'none';
            iframe.style.display = 'none';

            var mobilePanel = document.getElementById('pdf-mobile-panel');
            if (!mobilePanel) {
                mobilePanel = document.createElement('div');
                mobilePanel.id = 'pdf-mobile-panel';
                mobilePanel.style.cssText = 'flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:28px;text-align:center;';
                preview.insertBefore(mobilePanel, iframe);
            }
            var safeUrl = url.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
            mobilePanel.innerHTML =
                '<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' +
                '<p style="color:#374151;font-size:14px;margin:0;">Toca el bot\u00f3n para abrir el PDF:</p>' +
                '<a href="' + safeUrl + '" target="_blank" rel="noopener noreferrer" ' +
                'style="display:inline-flex;align-items:center;gap:10px;padding:14px 28px;background:#1d4ed8;color:#fff;border-radius:12px;font-size:16px;font-weight:700;text-decoration:none;-webkit-tap-highlight-color:transparent;">' +
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
                'Abrir PDF</a>';
            mobilePanel.style.display = 'flex';
        } else {
            // ── Escritorio: usar iframe con fallback ──────────────────────────
            var mp = document.getElementById('pdf-mobile-panel');
            if (mp) mp.style.display = 'none';

            if (spinner) spinner.style.display = '';
            iframe.style.display = '';

            var loaded = false;
            fallbackTimer = setTimeout(function () {
                if (!loaded) {
                    var fa = document.createElement('a');
                    fa.href = url; fa.target = '_blank'; fa.rel = 'noopener noreferrer';
                    document.body.appendChild(fa); fa.click(); document.body.removeChild(fa);
                }
            }, 8000);

            try { iframe.src = url; } catch (_) {
                clearTimeout(fallbackTimer);
                var ea = document.createElement('a');
                ea.href = url; ea.target = '_blank'; ea.rel = 'noopener noreferrer';
                document.body.appendChild(ea); ea.click(); document.body.removeChild(ea);
                return;
            }

            iframe.onload = function () {
                loaded = true;
                clearTimeout(fallbackTimer);
                if (spinner) spinner.style.display = 'none';
            };
            iframe.onerror = function () {
                clearTimeout(fallbackTimer);
                var oa = document.createElement('a');
                oa.href = url; oa.target = '_blank'; oa.rel = 'noopener noreferrer';
                document.body.appendChild(oa); oa.click(); document.body.removeChild(oa);
            };
        }

        // Botones de acción — funcionan como enlace nativo (evita window.open bloqueado)
        if (dlBtn) dlBtn.onclick = function () {
            var a = document.createElement('a');
            a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
        };
        if (openTab) openTab.onclick = function () {
            var a = document.createElement('a');
            a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
        };

        if (backdrop) backdrop.classList.add('pdf-visible');
        preview.removeAttribute('aria-hidden');
        preview.classList.add('pdf-visible');

        function _close() {
            clearTimeout(fallbackTimer);
            preview.classList.remove('pdf-visible');
            preview.setAttribute('aria-hidden', 'true');
            if (backdrop) backdrop.classList.remove('pdf-visible');
            iframe.onload = null;
            iframe.onerror = null;
            iframe.src = 'about:blank';
            iframe.style.display = '';
            var mp2 = document.getElementById('pdf-mobile-panel');
            if (mp2) mp2.style.display = 'none';
        }
        if (closeBtn) closeBtn.onclick = _close;
        if (backdrop) backdrop.onclick = _close;
    };
})();
