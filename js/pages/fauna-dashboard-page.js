window.MHRFaunaDashboardPage = (function () {
  function init(ctx) {
            (function () {
                const faunaTabs = document.querySelectorAll('.fauna-tab');
                const faunaContents = document.querySelectorAll('.fauna-tab-content');

                faunaTabs.forEach(tab => {
                    tab.addEventListener('click', function () {
                        const targetTab = this.getAttribute('data-fauna-tab');
                        const faunaTitle = this.getAttribute('data-fauna-title');

                        // Remove active class from all fauna tabs
                        faunaTabs.forEach(t => t.classList.remove('active'));
                        // Add active class to clicked tab
                        this.classList.add('active');

                        // Hide all fauna tab contents
                        faunaContents.forEach(content => content.classList.remove('active'));
                        // Show target fauna tab content
                        const targetContent = document.querySelector('.fauna-tab-content[data-fauna-tab-content="' + targetTab + '"]');
                        if (targetContent) {
                            targetContent.classList.add('active');
                        }

                        // Update main title when fauna tab changes
                        const mainTitle = document.getElementById('main-title');
                        if (mainTitle && faunaTitle) {
                            mainTitle.textContent = faunaTitle;
                        }

                        // Mostrar/ocultar sección de Pista según la pestaña
                        const pistaSection = document.getElementById('fauna_pista-section');
                        if (pistaSection) {
                            if (targetTab === 'rescate') {
                                pistaSection.style.display = 'none';
                            } else {
                                pistaSection.style.display = 'block';
                            }
                        }

                        // La forma oficial AFAC no lleva bloque de firmas: se oculta
                        // y el botón de envío adopta el nombre del trámite.
                        const isAfacTab = targetTab === 'afac';
                        const firmasWrap = document.getElementById('fauna-firmas-wrap');
                        if (firmasWrap) firmasWrap.style.display = isAfacTab ? 'none' : '';
                        const faunaSubmitBtn = document.querySelector('#fauna-form input[type="submit"]');
                        if (faunaSubmitBtn) {
                            faunaSubmitBtn.value = isAfacTab ? 'Generar notificación AFAC' : 'Generar reporte';
                        }
                    });
                });
            })();

            // Fauna Rescate Fotos Handler
            (function () {
                const fotosInputGaleria = document.getElementById('fauna_rescate_fotos_galeria');
                const fotosInputCamara = document.getElementById('fauna_rescate_fotos_camara');
                const fotosPreview = document.getElementById('fauna_rescate_fotos_preview');
                const galeriaBtn = document.getElementById('fauna_rescate_galeria_btn');
                const camaraBtn = document.getElementById('fauna_rescate_camara_btn');
                
                if ((fotosInputGaleria || fotosInputCamara) && fotosPreview) {
                    window.faunaRescateFotos = window.faunaRescateFotos || [];
                    
                    // Button click handlers
                    if (galeriaBtn) {
                        galeriaBtn.addEventListener('click', function (e) {
                            e.preventDefault();
                            fotosInputGaleria.click();
                        });
                    }
                    
                    if (camaraBtn) {
                        camaraBtn.addEventListener('click', function (e) {
                            e.preventDefault();
                            fotosInputCamara.click();
                        });
                    }
                    
                    function setupFotosListener(inputElement) {
                        if (inputElement) {
                            inputElement.addEventListener('change', function (e) {
                                const files = Array.from(this.files || []);
                                
                                files.forEach(file => {
                                    const reader = new FileReader();
                                    reader.onload = function (event) {
                                        window.faunaRescateFotos.push({
                                            name: file.name,
                                            dataURL: event.target.result
                                        });
                                        renderFotosPreview();
                                        inputElement.value = ''; // Reset input
                                    };
                                    reader.readAsDataURL(file);
                                });
                            });
                        }
                    }
                    
                    setupFotosListener(fotosInputGaleria);
                    setupFotosListener(fotosInputCamara);
                    
                    function renderFotosPreview() {
                        fotosPreview.innerHTML = '';
                        window.faunaRescateFotos.forEach((foto, idx) => {
                            const wrapper = document.createElement('div');
                            wrapper.style.cssText = 'position:relative; width:100px; height:100px; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.1);';
                            
                            const img = document.createElement('img');
                            img.src = foto.dataURL;
                            img.style.cssText = 'width:100%; height:100%; object-fit:cover;';
                            
                            const removeBtn = document.createElement('button');
                            removeBtn.type = 'button';
                            removeBtn.className = 'photo-thumb-remove';
                            removeBtn.style.cssText = 'position:absolute; top:2px; right:2px; width:24px; height:24px; padding:0; background:#ef4444; color:white; border:none; border-radius:50%; cursor:pointer; font-weight:bold; display:flex; align-items:center; justify-content:center;';
                            removeBtn.textContent = '×';
                            removeBtn.title = 'Eliminar foto';
                            removeBtn.onclick = function (e) {
                                e.preventDefault();
                                window.faunaRescateFotos.splice(idx, 1);
                                renderFotosPreview();
                            };
                            
                            wrapper.appendChild(img);
                            wrapper.appendChild(removeBtn);
                            fotosPreview.appendChild(wrapper);
                        });
                    }
                }
            })();

            // Fauna Rescate Clase Handler
            (function () {
                const claseSelect = document.getElementById('fauna_rescate_clase');
                const claseOtroInput = document.getElementById('fauna_rescate_clase_otro');
                
                if (claseSelect && claseOtroInput) {
                    claseSelect.addEventListener('change', function () {
                        if (this.value === 'Otro') {
                            claseOtroInput.style.display = 'block';
                        } else {
                            claseOtroInput.style.display = 'none';
                            claseOtroInput.value = '';
                        }
                    });
                }
            })();

            // Fauna Items (Impacto) Fotos Handler - Avistamiento, Presencia, Daño
            (function () {
                window.faunaItemPhotos = window.faunaItemPhotos || {
                    avistamiento: [],
                    presencia: [],
                    daino: []
                };

                // Configurar handlers para cada tipo de fauna
                ['avistamiento', 'presencia', 'daino'].forEach(function(faunaType) {
                    var gateriaBtn = document.querySelector('.fauna-fotos-galeria-btn[data-fauna="' + faunaType + '"]');
                    var camaraBtn = document.querySelector('.fauna-fotos-camara-btn[data-fauna="' + faunaType + '"]');
                    var fileInput = document.querySelector('.fauna-fotos-input[data-fauna="' + faunaType + '"]');
                    var preview = document.querySelector('.fauna-fotos-preview[data-fauna="' + faunaType + '"]');

                    if (!fileInput) return;

                    // Handlers para botones
                    if (gateriaBtn) {
                        gateriaBtn.addEventListener('click', function(e) {
                            e.preventDefault();
                            fileInput.click();
                        });
                    }

                    if (camaraBtn) {
                        camaraBtn.addEventListener('click', function(e) {
                            e.preventDefault();
                            var cameraInput = document.createElement('input');
                            cameraInput.type = 'file';
                            cameraInput.accept = 'image/*';
                            cameraInput.capture = 'environment';
                            cameraInput.onchange = function(e) {
                                handleFaunaPhotoSelect(faunaType, e.target.files);
                            };
                            cameraInput.click();
                        });
                    }

                    // Handler para cambio de archivo
                    fileInput.addEventListener('change', function(e) {
                        handleFaunaPhotoSelect(faunaType, e.target.files);
                        this.value = ''; // Reset
                    });

                    function handleFaunaPhotoSelect(type, files) {
                        Array.from(files || []).forEach(function(file) {
                            var reader = new FileReader();
                            reader.onload = function(event) {
                                window.faunaItemPhotos[type].push({
                                    name: file.name,
                                    dataURL: event.target.result
                                });
                                renderFaunaPhotoPreview(type);
                            };
                            reader.readAsDataURL(file);
                        });
                    }

                    function renderFaunaPhotoPreview(type) {
                        var previw = document.querySelector('.fauna-fotos-preview[data-fauna="' + type + '"]');
                        if (!previw) return;

                        previw.innerHTML = '';
                        window.faunaItemPhotos[type].forEach(function(foto, idx) {
                            var wrapper = document.createElement('div');
                            wrapper.style.cssText = 'position:relative; width:80px; height:80px; border-radius:6px; overflow:hidden; box-shadow:0 2px 6px rgba(0,0,0,0.15);';

                            var img = document.createElement('img');
                            img.src = foto.dataURL;
                            img.style.cssText = 'width:100%; height:100%; object-fit:cover;';

                            var removeBtn = document.createElement('button');
                            removeBtn.type = 'button';
                            removeBtn.style.cssText = 'position:absolute; top:0; right:0; width:20px; height:20px; padding:0; background:#ef4444; color:white; border:none; cursor:pointer; font-weight:bold; font-size:12px;';
                            removeBtn.textContent = '×';
                            removeBtn.onclick = function(e) {
                                e.preventDefault();
                                window.faunaItemPhotos[type].splice(idx, 1);
                                renderFaunaPhotoPreview(type);
                            };

                            wrapper.appendChild(img);
                            wrapper.appendChild(removeBtn);
                            previw.appendChild(wrapper);
                        });
                    }
                });
            })();

            async function cargarCatalogosFauna() {
                var client = window.supabaseClient;
                var svc = window.MHRFaunaCatalogService;
                if (!client || !svc) return;

                await Promise.all([
                    svc.cargarCatalogoSelect(client, 'catalogo_clase', document.getElementById('fauna_rescate_clase'), '-- Seleccionar Clase --'),
                    svc.cargarCatalogoSelect(client, 'catalogo_destino', document.getElementById('fauna_rescate_sitio_reubicacion'), '-- Seleccionar Sitio de Reubicación --'),
                    svc.cargarCatalogoSelect(client, 'catalogo_clase', document.getElementById('filter-fauna-clase'), 'Todas las clases'),
                    svc.cargarCatalogoSelect(client, 'catalogo_especie', document.getElementById('filter-fauna-especie'), 'Todas las especies')
                ]);

                await Promise.all([
                    svc.cargarEspeciesPorClase(client, document.getElementById('fauna_rescate_clase'), document.getElementById('fauna_rescate_especie'), '-- Seleccionar Especie --'),
                    svc.cargarEspeciesPorClase(client, document.getElementById('filter-fauna-clase'), document.getElementById('filter-fauna-especie'), 'Todas las especies')
                ]);

                var claseSelectRescate = document.getElementById('fauna_rescate_clase');
                var especieSelectRescate = document.getElementById('fauna_rescate_especie');
                if (claseSelectRescate && especieSelectRescate && claseSelectRescate.dataset.catalogoWired !== '1') {
                    claseSelectRescate.dataset.catalogoWired = '1';
                    claseSelectRescate.addEventListener('change', function () {
                        svc.cargarEspeciesPorClase(client, claseSelectRescate, especieSelectRescate, '-- Seleccionar Especie --');
                    });
                }

                var claseSelectFiltro = document.getElementById('filter-fauna-clase');
                var especieSelectFiltro = document.getElementById('filter-fauna-especie');
                if (claseSelectFiltro && especieSelectFiltro && claseSelectFiltro.dataset.catalogoWired !== '1') {
                    claseSelectFiltro.dataset.catalogoWired = '1';
                    claseSelectFiltro.addEventListener('change', function () {
                        svc.cargarEspeciesPorClase(client, claseSelectFiltro, especieSelectFiltro, 'Todas las especies');
                    });
                }
            }

            // ── helpers para estadísticas fauna ──────────────────────────────
            function fesCountBy(arr, field) {
                var idx = {};
                arr.forEach(function(r){
                    var v = r[field];
                    if (!v || String(v).trim() === '') return;
                    idx[v] = (idx[v] || 0) + 1;
                });
                return Object.entries(idx).sort(function(a,b){ return b[1]-a[1]; });
            }
            function fesTopKey(pairs) { return pairs.length ? pairs[0][0] : '–'; }

            // Igual que fesCountBy, pero un mismo registro puede aportar varios
            // valores separados por coma (p. ej. varias partes del avión
            // impactadas en una misma notificación AFAC).
            function fesCountByMulti(arr, field) {
                var idx = {};
                arr.forEach(function(r){
                    String(r[field] || '').split(',').forEach(function(raw){
                        var v = raw.trim();
                        if (!v) return;
                        idx[v] = (idx[v] || 0) + 1;
                    });
                });
                return Object.entries(idx).sort(function(a,b){ return b[1]-a[1]; });
            }

            // Cuenta valores de un arreglo de texto (columnas text[] de AFAC)
            function fesCountByArray(arr, field, mapFn) {
                var idx = {};
                arr.forEach(function(r){
                    var list = Array.isArray(r[field]) ? r[field] : [];
                    list.forEach(function(raw){
                        var v = mapFn ? mapFn(raw) : raw;
                        v = String(v || '').trim();
                        if (!v) return;
                        idx[v] = (idx[v] || 0) + 1;
                    });
                });
                return Object.entries(idx).sort(function(a,b){ return b[1]-a[1]; });
            }

            function fesFillTable(tbodyId, rows, emptyMsg) {
                var tb = document.getElementById(tbodyId);
                if (!tb) return;
                if (!rows || rows.length === 0) {
                    tb.innerHTML = '<tr><td colspan="3" style="padding:12px;color:#94a3b8;text-align:center;">' + (emptyMsg || 'Sin datos') + '</td></tr>';
                    return;
                }
                var total = rows.reduce(function(s,r){ return s + r[1]; }, 0);
                tb.innerHTML = rows.map(function(r){
                    var pct = total ? Math.round(r[1] / total * 100) : 0;
                    return '<tr>' +
                        '<td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;">' + r[0] + '</td>' +
                        '<td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;min-width:36px;">' + r[1] + '</td>' +
                        '<td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;min-width:120px;">' +
                            '<div style="background:#e2e8f0;border-radius:99px;height:8px;overflow:hidden;">' +
                                '<div style="background:#2563eb;width:' + pct + '%;height:100%;border-radius:99px;"></div>' +
                            '</div>' +
                        '</td>' +
                    '</tr>';
                }).join('');
            }

            function fesFill3ColTable(tbodyId, rows, emptyMsg) {
                var tb = document.getElementById(tbodyId);
                if (!tb) return;
                if (!rows || rows.length === 0) {
                    tb.innerHTML = '<tr><td colspan="3" style="padding:12px;color:#94a3b8;text-align:center;">' + (emptyMsg || 'Sin datos') + '</td></tr>';
                    return;
                }
                tb.innerHTML = rows.map(function(r){
                    return '<tr>' +
                        '<td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;">' + r[0] + '</td>' +
                        '<td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;">' + r[1] + '</td>' +
                        '<td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;">' + r[2] + '</td>' +
                    '</tr>';
                }).join('');
            }

            // ── Chart: barras verticales ─────────────────────────────────────
            function fesBarChart(containerId, labelsId, values, labels, color) {
                var el = document.getElementById(containerId);
                var lblEl = document.getElementById(labelsId);
                if (!el) return;
                var max = Math.max.apply(null, values.concat([1]));
                el.innerHTML = values.map(function(v, i){
                    var h = Math.round(v / max * 100);
                    return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;min-width:0;">' +
                        '<span style="font-size:10px;font-weight:700;color:#475569;margin-bottom:2px;">' + (v || '') + '</span>' +
                        '<div style="width:80%;border-radius:4px 4px 0 0;background:' + color + ';height:' + h + '%;min-height:' + (v ? 4 : 0) + 'px;"></div>' +
                    '</div>';
                }).join('');
                if (lblEl) {
                    lblEl.innerHTML = labels.map(function(l){
                        return '<span style="flex:1;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + l + '</span>';
                    }).join('');
                }
            }

            // ── Chart: barras horizontales (especie) ─────────────────────────
            function fesHBarChart(containerId, pairs, color) {
                var el = document.getElementById(containerId);
                if (!el) return;
                if (!pairs || !pairs.length) { el.innerHTML = '<div style="color:#94a3b8;text-align:center;padding:12px;font-size:13px;">Sin datos</div>'; return; }
                var max = pairs[0][1] || 1;
                el.innerHTML = pairs.slice(0, 15).map(function(p){
                    var pct = Math.round(p[1] / max * 100);
                    // Shorten label to common name (first part before parenthesis)
                    var label = String(p[0]).replace(/\s*\(.*\)$/, '');
                    return '<div style="display:flex;align-items:center;gap:8px;font-size:12px;">' +
                        '<div style="width:140px;min-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#374151;text-align:right;" title="' + p[0] + '">' + label + '</div>' +
                        '<div style="flex:1;background:#e2e8f0;border-radius:4px;height:18px;overflow:hidden;position:relative;">' +
                            '<div style="background:' + color + ';width:' + pct + '%;height:100%;border-radius:4px;"></div>' +
                            '<span style="position:absolute;right:6px;top:0;line-height:18px;font-size:11px;font-weight:700;color:#374151;">' + p[1] + '</span>' +
                        '</div>' +
                    '</div>';
                }).join('');
            }

            // ── Chart: heatmap Mes × Condición ───────────────────────────────
            function fesHeatmap(containerId, data) {
                var el = document.getElementById(containerId);
                if (!el) return;
                var MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
                var CONDICIONES = ['Despejado','Nublado','Nublado-Neblina','Lluvia','Tormenta','Niebla'];

                // Build matrix
                var matrix = {};
                var globalMax = 1;
                CONDICIONES.forEach(function(c){ matrix[c] = new Array(12).fill(0); });

                data.forEach(function(r){
                    var cond = r.condicion_meteo || '';
                    if (!cond) return;
                    var d = r.created_at ? new Date(r.created_at) : null;
                    if (!d) return;
                    var month = d.getMonth(); // 0-11
                    if (!matrix[cond]) matrix[cond] = new Array(12).fill(0);
                    matrix[cond][month]++;
                    if (matrix[cond][month] > globalMax) globalMax = matrix[cond][month];
                });

                // Only show conditions that have data
                var activeConds = CONDICIONES.filter(function(c){ return matrix[c] && matrix[c].some(function(v){ return v > 0; }); });
                if (!activeConds.length) {
                    el.innerHTML = '<div style="color:#94a3b8;padding:16px;font-size:13px;">Sin datos de condición meteorológica. Rellena el campo en nuevos reportes.</div>';
                    var maxEl = document.getElementById('fes-imp-heatmap-max');
                    if (maxEl) maxEl.textContent = '0';
                    return;
                }

                var maxEl = document.getElementById('fes-imp-heatmap-max');
                if (maxEl) maxEl.textContent = globalMax;

                function heatColor(v, max) {
                    if (!v) return '#fef9c3';
                    var t = v / max;
                    // interpolate yellow→orange→red
                    if (t < 0.33) {
                        var r = Math.round(254 + (251-254)*t/0.33);
                        var g = Math.round(249 + (191-249)*t/0.33);
                        var b = Math.round(195 + (36-195)*t/0.33);
                        return 'rgb('+r+','+g+','+b+')';
                    } else if (t < 0.66) {
                        var tt = (t-0.33)/0.33;
                        var r = Math.round(251 + (245-251)*tt);
                        var g = Math.round(191 + (158-191)*tt);
                        var b = Math.round(36 + (11-36)*tt);
                        return 'rgb('+r+','+g+','+b+')';
                    } else {
                        var tt2 = (t-0.66)/0.34;
                        var r2 = Math.round(245 + (220-245)*tt2);
                        var g2 = Math.round(158 + (38-158)*tt2);
                        var b2 = Math.round(11 + (38-11)*tt2);
                        return 'rgb('+r2+','+g2+','+b2+')';
                    }
                }

                var cellW = 'minmax(36px,1fr)';
                var html = '<table style="width:100%;border-collapse:collapse;font-size:12px;">';
                // Header row
                html += '<tr><th style="padding:4px 8px;text-align:right;color:#64748b;font-weight:400;width:130px;"></th>';
                MESES.forEach(function(m){ html += '<th style="padding:4px 2px;text-align:center;color:#64748b;font-weight:600;">' + m + '</th>'; });
                html += '</tr>';
                // Data rows
                activeConds.forEach(function(cond){
                    html += '<tr>';
                    html += '<td style="padding:6px 8px;text-align:right;color:#374151;white-space:nowrap;font-weight:600;">' + cond + '</td>';
                    matrix[cond].forEach(function(v){
                        var bg = heatColor(v, globalMax);
                        html += '<td style="padding:4px 2px;text-align:center;background:' + bg + ';font-weight:' + (v?'700':'400') + ';color:#374151;">' + (v || '0') + '</td>';
                    });
                    html += '</tr>';
                });
                html += '</table>';
                el.innerHTML = html;
            }

            // ── mini mapas en pestaña estadísticas ───────────────────────────
            var _fesImpMap = null, _fesResMap = null;
            function fesInitMiniMap(containerId, data, color) {
                var el = document.getElementById(containerId);
                if (!el || typeof L === 'undefined') return null;
                var m = L.map(el, { zoomControl:true, attributionControl:false });
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m);
                var bounds = [];
                data.forEach(function(r){
                    var lat = parseFloat(r.ubicacion_lat), lng = parseFloat(r.ubicacion_lng);
                    if (!isFinite(lat) || !isFinite(lng)) return;
                    bounds.push([lat, lng]);
                    var icon = L.divIcon({
                        html: '<div style="width:12px;height:12px;border-radius:50%;background:' + color + ';border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);"></div>',
                        className:'', iconSize:[12,12], iconAnchor:[6,6]
                    });
                    L.marker([lat, lng], { icon: icon })
                        .bindPopup('<b>' + (r.especie || r.clase || r.tipo_reporte || '') + '</b><br>' + (r.fecha_reporte || ''))
                        .addTo(m);
                });
                if (bounds.length) {
                    m.fitBounds(bounds, { padding:[20,20], maxZoom:15 });
                } else {
                    m.setView([19.43, -99.07], 10);
                }
                return m;
            }

            // ── sub-tab switching (Gráficas / Aerolíneas) ────────────────────
            window.fesSwitchSubTab = function(sub) {
                // Impactos sub-tabs
                var panGraf    = document.getElementById('fes-sub-graficas');
                var panAero    = document.getElementById('fes-sub-aerolineas');
                var panMapaImp = document.getElementById('fes-sub-mapa-imp');
                var panAfac    = document.getElementById('fes-sub-afac');
                var tGraf    = document.getElementById('fes-subtab-graficas');
                var tAero    = document.getElementById('fes-subtab-aerolineas');
                var tMapaImp = document.getElementById('fes-subtab-mapa-imp');
                var tAfac    = document.getElementById('fes-subtab-afac');
                // Rescates sub-tabs
                var panResRes  = document.getElementById('fes-sub-res-resumen');
                var panMapaRes = document.getElementById('fes-sub-mapa-res');
                var tResRes  = document.getElementById('fes-subtab-res-resumen');
                var tMapaRes = document.getElementById('fes-subtab-mapa-res');

                function setActive(btn, color) {
                    if (!btn) return;
                    btn.style.borderBottomColor = color;
                    btn.style.color = color;
                }
                function setInactive(btn) {
                    if (!btn) return;
                    btn.style.borderBottomColor = 'transparent';
                    btn.style.color = '#64748b';
                }

                // ── Impactos sub-tabs ────────────────────────────────────────
                if (sub === 'graficas' || sub === 'aerolineas' || sub === 'mapa-imp' || sub === 'afac') {
                    if (panGraf)    panGraf.style.display    = sub === 'graficas'   ? '' : 'none';
                    if (panAero)    panAero.style.display    = sub === 'aerolineas' ? '' : 'none';
                    if (panMapaImp) panMapaImp.style.display = sub === 'mapa-imp'   ? '' : 'none';
                    if (panAfac)    panAfac.style.display    = sub === 'afac'       ? '' : 'none';
                    setInactive(tGraf); setInactive(tAero); setInactive(tMapaImp); setInactive(tAfac);
                    if (sub === 'graficas')        setActive(tGraf,    '#dc2626');
                    else if (sub === 'aerolineas') setActive(tAero,    '#1d4ed8');
                    else if (sub === 'afac')       setActive(tAfac,    '#0f766e');
                    else                            setActive(tMapaImp, '#0d9488');
                    if (sub === 'aerolineas' && window._fesLastImpData) fesRenderAerolineas(window._fesLastImpData);
                    if (sub === 'mapa-imp') {
                        _populateFaunaMapFilters('fes-imp-map').then(function () {
                            _wireFesImpMapFilters();
                            _refreshFesImpMap();
                        });
                    }
                    if (sub === 'afac') loadAfacStatistics();
                }
                // ── Rescates sub-tabs ────────────────────────────────────────
                else if (sub === 'res-resumen' || sub === 'mapa-res') {
                    if (panResRes)  panResRes.style.display  = sub === 'res-resumen' ? '' : 'none';
                    if (panMapaRes) panMapaRes.style.display = sub === 'mapa-res'   ? '' : 'none';
                    setInactive(tResRes); setInactive(tMapaRes);
                    if (sub === 'res-resumen') setActive(tResRes,  '#16a34a');
                    else                       setActive(tMapaRes, '#0d9488');
                    if (sub === 'mapa-res') {
                        _populateFaunaMapFilters('fes-res-map').then(function () {
                            _wireFesResMapFilters();
                            _refreshFesResMap();
                        });
                    }
                }
            };

            // ── Mapas embebidos de Estadística Fauna (Impactos / Rescates) ──
            var _fesImpBigMap = null, _fesImpBigLayer = null, _fesImpFiltersWired = false;
            var _fesResBigMap = null, _fesResBigLayer = null, _fesResFiltersWired = false;

            function _faunaClaseColor(c) {
                var v = String(c || '').trim().toLowerCase();
                if (v.indexOf('ave') === 0)  return '#2563eb';
                if (v.indexOf('mam') === 0)  return '#8b5a2b';
                if (v.indexOf('rep') === 0)  return '#16a34a';
                if (v.indexOf('anf') === 0)  return '#0891b2';
                return '#64748b';
            }

            function _renderFaunaLegend(elId) {
                var el = document.getElementById(elId);
                if (!el) return;
                var items = [
                    { c: '#2563eb', t: 'Ave' },
                    { c: '#8b5a2b', t: 'Mamífero' },
                    { c: '#16a34a', t: 'Reptil' },
                    { c: '#0891b2', t: 'Anfibio' },
                    { c: '#64748b', t: 'Otra/Sin clase' }
                ];
                el.innerHTML = items.map(function (i) {
                    return '<span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;color:#475569;">' +
                        '<span style="width:10px;height:10px;border-radius:50%;background:' + i.c + ';display:inline-block;border:1.5px solid #fff;box-shadow:0 0 0 1px ' + i.c + ';"></span>' +
                        i.t +
                    '</span>';
                }).join('');
            }

            function _faunaEsc(s) {
                return String(s == null ? '' : s).replace(/[<>&"']/g, function (c) {
                    return c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c === '"' ? '&quot;' : '&#39;';
                });
            }

            // Lookup especie → clase a partir de los catálogos de fauna.
            // Se carga una sola vez. Devuelve un Map(normalizado(especie) → nombre_clase).
            var _especieClaseMap = null;
            async function _ensureEspecieClaseMap() {
                if (_especieClaseMap) return _especieClaseMap;
                _especieClaseMap = new Map();
                var client = window.supabaseClient;
                if (!client) return _especieClaseMap;
                try {
                    var [especiesRes, clasesRes] = await Promise.all([
                        client.from('catalogo_especie').select('nombre, clase_id'),
                        client.from('catalogo_clase').select('id, nombre')
                    ]);
                    var clasesById = {};
                    (clasesRes.data || []).forEach(function (c) { clasesById[c.id] = c.nombre; });
                    (especiesRes.data || []).forEach(function (e) {
                        if (!e.nombre) return;
                        var norm = String(e.nombre).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
                        _especieClaseMap.set(norm, clasesById[e.clase_id] || '');
                    });
                } catch (err) {
                    console.warn('No se pudo cargar mapa especie→clase', err);
                }
                return _especieClaseMap;
            }

            function _lookupClaseForEspecie(especie) {
                if (!especie || !_especieClaseMap) return '';
                var norm = String(especie).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
                return _especieClaseMap.get(norm) || '';
            }

            // Infiere la clase a partir del tipo de item del impacto
            function _inferClaseFromItemType(itemType) {
                var t = String(itemType || '').toLowerCase();
                if (t.indexOf('ave') !== -1) return 'Ave';
                if (t.indexOf('mam') !== -1) return 'Mamífero';
                if (t.indexOf('reptil') !== -1) return 'Reptil';
                if (t.indexOf('anf') !== -1) return 'Anfibio';
                if (t.indexOf('animal') !== -1) return 'Mamífero';
                return '';
            }

            // Extrae un campo de los detalle_items por nombre (varios alias)
            function _itemField(fields, names) {
                if (!Array.isArray(fields)) return '';
                for (var i = 0; i < fields.length; i++) {
                    var key = String(fields[i].key || '').toLowerCase();
                    for (var j = 0; j < names.length; j++) {
                        if (key === names[j].toLowerCase()) return fields[i].value || '';
                    }
                }
                return '';
            }

            // Convierte reportes de impacto en marcadores. Estrategia:
            // 1) Si hay items con coordenadas propias en su campo "Ubicación", uno por item.
            // 2) Si no, un marcador por reporte usando ubicacion_lat/lng (campos planos),
            //    enriquecido con la especie/clase del primer item si existe.
            function _flattenImpactoMarkers(reports) {
                var out = [];
                (reports || []).forEach(function (r) {
                    var items = Array.isArray(r.detalle_items) ? r.detalle_items : [];

                    // Datos de respaldo a partir del primer item
                    var fallbackEsp = '';
                    var fallbackTipo = '';
                    if (items.length > 0) {
                        fallbackEsp  = _itemField(items[0].fields, ['Especie', 'especie']) ||
                                       _itemField(items[0].fields, ['Otra Especie', 'especie_otra']) ||
                                       _itemField(items[0].fields, ['Tipo de Animal', 'tipo_animal']);
                        fallbackTipo = items[0].type || '';
                    }

                    // Intentar coords por item
                    var perItemCount = 0;
                    items.forEach(function (it) {
                        var lugar = _itemField(it.fields, ['Ubicación', 'Ubicacion', 'lugar']);
                        if (!lugar) return;
                        var m = String(lugar).match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
                        if (!m) return;
                        var lat = parseFloat(m[1]), lng = parseFloat(m[2]);
                        if (!isFinite(lat) || !isFinite(lng)) return;
                        var esp = _itemField(it.fields, ['Especie', 'especie']) ||
                                  _itemField(it.fields, ['Otra Especie', 'especie_otra']) ||
                                  _itemField(it.fields, ['Tipo de Animal', 'tipo_animal']);
                        var clase = _inferClaseFromItemType(it.type) || _lookupClaseForEspecie(esp);
                        out.push({
                            id: r.id, folio: r.folio, fecha_reporte: r.fecha_reporte,
                            tipo_reporte: r.tipo_reporte || r.evento || 'Impacto',
                            clase: clase, especie: esp || '',
                            ubicacion_lat: lat, ubicacion_lng: lng,
                            ubicacion_texto: lugar, item_type: it.type || ''
                        });
                        perItemCount++;
                    });

                    // Fallback: un solo marcador desde campos planos del reporte
                    if (perItemCount === 0) {
                        var lat0 = r.ubicacion_lat != null ? parseFloat(r.ubicacion_lat) : null;
                        var lng0 = r.ubicacion_lng != null ? parseFloat(r.ubicacion_lng) : null;
                        if (isFinite(lat0) && isFinite(lng0)) {
                            var esp0 = r.especie || fallbackEsp || '';
                            var clase0 = r.clase ||
                                         _inferClaseFromItemType(fallbackTipo) ||
                                         _lookupClaseForEspecie(esp0);
                            out.push({
                                id: r.id, folio: r.folio, fecha_reporte: r.fecha_reporte,
                                tipo_reporte: r.tipo_reporte || r.evento || 'Impacto',
                                clase: clase0, especie: esp0,
                                ubicacion_lat: lat0, ubicacion_lng: lng0,
                                ubicacion_texto: r.ubicacion_texto || '',
                                item_type: fallbackTipo
                            });
                        }
                    }
                });
                return out;
            }

            async function _populateFaunaMapFilters(prefix) {
                var client = window.supabaseClient;
                if (!client) return;
                var yearSel    = document.getElementById(prefix + '-year');
                var monthSel   = document.getElementById(prefix + '-month');
                var claseSel   = document.getElementById(prefix + '-clase');
                var especieSel = document.getElementById(prefix + '-especie');

                if (yearSel && !yearSel.options.length) {
                    try {
                        var years = await window.MHRFaunaReportService.getHallazgosYears(client);
                        yearSel.innerHTML = '<option value="" selected>Todos los años</option>' +
                            (years || []).map(function (y) { return '<option value="' + y + '">' + y + '</option>'; }).join('');
                    } catch (e) {
                        yearSel.innerHTML = '<option value="" selected>Todos los años</option>';
                    }
                }
                if (monthSel && !monthSel.options.length) {
                    var meses = ['Todos los meses', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                    monthSel.innerHTML = meses.map(function (m, i) {
                        var v = i === 0 ? '' : String(i).padStart(2, '0');
                        return '<option value="' + v + '"' + (i === 0 ? ' selected' : '') + '>' + m + '</option>';
                    }).join('');
                }

                // Cargar clase y especie como opciones planas (NO usar cargarCatalogoSelect
                // porque hace el placeholder disabled y el navegador termina seleccionando
                // el primer item real como valor por defecto).
                if (claseSel && claseSel.dataset.faunaMapWired !== '1') {
                    claseSel.dataset.faunaMapWired = '1';
                    var clasesRes = await client.from('catalogo_clase').select('nombre').eq('activo', true).order('orden', { ascending: true });
                    var clases = clasesRes && clasesRes.data ? clasesRes.data : [];
                    claseSel.innerHTML = '<option value="" selected>Todas las clases</option>' +
                        clases.map(function (c) { return '<option value="' + _faunaEsc(c.nombre) + '">' + _faunaEsc(c.nombre) + '</option>'; }).join('');

                    async function _reloadEspecies() {
                        if (!especieSel) return;
                        var claseNombre = claseSel.value || '';
                        var query = client.from('catalogo_especie').select('nombre, clase_id').eq('activo', true).order('orden', { ascending: true });
                        if (claseNombre) {
                            // Necesitamos el id de la clase
                            var claseId = null;
                            try {
                                var cRes = await client.from('catalogo_clase').select('id').eq('nombre', claseNombre).maybeSingle();
                                claseId = cRes && cRes.data ? cRes.data.id : null;
                            } catch (err) { }
                            if (claseId) query = query.eq('clase_id', claseId);
                        }
                        var espRes = await query;
                        var especies = espRes && espRes.data ? espRes.data : [];
                        especieSel.innerHTML = '<option value="" selected>Todas las especies</option>' +
                            especies.map(function (e) { return '<option value="' + _faunaEsc(e.nombre) + '">' + _faunaEsc(e.nombre) + '</option>'; }).join('');
                    }
                    await _reloadEspecies();
                    claseSel.addEventListener('change', function () {
                        _reloadEspecies().then(function () {
                            if (prefix === 'fes-imp-map') _refreshFesImpMap();
                            else _refreshFesResMap();
                        });
                    });
                }
            }

            function _initFaunaSatelliteMap(elId) {
                if (typeof L === 'undefined') return null;
                var el = document.getElementById(elId);
                if (!el) return null;
                var m = L.map(elId, { center: [19.7470, -99.0125], zoom: 14, scrollWheelZoom: true });
                // Vista satelital Google únicamente, sin etiquetas
                L.tileLayer('https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
                    attribution: '&copy; Google Maps',
                    subdomains: ['0', '1', '2', '3'],
                    maxZoom: 21
                }).addTo(m);
                return m;
            }

            function _renderFaunaMapMarkers(map, layer, data, countElId, label) {
                layer.clearLayers();
                var bounds = [], added = 0;
                (data || []).forEach(function (r) {
                    var lat = parseFloat(r.ubicacion_lat), lng = parseFloat(r.ubicacion_lng);
                    if (!isFinite(lat) || !isFinite(lng)) return;
                    var color = _faunaClaseColor(r.clase);
                    var fechaStr = r.fecha_reporte || '–';
                    var titulo = r.especie || r.clase || label;
                    var popup = '<div style="font-family:Inter,Arial,sans-serif;font-size:12px;min-width:220px;">' +
                        '<div style="font-weight:700;color:#0f172a;margin-bottom:4px;">' + _faunaEsc(titulo) + '</div>' +
                        '<div><strong>Folio:</strong> ' + _faunaEsc(r.folio || '-') + '</div>' +
                        '<div><strong>Fecha:</strong> ' + _faunaEsc(fechaStr) + '</div>' +
                        (r.clase ? '<div><strong>Clase:</strong> ' + _faunaEsc(r.clase) + '</div>' : '') +
                        (r.tipo_reporte ? '<div><strong>Tipo:</strong> ' + _faunaEsc(r.tipo_reporte) + '</div>' : '') +
                        (r.ubicacion_texto ? '<div><strong>Lugar:</strong> ' + _faunaEsc(r.ubicacion_texto) + '</div>' : '') +
                        '<div style="margin-top:6px;">' +
                            '<a href="https://www.google.com/maps?q=' + lat + ',' + lng + '" target="_blank" rel="noopener" style="color:#1d4ed8;text-decoration:underline;">📍 Abrir en Google Maps</a>' +
                        '</div>' +
                    '</div>';
                    L.circleMarker([lat, lng], {
                        radius: 8, color: '#fff', weight: 2, fillColor: color, fillOpacity: 0.95
                    }).bindPopup(popup)
                      .bindTooltip(titulo, { direction: 'top', offset: [0, -8], opacity: 0.95 })
                      .addTo(layer);
                    bounds.push([lat, lng]);
                    added++;
                });
                var countEl = document.getElementById(countElId);
                if (countEl) countEl.textContent = added + ' ' + (added === 1 ? label.toLowerCase() : label.toLowerCase() + 's') + ' en mapa';
                if (bounds.length > 0) {
                    try { map.fitBounds(bounds, { padding: [30, 30], maxZoom: 18 }); } catch (e) { }
                } else {
                    map.setView([19.7470, -99.0125], 14);
                }
            }

            async function _refreshFesImpMap() {
                if (!window.supabaseClient || typeof L === 'undefined') return;
                if (!_fesImpBigMap) {
                    _fesImpBigMap = _initFaunaSatelliteMap('fes-imp-map');
                    if (!_fesImpBigMap) return;
                    _fesImpBigLayer = L.layerGroup().addTo(_fesImpBigMap);
                }
                setTimeout(function () { try { _fesImpBigMap.invalidateSize(); } catch (e) { } }, 50);

                // Asegurar mapa especie→clase
                await _ensureEspecieClaseMap();

                // Si todavía no se han cargado las estadísticas (entrada directa a la pestaña),
                // disparamos la carga para hidratar window._fesLastImpData.
                if (!window._fesLastImpData) {
                    try { await loadFaunaStatistics(); } catch (e) { console.error(e); }
                }
                var raw = window._fesLastImpData || [];

                var yearV    = document.getElementById('fes-imp-map-year')?.value || '';
                var monthV   = document.getElementById('fes-imp-map-month')?.value || '';
                var claseV   = (document.getElementById('fes-imp-map-clase')?.value || '').toLowerCase();
                var especieV = (document.getElementById('fes-imp-map-especie')?.value || '').toLowerCase();

                // Marcadores derivados de los detalle_items (lat/lng por item, fallback al reporte)
                var allMarkers = _flattenImpactoMarkers(raw);

                // Diagnóstico: ¿cuántos reportes hay y cuántos tienen coords?
                var totalReports = raw.length;
                var reportsWithCoords = raw.filter(function (r) {
                    if (r.ubicacion_lat != null && r.ubicacion_lng != null) return true;
                    var items = Array.isArray(r.detalle_items) ? r.detalle_items : [];
                    return items.some(function (it) {
                        var lugar = _itemField(it.fields, ['Ubicación', 'Ubicacion', 'lugar']);
                        return lugar && /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/.test(lugar);
                    });
                }).length;
                console.log('[Mapa Impactos] Reportes:', totalReports, '| con coords:', reportsWithCoords, '| marcadores aplanados:', allMarkers.length);
                if (allMarkers.length > 0) {
                    console.log('[Mapa Impactos] Primer marcador:', allMarkers[0]);
                }

                var markers = allMarkers.filter(function (m) {
                    if (yearV) {
                        var y = (m.fecha_reporte || '').toString().slice(0, 4);
                        if (y !== String(yearV)) return false;
                    }
                    if (monthV) {
                        var mo = (m.fecha_reporte || '').toString().slice(5, 7);
                        if (mo !== String(monthV)) return false;
                    }
                    if (claseV) {
                        var mc = String(m.clase || '').toLowerCase();
                        if (!mc) return false;
                        var root = claseV.replace(/s$/, '');
                        if (mc.indexOf(root) === -1) return false;
                    }
                    if (especieV) {
                        var ms = String(m.especie || '').toLowerCase();
                        if (!ms) return false;
                        var msRoot = ms.split('(')[0].trim();
                        var espRoot = especieV.split('(')[0].trim();
                        if (msRoot.indexOf(espRoot) === -1 && espRoot.indexOf(msRoot) === -1) return false;
                    }
                    return true;
                });

                _renderFaunaLegend('fes-imp-map-legend');
                _renderFaunaMapMarkers(_fesImpBigMap, _fesImpBigLayer, markers, 'fes-imp-map-count', 'Impacto');

                // Mensaje diagnóstico si no hay marcadores
                var countEl = document.getElementById('fes-imp-map-count');
                if (countEl && markers.length === 0) {
                    if (totalReports === 0) {
                        countEl.innerHTML = '<span style="color:#94a3b8;">No hay reportes de impacto en la base de datos.</span>';
                    } else if (reportsWithCoords === 0) {
                        countEl.innerHTML = '<span style="color:#dc2626;">⚠ Hay ' + totalReports + ' reportes pero ninguno tiene ubicación registrada. Selecciona el punto en el mapa al crear el reporte.</span>';
                    } else if (allMarkers.length === 0) {
                        countEl.innerHTML = '<span style="color:#dc2626;">⚠ No se pudieron extraer coordenadas de los ' + reportsWithCoords + ' reportes con ubicación. Revisa la consola.</span>';
                    } else {
                        countEl.innerHTML = '<span style="color:#94a3b8;">0 impactos coinciden con los filtros (' + allMarkers.length + ' disponibles sin filtrar).</span>';
                    }
                }
            }

            async function _refreshFesResMap() {
                if (!window.supabaseClient || typeof L === 'undefined') return;
                if (!_fesResBigMap) {
                    _fesResBigMap = _initFaunaSatelliteMap('fes-res-map-big');
                    if (!_fesResBigMap) return;
                    _fesResBigLayer = L.layerGroup().addTo(_fesResBigMap);
                }
                setTimeout(function () { try { _fesResBigMap.invalidateSize(); } catch (e) { } }, 50);
                var year    = document.getElementById('fes-res-map-year')?.value || '';
                var month   = document.getElementById('fes-res-map-month')?.value || '';
                var clase   = document.getElementById('fes-res-map-clase')?.value || '';
                var especie = document.getElementById('fes-res-map-especie')?.value || '';
                var data = [];
                try {
                    data = await window.MHRFaunaReportService.getHallazgosMapData(window.supabaseClient, {
                        tipo: 'Rescate', year: year, month: month, clase: clase, especie: especie
                    });
                } catch (e) { console.error('Error loading rescate map data', e); }
                _renderFaunaLegend('fes-res-map-legend');
                _renderFaunaMapMarkers(_fesResBigMap, _fesResBigLayer, data, 'fes-res-map-count', 'Rescate');
            }

            function _wireFesImpMapFilters() {
                if (_fesImpFiltersWired) return;
                ['fes-imp-map-year', 'fes-imp-map-month', 'fes-imp-map-clase', 'fes-imp-map-especie'].forEach(function (id) {
                    var el = document.getElementById(id);
                    if (el) el.addEventListener('change', _refreshFesImpMap);
                });
                _fesImpFiltersWired = true;
            }
            function _wireFesResMapFilters() {
                if (_fesResFiltersWired) return;
                ['fes-res-map-year', 'fes-res-map-month', 'fes-res-map-clase', 'fes-res-map-especie'].forEach(function (id) {
                    var el = document.getElementById(id);
                    if (el) el.addEventListener('change', _refreshFesResMap);
                });
                _fesResFiltersWired = true;
            }

            // ── tab switching (Impactos / Rescates) ──────────────────────────
            window.fesSwitchTab = function(tab) {
                var isImp = tab === 'impactos';
                document.getElementById('fes-panel-impactos').style.display = isImp ? '' : 'none';
                document.getElementById('fes-panel-rescates').style.display  = isImp ? 'none' : '';
                var tImp = document.getElementById('fes-tab-impactos');
                var tRes = document.getElementById('fes-tab-rescates');
                if (tImp) {
                    tImp.style.borderBottomColor = isImp ? '#2563eb' : 'transparent';
                    tImp.style.color = isImp ? '#2563eb' : '#64748b';
                }
                if (tRes) {
                    tRes.style.borderBottomColor = isImp ? 'transparent' : '#16a34a';
                    tRes.style.color = isImp ? '#64748b' : '#16a34a';
                }
                if (!isImp && !_fesResMap && window._fesLastResData) {
                    setTimeout(function(){ _fesResMap = fesInitMiniMap('fes-res-map', window._fesLastResData, '#16a34a'); }, 100);
                }
            };

            // ── Render aerolíneas cards ───────────────────────────────────────
            var _fesAerolineasCatalog = null; // cache

            // ── Render all impacto charts for a given dataset ────────────────
            function _fesRenderImpCharts(data) {
                var MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
                // Eventos por mes
                var cByMonth = new Array(12).fill(0);
                data.forEach(function(r){
                    var d = r.created_at ? new Date(r.created_at) : null;
                    if (d) cByMonth[d.getMonth()]++;
                });
                fesBarChart('fes-imp-chart-mes', 'fes-imp-chart-mes-labels', cByMonth, MESES, '#2563eb');
                // Especie
                var eCounts = {};
                data.forEach(function(r){
                    var items = Array.isArray(r.detalle_items) ? r.detalle_items : [];
                    items.forEach(function(it){
                        var esp = _itemField(it.fields, ['Especie', 'especie']) ||
                                  _itemField(it.fields, ['Otra Especie', 'especie_otra']) ||
                                  _itemField(it.fields, ['Tipo de Animal', 'tipo_animal']);
                        if (esp && String(esp).trim()) eCounts[esp] = (eCounts[esp] || 0) + 1;
                    });
                    if (!items.length && r.especie) eCounts[r.especie] = (eCounts[r.especie] || 0) + 1;
                });
                fesHBarChart('fes-imp-chart-especie', Object.entries(eCounts).sort(function(a,b){ return b[1]-a[1]; }), '#16a34a');
                // Heatmap
                fesHeatmap('fes-imp-heatmap', data);
                // Hora del día
                var cByHour = new Array(24).fill(0);
                data.forEach(function(r){
                    var hora = r.hora_evento;
                    if (!hora && r.created_at) {
                        var d = new Date(r.created_at);
                        hora = d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
                    }
                    if (!hora) return;
                    var h = parseInt(hora.split(':')[0], 10);
                    if (h >= 0 && h < 24) cByHour[h]++;
                });
                var horaLabels = Array.from({length:24}, function(_,i){ return i.toString().padStart(2,'0')+':00'; });
                fesBarChart('fes-imp-chart-hora', 'fes-imp-chart-hora-labels', cByHour, horaLabels, '#f59e0b');
                // Top horas críticas
                var topHoras = cByHour.map(function(v,i){ return [i,v]; }).filter(function(x){ return x[1]>0; }).sort(function(a,b){ return b[1]-a[1]; }).slice(0,5);
                var topHorasEl = document.getElementById('fes-imp-top-horas');
                if (topHorasEl) topHorasEl.innerHTML = topHoras.length ? topHoras.map(function(x){
                    return '<span style="display:inline-block;background:#fef3c7;color:#92400e;border-radius:20px;padding:4px 12px;font-size:12px;font-weight:700;border:1px solid #fde68a;">' +
                        x[0].toString().padStart(2,'0') + ':00 · ' + x[1] + '</span>';
                }).join('') : '<span style="color:#94a3b8;font-size:12px;">Sin datos de hora</span>';
                // Fases
                var fases = fesCountBy(data, 'fase_vuelo');
                var fasesEl = document.getElementById('fes-imp-fases-badges');
                if (fasesEl) {
                    var fc = { 'Aterrizaje': ['#dbeafe','#1e40af','→'], 'Despegue': ['#dcfce7','#166534','↑'] };
                    fasesEl.innerHTML = fases.length ? fases.map(function(f){
                        var c = fc[f[0]] || ['#f1f5f9','#374151','✈'];
                        return '<span style="display:inline-flex;align-items:center;gap:6px;background:' + c[0] + ';color:' + c[1] + ';border-radius:20px;padding:6px 14px;font-size:13px;font-weight:700;border:1px solid ' + c[0] + ';">' +
                            c[2] + ' ' + f[0] + ' · <b>' + f[1] + '</b></span>';
                    }).join('') : '<span style="color:#94a3b8;font-size:12px;">Sin datos de fase</span>';
                }
                // Parte avión + Pista. La notificación AFAC puede registrar
                // varias partes impactadas en un solo evento, por eso se cuentan
                // por separado en lugar de tratar la lista como un único valor.
                fesFillTable('fes-imp-parte-tbody', fesCountByMulti(data, 'parte_avion'), 'Sin datos');
                fesFillTable('fes-imp-pista-tbody', fesCountBy(data, 'pista'), 'Sin datos');
            }

            // ── Aerolínea selection (acts as filter on charts) ────────────────
            window._fesSelectedAerolinea = null;

            window._fesSelectAerolinea = function(stored, displayName, allImpData) {
                window._fesSelectedAerolinea = stored;
                var filtered = allImpData.filter(function(r){ return r.aerolinea === stored; });
                // Update filter bar
                var lbl = document.getElementById('fes-aero-filter-label');
                var clr = document.getElementById('fes-aero-filter-clear');
                if (lbl) lbl.innerHTML = 'Mostrando <strong>' + displayName + '</strong> · ' + filtered.length + ' impacto' + (filtered.length !== 1 ? 's' : '');
                if (clr) clr.style.display = 'inline-block';
                // Highlight selected card
                var container = document.getElementById('fes-aero-cards');
                if (container) container.querySelectorAll('[data-aero-stored]').forEach(function(c){
                    var sel = c.dataset.aeroStored === stored;
                    c.style.outline  = sel ? '2px solid #1d4ed8' : 'none';
                    c.style.background = sel ? '#eff6ff' : '#fff';
                });
                _fesRenderImpCharts(filtered);
            };

            window._fesClearAeroFilter = function() {
                window._fesSelectedAerolinea = null;
                var lbl = document.getElementById('fes-aero-filter-label');
                var clr = document.getElementById('fes-aero-filter-clear');
                if (lbl) lbl.textContent = 'Mostrando todas las aerolíneas';
                if (clr) clr.style.display = 'none';
                var container = document.getElementById('fes-aero-cards');
                if (container) container.querySelectorAll('[data-aero-stored]').forEach(function(c){
                    c.style.outline = 'none'; c.style.background = '#fff';
                });
                if (window._fesLastImpData) _fesRenderImpCharts(window._fesLastImpData);
            };

            async function fesRenderAerolineas(impData) {
                var container = document.getElementById('fes-aero-cards');
                if (!container) return;

                // Load catalog once
                if (!_fesAerolineasCatalog && window.MHRCatalogService && window.supabaseClient) {
                    try { _fesAerolineasCatalog = await window.MHRCatalogService.getCatalogoAerolineas(window.supabaseClient); }
                    catch(e) { _fesAerolineasCatalog = []; }
                }
                var catalog = _fesAerolineasCatalog || [];
                var byIata = {};
                var byOaci = {};
                var byNombre = {};
                catalog.forEach(function(a){
                    byIata[a.codigo_iata] = a;
                    if (a.codigo_oaci) byOaci[a.codigo_oaci] = a;
                    byNombre[String(a.nombre_aerolinea).toLowerCase().trim()] = a;
                });

                // Helper: resolve catalog entry for a stored aerolinea string
                function _resolveInfo(stored) {
                    if (!stored) return null;
                    // Try exact IATA match
                    if (byIata[stored]) return byIata[stored];
                    // Try exact OACI match
                    if (byOaci[stored]) return byOaci[stored];
                    // Try by name (case-insensitive)
                    var lower = stored.toLowerCase().trim();
                    if (byNombre[lower]) return byNombre[lower];
                    // Try partial: stored starts with IATA code "XX - Name" or OACI code "XXX - Name"
                    var iataPrefix = stored.match(/^([A-Z0-9]{1,4})\s*-/);
                    if (iataPrefix) {
                        if (byIata[iataPrefix[1]]) return byIata[iataPrefix[1]];
                        if (byOaci[iataPrefix[1]]) return byOaci[iataPrefix[1]];
                    }
                    return null;
                }

                // Build a clean iata→logo placeholder SVG
                function _fallbackSvg(label) {
                    var text = String(label).substring(0, 2).toUpperCase();
                    return 'data:image/svg+xml,' + encodeURIComponent(
                        '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60">'
                        + '<rect width="60" height="60" rx="8" fill="#1d4ed8"/>'
                        + '<text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="16" font-family="sans-serif">' + text + '</text>'
                        + '</svg>'
                    );
                }

                // Count impacts per airline
                var counts = {};
                impData.forEach(function(r){
                    var a = r.aerolinea || '';
                    if (!a.trim()) return;
                    counts[a] = (counts[a] || 0) + 1;
                });

                var sorted = Object.entries(counts).sort(function(a,b){ return b[1]-a[1]; });

                // KPI
                var totalEl = document.getElementById('fes-aero-total-imp');
                var lineasEl = document.getElementById('fes-aero-total-lineas');
                var topEl = document.getElementById('fes-aero-top-linea');
                if (totalEl) totalEl.textContent = impData.length;
                if (lineasEl) lineasEl.textContent = sorted.length;
                if (topEl) topEl.textContent = sorted.length ? sorted[0][0] : '–';

                if (!sorted.length) {
                    container.innerHTML = '<div style="padding:30px;text-align:center;color:#94a3b8;font-size:13px;grid-column:1/-1;">Sin registros de aerolínea en los impactos.</div>';
                    return;
                }

                container.innerHTML = '';
                sorted.forEach(function(entry) {
                    var stored = entry[0];   // the value stored in fauna_reports.aerolinea
                    var count = entry[1];
                    var info = _resolveInfo(stored);
                    var displayName = (info && info.nombre_aerolinea) || stored;
                    var iataLabel   = (info && info.codigo_iata) || stored.substring(0, 3).toUpperCase();
                    var logoUrl = (info && info.logo_url)
                        || (info ? 'https://www.gstatic.com/flights/airline_logos/70px/' + encodeURIComponent(info.codigo_iata) + '.png' : '');
                    var fallback = _fallbackSvg(iataLabel);
                    var card = document.createElement('div');
                    card.style.cssText = 'background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;text-align:center;cursor:pointer;transition:box-shadow .15s,transform .15s;box-shadow:0 1px 4px rgba(0,0,0,.06);';
                    card.addEventListener('mouseenter', function(){ this.style.boxShadow='0 4px 16px rgba(0,0,0,.12)'; this.style.transform='translateY(-2px)'; });
                    card.addEventListener('mouseleave', function(){ this.style.boxShadow='0 1px 4px rgba(0,0,0,.06)'; this.style.transform=''; });
                    card.innerHTML =
                        '<img src="' + (logoUrl || fallback) + '" alt="' + iataLabel + '" ' +
                            'style="width:60px;height:60px;object-fit:contain;border-radius:8px;border:1px solid #e2e8f0;background:#f8fafc;padding:4px;margin:0 auto 10px;display:block;" ' +
                            'onerror="this.src=\'' + fallback + '\'" />' +
                        '<div style="font-size:13px;font-weight:700;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + displayName + '">' + displayName + '</div>' +
                        '<div style="font-size:11px;color:#64748b;margin:2px 0;">' + iataLabel + '</div>' +
                        '<div style="margin-top:8px;display:inline-block;background:#fee2e2;color:#991b1b;border-radius:20px;padding:4px 14px;font-size:14px;font-weight:800;">' + count + '</div>' +
                        '<div style="font-size:10px;color:#94a3b8;margin-top:3px;">impacto' + (count !== 1 ? 's' : '') + '</div>';
                    card.dataset.aeroStored = stored;
                    card.addEventListener('click', function(){
                        if (window._fesSelectedAerolinea === stored) {
                            window._fesClearAeroFilter && window._fesClearAeroFilter();
                        } else {
                            window._fesSelectAerolinea && window._fesSelectAerolinea(stored, displayName, impData);
                        }
                    });
                    container.appendChild(card);
                });
            }

            function fesShowAerolineaDetalle(stored, info, records) {
                var panel = document.getElementById('fes-aero-detalle');
                if (!panel) return;
                var iataLabel = (info && info.codigo_iata) || stored;
                var displayName = (info && info.nombre_aerolinea) || stored;
                var logoUrl = (info && info.logo_url)
                    || (info && info.codigo_iata ? 'https://www.gstatic.com/flights/airline_logos/70px/' + encodeURIComponent(info.codigo_iata) + '.png' : '');
                var fallback = 'data:image/svg+xml,' + encodeURIComponent(
                    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="10" fill="#1d4ed8"/>'
                    + '<text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="18" font-family="sans-serif">' + String(iataLabel).substring(0,2).toUpperCase() + '</text></svg>'
                );
                var imgEl = document.getElementById('fes-aero-det-logo');
                if (imgEl) { imgEl.src = logoUrl || fallback; imgEl.onerror = function(){ this.src = fallback; }; imgEl.style.display = ''; }
                var nameEl = document.getElementById('fes-aero-det-nombre');
                if (nameEl) nameEl.textContent = displayName;
                var iataEl = document.getElementById('fes-aero-det-iata');
                if (iataEl) iataEl.textContent = iataLabel;
                var totalEl = document.getElementById('fes-aero-det-total');
                if (totalEl) totalEl.textContent = records.length;

                var tbody = document.getElementById('fes-aero-det-tbody');
                if (tbody) {
                    if (!records.length) {
                        tbody.innerHTML = '<tr><td colspan="8" style="padding:16px;text-align:center;color:#94a3b8;">Sin registros</td></tr>';
                    } else {
                        tbody.innerHTML = records.map(function(r){
                            var fecha = r.created_at ? new Date(r.created_at).toLocaleDateString('es-ES') : (r.fecha_reporte || '–');
                            var pdfCell = r.pdf_url ?
                                '<button class="fh-pdf-btn" data-pdf-url="' + String(r.pdf_url).replace(/"/g,'&quot;') + '" style="background:none;border:none;cursor:pointer;color:#2563eb;font-weight:600;padding:0;font-size:12px;">📄</button>' :
                                '<span style="color:#d1d5db;">–</span>';
                            return '<tr style="border-bottom:1px solid #f1f5f9;">' +
                                '<td style="padding:8px;">' + fecha + '</td>' +
                                '<td style="padding:8px;font-size:11px;color:#64748b;">' + (r.folio || '–') + '</td>' +
                                '<td style="padding:8px;">' + (r.especie || '–') + '</td>' +
                                '<td style="padding:8px;">' + (r.fase_vuelo || '–') + '</td>' +
                                '<td style="padding:8px;">' + (r.parte_avion || '–') + '</td>' +
                                '<td style="padding:8px;">' + (r.pista || '–') + '</td>' +
                                '<td style="padding:8px;">' + (r.condicion_meteo || '–') + '</td>' +
                                '<td style="padding:8px;text-align:center;">' + pdfCell + '</td>' +
                            '</tr>';
                        }).join('');
                        // PDF delegation
                        if (!tbody._pdfDelegated) {
                            tbody._pdfDelegated = true;
                            tbody.addEventListener('click', function(e){
                                var btn = e.target.closest('.fh-pdf-btn');
                                if (btn && btn.dataset.pdfUrl && typeof window.mhrOpenPdfPreview === 'function') {
                                    window.mhrOpenPdfPreview(btn.dataset.pdfUrl);
                                }
                            });
                        }
                    }
                }
                panel.style.display = '';
                panel.scrollIntoView({ behavior:'smooth', block:'nearest' });

                // Render per-airline charts
                var charts = document.getElementById('fes-aero-det-charts');
                if (charts) {
                    charts.style.display = records.length ? '' : 'none';
                    if (records.length) {
                        var MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
                        // Eventos por mes
                        var cByMonth = new Array(12).fill(0);
                        records.forEach(function(r) {
                            var d = r.created_at ? new Date(r.created_at) : null;
                            if (d) cByMonth[d.getMonth()]++;
                        });
                        fesBarChart('fes-aero-det-chart-mes', 'fes-aero-det-chart-mes-labels', cByMonth, MESES, '#2563eb');

                        // Especie
                        var eCounts = {};
                        records.forEach(function(r) {
                            var items = Array.isArray(r.detalle_items) ? r.detalle_items : [];
                            items.forEach(function(it) {
                                var esp = _itemField(it.fields, ['Especie', 'especie']) ||
                                          _itemField(it.fields, ['Otra Especie', 'especie_otra']) ||
                                          _itemField(it.fields, ['Tipo de Animal', 'tipo_animal']);
                                if (esp && String(esp).trim()) eCounts[esp] = (eCounts[esp] || 0) + 1;
                            });
                            if (!items.length && r.especie) eCounts[r.especie] = (eCounts[r.especie] || 0) + 1;
                        });
                        fesHBarChart('fes-aero-det-chart-especie', Object.entries(eCounts).sort(function(a,b){ return b[1]-a[1]; }), '#16a34a');

                        // Top horas críticas
                        var hCounts = new Array(24).fill(0);
                        records.forEach(function(r) {
                            var h = r.hora_evento;
                            if (!h && r.created_at) { var d = new Date(r.created_at); h = d.getHours().toString().padStart(2,'0') + ':00'; }
                            if (h) { var hh = parseInt(h.split(':')[0], 10); if (hh >= 0 && hh < 24) hCounts[hh]++; }
                        });
                        var topHoras = hCounts.map(function(v,i){ return [i,v]; }).filter(function(x){ return x[1]>0; }).sort(function(a,b){ return b[1]-a[1]; }).slice(0,5);
                        var horasEl = document.getElementById('fes-aero-det-horas');
                        if (horasEl) horasEl.innerHTML = topHoras.length ? topHoras.map(function(x){
                            return '<span style="display:inline-block;background:#fef3c7;color:#92400e;border-radius:20px;padding:4px 12px;font-size:12px;font-weight:700;border:1px solid #fde68a;">' +
                                x[0].toString().padStart(2,'0') + ':00 · ' + x[1] + '</span>';
                        }).join('') : '<span style="color:#94a3b8;font-size:12px;">Sin datos</span>';

                        // Fases de operación
                        var fases = fesCountBy(records, 'fase_vuelo');
                        var fasesEl = document.getElementById('fes-aero-det-fases');
                        if (fasesEl) {
                            var fc = { 'Aterrizaje': ['#dbeafe','#1e40af','\u2192'], 'Despegue': ['#dcfce7','#166534','\u2191'] };
                            fasesEl.innerHTML = fases.length ? fases.map(function(f) {
                                var c = fc[f[0]] || ['#f1f5f9','#374151','\u2708'];
                                return '<span style="display:inline-flex;align-items:center;gap:6px;background:' + c[0] + ';color:' + c[1] + ';border-radius:20px;padding:6px 14px;font-size:13px;font-weight:700;">' + c[2] + ' ' + f[0] + ' · <b>' + f[1] + '</b></span>';
                            }).join('') : '<span style="color:#94a3b8;font-size:12px;">Sin datos</span>';
                        }

                        // Parte avión + Pista
                        fesFillTable('fes-aero-det-parte-tbody', fesCountBy(records, 'parte_avion'), 'Sin datos');
                        fesFillTable('fes-aero-det-pista-tbody', fesCountBy(records, 'pista'), 'Sin datos');
                    }
                }
            }

            // ── main stats loader ─────────────────────────────────────────────
            // ── Estadística de la forma oficial AFAC-SA-FAUNA-I/ene-22 ──────
            var PARTES_AFAC = {
                A: 'Radomo', B: 'Parabrisas', C: 'Sección de Nariz', D: 'Motor No. 1',
                E: 'Motor No. 2', F: 'Motor No. 3', G: 'Motor No. 4', H: 'Hélice',
                I: 'Ala/Rotor', J: 'Fuselaje', K: 'Tren de Aterrizaje',
                L: 'Sección de Cola', M: 'Luces', N: 'Otro'
            };
            var RANGOS_AFAC = ['1', '2-10', '11-100', 'más de 100'];

            async function loadAfacStatistics() {
                var client = window.supabaseClient;
                if (!client || !window.MHRFaunaAfacService) return;

                var data;
                try {
                    data = await window.MHRFaunaAfacService.getAfacReports(client, {});
                } catch (err) {
                    console.error('Error cargando la estadística AFAC:', err);
                    return;
                }
                window._fesLastAfacData = data;

                var setText = function (id, v) {
                    var e = document.getElementById(id);
                    if (e) e.textContent = v;
                };

                var conDano = data.filter(function (r) {
                    return Array.isArray(r.partes_danadas) && r.partes_danadas.length > 0;
                }).length;
                var conEfecto = data.filter(function (r) {
                    var ef = Array.isArray(r.efecto_operacion) ? r.efecto_operacion : [];
                    return ef.some(function (v) { return v && v !== 'Ninguno'; });
                }).length;
                var advertidos = data.filter(function (r) { return r.piloto_advertido === true; }).length;

                var fases = fesCountBy(data, 'fase_operacion');

                setText('fes-afac-total', data.length);
                setText('fes-afac-con-dano', conDano);
                setText('fes-afac-efecto-op', conEfecto);
                setText('fes-afac-advertido', advertidos + ' / ' + data.length);
                setText('fes-afac-fase-top', fesTopKey(fases));

                var mapParte = function (c) { return PARTES_AFAC[c] || c; };

                fesFillTable('fes-afac-fase-tbody', fases, 'Sin notificaciones AFAC');
                fesFillTable('fes-afac-efecto-tbody', fesCountByArray(data, 'efecto_operacion'), 'Sin datos');
                fesFillTable('fes-afac-impactadas-tbody', fesCountByArray(data, 'partes_impactadas', mapParte), 'Sin partes registradas');
                fesFillTable('fes-afac-danadas-tbody', fesCountByArray(data, 'partes_danadas', mapParte), 'Sin daños registrados');
                fesFillTable('fes-afac-luz-tbody', fesCountBy(data, 'luz_solar'), 'Sin datos');
                fesFillTable('fes-afac-tamano-tbody', fesCountBy(data, 'tamano_ejemplares'), 'Sin datos');
                fesFillTable('fes-afac-cielo-tbody', fesCountBy(data, 'condicion_cielo'), 'Sin datos');
                fesFillTable('fes-afac-precip-tbody', fesCountBy(data, 'precipitacion'), 'Sin datos');

                // Avistados vs impactados, por rango de la casilla 22
                var avist = {}, impac = {};
                data.forEach(function (r) {
                    if (r.ejemplares_avistados) avist[r.ejemplares_avistados] = (avist[r.ejemplares_avistados] || 0) + 1;
                    if (r.ejemplares_impactados) impac[r.ejemplares_impactados] = (impac[r.ejemplares_impactados] || 0) + 1;
                });
                var ejemplaresRows = RANGOS_AFAC
                    .map(function (r) { return [r, avist[r] || 0, impac[r] || 0]; })
                    .filter(function (row) { return row[1] || row[2]; });
                fesFill3ColTable('fes-afac-ejemplares-tbody', ejemplaresRows, 'Sin datos de ejemplares');

                // Perfil de altura y velocidad
                var alturas = data.map(function (r) { return r.altura_agl; })
                    .filter(function (v) { return typeof v === 'number' && !isNaN(v); });
                var vels = data.map(function (r) { return r.velocidad_ias; })
                    .filter(function (v) { return typeof v === 'number' && !isNaN(v); });
                var avg = function (a) { return a.length ? Math.round(a.reduce(function (s, v) { return s + v; }, 0) / a.length) : null; };
                var perfil = document.getElementById('fes-afac-perfil');
                if (perfil) {
                    if (!alturas.length && !vels.length) {
                        perfil.innerHTML = '<span style="color:#94a3b8;">Sin datos de altura ni velocidad</span>';
                    } else {
                        var line = function (label, arr, unit) {
                            if (!arr.length) return '<div><b>' + label + ':</b> <span style="color:#94a3b8;">sin datos</span></div>';
                            return '<div><b>' + label + ':</b> promedio ' + avg(arr) + ' ' + unit +
                                ' · mín ' + Math.min.apply(null, arr) + ' · máx ' + Math.max.apply(null, arr) +
                                ' <span style="color:#94a3b8;">(' + arr.length + ' reportes)</span></div>';
                        };
                        perfil.innerHTML = line('Altura AGL', alturas, 'ft') + line('Velocidad IAS', vels, 'kt');
                    }
                }
            }
            window.loadAfacStatistics = loadAfacStatistics;

            async function loadFaunaStatistics() {
                const client = window.supabaseClient;
                if (!client) { console.error('Supabase client not ready'); return; }

                try {
                    const all = (await window.MHRFaunaReportService.getAllFaunaReports(client)) || [];

                    var impData = all.filter(function(r){ return r.tipo_reporte !== 'Rescate'; });
                    var resData = all.filter(function(r){ return r.tipo_reporte === 'Rescate'; });

                    window._fesLastImpData = impData;
                    window._fesLastResData = resData;

                    // ── IMPACTOS charts ────────────────────────────────────────
                    _fesRenderImpCharts(impData);

                    // ── RESCATES KPIs ─────────────────────────────────────────
                    var resEspecies  = {};
                    resData.forEach(function(r){
                        var k = (r.clase||'N/A') + '||' + (r.especie||'N/A');
                        resEspecies[k] = resEspecies[k] || { clase: r.clase||'N/A', especie: r.especie||'N/A', total: 0 };
                        resEspecies[k].total++;
                    });
                    var resEspArr = Object.values(resEspecies).sort(function(a,b){ return b.total-a.total; });
                    var resSitios    = fesCountBy(resData, 'sitio_reubicacion');
                    var resInst      = fesCountBy(resData, 'institucion_responsable');
                    var resClases    = fesCountBy(resData, 'clase');

                    var setText = function(id, v){ var e = document.getElementById(id); if (e) e.textContent = v; };
                    setText('fes-res-total',      resData.length);
                    setText('fes-res-especie-top', resEspArr.length ? resEspArr[0].especie : '–');
                    setText('fes-res-clase-top',   fesTopKey(resClases));
                    setText('fes-res-sitio-top',   fesTopKey(resSitios));

                    fesFill3ColTable('fes-res-especie-tbody',
                        resEspArr.slice(0,15).map(function(r){ return [r.clase, r.especie, r.total]; }),
                        'Sin rescates registrados'
                    );
                    fesFillTable('fes-res-institucion-tbody', resInst,   'Sin datos');
                    fesFillTable('fes-res-sitio-tbody',       resSitios, 'Sin datos');

                    // Barras mensuales rescates
                    var resCountsByMonth = new Array(12).fill(0);
                    resData.forEach(function(r){
                        var d = r.created_at ? new Date(r.created_at) : null;
                        if (d) resCountsByMonth[d.getMonth()]++;
                    });
                    fesBarChart('fes-res-mensual-bars', 'fes-res-mensual-labels', resCountsByMonth, MESES, '#16a34a');

                    // Always render aerolíneas (default sub-tab)
                    fesRenderAerolineas(impData);

                } catch (err) {
                    console.error('Error in loadFaunaStatistics:', err);
                }
            }

            // Función para cargar reportes de fauna desde Supabase
            async function loadFaunaReports(filters) {
                filters = filters || {};
                const client = window.supabaseClient;
                if (!client) {
                    console.error('Supabase client not ready');
                    return;
                }

                const reportsList = document.getElementById('fauna-reports-list');
                const reportsCount = document.getElementById('fauna-reports-count');

                // PDF delegation (safe to re-assign; only one handler needed)
                if (reportsList && !reportsList._pdfDelegated) {
                    reportsList._pdfDelegated = true;
                    reportsList.addEventListener('click', function (e) {
                        var btn = e.target.closest('.fh-pdf-btn');
                        if (btn && btn.dataset.pdfUrl && typeof window.mhrOpenPdfPreview === 'function') {
                            window.mhrOpenPdfPreview(btn.dataset.pdfUrl);
                        }
                    });
                }

                if (reportsList) {
                    reportsList.innerHTML = '<tr><td colspan="7" style="padding:20px;text-align:center;color:#6b7280;">Cargando reportes...</td></tr>';
                }

                try {
                    const faunaData = await window.MHRFaunaReportService.getFaunaReportsByFilters(client, {
                        fechaDesde: filters.fechaDesde,
                        fechaHasta: filters.fechaHasta,
                        clase: filters.clase && filters.clase !== '' ? filters.clase : '',
                        especie: filters.especie && filters.especie !== '' ? filters.especie : ''
                    });

                    // Combinar reportes según filtro de tipo
                    let allReports = (faunaData || []).filter(function(report) {
                        if (filters.tipo === 'impacto') return report.tipo_reporte !== 'Rescate';
                        if (filters.tipo === 'rescate') return report.tipo_reporte === 'Rescate';
                        return true;
                    });


                    // Renderizar tabla
                    if (reportsList) {
                        if (allReports.length === 0) {
                            reportsList.innerHTML = '<tr><td colspan="7" style="padding:20px;text-align:center;color:#6b7280;">No hay reportes que coincidan con los filtros</td></tr>';
                        } else {
                            reportsList.innerHTML = '';
                            var faunaRows = [];
                            allReports.forEach(function(report) {
                                // Usar created_at (timestamp completo) para evitar desfase UTC en fechas date-only
                                let fechaReporte = '-';
                                if (report.created_at) {
                                    const d = new Date(report.created_at);
                                    fechaReporte = d.toLocaleDateString('es-ES');
                                } else if (report.fecha_reporte) {
                                    // Parsear manualmente para evitar que 'YYYY-MM-DD' se interprete como UTC midnight
                                    const p = report.fecha_reporte.split('-');
                                    if (p.length === 3) fechaReporte = p[2] + '/' + p[1] + '/' + p[0];
                                    else fechaReporte = report.fecha_reporte;
                                }

                                // Extraer hora: primero intentar del folio, luego de created_at
                                let horaExtraida = null;
                                
                                // Intentar extraer hora del folio (formato: YYYYMMDD-HHMMSS)
                                if (report.folio) {
                                    const folioParts = report.folio.split('-');
                                    if (folioParts.length === 2 && folioParts[1] && folioParts[1].length === 6) {
                                        const hh = folioParts[1].substring(0, 2);
                                        const mm = folioParts[1].substring(2, 4);
                                        const ss = folioParts[1].substring(4, 6);
                                        horaExtraida = hh + ':' + mm + ':' + ss;
                                    }
                                }
                                
                                // Si no hay hora del folio, intentar del created_at
                                if (!horaExtraida && report.created_at) {
                                    try {
                                        const fecha = new Date(report.created_at);
                                        const hh = fecha.getHours().toString().padStart(2, '0');
                                        const mm = fecha.getMinutes().toString().padStart(2, '0');
                                        const ss = fecha.getSeconds().toString().padStart(2, '0');
                                        horaExtraida = hh + ':' + mm + ':' + ss;
                                    } catch (e) {
                                        horaExtraida = null;
                                    }
                                }
                                
                                if (horaExtraida) {
                                    fechaReporte = fechaReporte + ' ' + horaExtraida;
                                }
                                
                                let especie = report.especie;
                                if (!especie && report.detalle_items) {
                                    try {
                                        var _items = typeof report.detalle_items === 'string' ? JSON.parse(report.detalle_items) : report.detalle_items;
                                        for (var _i = 0; _i < (_items || []).length; _i++) {
                                            var _eField = (_items[_i].fields || []).find(function(f){ return f.key === 'Especie'; });
                                            if (_eField && _eField.value) { especie = _eField.value; break; }
                                        }
                                    } catch(e) {}
                                }
                                especie = especie || '-';
                                const ubicacion = report.ubicacion_texto || report.zona || '-';
                                const responsable = report.responsable || '-';
                                const estado = report.estado || 'pendiente';
                                
                                // Usar tipo_reporte del campo de base de datos directamente
                                let tipoReporte = report.tipo_reporte || report.tipoReporte || '-';
                                
                                // Fallback por datos disponibles si no hay tipo_reporte
                                if (tipoReporte === '-' || !tipoReporte) {
                                    if (report.evento) {
                                        tipoReporte = report.evento || 'Impacto';
                                    } else if (report.clase || report.sitio_reubicacion) {
                                        tipoReporte = 'Rescate';
                                    }
                                }
                                

                                const tr = document.createElement('tr');
                                tr.style.borderBottom = '1px solid #e5e7eb';
                                
                                // Crear link de PDF si existe
                                let pdfLink = '<a href="#" style="color:#6b7280;text-decoration:none;font-size:12px;">-</a>';
                                if (report.pdf_url && report.pdf_url.trim() !== '') {
                                    pdfLink = '<button class="fh-pdf-btn" data-pdf-url="' + report.pdf_url.replace(/"/g, '&quot;') + '" style="background:none;border:none;cursor:pointer;color:#3b82f6;font-size:12px;font-weight:600;padding:0;">📄 Ver PDF</button>';
                                } else {
                                    console.warn('⚠️ Sin PDF para folio', report.folio, '- pdf_url:', report.pdf_url);
                                }
                                
                                tr.innerHTML = '<td style="padding:12px;">' + fechaReporte + '</td>' +
                                               '<td style="padding:12px;"><span style="display:inline-block;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:600;background:' + 
                                               (tipoReporte === 'Impacto' || tipoReporte === 'Posible Impacto' ? '#fee2e2;color:#991b1b' : '#dcfce7;color:#166534') + ';">' + tipoReporte + '</span></td>' +
                                               '<td style="padding:12px;">' + especie + '</td>' +
                                               '<td style="padding:12px;">' + ubicacion + '</td>' +
                                               '<td style="padding:12px;">' + responsable + '</td>' +
                                               '<td style="padding:12px;"><span style="display:inline-block;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:600;background:' + 
                                               (estado === 'pendiente' ? '#fef3c7;color:#92400e' : '#dbeafe;color:#1e40af') + ';">' + estado + '</span></td>' +
                                               '<td style="padding:12px;text-align:center;">' + pdfLink + '</td>';
                                faunaRows.push(tr);
                            });
                            if (window.MHRUtils && typeof window.MHRUtils.renderRows === 'function') {
                                window.MHRUtils.renderRows(reportsList, faunaRows);
                            } else {
                                var faunaRowsFragment = document.createDocumentFragment();
                                faunaRows.forEach(function (row) { faunaRowsFragment.appendChild(row); });
                                reportsList.appendChild(faunaRowsFragment);
                            }
                        }
                    }

                    if (reportsCount) {
                        reportsCount.textContent = 'Total de reportes: ' + allReports.length;
                    }

                } catch (err) {
                    console.error('Error in loadFaunaReports:', err);
                    if (reportsList) {
                        reportsList.innerHTML = '<tr><td colspan="7" style="padding:20px;text-align:center;color:#ef4444;">Error al cargar reportes</td></tr>';
                    }
                }
            }

            // Configurar filtros de fauna
            var currentFaunaFilters = {};
            var debouncedLoadFaunaReports = (window.MHRUtils && typeof window.MHRUtils.debounce === 'function')
                ? window.MHRUtils.debounce(function (filters) { loadFaunaReports(filters); }, 250)
                : function (filters) { loadFaunaReports(filters); };

            function readFaunaFilters() {
                return {
                    fechaDesde: document.getElementById('filter-fauna-fecha-desde')?.value || '',
                    fechaHasta: document.getElementById('filter-fauna-fecha-hasta')?.value || '',
                    clase: document.getElementById('filter-fauna-clase')?.value || '',
                    especie: document.getElementById('filter-fauna-especie')?.value || '',
                    tipo: document.getElementById('filter-fauna-tipo')?.value || ''
                };
            }

            // Event listeners para filtros
            document.getElementById('fauna-filter-apply-btn')?.addEventListener('click', function() {
                currentFaunaFilters = readFaunaFilters();
                debouncedLoadFaunaReports(currentFaunaFilters);
            });

            document.getElementById('fauna-filter-clear-btn')?.addEventListener('click', function() {
                document.getElementById('filter-fauna-fecha-desde').value = '';
                document.getElementById('filter-fauna-fecha-hasta').value = '';
                document.getElementById('filter-fauna-clase').value = '';
                document.getElementById('filter-fauna-especie').value = '';
                document.getElementById('filter-fauna-tipo').value = '';
                currentFaunaFilters = {};
                debouncedLoadFaunaReports({});
            });

            document.getElementById('fauna-refresh-btn')?.addEventListener('click', function() {
                debouncedLoadFaunaReports(currentFaunaFilters);
            });

            // ─── Mapa de hallazgos en Estadística Fauna ─────────────────────────
            var faunaMapModal = document.getElementById('fauna-hallazgos-map-modal');
            var openFaunaMapBtn = document.getElementById('open-fauna-hallazgos-map-btn');
            var closeFaunaMapBtn = document.getElementById('close-fauna-hallazgos-map-btn');
            var faunaHistoricoResumen = document.getElementById('fauna-hallazgos-historico-resumen');
            var faunaExportPdfBtn = document.getElementById('export-fauna-hallazgos-pdf-btn');
            var faunaYearSelect = document.getElementById('fauna-hallazgos-year');
            var faunaMonthSelect = document.getElementById('fauna-hallazgos-month');
            var faunaClaseSelect = document.getElementById('fauna-hallazgos-clase');
            var faunaEspecieSelect = document.getElementById('fauna-hallazgos-especie');
            var faunaHallazgosMap = null;
            var faunaHallazgosMarkersLayer = null;
            var faunaHallazgosYears = [];
            var faunaMapBusy = false;
            var faunaMonthNames = ['Todos los meses', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

            function renderMonthOptions() {
                if (!faunaMonthSelect) return;
                var prev = faunaMonthSelect.value || '';
                faunaMonthSelect.innerHTML = '';
                for (var i = 0; i <= 12; i++) {
                    var op = document.createElement('option');
                    op.value = i === 0 ? '' : String(i).padStart(2, '0');
                    op.textContent = faunaMonthNames[i];
                    faunaMonthSelect.appendChild(op);
                }
                faunaMonthSelect.value = prev;
            }

            async function loadFaunaHallazgosYears() {
                if (!window.supabaseClient || !faunaYearSelect) return;
                var years = await window.MHRFaunaReportService.getHallazgosYears(window.supabaseClient);
                faunaHallazgosYears = years;
                faunaYearSelect.innerHTML = '';
                var allOption = document.createElement('option');
                allOption.value = '';
                allOption.textContent = 'Todos los años';
                faunaYearSelect.appendChild(allOption);
                years.forEach(function (y) {
                    var op = document.createElement('option');
                    op.value = y;
                    op.textContent = y;
                    faunaYearSelect.appendChild(op);
                });
            }

            async function loadFaunaHallazgosClaseEspecieCombos() {
                var svc = window.MHRFaunaCatalogService;
                var client = window.supabaseClient;
                if (!svc || !client) return;
                await svc.cargarCatalogoSelect(client, 'catalogo_clase', faunaClaseSelect, 'Todas las clases');
                await svc.cargarEspeciesPorClase(client, faunaClaseSelect, faunaEspecieSelect, 'Todas las especies');
            }

            function formatFaunaHistorico(resumenMap) {
                var entries = Object.entries(resumenMap || {});
                if (!entries.length) return 'Sin datos de rescates con coordenadas para el período seleccionado.';
                return entries
                    .sort(function (a, b) { return b[1] - a[1]; })
                    .map(function (entry) { return '• ' + entry[0] + ': ' + entry[1]; })
                    .join('<br>');
            }

            function getFaunaClaseMarkerColor(claseNombre) {
                var claseNorm = normalizarTextoCatalogo(claseNombre);
                if (claseNorm === 'reptil') return '#16a34a'; // verde
                if (claseNorm === 'mamifero') return '#8b5a2b'; // cafe
                if (claseNorm === 'ave') return '#2563eb'; // azul
                return '#64748b'; // default gris-azulado
            }

            async function loadFaunaHallazgosMapData() {
                if (!window.supabaseClient || !faunaHistoricoResumen || !faunaHallazgosMap) return;
                var selectedYear = faunaYearSelect ? faunaYearSelect.value : '';
                var selectedMonth = faunaMonthSelect ? faunaMonthSelect.value : '';
                var selectedClase = faunaClaseSelect ? faunaClaseSelect.value : '';
                var selectedEspecie = faunaEspecieSelect ? faunaEspecieSelect.value : '';

                var data = await window.MHRFaunaReportService.getHallazgosMapData(window.supabaseClient, {
                    year: selectedYear,
                    month: selectedMonth,
                    clase: selectedClase,
                    especie: selectedEspecie
                });

                if (!faunaHallazgosMarkersLayer) faunaHallazgosMarkersLayer = L.layerGroup().addTo(faunaHallazgosMap);
                faunaHallazgosMarkersLayer.clearLayers();
                var bounds = [];
                var resumen = {};
                (data || []).forEach(function (row) {
                    var lat = Number(row.ubicacion_lat);
                    var lng = Number(row.ubicacion_lng);
                    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
                    bounds.push([lat, lng]);
                    var clase = row.clase || 'Sin clase';
                    var especie = row.especie || 'Sin especie';
                    var tipo = row.tipo_reporte || '-';
                    var key = clase + ' / ' + especie;
                    resumen[key] = (resumen[key] || 0) + 1;
                    var markerColor = (tipo === 'Rescate') ? '#16a34a' : (tipo === 'Posible Impacto' ? '#f59e0b' : getFaunaClaseMarkerColor(clase));
                    L.circleMarker([lat, lng], {
                        radius: 8,
                        color: '#ffffff',
                        weight: 2,
                        fillColor: markerColor,
                        fillOpacity: 0.95
                    }).bindPopup(
                        '<strong>Tipo:</strong> ' + tipo + '<br>' +
                        '<strong>Folio:</strong> ' + (row.folio || '-') + '<br>' +
                        '<strong>Fecha:</strong> ' + (row.fecha_reporte || '-') + '<br>' +
                        '<strong>Clase:</strong> ' + clase + '<br>' +
                        '<strong>Especie:</strong> ' + especie + '<br>' +
                        '<strong>Ubicación:</strong> ' + (row.ubicacion_texto || 'N/D')
                    ).bindTooltip(
                        '<strong>' + tipo + '</strong><br><strong>Especie:</strong> ' + especie + '<br><strong>Fecha:</strong> ' + (row.fecha_reporte || '-'),
                        { direction: 'top', offset: [0, -8], opacity: 0.95 }
                    ).addTo(faunaHallazgosMarkersLayer);
                });
                if (bounds.length) {
                    faunaHallazgosMap.fitBounds(bounds, { padding: [24, 24] });
                } else {
                    faunaHallazgosMap.setView([19.7470, -99.0125], 15);
                }
            }

            async function ensureFaunaSkeletonMap() {
                if (faunaHallazgosMap) return;
                faunaHallazgosMap = L.map('fauna-hallazgos-map', {
                    center: [19.7470, -99.0125],
                    zoom: 15,
                    scrollWheelZoom: true
                });
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap contributors',
                    maxZoom: 20
                }).addTo(faunaHallazgosMap);
                faunaHallazgosMap.setView([19.7470, -99.0125], 15);
            }

            openFaunaMapBtn?.addEventListener('click', async function () {
                if (!faunaMapModal) return;
                if (faunaMapBusy) return;
                faunaMapBusy = true;
                faunaMapModal.style.display = 'block';
                setTimeout(async function () {
                    try {
                        await ensureFaunaSkeletonMap();
                        renderMonthOptions();
                        // Reset clase/especie filters so all records show by default
                        if (faunaClaseSelect) faunaClaseSelect.value = '';
                        if (faunaEspecieSelect) faunaEspecieSelect.value = '';
                        await loadFaunaHallazgosClaseEspecieCombos();
                        await loadFaunaHallazgosYears();
                        if (faunaYearSelect && faunaHallazgosYears.length) faunaYearSelect.value = faunaHallazgosYears[0];
                        await loadFaunaHallazgosMapData();
                        if (faunaHallazgosMap) faunaHallazgosMap.invalidateSize();
                    } catch (mapErr) {
                        console.error('Error cargando mapa de hallazgos fauna:', mapErr);
                        if (faunaHistoricoResumen) faunaHistoricoResumen.innerHTML = 'No se pudo cargar el histórico de ubicaciones.';
                    } finally {
                        faunaMapBusy = false;
                    }
                }, 0);
            });

            faunaYearSelect?.addEventListener('change', function () { loadFaunaHallazgosMapData(); });
            faunaMonthSelect?.addEventListener('change', function () { loadFaunaHallazgosMapData(); });
            faunaClaseSelect?.addEventListener('change', async function () {
                var svc = window.MHRFaunaCatalogService;
                var client = window.supabaseClient;
                if (svc && client) await svc.cargarEspeciesPorClase(client, faunaClaseSelect, faunaEspecieSelect, 'Todas las especies');
                loadFaunaHallazgosMapData();
            });
            faunaEspecieSelect?.addEventListener('change', function () { loadFaunaHallazgosMapData(); });

            closeFaunaMapBtn?.addEventListener('click', function () {
                if (faunaMapModal) faunaMapModal.style.display = 'none';
            });

            faunaMapModal?.addEventListener('click', function (e) {
                if (e.target === faunaMapModal) faunaMapModal.style.display = 'none';
            });

            faunaExportPdfBtn?.addEventListener('click', function () {
                if (typeof html2pdf === 'undefined') {
                    alert('html2pdf no disponible');
                    return;
                }
                var area = document.getElementById('fauna-map-export-area');
                if (!area) return;
                var opt = {
                    margin: 8,
                    filename: 'mapa_hallazgos_fauna.pdf',
                    image: { type: 'jpeg', quality: 0.95 },
                    html2canvas: { scale: 2, useCORS: true },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
                };
                html2pdf().set(opt).from(area).save();
            });

            // Event listener para el botón de actualizar estadísticas de fauna
            document.getElementById('refresh-estadisticas-fauna-btn')?.addEventListener('click', loadFaunaStatistics);
            document.getElementById('refresh-estadisticas-afac-btn')?.addEventListener('click', loadAfacStatistics);

            // Exponer para uso externo (fauna-submit-page, supabase-orchestrator)
            window.loadFaunaReports = loadFaunaReports;
            window.loadFaunaStatistics = loadFaunaStatistics;

            // ═══════════════════════════════════════════════════════
            // VISTA DE DATOS — tabla completa fauna_reports con
            // filtros por columna, búsqueda global y export a Excel
            // ═══════════════════════════════════════════════════════
            (function () {
                // Columnas a mostrar (en orden) con etiqueta y clave en el registro
                var FHD_COLS = [
                    { key: 'folio',                  label: 'Folio' },
                    { key: 'created_at',              label: 'Fecha / Hora' },
                    { key: 'tipo_reporte',            label: 'Tipo' },
                    { key: 'evento',                  label: 'Evento' },
                    { key: 'clase',                   label: 'Clase' },
                    { key: 'especie',                 label: 'Especie' },
                    { key: 'fase_vuelo',              label: 'Fase Vuelo' },
                    { key: 'pista',                   label: 'Pista' },
                    { key: 'zona',                    label: 'Zona' },
                    { key: 'parte_avion',             label: 'Parte Avión' },
                    { key: 'aerolinea',               label: 'Aerolínea' },
                    { key: 'ubicacion_texto',         label: 'Ubicación Texto' },
                    { key: 'sitio_reubicacion',       label: 'Sitio Reubicación' },
                    { key: 'institucion_responsable', label: 'Institución' },
                    { key: 'responsable',             label: 'Responsable' },
                    { key: 'cargo',                   label: 'Cargo' },
                    { key: 'observaciones',           label: 'Observaciones' },
                    { key: 'estado',                  label: 'Estado' },
                    { key: 'pdf_url',                 label: 'PDF' }
                ];

                var _allRows  = [];   // todos los registros crudos
                var _filtered = [];   // después de filtros columna + búsqueda
                var _colFilters = {}; // { key: Set de valores seleccionados }

                // ── helpers ──────────────────────────────────────────
                function _esc(s) {
                    return String(s == null ? '' : s)
                        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
                        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
                }

                function _fmt(key, val) {
                    if (val == null || val === '') return '<span style="color:#d1d5db">—</span>';
                    if (key === 'created_at') {
                        try {
                            var d = new Date(val);
                            var pad = function(n){ return String(n).padStart(2,'0'); };
                            return pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear()+
                                   ' '+pad(d.getHours())+':'+pad(d.getMinutes());
                        } catch(e) { return _esc(val); }
                    }
                    if (key === 'pdf_url') {
                        return '<button class="fh-pdf-btn" data-pdf-url="' + _esc(val) + '" style="background:none;border:none;cursor:pointer;color:#2563eb;font-weight:600;font-size:inherit;padding:0;">📄 PDF</button>';
                    }
                    if (key === 'tipo_reporte') {
                        var isRescate = String(val).toLowerCase().includes('rescate');
                        return '<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;background:'+(isRescate?'#dcfce7;color:#166534':'#fee2e2;color:#991b1b')+';">'+_esc(val)+'</span>';
                    }
                    if (key === 'estado') {
                        var isPend = String(val).toLowerCase().includes('pend');
                        return '<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;background:'+(isPend?'#fef9c3;color:#854d0e':'#dbeafe;color:#1e40af')+';">'+_esc(val)+'</span>';
                    }
                    return '<span title="'+_esc(val)+'" style="display:inline-block;max-width:220px;overflow:hidden;text-overflow:ellipsis;vertical-align:middle;">'+_esc(val)+'</span>';
                }

                // ── render ────────────────────────────────────────────
                function _renderTable() {
                    var search = (document.getElementById('fhd-search') || {}).value || '';
                    search = search.trim().toLowerCase();

                    // Aplicar filtros de columna
                    _filtered = _allRows.filter(function(row) {
                        return FHD_COLS.every(function(col) {
                            var set = _colFilters[col.key];
                            if (!set || set.size === 0) return true;
                            var v = String(row[col.key] == null ? '' : row[col.key]);
                            return set.has(v);
                        });
                    });

                    // Aplicar búsqueda global
                    if (search) {
                        _filtered = _filtered.filter(function(row) {
                            return FHD_COLS.some(function(col) {
                                return String(row[col.key] == null ? '': row[col.key]).toLowerCase().includes(search);
                            });
                        });
                    }

                    // Renderizar tbody
                    var tbody = document.getElementById('fhd-tbody');
                    if (!tbody) return;

                    // PDF delegation
                    if (!tbody._pdfDelegated) {
                        tbody._pdfDelegated = true;
                        tbody.addEventListener('click', function (e) {
                            var btn = e.target.closest('.fh-pdf-btn');
                            if (btn && btn.dataset.pdfUrl && typeof window.mhrOpenPdfPreview === 'function') {
                                window.mhrOpenPdfPreview(btn.dataset.pdfUrl);
                            }
                        });
                    }

                    if (_filtered.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="'+FHD_COLS.length+'" style="padding:30px;text-align:center;color:#6b7280;">Sin resultados</td></tr>';
                    } else {
                        var frag = document.createDocumentFragment();
                        _filtered.forEach(function(row, ri) {
                            var tr = document.createElement('tr');
                            tr.style.cssText = 'border-bottom:1px solid #e5e7eb;background:'+(ri%2===0?'#fff':'#f9fafb')+';';
                            tr.addEventListener('mouseenter', function(){ this.style.background='#eff6ff'; });
                            tr.addEventListener('mouseleave', function(){ this.style.background=(ri%2===0?'#fff':'#f9fafb'); });
                            var cells = '';
                            FHD_COLS.forEach(function(col) {
                                cells += '<td style="padding:8px 12px;vertical-align:middle;border-right:1px solid #f3f4f6;">'+_fmt(col.key, row[col.key])+'</td>';
                            });
                            tr.innerHTML = cells;
                            frag.appendChild(tr);
                        });
                        tbody.innerHTML = '';
                        tbody.appendChild(frag);
                    }

                    var countEl = document.getElementById('fhd-count');
                    if (countEl) countEl.textContent = _filtered.length + ' / ' + _allRows.length + ' registros';
                }

                // ── build headers ─────────────────────────────────────
                function _buildHeader() {
                    var thead = document.getElementById('fhd-thead');
                    if (!thead) return;
                    var html = '<tr>';
                    FHD_COLS.forEach(function(col) {
                        html += '<th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:700;letter-spacing:.3px;border-right:1px solid #2d5a8e;white-space:nowrap;user-select:none;">'+col.label+'</th>';
                    });
                    html += '</tr>';
                    thead.innerHTML = html;
                }

                // ── build column filter dropdowns ─────────────────────
                function _buildColFilters() {
                    var container = document.getElementById('fhd-col-filters');
                    if (!container) return;
                    container.innerHTML = '';

                    var FILTERABLE = ['tipo_reporte','evento','clase','especie','fase_vuelo','pista','zona','estado','responsable'];

                    FILTERABLE.forEach(function(key) {
                        var col = FHD_COLS.find(function(c){ return c.key === key; });
                        if (!col) return;

                        // Unique values
                        var vals = [];
                        var seen = {};
                        _allRows.forEach(function(r) {
                            var v = String(r[key] == null ? '' : r[key]);
                            if (!seen[v]) { seen[v] = true; vals.push(v); }
                        });
                        if (vals.length <= 1) return; // no vale la pena filtrar

                        vals.sort(function(a,b){ return a.localeCompare(b,'es'); });

                        var sel = document.createElement('select');
                        sel.style.cssText = 'padding:5px 10px;border:1px solid #d1d5db;border-radius:7px;font-size:12px;background:#fff;cursor:pointer;min-width:120px;max-width:170px;';
                        sel.title = 'Filtrar por '+col.label;

                        var defOpt = document.createElement('option');
                        defOpt.value = '';
                        defOpt.textContent = col.label+': todos';
                        sel.appendChild(defOpt);

                        vals.forEach(function(v) {
                            var o = document.createElement('option');
                            o.value = v;
                            o.textContent = v === '' ? '(vacío)' : v;
                            sel.appendChild(o);
                        });

                        sel.addEventListener('change', function() {
                            if (this.value === '') {
                                delete _colFilters[key];
                            } else {
                                _colFilters[key] = new Set([this.value]);
                            }
                            _renderTable();
                        });

                        container.appendChild(sel);
                    });

                    // Botón limpiar filtros columna
                    if (container.children.length > 0) {
                        var clearBtn = document.createElement('button');
                        clearBtn.textContent = '✕ Limpiar filtros';
                        clearBtn.style.cssText = 'padding:5px 12px;border:1px solid #d1d5db;border-radius:7px;font-size:12px;background:#fff;cursor:pointer;color:#6b7280;white-space:nowrap;';
                        clearBtn.onclick = function() {
                            _colFilters = {};
                            container.querySelectorAll('select').forEach(function(s){ s.value=''; });
                            _renderTable();
                        };
                        container.appendChild(clearBtn);
                    }
                }

                // ── load data ─────────────────────────────────────────
                window.loadFhData = async function() {
                    var tbody = document.getElementById('fhd-tbody');
                    if (tbody) tbody.innerHTML = '<tr><td colspan="'+FHD_COLS.length+'" style="padding:30px;text-align:center;color:#6b7280;"><span style="animation:spin 1s linear infinite;display:inline-block;font-size:20px;">⏳</span> Cargando…</td></tr>';
                    var countEl = document.getElementById('fhd-count');
                    if (countEl) countEl.textContent = '';

                    var client = window.supabaseClient;
                    if (!client) return;

                    try {
                        var keys = FHD_COLS.map(function(c){ return c.key; }).join(',');
                        var res = await client.from('fauna_reports').select(keys).order('created_at', { ascending: false });
                        if (res.error) throw res.error;
                        _allRows = res.data || [];
                        _colFilters = {};
                        _buildHeader();
                        _buildColFilters();
                        _renderTable();
                    } catch (e) {
                        if (tbody) tbody.innerHTML = '<tr><td colspan="'+FHD_COLS.length+'" style="padding:30px;text-align:center;color:#ef4444;">Error: '+_esc(e.message)+'</td></tr>';
                    }
                };

                // ── search handler ────────────────────────────────────
                window.fhdApplySearch = function() { _renderTable(); };

                // ── tab switch ────────────────────────────────────────
                window.fhSwitchTab = function(tab) {
                    var panelH = document.getElementById('fh-panel-historial');
                    var panelD = document.getElementById('fh-panel-datos');
                    var btnH   = document.getElementById('fh-tab-historial');
                    var btnD   = document.getElementById('fh-tab-datos');

                    var activeStyle   = 'padding:10px 22px;font-size:13px;font-weight:600;background:none;border:none;border-bottom:3px solid #2563eb;color:#2563eb;cursor:pointer;margin-bottom:-2px;';
                    var inactiveStyle = 'padding:10px 22px;font-size:13px;font-weight:600;background:none;border:none;border-bottom:3px solid transparent;color:#6b7280;cursor:pointer;margin-bottom:-2px;';

                    if (tab === 'historial') {
                        if (panelH) panelH.style.display = '';
                        if (panelD) panelD.style.display = 'none';
                        if (btnH) btnH.style.cssText = activeStyle;
                        if (btnD) btnD.style.cssText = inactiveStyle;
                    } else {
                        if (panelH) panelH.style.display = 'none';
                        if (panelD) panelD.style.display = '';
                        if (btnH) btnH.style.cssText = inactiveStyle;
                        if (btnD) btnD.style.cssText = activeStyle;
                        // Cargar datos solo si la tabla está vacía
                        if (_allRows.length === 0) window.loadFhData();
                    }
                };

                // ── Excel export ──────────────────────────────────────
                window.fhdExportExcel = function() {
                    var rows = _filtered.length > 0 ? _filtered : _allRows;
                    if (rows.length === 0) { alert('No hay datos para exportar.'); return; }

                    // Construir CSV con BOM UTF-8 para que Excel abra bien acentos
                    var BOM = '\uFEFF';
                    var headers = FHD_COLS.map(function(c){ return '"'+c.label.replace(/"/g,'""')+'"'; }).join(',');
                    var lines = [headers];
                    rows.forEach(function(row) {
                        var cells = FHD_COLS.map(function(col) {
                            var v = row[col.key];
                            if (v == null) v = '';
                            if (col.key === 'created_at' && v) {
                                try {
                                    var d = new Date(v);
                                    var p = function(n){ return String(n).padStart(2,'0'); };
                                    v = p(d.getDate())+'/'+p(d.getMonth()+1)+'/'+d.getFullYear()+' '+p(d.getHours())+':'+p(d.getMinutes());
                                } catch(e){}
                            }
                            return '"'+String(v).replace(/"/g,'""')+'"';
                        });
                        lines.push(cells.join(','));
                    });

                    var csv = BOM + lines.join('\r\n');
                    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    var url  = URL.createObjectURL(blob);
                    var a    = document.createElement('a');
                    var now  = new Date();
                    var pad  = function(n){ return String(n).padStart(2,'0'); };
                    a.href     = url;
                    a.download = 'fauna_reports_'+now.getFullYear()+pad(now.getMonth()+1)+pad(now.getDate())+'.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                };

            })(); // end Vista de Datos IIFE
  }
  return { init: init };
})();
