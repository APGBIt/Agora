import { readFileSync } from 'node:fs';

// Lector mínimo de WAV PCM de 16 bits (mono o estéreo → mono).
export function readWav(path) {
  const buf = readFileSync(path);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let off = 12;
  let fmt = null;
  let data = null;
  while (off < buf.length - 8) {
    const id = buf.toString('ascii', off, off + 4);
    const size = dv.getUint32(off + 4, true);
    if (id === 'fmt ') {
      fmt = {
        channels: dv.getUint16(off + 10, true),
        rate: dv.getUint32(off + 12, true),
        bits: dv.getUint16(off + 22, true),
      };
    } else if (id === 'data') {
      data = { off: off + 8, size };
    }
    off += 8 + size + (size % 2);
  }
  if (!fmt || !data || fmt.bits !== 16) throw new Error('WAV no soportado');
  const n = data.size / 2 / fmt.channels;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let c = 0; c < fmt.channels; c++) s += dv.getInt16(data.off + (i * fmt.channels + c) * 2, true);
    out[i] = s / fmt.channels / 32768;
  }
  return { samples: out, rate: fmt.rate };
}
