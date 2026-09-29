// Ágora · lógica de progreso (sin interfaz): racha, puntos, misiones, logros, habilidades y plan.
// Solo se guardan números. Nunca audio ni transcripciones.
import { levelFor, FOCUS } from '../content/meta.js';
import { CHALLENGES } from '../content/challenges.js';
import { TIPS } from '../content/tips.js';
import { TWISTERS } from '../content/twisters.js';

export const SKILL_KEYS = ['claridad', 'ritmo', 'muletillas', 'storytelling', 'energia', 'seguridad'];

export function defaultState() {
  return {
    v: 1,
    profile: { name: '', goals: [], dailyGoalMin: 10, onboarded: false, createdAt: null },
    settings: { theme: 'auto', vibrate: true, asr: 'auto', asrLocal: true, asrLocalLang: null, voiceURI: null, analysisMode: 'full', aiKey: '', aiModel: 'claude-sonnet-5' },
    calib: { sylPerWord: 1.85, n: 0 },
    xp: 0,
    streak: { count: 0, best: 0, lastDay: null, freezes: 1, freezeDays: [] },
    history: [],
    days: {},
    skills: Object.fromEntries(SKILL_KEYS.map((k) => [k, null])),
    skillHistory: {},
    diagnosis: null,
    achievements: {},
    stories: [],
    routes: {},
    seenMilestones: [],
  };
}

// ---------- Fechas (día local) ----------

export function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}

export function parseDay(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function addDays(key, n) {
  const d = parseDay(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

export function diffDays(a, b) {
  return Math.round((parseDay(a) - parseDay(b)) / 86400000);
}

export function dayNumber(key) {
  return Math.floor(parseDay(key).getTime() / 86400000);
}

// ---------- Racha ----------

export function reconcileStreak(s, today) {
  const st = s.streak;
  if (!st.lastDay || st.lastDay >= today) return [];
  const events = [];
  let d = addDays(st.lastDay, 1);
  while (d < today) {
    if (st.count > 0 && st.freezes > 0) {
      st.freezes--;
      st.freezeDays.push(d);
      st.lastDay = d;
      events.push({ type: 'freezeUsed', day: d });
    } else {
      if (st.count > 0) events.push({ type: 'streakLost', count: st.count });
      st.count = 0;
      break;
    }
    d = addDays(d, 1);
  }
  st.freezeDays = st.freezeDays.slice(-60);
  return events;
}

export const MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];

// ---------- Misiones del día ----------

const MISSION_POOL = [
  { id: 'respira', label: 'Haz un ejercicio de respiración', target: 1, test: (e) => e.kind === 'respiracion' },
  { id: 'trabalenguas', label: 'Practica un trabalenguas', target: 1, test: (e) => e.kind === 'trabalenguas' },
  { id: 'improv', label: 'Improvisa un tema', target: 1, test: (e) => e.kind === 'improv' },
  { id: 'limpio', label: 'Un minuto con menos de 2 muletillas', target: 1, needsAsr: true, test: (e) => e.fil != null && e.active >= 55 && e.fil < 2 && e.wpmSrc === 'asr' },
  { id: 'ritmo', label: 'Termina una práctica con ritmo en rango', target: 1, test: (e) => e.wpm != null && e.wpm >= 130 && e.wpm <= 160 },
  { id: 'pausas', label: 'Haz 4 pausas entre ideas en una práctica', target: 1, test: (e) => (e.eff || 0) >= 4 },
  { id: 'historia', label: 'Escribe o ensaya una historia', target: 1, test: (e) => e.kind === 'historia' },
  { id: 'energia', label: 'Logra una voz expresiva en una práctica', target: 1, test: (e) => e.pitchStd != null && e.pitchStd >= 2 && e.pitchStd <= 5.5 },
  { id: 'corporal', label: 'Haz un ejercicio de lenguaje corporal', target: 1, test: (e) => e.kind === 'guiado' && !(e.refId || '').startsWith('canto-') },
  { id: 'canto', label: 'Haz un ejercicio de canto o entonación', target: 1, test: (e) => e.kind === 'canto' || (e.refId || '').startsWith('canto-') },
  { id: 'lectura', label: 'Lee un tema en voz alta', target: 1, test: (e) => e.kind === 'lectura' },
];

export function missionsFor(s, today, env = {}) {
  const n = dayNumber(today);
  const goalMin = s.profile.dailyGoalMin || 10;
  const pool = MISSION_POOL.filter((m) => !(m.needsAsr && env.asr === false));
  const rot = pool[n % pool.length];
  const entries = s.history.filter((e) => e.day === today);
  const secs = (s.days[today]?.sec) || 0;
  const reto = todaysChallenge(s, today);
  const list = [
    { id: 'reto', label: 'Completa el reto del día', current: entries.some((e) => e.kind === 'reto' && e.refId === reto.id) ? 1 : 0, target: 1 },
    { id: 'minutos', label: `Practica ${goalMin} minutos en total`, current: Math.min(goalMin, Math.floor(secs / 60)), target: goalMin, unit: 'min' },
    { id: rot.id, label: rot.label, current: entries.some(rot.test) ? 1 : 0, target: 1 },
  ];
  return list.map((m) => ({ ...m, done: m.current >= m.target }));
}

// ---------- Plan y reto del día ----------

export function makePlan(skills) {
  const cands = ['ritmo', 'muletillas', 'energia', 'claridad', 'seguridad'];
  const order = cands
    .map((k, i) => [k, skills[k] ?? 60, i])
    .sort((a, b) => a[1] - b[1] || a[2] - b[2])
    .map((x) => x[0]);
  return [order[0], order[1], order[2], 'storytelling'];
}

export function currentFocus(s, today) {
  const plan = s.diagnosis?.plan;
  if (plan && plan.weeks?.length) {
    const w = Math.max(0, Math.floor(diffDays(today, plan.start) / 7));
    return { focus: plan.weeks[w % plan.weeks.length], week: (w % plan.weeks.length) + 1, cycle: Math.floor(w / plan.weeks.length), weeks: plan.weeks.length };
  }
  const rot = ['ritmo', 'muletillas', 'energia', 'storytelling'];
  const w = Math.floor(dayNumber(today) / 7);
  return { focus: rot[w % rot.length], week: null, cycle: 0, weeks: 0 };
}

export function todaysChallenge(s, today) {
  const { focus } = currentFocus(s, today);
  const kinds = FOCUS[focus]?.challenge || ['persuasion'];
  const pool = CHALLENGES.filter((c) => kinds.includes(c.focus));
  const n = dayNumber(today);
  return pool[n % pool.length] || CHALLENGES[0];
}

export function tipOfDay(today) {
  return TIPS[dayNumber(today) % TIPS.length];
}

export function twisterOfDay(today) {
  return TWISTERS[dayNumber(today) % TWISTERS.length];
}

// ---------- Semana ----------

export function weekRow(s, today) {
  const d = parseDay(today);
  const dow = (d.getDay() + 6) % 7; // lunes = 0
  const monday = addDays(today, -dow);
  const created = s.profile.createdAt || today;
  const labels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  return labels.map((label, i) => {
    const day = addDays(monday, i);
    let state = 'future';
    if (day === today) state = (s.days[day]?.acts || 0) > 0 ? 'done' : 'today';
    else if (day < today) {
      if ((s.days[day]?.acts || 0) > 0) state = 'done';
      else if (s.streak.freezeDays.includes(day)) state = 'freeze';
      else state = day < created ? 'none' : 'missed';
    }
    return { day, label, state, isToday: day === today };
  });
}

// ---------- Logros ----------

const count = (s, fn) => s.history.filter(fn).length;

export const ACHIEVEMENTS = [
  { id: 'primera', title: 'Primera práctica', desc: 'Completa tu primera práctica con voz.', icon: 'mic', progress: (s) => [count(s, (e) => e.active > 0), 1] },
  { id: 'racha-3', title: 'Tres en fila', desc: 'Racha de 3 días.', icon: 'flame', progress: (s) => [s.streak.best, 3] },
  { id: 'racha-7', title: 'Racha de 7 días', desc: 'Una semana sin fallar.', icon: 'flame', progress: (s) => [s.streak.best, 7] },
  { id: 'racha-30', title: 'Racha de 30 días', desc: 'Un mes de práctica diaria.', icon: 'flame', progress: (s) => [s.streak.best, 30] },
  { id: 'racha-100', title: 'Racha de 100 días', desc: 'Cien días hablando mejor.', icon: 'flame', progress: (s) => [s.streak.best, 100] },
  { id: 'minuto-limpio', title: 'Un minuto limpio', desc: 'Un minuto con una muletilla o ninguna.', icon: 'award', progress: (s) => [count(s, (e) => e.wpmSrc === 'asr' && e.active >= 55 && e.fil != null && e.fil <= 1) ? 1 : 0, 1] },
  { id: 'ritmo-justo', title: 'En el punto', desc: 'Cinco prácticas a buena velocidad (130 a 160 palabras por minuto).', icon: 'clock', progress: (s) => [count(s, (e) => e.wpm >= 130 && e.wpm <= 160), 5] },
  { id: 'pausas', title: 'Dominio de las pausas', desc: 'Seis pausas entre ideas en una sola práctica.', icon: 'pause', progress: (s) => [Math.max(0, ...s.history.map((e) => e.eff || 0)), 6] },
  { id: 'expresiva', title: 'Voz expresiva', desc: 'Variedad de tono de 90 o más.', icon: 'volume', progress: (s) => [s.history.some((e) => (e.comps?.energy || 0) >= 90) ? 1 : 0, 1] },
  { id: 'narradora', title: 'Buen relato', desc: 'Cinco historias contadas o ensayadas.', icon: 'book', progress: (s) => [count(s, (e) => e.kind === 'historia' || (e.kind === 'reto' && e.focus === 'storytelling')), 5] },
  { id: 'improvisadora', title: 'Improvisación', desc: 'Diez temas improvisados.', icon: 'sparkle', progress: (s) => [count(s, (e) => e.kind === 'improv'), 10] },
  { id: 'entrevista', title: 'Primera entrevista', desc: 'Completa una sesión del simulador.', icon: 'chat', progress: (s) => [count(s, (e) => e.kind === 'simulador'), 1] },
  { id: 'lengua-agil', title: 'Lengua ágil', desc: 'Diez trabalenguas practicados.', icon: 'speech', progress: (s) => [count(s, (e) => e.kind === 'trabalenguas'), 10] },
  { id: 'calma', title: 'Calma total', desc: 'Diez ejercicios de respiración.', icon: 'wind', progress: (s) => [count(s, (e) => e.kind === 'respiracion'), 10] },
  { id: 'madrugadora', title: 'Temprano', desc: 'Practica antes de las 8:00.', icon: 'sun', progress: (s) => [s.history.some((e) => new Date(e.ts).getHours() < 8) ? 1 : 0, 1] },
  { id: 'nocturna', title: 'Búho', desc: 'Practica después de las 22:00.', icon: 'moon', progress: (s) => [s.history.some((e) => new Date(e.ts).getHours() >= 22) ? 1 : 0, 1] },
  { id: 'mil', title: 'Mil puntos', desc: 'Acumula 1.000 XP.', icon: 'star', progress: (s) => [s.xp, 1000] },
  { id: 'nivel-5', title: 'Oratoria convincente', desc: 'Llega al nivel 5.', icon: 'award', progress: (s) => [levelFor(s.xp).n, 5] },
  { id: 'cien-minutos', title: '100 minutos', desc: 'Cien minutos de práctica.', icon: 'clock', progress: (s) => [Math.floor(Object.values(s.days).reduce((a, d) => a + (d.sec || 0), 0) / 60), 100] },
  { id: 'veinte-retos', title: 'Veinte retos', desc: 'Completa 20 retos diarios.', icon: 'target', progress: (s) => [count(s, (e) => e.kind === 'reto'), 20] },
  { id: 'firme', title: 'Palabra firme', desc: 'Una práctica de un minuto sin frases débiles.', icon: 'shield', progress: (s) => [s.history.some((e) => e.wpmSrc === 'asr' && e.active >= 55 && e.weak === 0) ? 1 : 0, 1] },
  { id: 'semana-completa', title: 'Semana completa', desc: 'Practica los 7 días de una semana.', icon: 'calendar', progress: (s) => [bestFullWeek(s), 7] },
  { id: 'nueva-medicion', title: 'Nueva medición', desc: 'Repite tu diagnóstico después de 4 semanas.', icon: 'chart', progress: (s) => [s.diagnosis?.count >= 2 ? 1 : 0, 1] },
  { id: 'ruta', title: 'Ruta completa', desc: 'Termina una ruta guiada.', icon: 'route', progress: (s) => [Object.values(s.routes).some((r) => r.completed) ? 1 : 0, 1] },
];

function bestFullWeek(s) {
  const days = Object.keys(s.days).filter((k) => (s.days[k].acts || 0) > 0).sort();
  let best = 0;
  for (const d of days) {
    const dow = (parseDay(d).getDay() + 6) % 7;
    if (dow !== 0) continue;
    let c = 0;
    for (let i = 0; i < 7; i++) if ((s.days[addDays(d, i)]?.acts || 0) > 0) c++;
    best = Math.max(best, c);
  }
  return best;
}

export function achievementStatus(s) {
  return ACHIEVEMENTS.map((a) => {
    const [cur, target] = a.progress(s);
    return { ...a, cur: Math.min(cur, target), target, unlocked: !!s.achievements[a.id] || cur >= target, day: s.achievements[a.id] || null };
  });
}

// ---------- Registrar una actividad ----------

// act: { kind, refId, title, practiceSec, xp, result?, focus?, extra? }
export function registerActivity(s, act, now = new Date()) {
  const today = dayKey(now);
  const events = reconcileStreak(s, today);
  const r = act.result || null;
  const levelBefore = levelFor(s.xp).n;

  let xp = act.xp || 10;
  if (r && r.overall != null) {
    if (r.overall >= 90) xp += 20;
    else if (r.overall >= 80) xp += 10;
  }

  const entry = {
    id: `${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    ts: now.getTime(),
    day: today,
    kind: act.kind,
    refId: act.refId || null,
    title: act.title || '',
    focus: act.focus || null,
    dur: Math.round(act.practiceSec || 0),
    active: r ? Math.round(r.activeSec || 0) : 0,
    wpm: r?.wpm ?? null,
    wpmSrc: r?.wpmSource ?? null,
    fil: r?.fillers ? r.fillers.total : null,
    filPm: r?.fillers ? Math.round(r.fillers.perMin * 10) / 10 : null,
    filTop: r?.fillers?.top?.map((x) => x.key) || null,
    weak: r?.weak ? r.weak.total : null,
    eff: r?.pauses ? r.pauses.effective : null,
    long: r?.pauses ? r.pauses.long : null,
    pitchStd: r?.energy?.pitchStd != null ? Math.round(r.energy.pitchStd * 100) / 100 : null,
    drop: r?.endDrop?.ratio != null ? Math.round(r.endDrop.ratio * 100) / 100 : null,
    score: r?.overall ?? act.score ?? null,
    comps: r?.comps || null,
    extra: act.extra || null,
    xp,
  };
  s.history.push(entry);
  if (s.history.length > 1500) s.history = s.history.slice(-1500);

  const day = (s.days[today] ||= { sec: 0, xp: 0, acts: 0, rewarded: false });
  day.sec += Math.round(act.practiceSec || 0);
  day.acts += 1;
  day.xp += xp;
  s.xp += xp;

  // racha
  const st = s.streak;
  if (st.lastDay !== today) {
    st.count = st.lastDay === addDays(today, -1) ? st.count + 1 : 1;
    st.lastDay = today;
    st.best = Math.max(st.best, st.count);
    if (MILESTONES.includes(st.count)) events.push({ type: 'milestone', count: st.count });
    events.push({ type: 'streak', count: st.count });
  }

  // habilidades (media móvil)
  if (act.skills) {
    for (const k of SKILL_KEYS) {
      const v = act.skills[k];
      if (v == null) continue;
      const old = s.skills[k];
      s.skills[k] = old == null ? Math.round(v) : Math.round(old + 0.3 * (v - old));
    }
    s.skillHistory[today] = { ...s.skills };
  }

  // calibración sílabas por palabra
  if (r?.calibration) {
    const c = s.calib;
    c.sylPerWord = c.n === 0 ? r.calibration.sylPerWord : c.sylPerWord + 0.25 * (r.calibration.sylPerWord - c.sylPerWord);
    c.n += 1;
  }

  // misiones
  const ms = missionsFor(s, today, act.env || {});
  if (ms.every((m) => m.done) && !day.rewarded) {
    day.rewarded = true;
    if (st.freezes < 3) {
      st.freezes += 1;
      events.push({ type: 'freezeEarned', freezes: st.freezes });
    } else {
      s.xp += 30;
      day.xp += 30;
      events.push({ type: 'bonusXp', xp: 30 });
    }
  }

  // logros nuevos
  for (const a of achievementStatus(s)) {
    if (!s.achievements[a.id] && a.cur >= a.target) {
      s.achievements[a.id] = today;
      events.push({ type: 'achievement', id: a.id, title: a.title });
    }
  }

  const levelAfter = levelFor(s.xp).n;
  if (levelAfter > levelBefore) events.push({ type: 'levelUp', level: levelFor(s.xp) });
  return { entry, xp, events };
}

// ---------- Consultas para Progreso ----------

export function periodStats(s, today, period) {
  const span = period === 'semana' ? 7 : period === 'mes' ? 30 : 365;
  const from = addDays(today, -(span - 1));
  const entries = s.history.filter((e) => e.day >= from && e.day <= today);
  const sec = Object.entries(s.days).filter(([k]) => k >= from && k <= today).reduce((a, [, d]) => a + (d.sec || 0), 0);
  return { entries, minutes: Math.round(sec / 60), activities: entries.length, retos: entries.filter((e) => e.kind === 'reto').length };
}

export function chartSeries(s, today, period) {
  if (period === 'semana') {
    const d = parseDay(today);
    const dow = (d.getDay() + 6) % 7;
    const monday = addDays(today, -dow);
    const labels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    return labels.map((label, i) => {
      const day = addDays(monday, i);
      return { label, day, value: Math.round((s.days[day]?.sec || 0) / 60), today: day === today, future: day > today };
    });
  }
  if (period === 'mes') {
    const out = [];
    for (let i = 29; i >= 0; i--) {
      const day = addDays(today, -i);
      out.push({ label: String(parseDay(day).getDate()), day, value: Math.round((s.days[day]?.sec || 0) / 60), today: i === 0 });
    }
    return out;
  }
  const months = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const t = parseDay(today);
  const out = [];
  for (let i = 11; i >= 0; i--) {
    const m = new Date(t.getFullYear(), t.getMonth() - i, 1);
    const prefix = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
    const sec = Object.entries(s.days).filter(([k]) => k.startsWith(prefix)).reduce((a, [, d]) => a + (d.sec || 0), 0);
    out.push({ label: months[m.getMonth()], day: prefix, value: Math.round(sec / 60), today: i === 0 });
  }
  return out;
}

export function skillDeltas(s, today) {
  const past = Object.keys(s.skillHistory).filter((k) => k <= addDays(today, -30)).sort().pop();
  const first = Object.keys(s.skillHistory).sort()[0];
  const ref = past ? s.skillHistory[past] : first && first !== today ? s.skillHistory[first] : null;
  return Object.fromEntries(SKILL_KEYS.map((k) => [k, ref && ref[k] != null && s.skills[k] != null ? s.skills[k] - ref[k] : null]));
}

export function fillerTrend(s, today) {
  const from = addDays(today, -30);
  const pts = s.history.filter((e) => e.day >= from && e.filPm != null && e.active >= 20).map((e) => ({ t: e.ts, v: e.filPm }));
  if (pts.length < 2) return { pts, now: pts.length ? pts[pts.length - 1].v : null, before: null };
  const k = Math.min(5, Math.ceil(pts.length / 3));
  const avg = (a) => a.reduce((x, y) => x + y.v, 0) / a.length;
  return { pts, now: Math.round(avg(pts.slice(-k)) * 10) / 10, before: Math.round(avg(pts.slice(0, k)) * 10) / 10 };
}

export function previousScore(s, kind, refId, excludeId) {
  const prev = s.history.filter((e) => e.kind === kind && e.refId === refId && e.score != null && e.id !== excludeId);
  return prev.length ? prev[prev.length - 1].score : null;
}
