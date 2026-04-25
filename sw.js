self.addEventListener('fetch', (event) => {
    // This allows the app to work offline once cached
    event.respondWith(fetch(event.request));
});
