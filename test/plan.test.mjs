import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, seedRandom } from './harness.mjs';

const fn = (T, name) => T.__get(name);
const run = (T, s) => { for (let i = 0; i < s * 10 && !T.G.over; i++) T.rtTick(0.1); };

test('작전 계획: AI 세력마다 주공을 정하고 소대가 그 목표로 간다', () => {
  const T = loadGame(); seedRandom(T, 11);
  fn(T, 'specStart')({ n: 2, size: 's', seed: 21 });
  run(T, 40);
  for (const n of T.G.order) {
    const P = T.G.plan && T.G.plan[n];
    assert.ok(P && P.T.length, `세력 ${n} 계획 없음`);
    assert.ok(P.want.length >= 1);
    // 계획에 든 소대는 맡은 과제의 거점을 목표로 삼는다
    const tasked = (T.G.plat || []).filter(p => p.nat === n && P.a['p' + p.id]);
    for (const p of tasked) { const x = P.T.find(q => q.id === P.a['p' + p.id]); assert.equal(JSON.stringify(p.obj), JSON.stringify([x.r, x.c])); }
  }
  assert.equal((T.G.errs || []).length, 0);
});

test('작전 계획: 위협받는 우리 거점은 방어 과제가 되고, 막 빼앗긴 거점은 역습한다', () => {
  const T = loadGame(); seedRandom(T, 12);
  fn(T, 'specStart')({ n: 2, size: 's', seed: 22 });
  run(T, 5);
  const G = T.G; const o = G.objs[0]; G.map[o.r][o.c].owner = 0;
  const e = G.units.find(u => u.nat === 1 && u.type === 'rifle');
  // 적 소총분대가 거점 곁에 보였다고 기억시킨다
  const M = fn(T, 'memOf')(0); M[e.id] = { x: o.c + 1.5, z: o.r + .5, h: .5, t: G.time };
  e.x = o.c + 1.5; e.z = o.r + .5; e.r = o.r; e.c = o.c + 1;
  const P = fn(T, 'planMake')(0);
  const d = P.T.find(x => x.id === 'd0');
  assert.ok(d && d.k === 'def' && d.est > 0, '방어 과제');
  assert.ok(P.want.includes('d0'));
  G.map[o.r][o.c].owner = 1; G.time += 1;
  const P2 = fn(T, 'planMake')(0);
  const a = P2.T.find(x => x.id === 'a0');
  assert.ok(a && a.cnt, '역습 과제');
});

test('대사관 철수: 험비·장갑차가 승차 지점으로 가서 피란민을 태운다', () => {
  const T = loadGame(); seedRandom(T, 13);
  fn(T, 'specStart')({ map: 'camp:evac', seed: 1 });
  run(T, 60);
  const S = T.G.camp.st;
  assert.ok(S.wait < 20, `태운 사람 없음 (남은 ${S.wait})`);
  assert.ok(T.G.units.some(u => u.nat === 0 && u._pj === 'evac'));
});

test('다리 확보: 공병이 폭약 해체를 맡는다', () => {
  const T = loadGame(); seedRandom(T, 14);
  fn(T, 'specStart')({ map: 'camp:bridge', seed: 1 });
  run(T, 10);
  const w = T.G.units.find(u => u.nat === 0 && u._pj === 'dis');
  assert.ok(w, '해체 담당 없음');
  assert.equal(w.type, 'eng');
  assert.ok(T.G.plan[0].T.some(x => x.id === 'x-ch'), '폭약 둘레 확보 과제');
});

test('부관에게 플레이어가 목표를 주면 계획보다 그 목표가 먼저다', () => {
  const T = loadGame(); seedRandom(T, 15);
  T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 's', fog: true, speed: 0, seed: 23, auto: true });
  run(T, 10);
  const G = T.G; const o = G.objs[G.objs.length - 1];
  fn(T, 'autoIntent')(0, 'atk', o.c + .5, o.r + .5);
  run(T, 12);
  const ps = (G.plat || []).filter(p => p.nat === 0 && !p.human && p.mode !== 'defend');
  assert.ok(ps.length);
  for (const p of ps) assert.equal(JSON.stringify(p.obj), JSON.stringify([o.r, o.c]));
});

test('점령: 소총분대만이 아니라 지상 전투 부대는 모두 점령한다(보병이 빠르고 차량은 느림, 드론·보급차는 못 함)', () => {
  const T = loadGame(); seedRandom(T, 16);
  T.newGame({ slots: ['ai', 'ai', 'none', 'none'], size: 's', fog: false, speed: 0, seed: 24 });
  const UT = T.UT;
  for (const t of ['rifle', 'eng', 'mg', 'at', 'tank', 'ifv', 'hmv', 'sniper']) assert.ok(UT[t].cap > 0, t);
  for (const t of ['drone', 'sup', 'amb', 'spg']) if (UT[t]) assert.ok(!UT[t].cap, t);
  assert.ok(UT.rifle.cap > UT.mg.cap && UT.mg.cap > UT.tank.cap);
  // 같은 거점을 소총분대 혼자, 전차 혼자 점령하는 데 걸리는 시간
  const capTime = type => {
    const T2 = loadGame(); seedRandom(T2, 17);
    T2.newGame({ slots: ['ai', 'ai', 'none', 'none'], size: 's', fog: false, speed: 0, seed: 24 });
    const G = T2.G; const o = G.objs[0]; G.map[o.r][o.c].t = 'plaza';
    G.map[o.r][o.c].owner = 1; G.units = G.units.filter(u => u.nat === 0).slice(0, 0);
    const u = T2.mkUnit(0, type, o.r, o.c); u.x = o.c + .5; u.z = o.r + .5; fn(T2, 'afterMove')(u);
    const tick = fn(T2, 'capTick'); let t = 0;
    while (G.map[o.r][o.c].owner !== 0 && t < 60) { tick(.1); t += .1; }
    return t;
  };
  const tr = capTime('rifle'), tt = capTime('tank');
  assert.ok(tr < 14 && tr > 10, `소총분대 ${tr}`);
  assert.ok(tt > tr * 1.6 && tt < 40, `전차 ${tt}`);
});
