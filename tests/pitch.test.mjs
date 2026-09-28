import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { readWav } from './wav.mjs';
import { framesFromSamples } from '../src/audio/dsp.js';
import { foldCents, contourOf, finalDirection } from '../src/audio/pitch.js';

test('cents con perdón de octava', () => {
  assert.equal(foldCents(0), 0);
  assert.equal(foldCents(1200), 0);
  assert.equal(foldCents(-1230), -30);
  assert.equal(foldCents(40), 40);
});

// Tono sintético: comprueba que el detector sigue una nota cantada con precisión.
test('afinación: un tono de 220 Hz se mide a menos de 20 cents', () => {
  const rate = 16000;
  const n = rate * 2;
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = 0.3 * Math.sin((2 * Math.PI * 220 * i) / rate) + 0.1 * Math.sin((2 * Math.PI * 440 * i) / rate);
  const fr = framesFromSamples(x, rate).filter((f) => f.f0 > 0 && f.conf >= 0.6);
  const cents = fr.map((f) => foldCents(1200 * Math.log2(f.f0 / 220))).sort((a, b) => a - b);
  assert.ok(Math.abs(cents[Math.floor(cents.length / 2)]) < 20);
});

// Voz sintética: la pregunta debe sonar «sube» y la afirmación «baja».
test('entonación: pregunta frente a afirmación con voz sintética', () => {
  const dir = new URL('./fixtures/inton/', import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith('.wav'));
  let ok = 0;
  const fails = [];
  for (const f of files) {
    const { samples, rate } = readWav(new URL(f, dir));
    const d = finalDirection(contourOf(framesFromSamples(samples, rate)));
    const want = f.startsWith('preg') ? 'sube' : 'baja';
    if (d && d.dir === want) ok++; else fails.push(`${f}: ${d ? `${d.dir} (${d.rise.toFixed(1)} st)` : 'sin datos'}`);
  }
  assert.ok(ok / files.length >= 0.85, `aciertos ${ok}/${files.length}. Fallos: ${fails.join('; ')}`);
});
