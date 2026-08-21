const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
const managerSource = fs.readFileSync(path.join(root, 'js', 'ui', 'signature-manager.js'), 'utf8');
const clearAllSource = fs.readFileSync(path.join(root, 'js', 'pages', 'clear-all-page.js'), 'utf8');
const padIds = ['area', 'aifa', 'afac', 'fauna_aifa', 'fauna_afac'];

function createContext2d() {
  return {
    clearCalls: 0,
    fillCalls: 0,
    save() {},
    restore() {},
    setTransform() {},
    clearRect() { this.clearCalls += 1; },
    fillRect() { this.fillCalls += 1; },
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    getImageData() { return { data: new Uint8ClampedArray([255, 255, 255, 255]) }; }
  };
}

const canvases = {};
padIds.forEach((id) => {
  const ctx = createContext2d();
  canvases[id] = {
    width: 300,
    height: 120,
    dataset: {},
    context: ctx,
    getContext() { return ctx; },
    addEventListener() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 300, height: 120 }; },
    toDataURL() { return 'data:image/png;base64,firma'; }
  };
});

function createEventTarget() {
  return {
    listeners: {},
    addEventListener(type, handler) { this.listeners[type] = handler; }
  };
}

const reportForm = createEventTarget();
const faunaForm = createEventTarget();
const toggleButton = createEventTarget();
const faunaToggleButton = createEventTarget();
const statuses = {};

const documentMock = {
  readyState: 'complete',
  addEventListener() {},
  querySelector() { return null; },
  getElementById(id) {
    if (id.startsWith('firma-')) return canvases[id.slice('firma-'.length)] || null;
    if (id.startsWith('status-')) {
      statuses[id] = statuses[id] || { style: { display: 'inline-block' } };
      return statuses[id];
    }
    if (id === 'report-form') return reportForm;
    if (id === 'fauna-form') return faunaForm;
    if (id === 'firma-toggle-btn') return toggleButton;
    if (id === 'fauna_firma-toggle-btn') return faunaToggleButton;
    return null;
  }
};

const sandbox = {
  console,
  document: documentMock,
  setTimeout(handler) { handler(); return 1; }
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(managerSource, sandbox, { filename: 'signature-manager.js' });

assert.strictEqual(typeof sandbox.limpiarTodasLasFirmas, 'function');
assert.strictEqual(typeof reportForm.listeners.reset, 'function', 'El reset del reporte debe limpiar sus firmas.');
assert.strictEqual(typeof faunaForm.listeners.reset, 'function', 'El reset de fauna debe limpiar sus firmas.');

padIds.forEach((id) => {
  sandbox.firmaData[id] = 'data:image/png;base64,sensible';
  sandbox.firmaGuardada[id] = true;
});
sandbox.limpiarTodasLasFirmas();
padIds.forEach((id) => {
  assert.strictEqual(sandbox.firmaData[id], null, `${id}: debe borrarse la copia Base64.`);
  assert.strictEqual(sandbox.firmaGuardada[id], false, `${id}: debe reiniciarse el estado guardado.`);
  assert(canvases[id].context.clearCalls > 0, `${id}: debe limpiarse visualmente el canvas.`);
  assert.strictEqual(statuses[`status-${id}`].style.display, 'none');
});

padIds.forEach((id) => {
  sandbox.firmaData[id] = 'firma-nueva';
  sandbox.firmaGuardada[id] = true;
});
reportForm.listeners.reset();
['area', 'aifa', 'afac'].forEach((id) => assert.strictEqual(sandbox.firmaData[id], null));
['fauna_aifa', 'fauna_afac'].forEach((id) => assert.strictEqual(sandbox.firmaData[id], 'firma-nueva'));
faunaForm.listeners.reset();
['fauna_aifa', 'fauna_afac'].forEach((id) => assert.strictEqual(sandbox.firmaData[id], null));

assert(clearAllSource.includes('window.limpiarTodasLasFirmas()'), 'Limpiar todo debe borrar también las firmas.');
console.log('OK: las firmas se eliminan del canvas y de la memoria al limpiar o reiniciar formularios.');
