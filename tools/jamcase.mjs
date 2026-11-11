// 끼임 장면 시험: 좁은 길에서 마주 오기·앞에 선 아군·한곳으로 몰리기. 장면마다 도착 시간(초)과 못 간 부대 수.
// 사용: node tools/jamcase.mjs [장면 이름...]
import { loadGame, seedRandom } from '../test/harness.mjs';
export function setupCorr(T, W, len = 22) {
  T.newGame({ slots: ['human', 'human', 'none', 'none'], size: 's', seed: 3, fog: false });
  const G = T.G; G.units = []; G.props = []; G.covers = [];
  const z0 = 8;
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) G.map[r][c] = { t: (r >= z0 && r < z0 + W && c >= 2 && c < 2 + len) ? 'road' : 'water', owner: null, obj: null, smoke: 0 };
  G.wx = 'clear'; G.navV = (G.navV || 0) + 1; T.bump(); return { G, z0 };
}
const put = (T, nat, ty, x, z, face = 0) => { const u = T.mkUnit(nat, ty, Math.floor(z), Math.floor(x)); u.x = x; u.z = z; u.face = face; u.hd = face; u.tf = face; u.vs = 0; return u; };
const CASES = {
  // 너비 2칸 길에서 전차 둘이 마주 온다
  tankHead: T => { const { z0 } = setupCorr(T, 2); const a = put(T, 0, 'tank', 4.5, z0 + 1, 0), b = put(T, 0, 'tank', 20.5, z0 + 1, 180); return [[a, 21, z0 + 1], [b, 4, z0 + 1]]; },
  // 너비 2칸 길 가운데 선 아군 전차 뒤에서 차량 둘이 지나간다
  tankIdle: T => { const { z0 } = setupCorr(T, 2); put(T, 0, 'tank', 12.5, z0 + 1, 0); const a = put(T, 0, 'ifv', 4.5, z0 + 1, 0), b = put(T, 0, 'hmv', 3.5, z0 + .6, 0); return [[a, 21.5, z0 + 1], [b, 21.5, z0 + 1.2]]; },
  // 너비 1칸 길: 보병 두 분대가 마주 온다
  infHead1: T => { const { z0 } = setupCorr(T, 1); const a = put(T, 0, 'rifle', 4.5, z0 + .5, 0), b = put(T, 0, 'rifle', 20.5, z0 + .5, 180); return [[a, 21, z0 + .5], [b, 4, z0 + .5]]; },
  // 너비 1칸 길 가운데 선 아군 분대를 지나간다
  infIdle1: T => { const { z0 } = setupCorr(T, 1); put(T, 0, 'mg', 12.5, z0 + .5, 0); const a = put(T, 0, 'rifle', 4.5, z0 + .5, 0); return [[a, 21, z0 + .5]]; },
  // 너비 1칸 길 가운데 선 아군 보병 둘을 전차·차량이 지나간다
  tankInf1: T => { const { z0 } = setupCorr(T, 1); put(T, 0, 'rifle', 11.5, z0 + .5, 0); put(T, 0, 'at', 15.5, z0 + .5, 0); const a = put(T, 0, 'tank', 4.5, z0 + .5, 0), b = put(T, 0, 'hmv', 3.3, z0 + .5, 0); return [[a, 21, z0 + .5], [b, 19.8, z0 + .5]]; },
  // 너비 2칸 길: 보병과 전차가 마주 온다
  infTank: T => { const { z0 } = setupCorr(T, 2); const a = put(T, 0, 'rifle', 4.5, z0 + 1, 0), b = put(T, 0, 'tank', 20.5, z0 + 1, 180); return [[a, 21, z0 + 1], [b, 4, z0 + 1]]; },
  // 너비 3칸 길: 전차 넷 + 보병 넷이 마주 오는 같은 무리와 엇갈린다
  convoys: T => { const { z0 } = setupCorr(T, 3, 26); const o = [];
    for (let i = 0; i < 4; i++) { o.push([put(T, 0, ['tank', 'hmv', 'tank', 'hmv'][i], 3.5 + i * 1.1, z0 + 1.5, 0), 25 - i * 1.6, z0 + 1.5]); o.push([put(T, 0, 'rifle', 8.5 + i * .7, z0 + .5 + (i % 2) * 2, 0), 26.5 - (i >> 1), z0 + .5 + (i % 2) * 2]); }
    for (let i = 0; i < 4; i++) { o.push([put(T, 0, ['tank', 'ifv', 'tank', 'hmv'][i], 26.5 - i * 1.1, z0 + 1.5, 180), 3.5 + i * 1.6, z0 + 1.5]); o.push([put(T, 0, 'mg', 21.5 - i * .7, z0 + .5 + (i % 2) * 2, 180), 2.5 + (i >> 1), z0 + .5 + (i % 2) * 2]); }
    return o; },
  // 넓은 땅: 여덟 부대가 한 점으로 무리 이동
  crowd: T => { const { G } = setupCorr(T, 12, 26); const us = [];
    for (let i = 0; i < 8; i++) us.push(put(T, 0, ['tank', 'rifle', 'ifv', 'mg', 'tank', 'rifle', 'hmv', 'at'][i], 4 + (i % 4) * .9, 10 + (i >> 2) * 1.2, 0));
    T.orderGroupMove(us, 22.5, 14.5); return us.map(u => [u, null, null]); },
};
export function runCase(name, secs = 90, seed = 1, trace) {
  const T = loadGame(); seedRandom(T, seed); const L = CASES[name](T); const G = T.G;
  for (const [u, x, z] of L) if (x != null) T.orderMoveTo(u, x, z);
  const goal = L.map(([u, x, z]) => [u, x, z, null]);
  let t = 0;
  for (let i = 0; i < secs * 10; i++) { T.rtTick(.1); G.units = G.units.filter(u => u.nat === 0); t += .1;
    for (const g of goal) { const [u, x, z] = g; if (g[3] != null) continue; if (x == null ? !(u.path && u.path.length) && t > 2 : Math.hypot(u.x - x, u.z - z) < .8) g[3] = +t.toFixed(1); }
    if (trace) trace(T, goal, t); if (goal.every(g => g[3] != null)) break; }
  return goal.map(([u, x, z, a]) => ({ ty: u.type, id: u.id, t: a, at: [+u.x.toFixed(2), +u.z.toFixed(2)], to: x == null ? null : [x, z] }));
}
if (process.argv[1] && process.argv[1].endsWith('jamcase.mjs')) {
  const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CASES);
  for (const n of names) { const r = runCase(n); const miss = r.filter(x => x.t == null); const mx = Math.max(...r.map(x => x.t ?? 999));
    const sumT = r.reduce((a, x) => a + (x.t ?? 90), 0); console.log(n.padEnd(9), '합계', sumT.toFixed(0) + 's', '못 감', miss.length, '/', r.length, ' 마지막 도착', mx === 999 ? '-' : mx + 's', miss.length ? JSON.stringify(miss.map(m => m.ty + '@' + m.at.join(','))) : ''); }
}
