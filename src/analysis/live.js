// Métricas y consejos en vivo mientras hablas.
import { analyzeFrames, wpmFromSyllables, energyLabel, energyPosition } from '../audio/analyze.js';
import { lexicalAnalysis } from '../speech/lexical.js';
import { PACE_MIN, PACE_MAX } from './scoring.js';

export function liveMetrics({ frames, segments, interim, elapsed, sylPerWord = 1.85 }) {
  const out = { wpm: null, wpmLabel: 'Calculando…', fillers: 0, fillerKeys: [], pauses: 0, energy: null, energyPos: null, speaking: false, endDropRecent: false };
  // Acústica sobre los últimos 60 s para no recalcular toda la grabación.
  const win = frames.length > 6000 ? frames.slice(-6000) : frames;
  const ac = win.length >= 100 ? analyzeFrames(win) : null;
  const recent = frames.length >= 150 ? frames.slice(-150) : null;
  out.speaking = !!recent && recent.slice(-30).some((f) => f.db > (ac && !ac.lowSignal ? ac.noiseFloor + 12 : -45));

  // Transcripción
  const segs = [...segments];
  if (interim) segs.push({ text: interim, tStart: Math.max(0, elapsed - 2), tEnd: elapsed });
  const lex = segs.length ? lexicalAnalysis(segs) : null;

  if (lex && lex.words >= 8 && elapsed > 8) {
    const from = Math.max(0, elapsed - 30);
    const words = lex.tokens.filter((t) => t.t >= from).length;
    const first = ac && !ac.lowSignal && frames.length <= 6000 ? ac.first : (segs[0].tStart || 0);
    const span = Math.max(8, elapsed - Math.max(from, first));
    out.wpm = Math.round((words / span) * 60);
    out.source = 'asr';
  } else if (ac && !ac.lowSignal && ac.activeSec > 6) {
    const est = wpmFromSyllables(ac.syllables, ac.activeSec, sylPerWord);
    out.wpm = est ? Math.round(est) : null;
    out.source = 'acoustic';
  }
  if (out.wpm != null) {
    out.wpmLabel = out.wpm > PACE_MAX + 5 ? 'Rápido' : out.wpm < PACE_MIN - 10 ? 'Pausado' : 'En rango';
  }

  const hes = ac && !ac.lowSignal ? ac.hesitations.count : 0;
  if (lex) {
    const lexical = lex.fillers.filter((f) => f.key !== 'eh');
    out.fillers = lexical.length + Math.max(lex.vocalFillers, hes);
    out.fillerKeys = [...new Set(lex.fillers.map((f) => f.key))].slice(0, 2);
  } else {
    out.fillers = hes;
    out.fillerKeys = hes ? ['eh'] : [];
  }
  out.lastFillerAt = lex && lex.fillers.length ? lex.tokens[lex.fillers[lex.fillers.length - 1].i]?.t ?? null : null;

  if (ac && !ac.lowSignal) {
    out.pauses = ac.pauses.effective;
    out.longPauses = ac.pauses.long;
    const pitchWin = frames.length > 1500 ? analyzeFrames(frames.slice(-1500)) : ac;
    const std = pitchWin && !pitchWin.lowSignal && pitchWin.pitch ? pitchWin.pitch.std : null;
    out.energy = energyLabel(std);
    out.energyPos = energyPosition(std);
    const ph = ac.endDrop.phrases.slice(-2);
    out.endDropRecent = ph.length === 2 && ph.every((p) => p.isDrop);
    out.silenceNow = recent ? recent.every((f) => f.db < ac.noiseFloor + 8) : false;
  }
  return out;
}

// Elige un consejo breve según lo que está pasando (con pausa entre consejos).
export function coachHint(m, elapsed, prev = {}) {
  const t = elapsed;
  if (t < 8) return { key: 'start', text: 'Respira y empieza con calma. Te acompaño mientras hablas.' };
  if (m.silenceNow && t - (prev.lastSpeechAt || 0) > 4) return { key: 'silence', text: '¿Te perdiste? Resume lo último que dijiste y sigue.' };
  if (m.lastFillerAt != null && t - m.lastFillerAt < 4) return { key: 'filler', text: 'Cambia la muletilla por un silencio de un segundo.' };
  if (m.wpm && m.wpm > PACE_MAX + 12) return { key: 'fast', text: 'Vas rápido. Respira entre ideas y marca una pausa.' };
  if (m.wpm && m.wpm < PACE_MIN - 25 && t > 15) return { key: 'slow', text: 'Puedes dar un poco más de agilidad a lo secundario.' };
  if (m.endDropRecent) return { key: 'drop', text: 'Sostén el aire hasta la última palabra de la frase.' };
  if (m.energy === 'Monótona' && t > 15) return { key: 'flat', text: 'Varía el tono: sube la voz en la palabra clave.' };
  if (m.pauses === 0 && t > 25) return { key: 'nopause', text: 'Haz una pausa después de tu idea principal.' };
  if (m.wpmLabel === 'En rango') return { key: 'good', text: 'Buen ritmo. Sigue así.' };
  return prev.hint || { key: 'ok', text: 'Vas bien. Mantén la calma y las pausas.' };
}
