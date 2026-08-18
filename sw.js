const CACHE_NAME = 'mhr-cache-v27';

// Archivos del shell de la app que se cachean al instalar
const SHELL_FILES = [
    './',
    './index.html',
    './manifest.webmanifest',
    './js/mhr-utils.js',
    './logo.png',
    // Logotipos oficiales de las formas AFAC-SA-FAUNA-I y -A/ene-22
    './assets/img/sict-logo.png',
    './assets/img/afac-logo.png',
    './favicon-16.png',
    './favicon-32.png',
    './apple-touch-icon.png',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-192-maskable.png',
    './icons/icon-512-maskable.png',
    // CDN – se pre-cachean para que estén disponibles sin internet
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=Montserrat:wght@400;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
    'https://cdn.jsdelivr.net/npm/@mapbox/togeojson@0.16.2/togeojson.js',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.9.3/html2pdf.bundle.min.js'
];

// ── Instalación: cachear shell ──────────────────────────────────────────────
self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            // Intentar cachear cada archivo individualmente para que un fallo
            // en un CDN no bloquee toda la instalación
            return Promise.allSettled(
                SHELL_FILES.map(function (url) {
                    return cache.add(url).catch(function (err) {
                        console.warn('[SW] No se pudo cachear:', url, err);
                    });
                })
            );
        }).then(function () {
            return self.skipWaiting();
        })
    );
});

// ── Activación: limpiar caches viejos ───────────────────────────────────────
self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(
                keys.filter(function (key) { return key !== CACHE_NAME; })
                    .map(function (key) { return caches.delete(key); })
            );
        }).then(function () {
            return self.clients.claim();
        })
    );
});

// ── Intercepción de fetch: Network-first con fallback a cache ───────────────
self.addEventListener('fetch', function (event) {
    var url = event.request.url;

    // No interceptar peticiones a Supabase API (deben ir al servidor)
    if (url.includes('supabase.co') || url.includes('supabase.io')) return;

    // Para navegación (HTML) y recursos locales: network-first
    event.respondWith(
        fetch(event.request).then(function (response) {
            // Cachear la respuesta fresca
            if (response && response.status === 200) {
                if (!event.request.url.startsWith('http')) return response;
                var clone = response.clone();
                caches.open(CACHE_NAME).then(function (cache) {
                    cache.put(event.request, clone);
                });
            }
            return response;
        }).catch(function () {
            // Sin red: servir desde cache
            return caches.match(event.request).then(function (cached) {
                if (cached) return cached;
                // Si es navegación y no hay cache, devolver index.html
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
                return new Response('Sin conexión y sin caché para este recurso.', { status: 503 });
            });
        })
    );
});
