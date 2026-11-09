// 무기 피해 측정: AI끼리 여러 판을 돌려 (쏜 병종 → 맞은 병종) 피해 합과 격파 수를 센다.
// 사용: node tools/dmg.mjs [판 수=8] [크기=m] [시드 시작=3000]
import { loadGame, playAI } from '../test/harness.mjs';

const GAMES = +(process.argv[2] || 8), SIZE = process.argv[3] || 'm', S0 = +(process.argv[4] || 3000);
const dmg = {}, kills = {}, lost = {}, bought = {}, tac = {};
let len = 0, errs = 0;
const inc = (o, k, v = 1) => (o[k] = (o[k] || 0) + v);
const label = (T, by) => { if (!by) return '?'; const p = Object.getPrototypeOf(by); if (p && p.type && !T.G.units.includes(by) && p.type !== by.type) return p.type + '+' + by.type; return by.type; };
for (let g = 0; g < GAMES; g++) {
  const T = loadGame();
  const wrap = (name, fn) => { const orig = T.__get(name); T.__set(name, fn(orig)); };
  wrap('harm', o => function (u, amt, by, opt) { if (u && amt > 0 && T.G.units.includes(u)) inc(dmg, label(T, by) + '>' + u.type, amt); return o(u, amt, by, opt); });
  wrap('kill', o => function (u, by) { if (T.G.units.includes(u)) { inc(kills, label(T, by) + '>' + u.type); inc(lost, u.type); } return o(u, by); });
  wrap('buy', o => function (n, t, r, c) { const u = o(n, t, r, c); if (u) inc(bought, t); return u; });
  await playAI(T, { size: SIZE, seed: S0 + g });
  for (const [k, v] of Object.entries(T.G.tac || {})) if (/^(sec_|nopen|aoe)/.test(k)) inc(tac, k, v);
  len += T.G.time; errs += (T.G.errs || []).length;
}
const top = (o, f, n = 40) => Object.entries(o).filter(([k]) => !f || f(k)).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k} ${(v / GAMES).toFixed(1)}`).join(', ');
console.log(`${GAMES}판 (${SIZE}) 평균 ${(len / GAMES / 60).toFixed(1)}분 · 오류 ${errs}`);
console.log('판당 증원:', top(bought));
console.log('판당 잃은 부대:', top(lost));
console.log('전차를 잡은 것:', top(kills, k => k.endsWith('>tank')));
console.log('전차가 잡은 것:', top(kills, k => k.startsWith('tank>')));
console.log('장갑차를 잡은 것:', top(kills, k => k.endsWith('>ifv')));
console.log('소총분대를 잡은 것:', top(kills, k => k.endsWith('>rifle')));
console.log('전차가 받은 피해:', top(dmg, k => k.endsWith('>tank'), 12));
console.log('전차가 준 피해:', top(dmg, k => k.startsWith('tank>'), 12));
console.log('판당 부무장·관통:', top(tac));
console.log('판당 격파 상위:', top(kills, null, 25));
