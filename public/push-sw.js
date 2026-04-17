// Push notification handlers for TripCopilot PWA

self.addEventListener("push", function (event) {
  var data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {}
  var title = data.title || "TripCopilot";
  var options = {
    body: data.body || "",
    icon: "/icon.svg",
    badge: "/icon.svg",
    tag: data.tag || "tripcopilot",
    data: { url: data.url || "/app" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || "/app";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clients) {
        // Find an existing /app window to navigate
        for (var i = 0; i < clients.length; i++) {
          if (clients[i].url.indexOf("/app") !== -1 && "focus" in clients[i]) {
            if ("navigate" in clients[i]) {
              return clients[i].navigate(url).then(function (c) { return c ? c.focus() : null; });
            }
            return clients[i].focus();
          }
        }
        return self.clients.openWindow(url);
      })
  );
});
