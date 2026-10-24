# Ejercicio 2: Captura de Medios con Cámara Web / Móvil

Este proyecto implementa la captura de flujo de video en tiempo real desde el hardware del dispositivo (webcam de computadora o cámara de teléfono móvil) y la captura de instantáneas estáticas en un elemento Canvas HTML5.

---

## 🛠️ Tecnologías y APIs Utilizadas

1. **API de Medios (`navigator.mediaDevices.getUserMedia`)**:
   - Petición asíncrona de acceso al hardware de video del usuario.
   - Configuración de restricciones (*constraints*): resolución deseada (`ideal: 1920x1080`, `1280x720`, `640x480`), orientación en móviles (`facingMode: 'user'` para frontal / selfie, o `'environment'` para cámara trasera / principal) y selección de hardware específico (`deviceId`).
   - Detección y enumeración de cámaras conectadas mediante `navigator.mediaDevices.enumerateDevices()`.

2. **Renderizado de Video (`HTMLVideoElement` - `<video>`)**:
   - Conexión del flujo entrante `MediaStream` mediante `video.srcObject = stream`.
   - Reproducción fluida y continua con atributos `autoplay`, `playsinline` y `muted`.
   - Modos visuales: modo espejo (flip horizontal para selfies), rejilla de los tercios y retícula de enfoque.

3. **Captura Estática a Lienzo (`HTMLCanvasElement` - `<canvas>`)**:
   - Congelado instantáneo de fotogramas mediante `CanvasRenderingContext2D.drawImage(video, 0, 0, width, height)`.
   - Dimensionamiento exacto al tamaño nativo del video (`videoWidth` y `videoHeight`).
   - Aplicación de filtros digitales en tiempo real manipulando la matriz de píxeles (`ImageData`):
     - Original
     - Blanco y Negro (Escala de Grises ponderada)
     - Sepia
     - Invertido
     - Alto Contraste
     - Cyberpunk / Neón
   - Exportación de la imagen en formato PNG sin pérdida (`canvas.toDataURL('image/png')` y `canvas.toBlob()`).
   - Opción directa de descarga de archivo y copiado binario al portapapeles del sistema operativo (`navigator.clipboard.write`).

---

## 📁 Estructura de Archivos

```
Act.-2/
├── index.html     # Estructura semántica, visores de video y canvas, controles y alertas
├── style.css      # Sistema de diseño moderno en Dark Mode (Glassmorphism, animaciones)
├── script.js      # Lógica completa de acceso a getUserMedia, renderizado, captura y filtros
├── server.js      # Servidor HTTP local en Node.js (Puerto 3001)
└── README.md      # Documentación técnica y guía de ejecución
```

---

## 🚀 Cómo Ejecutar la Aplicación

### Opción 1: Servidor Local Node.js (Recomendado)

En tu terminal powershell dentro del directorio del proyecto:

```powershell
node "Act.-2/server.js"
```

Abre tu navegador en:
👉 **[http://localhost:3001](http://localhost:3001)**

> **¿Por qué un servidor local?**  
> Los navegadores modernos (Chrome, Firefox, Edge, Safari) requieren por política de seguridad que `getUserMedia` se ejecute en un **Contexto Seguro** (`http://localhost` o `https://`). Si abres un archivo con doble clic (`file:///`), el navegador bloqueará el acceso a la cámara.

---

## 📱 Cómo Probar en Dispositivos Móviles

1. **En la misma red Wi-Fi**:
   - Al iniciar `node "Act.-2/server.js"`, la consola te mostrará la dirección IP local de tu computadora (por ejemplo `http://192.168.1.15:3001`).
   - Nota: Algunos navegadores móviles bloquean la cámara en IPs HTTP no-localhost. Si tu navegador móvil la bloquea:
     - **Opción Chrome DevTools (Android)**: Conecta el teléfono por USB con Depuración USB activa y ejecuta `adb reverse tcp:3001 tcp:3001`. Podrás abrir en el móvil directamente `http://localhost:3001`.
     - **Opción ngrok o túnel HTTPS**: Ejecuta `npx localtunnel --port 3001` para obtener una URL HTTPS instantánea con certificado SSL válida para cualquier móvil.

---

## ⚙️ Características Destacadas

- **Detección inteligente de permisos y errores**:
  - `NotAllowedError`: Mensaje explicativo si el usuario rechaza el acceso.
  - `NotFoundError`: Alerta si no hay cámaras conectadas.
  - `NotReadableError`: Notificación si otra aplicación tiene bloqueada la cámara.
- **Sonido de obturador sintético**: Generado en milisegundos mediante la Web Audio API (sin dependencias ni descargas de archivos externos).
- **Efecto flash visual**: Simulación de flash de cámara al momento exacto de tomar la fotografía.
- **Historial de capturas (Galería)**: Permite revisar capturas anteriores tomadas durante la misma sesión.
