// 무기 위력만큼 부서지는 지형지물 (05o-wreck.js)
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, playAI, seedRandom } from './harness.mjs';

function setup(T, t = 'road') {
  T.newGame({ slots: ['human', 'human', 'none', 'none'], size: 's', seed: 3, fog: false });
  const G = T.G; G.units = []; G.props = []; G.covers = []; G.civF = []; G.craters = []; G.fellZ = []; G.debris = [];
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) G.map[r][c] = { t, owner: null, obj: null, smoke: 0 };
  G.navV = (G.navV || 0) + 1; T.bump();
  return G;
}
const bldg = (G, r, c, f, ks) => { G.map[r][c] = { t: 'bldg', f, bmax: 8 + f * 3, bhp: 8 + f * 3, owner: null, obj: null, smoke: 0, blk: r * 100 + c, ks }; G.navV++; };
const g = (T, n) => T.__get(n);
const unit = (T, n, type, x, z) => { const u = T.mkUnit(n, type, Math.floor(z), Math.floor(x)); u.x = x; u.z = z; return u; };
const car = (x, z, ry = 0) => ({ k: 'car', kind: 'sedan', x, z, ry, burnt: false, flip: false, col: '#fff' });

test('구덩이 크기는 폭약량의 세제곱근: 박격포는 못 파고, 포탄은 작게, 항공 폭탄은 크게', () => {
  const T = loadGame(); const G = setup(T, 'park'); const B = g(T, 'wrkBlast');
  B(3.5, 3.5, .9); assert.equal(G.craters.length, 0, '82mm 박격포는 구덩이를 거의 남기지 않는다');
  B(3.5, 3.5, 7); const a = G.craters[0]; assert.ok(a && a.r > .12 && a.r < .16, '155mm: 반지름 약 1.7 m');
  B(8.5, 8.5, 90); const b = G.craters[1]; assert.ok(b.r > .3 && b.r < .4, 'Mk82: 반지름 약 4 m');
  G.map[2][10] = { t: 'road', owner: null, obj: null, smoke: 0 }; B(10.5, 2.5, 7);
  const c = G.craters.find(o => o.x === 10.5); assert.ok(c && c.r < a.r, '포장도로는 덜 파인다');
});

test('구덩이 안의 보병은 참호처럼 엄폐되고, 큰 폭탄 구덩이는 바퀴 차량을 막는다', () => {
  const T = loadGame(); const G = setup(T, 'park'); const B = g(T, 'wrkBlast');
  B(6.5, 6.5, 90);
  assert.ok(T.__get('trenchAt')(6.5, 6.5), '구덩이 = 엄폐');
  assert.ok(!T.__get('trenchAt')(4.5, 4.5));
  const v = unit(T, 0, 'ifv', 3.5, 6.5), tk = unit(T, 0, 'tank', 3.5, 7.5);
  assert.equal(g(T, 'navOk')(v, 6.5, 6.5), false, '바퀴 차량은 큰 구덩이에 못 들어간다');
  assert.equal(g(T, 'navOk')(tk, 6.5, 6.5), true, '전차는 느리게 넘는다');
});

test('포격에 숲이 쓰러지면 더는 시야를 가리지 않는다', () => {
  const T = loadGame(); const G = setup(T, 'road');
  for (let c = 4; c <= 7; c++) G.map[5][c] = { t: 'park', owner: null, obj: null, smoke: 0 };
  T.bump();
  const a = unit(T, 0, 'rifle', 2.5, 5.5), b = unit(T, 1, 'rifle', 9.5, 5.5);
  const los = () => g(T, 'losPt')(a.x, a.z, .3, b.x, b.z, .3);
  assert.equal(los(), false, '숲 4칸이 가린다');
  for (let c = 4; c <= 7; c++) for (let i = 0; i < 3; i++) g(T, 'wrkBlast')(c + .5, 5.5, 7);
  assert.ok(G.map[5][5].tl >= .6, '나무가 꺾였다');
  assert.ok(G.fellZ.length > 0, '쓰러진 자리가 화면에 남는다');
  assert.equal(los(), true, '부서진 숲 너머가 보인다');
});

test('폭발 둘레의 차는 불타고, 큰 폭탄에는 뒤집힌다. 가로등은 쓰러진다', () => {
  const T = loadGame(); const G = setup(T);
  G.props = [car(5.6, 5.5), car(5.5, 7.5), car(9.5, 9.5), { k: 'lamp', x: 5.4, z: 5.7, ry: 0 }];
  G.covers = G.props.filter(p => p.k === 'car').map(p => ({ x: p.x, z: p.z, r: .2, kind: 'car', h: .13 }));
  g(T, 'wrkBlast')(5.5, 5.5, 7);
  assert.equal(G.props[0].burnt, true, '가까운 차는 불탄다');
  assert.equal(G.props[1].burnt, false, '2칸 떨어진 차는 멀쩡');
  assert.equal(G.props[3].dead, 1, '가로등이 쓰러진다');
  assert.equal(G.covers[0].kind, 'wreck', '엄폐도 잔해 차로');
  g(T, 'wrkBlast')(9.5, 9.6, 90);
  assert.equal(G.props[2].flip, true, 'Mk82 바로 옆 차는 뒤집힌다');
});

test('전차는 세워 둔 차를 밟아 납작하게 만들고 지나간다', () => {
  const T = loadGame(); const G = setup(T);
  G.props = [car(6.5, 5.5)]; G.covers = [{ x: 6.5, z: 5.5, r: .2, kind: 'car', h: .13 }]; G.navV++;
  const tk = unit(T, 0, 'tank', 4.5, 5.5);
  T.orderMoveTo(tk, 8.5, 5.5);
  for (let i = 0; i < 300 && Math.hypot(tk.x - 8.5, tk.z - 5.5) > .2; i++) T.rtTick(.1);
  assert.ok(Math.hypot(tk.x - 8.5, tk.z - 5.5) < .3, '도착');
  assert.equal(G.props[0].crush, 1, '차가 깔렸다');
  assert.equal(G.covers[0].kind, 'rubble');
  const v = unit(T, 0, 'ifv', 3.5, 3.5);
  assert.equal(g(T, 'navOk')(v, 6.5, 5.5), true, '납작한 차는 바퀴 차량도 넘는다(느리게)');
});

test('건물 재질: 같은 피해에 주택은 더, 철근 콘크리트 고층은 덜 부서진다', () => {
  const T = loadGame(); const G = setup(T);
  bldg(G, 3, 3, 4, 'house'); bldg(G, 3, 7, 4, 'tower');
  T.damageBldg(3, 3, 6); T.damageBldg(3, 7, 6);
  assert.ok(G.map[3][3].bhp < G.map[3][7].bhp);
  T.damageBldg(3, 7, 100); assert.equal(G.map[3][7].t, 'rubble', '폭파(최대 내구 이상)는 그대로 무너뜨린다');
});

test('높은 건물이 무너지면 잔해가 길로 쏟아져 엄폐가 되고, 자리는 차량이 못 넘는 잔해 언덕', () => {
  const T = loadGame(); const G = setup(T);
  bldg(G, 5, 5, 8, 'office'); T.bump();
  const v = unit(T, 0, 'ifv', 2.5, 2.5);
  assert.equal(g(T, 'navOk')(v, 5.5, 4.65), true, '처음엔 길이 비어 있다');
  T.damageBldg(5, 5, 999);
  assert.equal(G.map[5][5].t, 'rubble');
  assert.equal(G.debris.length, 4, '사방 길로 쏟아진다');
  assert.ok(G.covers.some(c => c.kind === 'rubble'), '잔해 더미 = 엄폐');
  assert.equal(g(T, 'navOk')(v, 5.5, 4.65), false, '바퀴 차량은 길가 잔해에 막힌다');
  assert.equal(g(T, 'navOk')(v, 5.5, 5.5), false, '잔해 언덕');
  const tk = unit(T, 0, 'tank', 2.5, 3.5);
  assert.equal(g(T, 'navOk')(tk, 5.5, 5.5), false, '8층 잔해 언덕은 전차도 못 넘는다');
});

test('위층이 무너지면 그 층 병사는 떨어져 다치고, 잔해 일부가 길로 쏟아진다', () => {
  const T = loadGame(); seedRandom(T, 5); const G = setup(T);
  bldg(G, 5, 5, 10, 'office'); T.bump();
  const u = unit(T, 0, 'rifle', 5.5, 5.5); u.fl = 9; u.flK = T.__eval('key(5,5)');
  const hp0 = u.hp;
  const rf = g(T, 'roofFl'); const before = rf(G.map[5][5]);
  T.damageBldg(5, 5, 40);
  assert.ok(rf(G.map[5][5]) < before, '지붕이 낮아졌다');
  assert.ok(u.hp < hp0 || !G.units.includes(u), '떨어져 다쳤다');
  assert.ok(G.debris.length >= 1, '잔해가 쏟아졌다');
});

test('길을 가던 차량은 길이 막히면 돌아가는 길을 다시 찾는다', () => {
  const T = loadGame(); const G = setup(T);
  const v = unit(T, 0, 'ifv', 1.5, 6.5);
  T.orderMoveTo(v, 11.5, 6.5); T.rtTick(.1);
  g(T, 'wrkBlast')(6.5, 6.5, 480, { out: 1 });   // 큰 구덩이(반지름 0.6칸)가 길 한가운데
  T.rtTick(.1);
  const hits = v.path.some(p => Math.hypot(p[0] - 6.5, p[1] - 6.5) < .3);
  assert.equal(hits, false, '새 길은 구덩이를 피한다');
});

test('AI 한 판: 오류 없이 끝나고 무언가는 부서진다', async () => {
  const T = loadGame(); seedRandom(T, 7);
  await playAI(T, { size: 's', seed: 7, maxR: 8 });
  assert.equal((T.G.errs || []).length, 0);
  const G = T.G;
  assert.ok(G.craters.length + G.fellZ.length + (G.props || []).filter(p => p.burnt || p.dead || p.crush).length > 0);
});
