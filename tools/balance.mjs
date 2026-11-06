// 밸런스 측정: AI끼리 여러 판을 돌려 출발 위치별 승률, 게임 길이, 병종별 격파·손실을 모은다.
// 사용: node tools/balance.mjs [판 수=20] [세력 수=2]
import { loadGame, playAI } from '../test/harness.mjs';

const GAMES = +(process.argv[2] || 20), NATS = +(process.argv[3] || 2);
const wins = {}, len = [], per = {};
const P = t => (per[t] ||= { made: 0, kills: 0, deaths: 0 });
for (let g = 0; g < GAMES; g++) {
  const T = loadGame();
  let shooter = null;
  const wrap = (name, fn) => { const orig = T.__get(name); T.__set(name, fn(orig)); };
  wrap('mkUnit', o => function (n, t, r, c) { P(t).made++; return o(n, t, r, c); });
  wrap('kill', o => function (u, by) { P(u.type).deaths++; if (by) P(by.type).kills++; return o(u, by); });
  const slots = ['ai', 'ai', NATS > 2 ? 'ai' : 'none', NATS > 3 ? 'ai' : 'none'];
  await playAI(T, { slots, size: 'm', seed: 1000 + g });
  const w = T.G.over?.win; wins[w] = (wins[w] || 0) + 1; len.push(T.G.time);
}
console.log(`${GAMES}판, ${NATS}세력 · 평균 ${(len.reduce((a, b) => a + b, 0) / len.length / 60).toFixed(1)}분`);
console.log('승리(세력 번호):', wins);
console.table(Object.fromEntries(Object.entries(per).map(([t, v]) => [t, { ...v, 'K/D': (v.kills / Math.max(1, v.deaths)).toFixed(2) }])));
