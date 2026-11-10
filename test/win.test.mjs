import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './harness.mjs';

const fn = (T, name) => T.__get(name);
const start = (T, n = 2, size = 'm', seed = 4) => { fn(T, 'specStart')({ n, size, seed }); return T.G; };
const run = (T, s) => { for (let i = 0; i < s * 10 && !T.G.over; i++) T.rtTick(.1); };

test('승점 기준을 채워도 끝나지 않고, 16분이 끝나면 승점으로 정한다', () => {
  const T = loadGame(); const G = start(T);
  G.nats[0].vp = G.vpWin + 50;
  assert.equal(fn(T, 'checkOver')(), null);
  G.turn = G.maxR + 1;
  const o = fn(T, 'checkOver')();
  assert.equal(o.win, 0); assert.match(o.why, /16:00 종료, 승점 우세/);
});

test('거점 2/3를 쥐고 90초를 지키면 이기고, 하나라도 잃으면 시계가 다시 간다', () => {
  const T = loadGame(); const G = start(T);
  G.units = G.units.filter(u => u.nat === 0 && u.type === 'rifle').slice(0, 0);   // 점령 다툼이 없게 부대를 비운다
  G.nats[1].cp = 40;   // 붕괴로 끝나지 않게
  const need = T.__eval('winNeed')(); assert.equal(need, Math.ceil(G.objs.length * 2 / 3));
  const set = k => G.objs.forEach((o, i) => { G.map[o.r][o.c].owner = i < k ? 0 : i === G.objs.length - 1 ? 1 : null; });
  set(need); T.__eval('winTick')(); G.time = 60; T.__eval('winTick')();
  assert.ok(!G.over); assert.ok(G.winS.hold[0] != null);
  set(need - 1); G.time = 70; T.__eval('winTick')(); assert.equal(G.winS.hold[0], undefined, '하나 잃으면 풀림');
  set(need); G.time = 80; T.__eval('winTick')(); G.time = 165; T.__eval('winTick')(); assert.ok(!G.over, '다시 90초가 필요');
  G.time = 171; T.__eval('winTick')();
  assert.equal(G.over.win, 0); assert.match(G.over.why, /장악/);
});

test('전투력이 가장 센 적의 30% 밑이고 거점이 적으면 60초 뒤 항복한다(3분 뒤부터)', () => {
  const T = loadGame(); const G = start(T);
  G.objs.forEach((o, i) => { G.map[o.r][o.c].owner = i < 5 ? 0 : i < 7 ? 1 : null; });
  G.units = G.units.filter(u => u.nat === 0); G.nats[1].cp = 2;
  G.time = 100; T.__eval('winTick')(); assert.equal(G.winS.col[1], undefined, '3분 전엔 안 잰다');
  G.time = 200; T.__eval('winTick')(); assert.ok(G.winS.col[1] != null);
  G.time = 255; T.__eval('winTick')(); assert.ok(!G.over);
  G.time = 261; T.__eval('winTick')();
  assert.equal(G.over.win, 0); assert.match(G.over.why, /전선 붕괴/);
  assert.ok(G.objs.every(o => G.map[o.r][o.c].owner !== 1), '항복한 쪽 거점은 빈다');
});

test('3파전: 붕괴한 세력만 빠지고 판은 이어진다', () => {
  const T = loadGame(); const G = start(T, 3);
  G.objs.forEach((o, i) => { G.map[o.r][o.c].owner = i < 4 ? 0 : i < 8 ? 2 : null; });
  const third = G.order[2];
  G.units = G.units.filter(u => u.nat !== G.order[1]); G.nats[G.order[1]].cp = 0;
  G.time = 200; T.__eval('winTick')(); G.time = 261; T.__eval('winTick')();
  assert.ok(!G.over); assert.equal(G.nats[G.order[1]].alive, false); assert.ok(G.nats[third].alive);
});

test('적이 장악 시계를 돌리면 AI 계획은 그 적의 거점 공격을 앞세운다', () => {
  const T = loadGame(); const G = start(T);
  G.objs.forEach((o, i) => { G.map[o.r][o.c].owner = i < 8 ? 0 : 1; });
  G.winS = { hold: { 0: G.time || 0 }, col: {} };
  const Ts = fn(T, 'planTasks')(1, []);
  const a = Ts.filter(x => x.k === 'atk');
  assert.ok(a.length && a.every(x => x.pri >= 45 && x.why === '거점 장악 저지'));
});

test('목표 줄에 거점 수와 장악 기준이 보이고, 오류 없이 한 판이 끝난다', () => {
  const T = loadGame(); start(T, 2, 's', 9);
  const m = fn(T, 'scnObjective')(); assert.equal(m.t, '작전 목표'); assert.match(m.html, /장악 3\/4/);
  run(T, 1000);
  assert.ok(T.G.over); assert.equal((T.G.errs || []).length, 0, String((T.G.errs || [])[0]));
});
