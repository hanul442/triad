import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, playAI } from './harness.mjs';
import { build } from '../build.mjs';

test('빌드 결과가 문법 오류 없이 만들어진다', () => {
  const { js, page } = build();
  assert.doesNotThrow(() => new Function(js));
  assert.match(page, /<title>TRIAD/);
});

test('모든 병종에 이름·영역·비용·생산 시설이 있다', () => {
  const T = loadGame();
  for (const t of T.TYPES) {
    const u = T.UT[t];
    assert.ok(u.n && ['land', 'sea', 'air'].includes(u.d), t);
    assert.equal(u.cost.length, 3, t);
    assert.ok(u.from.length > 0, t);
    if (u.req) assert.ok(T.TECH[u.req], `${t}의 연구 ${u.req}가 없음`);
  }
});

function checkInvariants(T, G, label) {
  assert.deepEqual(G.errs || [], [], `${label}: AI 실행 중 예외`);
  const seen = new Set();
  for (const u of G.units) {
    const k = T.key(u.r, u.c);
    assert.ok(!seen.has(k), `${label}: 한 칸에 부대 둘 (${u.r},${u.c})`);
    seen.add(k);
    const t = G.map[u.r][u.c].t, d = T.UT[u.type].d;
    if (d === 'land') assert.notEqual(t, 'sea', `${label}: 지상 부대 ${u.type}가 바다에`);
    if (d === 'sea') assert.equal(t, 'sea', `${label}: 함정 ${u.type}가 육지에`);
    assert.ok(u.hp > 0 && u.hp <= 10, `${label}: 체력 범위 밖 ${u.hp}`);
  }
  assert.ok(G.over && G.over.win != null, `${label}: 승자가 정해지지 않음`);
}

for (const [mt, seedLabel] of [['cont', '대륙'], ['arch', '군도']]) {
  for (const diff of ['normal', 'hard']) {
    test(`AI 관전 게임이 끝까지 진행된다 (${seedLabel}, ${diff})`, async () => {
      const T = loadGame();
      const G = await playAI(T, { mt, diff, vic: 18 });
      checkInvariants(T, G, `${seedLabel}/${diff}`);
      assert.ok(G.hist.length >= 2, '점수 기록이 쌓이지 않음');
    });
  }
}

test('비행장은 활주로 2칸으로 지어지고 격납고가 수용량을 늘린다', () => {
  const T = loadGame();
  T.newGame({ slots: ['human', 'ai', 'none', 'none', 'none', 'none'], size: 'm', fog: false, speed: 0 });
  const G = T.G, n = G.cur, N = G.nats[n];
  N.f = N.s = N.o = 999;
  for (const u of [...G.units]) if (u.nat === n) T.removeUnit(u);
  const near = [];
  for (let r = 0; r < T.ROWS(); r++) for (let c = 0; c < T.COLS(); c++) if (T.dist(r, c, ...N.hq) <= 3) near.push([r, c]);
  const af = near.find(([r, c]) => T.siteOk(n, 'airfield', r, c));
  assert.ok(af, '비행장 부지 없음');
  T.construct(n, 'airfield', ...af);
  const x = T.cell(...af); x.bld.left = 0;
  assert.ok(x.bld.rw != null, '활주로 칸이 없음');
  const k = T.key(...af);
  assert.equal(T.baseCap(k), 2);
  const hg = near.find(([r, c]) => T.siteOk(n, 'hangar', r, c));
  T.construct(n, 'hangar', ...hg); T.cell(...hg).bld.left = 0;
  assert.equal(T.baseCap(k), 6);
  x.used = false;
  assert.ok(T.produce(n, 'ftr', ...af), '전투기 생산 실패');
  assert.equal(T.hangar(k).length, 1, '생산된 항공기가 격납되지 않음');
});

for (const id of ['tut', 'island', 'sead', 'blockade']) {
  test(`시나리오 "${id}"가 배치되고 목표를 검사할 수 있다`, () => {
    const T = loadGame();
    const S = T.SCN[id];
    T.newGame({ ...S.cfg, speed: 0 });
    T.G.scn = { id, step: 0 };
    S.setup();
    assert.equal(typeof S.obj(), 'string');
    assert.ok(S.obj().length > 0);
    if (id === 'island') assert.equal(T.cell(...T.G.scn.target).owner, 1);
    if (id === 'sead') assert.ok(T.G.scn.targets.length >= 3, '방공 목표가 너무 적음');
    if (id === 'tut') assert.ok(T.G.scn.city && T.G.scn.inf, '훈련용 도시·보병 배치 실패');
    if (id === 'blockade') {
      const [r, c] = T.G.scn.target;
      const sea = T.nbrs(r, c).find(([a, b]) => T.G.map[a][b].t === 'sea');
      assert.ok(sea, '봉쇄 목표 도시가 해안에 있지 않음');
      const blocker = T.unitAt(...sea);
      if (blocker) T.removeUnit(blocker);
      for (const [a, b] of T.nbrs(r, c)) { const u = T.unitAt(a, b); if (u && u.nat === 1 && T.UT[u.type].d === 'sea') T.removeUnit(u); }
      T.mkUnit('dd', 0, sea[0], sea[1], false);
      assert.ok(T.blockaded(r, c), '구축함을 붙였는데 봉쇄되지 않음');
      for (let i = 0; i < 3; i++) T.scnEndTurn(0);
      assert.equal(T.G.over && T.G.over.scn, 'clear');
    }
  });
}
