import { useEffect } from 'preact/hooks';
import { useApp } from '../app/store.js';
import { FOCUS } from '../content/meta.js';
import { currentFocus, dayKey, diffDays } from '../app/logic.js';
import { setRecConfig, clearResult } from '../app/session.js';
import { go } from '../app/router.js';
import { Icon } from '../ui/icons.jsx';
import { TopBar } from '../ui/kit.jsx';
import { diagnosticConfig } from './configs.js';

function Range({ label, value, text, tone, lo, hi, min, max, left, mid, right, help }) {
  const pos = value == null ? null : Math.max(0, Math.min(1, (value - min) / (max - min)));
  const zl = (lo - min) / (max - min);
  const zw = (hi - lo) / (max - min);
  return (
    <div class="stack-sm" style={{ gap: 8 }}>
      <div class="between"><span class="strong small">{label}</span><span class="strong small">{text}</span></div>
      <div style={{ position: 'relative', height: 10, background: 'var(--sunken)', borderRadius: 5 }} role="img" aria-label={`${label}: ${text}`}>
        <div style={{ position: 'absolute', left: `${zl * 100}%`, width: `${zw * 100}%`, top: 0, height: 10, background: 'var(--teal-soft)', borderLeft: '1px solid var(--teal-mid)', borderRight: '1px solid var(--teal-mid)' }} />
        {pos != null && <div style={{ position: 'absolute', left: `${pos * 100}%`, top: -4, width: 18, height: 18, marginLeft: -9, borderRadius: 9, background: tone === 'good' ? 'var(--teal)' : 'var(--amber)', border: '3px solid var(--surface)', boxSizing: 'border-box' }} />}
      </div>
      <div class="between tiny muted"><span>{left}</span><span>{mid}</span><span>{right}</span></div>
      {help && <span class="tiny muted" style={{ lineHeight: 1.45 }}>{help}</span>}
    </div>
  );
}

export function Diagnostic() {
  const s = useApp();
  const d = s.diagnosis;
  const today = dayKey();
  useEffect(() => () => clearResult(), []);

  const redo = () => {
    setRecConfig(diagnosticConfig());
    go('/grabar');
  };

  if (!d) {
    return (
      <main class="screen no-tab">
        <TopBar title="Diagnóstico" />
        <section class="card stack pad-lg">
          <h1 class="display h2">Aún no tienes diagnóstico</h1>
          <p class="muted">En un minuto medimos tu ritmo, tus pausas, tu energía y tus muletillas, y armamos un plan de 4 semanas a tu medida.</p>
          <button class="btn btn-lg" type="button" onClick={redo}>Hacer mi diagnóstico</button>
        </section>
      </main>
    );
  }

  const m = d.metrics || {};
  const focus = currentFocus(s, today);
  const wpm = m.wpm;
  const wpmTone = wpm == null ? 'info' : wpm >= 130 && wpm <= 160 ? 'good' : 'warn';
  const wpmText = wpm == null ? 'sin datos' : `${wpm} palabras/min · ${wpm > 160 ? 'rápida' : wpm < 130 ? 'lenta' : 'ideal'}${m.wpmSrc === 'acoustic' ? ' (aprox.)' : ''}`;
  const ps = m.pitchStd;
  const psText = ps == null ? 'sin datos' : ps < 2 ? 'poca' : ps > 5.5 ? 'demasiada' : 'buena';
  const sus = m.endDrop == null ? null : Math.round((1 - m.endDrop) * 100);
  const fpm = m.fillersPerMin;
  const fromOnboarding = d.day === today && s.history.filter((e) => e.kind !== 'diagnostico').length === 0;
  const age = diffDays(today, d.day);

  return (
    <main class="screen no-tab">
      <TopBar title={fromOnboarding ? 'Diagnóstico listo' : 'Tu diagnóstico'} backTo="/" right={fromOnboarding ? '3/3' : null} />
      <div class="stack-sm">
        <h1 class="display" style={{ fontSize: 28 }}>Tu punto de partida</h1>
        <span class="muted" style={{ lineHeight: 1.5 }}>
          {fromOnboarding ? 'Leíste un texto corto y respondiste una pregunta libre. Esto es lo que escuchamos. El audio ya se borró.' : `Medido hace ${age === 0 ? 'hoy' : age === 1 ? '1 día' : `${age} días`}. Repite el diagnóstico cada 4 semanas para ver tu avance.`}
        </span>
      </div>

      <section class="card stack-lg pad-lg" aria-label="Perfil de voz">
        <div class="between">
          <h2 class="title" style={{ fontSize: 16 }}>Tu perfil de voz</h2>
          <span class="row tiny muted" style={{ gap: 6 }}><span style={{ width: 16, height: 8, borderRadius: 2, background: 'var(--teal-soft)', border: '1px solid var(--teal-mid)' }} />Zona ideal</span>
        </div>
        <Range label="Velocidad" value={wpm} text={wpmText} tone={wpmTone} min={80} max={220} lo={130} hi={160} left="Lenta" mid="Ideal: 130–160" right="Muy rápida" help="Cuántas palabras dices por minuto. En la zona ideal se te entiende sin esfuerzo." />
        <Range label="Variedad de tono" value={ps} text={psText} tone={ps != null && ps >= 2 && ps <= 5.5 ? 'good' : 'warn'} min={0} max={8} lo={2} hi={5.5} left="Plana" mid="Variada" right="Exagerada" help="Cuánto sube y baja tu voz. Una voz plana cansa; una variada mantiene la atención." />
        <Range label="Fuerza al final de las frases" value={sus} text={sus == null ? 'sin datos' : sus >= 70 ? 'se mantiene' : 'se apaga'} tone={sus != null && sus >= 70 ? 'good' : 'warn'} min={0} max={100} lo={70} hi={100} left="Se apaga" mid="" right="Se mantiene" help="Si tu voz llega con fuerza hasta la última palabra o se va apagando." />
        <div class="stack-sm">
          <div class="between"><span class="strong small">{m.fillerSrc === 'audio' ? 'Titubeos' : 'Muletillas'}</span><span class="strong small">{fpm == null ? 'sin datos' : `${fpm.toLocaleString('es-DO')} por minuto · ${fpm < 1.5 ? 'pocas' : fpm <= 3 ? 'algunas' : 'muchas'}`}</span></div>
          {m.fillerTop && m.fillerTop.length > 0 && <span class="small muted">{`Las que más usas: ${m.fillerTop.map((k) => `«${k}»`).join(', ')}`}</span>}
          <span class="tiny muted" style={{ lineHeight: 1.45 }}>{m.fillerSrc === 'audio' ? 'Sonidos de duda como «eh» o «mmm». Lo ideal: uno por minuto o menos.' : 'Palabras de relleno como «este» u «o sea». Lo ideal: una por minuto o menos.'}</span>
        </div>
      </section>

      {d.strengths && d.strengths.length > 0 && (
        <section class="stack" aria-label="Tus fortalezas">
          <h2 class="title" style={{ fontSize: 16 }}>Ya haces bien</h2>
          {d.strengths.map((t, i) => (
            <div class="row-top" key={i}><span class="check"><Icon name="check" size={14} stroke={2.6} /></span><span class="small" style={{ lineHeight: 1.45 }}>{t}</span></div>
          ))}
        </section>
      )}

      <section class="card stack pad-lg" aria-label="Tu plan de 4 semanas">
        <h2 class="title" style={{ fontSize: 16 }}>Tu plan de 4 semanas</h2>
        <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {d.plan.weeks.map((f, i) => {
            const cur = focus.week === i + 1;
            return (
              <li key={i} class="row" style={{ gap: 12, padding: '10px 12px', borderRadius: 12, background: cur ? 'var(--teal-soft)' : 'transparent', color: cur ? 'var(--teal-ink)' : 'var(--ink)' }}>
                <span class="tiny strong" style={{ width: 78, flexShrink: 0, whiteSpace: 'nowrap', color: cur ? 'inherit' : 'var(--muted)' }}>{`Semana ${i + 1}`}</span>
                <span class="strong small">{FOCUS[f]?.title}</span>
                {cur && <span class="tiny strong" style={{ marginLeft: 'auto' }}>Ahora</span>}
              </li>
            );
          })}
        </ol>
        <span class="tiny muted">Cada semana, el reto del día se enfoca en esa habilidad.</span>
      </section>

      <div class="footer" style={{ flexDirection: 'column' }}>
        {fromOnboarding ? (
          <button class="btn btn-lg" type="button" onClick={() => go('/', { replace: true })}>Empezar mi plan<Icon name="right" size={20} stroke={2} /></button>
        ) : (
          <button class="btn btn-lg btn-outline" type="button" onClick={redo}><Icon name="refresh" size={18} />Repetir diagnóstico</button>
        )}
      </div>
    </main>
  );
}
