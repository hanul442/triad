// 목표 이해 측정: AI끼리(관전) 자유 전투·시나리오·캠페인을 여러 판 돌려, AI가 목표를 얼마나 이루는지 잰다.
// 사용: node tools/goals.mjs [판 수(전장마다)=4] [전장 목록, 쉼표=all] [결과 jsonl]
//   전장: free, free3, scn:assault, scn:hold, camp:evac, camp:bridge, camp:station, camp:omaha, camp:incheon
// 잰 값: 이긴 쪽·끝난 까닭·길이, 거점 주인이 바뀐 수, 지키는 부대 없이 빼앗긴 거점 수, 점령할 때 둘레 공격 부대 수,
//        전투 부대가 목표(거점·아는 적) 5칸 안에 있던 비율, 캠페인 임무 진행(피란민·폭약·출구…)
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { cpus } from 'node:os';
import { appendFileSync } from 'node:fs';

const ALL = ['free', 'free3', 'scn:assault', 'scn:hold', 'camp:evac', 'camp:bridge', 'camp:station', 'camp:omaha', 'camp:incheon', 'camp:pavlov', 'camp:arnhem', 'camp:bastogne', 'camp:seoul', 'camp:mogadishu', 'camp:easting'];
if (isMainThread) {
  const GAMES = +(process.argv[2] || 4), MAPS = (process.argv[3] && process.argv[3] !== 'all') ? process.argv[3].split(',') : ALL, OUT = process.argv[4];
  const jobs = []; const seed0 = +(process.env.SEED || 500);
  for (const m of MAPS) for (let g = 0; g < GAMES; g++) jobs.push({ map: m, seed: seed0 + g });
  const W = Math.min(+(process.env.W || cpus().length), jobs.length); let next = 0, done = 0; const R = [];
  await new Promise(res => {
    for (let w = 0; w < W; w++) {
      const wk = new Worker(new URL(import.meta.url));
      const feed = () => { if (next >= jobs.length) { wk.postMessage(null); return; } wk.postMessage(jobs[next++]); };
      wk.on('message', m => { R.push(m); done++; if (OUT) appendFileSync(OUT, JSON.stringify(m) + '\n');
        if (process.env.V) console.error(`${done}/${jobs.length} ${m.map} ${m.seed}: ${m.why} ${(m.len / 60).toFixed(1)}분`); feed(); if (done === jobs.length) res(); });
      wk.on('error', e => { console.error(e); done++; feed(); if (done === jobs.length) res(); });
      feed();
    }
  });
  summary(R, MAPS);
  process.exit(0);
} else {
  const { loadGame, seedRandom } = await import('../test/harness.mjs');
  parentPort.on('message', async j => { if (j == null) process.exit(0); parentPort.postMessage(one(j)); });
  function one({ map, seed }) {
    const T = loadGame(); seedRandom(T, seed * 7919 + 13);
    const cfg = map.startsWith('free') ? { n: map === 'free3' ? 3 : 2, size: 'm', seed, layout: 'sym', relief: 'flat', clime: 'temp' } : { map, seed };
    // DIFF=normal|hard: 캠페인 난이도(10f-diff)로 관전
    if (process.env.DIFF) { const cs = T.__get('campStart'); T.__set('campStart', (id) => cs(id, process.env.DIFF)); }
    T.__get('specStart')(cfg);
    const G = () => T.G, UT = T.UT;
    const S = { map, seed, flips: 0, undef: 0, capN: 0, capMass: 0, near: 0, nearN: 0, errs: 0 };
    const owner = () => G().objs.map(o => G().map[o.r][o.c].owner);
    let prev = owner();
    const fighter = u => !UT[u.type].fly && !UT[u.type].ind && ['inf', 'veh'].includes(UT[u.type].cls) && !['sup', 'amb', 'rec'].includes(u.type);
    for (let i = 0; i < 24000 && !G().over; i++) {
      T.rtTick(0.1);
      if (i % 10) continue;
      const g = G(); const cur = owner();
      cur.forEach((o, k) => { if (o === prev[k]) return; S.flips++; const ob = g.objs[k];
        if (prev[k] != null) { const def = g.units.some(u => u.nat === prev[k] && fighter(u) && Math.hypot(u.x - ob.c - .5, u.z - ob.r - .5) < 3); if (!def) S.undef++; }
        if (o != null) { S.capN++; S.capMass += g.units.filter(u => u.nat === o && fighter(u) && Math.hypot(u.x - ob.c - .5, u.z - ob.r - .5) < 4).length; } });
      prev = cur;
      if (i % 50) continue;
      const mem = T.__get('memOf');
      for (const u of g.units) { if (!fighter(u)) continue; S.nearN++;
        let ok = g.objs.some(o => Math.hypot(u.x - o.c - .5, u.z - o.r - .5) < 5);
        if (!ok && mem) { const M = mem(u.nat) || {}; for (const id in M) { const p = M[id]; if (g.time - p.t < 20 && Math.hypot(p.x - u.x, p.z - u.z) < 5) { ok = true; break; } } }
        if (ok) S.near++; }
    }
    const g = G(); S.len = g.time; S.win = g.over ? g.over.win : null; S.why = g.over ? g.over.why : 'none'; S.errs = (g.errs || []).length; if (S.errs) S.err0 = String(g.errs[0]).slice(0, 300);
    if (g.camp) { const st = g.camp.st; S.camp = {}; for (const k of ['saved', 'lost', 'disarmed', 'blown', 'hold', 'relay', 'taken', 'landed', 'sunk', 'clr', 'link', 'rec', 'drop', 'relief', 'grDone']) if (st[k] != null) S.camp[k] = typeof st[k] === 'number' ? Math.round(st[k]) : st[k];
      S.objOwn = owner(); }
    return S;
  }
}
function summary(R, MAPS) {
  const f = (a, b) => (b ? (a / b) : 0);
  console.log('전장 | 판 | 0번 승 | 평균 길이 | 거점 변화 | 무방비 상실 | 점령 시 병력 | 목표 근처 % | 끝난 까닭');
  let tw = 0, tn = 0;
  for (const m of MAPS) { const A = R.filter(r => r.map === m); if (!A.length) continue;
    const w0 = A.filter(r => r.win === 0).length; const why = {}; for (const r of A) why[r.why] = (why[r.why] || 0) + 1;
    const s = k => A.reduce((a, r) => a + r[k], 0);
    if (m.startsWith('camp') || m.startsWith('scn')) { tw += w0; tn += A.length; }
    console.log(`${m} | ${A.length} | ${w0} | ${(s('len') / A.length / 60).toFixed(1)}분 | ${(s('flips') / A.length).toFixed(1)} | ${(s('undef') / A.length).toFixed(1)} | ${f(s('capMass'), s('capN')).toFixed(1)} | ${(100 * f(s('near'), s('nearN'))).toFixed(0)} | ${JSON.stringify(why)} | 오류 ${s('errs')}`);
    for (const r of A) if (r.camp) console.log(`   ${r.seed}: ${JSON.stringify(r.camp)} own=${JSON.stringify(r.objOwn)}`);
  }
  if (tn) console.log(`시나리오·캠페인 공격측(0번) 임무 성공: ${tw}/${tn}`);
}
