// Trabalenguas tradicionales y frases de dicción.
// diagram: posición de la lengua o los labios para el sonido de foco.

export const TWISTERS = [
  {
    id: 'tw-tr', title: 'Precisión con la «tr»', level: 2, focus: ['tr'], diagram: 'alveolar',
    text: 'Tres tristes tigres tragaban trigo en un trigal.',
    tip: 'La punta de la lengua da un golpe rápido detrás de los dientes de arriba, justo después de la «t».',
    dialect: 'Marca la «s» final: «tigres», no «tigre’».',
  },
  {
    id: 'tw-perro', title: 'La «rr» que vibra', level: 2, focus: ['rr', 'r'], diagram: 'alveolar',
    text: 'El perro de San Roque no tiene rabo, porque Ramón Rodríguez se lo ha robado.',
    tip: 'Relaja la lengua y deja que vibre con el aire. Si te cuesta, empieza con «drrr».',
    dialect: 'Di «porque», no «poique»: la «r» antes de consonante también suena.',
  },
  {
    id: 'tw-erre', title: 'Velocidad con la «r»', level: 3, focus: ['rr', 'r'], diagram: 'alveolar',
    text: 'Erre con erre cigarro, erre con erre barril, rápido ruedan los carros cargados de azúcar del ferrocarril.',
    tip: 'Empieza lento y sube la velocidad solo si cada «rr» vibra.',
    dialect: 'Cuida los finales: «azúcar», «barril», «ferrocarril».',
  },
  {
    id: 'tw-pablito', title: 'Grupos «bl» y «cl»', level: 1, focus: ['bl', 'cl'], diagram: 'bilabial',
    text: 'Pablito clavó un clavito. ¿Qué clavito clavó Pablito?',
    tip: 'Pronuncia las dos consonantes juntas: «cla», no «ca-la».',
    dialect: null,
  },
  {
    id: 'tw-pepe', title: 'Labios firmes con la «p»', level: 1, focus: ['p'], diagram: 'bilabial',
    text: 'Pepe Pecas pica papas con un pico; con un pico pica papas Pepe Pecas.',
    tip: 'Junta bien los labios y suelta el aire en cada «p».',
    dialect: 'Marca la «s» de «papas» y «Pecas».',
  },
  {
    id: 'tw-coco', title: 'La «c» fuerte', level: 1, focus: ['c'], diagram: 'velar',
    text: 'Como poco coco como, poco coco compro.',
    tip: 'La parte de atrás de la lengua toca el paladar blando en cada «c».',
    dialect: null,
  },
  {
    id: 'tw-pancha', title: 'La «ch» y la «pl»', level: 2, focus: ['ch', 'pl'], diagram: 'palatal',
    text: 'Si Pancha plancha con cuatro planchas, ¿con cuántas planchas plancha Pancha?',
    tip: 'Para la «ch», la lengua toca el paladar y se suelta de golpe.',
    dialect: 'Di «cuántas planchas» con todas sus «s».',
  },
  {
    id: 'tw-cielo', title: 'Palabras largas', level: 3, focus: ['dr', 'll'], diagram: 'alveolar',
    text: 'El cielo está enladrillado. ¿Quién lo desenladrillará? El desenladrillador que lo desenladrille, buen desenladrillador será.',
    tip: 'Separa en sílabas: des-en-la-dri-lla-dor. Luego júntalas sin perder ninguna.',
    dialect: 'Cuida la «r» final: «será», «desenladrillador».',
  },
  {
    id: 'tw-s-final', title: 'La «s» final', level: 1, focus: ['s'], diagram: 'alveolar',
    text: 'Los niños buscan sus lápices azules entre las mesas limpias.',
    tip: 'Cierra cada palabra con un soplo corto de «s», sin exagerar.',
    dialect: 'En contextos formales, la «s» final da claridad: «los niños», no «lo’ niño’».',
  },
  {
    id: 'tw-r-final', title: 'La «r» antes de consonante', level: 2, focus: ['r'], diagram: 'alveolar',
    text: 'Por la tarde, el carpintero corta la madera verde para el puerto.',
    tip: 'Toca un instante detrás de los dientes en cada «r»: «tar-de», «puer-to».',
    dialect: 'Evita cambiarla por «l» o «i»: «puerto», no «puelto» ni «pueito».',
  },
  {
    id: 'tw-ado', title: 'La «d» de «-ado»', level: 1, focus: ['d'], diagram: 'alveolar',
    text: 'El pescado asado quedó delicioso y muy bien condimentado.',
    tip: 'Toca suavemente los dientes de arriba con la lengua en cada «d».',
    dialect: 'Di «pescado» y «asado», no «pescao» ni «asao».',
  },
  {
    id: 'tw-l-r', title: '«L» y «r» en su lugar', level: 2, focus: ['l', 'r'], diagram: 'alveolar',
    text: 'El alcalde habló con el público del mercado central.',
    tip: 'Para la «l», la lengua se queda apoyada; para la «r», da un toque rápido.',
    dialect: 'Cuida «alcalde», «mercado» y «central»: cada consonante en su lugar.',
  },
  {
    id: 'tw-vocales', title: 'Vocales claras', level: 1, focus: ['a', 'e', 'i', 'o', 'u'], diagram: 'vocal',
    text: 'Ana, Elena, Irene, Olga y Úrsula usan una ruta única.',
    tip: 'Abre bien la boca en la «a», sonríe en la «i» y redondea los labios en la «o» y la «u».',
    dialect: null,
  },
];

export const twisterById = (id) => TWISTERS.find((t) => t.id === id);

export const DIAGRAM_TEXT = {
  alveolar: 'La punta de la lengua toca justo detrás de los dientes de arriba.',
  bilabial: 'Los labios se juntan y se sueltan con el aire.',
  velar: 'La parte de atrás de la lengua sube hacia el paladar blando.',
  palatal: 'El centro de la lengua se apoya en el paladar.',
  vocal: 'La boca se abre y la lengua queda baja y relajada.',
};

// Resalta las letras de foco en un texto: devuelve [{text, hit}].
export function highlightFocus(text, focus) {
  const pats = [...focus].sort((a, b) => b.length - a.length);
  const out = [];
  let buf = '';
  let i = 0;
  const lower = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  while (i < text.length) {
    let hit = null;
    for (const p of pats) {
      if (p.length === 1 && 'aeiou'.includes(p)) {
        // en vocales solo resaltamos la vocal inicial de cada palabra
        if (lower[i] === p && (i === 0 || /[^a-zñ]/.test(lower[i - 1]))) { hit = p; break; }
        continue;
      }
      if (lower.startsWith(p, i)) {
        if (p === 's' && /[a-zñ]/.test(lower[i + 1] || '')) continue; // «s» solo al final de palabra
        if (p === 'r' && !/[^aeiou]/.test(lower[i + 1] || 'a')) continue; // «r» antes de consonante o final
        if (p === 'd' && !(i > 0 && /[aeiou]/.test(lower[i - 1]) && /[aeiou]/.test(lower[i + 1] || ''))) continue;
        if (p === 'c' && !/[aou]/.test(lower[i + 1] || '')) continue;
        if (p === 'l' && /[aeiou]/.test(lower[i + 1] || '')) continue; // «l» antes de consonante
        hit = p;
        break;
      }
    }
    if (hit) {
      if (buf) out.push({ text: buf, hit: false });
      buf = '';
      out.push({ text: text.slice(i, i + hit.length), hit: true });
      i += hit.length;
    } else {
      buf += text[i];
      i++;
    }
  }
  if (buf) out.push({ text: buf, hit: false });
  return out;
}
