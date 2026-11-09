/* Service worker de Arena Brawl: guarda el juego en caché para que se pueda abrir sin conexión.
   Cuando cambies el juego, sube el número de VERSION para que los dispositivos descarguen la nueva. */
const VERSION = 'arena-brawl-v2';
const ARCHIVOS = [
  './arena.html',
  './manifest.json',
  './iconos/icono-192.png',
  './iconos/icono-512.png',
  './iconos/icono-maskable-192.png',
  './iconos/icono-maskable-512.png',
  './iconos/apple-touch-icon.png',
];

self.addEventListener('install', evento => {
  evento.waitUntil(caches.open(VERSION).then(cache => cache.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches.keys()
      .then(claves => Promise.all(claves.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Responde desde la caché y, de fondo, actualiza la copia con la versión de la red
self.addEventListener('fetch', evento => {
  if (evento.request.method !== 'GET' || new URL(evento.request.url).origin !== self.location.origin) return;
  evento.respondWith(
    caches.match(evento.request, { ignoreSearch: true }).then(enCache => {
      const red = fetch(evento.request).then(respuesta => {
        if (respuesta && respuesta.ok) {
          const copia = respuesta.clone();
          caches.open(VERSION).then(cache => cache.put(evento.request, copia));
        }
        return respuesta;
      }).catch(() => enCache);
      return enCache || red;
    })
  );
});
