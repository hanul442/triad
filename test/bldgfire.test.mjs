// 건물 안팎 사격: 창으로 쏘고 창으로 맞는다, 접촉하면 응사, 교전 중엔 층을 지킨다, 병사는 바깥 창 쪽에 선다
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, seedRandom } from './harness.mjs';

function setup(T, fog = true) {
  seedRandom(T, 11);
  T.newGame({ slots: ['human', 'human', 'none', 'none'], size: 's', seed: 3, fog });
  const G = T.G; G.units = []; G.props = []; G.covers = []; G.radio = false;
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) G.map[r][c] = { t: 'road', owner: null, obj: null, smoke: 0 };
  for (const [r, c] of [[10, 10], [10, 11], [11, 10], [11, 11]]) G.map[r][c] = { t: 'bldg', f: 3, bmax: 17, bhp: 17, owner: null, obj: null, smoke: 0, blk: 1 };
  T.bump(); return G;
}
const inB = (T, u, r, c, fl, x, z) => { u.r = r; u.c = c; u.x = x ?? c + .5; u.z = z ?? r + .5; u.fl = fl; u.flK = T.key(r, c); u.flT = fl; };
const out = (u, r, c) => { u.r = r; u.c = c; u.x = c + .5; u.z = r + .5; };

test('건물 한가운데 서 있어도 바깥 벽 쪽 적과 서로 보고 쏜다(병사들이 창가로 붙는다)', () => {
  const T = loadGame(); const G = setup(T);
  const d = T.mkUnit(1, 'rifle', 10, 10); inB(T, d, 10, 10, 1);
  const a = T.mkUnit(0, 'rifle', 10, 4); out(a, 10, 4); T.bump();
  assert.ok(T.canHit(d, a), '안에서 밖을 쏜다'); assert.ok(T.canHit(a, d), '밖에서 창을 쏜다');
  assert.ok(T.seen(a, 1) && T.seen(d, 0), '서로 보인다');
  // 같은 건물의 붙은 칸 쪽(안벽)으로는 창이 없다: 동쪽 적은 (10,10)에서 못 쏜다
  const e = T.mkUnit(0, 'rifle', 10, 16); out(e, 10, 16); T.bump();
  assert.ok(!T.canHit(d, e), '안벽 너머 적은 못 쏜다');
});

test('창가의 보병은 소총에 잘 안 맞는다(엄폐 55%)', () => {
  const T = loadGame(); const G = setup(T, false);
  const d = T.mkUnit(1, 'rifle', 10, 10); inB(T, d, 10, 10, 1);
  const a = T.mkUnit(0, 'rifle', 10, 5); out(a, 10, 5); T.bump();
  const h = T.__get('hitP')(a, d); assert.ok(h.cov >= .55 - 1e-9 && h.kind === 'bldg', JSON.stringify(h));
});

test('건물을 지키는 분대가 길에 선 같은 분대와 맞서면 대개 이긴다', () => {
  let win = 0;
  for (let s = 1; s <= 6; s++) {
    const T = loadGame(); const G = setup(T); seedRandom(T, s);
    const d = T.mkUnit(1, 'rifle', 10, 10); inB(T, d, 10, 10, 1); d.post = 1; d.hold = true;
    const a = T.mkUnit(0, 'rifle', 10, 4); out(a, 10, 4); a.hold = true; T.bump();
    for (let i = 0; i < 300; i++) T.rtTick(.1);
    const dh = G.units.includes(d) ? d.hp : 0, ah = G.units.includes(a) ? a.hp : 0;
    if (dh > ah) win++;
  }
  assert.ok(win >= 4, `건물 쪽 승 ${win}/6`);
});

test('병사들은 위협 쪽이 안벽이면 가장 가까운 바깥 창 쪽 벽에 선다', () => {
  const T = loadGame(); const G = setup(T);
  const d = T.mkUnit(1, 'rifle', 10, 10); inB(T, d, 10, 10, 0); d.hold = true; d.post = 1; d._thr = [16.5, 10.6, 0]; G.time = 1;
  for (let i = 0; i < 40; i++) T.rtTick(.1);
  d._thr = [16.5, 10.6, G.time]; d._plan = 0; for (let i = 0; i < 30; i++) T.rtTick(.1);
  const M = d._men.filter(m => !m.dead && !m.gone);
  // (10,10) 칸의 동쪽은 (10,11)과 붙은 안벽: 북쪽 바깥 벽(z≈10.08)을 따라 선다
  const north = M.filter(m => m.sp && m.sp[1] < 10.3).length;
  assert.ok(north >= Math.min(5, M.length) - 1, `북쪽 창가 ${north}/${M.length}`);
});

test('교전 중(방금 쐈다)이면 계단을 오르지 않고 지금 층에서 쏜다', () => {
  const T = loadGame(); const G = setup(T); G.time = 10;
  const d = T.mkUnit(1, 'rifle', 10, 10); inB(T, d, 10, 10, 0); d.flT = null; d.firedT = 9;
  const fw = T.__get('flWant'); assert.equal(fw(d, G.map[10][10]), 0, '지금 층');
  d.firedT = 0; d._flC = null; assert.ok(fw(d, G.map[10][10]) > 0, '조용하면 위층으로');
});

test('움직이는 전술 분대도 총에 맞으면 바로 응사한다', () => {
  const T = loadGame(); const G = setup(T, false); G.nats[0].ctrl = 'ai';
  const u = T.mkUnit(0, 'rifle', 4, 4); out(u, 4, 4); const e = T.mkUnit(1, 'rifle', 4, 10); out(e, 4, 10); e.hold = true; T.bump();
  u.pl = 1; u.tk = { role: 'flank', at: 0 }; u.path = [[4.5, 2.5], [4.5, 1.5]]; u.cd = 0; G.time = 5;
  T.__get('rtFight')(u); assert.ok(!(u.cd > 0), '맞기 전에는 움직이며 쏘지 않는다');
  u._hitT = 4.5; T.__get('rtFight')(u); assert.ok(u.cd > 0, '맞으면 응사');
});
