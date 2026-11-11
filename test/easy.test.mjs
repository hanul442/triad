import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, seedRandom } from './harness.mjs';

const start = (T, auto, seed = 7) => { seedRandom(T, seed); T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 's', seed, fog: true, speed: 0, auto }); };
const mine = T => T.G.units.filter(u => u.nat === 0);
const QB = T => T.__eval('QB');

test('빠른 증원: 묶음 한 번에 여러 부대가 목표 가까이 들어온다', () => {
  const T = loadGame();
  start(T, false);
  T.G.nats[0].cp = 30;
  const n0 = mine(T).length;
  const b = QB(T).find(x => x.k === 'inf');
  const k = T.__eval('qbBuy')(0, b);
  assert.equal(k, 3, '소총 2 + 기관총');
  assert.equal(mine(T).length, n0 + 3);
  assert.equal(T.G.nats[0].cp, 30 - b.ts.reduce((a, t) => a + T.__eval('UT')[t].cost, 0));
});

test('빠른 증원: 지휘점수가 모자라면 예약되고 모이면 들어온다, 그동안 부관은 사지 않는다', () => {
  const T = loadGame();
  start(T, true);
  const N2 = T.G.nats[0];
  N2.cp = 0;
  N2.qb = 'tank';
  const tanks = () => mine(T).filter(u => u.type === 'tank').length;
  const t0 = tanks();
  const n0 = mine(T).length;
  T.rtRun(20);
  assert.equal(mine(T).length, n0, '예약 동안 부관 자동 증원은 기다림');
  N2.cp = 20;
  T.rtRun(2);
  assert.equal(tanks(), t0 + 1);
  assert.equal(N2.qb, null);
});

test('부관 추천: 가진 지휘점수 안에서 고른다', () => {
  const T = loadGame();
  start(T, true);
  const UT = T.__eval('UT');
  for (const cp of [3, 7, 20]) {
    const ts = T.__eval('qbAdjPick')(0, cp);
    assert.ok(ts.length >= 1 && ts.length <= 3, `cp ${cp}: ${ts}`);
    assert.ok(ts.reduce((a, t) => a + UT[t].cost, 0) <= cp);
  }
});

test('낱개 증원도 목표 가까운 배치 칸에 내린다', () => {
  const T = loadGame();
  start(T, true);
  T.G.nats[0].cp = 20;
  T.__eval('autoIntent')(0, 'atk', T.G.objs[0].c + .5, T.G.objs[0].r + .5);
  const u = T.__eval('qbPlace')(0, 'rifle');
  assert.ok(u, '배치됨');
  const sp = T.__eval('deploySpots')(0, 'rifle');
  const o = T.G.objs[0];
  const dist = T.__eval('dist'), kr = T.__eval('kr'), kc = T.__eval('kc');
  const d = dist(u.r, u.c, o.r, o.c);
  for (const k of sp) assert.ok(dist(kr(k), kc(k), o.r, o.c) >= d - 1e-9);
});
