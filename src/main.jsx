import { render } from 'preact';
import { useEffect } from 'preact/hooks';
import { useApp, startupEvents, applyTheme, getState } from './app/store.js';
import { useRoute, go } from './app/router.js';
import { initPWA } from './app/pwa.js';
import { env } from './app/env.js';
import { localLangCache } from './screens/asrCache.js';
import { Toasts, Celebrations, announce } from './ui/kit.jsx';
import { Home } from './screens/Home.jsx';
import { Welcome } from './screens/Welcome.jsx';
import { Diagnostic } from './screens/Diagnostic.jsx';
import { Challenge } from './screens/Challenge.jsx';
import { Recorder } from './screens/Recorder.jsx';
import { Analysis } from './screens/Analysis.jsx';
import { Library, Category, RouteScreen } from './screens/Library.jsx';
import { Exercise } from './screens/Exercise.jsx';
import { Breathing } from './screens/Breathing.jsx';
import { Pronunciation } from './screens/Pronunciation.jsx';
import { Improv } from './screens/Improv.jsx';
import { Simulator } from './screens/Simulator.jsx';
import { Stories, StoryEditor } from './screens/Stories.jsx';
import { Progress } from './screens/Progress.jsx';
import { Settings } from './screens/Settings.jsx';

function Screen({ route }) {
  const s = useApp();
  const [a, b] = route.parts;
  const q = route.query;
  if (!a) return s.profile.onboarded ? <Home /> : <Welcome />;
  switch (a) {
    case 'bienvenida': return <Welcome />;
    case 'diagnostico': return <Diagnostic />;
    case 'reto': return <Challenge id={b} />;
    case 'grabar': return <Recorder query={q} />;
    case 'analisis': return <Analysis />;
    case 'entrenar': return b ? <Category id={b} /> : <Library />;
    case 'ejercicio': return <Exercise id={b} />;
    case 'respiracion': return <Breathing id={b} />;
    case 'pronunciacion': return <Pronunciation id={b} />;
    case 'improvisacion': return <Improv query={q} />;
    case 'simulador': return <Simulator query={q} />;
    case 'historias': return b ? <StoryEditor id={b} /> : <Stories />;
    case 'progreso': return <Progress />;
    case 'ajustes': return <Settings query={q} />;
    case 'ruta': return <RouteScreen id={b} />;
    default: return <Home />;
  }
}

function App() {
  const route = useRoute();
  useEffect(() => {
    applyTheme(getState().settings.theme);
    if (startupEvents.length) setTimeout(() => announce(startupEvents), 600);
    // El reconocimiento en el dispositivo solo se usa si lo comprobaste en Ajustes.
    const saved = getState().settings.asrLocalLang;
    if (env.hasSR && saved) { localLangCache.lang = saved; localLangCache.status = 'available'; }
    if (!location.hash && !getState().profile.onboarded) go('/', { replace: true });
  }, []);
  return (
    <div class="app">
      <Screen key={route.path} route={route} />
      <Toasts />
      <Celebrations />
    </div>
  );
}

initPWA();
render(<App />, document.getElementById('agora'));
