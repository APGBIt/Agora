import test from 'node:test';
import assert from 'node:assert/strict';
import { lexicalAnalysis, structureCoverage, cleanVersion, alignWords, words, scriptPosition } from '../src/speech/lexical.js';

const seg = (text, tStart = 0, tEnd = 3) => ({ text, tStart, tEnd, conf: 0.9 });

test('muletillas típicas del Caribe', () => {
  const a = lexicalAnalysis([
    seg('Este el año pasado mi área tenía que cambiar'),
    seg('o sea no había manera tú sabes'),
    seg('bueno la idea era organizarnos verdad'),
    seg('y este proyecto es importante para todos'),
    seg('en este momento eh estamos listos'),
  ]);
  const keys = a.fillers.map((f) => f.key);
  assert.deepEqual(keys, ['este', 'o sea', 'tú sabes', 'bueno', 'verdad', 'eh']);
});

test('«este» demostrativo y pronombre no cuentan', () => {
  const a = lexicalAnalysis([seg('este proyecto nació en este año'), seg('este es mi equipo de trabajo'), seg('de este modo avanzamos')]);
  assert.equal(a.fillers.length, 0);
});

test('«entonces» al inicio solo cuenta si se repite', () => {
  const one = lexicalAnalysis([seg('entonces hicimos el plan'), seg('luego lo presentamos')]);
  assert.equal(one.fillers.length, 0);
  const many = lexicalAnalysis([seg('entonces hicimos el plan'), seg('entonces lo presentamos'), seg('entonces nos aprobaron')]);
  assert.equal(many.fillers.filter((f) => f.key === 'entonces').length, 3);
});

test('palabras que restan fuerza', () => {
  const a = lexicalAnalysis([seg('creo que podríamos mejorar un poquito el proceso'), seg('tal vez el jueves no sé si le parece'), seg('necesito un poco de agua'), seg('no se puede')]);
  assert.deepEqual(a.weak.map((w) => w.key), ['creo que', 'un poquito', 'tal vez', 'no sé']);
});

test('repeticiones y conteo de palabras', () => {
  const a = lexicalAnalysis([seg('el el proyecto va muy muy bien eh')]);
  assert.equal(a.repetitions.length, 1);
  assert.equal(a.words, 7);
});

test('estructura STAR detectada', () => {
  const a = lexicalAnalysis([
    seg('el año pasado en mi área teníamos un problema con los expedientes'),
    seg('mi responsabilidad era ordenar el archivo'),
    seg('propuse un sistema de etiquetas y organicé al equipo'),
    seg('al final redujimos los retrasos a la mitad'),
  ]);
  const cov = structureCoverage('star', a.tokens);
  assert.equal(cov.covered, 4);
});

test('estructura del elevador con pregunta inicial y petición', () => {
  const a = lexicalAnalysis([
    seg('sabías que la mitad de los retrasos empieza por un documento que nadie encuentra'),
    seg('creamos un portal que reúne todos los protocolos'),
    seg('le pido quince minutos el jueves'),
  ]);
  const cov = structureCoverage('elevator', a.tokens);
  assert.deepEqual(cov.parts.map((p) => p.hit), [true, true, true, true]);
});

test('versión más limpia quita muletillas y suavizadores', () => {
  const segs = [seg('este creo que el portal ayuda mucho'), seg('o sea lo usamos todos los días')];
  const a = lexicalAnalysis(segs);
  const c = cleanVersion(segs, a.tokens, a.fillers, a.weak, a.repetitions);
  assert.equal(c.text, 'El portal ayuda mucho. Lo usamos todos los días.');
  assert.equal(c.removed, 5);
});

test('alineación de trabalenguas', () => {
  const target = words('Tres tristes tigres tragaban trigo en un trigal.');
  const heard = words('tres tristes tigre tragaban trigo en un');
  const r = alignWords(target, heard);
  assert.deepEqual(r.words.map((w) => w.status), ['ok', 'ok', 'casi', 'ok', 'ok', 'ok', 'ok', 'repite']);
  const heard2 = words('tres tristes tigres tragaba trigo un trigal');
  const r2 = alignWords(target, heard2);
  assert.equal(r2.words[5].status, 'repite');
  assert.ok(r2.accuracy > 0.8 && r2.accuracy < 1);
});

test('teleprompter avanza con lo que se oye', () => {
  const script = words('Hoy quiero contarles cómo cambiamos la forma de archivar los expedientes en nuestra oficina');
  let pos = scriptPosition(script, words('hoy quiero contarles'), 0);
  assert.equal(pos, 3);
  pos = scriptPosition(script, words('hoy quiero contarles cómo cambiamos la forma'), pos);
  assert.equal(pos, 7);
});
