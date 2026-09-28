import { useState } from 'preact/hooks';
import { useApp } from '../app/store.js';
import { dayKey, periodStats, chartSeries, skillDeltas, fillerTrend, achievementStatus, MILESTONES } from '../app/logic.js';
import { SKILLS } from '../content/meta.js';
import { Icon } from '../ui/icons.jsx';
import { TabBar, Seg, Bar } from '../ui/kit.jsx';

function niceMax(v) {
  if (v <= 10) return 10;
  if (v <= 20) return 20;
  if (v <= 30) return 30;
  if (v <= 60) return 60;
  return Math.ceil(v / 60) * 60;
}

function MinutesChart({ series, period }) {
  const [tip, setTip] = useState(null);
  const max = niceMax(Math.max(...series.map((x) => x.value), 1));
  const top = Math.max(...series.map((x) => x.value));
  const gap = period === 'mes' ? 3 : period === 'año' ? 6 : 10;
  const unit = period === 'año' ? 'min en el mes' : 'min';
  const labelEvery = period === 'mes' ? 5 : 1;
  return (
    <div class="chart" style={{ '--bgap': `${gap}px` }}>
      <div class="yax" aria-hidden="true"><span>{max}</span><span>{max / 2}</span><span>0</span></div>
      <div class="grow stack-sm" style={{ gap: 6 }}>
        <div class="plot" role="img" aria-label={`Minutos de práctica: ${series.map((x) => `${x.label} ${x.value}`).join(', ')}`}>
          <div class="grid-line" style={{ top: 0 }} />
          <div class="grid-line" style={{ top: '50%' }} />
          {series.map((x, i) => (
            <button
              key={x.day}
              type="button"
              class={`b ${x.today ? 'today' : ''}`}
              style={{ height: `${(x.value / max) * 100}%`, minHeight: x.value > 0 ? 3 : 0, opacity: x.future ? 0 : 1 }}
              aria-label={`${x.label}: ${x.value} ${unit}`}
              onMouseEnter={() => setTip(i)}
              onMouseLeave={() => setTip(null)}
              onFocus={() => setTip(i)}
              onBlur={() => setTip(null)}
              onClick={() => setTip(tip === i ? null : i)}
            >
              {x.value === top && top > 0 && tip == null && <span class="lbl">{x.value}</span>}
              {tip === i && <span class="tooltip">{`${x.value} ${unit}`}</span>}
            </button>
          ))}
        </div>
        <div class="xax" aria-hidden="true">
          {series.map((x, i) => <span key={x.day} style={x.today ? { fontWeight: 700, color: 'var(--teal)' } : null}>{i % labelEvery === 0 || x.today ? (x.today && period === 'semana' ? 'Hoy' : x.label) : ''}</span>)}
        </div>
      </div>
    </div>
  );
}

function Sparkline({ pts }) {
  if (pts.length < 2) return null;
  const W = 150;
  const H = 64;
  const vs = pts.map((p) => p.v);
  const mx = Math.max(...vs, 1);
  const x = (i) => 6 + (i * (W - 14)) / (pts.length - 1);
  const y = (v) => 8 + (1 - v / mx) * (H - 20);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Muletillas por minuto: de ${pts[0].v} a ${last.v}`}>
      <path d={`M4 ${H - 4}H${W - 4}`} stroke="var(--line)" stroke-width="1" />
      <path d={`${d} L${x(pts.length - 1)} ${H - 4} L${x(0)} ${H - 4} Z`} fill="var(--teal-soft)" opacity="0.6" />
      <path d={d} fill="none" stroke="var(--teal)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
      <circle cx={x(pts.length - 1)} cy={y(last.v)} r="5" fill="var(--teal)" stroke="var(--surface)" stroke-width="2" />
    </svg>
  );
}

export function Progress() {
  const s = useApp();
  const today = dayKey();
  const [period, setPeriod] = useState('semana');
  const st = periodStats(s, today, period);
  const series = chartSeries(s, today, period);
  const deltas = skillDeltas(s, today);
  const trend = fillerTrend(s, today);
  const ach = achievementStatus(s);
  const unlocked = ach.filter((a) => a.unlocked);
  const shown = [...unlocked, ...ach.filter((a) => !a.unlocked).sort((a, b) => b.cur / b.target - a.cur / a.target)].slice(0, 9);
  const avg = series.filter((x) => !x.future).length ? Math.round(series.filter((x) => !x.future).reduce((a, b) => a + b.value, 0) / series.filter((x) => !x.future).length) : 0;
  const nextM = MILESTONES.find((m) => m > s.streak.count);
  const nodes = [s.streak.count, 7, 30, 100, 365].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b).slice(0, 5);

  return (
    <>
      <main class="screen">
        <h1 class="display h1">Tu progreso</h1>
        <Seg label="Periodo" value={period} onChange={setPeriod} options={[{ value: 'semana', label: 'Semana' }, { value: 'mes', label: 'Mes' }, { value: 'año', label: 'Año' }]} />

        <div class="grid3">
          <div class="card-amber stack-sm" style={{ padding: '14px 12px' }}>
            <span class="row tiny strong amber-t" style={{ gap: 4 }}><Icon name="flame" size={14} stroke={2} />Racha</span>
            <span class="display tabular" style={{ fontSize: 28 }}>{s.streak.count}</span>
            <span class="tiny" style={{ color: 'var(--amber-deep)' }}>{s.streak.count === 1 ? 'día seguido' : 'días seguidos'}</span>
          </div>
          <div class="card stack-sm" style={{ padding: '14px 12px' }}>
            <span class="tiny strong muted">Tiempo</span>
            <span class="display tabular" style={{ fontSize: 28 }}>{st.minutes}</span>
            <span class="tiny muted">min de práctica</span>
          </div>
          <div class="card stack-sm" style={{ padding: '14px 12px' }}>
            <span class="tiny strong muted">Retos</span>
            <span class="display tabular" style={{ fontSize: 28 }}>{st.retos}</span>
            <span class="tiny muted">completados</span>
          </div>
        </div>

        <section class="card stack pad-lg" aria-label="Hitos de racha">
          <div class="between">
            <h2 class="title" style={{ fontSize: 16 }}>Hitos de racha</h2>
            <span class="row tiny strong teal-t" style={{ gap: 5 }}><Icon name="shield" size={14} stroke={2} />{`${s.streak.freezes} ${s.streak.freezes === 1 ? 'protector' : 'protectores'}`}</span>
          </div>
          <div class="milestones">
            <div class="track"><span style={{ width: `${(nodes.indexOf(s.streak.count) / (nodes.length - 1)) * 100}%` }} /></div>
            {nodes.map((m) => (
              <span key={m} class={`m ${s.streak.best >= m && m !== s.streak.count ? 'done' : m === s.streak.count ? 'next' : ''}`}>{m}</span>
            ))}
          </div>
          <span class="small muted">{nextM ? `Faltan ${nextM - s.streak.count} días para el hito de ${nextM}. Si un día no puedes, un protector cuida tu racha.` : '¡Racha legendaria!'} {`Mejor racha: ${s.streak.best}.`}</span>
        </section>

        <section class="card stack pad-lg" aria-label="Minutos de práctica">
          <div class="stack-sm" style={{ gap: 2 }}>
            <h2 class="title" style={{ fontSize: 16 }}>Minutos de práctica</h2>
            <span class="small muted">{period === 'año' ? `Promedio: ${avg} min al mes` : `Promedio: ${avg} min al día`}</span>
          </div>
          <MinutesChart series={series} period={period} />
        </section>

        <section class="card stack pad-lg" aria-label="Habilidades">
          <div class="between"><h2 class="title" style={{ fontSize: 16 }}>Habilidades</h2><span class="tiny muted">vs. hace 30 días</span></div>
          {SKILLS.map((k) => {
            const v = s.skills[k.key];
            const d = deltas[k.key];
            return (
              <div class="skill-row" key={k.key}>
                <span class="strong">{k.label}</span>
                <Bar value={(v || 0) / 100} thin label={`${k.label}: ${v ?? 'sin datos'}`} />
                <span class="strong tabular" style={{ textAlign: 'right' }}>{v ?? '—'}</span>
                <span class={`tiny strong tabular ${d > 0 ? 'teal-t' : d < 0 ? 'coral-t' : 'muted'}`} style={{ textAlign: 'right' }}>{d == null ? '' : d > 0 ? `▲ ${d}` : d < 0 ? `▼ ${-d}` : '= 0'}</span>
              </div>
            );
          })}
        </section>

        <section class="card between-c pad-lg" aria-label="Muletillas por minuto" style={{ gap: 12 }}>
          <div class="stack-sm" style={{ gap: 4 }}>
            <span class="small strong muted">Muletillas por minuto</span>
            <span class="display tabular" style={{ fontSize: 34 }}>{trend.now != null ? trend.now.toLocaleString('es-DO') : '—'}</span>
            <span class="tiny muted">{trend.before != null ? `Al inicio del periodo: ${trend.before.toLocaleString('es-DO')}` : 'Practica unos días para ver tu tendencia.'}</span>
          </div>
          <Sparkline pts={trend.pts.slice(-20)} />
        </section>

        <section class="stack" aria-label="Logros">
          <div class="between"><h2 class="title">Logros</h2><span class="small muted">{`${unlocked.length} de ${ach.length}`}</span></div>
          <div class="grid3">
            {shown.map((a) => (
              <div key={a.id} class={`badge ${a.unlocked ? '' : 'locked'}`} title={a.desc}>
                <span class={`ic ${a.unlocked ? 'tone-teal' : 'tone-sunken'}`}><Icon name={a.unlocked ? a.icon : 'lock'} size={a.unlocked ? 24 : 22} /></span>
                <span class="t" style={a.unlocked ? null : { color: 'var(--muted)' }}>{a.title}</span>
                {!a.unlocked && a.target > 1 && <span class="tiny muted tabular">{`${a.cur}/${a.target}`}</span>}
              </div>
            ))}
          </div>
        </section>

        <div class="card-dashed row-top">
          <Icon name="shield" size={18} style={{ color: 'var(--teal)', flexShrink: 0, marginTop: 1 }} />
          <span class="small" style={{ color: 'var(--ink-2)', lineHeight: 1.45 }}>Tu progreso son solo números guardados en este dispositivo. Ninguna grabación ni transcripción se conserva. <a href="#/ajustes">Tus datos</a></span>
        </div>
      </main>
      <TabBar active="progreso" />
    </>
  );
}
