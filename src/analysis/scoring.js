// Ágora · puntuación y retroalimentación de una práctica.
import { analyzeFrames, wpmFromSyllables, energyLabel, energyPosition } from '../audio/analyze.js';
import { lexicalAnalysis, structureCoverage, cleanVersion } from '../speech/lexical.js';
import { clamp } from '../audio/dsp.js';

export const PACE_MIN = 130;
export const PACE_MAX = 160;

export function paceScore(wpm) {
  if (wpm == null) return null;
  const dist = Math.max(0, PACE_MIN - wpm, wpm - PACE_MAX);
  const s = dist <= 10 ? 100 - dist : 90 - (dist - 10) * 1.6;
  return Math.round(clamp(s, 5, 100));
}

export function fillerScore(perMin) {
  if (perMin == null) return null;
  return Math.round(clamp(100 - 14 * perMin, 5, 100));
}

export function pauseScore(perMin, longCount, activeMin) {
  if (perMin == null) return null;
  let s = 100;
  if (perMin < 3) s = 100 - 14 * (3 - perMin);
  else if (perMin > 12) s = 100 - 6 * (perMin - 12);
  const longPerMin = activeMin > 0 ? longCount / activeMin : 0;
  if (longPerMin > 1) s -= 10 * (longPerMin - 1);
  return Math.round(clamp(s, 5, 100));
}

export function energyScore(pitchStd, loudStd) {
  if (pitchStd == null) return null;
  let p;
  if (pitchStd < 1) p = 25;
  else if (pitchStd < 2) p = 25 + (pitchStd - 1) * 60;
  else if (pitchStd <= 5.5) p = 85 + Math.min(15, (pitchStd - 2) * 20);
  else if (pitchStd <= 8) p = 100 - (pitchStd - 5.5) * 16;
  else p = 55;
  let l = 70;
  if (loudStd != null) {
    if (loudStd < 2) l = 50 + loudStd * 10;
    else if (loudStd <= 7) l = 100;
    else l = Math.max(60, 100 - (loudStd - 7) * 8);
  }
  return Math.round(clamp(0.75 * p + 0.25 * l, 5, 100));
}

export function volumeScore(ratio, judged) {
  if (ratio == null || judged < 2) return null;
  return Math.round(clamp(100 - ratio * 90, 10, 100));
}

export function timingScore(actual, target) {
  if (!target || !actual) return null;
  const r = actual / target;
  const off = Math.max(0, Math.abs(r - 1) - 0.1);
  return Math.round(clamp(100 - off * 250, 5, 100));
}

export function weakScore(perMin) {
  if (perMin == null) return null;
  return Math.round(clamp(100 - 18 * perMin, 10, 100));
}

export const WEIGHTS = { pace: 0.2, fillers: 0.2, pauses: 0.15, energy: 0.15, volume: 0.1, timing: 0.1, weak: 0.05, structure: 0.05 };

export function overallScore(comps) {
  let s = 0;
  let w = 0;
  for (const [k, v] of Object.entries(comps)) {
    if (v == null || WEIGHTS[k] == null) continue;
    s += v * WEIGHTS[k];
    w += WEIGHTS[k];
  }
  return w ? Math.round(s / w) : null;
}

// Nombre del nivel de la puntuación total (0–100).
export function scoreMessage(s) {
  if (s == null) return 'Práctica registrada';
  if (s >= 85) return 'Excelente';
  if (s >= 70) return 'Bien';
  if (s >= 50) return 'En progreso';
  return 'Para practicar';
}

const listaY = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`);
const pl = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const fmtTime = (sec) => {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// Arma el resultado completo de una grabación.
export function buildResult(input) {
  const { frames = [], durationSec, segments = [], asrState = 'none', config = {}, sylPerWord = 1.85 } = input;
  const hasAsr = asrState === 'ok' && segments.some((s) => (s.text || '').trim());
  const lex = hasAsr ? lexicalAnalysis(segments) : null;
  let ac = analyzeFrames(frames);
  const acousticMissing = frames.length === 0 && !!lex;
  if (acousticMissing) {
    // modo solo transcripción: sin análisis acústico
    const first = segments[0].tStart || 0;
    const last = segments[segments.length - 1].tEnd || durationSec || 0;
    ac = { lowSignal: false, missing: true, activeSec: Math.max(1, last - first), speechSec: Math.max(1, last - first), syllables: 0, hesitations: { count: 0, list: [] }, pauses: null, pitch: null, loudness: { std: null }, endDrop: null };
  }
  const activeSec = ac.lowSignal ? (durationSec || 0) : ac.activeSec;
  const activeMin = Math.max(activeSec / 60, 1 / 60);

  let wpm = null;
  let wpmSource = null;
  if (lex && lex.words >= 8 && activeSec > 5) {
    wpm = lex.words / activeMin;
    wpmSource = 'asr';
  } else if (!ac.lowSignal) {
    wpm = wpmFromSyllables(ac.syllables, ac.activeSec, sylPerWord);
    wpmSource = wpm ? 'acoustic' : null;
  }

  const hes = ac.lowSignal ? 0 : ac.hesitations.count;
  let fillers;
  if (lex) {
    const lexical = lex.fillers.length - lex.vocalFillers;
    const vocal = Math.max(lex.vocalFillers, hes);
    const total = lexical + vocal;
    fillers = { total, perMin: total / activeMin, lexical, vocal, top: lex.fillerCounts.slice(0, 3), source: 'texto y audio' };
  } else if (!ac.lowSignal) {
    fillers = { total: hes, perMin: hes / activeMin, lexical: null, vocal: hes, top: hes ? [{ key: 'eh', count: hes }] : [], source: 'audio' };
  } else {
    fillers = null;
  }

  const weak = lex ? { total: lex.weak.length, perMin: lex.weak.length / activeMin, top: lex.weakCounts.slice(0, 3), items: lex.weak } : null;
  const pauses = ac.lowSignal ? null : ac.pauses;
  const pitchStd = ac.pitch ? ac.pitch.std : null;
  const energy = ac.lowSignal || ac.missing
    ? null
    : { pitchStd, label: energyLabel(pitchStd), position: energyPosition(pitchStd), loudStd: ac.loudness.std, median: ac.pitch?.median ?? null };
  const endDrop = ac.lowSignal ? null : ac.endDrop;
  const target = config.targetSec || null;
  const timing = target ? { target, actual: activeSec, ratio: activeSec / target } : null;
  const structure = lex && config.framework ? structureCoverage(config.framework, lex.tokens) : null;

  // en fase de solo audio las vacilaciones cuentan menos (no oímos las muletillas de palabra)
  const comps = {
    pace: paceScore(wpm),
    fillers: fillers ? fillerScore(lex ? fillers.perMin : fillers.perMin * 0.8) : null,
    pauses: pauses ? pauseScore(pauses.perMin, pauses.long, activeMin) : null,
    energy: energy ? energyScore(pitchStd, energy.loudStd) : null,
    volume: endDrop ? volumeScore(endDrop.ratio, endDrop.judged) : null,
    timing: timing ? timingScore(activeSec, target) : null,
    weak: weak ? weakScore(weak.perMin) : null,
    structure: structure ? Math.round(structure.ratio * 100) : null,
  };
  if (config.noTiming) comps.timing = null;
  const overall = ac.lowSignal ? null : overallScore(comps);

  const res = {
    kind: config.kind || 'libre',
    refId: config.refId || null,
    title: config.title || 'Práctica libre',
    durationSec: durationSec || ac.durationSec,
    activeSec,
    speechSec: ac.speechSec ?? 0,
    lowSignal: !!ac.lowSignal,
    wpm: wpm != null ? Math.round(wpm) : null,
    wpmSource,
    syllables: ac.syllables ?? 0,
    words: lex ? lex.words : null,
    fillers,
    weak,
    pauses,
    energy,
    endDrop,
    timing,
    structure,
    comps,
    overall,
    message: scoreMessage(overall),
    asrState,
    hasTranscript: !!lex,
    confidence: lex ? lex.confidence : null,
  };
  res.acousticMissing = !!ac.missing;
  if (lex && ac.syllables && lex.words >= 20) {
    res.calibration = { sylPerWord: clamp(ac.syllables / lex.words, 1.4, 2.8) };
  }
  res.transcript = lex ? markTranscript(segments, lex, ac) : null;
  res.clean = lex ? cleanVersion(segments, lex.tokens, lex.fillers, lex.weak, lex.repetitions) : null;
  const fb = feedback(res);
  res.strengths = fb.strengths;
  res.improvements = fb.improvements;
  return res;
}

// Marca la transcripción: muletillas, palabras débiles, repeticiones y pausas.
export function markTranscript(segments, lex, ac) {
  const type = new Array(lex.tokens.length).fill('w');
  for (const f of lex.fillers) for (let k = 0; k < f.len; k++) type[f.i + k] = 'filler';
  for (const w of lex.weak) for (let k = 0; k < w.len; k++) if (type[w.i + k] === 'w') type[w.i + k] = 'weak';
  for (const r of lex.repetitions) if (type[r.i] === 'w') type[r.i] = 'rep';
  // Las pausas salen del audio (las mismas que cuenta «Pausas efectivas»). Los tiempos de las palabras
  // son aproximados, así que si una pausa cae cerca de un corte del reconocedor, la marcamos en ese corte.
  const pauseBefore = new Set();
  if (!ac.lowSignal && !ac.missing && ac.pauses) {
    const cuts = [];
    for (let i = 1; i < lex.tokens.length; i++) {
      const a = lex.tokens[i - 1];
      const b = lex.tokens[i];
      if (a.seg === b.seg) continue;
      cuts.push({ i, from: (segments[a.seg]?.tEnd ?? a.t) - 1.5, to: (segments[b.seg]?.tStart ?? b.t) + 0.6 });
    }
    for (const p of ac.pauses.list) {
      if (p.dur < 0.5) continue;
      const mid = p.t + p.dur * 0.5;
      const cut = cuts.find((c) => mid >= c.from && mid <= c.to);
      const idx = cut ? cut.i : lex.tokens.findIndex((t) => t.t > mid);
      if (idx > 0) pauseBefore.add(idx);
    }
  }
  const parts = [];
  lex.tokens.forEach((t, i) => {
    if (i > 0 && pauseBefore.has(i)) {
      if (parts.length && parts[parts.length - 1].type !== 'pause') parts.push({ type: 'pause' });
    }
    const prev = parts[parts.length - 1];
    if (prev && prev.type === type[i] && type[i] !== 'pause') prev.text += ' ' + t.w;
    else parts.push({ type: type[i], text: t.w });
  });
  return parts;
}

// ---------- Retroalimentación ----------

export function feedback(r) {
  const good = [];
  const bad = [];
  const c = r.comps;
  if (r.lowSignal) {
    return {
      strengths: [],
      improvements: [{ text: 'No se escuchó suficiente voz. Acércate al micrófono y habla al menos 10 segundos.', exercise: null }],
    };
  }
  if (c.pace != null) {
    const est = r.wpmSource === 'acoustic' ? ' (estimado)' : '';
    if (c.pace >= 85) good.push({ w: c.pace, text: `Tu ritmo fue claro: ${r.wpm} palabras por minuto${est}, dentro del rango ideal.` });
    else if (r.wpm > PACE_MAX) bad.push({ w: c.pace, text: `Vas rápido: ${r.wpm} palabras por minuto${est}. Respira entre ideas y marca pausas.`, exercise: 'rit-pausa-poderosa' });
    else bad.push({ w: c.pace, text: `Tu ritmo es pausado: ${r.wpm} palabras por minuto${est}. Da más agilidad a las partes secundarias.`, exercise: 'rit-tres-velocidades' });
  }
  if (c.fillers != null && r.fillers) {
    const top = r.fillers.top.map((x) => `«${x.key}»`).join(', ');
    if (c.fillers >= 85) good.push({ w: c.fillers, text: r.fillers.total ? `Casi sin muletillas: ${pl(r.fillers.total, 'muletilla', 'muletillas')} en ${fmtTime(r.activeSec)}.` : 'Hablaste sin muletillas. ¡Así se hace!' });
    else if (r.fillers.source === 'audio') bad.push({ w: c.fillers, text: `Detectamos ${pl(r.fillers.total, 'titubeo', 'titubeos')} («eh», «mmm» o sílabas alargadas). Cámbialos por un silencio corto.`, exercise: 'mul-silencio' });
    else bad.push({ w: c.fillers, text: `Dijiste ${pl(r.fillers.total, 'muletilla', 'muletillas')} (${top}). Cámbiala${r.fillers.total === 1 ? '' : 's'} por un silencio de un segundo.`, exercise: 'mul-minuto-limpio' });
  }
  if (c.pauses != null && r.pauses) {
    if (c.pauses >= 85) good.push({ w: c.pauses - 1, text: r.pauses.effective ? `Hiciste ${pl(r.pauses.effective, 'pausa', 'pausas')} entre ideas: así se te entiende mejor.` : 'Buen manejo de los silencios.' });
    else if (r.pauses.long > 1) bad.push({ w: c.pauses, text: `Hubo ${pl(r.pauses.long, 'silencio largo', 'silencios largos')}. Si te pierdes, resume lo último que dijiste y sigue.`, exercise: 'imp-tema' });
    else if (r.pauses.perMin > 12) bad.push({ w: c.pauses, text: `Te detuviste muy seguido (${Math.round(r.pauses.perMin)} pausas por minuto) y se corta el hilo. Une cada idea en una sola frase y guarda la pausa para después de lo importante.`, exercise: 'rit-lectura-marcada' });
    else bad.push({ w: c.pauses, text: 'Casi no hiciste pausas. Detente un segundo después de cada idea importante.', exercise: 'rit-pausa-poderosa' });
  }
  if (c.energy != null && r.energy) {
    if (c.energy >= 85) good.push({ w: c.energy - 2, text: 'Voz expresiva: variaste el tono para dar énfasis.' });
    else if (r.energy.label === 'Exagerada') bad.push({ w: c.energy, text: 'Tu tono sube y baja mucho. Reserva el énfasis para las palabras clave.', exercise: 'rit-lectura-marcada' });
    else bad.push({ w: c.energy, text: 'Tu tono fue bastante plano. Sube la voz en las palabras clave y baja en las pausas.', exercise: 'proy-sirena' });
  }
  if (c.volume != null) {
    if (c.volume >= 85) good.push({ w: c.volume - 3, text: 'Sostuviste el volumen hasta el final de las frases.' });
    else bad.push({ w: c.volume, text: 'Tu volumen baja al final de las frases. Sostén el aire hasta la última palabra.', exercise: 'proy-sostenida' });
  }
  if (c.timing != null && r.timing) {
    if (c.timing >= 90) good.push({ w: c.timing - 4, text: `Ajustaste tu mensaje al tiempo: ${fmtTime(r.timing.actual)} de ${fmtTime(r.timing.target)}.` });
    else if (r.timing.ratio > 1) bad.push({ w: c.timing, text: `Te pasaste del tiempo: ${fmtTime(r.timing.actual)} de ${fmtTime(r.timing.target)}. Deja una sola idea por bloque.`, exercise: null });
    else bad.push({ w: c.timing, text: `Terminaste antes: ${fmtTime(r.timing.actual)} de ${fmtTime(r.timing.target)}. Suma un ejemplo concreto.`, exercise: null });
  }
  if (c.weak != null && r.weak) {
    if (r.weak.total === 0 && r.activeSec >= 30) good.push({ w: 84, text: 'Hablaste con firmeza, sin frases que te resten fuerza.' });
    else if (c.weak < 80) bad.push({ w: c.weak, text: `Usaste ${pl(r.weak.total, 'frase que suaviza', 'frases que suavizan')} tu mensaje (${r.weak.top.map((x) => `«${x.key}»`).join(', ')}). Afirma directamente.`, exercise: 'mul-frases-firmes' });
  }
  if (r.structure) {
    const miss = r.structure.parts.filter((p) => !p.hit);
    if (!miss.length) good.push({ w: 88, text: `Seguiste la estructura completa: ${r.structure.parts.map((p) => p.label.toLowerCase()).join(', ')}.` });
    else bad.push({ w: r.comps.structure, text: `Te faltó ${listaY(miss.map((p) => `«${p.label.toLowerCase()}»`))}. ${miss[0].hint}`, exercise: null });
  }
  good.sort((a, b) => b.w - a.w);
  bad.sort((a, b) => a.w - b.w);
  return {
    strengths: good.slice(0, 2).map(({ text }) => ({ text })),
    improvements: bad.slice(0, 2).map(({ text, exercise }) => ({ text, exercise })),
  };
}

// Valor de cada habilidad a partir de una práctica (0–100, o null si no aplica).
export function skillSample(r, extra = {}) {
  const avg = (...xs) => {
    const v = xs.filter((x) => x != null);
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
  };
  const c = r.comps || {};
  return {
    ritmo: avg(c.pace, c.pauses),
    muletillas: c.fillers,
    energia: c.energy,
    claridad: avg(c.volume, r.confidence != null && r.confidence > 0 ? Math.round(r.confidence * 100) : null, extra.pronunciation ?? null),
    seguridad: avg(c.weak, r.pauses ? Math.round(clamp(100 - 15 * r.pauses.long, 20, 100)) : null, r.fillers && r.fillers.source === 'audio' ? c.fillers : null),
    storytelling: c.structure ?? extra.story ?? null,
  };
}
