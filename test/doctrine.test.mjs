// 교범 전투 습관(05zd-doctrine): 기관총 사격 속도·총열, 탄착 지역, 화력 분배, 매복 대응, 지휘 승계, 화기 다시 잡기, 강화·재편성
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, seedRandom } from './harness.mjs';

const F = (T, n) => T.__get(n);
function setup(T) {
  T.newGame({ slots: ['ai', 'ai', 'none', 'none'], size: 's', seed: 3, fog: false });
  T.G.units = []; T.G.props = []; T.G.covers = [];
  const G = T.G;
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) G.map[r][c] = { t: 'road', owner: null, obj: null, smoke: 0 };
  for (const n of G.order) { G.nats[n].cp = 0; G.nats[n].auto = false; }
  T.bump(); return G;
}
const put = (T, n, ty, x, z) => { const u = T.mkUnit(n, ty, Math.floor(z), Math.floor(x)); u.x = x; u.z = z; return u; };
const DOC = T => T.__eval('DOC');

test('기관총: 접적 처음엔 급속 사격, 오래되면 지속 사격(간격이 길다)', () => {
  const T = loadGame(); seedRandom(T, 4); const G = setup(T);
  const m = put(T, 0, 'mg', 5.5, 5.5); const e = put(T, 1, 'rifle', 12.5, 5.5); e.nocas = 1;
  G.time = 100; m.cd = 0; m._mvT = -99;
  F(T, 'rtFight')(m); assert.equal(m._rof, 'rapid', '처음 사격은 급속'); const cdR = m.cd;
  G.time = 100 + DOC(T).mg.rapidT + 1; m.cd = 0; m.firedT = G.time - 1;
  F(T, 'rtFight')(m); assert.equal(m._rof, 'sus', '25초 넘게 쏘면 지속 사격');
  assert.ok(m.cd > cdR * 1.3, `지속 사격 간격 ${m.cd.toFixed(2)} > 급속 ${cdR.toFixed(2)}`);
});

test('기관총: 총열이 달궈지면 총열을 갈고 그동안 쏘지 않는다', () => {
  const T = loadGame(); seedRandom(T, 5); const G = setup(T);
  const m = put(T, 0, 'mg', 5.5, 5.5); const e = put(T, 1, 'rifle', 12.5, 5.5); e.nocas = 1;
  G.time = 50; m._mvT = -99; m._heat = DOC(T).mg.max - .5; m.cd = 0;
  F(T, 'rtFight')(m);
  assert.ok(m._swap > G.time, '총열 교체 시작'); assert.equal(m._heat, 0);
  const f0 = m.firedT; m.cd = 0; G.time += 1; F(T, 'rtFight')(m);
  assert.equal(m.firedT, f0, '교체 중엔 쏘지 않음');
});

test('기관총: 움직인 직후엔 거치하느라 바로 쏘지 않는다', () => {
  const T = loadGame(); const G = setup(T);
  const m = put(T, 0, 'mg', 5.5, 5.5); put(T, 1, 'rifle', 12.5, 5.5).nocas = 1;
  G.time = 30; m._mvT = 29.5; m.cd = 0; m.firedT = -99;
  F(T, 'rtFight')(m); assert.equal(m.firedT, -99);
  G.time = 31.2; F(T, 'rtFight')(m); assert.ok(m.firedT > 31, '거치 뒤엔 쏜다');
});

test('탄착 지역: 기관총 연사가 겨눈 분대 뒤쪽 적 보병도 제압한다(옆 멀리는 아님)', () => {
  const T = loadGame(); seedRandom(T, 6); const G = setup(T);
  const m = put(T, 0, 'mg', 5.5, 5.5); const d = put(T, 1, 'rifle', 12.5, 5.5); d.nocas = 1;
  const behind = put(T, 1, 'rifle', 13.6, 5.7); behind.nocas = 1;
  const side = put(T, 1, 'rifle', 12.5, 8.5); side.nocas = 1;
  G.time = 10; T.rtShoot(m, d);
  assert.ok((behind.supp || 0) >= DOC(T).bz.supp - 1e-9, `뒤 분대 제압 ${behind.supp}`);
  assert.ok(!(side.supp > 0), '옆 3칸 분대는 그대로');
});

test('가까운 매복: 조용히 걷다 3칸 안에서 기습당하면 수류탄을 던지고 쏜 적에게 돌격한다', () => {
  const T = loadGame(); seedRandom(T, 7); const G = setup(T);
  const u = put(T, 0, 'rifle', 5.5, 5.5); u.nocas = 1; u.path = T.pathPts(u, 5.5, 12.5); G.time = 60;
  const a = put(T, 1, 'rifle', 7.5, 6.5);
  const hp0 = a.hp;
  T.rtShoot(a, u);
  assert.equal(u._ambR, 'assault');
  const end = u.path.at(-1); assert.ok(Math.hypot(end[0] - a.x, end[1] - a.z) < .8, '쏜 적 자리로 간다');
  assert.ok(a.hp < hp0 || (a.supp || 0) >= 1, '수류탄: 매복조가 다치거나 제압');
});

test('먼 매복: 멈춰서 엄폐·응사한다', () => {
  const T = loadGame(); seedRandom(T, 8); const G = setup(T);
  const u = put(T, 0, 'rifle', 5.5, 5.5); u.nocas = 1; u.path = T.pathPts(u, 5.5, 12.5); G.time = 60;
  const a = put(T, 1, 'mg', 13.5, 6.5);
  T.rtShoot(a, u);
  assert.equal(u._ambR, 'halt'); assert.equal(u.path.length, 0);
});

test('이미 교전 중이면 매복 반응을 하지 않는다', () => {
  const T = loadGame(); const G = setup(T);
  const u = put(T, 0, 'rifle', 5.5, 5.5); u.nocas = 1; u.path = T.pathPts(u, 5.5, 12.5); G.time = 60; u.firedT = 58;
  const a = put(T, 1, 'rifle', 7.5, 6.5);
  T.rtShoot(a, u);
  assert.ok(!u._ambR);
});

test('화력 분배: 나를 쏘는 적에게 응사한다', () => {
  const T = loadGame(); const G = setup(T);
  const u = put(T, 0, 'rifle', 5.5, 5.5);
  const near = put(T, 1, 'rifle', 8.5, 5.5); const shooter = put(T, 1, 'rifle', 11.5, 7.5);
  G.time = 20; const base = F(T, 'rtPick')(u);
  assert.equal(base, near, '보통은 가까운 적');
  u._shBy = { id: shooter.id, t: 19.5 };
  assert.equal(F(T, 'rtPick')(u), shooter);
});

test('화력 분배: 아군 둘이 쏘는 거의 끝난 표적 대신 다른 적을 고른다', () => {
  const T = loadGame(); const G = setup(T);
  const u = put(T, 0, 'rifle', 5.5, 5.5);
  const weak = put(T, 1, 'rifle', 8.5, 5.5); const other = put(T, 1, 'rifle', 9.5, 8.5);
  T.__eval('menOf')(weak); for (let i = 2; i < weak.ws.length; i++) weak.ws[i].s = 'kia';
  F(T, 'casSync')(weak);
  G.time = 20;
  for (const z of [5.5, 6.5]) { const f = put(T, 0, 'rifle', 4.5, z); f.lastShot = { t: 19.5, tgt: weak.id, hits: 1, k: 4 }; }
  assert.equal(F(T, 'rtPick')(u), other);
});

test('지휘 승계: 분대장이 쓰러지면 잠시 머뭇거리고, 저격수는 새 분대장을 노린다', () => {
  const T = loadGame(); const G = setup(T);
  const u = put(T, 0, 'rifle', 5.5, 5.5); const M = T.__eval('menOf')(u);
  G.time = 10; T.rtTick(.1);
  assert.equal(u._ldI, 0);
  u.ws[0].s = 'kia'; F(T, 'casSync')(u); T.rtTick(.1);
  assert.ok(u._lapse > G.time, '머뭇거림'); assert.equal(u._ldI, M.find(m => !m.dead && !m.down && !m.gone && !m.task).i);
  let n = 0; for (let i = 0; i < 200; i++) if (F(T, 'snpVictim')(u).i === u._ldI) n++;
  assert.ok(n > 100, `새 분대장을 ${n}/200번 노림`);
});

test('화기 다시 잡기: 분대 기관총 사수가 쓰러지면 8초 뒤 소총수가 넘겨받는다', () => {
  const T = loadGame(); const G = setup(T);
  const u = put(T, 0, 'rifle', 5.5, 5.5); T.__eval('menOf')(u);
  G.time = 50; u.ws[2].s = 'kia'; F(T, 'casSync')(u); u.casT = 50;
  const kitAble = F(T, 'kitAble');
  assert.equal(kitAble(u, 'ar'), 1, '바로는 하나뿐');
  G.time = 50 + DOC(T).reman + .1;
  assert.equal(kitAble(u, 'ar'), 2, '소총수가 넘겨받음');
});

test('강화·재편성: 거점을 차지하면 둘레 부대가 탄약을 나눠 맞추고 경계한다', () => {
  const T = loadGame(); const G = setup(T);
  G.map[8][8].obj = 0; G.objs = [{ r: 8, c: 8, name: '시청' }];
  const a = put(T, 0, 'rifle', 7.5, 8.5); const b = put(T, 0, 'mg', 9.5, 8.5);
  const amMax = T.__eval('amMax'); a.am = 0; b.am = amMax(b);
  G.time = 40; const rep = F(T, 'docConsolidate')(0, G.objs[0], 40);
  assert.ok(rep);
  assert.ok(Math.abs(a.am / amMax(a) - b.am / amMax(b)) < 1e-9, '탄약 비율 같아짐');
  assert.ok(a._cons && a._cons.t > 40, '경계');
});

test('설명서에 교범 습관이 실린다', () => {
  const T = loadGame();
  const h = T.__eval('manualHtml()');
  assert.ok(h.includes('교범대로 싸우는 습관'));
  assert.ok(h.includes('총열'));
});
