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
  // 꺼져 있으면 전투 부대는 그대로(지원 부대만 알아서)
  const T2 = loadGame();
  start(T2, false);
  const SR = T2.__eval('SELF_RUN');
  const q0 = new Map(mine(T2).filter(u => !SR[u.type]).map(u => [u.id, [u.x, u.z]]));
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

test('직접 지휘 세력도 보급 트럭은 알아서 멀리 있는 부대에 탄약을 나르고, 직접 명령하면 그동안은 따른다', () => {
  const T = loadGame();
  start(T, false);
  const G = T.G; G.radio = false;
  const d = T.__eval('depotOf')(0);
  const tr = T.mkUnit(0, 'sup', Math.floor(d.z), Math.floor(d.x));
  const e = mine(T).find(u => u.type === 'rifle');
  const far = T.N / 2;
  e.x = far + .5; e.z = far + .5; e.r = Math.floor(e.z); e.c = Math.floor(e.x); e.am = 0;
  assert.ok(Math.hypot(e.x - tr.x, e.z - tr.z) > 6, '5칸보다 멀리');
  assert.equal(T.__eval('selfRun')(tr), true);
  for (let i = 0; i < 40 && !(tr.lj && tr.lj.k === 'serve'); i++) T.rtTick(.1);
  assert.equal(tr.lj && tr.lj.k, 'serve', '사람 세력 트럭도 스스로 감');
  // 직접 명령: 그동안은 자동 임무가 아님
  fn(T, 'radioSend')(0, [tr], 'move', [d.x, d.z + 1]);
  assert.equal(T.__eval('selfRun')(tr), false);
});

test('직접 지휘 세력의 구급차도 부상자를 찾아 간다', () => {
  const T = loadGame();
  start(T, false);
  const sr = T.__eval('selfRun');
  const d = T.__eval('depotOf')(0);
  const a = T.mkUnit(0, 'amb', Math.floor(d.z), Math.floor(d.x));
  assert.equal(sr(a), true);
  const r = mine(T).find(u => u.type === 'rifle');
  assert.equal(sr(r), false, '전투 부대는 그대로 직접 지휘');
});

test('기초 훈련: 부관에게 맡기고 공격 목표를 정하면 마지막 단계로', () => {
  const T = loadGame();
  fn(T, 'scnSetup')('tut', 0);
  const G = T.G;
  assert.equal(!!G.nats[0].auto, false, '훈련은 직접 지휘로 시작');
  G.tut = 5;
  fn(T, 'autoSet')(0, true); fn(T, 'scnAfterAct')();
  assert.equal(G.tut, 6);
  const o = G.objs[0]; fn(T, 'autoIntent')(0, 'atk', o.c + .5, o.r + .5); fn(T, 'scnAfterAct')();
  assert.equal(G.tut, 7);
  assert.match(fn(T, 'scnObjective')().t, /8\/8/);
});

test('직접 지휘 세력도 정찰 드론·박격포는 알아서 움직이고, 지휘점수는 쓰지 않는다', () => {
  const T = loadGame();
  start(T, false);
  const G = T.G;
  const d = T.__eval('depotOf')(0);
  const dr = T.mkUnit(0, 'drone', Math.floor(d.z), Math.floor(d.x));
  const x0 = dr.x, z0 = dr.z;
  G.nats[0].cp = 80;
  const n0 = mine(T).length;
  const rifles = mine(T).filter(u => u.type === 'rifle').map(u => [u, u.x, u.z]);
  T.rtRun(40);
  assert.ok(Math.hypot(dr.x - x0, dr.z - z0) > 1.5 || !G.units.includes(dr), '드론이 정찰하러 나감');
  assert.ok(mine(T).length <= n0 + 0, '증원을 사지 않음');
  assert.ok(rifles.every(([u, x, z]) => !G.units.includes(u) || Math.hypot(u.x - x, u.z - z) < 1), '소총 분대는 그대로');
  assert.equal((G.errs || []).length, 0, String((G.errs || [])[0]));
});
