// Lecturas y conversaciones por tema: textos para leer en voz alta, palabras para ampliar el vocabulario,
// preguntas para conversar (o improvisar) y un libro para seguir leyendo.

export const READINGS = [
  {
    id: 'escuchar',
    cat: 'Comunicación',
    title: 'El arte de escuchar',
    text: 'Solemos pensar que comunicar es hablar bien, pero la mitad del trabajo ocurre en silencio. Escuchar de verdad significa dejar de preparar tu respuesta mientras la otra persona todavía está hablando. Es mirar, asentir y hacer una pregunta que demuestre que entendiste. Cuando alguien se siente escuchado, baja la guardia y se abre a nuevas ideas. En una reunión, la persona que mejor escucha suele ser la que mejor resume, y quien resume bien termina guiando la conversación. Prueba esto hoy: antes de responder, repite con tus palabras lo que te dijeron. «Si te entiendo bien, lo que te preocupa es el plazo». Esa frase sencilla evita malentendidos, ahorra tiempo y construye confianza. Escuchar no es un gesto pasivo: es la forma más respetuosa de liderar una conversación.',
    words: [
      { w: 'parafrasear', def: 'Repetir con tus propias palabras lo que dijo otra persona.' },
      { w: 'asentir', def: 'Mostrar acuerdo o atención con un gesto de la cabeza.' },
      { w: 'malentendido', def: 'Interpretación equivocada de lo que se dijo.' },
    ],
    talk: [
      '¿Quién es la persona que mejor te escucha y qué hace diferente?',
      '¿Es más difícil escuchar en el trabajo o en la familia? Explica por qué.',
      'Cuenta una vez en que un malentendido se resolvió con una buena pregunta.',
    ],
    book: { title: 'Inteligencia emocional', author: 'Daniel Goleman', why: 'Explica cómo la empatía y el autocontrol mejoran nuestras conversaciones.' },
  },
  {
    id: 'liderar',
    cat: 'Liderazgo',
    title: 'Liderar con el ejemplo',
    text: 'Un equipo aprende más de lo que ve que de lo que escucha. Si quien dirige llega tarde, nadie cree en la puntualidad; si reconoce sus errores, el equipo se atreve a reconocer los suyos. Liderar con el ejemplo no exige discursos largos, sino coherencia diaria entre lo que dices y lo que haces. Los buenos líderes explican el porqué de las decisiones, piden opinión antes de decidir y dan crédito en público. Cuando algo sale mal, preguntan qué podemos aprender antes de preguntar quién tuvo la culpa. Esa actitud crea un ambiente donde las personas proponen, prueban y mejoran. Al final, la autoridad más duradera no viene del cargo, sino de la confianza que construyes cada día con pequeños actos.',
    words: [
      { w: 'coherencia', def: 'Relación lógica entre lo que se dice y lo que se hace.' },
      { w: 'reconocer', def: 'Admitir algo como cierto; también, valorar el mérito de alguien.' },
      { w: 'duradero', def: 'Que se mantiene en el tiempo.' },
    ],
    talk: [
      '¿Qué líder te marcó y por qué?',
      '¿Se nace líder o se aprende a serlo? Toma una postura.',
      '¿Cómo darías una mala noticia a tu equipo sin perder su confianza?',
    ],
    book: { title: 'Los 7 hábitos de la gente altamente efectiva', author: 'Stephen R. Covey', why: 'Un clásico sobre coherencia personal y liderazgo.' },
  },
  {
    id: 'domingo',
    cat: 'Cultura dominicana',
    title: 'La mesa del domingo',
    text: 'En muchos hogares dominicanos, el domingo tiene olor a sazón. Desde temprano se escucha el cuchillo en la tabla, el caldero en el fogón y alguien que pregunta si ya llegaron los primos. La comida del domingo es más que un almuerzo: es el lugar donde se cuentan las noticias de la semana, se discuten los juegos de pelota y se ponen al día los cuentos de la familia. La abuela sirve primero a los demás y come de última. Los niños esperan el concón como un premio. Alrededor de esa mesa aprendimos a esperar el turno para hablar, a contar historias con gracia y a defender una opinión con cariño. Quizás nuestra primera escuela de oratoria fue, sin saberlo, la mesa del domingo.',
    words: [
      { w: 'concón', def: 'La capa de arroz tostado que queda en el fondo del caldero.' },
      { w: 'fogón', def: 'Lugar de la cocina donde se hace el fuego para cocinar.' },
      { w: 'sazón', def: 'Punto de sabor de una comida; también, el toque de quien cocina.' },
    ],
    talk: [
      '¿Qué plato no puede faltar en tu mesa del domingo y por qué?',
      'Cuenta una historia que siempre se repite en tu familia.',
      '¿Qué costumbre dominicana le enseñarías a alguien de otro país?',
    ],
    book: { title: 'Cuentos escritos en el exilio', author: 'Juan Bosch', why: 'Relatos dominicanos cortos, perfectos para leer en voz alta y aprender a narrar.' },
  },
  {
    id: 'ia',
    cat: 'Tecnología',
    title: 'La inteligencia artificial en el día a día',
    text: 'La inteligencia artificial ya no es cosa de películas. Está en el teclado que te sugiere la siguiente palabra, en el mapa que calcula la ruta con menos tráfico y en las aplicaciones que transcriben lo que dices. Estas herramientas aprenden patrones a partir de enormes cantidades de datos y responden con rapidez, pero no piensan como una persona ni conocen tu contexto. Por eso la pregunta importante no es si debemos usarlas, sino cómo usarlas bien. Revisar lo que producen, proteger nuestros datos y decidir con criterio propio son habilidades que cada vez valen más. La tecnología puede ahorrarnos tiempo; lo que hagamos con ese tiempo sigue siendo una decisión humana.',
    words: [
      { w: 'patrón', def: 'Modelo que se repite y permite predecir algo.' },
      { w: 'criterio', def: 'Norma o juicio para decidir o valorar algo.' },
      { w: 'transcribir', def: 'Pasar a texto escrito lo que se dice en voz alta.' },
    ],
    talk: [
      '¿Para qué usarías la inteligencia artificial en tu trabajo y para qué no?',
      '¿Quién debería responder por el error de una máquina? Defiende tu postura.',
      'Explica a una persona mayor qué es la inteligencia artificial en un minuto.',
    ],
    book: { title: 'Sapiens. De animales a dioses', author: 'Yuval Noah Harari', why: 'Da contexto sobre cómo las grandes innovaciones han transformado a la humanidad.' },
  },
  {
    id: 'descanso',
    cat: 'Bienestar',
    title: 'Descansar también es producir',
    text: 'Vivimos con la sensación de que siempre deberíamos estar haciendo algo. Sin embargo, el cerebro necesita pausas para ordenar lo aprendido y recuperar energía. Dormir bien mejora la memoria, el humor y la capacidad de concentrarnos. Una caminata corta al mediodía puede aclarar un problema que llevamos horas mirando en la pantalla. Incluso para hablar en público el descanso cuenta: una voz cansada pierde fuerza y una mente agotada busca muletillas. Descansar no es un premio para después del trabajo terminado; es parte del trabajo bien hecho. Pon tu descanso en la agenda con la misma seriedad que una reunión. Tu cuerpo, tu voz y tu equipo lo van a notar.',
    words: [
      { w: 'agotado', def: 'Muy cansado, sin energía.' },
      { w: 'concentración', def: 'Capacidad de mantener la atención en una sola cosa.' },
      { w: 'recuperar', def: 'Volver a tener algo que se había perdido.' },
    ],
    talk: [
      '¿Cómo descansas de verdad? Describe tu mejor manera de recargar energía.',
      '¿Debería evitarse enviar mensajes de trabajo de noche? Toma partido.',
      'Convence a alguien de dormir una hora más cada noche.',
    ],
    book: { title: 'Por qué dormimos', author: 'Matthew Walker', why: 'Explica con ciencia y buenos ejemplos por qué el sueño cambia cómo pensamos y sentimos.' },
  },
  {
    id: 'agua',
    cat: 'Medio ambiente',
    title: 'Cada gota cuenta',
    text: 'Abrimos la llave y el agua sale, tan fácil que olvidamos el largo camino que recorre. Viene de ríos y presas, pasa por plantas de tratamiento y viaja por tuberías hasta nuestra casa. En un país con sequías y temporadas de lluvias intensas, cuidar el agua es cuidar la salud, la agricultura y la energía. Hay gestos sencillos que suman: cerrar la llave mientras nos cepillamos, reparar una fuga a tiempo, reutilizar el agua de lavar para limpiar el patio. También cuenta lo que pedimos como comunidad: proteger las cuencas, reforestar las orillas de los ríos y no tirar basura en las cañadas. El agua no se fabrica; solo se cuida o se desperdicia.',
    words: [
      { w: 'cuenca', def: 'Territorio cuyas aguas desembocan en un mismo río o lago.' },
      { w: 'reforestar', def: 'Volver a plantar árboles donde se perdieron.' },
      { w: 'desperdiciar', def: 'Gastar algo sin provecho.' },
    ],
    talk: [
      '¿Qué harías si fueras responsable del agua de tu ciudad durante un año?',
      'Convence a tu familia de ahorrar agua con tres acciones concretas.',
      '¿Quién tiene más responsabilidad: las personas o las empresas? Defiende tu postura.',
    ],
    book: { title: 'Primavera silenciosa', author: 'Rachel Carson', why: 'El libro que despertó la conciencia ambiental moderna.' },
  },
  {
    id: 'voz',
    cat: 'Ciencia y curiosidades',
    title: 'Lo que tu voz dice de ti',
    text: 'Antes de entender tus palabras, quien te escucha ya está leyendo tu voz. El tono, el volumen y la velocidad revelan si estás nerviosa, entusiasmada o cansada. La voz nace cuando el aire de los pulmones hace vibrar las cuerdas vocales, dos pequeños pliegues en la garganta que se abren y se cierran cientos de veces por segundo. Luego la boca, la nariz y la garganta funcionan como una caja de resonancia que da a cada voz su color único. Por eso la voz se puede entrenar como un músculo: respirar desde el abdomen le da apoyo, relajar la mandíbula le da claridad y variar el tono le da vida. Tu voz no es fija; es un instrumento que aprendes a tocar.',
    words: [
      { w: 'resonancia', def: 'Prolongación y amplificación de un sonido dentro de un espacio.' },
      { w: 'cuerdas vocales', def: 'Pliegues de la laringe que vibran para producir la voz.' },
      { w: 'timbre', def: 'El color propio de una voz o de un instrumento.' },
    ],
    talk: [
      '¿Qué voz te inspira confianza (de la radio, el cine o tu entorno) y por qué?',
      'Explica cómo se produce la voz como si hablaras con una niña de diez años.',
      '¿Se puede conocer a alguien solo por su voz? Da tu opinión con un ejemplo.',
    ],
    book: { title: 'Charlas TED: la guía oficial TED para hablar en público', author: 'Chris Anderson', why: 'Consejos prácticos de quien dirige las charlas TED.' },
  },
  {
    id: 'mariposas',
    cat: 'Historia y valores',
    title: 'Las Mariposas',
    text: 'El 25 de noviembre de 1960, las hermanas Patria, Minerva y María Teresa Mirabal fueron asesinadas por orden de la dictadura de Trujillo. Las recordamos como las Mariposas, el nombre con que se les conocía en la lucha clandestina. Su valentía se convirtió en un símbolo de dignidad para el pueblo dominicano, y su muerte avivó el rechazo contra el régimen. Años después, la Asamblea General de las Naciones Unidas declaró el 25 de noviembre como el Día Internacional de la Eliminación de la Violencia contra la Mujer. Hoy su historia nos recuerda que alzar la voz tiene un precio, pero que el silencio ante la injusticia cuesta todavía más. Contarla es una forma de mantener viva su palabra.',
    words: [
      { w: 'clandestino', def: 'Secreto, hecho a escondidas de la autoridad.' },
      { w: 'régimen', def: 'Sistema de gobierno; aquí, la dictadura.' },
      { w: 'dignidad', def: 'Valor que tiene toda persona y que merece respeto.' },
    ],
    talk: [
      '¿Qué significa para ti alzar la voz ante una injusticia?',
      'Cuenta la historia de una mujer dominicana que admires.',
      '¿Cómo le explicarías a un adolescente por qué recordamos el 25 de noviembre?',
    ],
    book: { title: 'En el tiempo de las mariposas', author: 'Julia Álvarez', why: 'Novela sobre las hermanas Mirabal, contada con cuatro voces distintas.' },
  },
  {
    id: 'aprender',
    cat: 'Educación',
    title: 'Nunca es tarde para aprender',
    text: 'Durante mucho tiempo se creyó que el cerebro adulto ya no cambiaba. Hoy sabemos que aprende toda la vida: cada vez que practicamos algo nuevo, se refuerzan conexiones entre neuronas. Por eso aprender un idioma, un instrumento o a hablar mejor en público es posible a cualquier edad. El secreto no está en el talento, sino en la práctica frecuente y en equivocarse sin miedo. Diez minutos diarios valen más que dos horas un solo día, porque la práctica espaciada ayuda a fijar lo aprendido. Cuando algo nos cuesta, no es señal de que no servimos para eso; es señal de que el cerebro está trabajando. La curiosidad no tiene fecha de vencimiento.',
    words: [
      { w: 'neurona', def: 'Célula del sistema nervioso que transmite información.' },
      { w: 'espaciado', def: 'Con intervalos de tiempo entre una vez y otra.' },
      { w: 'vencimiento', def: 'Momento en que algo termina o deja de valer.' },
    ],
    talk: [
      '¿Qué te gustaría aprender este año y qué te detiene?',
      'Cuenta algo que aprendiste de adulta y cómo lo lograste.',
      '¿Debería la escuela enseñar a hablar en público? Defiende tu respuesta.',
    ],
    book: { title: 'Mindset: la actitud del éxito', author: 'Carol S. Dweck', why: 'Explica la mentalidad de crecimiento: las habilidades se desarrollan con esfuerzo.' },
  },
  {
    id: 'lenguaje-claro',
    cat: 'Servicio público',
    title: 'La justicia que se entiende',
    text: 'Una sentencia, un formulario o una carta institucional solo cumplen su propósito si la persona que los recibe puede entenderlos. El lenguaje claro busca exactamente eso: frases cortas, palabras conocidas, el mensaje principal al inicio y los pasos siguientes bien explicados. No se trata de simplificar la ley ni de perder precisión, sino de pensar en quien lee. Cuando la ciudadanía entiende lo que se decidió y por qué, confía más en sus instituciones y sabe cómo ejercer sus derechos. Hablar claro también es una forma de servicio: ahorra dudas, reduce errores y acerca la justicia a la gente. La próxima vez que expliques algo técnico, pregúntate: ¿lo entendería mi vecina?',
    words: [
      { w: 'precisión', def: 'Exactitud en el uso de las palabras y los datos.' },
      { w: 'ciudadanía', def: 'Conjunto de personas de un país, con sus derechos y deberes.' },
      { w: 'propósito', def: 'Objetivo o intención de algo.' },
    ],
    talk: [
      'Explica un trámite complicado en menos de un minuto y sin tecnicismos.',
      '¿Por qué crees que muchas instituciones escriben de forma difícil?',
      'Convence a tu equipo de usar lenguaje claro en sus documentos.',
    ],
    book: { title: 'Cómo hablar bien en público e influir en los hombres de negocios', author: 'Dale Carnegie', why: 'Un clásico con técnicas sencillas para comunicar con claridad y confianza.' },
  },
  {
    id: 'historias',
    cat: 'Storytelling',
    title: 'Por qué recordamos las historias',
    text: 'Si te pido que recuerdes una lista de datos de la semana pasada, probablemente te costará. Pero si te cuento lo que le pasó a una amiga que perdió el avión y terminó conociendo a su futura socia en el aeropuerto, lo recordarás por años. Las historias tienen personajes, un conflicto y un cambio, y esa forma se parece a cómo nuestra memoria organiza la experiencia. Además, cuando escuchamos un relato imaginamos las escenas y sentimos parte de las emociones, como si lo viviéramos. Por eso los mejores discursos no empiezan con cifras, sino con una persona en un momento concreto. Los datos convencen a la mente; las historias mueven a la gente. Usa ambos, pero empieza por la historia.',
    words: [
      { w: 'relato', def: 'Narración de un hecho real o imaginado.' },
      { w: 'conflicto', def: 'Problema u obstáculo que el personaje debe enfrentar.' },
      { w: 'concreto', def: 'Preciso, específico, que se puede imaginar.' },
    ],
    talk: [
      'Cuenta en un minuto cómo llegaste a tu trabajo actual.',
      '¿Qué historia te contaron de niña que todavía recuerdas? ¿Por qué se te quedó?',
      '¿Convencen más los datos o las historias? Toma partido.',
    ],
    book: { title: 'Vivir para contarla', author: 'Gabriel García Márquez', why: 'Memorias de un maestro del relato: leyéndolo se aprende a narrar.' },
  },
];

export const readingById = (id) => READINGS.find((r) => r.id === id);
export const readingMinutes = (r) => Math.max(1, Math.round(r.text.split(/\s+/).length / 140));
