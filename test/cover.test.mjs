// 병사들이 지형지물로 은폐·엄폐 (05zc-cover.js)
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, seedRandom } from './harness.mjs';

function setup(T, t = 'road') {
  T.newGame({ slots: ['human', 'human', 'none', 'none'], size: 's', seed: 3, fog: false });
  const G = T.G; G.units = []; G.props = []; G.covers = []; G.craters = []; G.debris = []; G.radio = false;
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) G.map[r][c] = { t, owner: null, obj: null, smoke: 0 };
  G.elv = null; G.navV = (G.navV || 0) + 1; T.bump(); return G;
}
const g = (T, n) => T.__get(n);
const unit = (T, n, type, x, z) => { const u = T.mkUnit(n, type, Math.floor(z), Math.floor(x)); u.x = x; u.z = z; u.cd = 99; return u; };
const run = (T, s, keep) => { for (let i = 0; i < s * 10; i++) { T.rtTick(0.1); if (keep) T.G.units = T.G.units.filter(keep); } };
const hitP = (T, a, d) => { T.G._cvc = null; return g(T, 'hitP')(a, d).p; };

test('엄폐는 병사마다: 방호벽 뒤에 늘어선 분대는 맨땅의 분대보다 덜 맞는다', () => {
  const T = loadGame(); const G = setup(T); seedRandom(T, 1);
  const a = unit(T, 1, 'rifle', 14.5, 10.5);
  const d = unit(T, 0, 'rifle', 10.5, 10.5); run(T, 1, u => u === a || u === d);
  for (const m of d._men) { m.pr = 0; m.lay = 0; }
  const open = hitP(T, a, d);
  // 병사마다 바로 앞(사수 쪽)에 콘크리트 방호벽
  for (const m of d._men) G.covers.push({ x: m.x + .2, z: m.z, r: .12, kind: 'barrier' });
  const cov = hitP(T, a, d);
  assert.ok(cov < open * .75, `방호벽 뒤 ${cov.toFixed(3)} < 맨땅 ${open.toFixed(3)}`);
  // 반대쪽(뒤)에서 쏘면 방호벽이 소용없다
  const b = unit(T, 1, 'rifle', 6.5, 10.5); const back = hitP(T, b, d);
  assert.ok(back > cov * 1.2, `뒤에서 ${back.toFixed(3)}`);
});

test('엎드린 병사는 덜 맞는다(총탄)', () => {
  const T = loadGame(); setup(T);
  const a = unit(T, 1, 'rifle', 14.5, 10.5), d = unit(T, 0, 'rifle', 10.5, 10.5); run(T, .5, u => u === a || u === d);
  for (const m of d._men) { m.pr = 0; m.lay = 0; } const up = hitP(T, a, d);
  for (const m of d._men) m.lay = 1; const down = hitP(T, a, d);
  assert.ok(down < up * .8, `엎드림 ${down.toFixed(3)} < 서 있음 ${up.toFixed(3)}`);
});

test('맨땅에서 총격을 받고 멈춘 병사는 엎드린 상태(m.lay)가 된다', () => {
  const T = loadGame(); const G = setup(T);
  const u = unit(T, 0, 'rifle', 10.5, 10.5); run(T, 2, x => x.nat === 0);
  u._hitT = G.time; u._thr = [14.5, 10.5, G.time]; run(T, .3, x => x.nat === 0);
  const lay = u._men.filter(m => m.lay).length;
  assert.ok(lay >= u._men.length - 2, `엎드린 병사 ${lay}/${u._men.length}`);
});

test('포탄이 날아오는 소리에 떨어질 곳 둘레 병사가 엎드리고, 덜 다친다', () => {
  const T = loadGame(); const G = setup(T); seedRandom(T, 4);
  const u = unit(T, 0, 'rifle', 10.5, 10.5); const s0 = unit(T, 1, 'spg', 10.5, 28.5); run(T, 2, x => x === u || x === s0);
  g(T, 'shellLaunch')({ x0: 10.5, z0: 28.5, h0: 1, tx: 10.5, tz: 10.5, n: 1, src: s0.id, type: 'spg', pw: 1.3, spread: 0 });
  const s = G.shells[0]; s.x1 = 10.6; s.z1 = 10.5;
  let before = null;
  for (let i = 0; i < 80 && G.shells.length; i++) { T.rtTick(.1); G.units = G.units.filter(x => x === u || x === s0); const tl = s.t0 + s.T - G.time; if (tl < .3 && tl > 0 && !before) before = u._men.filter(m => m.pr > 0).length; }
  assert.ok(before >= u._men.length - 1, `떨어지기 전에 엎드림: ${before}`);
  assert.ok(G.tac.cvDuck >= 1);
});

test('포격을 받은 분대는 포격 지역을 벗어나 건물로 옮긴다', () => {
  const T = loadGame(); const G = setup(T);
  for (let r = 9; r <= 11; r++) G.map[r][14] = { t: 'bldg', f: 2, bmax: 14, bhp: 14, owner: null, obj: null, smoke: 0, blk: 900 };
  G.navV++; T.bump();
  const u = unit(T, 0, 'rifle', 11.5, 10.5); const s0 = unit(T, 1, 'spg', 11.5, 28.5); run(T, 1, x => x === u || x === s0);
  g(T, 'shellBoom')({ src: s0.id, n: 1, type: 'spg', pw: .01 }, 11.7, 10.4, 0, null, null);
  run(T, .6, x => x === u || x === s0);
  assert.ok(u.path && u.path.length, '움직인다');
  const [x, z] = u.dest; assert.ok(Math.hypot(x - 11.7, z - 10.4) >= 2, `포격 지점에서 2칸 이상: ${x.toFixed(1)},${z.toFixed(1)}`);
  assert.equal(G.map[Math.floor(z)][Math.floor(x)].t, 'bldg', '건물 안으로');
});

test('멈춘 채 총격을 받는데 맨땅이면 가까운 엄폐(세워 둔 차) 뒤로 붙는다', () => {
  const T = loadGame(); const G = setup(T);
  G.covers.push({ x: 10.4, z: 11.4, r: .22, kind: 'car' });
  const u = unit(T, 0, 'rifle', 9.8, 10.5); run(T, 1, x => x === u);
  u._hitT = G.time; u._thr = [14.5, 11.4, G.time]; u.supp = .5;
  for (let i = 0; i < 6; i++) { T.rtTick(.1); G.units = G.units.filter(x => x === u); }
  assert.ok(u.dest, '움직인다');
  const [x, z] = u.dest; assert.ok(Math.hypot(x - 10.4, z - 11.4) < .65 && x < 10.4, `차 뒤: ${x.toFixed(2)},${z.toFixed(2)}`);
});

test('숨은 보병은 더 가까이 와야 보인다(은폐)', () => {
  const T = loadGame(); const G = setup(T); G.fog = true;
  const e = unit(T, 1, 'rifle', 10.5, 10.5), o = unit(T, 0, 'rifle', 10.5, 10.5 + 8.5);   // 틱을 돌리지 않는다(서로 쏘고 연막을 치면 시험이 흔들린다)
  e.firedT = -99; e.path = []; e._cvH = 0; const sp = g(T, 'spots');
  const V = g(T, 'visRange')(o); e.z = o.z - V * .8; e.r = Math.floor(e.z); G._sc = null;   // 맨눈 시야의 80% 거리
  assert.ok(sp(o, e), '맨땅에 서 있으면 보인다');
  e._cvH = 1; G._sc = null; assert.ok(!sp(o, e), '엎드리거나 엄폐 뒤에 숨으면 안 보인다');
  e.firedT = G.time; assert.ok(sp(o, e), '쏘면 드러난다');
});

test('연막 안의 부대는 안 보이고, 열상은 보병 연막만 짧게 뚫는다', () => {
  const T = loadGame(); const G = setup(T); G.fog = true;
  const e = unit(T, 1, 'rifle', 10.5, 10.5), o = unit(T, 0, 'rifle', 10.5, 15.5), tk = unit(T, 0, 'tank', 11.5, 15.5);
  e.firedT = -99; const sp = g(T, 'spots');
  assert.ok(sp(o, e) && sp(tk, e));
  G._hc = 1; g(T, 'popSmoke')(10.5, 10.5, 16); G._hc = 0; T.bump();
  assert.ok(!sp(o, e), '보병 눈: 연막 안은 안 보인다');
  assert.ok(sp(tk, e), '전차 열상: 보병 연막은 보인다');
  g(T, 'popSmoke')(10.5, 10.5, 20); T.bump();
  assert.ok(!sp(tk, e), '차량 연막탄(적외선 차단)은 열상도 못 뚫는다');
});

test('연막 너머(사이에 연막 칸)도 맨눈으로는 안 보인다', () => {
  const T = loadGame(); const G = setup(T); G.fog = true;
  const e = unit(T, 1, 'rifle', 10.5, 10.5), o = unit(T, 0, 'rifle', 10.5, 15.5), tk = unit(T, 0, 'tank', 10.6, 15.6);
  e.firedT = -99; const sp = g(T, 'spots');
  G._hc = 1; g(T, 'popSmoke')(10.5, 12.5, 16); G._hc = 0; T.bump();
  assert.ok(!sp(o, e)); assert.ok(sp(tk, e), '열상은 보병 연막 너머를 본다');
});
