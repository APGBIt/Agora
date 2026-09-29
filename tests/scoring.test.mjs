import test from 'node:test';
import assert from 'node:assert/strict';
import { readWav } from './wav.mjs';
import { framesFromSamples } from '../src/audio/dsp.js';
import { buildResult, paceScore, fillerScore, energyScore, skillSample, markTranscript, feedback } from '../src/analysis/scoring.js';
import { lexicalAnalysis } from '../src/speech/lexical.js';

const load = (name) => {
  const { samples, rate } = readWav(new URL(`./fixtures/${name}.wav`, import.meta.url));
  return { frames: framesFromSamples(samples, rate), durationSec: samples.length / rate };
};

test('puntuaciones parciales', () => {
  assert.equal(paceScore(145), 100);
  assert.ok(paceScore(190) < 60);
  assert.equal(fillerScore(0), 100);
  assert.ok(fillerScore(3) < 65);
  assert.ok(energyScore(1.0, 3) < 50);
  assert.ok(energyScore(3.5, 4) > 90);
});

test('resultado con transcripción', () => {
  const { frames, durationSec } = load('rate_proyecto_150');
  const segments = [
    { text: 'este la mitad de los retrasos empieza por un documento que nadie encuentra', tStart: 0.2, tEnd: 5.5, conf: 0.9 },
    { text: 'creamos un portal que reúne todos los protocolos en un solo lugar y cualquiera encuentra lo que necesita en segundos', tStart: 5.8, tEnd: 13, conf: 0.9 },
    { text: 'creo que le pido quince minutos para mostrárselo el jueves', tStart: 13.2, tEnd: 16.8, conf: 0.85 },
  ];
  const r = buildResult({ frames, durationSec, segments, asrState: 'ok', config: { kind: 'reto', refId: 'elevador', title: 'El elevador', targetSec: 60, framework: 'elevator' } });
  assert.equal(r.wpmSource, 'asr');
  assert.ok(r.wpm > 120 && r.wpm < 180, `wpm ${r.wpm}`);
  assert.equal(r.fillers.lexical, 1);
  assert.equal(r.weak.total, 1);
  assert.ok(r.overall > 0 && r.overall <= 100);
  assert.ok(r.transcript.some((p) => p.type === 'filler'));
  assert.ok(r.clean.text.startsWith('La mitad'));
  assert.ok(r.improvements.length >= 1);
  assert.ok(r.calibration && r.calibration.sylPerWord > 1.4);
  const sk = skillSample(r);
  assert.ok(sk.ritmo != null && sk.muletillas != null);
});

test('resultado solo con audio', () => {
  const { frames, durationSec } = load('hesitations');
  const r = buildResult({ frames, durationSec, segments: [], asrState: 'none', config: { kind: 'libre' } });
  assert.equal(r.wpmSource, 'acoustic');
  assert.equal(r.fillers.source, 'audio');
  assert.equal(r.fillers.total, 2);
  assert.equal(r.hasTranscript, false);
  assert.equal(r.transcript, null);
});

test('sin voz suficiente', () => {
  const { frames, durationSec } = load('noise_only');
  const r = buildResult({ frames, durationSec, segments: [], asrState: 'none', config: {} });
  assert.equal(r.lowSignal, true);
  assert.equal(r.overall, null);
  assert.equal(r.improvements.length, 1);
});

test('las pausas del audio se marcan en el corte del reconocedor más cercano', () => {
  const segs = [{ text: 'uno dos tres', tStart: 0, tEnd: 2 }, { text: 'cuatro cinco', tStart: 3.2, tEnd: 4.5 }];
  const lex = lexicalAnalysis(segs);
  // pausa real entre «tres» y «cuatro», pero los tiempos estimados de las palabras la pondrían antes de «tres»
  const parts = markTranscript(segs, lex, { lowSignal: false, pauses: { list: [{ t: 1.2, dur: 0.6 }] } });
  const flat = parts.map((p) => (p.type === 'pause' ? '‖' : p.text)).join(' ');
  assert.equal(flat, 'uno dos tres ‖ cuatro cinco');
  // en modo solo transcripción no hay pausas medidas: no se marca ninguna
  const none = markTranscript(segs, lex, { lowSignal: false, missing: true, pauses: null });
  assert.ok(!none.some((p) => p.type === 'pause'));
});

test('pausas demasiado seguidas no se describen como «pocas pausas»', () => {
  const r = { lowSignal: false, comps: { pauses: 60 }, pauses: { effective: 9, long: 0, perMin: 18 }, wpm: null, activeSec: 30 };
  const fb = feedback(r);
  assert.match(fb.improvements[0].text, /muy seguido/);
  assert.equal(fb.improvements[0].exercise, 'rit-lectura-marcada');
});

test('explicación en lenguaje claro: niveles y áreas ordenadas por peso', async () => {
  const { bandFor, explainResult, highlights } = await import('../src/analysis/explain.js');
  assert.equal(bandFor(92).label, 'Excelente');
  assert.equal(bandFor(74).label, 'Bien');
  assert.equal(bandFor(55).label, 'En progreso');
  assert.equal(bandFor(20).label, 'Para practicar');
  const r = {
    wpm: 190, wpmSource: 'asr',
    fillers: { total: 3, perMin: 3, top: [{ key: 'este', count: 3 }], source: 'texto y audio' },
    pauses: { effective: 4, long: 0, perMin: 4 },
    energy: { label: 'Monótona' },
    endDrop: { judged: 5, dropped: 1, ratio: 0.2 },
    comps: { pace: 58, fillers: 58, pauses: 100, energy: 40, volume: 90 },
  };
  const rows = explainResult(r);
  assert.deepEqual(rows.map((x) => x.key), ['pace', 'fillers', 'pauses', 'energy', 'volume']);
  assert.match(rows[0].value, /190 palabras por minuto/);
  assert.equal(rows[3].value, 'Poca');
  assert.equal(rows[4].value, '4 de 5 frases completas');
  const hl = highlights(rows);
  assert.equal(hl.best.key, 'pauses');
  assert.equal(hl.worst.key, 'energy');
  for (const row of rows) assert.ok(!/ppm|semitono|monótona|est\./i.test(`${row.name} ${row.value} ${row.note}`), `sin jerga: ${row.name}`);
});
