// Voz modelo (síntesis del navegador) para escuchar cómo suena un texto.

let cached = [];

export function loadVoices() {
  return new Promise((resolve) => {
    if (typeof speechSynthesis === 'undefined') { resolve([]); return; }
    const got = speechSynthesis.getVoices();
    if (got.length) { cached = got; resolve(got); return; }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      cached = speechSynthesis.getVoices();
      resolve(cached);
    };
    speechSynthesis.addEventListener?.('voiceschanged', finish, { once: true });
    setTimeout(finish, 1200);
  });
}

const PREF = ['es-DO', 'es-US', 'es-MX', 'es-419', 'es-CO', 'es-PR', 'es-ES'];

export function spanishVoices() {
  const list = cached.filter((v) => /^es([-_]|$)/i.test(v.lang));
  const rank = (v) => {
    const lang = v.lang.replace('_', '-');
    const i = PREF.findIndex((p) => lang.toLowerCase() === p.toLowerCase());
    return (i < 0 ? 50 : i) + (v.localService ? 0 : 0.5);
  };
  return list.sort((a, b) => rank(a) - rank(b));
}

export function pickVoice(uri) {
  const list = spanishVoices();
  return (uri && list.find((v) => v.voiceURI === uri)) || list[0] || null;
}

export function speak(text, { rate = 1, voiceURI = null, onEnd = null, onBoundary = null } = {}) {
  if (typeof speechSynthesis === 'undefined') { onEnd && onEnd(); return () => {}; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice(voiceURI);
  if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'es-ES';
  u.rate = rate;
  u.pitch = 1;
  if (onEnd) { u.onend = onEnd; u.onerror = onEnd; }
  if (onBoundary) u.onboundary = onBoundary;
  speechSynthesis.speak(u);
  return () => { try { speechSynthesis.cancel(); } catch { /* ignorar */ } };
}

export function stopSpeaking() {
  try { speechSynthesis.cancel(); } catch { /* ignorar */ }
}
