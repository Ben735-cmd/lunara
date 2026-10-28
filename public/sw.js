// Lunara service worker.
// - Built files (/_next/static) never change for a given URL, so they are
//   served from the cache first. That makes repeat visits load instantly even
//   on a slow connection.
// - Pages and other same-site files try the network first and fall back to the
//   cache when offline.
// - API calls, Supabase and ads are never cached, so user data and signed-in
//   responses are not stored by the service worker.
const CACHE_NAME = "lunara-v6"
const STATIC_ASSETS = ["/", "/manifest.json", "/logo-mark.png"]

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)))
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  )
  self.clients.claim()
})

function isCacheable(request, url) {
  return request.method === "GET" && url.origin === self.location.origin && !url.pathname.startsWith("/api/")
}

self.addEventListener("fetch", (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (!isCacheable(request, url)) return

  const immutable =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/logo-mark.png"

  if (immutable) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
            }
            return response
          })
      )
    )
    return
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        }
        return response
      })
      .catch(() => caches.match(request).then((cached) => cached || Response.error()))
  )
})

// Study session reminders sent from the server.
self.addEventListener("push", (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { title: "Lunara", body: event.data ? event.data.text() : "" } }
  event.waitUntil(
    self.registration.showNotification(data.title || "Lunara", {
      body: data.body || "",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-96x96.png",
      tag: data.tag || "lunara",
      data: { url: data.url || "/" },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || "/"
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const w of windows) {
        if ("focus" in w) return w.focus()
      }
      return self.clients.openWindow(target)
    })
  )
})
