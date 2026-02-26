const CACHE_NAME = 'admin-uj-v1';
const ASSETS = [
    '/admin/',
    '/admin/index.html',
    '/admin/style.css',
    '/admin/app.js',
    '/admin/manifest.json',
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    // Network first for API calls, cache first for static
    if (e.request.url.includes('googleapis.com') || e.request.url.includes('accounts.google.com')) {
        return; // let it pass through
    }
    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request))
    );
});
