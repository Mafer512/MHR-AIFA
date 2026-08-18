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

        var SUB = 'padding:2px 6px;font-size:8px;line-height:18px;white-space:nowrap;';

        var partesImp = d.partes_impactadas || [];
        var partesDan = d.partes_danadas || [];
        var efecto = d.efecto_operacion || [];

        var h = '<div style="font-family:' + k.FONT + ';color:#000;font-size:' + k.FS.base + 'px;">';

        h += k.header(logos, [
            'AGENCIA FEDERAL DE AVIACIÓN CIVIL',
            'DIRECCIÓN EJECUTIVA DE SEGURIDAD AÉREA',
            'NOTIFICACIÓN DE IMPACTO CON FAUNA'
        ], 'AFAC-SA-FAUNA-I/ene-22');

        // ── Rejilla ──
        h += '<table style="width:100%;border-collapse:collapse;border:' + B + ';table-layout:fixed;"><tbody>';

        // 1-3
        h += row(cols([
            { html: lbl('1. Explotador:') + ' ' + fld(d.explotador, '104px'), width: '30%', style: 'white-space:nowrap;' },
            { html: lbl('2. Marca de Aeronave:') + ' ' + fld(d.marca_aeronave, '86px'), width: '36%', style: 'white-space:nowrap;' },
            { html: lbl('3. Modelo de Aeronave:') + ' ' + fld(d.modelo_aeronave, '86px'), width: '36%', style: 'white-space:nowrap;' }
        ]), false, 24.9);

        // 4-6
        h += row(cols([
            { html: lbl('4. Matrícula:') + ' ' + fld(d.matricula, '108px'), width: '30%', style: 'white-space:nowrap;' },
            { html: lbl('5. Marca de Motor:') + ' ' + fld(d.marca_motor, '96px'), width: '34%', style: 'white-space:nowrap;' },
            { html: lbl('6. Modelo de Motor:') + ' ' + fld(d.modelo_motor, '96px'), width: '36%', style: 'white-space:nowrap;' }
        ]), false, 23.7);

        // 7-8 (+ AM/PM)
        h += row(cols([
            { html: lbl('7. Fecha del Evento (dd/mm/aaaa):') + ' ' + fld(fechaDDMMAAAA(d.fecha_evento)), width: '50%' },
            { html: lbl('8. Hora Local del Evento:') + ' ' + fld(d.hora_evento, '52px'), width: '35%' },
            {
                html: '<div>' +
                    '<div style="font-size:8px;line-height:11px;">' + box(d.meridiano === 'AM') + 'AM</div>' +
                    '<div style="font-size:8px;line-height:11px;">' + box(d.meridiano === 'PM') + 'PM</div></div>',
                width: '15%',
                style: 'padding:1px 6px;line-height:normal;'
            }
        ]), false, 25.0);

        // 9
        h += row(cols([
            { html: lbl('9. Luz solar:'), width: '15%', style: 'line-height:normal;' },
            {
                html: ['Amanecer', 'Día', 'Anochecer', 'Noche'].map(function (v) {
                    return '<span style="display:inline-block;width:24%;font-size:8px;">' +
                        box(d.luz_solar === v) + esc(v) + '</span>';
                }).join(''),
                style: 'line-height:normal;'
            }
        ]), false, 21.3);

        // 10-14 (12 ocupa el alto de dos filas)
        h += row(cols([
            {
                html: '<table style="width:100%;border-collapse:collapse;table-layout:fixed;"><tr>' +
                    '<td style="' + SUB + 'border-bottom:' + B + ';width:47%;">' +
                    lbl('10. Aeródromo:') + ' ' + fld(d.aerodromo, '52px') + '</td>' +
                    '<td style="' + SUB + 'border-bottom:' + B + ';">' +
                    lbl('11. Pista Utilizada:') + ' ' + fld(d.pista_utilizada, '66px') + '</td></tr>' +
                    '<tr><td style="' + SUB + 'width:47%;">' +
                    lbl('13. Altura (AGL):') + ' ' + fld(d.altura_agl, '52px') + '</td>' +
                    '<td style="' + SUB + '">' +
                    lbl('14. Velocidad (IAS):') + ' ' + fld(d.velocidad_ias, '52px') + '</td></tr></table>',
                width: '62%',
                divider: true,
                style: 'padding:0;'
            },
            {
                html: '<table style="width:100%;border-collapse:collapse;table-layout:fixed;"><tr>' +
                    '<td style="width:33%;vertical-align:middle;padding-right:4px;">' +
                    lbl('12. Ubicación<br>en Ruta:') + '</td>' +
                    '<td style="vertical-align:middle;">' + k.area(d.ubicacion_ruta, 30) + '</td>' +
                    '</tr></table>',
                width: '38%',
                style: 'vertical-align:middle;padding:3px 6px;'
            }
        ]), false, 48.0);

        // 15
        h += row('<div style="padding:2px 6px;">' + lbl('15. Fase de la operación:') +
            '<div style="margin-top:4px;">' +
            FASES.map(function (f) {
                return '<span style="display:inline-block;width:24%;font-size:8px;padding:2px 0;">' +
                    box(d.fase_operacion === f) + esc(f) + '</span>';
            }).join('') + '</div></div>', false, 51.7);

        // 16
        var partesRows = '';
        for (var i = 0; i < PARTES_IZQ.length; i++) {
            var L = PARTES_IZQ[i], R = PARTES_DER[i];
            partesRows += '<tr>' +
                '<td style="font-size:8px;padding:2px 4px 2px 14px;">' + L[0] + '. &nbsp;' + esc(L[1]) + '</td>' +
                '<td style="text-align:center;padding:2px;">' + box(partesImp.indexOf(L[0]) !== -1) + '</td>' +
                '<td style="text-align:center;padding:2px;">' + box(partesDan.indexOf(L[0]) !== -1) + '</td>' +
                '<td style="font-size:8px;padding:2px 4px 2px 14px;">' + R[0] + '. &nbsp;' + esc(R[1]) + '</td>' +
                '<td style="text-align:center;padding:2px;">' + box(partesImp.indexOf(R[0]) !== -1) + '</td>' +
                '<td style="text-align:center;padding:2px;">' + box(partesDan.indexOf(R[0]) !== -1) + '</td>' +
                '</tr>';
        }
        var partesHead = '<tr>' +
            '<td></td>' +
            '<td style="font-size:7px;text-align:center;padding:1px;">Impactada</td>' +
            '<td style="font-size:7px;text-align:center;padding:1px;">Dañada</td>' +
            '<td></td>' +
            '<td style="font-size:7px;text-align:center;padding:1px;">Impactada</td>' +
            '<td style="font-size:7px;text-align:center;padding:1px;">Dañada</td>' +
            '</tr>';
        h += row('<div style="padding:4px 6px 2px;">' + lbl('16. Partes Impactadas o Dañadas') + '</div>' +
            '<table style="width:100%;border-collapse:collapse;table-layout:fixed;">' +
            '<colgroup><col style="width:29%"><col style="width:10%"><col style="width:11%">' +
            '<col style="width:29%"><col style="width:10%"><col style="width:11%"></colgroup>' +
            partesHead + partesRows + '</table>' +
            '<div style="padding:4px 6px 5px;">' + lbl('Otro (describir):') + ' ' +
            fld(d.partes_otro, '78%') + '</div>', false, 167.0);

        // 17
        h += row('<div style="padding:2px 6px;">' + lbl('17. Efecto en la Operación:') +
            '<div style="margin-top:4px;">' +
            ['Ninguno', 'Despegue Descontinuado', 'Aterrizaje Precautorio', 'Paro de Motor', 'Otro'].map(function (v) {
                return opt(v, efecto.indexOf(v) !== -1);
            }).join('') + '</div>' +
            '<div style="margin-top:5px;">' + lbl('Otro (describir):') + ' ' + fld(d.efecto_otro, '78%') + '</div></div>', false, 62.5);

        // 18
        h += row(cols([
            { style: 'line-height:normal;', html: lbl('18. Condición del Cielo:'), width: '24%' },
            {
                html: ['Despejado', 'Medio Nublado', 'Nublado'].map(function (v) {
                    return '<span style="display:inline-block;width:32%;font-size:8px;">' +
                        box(d.condicion_cielo === v) + esc(v) + '</span>';
                }).join(''),
                style: 'line-height:normal;'
            }
        ]), false, 19.9);

        // 19
        h += row(cols([
            { style: 'line-height:normal;', html: lbl('19. Precipitación:'), width: '18%' },
            {
                html: ['Niebla', 'Lluvia', 'Nieve', 'Ninguna'].map(function (v) {
                    return '<span style="display:inline-block;width:24%;font-size:8px;">' +
                        box(d.precipitacion === v) + esc(v) + '</span>';
                }).join(''),
                style: 'line-height:normal;'
            }
        ]), false, 19.9);

        // 20-21
        h += row(cols([
            { html: lbl('20. Especie de Fauna:') + ' ' + fld(d.especie_fauna, '97px'), width: '34%', style: 'white-space:nowrap;' },
            {
                html: lbl('21. Tamaño del (los) Ejemplar(es):') + ' ' +
                    ['Pequeño(s)', 'Mediano(s)', 'Grande(s)'].map(function (v) {
                        return opt(v, d.tamano_ejemplares === v);
                    }).join(''),
                width: '64%',
                style: 'white-space:nowrap;'
            }
        ]), false, 25.2);

        // 22 · 23 · 24
        var ejemplares = '<div style="padding:2px 6px;">' + lbl('22. Número de Ejemplares') +
            '<table style="width:100%;border-collapse:collapse;margin-top:3px;table-layout:fixed;">' +
            '<tr><td></td>' +
            '<td style="font-size:7px;text-align:center;">Avistados</td>' +
            '<td style="font-size:7px;text-align:center;">Impactados</td></tr>';
        RANGOS.forEach(function (r) {
            ejemplares += '<tr>' +
                '<td style="font-size:8px;padding:1px 0 1px 16px;">' + esc(r) + '</td>' +
                '<td style="text-align:center;padding:1px;">' + box(d.ejemplares_avistados === r) + '</td>' +
                '<td style="text-align:center;padding:1px;">' + box(d.ejemplares_impactados === r) + '</td>' +
                '</tr>';
        });
        ejemplares += '</table></div>';

        var advertido = '<div style="padding:2px 6px;border-bottom:' + B + ';">' +
            lbl('23. El Piloto fue Advertido sobre la Presencia de Fauna:') +
            '<span style="margin-left:10px;">' + opt('SI', d.piloto_advertido === true) +
            opt('NO', d.piloto_advertido === false) + '</span></div>' +
            '<div style="padding:2px 6px;border-bottom:' + B + ';font-size:8px;">' +
            'Si la respuesta es si, ¿Quién advrtió al piloto?: ' + fld(d.piloto_advertido_por, '46%') + '</div>' +
            '<table style="width:100%;border-collapse:collapse;table-layout:fixed;"><tr>' +
            '<td style="width:32%;padding:2px 6px;text-align:center;font-size:8px;font-weight:700;vertical-align:middle;line-height:normal;">' +
            '24. Observaciones (describir daños, lesiones u otra información pertinente)</td>' +
            '<td style="padding:4px 6px;vertical-align:top;">' +
            k.area(d.observaciones, 26) + '</td></tr></table>';

        h += row('<table style="width:100%;border-collapse:collapse;table-layout:fixed;"><tr>' +
            '<td style="width:38%;vertical-align:top;border-right:' + B + ';padding:0;">' + ejemplares + '</td>' +
            '<td style="width:62%;vertical-align:top;padding:0;">' + advertido + '</td>' +
            '</tr></table>', false, 93.7);

        // 25-26
        h += row(cols([
            { html: lbl('25. Reportado por:') + ' ' + fld(d.reportado_por, '62%'), width: '58%' },
            { html: lbl('26. Puesto:') + ' ' + fld(d.puesto, '58%'), width: '42%' }
        ]), false, 25.0);

        // 27-28
        h += row(cols([
            { html: lbl('27. Empresa:') + ' ' + fld(d.empresa, '66%'), width: '55%' },
            { html: lbl('28. Fecha del Reporte (dd/mm/aaaa):') + ' ' + fld(fechaDDMMAAAA(d.fecha_reporte), '72px'), width: '45%' }
        ]), false, 23.5);

        // Nota al pie (texto oficial; el de impacto pide copia de acuse)
        h += row(k.notaPie(true), true, 70.2);

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
