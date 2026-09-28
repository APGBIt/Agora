# Ágora

Creada por **Verónica Ogando Lara**.

App web para entrenar oratoria, pronunciación y storytelling con retos diarios. Funciona en el navegador del celular o de la computadora y se puede instalar como app.

## Privacidad

La política completa está dentro de la app, en Ajustes → Política de privacidad y datos.

- La voz se analiza en el momento, en el propio dispositivo. **No se guardan grabaciones ni transcripciones**: existen solo mientras ves tu análisis y se borran al salir.
- En el navegador quedan únicamente tus puntuaciones, tu racha, tus logros y los textos de tus historias.
- La transcripción usa el reconocimiento de voz del navegador (Chrome, Edge o Safari). En Ajustes puedes comprobar si tu navegador puede transcribir sin internet.
- La IA es opcional: solo recibe texto, nunca audio, y solo cuando tocas el botón.

## Instalar en el celular

1. Abre el enlace de la app en el celular.
2. **Android (Chrome):** menú ⋮ → «Instalar app».
3. **iPhone (Safari):** botón Compartir → «Agregar a inicio». En iPhone, la app instalada no transcribe la voz; en Safari sí. El ritmo, las pausas, la energía y las vacilaciones se miden en ambos casos.

## Qué incluye

- Reto del día con tres misiones, racha con protectores y logros.
- Diagnóstico inicial con un plan de cuatro semanas.
- Ejercicios de respiración, proyección, pronunciación (trabalenguas), ritmo y muletillas.
- Canto para el tono y la entonación: afinar notas con afinador en vivo, escalas, arpegios y distinguir pregunta de afirmación.
- Lecturas y conversaciones: textos para leer en voz alta, palabras nuevas, preguntas para opinar y un libro recomendado por tema.
- Improvisación, historias con teleprompter y simulador de conversaciones: entrevista de trabajo, presentar a tu jefatura, brindis, preguntas difíciles, dar una capacitación y conversación difícil.
- Análisis de cada práctica: palabras por minuto, muletillas (incluidas las del Caribe, como «este» o «tú sabes»), pausas, energía de voz, volumen al final de las frases y estructura.

## Desarrollo

Requiere Node.js 20 o más reciente.

```bash
npm install
npm run build   # genera dist/, docs/ (GitHub Pages), artifact/ y agora-web.zip
npm test        # pruebas del análisis de audio, texto y puntuaciones
```

- `src/audio`: análisis acústico (ritmo por sílabas, pausas, tono, vacilaciones).
- `src/speech`: transcripción del navegador, muletillas y estructura del discurso.
- `src/analysis`: puntuaciones, métricas en vivo y consejos.
- `src/screens` y `src/ui`: pantallas y componentes (Preact).
- `src/content`: retos, ejercicios, trabalenguas, temas, escenarios y consejos.

GitHub Pages publica la carpeta `docs/`. Después de cambiar el código, ejecuta `npm run build` y sube los cambios.
