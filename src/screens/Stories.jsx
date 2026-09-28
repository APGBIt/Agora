import { useEffect, useRef, useState } from 'preact/hooks';
import { useApp, update } from '../app/store.js';
import { STORY_TEMPLATES, templateById } from '../content/meta.js';
import { registerActivity, dayKey } from '../app/logic.js';
import { setRecConfig } from '../app/session.js';
import { aiProvider, aiJSON, aiErrorText, aiPermanent, storyPrompt } from '../ai/ai.js';
import { go } from '../app/router.js';
import { Icon } from '../ui/icons.jsx';
import { TabBar, TopBar, Sheet, announce } from '../ui/kit.jsx';
import { storyConfig } from './configs.js';
import { norm } from '../speech/lexical.js';

const wc = (t) => (t || '').trim().split(/\s+/).filter(Boolean).length;
const SENSES = ['vi', 'mire', 'brillaba', 'color', 'luz', 'escuche', 'sonaba', 'ruido', 'silencio', 'voz', 'olia', 'olor', 'aroma', 'sabor', 'frio', 'calor', 'suave', 'sentia', 'temblaba', 'reloj'];

// Revisión sin IA: consejos concretos según cada acto.
function localSuggestion(act, text, idx, total) {
  const n = wc(text);
  const t = ' ' + norm(text) + ' ';
  if (!n) return null;
  if (n > 70) return 'Es largo para contarlo en voz alta. Quédate con lo esencial: una o dos frases.';
  if (idx === 0 && !/[?¿]|\d/.test(text) && n > 18) return 'Un buen gancho es corto: empieza en el momento exacto, con una imagen o un dato.';
  if ((act.key === 'conflicto' || act.key === 'complicacion' || act.key === 'pero') && !SENSES.some((w) => t.includes(` ${w} `))) return 'Añade un detalle sensorial: un sonido, un objeto, una temperatura. Hace visible la tensión.';
  if ((act.key === 'resultado' || act.key === 'despues') && !/\d/.test(text)) return 'Si puedes, da un número o un hecho concreto: se recuerda más.';
  if (idx === total - 1 && n > 5 && !/(aprend|por eso|desde entonces|hoy|lecci|recuerd)/.test(t)) return 'Cierra con una frase que tu audiencia pueda repetir: la lección en pocas palabras.';
  return null;
}

function newStory() {
  return { id: `h${Date.now().toString(36)}`, title: '', template: 'actos', audience: '', minutes: 3, acts: {}, tension: {}, updated: Date.now(), rewarded: false };
}

export function Stories() {
  const s = useApp();
  const create = () => {
    const st = newStory();
    update((d) => { d.stories.unshift(st); });
    go(`/historias/${st.id}`);
  };
  return (
    <>
      <main class="screen">
        <header class="stack-sm">
          <h1 class="display h1">Historias</h1>
          <span class="muted">Construye relatos que se recuerdan, paso a paso.</span>
        </header>
        <button class="btn btn-lg" type="button" onClick={create}><Icon name="plus" size={20} />Nueva historia</button>
        {s.stories.length === 0 && (
          <section class="card stack">
            <span class="strong">Tu primera historia</span>
            <p class="small muted" style={{ lineHeight: 1.5 }}>Elige una estructura, responde una pregunta por acto y ensáyala con el teleprompter. Tus textos se guardan solo en este dispositivo.</p>
          </section>
        )}
        {s.stories.length > 0 && (
          <section class="stack-sm" aria-label="Tus historias">
            {s.stories.map((st) => {
              const tpl = templateById(st.template);
              const done = tpl.acts.filter((a) => wc(st.acts[a.key]) >= 5).length;
              return (
                <a key={st.id} class="item" href={`#/historias/${st.id}`}>
                  <span class="icon-circle tone-violet"><Icon name="book" size={20} /></span>
                  <div class="stack-sm grow" style={{ gap: 2 }}>
                    <span class="t">{st.title || 'Sin título'}</span>
                    <span class="d">{`${tpl.name} · ${done} de ${tpl.acts.length} actos`}</span>
                  </div>
                  <Icon name="right" size={18} stroke={2} />
                </a>
              );
            })}
          </section>
        )}
        <section class="stack" aria-label="Practicar historias en voz alta">
          <h2 class="title">Cuéntala en voz alta</h2>
          {[
            ['st-5-actos', 'Cuenta en 5 actos', 'Una historia guiada por tiempo.'],
            ['st-abt', 'Y, pero, por lo tanto', 'La estructura más corta.'],
            ['st-sentidos', 'Detalles con los sentidos', 'Vista, oído, olfato y tacto.'],
          ].map(([id, t, d]) => (
            <a key={id} class="item" href={`#/ejercicio/${id}`}>
              <span class="icon-circle tone-violet"><Icon name="mic" size={20} /></span>
              <div class="stack-sm grow" style={{ gap: 2 }}><span class="t">{t}</span><span class="d">{d}</span></div>
              <Icon name="right" size={18} stroke={2} />
            </a>
          ))}
        </section>
      </main>
      <TabBar active="historias" />
    </>
  );
}

export function StoryEditor({ id }) {
  const s = useApp();
  const story = s.stories.find((x) => x.id === id);
  const [confirm, setConfirm] = useState(false);
  const [ai, setAi] = useState({ state: 'idle', data: null });
  const [provider, setProvider] = useState(null);
  const [focusKey, setFocusKey] = useState(null);
  const ctl = useRef(null);

  useEffect(() => { aiProvider(s.settings).then(setProvider); return () => ctl.current && ctl.current.abort(); }, []);
  useEffect(() => { if (!story) go('/historias', { replace: true }); }, [story]);
  if (!story) return null;

  const tpl = templateById(story.template);
  const set = (fn) => update((d) => {
    const st = d.stories.find((x) => x.id === id);
    if (!st) return;
    fn(st);
    st.updated = Date.now();
    const complete = templateById(st.template).acts.every((a) => wc(st.acts[a.key]) >= 5);
    if (complete && !st.rewarded) {
      st.rewarded = true;
      const reg = registerActivity(d, { kind: 'historia', refId: st.id, title: st.title || 'Historia', practiceSec: 0, xp: 30, skills: { storytelling: 70 } });
      setTimeout(() => announce(reg.events, reg.xp), 0);
    }
  });
  const acts = tpl.acts.map((a) => ({ ...a, text: story.acts[a.key] || '' }));
  const firstTodo = acts.findIndex((a) => wc(a.text) < 5);
  const filled = acts.filter((a) => wc(a.text) >= 5).length;

  const review = async () => {
    if (!provider) return;
    ctl.current = new AbortController();
    setAi({ state: 'loading', data: null });
    try {
      const out = await aiJSON(provider, storyPrompt({ title: story.title, audience: story.audience, template: tpl.name, acts }), { signal: ctl.current.signal });
      setAi({ state: 'done', data: out });
    } catch (e) {
      setAi({ state: e && e.code === 'cancelled' ? 'idle' : 'error', data: null, msg: aiErrorText(e) });
      if (aiPermanent(e)) setProvider(null);
    }
  };

  const rehearse = () => { setRecConfig(storyConfig(story)); go('/grabar'); };

  // curva de tensión
  const W = 316;
  const H = 110;
  const xs = acts.map((_, i) => 20 + (i * (W - 40)) / Math.max(1, acts.length - 1));
  const tens = acts.map((a) => story.tension[a.key] ?? a.tension);
  const ys = tens.map((t) => 96 - (t - 1) * 20);
  const cycleTension = (k, cur) => set((st) => { st.tension[k] = cur >= 5 ? 1 : cur + 1; });

  return (
    <main class="screen no-tab">
      <TopBar title="Historia" backTo="/historias" right={<button class="icon-btn" type="button" aria-label="Eliminar historia" onClick={() => setConfirm(true)}><Icon name="trash" size={20} /></button>} />

      <div class="chips" role="group" aria-label="Estructura narrativa">
        {STORY_TEMPLATES.map((t) => (
          <button key={t.id} type="button" class={`chip ${t.id === story.template ? 'on-violet' : ''}`} aria-pressed={String(t.id === story.template)} onClick={() => set((st) => { st.template = t.id; })}>{t.name}</button>
        ))}
      </div>

      <section class="card stack-sm">
        <label for="st-title" class="eyebrow violet-t">Título de tu historia</label>
        <input id="st-title" class="title-input" type="text" value={story.title} placeholder="Ponle un nombre" onInput={(e) => set((st) => { st.title = e.target.value; })} />
        <div class="row wrap small muted" style={{ gap: 10 }}>
          <label class="row" style={{ gap: 6 }} for="st-aud">Para:
            <input id="st-aud" class="field" style={{ padding: '6px 10px', width: 170 }} type="text" value={story.audience} placeholder="reunión de equipo" onInput={(e) => set((st) => { st.audience = e.target.value; })} />
          </label>
          <label class="row" style={{ gap: 6 }} for="st-min">Duración:
            <select id="st-min" class="field" style={{ padding: '6px 10px', width: 90 }} value={story.minutes} onChange={(e) => set((st) => { st.minutes = Number(e.target.value); })}>
              {[1, 2, 3, 5].map((m) => <option key={m} value={m}>{`${m} min`}</option>)}
            </select>
          </label>
        </div>
        <span class="tiny muted">{`${filled} de ${acts.length} actos listos · se guarda solo en este dispositivo`}</span>
      </section>

      <ol class="timeline" aria-label="Actos de la historia">
        {acts.map((a, i) => {
          const done = wc(a.text) >= 5;
          const now = i === firstTodo;
          const sugg = (ai.state === 'done' && ai.data?.actos?.[a.key]) || ((now || focusKey === a.key) ? localSuggestion(a, a.text, i, acts.length) : null);
          return (
            <li key={a.key}>
              <div class="rail">
                <span class={`dot ${done ? 'done' : now ? 'now' : 'todo'}`}>{done ? <Icon name="check" size={14} stroke={2.8} label="Listo" /> : i + 1}</span>
                {i < acts.length - 1 && <span class={`line ${done ? 'done' : ''}`} />}
              </div>
              <div class="body">
                <div class="between"><span class="strong">{a.label}</span>{now && !done && <span class="tiny strong amber-t">Escribiendo</span>}</div>
                <label for={`act-${a.key}`} class="small muted">{a.q}</label>
                <textarea
                  id={`act-${a.key}`}
                  class={`field ${now && !done ? 'now' : !done ? 'todo' : ''}`}
                  rows={2}
                  value={a.text}
                  placeholder={done ? '' : 'Escribe aquí…'}
                  onFocus={() => setFocusKey(a.key)}
                  onInput={(e) => set((st) => { st.acts[a.key] = e.target.value; })}
                />
                {sugg && <div class="suggest"><Icon name="sparkle" size={16} style={{ flexShrink: 0, marginTop: 2 }} /><span>{sugg}</span></div>}
              </div>
            </li>
          );
        })}
      </ol>

      {ai.state === 'done' && ai.data && (
        <section class="card-violet stack">
          {ai.data.general && <p class="small" style={{ lineHeight: 1.5 }}>{ai.data.general}</p>}
          {ai.data.cierre && <p class="small"><strong>Frase final propuesta: </strong>{`«${ai.data.cierre}»`}</p>}
        </section>
      )}

      <section class="card stack" aria-label="Curva de tensión">
        <div class="between"><span class="strong">Curva de tensión</span><span class="tiny muted">Toca un punto para cambiarlo</span></div>
        <svg width="100%" viewBox={`0 0 ${W} ${H + 14}`} role="img" aria-label={`Tensión por acto: ${acts.map((a, i) => `${a.label} ${tens[i]}`).join(', ')}`}>
          <path d={`M8 ${H - 14}H${W - 8}`} stroke="var(--line-2)" stroke-width="1" />
          <path d={`M8 56H${W - 8}`} stroke="var(--line)" stroke-width="1" stroke-dasharray="3 3" />
          <polyline points={xs.map((x, i) => `${x},${ys[i]}`).join(' ')} fill="none" stroke="var(--violet)" stroke-width="2" stroke-linejoin="round" />
          {acts.map((a, i) => (
            <g key={a.key} onClick={() => cycleTension(a.key, tens[i])} style={{ cursor: 'pointer' }}>
              <circle cx={xs[i]} cy={ys[i]} r="14" fill="transparent" />
              <circle cx={xs[i]} cy={ys[i]} r={i === firstTodo ? 6 : 5} fill={wc(a.text) >= 5 ? 'var(--violet)' : 'var(--surface)'} stroke={i === firstTodo ? 'var(--amber)' : 'var(--violet)'} stroke-width="2" />
              <text x={xs[i]} y={H + 8} text-anchor="middle" font-size="11" fill={i === firstTodo ? 'var(--ink)' : 'var(--muted)'} font-weight={i === firstTodo ? 700 : 400}>{a.label.split(' ')[0]}</text>
            </g>
          ))}
        </svg>
        <span class="tiny muted">Lo ideal: la tensión sube hasta el giro y baja en el cierre.</span>
      </section>

      {ai.state === 'error' && <p class="small coral-t">{ai.msg}</p>}

      <div class="footer">
        {provider ? (
          <button class="btn btn-violet-outline" type="button" disabled={ai.state === 'loading' || filled === 0} onClick={review}><Icon name="sparkle" size={18} />{ai.state === 'loading' ? 'Pensando…' : 'Revisar con IA'}</button>
        ) : (
          <button class="btn btn-violet-outline" type="button" disabled={filled === 0} onClick={() => setFocusKey(acts[Math.max(0, firstTodo < 0 ? acts.length - 1 : firstTodo)].key)}><Icon name="sparkle" size={18} />Revisar</button>
        )}
        <button class="btn wide" type="button" disabled={filled < 2} onClick={rehearse}><Icon name="mic" size={18} />Ensayar con teleprompter</button>
      </div>

      <Sheet open={confirm} onClose={() => setConfirm(false)} title="¿Eliminar esta historia?">
        <p class="muted">Se borrará de este dispositivo.</p>
        <div class="row">
          <button class="btn btn-ghost grow" type="button" onClick={() => setConfirm(false)}>Cancelar</button>
          <button class="btn btn-danger grow" type="button" onClick={() => { update((d) => { d.stories = d.stories.filter((x) => x.id !== id); }); setConfirm(false); go('/historias', { replace: true }); }}>Eliminar</button>
        </div>
      </Sheet>
    </main>
  );
}
