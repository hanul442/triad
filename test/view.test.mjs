// 화면과 규칙이 맞는가: 박공지붕, 계단실, 소품 시야, 병사별 사격
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './harness.mjs';

const ev = (T, name) => T.__eval(name);
const start = (seed = 11) => { const T = loadGame(); T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 'm', seed, fog: false }); T.G.nats[T.G.order[1]].ctrl = 'human'; return T; };   // 상대 AI가 끼어들지 않게
const findTile = (T, ok) => { for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) if (ok(T.G.map[r][c], r, c)) return [r, c]; return null; };

test('박공지붕 주택은 옥상에 오를 수 없다: 맨 위 실내층까지만', () => {
  const T = start();
  const p = findTile(T, x => ev(T, 'gableRoof')(x));
  assert.ok(p, '주택 칸이 있어야 한다');
  const [r, c] = p, x = T.G.map[r][c];
  assert.equal(ev(T, 'topFl')(x), x.f - 1);
  assert.equal(ev(T, 'roofFl')(x), x.f);
  const u = T.mkUnit(T.G.order[0], 'rifle', r, c); u.x = c + .5; u.z = r + .5;
  for (let i = 0; i < 200; i++) T.rtTick(.1);
  assert.equal(u.fl, x.f - 1, '맨 위 실내층에서 멈춘다');
  assert.equal(ev(T, 'onRoof')(u), false);
  // 평지붕 건물은 옥상까지 오른다
  const q = findTile(T, y => y.t === 'bldg' && y.f >= 3 && !ev(T, 'gableRoof')(y));
  const v = T.mkUnit(T.G.order[0], 'rifle', q[0], q[1]); v.x = q[1] + .5; v.z = q[0] + .5;
  for (let i = 0; i < 400; i++) T.rtTick(.1);
  assert.equal(ev(T, 'onRoof')(v), true);
});

test('계단실은 칸 가운데에 있고, 계단 위 부대는 건물 밖에서 보이지도 맞지도 않는다', () => {
  const T = start();
  const [r, c] = findTile(T, (x, r, c) => x.t === 'bldg' && x.f >= 3 && T.G.map[r + 2]?.[c]?.t === 'road');
  const [sx, sz] = ev(T, 'stairPos')(r, c);
  assert.ok(Math.abs(sx - (c + .5)) < .15 && Math.abs(sz - (r + .5)) < .15, '계단은 창에서 먼 가운데');
  const n0 = T.G.order[0], n1 = T.G.order[1];
  const u = T.mkUnit(n0, 'rifle', r, c); u.x = sx; u.z = sz; u.fl = 1; u.flK = T.key(r, c); u.climb = 1; u.onSt = 1;
  const e = T.mkUnit(n1, 'rifle', r + 2, c); e.x = c + .5; e.z = r + 2.5;
  assert.equal(ev(T, 'stairHid')(u, e), true);
  assert.equal(T.canHit(e, u), false);
  // 같은 건물 안의 적에게는 보인다
  const f = T.mkUnit(n1, 'rifle', r, c); f.x = c + .3; f.z = r + .3;
  assert.equal(ev(T, 'stairHid')(u, f), false);
});

test('세워 둔 차는 땅에 선 사람 사이 시야를 가리고, 차에 붙은 쪽은 내다본다', () => {
  const T = start();
  const losPt = ev(T, 'losPt');
  const [r, c] = findTile(T, (x, r, c) => [0, 1, 2, 3, 4, 5, 6].every(i => T.G.map[r][c + i]?.t === 'road'));
  T.G.covers = [{ x: c + 3.5, z: r + .5, r: .2, kind: 'car', h: .13 }];
  assert.equal(losPt(c + .5, r + .5, .5, c + 6.5, r + .5, .5), false, '차 너머는 안 보인다');
  assert.equal(losPt(c + .5, r + .5, 3, c + 6.5, r + .5, .5), true, '높은 곳에서는 넘겨 본다');
  assert.equal(losPt(c + 3.2, r + .5, .5, c + 6.5, r + .5, .5), true, '차에 붙은 쪽은 내다본다');
  T.G.covers = [{ x: c + 3.5, z: r + .5, r: .14, kind: 'barrier', h: .07 }];
  assert.equal(losPt(c + .5, r + .5, .5, c + 6.5, r + .5, .5), true, '낮은 방호벽은 시야를 막지 않는다');
});

test('분대 사격: 표적이 보이는 병사만 쏘고, 아무도 안 보이면 한 명이 보이는 자리로 간다', () => {
  const T = start();
  const [r, c] = findTile(T, (x, r, c) => [0, 1, 2, 3, 4].every(i => T.G.map[r][c + i]?.t === 'road'));
  const a = T.mkUnit(T.G.order[0], 'rifle', r, c); a.x = c + .5; a.z = r + .5;
  const d = T.mkUnit(T.G.order[1], 'rifle', r, c + 4); d.x = c + 4.5; d.z = r + .5;
  a.cd = d.cd = 99;   // 준비 틱에 서로 쏘아 병사가 다치지 않게
  T.rtTick(.1);
  // 병사 한 명만 빼고 모두 벽 뒤(표적과 사이에 차)로
  T.G.covers = [{ x: c + 2.5, z: r + .5, r: .2, kind: 'car', h: .13 }];
  a._men.forEach(m => { m.x = c + .5; m.z = r + .5; m.rl = 0; m.lag = 0; m.mag = 5; m.pr = 0; m.crawl = 0; });
  a._men[3].z = r + .95;   // 이 병사만 차 옆으로 비켜 보인다
  T.rtShoot(a, d);
  assert.deepEqual([...a._sh], [3]);
  // 아무도 안 보이면 쏘지 않는다
  a._men[3].z = r + .5;
  const hp = d.hp; const r0 = T.rtShoot(a, d);
  assert.equal(r0, 0); assert.equal(d.hp, hp); assert.deepEqual([...a._sh], []);
  assert.ok(a._men.some(m => m.sp && Math.abs(m.sp[0] - a.x) < 1e-9 && Math.abs(m.sp[1] - a.z) < 1e-9), '한 명이 분대 위치로 간다');
});
