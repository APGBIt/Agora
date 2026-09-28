// Sesión de voz en vivo: micrófono → análisis por cuadros en el dispositivo + transcripción opcional.
// La grabación solo existe en memoria para escucharla en el análisis; nunca se guarda.
import { Resampler, FrameAnalyzer, FRAME_SEC } from './dsp.js';
import { LiveASR } from '../speech/asr.js';
import { env, markMicBlocked } from '../app/env.js';

let ctx = null;

// Debe llamarse dentro de un toque del usuario (iOS exige un gesto para activar el audio).
export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* sin audio */ }
  return ctx;
}

export function audioContext() { return ctx; }

let sharedStream = null;

export class MicError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

export async function openMic() {
  if (sharedStream && sharedStream.getAudioTracks().some((t) => t.readyState === 'live')) return sharedStream;
  if (!env.secure) throw new MicError('insecure', 'El micrófono necesita una conexión segura (https) o abrir el archivo en tu computadora.');
  if (!env.hasGUM) throw new MicError('unsupported', 'Este navegador no permite usar el micrófono.');
  if (!env.micPolicy) { markMicBlocked(); throw new MicError('policy', 'Esta vista no permite usar el micrófono.'); }
  try {
    sharedStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
    });
    return sharedStream;
  } catch (e) {
    const name = e && e.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      if (env.framed) { markMicBlocked(); throw new MicError('policy', 'Esta vista no permite usar el micrófono.'); }
      throw new MicError('denied', 'No diste permiso para usar el micrófono. Actívalo en los ajustes del navegador.');
    }
    if (name === 'NotFoundError' || name === 'OverconstrainedError') throw new MicError('notfound', 'No encontramos un micrófono.');
    if (name === 'NotReadableError') throw new MicError('busy', 'Otra aplicación está usando el micrófono.');
    throw new MicError('error', 'No se pudo abrir el micrófono.');
  }
}

export function releaseMic() {
  if (sharedStream) {
    sharedStream.getTracks().forEach((t) => t.stop());
    sharedStream = null;
  }
}

const WORKLET = `class AgoraTap extends AudioWorkletProcessor{constructor(){super();this.b=new Float32Array(2048);this.n=0}process(i){const c=i[0]&&i[0][0];if(c){for(let k=0;k<c.length;k++){this.b[this.n++]=c[k];if(this.n===2048){this.port.postMessage(this.b.slice(0));this.n=0}}}return true}}registerProcessor('agora-tap',AgoraTap);`;

function pickMime() {
  if (!env.hasMR) return null;
  const opts = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac', 'audio/ogg;codecs=opus'];
  for (const m of opts) { try { if (MediaRecorder.isTypeSupported(m)) return m; } catch { /* */ } }
  return '';
}

export class SpeechSession {
  constructor({ asr = true, asrLocal = null, transcriptOnly = false, keepAudio = true, onUpdate = () => {} } = {}) {
    this.wantAsr = asr && env.hasSR;
    this.asrLocal = asrLocal;
    this.transcriptOnly = transcriptOnly && this.wantAsr;
    this.keepAudio = keepAudio;
    this.onUpdate = onUpdate;
    this.frames = [];
    this.state = 'idle';
    this.samples16 = 0;
    this.asr = null;
    this.asrState = this.wantAsr ? 'starting' : 'none';
    this.chunks = [];
    this.levels = [];
    this.lastDb = -90;
  }

  // Parte que conviene hacer dentro del toque: activa audio y arranca el reconocedor.
  armInGesture() {
    unlockAudio();
    if (this.wantAsr && !this.asr) {
      this.asr = new LiveASR({
        local: this.asrLocal,
        onChange: () => this._asrChanged(),
        onFatal: (code) => { this.asrState = code === 'audio-capture' ? 'conflict' : 'failed'; this.asrError = code; this.onUpdate(this); },
      });
      if (!this.asr.arm()) this.asrState = 'failed';
    }
  }

  _asrChanged() {
    if (this.asr && this.asr.heardAnything && this.asrState === 'starting') this.asrState = 'ok';
    this.onUpdate(this);
  }

  async prepare() {
    if (this.transcriptOnly) return;
    const stream = await openMic();
    const ac = unlockAudio();
    if (!ac) throw new MicError('unsupported', 'Este navegador no puede procesar audio.');
    if (ac.state === 'suspended') { try { await ac.resume(); } catch { /* */ } }
    this.stream = stream;
    this.source = ac.createMediaStreamSource(stream);
    this.sink = ac.createGain();
    this.sink.gain.value = 0;
    this.sink.connect(ac.destination);
    this.resampler = new Resampler(ac.sampleRate);
    this.analyzer = new FrameAnalyzer((f) => this._frame(f));
    let ok = false;
    if (ac.audioWorklet && typeof AudioWorkletNode !== 'undefined') {
      try {
        const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
        await ac.audioWorklet.addModule(url);
        URL.revokeObjectURL(url);
        this.node = new AudioWorkletNode(ac, 'agora-tap');
        this.node.port.onmessage = (e) => this._chunk(e.data);
        ok = true;
      } catch { ok = false; }
    }
    if (!ok) {
      this.node = ac.createScriptProcessor(2048, 1, 1);
      this.node.onaudioprocess = (e) => this._chunk(e.inputBuffer.getChannelData(0).slice(0));
    }
    this.source.connect(this.node);
    this.node.connect(this.sink);
    if (this.keepAudio && env.hasMR) {
      try {
        const mime = pickMime();
        this.recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
        this.recorder.ondataavailable = (e) => { if (e.data && e.data.size) this.chunks.push(e.data); };
      } catch { this.recorder = null; }
    }
  }

  start() {
    this.state = 'recording';
    this.startedAt = performance.now();
    if (this.asr) this.asr.begin();
    if (this.recorder && this.recorder.state === 'inactive') { try { this.recorder.start(1000); } catch { /* */ } }
    this.onUpdate(this);
  }

  pause() {
    if (this.state !== 'recording') return;
    this.state = 'paused';
    if (this.asr) this.asr.pause();
    try { if (this.recorder && this.recorder.state === 'recording') this.recorder.pause(); } catch { /* */ }
    this.onUpdate(this);
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'recording';
    if (this.asr) this.asr.resume();
    try { if (this.recorder && this.recorder.state === 'paused') this.recorder.resume(); } catch { /* */ }
    this.onUpdate(this);
  }

  _chunk(data) {
    if (this.state !== 'recording' || !this.resampler) return;
    const x = this.resampler.push(data);
    this.samples16 += x.length;
    this.analyzer.push(x);
  }

  _frame(f) {
    const t = this.frames.length * FRAME_SEC;
    f.t = t;
    this.frames.push(f);
    this.lastDb = f.db;
    if (this.frames.length % 5 === 0) {
      const slice = this.frames.slice(-5);
      this.levels.push(Math.max(...slice.map((x) => x.db)));
      if (this.levels.length > 120) this.levels.shift();
    }
  }

  // Segundos grabados (sin pausas).
  elapsed() {
    if (this.transcriptOnly || !this.resampler) {
      if (!this.startedAt) return 0;
      return (performance.now() - this.startedAt) / 1000 - (this.asr ? this.asr.pauseTotal : 0);
    }
    return this.samples16 / 16000;
  }

  async stop() {
    const durationSec = this.elapsed();
    this.state = 'stopping';
    let segments = [];
    if (this.asr) segments = await this.asr.finish();
    const blob = await this._stopRecorder();
    this._teardown();
    this.state = 'done';
    let asrState = this.asrState;
    if (asrState === 'starting') asrState = segments.length ? 'ok' : this.wantAsr ? 'silent' : 'none';
    if (asrState !== 'ok' && segments.length) asrState = 'ok';
    return { frames: this.frames, durationSec, segments, asrState, audioBlob: blob, asrMode: this.asr ? this.asr.mode : null };
  }

  _stopRecorder() {
    return new Promise((resolve) => {
      const r = this.recorder;
      if (!r || r.state === 'inactive') { resolve(this.chunks.length ? new Blob(this.chunks, { type: r?.mimeType || 'audio/webm' }) : null); return; }
      const t = setTimeout(() => resolve(this.chunks.length ? new Blob(this.chunks, { type: r.mimeType || 'audio/webm' }) : null), 1500);
      r.onstop = () => { clearTimeout(t); resolve(this.chunks.length ? new Blob(this.chunks, { type: r.mimeType || 'audio/webm' }) : null); };
      try { r.stop(); } catch { clearTimeout(t); resolve(null); }
    });
  }

  _teardown() {
    try { this.source && this.source.disconnect(); } catch { /* */ }
    try { this.node && this.node.disconnect(); } catch { /* */ }
    try { this.sink && this.sink.disconnect(); } catch { /* */ }
    if (this.node && this.node.port) this.node.port.onmessage = null;
    this.node = null;
    this.source = null;
    releaseMic();
  }

  cancel() {
    this.state = 'cancelled';
    if (this.asr) this.asr.abort();
    try { if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop(); } catch { /* */ }
    this.chunks = [];
    this._teardown();
  }

  liveText() { return this.asr ? this.asr.text() : ''; }
  liveSegments() { return this.asr ? this.asr.segments() : []; }
}
