const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3002;

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
        res.end('404 Not Found - Archivo no encontrado');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`Error del Servidor: ${err.code}`);
      }
    } else {
      // Cabecera especial para Service Workers
      const headers = {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      };

      if (path.basename(filePath) === 'sw.js') {
        headers['Service-Worker-Allowed'] = '/';
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      }

      res.writeHead(200, headers);
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
  console.log(`\n======================================================`);
  console.log(`🚀 Ejercicio 3 - Servidor Local de Notificaciones Push`);
  console.log(`📡 Service Worker & Notification API`);
  console.log(`======================================================`);
  console.log(`\n🌐 Acceso Local en esta computadora:`);
  console.log(`   👉 http://localhost:${PORT}`);
  console.log(`   👉 http://127.0.0.1:${PORT}`);

  const ips = getLocalIpAddresses();
  if (ips.length > 0) {
    console.log(`\n📱 Acceso desde teléfono móvil / otros dispositivos en tu red local:`);
    ips.forEach(ip => {
      console.log(`   👉 http://${ip}:${PORT}`);
    });
    console.log(`\n⚠️ NOTA PARA MÓVILES:`);
    console.log(`   Para registrar Service Workers y recibir vibración física en móviles`);
    console.log(`   se requiere un contexto seguro (localhost o HTTPS). Para probar en móvil:`);
    console.log(`   - Usa Chrome Remote Debugging (port forwarding localhost:${PORT} -> localhost:${PORT}), o`);
    console.log(`   - Un túnel temporal seguro HTTPS (como ngrok: 'npx ngrok http ${PORT}').`);
  }
  console.log(`\n⌨️  Presiona Ctrl + C para detener el servidor.\n`);
});
