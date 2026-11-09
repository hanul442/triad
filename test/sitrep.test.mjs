import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, seedRandom } from './harness.mjs';

const start = (T, auto, seed = 5) => { seedRandom(T, seed); T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 's', seed, fog: true, speed: 0, auto }); };
const reps = T => [...T.G.sit.r.values()];

test('전황 보고: 내 거점에 적이 붙으면 보고하고, 떠나면 잠시 뒤 지운다', () => {
  const T = loadGame();
  start(T, true);
  const G = T.G;
  const o = G.objs[0];
  G.map[o.r][o.c].owner = 0;
  T.rtTick(0.1);
  // 거점 옆에 적 보병을 세우고, 시야 계산과 무관하게 보이게 한다
  G.fog = false;
  const e = T.__get('mkUnit')(1, 'rifle', o.r, o.c);
  e.x = o.c + 1.5; e.z = o.r + .5;
  for (let i = 0; i < 12; i++) T.rtTick(0.1);
  const r = reps(T).find(x => x.k === 'thr:0');
  assert.ok(r, '거점 공격 보고: ' + reps(T).map(x => x.k).join(','));
  assert.match(r.txt, /공격받음/);
  assert.ok(r.acts.some(a => a[0] === 'buy'), '증원 버튼');
  T.G.units.splice(T.G.units.indexOf(e), 1);
  for (let i = 0; i < 130; i++) T.rtTick(0.1);
  assert.ok(!reps(T).some(x => x.k === 'thr:0'), '적이 떠나면 지운다');
});

test('전황 보고: 증원 버튼은 보고 자리에서 가까운 배치 칸에 바로 내린다', () => {
  const T = loadGame();
  start(T, false);
  const G = T.G;
  G.nats[0].cp = 50;
  const [u0] = G.units.filter(u => u.nat === 0);
  G.sit.r.set('t', { k: 't', pri: 3, x: u0.x, z: u0.z, txt: '시험', sub: '', acts: [['buy', 'at', u0.x, u0.z]], t: G.time, t0: G.time, seq: 1, hold: 99 });
  const n0 = G.units.length;
  assert.equal(T.__get('sitDo')('t', 0), true);
  assert.equal(G.units.length, n0 + 1);
  const u = G.units[G.units.length - 1];
  assert.equal(u.type, 'at');
  assert.ok(Math.hypot(u.x - u0.x, u.z - u0.z) < 6, '보고 자리 가까이');
  assert.equal(G.nats[0].cp, 50 - T.UT.at.cost);
});

test('전황 보고: 탄약 바닥·적 기갑처럼 필요한 부대가 없으면 요청한다', () => {
  const T = loadGame();
  start(T, false);
  const G = T.G;
  G.fog = false;
  for (const u of G.units.filter(u => u.nat === 0 && ['sup', 'at', 'atgm', 'tank', 'eng'].includes(u.type))) G.units.splice(G.units.indexOf(u), 1);
  const inf = G.units.filter(u => u.nat === 0 && T.__eval('amMax')(u)).slice(0, 2);
  for (const u of inf) u.am = 0;
  T.__get('mkUnit')(1, 'tank', 3, 3);
  for (let i = 0; i < 12; i++) T.rtTick(0.1);
  const ks = reps(T).map(x => x.k);
  if (inf.length >= 2 && !T.G.units.some(u => u.nat === 0 && u.type === 'sup')) assert.ok(ks.includes('ammo'), ks.join(','));
  assert.ok(ks.includes('armor'), ks.join(','));
});

test('전황 보고: 관전(AI끼리)에서는 아무것도 하지 않는다', () => {
  const T = loadGame();
  seedRandom(T, 3);
  T.newGame({ slots: ['ai', 'ai', 'none', 'none'], size: 's', seed: 3, fog: true, speed: 0 });
  T.rtRun(30);
  assert.equal(T.G.sit.r.size, 0);
});

test('전황 보고: 방어 버튼은 가장 가까운 중대에 그 거점 방어를 맡기고, 증원은 그 중대로 간다', () => {
  const T = loadGame();
  start(T, true);
  const G = T.G;
  for (let i = 0; i < 30; i++) T.rtTick(0.1);
  const O = T.__get('orgOf')(0);
  assert.ok(O.co.length >= 1, '중대가 편성됨');
  const o = G.objs[0];
  G.sit.r.set('d', { k: 'd', pri: 3, x: o.c + .5, z: o.r + .5, txt: '시험', sub: '', acts: [['def', 0], ['buy', 'rifle', o.c + .5, o.r + .5]], t: G.time, t0: G.time, seq: 1, hold: 99 });
  assert.equal(T.__get('sitDo')('d', 0), true);
  const co = O.co.find(c => c.intent);
  assert.ok(co, '중대에 목표');
  assert.equal(co.intent.k, 'def');
  G.nats[0].cp = 50;
  assert.equal(T.__get('sitDo')('d', 1), true);
  const u = G.units[G.units.length - 1];
  const pq = O.pq.find(p => p.id === u.pq);
  assert.ok(pq && pq.co === co.id, '증원은 가까운 중대로');
});
