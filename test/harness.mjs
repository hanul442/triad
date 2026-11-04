// 브라우저 없이 게임 로직을 돌리는 테스트 하네스.
import vm from 'node:vm';
import { bundleJs } from '../build.mjs';

export function loadGame() {
  const ctx = { console, setTimeout, clearTimeout, Math, Date, JSON };
  vm.createContext(ctx);
  const code = bundleJs() + `
;globalThis.__T = {
  get G() { return G; }, set G(v) { G = v; },
  newGame, endTurn, runAI, score, visSet, reach, attack, calcDmg, produce, construct, siteOk,
  baseCap, hangar, storeAir, sortie, launch, mkUnit, unitAt, cell, key, kr, kc, nbrs, dist, mcost,
  UT, BT, TYPES, TECH, ROWS: () => ROWS, COLS: () => COLS, power, income, armySize, armyCap,
  checkOver, beginTurn, aiUnit, removeUnit, startResearch, develop, execOrder, runOrders,
  SCN, scnEndTurn, scnCheck, blockaded, names,
};`;
  vm.runInContext(code, ctx, { filename: 'triad-bundle.js' });
  // 전역 함수 교체(계측용): 스크립트 최상위 function 선언은 전역 객체 속성이라 바꿔 끼울 수 있다.
  Object.defineProperty(ctx.__T, '__get', { value: name => ctx[name] });
  Object.defineProperty(ctx.__T, '__set', { value: (name, fn) => { ctx[name] = fn; } });
  return ctx.__T;
}

// 모든 세력을 AI로 두고(관전 모드) 한 판을 끝까지 돌린다.
export async function playAI(T, cfg = {}) {
  const slots = cfg.slots || ['ai', 'ai', 'ai', 'ai', 'none', 'none'];
  T.newGame({ slots, size: cfg.size || 'm', mt: cfg.mt || 'cont', vic: cfg.vic ?? 15, diff: cfg.diff || 'normal', fog: false, speed: 0 });
  const t0 = Date.now();
  T.runAI();
  while (!T.G.over) {
    if (Date.now() - t0 > (cfg.timeoutMs || 60000)) throw new Error('게임이 시간 안에 끝나지 않음 (라운드 ' + T.G.turn + ')');
    await new Promise(r => setTimeout(r, 5));
  }
  return T.G;
}
