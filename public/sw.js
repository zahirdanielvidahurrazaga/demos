// Service worker de LIMPIEZA. El primer despliegue de este dominio salió del
// repo de Be Fit Lab, que instalaba un service worker de Workbox (PWA). Los
// navegadores que lo visitaron se quedaron con esa versión vieja en caché
// (y con ella, "No se pudo entrar a la demostración: Failed to fetch").
// Este archivo lo reemplaza: borra todos los cachés, se da de baja y recarga
// las pestañas abiertas para que carguen el sitio actual. No quitarlo.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const llaves = await caches.keys();
      await Promise.all(llaves.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const pestanas = await self.clients.matchAll({ type: 'window' });
      pestanas.forEach((p) => p.navigate(p.url));
    })(),
  );
});
