window.MHRFaunaSubmitPage = (function () {
  function init(ctx) {
    var supabase = ctx && ctx.supabase;
            var faunaForm = document.getElementById('fauna-form');
            if (faunaForm) {
                faunaForm.addEventListener('submit', async function (e) {
                    e.preventDefault();

                    if (!navigator.onLine) {
                        if (typeof window.saveFaunaFormOffline === 'function') window.saveFaunaFormOffline();
                        else alert('Sin conexión: no se pudo guardar el reporte de fauna localmente.');
                        return;
                    }
                    if (window._mhrFaunaRetrying) {
                        try { localStorage.removeItem('mhr-offline-fauna-draft-v1'); } catch (_) {}
                        window._mhrFaunaRetrying = false;
                    }

                    // Feedback visual
                    var submitBtn = faunaForm.querySelector('input[type="submit"]');
                    if (submitBtn) {
                        submitBtn.disabled = true;
                        submitBtn.value = 'Generando PDF...';
                    }

                    try {
                        // Recopilar datos de fauna
                        function pad(n) { return n.toString().padStart(2, '0'); }
                        var now = new Date();
                        var fechaLocal = pad(now.getDate()) + '/' + pad(now.getMonth() + 1) + '/' + now.getFullYear() + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
                        var folio = now.getFullYear().toString() + pad(now.getMonth() + 1) + pad(now.getDate()) + '-' + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());

                        // ═════════════════ DETECTAR PESTAÑA ACTIVA ═════════════════
                        var impactoTab = document.querySelector('.fauna-tab-content[data-fauna-tab-content="impacto"]');
                        var rescateTab = document.querySelector('.fauna-tab-content[data-fauna-tab-content="rescate"]');
                        var afacTab    = document.querySelector('.fauna-tab-content[data-fauna-tab-content="afac"]');
                        var avistTab   = document.querySelector('.fauna-tab-content[data-fauna-tab-content="avistamiento"]');
                        var isImpacto = impactoTab && impactoTab.classList.contains('active');
                        var isRescate = rescateTab && rescateTab.classList.contains('active');
                        var isAfac    = afacTab && afacTab.classList.contains('active');
                        var isAvist   = avistTab && avistTab.classList.contains('active');

                        // ═══ Notificación de Avistamiento de Fauna (forma oficial AFAC) ═══
                        if (isAvist) {
                            try {
                                await window.MHRFaunaAvistamientoSubmitPage.submit({
                                    client: window.supabaseClient,
                                    folio: folio
                                });
                            } catch (avistErr) {
                                console.error('Error en la notificación de avistamiento:', avistErr);
                                if (window.MHRFaunaAvistamientoPage) {
                                    window.MHRFaunaAvistamientoPage.showStatus('Error: ' + (avistErr.message || avistErr), 'error');
                                } else {
                                    alert('Error: ' + (avistErr.message || avistErr));
                                }
                            } finally {
                                if (submitBtn) {
                                    submitBtn.disabled = false;
                                    submitBtn.value = 'Generar notificación de avistamiento';
                                }
                            }
                            return;
                        }

                        // ═══ Notificación de Impacto con Fauna (forma oficial AFAC) ═══
                        if (isAfac) {
                            try {
                                await window.MHRFaunaAfacSubmitPage.submit({
                                    client: window.supabaseClient,
                                    folio: folio
                                });
                            } catch (afacErr) {
                                console.error('Error en la notificación AFAC:', afacErr);
                                if (window.MHRFaunaAfacPage) {
                                    window.MHRFaunaAfacPage.showStatus('Error: ' + (afacErr.message || afacErr), 'error');
                                } else {
                                    alert('Error: ' + (afacErr.message || afacErr));
                                }
                            } finally {
                                if (submitBtn) {
                                    submitBtn.disabled = false;
                                    submitBtn.value = 'Generar notificación AFAC';
                                }
                            }
                            return;
                        }

                        var client = window.supabaseClient;
                        if (!client) {
                            alert('Error: No hay conexión con Supabase');
                            submitBtn.disabled = false;
                            submitBtn.value = 'Generar reporte';
                            return;
                        }

                        function parseCoordsFromText(rawText) {
                            if (!rawText || typeof rawText !== 'string') return { lat: null, lng: null };
                            var txt = rawText.trim();
                            var match = txt.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
                            if (!match) return { lat: null, lng: null };
                            var lat = parseFloat(match[1]);
                            var lng = parseFloat(match[2]);
                            if (isNaN(lat) || isNaN(lng)) return { lat: null, lng: null };
                            return { lat: lat, lng: lng };
                        }

                        // ═════════════════════════════════════════════════════════
                        // GUARDAR IMPACTO
                        // ═════════════════════════════════════════════════════════
                        if (isImpacto) {
                            var evento = faunaForm.querySelector('input[name="fauna_report_evento"]:checked')?.value || '';
                            var faseVuelo = faunaForm.querySelector('input[name="fauna_report_fase_vuelo"]:checked')?.value || '';
                            var pista = faunaForm.querySelector('input[name="fauna_pista"]:checked')?.value || '';
                            var responsableSelect = document.getElementById('fauna_report-authors-select');
                            var responsable = responsableSelect ? responsableSelect.value : '';
                            var cargoSelect = document.getElementById('fauna_report-role');
                            var cargo = cargoSelect ? cargoSelect.value : '';
                            var aerolinea = faunaForm.querySelector('input[name="fauna_report_aerolinea"]')?.value || '';
                            var parteAvion = faunaForm.querySelector('select[name="fauna_report_parte_avion"]')?.value || '';
                            var zona = faunaForm.querySelector('select[name="fauna_report_ubicacion"]')?.value || '';

                            var horaEvento = faunaForm.querySelector('input[name="fauna_report_hora_evento"]')?.value || '';
                            var condicionMeteo = faunaForm.querySelector('select[name="fauna_report_condicion_meteo"]')?.value || '';

                            var impactPayload = {
                                folio: folio,
                                fecha_reporte: new Date().toISOString().split('T')[0],
                                evento: evento,
                                fase_vuelo: faseVuelo,
                                hora_evento: horaEvento || null,
                                condicion_meteo: condicionMeteo || null,
                                pista: pista,
                                responsable: responsable,
                                cargo: cargo,
                                aerolinea: aerolinea,
                                parte_avion: parteAvion,
                                zona: zona,
                                ubicacion_texto: null,
                                ubicacion_lat: null,
                                ubicacion_lng: null,
                                detalle_items: [],
                                estado: 'completado',
                                tipo_reporte: evento || 'Impacto',
                                pdf_url: null
                            };


                            // Obtener logo del header o usar base64 precargado
                            var logoSrc = '';
                            if (window.logoBase64) {
                                logoSrc = window.logoBase64;
                            } else {
                                try { 
                                    var logoEl = document.querySelector('.report-header .left img'); 
                                    if (logoEl) {
                                        var src = logoEl.getAttribute('src');
                                        if (src && !src.startsWith('http') && !src.startsWith('data:')) {
                                            var baseUrl = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
                                            logoSrc = baseUrl + '/' + src;
                                        } else {
                                            logoSrc = src;
                                        }
                                    }
                                } catch (e) { }
                            }
                            
                            // Fallback logo
                            var inlineLogo = '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="70" viewBox="0 0 180 70" style="display:block;margin:0 auto;">' +
                                '<rect width="100%" height="100%" fill="#0b66c3" rx="6" />' +
                                '<g transform="translate(12,10)">' +
                                '<circle cx="20" cy="20" r="16" fill="#fff" />' +
                                '<path d="M 20 8 L 28 20 L 24 20 L 24 28 L 16 28 L 16 20 L 12 20 Z" fill="#0b66c3"/>' +
                                '</g>' +
                                '<text x="95" y="28" font-family="Arial, sans-serif" font-size="18" fill="#ffffff" font-weight="bold">Fauna</text>' +
                                '<text x="95" y="48" font-family="Arial, sans-serif" font-size="11" fill="#e8f1f8">Control Aeródromo</text>' +
                                '</svg>';

                            // Generar HTML del reporte impacto para PDF con formato profesional (similar a revisión)
                            var impactoReportSummary = document.createElement('div');
                            var impactoHtml = '<div style="font-family:Arial,Helvetica,sans-serif;color:#0f1724;">';
                            
                            // Obtener membrete (similar a revisión)
                            var membreteLines = [];
                            try {
                                document.querySelectorAll('.report-header .meta > div').forEach(function(d) {
                                    if (d.querySelector && d.querySelector('#report-date')) return;
                                    if (d.querySelector && d.querySelector('button')) return;
                                    var txt = d.textContent.trim(); if (txt) membreteLines.push(txt);
                                });
                            } catch (e) { }

                            // Header: membrete izquierda, logo+titulo centrado, folio derecha (igual que revisión)
                            var utcTimeStr = pad(now.getUTCHours()) + ':' + pad(now.getUTCMinutes()) + ':' + pad(now.getUTCSeconds()) + ' UTC';
                            var utcDateStr = pad(now.getUTCDate()) + '/' + pad(now.getUTCMonth() + 1) + '/' + now.getUTCFullYear();
                            impactoHtml += '<table style="width:100%;border-collapse:collapse;margin-bottom:6px;"><tbody><tr>';
                            impactoHtml += '<td style="width:190px;vertical-align:top;padding-right:10px;">';
                            if (membreteLines.length) {
                                var membreteStyles = [
                                    'font-size:14px;font-weight:700;color:#0f1724;margin-bottom:3px;',
                                    'font-size:12px;font-weight:700;color:#374151;margin-bottom:2px;',
                                    'font-size:12px;font-weight:700;color:#374151;margin-bottom:2px;',
                                    'font-size:10px;font-weight:400;color:#6b7280;margin-top:5px;letter-spacing:0.3px;'
                                ];
                                impactoHtml += '<div style="line-height:1.45">';
                                membreteLines.forEach(function (line, i) {
                                    var s = membreteStyles[i] || 'font-size:11px;font-weight:600;color:#374151;';
                                    impactoHtml += '<div style="' + s + '">' + line + '</div>';
                                });
                                impactoHtml += '</div>';
                            }
                            impactoHtml += '</td>';
                            impactoHtml += '<td style="text-align:center;vertical-align:middle;padding:0 12px;">';
                            if (logoSrc) { impactoHtml += '<img src="' + logoSrc + '" style="height:80px;display:block;margin:0 auto 6px">'; } else { impactoHtml += inlineLogo; }
                            impactoHtml += '<h2 style="color:#0b66c3;margin:4px 0 0 0;font-size:18px;">Reporte de Control de Fauna</h2>';
                            impactoHtml += '<div style="margin-top:4px;font-size:13px;color:#111;font-weight:700;">Impacto Faunístico</div>';
                            impactoHtml += '</td>';
                            impactoHtml += '<td style="width:160px;text-align:right;vertical-align:top;font-size:12px;color:#6b7280;white-space:nowrap;">';
                            impactoHtml += '<div><strong>' + utcTimeStr + '</strong></div>';
                            impactoHtml += '<div style="margin-top:4px;">' + utcDateStr + '</div>';
                            impactoHtml += '<div style="margin-top:6px;color:#374151;font-weight:600;white-space:nowrap;">Folio: ' + (folio || '') + '</div>';
                            impactoHtml += '</td></tr></tbody></table>';
                            var _mc  = 'vertical-align:top;text-align:center;padding:7px 5px;border-right:1px solid #e0e0e0;';
                            var _mcL = 'vertical-align:top;text-align:center;padding:7px 5px;';
                            var _mL  = 'style="display:block;font-size:8px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;"';
                            var _mV  = 'style="display:block;font-size:11px;color:#0f1724;font-weight:700;"';
                            impactoHtml += '<table style="width:100%;border-collapse:collapse;margin-top:8px;border:1px solid #e0e0e0;table-layout:fixed;">';
                            impactoHtml += '<tbody><tr>';
                            impactoHtml += '<td style="' + _mc  + 'width:16%;"><span ' + _mL + '>Tipo de Evento</span><span ' + _mV + '>' + (evento || '-') + '</span></td>';
                            impactoHtml += '<td style="' + _mc  + 'width:14%;"><span ' + _mL + '>Fase de Vuelo</span><span ' + _mV + '>' + (faseVuelo || '-') + '</span></td>';
                            impactoHtml += '<td style="' + _mc  + 'width:12%;"><span ' + _mL + '>Pista</span><span ' + _mV + '>' + (pista || '-') + '</span></td>';
                            impactoHtml += '<td style="' + _mc  + 'width:20%;"><span ' + _mL + '>Responsable</span><span ' + _mV + '>' + (responsable || '-') + '</span></td>';
                            impactoHtml += '<td style="' + _mc  + 'width:18%;"><span ' + _mL + '>Cargo</span><span ' + _mV + '>' + (cargo || '-') + '</span></td>';
                            impactoHtml += '<td style="' + _mcL + 'width:20%;"><span ' + _mL + '>Aerol\u00ednea</span><span ' + _mV + '>' + (aerolinea || '-') + '</span></td>';
                            impactoHtml += '</tr></tbody></table>';
                            impactoHtml += '<hr style="border:none;border-top:1px solid #e6eef9;margin:12px 0">';

                            // Tabla de información detallada
                            impactoHtml += '<table style="width:100%;border-collapse:collapse;font-size:13px;">';
                            impactoHtml += '<thead><tr>' +
                                '<th style="text-align:left;padding:8px;border-bottom:1px solid #e6eef9;width:30%">Concepto</th>' +
                                '<th style="text-align:left;padding:8px;border-bottom:1px solid #e6eef9;width:70%">Valor</th>' +
                                '</tr></thead>';
                            impactoHtml += '<tbody>';
                            impactoHtml += '<tr>' +
                                '<td style="vertical-align:top;padding:10px;border-bottom:1px solid #f0f6ff;font-weight:600;background:#f5f8fc">Aerolínea</td>' +
                                '<td style="vertical-align:top;padding:10px;border-bottom:1px solid #f0f6ff">' + (aerolinea || '-') + '</td>' +
                                '</tr>';
                            impactoHtml += '<tr>' +
                                '<td style="vertical-align:top;padding:10px;border-bottom:1px solid #f0f6ff;font-weight:600;background:#f5f8fc">Parte del avión</td>' +
                                '<td style="vertical-align:top;padding:10px;border-bottom:1px solid #f0f6ff">' + (parteAvion || '-') + '</td>' +
                                '</tr>';
                            impactoHtml += '<tr>' +
                                '<td style="vertical-align:top;padding:10px;border-bottom:1px solid #f0f6ff;font-weight:600;background:#f5f8fc">Zona</td>' +
                                '<td style="vertical-align:top;padding:10px;border-bottom:1px solid #f0f6ff">' + (zona || '-') + '</td>' +
                                '</tr>';
                            impactoHtml += '</tbody></table>';

                            // ═════ RECOPILAR ITEMS COMPLETADOS DE FAUNA (IMPACTO) ═════
                            impactoHtml += '<h3 style="color:#0b66c3;margin-top:20px;font-size:16px;margin-bottom:10px;">Detalles del Reporte de Fauna</h3>';
                            
                            // Recopilar items de fauna completados
                            var faunaItems = [];
                            [{
                                value: 'Otro evento',
                                detailsId: 'fauna_details_avistamiento'
                            }].forEach(function (itemCfg) {
                                var itemValue = itemCfg.value;
                                var detailsDiv = document.getElementById(itemCfg.detailsId);
                                
                                if (detailsDiv) {
                                    var itemFields = [];
                                    var inputs = detailsDiv.querySelectorAll('input, textarea, select');
                                    
                                    inputs.forEach(function(el) {
                                        if (!el || !el.name) return;
                                        var val = '';
                                        
                                        // Obtener valor según tipo
                                        if (el.type === 'checkbox' || el.type === 'radio') {
                                            if (!el.checked) return;
                                            val = el.value || 'Seleccionado';
                                        } else {
                                            val = (el.value || '').toString().trim();
                                        }
                                        
                                        if (val === '') return;
                                        
                                        // Extraer nombre legible del campo
                                        var fieldName = el.name;
                                        if (fieldName.includes('[')) {
                                            fieldName = fieldName.split('[')[2].replace(']', ''); // ej: fauna_details[avistamiento][lugar] -> lugar
                                        }
                                        
                                        // Mapeo de nombres de campos más visuales
                                        var fieldLabels = {
                                            'lugar': 'Ubicación',
                                            'especie': 'Especie',
                                            'especie_otra': 'Otra Especie',
                                            'cantidad': 'Cantidad',
                                            'condicion': 'Condición del Daño',
                                            'observaciones': 'Observaciones',
                                            'prioridad': 'Prioridad',
                                            'tipo_animal': 'Tipo de Animal',
                                            'riesgo': 'Riesgo/Amenaza',
                                            'descripcion': 'Descripción del Daño',
                                            'severidad': 'Severidad'
                                        };
                                        
                                        // Usar etiqueta personalizada si existe
                                        fieldName = fieldLabels[fieldName] || fieldName.replace(/_/g, ' ').replace(/^\w/, function(c) { return c.toUpperCase(); });
                                        
                                        // Mapeo de valores para mostrar en español
                                        var valueLabels = {
                                            '1': 'Baja',
                                            '2': 'Media',
                                            '3': 'Alta'
                                        };
                                        val = valueLabels[val] || val;
                                        
                                        itemFields.push({ key: fieldName, value: val });
                                    });
                                    
                                    if (itemFields.length > 0) {
                                        faunaItems.push({ type: itemValue, fields: itemFields });
                                    }
                                }
                            });
                            
                            // Helper: construir HTML para mostrar ubicación con mapa e imagen
                            function buildFaunaLugarHtml(itemType, lugarVal) {
                                if (!lugarVal) return '<div style="color:#9ca3af;">-</div>';
                                var h = '<div style="font-size:12px;font-weight:600;margin-bottom:8px;">' + lugarVal + '</div>';
                                try {
                                    // Buscar el input de ubicación para este tipo de fauna
                                    var inp = document.querySelector('input[name="fauna_details[' + itemType + '][lugar]"]');
                                    
                                    if (inp) {
                                        
                                        if (inp.dataset.mapImage) {
                                            h += '<img src="' + inp.dataset.mapImage + '" style="width:100%;max-height:120px;border-radius:4px;object-fit:cover;border:1px solid #d1dbe9;">';
                                        } else {
                                        }
                                    } else {
                                    }
                                } catch (ex) { console.warn('Error mostrando mapa fauna:', ex); }
                                return h;
                            }

                            // Helper: construir HTML para mostrar fotos adjuntas
                            function buildFaunaPhotosHtml(itemType) {
                                var photos = (window.faunaItemPhotos && window.faunaItemPhotos[itemType]) || [];
                                if (!photos || photos.length === 0) return '';
                                
                                var h = '<div style="margin-top:8px;padding-top:8px;border-top:1px solid #e5e7eb;">';
                                h += '<strong style="font-size:11px;color:#1f2937;">📸 Fotos adjuntas (' + photos.length + '):</strong><br>';
                                h += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">';
                                
                                photos.forEach(function(photo, idx) {
                                    h += '<img src="' + photo.dataURL + '" style="width:80px;height:80px;border-radius:4px;border:1px solid #d1dbe9;object-fit:cover;" title="' + photo.name + '">';
                                });
                                
                                h += '</div></div>';
                                return h;
                            }

                            // Mostrar items en tabla
                            if (faunaItems.length > 0) {
                                impactPayload.detalle_items = faunaItems;
                                for (var i = 0; i < faunaItems.length; i++) {
                                    var fields = faunaItems[i].fields || [];
                                    for (var j = 0; j < fields.length; j++) {
                                        if (fields[j].key === 'Ubicación' && fields[j].value) {
                                            impactPayload.ubicacion_texto = fields[j].value;
                                            var parsedImpactCoords = parseCoordsFromText(fields[j].value);
                                            impactPayload.ubicacion_lat = parsedImpactCoords.lat;
                                            impactPayload.ubicacion_lng = parsedImpactCoords.lng;
                                        }
                                        if (fields[j].key === 'Especie' && fields[j].value && !impactPayload.especie) {
                                            impactPayload.especie = fields[j].value;
                                        }
                                    }
                                    if (impactPayload.ubicacion_texto && impactPayload.especie) break;
                                }
                                impactoHtml += '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:10px;">';
                                impactoHtml += '<tbody>';
                                
                                faunaItems.forEach(function(item, idx) {
                                    // Encabezado del item
                                    impactoHtml += '<tr><td colspan="2" style="background:#0b66c3;color:#fff;padding:8px;font-weight:bold;border:1px solid #d1dbe9;">' + (idx + 1) + '. ' + item.type + '</td></tr>';
                                    
                                    // Detalles del item
                                    item.fields.forEach(function(field, fieldIdx) {
                                        var bgColor = fieldIdx % 2 === 0 ? '#f5f8fc' : '#ffffff';
                                        var cellValue = field.value || '-';
                                        
                                        // Si es el campo "Ubicación", construir HTML especial con mapa
                                        if (field.key === 'Ubicación' && item.type) {
                                            // Extraer el tipo de fauna (ej: "avistamiento" de "Avistamiento de Aves")
                                            var faunaType = '';
                                            if (item.type === 'Avistamiento de Aves') faunaType = 'avistamiento';
                                            else if (item.type === 'Presencia de Animales') faunaType = 'presencia';
                                            else if (item.type === 'Daño a Infraestructura') faunaType = 'daino';
                                            
                                            cellValue = buildFaunaLugarHtml(faunaType, cellValue);
                                        }
                                        
                                        impactoHtml += '<tr>' +
                                            '<td style="padding:8px;font-weight:600;width:35%;background:' + bgColor + ';border:1px solid #d1dbe9;vertical-align:top;">' + field.key + '</td>' +
                                            '<td style="padding:8px;width:65%;background:' + bgColor + ';border:1px solid #d1dbe9;vertical-align:top;">' + cellValue + '</td>' +
                                            '</tr>';
                                    });
                                    
                                    // Agregar sección de fotos si existen
                                    var faunaType = '';
                                    if (item.type === 'Avistamiento de Aves') faunaType = 'avistamiento';
                                    else if (item.type === 'Presencia de Animales') faunaType = 'presencia';
                                    else if (item.type === 'Daño a Infraestructura') faunaType = 'daino';
                                    
                                    var photosHtml = buildFaunaPhotosHtml(faunaType);
                                    if (photosHtml) {
                                        impactoHtml += '<tr><td colspan="2" style="padding:10px;border:1px solid #d1dbe9;background:#fafbfc;">' + photosHtml + '</td></tr>';
                                    }
                                });
                                
                                impactoHtml += '</tbody></table>';
                            } else {
                                impactoHtml += '<p style="color:#6b7280;font-style:italic;margin-top:10px;">No hay detalles adicionales registrados.</p>';
                            }

                            impactoHtml += '<div style="text-align:center;color:#6b7280;font-size:10px;margin-top:20px;padding-top:12px;border-top:1px solid #e5e7eb;">' +
                                'Reporte generado automáticamente • ' + new Date().toLocaleString('es-ES') +
                                '</div>';
                            
                            // ═════ FIRMAS ═════
                            var _firmasFauna = window.obtenerFirmasFauna ? window.obtenerFirmasFauna() : {};
                            var _imgAifa = _firmasFauna.aifa
                                ? '<img src="' + _firmasFauna.aifa + '" style="max-width:200px;height:80px;display:block;margin:0 auto 8px;border:1px solid #e2e8f0;border-radius:4px;">'
                                : '<div style="height:70px;"></div>';
                            var _imgAfac = _firmasFauna.afac
                                ? '<img src="' + _firmasFauna.afac + '" style="max-width:200px;height:80px;display:block;margin:0 auto 8px;border:1px solid #e2e8f0;border-radius:4px;">'
                                : '<div style="height:70px;"></div>';
                            impactoHtml += '<div style="margin-top:40px;padding-top:16px;border-top:2px solid #e6eef9;">' +
                                '<table style="width:100%;"><tr>' +
                                '<td style="text-align:center;width:50%;padding:0 16px;">' +
                                    _imgAifa +
                                    '<div style="border-top:1px solid #374151;padding-top:6px;font-size:11px;font-weight:700;">Firma - AIFA (Responsable)</div>' +
                                '</td>' +
                                '<td style="text-align:center;width:50%;padding:0 16px;">' +
                                    _imgAfac +
                                    '<div style="border-top:1px solid #374151;padding-top:6px;font-size:11px;font-weight:700;">Firma - AFAC (Supervisor)</div>' +
                                '</td></tr></table>' +
                            '</div>';
                            
                            impactoHtml += '</div>';
                            impactoReportSummary.innerHTML = impactoHtml;

                            var filename = 'Reporte-Fauna-' + folio + '.pdf';
                            var opt = {
                                margin: [8, 8, 8, 8],
                                filename: filename,
                                image: { type: 'jpeg', quality: 0.98 },
                                html2canvas: { scale: 2, logging: false, useCORS: true, allowTaint: true },
                                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true }
                            };

                            // Generar PDF usando el HTML como string (evita problema de elemento fuera del DOM)
                            html2pdf().set(opt).from(impactoHtml, 'string').toPdf().get('pdf').then(async function(pdf) {
                                
                                try {
                                    // ═══ Página de mapa con Leaflet (igual que pdf-renderer.js) ═══
                                    var _impLat = impactPayload.ubicacion_lat;
                                    var _impLng = impactPayload.ubicacion_lng;

                                    if (_impLat && _impLng && typeof window.L !== 'undefined' && typeof window.html2canvas === 'function') {
                                        var _mapWrap, _tempMap;
                                        try {
                                            var _mapsLink = 'https://maps.google.com/maps?q=' + _impLat + ',' + _impLng + '&t=k&z=17';

                                            _mapWrap = document.createElement('div');
                                            _mapWrap.style.cssText = 'position:fixed;top:0;left:-1400px;width:1122px;height:794px;background:#fff;font-family:Arial,Helvetica,sans-serif;overflow:hidden;';

                                            var _mapId = 'pdf-fauna-map-' + Date.now();
                                            _mapWrap.innerHTML =
                                                '<div style="padding:10px 20px 0 20px;">' +
                                                '<span style="font-size:14px;font-weight:700;color:#0b66c3;">Ubicación del Impacto</span>' +
                                                '<span style="font-size:10px;color:#6b7280;margin-left:14px;">' + _impLat + ', ' + _impLng + '</span>' +
                                                '<div style="border-top:2px solid #0b66c3;margin-top:6px;"></div></div>' +
                                                '<div id="' + _mapId + '" style="width:1122px;height:740px;"></div>';
                                            document.body.appendChild(_mapWrap);

                                            _tempMap = window.L.map(_mapId, {
                                                zoomControl: false, attributionControl: false,
                                                preferCanvas: true, fadeAnimation: false, zoomAnimation: false
                                            });
                                            window.L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
                                                subdomains: ['mt0','mt1','mt2','mt3'], maxZoom: 20, crossOrigin: true
                                            }).addTo(_tempMap);

                                            var _pinIcon = window.L.divIcon({
                                                className: '',
                                                html: '<div style="background:#dc2626;color:#fff;font-size:13px;font-weight:700;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.55);">1</div>',
                                                iconSize: [30, 30], iconAnchor: [15, 30]
                                            });
                                            window.L.marker([_impLat, _impLng], { icon: _pinIcon }).addTo(_tempMap);
                                            _tempMap.setView([_impLat, _impLng], 17);

                                            await new Promise(function(resolve) {
                                                var done = false;
                                                function finish() { if (!done) { done = true; resolve(); } }
                                                _tempMap.once('load', finish);
                                                setTimeout(finish, 2500);
                                            });
                                            await new Promise(function(resolve) { setTimeout(resolve, 300); });

                                            var _mc = await window.html2canvas(_mapWrap, {
                                                scale: 1.5, useCORS: true, allowTaint: true, logging: false
                                            });

                                            pdf.addPage([297, 210], 'l');
                                            pdf.addImage(_mc.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 297, 210);

                                        } catch (mapErr) {
                                            console.warn('Error generando página de mapa:', mapErr);
                                        } finally {
                                            if (_tempMap) { try { _tempMap.remove(); } catch(e) {} }
                                            if (_mapWrap && _mapWrap.parentNode) document.body.removeChild(_mapWrap);
                                        }
                                    }

                                    // ═══ Página de link clickeable a Google Maps ═══
                                    if (_impLat && _impLng) {
                                        var _mapsUrl = 'https://maps.google.com/maps?q=' + _impLat + ',' + _impLng + '&t=k&z=17';
                                        pdf.addPage();
                                        pdf.setFontSize(16); pdf.setTextColor(0, 61, 153); pdf.setFont(undefined, 'bold');
                                        pdf.text('Ubicacion del Impacto', 20, 25);
                                        pdf.setDrawColor(0, 61, 153); pdf.setLineWidth(0.8); pdf.line(20, 28, 190, 28);

                                        pdf.setFontSize(11); pdf.setTextColor(80, 80, 80); pdf.setFont(undefined, 'normal');
                                        pdf.text('Coordenadas: ' + _impLat + ', ' + _impLng, 20, 40);

                                        pdf.setFontSize(11); pdf.setTextColor(0, 85, 165); pdf.setFont(undefined, 'normal');
                                        var linkText = 'Ver ubicacion en Google Maps (vista satelital)';
                                        pdf.textWithLink(linkText, 20, 52, { url: _mapsUrl });
                                        // Subrayado manual
                                        var textW = pdf.getTextWidth(linkText);
                                        pdf.setDrawColor(0, 85, 165); pdf.setLineWidth(0.3); pdf.line(20, 53.5, 20 + textW, 53.5);

                                        pdf.setFontSize(8); pdf.setTextColor(130, 130, 130); pdf.setFont(undefined, 'italic');
                                        var urlLines = pdf.splitTextToSize(_mapsUrl, 170);
                                        pdf.text(urlLines, 20, 62);
                                    }
                                    
                                    // Obtener blob del PDF
                                    var pdfBlob = pdf.output('blob');
                                    
                                    // Mostrar preview en iframe (igual que pdf-renderer.js)
                                    var previewContainer = document.getElementById('pdf-preview-container');
                                    var previewFrame    = document.getElementById('pdf-preview-frame');
                                    var backdrop        = document.getElementById('pdf-modal-backdrop');
                                    var spinner         = document.getElementById('pdf-spinner');
                                    var downloadBtn     = document.getElementById('pdf-download-btn');
                                    var closeBtn        = document.getElementById('pdf-preview-close');

                                    if (spinner) spinner.style.display = 'none';
                                    submitBtn.disabled = false;
                                    submitBtn.value = 'Generar reporte';

                                    var blobUrl = URL.createObjectURL(pdfBlob);
                                    if (previewFrame) previewFrame.src = blobUrl;
                                    if (previewContainer) {
                                        previewContainer.style.setProperty('display', 'flex', 'important');
                                        previewContainer.setAttribute('aria-hidden', 'false');
                                    }
                                    if (backdrop) backdrop.style.setProperty('display', 'block', 'important');

                                    if (downloadBtn) {
                                        downloadBtn.onclick = function() {
                                            var a = document.createElement('a');
                                            a.href = blobUrl;
                                            a.download = filename;
                                            a.click();
                                        };
                                    }
                                    if (closeBtn) {
                                        closeBtn.onclick = function() {
                                            if (previewContainer) previewContainer.style.setProperty('display', 'none', 'important');
                                            if (backdrop) backdrop.style.setProperty('display', 'none', 'important');
                                            if (previewFrame) previewFrame.src = '';
                                        };
                                    }
                                    
                                    // Upload PDF a bucket fauna_impact_pdfs
                                    var pdfPath = 'impactos/' + Date.now() + '-' + folio + '.pdf';
                                    var pdfUrl = null;
                                    try {
                                        var { data: uploadData, error: uploadError } = await client.storage
                                            .from('fauna_impact_pdfs')
                                            .upload(pdfPath, pdfBlob, { contentType: 'application/pdf' });
                                        if (uploadError) {
                                            console.warn('⚠️ No se pudo subir PDF:', uploadError.message);
                                        } else if (uploadData) {
                                            var { data: pubData } = client.storage
                                                .from('fauna_impact_pdfs')
                                                .getPublicUrl(pdfPath);
                                            pdfUrl = pubData && pubData.publicUrl ? pubData.publicUrl : null;
                                        }
                                    } catch (upErr) {
                                        console.warn('⚠️ Excepción subiendo PDF:', upErr);
                                    }
                                    
                                    // Actualizar payload con PDF URL
                                    impactPayload.pdf_url = pdfUrl;

                                    var impactData;
                                    try {
                                        impactData = await window.MHRFaunaReportService.insertFaunaReport(client, impactPayload);
                                    } catch (impactError) {
                                        console.error('❌ Error guardando impacto en BD:', impactError);
                                        alert('❌ Error al guardar reporte: ' + impactError.message);
                                        submitBtn.disabled = false;
                                        submitBtn.value = 'Generar reporte';
                                        return;
                                    }

                                    if (impactData && impactData.length > 0 && impactData[0].pdf_url) {
                                    } else {
                                        console.warn('⚠️ ADVERTENCIA: El reporte se guardó pero sin pdf_url');
                                    }
                                    alert('✓ Reporte de impacto generado y guardado exitosamente.');
                                    faunaForm.reset();
                                    
                                    // Recargar historial
                                    setTimeout(function() { loadFaunaReports({}); }, 500);

                                    submitBtn.disabled = false;
                                    submitBtn.value = 'Generar reporte';
                                    
                                } catch (err) {
                                    console.error('Error en impacto:', err);
                                    alert('Error: ' + err.message);
                                    submitBtn.disabled = false;
                                    submitBtn.value = 'Generar reporte';
                                }
                            }).catch(function (err) {
                                console.error('Error generando PDF impacto:', err);
                                alert('Error al generar el PDF: ' + err.message);
                                submitBtn.disabled = false;
                                submitBtn.value = 'Generar reporte';
                            });
                            return;
                        }

                        // ═════════════════════════════════════════════════════════
                        // GUARDAR RESCATE
                        // ═════════════════════════════════════════════════════════
                        // Responsable
                        var responsableSelect = document.getElementById('fauna_report-authors-select-rescate');
                        var responsable = responsableSelect ? (responsableSelect.options[responsableSelect.selectedIndex] || {}).text || responsableSelect.value : '-';

                        // Cargo
                        var cargoSelect = document.getElementById('fauna_report-role-rescate');
                        var cargo = cargoSelect ? (cargoSelect.options[cargoSelect.selectedIndex] || {}).text || cargoSelect.value : '-';

                        // Institución
                        var institucion = faunaForm.querySelector('input[name="fauna_rescate[institucion_responsable]"]')?.value || '-';

                        // Sitio de Rescate
                        var sitioRescate = faunaForm.querySelector('input[name="fauna_rescate[lugar]"]')?.value || '-';

                        // Clase
                        var claseSelect = faunaForm.querySelector('select[name="fauna_rescate[clase]"]');
                        var clase = claseSelect ? claseSelect.value : '-';

                        // Especie
                        var especieSelect = faunaForm.querySelector('select[name="fauna_rescate[especie]"]');
                        var especie = especieSelect ? especieSelect.value : '-';

                        // Sitio Reubicación
                        var sitioReubicacion = faunaForm.querySelector('select[name="fauna_rescate[sitio_reubicacion]"]')?.value || '-';

                        // Observaciones
                        var observaciones = faunaForm.querySelector('textarea[name="fauna_rescate[observaciones]"]')?.value || '';

                        // Crear contenedor visible para el reporte
                        var reportSummary = document.getElementById('fauna-report-summary');
                        if (!reportSummary) {
                            reportSummary = document.createElement('div');
                            reportSummary.id = 'fauna-report-summary';
                            reportSummary.style.display = 'none';
                            document.body.appendChild(reportSummary);
                        }

                        // Pre-computar cabecera al estilo revisión
                        var _utcTR = pad(now.getUTCHours()) + ':' + pad(now.getUTCMinutes()) + ':' + pad(now.getUTCSeconds()) + ' UTC';
                        var _utcDR = pad(now.getUTCDate()) + '/' + pad(now.getUTCMonth() + 1) + '/' + now.getUTCFullYear();
                        var _lR = window.logoBase64 || (function() {
                            try { var el = document.querySelector('.report-header .left img'); if (el) { var s = el.getAttribute('src'); return (s && !s.startsWith('http') && !s.startsWith('data:')) ? (window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/')) + '/' + s) : s; } } catch(e) {} return '';
                        })();
                        var _mR = [];
                        try { document.querySelectorAll('.report-header .meta > div').forEach(function(d) { if (d.querySelector && (d.querySelector('#report-date') || d.querySelector('button'))) return; var t = d.textContent.trim(); if (t) _mR.push(t); }); } catch(e) {}
                        var _msR = ['font-size:14px;font-weight:700;color:#0f1724;margin-bottom:3px;','font-size:12px;font-weight:700;color:#374151;margin-bottom:2px;','font-size:12px;font-weight:700;color:#374151;margin-bottom:2px;','font-size:10px;font-weight:400;color:#6b7280;margin-top:5px;letter-spacing:0.3px;'];
                        var _cR  = 'vertical-align:top;text-align:center;padding:7px 5px;border-right:1px solid #e0e0e0;';
                        var _cLR = 'vertical-align:top;text-align:center;padding:7px 5px;';
                        var _lbR = 'style="display:block;font-size:8px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;"';
                        var _vR  = 'style="display:block;font-size:11px;color:#0f1724;font-weight:700;"';
                        var _rHdr = '<table style="width:100%;border-collapse:collapse;margin-bottom:6px;"><tbody><tr>' +
                            '<td style="width:190px;vertical-align:top;padding-right:10px;">' +
                            (_mR.length ? '<div style="line-height:1.45">' + _mR.map(function(l,i){return '<div style="'+(_msR[i]||'font-size:11px;font-weight:600;color:#374151;')+'">'+l+'</div>';}).join('') + '</div>' : '') +
                            '</td>' +
                            '<td style="text-align:center;vertical-align:middle;padding:0 12px;">' +
                            (_lR ? '<img src="' + _lR + '" style="height:80px;display:block;margin:0 auto 6px">' : '') +
                            '<h2 style="color:#0b66c3;margin:4px 0 0 0;font-size:18px;">Reporte de Control de Fauna</h2>' +
                            '<div style="margin-top:4px;font-size:13px;color:#111;font-weight:700;">Rescate y Reubicaci\u00f3n</div>' +
                            '</td>' +
                            '<td style="width:160px;text-align:right;vertical-align:top;font-size:12px;color:#6b7280;white-space:nowrap;">' +
                            '<div><strong>' + _utcTR + '</strong></div>' +
                            '<div style="margin-top:4px;">' + _utcDR + '</div>' +
                            '<div style="margin-top:6px;color:#374151;font-weight:600;white-space:nowrap;">Folio: ' + folio + '</div>' +
                            '</td></tr></tbody></table>' +
                            '<table style="width:100%;border-collapse:collapse;margin-top:8px;border:1px solid #e0e0e0;table-layout:fixed;">' +
                            '<tbody><tr>' +
                            '<td style="' + _cR + 'width:20%;"><span ' + _lbR + '>Responsable</span><span ' + _vR + '>' + (responsable || '-') + '</span></td>' +
                            '<td style="' + _cR + 'width:18%;"><span ' + _lbR + '>Cargo</span><span ' + _vR + '>' + (cargo || '-') + '</span></td>' +
                            '<td style="' + _cR + 'width:22%;"><span ' + _lbR + '>Instituci\u00f3n</span><span ' + _vR + '>' + (institucion || '-') + '</span></td>' +
                            '<td style="' + _cR + 'width:18%;"><span ' + _lbR + '>Clase</span><span ' + _vR + '>' + (clase || '-') + '</span></td>' +
                            '<td style="' + _cLR + 'width:22%;"><span ' + _lbR + '>Especie</span><span ' + _vR + '>' + (especie || '-') + '</span></td>' +
                            '</tr></tbody></table>' +
                            '<hr style="border:none;border-top:1px solid #e6eef9;margin:12px 0">';
                        // ═════ FIRMAS rescate ═════
                        var _firmasR = window.obtenerFirmasFauna ? window.obtenerFirmasFauna() : {};
                        var _rImgAifa = _firmasR.aifa
                            ? '<img src="' + _firmasR.aifa + '" style="max-width:200px;height:80px;display:block;margin:0 auto 8px;border:1px solid #e2e8f0;border-radius:4px;">'
                            : '<div style="height:70px;"></div>';
                        var _rImgAfac = _firmasR.afac
                            ? '<img src="' + _firmasR.afac + '" style="max-width:200px;height:80px;display:block;margin:0 auto 8px;border:1px solid #e2e8f0;border-radius:4px;">'
                            : '<div style="height:70px;"></div>';

                        // Construir HTML del reporte con formato profesional
                        var _rescateHtml = '<div style="font-family:Arial,Helvetica,sans-serif;color:#0f1724;">' +
                            _rHdr +
                            
                            '<table style="width:100%;border-collapse:collapse;font-size:13px;">' +
                                '<thead><tr>' +
                                    '<th style="text-align:left;padding:8px;border-bottom:1px solid #e6eef9;width:35%">Concepto</th>' +
                                    '<th style="text-align:left;padding:8px;border-bottom:1px solid #e6eef9;width:65%">Detalle</th>' +
                                '</tr></thead>' +
                                '<tbody>' +
                                    '<tr><td style="vertical-align:top;padding:10px;border-bottom:1px solid #f0f6ff;font-weight:600;background:#f5f8fc">Sitio de Rescate</td>' +
                                        '<td style="vertical-align:top;padding:10px;border-bottom:1px solid #f0f6ff">' + (sitioRescate || '-') + '</td></tr>' +
                                    '<tr><td style="vertical-align:top;padding:10px;border-bottom:1px solid #f0f6ff;font-weight:600;background:#f5f8fc">Clase de Animal</td>' +
                                        '<td style="vertical-align:top;padding:10px;border-bottom:1px solid #f0f6ff">' + (clase || '-') + '</td></tr>' +
                                    '<tr><td style="vertical-align:top;padding:10px;border-bottom:1px solid #f0f6ff;font-weight:600;background:#f5f8fc">Especie</td>' +
                                        '<td style="vertical-align:top;padding:10px;border-bottom:1px solid #f0f6ff">' + (especie || '-') + '</td></tr>' +
                                    '<tr><td style="vertical-align:top;padding:10px;border-bottom:1px solid #f0f6ff;font-weight:600;background:#f5f8fc">Sitio de Reubicación</td>' +
                                        '<td style="vertical-align:top;padding:10px;border-bottom:1px solid #f0f6ff">' + (sitioReubicacion || '-') + '</td></tr>' +
                                '</tbody>' +
                            '</table>' +
                            
                            '<h3 style="color:#0b66c3;font-size:13px;margin:16px 0 8px 0;border-bottom:1.5px solid #0b66c3;padding-bottom:4px;">Observaciones</h3>' +
                            '<div style="padding:10px;border:1px solid #e6eef9;background:#fafbfc;font-size:12px;line-height:1.6;min-height:50px;white-space:pre-wrap">' + (observaciones || 'N/A') + '</div>' +
                            
                            '<div style="margin-top:60px;padding-top:20px;border-top:2px solid #e6eef9;">' +
                                '<table style="width:100%;"><tr>' +
                                '<td style="text-align:center;width:50%;padding:0 16px;">' +
                                    _rImgAifa +
                                    '<div style="border-top:1px solid #374151;padding-top:6px;font-size:11px;font-weight:700;">Firma - AIFA (Responsable)</div>' +
                                '</td>' +
                                '<td style="text-align:center;width:50%;padding:0 16px;">' +
                                    _rImgAfac +
                                    '<div style="border-top:1px solid #374151;padding-top:6px;font-size:11px;font-weight:700;">Firma - AFAC (Supervisor)</div>' +
                                '</td></tr></table>' +
                            '</div>' +
                            
                            '<div style="text-align:center;color:#6b7280;font-size:10px;margin-top:20px;padding-top:12px;border-top:1px solid #e5e7eb;">' +
                                'Reporte generado automáticamente • ' + new Date().toLocaleString('es-ES') +
                            '</div>' +
                        '</div>';
                        reportSummary.innerHTML = _rescateHtml;

                        // Configurar html2pdf
                        var filename = 'Reporte-Fauna-' + folio + '.pdf';
                        var opt = {
                            margin: [8, 8, 8, 8],
                            filename: filename,
                            image: { type: 'jpeg', quality: 0.98 },
                            html2canvas: { scale: 2, logging: false, useCORS: true, allowTaint: true },
                            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true }
                        };

                        // Generar PDF usando el HTML como string (evita problema de display:none)
                        html2pdf().set(opt).from(_rescateHtml, 'string').toPdf().get('pdf').then(async function(pdf) {
                            
                            try {
                                // Obtener blob del PDF
                                var pdfBlob = pdf.output('blob');
                                var blobUrl = URL.createObjectURL(pdfBlob);

                                // Mostrar preview en iframe
                                var previewContainer = document.getElementById('pdf-preview-container');
                                var previewFrame = document.getElementById('pdf-preview-frame');
                                var spinner = document.getElementById('pdf-spinner');

                                if (true) {
                                    // Mostrar preview (igual que pdf-renderer.js)
                                    var backdrop    = document.getElementById('pdf-modal-backdrop');
                                    var downloadBtn = document.getElementById('pdf-download-btn');
                                    var closeBtn    = document.getElementById('pdf-preview-close');

                                    if (spinner) spinner.style.display = 'none';
                                    if (submitBtn) { submitBtn.disabled = false; submitBtn.value = 'Generar reporte'; }

                                    if (previewFrame) previewFrame.src = blobUrl;
                                    if (previewContainer) {
                                        previewContainer.style.setProperty('display', 'flex', 'important');
                                        previewContainer.setAttribute('aria-hidden', 'false');
                                    }
                                    if (backdrop) backdrop.style.setProperty('display', 'block', 'important');

                                    if (downloadBtn) {
                                        downloadBtn.onclick = function() {
                                            var a = document.createElement('a');
                                            a.href = blobUrl;
                                            a.download = filename;
                                            a.click();
                                        };
                                    }
                                    if (closeBtn) {
                                        closeBtn.onclick = function() {
                                            if (previewContainer) previewContainer.style.setProperty('display', 'none', 'important');
                                            if (backdrop) backdrop.style.setProperty('display', 'none', 'important');
                                            if (previewFrame) previewFrame.src = '';
                                        };
                                    }
                                } // end preview block
                                
                                // Ahora guardar en Supabase
                                var client = window.supabaseClient;
                                if (!client) {
                                    alert('✓ PDF generado. Notificación: Sin conexión para guardar en BD.');
                                    if (submitBtn) {
                                        submitBtn.disabled = false;
                                        submitBtn.value = 'Generar reporte';
                                    }
                                    return;
                                }

                                var { data: { session } } = await client.auth.getSession();
                                if (!session) {
                                    alert('✓ PDF generado. Notificación: No estás en sesión para guardar en BD.');
                                    if (submitBtn) {
                                        submitBtn.disabled = false;
                                        submitBtn.value = 'Generar reporte';
                                    }
                                    return;
                                }

                                
                                // Upload PDF a storage (bucket: fauna_impact_pdfs)
                                var pdfPath = 'rescates/' + Date.now() + '-' + folio + '.pdf';
                                var pdfUrl = null;
                                try {
                                    var { data: uploadData, error: uploadError } = await client.storage
                                        .from('fauna_impact_pdfs')
                                        .upload(pdfPath, pdfBlob, { contentType: 'application/pdf' });
                                    if (uploadError) {
                                        console.warn('Warning subiendo PDF rescate:', uploadError.message);
                                    } else if (uploadData) {
                                        var { data: pubData } = client.storage
                                            .from('fauna_impact_pdfs')
                                            .getPublicUrl(pdfPath);
                                        pdfUrl = pubData && pubData.publicUrl ? pubData.publicUrl : null;
                                    }
                                } catch (upErr) {
                                    console.warn('⚠️ Excepción subiendo PDF rescate:', upErr);
                                }

                                // Guardar reporte de rescate
                                var rescateCoords = parseCoordsFromText(sitioRescate);
                                var rescatePayload = {
                                    fecha_reporte: new Date().toISOString().split('T')[0],
                                    folio: folio,
                                    responsable: responsable,
                                    cargo: cargo,
                                    institucion_responsable: institucion,
                                    ubicacion_texto: sitioRescate,
                                    ubicacion_lat: rescateCoords.lat,
                                    ubicacion_lng: rescateCoords.lng,
                                    clase: clase,
                                    especie: especie,
                                    sitio_reubicacion: sitioReubicacion,
                                    observaciones: observaciones,
                                    estado: 'completado',
                                    tipo_reporte: 'Rescate',
                                    pdf_url: pdfUrl
                                };

                                var rescateData;
                                try {
                                    rescateData = await window.MHRFaunaReportService.insertFaunaReport(client, rescatePayload);
                                } catch (rescateError) {
                                    console.error('Error guardando rescate:', rescateError);
                                    alert('Error: ' + rescateError.message);
                                    if (submitBtn) {
                                        submitBtn.disabled = false;
                                        submitBtn.value = 'Generar reporte';
                                    }
                                    return;
                                }

                                alert('✓ Reporte generado y guardado exitosamente.');

                                // Limpiar formulario
                                faunaForm.reset();
                                
                                // Recargar historial
                                setTimeout(function() { loadFaunaReports({}); }, 500);

                                if (submitBtn) {
                                    submitBtn.disabled = false;
                                    submitBtn.value = 'Generar reporte';
                                }

                            } catch (err) {
                                console.error('Error en guardado:', err);
                                alert('Error: ' + err.message);
                                if (submitBtn) {
                                    submitBtn.disabled = false;
                                    submitBtn.value = 'Generar reporte';
                                }
                            }
                        }).catch(function (err) {
                            console.error('Error generando PDF:', err);
                            alert('Error al generar el PDF: ' + err.message);
                            if (submitBtn) {
                                submitBtn.disabled = false;
                                submitBtn.value = 'Generar reporte';
                            }
                        });

                    } catch (error) {
                        console.error('Error en generación de PDF:', error);
                        alert('Error: ' + error.message);
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.value = 'Generar reporte';
                        }
                    }
                });
            }

            // Fauna Tabs switching functionality

  }
  return { init: init };
})();
