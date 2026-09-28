import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useApp, update, getState } from '../app/store.js';
import { env, vibrate } from '../app/env.js';
import { go, back } from '../app/router.js';
import { getRecConfig, setRecConfig, setLastResult, markRegistered } from '../app/session.js';
import { SpeechSession } from '../audio/recorder.js';
import { framesFromFile } from '../audio/file.js';
import { analyzeFrames, wpmFromSyllables } from '../audio/analyze.js';
import { buildResult, skillSample } from '../analysis/scoring.js';
import { liveMetrics, coachHint } from '../analysis/live.js';
import { words as toWords, scriptPosition, lexicalAnalysis } from '../speech/lexical.js';
import { registerActivity, previousScore, makePlan, dayKey } from '../app/logic.js';
import { Icon } from '../ui/icons.jsx';
import { mmss, useInterval, announce, Sheet } from '../ui/kit.jsx';
import { freeConfig } from './configs.js';
import { TOPICS } from '../content/topics.js';
import { FRAMEWORKS } from '../speech/lexical.js';
import { localLangCache } from './asrCache.js';

function scriptTokens(text) {
  if (!text) return [];
  const out = [];
  for (const raw of text.split(/\s+/)) {
    if (!raw) continue;
    if (raw === '/' || raw === '//') { out.push({ mark: raw }); continue; }
    if (raw === '¶') { out.push({ mark: raw, br: true }); continue; }
    const w = toWords(raw)[0];
    out.push({ w: raw, n: w ? w.n : raw.toLowerCase() });
  }
  return out;
}

function evalGoal(goal, r) {
  if (!goal) return null;
  let value = null;
  if (goal.metric === 'pauses') value = r.pauses ? r.pauses.effective : null;
  if (goal.metric === 'fillers') value = r.fillers ? r.fillers.total : null;
  if (value == null) return { ...goal, value: null, met: null };
  const met = goal.min != null ? value >= goal.min : value <= goal.max;
  return { ...goal, value, met };
}

function computeRounds(out, marks, cfg) {
  const rounds = [];
  const bounds = [...marks, out.durationSec];
  for (let i = 0; i < cfg.phases.length; i++) {
    const t0 = bounds[i];
    const t1 = bounds[i + 1];
    if (t1 == null || t1 - t0 < 1) continue;
    const fr = out.frames.filter((f) => f.t >= t0 && f.t < t1);
    const ac = fr.length > 50 ? analyzeFrames(fr) : null;
    const segs = out.segments.filter((sg) => sg.tStart >= t0 - 0.5 && sg.tStart < t1);
    let wpm = null;
    let src = null;
    if (segs.length) {
      const lex = lexicalAnalysis(segs);
      const span = ac && !ac.lowSignal ? ac.activeSec : Math.max(1, t1 - t0);
      if (lex.words >= 4) { wpm = Math.round(lex.words / (span / 60)); src = 'asr'; }
    }
    if (wpm == null && ac && !ac.lowSignal) { wpm = Math.round(wpmFromSyllables(ac.syllables, ac.activeSec, getState().calib.sylPerWord) || 0) || null; src = 'acoustic'; }
    rounds.push({ label: cfg.phases[i].title, target: cfg.phases[i].targetWpm || null, wpm, src, dur: t1 - t0 });
  }
  return rounds;
}

export function Recorder({ query }) {
  const s = useApp();
  const cfg = useMemo(() => {
    let c = getRecConfig();
    if (query.get('libre') || !c) {
      c = freeConfig();
      setRecConfig(c);
    }
    return c;
  }, []);
  const [phase, setPhase] = useState(env.micLikely ? 'intro' : 'nomic');
  const [err, setErr] = useState(null);
  const [, setTick] = useState(0);
  const [live, setLive] = useState(null);
  const [hint, setHint] = useState(null);
  const [vib, setVib] = useState(s.settings.vibrate);
  const [thinkLeft, setThinkLeft] = useState(cfg.think || 0);
  const [count, setCount] = useState(3);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [confirmExit, setConfirmExit] = useState(false);
  const [progress, setProgress] = useState(0);
  const [topic] = useState(() => (cfg.kind === 'libre' ? TOPICS[Math.floor(Math.random() * TOPICS.length)].q : null));
  const sessRef = useRef(null);
  const marks = useRef([0]);
  const posRef = useRef(0);
  const hintAt = useRef(0);
  const fillersRef = useRef(0);
  const lastSpeech = useRef(0);

  const phases = cfg.phases || null;
  const curPhase = phases ? phases[phaseIdx] : null;
  const scriptText = curPhase ? curPhase.script || null : cfg.script;
  const tokens = useMemo(() => scriptTokens(scriptText), [scriptText]);
  const wordTokens = useMemo(() => tokens.filter((t) => !t.mark), [tokens]);

  useEffect(() => () => {
    const sess = sessRef.current;
    if (sess && sess.state !== 'done') sess.cancel();
  }, []);

  const sess = sessRef.current;
  const recording = phase === 'rec' || phase === 'paused';
  const elapsed = sess && recording ? sess.elapsed() : 0;

  // ---- inicio ----
  const onStart = async () => {
    setErr(null);
    const asrOn = s.settings.asr !== 'off' && env.hasSR;
    const session = new SpeechSession({
      asr: asrOn,
      asrLocal: s.settings.asrLocal ? localLangCache.lang : null,
      transcriptOnly: s.settings.analysisMode === 'transcript',
      keepAudio: true,
    });
    sessRef.current = session;
    session.armInGesture();
    try {
      await session.prepare();
    } catch (e) {
      session.cancel();
      sessRef.current = null;
      if (e.code === 'policy' || e.code === 'insecure' || e.code === 'unsupported') setPhase('nomic');
      else setErr(e.message || 'No se pudo abrir el micrófono.');
      return;
    }
    setCount(3);
    if (cfg.think) setPhase('think');
    else setPhase('count');
  };

  useEffect(() => {
    if (phase !== 'think') return undefined;
    if (thinkLeft <= 0) { setCount(3); setPhase('count'); return undefined; }
    const id = setTimeout(() => setThinkLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, thinkLeft]);

  useEffect(() => {
    if (phase !== 'count') return undefined;
    if (count <= 0) { beginRec(); return undefined; }
    const id = setTimeout(() => setCount((c) => c - 1), 750);
    return () => clearTimeout(id);
  }, [phase, count]);

  const beginRec = () => {
    const session = sessRef.current;
    if (!session) return;
    session.start();
    marks.current = [0];
    posRef.current = 0;
    setPhase('rec');
  };

  // ---- bucle en vivo ----
  useInterval(() => {
    const session = sessRef.current;
    if (!session || phase !== 'rec') return;
    const t = session.elapsed();
    if (cfg.maxSec && t >= cfg.maxSec) { onStop(); return; }
    // guion
    if (wordTokens.length) {
      const asrOk = session.asrState === 'ok' || (session.asr && session.asr.heardAnything);
      if (asrOk) {
        const heard = toWords(session.liveText());
        posRef.current = scriptPosition(wordTokens, heard, posRef.current);
      } else if (cfg.pacer || cfg.teleprompter || (curPhase && curPhase.targetWpm)) {
        const wpm = (curPhase && curPhase.targetWpm) || cfg.pacer || 130;
        const since = t - (marks.current[marks.current.length - 1] || 0);
        posRef.current = Math.min(wordTokens.length, Math.floor((since * wpm) / 60));
      }
    }
    setTick((x) => x + 1);
  }, 250, phase === 'rec');

  useInterval(() => {
    const session = sessRef.current;
    if (!session || phase !== 'rec') return;
    const t = session.elapsed();
    const m = liveMetrics({ frames: session.frames, segments: session.liveSegments(), interim: session.asr ? session.asr.interim : '', elapsed: t, sylPerWord: s.calib.sylPerWord });
    if (m.speaking) lastSpeech.current = t;
    if (m.fillers > fillersRef.current) {
      if (vib) vibrate(70);
      fillersRef.current = m.fillers;
    }
    const h = coachHint(m, t, { lastSpeechAt: lastSpeech.current, hint });
    if (!hint || h.key === 'filler' || h.key === 'silence' || t - hintAt.current > 6) {
      if (!hint || h.key !== hint.key) { setHint(h); hintAt.current = t; }
    }
    setLive(m);
  }, 1000, phase === 'rec');

  // ---- pausa / fin ----
  const onPause = () => { sessRef.current && sessRef.current.pause(); setPhase('paused'); };
  const onResume = () => { sessRef.current && sessRef.current.resume(); setPhase('rec'); };

  const onNextPhase = () => {
    const session = sessRef.current;
    if (!session) return;
    if (phaseIdx < phases.length - 1) {
      marks.current.push(session.elapsed());
      posRef.current = 0;
      setPhaseIdx(phaseIdx + 1);
    } else {
      onStop();
    }
  };

  const finish = (out, blob) => {
    const st = getState();
    const result = buildResult({ frames: out.frames, durationSec: out.durationSec, segments: out.segments || [], asrState: out.asrState || 'none', config: cfg, sylPerWord: st.calib.sylPerWord });
    result.cfg = { kind: cfg.kind, refId: cfg.refId, title: cfg.title, backTo: cfg.backTo, goal: cfg.goal || null, focusMetric: cfg.focusMetric || null, pairs: cfg.pairs || null };
    result.asrMode = out.asrMode || null;
    result.uploaded = !!out.uploaded;
    if (phases && phases.length > 1 && !out.uploaded) result.rounds = computeRounds(out, marks.current, cfg);
    result.goal = evalGoal(cfg.goal, result);
    result.prevScore = previousScore(st, cfg.kind, cfg.refId);
    if (!result.lowSignal) {
      const reg = update((draft) => {
        const skills = skillSample(result);
        if (cfg.kind === 'diagnostico') {
          const base = { ...skills };
          for (const k of Object.keys(base)) if (base[k] == null) base[k] = 60;
          const today = dayKey();
          const plan = makePlan(base);
          draft.diagnosis = {
            day: today,
            count: (draft.diagnosis?.count || 0) + 1,
            skills: base,
            metrics: {
              wpm: result.wpm, wpmSrc: result.wpmSource,
              fillersPerMin: result.fillers ? Math.round(result.fillers.perMin * 10) / 10 : null,
              fillerTop: result.fillers ? result.fillers.top.map((x) => x.key) : [],
              fillerSrc: result.fillers ? result.fillers.source : null,
              pitchStd: result.energy?.pitchStd ?? null,
              endDrop: result.endDrop?.ratio ?? null,
              pausesPerMin: result.pauses ? Math.round(result.pauses.perMin * 10) / 10 : null,
              weakPerMin: result.weak ? Math.round(result.weak.perMin * 10) / 10 : null,
            },
            strengths: result.strengths.map((x) => x.text),
            plan: { weeks: plan, start: today },
          };
          draft.profile.onboarded = true;
          if (!draft.profile.createdAt) draft.profile.createdAt = today;
        }
        return registerActivity(draft, {
          kind: cfg.kind, refId: cfg.refId, title: cfg.title, focus: cfg.focus || null,
          practiceSec: out.durationSec, xp: cfg.xp || 30, result, skills, env: { asr: env.hasSR },
        });
      });
      result.xpGained = reg.xp;
      markRegistered();
      announce(reg.events, reg.xp);
    }
    setLastResult(result, blob);
    go(cfg.resultRoute || '/analisis', { replace: true });
  };

  const onStop = async () => {
    const session = sessRef.current;
    if (!session || phase === 'processing') return;
    setPhase('processing');
    const out = await session.stop();
    setTimeout(() => finish(out, out.audioBlob), 30);
  };

  const onFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setPhase('processing');
    try {
      const { frames, durationSec } = await framesFromFile(file, setProgress);
      finish({ frames, durationSec, segments: [], asrState: 'none', uploaded: true }, file);
    } catch {
      setErr('No se pudo leer ese archivo. Prueba con una nota de voz en formato m4a, mp3, wav u ogg.');
      setPhase('nomic');
    }
  };

  const onClose = () => {
    const session = sessRef.current;
    if (recording && session && session.elapsed() > 5) { setConfirmExit(true); return; }
    if (session) session.cancel();
    back(cfg.backTo || '/');
  };

  // ---- vista ----
  const target = cfg.targetSec;
  let stepInfo = null;
  if (cfg.steps && cfg.steps.length) {
    let acc = 0;
    let idx = cfg.steps.length - 1;
    for (let i = 0; i < cfg.steps.length; i++) {
      if (elapsed < acc + cfg.steps[i].sec) { idx = i; break; }
      acc += cfg.steps[i].sec;
    }
    stepInfo = { idx, step: cfg.steps[idx], over: elapsed >= cfg.steps.reduce((a, b) => a + b.sec, 0) };
  }
  const levels = sess ? sess.levels.slice(-44) : [];
  const bars = Array.from({ length: 44 }, (_, i) => {
    const db = levels[i - (44 - levels.length)];
    if (db == null) return 6;
    return 6 + Math.max(0, Math.min(1, (db + 62) / 50)) * 54;
  });
  const asrLabel = !env.hasSR || s.settings.asr === 'off'
    ? 'Sin transcripción'
    : sess && (sess.asrState === 'failed' || sess.asrState === 'conflict')
      ? 'Transcripción no disponible'
      : sess && sess.asr && sess.asr.mode === 'local'
        ? 'Transcripción en el dispositivo'
        : 'Transcripción del navegador';
  const fw = cfg.framework ? FRAMEWORKS[cfg.framework] : null;

  if (phase === 'processing') {
    return (
      <div class="rec" style={{ justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24 }} role="status">
        <Icon name="sparkle" size={40} />
        <p class="display h2">Analizando tu voz…</p>
        {progress > 0 && progress < 1 && <p class="muted tabular">{`${Math.round(progress * 100)} %`}</p>}
        <p class="muted small center">Todo se calcula en este dispositivo.</p>
      </div>
    );
  }

  return (
    <div class="rec">
      <header class="between-c" style={{ padding: '14px 12px 0' }}>
        <button class="icon-btn" type="button" aria-label="Cerrar y descartar" onClick={onClose}><Icon name="close" stroke={2} /></button>
        <span class="strong" style={{ fontSize: 15, textAlign: 'center', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cfg.title}</span>
        {recording ? (
          <span class="rec-pill" style={{ marginRight: 4 }}><i />{phase === 'paused' ? 'PAUSA' : 'REC'}</span>
        ) : <span style={{ width: 44 }} />}
      </header>
      <div class="row tiny muted" style={{ justifyContent: 'center', gap: 6, padding: '2px 0 6px' }}>
        <Icon name="shield" size={13} stroke={2} />
        <span>{phase === 'nomic' ? 'Tu archivo se analiza aquí y no se guarda' : `Nada se guarda · ${asrLabel.toLowerCase()}`}</span>
      </div>

      {phase === 'nomic' && (
        <div class="inner">
          <div class="panel">
            <span class="eyebrow" style={{ color: 'var(--r-amber)' }}>Micrófono no disponible aquí</span>
            <p style={{ lineHeight: 1.5 }}>{env.micBlocked || env.framed ? 'Esta vista (dentro de Claude) no permite usar el micrófono. Puedes analizar una nota de voz, o abrir Ágora en su propio enlace para practicar en vivo.' : 'Este navegador no permite usar el micrófono aquí. Puedes analizar una nota de voz grabada con tu teléfono.'}</p>
          </div>
          <GuidePanel cfg={cfg} curPhase={curPhase} phases={phases} fw={fw} topic={topic} full />
          <div class="panel">
            <span class="strong">Analiza una nota de voz</span>
            <ol class="small muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
              <li>Graba tu práctica con la grabadora de voz de tu teléfono.</li>
              <li>Súbela aquí: medimos ritmo, pausas, energía y vacilaciones.</li>
              <li>Después bórrala de tu teléfono si no la quieres guardar.</li>
            </ol>
            <label class="btn btn-lg file-btn" style={{ background: 'var(--r-teal)', color: '#0B2220' }}>
              <Icon name="upload" size={20} />Subir nota de voz
              <input type="file" accept="audio/*,.m4a,.mp3,.wav,.ogg,.webm,.aac" onChange={onFile} aria-label="Subir nota de voz" />
            </label>
            {err && <p class="small" style={{ color: 'var(--r-amber)' }}>{err}</p>}
          </div>
          <a class="small" style={{ color: 'var(--r-teal-ink)', textAlign: 'center' }} href="#/ajustes?ayuda=app">¿Cómo abro la app completa con micrófono?</a>
        </div>
      )}

      {phase === 'intro' && (
        <>
          <div class="inner">
            <GuidePanel cfg={cfg} curPhase={curPhase} phases={phases} fw={fw} topic={topic} full />
            {scriptText && <ScriptView tokens={tokens} pos={-1} pairs={cfg.pairs} />}
            {err && <div class="hint" style={{ background: '#3A2620' }}><Icon name="alert" size={18} /><span>{err}</span></div>}
          </div>
          <div class="controls" style={{ flexDirection: 'column', gap: 10 }}>
            <button class="start" type="button" onClick={onStart} aria-label="Empezar a grabar"><Icon name="mic" size={40} stroke={1.9} /></button>
            <span class="small muted">{cfg.think ? 'Toca para ver tu tema: tendrás 15 s para pensar' : 'Toca para empezar · cuenta regresiva de 3 s'}</span>
          </div>
        </>
      )}

      {phase === 'think' && (
        <div class="inner" style={{ justifyContent: 'center' }}>
          <GuidePanel cfg={cfg} curPhase={curPhase} phases={phases} fw={fw} topic={topic} full />
          <div class="center" aria-live="polite">
            <div class="count tabular">{thinkLeft}</div>
            <p class="muted">segundos para pensar · la grabación empieza sola</p>
          </div>
          <button class="btn btn-lg" type="button" style={{ background: 'var(--r-teal)', color: '#0B2220' }} onClick={() => { setCount(3); setPhase('count'); }}>Ya tengo mi idea, empezar</button>
        </div>
      )}

      {phase === 'count' && (
        <div class="inner" style={{ justifyContent: 'center', alignItems: 'center' }} aria-live="assertive">
          <div class="count tabular">{count || '¡Ya!'}</div>
          <p class="muted">Respira…</p>
        </div>
      )}

      {recording && (
        <>
          <div class="inner">
            <div class="row" style={{ justifyContent: 'center', alignItems: 'baseline', gap: 8 }}>
              <span class="timer tabular" role="timer">{mmss(elapsed)}</span>
              {target && <span class="muted" style={{ fontSize: 15 }}>{`/ ${mmss(target)}`}</span>}
            </div>
            {target && <div class="progress"><span style={{ width: `${Math.min(100, (elapsed / target) * 100)}%` }} /></div>}

            {stepInfo && (
              <section class="panel" aria-label="Guía de estructura" aria-live="polite">
                <div class="between">
                  <span class="display" style={{ fontSize: 21 }}>{stepInfo.over ? 'Cierra cuando quieras' : stepInfo.step.name}</span>
                  <span class="tiny strong" style={{ color: 'var(--r-teal-ink)' }}>{`Paso ${stepInfo.idx + 1} de ${cfg.steps.length}`}</span>
                </div>
                <span class="small" style={{ color: '#C9C2B2', lineHeight: 1.45 }}>{stepInfo.over ? 'Ya cubriste todos los pasos. Termina con una frase clara.' : stepInfo.step.hint}</span>
                <div class="steps">{cfg.steps.map((st, i) => <span key={i} class={i < stepInfo.idx || stepInfo.over ? 'done' : i === stepInfo.idx ? 'now' : ''} />)}</div>
              </section>
            )}
            {!stepInfo && scriptText && (
              <div class="phase-line" aria-live="polite">
                <span class="strong" style={{ fontSize: 15 }}>{curPhase ? curPhase.title : 'Lee en voz alta'}</span>
                {phases && phases.length > 1 && <span class="tiny strong" style={{ color: 'var(--r-teal-ink)' }}>{`Parte ${phaseIdx + 1} de ${phases.length}`}</span>}
              </div>
            )}
            {!stepInfo && !scriptText && (phases || cfg.prompt || topic) && <GuidePanel cfg={cfg} curPhase={curPhase} phases={phases} fw={fw} topic={topic} />}
            {scriptText && <ScriptView tokens={tokens} pos={posRef.current} pairs={cfg.pairs} live />}

            {!scriptText && (
              <div class="wave" aria-hidden="true">
                {bars.map((h, i) => <span key={i} class={h > 8 ? 'on' : ''} style={{ height: `${h}px` }} />)}
              </div>
            )}

            {s.settings.analysisMode !== 'transcript' && (
              <div class="grid3" style={{ gap: 8 }}>
                <div class="metric"><span class="tiny muted">Ritmo</span><span class="v tabular">{live?.wpm ?? '—'} <span class="tiny muted">ppm</span></span><span class={`tiny strong ${live?.wpmLabel === 'En rango' ? 'ok' : 'warn'}`}>{live?.wpm ? `${live.wpmLabel}${live.source === 'acoustic' ? ' · est.' : ''}` : 'Calculando…'}</span></div>
                <div class="metric"><span class="tiny muted">Muletillas</span><span class="v tabular">{live?.fillers ?? 0}</span><span class="tiny strong warn" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{live?.fillerKeys?.length ? live.fillerKeys.map((k) => `«${k}»`).join(' · ') : <span class="ok">Ninguna</span>}</span></div>
                <div class="metric"><span class="tiny muted">Pausas</span><span class="v tabular">{live?.pauses ?? 0}</span><span class={`tiny strong ${(live?.pauses || 0) > 0 ? 'ok' : 'muted'}`}>{(live?.pauses || 0) > 0 ? 'Buen uso' : 'Aún ninguna'}</span></div>
              </div>
            )}

            {live?.energyPos != null && (
              <section class="stack-sm" aria-label="Energía de voz">
                <div class="between tiny"><span class="strong">Energía de voz</span><span class="strong ok">{live.energy}</span></div>
                <div class="meter"><i /><i /><i /><b style={{ left: `${live.energyPos * 100}%` }} /></div>
                <div class="between tiny muted"><span>Monótona</span><span>Expresiva</span><span>Exagerada</span></div>
              </section>
            )}

            {!scriptText && sess && sess.asr && sess.liveText() && (
              <div class="livetext" aria-hidden="true"><span>{sess.liveText().split(' ').slice(-24).join(' ')}</span></div>
            )}

            <div class="hint" aria-live="polite">
              <Icon name="bulb" size={18} style={{ flexShrink: 0, color: 'var(--r-teal-ink)' }} />
              <span>{phase === 'paused' ? 'En pausa. Toca reanudar cuando quieras seguir.' : hint ? hint.text : 'Respira y empieza con calma.'}</span>
            </div>
          </div>

          {phases && phases.length > 1 && (
            <div class="next-row">
              <button class="btn btn-block btn-lg" type="button" style={{ background: 'var(--r-teal)', color: '#0B2220' }} onClick={onNextPhase}>
                {phaseIdx < phases.length - 1 ? `Siguiente: ${phases[phaseIdx + 1].title}` : 'Terminar'}
                <Icon name="right" size={20} stroke={2} />
              </button>
            </div>
          )}

          <div class="controls">
            <div class="ctl">
              {env.canVibrate ? (
                <>
                  <button class="round" type="button" aria-pressed={String(vib)} aria-label="Vibrar al detectar una muletilla" onClick={() => setVib(!vib)}><Icon name="vibrate" size={22} /></button>
                  <span>Vibrar</span>
                </>
              ) : <span style={{ width: 52 }} />}
            </div>
            <button class="stop" type="button" aria-label="Detener y analizar" onClick={onStop}><span /></button>
            <div class="ctl">
              {phase === 'paused' ? (
                <><button class="round" type="button" aria-label="Reanudar" onClick={onResume}><Icon name="play" size={22} /></button><span>Reanudar</span></>
              ) : (
                <><button class="round" type="button" aria-label="Pausar" onClick={onPause}><Icon name="pause" size={22} stroke={2.2} /></button><span>Pausar</span></>
              )}
            </div>
          </div>
        </>
      )}

      <Sheet open={confirmExit} onClose={() => setConfirmExit(false)} title="¿Descartar esta práctica?">
        <p class="muted">Se borrará lo grabado. No se guarda nada.</p>
        <div class="row">
          <button class="btn btn-ghost grow" type="button" onClick={() => setConfirmExit(false)}>Seguir grabando</button>
          <button class="btn btn-danger grow" type="button" onClick={() => { const se = sessRef.current; if (se) se.cancel(); setConfirmExit(false); back(cfg.backTo || '/'); }}>Descartar</button>
        </div>
      </Sheet>
    </div>
  );
}

function GuidePanel({ cfg, curPhase, phases, fw, topic, full = false }) {
  const prompt = curPhase ? curPhase.prompt : cfg.prompt ? cfg.prompt.text : topic;
  const label = curPhase ? curPhase.title : cfg.prompt ? cfg.prompt.label : topic ? 'Tema sugerido' : null;
  const hint = curPhase ? curPhase.hint : cfg.prompt?.hint;
  return (
    <section class="panel" aria-live="polite">
      {phases && phases.length > 1 && <span class="tiny strong" style={{ color: 'var(--r-teal-ink)' }}>{`Parte ${phases.indexOf(curPhase) + 1} de ${phases.length}`}</span>}
      {label && <span class="eyebrow" style={{ color: 'var(--r-teal-ink)' }}>{label}</span>}
      {prompt && <p class="display" style={{ fontSize: 21, lineHeight: 1.3 }}>{prompt}</p>}
      {!prompt && full && cfg.objective && <p class="display" style={{ fontSize: 21, lineHeight: 1.3 }}>{cfg.title}</p>}
      {hint && <span class="small" style={{ color: '#C9C2B2' }}>{hint}</span>}
      {full && cfg.steps && cfg.steps.length > 0 && (
        <ol class="small" style={{ margin: 0, paddingLeft: 18, color: '#C9C2B2', lineHeight: 1.6 }}>
          {cfg.steps.map((st, i) => <li key={i}><strong style={{ color: 'var(--r-ink)' }}>{st.name}</strong>{` · ${st.sec} s · ${st.hint}`}</li>)}
        </ol>
      )}
      {full && fw && <span class="tiny" style={{ color: 'var(--r-amber)' }}>{`Estructura: ${fw.parts.map((p) => p.label).join(' · ')}`}</span>}
      {full && cfg.kind === 'libre' && topic && <span class="tiny muted">O habla de lo que quieras: es tu práctica.</span>}
    </section>
  );
}

function ScriptView({ tokens, pos, pairs, live = false }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!live || !ref.current) return;
    const cur = ref.current.querySelector('.cur');
    if (cur) cur.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [pos, live]);
  let wi = 0;
  return (
    <div class="script" ref={ref} aria-label="Texto para leer">
      {pairs && (
        <div class="stack-sm" style={{ fontFamily: 'var(--font-body)', fontSize: 14, marginBottom: 12 }}>
          {pairs.map(([weak, firm], i) => (
            <div key={i}><s style={{ color: '#8A8475' }}>{weak}</s>{' → '}<span style={{ color: 'var(--r-ink)', fontWeight: 700 }}>{firm}</span></div>
          ))}
        </div>
      )}
      {tokens.map((t, i) => {
        if (t.br) return <span key={i} class="br" aria-hidden="true" />;
        if (t.mark) return <span key={i} class="mark">{` ${t.mark} `}</span>;
        const idx = wi++;
        const cls = pos < 0 ? '' : idx < pos ? 'said' : idx === pos ? 'cur' : '';
        return <span key={i} class={cls}>{`${t.w} `}</span>;
      })}
    </div>
  );
}
