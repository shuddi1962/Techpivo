self.addEventListener("push", (event) => {
  const data = event.data?.json() || {}
  const title = data.title || "Techpivo"
  const options = {
    body: data.body || "New article from Techpivo",
    icon: data.icon || "/icon.png",
    badge: data.badge || "/badge.png",
    data: {
      url: data.url || "/",
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data.url))
})
