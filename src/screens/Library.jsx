import { useEffect, useState } from 'preact/hooks';
import { useApp, update } from '../app/store.js';
import { CATEGORIES, GROUPS, EXERCISES, exercisesIn, categoryById, exerciseById } from '../content/exercises.js';
import { ROUTES, routeById } from '../content/meta.js';
import { challengeById } from '../content/challenges.js';
import { scenarioById } from '../content/scenarios.js';
import { dayKey, diffDays } from '../app/logic.js';
import { Icon } from '../ui/icons.jsx';
import { TabBar, TopBar, Bar } from '../ui/kit.jsx';
import { exerciseHref } from './configs.js';
import { norm } from '../speech/lexical.js';

const TONE_TEXT = { teal: 'teal-t', amber: 'amber-t', violet: 'violet-t', coral: 'coral-t' };

function doneCount(s, id) {
  return s.history.filter((e) => e.refId === id).length;
}

export function Library() {
  const s = useApp();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('Todos');
  const cats = CATEGORIES.filter((c) => group === 'Todos' || c.group === group);
  const nq = norm(q).trim();
  const found = nq ? EXERCISES.filter((e) => norm(`${e.title} ${e.desc} ${categoryById(e.cat)?.title}`).includes(nq)) : null;

  return (
    <>
      <main class="screen">
        <header class="stack-sm">
          <h1 class="display h1">Entrenar</h1>
          <span class="muted" style={{ lineHeight: 1.45 }}>Ejercicios para tu voz, tu estructura y tu presencia.</span>
        </header>

        <label class="search">
          <Icon name="search" size={20} />
          <span class="sr-only">Buscar ejercicios</span>
          <input id="buscar" type="search" value={q} placeholder="Trabalenguas, pausas, entrevista…" onInput={(e) => setQ(e.target.value)} />
        </label>

        {!found && (
          <div class="chips" role="group" aria-label="Filtrar por área">
            {GROUPS.map((g) => (
              <button key={g} type="button" class={`chip ${group === g ? 'on' : ''}`} aria-pressed={String(group === g)} onClick={() => setGroup(g)}>{g}</button>
            ))}
          </div>
        )}

        {found && (
          <section class="stack-sm" aria-label="Resultados">
            <span class="small muted">{found.length ? `${found.length} ejercicios` : 'Nada con ese nombre. Prueba con otra palabra.'}</span>
            {found.map((e) => <ExerciseItem key={e.id} ex={e} s={s} />)}
          </section>
        )}

        {!found && (
          <>
            <a class="banner" href="#/simulador">
              <span class="icon-circle" style={{ width: 48, height: 48, borderRadius: 24, background: 'var(--teal-chip)' }}><Icon name="chat" size={24} /></span>
              <span class="stack-sm grow" style={{ gap: 4 }}>
                <span class="eyebrow" style={{ opacity: 0.85 }}>Simulador</span>
                <span style={{ fontSize: 17, fontWeight: 700 }}>Conversaciones de práctica</span>
                <span class="small" style={{ opacity: 0.9, lineHeight: 1.4 }}>Una entrevistadora virtual te pregunta y repregunta.</span>
              </span>
              <Icon name="right" size={20} stroke={2} />
            </a>

            <a class="banner" href="#/temas" style={{ background: 'var(--violet)' }}>
              <span class="icon-circle" style={{ width: 48, height: 48, borderRadius: 24, background: 'rgba(255,255,255,.16)' }}><Icon name="book" size={24} /></span>
              <span class="stack-sm grow" style={{ gap: 4 }}>
                <span class="eyebrow" style={{ opacity: 0.85 }}>Temas</span>
                <span style={{ fontSize: 17, fontWeight: 700 }}>Lecturas y conversaciones</span>
                <span class="small" style={{ opacity: 0.9, lineHeight: 1.4 }}>Lee en voz alta, suma palabras nuevas y ten temas para conversar.</span>
              </span>
              <Icon name="right" size={20} stroke={2} />
            </a>

            <div class="grid2" style={{ gap: 12 }}>
              {cats.map((c) => (
                <a key={c.id} class="cat" href={`#/entrenar/${c.id}`}>
                  <span class={`icon-circle tone-${c.tone}`}><Icon name={c.icon} size={22} /></span>
                  <span class="t">{c.title}</span>
                  <span class="d">{c.desc}</span>
                  <span class={`n ${TONE_TEXT[c.tone]}`}>{`${c.group} · ${exercisesIn(c.id).length} ejercicios`}</span>
                </a>
              ))}
            </div>

            <section class="stack" aria-label="Rutas guiadas" style={{ marginTop: 6 }}>
              <div class="stack-sm" style={{ gap: 4 }}>
                <h2 class="title" style={{ fontSize: 19 }}>Rutas guiadas</h2>
                <span class="small muted">Programas de varios días con una meta concreta.</span>
              </div>
              {ROUTES.map((r) => {
                const st = s.routes[r.id];
                const prog = st ? routeProgress(s, r) : null;
                return (
                  <a key={r.id} class="card stack" href={`#/ruta/${r.id}`} style={{ textDecoration: 'none', color: 'var(--ink)' }}>
                    <div class="between"><span class="strong">{r.title}</span><span class={`tiny strong ${st ? 'teal-t' : 'muted'}`}>{st ? (prog.completed ? 'Completada' : 'En curso') : `${r.days} días`}</span></div>
                    <span class="small muted">{st ? `Día ${Math.min(prog.current + 1, r.days)} de ${r.days}` : r.desc}</span>
                    {st && <Bar value={prog.doneDays / r.days} thin />}
                  </a>
                );
              })}
            </section>
          </>
        )}
      </main>
      <TabBar active="entrenar" />
    </>
  );
}

function ExerciseItem({ ex, s }) {
  const cat = categoryById(ex.cat);
  const n = doneCount(s, ex.type === 'twister' ? ex.twister : ex.id);
  return (
    <a class="item" href={exerciseHref(ex)}>
      <span class={`icon-circle tone-${cat.tone}`}><Icon name={cat.icon} size={20} /></span>
      <div class="stack-sm grow" style={{ gap: 2 }}>
        <span class="t">{ex.title}</span>
        <span class="d" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{`${ex.minutes} min · ${ex.type === 'twister' ? 'Trabalenguas' : ex.desc}`}</span>
      </div>
      {n > 0 ? <span class="pill pill-sm tone-teal"><Icon name="check" size={12} stroke={2.6} />{n}</span> : <Icon name="right" size={18} stroke={2} />}
    </a>
  );
}

export function Category({ id }) {
  const s = useApp();
  const cat = categoryById(id);
  if (!cat) return null;
  const list = exercisesIn(id);
  return (
    <main class="screen no-tab">
      <TopBar title={cat.title} backTo="/entrenar" />
      <div class="row" style={{ gap: 14 }}>
        <span class={`icon-circle tone-${cat.tone}`} style={{ width: 52, height: 52, borderRadius: 16 }}><Icon name={cat.icon} size={26} /></span>
        <p class="muted" style={{ lineHeight: 1.45 }}>{cat.desc}</p>
      </div>
      <div class="stack-sm">
        {list.map((e) => <ExerciseItem key={e.id} ex={e} s={s} />)}
      </div>
    </main>
  );
}

// ---------- Rutas ----------

function itemDone(s, it, since) {
  const ref = it.type === 'exercise' ? (exerciseById(it.id)?.twister || it.id) : it.id;
  return s.history.some((e) => e.day >= since && (e.refId === ref || (it.type === 'sim' && e.kind === 'simulador' && e.refId === it.id)));
}

export function routeProgress(s, r) {
  const st = s.routes[r.id];
  if (!st) return { doneDays: 0, current: 0, completed: false, days: [] };
  const days = r.plan.map((items) => items.map((it) => itemDone(s, it, st.start)));
  const doneDays = days.filter((d) => d.every(Boolean)).length;
  const current = days.findIndex((d) => !d.every(Boolean));
  return { doneDays, current: current < 0 ? r.days : current, completed: doneDays === r.days, days };
}

function itemInfo(it) {
  if (it.type === 'challenge') { const c = challengeById(it.id); return { title: c?.title, sub: `Reto · ${c?.targetSec} s`, href: `#/reto/${it.id}`, icon: 'target' }; }
  if (it.type === 'sim') { const sc = scenarioById(it.id); return { title: sc?.title, sub: 'Simulador', href: `#/simulador?escenario=${it.id}`, icon: 'chat' }; }
  const e = exerciseById(it.id);
  return { title: e?.title, sub: `Ejercicio · ${e?.minutes} min`, href: exerciseHref(e), icon: categoryById(e?.cat)?.icon || 'target' };
}

export function RouteScreen({ id }) {
  const s = useApp();
  const r = routeById(id);
  const st = r ? s.routes[r.id] : null;
  const prog = r ? routeProgress(s, r) : null;
  useEffect(() => {
    if (r && st && prog.completed && !st.completed) update((d) => { d.routes[r.id].completed = dayKey(); });
  }, [prog && prog.completed]);
  if (!r) return null;
  const start = () => update((d) => { d.routes[r.id] = { start: dayKey(), completed: null }; });
  const restart = () => update((d) => { d.routes[r.id] = { start: dayKey(), completed: null }; });
  const age = st ? diffDays(dayKey(), st.start) : 0;

  return (
    <main class="screen no-tab">
      <TopBar title="Ruta guiada" backTo="/entrenar" />
      <div class="stack-sm">
        <span class="eyebrow teal-t">{`${r.days} días`}</span>
        <h1 class="display h2">{r.title}</h1>
        <p class="muted">{r.desc}</p>
      </div>
      {st && (
        <section class="card stack">
          <div class="between"><span class="strong">{prog.completed ? '¡Ruta completada!' : `Día ${Math.min(prog.current + 1, r.days)} de ${r.days}`}</span><span class="small muted">{`Empezaste hace ${age} ${age === 1 ? 'día' : 'días'}`}</span></div>
          <Bar value={prog.doneDays / r.days} />
        </section>
      )}
      <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {r.plan.map((items, di) => {
          const done = st && prog.days[di]?.every(Boolean);
          const cur = st && di === prog.current;
          return (
            <li key={di} class="card stack-sm" style={cur ? { borderColor: 'var(--teal)', borderWidth: 2 } : null}>
              <div class="between"><span class="strong small">{`Día ${di + 1}`}</span>{done && <span class="status good"><Icon name="check" size={14} stroke={2.6} />Hecho</span>}{cur && !done && <span class="tiny strong teal-t">Hoy</span>}</div>
              {items.map((it, k) => {
                const info = itemInfo(it);
                const ok = st && prog.days[di]?.[k];
                return (
                  <a key={k} class="row" href={info.href} style={{ textDecoration: 'none', color: 'var(--ink)', minHeight: 44 }}>
                    <span class={`icon-circle ${ok ? 'tone-teal' : 'tone-sunken'}`} style={{ width: 32, height: 32, borderRadius: 10 }}><Icon name={ok ? 'check' : info.icon} size={16} stroke={ok ? 2.6 : 1.8} /></span>
                    <span class="stack-sm grow" style={{ gap: 0 }}><span class="small strong">{info.title}</span><span class="tiny muted">{info.sub}</span></span>
                    <Icon name="right" size={16} stroke={2} />
                  </a>
                );
              })}
            </li>
          );
        })}
      </ol>
      <div class="footer">
        {!st ? <button class="btn btn-lg" type="button" onClick={start}>Empezar la ruta</button> : <button class="btn btn-outline" type="button" onClick={restart}><Icon name="refresh" size={18} />Reiniciar la ruta</button>}
      </div>
    </main>
  );
}
