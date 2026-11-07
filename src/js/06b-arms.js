/* ===================== AI 제병협동 =====================
   예전 AI는 지휘점수가 생기는 대로 싼 소총분대를 사서 부대 상한을 채웠고, 화력 지원은 조건이 까다로워 거의 부르지 않았다.
   그래서 전차·장갑차·자주포는 드물고, 남는 건 드론뿐이었다.
   여기서는 (1) 병종 구성 목표에 맞춰 사고, 비싼 차량은 돈을 모아서 산다,
   (2) 포격·전투기 폭격·공격헬기·헬기 투입을 상황 점수로 골라 자주 부른다,
   (3) 장갑차·전차는 보병과 붙어서 진격하고, 자주포·박격포는 보병 뒤에서 쏜다. */

// 부대 구성 목표(비율). 대공·전자전은 적 비행체가 보일 때 05f-air의 aiAirW가 따로 더한다.
const ARMS_MIX={rifle:.28,mg:.1,at:.08,eng:.05,sniper:.04,mortar:.08,hmv:.06,ifv:.13,tank:.09,spg:.08,drone:.02,fpv:.01,dteam:.02};
const ARMS_VEH=['ifv','tank','spg'];

/* 증원 가중치: 목표보다 모자란 병종일수록 크게 */
function aiArmsW(n,E,cnt,total){const eVeh=E.filter(e=>UT[e.type].cls==='veh').length;const cap=unitCap();const w={};
  for(const [t,f] of Object.entries(ARMS_MIX)){if(!UT[t])continue;const want=f*cap+(t==='at'?eVeh*.8:0);const lack=want-cnt(t);w[t]=f*(lack>0?1+lack*.9:.12);}
  // 대공·전자전은 합쳐 셋까지만
  if(typeof aiAirW==='function'&&cnt('aa')+cnt('zu')+cnt('ew')<3){const a=aiAirW(E,cnt);for(const t of ['aa','zu','ew'])if(a[t])w[t]=a[t]*.35;}
  // 초반에는 보병부터: 부대가 적으면 비싼 것보다 숫자
  if(total<6){for(const t of ['ifv','tank'])w[t]*=.4;w.rifle*=1.6;}
  return w;}

/* 고른 병종이 비싸서 못 사면 돈을 모은다. 부대가 너무 적을 때만 싼 것으로 바꾼다. */
function aiArmsSave(n,pick,total){return total>=5;}

/* ---------- 화력 지원 ---------- */
// 점 (x,z) 주변 R칸 안 적 가치 합(아군이 가까이 있으면 크게 깎는다)
function armsCluster(n,x,z,R,E){let s=0;for(const o of E){if(UT[o.type].fly)continue;if(Math.hypot(o.x-x,o.z-z)<=R)s+=UT[o.type].cost;}
  for(const o of G.units){if(o.nat!==n||UT[o.type].fly)continue;const d=Math.hypot(o.x-x,o.z-z);if(d<=R+.6)s-=UT[o.type].cost*1.5;}
  return s;}
function aiSupport(n,E){const N2=G.nats[n];if(!E.length||(N2.supT||0)>G.time)return false;
  const noAir=WX[G.wx].noAir,eAA=E.filter(e=>e.type==='aa'||e.type==='zu').length;const C=[];
  const add=(kind,r,c,v)=>{if(!SUP[kind]||N2.cp<SUP[kind].cost+1||v<=0)return;if(N2.lastSup===kind)v*=.6;C.push({kind,r,c,v:v/SUP[kind].cost});};
  for(const e of E){if(UT[e.type].fly)continue;
    // 포병: 3×3 안 적 무더기
    const ca=armsCluster(n,e.x,e.z,1.6,E);if(ca>=(N2.cp>=18?3:5))add('arty',e.r,e.c,ca*1.1);
    // 전투기: 노출된 차량이나 적이 든 건물 한 칸. 대공이 많으면 꺼린다
    if(!noAir){const veh=UT[e.type].cls==='veh'&&!inside(e),bl=inside(e);const near=G.units.some(o=>o.nat===n&&!UT[o.type].fly&&Math.hypot(o.x-e.x,o.z-e.z)<1.3);
      if(!near&&(veh||bl)){let v=UT[e.type].cost*(veh?1.8:1.2)+(bl?armsCluster(n,e.x,e.z,1,E)*.5:0);v*=eAA?.55:1;if(v>=6)add('air',e.r,e.c,v);}}
    // 공격헬기: 3칸 안 적이 여럿
    if(!noAir&&SUP.gunship&&!G.units.some(u=>u.nat===n&&u.type==='gunship')){const cg=armsCluster(n,e.x,e.z,3,E);let v=cg*1.8*(eAA>=2?.4:eAA?.7:1);if(cg>=6)add('gunship',e.r,e.c,v);}}
  // 헬기 투입: 남는 점수가 많고 상한에 여유가 있으면, 보이는 빈 땅 중 우리 것이 아닌 거점 가까이에 소총분대
  if(!noAir&&SUP.heli&&N2.cp>=16&&G.units.filter(u=>u.nat===n).length<unitCap()-2){const V=visSet(n);let best=null,bv=0;
    for(const o of G.objs){if(G.map[o.r][o.c].owner===n)continue;for(let a=o.r-3;a<=o.r+3;a++)for(let b=o.c-3;b<=o.c+3;b++){if(!inb(a,b)||!V.has(key(a,b))||!heliCanLand(n,a,b))continue;
      const th=E.filter(e=>Math.hypot(e.x-(b+.5),e.z-(a+.5))<3.5).length;if(th>1)continue;const v=10-dist(a,b,o.r,o.c)-th*3;if(v>bv){bv=v;best=[a,b];}}}
    if(best)add('heli',best[0],best[1],bv);}
  if(!C.length)return false;C.sort((a,b)=>b.v-a.v);
  for(const k of C.slice(0,3))if(support(n,k.kind,k.r,k.c)){N2.lastSup=k.kind;N2.supN=N2.supN||{};N2.supN[k.kind]=(N2.supN[k.kind]||0)+1;return true;}
  return false;}

/* ---------- 기동 ---------- */
// aiPosScore에 더할 점수: 차량은 보병 곁에서, 곡사는 보병 뒤에서
function aiArmsPos(u,r,c,goal,vis,n){const t=UT[u.type];if(t.fly)return 0;let s=0;
  const inf=G.units.filter(o=>o.nat===n&&o!==u&&UT[o.type].cls==='inf'&&!UT[o.type].ind);if(!inf.length)return 0;
  const gd=dist(r,c,goal[0],goal[1]);let front=1e9,nearI=1e9;
  for(const o of inf){const d=dist(o.r,o.c,goal[0],goal[1]);if(d<front)front=d;const di=Math.hypot(o.x-(c+.5),o.z-(r+.5));if(di<nearI)nearI=di;}
  if(t.cls==='veh'&&!t.ind){
    // 보병 1~3칸 곁이 좋다. 보병 선두보다 2칸 넘게 앞서면 대전차에 먼저 걸리니 멈칫
    if(nearI<=3.2)s+=nearI<1?3:6;else s-=Math.min(8,(nearI-3.2)*1.5);
    if(gd<front-2)s-=(front-2-gd)*3;}
  else if(t.ind){
    // 보병 선두 뒤 3~6칸
    const back=gd-front,want=u.type==='spg'?5:3;s-=Math.abs(back-want)*1.6;}
  return s;}

/* 보병이 차량을 따라 붙는다: 진격하는 장갑차 곁 빈 보병을 끌어 온다 */
function aiArmsEscort(n){for(const v of G.units){if(v.nat!==n||UT[v.type].cls!=='veh'||UT[v.type].ind||!v.path||!v.path.length)continue;
  const end=v.path[v.path.length-1];if(G.units.some(o=>o.nat===n&&UT[o.type].cls==='inf'&&Math.hypot(o.x-v.x,o.z-v.z)<2.5&&o.path&&o.path.length))continue;
  let bi=null,bd=6;for(const o of G.units){if(o.nat!==n||!(o.type==='rifle'||o.type==='at'||o.type==='mg')||(o.path&&o.path.length)||o.job||o.climb||inside(o))continue;
    const d=Math.hypot(o.x-v.x,o.z-v.z);if(d<bd){bd=d;bi=o;}}
  if(bi){const a=Math.random()*6.283;orderMoveTo(bi,end[0]+Math.cos(a)*1.1,end[1]+Math.sin(a)*1.1);bi.dest=null;}}}

/* 차량 하차: 장갑차는 소총분대를(보병 수송), 험비는 가끔 드론팀을 내린다 */
function aiDismount(v){if(v.type==='ifv'){if(v.dis||G.nats[v.nat].cp<DISMOUNT_CP)return null;let spot=null;
    for(let i=0;i<16&&!spot;i++){const a=i/16*6.283;for(const R of [.6,.9]){const x=v.x+Math.cos(a)*R,z=v.z+Math.sin(a)*R;const t=tileAt(x,z);if(t&&t.t!=='bldg'&&t.t!=='water'){spot=[x,z];break;}}}
    if(!spot)return null;G.nats[v.nat].cp-=DISMOUNT_CP;v.dis=1;const u=mkUnit(v.nat,'rifle',Math.floor(spot[1]),Math.floor(spot[0]));u.x=spot[0];u.z=spot[1];u.face=v.face;
    L(`${natName(v.nat)} ${UT[v.type].n}에서 보병 하차`);if(FXH.land)FXH.land(u);bump();return u;}
  if(Math.random()<.5)return null;return dismount(v);}

/* 화력 지원용으로 모아 둘 지휘점수: 적이 보이면 공격헬기 한 번 값, 아니면 포격 한 번 값 */
function aiSupReserve(n,E){const N2=G.nats[n];if(G.units.filter(u=>u.nat===n).length<5)return 0;return E.length?(SUP.gunship?SUP.gunship.cost:SUP.air.cost)+1:SUP.arty.cost;}

/* 진격: 근처에 보이는 적이 없고 목표가 멀면, 한 번에 몇 칸씩 목표 쪽으로 간다.
   (한 번 생각할 때 갈 수 있는 칸만 보면, 건물 안 엄폐 점수가 한두 칸 전진 점수보다 커서 부대가 제자리에 눌러앉았다) */
function aiArmsAdvance(n,u,E,goal){const t=UT[u.type];if(t.fly||t.dteam)return false;
  const ux=u.x,uz=u.z;if(E.some(e=>Math.hypot(e.x-ux,e.z-uz)<(t.ind?t.rng[1]+1:7)))return false;
  const gx=goal[1]+.5,gz=goal[0]+.5;let gd=Math.hypot(gx-ux,gz-uz);
  // 이미 그 거점 위에 있으면 지킨다
  if(t.cap&&gd<1.2)return false;
  // 곡사는 보병 선두 뒤에, 차량은 보병 선두보다 앞서지 않게
  const inf=G.units.filter(o=>o.nat===n&&o!==u&&UT[o.type].cls==='inf'&&!UT[o.type].ind);
  let stop=t.cap?0:1.5;if(inf.length&&(t.ind||t.cls==='veh')){const front=Math.min(...inf.map(o=>Math.hypot(gx-o.x,gz-o.z)));stop=Math.max(stop,front+(t.ind?(u.type==='spg'?5:3):-1));}
  if(gd<=stop+1.5)return false;
  const P=pathPts(u,gx+(Math.random()-.5)*1.4,gz+(Math.random()-.5)*1.4);if(!P.length)return false;
  // 경로를 따라 최대 7칸, 목표에서 stop만큼 떨어진 곳까지만
  const out=[];let px=ux,pz=uz,left=7;
  for(const p of P){const seg=Math.hypot(p[0]-px,p[1]-pz);const dg=Math.hypot(gx-p[0],gz-p[1]);
    if(seg>left||dg<stop){const f=Math.min(seg>left?left/seg:1,1);if(f>.05)out.push([px+(p[0]-px)*f,pz+(p[1]-pz)*f]);break;}out.push(p);left-=seg;px=p[0];pz=p[1];}
  if(!out.length)return false;u.path=out;u.tgt=null;u.dest=null;return true;}
