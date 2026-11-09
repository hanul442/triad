// 시뮬 결과 지문: 시드를 고정해 AI 게임을 돌리고 몇 초마다 게임 상태를 해시한다.
// 최적화 전후로 돌려 같은 값이 나오면 게임 결과가 그대로라는 뜻이다.
// 사용: node tools/simhash.mjs [크기=m] [초=180] [시드=3] [세력=4]
import { loadGame, seedRandom } from '../test/harness.mjs';
import crypto from 'node:crypto';
const size = process.argv[2] || 'm', secs = +(process.argv[3] || 180), seed = +(process.argv[4] || 3), nn = +(process.argv[5] || 4);
const T = loadGame(); seedRandom(T, seed);
const slots = ['ai', 'ai', 'ai', 'ai'].map((s, i) => i < nn ? 'ai' : 'none');
T.newGame({ slots, size, diff: 'normal', fog: true, speed: 0, seed });
const h = crypto.createHash('sha1');
const snap = G => {
  const u = G.units.map(u => [u.id, u.type, u.nat, u.x, u.z, u.hp, u.face, u.tgt, (u._men || []).map(m => [m.x, m.z, m.dead, m.down])]);
  const m = []; for (const row of G.map) for (const x of row) m.push(x.t, x.owner, x.bhp);
  return JSON.stringify([G.time, u, m, G.order.map(n => [G.nats[n].vp, G.nats[n].cp, G.nats[n].alive]), (G.cas || []).length]);
};
const t0 = performance.now(); let simT = 0, i = 0;
for (; i < secs * 10 && !T.G.over; i++) { const a = performance.now(); T.rtTick(0.1); simT += performance.now() - a; if (i % 50 === 49) h.update(snap(T.G)); }
h.update(snap(T.G));
const G = T.G;
console.log(`${size} seed ${seed} n${nn}: ${G.time.toFixed(0)}s, units ${G.units.length}, errs ${(G.errs || []).length}, ${(simT / i).toFixed(2)} ms/tick, hash ${h.digest('hex').slice(0, 16)}`);
