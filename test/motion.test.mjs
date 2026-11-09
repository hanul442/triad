// 차량·헬기 움직임: 포탑 선회, 가속, 회전반경, 후진, 차체 충돌, 공격헬기 거리 유지
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './harness.mjs';

function setup(T) {
  T.newGame({ slots: ['human', 'human', 'none', 'none'], size: 's', seed: 3, fog: false });
  T.G.units = []; T.G.props = []; T.G.covers = [];
  const G = T.G;
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) G.map[r][c] = { t: 'road', owner: null, obj: null, smoke: 0 };
  G.wx = 'clear'; T.bump();
  G.nats[1].cp = 0; G.nats[1].auto = false;   // 상대 세력(부관)이 증원을 사서 시험 차량을 쏘지 않게
  return G;
}
const F = (T, n) => T.__get(n);
const diff = (a, b) => { let d = (a - b) % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return d; };

test('포탑: 차체는 그대로 두고 포탑만 표적 쪽으로 돌린 뒤에야 쏜다', () => {
  const T = loadGame(); const G = setup(T);
  const tk = T.mkUnit(0, 'tank', 8, 8); tk.x = 8.5; tk.z = 8.5; tk.face = 0; tk.cd = 0; tk.hold = true;
  tk._sc = { coax: 1e9, cmd: 1e9, ldr: 1e9 };   // 주포만 본다(차장 원격 기관총은 포탑과 따로 돈다)
  const e = T.mkUnit(1, 'rifle', 8, 4); e.x = 4.5; e.z = 8.5; e.hold = true; e.cd = 99; e.hp = 99; e.ssm = 0; // 연막을 던져 숨지 않게(포탑만 본다)
  T.rtTick(0.1);
  assert.equal(tk.firedT, undefined, '포탑이 뒤를 보기 전에는 쏘지 않음');
  let firedAt = null, want = null;
  for (let i = 0; i < 80 && firedAt == null; i++) { T.rtTick(0.1); if (tk.firedT != null) { firedAt = G.time; want = Math.atan2(e.z - tk.z, e.x - tk.x) * 180 / Math.PI; } }
  assert.ok(firedAt != null && firedAt > 2.5, `뒤로 돌리는 데 몇 초 걸림 (${firedAt})`);
  assert.ok(Math.abs(diff(tk.tf, want)) < 6, `포탑은 표적을 봄 (${tk.tf.toFixed(0)} / ${want.toFixed(0)})`);
  assert.ok(Math.abs(diff(tk.face, 0)) < 1, '차체는 그대로(장갑 방향도 그대로)');
});

test('가속: 차량은 서서히 빨라지고, 목적지 앞에서 줄여 선다', () => {
  const T = loadGame(); const G = setup(T);
  const v = T.mkUnit(0, 'ifv', 5, 2); v.x = 2.5; v.z = 5.5; v.face = 0;
  T.orderMoveTo(v, 12.5, 5.5);
  T.rtRun(0.5); const x1 = v.x; const vmax = T.UT.ifv.mv * 0.2;
  assert.ok(v.vs < vmax * 0.5, `0.5초 뒤 속도 ${v.vs.toFixed(2)} < 최고 ${vmax}`);
  T.rtRun(3); assert.ok(v.vs > vmax * 0.9, '몇 초 뒤 최고 속도');
  T.rtRun(10); assert.ok(Math.hypot(v.x - 12.5, v.z - 5.5) < 0.15, '목적지에 섬'); assert.ok(Math.abs(v.vs) < 0.05);
  assert.ok(x1 > 2.5);
});

test('회전: 궤도 차량은 제자리에서 천천히 돌고, 바퀴 차량은 달리며 꺾는다', () => {
  const T = loadGame(); const G = setup(T);
  const tk = T.mkUnit(0, 'tank', 5, 5); tk.x = 5.5; tk.z = 5.5; tk.face = 0;
  T.orderMoveTo(tk, 5.5, 10.5);   // 오른쪽 90°
  const x0 = tk.x, z0 = tk.z; let maxRate = 0, prev = 0;
  let moved06 = null;
  for (let i = 0; i < 20; i++) { T.rtTick(0.1); maxRate = Math.max(maxRate, Math.abs(diff(tk.face, prev)) / 0.1); prev = tk.face; if (i === 5) moved06 = Math.hypot(tk.x - x0, tk.z - z0); }
  assert.ok(maxRate <= 50, `전차 선회 ${maxRate.toFixed(0)}°/초`);
  assert.ok(moved06 < 0.05, `방향이 크게 틀리면 먼저 서서 돈다 (${moved06.toFixed(2)})`);
  const h = T.mkUnit(0, 'hmv', 12, 5); h.x = 5.5; h.z = 12.5; h.face = 0;
  T.orderMoveTo(h, 5.5, 16.5); T.rtTick(0.1);
  const f1 = h.face; T.rtRun(0.4);
  assert.ok(Math.abs(diff(h.face, f1)) < 20, '서 있는 차는 바퀴만으로 크게 못 돈다');
  T.rtRun(12); assert.ok(Math.hypot(h.x - 5.5, h.z - 16.5) < 0.2, '결국 도착');
});

test('후진: 바로 뒤 가까운 곳은 돌아서지 않고 뒤로 간다', () => {
  const T = loadGame(); const G = setup(T);
  const v = T.mkUnit(0, 'ifv', 5, 6); v.x = 6.5; v.z = 5.5; v.face = 0;
  T.orderMoveTo(v, 5.5, 5.5);
  T.rtRun(5);
  assert.ok(Math.hypot(v.x - 5.5, v.z - 5.5) < 0.15, '도착');
  assert.ok(Math.abs(diff(v.face, 0)) < 10, `앞은 그대로 (${v.face.toFixed(0)}°)`);
});

test('차체 충돌: 건물 옆에서 돌거나 움직여도 차체가 건물 칸에 걸치지 않는다', () => {
  const T = loadGame(); const G = setup(T);
  // 가로 2칸 너비 골목: 4·7행이 건물
  for (let c = 0; c < T.N; c++) { G.map[4][c] = { t: 'bldg', f: 3, hp: 99, owner: null, obj: null, smoke: 0 }; G.map[7][c] = { t: 'bldg', f: 3, hp: 99, owner: null, obj: null, smoke: 0 }; }
  G.navV = (G.navV || 0) + 1; T.bump();
  const pen = F(T, 'hullPen');
  for (const ty of ['tank', 'hmv']) {
    const v = T.mkUnit(0, ty, 5, 3); v.x = 3.5; v.z = 6; v.face = 0;
    T.orderMoveTo(v, 9.5, 6); let worst = 0;
    for (let i = 0; i < 150; i++) { T.rtTick(0.1); worst = Math.max(worst, pen(v, v.x, v.z, v.face)); }
    T.orderMoveTo(v, 4.5, 6);   // 뒤로 되돌아가기(골목에서 돌기)
    for (let i = 0; i < 200; i++) { T.rtTick(0.1); worst = Math.max(worst, pen(v, v.x, v.z, v.face)); }
    assert.equal(worst, 0, `${ty} 차체가 건물에 걸침`);
    assert.ok(Math.hypot(v.x - 4.5, v.z - 6) < 0.3, `${ty} 골목에서 돌아 나옴 (${v.x.toFixed(2)},${v.z.toFixed(2)})`);
    G.units = G.units.filter(u => u !== v);
  }
});

test('공격헬기: 목표 위에 머물지 않고 떨어져 대기하다 스쳐 지나가며 쏘고, 기수는 천천히 돈다', () => {
  const T = loadGame(); const G = setup(T);
  const e = T.mkUnit(1, 'rifle', 10, 10); e.hold = true; e.hp = 999; e.nocas = 1;   // 로켓 폭발에도 표적이 남게
  F(T, 'callGunship')(0, 10, 10); const g = G.units.find(u => u.type === 'gunship'); g.air.until = 1e9;
  let over = 0, n = 0, prev = g.face, maxRate = 0; const modes = new Set(); let offShot = 0, shots = 0;
  // 쏘는 순간의 기수와 표적 방향을 잰다
  const rs = F(T, 'rtShoot'); T.__set('rtShoot', function (a, d) { if (a === g) { shots++; const w = Math.atan2(d.z - a.z, d.x - a.x) * 180 / Math.PI; if (Math.abs(diff(w, a.hd)) > 45) offShot++; } return rs(a, d); });
  for (let i = 0; i < 600; i++) {
    e.cd = 99; T.rtTick(0.1); if (!G.units.includes(g)) break; e.hp = 999;
    n++; if (Math.hypot(g.x - g.air.cx, g.z - g.air.cz) < 1.2) over++;
    maxRate = Math.max(maxRate, Math.abs(diff(g.face, prev)) / 0.1); prev = g.face; modes.add(g.air.mode);
  }
  assert.ok(over / n < 0.15, `목표 1.2칸 안에 머문 비율 ${(over / n).toFixed(2)}`);
  assert.ok(modes.has('hold') && modes.has('run') && modes.has('brk'), [...modes].join(','));
  assert.ok(maxRate <= 80, `기수 회전 ${maxRate.toFixed(0)}°/초`);
  assert.ok(shots > 5, `사격 ${shots}`); assert.equal(offShot, 0, '기수 옆으로는 쏘지 않음');
});
