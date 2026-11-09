/* ===================== ESCORT: 보급·구난·구급 차량 호위와 안전한 길 =====================
   "보급트럭이나 구급차같은건 호위병력이 있어야되지않을까" (2026-11-09).
   실제 교범(전투 호송): 앞쪽으로 가는 지원 차량에는 무장 차량(건트럭·험비)이 붙어 길을 앞서 살피고,
   적을 만나면 호위가 맞서 싸우는 동안 지원 차량은 빠져나간다. 길은 알려진 적을 비켜 간다.
   - 호위 붙이기: 보급 트럭(탄약 나르기)·구난차(수리·견인)·구급차(부상자 받으러)가 일을 맡아 가는 곳이
     적 근처(보이는 적·8초 안에 본 적에서 7칸 안)면, 6칸 안에서 놀고 있는 험비 > 장갑차 > (소대에 안 든)소총·기관총 분대
     하나를 호위로 붙인다. AI 세력과 부관 지휘를 켠 플레이어만(직접 지휘에서는 플레이어 부대를 가져가지 않는다).
   - 호위 자리: 아는 적이 10칸 안에 있으면 지원 차량에서 그 적 쪽으로 1칸, 아니면 지원 차량이 갈 길 1칸 앞.
   - 적이 쏠 거리에 들어오면 호위는 멈춰 싸운다. 지원 차량은 06g-logi 위험 판단대로 물러난다.
   - 호송 걸음: 호위가 2칸 넘게 뒤처지면 지원 차량이 앞으로 가는 걸음을 늦춘다(물러날 때는 늦추지 않는다).
   - 일이 끝나거나 지원 차량이 물러나 적이 없으면, 또는 90초가 지나면 호위를 풀어 원래 AI로 돌려준다.
   - 안전한 길: 지원 차량의 길이 아는 적 2.8칸 안을 지나면 옆으로 3~5.5칸 돌아가는 길을 찾아 더 안전하면 그 길로. */
const ESC={on:1,route:1,front:7,mem:8,pick:6,lead:1,upd:.4,max:90,lag:2,risk:2.8,memR:20,repath:1.2};
const ESC_HIDE={esc:1};
const ESC_SUP={sup:1,rec:1,amb:1};
const ESC_PREF={hmv:3,ifv:2,rifle:1,mg:1};
/* 지원 차량이 지금 앞으로 가는 일을 맡았나: 가는 곳 [x,z] 또는 null */
function escFwd(s){if(s.type==='sup'){if(s.lj&&s.lj.k==='serve'){const e=uById(s.lj.id);if(e)return [e.x,e.z];}return null;}
  if(s.type==='rec'){if(s.tow!=null)return s.path&&s.path.length?s.path[s.path.length-1]:null;
    if(s.lj&&s.lj.k==='fix'){const v=uById(s.lj.id);if(v)return [v.x,v.z];}return null;}
  if(s.type==='amb'){const j=s.mj;if(!j)return null;
    if(j.k==='move'||j.k==='wait'){const o=uById(j.id);if(o)return [o.x,o.z];}
    if(j.k==='orph'&&s.path&&s.path.length)return s.path[s.path.length-1];return null;}
  return null;}
/* 세력 n이 아는 적 위치(보이는 지상 적 + 기억). ESC 틱마다 한 번 */
function escKnown(n,age){const t=G.time||0,out=[];
  for(const e of G.units){if(e.nat===n||e.hp<=0)continue;const fly=UT[e.type].fly;if(fly&&!(e.type==='gunship'||e.type==='fpv'))continue;if(G.fog&&!seen(e,n))continue;out.push([e.x,e.z]);}
  if(typeof memOf==='function'){const M=memOf(n);for(const id in M){const p=M[id];if(t-p.t>age)continue;out.push([p.x,p.z]);}}
  return out;}
const escNear=(K,x,z,r)=>{for(const p of K)if(Math.hypot(p[0]-x,p[1]-z)<r)return true;return false;};
function escFree(u,t){const ty=UT[u.type];if(!ESC_PREF[u.type]||ty.fly||u.esc||u.job||u.post||u.cqb||u.hold||u.msn||u.fol||u.climb||u.tow!=null||u.towBy!=null)return false;
  if(u.pl!=null||u.man!=null&&t-u.man<60)return false;if(u.fesc!=null&&t-(u.fescT||-99)<5)return false;
  if(u.hp<hpMax(u)*.6||(u.supp||0)>0)return false;if(inside(u))return false;
  if(G.units.some(e=>e.nat!==u.nat&&!UT[e.type].fly&&(!G.fog||seen(e,u.nat))&&Math.hypot(e.x-u.x,e.z-u.z)<4.5))return false;   // 교전 중인 부대는 빼지 않는다
  return true;}
function escPick(s,t){let best=null,bs=-1e9;
  for(const u of G.units){if(u.nat!==s.nat||!escFree(u,t))continue;const d=Math.hypot(u.x-s.x,u.z-s.z);if(d>ESC.pick)continue;
    const sc=ESC_PREF[u.type]*2-d;if(sc>bs){bs=sc;best=u;}}
  return best;}
function escRelease(u,why){const s=u.esc?uById(u.esc.s):null;if(s&&s.escBy===u.id)s.escBy=null;u.esc=null;u._escRp=null;
  if(why!=='fight')u.path=[];if(u.job===ESC_HIDE)u.job=null;}
/* 호위 자리 */
function escSlot(u,s,K){let tx=null,tz=null,bd=10;for(const p of K){const d=Math.hypot(p[0]-s.x,p[1]-s.z);if(d<bd){bd=d;tx=p[0];tz=p[1];}}
  let x,z;
  if(tx!=null){const m=bd||1;x=s.x+(tx-s.x)/m*ESC.lead;z=s.z+(tz-s.z)/m*ESC.lead;}
  else if(s.path&&s.path.length){let px=s.x,pz=s.z,left=ESC.lead;x=s.path[s.path.length-1][0];z=s.path[s.path.length-1][1];
    for(const p of s.path){const d=Math.hypot(p[0]-px,p[1]-pz);if(d>=left){const f=left/(d||1);x=px+(p[0]-px)*f;z=pz+(p[1]-pz)*f;break;}left-=d;px=p[0];pz=p[1];}}
  else{const f=escFwd(s);if(f){const dx=f[0]-s.x,dz=f[1]-s.z,m=Math.hypot(dx,dz)||1;const k=Math.min(.8,m);x=s.x+dx/m*k;z=s.z+dz/m*k;}else{x=s.x;z=s.z;}}
  x=Math.min(N-.05,Math.max(.05,x));z=Math.min(N-.05,Math.max(.05,z));
  if(!walkable(u,x,z))return [s.x,s.z];return [x,z];}
function escFight(u){for(const e of G.units){if(e.nat===u.nat||e.hp<=0)continue;if(G.fog&&!seen(e,u.nat))continue;
  if(canHit(u,e))return true;}return false;}
/* 호위 하나: 따르기·싸우기 */
function escFollow(u,t,K){const s=uById(u.esc.s);
  if(!s||s.nat!==u.nat||s.escBy!==u.id){escRelease(u);return;}
  const fwd=escFwd(s);
  if(escFight(u)){u.esc.ft=t+4;if(u.path&&u.path.length)u.path=[];return;}   // 멈춰 싸운다(조준·사격은 엔진이)
  if((u.esc.ft||0)>t)return;
  if(!fwd&&!escNear(K,s.x,s.z,ESC.front)){escRelease(u);return;}   // 일이 끝났거나 물러나 안전하다
  if(t-u.esc.t0>ESC.max||u.hp<hpMax(u)*.4||u.post||u.cqb||u.hold||u.man!=null&&u.man>u.esc.t0||u.fesc!=null&&t-(u.fescT||-99)<5){escRelease(u);return;}
  if(u.pl!=null){escRelease(u,'fight');return;}
  const sl=escSlot(u,s,K);const d=Math.hypot(sl[0]-u.x,sl[1]-u.z);
  if(d<.3){if(u.path&&u.path.length)u.path=[];return;}
  if(typeof formClear==='function'&&formClear(u,u.x,u.z,sl[0],sl[1]))u.path=[[sl[0],sl[1]]];
  else if(u._escRp==null||t-u._escRp>ESC.repath||!u.path||!u.path.length){u._escRp=t;const P=pathPts(u,sl[0],sl[1]);u.path=P.length?P:[];}
  u.dest=null;u.tgtTile=null;}
function escTick(){if(!ESC.on)return;const t=G.time||0;if((G._escT||0)>t)return;G._escT=t+ESC.upd;
  const KN={};const known=n=>KN[n]||(KN[n]=escKnown(n,ESC.mem));
  for(const u of G.units.slice())if(u.esc&&G.units.includes(u))escFollow(u,t,known(u.nat));
  for(const s of G.units){if(!ESC_SUP[s.type]||s.escBy!=null||!aiRun(s.nat)||!selfRun(s))continue;
    if(s.escBy!=null&&!uById(s.escBy))s.escBy=null;
    const f=escFwd(s);if(!f||Math.hypot(f[0]-s.x,f[1]-s.z)<1.5)continue;
    if((s._escPk||0)>t)continue;s._escPk=t+3;
    const K=known(s.nat);if(!escNear(K,f[0],f[1],ESC.front)&&!escNear(K,s.x,s.z,ESC.front))continue;
    const u=escPick(s,t);if(!u)continue;
    u.esc={s:s.id,t0:t};s.escBy=u.id;u.tgt=null;if(typeof tacN==='function')tacN('esc');
    if(s.nat===G.viewer&&!isAI(s.nat)&&typeof L==='function')L(`${UT[u.type].n} → ${UT[s.type].n} 호위`);}
  for(const s of G.units)if(s.escBy!=null){const e=uById(s.escBy);if(!e||!e.esc||e.esc.s!==s.id)s.escBy=null;}}
{const _t=rtTick;rtTick=function(dt){_t(dt);if(!G||G.over||!G.units)return;try{escTick();}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}};}
// 호위 중인 부대는 다른 AI 판단(기동·제병협동·부관)이 데려가지 않는다
{const _ai=aiThink;aiThink=function(n){const hid=[];
  for(const u of G.units)if(u.nat===n&&u.esc&&!u.job){u.job=ESC_HIDE;hid.push(u);}
  try{return _ai(n);}finally{for(const u of hid)if(u.job===ESC_HIDE)u.job=null;}};}
// 사람이 직접 명령하면 호위를 푼다
{const man=f=>function(u){if(u&&u.esc)escRelease(u);return f.apply(null,arguments);};orderMoveTo=man(orderMoveTo);orderStop=man(orderStop);}
// 호송 걸음: 호위가 뒤처지면 앞으로 가는 지원 차량이 늦춘다
{const _mv=rtMove;rtMove=function(u,dt){if(u.escBy==null||!ESC_SUP[u.type]||!u.path||!u.path.length)return _mv(u,dt);
  const e=uById(u.escBy);if(!e||!escFwd(u))return _mv(u,dt);const d=Math.hypot(e.x-u.x,e.z-u.z);
  return _mv(u,d>ESC.lag*1.6?dt*.35:d>ESC.lag?dt*.6:dt);};}
/* ---------- 안전한 길 ---------- */
function escRisk(P,x0,z0,K){if(!K.length)return 0;let r=0,px=x0,pz=z0;const n=P.length;
  for(let i=0;i<n;i++){const q=P[i];const L0=Math.hypot(q[0]-px,q[1]-pz);const k=Math.max(1,Math.ceil(L0/.5));
    for(let j=1;j<=k;j++){const x=px+(q[0]-px)*j/k,z=pz+(q[1]-pz)*j/k;if(escNear(K,x,z,ESC.risk))r+=.5;}px=q[0];pz=q[1];}
  return r;}
function escLen(P,x0,z0){let l=0,px=x0,pz=z0;for(const q of P){l+=Math.hypot(q[0]-px,q[1]-pz);px=q[0];pz=q[1];}return l;}
{const _pp=pathPts;let busy=false;pathPts=function(u,x,z){const P=_pp(u,x,z);
  if(busy||!ESC.route||!u||!ESC_SUP[u.type]||!G||!G.units||!G.units.includes(u)||P.length<1||!selfRun(u))return P;
  const t=G.time||0;const c=u._cvy;
  if(c&&t-c.t<1.5&&Math.hypot(c.x-x,c.z-z)<.5&&Math.hypot(c.sx-u.x,c.sz-u.z)<.5)return c.P.slice();
  const K=escKnown(u.nat,ESC.memR);const r0=escRisk(P,u.x,u.z,K);
  let best=P;
  if(r0>0){busy=true;try{const l0=escLen(P,u.x,u.z);let bc=r0*4+l0;
      const dx=x-u.x,dz=z-u.z,m=Math.hypot(dx,dz)||1,mx=(u.x+x)/2,mz=(u.z+z)/2;
      for(const o of [3,-3,5.5,-5.5]){const wx=mx-dz/m*o,wz=mz+dx/m*o;if(wx<.3||wz<.3||wx>N-.3||wz>N-.3||!walkable(u,wx,wz))continue;
        const A=_pp(u,wx,wz);if(!A.length)continue;const p=Object.create(u);p.x=wx;p.z=wz;p.r=Math.floor(wz);p.c=Math.floor(wx);
        const B=_pp(p,x,z);if(!B.length)continue;const e=B[B.length-1];if(Math.hypot(e[0]-x,e[1]-z)>.6)continue;
        const Q=A.concat(B);const r=escRisk(Q,u.x,u.z,K);const l=escLen(Q,u.x,u.z);if(l>l0*2.2+4)continue;const cc=r*4+l;
        if(cc<bc-1){bc=cc;best=Q;}}}
    finally{busy=false;}
    if(best!==P&&typeof tacN==='function')tacN('cvyRoute');}
  Object.defineProperty(u,'_cvy',{value:{t,x,z,sx:u.x,sz:u.z,P:best.slice()},writable:true,configurable:true,enumerable:false});
  return best;};}
