// 지도 더 늘리기: 교외 신도시·공업 단지·성곽 구시가지·운하 도시·비행장, 특대형·초대형 지도
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './harness.mjs';

const mk = (T, cfg) => { T.newGame({ slots: ['ai', 'ai', 'ai', 'ai'], speed: 0, size: 'm', ...cfg }); return T.G; };
function reach(T, n, type) {
  const G = T.G, N = T.N, mc = T.__get('mcost'), inZone = T.__get('inZone');
  const ok = (r, c) => r >= 0 && c >= 0 && r < N && c < N && mc(type, G.map[r][c]) < Infinity;
  const seen = new Set(), q = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (inZone(n, r, c) && ok(r, c)) { seen.add(r * N + c); q.push([r, c]); }
  while (q.length) { const [r, c] = q.pop(); for (const [a, b] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) if (ok(a, b) && !seen.has(a * N + b)) { seen.add(a * N + b); q.push([a, b]); } }
  return seen;
}
const sig = x => [x.t, x.f || 0, !!x.rwy, !!x.cwl, !!x.sea, !!x.tkf, !!x.br, x.obj != null].join();
const LAYS = ['suburb', 'industrial', 'oldtown', 'canal', 'airfield'];

test('새 지도 다섯: 90도 대칭, 거점 수·이름, 모든 세력이 모든 거점에 걸어서 닿는다', () => {
  for (const layout of LAYS) for (const size of ['s', 'm', 'l']) for (let seed = 1; seed <= 3; seed++) {
    const T = loadGame(); const G = mk(T, { size, seed, layout, relief: 'flat' }); const N = T.N;
    assert.equal(G.feat.layout, layout);
    assert.equal(G.objs.length, T.SIZES[size].obj * 4, `거점 수 (${layout}/${size}/${seed})`);
    assert.equal(new Set(G.objs.map(o => o.name)).size, G.objs.length, `거점 이름 겹침 (${layout}/${size}/${seed})`);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) assert.equal(sig(G.map[c][N - 1 - r]), sig(G.map[r][c]), `대칭 ${r},${c} (${layout}/${size}/${seed})`);
    for (const n of [0, 1, 2, 3]) { assert.equal(G.units.filter(u => u.nat === n).length, 8, `시작 부대 ${n}`);
      const R = reach(T, n, 'rifle'); for (const o of G.objs) assert.ok(R.has(o.r * N + o.c), `보병 ${n} → ${o.name} (${layout}/${size}/${seed})`); }
  }
});

test('새 지도 생김새: 활주로·성벽·운하 다리·탱크·냉각탑·막다른 길', () => {
  const cnt = (G, f) => G.map.flat().filter(f).length, pk = (G, k) => G.props.filter(p => p.k === k).length;
  { const G = mk(loadGame(), { seed: 3, layout: 'airfield' }); assert.ok(cnt(G, x => x.rwy) >= 4 * 40); assert.ok(cnt(G, x => x.twy) > 40); assert.ok(pk(G, 'plane') > 8);
    assert.ok(G.objs.some(o => /관제탑|격납고|계류장|연료/.test(o.name)), G.objs.map(o => o.name).join()); }
  { const G = mk(loadGame(), { seed: 3, layout: 'oldtown' }); assert.ok(pk(G, 'cwall') > 60); assert.ok(cnt(G, x => x.cgt) >= 8); assert.ok(cnt(G, x => x.tower) >= 8); assert.ok(cnt(G, x => x.church) >= 4); }
  { const G = mk(loadGame(), { seed: 3, layout: 'canal' }); assert.ok(cnt(G, x => x.cnw) > 80); assert.ok(cnt(G, x => x.cnl && x.br) >= 16); assert.equal(G.feat.relief, 'flat'); assert.ok(pk(G, 'ctree') > 40); }
  { const G = mk(loadGame(), { seed: 3, layout: 'industrial' }); assert.equal(pk(G, 'ctower'), 4); assert.equal(pk(G, 'stack'), 1); assert.ok(pk(G, 'otank') >= 8);
    assert.ok(cnt(G, x => x.ks === 'ware' || x.ks === 'factory') > 100); }
  { const G = mk(loadGame(), { seed: 3, layout: 'suburb' }); assert.ok(cnt(G, x => x.cds) >= 8); assert.ok(cnt(G, x => x.ks === 'house') > 150); assert.ok(cnt(G, x => x.mall) >= 4); }
});

test('성벽·탱크는 아무도 못 지나가고 시야를 막는다, 비행기는 보병만 지나간다', () => {
  const T = loadGame(); const G = mk(T, { seed: 2, layout: 'oldtown' });
  const O = T.__get('navObstacles')(), R = T.__eval('NAV_RULE');
  assert.ok(O.some(o => o.k === 'cwall')); for (const k of ['cwall', 'otank', 'ctower', 'stack']) for (const c of ['inf', 'veh', 'trk']) assert.equal(R[k][c], 2, k + c);
  assert.equal(R.plane.inf, 0); assert.equal(R.plane.veh, 2);
  // 성벽 바로 안과 바로 밖, 낮은 눈높이로는 서로 안 보인다
  const w = G.props.find(p => p.k === 'cwall' && Math.abs(p.x - T.N / 2) > 5);
  const nx = (w.x - T.N / 2), nz = (w.z - T.N / 2), L = Math.hypot(nx, nz);
  const pb = T.__get('propBlocks');
  assert.ok(pb(w.x - nx / L * .6, w.z - nz / L * .6, .4, w.x + nx / L * .6, w.z + nz / L * .6, .4), '성벽이 시야를 막는다');
});

test('특대형·초대형: 거점 20·24개 이름 겹침 없음, 부대 더 많이, 제한 시간 길게', () => {
  for (const [size, n, u, R] of [['xl', 20, 10, 40], ['xxl', 24, 12, 48]]) for (const layout of ['sym', 'country', 'canal']) {
    const T = loadGame(); const G = mk(T, { size, seed: 5, layout, relief: 'flat' });
    assert.equal(T.N, size === 'xl' ? 80 : 96); assert.equal(G.objs.length, n); assert.equal(new Set(G.objs.map(o => o.name)).size, n, G.objs.map(o => o.name).join());
    assert.ok(G.objs.every(o => T.__eval('OBJ_KIND')[o.name]), '거점 종류');
    assert.equal(G.units.filter(x => x.nat === 0).length, u); assert.equal(G.maxR, R);
  }
  // 예전 크기는 그대로
  const T = loadGame(); const G = mk(T, { size: 'l', seed: 5 }); assert.equal(G.units.filter(x => x.nat === 0).length, 8); assert.equal(G.maxR, 32);
});

test('무작위 배치는 새 지도도 고른다', () => {
  const seen = new Set();
  for (let seed = 1; seed <= 60; seed++) { const G = mk(loadGame(), { seed, layout: 'rand', relief: 'rand', clime: 'rand', size: 's' }); seen.add(G.feat.layout); }
  for (const k of LAYS) assert.ok(seen.has(k), [...seen].join());
});

test('새 지도 AI 대전 30초: 오류 없음', () => {
  for (const layout of LAYS) { const T = loadGame(); const G = mk(T, { seed: 9, layout, relief: 'rand', clime: 'rand' });
    for (let i = 0; i < 300 && !G.over; i++) T.rtTick(0.1); assert.equal((G.errs || []).length, 0, layout + JSON.stringify(G.errs && G.errs[0])); }
});
