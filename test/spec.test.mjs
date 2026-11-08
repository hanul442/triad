import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from './harness.mjs';

const fn = (T, name) => T.__get(name);

test('관전 모드: 고른 세력 수만큼 AI 세력으로 시작하고 사람은 없다', () => {
  const T = loadGame();
  for (const n of [2, 3, 4]) {
    fn(T, 'specStart')({ n, size: 's', seed: 7 + n });
    const act = T.G.nats.filter(x => x.alive);
    assert.equal(act.length, n);
    assert.ok(act.every(x => x.ctrl === 'ai'));
    assert.equal(T.G.spec, true);
    assert.equal(T.G.fog, true, 'AI는 안개 속에서 싸운다');
    assert.equal(T.N, 32);
  }
});

test('관전 모드: 사람이 있는 판은 관전이 아니다', () => {
  const T = loadGame();
  T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 's', seed: 3 });
  assert.equal(T.G.spec, false);
});

test('관전 판은 저장하지 않아 사람이 하던 판의 저장을 덮어쓰지 않는다', () => {
  const T = loadGame();
  const store = new Map();
  T.__set('localStorage', { setItem: (k, v) => store.set(k, v), getItem: k => store.get(k) ?? null });
  T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 's', seed: 3 });
  fn(T, 'save')();
  const mine = store.get('triad-urban-save');
  assert.ok(mine);
  fn(T, 'specStart')({ n: 2, size: 's', seed: 4 });
  T.rtRun(65);
  fn(T, 'save')();
  assert.equal(store.get('triad-urban-save'), mine);
});

test('자동 연출은 최근에 총을 쏜 부대가 모인 곳을 고른다', () => {
  const T = loadGame();
  fn(T, 'specStart')({ n: 2, size: 's', seed: 11 });
  const G = T.G;
  G.time = 100;
  for (const u of G.units) u.firedT = -99;
  const a = G.units.find(u => u.nat === 0), b = G.units.find(u => u.nat === 1);
  b.x = a.x + 2; b.z = a.z;
  a.firedT = 99; b.firedT = 98.5;
  const h = fn(T, 'specHot')(null);
  assert.ok(h && (h.u === a || h.u === b));
  // 교전이 없으면 적과 가장 가까운 부대(전선)
  a.firedT = b.firedT = -99;
  const h2 = fn(T, 'specHot')(null);
  assert.ok(h2 && (h2.u === a || h2.u === b));
});

test('관전 판도 AI끼리 끝까지 진행된다', () => {
  const T = loadGame();
  fn(T, 'specStart')({ n: 3, size: 's', seed: 21 });
  T.G.maxR = 8;
  T.rtRun(8 * 30 + 5);
  assert.ok(T.G.over, '판이 끝난다');
  assert.equal(T.G.errs.length, 0, T.G.errs.join('\n'));
});

test('AI 명령도 무전을 탄다: 생각한 직후엔 아직 안 바뀌고, 교신이 닿으면 바뀐다', () => {
  const T = loadGame();
  fn(T, 'specStart')({ n: 2, size: 's', seed: 21 });
  const G = T.G;
  T.rtRun(20);
  // 멈춰 선 부대를 하나 만들고 AI가 생각하게 한다
  const before = new Map(G.units.map(u => [u, u.path]));
  for (let i = 0; i < 6; i++) T.aiThink(0);
  const ai = G.rq.filter(e => e.ai && e.nat === 0);
  assert.ok(ai.length > 0, 'AI 명령이 대기열에 들어갔다');
  const e = ai[0], u = G.units.find(o => o.id === e.us[0]);
  assert.ok(e.at > G.time, '바로 닿지 않는다');
  assert.equal(u.path, before.get(u), '닿기 전엔 하던 일을 계속한다');
  const ack = u._ack;
  for (let i = 0; i < 40 && G.rq.some(x => x.id === e.id); i++) T.rtTick(0.1);
  assert.ok(!G.rq.some(x => x.id === e.id) || e.jam, '몇 초 안에 닿는다(재밍이 아니면)');
  if (!e.jam) assert.notEqual(u._ack, ack, '수신');
});

test('무전을 끄면 AI 명령은 바로 실행된다', () => {
  const T = loadGame();
  T.newGame({ slots: ['ai', 'ai', 'none', 'none'], size: 's', seed: 21, speed: 0, radio: false });
  T.rtRun(20);
  for (let i = 0; i < 4; i++) T.aiThink(0);
  assert.equal(T.G.rq.length, 0);
});

test('관전: 같은 지도 번호면 같은 도시, 시나리오·캠페인도 모든 자리를 AI가 맡는다', () => {
  const T = loadGame();
  const a = fn(T, 'specStart')({ n: 2, size: 's', seed: 777 });
  const m1 = JSON.stringify(a.map.map(r => r.map(x => x.t)));
  assert.equal(a.seed, 777);
  const b = fn(T, 'specStart')({ n: 2, size: 's', seed: '777' });
  assert.equal(JSON.stringify(b.map.map(r => r.map(x => x.t))), m1);
  for (const map of ['scn:assault', 'scn:hold', 'camp:evac', 'camp:bridge', 'camp:station']) {
    const g = fn(T, 'specStart')({ map, seed: 5 });
    assert.equal(g.spec, true, map);
    assert.ok(g.nats.filter(x => x.alive).every(x => x.ctrl === 'ai'), map);
    assert.ok(g.units.some(u => u.nat === 0) && g.units.some(u => u.nat === 1), map);
    if (map.startsWith('scn:')) assert.equal(g.scn, map.slice(4));
    else assert.equal(g.camp.id, map.slice(5));
    T.rtRun(30);
    assert.equal((g.errs || []).length, 0, map + ' ' + (g.errs || [])[0]);
  }
});

test('관전한 캠페인 판은 별을 기록하지 않는다', () => {
  const T = loadGame();
  const store = new Map();
  T.__set('localStorage', { setItem: (k, v) => store.set(k, v), getItem: k => store.get(k) ?? null, removeItem: k => store.delete(k) });
  fn(T, 'specStart')({ map: 'camp:evac' });
  T.G.over = { win: 0, why: '테스트' };
  fn(T, 'campEnd')();
  assert.equal(store.get('triad-campaign'), undefined);
});

test('무전 음성: 호출부호와 교신 문장을 만든다', () => {
  const T = loadGame();
  fn(T, 'specStart')({ n: 2, size: 's', seed: 9 });
  const G = T.G, line = fn(T, 'voxLine'), cs = fn(T, 'voxCs');
  const r = G.units.filter(u => u.nat === 0 && u.type === 'rifle');
  assert.equal(cs(r[0]), '소총 1분대');
  if (r[1]) assert.equal(cs(r[1]), '소총 2분대');
  const e = G.units.find(u => u.nat === 1);
  const u = r[0];
  const L = {
    order: line('order', { u, kind: 'move', place: '시청' }), ack: line('ack', { u, kind: 'move' }), jam: line('jam', { u }), run: line('run', { u }),
    contact: line('contact', { u, e }), cas: line('cas', { u, out: 'hw' }), kill: line('kill', { u, e }), gone: line('gone', { u }),
    cap: line('cap', { u, obj: '시청' }), lost: line('lost', { nat: 0, obj: '시청' }), sup: line('sup', { nat: 0, kind: 'arty', place: '시청' }), arr: line('arr', { u }),
  };
  for (const [k, v] of Object.entries(L)) { assert.ok(v && v.txt.length > 5 && /[가-힣]/.test(v.txt), k); assert.ok(!/undefined|NaN/.test(v.txt), k + ': ' + v.txt); }
  assert.match(L.order.txt, /^소총 1분대, 여기 독수리\. 시청 쪽으로 이동하라/);
  assert.match(L.contact.txt, /미터/);
  // 화면 없이 도는 판에서는 줄에 넣지 않는다(오류도 없다)
  T.rtRun(40);
  assert.equal((G.errs || []).length, 0);
});
