/* ===================== REAL-TIME: 실시간 전투 =====================
   지도·시야·피해 계산은 그대로 쓰고, 시간이 흐르며 모든 부대가 동시에 움직이고 쏜다.
   부대는 지도 어디로든 자유롭게 걸어가고(경로 지점을 따라), 쿨다운마다 사거리 안의 적을 자동으로 쏜다.
   30초가 한 단계(라운드): 지휘점수·승점 지급, 날씨, 연막 소멸, 시간 흐름. */
const ROUND_S=30, TICK=.1;
const COOL={rifle:2.2,mg:1.1,at:3.2,sniper:3.6,eng:2.6,mortar:4.6,ifv:1.6,tank:3.6,drone:1};
const DPS_K=.12;           // 초당 피해 = 공격력 × DPS_K (엄폐·체력 보정 전)
const SUP_CD=20;           // 화력 지원 재사용 대기(초)
/* 자유 이동: 부대는 칸에 묶이지 않고 실수 좌표(x=열, z=행)를 가진다. r·c는 지금 서 있는 칸(지형·엄폐·시야 계산용). */
const SPD_K=.2;            // 초당 이동 거리(칸) = 이동력 × SPD_K ÷ 지형 비용
const tileAt=(x,z)=>{const r=Math.floor(z),c=Math.floor(x);return inb(r,c)?G.map[r][c]:null;};
function walkable(u,x,z){const t=tileAt(x,z);return !!t&&mcost(u.type,t)<Infinity&&(typeof navOk!=='function'||navOk(u,x,z));}
/* 두 점 사이를 곧게 걸어갈 수 있는가: 지나는 칸이 모두 갈 수 있고, 양 끝보다 더 느린 지형을 지나지 않는다 */
function segClear(u,x1,z1,x2,z2){if(wallCross(u,x1,z1,x2,z2))return false;const t1=tileAt(x1,z1),t2=tileAt(x2,z2);if(!t1||!t2)return false;const lim=Math.max(mcost(u.type,t1),mcost(u.type,t2));
  if(typeof navSegOk==='function'&&!navSegOk(u,x1,z1,x2,z2))return false;// 차·방벽·방어물 (04d-fort)
  const n=Math.ceil(Math.hypot(x2-x1,z2-z1)/.2);for(let i=1;i<n;i++){const t=tileAt(x1+(x2-x1)*i/n,z1+(z2-z1)*i/n);if(!t)return false;const m=mcost(u.type,t);if(m===Infinity||m>lim)return false;}
  if(UT[u.type].cls==='veh'){const r=.22;for(const [ox,oz] of [[r,0],[-r,0],[0,r],[0,-r]])for(let i=0;i<=n;i++){const t=tileAt(x1+(x2-x1)*i/n+ox,z1+(z2-z1)*i/n+oz);if(!t||mcost(u.type,t)===Infinity)return false;}}
  return true;}
/* 칸 단위 경로(다익스트라). 부대는 무시하고 지형만 본다. 목표에 못 가면 가장 가까운 곳까지. */
function pathTo(u,r2,c2,avoid){const t=UT[u.type];const st=key(u.r,u.c),goal=key(r2,c2);if(st===goal)return [];
  const D=new Map([[st,0]]),P=new Map();const q=[[0,u.r,u.c]];let best=st,bd=dist(u.r,u.c,r2,c2);
  while(q.length){let mi=0;for(let i=1;i<q.length;i++)if(q[i][0]<q[mi][0])mi=i;const [d,r,c]=q[mi];q[mi]=q[q.length-1];q.pop();
    const k=key(r,c);if(d>D.get(k))continue;if(k===goal){best=k;break;}const h=dist(r,c,r2,c2);if(h<bd){bd=h;best=k;}
    for(const [a,b] of nbrs(r,c)){const mc=mcost(u.type,G.map[a][b]);if(mc===Infinity)continue;if(!t.fly&&!stepPass(r,c,a,b))continue;
      if(a!==r&&b!==c&&!t.fly&&(G.map[a][c].t==='bldg'&&G.map[r][b].t==='bldg'||mcost(u.type,G.map[a][c])===Infinity||mcost(u.type,G.map[r][b])===Infinity))continue;
      const nd=d+mc*(a!==r&&b!==c?1.41:1);const nk=key(a,b);if(avoid&&avoid.has(nk))continue;if(!D.has(nk)||nd<D.get(nk)){D.set(nk,nd);P.set(nk,k);q.push([nd,a,b]);}}}
  const out=[];let k=best;while(k!==st&&k!=null){out.push(k);k=P.get(k);}return out.reverse();}
/* 지점 경로: 칸 경로를 점으로 바꾸고, 곧게 갈 수 있는 구간은 건너뛰어 자연스럽게 만든다 */
function pathPts(u,x,z){x=Math.min(N-.05,Math.max(.05,x));z=Math.min(N-.05,Math.max(.05,z));
  // 지상 부대는 장애물과 문을 아는 세밀한 격자(04d-fort navPath)로, 드론은 칸 경로로
  const np=typeof navPath==='function'?navPath(u,x,z):null;let pts;
  if(np){pts=np;if(np.reached&&walkable(u,x,z)){if(pts.length)pts[pts.length-1]=[x,z];else pts.push([x,z]);}}
  else{
  const tiles=pathTo(u,Math.floor(z),Math.floor(x));pts=[];let pk=key(u.r,u.c);
  // 건물 벽을 지날 때는 문 앞(a)·문 안(b) 두 점을 꼭 거친다
  for(const k of tiles){const r0=kr(pk),c0=kc(pk),r1=kr(k),c1=kc(k);
    if(!UT[u.type].fly&&(r0===r1||c0===c1)){const d=edgePass(r0,c0,r1,c1);if(Array.isArray(d)){const nx=c1-c0,nz=r1-r0;const a=[d[0]-nx*.16,d[1]-nz*.16],b=[d[0]+nx*.16,d[1]+nz*.16];a.door='a';b.door='b';pts.push(a,b);}}
    pts.push([c1+.5,r1+.5]);pk=k;}
  const reached=!tiles.length?key(u.r,u.c):tiles[tiles.length-1];
  if(reached===key(Math.floor(z),Math.floor(x))&&walkable(u,x,z)){if(pts.length)pts[pts.length-1]=[x,z];else pts.push([x,z]);}
  }
  const out=[];let cx=u.x,cz=u.z,i=0;
  while(i<pts.length){if(pts[i].door==='b'){out.push(pts[i]);[cx,cz]=pts[i];i++;continue;}
    let lim=pts.length-1;for(let q=i;q<pts.length;q++)if(pts[q].door==='a'){lim=q;break;}
    let j=lim;while(j>i&&!segClear(u,cx,cz,pts[j][0],pts[j][1]))j--;out.push(pts[j]);[cx,cz]=pts[j];i=j+1;}
  return out;}
/* 명령 */
function orderMoveTo(u,x,z){[x,z]=coverSnap(u,x,z);u.path=pathPts(u,x,z);u.tgt=null;u.tgtTile=null;u.dest=[x,z];}
function orderMove(u,r,c){orderMoveTo(u,c+.5,r+.5);}
function orderAttack(u,e){u.tgt=e.id;u.tgtTile=null;u.dest=null;u.path=canHit(u,e)?[]:pathPts(u,e.x,e.z);}
function orderBldg(u,r,c){u.tgtTile=key(r,c);u.tgt=null;u.path=canHitTile(u,r,c)?[]:pathPts(u,c+.5,r+.5);}
function orderStop(u){u.path=[];u.tgt=null;u.tgtTile=null;u.dest=null;}
/* 여러 부대에 한 번에 이동 명령: 목표 둘레로 흩어져 선다 */
function orderGroupMove(us,x,z){if(us.length===1){orderMoveTo(us[0],x,z);return;}const cx=us.reduce((a,u)=>a+u.x,0)/us.length,cz=us.reduce((a,u)=>a+u.z,0)/us.length;
  const ang=Math.atan2(z-cz,x-cx);const w=Math.ceil(Math.sqrt(us.length));const sp=.95;
  const slots=us.map((_,i)=>{const row=Math.floor(i/w),col=i%w-(w-1)/2;const lx=-row*sp,ly=col*sp;return [x+lx*Math.cos(ang)-ly*Math.sin(ang),z+lx*Math.sin(ang)+ly*Math.cos(ang)];});
  const left=us.slice();for(const s of slots){let bi=0,bd=1e9;left.forEach((u,i)=>{const d=Math.hypot(u.x-s[0],u.z-s[1]);if(d<bd){bd=d;bi=i;}});const u=left.splice(bi,1)[0];
    let [tx,tz]=s;if(!walkable(u,tx,tz)){tx=x;tz=z;}orderMoveTo(u,tx,tz);}}
/* 사격 한 발: 분대가 VOLLEY발을 쏘고 한 발씩 명중률(엄폐·거리)로 맞았는지 굴린다 */
function rtShoot(a,d){const ta=UT[a.type];a.shot=G.turn;a.firedT=G.time||0;a.face=Math.atan2(d.z-a.z,d.x-a.x)*180/Math.PI;
  const h=hitP(a,d),k=(typeof volleyOf==='function'?volleyOf(a):VOLLEY[a.type])||1;let hits=0;for(let i=0;i<k;i++)if(Math.random()<h.p)hits++;
  if(UT[d.type].fly&&typeof airHit==='function')hits=airHit(a,d,hits);
  a.lastShot={t:G.time||0,hits,k,cover:h.kind,cov:h.cov,tgt:d.id};FXH.fire(a,d.r,d.c,d,a.lastShot);
  const dmg=Math.round(rawDmg(a,d,false)*hits/k*DPS_K*COOL[a.type]*(.8+Math.random()*.4)*10)/10;if(ta.sup)d.supp=Math.max(d.supp||0,hits?1.2:.8);   // 기관총·박격포는 빗나가도 고개를 숙이게 한다
  if(ta.ex&&typeof fortBlast==='function')fortBlast(d.x,d.z,.25,(hits?3:1.5)*ta.ex*COOL[a.type]);// 폭발물은 근처 방어물도 부순다
  if(!hits)return 0;if(ta.ex)d.supp=Math.max(d.supp||0,1);
  if(ta.ex&&cell(d.r,d.c).t==='bldg')damageBldg(d.r,d.c,Math.max(1,Math.round(dmg*ta.ex*(a.type==='tank'?.4:.8))));   // 전차 고폭탄은 방 하나를 부수지 건물을 무너뜨리진 않는다
  G.nats[a.nat].dmg=(G.nats[a.nat].dmg||0)+dmg;harm(d,dmg,a,{kind:ta.ex?'blast':'bullet',hits});if(d.hp<=0&&G.units.includes(d))kill(d,a);return dmg;}   // FPV는 한 발에 떨어진다(피해가 0이어도)
function rtShootBldg(a,r,c){const ta=UT[a.type];a.shot=G.turn;a.firedT=G.time||0;a.face=Math.atan2(r-a.r,c-a.c)*180/Math.PI;FXH.fire(a,r,c);
  const amt=Math.max(1,Math.round((ta.atk.inf+ta.atk.veh)/2*ta.ex*DPS_K*COOL[a.type]*1.2*(.85+Math.random()*.3)));damageBldg(r,c,amt);
  for(const u of unitsAt(r,c)){if(G.units.includes(u)&&u.nat!==a.nat&&!UT[u.type].fly){u.supp=Math.max(u.supp||0,1);harm(u,amt*.2*(typeof flShield==='function'?flShield(u,1):1),a,{kind:'frag'});}}}
/* 자동 표적: 가장 이득이 큰 적 */
function rtPick(u){const vs=G.fog?1:null;let best=null,bs=0;
  const R=UT[u.type].rng[1]+.6;
  for(const e of G.units){if(e.nat===u.nat)continue;const dx=u.x-e.x,dz=u.z-e.z;if(dx*dx+dz*dz>R*R)continue;if(vs&&!seen(e,u.nat))continue;if(!canHit(u,e))continue;if(vs&&typeof selfSees==='function'&&!selfSees(u,e))continue;   // 쏘는 부대가 직접 봐야 겨눈다(05k-combat)   // 싼 사거리 검사를 먼저(성능)
    const s=calcDmg(u,e,false)*UT[e.type].cost/Math.max(1,e.hp)+(u.tgt===e.id?99:0);if(s>bs){bs=s;best=e;}}
  return best;}
function rtMove(u,dt){if(!u.path||!u.path.length)return;const [tx,tz]=u.path[0];const t=tileAt(u.x,u.z);
  const dx=tx-u.x,dz=tz-u.z,d=Math.hypot(dx,dz);const sp=UT[u.type].mv*SPD_K/(t?mcost(u.type,t):1)*(u.supp>0?.65:1)*slopeK(u,dx,dz);
  if(d>.001)u.face=Math.atan2(dz,dx)*180/Math.PI;
  const st=Math.min(d,sp*dt),nx=d>.001?u.x+dx/d*st:tx,nz=d>.001?u.z+dz/d*st:tz;
  // 바로 옆에 새 잔해·방어물이 생겨 지금 자리부터 막혔으면 빠져나가는 걸음은 허용한다(갇힘 방지)
  const esc=!walkable(u,u.x,u.z)&&!!tileAt(nx,nz)&&mcost(u.type,tileAt(nx,nz))<Infinity;
  if((!esc&&!walkable(u,nx,nz))||wallCross(u,u.x,u.z,nx,nz)){u._blk=(u._blk||0)+1;
    // 경로는 작은 칸 가운데끼리 잇는다. 칸 가장자리에 서 있으면 곧은 걸음이 옆 막힌 칸(주차 차 모서리 등)을 스치니, 먼저 지금 칸 가운데로 붙는다
    if(typeof NAV_R!=='undefined'&&typeof navCls==='function'&&navCls(u)){const cx=(Math.floor(u.x*NAV_R)+.5)/NAV_R,cz=(Math.floor(u.z*NAV_R)+.5)/NAV_R,p0=u.path[0];
      if(u._snap!==p0&&Math.hypot(cx-u.x,cz-u.z)>.005&&!(Math.abs(p0[0]-cx)<1e-6&&Math.abs(p0[1]-cz)<1e-6)&&walkable(u,cx,cz)&&!wallCross(u,u.x,u.z,cx,cz)){u._snap=p0;const b=u._blk;u.path.unshift([cx,cz]);u._blkK=b;return;}}
    // 같은 경유점에서 계속 막히면(길찾기 격자와 실제 통행 여유폭이 어긋남) 그 점을 건너뛰고 다음 점으로 간다
    if(u._blk>=3&&u.path.length>1){u.path.shift();return;}
    const end=u.path[u.path.length-1];u.path=[];if(!u._rp){u._rp=1;u.path=pathPts(u,end[0],end[1]);}return;}
  u._rp=0;u._blk=u._blkK&&u.path.length>1&&u._snap===u.path[1]?u._blkK:0;u.x=nx;u.z=nz;if(d<=sp*dt){u.path.shift();u._blkK=0;}
  // 서로 밀어 제자리걸음(목적지가 다른 부대 바로 옆): 4초 넘게 못 나아가면 목적지 근처면 거기서 멈추고, 멀면 길을 다시 찾는다
  {const t=G.time||0,g=u._pg;if(!g||Math.hypot(g[0]-u.x,g[1]-u.z)>.08){u._pg=[u.x,u.z,t];u._pgN=0;}else if(t-g[2]>4){u._pg=[u.x,u.z,t];u._pgN=(u._pgN||0)+1;const e=u.path[u.path.length-1];
    // 두 번째부터는 길을 다시 찾아도 같은 자리에서 밀리니: 목적지가 2칸 안이면 멈추고, 아니면 막힌 경유점을 건너뛴다
    if(!e||Math.hypot(e[0]-u.x,e[1]-u.z)<(u._pgN>=2?2:.9))u.path=[];else if(u._pgN>=2&&u.path.length>1)u.path.shift();else u.path=pathPts(u,e[0],e[1]);}}
  u.moved=true;if(typeof fortCrush==='function')fortCrush(u);rtCell(u);if(!G.units.includes(u))return;
  if(u.tgt!=null){const e=G.units.find(z=>z.id===u.tgt);if(e&&canHit(u,e))u.path=[];}
  if(u.tgtTile!=null&&canHitTile(u,kr(u.tgtTile),kc(u.tgtTile)))u.path=[];}
/* 서 있는 칸이 바뀌면 시야·점령을 갱신한다 */
function rtCell(u){const r=Math.floor(u.z),c=Math.floor(u.x);if(r===u.r&&c===u.c)return;u.r=r;u.c=c;bump();afterMove(u);}
/* 겹친 부대는 서로 조금씩 밀어낸다.
   비키기 규칙(서로 끼여 못 가는 일 막기):
   - 가는 부대가 앞을 막은 부대를 만나면 정면으로 밀기만 하지 않고 옆으로 비켜 지나간다(마주 오면 둘 다 자기 오른쪽으로)
   - 서 있는 아군은 지나가는 부대에 길을 비켜 준다(반대쪽 옆으로)
   - 차량이 낀 쌍은 차체 모양만큼만 밀어낸다(보병은 차체에서 약 3m, 차량끼리는 차체가 닿을 때)
   infVeh: 같은 편 보병·차량이 겹칠 때 보병이 더 밀리는 몫(0 = 똑같이). AI 판 측정에서 0이 가장 덜 멈췄다(tools/jam.mjs) */
const SEP={side:.9,give:.5,infVeh:0,infGap:.25,vehGap:.04};
function sepHead(u){const p=u.path&&u.path[0];if(!p)return null;const dx=p[0]-u.x,dz=p[1]-u.z,d=Math.hypot(dx,dz);if(d>.02)return [dx/d,dz/d];
  const q=u.path[1];if(!q)return null;const ex=q[0]-u.x,ez=q[1]-u.z,e=Math.hypot(ex,ez);return e>.02?[ex/e,ez/e]:null;}
function rtSeparate(dt){const us=G.units;for(let i=0;i<us.length;i++){const a=us[i];if(UT[a.type].fly)continue;for(let j=i+1;j<us.length;j++){const b=us[j];const dx=b.x-a.x,dz=b.z-a.z;if(dx>.75||dx<-.75||dz>.75||dz<-.75)continue;   // 먼 쌍은 바로 건너뛴다(성능)
    if(UT[b.type].fly||a.climb&&b.climb)continue;   // 계단에 있는 분대는 밀리지 않고 옆 분대만 비킨다
    if(typeof sepFree==='function'&&(sepFree(a)||sepFree(b))&&a.path&&a.path.length&&b.path&&b.path.length)continue;   // 문간을 함께 지날 때는 밀지 않는다(문에서 막히지 않게). 문간에 서 있는 분대는 비켜 준다
    const inB=cell(a.r,a.c).t==='bldg'||cell(b.r,b.c).t==='bldg';if(inB&&(a.r!==b.r||a.c!==b.c||(typeof flOf==='function'&&flOf(a)!==flOf(b))))continue;   // 건물 안: 같은 칸 같은 층끼리만
    const va=UT[a.type].cls==='veh',vb=UT[b.type].cls==='veh';
    const d=Math.hypot(dx,dz);let R=(va||vb)?.75:inB?.5:.55;
    if((va||vb)&&typeof vSpec!=='undefined'&&d>.001){const ext=v=>{const s=vSpec(v),h=(v.hd??v.face??0)*Math.PI/180,cs=Math.abs((dx*Math.cos(h)+dz*Math.sin(h))/d);return s.hl*cs+s.hw*Math.sqrt(Math.max(0,1-cs*cs));};
      R=Math.min(R,(va?ext(a):0)+(vb?ext(b):0)+(va&&vb?SEP.vehGap:SEP.infGap));}   // 차량이 낀 쌍: 차체 모양만큼만(보병은 차체에서 약 3m, 차량끼리는 차체가 닿을 때)
    if(d>=R)continue;
    const push=(R-d)*Math.min(1,dt*4)/2,nx=d>.001?dx/d:Math.cos(i+j),nz=d>.001?dz/d:Math.sin(i+j);
    const mv=(u,s)=>{const x=u.x+nx*push*s,z=u.z+nz*push*s;if(inB&&(Math.floor(x)!==u.c||Math.floor(z)!==u.r))return;if(walkable(u,x,z)&&!wallCross(u,u.x,u.z,x,z)){u.x=x;u.z=z;}};
    const sd=(u,px,pz)=>{const x=u.x+px,z=u.z+pz;if(inB&&(Math.floor(x)!==u.c||Math.floor(z)!==u.r))return false;if(walkable(u,x,z)&&!wallCross(u,u.x,u.z,x,z)){u.x=x;u.z=z;return true;}return false;};
    const am=a.path&&a.path.length,bm=b.path&&b.path.length;
    // 밀리는 몫: 서 있는 쪽은 덜 밀린다
    let ka=bm&&!am?.4:1,kb=am&&!bm?.4:1;if(va!==vb&&a.nat===b.nat){if(va){ka*=1-SEP.infVeh;kb*=1+SEP.infVeh;}else{ka*=1+SEP.infVeh;kb*=1-SEP.infVeh;}}
    if(a.climb){mv(b,2);}else if(b.climb){mv(a,-2);}else{mv(a,-ka);mv(b,kb);}
    if(a.climb||b.climb)continue;
    // 옆으로 비켜 지나가기: 가는 부대 앞(가려는 쪽)에 상대가 있으면 그 옆으로 돈다. 정면이면 자기 오른쪽으로
    for(const [u,o,sg] of [[a,b,1],[b,a,-1]]){if(!(u.path&&u.path.length))continue;const h=sepHead(u);if(!h)continue;
      const ox=nx*sg,oz=nz*sg,fw=h[0]*ox+h[1]*oz;if(fw<.2)continue;   // 상대가 앞에 없으면 그대로
      const cr=h[0]*oz-h[1]*ox;let s=Math.abs(cr)<.15?1:(cr>0?-1:1);   // 상대가 왼쪽에 있으면 오른쪽으로(정면이면 오른쪽)
      const m=push*SEP.side*fw*(UT[u.type].cls==='veh'&&UT[o.type].cls!=='veh'&&u.nat===o.nat?.3:1);
      const px=-h[1]*m,pz=h[0]*m;   // 오른쪽 = 진행 방향을 시계 방향으로 90°
      if(!sd(u,px*s,pz*s))sd(u,-px*s,-pz*s);
      // 서 있는 아군은 반대쪽으로 비켜 준다(마주 오는 부대는 스스로 오른쪽으로 비키니 따로 밀지 않는다)
      if(!(o.path&&o.path.length)&&o.nat===u.nat&&!o.hold&&!(UT[o.type].cls==='veh'&&UT[u.type].cls!=='veh')){const g=push*SEP.give*fw;sd(o,h[1]*g*s,-h[0]*g*s);}}}}
  for(const u of us.slice())if(G.units.includes(u))rtCell(u);}
function rtFight(u){const t=UT[u.type];if(!t.rng[1]||u.cd>0||u.climb||t.kami)return;const moving=!!(u.path&&u.path.length);if(t.ind&&moving)return;
  // 명령받은 표적을 쫓는다
  if(u.tgt!=null){const e=G.units.find(z=>z.id===u.tgt);if(!e||(G.fog&&!seen(e,u.nat))){u.tgt=null;}
    else if(!canHit(u,e)&&!moving&&!u.hold){u.path=pathPts(u,e.x,e.z);}}
  let tg=rtPick(u);
  if(!tg&&u.tgtTile!=null){const r=kr(u.tgtTile),c=kc(u.tgtTile);if(G.map[r][c].t!=='bldg'){u.tgtTile=null;}else if(canHitTile(u,r,c)){rtShootBldg(u,r,c);u.cd=COOL[u.type]*(.9+Math.random()*.2);return;}}
  if(typeof breachPick==='function'){const P=breachPick(u,tg);if(P){breach(u,P);u.cd=COOL[u.type]*(.9+Math.random()*.2)*(moving?1.5:1);return;}}   // 건물 안 적: 그 층 벽을 친다(05i-breach)
  if(!tg){if(typeof supFire==='function'&&supFire(u,moving))u.cd=COOL[u.type]*(1+Math.random()*.3)*(moving?1.5:1);return;}   // 안 보이면 마지막 본 자리에 제압 사격(05k-combat)
  rtShoot(u,tg);u.cd=COOL[u.type]*(.85+Math.random()*.3)*(moving?1.5:1);}
/* 30초마다: 수입·승점·날씨·연막 */
function rtRound(){G.turn++;for(const n of G.order){if(!G.nats[n].alive)continue;G.nats[n].cp+=income(n);G.nats[n].vp+=objCount(n);}
  if(typeof wxRound==='function')wxRound();else if(Math.random()<.35)G.wx=rollWx();for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=G.map[r][c];if(x.smoke>0)x.smoke--;}
  G.hist.push(G.order.map(k=>G.nats[k].vp));bump();save();}
function rtTick(dt){if(!G||G.over)return;G.time=(G.time||0)+dt;
  while(G.time>=G.turn*ROUND_S&&!G.over)rtRound();
  if(typeof heliTick==='function')heliTick();
  if(typeof shellTick==='function')shellTick();
  if(typeof fireTick==='function')fireTick(dt);
  if(typeof fortTick==='function')fortTick(dt);
  if(typeof airTick==='function')airTick(dt);
  if(typeof msAllTick==='function')msAllTick(dt);
  for(const u of G.units.slice()){if(!G.units.includes(u))continue;if(u.supp>0)u.supp=Math.max(0,u.supp-dt/3);u.cd=(u.cd||0)-dt;if(!flTick(u,dt))rtMove(u,dt);if(G.units.includes(u))rtFight(u);}
  rtSeparate(dt);
  for(const n of G.order){if(!aiRun(n)||!G.nats[n].alive)continue;const N2=G.nats[n];N2.aiT=(N2.aiT??Math.random()*1.5)-dt;
    if(N2.aiT<=0){N2.aiT=1.6+Math.random()*1.2;try{aiThink(n);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}}}
  if(typeof scnAfterAct==='function'&&G.scn==='tut')scnAfterAct();
  if(G.camp&&typeof campTick==='function')campTick(dt);
  checkOver();}
/* 시뮬레이션을 secs초만큼 돌린다(테스트·관전용) */
function rtRun(secs){const n=Math.round(secs/TICK);for(let i=0;i<n&&!G.over;i++)rtTick(TICK);return G.over;}
/* 브라우저 루프 */
const RT={last:0,acc:0,uiT:0,v:-1};
function rtLoop(now){requestAnimationFrame(rtLoop);const dt0=Math.min(.25,(now-(RT.last||now))/1000);RT.last=now;if(!G||G.over)return;
  const setupOpen=!$('#setup').hidden;if(G.paused||(setupOpen&&!G.boot))return;
  // 한 프레임에 몰아서 따라잡지 않는다: 밀린 틱을 12개까지 한꺼번에 돌리면 그 프레임이 수백 ms 멈춘다.
  // 한 프레임엔 배속에 맞는 만큼(보통 2틱)만, 그리고 14ms를 넘기면 다음 프레임으로 미룬다. 그래도 밀리면 밀린 시간은 버린다(게임이 잠깐 느려질 뿐 끊기지 않는다)
  const spd=G.spd||1,cap=Math.max(2,Math.ceil(spd)+1);RT.acc+=dt0*spd;let n=0;const t0=performance.now();
  while(RT.acc>=TICK&&n<cap){RT.acc-=TICK;n++;rtTick(TICK);if(performance.now()-t0>14)break;}
  if(RT.acc>cap*TICK)RT.acc=TICK;
  // 화면 글자판(render)은 틱을 돌린 프레임을 피해 다음 프레임에 그린다(한 프레임에 일이 겹치지 않게)
  RT.uiT-=dt0;if(RT.uiT<=0||(RT.v!==G.ver&&RT.uiT<.15)||G.over){if(n&&!G.over&&!RT.hold&&RT.uiT>-.2){RT.hold=1;return;}RT.hold=0;RT.uiT=.25;RT.v=G.ver;render();}}
function rtStart(){if(RT.started)return;RT.started=true;requestAnimationFrame(rtLoop);}
const fmtT=s=>{s=Math.max(0,Math.floor(s));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;};
