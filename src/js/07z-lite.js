/* ===================== 3D: 저사양 모드 =====================
   느린 휴대폰·노트북에서 화면이 끊기지 않게 그래픽만 가볍게 한다. 게임 규칙·판정·결과는 하나도 바꾸지 않는다
   (시뮬레이션은 그대로 돌고, 그리는 양만 줄인다).
   켜면:
   - 해상도: 화면 픽셀 배율을 ¾로(낮아도 .3, 많아야 .7)
   - 그림자: 해 그림자를 끈다(그리기 호출이 절반 가까이 준다)
   - 색보정·대기 안개 후처리(07z-grade)를 건너뛰고 바로 화면에 그린다(장면 안개는 그대로)
   - 연기·불꽃·파편 입자 수를 절반 아래로
   - 지도 밖 풍경 나무를 ⅓로, 숲 칸 나무·덤불을 줄인다(숲 칸 자체·시야·엄폐 판정은 그대로, 다음 판부터 적용)
   - 그리기 거리: 안개가 다 덮는 곳(fog.far) 너머는 아예 그리지 않는다
   - 화면은 초당 30번까지만 다시 그린다(움직임·시뮬레이션은 매 프레임 그대로)
   - 작은 지도는 덜 자주 다시 그린다
   설정: 시작 화면 '그래픽' 줄(자동/저사양/보통), 지도 버튼 [저사양](L 키). 값은 localStorage triad-lite.
   자동: 처음 실행하는 기기가 느려 보이면(메모리 2GB 이하·코어 2개 이하) 바로 켜고, 게임 중 5초 동안 평균 22fps 아래가
   두 번 이어지면 켜고 알린다. 한 번 자동으로 켜지면 다음 실행부터 처음부터 켠다(triad-lite-auto). */
const LITE={mode:'auto',on:false,key:'triad-lite',autoKey:'triad-lite-auto',fps:30,
  m:{t0:0,n:0,last:0,bad:0,warm:0},lastR:0,far0:400,pfx0:null};
const liteOn=()=>LITE.on;
function liteSlowHw(){if(typeof navigator==='undefined')return false;const mem=navigator.deviceMemory,cores=navigator.hardwareConcurrency;
  return (mem>0&&mem<=2)||(cores>0&&cores<=2);}
try{if(typeof localStorage!=='undefined'){const v=localStorage.getItem(LITE.key);if(v==='on'||v==='off'||v==='auto')LITE.mode=v;
  LITE.on=LITE.mode==='on'||(LITE.mode==='auto'&&(localStorage.getItem(LITE.autoKey)==='1'||liteSlowHw()));}}catch(e){}

/* 해상도: 07z-grade가 덮은 v3PixelRatio를 한 번 더 감싼다 */
if(typeof v3PixelRatio==='function'){const f=v3PixelRatio;v3PixelRatio=function(){const p=f.apply(this,arguments);return LITE.on?Math.max(.3,Math.min(.7,p*.75)):p;};}

/* 지금 상태를 화면에 반영한다(언제 불러도 된다) */
function liteApply(){
  if(typeof V3==='object'&&V3.ren){
    if(V3.sun)V3.sun.castShadow=!LITE.on;
    if(!LITE.on&&V3.cam&&V3.cam.far!==LITE.far0){V3.cam.far=LITE.far0;V3.cam.updateProjectionMatrix();}
    if(typeof v3Size==='function')v3Size();}
  if(typeof PFX==='object'&&PFX.on){if(LITE.pfx0==null)LITE.pfx0=PFX.qMax;PFX.qMax=LITE.on?Math.min(LITE.pfx0,.4):LITE.pfx0;PFX.q=Math.min(PFX.q,PFX.qMax);}
  if(typeof MM==='object')MM.iv=LITE.on?400:180;
  if(typeof document!=='undefined'){const b=document.getElementById('b-lite');if(b){b.setAttribute('aria-pressed',LITE.on?'true':'false');b.setAttribute('aria-label',`저사양 모드: ${LITE.on?'켜짐':'꺼짐'} (L)`);}
    const s=document.getElementById('opt-lite');if(s&&s.value!==LITE.mode)s.value=LITE.mode;}}

/* mode: 'on'|'off'|'auto'. auto로 둘 때 on을 같이 주면(자동 감지) 그 값을 쓴다 */
function liteSet(mode,on,why){LITE.mode=mode;LITE.on=mode==='on'?true:mode==='off'?false:on!=null?!!on:LITE.on;
  try{localStorage.setItem(LITE.key,mode);if(mode==='off')localStorage.removeItem(LITE.autoKey);if(mode==='auto'&&LITE.on&&why==='auto')localStorage.setItem(LITE.autoKey,'1');}catch(e){}
  LITE.m.bad=0;LITE.m.t0=0;liteApply();
  if(typeof toast==='function'&&why)toast(why==='auto'?'화면이 느려서 저사양 모드를 켰습니다 · 끄려면 [저사양] 버튼이나 L 키':`저사양 모드 ${LITE.on?'켜짐':'꺼짐'}`);}

/* 느린지 재기: 게임 화면이 그려질 때마다 부른다. 처음 4초(셰이더 준비)는 빼고 5초씩 평균을 낸다 */
function liteMeasure(now){const m=LITE.m;if(LITE.on||LITE.mode!=='auto')return;
  if(typeof document!=='undefined'&&document.visibilityState==='hidden'){m.t0=0;return;}
  if(!m.warm){m.warm=now+4000;}if(now<m.warm)return;
  if(m.last&&now-m.last>400){m.t0=0;}m.last=now;   // 탭 전환·멈춤으로 생긴 큰 틈은 재지 않는다
  if(!m.t0){m.t0=now;m.n=0;return;}m.n++;
  if(now-m.t0>=5000){const fps=m.n*1000/(now-m.t0);m.t0=now;m.n=0;m.bad=fps<22?m.bad+1:0;if(m.bad>=2)liteSet('auto',true,'auto');}}

/* 그리기: 07z-grade의 렌더 감싸기 위에 한 겹 더. 저사양이면 후처리를 건너뛰고, 초당 30번까지만, 안개 너머는 자른다 */
function liteHook(){const ren=V3.ren;if(!ren||ren.userData_lite)return;ren.userData_lite=1;const prev=ren.render;
  ren.render=function(scene,cam){
    const main=scene===V3.scene&&ren.getRenderTarget()===null&&cam&&cam.isPerspectiveCamera;
    if(!main)return prev.call(ren,scene,cam);
    const now=performance.now();if(G&&!G.boot)liteMeasure(now);
    if(!LITE.on)return prev.call(ren,scene,cam);
    if(now-LITE.lastR<1000/LITE.fps-4&&!V3.press){V3.liteSkip=true;return;}   // 기자 카메라는 셔터 순간이 있으니 거르지 않는다
    LITE.lastR=now;
    const fog=scene.fog;if(cam===V3.cam&&fog&&fog.far>0){const f=Math.min(LITE.far0,fog.far+4);if(Math.abs(cam.far-f)>2){cam.far=f;cam.updateProjectionMatrix();}}
    // 후처리만 건너뛴다. GRADE.raw를 바로 부르면 그 바깥 겹(07z-inst 병사 묶음 그리기)까지 건너뛰어 병사가 안 보인다
    if(typeof GRADE!=='object')return prev.call(ren,scene,cam);
    GRADE.skip=true;try{return prev.call(ren,scene,cam);}finally{GRADE.skip=false;}};}

if(typeof startView==='function'){const f=startView;startView=async function(){const r=await f.apply(this,arguments);try{if(V3.ren){if(V3.cam)LITE.far0=V3.cam.far;liteHook();liteApply();}}catch(e){console.warn('lite',e);}return r;};}
if(typeof pfxInit==='function'){const f=pfxInit;pfxInit=function(){const was=PFX.on;const r=f.apply(this,arguments);if(!was&&PFX.on){LITE.pfx0=PFX.qMax;liteApply();}return r;};}

/* 시작 화면: 그래픽 줄 */
function liteSetupRow(){const sz=document.getElementById('opt-size');if(!sz||document.getElementById('opt-lite'))return;const row=sz.closest('.slot');if(!row)return;
  const d=document.createElement('div');d.className='slot';
  d.innerHTML='<span></span><label for="opt-lite">그래픽</label><select id="opt-lite"><option value="auto">자동 (느리면 저사양으로)</option><option value="on">저사양 (휴대폰·느린 기기, 부드럽게)</option><option value="off">보통 (그림자·색보정 모두)</option></select>';
  row.parentNode.appendChild(d);const sel=d.querySelector('select');sel.value=LITE.mode;
  sel.addEventListener('change',()=>{let a=liteSlowHw();try{a=a||localStorage.getItem(LITE.autoKey)==='1';}catch(e){}liteSet(sel.value,sel.value==='auto'?a:null);});}
if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{liteSetupRow();liteApply();});else{liteSetupRow();liteApply();}
  document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-act="lite"]');if(b)liteSet(LITE.on?'off':'on',null,'btn');});
  document.addEventListener('keydown',e=>{if(e.target.closest&&e.target.closest('input,select,textarea'))return;if((e.key==='l'||e.key==='L')&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&V3.on&&!V3.press)liteSet(LITE.on?'off':'on',null,'btn');});}
