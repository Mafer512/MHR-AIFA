const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
const serviceSource = fs.readFileSync(path.join(root, 'js', 'services', 'report-service.js'), 'utf8');
const historialSource = fs.readFileSync(path.join(root, 'js', 'pages', 'historial-so-page.js'), 'utf8');

const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(serviceSource, sandbox, { filename: 'report-service.js' });

const listedFiles = [
  { name: 'report_20260821-011621_1787274985976.pdf', created_at: '2026-08-21T01:16:25Z' },
  { name: 'report_20260821-011621_1787274000000.pdf', created_at: '2026-08-21T01:00:00Z' },
  { name: 'observaciones', created_at: null }
];
let listCalls = 0;
const bucket = {
  async list() {
    listCalls += 1;
    return { data: listedFiles, error: null };
  },
  getPublicUrl(name) {
    return { data: { publicUrl: 'https://storage.example/reports/' + name } };
  }
};
const client = {
  storage: {
    from(name) {
      assert.strictEqual(name, 'reports');
      return bucket;
    }
  }
};

(async () => {
  const reports = [
    { folio: '20260821-011621', pdf_url: null },
    { folio: '20260820-181641', pdf_url: 'https://storage.example/original.pdf' },
    { folio: 'SIN-ARCHIVO', pdf_url: null }
  ];

  const result = await sandbox.window.MHRReportService.recoverMissingReportPdfUrls(client, reports);
  assert.strictEqual(result, reports, 'La recuperación debe conservar la colección original.');
  assert.strictEqual(listCalls, 1, 'El bucket debe listarse una sola vez para esta página.');
  assert.strictEqual(
    reports[0].pdf_url,
    'https://storage.example/reports/report_20260821-011621_1787274985976.pdf',
    'Debe recuperar el archivo más reciente que coincide exactamente con el folio.'
  );
  assert.strictEqual(reports[1].pdf_url, 'https://storage.example/original.pdf', 'Una URL existente nunca debe reemplazarse.');
  assert.strictEqual(reports[2].pdf_url, null, 'Un folio sin archivo no debe recibir una URL inventada.');

  const updateStart = historialSource.indexOf("var updateRes = await client.from('reports').update({");
  const updateEnd = historialSource.indexOf("}).eq('id', reportId);", updateStart);
  assert(updateStart !== -1 && updateEnd !== -1, 'No se encontró la actualización de estatus del historial.');
  const updatePayload = historialSource.slice(updateStart, updateEnd);
  assert(!updatePayload.includes('pdf_url'), 'Cambiar estatus u observación no debe modificar pdf_url.');
  assert(!historialSource.includes('report.pdf_url = null'), 'La caché local tampoco debe borrar el PDF.');

  console.log('OK: editar estatus preserva el PDF y recupera enlaces históricos por folio.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
