// 지도 생성 점검: 지형(고저차·강·다리·철도)을 글자 지도로 찍고 기본 통계를 낸다.
// 사용: node tools/terrain.mjs [layout=river] [relief=hills] [size=m] [seed=1]
import { loadGame } from '../test/harness.mjs';
const [layout = 'river', relief = 'hills', size = 'm', seed = '1'] = process.argv.slice(2);
const T = loadGame();
T.newGame({ slots: ['ai', 'ai', 'ai', 'ai'], size, layout, relief, seed: +seed, speed: 0 });
const G = T.G, N = T.N;
let out = '';
for (let r = 0; r < N; r++) { let l = '';
  for (let c = 0; c < N; c++) { const x = G.map[r][c];
    const ch = x.obj != null ? '@' : x.rail ? (x.t === 'road' ? '+' : x.br ? '=' : x.plat ? 'P' : '#') : x.br ? 'B' : x.t === 'water' ? '~' : x.t === 'road' ? '.' : x.t === 'bldg' ? (x.stn ? 'S' : x.ind ? 'i' : x.f >= 8 ? 'H' : x.f >= 4 ? 'M' : 'h') : x.t === 'park' ? (x.hill ? '^' : '"') : x.t === 'plaza' ? ',' : x.t === 'rubble' ? '%' : '?';
    l += ch; }
  out += l + '   ' + Array.from({ length: N }, (_, c) => { const e = G.map[r][c].el || 0; return e < .25 ? ' ' : e < 1 ? '·' : e < 2 ? ':' : e < 3 ? '*' : '#'; }).join('') + '\n'; }
console.log(out);
const cnt = {}; for (const row of G.map) for (const x of row) { const k = x.t + (x.ind ? ':ind' : ''); cnt[k] = (cnt[k] || 0) + 1; }
console.log(JSON.stringify(cnt), 'objs', G.objs.length, G.objs.map(o => o.name).join(','), 'feat', JSON.stringify({ ...G.feat, river: G.feat.river && { w: G.feat.river.w, n: G.feat.river.pts.length }, rail: G.feat.rail && G.feat.rail.pts.length }));
console.log('max el', Math.max(...(G.elv || [0])), 'units', G.units.length);
