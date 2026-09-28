import { useEffect, useRef, useState } from 'preact/hooks';
import { update } from '../app/store.js';
import { exerciseById } from '../content/exercises.js';
import { registerActivity } from '../app/logic.js';
import { unlockAudio } from '../audio/recorder.js';
import { back, go } from '../app/router.js';
import { Icon } from '../ui/icons.jsx';
import { announce } from '../ui/kit.jsx';
import { env } from '../app/env.js';

function chime(ctx, freq = 528) {
  if (!ctx) return;
  try {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 1.3);
  } catch { /* sin sonido */ }
}

export function Breathing({ id }) {
  const ex = exerciseById(id) || exerciseById('resp-478');
  const pattern = ex.pattern;
  const [state, setState] = useState('idle'); // idle | run | paused | done
  const [cycle, setCycle] = useState(0);
  const [pi, setPi] = useState(0);
  const [left, setLeft] = useState(pattern[0].sec);
  const [sound, setSound] = useState(true);
  const ctxRef = useRef(null);
  const started = useRef(0);
  const [xp, setXp] = useState(0);

  const cur = pattern[pi];
  const scale = cur.kind === 'in' ? 1 : cur.kind === 'hold' ? 1 : 0.7;

  useEffect(() => {
    if (state !== 'run') return undefined;
    const t = setTimeout(() => {
      if (left > 1) { setLeft(left - 1); return; }
      // siguiente fase
      let npi = pi + 1;
      let nc = cycle;
      if (npi >= pattern.length) { npi = 0; nc = cycle + 1; }
      if (nc >= ex.cycles) { finish(); return; }
      setPi(npi);
      setCycle(nc);
      setLeft(pattern[npi].sec);
      if (sound) chime(ctxRef.current, pattern[npi].kind === 'in' ? 528 : pattern[npi].kind === 'out' ? 396 : 440);
      if (env.canVibrate) { try { navigator.vibrate(30); } catch { /* */ } }
    }, 1000);
    return () => clearTimeout(t);
  }, [state, left, pi, cycle, sound]);

  const start = () => {
    ctxRef.current = unlockAudio();
    started.current = Date.now();
    setPi(0); setCycle(0); setLeft(pattern[0].sec);
    setState('run');
    if (sound) chime(ctxRef.current, 528);
  };

  const finish = () => {
    setState('done');
    const secs = Math.round((Date.now() - started.current) / 1000);
    const reg = update((d) => registerActivity(d, { kind: 'respiracion', refId: ex.id, title: ex.title, practiceSec: secs, xp: ex.xp }));
    setXp(reg.xp);
    announce(reg.events, reg.xp);
  };

  const stopEarly = () => {
    const secs = Math.round((Date.now() - started.current) / 1000);
    if (state !== 'idle' && state !== 'done' && secs >= 30) finish();
    else back('/');
  };

  const total = pattern.reduce((a, p) => a + p.sec, 0);

  return (
    <div class="breath">
      <header class="between-c" style={{ padding: '14px 12px 4px' }}>
        <button class="icon-btn" type="button" aria-label="Cerrar ejercicio" onClick={stopEarly}><Icon name="close" stroke={2} /></button>
        <span class="strong" style={{ fontSize: 15 }}>{ex.title}</span>
        <span class="tiny strong" style={{ width: 44, textAlign: 'center', color: 'var(--b-muted)' }}>{state === 'idle' ? '' : `${Math.min(cycle + 1, ex.cycles)}/${ex.cycles}`}</span>
      </header>

      <main style={{ flex: 1, padding: '8px var(--gutter)', display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'stretch' }}>
        <p class="small center" style={{ color: 'var(--b-muted)', lineHeight: 1.5 }}>{ex.desc}</p>
        <div class="orb-wrap">
          <span class="ring1" />
          <span class="ring2" />
          <div class="orb" style={{ transform: `scale(${state === 'run' || state === 'paused' ? scale : 0.85})`, transitionDuration: `${state === 'run' ? cur.sec : 0.4}s` }} aria-live="polite">
            {state === 'done' ? (
              <>
                <Icon name="check" size={40} stroke={2.4} />
                <span class="display" style={{ fontSize: 26 }}>¡Listo!</span>
                {xp > 0 && <span style={{ color: 'var(--b-muted)' }}>{`+${xp} XP`}</span>}
              </>
            ) : state === 'idle' ? (
              <>
                <span class="display" style={{ fontSize: 26 }}>Prepárate</span>
                <span style={{ color: 'var(--b-muted)', fontSize: 14 }}>{`${ex.cycles} ciclos · ${Math.round((total * ex.cycles) / 60)} min`}</span>
              </>
            ) : (
              <>
                <span class="display" style={{ fontSize: 30 }}>{cur.name}</span>
                <span style={{ color: 'var(--b-muted)', fontSize: 15 }}>{cur.sub}</span>
                <span class="display tabular" style={{ fontSize: 44, marginTop: 4 }}>{left}</span>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${pattern.length}, minmax(0, 1fr))`, gap: 8 }}>
          {pattern.map((p, i) => (
            <div key={i} class={`phase ${state !== 'idle' && state !== 'done' && i === pi ? 'on' : ''}`}>
              <span class="strong tabular" style={{ fontSize: 18 }}>{`${p.sec} s`}</span>
              <span class="tiny strong">{p.name}</span>
            </div>
          ))}
        </div>

        <div class="panel">
          <Icon name="bulb" size={18} style={{ flexShrink: 0, color: '#9CD3CA' }} />
          <span>{ex.tip}</span>
        </div>
      </main>

      <footer class="row" style={{ justifyContent: 'center', gap: 28, padding: '8px 20px calc(28px + env(safe-area-inset-bottom, 0px))' }}>
        <button class="round" type="button" aria-pressed={String(sound)} aria-label={sound ? 'Sonido guía activado' : 'Sonido guía desactivado'} onClick={() => setSound(!sound)}>
          <Icon name="volume" size={22} style={{ opacity: sound ? 1 : 0.45 }} />
        </button>
        {state === 'idle' && <button class="main" type="button" aria-label="Empezar" onClick={start}><Icon name="play" size={28} /></button>}
        {state === 'run' && <button class="main" type="button" aria-label="Pausar" onClick={() => setState('paused')}><Icon name="pause" size={26} stroke={2.4} /></button>}
        {state === 'paused' && <button class="main" type="button" aria-label="Reanudar" onClick={() => setState('run')}><Icon name="play" size={28} /></button>}
        {state === 'done' && <button class="main" type="button" aria-label="Volver al inicio" onClick={() => go('/', { replace: true })}><Icon name="home" size={26} /></button>}
        <button class="round" type="button" aria-label={state === 'done' ? 'Repetir' : 'Terminar'} onClick={state === 'done' ? start : stopEarly}>
          <Icon name={state === 'done' ? 'refresh' : 'check'} size={22} stroke={2.2} />
        </button>
      </footer>
    </div>
  );
}
