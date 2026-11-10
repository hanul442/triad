// 분대 전투 동작(05z-drill): 자세·수신호. 게임 결과는 바꾸지 않는다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, seedRandom } from './harness.mjs';

const F = (T, n) => T.__get(n);
function setup(T) {
  T.newGame({ slots: ['human', 'human', 'none', 'none'], size: 's', seed: 3, fog: false });
  T.G.units = []; T.G.props = []; T.G.covers = [];
  const G = T.G;
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) G.map[r][c] = { t: 'road', owner: null, obj: null, smoke: 0 };
  T.bump(); return G;
}
const put = (T, n, ty, x, z) => { const u = T.mkUnit(n, ty, Math.floor(z), Math.floor(x)); u.x = x; u.z = z; u.cd = 99; return u; };
// 다른 세력이 증원으로 들어오면(사거리가 길어 멀리서도 쏜다) 자세 검사가 흔들리니 우리 분대만 남긴다
const run = (T, s) => { for (let i = 0; i < s * 10; i++) { T.rtTick(0.1); T.G.units = T.G.units.filter(u => u.nat === 0); } };

test('전투 동작은 게임 결과를 바꾸지 않는다(난수·위치 그대로)', () => {
  const snap = on => {
    const T = loadGame(); seedRandom(T, 11); if (!on) T.__set('drillTick', () => {});
    T.__set('cvPose', () => {});   // 은엄폐(05zc)는 자세를 보고 일부러 엎드림을 정하므로 여기서는 끈다(개인호가 생기면 낮은 엄폐 자세가 갈린다)
    T.newGame({ slots: ['ai', 'ai', 'none', 'none'], size: 's', fog: true, speed: 0, seed: 11 });
    for (let i = 0; i < 900 && !T.G.over; i++) T.rtTick(0.1);
    return JSON.stringify(T.G.units.map(u => [u.id, u.x, u.z, u.hp, (u._men || []).map(m => [m.x, m.z, m.dead])]));
  };
  assert.equal(snap(true), snap(false));
});

test('맨땅에서 총격을 받으면 엎드리고, 분대장은 적 쪽을 가리킨다', () => {
  const T = loadGame(); const G = setup(T);
  const u = put(T, 0, 'rifle', 10.5, 10.5); run(T, 3);
  const L = u._men[0];
  u._hitT = G.time; u._thr = [14.5, 10.5, G.time]; T.rtTick(0.1);
  assert.equal(L.pose, 'point', '분대장이 가리킨다');
  assert.ok(Math.abs(L.f) < .3, `동쪽(적)을 본다: ${L.f}`);
  const prone = u._men.filter(m => m !== L && m.pose === 'prone').length;
  assert.ok(prone >= u._men.length - 3, `대부분 엎드림: ${prone}`);
});

test('조용히 멈춘 분대는 한쪽 무릎을 꿇고 경계하며, 병사마다 보는 방향이 다르다', () => {
  const T = loadGame(); setup(T);
  const u = put(T, 0, 'rifle', 10.5, 10.5); run(T, 6);
  const k = u._men.filter(m => m.pose === 'kneel').length;
  assert.ok(k >= u._men.length - 1, `무릎: ${k}`);
  const dirs = new Set(u._men.map(m => m.f.toFixed(1)));
  assert.ok(dirs.size >= 4, `방향 ${dirs.size}가지`);
});

test('건물 모서리에서 쏘는 병사는 몸을 옆으로 내밀고, 낮은 엄폐 뒤에서는 무릎쏴', () => {
  const T = loadGame(); const G = setup(T);
  const u = put(T, 0, 'rifle', 10.5, 10.5); run(T, 1);
  // 동쪽 칸에 건물: 그 칸의 북쪽 끝에 붙은 병사는 모서리, 남쪽 넓은 벽 앞은 벽 뒤
  G.map[10][11] = { t: 'bldg', owner: null, obj: null, smoke: 0, f: 2, bhp: 10, bmax: 10, blk: 77 }; T.bump();
  const m = u._men[3];
  const drCover = F(T, 'drCover');
  m.sp = [10.95, 10.2]; const a = drCover(u, m, 0);
  assert.equal(a.k, 'corner', JSON.stringify(a));
  assert.equal(a.s, -1, '건물이 오른쪽(남쪽)에 있으니 왼쪽으로 내민다');
  m.sp = [10.95, 10.5]; assert.equal(drCover(u, m, 0).k, 'wall');
  m.sp = [10.2, 10.5]; assert.equal(drCover(u, m, 0).k, 'open');
});

test('재장전하는 병사는 무릎 꿇고 탄창을 간다', () => {
  const T = loadGame(); setup(T);
  const u = put(T, 0, 'rifle', 10.5, 10.5); run(T, 3);
  const m = u._men[4]; m.rl = 2; m.pr = 0; T.rtTick(0.1);
  assert.equal(m.pose, 'reload');
});

test('이동 명령에 분대장이 "앞으로" 신호를 하고, 멈추면 "정지" 신호를 한다', () => {
  const T = loadGame(); seedRandom(T, 4); setup(T);
  const u = put(T, 0, 'rifle', 10.5, 10.5); run(T, 8);
  T.orderMoveTo(u, 13.5, 10.5); T.rtTick(0.1);
  assert.equal(u._men[0].pose, 'signal', '출발 신호');
  let halt = false;
  for (let i = 0; i < 300 && !halt; i++) { T.rtTick(0.1); T.G.units = T.G.units.filter(u => u.nat === 0); halt = !u.path.length && u._men.dr.lhalt != null && u._men.find(m => m.pose === 'signal') != null; }
  assert.ok(halt, `정지 신호 (path ${u.path.length}, lhalt ${u._men.dr.lhalt})`);
});

test('부상자를 끄는 병사는 숙인 자세, 쓰러진 병사는 누운 자세', () => {
  const T = loadGame(); setup(T);
  const u = put(T, 0, 'rifle', 10.5, 10.5); run(T, 2);
  const c = u._men[5], d = u._men[6];
  u.ws[5].s = 'hw'; F(T, 'manFlags')(u, c);
  d.task = { k: 'drag', t: 5, ph: 'pull', x: 10.2, z: 10.5 };
  F(T, 'drillTick')(u, .1);
  assert.equal(c.pose, 'down'); assert.equal(d.pose, 'carry');
});

test('박격포 사수는 위협을 받아도 포 옆에 무릎을 꿇는다', () => {
  const T = loadGame(); const G = setup(T);
  const u = put(T, 0, 'mortar', 10.5, 10.5); u.hold = 1; u.path = []; run(T, 3); u.path = [];   // 제자리(스스로 진지를 옮기지 않게)
  u._hitT = G.time; u._thr = [14.5, 10.5, G.time]; run(T, 2); u._hitT = G.time; T.rtTick(0.1);
  assert.ok(u._men.slice(1).every(m => m.pose === 'kneel' || m.pose === 'prone' && m.pr > 0), u._men.map(m => m.pose).join());
});
