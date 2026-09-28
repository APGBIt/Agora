import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readWav } from './wav.mjs';
import { framesFromSamples, Resampler } from '../src/audio/dsp.js';
import { analyzeFrames, wpmFromSyllables } from '../src/audio/analyze.js';

const meta = JSON.parse(readFileSync(new URL('./fixtures/meta.json', import.meta.url)));
const cache = new Map();
function analyze(name) {
  if (!cache.has(name)) {
    const { samples, rate } = readWav(new URL(`./fixtures/${name}.wav`, import.meta.url));
    cache.set(name, analyzeFrames(framesFromSamples(samples, rate)));
  }
  return cache.get(name);
}

test('remuestreo conserva la duración', () => {
  const rs = new Resampler(48000);
  let total = 0;
  for (let i = 0; i < 100; i++) total += rs.push(new Float32Array(480)).length;
  assert.ok(Math.abs(total - 16000) <= 2, `total ${total}`);
});

test('pausas: micro, efectivas y largas', () => {
  const a = analyze('pauses');
  assert.equal(a.pauses.micro, 1);
  assert.equal(a.pauses.effective, 2);
  assert.equal(a.pauses.long, 1);
});

test('conteo de sílabas dentro de ±15 % en promedio', () => {
  const errs = Object.entries(meta)
    .filter(([, m]) => m.kind === 'rate')
    .map(([name, m]) => Math.abs(analyze(name).syllables - m.synalepha) / m.synalepha);
  const mae = errs.reduce((s, e) => s + e, 0) / errs.length;
  assert.ok(mae < 0.12, `MAE ${mae}`);
});

test('ritmo estimado sigue la velocidad real', () => {
  const slow = analyze('rate_marta_120');
  const fast = analyze('rate_marta_210');
  const w1 = wpmFromSyllables(slow.syllables, slow.activeSec);
  const w2 = wpmFromSyllables(fast.syllables, fast.activeSec);
  assert.ok(w2 > w1 * 1.4, `${w1} vs ${w2}`);
});

test('vacilaciones «eeeh» detectadas sin falsos positivos', () => {
  assert.equal(analyze('hesitations').hesitations.count, meta.hesitations.expected);
  assert.equal(analyze('flat').hesitations.count, 0);
  assert.equal(analyze('pauses').hesitations.count, 0);
});

test('volumen que cae al final de frase', () => {
  assert.ok(analyze('enddrop').endDrop.ratio >= 0.6);
  assert.ok(analyze('flat').endDrop.ratio <= 0.2);
});

test('tono: mediana y variación', () => {
  const t = analyze('tone200');
  assert.ok(Math.abs(t.pitch.median - 200) < 4, `${t.pitch.median}`);
  const v = analyze('tonevar');
  assert.ok(v.pitch.std > 2.5 && v.pitch.std < 4.2, `${v.pitch.std}`);
});

test('solo ruido: señal insuficiente', () => {
  assert.equal(analyze('noise_only').lowSignal, true);
});
