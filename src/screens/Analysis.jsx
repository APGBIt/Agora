import { useEffect, useRef, useState } from 'preact/hooks';
import { useApp } from '../app/store.js';
import { getLastResult, getAudioUrl, clearResult, discardAudio, setRecConfig } from '../app/session.js';
import { go } from '../app/router.js';
import { env } from '../app/env.js';
import { Icon } from '../ui/icons.jsx';
import { TopBar, Ring, Bar, mmss, toast } from '../ui/kit.jsx';
import { exerciseById } from '../content/exercises.js';
import { exerciseHref } from './configs.js';
import { aiProvider, aiJSON, aiErrorText, aiPermanent, improvePrompt } from '../ai/ai.js';
import { BANDS, bandFor, explainResult, highlights, wpmText } from '../analysis/explain.js';

function Legend({ pauses }) {
  return (
    <div class="legend">
      <span><i class="sw" style={{ background: 'var(--coral-soft)', border: '1px solid var(--coral-line)' }} />Muletilla</span>
      <span><span style={{ textDecoration: 'underline wavy var(--violet)', textUnderlineOffset: 3, color: 'var(--ink)' }}>abc</span>Palabra débil</span>
      {pauses && <span><strong class="teal-t">‖</strong>Pausa</span>}
    </div>
  );
}

function TranscriptText({ parts, style }) {
  return (
    <p class="transcript" style={style}>
      {parts.map((p, i) => {
        if (p.type === 'pause') return <strong class="pz" key={i} aria-label="pausa">‖</strong>;
        if (p.type === 'filler') return <span key={i}><mark>{p.text}</mark>{' '}</span>;
        if (p.type === 'weak') return <span key={i}><span class="weak">{p.text}</span>{' '}</span>;
        if (p.type === 'rep') return <span key={i}><span class="rep">{p.text}</span>{' '}</span>;
        return <span key={i}>{`${p.text} `}</span>;
      })}
    </p>
  );
}

function ScoreScale({ value }) {
  return (
    <div class="stack-sm" style={{ gap: 6 }} aria-hidden="true">
      <div class="scale">
        {BANDS.map((b) => <span key={b.label} class={value >= b.min && value <= b.max ? 'on' : ''} style={{ flex: b.max - b.min + 1 }} />)}
        <i style={{ left: `${Math.max(1, Math.min(99, value))}%` }} />
      </div>
      <div class="scale-labels">
        {BANDS.map((b) => <span key={b.label} style={{ flex: b.max - b.min + 1 }} class={value >= b.min && value <= b.max ? 'on' : ''}>{b.label}</span>)}
      </div>
    </div>
  );
}

const hasPause = (parts) => !!parts && parts.some((p) => p.type === 'pause');

export function Analysis() {
  const s = useApp();
  const [r] = useState(() => getLastResult());
  const [audioUrl, setAudioUrl] = useState(() => getAudioUrl());
  const [erased, setErased] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ai, setAi] = useState({ state: 'idle' });
  const [provider, setProvider] = useState(null);
  const audioRef = useRef(null);
  const ctlRef = useRef(null);

  useEffect(() => {
    if (!r) go('/', { replace: true });
    aiProvider(s.settings).then(setProvider);
    return () => {
      if (ctlRef.current) ctlRef.current.abort();
      clearResult();
    };
  }, []);

  if (!r) return null;

  const cfg = r.cfg || {};
  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) { a.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); }
    else { a.pause(); setPlaying(false); }
  };

  const eraseNow = () => {
    if (audioRef.current) audioRef.current.pause();
    discardAudio();
    setAudioUrl(null);
    setErased(true);
    setPlaying(false);
    toast('Audio borrado', 'trash');
  };

  const finishAll = () => {
    if (audioRef.current) audioRef.current.pause();
    clearResult();
    toast(audioUrl ? 'Listo: audio y transcripción borrados' : 'Listo: transcripción borrada', 'trash');
    go('/', { replace: true });
  };

  const repeat = () => {
    if (cfg.kind === 'simulador') go(`/simulador?escenario=${cfg.refId}`, { replace: true });
    else go('/grabar', { replace: true });
  };

  const recordVersion = (text) => {
    setRecConfig({ kind: 'ejercicio', refId: 'version-mejorada', title: 'Tu versión mejorada', xp: 30, targetSec: null, maxSec: 240, steps: [], script: text, noTiming: true, backTo: '/' });
    go('/grabar', { replace: true });
  };

  const askAI = async () => {
    if (!provider || !r.transcript) return;
    const ctl = new AbortController();
    ctlRef.current = ctl;
    setAi({ state: 'loading' });
    const text = r.transcript.filter((p) => p.type !== 'pause').map((p) => p.text).join(' ');
    try {
      const out = await aiJSON(provider, improvePrompt({ transcript: text, title: r.title, goal: cfg.goal?.label, framework: r.structure?.name }), { signal: ctl.signal });
      if (!out || typeof out.version !== 'string') throw { code: 'invalid_json' };
      setAi({ state: 'done', version: out.version, cambios: Array.isArray(out.cambios) ? out.cambios.slice(0, 3) : [] });
    } catch (e) {
      if (e && e.code === 'cancelled') { setAi({ state: 'idle' }); return; }
      setAi({ state: 'error', msg: aiErrorText(e) });
      if (aiPermanent(e)) setProvider(null);
    }
  };

  if (r.lowSignal) {
    return (
      <main class="screen no-tab">
        <TopBar title="Tu análisis" onBack={finishAll} />
        <section class="card stack pad-lg center" style={{ alignItems: 'center' }}>
          <span class="icon-circle tone-amber" style={{ width: 56, height: 56, borderRadius: 28 }}><Icon name="mic" size={28} /></span>
          <h1 class="display h2">No te escuchamos bien</h1>
          <p class="muted">{r.improvements[0]?.text}</p>
          <p class="small muted">Revisa que el micrófono no esté tapado y que no haya mucho ruido alrededor.</p>
        </section>
        <div class="footer">
          <button class="btn btn-outline" type="button" onClick={finishAll}>Salir</button>
          <button class="btn wide" type="button" onClick={repeat}><Icon name="refresh" size={18} />Intentar de nuevo</button>
        </div>
      </main>
    );
  }

  const delta = r.prevScore != null && r.overall != null ? r.overall - r.prevScore : null;
  const fil = r.fillers;
  const isSim = !!(r.sim && r.sim.length);
  const band = bandFor(r.overall);
  const rows = explainResult(r);
  const hl = highlights(rows);
  // en el simulador, cada respuesta se muestra por separado (sin versión única «más limpia»)
  const version = isSim ? null : ai.state === 'done' ? ai.version : r.clean?.text;
  const removed = ai.state === 'done' ? null : r.clean?.removed;
  const privacyText = audioUrl
    ? 'El audio y la transcripción se borran al salir. Solo guardamos las puntuaciones.'
    : erased
      ? 'Audio borrado. Solo guardamos las puntuaciones.'
      : r.transcript || isSim
        ? 'Esta práctica no guardó audio. La transcripción se borra al salir; solo quedan las puntuaciones.'
        : 'Esta práctica no guardó audio. Solo quedan las puntuaciones.';
  const simPauses = isSim && r.sim.some((a) => hasPause(a.transcript));
  const simHasText = isSim && r.sim.some((a) => a.transcript);

  return (
    <main class="screen no-tab">
      <TopBar title="Tu análisis" onBack={finishAll} label="Salir del análisis" />

      <section class="card-soft row" aria-label="Privacidad de esta sesión" style={{ gap: 12 }}>
        <Icon name="shieldCheck" size={22} stroke={1.9} style={{ flexShrink: 0 }} />
        <span class="small grow" style={{ lineHeight: 1.4 }}>{privacyText}</span>
        {audioUrl && (
          <>
            <button class="icon-btn" type="button" style={{ background: 'var(--teal)', color: 'var(--on-teal)' }} aria-label={playing ? 'Pausar tu grabación' : 'Escuchar tu grabación ahora'} onClick={togglePlay}>
              <Icon name={playing ? 'pause' : 'play'} size={18} stroke={2.2} />
            </button>
            <audio ref={audioRef} src={audioUrl} preload="auto" onEnded={() => setPlaying(false)} />
          </>
        )}
      </section>

      <section class="card stack pad-lg" aria-label="Puntuación total">
        <div class="row" style={{ gap: 18 }}>
          <Ring size={108} stroke={10} value={(r.overall || 0) / 100} color={band && band.min >= 70 ? 'var(--teal)' : 'var(--amber)'} label={`Puntuación total: ${r.overall} de 100`}>
            <text x="54" y="58" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-size="34" font-weight="700" fill="var(--ink)">{r.overall}</text>
            <text x="54" y="77" text-anchor="middle" font-size="11" font-weight="600" fill="var(--muted)">de 100</text>
          </Ring>
          <div class="stack-sm" style={{ alignItems: 'flex-start', minWidth: 0 }}>
            <span class="eyebrow teal-t">{r.title}</span>
            <h1 class="display h2">{band ? band.label : r.message}</h1>
            <span class="small" style={{ lineHeight: 1.45, color: 'var(--ink-2)' }}>{band ? band.text : ''}</span>
          </div>
        </div>
        {band && <ScoreScale value={r.overall} />}
        {hl && (
          <div class="stack-sm" style={{ gap: 4 }}>
            <span class="small"><strong class="teal-t">Lo más fuerte:</strong>{` ${hl.best.name.toLowerCase()}.`}</span>
            {hl.worst && <span class="small"><strong class="amber-t">Lo que más te conviene mejorar:</strong>{` ${hl.worst.name.toLowerCase()}.`}</span>}
          </div>
        )}
        <div class="row wrap" style={{ gap: 8 }}>
          <span class="pill pill-sm tone-sunken">{`Hablaste ${mmss(r.activeSec)}`}</span>
          {delta != null && <span class={`pill pill-sm ${delta > 0 ? 'tone-teal' : 'tone-sunken'}`}>{delta > 0 ? `+${delta} puntos vs. la vez anterior` : delta < 0 ? `${delta} puntos vs. la vez anterior` : 'Igual que la vez anterior'}</span>}
          {delta == null && <span class="pill pill-sm tone-sunken">Primera vez con esta práctica</span>}
          {r.xpGained ? <span class="pill pill-sm tone-amber">{`+${r.xpGained} XP`}</span> : null}
        </div>
      </section>

      {r.goal && (
        <section class={`notice ${r.goal.met ? 'teal' : ''}`}>
          <Icon name={r.goal.met ? 'check' : 'target'} size={20} />
          <div class="stack-sm">
            <span class="strong">{`Meta del ejercicio: ${r.goal.label}`}</span>
            <span class="small">{r.goal.value == null ? 'No pudimos medirla en esta ocasión.' : r.goal.met ? `¡Lograda! (${r.goal.value})` : `Esta vez: ${r.goal.value}. ¡Vuelve a intentarlo!`}</span>
          </div>
        </section>
      )}

      {r.rounds && r.rounds.length > 0 && (
        <section class="card stack" aria-label="Rondas">
          <h2 class="title">Tus rondas</h2>
          {r.rounds.map((rd, i) => (
            <div class="between" key={i}>
              <span class="strong small">{rd.label}</span>
              <span class="small tabular">
                {rd.wpm ? wpmText(rd.wpm, rd.src) : '—'}
                {rd.target ? <span class="muted">{` · meta ${rd.target}`}</span> : null}
              </span>
            </div>
          ))}
          {r.rounds.some((x) => x.target) && <span class="tiny muted">Lo importante es que se note la diferencia entre velocidades sin perder claridad.</span>}
        </section>
      )}

      {rows.length > 0 && (
        <section class="card stack pad-lg" aria-label="Tu resultado, área por área">
          <div class="stack-sm" style={{ gap: 4 }}>
            <h2 class="title">Tu resultado, área por área</h2>
            <span class="small muted" style={{ lineHeight: 1.45 }}>La puntuación total es un promedio de estas áreas. Las primeras son las que más cuentan.</span>
          </div>
          {rows.map((row, i) => (
            <div key={row.key} class="stack-sm area" style={i ? { borderTop: '1px solid var(--line)', paddingTop: 14 } : null}>
              <div class="between-c" style={{ gap: 10 }}>
                <span class="strong" style={{ fontSize: 15 }}>{row.name}</span>
                <span class={`lvl ${row.level.kind}`}>{row.level.text}</span>
              </div>
              <span class="small strong tabular" style={{ color: 'var(--ink-2)' }}>{row.value}</span>
              <Bar value={row.score / 100} thin tone={row.level.kind === 'good' ? '' : 'amber'} label={`${row.name}: ${row.score} de 100`} />
              <span class="small muted" style={{ lineHeight: 1.45 }}>{row.note}</span>
            </div>
          ))}
        </section>
      )}

      {isSim && (
        <section class="card stack pad-lg" aria-label="Tus respuestas">
          <h2 class="title">Tus respuestas</h2>
          {simHasText && <Legend pauses={simPauses} />}
          {r.sim.map((a, i) => (
            <div class="stack-sm" key={i} style={i > 0 ? { borderTop: '1px solid var(--line)', paddingTop: 14 } : null}>
              <span class="eyebrow teal-t">{`Respuesta ${i + 1}`}</span>
              <span class="small muted">{a.q}</span>
              {a.transcript && <TranscriptText parts={a.transcript} style={{ fontSize: 15 }} />}
              <div class="row wrap" style={{ gap: 6 }}>
                {a.parts.map((p, k) => <span key={k} class={`pill pill-sm ${p.hit ? 'tone-teal' : 'tone-sunken'}`}>{p.hit && <Icon name="check" size={12} stroke={2.6} />}{p.label}</span>)}
                {!a.parts.length && <span class="tiny muted">Sin transcripción</span>}
              </div>
            </div>
          ))}
        </section>
      )}

      {r.transcript && !isSim && (
        <section class="card stack pad-lg" aria-label="Transcripción">
          <div class="between-c wrap">
            <h2 class="title">Transcripción</h2>
            {r.asrMode === 'cloud' && <span class="tiny muted">Automática: puede tener errores</span>}
          </div>
          <Legend pauses={hasPause(r.transcript)} />
          <TranscriptText parts={r.transcript} />
          {r.acousticMissing && <span class="tiny muted">Modo solo transcripción: las pausas y la energía de voz no se miden.</span>}
        </section>
      )}

      {!r.transcript && !r.uploaded && (
        <section class="notice violet">
          <Icon name="info" size={20} />
          <span class="small">{!env.hasSR ? 'Este navegador no transcribe la voz, así que las muletillas de palabra («este», «o sea») no se cuentan aquí. En Chrome sí.' : r.asrState === 'conflict' ? 'Tu teléfono no permitió transcribir mientras analizábamos el audio. Puedes elegir «solo transcripción» en Ajustes.' : 'Esta vez no hubo transcripción. Medimos ritmo, pausas y energía con el audio.'}</span>
        </section>
      )}
      {r.uploaded && (
        <section class="notice violet">
          <Icon name="info" size={20} />
          <span class="small">En notas de voz subidas medimos ritmo, pausas, energía y vacilaciones. Para contar muletillas de palabra, practica en vivo en la app completa.</span>
        </section>
      )}

      {version && (
        <section class="card-violet stack" aria-label="Versión mejorada">
          <div class="between-c">
            <h2 class="title row violet-t" style={{ gap: 8 }}><Icon name="sparkle" size={18} />{ai.state === 'done' ? 'Versión mejorada' : 'Versión más limpia'}</h2>
            {removed ? <span class="tiny strong violet-t" style={{ whiteSpace: 'nowrap' }}>{`${removed} ${removed === 1 ? 'palabra' : 'palabras'} menos`}</span> : null}
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.6 }}>{`«${version}»`}</p>
          {ai.state === 'done' && ai.cambios.length > 0 && (
            <ul class="small" style={{ margin: 0, paddingLeft: 18, color: 'var(--violet-ink)', lineHeight: 1.5 }}>
              {ai.cambios.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          )}
          {ai.state !== 'done' && <span class="small violet-t">Quitamos muletillas, repeticiones y frases que restan fuerza.</span>}
          <div class="row wrap">
            <button class="btn btn-violet" type="button" onClick={() => recordVersion(version)}><Icon name="mic" size={18} />Grabarla con esta versión</button>
            {provider && ai.state !== 'done' && (
              <button class="btn btn-violet-outline" type="button" onClick={askAI} disabled={ai.state === 'loading'}>
                <Icon name="sparkle" size={18} />{ai.state === 'loading' ? 'Pensando…' : 'Mejorar con IA'}
              </button>
            )}
          </div>
          {ai.state === 'loading' && <button class="link-btn" type="button" onClick={() => ctlRef.current && ctlRef.current.abort()}>Detener</button>}
          {ai.state === 'error' && <span class="small coral-t">{ai.msg}</span>}
          {provider && ai.state !== 'done' && <span class="tiny muted">La IA recibe solo el texto transcrito, nunca el audio.</span>}
        </section>
      )}

      {r.strengths.length > 0 && (
        <section class="card stack pad-lg" aria-label="Lo que hiciste bien">
          <h2 class="title">Lo que hiciste bien</h2>
          {r.strengths.map((x, i) => (
            <div class="row-top" key={i}><span class="check"><Icon name="check" size={14} stroke={2.6} /></span><span style={{ fontSize: 14, lineHeight: 1.45 }}>{x.text}</span></div>
          ))}
        </section>
      )}

      {r.improvements.length > 0 && (
        <section class="card stack pad-lg" aria-label="Para mejorar">
          <h2 class="title">Para mejorar</h2>
          {r.improvements.map((x, i) => {
            const ex = x.exercise ? exerciseById(x.exercise) : null;
            return (
              <div class="stack-sm" key={i}>
                <span style={{ fontSize: 14, lineHeight: 1.45 }}>{x.text}</span>
                {ex && (
                  <a class="go-row" href={exerciseHref(ex)}>{`Ejercicio: ${ex.title} · ${ex.minutes} min`}<Icon name="right" size={18} stroke={2} /></a>
                )}
              </div>
            );
          })}
        </section>
      )}

      {audioUrl && (
        <button class="link-btn" type="button" style={{ alignSelf: 'center' }} onClick={eraseNow}><Icon name="trash" size={16} />Borrar el audio ahora</button>
      )}

      <div class="footer">
        <button class="btn btn-outline" type="button" onClick={repeat}><Icon name="refresh" size={18} />Repetir</button>
        <button class="btn wide" type="button" onClick={finishAll}>{audioUrl ? 'Terminar y borrar audio' : 'Terminar'}</button>
      </div>
    </main>
  );
}
