// 시작 갇힘 실전 검사: AI끼리 판을 시작해 처음 N초 동안, 길을 받고도 출발 자리에서 거의 못 벗어난 지상 부대를 센다.
// 사용: node tools/startmove.mjs [판 수=2] [크기들=s,m,l] [초=120] [지도들=전부]   VERB=1 자세히
import { loadGame, seedRandom } from '../test/harness.mjs';
const NG = +(process.argv[2] || 2), SZ = (process.argv[3] || 's,m,l').split(','), SECS = +(process.argv[4] || 120), VERB = !!process.env.VERB;
const T0 = loadGame();
const LAYS = process.argv[5] ? process.argv[5].split(',') : T0.__eval('BM_LAYOUTS').concat(T0.__eval("typeof genAlpine==='function'") ? ['alpine'] : []);
let tot = 0, bad = 0; const by = {}, byT = {};
for (const lay of LAYS) for (const size of SZ) for (let g = 0; g < NG; g++) {
  const T = loadGame(); const seed = 9100 + g * 77; seedRandom(T, seed);
  T.newGame({ slots: ['ai', 'ai', 'ai', 'ai'], size, diff: 'normal', fog: true, speed: 0, seed, layout: lay });
  const G = T.G; const st = new Map();
  for (const u of G.units) { const t = T.UT[u.type]; if (t.fly) continue; st.set(u.id, { u, x: u.x, z: u.z, far: 0, want: 0 }); }
  for (let i = 0; i < SECS * 10 && !G.over; i++) { T.rtTick(0.1); if (i % 5) continue;
    for (const s of st.values()) { const u = s.u; if (!G.units.includes(u)) { s.dead = 1; continue; }
      s.far = Math.max(s.far, Math.hypot(u.x - s.x, u.z - s.z));
      if (u.path && u.path.length && !u.climb && (u.supp || 0) < 1.6) s.want += .5; } }
  for (const s of st.values()) { if (s.dead) continue; tot++;
    if (s.want >= 30 && s.far < 2.5) { bad++; by[`${lay}/${size}`] = (by[`${lay}/${size}`] || 0) + 1; byT[s.u.type] = (byT[s.u.type] || 0) + 1;
      if (VERB) console.log('STUCK', lay, size, seed, 'nat', s.u.nat, s.u.type, 'at', s.x.toFixed(1), s.z.toFixed(1), 'far', s.far.toFixed(1), 'want', s.want); } }
}
console.log('살아 있는 출발 지상 부대', tot, `길을 받고도 ${SECS}초 동안 2.5칸 못 벗어남`, bad, `(${(bad / tot * 100).toFixed(2)}%)`);
console.log(by, byT);
