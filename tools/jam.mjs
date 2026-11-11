// 부대끼리 끼임 측정: AI끼리 판을 돌리며, 길이 있는데 못 나아가는 지상 부대를 1초마다 본다.
// 멈춤 = 경로가 있는데 6초 동안 0.3칸도 못 움직임(제압·계단·견인 제외).
// 멈춘 부대 앞(가려는 쪽 반원) 가까이에 다른 지상 부대가 있으면 '부대 끼임'으로 센다.
// 사용: node tools/jam.mjs [판 수=8] [크기=m] [초=300] [동시=CPU 수]   (SEED0 시작 시드, VERB=1 예시)
import { fork } from 'node:child_process';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { loadGame, seedRandom } from '../test/harness.mjs';

const LAYS = [undefined, 'port', 'country', 'forest', 'sub', 'ind', 'old', 'canal'];
async function one(seed, size, secs) {
  const T = loadGame(); seedRandom(T, seed);
  const lay = LAYS[seed % LAYS.length];
  T.newGame({ slots: ['ai', 'ai', 'ai', 'ai'], size, diff: 'normal', fog: true, speed: 0, seed, layout: lay });
  const G = T.G, UT = T.UT;
  const hist = new Map(); const r = { samples: 0, stall: {}, jam: {}, jamEp: {}, ex: [], lay: lay || 'city' };
  const inc = (o, k) => (o[k] = (o[k] || 0) + 1);
  const run = new Map();
  for (let i = 0; i < secs * 10 && !G.over; i++) {
    T.rtTick(0.1); if (i % 10) continue;
    const now = G.time;
    for (const u of G.units) {
      const t = UT[u.type]; if (t.fly || u.towBy != null || u.tow != null) continue;
      const cls = t.cls === 'veh' ? 'veh' : 'inf';
      let h = hist.get(u.id); if (!h) hist.set(u.id, h = []);
      h.push([u.x, u.z, now]); if (h.length > 7) h.shift();
      const C = u._cons, hold = C && C.t > now && !u.man && Math.hypot(u.path && u.path.length ? u.path[u.path.length - 1][0] - C.x : 0, u.path && u.path.length ? u.path[u.path.length - 1][1] - C.z : 0) > 3.5;   // 거점 둘레에 남으려고 일부러 멈춤(05zd)
      const mv = u.path && u.path.length && !u.climb && !hold && !(cls === 'inf' && (u.supp || 0) >= 1.6);
      if (!mv) { run.delete(u.id); continue; }
      r.samples++;
      if (h.length < 7 || Math.hypot(u.x - h[0][0], u.z - h[0][1]) > .3) { run.delete(u.id); continue; }
      inc(r.stall, cls);
      const [tx, tz] = u.path[0]; let dx = tx - u.x, dz = tz - u.z; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
      let bl = null;
      for (const o of G.units) { if (o === u || UT[o.type].fly) continue; const ox = o.x - u.x, oz = o.z - u.z, d = Math.hypot(ox, oz);
        const oc = UT[o.type].cls === 'veh' ? 'veh' : 'inf'; const R = (cls === 'veh' || oc === 'veh') ? 1.0 : .7;
        if (d < R && (ox * dx + oz * dz) > -.05) { bl = o; break; } }
      if (!bl) { run.delete(u.id); if (process.env.WHY) { const o = r.why || (r.why = {}); const k = cls + ':' + T.cell(u.r, u.c).t + (u._blk ? ':blk' : '') + (u.fol ? ':fol' : '') + (u.cqb ? ':cqb' : '') + (u.job ? ':job' : '') + ((u.supp || 0) > 0 ? ':supp' : '') + (u.tgt != null ? ':tgt' : ''); inc(o, k); } continue; }
      const oc = UT[bl.type].cls === 'veh' ? 'veh' : 'inf';
      const k = cls + '<' + oc + (bl.nat === u.nat ? '' : ':foe') + (bl.path && bl.path.length ? ':mov' : ':idle');
      inc(r.jam, k);
      const n = (run.get(u.id) || 0) + 1; run.set(u.id, n);
      if (n === +(process.env.EPN||10)) { inc(r.jamEp, k); if (r.ex.length < 12) r.ex.push(`${seed} t=${now | 0} ${u.type}#${u.id}(${u.x.toFixed(1)},${u.z.toFixed(1)}) ← ${bl.type}#${bl.id} d=${Math.hypot(bl.x - u.x, bl.z - u.z).toFixed(2)} ${k} tile=${T.cell(u.r, u.c).t} blk=${(u._blk || 0).toFixed(1)} uEnd=${JSON.stringify((u.path[u.path.length-1]||[]).map(v=>+v.toFixed(2)))} np=${u.path.length} bPath=${bl.path?bl.path.length:0} bEnd=${JSON.stringify(((bl.path||[])[(bl.path||[]).length-1]||[]).map(v=>+v.toFixed(2)))} bAt=(${bl.x.toFixed(2)},${bl.z.toFixed(2)}) ufol=${!!u.fol} bfol=${!!bl.fol} ujob=${u.job||''} bjob=${bl.job||''} bt=${T.cell(bl.r,bl.c).t}`); }
    }
  }
  return r;
}
if (process.argv[2] === '--child') {
  const [, , , seed, size, secs] = process.argv; const r = await one(+seed, size, +secs); process.send(r); process.exit(0);
} else {
  const N = +(process.argv[2] || 8), size = process.argv[3] || 'm', secs = +(process.argv[4] || 300), P = +(process.argv[5] || os.cpus().length), S0 = +(process.env.SEED0 || 7000);
  const me = fileURLToPath(import.meta.url); const out = []; let next = 0;
  await new Promise(res => { let act = 0; const go = () => { if (next >= N && !act) return res(); while (act < P && next < N) { const s = S0 + next++; act++;
    const c = fork(me, ['--child', s, size, secs]); c.on('message', m => out.push(m)); c.on('exit', () => { act--; go(); }); } }; go(); });
  const sum = { samples: 0, stall: {}, jam: {}, jamEp: {} };
  for (const r of out) { sum.samples += r.samples; for (const k of ['stall', 'jam', 'jamEp']) for (const [a, b] of Object.entries(r[k])) sum[k][a] = (sum[k][a] || 0) + b; }
  const pct = v => (v / Math.max(1, sum.samples) * 100).toFixed(2) + '%';
  console.log(`판 ${out.length}, 이동 표본 ${sum.samples}`);
  console.log('멈춤', Object.entries(sum.stall).map(([k, v]) => `${k} ${v} (${pct(v)})`).join(', '));
  const jt = Object.values(sum.jam).reduce((a, b) => a + b, 0);
  console.log('부대 끼임 표본', jt, pct(jt)); for (const [k, v] of Object.entries(sum.jam).sort((a, b) => b[1] - a[1])) console.log('  ', k, v, ' 10초+ 사례', sum.jamEp[k] || 0);
  if (process.env.WHY) { const w = {}; for (const r of out) for (const [a, b] of Object.entries(r.why || {})) w[a] = (w[a] || 0) + b; console.log(Object.entries(w).sort((a, b) => b[1] - a[1]).slice(0, 25)); }
  if (process.env.VERB) for (const r of out) for (const e of r.ex) console.log(e);
}
