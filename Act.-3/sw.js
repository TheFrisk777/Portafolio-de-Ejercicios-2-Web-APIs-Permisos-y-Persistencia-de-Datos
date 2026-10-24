/**
 * Service Worker: sw.js
 * Ejercicio 3: Notificaciones Push Locales con Service Worker
 * 
 * Implementa el ciclo de vida del Service Worker y el disparo de notificaciones
 * locales mediante self.registration.showNotification(title, options) con soporte
 * de título, cuerpo, icono personalizado, badge, patrón de vibración y acciones interactivas.
 */

const SW_VERSION = 'v1.0.2';
console.log(`[Service Worker] Inicializando versión ${SW_VERSION}`);

// 1. Evento 'install': se activa inmediatamente al descargarse el Service Worker
self.addEventListener('install', (event) => {
  console.log(`[Service Worker ${SW_VERSION}] Instalado exitosamente.`);
  // Forzar activación inmediata saltando la fase de espera ('waiting')
  self.skipWaiting();
});

// 2. Evento 'activate': toma control de todos los clientes abiertos de forma instantánea
self.addEventListener('activate', (event) => {
  console.log(`[Service Worker ${SW_VERSION}] Activado y tomando control.`);
  // Reclamar inmediatamente a todos los clientes bajo el alcance (scope)
  event.waitUntil(self.clients.claim());
});

// 3. Evento 'message': canal de comunicación bidireccional desde la página cliente (script.js)
// Aquí se ejecuta el disparo de la notificación local a través de self.registration.showNotification
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Mensaje recibido desde cliente:', event.data);

  if (!event.data) return;

  const { type, title, options, delayMs } = event.data;

  if (type === 'SHOW_NOTIFICATION') {
    // Si viene con retraso (timer / segundo plano)
    const showNotificationNow = () => {
      // self.registration.showNotification: Disparo de la notificación local desde el SW
      return self.registration.showNotification(title || 'Notificación Local', options)
        .then(() => {
          console.log('[Service Worker] self.registration.showNotification ejecutado correctamente.');
          // Informar a todas las pestañas/clientes que la notificación fue emitida
          return broadcastToClients({
            type: 'NOTIFICATION_DISPATCHED',
            title: title,
            tag: options.tag,
            vibrate: options.vibrate,
            timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          });
        })
        .catch((err) => {
          console.error('[Service Worker] Error al invocar self.registration.showNotification:', err);
          return broadcastToClients({
            type: 'NOTIFICATION_ERROR',
            error: err.message || err.toString(),
            timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          });
        });
    };

    if (delayMs && delayMs > 0) {
      setTimeout(() => {
        event.waitUntil(showNotificationNow());
      }, delayMs);
    } else {
      event.waitUntil(showNotificationNow());
    }
  } else if (type === 'PING') {
    if (event.source) {
      event.source.postMessage({
        type: 'PONG',
        version: SW_VERSION,
        timestamp: Date.now()
      });
    }
  }
});

// 4. Evento 'notificationclick': captura la interacción cuando el usuario hace clic en la notificación o sus botones
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Evento notificationclick recibido. Acción:', event.action, 'Tag:', event.notification.tag);
  
  // Cerrar la notificación al pulsarla
  event.notification.close();

  const action = event.action;
  const notifData = event.notification.data || {};
  const targetUrl = notifData.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 1. Informar a los clientes web de la acción pulsada
      windowClients.forEach((client) => {
        client.postMessage({
          type: 'NOTIFICATION_CLICKED',
          action: action || 'default_click',
          title: event.notification.title,
          tag: event.notification.tag,
          timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        });
      });

      // 2. Traer al frente la ventana del navegador existente si ya está abierta
      for (let client of windowClients) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          return client.focus();
        }
      }

      // 3. Si no hay ventana abierta, abrir la URL en una nueva pestaña
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// 5. Evento 'notificationclose': detecta cuando el usuario descarta/desliza la notificación
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Evento notificationclose: Notificación descartada por el usuario.', event.notification.tag);
  
  event.waitUntil(
    broadcastToClients({
      type: 'NOTIFICATION_DISMISSED',
      title: event.notification.title,
      tag: event.notification.tag,
      timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    })
  );
});

// 6. Soporte para eventos Push simulados o de servidor
self.addEventListener('push', (event) => {
  let data = {
    title: '🔔 Notificación Push Entrante',
    body: 'Mensaje recibido mediante evento push en segundo plano.',
    icon: 'icons/icon-192.png',
    badge: 'icons/badge-72.png',
    vibrate: [200, 100, 200]
  };

  if (event.data) {
    try {
      data = Object.assign(data, event.data.json());
    } catch (e) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, data)
  );
});

// Función auxiliar para emitir mensajes a todos los clientes asociados
function broadcastToClients(message) {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    clients.forEach((client) => {
      client.postMessage(message);
    });
  });
}
