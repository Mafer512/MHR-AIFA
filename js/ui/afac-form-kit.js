/* ============================================================================
 * Primitivas compartidas para reproducir las formas oficiales de la
 * Agencia Federal de Aviación Civil en PDF:
 *
 *   · AFAC-SA-FAUNA-I/ene-22 — Notificación de Impacto con Fauna
 *   · AFAC-SA-FAUNA-A/ene-22 — Notificación de Avistamiento de Fauna
 *
 * Ambas comparten logotipos, encabezado, rejilla de casillas, nota al pie
 * y los anexos AIFA de mapa.
 * ==========================================================================*/
(function () {
    'use strict';

    // Grosor de línea de la rejilla oficial
    var B = '1.2px solid #000';

    var LOGOS = { sict: null, afac: null, loaded: false };

    /* ── Utilidades ────────────────────────────────────────────────────── */

    function esc(v) {
        return (v === null || v === undefined ? '' : String(v))
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function fechaDDMMAAAA(iso) {
        if (!iso) return '';
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso));
        return m ? (m[3] + '/' + m[2] + '/' + m[1]) : String(iso);
    }

    function toDataURL(url) {
        return fetch(url)
            .then(function (r) { return r.ok ? r.blob() : Promise.reject(new Error(r.status)); })
            .then(function (blob) {
                return new Promise(function (resolve, reject) {
                    var fr = new FileReader();
                    fr.onload = function () { resolve(fr.result); };
                    fr.onerror = reject;
                    fr.readAsDataURL(blob);
                });
            });
    }

    async function loadLogos() {
        if (LOGOS.loaded) return LOGOS;
        try {
            var pair = await Promise.all([
                toDataURL('./assets/img/sict-logo.png').catch(function () { return null; }),
                toDataURL('./assets/img/afac-logo.png').catch(function () { return null; })
            ]);
            LOGOS.sict = pair[0];
            LOGOS.afac = pair[1];
        } catch (e) {
            console.warn('No se pudieron incrustar los logotipos oficiales:', e);
        }
        LOGOS.loaded = true;
        return LOGOS;
    }

    /* ── Primitivas de dibujo ──────────────────────────────────────────── */

    // Casilla de verificación: cuadro con "X" cuando está marcada
    function box(on) {
        return '<span style="display:inline-block;width:10px;height:10px;border:' + B +
            ';margin-right:5px;text-align:center;line-height:9px;font-size:9px;' +
            'font-weight:700;font-family:Arial,Helvetica,sans-serif;vertical-align:-1px;">' +
            (on ? '&#10005;' : '&nbsp;') + '</span>';
    }

    // Opción suelta "☐ Etiqueta"
    function opt(label, on) {
        return '<span style="display:inline-block;font-size:8.5px;white-space:nowrap;' +
            'margin-right:14px;">' + box(on) + esc(label) + '</span>';
    }

    // Opción en columnas de ancho fijo (para repartir N por renglón)
    function optCol(label, on, width) {
        return '<span style="display:inline-block;width:' + width + ';font-size:8.5px;">' +
            box(on) + esc(label) + '</span>';
    }

    // Campo de captura con recuadro
    function fld(value, width) {
        return '<span style="display:inline-block;border:' + B + ';padding:2px 5px;' +
            'font-size:8.5px;min-height:11px;line-height:11px;' +
            (width ? 'width:' + width + ';' : 'min-width:70px;') +
            'vertical-align:middle;overflow:hidden;white-space:nowrap;">' +
            (esc(value) || '&nbsp;') + '</span>';
    }

    // Caja multilínea (observaciones, descripciones, ubicaciones)
    function area(value, minHeight) {
        return '<div style="border:' + B + ';min-height:' + (minHeight || 34) + 'px;padding:3px 5px;' +
            'font-size:8.5px;white-space:pre-wrap;word-break:break-word;line-height:1.35;">' +
            (esc(value) || '&nbsp;') + '</div>';
    }

    function lbl(text) {
        return '<span style="font-size:8.5px;font-weight:700;">' + text + '</span>';
    }

    // Renglón de la rejilla exterior
    function row(innerHtml, last) {
        return '<tr><td style="padding:0;' +
            (last ? '' : 'border-bottom:' + B + ';') + '">' + innerHtml + '</td></tr>';
    }

    // Tabla interna de columnas para un renglón
    function cols(cells) {
        var html = '<table style="width:100%;border-collapse:collapse;table-layout:fixed;"><tr>';
        cells.forEach(function (c, i) {
            html += '<td style="padding:4px 6px;vertical-align:middle;font-size:8.5px;' +
                (c.width ? 'width:' + c.width + ';' : '') +
                (i < cells.length - 1 ? 'border-right:' + B + ';' : '') +
                (c.style || '') + '">' + c.html + '</td>';
        });
        return html + '</tr></table>';
    }

    // Renglón "Etiqueta: [opciones repartidas]"
    function optionsRow(label, labelWidth, values, selected, perRow) {
        var width = Math.floor(100 / (perRow || values.length)) - 1 + '%';
        return cols([
            { html: lbl(label), width: labelWidth },
            {
                html: values.map(function (v) {
                    return optCol(v, selected === v, width);
                }).join('')
            }
        ]);
    }

    /* ── Encabezado oficial ────────────────────────────────────────────── */

    // Proporciones tomadas del original: SICT ~30 % del ancho útil,
    // escudo AFAC ~18 %, y los títulos centrados entre ambos.
    function header(logos, titleLines, formaCode) {
        var h = '<table style="width:100%;border-collapse:collapse;margin-bottom:2px;table-layout:fixed;"><tr>' +
            '<td style="width:30%;vertical-align:middle;">' +
            (logos.sict ? '<img src="' + logos.sict + '" style="width:100%;display:block;">' : '') +
            '</td>' +
            '<td style="width:52%;text-align:center;vertical-align:middle;line-height:1.35;">';
        titleLines.forEach(function (t) {
            h += '<div style="font-size:11px;font-weight:700;">' + t + '</div>';
        });
        h += '</td>' +
            '<td style="width:18%;text-align:right;vertical-align:middle;">' +
            (logos.afac ? '<img src="' + logos.afac + '" style="width:100%;display:block;margin-left:auto;">' : '') +
            '</td></tr></table>';

        h += '<div style="text-align:right;font-size:8px;font-weight:700;margin-bottom:3px;">' +
            'FORMA: ' + esc(formaCode) + '</div>';
        return h;
    }

    // Nota al pie (texto oficial; el de impacto incluye una frase extra)
    function notaPie(conAcuseDeRecibo) {
        return '<div style="padding:5px 7px;font-size:7.5px;line-height:1.45;text-align:justify;">' +
            'Este formulario debe ser entregado a la Autoridad Aeronáutica representada por cualquiera de las ' +
            'Comandancias de Aeropuerto de la red aeroportuaria nacional. ' +
            (conAcuseDeRecibo ? 'Debe presentarse con copia para efectos de acuse de recibo. ' : '') +
            'La Comandancia de Aeropuerto que reciba este formulario debidamente requisitado, ' +
            'debe validarlo, registrarlo en el sistema electrónico determinado por la Autoridad Aeronáutica ' +
            'representada por el Área Central y debe archivarlo físicamente para los fines que correspondan.' +
            '</div>';
    }

    // Pie de control interno (fuera de la forma oficial)
    function pieControl(folio) {
        return '<div style="margin-top:6px;font-size:7px;color:#555;display:flex;">' +
            '<span style="flex:1;">Folio interno AIFA: ' + esc(folio) + '</span>' +
            '<span>Generado ' + esc(new Date().toLocaleString('es-MX')) + '</span></div>';
    }

    /* ── Instructivo de llenado (página 2 del formato oficial) ─────────── */

    var INCISOS = [
        'a)&nbsp;&nbsp;&nbsp;El formulario está disponible en el portal de la Agencia Federal de Aviación Civil.',
        'b)&nbsp;&nbsp;&nbsp;Debe llenarse a computadora o imprimirse y llenarse en máquina de escribir o a mano con letra de molde legible.',
        'c)&nbsp;&nbsp;&nbsp;Usar tinta, preferiblemente de color azul.',
        'd)&nbsp;&nbsp;&nbsp;En caso de no aplicar, algunas casillas deberán llenarse colocando N/A o dejarse vacías.',
        'e)&nbsp;&nbsp;&nbsp;Debe considerarse la siguiente guía de llenado:'
    ];

    function instructivoHtml(titulo, casillas) {
        var h = '<div style="font-family:Arial,Helvetica,sans-serif;color:#000;font-size:9px;line-height:1.5;">';
        h += '<div style="font-size:11px;font-weight:700;margin-bottom:10px;">' + esc(titulo) + '</div>';
        INCISOS.forEach(function (p) {
            h += '<div style="margin-bottom:6px;text-align:justify;">' + p + '</div>';
        });
        casillas.forEach(function (r) {
            h += '<div style="margin-bottom:4px;text-align:justify;padding-left:14px;text-indent:-14px;">' +
                '&minus;&nbsp;&nbsp;&nbsp;<strong>' + esc(r[0]) + ':</strong> ' + esc(r[1]) + '</div>';
        });
        return h + '</div>';
    }

    /* ── Anexos AIFA: mapa del punto reportado ─────────────────────────── */

    async function appendMapPage(pdf, lat, lng, folio, titulo) {
        if (!lat || !lng || typeof window.L === 'undefined' || typeof window.html2canvas !== 'function') return;

        var holder, map;
        try {
            holder = document.createElement('div');
            holder.style.cssText = 'position:fixed;top:0;left:-1400px;width:1122px;height:794px;' +
                'background:#fff;font-family:Arial,Helvetica,sans-serif;overflow:hidden;';

            var mapId = 'afac-kit-map-' + Date.now();
            holder.innerHTML =
                '<div style="padding:10px 20px 0 20px;">' +
                '<span style="font-size:14px;font-weight:700;color:#0b66c3;">' + esc(titulo) + '</span>' +
                '<span style="font-size:10px;color:#6b7280;margin-left:14px;">' +
                lat + ', ' + lng + ' &nbsp;·&nbsp; Folio ' + esc(folio) + '</span>' +
                '<div style="border-top:2px solid #0b66c3;margin-top:6px;"></div></div>' +
                '<div id="' + mapId + '" style="width:1122px;height:740px;"></div>';
            document.body.appendChild(holder);

            map = window.L.map(mapId, {
                zoomControl: false, attributionControl: false,
                preferCanvas: true, fadeAnimation: false, zoomAnimation: false
            });
            window.L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
                subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], maxZoom: 20, crossOrigin: true
            }).addTo(map);

            window.L.marker([lat, lng], {
                icon: window.L.divIcon({
                    className: '',
                    html: '<div style="background:#dc2626;color:#fff;font-size:13px;font-weight:700;' +
                        'width:30px;height:30px;border-radius:50%;display:flex;align-items:center;' +
                        'justify-content:center;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.55);">1</div>',
                    iconSize: [30, 30], iconAnchor: [15, 30]
                })
            }).addTo(map);
            map.setView([lat, lng], 17);

            await new Promise(function (resolve) {
                var done = false;
                function finish() { if (!done) { done = true; resolve(); } }
                map.once('load', finish);
                setTimeout(finish, 2500);
            });
            await new Promise(function (r) { setTimeout(r, 300); });

            var canvas = await window.html2canvas(holder, {
                scale: 1.5, useCORS: true, allowTaint: true, logging: false
            });

            pdf.addPage([297, 210], 'l');
            pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 297, 210);
        } catch (err) {
            console.warn('No se pudo anexar la página de mapa:', err);
        } finally {
            if (map) { try { map.remove(); } catch (e) { } }
            if (holder && holder.parentNode) document.body.removeChild(holder);
        }
    }

    function appendMapsLinkPage(pdf, lat, lng, titulo) {
        if (!lat || !lng) return;
        var url = 'https://maps.google.com/maps?q=' + lat + ',' + lng + '&t=k&z=17';
        pdf.addPage();
        pdf.setFontSize(16); pdf.setTextColor(0, 61, 153); pdf.setFont(undefined, 'bold');
        pdf.text(titulo || 'Ubicacion reportada', 20, 25);
        pdf.setDrawColor(0, 61, 153); pdf.setLineWidth(0.8); pdf.line(20, 28, 190, 28);

        pdf.setFontSize(11); pdf.setTextColor(80, 80, 80); pdf.setFont(undefined, 'normal');
        pdf.text('Coordenadas: ' + lat + ', ' + lng, 20, 40);

        pdf.setTextColor(0, 85, 165);
        var linkText = 'Ver ubicacion en Google Maps (vista satelital)';
        pdf.textWithLink(linkText, 20, 52, { url: url });
        pdf.setDrawColor(0, 85, 165); pdf.setLineWidth(0.3);
        pdf.line(20, 53.5, 20 + pdf.getTextWidth(linkText), 53.5);

        pdf.setFontSize(8); pdf.setTextColor(130, 130, 130); pdf.setFont(undefined, 'italic');
        pdf.text(pdf.splitTextToSize(url, 170), 20, 62);
    }

    /* ── Salida a PDF ──────────────────────────────────────────────────── */

    // Carta a 96 dpi = 816 × 1056 px. Con margen de 9 mm (≈34 px) el área
    // útil es de 748 × 988 px, que es el ancho con el que se diseñaron las
    // réplicas y con el que se miden al renderizarlas.
    var PAGE = { w: 215.9, h: 279.4, margin: 9, pxWidth: 748 };

    function getJsPDF() {
        return (window.jspdf && window.jspdf.jsPDF) || window.jsPDF ||
            (window.jsPDF && window.jsPDF.jsPDF);
    }

    // html2canvas captura lo que ya está pintado: hay que esperar a las imágenes.
    function waitForImages(el) {
        var imgs = Array.prototype.slice.call(el.querySelectorAll('img'));
        return Promise.all(imgs.map(function (img) {
            if (img.complete && img.naturalWidth) return Promise.resolve();
            return new Promise(function (resolve) {
                img.onload = img.onerror = resolve;
                setTimeout(resolve, 3000);
            });
        }));
    }

    /**
     * Genera el PDF pintando CADA hoja por separado.
     *
     * Antes se concatenaba todo en un solo HTML y se delegaba el corte a
     * html2pdf, que ignoraba el salto de página y rebanaba el lienzo a media
     * línea (el instructivo empezaba cortado en la primera hoja y el
     * encabezado se recortaba). Al renderizar hoja por hoja el corte es
     * exacto y el encabezado siempre queda completo.
     *
     * @param {string[]} pagesHtml Una entrada por hoja.
     * @returns {Promise<object>} instancia jsPDF
     */
    async function renderPages(pagesHtml) {
        var JsPDF = getJsPDF();
        if (!JsPDF) throw new Error('No se encontró jsPDF para generar el documento.');

        var contentW = PAGE.w - 2 * PAGE.margin;
        var contentH = PAGE.h - 2 * PAGE.margin;

        var holder = document.createElement('div');
        holder.style.cssText = 'position:fixed;top:0;left:-10000px;width:' + PAGE.pxWidth +
            'px;background:#fff;overflow:visible;';
        document.body.appendChild(holder);

        var pdf = null;
        try {
            for (var i = 0; i < pagesHtml.length; i++) {
                holder.innerHTML = pagesHtml[i];
                await waitForImages(holder);

                var canvas = await window.html2canvas(holder, {
                    scale: 2,
                    useCORS: true,
                    allowTaint: true,
                    logging: false,
                    backgroundColor: '#ffffff',
                    windowWidth: PAGE.pxWidth
                });

                // Ajustar a la caja útil conservando la proporción, de modo que
                // una hoja más alta de lo previsto se reduzca en vez de cortarse.
                var imgW = contentW;
                var imgH = contentW * canvas.height / canvas.width;
                if (imgH > contentH) {
                    imgH = contentH;
                    imgW = contentH * canvas.width / canvas.height;
                }

                if (!pdf) {
                    pdf = new JsPDF({
                        unit: 'mm', format: 'letter', orientation: 'portrait', compress: true
                    });
                } else {
                    pdf.addPage('letter', 'portrait');
                }
                pdf.addImage(canvas.toDataURL('image/jpeg', 0.98), 'JPEG',
                    PAGE.margin, PAGE.margin, imgW, imgH);
            }
        } finally {
            if (holder.parentNode) document.body.removeChild(holder);
        }
        return pdf;
    }

    window.MHRAfacFormKit = {
        B: B,
        esc: esc,
        fechaDDMMAAAA: fechaDDMMAAAA,
        loadLogos: loadLogos,
        box: box,
        opt: opt,
        optCol: optCol,
        fld: fld,
        area: area,
        lbl: lbl,
        row: row,
        cols: cols,
        optionsRow: optionsRow,
        header: header,
        notaPie: notaPie,
        pieControl: pieControl,
        instructivoHtml: instructivoHtml,
        appendMapPage: appendMapPage,
        appendMapsLinkPage: appendMapsLinkPage,
        renderPages: renderPages,
        PAGE: PAGE
    };
})();
