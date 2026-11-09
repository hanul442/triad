// 병사 모습: 분대 안 역할별 차림, 자세 이름(다른 코드가 m.pose로 고른다)
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './harness.mjs';

test('소총분대는 분대장·위생병·유탄수 차림이 따로 있고, 다른 분대는 편성대로', () => {
  const T = loadGame();
  const k = T.__eval('v3SolKind');
  assert.equal(k('rifle', 0, 9), 'lead');
  assert.equal(k('rifle', 1, 9), 'medic');
  assert.equal(k('rifle', 3, 9), 'gl');
  assert.equal(k('rifle', 2, 9), 'mg');
  assert.equal(k('rifle', 4, 9), 'at');
  assert.equal(k('sniper', 0, 2), 'sniper');
  assert.equal(k('mg', 1, 6), 'rifle');
});

test('분대 행동 쪽이 쓰는 자세 이름이 모두 있다', () => {
  const T = loadGame();
  const P = T.__eval('SOL_POSE');
  for (const p of ['move', 'aim', 'kneel', 'prone', 'reload', 'signal', 'point', 'leanL', 'leanR', 'crawl', 'crawl2', 'carry', 'down', 'dead']) assert.ok(P[p], p);
});
