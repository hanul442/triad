// 진지 구축 2(지뢰·벙커·건물 요새화·구호소), 의료(가까운 시설로 후송·치료 후 복귀·구급차), 특별 거점 기능
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, playAI } from './harness.mjs';

const F = (T, n) => T.__get(n);
function setup(T) {
  T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 's', seed: 3, fog: false });
  T.G.units = []; T.G.props = []; T.G.covers = []; T.G.forts = [];
  const G = T.G;
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) G.map[r][c] = { t: 'road', owner: null, obj: null, smoke: 0 };
  G.nats[1].ctrl = 'human'; G.navV = (G.navV || 0) + 1; T.bump();
  return G;
}
const run = (T, s) => { for (let i = 0; i < s * 10; i++) T.rtTick(0.1); };
const bldg = (G, r, c, f = 3, blk = 77) => { G.map[r][c] = { t: 'bldg', f, blk, owner: null, obj: null, smoke: 0, bmax: 8 + f * 3, bhp: 8 + f * 3 }; G.navV++; };
const build = (T, f) => { f.prog = 1; T.fortCovers(); T.G.fortNV = (T.G.fortNV || 0) + 1; T.bump(); };

test('특별 거점: 만든 도시의 거점마다 종류가 붙고 이름이 겹치지 않는다', () => {
  const T = loadGame();
  for (const size of ['s', 'm', 'l']) for (const seed of [1, 2, 3, 4]) {
    T.newGame({ slots: ['ai', 'ai', 'ai', 'ai'], size, seed, fog: false });
    const names = T.G.objs.map(o => o.name);
    assert.equal(new Set(names).size, names.length, `${size}/${seed} 이름 중복`);
    for (const o of T.G.objs) { assert.ok(T.OBJ_KIND[o.name], `${o.name} 종류 없음`); assert.ok(T.G.map[o.r][o.c].lkc, '건물 색'); }
  }
});

test('특별 거점: 발전소는 지휘점수, 관공서는 승점, 통신탑은 감시를 준다', () => {
  const T = loadGame(); const G = setup(T);
  const at = (name, r, c) => { G.map[r][c] = { t: 'plaza', owner: null, obj: G.objs.length, smoke: 0 }; G.objs.push({ r, c, name }); return G.map[r][c]; };
  G.objs = [];
  const p = at('발전소', 5, 5), g = at('시청', 5, 20), t = at('통신탑', 20, 20);
  const base = T.income(0);
  p.owner = 0; assert.equal(T.income(0), base + 2 + 2, '거점 +2, 발전소 +2');
  g.owner = 0; const vp0 = G.nats[0].vp; F(T, 'rtRound')(); assert.equal(G.nats[0].vp - vp0, 2 + 1, '거점 2 + 행정 1');
  G.fog = true; const e = T.mkUnit(1, 'rifle', 23, 22); T.mkUnit(0, 'rifle', 2, 2);
  T.bump(); assert.equal(T.seen(e, 0), false, '탑이 없으면 안 보임');
  t.owner = 0; T.bump(); G.time += 1; assert.equal(T.seen(e, 0), true, '통신탑 둘레 5칸은 보임');
});

test('특별 거점: 역 둘레 2칸에서 증원하고 1을 돌려받는다', () => {
  const T = loadGame(); const G = setup(T); G.objs = [];
  G.map[15][15] = { t: 'plaza', owner: 0, obj: 0, smoke: 0 }; G.objs.push({ r: 15, c: 15, name: '중앙역' });
  const sp = T.deploySpots(0, 'rifle'); const k = T.key(17, 17);
  assert.ok(sp.includes(k), '2칸 떨어진 곳에도 내림');
  G.nats[0].cp = 10; const u = T.buy(0, 'rifle', 17, 17); assert.ok(u); assert.equal(G.nats[0].cp, 10 - T.UT.rifle.cost + 1);
});

test('지뢰: 적 차량이 밟으면 궤도가 끊기고, 아군 차량·보병은 안 터지며, 적 공병이 걷어 낸다', () => {
  const T = loadGame(); const G = setup(T);
  const f = { id: 900, k: 'mine', nat: 0, x: 10.5, z: 10.5, ry: 0, hp: T.FORT.mine.hp, prog: 1 }; G.forts.push(f); build(T, f);
  const own = T.mkUnit(0, 'ifv', 10, 10); own.x = 10.5; own.z = 10.5; run(T, .5);
  assert.ok(G.forts.includes(f), '아군 차량은 안전');
  own.x = 3; own.z = 3; const inf = T.mkUnit(1, 'rifle', 10, 10); inf.x = 10.5; inf.z = 10.5; inf.nocas = 1; run(T, .5);
  assert.ok(G.forts.includes(f), '보병은 안 터짐');
  G.units = G.units.filter(u => u !== inf);
  const v = T.mkUnit(1, 'ifv', 10, 9); v.x = 10.5; v.z = 10.45; run(T, .3);
  assert.ok(!G.forts.includes(f), '터짐'); assert.ok(!G.units.includes(v) || (v.vd && v.vd.mob), '궤도 끊김');
  const f2 = { id: 901, k: 'mine', nat: 0, x: 20.5, z: 20.5, ry: 0, hp: T.FORT.mine.hp, prog: 1 }; G.forts.push(f2); build(T, f2);
  const eng = T.mkUnit(1, 'eng', 20, 20); eng.x = 20.6; eng.z = 20.3; eng.nocas = 1; run(T, 8);
  assert.ok(!G.forts.includes(f2), '공병이 걷어 냄');
});

test('벙커·건물 요새화: 엄폐가 오르고 요새화한 건물은 덜 부서진다', () => {
  const T = loadGame(); const G = setup(T);
  const f = { id: 902, k: 'bunker', nat: 0, x: 8.5, z: 8.5, ry: 0, hp: 160, prog: 1 }; G.forts.push(f); build(T, f);
  const a = T.mkUnit(0, 'rifle', 8, 8); a.x = 8.5; a.z = 8.5; const e = T.mkUnit(1, 'rifle', 8, 12);
  assert.ok(T.coverOf(a, e).cov >= .6, `벙커 엄폐 ${T.coverOf(a, e).cov}`);
  bldg(G, 14, 14); bldg(G, 14, 20);
  const b = T.mkUnit(0, 'rifle', 14, 14); b.x = 14.5; b.z = 14.5; 
  const r = T.orderFort(b, 'fortb', 14.5, 14.5); assert.equal(typeof r, 'object', String(r));
  run(T, 20); assert.equal(G.map[14][14].fb, 0, '요새화 완료');
  const cf = T.coverOf(b, e).cov; delete G.map[14][14].fb; const cn = T.coverOf(b, e).cov; G.map[14][14].fb = 0;
  assert.ok(cf >= cn + .14, `요새화 엄폐 ${cn} → ${cf}`);
  T.damageBldg(14, 14, 10); T.damageBldg(14, 20, 10);
  assert.ok(G.map[14][14].bhp > G.map[14][20].bhp, '덜 부서짐');
});

test('의료: 부상자는 가까운 구호소로 후송되고, 병원에선 여럿이 분대로 돌아온다', () => {
  const T = loadGame(); const G = setup(T);
  const u = T.mkUnit(0, 'rifle', 20, 20); run(T, .2);
  const aid = { id: 903, k: 'aid', nat: 0, x: 22.5, z: 20.5, ry: 0, hp: 25, prog: 1 }; G.forts.push(aid); build(T, aid);
  const c = F(T, 'ccpOf')(0, 20.5, 20.5); assert.equal(c.k, 'aid', '가까운 구호소');
  assert.equal(F(T, 'ccpOf')(0).k == null ? 'base' : 'x', 'base', '좌표 없으면 출발 지역 환자집결지');
  // 병원에 넘긴 환자: 치료가 끝나면 걸어서 돌아온다
  u.ws[3].s = 'evac'; const rnd = Math.random; let back = 0;
  for (let i = 0; i < 20; i++) { u.ws[3] = { s: 'evac' }; G.med = []; F(T, 'medQueue')(0, { k: 'hosp', x: 18.5, z: 20.5 }, u.id, 3); G.med[0].t = G.time; run(T, .2);
    if (u.ws[3].s === 'ok') back++; G.evac = []; }
  assert.ok(back >= 6 && back <= 19, `복귀 ${back}/20`);
  u.ws[3] = { s: 'evac' }; G.med = []; F(T, 'medQueue')(0, { k: 'hosp', x: 18.5, z: 20.5 }, u.id, 3); G.med[0].t = G.time; G.med[0].ok = true;
  run(T, .2); assert.ok(u.ws[3].y, '돌아오는 중'); run(T, 15); assert.ok(!u.ws[3].y && u.ws[3].s === 'ok', '분대에 합류');
  // 구호소 곁 경상자 치료
  u.ws[2] = { s: 'lw', w: 'arm' }; u.x = 22.4; u.z = 20.6; for (const m of u._men) { m.x = 22.4; m.z = 20.6; } u.path = []; run(T, 25);
  assert.equal(u.ws[2].s, 'ok', '경상 치료');
});

test('구급차: 부상자 분대 뒤에 서서 받고, 부서지면 실린 환자도 죽는다', () => {
  const T = loadGame(); const G = setup(T);
  const s = T.mkUnit(0, 'rifle', 20, 20); run(T, .2); s.ws[4] = { s: 'hw', w: 'leg', b: 999, a: 1 }; F(T, 'casSync')(s, null);
  const a = T.mkUnit(0, 'amb', 20, 14); run(T, 8);
  assert.ok(a.mj, '부상자 쪽으로 감'); assert.ok(Math.hypot(a.x - s.x, a.z - s.z) < 3.5, `가까이 섬 ${Math.hypot(a.x - s.x, a.z - s.z)}`);
  a.load = [{ u: s.id, i: 5, w: {} }]; s.ws[5] = { s: 'evac' }; const S = G.nats[0].cas || {}; const k0 = S.kia || 0;
  T.__get('kill')(a, null); assert.equal(s.ws[5].s, 'kia'); assert.equal((G.nats[0].cas.kia || 0), k0 + 1);
});

test('AI끼리 한 판: 오류 없이 끝나고 진지·의료를 쓴다', async () => {
  const T = loadGame(); let forts = new Set(), errs = 0, amb = 0, rtd = 0;
  for (const seed of [11, 12]) {
    await playAI(T, { size: 'm', seed, check: G => { for (const f of G.forts || []) forts.add(f.k); amb = Math.max(amb, G.units.filter(u => u.type === 'amb').length); } });
    errs += (T.G.errs || []).length; for (const n of T.G.order) rtd += (T.G.nats[n].cas || {}).rtd || 0;
  }
  assert.equal(errs, 0); assert.ok(T.G.over);
  assert.ok(forts.has('aid') || forts.has('fortb'), [...forts].join(','));
  assert.ok(rtd > 0, '치료 후 복귀가 있음');
});
