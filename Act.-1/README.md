# Actividad 1 - Ejercicio 1: Permisos y Geolocalización GPS

Este proyecto implementa una aplicación web moderna para consultar y gestionar el estado de los permisos del navegador mediante la **Permissions API** (`navigator.permissions.query`) y obtener coordenadas satelitales en tiempo real mediante la **Geolocation API** (`navigator.geolocation.getCurrentPosition` y `watchPosition`), representándolas tanto en texto detallado como en un **mapa interactivo** con Leaflet.

---

## 🚀 Características Principales

1. **Permissions API (`navigator.permissions.query`)**:
   - Consulta el estado de autorización de geolocalización sin disparar avisos molestos (`'granted'`, `'prompt'`, `'denied'`).
   - Escucha reactiva de eventos `onchange`: Si el usuario cambia la configuración de permisos del navegador, la interfaz se actualiza al instante.
   - Diagnóstico adicional de otros permisos como notificaciones, cámara y micrófono.

2. **Geolocation API (`navigator.geolocation`)**:
   - **`getCurrentPosition(success, error, options)`**: Obtiene las coordenadas actuales (latitud, longitud, altitud, precisión, rumbo, velocidad).
   - **`watchPosition` / `clearWatch`**: Permite activar y desactivar el rastreo dinámico continuo.
   - Opción configurable de **alta precisión** (`enableHighAccuracy`) para forzar el uso del chip GPS en dispositivos compatibles.

3. **Mapa Interactivo con Leaflet & OpenStreetMap**:
   - Renderiza un mapa interactivo centrado en la posición detectada.
   - Marcador con popup informativo que resume las coordenadas.
   - Círculo de radio translúcido que ilustra el margen de error / precisión en metros (`accuracy`).
   - Botón directo para abrir las coordenadas en Google Maps.

4. **Terminal de Logs en Pantalla**:
   - Muestra paso a paso las llamadas a las APIs, respuestas y estados de error controlados (`PERMISSION_DENIED`, `POSITION_UNAVAILABLE`, `TIMEOUT`).

---

## 🛠️ Cómo Ejecutar

> **Nota Importante:** Por motivos de seguridad web, la Geolocation API y Permissions API funcionan preferentemente en contextos seguros (`https://` o `http://localhost`).

### Opción 1: Servidor Local con Node.js (Recomendado)
Abre una terminal en la carpeta `Act.-1` y ejecuta:
```bash
node server.js
```
Luego abre tu navegador en:
```
http://localhost:3000
```

### Opción 2: Abrir directamente
Puedes abrir directamente el archivo [index.html](file:///c:/Users/thefr/OneDrive/Documentos/Visual%202/Act.-1/index.html) con tu navegador preferido o utilizando la extensión Live Server de VS Code.

---

## 📂 Estructura de Archivos

- `index.html`: Estructura semántica, dashboard con paneles de control, display de coordenadas y contenedor de mapa.
- `style.css`: Diseño moderno con temática oscura, efectos de cristal (glassmorphism), indicadores de estado y tipografía moderna (`Inter` / `Outfit`).
- `script.js`: Lógica integral de consulta de permisos, geolocalización, actualización de mapa y manejo de errores.
- `server.js`: Servidor HTTP ligero y sin dependencias externas para pruebas locales.
