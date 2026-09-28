import { useState } from 'preact/hooks';
import { useApp, update } from '../app/store.js';
import { GOALS, DAILY_GOALS } from '../content/meta.js';
import { dayKey } from '../app/logic.js';
import { setRecConfig } from '../app/session.js';
import { go } from '../app/router.js';
import { Icon } from '../ui/icons.jsx';
import { Seg } from '../ui/kit.jsx';
import { diagnosticConfig } from './configs.js';
import { env } from '../app/env.js';

export function Welcome() {
  const s = useApp();
  const [name, setName] = useState(s.profile.name || '');
  const [goals, setGoals] = useState(s.profile.goals?.length ? s.profile.goals : ['trabajo', 'reuniones']);
  const [goal, setGoal] = useState(s.profile.dailyGoalMin || 10);

  const save = (onboarded) => update((d) => {
    d.profile.name = name.trim().slice(0, 30);
    d.profile.goals = goals;
    d.profile.dailyGoalMin = goal;
    if (!d.profile.createdAt) d.profile.createdAt = dayKey();
    if (onboarded) d.profile.onboarded = true;
  });

  const toggle = (id) => setGoals(goals.includes(id) ? goals.filter((g) => g !== id) : [...goals, id]);

  const startDiag = () => {
    save(false);
    setRecConfig(diagnosticConfig());
    go('/grabar');
  };

  const skip = () => {
    save(true);
    go('/', { replace: true });
  };

  return (
    <main class="screen no-tab">
      <header class="between-c">
        <div class="row" style={{ gap: 8 }}>
          <span class="icon-circle" style={{ width: 34, height: 34, borderRadius: 17, background: 'var(--teal)', color: 'var(--on-teal)' }}><Icon name="mic" size={18} stroke={2} /></span>
          <span class="display" style={{ fontSize: 22, fontWeight: 700 }}>Ágora</span>
        </div>
        <span class="small strong muted">Paso 1 de 3</span>
      </header>

      <div class="stack-sm">
        <h1 class="display" style={{ fontSize: 27 }}>¿Para qué quieres mejorar tu forma de hablar?</h1>
        <span class="muted">Elige todas las que apliquen. Tu plan se arma con esto.</span>
      </div>

      <div class="grid2" role="group" aria-label="Objetivos">
        {GOALS.map((g) => {
          const on = goals.includes(g.id);
          return (
            <button
              key={g.id}
              type="button"
              aria-pressed={String(on)}
              onClick={() => toggle(g.id)}
              style={{ minHeight: 64, padding: '10px 12px', borderRadius: 14, border: on ? '2px solid var(--teal)' : '1px solid var(--line-2)', background: on ? 'var(--surface)' : 'transparent', textAlign: 'left', fontWeight: 600, fontSize: 14, lineHeight: 1.3 }}
            >
              {g.label}
            </button>
          );
        })}
      </div>

      <div class="stack-sm">
        <label class="strong" for="nombre">¿Cómo quieres que te llame? <span class="muted small">(opcional)</span></label>
        <input id="nombre" class="field" type="text" value={name} maxLength={30} autocomplete="given-name" placeholder="Tu nombre" onInput={(e) => setName(e.target.value)} />
      </div>

      <div class="stack-sm">
        <span class="strong">Tu meta diaria</span>
        <Seg label="Meta diaria" value={goal} onChange={setGoal} options={DAILY_GOALS.map((d) => ({ value: d.min, label: d.label, sub: d.sub }))} />
      </div>

      <section class="card-soft row-top" aria-label="Privacidad" style={{ gap: 12 }}>
        <span class="icon-circle" style={{ width: 36, height: 36, borderRadius: 18, background: 'var(--surface)', color: 'var(--teal)' }}><Icon name="shieldCheck" size={20} /></span>
        <div class="stack-sm" style={{ gap: 2 }}>
          <span class="strong">Tu voz no se guarda</span>
          <span class="small" style={{ lineHeight: 1.45 }}>El audio se analiza en el momento y se borra al terminar. Solo quedan tus puntuaciones, en este dispositivo.</span>
          <a class="small strong" href="#/privacidad" style={{ color: 'var(--teal)' }}>Lee cómo cuidamos tus datos</a>
        </div>
      </section>

      {!env.micLikely && (
        <section class="notice">
          <Icon name="info" size={20} />
          <span class="small">En esta vista el micrófono no está disponible. Puedes hacer el diagnóstico subiendo una nota de voz, o abrir la app completa.</span>
        </section>
      )}

      <div class="footer" style={{ flexDirection: 'column' }}>
        <button class="btn btn-lg" type="button" onClick={startDiag}>Hacer mi diagnóstico · 1 min<Icon name="right" size={20} stroke={2} /></button>
        <button class="link-btn" type="button" style={{ alignSelf: 'center' }} onClick={skip}>Saltar por ahora</button>
      </div>
    </main>
  );
}
