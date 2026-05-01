const CACHE_NAME = 'postbrain-v1'
const OFFLINE_URL = '/offline'

const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/ideas',
  '/write',
  '/offline',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  // Skip non-GET and API requests
  if (event.request.method !== 'GET') return
  if (event.request.url.includes('/api/')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
        }
        return response
      })
      .catch(() => {
        // Return cached version or offline page
        return caches.match(event.request).then((cached) => {
          return cached || caches.match(OFFLINE_URL)
        })
      })
  )
})

// Background sync for offline idea capture
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-ideas') {
    event.waitUntil(syncOfflineIdeas())
  }
})

async function syncOfflineIdeas() {
  // This would sync offline ideas when back online
  // Implementation depends on IndexedDB setup
  console.log('Syncing offline ideas...')
}