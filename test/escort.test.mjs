import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './harness.mjs';

const F = (T, n) => T.__get(n);
function setup(T, auto) {
  T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 's', seed: 3, fog: false });
  T.G.units = []; T.G.props = []; T.G.covers = [];
  const G = T.G;
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) { G.map[r][c] = { t: 'road', owner: null, obj: null, smoke: 0 }; }
  G.depot = null; T.bump(); G.nats[1].ctrl = 'human'; G.nats[0].auto = !!auto; G.nats[0].cp = 0; G.nats[1].cp = 0;
  return G;
}
const run = (T, s) => { for (let i = 0; i < s * 10; i++) T.rtTick(0.1); };
const calm = e => { e.cd = 1e9; e.nocas = 1; e.dmgIn = 0; };

test('호위: 적 근처로 탄약을 나르는 보급 트럭에 놀던 험비가 붙어 함께 간다', () => {
  const T = loadGame(); const G = setup(T, true);
  const a = T.mkUnit(0, 'mg', 12, 16); a.am = 0; a.hold = true;
  const e = T.mkUnit(1, 'rifle', 12, 22); calm(e); e.hold = true;
  const s = T.mkUnit(0, 'sup', 12, 4); const h = T.mkUnit(0, 'hmv', 13, 6);
  F(T, 'supSend')(s, a);
  let got = 0, near = 0;
  for (let i = 0; i < 100; i++) { T.rtTick(0.1); if (h.esc && h.esc.s === s.id) got++; if (h.esc && Math.hypot(h.x - s.x, h.z - s.z) < 2) near++; }
  assert.ok(got > 50, `호위 붙음 ${got}`); assert.equal(s.escBy, h.id);
  assert.ok(near > 15, `곁에서 따라감 ${near}`);
  assert.ok(Math.hypot(s.x - 4.5, s.z - 12.5) > 2, '트럭이 앞으로 감');
});

test('호위: 적이 쏠 거리에 들어오면 멈춰 싸우고, 일이 끝나면 풀려난다', () => {
  const T = loadGame(); const G = setup(T, true);
  const a = T.mkUnit(0, 'mg', 12, 16); a.am = 0; a.hold = true;
  const e = T.mkUnit(1, 'rifle', 12, 22); calm(e); e.hold = true;
  const s = T.mkUnit(0, 'sup', 12, 10); const h = T.mkUnit(0, 'hmv', 13, 11);
  F(T, 'supSend')(s, a); run(T, 1.5); assert.ok(h.esc, '호위 붙음');
  e.x = h.x + 3; e.z = h.z; e.c = Math.floor(e.x); e.r = Math.floor(e.z); run(T, 1);
  assert.ok(h.esc && h.esc.ft > G.time, '싸우는 중'); assert.ok(!(h.path && h.path.length), '멈춤');
  // 적이 사라지고 트럭 일이 끝나면 놓아준다
  G.units = G.units.filter(u => u !== e); s.lj = null; s.path = []; run(T, 6);
  assert.ok(!h.esc, '풀림'); assert.equal(s.escBy, null);
});

test('호위: 직접 지휘에서도 명령 없이 서 있는 부대가 호위하고, 끝나면 제자리로 돌아간다', () => {
  const T = loadGame(); const G = setup(T, false);
  const a = T.mkUnit(0, 'mg', 12, 16); a.am = 0; a.hold = true;
  const e = T.mkUnit(1, 'rifle', 12, 22); calm(e); e.hold = true;
  const s = T.mkUnit(0, 'sup', 12, 4); const h = T.mkUnit(0, 'hmv', 13, 6); const busy = T.mkUnit(0, 'hmv', 11, 5);
  busy.man = G.time; const h0 = [h.x, h.z];
  F(T, 'supSend')(s, a); run(T, 3);
  assert.ok(h.esc && s.escBy === h.id, '서 있던 험비가 호위'); assert.ok(!busy.esc, '방금 명령받은 험비는 그대로');
  run(T, 3); assert.ok(Math.hypot(h.x - h0[0], h.z - h0[1]) > 1, '함께 감');
  G.units = G.units.filter(u => u !== e); s.lj = null; s.path = []; run(T, 20);
  assert.ok(!h.esc, '풀림'); assert.ok(Math.hypot(h.x - h0[0], h.z - h0[1]) < .8, `제자리 ${Math.hypot(h.x - h0[0], h.z - h0[1])}`);
});

test('호위: 직접 명령을 내리면 호위를 그만두고 그 명령을 따른다', () => {
  const T = loadGame(); const G = setup(T, false);
  const a = T.mkUnit(0, 'mg', 12, 16); a.am = 0; a.hold = true;
  const e = T.mkUnit(1, 'rifle', 12, 22); calm(e); e.hold = true;
  const s = T.mkUnit(0, 'sup', 12, 4); const h = T.mkUnit(0, 'hmv', 13, 6);
  F(T, 'supSend')(s, a); run(T, 3); assert.ok(h.esc);
  T.orderMoveTo(h, 2, 2); run(T, .5);
  assert.ok(!h.esc, '풀림'); assert.ok(h.path && h.path.length, '명령대로 감');
});

test('안전한 길: 지원 차량은 아는 적 곁을 지나는 곧은 길 대신 돌아간다', () => {
  const T = loadGame(); const G = setup(T, false);
  const e = T.mkUnit(1, 'rifle', 12, 14); calm(e); e.hold = true;
  const s = T.mkUnit(0, 'sup', 12, 4); const t = T.mkUnit(0, 'tank', 12, 5);
  const P = F(T, 'pathPts')(s, 24.5, 12.5), Q = F(T, 'pathPts')(t, 24.5, 12.5);
  const minD = (u, P) => { let m = 99, px = u.x, pz = u.z; for (const q of P) { for (let k = 0; k <= 10; k++) { const x = px + (q[0] - px) * k / 10, z = pz + (q[1] - pz) * k / 10; m = Math.min(m, Math.hypot(x - e.x, z - e.z)); } px = q[0]; pz = q[1]; } return m; };
  assert.ok(minD(t, Q) < 1, `전차는 곧게 ${minD(t, Q)}`);
  assert.ok(minD(s, P) > 2.5, `트럭은 돌아감 ${minD(s, P)}`);
  const end = P[P.length - 1]; assert.ok(Math.hypot(end[0] - 24.5, end[1] - 12.5) < .3, '목적지 도착');
});
