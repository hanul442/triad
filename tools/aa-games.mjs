// AI 대 AI 대공 통계: 적 항공기(공격헬기·수송헬기·전투기·드론)가 얼마나 나오고, 대공 수단이 얼마나 쏘고 떨어뜨리는지.
//   node tools/aa-games.mjs [games=8] [size=m] [seed0=30000]
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import os from 'node:os';
import { loadGame, seedRandom, playAI } from '../test/harness.mjs';
const AIRT = ['gunship', 'drone', 'fpv'];
async function one(seed, size) {
  const T = loadGame(); seedRandom(T, seed);
  const S = { games: 1, called: {}, down: {}, by: {}, aaBuy: 0, aaShots: 0, aaShotsAir: 0, heliIns: 0, heliDown: 0, jet: 0, jetDown: 0, gunSorties: 0, gunSurvive: 0, aaLost: 0, aaLostToHeli: 0 };
  const inc = (o, k, v = 1) => { o[k] = (o[k] || 0) + v; };
  const _kill = T.__get('kill');
  T.__set('kill', function (u, by) { const t = u.type; if (AIRT.includes(t)) { inc(S.down, t); inc(S.by, t + '<' + (by ? by.type : '?')); } if (t === 'aa') { S.aaLost++; if (by && by.type === 'gunship') S.aaLostToHeli++; } return _kill.apply(this, arguments); });
  const _ad = T.__get('airDown');
  T.__set('airDown', function (u, why) { if (why === 'jam') { inc(S.down, u.type); inc(S.by, u.type + '<ew'); } return _ad.apply(this, arguments); });
  const _mk = T.__get('mkUnit');
  T.__set('mkUnit', function (n, type) { const u = _mk.apply(this, arguments); if (AIRT.includes(type)) inc(S.called, type); if (type === 'aa') S.aaBuy++; if (type === 'gunship') S.gunSorties++; return u; });
  const _rs = T.__get('rtShoot');
  T.__set('rtShoot', function (a, d) { if (a.type === 'aa') { S.aaShots++; } if (T.UT[d.type].fly && ['aa', 'zu'].includes(a.type)) S.aaShotsAir++; return _rs.apply(this, arguments); });
  const _cg = T.__get('callGunship');
  T.__set('callGunship', function (n, r, c) { const aas = T.G.units.filter(o => o.nat !== n && (o.type === 'aa' || o.type === 'zu')); if (aas.length) { S.gunVsAA = (S.gunVsAA || 0) + 1; S.aaDist = (S.aaDist || 0) + Math.min(...aas.map(o => Math.hypot(o.x - c - .5, o.z - r - .5))); } return _cg.apply(this, arguments); });
  const _hi = T.__get('heliInsert'); T.__set('heliInsert', function () { S.heliIns++; return _hi.apply(this, arguments); });
  const _jr = T.__get('jetRun'); T.__set('jetRun', function () { S.jet++; return _jr.apply(this, arguments); });
  const _log = T.__get('L'); T.__set('L', function (s) { if (/전투기 격추/.test(s)) S.jetDown++; if (/수송헬기 격추/.test(s)) S.heliDown++; if (/수송헬기 피격, 투입 포기/.test(s)) S.heliAbort = (S.heliAbort || 0) + 1; if (/공격헬기 (미사일 )?피격.*복귀/.test(s)) S.gunRtb = (S.gunRtb || 0) + 1; return _log.apply(this, arguments); });
  await playAI(T, { size, seed });
  S.gunSurvive = S.gunSorties - (S.down.gunship || 0); S.min = +(T.G.time / 60).toFixed(1);
  return S;
}
function merge(A, B) { for (const k in B) { if (typeof B[k] === 'number') A[k] = (A[k] || 0) + B[k]; else { A[k] = A[k] || {}; merge(A[k], B[k]); } } return A; }
if (isMainThread) {
  const games = +(process.argv[2] || 8), size = process.argv[3] || 'm', seed0 = +(process.argv[4] || 30000);
  const W = Math.min(os.cpus().length, games); let next = 0; const tot = {};
  await Promise.all(Array.from({ length: W }, () => new Promise(res => {
    const w = new Worker(new URL(import.meta.url), { workerData: { size } });
    const go = () => { if (next >= games) { w.terminate(); res(); return; } w.postMessage(seed0 + next++); };
    w.on('message', s => { merge(tot, s); go(); }); w.on('error', e => { console.error(e); res(); }); go();
  })));
  const g = tot.games; const per = k => +((tot[k] || 0) / g).toFixed(2);
  console.log(`games ${g} (${size}), avg ${per('min')} min`);
  console.log('per game: aa bought', per('aaBuy'), '| aa shots', per('aaShots'), '| aa/zu shots at air', per('aaShotsAir'));
  console.log('gunship sorties', per('gunSorties'), 'shot down', +((tot.down?.gunship || 0) / g).toFixed(2), `(${Math.round(100 * (tot.down?.gunship || 0) / Math.max(1, tot.gunSorties))}%)`);
  console.log('gunship forced home (damaged)', per('gunRtb'));
  console.log('transport heli', per('heliIns'), 'down', per('heliDown'), 'aborted', per('heliAbort'), '| jets', per('jet'), 'down', per('jetDown'));
  console.log('sorties with enemy AA alive', per('gunVsAA'), 'avg nearest AA dist at call', +((tot.aaDist||0)/Math.max(1,tot.gunVsAA||0)).toFixed(1));
  console.log('aa teams lost', per('aaLost'), 'to gunship', per('aaLostToHeli'));
  console.log('called', tot.called, '\ndown', tot.down, '\nby', tot.by);
} else {
  parentPort.on('message', async seed => parentPort.postMessage(await one(seed, workerData.size)));
}
