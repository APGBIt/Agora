// Estado persistente (solo números y textos que tú escribes). Se guarda en este navegador.
import { useEffect, useReducer } from 'preact/hooks';
import { defaultState, dayKey, reconcileStreak } from './logic.js';

const KEY = 'agora.v1';

function migrate(s) {
  const d = defaultState();
  if (!s || typeof s !== 'object') return d;
  return {
    ...d,
    ...s,
    profile: { ...d.profile, ...(s.profile || {}) },
    settings: { ...d.settings, ...(s.settings || {}) },
    streak: { ...d.streak, ...(s.streak || {}) },
    skills: { ...d.skills, ...(s.skills || {}) },
    calib: { ...d.calib, ...(s.calib || {}) },
    history: Array.isArray(s.history) ? s.history : [],
    stories: Array.isArray(s.stories) ? s.stories : [],
    days: s.days || {},
    skillHistory: s.skillHistory || {},
    achievements: s.achievements || {},
    routes: s.routes || {},
  };
}

export const storage = { ok: true };
try {
  localStorage.setItem('agora.t', '1');
  localStorage.removeItem('agora.t');
} catch {
  storage.ok = false;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch { /* sin almacenamiento */ }
  return defaultState();
}

let state = load();
const subs = new Set();
let timer = null;

function persist() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { storage.ok = false; }
  }, 120);
}

function notify() { subs.forEach((f) => f()); }

export function getState() { return state; }

export function update(fn) {
  const next = structuredClone(state);
  const ret = fn(next);
  state = next;
  persist();
  notify();
  return ret;
}

export function useApp() {
  const [, force] = useReducer((x) => x + 1, 0);
  useEffect(() => {
    subs.add(force);
    return () => subs.delete(force);
  }, []);
  return state;
}

export function resetAll() {
  const keepSettings = state.settings;
  state = defaultState();
  state.settings = { ...state.settings, theme: keepSettings.theme };
  persist();
  notify();
}

export function exportData() {
  return JSON.stringify({ app: 'agora', v: 1, exportedAt: new Date().toISOString(), data: { ...state, settings: { ...state.settings, aiKey: '' } } }, null, 1);
}

export function importData(text) {
  const o = JSON.parse(text);
  if (!o || o.app !== 'agora' || !o.data) throw new Error('El archivo no es una copia de Ágora.');
  const aiKey = state.settings.aiKey;
  state = migrate(o.data);
  state.settings.aiKey = aiKey;
  persist();
  notify();
}

// Al abrir: revisa la racha (usa protectores si faltó algún día).
export const startupEvents = (() => {
  const ev = reconcileStreak(state, dayKey());
  if (ev.length) persist();
  return ev;
})();

export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light' || theme === 'dark') root.setAttribute('data-theme', theme);
  else if (root.getAttribute('data-agora-theme')) root.removeAttribute('data-theme');
  if (theme === 'light' || theme === 'dark') root.setAttribute('data-agora-theme', theme);
  else root.removeAttribute('data-agora-theme');
}
