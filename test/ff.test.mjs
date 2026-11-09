// 아군 오사 회피(06x-ff): 사선·표적 둘레·후폭풍·위험근접거리·전투기 진입 방향
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './harness.mjs';

const F = (T, n) => T.__get(n);
function setup(T) {
  T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 's', seed: 3, fog: false });
  T.G.units = []; T.G.props = []; T.G.covers = []; T.G.forts = [];
  const G = T.G;
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) G.map[r][c] = { t: 'road', owner: null, obj: null, smoke: 0 };
  T.bump(); return G;
}
const put = (T, n, ty, x, z) => { const u = T.mkUnit(n, ty, Math.floor(z), Math.floor(x)); u.x = x; u.z = z; u.cd = 0; return u; };
const fight = (T, u) => { u.cd = 0; F(T, 'rtFight')(u); };

test('사선 위에 아군이 있으면 소총분대가 쏘지 않는다', () => {
  const T = loadGame(); setup(T);
  const a = put(T, 0, 'rifle', 5.5, 10.5); put(T, 0, 'rifle', 8.5, 10.5); const e = put(T, 1, 'rifle', 12.5, 10.5);
  fight(T, a);
  assert.notEqual(a.firedT, T.G.time, '쏘지 않았다'); assert.equal(a._ffB.why, 'line'); assert.equal(e.hp, T.UT.rifle.hpMax || 10);
});

test('사선이 비면 쏜다', () => {
  const T = loadGame(); setup(T);
  const a = put(T, 0, 'rifle', 5.5, 10.5); put(T, 0, 'rifle', 8.5, 13.5); put(T, 1, 'rifle', 12.5, 10.5);
  fight(T, a);
  assert.equal(a.firedT, T.G.time);
});

test('표적 바로 곁에 아군이 붙어 있으면 전차가 쏘지 않는다', () => {
  const T = loadGame(); setup(T);
  const a = put(T, 0, 'tank', 4.5, 10.5); put(T, 0, 'rifle', 12.5, 11.4); put(T, 1, 'rifle', 12.5, 10.5);
  fight(T, a);
  assert.notEqual(a.firedT, T.G.time); assert.equal(a._ffB.why, 'near');
});

test('대전차팀 뒤 30m 원뿔에 아군 보병이 있으면 후폭풍 때문에 쏘지 않는다', () => {
  const T = loadGame(); setup(T);
  const a = put(T, 0, 'at', 8.5, 10.5); put(T, 0, 'rifle', 7.0, 10.5); put(T, 1, 'tank', 14.5, 10.5);
  fight(T, a);
  assert.notEqual(a.firedT, T.G.time); assert.equal(a._ffB.why, 'bb');
});

test('보류가 이어지면 옆으로 옮겨 사선을 연다', () => {
  const T = loadGame(); const G = setup(T);
  const a = put(T, 0, 'rifle', 5.5, 10.5); put(T, 0, 'rifle', 8.5, 10.5); put(T, 1, 'rifle', 12.5, 10.5);
  for (let i = 0; i < 20; i++) { G.time += .1; fight(T, a); if (a.path.length) break; }
  assert.ok(a.path.length, '옮길 곳으로 간다');
  const [x, z] = a.path[0]; assert.ok(Math.abs(z - 10.5) >= .5, '옆으로');
});

test('박격포: 표적 75m(약 6칸) 안에 아군이 있으면 쏘지 않고, 멀면 쏜다', () => {
  const T = loadGame(); const G = setup(T);
  const m = put(T, 0, 'mortar', 3.5, 3.5); const e = put(T, 1, 'rifle', 3.5, 15.5); const f = put(T, 0, 'rifle', 7.5, 15.5);
  fight(T, m); assert.notEqual(m.firedT, G.time, '4칸(48m) 아군 → 보류'); assert.equal(m._ffB.why, 'red');
  f.x = 14.5; f.r = 15; f.c = 14; T.bump(); G.time += .1; fight(T, m); assert.equal(m.firedT, G.time, '11칸 → 쏜다');
});

test('건물 실내 아군은 파편을 막아 더 가까이까지 포격할 수 있다', () => {
  const T = loadGame(); const G = setup(T);
  const f = put(T, 0, 'rifle', 8.5, 10.5);
  const near = F(T, 'ffRed')(0, 'mortar', 13.5, 10.5);
  assert.equal(near.k, 'hold');
  G.map[10][8] = { t: 'bldg', f: 3, owner: null, obj: null, smoke: 0, bhp: 30, bmax: 30 }; T.bump();
  const inB = F(T, 'ffRed')(0, 'mortar', 13.5, 10.5);
  assert.ok(inB.d > near.d * 1.9, `실내 ${inB.d.toFixed(1)} > 바깥 ${near.d.toFixed(1)}`);
});

test('플레이어 포격 요청: 금지 거리 안이면 거부되고 지휘점수는 그대로', () => {
  const T = loadGame(); const G = setup(T);
  put(T, 0, 'rifle', 10.5, 12.5); G.nats[0].cp = 50;
  G.fog = false; const vs = F(T, 'visSet'); T.__set('visSet', () => ({ has: () => true }));
  const ok = T.support(0, 'arty', 10, 14);
  assert.equal(ok, false); assert.equal(G.nats[0].cp, 50);
  assert.equal(T.support(0, 'arty', 30, 30), true, '멀리는 된다');
  T.__set('visSet', vs);
});

test('전투기 진입 방향은 폭탄 줄이 아군에서 멀어지는 쪽', () => {
  const T = loadGame(); const G = setup(T);
  // 목표 (20,20). 아군은 목표 서쪽 9칸 → 동서로 들어오면 길게 떨어진 폭탄이 아군 쪽, 남북이 낫다
  put(T, 0, 'rifle', 11.5, 20.5);
  const b = F(T, 'ffStick')(0, 20, 20);
  assert.ok(Math.abs(b.hx) < .75, `진입 방향 x성분 ${b.hx.toFixed(2)}`);
});

test('투하 순간 아군이 금지 거리 안이면 폭격을 중지한다', () => {
  const T = loadGame(); const G = setup(T);
  put(T, 0, 'rifle', 17.5, 20.5);
  const j = { kind: 'jet', n: 0, r: 20, c: 20, hx: 0, hz: 1, imp: G.time + 1, id: 999 };
  G.bombs = [];
  F(T, 'jetDrop')(j);
  assert.equal(j.abort, 1); assert.equal(G.bombs.length, 0);
});

test('실내 수류탄: 그 방에 아군이 있으면 던지지 않는다', () => {
  const T = loadGame(); const G = setup(T);
  G.map[10][10] = { t: 'bldg', f: 2, owner: null, obj: null, smoke: 0, bhp: 30, bmax: 30, blk: 1 }; T.bump();
  const a = put(T, 0, 'rifle', 9.5, 10.5); put(T, 0, 'rifle', 10.5, 10.5); const e = put(T, 1, 'rifle', 10.4, 10.4);
  const hp = e.hp; const fl = F(T, 'flOf')(e);
  const hit = F(T, 'cqbBang')(a, 10, 10, fl);
  assert.equal(hit, 0); assert.equal(e.hp, hp);
});
