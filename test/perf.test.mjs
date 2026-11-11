// 렉 줄이기(2026-11-11): 빨라진 계산이 예전 계산과 같은 답을 내는지
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, seedRandom } from './harness.mjs';

test('이동 격자 부분 갱신(장애물이 빠질 때)은 처음부터 다시 찍은 것과 같다', () => {
  const T = loadGame(); seedRandom(T, 7);
  T.newGame({ slots: ['ai', 'ai', 'ai', 'ai'], size: 's', diff: 'normal', fog: true, speed: 0, seed: 7 });
  const nb = T.__get('navBase'), stamp = T.__get('navStamp'), NAVB = T.__eval('NAVB');
  let calls = 0, bad = 0;
  T.__set('navBase', function (cls) {
    const r = nb(cls); const C = NAVB[cls]; const ref = C.terr.slice(); stamp(ref, C.W, C.list, cls); calls++;
    for (let i = 0; i < ref.length; i++) if (ref[i] !== r.cost[i]) { bad++; break; }
    return r;
  });
  // 차를 몇 대 밟아 없앤다(장애물이 빠지는 경우)
  for (let i = 0; i < 1200 && !T.G.over; i++) {
    T.rtTick(0.1);
    if (i % 200 === 100) { const cars = T.G.props.filter(p => p.k === 'car' && !p.crush && !p.dead); if (cars.length) { cars[0].crush = true; T.G.navV = T.G.navV || 0; T.G.props.push({ k: 'bin', x: cars[0].x, z: cars[0].z, ry: 0 }); } }
  }
  assert.ok(calls > 5, 'navBase가 여러 번 불렸다');
  assert.equal(bad, 0);
});

test('먼 곳 지형만 바뀌면 시야를 다시 쓰고, 다시 계산해도 같은 결과다', () => {
  const T = loadGame(); seedRandom(T, 5);
  T.newGame({ slots: ['ai', 'ai', 'none', 'none'], size: 's', diff: 'normal', fog: true, speed: 0, seed: 5 });
  for (let i = 0; i < 300; i++) T.rtTick(0.1);
  const G = T.G, fov = T.__get('unitFov');
  const u = G.units.find(x => !T.UT[x.type].fly);
  const a = [...fov(u)];
  // 멀리 있는 건물 하나를 부순다(지도 지문은 바뀐다)
  let far = null;
  for (let r = 0; r < T.N && !far; r++) for (let c = 0; c < T.N; c++) { const x = G.map[r][c]; if (x.t === 'bldg' && Math.max(Math.abs(r - u.r), Math.abs(c - u.c)) > 15) { far = x; break; } }
  if (far) { far.bhp = 0; T.bump(); }
  const kept = u._fov;
  const b = fov(u);
  assert.equal(u._fov, kept, '시야 계산을 다시 쓴다');
  assert.deepEqual([...b], a);
  u._fov = null;
  assert.deepEqual([...fov(u)], a, '처음부터 다시 계산해도 같다');
});
