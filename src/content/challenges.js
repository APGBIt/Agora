// Retos diarios. Cada uno dura pocos minutos y tiene una estructura guiada por tiempo.

export const CHALLENGES = [
  // --- Persuasión ---
  {
    id: 'elevador', title: 'El elevador de 60 segundos', focus: 'persuasion', level: 4, minutes: 5, targetSec: 60, xp: 80,
    description: 'Presenta tu proyecto actual como si coincidieras en el ascensor con quien toma la decisión. Tienes un minuto.',
    objective: 'Que al salir quiera saber más.',
    framework: 'elevator', tags: ['Síntesis', 'Persuasión'],
    steps: [
      { name: 'Gancho', sec: 10, hint: 'Una pregunta o un dato que despierte curiosidad.' },
      { name: 'Problema', sec: 15, hint: '¿Qué duele hoy y a quién le duele?' },
      { name: 'Tu propuesta', sec: 20, hint: 'Qué haces distinto, en una frase clara.' },
      { name: 'Llamado a la acción', sec: 15, hint: 'Pide un paso concreto: una reunión, una firma, una fecha.' },
    ],
    evaluate: ['Ritmo', 'Muletillas', 'Estructura', 'Ajuste al tiempo'],
  },
  {
    id: 'tres-razones', title: 'Tres razones', focus: 'persuasion', level: 3, minutes: 6, targetSec: 90, xp: 90,
    description: 'Defiende esta idea: «Todas las personas deberían aprender a hablar en público».',
    objective: 'Una postura clara, sostenida por tres razones.',
    framework: 'prep', tags: ['Argumentar', 'Estructura'],
    steps: [
      { name: 'Tu postura', sec: 10, hint: 'Dila en una sola frase.' },
      { name: 'Razón 1', sec: 20, hint: 'La más fuerte primero.' },
      { name: 'Razón 2', sec: 20, hint: 'Añade un ejemplo concreto.' },
      { name: 'Razón 3', sec: 20, hint: 'Una razón que toque a la audiencia.' },
      { name: 'Cierre', sec: 20, hint: 'Repite tu postura con otras palabras.' },
    ],
    evaluate: ['Estructura', 'Ritmo', 'Palabras firmes'],
  },
  {
    id: 'cierre-memorable', title: 'Un cierre memorable', focus: 'persuasion', level: 2, minutes: 3, targetSec: 30, xp: 60,
    description: 'Imagina que terminas una presentación sobre tu trabajo. Resume en una frase y cierra con otra que se recuerde.',
    objective: 'Que tu última frase sea la que repitan.',
    framework: null, tags: ['Cierre', 'Impacto'],
    steps: [
      { name: 'Resumen', sec: 15, hint: 'Lo esencial en una frase.' },
      { name: 'Frase final', sec: 15, hint: 'Corta, con ritmo, y haz silencio después.' },
    ],
    evaluate: ['Pausas', 'Energía de voz', 'Ajuste al tiempo'],
  },
  {
    id: 'pregunta-retorica', title: 'Abre con una pregunta', focus: 'persuasion', level: 2, minutes: 4, targetSec: 45, xp: 60,
    description: 'Abre una charla con una pregunta que haga pensar, deja un silencio y responde en dos frases.',
    objective: 'Capturar la atención desde la primera frase.',
    framework: null, tags: ['Apertura', 'Pausas'],
    steps: [
      { name: 'La pregunta', sec: 10, hint: 'Que tu audiencia quiera responderla.' },
      { name: 'Silencio', sec: 5, hint: 'Deja que piensen. No lo llenes.' },
      { name: 'Tu respuesta', sec: 30, hint: 'Dos frases con tu idea central.' },
    ],
    evaluate: ['Pausas', 'Energía de voz'],
  },
  // --- Ritmo ---
  {
    id: 'la-pausa-poderosa', title: 'La pausa poderosa', focus: 'ritmo', level: 2, minutes: 4, targetSec: 60, xp: 70,
    description: 'Presenta tres ideas sobre tu trabajo. Después de cada una, haz silencio dos segundos.',
    objective: 'Que tus ideas respiren.',
    framework: null, tags: ['Pausas', 'Ritmo'],
    steps: [
      { name: 'Idea 1', sec: 15, hint: 'Dila y calla dos segundos.' },
      { name: 'Idea 2', sec: 15, hint: 'Otra idea, otra pausa.' },
      { name: 'Idea 3', sec: 15, hint: 'La más importante al final.' },
      { name: 'Cierre', sec: 15, hint: 'Resume las tres en una frase.' },
    ],
    evaluate: ['Pausas', 'Ritmo', 'Ajuste al tiempo'],
  },
  {
    id: 'cambio-de-ritmo', title: 'Cambio de ritmo', focus: 'ritmo', level: 3, minutes: 4, targetSec: 60, xp: 70,
    description: 'Cuenta cómo fue tu semana: ágil en lo cotidiano y lento en lo importante.',
    objective: 'Usar la velocidad para marcar lo que importa.',
    framework: null, tags: ['Ritmo', 'Énfasis'],
    steps: [
      { name: 'Lo cotidiano', sec: 20, hint: 'Ritmo ágil, sin correr.' },
      { name: 'Lo importante', sec: 25, hint: 'Baja la velocidad y marca cada palabra.' },
      { name: 'Cierre', sec: 15, hint: 'Una frase lenta y clara.' },
    ],
    evaluate: ['Ritmo', 'Energía de voz', 'Pausas'],
  },
  {
    id: 'locutora', title: 'Boletín de radio', focus: 'ritmo', level: 2, minutes: 4, targetSec: 45, xp: 60,
    description: 'Da una buena noticia de tu equipo como si fuera un boletín de radio: claro, a ritmo constante y con pausas.',
    objective: 'Un ritmo estable que se entienda a la primera.',
    framework: null, tags: ['Ritmo', 'Claridad'],
    steps: [
      { name: 'Titular', sec: 10, hint: 'La noticia en una frase.' },
      { name: 'Detalle', sec: 20, hint: 'Quién, qué y cuándo.' },
      { name: 'Cierre', sec: 15, hint: 'Qué significa para la audiencia.' },
    ],
    evaluate: ['Ritmo', 'Pausas', 'Claridad'],
  },
  {
    id: 'paso-a-paso', title: 'Paso a paso', focus: 'ritmo', level: 1, minutes: 4, targetSec: 60, xp: 60,
    description: 'Explica cómo preparar tu café favorito en cinco pasos, con una pausa entre cada paso.',
    objective: 'Ordenar y respirar entre ideas.',
    framework: 'conectores', tags: ['Orden', 'Pausas'],
    steps: [
      { name: 'Presenta', sec: 8, hint: 'Di qué vas a explicar.' },
      { name: 'Pasos 1 y 2', sec: 18, hint: 'Empieza con «primero».' },
      { name: 'Pasos 3 y 4', sec: 18, hint: 'Sigue con «además» o «después».' },
      { name: 'Paso 5 y cierre', sec: 16, hint: 'Termina con «por último».' },
    ],
    evaluate: ['Pausas', 'Estructura', 'Ritmo'],
  },
  // --- Muletillas ---
  {
    id: 'minuto-limpio', title: 'Un minuto limpio', focus: 'muletillas', level: 2, minutes: 3, targetSec: 60, xp: 70,
    description: 'Habla un minuto sobre tu lugar favorito de la ciudad. Si sientes que viene un «este», haz silencio.',
    objective: 'Cero muletillas: cámbialas por pausas.',
    framework: null, tags: ['Muletillas', 'Pausas'],
    steps: [],
    evaluate: ['Muletillas', 'Pausas'],
  },
  {
    id: 'respuesta-rapida', title: 'Respuesta rápida', focus: 'muletillas', level: 2, minutes: 3, targetSec: 45, xp: 60,
    description: '¿Qué harías con una hora extra cada día? Responde sin «eh» ni «o sea».',
    objective: 'Pensar en silencio en lugar de rellenar.',
    framework: 'prep', tags: ['Muletillas', 'Improvisación'],
    steps: [],
    evaluate: ['Muletillas', 'Estructura'],
  },
  {
    id: 'tu-trabajo', title: 'Tu trabajo en un minuto', focus: 'muletillas', level: 1, minutes: 3, targetSec: 60, xp: 60,
    description: 'Explica qué haces en tu trabajo, para quién y por qué importa. Sin muletillas.',
    objective: 'Un mensaje limpio sobre lo que mejor conoces.',
    framework: null, tags: ['Muletillas', 'Claridad'],
    steps: [
      { name: 'Qué hago', sec: 20, hint: 'En palabras sencillas.' },
      { name: 'Para quién', sec: 20, hint: 'Nombra a las personas que se benefician.' },
      { name: 'Por qué importa', sec: 20, hint: 'Un resultado concreto.' },
    ],
    evaluate: ['Muletillas', 'Ritmo'],
  },
  {
    id: 'conectores-reales', title: 'Conectores de verdad', focus: 'muletillas', level: 2, minutes: 4, targetSec: 60, xp: 70,
    description: 'Da tres consejos para una buena reunión usando «primero», «además» y «por último» en lugar de «entonces».',
    objective: 'Enlazar ideas sin muletillas de relleno.',
    framework: 'conectores', tags: ['Conectores', 'Orden'],
    steps: [
      { name: 'Primero', sec: 15, hint: 'Tu primer consejo.' },
      { name: 'Además', sec: 15, hint: 'El segundo.' },
      { name: 'Por ejemplo', sec: 15, hint: 'Ilustra uno de ellos.' },
      { name: 'Por último', sec: 15, hint: 'Cierra con el tercero.' },
    ],
    evaluate: ['Muletillas', 'Estructura'],
  },
  // --- Energía ---
  {
    id: 'brindis', title: 'Brindis de 45 segundos', focus: 'energia', level: 2, minutes: 3, targetSec: 45, xp: 70,
    description: 'Brinda por un logro de tu equipo. Con emoción, pero sin gritar.',
    objective: 'Contagiar energía con la voz.',
    framework: 'brindis', tags: ['Energía', 'Emoción'],
    steps: [
      { name: 'Gancho', sec: 8, hint: 'Saluda y capta la atención.' },
      { name: 'Anécdota', sec: 17, hint: 'Un momento concreto del logro.' },
      { name: 'Mensaje', sec: 12, hint: 'Qué admiras de tu equipo.' },
      { name: 'Brindis', sec: 8, hint: 'Invita a levantar las copas.' },
    ],
    evaluate: ['Energía de voz', 'Estructura', 'Ajuste al tiempo'],
  },
  {
    id: 'voz-de-salon', title: 'Voz de salón', focus: 'energia', level: 2, minutes: 3, targetSec: 45, xp: 60,
    description: 'Da un anuncio como si hablaras a cincuenta personas sin micrófono.',
    objective: 'Proyectar sin forzar la garganta.',
    framework: null, tags: ['Proyección', 'Volumen'],
    steps: [
      { name: 'Saludo', sec: 8, hint: 'Voz amplia desde el abdomen.' },
      { name: 'Anuncio', sec: 22, hint: 'Sostén el volumen hasta el final de cada frase.' },
      { name: 'Cierre', sec: 15, hint: 'Una frase que quede resonando.' },
    ],
    evaluate: ['Energía de voz', 'Volumen al final', 'Pausas'],
  },
  {
    id: 'agradecimiento', title: 'Un agradecimiento con impacto', focus: 'energia', level: 1, minutes: 3, targetSec: 45, xp: 60,
    description: 'Agradece a alguien que te ayudó: di qué hizo y qué significó para ti.',
    objective: 'Emoción sincera con énfasis en lo importante.',
    framework: null, tags: ['Emoción', 'Énfasis'],
    steps: [
      { name: 'A quién', sec: 10, hint: 'Nombra a la persona.' },
      { name: 'Qué hizo', sec: 20, hint: 'Un hecho concreto.' },
      { name: 'Qué significó', sec: 15, hint: 'Baja el ritmo aquí.' },
    ],
    evaluate: ['Energía de voz', 'Ritmo'],
  },
  {
    id: 'lectura-expresiva', title: 'Lectura expresiva', focus: 'energia', level: 2, minutes: 3, targetSec: 40, xp: 60,
    description: 'Lee este fragmento con emoción: juega con el volumen, el tono y los silencios.',
    objective: 'Que la voz cuente la historia.',
    framework: null, tags: ['Lectura', 'Emoción'],
    steps: [],
    script: 'Esa mañana el salón estaba lleno. Nadie esperaba buenas noticias. Entonces ella se levantó, respiró hondo y dijo: «Lo logramos». Por un segundo hubo silencio. Después, los aplausos llenaron la sala.',
    evaluate: ['Energía de voz', 'Pausas'],
  },
  // --- Claridad ---
  {
    id: 'explicalo-a-un-nino', title: 'Explícalo a un niño', focus: 'claridad', level: 2, minutes: 4, targetSec: 60, xp: 70,
    description: 'Explica qué hace tu área de trabajo a un niño de diez años.',
    objective: 'Palabras sencillas, sin tecnicismos.',
    framework: null, tags: ['Claridad', 'Sencillez'],
    steps: [
      { name: 'Qué hacemos', sec: 15, hint: 'Usa palabras de todos los días.' },
      { name: 'Por qué importa', sec: 15, hint: 'A quién ayuda.' },
      { name: 'Un ejemplo', sec: 20, hint: 'Compáralo con algo cotidiano.' },
      { name: 'Cierre', sec: 10, hint: 'Una frase fácil de recordar.' },
    ],
    evaluate: ['Claridad', 'Ritmo', 'Ajuste al tiempo'],
  },
  {
    id: 'el-titular', title: 'El titular', focus: 'claridad', level: 1, minutes: 2, targetSec: 30, xp: 50,
    description: 'Resume tu semana en un titular y dos frases de apoyo.',
    objective: 'Síntesis: lo esencial primero.',
    framework: null, tags: ['Síntesis'],
    steps: [
      { name: 'Titular', sec: 8, hint: 'Como en un periódico.' },
      { name: 'Apoyo 1', sec: 10, hint: 'Un dato o hecho.' },
      { name: 'Apoyo 2', sec: 12, hint: 'Qué sigue.' },
    ],
    evaluate: ['Ajuste al tiempo', 'Ritmo'],
  },
  {
    id: 'dato-que-cuenta', title: 'Un dato que cuenta', focus: 'claridad', level: 3, minutes: 4, targetSec: 60, xp: 70,
    description: 'Presenta un número importante de tu área y explícalo con una comparación.',
    objective: 'Que un número se entienda y se recuerde.',
    framework: null, tags: ['Datos', 'Claridad'],
    steps: [
      { name: 'El dato', sec: 10, hint: 'Dilo lento y haz una pausa.' },
      { name: 'Qué significa', sec: 20, hint: 'Tradúcelo a algo concreto.' },
      { name: 'Comparación', sec: 20, hint: '«Es como si…».' },
      { name: 'Qué hacer', sec: 10, hint: 'La acción que se desprende.' },
    ],
    evaluate: ['Claridad', 'Pausas'],
  },
  {
    id: 'instruccion-clara', title: 'Una instrucción clara', focus: 'claridad', level: 2, minutes: 4, targetSec: 60, xp: 70,
    description: 'Explica un procedimiento de tu trabajo en cuatro pasos a alguien que empieza hoy.',
    objective: 'Que lo pueda hacer sin preguntarte.',
    framework: 'oeev', tags: ['Procedimientos', 'Orden'],
    steps: [
      { name: 'Objetivo', sec: 10, hint: 'Para qué sirve el procedimiento.' },
      { name: 'Pasos 1 y 2', sec: 20, hint: 'Usa «primero» y «después».' },
      { name: 'Pasos 3 y 4', sec: 20, hint: 'Un ejemplo si hace falta.' },
      { name: 'Verificación', sec: 10, hint: '«¿Alguna duda?»' },
    ],
    evaluate: ['Estructura', 'Claridad', 'Ritmo'],
  },
  // --- Seguridad ---
  {
    id: 'presentacion-personal', title: 'Preséntate con seguridad', focus: 'seguridad', level: 1, minutes: 4, targetSec: 60, xp: 70,
    description: 'Preséntate como si iniciaras una reunión importante.',
    objective: 'Firmeza desde la primera frase.',
    framework: null, tags: ['Seguridad', 'Presentación'],
    steps: [
      { name: 'Quién eres', sec: 15, hint: 'Nombre y rol, sin disculpas.' },
      { name: 'Qué haces', sec: 15, hint: 'Un logro concreto.' },
      { name: 'Qué te trae', sec: 15, hint: 'El objetivo de la reunión.' },
      { name: 'Invitación', sec: 15, hint: 'Qué esperas de las personas presentes.' },
    ],
    evaluate: ['Palabras firmes', 'Ritmo', 'Muletillas'],
  },
  {
    id: 'objecion', title: 'Responde una objeción', focus: 'seguridad', level: 3, minutes: 4, targetSec: 60, xp: 80,
    description: 'Tu jefatura dice: «No hay presupuesto para eso». Responde sin ponerte a la defensiva.',
    objective: 'Reconocer, responder y llevar la conversación a tu mensaje.',
    framework: 'arp', tags: ['Objeciones', 'Calma'],
    steps: [
      { name: 'Reconoce', sec: 10, hint: '«Entiendo la preocupación…»' },
      { name: 'Responde', sec: 25, hint: 'Un dato o una alternativa.' },
      { name: 'Puente', sec: 15, hint: '«Lo importante es…»' },
      { name: 'Pide', sec: 10, hint: 'Un siguiente paso concreto.' },
    ],
    evaluate: ['Estructura', 'Palabras firmes', 'Pausas'],
  },
  {
    id: 'feedback-constructivo', title: 'Feedback constructivo', focus: 'seguridad', level: 3, minutes: 4, targetSec: 60, xp: 80,
    description: 'Un compañero entrega tarde los informes. Díselo con respeto y claridad.',
    objective: 'Hechos, impacto, petición y acuerdo.',
    framework: 'hipa', tags: ['Conversaciones difíciles'],
    steps: [
      { name: 'Hecho', sec: 15, hint: 'Lo que viste, sin juicios.' },
      { name: 'Impacto', sec: 15, hint: 'Cómo afecta al equipo.' },
      { name: 'Petición', sec: 15, hint: 'Qué cambio necesitas.' },
      { name: 'Acuerdo', sec: 15, hint: '«¿Te parece si…?»' },
    ],
    evaluate: ['Estructura', 'Palabras firmes'],
  },
  {
    id: 'noticia-dificil', title: 'Una noticia difícil', focus: 'seguridad', level: 3, minutes: 4, targetSec: 60, xp: 80,
    description: 'Comunica a tu equipo que un proyecto se retrasa dos semanas.',
    objective: 'Claridad y calma ante una mala noticia.',
    framework: null, tags: ['Calma', 'Liderazgo'],
    steps: [
      { name: 'El hecho', sec: 10, hint: 'Dilo directo, sin rodeos.' },
      { name: 'El impacto', sec: 15, hint: 'Qué cambia para cada uno.' },
      { name: 'El plan', sec: 20, hint: 'Qué haremos ahora.' },
      { name: 'Compromiso', sec: 15, hint: 'Qué puedes asegurar.' },
    ],
    evaluate: ['Palabras firmes', 'Pausas', 'Ritmo'],
  },
  // --- Storytelling ---
  {
    id: 'un-error', title: 'Un error que te enseñó', focus: 'storytelling', level: 3, minutes: 6, targetSec: 90, xp: 90,
    description: 'Cuenta un momento en que un error te enseñó algo importante.',
    objective: 'Una historia con principio, tensión y mensaje.',
    framework: 'actos', tags: ['Historia', 'Estructura'],
    steps: [
      { name: 'Gancho', sec: 10, hint: 'Empieza en el momento exacto del error.' },
      { name: 'Contexto', sec: 20, hint: 'Dónde estabas y qué estaba en juego.' },
      { name: 'Conflicto', sec: 20, hint: 'Qué salió mal.' },
      { name: 'Giro', sec: 20, hint: 'Qué decidiste hacer.' },
      { name: 'Mensaje', sec: 20, hint: 'Qué aprendiste.' },
    ],
    evaluate: ['Estructura', 'Energía de voz', 'Pausas'],
  },
  {
    id: 'antes-y-despues', title: 'Antes y después', focus: 'storytelling', level: 2, minutes: 4, targetSec: 60, xp: 70,
    description: 'Cuenta un cambio: cómo era antes, qué pasó y cómo es ahora.',
    objective: 'Contexto, tensión y consecuencia.',
    framework: 'abt', tags: ['Historia', 'Cambio'],
    steps: [
      { name: 'Antes', sec: 20, hint: 'La situación inicial.' },
      { name: 'Pero', sec: 20, hint: 'El problema o el giro.' },
      { name: 'Por lo tanto', sec: 20, hint: 'Cómo es ahora.' },
    ],
    evaluate: ['Estructura', 'Ritmo'],
  },
  {
    id: 'con-los-sentidos', title: 'Con los cinco sentidos', focus: 'storytelling', level: 2, minutes: 4, targetSec: 60, xp: 70,
    description: 'Describe un lugar que te guste usando al menos tres sentidos.',
    objective: 'Detalles que hacen visible una historia.',
    framework: 'sentidos', tags: ['Detalles', 'Descripción'],
    steps: [],
    evaluate: ['Estructura', 'Energía de voz'],
  },
  {
    id: 'mini-charla', title: 'Mini charla', focus: 'storytelling', level: 4, minutes: 8, targetSec: 120, xp: 120,
    description: 'Cuenta una historia personal que deje una idea clara, como en una charla corta.',
    objective: 'Historia al servicio de una idea.',
    framework: 'actos', tags: ['Charla', 'Historia'],
    steps: [
      { name: 'Gancho', sec: 15, hint: 'Una imagen o una pregunta.' },
      { name: 'Historia', sec: 45, hint: 'Personajes, obstáculo y decisión.' },
      { name: 'Idea', sec: 35, hint: 'Lo que la historia demuestra.' },
      { name: 'Llamado', sec: 25, hint: 'Qué debe hacer tu audiencia.' },
    ],
    evaluate: ['Estructura', 'Energía de voz', 'Ajuste al tiempo'],
  },
];

export const challengeById = (id) => CHALLENGES.find((c) => c.id === id);

// Versión express: menos tiempo, misma estructura.
export function expressVersion(ch) {
  const target = Math.min(ch.targetSec, 40);
  const k = target / ch.targetSec;
  return {
    ...ch,
    targetSec: target,
    xp: Math.round(ch.xp * 0.6),
    express: true,
    steps: ch.steps.map((s) => ({ ...s, sec: Math.max(5, Math.round(s.sec * k)) })),
  };
}
