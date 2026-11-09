// 오마하(생로랑) 관전 판을 여러 번 돌려 블루가 어디서 막히는지 본다.
// node tools/omaha.mjs [판 수] [verbose] [id]
import { loadGame, seedRandom } from '../test/harness.mjs';
const s0 = +(process.env.S0 || 100), n = +(process.argv[2] || 4), verbose = process.argv[3] === 'v', id = process.argv[4] || 'omaha';
let wins = 0;
for (let g = 0; g < n; g++) {
  const T = loadGame(); seedRandom(T, s0 + g);
  T.__get('specStart')({ map: 'camp:' + id });
  const G = T.G; let last = -1;
  const snap = () => {
    const O = G.objs.map(o => G.map[o.r][o.c].owner === 0 ? 'B' : G.map[o.r][o.c].owner === 1 ? 'R' : '-').join('');
    const b = G.units.filter(u => u.nat === 0), r = G.units.filter(u => u.nat === 1);
    const beach = b.filter(u => u.x < 15).length, top = b.filter(u => u.x >= 15).length;
    const types = {}; for (const u of b) types[u.type] = (types[u.type] || 0) + 1;
    return `t=${Math.round(G.time)} obj=${O} blue=${b.length}(beach ${beach}, up ${top}) red=${r.length} lost=${G.nats[0].losses} sunk=${G.camp.st.sunk || 0} cp=${Math.round(G.nats[0].cp)} ${JSON.stringify(types)}`;
  };
  for (let i = 0; i < 20000 && !G.over; i++) {
    T.rtTick(0.1);
    if (verbose && Math.floor(G.time / 60) !== last) { last = Math.floor(G.time / 60); console.log('  ' + snap()); }
  }
  if (G.over && G.over.win === 0) wins++;
  console.log(`game ${g}: ${JSON.stringify(G.over)} ${snap()}`);
}
console.log(`blue wins ${wins}/${n}`);
