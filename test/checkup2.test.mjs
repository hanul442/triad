// 2026-11-11 점검: 차륜형 장갑차, 맵 끝 주차장에 갇힌 차량, 분대원 순간 이동
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './harness.mjs';

function setup(T) {
  T.newGame({ slots: ['human', 'human', 'none', 'none'], size: 's', seed: 3, fog: false });
  T.G.units = []; T.G.props = []; T.G.covers = [];
  const G = T.G;
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) G.map[r][c] = { t: 'road', owner: null, obj: null, smoke: 0 };
  G.wx = 'clear'; G.navV = (G.navV || 0) + 1; T.bump();
  return G;
}
const car = (G, x, z, ry = 0) => { G.props.push({ k: 'car', kind: 'sedan', x, z, ry, col: '#888' }); G.navV = (G.navV || 0) + 1; };
const step = T => { T.rtTick(0.1); T.G.units = T.G.units.filter(u => u.nat === 0); };

test('차륜형 장갑차(스트라이커·BTR)는 바퀴 차량: 제자리 선회하지 않고 돌아 나간다', () => {
  const T = loadGame(); const G = setup(T);
  assert.ok(!T.__eval('VEH').ifv.trk, '궤도 아님');
  const v = T.mkUnit(0, 'ifv', 6, 6); v.x = 6.5; v.z = 6.5; v.face = 0; v.hd = 0; v.vs = 0;
  T.orderMoveTo(v, 4.5, 6.5);   // 바로 뒤쪽 2칸: 궤도면 제자리에서 돌고, 바퀴면 움직이면서 돈다
  let pivot = 0;
  for (let i = 0; i < 40; i++) { const h0 = v.hd, x0 = v.x, z0 = v.z; step(T); if (Math.abs(v.hd - h0) > 1 && Math.hypot(v.x - x0, v.z - z0) < 1e-4) pivot++; }
  assert.equal(pivot, 0, '서서 방향만 바꾼 틱');
});

test('사방이 주차 차로 꽉 찬 칸에 생긴 차량은 둘레의 넓은 길로 옮겨 놓는다', () => {
  const T = loadGame(); const G = setup(T);
  for (let a = 0; a < 5; a++) for (let b = 0; b < 3; b++) car(G, 4.1 + b * .4, 4.1 + a * .2, 0);   // 칸 (4,4)를 차로 덮는다
  const v = T.mkUnit(0, 'ifv', 4, 4);
  const cls = T.__eval('vClsOf')('ifv');
  assert.ok(T.__eval('navRoomy')(cls, v.x, v.z), `넓은 자리 (${v.x.toFixed(2)}, ${v.z.toFixed(2)})`);
  assert.equal(v.r, Math.floor(v.z)); assert.equal(v.c, Math.floor(v.x));
});

test('가는 중에 목적지만 바뀌면 분대원 줄·출발 순서를 다시 세우지 않는다', () => {
  const T = loadGame(); const G = setup(T);
  const u = T.mkUnit(0, 'rifle', 3, 3); u.x = 3.5; u.z = 3.5;
  T.orderMoveTo(u, 3.5, 12.5);
  for (let i = 0; i < 30; i++) step(T);
  const rank = u._men.map(m => m.rank);
  T.orderMoveTo(u, 5.5, 12.5);
  step(T);
  assert.deepEqual(u._men.map(m => m.rank), rank, '순번 그대로');
  assert.ok(u._men.every(m => !(m.lag > 0)), '다시 늦게 출발하지 않음');
});

test('분대원은 길가 주차 차 모서리에 걸려도 비껴 돌아가고, 분대 곁으로 순간 이동하지 않는다', () => {
  const T = loadGame(); const G = setup(T);
  // 길 한쪽에 듬성듬성 선 주차 차들 옆을 지나간다
  for (let i = 0; i < 8; i++) car(G, 6.35 + (i % 2) * .15, 3 + i * 1.1, 0);
  const u = T.mkUnit(0, 'rifle', 2, 6); u.x = 6.5; u.z = 2.5;
  T.orderMoveTo(u, 6.5, 12.5);
  const last = new Map(); let pops = 0;
  for (let i = 0; i < 400 && u.path.length; i++) {
    step(T);
    for (const m of u._men) { const p = last.get(m.i); if (p && Math.hypot(m.x - p[0], m.z - p[1]) > .6) pops++; last.set(m.i, [m.x, m.z]); }
  }
  assert.ok(Math.hypot(u.x - 6.5, u.z - 12.5) < .5, '도착');
  assert.equal(pops, 0, '순간 이동한 병사');
});
