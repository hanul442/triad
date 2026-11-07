// 브라우저 없이 게임 로직을 돌리는 테스트 하네스.
import vm from 'node:vm';
import { bundleJs } from '../build.mjs';

export function loadGame() {
  const ctx = { console, setTimeout, clearTimeout, Math, Date, JSON };
  vm.createContext(ctx);
  const code = bundleJs() + `
;globalThis.__T = {
  get G() { return G; }, set G(v) { G = v; }, get N() { return N; },
  newGame, orderFort, fortBlast, fortCovers, coverOf, inBox, rtTick, rtRun, aiThink, pathTo, orderMove, orderMoveTo, orderGroupMove, pathPts, orderAttack, rtShoot, ROUND_S, reach, attack, shootBldg, calcDmg, canHit, los, visSet, seen, mkUnit, unitAt, cell, key, kr, kc, nbrs, dist, mcost,
  UT, TT, SUP, TYPES, SIZES, buy, deploySpots, support, canSupport, moveUnit, damageBldg, income, objCount, checkOver, inZone, zoneSpots, genMap, targetsOf, bump,
};`;
  vm.runInContext(code, ctx, { filename: 'triad-bundle.js' });
  Object.defineProperty(ctx.__T, '__get', { value: name => ctx[name] });
  Object.defineProperty(ctx.__T, '__set', { value: (name, fn) => { ctx[name] = fn; } });
  return ctx.__T;
}

// 모든 세력을 AI로 두고(관전 모드) 실시간 한 판을 0.1초씩 끝까지 돌린다.
export async function playAI(T, cfg = {}) {
  T.newGame({ slots: cfg.slots || ['ai', 'ai', 'none', 'none'], size: cfg.size || 's', diff: cfg.diff || 'normal', fog: cfg.fog ?? true, speed: 0, seed: cfg.seed, maxR: cfg.maxR });
  const t0 = Date.now();
  const check = cfg.check;
  for (let i = 0; i < 20000 && !T.G.over; i++) { T.rtTick(0.1); if (check && i % 10 === 0) check(T.G); }
  return { ms: Date.now() - t0 };
}
