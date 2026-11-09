// 지도 다양화: 농촌·숲·항구 도시, 무작위, 기후, 생울타리·컨테이너 규칙
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, seedRandom } from './harness.mjs';

const mk = (T, cfg) => { T.newGame({ slots: ['ai', 'ai', 'ai', 'ai'], speed: 0, size: 'm', ...cfg }); return T.G; };
function reach(T, n, type) {
  const G = T.G, N = T.N, mc = T.__get('mcost'), inZone = T.__get('inZone');
  const ok = (r, c) => r >= 0 && c >= 0 && r < N && c < N && mc(type, G.map[r][c]) < Infinity;
  const seen = new Set(), q = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (inZone(n, r, c) && ok(r, c)) { seen.add(r * N + c); q.push([r, c]); }
  while (q.length) { const [r, c] = q.pop(); for (const [a, b] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) if (ok(a, b) && !seen.has(a * N + b)) { seen.add(a * N + b); q.push([a, b]); } }
  return seen;
}
const sig = x => [x.t, x.f || 0, !!x.crop, !!x.wild, !!x.sea, !!x.pier, !!x.cy, x.obj != null].join();

test('농촌·숲·항구: 90도 대칭, 거점 수, 모든 세력이 모든 거점에 걸어서 닿는다', () => {
  for (const layout of ['country', 'forest', 'port']) for (const size of ['s', 'm', 'l']) for (let seed = 1; seed <= 6; seed++) {
    const T = loadGame(); const G = mk(T, { size, seed, layout, relief: 'flat' }); const N = T.N;
    assert.equal(G.feat.layout, layout);
    assert.equal(G.objs.length, T.SIZES[size].obj * 4, `거점 수 (${layout}/${size}/${seed})`);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) assert.equal(sig(G.map[c][N - 1 - r]), sig(G.map[r][c]), `대칭 ${r},${c} (${layout}/${size}/${seed})`);
    for (const n of [0, 1, 2, 3]) { assert.equal(G.units.filter(u => u.nat === n).length, 8, `시작 부대 ${n}`);
      const R = reach(T, n, 'rifle'); for (const o of G.objs) assert.ok(R.has(o.r * N + o.c), `보병 ${n} → ${o.name} (${layout}/${size}/${seed})`); }
  }
});

test('땅마다 생김새: 농촌은 밭·생울타리·교회, 숲은 숲·흙길, 항구는 바다·잔교·컨테이너·배', () => {
  const cnt = (G, f) => G.map.flat().filter(f).length;
  { const T = loadGame(); const G = mk(T, { seed: 3, layout: 'country' }); const N = T.N;
    assert.ok(cnt(G, x => x.crop) > N * 4); assert.ok(cnt(G, x => x.church) >= 8); assert.ok(G.props.filter(p => p.k === 'bocage').length > N * 8);
    assert.ok(G.objs.some(o => /교회|마을회관|면사무소|곡물|장터|간이역|변전소|중계/.test(o.name)), G.objs.map(o => o.name).join()); }
  { const T = loadGame(); const G = mk(T, { seed: 3, layout: 'forest' }); const N = T.N;
    assert.ok(cnt(G, x => x.wild) > N * N * .4); assert.ok(cnt(G, x => x.dirt) > N * 2); }
  { const T = loadGame(); const G = mk(T, { seed: 3, layout: 'port' }); const N = T.N;
    assert.ok(cnt(G, x => x.sea) > N * 4); assert.ok(cnt(G, x => x.pier) >= 8); assert.ok(cnt(G, x => x.quay) > N);
    assert.ok(G.props.some(p => p.k === 'cont') && G.props.some(p => p.k === 'ship') && G.props.some(p => p.k === 'crane'));
    // 신호등·가로등은 시골길·부두엔 없다
    assert.equal(G.props.filter(p => p.k === 'light' && G.map[Math.floor(p.z)][Math.floor(p.x)].dirt).length, 0); }
});

test('무작위: 씨앗마다 다른 지도·기후, 같은 씨앗이면 같은 지도', () => {
  const seen = new Set(), cl = new Set();
  for (let seed = 1; seed <= 40; seed++) { const G = mk(loadGame(), { seed, layout: 'rand', relief: 'rand', clime: 'rand', size: 's' }); seen.add(G.feat.layout); cl.add(G.feat.clime); }
  assert.ok(seen.size >= 5, [...seen].join()); assert.ok(cl.size >= 4, [...cl].join());
  const a = mk(loadGame(), { seed: 77, layout: 'rand', relief: 'rand', clime: 'rand' }), b = mk(loadGame(), { seed: 77, layout: 'rand', relief: 'rand', clime: 'rand' });
  assert.equal(JSON.stringify(a.map), JSON.stringify(b.map)); assert.equal(a.feat.clime, b.feat.clime);
  // 설정을 안 주면(캠페인·시나리오·예전 저장) 지금 그대로: 대칭 도시, 온대
  const c = mk(loadGame(), { seed: 5 }); assert.equal(c.feat.layout, 'sym'); assert.equal(c.feat.clime, 'temp');
  // 사막 집은 평지붕
  for (let seed = 1; seed <= 6; seed++) { const G = mk(loadGame(), { seed, layout: 'sym', clime: 'desert' }); assert.equal(G.map.flat().filter(x => x.ks === 'house').length, 0); }
});

test('항구 언덕: 바다와 부두는 바다 높이', () => {
  const T = loadGame(); const G = mk(T, { seed: 4, layout: 'port', relief: 'steep' });
  assert.ok(G.elv); for (const x of G.map.flat()) if (x.sea || x.quay || x.pier) assert.ok(!(x.el > 0.05), `el ${x.el}`);
  assert.ok(Math.max(...G.elv) > 1);
});

test('생울타리: 땅에 선 눈높이를 가리고, 바퀴 차량은 못 지나가며 전차는 뚫고 간다', () => {
  const T = loadGame(); const G = mk(T, { seed: 3, layout: 'country' });
  G.props = [{ k: 'bocage', x: 10, z: 10.5, ry: Math.PI / 2 }]; T.__get('propCovers')();
  const losPt = T.__get('losPt');
  assert.equal(losPt(9, 10.5, .5, 11, 10.5, .5), false, '보카주 너머');
  assert.equal(losPt(9, 10.5, 2.2, 11, 10.5, .5), true, '2층에서 내려다보면');
  const obs = T.__get('navObstacles')(); const rule = T.__eval('NAV_RULE.bocage');
  assert.ok(obs.some(o => o.k === 'bocage')); assert.equal(rule.veh, 2); assert.equal(rule.trk, 1); assert.equal(rule.inf, 1);
});

test('겨울: 길 밖에서는 느리다', () => {
  const T = loadGame(); const G = mk(T, { seed: 3, layout: 'country', clime: 'winter' });
  const u = G.units.find(x => x.type === 'rifle'); const sk = T.__get('slopeK');
  const t = G.map[Math.floor(u.z)][Math.floor(u.x)]; const k = sk(u, 1, 0);
  if (t.t === 'road') assert.equal(k, 1); else assert.ok(k < .95, `k ${k}`);
});

test('새 지도에서 AI 네 세력이 2분 싸워도 오류가 없다', () => {
  for (const layout of ['country', 'forest', 'port']) {
    const T = loadGame(); seedRandom(T, 7); const G = mk(T, { seed: 11, layout, relief: 'hills', clime: layout === 'port' ? 'desert' : 'winter', size: 's' });
    for (let i = 0; i < 1200; i++) T.rtTick(.1);
    assert.equal((G.errs || []).length, 0, `${layout}: ${JSON.stringify((G.errs || []).slice(0, 2))}`);
    assert.ok(G.units.length > 0);
  }
});
