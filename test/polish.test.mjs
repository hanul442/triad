import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './harness.mjs';

function setup(T) {
  T.newGame({ slots: ['ai', 'ai', 'none', 'none'], size: 's', seed: 3, fog: false });
  T.G.units = []; T.G.props = []; T.G.covers = []; T.G.time = 100;
  const G = T.G;
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) G.map[r][c] = { t: 'road', owner: null, obj: null, smoke: 0 };
  T.bump(); return G;
}
const put = (T, n, ty, x, z) => { const u = T.mkUnit(n, ty, Math.floor(z), Math.floor(x)); u.x = x; u.z = z; return u; };
const F = (T, n) => T.__get(n);

test('보급 트럭은 적이 가까우면 보급소로 빠진다', () => {
  const T = loadGame(); const G = setup(T);
  const s = put(T, 0, 'sup', 10.5, 10.5); s.cargo = 80; s.path = [];
  put(T, 1, 'rifle', 12.5, 10.5); T.bump();
  F(T, 'supTick')(s, .1);
  assert.ok(s.lj && s.lj.k === 'home', '보급소로');
});

test('AI는 아군 가까이 포격하지 않고, 박격포도 아군 곁의 적은 쏘지 않는다', () => {
  const T = loadGame(); const G = setup(T); G.nats[0].cp = 99;
  put(T, 0, 'rifle', 10.5, 10.5); const e = put(T, 1, 'rifle', 11.5, 10.5); T.bump();
  assert.equal(F(T, 'support')(0, 'arty', 10, 11), false, '아군 1칸 곁 포격 금지');
  const m = put(T, 0, 'mortar', 5.5, 10.5); T.bump();
  assert.equal(F(T, 'canHit')(m, e), false, '박격포 근접 아군');
});

test('탄약이 없거나 많이 다친 보병은 꼭대기로 오르지 않는다', () => {
  const T = loadGame(); const G = setup(T);
  const a = put(T, 0, 'at', 5.5, 5.5); a.am = 0;
  G.time = 200; F(T, 'rtTick')(.1);
  assert.equal(a.flT, 0);
});

test('차량은 막 정한 목적지를 몇 초 안에 반대로 바꾸지 않는다', () => {
  const T = loadGame(); const G = setup(T);
  const v = put(T, 0, 'ifv', 10.5, 10.5); const pathPts = F(T, 'pathPts'), polVeh = F(T, 'polVeh');
  const go = x => { const s = { p: v.path.slice(), e: v.path.length ? v.path[v.path.length - 1] : null, d: v.dest }; v.path = pathPts(v, x, 10.5); polVeh(v, s, G.time); };
  v.path = []; go(16.5);
  const e1 = v.path[v.path.length - 1]; assert.ok(e1[0] > 15, '첫 명령은 받아들임');
  G.time += 2; go(4.5);
  assert.ok(v.path[v.path.length - 1][0] > 15, '2초 뒤 반대 명령은 무시');
  G.time += 7; go(4.5);
  assert.ok(v.path[v.path.length - 1][0] < 6, '6초가 지나면 따른다');
});
