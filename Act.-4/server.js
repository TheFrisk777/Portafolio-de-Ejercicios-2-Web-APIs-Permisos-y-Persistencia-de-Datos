/**
 * ============================================================================
 * SERVIDOR LOCAL HTTP - EJERCICIO 4: PERSISTENCIA ASÍNCRONA CON INDEXEDDB
 * ============================================================================
 * Servidor ligero de desarrollo en Node.js nativo (sin dependencias externas).
 * 
 * Uso:
 *   node server.js
 * 
 * Acceso local:
 *   http://localhost:3003
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3003;

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

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
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
        res.end('404 Not Found - El archivo solicitado no existe.');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`500 Error del Servidor: ${err.code}`);
      }
    } else {
      // Cabeceras HTTP óptimas para pruebas locales
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      res.end(content);
    }
  });
});

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

server.listen(PORT, () => {
  const ips = getLocalIpAddresses();
  console.log(`\n======================================================`);
  console.log(`🚀 Ejercicio 4 - Persistencia Asíncrona con IndexedDB`);
  console.log(`======================================================`);
  console.log(`Servidor local activo en:`);
  console.log(`  👉 Local:   http://localhost:${PORT}`);
  ips.forEach(ip => {
    console.log(`  👉 Red:     http://${ip}:${PORT}`);
  });
  console.log(`\nPresiona CTRL + C para detener el servidor.`);
  console.log(`======================================================\n`);
});
