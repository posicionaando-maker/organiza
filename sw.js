// sw.js - Con versionado forzado
const CACHE_VERSION = 'v2';  // ¡Cambia el número!
const CACHE_NAME = `organiza-${CACHE_VERSION}`;
const BASE_PATH = '/organiza/';

// Lista de archivos a cachear
const urlsToCache = [
    BASE_PATH,
    BASE_PATH + 'index.html',
    BASE_PATH + 'styles.css',
    BASE_PATH + 'app.js',
    BASE_PATH + 'manifest.json',
];

// Añadir iconos solo si existen
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
iconSizes.forEach(size => {
    urlsToCache.push(BASE_PATH + `icons/icon-${size}x${size}.png`);
});

// Instalación - ahora con más control
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log(`Cache ${CACHE_NAME} abierta`);
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('Instalación completa, activando nuevo SW');
                return self.skipWaiting(); // Activa inmediatamente
            })
            .catch(error => {
                console.error('Error en instalación:', error);
            })
    );
});

// Activación - limpieza automática de cachés viejas
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        // Eliminar cualquier caché que no sea la actual
                        if (cacheName !== CACHE_NAME) {
                            console.log('Eliminando caché antigua:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('SW activado y cachés limpiadas');
                return self.clients.claim(); // Controla las páginas abiertas
            })
    );
});

// Estrategia de fetch mejorada
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request)
                    .then(response => {
                        if (!response || response.status !== 200) {
                            return response;
                        }
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                try {
                                    cache.put(event.request, responseToCache);
                                } catch (e) {
                                    console.warn('No se pudo cachear:', event.request.url);
                                }
                            });
                        return response;
                    })
                    .catch(() => {
                        return new Response('Offline', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});
