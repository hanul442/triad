// 아군 오사 측정: AI끼리 여러 판을 돌려 아군에게 준 피해(직접 쏜 것 + 화력 지원)와 사격 보류 횟수를 센다.
// 사용: node tools/ff.mjs [판 수=8] [크기=m] [시드=3000]
import { loadGame, playAI } from '../test/harness.mjs';
const GAMES = +(process.argv[2] || 8), SIZE = process.argv[3] || 'm', S0 = +(process.argv[4] || 3000);
let ff = 0, ffSup = 0, all = 0, len = 0, errs = 0, shots = 0, kills = 0; const tac = {};
for (let g = 0; g < GAMES; g++) {
  const T = loadGame();
  const wrap = (name, fn) => { const orig = T.__get(name); T.__set(name, fn(orig)); };
  wrap('harm', o => function (u, amt, by, op) {
    if (u && amt > 0 && T.G.units.includes(u)) { all += amt;
      if (by && by !== u && by.nat === u.nat) ff += amt;
      else if (!by && T.G._supN && T.G._supN.n === u.nat) ffSup += amt; }
    return o(u, amt, by, op); });
  wrap('rtShoot', o => function (a, d) { shots++; return o(a, d); });
  wrap('kill', o => function (u, by) { if (by) kills++; return o(u, by); });
  await playAI(T, { size: SIZE, seed: S0 + g });
  len += T.G.time; errs += (T.G.errs || []).length;
  for (const [k, v] of Object.entries(T.G.tac || {})) if (k.startsWith('ff')) tac[k] = (tac[k] || 0) + v;
}
const f = v => (v / GAMES).toFixed(1);
console.log(`${GAMES}판 (${SIZE}) · 평균 ${(len / GAMES / 60).toFixed(1)}분 · 오류 ${errs}`);
console.log(`판당 피해 ${f(all)} · 아군이 쏜 피해 ${f(ff)} · 우리 화력 지원이 아군에게 ${f(ffSup)} (${(100 * (ff + ffSup) / Math.max(1, all)).toFixed(2)}%)`);
console.log(`판당 사격 ${f(shots)} · 격파 ${f(kills)}`);
console.log('판당 보류:', JSON.stringify(Object.fromEntries(Object.entries(tac).map(([k, v]) => [k, +f(v)]))));
