// Ágora · análisis del texto transcrito (español, con muletillas frecuentes del Caribe).
// Muletillas, palabras que restan fuerza, repeticiones, estructura y versión más limpia.

export function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ¿?¡!\s'-]/g, ' ');
}

const WORD_RE = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

// Convierte los segmentos del reconocedor en fichas con su frase y tiempo estimado.
export function tokenize(segments) {
  const tokens = [];
  segments.forEach((seg, si) => {
    const text = seg.text || '';
    const words = [];
    let m;
    WORD_RE.lastIndex = 0;
    while ((m = WORD_RE.exec(text))) words.push({ w: m[0], idx: m.index });
    const q = /\?/.test(text);
    const dur = Math.max(0.2, (seg.tEnd ?? 0) - (seg.tStart ?? 0));
    words.forEach((x, k) => {
      tokens.push({
        w: x.w,
        n: norm(x.w).replace(/[¿?¡!\s]/g, ''),
        seg: si,
        pos: k,
        last: k === words.length - 1,
        segQ: q,
        t: (seg.tStart ?? 0) + (dur * (k + 0.5)) / Math.max(1, words.length),
      });
    });
  });
  return tokens;
}

const FUNCTION_AFTER_ESTE = new Set(
  (
    'el la los las lo un una unos unas yo tu tú el ella ellos ellas nosotros ustedes usted que en de del al a y e o u pero porque cuando como si me te se le les nos no bueno pues entonces eh este mi mis su sus hay habia tenemos tengo vamos ya tambien mira digamos ' +
    'creo pienso quiero queremos voy estamos estoy hicimos hice necesitamos necesito digo dije decia sabes ahora aqui ahi alli asi nada bien'
  )
    .split(' ')
    .map((w) => norm(w).trim())
    .filter(Boolean),
);

const VOCAL = /^(e+h+|e+m+|eh+m+|m{2,}|hm+|h?mm+|ah+|aa+h*|eee+)$/;

function isSegStart(t) { return t.pos === 0; }

// Devuelve [{i, len, key, label}] con las muletillas encontradas.
export function findFillers(tokens) {
  const out = [];
  const n = tokens.length;
  const at = (i) => (i >= 0 && i < n ? tokens[i] : null);
  const same = (i, j) => at(i) && at(j) && at(i).seg === at(j).seg;
  for (let i = 0; i < n; i++) {
    const t = tokens[i];
    const w = t.n;
    const next = at(i + 1);
    const nextSame = next && next.seg === t.seg ? next.n : null;
    const prevSame = at(i - 1) && at(i - 1).seg === t.seg ? at(i - 1).n : null;
    if (VOCAL.test(w)) { out.push({ i, len: 1, key: 'eh', label: '«eh»' }); continue; }
    if (w === 'este') {
      const legitPron = nextSame && /^(es|fue|era|sera|seria|ha|tiene|dice)$/.test(nextSame);
      if (t.last || (nextSame && FUNCTION_AFTER_ESTE.has(nextSame) && !legitPron) || nextSame === 'este') {
        out.push({ i, len: 1, key: 'este', label: '«este»' });
      }
      continue;
    }
    if (w === 'o' && nextSame === 'sea') { out.push({ i, len: 2, key: 'o sea', label: '«o sea»' }); i++; continue; }
    if (w === 'verdad') {
      const prev = prevSame;
      if (prev === 'de') continue;
      if (prev === 'la' && isSegStart(at(i - 1))) { out.push({ i: i - 1, len: 2, key: 'la verdad', label: '«la verdad»' }); continue; }
      if (t.last || (nextSame === 'que' && at(i + 2)?.n === 'no')) { out.push({ i, len: 1, key: 'verdad', label: '«¿verdad?»' }); }
      continue;
    }
    if ((w === 'tu' || w === 'usted') && (nextSame === 'sabes' || nextSame === 'sabe')) {
      out.push({ i, len: 2, key: 'tú sabes', label: w === 'usted' ? '«usted sabe»' : '«tú sabes»' });
      i++;
      continue;
    }
    if (w === 'sabes' && (t.last) && prevSame !== 'tu') { out.push({ i, len: 1, key: 'tú sabes', label: '«¿sabes?»' }); continue; }
    if (w === 'me' && (nextSame === 'entiendes' || nextSame === 'explico' || nextSame === 'entienden')) {
      out.push({ i, len: 2, key: 'me entiendes', label: '«¿me entiendes?»' });
      i++;
      continue;
    }
    if (isSegStart(t) && (w === 'bueno' || w === 'pues' || w === 'mira' || w === 'mire' || w === 'oye' || w === 'ok' || w === 'okey' || w === 'okay' || w === 'vale')) {
      if (next && next.seg === t.seg) out.push({ i, len: 1, key: w === 'mire' ? 'mira' : w === 'okey' || w === 'okay' || w === 'vale' ? 'ok' : w, label: `«${t.w.toLowerCase()}»` });
      continue;
    }
    if (w === 'entonces' && isSegStart(t)) { out.push({ i, len: 1, key: 'entonces', label: '«entonces»', weak: true }); continue; }
    if (w === 'digamos') { out.push({ i, len: 1, key: 'digamos', label: '«digamos»' }); continue; }
    if (w === 'como' && nextSame === 'que' && prevSame !== 'tan' && prevSame !== 'asi' && prevSame !== 'tanto') {
      const after = at(i + 2);
      if (after && after.seg === t.seg && !/^(no|si)$/.test(after.n)) { out.push({ i, len: 2, key: 'como que', label: '«como que»' }); i++; }
      continue;
    }
    if (w === 'tipo' && (isSegStart(t) || nextSame === 'que' || nextSame === 'como')) { out.push({ i, len: 1, key: 'tipo', label: '«tipo»' }); continue; }
    if (w === 'basicamente' || w === 'literalmente' || w === 'obviamente') { out.push({ i, len: 1, key: w, label: `«${t.w.toLowerCase()}»` }); continue; }
    if (w === 'en' && nextSame === 'plan') { out.push({ i, len: 2, key: 'en plan', label: '«en plan»' }); i++; continue; }
    if (w === 'y' && nextSame === 'nada' && at(i + 1).last) { out.push({ i, len: 2, key: 'y nada', label: '«y nada»' }); i++; continue; }
    if (w === 'nada' && isSegStart(t) && nextSame === 'que') { out.push({ i, len: 1, key: 'nada', label: '«nada»' }); continue; }
  }
  // «entonces» al inicio solo cuenta si se repite (≥ 3 veces)
  const ent = out.filter((f) => f.key === 'entonces');
  return ent.length >= 3 ? out : out.filter((f) => f.key !== 'entonces');
}

const WEAK = [
  { seq: ['creo', 'que'], key: 'creo que', tip: 'Afirma tu idea sin «creo que».' },
  { seq: ['me', 'parece', 'que'], key: 'me parece que', tip: 'Di tu idea como una afirmación.' },
  { seq: ['pienso', 'que'], key: 'pienso que', tip: 'Afirma directamente.' },
  { seq: ['tal', 'vez'], key: 'tal vez', tip: 'Si tienes certeza, no lo suavices.' },
  { seq: ['quizas'], key: 'quizás', tip: 'Si tienes certeza, no lo suavices.' },
  { seq: ['quiza'], key: 'quizá', tip: 'Si tienes certeza, no lo suavices.' },
  { seq: ['a', 'lo', 'mejor'], key: 'a lo mejor', tip: 'Cámbialo por una propuesta concreta.' },
  { seq: ['puede', 'que'], key: 'puede que', tip: 'Afirma lo que sabes.' },
  { seq: ['un', 'poquito'], key: 'un poquito', tip: 'No minimices lo que pides.' },
  { seq: ['poquito'], key: 'poquito', tip: 'No minimices lo que pides.' },
  { seq: ['un', 'poco'], key: 'un poco', tip: 'Precisa: di cuánto.' },
  { seq: ['mas', 'o', 'menos'], key: 'más o menos', tip: 'Da el dato exacto.' },
  { seq: ['algo', 'asi'], key: 'algo así', tip: 'Precisa la idea.' },
  { seq: ['de', 'alguna', 'manera'], key: 'de alguna manera', tip: 'Explica cómo, concretamente.' },
  { seq: ['de', 'cierta', 'forma'], key: 'de cierta forma', tip: 'Explica cómo, concretamente.' },
  { seq: ['en', 'cierto', 'modo'], key: 'en cierto modo', tip: 'Explica cómo, concretamente.' },
  { seq: ['supongo'], key: 'supongo', tip: 'Afirma lo que sabes.' },
  { seq: ['intentare'], key: 'intentaré', tip: 'Compromete: «lo haré».' },
  { seq: ['tratare', 'de'], key: 'trataré de', tip: 'Compromete: «lo haré».' },
  { seq: ['voy', 'a', 'intentar'], key: 'voy a intentar', tip: 'Compromete: «voy a…».' },
  { seq: ['voy', 'a', 'tratar'], key: 'voy a tratar', tip: 'Compromete: «voy a…».' },
  { seq: ['solo', 'queria'], key: 'solo quería', tip: 'Ve directo a lo que quieres.' },
  { seq: ['solamente', 'queria'], key: 'solamente quería', tip: 'Ve directo a lo que quieres.' },
  { seq: ['nada', 'mas', 'queria'], key: 'nada más quería', tip: 'Ve directo a lo que quieres.' },
  { seq: ['perdon'], key: 'perdón', tip: 'No te disculpes por hablar.' },
  { seq: ['disculpen'], key: 'disculpen', tip: 'No te disculpes por hablar.' },
  { seq: ['disculpe'], key: 'disculpe', tip: 'No te disculpes por hablar.' },
  { seq: ['lo', 'siento'], key: 'lo siento', tip: 'Reserva la disculpa para cuando haya error.' },
  { seq: ['robarle'], key: 'robarle', tip: 'Pide el tiempo con claridad: «Le pido 15 minutos».' },
  { seq: ['si', 'no', 'es', 'mucha', 'molestia'], key: 'si no es mucha molestia', tip: 'Pide con amabilidad y firmeza.' },
];

export function findWeak(tokens) {
  const out = [];
  const n = tokens.length;
  for (let i = 0; i < n; i++) {
    for (const wk of WEAK) {
      const L = wk.seq.length;
      if (i + L > n) continue;
      let ok = true;
      for (let k = 0; k < L; k++) {
        if (tokens[i + k].n !== wk.seq[k] || tokens[i + k].seg !== tokens[i].seg) { ok = false; break; }
      }
      if (!ok) continue;
      if (wk.key === 'un poco') {
        const after = tokens[i + 2];
        if (after && after.seg === tokens[i].seg && after.n === 'de') { ok = false; }
      }
      if (ok) { out.push({ i, len: L, key: wk.key, tip: wk.tip }); i += L - 1; break; }
    }
    // «no sé» como duda (no «no se puede»)
    if (tokens[i]?.n === 'no' && tokens[i + 1]?.n === 'se' && tokens[i + 1].seg === tokens[i].seg) {
      const nx = tokens[i + 2];
      if (!nx || nx.seg !== tokens[i].seg || /^(si|que|como|cuanto|bien|exactamente)$/.test(nx.n)) {
        out.push({ i, len: 2, key: 'no sé', tip: 'Si dudas, di qué sí sabes.' });
        i += 1;
      }
    }
  }
  return out;
}

export function findRepetitions(tokens, fillers) {
  const skip = new Set();
  for (const f of fillers) for (let k = 0; k < f.len; k++) skip.add(f.i + k);
  const out = [];
  for (let i = 1; i < tokens.length; i++) {
    const a = tokens[i - 1];
    const b = tokens[i];
    if (a.seg !== b.seg || skip.has(i) || skip.has(i - 1)) continue;
    if (a.n === b.n && a.n.length >= 2 && !/^\d+$/.test(a.n) && a.n !== 'muy') out.push({ i, len: 1, key: a.n });
  }
  return out;
}

export function countBy(list) {
  const m = {};
  for (const x of list) m[x.key] = (m[x.key] || 0) + 1;
  return Object.entries(m)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({ key, count }));
}

export function lexicalAnalysis(segments) {
  const tokens = tokenize(segments);
  const fillers = findFillers(tokens);
  const weak = findWeak(tokens);
  const reps = findRepetitions(tokens, fillers);
  const vocal = fillers.filter((f) => f.key === 'eh').length;
  const words = tokens.filter((t) => !VOCAL.test(t.n)).length;
  const confs = segments.map((s) => s.conf).filter((c) => typeof c === 'number' && c > 0);
  return {
    tokens,
    words,
    fillers,
    fillerCounts: countBy(fillers),
    vocalFillers: vocal,
    weak,
    weakCounts: countBy(weak),
    repetitions: reps,
    confidence: confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : null,
  };
}

// ---------- Estructura (marcos para retos y simulador) ----------

const P = (arr) => arr.map((s) => norm(s).trim());

export const FRAMEWORKS = {
  elevator: {
    name: 'Elevador',
    parts: [
      { key: 'gancho', label: 'Gancho', hint: 'Abre con una pregunta o un dato.', kw: P(['sabias', 'sabia usted', 'imagine', 'imagina', 'que pasaria', 'cuantas veces', 'por ciento', 'la mitad', 'cada dia', 'cada año']), q: true, early: true },
      { key: 'problema', label: 'Problema', hint: 'Di qué duele hoy y a quién.', kw: P(['problema', 'dificultad', 'retraso', 'retrasos', 'cuesta', 'pierde', 'perdemos', 'falta', 'nadie encuentra', 'no encuentra', 'tarda', 'demora', 'se complica', 'reto']) },
      { key: 'propuesta', label: 'Tu propuesta', hint: 'Qué haces distinto, en una frase.', kw: P(['propongo', 'proponemos', 'creamos', 'creé', 'solucion', 'ofrecemos', 'desarrollamos', 'diseñamos', 'hicimos', 'nuestro portal', 'nuestra propuesta', 'la idea es', 'permite']) },
      { key: 'llamado', label: 'Llamado a la acción', hint: 'Pide un paso concreto.', kw: P(['le pido', 'te pido', 'les pido', 'me gustaria', 'podemos reunirnos', 'agendar', 'reunion', 'cita', 'aprobar', 'le parece', 'te parece', 'esta semana', 'el jueves', 'el lunes', 'el martes', 'el miercoles', 'el viernes', 'minutos']), late: true },
    ],
  },
  prep: {
    name: 'PREP',
    parts: [
      { key: 'punto', label: 'Punto', hint: 'Di tu postura en la primera frase.', kw: P(['creo', 'pienso', 'considero', 'opino', 'mi postura', 'defiendo', 'deberiamos', 'deberia', 'es importante', 'estoy convencida', 'estoy convencido', 'para mi', 'yo cambiaria', 'cambiaria']), early: true },
      { key: 'razon', label: 'Razón', hint: 'Explica el porqué.', kw: P(['porque', 'ya que', 'debido', 'la razon', 'puesto que', 'el motivo']) },
      { key: 'ejemplo', label: 'Ejemplo', hint: 'Da un caso concreto.', kw: P(['por ejemplo', 'como cuando', 'una vez', 'recuerdo', 'imagina', 'un caso', 'la semana pasada', 'el año pasado', 'ayer']) },
      { key: 'cierre', label: 'Punto', hint: 'Repite tu postura al final.', kw: P(['por eso', 'en resumen', 'en conclusion', 'asi que', 'por lo tanto', 'por esa razon', 'en definitiva', 'concluyo']), late: true },
    ],
  },
  star: {
    name: 'STAR',
    parts: [
      { key: 'situacion', label: 'Situación', hint: 'Pon el contexto: cuándo y dónde.', kw: P(['el año pasado', 'hace', 'cuando', 'en mi trabajo', 'en ese momento', 'trabajaba', 'estaba', 'en mi area', 'en mi equipo', 'en la empresa', 'una vez']) },
      { key: 'tarea', label: 'Tarea', hint: 'Di cuál era tu responsabilidad.', kw: P(['tenia que', 'mi responsabilidad', 'el objetivo era', 'necesitabamos', 'me pidieron', 'debia', 'mi tarea', 'me tocaba', 'teniamos que', 'el reto era']) },
      { key: 'accion', label: 'Acción', hint: 'Cuenta qué hiciste tú, en primera persona.', kw: P(['propuse', 'organice', 'hable', 'decidi', 'hice', 'cree', 'coordine', 'prepare', 'presente', 'implemente', 'negocie', 'convenci', 'escuche', 'reuni', 'diseñe', 'lidere', 'explique', 'pedi', 'analice', 'lo que hice', 'yo me', 'arme']) },
      { key: 'resultado', label: 'Resultado', hint: 'Termina con el resultado, idealmente medible.', kw: P(['logramos', 'logre', 'conseguimos', 'consegui', 'resultado', 'al final', 'se redujo', 'redujimos', 'aumento', 'aumentamos', 'por ciento', 'gracias a eso', 'aprendi', 'termino', 'mejoro', 'mejoramos', 'aprobaron']) },
    ],
  },
  ppbp: {
    name: 'Propuesta',
    parts: [
      { key: 'problema', label: 'Problema', hint: 'Empieza por el problema que ves.', kw: P(['problema', 'hoy', 'actualmente', 'perdemos', 'retraso', 'cuesta', 'dificultad', 'falta', 'nos pasa']) },
      { key: 'propuesta', label: 'Propuesta', hint: 'Di qué propones.', kw: P(['propongo', 'mi propuesta', 'quiero proponer', 'podriamos', 'la idea es', 'sugiero', 'planteo']) },
      { key: 'beneficio', label: 'Beneficio', hint: 'Qué gana la organización.', kw: P(['beneficio', 'ahorro', 'ahorrariamos', 'reduciria', 'mejoraria', 'ganariamos', 'permitira', 'permitiria', 'por ciento', 'menos tiempo', 'mas rapido']) },
      { key: 'peticion', label: 'Petición', hint: 'Pide algo concreto.', kw: P(['necesito', 'le pido', 'te pido', 'aprobacion', 'autorice', 'apruebe', 'presupuesto', 'su apoyo', 'tu apoyo', 'que me autorice']), late: true },
    ],
  },
  brindis: {
    name: 'Brindis',
    parts: [
      { key: 'gancho', label: 'Gancho', hint: 'Capta la atención.', kw: P(['buenas noches', 'buenas tardes', 'queridos', 'queridas', 'amigos', 'familia', 'quiero', 'hoy']), early: true },
      { key: 'anecdota', label: 'Anécdota', hint: 'Una historia breve.', kw: P(['recuerdo', 'una vez', 'cuando', 'aquel dia', 'la primera vez', 'nunca olvidare']) },
      { key: 'mensaje', label: 'Mensaje', hint: 'Qué admiras o aprendiste.', kw: P(['aprendi', 'nos enseño', 'me enseño', 'admiro', 'valoro', 'gracias a', 'lo que mas', 'significa']) },
      { key: 'brindis', label: 'Brindis', hint: 'Invita a brindar.', kw: P(['brindemos', 'brindo', 'salud', 'levantemos', 'levanten', 'por ustedes', 'por el equipo', 'copas', 'por ti']), late: true },
    ],
  },
  arp: {
    name: 'Reconocer · Responder · Puente',
    parts: [
      { key: 'reconocer', label: 'Reconocer', hint: 'Valida la pregunta sin ponerte a la defensiva.', kw: P(['entiendo', 'buena pregunta', 'comprendo', 'tiene razon', 'es valido', 'reconozco', 'es cierto', 'gracias por la pregunta']), early: true },
      { key: 'responder', label: 'Responder', hint: 'Responde con un dato o hecho.', minWords: 18 },
      { key: 'puente', label: 'Puente', hint: 'Lleva la conversación a tu mensaje.', kw: P(['lo importante es', 'lo que si', 'lo que quiero destacar', 'lo que puedo decir', 'lo clave', 'por eso', 'lo que nos importa', 'el punto es']), late: true },
    ],
  },
  oeev: {
    name: 'Capacitación',
    parts: [
      { key: 'objetivo', label: 'Objetivo', hint: 'Di qué van a lograr.', kw: P(['objetivo', 'hoy vamos a', 'al final', 'van a aprender', 'aprenderan', 'la meta', 'vamos a ver']), early: true },
      { key: 'explicacion', label: 'Explicación', hint: 'Explica por pasos.', kw: P(['primero', 'segundo', 'paso', 'luego', 'despues', 'consiste', 'finalmente', 'por ultimo']) },
      { key: 'ejemplo', label: 'Ejemplo', hint: 'Aterriza con un caso.', kw: P(['por ejemplo', 'un caso', 'imaginen', 'como cuando', 'supongamos']) },
      { key: 'verificacion', label: 'Verificación', hint: 'Comprueba que quedó claro.', kw: P(['preguntas', 'dudas', 'quedo claro', 'repasemos', 'resumiendo', 'en resumen', 'alguien', 'les queda']), late: true },
    ],
  },
  hipa: {
    name: 'Hecho · Impacto · Petición · Acuerdo',
    parts: [
      { key: 'hecho', label: 'Hecho', hint: 'Describe lo que viste, sin juicios.', kw: P(['esta semana', 'llegaste', 'note', 'observe', 'en la reunion', 'el lunes', 'tres veces', 'ayer', 'he notado', 'vi que']) },
      { key: 'impacto', label: 'Impacto', hint: 'Explica el efecto.', kw: P(['esto hace', 'esto provoca', 'afecta', 'impacto', 'el equipo', 'me preocupa', 'tuvimos que', 'retrasa', 'hace que']) },
      { key: 'peticion', label: 'Petición', hint: 'Pide un cambio concreto.', kw: P(['te pido', 'necesito que', 'me gustaria que', 'a partir de', 'podrias', 'quiero pedirte']) },
      { key: 'acuerdo', label: 'Acuerdo', hint: 'Cierra con un compromiso.', kw: P(['te parece', 'acordamos', 'de acuerdo', 'nos comprometemos', 'revisamos', 'que opinas', 'cuento contigo', 'lo vemos']), late: true },
    ],
  },
  actos: {
    name: 'Arco en 5 actos',
    parts: [
      { key: 'gancho', label: 'Gancho', hint: 'Empieza en el momento clave.', early: true, minWords: 5 },
      { key: 'contexto', label: 'Contexto', hint: 'Quién, dónde, qué estaba en juego.', kw: P(['estaba', 'trabajaba', 'era', 'habia', 'teniamos', 'en ese momento']) },
      { key: 'conflicto', label: 'Conflicto', hint: 'El obstáculo.', kw: P(['pero', 'problema', 'de repente', 'sin embargo', 'no podia', 'no sabia', 'dificil']) },
      { key: 'giro', label: 'Punto de giro', hint: 'La decisión que lo cambió.', kw: P(['entonces decidi', 'decidi', 'fue cuando', 'hasta que', 'me di cuenta', 'descubri', 'entendi']) },
      { key: 'mensaje', label: 'Cierre y mensaje', hint: 'Qué debe recordar tu audiencia.', kw: P(['aprendi', 'desde entonces', 'por eso', 'la leccion', 'hoy se', 'lo que me llevo', 'me enseño']), late: true },
    ],
  },
  abt: {
    name: 'Y · Pero · Por lo tanto',
    parts: [
      { key: 'y', label: 'Y (contexto)', hint: 'Plantea la situación.', minWords: 8, early: true },
      { key: 'pero', label: 'Pero (problema)', hint: 'Introduce la tensión.', kw: P(['pero', 'sin embargo', 'el problema', 'aunque']) },
      { key: 'porlotanto', label: 'Por lo tanto', hint: 'La consecuencia o solución.', kw: P(['por lo tanto', 'asi que', 'por eso', 'entonces', 'por esa razon', 'de modo que']), late: true },
    ],
  },
  sentidos: {
    name: 'Los sentidos',
    parts: [
      { key: 'vista', label: 'Vista', hint: 'Colores, luz, formas.', kw: P(['vi', 'mire', 'brillaba', 'color', 'luz', 'azul', 'verde', 'rojo', 'blanco', 'oscuro', 'se veia']) },
      { key: 'oido', label: 'Oído', hint: 'Sonidos y silencios.', kw: P(['escuche', 'sonaba', 'ruido', 'silencio', 'voz', 'musica', 'se oia', 'sonido']) },
      { key: 'olfato', label: 'Olfato o gusto', hint: 'Olores y sabores.', kw: P(['olia', 'olor', 'aroma', 'perfume', 'sabor', 'sabia', 'dulce', 'salado', 'cafe']) },
      { key: 'tacto', label: 'Tacto', hint: 'Temperatura y texturas.', kw: P(['frio', 'calor', 'suave', 'aspero', 'sentia', 'brisa', 'humedo', 'caliente']) },
    ],
  },
  conectores: {
    name: 'Conectores',
    parts: [
      { key: 'primero', label: 'Primero', hint: 'Abre con «primero» o «para empezar».', kw: P(['primero', 'para empezar', 'en primer lugar']) },
      { key: 'ademas', label: 'Además', hint: 'Suma con «además» o «también».', kw: P(['ademas', 'tambien', 'en segundo lugar', 'por otro lado']) },
      { key: 'ejemplo', label: 'Por ejemplo', hint: 'Aterriza con un ejemplo.', kw: P(['por ejemplo', 'un caso']) },
      { key: 'final', label: 'Por último', hint: 'Cierra con «por último» o «en resumen».', kw: P(['por ultimo', 'en resumen', 'finalmente', 'para cerrar', 'en conclusion']), late: true },
    ],
  },
};

// Cobertura de un marco a partir del texto transcrito.
export function structureCoverage(frameworkKey, tokens) {
  const fw = FRAMEWORKS[frameworkKey];
  if (!fw) return null;
  const text = ' ' + tokens.map((t) => t.n).join(' ') + ' ';
  const total = tokens.length;
  const Q_START = new Set(['que', 'como', 'cuantos', 'cuantas', 'cuanto', 'sabias', 'sabia', 'saben', 'cuando', 'donde', 'quien', 'imaginen', 'imagina', 'imagine', 'alguna', 'has', 'han', 'por']);
  const hasQuestion = tokens.some((t) => t.segQ && t.seg <= 1) || tokens.some((t) => t.pos === 0 && t.seg <= 1 && Q_START.has(t.n));
  const parts = fw.parts.map((p) => {
    let hit = false;
    let at = null;
    if (p.kw) {
      for (const k of p.kw) {
        const idx = text.indexOf(' ' + k + ' ');
        if (idx >= 0) {
          const pos = text.slice(0, idx).split(' ').filter(Boolean).length;
          if (p.early && pos > Math.max(25, total * 0.4)) continue;
          if (p.late && pos < total * 0.35) continue;
          hit = true;
          at = at == null ? pos : Math.min(at, pos);
        }
      }
    }
    if (!hit && p.q && hasQuestion) { hit = true; at = 0; }
    if (!hit && p.minWords && total >= p.minWords) {
      if (p.key === 'responder') hit = total >= p.minWords;
      else if (p.early) { hit = true; at = 0; }
      else if (p.key === 'y') { hit = true; at = 0; }
    }
    return { key: p.key, label: p.label, hint: p.hint, hit, at };
  });
  const covered = parts.filter((p) => p.hit).length;
  return { key: frameworkKey, name: fw.name, parts, covered, ratio: covered / parts.length };
}

// ---------- Versión más limpia (sin IA) ----------

export function cleanVersion(segments, tokens, fillers, weak, reps) {
  const drop = new Set();
  for (const f of fillers) for (let k = 0; k < f.len; k++) drop.add(f.i + k);
  for (const w of weak) {
    if (['perdón', 'disculpen', 'disculpe', 'lo siento', 'no sé', 'robarle', 'si no es mucha molestia'].includes(w.key)) continue;
    for (let k = 0; k < w.len; k++) drop.add(w.i + k);
  }
  for (const r of reps) drop.add(r.i);
  const bySeg = new Map();
  tokens.forEach((t, i) => {
    if (drop.has(i)) return;
    if (!bySeg.has(t.seg)) bySeg.set(t.seg, []);
    bySeg.get(t.seg).push(t.w);
  });
  const sentences = [];
  for (const [si, words] of bySeg) {
    if (!words.length) continue;
    let s = words.join(' ');
    s = s.charAt(0).toUpperCase() + s.slice(1);
    const q = /\?/.test(segments[si]?.text || '');
    if (q) s = (s.startsWith('¿') ? '' : '¿') + s.replace(/[.?]+$/, '') + '?';
    else if (!/[.!?]$/.test(s)) s += '.';
    sentences.push(s);
  }
  return { text: sentences.join(' '), removed: drop.size };
}

// ---------- Alineación de palabras (trabalenguas y teleprompter) ----------

export function lev(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = new Array(n + 1);
  let cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}

export function similarity(a, b) {
  if (!a && !b) return 1;
  return 1 - lev(a, b) / Math.max(a.length, b.length);
}

export function words(text) {
  const out = [];
  let m;
  WORD_RE.lastIndex = 0;
  while ((m = WORD_RE.exec(text))) out.push({ w: m[0], n: norm(m[0]).replace(/[¿?¡!\s]/g, '') });
  return out;
}

// Alinea las palabras esperadas con las oídas. Devuelve estado por palabra esperada.
export function alignWords(target, heard) {
  const T = target.length;
  const H = heard.length;
  const GAP = -1;
  const score = (i, j) => {
    const s = similarity(target[i].n, heard[j].n);
    return s >= 0.85 ? 2 : s >= 0.5 ? 1 : -1;
  };
  const dp = Array.from({ length: T + 1 }, () => new Float32Array(H + 1));
  const bt = Array.from({ length: T + 1 }, () => new Uint8Array(H + 1));
  for (let i = 1; i <= T; i++) { dp[i][0] = i * GAP; bt[i][0] = 1; }
  for (let j = 1; j <= H; j++) { dp[0][j] = j * GAP; bt[0][j] = 2; }
  for (let i = 1; i <= T; i++) {
    for (let j = 1; j <= H; j++) {
      const d = dp[i - 1][j - 1] + score(i - 1, j - 1);
      const u = dp[i - 1][j] + GAP;
      const l = dp[i][j - 1] + GAP;
      if (d >= u && d >= l) { dp[i][j] = d; bt[i][j] = 0; }
      else if (u >= l) { dp[i][j] = u; bt[i][j] = 1; }
      else { dp[i][j] = l; bt[i][j] = 2; }
    }
  }
  const res = target.map((t) => ({ w: t.w, n: t.n, heard: null, sim: 0, status: 'repite' }));
  let i = T;
  let j = H;
  while (i > 0 || j > 0) {
    const b = bt[i][j];
    if (i > 0 && j > 0 && b === 0) {
      const s = similarity(target[i - 1].n, heard[j - 1].n);
      res[i - 1].heard = heard[j - 1].w;
      res[i - 1].sim = s;
      res[i - 1].status = s >= 0.85 ? 'ok' : s >= 0.5 ? 'casi' : 'repite';
      i--; j--;
    } else if (i > 0 && (j === 0 || b === 1)) {
      i--;
    } else {
      j--;
    }
  }
  const pts = res.reduce((s, r) => s + (r.status === 'ok' ? 1 : r.status === 'casi' ? 0.5 : 0), 0);
  return { words: res, accuracy: T ? pts / T : 0 };
}

// Posición actual en un guion a partir de las últimas palabras oídas (teleprompter).
export function scriptPosition(script, heard, from = 0) {
  if (!heard.length) return from;
  const tail = heard.slice(-4);
  let best = from;
  let bestScore = -Infinity;
  const lo = Math.max(0, from - 4);
  const hi = Math.min(script.length - 1, from + 30);
  for (let p = lo; p <= hi; p++) {
    let s = 0;
    for (let k = 0; k < tail.length; k++) {
      const idx = p - (tail.length - 1 - k);
      if (idx < 0) continue;
      s += similarity(script[idx].n, tail[k].n);
    }
    s -= Math.abs(p - from) * 0.01;
    if (s > bestScore) { bestScore = s; best = p; }
  }
  return bestScore >= tail.length * 0.55 ? Math.max(from, best + 1) : from;
}
