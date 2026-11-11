import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, seedRandom, playAI } from './harness.mjs';

const E = (T, s) => T.__eval(s);
function setup(T, armies = ['rok', 'std', 'std', 'std']) {
  T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 's', seed: 3, fog: false, armies });
  T.G.units = []; T.G.props = []; T.G.covers = []; T.G.forts = []; T.G.debris = [];
  const G = T.G;
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) G.map[r][c] = { t: 'road', owner: null, obj: null, smoke: 0 };
  G.objs = []; G.depot = null; T.bump(); G.nats[1].ctrl = 'human'; G.nats[0].cp = 80; G.nats[1].cp = 80;
  return G;
}
const run = (T, s) => { for (let i = 0; i < s * 10; i++) T.rtTick(0.1); };

test('국군: 세력마다 장비를 고르고, 국군이면 국군 장비 이름을 쓴다', () => {
  const T = loadGame();
  T.newGame({ slots: ['ai', 'ai', 'none', 'none'], size: 's', seed: 1, armies: ['std', 'rok', 'std', 'std'] });
  assert.equal(T.G.nats[0].army, 'std'); assert.equal(T.G.nats[1].army, 'rok');
  assert.equal(E(T, 'isRok(1)'), true); assert.equal(E(T, 'isRok(0)'), false);
  // 홀수 세력이라도 국군이면 동구권·민병대 쪽이 아니다
  assert.equal(E(T, 'natEast(1)'), false); assert.equal(E(T, 'militia(1)'), false);
  assert.equal(E(T, "fleetReal('tank',1)"), 'K2 흑표'); assert.equal(E(T, "fleetReal('mlrs',1)"), 'K239 천무');
  assert.equal(E(T, "fleetReal('tank',0)"), 'K2·M1A2');
  // 장비를 정하지 않으면 기본
  T.newGame({ slots: ['ai', 'ai', 'none', 'none'], size: 's', seed: 1 });
  assert.equal(T.G.nats[1].army, 'std'); assert.equal(E(T, 'natEast(1)'), true); assert.equal(E(T, "fleetReal('tank',1)"), 'T-90·T-72');
  // 모든 병종에 국군 이름이 있다(자폭 차량 빼고)
  for (const t of T.TYPES) if (!T.UT[t].noBuy && t !== 'vbied') assert.ok(E(T, `!!ROK_REAL[${JSON.stringify(t)}]`), `국군 이름 없음 ${t}`);
});

test('국군: 천궁은 국군만, 자폭 차량은 국군이 못 부른다', () => {
  const T = loadGame(); const G = setup(T, ['rok', 'std', 'std', 'std']);
  assert.ok(T.deploySpots(0, 'kmsam').length > 0, '국군은 천궁을 부른다');
  assert.equal(T.deploySpots(1, 'kmsam').length, 0, '기본 세력은 천궁을 못 부른다');
  assert.equal(T.deploySpots(0, 'vbied').length, 0, '국군은 자폭 차량을 못 부른다');
  const k = T.deploySpots(0, 'kmsam')[0]; const s = T.buy(0, 'kmsam', E(T, `kr(${k})`), E(T, `kc(${k})`)); assert.ok(s);
  assert.equal(T.buy(1, 'kmsam', 1, 1), null);
  assert.ok(E(T, "BRANCH.find(b=>b.k==='ad').ts.includes('kmsam')"));
  assert.ok(E(T, "!!SELF_RUN.kmsam&&!!VX_BUILD.kmsam&&ARM.kmsam.length===4&&AMMO.kmsam>0"), '표 채우기');
});

test('천궁: 지상은 안 쏘고, 적 공격헬기를 떨어뜨리고, 탄도미사일을 요격한다', () => {
  const T = loadGame(); seedRandom(T, 7); const G = setup(T);
  const s = T.mkUnit(0, 'kmsam', 2, 2); s.hold = true;
  const e = T.mkUnit(1, 'tank', 2, 12); e.cd = 1e9; e.hold = true;
  run(T, 4); assert.equal(e.hp, E(T, 'hpMax')(e), '지상 표적은 쏘지 않는다');
  // 공격헬기: 여러 번 불러 대부분 떨어진다
  let down = 0;
  for (let i = 0; i < 10; i++) {
    G.units = G.units.filter(u => u.type !== 'gunship'); s.cd = 0; s.am = 8; s.hp = 7; s.supp = 0;
    E(T, 'callGunship(1,20,20)'); for (const h of G.units) if (h.type === 'gunship') h.cd = 1e9;
    const k0 = s.kills || 0; run(T, 1); if ((s.kills || 0) > k0) down++;
  }
  assert.ok(down >= 6, `공격헬기 격추 ${down}/10`);
  // 탄도미사일: 여러 발 중 다수 요격
  let hit = 0, tries = 20;
  for (let i = 0; i < tries; i++) {
    s.cd = 0; s.am = 8; s.supp = 0; const before = s.kills || 0;
    E(T, 'msStrike(1,3,20,"tbm")'); G.strikes[G.strikes.length - 1].t = G.time;
    run(T, .3); if ((s.kills || 0) > before) hit++;
  }
  assert.ok(hit >= 7 && hit <= 18, `탄도미사일 요격 ${hit}/${tries}`);
  // 기본 세력 대공은 탄도미사일을 요격하지 못한다(그대로)
  assert.ok(G.log.some(l => /탄도미사일 요격/.test(l)));
});

test('천무: 국군 다연장은 유도 로켓 6발을 표적 둘레에 모은다', () => {
  const T = loadGame(); seedRandom(T, 3); const G = setup(T);
  const m = T.mkUnit(0, 'mlrs', 2, 2); const e = T.mkUnit(1, 'rifle', 2, 18);
  G.shells = []; E(T, 'mlrsShoot')(m, e);
  assert.equal(G.shells.length, 6);
  for (const sh of G.shells) assert.ok(Math.hypot(sh.x1 - e.x, sh.z1 - e.z) <= .8, '표적 둘레에 떨어진다');
  // 기본 세력은 12발
  T.G.nats[0].army = 'std'; G.shells = []; E(T, 'mlrsShoot')(m, e); assert.equal(G.shells.length, 12);
});

test('국군: 설명서에 국군 장비가 실리고, 국군 세력끼리 AI 한 판이 오류 없이 끝난다', async () => {
  const T = loadGame(); seedRandom(T, 5);
  const h = E(T, 'manualHtml()'); assert.ok(h.includes('국군 장비') && h.includes('K2 흑표') && h.includes('천궁'));
  await playAI(T, { size: 's', seed: 11, maxR: 6, armies: ['rok', 'rok', 'none', 'none'] });
  assert.ok(T.G.over, '판이 끝난다'); assert.equal(T.G.errs.length, 0, JSON.stringify(T.G.errs.slice(0, 3)));
  assert.ok(T.G.nats.every((x, i) => i > 1 || x.army === 'rok'));
});
