// Afinación y entonación a partir de los cuadros de análisis (f0 en Hz, conf, db).
import { percentile } from './dsp.js';

// Diferencia en cents, perdonando la octava (cantar la misma nota más grave o más aguda cuenta).
export const foldCents = (c) => ((((c + 600) % 1200) + 1200) % 1200) - 600;

export const voicedF0 = (frames) => frames.filter((f) => f.f0 > 0 && f.conf >= 0.6 && f.db > -58).map((f) => f.f0);

// Curva de tono de una frase en semitonos, suavizada y sin saltos de octava.
export function contourOf(frames) {
  const pts = [];
  frames.forEach((f, k) => { if (f.f0 > 0 && f.conf >= 0.6) pts.push({ k, st: 12 * Math.log2(f.f0 / 100) }); });
  if (pts.length < 20) return null;
  const sm = pts.map((p, j) => ({ k: p.k, st: percentile(pts.slice(Math.max(0, j - 2), j + 3).map((q) => q.st), 50) }));
  const med = percentile(sm.map((p) => p.st), 50);
  return sm.filter((p) => Math.abs(p.st - med) < 9);
}

// ¿El final sube (pregunta) o baja (afirmación)? En el Caribe la pregunta suele subir y caer un poco al final,
// por eso miramos el pico del último tramo y no solo la última sílaba.
export function finalDirection(pts) {
  if (!pts || pts.length < 20) return null;
  const n = pts.length;
  const body = pts.slice(Math.floor(n * 0.2), Math.floor(n * 0.65)).map((p) => p.st);
  const ref = percentile(body.length ? body : pts.map((p) => p.st), 50);
  const tail = pts.slice(Math.floor(n * 0.65)).map((p) => p.st);
  const peak = Math.max(...tail);
  const end = percentile(pts.slice(-8).map((p) => p.st), 50);
  if (peak - ref >= 2) return { dir: 'sube', ref, rise: peak - ref };
  if (end <= ref - 0.8) return { dir: 'baja', ref, rise: peak - ref };
  return { dir: 'plana', ref, rise: peak - ref };
}
