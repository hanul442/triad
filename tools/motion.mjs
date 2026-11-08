// 차량·헬기 움직임 측정: AI끼리 여러 판을 돌려 차체가 건물에 파고든 비율, 차체 회전 속도, 사격 때 포탑-표적 어긋남,
// 갇힌 차량, 공격헬기가 목표 위에 떠 있는 비율을 센다.
// 사용: node tools/motion.mjs [판 수=6] [크기=m]
import { loadGame, playAI } from '../test/harness.mjs';

const GAMES = +(process.argv[2] || 6), SIZE = process.argv[3] || 'm';
// 차체 반길이·반폭(칸). 1칸 ≈ 12m
const HULL = { tank: [.33, .15], ifv: [.29, .135], hmv: [.2, .095], spg: [.32, .14], zu: [.22, .095], mlrs: [.3, .11], sup: [.3, .11], rec: [.33, .12] };
const hd = (a, b) => { let d = (a - b) % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return d; };
let longStuck = 0, vs = 0, clip = 0, deep = 0, fastTurn = 0, turnS = 0, shotsV = 0, offAim = 0, stuck = 0, movingS = 0, gunS = 0, gunOver = 0, gunD = 0, len = 0, errs = 0, vk = 0;
for (let g = 0; g < GAMES; g++) {
  const T = loadGame();
  const pen = (u, x, z, f) => { const h = HULL[u.type] || [.25, .11]; const a = f * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); let n = 0, worst = 0;
    for (const [lx, lz] of [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const px = x + c * lx * h[0] - s * lz * h[1], pz = z + s * lx * h[0] + c * lz * h[1]; const r = Math.floor(pz), cc = Math.floor(px);
      const t = r >= 0 && cc >= 0 && r < T.N && cc < T.N ? T.G.map[r][cc] : null;
      if (!t || T.mcost(u.type, t) === Infinity) { n++; } }
    return n; };
  const prev = new Map(), lastP = new Map();
  T.__set('rtShoot', (o => function (a, d) { const t = T.UT[a.type]; if (t.cls === 'veh' && !t.ind) { shotsV++; const want = Math.atan2(d.z - a.z, d.x - a.x) * 180 / Math.PI; const tf = a.tf ?? a.face; if (Math.abs(hd(want, tf)) > 15) offAim++; } return o(a, d); })(T.__get('rtShoot')));
  T.__set('kill', (o => function (u, by) { if (T.UT[u.type].cls === 'veh') vk++; return o(u, by); })(T.__get('kill')));
  const check = G => {
    for (const u of G.units) { const t = T.UT[u.type];
      if (t.cls === 'veh') { vs++; const p = pen(u, u.x, u.z, u.face || 0); if (p) clip++; if (p >= 2) deep++;
        const pv = prev.get(u.id); if (pv) { const dt = G.time - pv.t; if (dt > 0) { turnS++; if (Math.abs(hd(u.face || 0, pv.f)) / dt > 90) fastTurn++; }
          if (u.path?.length && !(u.vd && u.vd.mob)) { movingS++; if (Math.hypot(u.x - pv.x, u.z - pv.z) < .01 && Math.abs(hd(u.hd ?? u.face ?? 0, pv.h)) < 2) stuck++; } }
        // 10초 넘게 제자리(이동 명령 중): 한 번만 센다
        const lp = lastP.get(u.id); if (!lp || Math.hypot(u.x - lp.x, u.z - lp.z) > .15 || !u.path?.length || (u.vd && u.vd.mob)) lastP.set(u.id, { x: u.x, z: u.z, t: G.time, n: 0 });
        else if (G.time - lp.t > 10 && !lp.n) { lp.n = 1; longStuck++; }
        prev.set(u.id, { t: G.time, f: u.face || 0, h: u.hd ?? u.face ?? 0, x: u.x, z: u.z }); }
      if (u.type === 'gunship' && u.air && !u.air.leave) { gunS++; const d = Math.hypot(u.x - u.air.cx, u.z - u.air.cz); gunD += d; if (d < 1.2) gunOver++; } } };
  await playAI(T, { size: SIZE, seed: (+process.env.SEED0 || 3000) + g, check });
  len += T.G.time; errs += (T.G.errs || []).length;
}
const pc = (a, b) => (100 * a / Math.max(1, b)).toFixed(1) + '%';
console.log(`${GAMES}판 (${SIZE}) · 평균 ${(len / GAMES / 60).toFixed(1)}분 · AI 오류 ${errs} · 판당 차량 격파 ${(vk / GAMES).toFixed(1)}`);
console.log(`차체가 건물·물에 걸친 표본: ${pc(clip, vs)} (깊게 ${pc(deep, vs)})`);
console.log(`1초에 90° 넘게 홱 돈 표본: ${pc(fastTurn, turnS)}`);
console.log(`차량 사격 중 포탑이 표적에서 15° 넘게 어긋난 채 쏜 비율: ${pc(offAim, shotsV)} (${shotsV}발)`);
console.log(`이동 명령 중 1초 동안 움직이지도 돌지도 않은 표본: ${pc(stuck, movingS)} · 10초 넘게 갇힌 차량 판당 ${(longStuck / GAMES).toFixed(2)}대`);
console.log(`공격헬기: 목표 지점 평균 거리 ${(gunD / Math.max(1, gunS)).toFixed(2)}칸, 목표 1.2칸 안 머무름 ${pc(gunOver, gunS)} (${gunS}표본)`);
