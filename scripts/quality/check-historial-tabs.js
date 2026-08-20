const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const historial = fs.readFileSync(path.join(root, 'js', 'pages', 'historial-so-page.js'), 'utf8');

assert(index.includes('id="hso-tab-historial"'), 'Debe conservarse la pestaña Historial de Seguridad Operacional.');
assert(!index.includes('id="hso-tab-datos"'), 'Vista de Datos no debe aparecer en el historial operativo.');
assert(!index.includes('id="hso-panel-datos"'), 'El panel duplicado de datos debe retirarse del DOM.');
assert(!index.includes("hsoSwitchTab('datos')"), 'No debe quedar un acceso a la vista duplicada.');

assert(historial.includes("tab === 'destinatarios'"), 'Debe conservarse la pestaña Destinatarios.');
assert(!historial.includes("getElementById('hso-tab-datos')"), 'El controlador no debe buscar la pestaña eliminada.');
assert(!historial.includes("getElementById('hso-panel-datos')"), 'El controlador no debe intentar mostrar el panel eliminado.');
assert(!historial.includes('_hsoRenderDataView'), 'No debe quedar el renderizador de la vista duplicada.');
assert(!historial.includes('hsoExportExcel'), 'No debe quedar el exportador duplicado.');

// El cambio solicitado corresponde al historial operativo, no al módulo de fauna.
assert(index.includes('id="fh-tab-datos"'), 'La Vista de Datos de fauna debe permanecer sin cambios.');

console.log('OK: Historial operativo conserva solo Historial y Destinatarios.');
