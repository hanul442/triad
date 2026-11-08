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
const VM={pivot:32,trkTurn:45,whR:.55,whMax:50,shuffle:20,accT:1.6,accW:1.2,brake:2,revK:.45,revNear:1.6,aimHold:4};
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
  if(cls&&vBlocked(u,cls,x,z))k+=1;
  return k;}
/* 차체를 (x,z,h)로 옮겨도 되나: 중심은 이동 격자로, 차체는 지금보다 더 파고들지 않을 때만 */
function hullOk(u,x,z,h,p0){if(!tileAt(x,z))return false;if(u._gh>(G.time||0))return true;const p=hullPen(u,x,z,h);return p<=p0+1e-6||((u._blk||0)>1.5&&p<=.03);}   // 막히면 0.03칸(약 36cm)까지 스치는 건 허용, 아주 오래 막히면 잠깐 점처럼(u._gh) 빠져나온다
/* 차체가 벽에 조금 걸쳐 있으면 걸침이 줄어드는 쪽으로 조금씩 밀어낸다 */
function vSettle(u){if(u._gh>(G.time||0))return;const p=hullPen(u,u.x,u.z,u.hd);if(!p)return;let best=null,bp=p;
  for(let k=0;k<8;k++){const a=k*Math.PI/4,x=u.x+Math.cos(a)*.03,z=u.z+Math.sin(a)*.03;const t=tileAt(x,z);if(!t||mcost(u.type,t)===Infinity||wallCross(u,u.x,u.z,x,z))continue;const q=hullPen(u,x,z,u.hd);if(q<bp){bp=q;best=[x,z];}}
  if(best){u.x=best[0];u.z=best[1];}}
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
  const want=vDeg(dx,dz);let rel=vDiff(want,u.hd);
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
  const gh=u._gh>now;   // 빠져나오는 중: 예전처럼 이동 격자로만 판단
  const okPos=(esc||(gh?walkable(u,nx,nz):pass(nx,nz)))&&!wallCross(u,u.x,u.z,nx,nz);
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
  if(fin&&!done&&d<.35){u.path=[];u.vs=0;u._blk=0;u._rb=0;u.face=u.hd;return;}   // 목적지 바로 앞에서 막히면 거기 선다
  // 오래 막히면 길을 다시 찾고(0.6초·2초), 3초가 넘으면 3초 동안 차체 판정 없이 빠져나온다(좁은 골목·주차 차량 사이)
  if(u._blk>.6&&!u._rb||u._blk>2&&u._rb===1){u._rb=(u._rb||0)+1;const end=u.path[u.path.length-1];u.path=pathPts(u,end[0],end[1]);}
  if(u._blk>3){u._gh=now+3;u._blk=0;u._rb=0;u._ghN=(u._ghN||0)+1;if(u._ghN>3){u.path=[];u._ghN=0;return;}}
  if(!gh&&u._gh&&now-u._gh>6)u._ghN=0;
  if(!u._blk)u._rb=0;
  u._rp=0;
  // 지나간 경유점은 넘긴다
  {const nd=Math.hypot(tx-u.x,tz-u.z);if(fin&&nd<.06&&hullOk(u,tx,tz,u.hd,hullPen(u,u.x,u.z,u.hd))){u.x=tx;u.z=tz;u.vs=0;}
   if(nd<.06||(!fin&&nd<Math.max(.22,Math.abs(u.vs)*.5)))u.path.shift();
    else if(!fin&&nd<.4&&Math.abs(vDiff(vDeg(tx-u.x,tz-u.z),u.hd))>100&&!rev)u.path.shift();}
  {const g=u._pg;if(!g||Math.hypot(g[0]-u.x,g[1]-u.z)>.08)u._pg=[u.x,u.z,now];else if(now-g[2]>4){u._pg=[u.x,u.z,now];const e2=u.path[u.path.length-1];
    if(!e2||Math.hypot(e2[0]-u.x,e2[1]-u.z)<.9)u.path=[];else u.path=pathPts(u,e2[0],e2[1]);}}
  vSettle(u);
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
