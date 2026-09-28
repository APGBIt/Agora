import { useEffect, useState } from 'preact/hooks';
import { useApp, update, exportData, importData, resetAll, storage, applyTheme } from '../app/store.js';
import { DAILY_GOALS } from '../content/meta.js';
import { loadVoices, spanishVoices, speak } from '../speech/tts.js';
import { localStatus, installLocal } from '../speech/asr.js';
import { aiProvider, claudeSample } from '../ai/ai.js';
import { setRecConfig } from '../app/session.js';
import { env } from '../app/env.js';
import { go } from '../app/router.js';
import { Icon } from '../ui/icons.jsx';
import { TopBar, Seg, Sheet, toast } from '../ui/kit.jsx';
import { diagnosticConfig } from './configs.js';
import { localLangCache } from './asrCache.js';
import { installState, promptInstall } from '../app/pwa.js';

const inClaudeView = () => !!(window.claude && typeof window.claude.use === 'function');

// Dentro de Claude, las descargas pasan por la capacidad «downloads» (la vista pide confirmación).
// En tu propia web o archivo, es una descarga normal.
async function downloadsCap() {
  if (!inClaudeView()) return null;
  try { return await window.claude.use('downloads'); } catch { return null; }
}

async function saveFile(filename, text) {
  if (inClaudeView()) {
    const dl = await downloadsCap();
    if (!dl) return { ok: false, code: 'unavailable' };
    try {
      await dl.save({ filename, data: text });
      return { ok: true };
    } catch (e) {
      return { ok: false, code: (e && e.code) || 'unavailable' };
    }
  }
  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return { ok: true };
  } catch {
    return { ok: false, code: 'unavailable' };
  }
}

function Section({ id, title, children }) {
  return (
    <section class="card stack pad-lg" id={id} aria-labelledby={`${id}-t`}>
      <h2 class="title" id={`${id}-t`}>{title}</h2>
      {children}
    </section>
  );
}

function Toggle({ id, label, checked, onChange, hint }) {
  return (
    <label class="between-c" for={id} style={{ minHeight: 44 }}>
      <span class="stack-sm" style={{ gap: 2 }}><span class="strong small">{label}</span>{hint && <span class="tiny muted">{hint}</span>}</span>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ width: 22, height: 22, accentColor: 'var(--teal)' }} />
    </label>
  );
}

export function Settings({ query }) {
  const s = useApp();
  const st = s.settings;
  const [voices, setVoices] = useState([]);
  const [local, setLocal] = useState({ status: 'unknown' });
  const [installing, setInstalling] = useState(false);
  const [provider, setProvider] = useState(undefined);
  const [inClaude, setInClaude] = useState(false);
  const [key, setKey] = useState(st.aiKey || '');
  const [confirmReset, setConfirmReset] = useState(false);
  const [pwa, setPwa] = useState(installState());
  const [canSave, setCanSave] = useState(!inClaudeView());

  useEffect(() => {
    loadVoices().then(() => setVoices(spanishVoices()));
    if (st.asrLocalLang) setLocal({ status: 'available', lang: st.asrLocalLang });
    aiProvider(st).then(setProvider);
    claudeSample().then((x) => setInClaude(!!x));
    if (inClaudeView()) downloadsCap().then((dl) => setCanSave(!!dl));
    const onP = () => setPwa(installState());
    window.addEventListener('agora-install', onP);
    if (query && query.get('ayuda') === 'app') setTimeout(() => document.getElementById('app')?.scrollIntoView({ behavior: 'smooth' }), 150);
    return () => window.removeEventListener('agora-install', onP);
  }, []);

  const set = (k, v) => update((d) => { d.settings[k] = v; });
  const setProfile = (k, v) => update((d) => { d.profile[k] = v; });

  const onTheme = (v) => { set('theme', v); applyTheme(v); };

  const useLocal = (r) => {
    setLocal(r);
    if (r.status === 'available') {
      localLangCache.lang = r.lang;
      localLangCache.status = 'available';
      set('asrLocalLang', r.lang);
    }
  };

  const onCheckLocal = async () => {
    setInstalling(true);
    const r = await localStatus();
    setInstalling(false);
    useLocal(r);
    if (r.status === 'unavailable' || r.status === 'unsupported') toast('Este navegador no puede transcribir sin internet.', 'info');
  };

  const onInstallLocal = async () => {
    setInstalling(true);
    const ok = await installLocal(local.lang);
    const r = await localStatus();
    setInstalling(false);
    useLocal(r);
    if (r.status === 'available') toast('Reconocimiento en el dispositivo listo', 'check');
    else toast(ok ? 'Descarga iniciada. Puede tardar unos minutos.' : 'No se pudo descargar ahora.', 'info');
  };

  const saveKey = () => {
    set('aiKey', key.trim());
    aiProvider({ ...st, aiKey: key.trim() }).then(setProvider);
    toast(key.trim() ? 'Clave guardada en este dispositivo' : 'Clave eliminada', 'check');
  };

  const onExport = async () => {
    const r = await saveFile(`agora-progreso-${new Date().toISOString().slice(0, 10)}.json`, exportData());
    if (r.ok) toast('Copia de tu progreso lista', 'download');
    else if (r.code === 'rate_limited') toast('Ya hay una descarga pendiente. Espera un momento.', 'info');
    else if (r.code !== 'declined') { setCanSave(false); toast('Aquí no se pueden guardar archivos. Hazlo desde la app completa.', 'info'); }
  };

  const onImport = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      importData(await f.text());
      applyTheme(s.settings.theme);
      toast('Progreso recuperado', 'check');
    } catch (err) {
      toast(err.message || 'No se pudo leer ese archivo.', 'alert');
    }
    e.target.value = '';
  };

  const srStatus = !env.hasSR
    ? (env.isIOS && env.standalone ? 'En iPhone, la app instalada no puede transcribir. Ábrela en Safari para transcribir.' : 'Este navegador no transcribe la voz. Usa Chrome o Edge (o Safari en iPhone) para contar muletillas de palabra.')
    : local.status === 'available' ? `Se procesa en este dispositivo (${local.lang}).` : 'La transcribe el servicio de voz del navegador. Nada se guarda.';

  return (
    <main class="screen no-tab">
      <TopBar title="Ajustes" backTo="/" />

      <Section id="perfil" title="Perfil">
        <div class="stack-sm">
          <label class="strong small" for="set-name">Tu nombre</label>
          <input id="set-name" class="field" type="text" maxLength={30} value={s.profile.name} placeholder="Cómo quieres que te llame" onInput={(e) => setProfile('name', e.target.value)} />
        </div>
        <div class="stack-sm">
          <span class="strong small">Meta diaria</span>
          <Seg label="Meta diaria" value={s.profile.dailyGoalMin} onChange={(v) => setProfile('dailyGoalMin', v)} options={DAILY_GOALS.map((d) => ({ value: d.min, label: d.label, sub: d.sub }))} />
        </div>
      </Section>

      <Section id="apariencia" title="Apariencia">
        <Seg label="Tema" value={st.theme} onChange={onTheme} options={[{ value: 'auto', label: 'Automático' }, { value: 'light', label: 'Claro' }, { value: 'dark', label: 'Oscuro' }]} />
      </Section>

      <Section id="practica" title="Práctica">
        {env.canVibrate && <Toggle id="set-vib" label="Vibrar al detectar una muletilla" checked={st.vibrate} onChange={(v) => set('vibrate', v)} />}
        <div class="stack-sm">
          <label class="strong small" for="set-voice">Voz modelo</label>
          <div class="row">
            <select id="set-voice" class="field grow" value={st.voiceURI || ''} onChange={(e) => set('voiceURI', e.target.value || null)}>
              <option value="">Automática</option>
              {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{`${v.name} (${v.lang})`}</option>)}
            </select>
            <button class="btn btn-ghost" type="button" onClick={() => speak('Hola. Así sueno cuando leo tus ejercicios.', { voiceURI: st.voiceURI })}><Icon name="play" size={14} />Probar</button>
          </div>
          {!voices.length && <span class="tiny muted">No encontramos voces en español en este dispositivo.</span>}
        </div>
        <div class="stack-sm">
          <span class="strong small">Transcripción de tu voz</span>
          <Seg label="Transcripción" value={st.asr} onChange={(v) => set('asr', v)} options={[{ value: 'auto', label: 'Activada' }, { value: 'off', label: 'Desactivada' }]} />
          <span class="tiny muted" style={{ lineHeight: 1.45 }}>{srStatus} Sin transcripción seguimos midiendo ritmo, pausas, energía y vacilaciones con el audio.</span>
        </div>
        {env.hasSR && local.status === 'unknown' && typeof (window.SpeechRecognition || window.webkitSpeechRecognition).available === 'function' && (
          <button class="btn btn-ghost" type="button" disabled={installing} onClick={onCheckLocal}><Icon name="shieldCheck" size={18} />{installing ? 'Comprobando…' : '¿Puedo transcribir sin internet?'}</button>
        )}
        {env.hasSR && (local.status === 'downloadable' || local.status === 'downloading') && (
          <div class="notice teal">
            <Icon name="download" size={20} />
            <div class="stack-sm">
              <span class="small">Tu navegador puede transcribir sin enviar audio a internet. Descarga el español una vez.</span>
              <button class="btn btn-outline" type="button" disabled={installing} onClick={onInstallLocal}>{installing ? 'Descargando…' : 'Descargar reconocimiento en español'}</button>
            </div>
          </div>
        )}
        {env.hasSR && local.status === 'available' && <Toggle id="set-local" label="Transcribir en el dispositivo" hint="Más privado: el audio no sale de tu equipo." checked={st.asrLocal} onChange={(v) => set('asrLocal', v)} />}
        <div class="stack-sm">
          <span class="strong small">Modo de análisis</span>
          <Seg label="Modo de análisis" value={st.analysisMode} onChange={(v) => set('analysisMode', v)} options={[{ value: 'full', label: 'Completo' }, { value: 'transcript', label: 'Solo transcripción' }]} />
          <span class="tiny muted" style={{ lineHeight: 1.45 }}>Usa «Solo transcripción» si tu teléfono no permite analizar el audio y transcribir a la vez.</span>
        </div>
      </Section>

      <Section id="ia" title="Inteligencia artificial (opcional)">
        <p class="small muted" style={{ lineHeight: 1.5 }}>La IA propone versiones mejoradas de tus discursos, revisa tus historias y lleva las conversaciones del simulador. Solo recibe texto, nunca audio, y solo cuando tocas el botón.</p>
        {provider === undefined ? null : inClaude ? (
          <div class="notice teal"><Icon name="check" size={20} /><span class="small">Disponible a través de Claude en esta vista. La primera vez te pedirá permiso.</span></div>
        ) : inClaudeView() ? (
          <div class="notice"><Icon name="info" size={20} /><span class="small">La IA no está disponible en esta vista. En la app completa puedes usar tu propia clave de API.</span></div>
        ) : (
          <>
            <div class="stack-sm">
              <label class="strong small" for="set-key">Clave de API de Anthropic</label>
              <input id="set-key" class="field" type="password" autocomplete="off" value={key} placeholder="sk-ant-…" onInput={(e) => setKey(e.target.value)} />
              <span class="tiny muted" style={{ lineHeight: 1.45 }}>Se guarda solo en este dispositivo. Cada uso tiene un costo en tu cuenta de API. Sin clave, la app usa revisiones y guiones propios.</span>
            </div>
            <div class="row">
              <select class="field grow" aria-label="Modelo" value={st.aiModel} onChange={(e) => set('aiModel', e.target.value)}>
                <option value="claude-sonnet-5">Claude Sonnet 5 (recomendado)</option>
                <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (más rápido)</option>
              </select>
              <button class="btn" type="button" disabled={key.trim() === (st.aiKey || '')} onClick={saveKey}>{!key.trim() && st.aiKey ? 'Quitar' : 'Guardar'}</button>
            </div>
          </>
        )}
      </Section>

      <Section id="privacidad" title="Privacidad">
        <ul class="small" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
          <li>Tu voz se analiza en el momento. El audio y la transcripción se borran al salir del análisis.</li>
          <li>Se guardan en este dispositivo tus puntuaciones, tu racha, tus logros y los textos de tus historias.</li>
          <li>Tu clave de API (si la agregas) se guarda solo aquí y no se incluye en la copia de tus datos.</li>
          {!storage.ok && <li class="coral-t">Este navegador no permite guardar datos: tu progreso se perderá al cerrar.</li>}
        </ul>
      </Section>

      <Section id="datos" title="Tus datos">
        <div class={canSave ? 'grid2' : 'stack'}>
          {canSave && <button class="btn btn-ghost" type="button" onClick={onExport}><Icon name="download" size={18} />Guardar copia</button>}
          <label class="btn btn-ghost file-btn"><Icon name="upload" size={18} />Recuperar copia<input type="file" accept="application/json,.json" onChange={onImport} aria-label="Recuperar copia de progreso" /></label>
        </div>
        <button class="btn btn-outline" type="button" onClick={() => { setRecConfig(diagnosticConfig()); go('/grabar'); }}><Icon name="refresh" size={18} />Repetir diagnóstico</button>
        <button class="btn btn-danger" type="button" onClick={() => setConfirmReset(true)}><Icon name="trash" size={18} />Borrar todo mi progreso</button>
      </Section>

      <Section id="app" title="La app completa en tu celular">
        {env.framed ? (
          <p class="small" style={{ lineHeight: 1.5 }}>Estás en la <strong>vista previa dentro de Claude</strong>, donde el micrófono está bloqueado. Para practicar con tu voz en vivo, abre Ágora en su propio enlace:</p>
        ) : (
          <p class="small" style={{ lineHeight: 1.5 }}>Ágora funciona en el navegador y se puede instalar como app. Para que el micrófono funcione, ábrela desde un enlace <strong>https</strong> o como archivo en Chrome de tu computadora.</p>
        )}
        <ol class="small" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
          <li><strong>En tu computadora:</strong> abre el archivo <em>index.html</em> de Ágora con Chrome o Edge.</li>
          <li><strong>En tu celular:</strong> publica la carpeta de Ágora gratis (por ejemplo, arrastrándola a <em>app.netlify.com/drop</em>) y abre el enlace que te den.</li>
          <li><strong>Instálala:</strong> en Android, menú ⋮ → «Instalar app». En iPhone, Compartir → «Agregar a inicio» (instalada no transcribe; en Safari sí).</li>
        </ol>
        {pwa.canPrompt && <button class="btn" type="button" onClick={async () => { await promptInstall(); setPwa(installState()); }}><Icon name="download" size={18} />Instalar Ágora en este dispositivo</button>}
        {pwa.installed && <span class="small teal-t strong">Ágora está instalada en este dispositivo.</span>}
      </Section>

      <p class="tiny muted center">Ágora · práctica de oratoria · versión 1.0</p>

      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} title="¿Borrar todo tu progreso?">
        <p class="muted">Se borrarán tu racha, tus puntos, tus logros, tu diagnóstico y tus historias de este dispositivo. No se puede deshacer.</p>
        <div class="row">
          <button class="btn btn-ghost grow" type="button" onClick={() => setConfirmReset(false)}>Cancelar</button>
          <button class="btn btn-danger grow" type="button" onClick={() => { resetAll(); setConfirmReset(false); toast('Progreso borrado', 'trash'); go('/bienvenida', { replace: true }); }}>Borrar todo</button>
        </div>
      </Sheet>
    </main>
  );
}
