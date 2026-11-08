import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './harness.mjs';

const fn = (T, name) => T.__get(name);
const start = (T, seed = 3) => fn(T, 'specStart')({ n: 2, size: 's', seed, win: 'lts' });

test('최후 생존: 관전 설정에서 고르면 승점으로는 끝나지 않는다', () => {
  const T = loadGame();
  start(T);
  assert.equal(T.G.win, 'lts');
  assert.ok(T.G.vpWin > 1e6);
  T.G.nats[0].vp = 999;
  assert.equal(fn(T, 'checkOver')(), null, '승점이 많아도 끝나지 않는다');
  fn(T, 'specStart')({ n: 2, size: 's', seed: 3 });
  assert.equal(T.G.win, 'vp', '기본은 승점');
});

test('최후 생존: 싸울 부대가 없고 다시 부를 점수도 없으면 탈락하고, 하나 남으면 끝난다', () => {
  const T = loadGame();
  start(T);
  const G = T.G, n = G.order[1];
  const fighter = u => !T.UT[u.type].fly && !T.UT[u.type].logi && T.UT[u.type].rng[1] > 0;
  G.units = G.units.filter(u => !(u.nat === n && fighter(u)));
  G.nats[n].cp = 0;
  fn(T, 'checkOver')();
  assert.equal(G.nats[n].alive, true, '잠깐은 기다린다');
  G.time += 5;
  const o = fn(T, 'checkOver')();
  assert.equal(G.nats[n].alive, false);
  assert.ok(o && o.win === G.order[0] && o.why === '최후 생존');
});

test('최후 생존: 증원 중단 뒤에는 증원을 못 부르고, 제한 시간이면 남은 전력으로 가린다', () => {
  const T = loadGame();
  start(T);
  const G = T.G;
  const n = G.order[0];
  const k = fn(T, 'deploySpots')(n, 'rifle')[0], r = Math.floor(k / 100), c = k % 100;
  G.nats[n].cp = 999;
  G.time = 480 + 1;
  assert.equal(fn(T, 'buy')(n, 'rifle', r, c), null);
  assert.equal(fn(T, 'canSupport')(n, 'smoke', r, c), false);
  G.time = 480 - 60;
  assert.ok(fn(T, 'buy')(n, 'rifle', r, c), '중단 전에는 부를 수 있다');
  G.time = 900 + 1;
  const o = fn(T, 'checkOver')();
  assert.ok(o && /남은 전력/.test(o.why));
});

test('최후 생존: AI끼리 한 판이 제한 시간 안에 오류 없이 끝난다', () => {
  const T = loadGame();
  start(T, 12);
  T.rtRun(900 + 5);
  assert.ok(T.G.over, '판이 끝난다');
  assert.equal(T.G.errs.length, 0, T.G.errs.join('\n'));
});

test('최후 생존: 증원이 끊긴 뒤 전력이 크게 밀린 세력은 45초 버티면 항복한다', () => {
  const T = loadGame();
  start(T);
  const G = T.G, [a, b] = G.order;
  const mine = G.units.filter(u => u.nat === b && T.UT[u.type].rng[1] > 0 && !T.UT[u.type].fly && !T.UT[u.type].logi);
  for (const u of mine.slice(1)) G.units.splice(G.units.indexOf(u), 1);
  mine[0].hp = 1;
  G.time = 481;
  assert.equal(fn(T, 'checkOver')(), null, '바로 항복하지는 않는다');
  G.time = 530;
  const o = fn(T, 'checkOver')();
  assert.equal(G.nats[b].alive, false);
  assert.ok(G.units.every(u => u.nat !== b), '남은 부대는 거둔다');
  assert.ok(o && o.win === a);
  assert.match(G.ltsOut[0].why, /항복/);
});
