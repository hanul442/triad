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

test('편성: 병종을 따른다 (전차소대 4대, 기계화 소대는 장갑차 4대 + 분대 4개)', () => {
  const T = loadGame(); start(T, false);
  const G = T.G, n = 0; const d = T.__eval('depotOf')(n);
  const add = t => T.mkUnit(n, t, Math.floor(d.z), Math.floor(d.x));
  const tanks = [add('tank'), add('tank'), add('tank')];
  const ifvs = [add('ifv'), add('ifv'), add('ifv')];
  T.rtRun(1.5);
  const kind = T.__eval('orgPqKind'), pq = T.__eval('orgPq'), units = T.__eval('orgPqUnits');
  for (const u of tanks) {
    const p = pq(n, u.pq);
    assert.ok(units(n, p).every(x => x.type === 'tank'), '전차소대에는 전차만');
  }
  assert.equal(new Set(tanks.map(u => u.pq)).size, 1, '전차 셋은 한 소대');
  for (const u of ifvs) {
    const p = pq(n, u.pq); const us = units(n, p);
    assert.equal(kind(n, p), 'mech');
    assert.ok(us.filter(x => x.type === 'ifv' || x.type === 'hmv').length <= 4);
    assert.ok(us.every(x => x.type !== 'tank'));
  }
  const cap = T.__eval('orgCapOk');
  for (const p of G.org[n].pq) assert.ok(cap(units(n, p)), p.name);
});

test('편성: 판 처음에도 전차는 따로 전차소대', () => {
  const T = loadGame(); seedRandom(T, 9);
  T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 'm', seed: 9, fog: true, speed: 0, force: ['rifle', 'rifle', 'rifle', 'ifv', 'ifv', 'tank', 'tank', 'mg'] });
  T.rtRun(2);
  const G = T.G, n = 0; const units = T.__eval('orgPqUnits');
  for (const p of G.org[n].pq) {
    const us = units(n, p); const tk = us.filter(u => u.type === 'tank').length;
    assert.ok(tk === 0 || tk === us.length, `${p.name}: ${us.map(u => u.type)}`);
    assert.ok(us.filter(u => u.type === 'ifv').length <= 4);
  }
});

test('편성: 손실로 작아진 소대는 가까운 같은 갈래 소대와 합친다', () => {
  const T = loadGame(); start(T, false);
  const G = T.G, n = 0; const O = G.org[n];
  const units = T.__eval('orgPqUnits');
  const c = O.co[0]; const P = O.pq.filter(p => p.co === c.id && units(n, p).every(u => u.type !== 'tank'));
  assert.ok(P.length >= 2, '소대 둘 이상');
  const a = P[0], b = P[1];
  // 두 소대를 한 명씩만 남기고 가까이 둔다
  for (const p of [a, b]) for (const u of units(n, p).slice(1)) G.units.splice(G.units.indexOf(u), 1);
  const ua = units(n, a)[0], ub = units(n, b)[0]; ub.x = ua.x + 1; ub.z = ua.z;
  G.orgMT = 0; T.rtRun(1.2);
  assert.equal(ua.pq, ub.pq, '한 소대로');
  assert.equal(O.pq.filter(p => units(n, p).length).length, O.pq.length, '빈 소대는 지움');
});

test('편성: 화기팀(기관총·대전차)은 한 소대에 둘까지라 소대마다 나뉜다', () => {
  const T = loadGame(); seedRandom(T, 9);
  T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 'm', seed: 9, fog: true, speed: 0, force: ['rifle', 'rifle', 'rifle', 'rifle', 'rifle', 'rifle', 'mg', 'mg', 'at', 'at'] });
  T.rtRun(2);
  const G = T.G, n = 0; const units = T.__eval('orgPqUnits');
  const P = G.org[n].pq;
  assert.ok(P.length >= 3, `소대 ${P.length}`);
  for (const p of P) {
    const us = units(n, p);
    assert.ok(us.length <= 4 && us.filter(u => ['mg', 'at'].includes(u.type)).length <= 2, `${p.name}: ${us.map(u => u.type)}`);
  }
});

test('편성: 장갑차에 탄 분대도 소대를 잃지 않는다', () => {
  const T = loadGame(); start(T, false);
  const G = T.G, n = 0; const d = T.__eval('depotOf')(n);
  const v = T.mkUnit(n, 'ifv', Math.floor(d.z), Math.floor(d.x));
  T.rtRun(1.5);
  const p = v.pq; assert.ok(p != null);
  const sq = G.units.find(u => u.nat === n && u.pq === p && u.type === 'rifle') || G.units.find(u => u.nat === n && u.type === 'rifle');
  const sp = sq.pq;
  // 소대원을 모두 태운 것처럼 지도에서 뺀다
  const mates = G.units.filter(u => u.nat === n && u.pq === sp);
  for (const u of mates) if (u !== v) { G.units.splice(G.units.indexOf(u), 1); v.pax = (v.pax || []).concat([u]); }
  T.rtRun(2);
  assert.ok(T.__eval('orgPq')(n, sp), '소대가 남는다');
  assert.ok(v.pax.every(u => u.pq === sp || u.pq === v.pq));
});

test('직접 지휘: 새로 배속된 부대는 소대 임무를 같이 받는다', () => {
  const T = loadGame(); start(T, false);
  const G = T.G, n = 0; G.radio = false;
  const o = G.objs[2]; G.nats[n].reinfCo = G.org[n].co[0].id;
  fn(T, 'orgAim')(n, { k: 'co', id: G.org[n].co[0].id }, 'atk', o.c + .5, o.r + .5);
  const d = T.__eval('depotOf')(n);
  // 소대에서 한 분대를 빼서 자리를 만든다
  const p0 = G.org[n].pq[0]; const out = G.units.find(u => u.nat === n && u.pq === p0.id && u.type === 'rifle');
  if (out) G.units.splice(G.units.indexOf(out), 1);
  G.time = Math.max(G.time, 5);
  G.nats[n].cp = 999; const sp = T.__eval('deploySpots')(n, 'rifle');
  const u = T.__eval('buy')(n, 'rifle', Math.floor(sp[0] / 100), sp[0] % 100);
  T.rtRun(2);
  assert.ok(u && u.pq != null);
  assert.ok(u.pl != null && G.plat.some(q => q.id === u.pl && q.human && q.mode === 'attack'), '공격 임무');
});

test('편성: 소대 하나만 남은 작은 중대는 가까운 중대로 들어간다', () => {
  const T = loadGame(); start(T, false);
  const G = T.G, n = 0; const O = G.org[n];
  const u = mine(T).find(x => x.type === 'rifle');
  const c1 = O.co[0];
  // 손으로 만든 게 아닌 작은 2중대
  const c2 = T.__eval('orgNewCo')(n); const p2 = T.__eval('orgNewPq')(n, c2); u.pq = p2.id;
  // 1중대에 자리를 만든다(소대 셋 미만)
  assert.ok(O.pq.filter(p => p.co === c1.id).length < 3);
  const c = T.__eval('orgCtr')(T.__eval('orgCoUnits')(n, c1)); u.x = c[0]; u.z = c[1];
  for (let i = 0; i < 3; i++) { G.orgMT = 0; T.rtRun(1.2); }
  const p = T.__eval('orgPq')(n, u.pq);
  assert.ok(p && p.co === c1.id || O.pq.find(q => q.id === u.pq)?.co === c1.id, `소대 ${p && p.name}`);
  assert.ok(!O.co.some(q => q.id === c2.id), '빈 2중대는 사라진다');
});
