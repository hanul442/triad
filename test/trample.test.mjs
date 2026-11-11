// 차량이 나무·덤불을 쓰러뜨리며 지나간다 (05o3-trample.js)
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './harness.mjs';

function setup(T) {
  T.newGame({ slots: ['human', 'human', 'none', 'none'], size: 's', seed: 3, fog: false });
  const G = T.G; G.units = []; G.props = []; G.covers = []; G.civF = []; G.craters = []; G.fellZ = []; G.debris = []; G.tramp = [];
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) G.map[r][c] = { t: 'road', owner: null, obj: null, smoke: 0 };
  G.navV = (G.navV || 0) + 1; T.bump();
  return G;
}
const g = (T, n) => T.__get(n);
const unit = (T, n, type, x, z) => { const u = T.mkUnit(n, type, Math.floor(z), Math.floor(x)); u.x = x; u.z = z; u.hd = 0; u.face = 0; return u; };
// 나무 목록을 직접 정한다: (x,z,r 원래 반지름, t)
function veg(T, list) {
  const G = T.G; const B = g(T, 'vegBuild');
  T.__set('vegBuild', () => list.map(([x, z, r, t]) => ({ x, z, r: r + .02, t: t || 'tree', fv: -1, fell: 0 })));
  G.navV++;
  return () => T.__set('vegBuild', B);
}
const drive = (T, u, x, z, n = 400) => { T.orderMoveTo(u, x, z); for (let i = 0; i < n && Math.hypot(u.x - x, u.z - z) > .2; i++) T.rtTick(.1); };

test('전차는 길 위의 보통 나무를 진행 방향으로 쓰러뜨리고, 쓰러진 줄기는 통나무 엄폐가 된다', () => {
  const T = loadGame(); const G = setup(T);
  // 지름 약 24cm(원 반지름 .02 → 24cm) 나무 셋
  veg(T, [[5.5, 5.5, .02], [6.5, 5.52, .02], [7.2, 5.48, .02]]);
  const tk = unit(T, 0, 'tank', 3.5, 5.5);
  drive(T, tk, 9.5, 5.5);
  assert.ok(Math.hypot(tk.x - 9.5, tk.z - 5.5) < .3, '도착');
  const fz = G.fellZ.filter(f => f.fd != null);
  assert.ok(fz.length >= 3, `나무 3그루가 쓰러졌다 (${fz.length})`);
  for (const f of fz) assert.ok(Math.cos(f.fd) > .4, '앞(+x)으로 쓰러진다');
  assert.ok(G.covers.some(c => c.kind === 'log'), '통나무 엄폐');
  assert.ok(g(T, 'vegIn')(5.5, 5.5) == null, '쓰러진 나무는 병사를 막지 않는다');
});

test('가벼운 바퀴 차량은 굵은 나무를 못 넘기고 비켜 가며, 덤불만 깔아뭉갠다', () => {
  const T = loadGame(); const G = setup(T);
  veg(T, [[6.5, 5.5, .02], [5.0, 5.45, .05, 'bush']]);
  const h = unit(T, 0, 'hmv', 3.5, 5.5);
  drive(T, h, 9.5, 5.5);
  assert.ok(Math.hypot(h.x - 9.5, h.z - 5.5) < .3, '도착');
  assert.equal(G.fellZ.length, 0, '험비는 나무를 못 넘긴다');
  assert.ok(G.tramp.length >= 1, '덤불은 깔린다');
  assert.ok(g(T, 'vegIn')(5.0, 5.45) == null, '깔린 덤불은 병사를 막지 않는다');
});

test('나무를 밀어 넘기는 동안 전차가 느려진다', () => {
  const tm = trees => {
    const T = loadGame(); setup(T);
    const L = []; if (trees) for (let x = 4.2; x < 8.8; x += .25) L.push([x, 5.5 + ((x * 7) % 1 - .5) * .1, .02]);
    veg(T, L);
    const tk = unit(T, 0, 'tank', 3.5, 5.5); T.orderMoveTo(tk, 9.5, 5.5);
    let i = 0; for (; i < 600 && Math.hypot(tk.x - 9.5, tk.z - 5.5) > .2; i++) T.rtTick(.1);
    return i;
  };
  const a = tm(false), b = tm(true);
  assert.ok(b > a * 1.15, `나무 줄을 밀고 가면 더 걸린다 (${a} → ${b})`);
});

test('바퀴 차량은 숲 칸에서 더 느리고, 궤도 차량은 그대로', () => {
  const T = loadGame(); setup(T);
  const wild = { t: 'park', wild: 1 };
  assert.equal(T.mcost('sup', wild), 3);
  assert.equal(T.mcost('hmv', wild), 3);
  assert.equal(T.mcost('tank', wild), 2);
  assert.equal(T.mcost('sup', { t: 'park' }), 2, '공원은 그대로');
});

test('숲 지도에서 전차가 숲을 지나가면 나무가 쓰러지고 숲이 성겨진다', () => {
  const T = loadGame();
  T.newGame({ slots: ['human', 'human', 'none', 'none'], size: 's', seed: 5, fog: false, layout: 'forest' });
  const G = T.G; G.units = [];
  let best = null;
  for (let r = 2; r < T.N - 2 && !best; r++) for (let c = 2; c < T.N - 6; c++) {
    let ok = true; for (let k = 0; k < 5; k++) { const x = G.map[r][c + k]; if (!x || x.t !== 'park' || !x.wild) ok = false; }
    if (ok) { best = [r, c]; break; }
  }
  assert.ok(best, '숲 5칸 줄');
  const [r, c] = best;
  const tk = unit(T, 0, 'tank', c + .5, r + .5);
  drive(T, tk, c + 4.5, r + .5, 800);
  const fz = G.fellZ.filter(f => f.fd != null).length;
  assert.ok(fz >= 4, `나무가 쓰러졌다 (${fz})`);
  assert.ok(G.map[r][c + 2].tl > 0, '숲이 성겨졌다');
});
