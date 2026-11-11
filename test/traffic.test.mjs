// 길 막힘·마주침·길 겹침(06i4-traffic): 실제 지도 무리 이동(tools/traffic.mjs)과 막힌 길 우회(tools/jamcase.mjs detour)
import test from 'node:test';
import assert from 'node:assert/strict';
import { run } from '../tools/traffic.mjs';
import { runCase } from '../tools/jamcase.mjs';

test('길을 꽉 막고 선 차가 있으면 다른 길로 돌아가 도착한다(차를 뚫고 지나가지 않는다)', () => {
  let minD = 9;
  const r = runCase('detour', 70, 1, T => { const G = T.G; const h = G.units.find(u => u.type === 'hmv'), b = G.units.find(u => u.type === 'tank'); if (h && b) minD = Math.min(minD, Math.hypot(h.x - b.x, h.z - b.z)); });
  assert.ok(r[0].t != null, '못 감 @' + r[0].at.join(','));
  assert.ok(minD > .3, '막은 전차와 너무 가까이 붙어 지나감 ' + minD.toFixed(2));
});

test('교차로에서 네 무리가 엇갈려 지나가도 거의 모두 목적지에 닿는다(시가지)', () => {
  const r = run('cross', 208, 150);   // 시가지 지도. 고치기 전: 16부대 중 4부대가 대열 자리에 선 채 멈춤
  assert.ok(r && r.n >= 12, '장면을 못 만듦');
  assert.ok(r.late <= 2, `못 간 부대 ${r.late}/${r.n}: ${r.ex.join(' / ')}`);
});

test('두 무리가 같은 길에서 마주 오며 자리를 맞바꿔도 멈춰 서지 않는다', () => {
  const r = run('swap', 209, 150);   // 항구 지도. 고치기 전: 16부대 중 7부대가 2분 반 안에 못 감
  assert.ok(r && r.n >= 12, '장면을 못 만듦');
  assert.ok(r.late <= 2, `못 간 부대 ${r.late}/${r.n}: ${r.ex.join(' / ')}`);
});
