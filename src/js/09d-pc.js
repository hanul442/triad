/* ===================== PC: 마우스·키보드 지휘 =====================
   "PC 조작도 개선". 실시간 전략 게임에서 익숙한 방식으로:
   - 왼쪽 클릭 고르기·이동, 왼쪽 끌기 범위 선택(Shift: 더하기), 오른쪽 클릭 명령 (07-view3d v3Controls)
   - 오른쪽 클릭: 고른 부대가 있으면 그곳으로 이동(적이면 공격, 아군 위면 그 자리로 이동), 중대·전체를 골랐으면 그곳이 목표.
     배치·화력 지원 고르는 중에는 취소, 돌입·축성 같은 자리 고르기 중에는 그 단계만 취소.
   - 아군 더블클릭: 그 소대 전체 (편성이 있을 때)
   - Ctrl+숫자: 고른 부대에 번호, 숫자: 그 번호 고르기(두 번 누르면 카메라가 간다), Shift+숫자: 더하기
   - Ctrl+A: 전체 고르기, H: 집결지로 카메라
   - 마우스를 화면 가장자리에 대면 화면이 그쪽으로 움직인다
   - 커서: 아군 위 손가락, 고른 부대가 있을 때 적 위 조준, 땅 위 이동 표시 */
const pcCan=()=>G&&!G.over&&!G.boot&&!isAI(G.viewer)&&typeof $==='function'&&$('#setup')&&$('#setup').hidden&&!(typeof specOn==='function'&&specOn());
const pcGrp=()=>{const s=UI.sel&&G.units.includes(UI.sel)?UI.sel:null;return s?[s,...(UI.group||[])].filter(u=>u&&G.units.includes(u)):[];};
/* 오른쪽 클릭 명령 */
function v3Order(k){if(!pcCan())return;
  if(UI.phase==='buy'||UI.phase==='sup'){clearSel();render();return;}
  if(UI.phase==='aim:atk'||UI.phase==='aim:def'){tap(k);return;}
  if(UI.phase&&UI.phase!=='select'){UI.phase='select';render();return;}
  if(!pcGrp().length){if(UI.pane){UI.pane=null;render();}return;}
  const pid=typeof V3!=='undefined'?V3.pickId:null;const u=pid!=null?G.units.find(z=>z.id===pid):null;
  if(u&&u.nat===G.viewer){V3.pickPt=[u.x,u.z];V3.pickId=null;}
  const add=UI.addSel;UI.addSel=false;UI.shift=false;try{tap(k);}finally{UI.addSel=add;}}
/* 커서 */
function v3Cursor(){if(typeof V3==='undefined'||!V3.cv)return;let c='';
  if(G&&pcCan()){const n=G.viewer;const pid=V3.pickId;const u=pid!=null?G.units.find(z=>z.id===pid):null;const has=pcGrp().length>0;
    if(UI.boxMode)c='crosshair';
    else if(UI.phase&&UI.phase!=='select')c='crosshair';
    else if(u&&u.nat===n)c='pointer';
    else if(has&&u&&u.nat!==n&&(!G.fog||seen(u,n)))c='crosshair';
    else if(has)c='cell';}
  if(V3.cv.style.cursor!==c)V3.cv.style.cursor=c;}
/* 아군 더블클릭(더블탭): 그 소대 전체 */
{const _tap=tap;tap=function(k){
  if(G&&pcCan()&&(!UI.phase||UI.phase==='select')&&!UI.addSel&&!UI.shift&&typeof orgOn==='function'&&orgOn(G.viewer)){
    const pid=typeof V3!=='undefined'?V3.pickId:null;const u=pid!=null?G.units.find(z=>z.id===pid&&z.nat===G.viewer):null;
    if(u&&u===UI.sel&&Date.now()-(UI.lastTap||0)<400&&u.pq!=null&&typeof orgPq==='function'&&orgPq(G.viewer,u.pq)){UI.lastTap=0;orgSelect({k:'pq',id:u.pq});return;}}
  return _tap.apply(this,arguments);};}
/* 부대 번호 (Ctrl+숫자) */
function pcGroupSet(i){const g=pcGrp();UI.cg=UI.cg||{};if(!g.length){delete UI.cg[i];toast(`${i}번 지움`);return;}UI.cg[i]=g.map(u=>u.id);toast(`${i}번: ${g.length}개 부대`);}
function pcGroupGet(i,add){const ids=(UI.cg||{})[i];const n=G.viewer;let us=ids?ids.map(id=>G.units.find(u=>u.id===id&&u.nat===n)).filter(Boolean):[];
  if(!us.length){toast(`${i}번 부대가 없습니다 · Ctrl+${i}로 붙이세요`);return;}
  if(add)for(const u of pcGrp())if(!us.includes(u))us.push(u);
  const now=Date.now();const again=UI.cgLast===i&&now-(UI.cgT||0)<500;UI.cgLast=i;UI.cgT=now;
  clearSel();select(us[0]);UI.group=us.slice(1);
  if(again&&typeof V3!=='undefined'&&V3.cs){let x=0,z=0;for(const u of us){x+=u.x;z+=u.z;}V3.cs.gx=x/us.length;V3.cs.gz=z/us.length;}
  toast(`${i}번: ${us.length}개 부대${again?'':' · 한 번 더 누르면 카메라 이동'}`);render();}
if(typeof window!=='undefined')window.addEventListener('keydown',e=>{if(e.target&&e.target.closest&&e.target.closest('input,select,textarea'))return;if(!pcCan())return;
  const m=/^Digit([1-9])$/.exec(e.code||'');
  if(m&&!e.altKey){const i=+m[1];e.preventDefault();e.stopPropagation();if(e.ctrlKey||e.metaKey)pcGroupSet(i);else pcGroupGet(i,e.shiftKey);return;}
  if((e.key==='a'||e.key==='A')&&(e.ctrlKey||e.metaKey)){e.preventDefault();e.stopPropagation();
    if(typeof orgOn==='function'&&orgOn(G.viewer)&&typeof orgSelect==='function')orgSelect({k:'all'});
    else{const us=G.units.filter(u=>u.nat===G.viewer);if(us.length){clearSel();select(us[0]);UI.group=us.slice(1);toast(`${us.length}개 부대 선택`);render();}}return;}
  if((e.key==='h'||e.key==='H')&&!e.ctrlKey&&!e.metaKey&&!e.altKey){const b=$('#b-home');if(b)b.click();}},true);
/* 화면 가장자리 스크롤 (마우스만) */
const EDGE={x:-1,y:-1,in:false,raf:0,t:0};
function pcEdgeOk(){return typeof V3!=='undefined'&&V3.on&&V3.cs&&G&&!G.boot&&!UI.sheet&&!(typeof PR!=='undefined'&&PR.on)&&$('#setup')&&$('#setup').hidden&&(typeof document.hasFocus!=='function'||document.hasFocus());}
function pcEdgeTick(now){EDGE.raf=0;if(!EDGE.in)return;const dt=Math.min(50,now-(EDGE.t||now));EDGE.t=now;const W=innerWidth,H=innerHeight,M=8;
  let dx=0,dy=0;if(EDGE.x<=M)dx=1;else if(EDGE.x>=W-1-M)dx=-1;if(EDGE.y<=M)dy=1;else if(EDGE.y>=H-1-M)dy=-1;
  if(!dx&&!dy){EDGE.t=0;return;}
  if(pcEdgeOk()){const sp=.9*dt;v3Pan(dx*sp,dy*sp);}
  EDGE.raf=requestAnimationFrame(pcEdgeTick);}
if(typeof document!=='undefined'){
  document.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;EDGE.x=e.clientX;EDGE.y=e.clientY;EDGE.in=true;if(!EDGE.raf){EDGE.t=0;EDGE.raf=requestAnimationFrame(pcEdgeTick);}},{passive:true});
  document.addEventListener('mouseout',e=>{if(!e.relatedTarget)EDGE.in=false;});
  window.addEventListener('blur',()=>{EDGE.in=false;});}
