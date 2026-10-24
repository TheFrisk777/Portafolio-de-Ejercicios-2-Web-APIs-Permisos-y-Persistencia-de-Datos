/**
 * script.js - Lógica de cliente para Ejercicio 3
 * Notificaciones Push Locales con Service Worker
 * 
 * Gestiona:
 * 1. Registro e inspección del Service Worker (sw.js)
 * 2. Solicitud de permisos (Notification.requestPermission())
 * 3. Configuración de notificaciones (título, cuerpo, icono, vibración, tag, acciones)
 * 4. Disparo mediante envío de mensaje al Service Worker (self.registration.showNotification)
 * 5. Escucha de eventos bidireccionales (clic, despacho, cierre)
 * 6. Síntesis de sonido con Web Audio API y prueba de vibración con navigator.vibrate
 */

// ==========================================================================
// 1. Constantes y Presets
// ==========================================================================
const PRESETS = {
  reminder: {
    title: '¡Recordatorio de Actividad!',
    body: 'Es hora de revisar el avance de los ejercicios en tu plataforma.',
    icon: 'icons/icon-192.png',
    vibrate: '200, 100, 200',
    tag: 'act3-reminder',
    sound: 'bell',
    renotify: true,
    requireInteraction: false
  },
  urgent: {
    title: '⚠️ Alerta Crítica del Sistema',
    body: 'Se ha detectado una actualización prioritaria que requiere tu atención inmediata.',
    icon: 'icons/urgent.png',
    vibrate: '300, 100, 300, 100, 400',
    tag: 'act3-urgent',
    sound: 'urgent',
    renotify: true,
    requireInteraction: true
  },
  task: {
    title: '✅ Tarea Guardada con Éxito',
    body: 'Todos los cambios fueron sincronizados y validados por el Service Worker.',
    icon: 'icons/success.png',
    vibrate: '150, 80, 150',
    tag: 'act3-success',
    sound: 'chime',
    renotify: false,
    requireInteraction: false
  },
  message: {
    title: '💬 Nuevo Mensaje Directo',
    body: 'Profesor: Recuerda subir el código de tu Ejercicio 3 hoy.',
    icon: 'icons/icon-192.png',
    vibrate: '100, 50, 100',
    tag: 'act3-message',
    sound: 'chime',
    renotify: true,
    requireInteraction: false
  }
};

// Elementos del DOM
const elements = {
  // Estados y Badges
  swBadge: document.getElementById('swBadge'),
  swStatusText: document.getElementById('swStatusText'),
  swDetails: document.getElementById('swDetails'),

  permBadge: document.getElementById('permBadge'),
  permStatusText: document.getElementById('permStatusText'),
  permDetails: document.getElementById('permDetails'),

  vibBadge: document.getElementById('vibBadge'),
  vibStatusText: document.getElementById('vibStatusText'),
  vibDetails: document.getElementById('vibDetails'),

  // Banner
  permissionBanner: document.getElementById('permissionBanner'),
  bannerTitle: document.getElementById('bannerTitle'),
  bannerDesc: document.getElementById('bannerDesc'),
  btnRequestPermission: document.getElementById('btnRequestPermission'),

  // Formulario
  notifTitle: document.getElementById('notifTitle'),
  notifBody: document.getElementById('notifBody'),
  notifVibrate: document.getElementById('notifVibrate'),
  notifTag: document.getElementById('notifTag'),
  notifSoundChime: document.getElementById('notifSoundChime'),
  notifRenotify: document.getElementById('notifRenotify'),
  notifRequireInteraction: document.getElementById('notifRequireInteraction'),
  btnTestHaptics: document.getElementById('btnTestHaptics'),
  btnDispatchSW: document.getElementById('btnDispatchSW'),
  btnDispatchDelayed: document.getElementById('btnDispatchDelayed'),

  // Mockup en vivo
  mockupTitle: document.getElementById('mockupTitle'),
  mockupBody: document.getElementById('mockupBody'),
  mockupIcon: document.getElementById('mockupIcon'),
  mockupTime: document.getElementById('mockupTime'),
  mockupVibeBadge: document.getElementById('mockupVibeBadge'),
  mockupTagBadge: document.getElementById('mockupTagBadge'),

  // Consola y Toasts
  consoleBody: document.getElementById('consoleBody'),
  btnClearConsole: document.getElementById('btnClearConsole'),
  toastContainer: document.getElementById('toastContainer')
};

// Variable global para almacenar el registro activo del SW
let swRegistration = null;

// ==========================================================================
// 2. Inicialización de la Aplicación
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  logToConsole('SISTEMA', 'Inicializando Ejercicio 3...', 'tag-sys');

  // 1. Verificar soporte de Hardware de Vibración
  checkVibrationSupport();

  // 2. Verificar estado actual de permisos de notificación
  updatePermissionUI(Notification.permission);

  // 3. Registrar Service Worker
  await registerServiceWorker();

  // 4. Configurar escuchas de eventos en la UI
  setupEventListeners();

  // 5. Inicializar vista previa
  updateLiveMockup();
});

// ==========================================================================
// 3. Registro e Inspección del Service Worker
// ==========================================================================
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    elements.swBadge.className = 'status-pill pill-danger';
    elements.swStatusText.textContent = 'No Soportado';
    elements.swDetails.textContent = 'Tu navegador no soporta Service Workers';
    logToConsole('ERROR', 'El navegador no soporta Service Workers', 'tag-err');
    showToast('Tu navegador no soporta Service Workers.', 'warning');
    return;
  }

  try {
    logToConsole('SW', 'Registrando Service Worker (sw.js)...', 'tag-sw');
    
    // Registrar el archivo sw.js en la raíz del alcance de este directorio
    swRegistration = await navigator.serviceWorker.register('sw.js', { scope: './' });

    // Determinar estado actual
    let status = 'Registrado';
    if (swRegistration.active) {
      status = 'Activo';
    } else if (swRegistration.installing) {
      status = 'Instalando';
    } else if (swRegistration.waiting) {
      status = 'En Espera';
    }

    elements.swBadge.className = 'status-pill pill-success';
    elements.swStatusText.textContent = status;
    elements.swDetails.textContent = `Scope: ${swRegistration.scope.replace(window.location.origin, '')}`;
    logToConsole('SW', `Service Worker listo con alcance: ${swRegistration.scope}`, 'tag-sw');

    // Escuchar cambios de control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      logToConsole('SW', 'Nuevo Service Worker ha tomado el control.', 'tag-sw');
      elements.swStatusText.textContent = 'Activo (Actualizado)';
    });

    // Escuchar mensajes entrantes desde el Service Worker
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

  } catch (error) {
    console.error('Error al registrar Service Worker:', error);
    elements.swBadge.className = 'status-pill pill-danger';
    elements.swStatusText.textContent = 'Error';
    elements.swDetails.textContent = error.message;
    logToConsole('ERROR', `Fallo al registrar SW: ${error.message}`, 'tag-err');

    if (window.location.protocol === 'file:') {
      logToConsole('ADVERTENCIA', 'Los Service Workers NO funcionan bajo el protocolo file://. Debes usar http://localhost:3002', 'tag-err');
      showToast('Abre la web mediante el servidor local http://localhost:3002 para usar Service Workers.', 'warning');
    }
  }
}

// ==========================================================================
// 4. Gestión de Permisos de Notificación (Notification.requestPermission)
// ==========================================================================
function updatePermissionUI(permission) {
  elements.permDetails.textContent = `Notification.permission: ${permission}`;

  if (permission === 'granted') {
    elements.permBadge.className = 'status-pill pill-success';
    elements.permStatusText.textContent = 'Concedido';

    elements.permissionBanner.className = 'permission-banner banner-success';
    elements.bannerTitle.textContent = '✅ Permisos de Notificación Otorgados';
    elements.bannerDesc.textContent = 'El navegador y el Service Worker tienen autorización para mostrar notificaciones nativas en tu pantalla.';
    elements.btnRequestPermission.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      Permiso Activo
    `;
    elements.btnRequestPermission.classList.remove('btn-glow');
    elements.btnRequestPermission.disabled = true;

  } else if (permission === 'denied') {
    elements.permBadge.className = 'status-pill pill-danger';
    elements.permStatusText.textContent = 'Bloqueado';

    elements.permissionBanner.className = 'permission-banner banner-danger';
    elements.bannerTitle.textContent = '🚫 Notificaciones Bloqueadas por el Usuario';
    elements.bannerDesc.textContent = 'Has bloqueado los permisos. Para activarlos: haz clic en el icono del candado en la barra de direcciones de tu navegador y cambia Notificaciones a "Permitir".';
    elements.btnRequestPermission.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
      </svg>
      Permiso Bloqueado
    `;
    elements.btnRequestPermission.classList.remove('btn-glow');
    elements.btnRequestPermission.disabled = false;

  } else {
    // 'default'
    elements.permBadge.className = 'status-pill pill-warning';
    elements.permStatusText.textContent = 'Pendiente';

    elements.permissionBanner.className = 'permission-banner banner-warning';
    elements.bannerTitle.textContent = '🔔 Permiso de Notificación Requerido';
    elements.bannerDesc.textContent = 'Para que el Service Worker pueda desplegar notificaciones nativas en el sistema operativo, debes otorgar permiso explícito al sitio web.';
    elements.btnRequestPermission.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      Solicitar Permiso
    `;
    elements.btnRequestPermission.classList.add('btn-glow');
    elements.btnRequestPermission.disabled = false;
  }
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    logToConsole('ERROR', 'Este navegador no tiene soporte para la API Notification.', 'tag-err');
    showToast('Este navegador no soporta notificaciones.', 'warning');
    return;
  }

  logToConsole('PERMISO', 'Ejecutando Notification.requestPermission()...', 'tag-perm');

  try {
    // Solicitud nativa asíncrona estándar
    const permission = await Notification.requestPermission();
    logToConsole('PERMISO', `Resultado obtenido: "${permission}"`, 'tag-perm');
    updatePermissionUI(permission);

    if (permission === 'granted') {
      showToast('¡Permiso concedido! Ahora puedes emitir notificaciones.', 'success');
      playSynthesizedSound('chime');
    } else if (permission === 'denied') {
      showToast('Permiso denegado. Revisa la configuración de tu navegador.', 'warning');
    }
  } catch (err) {
    console.error('Error al solicitar permiso:', err);
    logToConsole('ERROR', `Fallo al solicitar permiso: ${err.message}`, 'tag-err');
  }
}

// ==========================================================================
// 5. Diagnóstico de Soporte de Vibración
// ==========================================================================
function checkVibrationSupport() {
  if ('vibrate' in navigator) {
    elements.vibBadge.className = 'status-pill pill-success';
    elements.vibStatusText.textContent = 'Soportado';
    elements.vibDetails.textContent = 'navigator.vibrate activo';
  } else {
    elements.vibBadge.className = 'status-pill pill-info';
    elements.vibStatusText.textContent = 'Simulado';
    elements.vibDetails.textContent = 'Solo físico en teléfonos móviles';
  }
}

// ==========================================================================
// 6. Disparo de Notificaciones Vía Service Worker (self.registration.showNotification)
// ==========================================================================
async function dispatchNotificationViaSW(delaySeconds = 0) {
  // 1. Validar permisos
  if (Notification.permission !== 'granted') {
    logToConsole('AVISO', 'Solicitando permiso de notificación previo al disparo...', 'tag-perm');
    const perm = await Notification.requestPermission();
    updatePermissionUI(perm);
    if (perm !== 'granted') {
      showToast('No se puede mostrar la notificación: Permiso denegado o no otorgado.', 'warning');
      return;
    }
  }

  // 2. Obtener datos del formulario
  const title = elements.notifTitle.value.trim() || 'Notificación Local';
  const body = elements.notifBody.value.trim() || 'Contenido de la notificación';
  const iconInput = document.querySelector('input[name="iconOption"]:checked');
  const icon = iconInput ? iconInput.value : 'icons/icon-192.png';
  const vibratePattern = parseVibrationPattern(elements.notifVibrate.value);
  const tag = elements.notifTag.value.trim() || 'act3-tag';
  const soundChoice = elements.notifSoundChime.value;
  const renotify = elements.notifRenotify.checked;
  const requireInteraction = elements.notifRequireInteraction.checked;

  // 3. Empaquetar opciones para self.registration.showNotification
  const options = {
    body: body,
    icon: icon,
    badge: 'icons/badge-72.png',
    vibrate: vibratePattern,
    tag: tag,
    renotify: renotify,
    requireInteraction: requireInteraction,
    data: {
      url: window.location.href,
      timestamp: Date.now(),
      dispatchedBy: 'Act.-3 Service Worker Local Push'
    },
    actions: [
      { action: 'open_app', title: 'Abrir App' },
      { action: 'dismiss', title: 'Cerrar' }
    ]
  };

  // 4. Si hay retardo (para probar en segundo plano / minimizado)
  if (delaySeconds > 0) {
    logToConsole('TEMPORIZADOR', `Notificación programada para dispararse en ${delaySeconds}s. ¡Minimiza la ventana para ver el push en el S.O.!`, 'tag-dispatch');
    showToast(`Disparando en ${delaySeconds}s. ¡Minimiza o cambia de pestaña para probar!`, 'info');

    // Animación visual de cuenta regresiva en el botón
    let remaining = delaySeconds;
    elements.btnDispatchDelayed.disabled = true;
    const interval = setInterval(() => {
      remaining--;
      if (remaining > 0) {
        elements.btnDispatchDelayed.querySelector('span').textContent = `Disparando en ${remaining}s...`;
      } else {
        clearInterval(interval);
        elements.btnDispatchDelayed.disabled = false;
        elements.btnDispatchDelayed.querySelector('span').textContent = 'Probar en 4 Segundos (Segundo Plano)';
      }
    }, 1000);
  }

  // 5. Enviar mensaje al Service Worker para ejecutar self.registration.showNotification
  try {
    const reg = await navigator.serviceWorker.ready;

    // Disparar vibración física y sonido en cliente
    triggerVibration(vibratePattern);
    playSynthesizedSound(soundChoice);

    logToConsole('DISPARO', `Enviando mensaje al Service Worker: "${title}"`, 'tag-dispatch');

    // Mensaje estructurado hacia sw.js
    const messagePayload = {
      type: 'SHOW_NOTIFICATION',
      title: title,
      options: options,
      delayMs: delaySeconds * 1000
    };

    if (reg.active) {
      reg.active.postMessage(messagePayload);
    } else if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(messagePayload);
    } else {
      // Si aún no hay controller activo, disparar directamente desde el registration del cliente
      logToConsole('SW', 'Invocando showNotification directamente desde registration...', 'tag-sw');
      if (delaySeconds > 0) {
        setTimeout(() => reg.showNotification(title, options), delaySeconds * 1000);
      } else {
        await reg.showNotification(title, options);
      }
    }

  } catch (error) {
    console.error('Error al despachar notificación:', error);
    logToConsole('ERROR', `Error al comunicar con Service Worker: ${error.message}`, 'tag-err');
    showToast(`Error al emitir notificación: ${error.message}`, 'warning');
  }
}

// ==========================================================================
// 7. Manejo de Mensajes Recibidos desde el Service Worker
// ==========================================================================
function handleServiceWorkerMessage(event) {
  if (!event.data) return;
  const { type, title, tag, action, error } = event.data;

  switch (type) {
    case 'NOTIFICATION_DISPATCHED':
      logToConsole('SW_EVENTO', `✅ self.registration.showNotification exitoso: "${title}" (tag: ${tag})`, 'tag-dispatch');
      showToast(`Notificación local emitida: "${title}"`, 'success');
      break;

    case 'NOTIFICATION_CLICKED':
      logToConsole('INTERACCIÓN', `🖱️ Clic en notificación "${title}". Acción: [${action}]`, 'tag-click');
      showToast(`Interacción capturada en Service Worker: ${action}`, 'info');
      break;

    case 'NOTIFICATION_DISMISSED':
      logToConsole('INTERACCIÓN', `❌ Notificación descartada por el usuario: "${title}"`, 'tag-sys');
      break;

    case 'NOTIFICATION_ERROR':
      logToConsole('ERROR_SW', `Fallo dentro del Service Worker: ${error}`, 'tag-err');
      showToast(`Error en Service Worker: ${error}`, 'warning');
      break;

    default:
      logToConsole('SW_MSG', JSON.stringify(event.data), 'tag-sw');
  }
}

// ==========================================================================
// 8. Motor de Vibración y Síntesis de Audio Web
// ==========================================================================
function parseVibrationPattern(str) {
  if (!str) return [200, 100, 200];
  const parts = str.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0);
  return parts.length > 0 ? parts : [200, 100, 200];
}

function triggerVibration(pattern) {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
      logToConsole('HÁPTICA', `Ejecutando navigator.vibrate([${pattern.join(', ')}])`, 'tag-sys');
    } catch (e) {
      console.warn('Vibrate falló:', e);
    }
  }
}

// Síntesis de Sonidos con Web Audio API (Cero dependencias)
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playSynthesizedSound(type) {
  if (type === 'none') return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  if (type === 'bell') {
    // Campana de notificación clásica armónica
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now); // La5
    osc1.frequency.exponentialRampToValueAtTime(440, now + 0.6);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1760, now);
    osc2.frequency.exponentialRampToValueAtTime(880, now + 0.4);

    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.7);
    osc2.stop(now + 0.7);

  } else if (type === 'urgent') {
    // Alerta de doble pulso agudo
    [0, 0.15].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(950, now + offset);
      gain.gain.setValueAtTime(0.15, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.12);
    });

  } else if (type === 'chime') {
    // Arpegio ascendente suave (Do - Mi - Sol)
    const freqs = [523.25, 659.25, 783.99];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.08;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.18, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  }
}

// ==========================================================================
// 9. Vista Previa en Vivo (Live OS Mockup)
// ==========================================================================
function updateLiveMockup() {
  const title = elements.notifTitle.value.trim() || '¡Recordatorio de Actividad!';
  const body = elements.notifBody.value.trim() || 'Esta es una notificación local enviada desde el Service Worker.';
  const iconInput = document.querySelector('input[name="iconOption"]:checked');
  const iconSrc = iconInput ? iconInput.value : 'icons/icon-192.png';
  const vibe = elements.notifVibrate.value.trim() || '200, 100, 200';
  const tag = elements.notifTag.value.trim() || 'act3-notif';

  elements.mockupTitle.textContent = title;
  elements.mockupBody.textContent = body;
  elements.mockupIcon.src = iconSrc;
  elements.mockupVibeBadge.textContent = `📳 [${vibe}] ms`;
  elements.mockupTagBadge.textContent = `🏷️ ${tag}`;
}

// ==========================================================================
// 10. Configuración de Presets y Escuchas
// ==========================================================================
function setupEventListeners() {
  // Solicitud de permisos
  elements.btnRequestPermission.addEventListener('click', requestNotificationPermission);

  // Botón de disparo inmediato
  elements.btnDispatchSW.addEventListener('click', () => dispatchNotificationViaSW(0));

  // Botón de disparo con retardo
  elements.btnDispatchDelayed.addEventListener('click', () => dispatchNotificationViaSW(4));

  // Prueba directa de vibración háptica
  elements.btnTestHaptics.addEventListener('click', () => {
    const pattern = parseVibrationPattern(elements.notifVibrate.value);
    triggerVibration(pattern);
    playSynthesizedSound('bell');
    showToast(`Probando vibración: [${pattern.join(', ')}] ms`, 'info');
  });

  // Limpiar consola
  elements.btnClearConsole.addEventListener('click', () => {
    elements.consoleBody.innerHTML = '';
    logToConsole('SISTEMA', 'Consola reiniciada.', 'tag-sys');
  });

  // Sincronización en tiempo real del formulario con la vista previa
  elements.notifTitle.addEventListener('input', updateLiveMockup);
  elements.notifBody.addEventListener('input', updateLiveMockup);
  elements.notifVibrate.addEventListener('input', updateLiveMockup);
  elements.notifTag.addEventListener('input', updateLiveMockup);

  document.querySelectorAll('input[name="iconOption"]').forEach(radio => {
    radio.addEventListener('change', updateLiveMockup);
  });

  // Presets
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const presetKey = btn.dataset.preset;
      const preset = PRESETS[presetKey];
      if (!preset) return;

      elements.notifTitle.value = preset.title;
      elements.notifBody.value = preset.body;
      elements.notifVibrate.value = preset.vibrate;
      elements.notifTag.value = preset.tag;
      elements.notifSoundChime.value = preset.sound;
      elements.notifRenotify.checked = preset.renotify;
      elements.notifRequireInteraction.checked = preset.requireInteraction;

      // Seleccionar icono correspondiente
      const targetRadio = document.querySelector(`input[name="iconOption"][value="${preset.icon}"]`);
      if (targetRadio) {
        targetRadio.checked = true;
      }

      updateLiveMockup();
      logToConsole('PRESET', `Plantilla seleccionada: "${btn.querySelector('strong').textContent}"`, 'tag-sys');
    });
  });
}

// ==========================================================================
// 11. Utilidades: Consola en Vivo y Toasts
// ==========================================================================
function logToConsole(tag, message, tagClass = 'tag-sys') {
  const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `
    <span class="log-time">${time}</span>
    <span class="log-tag ${tagClass}">${tag}</span>
    <span class="log-msg">${escapeHtml(message)}</span>
  `;

  elements.consoleBody.appendChild(entry);
  elements.consoleBody.scrollTop = elements.consoleBody.scrollHeight;
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${escapeHtml(message)}</span>
  `;

  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'fadeOutToast 0.3s forwards';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3800);
}

function escapeHtml(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
