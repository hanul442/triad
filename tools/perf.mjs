// 성능 측정: 4세력 AI를 큰 지도에서 돌리며 시뮬 틱 하나에 걸리는 시간을 잰다.
// 사용: node tools/perf.mjs [크기=l] [초=240] [시드=7]
import { loadGame } from '../test/harness.mjs';
const size = process.argv[2] || 'l', secs = +(process.argv[3] || 240), seed = +(process.argv[4] || 7);
const T = loadGame();
T.newGame({ slots: ['ai', 'ai', 'ai', 'ai'], size, diff: 'normal', fog: true, speed: 0, seed });
const segs = [];
let t = performance.now(), seg = performance.now(), maxU = 0;
for (let i = 0; i < secs * 10 && !T.G.over; i++) {
  T.rtTick(0.1);
  maxU = Math.max(maxU, T.G.units.length);
  if (i % 300 === 299) { segs.push(((performance.now() - seg) / 300).toFixed(2)); seg = performance.now(); }
}
const ms = performance.now() - t;
console.log(`map ${size} seed ${seed}: ${(T.G.time).toFixed(0)}s sim, ${(ms / (T.G.time * 10)).toFixed(2)} ms/tick avg, max units ${maxU}`);
console.log('ms/tick per 30s:', segs.join(' '));
