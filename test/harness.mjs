// 브라우저 없이 게임 로직을 돌리는 테스트 하네스.
import vm from 'node:vm';
import { bundleJs } from '../build.mjs';

export function loadGame() {
  const ctx = { console, setTimeout, clearTimeout, Math, Date, JSON };
  vm.createContext(ctx);
  const code = bundleJs() + `
;globalThis.__T = {
  get G() { return G; }, set G(v) { G = v; }, get N() { return N; },
  newGame, eye, orderFort, fortBlast, fortCovers, coverOf, inBox, rtTick, rtRun, aiThink, pathTo, orderMove, orderMoveTo, orderGroupMove, pathPts, orderAttack, rtShoot, ROUND_S, reach, attack, shootBldg, calcDmg, canHit, los, visSet, seen, mkUnit, unitAt, cell, key, kr, kc, nbrs, dist, mcost,
  UT, TT, SUP, WPN, FORT, OBJK, OBJ_KIND, MED, COVK, sndPlace, sndRoom, shellLaunch, shellTick, breachPt, breach, ignite, fireTick, TYPES, SIZES, buy, deploySpots, support, canSupport, moveUnit, damageBldg, income, objCount, checkOver, inZone, zoneSpots, genMap, targetsOf, bump,
};`;
  vm.runInContext(code, ctx, { filename: 'triad-bundle.js' });
  Object.defineProperty(ctx.__T, '__get', { value: name => ctx[name] });
  Object.defineProperty(ctx.__T, '__set', { value: (name, fn) => { ctx[name] = fn; } });
  // const/let로 선언된 전역(화살표 함수 등)은 ctx에 없으니 코드로 읽는다
  Object.defineProperty(ctx.__T, '__eval', { value: src => vm.runInContext(src, ctx) });
  return ctx.__T;
}

// 무작위를 고정한다: 이 게임 안의 Math.random만 시드 난수로 바꾼다(다른 테스트에는 영향 없음).
// 결과가 주사위에 달린 테스트가 가끔 실패하지 않게 쓴다.
export function seedRandom(T, seed = 1) {
  let a = seed >>> 0;
  const M = Object.create(Math);
  M.random = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  T.__set('Math', M);
}

// 모든 세력을 AI로 두고(관전 모드) 실시간 한 판을 0.1초씩 끝까지 돌린다.
export async function playAI(T, cfg = {}) {
  T.newGame({ slots: cfg.slots || ['ai', 'ai', 'none', 'none'], size: cfg.size || 's', diff: cfg.diff || 'normal', fog: cfg.fog ?? true, speed: 0, seed: cfg.seed, maxR: cfg.maxR, layout: cfg.layout, relief: cfg.relief, clime: cfg.clime, armies: cfg.armies });
  const t0 = Date.now();
  const check = cfg.check;
  for (let i = 0; i < 20000 && !T.G.over; i++) { T.rtTick(0.1); if (check && i % 10 === 0) check(T.G); }
  return { ms: Date.now() - t0 };
}
