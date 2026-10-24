<h1 align="center">PORTAFOLIO 2</h1>

<h3 align="center">APIs AVANZADAS PARA APLICACIONES WEB PROGRESIVAS</h3>

<p align="center">
  Desarrollo e implementación de funcionalidades avanzadas mediante APIs del navegador, almacenamiento local y estrategias de caché.
</p>

---

## Índice

1. [Descripción]
2. [Objetivo general]
3. [Ejercicio 1. Permisos y geolocalización]
4. [Ejercicio 2. Captura de medios con cámara]
5. [Ejercicio 3. Notificaciones locales]
6. [Ejercicio 4. Persistencia con IndexedDB]
7. [Ejercicio 5. Estrategia de caché dinámica]

---

## Descripción

Este portafolio comprende cinco ejercicios prácticos individuales orientados a implementar funcionalidades avanzadas en una **Aplicación Web Progresiva (PWA)**.

Las actividades abarcan el uso de APIs del navegador para consultar permisos, obtener la ubicación del dispositivo, acceder a la cámara, generar notificaciones locales y almacenar información de manera persistente.

Asimismo, se trabaja con servicios web REST y estrategias de caché para facilitar la recuperación de datos cuando la aplicación no dispone de conexión a Internet.

## Objetivo general

Implementar funcionalidades avanzadas en una Aplicación Web Progresiva mediante el uso de APIs del navegador, almacenamiento local y estrategias de caché, con la finalidad de mejorar la experiencia del usuario y mantener la disponibilidad de la información en condiciones de conectividad limitada.

---

## Ejercicio 1. Permisos y geolocalización

**Objetivo:** consultar los permisos del navegador y obtener la ubicación geográfica del dispositivo.

### Funcionalidades

- Consultar el estado de los permisos mediante `navigator.permissions.query()`.
- Solicitar acceso a la ubicación mediante `navigator.geolocation.getCurrentPosition()`.
- Obtener y mostrar las coordenadas de latitud y longitud.
- Presentar la ubicación mediante texto o un mapa interactivo.

**APIs utilizadas:** Permissions API y Geolocation API.

---

## Ejercicio 2. Captura de medios con cámara

**Objetivo:** acceder a la cámara web o móvil para visualizar el flujo de video y capturar fotografías desde una interfaz web.

### Funcionalidades

- Solicitar acceso a la cámara mediante `navigator.mediaDevices.getUserMedia()`.
- Mostrar el flujo de video en un elemento HTML `<video>`.
- Capturar una fotografía utilizando un elemento HTML `<canvas>`.
- Gestionar los permisos necesarios para acceder al hardware del dispositivo.

**API principal:** MediaDevices API.

---

## Ejercicio 3. Notificaciones locales

**Objetivo:** implementar notificaciones personalizadas utilizando la API de notificaciones y un Service Worker.

### Funcionalidades

- Solicitar autorización mediante `Notification.requestPermission()`.
- Configurar notificaciones con título, cuerpo e icono personalizados.
- Mostrar notificaciones mediante `self.registration.showNotification()` desde el Service Worker.
- Configurar opciones adicionales, como la vibración cuando sea compatible con el dispositivo.

**Tecnologías utilizadas:** Notification API y Service Workers.

---

## Ejercicio 4. Persistencia de datos con IndexedDB

**Objetivo:** almacenar y administrar información localmente para permitir su consulta sin depender de una conexión a Internet.

### Funcionalidades

- Abrir o crear una base de datos mediante IndexedDB.
- Crear un almacén de objetos (*Object Store*) para organizar los registros.
- Insertar nuevos registros en la base de datos.
- Consultar la información almacenada.
- Eliminar registros mediante una interfaz sencilla.
- Mantener la información disponible para futuras consultas.

**Tecnología principal:** IndexedDB.

---

## Ejercicio 5. Estrategia de caché dinámica

**Objetivo:** consumir información de una API REST y conservar una copia local que permita recuperar los últimos datos disponibles cuando falle la conexión.

### Funcionalidades

- Realizar solicitudes HTTP mediante `fetch()`.
- Obtener y procesar respuestas en formato JSON.
- Guardar una copia de los datos mediante Cache API o IndexedDB.
- Implementar una estrategia de almacenamiento como `Network-First` o `Stale-While-Revalidate`.
- Recuperar y mostrar los datos almacenados localmente cuando la solicitud de red falle.



**Andrey**

Portafolio de ejercicios prácticos de Aplicaciones Web Progresivas (PWA).
