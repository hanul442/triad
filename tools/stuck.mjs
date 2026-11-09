// 멈춤 측정: 사람 세력(1번)의 부대에 플레이어처럼 이동 명령을 내리고, 제때 도착하는지 본다.
// 상대는 AI. 명령은 무전을 거치지 않고 바로 준다(움직임만 본다).
// 실패 = 시간 안에 목적지 1칸 안에 못 감. 원인을 나눠 센다:
//   nopath  명령 즉시 경로가 비었거나 목적지에서 먼 곳에서 끝남
//   stall   경로는 있는데 8초 동안 0.3칸도 못 움직임
//   slow    움직이긴 하는데 (경로 길이 ÷ 느린 속도 + 20초) 안에 못 감(맴돎)
//   gaveup  도중에 경로가 비어 섰음(도착 전)
// 병사 낙오: 분대원이 분대 점에서 2칸 넘게 10초 넘게 떨어진 경우.
// 사용: node tools/stuck.mjs [판 수=6] [크기=m] [초=360] [지형=city|port|country|forest]   (SEED0 환경변수로 시작 시드, VERB=1 실패마다 자세히)
import { loadGame, seedRandom } from '../test/harness.mjs';

const GAMES = +(process.argv[2] || 6), SIZE = process.argv[3] || 'm', SECS = +(process.argv[4] || 360), LAY = process.argv[5] || undefined, VERB = !!process.env.VERB;
const res = {}, cause = {}, ex = [];
let lag = 0, lagS = 0, errs = 0;
const inc = (o, k, v = 1) => (o[k] = (o[k] || 0) + v);
for (let g = 0; g < GAMES; g++) {
  const T = loadGame(); const seed = (+process.env.SEED0 || 5000) + g; seedRandom(T, seed);
  T.newGame({ slots: ['human', 'ai', 'none', 'none'], size: SIZE, diff: 'normal', fog: true, speed: 0, seed, layout: LAY === 'city' ? undefined : LAY });
  const G = T.G; const H = 0;
  // 사람 세력에 차량도 섞는다
  const sp = T.zoneSpots(H); let k = 12;
  for (const ty of ['tank', 'ifv', 'hmv', 'tank', 'eng', 'rifle', 'spg', 'sup']) { while (k < sp.length && T.mcost(ty, G.map[sp[k][0]][sp[k][1]]) === Infinity) k++; if (k < sp.length) T.mkUnit(H, ty, sp[k][0], sp[k][1]); k++; }
  const P = new Map(); const lagT = new Map();
  let rs = seed * 7919 >>> 0; const rnd = () => { rs = (rs * 1664525 + 1013904223) >>> 0; return rs / 4294967296; };
  const walk = (u, x, z) => T.__eval('walkable')(u, x, z);
  for (let i = 0; i < SECS * 10 && !G.over; i++) {
    T.rtTick(0.1);
    if (i % 10) continue;
    const now = G.time;
    for (const u of G.units) {
      if (u.nat !== H) continue; const t = T.UT[u.type]; if (t.fly || t.ind && u.type !== 'spg' || u.cas || u.towBy != null) continue;
      const cls = t.cls === 'veh' ? 'veh' : 'inf';
      let p = P.get(u.id);
      if (p && p.pend != null) {
        if (T.__get('radioPend')(u)) { if (now - p.pend > 40) { inc(res, cls + ':radiolost'); P.delete(u.id); u._probeIdle = now; } continue; }
        // 무전이 닿았다: 이제 경로를 본다
        const pl = u.path || []; const e = pl[pl.length - 1]; const tx = u.dest ? u.dest[0] : p.ox, tz = u.dest ? u.dest[1] : p.oz;
        if (!e || Math.hypot(e[0] - tx, e[1] - tz) > .6) { if (Math.hypot(u.x - tx, u.z - tz) < 1) inc(res, cls + ':ok'); else { inc(res, cls + ':unreach'); if (VERB) console.log('UNREACH', seed, now.toFixed(1), u.type, u.id, [u.x.toFixed(2), u.z.toFixed(2)], 'dest', [tx.toFixed(2), tz.toFixed(2)], 'end', e && [e[0].toFixed(2), e[1].toFixed(2)], 'len', pl.length); } P.delete(u.id); u._probeIdle = now; continue; }
        let L = 0, px = u.x, pz = u.z; for (const q of pl) { L += Math.hypot(q[0] - px, q[1] - pz); px = q[0]; pz = q[1]; }
        P.set(u.id, p = { x: e[0], z: e[1], t0: now, ax: u.x, az: u.z, bt: now, lim: L / (t.mv * .2 * .4) + 20, gone: 0 });
        continue;
      }
      if (p) {
        const d = Math.hypot(u.x - p.x, u.z - p.z);
        if (d < 1) { inc(res, cls + ':ok'); P.delete(u.id); continue; }
        if (Math.hypot(u.x - p.ax, u.z - p.az) > .3) { p.ax = u.x; p.az = u.z; p.bt = now; }
        const moving = u.path && u.path.length;
        if (!moving && !p.gone) { p.gone = now; p.gd = d; }
        if (moving) p.gone = 0;
        let fail = null;
        if (p.gone && now - p.gone > 3) fail = p.t0 === p.gone || now - p.t0 < 1.5 ? 'nopath' : 'gaveup';
        else if (now - p.bt > 8) fail = 'stall';
        else if (now - p.t0 > p.lim) fail = 'slow';
        if (fail) {
          inc(res, cls + ':fail'); inc(cause, cls + ':' + fail);
          const tl = T.cell(Math.floor(u.z), Math.floor(u.x));
          const near = G.units.filter(o => o !== u && !T.UT[o.type].fly && Math.hypot(o.x - u.x, o.z - u.z) < .8).length;
          ex.push({ g: seed, t: +now.toFixed(1), ty: u.type, id: u.id, fail, at: [+u.x.toFixed(2), +u.z.toFixed(2)], to: [+p.x.toFixed(2), +p.z.toFixed(2)], d: +d.toFixed(2), tile: tl.t + (tl.f != null ? '/' + tl.f : ''), near, supp: +(u.supp || 0).toFixed(1), blk: +(u._blk || 0).toFixed(1), ghN: u._ghN || 0, path: u.path?.length || 0, fl: u.fl || u.climb ? 1 : 0, tgt: u.tgt != null ? 1 : 0, cas: u.casV || 0 });
          P.delete(u.id); u._probeIdle = now;
        }
        continue;
      }
      // 쉬는 부대에 새 이동 명령: 3~12칸 떨어진 갈 수 있는 곳
      if (u.path && u.path.length) continue; if (u._probeIdle && now - u._probeIdle < 2) continue;
      if (rnd() > .25) continue;
      let x, z, tries = 0;
      do { const a = rnd() * 6.283, r = 3 + rnd() * 9; x = u.x + Math.cos(a) * r; z = u.z + Math.sin(a) * r; tries++; } while (tries < 30 && !(x > .5 && z > .5 && x < T.N - .5 && z < T.N - .5 && walk(u, x, z)));
      if (tries >= 30) continue;
      T.__get('radioSend')(H, [u], 'move', [x, z]); P.set(u.id, { pend: now, ox: x, oz: z });
    }
    // 분대원 낙오
    for (const u of G.units) {
      if (u.nat !== H || !u._men) continue;
      for (const m of u._men) { if (m.dead) continue; lagS++; const kk = u.id * 100 + m.i; const far = Math.hypot(m.x - u.x, m.z - u.z) > 2;
        if (far) { const s = lagT.get(kk) || now; lagT.set(kk, s); if (now - s > 10 && s > -1) { lag++; lagT.set(kk, Infinity); if (VERB) console.log('lag', seed, now, u.type, u.id, m.i, [m.x.toFixed(2), m.z.toFixed(2)], [u.x.toFixed(2), u.z.toFixed(2)]); } }
        else lagT.delete(kk); }
    }
  }
  errs += (G.errs || []).length;
}
const pc = (a, b) => (100 * a / Math.max(1, a + b)).toFixed(1) + '%';
console.log(`${GAMES}판 (${SIZE}, ${LAY || 'city'}, ${SECS}초) · AI 오류 ${errs}`);
for (const c of ['inf', 'veh']) console.log(`${c}: 도착 ${res[c + ':ok'] || 0}, 실패 ${res[c + ':fail'] || 0} (${pc(res[c + ':fail'] || 0, res[c + ':ok'] || 0)}), 길 없음(제외) ${res[c + ':unreach'] || 0}, 무전 안 닿음 ${res[c + ':radiolost'] || 0}`);
console.log('실패 원인:', JSON.stringify(cause));
const byT = {}; for (const e of ex) inc(byT, e.ty + ':' + e.fail); console.log('종류별:', JSON.stringify(byT));
console.log(`분대원 10초+ 낙오: ${lag}건`);
if (VERB) for (const e of ex) console.log(JSON.stringify(e));
