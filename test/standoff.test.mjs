// 교전 거리(06c2-standoff): 돌격이 아니면 적 코앞으로 자리를 잡지 않는다
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './harness.mjs';

const F = (T, n) => T.__get(n);
function setup(T) {
  T.newGame({ slots: ['ai', 'ai', 'none', 'none'], size: 's', seed: 3, fog: false });
  T.G.units = []; T.G.props = []; T.G.covers = [];
  const G = T.G;
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) G.map[r][c] = { t: 'road', owner: null, obj: null, smoke: 0 };
  T.bump(); return G;
}
const put = (T, n, ty, x, z) => { const u = T.mkUnit(n, ty, Math.floor(z), Math.floor(x)); u.x = x; u.z = z; return u; };

test('측면 이동 목적지가 아는 적 코앞이면 적에게서 떨어진 자리로 물린다', () => {
  const T = loadGame(); const G = setup(T);
  const u = put(T, 0, 'rifle', 8.5, 10.5); const e = put(T, 1, 'rifle', 16.5, 10.5);
  u.tk = { role: 'flank', at: 0 };
  F(T, 'memOf')(0)[e.id] = { x: e.x, z: e.z, t: G.time, h: .5 };
  F(T, 'tacGo')(u, 15.5, 10.5, 'flank');
  assert.ok(u.dest, '어딘가로 간다');
  const d = Math.hypot(u.dest[0] - e.x, u.dest[1] - e.z);
  assert.ok(d >= T.__eval('STAND.min') - 1e-6, `적과 ${d.toFixed(2)}칸`);
});

test('돌격은 그대로 붙는다', () => {
  const T = loadGame(); const G = setup(T);
  const u = put(T, 0, 'rifle', 8.5, 10.5); const e = put(T, 1, 'rifle', 16.5, 10.5);
  u.tk = { role: 'assault', at: 0 };
  F(T, 'memOf')(0)[e.id] = { x: e.x, z: e.z, t: G.time, h: .5 };
  F(T, 'tacGo')(u, 15.3, 10.5, 'assault');
  assert.ok(Math.hypot(u.dest[0] - 15.3, u.dest[1] - 10.5) < .01);
});

test('측면 이동 중 가까운 적을 직접 보면 멈춰 엄폐한다', () => {
  const T = loadGame(); setup(T);
  const u = put(T, 0, 'rifle', 8.5, 10.5); const e = put(T, 1, 'rifle', 11.2, 10.5);
  u.tk = { role: 'flank', at: 0 }; u.pl = 1; u.path = T.pathPts(u, 14.5, 12.5);
  F(T, 'tacReact')(u);
  assert.equal(u.tk.role, 'react');
  assert.ok(!u.path.length || Math.hypot(u.path.at(-1)[0] - u.x, u.path.at(-1)[1] - u.z) < .6, '거의 제자리');
});

test('보병 시야와 사거리: 소총 6칸, 기관총 7칸, 시야 7칸', () => {
  const T = loadGame();
  assert.equal(T.UT.rifle.rng[1], 6); assert.equal(T.UT.mg.rng[1], 7); assert.equal(T.UT.rifle.vis, 7);
});
