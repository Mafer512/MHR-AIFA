/* ============================================================================
 * Réplica imprimible de la forma AFAC-SA-FAUNA-A/ene-22
 * "Notificación de Avistamiento de Fauna" — Agencia Federal de Aviación Civil
 *
 * window.MHRAvistamientoPdfRenderer.generate(avi, folio) → Promise<{blob, pdf}>
 * ==========================================================================*/
(function () {
    'use strict';

    var K = null;
    function kit() {
        if (!K) K = window.MHRAfacFormKit;
        return K;
    }

    // Casilla 19 — el formato oficial numera A, B, C, E, F, G (omite la D).
    var ATRAYENTES = [
        ['A', 'A. Vertedero de basura'],
        ['B', 'B. Cuerpo de agua'],
        ['C', 'C. Vegetación'],
        ['E', 'E. Actividades Agrícolas'],
        ['F', 'F. Actividades Comerciales'],
        ['G', 'G. Otro']
    ];

    var RANGOS = ['1', '2-10', '11-100', 'más de 100'];

    /* ── Página 1: la forma oficial ───────────────────────────────────── */

    function buildFormHtml(d, folio, logos) {
        var k = kit();
        var B = k.B, esc = k.esc, box = k.box, fld = k.fld, lbl = k.lbl;
        var row = k.row, cols = k.cols, area = k.area, optCol = k.optCol;

        var atrayentes = d.atrayentes || [];

        var h = '<div style="font-family:Arial,Helvetica,sans-serif;color:#000;">';

        h += k.header(logos, [
            'AGENCIA FEDERAL DE AVIACIÓN CIVIL',
            'DIRECCIÓN EJECUTIVA DE SEGURIDAD AÉREA',
            'NOTIFICACIÓN DE AVISTAMIENTO DE FAUNA'
        ], 'AFAC-SA-FAUNA-A/ene-22');

        h += '<table style="width:100%;border-collapse:collapse;border:' + B + ';table-layout:fixed;"><tbody>';

        // 1-2 (+ AM/PM)
        h += row(cols([
            { html: lbl('1. Fecha del Evento (dd/mm/aaaa):') + ' ' + fld(k.fechaDDMMAAAA(d.fecha_evento)), width: '50%' },
            { html: lbl('2. Hora Local del Evento:') + ' ' + fld(d.hora_evento, '52px'), width: '35%' },
            {
                html: '<div style="line-height:1.6;">' +
                    '<div style="font-size:8.5px;">' + box(d.meridiano === 'AM') + 'AM</div>' +
                    '<div style="font-size:8.5px;">' + box(d.meridiano === 'PM') + 'PM</div></div>',
                width: '15%'
            }
        ]));

        // 3 · Luz solar
        h += row(k.optionsRow('3. Luz solar:', '15%',
            ['Amanecer', 'Día', 'Anochecer', 'Noche'], d.luz_solar, 4));

        // 4-5 (izquierda apilados) · 6 · 7
        h += row(cols([
            {
                html: '<table style="width:100%;border-collapse:collapse;table-layout:fixed;">' +
                    '<tr><td style="padding:4px 6px;font-size:8.5px;border-bottom:' + B + ';">' +
                    lbl('4. Aeródromo:') + ' ' + fld(d.aerodromo, '58px') + '</td></tr>' +
                    '<tr><td style="padding:4px 6px;font-size:8.5px;">' +
                    lbl('5. Altura (AGL):') + ' ' + fld(d.altura_agl, '58px') + '</td></tr></table>',
                width: '28%',
                style: 'padding:0;'
            },
            {
                html: '<table style="width:100%;border-collapse:collapse;table-layout:fixed;"><tr>' +
                    '<td style="width:40%;vertical-align:middle;padding-right:5px;">' +
                    lbl('6. Ubicación en Aeródromo:') + '</td>' +
                    '<td style="vertical-align:middle;">' + area(d.ubicacion_aerodromo, 40) + '</td>' +
                    '</tr></table>',
                width: '40%',
                style: 'vertical-align:middle;'
            },
            {
                html: '<table style="width:100%;border-collapse:collapse;table-layout:fixed;"><tr>' +
                    '<td style="width:38%;vertical-align:middle;padding-right:5px;">' +
                    lbl('7. Ubicación en Ruta:') + '</td>' +
                    '<td style="vertical-align:middle;">' + area(d.ubicacion_ruta, 40) + '</td>' +
                    '</tr></table>',
                width: '32%',
                style: 'vertical-align:middle;'
            }
        ]));

        // 8 · Restos de fauna muerta
        h += row(cols([
            {
                html: '<div>' + lbl('8.¿Se encontraron restos de fauna muerta?') + '</div>' +
                    '<div style="margin-top:6px;padding-left:10px;">' +
                    optCol('Si', d.restos_fauna === true, '46%') +
                    optCol('No', d.restos_fauna === false, '46%') + '</div>',
                width: '46%',
                style: 'vertical-align:middle;'
            },
            {
                html: '<table style="width:100%;border-collapse:collapse;"><tr>' +
                    '<td style="width:34%;text-align:center;font-size:8.5px;vertical-align:middle;">' +
                    'Descripción de los restos:</td>' +
                    '<td style="vertical-align:top;">' + area(d.restos_descripcion, 38) + '</td>' +
                    '</tr></table>',
                width: '54%',
                style: 'padding:4px 6px;'
            }
        ]));

        // 9 · Efectos en la operación
        h += row(cols([
            {
                html: '<div>' + lbl('9.¿Se presentaron efectos en la(s) operación(es)?') + '</div>' +
                    '<div style="margin-top:6px;padding-left:10px;">' +
                    optCol('Si', d.efectos_operacion === true, '46%') +
                    optCol('No', d.efectos_operacion === false, '46%') + '</div>',
                width: '46%',
                style: 'vertical-align:middle;'
            },
            {
                html: '<table style="width:100%;border-collapse:collapse;"><tr>' +
                    '<td style="width:34%;text-align:center;font-size:8.5px;vertical-align:middle;">' +
                    'Descripción de los efectos:</td>' +
                    '<td style="vertical-align:top;">' + area(d.efectos_descripcion, 38) + '</td>' +
                    '</tr></table>',
                width: '54%',
                style: 'padding:4px 6px;'
            }
        ]));

        // 10-13 · Meteorología
        h += row(k.optionsRow('10. Condición del Cielo:', '24%',
            ['Despejado', 'Medio Nublado', 'Nublado'], d.condicion_cielo, 3));
        h += row(k.optionsRow('11. Precipitación:', '18%',
            ['Niebla', 'Lluvia', 'Nieve', 'Ninguna'], d.precipitacion, 4));
        h += row(k.optionsRow('12. Temperatura Ambiente Estimada:', '34%',
            ['Menor a 10°C', 'De 10°C a 20°C', 'Mayor a 20°C'], d.temperatura, 3));
        h += row(k.optionsRow('13. Viento Estimado:', '22%',
            ['Calma (0 kts)', 'Ligero (menor a 3 kts)', 'Moderado (3 a 10 kts)', 'Fuerte (mayor a 10 kts)'],
            d.viento, 4));

        // 14-15
        h += row(cols([
            { html: lbl('14. Especie de Fauna:') + ' ' + fld(d.especie_fauna, '56%'), width: '42%' },
            {
                html: lbl('15. Tamaño del (los) Ejemplar(es):') + ' ' +
                    ['Pequeño(s)', 'Mediano(s)', 'Grande(s)'].map(function (v) {
                        return k.opt(v, d.tamano_ejemplares === v);
                    }).join(''),
                width: '58%'
            }
        ]));

        // 16 · Características de la fauna avistada
        h += row(cols([
            {
                html: '<div style="text-align:center;">' +
                    lbl('16. Características de la Fauna Avistada<br>(en caso de no conocer la especie):') + '</div>',
                width: '32%',
                style: 'vertical-align:middle;'
            },
            { html: area(d.caracteristicas, 40), width: '68%', style: 'vertical-align:top;' }
        ]));

        // 17-18
        var ejemplares = '<div style="padding:4px 6px;">' + lbl('17. Número de Ejemplares Avistados') +
            '<table style="width:100%;border-collapse:collapse;margin-top:6px;table-layout:fixed;">';
        RANGOS.forEach(function (r) {
            ejemplares += '<tr>' +
                '<td style="font-size:8.5px;padding:4px 0 4px 26px;">' + esc(r) + '</td>' +
                '<td style="text-align:center;padding:4px;width:60px;">' + box(d.ejemplares_avistados === r) + '</td>' +
                '</tr>';
        });
        ejemplares += '</table></div>';

        h += row('<table style="width:100%;border-collapse:collapse;table-layout:fixed;"><tr>' +
            '<td style="width:38%;vertical-align:top;border-right:' + B + ';padding:0;">' + ejemplares + '</td>' +
            '<td style="width:20%;padding:4px 6px;text-align:center;vertical-align:middle;">' +
            lbl('18. Descripción del Comportamiento de la Fauna Avistada:') + '</td>' +
            '<td style="width:42%;padding:4px 6px;vertical-align:top;">' + area(d.comportamiento, 92) + '</td>' +
            '</tr></table>');

        // 19 · Probables atrayentes
        var atrayentesHtml = '<table style="width:100%;border-collapse:collapse;table-layout:fixed;"><tr>' +
            '<td style="width:30%;padding:4px 6px;text-align:center;vertical-align:middle;">' +
            lbl('19. Probables Atrayentes de Fauna en la Cercanía:') + '</td>' +
            '<td style="width:70%;padding:4px 6px;vertical-align:middle;">';
        ATRAYENTES.forEach(function (a, i) {
            atrayentesHtml += optCol(a[1], atrayentes.indexOf(a[0]) !== -1, '32%');
            if (i === 2) atrayentesHtml += '<div style="height:5px;"></div>';
        });
        atrayentesHtml += '</td></tr></table>' +
            '<table style="width:100%;border-collapse:collapse;table-layout:fixed;"><tr>' +
            '<td style="width:22%;padding:4px 6px;text-align:right;font-size:8.5px;vertical-align:middle;">' +
            'Descripción de los probables atrayentes:</td>' +
            '<td style="padding:4px 6px;vertical-align:top;">' + area(d.atrayentes_descripcion, 34) + '</td>' +
            '</tr></table>';
        h += row(atrayentesHtml);

        // 20-21
        h += row(cols([
            { html: lbl('20. Reportado por:') + ' ' + fld(d.reportado_por, '62%'), width: '58%' },
            { html: lbl('21. Puesto:') + ' ' + fld(d.puesto, '58%'), width: '42%' }
        ]));

        // 22-23
        h += row(cols([
            { html: lbl('22. Empresa:') + ' ' + fld(d.empresa, '66%'), width: '55%' },
            { html: lbl('23. Fecha del Reporte (dd/mm/aaaa):') + ' ' + fld(k.fechaDDMMAAAA(d.fecha_reporte), '72px'), width: '45%' }
        ]));

        // Nota al pie — el formato de avistamiento no pide copia de acuse
        h += row(k.notaPie(false), true);

        h += '</tbody></table>';
        h += k.pieControl(folio);
        h += '</div>';
        return h;
    }

    /* ── Página 2: instructivo de llenado (texto oficial) ─────────────── */

    var INSTRUCTIVO = [
        ['Casilla 1', 'Anotar la fecha del avistamiento en formato dd/mm/aaaa;'],
        ['Casilla 2', 'Anotar la hora local del avistamiento y seleccionar AM o PM;'],
        ['Casilla 3', 'Seleccionar el momento del día en el que se presentó el avistamiento;'],
        ['Casilla 4', 'Anotar el código OACI del aeródromo en donde se presentó el avistamiento; anotar N/A en caso de no aplicar;'],
        ['Casilla 5', 'Anotar la altura estimada de la fauna observada (en pies); anotar N/A en caso de tratarse de fauna terrestre;'],
        ['Casilla 6', 'Registrar la ubicación aproximada dentro del aeródromo donde se encontró fauna presente; anotar N/A en caso de no aplicar;'],
        ['Casilla 7', 'Especificar la ubicación en ruta donde se presentó el avistamiento, haciendo referencia al contenido de las cartas de navegación aplicables; (Aerovías, radiales, distancia a radioayudas, puntos de reporte, etc.) anotar N/A en caso de no aplicar;'],
        ['Casilla 8', 'Seleccionar si se encontraron restos de fauna muerta y en su caso describirlos;'],
        ['Casilla 9', 'Seleccionar si se presentaron efectos en la(s) operación(es) y en su caso describirlos;'],
        ['Casilla 10', 'Seleccionar la condición del cielo en el momento del avistamiento;'],
        ['Casilla 11', 'Seleccionar el tipo de precipitación presente en el momento del avistamiento;'],
        ['Casilla 12', 'Seleccionar la temperatura ambiente estimada al momento del avistamiento;'],
        ['Casilla 13', 'Seleccionar la velocidad estimada del viento al momento del avistamiento;'],
        ['Casilla 14', 'Anotar la especie del (los) ejemplar(es) de fauna avistado(s);'],
        ['Casilla 15', 'Seleccionar el tamaño del (los) ejemplar(es) de fauna avistado(s) (Pequeño para fauna con una masa corporal menor a 1 kg, Mediano para una masa de entre 1 kg y 5 kg y Grande para una masa mayor a 5 kg.);'],
        ['Casilla 16', 'Seleccionar las características de la fauna avistada en caso de no conocer la especie, en caso contrario anotar N/A.'],
        ['Casilla 17', 'Seleccionar el número de ejemplares avistados;'],
        ['Casilla 18', 'Describir el comportamiento de la fauna avistada;'],
        ['Casilla 19', 'Seleccionar los probables atrayentes de fauna causantes de su presencia y avistamiento; describir los probables atrayentes detectados;'],
        ['Casilla 20', 'Anotar el nombre de la persona que requisita el formulario;'],
        ['Casilla 21', 'Anotar el puesto de la persona que requisita el formulario;'],
        ['Casilla 22', 'Anotar la empresa en donde labora la persona que requisita el formulario;'],
        ['Casilla 23', 'Anotar la fecha en que se llenó el formulario de notificación de impacto.']
    ];

    function buildInstructivoHtml() {
        return kit().instructivoHtml(
            'Instructivo de llenado del formulario de notificación de avistamiento.',
            INSTRUCTIVO
        );
    }

    /* ── Punto de entrada ─────────────────────────────────────────────── */

    async function generate(avi, folio) {
        var k = kit();
        var logos = await k.loadLogos();

        var html = '<div style="width:100%;">' + buildFormHtml(avi, folio, logos) +
            '<div style="page-break-before:always;"></div>' + buildInstructivoHtml() + '</div>';

        var pdf = await k.toPdf(html, 'AFAC-Avistamiento-Fauna-' + folio + '.pdf');

        await k.appendMapPage(pdf, avi.ubicacion_lat, avi.ubicacion_lng, folio,
            'Anexo AIFA — Ubicación del avistamiento de fauna');
        k.appendMapsLinkPage(pdf, avi.ubicacion_lat, avi.ubicacion_lng, 'Ubicacion del avistamiento');

        return { pdf: pdf, blob: pdf.output('blob') };
    }

    window.MHRAvistamientoPdfRenderer = {
        ATRAYENTES: ATRAYENTES,
        generate: generate,
        buildFormHtml: buildFormHtml,
        buildInstructivoHtml: buildInstructivoHtml
    };
})();
