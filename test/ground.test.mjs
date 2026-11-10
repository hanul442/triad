// 차량이 땅·다리 속에 묻히지 않는가 (07zv-vehicles 재질의 지형 훅, 07zv3-ground 바닥 높이)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadGame } from './harness.mjs';

const ev = (T, name) => T.__eval(name);

test('자체 셰이더를 쓰는 재질은 지형 높이 훅을 먼저 부른다 (안 그러면 언덕 속에 묻힌다)', () => {
  const src = readFileSync(new URL('../src/js/07zv-vehicles.js', import.meta.url), 'utf8');
  const i = src.indexOf('m.onBeforeCompile=');
  assert.ok(i > 0);
  assert.match(src.slice(i, i + 200), /Material\.prototype\.onBeforeCompile/);
});

test('다리 위 차량과 보병은 상판 윗면에, 잔해 더미 위 차량은 더미 위에 선다', () => {
  const T = loadGame();
  T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 'm', seed: 11, layout: 'river', fog: false });
  const M = T.G.map; let br = null;
  for (let r = 0; r < T.N && !br; r++) for (let c = 0; c < T.N; c++) if (M[r][c].br === 2 && M[r][c].t !== 'water') { br = [r, c]; break; }
  assert.ok(br, '다리 칸');
  const deck = ev(T, 'gdDeck')(br[0], br[1]);
  assert.ok(deck >= .07, '상판 높이');
  const v = { type: 'ifv', r: br[0], c: br[1], x: br[1] + .5, z: br[0] + .5, hd: 0 };
  assert.ok(ev(T, 'gdVehLift')(v) >= deck);
  // 잔해 더미: 가운데가 가장 높고 바깥은 0
  T.G.debris = [{ r: 5, c: 5, dr: 1, dc: 0, d: .4, s: 1, x: 5.5, z: 6.7, ry: 0, hl: .42, hw: .2 }];
  const h = ev(T, 'gdDebH');
  assert.ok(h(5.5, 6.7) > .04, '더미 위');
  assert.equal(h(5.5, 7.5), 0, '더미 밖');
});
