import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './harness.mjs';

const fn = (T, name) => T.__get(name);

test('관전 모드: 고른 세력 수만큼 AI 세력으로 시작하고 사람은 없다', () => {
  const T = loadGame();
  for (const n of [2, 3, 4]) {
    fn(T, 'specStart')({ n, size: 's', seed: 7 + n });
    const act = T.G.nats.filter(x => x.alive);
    assert.equal(act.length, n);
    assert.ok(act.every(x => x.ctrl === 'ai'));
    assert.equal(T.G.spec, true);
    assert.equal(T.G.fog, true, 'AI는 안개 속에서 싸운다');
    assert.equal(T.N, T.SIZES.s.c);
  }
});

test('관전 모드: 사람이 있는 판은 관전이 아니다', () => {
  const T = loadGame();
  T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 's', seed: 3 });
  assert.equal(T.G.spec, false);
});

test('관전 판은 저장하지 않아 사람이 하던 판의 저장을 덮어쓰지 않는다', () => {
  const T = loadGame();
  const store = new Map();
  T.__set('localStorage', { setItem: (k, v) => store.set(k, v), getItem: k => store.get(k) ?? null });
  T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 's', seed: 3 });
  fn(T, 'save')();
  const mine = store.get('triad-urban-save');
  assert.ok(mine);
  fn(T, 'specStart')({ n: 2, size: 's', seed: 4 });
  T.rtRun(65);
  fn(T, 'save')();
  assert.equal(store.get('triad-urban-save'), mine);
});

test('자동 연출은 최근에 총을 쏜 부대가 모인 곳을 고른다', () => {
  const T = loadGame();
  fn(T, 'specStart')({ n: 2, size: 's', seed: 11 });
  const G = T.G;
  G.time = 100;
  for (const u of G.units) u.firedT = -99;
  const a = G.units.find(u => u.nat === 0), b = G.units.find(u => u.nat === 1);
  b.x = a.x + 2; b.z = a.z;
  a.firedT = 99; b.firedT = 98.5;
  const h = fn(T, 'specHot')(null);
  assert.ok(h && (h.u === a || h.u === b));
  // 교전이 없으면 적과 가장 가까운 부대(전선)
  a.firedT = b.firedT = -99;
  const h2 = fn(T, 'specHot')(null);
  assert.ok(h2 && (h2.u === a || h2.u === b));
});

test('관전 판도 AI끼리 끝까지 진행된다', () => {
  const T = loadGame();
  fn(T, 'specStart')({ n: 3, size: 's', seed: 21 });
  T.G.maxR = 8;
  T.rtRun(8 * 30 + 5);
  assert.ok(T.G.over, '판이 끝난다');
  assert.equal(T.G.errs.length, 0, T.G.errs.join('\n'));
});
