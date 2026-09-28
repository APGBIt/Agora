import { useEffect, useRef, useState } from 'preact/hooks';
import { useApp, update, getState } from '../app/store.js';
import { SCENARIOS, scenarioById } from '../content/scenarios.js';
import { FRAMEWORKS, lexicalAnalysis, structureCoverage, tokenize, findFillers } from '../speech/lexical.js';
import { SpeechSession, unlockAudio } from '../audio/recorder.js';
import { buildResult, skillSample, markTranscript } from '../analysis/scoring.js';
import { analyzeFrames } from '../audio/analyze.js';
import { registerActivity, previousScore } from '../app/logic.js';
import { speak, stopSpeaking, loadVoices } from '../speech/tts.js';
import { aiProvider, aiJSON, aiErrorText, aiPermanent, interviewerPrompt } from '../ai/ai.js';
import { setLastResult, markRegistered } from '../app/session.js';
import { env } from '../app/env.js';
import { go } from '../app/router.js';
import { Icon } from '../ui/icons.jsx';
import { TopBar, mmss, useInterval, announce, toast } from '../ui/kit.jsx';
import { localLangCache } from './asrCache.js';

const MAX_MAIN = 3;
const MAX_ANSWERS = 6;

function Marked({ text }) {
  const segs = [{ text, tStart: 0, tEnd: 1 }];
  const toks = tokenize(segs);
  const fil = new Set();
  for (const f of findFillers(toks)) for (let k = 0; k < f.len; k++) fil.add(f.i + k);
  return <>{toks.map((t, i) => (fil.has(i) ? <span key={i}><mark>{t.w}</mark> </span> : <span key={i}>{`${t.w} `}</span>))}</>;
}

export function Simulator({ query }) {
  const s = useApp();
  const [scId, setScId] = useState(query.get('escenario') || 'entrevista');
  const sc = scenarioById(scId) || SCENARIOS[0];
  const fw = FRAMEWORKS[sc.framework];
  const [phase, setPhase] = useState('setup'); // setup | running | done
  const [msgs, setMsgs] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | speaking | listening | thinking
  const [live, setLive] = useState('');
  const [cov, setCov] = useState(null);
  const [typed, setTyped] = useState('');
  const [voiceOn, setVoiceOn] = useState(env.hasTTS);
  const [provider, setProvider] = useState(null);
  const [useAI, setUseAI] = useState(true);
  const [nomic, setNomic] = useState(!env.micLikely || !env.hasSR);
  const [ansStart, setAnsStart] = useState(0);
  const sessRef = useRef(null);
  const answers = useRef([]);
  const flow = useRef({ q: 0, main: 0, follow: 0, history: [] });
  const listRef = useRef(null);

  useEffect(() => { loadVoices(); aiProvider(s.settings).then(setProvider); }, []);
  useEffect(() => () => { stopSpeaking(); if (sessRef.current && sessRef.current.state !== 'done') sessRef.current.cancel(); }, []);
  useEffect(() => { if (listRef.current) listRef.current.scrollIntoView({ block: 'end', behavior: 'smooth' }); }, [msgs.length, live, status]);

  const say = (text) => new Promise((resolve) => {
    setMsgs((m) => [...m, { role: 'ai', text }]);
    flow.current.history.push({ role: 'ai', text });
    if (voiceOn && env.hasTTS) {
      setStatus('speaking');
      speak(text, { rate: 1, voiceURI: s.settings.voiceURI, onEnd: () => { setStatus('idle'); resolve(); } });
    } else {
      setStatus('idle');
      resolve();
    }
  });

  const begin = async () => {
    unlockAudio();
    if (voiceOn) speak(' ', { rate: 1 });
    answers.current = [];
    flow.current = { q: 0, main: 1, follow: 0, history: [] };
    setMsgs([]);
    setPhase('running');
    await say(`${sc.intro} ${sc.questions[0]}`);
  };

  // ---- respuesta por voz ----
  const startAnswer = async () => {
    stopSpeaking();
    const sess = new SpeechSession({ asr: true, asrLocal: s.settings.asrLocal ? localLangCache.lang : null, keepAudio: false });
    sessRef.current = sess;
    sess.armInGesture();
    try { await sess.prepare(); } catch (e) {
      sess.cancel();
      if (e.code === 'policy' || e.code === 'insecure' || e.code === 'unsupported') setNomic(true);
      else toast(e.message, 'alert');
      return;
    }
    sess.start();
    setAnsStart(Date.now());
    setLive('');
    setCov(null);
    setStatus('listening');
  };

  useInterval(() => {
    const sess = sessRef.current;
    if (!sess || status !== 'listening') return;
    const text = sess.liveText();
    setLive(text);
    if (text) setCov(structureCoverage(sc.framework, lexicalAnalysis([{ text, tStart: 0, tEnd: 1 }]).tokens));
    if (sess.elapsed() > 150) endAnswer();
  }, 500, status === 'listening');

  const endAnswer = async () => {
    const sess = sessRef.current;
    if (!sess || status !== 'listening') return;
    setStatus('thinking');
    const out = await sess.stop();
    const text = out.segments.map((x) => x.text).join(' ').trim();
    await handleAnswer(text, out);
  };

  const sendTyped = async () => {
    const text = typed.trim();
    if (!text) return;
    setTyped('');
    setStatus('thinking');
    await handleAnswer(text, { frames: [], durationSec: Math.max(5, text.split(/\s+/).length / 2.3), segments: [{ text, tStart: 0, tEnd: Math.max(5, text.split(/\s+/).length / 2.3), conf: 1 }], asrState: 'ok' });
  };

  const handleAnswer = async (text, out) => {
    const f = flow.current;
    const segs = text ? [{ text, tStart: 0, tEnd: 1 }] : [];
    const coverage = segs.length ? structureCoverage(sc.framework, lexicalAnalysis(segs).tokens) : null;
    answers.current.push({ q: f.history.filter((h) => h.role === 'ai').slice(-1)[0]?.text || '', text, out, coverage });
    setMsgs((m) => [...m, { role: 'me', text: text || '(No se entendió la respuesta)' }]);
    f.history.push({ role: 'me', text: text || '(sin texto)' });
    setLive('');
    const done = answers.current.length >= MAX_ANSWERS || (f.main >= MAX_MAIN && (!coverage || coverage.parts.every((p) => p.hit) || f.follow >= 1));

    if (provider && useAI && text) {
      try {
        const turn = answers.current.length;
        const res = await aiJSON(provider, interviewerPrompt({
          scenario: sc, fwName: fw.name, fwParts: fw.parts.map((p) => p.label), history: f.history, answer: text, coverage,
          turn, maxTurns: MAX_ANSWERS - 1,
        }), { tier: 'quick' });
        if (res && res.consejo) setMsgs((m) => [...m, { role: 'tip', text: res.consejo }]);
        if (res && (res.fin || done)) { await finishSim(res.pregunta || sc.closing); return; }
        if (res && res.pregunta) {
          f.main += 1;
          await say(`${res.reaccion ? `${res.reaccion} ` : ''}${res.pregunta}`);
          return;
        }
      } catch (e) {
        if (e && e.code !== 'cancelled') toast(aiErrorText(e) || 'Seguimos sin IA.', 'info');
        if (aiPermanent(e)) setUseAI(false);
      }
    }

    // guion sin IA
    if (done) { await finishSim(sc.closing); return; }
    const missing = coverage ? coverage.parts.filter((p) => !p.hit) : [];
    const react = sc.reactions[Math.floor(Math.random() * sc.reactions.length)];
    if (missing.length && f.follow < 1 && sc.followups[missing[0].key] && text) {
      f.follow += 1;
      await say(`${react} ${sc.followups[missing[0].key]}`);
      return;
    }
    f.follow = 0;
    f.q = Math.min(sc.questions.length - 1, f.q + 1);
    f.main += 1;
    if (f.main > MAX_MAIN) { await finishSim(sc.closing); return; }
    await say(`${react} ${sc.questions[f.q]}`);
  };

  const finishSim = async (closing) => {
    await say(closing);
    setPhase('done');
    setStatus('idle');
  };

  const toAnalysis = () => {
    const frames = [];
    const segments = [];
    let offset = 0;
    let dur = 0;
    for (const a of answers.current) {
      const o = a.out;
      // Recortamos el silencio antes y después de cada respuesta: el tiempo entre tocar el
      // micrófono y empezar a hablar no es una pausa dentro de tu discurso.
      let fr = o.frames || [];
      a.ac = fr.length ? analyzeFrames(fr) : { lowSignal: true };
      if (!a.ac.lowSignal) fr = fr.filter((f) => f.t >= a.ac.first - 0.2 && f.t <= a.ac.last + 0.2);
      const base = fr.length ? fr[0].t : 0;
      for (const f of fr) frames.push({ ...f, t: f.t - base + offset });
      for (const sg of o.segments || []) segments.push({ ...sg, tStart: (sg.tStart || 0) - base + offset, tEnd: (sg.tEnd || 0) - base + offset });
      offset += fr.length ? fr[fr.length - 1].t - base + 0.01 : Math.max(1, (o.segments || []).reduce((m, sg) => Math.max(m, sg.tEnd || 0), 0));
      dur += o.durationSec || 0;
    }
    const st = getState();
    const cfg = { kind: 'simulador', refId: sc.id, title: sc.title, framework: sc.framework, noTiming: true };
    const result = buildResult({ frames, durationSec: dur, segments, asrState: segments.length ? 'ok' : 'none', config: cfg, sylPerWord: st.calib.sylPerWord });
    result.cfg = { kind: 'simulador', refId: sc.id, title: sc.title, backTo: '/simulador' };
    // cada respuesta con su propia transcripción marcada (solo en memoria, se borra al salir)
    result.sim = answers.current.map((a) => {
      const segs = (a.out.segments || []).filter((x) => (x.text || '').trim());
      const lex = segs.length ? lexicalAnalysis(segs) : null;
      const ac = a.ac || { lowSignal: true };
      return {
        q: a.q,
        parts: a.coverage ? a.coverage.parts.map((p) => ({ label: p.label, hit: p.hit })) : [],
        transcript: lex ? markTranscript(segs, lex, ac) : null,
      };
    });
    result.prevScore = previousScore(st, 'simulador', sc.id);
    if (!result.lowSignal) {
      const reg = update((d) => registerActivity(d, { kind: 'simulador', refId: sc.id, title: sc.title, practiceSec: dur, xp: 60, result, skills: skillSample(result), env: { asr: env.hasSR } }));
      result.xpGained = reg.xp;
      markRegistered();
      announce(reg.events, reg.xp);
    }
    setLastResult(result, null);
    go('/analisis', { replace: true });
  };

  const elapsed = status === 'listening' ? (Date.now() - ansStart) / 1000 : 0;
  const showCov = cov || (answers.current.length ? answers.current[answers.current.length - 1].coverage : null);

  return (
    <main class="screen no-tab">
      <TopBar title="Simulador" backTo="/entrenar" right={phase === 'running' ? <span class="pill pill-sm tone-coral" style={{ marginRight: 4 }}>En vivo</span> : null} />

      {phase === 'setup' && (
        <div class="chips" role="group" aria-label="Escenario">
          {SCENARIOS.map((x) => (
            <button key={x.id} type="button" class={`chip ${x.id === sc.id ? 'on' : ''}`} aria-pressed={String(x.id === sc.id)} onClick={() => setScId(x.id)}>{x.title}</button>
          ))}
        </div>
      )}

      <section class="card row" style={{ gap: 14 }} aria-label="Tu interlocutor">
        <span class="avatar">{sc.persona.initials}</span>
        <div class="stack-sm grow" style={{ gap: 6 }}>
          <span class="strong">{`${sc.persona.name} · ${sc.persona.role}`}</span>
          <div class="row wrap" style={{ gap: 6 }}>{sc.persona.traits.map((t) => <span key={t} class="tiny strong" style={{ padding: '3px 8px', borderRadius: 6, background: 'var(--bg)', color: 'var(--ink-2)' }}>{t}</span>)}</div>
        </div>
      </section>

      {phase === 'setup' && (
        <>
          <section class="card stack">
            <span class="strong">{`Practicarás la estructura ${fw.name}`}</span>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${fw.parts.length}, minmax(0, 1fr))`, gap: 8 }}>
              {fw.parts.map((p) => <div key={p.key} class="part miss">{p.label}</div>)}
            </div>
            <span class="small muted">{`${MAX_MAIN} preguntas principales. Si falta una parte, ${sc.persona.group ? 'te lo harán notar' : `${sc.persona.name} repreguntará`}.`}</span>
          </section>
          <section class={`notice ${provider ? 'violet' : ''}`}>
            <Icon name={provider ? 'sparkle' : 'info'} size={20} />
            <span class="small">{provider ? 'La conversación la lleva la IA: reacciona a lo que dices. Solo recibe el texto de tus respuestas, nunca el audio.' : 'Sin IA conectada, la conversación sigue un guion con repreguntas según lo que falte en tu respuesta. Puedes conectar IA en Ajustes.'}</span>
          </section>
          {provider && (
            <label class="row small" style={{ gap: 10 }}><input type="checkbox" checked={useAI} onChange={(e) => setUseAI(e.target.checked)} />Usar IA en esta conversación</label>
          )}
          {env.hasTTS && <label class="row small" style={{ gap: 10 }}><input type="checkbox" checked={voiceOn} onChange={(e) => setVoiceOn(e.target.checked)} />{`Escuchar a ${sc.persona.name} en voz alta`}</label>}
          {nomic && <section class="notice"><Icon name="info" size={20} /><span class="small">{!env.hasSR && env.micLikely ? 'Este navegador no transcribe la voz: escribe tus respuestas (en Chrome podrás responder hablando).' : 'Aquí el micrófono no está disponible: escribe tus respuestas. En la app completa podrás responder hablando.'}</span></section>}
          <div class="footer"><button class="btn btn-lg" type="button" onClick={begin}><Icon name="play" size={16} />Empezar la conversación</button></div>
        </>
      )}

      {phase !== 'setup' && (
        <>
          <div class="stack" style={{ gap: 12 }} aria-live="polite">
            {msgs.map((m, i) => (
              m.role === 'ai' ? <div key={i} class="bubble ai">{m.text}</div>
                : m.role === 'tip' ? <div key={i} class="bubble tip row-top" style={{ gap: 8 }}><Icon name="sparkle" size={16} style={{ flexShrink: 0, marginTop: 2 }} /><span>{m.text}</span></div>
                  : <div key={i} class="bubble me"><Marked text={m.text} /></div>
            ))}
            {status === 'listening' && (
              <div class="stack-sm" style={{ alignItems: 'flex-end' }}>
                <div class="bubble me">{live ? <Marked text={live} /> : 'Te escucho…'}</div>
                <span class="tiny muted">Transcripción en vivo · no se guarda</span>
              </div>
            )}
            {status === 'thinking' && <div class="typing"><span class="row" style={{ gap: 4 }}><i /><i /><i /></span>{`${sc.persona.name} está pensando`}</div>}
            {status === 'speaking' && <div class="typing"><Icon name="volume" size={16} />{`${sc.persona.name} está hablando`}</div>}
            <span ref={listRef} />
          </div>

          {phase === 'running' && (
            <section class="card stack" aria-label="Guía en vivo">
              <div class="between"><span class="strong small">{fw.name}</span><span class="small muted tabular">{status === 'listening' ? `${mmss(elapsed)} respondiendo` : `Respuesta ${answers.current.length + 1}`}</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${fw.parts.length}, minmax(0, 1fr))`, gap: 8 }}>
                {fw.parts.map((p) => {
                  const hit = showCov && showCov.parts.find((x) => x.key === p.key)?.hit;
                  return <div key={p.key} class={`part ${hit ? 'hit' : 'miss'}`}>{hit && <Icon name="check" size={14} stroke={2.6} />}{p.label}</div>;
                })}
              </div>
              <span class="small" style={{ color: 'var(--ink-2)' }}>{(() => { const miss = fw.parts.find((p) => !(showCov && showCov.parts.find((x) => x.key === p.key)?.hit)); return miss ? miss.hint : '¡Estructura completa!'; })()}</span>
            </section>
          )}

          {phase === 'running' && nomic && status === 'idle' && (
            <section class="stack-sm">
              <label class="strong small" for="respuesta">Tu respuesta</label>
              <textarea id="respuesta" class="field" rows={4} value={typed} onInput={(e) => setTyped(e.target.value)} placeholder="Escribe como si hablaras…" />
              <button class="btn" type="button" disabled={!typed.trim()} onClick={sendTyped}>Enviar respuesta</button>
            </section>
          )}

          <div class="footer" style={{ alignItems: 'center' }}>
            {phase === 'done' ? (
              <button class="btn btn-lg" type="button" onClick={toAnalysis}>Ver mi análisis<Icon name="right" size={18} stroke={2} /></button>
            ) : (
              <>
                <button class="btn btn-outline" type="button" disabled={!answers.current.length || status === 'listening'} onClick={() => finishSim(sc.closing)}>Terminar</button>
                {!nomic && (
                  <button
                    type="button"
                    class={`mic-big ${status === 'listening' ? 'on' : ''}`}
                    style={{ flex: '0 0 64px', width: 64, height: 64 }}
                    disabled={status === 'thinking' || status === 'speaking'}
                    aria-label={status === 'listening' ? 'Terminar mi respuesta' : 'Responder con la voz'}
                    onClick={status === 'listening' ? endAnswer : startAnswer}
                  >
                    <Icon name={status === 'listening' ? 'stop' : 'mic'} size={26} stroke={1.9} />
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}
    </main>
  );
}
