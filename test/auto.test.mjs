import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, seedRandom } from './harness.mjs';

const fn = (T, name) => T.__get(name);
const start = (T, auto, seed = 5) => { seedRandom(T, seed); T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 's', seed, fog: true, speed: 0, auto }); };
const mine = T => T.G.units.filter(u => u.nat === 0);

test('부관: 기본은 꺼져 있고 cfg.auto로 켠다', () => {
  const T = loadGame();
  start(T, undefined);
  assert.equal(!!T.G.nats[0].auto, false);
  start(T, true);
  assert.equal(T.G.nats[0].auto, true);
  assert.equal(T.G.nats[0].ctrl, 'human', '조작은 그대로 사람');
  assert.equal(!!T.G.nats[1].auto, false);
});

test('부관이 켜져 있으면 명령 없이도 부대가 움직인다', () => {
  const T = loadGame();
  start(T, true);
  const p0 = new Map(mine(T).map(u => [u.id, [u.x, u.z]]));
  T.rtRun(40);
  const moved = mine(T).filter(u => p0.has(u.id) && Math.hypot(u.x - p0.get(u.id)[0], u.z - p0.get(u.id)[1]) > 1).length;
  assert.ok(moved >= 3, `움직인 부대 ${moved}`);
  // 꺼져 있으면 그대로
  const T2 = loadGame();
  start(T2, false);
  const q0 = new Map(mine(T2).map(u => [u.id, [u.x, u.z]]));
  T2.rtRun(40);
  const moved2 = mine(T2).filter(u => q0.has(u.id) && Math.hypot(u.x - q0.get(u.id)[0], u.z - q0.get(u.id)[1]) > 1).length;
  assert.equal(moved2, 0);
});

test('직접 명령을 받은 부대는 부관이 손대지 않는다', () => {
  const T = loadGame();
  start(T, true);
  T.G.radio = false;
  const u = mine(T).find(o => o.type === 'rifle');
  const tx = T.N / 2 + .5, tz = T.N / 2 + .5;
  fn(T, 'radioSend')(0, [u], 'move', [tx, tz]);
  assert.ok(u.man != null, '직접 지휘 표시');
  const end = u.path[u.path.length - 1].slice();
  for (let i = 0; i < 80; i++) { T.rtTick(.1); if (!u.path.length) break; const e = u.path[u.path.length - 1]; assert.ok(Math.hypot(e[0] - end[0], e[1] - end[1]) < .6, '부관이 목적지를 바꾸지 않음'); }
  assert.ok(!u.pl, '부관 소대에 들지 않음');
});

test('공격 목표를 주면 부관 소대가 그쪽을 노린다', () => {
  const T = loadGame();
  start(T, true);
  T.rtRun(6);
  const o = T.G.objs.find(o => T.G.map[o.r][o.c].owner !== 0) || T.G.objs[0];
  const I = fn(T, 'autoIntent')(0, 'atk', o.c + .7, o.r + .3);
  assert.equal(I.r, o.r); assert.equal(I.c, o.c);
  T.rtRun(8);
  const P = T.G.plat.filter(p => p.nat === 0 && !p.human && p.mode !== 'defend');
  assert.ok(P.length > 0);
  assert.ok(P.every(p => p.obj && p.obj[0] === o.r && p.obj[1] === o.c));
  // 방어 지점으로 바꾸면 방어
  fn(T, 'autoIntent')(0, 'def', o.c + .5, o.r + .5);
  T.rtRun(6);
  assert.ok(T.G.plat.filter(p => p.nat === 0 && p._idef).length > 0);
  // 재량으로 돌리면 공격으로
  fn(T, 'autoIntent')(0, null);
  T.rtRun(6);
  assert.equal(T.G.plat.filter(p => p.nat === 0 && p._idef).length, 0);
});

test('자동 증원을 끄면 부관이 부대를 사지 않는다', () => {
  const T = loadGame();
  start(T, true);
  T.G.nats[0].autoBuy = false;
  T.G.nats[0].cp = 60;
  const n0 = mine(T).length;
  T.rtRun(30);
  assert.ok(mine(T).length <= n0);
  T.G.nats[0].autoBuy = true;
  T.G.nats[0].cp = 60;
  T.rtRun(20);
  assert.ok(T.G.nats[0].cp < 60 || mine(T).length > n0, '켜면 산다');
});

test('부관을 끄면 부관 소대를 풀고 부대가 선다', () => {
  const T = loadGame();
  start(T, true);
  T.rtRun(10);
  assert.ok(T.G.plat.some(p => p.nat === 0));
  fn(T, 'autoSet')(0, false);
  assert.equal(T.G.plat.filter(p => p.nat === 0 && !p.human).length, 0);
  assert.ok(mine(T).every(u => !u.pl));
});

test('부관이 지휘하는 판도 오류 없이 끝까지 간다', () => {
  const T = loadGame();
  start(T, true, 11);
  for (let i = 0; i < 20000 && !T.G.over; i++) T.rtTick(.1);
  assert.ok(T.G.over, '판이 끝남');
  assert.equal((T.G.errs || []).length, 0, String((T.G.errs || [])[0]));
});
