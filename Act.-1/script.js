/**
 * Ejercicio 1: Verificación de permisos con Permissions API y solicitud GPS con Geolocation API
 */

// Elementos del DOM
const geoStatusBadge = document.getElementById('geoStatusBadge');
const geoStatusText = document.getElementById('geoStatusText');
const geoStatusExplanation = document.getElementById('geoStatusExplanation');
const btnCheckPermissions = document.getElementById('btnCheckPermissions');

const btnGetLocation = document.getElementById('btnGetLocation');
const btnWatchLocation = document.getElementById('btnWatchLocation');
const watchBtnText = document.getElementById('watchBtnText');
const highAccuracyToggle = document.getElementById('highAccuracyToggle');

const valLatitude = document.getElementById('valLatitude');
const valLongitude = document.getElementById('valLongitude');
const valAccuracy = document.getElementById('valAccuracy');
const valTimestamp = document.getElementById('valTimestamp');
const valAltitude = document.getElementById('valAltitude');
const valSpeed = document.getElementById('valSpeed');
const valHeading = document.getElementById('valHeading');

const statusNotification = document.getElementById('statusNotification');
const notifIcon = document.getElementById('notifIcon');
const notifText = document.getElementById('notifText');

const copyLatBtn = document.getElementById('copyLat');
const copyLngBtn = document.getElementById('copyLng');
const externalLinks = document.getElementById('externalLinks');
const linkGoogleMaps = document.getElementById('linkGoogleMaps');

const consoleLogs = document.getElementById('consoleLogs');
const btnClearLog = document.getElementById('btnClearLog');
const mapPlaceholder = document.getElementById('mapPlaceholder');

// Variables de estado
let map = null;
let userMarker = null;
let accuracyCircle = null;
let watchId = null;
let geoPermissionStatus = null;

// ==========================================================================
// 1. Logger de consola en pantalla
// ==========================================================================
function addLog(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  entry.textContent = `[${timestamp}] ${message}`;
  consoleLogs.appendChild(entry);
  consoleLogs.scrollTop = consoleLogs.scrollHeight;
}

btnClearLog.addEventListener('click', () => {
  consoleLogs.innerHTML = '';
  addLog('Terminal limpia.', 'info');
});

// ==========================================================================
// 2. Notificaciones en UI
// ==========================================================================
function showNotification(message, type = 'info', icon = 'ℹ️') {
  statusNotification.className = `notification ${type}`;
  notifIcon.textContent = icon;
  notifText.textContent = message;
  statusNotification.classList.remove('hidden');
}

// ==========================================================================
// 3. Permissions API (navigator.permissions.query)
// ==========================================================================
async function checkGeolocationPermission() {
  if (!navigator.permissions || !navigator.permissions.query) {
    updatePermissionUI('unsupported');
    addLog('Permissions API no está soportada en este navegador.', 'warn');
    return;
  }

  try {
    addLog("Ejecutando navigator.permissions.query({ name: 'geolocation' })...", 'info');
    geoPermissionStatus = await navigator.permissions.query({ name: 'geolocation' });
    
    // Actualizar estado en UI
    updatePermissionUI(geoPermissionStatus.state);
    addLog(`Estado de permiso recibido: "${geoPermissionStatus.state}"`, 'success');

    // Escuchar cambios de permiso en vivo (si el usuario cambia permisos en configuración del navegador)
    geoPermissionStatus.onchange = () => {
      addLog(`El estado de permiso de geolocalización cambió a: "${geoPermissionStatus.state}"`, 'warn');
      updatePermissionUI(geoPermissionStatus.state);
    };
  } catch (error) {
    addLog(`Error al consultar Permissions API: ${error.message}`, 'error');
    updatePermissionUI('error');
  }
}

function updatePermissionUI(state) {
  geoStatusBadge.className = 'status-pill';

  switch (state) {
    case 'granted':
      geoStatusBadge.classList.add('status-granted');
      geoStatusText.textContent = 'Permitido (granted)';
      geoStatusExplanation.innerHTML = 'El navegador tiene autorización concedida para acceder al GPS sin volver a preguntar.';
      break;
    case 'prompt':
      geoStatusBadge.classList.add('status-prompt');
      geoStatusText.textContent = 'Pendiente (prompt)';
      geoStatusExplanation.innerHTML = 'El navegador preguntará al usuario cuando se intente obtener la ubicación por primera vez.';
      break;
    case 'denied':
      geoStatusBadge.classList.add('status-denied');
      geoStatusText.textContent = 'Bloqueado (denied)';
      geoStatusExplanation.innerHTML = 'El acceso a la ubicación fue denegado en la configuración del sitio o del navegador.';
      break;
    case 'unsupported':
      geoStatusBadge.classList.add('status-prompt');
      geoStatusText.textContent = 'No Soportado';
      geoStatusExplanation.innerHTML = 'Tu navegador no implementa la Permissions API para geolocalización.';
      break;
    default:
      geoStatusBadge.classList.add('status-prompt');
      geoStatusText.textContent = 'Desconocido';
      geoStatusExplanation.innerHTML = 'No se pudo determinar el estado del permiso.';
  }
}

// Consultar otros permisos para demostrar Permissions API
async function checkOtherPermissions() {
  const permissionsToCheck = [
    { name: 'notifications', elId: 'permNotifications' },
    { name: 'camera', elId: 'permCamera' },
    { name: 'microphone', elId: 'permMic' }
  ];

  if (!navigator.permissions || !navigator.permissions.query) return;

  for (const item of permissionsToCheck) {
    const el = document.getElementById(item.elId);
    try {
      const res = await navigator.permissions.query({ name: item.name });
      el.textContent = res.state;
      el.className = `mini-badge status-${res.state}`;
    } catch {
      el.textContent = 'N/A';
      el.className = 'mini-badge';
    }
  }
}

// ==========================================================================
// 4. Inicialización del Mapa Interactivo (Leaflet)
// ==========================================================================
function initMap(lat = 19.4326, lng = -99.1332, zoom = 14) {
  if (map) return;

  // Centro por defecto: CDMX o genérico
  map = L.map('map').setView([lat, lng], zoom);

  // Capa de mosaicos OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  addLog('Mapa Leaflet interactivo cargado correctamente.', 'info');
}

function updateMap(lat, lng, accuracy) {
  // Inicializar si no estaba listo
  if (!map) {
    initMap(lat, lng, 16);
  }

  // Ocultar placeholder
  if (mapPlaceholder) {
    mapPlaceholder.classList.add('hidden');
  }

  // Actualizar o crear marcador
  if (userMarker) {
    userMarker.setLatLng([lat, lng]);
  } else {
    userMarker = L.marker([lat, lng], {
      title: 'Tu ubicación actual'
    }).addTo(map);
  }

  userMarker.bindPopup(`
    <div style="font-family: sans-serif; font-size: 13px;">
      <strong>📍 Estás aquí</strong><br>
      Lat: ${lat.toFixed(6)}<br>
      Lng: ${lng.toFixed(6)}<br>
      Precisión: ±${Math.round(accuracy)} m
    </div>
  `).openPopup();

  // Actualizar o crear círculo de precisión
  if (accuracyCircle) {
    accuracyCircle.setLatLng([lat, lng]);
    accuracyCircle.setRadius(accuracy);
  } else {
    accuracyCircle = L.circle([lat, lng], {
      color: '#3B82F6',
      fillColor: '#60A5FA',
      fillOpacity: 0.18,
      radius: accuracy
    }).addTo(map);
  }

  // Centrar con animación suave
  map.flyTo([lat, lng], 16, {
    animate: true,
    duration: 1.2
  });

  // Habilitar enlace a Google Maps
  externalLinks.style.display = 'block';
  linkGoogleMaps.href = `https://www.google.com/maps?q=${lat},${lng}`;
}

// ==========================================================================
// 5. Geolocation API (getCurrentPosition & watchPosition)
// ==========================================================================
function getGeolocationOptions() {
  return {
    enableHighAccuracy: highAccuracyToggle.checked,
    timeout: 15000,
    maximumAge: 0 // No usar caché
  };
}

function handlePositionSuccess(position) {
  const { latitude, longitude, accuracy, altitude, speed, heading } = position.coords;
  const timestamp = new Date(position.timestamp);

  // Mostrar coordenadas en pantalla
  valLatitude.textContent = `${latitude.toFixed(6)}°`;
  valLongitude.textContent = `${longitude.toFixed(6)}°`;
  valAccuracy.textContent = `± ${Math.round(accuracy)} m`;
  valTimestamp.textContent = timestamp.toLocaleTimeString();

  valAltitude.textContent = altitude !== null ? `${altitude.toFixed(1)} m` : 'No disponible';
  valSpeed.textContent = speed !== null ? `${(speed * 3.6).toFixed(1)} km/h` : 'No disponible';
  valHeading.textContent = heading !== null ? `${heading.toFixed(1)}°` : 'No disponible';

  // Actualizar mapa
  updateMap(latitude, longitude, accuracy);

  // Logs y estado
  addLog(`Coordenadas recibidas: Lat=${latitude.toFixed(6)}, Lng=${longitude.toFixed(6)}, Precisión=±${Math.round(accuracy)}m`, 'success');
  showNotification('Ubicación GPS obtenida con éxito.', 'success', '✅');

  // Re-verificar estado de permisos (cambia a 'granted' tras aceptar)
  checkGeolocationPermission();
}

function handlePositionError(error) {
  let errorMsg = '';
  switch (error.code) {
    case error.PERMISSION_DENIED:
      errorMsg = 'Permiso denegado por el usuario (PERMISSION_DENIED).';
      break;
    case error.POSITION_UNAVAILABLE:
      errorMsg = 'La información de posición no está disponible (POSITION_UNAVAILABLE). Asegúrate de tener el GPS activado.';
      break;
    case error.TIMEOUT:
      errorMsg = 'Tiempo de espera agotado al intentar obtener ubicación (TIMEOUT).';
      break;
    default:
      errorMsg = `Error desconocido (${error.code}): ${error.message}`;
  }

  addLog(`Error en Geolocation API: ${errorMsg}`, 'error');
  showNotification(errorMsg, 'error', '⚠️');
  checkGeolocationPermission();
}

// Solicitud puntual: getCurrentPosition
function requestCurrentPosition() {
  if (!('geolocation' in navigator)) {
    showNotification('Tu navegador no soporta Geolocation API.', 'error', '❌');
    addLog('navigator.geolocation no existe en este navegador.', 'error');
    return;
  }

  showNotification('Solicitando coordenadas al chip GPS / proveedor de red...', 'info', '🛰️');
  addLog('Llamando a navigator.geolocation.getCurrentPosition()...', 'info');

  const options = getGeolocationOptions();
  navigator.geolocation.getCurrentPosition(
    handlePositionSuccess,
    handlePositionError,
    options
  );
}

// Solicitud en tiempo real: watchPosition
function toggleWatchPosition() {
  if (!('geolocation' in navigator)) {
    showNotification('Tu navegador no soporta Geolocation API.', 'error', '❌');
    return;
  }

  if (watchId !== null) {
    // Detener seguimiento
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    btnWatchLocation.classList.remove('active');
    watchBtnText.textContent = 'Iniciar Seguimiento en Vivo';
    addLog('Seguimiento en vivo detenido (clearWatch).', 'info');
    showNotification('Seguimiento continuo desactivado.', 'info', '⏹️');
  } else {
    // Iniciar seguimiento
    const options = getGeolocationOptions();
    addLog('Iniciando seguimiento continuo con navigator.geolocation.watchPosition()...', 'info');
    
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        addLog('Actualización de posición recibida en vivo.', 'info');
        handlePositionSuccess(pos);
      },
      handlePositionError,
      options
    );

    btnWatchLocation.classList.add('active');
    watchBtnText.textContent = 'Detener Seguimiento en Vivo';
    showNotification('Seguimiento GPS en vivo activado.', 'success', '📡');
  }
}

// ==========================================================================
// 6. Utilidades (Copiar portapapeles)
// ==========================================================================
async function copyToClipboard(text, btnElement) {
  if (!text || text.includes('--')) {
    showNotification('Aún no hay coordenadas para copiar.', 'info', 'ℹ️');
    return;
  }
  try {
    await navigator.clipboard.writeText(text.replace('°', ''));
    const originalText = btnElement.textContent;
    btnElement.textContent = '¡Copiado!';
    setTimeout(() => {
      btnElement.textContent = originalText;
    }, 1500);
  } catch {
    showNotification('No se pudo copiar al portapapeles.', 'error', '❌');
  }
}

// ==========================================================================
// 7. Event Listeners e Inicialización
// ==========================================================================
btnCheckPermissions.addEventListener('click', () => {
  checkGeolocationPermission();
  checkOtherPermissions();
});

btnGetLocation.addEventListener('click', requestCurrentPosition);
btnWatchLocation.addEventListener('click', toggleWatchPosition);

copyLatBtn.addEventListener('click', () => copyToClipboard(valLatitude.textContent, copyLatBtn));
copyLngBtn.addEventListener('click', () => copyToClipboard(valLongitude.textContent, copyLngBtn));

// Carga inicial
window.addEventListener('DOMContentLoaded', () => {
  addLog('DOM cargado. Inicializando verificaciones...', 'info');
  initMap();
  checkGeolocationPermission();
  checkOtherPermissions();
});
