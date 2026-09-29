// Biblioteca de ejercicios por categoría.
import { TWISTERS } from './twisters.js';

export const CATEGORIES = [
  { id: 'respiracion', title: 'Respiración y apoyo', group: 'Voz', tone: 'teal', icon: 'wind', desc: 'Controla el aire para sostener frases largas.' },
  { id: 'diccion', title: 'Pronunciación y dicción', group: 'Dicción', tone: 'amber', icon: 'speech', desc: 'Trabalenguas, vocalización y articulación.' },
  { id: 'ritmo', title: 'Ritmo y pausas', group: 'Dicción', tone: 'amber', icon: 'clock', desc: 'Velocidad, silencios y énfasis donde importa.' },
  { id: 'proyeccion', title: 'Proyección de voz', group: 'Voz', tone: 'teal', icon: 'volume', desc: 'Volumen y resonancia sin forzar la garganta.' },
  { id: 'canto', title: 'Canto: tono y entonación', group: 'Voz', tone: 'teal', icon: 'music', desc: 'Afina, entona y dale melodía a tu voz al hablar.' },
  { id: 'muletillas', title: 'Adiós muletillas', group: 'Dicción', tone: 'amber', icon: 'speechx', desc: 'Detecta y sustituye «este», «o sea», «¿verdad?».' },
  { id: 'storytelling', title: 'Storytelling', group: 'Estructura', tone: 'violet', icon: 'book', desc: 'Relatos que conectan y se recuerdan.' },
  { id: 'improvisacion', title: 'Improvisación', group: 'Estructura', tone: 'violet', icon: 'sparkle', desc: 'Temas al azar con 15 s para pensar.' },
  { id: 'corporal', title: 'Lenguaje corporal', group: 'Presencia', tone: 'coral', icon: 'body', desc: 'Postura, mirada y gestos que refuerzan tu mensaje.' },
];

export const GROUPS = ['Todos', 'Voz', 'Dicción', 'Estructura', 'Presencia'];

const twisterItems = TWISTERS.map((t) => ({
  id: t.id, cat: 'diccion', type: 'twister', twister: t.id, title: t.title, minutes: 2, level: t.level, xp: 30,
  desc: t.text,
}));

export const EXERCISES = [
  // Respiración
  {
    id: 'resp-478', cat: 'respiracion', type: 'breath', title: 'Respiración 4-7-8', minutes: 2, level: 1, xp: 20,
    desc: 'Calma los nervios antes de hablar.',
    pattern: [
      { name: 'Inhala', sub: 'por la nariz', sec: 4, kind: 'in' },
      { name: 'Sostén', sub: 'sin tensión', sec: 7, kind: 'hold' },
      { name: 'Exhala', sub: 'con un «sss» suave', sec: 8, kind: 'out' },
    ],
    cycles: 4,
    tip: 'Pon una mano en el abdomen: debe inflarse al inhalar, no los hombros.',
  },
  {
    id: 'resp-cuadrada', cat: 'respiracion', type: 'breath', title: 'Respiración cuadrada', minutes: 2, level: 1, xp: 20,
    desc: 'Ordena la mente antes de una reunión.',
    pattern: [
      { name: 'Inhala', sub: 'por la nariz', sec: 4, kind: 'in' },
      { name: 'Sostén', sub: 'lleno', sec: 4, kind: 'hold' },
      { name: 'Exhala', sub: 'por la boca', sec: 4, kind: 'out' },
      { name: 'Sostén', sub: 'vacío', sec: 4, kind: 'hold2' },
    ],
    cycles: 5,
    tip: 'Imagina que recorres los cuatro lados de un cuadrado.',
  },
  {
    id: 'resp-sss', cat: 'respiracion', type: 'sustain', mode: 'sss', title: 'La «sss» sostenida', minutes: 2, level: 1, xp: 25,
    desc: 'Controla la salida del aire para frases largas.',
    goalSec: 20,
    steps: ['Inhala profundo por la nariz, inflando el abdomen.', 'Suelta el aire con una «sss» suave y pareja.', 'Aguanta todo lo que puedas sin forzar.'],
    tip: 'Si la «s» se entrecorta, suelta menos aire: el objetivo es que sea pareja.',
  },
  {
    id: 'resp-contar', cat: 'respiracion', type: 'sustain', mode: 'contar', title: 'Contar en una exhalación', minutes: 2, level: 2, xp: 25,
    desc: 'Habla más tiempo sin cortar frases.',
    goalSec: 15,
    steps: ['Inhala profundo.', 'Cuenta en voz alta: uno, dos, tres…', 'Llega lo más lejos posible con una sola exhalación, sin acelerar.'],
    tip: 'Mantén un ritmo constante: contar rápido no vale.',
  },
  {
    id: 'resp-abdominal', cat: 'respiracion', type: 'guided', title: 'Respiración abdominal', minutes: 2, level: 1, xp: 15,
    desc: 'La base de una voz firme y tranquila.',
    steps: [
      { name: 'Posición', sec: 15, hint: 'Una mano en el pecho y otra en el abdomen.' },
      { name: 'Inhala', sec: 25, hint: 'Inhala en 4 tiempos inflando el abdomen; el pecho casi no se mueve.' },
      { name: 'Exhala', sec: 25, hint: 'Suelta el aire en 6 tiempos por la boca, lento.' },
      { name: 'Repite', sec: 45, hint: 'Tres ciclos más, cada vez más lento.' },
    ],
  },
  // Dicción
  ...twisterItems,
  {
    id: 'voc-lapiz', cat: 'diccion', type: 'read', title: 'Vocalización con lápiz', minutes: 3, level: 1, xp: 30,
    desc: 'Lee con un lápiz entre los dientes y luego sin él: notarás la diferencia.',
    rounds: [
      { label: 'Con el lápiz entre los dientes', hint: 'Exagera el movimiento de labios y lengua.' },
      { label: 'Sin el lápiz', hint: 'Mantén la misma precisión.' },
    ],
    text: 'Pronunciar con claridad es un acto de respeto hacia quien nos escucha. Cada sílaba cuenta y cada final importa. Cuando articulamos bien, el mensaje llega completo.',
  },
  // Ritmo
  {
    id: 'rit-pausa-poderosa', cat: 'ritmo', type: 'speak', title: 'La pausa poderosa', minutes: 3, level: 2, xp: 35,
    desc: 'Haz silencios de dos segundos después de cada idea.',
    prompt: 'Presenta tres ideas sobre tu trabajo. Después de cada una, haz dos segundos de silencio.',
    targetSec: 60,
    steps: [
      { name: 'Idea 1', sec: 18, hint: 'Dila y calla dos segundos.' },
      { name: 'Idea 2', sec: 18, hint: 'Otra idea, otra pausa.' },
      { name: 'Idea 3', sec: 24, hint: 'La más importante al final.' },
    ],
    goal: { metric: 'pauses', min: 3, label: 'Al menos 3 pausas entre ideas' },
  },
  {
    id: 'rit-tres-velocidades', cat: 'ritmo', type: 'read', title: 'Tres velocidades', minutes: 3, level: 1, xp: 30,
    desc: 'La misma frase lenta, normal y rápida, sin perder claridad.',
    rounds: [
      { label: 'Lento', targetWpm: 100, hint: 'Marca cada palabra.' },
      { label: 'Normal', targetWpm: 140, hint: 'Como en una conversación.' },
      { label: 'Rápido', targetWpm: 180, hint: 'Sin comerte ninguna sílaba.' },
    ],
    text: 'La claridad no depende de la velocidad, sino de las pausas que eliges.',
  },
  {
    id: 'rit-lectura-marcada', cat: 'ritmo', type: 'read', title: 'Lectura con pausas marcadas', minutes: 3, level: 2, xp: 30,
    desc: 'Una barra es una pausa corta; dos barras, una pausa larga.',
    text: 'Hablar bien / no es hablar mucho. // Es decir lo necesario, / en el orden correcto, / con la pausa justa. // Cuando haces silencio, / tu audiencia piensa contigo. // Y cuando retomas, / te escucha mejor.',
    marks: true,
    goal: { metric: 'pauses', min: 3, label: 'Respeta las pausas dobles' },
  },
  {
    id: 'rit-constante', cat: 'ritmo', type: 'read', title: 'Ritmo constante', minutes: 3, level: 2, xp: 30,
    desc: 'Lee siguiendo la guía: resalta cada palabra a 140 palabras por minuto.',
    text: 'Una buena presentación empieza mucho antes de subir al escenario. Empieza cuando decides qué quieres que tu audiencia recuerde. Con esa idea clara, cada ejemplo, cada dato y cada pausa trabajan a tu favor. Habla a un ritmo que permita pensar, a ti y a quien te escucha.',
    pacer: 140,
  },
  // Proyección
  {
    id: 'proy-sostenida', cat: 'proyeccion', type: 'read', title: 'Proyección sostenida', minutes: 3, level: 2, xp: 30,
    desc: 'Mantén el volumen hasta la última palabra de cada frase.',
    text: 'Gracias a todos por estar aquí esta mañana. Hoy vamos a decidir algo importante para el equipo. Quiero que cada persona salga con una tarea clara. Empezamos puntualmente a las nueve. Cuento con ustedes hasta el final.',
    focusMetric: 'volume',
  },
  {
    id: 'proy-vocal-a', cat: 'proyeccion', type: 'sustain', mode: 'aaa', title: 'Vocal sostenida', minutes: 2, level: 1, xp: 25,
    desc: 'Sostén una «aaa» pareja: ni más fuerte ni más débil.',
    goalSec: 15,
    steps: ['Inhala profundo.', 'Di «aaa» con voz cómoda, como si llamaras a alguien a lo lejos.', 'Mantén el mismo volumen hasta el final.'],
    tip: 'Apoya desde el abdomen, no desde la garganta.',
  },
  {
    id: 'proy-sirena', cat: 'proyeccion', type: 'glide', title: 'La sirena', minutes: 2, level: 1, xp: 25,
    desc: 'Desliza la voz de grave a agudo y de vuelta para ganar expresividad.',
    goalSt: 12,
    steps: ['Con la boca cerrada, haz «mmm» en tu tono más grave.', 'Sube despacio hasta el más agudo que puedas sin forzar.', 'Baja de nuevo, como una sirena.'],
    tip: 'Una voz con más rango suena más viva y menos monótona.',
  },
  // Canto: tono y entonación
  {
    id: 'canto-calentamiento', cat: 'canto', type: 'guided', title: 'Calentamiento de cantante', minutes: 3, level: 1, xp: 20,
    desc: 'Prepara la voz como lo hacen los cantantes antes de un concierto.',
    steps: [
      { name: 'Bostezo y suspiro', sec: 20, hint: 'Bosteza con la boca abierta y suelta el aire con un suspiro que baja de agudo a grave.' },
      { name: 'Vibración de labios', sec: 30, hint: 'Haz «brrr» con los labios sueltos, como un motor, subiendo y bajando el tono.' },
      { name: 'Tarareo', sec: 30, hint: 'Con la boca cerrada di «mmm» en una nota cómoda. Siente cosquillas en labios y nariz.' },
      { name: 'Vocales en una nota', sec: 30, hint: 'En la misma nota canta «mi, me, ma, mo, mu» sin mover la mandíbula de más.' },
      { name: 'Sirena suave', sec: 25, hint: 'Con «nnn» o «ng» sube despacio al agudo y baja al grave, sin forzar.' },
      { name: 'Frase hablada', sec: 15, hint: 'Di con voz relajada: «Buenos días, qué gusto verlos». Nota cómo suena más libre.' },
    ],
  },
  {
    id: 'canto-escala', cat: 'canto', type: 'pitch', title: 'Escala do-re-mi', minutes: 2, level: 1, xp: 30,
    desc: 'Escucha cada nota y repítela. La app te dice si estás en el tono.',
    intervals: [0, 2, 4, 5, 7, 5, 4, 2, 0],
    hold: 2.2,
    tip: 'Si te quedas abajo, sonríe un poco y piensa la nota «arriba» antes de cantarla.',
  },
  {
    id: 'canto-arpegio', cat: 'canto', type: 'pitch', title: 'Arpegio do-mi-sol', minutes: 2, level: 2, xp: 30,
    desc: 'Saltos de nota más grandes: entrena el oído y la flexibilidad de la voz.',
    intervals: [0, 4, 7, 4, 0, 7, 0],
    hold: 2.2,
    tip: 'En los saltos grandes, respira antes y apunta a la nota sin deslizarte.',
  },
  {
    id: 'canto-nota-firme', cat: 'canto', type: 'pitch', title: 'Nota firme', minutes: 2, level: 2, xp: 30,
    desc: 'Sostén cada nota cinco segundos sin que se caiga ni tiemble.',
    intervals: [0, 2, 4],
    hold: 5,
    tip: 'Apoya el aire desde el abdomen. Al final de la nota es cuando más se baja: sostenla.',
  },
  {
    id: 'canto-entonacion', cat: 'canto', type: 'intonation', title: '¿Pregunta o afirmación?', minutes: 3, level: 1, xp: 30,
    desc: 'Di la misma frase como pregunta y como afirmación. La app escucha si tu tono sube o baja al final.',
    items: [
      ['Vienes mañana.', '¿Vienes mañana?'],
      ['Ya terminaste el informe.', '¿Ya terminaste el informe?'],
      ['Llegó el nuevo equipo.', '¿Llegó el nuevo equipo?'],
      ['La reunión es a las nueve.', '¿La reunión es a las nueve?'],
    ],
    tip: 'En español, la pregunta de sí o no sube al final; la afirmación baja. Exagera al principio.',
  },
  {
    id: 'canto-enfasis', cat: 'canto', type: 'read', title: 'Mueve el énfasis', minutes: 3, level: 2, xp: 30,
    desc: 'La misma frase cambia de sentido según la palabra que subes de tono.',
    rounds: [
      { label: 'Énfasis en «Yo»', hint: 'Sube el tono en «Yo»: fue otra persona quien lo dijo.' },
      { label: 'Énfasis en «dije»', hint: 'Sube en «dije»: quizás lo pensé, pero no lo dije.' },
      { label: 'Énfasis en «ella»', hint: 'Sube en «ella»: fue otra persona quien lo rompió.' },
      { label: 'Énfasis en «vaso»', hint: 'Sube en «vaso»: rompió otra cosa.' },
    ],
    text: 'Yo no dije que ella rompió el vaso.',
  },
  {
    id: 'canto-melodia', cat: 'canto', type: 'read', title: 'Canta y luego habla', minutes: 3, level: 2, xp: 30,
    desc: 'Canta el texto y después dilo conservando la melodía: tu voz hablada gana vida.',
    rounds: [
      { label: 'Cantado en una sola nota', hint: 'Como un canto monótono: todas las sílabas en la misma nota.' },
      { label: 'Cantado con melodía libre', hint: 'Inventa una melodía que suba en las palabras importantes.' },
      { label: 'Hablado con esa melodía', hint: 'Ahora dilo hablando, pero conserva las subidas y bajadas.' },
    ],
    text: 'Buenos días a todos. Hoy quiero contarles una idea sencilla: cuando cambiamos el tono, cambiamos la atención de quien nos escucha.',
  },
  // Muletillas
  {
    id: 'mul-minuto-limpio', cat: 'muletillas', type: 'speak', title: 'Un minuto limpio', minutes: 2, level: 2, xp: 35,
    desc: 'Habla un minuto sin muletillas. El teléfono vibra si aparece una.',
    prompt: 'Habla sobre el mejor consejo que has recibido.',
    prompts: ['Habla sobre el mejor consejo que has recibido.', 'Describe tu día ideal de descanso.', 'Cuenta qué te gusta de tu ciudad.', 'Explica cómo organizas tu semana.', 'Habla de una persona que admiras.'],
    targetSec: 60,
    goal: { metric: 'fillers', max: 1, label: 'Una muletilla o menos' },
  },
  {
    id: 'mul-silencio', cat: 'muletillas', type: 'speak', title: 'Cambia la muletilla por silencio', minutes: 2, level: 1, xp: 30,
    desc: 'Tres preguntas rápidas: cuando sientas un «este», haz una pausa.',
    prompt: 'Responde cada pregunta en unos 20 segundos.',
    targetSec: 60,
    steps: [
      { name: '¿Qué desayunaste hoy?', sec: 20, hint: 'Responde con calma.' },
      { name: '¿Qué te hace sonreír?', sec: 20, hint: 'Pausa en lugar de «este».' },
      { name: '¿Qué aprendiste esta semana?', sec: 20, hint: 'Una idea clara.' },
    ],
    goal: { metric: 'fillers', max: 2, label: 'Dos muletillas o menos' },
  },
  {
    id: 'mul-conectores', cat: 'muletillas', type: 'speak', title: 'Conectores de verdad', minutes: 2, level: 2, xp: 35,
    desc: 'Usa «primero», «además» y «por último» en lugar de «entonces».',
    prompt: 'Da tres consejos para empezar bien la semana.',
    targetSec: 60,
    framework: 'conectores',
  },
  {
    id: 'mul-frases-firmes', cat: 'muletillas', type: 'read', title: 'Frases firmes', minutes: 3, level: 1, xp: 30,
    desc: 'Lee la versión firme de frases que suelen restar fuerza.',
    pairs: [
      ['Creo que podríamos intentar mejorar el proceso.', 'Propongo mejorar el proceso.'],
      ['Solo quería robarles un poquito de su tiempo.', 'Les pido diez minutos.'],
      ['Tal vez sería bueno revisar el presupuesto.', 'Revisemos el presupuesto.'],
      ['No sé si me explico bien.', 'Lo resumo en una frase.'],
      ['Voy a intentar terminarlo el viernes.', 'Lo termino el viernes.'],
    ],
    text: 'Propongo mejorar el proceso. Les pido diez minutos. Revisemos el presupuesto. Lo resumo en una frase. Lo termino el viernes.',
  },
  // Storytelling
  {
    id: 'st-constructor', cat: 'storytelling', type: 'story', title: 'Constructor de historias', minutes: 10, level: 2, xp: 50,
    desc: 'Arma tu relato acto por acto y ensáyalo con el teleprompter.',
  },
  {
    id: 'st-5-actos', cat: 'storytelling', type: 'speak', title: 'Cuenta en 5 actos', minutes: 4, level: 3, xp: 40,
    desc: 'Una historia con gancho, contexto, conflicto, giro y mensaje.',
    prompt: 'Cuenta un momento en que tuviste que tomar una decisión difícil.',
    targetSec: 90,
    framework: 'actos',
    steps: [
      { name: 'Gancho', sec: 10, hint: 'Empieza en el momento clave.' },
      { name: 'Contexto', sec: 20, hint: 'Dónde, quién, qué estaba en juego.' },
      { name: 'Conflicto', sec: 20, hint: 'El obstáculo.' },
      { name: 'Giro', sec: 20, hint: 'Tu decisión.' },
      { name: 'Mensaje', sec: 20, hint: 'Qué aprendiste.' },
    ],
  },
  {
    id: 'st-sentidos', cat: 'storytelling', type: 'speak', title: 'Detalles con los sentidos', minutes: 3, level: 2, xp: 35,
    desc: 'Describe una escena con vista, oído, olfato y tacto.',
    prompt: 'Describe la cocina de tu infancia.',
    targetSec: 60,
    framework: 'sentidos',
  },
  {
    id: 'st-abt', cat: 'storytelling', type: 'speak', title: 'Y, pero, por lo tanto', minutes: 3, level: 1, xp: 35,
    desc: 'La estructura más corta para contar cualquier cambio.',
    prompt: 'Cuenta un cambio en tu trabajo: cómo era, qué pasó y cómo quedó.',
    targetSec: 45,
    framework: 'abt',
  },
  // Improvisación
  { id: 'imp-tema', cat: 'improvisacion', type: 'improv', mode: 'tema', title: 'Tema al azar', minutes: 2, level: 2, xp: 40, desc: '15 segundos para pensar y un minuto para hablar.' },
  { id: 'imp-palabra', cat: 'improvisacion', type: 'improv', mode: 'palabra', title: 'Palabra al azar', minutes: 2, level: 2, xp: 40, desc: 'Arma una historia de 30 segundos alrededor de una palabra.' },
  { id: 'imp-objeto', cat: 'improvisacion', type: 'improv', mode: 'objeto', title: 'Vende el objeto', minutes: 2, level: 1, xp: 40, desc: 'Toma lo que tengas cerca y véndelo en un minuto.' },
  // Lenguaje corporal
  {
    id: 'cue-postura', cat: 'corporal', type: 'guided', title: 'Postura de poder', minutes: 2, level: 1, xp: 15,
    desc: 'Dos minutos para entrar a cualquier sala con presencia.',
    steps: [
      { name: 'Pies firmes', sec: 20, hint: 'Separa los pies al ancho de los hombros y reparte el peso.' },
      { name: 'Rodillas sueltas', sec: 10, hint: 'No bloquees las rodillas.' },
      { name: 'Hombros abajo', sec: 15, hint: 'Súbelos, llévalos atrás y déjalos caer.' },
      { name: 'Cabeza alta', sec: 15, hint: 'Mentón paralelo al suelo, mirada al frente.' },
      { name: 'Respira lento', sec: 40, hint: 'Cuatro respiraciones lentas, sin mover los hombros.' },
      { name: 'Voz de apertura', sec: 20, hint: 'Di en voz alta: «Buenos días, gracias por estar aquí».' },
    ],
    mirror: true,
  },
  {
    id: 'cue-mirada', cat: 'corporal', type: 'guided', title: 'La técnica del faro', minutes: 2, level: 2, xp: 15,
    desc: 'Reparte la mirada: una frase, una persona.',
    steps: [
      { name: 'Imagina tu público', sec: 15, hint: 'Ubica tres personas: izquierda, centro y derecha.' },
      { name: 'Una frase, una persona', sec: 30, hint: 'Di una frase completa mirando a la persona de la izquierda.' },
      { name: 'Cambia en la pausa', sec: 30, hint: 'Pausa y pasa al centro. Otra frase completa.' },
      { name: 'Cierra con todos', sec: 30, hint: 'Termina mirando al centro del salón.' },
      { name: 'Repite', sec: 15, hint: 'Haz el recorrido otra vez, más lento.' },
    ],
    mirror: true,
  },
  {
    id: 'cue-gestos', cat: 'corporal', type: 'guided', title: 'Gestos abiertos', minutes: 2, level: 1, xp: 15,
    desc: 'Manos que acompañan y ordenan tu mensaje.',
    steps: [
      { name: 'Zona neutra', sec: 15, hint: 'Manos a la altura del ombligo, visibles y relajadas.' },
      { name: 'Enumera', sec: 25, hint: 'Di tres ideas marcando uno, dos y tres con los dedos.' },
      { name: 'Gesto abierto', sec: 25, hint: 'Abre las palmas al invitar: «Los invito a…».' },
      { name: 'Tamaño', sec: 25, hint: 'Muestra algo grande y algo pequeño con las manos.' },
      { name: 'Quietud', sec: 20, hint: 'Termina una frase con las manos quietas: la quietud da autoridad.' },
    ],
    mirror: true,
  },
];

export const exerciseById = (id) => EXERCISES.find((e) => e.id === id);
export const categoryById = (id) => CATEGORIES.find((c) => c.id === id);
export const exercisesIn = (cat) => EXERCISES.filter((e) => e.cat === cat);
