// Datos de la sesión actual que NO se guardan: configuración de la grabación, último resultado y audio en memoria.

const mem = {
  recConfig: null,
  lastResult: null,
  audioUrl: null,
  audioBlob: null,
  resultRegistered: false,
  toastQueue: [],
};

export function setRecConfig(cfg) { mem.recConfig = cfg; }
export function getRecConfig() { return mem.recConfig; }

export function setLastResult(result, blob) {
  discardAudio();
  mem.lastResult = result;
  mem.resultRegistered = false;
  if (blob) {
    mem.audioBlob = blob;
    try { mem.audioUrl = URL.createObjectURL(blob); } catch { mem.audioUrl = null; }
  }
}

export function getLastResult() { return mem.lastResult; }
export function getAudioUrl() { return mem.audioUrl; }

export function markRegistered() { mem.resultRegistered = true; }
export function isRegistered() { return mem.resultRegistered; }

// Borra el audio y la transcripción de la memoria.
export function discardAudio() {
  if (mem.audioUrl) { try { URL.revokeObjectURL(mem.audioUrl); } catch { /* */ } }
  mem.audioUrl = null;
  mem.audioBlob = null;
}

export function clearResult() {
  discardAudio();
  if (mem.lastResult) {
    mem.lastResult.transcript = null;
    mem.lastResult.clean = null;
  }
  mem.lastResult = null;
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => clearResult());
}
