// Auto-versioned: replaced at build time by Vite plugin, or uses timestamp fallback
const CACHE_NAME = 'qrscan-v' + '%%BUILD_HASH%%';

// Shell assets to precache (static files that don't get hashed by Vite)
const SHELL_ASSETS = [
    './',
    './manifest.json',
    './qr-icon.svg',
    './icon-192.svg',
    './icon-512.svg',
];

// Install — precache shell assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
    );
    self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// Fetch — Network first, fallback to cache
self.addEventListener('fetch', (event) => {
    // Skip non-GET and cross-origin API requests
    if (event.request.method !== 'GET') return;

    // Don't cache Google Apps Script API calls
    const url = new URL(event.request.url);
    if (url.hostname.includes('script.google.com') ||
        url.hostname.includes('googleapis.com')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Cache successful same-origin responses
                if (response.ok && response.type === 'basic') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
