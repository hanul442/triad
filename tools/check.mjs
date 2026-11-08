// 안정성 검사: AI끼리 여러 판을 돌리며 "화면과 규칙이 어긋나는" 순간과 오류를 센다.
// 사용: node tools/check.mjs [판 수=20] [크기=m] [시작 시드=5000] [동시 실행=CPU 수]
//   --json  결과를 JSON 한 줄로도 낸다(다른 도구가 읽게)
// 판마다 따로 프로세스를 띄워 동시에 돌린다. 한 판 결과는 자식 프로세스가 JSON으로 돌려준다.
import { fork } from 'node:child_process';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { loadGame, playAI } from '../test/harness.mjs';

/* 검사 항목: 이름 → 설명. 숫자는 "판마다 몇 번" 생겼는지. */
const CHECKS = {
  err: 'AI·틱 오류(G.errs)',
  nan: '위치가 숫자가 아님(NaN)',
  gable: '박공지붕 위에 선 보병(표본)',
  vehBldg: '건물 칸 안의 지상 차량(표본)',
  stuck: '20초 넘게 길이 있는데 제자리(제압 제외)',
  shootClimb: '계단을 오르내리는 중에 쏨',
  hitClimb: '계단 위 부대가 바깥에서 맞음',
  flashNoLos: '쏜 병사 중 표적이 안 보이는 병사(예광탄이 벽·소품을 뚫음)',
  propLos: '세운 소품·잔해 차량을 뚫고 지나간 직사(보병 눈높이)',
  unseen: '세력 시야에 없는 표적을 쏨',
  soldierWall: '분대와 다른 건물 공간에 끼인 병사(표본)',
  longGame: '20분 넘게 끝나지 않은 판',
};

async function oneGame(seed, size) {
  const T = loadGame();
  const get = n => T.__eval(`typeof ${n}!=='undefined'?${n}:undefined`);
  const c = Object.fromEntries(Object.keys(CHECKS).map(k => [k, 0]));
  const ex = {};   // 항목별 첫 예시 몇 개
  const note = (k, s) => { c[k]++; (ex[k] = ex[k] || []).length < 3 && ex[k].push(s); };
  const UT = T.UT, losPt = get('losPt'), eye = get('eye'), cell = get('cell');
  const gable = get('gableRoof') || (x => x.t === 'bldg' && x.dist === 'res' && x.f <= 2 && 1 - x.bhp / x.bmax < .4);
  const onRoof = get('onRoof'), curFl = get('curFl'), bldgBox = get('bldgBox'), sameBlk = get('sameBlk');
  const propHit = get('propBlocks');
  let shots = 0;
  const _rs = get('rtShoot');
  T.__set('rtShoot', function (a, d) {
    const G = T.G, ta = UT[a.type];
    if (G.units.includes(a) && G.units.includes(d) && !ta.ind && !ta.fly && !UT[d.type].fly) {
      shots++;
      if (a.climb) note('shootClimb', `${a.type}#${a.id} t=${G.time.toFixed(0)}`);
      if (d.onSt && cell(d.r, d.c).t === 'bldg' && cell(a.r, a.c) !== cell(d.r, d.c) && !sameBlk(cell(a.r, a.c), cell(d.r, d.c))) note('hitClimb', `${a.type}→${d.type} t=${G.time.toFixed(0)}`);
      if (G.fog && !T.seen(d, a.nat)) note('unseen', `${a.type}→${d.type}`);
      // 직사가 소품을 뚫는가: 사수·표적 눈높이가 둘 다 낮을 때만(세운 물체보다 위로 넘겨 쏘면 괜찮다)
      const ea = eye(a), ed = eye(d);
      if (ea < .7 && ed < .7) {
        for (const o of G.covers || []) {
          if (o.kind !== 'car' && o.kind !== 'wreck') continue;
          const vx = d.x - a.x, vz = d.z - a.z, L2 = vx * vx + vz * vz || 1;
          const t = ((o.x - a.x) * vx + (o.z - a.z) * vz) / L2; if (t < .12 || t > .88) continue;
          const px = a.x + vx * t, pz = a.z + vz * t; const R = (o.r ?? .2) * .85;
          const da = Math.hypot(o.x - a.x, o.z - a.z), dd = Math.hypot(o.x - d.x, o.z - d.z);
          if (Math.hypot(px - o.x, pz - o.z) < R && da > R + .3 && dd > R + .3) { note('propLos', `${a.type}→${d.type} ${o.kind}`); break; }
        }
      }
    }
    const eA = eye(a), eD = eye(d);
    const r = _rs(a, d);
    if (ta.cls === 'inf' && a._sh && a._men && G.units.includes(a)) {
      for (const i of a._sh) { const m = a._men[i]; if (!m) continue;
        const own = Math.floor(m.z) === a.r && Math.floor(m.x) === a.c, h = own ? eA : get('eyeAt')(a.type, Math.floor(m.z), Math.floor(m.x));
        if (Math.hypot(m.x - d.x, m.z - d.z) > .15 && !losPt(m.x, m.z, h, d.x, d.z, eD)) { note('flashNoLos', `${a.type}#${a.id} 병사${i}`); break; } }
    }
    return r;
  });
  const stillT = new Map();
  const check = G => {
    for (const u of G.units) {
      const t = UT[u.type];
      if (!Number.isFinite(u.x) || !Number.isFinite(u.z)) { note('nan', `${u.type}#${u.id}`); continue; }
      const x = cell(u.r, u.c);
      if (t.cls === 'inf' && x.t === 'bldg' && gable(x) && onRoof(u)) note('gable', `${u.type}#${u.id} (${u.r},${u.c}) f=${x.f}`);
      if (t.cls === 'veh' && !t.fly && x.t === 'bldg') { const b = bldgBox(u.r, u.c); if (u.x > b[0] && u.x < b[1] && u.z > b[2] && u.z < b[3]) note('vehBldg', `${u.type}#${u.id}`); }
      if (u.path && u.path.length && !u.climb && !((u.supp || 0) >= 1.6 && t.cls === 'inf')) {   // 제압당해 엎드린 분대는 원래 못 움직인다
        const s = stillT.get(u.id);
        if (!s || Math.hypot(s[0] - u.x, s[1] - u.z) > .1) stillT.set(u.id, [u.x, u.z, G.time]);
        else if (G.time - s[2] > 20) { note('stuck', `${u.type}#${u.id} (${u.r},${u.c})`); stillT.set(u.id, [u.x, u.z, G.time]); }
      } else stillT.delete(u.id);
      if (t.cls === 'inf' && u._men && !u.climb) {
        const ux = cell(u.r, u.c);
        for (const m of u._men) { if (m.dead || m.down || m.gone || m.task) continue;
          const r = Math.floor(m.z), c2 = Math.floor(m.x); const mx = G.map[r] && G.map[r][c2]; if (!mx) continue;
          // 병사가 건물 상자 안인데 분대는 그 건물(같은 블록) 밖: 벽 속에 끼었다
          // 분대장 발자국이 지나간 건물이면(드나드는 중) 괜찮다
          const via = (u._tr || []).some(p => { const y = G.map[Math.floor(p[1])]?.[Math.floor(p[0])]; return y && (y === mx || sameBlk(y, mx)); });
          if (mx.t === 'bldg' && mx !== ux && !sameBlk(mx, ux) && !via) { const b = bldgBox(r, c2);
            if (m.x > b[0] + .06 && m.x < b[1] - .06 && m.z > b[2] + .06 && m.z < b[3] - .06) { note('soldierWall', `${u.type}#${u.id} 병사${m.i}`); break; } }
        }
      }
    }
  };
  await playAI(T, { size, seed, check, slots: ['ai', 'ai', 'ai', 'ai'] });
  const G = T.G;
  for (const e of G.errs || []) note('err', String(e).split('\n').slice(0, 2).join(' | '));
  if (!G.over) note('longGame', `seed ${seed}`);
  return { seed, time: G.time, over: !!G.over, shots, c, ex };
}

const self = fileURLToPath(import.meta.url);
if (process.argv[2] === '--child') {
  const [seed, size] = [+process.argv[3], process.argv[4]];
  oneGame(seed, size).then(r => { process.send(r); process.exit(0); }, e => { process.send({ seed, fatal: String(e && e.stack || e) }); process.exit(0); });
} else {
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const GAMES = +(args[0] || 20), SIZE = args[1] || 'm', S0 = +(args[2] || 5000), PAR = +(args[3] || os.cpus().length);
  const json = process.argv.includes('--json');
  const res = []; let next = 0;
  const run = () => new Promise(done => {
    const go = () => { if (next >= GAMES) return done(); const seed = S0 + next++;
      const p = fork(self, ['--child', String(seed), SIZE], { stdio: ['ignore', 'ignore', 'inherit', 'ipc'] });
      let got = null; p.on('message', m => { got = m; }); p.on('exit', () => { res.push(got || { seed, fatal: 'no result' }); if (!json) process.stderr.write('.'); go(); }); };
    go(); });
  const t0 = Date.now();
  await Promise.all(Array.from({ length: Math.min(PAR, GAMES) }, run));
  if (!json) process.stderr.write('\n');
  const tot = Object.fromEntries(Object.keys(CHECKS).map(k => [k, 0])); const ex = {}; let shots = 0, time = 0; const fatal = [];
  for (const r of res) { if (r.fatal) { fatal.push(r); continue; } shots += r.shots; time += r.time;
    for (const k in r.c) { tot[k] += r.c[k]; for (const s of r.ex[k] || []) (ex[k] = ex[k] || []).length < 3 && ex[k].push(`seed ${r.seed}: ${s}`); } }
  const ok = res.length - fatal.length;
  console.log(`${ok}/${GAMES}판 (${SIZE}) · 평균 ${(time / Math.max(1, ok) / 60).toFixed(1)}분 · 직사 ${shots}발 · ${((Date.now() - t0) / 1000).toFixed(0)}초`);
  for (const k in CHECKS) {
    const v = tot[k]; const per = ['flashNoLos', 'propLos', 'shootClimb', 'hitClimb', 'unseen'].includes(k) ? ` (${(100 * v / Math.max(1, shots)).toFixed(2)}%)` : '';
    console.log(`${v ? '✗' : '✓'} ${CHECKS[k]}: ${v}${per}`);
    for (const s of ex[k] || []) console.log(`    ${s}`);
  }
  for (const f of fatal) console.log(`✗ 시드 ${f.seed} 실행 실패: ${f.fatal.split('\n')[0]}`);
  if (json) console.log(JSON.stringify({ games: ok, shots, tot, fatal: fatal.length }));
  process.exitCode = fatal.length || tot.err || tot.nan ? 1 : 0;
}
