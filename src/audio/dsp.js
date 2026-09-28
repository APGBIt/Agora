// Ágora · procesamiento de señal (sin dependencias, funciona en navegador y en Node).
// Todo el análisis ocurre en el dispositivo: aquí solo hay números, nunca se guarda audio.

export const SR = 16000;        // frecuencia de trabajo
export const HOP = 160;         // 10 ms entre cuadros
export const EWIN = 400;        // 25 ms para energía
export const PWIN = 640;        // 40 ms para tono y espectro
export const FRAME_SEC = HOP / SR;

// ---------- Filtros ----------

export class Biquad {
  constructor(fs, f0, q = Math.SQRT1_2) {
    const w0 = (2 * Math.PI * f0) / fs;
    const cos = Math.cos(w0);
    const alpha = Math.sin(w0) / (2 * q);
    const a0 = 1 + alpha;
    this.b0 = (1 - cos) / 2 / a0;
    this.b1 = (1 - cos) / a0;
    this.b2 = (1 - cos) / 2 / a0;
    this.a1 = (-2 * cos) / a0;
    this.a2 = (1 - alpha) / a0;
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
  }
  process(input) {
    const out = new Float32Array(input.length);
    let { x1, x2, y1, y2 } = this;
    const { b0, b1, b2, a1, a2 } = this;
    for (let i = 0; i < input.length; i++) {
      const x = input[i];
      const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = x; y2 = y1; y1 = y;
      out[i] = y;
    }
    this.x1 = x1; this.x2 = x2; this.y1 = y1; this.y2 = y2;
    return out;
  }
}

// Remuestreo a 16 kHz en flujo (paso bajo + interpolación lineal).
export class Resampler {
  constructor(inRate) {
    this.inRate = inRate;
    this.ratio = inRate / SR;
    this.lp = inRate > SR * 1.05 ? new Biquad(inRate, 7000, 0.7) : null;
    this.t = 0;
    this.last = 0;
  }
  push(input) {
    if (!input || !input.length) return new Float32Array(0);
    if (Math.abs(this.ratio - 1) < 1e-6) return Float32Array.from(input);
    const x = this.lp ? this.lp.process(input) : input;
    const n = x.length;
    const est = Math.ceil((n - this.t) / this.ratio) + 2;
    const out = new Float32Array(Math.max(0, est));
    let k = 0;
    let t = this.t;
    while (t <= n - 1) {
      const i = Math.floor(t);
      const frac = t - i;
      const a = i < 0 ? this.last : x[i];
      const b = i + 1 < n ? x[i + 1] : a;
      out[k++] = a + (b - a) * frac;
      t += this.ratio;
    }
    this.t = t - n;
    this.last = x[n - 1];
    return out.subarray(0, k);
  }
}

// ---------- FFT (radix 2, real) ----------

const fftCache = new Map();
function fftTables(n) {
  if (fftCache.has(n)) return fftCache.get(n);
  const rev = new Uint32Array(n);
  const bits = Math.log2(n);
  for (let i = 0; i < n; i++) {
    let r = 0;
    for (let b = 0; b < bits; b++) r = (r << 1) | ((i >> b) & 1);
    rev[i] = r;
  }
  const cos = new Float32Array(n / 2);
  const sin = new Float32Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    cos[i] = Math.cos((2 * Math.PI * i) / n);
    sin[i] = -Math.sin((2 * Math.PI * i) / n);
  }
  const hann = new Float32Array(n);
  for (let i = 0; i < n; i++) hann[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
  const t = { rev, cos, sin, hann };
  fftCache.set(n, t);
  return t;
}

// Devuelve el espectro de potencia (n/2 + 1 valores) de una ventana real.
export function powerSpectrum(frame) {
  const n = frame.length;
  const { rev, cos, sin, hann } = fftTables(n);
  const re = new Float32Array(n);
  const im = new Float32Array(n);
  for (let i = 0; i < n; i++) re[rev[i]] = frame[i] * hann[i];
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1;
    const step = n / size;
    for (let start = 0; start < n; start += size) {
      for (let j = 0; j < half; j++) {
        const k = j * step;
        const tr = re[start + j + half] * cos[k] - im[start + j + half] * sin[k];
        const ti = re[start + j + half] * sin[k] + im[start + j + half] * cos[k];
        re[start + j + half] = re[start + j] - tr;
        im[start + j + half] = im[start + j] - ti;
        re[start + j] += tr;
        im[start + j] += ti;
      }
    }
  }
  const p = new Float32Array(n / 2 + 1);
  for (let i = 0; i <= n / 2; i++) p[i] = re[i] * re[i] + im[i] * im[i];
  return p;
}

const BAND_EDGES = [100, 300, 600, 1000, 1600, 2400, 3400, 5000, 7500];

function bandShape(power, n) {
  const hz = SR / n;
  const bands = new Float32Array(BAND_EDGES.length - 1);
  for (let b = 0; b < bands.length; b++) {
    const lo = Math.max(1, Math.floor(BAND_EDGES[b] / hz));
    const hi = Math.min(power.length - 1, Math.ceil(BAND_EDGES[b + 1] / hz));
    let s = 0;
    for (let k = lo; k < hi; k++) s += power[k];
    bands[b] = 10 * Math.log10(s + 1e-12);
  }
  let mean = 0;
  for (let b = 0; b < bands.length; b++) mean += bands[b];
  mean /= bands.length;
  const shape = new Float32Array(bands.length);
  for (let b = 0; b < bands.length; b++) shape[b] = bands[b] - mean;
  // proporción de energía en agudos (sibilantes como la «s»)
  const hf = (bands[6] + bands[7]) / 2 - mean;
  // energía de la zona de las vocales (300–2400 Hz): marca mejor los núcleos silábicos
  const lo = Math.floor(300 / hz);
  const hi = Math.ceil(2400 / hz);
  let v = 0;
  for (let k = lo; k < hi; k++) v += power[k];
  const vdb = 10 * Math.log10(v / (n * n) + 1e-12);
  return { shape, hf, vdb };
}

// ---------- Tono (YIN a 8 kHz) ----------

const SR8 = 8000;
const YW = 196;
const TAU_MIN = Math.floor(SR8 / 450);
const TAU_MAX = Math.floor(SR8 / 65);

export function yin(x8) {
  // x8: al menos YW + TAU_MAX muestras a 8 kHz
  const d = new Float32Array(TAU_MAX + 1);
  for (let tau = 1; tau <= TAU_MAX; tau++) {
    let s = 0;
    for (let j = 0; j < YW; j++) {
      const diff = x8[j] - x8[j + tau];
      s += diff * diff;
    }
    d[tau] = s;
  }
  const cm = new Float32Array(TAU_MAX + 1);
  cm[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= TAU_MAX; tau++) {
    running += d[tau];
    cm[tau] = running > 0 ? (d[tau] * tau) / running : 1;
  }
  let tau = -1;
  for (let t = TAU_MIN; t <= TAU_MAX; t++) {
    if (cm[t] < 0.15) {
      while (t + 1 <= TAU_MAX && cm[t + 1] < cm[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau === -1) {
    let min = Infinity;
    for (let t = TAU_MIN; t <= TAU_MAX; t++) {
      if (cm[t] < min) { min = cm[t]; tau = t; }
    }
    if (min > 0.35) return { f0: 0, conf: 0 };
  }
  let better = tau;
  if (tau > TAU_MIN && tau < TAU_MAX) {
    const s0 = cm[tau - 1], s1 = cm[tau], s2 = cm[tau + 1];
    const den = s0 - 2 * s1 + s2;
    if (den !== 0) better = tau + (s0 - s2) / (2 * den);
  }
  return { f0: SR8 / better, conf: Math.max(0, Math.min(1, 1 - cm[tau])) };
}

// ---------- Análisis por cuadros en flujo ----------
// Recibe audio a 16 kHz en trozos y entrega un cuadro cada 10 ms:
// { t, db, f0, conf, zcr, flux, hf }

export class FrameAnalyzer {
  constructor(onFrame) {
    this.onFrame = onFrame;
    this.size = 4096;
    this.raw = new Float32Array(this.size);
    this.low = new Float32Array(this.size);
    this.lp = new Biquad(SR, 3000, 0.7);
    this.n = 0;
    this.nextEnd = PWIN;
    this.prevShape = null;
    this.win = new Float32Array(PWIN);
    this.win512 = new Float32Array(512);
    this.x8 = new Float32Array(PWIN / 2);
    this.count = 0;
  }
  push(samples) {
    if (!samples || !samples.length) return;
    const lowChunk = this.lp.process(samples);
    for (let i = 0; i < samples.length; i++) {
      const idx = (this.n + i) % this.size;
      this.raw[idx] = samples[i];
      this.low[idx] = lowChunk[i];
    }
    this.n += samples.length;
    while (this.n >= this.nextEnd) {
      this._frame(this.nextEnd);
      this.nextEnd += HOP;
    }
  }
  _frame(end) {
    const start = end - PWIN;
    const { raw, low, size, win, x8, win512 } = this;
    for (let i = 0; i < PWIN; i++) win[i] = raw[(start + i) % size];
    for (let i = 0; i < PWIN / 2; i++) x8[i] = low[(start + 2 * i) % size];
    // energía en los 25 ms centrales
    const c0 = (PWIN - EWIN) >> 1;
    let e = 0;
    let zc = 0;
    for (let i = c0; i < c0 + EWIN; i++) {
      e += win[i] * win[i];
      if (i > c0 && (win[i] >= 0) !== (win[i - 1] >= 0)) zc++;
    }
    const db = 10 * Math.log10(e / EWIN + 1e-10);
    const zcr = zc / EWIN;
    const p = yin(x8);
    const s0 = (PWIN - 512) >> 1;
    for (let i = 0; i < 512; i++) win512[i] = win[s0 + i];
    const { shape, hf, vdb } = bandShape(powerSpectrum(win512), 512);
    let flux = 0;
    if (this.prevShape) {
      for (let b = 0; b < shape.length; b++) flux += Math.abs(shape[b] - this.prevShape[b]);
      flux /= shape.length;
    }
    this.prevShape = shape;
    const t = (end - PWIN / 2) / SR;
    this.count++;
    this.onFrame({ t, db, vdb, f0: p.f0, conf: p.conf, zcr, flux, hf });
  }
}

// Analiza un bloque completo (por ejemplo, una nota de voz subida).
export function framesFromSamples(samples, inRate) {
  const frames = [];
  const rs = new Resampler(inRate);
  const fa = new FrameAnalyzer((f) => frames.push(f));
  const CH = 8192;
  for (let i = 0; i < samples.length; i += CH) {
    fa.push(rs.push(samples.subarray(i, Math.min(samples.length, i + CH))));
  }
  return frames;
}

// ---------- Estadística ----------

export function percentile(arr, p) {
  if (!arr.length) return NaN;
  const a = Array.from(arr).sort((x, y) => x - y);
  const idx = Math.min(a.length - 1, Math.max(0, (p / 100) * (a.length - 1)));
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return a[lo] + (a[hi] - a[lo]) * (idx - lo);
}

export function mean(arr) {
  if (!arr.length) return NaN;
  let s = 0;
  for (const v of arr) s += v;
  return s / arr.length;
}

export function std(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  let s = 0;
  for (const v of arr) s += (v - m) * (v - m);
  return Math.sqrt(s / (arr.length - 1));
}

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function movingAverage(arr, w) {
  const out = new Float32Array(arr.length);
  const h = Math.floor(w / 2);
  let s = 0;
  let count = 0;
  let lo = 0;
  let hi = -1;
  for (let i = 0; i < arr.length; i++) {
    const want = Math.min(arr.length - 1, i + h);
    while (hi < want) { hi++; s += arr[hi]; count++; }
    const wantLo = Math.max(0, i - h);
    while (lo < wantLo) { s -= arr[lo]; lo++; count--; }
    out[i] = s / count;
  }
  return out;
}
