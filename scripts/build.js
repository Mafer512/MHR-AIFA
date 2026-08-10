const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
const entries = [
  'index.html',
  'admin-usuarios.html',
  'CREAR_BUCKETS.html',
  'manifest.webmanifest',
  'sw.js',
  'logo.png',
  'favicon-16.png',
  'favicon-32.png',
  'apple-touch-icon.png',
  'airlines.csv',
  'assets',
  'icons',
  'js',
  'Imágenes',
];

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

for (const entry of entries) {
  const source = path.join(root, entry);
  if (!fs.existsSync(source)) continue;
  fs.cpSync(source, path.join(output, entry), { recursive: true });
}

console.log(`Static site generated in ${output}`);
