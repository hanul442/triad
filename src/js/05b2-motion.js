/* ===================== MOTION: 차량의 차체·포탑·속도 =====================
   지상 차량은 점처럼 미끄러지지 않고 실제 차처럼 움직인다.
   - 차체 방향(u.hd)과 포탑 방향(u.tf)이 따로 있다. u.face는 늘 차체 방향(장갑 방향 판정이 이것을 본다).
     포탑은 종류마다 정해진 속도로 돌고, 표적 쪽으로 다 돌아가야 쏜다. 차체가 돌아도 포탑은 표적을 계속 겨눈다(안정화).
   - 속도(u.vs)는 가속·감속한다. 궤도 차량은 제자리에서 돌 수 있고(방향이 크게 틀리면 멈춰 선회),
     바퀴 차량은 달리면서만 꺾인다(회전반경). 목표가 회전원 안쪽이면 후진하며 방향을 바꾼다.
   - 가까운 뒤쪽 목적지로는 돌아서지 않고 후진한다.
   - 차체는 사각형: 모서리·옆면이 건물·물 칸에 들어가는 움직임은 하지 않는다.
   1칸 ≈ 12m. 이 파일은 05b-realtime 바로 뒤에 읽혀서, 뒤 파일들(사상자·보급·연막 후진)은 이 움직임을 감싼다. */
const VEH={
  // 차체 반길이·반폭(칸), 포탑 선회(도/초), 사격 허용 오차(도), 궤도 여부
  tank:{hl:.33,hw:.15,trav:40,tol:5,trk:1},
  ifv:{hl:.29,hw:.135,trav:55,tol:8,trk:1},
  spg:{hl:.32,hw:.14,trav:20,tol:6,trk:1},
  hmv:{hl:.23,hw:.11,trav:90,tol:10},
  zu:{hl:.22,hw:.095,trav:60,tol:10},
  mlrs:{hl:.3,hw:.11,trav:25,tol:8},
  sup:{hl:.3,hw:.11,trav:0,tol:180},
  rec:{hl:.33,hw:.12,trav:30,tol:180},
};
const VM={look:.35,squeeze:.06,backT:1.2,pivot:32,trkTurn:45,whR:.55,whMax:50,shuffle:20,accT:1.6,accW:1.2,brake:2,revK:.45,revNear:1.6,aimHold:4};
const vSpec=u=>VEH[u.type]||{hl:.25,hw:.11,trav:45,tol:8};
const isGV=u=>{const t=UT[u.type];return !!t&&t.cls==='veh'&&!t.fly;};
const vDeg=(x,z)=>Math.atan2(z,x)*180/Math.PI;
const vDiff=(a,b)=>{let d=(a-b)%360;if(d>180)d-=360;if(d<-180)d+=360;return d;};
const vTurn=(cur,want,max)=>{const d=vDiff(want,cur);return Math.abs(d)<=max?want:cur+Math.sign(d)*max;};
/* 처음 보는 차량: 지금 바라보는 쪽을 차체·포탑 방향으로 */
function vInit(u){if(u.hd==null){u.hd=u.face||0;u.tf=u.hd;u.vs=0;vFit(u);}}
/* 처음 놓인 자리에서 차체가 건물에 걸치면, 가장 가까운 방향·자리로 바로잡는다(증원 배치·하차 지점) */
function vFit(u){if(!hullPen(u,u.x,u.z,u.hd))return;let best=null,bs=1e9;
  for(const r of [0,.12,.25,.4])for(let k=0;k<(r?8:1);k++){const x=u.x+Math.cos(k*Math.PI/4)*r,z=u.z+Math.sin(k*Math.PI/4)*r;if(!walkable(u,x,z))continue;
    for(let j=0;j<12;j++){const h=u.hd+(j%2?1:-1)*Math.ceil(j/2)*30;const p=hullPen(u,x,z,h);const sc=p*10+r*4+Math.abs(vDiff(h,u.hd))/180;if(sc<bs){bs=sc;best=[x,z,h];}}}
  if(best){[u.x,u.z,u.hd]=best;u.face=u.tf=u.hd;}}
/* 막는 물체(주차 차·방벽·잔해·방어물)를 칸별로 묶어 둔다. 이동 격자(04d-fort)가 새로 만들어질 때마다 다시 묶는다 */
const VOB={src:null,b:null};
function vObsAt(cls,x,z){if(typeof navGrid!=='function')return null;navGrid(cls);if(VOB.src!==NAV.obs){VOB.src=NAV.obs;VOB.b=new Map();
    for(const o of NAV.obs||[]){const R=Math.max(o.hl,o.hw);for(let r=Math.floor(o.z-R);r<=Math.floor(o.z+R);r++)for(let c=Math.floor(o.x-R);c<=Math.floor(o.x+R);c++){const k=r*1000+c;if(!VOB.b.has(k))VOB.b.set(k,[]);VOB.b.get(k).push(o);}}}
  return VOB.b.get(Math.floor(z)*1000+Math.floor(x));}
/* 점 하나가 차를 막는가: 건물·물 칸, 또는 이 차가 못 넘는 물체 안 */
function vBlocked(u,cls,px,pz){const t=tileAt(px,pz);if(!t||mcost(u.type,t)===Infinity)return true;
  const L=vObsAt(cls,px,pz);if(L)for(const o of L){const rl=NAV_RULE[o.k];if(rl&&rl[cls]===2&&inBox(o,px,pz,0))return true;}return false;}
/* 차체 판정: 차체 사각형과 건물·물 칸(정사각형)이 겹친 깊이의 합(분리축 판정, 칸마다 가장 얕게 빠져나올 거리).
   중심은 막는 물체(주차 차·방벽 등) 모양 안이면 1을 더한다. 0이면 깨끗하다 */
function hullPen(u,x,z,h){const s=vSpec(u),a=h*Math.PI/180,c=Math.cos(a),n=Math.sin(a),cls=typeof navCls==='function'?navCls(u):null;
  const ex=Math.abs(c)*s.hl+Math.abs(n)*s.hw,ez=Math.abs(n)*s.hl+Math.abs(c)*s.hw;let k=0;   // 차체를 감싸는 축 정렬 상자 반폭
  for(let r=Math.floor(z-ez);r<=Math.floor(z+ez);r++)for(let q=Math.floor(x-ex);q<=Math.floor(x+ex);q++){
    const t=inb(r,q)?G.map[r][q]:null;if(t&&mcost(u.type,t)<Infinity)continue;
    const cx=q+.5,cz=r+.5,dx=cx-x,dz=cz-z;
    // 축 1·2: 지도 축(칸의 변), 축 3·4: 차체 축
    let d=Math.min(ex+.5-Math.abs(dx),ez+.5-Math.abs(dz));
    const pl=Math.abs(dx*c+dz*n),pw=Math.abs(-dx*n+dz*c),tr=.5*(Math.abs(c)+Math.abs(n));
    d=Math.min(d,s.hl+tr-pl,s.hw+tr-pw);if(d>0)k+=d;}
  if(cls){if(vBlocked(u,cls,x,z))k+=1;k+=vObsPen(u,cls,x,z,c,n,s,ex,ez);}
  return k;}
/* 차체 사각형과 막는 물체(주차 차·컨테이너·방벽·생울타리…) 사각형이 겹친 깊이의 합(분리축 판정).
   중심점만 보면 차 앞뒤가 주차 차·컨테이너를 뚫고 지나가서, 차체 전체로 본다. 깔고 지나가는 것(규칙 1)은 빼고 */
let VOBS=1;
function vObsEach(cls,x,z,c,n,s,ex,ez,fn){if(typeof navGrid!=='function')return;vObsAt(cls,x,z);if(!VOB.b)return;const stamp=++VOBS;
  for(let r=Math.floor(z-ez);r<=Math.floor(z+ez);r++)for(let q=Math.floor(x-ex);q<=Math.floor(x+ex);q++){const L=VOB.b.get(r*1000+q);if(!L)continue;
    for(const o of L){if(o._vs===stamp)continue;o._vs=stamp;
      const oc=Math.cos(o.ry),on=Math.sin(o.ry);   // inBox: 물체 길이축 = (cos ry, -sin ry)
      const dx=o.x-x,dz=o.z-z;
      // 축 4개: 차체 길이·폭, 물체 길이·폭. 각 축에서 (두 반투영 합 − 중심 거리)의 최솟값이 겹친 깊이
      let d=1e9;for(const [vx,vz] of [[c,n],[-n,c],[oc,-on],[on,oc]]){const ru=s.hl*Math.abs(c*vx+n*vz)+s.hw*Math.abs(-n*vx+c*vz);const ro=o.hl*Math.abs(oc*vx-on*vz)+o.hw*Math.abs(on*vx+oc*vz);
        const o2=ru+ro-Math.abs(dx*vx+dz*vz);if(o2<d)d=o2;if(d<=0)break;}
      if(d>0)fn(o,d);}}}
function vObsPen(u,cls,x,z,c,n,s,ex,ez){let k=0;vObsEach(cls,x,z,c,n,s,ex,ez,(o,d)=>{const rl=NAV_RULE[o.k];if(rl&&rl[cls]===2)k+=d;});return k;}
/* 차체와 다른 지상 차량 차체가 겹친 깊이의 합 */
function vVehPen(u,x,z,h){const s=vSpec(u),a=h*Math.PI/180,c=Math.cos(a),n=Math.sin(a);let k=0;
  for(const o of G.units){if(o===u||!isGV(o)||o.hd==null||Math.abs(o.x-x)>.8||Math.abs(o.z-z)>.8||o.towBy===u.id||u.towBy===o.id||o.towBy!=null)continue;
    const so=vSpec(o),b=o.hd*Math.PI/180,oc=Math.cos(b),on=Math.sin(b),dx=o.x-x,dz=o.z-z;let d=1e9;
    for(const [vx,vz] of [[c,n],[-n,c],[oc,on],[-on,oc]]){const r1=s.hl*Math.abs(c*vx+n*vz)+s.hw*Math.abs(-n*vx+c*vz),r2=so.hl*Math.abs(oc*vx+on*vz)+so.hw*Math.abs(-on*vx+oc*vz);
      const q=r1+r2-Math.abs(dx*vx+dz*vz);if(q<d)d=q;if(d<=0)break;}
    if(d>0)k+=d;}
  return k;}
/* 전차·자주포는 주차된 차를 깔아뭉갠다: 차체가 차에 3cm 넘게 걸치면 밟힌 차가 된다(05o-wreck은 차체 중심만 봐서, 차체 앞이 먼저 닿는 것까지 본다) */
function vCrush(u){const cls=typeof navCls==='function'?navCls(u):null;if(cls!=='trk')return;const s=vSpec(u),a=u.hd*Math.PI/180,c=Math.cos(a),n=Math.sin(a);
  const ex=Math.abs(c)*s.hl+Math.abs(n)*s.hw,ez=Math.abs(n)*s.hl+Math.abs(c)*s.hw;let hit=null;
  vObsEach(cls,u.x,u.z,c,n,s,ex,ez,(o,d)=>{if(o.k==='car'&&o.p&&!o.p.crush&&d>.03)(hit||(hit=[])).push(o.p);});
  if(hit)for(const p of hit)propCrush(p,u);}
/* 끝까지 막힌 차량(주차 차 사이에 끼임): 차체에 닿은(6cm 안) 주차 차를 밀어붙여 깔고 나간다. 깔았으면 true */
function vRam(u){const cls=typeof navCls==='function'?navCls(u):null;if(!cls)return false;const s0=vSpec(u),s={hl:s0.hl+.06,hw:s0.hw+.06},a=u.hd*Math.PI/180,c=Math.cos(a),n=Math.sin(a);
  const ex=Math.abs(c)*s.hl+Math.abs(n)*s.hw,ez=Math.abs(n)*s.hl+Math.abs(c)*s.hw;const hit=[];
  vObsEach(cls,u.x,u.z,c,n,s,ex,ez,(o,d)=>{if(o.k==='car'&&o.p&&!o.p.crush)hit.push(o.p);});
  for(const p of hit)propCrush(p,u);return hit.length>0;}
/* 주차 차를 깔았다: 05o-wreck의 '밟힌 차'(엄폐 낮아짐·3D 납작·이동 격자 carX)로 바꾼다 */
function propCrush(p,u){if(p.crush)return;if(typeof wrkPropSet==='function'){if(wrkPropSet(p,'crush'))G.navV=(G.navV||0)+1;}else{p.crush=1;G.navV=(G.navV||0)+1;}}
/* 차체를 (x,z,h)로 옮겨도 되나: 중심은 이동 격자로, 차체는 지금보다 더 파고들지 않을 때만 */
function hullOk(u,x,z,h,p0){if(!tileAt(x,z))return false;const p=hullPen(u,x,z,h);if(p<=p0+1e-6)return true;
  if(u._gh>(G.time||0))return p<=VM.squeeze;   // 비비고 빠져나오는 중: 걸침 합이 squeeze칸(약 70cm)까지는 움직인다(벽·차를 통째로 뚫지는 않는다)
  return (u._blk||0)>1.5&&p<=.03;}   // 막히면 0.03칸(약 36cm)까지 스치는 건 허용
/* 차체가 벽에 조금 걸쳐 있으면 걸침이 줄어드는 쪽으로 조금씩 밀어낸다 */
function vSettle(u){if(u._gh>(G.time||0))return;const p=hullPen(u,u.x,u.z,u.hd);if(!p)return;let best=null,bp=p;
  for(let k=0;k<8;k++){const a=k*Math.PI/4,x=u.x+Math.cos(a)*.03,z=u.z+Math.sin(a)*.03;const t=tileAt(x,z);if(!t||mcost(u.type,t)===Infinity||wallCross(u,u.x,u.z,x,z))continue;const q=hullPen(u,x,z,u.hd);if(q<bp){bp=q;best=[x,z];}}
  if(best){u.x=best[0];u.z=best[1];}}
/* 길이 끝내 막혀 멈춤: 사람이 지휘하는 부대면 알려 준다(같은 부대는 20초에 한 번) */
function vGiveUp(u){u.path=[];u.vs=0;u._stuckN=(u._stuckN||0)+1;G.stuckN=(G.stuckN||0)+1;const t=G.time||0;
  if(G.nats[u.nat]&&!isAI(u.nat)&&t-(u._stuckT??-99)>20){u._stuckT=t;try{L(`${UT[u.type].n} 길이 막혀 멈춤 — 다른 길로 다시 명령하세요`);}catch(e){}}}
/* 지상 차량 한 틱 이동 */
function vehMove(u,dt){vInit(u);const s=vSpec(u),now=G.time||0;
  const t0=tileAt(u.x,u.z);const vmax=UT[u.type].mv*SPD_K/(t0?mcost(u.type,t0):1)*(u.supp>0?.65:1);
  const acc=vmax/(s.trk?VM.accT:VM.accW),brk=VM.brake;
  const p0=hullPen(u,u.x,u.z,u.hd);
  if(!u.path||!u.path.length){// 멈춤: 남은 속도만큼 미끄러지며 선다
    if(Math.abs(u.vs)>.01){const v=u.vs-Math.sign(u.vs)*Math.min(Math.abs(u.vs),brk*dt);const a=u.hd*Math.PI/180,st=(u.vs+v)/2*dt;const nx=u.x+Math.cos(a)*st,nz=u.z+Math.sin(a)*st;
      u.vs=v;if(walkable(u,nx,nz)&&!wallCross(u,u.x,u.z,nx,nz)&&hullOk(u,nx,nz,u.hd,p0)){u.x=nx;u.z=nz;rtCell(u);}else u.vs=0;}else u.vs=0;
    u._acc=0;u.face=u.hd;return;}
  const [tx,tz]=u.path[0];const dx=tx-u.x,dz=tz-u.z,d=Math.hypot(dx,dz);const fin=u.path.length===1;
  if(d<.06){if(fin&&hullOk(u,tx,tz,u.hd,hullPen(u,u.x,u.z,u.hd))){u.x=tx;u.z=tz;rtCell(u);}u.path.shift();if(!u.path.length&&Math.abs(u.vs)<.3)u.vs=0;u.face=u.hd;return;}
  // 목적지에 다른 차가 서 있으면(정비·견인할 차 등) 그 차 바로 앞에서 선다
  if(fin&&d<.95&&G.units.some(o=>o!==u&&isGV(o)&&Math.hypot(o.x-tx,o.z-tz)<.75)){u.path=[];u.face=u.hd;return;}
  // 경로 선을 따라간다: 경유점으로 곧장 꺾지 않고, 지난 경유점→다음 경유점 선 위 조금 앞(약 4m)을 겨눈다.
  // 길찾기는 이 선이 차폭만큼 비어 있는지 보고 낸 길이라, 선에서 벗어나 모서리를 질러가면 주차 차·벽에 걸린다
  const P=u.path;if(u._pRef!==P){u._pRef=P;u._pPrev=[u.x,u.z];u._pT=P[0];}else if(u._pT!==P[0]){u._pPrev=u._pT||[u.x,u.z];u._pT=P[0];}
  let ax=tx,az=tz;{const [x0,z0]=u._pPrev,sx=tx-x0,sz=tz-z0,sl=Math.hypot(sx,sz);
    if(sl>.25){const t=Math.max(0,Math.min(1,((u.x-x0)*sx+(u.z-z0)*sz)/(sl*sl)));const px=x0+sx*t,pz=z0+sz*t;
      if(Math.hypot(px-u.x,pz-u.z)>.02&&Math.hypot(px-u.x,pz-u.z)<.6){const tt=Math.min(1,t+VM.look/sl);ax=x0+sx*tt;az=z0+sz*tt;}}}
  const want=Math.hypot(ax-u.x,az-u.z)>.02?vDeg(ax-u.x,az-u.z):vDeg(dx,dz);let rel=vDiff(want,u.hd);
  // 후진: 연막 후 빠질 때, 또는 가까운 뒤쪽 목적지
  let rev=0,head=want;
  if(u.rev&&u.rev>now){rev=1;head=u.revF??u.hd;}
  else if(fin&&d<(s.trk?VM.revNear:2.5)&&Math.abs(rel)>(s.trk?115:100)){rev=1;head=want+180;}
  // 바퀴 차량: 목적지가 회전원 안쪽이면 꺾으면서 뒤로 뺀다(세 번에 돌기)
  let shuffle=0;if(!s.trk&&!rev&&Math.abs(rel)>50&&d<2*VM.whR*Math.abs(Math.sin(rel*Math.PI/180))+.05)shuffle=1;
  const e=vDiff(head,u.hd);
  // 선회 속도
  let rate;if(s.trk)rate=Math.abs(u.vs)<.1?VM.pivot:VM.trkTurn;
  else rate=Math.min(VM.whMax,Math.abs(u.vs)/VM.whR*180/Math.PI+(Math.abs(u.vs)<.08?VM.shuffle:0));
  if(shuffle)rate=Math.max(rate,VM.whMax*.6);
  const h1=vTurn(u.hd,shuffle?want:head,rate*dt);
  // 목표 속도
  let vt;const ae=Math.abs(vDiff(rev?head:want,h1));
  if(shuffle)vt=-vmax*.35;
  else if(rev)vt=-vmax*VM.revK*(ae>40?.3:1);
  else if(s.trk)vt=ae>65?0:vmax*Math.max(.25,Math.cos(ae*Math.PI/180));
  else vt=vmax*Math.max(.3,Math.cos(Math.min(ae,80)*Math.PI/180));
  if(fin)vt=Math.sign(vt)*Math.min(Math.abs(vt),Math.sqrt(2*brk*Math.max(0,d-Math.abs(u.vs)*dt))+.04);   // 다음 틱 이동만큼 앞당겨 줄인다
  else if(u.path.length>1){// 다음 꺾임이 크면 미리 줄인다
    const [x2,z2]=u.path[1];const turn=Math.abs(vDiff(vDeg(x2-tx,z2-tz),want));if(turn>45){const lim=vmax*.5+Math.sqrt(2*brk*Math.max(0,d-.15));vt=Math.sign(vt)*Math.min(Math.abs(vt),lim);}}
  const dv=vt-u.vs,lim=(Math.sign(dv)===Math.sign(u.vs)||!u.vs?acc:brk)*dt;const v1=u.vs+Math.max(-lim,Math.min(lim,dv));
  u._acc=(v1-u.vs)/dt;
  // 새 자리
  const a=h1*Math.PI/180,st=(u.vs+v1)/2*dt;let nx=u.x+Math.cos(a)*st,nz=u.z+Math.sin(a)*st;
  // 목표점에 거의 다 왔으면 그 점에 붙인다(빙빙 돌지 않게)
  if(Math.abs(st)>=d*.98&&Math.abs(vDiff(want,st>=0?h1:h1+180))<25){nx=tx;nz=tz;}
  const arrive=fin&&nx===tx&&nz===tz;
  const esc=!walkable(u,u.x,u.z)&&!!tileAt(nx,nz)&&mcost(u.type,tileAt(nx,nz))<Infinity;
  const pass=(x,z)=>{const t=tileAt(x,z);return !!t&&mcost(u.type,t)<Infinity;};
  // 다른 차량: 앞에 선 차에 차체를 들이밀지 않고 잠깐 기다린다. 오래(1.5~3초, 차마다 다르게) 막히면 2초 동안 비켜 지나간다(서로 기다리다 멈추지 않게)
  if(Math.abs(st)>1e-4&&!(u._ygh>now)){const v1p=vVehPen(u,nx,nz,h1);if(v1p>.01&&v1p>vVehPen(u,u.x,u.z,u.hd)+1e-4){u._yw=(u._yw||0)+dt;
      if(u._yw>1.5+(u.id%5)*.35){u._ygh=now+2;u._yw=0;}else{u.vs=0;u._acc=0;u.face=u.hd;return;}}else if(u._yw)u._yw=Math.max(0,u._yw-dt);}
  const okPos=(esc||pass(nx,nz))&&!wallCross(u,u.x,u.z,nx,nz);
  const free=(x,z)=>(esc||pass(x,z))&&!wallCross(u,u.x,u.z,x,z);
  let done=0;
  if(okPos&&hullOk(u,nx,nz,h1,p0)){// 나아감 = 경유점에 가까워졌거나, 가야 할 쪽으로 돌았음
    done=Math.hypot(tx-nx,tz-nz)<d-.001||Math.abs(vDiff(head,h1))<Math.abs(vDiff(head,u.hd))-.01;u.x=nx;u.z=nz;u.hd=h1;u.vs=arrive?0:v1;}
  else{// 벽에 걸림: 방향만 틀기 → 조금 앞/뒤로 빼면서 틀기 → 한쪽으로 계속 조금씩 빼기(돌 자리 만들기)
    const a0=u.hd*Math.PI/180,c0=Math.cos(a0),s0=Math.sin(a0),q=Math.max(.04,vmax*.3)*dt;const nd=u._nd||(Math.cos((want-u.hd)*Math.PI/180)>=0?1:-1);
    const turned=Math.abs(vDiff(h1,u.hd))>.01;
    const tries=[[u.x,u.z,h1,0,1],[u.x+c0*q*nd,u.z+s0*q*nd,h1,nd,1],[u.x-c0*q*nd,u.z-s0*q*nd,h1,-nd,1],[u.x+c0*q*nd,u.z+s0*q*nd,u.hd,nd,0],[u.x-c0*q*nd,u.z-s0*q*nd,u.hd,-nd,0]];
    const needTurn=Math.abs(vDiff(shuffle?want:head,u.hd))>2;   // 방향이 맞는데 앞이 막혔으면 들썩이지 말고 서서 길을 다시 찾는다
    let hit=null;for(const tr of tries){const [x,z,h,sg,tn]=tr;if(tn&&!turned)continue;if(!tn&&!needTurn)continue;if((sg===0||free(x,z))&&hullOk(u,x,z,h,p0)){hit=tr;break;}}
    if(hit){const [x,z,h,sg]=hit;u.x=x;u.z=z;u.hd=h;u.vs=0;if(sg)u._nd=sg;}else{u.vs=0;u._nd=-(u._nd||1);}}
  // 막힘 시간: 막히면 쌓이고, 나아가면 천천히 준다(앞뒤로 들썩이며 제자리인 것도 막힘으로 센다)
  if(done){u._blk=Math.max(0,(u._blk||0)-dt*.5);if(!u._blk&&Math.abs(st)>.002&&okPos)u._nd=0;}else u._blk=(u._blk||0)+dt;
  u.face=u.hd;
  if(fin&&!done&&d<.35){u.path=[];u.vs=0;u._blk=0;u._rb=0;u.face=u.hd;rtCell(u);return;}   // 목적지 바로 앞에서 막히면 거기 선다
  // 오래 막히면: 길을 다시 찾고(0.6초·2초) → 3초가 넘으면 뒤로 빼서 돌 자리를 만든 뒤 다시 찾고(두 번)
  // → 그래도 막히면 조금 걸친 채 비비고 빠져나오고(두 번) → 끝내 안 되면 멈추고 알린다
  if(u._blk>.6&&!u._rb||u._blk>2&&u._rb===1){u._rb=(u._rb||0)+1;const end=u.path[u.path.length-1];u.path=pathPts(u,end[0],end[1]);if(!u.path.length){if(Math.hypot(end[0]-u.x,end[1]-u.z)>1)vGiveUp(u);rtCell(u);return;}}
  if(u._blk>3){u._blk=0;u._rb=0;u._ghN=(u._ghN||0)+1;if(u._ghN===1||!u._ghP)u._ghP=[u.x,u.z];
    if(u._ghN<=2){u.rev=now+VM.backT;u.revF=u.hd;u._rpAt=now+VM.backT+.05;}
    else if(u._ghN<=4){u._gh=now+2.5;if(vRam(u)){const end=u.path[u.path.length-1];if(end)u.path=pathPts(u,end[0],end[1]);}}
    else{u.path=[];u._ghN=0;u._ghP=null;vGiveUp(u);rtCell(u);return;}}
  if(u._rpAt&&now>=u._rpAt){u._rpAt=0;const end=u.path[u.path.length-1];if(end){u.path=pathPts(u,end[0],end[1]);if(!u.path.length){if(Math.hypot(end[0]-u.x,end[1]-u.z)>1)vGiveUp(u);rtCell(u);return;}}}
  if(u._ghN&&u._ghP&&Math.hypot(u.x-u._ghP[0],u.z-u._ghP[1])>.8){u._ghN=0;u._ghP=null;}   // 막힌 곳을 벗어났다
  if(!u._blk)u._rb=0;
  u._rp=0;
  // 지나간 경유점은 넘긴다
  {const nd=Math.hypot(tx-u.x,tz-u.z);if(fin&&nd<.06&&hullOk(u,tx,tz,u.hd,hullPen(u,u.x,u.z,u.hd))){u.x=tx;u.z=tz;u.vs=0;}
   if(nd<.06||(!fin&&nd<Math.max(.22,Math.abs(u.vs)*.5)))u.path.shift();
    else if(!fin&&nd<.4&&Math.abs(vDiff(vDeg(tx-u.x,tz-u.z),u.hd))>100&&!rev)u.path.shift();}
  {const g=u._pg;if(!g||Math.hypot(g[0]-u.x,g[1]-u.z)>.08)u._pg=[u.x,u.z,now];else if(now-g[2]>4){u._pg=[u.x,u.z,now];const e2=u.path[u.path.length-1];
    if(!e2||Math.hypot(e2[0]-u.x,e2[1]-u.z)<.9)u.path=[];
    else if(u._pgR&&Math.hypot(u._pgR[0]-e2[0],u._pgR[1]-e2[1])<.5&&Math.hypot(u._pgR[2]-u.x,u._pgR[3]-u.z)<.5){u._pgR=null;u._blk=Math.max(u._blk||0,3.01);}   // 같은 곳에서 또: 제자리에서 꿈틀대기만 한다 → 뒤로 빼기 단계로
    else{u._pgR=[e2[0],e2[1],u.x,u.z];u.path=pathPts(u,e2[0],e2[1]);}}}
  vSettle(u);vCrush(u);
  u.moved=true;if(typeof fortCrush==='function')fortCrush(u);rtCell(u);if(!G.units.includes(u))return;
  if(u.tgt!=null){const t2=G.units.find(z=>z.id===u.tgt);if(t2&&canHit(u,t2))u.path=[];}
  if(u.tgtTile!=null&&canHitTile(u,kr(u.tgtTile),kc(u.tgtTile)))u.path=[];}
{const _mv=rtMove;rtMove=function(u,dt){if(isGV(u))return vehMove(u,dt);return _mv(u,dt);};}
/* 무엇을 겨누나: 자동 표적 → 명령받은 건물 → 건물 안 적(벽 뚫기) */
function vAimPt(u){let tg=null;
  // 겨누던 표적이 아직 쏠 수 있으면 그대로(포탑이 표적 사이를 오가며 못 쏘는 일을 막는다)
  if(u._tg!=null){const e=G.units.find(z=>z.id===u._tg);const R=UT[u.type].rng[1]+.6;if(e&&e.nat!==u.nat&&Math.hypot(e.x-u.x,e.z-u.z)<=R&&(!G.fog||seen(e,u.nat))&&canHit(u,e))tg=e;}
  if(!tg)tg=rtPick(u);u._tg=tg?tg.id:null;if(tg)return [tg.x,tg.z];
  if(u.tgtTile!=null){const r=kr(u.tgtTile),c=kc(u.tgtTile);if(G.map[r][c].t==='bldg'&&canHitTile(u,r,c))return [c+.5,r+.5];}
  if(typeof breachPick==='function'){const P=breachPick(u,null);if(P)return [P.x,P.z];}
  return null;}
/* 사격: 포탑이 표적 쪽으로 다 돌아야 쏜다. 쏜 뒤에도 차체 방향(u.face)은 그대로 */
{const _f=rtFight;rtFight=function(u){if(!isGV(u))return _f(u);vInit(u);const t=UT[u.type];
  if(t.rng[1]&&u.cd<=0&&!u.climb&&!(t.ind&&u.path&&u.path.length)){const P=vAimPt(u);
    if(P){const w=vDeg(P[0]-u.x,P[1]-u.z);u._aim=w;u._aimT=G.time||0;if(Math.abs(vDiff(w,u.tf))>vSpec(u).tol)return;}}
  // 원래 사격 함수가 포탑이 겨눈 표적을 고르도록 잠깐 그 표적을 지정해 둔다
  const f0=u.face,tg0=u.tgt,tmp=tg0==null&&u._tg!=null;if(tmp)u.tgt=u._tg;
  _f(u);if(tmp&&u.tgt===u._tg)u.tgt=tg0;
  if(u.face!==f0){u.tf=u.face;u._aim=u.face;u._aimT=G.time||0;}u.face=u.hd;};}
/* 포탑 선회: 겨눌 곳이 있으면 그쪽으로, 한동안 없으면 차체 앞으로 돌아온다 */
function vTurret(u,dt){const s=vSpec(u);if(!s.trav){u.tf=u.hd;return;}const now=G.time||0;
  const want=u._aim!=null&&now-(u._aimT||-99)<VM.aimHold?u._aim:u.hd;u.tf=vTurn(u.tf,want,s.trav*dt);}
{const _t=rtTick;rtTick=function(dt){_t(dt);if(!G||!G.units)return;
  for(const u of G.units){if(!isGV(u))continue;vInit(u);
    if(u.towBy!=null){u.hd=vTurn(u.hd,u.face||0,40*dt);u.face=u.hd;u.vs=0;}         // 끌려가는 차는 구난차 쪽으로 천천히 돈다
    else if(u.face!==u.hd)u.face=u.hd;   // 다른 규칙이 방향을 바로 바꿔도 차체는 천천히 돈다
    if(!(u.path&&u.path.length)&&u.towBy==null&&!(u.vd&&u.vd.mob))vSettle(u);
    vTurret(u,dt);}};}
/* 겹친 부대 밀어내기가 차체를 벽 속으로 밀지 않게 */
{const _sep=rtSeparate;rtSeparate=function(dt){const keep=[];for(const u of G.units)if(isGV(u)){vInit(u);keep.push([u,u.x,u.z,hullPen(u,u.x,u.z,u.hd)]);}
  _sep(dt);for(const [u,x,z,p] of keep)if((u.x!==x||u.z!==z)&&hullPen(u,u.x,u.z,u.hd)>p){u.x=x;u.z=z;rtCell(u);}};}
/* ---------- 갇힌 자리에 차량을 내리지 않는다 ----------
   차량 이동 격자에서 이어진 구역(덩어리)을 나눠 두고, 작은 덩어리(주차장 차 사이 틈 등, 약 16칸 넓이 미만)에는 증원 차량을 내리지 않는다.
   이미 그런 칸을 골랐으면 같은 칸 안에서 큰 덩어리 쪽 자리로 옮겨 내린다. */
const vClsOf=type=>{const t=UT[type];if(!t||t.cls!=='veh'||t.fly)return null;return type==='tank'||type==='spg'?'trk':'veh';};
function navComp(cls){const g=navGrid(cls);if(g.comp)return g.comp;const W=g.W,C=g.cost,lab=new Int32Array(W*W).fill(-1),size=[];const st=[];
  for(let k0=0;k0<W*W;k0++){if(!C[k0]||lab[k0]>=0)continue;const id=size.length;let n=0;lab[k0]=id;st.push(k0);
    while(st.length){const k=st.pop();n++;const i=(k/W)|0,j=k-i*W;
      for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){const ni=i+a,nj=j+b;if(ni<0||nj<0||ni>=W||nj>=W)continue;const q=ni*W+nj;if(C[q]&&lab[q]<0){lab[q]=id;st.push(q);}}}
    size.push(n);}
  let big=0;for(const n of size)big=Math.max(big,n);return g.comp={lab,size,big,W};}
const VCOMP_MIN=400;   // 작은 칸 400개 ≈ 16칸 넓이
function navRoomy(cls,x,z){const K=navComp(cls);const j=Math.floor(x*NAV_R),i=Math.floor(z*NAV_R);if(i<0||j<0||i>=K.W||j>=K.W)return false;const l=K.lab[i*K.W+j];
  return l>=0&&(K.size[l]>=VCOMP_MIN||K.size[l]===K.big);}
/* 이 칸 안에서 넓은 덩어리에 속한 가장 가운데 가까운 자리 */
function navRoomySpot(cls,r,c){let best=null,bd=1e9;for(let a=0;a<NAV_R;a++)for(let b=0;b<NAV_R;b++){const x=c+(b+.5)/NAV_R,z=r+(a+.5)/NAV_R;if(!navRoomy(cls,x,z))continue;const d=Math.hypot(x-c-.5,z-r-.5);if(d<bd){bd=d;best=[x,z];}}return best;}
if(typeof deploySpots==='function'){const _ds=deploySpots;deploySpots=function(n,type){const out=_ds.apply(this,arguments);const cls=vClsOf(type);if(!cls||typeof navGrid!=='function'||!out.length||!G.props)return out;
  const ok=out.filter(k=>navRoomySpot(cls,kr(k),kc(k)));return ok.length?ok:out;};}
function vRoomyFix(u){const cls=vClsOf(u.type);if(!cls||typeof navGrid!=='function'||!G.map||!G.props||navRoomy(cls,u.x,u.z))return;const p=navRoomySpot(cls,Math.floor(u.z),Math.floor(u.x));if(p){u.x=p[0];u.z=p[1];}}
{const _mk=mkUnit;mkUnit=function(n,type,r,c){const u=_mk.apply(this,arguments);if(u)vRoomyFix(u);return u;};}
// 새 판 처음 부대는 소품(주차 차)이 깔리기 전에 놓이므로, 다 깔린 뒤에 바로잡는다
{const _ng=newGame;newGame=function(cfg){const r=_ng.apply(this,arguments);try{if(G&&G.units&&!(cfg&&(cfg.scn||cfg.force)))for(const u of G.units)vRoomyFix(u);}catch(e){}return r;};}
