import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, seedRandom } from './harness.mjs';

test('도어거너: 착륙장 둘레의 밖에 있는 적을 쏴서 제압하고, 건물 안 적은 쏘지 않는다', () => {
  const T = loadGame(); seedRandom(T, 5);
  T.newGame({ slots: ['human', 'human', 'none', 'none'], size: 's', fog: false, speed: 0, seed: 11 });
  const G = T.G, N = T.N, [A, B] = G.order;
  let lz = null, bl = null;
  for (let r = 2; r < N - 2 && !lz; r++) for (let c = 2; c < N - 4; c++) if (G.map[r][c].t === 'road' && G.map[r][c + 2].t === 'road') { lz = [r, c]; break; }
  for (let r = 0; r < N && !bl; r++) for (let c = 0; c < N; c++) if (G.map[r][c].t === 'bldg' && lz && Math.hypot(c - lz[1], r - lz[0]) < 3.5) { bl = [r, c]; break; }
  assert.ok(lz && bl);
  G.units.length = 0; G.pending = []; G.dg = [];
  const out = T.mkUnit(B, 'rifle', lz[0], lz[1] + 2); out.x = lz[1] + 2.5; out.z = lz[0] + .5;
  const inn = T.mkUnit(B, 'rifle', bl[0], bl[1]); inn.x = bl[1] + .5; inn.z = bl[0] + .5;
  const sh = [];
  const fx = T.__eval('FXH'); fx.doorgun = (g, e) => sh.push(e.id);
  const h0 = out.hp, i0 = inn.hp;
  T.__eval('heliInsert')(A, lz[0], lz[1]);
  for (let i = 0; i < 120; i++) { for (const u of [out, inn]) { u.cd = 99; u.path = []; u.dest = null; u.tgt = null; } inn.x = bl[1] + .5; inn.z = bl[0] + .5; out.x = lz[1] + 2.5; out.z = lz[0] + .5; T.rtTick(.1); }
  assert.ok(sh.length >= 5, 'bursts ' + sh.length);
  assert.ok(!sh.includes(inn.id), '건물 안 적은 쏘지 않는다');
  assert.ok(!G.units.includes(out) || out.hp < h0, '밖의 적은 다친다');
  assert.equal(G.units.includes(inn) ? inn.hp : i0, i0);
  assert.equal(G.dg.length, 0, '이륙 뒤에는 그친다');
});

test('헬기는 세워 둔 차·가로등·나무 선 공원 위에는 내리지 않는다', () => {
  const T = loadGame();
  T.newGame({ slots: ['human', 'human', 'none', 'none'], size: 's', fog: false, speed: 0, seed: 11 });
  const G = T.G, N = T.N, n = G.order[0], can = T.__eval('heliCanLand');
  let free = null;
  for (let r = 0; r < N && !free; r++) for (let c = 0; c < N; c++) if (can(n, r, c)) { free = [r, c]; break; }
  assert.ok(free, '내릴 자리가 하나는 있다');
  const [r, c] = free;
  G.covers.push({ x: c + .55, z: r + .45, r: .2, kind: 'car', h: .13 });
  assert.equal(can(n, r, c), false, '차가 서 있으면 못 내린다');
  G.covers.pop();
  assert.equal(can(n, r, c), true);
  let tree = null;
  for (let a = 0; a < N && !tree; a++) for (let b = 0; b < N; b++) if (G.map[a][b].t === 'park' && !G.map[a][b].mead) { tree = [a, b]; break; }
  if (tree) assert.equal(can(n, tree[0], tree[1]), false, '나무 선 공원');
});
