// Explora las métricas sobre los audios de prueba (no es un test: imprime valores para calibrar).
import { readFileSync } from 'node:fs';
import { readWav } from './wav.mjs';
import { framesFromSamples } from '../src/audio/dsp.js';
import { analyzeFrames } from '../src/audio/analyze.js';

const meta = JSON.parse(readFileSync(new URL('./fixtures/meta.json', import.meta.url)));
const only = process.argv[2];
for (const [name, m] of Object.entries(meta)) {
  if (only && !name.includes(only)) continue;
  const { samples, rate } = readWav(new URL(`./fixtures/${name}.wav`, import.meta.url));
  const t0 = performance.now();
  const frames = framesFromSamples(samples, rate);
  const a = analyzeFrames(frames);
  const ms = performance.now() - t0;
  const out = {
    dur: (samples.length / rate).toFixed(2),
    ms: ms.toFixed(0),
    low: a.lowSignal,
    active: a.activeSec?.toFixed(2),
    speech: a.speechSec?.toFixed(2),
    syl: a.syllables,
    pauses: a.pauses && `${a.pauses.micro}/${a.pauses.effective}/${a.pauses.long}`,
    pitch: a.pitch && `${a.pitch.median.toFixed(0)}Hz sd${a.pitch.std.toFixed(2)} r${a.pitch.range.toFixed(1)}`,
    loud: a.loudness && a.loudness.std.toFixed(2),
    drop: a.endDrop && `${a.endDrop.dropped}/${a.endDrop.judged} [${a.endDrop.phrases.map((p) => p.drop.toFixed(1)).join(',')}]`,
    hes: a.hesitations && a.hesitations.count,
  };
  if (m.kind === 'rate') {
    out.expected = `${m.synalepha} (orto ${m.ortho})`;
    out.err = a.syllables ? `${(((a.syllables - m.synalepha) / m.synalepha) * 100).toFixed(0)}%` : '-';
    out.realWpm = (m.words / (a.activeSec / 60)).toFixed(0);
    out.sylPerWord = (a.syllables / m.words).toFixed(2);
  }
  console.log(name.padEnd(22), JSON.stringify(out));
}
