import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './harness.mjs';

// 캠페인 난이도(10f-diff): 쉬움은 예전 그대로, 보통·어려움은 적 증원·역습·포병이 늘고 아군 지휘점수가 준다
const start = (T, id, d) => { T.__get('campStart')(id, d); return T.G; };

test('난이도: 쉬움(또는 난이도 없이)은 예전과 같다', () => {
  const T = loadGame();
  const a = start(T, 'station'); const cpA = a.nats[0].cp; const nA = a.units.length;
  assert.equal(a.camp.diff, 'easy'); assert.ok(!a.camp.waves);
  const b = start(T, 'station', 'easy');
  assert.equal(b.nats[0].cp, cpA); assert.equal(b.units.length, nA);
  assert.equal(T.__get('income')(0), 4);
});

test('난이도: 보통·어려움은 적 증원이 크고 빠르며, 아군 지휘점수가 준다', () => {
  const T = loadGame(); const CAMP = new Proxy({}, { get: (_, id) => T.__get('campDef')(id) });
  const base = CAMP.station.waves;
  for (const [d, add, cp] of [['normal', 1, 7], ['hard', 2, 5]]) {
    const G = start(T, 'station', d);
    assert.equal(G.camp.diff, d);
    assert.equal(G.camp.waves.length, base.length);
    G.camp.waves.forEach((w, i) => { assert.equal(w.u.length, base[i].u.length + add, `${d} 증원 ${i}`); assert.ok(w.t <= base[i].t); });
    assert.equal(G.nats[0].cp, cp, `${d} 시작 지휘점수`);
    assert.ok(T.__get('income')(0) < 4, `${d} 수입`);
    assert.ok(G.camp.dv.rsp > 0, '적 포병 점수');
  }
  const H = start(T, 'station', 'hard');
  CAMP.station.bw.forEach((w, i) => { assert.ok(H.camp.bwv[i].t > w.t); assert.ok(H.camp.bwv[i].u.length < w.u.length); });
});

test('난이도: 증원은 그 임무 병종만 쓴다(역사 전투에 현대 장비가 끼지 않음)', () => {
  const T = loadGame(); const CAMP = new Proxy({}, { get: (_, id) => T.__get('campDef')(id) });
  for (const id of ['easting', 'pavlov', 'omaha']) {
    const G = start(T, id, 'hard'); const types = new Set(CAMP[id].waves.flatMap(w => w.u));
    for (const w of G.camp.waves) for (const t of w.u) assert.ok(types.has(t), `${id} ${t}`);
    for (const t of T.__get('cdiffCounterU')(CAMP[id], 5)) assert.ok(types.has(t), `${id} 역습 ${t}`);
  }
});

test('난이도: 적 거점을 빼앗으면 잠시 뒤 적이 역습해 온다', () => {
  const T = loadGame(); const G = start(T, 'station', 'normal');
  for (const u of G.units) if (u.nat === 1) { u.hold = true; u.post = 1; }
  T.rtRun(2);
  const y = G.objs[1]; G.map[y.r][y.c].owner = 0;
  T.rtRun(2);
  assert.equal(G.camp.dv.cN, 1); assert.equal(G.camp.dv.q.length, 1);
  const n0 = G.units.filter(u => u.nat === 1).length;
  T.rtRun(26);
  assert.ok(G.units.filter(u => u.nat === 1).length >= n0 + 2, '역습 부대 도착');
  assert.ok(G.camp.log.some(m => m.includes('역습')));
});

test('난이도: 적 포병은 따로 모은 점수로만 부르고, 포병·연막 말고는 못 쓴다', () => {
  const T = loadGame(); const G = start(T, 'station', 'hard');
  const can = T.__get('canSupport');
  G.nats[1].cp = 50; G._cdSup = 1;
  assert.equal(can(1, 'air', 10, 10), false);
  G._cdSup = 0;
  const as = T.__get('aiSupport'); G.nats[1].cp = 3; G.camp.dv.rsp = 20;
  as(1, G.units.filter(u => u.nat === 0));
  assert.equal(G.nats[1].cp, 3, '적 구매 점수는 그대로');
});

test('난이도: 고른 값은 기억하고, 이긴 가장 높은 난이도를 남긴다', () => {
  const T = loadGame(); const store = {};
  T.__set('localStorage', { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } });
  assert.equal(T.__get('cdiffGet')(), 'normal');
  T.__get('cdiffSet')('hard'); assert.equal(T.__get('cdiffGet')(), 'hard');
  const rec = T.__get('cdiffRecord'); rec('evac', 'normal'); rec('evac', 'easy');
  assert.equal(T.__get('cdiffWins')().evac, 'normal'); rec('evac', 'hard'); assert.equal(T.__get('cdiffWins')().evac, 'hard');
  const h = T.__get('campList')('haryeong'); assert.ok(h.includes('class="cdw"'));
});
