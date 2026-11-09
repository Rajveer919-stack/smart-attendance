// Bina kisi package ke app ke icons (PNG) banata hai.
// Chalao: node tools/make-icons.js   (project ke root folder se)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'client', 'public', 'icons');
fs.mkdirSync(OUT, { recursive: true });

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = pixel(x / size, y / size);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Doori: point (px,py) se line segment (ax,ay)-(bx,by) tak
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// scale: tick ka size (maskable icon me chhota rakhte hai taki kinare na kate)
function makeIcon(size, { rounded, scale }) {
  return png(size, (u, v) => {
    // gol kone
    if (rounded) {
      const r = 0.2;
      const cx = Math.min(Math.max(u, r), 1 - r);
      const cy = Math.min(Math.max(v, r), 1 - r);
      if (Math.hypot(u - cx, v - cy) > r) return [0, 0, 0, 0];
    }
    // indigo se violet gradient
    const k = (u + v) / 2;
    let col = [79 + (124 - 79) * k, 70 + (58 - 70) * k, 229 + (237 - 229) * k, 255];
    // tick ka nishan
    const x = (u - 0.5) / scale + 0.5;
    const y = (v - 0.5) / scale + 0.5;
    const d = Math.min(
      segDist(x, y, 0.27, 0.53, 0.43, 0.69),
      segDist(x, y, 0.43, 0.69, 0.74, 0.33)
    );
    if (d < 0.055) col = [255, 255, 255, 255];
    return col.map((c) => Math.round(c));
  });
}

fs.writeFileSync(path.join(OUT, 'icon-192.png'), makeIcon(192, { rounded: true, scale: 1 }));
fs.writeFileSync(path.join(OUT, 'icon-512.png'), makeIcon(512, { rounded: true, scale: 1 }));
fs.writeFileSync(path.join(OUT, 'maskable-512.png'), makeIcon(512, { rounded: false, scale: 0.72 }));
console.log('Icons ban gaye:', OUT);