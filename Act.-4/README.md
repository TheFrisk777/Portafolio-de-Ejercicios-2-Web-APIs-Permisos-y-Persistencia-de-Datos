# Ejercicio 4: Persistencia de Datos Asíncrona con IndexedDB

Aplicación web interactiva desarrollada con **JavaScript nativo y la API de IndexedDB** para demostrar el almacenamiento estructurado, transaccional y persistente de datos en el cliente, capaz de operar **100% libre de conexión a internet**.

---

## 📌 Objetivos del Ejercicio

1. **Apertura y Gestión de Base de Datos**: Uso del objeto nativo `window.indexedDB.open()` y control de eventos del ciclo de vida (`onupgradeneeded`, `onsuccess`, `onerror`, `onblocked`).
2. **Creación de un Object Store**: Definición del almacén `"registros"` con clave primaria auto-incremental (`keyPath: 'id'`, `autoIncrement: true`).
3. **Creación de Índices Secundarios**: Configuración de índices sobre campos clave (`categoria`, `prioridad`, `estado`, `fecha`) para optimizar búsquedas.
4. **Operaciones CRUD Asíncronas**:
   - **Insertar**: Escritura con transacción `readwrite` y método `store.add()`.
   - **Consultar**: Lectura reactiva con transacción `readonly`, `store.getAll()`, `store.get()` y filtros combinados.
   - **Actualizar**: Modificación de registros existentes con `store.put()`.
   - **Eliminar**: Borrado individual con `store.delete()` y vaciado completo con `store.clear()`.
5. **Independencia de Internet**: Demostración de persistencia local sin requerir llamadas de red ni servidores remotos.

---

## 📂 Estructura de Archivos

```
Act.-4/
├── index.html       # Interfaz de usuario semántica, accesible y responsiva
├── style.css        # Sistema de diseño moderno con tema oscuro, glassmorphism y paleta HSL
├── script.js        # Clase IndexedDBService y controlador de UI desacoplado
├── server.js        # Servidor HTTP local opcional en Node.js (Puerto 3003)
└── README.md        # Documentación técnica y guía de ejecución
```

---

## ⚙️ Arquitectura Técnica de IndexedDB

### 1. Ciclo de Vida y Migración (`onupgradeneeded`)
A diferencia de `localStorage` (que es síncrono y solo admite strings de hasta ~5MB), `IndexedDB` es una base de datos NoSQL transaccional, asíncrona y orientada a objetos:

```javascript
const request = window.indexedDB.open('RegistrosDB', 1);

request.onupgradeneeded = (event) => {
  const db = event.target.result;

  // Creación del Object Store si no existe
  if (!db.objectStoreNames.contains('registros')) {
    const store = db.createObjectStore('registros', {
      keyPath: 'id',
      autoIncrement: true
    });

    // Creación de índices secundarios
    store.createIndex('idx_titulo', 'titulo', { unique: false });
    store.createIndex('idx_categoria', 'categoria', { unique: false });
    store.createIndex('idx_prioridad', 'prioridad', { unique: false });
    store.createIndex('idx_estado', 'estado', { unique: false });
    store.createIndex('idx_fecha', 'fecha', { unique: false });
  }
};
```

### 2. Transacciones ACID Asíncronas
Todas las lecturas y escrituras se ejecutan dentro de una transacción con ámbito definido:

- **Escritura (`readwrite`)**:
  ```javascript
  const transaction = db.transaction(['registros'], 'readwrite');
  const store = transaction.objectStore('registros');
  const request = store.add(nuevoRegistro);
  ```

- **Lectura (`readonly`)**:
  ```javascript
  const transaction = db.transaction(['registros'], 'readonly');
  const store = transaction.objectStore('registros');
  const request = store.getAll();
  ```

---

## 🚀 Cómo Ejecutar el Proyecto

Tienes dos opciones para ejecutar la aplicación:

### Opción A: Directamente en el Navegador (Sin Servidor)
1. Haz doble clic sobre el archivo `index.html` en la carpeta `Act.-4`.
2. Tu navegador predeterminado (Chrome, Edge, Firefox, Brave) abrirá la web y la base de datos IndexedDB se creará inmediatamente en tu perfil local de usuario.

### Opción B: Mediante el Servidor Local Node.js
1. Abre una terminal de comandos en la carpeta del proyecto:
   ```powershell
   cd "c:\Users\thefr\OneDrive\Documentos\Visual 2\Act.-4"
   node server.js
   ```
2. Abre tu navegador y navega a:
   ```
   http://localhost:3003
   ```

---

## 🧪 Guía de Pruebas y Verificación

### 1. Verificación de Conexión Inicial
- Al abrir la página, observa las **tarjetas de estado superiores**:
  - **Base de Datos:** Muestra `Conectado (v1)` con indicador verde.
  - **Object Store Activo:** Muestra `registros` (Clave: `id`, 4 índices).
  - **Conectividad:** Muestra tu estado de red actual (`Online` o `Offline`).
  - **Registros:** Muestra el número total almacenado y el tamaño estimado en disco.

### 2. Generación Rápida de Muestras
- En la sección **Herramientas de Almacén**, presiona el botón **"Generar Muestras"**.
- Se crearán instantáneamente 5 registros con categorías, prioridades y estados diversos.

### 3. Inserción de un Nuevo Registro
1. Completa el formulario con un título, categoría, prioridad y descripción.
2. Haz clic en **"Guardar en IndexedDB"**.
3. Verás una notificación toast emergente indicando el ID autogenerado y el tiempo de respuesta de la transacción en milisegundos.

### 4. Consultas y Filtros en Tiempo Real
- **Buscador:** Escribe cualquier palabra clave en la barra de búsqueda para filtrar al vuelo por título, descripción o etiquetas.
- **Filtros:** Selecciona una categoría (ej: *Sistemas*, *Trabajo*), una prioridad (*Alta*, *Media*, *Baja*) o un estado (*Pendiente*, *Completado*).
- **Ordenación:** Cambia el orden entre más recientes, más antiguos, prioridad o alfabético.

### 5. Edición y Modificación
- Haz clic en el botón circular a la izquierda del título de un registro para alternar su estado entre **Pendiente** y **Completado**.
- Haz clic en el botón **"Editar"** para abrir el formulario modal y modificar cualquier campo mediante `store.put()`.

### 6. Inspección de Objeto Crudo (JSON)
- Haz clic en **"Ver JSON"** en cualquier tarjeta para ver el objeto JavaScript exactamente tal como está almacenado en memoria física en IndexedDB.

### 7. Eliminación y Vaciado
- Haz clic en **"Eliminar"** en un registro para borrarlo individualmente con `store.delete(id)`.
- Haz clic en **"Vaciar Almacén"** para eliminar todos los registros con confirmación de seguridad.

### 8. Prueba del Funcionamiento Offline (Sin Internet)
1. Desactiva tu Wi-Fi / cable de red, o en las herramientas de desarrollo de tu navegador (F12 -> pestaña *Network*) selecciona **"Offline"**.
2. Observa cómo la tarjeta de estado cambia a `Sin Conexión (Offline)`.
3. Inserta nuevos registros, modifícalos y elimínalos. Todas las operaciones continuarán ejecutándose con normalidad instantáneamente.

---

## 🛠️ Tecnologías Empleadas

- **HTML5:** Semántica, formularios accesibles, modales dialog y aria labels.
- **CSS3:** Variables CSS, sistema de diseño HSL, Glassmorphism, temas oscuros y animaciones fluidas.
- **JavaScript (ES6+):** Programación orientada a objetos, Promises, Async/Await y manipulación del DOM.
- **Web APIs:**
  - `IndexedDB API` (`IDBDatabase`, `IDBTransaction`, `IDBObjectStore`, `IDBIndex`).
  - `Navigator.onLine` y eventos `online`/`offline`.
  - `StorageManager API` (`navigator.storage.estimate()`).
  - `Clipboard API` (`navigator.clipboard.writeText()`).
