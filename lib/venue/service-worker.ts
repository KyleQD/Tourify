// Service worker for offline support
// This file will be registered as a service worker

// Cache names
const CACHE_NAME = "tourify-cache-v1"
const API_CACHE_NAME = "tourify-api-cache-v1"
const STATIC_CACHE_NAME = "tourify-static-cache-v1"

// Assets to cache
const STATIC_ASSETS = ["/", "/index.html", "/images/tourify-logo.png", "/manifest.json", "/offline.html"]

// Install event
self.addEventListener("install", (event: any) => {
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches
        .open(STATIC_CACHE_NAME)
        .then((cache) => {
          return cache.addAll(STATIC_ASSETS)
        }),

      // Create API cache
      caches.open(API_CACHE_NAME),

      // Create general cache
      caches.open(CACHE_NAME),
    ]).then(() => {
      // Skip waiting to activate the service worker immediately
      return (self as any).skipWaiting()
    }),
  )
})

// Activate event
self.addEventListener("activate", (event: any) => {
  event.waitUntil(
    // Clean up old caches
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name !== CACHE_NAME && name !== API_CACHE_NAME && name !== STATIC_CACHE_NAME
            })
            .map((name) => {
              return caches.delete(name)
            }),
        )
      })
      .then(() => {
        // Claim clients to control all tabs
        return (self as any).clients.claim()
      }),
  )
})

// Helper function to determine if a request is for an API
const isApiRequest = (url: string) => {
  return url.includes("/api/")
}

// Helper function to determine if a request is for a static asset
const isStaticAsset = (url: string) => {
  return (
    url.includes(".js") ||
    url.includes(".css") ||
    url.includes(".png") ||
    url.includes(".jpg") ||
    url.includes(".svg") ||
    url.includes(".ico") ||
    url.includes(".woff") ||
    url.includes(".woff2")
  )
}

// Fetch event
self.addEventListener("fetch", (event: any) => {
  const request = event.request
  const url = new URL(request.url)

  // Skip cross-origin requests
  if (url.origin !== (self as any).location.origin) {
    return
  }

  // Handle API requests
  if (isApiRequest(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response to store in cache
          const responseToCache = response.clone()

          // Only cache successful responses
          if (response.status === 200) {
            caches.open(API_CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache)
            })
          }

          return response
        })
        .catch(() => {
          // If network request fails, try to return from cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse
            }

            // If not in cache, return a generic offline response for API
            return new Response(
              JSON.stringify({
                error: "You are offline and this data is not cached.",
                offline: true,
              }),
              {
                headers: { "Content-Type": "application/json" },
                status: 503,
                statusText: "Service Unavailable",
              },
            )
          })
        }),
    )
    return
  }

  // Handle static assets
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        // Return cached response if available
        if (cachedResponse) {
          // Try to update the cache in the background
          fetch(request)
            .then((response) => {
              if (response.status === 200) {
                caches.open(STATIC_CACHE_NAME).then((cache) => {
                  cache.put(request, response)
                })
              }
            })
            .catch(() => {
              // Ignore errors when updating cache
            })

          return cachedResponse
        }

        // If not in cache, fetch from network and cache
        return fetch(request)
          .then((response) => {
            // Clone the response to store in cache
            const responseToCache = response.clone()

            // Only cache successful responses
            if (response.status === 200) {
              caches.open(STATIC_CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache)
              })
            }

            return response
          })
          .catch(() => {
            // If both cache and network fail, return generic offline page
            return caches.match("/offline.html")
          })
      }),
    )
    return
  }

  // Handle navigation requests (HTML pages)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response to store in cache
          const responseToCache = response.clone()

          // Only cache successful responses
          if (response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache)
            })
          }

          return response
        })
        .catch(() => {
          // If network request fails, try to return from cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse
            }

            // If not in cache, return the offline page
            return caches.match("/offline.html")
          })
        }),
    )
    return
  }

  // Default fetch behavior for other requests
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse
        }

        // If not in cache and not a navigation request, return a simple offline response
        return new Response("Offline", {
          status: 503,
          statusText: "Service Unavailable",
        })
      })
    }),
  )
})

// Handle background sync for offline actions
self.addEventListener("sync", (event: any) => {
  if (event.tag === "sync-messages") {
    event.waitUntil(syncMessages())
  } else if (event.tag === "sync-posts") {
    event.waitUntil(syncPosts())
  }
})

// Sync messages that were sent while offline
async function syncMessages() {
  try {
    // Get all pending messages from IndexedDB
    const db = await openDatabase()
    const pendingMessages = await getAllPendingMessages(db)

    // Send each message
    for (const message of pendingMessages) {
      try {
        const response = await fetch("/api/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(message),
        })

        if (response.ok) {
          // Remove from pending if successful
          await removePendingMessage(db, message.id)
        }
      } catch (error) {
        console.error("Failed to sync message:", error)
      }
    }
  } catch (error) {
    console.error("Error syncing messages:", error)
  }
}

// Sync posts that were created while offline
async function syncPosts() {
  try {
    // Get all pending posts from IndexedDB
    const db = await openDatabase()
    const pendingPosts = await getAllPendingPosts(db)

    // Send each post
    for (const post of pendingPosts) {
      try {
        const response = await fetch("/api/feed/posts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(post),
        })

        if (response.ok) {
          // Remove from pending if successful
          await removePendingPost(db, post.id)
        }
      } catch (error) {
        console.error("Failed to sync post:", error)
      }
    }
  } catch (error) {
    console.error("Error syncing posts:", error)
  }
}

// Open IndexedDB database
function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("tourify-offline-db", 1)

    request.onerror = () => {
      reject(request.error)
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = request.result

      // Create object stores for pending actions
      if (!db.objectStoreNames.contains("pendingMessages")) {
        db.createObjectStore("pendingMessages", { keyPath: "id" })
      }

      if (!db.objectStoreNames.contains("pendingPosts")) {
        db.createObjectStore("pendingPosts", { keyPath: "id" })
      }
    }
  })
}

// Get all pending messages
function getAllPendingMessages(db: IDBDatabase) {
  return new Promise<any[]>((resolve, reject) => {
    const transaction = db.transaction(["pendingMessages"], "readonly")
    const store = transaction.objectStore("pendingMessages")
    const request = store.getAll()

    request.onerror = () => {
      reject(request.error)
    }

    request.onsuccess = () => {
      resolve(request.result)
    }
  })
}

// Remove a pending message
function removePendingMessage(db: IDBDatabase, id: string) {
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(["pendingMessages"], "readwrite")
    const store = transaction.objectStore("pendingMessages")
    const request = store.delete(id)

    request.onerror = () => {
      reject(request.error)
    }

    request.onsuccess = () => {
      resolve()
    }
  })
}

// Get all pending posts
function getAllPendingPosts(db: IDBDatabase) {
  return new Promise<any[]>((resolve, reject) => {
    const transaction = db.transaction(["pendingPosts"], "readonly")
    const store = transaction.objectStore("pendingPosts")
    const request = store.getAll()

    request.onerror = () => {
      reject(request.error)
    }

    request.onsuccess = () => {
      resolve(request.result)
    }
  })
}

// Remove a pending post
function removePendingPost(db: IDBDatabase, id: string) {
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(["pendingPosts"], "readwrite")
    const store = transaction.objectStore("pendingPosts")
    const request = store.delete(id)

    request.onerror = () => {
      reject(request.error)
    }

    request.onsuccess = () => {
      resolve()
    }
  })
}

// Push event for handling notifications
self.addEventListener("push", (event: any) => {
  if (!event.data) return

  try {
    const data = event.data.json()

    const options = {
      body: data.body || "New notification",
      icon: data.icon || "/images/tourify-logo.png",
      badge: data.badge || "/images/notification-badge.png",
      data: data.data || {},
      actions: data.actions || [],
      tag: data.tag || "default",
      renotify: data.renotify || false,
      requireInteraction: data.requireInteraction || false,
      silent: data.silent || false,
    }

    event.waitUntil((self as any).registration.showNotification(data.title || "Tourify", options))
  } catch (error) {
    console.error("Error showing notification:", error)

    // Show a generic notification if parsing fails
    event.waitUntil(
      (self as any).registration.showNotification("Tourify", {
        body: "You have a new notification",
        icon: "/images/tourify-logo.png",
      }),
    )
  }
})

// Notification click event
self.addEventListener("notificationclick", (event: any) => {
  event.notification.close()

  const data = event.notification.data || {}
  const url = data.url || "/"

  event.waitUntil(
    (self as any).clients.matchAll({ type: "window" }).then((clients: any[]) => {
      // If a window is already open, focus it
      for (const client of clients) {
        if (client.url === url && "focus" in client) {
          return client.focus()
        }
      }

      // Otherwise, open a new window
      if ((self as any).clients.openWindow) {
        return (self as any).clients.openWindow(url)
      }
    }),
  )
})
