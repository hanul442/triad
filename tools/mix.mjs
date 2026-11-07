// 제병협동 측정: AI끼리 여러 판을 돌려 병종별 증원 수, 화력 지원 호출 수, 곡사 사격 수, 차량-보병 동행 비율을 센다.
// 사용: node tools/mix.mjs [판 수=8] [크기=m]
import { loadGame, playAI } from '../test/harness.mjs';

const GAMES = +(process.argv[2] || 8), SIZE = process.argv[3] || 'm';
const supN = {}, buys = {}, sups = {}, shots = {}, kills = {};
let len = 0, vehT = 0, vehEsc = 0, errs = 0;
const inc = (o, k, v = 1) => (o[k] = (o[k] || 0) + v);
for (let g = 0; g < GAMES; g++) {
  const T = loadGame();
  const wrap = (name, fn) => { const orig = T.__get(name); T.__set(name, fn(orig)); };
  wrap('buy', o => function (n, t, r, c) { const u = o(n, t, r, c); if (u) inc(buys, t); return u; });
  wrap('support', o => function (n, k, r, c) { const ok = o(n, k, r, c); if (ok) inc(sups, k); return ok; });
  wrap('rtShoot', o => function (a, d) { inc(shots, a.type); return o(a, d); });
  wrap('kill', o => function (u, by) { if (by) inc(kills, by.type); return o(u, by); });
  // 지상 차량이 보병 3칸 안에서 움직이는 비율(10틱마다 표본)
  const check = G => { for (const v of G.units) { const t = T.UT[v.type]; if (t.cls !== 'veh' || t.ind || !v.path?.length) continue; vehT++;
    if (G.units.some(i => i.nat === v.nat && T.UT[i.type].cls === 'inf' && Math.hypot(i.x - v.x, i.z - v.z) < 3)) vehEsc++; } };
  await playAI(T, { size: SIZE, seed: 2000 + g, check });
  for (const n of T.G.order) for (const [k, v] of Object.entries(T.G.nats[n].supN || {})) inc(supN, k, v);
  len += T.G.time; errs += (T.G.errs || []).length;
}
const per = o => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, +(v / GAMES).toFixed(1)]));
console.log(`${GAMES}판 (${SIZE}) · 평균 ${(len / GAMES / 60).toFixed(1)}분 · AI 오류 ${errs}`);
console.log('판당 증원:', JSON.stringify(per(buys)));
console.log('판당 화력 지원:', JSON.stringify(per(sups)));
console.log('  (AI 집계):', JSON.stringify(per(supN)));
console.log('판당 사격(병종):', JSON.stringify(per(shots)));
console.log('판당 격파(병종):', JSON.stringify(per(kills)));
console.log(`이동 중인 차량 중 보병 동행 비율: ${(100 * vehEsc / Math.max(1, vehT)).toFixed(0)}%`);
