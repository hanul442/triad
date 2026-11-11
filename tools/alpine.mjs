// 알프스 지도 점검: 글자 지도(땅 종류 + 높이)와 통계.
// 사용: node tools/alpine.mjs [size=m] [seed=1] [clime=temp]
import { loadGame } from '../test/harness.mjs';
const [size = 'm', seed = '1', clime = 'temp'] = process.argv.slice(2);
const T = loadGame();
T.newGame({ slots: ['ai', 'ai', 'ai', 'ai'], size, layout: 'alpine', clime, seed: +seed, speed: 0 });
const G = T.G, N = T.N;
let out = '';
for (let r = 0; r < N; r++) { let l = '';
  for (let c = 0; c < N; c++) { const x = G.map[r][c];
    const ch = x.obj != null ? '@' : x.summit ? 'A' : x.mtr ? ':' : x.t === 'road' ? '=' : x.t === 'bldg' ? (x.hospice ? 'H' : x.church ? '+' : x.hut ? 'u' : 'h') : x.cliff ? '#' : x.scree ? '%' : x.snow ? '*' : x.alm ? ',' : x.wild ? 'T' : x.t === 'water' ? '~' : x.mead ? '.' : x.grav ? '_' : '?';
    l += ch; }
  out += l + '  ' + Array.from({ length: N }, (_, c) => { const e = G.map[r][c].el || 0; return e < 1 ? ' ' : e < 4 ? '1' : e < 8 ? '2' : e < 12 ? '3' : e < 16 ? '4' : e < 20 ? '5' : e < 24 ? '6' : '7'; }).join('') + '\n'; }
console.log(out);
const cnt = {}; for (const row of G.map) for (const x of row) { const k = x.cliff ? 'cliff' : x.scree ? 'scree' : x.mtr ? 'trail' : x.snow ? 'snow' : x.t; cnt[k] = (cnt[k] || 0) + 1; }
console.log(JSON.stringify(cnt));
console.log('objs', G.objs.map(o => `${o.name}(${G.map[o.r][o.c].alpRole})`).join(', '));
console.log('feat', JSON.stringify(G.feat), 'max el', Math.max(...G.elv).toFixed(1), 'units', G.units.map(u => u.type).join(','));
