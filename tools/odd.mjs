// 어색한 장면 찾기: AI끼리 여러 판을 돌리며 사람 눈에 이상해 보일 만한 순간을 센다.
// 사용: node tools/odd.mjs [판 수=8] [크기=m] [동시 실행 수=코어 수]
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { cpus } from 'node:os';
if (isMainThread) {
  const GAMES = +(process.argv[2] || 8), SIZE = process.argv[3] || 'm', W = Math.min(+(process.argv[4] || cpus().length), GAMES);
  let next = 0, done = 0; const R = [];
  await new Promise(res => { for (let w = 0; w < W; w++) { const wk = new Worker(new URL(import.meta.url), { workerData: { SIZE } });
    const feed = () => wk.postMessage(next < GAMES ? 7000 + next++ : null);
    wk.on('message', m => { R.push(m); if (++done === GAMES) res(); else feed(); }); feed(); } });
  const sum = k => R.reduce((a, r) => a + (r[k] || 0), 0), avg = k => (sum(k) / R.length).toFixed(1);
  const wins = {}; for (const r of R) wins[r.why] = (wins[r.why] || 0) + 1;
  const side = {}; for (const r of R) side[r.win] = (side[r.win] || 0) + 1;
  console.log(`${R.length}판 평균 ${(sum('len') / R.length / 60).toFixed(1)}분 · 첫 교전 ${(sum('first') / R.length).toFixed(0)}초 · 끝난 이유 ${JSON.stringify(wins)} · 승자 ${JSON.stringify(side)}`);
  const ks = new Set(); for (const r of R) for (const k in r) if (/^(flip|stuck)_/.test(k)) ks.add(k);
  console.log([...ks].sort().map(k => `${k} ${avg(k)}`).join(' · '));
  for (const k of ['stuck', 'flip', 'pingpong', 'vehAhead', 'ff', 'ffK', 'openDeath', 'deathN', 'zoneIdle', 'smokeT', 'bigSmoke', 'rocketVeh', 'glN', 'supf', 'evac', 'broke', 'orphan', 'bldgFight', 'lonely', 'retreat', 'assault', 'flank'])
    console.log(k.padEnd(10), avg(k));
  process.exit(0);
} else {
  const { loadGame, playAI } = await import('../test/harness.mjs');
  parentPort.on('message', async seed => { if (seed == null) process.exit(0); parentPort.postMessage(await one(seed)); });
  async function one(seed) {
    const T = loadGame(); const S = { seed }; const inc = (k, v = 1) => S[k] = (S[k] || 0) + v; const UT = T.UT;
    const wrap = (name, fn) => { const o = T.__get(name); T.__set(name, fn(o)); };
    wrap('harm', o => function (u, amt, by, opt) { if (by && u && by.nat === u.nat && by !== u) inc('ff'); return o(u, amt, by, opt); });
    wrap('kill', o => function (u, by) { if (by && by.nat === u.nat) inc('ffK'); if (UT[u.type].cls === 'inf') { inc('deathN'); const c = T.__get('coverOf')(u); if (c.cov <= 0 && u.path && u.path.length) inc('openDeath'); } return o(u, by); });
    let first = null; const st = new Map(); const dest = new Map(); const plSt = new Map();
    const check = G => { const t = G.time;
      if (first == null && G.units.some(u => u.firedT != null && UT[u.type].cls !== 'air')) first = t;
      let sm = 0; for (const row of G.map) for (const x of row) if (x.smoke > 0) sm++; inc('smokeT', sm / 10); if (sm > 25) inc('bigSmoke');
      for (const u of G.units) { const ty = UT[u.type]; if (ty.fly) continue;
        // 길이 있는데 10초 넘게 제자리(갇힘)
        const k = u.id, p = st.get(k); const mv = u.path && u.path.length;
        if (!p || Math.hypot(p.x - u.x, p.z - u.z) > .15 || !mv || (u.supp || 0) >= 1.6 || u.climb) st.set(k, { x: u.x, z: u.z, t }); else if (t - p.t > 10 && !p.c) { p.c = 1; inc('stuck'); inc('stuck_' + (ty.cls === 'veh' ? 'veh' : u.tk && u.pl ? u.tk.role : 'old')); }
        // 목적지가 5초 안에 반대쪽으로 뒤집힘
        if (mv) { const e = u.path[u.path.length - 1]; const d = dest.get(k); if (d && (e[0] !== d.e[0] || e[1] !== d.e[1])) { const a1 = Math.atan2(d.e[1] - u.z, d.e[0] - u.x), a2 = Math.atan2(e[1] - u.z, e[0] - u.x);
            if (Math.abs(Math.atan2(Math.sin(a1 - a2), Math.cos(a1 - a2))) > 2.4 && t - d.t < 5 && Math.hypot(e[0] - u.x, e[1] - u.z) > 1) { inc('flip'); inc('flip_' + (u.tk && u.pl ? u.tk.role : u.brk ? 'brk' : ty.cls === 'veh' ? 'veh' : 'old')); } }
          if (!d || d.e[0] !== e[0] || d.e[1] !== e[1]) dest.set(k, { e: [e[0], e[1]], t }); }
        // 차량이 보병 없이 앞서 감(4칸 안 아군 보병 없음, 적 6칸 안)
        if (ty.cls === 'veh' && !ty.ind && mv && !G.units.some(o => o.nat === u.nat && UT[o.type].cls === 'inf' && Math.hypot(o.x - u.x, o.z - u.z) < 4) && G.units.some(e => e.nat !== u.nat && Math.hypot(e.x - u.x, e.z - u.z) < 6)) inc('vehAhead');
        // 출발 지역에서 1분 넘게 노는 보병
        if (ty.cls === 'inf' && !ty.ind && T.inZone(u.nat, u.r, u.c) && !mv && t - (u.firedT ?? -99) > 60 && (u.__z = (u.__z || 0) + 1) === 60) inc('zoneIdle');
        // 아군 6칸 안에 아무도 없는 보병(혼자 떨어짐)
        if (ty.cls === 'inf' && !T.inZone(u.nat, u.r, u.c) && !G.units.some(o => o !== u && o.nat === u.nat && Math.hypot(o.x - u.x, o.z - u.z) < 6)) inc('lonely', .1);
        if (ty.cls === 'inf' && u.brk) inc('broke', .1);
        if (ty.cls === 'inf' && G.map[u.r][u.c].t === 'bldg' && u.firedT != null && t - u.firedT < 1) inc('bldgFight', .1); }
      for (const p of G.plat || []) { const o = plSt.get(p.id); if (o !== p.st) { if (o === 'regroup' && p.st === 'retreat') inc('pingpong'); plSt.set(p.id, p.st); } }
    };
    await playAI(T, { size: workerData.SIZE, seed, check });
    const G = T.G; S.len = G.time; S.first = first ?? G.time; S.why = (G.over && G.over.why || '').slice(0, 10); S.win = G.over && G.over.win;
    const tac = G.tac || {}; for (const k of ['supf', 'retreat', 'assault', 'flank', 'rocket', 'gl']) S[k === 'rocket' ? 'rocketVeh' : k === 'gl' ? 'glN' : k] = tac[k] || 0;
    S.evac = 0; for (const n of G.order) S.evac += (G.nats[n].cas || {}).evac || 0; S.orphan = (G.cas || []).length;
    return S;
  }
}
