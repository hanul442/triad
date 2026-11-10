// 상륙 미션에서 아군(블루)이 해변·출구에서 막혀 서 있는 곳을 찾는다.
// node tools/landjam.mjs [판 수] [id] [v]
// 판마다: 승패, 끝난 시각, '막힘'(지상 부대가 갈 곳(path/dest)이 있는데 30초 동안 0.5칸도 못 간 경우) 횟수와 자리.
import { loadGame, seedRandom } from '../test/harness.mjs';
const s0 = +(process.env.S0 || 100), n = +(process.argv[2] || 4), id = process.argv[3] || 'omaha', verbose = process.argv[4] === 'v';
const AV = [], AI = []; let VS = 0, VN = 0, IS = 0, IN = 0;
let wins = 0, tJam = 0, tSamp = 0, tEnd = 0; const where = {}, why = {};
for (let g = 0; g < n; g++) {
  const T = loadGame(); seedRandom(T, s0 + g);
  if (process.env.MODE === 'auto') { T.__get('campStart')(id); T.__get('autoSet')(0, true); } else T.__get('specStart')({ map: 'camp:' + id });
  const G = T.G, UT = T.UT; const hist = new Map(); let jam = 0, samp = 0, jamVeh = 0;
  const shoreX = G.camp.shore; const upX = id === 'omaha' ? 16 : shoreX + 2; const born = new Map(), upT = new Map();
  for (let i = 0; i < 20000 && !G.over; i++) {
    T.rtTick(0.1);
    if (i % 50 !== 0) continue;   // 5초마다
    for (const u of G.units) {
      if (u.nat !== 0 || UT[u.type].fly) continue;
      if (!born.has(u.id)) born.set(u.id, G.time); if (!upT.has(u.id) && u.x >= upX) upT.set(u.id, G.time - born.get(u.id));
      const h = hist.get(u.id) || []; h.push([G.time, u.x, u.z]); if (h.length > 7) h.shift(); hist.set(u.id, h);
      if (h.length < 7) continue;
      const a = h[0], moved = Math.hypot(u.x - a[1], u.z - a[2]);
      const want = (u.path && u.path.length) || (u.dest && Math.hypot(u.dest[0] - u.x, u.dest[1] - u.z) > 1.5);
      if (u.x > shoreX + 14) continue;   // 해안 지대만 본다
      samp++;
      if (moved < .5 && want) {
        jam++; const veh = UT[u.type].cls === 'veh'; if (veh) jamVeh++;
        const t = G.map[Math.floor(u.z)][Math.floor(u.x)];
        const zone = t.sea ? 'sea' : (t.sand || t.wall || t.pier || t.mudz) ? 'shore' : t.bluff ? 'bluff' : t.t;
        const k = (veh ? 'veh ' : 'inf ') + zone + ' x' + Math.floor(u.x - shoreX);
        where[k] = (where[k] || 0) + 1;
        const fr = (G.forts || []).filter(f => Math.hypot(f.x - u.x, f.z - u.z) < 1.2).map(f => f.k + (f.nat === 0 ? '0' : ''));
        const wk = (veh ? 'veh:' : 'inf:') + (fr.length ? [...new Set(fr)].join('+') : 'none') + (u.supp ? ' supp' : '') + (u.tgt ? ' tgt' : '');
        why[wk] = (why[wk] || 0) + 1;
        if (verbose && (i % 300 === 0)) console.log(`  t=${Math.round(G.time)} ${u.type}#${u.id} x=${u.x.toFixed(2)} z=${u.z.toFixed(2)} ${zone} path=${u.path ? u.path.length : 0} dest=${u.dest ? u.dest.map(v => v.toFixed(1)) : '-'} near=${fr}`);
      }
    }
  }
  const lv = [...born.keys()].filter(k => { const u = G.units.find(o => o.id === k); return u && UT[u.type].cls === 'veh'; });
  const vUp = lv.filter(k => upT.has(k)).map(k => upT.get(k)), vStuck = lv.filter(k => !upT.has(k) && G.time - born.get(k) > 60).length;
  const li = [...born.keys()].filter(k => { const u = G.units.find(o => o.id === k); return u && UT[u.type].cls === 'inf'; });
  const iUp = li.filter(k => upT.has(k)).map(k => upT.get(k)), iStuck = li.filter(k => !upT.has(k) && G.time - born.get(k) > 60).length;
  const avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : '-';
  AV.push(...vUp); AI.push(...iUp); VS += vStuck; VN += lv.filter(k => upT.has(k) || G.time - born.get(k) > 60).length; IS += iStuck; IN += li.filter(k => upT.has(k) || G.time - born.get(k) > 60).length;
  console.log(`   alive veh: up ${vUp.length} (avg ${avg(vUp)}s to leave beach), stuck on beach >60s ${vStuck}; inf: up ${iUp.length} (avg ${avg(iUp)}s), stuck ${iStuck}`);
  if (verbose) for (const u of G.units) if (u.nat === 0 && UT[u.type].cls === 'veh' && !upT.has(u.id)) console.log(`     beach veh ${u.type}#${u.id} x=${u.x.toFixed(2)} z=${u.z.toFixed(2)} path=${u.path ? u.path.length : 0} hold=${!!u.hold} giveup=${!!u._gu}`);
  const win = G.over && G.over.win === 0; if (win) wins++;
  tJam += jam; tSamp += samp; tEnd += G.time;
  console.log(`game ${g}: ${win ? 'WIN' : 'lose'} t=${Math.round(G.time)} jam=${jam}/${samp} (${(jam / Math.max(1, samp) * 100).toFixed(1)}%, veh ${jamVeh}) obj=${G.objs.map(o => G.map[o.r][o.c].owner === 0 ? 'B' : 'R').join('')}`);
}
console.log(`\n${id}: blue wins ${wins}/${n}, mean end ${Math.round(tEnd / n)}s, jam ${(tJam / Math.max(1, tSamp) * 100).toFixed(1)}% of shore samples`);
const avg2 = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : '-';
console.log(`vehicles: avg ${avg2(AV)}s to leave beach, stuck ${VS}/${VN} (${(VS / Math.max(1, VN) * 100).toFixed(0)}%); infantry: avg ${avg2(AI)}s, stuck ${IS}/${IN}`);
console.log('where:', Object.entries(where).sort((a, b) => b[1] - a[1]).slice(0, 15));
console.log('why:', Object.entries(why).sort((a, b) => b[1] - a[1]).slice(0, 15));
