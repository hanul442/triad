// TRIAD 시가전 빌드: src/를 합쳐 단일 파일 index.html(배포용)과 dist/triad.html(아티팩트용)을 만든다.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = p => readFileSync(join(root, 'src', p), 'utf8');
const jsFiles = readdirSync(join(root, 'src', 'js')).filter(f => f.endsWith('.js')).sort();

export function bundleJs() {
  return jsFiles.map(f => `/* ---- ${f} ---- */\n` + src(join('js', f))).join('\n');
}

export function build() {
  const head = src('head.html').trim();
  const css = src('style.css').trimEnd();
  const body = src('body.html').trimEnd();
  const js = bundleJs();

  const page = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0d1217">
<meta name="description" content="3D 시가전 턴제 전략 게임. 건물 엄폐·시야 차단·건물 붕괴, 거점 쟁탈, 증원과 화력 지원.">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="TRIAD">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icon-192.png">
${head}
<style>
${css}
[hidden]{display:none!important}
</style>
</head>
<body>
${body}
<script>
${js}
</script>
<script>if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});</script>
</body>
</html>
`;
  // 아티팩트: 문서 골격은 호스트가 감싸므로 본문만 쓴다.
  const artifact = `${head.split('\n')[0]}
<meta name="claude:viewport-fit-sides" content="cover">
${head.split('\n').slice(1).join('\n')}
<style>
${css}
</style>

${body}

<script>
${js}
</script>
`;
  writeFileSync(join(root, 'index.html'), page);
  mkdirSync(join(root, 'dist'), { recursive: true });
  writeFileSync(join(root, 'dist', 'triad.html'), artifact);
  return { page, artifact, js };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { page, js } = build();
  new Function(js); // 문법 검사
  console.log(`index.html ${(page.length / 1024).toFixed(0)}KB, JS 파일 ${jsFiles.length}개`);
}
