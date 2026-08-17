/* ============================================================================
 * Réplica imprimible de la forma AFAC-SA-FAUNA-I/ene-22
 * "Notificación de Impacto con Fauna" — Agencia Federal de Aviación Civil
 *
 * Reproduce el formato oficial (mismos logotipos, casillas y redacción) y le
 * agrega, como anexo AIFA, la página de mapa satelital con el punto del evento.
 *
 * window.MHRAfacPdfRenderer.generate(afac, folio) → Promise<{ blob, pdf }>
 * ==========================================================================*/
(function () {
    'use strict';

    var LOGOS = { sict: null, afac: null, loaded: false };

    var PARTES_IZQ = [
        ['A', 'Radomo'], ['B', 'Parabrisas'], ['C', 'Sección de Nariz (Excepto A y B)'],
        ['D', 'Motor No. 1'], ['E', 'Motor No. 2'], ['F', 'Motor No. 3'], ['G', 'Motor No. 4']
    ];
    var PARTES_DER = [
        ['H', 'Hélice'], ['I', 'Ala/Rotor'], ['J', 'Fuselaje'], ['K', 'Tren de Aterrizaje'],
        ['L', 'Sección de Cola'], ['M', 'Luces'], ['N', 'Otro']
    ];
    var FASES = [
        'A. Estacionamiento', 'B. Rodaje', 'C. Carrera de Despegue', 'D. Ascenso',
        'E. En Ruta', 'F. Descenso', 'G. Aproximación', 'H. Aterrizaje'
    ];
    var RANGOS = ['1', '2-10', '11-100', 'más de 100'];

    /* ── Utilidades ────────────────────────────────────────────────────── */

    function esc(v) {
        return (v === null || v === undefined ? '' : String(v))
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

    function fechaDDMMAAAA(iso) {
        if (!iso) return '';
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso));
        return m ? (m[3] + '/' + m[2] + '/' + m[1]) : String(iso);
    }

    /* ── Primitivas de dibujo del formulario ──────────────────────────── */

    var B = '1.2px solid #000';

    // Casilla de verificación: cuadro con "X" si está marcada
    function box(on) {
        return '<span style="display:inline-block;width:10px;height:10px;border:' + B +
            ';margin-right:5px;text-align:center;line-height:9px;font-size:9px;' +
            'font-weight:700;font-family:Arial,Helvetica,sans-serif;vertical-align:-1px;">' +
            (on ? '&#10005;' : '&nbsp;') + '</span>';
    }

    // Opción "☐ Etiqueta"
    function opt(label, on) {
        return '<span style="display:inline-block;font-size:8.5px;white-space:nowrap;' +
            'margin-right:14px;">' + box(on) + esc(label) + '</span>';
    }

    // Campo de captura con recuadro
    function fld(value, width) {
        return '<span style="display:inline-block;border:' + B + ';padding:2px 5px;' +
            'font-size:8.5px;min-height:11px;line-height:11px;' +
            (width ? 'width:' + width + ';' : 'min-width:70px;') +
            'vertical-align:middle;overflow:hidden;white-space:nowrap;">' +
            (esc(value) || '&nbsp;') + '</span>';
    }

    function lbl(text) {
        return '<span style="font-size:8.5px;font-weight:700;">' + text + '</span>';
    }

    // Una fila del formulario, dentro de la rejilla exterior
    function row(innerHtml, last) {
        return '<tr><td style="padding:0;' +
            (last ? '' : 'border-bottom:' + B + ';') + '">' + innerHtml + '</td></tr>';
    }

    // Tabla interna de columnas para una fila
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

    /* ── Página 1: la forma oficial ───────────────────────────────────── */

    function buildFormHtml(d, folio, logos) {
        var partesImp = d.partes_impactadas || [];
        var partesDan = d.partes_danadas || [];
        var efecto = d.efecto_operacion || [];

        var h = '<div style="font-family:Arial,Helvetica,sans-serif;color:#000;">';

        // ── Encabezado con los logotipos oficiales ──
        // Proporciones tomadas del original: SICT ocupa ~30 % del ancho util
        // y el escudo AFAC ~17.5 %, con los tres titulos centrados en medio.
        h += '<table style="width:100%;border-collapse:collapse;margin-bottom:2px;table-layout:fixed;"><tr>' +
            '<td style="width:30%;vertical-align:middle;">' +
            (logos.sict ? '<img src="' + logos.sict + '" style="width:100%;display:block;">' : '') +
            '</td>' +
            '<td style="width:52%;text-align:center;vertical-align:middle;line-height:1.35;">' +
            '<div style="font-size:11px;font-weight:700;">AGENCIA FEDERAL DE AVIACIÓN CIVIL</div>' +
            '<div style="font-size:11px;font-weight:700;">DIRECCIÓN EJECUTIVA DE SEGURIDAD AÉREA</div>' +
            '<div style="font-size:11px;font-weight:700;">NOTIFICACIÓN DE IMPACTO CON FAUNA</div>' +
            '</td>' +
            '<td style="width:18%;text-align:right;vertical-align:middle;">' +
            (logos.afac ? '<img src="' + logos.afac + '" style="width:100%;display:block;margin-left:auto;">' : '') +
            '</td></tr></table>';

        h += '<div style="text-align:right;font-size:8px;font-weight:700;margin-bottom:3px;">' +
            'FORMA: AFAC-SA-FAUNA-I/ene-22</div>';

        // ── Rejilla ──
        h += '<table style="width:100%;border-collapse:collapse;border:' + B + ';table-layout:fixed;"><tbody>';

        // 1-3
        h += row(cols([
            { html: lbl('1. Explotador:') + ' ' + fld(d.explotador), width: '34%' },
            { html: lbl('2. Marca de Aeronave:') + ' ' + fld(d.marca_aeronave), width: '33%' },
            { html: lbl('3. Modelo de Aeronave:') + ' ' + fld(d.modelo_aeronave), width: '33%' }
        ]));

        // 4-6
        h += row(cols([
            { html: lbl('4. Matrícula:') + ' ' + fld(d.matricula), width: '34%' },
            { html: lbl('5. Marca de Motor:') + ' ' + fld(d.marca_motor), width: '33%' },
            { html: lbl('6. Modelo de Motor:') + ' ' + fld(d.modelo_motor), width: '33%' }
        ]));

        // 7-8 (+ AM/PM)
        h += row(cols([
            { html: lbl('7. Fecha del Evento (dd/mm/aaaa):') + ' ' + fld(fechaDDMMAAAA(d.fecha_evento)), width: '50%' },
            { html: lbl('8. Hora Local del Evento:') + ' ' + fld(d.hora_evento, '52px'), width: '35%' },
            {
                html: '<div style="line-height:1.6;">' +
                    '<div style="font-size:8.5px;">' + box(d.meridiano === 'AM') + 'AM</div>' +
                    '<div style="font-size:8.5px;">' + box(d.meridiano === 'PM') + 'PM</div></div>',
                width: '15%'
            }
        ]));

        // 9
        h += row(cols([
            { html: lbl('9. Luz solar:'), width: '15%' },
            {
                html: ['Amanecer', 'Día', 'Anochecer', 'Noche'].map(function (v) {
                    return '<span style="display:inline-block;width:24%;font-size:8.5px;">' +
                        box(d.luz_solar === v) + esc(v) + '</span>';
                }).join('')
            }
        ]));

        // 10-14 (12 ocupa el alto de dos filas)
        h += row(cols([
            {
                html: '<table style="width:100%;border-collapse:collapse;table-layout:fixed;"><tr>' +
                    '<td style="padding:4px 6px;font-size:8.5px;border-right:' + B + ';border-bottom:' + B + ';width:50%;">' +
                    lbl('10. Aeródromo:') + ' ' + fld(d.aerodromo, '58px') + '</td>' +
                    '<td style="padding:4px 6px;font-size:8.5px;border-bottom:' + B + ';">' +
                    lbl('11. Pista Utilizada:') + ' ' + fld(d.pista_utilizada, '78px') + '</td></tr>' +
                    '<tr><td style="padding:4px 6px;font-size:8.5px;border-right:' + B + ';">' +
                    lbl('13. Altura (AGL):') + ' ' + fld(d.altura_agl, '58px') + '</td>' +
                    '<td style="padding:4px 6px;font-size:8.5px;">' +
                    lbl('14. Velocidad (IAS):') + ' ' + fld(d.velocidad_ias, '58px') + '</td></tr></table>',
                width: '62%',
                style: 'padding:0;'
            },
            {
                html: '<div style="display:block;">' + lbl('12. Ubicación en Ruta:') + '</div>' +
                    '<div style="border:' + B + ';min-height:34px;padding:3px 5px;font-size:8.5px;' +
                    'margin-top:3px;white-space:pre-wrap;word-break:break-word;line-height:1.3;">' +
                    (esc(d.ubicacion_ruta) || '&nbsp;') + '</div>',
                width: '38%',
                style: 'vertical-align:top;'
            }
        ]));

        // 15
        h += row('<div style="padding:4px 6px;">' + lbl('15. Fase de la operación:') +
            '<div style="margin-top:4px;">' +
            FASES.map(function (f) {
                return '<span style="display:inline-block;width:24%;font-size:8.5px;padding:2px 0;">' +
                    box(d.fase_operacion === f) + esc(f) + '</span>';
            }).join('') + '</div></div>');

        // 16
        var partesRows = '';
        for (var i = 0; i < PARTES_IZQ.length; i++) {
            var L = PARTES_IZQ[i], R = PARTES_DER[i];
            partesRows += '<tr>' +
                '<td style="font-size:8.5px;padding:2px 4px 2px 14px;">' + L[0] + '. &nbsp;' + esc(L[1]) + '</td>' +
                '<td style="text-align:center;padding:2px;">' + box(partesImp.indexOf(L[0]) !== -1) + '</td>' +
                '<td style="text-align:center;padding:2px;">' + box(partesDan.indexOf(L[0]) !== -1) + '</td>' +
                '<td style="font-size:8.5px;padding:2px 4px 2px 14px;">' + R[0] + '. &nbsp;' + esc(R[1]) + '</td>' +
                '<td style="text-align:center;padding:2px;">' + box(partesImp.indexOf(R[0]) !== -1) + '</td>' +
                '<td style="text-align:center;padding:2px;">' + box(partesDan.indexOf(R[0]) !== -1) + '</td>' +
                '</tr>';
        }
        var partesHead = '<tr>' +
            '<td></td>' +
            '<td style="font-size:7.5px;text-align:center;padding:1px;">Impactada</td>' +
            '<td style="font-size:7.5px;text-align:center;padding:1px;">Dañada</td>' +
            '<td></td>' +
            '<td style="font-size:7.5px;text-align:center;padding:1px;">Impactada</td>' +
            '<td style="font-size:7.5px;text-align:center;padding:1px;">Dañada</td>' +
            '</tr>';
        h += row('<div style="padding:4px 6px 2px;">' + lbl('16. Partes Impactadas o Dañadas') + '</div>' +
            '<table style="width:100%;border-collapse:collapse;table-layout:fixed;">' +
            '<colgroup><col style="width:29%"><col style="width:10%"><col style="width:11%">' +
            '<col style="width:29%"><col style="width:10%"><col style="width:11%"></colgroup>' +
            partesHead + partesRows + '</table>' +
            '<div style="padding:4px 6px 5px;">' + lbl('Otro (describir):') + ' ' +
            fld(d.partes_otro, '78%') + '</div>');

        // 17
        h += row('<div style="padding:4px 6px;">' + lbl('17. Efecto en la Operación:') +
            '<div style="margin-top:4px;">' +
            ['Ninguno', 'Despegue Descontinuado', 'Aterrizaje Precautorio', 'Paro de Motor', 'Otro'].map(function (v) {
                return opt(v, efecto.indexOf(v) !== -1);
            }).join('') + '</div>' +
            '<div style="margin-top:5px;">' + lbl('Otro (describir):') + ' ' + fld(d.efecto_otro, '78%') + '</div></div>');

        // 18
        h += row(cols([
            { html: lbl('18. Condición del Cielo:'), width: '24%' },
            {
                html: ['Despejado', 'Medio Nublado', 'Nublado'].map(function (v) {
                    return '<span style="display:inline-block;width:32%;font-size:8.5px;">' +
                        box(d.condicion_cielo === v) + esc(v) + '</span>';
                }).join('')
            }
        ]));

        // 19
        h += row(cols([
            { html: lbl('19. Precipitación:'), width: '18%' },
            {
                html: ['Niebla', 'Lluvia', 'Nieve', 'Ninguna'].map(function (v) {
                    return '<span style="display:inline-block;width:24%;font-size:8.5px;">' +
                        box(d.precipitacion === v) + esc(v) + '</span>';
                }).join('')
            }
        ]));

        // 20-21
        h += row(cols([
            { html: lbl('20. Especie de Fauna:') + ' ' + fld(d.especie_fauna, '58%'), width: '46%' },
            {
                html: lbl('21. Tamaño del (los) Ejemplar(es):') + ' ' +
                    ['Pequeño(s)', 'Mediano(s)', 'Grande(s)'].map(function (v) {
                        return opt(v, d.tamano_ejemplares === v);
                    }).join(''),
                width: '54%'
            }
        ]));

        // 22 · 23 · 24
        var ejemplares = '<div style="padding:4px 6px;">' + lbl('22. Número de Ejemplares') +
            '<table style="width:100%;border-collapse:collapse;margin-top:3px;table-layout:fixed;">' +
            '<tr><td></td>' +
            '<td style="font-size:7.5px;text-align:center;">Avistados</td>' +
            '<td style="font-size:7.5px;text-align:center;">Impactados</td></tr>';
        RANGOS.forEach(function (r) {
            ejemplares += '<tr>' +
                '<td style="font-size:8.5px;padding:3px 0 3px 16px;">' + esc(r) + '</td>' +
                '<td style="text-align:center;padding:3px;">' + box(d.ejemplares_avistados === r) + '</td>' +
                '<td style="text-align:center;padding:3px;">' + box(d.ejemplares_impactados === r) + '</td>' +
                '</tr>';
        });
        ejemplares += '</table></div>';

        var advertido = '<div style="padding:4px 6px;border-bottom:' + B + ';">' +
            lbl('23. El Piloto fue Advertido sobre la Presencia de Fauna:') +
            '<span style="margin-left:10px;">' + opt('SI', d.piloto_advertido === true) +
            opt('NO', d.piloto_advertido === false) + '</span></div>' +
            '<div style="padding:4px 6px;border-bottom:' + B + ';font-size:8.5px;">' +
            'Si la respuesta es si, ¿Quién advrtió al piloto?: ' + fld(d.piloto_advertido_por, '46%') + '</div>' +
            '<table style="width:100%;border-collapse:collapse;table-layout:fixed;"><tr>' +
            '<td style="width:32%;padding:4px 6px;text-align:center;font-size:8.5px;font-weight:700;vertical-align:middle;">' +
            '24. Observaciones (describir daños, lesiones u otra información pertinente)</td>' +
            '<td style="padding:4px 6px;vertical-align:top;">' +
            '<div style="border:' + B + ';min-height:52px;padding:3px 5px;font-size:8.5px;' +
            'white-space:pre-wrap;word-break:break-word;line-height:1.35;">' +
            (esc(d.observaciones) || '&nbsp;') + '</div></td></tr></table>';

        h += row('<table style="width:100%;border-collapse:collapse;table-layout:fixed;"><tr>' +
            '<td style="width:38%;vertical-align:top;border-right:' + B + ';padding:0;">' + ejemplares + '</td>' +
            '<td style="width:62%;vertical-align:top;padding:0;">' + advertido + '</td>' +
            '</tr></table>');

        // 25-26
        h += row(cols([
            { html: lbl('25. Reportado por:') + ' ' + fld(d.reportado_por, '62%'), width: '58%' },
            { html: lbl('26. Puesto:') + ' ' + fld(d.puesto, '58%'), width: '42%' }
        ]));

        // 27-28
        h += row(cols([
            { html: lbl('27. Empresa:') + ' ' + fld(d.empresa, '66%'), width: '55%' },
            { html: lbl('28. Fecha del Reporte (dd/mm/aaaa):') + ' ' + fld(fechaDDMMAAAA(d.fecha_reporte), '72px'), width: '45%' }
        ]));

        // Nota al pie (texto oficial)
        h += row('<div style="padding:5px 7px;font-size:7.5px;line-height:1.45;text-align:justify;">' +
            'Este formulario debe ser entregado a la Autoridad Aeronáutica representada por cualquiera de las ' +
            'Comandancias de Aeropuerto de la red aeroportuaria nacional. Debe presentarse con copia para efectos ' +
            'de acuse de recibo. La Comandancia de Aeropuerto que reciba este formulario debidamente requisitado, ' +
            'debe validarlo, registrarlo en el sistema electrónico determinado por la Autoridad Aeronáutica ' +
            'representada por el Área Central y debe archivarlo físicamente para los fines que correspondan.' +
            '</div>', true);

        h += '</tbody></table>';

        // Pie de control interno (fuera de la forma oficial)
        h += '<div style="margin-top:6px;font-size:7px;color:#555;display:flex;">' +
            '<span style="flex:1;">Folio interno AIFA: ' + esc(folio) + '</span>' +
            '<span>Generado ' + esc(new Date().toLocaleString('es-MX')) + '</span></div>';

        h += '</div>';
        return h;
    }

    /* ── Página 2: instructivo de llenado (texto oficial) ─────────────── */

    var INSTRUCTIVO = [
        ['Casilla 1', 'Anotar el nombre del explotador u operador de aeronaves involucrado con el impacto;'],
        ['Casilla 2', 'Anotar la marca de la aeronave impactada;'],
        ['Casilla 3', 'Anotar el modelo de la aeronave impactada;'],
        ['Casilla 4', 'Anotar la matrícula de la aeronave impactada;'],
        ['Casilla 5', 'Anotar la marca del (los) motor(es) de la aeronave impactada;'],
        ['Casilla 6', 'Anotar el modelo del (los) motor(es) de la aeronave impactada;'],
        ['Casilla 7', 'Anotar la fecha del impacto en formato dd/mm/aaaa;'],
        ['Casilla 8', 'Anotar la hora local del impacto y seleccionar AM o PM;'],
        ['Casilla 9', 'Seleccionar el momento del día en el que se presentó el impacto;'],
        ['Casilla 10', 'Anotar el código OACI del aeródromo de origen o de destino en donde la aeronave recibió el impacto; anotar N/A en caso de no aplicar;'],
        ['Casilla 11', 'Anotar la pista utilizada para el despegue o aterrizaje según corresponda; anotar N/A en caso de no aplicar;'],
        ['Casilla 12', 'Especificar la ubicación en ruta donde se presentó el impacto, haciendo referencia al contenido de las cartas de navegación aplicables; (Aerovías, radiales, distancia a radioayudas, puntos de reporte, etc.) anotar N/A en caso de no aplicar.'],
        ['Casilla 13', 'Anotar la altura de la aeronave (en pies), al momento del impacto;'],
        ['Casilla 14', 'Anotar la velocidad de la aeronave al momento del impacto;'],
        ['Casilla 15', 'Seleccionar la fase de la operación durante la cual ocurrió el impacto;'],
        ['Casilla 16', 'Seleccionar la (s) parte (s) que fue (ron) impactada (s) o dañada (s);'],
        ['Casilla 17', 'Seleccionar la consecuencia o efecto derivado del impacto a la aeronave;'],
        ['Casilla 18', 'Seleccionar la condición del cielo en el momento del impacto;'],
        ['Casilla 19', 'Seleccionar el tipo de precipitación presente en el momento del impacto;'],
        ['Casilla 20', 'Anotar la especie del (los) ejemplar(es) de fauna impactado(s);'],
        ['Casilla 21', 'Seleccionar el tamaño del (los) ejemplar(es) de fauna impactado(s) (Pequeño para fauna con una masa corporal menor a 1 kg, Mediano para una masa de entre 1 kg y 5 kg y Grande para una masa mayor a 5 kg.);'],
        ['Casilla 22', 'Seleccionar el número de ejemplares avistados y el número de ejemplares impactados;'],
        ['Casilla 23', 'Seleccionar si el piloto fue advertido sobre la presencia de fauna;'],
        ['Casilla 24', 'Anotar cualquier otra información que considere pertinente y que pueda ser de utilidad;'],
        ['Casilla 25', 'Anotar el nombre de la persona que requisita el formulario;'],
        ['Casilla 26', 'Anotar el puesto de la persona que requisita el formulario;'],
        ['Casilla 27', 'Anotar la empresa en donde labora la persona que requisita el formulario;'],
        ['Casilla 28', 'Anotar la fecha en que se llenó el formulario de notificación de impacto.']
    ];

    function buildInstructivoHtml() {
        var h = '<div style="font-family:Arial,Helvetica,sans-serif;color:#000;font-size:9px;line-height:1.5;">';
        h += '<div style="font-size:11px;font-weight:700;margin-bottom:10px;">' +
            'Instructivo de llenado del formulario de notificación de impacto.</div>';
        [
            'a)&nbsp;&nbsp;&nbsp;El formulario está disponible en el portal de la Agencia Federal de Aviación Civil.',
            'b)&nbsp;&nbsp;&nbsp;Debe llenarse a computadora o imprimirse y llenarse en máquina de escribir o a mano con letra de molde legible.',
            'c)&nbsp;&nbsp;&nbsp;Usar tinta, preferiblemente de color azul.',
            'd)&nbsp;&nbsp;&nbsp;En caso de no aplicar, algunas casillas deberán llenarse colocando N/A o dejarse vacías.',
            'e)&nbsp;&nbsp;&nbsp;Debe considerarse la siguiente guía de llenado:'
        ].forEach(function (p) {
            h += '<div style="margin-bottom:6px;text-align:justify;">' + p + '</div>';
        });
        INSTRUCTIVO.forEach(function (r) {
            h += '<div style="margin-bottom:4px;text-align:justify;padding-left:14px;text-indent:-14px;">' +
                '&minus;&nbsp;&nbsp;&nbsp;<strong>' + r[0] + ':</strong> ' + esc(r[1]) + '</div>';
        });
        h += '</div>';
        return h;
    }

    /* ── Anexo AIFA: página de mapa satelital ─────────────────────────── */

    async function appendMapPage(pdf, lat, lng, folio) {
        if (!lat || !lng || typeof window.L === 'undefined' || typeof window.html2canvas !== 'function') return;

        var holder, map;
        try {
            holder = document.createElement('div');
            holder.style.cssText = 'position:fixed;top:0;left:-1400px;width:1122px;height:794px;' +
                'background:#fff;font-family:Arial,Helvetica,sans-serif;overflow:hidden;';

            var mapId = 'afac-pdf-map-' + Date.now();
            holder.innerHTML =
                '<div style="padding:10px 20px 0 20px;">' +
                '<span style="font-size:14px;font-weight:700;color:#0b66c3;">' +
                'Anexo AIFA &mdash; Ubicación del impacto con fauna</span>' +
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

    function appendMapsLinkPage(pdf, lat, lng) {
        if (!lat || !lng) return;
        var url = 'https://maps.google.com/maps?q=' + lat + ',' + lng + '&t=k&z=17';
        pdf.addPage();
        pdf.setFontSize(16); pdf.setTextColor(0, 61, 153); pdf.setFont(undefined, 'bold');
        pdf.text('Ubicacion del impacto', 20, 25);
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

    /* ── Punto de entrada ─────────────────────────────────────────────── */

    async function generate(afac, folio) {
        var logos = await loadLogos();

        var html = '<div style="width:100%;">' + buildFormHtml(afac, folio, logos) +
            '<div style="page-break-before:always;"></div>' + buildInstructivoHtml() + '</div>';

        var pdf = await window.html2pdf().set({
            margin: [9, 9, 9, 9],
            filename: 'AFAC-Impacto-Fauna-' + folio + '.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, logging: false, useCORS: true, allowTaint: true },
            jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait', compress: true }
        }).from(html, 'string').toPdf().get('pdf');

        await appendMapPage(pdf, afac.ubicacion_lat, afac.ubicacion_lng, folio);
        appendMapsLinkPage(pdf, afac.ubicacion_lat, afac.ubicacion_lng);

        return { pdf: pdf, blob: pdf.output('blob') };
    }

    window.MHRAfacPdfRenderer = {
        generate: generate,
        buildFormHtml: buildFormHtml,
        buildInstructivoHtml: buildInstructivoHtml,
        loadLogos: loadLogos
    };
})();
