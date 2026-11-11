import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './harness.mjs';
import { readUpdates } from '../build.mjs';

test('업데이트 로그: src/updates 글이 최신 날짜부터 게임에 들어간다', () => {
  const U = readUpdates();
  assert.ok(U.length > 30, '지난 업데이트가 채워져 있다');
  for (const u of U) {
    assert.match(u.d, /^\d{4}-\d\d-\d\d$/);
    assert.ok(u.t.length > 0);
  }
  for (let i = 1; i < U.length; i++) assert.ok(U[i - 1].d >= U[i].d, '최신 날짜가 위');
  const T = loadGame();
  const h = T.__eval('updatesHtml()');
  assert.ok(h.includes(U[0].t.replace(/\s*\(#[^)]*\)$/, '')), '맨 위 업데이트가 보인다');
  assert.ok(h.includes('2026년 11월 7일'), '날짜를 한국어로');
  assert.ok(T.__eval('manualHtml()').includes('data-updbtn="open"'), '설명서에서 업데이트 로그로 간다');
});
