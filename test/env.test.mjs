// 야간전과 날씨(04e-env) 테스트
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, seedRandom } from './harness.mjs';

const F = (T, n) => T.__get(n);
function setup(T, cfg = {}) {
  T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 's', seed: 3, fog: true, ...cfg });
  const G = T.G; G.units = []; G.props = []; G.covers = []; G.nats[1].ctrl = 'human';
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) G.map[r][c] = { t: 'road', owner: null, obj: null, smoke: 0 };
  T.bump(); return G;
}

test('시작 시각을 고를 수 있고, 밤은 해질녘에 서서히 온다', () => {
  const T = loadGame(); const nightK = F(T, 'nightK');
  setup(T, { hour: 'day' }); assert.equal(nightK(), 0);
  setup(T, { hour: 'night' }); assert.equal(nightK(), 1);
  const G = setup(T, { hour: 17, tflow: 'fast' }); G.time = 30 * 1.5; const k = nightK();
  assert.ok(k > 0 && k < 1, `18:30은 반쯤 어두움 (${k})`);
  G.time = 30 * 4; assert.equal(nightK(), 1);
});

test('시간 흐름 모드: 고정이면 멈추고, 느리게는 한 판에 3시간, 보통은 6시간', () => {
  const T = loadGame(); const dayH = F(T, 'dayH');
  let G = setup(T, { hour: 'dusk', tflow: 'fixed' }); G.time = 700; assert.equal(dayH(), 17);
  G = setup(T, { hour: 'dusk', tflow: 'slow' }); G.time = 720; assert.equal(Math.round(dayH()), 20);
  G = setup(T, { hour: 'dusk', tflow: 'normal' }); G.time = 720; assert.equal(Math.round(dayH()), 23);
  G = setup(T, { hour: 'dusk', tflow: 'real' }); G.time = 720; assert.ok(Math.abs(dayH() - 17.2) < .01);
  G = setup(T, { hour: 'dusk' }); G.time = 720; assert.equal(Math.round(dayH()), 23, '기본은 보통');
  delete G.tflow; assert.equal(Math.round(dayH()), 17, '옛 저장(모드 없음)은 예전처럼 30초에 1시간');
});

test('밤 시야: 야간투시경 정규군은 −1, 민병대 맨눈은 −2, 열상 드론은 그대로', () => {
  const T = loadGame(); const vr = F(T, 'visRange');
  let G = setup(T, { hour: 'day' });
  const a0 = T.mkUnit(0, 'rifle', 5, 5), m0 = T.mkUnit(1, 'rifle', 9, 9), d0 = T.mkUnit(0, 'drone', 12, 12);
  const day = [vr(a0), vr(m0), vr(d0)];
  G = setup(T, { hour: 'night' });
  const a = T.mkUnit(0, 'rifle', 5, 5), m = T.mkUnit(1, 'rifle', 9, 9), d = T.mkUnit(0, 'drone', 12, 12);
  assert.equal(vr(a), day[0] - 2);   // 시야 보정은 06y-range에서 두 배(1칸 ≈ 12m)
  assert.equal(vr(m), day[1] - 4);
  assert.equal(vr(d), day[2]);
});

test('조명탄: 밤에 안 보이던 적이 조명 아래 들어오면 보이고, 꺼지면 다시 숨는다', () => {
  const T = loadGame(); const G = setup(T, { hour: 'night', wx: 'clear' });
  const a = T.mkUnit(0, 'rifle', 5, 4), e = T.mkUnit(1, 'rifle', 5, 17);
  a.x = 4.5; a.z = 5.5; e.x = 17.1; e.z = 5.5; T.bump();
  assert.equal(T.seen(e, 0), false, '밤에는 12.6칸 거리 적이 안 보임');
  G.nats[0].cp = 20;
  assert.ok(T.canSupport(0, 'flare', 5, 17), '보이지 않는 곳에도 조명탄을 쏠 수 있음');
  assert.ok(T.support(0, 'flare', 5, 17));
  assert.equal(G.nats[0].supT || 0, 0, '조명탄은 포격 대기시간을 쓰지 않음');
  for (let i = 0; i < 50; i++) { T.rtTick(0.1); a.x = 4.5; a.z = 5.5; e.x = 17.1; e.z = 5.5; a.path = []; e.path = []; a.tgt = e.tgt = null; a.cd = e.cd = 99; }
  T.bump();
  assert.equal(T.seen(e, 0), true, '조명탄이 비추면 보임');
  const fine = T.visSet(0).fine, M = T.N * 3;
  assert.equal(fine[Math.floor(5.5 * 3) * M + Math.floor(17.1 * 3)], 1, '안개 지도에서도 밝은 곳이 드러남');
  G.time += 60; G.flares = G.flares.filter(f => G.time - f.t0 < 46); T.bump();
  assert.equal(T.seen(e, 0), false, '조명탄이 꺼지면 다시 안 보임');
});

test('밤에는 비추지 않은 표적을 덜 맞히고, 민병대가 더 못 맞힌다', () => {
  const T = loadGame();
  let G = setup(T, { hour: 'day' });
  let a = T.mkUnit(0, 'rifle', 5, 4), m = T.mkUnit(1, 'rifle', 7, 4), e = T.mkUnit(1, 'rifle', 5, 7);
  const pd = F(T, 'hitP')(a, e).p;
  G = setup(T, { hour: 'night' });
  a = T.mkUnit(0, 'rifle', 5, 4); m = T.mkUnit(1, 'rifle', 7, 4); e = T.mkUnit(1, 'rifle', 5, 7); const e2 = T.mkUnit(0, 'rifle', 7, 7);
  const pn = F(T, 'hitP')(a, e).p, pm = F(T, 'hitP')(m, e2).p;
  assert.ok(pn < pd && pm < pn, `${pd} > ${pn} > ${pm}`);
});

test('날씨: 폭우엔 드론을 띄울 수 없고 떠 있던 드론은 떨어진다. 고른 날씨는 바뀌지 않는다', () => {
  const T = loadGame(); const G = setup(T, { wx: 'storm' });
  G.nats[0].cp = 50;
  assert.equal(T.deploySpots(0, 'drone').length, 0);
  assert.equal(T.deploySpots(0, 'fpv').length, 0);
  assert.ok(T.deploySpots(0, 'rifle').length > 0);
  for (let i = 0; i < 6; i++) T.mkUnit(0, 'drone', 3 + i, 3);
  T.rtRun(90);
  assert.equal(G.wx, 'storm', '고른 날씨는 그대로');
  assert.ok(G.units.filter(u => u.type === 'drone').length < 6, '강풍에 드론이 떨어짐');
});

test('날씨는 몇 라운드씩 이어지며 바뀐다', () => {
  const T = loadGame(); seedRandom(T, 11); const G = setup(T, { wx: 'auto' }); G.wx = 'clear';
  G.tflow = 'fast';   // 기본(보통) 흐름이면 라운드 절반은 날씨 굴림을 건너뛰어 60라운드에 3번도 안 바뀌는 판이 약 10% 나왔다
  const seq = []; for (let i = 0; i < 60; i++) { F(T, 'wxRound')(); seq.push(G.wx); }
  const changes = seq.filter((w, i) => i && w !== seq[i - 1]).length;
  assert.ok(changes >= 3 && changes < 40, `바뀐 횟수 ${changes}`);
});

test('밤 AI: 사격을 받는데 적이 안 보이면 조명탄을 쏜다', () => {
  const T = loadGame(); const G = setup(T, { hour: 'night', wx: 'clear' }); G.nats[1].ctrl = 'ai';
  const a = T.mkUnit(1, 'rifle', 5, 4), e = T.mkUnit(0, 'rifle', 5, 18);
  a.x = 4.5; a.z = 5.5; e.x = 18.5; e.z = 5.5; a.supp = 1; G.nats[1].cp = 3; T.bump();
  assert.equal(T.seen(e, 1), false);
  assert.ok(F(T, 'aiFlare')(1), '조명탄 발사');
  const f = G.flares[0]; assert.ok(f.x > 4.5 && f.x < 18.5, '적 쪽 앞을 비춤');
  assert.equal(F(T, 'aiFlare')(1), false, '떠 있는 동안은 또 쏘지 않음');
});

test('밤 AI 대전이 오류 없이 끝난다', () => {
  const T = loadGame();
  T.newGame({ slots: ['ai', 'ai', 'none', 'none'], size: 's', seed: 11, hour: 'night', wx: 'auto', speed: 0, maxR: 10 });
  for (let i = 0; i < 20000 && !T.G.over; i++) T.rtTick(0.1);
  assert.ok(T.G.over, '끝남');
  assert.equal(T.G.errs.length, 0, String(T.G.errs[0]));
});
