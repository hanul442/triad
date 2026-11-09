/* ===================== 전황 보고: 부하 부대가 지휘관에게 올리는 보고와 요청 =====================
   목표만 정하고 맡겨 두면 어디서 무슨 일이 생기는지 알기 어렵다. 그래서 부대들이 중요한 일을 보고하고,
   필요한 것을 요청한다. 보고를 누르면 그 자리로 화면이 가고, 버튼 하나로 증원·화력 지원을 보낸다.
   - 거점 공격받음 · 거점 빼앗김/확보 · 한 구역에서 부대를 잇달아 잃음 · 탄약 바닥(보급 트럭 없음)
     · 버려진 부상자(구급차 없음) · 적 기갑 발견(대전차 화기 없음) · 적 항공 발견(대공 없음) · 지휘점수가 쌓임(직접 지휘)
   - 증원은 보고한 자리에서 가장 가까운 배치 칸에 바로 내린다(배치 칸을 고를 필요 없음).
   - 사람이 지휘하는 내 세력만 본다(관전·AI 세력이면 아무것도 하지 않는다). 게임 규칙·AI에는 손대지 않고 보기만 한다.
   - 화면: 작은 지도 아래 카드 목록(접기 가능, 이 기기에 저장). 작은 지도에 보고 자리를 빨간 고리로 표시. */
const SIT={dt:1,max:4,maxM:2,key:'triad-sit'};
const sitOn=()=>typeof G!=='undefined'&&G&&G.nats&&!G.over&&!G.boot&&G.viewer!=null&&G.nats[G.viewer]&&!isAI(G.viewer)&&!(typeof specOn==='function'&&specOn());
const SIT_AT=['at','atgm','tank','eng'],SIT_AA=['aa','zu'],SIT_ARM=['tank','ifv','zu','spg','mlrs'];
/* 보고 하나를 넣거나 고친다. hold: 조건이 사라진 뒤 몇 초 더 남길지 */
function sitPut(k,o){const S=G.sit;const t=G.time||0;let r=S.r.get(k);
  if(!r){if(S.gone.has(k)&&t<S.gone.get(k))return null;r={k,t0:t,seq:++S.seq};S.r.set(k,r);if((o.pri||1)>=3)S.fresh=k;}
  Object.assign(r,o,{t});return r;}
function sitDrop(k){G.sit.r.delete(k);}
const sitPlace=(x,z)=>typeof voxPlaceKo==='function'?voxPlaceKo(x,z):'';
const sitCnt=us=>{const inf=us.filter(u=>UT[u.type].cls==='inf').length,veh=us.filter(u=>UT[u.type].cls==='veh').length,air=us.filter(u=>UT[u.type].cls==='air').length;
  return [inf?`보병 ${inf}`:'',veh?`차량 ${veh}`:'',air?`항공 ${air}`:''].filter(Boolean).join(' · ');};
const sitMid=us=>{let x=0,z=0;for(const u of us){x+=u.x;z+=u.z;}return [x/us.length,z/us.length];};
const sitFoe=(e,n)=>e.nat!==n&&e.nat>=0&&G.nats[e.nat]&&!e.dead;
/* 증원: 그 자리에서 가장 가까운 배치 칸 */
function sitSpot(n,ty,x,z){const sp=deploySpots(n,ty);let b=null,bd=1e9;for(const k of sp){const r=kr(k),c=kc(k);const d=Math.hypot(c+.5-x,r+.5-z);if(d<bd){bd=d;b=[r,c];}}return b;}
function sitCanBuy(n,ty){const N2=G.nats[n];return !!UT[ty]&&N2.cp>=UT[ty].cost&&!(typeof airGrounded==='function'&&airGrounded(ty));}
/* 화력 지원 겨냥점: 보이는 칸이어야 한다(연막은 어디든) */
function sitSupAt(n,k,x,z){const r=Math.floor(z),c=Math.floor(x);return inb(r,c)&&canSupport(n,k,r,c)?[r,c]:null;}
/* 증원으로 보낼 병종: 적 기갑이 섞였으면 대전차 */
const sitReinf=foes=>foes.some(e=>SIT_ARM.includes(e.type))?'at':'rifle';

function sitScan(){const n=G.viewer,N2=G.nats[n],S=G.sit,t=G.time||0;
  const mine=G.units.filter(u=>u.nat===n&&!u.dead);
  const foes=G.units.filter(e=>sitFoe(e,n)&&seen(e,n));
  const live=new Set();const keep=(k,o)=>{live.add(k);return sitPut(k,o);};
  // 거점: 공격받음, 빼앗김, 확보
  G.objs.forEach((o,i)=>{const w=G.map[o.r][o.c].owner,prev=S.own[i];const ox=o.c+.5,oz=o.r+.5;
    if(prev!==undefined&&prev!==w){
      if(prev===n){sitDrop('thr:'+i);sitDrop('cap:'+i);sitPut('lost:'+i,{pri:3,x:ox,z:oz,txt:`${o.name} 빼앗김`,sub:w!=null?`차지한 쪽: ${natName(w)}`:'주인이 사라졌습니다',acts:[['retake',i],['sup','arty',ox,oz],['buy','rifle',ox,oz]],ttl:45});}
      else if(w===n){sitDrop('lost:'+i);sitPut('cap:'+i,{pri:1,x:ox,z:oz,txt:`${o.name} 확보`,sub:'거점을 차지했습니다',acts:[],ttl:12});}}
    S.own[i]=w;
    if(w===n){const near=foes.filter(e=>Math.hypot(e.x-ox,e.z-oz)<3.5);
      if(near.length){const veh=near.some(e=>UT[e.type].cls!=='inf');const [mx,mz]=sitMid(near);
        keep('thr:'+i,{pri:near.length>=3||veh?3:2,x:mx,z:mz,txt:`${o.name} 공격받음`,sub:`적 ${sitCnt(near)} 접근`,acts:[['def',i],['sup','arty',mx,mz],['buy',sitReinf(near),ox,oz]],hold:10});}}});
  // 한 구역에서 부대를 잇달아 잃음(45초 안에 5칸 안에서 3개 이상)
  S.loss=S.loss.filter(l=>t-l.t<45);
  let best=null;for(const a of S.loss){const g=S.loss.filter(b=>Math.hypot(a.x-b.x,a.z-b.z)<5);if(g.length>=3&&(!best||g.length>best.length))best=g;}
  if(best){const [lx,lz]=sitMid(best);const pl=sitPlace(lx,lz);const k='loss:'+pl;const nearF=foes.filter(e=>Math.hypot(e.x-lx,e.z-lz)<5);
    keep(k,{pri:3,x:lx,z:lz,txt:`${pl}: 부대 ${best.length}개 잃음`,sub:'45초 안에 · 증원이나 연막이 필요합니다',acts:[['sup','smoke',lx,lz],['buy',sitReinf(nearF),lx,lz]],hold:20});}
  // 탄약 바닥인데 보급 트럭이 없다
  if(typeof amOf==='function'&&typeof amMax==='function'&&!mine.some(u=>u.type==='sup')){
    const dry=mine.filter(u=>{const M=amMax(u);return M&&amOf(u)/M<.2;});
    if(dry.length>=2){const [x,z]=sitMid(dry);keep('ammo',{pri:2,x,z,txt:`탄약 바닥: 부대 ${dry.length}개`,sub:'보급 트럭이 없습니다',acts:[['buy','sup',x,z]],hold:6});}}
  // 버려진 부상자인데 구급차가 없다
  if(G.cas&&!mine.some(u=>u.type==='amb')){const cs=G.cas.filter(c=>c.nat===n&&!c.taken&&c.s!=='kia');
    if(cs.length>=3){const [x,z]=sitMid(cs);keep('cas',{pri:2,x,z,txt:`부상자 ${cs.length}명 방치`,sub:'구급차가 없습니다',acts:[['buy','amb',x,z]],hold:6});}}
  // 적 기갑을 봤는데 대전차 화기가 없다
  const arm=foes.filter(e=>e.type==='tank'||e.type==='ifv');
  if(arm.length&&!mine.some(u=>SIT_AT.includes(u.type))){const [x,z]=sitMid(arm);keep('armor',{pri:2,x,z,txt:`적 기갑 ${arm.length}대 발견`,sub:'대전차 화기가 없습니다',acts:[['buy','at',x,z]],hold:15});}
  // 적 항공을 봤는데 대공이 없다
  const air=foes.filter(e=>UT[e.type].cls==='air');
  if(air.length&&!mine.some(u=>SIT_AA.includes(u.type))){const [x,z]=sitMid(air);keep('air',{pri:2,x,z,txt:`적 항공 ${air.length}대 발견`,sub:'대공 화기가 없습니다',acts:[['buy','aa',x,z]],hold:15});}
  // 직접 지휘인데 지휘점수가 쌓여 있다
  if(!N2.auto&&N2.cp>=14&&mine.length){const [x,z]=sitMid(mine);keep('cp',{pri:1,x,z,txt:`지휘점수 ${N2.cp} 쌓임`,sub:'쓰지 않은 점수로 증원을 보내세요',acts:[['shop']],hold:0});}
  // 조건이 사라진 보고 정리
  for(const [k,r] of S.r){if(live.has(k))continue;if(r.ttl!=null){if(t-r.t0>r.ttl)S.r.delete(k);}else if(t-r.t>(r.hold||0))S.r.delete(k);}}

/* 가장 가까운 중대(06h-org): 그 자리를 맡길 중대, 증원을 받을 중대 */
function sitCo(n,x,z){if(typeof orgOf!=='function')return null;let b=null,bd=1e9;for(const c of orgOf(n).co){const us=orgCoUnits(n,c);if(!us.length)continue;const [mx,mz]=sitMid(us);const d=Math.hypot(mx-x,mz-z);if(d<bd){bd=d;b=c;}}return b;}
/* 보여 줄 순서: 급한 것, 새 것 먼저 */
function sitList(){if(!G||!G.sit)return [];return [...G.sit.r.values()].sort((a,b)=>(b.pri||1)-(a.pri||1)||b.seq-a.seq);}

/* ---------- 버튼이 하는 일 ---------- */
function sitDo(k,j){if(!sitOn())return false;const n=G.viewer,r=G.sit.r.get(k);if(!r)return false;
  if(j==null){sitLook(r);return true;}
  const a=r.acts[j];if(!a)return false;const op=a[0];
  if(op==='buy'){const ty=a[1];if(!sitCanBuy(n,ty)){toast(`지휘점수가 모자랍니다 (${UT[ty].n} ${UT[ty].cost})`);return false;}
    const sp=sitSpot(n,ty,a[2],a[3]);if(!sp){toast('증원을 내릴 자리가 없습니다');return false;}
    const N2=G.nats[n],co=SELF_RUN[ty]?null:sitCo(n,a[2],a[3]),keep=N2.reinfCo;if(co)N2.reinfCo=co.id;let u;try{u=buy(n,ty,sp[0],sp[1]);}finally{N2.reinfCo=keep;}if(!u)return false;toast(`${UT[ty].n} 증원: ${sitPlace(u.x,u.z)||'배치'}${co?' · '+co.name:''}`);if(typeof sndRadio==='function')sndRadio('ack');
    if(typeof v3Ping==='function')v3Ping(u.x,u.z,'#7fd1ff');return true;}
  if(op==='sup'){const kd=a[1];const at=sitSupAt(n,kd,a[2],a[3]);if(!at){toast(`${SUP[kd].n}: ${G.nats[n].cp<SUP[kd].cost?'지휘점수가 모자랍니다':'지금은 부를 수 없습니다(쿨타임이거나 보이지 않는 곳)'}`);return false;}
    const ok=support(n,kd,at[0],at[1]);if(ok)toast(`${SUP[kd].n} 요청: ${sitPlace(at[1]+.5,at[0]+.5)}`);return ok;}
  if(op==='def'||op==='retake'){const o=G.objs[a[1]],k=op==='def'?'def':'atk',w=op==='def'?'방어':'탈환';const co=sitCo(n,o.c+.5,o.r+.5);
    if(co&&typeof orgAim==='function'){orgAim(n,{k:'co',id:co.id},k,o.c+.5,o.r+.5);toast(`${co.name}: ${w} · ${o.name}`);}
    else if(typeof autoIntent==='function'&&autoOn(n)){autoIntent(n,k,o.c+.5,o.r+.5);toast(`부관: ${w} · ${o.name}`);}else return false;
    if(typeof sndRadio==='function')sndRadio('ack');return true;}
  if(op==='shop'){UI.pane=null;if(typeof clearSel==='function')clearSel();const b=document.querySelector('[data-act="reinf"]');if(b)b.click();return true;}
  return false;}
function sitLook(r){if(typeof V3!=='undefined'&&V3.on&&typeof v3Focus==='function'){UI.follow=null;v3Focus(r.z-.5,r.x-.5);}
  if(typeof v3Ping==='function')v3Ping(r.x,r.z,(r.pri||1)>=3?'#ff6b5e':'#ffd27a');}
/* 버튼 이름과 쓸 수 있는지 */
function sitBtn(r,j){const a=r.acts[j],n=G.viewer,N2=G.nats[n];const op=a[0];
  if(op==='buy'){const t=UT[a[1]];return {l:`${t.n} 증원 ${t.cost}`,s:`${t.n.replace(/분대|팀$|트럭$/,'').trim()} ${t.cost}`,ok:sitCanBuy(n,a[1]),tip:`보고한 곳 가까이 ${t.n}을 바로 보냅니다`};}
  if(op==='sup'){const S2=SUP[a[1]];return {l:`${S2.n} ${S2.cost}`,s:a[1]==='smoke'?'연막':'포격',ok:!!sitSupAt(n,a[1],a[2],a[3]),tip:S2.desc};}
  if(op==='def'||op==='retake'){const o=G.objs[a[1]];const co=sitCo(n,o.c+.5,o.r+.5);const def=op==='def';
    if(co&&typeof orgAim==='function'){const I=co.intent;const on=I&&I.k===(def?'def':'atk')&&Math.hypot(I.x-o.c-.5,I.z-o.r-.5)<1;
      return {l:`${co.name} ${def?'방어':'탈환'}`,s:def?'방어':'탈환',ok:!on,tip:`가장 가까운 ${co.name}에 ${o.name} ${def?'방어':'탈환'}를 맡깁니다`};}
    if(!autoOn(n))return null;const I=N2.intent;return def?{l:'여기를 방어',s:'방어',ok:!(I&&I.k==='def'&&I.obj===o.name),tip:'부관이 이 거점을 지킵니다'}:{l:'탈환 목표로',s:'탈환',ok:true,tip:'부관이 이 거점을 되찾으러 갑니다'};}
  if(op==='shop')return {l:'증원·지원 열기',s:'증원',ok:true,tip:''};
  return null;}

/* ---------- 화면 ---------- */
const SITV={open:true,sig:''};
try{if(typeof localStorage!=='undefined')SITV.open=localStorage.getItem(SIT.key)!=='0';}catch(e){}
if(typeof document!=='undefined'&&!document.getElementById('sit-css')){const st=document.createElement('style');st.id='sit-css';
  st.textContent=`.sit{pointer-events:none;display:flex;flex-direction:column;gap:4px;width:min(272px,calc(100vw - 24px));margin-top:2px}
.sit .sit-h{pointer-events:auto;align-self:flex-start;height:26px;padding:0 9px;display:flex;align-items:center;gap:6px;background:rgba(9,13,18,.84);color:#e8ecef;border:1px solid rgba(255,255,255,.14);border-radius:6px;font:600 11px/1 var(--font-m);cursor:pointer}
.sit .sit-h i{font-style:normal;min-width:16px;height:16px;padding:0 4px;border-radius:8px;background:#3a4450;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:10.5px}
.sit .sit-h i.hot{background:#c8443a}
.sit-c{pointer-events:auto;position:relative;background:rgba(9,13,18,.88);border:1px solid rgba(255,255,255,.14);border-left:3px solid #8a96a3;border-radius:6px;padding:6px 26px 6px 9px;color:#e8ecef;box-shadow:0 4px 14px rgba(0,0,0,.3)}
.sit-c.p2{border-left-color:#ffd27a}.sit-c.p3{border-left-color:#ff6b5e}
.sit-c.new{animation:sitIn .5s ease-out}
@keyframes sitIn{from{transform:translateX(-8px);opacity:0}to{transform:none;opacity:1}}
.sit-c .sit-go{all:unset;display:block;cursor:pointer;width:100%}
.sit-c .sit-go b{display:block;font:600 12.5px/1.3 var(--font-s,inherit)}
.sit-c .sit-go span{display:block;font-size:11px;line-height:1.35;color:#a9b4bd;margin-top:1px}
.sit-c .sit-x{all:unset;position:absolute;right:4px;top:4px;width:20px;height:20px;display:flex;align-items:center;justify-content:center;color:#8a96a3;cursor:pointer;border-radius:4px;font-size:14px}
.sit-c .sit-x:hover{color:#fff;background:rgba(255,255,255,.08)}
.sit-c .sit-a{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}
.sit-c .sit-a .btn{min-height:26px;padding:0 8px;font-size:11.5px}
.sit-c .sit-a .btn .s{display:none}
.sit .sit-more{pointer-events:none;font-size:11px;color:#a9b4bd;padding-left:2px}
.sit.off .sit-c,.sit.off .sit-more{display:none}
@media (prefers-reduced-motion:reduce){.sit-c.new{animation:none}}
@media (max-width:760px){.sit{width:min(230px,calc(100vw - 24px))}.sit-c{padding:5px 24px 5px 8px}.sit-c .sit-go span{display:none}.sit-c .sit-a .btn{min-height:28px}.sit-c .sit-a .btn .l{display:none}.sit-c .sit-a .btn .s{display:inline}}`;
  document.head.appendChild(st);}
function sitEl(){if(typeof document==='undefined')return null;let el=document.getElementById('sit');if(el)return el;
  const host=document.getElementById('mm');if(!host)return null;el=document.createElement('div');el.className='sit';el.id='sit';el.setAttribute('aria-live','polite');host.appendChild(el);return el;}
const sitEsc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function sitDraw(){const el=sitEl();if(!el)return;
  if(!sitOn()){if(el.innerHTML){el.innerHTML='';SITV.sig='';}return;}
  const mob=typeof innerWidth!=='undefined'&&innerWidth<=760;const L2=sitList();const top=L2.slice(0,mob?SIT.maxM:SIT.max);
  const rows=top.map(r=>({r,b:r.acts.map((a,j)=>[j,sitBtn(r,j)]).filter(x=>x[1])}));
  const sig=[SITV.open,mob,L2.length,...rows.map(({r,b})=>r.k+'|'+r.txt+'|'+r.sub+'|'+b.map(x=>x[1].l+(x[1].ok?1:0)).join(','))].join('#');
  if(sig===SITV.sig)return;SITV.sig=sig;
  if(!L2.length){el.innerHTML='';return;}
  const hot=L2.some(r=>(r.pri||1)>=3);
  let h=`<button class="sit-h" data-sit="tog" aria-expanded="${SITV.open}" title="부대들이 올린 보고와 요청">전황 보고 <i class="${hot?'hot':''}">${L2.length}</i></button>`;
  for(const {r,b} of rows){const fresh=G.sit.fresh===r.k;
    h+=`<div class="sit-c p${r.pri||1}${fresh?' new':''}" data-k="${sitEsc(r.k)}"><button class="sit-go" data-sit="go" title="그 자리로 화면 이동"><b>${sitEsc(r.txt)}</b><span>${sitEsc(r.sub||'')}</span></button>`+
      `<button class="sit-x" data-sit="x" aria-label="이 보고 닫기" title="닫기">×</button>`+
      (b.length?`<div class="sit-a">${b.map(([j,x])=>`<button class="btn sm" data-sit="a" data-j="${j}" ${x.ok?'':'disabled'} title="${sitEsc(x.tip||'')}"><span class="l">${sitEsc(x.l)}</span><span class="s">${sitEsc(x.s)}</span></button>`).join('')}</div>`:'')+`</div>`;}
  if(L2.length>top.length)h+=`<div class="sit-more">보고 ${L2.length-top.length}개 더</div>`;
  el.innerHTML=h;el.classList.toggle('off',!SITV.open);G.sit.fresh=null;}
if(typeof document!=='undefined')document.addEventListener('click',e=>{const b=e.target.closest('[data-sit]');if(!b||b.disabled||!sitOn())return;
  const op=b.dataset.sit;if(op==='tog'){SITV.open=!SITV.open;try{localStorage.setItem(SIT.key,SITV.open?'1':'0');}catch(e2){}SITV.sig='';sitDraw();return;}
  const c=b.closest('.sit-c');if(!c)return;const k=c.dataset.k;
  if(op==='x'){G.sit.r.delete(k);G.sit.gone.set(k,(G.time||0)+60);SITV.sig='';sitDraw();return;}
  if(op==='go'){sitDo(k);return;}
  if(op==='a'){if(sitDo(k,+b.dataset.j)){SITV.sig='';if(typeof render==='function')render();}sitDraw();}});

/* ---------- 게임에 건다 ---------- */
function sitInit(){G.sit={r:new Map(),gone:new Map(),loss:[],own:[],seq:0,nx:0,fresh:null};}
{const _ng=newGame;newGame=function(cfg){const g=_ng(cfg);try{sitInit();}catch(e){}return g;};}
{const _k=kill;kill=function(u,by){const live=G.units.includes(u);_k(u,by);
  try{if(live&&G.sit&&sitOn()&&u.nat===G.viewer&&UT[u.type].cls!=='air')G.sit.loss.push({t:G.time||0,x:u.x,z:u.z});}catch(e){}};}
{const _t=rtTick;rtTick=function(dt){_t(dt);if(!G)return;if(!G.sit)sitInit();if(!sitOn())return;const t=G.time||0;if(t<G.sit.nx)return;G.sit.nx=t+SIT.dt;
  try{sitScan();sitDraw();}catch(e){if(G.errs)G.errs.push('sitrep: '+e.message);}};}
/* 작은 지도에 보고 자리 */
{const _mo=typeof mmOverlay==='function'?mmOverlay:null;mmOverlay=function(g){if(_mo)_mo(g);if(!sitOn()||!G.sit||typeof mmTo!=='function')return;
  const pulse=.5+.5*Math.sin(Date.now()/220);
  for(const r of sitList().slice(0,SIT.max)){if((r.pri||1)<2)continue;const [x,y]=mmTo(r.x,r.z);g.strokeStyle=(r.pri||1)>=3?'#ff6b5e':'#ffd27a';g.globalAlpha=.55+.45*pulse;g.lineWidth=1.6;
    g.beginPath();g.arc(x,y,5+pulse*2,0,6.283);g.stroke();g.globalAlpha=1;}};}
