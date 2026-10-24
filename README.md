Portafolio 2: APIs Avanzadas para Aplicaciones Web Progresivas (PWA)

  Descripción

Este portafolio tiene como objetivo desarrollar cinco ejercicios prácticos individuales orientados a incorporar funcionalidades avanzadas en una Aplicación Web Progresiva (PWA).

Durante las actividades se trabajan diferentes APIs del navegador para gestionar permisos, acceder a los dispositivos de hardware, generar notificaciones locales, almacenar información de forma persistente y consultar datos de servicios externos. También se implementan estrategias de almacenamiento en caché para mejorar la disponibilidad de la aplicación cuando no existe una conexión a Internet.

  Objetivo general

Implementar funcionalidades avanzadas en una Aplicación Web Progresiva mediante el uso de APIs del navegador, almacenamiento local y estrategias de sincronización y caché, con la finalidad de mejorar la experiencia del usuario y permitir el acceso a determinadas funciones incluso sin conexión.

  Ejercicio 1. Consulta de permisos y geolocalización

Objetivo: Consultar los permisos del navegador y obtener la ubicación geográfica del dispositivo.

Funcionalidades:

Consultar el estado de los permisos mediante navigator.permissions.query().

Solicitar acceso a la ubicación con navigator.geolocation.getCurrentPosition().

Obtener y mostrar las coordenadas de latitud y longitud.

Presentar la ubicación mediante texto o un mapa interactivo.

  Ejercicio 2. Captura de medios con cámara web o móvil

Objetivo: Acceder a la cámara del dispositivo y capturar fotografías desde una interfaz web.

Funcionalidades:

Solicitar acceso a la cámara mediante navigator.mediaDevices.getUserMedia().

Mostrar la transmisión de video en un elemento HTML <video>.

Capturar una imagen estática utilizando un elemento HTML <canvas>.

Solicitar los permisos correspondientes antes de acceder al hardware.

  Ejercicio 3. Notificaciones locales desde el Service Worker

Objetivo: Implementar notificaciones personalizadas mediante las APIs de notificaciones y Service Worker.

Funcionalidades:

Solicitar autorización para mostrar notificaciones con Notification.requestPermission().

Generar notificaciones con título, cuerpo e icono personalizados.

Utilizar self.registration.showNotification() desde el Service Worker.

Configurar opciones adicionales, como la vibración cuando el dispositivo y el navegador sean compatibles.

  Ejercicio 4. Persistencia de datos con IndexedDB

Objetivo: Almacenar y administrar información localmente para mantener los datos disponibles sin depender de una conexión a Internet.

Funcionalidades:

Abrir o crear una base de datos utilizando IndexedDB.

Crear un almacén de objetos (Object Store) para organizar los registros.

Insertar y consultar registros desde una interfaz sencilla.

Eliminar registros almacenados localmente.

Conservar la información para consultarla posteriormente.

  Ejercicio 5. Estrategia de caché dinámica con alternativa sin conexión

Objetivo: Consultar datos de una API REST y conservar una copia local que permita mostrar la última información disponible cuando no haya conexión.

Funcionalidades:

Realizar solicitudes HTTP mediante fetch().

Obtener y procesar respuestas en formato JSON desde una API REST.

Guardar una copia de los datos mediante Cache API o IndexedDB.

Implementar una estrategia de caché como Network-First o Stale-While-Revalidate.

Recuperar y mostrar los datos almacenados cuando la solicitud de red falle.

