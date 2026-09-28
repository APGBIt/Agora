// IA opcional: dentro de Claude usa la capacidad «sample»; en tu propia web, una clave de API si la agregas.
// Solo se envía texto (nunca audio), y solo cuando tocas el botón.

let samplePromise = null;

export function claudeSample() {
  if (typeof window === 'undefined' || !window.claude || typeof window.claude.use !== 'function') return Promise.resolve(null);
  if (!samplePromise) samplePromise = Promise.resolve(window.claude.use('sample')).catch(() => null);
  return samplePromise;
}

export async function aiProvider(settings) {
  const sample = await claudeSample();
  if (sample) return { kind: 'claude', sample };
  if (settings && settings.aiKey) return { kind: 'api', key: settings.aiKey, model: settings.aiModel || 'claude-sonnet-5' };
  return null;
}

function parseLoose(text) {
  try { return JSON.parse(text); } catch { /* sigue */ }
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1]); } catch { /* sigue */ } }
  const a = text.indexOf('{');
  const b = text.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(text.slice(a, b + 1)); } catch { /* sigue */ } }
  throw { code: 'invalid_json', message: 'La respuesta no se pudo leer.' };
}

export async function aiJSON(provider, prompt, { tier = 'default', signal } = {}) {
  if (!provider) throw { code: 'no_ai' };
  if (provider.kind === 'claude') {
    return provider.sample.json(prompt, { modelTier: tier, cache: false, signal });
  }
  const model = tier === 'quick' ? 'claude-haiku-4-5-20251001' : provider.model;
  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': provider.key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model, max_tokens: 1200, messages: [{ role: 'user', content: `${prompt}\n\nResponde únicamente con un objeto JSON válido.` }] }),
    });
  } catch (e) {
    if (e && e.name === 'AbortError') throw { code: 'cancelled' };
    throw { code: 'network', message: 'Sin conexión con el servicio de IA.' };
  }
  if (!res.ok) {
    const code = res.status === 401 || res.status === 403 ? 'bad_key' : res.status === 429 ? 'rate_limited' : 'upstream_error';
    throw { code, message: `Error ${res.status}` };
  }
  const data = await res.json();
  const text = (data.content || []).map((c) => c.text || '').join('');
  return parseLoose(text);
}

// Errores que no se arreglan reintentando: se oculta la opción de IA en esta vista.
const PERMANENT = new Set(['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed', 'bad_key']);
export const aiPermanent = (e) => !!(e && PERMANENT.has(e.code));

export function aiErrorText(e) {
  const code = e && e.code;
  if (code === 'cancelled') return '';
  if (code === 'session_expired') return 'Tu sesión de Claude venció. Vuelve a iniciar sesión y prueba otra vez.';
  if (code === 'not_declared' || code === 'capability_disabled' || code === 'capability_removed') return 'La IA no está disponible en esta vista.';
  if (code === 'not_granted') return 'No se dio permiso para usar la IA en esta vista.';
  if (code === 'rate_limited') return 'La IA recibió demasiadas solicitudes. Prueba en un momento.';
  if (code === 'bad_key') return 'La clave de API no es válida. Revísala en Ajustes.';
  if (code === 'network') return 'Sin conexión con el servicio de IA.';
  if (code === 'sampling_disabled') return 'La IA no está disponible para esta cuenta.';
  if (code === 'refused') return 'La IA no pudo responder a este texto.';
  return 'La IA no respondió. Inténtalo de nuevo.';
}

// ---------- Indicaciones ----------

const RULES = 'Eres una coach de oratoria en español (República Dominicana). Tono cálido, directo y profesional. Tutea a la persona.';

export function improvePrompt({ transcript, title, goal, framework }) {
  return `${RULES}
La persona grabó esta práctica: «${title}». ${goal ? `Objetivo: ${goal}.` : ''} ${framework ? `Estructura esperada: ${framework}.` : ''}
Esta es la transcripción automática (puede tener errores de reconocimiento):
"""${transcript.slice(0, 4000)}"""
Reescribe su discurso para que sea más claro, firme y conciso, conservando sus ideas, sus datos y su voz. Quita muletillas y frases que restan fuerza. Si falta un cierre con una petición o idea final, agrégalo de forma breve.
Devuelve JSON: {"version": "texto mejorado, máximo 120 palabras", "cambios": ["qué cambiaste y por qué, en una frase", "…"]} con 2 o 3 cambios.`;
}

export function interviewerPrompt({ scenario, fwName, fwParts, history, answer, coverage, turn, maxTurns }) {
  const conv = history.map((h) => `${h.role === 'ai' ? scenario.persona.name : 'Persona'}: ${h.text}`).join('\n').slice(-3500);
  const missing = coverage ? coverage.parts.filter((p) => !p.hit).map((p) => p.label) : [];
  return `${RULES}
Actúas como ${scenario.persona.name}, ${scenario.persona.role}. Rasgos: ${scenario.persona.traits.join(', ')}. ${scenario.persona.formal ? 'Trata de usted.' : 'Trata de tú.'}
Escenario: ${scenario.title}. La persona practica la estructura ${fwName} (${fwParts.join(', ')}).
Conversación hasta ahora:
${conv}
Última respuesta de la persona (transcripción automática): "${answer.slice(0, 1500)}"
${missing.length ? `Partes de la estructura que no se detectaron: ${missing.join(', ')}.` : 'La respuesta cubrió la estructura.'}
Turno ${turn} de ${maxTurns}. ${turn >= maxTurns ? 'Este es el último turno: despídete brevemente.' : 'Si falta una parte importante, repregunta por ella; si no, pasa a una pregunta nueva y realista del escenario.'}
Devuelve JSON: {"reaccion": "reacción breve en personaje, máximo 8 palabras", "pregunta": "tu siguiente intervención en personaje, máximo 30 palabras", "consejo": "un consejo de coach sobre la última respuesta, máximo 20 palabras", "fin": ${turn >= maxTurns ? 'true' : 'false'}}`;
}

export function storyPrompt({ title, audience, template, acts }) {
  const body = acts.map((a) => `${a.label}: ${a.text || '(vacío)'}`).join('\n');
  return `${RULES}
La persona está construyendo una historia para contarla en voz alta. Título: «${title || 'sin título'}». Audiencia: ${audience || 'no indicada'}. Estructura: ${template}.
${body}
Da sugerencias concretas para mejorarla al contarla en voz alta: detalles sensoriales, tensión, una frase de cierre memorable. No reescribas todo.
Devuelve JSON: {"general": "una observación general, máximo 30 palabras", "actos": {${acts.map((a) => `"${a.key}": "sugerencia para ${a.label}, máximo 25 palabras"`).join(', ')}}, "cierre": "una propuesta de frase final, máximo 20 palabras"}`;
}
