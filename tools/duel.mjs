// 1:1 대결 측정: 트인 도로 위에 두 부대를 마주 세우고(명령 없음, 자동 사격만) 누가 이기는지 여러 번 굴린다.
// 사용: node tools/duel.mjs [번 수=40] [시간 초=90]
import { loadGame } from '../test/harness.mjs';

const RUNS = +(process.argv[2] || 40), SECS = +(process.argv[3] || 90);
const CASES = [
  ['tank', 'rifle', 4], ['tank', 'rifle', 2.5], ['tank', 'rifle:norocket', 2.5], ['tank', 'mg', 4],
  ['tank', 'at', 3], ['tank', 'tank', 5], ['ifv', 'rifle', 4], ['hmv', 'rifle', 4], ['spg', 'rifle', 2],
  ['rifle', 'rifle', 4], ['mg', 'rifle', 4], ['sniper', 'rifle', 6],
  ['tank', 'rifle:bldg', 4], ['tank', 'rifle:bldg:norocket', 3], ['rifle', 'rifle:bldg', 4], ['ifv', 'rifle:bldg', 4], ['tank', 'mg:bldg', 4],
  ['mortar', 'rifle', 5], ['tank', 'rifle:wall', 4], ['at', 'tank:side', 3], ['rifle', 'tank:side', 2.5], ['rifle:norocket', 'tank', 2.5], ['mg', 'hmv', 4], ['hmv', 'ifv:side', 4], ['ifv', 'tank:side', 4],
];
const put = (T, n, ty, x, z, face) => { const u = T.mkUnit(n, ty, Math.floor(z), Math.floor(x)); u.x = x; u.z = z; u.face = face; u.hd = face; u.tf = face; u.cd = Math.random(); return u; };
const alive = (T, u) => T.G.units.includes(u);
const able = (T, u) => T.UT[u.type].cls === 'inf' ? u.ws ? u.ws.filter(w => w.s === 'ok' || w.s === 'lw').length : 9 : null;
for (const [a0, b0, d] of CASES) {
  const [bt, ...opts] = b0.split(':');const opt = o => opts.includes(o);
  let bh = 0, aw = 0, bw = 0, draw = 0, aT = 0, bT = 0, aH = 0, bH = 0, bMen = 0;
  for (let k = 0; k < RUNS; k++) {
    const T = loadGame();
    T.newGame({ slots: ['human', 'human', 'none', 'none'], size: 's', seed: 3, fog: false });
    const G = T.G; G.units = []; G.props = []; G.covers = [];
    for (let r = 0; r < T.N; r++) for (let c = 0; c < T.N; c++) G.map[r][c] = { t: 'road', owner: null, obj: null, smoke: 0 };
    G.nats[0].ctrl = G.nats[1].ctrl = 'human';
    T.__set('aiThink', () => {}); T.__set('checkOver', () => {});
    T.bump();
    const [at, aop] = a0.split(':'); const A = put(T, 0, at, 8.5, 10.5, 0), B = put(T, 1, bt, 8.5 + d, 10.5, opt('side') ? 90 : 180); if (aop === 'norocket') A.rk = 0;
    if (opt('norocket')) B.rk = 0;
    if (opt('bldg')) { const r = 10, c = Math.floor(8.5 + d); G.map[r][c] = { t: 'bldg', f: 2, bmax: 14, bhp: 14, owner: null, obj: null, smoke: 0, blk: 9 }; G.navV = (G.navV || 0) + 1; T.bump(); }
    if (opt('wall')) { G.covers.push({ x: 8.5 + d - .3, z: 10.5, r: .3, cov: .35, kind: 'barrier' }); T.bump(); }
    A.hold = B.hold = 1;
    let t = 0;
    for (; t < SECS && alive(T, A) && alive(T, B); t += 0.1) { T.rtTick(0.1); A.path = []; B.path = []; }
    const ea = alive(T, A), eb = alive(T, B);
    if (ea && !eb) { aw++; aT += t; } else if (eb && !ea) { bw++; bT += t; } else draw++;
    aH += ea ? A.hp : 0; bH += eb ? B.hp : 0; if (eb && able(T, B) != null) bMen += able(T, B); const bc = G.map[10][Math.floor(8.5 + d)]; bh += bc.t === 'bldg' ? bc.bhp : 0;
  }
  const p = v => (100 * v / RUNS).toFixed(0).padStart(3) + '%';
  console.log(`${a0.padEnd(6)} vs ${b0.padEnd(15)} ${String(d).padEnd(4)}칸 | A승 ${p(aw)}${aw ? ` (${(aT / aw).toFixed(0)}s)` : ''} B승 ${p(bw)}${bw ? ` (${(bT / bw).toFixed(0)}s)` : ''} 무 ${p(draw)} | 남은hp A ${(aH / RUNS).toFixed(1)} B ${(bH / RUNS).toFixed(1)}${bt !== 'tank' && bMen ? ` B남은병사 ${(bMen / RUNS).toFixed(1)}` : ''}${opt('bldg') ? ` 건물hp ${(bh / RUNS).toFixed(1)}/14` : ''}`);
}
