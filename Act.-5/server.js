/**
 * ============================================================================
 * SERVIDOR LOCAL HTTP - EJERCICIO 5: CACHÉ DINÁMICA CON FALLBACK A INDEXEDDB
 * ============================================================================
 * Servidor ligero de desarrollo en Node.js nativo (sin dependencias npm).
 * Incluye servidor de archivos estáticos y endpoint REST mock (/api/articles).
 *
 * Uso:
 *   node server.js
 *
 * Acceso en el navegador:
 *   http://localhost:3005
 * ============================================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3005;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Datos de prueba para el endpoint mock local
const SAMPLE_ARTICLES = {
  source: 'Mock REST Server Local (Node.js)',
  generatedAt: new Date().toISOString(),
  articles: [
    {
      id: 101,
      title: 'Estrategias Avanzadas de Caché Web: Network-First vs Stale-While-Revalidate',
      category: 'Arquitectura Web',
      body: 'La estrategia Network-First prioriza los datos en tiempo real de la red, recurriendo a IndexedDB o Cache API en caso de fallo de conexión. Por otro lado, Stale-While-Revalidate entrega respuesta instantánea y revalida en background.',
      price: 29.99
    },
    {
      id: 102,
      title: 'Persistencia de Datos Asíncrona con IndexedDB en Aplicaciones Modernas',
      category: 'Almacenamiento Local',
      body: 'IndexedDB permite persistir estructuras complejas de objetos JSON, transacciones ACID y búsqueda por índices secundarios sin el límite de 5MB presente en LocalStorage.',
      price: 49.50
    },
    {
      id: 103,
      title: 'Diseño de Aplicaciones Offline-First: Resiliencia ante Pérdida de Conectividad',
      category: 'PWA & Rendimiento',
      body: 'Garantizar que una interfaz de usuario continúe siendo funcional sin red mediante detección de eventos online/offline y fallbacks reactivos mejora drásticamente la retención del usuario.',
      price: 19.95
    },
    {
      id: 104,
      title: 'Optimización de Peticiones Asíncronas con Fetch API y AbortController',
      category: 'JavaScript Moderno',
      body: 'El uso de AbortController permite establecer tiempos máximos de espera (timeouts) estrictos para abortar peticiones colgadas y activar el fallback de caché rápidamente.',
      price: 34.00
    }
  ]
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];

  // Habilitar CORS para pruebas de API
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Endpoint REST Mock Local
  if (reqPath === '/api/articles') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    const responsePayload = {
      ...SAMPLE_ARTICLES,
      timestamp: Date.now(),
      status: 'success'
    };
    res.end(JSON.stringify(responsePayload, null, 2));
    return;
  }

  // Rutas de archivos estáticos
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const filePath = path.join(__dirname, reqPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found - El archivo solicitado no existe en Act.-5.');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`500 Error del Servidor: ${err.code}`);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log('==================================================================');
  console.log('🚀 SERVIDOR LOCAL ACT.-5 INICIADO CON ÉXITO');
  console.log('==================================================================');
  console.log(`🌐 Aplicación Web:    http://localhost:${PORT}`);
  console.log(`📡 Mock REST API:     http://localhost:${PORT}/api/articles`);
  console.log('==================================================================');
  console.log('Presiona Ctrl + C para detener el servidor.');
});
