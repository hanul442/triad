// 쥐구멍·지하실·땅굴·저격·폭파·자폭 차량·민간인 (05n-*.js)
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, playAI } from './harness.mjs';

function setup(T, slots) {
  T.newGame({ slots: slots || ['human', 'human', 'none', 'none'], size: 's', seed: 3, fog: false });
  const G = T.G; G.units = []; G.props = []; G.covers = []; G.civF = [];
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) G.map[r][c] = { t: 'road', owner: null, obj: null, smoke: 0 };
  G.navV = (G.navV || 0) + 1; T.bump();
  return G;
}
const bldg = (G, r, c, f, blk) => { G.map[r][c] = { t: 'bldg', f, bmax: 8 + f * 3, bhp: 8 + f * 3, owner: null, obj: null, smoke: 0, blk: blk ?? (r * 100 + c) }; G.navV++; };
const g = (T, n) => T.__get(n);
const unit = (T, n, type, x, z) => { const u = T.mkUnit(n, type, Math.floor(z), Math.floor(x)); u.x = x; u.z = z; return u; };
const run = (T, sec, f) => { for (let i = 0; i < sec * 10; i++) { T.rtTick(0.1); if (f) f(); } };

test('쥐구멍: 벽을 뚫으면 다른 건물 사이를 지나갈 수 있다', () => {
  const T = loadGame(); const G = setup(T);
  bldg(G, 5, 5, 2); bldg(G, 5, 6, 2); T.bump();
  assert.equal(g(T, 'edgePass')(5, 5, 5, 6), null, '처음엔 벽');
  const u = unit(T, 0, 'eng', 5.5, 5.5);
  assert.equal(g(T, 'mhOrder')(u, 5, 6), null);
  run(T, 8);
  assert.ok(Object.keys(G.mh).length === 1, '구멍이 생긴다');
  assert.ok(Array.isArray(g(T, 'edgePass')(5, 5, 5, 6)), '구멍이 문처럼 쓰인다');
  T.orderMoveTo(u, 6.5, 5.5); run(T, 8);
  assert.equal(Math.floor(u.x), 6, '구멍으로 옆 건물에 들어간다');
});

test('쥐구멍: 기관총팀은 벽을 뚫지 못한다', () => {
  const T = loadGame(); const G = setup(T); bldg(G, 5, 5, 2); bldg(G, 5, 6, 2);
  const u = unit(T, 0, 'mg', 5.5, 5.5);
  assert.ok(g(T, 'mhOrder')(u, 5, 6));
});

test('지하실: 포격 피해가 크게 줄고 적에게 보이지 않으며 같은 칸 적과만 싸운다', () => {
  const T = loadGame(); const G = setup(T); bldg(G, 5, 5, 3); G.map[5][5].bsm = 1;
  const u = unit(T, 0, 'rifle', 5.5, 5.5); u.nocas = 1;
  assert.equal(g(T, 'bsmOrder')(u, true), null); run(T, 9);
  assert.equal(u.bsm, 1);
  const e = unit(T, 1, 'rifle', 8.5, 5.5);
  assert.equal(g(T, 'seen')(u, 1), false); assert.equal(T.canHit(e, u), false); assert.equal(T.canHit(u, e), false);
  const k = unit(T, 1, 'rifle', 5.3, 5.6);
  assert.equal(g(T, 'seen')(u, 1), true, '같은 칸에 들어온 적은 본다');
  const h = g(T, 'harm');
  const a = unit(T, 0, 'rifle', 12.5, 12.5); a.nocas = 1;
  G.units = G.units.filter(x => x !== e && x !== k);
  const hu0 = u.dmgIn || 0, ha0 = a.dmgIn || 0; h(u, 6, null, { kind: 'blast' }); h(a, 6, null, { kind: 'blast' });
  assert.ok((u.dmgIn - hu0) < (a.dmgIn - ha0) * .3, '폭발 피해가 크게 준다');
  T.orderMoveTo(u, 9.5, 5.5); run(T, 4);
  assert.equal(u.bsm, 0, '이동 명령을 받으면 올라온다');
});

test('땅굴: 공병이 파면 아군 보병이 숨어서 지나가고, 안에서는 맞지 않는다', () => {
  const T = loadGame(); const G = setup(T);
  for (let c = 3; c <= 12; c++) bldg(G, 7, c, 3, 1);           // 가운데를 가로막는 긴 건물
  bldg(G, 4, 7, 2); G.nats[0].cp = 10;
  const e = unit(T, 0, 'eng', 7.5, 4.5);
  assert.equal(g(T, 'tunOrder')(e, 7.5, 10.5), null);
  run(T, 45);
  assert.equal(G.tun[0].prog, 1, '다 판다');
  const s = unit(T, 0, 'rifle', 7.3, 4.6); s.nocas = 1;
  T.orderMoveTo(s, 7.5, 10.6);
  assert.ok(s.tunPlan, '땅굴로 가는 길을 고른다');
  let inside = false, hidden = true; const foe = unit(T, 1, 'rifle', 14.5, 9.5);
  run(T, 30, () => { if (s.tun) { inside = true; if (g(T, 'seen')(s, 1) || T.canHit(foe, s)) hidden = false; } });
  assert.ok(inside && hidden);
  assert.ok(Math.hypot(s.x - 7.5, s.z - 10.6) < 1, '반대편으로 나온다');
});

test('땅굴: 드러난 입구에 적 공병이 붙으면 무너진다', () => {
  const T = loadGame(); const G = setup(T); bldg(G, 4, 4, 2); G.nats[0].cp = 10;
  const e = unit(T, 0, 'eng', 4.5, 4.5); g(T, 'tunOrder')(e, 4.5, 9.5); G.tun[0].prog = 1;
  G.units = G.units.filter(x => x !== e);
  unit(T, 1, 'eng', 4.6, 9.5);
  run(T, 8);
  assert.ok(G.tun.length === 0 || G.tun[0].dead);
});

test('저격: 한 발에 한 명, 분대장을 먼저 노리고, 쏜 자리가 드러난다', () => {
  const T = loadGame(); const G = setup(T); G.fog = true;
  const s = unit(T, 0, 'sniper', 3.5, 5.5);
  const v = unit(T, 1, 'rifle', 9.5, 5.5); v.hp = 999;
  let hits = 0, lead = 0;
  for (let i = 0; i < 40; i++) { const ws0 = JSON.stringify(v.ws || []); g(T, 'hurtMen')(v, 3, s, { kind: 'bullet', hits: 1 }); const ws = v.ws;
    const changed = ws.filter((w, j) => JSON.stringify(w) !== JSON.stringify(JSON.parse(ws0)[j] || { s: 'ok' })).length; assert.ok(changed <= 1); if (changed) hits++; if (ws[0].s !== 'ok') lead = 1;
    v.ws = ws.map(() => ({ s: 'ok' })); }
  assert.ok(hits > 20 && lead);
  assert.ok(v.supp >= 1, '맞은 분대는 크게 제압된다');
  s.cd = 0; s.firedT = null; T.rtShoot(s, v);
  assert.ok(G.snpMk.length >= 1, '추정 위치가 남는다');
});

test('폭파: 적 보병이 폭약 건물에 들어오고 아군이 보고 있으면 터져 건물이 무너진다', () => {
  const T = loadGame(); const G = setup(T); bldg(G, 5, 5, 3); G.nats[0].cp = 10;
  const e = unit(T, 0, 'eng', 5.5, 5.5);
  assert.equal(g(T, 'demoOrder')(e, 5, 5), null); run(T, 7);
  assert.equal(G.demo.length, 1, '폭약 설치');
  T.orderMoveTo(e, 9.5, 5.5); run(T, 8);
  const watch = unit(T, 0, 'rifle', 9.5, 5.5);
  const foe = unit(T, 1, 'rifle', 5.5, 5.4); foe.nocas = 1;
  run(T, 3);
  assert.notEqual(G.map[5][5].t, 'bldg', '건물이 무너진다');
  assert.ok(foe.dmgIn > 3);
});

test('자폭 차량: 민병대만 배치하고, 적 가까이 가면 터진다', () => {
  const T = loadGame(); const G = setup(T);
  assert.equal(T.deploySpots(0, 'vbied').length, 0, '정규군은 못 쓴다');
  const v = unit(T, 1, 'vbied', 3.5, 5.5);
  const tgt = unit(T, 0, 'tank', 8.5, 5.5); tgt.cd = 1e9;   // 전차가 먼저 쏴서 바퀴를 멈춰 세우면(차량 부위 피해) 닿지 못한다
  T.orderAttack(v, tgt); run(T, 10);
  assert.ok(!G.units.includes(v), '터져서 사라진다');
  assert.ok(tgt.dmgIn > 3, '근처 부대가 크게 다친다');
});

test('민간인: 사람이 있는 건물을 부순 쪽이 승점을 잃고, 아군이 머물면 대피시킨다', () => {
  const T = loadGame(); const G = setup(T); bldg(G, 5, 5, 3); bldg(G, 10, 10, 3);
  G.map[5][5].civ = 9; G.map[10][10].civ = 6; G.nats[1].vp = 10;
  const ubAs = g(T, 'ubAs');
  ubAs(1, () => T.damageBldg(5, 5, 999));
  assert.ok(G.nats[1].civK >= 5, '무너지면 대부분 죽는다');
  assert.ok(G.nats[1].vp < 10, '부순 쪽이 승점을 잃는다');
  const u = unit(T, 0, 'rifle', 10.5, 10.5);
  run(T, 6);
  assert.equal(G.map[10][10].civ, 0);
  assert.ok(G.civF.length >= 1, '무리 지어 빠져나간다');
  run(T, 120);
  assert.ok(G.nats[0].civE >= 6, '안전하게 빠져나가면 대피 인원으로 센다');
});

test('AI끼리 한 판: 새 규칙에서 오류 없이 끝난다', async () => {
  const T = loadGame();
  await playAI(T, { slots: ['ai', 'ai', 'ai', 'ai'], size: 's', seed: 104 });
  assert.ok(T.G.over);
  assert.equal((T.G.errs || []).length, 0, (T.G.errs || [])[0]);
});
