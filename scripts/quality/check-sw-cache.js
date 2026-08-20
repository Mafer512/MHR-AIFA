const fs = require('fs');

const sw = fs.readFileSync('sw.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const required = ['./index.html', './js/mhr-utils.js'];
const missing = required.filter((item) => !sw.includes(`'${item}'`) && !sw.includes(`\"${item}\"`));
if (missing.length) {
  console.error('❌ Faltan assets requeridos en SW cache:', missing.join(', '));
  process.exit(1);
}

const requiredUpdateFeatures = ["cache: 'no-store'", 'SKIP_WAITING', 'clients.claim'];
const missingFeatures = requiredUpdateFeatures.filter((feature) => !sw.includes(feature) && !index.includes(feature));
if (missingFeatures.length) {
  console.error('❌ Falta actualización automática PWA:', missingFeatures.join(', '));
  process.exit(1);
}

const swVersion = (sw.match(/APP_VERSION\s*=\s*['\"]([^'\"]+)/) || [])[1];
const pageVersion = (index.match(/PWA_VERSION\s*=\s*['\"]([^'\"]+)/) || [])[1];
if (!swVersion || swVersion !== pageVersion) {
  console.error('❌ La versión PWA de index.html y sw.js no coincide:', pageVersion, swVersion);
  process.exit(1);
}

console.log('✅ Service Worker actualizado:', swVersion, '· assets:', required.join(', '));
