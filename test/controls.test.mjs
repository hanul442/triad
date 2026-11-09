import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, seedRandom } from './harness.mjs';

// 화면 없이 PC·휴대폰 조작 함수만 확인한다: $()·toast·render는 비워 둔다.
function start(auto) {
  const T = loadGame(); seedRandom(T, 3);
  T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 's', seed: 3, fog: false, speed: 0, auto }); T.rtRun(1);
  T.__set('document', { querySelector: () => ({ hidden: true }), getElementById: () => null });
  for (const f of ['toast', 'render', 'sfx', 'sndRadio', 'v3Ping', 'L']) T.__set(f, () => {});
  return T;
}
const mine = T => T.G.units.filter(u => u.nat === 0);
const UI = T => T.__eval('UI');
const sel = T => { const ui = UI(T); return [ui.sel, ...(ui.group || [])].filter(Boolean); };

test('PC: Ctrl+숫자로 번호를 붙이고 숫자로 다시 고른다', () => {
  const T = start(false); const us = mine(T).slice(0, 3);
  T.__eval('select')(us[0]); UI(T).group = us.slice(1);
  T.__eval('pcGroupSet')(4);
  T.__eval('clearSel')(); assert.equal(sel(T).length, 0);
  T.__eval('pcGroupGet')(4);
  assert.equal(JSON.stringify(sel(T).map(u => u.id).sort()), JSON.stringify(us.map(u => u.id).sort()));
});

test('PC: 오른쪽 클릭은 고른 부대를 그곳으로 보낸다, 아무것도 안 골랐으면 아무 일도 없다', () => {
  const T = start(false); const G = T.G; const u = mine(T).find(x => x.type === 'rifle');
  const V3 = T.__eval('V3'); const k = T.__eval('key');
  const r = Math.floor(u.z) - 3, c = Math.floor(u.x);
  V3.pickId = null; V3.pickPt = [c + .5, r + .5];
  T.__eval('v3Order')(k(r, c));
  assert.equal(G.units.filter(x => x.nat === 0 && x.man != null).length, 0, '선택 없으면 명령 없음');
  T.__eval('select')(u);
  V3.pickId = null; V3.pickPt = [c + .5, r + .5];
  T.__eval('v3Order')(k(r, c));
  T.rtRun(4);
  assert.ok(u.path && u.path.length || Math.hypot(u.x - (c + .5), u.z - (r + .5)) < 2.5, '이동 명령');
});

test('PC: 배치 고르기 중 오른쪽 클릭은 취소', () => {
  const T = start(false); const ui = UI(T);
  ui.phase = 'buy'; ui.buyT = 'rifle';
  T.__eval('v3Order')(0);
  assert.equal(ui.phase, null);
});

test('PC: 부관 지휘에서 중대를 고르고 오른쪽 클릭하면 그곳이 목표', () => {
  const T = start(true); const n = 0; const G = T.G;
  const co = G.org[n].co[0];
  T.__eval('orgSelect')({ k: 'co', id: co.id });
  const V3 = T.__eval('V3'); V3.pickId = null; V3.pickPt = [10.5, 10.5];
  T.__eval('v3Order')(T.__eval('key')(10, 10));
  assert.ok(co.intent, '중대 목표');
  assert.equal(co.intent.k, 'atk');
});
