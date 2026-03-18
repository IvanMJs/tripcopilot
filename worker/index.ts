/// <reference lib="webworker" />
export {};
declare const self: ServiceWorkerGlobalScope;

// ── Push event: show notification ────────────────────────────────────────────
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title: string = data.title ?? "TripCopilot";
  const options: NotificationOptions = {
    body: data.body ?? "",
    icon: "/icon.svg",
    badge: "/icon.svg",
    tag: data.tag ?? "tripcopilot",
    data: { url: data.url ?? "/app" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click: focus or open the app ────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url: string = event.notification.data?.url ?? "/app";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes("/app") && "focus" in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      }),
  );
});
