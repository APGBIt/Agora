// Construye Ágora: un solo HTML con todo dentro, más los archivos para instalarla como app.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, cpSync } from 'node:fs';
import { basename } from 'node:path';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';

const DEV = process.argv.includes('--dev');
const out = await build({
  entryPoints: ['src/main.jsx'],
  bundle: true,
  minify: !DEV,
  format: 'iife',
  target: ['es2020', 'safari14', 'chrome90'],
  jsx: 'automatic',
  jsxImportSource: 'preact',
  write: false,
  legalComments: 'none',
  define: { 'process.env.NODE_ENV': DEV ? '"development"' : '"production"' },
});
const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync('src/styles.css', 'utf8');
const minCss = DEV ? css : css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n\s*/g, '\n').replace(/\n+/g, '\n');

const FONTS = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Instrument+Sans:wght@400;500;600;700&display=swap';
const TITLE = 'Ágora';
const DESC = 'Entrena tu oratoria, pronunciación y storytelling con retos diarios. Tu voz se analiza en el momento y no se guarda.';

const body = `<div id="agora"></div>
<noscript><p style="padding:24px;font-family:system-ui">Ágora necesita JavaScript para funcionar.</p></noscript>
<script>${js}</script>`;

mkdirSync('dist/icons', { recursive: true });
mkdirSync('artifact', { recursive: true });

const full = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${TITLE}</title>
<meta name="author" content="Verónica Ogando Lara">
<meta name="description" content="${DESC}">
<meta name="theme-color" content="#0E5C57">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Ágora">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<style>
:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:0}
${minCss}
</style>
</head>
<body>
${body}
</body>
</html>
`;
writeFileSync('dist/index.html', full);

// Versión para la vista previa en Claude (sin doctype, head ni body propios).
const fragment = `<title>${TITLE}</title>
<link rel="stylesheet" href="${FONTS}">
<style>
${minCss}
</style>
${body}
`;
writeFileSync('artifact/agora.html', fragment);

// Manifiesto e íconos
writeFileSync('dist/manifest.webmanifest', JSON.stringify({
  name: 'Ágora · Oratoria',
  short_name: 'Ágora',
  description: DESC,
  lang: 'es',
  start_url: './',
  scope: './',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#F5F1E8',
  theme_color: '#0E5C57',
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}, null, 2));

const iconSvg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" rx="${pad ? 0 : 112}" fill="#0E5C57"/>
<g transform="translate(256 250) scale(${pad ? 0.78 : 1})" fill="none" stroke="#FFFDF8" stroke-width="26" stroke-linecap="round" stroke-linejoin="round">
<rect x="-52" y="-150" width="104" height="186" rx="52"/>
<path d="M-112 -20a112 112 0 0 0 224 0"/>
<path d="M0 92v52"/>
<path d="M-62 150h124"/>
</g>
<circle cx="376" cy="136" r="22" fill="#F0B36A"/>
</svg>`;
const sharp = (await import('sharp')).default;
await sharp(Buffer.from(iconSvg(false))).resize(192, 192).png().toFile('dist/icons/icon-192.png');
await sharp(Buffer.from(iconSvg(false))).resize(512, 512).png().toFile('dist/icons/icon-512.png');
await sharp(Buffer.from(iconSvg(true))).resize(512, 512).png().toFile('dist/icons/icon-maskable-512.png');
await sharp(Buffer.from(iconSvg(true))).resize(180, 180).png().toFile('dist/icons/apple-touch-icon.png');

// Service worker: funciona sin conexión después de la primera visita.
const version = createHash('sha1').update(full).digest('hex').slice(0, 10);
writeFileSync('dist/sw.js', `// Ágora · caché para usar sin conexión (no guarda audio ni datos personales)
const CACHE = 'agora-${version}';
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put('./index.html', cp)); return r; }).catch(() => caches.match('./index.html')));
    return;
  }
  if (url.origin === location.origin || url.host.endsWith('fonts.googleapis.com') || url.host.endsWith('fonts.gstatic.com')) {
    e.respondWith(caches.match(req).then((hit) => {
      const net = fetch(req).then((r) => { if (r.ok || r.type === 'opaque') { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); } return r; }).catch(() => hit);
      return hit || net;
    }));
  }
});
`);

writeFileSync('dist/LEEME.txt', `ÁGORA · Tu app de oratoria
==========================

Esta carpeta es la app completa. Funciona en el navegador y se puede instalar en el celular.
Tu voz se analiza en el momento y NO se guarda. En el dispositivo solo quedan tus puntuaciones.

1) PROBARLA EN TU COMPUTADORA (lo más rápido)
   Abre el archivo index.html con Google Chrome o Microsoft Edge.
   Permite el micrófono cuando te lo pida.

2) USARLA EN TU CELULAR (con tu propio enlace, gratis)
   Opción A · Netlify (sin programar):
     a. Entra en https://app.netlify.com/drop desde tu computadora.
     b. Arrastra ESTA CARPETA completa a la página.
     c. Crea tu cuenta gratuita cuando te lo pida para que el enlace no caduque.
     d. Abre el enlace (https://…netlify.app) en el celular.
   Opción B · GitHub Pages: sube estos archivos a un repositorio y activa Pages.

3) INSTALARLA COMO APP
   Android (Chrome): menú ⋮ → «Instalar app» o «Agregar a la pantalla de inicio».
   iPhone (Safari): botón Compartir → «Agregar a inicio».
   Nota: en iPhone, la app instalada no puede transcribir la voz; en Safari sí.
   El ritmo, las pausas, la energía y las vacilaciones se miden en ambos casos.

4) TUS DATOS
   Se guardan solo en el navegador donde usas la app. En Ajustes → «Guardar copia»
   puedes descargar una copia y recuperarla en otro dispositivo.

5) IA (OPCIONAL)
   En Ajustes puedes agregar una clave de API de Anthropic para activar la versión
   mejorada con IA, la revisión de historias y el simulador conversacional.
   Solo se envía texto, nunca audio.
`);

// Copia para GitHub Pages (se publica la carpeta docs/)
rmSync('docs', { recursive: true, force: true });
cpSync('dist', 'docs', { recursive: true, filter: (src) => !basename(src).startsWith('_') });
writeFileSync('docs/.nojekyll', '');

if (existsSync('agora-web.zip')) rmSync('agora-web.zip');
execSync("cd dist && zip -qr ../agora-web.zip . -x '_*'");
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
console.log('dist/index.html', kb(full.length), '| artifact', kb(fragment.length), '| js', kb(js.length));
