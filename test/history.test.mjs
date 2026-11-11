import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, seedRandom } from './harness.mjs';

// 역사 전투 여섯: 지도·기후·배치·목표·승패
const IDS = ['pavlov', 'arnhem', 'bastogne', 'seoul', 'mogadishu', 'easting'];
const start = (T, id) => { seedRandom(T, 3); T.__get('campStart')(id); return T.G; };
const quiet = G => { for (const u of G.units) if (u.nat === 1) { u.hold = true; u.post = 1; } };
const own = (G, i, n) => { const o = G.objs[i]; G.map[o.r][o.c].owner = n; };
const noWaves = (T, G) => { const M = T.__eval('CAMP')[G.camp.id]; G.camp.st.w = Object.fromEntries((M.waves || []).map(w => [w.t, 1])); };

test('역사 전투: 여섯 임무 모두 열리고, 거점·양쪽 부대·그날의 기후와 날씨가 놓인다', () => {
  const T = loadGame(); const CAMP = T.__eval('CAMP');
  const clime = { pavlov: 'autumn', bastogne: 'winter', seoul: 'autumn', mogadishu: 'desert', easting: 'desert' };
  for (const id of IDS) {
    const G = start(T, id);
    assert.ok(T.__get('campOpen')(id), `${id} 열림`);
    assert.equal(G.camp.id, id);
    assert.ok(G.objs.length >= 2 && G.objs.every((o, i) => G.map[o.r][o.c].obj === i), `${id} 거점`);
    assert.ok(G.units.filter(u => u.nat === 0).length >= 10, `${id} 아군`);
    assert.ok(G.units.filter(u => u.nat === 1).length >= 3, `${id} 적`);
    if (clime[id]) assert.equal(G.feat.clime, clime[id], `${id} 기후`);
    assert.equal(G.wx, CAMP[id].wx || 'clear', `${id} 날씨`);
    assert.ok(G.wxLock || !CAMP[id].wx, `${id} 날씨 고정`);
    assert.equal(T.__eval('campPlain()'), !CAMP[id].bio, `${id} 지형 그리기`);
    const ob = T.__get('campObjective')(); assert.ok(ob && ob.html.includes('<li'), `${id} 목표 창`);
  }
  T.__get('campStart')('evac'); assert.equal(T.__eval('campPlain()'), true, '하령 작전은 예전처럼');
  assert.equal(T.G.feat.clime, 'temp');
});

test('파블로프의 집: 13분 버티면 성공, 집을 60초 넘게 빼앗기면 실패', () => {
  const T = loadGame(); let G = start(T, 'pavlov'); quiet(G); noWaves(T, G);
  assert.ok((G.forts || []).some(f => f.k === 'trench' && f.nat === 0), '제분소까지 참호');
  assert.ok((G.forts || []).some(f => f.k === 'mine' && f.nat === 0), '광장 지뢰');
  G.time = 13 * 60 - 1; T.rtRun(1.2);
  assert.ok(G.over && G.over.win === 0 && G.over.why.includes('사수'), JSON.stringify(G.over));
  G = start(T, 'pavlov'); quiet(G); noWaves(T, G); own(G, 0, 1);
  T.rtRun(61); assert.ok(G.over && G.over.win === 1 && G.over.why.includes('함락'), JSON.stringify(G.over));
});

test('아른헴: 45초에 정찰대대가 다리 남단에서 다리 위로 돌진한다', () => {
  const T = loadGame(); const G = start(T, 'arnhem'); quiet(G);
  const m = Math.round((T.N - 1) / 2);
  for (let r = 0; r < T.N; r++) for (const c of [m - 2, m - 1, m, m + 1]) { const x = G.map[r][c]; assert.ok(x.t === 'water' || x.br, `강 ${r},${c}`); }
  T.rtRun(46);
  const S = G.camp.st; assert.equal(S.grDone, 1); assert.ok(S.gr.length >= 6, '차량 6대 이상');
  const gr = G.units.filter(u => S.gr.includes(u.id));
  assert.ok(gr.every(u => UTcls(T, u) === 'veh' && u.path && u.path.length), '다리 북단으로 달린다');
});
const UTcls = (T, u) => T.UT[u.type].cls;

test('바스토뉴: 날씨가 개기 전엔 지원 사격을 못 부르고, 보급 투하 뒤엔 탄약이 찬다', () => {
  const T = loadGame(); const G = start(T, 'bastogne'); quiet(G); noWaves(T, G);
  T.rtRun(1); const X = G.objs[0]; G.nats[0].cp = 50;
  assert.equal(T.canSupport(0, 'smoke', X.r, X.c), false, '안개 속 포위: 지원 불가');
  const u = G.units.find(v => v.nat === 0 && v.type === 'rifle'); u.am = 1;
  G.time = 420; T.rtRun(.3);
  assert.equal(G.camp.st.drop, 1); assert.equal(G.wx, 'clear');
  assert.ok(u.am > 1, '재보급'); assert.equal(T.canSupport(0, 'smoke', X.r, X.c), true, '날씨가 개면 지원 가능');
});

test('바스토뉴: 제4기갑사단 선봉이 시내 교차로에 닿으면 성공', () => {
  const T = loadGame(); const G = start(T, 'bastogne'); quiet(G); noWaves(T, G);
  G.time = 660; T.rtRun(.3);
  const S = G.camp.st; assert.equal(S.relief, 1); assert.ok(S.rel.length >= 3, '선봉 차량');
  const v = G.units.find(u => S.rel.includes(u.id)); const X = G.objs[0];
  v.x = X.c + .5; v.z = X.r + 1.5; v.r = Math.floor(v.z); v.c = Math.floor(v.x); v.path = [];
  T.rtRun(.3); assert.ok(G.over && G.over.win === 0 && G.over.why.includes('연결'), JSON.stringify(G.over));
});

test('서울 수복: 바리케이드는 바퀴 차량을 막고, 중앙청을 60초 지키면 성공', () => {
  const T = loadGame(); const G = start(T, 'seoul');
  const m = Math.round((T.N - 1) / 2);
  const bags = (G.forts || []).filter(f => f.k === 'sandbag' && f.nat === 1 && Math.abs(f.z - m) < 1.2);
  assert.ok(bags.length >= 10, '쌀가마니 바리케이드 두 줄');
  G.units = G.units.filter(u => u.nat === 0); for (const u of G.units) u.hold = true; noWaves(T, G);
  own(G, 2, 0); T.rtRun(61);
  assert.ok(G.over && G.over.win === 0 && G.over.why.includes('국기'), JSON.stringify(G.over));
});

test('모가디슈: 호송대 차량이 추락 지점에 닿고 2분 30초를 버티면 성공, 추락 지점을 45초 넘게 잃으면 실패', () => {
  const T = loadGame(); let G = start(T, 'mogadishu');
  G.units = G.units.filter(u => u.nat === 0); for (const u of G.units) u.hold = true; noWaves(T, G);
  const cs = G.objs[0]; const h = G.units.find(u => u.type === 'hmv');
  h.x = cs.c + .5; h.z = cs.r + .5; h.r = cs.r; h.c = cs.c; h.path = [];
  T.rtRun(1); assert.equal(G.camp.st.link, 1, '연결');
  T.rtRun(151); assert.ok(G.over && G.over.win === 0, JSON.stringify(G.over));
  G = start(T, 'mogadishu'); quiet(G); noWaves(T, G); own(G, 0, 1); T.rtRun(46);
  assert.ok(G.over && G.over.win === 1 && G.over.why.includes('추락'), JSON.stringify(G.over));
});

test('73 이스팅: 사막엔 숲·생울타리가 없고, 아군 열상 조준경은 먼지 속에서도 잘 맞히며, 두 진지를 잡으면 성공', () => {
  const T = loadGame(); const G = start(T, 'easting');
  assert.ok(!G.map.flat().some(x => x.wild || x.t === 'water'), '트인 사막');
  assert.ok(!(G.props || []).some(p => p.k === 'hedge' || p.k === 'bocage'), '생울타리 없음');
  const envHit = T.__get('envHit');
  const a = G.units.find(u => u.nat === 0 && u.type === 'tank'), e = G.units.find(u => u.nat === 1 && u.type === 'tank');
  assert.ok(envHit(a, e) > envHit(e, a), '아군 열상 > 이라크군 맨눈');
  quiet(G); noWaves(T, G); own(G, 1, 0); own(G, 2, 0); T.rtRun(.3);
  assert.ok(G.over && G.over.win === 0 && G.over.why.includes('73'), JSON.stringify(G.over));
});

test('역사 전투: AI 관전으로 한 판씩 돌려도 오류가 없다', () => {
  for (const id of IDS) {
    const T = loadGame(); seedRandom(T, 11);
    T.__get('specStart')({ map: 'camp:' + id, seed: 1 });
    for (let i = 0; i < 900 && !T.G.over; i++) T.rtTick(0.1);
    assert.equal((T.G.errs || []).length, 0, `${id}: ${(T.G.errs || [])[0]}`);
  }
});
