/**
 * ============================================================================
 * EJERCICIO 4: PERSISTENCIA DE DATOS ASÍNCRONA CON INDEXEDDB
 * Módulo de almacenamiento local persistente con Object Stores, índices y CRUD
 * ============================================================================
 */

// Configuración de la Base de Datos
const DB_CONFIG = {
  name: 'RegistrosDB',
  version: 1,
  storeName: 'registros'
};

/**
 * Servicio Asíncrono de IndexedDB
 * Encapsula la apertura, transacciones (readonly / readwrite) y operaciones CRUD mediante Promises nativas.
 */
class IndexedDBService {
  constructor(config) {
    this.dbName = config.name;
    this.version = config.version;
    this.storeName = config.storeName;
    this.db = null;
  }

  /**
   * Apertura y creación de la base de datos y su Object Store.
   * Maneja el ciclo de vida: onupgradeneeded, onsuccess, onerror y onblocked.
   * @returns {Promise<IDBDatabase>}
   */
  async init() {
    return new Promise((resolve, reject) => {
      // Verificación de soporte nativo en el navegador
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB no es soportado por este navegador.'));
        return;
      }

      console.log(`[IndexedDB] Solicitando apertura de base de datos "${this.dbName}" (v${this.version})...`);
      const request = window.indexedDB.open(this.dbName, this.version);

      /**
       * Evento onupgradeneeded:
       * Se ejecuta si la base de datos no existe previamente o si se incrementa la versión.
       * Aquí se define la estructura: Object Stores e Índices.
       */
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log(`[IndexedDB] onupgradeneeded: Creando o actualizando estructura en v${event.newVersion}...`);

        // Si el Object Store no existe, crearlo con keyPath 'id' y autoIncrement true
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, {
            keyPath: 'id',
            autoIncrement: true
          });

          // Creación de índices secundarios para búsquedas y filtros optimizados
          store.createIndex('idx_titulo', 'titulo', { unique: false });
          store.createIndex('idx_categoria', 'categoria', { unique: false });
          store.createIndex('idx_prioridad', 'prioridad', { unique: false });
          store.createIndex('idx_estado', 'estado', { unique: false });
          store.createIndex('idx_fecha', 'fecha', { unique: false });

          console.log(`[IndexedDB] Object Store "${this.storeName}" creado exitosamente con 5 índices.`);
        }
      };

      /**
       * Evento onsuccess:
       * Conexión exitosa a la base de datos abierta.
       */
      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log(`[IndexedDB] onsuccess: Conexión establecida con "${this.dbName}".`);

        this.db.onversionchange = () => {
          this.db.close();
          console.warn('[IndexedDB] Base de datos cerrada debido a un cambio de versión concurrente.');
        };

        resolve(this.db);
      };

      /**
       * Evento onerror:
       * Falla en la apertura o permisos denegados.
       */
      request.onerror = (event) => {
        console.error('[IndexedDB] onerror en apertura:', event.target.error);
        reject(event.target.error);
      };

      /**
       * Evento onblocked:
       * Otra pestaña o proceso bloquea la migración.
       */
      request.onblocked = () => {
        console.warn('[IndexedDB] onblocked: Apertura bloqueada por otra pestaña.');
      };
    });
  }

  /**
   * Inserción asíncrona de un nuevo registro en el Object Store.
   * Utiliza una transacción 'readwrite'.
   * @param {Object} record - Datos del registro
   * @returns {Promise<{ id: number, durationMs: number }>}
   */
  async add(record) {
    const startTime = performance.now();
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);

        // Clona el objeto para evitar mutaciones externas y agrega fecha si no existe
        const dataToSave = {
          ...record,
          fecha: record.fecha || new Date().toISOString()
        };

        const request = store.add(dataToSave);

        request.onsuccess = (event) => {
          const generatedId = event.target.result;
          const durationMs = Math.round(performance.now() - startTime);
          resolve({ id: generatedId, durationMs });
        };

        request.onerror = (event) => {
          reject(event.target.error);
        };

        transaction.onerror = (event) => {
          reject(event.target.error);
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Consulta asíncrona de todos los registros en el Object Store.
   * Utiliza una transacción 'readonly'.
   * @returns {Promise<Array<Object>>}
   */
  async getAll() {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();

        request.onsuccess = (event) => {
          resolve(event.target.result || []);
        };

        request.onerror = (event) => {
          reject(event.target.error);
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Consulta asíncrona de un registro por su clave primaria (ID).
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async getById(id) {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(Number(id));

        request.onsuccess = (event) => {
          resolve(event.target.result || null);
        };

        request.onerror = (event) => {
          reject(event.target.error);
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Actualización asíncrona de un registro existente con store.put().
   * Utiliza una transacción 'readwrite'.
   * @param {Object} record - Registro con clave primaria 'id'
   * @returns {Promise<{ durationMs: number }>}
   */
  async update(record) {
    const startTime = performance.now();
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(record);

        request.onsuccess = () => {
          const durationMs = Math.round(performance.now() - startTime);
          resolve({ durationMs });
        };

        request.onerror = (event) => {
          reject(event.target.error);
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Eliminación asíncrona de un registro por su clave primaria con store.delete().
   * Utiliza una transacción 'readwrite'.
   * @param {number} id
   * @returns {Promise<{ durationMs: number }>}
   */
  async delete(id) {
    const startTime = performance.now();
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(Number(id));

        request.onsuccess = () => {
          const durationMs = Math.round(performance.now() - startTime);
          resolve({ durationMs });
        };

        request.onerror = (event) => {
          reject(event.target.error);
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Vaciado completo del Object Store con store.clear().
   * @returns {Promise<void>}
   */
  async clearAll() {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Conteo total de registros en el almacén.
   * @returns {Promise<number>}
   */
  async count() {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.count();

        request.onsuccess = (event) => resolve(event.target.result || 0);
        request.onerror = (event) => reject(event.target.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Estimación de cuota de almacenamiento disponible vía StorageManager API.
   * @returns {Promise<{ usageMB: string, quotaMB: string }>}
   */
  async getStorageEstimate() {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const usageMB = (estimate.usage / (1024 * 1024)).toFixed(2);
        const quotaMB = (estimate.quota / (1024 * 1024)).toFixed(0);
        return { usageMB, quotaMB };
      } catch {
        return { usageMB: '0.05', quotaMB: 'Desconocida' };
      }
    }
    return { usageMB: '0.05', quotaMB: 'N/A' };
  }
}

/**
 * ============================================================================
 * CONTROLADOR DE LA INTERFAZ DE USUARIO (UI CONTROLLER)
 * ============================================================================
 */
class AppController {
  constructor() {
    this.dbService = new IndexedDBService(DB_CONFIG);
    this.records = [];
    this.initElements();
    this.attachEventListeners();
    this.initApp();
  }

  /**
   * Referencias a los elementos del DOM.
   */
  initElements() {
    // Diagnóstico
    this.dbBadge = document.getElementById('dbBadge');
    this.dbStatusText = document.getElementById('dbStatusText');
    this.netBadge = document.getElementById('netBadge');
    this.netStatusText = document.getElementById('netStatusText');
    this.totalRecordsCount = document.getElementById('totalRecordsCount');
    this.storageDetails = document.getElementById('storageDetails');
    this.filteredCountText = document.getElementById('filteredCountText');
    this.totalFilterCountText = document.getElementById('totalFilterCountText');

    // Formulario de Inserción
    this.recordForm = document.getElementById('recordForm');
    this.tituloInput = document.getElementById('tituloInput');
    this.categoriaSelect = document.getElementById('categoriaSelect');
    this.prioridadSelect = document.getElementById('prioridadSelect');
    this.descripcionInput = document.getElementById('descripcionInput');
    this.estadoSelect = document.getElementById('estadoSelect');
    this.tagsInput = document.getElementById('tagsInput');
    this.btnResetForm = document.getElementById('btnResetForm');

    // Herramientas
    this.btnSeedData = document.getElementById('btnSeedData');
    this.btnExportJson = document.getElementById('btnExportJson');
    this.importJsonInput = document.getElementById('importJsonInput');
    this.btnClearStore = document.getElementById('btnClearStore');
    this.btnRefreshStats = document.getElementById('btnRefreshStats');

    // Filtros y Búsqueda
    this.searchFilterInput = document.getElementById('searchFilterInput');
    this.btnClearSearch = document.getElementById('btnClearSearch');
    this.filterCategoria = document.getElementById('filterCategoria');
    this.filterPrioridad = document.getElementById('filterPrioridad');
    this.filterEstado = document.getElementById('filterEstado');
    this.sortBySelect = document.getElementById('sortBySelect');
    this.recordsContainer = document.getElementById('recordsContainer');

    // Modal de Detalles JSON
    this.recordModal = document.getElementById('recordModal');
    this.modalRecordTitle = document.getElementById('modalRecordTitle');
    this.modalDetailsContent = document.getElementById('modalDetailsContent');
    this.modalJsonCode = document.getElementById('modalJsonCode');
    this.btnCloseModal = document.getElementById('btnCloseModal');
    this.btnModalCloseAction = document.getElementById('btnModalCloseAction');
    this.btnCopyJson = document.getElementById('btnCopyJson');

    // Modal de Edición
    this.editModal = document.getElementById('editModal');
    this.editRecordForm = document.getElementById('editRecordForm');
    this.editRecordId = document.getElementById('editRecordId');
    this.editRecordFecha = document.getElementById('editRecordFecha');
    this.editTituloInput = document.getElementById('editTituloInput');
    this.editCategoriaSelect = document.getElementById('editCategoriaSelect');
    this.editPrioridadSelect = document.getElementById('editPrioridadSelect');
    this.editDescripcionInput = document.getElementById('editDescripcionInput');
    this.editEstadoSelect = document.getElementById('editEstadoSelect');
    this.editTagsInput = document.getElementById('editTagsInput');
    this.btnCloseEditModal = document.getElementById('btnCloseEditModal');
    this.btnCancelEdit = document.getElementById('btnCancelEdit');

    // Toast Container
    this.toastContainer = document.getElementById('toastContainer');
  }

  /**
   * Registro de manejadores de eventos.
   */
  attachEventListeners() {
    // Eventos de conectividad de red (Online / Offline)
    window.addEventListener('online', () => this.updateNetworkStatus());
    window.addEventListener('offline', () => this.updateNetworkStatus());

    // Envío del formulario de inserción
    this.recordForm.addEventListener('submit', (e) => this.handleSubmitRecord(e));
    this.btnResetForm.addEventListener('click', () => this.recordForm.reset());

    // Herramientas de almacén
    this.btnSeedData.addEventListener('click', () => this.handleSeedData());
    this.btnExportJson.addEventListener('click', () => this.handleExportJson());
    this.importJsonInput.addEventListener('change', (e) => this.handleImportJson(e));
    this.btnClearStore.addEventListener('click', () => this.handleClearStore());
    this.btnRefreshStats.addEventListener('click', () => this.refreshData());

    // Filtros dinámicos en tiempo real
    this.searchFilterInput.addEventListener('input', () => {
      this.btnClearSearch.style.display = this.searchFilterInput.value ? 'block' : 'none';
      this.renderRecords();
    });
    this.btnClearSearch.addEventListener('click', () => {
      this.searchFilterInput.value = '';
      this.btnClearSearch.style.display = 'none';
      this.renderRecords();
    });
    this.filterCategoria.addEventListener('change', () => this.renderRecords());
    this.filterPrioridad.addEventListener('change', () => this.renderRecords());
    this.filterEstado.addEventListener('change', () => this.renderRecords());
    this.sortBySelect.addEventListener('change', () => this.renderRecords());

    // Modales: Cerrar al hacer clic en fondo o botones
    this.btnCloseModal.addEventListener('click', () => this.closeDetailsModal());
    this.btnModalCloseAction.addEventListener('click', () => this.closeDetailsModal());
    this.recordModal.addEventListener('click', (e) => {
      if (e.target === this.recordModal) this.closeDetailsModal();
    });

    this.btnCloseEditModal.addEventListener('click', () => this.closeEditModal());
    this.btnCancelEdit.addEventListener('click', () => this.closeEditModal());
    this.editModal.addEventListener('click', (e) => {
      if (e.target === this.editModal) this.closeEditModal();
    });

    // Formulario de edición
    this.editRecordForm.addEventListener('submit', (e) => this.handleEditSubmit(e));

    // Copiar JSON
    this.btnCopyJson.addEventListener('click', () => this.handleCopyJson());

    // Tecla Escape para cerrar modales
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeDetailsModal();
        this.closeEditModal();
      }
    });
  }

  /**
   * Inicialización asíncrona de la aplicación.
   */
  async initApp() {
    this.updateNetworkStatus();

    try {
      await this.dbService.init();
      
      // Actualizar tarjeta de diagnóstico de la BD
      this.dbBadge.className = 'status-pill pill-success';
      this.dbStatusText.textContent = 'Conectado (v1)';
      
      this.showToast('success', 'IndexedDB Inicializado', 'Object Store "registros" preparado con índices.');

      // Cargar registros almacenados
      await this.refreshData();

      // Si es la primera vez que se abre y no hay registros, sugerir o insertar datos de muestra
      if (this.records.length === 0) {
        console.log('[App] No se encontraron registros locales. Se pueden insertar o generar muestras.');
      }
    } catch (err) {
      console.error('[App] Error al inicializar IndexedDB:', err);
      this.dbBadge.className = 'status-pill pill-error';
      this.dbStatusText.textContent = 'Error de Conexión';
      this.showToast('error', 'Error en IndexedDB', err.message || 'No fue posible abrir la base de datos.');
      
      this.recordsContainer.innerHTML = `
        <div class="empty-state">
          <h3>Error al conectar con IndexedDB</h3>
          <p>${this.escapeHtml(err.message || 'Error desconocido')}</p>
        </div>
      `;
    }
  }

  /**
   * Actualiza el indicador de red para demostrar el funcionamiento offline.
   */
  updateNetworkStatus() {
    const isOnline = navigator.onLine;
    if (isOnline) {
      this.netBadge.className = 'status-pill pill-info';
      this.netStatusText.textContent = 'En Línea (Online)';
    } else {
      this.netBadge.className = 'status-pill pill-warning';
      this.netStatusText.textContent = 'Sin Conexión (Offline)';
      this.showToast('warning', 'Modo Offline Detectado', 'Operaciones CRUD siguen funcionando al 100% en IndexedDB.');
    }
  }

  /**
   * Consulta asíncrona y refresco global de datos desde IndexedDB.
   */
  async refreshData() {
    try {
      this.records = await this.dbService.getAll();
      this.updateMetrics();
      this.renderRecords();
    } catch (err) {
      console.error('[App] Error al consultar registros:', err);
      this.showToast('error', 'Error de Consulta', 'No se pudieron recuperar los registros del almacén.');
    }
  }

  /**
   * Actualiza métricas de almacenamiento y conteos.
   */
  async updateMetrics() {
    const count = this.records.length;
    this.totalRecordsCount.textContent = count;

    // Estimación de almacenamiento
    const estimate = await this.dbService.getStorageEstimate();
    this.storageDetails.textContent = `Uso aprox: ~${estimate.usageMB} MB (IndexedDB)`;
  }

  /**
   * Manejador de inserción de nuevo registro.
   */
  async handleSubmitRecord(event) {
    event.preventDefault();

    const titulo = this.tituloInput.value.trim();
    const categoria = this.categoriaSelect.value;
    const prioridad = this.prioridadSelect.value;
    const descripcion = this.descripcionInput.value.trim();
    const estado = this.estadoSelect.value;
    const tagsRaw = this.tagsInput.value.trim();

    if (!titulo || !descripcion) {
      this.showToast('warning', 'Campos Requeridos', 'Por favor completa el título y la descripción.');
      return;
    }

    // Convertir etiquetas separadas por comas en array limpio
    const tags = tagsRaw
      ? tagsRaw.split(',').map(t => t.trim()).filter(t => t.length > 0)
      : [];

    const newRecord = {
      titulo,
      categoria,
      prioridad,
      descripcion,
      estado,
      tags,
      fecha: new Date().toISOString()
    };

    try {
      const result = await this.dbService.add(newRecord);
      this.showToast(
        'success', 
        'Registro Insertado con Éxito', 
        `Guardado en Object Store con ID #${result.id} (${result.durationMs}ms vía transacción readwrite).`
      );

      // Limpiar formulario y enfocar primer campo
      this.recordForm.reset();
      this.tituloInput.focus();

      // Recargar registros
      await this.refreshData();
    } catch (err) {
      console.error('[App] Error al insertar:', err);
      this.showToast('error', 'Fallo al Insertar', err.message || 'No se pudo guardar el registro en IndexedDB.');
    }
  }

  /**
   * Manejador de edición de registro existente (store.put).
   */
  async handleEditSubmit(event) {
    event.preventDefault();

    const id = Number(this.editRecordId.value);
    const fecha = this.editRecordFecha.value;
    const titulo = this.editTituloInput.value.trim();
    const categoria = this.editCategoriaSelect.value;
    const prioridad = this.editPrioridadSelect.value;
    const descripcion = this.editDescripcionInput.value.trim();
    const estado = this.editEstadoSelect.value;
    const tagsRaw = this.editTagsInput.value.trim();

    const tags = tagsRaw
      ? tagsRaw.split(',').map(t => t.trim()).filter(t => t.length > 0)
      : [];

    const updatedRecord = {
      id,
      titulo,
      categoria,
      prioridad,
      descripcion,
      estado,
      tags,
      fecha,
      actualizadoEn: new Date().toISOString()
    };

    try {
      const result = await this.dbService.update(updatedRecord);
      this.closeEditModal();
      this.showToast(
        'success', 
        'Registro Actualizado', 
        `ID #${id} modificado en IndexedDB (${result.durationMs}ms).`
      );
      await this.refreshData();
    } catch (err) {
      console.error('[App] Error al actualizar:', err);
      this.showToast('error', 'Error al Actualizar', err.message);
    }
  }

  /**
   * Alternar estado rápido (Completado / Pendiente).
   */
  async toggleRecordStatus(id) {
    try {
      const record = await this.dbService.getById(id);
      if (!record) return;

      record.estado = (record.estado === 'Completado') ? 'Pendiente' : 'Completado';
      record.actualizadoEn = new Date().toISOString();

      await this.dbService.update(record);
      this.showToast(
        'info', 
        'Estado Cambiado', 
        `Registro #${id} marcado como "${record.estado}".`
      );
      await this.refreshData();
    } catch (err) {
      console.error('[App] Error al alternar estado:', err);
      this.showToast('error', 'Error', 'No se pudo cambiar el estado.');
    }
  }

  /**
   * Eliminación asíncrona de un registro.
   */
  async deleteRecord(id, titulo) {
    const confirmDelete = confirm(`¿Estás seguro de que deseas eliminar permanentemente el registro #${id} ("${titulo}") de IndexedDB?`);
    if (!confirmDelete) return;

    try {
      const result = await this.dbService.delete(id);
      this.showToast(
        'warning', 
        'Registro Eliminado', 
        `El registro #${id} fue removido del Object Store (${result.durationMs}ms).`
      );
      await this.refreshData();
    } catch (err) {
      console.error('[App] Error al eliminar:', err);
      this.showToast('error', 'Error al Eliminar', err.message);
    }
  }

  /**
   * Abrir modal con detalles del registro y JSON en bruto.
   */
  async showRecordDetails(id) {
    try {
      const record = await this.dbService.getById(id);
      if (!record) {
        this.showToast('warning', 'No encontrado', `El registro #${id} no existe en el almacén.`);
        return;
      }

      this.modalRecordTitle.textContent = `Registro #${record.id}: ${record.titulo}`;
      
      const formattedDate = new Date(record.fecha).toLocaleString('es-ES', {
        dateStyle: 'full',
        timeStyle: 'medium'
      });

      this.modalDetailsContent.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <span class="category-badge">${this.escapeHtml(record.categoria)}</span>
            <span class="priority-badge priority-${record.prioridad.toLowerCase()}">${record.prioridad}</span>
            <span class="record-state-pill state-${record.estado.toLowerCase().replace(/\s+/g, '-')}">${record.estado}</span>
          </div>
          <div>
            <strong style="color: #cbd5e1; font-size: 0.85rem;">Descripción:</strong>
            <p style="color: #94a3b8; font-size: 0.95rem; margin-top: 0.25rem;">${this.escapeHtml(record.descripcion)}</p>
          </div>
          <div style="font-size: 0.82rem; color: #64748b;">
            <span>📅 Fecha de registro: ${formattedDate}</span>
            ${record.actualizadoEn ? `<br><span>✏️ Última modificación: ${new Date(record.actualizadoEn).toLocaleString('es-ES')}</span>` : ''}
          </div>
        </div>
      `;

      this.modalJsonCode.textContent = JSON.stringify(record, null, 2);
      this.recordModal.classList.add('active');
      this.recordModal.setAttribute('aria-hidden', 'false');
    } catch (err) {
      console.error('[App] Error al obtener detalles:', err);
      this.showToast('error', 'Error', 'No se pudieron leer los detalles del registro.');
    }
  }

  /**
   * Abrir modal para editar registro.
   */
  async openEditModal(id) {
    try {
      const record = await this.dbService.getById(id);
      if (!record) return;

      this.editRecordId.value = record.id;
      this.editRecordFecha.value = record.fecha;
      this.editTituloInput.value = record.titulo;
      this.editCategoriaSelect.value = record.categoria;
      this.editPrioridadSelect.value = record.prioridad;
      this.editDescripcionInput.value = record.descripcion;
      this.editEstadoSelect.value = record.estado;
      this.editTagsInput.value = (record.tags || []).join(', ');

      this.editModal.classList.add('active');
      this.editModal.setAttribute('aria-hidden', 'false');
      this.editTituloInput.focus();
    } catch (err) {
      console.error('[App] Error al abrir edición:', err);
      this.showToast('error', 'Error', 'No se pudo cargar el formulario de edición.');
    }
  }

  closeDetailsModal() {
    this.recordModal.classList.remove('active');
    this.recordModal.setAttribute('aria-hidden', 'true');
  }

  closeEditModal() {
    this.editModal.classList.remove('active');
    this.editModal.setAttribute('aria-hidden', 'true');
    this.editRecordForm.reset();
  }

  handleCopyJson() {
    const text = this.modalJsonCode.textContent;
    navigator.clipboard.writeText(text).then(() => {
      this.showToast('info', 'Copiado al Portapapeles', 'Objeto JSON copiado con éxito.');
    }).catch(() => {
      this.showToast('warning', 'Atención', 'No se pudo acceder al portapapeles.');
    });
  }

  /**
   * Generar 5 registros de muestra representativos para pruebas inmediatas.
   */
  async handleSeedData() {
    const sampleRecords = [
      {
        titulo: 'Auditoría de Seguridad en Red Local',
        categoria: 'Sistemas',
        prioridad: 'Alta',
        descripcion: 'Verificar puertos abiertos y configurar firewall perimetral en la infraestructura offline.',
        estado: 'En Progreso',
        tags: ['seguridad', 'firewall', 'redes'],
        fecha: new Date(Date.now() - 3600000 * 24).toISOString()
      },
      {
        titulo: 'Preparar Presentación de Persistencia Web',
        categoria: 'Estudio',
        prioridad: 'Media',
        descripcion: 'Explicar diferencias clave entre LocalStorage, SessionStorage e IndexedDB (capacidades y asincronía).',
        estado: 'Completado',
        tags: ['pwa', 'indexeddb', 'capacitación'],
        fecha: new Date(Date.now() - 3600000 * 18).toISOString()
      },
      {
        titulo: 'Conciliación Bancaria Mensual',
        categoria: 'Finanzas',
        prioridad: 'Alta',
        descripcion: 'Revisar extractos de cuentas corporativas y registrar comprobantes fiscales correspondientes.',
        estado: 'Pendiente',
        tags: ['contabilidad', 'impuestos'],
        fecha: new Date(Date.now() - 3600000 * 10).toISOString()
      },
      {
        titulo: 'Optimización de Service Workers para Caché Offline',
        categoria: 'Trabajo',
        prioridad: 'Baja',
        descripcion: 'Implementar estrategia Cache-First para recursos estáticos CSS/JS y Network-First para APIs.',
        estado: 'Pendiente',
        tags: ['service-worker', 'cache', 'pwa'],
        fecha: new Date(Date.now() - 3600000 * 4).toISOString()
      },
      {
        titulo: 'Mantenimiento Preventivo de Servidores Locales',
        categoria: 'Urgente',
        prioridad: 'Alta',
        descripcion: 'Realizar copias de seguridad de las bases de datos locales y limpiar logs antiguos.',
        estado: 'Pendiente',
        tags: ['servidores', 'backup', 'mantenimiento'],
        fecha: new Date().toISOString()
      }
    ];

    try {
      let insertedCount = 0;
      for (const item of sampleRecords) {
        await this.dbService.add(item);
        insertedCount++;
      }

      this.showToast('success', 'Muestras Creadas', `Se insertaron ${insertedCount} registros de prueba en IndexedDB.`);
      await this.refreshData();
    } catch (err) {
      console.error('[App] Error al sembrar datos:', err);
      this.showToast('error', 'Error al Sembrar Datos', err.message);
    }
  }

  /**
   * Exportar todos los registros locales a un archivo JSON descargable.
   */
  async handleExportJson() {
    if (this.records.length === 0) {
      this.showToast('warning', 'Almacén Vacío', 'No hay registros para exportar en IndexedDB.');
      return;
    }

    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.records, null, 2));
      const downloadAnchor = document.createElement('a');
      const filename = `backup_indexeddb_registros_${new Date().toISOString().slice(0, 10)}.json`;

      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      this.showToast('success', 'Copia de Seguridad Generada', `Archivo "${filename}" descargado con ${this.records.length} registros.`);
    } catch (err) {
      console.error('[App] Error al exportar:', err);
      this.showToast('error', 'Error de Exportación', err.message);
    }
  }

  /**
   * Importar archivo JSON local hacia IndexedDB.
   */
  async handleImportJson(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        if (!Array.isArray(importedData)) {
          throw new Error('El archivo JSON debe contener un arreglo de objetos.');
        }

        let importedCount = 0;
        for (const record of importedData) {
          // Remover id original para evitar colisión de claves autoIncrement
          const { id, ...dataToInsert } = record;
          await this.dbService.add(dataToInsert);
          importedCount++;
        }

        this.showToast('success', 'Importación Exitosa', `Se importaron ${importedCount} registros a IndexedDB.`);
        await this.refreshData();
      } catch (err) {
        console.error('[App] Error al importar JSON:', err);
        this.showToast('error', 'Error al Importar JSON', err.message || 'Formato de archivo inválido.');
      } finally {
        this.importJsonInput.value = '';
      }
    };

    reader.readAsText(file);
  }

  /**
   * Vaciar completamente el Object Store.
   */
  async handleClearStore() {
    if (this.records.length === 0) {
      this.showToast('info', 'Almacén Vacío', 'No hay registros en el Object Store.');
      return;
    }

    const confirmClear = confirm(`⚠️ ¿Estás seguro de que deseas VACIAR TODO el Object Store "${this.dbService.storeName}"?\nEsta acción eliminará todos los registros locales de forma permanente.`);
    if (!confirmClear) return;

    try {
      await this.dbService.clearAll();
      this.showToast('warning', 'Almacén Vaciado', 'Todos los registros fueron eliminados de IndexedDB.');
      await this.refreshData();
    } catch (err) {
      console.error('[App] Error al vaciar almacén:', err);
      this.showToast('error', 'Error al Vaciar', err.message);
    }
  }

  /**
   * Filtrado y Renderizado Reactivo del Listado de Registros en el DOM.
   */
  renderRecords() {
    const searchQuery = this.searchFilterInput.value.toLowerCase().trim();
    const filterCat = this.filterCategoria.value;
    const filterPri = this.filterPrioridad.value;
    const filterEst = this.filterEstado.value;
    const sortBy = this.sortBySelect.value;

    // 1. Filtrar registros
    let filtered = this.records.filter(record => {
      // Búsqueda por texto (título, descripción, tags)
      const matchesSearch = !searchQuery || (
        (record.titulo && record.titulo.toLowerCase().includes(searchQuery)) ||
        (record.descripcion && record.descripcion.toLowerCase().includes(searchQuery)) ||
        (record.tags && record.tags.some(t => t.toLowerCase().includes(searchQuery)))
      );

      // Filtro Categoría
      const matchesCategoria = (filterCat === 'TODAS') || (record.categoria === filterCat);

      // Filtro Prioridad
      const matchesPrioridad = (filterPri === 'TODAS') || (record.prioridad === filterPri);

      // Filtro Estado
      const matchesEstado = (filterEst === 'TODOS') || (record.estado === filterEst);

      return matchesSearch && matchesCategoria && matchesPrioridad && matchesEstado;
    });

    // 2. Ordenar registros
    filtered.sort((a, b) => {
      if (sortBy === 'fecha_desc') {
        return new Date(b.fecha) - new Date(a.fecha);
      } else if (sortBy === 'fecha_asc') {
        return new Date(a.fecha) - new Date(b.fecha);
      } else if (sortBy === 'prioridad') {
        const priorityOrder = { 'Alta': 3, 'Media': 2, 'Baja': 1 };
        return (priorityOrder[b.prioridad] || 0) - (priorityOrder[a.prioridad] || 0);
      } else if (sortBy === 'titulo') {
        return a.titulo.localeCompare(b.titulo);
      } else if (sortBy === 'id_desc') {
        return b.id - a.id;
      }
      return 0;
    });

    // Actualizar contadores de resultados
    this.filteredCountText.textContent = filtered.length;
    this.totalFilterCountText.textContent = this.records.length;

    // 3. Renderizar vista
    if (this.records.length === 0) {
      this.recordsContainer.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <polyline points="21 8 21 21 3 21 3 8"/>
            <rect x="1" y="3" width="22" height="5"/>
            <line x1="10" y1="12" x2="14" y2="12"/>
          </svg>
          <h3>El Object Store está vacío</h3>
          <p>No hay registros almacenados localmente en IndexedDB. Utiliza el formulario o el botón "Generar Muestras" para insertar el primero.</p>
          <button type="button" class="btn btn-outline" onclick="window.app.handleSeedData()">
            ⚡ Generar Registros de Muestra
          </button>
        </div>
      `;
      return;
    }

    if (filtered.length === 0) {
      this.recordsContainer.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <h3>Sin coincidencias</h3>
          <p>Ningún registro coincide con los filtros o término de búsqueda ingresados.</p>
          <button type="button" class="btn btn-secondary" onclick="window.app.resetFilters()">
            Restablecer Filtros
          </button>
        </div>
      `;
      return;
    }

    // Inyectar tarjetas
    this.recordsContainer.innerHTML = filtered.map(item => this.createRecordCardHtml(item)).join('');

    // Adjuntar escuchadores dinámicos a botones de tarjeta
    this.attachCardEventListeners();
  }

  /**
   * Construye el markup HTML para una tarjeta de registro individual.
   */
  createRecordCardHtml(item) {
    const isCompleted = item.estado === 'Completado';
    const statusClass = `status-${item.estado.toLowerCase().replace(/\s+/g, '-')}`;
    const priorityClass = `priority-${item.prioridad.toLowerCase()}`;
    const stateClass = `state-${item.estado.toLowerCase().replace(/\s+/g, '-')}`;

    const dateFormatted = new Date(item.fecha).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const tagsHtml = (item.tags && item.tags.length > 0)
      ? `<div class="user-tags-list">
          ${item.tags.map(t => `<span class="user-tag">#${this.escapeHtml(t)}</span>`).join('')}
         </div>`
      : '';

    return `
      <article class="record-card ${statusClass}" data-id="${item.id}">
        
        <!-- Fila Superior: Badges y Fecha -->
        <div class="record-card-top">
          <div class="record-card-tags">
            <span class="record-id-badge">ID #${item.id}</span>
            <span class="priority-badge ${priorityClass}">
              ● ${item.prioridad}
            </span>
            <span class="category-badge">${this.escapeHtml(item.categoria)}</span>
          </div>

          <span class="record-date">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            ${dateFormatted}
          </span>
        </div>

        <!-- Fila Principal: Título, Checkbox y Descripción -->
        <div class="record-card-main">
          <div class="record-card-title-row">
            <button 
              type="button" 
              class="record-toggle-btn ${isCompleted ? 'is-completed' : ''}" 
              data-action="toggle" 
              title="${isCompleted ? 'Marcar como pendiente' : 'Marcar como completado'}"
            >
              ${isCompleted ? `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              ` : `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                </svg>
              `}
            </button>
            <h3 class="record-card-title ${isCompleted ? 'completed-text' : ''}">
              ${this.escapeHtml(item.titulo)}
            </h3>
          </div>

          <p class="record-card-desc">${this.escapeHtml(item.descripcion)}</p>
          ${tagsHtml}
        </div>

        <!-- Fila Inferior: Estado y Acciones -->
        <div class="record-card-footer">
          <span class="record-state-pill ${stateClass}">
            ${item.estado}
          </span>

          <div class="record-actions-group">
            <button 
              type="button" 
              class="btn-card-action" 
              data-action="details" 
              title="Inspeccionar objeto en memoria IndexedDB"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <span>Ver JSON</span>
            </button>

            <button 
              type="button" 
              class="btn-card-action action-edit" 
              data-action="edit" 
              title="Modificar registro con store.put()"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              <span>Editar</span>
            </button>

            <button 
              type="button" 
              class="btn-card-action action-delete" 
              data-action="delete" 
              title="Eliminar de IndexedDB con store.delete()"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              <span>Eliminar</span>
            </button>
          </div>
        </div>

      </article>
    `;
  }

  /**
   * Conecta los eventos de clic en las tarjetas de registros.
   */
  attachCardEventListeners() {
    const cards = this.recordsContainer.querySelectorAll('.record-card');
    cards.forEach(card => {
      const id = Number(card.dataset.id);
      const title = card.querySelector('.record-card-title')?.textContent.trim() || '';

      const toggleBtn = card.querySelector('[data-action="toggle"]');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => this.toggleRecordStatus(id));
      }

      const detailsBtn = card.querySelector('[data-action="details"]');
      if (detailsBtn) {
        detailsBtn.addEventListener('click', () => this.showRecordDetails(id));
      }

      const editBtn = card.querySelector('[data-action="edit"]');
      if (editBtn) {
        editBtn.addEventListener('click', () => this.openEditModal(id));
      }

      const deleteBtn = card.querySelector('[data-action="delete"]');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => this.deleteRecord(id, title));
      }
    });
  }

  /**
   * Restablece filtros y buscador.
   */
  resetFilters() {
    this.searchFilterInput.value = '';
    this.btnClearSearch.style.display = 'none';
    this.filterCategoria.value = 'TODAS';
    this.filterPrioridad.value = 'TODAS';
    this.filterEstado.value = 'TODOS';
    this.sortBySelect.value = 'fecha_desc';
    this.renderRecords();
  }

  /**
   * Notificaciones flotantes en pantalla (Toast System).
   */
  showToast(type, title, message) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
    } else if (type === 'warning') {
      iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    } else {
      iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    toast.innerHTML = `
      ${iconSvg}
      <div class="toast-content">
        <div class="toast-title">${this.escapeHtml(title)}</div>
        <div class="toast-msg">${this.escapeHtml(message)}</div>
      </div>
    `;

    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-hiding');
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  /**
   * Sanitización básica para prevenir inyección XSS al manipular cadenas.
   */
  escapeHtml(str) {
    if (typeof str !== 'string') return String(str || '');
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Inicializar la aplicación al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  window.app = new AppController();
});
