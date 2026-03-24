// Kill-switch service worker v1.0.6
self.addEventListener('install', (event) => {
  console.log("Kill-switch SW Installing...");
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log("Kill-switch SW Activating...");
  event.waitUntil(
    self.registration.unregister()
      .then(() => {
        console.log("Kill-switch SW Unregistered successfully.");
        return self.clients.matchAll();
      })
      .then((clients) => {
        clients.forEach((client) => {
          if (client.url && 'navigate' in client) {
            client.navigate(client.url);
          }
        });
      })
  );
});

// No fetch listener to allow all requests to pass through
