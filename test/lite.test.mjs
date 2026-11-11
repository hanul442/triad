// 저사양 모드: 그림만 가볍게 하고 규칙·결과는 그대로
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, seedRandom } from './harness.mjs';

const run = lite => {
  const T = loadGame(); seedRandom(T, 7);
  T.__eval(`LITE.on=${lite}`);
  T.newGame({ slots: ['ai', 'ai', 'none', 'none'], size: 's', diff: 'normal', fog: true, speed: 0, seed: 21 });
  for (let i = 0; i < 600 && !T.G.over; i++) T.rtTick(0.1);
  return JSON.stringify(T.G.units.map(u => [u.id, u.type, u.hp, Math.round(u.x * 100), Math.round(u.z * 100), !!u.dead]));
};

test('저사양 모드를 켜도 같은 판은 똑같이 흘러간다', () => {
  assert.equal(run(true), run(false));
});

test('저사양 모드: 설정 함수는 화면 없이도 안전하고 설명서에 적혀 있다', () => {
  const T = loadGame();
  T.__eval(`liteApply();LITE.on=true;liteApply();`);
  assert.equal(T.__eval('liteOn()'), true);
  const h = T.__eval('manualHtml()');
  assert.match(h, /저사양 모드/);
  assert.match(h, /L 저사양/);
});
