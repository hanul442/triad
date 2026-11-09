/* ===================== 아군 오사 회피: 모든 무기가 쏘기 전에 아군을 확인한다 =====================
   예전에는 사선 위에 아군이 서 있어도, 표적 바로 옆에 아군이 붙어 있어도 그냥 쐈다. 이제는 실제 교범처럼:
   1) 직사 화기(소총·기관총·저격·장갑차·전차·대전차·공격헬기): 쏘는 선(사선) 위나 표적 너머(빗나간 탄이 가는 곳)에
      아군이 있으면 쏘지 않는다. 표적 둘레에 아군이 붙어 있어도(무기별 파편·빗나감 반경) 쏘지 않는다.
      높이도 본다: 위층·옥상에서 아래로 쏘거나 헬기가 위에서 쏘면 사선이 아군 머리 위를 지난다.
      보류가 1.2초 넘게 이어지면 옆으로 몇 걸음 옮겨 사선을 연다(밖에 서 있고 다른 일이 없을 때).
   2) 후폭풍: 대전차 로켓·대전차미사일·휴대 대공미사일은 뒤쪽 원뿔(RPG·AT4 약 30m, 좌우 45°) 안에
      보병이나 비장갑 차량이 있으면 쏘지 않는다. 전차포는 앞쪽 18m·좌우 35° 안 보병(포구 폭풍)이 있으면 쏘지 않는다.
   3) 곡사·화력 지원은 실제 위험추정거리(합동 화력 교범의 REDs 근사값)를 쓴다:
      [사격 금지 거리(10% 피해 확률), 위험근접 거리(0.1%)] m. 금지 거리 안에 아군이 있으면 쏘지 않고,
      위험근접 거리 안이면 무전으로 "위험근접"을 알리고 쏜다(플레이어 요청일 때).
      장갑차 안은 3배, 건물 실내는 2배, 참호·벙커는 1.6배 멀리 있는 것으로 친다(파편을 막아 준다).
   4) 전투기: 진입 방향을 아군 위를 지나지 않는 쪽(폭탄이 길게·짧게 떨어져도 아군에서 먼 쪽)으로 고른다.
      투하 순간 아군이 금지 거리 안으로 들어와 있으면 투하를 중지한다(ABORT).
      공격헬기: 대기 지점·사격 비행 방향을 아군 위를 지나지 않는 쪽으로 고른다.
   5) 수류탄·유탄·건물 폭약·벽 뚫기·도어건: 터질 곳 둘레에 아군이 있으면 던지지·터뜨리지·쏘지 않는다.
   1칸 ≈ 12m. */
const FF={
  // 곡사·지원 [금지, 위험근접] m
  red:{mortar:[75,165],spg:[100,200],mlrs:[200,400],arty:[100,200],air:[100,425],cruise:[150,500],tbm:[200,600]},
  sprd:{arty:1.4},                       // 포격 지원은 9발이 흩어져 떨어진다(칸)
  // 직사: 표적 둘레 아군 금지 반경(m). 빗나간 탄·파편이 떨어지는 곳
  near:{rifle:4,mg:6,sniper:2,hmv:6,zu:10,aa:0,ifv:12,tank:15,at:10,atgm:12,gunship:50,eng:10,rk:10,dg:12},
  nearVeh:{tank:8},                      // 전차가 철갑탄으로 차량을 쏠 때
  w:4,                                   // 사선 좌우 폭(m)
  over:{rifle:10,mg:14,sniper:10,hmv:14,zu:18,ifv:18,tank:20,at:12,atgm:12,gunship:24,rk:12},   // 표적 너머(m)
  bb:{at:[30,45],rk:[30,45],atgm:[25,40],aa:[25,40]},   // 후폭풍 [길이 m, 좌우 각도]
  mz:{tank:[18,35]},                     // 전차포 포구 폭풍
  gl:15,grenade:1,                       // 유탄 둘레 15m, 실내 수류탄은 같은 칸 같은 층
  demo:20,                               // 건물 폭약 둘레(m)
  hold:1.2,move:6,                       // 보류가 이어지면 옆으로 옮기는 시간(초)·다시 옮기기 전 대기
  say:20,                                // 같은 부대 보류 알림 간격(초)
};
const ffT=m=>m/12;
const ffFriend=(o,n)=>!hostile(o.nat,n);
const ffArm=o=>{const t=UT[o.type];return t.cls==='veh'&&(t.armor||o.type==='ifv'||o.type==='spg'||o.type==='mlrs'||o.type==='aa'||o.type==='zu');};
/* 파편을 막아 주는 정도: 실제 거리에 곱해서 비교한다 */
function ffProt(o){if(ffArm(o))return 3;const X=cell(o.r,o.c);if(UT[o.type].cls==='inf'){if(X.t==='bldg'&&eye(o)<bldgH(X)-.05)return 2;
  if(typeof trenchAt==='function'&&trenchAt(o.x,o.z))return 1.6;if(typeof bunkerAt==='function'&&bunkerAt(o.x,o.z))return 1.6;}return 1;}
/* (x,z) 둘레 아군 중 가장 가까운(보호 보정한) 거리, 칸 */
function ffNearest(n,x,z,skip){let best=1e9,who=null;for(const o of G.units){if(o===skip||!ffFriend(o,n)||UT[o.type].fly||o.tun||o.bsm)continue;
  const d=Math.hypot(o.x-x,o.z-z)*ffProt(o);if(d<best){best=d;who=o;}}return {d:best,o:who};}
/* 점들(폭탄 줄 등) 가운데 가장 가까운 아군 */
function ffNearestPts(n,pts){let best={d:1e9,o:null};for(const [x,z] of pts){const r=ffNearest(n,x,z);if(r.d<best.d)best=r;}return best;}
/* 곡사·지원: 'ok' | 'dc'(위험근접) | 'hold'(금지) */
function ffRed(n,kind,x,z,pts){const R=FF.red[kind];if(!R)return {k:'ok',d:1e9};const sp=FF.sprd[kind]||0;const r=pts?ffNearestPts(n,pts):ffNearest(n,x,z);const d=r.d-sp;
  return {k:d<ffT(R[0])?'hold':d<ffT(R[1])?'dc':'ok',d:Math.max(0,d),o:r.o,R};}
/* 직사 화기 변수 */
function ffP(a,d){let k=a.type;if(k==='rifle'&&d&&UT[d.type].cls==='veh')k='rk';   // 소총분대가 차량을 치는 건 분대 대전차 로켓
  const vt=d&&UT[d.type].cls==='veh';return {k,near:ffT((vt&&FF.nearVeh[k])||FF.near[k]||5),w:ffT(FF.w),over:ffT(FF.over[k]||10),bb:FF.bb[k],mz:FF.mz[k]};}
const ffSameRoom=(a,d)=>UT[a.type].cls==='inf'&&UT[d.type].cls==='inf'&&a.r===d.r&&a.c===d.c&&cell(a.r,a.c).t==='bldg'&&flOf(a)===flOf(d);
/* 사선 검사. 쏘는 곳 (ax,az,ae) → 표적 (dx,dz,de). 막히면 이유를 돌려준다 */
function ffLineAt(a,ax,az,ae,dx,dz,de,P,dFly,skip){const L=Math.hypot(dx-ax,dz-az)||1e-6,ux=(dx-ax)/L,uz=(dz-az)/L;
  const tb=P.bb?Math.tan(P.bb[1]*Math.PI/180):0,tm=P.mz?Math.tan(P.mz[1]*Math.PI/180):0,bbL=P.bb?ffT(P.bb[0]):0,mzL=P.mz?ffT(P.mz[0]):0;const reach=L+P.over+1;
  for(const o of G.units){if(o===a||o===skip||!ffFriend(o,a.nat)||UT[o.type].fly||o.tun||o.bsm)continue;
    const rx=o.x-ax,rz=o.z-az;if(rx>reach||rx<-reach||rz>reach||rz<-reach)continue;
    const t=rx*ux+rz*uz,lat=Math.abs(rx*uz-rz*ux);const inf=UT[o.type].cls==='inf';
    if(!dFly&&P.near>0&&Math.hypot(o.x-dx,o.z-dz)<P.near)return {why:'near',o};
    if(t>.2&&t<L+P.over&&lat<P.w){const hl=ae+(de-ae)*Math.min(t,L)/L;if(Math.abs(hl-eye(o))<.55)return {why:'line',o};}
    if(P.bb&&t<0&&-t<bbL&&lat<=-t*tb+.15&&(inf||!ffArm(o))&&Math.abs(eye(o)-ae)<.8)return {why:'bb',o};
    if(P.mz&&inf&&t>0&&t<mzL&&lat<=t*tm+.15&&Math.abs(eye(o)-ae)<.8)return {why:'mz',o};}
  return null;}
function ffLine(a,d){if(ffSameRoom(a,d))return null;const [ax,az]=posOf(a),[dx,dz]=posOf(d);const dFly=!!UT[d.type].fly;
  return ffLineAt(a,ax,az,eye(a),dx,dz,eye(d),ffP(a,d),dFly,d);}
const FF_WHY={near:'표적 곁에 아군',line:'사선에 아군',bb:'후폭풍 구역에 아군',mz:'포구 앞에 아군',red:'위험 거리 안에 아군'};
function ffBlock(u,why,e){const t=G.time||0;u._ffB={t,why,e:e?e.id:null};if(typeof tacN==='function')tacN('ff_'+why);
  if(u.nat===G.viewer&&!isAI(u.nat)&&t-(u._ffSay||-99)>FF.say){u._ffSay=t;L(`${natName(u.nat)} ${UT[u.type].n} 사격 보류: ${FF_WHY[why]||why}`);}}
/* ---------- 쏘기 전 확인: rtFight 안에서 고르는 표적마다 ---------- */
{const _ch=canHit;canHit=function(a,d,fromR,fromC,moved){const r=_ch(a,d,fromR,fromC,moved);if(!r||!d||fromR!=null||G._ffS!==a)return r;
  const ta=UT[a.type];
  if(ta.ind){const k=ta.cls==='veh'||a.type==='mortar'?a.type:null;if(k&&FF.red[k]){const R=ffRed(a.nat,k,d.x,d.z);if(R.k==='hold'){ffBlock(a,'red',d);return false;}}return r;}
  const B=ffLine(a,d);if(B){ffBlock(a,B.why,d);return false;}return r;};}
/* 제압 사격(마지막 본 자리)도 사선을 본다: supFire가 losPt로 확인하는 순간에 */
{const _lp=losPt;losPt=function(x1,z1,h1,x2,z2,h2){const r=_lp(x1,z1,h1,x2,z2,h2);const a=G&&G._ffSup;if(!r||!a)return r;
  const P=ffP(a,null);P.near=Math.max(P.near,ffT(8));if(ffLineAt(a,x1,z1,h1,x2,z2,h2??.5,P,false,null))return false;return r;};}
if(typeof supFire==='function'){const _sf=supFire;supFire=function(u,moving){const p=G._ffSup;G._ffSup=u;try{return _sf(u,moving);}finally{G._ffSup=p;}};}
/* 건물 칸을 쏠 때(폭발물로 건물 사격): 그 칸·사선에 아군이 있으면 쏘지 않는다 */
{const _sb=rtShootBldg;rtShootBldg=function(a,r,c){const x=c+.5,z=r+.5;const X=cell(r,c);
  if(G.units.some(o=>o!==a&&ffFriend(o,a.nat)&&!UT[o.type].fly&&!o.tun&&o.r===r&&o.c===c)){ffBlock(a,'near');return 0;}
  const [ax,az]=posOf(a);const P=ffP(a,null);if(ffLineAt(a,ax,az,eye(a),x,z,X.t==='bldg'?Math.min(bldgH(X),1.5):.5,P,false,null)){ffBlock(a,'line');return 0;}
  return _sb(a,r,c);};}
/* 벽 뚫기: 그 칸(같은 층·바로 위아래)에 아군 보병이 있거나 사선·후폭풍이 막히면 치지 않는다 */
if(typeof breachPick==='function'){const _bp=breachPick;breachPick=function(u,tg){const P=_bp(u,tg);if(!P)return P;
  if(G.units.some(o=>o!==u&&ffFriend(o,u.nat)&&UT[o.type].cls==='inf'&&o.r===P.r&&o.c===P.c&&Math.abs(flOf(o)-P.fl)<2)){ffBlock(u,'near');return null;}
  const [ax,az]=posOf(u);const Q=ffP(u,null);Q.near=ffT(6);if(ffLineAt(u,ax,az,eye(u),P.x,P.z,P.h,Q,false,null)){ffBlock(u,'line');return null;}return P;};}
/* 실내 수류탄·돌입 폭약: 그 방(같은 칸 같은 층)에 아군이 있으면 던지지 않는다 */
if(typeof cqbBang==='function'){const _cb=cqbBang;cqbBang=function(a,r,c,fl,entry){
  if(G.units.some(o=>o!==a&&ffFriend(o,a.nat)&&UT[o.type].cls==='inf'&&!o.tun&&o.r===r&&o.c===c&&flOf(o)===fl)){if(typeof tacN==='function')tacN('ff_bang');return 0;}
  return _cb(a,r,c,fl,entry);};}
/* 분대 유탄: 터질 곳 15m 안에 아군이 있으면 쏘지 않는다 */
if(typeof squadGL==='function'){const _gl=squadGL;squadGL=function(a,d){if(a&&d&&G.units.some(o=>o!==a&&ffFriend(o,a.nat)&&!UT[o.type].fly&&!o.tun&&Math.hypot(o.x-d.x,o.z-d.z)<ffT(FF.gl))){if(typeof tacN==='function')tacN('ff_gl');return;}
  return _gl(a,d);};}
/* 건물 폭파: 둘레 20m 안에 아군이 있으면 기다린다(“폭파 준비, 물러서”) */
if(typeof demoFire==='function'){const _df=demoFire;demoFire=function(d){if(d&&!d.gone&&d.fuse==null){const cx=d.c+.5,cz=d.r+.5;
    const o=G.units.find(o=>ffFriend(o,d.nat)&&!UT[o.type].fly&&!o.tun&&Math.hypot(o.x-cx,o.z-cz)<ffT(FF.demo));
    if(o){const t=G.time||0;if(d.nat===G.viewer&&!isAI(d.nat)&&t-(d._ffSay||-99)>FF.say){d._ffSay=t;L(`${natName(d.nat)} 폭파 보류: 아군이 너무 가까움`);}return false;}}
  return _df(d);};}
/* 수송헬기 도어건: 표적 둘레 12m 안에 아군이 있으면 쏘지 않는다 */
if(typeof dgTargets==='function'){const _dt=dgTargets;dgTargets=function(g){return _dt(g).filter(e=>!G.units.some(o=>ffFriend(o,g.n)&&!UT[o.type].fly&&!o.tun&&Math.hypot(o.x-e.x,o.z-e.z)<ffT(FF.near.dg)));};}
/* ---------- 화력 지원 요청 ---------- */
{const _s=support;support=function(n,kind,r,c){const R=FF.red[kind];if(!R||!inb(r,c))return _s(n,kind,r,c);
  const me=n===G.viewer&&!isAI(n);let F=ffRed(n,kind,c+.5,r+.5,kind==='air'?ffStick(n,r,c).pts:null);
  if(F.k==='hold'){if(typeof tacN==='function')tacN('ff_sup');
    if(me){const m=`${SUP[kind].n} 거부: 아군이 탄착점 ${Math.round(F.d*12)}m 안 (금지 거리 ${R[0]}m)`;L(`${natName(n)} ${m}`);if(typeof toast==='function')toast(m);}
    return false;}
  const ok=_s(n,kind,r,c);
  if(ok&&F.k==='dc'&&me){L(`${natName(n)} 위험근접(Danger Close): 아군 ${Math.round(F.d*12)}m — 엄폐하라`);if(typeof toast==='function')toast(`위험근접: 아군 ${Math.round(F.d*12)}m`);}
  if(ok&&F.k==='dc')for(const o of G.units)if(ffFriend(o,n)&&!UT[o.type].fly&&UT[o.type].cls==='inf'&&Math.hypot(o.x-(c+.5),o.z-(r+.5))<ffT(R[1]))o._dcT=G.time||0;
  return ok;};}
/* AI가 고를 때도 같은 기준(06e의 짧은 거리 대신) */
{const _cs=canSupport;canSupport=function(n,kind,r,c){const ok=_cs(n,kind,r,c);if(!ok||!FF.red[kind]||!aiRun(n)||!inb(r,c))return ok;
  return ffRed(n,kind,c+.5,r+.5,kind==='air'?ffStick(n,r,c).pts:null).k!=='hold';};}
/* ---------- 전투기: 아군 위를 지나지 않는 진입 방향 ---------- */
// 폭탄은 비행 방향으로 길게·짧게 떨어지기 쉽다(앞뒤 3칸). 그 줄이 아군에서 가장 멀어지는 방향을 고른다.
function ffStick(n,r,c){const x=c+.5,z=r+.5;const e=airEdge(n,x,z);let ux=x-e[0],uz=z-e[1];if(Math.hypot(ux,uz)<.5){ux=N/2-x;uz=N/2-z;}const base=Math.atan2(uz,ux);
  let best=null;for(const o of [0,15,-15,30,-30,45,-45,60,-60,75,-75,90,-90]){const a=base+o*Math.PI/180,hx=Math.cos(a),hz=Math.sin(a);
    const pts=[[x,z],[x+hx*STICK.gap,z+hz*STICK.gap],[x-hx*STICK.gap,z-hz*STICK.gap]];const err=[...pts,[x+hx*3,z+hz*3],[x-hx*2,z-hz*2]];
    const s=ffNearestPts(n,err).d;if(!best||s>best.s+.3){best={s,hx,hz,pts};}}
  return best;}
if(typeof jetRun==='function'){const _jr=jetRun;jetRun=function(n,r,c){const j=_jr(n,r,c);if(j&&j.hx!=null){const b=ffStick(n,r,c);
    const cur=ffNearestPts(n,[[c+.5,r+.5],[c+.5+j.hx*3,r+.5+j.hz*3],[c+.5-j.hx*2,r+.5-j.hz*2]]).d;if(b&&b.s>cur+.3){j.hx=b.hx;j.hz=b.hz;}}return j;};}
if(typeof jetDrop==='function'){const _jd=jetDrop;jetDrop=function(j){const {n,r,c}=j;const hx=j.hx??1,hz=j.hz??0,x=c+.5,z=r+.5;
  const F=ffRed(n,'air',x,z,[[x,z],[x+hx*STICK.gap,z+hz*STICK.gap],[x-hx*STICK.gap,z-hz*STICK.gap]]);
  if(F.k==='hold'){j.abort=1;if(typeof tacN==='function')tacN('ff_abort');L(`${natName(n)} 폭격 중지(ABORT): 아군이 탄착점 ${Math.round(F.d*12)}m 안`);bump();return;}
  return _jd(j);};}
/* ---------- 공격헬기: 대기 지점·사격 비행이 아군 위를 지나지 않게 ---------- */
if(typeof gsAng==='function'&&typeof gunshipTick==='function'){
  const _ga=gsAng;gsAng=function(A,ang){const n=G._gsN;const a0=_ga(A,ang);if(n==null)return a0;let best=a0,bs=-1;
    for(const o of [0,.4,-.4,.8,-.8,1.2,-1.2,1.6,-1.6,2.2,-2.2,3.1]){const a=ang+o,x=A.cx+Math.cos(a)*GS.rs,z=A.cz+Math.sin(a)*GS.rs;if(!(x>.3&&z>.3&&x<N-.3&&z<N-.3))continue;
      // 대기 지점 → 목표 → 지나쳐 빠지는 곳까지의 사격선. 그 선 둘레 아군과의 거리
      const ux=(A.cx-x)/GS.rs,uz=(A.cz-z)/GS.rs;const pts=[];for(let k=.5;k<=GS.rs+GS.runPast+.6;k+=.5)pts.push([x+ux*k,z+uz*k]);
      const s=Math.min(ffNearestPts(n,pts).d,3);if(s>bs+.2){bs=s;best=a;}}
    return best;};
  const _gt=gunshipTick;gunshipTick=function(u,dt){const p=G._gsN;G._gsN=u.nat;try{return _gt(u,dt);}finally{G._gsN=p;}};}
/* ---------- 사격 보류가 이어지면 옆으로 옮겨 사선을 연다 ---------- */
function ffShift(u,e){const t=UT[u.type];if(t.fly||t.ind||u.hold||u.cqb||u.climb||u.job||u.demo||u.mh||u.tun||u.bsm||(u.path&&u.path.length))return false;
  if(cell(u.r,u.c).t==='bldg'||(typeof trenchAt==='function'&&trenchAt(u.x,u.z)))return false;
  const [ex,ez]=posOf(e);const L=Math.hypot(ex-u.x,ez-u.z)||1;const px=-(ez-u.z)/L,pz=(ex-u.x)/L;const ae=t.cls==='veh'?.8:.5;
  for(const s of [.6,-.6,1,-1,1.5,-1.5]){const x=u.x+px*s,z=u.z+pz*s;const X=tileAt(x,z);if(!X||X.t==='bldg'||!walkable(u,x,z)||!segClear(u,u.x,u.z,x,z))continue;
    if(Math.hypot(ex-x,ez-z)>t.rng[1]+.4)continue;
    if(!losPt(x,z,ae,ex,ez,eye(e)))continue;
    if(ffLineAt(u,x,z,ae,ex,ez,eye(e),ffP(u,e),!!UT[e.type].fly,e))continue;
    u.path=[[x,z]];if(u.dest&&Math.hypot(u.dest[0]-u.x,u.dest[1]-u.z)<.8)u.dest=[x,z];u._ffMv=(G.time||0)+FF.move;if(typeof tacN==='function')tacN('ff_move');return true;}
  return false;}
{const _f=rtFight;rtFight=function(u){if(!((u.cd||0)<=0))return _f(u);const t=G.time||0;const p=G._ffS;G._ffS=u;const f0=u.firedT;u._ffB=null;
  try{_f(u);}finally{G._ffS=p;}
  if(u.firedT!==f0||!G.units.includes(u)){u._ffH=null;return;}
  if(u._ffB&&u._ffB.t===t){if(u._ffH==null)u._ffH=t;
    if(t-u._ffH>=FF.hold&&t>=(u._ffMv||0)&&u._ffB.e!=null&&u._ffB.why!=='red'){const e=G.units.find(z=>z.id===u._ffB.e);if(e&&ffShift(u,e))u._ffH=null;}}
  else u._ffH=null;};}
