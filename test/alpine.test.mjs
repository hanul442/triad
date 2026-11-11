// 알프스 산악 지도: 생성·대칭·거점 도달, 차량 비탈 한계, 바위벽 등반·고정 로프, 헬기 착륙지, 시작 부대, AI 한 판
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, seedRandom } from './harness.mjs';

const mk = (T, cfg) => { T.newGame({ slots: ['ai', 'ai', 'ai', 'ai'], speed: 0, size: 'm', layout: 'alpine', ...cfg }); return T.G; };
function reach(T, n, type) {
  const G = T.G, N = T.N, mc = T.__get('mcost'), inZone = T.__get('inZone');
  const ok = (r, c) => r >= 0 && c >= 0 && r < N && c < N && mc(type, G.map[r][c]) < Infinity;
  const seen = new Set(), q = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (inZone(n, r, c) && ok(r, c)) { seen.add(r * N + c); q.push([r, c]); }
  while (q.length) { const [r, c] = q.pop(); for (const [a, b] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) if (ok(a, b) && !seen.has(a * N + b)) { seen.add(a * N + b); q.push([a, b]); } }
  return seen;
}
const sig = x => [x.t, x.f || 0, !!x.cliff, !!x.scree, !!x.snow, !!x.mtr, !!x.summit, x.obj != null].join();

test('알프스: 90도 대칭, 거점 수, 바위벽·눈·산길이 있고 보병은 모든 거점에 걸어서 닿는다', () => {
  for (const size of ['s', 'm', 'l']) for (let seed = 1; seed <= 4; seed++) {
    const T = loadGame(); const G = mk(T, { size, seed }); const N = T.N, tag = `${size}/${seed}`;
    assert.equal(G.feat.layout, 'alpine');
    assert.equal(G.objs.length, T.SIZES[size].obj * 4, `거점 수 ${tag}`);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) assert.equal(sig(G.map[c][N - 1 - r]), sig(G.map[r][c]), `대칭 ${r},${c} ${tag}`);
    const all = G.map.flat();
    assert.ok(all.filter(x => x.cliff).length >= 8, `바위벽 ${tag}`);
    assert.ok(all.some(x => x.mtr) && all.some(x => x.summit), `산길·꼭대기 ${tag}`);
    assert.ok(G.feat.alp.peak > G.feat.alp.tl && G.feat.alp.tl > G.feat.alp.pass, `높이 순서 ${tag}`);
    for (const n of [0, 1, 2, 3]) {
      const R = reach(T, n, 'rifle'); for (const o of G.objs) assert.ok(R.has(o.r * N + o.c), `보병 ${n} → ${o.name} ${tag}`);
      const V = reach(T, n, 'tank'); const pass = G.objs.filter(o => G.map[o.r][o.c].alpRole === 'pass' || G.map[o.r][o.c].alpRole === 'valley');
      const near = o => { for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) if (V.has((o.r + a) * N + o.c + b)) return true; return false; };
      if (pass.length) assert.ok(pass.some(near), `전차 → 고개·골짜기 둘레 ${n} ${tag}`);
      assert.ok(G.objs.filter(o => G.map[o.r][o.c].alpRole === 'summit').every(o => !V.has(o.r * N + o.c)), `전차는 꼭대기 못 감 ${n} ${tag}`);
    }
  }
});

test('알프스: 차량은 비탈·바위벽·산길을 못 가고, 산악보병만 바위벽을 오르며, 고정 로프는 다른 보병도 쓴다', () => {
  const T = loadGame(); const G = mk(T, { seed: 2 }); const mc = T.__get('mcost');
  const all = G.map.flat();
  const cliff = all.find(x => x.cliff), trail = all.find(x => x.mtr), steep = all.find(x => !x.cliff && x.t !== 'road' && x.sl > .5);
  assert.ok(cliff && trail && steep);
  for (const t of ['tank', 'ifv', 'hmv']) { assert.equal(mc(t, cliff), Infinity, t); assert.equal(mc(t, trail), Infinity, t); assert.equal(mc(t, steep), Infinity, t); }
  assert.equal(mc('rifle', cliff), Infinity);
  assert.ok(mc('alp', cliff) < Infinity);
  assert.ok(mc('rifle', trail) < Infinity);
  // 산악보병이 바위벽에 머물면 로프를 건다
  const u = G.units.find(v => v.type === 'alp'); assert.ok(u, '시작 부대에 산악보병');
  const r = all.indexOf(cliff), N = T.N, rr = Math.floor(r / N), cc = r % N;
  u.r = rr; u.c = cc; u.x = cc + .5; u.z = rr + .5;
  const tick = T.__get('alpRopeTick'); for (let i = 0; i < 30; i++) tick(.25);
  assert.ok(cliff.rope, '로프');
  assert.ok(mc('rifle', cliff) < Infinity, '로프 잡고 소총분대도 오른다');
});

test('알프스: 헬기는 비탈·바위벽에 내리지 않고, 시작 부대에 산악보병 둘', () => {
  const T = loadGame(); const G = mk(T, { seed: 1 }); const N = T.N, hc = T.__get('heliCanLand');
  for (const n of [0, 1, 2, 3]) assert.equal(G.units.filter(u => u.nat === n && u.type === 'alp').length, 2);
  let bad = 0;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const x = G.map[r][c]; if ((x.cliff || x.scree || x.sl > .12) && hc(0, r, c)) bad++; }
  assert.equal(bad, 0);
  assert.ok(T.UT.alp && T.UT.alp.mtn);
});

test('알프스: AI 네 세력이 3분 동안 오류 없이 싸운다', () => {
  const T = loadGame(); seedRandom(T, 5); const G = mk(T, { seed: 5 });
  for (let i = 0; i < 180 * 4 && !G.over; i++) T.rtTick(.25);
  assert.equal(G.errs.length, 0, G.errs.join('\n'));
  assert.ok(G.units.some(u => u.type === 'alp'));
});
