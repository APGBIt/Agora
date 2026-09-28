import { useEffect, useRef, useState } from 'preact/hooks';
import { Icon } from './icons.jsx';
import { back } from '../app/router.js';
import { levelFor } from '../content/meta.js';

export function mmss(sec) {
  const s = Math.max(0, Math.round(sec || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

export function useInterval(fn, ms, active = true) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => ref.current(), ms);
    return () => clearInterval(id);
  }, [ms, active]);
}

export function TopBar({ title, backTo = '/', onBack, right = null, close = false, label }) {
  return (
    <header class="topbar">
      <button class="icon-btn" type="button" aria-label={label || (close ? 'Cerrar' : 'Volver')} onClick={onBack || (() => back(backTo))}>
        <Icon name={close ? 'close' : 'left'} stroke={2} />
      </button>
      <span class="t">{title}</span>
      <span class="side">{right}</span>
    </header>
  );
}

export function TabBar({ active }) {
  const Tab = ({ to, id, icon, text }) => (
    <a class="tab" href={`#${to}`} aria-current={active === id ? 'page' : undefined}>
      <Icon name={icon} />
      {text}
    </a>
  );
  return (
    <nav class="tabbar" aria-label="Navegación principal">
      <Tab to="/" id="inicio" icon="home" text="Inicio" />
      <Tab to="/entrenar" id="entrenar" icon="target" text="Entrenar" />
      <a class="fab" href="#/grabar?libre=1" aria-label="Práctica libre: grabar">
        <Icon name="mic" stroke={1.9} />
      </a>
      <Tab to="/historias" id="historias" icon="book" text="Historias" />
      <Tab to="/progreso" id="progreso" icon="chart" text="Progreso" />
    </nav>
  );
}

export function Seg({ options, value, onChange, label, className = '' }) {
  return (
    <div class={`seg ${className}`} role="group" aria-label={label}>
      {options.map((o) => (
        <button type="button" key={o.value} aria-pressed={String(o.value === value)} onClick={() => onChange(o.value)}>
          {o.label}
          {o.sub && <span class="sub">{o.sub}</span>}
        </button>
      ))}
    </div>
  );
}

export function Bar({ value = 0, tone = '', thin = false, label }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div class={`bar ${thin ? 'thin' : ''} ${tone}`} role={label ? 'img' : undefined} aria-label={label}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Ring({ size = 76, stroke = 8, value = 0, color = 'var(--teal)', track = 'var(--sunken)', label, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} stroke-width={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        stroke-width={stroke}
        stroke-linecap="round"
        stroke-dasharray={`${c * v} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray .5s ease' }}
      />
      {children}
    </svg>
  );
}

export function Sheet({ open, onClose, title, children, labelledBy = 'sheet-title' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    setTimeout(() => ref.current && ref.current.focus(), 30);
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (prev && prev.focus) prev.focus();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div class="backdrop" onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div class="sheet" role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1} ref={ref}>
        <span class="grab" />
        {title && <h2 id={labelledBy} class="display h3">{title}</h2>}
        {children}
      </div>
    </div>
  );
}

// ---------- Avisos breves ----------

const toastSubs = new Set();
let toastList = [];

export function toast(text, icon = 'check', ms = 3200) {
  const id = Math.random().toString(36).slice(2);
  toastList = [...toastList, { id, text, icon }];
  toastSubs.forEach((f) => f(toastList));
  setTimeout(() => {
    toastList = toastList.filter((t) => t.id !== id);
    toastSubs.forEach((f) => f(toastList));
  }, ms);
}

export function Toasts() {
  const [list, setList] = useState(toastList);
  useEffect(() => {
    toastSubs.add(setList);
    return () => toastSubs.delete(setList);
  }, []);
  return (
    <div class="toasts" role="status" aria-live="polite">
      {list.slice(-2).map((t) => (
        <div class="toast" key={t.id}>
          <Icon name={t.icon} size={20} />
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- Celebraciones ----------

const celebSubs = new Set();
let celebQueue = [];

export function celebrate(c) {
  celebQueue = [...celebQueue, c];
  celebSubs.forEach((f) => f(celebQueue));
}

export function Celebrations() {
  const [q, setQ] = useState(celebQueue);
  useEffect(() => {
    celebSubs.add(setQ);
    return () => celebSubs.delete(setQ);
  }, []);
  if (!q.length) return null;
  const c = q[0];
  const next = () => {
    celebQueue = celebQueue.slice(1);
    celebSubs.forEach((f) => f(celebQueue));
  };
  return (
    <div class="celebrate" role="dialog" aria-modal="true" aria-labelledby="celeb-t">
      <Icon name={c.icon || 'star'} size={40} />
      {c.big && <div class="big">{c.big}</div>}
      <h2 id="celeb-t" class="display h2">{c.title}</h2>
      {c.text && <p style={{ maxWidth: '32ch', lineHeight: 1.5 }}>{c.text}</p>}
      <button class="btn btn-light btn-lg" type="button" onClick={next} autofocus>Continuar</button>
    </div>
  );
}

// Traduce los eventos de progreso a avisos y celebraciones.
export function announce(events = [], xp = 0) {
  if (xp) toast(`+${xp} XP`, 'star');
  for (const e of events) {
    if (e.type === 'milestone') celebrate({ icon: 'flame', big: e.count, title: `¡Racha de ${e.count} días!`, text: 'La constancia es lo que más transforma tu forma de hablar.' });
    else if (e.type === 'levelUp') celebrate({ icon: 'award', big: `Nivel ${e.level.n}`, title: e.level.name, text: 'Subiste de nivel. Sigue así.' });
    else if (e.type === 'freezeEarned') toast('Misiones completas: ganaste un protector de racha', 'shield', 4200);
    else if (e.type === 'bonusXp') toast(`Misiones completas: +${e.xp} XP extra`, 'star');
    else if (e.type === 'achievement') toast(`Logro desbloqueado: ${e.title}`, 'award', 4200);
    else if (e.type === 'freezeUsed') toast('Un protector cuidó tu racha el día que no practicaste', 'shield', 4500);
    else if (e.type === 'streakLost') toast(`Tu racha de ${e.count} días se reinició. Hoy empiezas otra.`, 'flame', 4500);
  }
}

export { levelFor };
