// Script to generate high-quality PNG icons for notifications without external dependencies
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPng(width, height, drawFn) {
  // RGBA buffer
  const rawData = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * 4 + 1);
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type (RGBA)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace
  const ihdrChunk = createChunk('IHDR', ihdr);

  // IDAT chunk
  const idatChunk = createChunk('IDAT', compressedData);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(4 + 4 + length + 4);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crcData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = crc32(crcData);
  chunk.writeUInt32BE(crc, 8 + length);
  return chunk;
}

function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }

  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

// Ensure icons folder exists
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1. App / Bell Notification Icon (192x192) - Glowing Indigo Bell
const icon192 = createPng(192, 192, (x, y, w, h) => {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Rounded background circle with gradient
  const rBg = 86;
  if (dist > rBg) {
    if (dist <= rBg + 1.5) {
      const alpha = Math.max(0, Math.min(255, Math.floor((rBg + 1.5 - dist) * 255)));
      return [99, 102, 241, alpha];
    }
    return [0, 0, 0, 0];
  }

  // Bell shape logic inside circle
  // Normalized coords inside circle [-1 to 1]
  const nx = (x - cx) / 55;
  const ny = (y - cy) / 55;

  // Bell head dome
  const inDome = (nx * nx + (ny + 0.1) * (ny + 0.1) <= 0.65) && (ny <= 0.4);
  // Bell flare base
  const inFlare = (ny >= 0.2 && ny <= 0.55 && Math.abs(nx) <= (0.4 + (ny - 0.2) * 1.2));
  // Bell clapper
  const inClapper = (nx * nx + (ny - 0.72) * (ny - 0.72) <= 0.04);
  // Top loop
  const inLoop = (nx * nx + (ny + 0.75) * (ny + 0.75) <= 0.035);

  const isBell = (inDome || inFlare || inClapper || inLoop);

  if (isBell) {
    // White/amber bell with subtle glow
    return [255, 255, 255, 255];
  }

  // Background gradient: Indigo to Violet (0x6366F1 to 0x8B5CF6)
  const t = (y / h);
  const r = Math.round(79 + (139 - 79) * t);
  const g = Math.round(70 + (92 - 70) * t);
  const b = Math.round(229 + (246 - 229) * t);
  return [r, g, b, 255];
});

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), icon192);

// 2. Badge Icon (72x72) - Monochrome bell silhouette on transparent for Android / Desktop status bar
const badge72 = createPng(72, 72, (x, y, w, h) => {
  const cx = w / 2;
  const cy = h / 2;
  const nx = (x - cx) / 22;
  const ny = (y - cy) / 22;

  const inDome = (nx * nx + (ny + 0.1) * (ny + 0.1) <= 0.65) && (ny <= 0.4);
  const inFlare = (ny >= 0.2 && ny <= 0.55 && Math.abs(nx) <= (0.4 + (ny - 0.2) * 1.2));
  const inClapper = (nx * nx + (ny - 0.72) * (ny - 0.72) <= 0.04);
  const inLoop = (nx * nx + (ny + 0.75) * (ny + 0.75) <= 0.035);

  if (inDome || inFlare || inClapper || inLoop) {
    return [255, 255, 255, 255];
  }
  return [0, 0, 0, 0];
});

fs.writeFileSync(path.join(iconsDir, 'badge-72.png'), badge72);

// 3. Preset Icons:
// Urgent Alert Icon (192x192) - Crimson Flame / Exclamation
const urgentIcon = createPng(192, 192, (x, y, w, h) => {
  const cx = w / 2;
  const cy = h / 2;
  const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
  if (dist > 86) return [0, 0, 0, 0];

  const nx = (x - cx) / 55;
  const ny = (y - cy) / 55;
  // Exclamation mark
  const inBar = Math.abs(nx) <= 0.18 && ny >= -0.65 && ny <= 0.25;
  const inDot = (nx * nx + (ny - 0.6) * (ny - 0.6) <= 0.035);

  if (inBar || inDot) return [255, 255, 255, 255];

  // Crimson red gradient
  const t = y / h;
  return [Math.round(239 - 30 * t), Math.round(68 - 30 * t), Math.round(68 - 30 * t), 255];
});
fs.writeFileSync(path.join(iconsDir, 'urgent.png'), urgentIcon);

// Success / Check Icon (192x192) - Emerald Green
const successIcon = createPng(192, 192, (x, y, w, h) => {
  const cx = w / 2;
  const cy = h / 2;
  const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
  if (dist > 86) return [0, 0, 0, 0];

  const nx = (x - cx) / 55;
  const ny = (y - cy) / 55;
  // Checkmark line equations
  const onCheck1 = (nx >= -0.5 && nx <= -0.1 && Math.abs(ny - (nx * 0.9 + 0.1)) < 0.15);
  const onCheck2 = (nx >= -0.1 && nx <= 0.6 && Math.abs(ny - (-nx * 1.1 - 0.1)) < 0.15);

  if (onCheck1 || onCheck2) return [255, 255, 255, 255];

  // Emerald gradient
  const t = y / h;
  return [Math.round(16 + 10 * t), Math.round(185 - 20 * t), Math.round(129 - 20 * t), 255];
});
fs.writeFileSync(path.join(iconsDir, 'success.png'), successIcon);

console.log('✅ Iconos PNG generados exitosamente en Act.-3/icons/');
