import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, playAI } from './harness.mjs';
import { build } from '../build.mjs';

test('빌드 결과가 문법 오류 없이 만들어진다', () => {
  const { js, page } = build();
  assert.doesNotThrow(() => new Function(js));
  assert.match(page, /<title>TRIAD 시가전/);
});

test('모든 병종에 이름·이동·사거리·비용이 있다', () => {
  const T = loadGame();
  for (const t of T.TYPES) {
    const u = T.UT[t];
    assert.ok(u.n && ['inf', 'veh', 'air'].includes(u.cls), t);
    assert.ok(u.mv > 0 && u.cost > 0 && u.rng.length === 2, t);
  }
});

test('도시는 90도 회전 대칭이고 거점 이름이 겹치지 않는다', () => {
  const T = loadGame();
  for (const size of ['s', 'm', 'l']) {
    T.newGame({ slots: ['ai', 'ai', 'none', 'none'], size, seed: 7 });
    const G = T.G, N = T.N;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const a = G.map[r][c], b = G.map[c][N - 1 - r];
      assert.equal(a.t, b.t, `${size} (${r},${c}) 회전 대칭 아님`);
      if (a.t === 'bldg') assert.equal(a.f, b.f);
    }
    assert.equal(G.objs.length, T.SIZES[size].obj * 4);
    assert.equal(new Set(G.objs.map(o => o.name)).size, G.objs.length);
  }
});

test('보병은 모든 거점에, 차량은 다른 집결지에 갈 수 있다', () => {
  const T = loadGame();
  T.newGame({ slots: ['ai', 'ai', 'ai', 'ai'], size: 'm', seed: 11 });
  const G = T.G, N = T.N;
  const flood = (type, sr, sc) => { const seen = new Set([T.key(sr, sc)]); const q = [[sr, sc]];
    while (q.length) { const [r, c] = q.shift(); for (const [a, b] of T.nbrs(r, c)) { const k = T.key(a, b); if (!seen.has(k) && T.mcost(type, G.map[a][b]) < Infinity) { seen.add(k); q.push([a, b]); } } }
    return seen; };
  const [r0, c0] = T.zoneSpots(0)[0];
  const inf = flood('rifle', r0, c0);
  for (const o of G.objs) assert.ok(inf.has(T.key(o.r, o.c)), `보병이 ${o.name}에 못 감`);
  const veh = flood('tank', r0, c0);
  for (const n of [1, 2, 3]) { const [r, c] = T.zoneSpots(n)[0]; assert.ok(veh.has(T.key(r, c)), `차량이 ${n} 집결지에 못 감`); }
});

function setup(T) {
  T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 's', seed: 3, fog: false });
  T.G.units = [];
  const G = T.G;
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) { G.map[r][c] = { t: 'road', owner: null, obj: null, smoke: 0 }; }
  T.bump();
  return G;
}
const bldg = (G, r, c, f) => { G.map[r][c] = { t: 'bldg', f, bmax: 8 + f * 3, bhp: 8 + f * 3, owner: null, obj: null, smoke: 0 }; };

test('건물은 시야를 막고, 더 높은 곳에서는 넘겨 본다', () => {
  const T = loadGame(); const G = setup(T);
  bldg(G, 5, 4, 3); T.bump();
  assert.equal(T.los(5, 2, .5, 5, 8, .5), false, '지상끼리는 건물에 막힘');
  assert.equal(T.los(3, 2, .5, 3, 8, .5), true, '옆 줄은 트임');
  bldg(G, 5, 2, 6); T.bump();
  assert.equal(T.los(5, 2, 5.5, 5, 8, .5), true, '6층 건물에서는 3층 건물 너머가 보임');
});

test('엄폐: 건물 안 보병은 피해를 덜 받고, 폭발물은 엄폐를 절반만 받는다', () => {
  const T = loadGame(); const G = setup(T);
  const a = T.mkUnit(0, 'rifle', 5, 2), d = T.mkUnit(1, 'rifle', 5, 4);
  const open = T.calcDmg(a, d, false);
  bldg(G, 5, 4, 2); T.bump();
  const cov = T.calcDmg(a, d, false);
  assert.ok(Math.abs(cov - open * 0.6) < 1e-9, `건물 엄폐 40% (${open} → ${cov})`);
  const at = T.mkUnit(0, 'tank', 6, 2);
  assert.ok(T.calcDmg(at, d, false) > T.UT.tank.atk.inf * 0.6 * 0.99 * (0.4 + 0.6), '전차는 건물 엄폐 절반');
});

test('건물이 무너지면 잔해가 되고 안의 부대가 피해를 입는다', () => {
  const T = loadGame(); const G = setup(T);
  bldg(G, 5, 5, 2); const d = T.mkUnit(1, 'rifle', 5, 5);
  T.damageBldg(5, 5, 999);
  assert.equal(G.map[5][5].t, 'rubble');
  assert.equal(d.hp, 5);
  assert.equal(d.supp, 2);
});

test('폭발물로 건물을 쏘면 숨은 적도 맞는다', () => {
  const T = loadGame(); const G = setup(T);
  bldg(G, 5, 5, 2); const d = T.mkUnit(1, 'sniper', 5, 5); const a = T.mkUnit(0, 'tank', 5, 1);
  const hp0 = G.map[5][5].bhp;
  T.shootBldg(a, 5, 5);
  assert.ok(G.map[5][5].bhp < hp0 || G.map[5][5].t === 'rubble');
  assert.ok(d.hp < 10);
});

test('건물 안 저격수는 붙어 있는 적에게만 보인다', () => {
  const T = loadGame(); const G = setup(T); G.fog = true;
  bldg(G, 5, 5, 2); const s = T.mkUnit(1, 'sniper', 5, 5); const e = T.mkUnit(0, 'rifle', 5, 2); T.bump();
  assert.equal(T.seen(s, 0), false);
  e.c = 4; T.bump();
  assert.equal(T.seen(s, 0), true);
});

test('보이는 적 옆 칸에 들어서면 이동이 멈춘다', () => {
  const T = loadGame(); const G = setup(T);
  const u = T.mkUnit(0, 'rifle', 5, 1); T.mkUnit(1, 'rifle', 5, 4);
  const R = T.reach(u);
  assert.ok(R.has(T.key(5, 3)), '적 옆 칸까지는 감');
  for (const [k, from] of R.prev) if (from !== T.key(5, 1)) assert.ok(T.dist(T.kr(from), T.kc(from), 5, 4) > 1, '적 옆 칸에서 더 나아감');
});

test('차량은 건물에 못 들어가고, 보병은 들어간다', () => {
  const T = loadGame(); const G = setup(T);
  bldg(G, 5, 3, 2);
  const t = T.mkUnit(0, 'tank', 5, 2), i = T.mkUnit(0, 'rifle', 6, 2);
  assert.ok(!T.reach(t).has(T.key(5, 3)));
  assert.ok(T.reach(i).has(T.key(5, 3)));
});

test('거점 점령과 지휘점수 수입', () => {
  const T = loadGame(); T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 's', seed: 5, fog: false });
  const G = T.G; const o = G.objs[0];
  const u = G.units.find(x => x.nat === 0 && x.type === 'rifle');
  const occ = T.unitAt(o.r, o.c); if (occ) G.units = G.units.filter(x => x !== occ);
  T.moveUnit(u, o.r, o.c);
  assert.equal(G.map[o.r][o.c].owner, 0);
  assert.equal(T.income(0), 3 + 2);
});

test('증원은 집결지에만, 화력 지원은 쿨다운이 지나야 다시', () => {
  const T = loadGame(); T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 's', seed: 5, fog: false });
  const G = T.G; G.nats[0].cp = 30;
  const mid = Math.floor(T.N / 2);
  assert.equal(T.buy(0, 'rifle', mid, mid), null, '도심에는 배치 불가');
  const sp = T.deploySpots(0, 'rifle')[0];
  assert.ok(T.buy(0, 'rifle', T.kr(sp), T.kc(sp)));
  assert.equal(G.nats[0].cp, 27);
  assert.ok(T.support(0, 'smoke', mid, mid));
  assert.equal(T.support(0, 'smoke', mid, mid), false, '곧바로 두 번째 지원은 거부');
  assert.equal(G.map[mid][mid].smoke, 3);
  G.time += 25;
  assert.ok(T.support(0, 'smoke', mid, mid), '쿨다운 뒤에는 가능');
});

test('자유 이동: 아무 지점으로나 시간이 지나며 걸어가고, 차량은 건물을 돌아간다', () => {
  const T = loadGame(); const G = setup(T);
  for (let r = 2; r <= 8; r++) bldg(G, r, 5, 3);
  const t = T.mkUnit(0, 'tank', 5, 2); T.bump();
  T.orderMoveTo(t, 8.3, 5.7);
  for (const [x, z] of t.path) assert.notEqual(G.map[Math.floor(z)][Math.floor(x)].t, 'bldg', '차량 경유점이 건물 위');
  const x0 = t.x; T.rtTick(0.1);
  assert.ok(t.x !== x0 || t.z !== 5.5, '움직이기 시작');
  assert.ok(Math.hypot(t.x - 8.3, t.z - 5.7) > 1, '한 틱에 도착하지 않음');
  for (let i = 0; i < 400 && t.path.length; i++) { T.rtTick(0.1); assert.notEqual(G.map[t.r][t.c].t, 'bldg', '차량이 건물을 통과'); }
  assert.ok(Math.hypot(t.x - 8.3, t.z - 5.7) < 0.05, `정확한 지점에 도착 (${t.x.toFixed(2)},${t.z.toFixed(2)})`);
  assert.deepEqual([t.r, t.c], [5, 8]);
});

test('트인 곳에서는 칸을 따라 꺾지 않고 곧게 간다', () => {
  const T = loadGame(); const G = setup(T);
  const u = T.mkUnit(0, 'rifle', 2, 2); u.x = 2.5; u.z = 2.5;
  T.orderMoveTo(u, 9.2, 6.1);
  assert.equal(u.path.length, 1, `경유점 ${u.path.length}개`);
});

test('실시간 사격: 사거리 안의 보이는 적을 자동으로 쏘고, 건물 안이 더 오래 버틴다', () => {
  const ttk = (inBldg) => { const T = loadGame(); const G = setup(T); G.maxR = 999;
    if (inBldg) bldg(G, 5, 5, 2);
    T.mkUnit(0, 'rifle', 5, 2); const d = T.mkUnit(1, 'rifle', 5, 5); d.hp = 1000; T.bump();
    for (let i = 0; i < 300; i++) { d.cd = 99; T.rtTick(0.1); }
    return 1000 - d.hp; };
  // 피해 굴림과 재장전이 무작위라 세 판씩 합산한다
  let open = 0, cov = 0; for (let i = 0; i < 3; i++) { open += ttk(false); cov += ttk(true); }
  assert.ok(open > 15, `30초 동안 피해를 줌 (${open})`);
  assert.ok(cov < open, `건물 안은 덜 맞음 (${open} → ${cov})`);
});

test('공격 명령: 사거리 밖 적을 쫓아가 쏜다', () => {
  const T = loadGame(); const G = setup(T); G.maxR = 999;
  const a = T.mkUnit(0, 'rifle', 2, 2), d = T.mkUnit(1, 'mg', 12, 12); d.hp = 1000; T.bump();
  T.orderAttack(a, d);
  for (let i = 0; i < 400 && d.hp === 1000; i++) { d.cd = 99; T.rtTick(0.1); }
  assert.ok(d.hp < 1000, '쫓아가서 맞힘');
  assert.ok(T.dist(a.r, a.c, d.r, d.c) <= T.UT.rifle.rng[1]);
});

test('30초마다 수입과 승점이 들어온다', () => {
  const T = loadGame(); T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 's', seed: 5, fog: false });
  const G = T.G; G.units = []; const o = G.objs[0]; G.map[o.r][o.c].owner = 0; const cp0 = G.nats[0].cp;
  T.rtRun(T.ROUND_S + 0.05);
  assert.equal(G.nats[0].cp, cp0 + 5);
  assert.equal(G.nats[0].vp, 1);
});

function checkInvariants(T, G, label) {
  checkUnits(T, G, label);
  assert.ok(G.over, `${label}: 게임이 끝나지 않음`);
}
function checkUnits(T, G, label) {
  assert.equal((G.errs || []).length, 0, `${label}: AI 실행 중 예외 ${(G.errs || [])[0]}`);
  const seen = new Set();
  for (const u of G.units) {
    assert.equal(u.r, Math.floor(u.z), `${label}: 칸과 좌표가 어긋남`); assert.equal(u.c, Math.floor(u.x));
    const x = G.map[u.r][u.c];
    if (T.UT[u.type].cls === 'veh') assert.notEqual(x.t, 'bldg', `${label}: 차량이 건물 안에`);
    if (!T.UT[u.type].fly) assert.notEqual(x.t, 'water', `${label}: 부대가 물 위에`);
    assert.ok(u.hp > 0 && u.hp <= 10, `${label}: 체력 범위 밖 ${u.hp}`);
  }
}

for (const [slots, size] of [[['ai', 'ai', 'none', 'none'], 's'], [['ai', 'ai', 'none', 'none'], 'm'], [['ai', 'ai', 'ai', 'ai'], 'm']]) {
  for (const diff of ['normal', 'hard']) {
    const n = slots.filter(s => s !== 'none').length;
    test(`AI 관전 게임이 끝까지 진행된다 (${size}, ${n}세력, ${diff})`, async () => {
      const T = loadGame();
      await playAI(T, { slots, size, diff, seed: 101 + n, check: G => checkUnits(T, G, `${size}/${n}/${diff}`) });
      checkInvariants(T, T.G, `${size}/${n}/${diff}`);
      assert.ok(T.G.time > 90, '너무 빨리 끝남');
    });
  }
}

test('칸 없는 시야: 같은 칸 쌍이라도 실제 위치에 따라 건물 모서리 너머가 보이거나 가린다', () => {
  const T = loadGame(); const G = setup(T); G.fog = true;
  bldg(G, 5, 5, 3); T.bump();
  const a = T.mkUnit(0, 'rifle', 5, 3), e = T.mkUnit(1, 'rifle', 5, 7);
  a.x = 3.5; a.z = 5.5; e.x = 7.5; e.z = 5.5; T.bump();
  assert.equal(T.seen(e, 0), false, '건물 정면 너머는 안 보임');
  a.x = 3.5; a.z = 5.02; e.x = 7.5; e.z = 5.02; G.time = 1; T.bump();
  assert.equal(T.seen(e, 0), true, '같은 칸이라도 건물 외벽 바깥 틈으로는 보임');
});

test('숨은 보병은 가까이 와야 발견되고, 쏘면 드러난다', () => {
  const T = loadGame(); const G = setup(T); G.fog = true;
  G.map[5][9] = { t: 'park', owner: null, obj: null, smoke: 0 };
  const a = T.mkUnit(0, 'rifle', 5, 4), e = T.mkUnit(1, 'rifle', 5, 9);
  a.x = 4.5; a.z = 5.5; e.x = 9.5; e.z = 5.5; T.bump();
  assert.equal(T.seen(e, 0), false, '공원 속 5칸 거리는 안 보임');
  e.firedT = 0; G.time = 1; T.bump();
  assert.equal(T.seen(e, 0), true, '쏜 직후엔 보임');
});

test('방향 엄폐: 쏘는 쪽에 벽이 있으면 명중률이 떨어지고, 옆에서 쏘면 엄폐가 없다', () => {
  const T = loadGame(); const G = setup(T);
  bldg(G, 5, 6, 2); T.bump();
  const d = T.mkUnit(1, 'rifle', 5, 5); d.x = 5.8; d.z = 5.5;          // 동쪽 건물 벽에 붙음
  const east = T.mkUnit(0, 'rifle', 3, 9); east.x = 9.5; east.z = 5.5; // 건물 너머 동쪽 (보이진 않아도 계산은 됨)
  const north = T.mkUnit(0, 'rifle', 2, 5); north.x = 5.8; north.z = 2.5;
  const cov = T.__get('coverOf');
  assert.equal(cov(d, east).kind, 'wall');
  assert.equal(cov(d, north).cov, 0, '옆(북쪽)에서는 벽 엄폐 없음');
  assert.ok(T.calcDmg(north, d, false) > T.calcDmg(east, d, false));
});

test('차량과 소품도 엄폐가 되고, 이동 명령은 근처 엄폐 자리로 붙는다', () => {
  const T = loadGame(); const G = setup(T);
  const d = T.mkUnit(1, 'rifle', 5, 5); d.x = 5.5; d.z = 5.5;
  const a = T.mkUnit(0, 'rifle', 5, 1); a.x = 1.5; a.z = 5.5;
  const open = T.calcDmg(a, d, false);
  G.covers.push({ x: 5.15, z: 5.5, r: .25, kind: 'car' });
  const c = T.__get('coverOf')(d, a);
  assert.equal(c.kind, 'car');
  assert.ok(T.calcDmg(a, d, false) < open * 0.75);
  const u = T.mkUnit(0, 'rifle', 8, 8);
  const [x, z] = T.__get('coverSnap')(u, 5.5, 5.75);
  assert.ok(Math.hypot(x - 5.15, z - 5.5) < Math.hypot(5.5 - 5.15, 5.75 - 5.5) + 1e-9, '엄폐물 쪽으로 붙음');
});

test('헬기 투입: 보이는 빈 도로에 요청하면 몇 초 뒤 소총분대가 생긴다', () => {
  const T = loadGame();
  T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 's', diff: 'normal', fog: false, speed: 0, seed: 11 });
  const G = T.G; G.nats[0].cp = 20;
  let spot = null;
  for (let r = 0; r < T.N && !spot; r++) for (let c = 0; c < T.N; c++) { const x = T.cell(r, c); if (x.t === 'road' && T.visSet(0).has(T.key(r, c)) && !G.units.some(u => Math.floor(u.z) === r && Math.floor(u.x) === c)) { spot = [r, c]; break; } }
  const before = G.units.filter(u => u.nat === 0).length;
  assert.ok(T.canSupport(0, 'heli', spot[0], spot[1]));
  assert.ok(T.support(0, 'heli', spot[0], spot[1]));
  assert.equal(G.units.filter(u => u.nat === 0).length, before, '착지 전에는 부대가 없다');
  for (let i = 0; i < 70; i++) T.rtTick(0.1);
  const landed = G.units.filter(u => u.nat === 0 && u.type === 'rifle' && u.r === spot[0] && u.c === spot[1]);
  assert.equal(landed.length, 1);
  assert.ok(!T.canSupport(0, 'heli', 5, 5) || T.cell(5, 5).t !== 'bldg', '건물 위에는 내릴 수 없다');
});
