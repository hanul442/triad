// 은엄폐 측정: AI끼리 여러 판을 돌려 보병 병사 사상자를 원인(화기)별로 세고, 위협 속 병사가 엄폐·엎드림·건물 안에 있는 비율을 잰다.
// 사용: node tools/cover.mjs [판 수=8] [크기=m]
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { cpus } from 'node:os';
if (isMainThread) {
  const GAMES = +(process.argv[2] || 8), SIZE = process.argv[3] || 'm';
  const W = Math.min(cpus().length, GAMES); let next = 0, done = 0; const R = [];
  const seed0 = +(process.env.SEED || 5000);
  await new Promise(res => { for (let w = 0; w < W; w++) { const wk = new Worker(new URL(import.meta.url), { workerData: { SIZE } });
    const feed = () => { if (next >= GAMES) { wk.postMessage(null); return; } wk.postMessage(seed0 + next++); };
    wk.on('message', m => { R.push(m); done++; feed(); if (done === GAMES) res(); }); wk.on('error', e => console.error(e)); feed(); } });
  const sum = {}; const add = (k, v) => sum[k] = (sum[k] || 0) + v;
  for (const r of R) for (const [k, v] of Object.entries(r)) if (typeof v === 'number') add(k, v); else if (v && typeof v === 'object') for (const [k2, v2] of Object.entries(v)) add(k + '.' + k2, v2);
  const g = R.length, f = x => (x / g).toFixed(1), pc = (a, b) => (b ? (100 * a / b).toFixed(0) : '-') + '%';
  console.log(`${g}판 평균 ${(sum.len / g / 60).toFixed(1)}분, 오류 ${sum.errs}`);
  console.log(`보병 병사 사상(판당): 전체 ${f(sum.cas)} · 포탄/로켓(곡사) ${f(sum['by.ind'] || 0)} · 직사 폭발 ${f(sum['by.blast'] || 0)} · 총탄 ${f(sum['by.bullet'] || 0)} · 기타 ${f(sum['by.other'] || 0)}`);
  console.log(`곡사 포탄 한 발이 분대 안에 떨어졌을 때 사상: 평균 ${(sum.shCas / Math.max(1, sum.shN)).toFixed(2)}명 (${sum.shN}발)`);
  console.log(`위협 속 멈춘 병사: 엄폐 ${pc(sum.cov, sum.thrN)} · 엎드림(맨땅) ${pc(sum.prone, sum.thrN)} · 건물 안 ${pc(sum.inB, sum.thrN)} · 맨땅에 서 있음 ${pc(sum.open, sum.thrN)}`);
  console.log(`분대 엄폐 이동 ${f(sum.seek || 0)}, 포격 피하기 ${f(sum.dodge || 0)}, 포탄 엎드림 ${f(sum.duck || 0)}`);
  process.exit(0);
} else {
  const { loadGame, seedRandom, playAI } = await import('../test/harness.mjs');
  parentPort.on('message', async seed => { if (seed == null) process.exit(0); parentPort.postMessage(await one(seed)); });
  async function one(seed) {
    const T = loadGame(); const S = { len: 0, errs: 0, cas: 0, by: {}, thrN: 0, cov: 0, prone: 0, inB: 0, open: 0, shN: 0, shCas: 0 };
    const wrap = (name, fn) => { const o = T.__get(name); T.__set(name, fn(o)); };
    wrap('woundMan', o => function (u, m, kind, cov, by) { S.cas++; const k = by && T.UT[by.type] && T.UT[by.type].ind ? 'ind' : kind === 'bullet' ? 'bullet' : (kind === 'blast' || kind === 'frag') ? 'blast' : 'other'; S.by[k] = (S.by[k] || 0) + 1; return o(u, m, kind, cov, by); });
    wrap('shellBoom', o => function (s, x, z, h, r, c) { const G = T.G; const near = G.units.filter(u => T.UT[u.type].cls === 'inf' && Math.hypot(u.x - x, u.z - z) < .6); const c0 = S.cas; const res = o(s, x, z, h, r, c); if (near.length) { S.shN++; S.shCas += S.cas - c0; } return res; });
    const check = G => { const E = n => T.__eval('typeof '+n+'==="undefined"?null:'+n); const dc = E('dirCoverAt'), mt = E('menThreat'), td = E('menThreatDir'), tile = E('tileAt'), tr = E('trenchAt');
      for (const u of G.units) { if (T.UT[u.type].cls !== 'inf' || !u._men || (u.path && u.path.length) || !mt(u)) continue; const th = td(u); const ux = Math.cos(th), uz = Math.sin(th);
        for (const m of u._men) { if (m.dead || m.down || m.gone || m.task) continue; S.thrN++; const t = tile(m.x, m.z);
          if (t && t.t === 'bldg') { S.inB++; continue; } const c = dc(m.x, m.z, ux, uz, 'inf', u, null).cov; if (c >= .15 || (tr && tr(m.x, m.z)) || (t && t.t === 'rubble')) { S.cov++; continue; } if (m.pr > 0 || m.lay) { S.prone++; continue; } S.open++; } } };
    seedRandom(T, seed);
    await playAI(T, { size: workerData.SIZE, seed, check });
    S.len = T.G.time || 0; S.errs = (T.G.errs || []).length; const tc = T.G.tac || {}; S.seek = tc.cvSeek || 0; S.dodge = tc.cvDodge || 0; S.duck = tc.cvDuck || 0; return S;
  }
}
