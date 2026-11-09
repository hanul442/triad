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
  // 사람 세력 트럭도 자동 임무라 다시 실으면 앞으로 나간다: 들렀다가 다시 실었는지만 본다
  let near = 9, full = 0;
  for (let i = 0; i < 800; i++) { T.rtTick(0.1); near = Math.min(near, Math.hypot(s.x - d.x, s.z - d.z)); full = Math.max(full, s.cargo); }
  assert.ok(near < 2, '보급소 도착'); assert.ok(full > 90, `다시 실음 ${full}`);
});

test('구난차: 안전하면 현장에서 고치고, 적이 가까우면 보급소까지 끌고 가서 고친다', () => {
  const T = loadGame(); const G = setup(T); G.nats[1].ctrl = 'human';
  const v = T.mkUnit(0, 'tank', 12, 12); F(T, 'vdOf')(v).mob = 1; v.hp = 5;
  const r = T.mkUnit(0, 'rec', 12, 9);
  run(T, 30);
  assert.equal(v.vd.mob, 0, '현장 수리로 궤도 복구');
  // 적이 가까우면 견인
  v.vd.mob = 1; v.x = 14.5; v.z = 12.5; T.bump();
  // 적이 4칸쯤(위험 3.2칸 밖, 뜨거운 5칸 안): 고리를 걸어 끌고 간다
  const e = T.mkUnit(1, 'rifle', 12, 18); e.cd = 9999; e.nocas = 1; e.am = 0;
  run(T, 8);
  assert.equal(r.tow, v.id, '견인 시작');
  const d = F(T, 'depotOf')(0);
  run(T, 120);
  assert.ok(Math.hypot(v.x - d.x, v.z - d.z) < 3, `보급소로 끌려옴 ${v.x.toFixed(1)},${v.z.toFixed(1)}`);
  run(T, 25);
  assert.equal(v.vd.mob, 0, '보급소에서 수리'); assert.ok(v.hp > 9);
});

test('구난차: 고장 차량 바로 곁에 적이 있으면 가지 않고 기다렸다가, 적이 사라지면 간다', () => {
  const T = loadGame(); const G = setup(T); G.nats[1].ctrl = 'human';
  const v = T.mkUnit(0, 'tank', 12, 16); F(T, 'vdOf')(v).mob = 1;
  const e = T.mkUnit(1, 'rifle', 12, 18); e.cd = 9999; e.nocas = 1; e.am = 0;
  const r = T.mkUnit(0, 'rec', 12, 6);
  run(T, 12);
  assert.ok(Math.hypot(r.x - v.x, r.z - v.z) > 4, `위험한 곳엔 가지 않음 ${Math.hypot(r.x - v.x, r.z - v.z).toFixed(1)}`);
  assert.ok(r.tow == null, '견인 안 함');
  G.units.splice(G.units.indexOf(e), 1); T.bump();
  run(T, 70);
  assert.ok(v.vd.mob === 0 || r.tow === v.id, `적이 사라지면 고치거나 끌고 감: 거리 ${Math.hypot(r.x - v.x, r.z - v.z).toFixed(1)} lj ${JSON.stringify(r.lj)} nog ${JSON.stringify(r.nog)} t ${G.time.toFixed(0)} hold ${r.hold}`);
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
  assert.ok(a.am >= 30 && b.am >= 40, `재보급 ${a.am.toFixed(0)} ${b.am.toFixed(0)}`);
  assert.equal((G.errs || []).length, 0, String(G.errs));
});

test('AI 보급 트럭은 기억하는 적 곁으로는 가지 않고, 받을 부대 뒤에 선다', () => {
  const T = loadGame(); const G = setup(T); G.nats[0].ctrl = 'ai'; G.time = 10;
  const d = T.__eval('depotOf')(0);
  const e = T.mkUnit(0, 'rifle', 12, 12); e.am = 0;
  const tr = T.mkUnit(0, 'sup', Math.floor(d.z), Math.floor(d.x));
  const foe = T.mkUnit(1, 'rifle', 30, 30);
  const send = F(T, 'supSend');
  // 적을 기억하는 자리(지금은 안 보임) 곁의 부대: 가지 않는다
  F(T, 'memOf')(0)[foe.id] = { x: e.x + 1, z: e.z, t: G.time, how: 'see', h: .5 };
  send(tr, e);
  assert.ok(!(tr.lj && tr.lj.k === 'serve'), '위험한 부대는 건너뜀');
  // 기억을 지우면 간다: 끝점은 부대보다 보급소에 가깝고, 나눠 줄 거리 안
  G.mem = {}; tr.nog = {};
  send(tr, e);
  assert.equal(tr.lj && tr.lj.k, 'serve');
  const end = tr.path[tr.path.length - 1];
  assert.ok(Math.hypot(end[0] - d.x, end[1] - d.z) < Math.hypot(e.x - d.x, e.z - d.z), '부대 뒤(보급소 쪽)에 선다');
  assert.ok(Math.hypot(end[0] - e.x, end[1] - e.z) < 1.6, '나눠 줄 수 있는 거리');
  assert.equal((G.errs || []).length, 0, String(G.errs));
});
