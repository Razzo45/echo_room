self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    return;
  }

  if (data.type !== 'room_ready') {
    return;
  }

  const title = 'Your Echo Room is ready';
  const options = {
    body: `${data.questName} in ${data.eventName} now has enough people to start.`,
    data: {
      roomId: data.roomId,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const roomId = event.notification && event.notification.data && event.notification.data.roomId;
  if (!roomId) {
    return;
  }

  const url = `/room/${roomId}/play`;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

