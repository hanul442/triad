import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, seedRandom } from './harness.mjs';

// 관전 자동 연출 감독(08v2-direct): 시간은 가짜 시계로 돌린다
function setup(seed = 11) {
  const T = loadGame();
  seedRandom(T, seed);
  let now = 100000;
  T.__set('performance', { now: () => now });
  T.__get('specStart')({ n: 2, size: 's', seed });
  T.__eval('V3.cs={x:10,z:10,yaw:0,pitch:1.1,d:14,gx:10,gz:10,gyaw:0,gd:14}');
  const f = n => T.__get(n);
  const DIR = T.__eval('DIR');
  const tick = ms => { now += ms; f('specCam')(now); };
  const clock = { get now() { return now; }, set now(v) { now = v; } };
  return { T, f, DIR, tick, clock };
}
const far = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

test('감독: 큰 사건(차량 격파)이 난 곳이 잔 총격보다 먼저다', () => {
  const { T, f, clock } = setup();
  const G = T.G;
  const a = G.units.find(u => u.nat === 0), b = G.units.find(u => u.nat === 1);
  for (let i = 0; i < 6; i++) f('dirEv')(a.x, a.z, .35, 'fire');
  f('dirEv')(b.x, b.z, 7, 'killV');
  const s = f('dirStories')(clock.now);
  assert.ok(s.length >= 1);
  assert.ok(Math.hypot(s[0].x - b.x, s[0].z - b.z) < 1, '격파 자리가 1순위');
  assert.equal(s[0].k, 'killV');
});

test('감독: 거점 주인이 바뀌면 거점 샷으로 컷하고 중계 자막에 거점·세력을 쓴다', () => {
  const { T, f, DIR, tick } = setup();
  const G = T.G;
  tick(16);
  const o = G.objs[0];
  G.map[o.r][o.c].owner = 1;
  tick(500);
  tick(2600);   // 다른 곳을 보고 있었다면 2초는 보여 준 뒤 끊는다
  tick(500);
  assert.equal(DIR.shot.k, 'obj');
  assert.equal(DIR.shot.oi, 0);
  assert.equal(DIR.cap.tx[0], '거점 점령');
  assert.ok(DIR.cap.tx[1].includes(o.name), DIR.cap.tx[1]);
  assert.ok(DIR.cap.tx[1].includes(T.__eval('NATS')[1].full), DIR.cap.tx[1]);
});

test('감독: 한 교전을 오래 볼 때 샷을 바꿔 가며 최소 길이는 지킨다', () => {
  const { T, f, DIR, tick } = setup(5);
  const G = T.G;
  // 두 적 부대를 붙여 놓고 계속 총을 쏘게 한다
  const a = G.units.find(u => u.nat === 0 && !T.UT[u.type].fly), b = G.units.find(u => u.nat === 1 && !T.UT[u.type].fly);
  b.x = a.x + 2.5; b.z = a.z; b.r = a.r; b.c = Math.min(T.N - 1, a.c + 2);
  a.tgt = b.id; b.tgt = a.id;
  const shots = [];
  let last = null;
  for (let i = 0; i < 600; i++) {   // 60초
    G.time = 100 + i * .1; a.firedT = G.time; b.firedT = G.time;
    if (i % 3 === 0) { f('dirEv')(a.x, a.z, .35, 'fire', { u: a.id, t: b.id }); f('dirEv')(b.x, b.z, .35, 'fire', { u: b.id, t: a.id }); }
    tick(100);
    if (DIR.shot !== last) { last = DIR.shot; shots.push({ k: last.k, t0: last.t0 }); }
  }
  const SH = T.__eval('DIR_SHOT');
  assert.ok(shots.length >= 4, `샷이 바뀐다 (${shots.map(s => s.k).join(',')})`);
  for (let i = 1; i < shots.length; i++) {
    const len = shots[i].t0 - shots[i - 1].t0;
    assert.ok(len >= SH[shots[i - 1].k].min - 1, `${shots[i - 1].k} 샷이 ${len}ms 만에 끊겼다`);
    assert.notEqual(shots[i].k, shots[i - 1].k, '같은 샷을 잇달아 쓰지 않는다');
  }
  assert.ok(new Set(shots.map(s => s.k)).size >= 3, '샷 종류가 셋 이상');
});

test('감독: 카메라는 건물 속·땅 밑에 들어가지 않고, 피사체를 가리지 않는 방향을 찾는다', () => {
  const { T, f } = setup(7);
  const G = T.G;
  T.rtRun(30);
  let n = 0, clear = 0;
  for (const u of G.units) {
    if (T.UT[u.type].fly) continue;
    for (let k = 0; k < 8; k++) {
      for (const [pitch, d] of [[.11, 3.6], [.2, 5], [.6, 13]]) {
        const P = { x: u.x, z: u.z, ly: .08, yaw: k * Math.PI / 4, pitch, d };
        const Q = f('dirClear')(P);
        const C = f('dirCamAt')(Q);
        n++;
        assert.ok(f('dirTopR')(C.x, C.z, .4) <= C.y - .1 || f('dirBlock')(Q) > 0, '건물 속 카메라는 막힘으로 센다');
        if (f('dirBlock')(Q) === 0) clear++;
      }
    }
  }
  assert.ok(clear / n > .95, `깨끗한 구도 비율 ${(clear / n).toFixed(3)}`);
  // 일부러 건물 바로 뒤에 카메라를 둔 구도는 막힘으로 본다
  let bl = null;
  for (let r = 1; r < T.N - 1 && !bl; r++) for (let c = 1; c < T.N - 1; c++) if (G.map[r][c].t === 'bldg' && G.map[r][c].f >= 3 && G.map[r][c + 1].t !== 'bldg') { bl = [r, c]; break; }
  assert.ok(bl, '높은 건물');
  const P = { x: bl[1] + 1.6, z: bl[0] + .5, ly: .08, yaw: -Math.PI / 2, pitch: .15, d: 3 };   // 카메라가 서쪽 건물 너머
  assert.ok(f('dirBlock')(P) > 0);
  const Q = f('dirClear')(P);
  assert.equal(f('dirBlock')(Q), 0);
});

test('감독: 자동 연출을 끄면 원래 기울기로 돌아가고 자막을 거둔다', () => {
  const { T, DIR, tick } = setup();
  tick(16); tick(100);
  assert.ok(DIR.on && DIR.shot);
  T.__eval('UI.specAuto=false');
  tick(16);
  assert.equal(DIR.on, false);
  assert.equal(T.__eval('V3.cs.pitch'), 1.1);
  assert.equal(T.__eval('V3.cs.ly'), 0);
});

test('감독: 공습이 오면 접근 방향 쪽에서 낮게 잡는다', () => {
  const { T, DIR, tick, clock } = setup();
  tick(16);
  T.G.time = 50;
  T.__eval('UI.specStrike={x:10,z:10,hx:1,hz:0,imp:52,until:58,id:1}');
  tick(16); tick(16);
  assert.equal(DIR.shot.k, 'ext');
  assert.ok(Math.abs(DIR.shot.yaw - Math.PI / 2) < 1e-6, '폭격기가 날아오는 앞쪽에 카메라');
  assert.equal(DIR.cap.tx[0], '공습');
  T.G.time = 60;
  tick(16); tick(500);
  assert.notEqual(DIR.shot && DIR.shot.k, 'ext', '공습이 끝나면 감독이 다시 고른다');
  void clock;
});
