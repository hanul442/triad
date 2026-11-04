// 밸런스 측정: AI끼리 여러 판을 돌려 병종별 생산·격파·손실과 성향·시작 위치별 승률을 모은다.
// 사용: node tools/balance.mjs [판 수=24] [라운드=30]
import { loadGame, playAI } from '../test/harness.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const GAMES = +(process.argv[2] || 24), ROUNDS = +(process.argv[3] || 30);
const per = {}; const P = t => (per[t] ||= { made: 0, kills: 0, deaths: 0, killVal: 0, deathVal: 0, dmg: 0 });
const wins = { pers: {}, slot: {}, games: 0 };
const count = (o, k) => (o[k] = (o[k] || 0) + 1);

for (let g = 0; g < GAMES; g++) {
  const T = loadGame();
  const ctx = Object.getPrototypeOf(T) && T; // __T 객체
  const glob = T.__ctx;
  let attacker = null;
  const wrap = (name, fn) => { const orig = T.__get(name); T.__set(name, fn(orig)); };
  wrap('produce', orig => function (n, type, r, c) { const ok = orig(n, type, r, c); if (ok) P(type).made++; return ok; });
  wrap('attack', orig => function (a, d) { attacker = a; const hp = d.hp; const r = orig(a, d); P(a.type).dmg += Math.max(0, hp - Math.max(0, d.hp)); attacker = null; return r; });
  wrap('fxKill', orig => function (u) { P(u.type).deaths++; P(u.type).deathVal += T.UT[u.type].cost[0];
    if (attacker && attacker !== u) { P(attacker.type).kills++; P(attacker.type).killVal += T.UT[u.type].cost[0]; } return orig(u); });
  const mt = g % 2 ? 'arch' : 'cont';
  const G = await playAI(T, { mt, vic: ROUNDS, size: 'm', timeoutMs: 120000 });
  wins.games++;
  const w = G.nats[G.over.win];
  count(wins.pers, w.pers); count(wins.slot, w.id);
  process.stdout.write(`판 ${g + 1}/${GAMES} (${mt}) 승자 ${w.id} ${w.pers} R${G.turn}\n`);
}

const rows = Object.entries(per).map(([t, s]) => ({ t, ...s, kd: s.deathVal ? s.killVal / s.deathVal : (s.killVal ? Infinity : 0) }))
  .sort((a, b) => b.made - a.made);
mkdirSync('docs', { recursive: true });
writeFileSync('docs/balance.json', JSON.stringify({ games: GAMES, rounds: ROUNDS, per, wins }, null, 1));
console.log('\n병종        생산  격파  손실  교환비(가치)  피해량');
const T0 = loadGame();
for (const r of rows) console.log(`${(T0.UT[r.t].n + '          ').slice(0, 9)} ${String(r.made).padStart(5)} ${String(r.kills).padStart(5)} ${String(r.deaths).padStart(5)} ${(r.kd === Infinity ? '∞' : r.kd.toFixed(2)).padStart(10)} ${String(r.dmg).padStart(7)}`);
console.log('\n성향별 승리', wins.pers, '\n시작 위치별 승리', wins.slot);
