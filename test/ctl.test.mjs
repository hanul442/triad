import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, seedRandom } from './harness.mjs';

// 조작 다듬기(09h-ctl): Tab 넘기기, 작은 지도 오른쪽 클릭 명령
function start() {
  const T = loadGame(); seedRandom(T, 5);
  T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 's', seed: 5, fog: false, speed: 0, auto: false }); T.rtRun(1);
  T.__set('document', { querySelector: () => ({ hidden: true }), getElementById: () => null });
  for (const f of ['toast', 'render', 'sfx', 'sndRadio', 'v3Ping', 'L']) T.__set(f, () => {});
  return T;
}
const UI = T => T.__eval('UI');

test('Tab: 아군을 하나씩 넘기고 끝에서 처음으로 돈다', () => {
  const T = start(); const n = T.G.viewer;
  const seen = new Set();
  const cnt = T.G.units.filter(u => u.nat === n).length;
  for (let i = 0; i < cnt + 2; i++) { T.__eval('ctlNext')(1); const s = UI(T).sel; assert.ok(s && s.nat === n, '아군을 고름'); seen.add(s.id); }
  assert.ok(seen.size >= 1);
  const a = UI(T).sel.id; T.__eval('ctlNext')(1); T.__eval('ctlNext')(-1);
  assert.equal(UI(T).sel.id, a, 'Shift+Tab은 거꾸로');
});

test('작은 지도 오른쪽 클릭: 고른 부대를 그곳으로, 아무것도 안 골랐으면 명령 없음', () => {
  const T = start(); const G = T.G; const u = G.units.find(x => x.nat === 0 && x.type === 'rifle');
  const x = u.x, z = Math.max(1, u.z - 4);
  assert.equal(T.__eval('ctlMmOrder')(x, z), false, '선택 없음');
  T.__eval('select')(u);
  assert.equal(T.__eval('ctlMmOrder')(x, z), true);
  T.rtRun(4);
  assert.ok(u.man != null || (u.path && u.path.length) || Math.hypot(u.x - x, u.z - z) < 2.5, '이동 명령을 받음');
});

test('단축키 표: 키마다 버튼이 있고 겹치는 게임 키가 없다', () => {
  const T = start(); const K = T.__eval('CTL_KEYS');
  const used = new Set('QERFWASDCNPLKHVM'.split(''));
  for (const [id, k] of K) { assert.match(id, /^ab-/); assert.ok(!used.has(k), `${k}는 다른 키와 겹침`); }
});
