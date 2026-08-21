(function() {
            // Variables globales para las firmas
            window.firmaPads = {
                area: null,
                aifa: null,
                afac: null,
                fauna_aifa: null,
                fauna_afac: null
            };
            window.firmaData = {
                area: null,
                aifa: null,
                afac: null,
                fauna_aifa: null,
                fauna_afac: null
            };
            window.firmaGuardada = {
                area: false,
                aifa: false,
                afac: false,
                fauna_aifa: false,
                fauna_afac: false
            };

            var FIRMA_IDS_REVISION = ['area', 'aifa', 'afac'];
            var FIRMA_IDS_FAUNA = ['fauna_aifa', 'fauna_afac'];
            var resetHandlersBound = false;

            function initFirmaPad(padId) {
                var canvas = document.getElementById('firma-' + padId);
                if (!canvas) return;
                window.firmaPads[padId] = canvas;
                if (canvas.dataset && canvas.dataset.mhrFirmaInicializada === 'true') return;
                if (canvas.dataset) canvas.dataset.mhrFirmaInicializada = 'true';

                var ctx = canvas.getContext('2d');
                var drawing = false;
                var lastX = 0, lastY = 0;

                // Fondo blanco
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                canvas.addEventListener('mousedown', function(e) {
                    drawing = true;
                    var rect = canvas.getBoundingClientRect();
                    lastX = (e.clientX - rect.left) * (canvas.width / rect.width);
                    lastY = (e.clientY - rect.top) * (canvas.height / rect.height);
                });

                canvas.addEventListener('mousemove', function(e) {
                    if (!drawing) return;
                    var rect = canvas.getBoundingClientRect();
                    var x = (e.clientX - rect.left) * (canvas.width / rect.width);
                    var y = (e.clientY - rect.top) * (canvas.height / rect.height);

                    ctx.strokeStyle = '#1d4ed8';
                    ctx.lineWidth = 2;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.beginPath();
                    ctx.moveTo(lastX, lastY);
                    ctx.lineTo(x, y);
                    ctx.stroke();

                    lastX = x;
                    lastY = y;
                });

                canvas.addEventListener('mouseup', function() {
                    drawing = false;
                });

                canvas.addEventListener('mouseleave', function() {
                    drawing = false;
                });

                // Soporte touch para móviles
                canvas.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    drawing = true;
                    var rect = canvas.getBoundingClientRect();
                    var touch = e.touches[0];
                    lastX = (touch.clientX - rect.left) * (canvas.width / rect.width);
                    lastY = (touch.clientY - rect.top) * (canvas.height / rect.height);
                });

                canvas.addEventListener('touchmove', function(e) {
                    e.preventDefault();
                    if (!drawing) return;
                    var rect = canvas.getBoundingClientRect();
                    var touch = e.touches[0];
                    var x = (touch.clientX - rect.left) * (canvas.width / rect.width);
                    var y = (touch.clientY - rect.top) * (canvas.height / rect.height);

                    ctx.strokeStyle = '#1d4ed8';
                    ctx.lineWidth = 2;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.beginPath();
                    ctx.moveTo(lastX, lastY);
                    ctx.lineTo(x, y);
                    ctx.stroke();

                    lastX = x;
                    lastY = y;
                });

                canvas.addEventListener('touchend', function() {
                    drawing = false;
                });
            }

            // Función global para limpiar firma
            window.limpiarFirma = function(padId) {
                var canvas = window.firmaPads[padId];
                if (canvas) {
                    var ctx = canvas.getContext('2d');
                    ctx.save();
                    if (typeof ctx.setTransform === 'function') ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.restore();
                }
                window.firmaData[padId] = null;
                window.firmaGuardada[padId] = false;
                
                // Ocultar indicador de guardado
                var statusEl = document.getElementById('status-' + padId);
                if (statusEl) {
                    statusEl.style.display = 'none';
                }
            };

            function limpiarGrupoFirmas(ids) {
                ids.forEach(function(padId) { window.limpiarFirma(padId); });
            }

            window.limpiarFirmasRevision = function() {
                limpiarGrupoFirmas(FIRMA_IDS_REVISION);
            };

            window.limpiarFirmasFauna = function() {
                limpiarGrupoFirmas(FIRMA_IDS_FAUNA);
            };

            window.limpiarTodasLasFirmas = function() {
                limpiarGrupoFirmas(FIRMA_IDS_REVISION.concat(FIRMA_IDS_FAUNA));
            };

            // Los canvas no se reinician con form.reset(). Se enlazan de forma
            // explícita para cubrir cualquier envío o reinicio futuro.
            function bindFormResetHandlers() {
                if (resetHandlersBound) return;
                resetHandlersBound = true;
                var revisionForm = document.getElementById('report-form');
                var faunaForm = document.getElementById('fauna-form');
                if (revisionForm) revisionForm.addEventListener('reset', window.limpiarFirmasRevision);
                if (faunaForm) faunaForm.addEventListener('reset', window.limpiarFirmasFauna);
            }

            // Detecta si el canvas tiene trazos (no está completamente en blanco)
            function canvasTieneTrazo(canvas) {
                try {
                    var ctx = canvas.getContext('2d');
                    var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                    for (var i = 0; i < data.length; i += 4) {
                        if (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255) return true;
                    }
                    return false;
                } catch (e) { return false; }
            }

            // Captura automática de la firma desde el canvas si fue dibujada
            function autoCapturarFirma(padId) {
                var canvas = window.firmaPads[padId];
                if (!canvas) return;
                if (canvasTieneTrazo(canvas)) {
                    window.firmaData[padId] = canvas.toDataURL('image/png');
                    window.firmaGuardada[padId] = true;
                }
            }

            // Función global para guardar firma explícitamente (compatibilidad)
            window.guardarFirma = function(padId) {
                var canvas = window.firmaPads[padId];
                if (!canvas) return;
                window.firmaData[padId] = canvas.toDataURL('image/png');
                window.firmaGuardada[padId] = true;
                var statusEl = document.getElementById('status-' + padId);
                if (statusEl) statusEl.style.display = 'inline-block';
            };

            // Obtener firmas para incluir en PDF (auto-captura previa)
            window.obtenerFirmas = function() {
                ['area', 'aifa', 'afac'].forEach(autoCapturarFirma);
                return {
                    area: window.firmaData.area,
                    aifa: window.firmaData.aifa,
                    afac: window.firmaData.afac
                };
            };

            // Obtener firmas de fauna para incluir en PDF (auto-captura previa)
            window.obtenerFirmasFauna = function() {
                ['fauna_aifa', 'fauna_afac'].forEach(autoCapturarFirma);
                return {
                    aifa: window.firmaData.fauna_aifa,
                    afac: window.firmaData.fauna_afac
                };
            };

            // Función global para toggle la visibilidad de las firmas
            window.toggleFirmas = function() {
                var firmaSection = document.querySelector('#revision-section .firma-section');
                var toggleBtn = document.getElementById('firma-toggle-btn');
                
                if (!firmaSection || !toggleBtn) return;
                
                firmaSection.classList.toggle('visible');
                
                // Cambiar el texto del botón
                if (firmaSection.classList.contains('visible')) {
                    toggleBtn.textContent = '📋 Ocultar Firmas';
                } else {
                    toggleBtn.textContent = '📝 Mostrar Firmas';
                }
            };

            // Función global para toggle la visibilidad de las firmas de Fauna
            window.toggleFirmasFauna = function() {
                var firmaSection = document.querySelector('#fauna-section .firma-section');
                var toggleBtn = document.getElementById('fauna_firma-toggle-btn');
                
                if (!firmaSection || !toggleBtn) return;
                
                firmaSection.classList.toggle('visible');
                
                // Cambiar el texto del botón
                if (firmaSection.classList.contains('visible')) {
                    toggleBtn.textContent = '📋 Ocultar Firmas';
                } else {
                    toggleBtn.textContent = '📝 Mostrar Firmas';
                }
            };

            // Inicializar canvas al cargar
            document.addEventListener('DOMContentLoaded', function() {
                // Agregar event listener al botón de toggle
                var toggleBtn = document.getElementById('firma-toggle-btn');
                if (toggleBtn) {
                    toggleBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        window.toggleFirmas();
                    });
                }

                // Agregar event listener al botón de toggle de Fauna
                var faunaTriggleBtn = document.getElementById('fauna_firma-toggle-btn');
                if (faunaTriggleBtn) {
                    faunaTriggleBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        window.toggleFirmasFauna();
                    });
                }
                
                setTimeout(function() {
                    initFirmaPad('area');
                    initFirmaPad('aifa');
                    initFirmaPad('afac');
                    initFirmaPad('fauna_aifa');
                    initFirmaPad('fauna_afac');
                    bindFormResetHandlers();
                }, 100);
            });

            // Si el DOM ya está cargado, inicializar directamente
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() {
                    setTimeout(function() {
                        initFirmaPad('area');
                        initFirmaPad('aifa');
                        initFirmaPad('afac');
                        initFirmaPad('fauna_aifa');
                        initFirmaPad('fauna_afac');
                        bindFormResetHandlers();
                    }, 100);
                });
            } else {
                setTimeout(function() {
                    initFirmaPad('area');
                    initFirmaPad('aifa');
                    initFirmaPad('afac');
                    initFirmaPad('fauna_aifa');
                    initFirmaPad('fauna_afac');
                    bindFormResetHandlers();
                }, 100);
            }
        })();
