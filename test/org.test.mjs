import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, seedRandom } from './harness.mjs';

const fn = (T, name) => T.__get(name);
const start = (T, auto, seed = 5) => { seedRandom(T, seed); T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 'm', seed, fog: true, speed: 0, auto }); T.rtRun(2); };
const mine = T => T.G.units.filter(u => u.nat === 0);

test('편성: 전투 부대는 저절로 4개 이하 소대로, 지원 부대는 본부에 남는다', () => {
  const T = loadGame(); start(T, true);
  const O = T.G.org[0];
  assert.ok(O.co.length >= 1 && O.pq.length >= 2, `중대 ${O.co.length} 소대 ${O.pq.length}`);
  const hq = T.__eval('orgHQ');
  for (const u of mine(T)) assert.equal(u.pq == null, hq(u), `${u.type} 편성`);
  for (const p of O.pq) assert.ok(mine(T).filter(u => u.pq === p.id).length <= 4);
  assert.equal(O.pq[0].name, '1중대 1소대');
});

test('편성: 증원 받는 중대를 정하면 새 부대가 그 중대로, 꽉 차면 새 중대', () => {
  const T = loadGame(); start(T, false);
  const G = T.G, n = 0;
  const c2 = fn(T, 'orgRegroup')(n, [mine(T).find(u => u.type === 'rifle')], 'co').c;
  G.nats[n].reinfCo = c2.id;
  const d = T.__eval('depotOf')(n);
  const u = T.mkUnit(n, 'rifle', Math.floor(d.z), Math.floor(d.x));
  T.rtRun(1.5);
  const p = T.__eval('orgPq')(n, u.pq);
  assert.equal(p.co, c2.id, '고른 중대로');
  // 증원 받는 중대를 지우면 가장 작은 중대부터 채우고, 다 차면 새 중대
  G.nats[n].reinfCo = null;
  for (let i = 0; i < 20; i++) T.mkUnit(n, 'rifle', Math.floor(d.z), Math.floor(d.x));
  T.rtRun(1.5);
  const O = G.org[n];
  for (const c of O.co) assert.ok(O.pq.filter(q => q.co === c.id).length <= 3, `${c.name} 소대 수`);
  assert.ok(mine(T).every(x => T.__eval('orgHQ')(x) || x.pq != null));
});

test('부관: 중대에 준 목표는 그 중대 소대만 따른다', () => {
  const T = loadGame(); start(T, true);
  const G = T.G, n = 0;
  const reg = fn(T, 'orgRegroup')(n, mine(T).filter(u => u.type === 'rifle').slice(0, 2), 'co');
  const o = G.objs[2], o2 = G.objs[5];
  fn(T, 'autoIntent')(n, 'atk', o2.c + .5, o2.r + .5);
  fn(T, 'orgAim')(n, { k: 'co', id: reg.c.id }, 'atk', o.c + .5, o.r + .5);
  T.rtRun(6);
  const P = G.plat.filter(p => p.nat === n && !p.human && p.mode !== 'defend');
  const mineP = P.filter(p => reg.made.some(q => q.id === p.pq));
  assert.ok(mineP.length > 0, '새 중대 전술 소대');
  assert.ok(mineP.every(p => p.obj[0] === o.r && p.obj[1] === o.c), '중대 목표');
  assert.ok(P.filter(p => !mineP.includes(p)).every(p => p.obj[0] === o2.r && p.obj[1] === o2.c), '나머지는 전체 주공');
  // 전체 주공을 다시 정하면 중대 목표는 지워진다
  fn(T, 'autoIntent')(n, 'atk', o2.c + .5, o2.r + .5);
  assert.equal(G.org[n].co.find(c => c.id === reg.c.id).intent, null);
});

test('직접 지휘: 소대에 목표를 주면 그 소대 이름으로 공격 임무가 된다', () => {
  const T = loadGame(); start(T, false);
  const G = T.G, n = 0; G.radio = false;
  const p = G.org[n].pq[0];
  const o = G.objs[2];
  fn(T, 'orgAim')(n, { k: 'pq', id: p.id }, 'atk', o.c + .5, o.r + .5);
  const mp = G.plat.filter(q => q.nat === n && q.human);
  assert.ok(mp.length >= 1);
  assert.ok(mp.every(q => q.name.startsWith(p.name) && q.mode === 'attack'), mp.map(q => q.name).join(','));
  fn(T, 'orgAim')(n, { k: 'pq', id: p.id }, null);
  assert.equal(G.plat.filter(q => q.nat === n && q.human && q.mem.length).length, 0, '임무 해제');
});

test('편성이 있는 부관 판도 오류 없이 끝까지 간다', () => {
  const T = loadGame(); seedRandom(T, 13);
  T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 's', seed: 13, fog: true, speed: 0, auto: true });
  for (let i = 0; i < 20000 && !T.G.over; i++) { T.rtTick(.1); if (i === 600) T.G.nats[0].reinfCo = T.G.org[0].co[0].id; }
  assert.ok(T.G.over);
  assert.equal((T.G.errs || []).length, 0, String((T.G.errs || [])[0]));
});
