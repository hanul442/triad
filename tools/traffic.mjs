// 실제 지도 교통 시험: 진짜 지도(시가지·항구·교외·공업·구시가·운하·시골·숲)에서
//   swap   두 무리(차량 4 + 분대 4)가 서로 상대 자리로 간다(같은 길에서 마주 오고, 길이 겹친다)
//   block  길 한가운데 선 차량(움직이지 않음) 너머로 무리가 간다(우회해야 한다)
//   cross  네 무리가 교차로를 가운데 두고 서로 맞은편으로 간다(길이 엇갈린다)
// 판마다 늦게 온 정도·못 간 부대·차체가 겹친 표본을 센다.
// 사용: node tools/traffic.mjs [장면=swap,block,cross] [판 수=8] [초=150]   (SEED0 시작 시드, VERB=1 못 간 부대)
import { fork } from 'node:child_process';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { loadGame, seedRandom } from '../test/harness.mjs';

const LAYS = [undefined, 'port', 'sub', 'ind', 'old', 'canal', 'country', 'forest'];
const VEHS = ['tank', 'ifv', 'hmv', 'tank'], INFS = ['rifle', 'mg', 'rifle', 'at'];

function setup(T, seed, lay) {
  T.newGame({ slots: ['human', 'human', 'none', 'none'], size: 'm', diff: 'normal', fog: false, speed: 0, seed, layout: lay });
  const G = T.G; G.units = []; G.wx = 'clear';
  const ev = T.__eval; const vOk = ev('typeof vCompOk==="function"?vCompOk:null');
  const navCost = ev('navCost');
  // 차가 다닐 수 있는 도로 칸(큰 무리에 속한 칸)
  const roads = [];
  for (let r = 2; r < T.N - 2; r++) for (let c = 2; c < T.N - 2; c++) { const t = G.map[r][c].t; if (t !== 'road' && t !== 'plaza') continue;
    if (!(navCost('veh', c + .5, r + .5) > 0)) continue; roads.push([c + .5, r + .5]); }
  return { G, roads };
}
// 점 근처에 부대 무리를 놓는다(차량은 차가 설 수 있는 칸, 보병은 걸을 수 있는 칸)
function place(T, nat, types, x0, z0) {
  const walk = T.__eval('walkable'), hullPen = T.__eval('hullPen'), vInit = T.__eval('vInit'), isGV = T.__eval('isGV');
  const out = [];
  for (const ty of types) {
    let ok = null;
    for (let rad = 0; rad < 4 && !ok; rad += .35) for (let k = 0; k < 12 && !ok; k++) { const a = k * Math.PI / 6 + rad, x = x0 + Math.cos(a) * rad, z = z0 + Math.sin(a) * rad;
      const r = Math.floor(z), c = Math.floor(x); if (r < 1 || c < 1 || r >= T.N - 1 || c >= T.N - 1) continue;
      if (T.mcost(ty, T.G.map[r][c]) === Infinity) continue;
      const u = T.mkUnit(nat, ty, r, c); u.x = x; u.z = z; u.r = r; u.c = c;
      const bad = !walk(u, x, z) || out.some(o => Math.hypot(o.x - x, o.z - z) < (isGV(o) || isGV(u) ? .75 : .45)) || (isGV(u) && (vInit(u), hullPen(u, x, z, u.hd) > 0));
      if (bad) { T.G.units.splice(T.G.units.indexOf(u), 1); continue; }
      ok = u; }
    if (ok) out.push(ok);
  }
  return out;
}
function farPair(roads, rnd, dmin, dmax) {
  for (let t = 0; t < 400; t++) { const a = roads[(rnd() * roads.length) | 0], b = roads[(rnd() * roads.length) | 0]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (d >= dmin && d <= dmax) return [a, b]; }
  return null;
}
function hullOverlap(T, G) { const vv = T.__eval('vVehPen'), isGV = T.__eval('isGV'); let n = 0;
  for (const u of G.units) if (isGV(u) && u.hd != null && vv(u, u.x, u.z, u.hd) > .05) n++; return n; }

export function run(scene, seed, secs) {
  const T = loadGame(); seedRandom(T, seed); const lay = LAYS[seed % LAYS.length];
  const { G, roads } = setup(T, seed, lay);
  let rs = seed * 7919 >>> 0; const rnd = () => { rs = (rs * 1664525 + 1013904223) >>> 0; return rs / 4294967296; };
  const groups = []; // [units, goalX, goalZ]
  const pathLen = T.__eval('u=>{let L=0,x=u.x,z=u.z;for(const p of u.path||[]){L+=Math.hypot(p[0]-x,p[1]-z);x=p[0];z=p[1];}return L;}');
  const solo = scene.endsWith('1'); scene = scene.replace(/1$/, '');
  // 끝에 1을 붙이면(swap1 등) 무리 대형 없이 부대마다 따로 명령한다(같은 자리 배치)
  const ord = (us, x, z) => { if (solo) { us.forEach((u, i) => { const a = i * 2.39996, r = .55 * Math.sqrt(i); let tx = x + Math.cos(a) * r, tz = z + Math.sin(a) * r; if (!T.__eval('walkable')(u, tx, tz)) { tx = x; tz = z; } T.orderMoveTo(u, tx, tz); }); } else T.orderGroupMove(us, x, z); for (const u of us) u.man = true; };
  if (scene === 'swap' || scene === 'block') {
    const P = farPair(roads, rnd, 14, 22); if (!P) return null; const [A, B] = P;
    const ga = place(T, 0, [...VEHS, ...INFS], A[0], A[1]);
    if (scene === 'swap') { const gb = place(T, 0, [...VEHS, ...INFS], B[0], B[1]); groups.push([ga, B[0], B[1]], [gb, A[0], A[1]]); }
    else {
      // 가장 짧은 길 가운데쯤에 선 차량 둘(서 있기만 한다)
      ord(ga, B[0], B[1]); const lead = ga.find(u => T.UT[u.type].cls === 'veh'); const pts = lead.path.slice(); let L = 0, x = lead.x, z = lead.z, mid = null; const tot = pathLen(lead);
      for (const p of pts) { const d = Math.hypot(p[0] - x, p[1] - z); if (L + d >= tot * .5) { const k = (tot * .5 - L) / d; mid = [x + (p[0] - x) * k, z + (p[1] - z) * k]; break; } L += d; x = p[0]; z = p[1]; }
      for (const u of ga) u.path = [];
      if (!mid) return null; const bl = place(T, 0, ['tank', 'sup'], mid[0], mid[1]); for (const u of bl) { u.hold = true; u.blocker = 1; }
      groups.push([ga, B[0], B[1]]);
    }
  } else if (scene === 'cross') {
    // 교차로: 도로 칸 중 네 방향이 다 도로인 곳
    const isR = (r, c) => { const t = G.map[r] && G.map[r][c] && G.map[r][c].t; return t === 'road' || t === 'plaza'; };
    const xs = roads.filter(([x, z]) => { const r = z | 0, c = x | 0; return isR(r - 3, c) && isR(r + 3, c) && isR(r, c - 3) && isR(r, c + 3) && r > 10 && c > 10 && r < T.N - 10 && c < T.N - 10; });
    if (!xs.length) return null; const [cx, cz] = xs[(rnd() * xs.length) | 0]; const D = 8;
    const ends = [[cx - D, cz], [cx + D, cz], [cx, cz - D], [cx, cz + D]];
    const gs = ends.map(([x, z]) => place(T, 0, ['tank', 'ifv', 'rifle', 'mg'], x, z));
    for (let i = 0; i < 4; i++) groups.push([gs[i], ends[i ^ 1][0], ends[i ^ 1][1]]);
  }
  // 혼자서도 못 가는 부대(다리 무게 제한·물길 등)는 교통 문제가 아니니 뺀다
  const reach = (u, x, z) => { const P = T.pathPts(u, x, z); const e = P[P.length - 1]; return !!e && Math.hypot(e[0] - x, e[1] - z) < 1.5; };
  for (const g of groups) g[0] = g[0].filter(u => { if (reach(u, g[1], g[2])) return true; G.units.splice(G.units.indexOf(u), 1); return false; });
  for (const [us, x, z] of groups) ord(us, x, z);
  const all = groups.flatMap(g => g[0].map(u => ({ u, gx: (u.fol && u.fol.end || u.dest || [g[1]])[0], gz: (u.fol && u.fol.end || u.dest || [0, g[2]])[1], L: pathLen(u), sp: T.UT[u.type].mv, t: null, stall: 0, lastP: [u.x, u.z, 0] })));
  const res = { n: all.length, arrive: 0, late: 0, ov: 0, ovS: 0, stall6: 0, ex: [], lay: lay || 'city' };
  let TK = 0;
  if (process.env.WHO) { for (const a of all) { const u = a.u; let P = u.path; Object.defineProperty(u, 'path', { configurable: true, enumerable: true, get() { return P; }, set(v) { P = v;
      if (v && v.length && Math.hypot(v[v.length - 1][0] - a.gx, v[v.length - 1][1] - a.gz) > 1.2 && process.env.DUMP && !u.fol && (a.dumped = (a.dumped || 0) + 1) < 3) { console.log('FAR', u.type, u.id, 'at', u.x.toFixed(2), u.z.toFixed(2), 'goal', a.gx, a.gz, 'end', v[v.length - 1].map(q => +q.toFixed(2)), 'len', v.length, 'reached', v.reached, 'cost@u', T.__eval('navCost')(T.__eval('navCls')(u), u.x, u.z), 'walk', T.__eval('walkable')(u, u.x, u.z), 'tile', G.map[u.z | 0][u.x | 0].t, new Error().stack.split('\n')[2]); }
      if (v && v.length && Math.hypot(v[v.length - 1][0] - a.gx, v[v.length - 1][1] - a.gz) > 1.2) a.lf = new Error().stack.split('\n').slice(2, 5).map(l => (l.match(/at (\S+)/) || [])[1] + ':' + ((l.match(/:(\d+):\d+\)?$/) || [])[1])).join(' < ') + (v.length) + ' g' + Math.hypot(v[v.length - 1][0] - a.gx, v[v.length - 1][1] - a.gz).toFixed(0);
      a.ls = { tk: TK, st: new Error().stack.split('\n').slice(2, 5).map(l => (l.match(/at (\S+)/) || [])[1] + ':' + ((l.match(/:(\d+):\d+\)?$/) || [])[1])).join(' < ') }; } }); } }
  let t = 0;
  for (let i = 0; i < secs * 10; i++) {
    if (process.env.WHO) for (const a of all) { const p = a.u.path; a.pe = p && p.length ? p[p.length - 1] : null; }
    TK++; T.rtTick(.1); t += .1;
    if (process.env.WHO) for (const a of all) { const u = a.u, p = u.path; if (a.t == null && a.pe && !(p && p.length) && Math.hypot(u.x - a.gx, u.z - a.gz) > 1.2) a.why = (a.ls && a.ls.tk === TK ? a.ls.st : 'shift ← ' + a.lf) + (u.fol ? ' [fol ' + u.fol.k + ']' : '') + ' e=' + (Math.hypot(a.pe[0] - a.gx, a.pe[1] - a.gz) > 1.2 ? 'far' : 'goal'); } G.units = G.units.filter(u => u.nat === 0);
    if (process.env.TRACE && i % (+process.env.TEV || 10) === 0 && t >= (+process.env.T0 || 0) && t <= (+process.env.T1 || 1e9)) for (const u of G.units) if (u.id === +process.env.TRACE) console.log(t.toFixed(0), u.type, 'end', JSON.stringify(u.fol&&u.fol.end), 'p0', JSON.stringify((u.path||[]).slice(-1)), u.x.toFixed(2), u.z.toFixed(2), 'p', (u.path || []).length, 'fol', u.fol ? u.fol.L + ':' + u.fol.k : '-', 'blk', (u._blk || 0).toFixed(1), 'stuck', u._stuckN || 0, 'yw', (u._yw||0).toFixed(1), 'hold', !!u.hold, 'dest', JSON.stringify(u.dest));
    if (process.env.SNAP && process.env.SNAP.split(',').includes(String(i / 10))) { const xs = G.units.map(u => u.x), zs = G.units.map(u => u.z); const x0 = Math.max(0, Math.floor(Math.min(...xs)) - 3), x1 = Math.min(T.N, Math.ceil(Math.max(...xs)) + 3), z0 = Math.max(0, Math.floor(Math.min(...zs)) - 3), z1 = Math.min(T.N, Math.ceil(Math.max(...zs)) + 3);
      const SC = 3; const rows = []; const ch = { road: '.', plaza: ',', bldg: '#', water: '~', park: '"', grass: ' ', rubble: ':', forest: 'f', field: ' ' };
      for (let z = z0 * SC; z < z1 * SC; z++) { let line = ''; for (let x = x0 * SC; x < x1 * SC; x++) { const t = G.map[(z / SC) | 0][(x / SC) | 0].t; line += ch[t] ?? '?'; } rows.push(line.split('')); }
      for (const u of G.units) { const gi = all.findIndex(a => a.u === u); const g = gi < 0 ? 'X' : String.fromCharCode((T.UT[u.type].cls === 'veh' ? 65 : 97) + groups.findIndex(gr => gr[0].includes(u)) * 8 + (gi % 8)); const zz = Math.floor((u.z - z0) * SC), xx = Math.floor((u.x - x0) * SC); if (rows[zz] && rows[zz][xx] != null) rows[zz][xx] = g; }
      console.log('t=' + (i / 10), 'x0', x0, 'z0', z0); console.log(rows.map(r => r.join('')).join('\n')); }
    if (i % 10) continue;
    res.ov += hullOverlap(T, G); res.ovS++;
    if (process.env.STATE) { res.st = res.st || {}; const FL = T.__eval('formLead'), FP = T.__eval('formPace'); for (const a of all) { if (a.t != null || !G.units.includes(a.u)) continue; const u = a.u; const mv = Math.hypot(u.x - (a.px ?? u.x), u.z - (a.pz ?? u.z)); a.px = u.x; a.pz = u.z;
        const veh = T.UT[u.type].cls === 'veh'; let k = veh ? 'V ' : 'I ';
        if (mv > .25) k += 'moving'; else if (!(u.path && u.path.length)) k += u.fol ? 'fol-idle' : 'nopath'; else if (FL.has(u.id) && FP(u) <= 0) { k += 'lead-wait'; let mf = null; for (const f of G.units) if (f.fol && (f._fLag || 0) > (mf ? mf._fLag : 0)) { let R = f, g = 0; while (R.fol && g++ < 10) { const q = G.units.find(o => o.id === R.fol.L); if (!q) break; R = q; } if (R === u) mf = f; }
          if (mf) { const fa = all.find(q => q.u === mf); const mm = fa && fa.qx != null ? Math.hypot(mf.x - fa.qx, mf.z - fa.qz) : 1; if (process.env.EXLAG && mm < .25 && mf.path && mf.path.length && (res.exl = (res.exl || 0) + 1) < 5) console.log('LAG', seed, t.toFixed(0), 'lead', u.type + '#' + u.id, u.x.toFixed(2), u.z.toFixed(2), 'f', mf.type + '#' + mf.id, mf.x.toFixed(2), mf.z.toFixed(2), 'lag', mf._fLag.toFixed(2), 'path', JSON.stringify((mf.path || []).map(q => q.map(v => +v.toFixed(2)))), 'supp', mf.supp || 0, 'blk', mf._blk || 0, 'job', mf.job || '', 'cqb', !!mf.cqb, 'tile', G.map[mf.z | 0][mf.x | 0].t);
          k += ' ← lag ' + (T.UT[mf.type].cls === 'veh' ? 'V' : 'I') + ':' + mf.fol.k + (mf.path && mf.path.length ? (mm > .25 ? ':moving' : ':stuck') : ':nopath') + (mf._fLag > 5 ? ':far' : ''); } } else if (FL.has(u.id) && FP(u) < .5) k += 'lead-slow';
        else { let bl = null; const p = u.path[0]; let dx = p[0] - u.x, dz = p[1] - u.z; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
          for (const o of G.units) { if (o === u) continue; const ox = o.x - u.x, oz = o.z - u.z, d = Math.hypot(ox, oz); const R = (veh || T.UT[o.type].cls === 'veh') ? 1.0 : .7; if (d < R && ox * dx + oz * dz > -.05) { bl = o; break; } }
          k += bl ? 'blocked-by-' + (T.UT[bl.type].cls === 'veh' ? 'veh' : 'inf') + (all.find(q => q.u === bl) && groups.findIndex(g => g[0].includes(bl)) === groups.findIndex(g => g[0].includes(u)) ? '-own' : '-other') + (bl.path && bl.path.length ? '-mov' : '-idle') : (mv > .05 ? 'slow' : 'stuck-terrain'); }
        if (u.fol) k += ' (fol)'; res.st[k] = (res.st[k] || 0) + 1; } }
    for (const a of all) { a.qx = a.u.x; a.qz = a.u.z; }
    for (const a of all) { if (a.t != null || !G.units.includes(a.u)) continue; const u = a.u;
      if (Math.hypot(u.x - a.gx, u.z - a.gz) < (T.UT[u.type].cls === 'veh' ? 1.9 : 1.2) && !(u.path && u.path.length)) { a.t = t; continue; }
      if (Math.hypot(u.x - a.lastP[0], u.z - a.lastP[1]) > .3) a.lastP = [u.x, u.z, t]; else if (t - a.lastP[2] >= 6 && u.path && u.path.length) { res.stall6++; a.lastP[2] = t; } }
    if (all.every(a => a.t != null)) break;
  }
  for (const a of all) { if (a.t != null) { res.arrive++; res.sumT = (res.sumT || 0) + a.t; } else { res.late++; if (a.why) { res.who = res.who || {}; res.who[a.u.type[0] === 't' || a.u.type === 'ifv' || a.u.type === 'hmv' ? 'V ' + a.why : 'I ' + a.why] = (res.who[a.u.type[0] === 't' || a.u.type === 'ifv' || a.u.type === 'hmv' ? 'V ' + a.why : 'I ' + a.why] || 0) + 1; } if (res.ex.length < 6) res.ex.push(`${seed}/${res.lay} ${a.u.type}#${a.u.id} at(${a.u.x.toFixed(1)},${a.u.z.toFixed(1)}) goal(${a.gx},${a.gz}) dist=${Math.hypot(a.u.x - a.gx, a.u.z - a.gz).toFixed(1)} path=${(a.u.path || []).length}`); } }
  res.last = Math.max(...all.map(a => a.t ?? secs));
  return res;
}

if (process.env.ONE && process.argv[1] && process.argv[1].endsWith('traffic.mjs')) { const [sc, sd] = process.env.ONE.split(':'); console.log(JSON.stringify(run(sc, +sd, +(process.env.SECS || 120)))); process.exit(0); }
if (!(process.argv[1] && process.argv[1].endsWith('traffic.mjs'))) { /* 다른 곳에서 불러 씀 */ } else if (process.argv[2] === '--child') {
  const [, , , scene, seed, secs] = process.argv; let r = null; try { r = run(scene, +seed, +secs); } catch (e) { r = { err: String(e.stack || e) }; } process.send(r || { skip: 1 }); process.exit(0);
} else {
  const scenes = (process.argv[2] || 'swap,block,cross').split(','), N = +(process.argv[3] || 8), secs = +(process.argv[4] || 150), P = os.cpus().length, S0 = +(process.env.SEED0 || 100);
  const me = fileURLToPath(import.meta.url);
  for (const sc of scenes) {
    const out = []; let next = 0;
    await new Promise(res => { let act = 0; const go = () => { if (next >= N && !act) return res(); while (act < P && next < N) { const s = S0 + next++; act++;
      const c = fork(me, ['--child', sc, s, secs]); c.on('message', m => out.push(m)); c.on('exit', () => { act--; go(); }); } }; go(); });
    const ok = out.filter(r => r && !r.skip && !r.err); const errs = out.filter(r => r && r.err);
    const S = k => ok.reduce((a, r) => a + (r[k] || 0), 0);
    console.log(`${sc.padEnd(6)} 판 ${ok.length}  부대 ${S('n')}  못 감 ${S('late')}  평균 도착 ${(S('sumT') / Math.max(1, S('arrive'))).toFixed(1)}s  마지막 도착 평균 ${(S('last') / Math.max(1, ok.length)).toFixed(1)}s  6초 멈춤 ${S('stall6')}  차체 겹침 표본 ${S('ov')}/${S('ovS')}`);
    if (errs.length) console.log('오류', errs[0].err);
    if (process.env.VERB) for (const r of ok) for (const e of r.ex) console.log('  ', e);
    if (process.env.STATE) { const w = {}; for (const r of ok) for (const [k, v] of Object.entries(r.st || {})) w[k] = (w[k] || 0) + v; for (const [k, v] of Object.entries(w).sort((a, b) => b[1] - a[1]).slice(0, 24)) console.log('  ', v, k); }
    if (process.env.WHO) { const w = {}; for (const r of ok) for (const [k, v] of Object.entries(r.who || {})) w[k] = (w[k] || 0) + v; for (const [k, v] of Object.entries(w).sort((a, b) => b[1] - a[1]).slice(0, 20)) console.log('  ', v, k); }
  }
}
