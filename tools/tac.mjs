// 전술 측정: AI끼리 여러 판을 (코어 수만큼 동시에) 돌려 교전 모습을 숫자로 잰다.
// 사용: node tools/tac.mjs [판 수=8] [크기=m] [세력 수=2] [결과 jsonl 파일]
// 잰 값: 보병끼리 사격 거리, 근접(2칸 안) 비율, 쏘는 쪽이 움직이는 중·엄폐 없음·직접 못 봄 비율, 마주보고 싸움(둘 다 노출 + 3칸 안),
//        게임 길이, 오류, 병종별 격파, 제압 사격 수, 후퇴 수 등.
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { cpus } from 'node:os';
import { appendFileSync } from 'node:fs';

if (isMainThread) {
  const GAMES = +(process.argv[2] || 8), SIZE = process.argv[3] || 'm', NATS = +(process.argv[4] || 2), OUT = process.argv[5];
  const W = Math.min(cpus().length, GAMES);let next = 0, done = 0;const R = [];
  const seed0 = +(process.env.SEED || 3000);
  await new Promise(res => {
    for (let w = 0; w < W; w++) {
      const wk = new Worker(new URL(import.meta.url), { workerData: { SIZE, NATS } });
      const feed = () => { if (next >= GAMES) { wk.postMessage(null); return; } wk.postMessage(seed0 + next++); };
      wk.on('message', m => { R.push(m); done++; if (OUT) appendFileSync(OUT, JSON.stringify(m) + '\n');
        if (process.env.TAC_V) console.error(`${done}/${GAMES} seed ${m.seed} ${(m.len / 60).toFixed(1)}분 err ${m.errs}`); feed(); if (done === GAMES) res(); });
      wk.on('error', e => { console.error(e); });
      feed();
    }
  });
  summary(R, SIZE, NATS);
  process.exit(0);
} else {
  const { loadGame, playAI } = await import('../test/harness.mjs');
  parentPort.on('message', async seed => { if (seed == null) { process.exit(0); } parentPort.postMessage(await one(seed)); });
  async function one(seed) {
    const T = loadGame();const G = () => T.G;
    const S = { seed, shots: 0, dsum: 0, close: 0, moving: 0, open: 0, blind: 0, f2f: 0, supf: 0, kills: {}, lost: {}, errs: 0, len: 0, retreat: 0, flank: 0, smoke: 0, sees: 0, idle: 0, idleN: 0, bunch: 0, bunchN: 0, role: {}, buys: {}, ff: 0, noby: 0, life: 0, lifeN: 0, flips: 0, vshots: 0, vflip: 0, vord: 0, idle90: {} };
    const wrap = (name, fn) => { const o = T.__get(name); T.__set(name, fn(o)); };
    const inf = u => T.UT[u.type].cls === 'inf' && !T.UT[u.type].ind;
    const spots = T.__get('spots'), coverOf = T.__get('coverOf');
    wrap('rtShoot', o => function (a, d) {
      if (inf(a) && inf(d)) { S.shots++; const dd = Math.hypot(a.x - d.x, a.z - d.z); S.dsum += dd; if (dd < 2) S.close++;
        { const ib = u => T.G.map[u.r][u.c].t === 'bldg'; const io = ib(a) || ib(d) ? 'in' : 'out'; const H = (S.hist ||= {}); const b = io + (dd < 1 ? '<1' : dd < 2 ? '1-2' : dd < 3 ? '2-3' : dd < 5 ? '3-5' : '5+'); H[b] = (H[b] || 0) + 1; }
        if (a.path && a.path.length) S.moving++;
        let ca = 0, cd = 0; try { ca = coverOf(a, d).cov; cd = coverOf(d, a).cov; } catch (e) {}
        if (ca <= 0) S.open++; if (ca <= 0 && cd <= 0 && dd < 3) S.f2f++;
        try { if (!spots(a, d)) S.blind++; } catch (e) {}
        const ro = (a.tk && a.pl ? a.tk.role : 'old') + (a.path && a.path.length ? '*' : ''); const R = (S.role[ro] ||= [0, 0, 0]); R[0]++; R[1] += dd; if (dd < 2) R[2]++; }
      return o(a, d); });
    wrap('kill', o => function (u, by) { (S.lost[u.type] = (S.lost[u.type] || 0) + 1); if (by) S.kills[by.type] = (S.kills[by.type] || 0) + 1;
      if (!by) { const t0 = G().time; if (!u._cause && !(u._lb && t0 - u._lb.t < 90) && !(u._lc && t0 - u._lc.t < 90)) S.noby++; } else if (by.nat === u.nat) S.ff++; if (u.__t0 != null) { S.life += G().time - u.__t0; S.lifeN++; } return o(u, by); });
    wrap('buy', o => function (n, t, r, c) { const u = o(n, t, r, c); if (u) S.buys[t] = (S.buys[t] || 0) + 1; return u; });
    wrap('rtShoot', o => function (a, d) { if (T.UT[a.type].cls === 'veh') S.vshots++; return o(a, d); });
    let objT = null; const own = {};
    const check = g => {
      if (!objT) { objT = []; for (let r = 0; r < g.map.length; r++) for (let c = 0; c < g.map.length; c++) if (g.map[r][c].obj != null) objT.push([r, c]); }
      for (const [r, c] of objT) { const k = r * 999 + c, o = g.map[r][c].owner; if (own[k] !== undefined && own[k] !== o) S.flips++; own[k] = o; }
      for (const u of g.units) { const act = (u.path && u.path.length) || g.time - (u.firedT ?? -99) < 3 || u._srv || u._fixing || u.tow != null || (u.load && u.load.length !== u.__ld);
        u.__ld = u.load ? u.load.length : 0; if (act || u.__ia == null) { u.__ia = g.time; u.__ic = 0; } else if (g.time - u.__ia > 90 && !u.__ic) { u.__ic = 1; S.idle90[u.type] = (S.idle90[u.type] || 0) + 1; } }
      for (const u of g.units) { if (u.__t0 == null) u.__t0 = g.time; const t = T.UT[u.type]; if (t.cls !== 'veh' || t.fly || t.logi || !(u.path && u.path.length)) continue;
        const d = u.path[u.path.length - 1], p = u.__vd; if (p && (Math.abs(p[0] - d[0]) + Math.abs(p[1] - d[1]) > .5)) { S.vord++;
          const a1 = Math.atan2(p[1] - u.z, p[0] - u.x), a2 = Math.atan2(d[1] - u.z, d[0] - u.x); let da = Math.abs(a1 - a2); if (da > Math.PI) da = 2 * Math.PI - da;
          if (da > Math.PI / 2 && g.time - (u.__vdT || -99) < 6) S.vflip++; u.__vdT = g.time; } u.__vd = [d[0], d[1]]; }
      // 적이 안 보이는데 30초 넘게 가만히 있는 부대(전선 밖에서 놀고 있음), 아군끼리 한 칸 안에 셋 이상 몰림
      for (const u of g.units) { if (T.UT[u.type].cls !== 'inf' || T.UT[u.type].ind) continue; S.idleN++;
        if (!(u.path && u.path.length)) { u.__still = (u.__still || 0) + 1; if (u.__still > 30 && (g.time - (u.firedT ?? -99)) > 30) S.idle++; } else u.__still = 0;
        S.bunchN++; let c = 0; for (const o of g.units) if (o !== u && o.nat === u.nat && Math.hypot(o.x - u.x, o.z - u.z) < 1) c++; if (c >= 2) S.bunch++; }
    };
    const slots = ['ai', 'ai', 'none', 'none'].map((s, i) => i < NATS_() ? 'ai' : 'none');
    function NATS_() { return workerData.NATS; }
    try { await playAI(T, { slots, size: workerData.SIZE, seed, check }); } catch (e) { S.crash = String(e && e.stack || e).slice(0, 400); }
    const g = G(); S.len = g.time; S.errs = (g.errs || []).length; S.err1 = (g.errs || [])[0]?.slice(0, 300); S.win = g.over?.win; S.over = !!g.over;
    const tac = g.tac || {}; for (const k of ['retreat', 'flank', 'smoke', 'supf', 'bound', 'assault', 'hold', 'vkeep', 'truckFlee', 'stage', 'mortarMove', 'logiStuck']) S[k] = (tac[k] || S[k] || 0);
    return S;
  }
}
function summary(R, SIZE, NATS) {
  const sum = k => R.reduce((a, r) => a + (r[k] || 0), 0);const shots = Math.max(1, sum('shots'));
  const pc = k => (100 * sum(k) / shots).toFixed(0) + '%';
  console.log(`${R.length}판 (${SIZE}, ${NATS}세력) · 평균 ${(sum('len') / R.length / 60).toFixed(1)}분 · 끝까지 안 끝남 ${R.filter(r => !r.over).length} · 오류 판 ${R.filter(r => r.errs || r.crash).length}`);
  console.log(`보병 사격 ${(shots / R.length).toFixed(0)}/판 · 평균 거리 ${(sum('dsum') / shots).toFixed(2)}칸 · 2칸 안 ${pc('close')} · 이동 중 ${pc('moving')} · 쏘는 쪽 노출 ${pc('open')} · 마주보기 ${pc('f2f')} · 직접 못 봄 ${pc('blind')}`);
  console.log(`가만히 노는 보병 ${(100 * sum('idle') / Math.max(1, sum('idleN'))).toFixed(0)}% · 뭉침 ${(100 * sum('bunch') / Math.max(1, sum('bunchN'))).toFixed(0)}%`);
  console.log(`전술(판당): 제압사격 ${(sum('supf') / R.length).toFixed(1)} 측면 ${(sum('flank') / R.length).toFixed(1)} 연막 ${(sum('smoke') / R.length).toFixed(1)} 후퇴 ${(sum('retreat') / R.length).toFixed(1)} 엄호이동 ${(sum('bound') / R.length).toFixed(1)} 돌격 ${(sum('assault') / R.length).toFixed(1)}`);
  const agg = k => { const o = {}; for (const r of R) for (const [t, v] of Object.entries(r[k] || {})) o[t] = (o[t] || 0) + v; return Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).map(([t, v]) => [t, +(v / R.length).toFixed(1)])); };
  { const H = {}; for (const r of R) for (const [k, v] of Object.entries(r.hist || {})) H[k] = (H[k] || 0) + v; const tot = Object.values(H).reduce((a, b) => a + b, 0) || 1;
    console.log('보병 사격 거리(칸, 1칸≈12m; in=한쪽이 건물 안):', ['out<1', 'out1-2', 'out2-3', 'out3-5', 'out5+', 'in<1', 'in1-2', 'in2-3', 'in3-5', 'in5+'].map(k => `${k} ${(100 * (H[k] || 0) / tot).toFixed(0)}%`).join(' · ')); }
  console.log('판당 격파(쏜 쪽):', JSON.stringify(agg('kills')));
  console.log('판당 손실:', JSON.stringify(agg('lost')));
  console.log(`판당: 거점 주인 바뀜 ${(sum('flips') / R.length).toFixed(1)} · 차량 사격 ${(sum('vshots') / R.length).toFixed(0)} · 차량 새 목적지 ${(sum('vord') / R.length).toFixed(0)} (6초 안에 반대로 ${(sum('vflip') / R.length).toFixed(1)}) · 평균 수명 ${(sum('life') / Math.max(1, sum('lifeN'))).toFixed(0)}초 · 아군 피해 사망 ${(100 * sum('ff') / Math.max(1, sum('lifeN'))).toFixed(1)}% · 원인 모름 ${(100 * sum('noby') / Math.max(1, sum('lifeN'))).toFixed(0)}%`);
  console.log(`판당: 차량 명령 고정 ${(sum('vkeep') / R.length).toFixed(1)} · 트럭 회피 ${(sum('truckFlee') / R.length).toFixed(1)} · 대기 자리로 ${(sum('stage') / R.length).toFixed(1)} · 박격포 자리 옮김 ${(sum('mortarMove') / R.length).toFixed(1)} · 막힌 보급차 ${(sum('logiStuck') / R.length).toFixed(1)}`);
  console.log('90초 넘게 노는 부대(판당):', JSON.stringify(agg('idle90')));
  console.log('판당 증원:', JSON.stringify(agg('buys')));
  const ro = {}; for (const r of R) for (const [k, v] of Object.entries(r.role || {})) { const o = (ro[k] ||= [0, 0, 0]); o[0] += v[0]; o[1] += v[1]; o[2] += v[2]; }
  console.log('역할별 사격(*=이동 중): ' + Object.entries(ro).sort((a, b) => b[1][0] - a[1][0]).map(([k, v]) => `${k} ${(100 * v[0] / shots).toFixed(0)}% 거리${(v[1] / v[0]).toFixed(1)} 근접${(100 * v[2] / v[0]).toFixed(0)}%`).join(' · '));
  const e = R.find(r => r.err1 || r.crash); if (e) console.log('첫 오류:', e.seed, e.err1 || e.crash);
}
