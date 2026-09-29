// Explicaciones en lenguaje claro para cualquier persona, sin términos técnicos.
import { PACE_MIN, PACE_MAX, WEIGHTS } from './scoring.js';

// Niveles de la puntuación total, de 0 a 100.
export const BANDS = [
  { min: 0, max: 49, label: 'Para practicar', text: 'Es tu punto de partida. Repite la práctica y compara.' },
  { min: 50, max: 69, label: 'En progreso', text: 'Vas por buen camino. Enfócate en una sola cosa a la vez.' },
  { min: 70, max: 84, label: 'Bien', text: 'Buena base. Pule uno o dos detalles para llegar a excelente.' },
  { min: 85, max: 100, label: 'Excelente', text: 'Hablas con claridad y seguridad. ¡Mantén el ritmo!' },
];
export const bandFor = (s) => (s == null ? null : BANDS.find((b) => s >= b.min && s <= b.max) || BANDS[0]);

// Variedad de tono: cuánto sube y baja la voz.
export const TONE_WORD = { Monótona: 'Poca', Expresiva: 'Buena', Exagerada: 'Demasiada' };
export const TONE_NOTE = {
  Monótona: 'Tu voz casi no sube ni baja, y eso la hace sonar plana. Sube el tono en las palabras importantes.',
  Expresiva: 'Tu voz sube y baja con naturalidad: se escucha viva e interesante.',
  Exagerada: 'Tu voz sube y baja demasiado. Guarda los cambios de tono para lo más importante.',
};

export const wpmText = (wpm, src) => (wpm == null ? 'Sin datos' : `${wpm} palabras por minuto${src === 'acoustic' ? ' (aprox.)' : ''}`);

// Nivel de un área según su puntuación (0–100).
export function levelOf(score) {
  if (score == null) return null;
  if (score >= 80) return { kind: 'good', text: 'Bien' };
  if (score >= 55) return { kind: 'warn', text: 'Mejorable' };
  return { kind: 'low', text: 'A trabajar' };
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const mmss = (sec) => { const s = Math.round(sec || 0); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

// Una fila por área medida: qué es, cuánto sacaste y qué significa, ordenadas por lo que más cuenta.
export function explainResult(r) {
  const c = r.comps || {};
  const rows = [];
  const add = (key, name, value, note) => { if (c[key] != null) rows.push({ key, name, value, note, score: c[key], level: levelOf(c[key]), weight: WEIGHTS[key] || 0 }); };

  if (r.wpm != null) {
    const fast = r.wpm > PACE_MAX;
    const slow = r.wpm < PACE_MIN;
    add('pace', 'Velocidad al hablar', wpmText(r.wpm, r.wpmSource),
      fast ? `Un poco rápido. Lo ideal para que te entiendan es entre ${PACE_MIN} y ${PACE_MAX}.` : slow ? `Un poco lento. Lo ideal es entre ${PACE_MIN} y ${PACE_MAX} palabras por minuto.` : 'A buena velocidad: se te entiende sin esfuerzo.');
  }
  if (r.fillers) {
    const f = r.fillers;
    const audio = f.source === 'audio';
    const name = audio ? 'Titubeos («eh», «mmm»)' : 'Muletillas';
    const list = f.top && f.top.length ? ` (${f.top.map((x) => `«${x.key}» ${x.count}`).join(', ')})` : '';
    add('fillers', name, f.total === 0 ? 'Ninguna' : `${f.total}${list}`,
      f.total === 0 ? 'Sin palabras de relleno. ¡Muy bien!' : `Unas ${f.perMin.toFixed(1).replace('.', ',')} por minuto. Lo ideal es una o menos: cámbialas por un silencio corto.`);
  }
  if (r.pauses) {
    const p = r.pauses;
    const value = `${plural(p.effective, 'pausa', 'pausas')}${p.long ? ` y ${plural(p.long, 'silencio largo', 'silencios largos')}` : ''}`;
    const note = (c.pauses ?? 0) >= 80 ? 'Haces silencios cortos que dan tiempo a entender cada idea.'
      : p.long > 1 ? 'Algunos silencios duraron más de dos segundos. Si te pierdes, resume y sigue.'
        : p.perMin > 12 ? 'Te detuviste muy seguido y la idea se corta. Une las frases.'
          : 'Casi no hiciste pausas. Detente un segundo después de cada idea.';
    add('pauses', 'Pausas entre ideas', value, note);
  }
  if (r.energy && r.energy.label) {
    add('energy', 'Variedad de tono', TONE_WORD[r.energy.label] || r.energy.label, TONE_NOTE[r.energy.label] || '');
  }
  if (r.endDrop && r.endDrop.judged) {
    const kept = r.endDrop.judged - r.endDrop.dropped;
    add('volume', 'Fuerza al final de las frases', `${kept} de ${plural(r.endDrop.judged, 'frase', 'frases')} completas`,
      (c.volume ?? 0) >= 80 ? 'Mantienes la voz hasta la última palabra.' : 'Tu voz se apaga al final de algunas frases. Guarda aire para la última palabra.');
  }
  if (r.timing) {
    add('timing', 'Tiempo', `${mmss(r.timing.actual)} de ${mmss(r.timing.target)}`,
      (c.timing ?? 0) >= 90 ? 'Te ajustaste al tiempo.' : r.timing.ratio > 1 ? 'Te pasaste del tiempo. Deja una sola idea por parte.' : 'Terminaste antes. Suma un ejemplo concreto.');
  }
  if (r.weak) {
    add('weak', 'Frases que restan fuerza', r.weak.total === 0 ? 'Ninguna' : `${r.weak.total} (${r.weak.top.map((x) => `«${x.key}»`).join(', ')})`,
      r.weak.total === 0 ? 'Hablaste con firmeza.' : 'Frases como «creo que» o «tal vez» suavizan tu mensaje. Afirma directamente.');
  }
  if (r.structure) {
    const hits = r.structure.parts.filter((p) => p.hit).length;
    const miss = r.structure.parts.filter((p) => !p.hit).map((p) => p.label.toLowerCase());
    add('structure', 'Orden de tus ideas', `${hits} de ${r.structure.parts.length} partes`,
      miss.length ? `Faltó: ${miss.join(', ')}.` : 'Seguiste todas las partes de la estructura.');
  }
  return rows.sort((a, b) => b.weight - a.weight);
}

// Lo más fuerte y lo que más conviene mejorar, para el resumen.
export function highlights(rows) {
  if (rows.length < 2) return null;
  const byScore = rows.slice().sort((a, b) => b.score - a.score);
  const best = byScore[0];
  const worst = byScore[byScore.length - 1];
  if (best.score - worst.score < 10) return null;
  return { best, worst: worst.score < 80 ? worst : null };
}
