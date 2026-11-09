// 다리 붕괴·폭파·임시 다리 (05o2-bridge.js)
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, playAI, seedRandom } from './harness.mjs';

// 가운데 세로로 강(열 6), 2행과 9행에 다리
function setup(T) {
  T.newGame({ slots: ['human', 'human', 'none', 'none'], size: 's', seed: 3, fog: false });
  const G = T.G; G.units = []; G.props = []; G.covers = []; G.civF = []; G.craters = []; G.fellZ = []; G.debris = []; G.demo = [];
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) G.map[r][c] = { t: 'road', owner: null, obj: null, smoke: 0 };
  for (let r = 0; r < T.N; r++) G.map[r][6] = { t: 'water', rv: 1, owner: null, obj: null, smoke: 0 };
  for (const r of [2, 9]) G.map[r][6] = { t: 'road', ro: 'h', rw: 1, br: 2, rv: 1, owner: null, obj: null, smoke: 0 };
  G.navV = (G.navV || 0) + 1; T.bump();
  for (const n of G.order) { G.nats[n].cp = 50; G.nats[n].ctrl = 'human'; G.nats[n].auto = false; }
  return G;
}
const g = (T, n) => T.__get(n);
const unit = (T, n, type, x, z) => { const u = T.mkUnit(n, type, Math.floor(z), Math.floor(x)); u.x = x; u.z = z; return u; };
const run = (T, sec, f) => { for (let i = 0; i < sec * 10; i++) { T.rtTick(0.1); if (f && f()) break; } };

test('다리는 포탄 몇 발로는 안 무너지고, 항공 폭탄 두 발에 경간이 강으로 떨어진다', () => {
  const T = loadGame(); const G = setup(T); const B = g(T, 'wrkBlast');
  for (let i = 0; i < 5; i++) B(6.5, 2.5, 7);
  assert.equal(G.map[2][6].t, 'road', '155mm 다섯 발: 버틴다');
  const tk = unit(T, 1, 'tank', 6.5, 2.5);
  B(6.5, 2.5, 90); assert.equal(G.map[2][6].t, 'road', '폭탄 한 발: 버틴다');
  B(6.5, 2.5, 90);
  assert.equal(G.map[2][6].t, 'water', '두 발: 무너진다');
  assert.ok(G.map[2][6].brX, '원래 다리를 기억한다');
  assert.ok(!G.units.includes(tk), '위의 전차는 강에 빠졌다');
});

test('다리가 끊기면 건너던 차량은 다른 다리로 돌아간다', () => {
  const T = loadGame(); const G = setup(T);
  const v = unit(T, 0, 'ifv', 2.5, 2.5);
  T.orderMoveTo(v, 10.5, 2.5); T.rtTick(.1);
  assert.ok(v.path.every(p => p[1] < 5), '처음엔 가까운 다리');
  g(T, 'brFall')(2, 6);
  T.rtTick(.1);
  assert.ok(v.path.some(p => p[1] > 8), '먼 다리로 돌아간다');
  run(T, 90, () => Math.hypot(v.x - 10.5, v.z - 2.5) < .3);
  assert.ok(Math.hypot(v.x - 10.5, v.z - 2.5) < .4, '도착');
});

test('공병이 다리에 폭약을 심고, 적 차량이 올라오면 터뜨린다', () => {
  const T = loadGame(); seedRandom(T, 2); const G = setup(T);
  const e = unit(T, 0, 'eng', 5.5, 9.5);
  assert.equal(T.__get('demoOrder')(e, 9, 6), null);
  run(T, 25, () => G.demo.some(d => d.br));
  assert.ok(G.demo.some(d => d.br && !d.gone), '폭약 설치');
  T.orderMoveTo(e, 3.5, 9.5); run(T, 8);
  const tk = unit(T, 1, 'tank', 10.5, 9.5); T.orderMoveTo(tk, 2.5, 9.5);
  run(T, 40, () => G.map[9][6].t === 'water');
  assert.equal(G.map[9][6].t, 'water', '다리 폭파');
  assert.ok(!G.units.includes(tk) || Math.floor(tk.x) >= 7, '전차는 강에 빠지거나 못 건넜다');
});

test('쉬고 있는 공병은 가까운 끊긴 다리를 알아서 임시로 놓는다', () => {
  const T = loadGame(); seedRandom(T, 4); const G = setup(T);
  g(T, 'brFall')(2, 6);
  const e = unit(T, 0, 'eng', 4.5, 3.5);
  run(T, 60, () => G.map[2][6].t !== 'water');
  assert.equal(G.map[2][6].t, 'road', '임시 다리 완성');
  assert.equal(G.map[2][6].rep, 1);
  const v = unit(T, 0, 'ifv', 2.5, 2.5); T.orderMoveTo(v, 10.5, 2.5); T.rtTick(.1);
  assert.ok(v.path.every(p => p[1] < 5), '다시 그 다리로 건넌다');
  g(T, 'wrkBlast')(6.5, 2.5, 90);
  assert.equal(G.map[2][6].t, 'water', '임시 다리는 폭탄 한 발에 끊긴다');
});

test('강 도시 AI 한 판: 오류 없이 끝난다', async () => {
  const T = loadGame(); seedRandom(T, 9);
  await playAI(T, { size: 's', seed: 9, layout: 'river', maxR: 8 });
  assert.equal((T.G.errs || []).length, 0, (T.G.errs || []).join('\n'));
});

test('AI: 강 건너편에서 적 차량이 다리로 오면 우리 쪽 공병이 다리에 폭약을 심는다', () => {
  const T = loadGame(); seedRandom(T, 6); const G = setup(T);
  const n0 = G.order[0], n1 = G.order[1];
  const e = unit(T, n0, 'eng', 3.5, 9.5);
  const tk = unit(T, n1, 'tank', 11.5, 11.5);
  G.nats[n0].ctrl = 'ai';
  T.__get('brAI')(n0);
  assert.ok(e.demo && e.demo.br, '폭약 설치 명령');
  const mine = unit(T, n0, 'rifle', 11.5, 0.5); const mine2 = unit(T, n0, 'rifle', 11.5, 1.2); const mine3 = unit(T, n0, 'rifle', 10.8, 0.5);
  e.demo = null; e.job = null; T.__get('brAI')(n0);
  assert.ok(e.demo && e.demo.br, '건너편 먼 곳의 아군은 상관없다');
  e.demo = null; e.job = null; for (const u of [mine, mine2, mine3]) { u.x = 7.5; u.z = (u === mine ? 9.5 : u === mine2 ? 9.2 : 9.8); }
  T.__get('brAI')(n0);
  assert.ok(!e.demo, '다리 건너 가까이 아군이 싸우고 있으면 끊지 않는다');
});
