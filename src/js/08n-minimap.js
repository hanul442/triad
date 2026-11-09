/* ===================== MINIMAP: 작은 지도 =====================
   왼쪽 위에 도시 전체를 작게 그린다. 화면 위쪽 = 카메라가 보는 쪽이 되도록 지도를 돌린다.
   - 건물(높을수록 밝게)·길·공원·물·잔해, 거점(차지한 세력 색), 보이는 부대(아군 밝게, 적은 보일 때만),
     세력이 기억하는 적 자리(속 빈 점), 지금 화면에 보이는 범위(흰 사각형)를 그린다.
   - 누르거나 끌면 카메라가 그 자리로 간다. 다른 모듈이 mmPick(x,z)를 감싸면 지도 지정(예: 부관 목표)에도 쓴다.
   - 접기/펴기 버튼, 상태는 localStorage triad-mm. 기자 카메라·작전 메뉴가 열려 있으면 숨긴다.
   CSS는 여기서 넣는다(body.html·style.css를 건드리지 않아 다른 작업과 덜 부딪친다). */
const MM={on:true,px:176,base:null,baseT:-99,cv:null,ctx:null,el:null,drag:false,lastT:0,scale:1,yaw:0,cx:0,cz:0};
const MMCOL={road:'#2c2f31',plaza:'#4a4945',park:'#3d4a32',rubble:'#5d5448',water:'#2e5566',bldg:'#77736b',rail:'#3a3632',bridge:'#4f4c47'};
function mmLoad(){try{const v=localStorage.getItem('triad-mm');if(v!=null)MM.on=v!=='0';}catch(e){}}
function mmSave(){try{localStorage.setItem('triad-mm',MM.on?'1':'0');}catch(e){}}
/* 바탕: 칸마다 한 점(지도 칸 수 × 3픽셀) */
function mmBase(){const P=3,W=N*P;let c=MM.base;if(!c||c.width!==W){c=document.createElement('canvas');c.width=c.height=W;MM.base=c;}
  const g=c.getContext('2d');g.fillStyle='#1d2124';g.fillRect(0,0,W,W);
  for(let r=0;r<N;r++)for(let q=0;q<N;q++){const x=G.map[r][q];let col=MMCOL[x.t]||'#33373a';
    if(x.t==='bldg'){const f=Math.min(8,x.f||1);const l=92+f*10;col=`rgb(${l},${l-3},${l-10})`;}
    if(x.br)col=MMCOL.bridge;g.fillStyle=col;g.fillRect(q*P,r*P,P,P);
    if(x.t==='bldg'){g.fillStyle='rgba(0,0,0,.35)';g.fillRect(q*P,r*P+P-1,P,1);}}
  MM.baseT=G.time||0;MM.baseV=G.fortV;}
/* 지도 점 (x,z) → 미니맵 픽셀 */
function mmTo(x,z){const dx=x-MM.cx,dz=z-MM.cz,c=Math.cos(MM.yaw),s=Math.sin(MM.yaw);return [MM.px/2+(dx*c-dz*s)*MM.scale,MM.px/2+(dx*s+dz*c)*MM.scale];}
function mmFrom(px,py){const dx=(px-MM.px/2)/MM.scale,dz=(py-MM.px/2)/MM.scale,c=Math.cos(-MM.yaw),s=Math.sin(-MM.yaw);return [MM.cx+dx*c-dz*s,MM.cz+dx*s+dz*c];}
function mmDraw(){if(!MM.ctx||!G||!G.map)return;const el=MM.el;const hide=!MM.on||G.boot&&!G.spec||(V3.press)||$('#app').classList.contains('sheet-open');
  el.classList.toggle('off',!MM.on);if(hide&&MM.on){el.style.visibility='hidden';return;}el.style.visibility='';if(!MM.on)return;
  const t=G.time||0;if(!MM.base||MM.base.width!==N*3||t-MM.baseT>2||t<MM.baseT||MM.baseV!==G.fortV)mmBase();
  const g=MM.ctx,S=MM.px,dpr=MM.dpr||1;g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,S,S);
  const yaw=V3.cs?V3.cs.yaw:0;MM.yaw=yaw;MM.cx=N/2;MM.cz=N/2;MM.scale=S/(N*(Math.abs(Math.cos(yaw))+Math.abs(Math.sin(yaw))))*.98;
  g.save();g.translate(S/2,S/2);g.rotate(yaw);g.scale(MM.scale/3,MM.scale/3);g.imageSmoothingEnabled=false;g.drawImage(MM.base,-N*3/2,-N*3/2);
  // 전장의 안개: 지금 안 보이는 칸은 어둡게
  const vn=G.viewer;const fog=G.fog&&!(typeof specOn==='function'&&specOn()&&UI.specVis==='all');
  if(fog&&typeof visSet==='function'){const vs=visSet(vn);g.fillStyle='rgba(6,9,12,.62)';for(let r=0;r<N;r++)for(let q=0;q<N;q++)if(!vs.has(key(r,q)))g.fillRect(q*3-N*3/2,r*3-N*3/2,3,3);}
  g.restore();
  // 거점
  for(const o of G.objs){const x=G.map[o.r][o.c];const [px,py]=mmTo(o.c+.5,o.r+.5);g.fillStyle=x.owner!=null?mapCol(x.owner):'#c9c4b6';g.strokeStyle='#0b0f14';g.lineWidth=1.5;
    g.beginPath();g.moveTo(px,py-5);g.lineTo(px+5,py);g.lineTo(px,py+5);g.lineTo(px-5,py);g.closePath();g.fill();g.stroke();}
  // 기억하는 적(지금은 안 보임): 속 빈 점
  if(fog&&typeof memOf==='function'){const M=memOf(vn);for(const id in M){const p=M[id];if(t-p.t>20)continue;const e=G.units.find(o=>String(o.id)===id);if(!e||seen(e,vn))continue;
      const [px,py]=mmTo(p.x,p.z);g.strokeStyle=mapCol(e.nat);g.globalAlpha=Math.max(.25,1-(t-p.t)/20);g.lineWidth=1.2;g.beginPath();g.arc(px,py,2.6,0,6.283);g.stroke();g.globalAlpha=1;}}
  // 부대: 아군은 크게, 차량은 네모, 항공은 세모
  const sel=new Set([UI.sel,...(UI.group||[])].filter(Boolean).map(u=>u.id));
  for(const u of G.units){if(fog&&u.nat!==vn&&!seen(u,vn))continue;const [px,py]=mmTo(u.x??u.c+.5,u.z??u.r+.5);const t0=UT[u.type];const own=u.nat===vn;
    g.fillStyle=mapCol(u.nat);g.strokeStyle=sel.has(u.id)?'#ffffff':'rgba(0,0,0,.85)';g.lineWidth=sel.has(u.id)?1.6:1;const R=own?2.6:2.3;
    g.beginPath();if(t0.fly){g.moveTo(px,py-R-1);g.lineTo(px+R+1,py+R);g.lineTo(px-R-1,py+R);g.closePath();}else if(t0.cls==='veh')g.rect(px-R,py-R,R*2,R*2);else g.arc(px,py,R,0,6.283);g.fill();g.stroke();}
  // 다른 모듈이 덧그림(부관 목표 등)
  if(typeof mmOverlay==='function')try{mmOverlay(g);}catch(e){}
  // 화면 범위: 화면 네 귀퉁이가 땅에 닿는 곳
  if(V3.on&&V3.cv&&typeof v3Ground==='function'){const b=V3.cv.getBoundingClientRect();const C=[[b.left,b.top],[b.right,b.top],[b.right,b.bottom],[b.left,b.bottom]];const P=[];
    for(const [x,y] of C){let p=v3Ground(x,Math.max(y,b.top+b.height*.04));if(!p)p=v3Ground(x,b.top+b.height*.35);if(p)P.push(mmTo(p.x,p.z));}
    if(P.length===4){g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=1.3;g.beginPath();P.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.stroke();}}
  // 북쪽 표시
  const [nx,ny]=mmTo(N/2,-N*.02);g.fillStyle='#e8ecef';g.font='600 9px '+getComputedStyle(document.body).getPropertyValue('--font-m');g.textAlign='center';g.textBaseline='middle';
  const nd=Math.hypot(nx-S/2,ny-S/2)||1;g.fillText('N',S/2+(nx-S/2)/nd*(S/2-7),S/2+(ny-S/2)/nd*(S/2-7));}
/* 미니맵을 누르면: 기본은 카메라 이동. 감싼 쪽이 true를 돌려주면 그걸로 끝 */
function mmPick(x,z,first){if(!V3.cs)return true;const s=V3.cs;s.gx=Math.max(0,Math.min(N,x));s.gz=Math.max(0,Math.min(N,z));if(UI.follow!=null){UI.follow=null;UI.specAuto=false;}return true;}
function mmSize(){const sm=window.matchMedia&&window.matchMedia('(max-width:760px)').matches;MM.px=sm?118:176;MM.dpr=Math.min(2,window.devicePixelRatio||1);
  const cv=MM.cv;if(!cv)return;cv.width=Math.round(MM.px*MM.dpr);cv.height=Math.round(MM.px*MM.dpr);cv.style.width=cv.style.height=MM.px+'px';}
function mmInit(){if(typeof document==='undefined'||MM.el)return;mmLoad();
  const st=document.createElement('style');st.id='mm-css';
  st.textContent=`.mm{position:absolute;left:max(10px,env(safe-area-inset-left,0px));top:calc(56px + env(safe-area-inset-top,0px));z-index:2;display:flex;flex-direction:column;align-items:flex-start;gap:4px;pointer-events:none;transition:right .2s}
.mm canvas{display:block;border-radius:6px;background:rgba(9,13,18,.86);border:1px solid rgba(255,255,255,.16);box-shadow:0 4px 14px rgba(0,0,0,.35);pointer-events:auto;touch-action:none;cursor:crosshair}
.mm .mm-t{pointer-events:auto;height:26px;min-width:26px;padding:0 8px;display:flex;align-items:center;gap:5px;background:rgba(9,13,18,.84);color:#e8ecef;border:1px solid rgba(255,255,255,.14);border-radius:6px;font:600 11px/1 var(--font-m);cursor:pointer}
.mm .mm-t svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:1.8}
.mm.off canvas{display:none}
@media (max-width:760px){.mm{top:calc(104px + env(safe-area-inset-top,0px))}}`;
  document.head.appendChild(st);
  const el=document.createElement('div');el.className='mm';el.id='mm';
  el.innerHTML=`<button class="mm-t" id="mm-t" aria-label="작은 지도 접기/펴기" aria-pressed="true" title="작은 지도 (K)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/></svg><span>지도</span></button><canvas id="mm-cv" aria-label="작은 지도: 누르면 그 자리로 화면 이동"></canvas>`;
  $('#app').appendChild(el);MM.el=el;MM.cv=el.querySelector('canvas');MM.ctx=MM.cv.getContext('2d');mmSize();window.addEventListener('resize',mmSize);
  const tb=el.querySelector('#mm-t');const sync=()=>{tb.setAttribute('aria-pressed',MM.on?'true':'false');};sync();
  tb.addEventListener('click',()=>{MM.on=!MM.on;mmSave();sync();mmDraw();});
  window.addEventListener('keydown',e=>{if(e.key!=='k'&&e.key!=='K'||e.target&&/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;MM.on=!MM.on;mmSave();sync();mmDraw();});
  const at=e=>{const b=MM.cv.getBoundingClientRect();return mmFrom(e.clientX-b.left,e.clientY-b.top);};
  MM.cv.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();MM.drag=true;try{MM.cv.setPointerCapture(e.pointerId);}catch(_){}const [x,z]=at(e);if(mmPick(x,z,true)===false)MM.drag=false;mmDraw();});
  MM.cv.addEventListener('pointermove',e=>{if(!MM.drag)return;e.preventDefault();const [x,z]=at(e);mmPick(x,z,false);});
  const up=()=>{MM.drag=false;};MM.cv.addEventListener('pointerup',up);MM.cv.addEventListener('pointercancel',up);
  const loop=now=>{requestAnimationFrame(loop);if(now-MM.lastT<180&&!MM.drag)return;MM.lastT=now;try{mmDraw();}catch(e){}};requestAnimationFrame(loop);}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mmInit);else setTimeout(mmInit,0);}
