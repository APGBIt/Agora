import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState, registerActivity, reconcileStreak, addDays, missionsFor, makePlan, todaysChallenge, weekRow, achievementStatus, dayKey, chartSeries, skillDeltas } from '../src/app/logic.js';
import { levelFor } from '../src/content/meta.js';

const at = (day, h = 10) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, h);
};

test('la racha sube día a día y se protege con un protector', () => {
  const s = defaultState();
  s.profile.createdAt = '2026-09-01';
  registerActivity(s, { kind: 'respiracion', practiceSec: 120, xp: 20 }, at('2026-09-01'));
  registerActivity(s, { kind: 'respiracion', practiceSec: 120, xp: 20 }, at('2026-09-02'));
  assert.equal(s.streak.count, 2);
  // falta el 3; el 4 practica: usa el protector
  const r = registerActivity(s, { kind: 'respiracion', practiceSec: 120, xp: 20 }, at('2026-09-04'));
  assert.equal(s.streak.count, 3);
  assert.equal(s.streak.freezes, 0);
  assert.deepEqual(s.streak.freezeDays, ['2026-09-03']);
  assert.ok(r.events.some((e) => e.type === 'freezeUsed'));
  // faltan dos días sin protector: se reinicia
  registerActivity(s, { kind: 'respiracion', practiceSec: 120, xp: 20 }, at('2026-09-07'));
  assert.equal(s.streak.count, 1);
  assert.equal(s.streak.best, 3);
});

test('reconciliar no consume protectores si la racha está en cero', () => {
  const s = defaultState();
  s.streak = { count: 0, best: 2, lastDay: '2026-09-01', freezes: 2, freezeDays: [] };
  reconcileStreak(s, '2026-09-05');
  assert.equal(s.streak.freezes, 2);
});

test('misiones completas dan un protector (máximo 3)', () => {
  const s = defaultState();
  s.profile.dailyGoalMin = 5;
  const today = '2026-09-10';
  const reto = todaysChallenge(s, today);
  const ms0 = missionsFor(s, today);
  assert.equal(ms0.length, 3);
  assert.ok(ms0.every((m) => !m.done));
  const rot = ms0[2].id;
  registerActivity(s, { kind: 'reto', refId: reto.id, practiceSec: 200, xp: 80 }, at(today, 9));
  // actividad que cumple la misión rotativa
  const byMission = {
    respira: { kind: 'respiracion' }, trabalenguas: { kind: 'trabalenguas' }, improv: { kind: 'improv' }, historia: { kind: 'historia' }, corporal: { kind: 'guiado' }, canto: { kind: 'canto', refId: 'canto-escala' }, lectura: { kind: 'lectura', refId: 'lec-escuchar' },
    limpio: { kind: 'libre', result: { activeSec: 60, wpmSource: 'asr', fillers: { total: 0, perMin: 0, top: [] }, comps: {} } },
    ritmo: { kind: 'libre', result: { activeSec: 60, wpm: 145, wpmSource: 'asr', comps: {} } },
    pausas: { kind: 'libre', result: { activeSec: 60, pauses: { effective: 5, long: 0 }, comps: {} } },
    energia: { kind: 'libre', result: { activeSec: 60, energy: { pitchStd: 3 }, comps: {} } },
  };
  const r = registerActivity(s, { ...byMission[rot], practiceSec: 120, xp: 20 }, at(today, 10));
  assert.ok(missionsFor(s, today).every((m) => m.done), 'todas hechas');
  assert.ok(r.events.some((e) => e.type === 'freezeEarned'));
  assert.equal(s.streak.freezes, 2);
});

test('plan: tres áreas más débiles y storytelling al final', () => {
  const plan = makePlan({ ritmo: 70, muletillas: 40, energia: 55, claridad: 80, seguridad: 50 });
  assert.deepEqual(plan, ['muletillas', 'seguridad', 'energia', 'storytelling']);
  const s = defaultState();
  s.diagnosis = { plan: { weeks: plan, start: '2026-09-01' } };
  assert.equal(todaysChallenge(s, '2026-09-03').focus, 'muletillas');
  const w2 = todaysChallenge(s, '2026-09-09').focus;
  assert.ok(['seguridad', 'persuasion'].includes(w2));
});

test('niveles y logros', () => {
  assert.equal(levelFor(0).n, 1);
  assert.equal(levelFor(1240).n, 4);
  assert.equal(Math.round(levelFor(1240).progress * 100), 73);
  const s = defaultState();
  registerActivity(s, { kind: 'libre', practiceSec: 60, xp: 30, result: { activeSec: 58, overall: 70, comps: {} } }, at('2026-09-10'));
  const st = achievementStatus(s);
  assert.ok(st.find((a) => a.id === 'primera').unlocked);
  assert.ok(!st.find((a) => a.id === 'racha-7').unlocked);
});

test('semana, gráfica y variación de habilidades', () => {
  const s = defaultState();
  s.profile.createdAt = '2026-09-20';
  registerActivity(s, { kind: 'respiracion', practiceSec: 600, xp: 20, skills: { ritmo: 60 } }, at('2026-08-20'));
  registerActivity(s, { kind: 'respiracion', practiceSec: 300, xp: 20, skills: { ritmo: 80 } }, at('2026-09-22'));
  const row = weekRow(s, '2026-09-24');
  assert.equal(row.length, 7);
  assert.equal(row[0].day, '2026-09-21');
  assert.equal(row[1].state, 'done');
  assert.equal(row[2].state, 'missed');
  assert.equal(row[3].state, 'today');
  const ch = chartSeries(s, '2026-09-24', 'semana');
  assert.equal(ch[1].value, 5);
  const d = skillDeltas(s, '2026-09-24');
  assert.equal(d.ritmo, 6);
  assert.equal(dayKey(at('2026-09-24')), '2026-09-24');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});
