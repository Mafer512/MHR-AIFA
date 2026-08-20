const APP_VERSION = '20260820.2';
const CACHE_PREFIX = 'mhr-cache-';
const CACHE_NAME = CACHE_PREFIX + APP_VERSION;

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
            // Los archivos locales se solicitan con recarga forzada para que
            // el nuevo caché nunca nazca con una respuesta HTTP antigua.
            return Promise.allSettled(
                SHELL_FILES.map(function (url) {
                    var isLocal = url.indexOf('http') !== 0;
                    var options = isLocal ? { cache: 'reload' } : undefined;
                    return fetch(url, options).then(function (response) {
                        if (!response || (!response.ok && response.type !== 'opaque')) {
                            throw new Error('Respuesta no válida para ' + url);
                        }
                        return cache.put(url, response.clone());
                    }).catch(function (err) {
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
                keys.filter(function (key) {
                    return key.indexOf(CACHE_PREFIX) === 0 && key !== CACHE_NAME;
                })
                    .map(function (key) { return caches.delete(key); })
            );
        }).then(function () {
            return self.clients.claim();
        }).then(function () {
            return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        }).then(function (clients) {
            clients.forEach(function (client) {
                client.postMessage({ type: 'MHR_APP_UPDATED', version: APP_VERSION });
            });
        })
    );
});

// Permite que la página active inmediatamente una actualización descargada.
self.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// ── Intercepción de fetch: Network-first con fallback a cache ───────────────
self.addEventListener('fetch', function (event) {
    if (event.request.method !== 'GET') return;

    var url = event.request.url;

    // No interceptar peticiones a Supabase API (deben ir al servidor)
    if (url.includes('supabase.co') || url.includes('supabase.io')) return;

    // Para navegación (HTML) y recursos locales: network-first, omitiendo
    // también el caché HTTP del navegador. El Cache Storage queda únicamente
    // como respaldo cuando no hay conexión.
    var requestUrl = new URL(url);
    var isLocal = requestUrl.origin === self.location.origin;
    var networkRequest = event.request;
    if (isLocal) {
        try {
            networkRequest = new Request(event.request, { cache: 'no-store' });
        } catch (e) {
            networkRequest = event.request;
        }
    }

    event.respondWith(
        fetch(networkRequest).then(function (response) {
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
