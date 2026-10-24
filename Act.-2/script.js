/**
 * ==========================================================================
 * Ejercicio 2: Captura de Medios con Cámara Web/Móvil
 * API: navigator.mediaDevices.getUserMedia + HTML <video> + HTML5 <canvas>
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- Elementos del DOM ---
  // Selectores y Controles
  const cameraSelect = document.getElementById('cameraSelect');
  const facingModeSelect = document.getElementById('facingModeSelect');
  const resolutionSelect = document.getElementById('resolutionSelect');
  const toggleMirror = document.getElementById('toggleMirror');
  const toggleSound = document.getElementById('toggleSound');
  const toggleGrid = document.getElementById('toggleGrid');

  // Botones Principales
  const btnStartCamera = document.getElementById('btnStartCamera');
  const btnStopCamera = document.getElementById('btnStopCamera');
  const btnCapturePhoto = document.getElementById('btnCapturePhoto');

  // Alerta
  const statusAlert = document.getElementById('statusAlert');
  const alertIcon = document.getElementById('alertIcon');
  const alertTitle = document.getElementById('alertTitle');
  const alertMessage = document.getElementById('alertMessage');
  const alertCloseBtn = document.getElementById('alertCloseBtn');

  // Flujo en Vivo (<video>)
  const videoElement = document.getElementById('videoElement');
  const videoPlaceholder = document.getElementById('videoPlaceholder');
  const streamStatusPill = document.getElementById('streamStatusPill');
  const streamDot = document.getElementById('streamDot');
  const streamStatusText = document.getElementById('streamStatusText');
  const viewfinderGrid = document.getElementById('viewfinderGrid');
  const focusReticle = document.getElementById('focusReticle');

  // Telemetría en Vivo
  const currentResolution = document.getElementById('currentResolution');
  const currentDeviceLabel = document.getElementById('currentDeviceLabel');
  const currentFrameRate = document.getElementById('currentFrameRate');

  // Fotografía Estática (<canvas>)
  const photoCanvas = document.getElementById('photoCanvas');
  const canvasPlaceholder = document.getElementById('canvasPlaceholder');
  const photoStatusBadge = document.getElementById('photoStatusBadge');
  const photoBadgeText = document.getElementById('photoBadgeText');
  const photoMetadata = document.getElementById('photoMetadata');
  const photoDimensions = document.getElementById('photoDimensions');
  const photoTimestamp = document.getElementById('photoTimestamp');
  const filtersPanel = document.getElementById('filtersPanel');
  const filterChips = document.querySelectorAll('.filter-chip');
  const photoActions = document.getElementById('photoActions');

  // Botones de Foto
  const btnDownloadPhoto = document.getElementById('btnDownloadPhoto');
  const btnCopyPhoto = document.getElementById('btnCopyPhoto');
  const btnClearPhoto = document.getElementById('btnClearPhoto');

  // Galería
  const gallerySection = document.getElementById('gallerySection');
  const galleryStrip = document.getElementById('galleryStrip');
  const btnClearGallery = document.getElementById('btnClearGallery');

  // Efecto Flash
  const shutterFlash = document.getElementById('shutterFlash');

  // --- Estado de la Aplicación ---
  let currentStream = null;
  let rawCapturedImageData = null; // Copia original para aplicar filtros sin pérdida
  let audioCtx = null;
  const sessionSnapshots = [];

  // --- 1. Inicialización y Soporte de API ---
  function checkAPISupport() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showAlert(
        'error',
        'API no compatible',
        'Tu navegador no soporta navigator.mediaDevices.getUserMedia o estás en un contexto inseguro (HTTP). Se requiere HTTPS o http://localhost.'
      );
      btnStartCamera.disabled = true;
      return false;
    }

    // Comprobar si estamos en contexto seguro
    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      showAlert(
        'warning',
        'Contexto Inseguro Detectado',
        'El acceso a la cámara exige un origen seguro (HTTPS o localhost). Si pruebas desde otro dispositivo en tu red local, usa un túnel HTTPS o localhost.'
      );
    }

    return true;
  }

  // --- 2. Listar Dispositivos de Video Disponibles ---
  async function enumerateVideoDevices() {
    try {
      if (!navigator.mediaDevices.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');

      cameraSelect.innerHTML = '';

      if (videoDevices.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Cámara predeterminada del sistema';
        cameraSelect.appendChild(option);
        return;
      }

      videoDevices.forEach((device, index) => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        // Los navegadores ocultan las etiquetas (labels) hasta que se otorga permiso
        option.textContent = device.label || `Cámara ${index + 1} (${device.deviceId.slice(0, 8)}...)`;
        cameraSelect.appendChild(option);
      });
    } catch (err) {
      console.warn('Error al enumerar dispositivos:', err);
    }
  }

  // --- 3. Construir Restricciones (Constraints) de getUserMedia ---
  function getMediaConstraints() {
    const [targetWidth, targetHeight] = resolutionSelect.value.split('x').map(Number);
    const selectedDeviceId = cameraSelect.value;
    const selectedFacingMode = facingModeSelect.value;

    const videoConstraints = {
      width: { ideal: targetWidth },
      height: { ideal: targetHeight }
    };

    if (selectedDeviceId) {
      // Si el usuario eligió un dispositivo específico
      videoConstraints.deviceId = { exact: selectedDeviceId };
    } else if (selectedFacingMode) {
      // Si prefiere orientación móvil (frontal o trasera)
      videoConstraints.facingMode = { ideal: selectedFacingMode };
    }

    return {
      video: videoConstraints,
      audio: false // Para captura de fotografía sólo requerimos video
    };
  }

  // --- 4. Iniciar Flujo de Video ---
  async function startCamera() {
    if (!checkAPISupport()) return;

    btnStartCamera.disabled = true;
    showAlert('info', 'Solicitando Acceso...', 'Por favor acepta el diálogo de permisos del navegador para permitir el acceso a tu cámara.');

    // Detener cualquier flujo activo antes de iniciar uno nuevo
    stopCameraStream();

    const constraints = getMediaConstraints();

    try {
      // Llamada principal a la API getUserMedia
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      currentStream = stream;

      // Asignar el MediaStream al elemento <video>
      videoElement.srcObject = stream;

      // Evento al cargar los metadatos del video (resolución real negociada)
      videoElement.onloadedmetadata = () => {
        videoElement.play();
        videoPlaceholder.style.display = 'none';
        focusReticle.classList.add('active');

        // Actualizar UI
        updateStreamUI(true);
        updateTelemetry();
        hideAlert();

        // Tras otorgar permiso, las etiquetas de los dispositivos ya están visibles
        enumerateVideoDevices();
      };
    } catch (error) {
      console.error('Error al acceder a getUserMedia:', error);
      handleCameraError(error);
      updateStreamUI(false);
    }
  }

  // --- 5. Detener Flujo de Video ---
  function stopCameraStream() {
    if (currentStream) {
      currentStream.getTracks().forEach(track => {
        track.stop(); // Apaga la luz indicadora del hardware
      });
      currentStream = null;
    }

    if (videoElement.srcObject) {
      videoElement.srcObject = null;
    }

    videoPlaceholder.style.display = 'flex';
    focusReticle.classList.remove('active');
    updateStreamUI(false);

    // Resetear telemetría
    currentResolution.textContent = '-';
    currentDeviceLabel.textContent = '-';
    currentFrameRate.textContent = '-';
  }

  // --- 6. Actualizar UI de Estado del Flujo ---
  function updateStreamUI(isActive) {
    if (isActive) {
      btnStartCamera.disabled = true;
      btnStopCamera.disabled = false;
      btnCapturePhoto.disabled = false;

      streamStatusPill.classList.add('active');
      streamStatusText.textContent = 'Cámara Activa (En Vivo)';
    } else {
      btnStartCamera.disabled = false;
      btnStopCamera.disabled = true;
      btnCapturePhoto.disabled = true;

      streamStatusPill.classList.remove('active');
      streamStatusText.textContent = 'Cámara Inactiva';
    }
  }

  // --- 7. Telemetría de Pista de Video ---
  function updateTelemetry() {
    if (!currentStream) return;

    const videoTrack = currentStream.getVideoTracks()[0];
    if (!videoTrack) return;

    const settings = videoTrack.getSettings ? videoTrack.getSettings() : {};
    const width = videoElement.videoWidth || settings.width || '-';
    const height = videoElement.videoHeight || settings.height || '-';
    const fps = settings.frameRate ? Math.round(settings.frameRate) + ' FPS' : '30 FPS';
    const label = videoTrack.label || 'Cámara estándar';

    currentResolution.textContent = `${width} × ${height} px`;
    currentDeviceLabel.textContent = label;
    currentFrameRate.textContent = fps;
  }

  // --- 8. Manejo Detallado de Errores de getUserMedia ---
  function handleCameraError(error) {
    let title = 'Error al acceder a la cámara';
    let message = error.message || 'Ocurrió un error inesperado al intentar abrir el dispositivo.';

    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      title = 'Permiso Denegado';
      message = 'Has denegado el permiso de acceso a la cámara. Haz clic en el ícono de candado o cámara en la barra de direcciones de tu navegador para restablecer el permiso y recarga la página.';
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      title = 'Cámara No Encontrada';
      message = 'No se detectó ningún dispositivo de captura de video conectado en tu equipo o móvil.';
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      title = 'Cámara en Uso';
      message = 'La cámara ya está siendo utilizada por otra aplicación (como Zoom, Teams o pestaña del navegador). Cierra esas aplicaciones e intenta de nuevo.';
    } else if (error.name === 'OverconstrainedError') {
      title = 'Resolución no Soportada';
      message = 'Tu hardware de video no soporta las restricciones exactas solicitadas. Selecciona una resolución estándar (720p o VGA) y reintenta.';
    } else if (error.name === 'SecurityError') {
      title = 'Restricción de Seguridad';
      message = 'getUserMedia requiere un contexto seguro (HTTPS o localhost). No es posible acceder a la cámara mediante HTTP sin cifrar.';
    }

    showAlert('error', title, message);
  }

  // --- 9. Sonido Sintético de Obturador con Web Audio API ---
  function playShutterSound() {
    if (!toggleSound.checked) return;

    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.09);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      console.warn('Audio no disponible:', e);
    }
  }

  // --- 10. Captura de Fotografía a Canvas HTML5 ---
  function capturePhoto() {
    if (!currentStream || !videoElement.videoWidth) {
      showAlert('warning', 'Cámara no lista', 'Espera a que el flujo de video esté activo y transmitiendo fotogramas.');
      return;
    }

    // Efecto visual flash de disparo
    triggerShutterFlash();

    // Efecto de sonido
    playShutterSound();

    const realWidth = videoElement.videoWidth;
    const realHeight = videoElement.videoHeight;

    // Asignar dimensiones reales exactas al canvas HTML
    photoCanvas.width = realWidth;
    photoCanvas.height = realHeight;

    const ctx = photoCanvas.getContext('2d');

    // Comprobar si el modo espejo está activo
    const isMirrored = toggleMirror.checked;

    ctx.save();
    if (isMirrored) {
      // Invertir horizontalmente para igualar la previsualización selfie
      ctx.translate(realWidth, 0);
      ctx.scale(-1, 1);
    }

    // DIBUJAR EL FOTOGRAMA DEL VIDEO EN EL CANVAS
    ctx.drawImage(videoElement, 0, 0, realWidth, realHeight);
    ctx.restore();

    // Guardar imagen original pura para aplicar filtros sin degradación
    rawCapturedImageData = ctx.getImageData(0, 0, realWidth, realHeight);

    // Resetear filtro a "Original"
    resetFilterChips();

    // Mostrar canvas y ocultar placeholder
    photoCanvas.classList.remove('hidden-canvas');
    canvasPlaceholder.style.display = 'none';

    // Actualizar insignias y metadatos
    photoStatusBadge.classList.remove('status-ready');
    photoStatusBadge.classList.add('status-captured');
    photoBadgeText.textContent = 'Captura Realizada';

    const now = new Date();
    const timeFormatted = now.toLocaleTimeString();
    photoDimensions.textContent = `${realWidth} × ${realHeight} px`;
    photoTimestamp.textContent = timeFormatted;

    // Mostrar paneles de interacción
    filtersPanel.style.display = 'flex';
    photoMetadata.style.display = 'flex';
    photoActions.style.display = 'flex';

    // Guardar snapshot en galería de sesión
    const snapshotDataUrl = photoCanvas.toDataURL('image/png');
    addSnapshotToGallery(snapshotDataUrl, timeFormatted, realWidth, realHeight);
  }

  // --- 11. Efecto Flash de Obturador ---
  function triggerShutterFlash() {
    shutterFlash.classList.remove('flashing');
    void shutterFlash.offsetWidth; // Forzar reflow
    shutterFlash.classList.add('flashing');
  }

  // --- 12. Galería de Sesión ---
  function addSnapshotToGallery(dataUrl, time, width, height) {
    sessionSnapshots.unshift({ dataUrl, time, width, height });
    renderGallery();
  }

  function renderGallery() {
    if (sessionSnapshots.length === 0) {
      gallerySection.style.display = 'none';
      galleryStrip.innerHTML = '';
      return;
    }

    gallerySection.style.display = 'block';
    galleryStrip.innerHTML = '';

    sessionSnapshots.forEach((snap, idx) => {
      const thumb = document.createElement('div');
      thumb.className = 'gallery-thumb';
      thumb.title = `Captura ${idx + 1} - ${snap.time} (${snap.width}x${snap.height})`;
      thumb.innerHTML = `
        <img src="${snap.dataUrl}" alt="Captura ${idx + 1}">
        <div class="thumb-overlay">#${idx + 1} • ${snap.time}</div>
      `;

      // Al hacer clic en una miniatura, restaurarla en el canvas principal
      thumb.addEventListener('click', () => {
        loadSnapshotIntoCanvas(snap.dataUrl, snap.width, snap.height, snap.time);
      });

      galleryStrip.appendChild(thumb);
    });
  }

  function loadSnapshotIntoCanvas(dataUrl, width, height, time) {
    const img = new Image();
    img.onload = () => {
      photoCanvas.width = width;
      photoCanvas.height = height;
      const ctx = photoCanvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      rawCapturedImageData = ctx.getImageData(0, 0, width, height);

      resetFilterChips();
      photoDimensions.textContent = `${width} × ${height} px`;
      photoTimestamp.textContent = `${time} (Restaurada)`;
    };
    img.src = dataUrl;
  }

  // --- 13. Filtros en Canvas ---
  function resetFilterChips() {
    filterChips.forEach(chip => chip.classList.remove('active'));
    const defaultChip = document.querySelector('.filter-chip[data-filter="none"]');
    if (defaultChip) defaultChip.classList.add('active');
  }

  function applyCanvasFilter(filterType) {
    if (!rawCapturedImageData) return;

    const ctx = photoCanvas.getContext('2d');
    const width = photoCanvas.width;
    const height = photoCanvas.height;

    // Restaurar datos originales
    const imgData = new ImageData(
      new Uint8ClampedArray(rawCapturedImageData.data),
      rawCapturedImageData.width,
      rawCapturedImageData.height
    );
    const data = imgData.data;

    if (filterType === 'none') {
      ctx.putImageData(rawCapturedImageData, 0, 0);
      return;
    }

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      switch (filterType) {
        case 'grayscale': {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
          break;
        }
        case 'sepia': {
          data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
          data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
          data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
          break;
        }
        case 'invert': {
          data[i] = 255 - r;
          data[i + 1] = 255 - g;
          data[i + 2] = 255 - b;
          break;
        }
        case 'contrast': {
          const factor = (259 * (128 + 255)) / (255 * (259 - 128));
          data[i] = Math.min(255, Math.max(0, factor * (r - 128) + 128));
          data[i + 1] = Math.min(255, Math.max(0, factor * (g - 128) + 128));
          data[i + 2] = Math.min(255, Math.max(0, factor * (b - 128) + 128));
          break;
        }
        case 'cyberpunk': {
          // Aumento de magenta y cian intenso
          data[i] = Math.min(255, r * 1.35 + 20);
          data[i + 1] = Math.min(255, g * 0.7);
          data[i + 2] = Math.min(255, b * 1.5 + 30);
          break;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  // --- 14. Descarga y Portapapeles ---
  function downloadCapturedPhoto() {
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `foto-captura-${timestamp}.png`;
    link.href = photoCanvas.toDataURL('image/png');
    link.click();
  }

  async function copyPhotoToClipboard() {
    if (!navigator.clipboard || !photoCanvas.toBlob) {
      showAlert('warning', 'Portapapeles no compatible', 'Tu navegador no permite copiar imágenes binarias directamente.');
      return;
    }

    photoCanvas.toBlob(async blob => {
      try {
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        showAlert('success', '¡Copiada con Éxito!', 'La fotografía se copió al portapapeles. Puedes pegarla con Ctrl+V en WhatsApp, Discord, Slack o Paint.');
      } catch (err) {
        console.error('Error al copiar imagen:', err);
        showAlert('warning', 'Permiso Requerido', 'No se pudo escribir en el portapapeles. Asegúrate de conceder permiso.');
      }
    }, 'image/png');
  }

  function clearCapturedPhoto() {
    const ctx = photoCanvas.getContext('2d');
    ctx.clearRect(0, 0, photoCanvas.width, photoCanvas.height);
    rawCapturedImageData = null;

    photoCanvas.classList.add('hidden-canvas');
    canvasPlaceholder.style.display = 'flex';

    photoStatusBadge.classList.remove('status-captured');
    photoStatusBadge.classList.add('status-ready');
    photoBadgeText.textContent = 'En Espera';

    filtersPanel.style.display = 'none';
    photoMetadata.style.display = 'none';
    photoActions.style.display = 'none';
  }

  // --- 15. Sistema de Alertas Visuales ---
  function showAlert(type, title, message) {
    statusAlert.className = `alert-box alert-${type}`;
    alertTitle.textContent = title;
    alertMessage.textContent = message;

    let iconSvg = '';
    if (type === 'error') {
      iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    } else if (type === 'warning') {
      iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    } else if (type === 'success') {
      iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else {
      iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }
    alertIcon.innerHTML = iconSvg;
  }

  function hideAlert() {
    statusAlert.className = 'alert-box alert-hidden';
  }

  // --- 16. Event Listeners ---
  btnStartCamera.addEventListener('click', startCamera);
  btnStopCamera.addEventListener('click', stopCameraStream);
  btnCapturePhoto.addEventListener('click', capturePhoto);

  alertCloseBtn.addEventListener('click', hideAlert);

  toggleMirror.addEventListener('change', () => {
    if (toggleMirror.checked) {
      videoElement.classList.add('mirrored');
    } else {
      videoElement.classList.remove('mirrored');
    }
  });

  toggleGrid.addEventListener('change', () => {
    if (toggleGrid.checked) {
      viewfinderGrid.classList.add('visible');
    } else {
      viewfinderGrid.classList.remove('visible');
    }
  });

  cameraSelect.addEventListener('change', () => {
    if (currentStream) startCamera();
  });

  facingModeSelect.addEventListener('change', () => {
    if (currentStream) startCamera();
  });

  resolutionSelect.addEventListener('change', () => {
    if (currentStream) startCamera();
  });

  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      applyCanvasFilter(chip.getAttribute('data-filter'));
    });
  });

  btnDownloadPhoto.addEventListener('click', downloadCapturedPhoto);
  btnCopyPhoto.addEventListener('click', copyPhotoToClipboard);
  btnClearPhoto.addEventListener('click', clearCapturedPhoto);

  btnClearGallery.addEventListener('click', () => {
    sessionSnapshots.length = 0;
    renderGallery();
  });

  // Liberar cámara si se cierra la pestaña
  window.addEventListener('beforeunload', () => {
    stopCameraStream();
  });

  // --- 17. Inicio Inicial ---
  checkAPISupport();
  enumerateVideoDevices();
});
