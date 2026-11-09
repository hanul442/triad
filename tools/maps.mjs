// 지도 종류별 AI 대전: 판 길이, 승자, 오류, 부대 손실을 센다 (03c-biome 점검용).
// 사용: node tools/maps.mjs [판 수=3] [크기=m] [배치들=country,forest,port] [기후=rand]
import { loadGame, playAI, seedRandom } from '../test/harness.mjs';
const GAMES = +(process.argv[2] || 3), SIZE = process.argv[3] || 'm', LAYS = (process.argv[4] || 'country,forest,port').split(','), CL = process.argv[5] || 'rand';
for (const layout of LAYS) { let len = 0, errs = 0, win = {}, loss = 0, ms = 0;
  for (let g = 0; g < GAMES; g++) { const T = loadGame(); seedRandom(T, 300 + g);
    const r = await playAI(T, { size: SIZE, seed: 3000 + g, layout, relief: 'rand', clime: CL, slots: ['ai', 'ai', 'ai', 'ai'] });
    const G = T.G; len += G.time; errs += (G.errs || []).length; ms += r.ms; const w = G.over ? G.over.win : 'none'; win[w] = (win[w] || 0) + 1;
    for (const n of G.order) loss += G.nats[n].losses || 0;
    if ((G.errs || []).length) console.log(layout, g, JSON.stringify(G.errs.slice(0, 2))); }
  console.log(`${layout}: ${GAMES}판 · 평균 ${(len / GAMES / 60).toFixed(1)}분 · 승자 ${JSON.stringify(win)} · 판당 손실 ${(loss / GAMES).toFixed(0)} · 오류 ${errs} · 판당 ${(ms / GAMES / 1000).toFixed(0)}초`); }
