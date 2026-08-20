const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
const html = fs.readFileSync(path.join(root, 'admin-usuarios.html'), 'utf8');
const marker = html.indexOf('var _auDbRows = []');
assert(marker !== -1, 'No se encontró el módulo de Base de Datos del panel admin.');

const scriptStart = html.lastIndexOf('<script>', marker);
const scriptEnd = html.indexOf('</script>', marker);
assert(scriptStart !== -1 && scriptEnd !== -1, 'No se pudo aislar el script de Base de Datos.');

const elements = new Map();
function element(id) {
  if (!elements.has(id)) {
    elements.set(id, {
      id,
      value: '',
      textContent: '',
      innerHTML: '',
      disabled: false,
      style: {},
      className: '',
      focus() {},
      scrollIntoView() {},
      querySelectorAll() { return []; }
    });
  }
  return elements.get(id);
}

global.window = global;
global.document = {
  getElementById: element,
  createElement() { return element('created'); },
  body: { appendChild() {} }
};
global.confirm = () => true;
global.alert = () => {};
global.setTimeout = () => 0;

const rows = [
  { codigo_iata: null, codigo_oaci: 'CVK', nombre_aerolinea: 'CAVOK Air', logo_url: null },
  { codigo_iata: 'AM', codigo_oaci: 'AMX', nombre_aerolinea: 'Aeroméxico', logo_url: null }
];

window.supabaseClient = {
  from() {
    return {
      select() { return this; },
      order() { return Promise.resolve({ data: rows, error: null }); }
    };
  }
};

vm.runInThisContext(html.slice(scriptStart + '<script>'.length, scriptEnd), {
  filename: 'admin-usuarios-inline.js'
});

(async () => {
  await window.auDbLoad();

  const table = element('au-db-tbody').innerHTML;
  assert(!table.includes('Error inesperado'), 'Un IATA nulo todavía rompe el renderizado.');
  assert(table.includes('CAVOK Air'), 'La fila sin IATA debe seguir visible.');
  assert(table.includes('Sin IATA'), 'La fila incompleta debe marcarse de forma explícita.');
  assert(table.includes('auDbEditRowAt(0)'), 'La fila incompleta debe poder abrirse para corrección.');
  assert(table.includes('Aeroméxico'), 'Las filas válidas deben seguir renderizándose.');

  window.auDbEditRowAt(0);
  assert.strictEqual(element('au-db-iata').disabled, false, 'El IATA faltante debe ser editable.');
  assert.strictEqual(element('au-db-oaci').value, 'CVK');
  assert.strictEqual(element('au-db-nombre').value, 'CAVOK Air');
  assert(element('au-db-edit-title').textContent.startsWith('Corregir registro:'), 'Debe distinguirse una corrección de una alta nueva.');

  element('au-db-iata').value = '2Q';
  element('au-db-oaci').value = 'CVK';
  element('au-db-nombre').value = 'CAVOK Air';
  element('au-db-logo').value = '';

  const mutation = { payload: null, filters: [] };
  const mutationBuilder = {
    update(payload) { mutation.payload = payload; return this; },
    is(column, value) { mutation.filters.push(['is', column, value]); return this; },
    eq(column, value) { mutation.filters.push(['eq', column, value]); return this; },
    then(resolve) { return Promise.resolve(resolve({ data: [], error: null })); }
  };
  window.supabaseClient = { from() { return mutationBuilder; } };

  await window.auDbSave();
  assert.strictEqual(mutation.payload.codigo_iata, '2Q', 'La corrección debe guardar el IATA nuevo.');
  assert.deepStrictEqual(mutation.filters, [
    ['is', 'codigo_iata', null],
    ['eq', 'codigo_oaci', 'CVK'],
    ['eq', 'nombre_aerolinea', 'CAVOK Air']
  ], 'La corrección debe limitarse exactamente al registro incompleto original.');

  console.log('OK: Base de Datos tolera y permite corregir aerolíneas sin IATA.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
