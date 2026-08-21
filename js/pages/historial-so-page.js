/**
 * js/pages/historial-so-page.js
 * Carga, muestra y filtra los reportes de Seguridad Operacional en el
 * panel de historial (#admin-panel).
 *
 * Expone window.loadAdminReports() para que auth-session-page.js lo invoque
 * cuando el usuario con rol admin/superuser inicie sesión.
 */
(function () {
    'use strict';

    var allReports = [];            // caché de reportes cargados
    var currentFilteredReports = [];  // último conjunto filtrado (para export)
    var isLoading = false;
    var mailRecipients = [];

    function ensureMailTab() {
        var tabs = document.querySelector('#hso-panel-historial') && document.querySelector('#hso-panel-historial').previousElementSibling;
        var mailPanel = document.getElementById('hso-panel-destinatarios');
        var recipientPanel = document.getElementById('hso-mail-recipients-panel');
        if (!recipientPanel) return;
        if (!mailPanel) {
            mailPanel = document.createElement('div');
            mailPanel.id = 'hso-panel-destinatarios';
            mailPanel.style.display = 'none';
            var parent = document.getElementById('hso-panel-historial').parentNode;
            parent.appendChild(mailPanel);
        }
        if (recipientPanel.parentNode !== mailPanel) mailPanel.appendChild(recipientPanel);
        if (tabs && !document.getElementById('hso-tab-destinatarios')) {
            var btn = document.createElement('button');
            btn.id = 'hso-tab-destinatarios';
            btn.type = 'button';
            btn.textContent = '📧 Destinatarios';
            btn.onclick = function () { window.hsoSwitchTab('destinatarios'); };
            btn.style.cssText = 'padding:10px 22px;font-size:13px;font-weight:600;background:none;border:none;border-bottom:3px solid transparent;color:#6b7280;cursor:pointer;margin-bottom:-2px;';
            tabs.appendChild(btn);
        }
    }

    function hsoMailIsAdmin() {
        return ['admin', 'superuser', 'superadmin'].indexOf(String(window.mhrCurrentRole || '').trim().toLowerCase()) !== -1;
    }

    window.hsoMailShowForm = function () {
        if (!hsoMailIsAdmin()) return alert('Solo admins y superusers pueden administrar destinatarios.');
        var form = document.getElementById('hso-mail-form');
        if (form) form.style.display = 'block';
        var email = document.getElementById('hso-mail-email');
        if (email) email.focus();
    };
    window.hsoMailHideForm = function () {
        var form = document.getElementById('hso-mail-form');
        if (form) form.style.display = 'none';
        ['hso-mail-email', 'hso-mail-name', 'hso-mail-role'].forEach(function (id) { var el = document.getElementById(id); if (el) el.value = ''; });
    };
    window.hsoMailLoadRecipients = async function () {
        var list = document.getElementById('hso-mail-list');
        if (!list || !window.supabaseClient) return;
        var res = await window.supabaseClient.from('mhr_email_recipients').select('id,email,nombre,rol,activo').order('email');
        if (res.error) { list.textContent = 'No se pudo cargar la lista: ' + res.error.message; return; }
        mailRecipients = res.data || [];
        if (!mailRecipients.length) { list.textContent = 'No hay destinatarios configurados.'; return; }
        list.innerHTML = '<div style="display:grid;gap:6px;">' + mailRecipients.map(function (r) {
            var active = !!r.activo;
            return '<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:#fff;border:1px solid #e2e8f0;border-radius:7px;flex-wrap:wrap;">' +
                '<span style="flex:1;min-width:220px;"><strong style="color:#0f172a;">' + esc(r.email) + '</strong>' +
                (r.nombre ? ' <span style="color:#64748b;">— ' + esc(r.nombre) + '</span>' : '') +
                (r.rol ? '<small style="display:block;color:#64748b;">' + esc(r.rol) + '</small>' : '') + '</span>' +
                '<span style="color:' + (active ? '#15803d' : '#94a3b8') + ';font-size:12px;">' + (active ? '● Activo' : '○ Inactivo') + '</span>' +
                '<button type="button" onclick="hsoMailToggleRecipient(\'' + esc(r.id) + '\',' + active + ')" style="padding:5px 9px;border:1px solid #cbd5e1;background:#fff;border-radius:5px;cursor:pointer;">' + (active ? 'Desactivar' : 'Activar') + '</button>' +
                '<button type="button" onclick="hsoMailDeleteRecipient(\'' + esc(r.id) + '\',\'' + esc(r.email) + '\')" style="padding:5px 9px;border:1px solid #fecaca;background:#fff;color:#dc2626;border-radius:5px;cursor:pointer;">Eliminar</button>' +
                '</div>';
        }).join('') + '</div>';
    };
    window.hsoMailSaveRecipient = async function () {
        if (!hsoMailIsAdmin()) return alert('Solo admins y superusers pueden administrar destinatarios.');
        var email = (document.getElementById('hso-mail-email') || {}).value || '';
        var msg = document.getElementById('hso-mail-msg');
        email = email.trim().toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { if (msg) msg.textContent = 'Captura un correo válido.'; return; }
        var res = await window.supabaseClient.from('mhr_email_recipients').insert({ email: email, nombre: (document.getElementById('hso-mail-name') || {}).value || null, rol: (document.getElementById('hso-mail-role') || {}).value || null, activo: true });
        if (res.error) { if (msg) msg.textContent = res.error.message; return; }
        hsoMailHideForm(); hsoMailLoadRecipients();
    };
    window.hsoMailToggleRecipient = async function (id, active) {
        if (!hsoMailIsAdmin()) return;
        var res = await window.supabaseClient.from('mhr_email_recipients').update({ activo: !active }).eq('id', id);
        if (res.error) alert('No se pudo actualizar: ' + res.error.message); else hsoMailLoadRecipients();
    };
    window.hsoMailDeleteRecipient = async function (id, email) {
        if (!hsoMailIsAdmin() || !confirm('¿Eliminar a ' + email + '? Dejará de recibir correos.')) return;
        var res = await window.supabaseClient.from('mhr_email_recipients').delete().eq('id', id);
        if (res.error) alert('No se pudo eliminar: ' + res.error.message); else hsoMailLoadRecipients();
    };

    // ─── Helpers ────────────────────────────────────────────────────────────

    function esc(text) {
        return (text || '').toString().replace(/[&<>'"]/g, function (m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[m];
        });
    }

    /**
     * Convierte "DD/MM/YYYY HH:MM:SS" o ISO a objeto Date.
     * Devuelve null si no se puede parsear.
     */
    function parseReportDate(str) {
        if (!str) return null;
        str = String(str).trim();
        // ISO (created_at de Supabase)
        if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
            var d = new Date(str);
            return isNaN(d.getTime()) ? null : d;
        }
        // DD/MM/YYYY HH:MM:SS
        var m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
        if (m) {
            return new Date(
                parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]),
                parseInt(m[4] || 0), parseInt(m[5] || 0), parseInt(m[6] || 0)
            );
        }
        return null;
    }

    /**
     * Formatea para mostrar en la tabla: devuelve "DD/MM/YYYY HH:MM" o el
     * string original si no se puede parsear.
     */
    function formatDisplayDate(str) {
        if (!str) return '-';
        var d = parseReportDate(str);
        if (!d || isNaN(d.getTime())) return str;
        var pad = function (n) { return String(n).padStart(2, '0'); };
        return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() +
               ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }

    // ─── Chip group helpers ──────────────────────────────────────────────────

    function getChipValues(groupId) {
        var group = document.getElementById(groupId);
        if (!group) return [];
        return Array.prototype.slice.call(group.querySelectorAll('.filter-chip.active'))
            .map(function (btn) { return btn.dataset.value || btn.textContent.trim(); });
    }

    function wireChipGroups() {
        document.querySelectorAll('#admin-panel .filter-chip-group').forEach(function (group) {
            group.querySelectorAll('.filter-chip').forEach(function (chip) {
                chip.addEventListener('click', function () {
                    chip.classList.toggle('active');
                });
            });
        });
    }

    function resetChips() {
        document.querySelectorAll('#admin-panel .filter-chip.active').forEach(function (chip) {
            chip.classList.remove('active');
        });
    }

    // ─── Filter-multi dropdown wiring (Responsable only) ─────────────────────

    function wireFilterMultiToggles() {
        var toggles = document.querySelectorAll('#admin-panel .filter-multi-toggle');
        toggles.forEach(function (toggle) {
            toggle.addEventListener('click', function (e) {
                e.stopPropagation();
                var parent = toggle.closest('.filter-multi');
                if (!parent) return;
                var isOpen = parent.classList.contains('open');
                // Cierra todos los demás
                document.querySelectorAll('#admin-panel .filter-multi.open').forEach(function (el) {
                    el.classList.remove('open');
                });
                if (!isOpen) parent.classList.add('open');
            });

            toggle.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggle.click();
                }
            });
        });

        // Cierra al hacer click fuera
        document.addEventListener('click', function () {
            document.querySelectorAll('#admin-panel .filter-multi.open').forEach(function (el) {
                el.classList.remove('open');
            });
        });

        // Actualiza el texto del toggle cuando cambia la selección
        document.querySelectorAll('#admin-panel .filter-multi-select').forEach(function (sel) {
            sel.addEventListener('change', function () {
                updateToggleLabel(sel);
            });
        });
    }

    function updateToggleLabel(sel) {
        var parent = sel.closest('.filter-multi');
        if (!parent) return;
        var toggle = parent.querySelector('.filter-multi-toggle');
        if (!toggle) return;
        var selected = Array.prototype.slice.call(sel.selectedOptions || []).map(function (o) { return o.text; });
        var original = toggle.dataset.originalLabel || toggle.textContent.trim();
        if (!toggle.dataset.originalLabel) toggle.dataset.originalLabel = original;
        toggle.textContent = selected.length ? selected.join(', ') : original;
    }

    function resetToggleLabels() {
        document.querySelectorAll('#admin-panel .filter-multi-toggle').forEach(function (t) {
            if (t.dataset.originalLabel) t.textContent = t.dataset.originalLabel;
        });
    }

    // ─── Responsable filter population ──────────────────────────────────────

    function populateResponsableFilter(reports) {
        var sel = document.getElementById('filter-responsable');
        if (!sel) return;
        var existing = Array.prototype.slice.call(sel.options).map(function (o) { return o.value; });
        var names = {};
        reports.forEach(function (r) {
            var v = (r.responsable || '').trim();
            if (v && !names[v]) names[v] = true;
        });
        Object.keys(names).sort(function (a, b) { return a.localeCompare(b, 'es', { sensitivity: 'base' }); }).forEach(function (name) {
            if (existing.indexOf(name) === -1) {
                var opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                sel.appendChild(opt);
            }
        });
        // Ajusta el size para mostrar todas las opciones (máx 6)
        var count = sel.options.length;
        sel.size = Math.min(Math.max(count, 2), 6);
    }

    // ─── Apply filters ───────────────────────────────────────────────────────

    function getFilterValues() {
        function multiVals(id) {
            var sel = document.getElementById(id);
            if (!sel) return [];
            return Array.prototype.slice.call(sel.selectedOptions || []).map(function (o) { return o.value; });
        }

        return {
            folio:      ((document.getElementById('filter-folio') || {}).value || '').trim().toLowerCase(),
            fechaDesde: ((document.getElementById('filter-fecha-desde') || {}).value || '').trim(),
            fechaHasta: ((document.getElementById('filter-fecha-hasta') || {}).value || '').trim(),
            responsable: multiVals('filter-responsable'),
            tipo:       getChipValues('filter-tipo-group'),
            turno:      getChipValues('filter-turno-group'),
            pista:      getChipValues('filter-pista-group'),
            estatus:    getChipValues('filter-estatus-group')
        };
    }

    function applyFilters() {
        var f = getFilterValues();
        var fechaDesdeD = f.fechaDesde ? new Date(f.fechaDesde + 'T00:00:00') : null;
        var fechaHastaD = f.fechaHasta ? new Date(f.fechaHasta + 'T23:59:59') : null;

        var filtered = allReports.filter(function (r) {
            // Folio
            if (f.folio && !(r.folio || '').toLowerCase().includes(f.folio)) return false;

            // Fecha
            var rDate = parseReportDate(r.fecha_local) || parseReportDate(r.created_at);
            if (fechaDesdeD && rDate && rDate < fechaDesdeD) return false;
            if (fechaHastaD && rDate && rDate > fechaHastaD) return false;

            // Responsable (multi)
            if (f.responsable.length > 0) {
                var rResp = (r.responsable || '').trim();
                if (!f.responsable.some(function (v) { return rResp === v; })) return false;
            }

            // Tipo inspección (multi) — el campo almacenado puede ser "Primaria", "Secundaria" o "Primaria, Secundaria"
            if (f.tipo.length > 0) {
                var rTipo = (r.tipo_inspeccion || '').trim();
                var match = f.tipo.some(function (v) {
                    return rTipo.toLowerCase().includes(v.toLowerCase());
                });
                if (!match) return false;
            }

            // Turno (multi)
            if (f.turno.length > 0) {
                var rTurno = (r.turno || '').trim();
                if (!f.turno.some(function (v) { return rTurno.toLowerCase() === v.toLowerCase(); })) return false;
            }

            // Pista/RWY (multi)
            if (f.pista.length > 0) {
                var rPista = (r.pista || '').trim();
                if (!f.pista.some(function (v) { return rPista === v; })) return false;
            }

            // Estatus
            if (f.estatus.length > 0) {
                var rEstatus = (r.estatus || 'No Atendido').trim();
                if (!f.estatus.some(function (v) { return rEstatus === v; })) return false;
            }

            return true;
        });

        currentFilteredReports = filtered;
        renderReports(filtered);
    }

    // ─── Render table rows ───────────────────────────────────────────────────

    function renderReports(reports) {
        var tbody = document.getElementById('admin-reports-list');
        if (!tbody) return;

        if (!reports || reports.length === 0) {
            tbody.innerHTML =
                '<tr><td colspan="11" style="padding:20px;text-align:center;color:#6b7280;">' +
                'No hay reportes que coincidan con los filtros.</td></tr>';
            return;
        }

        var canEdit = ['admin', 'superuser', 'superadmin', 'ingenieria'].indexOf(String(window.mhrCurrentRole || '').toLowerCase()) !== -1;

        var html = '';
        reports.forEach(function (r) {
            var fecha = formatDisplayDate(r.fecha_local || r.created_at);
            var folio = esc(r.folio || '-');
            var responsable = esc(r.responsable || '-');
            var tipo = esc(r.tipo_inspeccion || '-');
            var turno = esc(r.turno || '-');
            var pista = esc(r.pista || '-');
            var estatus = r.estatus || 'No Atendido';
            var observacion = r.observacion || '';
            // Use safe data attribute — no inline onclick with UUID
            var ridAttr = 'data-hso-id="' + esc(String(r.id)) + '"';

            // Estatus — badge con icono + color, clicable para admins
            var estatusStyles = {
                'Atendido':    'background:#dcfce7;color:#166534',
                'No Atendido': 'background:#fee2e2;color:#991b1b',
                'En Proceso':  'background:#fef9c3;color:#854d0e'
            };
            var estatusIcons = {
                'Atendido':    '<span style="display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;background:#16a34a;color:#fff;font-size:9px;font-weight:900;">\u2714</span>',
                'No Atendido': '<span style="display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;background:#dc2626;color:#fff;font-size:9px;font-weight:900;">\u2715</span>',
                'En Proceso':  '<span style="display:inline-block;font-size:12px;line-height:1;">\u23F3</span>'
            };
            var estatusStyle = estatusStyles[estatus] || 'background:#f3f4f6;color:#374151';
            var estatusIcon  = estatusIcons[estatus] || '';
            var estatusCell;
            if (canEdit) {
                estatusCell = '<button class="hso-edit-trigger" ' + ridAttr + ' title="Haz clic para cambiar estatus / observaci\u00f3n" ' +
                    'style="display:inline-flex;align-items:center;gap:6px;padding:4px 11px;border-radius:20px;font-size:11px;font-weight:700;border:none;cursor:pointer;' + estatusStyle + ';">' +
                    estatusIcon + '<span>' + esc(estatus) + '</span>' +
                    '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
                    '</button>';
            } else {
                estatusCell = '<span style="display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;' + estatusStyle + ';">' + estatusIcon + '<span>' + esc(estatus) + '</span></span>';
            }

            // Observación — preview de texto + miniaturas de imágenes
            var obsImgs = [];
            try { obsImgs = JSON.parse(r.observacion_imagenes || '[]'); } catch (e) { obsImgs = []; }
            var hasImages = Array.isArray(obsImgs) && obsImgs.length > 0;
            var obsCell;
            if (observacion || hasImages) {
                var obsPreviewParts = '<div style="display:flex;flex-direction:column;gap:5px;min-width:160px;max-width:220px;">';
                if (observacion) {
                    obsPreviewParts += '<span title="' + esc(observacion) + '" style="display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;font-size:12px;color:#374151;line-height:1.4;word-break:break-word;">' + esc(observacion) + '</span>';
                }
                if (hasImages) {
                    obsPreviewParts += '<div style="display:flex;flex-wrap:wrap;gap:4px;">';
                    obsImgs.forEach(function (imgUrl) {
                        var safeUrl = imgUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
                        obsPreviewParts += '<button type="button" class="hso-image-preview" data-image-url="' + safeUrl + '" title="Ver imagen" style="display:inline-block;flex-shrink:0;padding:0;border:0;background:none;cursor:zoom-in;">' +
                            '<img src="' + safeUrl + '" loading="lazy" style="width:48px;height:48px;object-fit:cover;border-radius:5px;border:1px solid #e5e7eb;display:block;">' +
                            '</button>';
                    });
                    obsPreviewParts += '</div>';
                }
                if (canEdit) {
                    obsPreviewParts += '<button class="hso-edit-trigger" ' + ridAttr + ' title="Editar observaci\u00f3n" style="align-self:flex-start;background:none;border:none;cursor:pointer;color:#6b7280;font-size:11px;padding:0;display:inline-flex;align-items:center;gap:3px;">\u270f\ufe0f <span style="text-decoration:underline;">Editar</span></button>';
                }
                obsPreviewParts += '</div>';
                obsCell = obsPreviewParts;
            } else if (canEdit) {
                obsCell = '<button class="hso-edit-trigger" ' + ridAttr + ' style="background:none;border:none;cursor:pointer;color:#9ca3af;font-size:12px;">+ A\u00f1adir</button>';
            } else {
                obsCell = '<span style="color:#9ca3af;font-size:12px;">-</span>';
            }

            // PDF
            var pdfCell;
            if (r.pdf_url) {
                var pdfHref = r.pdf_url;
                if (pdfHref && !pdfHref.startsWith('http')) {
                    pdfHref = 'https://fgstncvuuhpgyzmjceyr.supabase.co/storage/v1/object/public/reports/' + pdfHref;
                }
                pdfCell = '<button class="hso-pdf-btn" data-pdf-url="' + esc(pdfHref) + '" ' +
                    'style="background:none;border:none;cursor:pointer;color:#1d4ed8;text-decoration:underline;font-weight:500;font-size:inherit;padding:0;">Ver PDF</button>';
            } else {
                pdfCell = '<span style="color:#9ca3af;font-size:12px;">Sin PDF</span>';
            }

            // Correo — botón para reenviar el reporte por correo (sólo admins)
            var mailCell;
            if (canEdit) {
                mailCell = '<button class="hso-mail-btn" ' + ridAttr + ' title="Reenviar este reporte por correo" ' +
                    'style="background:none;border:1px solid #cbd5e1;cursor:pointer;color:#2563eb;border-radius:6px;padding:3px 9px;font-size:12px;display:inline-flex;align-items:center;gap:4px;">' +
                    '📧 <span style="font-weight:600;">Enviar</span>' +
                    '</button>';
            } else {
                mailCell = '<span style="color:#9ca3af;font-size:12px;">-</span>';
            }
            var actionsCell = canEdit
                ? '<div style="display:flex;gap:5px;white-space:nowrap;">' +
                  '<button class="hso-edit-report-btn" ' + ridAttr + ' title="Modificar reporte" style="padding:5px 8px;border:1px solid #93c5fd;background:#eff6ff;color:#1d4ed8;border-radius:5px;cursor:pointer;font-size:11px;">✏️ Modificar</button>' +
                  '<button class="hso-delete-report-btn" ' + ridAttr + ' title="Eliminar reporte" style="padding:5px 8px;border:1px solid #fecaca;background:#fff;color:#dc2626;border-radius:5px;cursor:pointer;font-size:11px;">🗑️ Eliminar</button>' +
                  '</div>'
                : '<span style="color:#9ca3af;font-size:12px;">-</span>';

            html += '<tr>' +
                '<td style="white-space:nowrap;">' + fecha + '</td>' +
                '<td style="font-family:monospace;font-size:12px;">' + folio + '</td>' +
                '<td>' + responsable + '</td>' +
                '<td>' + tipo + '</td>' +
                '<td>' + turno + '</td>' +
                '<td>' + pista + '</td>' +
                '<td>' + estatusCell + '</td>' +
                '<td>' + obsCell + '</td>' +
                '<td>' + pdfCell + '</td>' +
                '<td>' + mailCell + '</td>' +
                '<td>' + actionsCell + '</td>' +
                '</tr>';
        });
        tbody.innerHTML = html;

        // Event delegation — handles all .hso-edit-trigger buttons regardless of UUID ids
        tbody.removeEventListener('click', _tbodyClickHandler);
        tbody.addEventListener('click', _tbodyClickHandler);
    }

    function _tbodyClickHandler(e) {
        var imageBtn = e.target.closest('.hso-image-preview');
        if (imageBtn) {
            _hsoShowImagePreview(imageBtn.dataset.imageUrl || '');
            return;
        }
        // PDF preview
        var pdfBtn = e.target.closest('.hso-pdf-btn');
        if (pdfBtn) {
            var url = pdfBtn.dataset.pdfUrl;
            if (url && typeof window.mhrOpenPdfPreview === 'function') window.mhrOpenPdfPreview(url);
            return;
        }
        // Reenviar por correo
        var mailBtn = e.target.closest('.hso-mail-btn');
        if (mailBtn) {
            var rid = mailBtn.dataset.hsoId;
            if (!rid) return;
            var role = String(window.mhrCurrentRole || '').toLowerCase();
            if (['admin', 'superuser', 'superadmin', 'ingenieria'].indexOf(role) === -1) return;
            _hsoSendMail(mailBtn, rid);
            return;
        }
        var deleteBtn = e.target.closest('.hso-delete-report-btn');
        if (deleteBtn) {
            if (!hsoMailIsAdmin()) return;
            window.hsoDeleteReport(deleteBtn.dataset.hsoId);
            return;
        }
        var editReportBtn = e.target.closest('.hso-edit-report-btn');
        if (editReportBtn) {
            if (!hsoMailIsAdmin()) return;
            window.hsoOpenEditModal(editReportBtn.dataset.hsoId);
            return;
        }
        var btn = e.target.closest('.hso-edit-trigger');
        if (!btn) return;
        var reportId = btn.dataset.hsoId;
        if (!reportId) return;
        // Re-check permission at click time
        var role = String(window.mhrCurrentRole || '').toLowerCase();
        if (['admin', 'superuser', 'superadmin', 'ingenieria'].indexOf(role) === -1) return;
        window.hsoOpenEditModal(reportId);
    }

    async function _hsoSendMail(btn, reportId) {
        if (!window.MHRReportMailer || !window.supabaseClient) {
            alert('Módulo de correo no disponible.');
            return;
        }
        if (!confirm('¿Enviar este reporte por correo a los destinatarios configurados?')) return;
        var original = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span style="font-weight:600;">Enviando…</span>';
        var res = await window.MHRReportMailer.sendReportEmail({ reportId: reportId });
        btn.disabled = false;
        if (res && res.ok) {
            btn.innerHTML = '✅ <span style="font-weight:600;">Enviado</span>';
            setTimeout(function () { btn.innerHTML = original; }, 2500);
        } else {
            btn.innerHTML = original;
            alert('No se pudo enviar: ' + ((res && res.error) || 'error desconocido'));
        }
    }

    // ─── Load from Supabase ──────────────────────────────────────────────────

    async function fetchReports() {
        var client = window.supabaseClient;
        if (!client) {
            console.warn('[HistorialSO] supabaseClient no disponible todavía.');
            return [];
        }
        var resp = await client
            .from('reports')
            .select('id, folio, fecha_local, created_at, tipo_inspeccion, turno, pista, responsable, cargo, pdf_url, estatus, observacion, observacion_imagenes')
            .order('created_at', { ascending: false })
            .limit(500);
        if (resp.error) {
            console.error('[HistorialSO] Error al cargar reportes:', resp.error);
            return [];
        }
        var reports = resp.data || [];
        if (window.MHRReportService && typeof window.MHRReportService.recoverMissingReportPdfUrls === 'function') {
            try {
                await window.MHRReportService.recoverMissingReportPdfUrls(window.supabaseClient, reports);
            } catch (pdfRecoveryError) {
                console.warn('[HistorialSO] No se pudieron recuperar enlaces PDF antiguos:', pdfRecoveryError);
            }
        }
        return reports;
    }

    function showLoadingState() {
        var tbody = document.getElementById('admin-reports-list');
        if (tbody) tbody.innerHTML =
            '<tr><td colspan="10" style="padding:20px;text-align:center;color:#6b7280;">Cargando reportes…</td></tr>';
    }

    function showErrorState(msg) {
        var tbody = document.getElementById('admin-reports-list');
        if (tbody) tbody.innerHTML =
            '<tr><td colspan="10" style="padding:20px;text-align:center;color:#ef4444;">' +
            esc(msg || 'Error al cargar reportes.') + '</td></tr>';
    }

    async function loadAdminReports() {
        ensureMailTab();
        if (isLoading) return;
        isLoading = true;
        showLoadingState();

        try {
            allReports = await fetchReports();
            currentFilteredReports = allReports.slice();
            populateResponsableFilter(allReports);
            renderReports(allReports);
            if (hsoMailIsAdmin()) window.hsoMailLoadRecipients();
        } catch (e) {
            console.error('[HistorialSO] Excepción al cargar:', e);
            showErrorState('Error al cargar reportes: ' + (e.message || e));
        } finally {
            isLoading = false;
        }
    }

    // ─── Init: wires buttons & dropdowns ────────────────────────────────────

    function init() {
        wireChipGroups();
        wireFilterMultiToggles();

        var applyBtn   = document.getElementById('filter-apply-btn');
        var clearBtn   = document.getElementById('filter-clear-btn');
        var refreshBtn = document.getElementById('refresh-admin-btn');
        var excelBtn   = document.getElementById('export-hso-excel-btn');

        if (applyBtn) {
            applyBtn.addEventListener('click', function () {
                applyFilters();
                // Cierra todos los dropdowns multi
                document.querySelectorAll('#admin-panel .filter-multi.open').forEach(function (el) {
                    el.classList.remove('open');
                });
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', function () {
                resetHistorialFilters();
                renderReports(allReports);
            });
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', function () {
                loadAdminReports();
            });
        }

        if (excelBtn) {
            excelBtn.addEventListener('click', function () {
                exportHistorialExcel();
            });
        }
    }

    // ─── Excel export (vista historial) ─────────────────────────────────────

    function exportHistorialExcel() {
        var rows = currentFilteredReports.length > 0 ? currentFilteredReports : allReports;
        if (rows.length === 0) { alert('No hay datos para exportar.'); return; }

        var BOM = '\uFEFF';
        var headers = ['"Fecha"', '"Folio"', '"Responsable"', '"Tipo Inspección"', '"Turno"', '"RWY"', '"Estatus"', '"Observación"', '"PDF"'].join(',');
        var lines = [headers];
        rows.forEach(function (r) {
            var fecha = formatDisplayDate(r.fecha_local || r.created_at);
            var cells = [
                '"' + String(fecha || '').replace(/"/g, '""') + '"',
                '"' + String(r.folio || '').replace(/"/g, '""') + '"',
                '"' + String(r.responsable || '').replace(/"/g, '""') + '"',
                '"' + String(r.tipo_inspeccion || '').replace(/"/g, '""') + '"',
                '"' + String(r.turno || '').replace(/"/g, '""') + '"',
                '"' + String(r.pista || '').replace(/"/g, '""') + '"',
                '"' + String(r.estatus || 'No Atendido').replace(/"/g, '""') + '"',
                '"' + String(r.observacion || '').replace(/"/g, '""') + '"',
                '"' + String(r.pdf_url || '').replace(/"/g, '""') + '"'
            ];
            lines.push(cells.join(','));
        });

        var csv = BOM + lines.join('\r\n');
        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        var now = new Date();
        var pad = function (n) { return String(n).padStart(2, '0'); };
        a.href = url;
        a.download = 'historial_so_' + now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + '.csv';
        a.click();
        URL.revokeObjectURL(url);
    }

    // ─── Tab switcher ────────────────────────────────────────────────────────

    window.hsoSwitchTab = function (tab) {
        var panelH = document.getElementById('hso-panel-historial');
        var btnH   = document.getElementById('hso-tab-historial');
        var panelM = document.getElementById('hso-panel-destinatarios');
        var btnM   = document.getElementById('hso-tab-destinatarios');

        var activeStyle   = 'padding:10px 22px;font-size:13px;font-weight:600;background:none;border:none;border-bottom:3px solid #2563eb;color:#2563eb;cursor:pointer;margin-bottom:-2px;';
        var inactiveStyle = 'padding:10px 22px;font-size:13px;font-weight:600;background:none;border:none;border-bottom:3px solid transparent;color:#6b7280;cursor:pointer;margin-bottom:-2px;';

        if (tab === 'historial') {
            if (panelH) panelH.style.display = '';
            if (panelM) panelM.style.display = 'none';
            if (btnH) btnH.style.cssText = activeStyle;
            if (btnM) btnM.style.cssText = inactiveStyle;
        } else if (tab === 'destinatarios') {
            if (panelH) panelH.style.display = 'none';
            if (panelM) panelM.style.display = '';
            if (btnH) btnH.style.cssText = inactiveStyle;
            if (btnM) btnM.style.cssText = activeStyle;
            if (hsoMailIsAdmin()) window.hsoMailLoadRecipients();
        } else {
            window.hsoSwitchTab('historial');
        }
    };


    // ─── Edit modal ──────────────────────────────────────────────────────────

    function _createEditModal() {
        var overlay = document.createElement('div');
        overlay.id = 'hso-edit-modal';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.55);z-index:9999;display:none;align-items:center;justify-content:center;';

        overlay.innerHTML =
            '<div style="background:#fff;border-radius:14px;padding:28px;max-width:560px;width:90%;max-height:88vh;overflow-y:auto;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.3);">' +
                '<h3 style="margin:0 0 4px;font-size:17px;color:#1e293b;">✏️ Editar Reporte</h3>' +
                '<p id="hso-modal-folio-label" style="margin:0 0 20px;font-size:13px;color:#64748b;"></p>' +

                '<div style="margin-bottom:16px;">' +
                    '<label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:8px;">Estatus</label>' +
                    '<div id="hso-modal-estatus-group" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">' +
                        '<button type="button" class="hso-estatus-opt" data-value="No Atendido" data-color="#dc2626" data-bg="#fee2e2" data-fg="#991b1b" ' +
                            'style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:14px 8px;border:2px solid #e5e7eb;border-radius:10px;background:#fff;cursor:pointer;font-size:12px;font-weight:600;color:#374151;transition:all .15s;">' +
                            '<span class="hso-estatus-icon" style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:#dc2626;color:#fff;font-size:16px;font-weight:900;">\u2715</span>' +
                            '<span>No Atendido</span>' +
                        '</button>' +
                        '<button type="button" class="hso-estatus-opt" data-value="En Proceso" data-color="#d97706" data-bg="#fef3c7" data-fg="#854d0e" ' +
                            'style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:14px 8px;border:2px solid #e5e7eb;border-radius:10px;background:#fff;cursor:pointer;font-size:12px;font-weight:600;color:#374151;transition:all .15s;">' +
                            '<span class="hso-estatus-icon" style="font-size:22px;line-height:1;">\u23F3</span>' +
                            '<span>En Proceso</span>' +
                        '</button>' +
                        '<button type="button" class="hso-estatus-opt" data-value="Atendido" data-color="#16a34a" data-bg="#dcfce7" data-fg="#166534" ' +
                            'style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:14px 8px;border:2px solid #e5e7eb;border-radius:10px;background:#fff;cursor:pointer;font-size:12px;font-weight:600;color:#374151;transition:all .15s;">' +
                            '<span class="hso-estatus-icon" style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:#16a34a;color:#fff;font-size:16px;font-weight:900;">\u2714</span>' +
                            '<span>Atendido</span>' +
                        '</button>' +
                    '</div>' +
                    '<input type="hidden" id="hso-modal-estatus" value="No Atendido">' +
                '</div>' +

                '<div style="margin-bottom:16px;">' +
                    '<label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;">Observación</label>' +
                    '<textarea id="hso-modal-observacion" rows="4" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;resize:vertical;" placeholder="Escribe una observación..."></textarea>' +
                '</div>' +

                '<div style="margin-bottom:20px;">' +
                    '<label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:8px;">Imágenes</label>' +
                    '<div style="margin-bottom:8px;">' +
                        '<p style="font-size:12px;color:#6b7280;margin:0 0 8px;">Imágenes existentes:</p>' +
                        '<div id="hso-modal-existing-imgs" style="display:flex;flex-wrap:wrap;gap:8px;min-height:20px;"></div>' +
                    '</div>' +
                    '<div style="margin-bottom:8px;">' +
                        '<p style="font-size:12px;color:#6b7280;margin:0 0 8px;">Añadir nuevas imágenes:</p>' +
                        '<div style="display:flex;gap:8px;margin-bottom:8px;">' +
                            '<button type="button" onclick="document.getElementById(\'hso-modal-img-galeria\').click()" style="padding:7px 14px;border:1px dashed #60a5fa;background:#eff6ff;color:#2563eb;border-radius:8px;cursor:pointer;font-size:13px;">🖼️ Galería</button>' +
                            '<button type="button" onclick="document.getElementById(\'hso-modal-img-camara\').click()" style="padding:7px 14px;border:1px dashed #60a5fa;background:#eff6ff;color:#2563eb;border-radius:8px;cursor:pointer;font-size:13px;">📷 Cámara</button>' +
                        '</div>' +
                        '<input type="file" id="hso-modal-img-galeria" accept="image/*" multiple style="display:none;" onchange="hsoHandleNewImages(this)">' +
                        '<input type="file" id="hso-modal-img-camara" accept="image/*" capture="environment" style="display:none;" onchange="hsoHandleNewImages(this)">' +
                        '<div id="hso-modal-new-imgs-preview" style="display:flex;flex-wrap:wrap;gap:8px;"></div>' +
                    '</div>' +
                '</div>' +

                '<div id="hso-modal-msg" style="margin-bottom:12px;font-size:13px;min-height:18px;"></div>' +

                '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
                    '<button onclick="hsoCloseEditModal()" style="padding:9px 22px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:8px;cursor:pointer;font-size:14px;">Cancelar</button>' +
                    '<button onclick="hsoSaveEdit()" id="hso-modal-save-btn" style="padding:9px 22px;background:#2563eb;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;">Guardar</button>' +
                '</div>' +
            '</div>';

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) hsoCloseEditModal();
        });

        document.body.appendChild(overlay);

        // Selector visual de estatus (botones tipo radio)
        var estatusGroup = overlay.querySelector('#hso-modal-estatus-group');
        if (estatusGroup) {
            estatusGroup.addEventListener('click', function (ev) {
                var btn = ev.target.closest('.hso-estatus-opt');
                if (!btn) return;
                _hsoSetEstatusButton(btn.dataset.value);
            });
        }

        return overlay;
    }

    function _hsoSetEstatusButton(value) {
        var hidden = document.getElementById('hso-modal-estatus');
        if (hidden) hidden.value = value;
        var group = document.getElementById('hso-modal-estatus-group');
        if (!group) return;
        Array.prototype.forEach.call(group.querySelectorAll('.hso-estatus-opt'), function (b) {
            var active = b.dataset.value === value;
            if (active) {
                b.style.borderColor = b.dataset.color;
                b.style.background  = b.dataset.bg;
                b.style.color       = b.dataset.fg;
                b.style.boxShadow   = '0 0 0 3px ' + b.dataset.color + '22';
            } else {
                b.style.borderColor = '#e5e7eb';
                b.style.background  = '#fff';
                b.style.color       = '#374151';
                b.style.boxShadow   = 'none';
            }
        });
    }

    window.hsoOpenEditModal = function (reportId) {
        var report = allReports.find(function (r) { return r.id == reportId; });
        if (!report) { alert('Reporte no encontrado.'); return; }

        var modal = document.getElementById('hso-edit-modal') || _createEditModal();
        modal.dataset.reportId = String(reportId);

        var folioLabel = document.getElementById('hso-modal-folio-label');
        if (folioLabel) folioLabel.textContent = 'Folio: ' + (report.folio || reportId);

        var estatusSel = document.getElementById('hso-modal-estatus');
        if (estatusSel) estatusSel.value = report.estatus || 'No Atendido';
        _hsoSetEstatusButton(report.estatus || 'No Atendido');

        var obsTA = document.getElementById('hso-modal-observacion');
        if (obsTA) obsTA.value = report.observacion || '';

        // Imágenes existentes
        var existingImgs = [];
        try { existingImgs = JSON.parse(report.observacion_imagenes || '[]'); } catch (e) { existingImgs = []; }
        _renderModalExistingImages(existingImgs);

        // Reset nuevas imágenes
        window._hsoNewImages = [];
        window._hsoRemovedImages = [];
        var newPreview = document.getElementById('hso-modal-new-imgs-preview');
        if (newPreview) newPreview.innerHTML = '';

        var msgEl = document.getElementById('hso-modal-msg');
        if (msgEl) msgEl.textContent = '';

        modal.style.display = 'flex';
    };

    window.hsoCloseEditModal = function () {
        var modal = document.getElementById('hso-edit-modal');
        if (modal) modal.style.display = 'none';
    };

    window.hsoDeleteReport = async function (reportId) {
        if (!hsoMailIsAdmin() || !reportId || !window.supabaseClient) return;
        var report = allReports.find(function (r) { return String(r.id) === String(reportId); });
        if (!report || !confirm('¿Eliminar el reporte ' + (report.folio || '') + '? Esta acción no se puede deshacer.')) return;
        var result = await window.supabaseClient.from('reports').delete().eq('id', reportId);
        if (result.error) {
            alert('No se pudo eliminar el reporte: ' + result.error.message);
            return;
        }
        allReports = allReports.filter(function (r) { return String(r.id) !== String(reportId); });
        currentFilteredReports = currentFilteredReports.filter(function (r) { return String(r.id) !== String(reportId); });
        renderReports(currentFilteredReports.length ? currentFilteredReports : allReports);
    };

    function _renderModalExistingImages(imageUrls) {
        var container = document.getElementById('hso-modal-existing-imgs');
        if (!container) return;
        if (!imageUrls || imageUrls.length === 0) {
            container.innerHTML = '<span style="font-size:12px;color:#9ca3af;">Sin imágenes.</span>';
            return;
        }
        var html = '';
        imageUrls.forEach(function (url, i) {
            var safeUrl = url.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
            html += '<div id="hso-existing-img-' + i + '" style="position:relative;display:inline-block;">' +
                '<button type="button" class="hso-image-preview" data-image-url="' + safeUrl + '" title="Ver imagen" style="display:block;padding:0;border:0;background:none;cursor:zoom-in;">' +
                '<img src="' + safeUrl + '" style="width:80px;height:80px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;" loading="lazy">' +
                '</button>' +
                '<button onclick="hsoRemoveExistingImage(' + i + ')" title="Eliminar imagen" style="position:absolute;top:-5px;right:-5px;background:#ef4444;color:#fff;border:none;border-radius:50%;width:20px;height:20px;cursor:pointer;font-size:12px;line-height:20px;padding:0;font-weight:700;">×</button>' +
                '</div>';
        });
        container.innerHTML = html;
    }

    function _hsoShowImagePreview(url) {
        if (!url) return;
        var overlay = document.getElementById('hso-image-preview-modal');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'hso-image-preview-modal';
            overlay.style.cssText = 'position:fixed;inset:0;z-index:10001;display:none;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;background:rgba(15,23,42,.82);cursor:zoom-out;';
            overlay.innerHTML = '<button type="button" aria-label="Cerrar previsualización" style="position:absolute;top:18px;right:22px;width:38px;height:38px;border:0;border-radius:50%;background:rgba(255,255,255,.18);color:#fff;font-size:25px;line-height:38px;cursor:pointer;">×</button>' +
                '<img alt="Previsualización de observación" style="max-width:calc(100vw - 48px);max-height:calc(100vh - 48px);object-fit:contain;border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,.5);cursor:default;">';
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay || e.target.tagName === 'BUTTON') overlay.style.display = 'none';
            });
            document.body.appendChild(overlay);
        }
        overlay.querySelector('img').src = url;
        overlay.style.display = 'flex';
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            var overlay = document.getElementById('hso-image-preview-modal');
            if (overlay) overlay.style.display = 'none';
        }
    });

    document.addEventListener('click', function (e) {
        var imageBtn = e.target.closest('.hso-image-preview');
        if (imageBtn && !imageBtn.closest('#admin-reports-list')) {
            e.preventDefault();
            _hsoShowImagePreview(imageBtn.dataset.imageUrl || '');
        }
    });

    window.hsoRemoveExistingImage = function (index) {
        var modal = document.getElementById('hso-edit-modal');
        var reportId = modal && modal.dataset.reportId;
        var report = allReports.find(function (r) { return r.id == reportId; });
        var imgs = [];
        try { imgs = JSON.parse((report && report.observacion_imagenes) || '[]'); } catch (e) { imgs = []; }

        window._hsoRemovedImages = window._hsoRemovedImages || [];
        if (imgs[index] && window._hsoRemovedImages.indexOf(imgs[index]) === -1) {
            window._hsoRemovedImages.push(imgs[index]);
        }

        var el = document.getElementById('hso-existing-img-' + index);
        if (el) {
            el.style.opacity = '0.3';
            el.style.pointerEvents = 'none';
        }
    };

    window.hsoHandleNewImages = function (input) {
        var files = Array.prototype.slice.call(input.files || []);
        files.forEach(function (file) {
            var reader = new FileReader();
            reader.onload = function (e) {
                window._hsoNewImages = window._hsoNewImages || [];
                window._hsoNewImages.push({ name: file.name, dataURL: e.target.result, file: file });
                _updateNewImagesPreview();
            };
            reader.readAsDataURL(file);
        });
        input.value = '';
    };

    function _updateNewImagesPreview() {
        var preview = document.getElementById('hso-modal-new-imgs-preview');
        if (!preview) return;
        var html = '';
        (window._hsoNewImages || []).forEach(function (img, i) {
            html += '<div style="position:relative;display:inline-block;">' +
                '<img src="' + img.dataURL + '" style="width:80px;height:80px;object-fit:cover;border-radius:6px;border:2px solid #60a5fa;">' +
                '<button onclick="hsoRemoveNewImage(' + i + ')" title="Quitar" style="position:absolute;top:-5px;right:-5px;background:#ef4444;color:#fff;border:none;border-radius:50%;width:20px;height:20px;cursor:pointer;font-size:12px;line-height:20px;padding:0;font-weight:700;">×</button>' +
                '</div>';
        });
        preview.innerHTML = html;
    }

    window.hsoRemoveNewImage = function (index) {
        if (!window._hsoNewImages) return;
        window._hsoNewImages.splice(index, 1);
        _updateNewImagesPreview();
    };

    function _dataURLtoBlob(dataURL) {
        var arr = dataURL.split(',');
        var mime = arr[0].match(/:(.*?);/)[1];
        var bstr = atob(arr[1]);
        var n = bstr.length;
        var u8arr = new Uint8Array(n);
        while (n--) { u8arr[n] = bstr.charCodeAt(n); }
        return new Blob([u8arr], { type: mime });
    }

    window.hsoSaveEdit = async function () {
        var modal = document.getElementById('hso-edit-modal');
        var reportId = modal && modal.dataset.reportId;
        if (!reportId) return;

        var estatusSel = document.getElementById('hso-modal-estatus');
        var obsTA      = document.getElementById('hso-modal-observacion');
        var msgEl      = document.getElementById('hso-modal-msg');
        var saveBtn    = document.getElementById('hso-modal-save-btn');

        var estatus    = estatusSel ? estatusSel.value : 'No Atendido';
        var observacion = obsTA ? obsTA.value.trim() : '';

        if (msgEl) { msgEl.style.color = '#374151'; msgEl.textContent = ''; }
        if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Guardando…'; }

        try {
            var client = window.supabaseClient;
            if (!client) throw new Error('No hay conexión con la base de datos.');

            var report = allReports.find(function (r) { return r.id == reportId; });
            var existingUrls = [];
            try { existingUrls = JSON.parse((report && report.observacion_imagenes) || '[]'); } catch (e) { existingUrls = []; }

            // Eliminar marcados para borrar
            var toRemove = window._hsoRemovedImages || [];
            existingUrls = existingUrls.filter(function (u) { return toRemove.indexOf(u) === -1; });

            // Subir nuevas imágenes al bucket 'reports'
            var newImages = window._hsoNewImages || [];
            for (var i = 0; i < newImages.length; i++) {
                var imgData = newImages[i];
                var blob = _dataURLtoBlob(imgData.dataURL);
                var ext = (imgData.name || 'img.jpg').split('.').pop().toLowerCase();
                var fileName = 'observaciones/' + reportId + '/' + Date.now() + '_' + i + '.' + ext;
                var uploadRes = await client.storage.from('reports').upload(fileName, blob, { contentType: blob.type, upsert: false });
                if (uploadRes.error) throw uploadRes.error;
                var urlRes = client.storage.from('reports').getPublicUrl(fileName);
                var publicUrl = urlRes.data && urlRes.data.publicUrl;
                if (publicUrl) existingUrls.push(publicUrl);
            }

            // Actualizar registro
            var updateRes = await client.from('reports').update({
                estatus: estatus,
                observacion: observacion || null,
                observacion_imagenes: JSON.stringify(existingUrls)
            }).eq('id', reportId);

            if (updateRes.error) throw updateRes.error;

            // Actualizar caché local
            if (report) {
                report.estatus = estatus;
                report.observacion = observacion;
                report.observacion_imagenes = JSON.stringify(existingUrls);
            }

            if (msgEl) { msgEl.style.color = '#16a34a'; msgEl.textContent = '✅ Guardado correctamente.'; }

            // Re-renderizar tabla
            applyFilters();

            setTimeout(function () { hsoCloseEditModal(); }, 800);

        } catch (e) {
            console.error('[HSOEdit] Error al guardar:', e);
            if (msgEl) { msgEl.style.color = '#dc2626'; msgEl.textContent = 'Error: ' + (e.message || 'No se pudo guardar.'); }
        } finally {
            if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Guardar'; }
        }
    };

    // ─── Expose globally ─────────────────────────────────────────────────────

    function resetHistorialFilters() {
        var folio = document.getElementById('filter-folio');
        var desde = document.getElementById('filter-fecha-desde');
        var hasta = document.getElementById('filter-fecha-hasta');
        if (folio) folio.value = '';
        if (desde) desde.value = '';
        if (hasta) hasta.value = '';
        var respSel = document.getElementById('filter-responsable');
        if (respSel) Array.prototype.forEach.call(respSel.options, function (o) { o.selected = false; });
        resetToggleLabels();
        resetChips();
        currentFilteredReports = allReports.slice();
    }

    window.loadAdminReports = loadAdminReports;
    window.resetHistorialFilters = resetHistorialFilters;

    // Auto-init on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
