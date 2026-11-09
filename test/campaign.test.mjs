import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './harness.mjs';

// 캠페인 '하령 작전': 임무 세 개의 지도·배치·목표·승패
const start = (T, id) => { T.__get('campStart')(id); return T.G; };
const quiet = G => { for (const u of G.units) if (u.nat === 1) { u.hold = true; u.post = 1; } };

test('캠페인: 세 임무 모두 열리고, 임무 거점과 양쪽 부대가 놓인다', () => {
  const T = loadGame();
  for (const id of ['evac', 'bridge', 'station']) {
    const G = start(T, id);
    assert.ok(G.camp && G.camp.id === id && G.scn === 'camp', id);
    assert.ok(G.objs.length >= 1 && G.objs.every(o => o.name), id);
    assert.ok(G.units.filter(u => u.nat === 0).length >= 8, `${id} 아군`);
    assert.ok(G.units.filter(u => u.nat === 1).length >= 6, `${id} 적`);
    assert.ok(G.objs.every((o, i) => G.map[o.r][o.c].obj === i), `${id} 거점 번호`);
    assert.equal(G.map.flat().filter(x => x.obj != null).length, G.objs.length, `${id} 다른 거점은 지움`);
  }
});

test('캠페인: 다음 임무는 앞 임무를 마쳐야 열리고, 별은 가장 좋은 기록을 남긴다', () => {
  const T = loadGame(); const store = {};
  T.__set('localStorage', { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } });
  const open = T.__get('campOpen'), rec = T.__get('campRecord');
  assert.ok(open('evac')); assert.ok(!open('bridge')); assert.ok(!open('station'));
  rec('evac', 2); assert.ok(open('bridge')); assert.ok(!open('station'));
  rec('evac', 1); assert.equal(T.__get('campLoad')().evac, 2, '더 낮은 기록으로 덮지 않음');
});

test('대사관 철수: 승차 지점에 멈춘 차에 사람이 타고, 집결지에 오면 구출된다', () => {
  const T = loadGame(); const G = start(T, 'evac'); quiet(G);
  const C = G.camp, S = C.st;
  assert.equal(S.wait, 20);
  const h = G.units.find(u => u.nat === 0 && u.type === 'hmv');
  h.x = C.lz.x; h.z = C.lz.z; h.r = Math.floor(h.z); h.c = Math.floor(h.x); h.path = []; h.hold = true;
  T.rtRun(12);
  assert.equal(S.pax[h.id], 3, '험비는 3명'); assert.equal(S.wait, 17);
  h.x = 1.5; h.z = 20.5; h.r = 20; h.c = 1; T.rtRun(0.2);
  assert.equal(S.saved, 3); assert.equal(S.pax[h.id], 0);
  // 사람을 태운 차가 부서지면 탄 사람도 잃는다
  h.x = C.lz.x; h.z = C.lz.z; h.r = Math.floor(h.z); h.c = Math.floor(h.x); T.rtRun(4);
  assert.ok(S.pax[h.id] >= 1); const p = S.pax[h.id];
  T.__get('kill')(h, null); T.rtRun(0.2);
  assert.equal(S.lost, p);
});

test('대사관 철수: 대사관을 20초 넘게 빼앗기면 실패, 20명을 다 데려오면 성공', () => {
  const T = loadGame(); let G = start(T, 'evac'); quiet(G);
  const e = G.objs[0]; G.map[e.r][e.c].owner = 1;
  T.rtRun(21); assert.ok(G.over && G.over.win === 1 && G.over.why.includes('대사관'), JSON.stringify(G.over));
  G = start(T, 'evac'); quiet(G);
  G.camp.st.wait = 0; G.camp.st.saved = 20; T.rtRun(0.2);
  assert.ok(G.over && G.over.win === 0); assert.equal(G.camp.res.n, 3, '시간·전원 구출 별');
});

test('다리 확보: 강은 건널 수 없고 서강교로만 건너며, 폭약은 해체하거나 터진다', () => {
  const T = loadGame(); let G = start(T, 'bridge');
  const N = T.N, m = Math.round((N - 1) / 2);
  for (let r = 0; r < N; r++) for (const c of [m - 2, m - 1, m, m + 1]) {
    const x = G.map[r][c]; assert.ok(x.t === 'water' || x.br, `강 (${r},${c})`);
  }
  const rifle = G.units.find(u => u.nat === 0 && u.type === 'rifle');
  const p = T.pathPts(rifle, m + 4.5, m - .5); assert.ok(p.length && Math.hypot(p[p.length - 1][0] - (m + 4.5), p[p.length - 1][1] - (m - .5)) < .6, '다리로 동쪽 강변까지 간다');
  // 해체: 공병이 폭약 옆에서 18초
  G.units = G.units.filter(u => u.nat === 0); G.nats[1].ctrl = 'human'; const ch = G.camp.charge;
  const eng = G.units.find(u => u.type === 'eng'); eng.x = ch.x - .3; eng.z = ch.z; eng.r = Math.floor(eng.z); eng.c = Math.floor(eng.x); eng.path = []; eng.hold = true;
  T.rtRun(19); assert.equal(G.camp.st.disarmed, 1, '해체'); assert.ok(G.camp.st.left > 240);
  // 폭파: 아무도 안 건드리면 5분 뒤 다리가 무너져 실패
  G = start(T, 'bridge'); quiet(G); for (const u of G.units) if (u.nat === 0) u.hold = true;
  T.rtRun(301);
  assert.ok(G.over && G.over.win === 1 && G.over.why.includes('폭파'));
  assert.ok(!G.map.flat().some(x => x.br === 1), '서강교는 물이 됨');
});

test('다리 확보: 해체하고 교두보를 쥔 채 반격을 2분 버티면 성공', () => {
  const T = loadGame(); const G = start(T, 'bridge');
  G.units = G.units.filter(u => u.nat === 0); for (const u of G.units) u.hold = true;
  const S = G.camp.st; S.disarmed = 1; S.left = 200; const b = G.objs[0]; G.map[b.r][b.c].owner = 0;
  T.rtRun(1); assert.equal(S.counter, 1, '반격 시작');
  G.nats[1].ctrl = 'human'; for (const u of G.units) if (u.nat === 1) { u.hold = true; u.post = 1; u.x = u.c = 43; }
  T.rtRun(121); assert.ok(G.over && G.over.win === 0, JSON.stringify(G.over));
});

test('방송국 탈환: 중계소를 쥐면 적 화력 지원이 끊기고, 방송국을 60초 지키면 성공', () => {
  const T = loadGame(); const G = start(T, 'station');
  G.units = G.units.filter(u => u.nat === 0); for (const u of G.units) u.hold = true;
  const [s, y] = G.objs; G.map[y.r][y.c].owner = 0; T.rtRun(1);
  assert.equal(G.camp.st.relay, 1); G.nats[1].cp = 50;
  assert.ok(!T.canSupport(1, 'smoke', 5, 5), '적 지원 불가');
  G.nats[1].ctrl = 'human'; G.units = G.units.filter(u => u.nat === 0); G.map[s.r][s.c].owner = 0; T.rtRun(30);   // 첫 1초에 AI가 산 증원도 치운다   // 적 증원이 끼지 않게: 둘레 판정만 본다
  const e = T.mkUnit(1, 'rifle', s.r, s.c + 1); e.hold = true; e.post = 1; e.cd = 999; T.rtRun(5);
  assert.ok(G.camp.st.near === 1 && G.camp.st.hold < 31, '적이 둘레에 있으면 멈춤');
  G.units = G.units.filter(u => u !== e); T.rtRun(31);
  assert.ok(G.over && G.over.win === 0, JSON.stringify(G.over)); assert.ok(G.camp.res.got[1], '중계소 별');
});

test('캠페인: 양쪽 다 AI로 돌려도 오류 없이 끝난다', () => {
  const T = loadGame();
  for (const id of ['evac', 'bridge']) {
    const G = start(T, id); G.nats[0].ctrl = 'ai';
    for (let i = 0; i < 9000 && !G.over; i++) T.rtTick(0.1);
    assert.ok(G.over, id); assert.equal((G.errs || []).length, 0, id + ' ' + (G.errs || [])[0]); assert.ok(G.camp.res, id);
  }
});

test('캠페인: 아군 증원은 정해진 시각에 서쪽에서 오고, 적은 지휘점수로 부대를 사지 않는다', () => {
  const T = loadGame();
  for (const id of ['evac', 'bridge', 'station']) {
    const G = start(T, id); quiet(G);
    const M = T.__eval('CAMP')[id]; assert.ok(M.bw && M.bw.length, `${id} 아군 증원 일정`);
    assert.equal(M.income(1), 0, `${id} 적 수입 없음`);
    const n0 = G.units.filter(u => u.nat === 0).length;
    G.time = M.bw[0].t; T.rtTick(0.1);
    const n1 = G.units.filter(u => u.nat === 0).length;
    assert.ok(n1 >= n0 + M.bw[0].u.length - 1, `${id} 증원 도착 ${n0}→${n1}`);
    assert.ok(G.units.filter(u => u.nat === 0).slice(-M.bw[0].u.length).every(u => u.c <= 4), `${id} 서쪽 가장자리`);
  }
});

test('도심 돌파: 공격 측이 수비보다 넉넉히 많고, 수비는 증원을 사지 않는다', () => {
  const T = loadGame(); T.__get('scnSetup')('assault', 0); const G = T.G;
  const b = G.units.filter(u => u.nat === 0).length, r = G.units.filter(u => u.nat === 1).length;
  assert.ok(b >= r * 1.1, `공격 ${b} 수비 ${r}`);
  assert.equal(T.income(1), 0); assert.ok(T.income(0) > 0);
});
