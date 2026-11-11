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

test('저사양 모드: 후처리만 건너뛰고 병사 묶음 그리기(07z-inst)는 거치지 않으면 안 된다', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../src/js/07z-lite.js', import.meta.url), 'utf8');
  // GRADE.raw를 바로 부르면 07z-inst 겹을 건너뛰어 병사가 하나도 안 그려졌다(2026-11-11)
  assert.doesNotMatch(src, /GRADE\.raw\(/);
  assert.match(src, /GRADE\.skip=true/);
  assert.match(readFileSync(new URL('../src/js/07z-grade.js', import.meta.url), 'utf8'), /GRADE\.skip/);
});
