// Escenarios del simulador de conversaciones.
// Las preguntas de seguimiento se eligen según la parte de la estructura que falte.

export const SCENARIOS = [
  {
    id: 'entrevista', title: 'Entrevista de trabajo', framework: 'star',
    persona: { name: 'Laura', role: 'entrevistadora', initials: 'LM', traits: ['Exigente', 'Va al grano', 'Repregunta'], formal: true },
    intro: 'Buenos días. Gracias por venir. Vamos a empezar.',
    questions: [
      'Cuénteme de una vez en que tuvo que convencer a alguien que no estaba de acuerdo con usted.',
      'Hábleme de un error profesional y de lo que aprendió de él.',
      'Describa una situación en la que trabajó bajo mucha presión.',
      '¿Cómo maneja un conflicto con un compañero de trabajo? Deme un ejemplo.',
      'Cuénteme de un logro del que se sienta orgullosa.',
      '¿Por qué deberíamos elegirla a usted para este puesto?',
    ],
    followups: {
      situacion: '¿En qué contexto pasó eso? Póngame en situación.',
      tarea: '¿Cuál era exactamente su responsabilidad ahí?',
      accion: '¿Qué hizo usted, concretamente? No el equipo: usted.',
      resultado: '¿Y cuál fue el resultado? ¿Lo puede medir?',
    },
    reactions: ['Entiendo.', 'Bien.', 'De acuerdo.', 'Interesante.'],
    closing: 'Muchas gracias. Con esto terminamos por hoy.',
  },
  {
    id: 'jefatura', title: 'Presentar a tu jefatura', framework: 'ppbp',
    persona: { name: 'Ramón', role: 'director', initials: 'RP', traits: ['Ocupado', 'Analítico', 'Pide datos'], formal: true },
    intro: 'Tengo pocos minutos. Adelante.',
    questions: [
      'Tiene dos minutos. ¿Qué quiere proponerme?',
      '¿Cuánto cuesta y de dónde saldría el presupuesto?',
      '¿Qué riesgos ve en su propuesta?',
      '¿Por qué ahora y no el próximo año?',
      '¿Qué necesita de mí, exactamente?',
    ],
    followups: {
      problema: '¿Cuál es el problema que quiere resolver?',
      propuesta: 'Concrete: ¿qué propone exactamente?',
      beneficio: '¿Y qué ganamos con eso? Deme un número.',
      peticion: '¿Qué me está pidiendo?',
    },
    reactions: ['Ajá.', 'Sigo escuchando.', 'Bien.', 'Entendido.'],
    closing: 'Lo voy a pensar. Envíeme un resumen de una página.',
  },
  {
    id: 'brindis', title: 'Brindis o discurso', framework: 'brindis',
    persona: { name: 'Invitados', role: 'celebración', initials: 'IN', traits: ['Emocionados', 'Atentos'], formal: false, group: true },
    intro: 'Te pasan el micrófono. Todos te miran con una copa en la mano.',
    questions: [
      'La celebración es por el aniversario de tu equipo. ¡Unas palabras!',
      '¡Otro! Ahora un brindis corto de veinte segundos por el futuro.',
      'Alguien grita: «¡Que cuente una anécdota!». Cuéntala.',
    ],
    followups: {
      anecdota: '¡Cuéntanos una historia de esos días!',
      mensaje: '¿Y qué es lo que más admiras?',
      brindis: '¡Falta el brindis! ¿Por qué brindamos?',
    },
    reactions: ['¡Bravo!', '¡Eso!', '¡Aplausos!'],
    closing: '¡Salud! El salón aplaude.',
  },
  {
    id: 'dificiles', title: 'Preguntas difíciles', framework: 'arp',
    persona: { name: 'Marcos', role: 'participante escéptico', initials: 'MA', traits: ['Escéptico', 'Directo'], formal: true },
    intro: 'Tengo algunas preguntas que nadie se atreve a hacer.',
    questions: [
      '¿No cree que este cambio llega demasiado tarde?',
      'Hay quien dice que su propuesta es muy costosa. ¿Qué responde?',
      '¿Cómo garantiza que esto va a funcionar?',
      'Si fracasa, ¿quién asume la responsabilidad?',
    ],
    followups: {
      reconocer: 'No me ha respondido. ¿Reconoce que hay un problema?',
      responder: 'Eso es muy general. ¿Tiene un dato?',
      puente: '¿Y entonces qué es lo importante aquí?',
    },
    reactions: ['Mmm.', 'Veremos.', 'Puede ser.'],
    closing: 'Gracias por responder. Seguiré atento.',
  },
  {
    id: 'capacitacion', title: 'Dar una capacitación', framework: 'oeev',
    persona: { name: 'Participantes', role: 'grupo de capacitación', initials: 'GP', traits: ['Curiosos', 'Algunos distraídos'], formal: false, group: true },
    intro: 'El grupo está listo. Tienes su atención… por ahora.',
    questions: [
      'Explica al grupo un procedimiento de tu área en dos minutos.',
      'Una participante pregunta: «¿Y eso cómo aplica en mi caso?».',
      'Alguien levanta la mano: «¿Puede darnos un ejemplo?».',
      '«¿Qué pasa si nos saltamos un paso?»',
    ],
    followups: {
      objetivo: '¿Para qué nos sirve esto?',
      explicacion: '¿Cuáles son los pasos, en orden?',
      ejemplo: '¿Tiene un ejemplo?',
      verificacion: '¿Nos puede hacer un resumen?',
    },
    reactions: ['Ok.', 'Anotado.', 'Ah, ya veo.'],
    closing: 'El grupo agradece la explicación.',
  },
  {
    id: 'feedback', title: 'Conversación difícil', framework: 'hipa',
    persona: { name: 'Pedro', role: 'colaborador', initials: 'PR', traits: ['A la defensiva', 'Sensible'], formal: false },
    intro: 'Pedro entra a la oficina. Sabe que quieres hablar con él.',
    questions: [
      'Pedro llegó tarde a tres reuniones esta semana. Díselo.',
      'Pedro responde: «Bueno, pero es que tengo mucho trabajo…».',
      '«¿Y qué quieres que haga?»',
      '«Está bien. ¿Algo más?»',
    ],
    followups: {
      hecho: '¿A qué te refieres exactamente?',
      impacto: '¿Y eso por qué es un problema?',
      peticion: '¿Qué esperas de mí?',
      acuerdo: '¿Entonces qué acordamos?',
    },
    reactions: ['Ya…', 'Entiendo.', 'Ok.'],
    closing: 'Pedro asiente: «Gracias por decírmelo así».',
  },
];

export const scenarioById = (id) => SCENARIOS.find((s) => s.id === id);
