// Configuraciones de grabación para cada tipo de práctica.
import { DIAGNOSTIC, templateById } from '../content/meta.js';

export function challengeConfig(ch) {
  return {
    kind: 'reto',
    refId: ch.id,
    title: ch.express ? `${ch.title} (express)` : ch.title,
    focus: ch.focus,
    xp: ch.xp,
    targetSec: ch.targetSec,
    maxSec: Math.max(ch.targetSec * 2, 90),
    steps: ch.steps || [],
    framework: ch.framework || null,
    script: ch.script || null,
    prompt: ch.steps?.length && !ch.script ? null : { label: 'Tu reto', text: ch.description },
    objective: ch.objective,
    backTo: '/reto',
  };
}

export function freeConfig(topic) {
  return {
    kind: 'libre',
    refId: 'libre',
    title: 'Práctica libre',
    xp: 30,
    targetSec: null,
    maxSec: 600,
    steps: [],
    prompt: topic ? { label: 'Tema sugerido', text: topic } : null,
    noTiming: true,
    backTo: '/',
  };
}

export function exerciseConfig(ex, extra = {}) {
  const base = {
    kind: 'ejercicio',
    refId: ex.id,
    title: ex.title,
    xp: ex.xp || 30,
    targetSec: ex.targetSec || null,
    maxSec: ex.targetSec ? ex.targetSec * 2 : 300,
    steps: ex.steps && typeof ex.steps[0] === 'object' ? ex.steps : [],
    framework: ex.framework || null,
    goal: ex.goal || null,
    noTiming: !ex.targetSec,
    backTo: `/entrenar/${ex.cat}`,
  };
  if (ex.type === 'speak') {
    const prompts = ex.prompts || [ex.prompt];
    base.prompt = { label: 'Tu tema', text: extra.prompt || prompts[Math.floor(Math.random() * prompts.length)] };
  }
  if (ex.type === 'read') {
    base.script = ex.text;
    base.marks = !!ex.marks;
    base.pacer = ex.pacer || null;
    base.pairs = ex.pairs || null;
    base.focusMetric = ex.focusMetric || null;
    if (ex.rounds) base.phases = ex.rounds.map((r) => ({ title: r.label, hint: r.hint, targetWpm: r.targetWpm || null, script: ex.text }));
    base.noTiming = true;
  }
  return base;
}

export function readingConfig(r) {
  return {
    kind: 'lectura',
    refId: `lec-${r.id}`,
    title: r.title,
    xp: 30,
    targetSec: null,
    maxSec: 300,
    steps: [],
    script: r.text,
    teleprompter: true,
    noTiming: true,
    backTo: `/temas/${r.id}`,
  };
}

export function improvConfig({ q, cat, hint, framework, mode, backTo }) {
  return {
    kind: 'improv',
    refId: mode || 'tema',
    title: 'Improvisación',
    xp: 40,
    targetSec: mode === 'palabra' ? 30 : 60,
    maxSec: 120,
    think: 15,
    steps: [],
    prompt: { label: cat || 'Tema', text: q, hint },
    framework,
    backTo: backTo || '/improvisacion',
  };
}

export function storyConfig(story) {
  const tpl = templateById(story.template);
  // cada parte de la historia va en su propio párrafo en el teleprompter
  const text = tpl.acts.map((a) => (story.acts[a.key] || '').trim()).filter(Boolean).join(' ¶ ');
  return {
    kind: 'historia',
    refId: story.id,
    title: story.title || 'Mi historia',
    xp: 50,
    targetSec: (story.minutes || 3) * 60,
    maxSec: (story.minutes || 3) * 60 * 2,
    steps: [],
    script: text,
    teleprompter: true,
    framework: tpl.framework,
    backTo: `/historias/${story.id}`,
  };
}

export function diagnosticConfig() {
  return {
    kind: 'diagnostico',
    refId: 'diagnostico',
    title: 'Diagnóstico inicial',
    xp: 50,
    targetSec: null,
    maxSec: 240,
    steps: [],
    phases: [
      { title: 'Lee en voz alta', hint: 'Con calma, como si se lo contaras a alguien importante.', script: DIAGNOSTIC.reading },
      { title: 'Preséntate', hint: 'Unos 30 segundos, sin leer.', prompt: DIAGNOSTIC.question },
    ],
    noTiming: true,
    backTo: '/bienvenida',
    resultRoute: '/diagnostico',
  };
}

// Enlace a cada ejercicio según su tipo.
export function exerciseHref(ex) {
  if (!ex) return '#/entrenar';
  if (ex.type === 'breath') return `#/respiracion/${ex.id}`;
  if (ex.type === 'twister') return `#/pronunciacion/${ex.twister}`;
  if (ex.type === 'improv') return `#/improvisacion?modo=${ex.mode || 'tema'}`;
  if (ex.type === 'story') return '#/historias';
  return `#/ejercicio/${ex.id}`;
}
