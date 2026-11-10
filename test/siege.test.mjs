// 공성: 부대가 알아서 진지를 판다(개인호·진지 계획·전진 지원 거점), 새 야전 시설 7종, 공병 폭파
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, playAI, seedRandom } from './harness.mjs';

const F = (T, n) => T.__get(n);
const E = (T, s) => T.__eval(s);
function setup(T) {
  T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: 's', seed: 3, fog: false });
  T.G.units = []; T.G.props = []; T.G.covers = []; T.G.forts = [];
  const G = T.G;
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) G.map[r][c] = { t: 'road', owner: null, obj: null, smoke: 0 };
  G.nats[1].ctrl = 'human'; G.navV = (G.navV || 0) + 1; T.bump();
  return G;
}
const run = (T, s) => { for (let i = 0; i < s * 10; i++) T.rtTick(0.1); };
const put = (T, nat, type, x, z) => { const u = T.mkUnit(nat, type, Math.floor(z), Math.floor(x)); u.x = x; u.z = z; u.path = []; return u; };
const fort = (T, k, nat, x, z, ry = 0) => { const f = { id: 5000 + T.G.forts.length, k, nat, x, z, ry, hp: T.FORT[k].hp, prog: 1, st: T.FORT[k].stock }; T.G.forts.push(f); T.fortCovers(); T.G.fortNV = (T.G.fortNV || 0) + 1; T.G.fortV = (T.G.fortV || 0) + 1; T.bump(); return f; };

test('개인호: 멈춘 보병은 명령 없이 개인호를 파고, 그 안은 참호처럼 엄폐된다 (플레이어 부대도)', () => {
  const T = loadGame(); const G = setup(T);
  const u = put(T, 0, 'rifle', 12.5, 12.5); u.nocas = 1;
  run(T, 25);
  const f = G.forts.find(f => f.k === 'scrape' && f.nat === 0);
  assert.ok(f, '개인호가 생김'); assert.equal(f.prog, 1, '다 팜');
  assert.equal(G.nats[0].cp >= 0, true);
  assert.ok(F(T, 'trenchAt')(f.x, f.z), '참호처럼 엄폐');
  assert.equal(T.FORT.scrape.cost, 0, '지휘점수 없음');
});

test('탄약 집적소: 둘레 부대가 트럭 없이 탄약을 채우고 재고가 준다, 맞으면 유폭한다', () => {
  const T = loadGame(); const G = setup(T);
  const f = fort(T, 'ammo', 0, 10.5, 10.5);
  const u = put(T, 0, 'mg', 10.8, 10.5); u.nocas = 1; u.am = 0;
  run(T, 6);
  assert.ok(u.am > 10, `탄약이 참 ${u.am}`); assert.ok(f.st < 60, '재고가 줆');
  const e = put(T, 1, 'rifle', 10.6, 10.9); e.nocas = 1; e.dmgIn = 0;
  const hp0 = e.hp; T.fortBlast(10.5, 10.5, .3, 99);
  assert.ok(!G.forts.includes(f), '부서짐');
});

test('관측소: 우리 보병이 곁에 있으면 둘레 4칸 적이 보인다', () => {
  const T = loadGame(); const G = setup(T); G.fog = true;
  put(T, 0, 'rifle', 5.5, 2.5);
  const e = put(T, 1, 'rifle', 5.5, 17.2); e.nocas = 1; T.bump(); G.time = 1;
  assert.equal(T.seen(e, 0), false, '관측소 없으면 안 보임');
  const f = fort(T, 'op', 0, 5.5, 14.5); G.time = 2;
  assert.equal(T.seen(e, 0), false, '비어 있으면 안 봄');
  put(T, 0, 'sniper', 5.6, 14.6); T.bump(); G.time = 3;
  assert.equal(T.seen(e, 0), true, '관측병이 있으면 봄');
});

test('차량 진지: 안의 전차는 직사 엄폐 40%를 받는다', () => {
  const T = loadGame(); const G = setup(T);
  const v = put(T, 0, 'tank', 10.5, 10.5); const a = put(T, 1, 'at', 10.5, 13.5);
  const c0 = T.coverOf(v, a).cov;
  fort(T, 'vpos', 0, 10.5, 10.5);
  const c1 = T.coverOf(v, a);
  assert.ok(c1.cov >= .4 && c1.cov > c0, `엄폐 ${c0} → ${c1.cov}`); assert.equal(c1.kind, 'vpos');
});

test('위장망: 그 아래 멈춘 차량은 숨고, 쏘거나 움직이면 드러난다', () => {
  const T = loadGame(); const G = setup(T);
  const v = put(T, 0, 'tank', 10.5, 10.5);
  const conc = F(T, 'concealed');
  assert.equal(conc(v), false);
  fort(T, 'camo', 0, 10.5, 10.5);
  assert.equal(conc(v), true, '숨음');
  v.firedT = G.time; assert.equal(conc(v), false, '쏘면 드러남');
});

test('대전차호: 차량은 막고 보병은 건넌다', () => {
  const T = loadGame(); const G = setup(T);
  fort(T, 'ditch', 0, 10.5, 10.5);
  const navCost = F(T, 'navCost');
  assert.equal(navCost('veh', 10.5, 10.5), 0, '바퀴 차량 막힘'); assert.equal(navCost('trk', 10.5, 10.5), 0, '궤도 차량 막힘');
  assert.ok(navCost('inf', 10.5, 10.5) > 0, '보병 통과');
});

test('공병 폭파: 공병이 적 벙커에 다가가 폭약으로 부순다', () => {
  const T = loadGame(); const G = setup(T);
  const f = fort(T, 'bunker', 1, 10.5, 10.5);
  const u = put(T, 0, 'eng', 10.5, 12.2); u.nocas = 1;
  E(T, 'sgBreach')(u, f);
  run(T, 15);
  assert.ok(!G.forts.includes(f), '벙커가 없어짐');
});

test('공병: 플레이어 공병도 멈춰 있으면 바로 앞 적 대전차 장애물을 걷어 낸다', () => {
  const T = loadGame(); const G = setup(T);
  const f = fort(T, 'hedgehog', 1, 10.5, 10.5);
  const u = put(T, 0, 'eng', 10.5, 11.3); u.nocas = 1;
  run(T, 20);
  assert.ok(!G.forts.includes(f), '장애물 폭파');
});

test('AI 진지 계획: 잡은 거점 둘레에 참호·구호소·탄약 집적소 등을 스스로 짓는다', () => {
  const T = loadGame(); const G = setup(T); G.nats[1].ctrl = 'ai';
  G.objs = [{ r: 12, c: 12, name: 'X' }]; G.map[12][12] = { t: 'plaza', owner: 1, obj: 0, smoke: 0 };
  for (let i = 0; i < 4; i++) { const u = put(T, 1, i === 3 ? 'eng' : 'rifle', 12 + i * .3, 12.5); u.nocas = 1; }
  G.nats[1].cp = 30; G.nats[0].alive = true;
  const think = F(T, 'aiSiege');
  for (let i = 0; i < 40; i++) { G.time += 2.5; think(1); run(T, 2.5); }
  const ks = new Set(G.forts.filter(f => f.nat === 1).map(f => f.k));
  assert.ok(ks.has('trench'), [...ks].join(','));
  assert.ok(ks.has('aid') || ks.has('ammo'), [...ks].join(','));
  assert.ok(G.forts.filter(f => f.nat === 1 && f.k !== 'scrape').length >= 4, '여러 개');
});

test('AI 한 판: 진지를 짓고 오류가 없다', async () => {
  const T = loadGame(); seedRandom(T, 3001);
  let built = 0; const seen = new Set();
  await playAI(T, { size: 's', seed: 3001, check: G => { for (const f of G.forts || []) if (f.prog >= 1 && !seen.has(f.id)) { seen.add(f.id); if (f.k !== 'scrape') built++; } } });
  assert.equal((T.G.errs || []).length, 0, (T.G.errs || [])[0]);
  assert.ok(built >= 3, `지은 시설 ${built}`);
});
