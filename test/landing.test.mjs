import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, seedRandom } from './harness.mjs';

// 상륙 작전 캠페인: 오마하·인천
const start = (T, id) => { T.__get('campStart')(id); return T.G; };
const quiet = G => { for (const u of G.units) if (u.nat === 1) { u.hold = true; u.post = 1; } };
const own = (G, i, n) => { const o = G.objs[i]; G.map[o.r][o.c].owner = n; };

test('상륙: 두 임무 모두 처음부터 열리고, 서쪽은 바다, 상륙 지점·거점·적이 놓인다', () => {
  const T = loadGame();
  assert.ok(T.__get('campOpen')('omaha') && T.__get('campOpen')('incheon'));
  for (const id of ['omaha', 'incheon']) {
    const G = start(T, id);
    assert.ok(G.camp.id === id && G.objs.length === 4, id);
    for (let r = 0; r < T.N; r++) assert.ok(G.map[r][0].sea && G.map[r][0].t === 'water', `${id} 바다 ${r}`);
    assert.ok(G.camp.secs.length >= 3 && G.camp.secs.every(s => s.tl.length > 0), `${id} 상륙 지점`);
    for (const s of G.camp.secs) for (const [r, c] of s.tl) { assert.ok(G.map[r][c - 1].sea); assert.notEqual(G.map[r][c].t, 'water'); }
    assert.equal(G.units.filter(u => u.nat === 0).length, 0, '아군은 바다에서 온다');
    assert.ok(G.units.filter(u => u.nat === 1).length >= 15, `${id} 적`);
    assert.ok(G.forts.some(f => f.k === 'bunker'), `${id} 벙커`);
    T.rtRun(0.2); assert.ok(G.camp.boats.length >= 6, `${id} 1파 상륙정`);
  }
});

test('상륙: 세력 이름은 역사 임무에서만 바뀌고 다른 판에선 되돌아간다', () => {
  const T = loadGame(); start(T, 'omaha');
  assert.equal(T.__eval('NATS[0].name'), '연합군'); assert.equal(T.__eval('NATS[1].name'), '독일군');
  start(T, 'incheon'); assert.equal(T.__eval('NATS[1].name'), '북한군');
  T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 's', seed: 3 });
  assert.equal(T.__eval('NATS[0].name'), '블루'); assert.equal(T.__eval('NATS[1].name'), '레드');
});

test('상륙정: 물가에 닿아 부대를 내리고, 많이 맞으면 가라앉아 잃는다', () => {
  const T = loadGame(); seedRandom(T, 3); const G = start(T, 'omaha'); quiet(G);
  G.units = G.units.filter(u => u.nat === 0); G.camp.st.lw = Object.fromEntries(T.__eval('CAMP.omaha.lw').map(w => [w.t, 1]));
  const [r, c] = G.camp.secs[1].tl[3];
  const lb = T.__get('landBoat'); const b = lb('rifle', r, c, 0);
  T.rtRun(20);
  assert.equal(b.st === 'out' || !G.camp.boats.includes(b), true, '내리고 돌아간다');
  const u = G.units.find(x => x.nat === 0 && x.type === 'rifle'); assert.ok(u, '소총분대가 내렸다');
  // 해변에 멈추지 않고 모래밭을 건너 절벽 밑(첫 땅)까지 뛰어 올라간다
  assert.ok(Math.abs(u.r - r) <= 2 && u.c >= c - 1 && u.c <= 16, `해변 근처 (${u.r},${u.c})`);
  assert.ok(!G.map[u.r][u.c].sand, `모래밭을 건넜다 (${u.r},${u.c})`);
  const losses = G.nats[0].losses; const b2 = lb('tank', G.camp.secs[0].tl[2][0], G.camp.secs[0].tl[2][1], 0);
  b2.dmg = b2.hp - 1; b2.x = b2.tx - 3;
  // 가까이 적 기관총을 둔다: 계속 맞아 가라앉는다
  const mg = T.mkUnit(1, 'mg', b2.r, b2.c + 2); mg.hold = true; mg.post = 1;
  for (let i = 0; i < 400 && b2.st !== 'sink'; i++) T.rtTick(0.1);
  assert.equal(b2.st, 'sink'); assert.equal(G.nats[0].losses, losses + 1);
  T.rtRun(5); assert.ok(!G.units.some(x => x.nat === 0 && x.type === 'tank'), '전차는 내리지 못했다');
});

test('상륙: 증원은 고른 해변으로 상륙정에 실려 오고, 차량은 절벽을 못 오른다', () => {
  const T = loadGame(); const G = start(T, 'omaha'); quiet(G);
  const pick = T.__get('landPick'); assert.ok(pick(0)); assert.equal(G.camp.sec, 0);
  const sp = T.deploySpots(0, 'rifle'); const tl = new Set(G.camp.secs[0].tl.map(([r, c]) => T.key(r, c)));
  assert.ok(sp.length && sp.every(k => tl.has(k)), '도그 비치 물가만');
  G.nats[0].cp = 20; const n0 = G.units.length, b0 = G.camp.boats.length;
  const nu = T.buy(0, 'rifle', T.kr(sp[0]), T.kc(sp[0]));
  assert.ok(nu && nu.boat); assert.equal(G.units.length, n0, '바로 생기지 않는다'); assert.equal(G.camp.boats.length, b0 + 1);
  assert.equal(G.nats[0].cp, 20 - T.UT.rifle.cost);
  const m = Math.round((T.N - 1) / 2);
  assert.equal(T.mcost('tank', G.map[m - 4][16]), Infinity, '절벽');
  assert.ok(T.mcost('rifle', G.map[m - 4][16]) < Infinity, '보병은 절벽을 오른다');
  assert.ok(T.mcost('tank', G.map[m][16]) < Infinity, '출구 길');
});

test('상륙: 공병이 가까운 해변 장애물을 걷어 낸다', () => {
  const T = loadGame(); const G = start(T, 'omaha');
  G.units = []; G.nats[1].ctrl = 'human'; G.camp.st.lw = Object.fromEntries(T.__eval('CAMP.omaha.lw').map(w => [w.t, 1])); G.camp.boats = [];
  const h = G.forts.find(f => f.k === 'hedgehog'); const n0 = G.forts.filter(f => f.k === 'hedgehog').length;
  const e = T.mkUnit(0, 'eng', Math.floor(h.z), Math.floor(h.x)); e.x = h.x - .3; e.z = h.z; e.path = [];
  T.rtRun(12);
  assert.ok(!G.forts.includes(h), '걷어 냈다'); assert.ok(G.forts.filter(f => f.k === 'hedgehog').length < n0);
});

test('오마하: 출구 두 곳과 마을을 쥐면 성공, 별은 출구 셋·12분', () => {
  const T = loadGame(); const G = start(T, 'omaha'); quiet(G);
  own(G, 0, 0); own(G, 1, 0); T.rtRun(0.2); assert.ok(!G.over, '마을이 아직');
  own(G, 3, 0); T.rtRun(0.2);
  assert.ok(G.over && G.over.win === 0, JSON.stringify(G.over));
  assert.deepEqual(Array.from(G.camp.res.got, Boolean), [true, false, true]);
});

test('인천: 썰물엔 해변으로 못 오고 부두는 점령하면 언제나 열린다, 월미도를 90초 빼앗기면 실패', () => {
  const T = loadGame(); const G = start(T, 'incheon'); quiet(G);
  assert.equal(G.camp.st.tide, 'high1'); assert.ok(T.deploySpots(0, 'rifle').length > 0);
  G.time = 250; T.rtRun(0.2);
  assert.equal(G.camp.st.low, 1); assert.equal(T.deploySpots(0, 'rifle').length, 0, '썰물: 상륙 불가');
  own(G, 1, 0); const sp = T.deploySpots(0, 'rifle'); assert.ok(sp.length > 0, '부두');
  const tl = new Set(G.camp.secs[1].tl.map(([r, c]) => T.key(r, c))); assert.ok(sp.every(k => tl.has(k)));
  assert.ok(G.map.flat().some(x => x.mudz), '갯벌');
  own(G, 0, 0); T.rtRun(0.5); assert.equal(G.camp.st.wtaken, 1);
  own(G, 0, 1); T.rtRun(91);
  assert.ok(G.over && G.over.win === 1 && G.over.why.includes('월미도'), JSON.stringify(G.over));
});

test('인천: 저녁 만조엔 다시 열리고, 월미도·응봉산·경인가도를 쥐면 성공', () => {
  const T = loadGame(); const G = start(T, 'incheon'); quiet(G);
  G.time = 560; T.rtRun(0.2); assert.equal(G.camp.st.tide, 'high2'); assert.equal(G.camp.st.low, 0);
  assert.notEqual(G.camp.sec, 2, '그린 비치에서 본토 해변으로 옮김');
  own(G, 0, 0); own(G, 2, 0); own(G, 3, 0); own(G, 1, 0); T.rtRun(0.2);
  assert.ok(G.over && G.over.win === 0); assert.deepEqual(Array.from(G.camp.res.got, Boolean), [true, true, true]);
});

test('상륙: 관전(AI 지휘)이면 AI가 상륙 지점을 스스로 고르고, 출구를 점령하면 길막이가 치워진다', () => {
  const T = loadGame(); const G = start(T, 'omaha'); quiet(G);
  G.nats[0].ctrl = 'ai'; G.camp.sec = 1;
  // 이지 비치 앞에 적을 잔뜩 둔다: AI는 다른 해변을 고른다
  const [r, c] = G.camp.secs[1].tl[8]; for (let i = 0; i < 6; i++) { const u = T.mkUnit(1, 'mg', r - 3 + i, c + 3); u.hold = true; u.post = 1; }
  T.rtRun(16); assert.notEqual(G.camp.sec, 1);
  const o = G.objs[1]; const near = () => G.forts.filter(f => f.k === 'jersey' && Math.abs(f.z - o.r - .5) < .6 && Math.abs(f.x - o.c) < 2.2).length;
  assert.ok(near() > 0); own(G, 1, 0); T.rtRun(11); assert.equal(near(), 0, '길막이 치움');
});
