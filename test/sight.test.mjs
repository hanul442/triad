// 시야·발견·소리(06y2-sight) 테스트
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './harness.mjs';

const F = (T, n) => T.__get(n);
function setup(T, cfg = {}) {
  T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 's', seed: 3, fog: true, hour: 'day', wx: 'clear', clime: 'temp', ...cfg });
  const G = T.G; G.units = []; G.props = []; G.covers = []; G.nats[1].ctrl = 'human'; G.time = 100;
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) G.map[r][c] = { t: 'road', owner: null, obj: null, smoke: 0 };
  T.bump(); return G;
}
const put = (T, u, x, z) => { u.x = x; u.z = z; u.c = Math.floor(x); u.r = Math.floor(z); u.path = []; u._movT = -99; u._opx = x; u._opz = z; };

test('짙은 안개: 맨눈은 약 60m, 열상 전차는 조금 더, 드론은 땅을 거의 못 본다', () => {
  const T = loadGame(); const vr = F(T, 'visRange');
  setup(T, { wx: 'fog' });
  const r = T.mkUnit(0, 'rifle', 5, 5), k = T.mkUnit(0, 'tank', 20, 20), d = T.mkUnit(0, 'drone', 12, 12);
  assert.equal(vr(r), 5); assert.ok(vr(k) > vr(r) && vr(k) <= 9); assert.ok(vr(d) <= 2);
  const e = T.mkUnit(1, 'rifle', 5, 12); put(T, r, 5.5, 5.5); put(T, e, 11.5, 5.5); e.firedT = 99.5; T.bump();
  assert.equal(T.seen(e, 0), false, '안개 속 70m 적은 안 보인다');
});

test('기후에 따라 날씨 모습이 다르다: 겨울 폭우 → 눈보라, 사막 폭우 → 모래폭풍', () => {
  const T = loadGame(); const kind = F(T, 'wxKind'), vr = F(T, 'visRange');
  let G = setup(T, { wx: 'storm', clime: 'winter' }); assert.equal(kind(), 'blizzard');
  G = setup(T, { wx: 'rain', clime: 'winter' }); assert.equal(kind(), 'snow');
  G = setup(T, { wx: 'storm', clime: 'desert' }); assert.equal(kind(), 'sand');
  const r = T.mkUnit(0, 'rifle', 5, 5); assert.equal(vr(r), 3, '모래폭풍 약 40m');
  assert.match(F(T, 'envTag')(), /모래폭풍 .*시정 약 40m/);
});

test('멈춘 보병은 더 가까이 와야 보이고, 쏘면 멀리서 드러난다(전차포는 더 멀리)', () => {
  const T = loadGame(); const G = setup(T);
  const a = T.mkUnit(0, 'rifle', 5, 4), e = T.mkUnit(1, 'rifle', 5, 15);
  put(T, a, 4.5, 5.5); put(T, e, 17.5, 5.5); T.bump();   // 13칸(약 156m): 맨눈 시야 14칸 안
  assert.equal(T.seen(e, 0), false, '자리 잡고 멈춘 보병은 13칸에서 안 보임');
  e._movT = G.time; T.bump(); assert.equal(T.seen(e, 0), true, '움직이면 보임');
  e._movT = -99; put(T, e, 21.5, 5.5); T.bump(); assert.equal(T.seen(e, 0), false, '17칸은 시야 밖');
  const k = T.mkUnit(1, 'tank', 5, 21); put(T, k, 21.5, 5.5); k.firedT = G.time - .5; T.bump();
  assert.equal(T.seen(k, 0), true, '방금 포를 쏜 전차는 시야 밖에서도 보임');
});

test('밤 맨눈 시야는 달빛에 달렸고, 열상은 낮과 같다', () => {
  const T = loadGame(); const vr = F(T, 'visRange'), moonK = F(T, 'moonK');
  let G = setup(T, { hour: 'night', seed: 1 }); const m1 = moonK(); const a = T.mkUnit(1, 'rifle', 5, 5); const v1 = vr(a);
  G = setup(T, { hour: 'night', seed: 5 }); const m2 = moonK(); const b = T.mkUnit(1, 'rifle', 5, 5); const v2 = vr(b);
  assert.ok((m1 - m2) * (v1 - v2) >= 0, '달이 밝으면 더 멀리');
  const s = T.mkUnit(0, 'sniper', 8, 8), k = T.mkUnit(0, 'tank', 12, 12); const vs = [vr(s), vr(k)];
  setup(T, { hour: 'day' }); const s2 = T.mkUnit(0, 'sniper', 8, 8), k2 = T.mkUnit(0, 'tank', 12, 12); assert.deepEqual(vs, [vr(s2), vr(k2)]);
});

test('총소리는 벽 너머로도 들려 대강의 자리를 기억한다', () => {
  const T = loadGame(); const G = setup(T); const memOf = F(T, 'memOf'), memFlash = F(T, 'memFlash');
  for (let c = 8; c < 12; c++) for (let r = 0; r < T.N; r++) G.map[r][c] = { t: 'bldg', f: 4, bhp: 99, bmax: 99, owner: null, obj: null, smoke: 0, blk: 1 };
  const a = T.mkUnit(0, 'rifle', 5, 4), e = T.mkUnit(1, 'mg', 5, 20); put(T, a, 4.5, 5.5); put(T, e, 20.5, 5.5); T.bump();
  assert.equal(T.seen(e, 0), false);
  e.firedT = G.time; memFlash(e);
  const m = memOf(0)[e.id]; assert.ok(m, '들은 자리를 기억'); assert.equal(m.how, 'hear');
  assert.ok(Math.hypot(m.x - 20.5, m.z - 5.5) < 3, '대강 맞는 자리');
});

test('멀리 보이는 적은 무슨 부대인지 모른다', () => {
  const T = loadGame(); const G = setup(T); const idf = F(T, 'identified');
  const a = T.mkUnit(0, 'rifle', 5, 4), e = T.mkUnit(1, 'rifle', 5, 15); put(T, a, 4.5, 5.5); put(T, e, 15.5, 5.5); e._movT = G.time; T.bump();
  assert.equal(T.seen(e, 0), true); assert.equal(idf(e, 0), false, '11칸: 보이지만 식별 불가');
  put(T, e, 9.5, 5.5); e._movT = G.time; T.bump(); assert.equal(idf(e, 0), true, '5칸: 식별');
});
