// 지형: 고저차·강·다리·철도, 강이 흐르는 비대칭 도시
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './harness.mjs';

const mk = (T, cfg) => { T.newGame({ slots: ['ai', 'ai', 'ai', 'ai'], speed: 0, size: 'm', ...cfg }); return T.G; };
// 세력 n의 집결지에서 걸어서(병종 type) 닿는 칸
function reach(T, n, type) {
  const G = T.G, N = T.N, mc = T.__get('mcost'), inZone = T.__get('inZone');
  const ok = (r, c) => r >= 0 && c >= 0 && r < N && c < N && mc(type, G.map[r][c]) < Infinity;
  const seen = new Set(), q = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (inZone(n, r, c) && ok(r, c)) { seen.add(r * N + c); q.push([r, c]); }
  while (q.length) { const [r, c] = q.pop(); for (const [a, b] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) if (ok(a, b) && !seen.has(a * N + b)) { seen.add(a * N + b); q.push([a, b]); } }
  return seen;
}

test('강이 흐르는 도시: 강·다리·철도·역이 생기고, 모든 세력이 모든 거점에 걸어서 닿는다', () => {
  for (const size of ['s', 'm', 'l']) for (let seed = 1; seed <= 12; seed++) {
    const T = loadGame(); const G = mk(T, { size, seed, layout: 'river', relief: 'hills' }); const N = T.N;
    let water = 0, br = 0, rail = 0; for (const row of G.map) for (const x of row) { if (x.rv && !x.br) water++; if (x.br === 2) br++; if (x.rail) rail++; }
    assert.ok(water > N, `강 칸 ${water} (${size}/${seed})`); assert.ok(br >= 2, `다리 칸 ${br}`); assert.ok(rail > N * .6, `철길 칸 ${rail}`);
    assert.equal(G.objs.length, T.SIZES[size].obj * 4, `거점 수 (${size}/${seed})`);
    for (const n of [0, 1, 2, 3]) { const R = reach(T, n, 'rifle'), V = reach(T, n, 'tank');
      for (const o of G.objs) { assert.ok(R.has(o.r * N + o.c), `보병 ${n} → ${o.name} (${size}/${seed})`);
        let near = false; for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) if (V.has((o.r + a) * N + o.c + b)) near = true;
        assert.ok(near, `차량 ${n} → ${o.name} 3칸 안 (${size}/${seed})`); } }
  }
});

test('같은 씨앗이면 같은 지형이 나온다', () => {
  for (const layout of ['sym', 'river']) {
    const a = mk(loadGame(), { seed: 77, layout, relief: 'steep' }), b = mk(loadGame(), { seed: 77, layout, relief: 'steep' });
    assert.equal(JSON.stringify(a.elv), JSON.stringify(b.elv)); assert.equal(JSON.stringify(a.map.map(r => r.map(x => x.t + (x.el || 0)))), JSON.stringify(b.map.map(r => r.map(x => x.t + (x.el || 0)))));
  }
});

test('고저차: 집결지는 평지, 건물 블록은 평평, 대칭 도시는 90도 돌려도 높이가 같다', () => {
  const T = loadGame(); const G = mk(T, { seed: 5, layout: 'sym', relief: 'steep' }); const N = T.N, inZone = T.__get('inZone');
  assert.ok(Math.max(...G.elv) > 3, '언덕이 있다');
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if ([0, 1, 2, 3].some(n => inZone(n, r, c))) assert.equal(G.map[r][c].el || 0, 0, `집결지 ${r},${c}`);
  const blk = new Map(); for (const row of G.map) for (const x of row) if (x.t === 'bldg' && x.blk != null) { if (!blk.has(x.blk)) blk.set(x.blk, []); blk.get(x.blk).push(x.el || 0); }
  const flat = [...blk.values()].filter(s => Math.max(...s) - Math.min(...s) < .3).length; assert.ok(flat / blk.size > .9, `거의 평평한 블록 ${flat}/${blk.size}`);
  let diff = 0; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) diff = Math.max(diff, Math.abs((G.map[r][c].el || 0) - (G.map[c][N - 1 - r].el || 0)));
  assert.ok(diff < .35, `회전 대칭 오차 ${diff}`);
  const g2 = mk(loadGame(), { seed: 5, layout: 'sym', relief: 'flat' }); assert.equal(g2.elv, null);
});

function blank(T, N0) { const G = mk(T, { size: 's', seed: 3, relief: 'flat' }); const N = T.N;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) G.map[r][c] = { t: 'plaza', owner: null, obj: null, smoke: 0 };
  G.units = []; G.covers = []; G.nats[1].ctrl = 'human'; G.fog = true; G.ver++; return G; }
// (r0..r1, 모든 열)에 높이 h인 능선을 쌓는다
function ridge(T, G, r0, r1, h) { const N = T.N, W = N + 1; G.elv = new Array(W * W).fill(0);
  for (let j = r0; j <= r1 + 1; j++) for (let i = 0; i < W; i++) G.elv[j * W + i] = h;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const v = (G.elv[r * W + c] + G.elv[r * W + c + 1] + G.elv[(r + 1) * W + c] + G.elv[(r + 1) * W + c + 1]) / 4; if (v) G.map[r][c].el = v; else delete G.map[r][c].el; }
  G.ver++; }

test('언덕 능선은 시야를 가리고, 능선 위에 서면 넘겨 본다', () => {
  const T = loadGame(); const G = blank(T); const los = T.__get('losPt');
  assert.equal(los(5.5, 4.5, .5, 5.5, 12.5, .5), true, '평지는 보인다');
  ridge(T, G, 8, 8, 3);
  assert.equal(los(5.5, 4.5, .5, 5.5, 12.5, .5), false, '3층 높이 능선 너머는 안 보인다');
  assert.equal(los(5.5, 8.5, .5, 5.5, 12.5, .5), true, '능선 위에서는 보인다');
  const a = T.mkUnit(0, 'rifle', 4, 5), b = T.mkUnit(1, 'rifle', 12, 5); a.x = 5.5; a.z = 4.5; b.x = 5.5; b.z = 12.5; G.ver++;
  assert.equal(T.seen(b, 0), false, '안개: 능선 너머 적은 안 보인다');
  a.r = 8; a.z = 8.5; G.ver++; G.time = (G.time || 0) + 1;
  assert.equal(T.seen(b, 0), true, '능선에 오르면 보인다');
});

test('비탈: 오르막은 느리고 차량이 더 느리며, 내리막은 조금 빠르다; 높은 곳에서 쏘면 엄폐가 줄어든다', () => {
  const T = loadGame(); const G = blank(T); const slopeK = T.__get('slopeK');
  ridge(T, G, 8, 12, 4);   // 7~8행 사이가 비탈
  const u = T.mkUnit(0, 'rifle', 6, 5), v = T.mkUnit(0, 'tank', 6, 7); u.x = 5.5; u.z = 7.6; v.x = 7.5; v.z = 7.6;
  const up = slopeK(u, 0, 1), dn = slopeK(u, 0, -1), vup = slopeK(v, 0, 1);
  assert.ok(up < .8, `오르막 ${up}`); assert.ok(vup < up, `차량 오르막 ${vup}`); assert.ok(dn > 1 && dn <= 1.12, `내리막 ${dn}`);
  assert.equal(slopeK(u, 1, 0), 1, '등고선 따라 걷기');
  const hi = T.mkUnit(1, 'mg', 10, 5); hi.x = 5.5; hi.z = 10.5; G.covers = [{ x: 5.5, z: 5.85, r: .2, kind: 'car', h: .13 }];
  const lo = T.mkUnit(0, 'rifle', 5, 5); lo.x = 5.5; lo.z = 5.5;
  const c1 = T.coverOf(lo, hi).cov; ridge(T, G, 99, 99, 0); delete hi._fov; const c0 = T.coverOf(lo, hi).cov;
  assert.ok(c1 < c0, `내려다보는 사격 엄폐 ${c1} < 평지 ${c0}`);
});

test('숲(나무 공원)을 오래 지나는 시야선은 막히고, 높은 곳에서는 숲 너머가 보인다', () => {
  const T = loadGame(); const G = blank(T); const los = T.__get('losPt');
  for (let r = 6; r <= 9; r++) for (let c = 0; c < T.N; c++) G.map[r][c] = { t: 'park', owner: null, obj: null, smoke: 0 };
  G.ver++;
  assert.equal(los(5.5, 4.5, .5, 5.5, 12.5, .5), false, '숲 4칸 너머는 안 보인다');
  assert.equal(los(5.5, 4.5, 4.3, 5.5, 12.5, .5), true, '높은 곳(4층)에서는 숲 너머가 보인다');
  for (let c = 0; c < T.N; c++) G.map[7][c].yard = 1, G.map[8][c].yard = 1, G.map[9][c].yard = 1;
  G.ver++;
  assert.equal(los(5.5, 4.5, .5, 5.5, 12.5, .5), true, '나무 한 줄은 다 가리지 못한다');
  for (let c = 0; c < T.N; c++) delete G.map[7][c].yard, delete G.map[8][c].yard, delete G.map[9][c].yard;
  const a = T.mkUnit(0, 'rifle', 4, 5), b = T.mkUnit(1, 'rifle', 12, 5); a.x = 5.5; a.z = 4.5; b.x = 5.5; b.z = 12.5; G.ver++;
  assert.equal(T.seen(b, 0), false, '숲 너머 적은 안 보인다');
  const fov = T.__get('unitFov'), M = T.N * 3;
  const p = fov(a); const far = p.some(i => Math.floor(i / M) >= 11 * 3 && i % M === 16);
  assert.equal(far, false, '안개도 숲 너머를 가린다');
});

test('비탈에 선 부대는 칸 평균이 아니라 실제 지면 높이에서 보고, 능선 정점이 가린다', () => {
  const T = loadGame(); const G = blank(T); const los = T.__get('losPt'); const W = T.N + 1;
  G.elv = new Array(W * W).fill(0); for (let i = 0; i < W; i++) G.elv[8 * W + i] = 2.4;   // 8번째 꼭짓점 줄만 솟은 좁은 능선
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) { const v = (G.elv[r * W + c] + G.elv[r * W + c + 1] + G.elv[(r + 1) * W + c] + G.elv[(r + 1) * W + c + 1]) / 4; if (v) G.map[r][c].el = v; }
  G.ver++;
  assert.equal(los(5.5, 4.5, .5, 5.5, 12.5, .5), false, '능선 너머는 안 보인다');
  assert.equal(los(5.5, 7.95, .5, 5.5, 12.5, .5), true, '능선 정점에 서면 내려다본다');
  assert.equal(los(5.5, 7.1, .5, 5.5, 12.5, .5), false, '정점 아래 비탈에서는 능선이 가린다');
});
