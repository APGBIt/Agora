// Qué permite este navegador y este lugar (app propia, archivo local o vista dentro de Claude).

function detect() {
  if (typeof window === 'undefined') return { ssr: true };
  const ua = navigator.userAgent || '';
  const isIOS = /iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  let framed = false;
  try { framed = window.self !== window.top; } catch { framed = true; }
  let standalone = false;
  try { standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch { /* sin soporte */ }
  const secure = !!window.isSecureContext;
  let micPolicy = true;
  try {
    const pol = document.permissionsPolicy || document.featurePolicy;
    if (pol && typeof pol.allowsFeature === 'function') micPolicy = pol.allowsFeature('microphone');
  } catch { /* sin soporte */ }
  const hasGUM = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const hasSR = !!SR && !(isIOS && standalone);
  const inClaude = framed && typeof window.claude === 'object' && window.claude !== null;
  const fileProtocol = location.protocol === 'file:';
  return {
    isIOS,
    isAndroid,
    framed,
    standalone,
    secure,
    micPolicy,
    hasGUM,
    hasSR,
    hasTTS: 'speechSynthesis' in window,
    hasMR: typeof window.MediaRecorder !== 'undefined',
    canVibrate: typeof navigator.vibrate === 'function' && !isIOS,
    micLikely: secure && hasGUM && micPolicy,
    inClaude,
    fileProtocol,
    canInstall: !framed && !fileProtocol && secure && 'serviceWorker' in navigator,
  };
}

export const env = detect();

// Se actualiza si el micrófono falla al pedirlo (por ejemplo, bloqueado por la vista de Claude).
export function markMicBlocked() {
  env.micLikely = false;
  env.micBlocked = true;
}

export function vibrate(pattern) {
  try {
    if (env.canVibrate) navigator.vibrate(pattern);
  } catch { /* ignorar */ }
}
