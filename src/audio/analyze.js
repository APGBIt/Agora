// Ágora · métricas de voz a partir de los cuadros de FrameAnalyzer.
// Ritmo, pausas, energía (variación de tono), volumen al final de frase y vacilaciones.

import { FRAME_SEC, percentile, mean, std, clamp, movingAverage } from './dsp.js';

const PAUSE_MIN = 25;       // 250 ms: por debajo es parte del habla
const EFFECTIVE_MAX = 200;  // 2 s: por encima es un silencio largo
const MICRO_MAX = 50;       // 0,5 s

function runs(flags) {
  const out = [];
  let s = -1;
  for (let i = 0; i < flags.length; i++) {
    if (flags[i] && s < 0) s = i;
    if (!flags[i] && s >= 0) { out.push({ start: s, end: i }); s = -1; }
  }
  if (s >= 0) out.push({ start: s, end: flags.length });
  return out;
}

function fillGaps(flags, maxGap) {
  const out = flags.slice();
  let last = -1;
  for (let i = 0; i < out.length; i++) {
    if (out[i]) {
      if (last >= 0 && i - last - 1 > 0 && i - last - 1 <= maxGap) {
        for (let k = last + 1; k < i; k++) out[k] = true;
      }
      last = i;
    }
  }
  return out;
}

function removeIslands(flags, minLen) {
  const out = flags.slice();
  for (const r of runs(out)) {
    if (r.end - r.start < minLen) for (let k = r.start; k < r.end; k++) out[k] = false;
  }
  return out;
}

export function levels(frames) {
  const db = frames.map((f) => f.db);
  const floor = percentile(db, 10);
  const p90 = percentile(db, 90);
  const dyn = p90 - floor;
  const thr = floor + clamp(0.33 * dyn, 6, 14);
  return { db, floor, p90, dyn, thr };
}

// Detecta núcleos silábicos (picos de intensidad sonoros separados por valles de ≥ 2 dB).
export function syllableNuclei(frames, sp, voiced, thr, opt = {}) {
  const { smooth = 5, dip = 4, minDist = 8, key = 'vdb' } = opt;
  const db = frames.map((f) => f[key]);
  const sm = movingAverage(db, smooth);
  if (key !== 'db') {
    // umbral relativo para la banda de vocales
    const sp90 = percentile(db, 90);
    thr = sp90 - 25;
  }
  const n = frames.length;
  const voicedNear = (i) => {
    for (let k = Math.max(0, i - 3); k <= Math.min(n - 1, i + 3); k++) if (voiced[k]) return true;
    return false;
  };
  const peaks = [];
  for (let i = 2; i < n - 2; i++) {
    if (!sp[i]) continue;
    const v = sm[i];
    if (v >= sm[i - 1] && v > sm[i + 1] && v >= sm[i - 2] && v >= sm[i + 2] && v > thr - 3) peaks.push(i);
  }
  const acc = [];
  for (const p of peaks) {
    if (!voicedNear(p)) continue;
    if (!acc.length) { acc.push(p); continue; }
    const q = acc[acc.length - 1];
    let minBetween = Infinity;
    for (let k = q; k <= p; k++) if (sm[k] < minBetween) minBetween = sm[k];
    const separated = sm[q] - minBetween >= dip && sm[p] - minBetween >= dip && p - q >= minDist;
    const gap = !sp.slice(q, p).every(Boolean);
    if (separated || (gap && p - q >= minDist)) acc.push(p);
    else if (sm[p] > sm[q]) acc[acc.length - 1] = p;
  }
  return acc.map((i) => ({ i, t: frames[i].t, db: sm[i] }));
}

// Vacilaciones sonoras: «eeeh», «mmm» o sílabas alargadas (tono y timbre estables ≥ 280 ms).
export function hesitations(frames, sp, voiced, fluxThr = 1.6) {
  const n = frames.length;
  const st = frames.map((f) => (f.f0 > 0 ? 12 * Math.log2(f.f0 / 100) : 0));
  const out = [];
  let i = 0;
  const pauseNear = (idx, dir) => {
    // ¿hay un silencio de ≥ 120 ms que empiece/termine a menos de 60 ms?
    for (let off = 0; off <= 6; off++) {
      const k = dir < 0 ? idx - 1 - off : idx + off;
      if (k < 0 || k >= n) return true;
      if (!sp[k]) {
        let len = 0;
        let j = k;
        while (j >= 0 && j < n && !sp[j]) { len++; j += dir < 0 ? -1 : 1; }
        if (len >= 12 || j < 0 || j >= n) return true;
      }
    }
    return false;
  };
  while (i < n) {
    if (!(voiced[i] && sp[i])) { i++; continue; }
    const start = i;
    const refSt = [];
    const refDb = [];
    let glitches = 0;
    let j = i;
    while (j < n) {
      const ok = voiced[j] && sp[j];
      if (!ok) break;
      const m = refSt.length >= 3 ? percentile(refSt.slice(-12), 50) : st[j];
      const md = refDb.length >= 3 ? percentile(refDb.slice(-12), 50) : frames[j].db;
      const steady = Math.abs(st[j] - m) <= 0.9 && Math.abs(frames[j].db - md) <= 5 && frames[j].flux <= fluxThr;
      if (!steady) {
        glitches++;
        if (glitches > 1 || refSt.length < 3) break;
      } else {
        glitches = 0;
      }
      refSt.push(st[j]);
      refDb.push(frames[j].db);
      j++;
    }
    const len = j - start;
    if (len >= 28) {
      const adj = pauseNear(start, -1) || pauseNear(j, 1);
      if (len >= 45 || adj) {
        out.push({ start, end: j, t: frames[start].t, dur: len * FRAME_SEC });
      }
      i = j;
    } else {
      i = start + 1;
    }
  }
  // unir vacilaciones muy cercanas
  const merged = [];
  for (const h of out) {
    const prev = merged[merged.length - 1];
    if (prev && h.start - prev.end <= 15) { prev.end = h.end; prev.dur = (prev.end - prev.start) * FRAME_SEC; }
    else merged.push({ ...h });
  }
  return merged;
}

function pitchStats(frames, mask) {
  const f0s = [];
  for (let i = 0; i < frames.length; i++) if (mask[i]) f0s.push(frames[i].f0);
  if (f0s.length < 30) return null;
  const med = percentile(f0s, 50);
  const folded = f0s.map((f) => (f > 1.8 * med ? f / 2 : f < 0.55 * med ? f * 2 : f));
  const st = folded.map((f) => 12 * Math.log2(f / med));
  const p5 = percentile(st, 5);
  const p95 = percentile(st, 95);
  const trimmed = st.filter((v) => v >= p5 && v <= p95);
  return { median: med, std: std(trimmed), range: p95 - p5, voiced: f0s.length };
}

// Métricas completas de una grabación.
export function analyzeFrames(frames) {
  const empty = { lowSignal: true, frames: frames.length, durationSec: frames.length * FRAME_SEC };
  if (frames.length < 50) return empty;
  const { floor, p90, dyn, thr } = levels(frames);
  const voiced = frames.map((f) => f.f0 > 0 && f.conf >= 0.6 && f.db > floor + 4);
  let sp = frames.map((f, i) => f.db > thr || (voiced[i] && f.db > floor + 6));
  sp = fillGaps(sp, 12);
  sp = removeIslands(sp, 6);
  const segs = runs(sp);
  if (!segs.length) return { ...empty, dyn };
  // frases: segmentos separados por silencios de ≥ 250 ms
  const phrases = [];
  for (const s of segs) {
    const prev = phrases[phrases.length - 1];
    if (prev && s.start - prev.end < PAUSE_MIN) prev.end = s.end;
    else phrases.push({ ...s });
  }
  const first = phrases[0].start;
  const last = phrases[phrases.length - 1].end;
  const activeFrames = last - first;
  const activeSec = activeFrames * FRAME_SEC;
  let speechFrames = 0;
  for (let i = first; i < last; i++) if (sp[i]) speechFrames++;
  const speechSec = speechFrames * FRAME_SEC;
  const durationSec = frames.length * FRAME_SEC;
  if (speechSec < 1.5 || dyn < 7) {
    return { ...empty, lowSignal: true, dyn, speechSec, durationSec };
  }

  // pausas
  const pauseList = [];
  for (let k = 1; k < phrases.length; k++) {
    const len = phrases[k].start - phrases[k - 1].end;
    pauseList.push({ t: frames[phrases[k - 1].end].t, dur: len * FRAME_SEC, len });
  }
  const micro = pauseList.filter((p) => p.len < MICRO_MAX).length;
  const effective = pauseList.filter((p) => p.len >= MICRO_MAX && p.len <= EFFECTIVE_MAX).length;
  const long = pauseList.filter((p) => p.len > EFFECTIVE_MAX).length;
  const activeMin = Math.max(activeSec / 60, 1 / 60);

  // sílabas
  const nuclei = syllableNuclei(frames, sp, voiced, thr);
  const syllables = nuclei.length;

  // tono
  const pitchMask = frames.map((f, i) => voiced[i] && sp[i] && f.conf >= 0.7);
  const pitch = pitchStats(frames, pitchMask);
  const peakDb = nuclei.map((x) => x.db);
  const loudStd = peakDb.length > 5 ? std(peakDb) : 0;

  // volumen al final de frase: compara las últimas sílabas con el cuerpo de la frase
  let dropped = 0;
  let judged = 0;
  const phraseInfo = [];
  for (const ph of phrases) {
    if (ph.end - ph.start < 100) continue;
    const inside = nuclei.filter((x) => x.i >= ph.start && x.i < ph.end);
    if (inside.length < 4) continue;
    const body = inside.slice(0, -2).map((x) => x.db);
    const tail = inside.slice(-2).map((x) => x.db);
    const drop = percentile(body, 50) - mean(tail);
    judged++;
    const isDrop = drop >= 6;
    if (isDrop) dropped++;
    phraseInfo.push({ t: frames[ph.start].t, drop, isDrop });
  }

  const hes = hesitations(frames, sp, voiced);

  return {
    lowSignal: false,
    durationSec,
    activeSec,
    speechSec,
    noiseFloor: floor,
    dyn,
    phrases: phrases.map((p) => ({ start: frames[p.start].t, end: frames[Math.min(frames.length - 1, p.end - 1)].t })),
    pauses: {
      list: pauseList.map((p) => ({ t: p.t, dur: p.dur })),
      micro,
      effective,
      long,
      perMin: effective / activeMin,
      longest: pauseList.reduce((m, p) => Math.max(m, p.dur), 0),
    },
    syllables,
    syllablesPerSec: syllables / Math.max(activeSec, 1),
    articulationRate: syllables / Math.max(speechSec, 1),
    pitch,
    loudness: { std: loudStd, mean: mean(peakDb) },
    endDrop: { judged, dropped, ratio: judged ? dropped / judged : null, phrases: phraseInfo },
    hesitations: { count: hes.length, list: hes.map((h) => ({ t: h.t, dur: h.dur })) },
    speechMask: sp,
    first: frames[first].t,
    last: frames[Math.min(frames.length - 1, last - 1)].t,
  };
}

// Vista rápida para métricas en vivo sobre los últimos segundos.
export function liveWindow(frames, seconds) {
  const n = Math.round(seconds / FRAME_SEC);
  return frames.length > n ? frames.slice(frames.length - n) : frames;
}

// Palabras por minuto estimadas a partir de sílabas (cuando no hay transcripción).
export function wpmFromSyllables(syllables, activeSec, sylPerWord = 1.9) {
  if (!activeSec || activeSec < 3) return null;
  return syllables / sylPerWord / (activeSec / 60);
}

// Posición de la energía de voz en la escala monótona → exagerada (0..1).
export function energyPosition(pitchStd) {
  if (pitchStd == null) return null;
  return clamp((pitchStd - 0.5) / 7.5, 0, 1);
}

export function energyLabel(pitchStd) {
  if (pitchStd == null) return null;
  if (pitchStd < 2) return 'Monótona';
  if (pitchStd > 5.5) return 'Exagerada';
  return 'Expresiva';
}
