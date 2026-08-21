document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('clear-all-btn');
    if (!btn) return;
    btn.addEventListener('click', function (e) {
        try { e.preventDefault(); e.stopPropagation(); } catch (err) { }

        var revisionSection = document.getElementById('revision-section');
        var faunaSection = document.getElementById('fauna-section');
        var isRevisionActive = revisionSection && revisionSection.classList.contains('active');
        var isFaunaActive = faunaSection && faunaSection.classList.contains('active');


        function removeDuplicateItems() {
            try {
                Array.prototype.slice.call(document.querySelectorAll('input[type="checkbox"][id*="_dup"]')).forEach(function (node) {
                    var id = node.id;
                    try {
                        var lbl = document.querySelector('label[for="' + id + '"]');
                        if (lbl && lbl.parentNode) lbl.parentNode.removeChild(lbl);
                        ['done_', 'update_', 'dup_', 'clear_'].forEach(function (pref) {
                            var b = document.getElementById(pref + id);
                            if (b && b.parentNode) b.parentNode.removeChild(b);
                        });
                        var det = document.getElementById('details_' + id);
                        if (det && det.parentNode) det.parentNode.removeChild(det);
                        if (node.parentNode) node.parentNode.removeChild(node);
                    } catch (e) { }
                });
                if (window.mhr && window.mhr.counters) window.mhr.counters = {};
            } catch (e) { }
        }

        if (isRevisionActive) {
            var itemCheckboxes = Array.prototype.slice.call(document.querySelectorAll('input[type="checkbox"][id^="tipo_"]'));
            itemCheckboxes.forEach(function (chk) {
                try {
                    var id = chk.id;
                    chk.checked = false;
                    chk.disabled = false;
                    var det = document.getElementById('details_' + id);
                    if (det) {
                        det.style.display = 'none';
                        Array.prototype.slice.call(det.querySelectorAll('input, textarea, select')).forEach(function (el) {
                            try {
                                if (el.type === 'checkbox' || el.type === 'radio') el.checked = false;
                                else el.value = '';
                                el.disabled = false;
                                if (el.classList && el.classList.contains('priority-select')) { el.style.backgroundColor = ''; el.classList.remove('prio-1','prio-2','prio-3'); }
                                if (el.classList && el.classList.contains('condicion-select')) { el.style.backgroundColor = ''; el.classList.remove('cond-ok','cond-bad','cond-na','cond-leve','cond-medio','cond-alto','cond-critico'); }
                            } catch (e) { }
                        });
                    }
                    var doneBtn = document.getElementById('done_' + id);
                    var updateBtn = document.getElementById('update_' + id);
                    if (doneBtn) doneBtn.style.display = 'none';
                    if (updateBtn) updateBtn.style.display = 'none';
                } catch (e) { console.error('Error clearing item', chk && chk.id, e); }
            });
        }

        try {
            if (isRevisionActive) {
                var form = document.getElementById('report-form');
                if (form) {
                    Array.prototype.slice.call(form.querySelectorAll('input, textarea, select')).forEach(function (el) {
                        try {
                            if (el.tagName === 'BUTTON' || (el.type && (el.type === 'submit' || el.type === 'button'))) return;
                            if (el.type === 'checkbox' || el.type === 'radio') {
                                el.checked = false;
                                el.disabled = false;
                            } else {
                                el.value = '';
                                el.disabled = false;
                            }
                            if (el.classList && el.classList.contains('priority-select')) { el.style.backgroundColor = ''; el.classList.remove('prio-1','prio-2','prio-3'); }
                            if (el.classList && el.classList.contains('condicion-select')) { el.style.backgroundColor = ''; el.classList.remove('cond-ok','cond-bad','cond-na','cond-leve','cond-medio','cond-alto','cond-critico'); }
                        } catch (e) { }
                    });
                }
            } else if (isFaunaActive) {
                var faunaForm = document.getElementById('fauna-form');
                if (faunaForm) {
                    Array.prototype.slice.call(faunaForm.querySelectorAll('input, textarea, select')).forEach(function (el) {
                        try {
                            if (el.tagName === 'BUTTON' || (el.type && (el.type === 'submit' || el.type === 'button'))) return;
                            if (el.type === 'checkbox' || el.type === 'radio') {
                                el.checked = false;
                                el.disabled = false;
                            } else {
                                el.value = '';
                                el.disabled = false;
                            }
                        } catch (e) { }
                    });
                }
                window.faunaRescateFotos = [];
                var fotosPreview = document.getElementById('fauna_rescate_fotos_preview');
                if (fotosPreview) fotosPreview.innerHTML = '';
            }
        } catch (e) { console.error('Error clearing form fields', e); }

        // El responsable y el cargo se vuelven a tomar de la sesión: limpiar
        // el formulario no debe permitir reportar a nombre de otra persona.
        try { if (window.MHRIdentity) window.MHRIdentity.fijar(); } catch (e) { }

        // Las firmas viven en canvas y no se limpian al vaciar inputs. Además
        // del dibujo se elimina su copia Base64 para que no pase al reporte siguiente.
        try {
            if (typeof window.limpiarTodasLasFirmas === 'function') window.limpiarTodasLasFirmas();
        } catch (e) { console.error('Error clearing signatures', e); }

        if (isRevisionActive) {
            try {
                var authorSel = document.getElementById('report-authors-select');
                var authorReset = document.getElementById('report-authors-reset');
                if (authorSel && !window.MHRIdentity?.estaFijado(authorSel)) {
                    authorSel.value = ''; authorSel.disabled = false;
                }
                if (authorReset) authorReset.style.display = 'none';

                var roleSel = document.getElementById('report-role');
                var roleReset = document.getElementById('report-role-reset');
                var roleOther = document.getElementById('report-role-other');
                if (roleSel && !window.MHRIdentity?.estaFijado(roleSel)) {
                    roleSel.selectedIndex = 0; roleSel.disabled = false;
                }
                if (roleReset) roleReset.style.display = 'none';
                if (roleOther) { roleOther.value = ''; roleOther.style.display = 'none'; }

                var pistaBtn = document.getElementById('pista-change-btn');
                if (pistaBtn) pistaBtn.style.display = 'none';
                Array.prototype.slice.call(document.querySelectorAll('label.pista-option')).forEach(function (lbl) { try { lbl.classList.remove('selected'); } catch (e) { } });
                Array.prototype.slice.call(document.querySelectorAll('input[name="pista"]')).forEach(function (r) {
                    try { r.checked = false; r.disabled = false; } catch (e) { }
                });
            } catch (e) { }
        } else if (isFaunaActive) {
            try {
                var faunaAuthorSel = document.getElementById('fauna_report-authors-select');
                var faunaAuthorReset = document.getElementById('fauna_report-authors-reset');
                if (faunaAuthorSel && !window.MHRIdentity?.estaFijado(faunaAuthorSel)) {
                    faunaAuthorSel.value = ''; faunaAuthorSel.disabled = false;
                }
                if (faunaAuthorReset) faunaAuthorReset.style.display = 'none';

                var faunaPistaBtn = document.getElementById('fauna_pista-change-btn');
                if (faunaPistaBtn) faunaPistaBtn.style.display = 'none';
                Array.prototype.slice.call(document.querySelectorAll('input[name="fauna_pista"]')).forEach(function (r) {
                    try { r.checked = false; r.disabled = false; } catch (e) { }
                });
            } catch (e) { }
        }

        if (isRevisionActive) {
            try {
                removeDuplicateItems();
                Array.prototype.slice.call(document.querySelectorAll('[id^="details_"]')).forEach(function (d) { try { d.style.display = 'none'; } catch (e) { } });
                if (window.itemPhotos) window.itemPhotos = {};
                Array.prototype.slice.call(document.querySelectorAll('.photo-previews, .dynamic-photo-previews')).forEach(function (p) { try { p.innerHTML = ''; } catch (e) { } });
                var selCont = document.getElementById('item-selected-container');
                if (selCont) selCont.innerHTML = '';
                if (window.mhr && typeof window.mhr.resetItemSelector === 'function') {
                    try { window.mhr.resetItemSelector(); } catch (e) { }
                }
            } catch (e) { }
        }
        try {
            localStorage.removeItem('mhr_form_state_v1');
            sessionStorage.removeItem('mhr_form_state_v1');
            window.faunaCatalogosCache = {};
            if (window.saveFormState) {
                setTimeout(function () {
                    try { window.saveFormState(); } catch (e) { }
                }, 50);
            }
        } catch (e) { console.error('Error clearing persisted cache/state', e); }

        var original = btn.textContent;
        btn.textContent = 'Limpiado';
        setTimeout(function () { btn.textContent = original; }, 1800);
    });
});
