// 교범 소대 전투 훈련(06c3-drills) 테스트
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './harness.mjs';

const F = (T, n) => T.__get(n);
function setup(T) {
  T.newGame({ slots: ['human', 'human', 'none', 'none'], size: 's', seed: 3, fog: false });
  T.G.units = []; T.G.props = []; T.G.covers = [];
  const G = T.G;
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) G.map[r][c] = { t: 'road', owner: null, obj: null, smoke: 0 };
  G.nats[0].cp = 0; G.nats[1].cp = 0; G.nats[0].auto = false; G.nats[1].auto = false;
  T.bump(); return G;
}
const put = (T, n, ty, x, z) => { const u = T.mkUnit(n, ty, Math.floor(z), Math.floor(x)); u.x = x; u.z = z; return u; };
const see = (T, G, e) => { F(T, 'memOf')(0)[e.id] = { x: e.x, z: e.z, h: .5, t: G.time, ty: e.type, how: 'see' }; };

test('사격 전환: 아군 돌격조가 붙은 표적 대신 다른 적을 쏘고, 다른 적이 없으면 멈춘다', () => {
  const T = loadGame(); const G = setup(T); G.nats[0].ctrl = 'ai';
  const mg = put(T, 0, 'mg', 4.5, 10.5); const as = put(T, 0, 'rifle', 8.6, 10.5);
  const e1 = put(T, 1, 'rifle', 9.5, 10.5), e2 = put(T, 1, 'rifle', 9.5, 14.5); T.bump(); G.time = 5;
  as.tk = { role: 'assault', at: 5 }; mg.tgt = e1.id;
  const b = F(T, 'rtPick')(mg);
  assert.equal(b && b.id, e2.id, '뒤쪽 다른 적으로 사격 전환');
  G.units = G.units.filter(u => u !== e2); T.bump(); G.time = 6;
  assert.equal(F(T, 'rtPick')(mg), null, '아군이 1.5칸 안이면 사격 중지');
  as.tk.role = 'move'; G.time = 7;
  assert.equal(F(T, 'rtPick')(mg).id, e1.id, '돌격조가 아니면 그대로 쏨');
});

test('교대 철수: 소대 반은 물러나고 반(기관총 포함)은 남아 엄호한다', () => {
  const T = loadGame(); const G = setup(T); G.nats[0].ctrl = 'ai';
  const M = [put(T, 0, 'mg', 8.5, 10.5), put(T, 0, 'rifle', 8.5, 11.5), put(T, 0, 'rifle', 7.5, 9.5), put(T, 0, 'rifle', 6.5, 10.5)];
  const e = put(T, 1, 'rifle', 12.5, 10.5); T.bump(); G.time = 5; see(T, G, e);
  F(T, 'tacThink')(0);
  const p = G.plat.find(q => q.mem.includes(M[0].id)); assert.ok(p);
  for (const u of M) { u.path = []; u.tk.at = 0; }
  F(T, 'tacRetreat')(p, M, F(T, 'tacKnown')(0), null);
  assert.equal(p.st, 'retreat'); assert.ok(p._bk, '교대 철수 상태');
  const moving = M.filter(u => u.path && u.path.length);
  assert.equal(moving.length, 2, `반만 움직임 (${moving.length})`);
  assert.ok(!moving.includes(M[0]), '기관총은 남아 엄호');
  for (const u of moving) { u.x = u.dest[0]; u.z = u.dest[1]; u.path = []; }
  G.time = 8; F(T, 'tacThink')(0); G.time = 9; F(T, 'tacThink')(0);
  assert.ok(M[0].path && M[0].path.length, '이번엔 엄호하던 반이 물러남');
});

test('차량 화력 지원: 접적한 소대 곁의 노는 전차가 붙어 초점 적을 노린다', () => {
  const T = loadGame(); const G = setup(T); G.nats[0].ctrl = 'ai';
  const mg = put(T, 0, 'mg', 5.5, 10.5), r1 = put(T, 0, 'rifle', 5.5, 11.5), r2 = put(T, 0, 'rifle', 5.5, 9.5);
  const tk = put(T, 0, 'tank', 3.5, 10.5);
  const e = put(T, 1, 'rifle', 11.5, 10.5); T.bump(); G.time = 5; see(T, G, e);
  F(T, 'aiThink')(0);
  assert.ok(tk._sbf, '전차가 소대 화력 지원에 붙음');
  assert.ok(!tk.job, 'aiThink가 끝나면 숨김 표시를 지움');
  const p = G.plat.find(q => q.mem.includes(mg.id)); assert.equal(tk._sbf.p, p.id);
});

test('대전차 진지 변환: 차량에 로켓을 쏜 대전차 분대는 곧 옆 엄폐로 옮긴다', () => {
  const T = loadGame(); const G = setup(T); G.nats[0].ctrl = 'ai';
  const at = put(T, 0, 'at', 5.5, 10.5); const v = put(T, 1, 'tank', 11.5, 10.5); T.bump(); G.time = 5;
  F(T, 'rtShoot')(at, v);
  assert.ok(at._scoot, '진지 변환 예약');
  G.time = 6; F(T, 'rtTick')(0.05);
  assert.ok(at.path && at.path.length || at._scoot === null && at.dest, '다른 자리로 출발');
  assert.ok(Math.hypot(at.dest[0] - 5.5, at.dest[1] - 10.5) >= .5, '0.5칸 넘게 옮김');
});

test('포격 직후 돌격: 우리 포탄이 초점 적에 떨어지고 그치면 소대가 돌격한다', () => {
  const T = loadGame(); const G = setup(T); G.nats[0].ctrl = 'ai';
  const mg = put(T, 0, 'mg', 4.5, 10.5), r1 = put(T, 0, 'rifle', 4.5, 11.5), r2 = put(T, 0, 'rifle', 4.5, 9.5);
  const e = put(T, 1, 'rifle', 9.5, 10.5); T.bump(); G.time = 5; see(T, G, e);
  F(T, 'tacThink')(0);
  const p = G.plat.find(q => q.mem.includes(mg.id)); assert.equal(p.st, 'contact');
  G.time = 14; see(T, G, e); G._art = [{ x: 9.7, z: 10.4, t: 11, n: 0 }];
  F(T, 'tacThink')(0);
  assert.equal(p.st, 'assault', '포격이 그친 틈에 돌격');
});

test('소대 접적 정지: 한 분대가 적을 보고 멈추면 곁에서 이동하던 분대도 엄폐에 멈춘다', () => {
  const T = loadGame(); const G = setup(T); G.nats[0].ctrl = 'ai';
  const a = put(T, 0, 'rifle', 4.5, 10.5), b = put(T, 0, 'rifle', 4.5, 12.5), c = put(T, 0, 'mg', 3.5, 11.5);
  T.bump(); G.time = 5; F(T, 'tacThink')(0);
  for (const u of [a, b, c]) { u.path = [[14.5, u.z]]; u.tk = { role: 'move', at: 1 }; }
  const e = put(T, 1, 'rifle', 9.5, 10.5); T.bump();
  F(T, 'tacReact')(a);
  assert.equal(a.tk.role, 'react');
  assert.equal(b.tk.role, 'react', '곁 분대도 멈춤');
  assert.ok(!(b.path && b.path.some(q => q[0] > 8)), '앞으로 가던 길을 버림');
});
