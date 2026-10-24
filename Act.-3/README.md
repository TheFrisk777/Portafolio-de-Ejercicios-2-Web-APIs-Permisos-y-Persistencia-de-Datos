# Ejercicio 3: Notificaciones Push Locales con Service Worker

Este proyecto implementa un sistema interactivo de **Notificaciones Push Locales** ejecutadas desde el contexto del **Service Worker**, con solicitud explícita de permisos al usuario (`Notification.requestPermission`) y personalización completa de alertas nativas (título, cuerpo, icono, badge, patrón de vibración y botones de acción).

---

## 🛠️ Tecnologías y APIs Utilizadas

1. **API de Notificaciones (`Notification.requestPermission`)**:
   - Solicitud asíncrona de permisos de notificación al usuario.
   - Manejo de los 3 estados del navegador:
     - `'default'`: Permiso pendiente o nunca solicitado.
     - `'granted'`: Permiso otorgado; la aplicación puede desplegar notificaciones en el sistema operativo.
     - `'denied'`: Permiso bloqueado; el usuario o el navegador denegaron el acceso.

2. **Service Worker (`sw.js`)**:
   - Registro con alcance local mediante `navigator.serviceWorker.register('sw.js')`.
   - Control inmediato del ciclo de vida (`self.skipWaiting()` en `install` y `self.clients.claim()` en `activate`).
   - Canal bidireccional de mensajería (`postMessage` y evento `message`) entre el cliente y el Service Worker.

3. **Disparo de Notificaciones Locales (`self.registration.showNotification`)**:
   - Ejecutado directamente dentro del Service Worker al recibir el evento de disparo.
   - Parámetros soportados:
     - `title`: Título visible en el banner nativo del sistema operativo.
     - `options.body`: Descripción o contenido del mensaje.
     - `options.icon`: Imagen principal de la notificación (iconos PNG de 192x192).
     - `options.badge`: Icono monocromático pequeño (72x72) para la barra de estado o bandeja del sistema.
     - `options.vibrate`: Patrón háptico en milisegundos en formato array (ej. `[200, 100, 200]`).
     - `options.tag`: Identificador único para agrupar o reemplazar notificaciones previas.
     - `options.renotify`: Indica si debe reproducir alerta o vibración al reemplazar una existente.
     - `options.requireInteraction`: Mantiene la notificación visible hasta que el usuario interactúe.
     - `options.actions`: Botones de acción directa embebidos en la notificación.

4. **Eventos del Service Worker (`notificationclick` y `notificationclose`)**:
   - Captura del clic del usuario sobre la notificación o sus botones de acción.
   - Foco automático de la pestaña del navegador activa (`client.focus()`) o apertura de la URL (`clients.openWindow()`).
   - Envío de confirmación de interacción a la consola en tiempo real.

5. **Audio Háptico y Motor de Vibración (`navigator.vibrate` & Web Audio API)**:
   - Simulación sonora mediante sintetizador de osciladores armónicos nativo en escritorio.
   - Activación del motor de vibración real en dispositivos móviles y navegadores compatibles.

---

## 📁 Estructura de Archivos

```
Act.-3/
├── index.html           # Interfaz de usuario, diagnóstico, maquetas y controles
├── style.css            # Sistema de diseño moderno en Dark Mode (Glassmorphism)
├── script.js            # Lógica cliente, permisos, eventos y comunicación con el SW
├── sw.js                # Service Worker: showNotification, lifecycle, clics
├── server.js            # Servidor HTTP local en Node.js (Puerto 3002)
├── generate-icons.js    # Generador automatizado de iconos PNG sin dependencias
├── icons/               # Iconos para notificaciones
│   ├── icon-192.png     # Icono estándar (Campana)
│   ├── badge-72.png     # Badge para barra de estado
│   ├── urgent.png       # Icono de alerta roja
│   └── success.png      # Icono de éxito verde
└── README.md            # Documentación técnica completa
```

---

## 🚀 Cómo Ejecutar la Aplicación

> [!IMPORTANT]
> **¿Por qué se requiere un servidor HTTP local?**  
> Los Service Workers y la API de Notificaciones exigen un **Contexto Seguro** (*Secure Context*). Si abres el archivo como `file:///.../index.html`, los navegadores bloquean el registro del Service Worker por razones de seguridad. `localhost` y `127.0.0.1` están exentos y permiten la ejecución completa.

### Opción 1: Servidor Local Node.js Incluido (Recomendado)

Abre tu terminal en la raíz del proyecto y ejecuta:

```powershell
node "Act.-3/server.js"
```

Abre tu navegador en:
👉 **[http://localhost:3002](http://localhost:3002)**

---

### Opción 2: Extensión Live Server de VS Code

1. Haz clic derecho sobre `Act.-3/index.html`.
2. Selecciona **Open with Live Server**.
3. Asegúrate de acceder mediante `http://localhost:5500/Act.-3/index.html` o similar.

---

## 🧪 Guía de Pruebas Paso a Paso

1. **Verificar Diagnóstico Inicial**:
   - Observa la barra de estado superior: el Service Worker debe marcar **Activo** y los permisos deben figurar en **Pendiente**.
2. **Otorgar Permisos**:
   - Haz clic en el botón pulsante **"Solicitar Permiso"**.
   - En el cuadro de diálogo emergente del navegador, haz clic en **"Permitir"**.
   - El banner cambiará inmediatamente a verde (*Permiso Activo*).
3. **Seleccionar o Crear una Notificación**:
   - Usa una plantilla rápida (*Recordatorio, Alerta Urgente, Tarea Completada, Mensaje Nuevo*) o edita libremente el título, cuerpo, icono y patrón de vibración.
   - Observa la tarjeta de **Vista Previa en Vivo** actualizándose al instante.
4. **Disparar Notificación Inmediata**:
   - Pulsa **"Disparar Notificación (Vía SW)"**.
   - Verás la notificación nativa del sistema operativo emerger en la esquina de tu pantalla.
   - La **Consola de Eventos en Tiempo Real** registrará la confirmación del Service Worker.
5. **Probar en Segundo Plano (Pestaña Minimizada)**:
   - Haz clic en **"Probar en 4 Segundos (Segundo Plano)"**.
   - Minimiza tu navegador o cámbiate a otra aplicación.
   - Pasados los 4 segundos, el Service Worker emitirá la notificación en tu sistema operativo como un push real.
6. **Interacción y Clic**:
   - Haz clic sobre la notificación nativa emergente: tu navegador se abrirá y traerá la aplicación al frente automáticamente.

---

## ℹ️ Consideraciones del Sistema Operativo

- **Windows 10 / 11**: Si no ves las notificaciones, verifica que el **Asistente de concentración** (*Focus Assist* o modo *No Molestar*) esté desactivado, y que las notificaciones de Google Chrome / Edge estén permitidas en `Configuración de Windows > Sistema > Notificaciones`.
- **Vibración Física**: Los navegadores de escritorio no cuentan con motor de vibración física por hardware; la aplicación simula el aviso mediante efectos de sonido polifónicos creados con la **Web Audio API**. En dispositivos móviles (Android), la vibración `vibrate: [200, 100, 200]` activa el motor físico háptico del teléfono.
