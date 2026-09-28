// Reconocimiento de voz del navegador (Web Speech API).
// Si el navegador puede procesar en el dispositivo, se usa esa opción.
import { env } from '../app/env.js';

export function getSR() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

const CLOUD_LANGS = ['es-DO', 'es-US', 'es-419', 'es-MX', 'es-ES'];
const LOCAL_LANGS = ['es-US', 'es-ES', 'es-MX', 'es-DO', 'es-419'];

// Estado del reconocimiento en el dispositivo: available | downloadable | downloading | unavailable | unsupported
export async function localStatus() {
  const SR = getSR();
  if (!SR || typeof SR.available !== 'function') return { status: 'unsupported' };
  let best = { status: 'unavailable' };
  for (const lang of LOCAL_LANGS) {
    try {
      const st = await SR.available({ langs: [lang], processLocally: true });
      if (st === 'available') return { status: st, lang };
      if ((st === 'downloadable' || st === 'downloading') && best.status === 'unavailable') best = { status: st, lang };
    } catch { /* idioma no válido en este navegador */ }
  }
  return best;
}

export async function installLocal(lang) {
  const SR = getSR();
  if (!SR || typeof SR.install !== 'function') return false;
  try {
    return !!(await SR.install({ langs: [lang], processLocally: true }));
  } catch {
    return false;
  }
}

const now = () => performance.now() / 1000;
const normTxt = (s) => s.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '').trim();

export class LiveASR {
  constructor({ local = null, onChange = () => {}, onFatal = () => {} } = {}) {
    this.local = local; // idioma con reconocimiento local disponible, o null
    this.langIdx = 0;
    this.onChange = onChange;
    this.onFatal = onFatal;
    this.finals = [];
    this.interim = '';
    this.interimStart = null;
    this.active = false;
    this.ignoreBefore = 0;
    this.t0 = now();
    this.restarts = [];
    this.fatal = null;
    this.heardAnything = false;
    this.pausedAt = null;
    this.pauseTotal = 0;
  }

  get mode() { return this.local ? 'local' : 'cloud'; }

  // Arranca (idealmente dentro de un toque del usuario). Lo dicho antes de begin() se descarta.
  arm() {
    const SR = getSR();
    if (!SR) { this.fatal = 'unsupported'; return false; }
    this.active = true;
    this.ignoreBefore = Infinity;
    this._spawn();
    return true;
  }

  begin() {
    this.t0 = now();
    this.ignoreBefore = this.t0;
    this.finals = [];
    this.interim = '';
    this.interimStart = null;
    this.pauseTotal = 0;
    this.pausedAt = null;
  }

  pause() { this.pausedAt = now(); }
  resume() {
    if (this.pausedAt != null) this.pauseTotal += now() - this.pausedAt;
    this.pausedAt = null;
  }

  _rel(t) { return Math.max(0, t - this.t0 - this.pauseTotal); }

  _spawn() {
    const SR = getSR();
    let rec;
    try { rec = new SR(); } catch { this._die('unsupported'); return; }
    const lang = this.local || CLOUD_LANGS[this.langIdx];
    rec.lang = lang;
    if (this.local && 'processLocally' in rec) rec.processLocally = true;
    rec.continuous = !env.isAndroid;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    const starts = {};
    rec.onresult = (e) => {
      const t = now();
      if (t < this.ignoreBefore || this.pausedAt != null) return;
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const text = (r[0] && r[0].transcript) || '';
        if (!starts[i]) starts[i] = Math.max(this.ignoreBefore, t - 0.6);
        if (r.isFinal) {
          const clean = text.trim();
          if (!clean) continue;
          const last = this.finals[this.finals.length - 1];
          if (last && normTxt(last.text) === normTxt(clean) && t - last.at < 2) continue;
          // Android a veces repite lo anterior al principio
          let add = clean;
          if (last && env.isAndroid && normTxt(clean).startsWith(normTxt(last.text)) && t - last.at < 4) {
            add = clean.slice(last.text.length).trim();
            if (!add) continue;
          }
          this.finals.push({ text: add, conf: r[0].confidence || 0, tStart: this._rel(starts[i]), tEnd: this._rel(t - 0.15), at: t });
          this.heardAnything = true;
        } else {
          interim += text;
        }
      }
      this.interim = interim.trim();
      if (this.interim) this.heardAnything = true;
      this.onChange(this);
    };
    rec.onerror = (e) => {
      const err = e.error;
      if (err === 'no-speech' || err === 'aborted') return;
      if (err === 'language-not-supported' && !this.local && this.langIdx < CLOUD_LANGS.length - 1) {
        this.langIdx++;
        return;
      }
      if (err === 'language-not-supported' && this.local) { this.local = null; return; }
      if (err === 'audio-capture') this._die('audio-capture');
      else if (err === 'not-allowed' || err === 'service-not-allowed') this._die('not-allowed');
      else if (err === 'network') this._die('network');
      else this._die(err || 'error');
    };
    rec.onend = () => {
      if (!this.active || this.fatal) return;
      const t = now();
      this.restarts = this.restarts.filter((x) => t - x < 60);
      this.restarts.push(t);
      if (this.restarts.length > 40) { this._die('unstable'); return; }
      setTimeout(() => { if (this.active && !this.fatal) this._spawn(); }, 120);
    };
    try {
      rec.start();
      this.rec = rec;
    } catch {
      setTimeout(() => { if (this.active && !this.fatal) this._spawn(); }, 300);
    }
  }

  _die(code) {
    this.fatal = code;
    this.active = false;
    try { this.rec && this.rec.abort(); } catch { /* ignorar */ }
    this.onFatal(code);
    this.onChange(this);
  }

  // Detiene y espera los últimos resultados finales (máximo ~1 s).
  finish() {
    return new Promise((resolve) => {
      if (!this.rec || this.fatal) { this.active = false; resolve(this.segments()); return; }
      const rec = this.rec;
      let done = false;
      const end = () => {
        if (done) return;
        done = true;
        this.active = false;
        if (this.interim) {
          const t = now();
          this.finals.push({ text: this.interim, conf: 0, tStart: this._rel(t - 1.5), tEnd: this._rel(t), at: t, provisional: true });
          this.interim = '';
        }
        resolve(this.segments());
      };
      const prevEnd = rec.onend;
      rec.onend = () => { if (prevEnd) try { prevEnd(); } catch { /* */ } end(); };
      this.active = false;
      try { rec.stop(); } catch { end(); }
      setTimeout(end, 1100);
    });
  }

  abort() {
    this.active = false;
    try { this.rec && this.rec.abort(); } catch { /* ignorar */ }
  }

  segments() {
    return this.finals.map(({ text, conf, tStart, tEnd }) => ({ text, conf, tStart, tEnd }));
  }

  // Texto completo visible (finales + provisional)
  text() {
    return [...this.finals.map((f) => f.text), this.interim].filter(Boolean).join(' ');
  }
}
