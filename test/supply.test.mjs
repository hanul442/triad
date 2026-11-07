import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, playAI } from './harness.mjs';

const F = (T, n) => T.__get(n);
function setup(T) {
  T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 's', seed: 3, fog: false });
  T.G.units = []; T.G.props = []; T.G.covers = [];
  const G = T.G;
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) { G.map[r][c] = { t: 'road', owner: null, obj: null, smoke: 0 }; }
  G.depot = null; T.bump();
  return G;
}
const run = (T, s) => { for (let i = 0; i < s * 10; i++) T.rtTick(0.1); };

test('탄약: 쏠 때마다 줄고, 다 떨어지면 쏘지 못한다', () => {
  const T = loadGame(); const G = setup(T); G.nats[1].ctrl = 'human';
  const a = T.mkUnit(0, 'rifle', 10, 10), e = T.mkUnit(1, 'rifle', 10, 13); e.nocas = 1; a.nocas = 1; e.dmgIn = 0;
  e.cd = 999; run(T, 10);
  assert.ok(a.am < 40 && a.am > 30, `탄약 ${a.am}`);
  a.am = 0; const d0 = e.dmgIn; run(T, 8);
  assert.equal(e.dmgIn, d0, '탄약이 없으면 피해를 못 줌');
});

test('보급 트럭: 둘레 아군에게 탄약을 나눠 주고, 비면 보급소로 돌아가 다시 싣는다', () => {
  const T = loadGame(); const G = setup(T); G.nats[1].ctrl = 'human';
  const a = T.mkUnit(0, 'mg', 12, 14); a.am = 0; const s = T.mkUnit(0, 'sup', 12, 15);
  run(T, 6);
  assert.ok(a.am > 50, `채워짐 ${a.am}`); assert.ok(s.cargo < 100);
  s.cargo = 2; run(T, 3);
  const d = F(T, 'depotOf')(0); assert.ok(s.path.length || Math.hypot(s.x - d.x, s.z - d.z) < 2, '보급소로 향함');
  run(T, 80);
  assert.ok(Math.hypot(s.x - d.x, s.z - d.z) < 2, '보급소 도착'); assert.ok(s.cargo > 90, `다시 실음 ${s.cargo}`);
});

test('구난차: 안전하면 현장에서 고치고, 적이 가까우면 보급소까지 끌고 가서 고친다', () => {
  const T = loadGame(); const G = setup(T); G.nats[1].ctrl = 'human';
  const v = T.mkUnit(0, 'tank', 12, 12); F(T, 'vdOf')(v).mob = 1; v.hp = 5;
  const r = T.mkUnit(0, 'rec', 12, 9);
  run(T, 30);
  assert.equal(v.vd.mob, 0, '현장 수리로 궤도 복구');
  // 적이 가까우면 견인
  v.vd.mob = 1; v.x = 14.5; v.z = 12.5; T.bump();
  const e = T.mkUnit(1, 'rifle', 12, 17); e.cd = 9999; e.nocas = 1; e.am = 0;
  run(T, 8);
  assert.equal(r.tow, v.id, '견인 시작');
  const d = F(T, 'depotOf')(0);
  run(T, 120);
  assert.ok(Math.hypot(v.x - d.x, v.z - d.z) < 3, `보급소로 끌려옴 ${v.x.toFixed(1)},${v.z.toFixed(1)}`);
  run(T, 25);
  assert.equal(v.vd.mob, 0, '보급소에서 수리'); assert.ok(v.hp > 9);
});

test('AI: 탄약이 떨어지면 보급 트럭을 사서 보내고, 고장 난 차량엔 구난차를 보낸다', () => {
  const T = loadGame(); const G = setup(T); G.nats[0].ctrl = 'ai'; G.nats[0].cp = 30; G.time = 10;
  const a = T.mkUnit(0, 'rifle', 12, 8), b = T.mkUnit(0, 'mg', 13, 8); a.am = 0; b.am = 5;
  const v = T.mkUnit(0, 'ifv', 14, 8); F(T, 'vdOf')(v).mob = 1;
  T.aiThink(0);
  const sup = G.units.find(u => u.type === 'sup' && u.nat === 0);
  assert.ok(sup, '보급 트럭 구매');
  T.aiThink(0);
  assert.ok(G.units.some(u => u.type === 'rec' && u.nat === 0), '구난차 구매');
  for (let i = 0; i < 1500 && (a.am < 30 || b.am < 40); i++) { T.rtTick(0.1); if (i % 20 === 0) T.aiThink(0); }
  assert.ok(a.am >= 30 && b.am > 40, `재보급 ${a.am.toFixed(0)} ${b.am.toFixed(0)}`);
  assert.equal((G.errs || []).length, 0, String(G.errs));
});
