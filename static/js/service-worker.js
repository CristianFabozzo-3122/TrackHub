const CACHE_NAME = 'trackhub-v1';
const ASSETS_TO_CACHE = [
    '/static/css/style.css',
    '/static/js/locations.js',
    '/static/js/equipment.js',
    '/static/js/interventions.js',
    '/static/js/edit_equipment.js',
    '/static/js/edit_intervention.js',
    '/static/js/edit_location.js',
    '/static/js/intervention_details.js',
    '/static/js/new_equipment.js',
    '/static/js/new_intervention.js',
    '/static/js/new_location.js',
    '/static/js/new_user.js',
    '/static/js/user_details.js',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js'
];

// 1. INSTALL EVENT: Caches static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching static assets');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// 2. ACTIVATE EVENT: Cleans up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[Service Worker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim();
});

// 3. FETCH EVENT: Network First strategy for dynamic content, Cache First for statics
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests (POST, PUT, DELETE) and API calls from caching logic usually
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // If valid cache found (mostly for static assets), return it
            if (cachedResponse) {
                return cachedResponse;
            }

            // Otherwise, go to network
            return fetch(event.request).then((networkResponse) => {
                return networkResponse;
            }).catch(() => {
                // Ideally, return a fallback "offline.html" page here if network fails
                // return caches.match('/offline.html');
                console.log('Offline and no cache match');
            });
        })
    );
});


