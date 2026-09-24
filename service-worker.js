self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', async () => {
  console.log('Force unregistering obsolete Service Worker...');
  // Force delete all caches
  const keys = await caches.keys();
  for (const key of keys) {
    await caches.delete(key);
  }
  
  // Unregister
  await self.registration.unregister();
  
  // Force reload all open tabs to clear the ghost cache loop
  const clients = await self.clients.matchAll({ type: 'window' });
  for (const client of clients) {
    client.navigate(client.url);
  }
});
