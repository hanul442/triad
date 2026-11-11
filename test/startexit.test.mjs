// 시작할 때 갇힘 (2026-11-11): 출발 띠의 주차 차·바리케이드·울타리가 시가지로 나가는 길을 막아 부대가 처음부터 못 나오던 문제
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, seedRandom } from './harness.mjs';

const T0 = loadGame();
const LAYS = T0.__eval('BM_LAYOUTS').concat(T0.__eval("typeof genAlpine==='function'") ? ['alpine'] : []);

// 부대 자리가 그 부대 종류의 이동 격자에서 가장 큰 덩어리(시가지 전체)에 있나
function trapped(T) {
  const G = T.G, navCls = T.__eval('navCls'), navComp = T.__eval('navComp'), out = [];
  for (const u of G.units) {
    const cls = navCls(u); if (!cls) continue;
    const K = navComp(cls), l = K.lab[Math.floor(u.z * 5) * K.W + Math.floor(u.x * 5)];
    if (!(l >= 0 && K.size[l] === K.big)) out.push(`${u.type}#${u.id} 세력${u.nat} (${u.x.toFixed(1)},${u.z.toFixed(1)}) 덩어리 ${l >= 0 ? K.size[l] : '막힌 칸'}/${K.big}`);
  }
  return out;
}

for (const size of ['s', 'm', 'xl'])
  test(`모든 지도(${size}): 네 세력의 출발 지상 부대가 모두 시가지로 나가는 길 위에 있다`, () => {
    const bad = [];
    for (const lay of LAYS) for (const seed of size === 's' ? [7000, 7131] : [7000]) {
      const T = loadGame(); seedRandom(T, seed);
      T.newGame({ slots: ['ai', 'ai', 'ai', 'ai'], size, fog: true, speed: 0, seed, layout: lay });
      for (const s of trapped(T)) bad.push(`${lay}/${seed}: ${s}`);
      assert.equal(T.G.errs.length, 0, `${lay} 오류: ${T.G.errs.join(', ')}`);
    }
    assert.deepEqual(bad, []);
  });

test('출발 띠의 출구를 막은 소품만 치우고, 출구가 멀쩡하면 아무것도 치우지 않는다', () => {
  const T = loadGame(); const G = T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 's', seed: 3, fog: false });
  G.units = []; G.props = []; G.covers = [];
  // 서쪽 띠(0~1열)와 시가지 사이를 2열 건물 벽으로 막고, 10행 한 칸만 길로 둔다
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) G.map[r][c] = { t: c === 2 && r !== 10 ? 'bldg' : 'road', f: 2, owner: null, obj: null, smoke: 0, bmax: 10, bhp: 10 };
  G.navV = (G.navV || 0) + 1; T.bump();
  const startExits = T.__eval("typeof startExits==='function'?startExits:()=>0");
  T.mkUnit(0, 'ifv', 10, 0); T.mkUnit(0, 'rifle', 8, 0);
  G.props.push({ k: 'car', kind: 'sedan', x: 7.5, z: 7.5, ry: 0, col: '#888' });   // 길과 먼 차는 그대로
  assert.equal(startExits(), 0, '출구가 열려 있으면 치울 것이 없다');
  // 출구(10행, 2열)를 차 두 대와 바리케이드로 막는다
  G.props.push({ k: 'car', kind: 'sedan', x: 2.5, z: 10.3, ry: 0, col: '#888' }, { k: 'car', kind: 'sedan', x: 2.5, z: 10.75, ry: 0, col: '#888' },
    { k: 'barrier', x: 2.5, z: 10.1, ry: 0 });
  G.navV++;
  assert.ok(trapped(T).some(s => s.startsWith('ifv')), '막으면 장갑차가 갇힌다');
  const n = startExits();
  assert.ok(n >= 1, '출구의 소품을 치운다');
  assert.deepEqual(trapped(T), [], '치운 뒤에는 모두 나갈 수 있다');
  assert.ok(G.props.some(p => p.x === 7.5 && p.z === 7.5), '길과 상관없는 차는 남는다');
  assert.ok(!G.covers.some(c => Math.abs(c.x - 2.5) < .3 && Math.abs(c.z - 10.3) < .5), '치운 차의 엄폐도 빠진다');
});

test('임무(캠페인·역사 전투) 시작: 아군 지상 부대가 모두 나갈 수 있다', () => {
  const ids = Object.keys(T0.__eval('CAMP')).filter(id => id !== 'omaha' && id !== 'incheon');   // 상륙전은 배에서 내리니 10d가 따로 본다
  const bad = [];
  for (const id of ids) {
    const T = loadGame(); seedRandom(T, 5); T.__eval('campStart')(id);
    for (const s of trapped(T)) if (/세력0 /.test(s)) bad.push(`${id}: ${s}`);
  }
  assert.deepEqual(bad, []);
});

test('실제로 움직여 본다: 시작 후 90초 안에 길을 받은 출발 부대가 출발 자리를 벗어난다', () => {
  const stuck = [];
  for (const lay of ['sym', 'oldtown', 'port']) {
    const T = loadGame(); seedRandom(T, 9100); T.newGame({ slots: ['ai', 'ai', 'ai', 'ai'], size: 's', fog: true, speed: 0, seed: 9100, layout: lay });
    const G = T.G, st = new Map();
    for (const u of G.units) if (!T.UT[u.type].fly) st.set(u.id, { u, x: u.x, z: u.z, far: 0, want: 0 });
    for (let i = 0; i < 900 && !G.over; i++) { T.rtTick(0.1); if (i % 5) continue;
      for (const s of st.values()) { const u = s.u; if (!G.units.includes(u)) { s.dead = 1; continue; }
        s.far = Math.max(s.far, Math.hypot(u.x - s.x, u.z - s.z)); if (u.path && u.path.length && !u.climb && (u.supp || 0) < 1.6) s.want += .5; } }
    for (const s of st.values()) if (!s.dead && s.want >= 30 && s.far < 2.5) stuck.push(`${lay}: ${s.u.type}#${s.u.id} 세력${s.u.nat}`);
  }
  assert.deepEqual(stuck, []);
});

test('다시 선두가 된 부대의 옛 발자국은 버린다: 따르는 분대가 옛 자리로 되돌아가며 맴돌지 않는다', () => {
  const T = loadGame(); T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 's', seed: 3, fog: false });
  const rec = T.__eval('formTrailRec');
  const L = { x: 5, z: 5 };
  rec(L); L.z += .2; rec(L); L.z += .2; rec(L);
  assert.equal(L._ftr.length, 3, '걸으면 발자국이 쌓인다');
  L.x = 9; L.z = 9; rec(L);   // 기록이 멈춘 사이 멀리 갔다
  assert.equal(L._ftr.length, 1, '틈이 크면 새로 시작');
  assert.deepEqual([...L._ftr[0]], [9, 9]);
});
