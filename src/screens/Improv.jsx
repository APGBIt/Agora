import { useMemo, useState } from 'preact/hooks';
import { useApp } from '../app/store.js';
import { TOPICS, WORDS, OBJECT_PROMPTS, TOPIC_FRAMEWORK } from '../content/topics.js';
import { FRAMEWORKS } from '../speech/lexical.js';
import { setRecConfig } from '../app/session.js';
import { go } from '../app/router.js';
import { Icon } from '../ui/icons.jsx';
import { TopBar, Seg } from '../ui/kit.jsx';
import { improvConfig } from './configs.js';

const LEVELS = [{ value: 1, label: 'Fácil' }, { value: 2, label: 'Media' }, { value: 3, label: 'Retadora' }];
const MODES = [{ value: 'tema', label: 'Tema' }, { value: 'palabra', label: 'Palabra' }, { value: 'objeto', label: 'Objeto' }];

function shuffled(arr, seed) {
  const a = arr.slice();
  let x = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    x = (x * 9301 + 49297) % 233280;
    const j = Math.floor((x / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function Improv({ query }) {
  const s = useApp();
  const [mode, setMode] = useState(query.get('modo') || 'tema');
  const [level, setLevel] = useState(2);
  const [n, setN] = useState(0);
  const seed = useMemo(() => Math.floor(Math.random() * 100000), []);
  const count = s.history.filter((e) => e.kind === 'improv').length;

  let item;
  let total;
  if (mode === 'tema') {
    const pool = shuffled(TOPICS.filter((t) => t.level === level), seed);
    total = pool.length;
    const t = pool[n % pool.length];
    item = { q: t.q, cat: t.cat, hint: t.hint, framework: TOPIC_FRAMEWORK[t.cat] || 'prep' };
  } else if (mode === 'palabra') {
    const pool = shuffled(WORDS, seed);
    total = pool.length;
    const w = pool[n % pool.length];
    item = { q: `Tu palabra: «${w}». Cuenta una historia de 30 segundos que la incluya.`, cat: 'Palabra al azar', hint: 'Empieza por un momento concreto y termina con una idea.', framework: 'abt', word: w };
  } else {
    const pool = shuffled(OBJECT_PROMPTS, seed);
    total = pool.length;
    item = { q: pool[n % pool.length], cat: 'Vende el objeto', hint: 'Problema, tu objeto como solución y un llamado a comprar.', framework: 'elevator' };
  }
  const fw = FRAMEWORKS[item.framework];

  const start = () => {
    setRecConfig(improvConfig({ ...item, mode }));
    go('/grabar');
  };

  return (
    <main class="screen no-tab">
      <TopBar title="Improvisación" backTo="/entrenar/improvisacion" right={count ? `${count}` : null} />
      <Seg label="Tipo de reto" value={mode} onChange={(v) => { setMode(v); setN(0); }} options={MODES} className="violet" />
      {mode === 'tema' && <Seg label="Dificultad" value={level} onChange={(v) => { setLevel(v); setN(0); }} options={LEVELS} className="violet" />}

      <section aria-live="polite" aria-label="Tema al azar" style={{ minHeight: 230, padding: '24px 22px', background: 'var(--violet)', color: 'var(--surface)', borderRadius: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div class="between-c">
          <span class="tag eyebrow" style={{ background: 'rgba(255,255,255,.16)', color: 'inherit', padding: '6px 12px' }}>{item.cat}</span>
          <span class="small" style={{ opacity: 0.85 }}>{`${(n % total) + 1} de ${total}`}</span>
        </div>
        <p class="display" style={{ fontSize: 25, lineHeight: 1.3 }}>{item.q}</p>
        <span class="small" style={{ marginTop: 'auto', opacity: 0.9, lineHeight: 1.45 }}>{`Pista: ${item.hint}`}</span>
      </section>

      <section class="stack-sm" aria-label="Estructura">
        <span class="strong small">{`Ordena tu respuesta: ${fw.name}`}</span>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${fw.parts.length}, minmax(0, 1fr))`, gap: 8 }}>
          {fw.parts.map((p, i) => (
            <div key={i} class="card" style={{ padding: '10px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, textAlign: 'center' }}>
              <span class="display violet-t" style={{ fontSize: 18 }}>{p.label[0]}</span>
              <span class="tiny strong">{p.label}</span>
            </div>
          ))}
        </div>
      </section>

      <div class="card row" style={{ gap: 14 }}>
        <span class="icon-circle tone-violet" style={{ width: 44, height: 44, borderRadius: 22 }}><Icon name="clock" size={22} /></span>
        <div class="stack-sm" style={{ gap: 2 }}>
          <span class="strong small">{`15 s para pensar, ${mode === 'palabra' ? 30 : 60} s para hablar`}</span>
          <span class="small muted">La grabación empieza sola al terminar la cuenta.</span>
        </div>
      </div>

      <div class="footer">
        <button class="btn btn-violet-outline" type="button" onClick={() => setN(n + 1)}><Icon name="shuffle" size={18} />Otro</button>
        <button class="btn wide" type="button" onClick={start}><Icon name="mic" size={18} />Empezar</button>
      </div>
    </main>
  );
}
