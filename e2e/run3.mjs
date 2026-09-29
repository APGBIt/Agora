// Tercera ronda: lecturas, canto, ayuda y política de privacidad.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
const require = createRequire(import.meta.url);
const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');

const SHOTS = new URL('./shots/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });
const PORT = 8767;
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', 'dist'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const mode = process.argv[2] || 'light';

const errors = [];
const browser = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${new URL('./speech.wav', import.meta.url).pathname}`, '--autoplay-policy=no-user-gesture-required'],
});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, permissions: ['microphone'], colorScheme: mode });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|fonts/.test(m.text())) errors.push(`console: ${m.text()}`); });
const url = `http://localhost:${PORT}/index.html`;
const shot = async (name, full = true) => { await page.waitForTimeout(300); await page.screenshot({ path: `${SHOTS}y-${mode}-${name}.png`, fullPage: full }); };
const dismiss = async () => { for (let k = 0; k < 3; k++) { const c = page.locator('.celebrate button'); if (await c.count()) { await c.first().click(); await page.waitForTimeout(150); } else break; } };
const step = async (label, fn) => {
  try { await dismiss(); await fn(); console.log('ok  ', label); } catch (e) { console.log('FAIL', label, '-', e.message.split('\n')[0]); errors.push(`${label}: ${e.message.split('\n')[0]}`); await shot(`fail-${label.replace(/\W+/g, '_')}`); }
};

await page.goto(`${url}#/bienvenida`);
await shot('bienvenida', false);
await page.getByRole('button', { name: 'Saltar por ahora' }).click();

await step('entrenar muestra lecturas y canto', async () => {
  await page.goto(`${url}#/entrenar`);
  await page.getByText('Lecturas y conversaciones').waitFor();
  await page.getByText('Canto: tono y entonación').waitFor();
  await shot('entrenar');
});

await step('lista de lecturas y filtro', async () => {
  await page.goto(`${url}#/temas`);
  await page.getByRole('button', { name: 'Cultura dominicana' }).click();
  await page.getByText('La mesa del domingo').waitFor();
  await page.getByRole('button', { name: 'Todos' }).click();
  await shot('temas');
});

await step('lectura: leer en voz alta', async () => {
  await page.goto(`${url}#/temas/escuchar`);
  await page.getByText('Palabras para usar').waitFor();
  await shot('lectura');
  await page.getByRole('button', { name: /Leer en voz alta/ }).click();
  await page.getByRole('button', { name: 'Empezar a grabar' }).click();
  await page.getByText('REC', { exact: true }).waitFor({ timeout: 8000 });
  await page.waitForTimeout(6000);
  await shot('lectura-grabando', false);
  await page.getByRole('button', { name: 'Detener y analizar' }).click();
  await page.getByRole('heading', { level: 1 }).waitFor({ timeout: 15000 });
  await dismiss();
  await shot('lectura-analisis', false);
});

await step('lectura: responder una pregunta', async () => {
  await page.goto(`${url}#/temas/mariposas`);
  await page.getByRole('button', { name: /Responder: ¿Qué significa/ }).click();
  await page.getByRole('button', { name: 'Empezar a grabar' }).click();
  await page.getByText('segundos para pensar').waitFor({ timeout: 8000 });
  await shot('conversar-pensar', false);
});

await step('canto: escala con afinador', async () => {
  await page.goto(`${url}#/ejercicio/canto-escala`);
  await page.getByRole('button', { name: /Empezar/ }).click();
  await page.waitForTimeout(9000);
  await shot('canto-escala-en-curso', false);
  await page.getByRole('button', { name: 'Terminar' }).click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await dismiss();
  await shot('canto-escala-fin');
});

await step('canto: entonación', async () => {
  await page.goto(`${url}#/ejercicio/canto-entonacion`);
  await page.getByRole('button', { name: /Empezar/ }).click();
  await page.waitForTimeout(8000);
  await shot('entonacion', false);
  const next = page.getByRole('button', { name: /Siguiente|Ver resultado/ });
  if (await next.count()) await next.click();
  await page.waitForTimeout(500);
});

await step('ayuda y preguntas', async () => {
  await page.goto(`${url}#/ajustes`);
  await page.getByRole('link', { name: /Ayuda y preguntas frecuentes/ }).click();
  await page.getByText('¿Qué significa mi puntuación?').click();
  await page.getByText('Creada por Aristide Piña').waitFor();
  await shot('ayuda');
});

await step('política de privacidad', async () => {
  await page.goto(`${url}#/privacidad`);
  await page.getByText('Política de privacidad y datos').first().waitFor();
  await shot('privacidad');
});

await step('ajustes con crédito', async () => {
  await page.goto(`${url}#/ajustes`);
  await page.getByText(/creada por Aristide Piña · versión 1.2/).waitFor();
});

console.log('errores:', errors.length ? errors.join('\n') : 'ninguno');
await browser.close();
server.kill();
