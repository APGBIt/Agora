import { useEffect, useState } from 'preact/hooks';
import { useApp } from '../app/store.js';
import { dayKey, todaysChallenge } from '../app/logic.js';
import { CHALLENGES, challengeById } from '../content/challenges.js';
import { FRAMEWORKS } from '../speech/lexical.js';
import { setRecConfig } from '../app/session.js';
import { go } from '../app/router.js';
import { Icon } from '../ui/icons.jsx';
import { TopBar, Sheet, Ring, mmss } from '../ui/kit.jsx';
import { challengeConfig } from './configs.js';

const FOCUS_LABEL = { persuasion: 'Persuasión', ritmo: 'Ritmo', muletillas: 'Muletillas', energia: 'Energía', claridad: 'Claridad', seguridad: 'Seguridad', storytelling: 'Storytelling' };

export function Challenge({ id }) {
  const s = useApp();
  const today = dayKey();
  const ch = (id && challengeById(id)) || todaysChallenge(s, today);
  const isToday = !id || ch.id === todaysChallenge(s, today).id;
  const [prep, setPrep] = useState(0);
  const [list, setList] = useState(false);
  const best = s.history.filter((e) => e.kind === 'reto' && e.refId === ch.id && e.score != null).reduce((m, e) => Math.max(m, e.score), -1);

  useEffect(() => {
    if (prep <= 0) return undefined;
    const t = setTimeout(() => {
      if (prep === 1) { start(); }
      setPrep(prep - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [prep]);

  const start = () => {
    setRecConfig(challengeConfig(ch));
    go('/grabar');
  };

  const fw = ch.framework ? FRAMEWORKS[ch.framework] : null;

  return (
    <main class="screen no-tab">
      <TopBar title={isToday ? 'Reto del día' : 'Reto'} backTo="/" right={<button class="icon-btn" type="button" aria-label="Ver todos los retos" onClick={() => setList(true)}><Icon name="target" size={22} /></button>} />

      <div class="row" style={{ gap: 16 }}>
        <div style={{ width: 84, height: 84, flexShrink: 0, borderRadius: 42, background: 'var(--teal-soft)', color: 'var(--teal)', display: 'flex', alignItems: 'baseline', justifyContent: 'center', paddingTop: 22, fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700 }}>
          {ch.targetSec >= 90 ? mmss(ch.targetSec) : ch.targetSec}
          {ch.targetSec < 90 && <span style={{ fontSize: 15, marginLeft: 2 }}>s</span>}
        </div>
        <div class="stack-sm">
          <span class="eyebrow teal-t">{`${FOCUS_LABEL[ch.focus] || ch.focus} · Nivel ${ch.level}`}</span>
          <h1 class="display" style={{ fontSize: 26 }}>{ch.title}</h1>
        </div>
      </div>

      <p class="lead">{ch.description}</p>
      <p class="small muted"><strong style={{ color: 'var(--ink)' }}>Objetivo:</strong>{` ${ch.objective}`}</p>

      {ch.steps.length > 0 && (
        <section class="card stack" aria-label="Estructura sugerida">
          <h2 class="title" style={{ fontSize: 15 }}>Estructura sugerida</h2>
          <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {ch.steps.map((st, i) => (
              <li class="row-top" key={i}>
                <span style={{ width: 26, height: 26, flexShrink: 0, borderRadius: 13, background: 'var(--teal)', color: 'var(--on-teal)', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                <div class="stack-sm grow" style={{ gap: 2 }}>
                  <div class="between"><strong style={{ fontSize: 15 }}>{st.name}</strong><span class="small muted tabular">{`${st.sec} s`}</span></div>
                  <span class="small muted" style={{ lineHeight: 1.4 }}>{st.hint}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {ch.script && (
        <section class="card stack" aria-label="Texto para leer">
          <h2 class="title" style={{ fontSize: 15 }}>Texto para leer</h2>
          <p class="display" style={{ fontSize: 19, lineHeight: 1.5, fontWeight: 500 }}>{ch.script}</p>
        </section>
      )}

      {fw && <p class="small muted">{`Estructura que buscaremos al escucharte: ${fw.parts.map((p) => p.label).join(' · ')}.`}</p>}

      <div class="stack-sm">
        <span class="small strong muted">Te evaluaremos en</span>
        <div class="chips">{ch.evaluate.map((e) => <span key={e} class="chip" style={{ minHeight: 34 }}>{e}</span>)}</div>
      </div>
      {best >= 0 && <p class="small muted">{`Tu mejor puntuación en este reto: ${best}.`}</p>}

      <div class="footer">
        <button class="btn btn-outline" type="button" onClick={() => setPrep(30)}><Icon name="clock" size={18} />Preparar 30 s</button>
        <button class="btn wide" type="button" onClick={start}><Icon name="mic" size={18} />Grabar ahora</button>
      </div>

      <Sheet open={prep > 0} onClose={() => setPrep(0)} title="Prepárate">
        <div class="row" style={{ gap: 16 }}>
          <Ring size={72} stroke={7} value={prep / 30} label={`Quedan ${prep} segundos`}>
            <text x="36" y="42" text-anchor="middle" font-size="18" font-weight="700" fill="var(--ink)">{prep}</text>
          </Ring>
          <p class="muted small">Piensa una frase para cada paso. Al terminar, pasas directo a grabar.</p>
        </div>
        {ch.steps.length > 0 && (
          <ul class="small" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
            {ch.steps.map((st, i) => <li key={i}><strong>{st.name}</strong>{`: ${st.hint}`}</li>)}
          </ul>
        )}
        <button class="btn btn-block" type="button" onClick={() => { setPrep(0); start(); }}>Empezar ahora</button>
      </Sheet>

      <Sheet open={list} onClose={() => setList(false)} title="Todos los retos">
        <div class="stack-sm">
          {CHALLENGES.map((c) => (
            <a key={c.id} class="item" href={`#/reto/${c.id}`} onClick={() => setList(false)}>
              <div class="stack-sm grow" style={{ gap: 2 }}>
                <span class="t">{c.title}</span>
                <span class="d">{`${FOCUS_LABEL[c.focus]} · ${c.targetSec} s · +${c.xp} XP`}</span>
              </div>
              {s.history.some((e) => e.kind === 'reto' && e.refId === c.id) && <span class="check"><Icon name="check" size={14} stroke={2.6} /></span>}
            </a>
          ))}
        </div>
      </Sheet>
    </main>
  );
}
