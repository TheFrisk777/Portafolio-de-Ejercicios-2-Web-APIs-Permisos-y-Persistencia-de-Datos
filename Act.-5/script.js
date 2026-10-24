/**
 * ============================================================================
 * EJERCICIO 5 - ESTRATEGIA DE CACHÉ DINÁMICA CON FALLBACK A INDEXEDDB
 * ============================================================================
 * Implementación de estrategias de caché dinámicas:
 *  - Network-First (Prioridad Red + Fallback automático a IndexedDB)
 *  - Stale-While-Revalidate (Caché Inmediata + Sincronización en Segundo Plano)
 *  - Fallback a IndexedDB cuando el dispositivo queda offline o la red falla
 * ============================================================================
 */

(() => {
  'use strict';

  /* ==========================================================================
     1. CONSTANTES Y CONFIGURACIÓN GENERAL
     ========================================================================== */
  const DB_CONFIG = {
    name: 'DynamicCacheDB',
    version: 1,
    storeName: 'api_cache_store'
  };

  const API_ENDPOINTS = {
    posts: 'https://jsonplaceholder.typicode.com/posts?_limit=18',
    products: 'https://dummyjson.com/products?limit=12',
    users: 'https://jsonplaceholder.typicode.com/users',
    localMock: '/api/articles'
  };

  const STRATEGY_DESCRIPTIONS = {
    networkFirst: '<strong>Network-First:</strong> Consulta primero la API en la nube mediante fetch. Si tiene éxito, almacena una copia en IndexedDB y renderiza. Si se corta la red o falla el servidor, recupera automáticamente el último JSON guardado en IndexedDB.',
    staleWhileRevalidate: '<strong>Stale-While-Revalidate:</strong> Renderiza instantáneamente los datos guardados en IndexedDB (si existen) y, en segundo plano, realiza un fetch a la red para revalidar y actualizar tanto la pantalla como la base de datos.',
    cacheFirst: '<strong>Cache-First:</strong> Prioriza la lectura local desde IndexedDB para máxima velocidad. Solo si el endpoint no está en la base de datos, consulta la red remota y guarda la copia.'
  };

  /* ==========================================================================
     2. GESTOR DE ALMACENAMIENTO INDEXEDDB NATIVO (IndexedDBCache)
     ========================================================================== */
  class IndexedDBCache {
    constructor(dbName, version, storeName) {
      this.dbName = dbName;
      this.version = version;
      this.storeName = storeName;
      this.db = null;
    }

    /**
     * Inicializa la base de datos y crea el almacén con índices
     */
    async init() {
      if (this.db) return this.db;

      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.version);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            const store = db.createObjectStore(this.storeName, { keyPath: 'endpoint' });
            store.createIndex('by_timestamp', 'timestamp', { unique: false });
            store.createIndex('by_strategy', 'strategy', { unique: false });
            store.createIndex('by_status', 'status', { unique: false });
          }
        };

        request.onsuccess = (event) => {
          this.db = event.target.result;
          resolve(this.db);
        };

        request.onerror = (event) => {
          console.error('Error al abrir IndexedDB:', event.target.error);
          reject(event.target.error);
        };
      });
    }

    /**
     * Guarda o sobrescribe una respuesta completa en IndexedDB
     */
    async saveResponse(endpoint, data, metadata = {}) {
      await this.init();
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);

        const cacheRecord = {
          endpoint,
          data,
          timestamp: Date.now(),
          isoDate: new Date().toISOString(),
          status: metadata.status || 200,
          strategy: metadata.strategy || 'network-first',
          itemCount: Array.isArray(data) ? data.length : (data.products?.length || data.articles?.length || 1),
          sizeBytes: new Blob([JSON.stringify(data)]).size
        };

        const request = store.put(cacheRecord);

        request.onsuccess = () => resolve(cacheRecord);
        request.onerror = (e) => reject(e.target.error);
      });
    }

    /**
     * Recupera una respuesta previamente guardada por su endpoint (URL)
     */
    async getResponse(endpoint) {
      await this.init();
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(endpoint);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = (e) => reject(e.target.error);
      });
    }

    /**
     * Obtiene todos los registros almacenados en el Object Store
     */
    async getAllRecords() {
      await this.init();
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (e) => reject(e.target.error);
      });
    }

    /**
     * Elimina un endpoint específico de la caché
     */
    async deleteEndpoint(endpoint) {
      await this.init();
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(endpoint);

        request.onsuccess = () => resolve(true);
        request.onerror = (e) => reject(e.target.error);
      });
    }

    /**
     * Limpia completamente el almacén de caché
     */
    async clearStore() {
      await this.init();
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onsuccess = () => resolve(true);
        request.onerror = (e) => reject(e.target.error);
      });
    }

    /**
     * Retorna el conteo total de registros en el store
     */
    async count() {
      await this.init();
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.count();

        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error);
      });
    }
  }

  /* ==========================================================================
     3. MOTOR DE ESTRATEGIAS DE CACHÉ (CacheEngine)
     ========================================================================== */
  class CacheStrategyEngine {
    constructor(dbCache, networkManager, ui) {
      this.db = dbCache;
      this.net = networkManager;
      this.ui = ui;
      this.currentData = [];
    }

    /**
     * Ejecuta la estrategia según la configuración seleccionada en la UI
     */
    async executeStrategy(url, strategyKey) {
      this.ui.showLoading(true, `Ejecutando estrategia ${strategyKey}...`);
      const startTime = performance.now();

      try {
        switch (strategyKey) {
          case 'networkFirst':
            await this.handleNetworkFirst(url, startTime);
            break;

          case 'staleWhileRevalidate':
            await this.handleStaleWhileRevalidate(url, startTime);
            break;

          case 'cacheFirst':
            await this.handleCacheFirst(url, startTime);
            break;

          default:
            await this.handleNetworkFirst(url, startTime);
        }
      } catch (err) {
        console.error('Error durante la ejecución de la estrategia:', err);
        this.ui.showToast('Error Inesperado', err.message || 'Fallo general de ejecución.', 'danger');
      } finally {
        this.ui.showLoading(false);
        this.ui.updateDatabaseTelemetry();
      }
    }

    /**
     * ESTRATEGIA: NETWORK-FIRST
     * 1. Intenta consultar la red con fetch()
     * 2. Si responde OK: guarda copia en IndexedDB y renderiza como 'network'
     * 3. Si falla (offline, timeout, 500): Fallback automático a IndexedDB
     */
    async handleNetworkFirst(url, startTime) {
      this.ui.setLoadingMessage('Consultando API remota (Network-First)...');

      try {
        // Verificar si está activo el simulador de desconexión o el navegador está offline
        if (this.net.isSimulatedOffline() || !navigator.onLine) {
          throw new Error('Dispositivo sin conexión a Internet (Offline detectado).');
        }

        // Si se configuró simulación de error 500
        if (this.net.isSimulatedError()) {
          throw new Error('Error simulado del servidor remoto (HTTP 500 Internal Error).');
        }

        // Intento de Fetch en la red
        const response = await this.net.fetchWithTimeout(url, 7000);
        const duration = Math.round(performance.now() - startTime);

        if (!response.ok) {
          throw new Error(`Servidor remoto respondió con código HTTP ${response.status}: ${response.statusText}`);
        }

        const jsonData = await response.json();

        // 1. Persistir copia en IndexedDB
        const record = await this.db.saveResponse(url, jsonData, {
          status: response.status,
          strategy: 'network-first'
        });

        // 2. Renderizar interfaz con datos frescos de la red
        this.currentData = jsonData;
        this.ui.renderData(jsonData, {
          source: 'network',
          url,
          timestamp: record.timestamp,
          duration,
          httpStatus: response.status
        });

        this.ui.hideFallbackBanner();
        this.ui.showToast(
          'Red Exitosa (Network-First)',
          `Datos recibidos de la API en ${duration}ms y guardados en IndexedDB.`,
          'success'
        );

      } catch (networkError) {
        console.warn('Network-First: Falló la petición a la red. Iniciando Fallback a IndexedDB...', networkError);
        
        // --- FALLBACK AUTOMÁTICO A INDEXEDDB ---
        const fallbackRecord = await this.db.getResponse(url);
        const duration = Math.round(performance.now() - startTime);

        if (fallbackRecord) {
          this.currentData = fallbackRecord.data;
          this.ui.renderData(fallbackRecord.data, {
            source: 'cache-fallback',
            url,
            timestamp: fallbackRecord.timestamp,
            duration,
            httpStatus: 'Cache'
          });

          this.ui.showFallbackBanner(fallbackRecord.timestamp, networkError.message);
          this.ui.showToast(
            'Fallback a IndexedDB Exitoso',
            `Sin red. Se recuperó automáticamente el último JSON guardado (${new Date(fallbackRecord.timestamp).toLocaleTimeString()}).`,
            'warning'
          );
        } else {
          // No hay datos previos en la base de datos local
          this.ui.renderEmptyStateNoCache(url, networkError.message);
          this.ui.showToast(
            'Sin Conexión y Sin Caché',
            `No hay copia previa en IndexedDB para este endpoint (${networkError.message}).`,
            'danger'
          );
        }
      }
    }

    /**
     * ESTRATEGIA: STALE-WHILE-REVALIDATE
     * 1. Renderiza inmediatamente la copia local de IndexedDB si existe (instantáneo)
     * 2. Dispara fetch() en segundo plano para revalidar con datos frescos
     * 3. Si la red responde, actualiza la copia en IndexedDB y vuelve a renderizar con sutil transición
     */
    async handleStaleWhileRevalidate(url, startTime) {
      this.ui.setLoadingMessage('Buscando copia rápida en IndexedDB...');

      // Paso 1: Consultar caché local de inmediato
      const cachedRecord = await this.db.getResponse(url);
      let servedFromCache = false;

      if (cachedRecord) {
        servedFromCache = true;
        const cacheDuration = Math.round(performance.now() - startTime);
        this.currentData = cachedRecord.data;

        // Renderizado inmediato
        this.ui.renderData(cachedRecord.data, {
          source: 'cache-stale',
          url,
          timestamp: cachedRecord.timestamp,
          duration: cacheDuration,
          httpStatus: 'Stale'
        });

        this.ui.showToast(
          'Caché Inmediata (Stale)',
          `Renderizado instantáneo desde IndexedDB. Revalidando en segundo plano...`,
          'info'
        );
      }

      // Paso 2: Revalidar contra la red en segundo plano
      try {
        if (this.net.isSimulatedOffline() || !navigator.onLine) {
          throw new Error('Sin red para revalidar. Se conservan los datos de IndexedDB.');
        }

        if (this.net.isSimulatedError()) {
          throw new Error('Servidor remoto inaccesible (Error 500 en revalidación).');
        }

        const netStartTime = performance.now();
        const response = await this.net.fetchWithTimeout(url, 7000);
        const netDuration = Math.round(performance.now() - netStartTime);

        if (!response.ok) throw new Error(`HTTP ${response.status} en revalidación`);

        const freshJson = await response.json();

        // Actualizar IndexedDB
        const freshRecord = await this.db.saveResponse(url, freshJson, {
          status: response.status,
          strategy: 'stale-while-revalidate'
        });

        // Actualizar UI con datos frescos
        this.currentData = freshJson;
        this.ui.renderData(freshJson, {
          source: 'revalidated',
          url,
          timestamp: freshRecord.timestamp,
          duration: netDuration,
          httpStatus: response.status
        });

        this.ui.hideFallbackBanner();
        this.ui.showToast(
          'Revalidación Completada',
          `Datos actualizados desde la red (${netDuration}ms) y sincronizados en IndexedDB.`,
          'success'
        );

      } catch (revalidateErr) {
        console.warn('Revalidación fallida:', revalidateErr);
        if (servedFromCache) {
          this.ui.showFallbackBanner(cachedRecord.timestamp, `Revalidación fallida: ${revalidateErr.message}. Conservando datos de IndexedDB.`);
        } else {
          // No había caché y la red falló
          this.ui.renderEmptyStateNoCache(url, revalidateErr.message);
          this.ui.showToast('Fallo de Red y Sin Caché', revalidateErr.message, 'danger');
        }
      }
    }

    /**
     * ESTRATEGIA: CACHE-FIRST
     */
    async handleCacheFirst(url, startTime) {
      const cached = await this.db.getResponse(url);
      const duration = Math.round(performance.now() - startTime);

      if (cached) {
        this.currentData = cached.data;
        this.ui.renderData(cached.data, {
          source: 'cache-direct',
          url,
          timestamp: cached.timestamp,
          duration,
          httpStatus: 'Cache-Hit'
        });
        this.ui.hideFallbackBanner();
        this.ui.showToast('Cache-First Hit', 'Cargado directamente de IndexedDB sin peticiones a la red.', 'info');
        return;
      }

      // Si no existe, va a la red (comportamiento idéntico a Network-First)
      await this.handleNetworkFirst(url, startTime);
    }

    /**
     * Forzar lectura manual desde IndexedDB
     */
    async forceReadFromCache(url) {
      this.ui.showLoading(true, 'Consultando IndexedDB...');
      const startTime = performance.now();
      try {
        const record = await this.db.getResponse(url);
        const duration = Math.round(performance.now() - startTime);

        if (record) {
          this.currentData = record.data;
          this.ui.renderData(record.data, {
            source: 'cache-manual',
            url,
            timestamp: record.timestamp,
            duration,
            httpStatus: 'IndexedDB'
          });
          this.ui.showToast('Lectura Directa', `Copia recuperada de IndexedDB (${record.itemCount} elementos).`, 'success');
        } else {
          this.ui.showToast('No Encontrado', 'Aún no existe una copia local de este endpoint en IndexedDB.', 'warning');
        }
      } catch (e) {
        this.ui.showToast('Error', e.message, 'danger');
      } finally {
        this.ui.showLoading(false);
      }
    }
  }

  /* ==========================================================================
     4. GESTOR DE RED Y SIMULACIÓN (NetworkManager)
     ========================================================================== */
  class NetworkManager {
    constructor() {
      this.simulateOffline = false;
      this.simulateError = false;
    }

    init(onStatusChange) {
      window.addEventListener('online', () => onStatusChange(this.isOnline()));
      window.addEventListener('offline', () => onStatusChange(this.isOnline()));
    }

    isOnline() {
      if (this.simulateOffline) return false;
      return navigator.onLine;
    }

    isSimulatedOffline() {
      return this.simulateOffline;
    }

    setSimulatedOffline(val) {
      this.simulateOffline = val;
    }

    isSimulatedError() {
      return this.simulateError;
    }

    setSimulatedError(val) {
      this.simulateError = val;
    }

    async fetchWithTimeout(url, timeoutMs = 6000) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        });
        clearTimeout(timer);
        return response;
      } catch (err) {
        clearTimeout(timer);
        if (err.name === 'AbortError') {
          throw new Error(`Tiempo de espera agotado (${timeoutMs / 1000}s). La red tardó demasiado.`);
        }
        throw err;
      }
    }
  }

  /* ==========================================================================
     5. CONTROLADOR DE LA INTERFAZ DE USUARIO (UIController)
     ========================================================================== */
  class UIController {
    constructor(dbCache) {
      this.db = dbCache;
      this.dom = {
        // Telemetría
        networkPill: document.getElementById('networkPill'),
        networkText: document.getElementById('networkText'),
        networkDetails: document.getElementById('networkDetails'),
        originPill: document.getElementById('originPill'),
        originText: document.getElementById('originText'),
        originDetails: document.getElementById('originDetails'),
        latencyValue: document.getElementById('latencyValue'),
        latencyPill: document.getElementById('latencyPill'),
        httpStatusBadge: document.getElementById('httpStatusBadge'),
        timestampDetails: document.getElementById('timestampDetails'),
        dbRecordsCount: document.getElementById('dbRecordsCount'),
        dbPill: document.getElementById('dbPill'),

        // Banner Fallback
        fallbackBanner: document.getElementById('fallbackBanner'),
        bannerTimestamp: document.getElementById('bannerTimestamp'),
        bannerMessage: document.getElementById('bannerMessage'),
        btnDismissBanner: document.getElementById('btnDismissBanner'),

        // Formulario y Controles
        apiEndpointSelect: document.getElementById('apiEndpointSelect'),
        customUrlContainer: document.getElementById('customUrlContainer'),
        customUrlInput: document.getElementById('customUrlInput'),
        strategySelect: document.getElementById('strategySelect'),
        strategyDescription: document.getElementById('strategyDescription'),
        toggleSimulateOffline: document.getElementById('toggleSimulateOffline'),
        toggleSimulateError: document.getElementById('toggleSimulateError'),

        // Botones
        btnFetchData: document.getElementById('btnFetchData'),
        btnForceCacheFallback: document.getElementById('btnForceCacheFallback'),
        btnInspectDB: document.getElementById('btnInspectDB'),
        btnClearCache: document.getElementById('btnClearCache'),
        btnQuickStart: document.getElementById('btnQuickStart'),

        // Feed y Búsqueda
        dataFeedContainer: document.getElementById('dataFeedContainer'),
        renderedCountBadge: document.getElementById('renderedCountBadge'),
        feedSourceBadge: document.getElementById('feedSourceBadge'),
        searchInput: document.getElementById('searchInput'),

        // Loading
        loadingOverlay: document.getElementById('loadingOverlay'),
        loadingText: document.getElementById('loadingText'),

        // Modal Inspector
        dbModal: document.getElementById('dbModal'),
        btnCloseModal: document.getElementById('btnCloseModal'),
        btnCloseModalFooter: document.getElementById('btnCloseModalFooter'),
        btnRefreshModal: document.getElementById('btnRefreshModal'),
        btnModalClearCache: document.getElementById('btnModalClearCache'),
        modalCachedCount: document.getElementById('modalCachedCount'),
        cachedEndpointsList: document.getElementById('cachedEndpointsList'),
        rawJsonContent: document.getElementById('rawJsonContent'),
        rawJsonLabel: document.getElementById('rawJsonLabel'),
        btnCopyJson: document.getElementById('btnCopyJson'),

        // Toasts
        toastContainer: document.getElementById('toastContainer')
      };

      this.currentRenderedItems = [];
    }

    /**
     * Actualiza el badge visual del estado de la red
     */
    updateNetworkStatus(isOnline, isSimulated = false) {
      if (isOnline) {
        this.dom.networkPill.className = 'pill pill-success';
        this.dom.networkText.textContent = 'Online (En Línea)';
        this.dom.networkDetails.textContent = 'Navegador con acceso a Internet';
      } else {
        this.dom.networkPill.className = 'pill pill-danger';
        this.dom.networkText.textContent = isSimulated ? 'Offline (Simulado)' : 'Offline (Sin Conexión)';
        this.dom.networkDetails.textContent = isSimulated
          ? 'Simulador activado: bloqueando peticiones fetch'
          : 'Se detectó pérdida de red en el navegador';
      }
    }

    /**
     * Actualiza la telemetría del almacén IndexedDB
     */
    async updateDatabaseTelemetry() {
      try {
        const count = await this.db.count();
        this.dom.dbRecordsCount.textContent = `${count} endpoint${count === 1 ? '' : 's'} en caché`;
        if (count > 0) {
          this.dom.dbPill.className = 'pill pill-success';
        } else {
          this.dom.dbPill.className = 'pill pill-neutral';
        }
      } catch (err) {
        this.dom.dbRecordsCount.textContent = 'Error al consultar BD';
        this.dom.dbPill.className = 'pill pill-danger';
      }
    }

    /**
     * Muestra el banner de fallback
     */
    showFallbackBanner(timestamp, reasonText = '') {
      const dateStr = new Date(timestamp).toLocaleString();
      this.dom.bannerTimestamp.textContent = dateStr;
      this.dom.bannerMessage.innerHTML = `
        La petición a la red no pudo completarse (${reasonText}). 
        La interfaz recuperó y renderizó de forma automática el último JSON preservado en 
        <strong>IndexedDB</strong> respaldado el <span class="highlight-date">${dateStr}</span>.
      `;
      this.dom.fallbackBanner.classList.remove('hidden');
    }

    hideFallbackBanner() {
      this.dom.fallbackBanner.classList.add('hidden');
    }

    /**
     * Muestra / oculta overlay de carga
     */
    showLoading(show, message = 'Cargando...') {
      if (show) {
        this.dom.loadingText.textContent = message;
        this.dom.loadingOverlay.classList.remove('hidden');
      } else {
        this.dom.loadingOverlay.classList.add('hidden');
      }
    }

    setLoadingMessage(msg) {
      this.dom.loadingText.textContent = msg;
    }

    /**
     * Renderiza los datos en el feed según la estructura de la API consumida
     */
    renderData(jsonData, meta = {}) {
      // Normalizar arreglo de datos
      let items = [];
      if (Array.isArray(jsonData)) {
        items = jsonData;
      } else if (jsonData && Array.isArray(jsonData.products)) {
        items = jsonData.products;
      } else if (jsonData && Array.isArray(jsonData.articles)) {
        items = jsonData.articles;
      } else if (jsonData && typeof jsonData === 'object') {
        items = [jsonData];
      }

      this.currentRenderedItems = items;

      // Actualizar telemetría de origen
      this.updateTelemetryCard(meta);

      // Limpiar contenedor
      this.dom.dataFeedContainer.innerHTML = '';

      if (items.length === 0) {
        this.dom.dataFeedContainer.innerHTML = `
          <div class="empty-state">
            <h3>No se encontraron registros</h3>
            <p>La respuesta de la API no contiene elementos legibles.</p>
          </div>
        `;
        this.dom.renderedCountBadge.textContent = '0 elementos';
        return;
      }

      this.dom.renderedCountBadge.textContent = `${items.length} elemento${items.length === 1 ? '' : 's'}`;

      // Crear tarjetas HTML
      const fragment = document.createDocumentFragment();

      items.forEach((item, index) => {
        const card = document.createElement('article');
        card.className = 'data-card';

        // Adaptar según propiedades detectadas
        const id = item.id || (index + 1);
        const title = item.title || item.name || `Registro #${id}`;
        const body = item.body || item.description || item.email || (item.address ? `${item.address.city}, ${item.address.street}` : JSON.stringify(item).slice(0, 110));
        const category = item.category || (item.company ? item.company.name : (item.userId ? `Usuario ${item.userId}` : 'API REST'));
        const image = item.thumbnail || (item.images && item.images[0]) || null;
        const price = item.price ? `$${item.price.toFixed(2)}` : null;

        card.innerHTML = `
          <div class="card-top-row">
            <span class="card-id-badge">ID #${id}</span>
            <span class="card-category-tag">${this.escapeHtml(category)}</span>
          </div>

          ${image ? `
            <div class="card-image-box">
              <img src="${image}" alt="${this.escapeHtml(title)}" loading="lazy" onerror="this.parentElement.style.display='none'">
            </div>
          ` : ''}

          <h4 class="card-title-text">${this.escapeHtml(title)}</h4>
          <p class="card-body-text">${this.escapeHtml(body)}</p>

          <div class="card-meta-footer">
            <span>${meta.source === 'network' ? '🌐 Red remota' : '💾 IndexedDB'}</span>
            ${price ? `<span class="card-price">${price}</span>` : `<span>#${index + 1}</span>`}
          </div>
        `;

        fragment.appendChild(card);
      });

      this.dom.dataFeedContainer.appendChild(fragment);
    }

    /**
     * Actualiza las tarjetas de telemetría superior
     */
    updateTelemetryCard(meta) {
      const { source, duration, httpStatus, timestamp } = meta;

      // Telemetría de Origen
      if (source === 'network') {
        this.dom.originPill.className = 'pill pill-success';
        this.dom.originText.textContent = '🌐 Red Remota (En Vivo)';
        this.dom.originDetails.textContent = 'Datos frescos recibidos y cacheados';
        this.dom.feedSourceBadge.className = 'source-tag tag-network';
        this.dom.feedSourceBadge.textContent = 'ORIGEN: RED EN VIVO';
      } else if (source === 'cache-fallback') {
        this.dom.originPill.className = 'pill pill-warning';
        this.dom.originText.textContent = '💾 Fallback a IndexedDB';
        this.dom.originDetails.textContent = 'Red no disponible. Respaldo local activo';
        this.dom.feedSourceBadge.className = 'source-tag tag-cache';
        this.dom.feedSourceBadge.textContent = 'ORIGEN: CACHÉ INDEXEDDB (FALLBACK)';
      } else if (source === 'cache-stale') {
        this.dom.originPill.className = 'pill pill-cyan';
        this.dom.originText.textContent = '⚡ Stale Cache (Inmediato)';
        this.dom.originDetails.textContent = 'Revalidando con la red en 2do plano...';
        this.dom.feedSourceBadge.className = 'source-tag tag-cache';
        this.dom.feedSourceBadge.textContent = 'ORIGEN: INDEXEDDB STALE';
      } else if (source === 'revalidated') {
        this.dom.originPill.className = 'pill pill-violet';
        this.dom.originText.textContent = '🔄 Revalidado con Red';
        this.dom.originDetails.textContent = 'Copia sincronizada y actualizada en pantalla';
        this.dom.feedSourceBadge.className = 'source-tag tag-revalidated';
        this.dom.feedSourceBadge.textContent = 'ORIGEN: REVALIDADO CON ÉXITO';
      } else {
        this.dom.originPill.className = 'pill pill-neutral';
        this.dom.originText.textContent = 'IndexedDB Directo';
        this.dom.originDetails.textContent = 'Lectura directa del Object Store';
        this.dom.feedSourceBadge.className = 'source-tag tag-cache';
        this.dom.feedSourceBadge.textContent = 'ORIGEN: INDEXEDDB LOCAL';
      }

      // Telemetría de Rendimiento
      if (duration !== undefined) {
        this.dom.latencyValue.textContent = `${duration} ms`;
        if (duration < 100) {
          this.dom.latencyPill.className = 'pill pill-success';
        } else if (duration < 1000) {
          this.dom.latencyPill.className = 'pill pill-cyan';
        } else {
          this.dom.latencyPill.className = 'pill pill-warning';
        }
      }

      if (httpStatus) {
        this.dom.httpStatusBadge.textContent = typeof httpStatus === 'number' ? `HTTP ${httpStatus}` : `${httpStatus}`;
      }

      if (timestamp) {
        const timeStr = new Date(timestamp).toLocaleTimeString();
        this.dom.timestampDetails.textContent = `Última sincronización: ${timeStr}`;
      }
    }

    /**
     * Renderiza un estado vacío cuando la red falla y no hay caché previa
     */
    renderEmptyStateNoCache(url, errorMsg) {
      this.dom.originPill.className = 'pill pill-danger';
      this.dom.originText.textContent = '❌ Fallo Total';
      this.dom.originDetails.textContent = 'Sin conexión y sin copia previa';
      this.dom.feedSourceBadge.className = 'source-tag tag-none';
      this.dom.feedSourceBadge.textContent = 'SIN DATOS';
      this.dom.renderedCountBadge.textContent = '0 elementos';

      this.dom.dataFeedContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon-circle" style="color: var(--accent-rose); border-color: rgba(244, 63, 94, 0.3); background: rgba(244, 63, 94, 0.1);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <h3>Fallo de Red y Sin Respaldo en IndexedDB</h3>
          <p>
            No se pudo establecer conexión con la API remota (<strong>${this.escapeHtml(errorMsg)}</strong>) 
            y aún no existía ninguna copia guardada localmente para la URL:
          </p>
          <code style="word-break: break-all; background: rgba(0,0,0,0.3); padding: 0.4rem 0.8rem; border-radius: 4px; font-size: 0.78rem; color: #38bdf8;">
            ${this.escapeHtml(url)}
          </code>
          <p style="font-size: 0.82rem; margin-top: 0.5rem;">
            💡 <strong>Sugerencia:</strong> Desactiva la simulación de offline, haz al menos una petición exitosa para generar la copia en IndexedDB y vuelve a probar.
          </p>
        </div>
      `;
    }

    /**
     * Filtra los elementos renderizados mediante el buscador
     */
    filterItems(searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      const cards = this.dom.dataFeedContainer.querySelectorAll('.data-card');

      let visibleCount = 0;
      cards.forEach((card) => {
        const text = card.textContent.toLowerCase();
        if (text.includes(term)) {
          card.style.display = '';
          visibleCount++;
        } else {
          card.style.display = 'none';
        }
      });

      this.dom.renderedCountBadge.textContent = `${visibleCount} de ${cards.length} elementos`;
    }

    /**
     * Muestra una notificación Toast flotante
     */
    showToast(title, desc, type = 'info') {
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;

      const iconSvg = {
        success: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        warning: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        danger: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        info: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
      }[type] || '';

      toast.innerHTML = `
        ${iconSvg}
        <div class="toast-body">
          <div class="toast-title">${this.escapeHtml(title)}</div>
          <div class="toast-desc">${this.escapeHtml(desc)}</div>
        </div>
      `;

      this.dom.toastContainer.appendChild(toast);

      // Desvanecer y remover tras 4.2 segundos
      setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 250);
      }, 4200);
    }

    /**
     * Abre y puebla el modal inspector de IndexedDB
     */
    async openInspectorModal() {
      this.dom.dbModal.classList.remove('hidden');
      await this.refreshInspectorModal();
    }

    closeInspectorModal() {
      this.dom.dbModal.classList.add('hidden');
    }

    async refreshInspectorModal() {
      this.dom.modalCachedCount.textContent = 'Consultando registros...';
      this.dom.cachedEndpointsList.innerHTML = '<p style="padding: 1rem; color: var(--text-muted);">Cargando almacén...</p>';

      const records = await this.db.getAllRecords();
      this.dom.modalCachedCount.textContent = `${records.length} entrada${records.length === 1 ? '' : 's'} en el Object Store`;

      if (records.length === 0) {
        this.dom.cachedEndpointsList.innerHTML = `
          <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
            El Object Store <code>${DB_CONFIG.storeName}</code> está vacío. 
            Ejecuta una petición fetch para almacenar datos.
          </div>
        `;
        this.dom.rawJsonContent.innerHTML = '<code>(Almacén vacío)</code>';
        return;
      }

      this.dom.cachedEndpointsList.innerHTML = '';
      records.forEach((rec, idx) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = `endpoint-item ${idx === 0 ? 'active' : ''}`;
        const kbSize = (rec.sizeBytes / 1024).toFixed(1);

        itemDiv.innerHTML = `
          <div class="endpoint-item-info">
            <span class="endpoint-url">${this.escapeHtml(rec.endpoint)}</span>
            <span class="endpoint-meta">
              🕒 ${new Date(rec.timestamp).toLocaleString()} • ${rec.itemCount} registros • ${kbSize} KB • Estrategia: ${rec.strategy}
            </span>
          </div>
          <div class="endpoint-badges">
            <span class="pill pill-success" style="font-size: 0.68rem; padding: 0.15rem 0.45rem;">HTTP ${rec.status}</span>
            <button class="btn btn-sm btn-danger-outline btn-del-endpoint" title="Borrar este endpoint" data-url="${this.escapeHtml(rec.endpoint)}">🗑️</button>
          </div>
        `;

        itemDiv.addEventListener('click', (e) => {
          if (e.target.closest('.btn-del-endpoint')) return;
          this.dom.cachedEndpointsList.querySelectorAll('.endpoint-item').forEach(el => el.classList.remove('active'));
          itemDiv.classList.add('active');
          this.displayRawJson(rec);
        });

        // Botón de eliminar individual
        const delBtn = itemDiv.querySelector('.btn-del-endpoint');
        delBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await this.db.deleteEndpoint(rec.endpoint);
          this.showToast('Registro Eliminado', `Se removió la copia de ${rec.endpoint}`, 'info');
          await this.refreshInspectorModal();
          await this.updateDatabaseTelemetry();
        });

        this.dom.cachedEndpointsList.appendChild(itemDiv);
      });

      // Mostrar el primer registro por defecto
      this.displayRawJson(records[0]);
    }

    displayRawJson(record) {
      if (!record) return;
      this.dom.rawJsonLabel.textContent = `Registro para: ${record.endpoint} (Guardado el ${new Date(record.timestamp).toLocaleString()})`;
      this.dom.rawJsonContent.textContent = JSON.stringify(record, null, 2);
    }

    escapeHtml(str) {
      if (typeof str !== 'string') return String(str ?? '');
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  }

  /* ==========================================================================
     6. ARRANQUE Y CONTROL DE FLUJO PRINCIPAL
     ========================================================================== */
  document.addEventListener('DOMContentLoaded', async () => {
    // 1. Inicializar componentes centrales
    const dbCache = new IndexedDBCache(DB_CONFIG.name, DB_CONFIG.version, DB_CONFIG.storeName);
    const networkManager = new NetworkManager();
    const ui = new UIController(dbCache);
    const engine = new CacheStrategyEngine(dbCache, networkManager, ui);

    // 2. Abrir IndexedDB
    try {
      await dbCache.init();
      console.log('IndexedDB inicializado correctamente:', DB_CONFIG.name);
      await ui.updateDatabaseTelemetry();
    } catch (e) {
      console.error('Fallo al inicializar IndexedDB:', e);
      ui.showToast('Error IndexedDB', 'No se pudo inicializar la base de datos local.', 'danger');
    }

    // 3. Monitoreo de Conectividad Nativa
    networkManager.init((isOnline) => {
      ui.updateNetworkStatus(isOnline, networkManager.isSimulatedOffline());
      ui.showToast(
        isOnline ? 'Conexión Restablecida' : 'Dispositivo Desconectado',
        isOnline ? 'El navegador vuelve a tener acceso a Internet.' : 'Se detectó que no hay conexión de red.',
        isOnline ? 'success' : 'warning'
      );
    });
    ui.updateNetworkStatus(networkManager.isOnline());

    // 4. Helper para obtener la URL activa
    const getActiveEndpointUrl = () => {
      const selected = ui.dom.apiEndpointSelect.value;
      if (selected === 'custom') {
        const val = ui.dom.customUrlInput.value.trim();
        return val || API_ENDPOINTS.posts;
      }
      return API_ENDPOINTS[selected] || API_ENDPOINTS.posts;
    };

    // 5. EVENT LISTENERS DE CONTROLES

    // Cambio en selector de Endpoint
    ui.dom.apiEndpointSelect.addEventListener('change', () => {
      const val = ui.dom.apiEndpointSelect.value;
      if (val === 'custom') {
        ui.dom.customUrlContainer.classList.remove('hidden');
      } else {
        ui.dom.customUrlContainer.classList.add('hidden');
      }
    });

    // Cambio en selector de Estrategia
    ui.dom.strategySelect.addEventListener('change', () => {
      const strat = ui.dom.strategySelect.value;
      ui.dom.strategyDescription.innerHTML = STRATEGY_DESCRIPTIONS[strat] || '';
    });

    // Simulador de Offline (Toggle)
    ui.dom.toggleSimulateOffline.addEventListener('change', (e) => {
      const isSim = e.target.checked;
      networkManager.setSimulatedOffline(isSim);
      ui.updateNetworkStatus(networkManager.isOnline(), isSim);
      ui.showToast(
        isSim ? 'Modo Offline Simulado' : 'Modo Offline Desactivado',
        isSim
          ? 'Las peticiones fetch fallarán inmediatamente para probar el fallback a IndexedDB.'
          : 'Se restauró el canal de red normal.',
        isSim ? 'warning' : 'info'
      );
    });

    // Simulador de Error 500 (Toggle)
    ui.dom.toggleSimulateError.addEventListener('change', (e) => {
      const isError = e.target.checked;
      networkManager.setSimulatedError(isError);
      ui.showToast(
        isError ? 'Simulación Error 500 Activada' : 'Simulación Error 500 Desactivada',
        isError
          ? 'La API responderá con fallo para evaluar la resiliencia y el fallback.'
          : 'Respuestas normales del servidor restauradas.',
        isError ? 'warning' : 'info'
      );
    });

    // Botón Principal: Ejecutar Fetch
    const triggerFetch = () => {
      const url = getActiveEndpointUrl();
      const strategy = ui.dom.strategySelect.value;
      engine.executeStrategy(url, strategy);
    };

    ui.dom.btnFetchData.addEventListener('click', triggerFetch);
    ui.dom.btnQuickStart?.addEventListener('click', triggerFetch);

    // Botón: Leer Directo de IndexedDB (Prueba manual de fallback)
    ui.dom.btnForceCacheFallback.addEventListener('click', () => {
      const url = getActiveEndpointUrl();
      engine.forceReadFromCache(url);
    });

    // Botón: Limpiar Caché Local
    ui.dom.btnClearCache.addEventListener('click', async () => {
      if (confirm('¿Deseas purgar todas las respuestas cacheadas en IndexedDB?')) {
        await dbCache.clearStore();
        await ui.updateDatabaseTelemetry();
        ui.showToast('Caché Purgada', 'Se vació el almacén api_cache_store en IndexedDB.', 'info');
      }
    });

    // Botón: Cerrar Banner Fallback
    ui.dom.btnDismissBanner.addEventListener('click', () => {
      ui.hideFallbackBanner();
    });

    // Búsqueda / Filtrado en el feed
    ui.dom.searchInput.addEventListener('input', (e) => {
      ui.filterItems(e.target.value);
    });

    // Botón: Abrir Inspector de IndexedDB
    ui.dom.btnInspectDB.addEventListener('click', () => {
      ui.openInspectorModal();
    });

    ui.dom.btnCloseModal.addEventListener('click', () => ui.closeInspectorModal());
    ui.dom.btnCloseModalFooter.addEventListener('click', () => ui.closeInspectorModal());
    ui.dom.btnRefreshModal.addEventListener('click', () => ui.refreshInspectorModal());

    ui.dom.btnModalClearCache.addEventListener('click', async () => {
      if (confirm('¿Vaciar por completo el almacén de IndexedDB?')) {
        await dbCache.clearStore();
        await ui.refreshInspectorModal();
        await ui.updateDatabaseTelemetry();
        ui.showToast('Almacén Vaciado', 'Se eliminaron todas las entradas de caché.', 'info');
      }
    });

    // Copiar JSON crudo al portapapeles
    ui.dom.btnCopyJson.addEventListener('click', async () => {
      const text = ui.dom.rawJsonContent.textContent;
      try {
        await navigator.clipboard.writeText(text);
        ui.showToast('Copiado', 'JSON copiado al portapapeles.', 'success');
      } catch (err) {
        ui.showToast('Error al Copiar', 'No se pudo acceder al portapapeles.', 'warning');
      }
    });

    // Cerrar modal con tecla Escape o clic fuera
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !ui.dom.dbModal.classList.contains('hidden')) {
        ui.closeInspectorModal();
      }
    });

    ui.dom.dbModal.addEventListener('click', (e) => {
      if (e.target === ui.dom.dbModal) {
        ui.closeInspectorModal();
      }
    });

    // Ejecutar una petición inicial automática tras 600ms para poblar la pantalla
    setTimeout(() => {
      triggerFetch();
    }, 600);
  });

})();
