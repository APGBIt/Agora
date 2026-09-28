// Prueba de extremo a extremo con micrófono simulado (Chromium + audio sintético en español).
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
const require = createRequire(import.meta.url);
const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');

const SHOTS = new URL('./shots/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });
const PORT = 8765;
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', 'dist'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));

const MOCK_SR = `(() => {
  const LINES = ['buenos días a todos gracias por estar aquí', 'hoy les quiero contar cómo mejoramos el archivo de expedientes', 'este el año pasado teníamos un problema serio', 'nadie encontraba los documentos a tiempo', 'entonces propuse un sistema de etiquetas muy sencillo', 'al final redujimos los retrasos a la mitad', 'le pido quince minutos el jueves para mostrárselo'];
  class FakeSR {
    constructor() { this.lang = 'es'; this.continuous = true; this.interimResults = true; this._t = []; }
    start() {
      const results = [];
      let t = 0;
      LINES.forEach((line) => {
        t += 3600;
        this._t.push(setTimeout(() => {
          const r = [{ transcript: line, confidence: 0.91 }];
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
const mode = process.argv[2] || 'light';
const browser = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${new URL('./speech.wav', import.meta.url).pathname}`, '--autoplay-policy=no-user-gesture-required'],
});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: mode === 'dark' ? 'dark' : 'light', permissions: ['microphone'] });
const page = await ctx.newPage();
if (process.argv[3] !== 'nosr') await page.addInitScript(MOCK_SR);
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

const shot = async (name, full = false) => { await page.waitForTimeout(350); await page.screenshot({ path: `${SHOTS}${mode}-${name}.png`, fullPage: full }); };
const url = `http://localhost:${PORT}/index.html`;
const dismiss = async () => {
  for (let k = 0; k < 3; k++) {
    const c = page.locator('.celebrate button');
    if (await c.count()) { await c.first().click(); await page.waitForTimeout(200); } else break;
  }
};
const step = async (label, fn) => {
  try { await dismiss(); await fn(); console.log('ok  ', label); } catch (e) { console.log('FAIL', label, '-', e.message.split('\n')[0]); errors.push(`${label}: ${e.message.split('\n')[0]}`); await shot(`fail-${label.replace(/\W+/g, '_')}`); }
};

await step('bienvenida', async () => {
  await page.goto(url);
  await page.getByRole('heading', { name: /Para qué quieres mejorar/ }).waitFor();
  await page.getByRole('button', { name: 'Dar clases o capacitaciones' }).click();
  await page.getByLabel(/Cómo quieres que te llame/).fill('Ana');
  await shot('01-bienvenida', true);
  await page.getByRole('button', { name: /Hacer mi diagnóstico/ }).click();
});

await step('diagnóstico: grabar', async () => {
  await page.getByRole('button', { name: 'Empezar a grabar' }).click();
  await page.getByText('REC', { exact: true }).waitFor({ timeout: 8000 });
  await page.waitForTimeout(9000);
  await shot('02-diag-lectura');
  await page.getByRole('button', { name: /Siguiente: Preséntate/ }).click();
  await page.waitForTimeout(8000);
  await shot('03-diag-libre');
  await page.getByRole('button', { name: /^Terminar/ }).click();
  await page.getByRole('heading', { name: 'Tu punto de partida' }).waitFor({ timeout: 15000 });
  await shot('04-diag-resultado', true);
  await page.getByRole('button', { name: /Empezar mi plan/ }).click();
});

await step('inicio', async () => {
  await page.getByRole('heading', { name: 'Hola, Ana' }).waitFor();
  await shot('05-inicio', true);
});

await step('reto y grabación', async () => {
  await page.getByRole('link', { name: /Empezar reto|Repetir reto/ }).click();
  await page.getByRole('button', { name: /Grabar ahora/ }).click();
  await page.getByRole('button', { name: 'Empezar a grabar' }).click();
  await page.getByText('REC', { exact: true }).waitFor({ timeout: 8000 });
  await page.waitForTimeout(16000);
  await shot('06-grabando');
  await page.getByRole('button', { name: 'Detener y analizar' }).click();
  await page.getByRole('heading', { level: 1 }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(1200);
  await shot('07-analisis', true);
});

await step('terminar análisis', async () => {
  await page.getByRole('button', { name: /^Terminar/ }).click();
  await page.getByRole('heading', { name: 'Hola, Ana' }).waitFor();
});

await step('entrenar', async () => {
  await page.getByRole('link', { name: 'Entrenar' }).click();
  await page.getByRole('heading', { name: 'Entrenar' }).waitFor();
  await shot('08-entrenar', true);
  await page.getByRole('link', { name: /Pronunciación y dicción/ }).click();
  await shot('09-categoria');
});

await step('pronunciación', async () => {
  await page.goto(`${url}#/pronunciacion/tw-tr`);
  await page.getByRole('heading', { name: /Precisión con la/ }).waitFor();
  const mic = page.getByRole('button', { name: /Grabar: mantén pulsado o toca/ });
  await mic.click();
  await page.waitForTimeout(4500);
  await page.getByRole('button', { name: 'Terminar grabación' }).click();
  await page.waitForTimeout(2500);
  await shot('10-pronunciacion', true);
});

await step('respiración', async () => {
  await page.goto(`${url}#/respiracion/resp-478`);
  await page.getByRole('button', { name: 'Empezar' }).click();
  await page.waitForTimeout(2500);
  await shot('11-respiracion');
});

await step('improvisación', async () => {
  await page.goto(`${url}#/improvisacion`);
  await page.getByText('Ordena tu respuesta').waitFor();
  await shot('12-improvisacion', true);
});

await step('simulador', async () => {
  await page.goto(`${url}#/simulador`);
  await page.getByRole('button', { name: /Empezar la conversación/ }).click();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Responder con la voz' }).click();
  await page.waitForTimeout(12000);
  await shot('13-simulador');
  await page.getByRole('button', { name: 'Terminar mi respuesta' }).click();
  await page.waitForTimeout(2500);
  await shot('14-simulador-2', true);
});

await step('historias', async () => {
  await page.goto(`${url}#/historias`);
  await page.getByRole('button', { name: /Nueva historia/ }).click();
  await page.getByLabel('Título de tu historia').fill('El expediente que nadie encontraba');
  await page.getByLabel(/Qué frase abre la historia/).fill('Eran las cuatro y cincuenta y cinco de un viernes y el expediente seguía sin aparecer.');
  await page.getByLabel(/Quién, dónde y qué estaba en juego/).fill('Una audiencia el lunes, una familia esperando y tres oficinas buscando el mismo papel.');
  await page.getByLabel(/Qué obstáculo/).fill('Cada área tenía su propia versión');
  await shot('15-historia', true);
});

await step('progreso', async () => {
  await page.goto(`${url}#/progreso`);
  await page.getByRole('heading', { name: 'Tu progreso' }).waitFor();
  await shot('16-progreso', true);
});

await step('ajustes', async () => {
  await page.goto(`${url}#/ajustes`);
  await page.getByRole('heading', { name: 'Ajustes' }).waitFor().catch(() => {});
  await shot('17-ajustes', true);
});

await step('práctica libre sin transcripción visible', async () => {
  await page.goto(`${url}#/grabar?libre=1`);
  await page.getByRole('button', { name: 'Empezar a grabar' }).click();
  await page.getByText('REC', { exact: true }).waitFor({ timeout: 8000 });
  await page.waitForTimeout(8000);
  await page.getByRole('button', { name: 'Detener y analizar' }).click();
  await page.getByRole('heading', { level: 1 }).waitFor({ timeout: 15000 });
  await shot('18-analisis-libre', true);
});

const stored = await page.evaluate(() => localStorage.getItem('agora.v1'));
console.log('almacenado:', stored ? `${(stored.length / 1024).toFixed(1)} KB` : 'nada', '| contiene "expediente" en historial:', stored && /"history":\[[^\]]*expediente/.test(stored));
console.log('errores:', errors.length ? errors.join('\n') : 'ninguno');
await browser.close();
server.kill();
