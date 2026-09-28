// Segunda ronda: flujos adicionales (ejercicios con micrófono, simulador completo, teleprompter,
// modo solo transcripción, subida de nota de voz dentro de un marco sin micrófono).
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
const require = createRequire(import.meta.url);
const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');

const SHOTS = new URL('./shots/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });
writeFileSync('dist/_frame.html', '<!doctype html><meta charset="utf-8"><style>body{margin:0}iframe{border:0;width:100vw;height:100vh}</style><iframe src="index.html#/grabar?libre=1" allow="microphone \'none\'"></iframe>');
const PORT = 8766;
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', 'dist'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));

const MOCK_SR = `(() => {
  const LINES = ['el año pasado en mi área teníamos un problema con los expedientes', 'mi responsabilidad era ordenar el archivo', 'propuse un sistema de etiquetas y organicé al equipo', 'al final redujimos los retrasos a la mitad'];
  class FakeSR {
    constructor() { this._t = []; }
    start() {
      const results = [];
      let t = 0;
      LINES.forEach((line) => {
        t += 2500;
        this._t.push(setTimeout(() => {
          const r = [{ transcript: line, confidence: 0.9 }];
          r.isFinal = true;
          results.push(r);
          this.onresult && this.onresult({ resultIndex: results.length - 1, results });
        }, t));
      });
    }
    stop() { this._t.forEach(clearTimeout); setTimeout(() => this.onend && this.onend(), 30); }
    abort() { this._t.forEach(clearTimeout); }
  }
  window.SpeechRecognition = FakeSR;
  window.webkitSpeechRecognition = FakeSR;
})();`;

const errors = [];
const browser = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${new URL('./speech.wav', import.meta.url).pathname}`, '--autoplay-policy=no-user-gesture-required'],
});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, permissions: ['microphone'] });
const page = await ctx.newPage();
await page.addInitScript(MOCK_SR);
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|fonts/.test(m.text())) errors.push(`console: ${m.text()}`); });
const url = `http://localhost:${PORT}/index.html`;
const shot = async (name, full = false, p = page) => { await p.waitForTimeout(300); await p.screenshot({ path: `${SHOTS}x-${name}.png`, fullPage: full }); };
const dismiss = async () => { for (let k = 0; k < 3; k++) { const c = page.locator('.celebrate button'); if (await c.count()) { await c.first().click(); await page.waitForTimeout(150); } else break; } };
const step = async (label, fn) => {
  try { await dismiss(); await fn(); console.log('ok  ', label); } catch (e) { console.log('FAIL', label, '-', e.message.split('\n')[0]); errors.push(`${label}: ${e.message.split('\n')[0]}`); await shot(`fail-${label.replace(/\W+/g, '_')}`); }
};

// Saltar bienvenida
await page.goto(`${url}#/bienvenida`);
await page.getByRole('button', { name: 'Saltar por ahora' }).click();

await step('«sss» sostenida', async () => {
  await page.goto(`${url}#/ejercicio/resp-sss`);
  await page.getByRole('button', { name: /Empezar/ }).click();
  await page.waitForTimeout(6000);
  await shot('sss', true);
  const done = await page.getByRole('button', { name: /Otra vez/ }).count();
  if (!done) await page.getByRole('button', { name: 'Terminar' }).click();
  await page.getByRole('button', { name: /Otra vez/ }).waitFor({ timeout: 5000 });
});

await step('vocal «aaa»', async () => {
  await page.goto(`${url}#/ejercicio/proy-vocal-a`);
  await page.getByRole('button', { name: /Empezar/ }).click();
  await page.waitForTimeout(5000);
  if (await page.getByRole('button', { name: 'Terminar' }).count()) await page.getByRole('button', { name: 'Terminar' }).click();
  await page.getByRole('button', { name: /Otra vez/ }).waitFor({ timeout: 5000 });
  await shot('aaa', true);
});

await step('la sirena', async () => {
  await page.goto(`${url}#/ejercicio/proy-sirena`);
  await page.getByRole('button', { name: /Empezar/ }).click();
  await page.waitForTimeout(6000);
  await page.getByRole('button', { name: 'Terminar' }).click();
  await page.waitForTimeout(800);
  await shot('sirena', true);
});

await step('guiado: postura', async () => {
  await page.goto(`${url}#/ejercicio/cue-postura`);
  await page.getByRole('button', { name: /Empezar/ }).click();
  await page.waitForTimeout(1500);
  for (let i = 0; i < 6; i++) { const b = page.getByRole('button', { name: /Siguiente paso/ }); if (await b.count()) await b.click(); }
  await page.getByText('¡Ejercicio completo!').waitFor({ timeout: 4000 });
  await shot('guiado', true);
});

await step('lectura con rondas', async () => {
  await page.goto(`${url}#/ejercicio/rit-tres-velocidades`);
  await page.getByRole('button', { name: /^Empezar$/ }).click();
  await page.getByRole('button', { name: 'Empezar a grabar' }).click();
  await page.getByText('REC', { exact: true }).waitFor({ timeout: 8000 });
  await page.waitForTimeout(4000);
  await page.getByRole('button', { name: /Siguiente: Normal/ }).click();
  await page.waitForTimeout(3500);
  await page.getByRole('button', { name: /Siguiente: Rápido/ }).click();
  await page.waitForTimeout(3000);
  await page.getByRole('button', { name: /^Terminar/ }).click();
  await page.getByText('Tus rondas').waitFor({ timeout: 15000 });
  await shot('rondas', true);
});

await step('ritmo constante (guía)', async () => {
  await page.goto(`${url}#/ejercicio/rit-constante`);
  await page.getByRole('button', { name: /^Empezar$/ }).click();
  await page.getByRole('button', { name: 'Empezar a grabar' }).click();
  await page.getByText('REC', { exact: true }).waitFor({ timeout: 8000 });
  await page.waitForTimeout(7000);
  await shot('pacer');
  await page.getByRole('button', { name: 'Detener y analizar' }).click();
  await page.getByRole('heading', { level: 1 }).waitFor({ timeout: 15000 });
});

await step('improvisación con cuenta regresiva', async () => {
  await page.goto(`${url}#/improvisacion?modo=palabra`);
  await page.getByRole('button', { name: /Empezar/ }).click();
  await page.getByRole('button', { name: 'Empezar a grabar' }).click();
  await page.getByText('segundos para pensar').waitFor({ timeout: 8000 });
  await shot('pensar');
  await page.getByRole('button', { name: /Estoy lista/ }).click();
  await page.getByText('REC', { exact: true }).waitFor({ timeout: 8000 });
  await page.waitForTimeout(5000);
  await page.getByRole('button', { name: 'Detener y analizar' }).click();
  await page.getByRole('heading', { level: 1 }).waitFor({ timeout: 15000 });
  await shot('improv-analisis', true);
});

await step('simulador completo', async () => {
  await page.goto(`${url}#/simulador`);
  await page.getByRole('checkbox', { name: /en voz alta/ }).uncheck();
  await page.getByRole('button', { name: /Empezar la conversación/ }).click();
  for (let i = 0; i < 6; i++) {
    const done = await page.getByRole('button', { name: /Ver mi análisis/ }).count();
    if (done) break;
    await page.getByRole('button', { name: 'Responder con la voz' }).click();
    await page.waitForTimeout(10500);
    await page.getByRole('button', { name: 'Terminar mi respuesta' }).click();
    await page.waitForTimeout(1500);
  }
  await shot('sim-fin', true);
  await page.getByRole('button', { name: /Ver mi análisis/ }).click();
  await page.getByText('Tus respuestas').waitFor({ timeout: 15000 });
  await shot('sim-analisis', true);
});

await step('historia y teleprompter', async () => {
  await page.goto(`${url}#/historias`);
  await page.getByRole('button', { name: /Nueva historia/ }).click();
  await page.getByLabel('Título de tu historia').fill('El archivo');
  await page.getByRole('button', { name: 'Método STAR' }).click();
  await page.getByLabel(/En qué contexto pasó/).fill('el año pasado en mi área teníamos un problema con los expedientes');
  await page.getByLabel(/Cuál era tu responsabilidad/).fill('mi responsabilidad era ordenar el archivo');
  await page.getByLabel(/Qué hiciste tú/).fill('propuse un sistema de etiquetas y organicé al equipo');
  await page.getByLabel(/Qué lograste/).fill('al final redujimos los retrasos a la mitad');
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /Ensayar con teleprompter/ }).click();
  await page.getByRole('button', { name: 'Empezar a grabar' }).click();
  await page.getByText('REC', { exact: true }).waitFor({ timeout: 8000 });
  await page.waitForTimeout(8000);
  await shot('teleprompter');
  await page.getByRole('button', { name: 'Detener y analizar' }).click();
  await page.getByRole('heading', { level: 1 }).waitFor({ timeout: 15000 });
  await shot('historia-analisis', true);
});

await step('modo solo transcripción', async () => {
  await page.goto(`${url}#/ajustes`);
  await page.getByRole('button', { name: 'Solo transcripción' }).click();
  await page.goto(`${url}#/grabar?libre=1`);
  await page.getByRole('button', { name: 'Empezar a grabar' }).click();
  await page.getByText('REC', { exact: true }).waitFor({ timeout: 8000 });
  await page.waitForTimeout(11000);
  await page.getByRole('button', { name: 'Detener y analizar' }).click();
  await page.getByRole('heading', { level: 1 }).waitFor({ timeout: 15000 });
  await shot('solo-transcripcion', true);
  await page.goto(`${url}#/ajustes`);
  await page.getByRole('button', { name: 'Completo' }).click();
});

await step('reto: lista y ruta', async () => {
  await page.goto(`${url}#/reto`);
  await page.getByRole('button', { name: 'Ver todos los retos' }).click();
  await page.getByRole('link', { name: /Tres razones/ }).click();
  await page.getByRole('heading', { name: 'Tres razones' }).waitFor();
  await page.goto(`${url}#/ruta/reuniones`);
  await page.getByRole('button', { name: 'Empezar la ruta' }).click();
  await shot('ruta', true);
});

await step('marco sin micrófono: subir nota de voz', async () => {
  const p2 = await ctx.newPage();
  p2.on('pageerror', (e) => errors.push(`frame pageerror: ${e.message}`));
  await p2.goto(`http://localhost:${PORT}/_frame.html`);
  const f = p2.frameLocator('iframe');
  await f.getByText('Micrófono no disponible aquí').waitFor({ timeout: 8000 });
  await shot('marco', false, p2);
  await f.locator('input[type=file]').setInputFiles(new URL('./speech.wav', import.meta.url).pathname);
  await f.getByRole('heading', { level: 1 }).waitFor({ timeout: 20000 });
  await p2.waitForTimeout(800);
  await shot('marco-analisis', false, p2);
  await p2.close();
});

console.log('errores:', errors.length ? errors.join('\n') : 'ninguno');
await browser.close();
server.kill();
