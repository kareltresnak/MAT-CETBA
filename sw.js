const VERSION = '9.3.2';
const CACHE_NAME = `SPS_Selekce_MAT_CETBY_v${VERSION}`; 

// 🚀 OMEGA FIX: Dynamický Cache-Busting (Obejití HTTP Cache prohlížeče)
const ASSETS_TO_CACHE = [
    './',
    `./index.html?v=${VERSION}`,
    `./style.css?v=${VERSION}`,
    `./style-spspb.css?v=${VERSION}`,
    `./app.js?v=${VERSION}`,
    `./data-spspb.js?v=${VERSION}`,
    './spspb-logo-2000px.png',
    './manifest.json',
    './qrcode.min.js'
];

// Fáze 1: Instalace a nabití Cache
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Přednačítání offline dat');
                return cache.addAll(ASSETS_TO_CACHE);
            })
        // ❌ TOTO SMAŽ: .then(() => self.skipWaiting()) 
        // Nový SW nyní uvízne ve stavu "waiting" a nerozbije aktuální relaci.
    );
});

// Fáze 2: Aktivace a úklid starých verzí
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Mazání staré cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fáze 3: Intercepce sítě (Split Routing Architecture)
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 🛡️ API BYPASS: Service Worker nesmí sahat na Cloudflare Worker!
    if (url.hostname.includes('workers.dev')) {
        return; // SW se do toho nebude plést, nechá to na čisté síti
    }

    // PRAVIDLO A: Databáze kánonu (data-spspb.js) -> NETWORK FIRST
    if (url.pathname.includes('data-spspb.js')) {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    // Mám čerstvá data ze sítě. Uložím novou kopii do cache pro offline použití.
                    const clone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    return networkResponse;
                })
                .catch(() => {
                    // Zařízení je offline (nebo má GitHub výpadek). Vracím poslední známou verzi.
                    return caches.match(event.request);
                })
        );
    } 
    // PRAVIDLO B: Zbytek aplikace (HTML, CSS, JS) -> CACHE FIRST
    else {
        event.respondWith(
            caches.match(event.request, { ignoreSearch: true }) 
                .then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse; // Okamžité načtení z cache
                    }
                    
                    // Fallback: Pokud z nějakého důvodu soubor v cache chybí
                    return fetch(event.request).then((networkResponse) => {
                        // Ochrana před cachováním nesmyslů
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }
                        const clone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                        return networkResponse;
                    });
                })
        );
    }
});

// Fáze 1: Instalace a nabití Cache
self.addEventListener('install', (event) => {
    self.skipWaiting(); // 🚀 OMEGA AGGRESSIVE TAKEOVER: Nečekáme na nic.
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Přednačítání offline dat');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});
