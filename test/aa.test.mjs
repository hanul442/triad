// 대공(05f3-aa): 휴대용 대공미사일이 헬기를 실제로 잡는지, 플레어·조준 시간, 수송헬기 피격, 대공팀 자동 접근, AI 판단
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, seedRandom } from './harness.mjs';

function setup(T, seed = 5) {
  T.newGame({ slots: ['human', 'human', 'none', 'none'], size: 'm', seed: 3, fog: false });
  const G = T.G; G.units = []; G.props = []; G.covers = []; G.wx = 'clear';
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) G.map[r][c] = { t: 'road', owner: null, obj: null, smoke: 0 };
  for (const n of [0, 1]) { G.nats[n].auto = false; G.nats[n].ctrl = 'human'; }
  T.bump(); seedRandom(T, seed); return G;
}
function withRandom(T, v, fn) { const M = Object.create(Math); M.random = () => v; const old = T.__eval('Math'); T.__set('Math', M); try { return fn(); } finally { T.__set('Math', old); } }

test('대공 미사일이 공격헬기에 맞으면 떨어지거나 부서져 돌아간다', () => {
  const T = loadGame(); const G = setup(T);
  const a = T.mkUnit(0, 'aa', 20, 20); a.hold = true;
  const g = T.__get('callGunship')(1, 20, 14); g.x = 16.5; g.z = 20.5; g.flares = 0;
  withRandom(T, .01, () => T.rtShoot(a, g));
  assert.ok(!G.units.includes(g), '명중하면(60%) 격추');
  assert.ok(G.log.some(s => /공격헬기 격추/.test(s)));
  const g2 = T.__get('callGunship')(1, 20, 14); g2.x = 16.5; g2.z = 20.5; g2.flares = 0;
  // 명중했지만 격추(60%)는 아님: 크게 부서지고 임무를 버린다
  T.__eval('AA.killP=0'); try { withRandom(T, .01, () => T.rtShoot(a, g2)); } finally { T.__eval('AA.killP=.6'); }
  assert.ok(G.units.includes(g2) && g2.hp <= 14 * .3 + .02, `크게 부서짐 hp=${g2.hp}`);
  assert.equal(g2.air.leave, 1, '임무 포기');
});

test('헬기는 미사일 경보에 플레어를 뿌린다: 속으면 피해 없음, 한 번에 한 회분', () => {
  const T = loadGame(); const G = setup(T);
  const a = T.mkUnit(0, 'aa', 20, 20); a.hold = true;
  const g = T.__get('callGunship')(1, 20, 14); g.x = 16.5; g.z = 20.5;
  assert.equal(g.flares, 6, '공격헬기 플레어 6회분');
  withRandom(T, .2, () => T.rtShoot(a, g));   // .2 < 플레어에 속을 확률 .35
  assert.equal(g.hp, 14); assert.equal(g.flares, 5);
  assert.ok(G.log.some(s => /플레어로 미사일 회피/.test(s)));
  assert.equal(g.air.mode, 'brk', '경보를 받으면 급선회');
});

test('대공팀은 탐색기가 열을 잡는 1.5초 뒤에 쏜다', () => {
  const T = loadGame(); const G = setup(T);
  const a = T.mkUnit(0, 'aa', 20, 26); a.hold = true; a.cd = 0;
  const d = T.mkUnit(1, 'drone', 20, 20); d.hold = true;
  T.rtRun(1.0); assert.ok(!a.lastShot, '1초 만에는 아직 못 쏜다');
  T.rtRun(1.2); assert.ok(a.lastShot && a.lastShot.tgt === d.id, '1.5초 넘게 보고 있으면 쏜다');
});

test('공격헬기는 멀리서도 보인다(시야선이 열려 있으면 22칸까지)', () => {
  const T = loadGame(); const G = setup(T); G.fog = true;
  const a = T.mkUnit(0, 'rifle', 20, 40); a.hold = true;
  const g = T.__get('callGunship')(1, 20, 20); g.x = 20.5; g.z = 20.5;
  T.bump(); assert.ok(T.seen(g, 0), '20칸 떨어진 헬기를 본다');
  const dr = T.mkUnit(1, 'drone', 20, 21); dr.x = 21.5; T.bump(); assert.ok(!T.seen(dr, 0), '작은 드론은 그만큼 멀리서는 안 보인다');
});

test('대공팀이 지키는 착륙장에 내리는 수송헬기는 격추될 수 있다(탄 분대도 잃음)', () => {
  const T = loadGame(); const G = setup(T);
  const a = T.mkUnit(0, 'aa', 20, 26); a.hold = true; a.cd = 0; a.hp = 1e6;
  const sp = T.mkUnit(1, 'rifle', 22, 20); sp.hold = true; sp.cd = 1e9;   // 착륙장을 보는 아군
  G.nats[1].cp = 50;
  const before = G.nats[1].losses;
  assert.ok(T.support(1, 'heli', 20, 20));
  withRandom(T, .5, () => T.rtRun(7));   // 플레어(.35)에 안 속고, 명중, 격추(.7) 판정
  assert.ok(G.log.some(s => /수송헬기 격추/.test(s)), G.log.slice(-6).join(' / '));
  assert.ok(!G.log.some(s => /헬기 투입$/.test(s) && /소총분대/.test(s)), '분대가 내리지 못함');
  assert.ok(G.nats[1].losses >= before + 1);
  assert.equal(G.nats[0].kills >= 1, true);
});

test('대공이 없으면 수송헬기는 분대를 내려놓는다', () => {
  const T = loadGame(); const G = setup(T);
  const sp = T.mkUnit(1, 'rifle', 22, 20); sp.hold = true;
  G.nats[1].cp = 50; assert.ok(T.support(1, 'heli', 20, 20)); T.rtRun(7);
  assert.ok(G.log.some(s => /소총분대 헬기 투입/.test(s)));
});

test('대공팀은 사거리 밖 적 헬기를 보면 알아서 쏠 수 있는 곳으로 간다', () => {
  const T = loadGame(); const G = setup(T);
  const a = T.mkUnit(0, 'aa', 20, 50); a.am = 4;
  const g = T.__get('callGunship')(1, 20, 14); g.x = 24.5; g.z = 20.5; g.air.until = 1e9;
  T.rtRun(1.2);
  assert.ok(a.path && a.path.length, '스스로 움직인다');
  const end = a.path[a.path.length - 1]; assert.ok(Math.hypot(end[0] - a.x, end[1] - a.z) > 4, '헬기 쪽으로');
  const b = T.mkUnit(0, 'aa', 30, 50); b.hold = true; T.rtRun(1.2); assert.ok(!(b.path && b.path.length), '제자리 유지 명령이면 그대로');
});

test('AI: 적 헬기가 보이면 대공팀을 먼저 사고, 적 대공 근처에는 수송헬기를 내리지 않는다', () => {
  const T = loadGame(); const G = setup(T);
  const g = T.__get('callGunship')(1, 20, 14);
  const w = T.__get('aiAirW')([g], () => 0);
  assert.ok(w.aa >= 4, `대공팀 가중치 ${w.aa}`);
  G.nats[0].ctrl = 'ai'; G.nats[0].cp = 50;
  const e = T.mkUnit(1, 'aa', 20, 26); e.hold = true;
  for (const [r, c] of [[22, 20], [22, 8]]) { const s = T.mkUnit(0, 'rifle', r, c); s.hold = true; } T.bump();
  assert.equal(T.support(0, 'heli', 20, 20), false, '적 대공팀 6칸 옆 착륙장은 피한다');
  assert.ok(T.support(0, 'heli', 20, 8), '멀리 떨어진 곳은 괜찮다');
});
