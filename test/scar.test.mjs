// 맞은 자리만 부서지는 건물 (05o3-scar.js)
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, seedRandom } from './harness.mjs';

function setup(T) {
  T.newGame({ slots: ['human', 'human', 'none', 'none'], size: 's', seed: 3, fog: false });
  const G = T.G; G.units = []; G.props = []; G.covers = []; G.craters = []; G.fellZ = []; G.debris = []; G.fires = [];
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) G.map[r][c] = { t: 'road', owner: null, obj: null, smoke: 0 };
  G.navV = (G.navV || 0) + 1; T.bump();
  return G;
}
const bldg = (G, r, c, f, ks) => { G.map[r][c] = { t: 'bldg', f, bmax: 8 + f * 3, bhp: 8 + f * 3, owner: null, obj: null, smoke: 0, blk: r * 100 + c, ks }; G.navV++; };
const g = (T, n) => T.__get(n);
const hit = (T, r, c, amt, ctx) => g(T, 'scAs')(ctx, () => T.damageBldg(r, c, amt));

test('불은 안을 태우고 그을리지만 건물을 한 층씩 낮추거나 무너뜨리지 않는다', () => {
  const T = loadGame(); const G = setup(T); bldg(G, 5, 5, 6, 'panel');
  const x = G.map[5][5], rf = g(T, 'roofFl'), h0 = rf(x);
  for (let i = 0; i < 200; i++) hit(T, 5, 5, 3, { fire: 1 });
  assert.equal(x.t, 'bldg', '불로는 무너지지 않는다');
  assert.equal(rf(x), h0, '층수 그대로');
  assert.ok(x.bhp >= x.bmax * .4 - 1e-9, '구조는 40%까지만 상한다');
  assert.equal(x.gut, 1, '안은 다 탔다');
});

test('피해가 쌓여도 지붕 높이는 그대로: 예전처럼 내구 비율만큼 키가 줄지 않는다', () => {
  const T = loadGame(); const G = setup(T); bldg(G, 5, 5, 6, 'panel');
  const x = G.map[5][5], rf = g(T, 'roofFl');
  hit(T, 5, 5, 14, {}); assert.ok(x.bhp / x.bmax < .6 && x.bhp / x.bmax > .3);
  assert.equal(rf(x), 6);
});

test('전차 직사: 쏜 쪽 벽, 노린 층에 구멍. 건물은 서 있다', () => {
  const T = loadGame(); seedRandom(T, 2); const G = setup(T); bldg(G, 5, 5, 6, 'panel');
  const x = G.map[5][5];
  hit(T, 5, 5, 3, { ax: 5.5, az: 10, fl: 3, kg: 3.2 });
  assert.equal(x.scar.length, 1); const s = x.scar[0];
  assert.equal(s.s, 2, '남쪽(쏜 쪽) 벽'); assert.equal(s.fl, 3, '노린 층');
  assert.ok(s.R > .06 && s.R < .12, `전차 고폭탄 구멍 지름 약 2 m (${s.R})`);
  hit(T, 5, 5, 3, { ax: 1, az: 5.5, fl: 0, kg: 3.2 });
  assert.equal(x.scar[1].s, 3, '서쪽에서 쏘면 서쪽 벽');
  assert.equal(x.t, 'bldg'); assert.ok(!x.lost);
});

test('곡사 포탄은 지붕이나 맨 위층을 뚫는다, 이웃 건물과 맞댄 벽에는 구멍이 안 난다', () => {
  const T = loadGame(); seedRandom(T, 3); const G = setup(T); bldg(G, 5, 5, 5, 'panel'); bldg(G, 5, 6, 5, 'panel');
  const x = G.map[5][5];
  for (let i = 0; i < 8; i++) hit(T, 5, 5, 2, { x: 5.1 + i * .1, z: 5.2 + i * .07, top: 1, h: 5, kg: 7 });
  assert.ok(x.scar.length >= 1);
  for (const s of x.scar) { assert.ok(s.s === 4 || s.fl >= 3, `지붕·위층 (${JSON.stringify(s)})`); assert.notEqual(s.s, 1, '동쪽은 옆 건물과 맞댄 벽'); }
});

test('큰 폭탄은 위층 몇 개를 날리고, 피해가 쌓여 30% 밑이면 맨 위층이 한 번 내려앉는다', () => {
  const T = loadGame(); seedRandom(T, 4); const G = setup(T); const rf = g(T, 'roofFl');
  let lost = 0; for (let i = 0; i < 10; i++) { bldg(G, 3, 3 + i, 8, 'office'); hit(T, 3, 3 + i, 6, { x: 3.5 + i, z: 3.5, top: 1, kg: 90 }); if (G.map[3][3 + i].lost) lost++; }
  assert.ok(lost >= 2 && lost <= 9, `폭탄 열 발 중 위층 날림 ${lost}`);
  bldg(G, 8, 8, 6, 'panel'); const y = G.map[8][8];
  hit(T, 8, 8, 14, {}); assert.equal(rf(y), 6);
  hit(T, 8, 8, 9, {}); assert.ok(y.bhp / y.bmax < .3); assert.equal(rf(y), 4, '6층 건물은 위 두 층이 내려앉음');
  hit(T, 8, 8, 1, {}); assert.equal(rf(y), 4, '한 번만');
  hit(T, 8, 8, 99, {}); assert.equal(y.t, 'rubble', '계속 맞으면 결국 통째로 무너진다');
});

test('다 탄 건물은 드물게 지붕이 내려앉는다(대부분은 그을린 채 서 있다)', () => {
  const T = loadGame(); seedRandom(T, 6); const G = setup(T); const rf = g(T, 'roofFl');
  for (let i = 0; i < 20; i++) bldg(G, 2 + (i / 10 | 0) * 3, 1 + i % 10 * 2, 4, 'office');
  for (let i = 0; i < 20; i++) T.__get('ignite')(2 + (i / 10 | 0) * 3, 1 + i % 10 * 2, 1);
  for (let t = 0; t < 400 && G.fires.length; t++) T.__get('fireTick')(1);
  let stand = 0, burnt = 0; for (let i = 0; i < 20; i++) { const x = G.map[2 + (i / 10 | 0) * 3][1 + i % 10 * 2]; if (x.t === 'bldg' && rf(x) === 4) stand++; if (x.burnt) burnt++; }
  assert.ok(burnt >= 18, `다 탔다 ${burnt}`);
  assert.ok(stand >= 15, `대부분 4층 그대로 서 있다 ${stand}/20`);
});
