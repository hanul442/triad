// 대공 측정: 빈 지도에서 공격헬기(또는 드론·전투기)를 부르고, 적 대공 수단이 실제로 발견·사격·격추하는지 센다.
//   node tools/aa.mjs [trials=40] [fog=1]
import { loadGame, seedRandom } from '../test/harness.mjs';
const trials = +(process.argv[2] || 40), fog = (process.argv[3] ?? '1') !== '0';
function setup(T, seed) {
  T.newGame({ slots: ['human', 'human', 'none', 'none'], size: 'm', seed: 3, fog });
  const G = T.G; G.units = []; G.props = []; G.covers = []; G.wx = 'clear';
  for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) G.map[r][c] = { t: 'road', owner: null, obj: null, smoke: 0 };
  T.bump(); seedRandom(T, seed); return G;
}
function run(shooter, dist, kind = 'gunship') {
  let seenN = 0, fired = 0, down = 0, tSum = 0, flare = 0, rtb = 0;
  for (let i = 0; i < trials; i++) {
    const T = loadGame(); const G = setup(T, 1000 + i); const N = T.N;
    const r = Math.floor(N / 2), c = Math.floor(N / 2);
    // 표적(아군 0이 지키는 소총분대) 위로 1이 헬기를 부른다. 대공은 0 쪽, 표적에서 dist칸.
    const bait = T.mkUnit(0, 'rifle', r, c); bait.hold = true; bait.hp = 1e9;
    const aa = T.mkUnit(0, shooter, r, Math.min(N - 1, c + dist)); aa.hold = true;
    const spot = T.mkUnit(1, 'drone', 2, 2); spot.hold = true; spot.hp = 1e9;
    G.nats[1].cp = 99; G.nats[0].cp = 0;
    let h;
    if (kind === 'gunship') { h = T.__get('callGunship')(1, r, c); }
    else if (kind === 'drone') { h = T.mkUnit(1, 'drone', r, c - 2); h.hold = true; }
    else if (kind === 'fpv') { h = T.mkUnit(1, 'fpv', r, c - 6); h.tgt = bait.id; }
    h.flares0 = h.flares; const id = h.id; let saw = 0, f0 = 0, t0 = G.time, dn = 0;
    for (let k = 0; k < 600; k++) {
      bait.cd = 1e9; T.rtTick(0.1);
      if (!saw && (!G.fog || T.seen(h, 0))) saw = 1;
      if (aa.lastShot && aa.lastShot.tgt === id) f0 = 1;
      if (!G.units.includes(h) || (h.air && h.air.leave && G.time < h.air.until - .5)) { dn = G.nats[0].kills > 0 ? 1 : 0; break; }
      if (!G.units.includes(aa)) break;
    }
    if (dn) tSum += G.time - t0;
    seenN += saw; fired += f0; down += dn; flare += (h.flares0 ?? 0) - (h.flares ?? 0); if (!dn && h.air && h.air.leave && G.time < h.air.until - .5) rtb++;
  }
  return { shooter, dist, kind, seen: seenN / trials, fired: fired / trials, down: down / trials, rtb: rtb / trials, t: down ? +(tSum / down).toFixed(1) : '-', flares: +(flare / trials).toFixed(2) };
}
const rows = [];
for (const s of (process.env.S||"aa,zu,mg,rifle,ifv").split(",")) for (const d of (process.env.D||"3,8,14,20").split(",").map(Number)) rows.push(run(s, d));
for (const d of [3, 10]) rows.push(run('aa', d, 'drone'));
console.table(rows);
