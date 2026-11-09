import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, seedRandom } from './harness.mjs';

const F = (T, n) => T.__get(n);
const E = (T, s) => T.__eval(s);
function setup(T, auto = true) {
  T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 's', seed: 3, fog: false });
  T.G.units = []; T.G.props = []; T.G.covers = []; T.G.forts = []; T.G.debris = [];
  const G = T.G;
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) G.map[r][c] = { t: 'road', owner: null, obj: null, smoke: 0 };
  G.objs = []; G.depot = null; T.bump(); G.nats[1].ctrl = 'human'; G.nats[0].auto = !!auto; G.nats[0].cp = 50; G.nats[1].cp = 0;
  return G;
}
const run = (T, s) => { for (let i = 0; i < s * 10; i++) T.rtTick(0.1); };
const calm = e => { e.cd = 1e9; e.nocas = 1; e.hold = true; };

test('병종: 새 차량·병종은 모든 표(이동·장갑·관통·총구)와 증원 병과를 가진다', () => {
  const T = loadGame();
  for (const t of ['bmp', 'cev', 'spaa', 'mortv', 'tb']) {
    assert.ok(T.UT[t] && T.TYPES.includes(t), t);
    assert.ok(E(T, `typeof PEN.${t}`) === 'number' || E(T, `PEN_SH.${t}`), `관통 ${t}`);
    assert.ok(E(T, `COOL.${t}`) > 0, `재장전 ${t}`);
  }
  for (const t of ['bmp', 'cev', 'spaa', 'mortv']) { assert.ok(E(T, `VEH.${t}.hl`) > 0, `차체 ${t}`); assert.equal(E(T, `ARM.${t}.length`), 4); assert.ok(E(T, `!!VX_BUILD.${t}`)); assert.ok(E(T, `!!MNT.${t}`)); }
  // 증원 메뉴: 살 수 있는 병종은 모두 어느 병과엔가 들어 있다
  const br = E(T, 'BRANCH.flatMap(b=>b.ts)');
  for (const t of T.TYPES) if (!T.UT[t].noBuy) assert.ok(br.includes(t), `병과 없음 ${t}`);
  assert.equal(E(T, `branchOf('spaa')`), 'ad'); assert.equal(E(T, `branchOf('mortv')`), 'art');
  assert.equal(E(T, `navCls({type:'cev'})`), 'dz'); assert.equal(E(T, `navCls({type:'bmp'})`), 'trk');
});

test('승하차: 장갑차를 부르면 소총분대가 타고 오고, 적이 보이면 뒤로 내린다', () => {
  const T = loadGame(); seedRandom(T, 4); const G = setup(T);
  const sp = T.deploySpots(0, 'ifv'); assert.ok(sp.length);
  const k = sp[0]; const v = T.buy(0, 'ifv', E(T, `kr(${k})`), E(T, `kc(${k})`)); assert.ok(v);
  assert.equal(v.pax.length, 1); assert.equal(v.pax[0].type, 'rifle'); assert.equal(G.units.length, 1, '탄 분대는 지도 위 부대가 아니다');
  run(T, 1); assert.equal(v.pax.length, 1, '집결지에서는 태운 채로 기다린다');
  const e = T.mkUnit(1, 'rifle', Math.floor(v.z), Math.min(T.N - 1, Math.floor(v.x) + 5)); calm(e);
  for (let i = 0; i < 20 && v.pax.length; i++) T.rtTick(0.1);
  assert.equal(v.pax.length, 0, '내림');
  const r = G.units.find(u => u.nat === 0 && u.type === 'rifle'); assert.ok(r, '분대가 지도에 나옴');
  assert.ok(Math.hypot(r.x - v.x, r.z - v.z) < 2, '장갑차 곁');
});

test('승하차: 멀리 가는 분대는 근처 빈 장갑차를 타고 가서 목적지 근처에 내린다', () => {
  const T = loadGame(); seedRandom(T, 2); const G = setup(T, false);
  const v = T.mkUnit(0, 'ifv', 5, 4); const u = T.mkUnit(0, 'rifle', 5, 6);
  T.orderMoveTo(u, 28.5, 22.5);
  let rode = 0;
  for (let i = 0; i < 900; i++) { T.rtTick(0.1); if (v.pax && v.pax.includes(u)) rode++; if (rode && G.units.includes(u) && !(v.pax || []).length && Math.hypot(u.x - 28.5, u.z - 22.5) < 1.2) break; }
  assert.ok(rode > 20, `탔다 ${rode}`);
  assert.ok(G.units.includes(u), '내렸다');
  assert.ok(Math.hypot(u.x - 28.5, u.z - 22.5) < 3, `목적지 근처 ${u.x.toFixed(1)},${u.z.toFixed(1)}`);
});

test('승하차: 장갑차가 부서지면 탄 분대가 다친 채 뛰어내린다', () => {
  const T = loadGame(); seedRandom(T, 7); const G = setup(T);
  const v = T.mkUnit(0, 'bmp', 10, 10); const u = T.mkUnit(0, 'rifle', 10, 11);
  assert.ok(F(T, 'fleetEmbark')(u, v)); assert.ok(!G.units.includes(u));
  const hp = u.hp; F(T, 'kill')(v, null);
  assert.ok(!G.units.includes(v)); assert.ok(G.units.includes(u) || u.hp <= 0, '탈출(또는 전멸)');
  if (G.units.includes(u)) { assert.ok(u.hp < hp, '다침'); assert.ok(u.supp >= 2, '제압'); }
});

test('공병전차: 앞을 막은 적 방벽을 밀고 지뢰를 밟지 않고 걷는다', () => {
  const T = loadGame(); seedRandom(T, 1); const G = setup(T);
  const c = T.mkUnit(0, 'cev', 12, 4); c.hold = true;
  G.forts.push({ id: 900, k: 'jersey', nat: 1, x: 9.5, z: 12.5, ry: Math.PI / 2, hp: 70, prog: 1 });
  G.forts.push({ id: 901, k: 'mine', nat: 1, x: 7.5, z: 12.5, ry: 0, hp: 20, prog: 1 });
  G.fortNV = (G.fortNV || 0) + 1; T.bump();
  // 플레이어가 내린 이동 명령(직접 지휘 u.man): 부관 AI가 길을 바꾸지 않는다
  c.hold = false; c.path = T.pathPts(c, 12.5, 12.5); c.dest = [12.5, 12.5]; c.man = G.time || 0;
  run(T, 14);
  assert.ok(!G.forts.some(f => f.id === 900), '방벽 치움');
  assert.ok(!G.forts.some(f => f.id === 901), '지뢰 걷음');
  assert.ok(!(c.vd && c.vd.mob), '궤도 멀쩡');
  assert.ok(c.x > 10, `지나감 ${c.x.toFixed(1)}`);
});

test('보병전투차: 서 있으면 보이는 적 전차에 대전차미사일을 쏜다', () => {
  const T = loadGame(); seedRandom(T, 3); const G = setup(T);
  const b = T.mkUnit(0, 'bmp', 12, 6); b.hold = true; const k = T.mkUnit(1, 'tank', 12, 18); calm(k);
  let shot = 0; for (let i = 0; i < 60; i++) { T.rtTick(0.1); if ((G.missiles || []).length) shot++; }
  assert.ok(shot > 0, '미사일 날아감'); assert.ok(b.atg < 2, `남은 미사일 ${b.atg}`);
});

test('AI 판: 새 병종이 섞여도 오류 없이 끝난다', () => {
  const T = loadGame(); seedRandom(T, 11);
  T.newGame({ slots: ['ai', 'ai', 'none', 'none'], size: 'm', seed: 11, fog: true, speed: 0 });
  for (const n of [0, 1]) T.G.nats[n].cp += 40;
  for (let i = 0; i < 6000 && !T.G.over; i++) T.rtTick(0.1);
  assert.equal((T.G.errs || []).length, 0, String((T.G.errs || [])[0]));
});
