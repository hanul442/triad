/* ===================== 국군 2: 고르기·증원·천궁·천무·AI·설명서 =====================
   수치·이름은 05c3-rok, 모형은 07zv4-rok. 여기서는 규칙을 붙인다(모든 함수가 만들어진 뒤라 09번대).
   1) 시작 화면: 세력 줄마다 [기본 / 국군] 장비 선택. 고른 값은 이 기기에 기억한다.
   2) 증원: 국군 전용 병종(천궁)은 국군 세력만, 자폭 차량은 국군이 못 부른다. 카드 이름·도움말은 국군 장비.
      화력 지원 버튼도 국군 이름(수리온 공중강습, AH-64E 아파치, 현무-2·3 …).
   3) 천궁: 레이더가 지도 전체를 본다. 적 공격헬기·수송헬기를 쏘아 떨어뜨리고, 폭격하러 온 적 전투기를 떨어뜨리며,
      적 순항미사일·탄도미사일을 요격한다. 지상 표적·드론은 쏘지 않는다. 배치하면 보급소 가까운 뒤쪽에 스스로 자리 잡는다.
   4) 천무: 유도 로켓이라 기본 다연장처럼 넓게 흩뿌리지 않고 표적 둘레에 모아 떨어뜨린다(6발 일제, 한 발이 더 셈).
   5) AI 국군 세력은 적 헬기·미사일을 겪으면 천궁을 하나 부른다. */

/* ---------- 0) 천궁 표: 09e가 비슷한 병종(자주대공포)에서 빌려 온 값을 실제에 맞게 ---------- */
{const set=(tb,o)=>{if(tb&&typeof tb==='object')Object.assign(tb,o);};
 set(typeof AMMO==='object'&&AMMO,{kmsam:8});set(typeof LOAD==='object'&&LOAD,{kmsam:24});              // 발사대 1대 유도탄 8발
 set(typeof ARM==='object'&&ARM,{kmsam:[10,8,6,5]});set(typeof VCREW==='object'&&VCREW,{kmsam:3});      // 트럭 차체, 얇은 장갑
 if(typeof SEC==='object')SEC.kmsam=[];if(typeof READ==='object'&&READ.ty)READ.ty.kmsam='천궁';
 if(typeof VOX_CS==='object')VOX_CS.kmsam='천궁 #호';if(typeof VOX_CS_EN==='object')VOX_CS_EN.kmsam='Cheongung #';if(typeof VOX_TN_EN==='object')VOX_TN_EN.kmsam='SAM launcher';}

/* ---------- 1) 시작 화면 ---------- */
const ARMY_KEY='triad-armies';
function armyLoad(){let a=null;try{a=JSON.parse(localStorage.getItem(ARMY_KEY)||'null');}catch(e){}
  return Array.isArray(a)&&a.length===NATS.length?a.map(x=>x==='rok'?'rok':'std'):NATS.map((_,i)=>i===0?'rok':'std');}
function armySel(i){return `<select id="army-${i}" class="army" aria-label="${NATS[i].name} 장비">${Object.entries(ARMIES).map(([k,v])=>`<option value="${k}">${k==='rok'?'국군 장비':'기본 장비'}</option>`).join('')}</select>`;}
function armySync(){const a=UI.armies||armyLoad();NATS.forEach((_,i)=>{const s=typeof document!=='undefined'&&document.getElementById('army-'+i);if(s)s.value=a[i]||'std';});}
function armyRead(){const a=NATS.map((_,i)=>{const s=typeof document!=='undefined'&&document.getElementById('army-'+i);return s&&s.value==='rok'?'rok':'std';});
  UI.armies=a;try{localStorage.setItem(ARMY_KEY,JSON.stringify(a));}catch(e){}return a;}
if(typeof document!=='undefined'&&!document.getElementById('rok-css')){const st=document.createElement('style');st.id='rok-css';
  st.textContent=`#slots .slot{grid-template-columns:14px minmax(0,1fr) minmax(70px,110px) minmax(84px,120px)}
#slots .slot select{min-width:0}
@media (max-width:420px){#slots .slot{grid-template-columns:12px minmax(0,1fr) 72px 92px;gap:6px}#slots .slot label small{display:none}}`;document.head.appendChild(st);}

/* ---------- 2) 증원·화력 지원 ---------- */
const rokCan=(n,t)=>!(ROK_ONLY.has(t)&&!isRok(n))&&!(ROK_NO.has(t)&&isRok(n));
{const _d=deploySpots;deploySpots=function(n,type){if(!rokCan(n,type))return [];return _d.apply(this,arguments);};}
{const _b=buy;buy=function(n,type){if(!rokCan(n,type))return null;return _b.apply(this,arguments);};}
if(typeof buyMenu==='function'){const _m=buyMenu;buyMenu=function(n){const off=[];for(const t of TYPES)if(!rokCan(n,t)&&!UT[t].noBuy){UT[t].noBuy=1;off.push(t);}
  try{return _m.apply(this,arguments);}finally{for(const t of off)delete UT[t].noBuy;}};}
if(typeof buyCard==='function'){const _c=buyCard;buyCard=function(t,n){let h=_c.apply(this,arguments);
  if(isRok(n)&&ROK_DESC[t]){const ds=String(UT[t].desc||'').replace(/^\[[^\]]*\]\s*/,'');h=h.replace(/title="[^"]*"/,`title="[${ROK_REAL[t]}] ${ROK_DESC[t].replace(/"/g,'&quot;')}. ${ds.replace(/"/g,'&quot;')}"`);}return h;};}
if(typeof renderPanel==='function'){const _rp=renderPanel;renderPanel=function(){const r=_rp.apply(this,arguments);
  try{if(typeof document!=='undefined'&&G&&UI.sheet&&UI.tab==='cmd'&&isRok(G.viewer))for(const k in ROK_SUP){const b=document.getElementById('sup-'+k);
    if(b&&b.firstChild&&b.firstChild.nodeType===3&&!b.dataset.rok){b.firstChild.textContent=`${ROK_SUP[k]} · ${SUP[k].cost}`;b.dataset.rok=1;}}}catch(e){}
  return r;};}

/* ---------- 3) 천궁 ---------- */
const samOf=n=>G.units.filter(u=>u.type==='kmsam'&&u.nat!==n&&!(u.supp>.5)&&(amOf(u)==null||amOf(u)>=1));
// 쏘기 한 번: 탄약·재장전·화면 효과
function samFire(s,x,z,what){s.cd=KMSAM.cd*(.85+Math.random()*.3);s.firedT=G.time||0;s.face=Math.atan2(z-s.z,x-s.x)*180/Math.PI;s._samT=G.time||0;
  if(s.am!=null)s.am=Math.max(0,s.am-1);if(FXH.aaShot)try{FXH.aaShot(s,{r:Math.floor(z),c:Math.floor(x),flared:1});}catch(e){}
  sfx('launch',.9,s.x,s.z);s.lastShot={t:G.time||0,hits:0,k:1,shell:1};}
const samReady=s=>!(s.cd>0)&&!(s.path&&s.path.length)&&(amOf(s)==null||amOf(s)>=1)&&!(s.supp>.5);
// 지상 표적은 쏘지 않는다: 공격헬기만 고른다
{const _f=rtFight;rtFight=function(u){if(u.type!=='kmsam')return _f.apply(this,arguments);
  if(!samReady(u))return;let best=null,bd=1e9;
  for(const e of G.units){if(e.nat===u.nat||!UT[e.type].heli)continue;const d=Math.hypot(e.x-u.x,e.z-u.z);if(d>KMSAM.R)continue;if(d<bd){bd=d;best=e;}}
  if(!best)return;samFire(u,best.x,best.z,'heli');
  if(Math.random()<KMSAM.heli){L(`${natName(u.nat)} ${rokName('kmsam',u.nat)||UT.kmsam.n} ${UT[best.type].n} 격추!`);best.hp=0;kill(best,u);}
  else{best.hp=Math.max(1,best.hp-hpMax(best)*.4);if(best.air&&!best.air.leave){best.air.leave=1;L(`${natName(best.nat)} ${UT[best.type].n} 미사일 피격, 임무 포기하고 복귀`);}}};}
// 수송헬기(헬기 투입)도 떨어뜨린다
function samTrhTick(){if(!G.trh||!G.trh.length||typeof trhPos!=='function')return;const now=G.time||0;
  for(const h of G.trh){if(h.down||h.abort||now>=h.end||now<h.t0+.8||h._sam)continue;const [x,z]=trhPos(h,now);
    const s=samOf(h.n).find(s=>samReady(s)&&Math.hypot(s.x-x,s.z-z)<=KMSAM.R);if(!s)continue;h._sam=1;samFire(s,x,z,'trh');
    if(Math.random()<KMSAM.trh)trhGone(h,'down',s);else if(now<h.t0+HELI_T)trhGone(h,'abort');}}
// 폭격하러 온 전투기
if(typeof jetDrop==='function'){const _j=jetDrop;jetDrop=function(j){const {n,r,c}=j;const x0=c+.5,z0=r+.5;
  const s=G&&samOf(n).find(s=>samReady(s)&&Math.hypot(s.x-x0,s.z-z0)<=KMSAM.R);
  if(s){samFire(s,x0,z0,'jet');if(Math.random()<KMSAM.jet){const a=Math.random()*6.283,d=1.5+Math.random()*2;
      const x=Math.min(N-.5,Math.max(.5,x0+Math.cos(a)*d)),z=Math.min(N-.5,Math.max(.5,z0+Math.sin(a)*d));
      L(`${natName(s.nat)} ${rokName('kmsam',s.nat)} 전투기 격추! 폭격 실패`);G.nats[s.nat].kills++;s.kills=(s.kills||0)+1;
      if(typeof crashAt==='function')crashAt({x,z,t:G.time+1.6,big:1,nat:n,kind:'jet'});if(FXH.jetDown)FXH.jetDown(j,x,z);sfx('boom',1.2,x,z);bump();return;}}
  return _j.apply(this,arguments);};}
// 순항·탄도미사일 요격: 떨어질 때가 된 미사일을 먼저 본다
if(typeof strikeTick==='function'){const _st=strikeTick;strikeTick=function(){if(G&&G.strikes&&G.strikes.length){const keep=[];
    for(const j of G.strikes){if(j.t>(G.time||0)||j._sam){keep.push(j);continue;}j._sam=1;
      const s=samOf(j.n).find(s=>samReady(s)&&Math.hypot(s.x-j.x,s.z-j.z)<=KMSAM.R);
      if(!s){keep.push(j);continue;}samFire(s,j.x,j.z,j.kind);
      if(Math.random()>(j.kind==='tbm'?KMSAM.tbm:KMSAM.cruise)){keep.push(j);continue;}
      L(`${natName(s.nat)} ${rokName('kmsam',s.nat)} ${j.kind==='tbm'?'탄도미사일':'순항미사일'} 요격!`);G.nats[s.nat].kills++;s.kills=(s.kills||0)+1;
      const a=Math.random()*6.283,d=1+Math.random()*1.5;j.down=[Math.min(N-.5,Math.max(.5,j.x+Math.cos(a)*d)),Math.min(N-.5,Math.max(.5,j.z+Math.sin(a)*d))];
      if(FXH.msDown)try{FXH.msDown(j);}catch(e){}msBlast(j.down[0],j.down[1],.6,2.5,j.n,3,0);}
    G.strikes=keep;}
  return _st.apply(this,arguments);};}
// 적이 미사일을 쏘면 기억(AI가 천궁을 부를지 정할 때)
if(typeof msStrike==='function'){const _ms=msStrike;msStrike=function(n){const r=_ms.apply(this,arguments);if(G)for(let k=0;k<G.nats.length;k++)if(k!==n&&G.nats[k])G.nats[k].msT=G.time||0;return r;};}
// 자리: 보급소에서 아군 전투 부대 쪽으로 조금(최대 KMSAM.back칸) 나온 뒤쪽, 건물·물이 아닌 땅. 실제 천궁 포대도 전선 한참 뒤에서 지도 전체를 덮는다
function samSpot(u){const own=G.units.filter(o=>o.nat===u.nat&&!UT[o.type].fly&&!SELF_RUN[o.type]&&(UT[o.type].cls==='inf'||UT[o.type].cls==='veh'));
  if(!own.length||typeof depotOf!=='function')return null;let x=0,z=0;for(const o of own){x+=o.x;z+=o.z;}x/=own.length;z/=own.length;
  const d=depotOf(u.nat);const L=Math.hypot(x-d.x,z-d.z)||1,k=Math.min(KMSAM.back,L*.3)/L;const tx=d.x+(x-d.x)*k,tz=d.z+(z-d.z)*k;
  for(const R of [0,1,2,3])for(let i=0;i<8;i++){const a=i/8*6.283,px=tx+Math.cos(a)*R,pz=tz+Math.sin(a)*R;const t=tileAt(px,pz);
    if(t&&t.t!=='bldg'&&t.t!=='water'&&walkable(u,px,pz))return [px,pz];if(!R)break;}
  return null;}
function samPosTick(){const now=G.time||0;if((G._samP||0)>now)return;G._samP=now+5;
  for(const u of G.units){if(u.type!=='kmsam'||u.hold||(u.path&&u.path.length)||!selfRun(u))continue;
    const d=depotOf(u.nat);if(Math.hypot(u.x-d.x,u.z-d.z)<KMSAM.home)continue;   // 이미 뒤쪽이면 그대로(쏘는 데는 자리가 상관없다)
    const sp=samSpot(u);if(!sp||Math.hypot(sp[0]-u.x,sp[1]-u.z)<5)continue;
    // 돌아가는 길이 앞쪽으로 크게 휘면(강·다리 너머) 가지 않는다
    const P=pathPts(u,sp[0],sp[1]);if(!P||!P.length)continue;let L=0,px=u.x,pz=u.z,far=0;for(const p of P){L+=Math.hypot(p[0]-px,p[1]-pz);px=p[0];pz=p[1];far=Math.max(far,Math.hypot(p[0]-d.x,p[1]-d.z));}
    if(L>Math.hypot(sp[0]-u.x,sp[1]-u.z)*1.6+6||far>Math.hypot(u.x-d.x,u.z-d.z)+4)continue;
    u.path=P;u.tgt=null;u.tgtTile=null;u.dest=[sp[0],sp[1]];}}
// AI 전술(06-ai·06b)이 천궁을 앞으로 내보내지 않게, AI 생각하는 동안 천궁은 '일하는 중'으로 숨긴다(자리는 samPosTick이 잡는다)
const SAM_HIDE={sam:1};
if(typeof aiThink==='function'){const _ai=aiThink;aiThink=function(n){const hid=[];
  if(G)for(const u of G.units)if(u.nat===n&&u.type==='kmsam'&&!u.job){u.job=SAM_HIDE;hid.push(u);}
  try{return _ai.apply(this,arguments);}finally{for(const u of hid)if(u.job===SAM_HIDE)u.job=null;}};}
{const _t=rtTick;rtTick=function(dt){const r=_t.apply(this,arguments);if(G&&!G.over&&G.units.some(u=>u.type==='kmsam')){try{samTrhTick();samPosTick();}catch(e){}}return r;};}

/* ---------- 4) 천무: 유도 로켓 ---------- */
if(typeof mlrsShoot==='function'){const _m=mlrsShoot;mlrsShoot=function(a,d){if(!isRok(a.nat))return _m.apply(this,arguments);
  a.shot=G.turn;a.firedT=G.time||0;a.face=Math.atan2(d.z-a.z,d.x-a.x)*180/Math.PI;const [ax,az]=posOf(a);const dd=Math.hypot(d.x-ax,d.z-az);const k=6;
  for(let i=0;i<k;i++){const q=Math.random()*6.283,rr=Math.sqrt(Math.random())*.75;
    const tx=Math.min(N-.05,Math.max(.05,d.x+Math.cos(q)*rr)),tz=Math.min(N-.05,Math.max(.05,d.z+Math.sin(q)*rr));
    const s=shellLaunch({x0:ax,z0:az,h0:eye(a)+.3,tx,tz,n:a.nat,src:a.id,type:'mlrs',pw:.2,spread:.2,delay:i*.3,T:.9+dd*.1,ap:1.2+dd*.22});s.rk=1;s.x1=tx;s.z1=tz;s.mis=false;}   // 유도탄: 크게 빗나가지 않는다
  a.lastShot={t:G.time||0,hits:0,k:1,tgt:d.id,shell:1};if(FXH.mlrs)FXH.mlrs(a);sfx('launch',1,a.x,a.z);L(`${natName(a.nat)} 천무 유도로켓 일제 사격`);return 0;};}

/* ---------- 5) AI ---------- */
if(typeof aiArmsW==='function'){const _w=aiArmsW;aiArmsW=function(n,E,cnt,total){const w=_w.apply(this,arguments);
  for(const t of Object.keys(w))if(!rokCan(n,t))delete w[t];
  if(isRok(n)&&!(Object.keys(w).length===1)){const N2=G.nats[n],now=G.time||0;const eHeli=E.filter(e=>UT[e.type].heli).length;
    const threat=eHeli||now-(N2.airSeenT??-1e9)<300||now-(N2.msT??-1e9)<300;
    w.kmsam=cnt('kmsam')>=1||total<6?0:threat?(eHeli?1.2:.7):0;}
  return w;};}

/* ---------- 6) 설명서 ---------- */
if(typeof MAN_AUTO==='object')MAN_AUTO.kmsam='보급소 가까운 뒤쪽(아군 쪽으로 몇 칸)에 스스로 자리 잡고, 지도 안의 적 공격헬기·수송헬기와 폭격하러 오는 전투기를 쏘며, 적 순항·탄도미사일을 요격합니다. 지상 표적과 드론은 쏘지 않습니다.';
function manRok(){const rows=TYPES.filter(t=>ROK_REAL[t]&&UT[t]).map(t=>`<b>${UT[t].n}</b> → ${manE(ROK_REAL[t])}${ROK_DESC[t]?`: ${manE(ROK_DESC[t])}`:''}`);
  return `<p>시작 화면 자유 전투에서 세력마다 <b>장비</b>를 고릅니다. <b>국군 장비</b>를 고른 세력은 규칙은 같고, 장비 이름·차량 모형·병사 차림(디지털 위장복·위장 덮개 방탄모)이 대한민국 국군 것이 됩니다. 처음에는 블루 연방군이 국군 장비입니다.</p>`+
    manL(rows)+`<h4>국군 화력 지원</h4>`+manL(Object.keys(ROK_SUP).filter(k=>SUP[k]).map(k=>`<b>${SUP[k].n}</b> → ${manE(ROK_SUP[k])}`))+
    `<h4>국군만 가진 것</h4>`+manL([
      `<b>${UT.kmsam.n}(${manE(ROK_REAL.kmsam)})</b> ${UT.kmsam.cost}점: 지상 표적은 못 쏘지만 지도 전체(${KMSAM.R}칸)를 지킵니다. 공격헬기 격추 ${Math.round(KMSAM.heli*100)}%, 수송헬기 ${Math.round(KMSAM.trh*100)}%, 폭격 전투기 ${Math.round(KMSAM.jet*100)}%, 순항미사일 요격 ${Math.round(KMSAM.cruise*100)}%, 탄도미사일 요격 ${Math.round(KMSAM.tbm*100)}%. 유도탄 8발, 한 발에 약 ${KMSAM.cd}초. 보급 트럭이 다시 채웁니다`,
      `<b>천무</b>: 유도 로켓 6발을 표적 둘레(약 9m)에 모아 떨어뜨립니다. 기본 다연장(12발을 넓게)보다 발수는 적지만 한 곳을 확실히 부숩니다`,
      `<b>수송헬기</b>는 수리온, <b>공격헬기</b>는 AH-64E 아파치 모습으로 옵니다`,
      `국군 세력은 자폭 차량을 쓰지 않습니다`])+
    `<p class="man-auto">제원은 방위사업청·육군·제조사의 공개 자료 기준입니다. 게임 거리는 1칸 ≈ 12m로 줄여 씁니다.</p>`;}
if(typeof manualHtml==='function'){const _mh=manualHtml;manualHtml=function(){return _mh.apply(this,arguments)+manSec('rok','국군 장비',manRok());};}
