/* ===================== SCAR: 맞은 자리만 부서지는 건물 =====================
   포탄·미사일·전차 포는 건물을 통째로 낮추지 않는다. 맞은 벽·모서리·층에 구멍(x.scar)을 낸다.
   - 구멍 크기는 폭약량의 세제곱근: 반지름 ≈ 0.7 m × kg^(1/3) (RPG 0.6 m, 전차 고폭탄 1 m, 155mm 1.3 m, Mk82 3.1 m)
   - 어디에: 직사 화기는 쏜 쪽 벽, 노린 병사의 층. 곡사(박격포·포)는 대부분 지붕·맨 위층. 가까운 바깥 폭발은 그쪽 벽 아래층.
   - 위층 붕괴(x.lost 층): 큰 폭탄이 지붕을 뚫고 터지거나, 피해가 쌓여 내구가 30% 밑으로 떨어질 때 한 번.
   - 통째 붕괴: 내구가 0이 될 때(피해 누적, 큰 폭탄·폭파)만.
   - 불: 안을 태우고(x.gut) 겉을 그을린다. 구조는 크게 안 상한다(내구 40% 밑으로는 못 내린다).
     다 타고 꺼질 때 드물게(목조 주택·창고 10%, 콘크리트 3%) 지붕·맨 위층이 내려앉는다. */
const SC={max:10,R:.7/12};
let scCtx=null;   // 지금 건물을 때리는 것: {x,z,h,top,ax,az,fl,kg,fire}
const SC_SIDE=[[-1,0,0,-1],[0,1,1,0],[1,0,0,1],[0,-1,-1,0]];   // 0 북 1 동 2 남 3 서: [dr,dc,nx,nz]
function scAs(ctx,fn){const p=scCtx;scCtx=ctx;try{return fn();}finally{scCtx=p;}}
const scOpen=(r,c,s)=>{const [dr,dc]=SC_SIDE[s];return !inb(r+dr,c+dc)||G.map[r+dr][c+dc].t!=='bldg';};
const scRand=(a,b)=>a+Math.random()*(b-a);
/* 이 칸의 어느 면(벽)이 점(px,pz) 쪽을 보나 */
function scFace(r,c,px,pz){const dx=px-(c+.5),dz=pz-(r+.5);let best=-1,bs=-1e9;
  for(let s=0;s<4;s++){if(!scOpen(r,c,s))continue;const [,,nx,nz]=SC_SIDE[s];const v=dx*nx+dz*nz;if(v>bs){bs=v;best=s;}}return best;}
/* 면 위 자리(0..1): 북·남 면은 x, 동·서 면은 z 방향 */
function scAlong(r,c,s,px,pz){const dx=px-(c+.5),dz=pz-(r+.5);const [,,nx,nz]=SC_SIDE[s];const n=dx*nx+dz*nz;const lat=nx?dz:dx;
  return n>.05?.5+lat/n*.5:.5+lat;}
/* 구멍 하나를 적는다. 가까운 구멍과는 합쳐 커진다 */
function scAdd(x,o){const L=x.scar||(x.scar=[]);o.t=Math.round(Math.max(.06,Math.min(.94,o.t))*100)/100;o.R=Math.round(Math.min(.3,o.R)*1000)/1000;o.fl=Math.max(0,o.fl);
  if(o.s===4)o.u=Math.round(Math.max(.12,Math.min(.88,o.u))*100)/100;
  for(const q of L){if(q.s!==o.s)continue;const d=o.s===4?Math.hypot(q.t-o.t,q.u-o.u):Math.hypot(q.t-o.t,(q.fl-o.fl)*.32);
    if(d<(q.R+o.R)*.9){const R=Math.min(.3,Math.cbrt(q.R**3+o.R**3)*1.05);if(R>q.R*1.15){q.R=Math.round(R*1000)/1000;x.scN=(x.scN||0)+1;}return q;}}
  if(L.length>=SC.max){let m=L[0];for(const q of L)if(q.R<m.R)m=q;m.R=Math.min(.3,Math.round(m.R*1.15*1000)/1000);x.scN=(x.scN||0)+1;return m;}
  L.push(o);x.scN=(x.scN||0)+1;G.scarV=(G.scarV||0)+1;return o;}
/* 맞은 자리를 정한다 */
function scHit(r,c,amt,ctx){const x=G.map[r][c];if(x.t!=='bldg')return null;ctx=ctx||{};const rf=Math.max(1,roofFl(x));
  const kg=ctx.kg||Math.max(.5,amt*.6);const R=SC.R*Math.cbrt(kg)*scRand(.85,1.15);
  const inTile=ctx.x!=null&&Math.floor(ctx.x)===c&&Math.floor(ctx.z)===r;
  let s=-1,t=.5,fl=0,u=.5;
  if(ctx.ax!=null){// 직사: 쏜 쪽 벽, 노린 층
    s=scFace(r,c,ctx.ax,ctx.az);if(s<0)return null;t=scAlong(r,c,s,ctx.ax,ctx.az)+scRand(-.3,.3);
    fl=ctx.fl!=null?Math.min(rf-1,ctx.fl):Math.floor(Math.random()*Math.min(rf,ctx.air?rf:3));}
  else if(ctx.top&&inTile){// 곡사·폭탄: 대부분 지붕이나 맨 위층
    const roof=ctx.h==null||ctx.h>=rf-.6;
    if(roof&&Math.random()<.6){s=4;t=ctx.x-c;u=ctx.z-r;fl=rf;}
    else{s=scFace(r,c,ctx.x,ctx.z);if(s<0){s=4;t=ctx.x-c;u=ctx.z-r;fl=rf;}else{t=scAlong(r,c,s,ctx.x,ctx.z)+scRand(-.15,.15);fl=ctx.h!=null?Math.min(rf-1,Math.floor(ctx.h)):rf-1-(Math.random()<.3?1:0);}}}
  else if(ctx.x!=null){// 바깥 폭발: 그쪽 벽 아래층
    s=scFace(r,c,ctx.x,ctx.z);if(s<0)return null;t=scAlong(r,c,s,ctx.x,ctx.z)+scRand(-.2,.2);fl=ctx.fl!=null?ctx.fl:Math.random()<.7?0:Math.min(rf-1,1);}
  else{// 모르는 것: 아무 바깥 벽
    const S=[0,1,2,3].filter(i=>scOpen(r,c,i));if(!S.length)return null;s=S[Math.floor(Math.random()*S.length)];t=Math.random();fl=Math.floor(Math.random()*rf);}
  return scAdd(x,{s,t,u,fl:Math.min(s===4?rf:rf-1,fl),R,kg:Math.round(kg*10)/10});}
/* 위층이 무너진다(층 수만큼 지붕이 내려온다) */
function scLose(r,c,n){const x=G.map[r][c];if(x.t!=='bldg'||!(n>0))return;const rf0=roofFl(x);n=Math.min(n,rf0-1);if(n<=0)return;
  x.lost=(x.lost||0)+n;if(x.scar)x.scar=x.scar.filter(q=>q.fl<roofFl(x)||q.s===4).map(q=>q.s===4?Object.assign(q,{fl:roofFl(x)}):q);x.scN=(x.scN||0)+1;bump();
  const rf1=roofFl(x);if(rf1<rf0)wrkFloorFall(r,c,rf0,rf1);}
{const _d=damageBldg;damageBldg=function(r,c,amt){const x=inb(r,c)?G.map[r][c]:null;if(!x||x.t!=='bldg'||!(amt>0))return _d(r,c,amt);const ctx=scCtx||{};
  if(ctx.fire){// 불: 안을 태우고, 구조는 내구 40%까지만 상하게 한다
    x.gut=Math.min(1,Math.round(((x.gut||0)+amt/(x.bmax*.5))*100)/100);const floor=x.bmax*.4;const room=x.bhp-floor;if(room<=0)return;
    const m=amt<x.bmax?(WRK_MAT[x.ks]||(x.dist==='res'?1.2:1)):1;return _d(r,c,Math.min(amt*.4,room/m));}
  const rf0=roofFl(x),k0=x.bhp/x.bmax;_d(r,c,amt);if(x.t!=='bldg')return;
  const h=scHit(r,c,amt,ctx);
  // 큰 폭탄은 지붕을 뚫고 위층 몇 개를 날린다
  const kg=ctx.kg||0;let lose=0;
  if(kg>=50&&rf0>=2&&(h?h.s===4||h.fl>=rf0-2:true)&&Math.random()<.55)lose=Math.max(1,Math.min(Math.ceil(rf0*.5),Math.round(Math.cbrt(kg/90)*scRand(1,2.4))));
  // 피해가 쌓여 내구가 30% 밑이면 맨 위층(높은 건물은 두 층)이 한 번 내려앉는다
  else if(!x.sag&&k0>=.3&&x.bhp/x.bmax<.3&&rf0>=2){x.sag=1;lose=rf0>=6?2:1;}
  if(lose)scLose(r,c,lose);};}
/* 다 타고 꺼진 건물은 드물게 지붕·위층이 내려앉는다 */
{const _f=fireTick;fireTick=function(dt){const was=(G&&G.fires||[]).slice();scAs({fire:1},()=>_f(dt));
  for(const k of was){const r=kr(k),c=kc(k);const x=G.map[r][c];if(x.t!=='bldg'||!x.burnt||x._scB)continue;x._scB=1;
    const light=x.ks==='house'||x.ks==='ware'||x.ks==='villa'||(!x.ks&&x.dist==='res');let p=light?.1:.03;if(x.bhp/x.bmax<.5)p*=2;
    if(Math.random()>=p)continue;if(roofFl(x)>=2)scLose(r,c,1);else scAs({kg:5},()=>damageBldg(r,c,x.bhp+x.bmax));
    L(`${x.obj!=null?G.objs[x.obj].name+' ':''}불탄 건물 지붕이 내려앉았다`);}};}
/* 맞힌 것 알리기: 탄약·공격자 자리·층 */
{const _s=shellBoom;shellBoom=function(s,x,z,h,r,c){return scAs({x,z,h,top:1,kg:wrkShellKg(s)},()=>_s(s,x,z,h,r,c));};}
{const _s=rtShootBldg;rtShootBldg=function(a,r,c){const t=UT[a.type];const foe=unitsAt(r,c).find(u=>u.nat!==a.nat&&UT[u.type].cls==='inf');
  return scAs({ax:a.x,az:a.z,fl:foe?Math.floor(curFl(foe)):null,kg:WRK_KG[a.type]||1,air:!!t.fly},()=>_s(a,r,c));};}
{const _s=rtShoot;rtShoot=function(a,d){if(!d||cell(d.r,d.c).t!=='bldg')return _s(a,d);const t=UT[a.type];
  return scAs({ax:a.x,az:a.z,fl:UT[d.type].cls==='inf'?Math.floor(curFl(d)):0,kg:WRK_KG[a.type]||1,air:!!t.fly},()=>_s(a,d));};}
if(typeof bombHit==='function'){const _s=bombHit;bombHit=function(b){return scAs({x:b.x??b.c+.5,z:b.z??b.r+.5,top:1,kg:b.main===false?40:90},()=>_s(b));};}
if(typeof msBlast==='function'){const _s=msBlast;msBlast=function(x,z,R,base,n,bc,br){const a=arguments;return scAs({x,z,top:1,kg:bc>=50?480:bc>=20?220:60},()=>_s.apply(this,a));};}
if(typeof msHit==='function'){const _s=msHit;msHit=function(m,e,r,c){const tx=e?e.x:c+.5,tz=e?e.z:r+.5;const a=Math.atan2(tz-(m.z??tz),tx-(m.x??tx));
  return scAs({ax:tx-Math.cos(a)*2,az:tz-Math.sin(a)*2,fl:e&&UT[e.type]&&UT[e.type].cls==='inf'?Math.floor(curFl(e)):null,kg:4.5,air:1},()=>_s(m,e,r,c));};}
if(typeof jetDrop==='function'){const _s=jetDrop;jetDrop=function(j){return scAs({x:j.c+.5,z:j.r+.5,top:1,kg:90},()=>_s(j));};}
if(typeof fpvBoom==='function'){const _s=fpvBoom;fpvBoom=function(u,e){return scAs({ax:u.x,az:u.z,fl:e&&UT[e.type].cls==='inf'?Math.floor(curFl(e)):null,kg:.6,air:1},()=>_s(u,e));};}
if(typeof demoBoom==='function'){const _s=demoBoom;demoBoom=function(d){return scAs({x:d.c+.5,z:d.r+.5,fl:0,kg:20},()=>_s(d));};}
if(typeof breach==='function'){const _s=breach;breach=function(a,P){return scAs({ax:a.x,az:a.z,fl:0,kg:2},()=>_s(a,P));};}
if(typeof vbBoom==='function'){const _s=vbBoom;vbBoom=function(u,k){return scAs({x:u.x,z:u.z,fl:0,kg:250*(k||1)},()=>_s(u,k));};}
