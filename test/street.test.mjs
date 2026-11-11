// 거리 대형(교범식 시가지 제병협동 기동): 06i3-street
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, seedRandom } from './harness.mjs';

// 가로 거리(z = 10..10+W) 하나와 세로 옆길(x = 26..27)이 있는 시가지. 나머지는 건물
function setup(T, W = 2) {
  T.newGame({ slots: ['human', 'human', 'none', 'none'], size: 'm', seed: 3, fog: false });
  const G = T.G; G.units = []; G.props = []; G.covers = [];
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) {
    const st = (r >= 10 && r < 10 + W) || (c >= 26 && c < 28);
    G.map[r][c] = { t: st ? 'road' : 'bldg', owner: null, obj: null, smoke: 0, h: 2 };
  }
  G.wx = 'clear'; G.radio = false; T.bump();
  return G;
}
const put = (T, ty, x, z) => { const u = T.mkUnit(0, ty, Math.floor(z), Math.floor(x)); u.x = x; u.z = z; u.face = 0; u.hold = false; return u; };
function column(T, zc) {
  return [put(T, 'tank', 8, zc), put(T, 'ifv', 6.5, zc - .3), put(T, 'ifv', 5.5, zc + .3), put(T, 'tank', 4, zc),
    put(T, 'rifle', 7, zc - .4), put(T, 'rifle', 6, zc + .4), put(T, 'rifle', 5, zc - .3), put(T, 'rifle', 4.5, zc + .3)];
}
// 적이 없는 상태로 돌린다(기억도 비움). thr이면 선두 앞 9칸에 적이 있다고 안다
function run(T, us, n, thr) {
  const G = T.G, L = us.find(u => !u.fol); const zc = L.z;
  const S = [];
  for (let i = 0; i < n; i++) {
    G.units = G.units.filter(u => u.nat === 0);
    G.mem = thr ? { 0: { 999: { x: L.x + 9, z: zc, t: G.time, h: .5, ty: 'rifle' } } } : {};
    T.rtTick(0.1); S.push(i);
  }
}

test('넓은 거리: 차량은 가운데 두 줄로 엇갈리고, 보병은 양쪽 벽을 따라 나눠 걷는다', () => {
  const T = loadGame(); seedRandom(T, 5); setup(T, 2); const zc = 11;
  const us = column(T, zc); T.G.units = us.slice(); T.orderGroupMove(us, 22, zc);
  const L = us.find(u => !u.fol); assert.equal(L.type, 'tank', '전차가 선두');
  const inf = us.filter(u => u.type === 'rifle'), veh = us.filter(u => u.type !== 'rifle');
  let n = 0, wallOk = 0, sides = { p: 0, m: 0 }, vehMid = 0, lanes = new Set(), rearAim = 0, rearN = 0;
  for (let i = 0; i < 200; i++) {
    run(T, us, 1);
    if (i < 80) continue; n++;
    for (const u of inf) { const d = u.z - zc; if (Math.abs(d) > .6) wallOk++; if (d > 0) sides.p++; else sides.m++; }
    for (const v of veh) { const d = v.z - zc; if (Math.abs(d) < .6) vehMid++; if (v.fol) lanes.add(Math.sign(Math.round(d * 4))); }
    const rear = veh[veh.length - 1]; if (rear.fol) { rearN++; if (Math.abs(T.__eval('vDiff')(rear.tf, rear.hd)) > 120) rearAim++; }
  }
  assert.ok(wallOk / (inf.length * n) > .85, `보병이 벽 곁(거리 가운데에서 0.6칸 넘게) ${(wallOk / (inf.length * n)).toFixed(2)}`);
  assert.ok(Math.abs(sides.p - sides.m) / (sides.p + sides.m) < .3, `양쪽에 고르게 ${sides.p}/${sides.m}`);
  assert.ok(vehMid / (veh.length * n) > .9, `차량은 길 가운데 ${(vehMid / (veh.length * n)).toFixed(2)}`);
  assert.ok(lanes.has(1) && lanes.has(-1), '차량이 두 줄로 엇갈림');
  assert.ok(rearAim / Math.max(1, rearN) > .7, `맨 뒤 차량 포탑은 뒤를 봄 ${rearAim}/${rearN}`);
  assert.ok(L.x > 13, `대열이 나아감 ${L.x.toFixed(1)}`);
  assert.ok(!(T.G.errs || []).length, String((T.G.errs || [])[0]));
});

test('좁은 거리: 차량은 한 줄, 보병은 양쪽 벽', () => {
  const T = loadGame(); seedRandom(T, 6); setup(T, 1); const zc = 10.5;
  const us = column(T, zc).map(u => { u.z = zc + (u.type === 'rifle' ? Math.sign(u.z - zc) * .2 : 0); return u; });
  T.G.units = us.slice(); T.orderGroupMove(us, 22, zc);
  let n = 0, line = 0, sides = new Set();
  for (let i = 0; i < 200; i++) {
    run(T, us, 1); if (i < 80) continue; n++;
    for (const u of us) { if (u.type !== 'rifle' && Math.abs(u.z - zc) < .12) line++; if (u.type === 'rifle' && u.fol) sides.add(Math.sign(u.z - zc)); }
  }
  assert.ok(line / (4 * n) > .8, `차량 한 줄 ${(line / (4 * n)).toFixed(2)}`);
  assert.ok(sides.has(1) && sides.has(-1), '보병은 양쪽 벽');
});

test('적이 알려졌으면 보병 두 분대가 전차보다 앞서 나간다', () => {
  const T = loadGame(); seedRandom(T, 7); setup(T, 2); const zc = 11;
  const us = column(T, zc); T.G.units = us.slice(); T.orderGroupMove(us, 22, zc);
  const L = us.find(u => !u.fol);
  let n = 0, ahead = 0;
  for (let i = 0; i < 220; i++) {
    run(T, us, 1, true); if (i < 120) continue; n++;
    const lead = us.filter(u => u.type === 'rifle' && u.x > L.x + .6); if (lead.length >= 2 && new Set(lead.map(u => Math.sign(u.z - zc))).size === 2) ahead++;
  }
  assert.ok(ahead / n > .6, `양쪽 선두 분대가 앞섬 ${ahead}/${n}`);
});

test('교차로 앞에서 모퉁이를 잡고 건넌 뒤 대열이 끝까지 간다', () => {
  const T = loadGame(); seedRandom(T, 8); setup(T, 2); const zc = 11;
  const us = column(T, zc); T.G.units = us.slice(); T.orderGroupMove(us, 40, zc);
  const L = us.find(u => !u.fol); let seen = 0, corner = 0;
  for (let i = 0; i < 900; i++) {
    run(T, us, 1);
    const X = L._xg; if (X) { seen = 1; if (X.ph !== 'app') for (const id of X.sq) { const f = us.find(u => u.id === id); if (f && Math.abs(f.x - X.x) < .7 && Math.abs(f.z - zc) > .5) corner = 1; } }
  }
  assert.ok(seen, '교차로를 알아봄');
  assert.ok(corner, '선두 분대가 모퉁이를 잡음');
  assert.ok(L.x > 36, `교차로를 건너 목표 쪽으로 ${L.x.toFixed(1)}`);
  assert.ok(us.every(u => !u.fol), '도착하면 대형이 풀림');
  assert.ok(us.filter(u => u.x > 30).length >= 7, `대열이 함께 건넘 ${us.map(u => u.x.toFixed(0)).join(',')}`);
});

test('트인 들판에서는 예전 대형 그대로(보병은 차체 뒤)', () => {
  const T = loadGame(); seedRandom(T, 9);
  T.newGame({ slots: ['human', 'human', 'none', 'none'], size: 'm', seed: 3, fog: false });
  const G = T.G; G.units = []; G.props = []; G.covers = [];
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) G.map[r][c] = { t: 'park', owner: null, obj: null, smoke: 0 };
  T.bump();
  const tk = put(T, 'tank', 4.5, 10.5), a = put(T, 'rifle', 3.4, 10), b = put(T, 'rifle', 3.3, 11.1);
  G.units = [tk, a, b]; T.orderGroupMove([tk, a, b], 24.5, 10.5);
  let behind = 0, n = 0;
  for (let i = 0; i < 120; i++) { run(T, [tk, a, b], 1); if (i < 40) continue; n++; for (const u of [a, b]) if (u.x < tk.x) behind++; }
  assert.ok(behind / (2 * n) > .9, `보병은 차체 뒤 ${behind}/${2 * n}`);
});
