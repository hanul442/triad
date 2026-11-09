import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './harness.mjs';

test('설명서: 모든 병종·화력 지원이 실리고, 숫자는 규칙 표에서 읽는다', () => {
  const T = loadGame();
  const h = T.__eval('manualHtml()');
  const UT = T.UT, SUP = T.SUP;
  for (const t of T.TYPES) {
    assert.ok(h.includes(`<b>${UT[t].n}</b>`), `병종 빠짐: ${t}`);
    assert.ok(T.__eval(`!!MAN_AUTO[${JSON.stringify(t)}]`), `배치 후 하는 일 설명 빠짐: ${t}`);
  }
  for (const k in SUP) assert.ok(h.includes(SUP[k].n), `화력 지원 빠짐: ${k}`);
  const D = T.__eval('DEMO'), B = T.__eval('BRG');
  assert.ok(h.includes(`공병 ${D.plant}초, 소총분대 ${D.plantR}초`), '건물 폭약 설치 시간');
  assert.ok(h.includes(`공병 ${B.plant}초, 소총분대 ${B.plantR}초`), '다리 폭약 설치 시간');
  assert.ok(h.includes(`${D.fuse}초 뒤 저절로 터집니다`), '기폭 시간');
  // 점령 초: 소총분대 12초, 점령 못 하는 병종은 그렇게 적힌다
  assert.ok(h.includes('3점 · 점령 12초'));
  assert.ok(/<b>보급 트럭<\/b><span>[^<]*점령 못 함/.test(h));
});

test('점령: 보병전투차·열압력팀·자주대공포도 비슷한 병종만큼 점령한다', () => {
  const T = loadGame();
  const UT = T.UT;
  assert.equal(UT.bmp.cap, UT.ifv.cap);
  assert.equal(UT.tb.cap, UT.at.cap);
  assert.equal(UT.spaa.cap, UT.zu.cap);
});
