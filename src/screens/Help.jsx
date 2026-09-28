import { Icon } from '../ui/icons.jsx';
import { TopBar } from '../ui/kit.jsx';
import { PACE_MIN, PACE_MAX } from '../analysis/scoring.js';

export const AUTHOR = 'Aristide Piña';
export const VERSION = '1.2';
export const POLICY_DATE = '28 de septiembre de 2026';

function Faq({ q, children }) {
  return (
    <details>
      <summary>{q}</summary>
      <div class="a">{children}</div>
    </details>
  );
}

function Group({ title, children }) {
  return (
    <section class="card stack pad-lg" aria-label={title}>
      <h2 class="title">{title}</h2>
      <div class="faq">{children}</div>
    </section>
  );
}

export function Help() {
  return (
    <main class="screen no-tab">
      <TopBar title="Ayuda" backTo="/ajustes" />
      <div class="stack-sm">
        <h1 class="display h2">¿En qué te ayudamos?</h1>
        <p class="muted" style={{ lineHeight: 1.5 }}>Respuestas rápidas para sacarle provecho a Ágora.</p>
      </div>

      <Group title="Primeros pasos">
        <Faq q="¿Por dónde empiezo?">
          <p>Haz el diagnóstico inicial, que toma unos dos minutos: lees un texto corto y te presentas. Con eso Ágora arma un plan de cuatro semanas enfocado en lo que más te conviene mejorar.</p>
          <p>Después, cada día encontrarás en Inicio un reto y tres misiones.</p>
        </Faq>
        <Faq q="¿Cómo grabo una práctica?">
          <p>Toca el micrófono de la barra de abajo para una práctica libre, o entra a un reto o a un ejercicio. Hay una cuenta regresiva de tres segundos. Toca el botón rojo para terminar y ver tu análisis.</p>
        </Faq>
        <Faq q="¿Cómo la instalo en mi celular?">
          <p><strong>Android (Chrome):</strong> menú ⋮ → «Instalar app».</p>
          <p><strong>iPhone (Safari):</strong> botón Compartir → «Agregar a inicio». En iPhone, la app instalada no transcribe la voz; si la abres desde Safari, sí.</p>
        </Faq>
      </Group>

      <Group title="Tu análisis">
        <Faq q="¿Qué mide Ágora?">
          <ul>
            <li><strong>Ritmo:</strong>{` palabras por minuto. Para presentar, lo ideal está entre ${PACE_MIN} y ${PACE_MAX}.`}</li>
            <li><strong>Muletillas:</strong> «este», «o sea», «¿verdad?», «tú sabes», «eh» y otras, y cuántas dices por minuto.</li>
            <li><strong>Pausas efectivas:</strong> silencios de medio segundo a dos segundos entre ideas. Los de más de dos segundos cuentan como silencios largos.</li>
            <li><strong>Energía de voz:</strong> cuánto varía tu tono. Puede ser monótona, expresiva o exagerada.</li>
            <li><strong>Volumen al final:</strong> si sostienes la voz hasta la última palabra de cada frase.</li>
            <li><strong>Palabras débiles:</strong> frases que restan fuerza, como «creo que», «tal vez» o «solo quería».</li>
            <li><strong>Estructura:</strong> si tu respuesta tuvo las partes del método que practicas.</li>
          </ul>
        </Faq>
        <Faq q="¿Por qué aparece «est.» junto al ritmo?">
          <p>Cuando no hay transcripción, calculamos el ritmo contando sílabas en el audio. Es una estimación: puede variar alrededor de un 10 % respecto al real.</p>
        </Faq>
        <Faq q="¿Qué tan exacta es la transcripción?">
          <p>La hace el reconocimiento de voz de tu navegador y puede confundir palabras, sobre todo con ruido. Úsala como guía: lo más útil es la tendencia de tus prácticas a lo largo de las semanas.</p>
        </Faq>
        <Faq q="¿Cómo funcionan los ejercicios de canto?">
          <p>Primero tarareas una nota cómoda para que Ágora ubique tu voz. Luego escuchas cada nota y la repites; el afinador te muestra si tu tono va alto o bajo. En entonación, Ágora escucha si tu tono sube (pregunta) o baja (afirmación) al final de la frase.</p>
        </Faq>
      </Group>

      <Group title="Problemas comunes">
        <Faq q="El micrófono no funciona">
          <p>Revisa que diste permiso al micrófono: en el candado junto a la dirección de la página o en los ajustes del navegador.</p>
          <p>Cierra otras apps que lo estén usando, como llamadas o notas de voz. Abre Ágora desde su enlace en el navegador, no dentro de otra app.</p>
        </Faq>
        <Faq q="No aparecen mis palabras (sin transcripción)">
          <p>Transcriben Chrome y Edge (en computadora y Android) y Safari en iPhone. En iPhone, si la instalaste en la pantalla de inicio, ábrela desde Safari para transcribir.</p>
          <p>Si tu teléfono no permite analizar el audio y transcribir a la vez, elige «Solo transcripción» en Ajustes.</p>
        </Faq>
        <Faq q="En canto no detecta mi voz">
          <p>Busca un lugar silencioso, acércate al teléfono y canta con «la» o «mmm» a volumen normal. Con audífonos oyes mejor la nota de referencia y el micrófono no la confunde con tu voz.</p>
        </Faq>
      </Group>

      <Group title="Tu progreso">
        <Faq q="¿Cómo funcionan la racha y los protectores?">
          <p>La racha cuenta los días seguidos en que practicas. Si completas las tres misiones del día ganas un protector (máximo tres). Si un día no practicas, se usa uno solo y tu racha sigue.</p>
        </Faq>
        <Faq q="¿Cómo paso mi progreso a otro dispositivo?">
          <p>En Ajustes → «Guardar copia» descargas un archivo con tu progreso. En el otro dispositivo, abre Ajustes → «Recuperar copia» y elige ese archivo.</p>
        </Faq>
        <Faq q="¿Pueden usarla varias personas?">
          <p>Sí. Cada persona que abre el enlace en su propio teléfono tiene su progreso aparte, y nadie más puede verlo. En un mismo navegador hay un solo progreso: si comparten teléfono, cada persona puede usar un navegador distinto.</p>
        </Faq>
        <Faq q="¿Qué hace la inteligencia artificial y cuánto cuesta?">
          <p>Es opcional. Propone una versión mejorada de lo que dijiste, revisa tus historias y lleva las conversaciones del simulador. Funciona con tu propia clave de API de Anthropic, que se paga por uso en tu cuenta. Solo recibe texto, nunca audio.</p>
        </Faq>
      </Group>

      <a class="go-row" href="#/privacidad" style={{ background: 'var(--teal-soft)', color: 'var(--teal-ink)' }}>
        <span class="row" style={{ gap: 10 }}><Icon name="shieldCheck" size={20} />Privacidad y datos</span>
        <Icon name="right" size={18} stroke={2} />
      </a>

      <About />
    </main>
  );
}

export function About() {
  return (
    <section class="card stack pad-lg center" style={{ alignItems: 'center' }} aria-label="Acerca de Ágora">
      <span class="icon-circle tone-teal" style={{ width: 52, height: 52, borderRadius: 26 }}><Icon name="mic" size={26} /></span>
      <span class="display" style={{ fontSize: 24 }}>Ágora</span>
      <span class="small muted" style={{ lineHeight: 1.5, maxWidth: 320 }}>Tu práctica diaria de oratoria, pronunciación y storytelling, en español y a tu ritmo, sin que tu voz salga de tu teléfono.</span>
      <span class="strong">{`Creada por ${AUTHOR}`}</span>
      <span class="tiny muted">{`Versión ${VERSION} · República Dominicana · 2026`}</span>
    </section>
  );
}

function P({ title, children }) {
  return (
    <section class="stack-sm">
      <h2 class="title" style={{ fontSize: 17 }}>{title}</h2>
      {children}
    </section>
  );
}

export function Privacy() {
  return (
    <main class="screen no-tab policy">
      <TopBar title="Privacidad y datos" backTo="/ajustes" />
      <div class="stack-sm">
        <h1 class="display h2">Política de privacidad y datos</h1>
        <span class="small muted">{`Última actualización: ${POLICY_DATE}`}</span>
      </div>

      <section class="notice teal">
        <Icon name="shieldCheck" size={22} style={{ flexShrink: 0 }} />
        <span class="small" style={{ lineHeight: 1.5 }}><strong>En resumen:</strong> tu voz se analiza en tu dispositivo y no se guarda. Tu progreso vive solo en tu navegador. Ágora no tiene cuentas, servidores propios, publicidad ni rastreadores.</span>
      </section>

      <section class="card stack pad-lg">
        <P title="1. Quién es responsable">
          <p>{`Ágora es un proyecto personal creado por ${AUTHOR}. No tiene fines comerciales ni publicidad, y no pide registrarte ni crear una cuenta.`}</p>
        </P>
        <P title="2. Tu voz y tus grabaciones">
          <p>El audio se analiza en tu dispositivo mientras practicas. La grabación existe solo en la memoria del navegador para que puedas escucharla en tu análisis, y se borra al salir del análisis o al tocar «Borrar el audio ahora». <strong>Nunca se guarda ni se envía a Ágora.</strong></p>
        </P>
        <P title="3. Transcripción de tu voz">
          <p>Para contar muletillas, Ágora usa el reconocimiento de voz de tu navegador. Según el navegador, ese audio puede procesarse en los servidores de su fabricante (por ejemplo, Google en Chrome, Microsoft en Edge o Apple en Safari), bajo sus propias políticas.</p>
          <p>Si tu navegador lo permite, en Ajustes puedes activar «Transcribir en el dispositivo» para que el audio no salga del equipo, o desactivar la transcripción por completo. Sin transcripción, Ágora sigue midiendo ritmo, pausas, energía y vacilaciones.</p>
          <p>El texto transcrito se usa solo para tu análisis y se borra al salir, igual que el audio.</p>
        </P>
        <P title="4. Qué se guarda y dónde">
          <p>Solo en el almacenamiento de tu navegador, en este dispositivo:</p>
          <ul>
            <li>El nombre con el que quieres que te llame, tu meta diaria y tus ajustes.</li>
            <li>Las puntuaciones y métricas de cada práctica (ritmo, pausas, número de muletillas), sin audio ni el texto de lo que dijiste.</li>
            <li>Tu racha, tus logros, tu nivel, tu diagnóstico y tu plan.</li>
            <li>Los textos de las historias que escribas.</li>
            <li>Tu clave de API, solo si decides agregarla.</li>
          </ul>
          <p>Como Ágora no tiene servidor, nadie más puede ver estos datos, incluida la autora.</p>
        </P>
        <P title="5. Lo que Ágora no hace">
          <ul>
            <li>No usa cookies de seguimiento, analítica ni publicidad.</li>
            <li>No vende, comparte ni cede tus datos.</li>
            <li>No crea perfiles de las personas que la usan.</li>
          </ul>
        </P>
        <P title="6. Servicios de terceros">
          <ul>
            <li><strong>Alojamiento:</strong> la app se publica en GitHub Pages. Como cualquier sitio web, GitHub puede registrar datos técnicos de la conexión, como la dirección IP, según su propia política.</li>
            <li><strong>Tipografías:</strong> se cargan desde Google Fonts, lo que implica una solicitud a los servidores de Google.</li>
            <li><strong>Inteligencia artificial (opcional):</strong> solo si agregas tu clave de API de Anthropic y tocas un botón de IA, se envía el texto de tu práctica (nunca el audio) a Anthropic para generar la respuesta, según sus términos.</li>
          </ul>
        </P>
        <P title="7. Seguridad">
          <p>La app se sirve por conexión cifrada (HTTPS). Tus datos quedan en tu navegador sin cifrado adicional: cualquier persona con acceso a tu teléfono y a ese navegador podría verlos. Protege tu dispositivo con bloqueo de pantalla.</p>
          <p>Tu clave de API se guarda solo en este dispositivo y no se incluye en las copias de tu progreso.</p>
        </P>
        <P title="8. Permisos del dispositivo">
          <ul>
            <li><strong>Micrófono:</strong> solo mientras practicas.</li>
            <li><strong>Cámara:</strong> solo en los ejercicios de espejo, para que te veas. La imagen no se graba ni se guarda.</li>
            <li><strong>Vibración:</strong> para avisarte de una muletilla, si lo activas.</li>
          </ul>
        </P>
        <P title="9. Tus opciones">
          <ul>
            <li>Descargar tus datos: Ajustes → «Guardar copia».</li>
            <li>Borrarlos: Ajustes → «Borrar todo mi progreso», o borrando los datos del sitio en tu navegador.</li>
            <li>Desactivar la transcripción o la IA en cualquier momento, desde Ajustes.</li>
          </ul>
        </P>
        <P title="10. Cambios a esta política">
          <p>Si esta política cambia, se actualizará aquí junto con la fecha de la última actualización.</p>
        </P>
      </section>

      <About />
    </main>
  );
}
