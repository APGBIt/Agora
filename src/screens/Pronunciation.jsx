import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useApp, update } from '../app/store.js';
import { TWISTERS, twisterById, DIAGRAM_TEXT, highlightFocus } from '../content/twisters.js';
import { words as toWords, alignWords, norm } from '../speech/lexical.js';
import { SpeechSession } from '../audio/recorder.js';
import { analyzeFrames } from '../audio/analyze.js';
import { speak, stopSpeaking, loadVoices } from '../speech/tts.js';
import { registerActivity } from '../app/logic.js';
import { env } from '../app/env.js';
import { Icon } from '../ui/icons.jsx';
import { TopBar, Seg, announce, toast } from '../ui/kit.jsx';
import { Mouth } from '../ui/Mouth.jsx';
import { localLangCache } from './asrCache.js';

const SPEEDS = [
  { value: 'lento', label: 'Lento', target: 'Meta: marca cada sílaba', rate: 0.72, wpm: 90 },
  { value: 'normal', label: 'Normal', target: 'Meta: fluido y claro', rate: 0.95, wpm: 130 },
  { value: 'rapido', label: 'Rápido', target: 'Meta: rápido sin perder ningún sonido', rate: 1.25, wpm: 175 },
];

const LABEL = { ok: 'Bien', casi: 'Casi', repite: 'Repite' };

export function Pronunciation({ id }) {
  const s = useApp();
  const tw = twisterById(id) || TWISTERS[0];
  const idx = TWISTERS.indexOf(tw);
  const next = TWISTERS[(idx + 1) % TWISTERS.length];
  const target = useMemo(() => toWords(tw.text), [tw.id]);
  const [speed, setSpeed] = useState('normal');
  const [rec, setRecState] = useState('idle'); // idle | starting | on | busy
  const recRef = useRef('idle');
  const setRec = (v) => { recRef.current = v; setRecState(v); };
  const [res, setRes] = useState(null);
  const [sel, setSel] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [nomic, setNomic] = useState(!env.micLikely);
  const [self, setSelf] = useState(null);
  const sessRef = useRef(null);
  const pressAt = useRef(0);
  const audioRef = useRef(null);
  const attempts = useRef(0);

  useEffect(() => { loadVoices(); }, []);
  useEffect(() => {
    setRes(null); setSel(null); setSelf(null);
    return () => {
      stopSpeaking();
      if (sessRef.current && sessRef.current.state !== 'done') sessRef.current.cancel();
    };
  }, [tw.id]);
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  const sp = SPEEDS.find((x) => x.value === speed);

  const start = async () => {
    if (recRef.current !== 'idle') return;
    stopSpeaking();
    const sess = new SpeechSession({ asr: s.settings.asr !== 'off' && env.hasSR, asrLocal: s.settings.asrLocal ? localLangCache.lang : null, keepAudio: true });
    sessRef.current = sess;
    sess.armInGesture();
    setRec('starting');
    try {
      await sess.prepare();
    } catch (e) {
      sess.cancel();
      setRec('idle');
      if (e.code === 'policy' || e.code === 'insecure' || e.code === 'unsupported') setNomic(true);
      else toast(e.message, 'alert');
      return;
    }
    sess.start();
    setRec('on');
  };

  const stop = async () => {
    const sess = sessRef.current;
    if (!sess || recRef.current !== 'on') return;
    setRec('busy');
    const out = await sess.stop();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(out.audioBlob ? URL.createObjectURL(out.audioBlob) : null);
    const ac = out.frames.length > 60 ? analyzeFrames(out.frames) : null;
    const heard = toWords(out.segments.map((x) => x.text).join(' '));
    const hasText = out.asrState === 'ok' && heard.length > 0;
    const al = hasText ? alignWords(target, heard) : null;
    const active = ac && !ac.lowSignal ? ac.activeSec : out.durationSec;
    const wpm = active > 1 ? Math.round((target.length / active) * 60) : null;
    const r = { align: al, wpm, active, low: !ac || ac.lowSignal, hasText };
    setRes(r);
    setSel(al ? Math.max(0, al.words.findIndex((w) => w.status !== 'ok')) : null);
    setRec('idle');
    attempts.current++;
    if (!r.low) {
      const acc = al ? Math.round(al.accuracy * 100) : null;
      const reg = update((d) => registerActivity(d, {
        kind: 'trabalenguas', refId: tw.id, title: tw.title, practiceSec: out.durationSec, xp: attempts.current === 1 ? 30 : 10,
        extra: { acc, wpm }, skills: acc != null ? { claridad: acc } : null, score: acc,
      }));
      announce(reg.events, reg.xp);
    } else {
      toast('No te escuchamos bien. Acércate al micrófono y vuelve a intentarlo.', 'mic');
    }
  };

  const onDown = (e) => {
    e.preventDefault();
    if (recRef.current === 'idle') { pressAt.current = Date.now(); start(); }
    else if (recRef.current === 'on') { pressAt.current = 0; stop(); }
  };
  const onUp = () => {
    if (pressAt.current && Date.now() - pressAt.current > 700 && recRef.current === 'on') { pressAt.current = 0; setTimeout(stop, 150); }
  };

  const playMine = () => {
    const a = audioRef.current;
    if (a) { a.currentTime = 0; a.play().catch(() => {}); }
  };

  const w = res && res.align && sel != null ? res.align.words[sel] : null;
  const wordFocus = w ? highlightFocus(w.w, tw.focus) : null;
  const acc = res && res.align ? Math.round(res.align.accuracy * 100) : null;

  return (
    <main class="screen no-tab">
      <TopBar title="Pronunciación y dicción" backTo="/entrenar/diccion" right={`${idx + 1}/${TWISTERS.length}`} />
      <div class="segments" aria-hidden="true">{TWISTERS.map((t, i) => <span key={t.id} class={i <= idx ? 'done' : ''} />)}</div>

      <div class="stack-sm">
        <span class="eyebrow teal-t">{`Trabalenguas · Nivel ${tw.level}`}</span>
        <h1 class="display h2">{tw.title}</h1>
        <p class="small muted" style={{ lineHeight: 1.5 }}>Léelo en voz alta: primero lento, luego normal y rápido. {res && res.align ? 'Toca una palabra para ver el detalle.' : ''}</p>
      </div>

      <section class="card stack pad-lg" aria-label="Texto del ejercicio" style={{ borderRadius: 20 }}>
        {!res || !res.align ? (
          <p class="focus-txt">
            {highlightFocus(tw.text, tw.focus).map((p, i) => (p.hit ? <b key={i}>{p.text}</b> : <span key={i}>{p.text}</span>))}
          </p>
        ) : (
          <>
            <div class="between"><span class="small strong muted">Tu intento</span><span class="strong teal-t tabular">{`${acc} % de precisión`}</span></div>
            <div class="row wrap" style={{ gap: '6px 4px' }}>
              {res.align.words.map((x, i) => (
                <button key={i} type="button" class={`word ${x.status}`} aria-pressed={String(sel === i)} aria-label={`${x.w}: ${LABEL[x.status]}`} onClick={() => setSel(i)}>{x.w}</button>
              ))}
            </div>
            <div class="legend">
              <span><i class="sw" style={{ background: 'var(--teal-soft)' }} />Bien</span>
              <span><i class="sw" style={{ background: 'var(--amber-soft)', borderBottom: '2px dotted var(--amber)' }} />Casi</span>
              <span><i class="sw" style={{ background: 'var(--coral-soft)', borderBottom: '2px solid var(--coral)' }} />Repite</span>
            </div>
          </>
        )}
        <div class="row-top small muted" style={{ gap: 8 }}>
          <Icon name="bulb" size={18} style={{ color: 'var(--amber-ink)', flexShrink: 0 }} />
          <span style={{ lineHeight: 1.45 }}>{tw.tip}</span>
        </div>
      </section>

      {w && (
        <section class="card stack pad-lg" aria-label="Detalle de la palabra">
          <div class="between">
            <span class="display" style={{ fontSize: 22 }}>{wordFocus.map((p, i) => (p.hit ? <span key={i} style={{ color: 'var(--teal)' }}>{p.text}</span> : p.text))}</span>
            <span class={`strong small ${w.status === 'ok' ? 'teal-t' : w.status === 'casi' ? 'amber-t' : 'coral-t'}`}>{LABEL[w.status]}</span>
          </div>
          <span class="small muted">{w.heard ? (norm(w.heard) === w.n ? 'Se entendió perfecto.' : `Escuchamos: «${w.heard}».`) : 'No escuchamos esta palabra.'}</span>
          <div class="row" style={{ gap: 14 }}>
            <Mouth kind={tw.diagram} label={DIAGRAM_TEXT[tw.diagram]} />
            <span class="small" style={{ lineHeight: 1.5, color: 'var(--ink-2)' }}>{DIAGRAM_TEXT[tw.diagram]}</span>
          </div>
          <div class="grid2">
            <button class="btn btn-outline" type="button" onClick={() => speak(w.w, { rate: 0.7, voiceURI: s.settings.voiceURI })}><Icon name="play" size={14} />Modelo</button>
            <button class="btn btn-ghost" type="button" disabled={!audioUrl} onClick={playMine}><Icon name="play" size={14} />Tu voz (solo ahora)</button>
          </div>
        </section>
      )}

      {res && !res.align && !res.low && (
        <section class="card stack pad-lg" aria-label="Tu intento">
          <div class="between"><span class="strong">Tu intento</span><span class="small muted tabular">{res.wpm ? `${res.wpm} ppm` : ''}</span></div>
          <p class="small muted">{env.hasSR ? 'Esta vez no hubo transcripción.' : 'Este navegador no transcribe la voz.'} Escúchate y evalúate:</p>
          <div class="grid2">
            <button class="btn btn-outline" type="button" disabled={!audioUrl} onClick={playMine}><Icon name="play" size={14} />Tu voz</button>
            <button class="btn btn-ghost" type="button" onClick={() => speak(tw.text, { rate: sp.rate, voiceURI: s.settings.voiceURI })}><Icon name="play" size={14} />Modelo</button>
          </div>
          <Seg label="¿Cómo te salió?" value={self} onChange={setSelf} options={[{ value: 'ok', label: 'Bien' }, { value: 'casi', label: 'Casi' }, { value: 'repite', label: 'Repetir' }]} />
          {self && <span class="small teal-t strong">{self === 'ok' ? '¡Bien! Prueba la siguiente velocidad.' : self === 'casi' ? 'Repite más lento, marcando el sonido de foco.' : 'Vuelve a lento y exagera el movimiento.'}</span>}
        </section>
      )}

      <div class="stack-sm">
        <Seg label="Velocidad de lectura" value={speed} onChange={setSpeed} options={SPEEDS.map((x) => ({ value: x.value, label: x.label }))} />
        <span class="small strong teal-t center">{res && res.wpm ? `${sp.target} · tu ritmo: ${res.wpm} ppm` : sp.target}</span>
      </div>

      {tw.dialect && (
        <section class="card-amber row-top" aria-label="Consejo de dicción" style={{ padding: 14 }}>
          <Icon name="bulb" size={20} style={{ color: 'var(--amber-ink)', flexShrink: 0 }} />
          <span class="small" style={{ lineHeight: 1.5 }}><strong>Para contextos formales:</strong>{` ${tw.dialect}`}</span>
        </section>
      )}

      {nomic && (
        <section class="notice">
          <Icon name="info" size={20} />
          <span class="small">Aquí el micrófono no está disponible. Escucha el modelo y practica en voz alta; en la app completa podrás grabarte.</span>
        </section>
      )}

      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="auto" />}

      <div class="footer" style={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div class="stack-sm" style={{ alignItems: 'center', flex: '0 0 72px' }}>
          <button class="icon-btn" type="button" style={{ width: 52, height: 52, borderRadius: 26, border: '1.5px solid var(--teal)', color: 'var(--teal)' }} aria-label="Escuchar modelo" onClick={() => speak(tw.text, { rate: sp.rate, voiceURI: s.settings.voiceURI })}><Icon name="play" size={20} /></button>
          <span class="tiny strong muted">Modelo</span>
        </div>
        <div class="stack-sm" style={{ alignItems: 'center', flex: '0 0 auto' }}>
          <button
            class={`mic-big ${rec === 'on' ? 'on' : ''}`}
            type="button"
            disabled={nomic || rec === 'busy' || rec === 'starting'}
            aria-label={rec === 'on' ? 'Terminar grabación' : 'Grabar: mantén pulsado o toca'}
            onPointerDown={onDown}
            onPointerUp={onUp}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); rec === 'on' ? stop() : start(); } }}
          >
            <Icon name={rec === 'on' ? 'stop' : 'mic'} size={30} stroke={1.9} />
          </button>
          <span class="tiny strong">{rec === 'on' ? 'Suelta o toca para terminar' : rec === 'busy' ? 'Analizando…' : 'Mantén o toca para grabar'}</span>
        </div>
        <div class="stack-sm" style={{ alignItems: 'center', flex: '0 0 72px' }}>
          <a class="icon-btn" style={{ width: 52, height: 52, borderRadius: 26, border: '1.5px solid var(--teal)', color: 'var(--teal)' }} href={`#/pronunciacion/${next.id}`} aria-label="Siguiente trabalenguas"><Icon name="right" size={22} stroke={2} /></a>
          <span class="tiny strong muted">Siguiente</span>
        </div>
      </div>
    </main>
  );
}
