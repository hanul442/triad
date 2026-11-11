// 무전 실제감: 호출부호·절차어·여러 말투·실제 보고 양식(SPOT, 9-line, 사격 요청, SITREP)·한국어 읽기
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './harness.mjs';

const fn = (T, n) => T.__get(n) ?? T.__eval(n);

test('무전: 사건마다 여러 말투, 영어·한국어 짝이 맞는다', () => {
  const T = loadGame();
  fn(T, 'specStart')({ n: 2, size: 's', seed: 4 });
  const G = T.G, line = fn(T, 'voxLine');
  const u = G.units.find(x => x.nat === 0 && x.type === 'rifle');
  const e = G.units.find(x => x.nat === 1);
  const tank = T.mkUnit(1, 'tank', 3, 3), heli = T.mkUnit(1, 'gunship', 4, 4);
  const amb = T.mkUnit(0, 'amb', 2, 2);
  const obj = G.objs[0].name;
  const cases = {
    order: [{ u, kind: 'move', x: 5, z: 5 }, { u, kind: 'atk', tgt: tank }, { u, kind: 'hold' }, { u, kind: 'bldg', x: 5, z: 5, more: 2 }],
    ack: [{ u, kind: 'atk' }, { u, kind: 'move' }, { u, kind: 'hold' }], jam: [{ u }], run: [{ u }],
    contact: [{ u, e }], cas: [{ u, hw: 2 }, { u, hw: 1, kia: 1 }], medevac: [{ u, hw: 2 }], medack: [{ u, nat: 0 }],
    pin: [{ u, e }, { u }], fall: [{ u }], rally: [{ u }], spot: [{ u, e: tank }, { u, e: heli }],
    air: [{ nat: 0, kind: 'air', x: 5, z: 5 }], sup: [{ nat: 0, kind: 'arty', x: 5, z: 5 }, { nat: 0, kind: 'smoke', x: 5, z: 5 }],
    fdc: [{ nat: 0, x: 5, z: 5 }], shot: [{ nat: 0 }], splash: [{ nat: 0 }], eom: [{ nat: 0 }], rounds: [{ u }], breach: [{ u }], clear: [{ u }],
    ammo: [{ u }], inpos: [{ u }], kill: [{ u, e: tank }, { u, e }, { u, e: heli }], gone: [{ u }], cap: [{ u, obj }], lost: [{ nat: 0, obj }],
    arr: [{ u }], sitq: [{ nat: 0 }], sitrep: [{ u }], test: [{ nat: 0 }],
  };
  for (const [k, list] of Object.entries(cases)) for (const o of list) {
    for (let i = 0; i < 30; i++) {
      const v = line(k, o);
      assert.ok(v && v.txt.length > 4, k);
      assert.ok(!/[가-힣]/.test(v.txt), `${k} 영어: ${v.txt}`);
      assert.ok(/[가-힣]/.test(v.ko), `${k} 한국어: ${v.ko}`);
      assert.ok(!/undefined|NaN|null|\$\{/.test(v.txt + v.ko + v.who + v.whoKo), `${k}: ${v.txt} / ${v.ko} / ${v.who}`);
    }
  }
  // 말투 수: 자주 나오는 교신은 세 가지 이상
  for (const k of ['contact', 'kill', 'ack', 'order', 'clear', 'ammo', 'inpos', 'breach']) {
    const s = new Set(); const o = cases[k][0];
    for (let i = 0; i < 60; i++) s.add(line(k, o).txt.replace(/\d+/g, ''));
    assert.ok(s.size >= 3, `${k} 말투 ${s.size}개`);
  }
  // 9-line 형식, 포격 근접 위험, 구급차가 있으면 출동
  assert.match(line('medevac', { u, hw: 2 }).txt, /Line one, grid .+Line three, two urgent/);
  assert.match(line('medack', { u, nat: 0 }).txt, /Angel One-One/);
  const near = T.mkUnit(0, 'rifle', 7, 7);
  let dc = false; for (let i = 0; i < 10; i++) if (/Danger close/.test(line('sup', { nat: 0, kind: 'arty', x: near.x, z: near.z }).txt)) dc = true;
  assert.ok(dc, '아군 근처 포격은 근접 위험');
  const spot = line('spot', { u, e: tank });
  assert.match(spot.txt, /tank/i);
  assert.equal(line('splash', { nat: 0 }).who, 'Steel Rain');
});

test('무전: 호출부호는 소대-분대, 지휘관은 Six, 한국어는 군대식 숫자로 읽는다', () => {
  const T = loadGame();
  fn(T, 'specStart')({ n: 2, size: 's', seed: 5 });
  const cs = fn(T, 'voxCs'), csK = fn(T, 'voxCsKo'), hq = fn(T, 'voxHq'), say = fn(T, 'voxSayKo');
  const us = [1, 2, 3, 4, 5].map(() => T.mkUnit(0, 'tank', 2, 2));
  const names = us.map(cs);
  assert.ok(names.some(n => /Sabre Two-One/.test(n)), names.join());
  assert.match(csK(us[0]), /^전차 \d-\d$/);
  assert.equal(hq(0), 'Eagle Six');
  assert.equal(say('소총 1-2, 좌표 0417'), '소총 하나 다시 둘, 좌표 공 넷 하나 칠');
});

test('무전: 포격 요청은 복창·발사·탄착·종료로, 중상자는 9-line과 본부 답으로 이어진다', () => {
  const T = loadGame();
  fn(T, 'specStart')({ n: 2, size: 's', seed: 6 });
  T.__set('document', { getElementById: () => null });
  const G = T.G, ev = fn(T, 'voxEv'), VOX = T.__eval('VOX');
  T.__set('voxHears', () => true);
  G.viewer = 0;
  const u = G.units.find(x => x.nat === 0 && x.type === 'rifle');
  VOX.tm = [];
  ev('sup', { nat: 0, kind: 'arty', x: 6, z: 6 });
  assert.deepEqual(VOX.tm.map(x => x.k), ['fdc', 'shot', 'splash', 'eom']);
  VOX.tm = [];
  ev('cas', { u, hw: 2, kia: 0 });
  assert.deepEqual(VOX.tm.map(x => x.k), ['medevac', 'medack']);
});
