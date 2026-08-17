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

    var K = null;
    function kit() {
        if (!K) K = window.MHRAfacFormKit;
        return K;
    }

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

    /* ── Página 1: la forma oficial ───────────────────────────────────── */

    function buildFormHtml(d, folio, logos) {
        var k = kit();
        var B = k.B, esc = k.esc, box = k.box, opt = k.opt, fld = k.fld, lbl = k.lbl;
        var row = k.row, cols = k.cols, fechaDDMMAAAA = k.fechaDDMMAAAA;

        var partesImp = d.partes_impactadas || [];
        var partesDan = d.partes_danadas || [];
        var efecto = d.efecto_operacion || [];

        var h = '<div style="font-family:Arial,Helvetica,sans-serif;color:#000;">';

        h += k.header(logos, [
            'AGENCIA FEDERAL DE AVIACIÓN CIVIL',
            'DIRECCIÓN EJECUTIVA DE SEGURIDAD AÉREA',
            'NOTIFICACIÓN DE IMPACTO CON FAUNA'
        ], 'AFAC-SA-FAUNA-I/ene-22');

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

        // Nota al pie (texto oficial; el de impacto pide copia de acuse)
        h += row(k.notaPie(true), true);

        h += '</tbody></table>';

        h += k.pieControl(folio);

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
        return kit().instructivoHtml(
            'Instructivo de llenado del formulario de notificación de impacto.',
            INSTRUCTIVO
        );
    }

    /* ── Punto de entrada ─────────────────────────────────────────────── */

    async function generate(afac, folio) {
        var k = kit();
        var logos = await k.loadLogos();

        // Una entrada por hoja: el corte lo controla el kit, no html2pdf.
        var pdf = await k.renderPages([
            buildFormHtml(afac, folio, logos),
            buildInstructivoHtml()
        ]);

        await k.appendMapPage(pdf, afac.ubicacion_lat, afac.ubicacion_lng, folio,
            'Anexo AIFA — Ubicación del impacto con fauna');
        k.appendMapsLinkPage(pdf, afac.ubicacion_lat, afac.ubicacion_lng, 'Ubicacion del impacto');

        return { pdf: pdf, blob: pdf.output('blob') };
    }

    window.MHRAfacPdfRenderer = {
        generate: generate,
        buildFormHtml: buildFormHtml,
        buildInstructivoHtml: buildInstructivoHtml,
        loadLogos: function () { return kit().loadLogos(); }
    };
})();
