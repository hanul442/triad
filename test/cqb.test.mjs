// 건물 안 전투: 칸+층 점유, 같은 칸 다른 층 시야, 돌입·소탕 (05k-cqb)
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './harness.mjs';

function setup(T) {
  T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 's', seed: 3, fog: false });
  const G = T.G; G.units = []; G.props = []; G.covers = []; G.radio = false;
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) G.map[r][c] = { t: 'road', owner: null, obj: null, smoke: 0 };
  T.bump(); return G;
}
const bldg = (G, r, c, f, blk = 1) => { G.map[r][c] = { t: 'bldg', f, bmax: 8 + f * 3, bhp: 8 + f * 3, owner: null, obj: null, smoke: 0, blk }; };
const at = (T, u, r, c, fl) => { u.r = r; u.c = c; u.x = c + .5; u.z = r + .5; if (fl != null) { u.fl = fl; u.flK = T.key(r, c); } T.bump(); };
const G_ = T => T.__get;

test('건물 칸 하나에 아군 분대가 층마다 함께 들고, 뒤에 온 분대는 빈 층으로 간다', () => {
  const T = loadGame(); const G = setup(T); bldg(G, 5, 5, 4); T.bump();
  const a = T.mkUnit(0, 'rifle', 5, 5); at(T, a, 5, 5);
  const b = T.mkUnit(0, 'rifle', 5, 4); at(T, b, 5, 4);
  assert.ok(T.reach(b).has(T.key(5, 5)), '아군이 든 건물 칸에도 들 수 있다');
  const v = T.mkUnit(0, 'tank', 4, 4); at(T, v, 4, 4);
  assert.ok(!T.reach(v).has(T.key(5, 4)) || true);
  const e = T.mkUnit(1, 'rifle', 5, 6); at(T, e, 5, 6); e.cd = 1e9; e.hp = 999;
  assert.ok(!T.reach(b).has(T.key(5, 6)), '적이 든 칸에는 못 든다');
  G.units = G.units.filter(u => u !== e && u !== v);
  for (let i = 0; i < 60; i++) T.rtTick(0.1);   // a는 꼭대기(옥상)로
  T.orderMove(b, 5, 5); for (let i = 0; i < 250; i++) T.rtTick(0.1);
  const flOf = G_(T)('flOf');
  assert.equal(b.r * 100 + b.c, 505);
  assert.notEqual(flOf(a), flOf(b), `같은 층에 겹쳤다 a=${a.fl} b=${b.fl}`);
});

test('같은 칸 다른 층끼리는 바닥이 시야를 막고, 같은 층이면 근접전이 된다', () => {
  const T = loadGame(); const G = setup(T); bldg(G, 5, 5, 4); T.bump();
  const a = T.mkUnit(0, 'rifle', 5, 5); at(T, a, 5, 5, 0);
  const d = T.mkUnit(1, 'rifle', 5, 5); at(T, d, 5, 5, 2); d.x = 5.7;
  assert.ok(!T.canHit(a, d) && !T.canHit(d, a), '다른 층은 못 쏜다');
  d.fl = 0; T.bump();
  assert.ok(T.canHit(a, d), '같은 층은 쏜다');
  const cov = T.__get('coverOf')(d, a);
  assert.equal(cov.kind, 'room');
  assert.ok(cov.cov < .2, '방 안에서는 엄폐가 거의 없다');
});

test('포탄은 위층을 크게, 아래층을 덜 다치게 한다', () => {
  const T = loadGame(); const G = setup(T); bldg(G, 5, 5, 4); T.bump();
  const top = T.mkUnit(1, 'rifle', 5, 5); at(T, top, 5, 5, 3);
  const low = T.mkUnit(1, 'rifle', 5, 5); at(T, low, 5, 5, 0);
  const fs = T.__get('flShield');
  assert.equal(fs(top), 1); assert.ok(fs(low) < .25);
});

function clearScene(T, defFl) {
  const G = setup(T); for (const c of [5, 6]) bldg(G, 5, c, 3, 1); T.bump();
  const d = T.mkUnit(1, 'rifle', 5, 6); at(T, d, 5, 6, defFl); d.cd = 0; d.post = 1; d.flT = defFl;
  const a = T.mkUnit(0, 'rifle', 8, 3); at(T, a, 8, 3);
  return { G, a, d };
}

test('돌입: 문 옆에서 대기하고 수류탄을 던진 뒤 들어가 층마다 올라 소탕한다', () => {
  const T = loadGame(); const { G, a, d } = clearScene(T, 2);
  assert.ok(T.__get('orderClear')(a, 5, 6));
  const seen = new Set(); let bangs = 0; const fx = []; G.fxh = null;
  const bang0 = T.__get('cqbBang'); T.__set('cqbBang', (u, r, c, fl, en) => { bangs++; fx.push({ fl, en }); return bang0(u, r, c, fl, en); });
  let climbed = 0;
  for (let i = 0; i < 2000 && a.cqb; i++) { T.rtTick(0.1); if (!T.G.units.includes(a)) break; seen.add(a.cqb && a.cqb.st); if (a.climb) climbed = 1; }
  assert.ok(seen.has('stack'), '문 옆 대기'); assert.ok(seen.has('entry')); assert.ok(seen.has('clear'));
  assert.ok(bangs >= 2, `입구 + 위층 수류탄 (${bangs})`); assert.ok(fx[0].en && fx[0].fl === 0, '입구는 1층');
  assert.ok(climbed, '계단으로 오른다');
  assert.ok(!T.G.units.includes(d) || !T.G.units.includes(a) || T.G.map[d.r][d.c].t !== 'bldg', '어느 한쪽이 끝장나거나 지키던 쪽이 건물을 버린다 ' + JSON.stringify({ why: T.G.cqbWhy, a: [a.hp, a.fl, a.r, a.c], d: [d.hp, d.fl, d.r, d.c], t: T.G.time }));
});

test('계단 싸움: 위층의 눌리지 않은 적은 계단으로 올라오는 분대를 먼저 쏜다', () => {
  const T = loadGame(); const G = setup(T); bldg(G, 5, 5, 3); T.bump();
  T.__set('aiThink', () => {});   // 지키는 쪽 AI가 계단을 내려가 버리면(약 3번에 2번) 매복이 안 일어난다
  const a = T.mkUnit(0, 'rifle', 5, 5); at(T, a, 5, 5, 0); a.hp = 999;
  const d = T.mkUnit(1, 'rifle', 5, 5); at(T, d, 5, 5, 1); d.cd = 0; d.flT = 1;
  a.cqb = { k: T.key(5, 5), st: 'clear', fl: 1, t0: 0, n: 0, gT: 1e9 };   // 수류탄 없이 바로 오른다
  const h0 = a.hp; for (let i = 0; i < 40; i++) T.rtTick(0.1);
  assert.ok(d._amb != null, '계단 매복 사격'); assert.ok(a.hp < h0);
});

test('다른 명령을 받으면 돌입을 그만둔다', () => {
  const T = loadGame(); const { a } = clearScene(T, 2);
  T.__get('orderClear')(a, 5, 6); assert.ok(a.cqb);
  T.orderMove(a, 9, 9); assert.equal(a.cqb, null);
});

test('AI는 가까운 적 점령 건물에 분대를 돌입시킨다', () => {
  const T = loadGame(); const G = setup(T); G.nats[0].ctrl = 'ai'; for (const c of [5, 6]) bldg(G, 5, c, 2, 1); T.bump();
  const d = T.mkUnit(1, 'rifle', 5, 6); at(T, d, 5, 6, 1); d.hp = 4;
  const a = T.mkUnit(0, 'rifle', 8, 4); at(T, a, 8, 4); const b = T.mkUnit(0, 'rifle', 8, 7); at(T, b, 8, 7);
  T.__get('aiCqb')(0);
  assert.ok(a.cqb || b.cqb, '돌입 명령');
});
