// 뚫고 지나감 측정: AI끼리 여러 판을 돌려 1초마다
//  - 지상 차량 차체(사각형)가 건물·물 칸, 막는 소품(주차 차·컨테이너·방벽·통나무…), 다른 차량 차체와 겹친 표본
//  - 보병 분대원(병사 한 명 한 명)이 막는 소품 안에 서 있는 표본
// 을 센다. 얕은 스침(5cm 이하)은 빼고 센다.
// 사용: node tools/clip.mjs [판 수=4] [크기=m] [지형=city,port,country,forest]   (SEED0 환경변수로 시작 시드)
import { loadGame, seedRandom, playAI } from '../test/harness.mjs';

const GAMES = +(process.argv[2] || 4), SIZE = process.argv[3] || 'm', LAYS = (process.argv[4] || 'city,port,country,forest').split(','), VERB = !!process.env.VERB;
const C = {}; const inc = (k, v = 1) => (C[k] = (C[k] || 0) + v);
const ex = [];
for (const lay of LAYS) for (let g = 0; g < GAMES; g++) {
  const T = loadGame(); const seed = (+process.env.SEED0 || 6000) + g; seedRandom(T, seed);
  const ev = T.__eval;
  const VEH = ev('VEH'), NAV_RULE = ev('NAV_RULE'), inBox = T.inBox, navCls = ev('navCls');
  const spec = u => VEH[u.type] || { hl: .25, hw: .11 };
  // 사각형 두 개(중심·반길이·반폭·각도)의 겹친 깊이(분리축). 0이면 안 겹침
  const corners = (x, z, hl, hw, a) => { const c = Math.cos(a), s = Math.sin(a); return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([i, j]) => [x + c * i * hl - s * j * hw, z + s * i * hl + c * j * hw]); };
  const sat = (A, B) => { let m = 1e9; for (const P of [A, B]) for (let i = 0; i < 4; i++) { const [x1, z1] = P[i], [x2, z2] = P[(i + 1) % 4]; let nx = z1 - z2, nz = x2 - x1; const l = Math.hypot(nx, nz); nx /= l; nz /= l;
    let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9; for (const [x, z] of A) { const p = x * nx + z * nz; a0 = Math.min(a0, p); a1 = Math.max(a1, p); } for (const [x, z] of B) { const p = x * nx + z * nz; b0 = Math.min(b0, p); b1 = Math.max(b1, p); }
    m = Math.min(m, Math.min(a1, b1) - Math.max(a0, b0)); if (m <= 0) return 0; } return m; };
  const check = G => {
    const obs = ev('NAV').obs || [];
    const vs = G.units.filter(u => { const t = T.UT[u.type]; return t.cls === 'veh' && !t.fly && u.hd != null; });
    for (const u of vs) {
      const s = spec(u), a = (u.hd) * Math.PI / 180, A = corners(u.x, u.z, s.hl, s.hw, a), cls = navCls(u); inc('veh'); const ghost = u._gh > G.time;
      if (ghost) inc('veh:ghost');
      // 건물·물 칸
      let wb = 0; for (let r = Math.floor(u.z - .4); r <= Math.floor(u.z + .4); r++) for (let c = Math.floor(u.x - .4); c <= Math.floor(u.x + .4); c++) { const t = G.map[r]?.[c]; if (t && T.mcost(u.type, t) < Infinity) continue; wb = Math.max(wb, sat(A, [[c, r], [c + 1, r], [c + 1, r + 1], [c, r + 1]])); }
      if (wb > .05 / 12 * 1) { inc('veh:bldg'); if (wb > .1) inc('veh:bldg-deep'); }
      // 막는 소품
      let ob = 0, ok = ''; for (const o of obs) { if (Math.abs(o.x - u.x) > 1 || Math.abs(o.z - u.z) > 1) continue; const rl = NAV_RULE[o.k]; if (!rl || rl[cls] !== 2) continue; const d = sat(A, corners(o.x, o.z, o.hl, o.hw, -o.ry)); if (d > ob) { ob = d; ok = o.k; } }
      if (ob > .05 / 12) { inc('veh:prop'); inc('veh:prop:' + ok); if (ob > .1) inc('veh:prop-deep'); if (VERB && ob > .1 && ex.length < 30) ex.push({ lay, seed, t: G.time.toFixed(1), u: u.type, id: u.id, k: ok, d: ob.toFixed(2), ghost, at: [u.x.toFixed(2), u.z.toFixed(2)], path: u.path?.length || 0 }); }
      // 다른 차량
      let vv = 0; for (const o of vs) { if (o === u || Math.abs(o.x - u.x) > 1 || Math.abs(o.z - u.z) > 1 || o.towBy === u.id || u.towBy === o.id) continue; const so = spec(o); vv = Math.max(vv, sat(A, corners(o.x, o.z, so.hl, so.hw, o.hd * Math.PI / 180))); }
      if (vv > .05 / 12) { inc('veh:veh'); if (vv > .1) inc('veh:veh-deep'); }
    }
    for (const u of G.units) {
      if (!u._men || T.UT[u.type].cls !== 'inf') continue;
      for (const m of u._men) { if (m.dead) continue; inc('man');
        for (const o of obs) { if (Math.abs(o.x - m.x) > .6 || Math.abs(o.z - m.z) > .6) continue; const rl = NAV_RULE[o.k]; if (!rl || rl.inf !== 2) continue; if (inBox(o, m.x, m.z, -.01)) { inc('man:prop'); inc('man:prop:' + o.k); break; } }
        const t = G.map[Math.floor(m.z)]?.[Math.floor(m.x)]; if (t && t.t === 'water') inc('man:water'); }
    }
  };
  await playAI(T, { size: SIZE, seed, layout: lay === 'city' ? undefined : lay, check, slots: ['ai', 'ai', 'none', 'none'] });
  inc('games');
}
const pc = (k, b) => `${k} ${(100 * (C[k] || 0) / Math.max(1, C[b])).toFixed(2)}%`;
console.log(`${C.games}판 (${SIZE}, ${LAYS.join('/')}) · 차량 표본 ${C.veh || 0}, 병사 표본 ${C.man || 0}`);
console.log('차량:', ['veh:ghost', 'veh:bldg', 'veh:bldg-deep', 'veh:prop', 'veh:prop-deep', 'veh:veh', 'veh:veh-deep'].map(k => pc(k, 'veh')).join(' · '));
console.log('차량-소품 종류:', JSON.stringify(Object.fromEntries(Object.entries(C).filter(([k]) => k.startsWith('veh:prop:')))));
console.log('병사:', ['man:prop', 'man:water'].map(k => pc(k, 'man')).join(' · '), JSON.stringify(Object.fromEntries(Object.entries(C).filter(([k]) => k.startsWith('man:prop:')))));
if (VERB) for (const e of ex) console.log(JSON.stringify(e));
