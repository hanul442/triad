// 시작 갇힘 검사: 모든 지도·크기·세력에서 처음 놓인 지상 부대가 지도 가운데(거점)까지 길이 있는지 본다.
// 사용: node tools/startjam.mjs [시드 수=3] [크기들=s,m,l,xl,xxl] [지도들=전부]   VERB=1 이면 갇힌 부대마다 자세히
import { loadGame, seedRandom } from '../test/harness.mjs';
const NS = +(process.argv[2] || 3), SZ = (process.argv[3] || 's,m,l,xl,xxl').split(','), VERB = !!process.env.VERB;
const T0 = loadGame();
const LAYS = process.argv[4] ? process.argv[4].split(',') : T0.__eval('BM_LAYOUTS').concat(T0.__eval("typeof genAlpine==='function'") ? ['alpine'] : []);
let tot = 0, bad = 0; const by = {};
for (const lay of LAYS) for (const size of SZ) for (let s = 0; s < NS; s++) {
  const T = loadGame(); const seed = 7000 + s * 131; seedRandom(T, seed);
  T.newGame({ slots: ['ai', 'ai', 'ai', 'ai'], size, diff: 'normal', fog: true, speed: 0, seed, layout: lay });
  const G = T.G, N = T.N, navPath = T.__eval('navPath'), navCls = T.__eval('navCls');
  for (const u of G.units) {
    const t = T.UT[u.type]; if (t.fly || !navCls(u)) continue; tot++;
    // 목표: 가장 가까운 거점, 없으면 가운데
    const goals = G.objs.length ? G.objs.map(o => [o.c + .5, o.r + .5]) : [[N / 2, N / 2]];
    let ok = false, bestEnd = 1e9;
    for (const [gx, gz] of goals) { const p = navPath(u, gx, gz); if (!p) { ok = true; break; } const e = p[p.length - 1] || [u.x, u.z]; const d = Math.hypot(e[0] - gx, e[1] - gz); bestEnd = Math.min(bestEnd, d); if (d < 1.5) { ok = true; break; } }
    const K = T.__eval('navComp')(navCls(u)), W = K.W, l = K.lab[Math.floor(u.z * 5) * W + Math.floor(u.x * 5)];
    const inBig = l >= 0 && K.size[l] === K.big;
    // 거점이 건물 안이면 차량은 앞까지만 간다: 큰 덩어리(시가지 전체)에 있으면 나갈 수 있는 것으로 본다
    if (!ok && !inBig) { bad++; const k = `${lay}/${size}`; by[k] = (by[k] || 0) + 1;
      if (VERB) console.log('STUCK', lay, size, seed, 'nat', u.nat, u.type, navCls(u), 'at', u.x.toFixed(1), u.z.toFixed(1), 'tile', G.map[u.r][u.c].t, 'end', bestEnd.toFixed(1), 'comp', l >= 0 ? K.size[l] : -1, '/', K.big); }
  }
}
console.log('지상 부대', tot, '갇힘', bad, `(${(bad / tot * 100).toFixed(2)}%)`);
console.log(by);
