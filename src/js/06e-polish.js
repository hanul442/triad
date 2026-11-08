/* ===================== POLISH: AI 관전 1000판에서 찾은 어색한 점 고치기 =====================
   - 차량 명령 고정: AI가 2초마다 차량 목적지를 바꾸면 회전 중에 되돌아선다. 새 목적지가 6초 안에 크게(60도 넘게) 다른 쪽이면
     먼저 준 길을 그대로 간다(크게 다치거나 재보급하러 가는 길은 예외).
   - 보급 트럭: 적이 3.2칸 안에 보이거나 방금 맞았으면 보급소로 빠지고, 그 부대는 30초 동안 찾아가지 않는다.
     교전 한가운데 있는 부대에는 가지 않으며, 전선에서 45초 넘게 할 일 없이 서 있으면 보급소로 돌아간다.
   - 탄약이 다 떨어진 부대와 절반 넘게 다친 부대는 건물 꼭대기로 올라가지 않는다(1층에 머물러 빠져나갈 수 있게).
     교전 중 탄약이 떨어진 AI 부대는 트럭을 기다리지 않고 보급소로 물러난다.
   - AI의 포격·폭격은 아군이 가까이(포격 3칸, 폭격 1.5칸) 있으면 하지 않는다.
   - 공격헬기는 지휘점수 12로 비싸지고 화력이 조금 줄었다.
   - 손실 원인: 출혈·차량 포기처럼 쏜 쪽 없이 끝난 손실은 마지막으로 피해를 준 부대 몫으로 센다(90초 안).
     화력 지원(포격·폭격)으로 죽은 경우 u._cause에 그 종류를 남긴다. */
const POL={vcommit:6,vsettle:8,vturn:1.05,truckHot:3.2,truckFlee:30,truckIdle:45,lastBy:90,ffR:{arty:3,air:1.5,tbm:2.2,cruise:1.6}};
/* ---------- 차량 명령 고정 ---------- */
const polEnd=u=>u.path&&u.path.length?u.path[u.path.length-1]:null;
{const _ai=aiThink;aiThink=function(n){const t=G.time||0;const snap=new Map();
  for(const u of G.units){if(u.nat!==n)continue;const ty=UT[u.type];if(ty.cls!=='veh'||ty.fly||ty.logi)continue;snap.set(u,{p:u.path?u.path.slice():[],e:polEnd(u),d:u.dest});}
  _ai(n);
  for(const [u,s] of snap)if(G.units.includes(u))polVeh(u,s,t);};}
/* 한 차량: s = aiThink 전 {p 길, e 끝, d 목적지} */
function polVeh(u,s,t){const e=polEnd(u);const c=u._cmE;
    if(!s.e&&c&&Math.hypot(c[0]-u.x,c[1]-u.z)<=.8&&u._arT==null)u._arT=t;          // 도착
    if(!e)return;
    if(s.e&&Math.hypot(e[0]-s.e[0],e[1]-s.e[1])<.6)return;                       // 같은 길
    const urgent=u.hp<hpMax(u)*.5||u.rearm||u.towBy!=null||(u.vd&&u.vd.mob)||t-(u._hitT??-99)<4;
    // 막 도착한 차량이 몇 칸 뒤로 되돌아가려 하면(왔다 갔다) 그 자리를 지킨다
    if(!urgent&&!s.e&&u._arT!=null&&t-u._arT<POL.vsettle&&Math.hypot(e[0]-u.x,e[1]-u.z)<4){const f=(u.face||0)*Math.PI/180,a2=Math.atan2(e[1]-u.z,e[0]-u.x);
      if(Math.abs(Math.atan2(Math.sin(f-a2),Math.cos(f-a2)))>POL.vturn+.5){u.path=[];u.dest=null;if(typeof tacN==='function')tacN('vkeep');return;}}
    if(c&&!urgent&&t-(u._cmT??-99)<POL.vcommit&&Math.hypot(c[0]-u.x,c[1]-u.z)>.6){
      const a1=Math.atan2(c[1]-u.z,c[0]-u.x),a2=Math.atan2(e[1]-u.z,e[0]-u.x);const da=Math.abs(Math.atan2(Math.sin(a1-a2),Math.cos(a1-a2)));
      if(da>POL.vturn){const P=s.p.length&&s.e&&Math.hypot(s.e[0]-c[0],s.e[1]-c[1])<.6?s.p:pathPts(u,c[0],c[1]);
        if(P.length){u.path=P;u.dest=[c[0],c[1]];if(typeof tacN==='function')tacN('vkeep');return;}}}
    u._cmT=t;u._cmE=[e[0],e[1]];u._arT=null;}
/* ---------- 보급 트럭 ---------- */
if(typeof supTick==='function'){
  const _st=supTick;supTick=function(u,dt){_st(u,dt);if(!isAI(u.nat)||!G.units.includes(u))return;const t=G.time||0;
    const hot=hotAt(u.nat,u.x,u.z,POL.truckHot)||t-(u._hitT??-99)<6;
    if(hot&&!atDepot(u)&&!(u.lj&&u.lj.k==='home'&&u.path&&u.path.length)){if(u.lj&&u.lj.id!=null)(u.nog=u.nog||{})[u.lj.id]=t+POL.truckFlee;supHome(u);u._idleT=null;if(typeof tacN==='function')tacN('truckFlee');return;}
    if(idle(u)&&!atDepot(u)&&!u._srv&&!(u.lj&&u.lj.k==='serve')){if(u._idleT==null)u._idleT=t;else if(t-u._idleT>POL.truckIdle){u._idleT=null;supHome(u);}}else u._idleT=null;};
  const _ss=supSend;supSend=function(u,e){if(isAI(u.nat)&&hotAt(u.nat,e.x,e.z,POL.truckHot)){(u.nog=u.nog||{})[e.id]=(G.time||0)+20;u._auT=0;return;}return _ss(u,e);};}
if(typeof aiLogi==='function'){const _al=aiLogi;aiLogi=function(n){_al(n);
  for(const u of G.units){if(u.nat!==n||!amMax(u)||u.rearm||amOf(u)>=1||inZone(n,u.r,u.c)||u.brk||UT[u.type].fly)continue;
    if(!hotAt(n,u.x,u.z,3.5))continue;u.rearm=1;u.tgt=null;u.tgtTile=null;if(u.pl&&typeof msnLeave==='function'&&!u.msn)msnLeave(u);const d=depotOf(n);u.path=pathPts(u,d.x,d.z);}};}
/* 다 떨어지거나 많이 다친 부대는 꼭대기로 올라가지 않는다 */
function polHurt(u){if(!u.ws||!u.ws.length)return false;let bad=0;for(const w of u.ws)if(w.s!=='ok'&&w.s!=='lw')bad++;return bad*2>=u.ws.length;}
function polFloors(){for(const u of G.units){if(UT[u.type].cls!=='inf'||UT[u.type].fly)continue;
  const out=(amMax(u)&&amOf(u)<1)||polHurt(u)||u.rearm;
  if(out&&u.flT==null){u.flT=0;u._polFl=1;}else if(!out&&u._polFl){u.flT=null;u._polFl=0;}}}
/* ---------- 아군 근처 포격 금지(AI) ---------- */
{const _s=support;support=function(n,kind,r,c){const R=POL.ffR[kind];
  if(R&&isAI(n)&&G.units.some(o=>o.nat===n&&!UT[o.type].fly&&Math.hypot(o.x-(c+.5),o.z-(r+.5))<R))return false;
  const p=G._supN;G._supN={n,kind};try{return _s(n,kind,r,c);}finally{G._supN=p;}};}
/* ---------- 공격헬기 ---------- */
if(SUP.gunship){SUP.gunship.cost=12;}
if(UT.gunship){UT.gunship.atk={...UT.gunship.atk,inf:6,veh:6};}
/* ---------- 손실 원인 ---------- */
{const _h=harm;harm=function(u,amt,by,o){if(u&&amt>0){const t=G.time||0;u._hitT=t;if(by&&by!==u)u._lb={by,t};else if(!by&&G._supN)u._lc={k:G._supN.kind,n:G._supN.n,t};}return _h(u,amt,by,o);};}
{const _k=kill;kill=function(u,by){if(!by&&u){const t=G.time||0;if(u._lb&&t-u._lb.t<POL.lastBy)by=u._lb.by;else if(u._lc&&t-u._lc.t<POL.lastBy)u._cause=u._lc.k;}return _k(u,by);};}
/* ---------- 매 틱 ---------- */
{const _t=rtTick;rtTick=function(dt){_t(dt);if(!G||G.over||!G.units)return;const t=G.time||0;if((G._polT||0)>t)return;G._polT=t+1;
  try{polFloors();}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}};}
/* ---------- 곡사·폭발물 근접 아군 확인 ---------- */
// 곡사는 표적 둘레(박격포 1.2칸, 자주포 1.8칸, 다연장 2.4칸)에 아군 지상 부대가 있으면, 직접 쏘는 폭발물은 표적 0.7칸 안에 아군이 있으면 쏘지 않는다
const POL_DC={mortar:1.2,spg:1.8,mlrs:2.4};
{const _ch=canHit;canHit=function(a,d,fromR,fromC,moved){const r=_ch(a,d,fromR,fromC,moved);if(!r||!d)return r;const ta=UT[a.type];
  const R=ta.ind?(POL_DC[a.type]||1.5):ta.ex?.7:0;if(!R)return r;const [dx,dz]=posOf(d);
  for(const o of G.units){if(o.nat!==a.nat||o===a||UT[o.type].fly)continue;const [ox,oz]=posOf(o);if(Math.abs(ox-dx)<R&&Math.abs(oz-dz)<R&&Math.hypot(ox-dx,oz-dz)<R)return false;}
  return r;};}
/* ---------- 박격포 손보기: 관측은 그대로 두고 빨리·정확하게 ---------- */
// 분대 무전 사격 요청 8초 → 5초, 드론·저격수 2초 → 1.5초. 같은 표적을 이어 쏘면 탄착을 고쳐 흩어짐이 줄어든다(1발 1, 2발 .75, 3발째부터 .6)
if(typeof OBS==='object'){OBS.call=5;OBS.fast=1.5;}
POL_DC.mortar=.9;
if(UT.mortar)UT.mortar.atk={...UT.mortar.atk,inf:6};   // 보병 피해 5 → 6
if(typeof shellShoot==='function'&&typeof shellLaunch==='function'){
  const _sl=shellLaunch;shellLaunch=function(o){if(G._spK&&o)o.spread=(o.spread||1)*G._spK;if(G._pwK&&o)o.pw=(o.pw??1)*G._pwK;return _sl(o);};
  const _ss=shellShoot;shellShoot=function(a,d){const t=G.time||0;const L=a.lastShot;const same=L&&L.shell&&L.tgt===d.id&&t-L.t<20;
    a._adj=same?Math.min(2,(a._adj||0)+1):0;const p=G._spK,q=G._pwK;G._spK=[1,.75,.6][a._adj];
    // 박격포는 한 번에 두 발씩(발당 위력 .65): 실제 박격포반처럼 짧게 연속 사격
    try{if(a.type==='mortar'){G._pwK=.65;_ss(a,d);return _ss(a,d);}return _ss(a,d);}finally{G._spK=p;G._pwK=q;}};}
// 박격포 쌍안경 +3 → +4칸(멈춰서 8칸), 관측자가 놓친 뒤 3초까지는 마지막 사격 요청대로 쏜다, AI 구매 비중 .08 → .1
if(typeof OPT==='object')OPT.gl.mortar=4;
if(typeof ARMS_MIX==='object'){ARMS_MIX.mortar=.1;}
if(typeof obsReady==='function'){const _or=obsReady;obsReady=function(a,e){if(_or(a,e))return true;const r=G.cff&&G.cff[a.nat]&&G.cff[a.nat][e.id];const t=G.time||0;
  return !!(r&&t-r.last<3&&t-r.t0>=(r.c===1?OBS.fast:OBS.call));};}
/* ---------- 차량 사격량(차량 움직임 #43 뒤) ---------- */
// 포탑이 돌아야 쏘게 되면서 차량 사격이 판당 25%쯤 줄었다. 보이는 표적이 없을 때도 기억하는 가장 가까운 적 쪽으로 포탑을 미리 돌려 두고,
// 안정화 포(전차·장갑차)는 조금 덜 맞아도(전차 5→8도, 장갑차 8→12도) 쏜다.
if(typeof vAimPt==='function'){
  const _va=vAimPt;vAimPt=function(u){const P=_va(u);if(P||typeof memOf!=='function')return P;const R=UT[u.type].rng[1]+2;let best=null,bd=R;
    for(const m of Object.values(memOf(u.nat))){if((G.time||0)-m.t>15)continue;const d=Math.hypot(m.x-u.x,m.z-u.z);if(d<bd){bd=d;best=m;}}
    if(!best)return null;u._aim=Math.atan2(best.z-u.z,best.x-u.x)*180/Math.PI;u._aimT=G.time||0;return null;};}
if(typeof VEH==='object'){if(VEH.tank)VEH.tank.tol=8;if(VEH.ifv)VEH.ifv.tol=12;}
