/* ===================== PHONE: 휴대폰 한 손 조작 =====================
   "단축키 말고 모바일 조작 개선". 휴대폰에서 아래 패널이 화면 절반을 덮고, 위 시계가 지휘점수를 밀어내고,
   무전 자막이 부대 목록 위에 겹치던 것을 정리한다.
   - 아무것도 안 골랐을 때 하단 바는 한 줄: 부관 상태 한 줄 + [증원·지원] [속도] [⏸]. 편성 칩(전체·중대·소대·본부)은 부대 목록 맨 앞에 있다.
   - 지도 버튼(회전·집결지·범위 선택·⋯)은 엄지가 닿는 오른쪽 아래, 하단 패널 바로 위로 옮긴다.
   - [범위 선택]: 누른 뒤 한 손가락으로 끌면 그 안의 아군을 고른다(한 번 쓰면 꺼짐). 길게 눌러 끌기도 그대로.
   - 무전 자막과 지도 버튼은 하단 패널 높이(--dock-h)를 따라 그 위에 뜬다. 휴대폰에서는 지난 자막을 숨긴다.
   CSS는 여기서 넣는다. */
const PH_Q='(max-width:760px),(pointer:coarse)';
const phOn=()=>typeof window!=='undefined'&&!!(window.matchMedia&&window.matchMedia(PH_Q).matches);
if(typeof document!=='undefined'&&!document.getElementById('ph-css')){const st=document.createElement('style');st.id='ph-css';
  st.textContent=`.mapctl .bx svg{stroke-dasharray:3 2.4}
.mapctl .bx[aria-pressed="true"]{background:#e8ecef;color:#0d1218;border-color:#e8ecef}
.mapctl .bx[aria-pressed="true"] svg{stroke-dasharray:none}
.app.boxm .v3d{cursor:crosshair}
@media ${PH_Q}{
  #actbar.ph-idle{flex-wrap:nowrap;gap:6px;padding:5px 5px 5px 10px}
  #actbar.ph-idle>b,#actbar.ph-idle>span,#actbar.ph-idle>.org-row{display:none}
  #actbar.ph-idle>.adj-row{flex:1 1 auto;min-width:0;width:auto;flex-wrap:nowrap;border:0;margin:0;padding:0;gap:6px}
  #actbar.ph-idle>.adj-row>b{display:none}
  #actbar.ph-idle .adj-i{flex:1 1 auto;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11.5px;line-height:1.3}
  #actbar.ph-idle .adj-row .btn{min-height:44px;min-width:44px;flex:none}
  #actbar.ph-idle>.ab{flex:none;margin-left:0;overflow:visible}
  #actbar.ph-idle #ab-reinf{background:#eef1f3;color:#0d1218;border-color:#eef1f3;font-weight:600}
  #actbar.ph-idle #ab-pause{min-width:44px;padding:0 10px;font-size:15px}
  .top .tl>.ib{flex:none}
  #actbar .btn.sm{min-width:44px}
  #actbar.sx-org>.org-row{display:contents}
  #actbar.sx-org>.org-row>b{flex:none}
  #actbar.sx-org>.org-row>.adj-i{flex:1 1 calc(100% - 80px);min-width:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:11.5px}
  #actbar.sx-org>.ab{margin-left:0}
  #actbar.sx-org [id^="ab-org-pq-"],#actbar.sx-org #ab-org-up{display:none}
  #mm-t{height:36px;padding:0 10px}
  .rvox{bottom:calc(var(--dock-h,108px) + 8px)!important;max-width:min(440px,calc(100vw - 76px))!important}
  .rvox p{font-size:11px;padding:3px 7px}
  .rvox p.old{display:none}
  .mapctl{top:auto!important;bottom:calc(var(--dock-h,120px) + 10px);transform:none}
  #roster .rh{min-height:48px;min-width:48px;padding:0 10px;font-size:13px}
  #roster .rh.all{background:rgba(255,210,122,.16);border-color:rgba(255,210,122,.55);color:#ffe2a8}
  #roster .rh.all[aria-pressed="true"]{background:#ffd27a;color:#1a1408}
}
@media (max-width:760px){
  .top{grid-template-columns:minmax(0,1fr) auto}
  .top .tl{min-width:0}
  #hud-clock{min-width:0;overflow:hidden;flex:0 1 auto}
  #hud-clock small{min-width:0;overflow:hidden;text-overflow:ellipsis}
}
@media (max-height:500px) and (orientation:landscape){
  .mapctl{bottom:max(10px,env(safe-area-inset-bottom,0px))}
  #roster .rh{min-height:40px}
  .actbar>span{min-width:0!important;flex:1 1 0!important}
  .actbar>.ab{flex:0 1 auto;min-width:0}
  #actbar.sx-org>.org-row>.adj-i{flex:1 1 0}
}`;
  document.head.appendChild(st);}
/* 하단 패널 높이를 CSS 변수로 */
function phDock(){if(typeof document==='undefined')return;const d=document.querySelector('.dock'),app=$('#app');if(!d||!app)return;
  const set=()=>{const h=Math.round(d.getBoundingClientRect().height);if(app._dh!==h){app._dh=h;app.style.setProperty('--dock-h',h+'px');}};set();
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(set).observe(d);else window.addEventListener('resize',set);}
/* 범위 선택 버튼 */
function boxModeSet(on){UI.boxMode=!!on;const b=$('#b-box');if(b)b.setAttribute('aria-pressed',UI.boxMode?'true':'false');const a=$('#app');if(a)a.classList.toggle('boxm',UI.boxMode);}
function boxModeOff(){if(UI.boxMode)boxModeSet(false);}
function phBoxBtn(){const m=$('#mapctl');if(!m||$('#b-box'))return;const b=document.createElement('button');b.className='ib bx';b.id='b-box';b.dataset.act='boxsel';
  b.setAttribute('aria-label','범위 선택: 누른 뒤 끌어서 여러 부대 고르기');b.title='범위 선택 (누른 뒤 끌기)';b.setAttribute('aria-pressed','false');
  b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4z"/></svg>';m.insertBefore(b,m.firstChild);}
if(typeof document!=='undefined'){
  const init=()=>{phBoxBtn();phDock();};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  document.addEventListener('click',e=>{const b=e.target.closest('[data-act="boxsel"]');if(!b)return;
    if(!(typeof canCmd==='function'&&canCmd())){toast('지금은 고를 수 없습니다');return;}
    boxModeSet(!UI.boxMode);if(UI.boxMode)toast('끌어서 범위 안의 아군을 고르세요');});}
/* 하단 바: 아무것도 안 골랐을 때 휴대폰은 한 줄 */
{const _ra=renderActbar;renderActbar=function(){const r=_ra.apply(this,arguments);const el=$('#actbar');if(!el)return r;
  try{const s=UI.sel&&G&&G.units.includes(UI.sel)?UI.sel:null;
    const idle=phOn()&&G&&!G.over&&!G.boot&&!isAI(G.viewer)&&!s&&!UI.pane&&!UI.phase&&!UI.adjMore&&!!el.querySelector(':scope>.ab #ab-reinf');
    el.classList.toggle('ph-idle',idle);
    if(idle){const p=el.querySelector('#ab-pause');if(p){p.textContent=G.paused?'▶':'⏸';p.setAttribute('aria-label',G.paused?'재개':'일시정지');p.title=G.paused?'재개':'일시정지';}}
  }catch(e){}
  return r;};}
/* 부대 목록 맨 앞에 [전체] */
if(typeof renderRoster==='function'){const _rr=renderRoster;renderRoster=function(){const r=_rr.apply(this,arguments);const el=$('#roster');if(!el||el.hidden||!G)return r;
  let a=el.querySelector('.rh.all');const og=typeof orgOn==='function'&&orgOn(G.viewer);
  if(!a){a=document.createElement('button');a.className='rh co all';a.id='rc-all';a.textContent='전체';el.prepend(a);}
  a.dataset.act=og?'org:all':'all';a.title=og?'전투 부대 전체 고르기 (지도를 탭하면 목표)':'아군 전체 고르기';
  a.setAttribute('aria-pressed',og?String(!!(UI.org&&UI.org.k==='all')):'false');
  return r;};}
