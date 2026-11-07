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
  T.G.units = []; T.G.props = []; T.G.covers = []; // 빈 도로 지도라 도시 소품(엄폐·장애물)도 비운다
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
  assert.equal(T.los(5, 2, 6.3, 5, 8, .5), true, '6층 건물 옥상에서는 3층 건물 너머가 보임');
  assert.equal(T.los(5, 2, 5.5, 5, 8, .5), false, '건물 한가운데(창에서 먼 곳)에서는 밖이 안 보임');
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
  bldg(G, 5, 5, 2); const s = T.mkUnit(1, 'sniper', 5, 5); s.x = 5.22; s.z = 5.5; const e = T.mkUnit(0, 'rifle', 5, 2); T.bump();
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
  const tp = T.pathTo(i, 5, 3); assert.equal(tp[tp.length - 1], T.key(5, 3));
});

test('건물은 문으로만 드나들고, 안에서는 계단으로 한 층씩 오른다', () => {
  const T = loadGame(); const G = setup(T);
  for (let r = 4; r <= 6; r++) for (let c = 4; c <= 6; c++) { bldg(G, r, c, 4); G.map[r][c].blk = 7; }
  T.bump();
  const dp = T.__get('doorSides'), wc = T.__get('wallCross');
  // 문은 바깥 면에만 있고, 블록 둘레 칸마다 적어도 하나
  for (let r = 4; r <= 6; r++) for (let c = 4; c <= 6; c++) { const d = dp(r, c); if (r === 5 && c === 5) assert.equal(d.join(''), '0000'); else assert.ok(d.some(Boolean)); }
  const u = T.mkUnit(0, 'rifle', 2, 2); u.x = 2.5; u.z = 2.5;
  T.orderMoveTo(u, 5.5, 5.5);
  // 경로의 어느 구간도 문이 아닌 곳으로 벽을 넘지 않는다
  let px = u.x, pz = u.z; for (const p of u.path) { assert.ok(!wc(u, px, pz, p[0], p[1]), `벽 통과 ${px},${pz}→${p}`); px = p[0]; pz = p[1]; }
  assert.ok(u.path.some(p => p.door === 'b'), '문을 지난다');
  // 걸어 들어가는 동안 매 순간 벽을 넘지 않는다
  let lx = u.x, lz = u.z, inT = null;
  for (let i = 0; i < 600; i++) { T.rtTick(0.1); assert.ok(!wc(u, lx, lz, u.x, u.z), '틱 사이 벽 통과'); lx = u.x; lz = u.z; if (inT == null && u.r === 5 && u.c === 5) inT = G.time; if (u.fl >= 4) break; }
  assert.ok(inT != null, '건물 가운데 칸에 들어간다');
  assert.equal(u.fl, 4, '옥상까지 오른다');
  assert.ok(u.cd > 0, '계단에서 내려선 직후에는 바로 쏘지 않는다');
  const climb = G.time - inT; assert.ok(climb > 4 * 2.4 - .5, `오르는 데 시간이 걸린다 (${climb.toFixed(1)}초)`);
  // 옥상에서는 건물 높이보다 조금 위에서 본다
  assert.ok(Math.abs(T.eye(u) - 4.3) < 1e-9);
  // 나가라고 하면 먼저 1층까지 내려온 뒤 문으로 나간다
  T.orderMoveTo(u, 1.5, 1.5); T.rtTick(0.1);
  assert.ok(u.r === 5 && u.c === 5 && u.fl < 4 && u.fl > 0, '계단으로 내려오는 중');
  lx = u.x; lz = u.z; let outT = 0;
  for (let i = 0; i < 600 && !(u.r === 1 && u.c === 1); i++) { T.rtTick(0.1); assert.ok(!wc(u, lx, lz, u.x, u.z)); if (G.map[u.r][u.c].t !== 'bldg' && !outT) { outT = 1; assert.equal(u.fl, 0); } lx = u.x; lz = u.z; }
  assert.ok(u.r === 1 && u.c === 1, '밖으로 나와 목적지에 간다');
});

test('계단을 오르내리는 동안은 쏘지 않는다', () => {
  const T = loadGame(); const G = setup(T);
  bldg(G, 5, 5, 4); G.map[5][5].blk = 1; T.bump();
  const u = T.mkUnit(0, 'rifle', 5, 5); u.x = 5.5; u.z = 5.5; u.fl = 0; u.flK = T.key(5, 5);
  const e = T.mkUnit(1, 'rifle', 5, 8); e.x = 8.5; e.z = 5.5; e.hp = 999; e.cd = 999;
  let shotWhileClimb = false;
  for (let i = 0; i < 200; i++) { const was = u.climb; const f0 = u.firedT; T.rtTick(0.1); if (u.firedT !== f0 && (was || u.climb)) shotWhileClimb = true; }
  assert.ok(!shotWhileClimb);
  assert.ok(u.firedT != null, '옥상에 올라선 뒤에는 쏜다');
});

test('1층에 막 들어온 보병은 낮게 보고, 위층에 오르면 건물 너머를 본다', () => {
  const T = loadGame(); const G = setup(T);
  bldg(G, 5, 5, 4); G.map[5][5].blk = 1; bldg(G, 5, 7, 1); G.map[5][7].blk = 2; T.bump();
  const u = T.mkUnit(0, 'rifle', 5, 5); u.x = 5.8; u.z = 5.5; const e = T.mkUnit(1, 'rifle', 5, 9); e.x = 9.5; e.z = 5.5;
  u.fl = 0; u.flK = T.key(5, 5); T.bump();
  assert.ok(!T.canHit(u, e), '1층에서는 앞 건물에 가린다');
  u.fl = 3; T.bump();
  assert.ok(T.canHit(u, e), '4층 창가에서는 넘겨 쏜다');
});

test('벽 너머로는 못 쏜다: 건물 안에서는 바깥 벽 창가에서만 쏜다', () => {
  const T = loadGame(); const G = setup(T);
  for (const c of [4, 5, 6]) { bldg(G, 5, c, 2); G.map[5][c].blk = 1; } T.bump();
  const e = T.mkUnit(1, 'rifle', 5, 9); e.x = 9.5; e.z = 5.5;
  const u = T.mkUnit(0, 'rifle', 5, 4); u.fl = 0; u.flK = T.key(5, 4); u.x = 4.5; u.z = 5.5;
  assert.ok(!T.canHit(u, e), '같은 블록의 다른 칸 벽 너머는 못 쏜다');
  u.x = 4.5; u.z = 5.2; assert.ok(!T.canHit(u, e), '건물 안쪽 칸에서는 동쪽 적을 못 본다');
  const v = T.mkUnit(0, 'rifle', 5, 6); v.fl = 0; v.flK = T.key(5, 6); v.x = 6.5; v.z = 5.5; T.bump();
  assert.ok(!T.canHit(v, e), '방 한가운데에서는 못 쏜다');
  v.x = 6.8; T.bump(); assert.ok(T.canHit(v, e), '바깥 벽 창가에서는 쏜다');
  assert.ok(T.canHit(e, v), '창가의 적은 맞출 수 있다');
  v.x = 6.5; T.bump(); assert.ok(!T.canHit(e, v), '방 안쪽 적은 밖에서 못 맞춘다');
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
  const ttk = (inBldg) => { const T = loadGame(); const G = setup(T); G.maxR = 999; G.nats[1].ctrl = 'human'; // AI가 표적을 건물 밖으로 빼지 않게
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
  const T = loadGame(); const G = setup(T); G.maxR = 999; G.nats[1].ctrl = 'human'; // 표적이 AI로 도망다니지 않게
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

test('병사 개별 행동: 차례로 출발하고, 따로 흩어져 서고, 체력만큼 쓰러진다', () => {
  const T = loadGame(); const G = setup(T); G.nats[1].ctrl = 'human';
  const u = T.mkUnit(0, 'rifle', 10, 10); G.units.push(u); T.bump();
  T.rtTick(0.1); const M = u._men; assert.ok(M && M.length >= 8, '병사 목록');
  T.orderMoveTo(u, 18.5, 10.5); T.rtTick(0.1); T.rtTick(0.1);
  const still = M.filter(m => m.lag > 0).length; assert.ok(still >= 3, '뒤쪽 병사는 아직 출발 전');
  const xs0 = M.map(m => m.x);
  for (let i = 0; i < 400 && u.path.length; i++) T.rtTick(0.1);
  for (let i = 0; i < 60; i++) T.rtTick(0.1);
  // 모두 도착점 근처에 있지만 한 점에 뭉치지 않는다
  for (const m of M) assert.ok(Math.hypot(m.x - u.x, m.z - u.z) < .6, '도착점 근처');
  let minD = 9; for (let i = 0; i < M.length; i++) for (let j = i + 1; j < M.length; j++) minD = Math.min(minD, Math.hypot(M[i].x - M[j].x, M[i].z - M[j].z));
  assert.ok(minD > .04, '병사끼리 겹치지 않음 ' + minD);
  assert.ok(M.some((m, i) => Math.abs(m.x - xs0[i]) > 5), '실제로 이동함');
  // 체력이 반으로 줄면 병사도 절반쯤 쓰러진다
  u.hp = 5; T.rtTick(0.1);
  const dead = M.filter(m => m.dead).length; assert.ok(dead >= 4 && dead <= 5, '쓰러진 병사 ' + dead);
});

test('병사 개별 사격: 분대가 쏘면 몇 명이 실제로 쏘고, 탄창이 비면 재장전한다', () => {
  const T = loadGame(); const G = setup(T); G.nats[1].ctrl = 'human';
  const a = T.mkUnit(0, 'rifle', 10, 10), d = T.mkUnit(1, 'rifle', 10, 13); G.units.push(a, d); T.bump();
  T.rtTick(0.1);
  for (let i = 0; i < 6; i++) T.rtShoot(a, d);
  assert.ok(a._sh && a._sh.length >= 1, '쏜 병사 기록');
  assert.ok(a._men.some(m => m.rl > 0), '누군가는 재장전 중');
  assert.ok(d._thr, '맞은 쪽은 위협 방향을 안다');
});

test('박격포: 건물 안에서는 못 쏘고, 포탄이 날아가 떨어진 곳에서 터진다', () => {
  const T = loadGame(); const G = setup(T);
  bldg(G, 5, 5, 3); T.bump();
  const m = T.mkUnit(0, 'mortar', 5, 5); m.x = 5.8; m.z = 5.5; m.fl = 1; m.flK = T.key(5, 5);
  const e = T.mkUnit(1, 'rifle', 5, 8); e.x = 8.5; e.z = 5.5; T.bump();
  assert.ok(!T.canHit(m, e), '건물 안(실내층)에서는 곡사 사격 불가');
  m.r = 5; m.c = 2; m.x = 2.5; m.z = 5.5; m.fl = 0; m.flK = null; T.bump();
  assert.ok(T.canHit(m, e), '지상에서는 쏜다');
  const hp0 = e.hp; T.rtShoot(m, e);
  assert.equal(e.hp, hp0, '쏘는 순간에는 피해 없음');
  assert.equal(T.G.shells.length, 1, '포탄이 날아간다');
  for (let i = 0; i < 60 && T.G.shells.length; i++) { T.G.time += .1; T.shellTick(); }
  assert.equal(T.G.shells.length, 0, '포탄이 떨어졌다');
});

test('포탄이 날아가다 건물에 걸리면 그 벽에서 터진다', () => {
  const T = loadGame(); const G = setup(T);
  bldg(G, 5, 6, 8); T.bump(); const b0 = G.map[5][6].bhp;
  const s = T.shellLaunch({ x0: 2.5, z0: 5.5, h0: .5, tx: 6.5, tz: 5.5, n: 0, spread: 0, ap: 1, T: 1 });
  s.x1 = 6.5; s.z1 = 5.5;
  for (let i = 0; i < 20 && T.G.shells.length; i++) { T.G.time += .1; T.shellTick(); }
  assert.ok(G.map[5][6].bhp < b0 || G.map[5][6].t !== 'bldg', '건물이 맞았다');
});

test('대전차팀은 건물 안 적이 있는 층 벽을 뚫고, 구멍이 남는다', () => {
  const T = loadGame(); const G = setup(T);
  bldg(G, 5, 6, 3); T.bump();
  const e = T.mkUnit(1, 'rifle', 5, 6); e.x = 6.5; e.z = 5.5; e.fl = 1; e.flK = T.key(5, 6);
  const a = T.mkUnit(0, 'at', 5, 3); a.x = 3.5; a.z = 5.5; T.bump();
  const P = T.breachPt(a, e); assert.ok(P, '벽 지점이 잡힌다'); assert.equal(P.fl, 1);
  const hp0 = e.hp; const b0 = G.map[5][6].bhp; T.breach(a, P);
  assert.ok(e.hp < hp0, '그 층 적이 다친다'); assert.ok(G.map[5][6].bhp < b0, '건물이 상한다');
  assert.equal(T.G.holes.length, 1, '구멍이 남는다');
});

test('불난 건물은 타면서 상하고 안의 보병이 다치며, 결국 꺼진다', () => {
  const T = loadGame(); const G = setup(T);
  for (const c of [5, 6]) { bldg(G, 5, c, 3); G.map[5][c].blk = 1; } T.bump();
  const u = T.mkUnit(1, 'rifle', 5, 5); u.x = 5.5; u.z = 5.5; u.fl = 0; u.flK = T.key(5, 5);
  assert.ok(T.ignite(5, 5, 1)); const b0 = G.map[5][5].bhp, hp0 = u.hp;
  for (let i = 0; i < 300; i++) T.fireTick(.1);
  assert.ok(G.map[5][5].t !== 'bldg' || G.map[5][5].bhp < b0, '건물이 상한다');
  assert.ok(u.hp < hp0 || !T.G.units.includes(u), '안의 보병이 다친다');
  for (let i = 0; i < 2000 && T.G.fires.length; i++) T.fireTick(.1);
  assert.equal(T.G.fires.length, 0, '결국 꺼진다');

/* ---------- 설치형 방어물·장애물 (04d-fort) ---------- */
// 건물 사이 한 줄짜리 도로(5행)를 만든다
function alley(T) { const G = setup(T); for (let c = 0; c < T.N; c++) { bldg(G, 4, c, 2); bldg(G, 6, c, 2); } T.bump(); return G; }
const done = (G, k, x, z, ry = Math.PI / 2) => { const T2 = G; const f = { id: 900 + (G.forts || []).length, k, nat: 1, x, z, ry, hp: 50, prog: 1 }; (G.forts = G.forts || []).push(f); return f; };

test('차량은 방벽을 넘어가지 않는다: 골목이 막히면 앞에서 멈추고, 보병은 넘어간다', () => {
  const T = loadGame(); const G = alley(T);
  for (const z of [5.2, 5.5, 5.8]) done(G, 'jersey', 8.5, z);
  T.__get('fortCovers')(); G.navV = 1;
  const t = T.mkUnit(0, 'tank', 5, 2); t.x = 2.5; t.z = 5.5;
  T.orderMoveTo(t, 12.5, 5.5);
  for (let i = 0; i < 600; i++) T.rtTick(0.1);
  assert.ok(t.x < 8.4, `전차가 방벽 앞에서 멈춤 (x=${t.x.toFixed(2)})`);
  const u = T.mkUnit(0, 'rifle', 5, 3); u.x = 3.5; u.z = 5.5;
  T.orderMoveTo(u, 12.5, 5.5);
  for (let i = 0; i < 600 && u.path.length; i++) T.rtTick(0.1);
  assert.ok(u.x > 12, `보병은 넘어감 (x=${u.x.toFixed(2)})`);
});

test('차량은 주차된 차를 돌아가고 차 위를 지나지 않는다', () => {
  const T = loadGame(); const G = setup(T);
  G.props = [{ k: 'car', kind: 'suv', x: 6.5, z: 5.5, ry: Math.PI / 2, col: '#fff' }]; G.navV = 2;
  const box = { x: 6.5, z: 5.5, ry: Math.PI / 2, hl: .205, hw: .085 };
  const t = T.mkUnit(0, 'ifv', 5, 2); t.x = 2.5; t.z = 5.5;
  T.orderMoveTo(t, 10.5, 5.5);
  for (let i = 0; i < 400 && t.path.length; i++) { T.rtTick(0.1); assert.ok(!T.__get('inBox')(box, t.x, t.z, 0.05), `차를 넘어감 (${t.x.toFixed(2)},${t.z.toFixed(2)})`); }
  assert.ok(Math.hypot(t.x - 10.5, t.z - 5.5) < .1, '돌아서 도착');
});

test('전차는 모래주머니·철조망을 짓밟고, 바퀴 차량은 모래주머니에 막힌다', () => {
  const T = loadGame(); const G = alley(T);
  for (const z of [5.2, 5.5, 5.8]) done(G, 'sandbag', 8.5, z);
  G.navV = 3;
  const h = T.mkUnit(0, 'hmv', 5, 2); h.x = 2.5; h.z = 5.5;
  T.orderMoveTo(h, 12.5, 5.5);
  for (let i = 0; i < 400; i++) T.rtTick(0.1);
  assert.ok(h.x < 8.4, `험비는 막힘 (x=${h.x.toFixed(2)})`);
  const t = T.mkUnit(0, 'tank', 5, 3); t.x = 3.5; t.z = 5.5;
  G.units = G.units.filter(u => u !== h);
  T.orderMoveTo(t, 12.5, 5.5);
  for (let i = 0; i < 600 && t.path.length; i++) T.rtTick(0.1);
  assert.ok(t.x > 12, `전차는 통과 (x=${t.x.toFixed(2)})`);
  assert.ok(G.forts.length < 3, '짓밟힌 모래주머니가 사라짐');
});

test('공병이 지휘점수를 써서 모래주머니를 쌓으면 엄폐가 되고, 포격에 부서진다', () => {
  const T = loadGame(); const G = setup(T); G.maxR = 999;
  const e = T.mkUnit(0, 'eng', 5, 3); e.x = 3.5; e.z = 5.5;
  const cp0 = G.nats[0].cp;
  const f = T.__get('orderFort')(e, 'sandbag', 6.5, 5.5);
  assert.equal(typeof f, 'object', String(f));
  assert.equal(G.nats[0].cp, cp0 - 1);
  for (let i = 0; i < 200 && f.prog < 1; i++) T.rtTick(0.1);
  assert.equal(f.prog, 1, '다 지음');
  assert.ok(G.covers.some(c => c.fort === f.id), '엄폐 목록에 들어감');
  // 방어물 뒤 보병은 앞에서 오는 사격에 엄폐를 받는다
  const enemy = T.mkUnit(1, 'rifle', 5, 10); enemy.x = 10.5; enemy.z = 5.5;
  const [fx] = [f.x]; const d = T.mkUnit(0, 'rifle', 5, 6); d.x = fx - .12; d.z = 5.5;
  const cv = T.__get('coverOf')(d, enemy);
  assert.ok(cv.cov >= .35, `모래주머니 엄폐 ${cv.cov} ${cv.kind}`);
  G.nats[0].cp = 50; G.time = 999;
  T.__get('fortBlast')(6.5, 5.5, 1.5, 40);
  assert.ok(!G.forts.includes(f), '포격에 부서짐');
  assert.ok(!G.covers.some(c => c.fort === f.id), '엄폐도 사라짐');
});

test('소총분대는 콘크리트 방벽을 못 짓고, 짓던 중 다른 명령을 받으면 취소된다', () => {
  const T = loadGame(); const G = setup(T);
  const u = T.mkUnit(0, 'rifle', 5, 3);
  assert.equal(typeof T.__get('orderFort')(u, 'jersey', 6.5, 5.5), 'string');
  const cp0 = G.nats[0].cp;
  const f = T.__get('orderFort')(u, 'sandbag', 6.5, 5.5);
  T.rtTick(0.1);
  T.orderMoveTo(u, 2.5, 8.5); T.rtTick(0.1);
  assert.ok(!G.forts.includes(f), '짓다 만 방어물은 치워짐');
  assert.equal(G.nats[0].cp, cp0, '시작도 안 했으면 지휘점수 환불');
});
