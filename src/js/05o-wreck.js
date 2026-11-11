/* ===================== WRECK: 무기 위력만큼 부서지는 지형지물 =====================
   폭발마다 폭약량(TNT 환산 kg)을 정하고, 실제 폭발처럼 세제곱근 비례(홉킨슨 법칙)로 효과 반경을 잡는다.
     구덩이 반지름 ≈ 0.9 m × kg^(1/3)  (흙. 포장도로는 65%. 흙은 1.5 kg, 포장은 4 kg부터 팬다)
     나무가 꺾이는 반경 ≈ 2.4 m × kg^(1/3), 세워 둔 차가 불타는 반경 ≈ 1.5 m × kg^(1/3),
     가로등·신호등·쓰레기통·생울타리가 쓰러지는 반경 ≈ 2.0 m × kg^(1/3)  (1칸 = 12 m)
   예: 82mm 박격포 0.9 kg → 구덩이 없음, 나무 반경 2 m / 155mm 7 kg → 구덩이 지름 3.4 m, 나무 4.6 m /
       Mk82 폭탄 90 kg → 구덩이 지름 8 m, 나무 11 m / 탄도미사일 480 kg → 구덩이 지름 14 m.
   - 구덩이(G.craters): 안에 엎드린 보병은 참호처럼 사방 엄폐(04d trenchAt), 큰 구덩이는 바퀴 차량을 막는다.
   - 숲(x.tl 0..1): 포격에 나무가 꺾여 많이 부서진 숲은 더는 시야를 가리지 않는다(04b-sight). G.fellZ = 쓰러진 자리(화면).
   - 소품: 차는 불타거나(뒤집히고), 전차가 밟으면 납작해진다. 가로등·신호등·쓰레기통·생울타리는 쓰러진다.
   - 건물: 재질별 강도(주택·창고는 약하고 철근 콘크리트 고층은 강하다), 위층이 무너지면 그 층 병사가 떨어져 다치고,
     무너진 잔해는 옆 길로 쏟아져(G.debris) 엄폐가 되고 길을 좁힌다. 높은 건물이 통째로 무너진 자리는 잔해 언덕(차량 못 넘음).
   길이 바뀌면 G.navV를 올려 이동 격자를 다시 만들고, 바뀐 곳을 지나던 부대는 길을 다시 찾는다. */
const WRK={m:12,maxCr:500,maxFell:700,maxDeb:400};
/* 탄약별 폭약량(kg, TNT 환산). 82mm 박격포탄 ~0.9, 120mm ~2.5, 전차 125mm 고폭탄 ~3.4, 152/155mm ~7, 122mm 로켓 ~6,
   RPG-7 ~0.7, 대전차미사일 ~4.5, 70mm 로켓 ~1.2, 공병 폭약 2, Mk82 89, 순항미사일 ~220, 탄도미사일 ~480, 자폭 차량 ~250 */
const WRK_KG={tank:3.2,at:.7,atgm:4.5,eng:2,gunship:1.2,mortar:.9,spg:7,mlrs:6,drone:.6,fpv:.6};
const wrkR=(kg,k)=>k*Math.cbrt(kg)/WRK.m;
/* 건물 재질: 피해 배수 (철근 콘크리트 고층·관공서는 튼튼하고, 목조·벽돌 주택과 슬레이트 창고는 약하다) */
const WRK_MAT={house:1.35,villa:1.15,ware:1.25,factory:1.1,shop:1,school:.9,apt:.85,panel:.85,office:.8,tower:.75};
/* 이동 격자 규칙 (04d NAV_RULE): 0 지나감, 1 느리게 넘음, 2 막힘 */
Object.assign(NAV_RULE,{
  crt:{inf:0,eng:0,veh:1,trk:0},crtB:{inf:0,eng:0,veh:2,trk:1},            // 포탄 구덩이 / 폭탄 구덩이
  deb:{inf:0,eng:0,veh:1,trk:0},debB:{inf:1,eng:1,veh:2,trk:1},            // 길로 쏟아진 잔해(작은 것 / 큰 것)
  mound:{inf:0,eng:0,veh:2,trk:1},moundB:{inf:0,eng:0,veh:2,trk:2},        // 무너진 건물 자리 잔해 언덕(높은 건물은 전차도 못 넘음)
  carX:{inf:0,eng:0,veh:1,trk:0}});                                       // 전차에 밟혀 납작해진 차
NAV_RULE.car.trk=1;   // 전차·자주포는 세워 둔 승용차를 밟고 넘어간다(넘으면 납작해진다)
COVK.crater=COVK.crater||{n:'포탄 구덩이',v:.5};
const wrkOpen=x=>!!x&&x.t!=='bldg'&&x.t!=='water'&&x.t!=='rubble';
function wrkInit(){if(!G)return;if(!G.craters)G.craters=[];if(!G.fellZ)G.fellZ=[];if(!G.debris)G.debris=[];}
function wrkNav(){G.navV=(G.navV||0)+1;G.wrkV=(G.wrkV||0)+1;bump();}
/* ---------- 폭발 하나 ---------- */
function wrkBlast(x,z,kg,o){if(!G||!G.map||!(kg>0))return;wrkInit();o=o||{};const t=tileAt(x,z);if(!t)return;
  const inB=t.t==='bldg'&&!o.out;let nav=false;
  // 1) 구덩이
  if(!inB&&t.t!=='water'&&!t.br){const hard=t.t==='road'||t.t==='plaza'||!!t.rail;if(kg>=(hard?4:1.5)){const r=wrkR(kg,.9)*(hard?.65:1);if(wrkCrater(x,z,r))nav=true;}}
  // 2) 나무
  if(kg>=.8)wrkFell(x,z,wrkR(kg,2.4)*(inB?.5:1),kg);
  // 3) 소품
  if(wrkProps(x,z,kg,inB))nav=true;
  if(nav){wrkNav();wrkReroute(x,z,wrkR(kg,2.4)+.3);}}
function wrkCrater(x,z,r){if(r<.04)return false;const C=G.craters;
  for(const c of C)if(Math.hypot(c.x-x,c.z-z)<c.r*.7){const was=c.r;c.r=Math.min(.75,Math.cbrt(c.r**3+r**3));if(FXH.crater)FXH.crater(c,true);return wrkCrK(was)!==wrkCrK(c.r);}
  if(C.length>=WRK.maxCr)return false;const c={x:Math.round(x*100)/100,z:Math.round(z*100)/100,r:Math.round(r*1000)/1000};C.push(c);wrkCG(true);if(FXH.crater)FXH.crater(c,false);return wrkCrK(r)!=null;}
const wrkCrK=r=>r>=.25?'crtB':r>=.12?'crt':null;
/* 구덩이를 칸별로 묶는다(참호 판정이 자주 불린다) */
function wrkCG(reset){let g=G._wcg;if(!reset&&g&&g.n===G.craters.length&&g.N===N)return g.m;const m=new Map();
  for(const c of G.craters){const R=c.r;for(let a=Math.floor(c.z-R);a<=Math.floor(c.z+R);a++)for(let b=Math.floor(c.x-R);b<=Math.floor(c.x+R);b++){const k=a*N+b;let L=m.get(k);if(!L)m.set(k,L=[]);L.push(c);}}
  Object.defineProperty(G,'_wcg',{value:{n:G.craters.length,N,m},writable:true,configurable:true,enumerable:false});return m;}
/* 이 점이 구덩이 안인가(보병 엄폐). 반지름 1.2 m 넘는 구덩이만 */
function craterAt(x,z){if(!G.craters||!G.craters.length)return null;const L=wrkCG().get(Math.floor(z)*N+Math.floor(x));if(!L)return null;
  for(const c of L)if(c.r>=.1&&Math.hypot(c.x-x,c.z-z)<=c.r*.85)return c;return null;}
{const _t=trenchAt;trenchAt=function(x,z){return _t(x,z)||!!craterAt(x,z);};}
/* ---------- 나무 ---------- */
function wrkFell(x,z,R,kg){if(R<.06)return;const k=kg>=5?1:.6;let hit=false;
  for(let a=Math.floor(z-R);a<=Math.floor(z+R);a++)for(let b=Math.floor(x-R);b<=Math.floor(x+R);b++){if(!inb(a,b))continue;const t=G.map[a][b];if(t.t!=='park')continue;
    let n=0;for(let i=0;i<4;i++)for(let j=0;j<4;j++)if(Math.hypot(b+(j+.5)/4-x,a+(i+.5)/4-z)<=R)n++;if(!n)continue;hit=true;
    const was=t.tl||0;t.tl=Math.min(1,Math.round((was+n/16*k)*100)/100);if(was<.6&&t.tl>=.6)bump();}
  if(!hit&&!(G.props||[]).some(p=>p.tr&&Math.hypot(p.x-x,p.z-z)<R))return;   // 나무가 없는 곳(도로 한가운데)은 적지 않는다
  const F=G.fellZ;for(const f of F)if(Math.hypot(f.x-x,f.z-z)<f.r*.4){if(R>f.r){f.r=Math.round(R*1000)/1000;G.wrkV=(G.wrkV||0)+1;}return;}
  if(F.length>=WRK.maxFell)return;F.push({x:Math.round(x*100)/100,z:Math.round(z*100)/100,r:Math.round(R*1000)/1000});G.wrkV=(G.wrkV||0)+1;}
/* ---------- 소품 ---------- */
/* 소품 하나에 딸린 엄폐(G.covers) 목록: 소품이 바뀌면 같이 고친다 */
function wrkCovOf(p){const W=G._wcov&&G._wcov.ref===G.covers?G._wcov.m:null;let m=W;
  if(!m){m=new WeakMap();Object.defineProperty(G,'_wcov',{value:{ref:G.covers,m},writable:true,configurable:true,enumerable:false});}
  let L=m.get(p);if(L)return L;const R=p.k==='hedge'||p.k==='bocage'?.36:p.k==='wagon'?.32:.02;const K={car:['car','wreck'],wagon:['car','wreck'],barrier:['barrier'],bin:['bin'],hedge:['hedge'],bocage:['bocage']}[p.k]||[];
  L=(G.covers||[]).filter(c=>K.includes(c.kind)&&!c.wrk&&Math.hypot(c.x-p.x,c.z-p.z)<=R);m.set(p,L);return L;}
function wrkPropSet(p,st){// st: 'burn' 불탄 차, 'flip' 뒤집힌 차, 'crush' 밟힌 차, 'dead' 쓰러진·날아간 소품
  if(st==='burn'||st==='flip'){if(p.burnt&&(st==='burn'||p.flip))return false;const L=wrkCovOf(p);p.burnt=true;if(st==='flip')p.flip=true;p.col='#2b2723';for(const c of L)c.kind='wreck';}
  else if(st==='crush'){if(p.crush)return false;const L=wrkCovOf(p);p.crush=1;for(const c of L){c.kind='rubble';c.cov=.12;c.h=.04;}}
  else{if(p.dead)return false;const L=wrkCovOf(p);p.dead=1;if(L.length)G.covers=G.covers.filter(c=>!L.includes(c));}
  G.propV=(G.propV||0)+1;if(FXH.propHit)FXH.propHit(p,st);return true;}
function wrkProps(x,z,kg,inB){const P=G.props;if(!P||!P.length)return false;const k=inB?.5:1;
  const rCar=wrkR(kg,1.5)*k,rL=wrkR(kg,2)*k,rBar=kg>=50?wrkR(kg,.7)*k:0,big=kg>=50;const R=Math.max(rCar,rL);if(R<.05)return false;let nav=false;
  for(const p of P){if(p.dead)continue;const dx=p.x-x,dz=p.z-z;if(Math.abs(dx)>R+.3||Math.abs(dz)>R+.3)continue;const d=Math.hypot(dx,dz);
    if(p.k==='car'){if(d<rCar*.5&&big&&!p.flip){if(wrkPropSet(p,'flip'))nav=true;}else if(d<rCar&&!p.burnt&&!p.crush)wrkPropSet(p,'burn');}
    else if(p.k==='wagon'){if(d<rCar*.8&&!p.burnt)wrkPropSet(p,'burn');}
    else if(p.k==='lamp'||p.k==='light'||p.k==='hedge'||p.k==='bocage'&&d<rL*.6){if(d<rL)wrkPropSet(p,'dead');}
    else if(p.k==='bin'){if(d<rL&&wrkPropSet(p,'dead'))nav=true;}
    else if(p.k==='barrier'){if(d<rBar&&wrkPropSet(p,'dead'))nav=true;}}
  return nav;}
/* ---------- 건물 ---------- */
/* 무너진 건물의 잔해가 옆 칸(길·마당)으로 쏟아진다. sz = 깊이(칸) */
function wrkSpill(r,c,dr,dc,sz){const a=r+dr,b=c+dc;if(!inb(a,b)||!wrkOpen(G.map[a][b]))return false;wrkInit();
  const D=G.debris;let d=D.find(o=>o.r===r&&o.c===c&&o.dr===dr&&o.dc===dc);
  if(d){if(sz<=d.d)return false;d.d=Math.min(.55,Math.round(Math.max(sz,d.d+.04)*1000)/1000);}else{if(D.length>=WRK.maxDeb)return false;d={r,c,dr,dc,d:Math.min(.55,Math.round(sz*1000)/1000),s:(r*131+c*17+dr*5+dc)%997};D.push(d);}
  wrkDebGeo(d);G.covers=(G.covers||[]).filter(o=>o.wrk!==d);
  const ax=dr?1:0,az=dr?0:1,n=3;for(let i=0;i<n;i++){const s=(i-1)*.27;G.covers.push({x:d.x+ax*s,z:d.z+az*s,r:.16,kind:'rubble',cov:d.d>=.3?.4:.3,h:Math.min(.2,.06+d.d*.3),wrk:d});}
  if(FXH.debris)FXH.debris(d);return true;}
/* 잔해 더미의 자리: 건물과 맞닿은 변을 따라 길게(0.84칸), 깊이 d만큼 옆 칸 안으로 */
function wrkDebGeo(d){const cx=d.c+.5+d.dc*(.5+d.d/2),cz=d.r+.5+d.dr*(.5+d.d/2);d.x=Math.round(cx*1000)/1000;d.z=Math.round(cz*1000)/1000;d.ry=d.dr?0:Math.PI/2;d.hl=.42;d.hw=d.d/2;}
const WRK_SIDES=[[-1,0],[1,0],[0,-1],[0,1]];
{const _d=damageBldg;damageBldg=function(r,c,amt){const x=inb(r,c)?G.map[r][c]:null;if(!x||x.t!=='bldg'||!(amt>0))return _d(r,c,amt);
  // 재질: 한 번에 건물을 통째로 무너뜨리는 폭파(amt ≥ 최대 내구)는 그대로 둔다
  if(amt<x.bmax){const m=WRK_MAT[x.ks]||(x.dist==='res'?1.2:1);amt=amt*m;}
  const f0=x.f,rf0=roofFl(x);_d(r,c,amt);
  if(x.t==='rubble'){wrkCollapse(r,c,f0);return;}
  const rf1=roofFl(x);if(x.t==='bldg'&&rf1<rf0)wrkFloorFall(r,c,rf0,rf1);};}
/* 위층이 무너진다: 그 층과 옥상에 있던 병사는 떨어져 다치고, 잔해 일부가 길로 쏟아진다 */
function wrkFloorFall(r,c,rf0,rf1){const x=G.map[r][c];const lost=rf0-rf1;
  for(const u of G.units.slice()){if(u.r!==r||u.c!==c||UT[u.type].fly||UT[u.type].cls!=='inf')continue;const fl=typeof curFl==='function'?curFl(u):0;if(fl<rf1)continue;
    const top=typeof topFl==='function'?topFl(x):rf1;u.fl=Math.max(0,Math.min(top,rf1-1));u.climb=0;u.onSt=0;u.supp=2;
    harm(u,Math.max(.5,u.hp*Math.min(.8,.2+.1*(fl-rf1+1)+Math.random()*.25)),null,{kind:'crush'});}
  const open=WRK_SIDES.filter(([p,q])=>inb(r+p,c+q)&&wrkOpen(G.map[r+p][c+q]));let nav=false;
  if(open.length){const [p,q]=open[Math.floor(Math.random()*open.length)];if(wrkSpill(r,c,p,q,.1+.05*lost))nav=true;}
  if(FXH.floorFall)FXH.floorFall(r,c,rf0,rf1);L(`${x.obj!=null?G.objs[x.obj].name+' ':''}건물 위층 붕괴`);
  if(nav){wrkNav();wrkReroute(c+.5,r+.5,1.3);}}
/* 통째로 무너졌다: 층수만큼 잔해가 사방 길로 쏟아지고, 3층 넘는 건물 자리는 잔해 언덕이 된다 */
function wrkCollapse(r,c,f0){const x=G.map[r][c];x.rf=f0||1;const sz=.12+.035*Math.min(10,f0||1);
  for(const [p,q] of WRK_SIDES)wrkSpill(r,c,p,q,sz*(.75+Math.random()*.5));
  if(x.rf>=3&&G.props)for(const p of G.props){if(p.dead||Math.abs(p.x-(c+.5))>1||Math.abs(p.z-(r+.5))>1)continue;   // 쏟아진 잔해에 깔린 소품
    const near=G.debris.some(d=>d.r===r&&d.c===c&&inBox(d,p.x,p.z,.02));if(!near)continue;if(p.k==='car')wrkPropSet(p,'crush');else if(p.k!=='barrier')wrkPropSet(p,'dead');}
  wrkNav();wrkReroute(c+.5,r+.5,1.8);}
/* ---------- 전차가 밟고 지나간다 ---------- */
/* 소품을 칸별로 묶어 둔다(차량이 움직일 때마다 지도 전체 소품을 훑지 않게). 소품 목록이 바뀌면 다시 묶는다. 원래 순서대로 돈다 */
const PROPIX={P:null,n:-1,b:null};
function propsNear(P,x,z,rad){if(PROPIX.P!==P||PROPIX.n!==P.length){const b=new Map();for(let i=0;i<P.length;i++){const p=P[i];const k=Math.floor(p.z)*4096+Math.floor(p.x);let a=b.get(k);if(!a)b.set(k,a=[]);a.push(i);}PROPIX.P=P;PROPIX.n=P.length;PROPIX.b=b;}
  const out=[];for(let r=Math.floor(z-rad);r<=Math.floor(z+rad);r++)for(let c=Math.floor(x-rad);c<=Math.floor(x+rad);c++){const a=PROPIX.b.get(r*4096+c);if(a)for(const i of a)out.push(i);}
  if(out.length>1)out.sort((a,b)=>a-b);return out;}
{const _c=fortCrush;fortCrush=function(u){_c(u);const cls=navCls(u);if(cls!=='trk'&&cls!=='veh')return;const P=G.props;let nav=false;
  if(P)for(const i of propsNear(P,u.x,u.z,.41)){const p=P[i];if(p.dead||Math.abs(p.x-u.x)>.4||Math.abs(p.z-u.z)>.4)continue;
    if(cls==='trk'&&p.k==='car'&&!p.crush&&inBox({x:p.x,z:p.z,ry:p.ry,hl:CAR_KIND_L[p.kind]/2,hw:CAR_KIND_W[p.kind]/2},u.x,u.z,.06)){if(wrkPropSet(p,'crush'))nav=true;}
    else if(cls==='trk'&&p.k==='bin'&&Math.hypot(p.x-u.x,p.z-u.z)<.13){if(wrkPropSet(p,'dead'))nav=true;}
    else if((p.k==='lamp'||p.k==='light')&&Math.hypot(p.x-u.x,p.z-u.z)<(cls==='trk'?.1:.07))wrkPropSet(p,'dead');
    else if(cls==='trk'&&(p.k==='hedge'||p.k==='bocage')&&inBox({x:p.x,z:p.z,ry:p.ry?Math.PI/2:0,hl:p.k==='hedge'?.5:.5,hw:.06},u.x,u.z,.05))wrkPropSet(p,'dead');}
  // 숲을 헤치고 가면 나무를 쓰러뜨린다
  if(cls==='trk'){const t=cell(u.r,u.c);if(t&&t.t==='park'&&!t.yard){const L=u._wfl;if(!L||Math.hypot(L[0]-u.x,L[1]-u.z)>.22){u._wfl=[u.x,u.z];wrkInit();
      t.tl=Math.min(1,Math.round(((t.tl||0)+.04)*100)/100);if(G.fellZ.length<WRK.maxFell)G.fellZ.push({x:Math.round(u.x*100)/100,z:Math.round(u.z*100)/100,r:.08,tk:1});G.wrkV=(G.wrkV||0)+1;}}}
  if(nav)wrkNav();};}
/* ---------- 이동 격자에 넣기 ---------- */
{const _o=navObstacles;navObstacles=function(){const P=G.props;let O;
  if(P&&P.some(p=>p.dead||p.crush)){G.props=P.filter(p=>!p.dead&&!p.crush);try{O=_o();}finally{G.props=P;}
    for(const p of P)if(p.crush&&!p.dead&&p.k==='car')O.push({k:'carX',x:p.x,z:p.z,ry:p.ry,hl:CAR_KIND_L[p.kind]/2,hw:CAR_KIND_W[p.kind]/2});}
  else O=_o();
  for(const c of G.craters||[]){const k=wrkCrK(c.r);if(k)O.push({k,x:c.x,z:c.z,ry:0,hl:c.r*.75,hw:c.r*.75});}
  for(const d of G.debris||[])O.push({k:d.d>=.3?'debB':'deb',x:d.x,z:d.z,ry:d.ry,hl:d.hl,hw:d.hw});
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=G.map[r][c];if(x.t==='rubble'&&x.rf>=3)O.push({k:x.rf>=6?'moundB':'mound',x:c+.5,z:r+.5,ry:0,hl:.4,hw:.4});}
  return O;};}
/* 바뀐 곳 둘레를 지나던 지상 부대는 다음 틱에 길을 다시 찾는다 */
function wrkReroute(x,z,R){(G._wrr||Object.defineProperty(G,'_wrr',{value:[],writable:true,configurable:true,enumerable:false})._wrr).push([x,z,R]);}
function wrkRerouteRun(){const Q=G._wrr;if(!Q||!Q.length)return;G._wrr=[];
  for(const u of G.units){if(UT[u.type].fly||!u.path||!u.path.length||!u.dest)continue;let near=false;let px=u.x,pz=u.z;
    for(const p of u.path){for(const [x,z,R] of Q){if(segDist(px,pz,p[0],p[1],x,z)<=R){near=true;break;}}if(near)break;px=p[0];pz=p[1];}
    if(!near)continue;const np=pathPts(u,u.dest[0],u.dest[1]);if(np&&np.length)u.path=np;}}
function segDist(x1,z1,x2,z2,px,pz){const dx=x2-x1,dz=z2-z1,L=dx*dx+dz*dz;let t=L?((px-x1)*dx+(pz-z1)*dz)/L:0;t=Math.max(0,Math.min(1,t));return Math.hypot(x1+dx*t-px,z1+dz*t-pz);}
{const _t=rtTick;rtTick=function(dt){_t(dt);if(G&&G._wrr&&G._wrr.length)wrkRerouteRun();};}
/* ---------- 폭발 소식 받기: 탄약마다 폭약량 ---------- */
const wrkShellKg=s=>s.type==='mortar'?(s.pw>1.2?2.5:.9):s.type==='spg'?(s.pw>=1.6?9:7):WRK_KG[s.type]||1.5;
{const _s=rtShoot;rtShoot=function(a,d){const t=UT[a.type],x=d.x,z=d.z;const v=_s(a,d);
  if(t.ex&&!t.ind&&!t.guided&&!t.salvo&&v>0&&WRK_KG[a.type])wrkBlast(x,z,WRK_KG[a.type]);return v;};}
{const _s=rtShootBldg;rtShootBldg=function(a,r,c){const v=_s(a,r,c);const kg=WRK_KG[a.type];if(kg)wrkBlast(c+.5,r+.5,kg);return v;};}
{const _s=shellBoom;shellBoom=function(s,x,z,h,r,c){const v=_s(s,x,z,h,r,c);wrkBlast(x,z,wrkShellKg(s),{});return v;};}
if(typeof bombHit==='function'){const _s=bombHit;bombHit=function(b){const v=_s(b);wrkBlast(b.x??b.c+.5,b.z??b.r+.5,90);return v;};}
if(typeof msBlast==='function'){const _s=msBlast;msBlast=function(x,z,R,base,n,bc,br){const v=_s.apply(this,arguments);wrkBlast(x,z,bc>=50?480:bc>=20?220:60,{out:1});return v;};}
if(typeof msHit==='function'){const _s=msHit;msHit=function(m,e,r,c){const v=_s(m,e,r,c);wrkBlast(e&&r==null?e.x:m.x,e&&r==null?e.z:m.z,4.5);return v;};}
if(typeof fpvBoom==='function'){const _s=fpvBoom;fpvBoom=function(u,e){const x=e.x,z=e.z;const v=_s(u,e);wrkBlast(x,z,.6);return v;};}
if(typeof demoBoom==='function'){const _s=demoBoom;demoBoom=function(d){const v=_s(d);wrkBlast(d.c+.5,d.r+.5,20);return v;};}
if(typeof vbBoom==='function'){const _s=vbBoom;vbBoom=function(u,k){const was=u._boom,x=u.x,z=u.z;const v=_s(u,k);if(!was)wrkBlast(x,z,250*(k||1),{out:1});return v;};}
{const _n=newGame;newGame=function(){const v=_n.apply(this,arguments);if(G){G.craters=[];G.fellZ=[];G.debris=[];G.wrkV=0;}return v;};}
