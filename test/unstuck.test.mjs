// 멈춤·뚫고 지나감: 차량은 주차 차를 차체로 피하거나(바퀴) 깔아뭉개고(궤도), 막히면 빠져나오고, 보병은 돌아가는 길에서 명령을 버리지 않는다
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './harness.mjs';

function setup(T) {
  T.newGame({ slots: ['human', 'human', 'none', 'none'], size: 's', seed: 3, fog: false });
  T.G.units = []; T.G.props = []; T.G.covers = [];
  const G = T.G;
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) G.map[r][c] = { t: 'road', owner: null, obj: null, smoke: 0 };
  G.wx = 'clear'; G.navV = (G.navV || 0) + 1; T.bump();
  return G;
}
const car = (G, x, z, ry = 0) => { const p = { k: 'car', kind: 'sedan', x, z, ry, col: '#888' }; G.props.push(p); G.navV = (G.navV || 0) + 1; return p; };
const F = (T, n) => T.__get(n);
// 상대(레드)가 지원 부대를 사 보내 싸움이 끼어들지 않게, 시험 부대만 남기고 한 걸음
const step = T => { T.rtTick(0.1); T.G.units = T.G.units.filter(u => u.nat === 0); };
// 차체가 막는 물체에 얼마나 걸쳤나(05b2-motion의 분리축 판정)
const obsPen = (T, u) => { const s = T.__eval('vSpec')(u), a = u.hd * Math.PI / 180, c = Math.cos(a), n = Math.sin(a); const ex = Math.abs(c) * s.hl + Math.abs(n) * s.hw, ez = Math.abs(n) * s.hl + Math.abs(c) * s.hw;
  return F(T, 'vObsPen')(u, T.__eval('navCls')(u), u.x, u.z, c, n, s, ex, ez); };

test('바퀴 차량은 길 가운데 선 주차 차를 차체로 피해 돌아가고, 차에 파고들지 않는다', () => {
  const T = loadGame(); const G = setup(T);
  for (const z of [5.3, 5.5, 5.7]) car(G, 8.5, z, 0);   // 길을 반쯤 막은 주차 차 세 대
  const h = T.mkUnit(0, 'hmv', 5, 3); h.x = 3.5; h.z = 5.5; h.face = 0;
  T.orderMoveTo(h, 13.5, 5.5);
  let worst = 0;
  for (let i = 0; i < 300 && h.path.length; i++) { step(T); worst = Math.max(worst, obsPen(T, h)); }
  assert.ok(Math.hypot(h.x - 13.5, h.z - 5.5) < 0.3, `도착 (${h.x.toFixed(2)}, ${h.z.toFixed(2)})`);
  assert.ok(worst < 0.02, `주차 차에 걸친 깊이 ${worst.toFixed(3)}칸`);
  assert.ok(!G.props.some(p => p.crush), '바퀴 차량은 길이 있으면 차를 밀지 않는다');
});

test('전차는 앞을 막은 주차 차를 깔아뭉개고 곧장 지나간다', () => {
  const T = loadGame(); const G = setup(T);
  const p = car(G, 8.5, 5.5, 0);
  const tk = T.mkUnit(0, 'tank', 5, 3); tk.x = 3.5; tk.z = 5.5; tk.face = 0;
  tk.path = [[13.5, 5.5]];   // 곧장 차를 향해
  for (let i = 0; i < 200 && tk.path.length; i++) step(T);
  assert.ok(p.crush, '차가 깔림');
  assert.ok(Math.hypot(tk.x - 13.5, tk.z - 5.5) < 0.3, '전차는 그대로 지나감');
});

test('주차 차에 사방이 막힌 바퀴 차량은 뚫고 지나가지 않고, 후진·밀어붙이기로 빠져나온다', () => {
  const T = loadGame(); const G = setup(T);
  const h = T.mkUnit(0, 'ifv', 5, 5); h.x = 5.5; h.z = 5.5; h.face = 0; h.hd = 0; h.tf = 0; h.vs = 0;
  // 앞뒤·양옆에 바짝 붙은 주차 차
  car(G, 5.5 + .45, 5.5, Math.PI / 2); car(G, 5.5 - .45, 5.5, Math.PI / 2); car(G, 5.5, 5.5 + .24, 0); car(G, 5.5, 5.5 - .24, 0);
  T.orderMoveTo(h, 10.5, 9.5);
  if (!h.path.length) h.path = [[10.5, 9.5]];
  let worst = 0;
  for (let i = 0; i < 600 && h.path.length; i++) { step(T); worst = Math.max(worst, obsPen(T, h)); }
  assert.ok(Math.hypot(h.x - 10.5, h.z - 9.5) < 0.4 || G.log.some(m => m.includes('길이 막혀')), `빠져나와 도착하거나, 못 가면 알림 (${h.x.toFixed(2)}, ${h.z.toFixed(2)})`);
  assert.ok(worst < 0.1, `차체가 주차 차를 통째로 뚫지 않음 (최대 걸침 ${worst.toFixed(3)}칸)`);
});

test('보병: 물길을 크게 돌아가는 길(곧은 거리가 한동안 안 줄어듦)에서도 명령을 버리지 않는다', () => {
  const T = loadGame(); const G = setup(T);
  // 가운데 긴 물길: 목적지는 물 바로 너머, 길은 물길 끝을 돌아간다
  for (let r = 0; r < T.N - 3; r++) G.map[r][8] = { t: 'water', owner: null, obj: null, smoke: 0 };
  G.navV++;
  const u = T.mkUnit(0, 'rifle', 3, 7); u.x = 7.5; u.z = 3.5; u.hold = true;
  T.orderMoveTo(u, 9.5, 3.5);
  assert.ok(u.path.length > 1, '돌아가는 길');
  for (let i = 0; i < 2400 && u.path.length; i++) step(T);
  assert.ok(Math.hypot(u.x - 9.5, u.z - 3.5) < 0.5, `도착 (${u.x.toFixed(2)}, ${u.z.toFixed(2)})`);
});

test('분대원은 주차 차 모양 안에 서지 않는다', () => {
  const T = loadGame(); const G = setup(T);
  for (let i = 0; i < 6; i++) car(G, 6 + i * .5, 6.5, 0);
  const u = T.mkUnit(0, 'rifle', 7, 5); u.x = 5.5; u.z = 7.5;
  T.orderMoveTo(u, 7.5, 6.78);   // 차 바로 옆에 서면 병사들이 차를 엄폐로 삼아 흩어진다
  const inBox = T.inBox; let bad = 0;
  for (let i = 0; i < 400; i++) { step(T); for (const m of u._men || []) for (const o of T.__eval('NAV').obs || []) if (o.k === 'car' && inBox(o, m.x, m.z, -.01)) bad++; }
  assert.equal(bad, 0);
});
