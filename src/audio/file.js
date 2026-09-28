// Análisis de una nota de voz subida (cuando el micrófono no está disponible).
// El archivo se lee en memoria y se descarta al terminar.
import { Resampler, FrameAnalyzer } from './dsp.js';

const MAX_SEC = 600;

export async function framesFromFile(file, onProgress = () => {}) {
  const buf = await file.arrayBuffer();
  let audio;
  try {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const ctx = new OAC(1, 16000, 16000);
    audio = await ctx.decodeAudioData(buf.slice(0));
  } catch {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    audio = await new Promise((res, rej) => ctx.decodeAudioData(buf.slice(0), res, rej));
    try { ctx.close(); } catch { /* */ }
  }
  const rate = audio.sampleRate;
  const len = Math.min(audio.length, Math.floor(MAX_SEC * rate));
  const mono = new Float32Array(len);
  for (let c = 0; c < audio.numberOfChannels; c++) {
    const ch = audio.getChannelData(c);
    for (let i = 0; i < len; i++) mono[i] += ch[i] / audio.numberOfChannels;
  }
  const frames = [];
  const rs = new Resampler(rate);
  const fa = new FrameAnalyzer((f) => { f.t = frames.length * 0.01; frames.push(f); });
  const CH = Math.round(rate * 2);
  for (let i = 0; i < len; i += CH) {
    fa.push(rs.push(mono.subarray(i, Math.min(len, i + CH))));
    onProgress(Math.min(1, (i + CH) / len));
    await new Promise((r) => setTimeout(r, 0));
  }
  return { frames, durationSec: len / rate, truncated: audio.length > len };
}
