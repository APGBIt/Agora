import { useEffect, useRef, useState } from 'preact/hooks';
import { useApp, update } from '../app/store.js';
import { exerciseById, categoryById } from '../content/exercises.js';
import { FRAMEWORKS } from '../speech/lexical.js';
import { registerActivity } from '../app/logic.js';
import { setRecConfig } from '../app/session.js';
import { SpeechSession } from '../audio/recorder.js';
import { percentile, std } from '../audio/dsp.js';
import { env } from '../app/env.js';
import { go, back } from '../app/router.js';
import { Icon } from '../ui/icons.jsx';
import { TopBar, Bar, mmss, announce, toast, useInterval } from '../ui/kit.jsx';
import { exerciseConfig } from './configs.js';
import { localLangCache } from './asrCache.js';

export function Exercise({ id }) {
  const ex = exerciseById(id);
  useEffect(() => {
    if (!ex) go('/entrenar', { replace: true });
    else if (ex.type === 'breath') go(`/respiracion/${ex.id}`, { replace: true });
    else if (ex.type === 'twister') go(`/pronunciacion/${ex.twister}`, { replace: true });
    else if (ex.type === 'improv') go(`/improvisacion?modo=${ex.mode}`, { replace: true });
    else if (ex.type === 'story') go('/historias', { replace: true });
  }, [id]);
  if (!ex) return null;
  if (ex.type === 'guided') return <Guided ex={ex} />;
  if (ex.type === 'sustain') return <Sustain ex={ex} />;
  if (ex.type === 'glide') return <Glide ex={ex} />;
  if (ex.type === 'speak' || ex.type === 'read') return <SpeakIntro ex={ex} />;
  return null;
}

function Header({ ex }) {
  const cat = categoryById(ex.cat);
  return (
    <>
      <TopBar title={cat.title} backTo={`/entrenar/${ex.cat}`} />
      <div class="row" style={{ gap: 14 }}>
        <span class={`icon-circle tone-${cat.tone}`} style={{ width: 52, height: 52, borderRadius: 16 }}><Icon name={cat.icon} size={26} /></span>
        <div class="stack-sm" style={{ gap: 2 }}>
          <span class="eyebrow muted">{`${ex.minutes} min · Nivel ${ex.level}`}</span>
          <h1 class="display h2">{ex.title}</h1>
        </div>
      </div>
      <p class="lead">{ex.desc}</p>
    </>
  );
}

// ---------- Ejercicios con grabación (hablar o leer) ----------

function SpeakIntro({ ex }) {
  const fw = ex.framework ? FRAMEWORKS[ex.framework] : null;
  const start = () => { setRecConfig(exerciseConfig(ex)); go('/grabar'); };
  return (
    <main class="screen no-tab">
      <Header ex={ex} />
      {ex.prompt && (
        <section class="card stack">
          <span class="eyebrow teal-t">Tu tema</span>
          <p class="display" style={{ fontSize: 20, lineHeight: 1.35 }}>{ex.prompts ? 'Te daremos un tema al azar al empezar.' : ex.prompt}</p>
        </section>
      )}
      {ex.pairs && (
        <section class="card stack">
          <span class="eyebrow teal-t">Frases que vas a leer</span>
          {ex.pairs.map(([weak, firm], i) => (
            <div class="stack-sm" key={i} style={{ gap: 0 }}>
              <s class="small muted">{weak}</s>
              <span class="strong">{firm}</span>
            </div>
          ))}
        </section>
      )}
      {ex.text && !ex.pairs && (
        <section class="card stack">
          <span class="eyebrow teal-t">Texto</span>
          <p class="display" style={{ fontSize: 19, lineHeight: 1.55, fontWeight: 500 }}>
            {ex.marks ? ex.text.split(/\s+/).map((t, i) => (t === '/' || t === '//' ? <strong key={i} class="amber-t">{` ${t} `}</strong> : <span key={i}>{`${t} `}</span>)) : ex.text}
          </p>
          {ex.marks && <span class="small muted">Una barra es una pausa corta; dos barras, una pausa larga.</span>}
          {ex.pacer && <span class="small muted">{`La guía resaltará cada palabra a ${ex.pacer} palabras por minuto.`}</span>}
        </section>
      )}
      {ex.rounds && (
        <section class="card stack">
          <span class="eyebrow teal-t">{`${ex.rounds.length} rondas`}</span>
          {ex.rounds.map((r, i) => (
            <div class="between" key={i}><span class="strong small">{`${i + 1}. ${r.label}`}</span><span class="small muted">{r.targetWpm ? `${r.targetWpm} ppm` : r.hint}</span></div>
          ))}
          <span class="small muted">Durante la grabación toca «Siguiente» para pasar de una ronda a la otra.</span>
        </section>
      )}
      {ex.steps && typeof ex.steps[0] === 'object' && (
        <section class="card stack">
          <span class="eyebrow teal-t">Guía por tiempo</span>
          {ex.steps.map((st, i) => <div class="between" key={i}><span class="strong small">{st.name}</span><span class="small muted">{`${st.sec} s`}</span></div>)}
        </section>
      )}
      {fw && <p class="small muted">{`Buscaremos esta estructura: ${fw.parts.map((p) => p.label).join(' · ')}.`}</p>}
      {ex.goal && <section class="notice teal"><Icon name="target" size={20} /><span class="small strong">{`Meta: ${ex.goal.label}`}</span></section>}
      <div class="footer">
        <button class="btn btn-lg" type="button" onClick={start}><Icon name="mic" size={18} />Empezar</button>
      </div>
    </main>
  );
}

// ---------- Guiados (sin grabar) ----------

function Guided({ ex }) {
  const [state, setState] = useState('idle');
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(ex.steps[0].sec);
  const [mirror, setMirror] = useState(false);
  const [xp, setXp] = useState(0);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const started = useRef(0);

  useInterval(() => {
    if (left > 1) { setLeft(left - 1); return; }
    if (i + 1 < ex.steps.length) {
      setI(i + 1);
      setLeft(ex.steps[i + 1].sec);
      if (env.canVibrate) { try { navigator.vibrate(40); } catch { /* */ } }
    } else {
      done();
    }
  }, 1000, state === 'run');

  useEffect(() => () => stopMirror(), []);

  const done = () => {
    setState('done');
    stopMirror();
    const secs = Math.round((Date.now() - started.current) / 1000);
    const reg = update((d) => registerActivity(d, { kind: 'guiado', refId: ex.id, title: ex.title, practiceSec: secs, xp: ex.xp }));
    setXp(reg.xp);
    announce(reg.events, reg.xp);
  };

  const startMirror = async () => {
    try {
      const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = st;
      setMirror(true);
      setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = st; videoRef.current.play().catch(() => {}); } }, 50);
    } catch {
      toast('No se pudo abrir la cámara aquí.', 'camera');
    }
  };
  const stopMirror = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setMirror(false);
  };

  const step = ex.steps[i];
  const total = ex.steps.reduce((a, b) => a + b.sec, 0);
  const elapsedSteps = ex.steps.slice(0, i).reduce((a, b) => a + b.sec, 0) + (step.sec - left);

  return (
    <main class="screen no-tab">
      <Header ex={ex} />
      {mirror && (
        <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#000', aspectRatio: '3 / 4', maxHeight: '46vh' }}>
          <video ref={videoRef} playsInline muted autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
          <span class="pill pill-sm" style={{ position: 'absolute', left: 10, top: 10, background: 'rgba(0,0,0,.55)', color: '#fff' }}><Icon name="shield" size={12} />Espejo: no se graba</span>
        </div>
      )}
      <section class="card stack pad-lg" aria-live="polite">
        {state === 'done' ? (
          <div class="stack center" style={{ alignItems: 'center' }}>
            <span class="check" style={{ width: 48, height: 48, borderRadius: 24 }}><Icon name="check" size={24} stroke={2.6} /></span>
            <h2 class="display h2">¡Ejercicio completo!</h2>
            {xp > 0 && <span class="pill tone-amber">{`+${xp} XP`}</span>}
          </div>
        ) : (
          <>
            <div class="between"><span class="eyebrow teal-t">{`Paso ${i + 1} de ${ex.steps.length}`}</span><span class="tabular strong">{state === 'idle' ? mmss(total) : mmss(left)}</span></div>
            <h2 class="display h2">{step.name}</h2>
            <p class="lead">{step.hint}</p>
            <Bar value={state === 'idle' ? 0 : elapsedSteps / total} />
          </>
        )}
      </section>
      {state !== 'done' && (
        <ol class="small muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
          {ex.steps.map((st, k) => <li key={k} style={k === i && state !== 'idle' ? { color: 'var(--teal)', fontWeight: 700 } : null}>{`${st.name} · ${st.sec} s`}</li>)}
        </ol>
      )}
      {ex.mirror && env.secure && env.hasGUM && !env.framed && state !== 'done' && (
        <button class="btn btn-ghost" type="button" onClick={mirror ? stopMirror : startMirror}><Icon name="camera" size={18} />{mirror ? 'Cerrar espejo' : 'Usar la cámara como espejo'}</button>
      )}
      <div class="footer">
        {state === 'idle' && <button class="btn btn-lg" type="button" onClick={() => { started.current = Date.now(); setState('run'); }}><Icon name="play" size={16} />Empezar</button>}
        {state === 'run' && (
          <>
            <button class="btn btn-outline" type="button" onClick={() => setState('paused')}><Icon name="pause" size={18} />Pausar</button>
            <button class="btn wide" type="button" onClick={() => { if (i + 1 < ex.steps.length) { setI(i + 1); setLeft(ex.steps[i + 1].sec); } else done(); }}>Siguiente paso<Icon name="right" size={18} stroke={2} /></button>
          </>
        )}
        {state === 'paused' && <button class="btn btn-lg" type="button" onClick={() => setState('run')}><Icon name="play" size={16} />Reanudar</button>}
        {state === 'done' && <button class="btn btn-lg" type="button" onClick={() => back(`/entrenar/${ex.cat}`)}>Volver</button>}
      </div>
    </main>
  );
}

// ---------- Sostener un sonido ----------

const NUMS = ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve', 'treinta'];

function countReached(text) {
  const t = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  let best = 0;
  for (const m of t.matchAll(/\d+/g)) best = Math.max(best, Number(m[0]));
  NUMS.forEach((w, i) => {
    const n = w.normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (new RegExp(`\\b${n}\\b`).test(t)) best = Math.max(best, i + 1);
  });
  return best;
}

function useVoiceSession() {
  const ref = useRef(null);
  useEffect(() => () => { if (ref.current && ref.current.state !== 'done') ref.current.cancel(); }, []);
  return ref;
}

function Sustain({ ex }) {
  const s = useApp();
  const sessRef = useVoiceSession();
  const [phase, setPhase] = useState('idle'); // idle | calib | wait | on | done
  const [secs, setSecs] = useState(0);
  const [result, setResult] = useState(null);
  const [nomic, setNomic] = useState(!env.micLikely);
  const floorRef = useRef(null);
  const run = useRef({ startT: null, lastOnT: null, dbs: [], f0s: [] });
  const best = Math.max(0, ...s.history.filter((e) => e.refId === ex.id && e.extra && e.extra.sustainSec).map((e) => e.extra.sustainSec));
  const kind = ex.cat === 'respiracion' ? 'respiracion' : 'ejercicio';

  const isOn = (f) => {
    const fl = floorRef.current;
    if (fl == null) return false;
    if (ex.mode === 'sss') return f.db > fl + 9 && (f.f0 === 0 || f.conf < 0.5) && f.hf > 4;
    if (ex.mode === 'aaa') return f.db > fl + 9 && f.f0 > 0 && f.conf >= 0.5;
    return f.db > fl + 9;
  };

  useInterval(() => {
    const sess = sessRef.current;
    if (!sess) return;
    const fr = sess.frames;
    if (phase === 'calib') {
      if (fr.length >= 50) {
        floorRef.current = percentile(fr.slice(-50).map((f) => f.db), 50);
        setPhase('wait');
      }
      return;
    }
    if (phase !== 'wait' && phase !== 'on') return;
    const recent = fr.slice(-5);
    const on = recent.length && recent.filter(isOn).length >= 3;
    const t = fr.length * 0.01;
    const R = run.current;
    const gap = ex.mode === 'contar' ? 0.6 : 0.35;
    if (on) {
      if (R.startT == null) { R.startT = t - 0.05; setPhase('on'); }
      R.lastOnT = t;
      for (const f of recent) { if (isOn(f)) { R.dbs.push(f.db); if (f.f0 > 0) R.f0s.push(f.f0); } }
      setSecs(t - R.startT);
    } else if (R.startT != null && t - R.lastOnT > gap) {
      finish();
      return;
    } else if (R.startT != null) {
      setSecs(R.lastOnT - R.startT);
    }
    if (t > 90) finish();
  }, 100, phase === 'calib' || phase === 'wait' || phase === 'on');

  const start = async () => {
    const sess = new SpeechSession({ asr: ex.mode === 'contar' && s.settings.asr !== 'off' && env.hasSR, asrLocal: s.settings.asrLocal ? localLangCache.lang : null, keepAudio: false });
    sessRef.current = sess;
    sess.armInGesture();
    try { await sess.prepare(); } catch (e) {
      sess.cancel();
      if (e.code === 'policy' || e.code === 'insecure' || e.code === 'unsupported') setNomic(true);
      else toast(e.message, 'alert');
      return;
    }
    run.current = { startT: null, lastOnT: null, dbs: [], f0s: [] };
    floorRef.current = null;
    setSecs(0);
    setResult(null);
    sess.start();
    setPhase('calib');
  };

  const finish = async () => {
    const sess = sessRef.current;
    if (!sess || phase === 'done') return;
    setPhase('done');
    const R = run.current;
    const dur = R.startT != null ? Math.max(0, R.lastOnT - R.startT) : 0;
    const out = await sess.stop();
    const steady = R.dbs.length > 20 ? std(R.dbs) : null;
    let reached = null;
    if (ex.mode === 'contar') reached = countReached(out.segments.map((x) => x.text).join(' '));
    const r = { dur: Math.round(dur * 10) / 10, steady, reached };
    setResult(r);
    if (dur >= 1) {
      const reg = update((d) => registerActivity(d, { kind, refId: ex.id, title: ex.title, practiceSec: out.durationSec, xp: ex.xp, extra: { sustainSec: r.dur, reached } }));
      announce(reg.events, reg.xp);
      if (r.dur > best && best > 0) toast(`¡Nuevo récord: ${r.dur.toFixed(1)} s!`, 'award', 4000);
    }
  };

  const goal = ex.goalSec;
  const pct = Math.min(1, secs / goal);
  return (
    <main class="screen no-tab">
      <Header ex={ex} />
      <section class="card stack pad-lg center" style={{ alignItems: 'center' }} aria-live="polite">
        <span class="display tabular" style={{ fontSize: 64, lineHeight: 1 }}>{(result ? result.dur : secs).toFixed(1)}<span style={{ fontSize: 22 }}> s</span></span>
        <span class="small muted">{phase === 'calib' ? 'Silencio un momento: midiendo el ruido…' : phase === 'wait' ? `¡Ya! ${ex.mode === 'sss' ? 'Suelta tu «sss»' : ex.mode === 'aaa' ? 'Di «aaa»' : 'Empieza a contar'}` : phase === 'on' ? 'Sigue, sin forzar…' : result ? (result.dur >= goal ? '¡Meta cumplida!' : `Meta: ${goal} s`) : `Meta: ${goal} s · Tu récord: ${best ? `${best.toFixed(1)} s` : '—'}`}</span>
        <div style={{ width: '100%' }}><Bar value={result ? Math.min(1, result.dur / goal) : pct} tone={pct >= 1 ? '' : 'amber'} /></div>
        {result && result.reached ? <span class="strong">{`Llegaste hasta el ${result.reached}`}</span> : null}
        {result && result.steady != null && <span class="small muted">{result.steady < 3 ? 'Sonido muy parejo. ¡Excelente control!' : result.steady < 5 ? 'Bastante parejo. Suelta el aire más despacio al final.' : 'El volumen varió bastante: busca un sonido más constante.'}</span>}
      </section>
      <ol class="small" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>{ex.steps.map((t, i) => <li key={i}>{t}</li>)}</ol>
      <section class="card-amber row-top" style={{ padding: 14 }}><Icon name="bulb" size={20} style={{ color: 'var(--amber-ink)', flexShrink: 0 }} /><span class="small">{ex.tip}</span></section>
      {nomic && <section class="notice"><Icon name="info" size={20} /><span class="small">Aquí el micrófono no está disponible. Practica con un cronómetro o abre la app completa para medirte.</span></section>}
      <div class="footer">
        {(phase === 'idle' || phase === 'done') && <button class="btn btn-lg" type="button" disabled={nomic} onClick={start}><Icon name="mic" size={18} />{phase === 'done' ? 'Otra vez' : 'Empezar'}</button>}
        {(phase === 'calib' || phase === 'wait' || phase === 'on') && <button class="btn btn-lg btn-outline" type="button" onClick={finish}>Terminar</button>}
      </div>
    </main>
  );
}

// ---------- La sirena (rango de tono) ----------

function Glide({ ex }) {
  const s = useApp();
  const sessRef = useVoiceSession();
  const [phase, setPhase] = useState('idle');
  const [trace, setTrace] = useState([]);
  const [range, setRange] = useState(null);
  const [nomic, setNomic] = useState(!env.micLikely);
  const startedAt = useRef(0);

  const compute = (frames) => {
    const f0 = frames.filter((f) => f.f0 > 0 && f.conf >= 0.6 && f.db > -55).map((f) => 12 * Math.log2(f.f0 / 100));
    if (f0.length < 20) return null;
    return percentile(f0, 95) - percentile(f0, 5);
  };

  useInterval(() => {
    const sess = sessRef.current;
    if (!sess || phase !== 'on') return;
    const fr = sess.frames.slice(-400);
    setTrace(fr.map((f) => (f.f0 > 0 && f.conf >= 0.6 ? 12 * Math.log2(f.f0 / 100) : null)));
    setRange(compute(sess.frames));
    if ((Date.now() - startedAt.current) / 1000 > 20) finish();
  }, 150, phase === 'on');

  const start = async () => {
    const sess = new SpeechSession({ asr: false, keepAudio: false });
    sessRef.current = sess;
    sess.armInGesture();
    try { await sess.prepare(); } catch (e) {
      sess.cancel();
      if (e.code === 'policy' || e.code === 'insecure' || e.code === 'unsupported') setNomic(true);
      else toast(e.message, 'alert');
      return;
    }
    setTrace([]); setRange(null);
    startedAt.current = Date.now();
    sess.start();
    setPhase('on');
  };

  const finish = async () => {
    const sess = sessRef.current;
    if (!sess || phase !== 'on') return;
    setPhase('done');
    const out = await sess.stop();
    const r = compute(out.frames);
    setRange(r);
    if (r != null) {
      const reg = update((d) => registerActivity(d, { kind: 'ejercicio', refId: ex.id, title: ex.title, practiceSec: out.durationSec, xp: ex.xp, extra: { rangeSt: Math.round(r * 10) / 10 } }));
      announce(reg.events, reg.xp);
    } else {
      toast('No detectamos bien tu tono. Prueba con «mmm» más fuerte.', 'mic');
    }
  };

  const vals = trace.filter((v) => v != null);
  const lo = vals.length ? Math.min(...vals) - 1 : -2;
  const hi = vals.length ? Math.max(...vals) + 1 : 20;
  const pts = trace.map((v, i) => (v == null ? null : `${(i / 399) * 300},${100 - ((v - lo) / Math.max(1, hi - lo)) * 90 - 5}`)).filter(Boolean).join(' ');
  const best = Math.max(0, ...s.history.filter((e) => e.refId === ex.id && e.extra && e.extra.rangeSt).map((e) => e.extra.rangeSt));

  return (
    <main class="screen no-tab">
      <Header ex={ex} />
      <section class="card stack pad-lg" aria-live="polite">
        <div class="between"><span class="strong">Tu rango</span><span class="display tabular" style={{ fontSize: 28 }}>{range != null ? `${range.toFixed(1)} st` : '—'}</span></div>
        <svg viewBox="0 0 300 100" width="100%" height="110" role="img" aria-label="Recorrido de tu tono en los últimos segundos" style={{ background: 'var(--bg)', borderRadius: 12 }}>
          <path d="M0 95H300" stroke="var(--line-2)" stroke-width="1" />
          {pts && <polyline points={pts} fill="none" stroke="var(--teal)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />}
        </svg>
        <Bar value={range != null ? Math.min(1, range / ex.goalSt) : 0} tone={range != null && range >= ex.goalSt ? '' : 'amber'} />
        <span class="small muted">{`Meta: ${ex.goalSt} semitonos (una octava). Tu mejor marca: ${best ? `${best} st` : '—'}.`}</span>
        {phase === 'done' && range != null && <span class="small strong teal-t">{range >= ex.goalSt ? '¡Rango amplio! Tu voz tiene mucho espacio para expresar.' : 'Buen trabajo. Con práctica diaria el rango crece.'}</span>}
      </section>
      <ol class="small" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>{ex.steps.map((t, i) => <li key={i}>{t}</li>)}</ol>
      <section class="card-amber row-top" style={{ padding: 14 }}><Icon name="bulb" size={20} style={{ color: 'var(--amber-ink)', flexShrink: 0 }} /><span class="small">{ex.tip}</span></section>
      {nomic && <section class="notice"><Icon name="info" size={20} /><span class="small">Aquí el micrófono no está disponible. Abre la app completa para medir tu rango.</span></section>}
      <div class="footer">
        {phase !== 'on' ? <button class="btn btn-lg" type="button" disabled={nomic} onClick={start}><Icon name="mic" size={18} />{phase === 'done' ? 'Otra vez' : 'Empezar'}</button>
          : <button class="btn btn-lg btn-outline" type="button" onClick={finish}>Terminar</button>}
      </div>
    </main>
  );
}
