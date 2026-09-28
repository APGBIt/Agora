import { readFileSync } from 'node:fs';
import { readWav } from './wav.mjs';
import { framesFromSamples, FRAME_SEC } from '../src/audio/dsp.js';
import { analyzeFrames, syllableNuclei, levels } from '../src/audio/analyze.js';
const meta = JSON.parse(readFileSync(new URL('./fixtures/meta.json', import.meta.url)));
const cases = Object.entries(meta).filter(([n,m])=>m.kind==='rate');
const data = cases.map(([name,m])=>{ const {samples,rate}=readWav(new URL(`./fixtures/${name}.wav`, import.meta.url)); const frames=framesFromSamples(samples,rate); const a=analyzeFrames(frames); const {floor,thr}=levels(frames); const voiced=frames.map(f=>f.f0>0&&f.conf>=0.6&&f.db>floor+4); return {name,m,frames,sp:a.speechMask,voiced,thr}; });
for (const key of ["db","vdb"]) for (const smooth of [3,5,7]) for (const dip of [2,3,4,5]) for (const minDist of [8,10]) {
  let errs=[]; const detail=[];
  for (const d of data) { const n=syllableNuclei(d.frames,d.sp,d.voiced,d.thr,{smooth,dip,minDist,key}).length; const e=(n-d.m.synalepha)/d.m.synalepha; errs.push(e); detail.push((e*100).toFixed(0)); }
  const mae = errs.reduce((s,e)=>s+Math.abs(e),0)/errs.length;
  console.log(`${key} smooth ${smooth} dip ${dip} minDist ${minDist} MAE ${(mae*100).toFixed(1)}%  [${detail.join(' ')}]`);
}
