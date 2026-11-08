import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './harness.mjs';

function setup(T) {
  T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 's', seed: 3, fog: true });
  T.G.units = []; T.G.props = []; T.G.covers = []; T.G.wx = 'clear'; T.G.time = 100;
  const G = T.G;
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) G.map[r][c] = { t: 'road', owner: null, obj: null, smoke: 0 };
  T.bump();
  return G;
}
const put = (T, n, ty, x, z) => { const u = T.mkUnit(n, ty, Math.floor(z), Math.floor(x)); u.x = x; u.z = z; return u; };
const F = (T, n) => T.__get(n);

test('병종마다 시야가 다르고, 멈춘 박격포는 쌍안경으로 더 멀리 본다', () => {
  const T = loadGame(); const G = setup(T); const vr = F(T, 'visRange');
  const m = put(T, 0, 'mortar', 3.5, 3.5), s = put(T, 0, 'sniper', 4.5, 3.5), tk = put(T, 0, 'tank', 5.5, 3.5);
  for (const u of [m, s, tk]) u._movT = G.time;
  const v0 = vr(m); assert.ok(vr(s) > v0 && vr(tk) > v0, '박격포 맨눈은 짧다');
  G.time += 3;
  assert.ok(vr(m) >= v0 + 3, `멈추면 쌍안경 (${v0} → ${vr(m)})`);
});

test('교전 중인 전차는 해치를 닫아 뒤쪽을 짧게 본다', () => {
  const T = loadGame(); const G = setup(T); const spots = F(T, 'spots');
  const tk = put(T, 0, 'tank', 8.5, 8.5); tk.face = 0; tk._movT = G.time;
  const e = put(T, 1, 'rifle', 5.0, 8.5);   // 뒤쪽 3.5칸
  assert.ok(spots(tk, e), '평소엔 뒤도 본다');
  tk.firedT = G.time;
  assert.ok(!spots(tk, e), '해치 닫으면 뒤는 안 보인다');
  const f = put(T, 1, 'rifle', 12.0, 8.5);   // 앞쪽 3.5칸
  assert.ok(spots(tk, f), '앞은 그대로');
});

test('곡사는 관측자가 본 적만 쏘고, 분대 무전 요청은 드론보다 늦다', () => {
  const T = loadGame(); const G = setup(T); const canHit = F(T, 'canHit');
  const m = put(T, 0, 'mortar', 2.5, 2.5);
  const still = () => { m._movT = G.time; T.bump(); };   // 막 자리 잡아 쌍안경은 아직
  const wait = s => { for (let i = 0; i < s; i++) { G.time += 1; still(); canHit(m, e); } };   // 게임에서는 매 틱 묻는다
  const e = put(T, 1, 'rifle', 8.5, 2.5);   // 6칸: 박격포 맨눈 밖
  still(); assert.ok(!canHit(m, e), '아무도 안 보면 못 쏜다');
  const r = put(T, 0, 'rifle', 5.5, 2.5); T.bump();
  assert.ok(!canHit(m, e), '분대가 막 봤을 땐 아직');
  wait(4); assert.ok(!canHit(m, e), '4초 뒤도 아직');
  wait(5); assert.ok(canHit(m, e), '무전 요청 8초 뒤 포격');
  G.units = G.units.filter(u => u !== r); G.cff = {}; G.time += 10; still();
  const d = put(T, 0, 'drone', 7.5, 4.5); T.bump();
  assert.ok(!canHit(m, e)); wait(2); G.time += .5; still();
  assert.ok(canHit(m, e), '드론 관측은 2초');
  G.units = G.units.filter(u => u !== d); G.time += 10; still();
  assert.ok(!canHit(m, e)); G.time += 10; T.bump();
  assert.ok(canHit(m, e), '멈춰서 쌍안경으로 직접 보면 바로');
});
