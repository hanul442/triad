// 전투 판정(05k-combat)과 전술 AI(06c-tactics) 테스트
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './harness.mjs';

const F = (T, n) => T.__get(n);
function setup(T, fog = false) {
  T.newGame({ slots: ['human', 'human', 'none', 'none'], size: 's', seed: 3, fog });
  T.G.units = []; T.G.props = []; T.G.covers = [];
  const G = T.G;
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) G.map[r][c] = { t: 'road', owner: null, obj: null, smoke: 0 };
  T.bump(); return G;
}
const put = (T, n, ty, x, z) => { const u = T.mkUnit(n, ty, Math.floor(z), Math.floor(x)); u.x = x; u.z = z; return u; };

test('폭발: 병사마다 거리로 따로 다치고, 엎드린 병사는 덜 다친다', () => {
  let up = 0, down = 0;const rnd = Math.random;let seed = 7;Math.random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 40; k++) {
    for (const prone of [0, 1]) {
      const T = loadGame(); const G = setup(T); G.nats[1].ctrl = 'human';
      const u = put(T, 1, 'rifle', 10.5, 10.5); T.rtTick(0.1);
      u._men.forEach((m, i) => { m.x = 10.3 + (i % 3) * .1; m.z = 10.4 + Math.floor(i / 3) * .1; m.pr = prone ? 5 : 0; });
      F(T, 'harm')(u, 2.5, null, { kind: 'blast', x: 10.4, z: 10.5, rad: .3 });
      const hurt = u.ws.filter(w => w.s !== 'ok').length;
      if (prone) down += hurt; else up += hurt;
    }
  }
  Math.random = rnd;
  assert.ok(up > down * 1.4, `서 있으면 ${up}, 엎드리면 ${down}`);
});

test('폭발: 폭심에서 먼 병사는 다치지 않는다', () => {
  const T = loadGame(); const G = setup(T); G.nats[1].ctrl = 'human';
  const u = put(T, 1, 'rifle', 10.5, 10.5); T.rtTick(0.1);
  u._men.forEach((m, i) => { m.x = i < 3 ? 10.1 : 11.6; m.z = 10.5; m.pr = 0; });
  F(T, 'harm')(u, 6, null, { kind: 'blast', x: 10.1, z: 10.5, rad: .3 });
  assert.equal(u.ws.slice(3).filter(w => w.s !== 'ok').length, 0, '1.5칸 떨어진 병사는 무사');
});

test('직접 봐야 조준: 아군이 본 적이라도 쏘는 분대가 못 보면 조준 사격하지 않는다', () => {
  const T = loadGame(); const G = setup(T, true);
  G.map[5][15] = { t: 'park', owner: null, obj: null, smoke: 0 };
  const a = put(T, 0, 'rifle', 4.5, 5.5), e = put(T, 1, 'rifle', 15.4, 5.5);   // 11칸: 숨은 보병 발견 거리(시야×0.6) 밖, 사거리 안
  put(T, 0, 'drone', 15.5, 4.5);   // 드론은 숨은 적을 본다
  T.bump(); G.time = 10;
  assert.equal(T.seen(e, 0), true, '우리 편 누군가는 봄');
  assert.equal(F(T, 'selfSees')(a, e), false, '소총분대는 공원 속 적을 직접 못 봄');
  assert.equal(F(T, 'rtPick')(a), null, '조준 표적 없음');
});

test('제압 사격: 안 보이는 적의 마지막 자리에 쏘아 고개를 숙이게 한다', () => {
  const T = loadGame(); const G = setup(T, true);
  G.map[5][9] = { t: 'park', owner: null, obj: null, smoke: 0 };
  const a = put(T, 0, 'mg', 4.5, 5.5), e = put(T, 1, 'rifle', 8.6, 5.5);
  T.bump(); G.time = 10;
  F(T, 'memOf')(0)[e.id] = { x: 8.6, z: 5.5, h: .5, t: 9, ty: 'rifle', how: 'flash' };
  e.supp = 0;
  assert.equal(F(T, 'supFire')(a, false), true);
  assert.ok(e.supp > .3, `제압 ${e.supp}`);
});

test('소총분대 편성: 기관총 사수·유탄수·대전차 사수가 있고, 가까운 차량에 로켓을 쏜다', () => {
  const T = loadGame(); const G = setup(T); G.nats[1].ctrl = 'human';
  const u = put(T, 0, 'rifle', 5.5, 5.5); T.rtTick(0.1);
  const name = F(T, 'kitName');
  assert.equal(name('rifle', 2), '기관총 사수'); assert.equal(name('rifle', 3), '유탄수'); assert.equal(name('rifle', 4), '대전차 사수');
  assert.equal(F(T, 'kitAble')(u, 'ar'), 2);
  const v = put(T, 1, 'ifv', 8.5, 5.5); v.face = 90; T.bump(); u.cd = 0;
  assert.equal(F(T, 'squadRocket')(u), true, '로켓 발사');
  assert.equal(u.rk, 1, '로켓 한 발 남음');
});

test('전술 AI: 접적하면 기관총은 화력 기반, 소총은 옆으로 돌고, 움직이는 동안은 쏘지 않는다', () => {
  const T = loadGame(); const G = setup(T, true); G.nats[0].ctrl = 'ai'; G.nats[1].ctrl = 'human';
  const mg = put(T, 0, 'mg', 4.5, 10.5), r1 = put(T, 0, 'rifle', 4.5, 11.5), r2 = put(T, 0, 'rifle', 4.5, 9.5);
  const e = put(T, 1, 'rifle', 9.5, 10.5); T.bump(); G.time = 5;
  F(T, 'memOf')(0)[e.id] = { x: 9.5, z: 10.5, h: .5, t: 5, ty: 'rifle', how: 'see' };
  F(T, 'tacThink')(0);
  const p = G.plat.find(q => q.mem.includes(mg.id));
  assert.ok(p, '소대 편성'); assert.equal(p.st, 'contact');
  assert.equal(p.roles[mg.id], 'bof');
  const man = [r1, r2].filter(u => p.roles[u.id] === 'man');
  assert.ok(man.length >= 1, '측면조 있음');
  const moved = man.filter(u => u.dest);
  assert.ok(moved.length >= 1, '측면조가 자리를 잡으러 감');
  for (const u of moved) { const a = Math.atan2(u.dest[1] - 10.5, u.dest[0] - 9.5); const axis = Math.atan2(10.5 - 10.5, 4.5 - 9.5);
    const da = Math.abs(Math.atan2(Math.sin(a - axis), Math.cos(a - axis))); assert.ok(da > 0.9, `정면이 아닌 옆(${da.toFixed(2)})`); }
  const u = moved[0]; u.cd = 0; const cd0 = u.cd; F(T, 'rtFight')(u);
  assert.equal(u.cd, cd0, '움직이는 측면조는 쏘지 않음');
});

test('임무형 지휘: 묶어서 공격 임무를 주면 소대가 알아서 가고, 직접 명령을 받으면 임무에서 빠진다', () => {
  const T = loadGame(); const G = setup(T, true); G.nats[0].ctrl = 'human'; G.nats[1].ctrl = 'human';
  const us = [put(T, 0, 'rifle', 3.5, 10.5), put(T, 0, 'mg', 3.5, 11.5), put(T, 0, 'rifle', 3.5, 9.5), put(T, 0, 'ifv', 2.5, 10.5)];
  T.bump();
  F(T, 'radioExec')('mis', ['attack', 14.5, 10.5, 'full'], us);
  const p = G.plat.find(q => q.human && q.mem.includes(us[0].id));
  assert.ok(p, '소대 생김'); assert.equal(p.mode, 'attack'); assert.equal(p.mem.length, 3, '보병 셋이 한 소대');
  assert.ok(us[3].msn, '장갑차는 소대를 따름');
  T.rtRun(40);
  assert.ok(us[0].x > 6, `소총분대가 목표 쪽으로 감 (${us[0].x.toFixed(1)})`);
  assert.ok(us[3].x > 4, `장갑차도 따라감 (${us[3].x.toFixed(1)})`);
  F(T, 'radioExec')('move', [3.5, 3.5], [us[1]]);
  assert.equal(us[1].pl, null, '직접 명령 → 임무 해제'); assert.ok(!p.mem.includes(us[1].id));
});

test('임무형 지휘: 반자동 소대는 돌격 전에 승인을 요청하고, 승인하면 돌격한다', () => {
  const T = loadGame(); const G = setup(T, true); G.nats[0].ctrl = 'human'; G.nats[1].ctrl = 'human';
  const us = [put(T, 0, 'mg', 4.5, 10.5), put(T, 0, 'rifle', 4.5, 11.5)];
  const e = put(T, 1, 'rifle', 9.5, 10.5); T.bump(); G.time = 20;
  F(T, 'radioExec')('mis', ['attack', 9.5, 10.5, 'semi'], us);
  const p = G.plat.find(q => q.human);
  F(T, 'memOf')(0)[e.id] = { x: 9.5, z: 10.5, h: .5, t: 20, ty: 'rifle', how: 'see' };
  e.supp = 3; e.brk = 1; p.st = 'contact'; p.stT = 0; for (const u of us) { u.path = []; }
  F(T, 'tacThink')(0);
  assert.equal(p.req && p.req.k, 'assault', '돌격 승인 요청');
  assert.notEqual(p.st, 'assault');
  F(T, 'msnAnswer')(p.id, true); for (const u of us) u.path = [];
  F(T, 'tacThink')(0);
  assert.equal(p.st, 'assault');
});
