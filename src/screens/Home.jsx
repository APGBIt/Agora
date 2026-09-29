import { useApp } from '../app/store.js';
import { dayKey, dayNumber, missionsFor, todaysChallenge, currentFocus, weekRow, tipOfDay, twisterOfDay, MILESTONES } from '../app/logic.js';
import { READINGS } from '../content/readings.js';
import { FOCUS, SKILLS, levelFor } from '../content/meta.js';
import { expressVersion } from '../content/challenges.js';
import { Icon } from '../ui/icons.jsx';
import { TabBar, Bar, Ring } from '../ui/kit.jsx';
import { setRecConfig } from '../app/session.js';
import { go } from '../app/router.js';
import { env } from '../app/env.js';
import { challengeConfig } from './configs.js';

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function greeting(d) {
  const h = d.getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

export function Home() {
  const s = useApp();
  const now = new Date();
  const today = dayKey(now);
  const reto = todaysChallenge(s, today);
  const focus = currentFocus(s, today);
  const missions = missionsFor(s, today, { asr: env.hasSR });
  const secs = s.days[today]?.sec || 0;
  const goalMin = s.profile.dailyGoalMin || 10;
  const mins = Math.floor(secs / 60);
  const lvl = levelFor(s.xp);
  const week = weekRow(s, today);
  const nextMilestone = MILESTONES.find((m) => m > s.streak.count) || null;
  const doneReto = s.history.some((e) => e.day === today && e.kind === 'reto' && e.refId === reto.id);
  const tw = twisterOfDay(today);
  const reading = READINGS[dayNumber(today) % READINGS.length];
  const name = s.profile.name?.trim();

  const startExpress = () => {
    setRecConfig(challengeConfig(expressVersion(reto)));
    go('/grabar');
  };

  return (
    <>
      <main class="screen">
        <header class="between-c" style={{ alignItems: 'flex-start' }}>
          <div class="stack-sm">
            <span class="small muted">{`${DAYS[now.getDay()][0].toUpperCase()}${DAYS[now.getDay()].slice(1)}, ${now.getDate()} de ${MONTHS[now.getMonth()]}`}</span>
            <h1 class="display h1">{name ? `Hola, ${name}` : greeting(now)}</h1>
          </div>
          <div class="row" style={{ gap: 6 }}>
            <span class="pill tone-amber" title="Racha de días"><Icon name="flame" size={17} stroke={1.9} /><span class="tabular">{s.streak.count}</span><span class="sr-only"> días de racha</span></span>
            <span class="pill tone-teal" title="Protectores de racha"><Icon name="shield" size={17} stroke={1.9} /><span class="tabular">{s.streak.freezes}</span><span class="sr-only"> protectores de racha</span></span>
            <a class="icon-btn" href="#/ajustes" aria-label="Ajustes"><Icon name="gear" size={22} /></a>
          </div>
        </header>

        <a class="card-violet between-c" href="#/diagnostico" style={{ textDecoration: 'none', color: 'var(--violet-ink)', padding: '12px 14px' }}>
          <span class="stack-sm" style={{ gap: 2 }}>
            <span class="eyebrow">{focus.week ? `Tu plan · Semana ${focus.week} de ${focus.weeks}` : 'Enfoque de la semana'}</span>
            <span class="title" style={{ fontSize: 15 }}>{FOCUS[focus.focus]?.title}</span>
          </span>
          <Icon name="right" size={20} stroke={2} />
        </a>

        <section class="card row" style={{ gap: 16 }} aria-label="Meta de hoy y nivel">
          <Ring size={76} stroke={8} value={mins / goalMin} label={`Meta de hoy: ${mins} de ${goalMin} minutos`}>
            <text x="38" y="37" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-size="20" font-weight="700" fill="var(--ink)">{Math.min(mins, 99)}</text>
            <text x="38" y="52" text-anchor="middle" font-size="11" fill="var(--muted)">{`de ${goalMin} min`}</text>
          </Ring>
          <div class="stack-sm grow" style={{ gap: 8 }}>
            <span class="title" style={{ fontSize: 15 }}>{mins >= goalMin ? '¡Meta de hoy cumplida!' : `Te faltan ${goalMin - mins} min para tu meta`}</span>
            <div class="between tiny muted"><span>{`Nivel ${lvl.n} · ${lvl.name}`}</span><span class="tabular">{lvl.next ? `${s.xp.toLocaleString('es-DO')} / ${lvl.next.xp.toLocaleString('es-DO')} XP` : `${s.xp} XP`}</span></div>
            <Bar value={lvl.progress} tone="amber" thin label={`Progreso al siguiente nivel: ${Math.round(lvl.progress * 100)} %`} />
          </div>
        </section>

        <section class="card-hero" aria-label="Reto del día">
          <div class="between-c">
            <span class="eyebrow">{doneReto ? 'Reto del día · completado' : 'Reto del día'}</span>
            <span class="row sub small" style={{ gap: 6 }}><Icon name="clock" size={16} />{`${reto.minutes} min`}</span>
          </div>
          <h2 class="display" style={{ fontSize: 28 }}>{reto.title}</h2>
          <p class="sub" style={{ fontSize: 15, lineHeight: 1.5 }}>{reto.description}</p>
          <div class="chips">
            {reto.tags.map((t) => <span class="tag" key={t}>{t}</span>)}
            <span class="tag tag-amber">{`+${reto.xp} XP`}</span>
          </div>
          <a class="btn btn-light btn-lg" href="#/reto">{doneReto ? 'Repetir reto' : 'Empezar reto'}<Icon name="right" size={20} stroke={2} /></a>
          <button type="button" class="link-btn sub" style={{ alignSelf: 'center', color: 'inherit' }} onClick={startExpress}>¿Poco tiempo? Versión express</button>
        </section>

        <section class="card stack" aria-label="Misiones de hoy">
          <div class="between wrap" style={{ rowGap: 4 }}>
            <h2 class="title" style={{ whiteSpace: 'nowrap' }}>Misiones de hoy</h2>
            <span class="row tiny strong teal-t" style={{ gap: 4, whiteSpace: 'nowrap' }}><Icon name="shield" size={14} stroke={2} />{s.streak.freezes < 3 ? 'Premio: +1 protector' : 'Premio: +30 XP'}</span>
          </div>
          {missions.map((m) => (
            <div class="stack-sm" key={m.id}>
              <div class="between small">
                <span class="strong" style={m.done ? { color: 'var(--muted)', textDecoration: 'line-through' } : null}>{m.label}</span>
                {m.done ? (
                  <span class="status good"><Icon name="check" size={14} stroke={2.6} />Hecha</span>
                ) : (
                  <span class="muted tabular">{`${m.current}/${m.target}`}</span>
                )}
              </div>
              {!m.done && <Bar value={m.current / m.target} thin />}
            </div>
          ))}
        </section>

        <section class="stack" aria-label="Esta semana">
          <div class="between">
            <h2 class="title">Esta semana</h2>
            <span class="small muted">{nextMilestone ? `Próximo hito: ${nextMilestone} días` : '¡Racha legendaria!'}</span>
          </div>
          <div class="week">
            {week.map((d) => (
              <div class={`d ${d.state}`} key={d.day}>
                <span class={d.isToday ? 'is-today' : ''}>{d.isToday ? 'Hoy' : d.label}</span>
                <span class="c">
                  {d.state === 'done' && <Icon name="check" size={18} stroke={2.2} label="Practicaste" />}
                  {d.state === 'freeze' && <Icon name="shield" size={18} stroke={2} label="Protegido" />}
                  {d.state === 'missed' && <span class="sr-only">Sin práctica</span>}
                </span>
              </div>
            ))}
          </div>
          {week.some((d) => d.state === 'freeze') && <span class="tiny muted">Un protector cuidó tu racha esta semana.</span>}
        </section>

        <section class="stack" aria-label="Calentamiento rápido">
          <div class="between">
            <h2 class="title">Calentamiento rápido</h2>
            <a class="link-btn" href="#/entrenar">Ver todo</a>
          </div>
          <div class="grid2">
            <a class="mini-card" href="#/respiracion/resp-478">
              <span class="icon-circle tone-teal" style={{ width: 36, height: 36, borderRadius: 10 }}><Icon name="wind" size={20} /></span>
              <span class="t">Respiración 4-7-8</span>
              <span class="tiny muted">2 min · Voz</span>
            </a>
            <a class="mini-card" href={`#/pronunciacion/${tw.id}`}>
              <span class="icon-circle tone-amber" style={{ width: 36, height: 36, borderRadius: 10 }}><Icon name="speech" size={20} /></span>
              <span class="t">Trabalenguas del día</span>
              <span class="tiny muted">1 min · Dicción</span>
            </a>
            <a class="mini-card" href="#/ejercicio/canto-escala">
              <span class="icon-circle tone-teal" style={{ width: 36, height: 36, borderRadius: 10 }}><Icon name="music" size={20} /></span>
              <span class="t">Afina tu voz</span>
              <span class="tiny muted">2 min · Canto</span>
            </a>
            <a class="mini-card" href={`#/temas/${reading.id}`}>
              <span class="icon-circle tone-violet" style={{ width: 36, height: 36, borderRadius: 10 }}><Icon name="book" size={20} /></span>
              <span class="t">{reading.title}</span>
              <span class="tiny muted">{`Lectura · ${reading.cat}`}</span>
            </a>
          </div>
        </section>

        <section class="card stack pad-lg" aria-label="Tus habilidades">
          <div class="between">
            <div class="stack-sm" style={{ gap: 2 }}>
              <h2 class="title">Tus habilidades</h2>
              <span class="tiny muted">De 0 a 100, según tus prácticas</span>
            </div>
            <a class="link-btn" href="#/progreso">Detalle</a>
          </div>
          <div class="grid2" style={{ columnGap: 20, rowGap: 14 }}>
            {SKILLS.map((k) => {
              const v = s.skills[k.key];
              const isFocus = focus.focus === k.key;
              return (
                <div class="skill" key={k.key}>
                  <div class="between"><span class="strong small">{k.label}</span><span class="strong small tabular">{v == null ? '—' : v}</span></div>
                  <Bar value={(v || 0) / 100} thin tone={isFocus ? 'amber' : ''} label={`${k.label}: ${v == null ? 'sin datos' : v}`} />
                  {isFocus && <span class="tiny strong amber-t">Enfoque de esta semana</span>}
                </div>
              );
            })}
          </div>
          {Object.values(s.skills).every((v) => v == null) && <span class="small muted">Completa tu diagnóstico o un reto para ver tus habilidades.</span>}
        </section>

        <section class="card-amber row-top" aria-label="Tip del día">
          <span class="icon-circle" style={{ borderRadius: 20, background: 'var(--surface)', color: 'var(--amber-ink)' }}><Icon name="bulb" size={20} /></span>
          <div class="stack-sm">
            <span class="eyebrow amber-t">Tip del día</span>
            <p style={{ fontSize: 15, lineHeight: 1.45 }}>{tipOfDay(today)}</p>
          </div>
        </section>
      </main>
      <TabBar active="inicio" />
    </>
  );
}
