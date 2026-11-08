// 지형 조합별 AI 대전: 오류·판 길이·승패·교착(시간 초과)을 센다.
// 사용: node tools/terrain-games.mjs [판 수=6] [크기=s] [players=2]
import { loadGame, playAI } from '../test/harness.mjs';
const GAMES = +(process.argv[2] || 6), SIZE = process.argv[3] || 's', P = +(process.argv[4] || 2);
const slots = ['ai', 'ai', P > 2 ? 'ai' : 'none', P > 3 ? 'ai' : 'none'];
for (const [layout, relief] of [['sym', 'flat'], ['sym', 'hills'], ['river', 'hills'], ['river', 'steep']]) {
  let errs = 0, len = 0, over = 0, ms = 0, stuck = 0; const wins = {}, eMsg = new Set(); let slow = 0, slowN = 0, hiShots = 0, shots = 0;
  for (let g = 0; g < GAMES; g++) {
    const T = loadGame(); const t0 = Date.now();
    const o = T.__get('rtShoot'); T.__set('rtShoot', function (a, d) { shots++; const el = T.__get('elT'), e = u => el(u.r, u.c); if (e(a) > e(d) + 1) hiShots++; return o(a, d); });
    const check = G => { for (const u of G.units) if (u.path?.length && T.UT[u.type].cls !== 'air') { slowN++; } };
    await playAI(T, { size: SIZE, seed: 900 + g, layout, relief, slots, check });
    ms += Date.now() - t0; len += T.G.time; if (T.G.over) over++; else stuck++;
    for (const e of T.G.errs || []) { errs++; eMsg.add(String(e.msg || e).slice(0, 120)); }
    const w = (T.G.over?.win ?? '-') + ':' + (T.G.over?.why || '').slice(0, 6); wins[w] = (wins[w] || 0) + 1;
  }
  console.log(`${layout}/${relief}: ${GAMES}판 평균 ${(len / GAMES / 60).toFixed(1)}분, 끝남 ${over}, 시간초과 ${stuck}, 오류 ${errs}, 승 ${JSON.stringify(wins)}, 높은 곳 사격 ${(100 * hiShots / Math.max(1, shots)).toFixed(0)}%, 실행 ${(ms / GAMES / 1000).toFixed(1)}s/판`);
  if (eMsg.size) console.log('  ', [...eMsg].join('\n   '));
}
