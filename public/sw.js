const CACHE_NAME = 'mcb-v1'
const STATIC_ASSETS = [
  '/',
  '/favicon.svg',
  '/favicon.ico',
]

// Install: 预缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activate: 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  )
  self.clients.claim()
})

// Fetch: Network First，回退到缓存
self.addEventListener('fetch', (event) => {
  const { request } = event

  // 只处理 GET请求
  if (request.method !== 'GET') return

  // 跳过 non-GET 和外部请求
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // 静态资源: Cache First
  if (url.pathname.startsWith('/_astro/')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetchAndCache(request))
    )
    return
  }

  // HTML/API: Network First，离线时回退缓存
  event.respondWith(
    fetchAndCache(request).catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
  )
})

async function fetchAndCache(request) {
  const response = await fetch(request)
  if (!response.ok) throw new Error('Network error')
  const cache = await caches.open(CACHE_NAME)
  cache.put(request, response.clone())
  return response
}
