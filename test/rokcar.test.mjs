import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, seedRandom } from './harness.mjs';

const E = (T, s) => T.__eval(s);
const CARS = ['korando', 'rexton', 'tasman'];
function setup(T) {
  T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 's', seed: 3, fog: false });
  const G = T.G; G.units = []; G.props = []; G.covers = []; G.forts = []; G.debris = [];
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) G.map[r][c] = { t: 'road', owner: null, obj: null, smoke: 0 };
  G.objs = []; G.depot = null; T.bump(); G.nats[1].ctrl = 'human'; G.nats[0].auto = true; G.nats[0].cp = 50; G.nats[1].cp = 0;
  return G;
}
const run = (T, s) => { for (let i = 0; i < s * 10; i++) T.rtTick(0.1); };

test('지휘·연락 차량: 표·병과·이름·설명서가 다 있고 무장이 없다', () => {
  const T = loadGame();
  for (const t of CARS) {
    assert.ok(T.UT[t] && T.TYPES.includes(t), t);
    assert.equal(T.UT[t].atk.inf + T.UT[t].atk.veh + T.UT[t].atk.air, 0, `무장 없음 ${t}`);
    assert.ok(E(T, `VEH.${t}.hl`) > 0 && !E(T, `VEH.${t}.trk`), `바퀴 차량 ${t}`);
    assert.equal(E(T, `ARM.${t}.length`), 4);
    assert.equal(E(T, `SEC.${t}.length`), 0, `부무장 없음 ${t}`);
    assert.ok(E(T, `!!VX_BUILD.${t}`), `모형 ${t}`);
    assert.ok(E(T, `MAN_AUTO.${t}`), `설명서 ${t}`);
    assert.equal(E(T, `branchOf('${t}')`), 'c2');
  }
  assert.match(E(T, `fleetReal('rexton',0)`), /렉스턴/);
  assert.match(E(T, `fleetReal('tasman',0)`), /타스만/);
  assert.match(E(T, `fleetReal('korando',0)`), /코란도/);
  assert.match(E(T, `fleetReal('korando',1)`), /UAZ/);
});

test('지휘차: 범위 안 아군은 사기가 빨리 돌아오고 분대장 공백이 짧아진다', () => {
  const T = loadGame(); seedRandom(T, 2); const G = setup(T);
  const a = T.mkUnit(0, 'rifle', 10, 10), b = T.mkUnit(0, 'rifle', 10, 30);
  const v = T.mkUnit(0, 'tasman', 12, 10); v.hold = true;
  for (const u of [a, b]) { u.hold = true; T.rtTick(0.1); }
  run(T, 1); a.mor = 30; b.mor = 30; a.casT = b.casT = -99; a.supp = b.supp = 0;
  const t0 = G.time; a._lapse = t0 + 4; b._lapse = t0 + 4;
  run(T, 5);
  assert.ok(a.mor > b.mor + 5, `범위 안 ${a.mor.toFixed(1)} > 밖 ${b.mor.toFixed(1)}`);
  assert.ok(a._lapse < b._lapse, '분대장 공백이 줄어든다');
  assert.equal((G.errs || []).length, 0, String(G.errs));
});

test('렉스턴은 작은 조를 태우고, 지휘차·연락차는 적이 가까우면 물러난다', () => {
  const T = loadGame(); seedRandom(T, 5); const G = setup(T);
  assert.equal(E(T, 'CARRY.rexton.cap'), 4);
  const v = T.mkUnit(0, 'rexton', 20, 20); const at = T.mkUnit(0, 'at', 20, 21);
  assert.ok(E(T, `carryRoom(G.units.find(u=>u.id===${v.id}),G.units.find(u=>u.id===${at.id}))`), '대전차조(4명)는 탄다');
  const rf = T.mkUnit(0, 'rifle', 21, 20);
  assert.ok(!E(T, `carryRoom(G.units.find(u=>u.id===${v.id}),G.units.find(u=>u.id===${rf.id}))`), '소총분대(9명)는 못 탄다');
  G.units = G.units.filter(u => u.type !== 'rifle' && u.type !== 'at');
  const k = T.mkUnit(0, 'korando', 20, 25);
  const e = T.mkUnit(1, 'rifle', 20, 29); e.cd = 1e9; e.nocas = 1; e.hold = true;
  const d0 = Math.hypot(k.x - e.x, k.z - e.z);
  run(T, 6);
  assert.ok(Math.hypot(k.x - e.x, k.z - e.z) > d0 + 1, '연락차가 물러났다');
  assert.equal((G.errs || []).length, 0, String(G.errs));
});

test('타스만 통신 모듈: 범위 안 분대가 본 적은 관측반처럼 바로 알린다', () => {
  const T = loadGame(); seedRandom(T, 7); const G = setup(T); G.fog = true;
  const s = T.mkUnit(0, 'rifle', 20, 20); s.hold = true;
  const e = T.mkUnit(1, 'rifle', 20, 24); e.cd = 1e9; e.nocas = 1; e.hold = true;
  T.bump();
  const before = E(T, `obsNat(0,G.units.find(u=>u.id===${e.id}))`);
  assert.equal(before, 2, '분대 무전');
  const v = T.mkUnit(0, 'tasman', 22, 18); v.hold = true; G.time += 1; G._c2 = null; G._obn = null; T.bump();
  assert.equal(E(T, `obsNat(0,G.units.find(u=>u.id===${e.id}))`), 1, '통신 모듈로 바로');
});

test('AI도 부대가 늘면 지휘차·연락차를 부른다', () => {
  const T = loadGame(); seedRandom(T, 9);
  T.newGame({ slots: ['ai', 'ai', 'none', 'none'], size: 'm', seed: 7, fog: true });
  const G = T.G; let seen = new Set();
  for (let i = 0; i < 3000 && seen.size < 2; i++) { T.rtTick(0.1); for (const u of G.units) if (CARS.includes(u.type)) seen.add(u.type); }
  assert.ok(seen.size >= 1, `산 차량: ${[...seen]}`);
  assert.equal((G.errs || []).length, 0, String(G.errs));
});
