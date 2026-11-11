// 게임 설명서(08y-manual.js의 manualHtml)를 인쇄용 A4 PDF로 뽑는다.
//   node tools/manual-pdf.mjs [--shots 스크린샷폴더] [--out 파일.pdf]
// - 설명서 내용은 게임 코드에서 그대로 읽으므로, 설명서가 바뀐 뒤 다시 돌리면 최신판이 나온다.
// - 한글은 Google Fonts의 Noto Sans KR을 쓴다(인터넷 필요). 쪽 번호는 CSS @page로 넣는다(Chromium 131+).
// - 스크린샷 폴더(기본 /mnt/project-files/triad-shots)에 SHOTS의 파일이 없으면 그 그림만 빼고 만든다.
// - 목차 쪽 번호: 장마다 새 쪽에서 시작하므로, 장을 하나씩 따로 찍어 쪽 수를 센 뒤 목차를 채운다.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { loadGame } from '../test/harness.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const shotsDir = resolve(arg('--shots', '/mnt/project-files/triad-shots'));
const out = resolve(arg('--out', join(root, 'dist', 'triad-manual.pdf')));

let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); }
catch { console.error('playwright가 필요합니다: npm i -D playwright 또는 전역 설치'); process.exit(1); }

/* 장마다 붙일 스크린샷(파일, 설명). 표지는 cover. */
const SHOTS = {
  cover: ['director-over.png'],
  quick: [['look-top.png', '위에서 본 전장. 아래 하단 바에서 증원·지원·속도를 고릅니다.']],
  win: [['occupancy-badges.png', '거점과 건물 점유 표시.']],
  phone: [['controls-phone-unit.png', '휴대폰에서 부대를 고른 화면.']],
  pc: [['controls-pc.png', 'PC 화면: 왼쪽 위 작은 지도, 아래 부관 지휘 바.']],
  cmd: [['form-tank-escort.png', '전차 뒤에 붙어 걷는 보병 소대.']],
  units: [['veh-closeups.png', '차량 모형들.'], ['soldier-kit.png', '보병 장비와 자세.']],
  eng: [['v11-breach.png', '벽을 뚫고 건물로 들어가는 분대.']],
  sup: [['strike-big-impact.png', '항공 폭탄 탄착.'], ['air-attack-heli.png', '숲 위를 지나는 공격헬기.']],
  sight: [['night-nvg.png', '밤: 야간투시경 화면.'], ['wx-fog.png', '짙은 안개.']],
  cover2: [['men-contact.png', '접적하자 흩어져 엄폐하는 병사들.']],
  cqb: [['cqb-entry.png', '건물 돌입.'], ['stairs-cut.png', '층마다 나뉜 건물 안 전투.']],
  veh: [['gunfx-tank-a.png', '전차 사격.']],
  air: [['air-droneteam.png', '드론팀과 FPV.']],
  cas: [['casualty-evac.png', '부상자 후송.']],
  logi: [['supply-truck.png', '보급 트럭이 탄약을 나르는 모습.']],
  fort: [['fort2-bunker-mine-aid-amb.png', '벙커·구호소·구급차.']],
  wreck: [['wreck-street.png', '폭격 뒤 무너진 거리.']],
  modes: [['landing-omaha.png', '상륙 작전.'], ['record-summary.png', '전투 기록 요약.']],
};
const shotKey = id => id === 'cover' ? 'cover2' : id; // 설명서의 '엄폐' 장 id가 cover라 표지와 겹치지 않게

function dataUrl(f) {
  const p = join(shotsDir, f);
  if (!existsSync(p)) return null;
  const ext = f.toLowerCase().endsWith('.jpg') ? 'jpeg' : 'png';
  return `data:image/${ext};base64,` + readFileSync(p).toString('base64');
}

const T = loadGame();
const manual = T.__eval('manualHtml()');
let rev = '', date = new Date().toISOString().slice(0, 10);
try { rev = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim(); } catch {}

const CSS = `
@page{size:A4;margin:18mm 17mm 20mm;
  @bottom-center{content:counter(page);font:500 9pt 'Noto Sans KR',sans-serif;color:#7a8592}
  @bottom-left{content:'TRIAD 시가전 · 게임 설명서';font:400 8pt 'Noto Sans KR',sans-serif;color:#9aa3ad}}
@page :first{margin:0;@bottom-center{content:none}@bottom-left{content:none}}
:root{--ink:#16202b;--muted:#4a5562;--line:#d6dce2;--soft:#f2f5f8;--acc:#2f6bd8;--acc2:#c8862a}
*{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;font-family:'Noto Sans KR',sans-serif;color:var(--ink);font-size:9.6pt;line-height:1.62;word-break:keep-all;overflow-wrap:break-word}
b{font-weight:700;color:var(--ink)} em{font-style:normal}
.cover{height:297mm;width:210mm;position:relative;background:#0d1217;color:#fff;overflow:hidden;break-after:page}
.cover img{width:100%;height:178mm;object-fit:cover;display:block}
.cover .fade{position:absolute;left:0;right:0;top:118mm;height:60mm;background:linear-gradient(transparent,#0d1217)}
.cover .t{padding:10mm 18mm 0}
.cover .k{font-size:10pt;letter-spacing:.35em;color:#8fb3f5;font-weight:700}
.cover h1{font-size:46pt;line-height:1.05;margin:4mm 0 2mm;font-weight:900;letter-spacing:-.01em}
.cover h1 span{color:#8fb3f5}
.cover .sub{font-size:17pt;font-weight:500;color:#dfe6ee;margin:0}
.cover .lead{font-size:10pt;color:#aab6c3;max-width:150mm;margin:8mm 0 0;line-height:1.7}
.cover .meta{position:absolute;left:18mm;right:18mm;bottom:14mm;display:flex;justify-content:space-between;font-size:8.5pt;color:#7f8c99;border-top:1px solid #2a3542;padding-top:4mm}
.toc{break-after:page}
.toc h2,.sec>h2{font-size:22pt;font-weight:900;margin:0 0 6mm;letter-spacing:-.01em}
.toc ol{list-style:none;margin:0;padding:0;columns:1}
.toc li{display:flex;align-items:baseline;gap:3mm;padding:2.1mm 0;border-bottom:1px solid var(--line);font-size:10.5pt}
.toc li .n{color:var(--acc);font-weight:700;width:9mm;font-variant-numeric:tabular-nums}
.toc li a{color:var(--ink);text-decoration:none;flex:1}
.toc li .p{color:var(--muted);font-variant-numeric:tabular-nums}
.toc .intro{color:var(--muted);font-size:9.8pt;margin:0 0 6mm;line-height:1.7}
.sec{break-before:page}
.sec .num{display:block;font-size:10pt;font-weight:700;color:var(--acc);letter-spacing:.2em;margin-bottom:1mm}
.sec>h2{border-bottom:2.5px solid var(--ink);padding-bottom:3mm}
.figs{display:flex;gap:4mm;margin:0 0 5mm}
figure{margin:0;flex:1;min-width:0;break-inside:avoid}
figure img{width:100%;max-height:92mm;object-fit:cover;border-radius:2mm;display:block;border:1px solid var(--line)}
figure.tall img{max-height:120mm;object-fit:contain;background:var(--soft)}
figcaption{font-size:8pt;color:var(--muted);margin-top:1.5mm}
.man-b>p{margin:0 0 3mm;color:var(--muted)}
ul.rules{margin:0 0 3mm;padding:0;list-style:none}
ul.rules>li{position:relative;padding:0 0 0 5mm;margin:0 0 2.4mm;break-inside:avoid}
ul.rules>li::before{content:'';position:absolute;left:0;top:.62em;width:2mm;height:2mm;border-radius:50%;background:var(--acc2)}
h4{font-size:12pt;margin:6mm 0 2.5mm;padding:1.6mm 3mm;background:var(--soft);border-left:3px solid var(--acc);break-after:avoid}
h4 small{font-weight:400;color:var(--muted);font-size:8.5pt;margin-left:2mm}
.man-u{padding:2.4mm 0 2.8mm;border-bottom:1px solid var(--line);break-inside:avoid}
.man-uh{display:flex;justify-content:space-between;gap:4mm;align-items:baseline}
.man-uh b{font-size:10.6pt}
.man-uh span{font-size:8.3pt;color:var(--muted);white-space:nowrap}
.man-uh em{color:var(--acc);font-weight:700}
.man-eq{display:block;font-size:8.2pt;color:#6b7682;margin:.5mm 0 1mm}
.man-u p{margin:0 0 1mm;color:var(--muted)}
.man-u p.man-auto{color:var(--ink);padding-left:3mm;border-left:2px solid var(--acc2)}
`;

/* 설명서 HTML(접히는 칸)을 인쇄용 장으로 바꾼다. 페이지 안에서 DOM으로 처리한다. */
const PREP = `(() => {
  const src = document.getElementById('src'); const secs = [];
  let n = 0;
  for (const d of src.querySelectorAll('details.man-s')) {
    n++; const id = d.id.replace(/^man-/, ''); const t = d.querySelector('summary').textContent.trim();
    const s = document.createElement('section'); s.className = 'sec'; s.id = 'sec-' + id; s.dataset.id = id;
    s.innerHTML = '<span class="num">' + String(n).padStart(2, '0') + '</span><h2>' + t + '</h2>';
    const figs = (window.__SHOTS[id] || []).filter(x => x[0]);
    if (figs.length) { const f = document.createElement('div'); f.className = 'figs';
      for (const [u, cap, tall] of figs) f.insertAdjacentHTML('beforeend', '<figure' + (tall ? ' class="tall"' : '') + '><img src="' + u + '"><figcaption>' + cap + '</figcaption></figure>');
      s.appendChild(f); }
    s.appendChild(d.querySelector('.man-b'));
    secs.push({ id, t, n }); document.getElementById('body').appendChild(s);
  }
  src.remove(); return secs;
})()`;

/* 큰 PNG를 JPEG로 줄여 PDF 크기를 줄인다 */
const SHRINK = `(async () => {
  await Promise.all([...document.images].map(i => i.decode().catch(() => {})));
  for (const i of document.images) { const k = Math.min(1, 1500 / i.naturalWidth); if (!i.naturalWidth) continue;
    const c = document.createElement('canvas'); c.width = Math.round(i.naturalWidth * k); c.height = Math.round(i.naturalHeight * k);
    c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); i.src = c.toDataURL('image/jpeg', .84); }
  await Promise.all([...document.images].map(i => i.decode().catch(() => {})));
  await document.fonts.ready;
})()`;

const shots = {};
for (const [k, list] of Object.entries(SHOTS)) {
  if (k === 'cover') continue;
  shots[k === 'cover2' ? 'cover' : k] = list.map(([f, cap]) => {
    const u = dataUrl(f); if (!u) console.warn('스크린샷 없음, 뺌:', f);
    return [u, cap, f.startsWith('controls-phone')];
  });
}
const coverImg = dataUrl(SHOTS.cover[0]);
const intro = (/<p class="man-intro">([\s\S]*?)<\/p>/.exec(manual) || [, ''])[1].replace('아래 제목을 누르면 펼쳐집니다.', '').trim();

const page = (tocHtml) => `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=block" rel="stylesheet">
<style>${CSS}</style></head><body>
<div class="cover">${coverImg ? `<img src="${coverImg}"><div class="fade"></div>` : '<div style="height:120mm"></div>'}
<div class="t"><div class="k">TACTICAL URBAN WARFARE</div><h1>TRIAD <span>시가전</span></h1><p class="sub">게임 설명서</p><p class="lead">${intro}</p></div>
<div class="meta"><span>${date}</span><span>${rev ? '판 ' + rev : ''}</span></div></div>
<div class="toc"><h2>목차</h2><ol>${tocHtml}</ol></div>
<div id="body"></div><div id="src" hidden>${manual}</div>
<script>window.__SHOTS=${JSON.stringify(shots)}</script></body></html>`;

const pages = buf => (buf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g) || []).length;

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext();
  const pg = await ctx.newPage();
  const tmp = join(dirname(out), '.manual-print.html');
  mkdirSync(dirname(out), { recursive: true });
  const render = async html => { writeFileSync(tmp, html); await pg.goto('file://' + tmp, { waitUntil: 'networkidle' });
    const secs = await pg.evaluate(PREP); await pg.evaluate(SHRINK); return secs; };
  const pdf = () => pg.pdf({ preferCSSPageSize: true, printBackground: true, outline: true, tagged: true });

  // 1) 장마다 쪽 수 세기: 표지·목차를 빼고 그 장만 남긴다
  const secs = await render(page('<li>x</li>'));
  const html0 = await pg.content();
  const counts = {};
  for (const s of secs) {
    await pg.setContent(html0, { waitUntil: 'networkidle' });
    await pg.evaluate(id => { document.querySelector('.cover').remove(); document.querySelector('.toc').remove();
      for (const e of document.querySelectorAll('section.sec')) if (e.dataset.id !== id) e.remove();
      document.querySelector('section.sec').style.breakBefore = 'auto';
      const st = document.createElement('style'); st.textContent = '@page:first{margin:18mm 17mm 20mm}'; document.head.appendChild(st); }, s.id);
    await pg.evaluate('document.fonts.ready');
    counts[s.id] = pages(await pdf());
  }
  // 2) 목차 쪽 수(보통 1쪽) 뒤로 장 시작 쪽 계산
  let p = 3; const toc = secs.map(s => { const li = `<li><span class="n">${String(s.n).padStart(2, '0')}</span><a href="#sec-${s.id}">${s.t}</a><span class="p">${p}</span></li>`; p += counts[s.id]; return li; }).join('');
  await render(page(toc));
  const tocPages = await pg.evaluate(() => Math.ceil(document.querySelector('.toc').getBoundingClientRect().height / (297 - 38) / 3.7795));
  let finalToc = toc;
  if (tocPages > 1) { p = 2 + tocPages; finalToc = secs.map(s => { const li = `<li><span class="n">${String(s.n).padStart(2, '0')}</span><a href="#sec-${s.id}">${s.t}</a><span class="p">${p}</span></li>`; p += counts[s.id]; return li; }).join(''); await render(page(finalToc)); }
  const buf = await pdf();
  writeFileSync(out, buf);
  const total = pages(buf), want = p - 1;
  console.log(`${out}  ${total}쪽, ${(buf.length / 1048576).toFixed(1)}MB${total !== want ? `  (목차 계산 ${want}쪽과 다름: 확인 필요)` : ''}`);
  try { (await import('node:fs')).unlinkSync(tmp); } catch {}
} finally { await browser.close(); }
