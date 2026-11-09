// 부대 대형: 종대·쐐기, 차량 뒤 보병 동행, 걸음 맞추기, 공격헬기 편대, AI 소대 행군
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, seedRandom, playAI } from './harness.mjs';

function setup(T, t = 'road') {
  T.newGame({ slots: ['human', 'human', 'none', 'none'], size: 'm', seed: 3, fog: false });
  T.G.units = []; T.G.props = []; T.G.covers = [];
  const G = T.G;
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) G.map[r][c] = { t, owner: null, obj: null, smoke: 0 };
  G.wx = 'clear'; G.radio = false; T.bump();
  return G;
}
const put = (T, n, ty, x, z) => { const u = T.mkUnit(n, ty, Math.floor(z), Math.floor(x)); u.x = x; u.z = z; u.face = 0; u.hold = false; return u; };

test('여러 부대를 멀리 보내면 한 줄로 걸음을 맞춰 가고, 도착하면 제자리로 흩어진다', () => {
  const T = loadGame(); seedRandom(T, 5); const G = setup(T, 'road');
  const us = [put(T, 0, 'rifle', 3.5, 10.2), put(T, 0, 'mg', 3.2, 11), put(T, 0, 'rifle', 4.1, 11.6), put(T, 0, 'at', 3.6, 9.4)];
  T.orderGroupMove(us, 22.5, 10.5);
  const fol = us.filter(u => u.fol); assert.equal(fol.length, 3, '셋은 선두를 따른다');
  const L = us.find(u => !u.fol);
  let maxSpread = 0, minGap = 9;
  for (let i = 0; i < 120; i++) { T.rtTick(0.1);
    if (i > 60) { const xs = us.map(u => u.x); maxSpread = Math.max(maxSpread, Math.max(...xs) - Math.min(...xs));
      for (let a = 0; a < us.length; a++) for (let b = a + 1; b < us.length; b++) minGap = Math.min(minGap, Math.hypot(us[a].x - us[b].x, us[a].z - us[b].z)); } }
  assert.ok(maxSpread < 5.2, `대열 길이 ${maxSpread.toFixed(2)}칸 (흩어져 늘어지지 않음)`);
  assert.ok(minGap > 0.45, `서로 붙지 않음 ${minGap.toFixed(2)}`);
  assert.ok(us.every(u => u === L || u.x < L.x + 0.2), '선두가 앞');
  T.rtRun(40);
  assert.ok(us.every(u => !u.fol), '도착하면 대형이 풀림');
  assert.ok(us.every(u => Math.hypot(u.x - 22.5, u.z - 10.5) < 2.5), '목표 둘레에 섬');
});

test('전차와 보병을 같이 보내면 전차가 앞서고, 보병은 차체 바로 뒤에 붙어 걷는다', () => {
  const T = loadGame(); seedRandom(T, 7); const G = setup(T, 'road');
  const tk = put(T, 0, 'tank', 4.5, 10.5); const a = put(T, 0, 'rifle', 3.4, 10.0), b = put(T, 0, 'rifle', 3.3, 11.1);
  T.orderGroupMove([tk, a, b], 24.5, 10.5);
  assert.ok(!tk.fol && a.fol && a.fol.k === 'esc' && b.fol.k === 'esc', '전차가 선두, 보병 둘은 동행');
  let far = 0, n = 0, ahead = 0;
  for (let i = 0; i < 120; i++) { T.rtTick(0.1); if (i < 40) continue; n++;
    for (const u of [a, b]) { const d = Math.hypot(u.x - tk.x, u.z - tk.z); if (d > 1.3) far++; if (u.x > tk.x) ahead++; } }
  assert.ok(far / (2 * n) < 0.1, `보병이 차체 1.3칸(약 15m) 안 (${far}/${2 * n} 벗어남)`);
  assert.equal(ahead, 0, '보병은 차량 뒤');
  assert.ok(tk.x > 9, `전차도 나아감 ${tk.x.toFixed(1)}`);
});

test('차량끼리는 앞 차 발자국을 따라 종대로 간다', () => {
  const T = loadGame(); seedRandom(T, 9); const G = setup(T, 'road');
  const vs = [put(T, 0, 'ifv', 4.5, 8.5), put(T, 0, 'tank', 3.0, 11.5), put(T, 0, 'hmv', 2.0, 9.5)];
  T.orderGroupMove(vs, 25.5, 10.5);
  assert.equal(vs.filter(v => v.fol).length, 2);
  let minGap = 9;
  for (let i = 0; i < 150; i++) { T.rtTick(0.1); if (i > 50) for (const v of vs) if (v.fol) { const L = vs.find(o => o.id === v.fol.L); if (L) minGap = Math.min(minGap, Math.hypot(L.x - v.x, L.z - v.z)); } }
  assert.ok(minGap > 0.9, `차 간격 유지 ${minGap.toFixed(2)}칸`);
});

test('트인 들판에서는 쐐기 대형으로 펼친다', () => {
  const T = loadGame(); seedRandom(T, 11); const G = setup(T, 'park');
  const us = [put(T, 0, 'rifle', 4.5, 12.5), put(T, 0, 'rifle', 3.5, 12), put(T, 0, 'mg', 3.5, 13), put(T, 0, 'rifle', 2.5, 12.5)];
  T.orderGroupMove(us, 24.5, 12.5);
  for (let i = 0; i < 90; i++) T.rtTick(0.1);
  const zs = us.map(u => u.z); const width = Math.max(...zs) - Math.min(...zs);
  assert.ok(width > 1.0, `옆으로 펼침 ${width.toFixed(2)}칸`);
});

test('공격헬기는 두 대 편대로 와서, 이동 중 윙맨이 선두 곁을 지킨다', () => {
  const T = loadGame(); seedRandom(T, 3); const G = setup(T, 'road');
  T.__get('callGunship')(0, 12, 20);
  const gs = G.units.filter(u => u.type === 'gunship'); assert.equal(gs.length, 2);
  const w = gs.find(u => u.wing != null), L = gs.find(u => u.wing == null);
  let maxD = 0;
  for (let i = 0; i < 40; i++) { T.rtTick(0.1); if (i > 10) maxD = Math.max(maxD, Math.hypot(w.x - L.x, w.z - L.z)); }
  assert.ok(maxD < 2.2, `윙맨 거리 ${maxD.toFixed(2)}`);
  T.rtRun(30);
  const sa = Math.atan2(w.z - 12.5, w.x - 20.5), la = Math.atan2(L.z - 12.5, L.x - 20.5);
  assert.ok(Math.hypot(w.x - L.x, w.z - L.z) > 0.8, '대기할 때는 떨어져 서로 엄호');
});

test('AI 소대는 멀리 갈 때 대형으로 행군한다 (오류 없이 한 판)', async () => {
  const T = loadGame(); seedRandom(T, 21);
  let fol = 0, esc = 0, samples = 0;
  await playAI(T, { seed: 21, size: 'm', check: G => { samples++; for (const u of G.units) if (u.fol) { fol++; if (u.fol.k === 'esc') esc++; } } });
  assert.equal((T.G.errs || []).length, 0, String((T.G.errs || [])[0]));
  assert.ok(fol > 0, `대형을 따른 부대 표본 ${fol}`);
});
