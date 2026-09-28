// Niveles, habilidades, focos del plan, diagnóstico, rutas y plantillas de historias.

export const LEVELS = [
  { n: 1, name: 'Primeros pasos', xp: 0 },
  { n: 2, name: 'Voz despierta', xp: 150 },
  { n: 3, name: 'Voz clara', xp: 400 },
  { n: 4, name: 'Voz segura', xp: 800 },
  { n: 5, name: 'Oradora convincente', xp: 1400 },
  { n: 6, name: 'Narradora', xp: 2200 },
  { n: 7, name: 'Comunicadora de impacto', xp: 3200 },
  { n: 8, name: 'Voz inspiradora', xp: 4500 },
  { n: 9, name: 'Maestra de la palabra', xp: 6000 },
  { n: 10, name: 'Ágora', xp: 8000 },
];

export function levelFor(xp) {
  let cur = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.xp) cur = l;
  const next = LEVELS.find((l) => l.xp > xp) || null;
  return { ...cur, next, into: xp - cur.xp, span: next ? next.xp - cur.xp : 1, progress: next ? (xp - cur.xp) / (next.xp - cur.xp) : 1 };
}

export const SKILLS = [
  { key: 'claridad', label: 'Claridad' },
  { key: 'ritmo', label: 'Ritmo' },
  { key: 'muletillas', label: 'Sin muletillas' },
  { key: 'storytelling', label: 'Storytelling' },
  { key: 'energia', label: 'Energía de voz' },
  { key: 'seguridad', label: 'Seguridad' },
];

export const FOCUS = {
  ritmo: { title: 'Ritmo y pausas', challenge: ['ritmo'], exercise: 'rit-pausa-poderosa' },
  muletillas: { title: 'Adiós muletillas', challenge: ['muletillas'], exercise: 'mul-minuto-limpio' },
  energia: { title: 'Proyección y energía', challenge: ['energia'], exercise: 'proy-sirena' },
  claridad: { title: 'Claridad y dicción', challenge: ['claridad'], exercise: 'tw-tr' },
  seguridad: { title: 'Seguridad al hablar', challenge: ['seguridad', 'persuasion'], exercise: 'mul-frases-firmes' },
  storytelling: { title: 'Historias que convencen', challenge: ['storytelling', 'persuasion'], exercise: 'st-5-actos' },
};

export const GOALS = [
  { id: 'trabajo', label: 'Presentaciones en el trabajo' },
  { id: 'reuniones', label: 'Reuniones y conversaciones difíciles' },
  { id: 'entrevistas', label: 'Entrevistas' },
  { id: 'discursos', label: 'Discursos y eventos' },
  { id: 'clases', label: 'Dar clases o capacitaciones' },
  { id: 'miedo', label: 'Perder el miedo escénico' },
];

export const DAILY_GOALS = [
  { min: 5, label: '5 min', sub: 'Tranquila' },
  { min: 10, label: '10 min', sub: 'Constante' },
  { min: 15, label: '15 min', sub: 'Intensa' },
];

export const DIAGNOSTIC = {
  reading:
    'Cada mañana, antes de abrir la oficina, Marta repasa en voz alta lo que quiere decir en la primera reunión. No lo hace por nervios, sino por respeto: sabe que su equipo merece ideas claras. Primero respira hondo y ordena tres puntos. Después busca un ejemplo concreto para cada uno. Al final se pregunta qué quiere que la gente recuerde al salir. Con el tiempo descubrió algo sencillo: cuando habla más despacio, la escuchan mejor; y cuando hace una pausa, sus palabras pesan más.',
  question: 'Ahora preséntate como si empezaras una reunión importante: quién eres, qué haces y qué esperas lograr.',
};

export const STORY_TEMPLATES = [
  {
    id: 'actos', name: 'Arco en 5 actos', framework: 'actos',
    acts: [
      { key: 'gancho', label: 'Gancho', q: '¿Qué frase abre la historia y despierta curiosidad?', tension: 3 },
      { key: 'contexto', label: 'Contexto', q: '¿Quién, dónde y qué estaba en juego?', tension: 2 },
      { key: 'conflicto', label: 'Conflicto', q: '¿Qué obstáculo lo complicó todo?', tension: 4 },
      { key: 'giro', label: 'Punto de giro', q: '¿Qué decisión o descubrimiento cambió el rumbo?', tension: 5 },
      { key: 'mensaje', label: 'Cierre y mensaje', q: '¿Qué debe recordar tu audiencia al salir?', tension: 2 },
    ],
  },
  {
    id: 'adp', name: 'Antes · Después · Puente', framework: 'abt',
    acts: [
      { key: 'antes', label: 'Antes', q: '¿Cómo era la situación al principio?', tension: 3 },
      { key: 'despues', label: 'Después', q: '¿Cómo es ahora, o cómo podría ser?', tension: 2 },
      { key: 'puente', label: 'Puente', q: '¿Qué hizo posible el cambio?', tension: 4 },
    ],
  },
  {
    id: 'scr', name: 'Situación · Complicación · Resolución', framework: 'abt',
    acts: [
      { key: 'situacion', label: 'Situación', q: '¿Cuál es el punto de partida?', tension: 2 },
      { key: 'complicacion', label: 'Complicación', q: '¿Qué problema apareció?', tension: 5 },
      { key: 'resolucion', label: 'Resolución', q: '¿Cómo se resolvió y qué quedó?', tension: 2 },
    ],
  },
  {
    id: 'star', name: 'Método STAR', framework: 'star',
    acts: [
      { key: 'situacion', label: 'Situación', q: '¿En qué contexto pasó?', tension: 2 },
      { key: 'tarea', label: 'Tarea', q: '¿Cuál era tu responsabilidad?', tension: 3 },
      { key: 'accion', label: 'Acción', q: '¿Qué hiciste tú, concretamente?', tension: 4 },
      { key: 'resultado', label: 'Resultado', q: '¿Qué lograste? Si puedes, con un número.', tension: 2 },
    ],
  },
];

export const templateById = (id) => STORY_TEMPLATES.find((t) => t.id === id) || STORY_TEMPLATES[0];

// Rutas guiadas: cada día, una o dos actividades.
export const ROUTES = [
  {
    id: 'reuniones', title: 'Hablar en reuniones', days: 7,
    desc: 'Intervenir con claridad, ser breve y sostener tu punto.',
    plan: [
      [{ type: 'exercise', id: 'resp-478' }, { type: 'challenge', id: 'presentacion-personal' }],
      [{ type: 'exercise', id: 'mul-minuto-limpio' }, { type: 'challenge', id: 'conectores-reales' }],
      [{ type: 'exercise', id: 'rit-pausa-poderosa' }, { type: 'challenge', id: 'el-titular' }],
      [{ type: 'challenge', id: 'objecion' }],
      [{ type: 'exercise', id: 'imp-tema' }, { type: 'exercise', id: 'mul-silencio' }],
      [{ type: 'challenge', id: 'feedback-constructivo' }],
      [{ type: 'challenge', id: 'elevador' }],
    ],
  },
  {
    id: 'presentaciones', title: 'Presentaciones de alto impacto', days: 14,
    desc: 'Estructura, voz y cierre para presentaciones que se recuerdan.',
    plan: [
      [{ type: 'exercise', id: 'cue-postura' }, { type: 'challenge', id: 'pregunta-retorica' }],
      [{ type: 'exercise', id: 'proy-sirena' }, { type: 'challenge', id: 'voz-de-salon' }],
      [{ type: 'exercise', id: 'rit-lectura-marcada' }],
      [{ type: 'challenge', id: 'tres-razones' }],
      [{ type: 'exercise', id: 'st-abt' }],
      [{ type: 'challenge', id: 'dato-que-cuenta' }],
      [{ type: 'exercise', id: 'cue-mirada' }, { type: 'challenge', id: 'locutora' }],
      [{ type: 'exercise', id: 'proy-sostenida' }],
      [{ type: 'challenge', id: 'explicalo-a-un-nino' }],
      [{ type: 'exercise', id: 'st-constructor' }],
      [{ type: 'challenge', id: 'un-error' }],
      [{ type: 'exercise', id: 'cue-gestos' }, { type: 'challenge', id: 'cierre-memorable' }],
      [{ type: 'sim', id: 'dificiles' }],
      [{ type: 'challenge', id: 'mini-charla' }],
    ],
  },
  {
    id: 'entrevistas', title: 'Entrevistas y medios', days: 10,
    desc: 'Respuestas breves, mensajes clave y calma bajo presión.',
    plan: [
      [{ type: 'exercise', id: 'resp-cuadrada' }, { type: 'challenge', id: 'presentacion-personal' }],
      [{ type: 'sim', id: 'entrevista' }],
      [{ type: 'exercise', id: 'mul-frases-firmes' }],
      [{ type: 'challenge', id: 'objecion' }],
      [{ type: 'exercise', id: 'imp-tema' }],
      [{ type: 'sim', id: 'dificiles' }],
      [{ type: 'challenge', id: 'tres-razones' }],
      [{ type: 'exercise', id: 'st-5-actos' }],
      [{ type: 'sim', id: 'jefatura' }],
      [{ type: 'sim', id: 'entrevista' }],
    ],
  },
  {
    id: 'miedo', title: 'Vence el miedo escénico', days: 7,
    desc: 'Pasos pequeños para ganar calma y confianza al hablar.',
    plan: [
      [{ type: 'exercise', id: 'resp-478' }, { type: 'exercise', id: 'cue-postura' }],
      [{ type: 'exercise', id: 'resp-abdominal' }, { type: 'challenge', id: 'el-titular' }],
      [{ type: 'exercise', id: 'proy-vocal-a' }, { type: 'challenge', id: 'agradecimiento' }],
      [{ type: 'exercise', id: 'imp-objeto' }],
      [{ type: 'challenge', id: 'presentacion-personal' }],
      [{ type: 'exercise', id: 'cue-mirada' }, { type: 'challenge', id: 'brindis' }],
      [{ type: 'challenge', id: 'pregunta-retorica' }],
    ],
  },
];

export const routeById = (id) => ROUTES.find((r) => r.id === id);
