/* ===================== 공중전: 공격헬기·전투기·드론과 대공 =====================
   하늘에 있는 것(드론·헬기)은 쏜다고 다 맞지 않는다. 작고 빠르고 높이 떠 있어서,
   소총·기관총은 대부분 빗나가고 전용 대공 수단(휴대용 대공미사일, 대공포 차량, 전파 방해)이 있어야 잘 떨어뜨린다.
   - 공격헬기: 화력 지원으로 부른다. 지정한 곳 위를 선회하며 기관포·로켓으로 쏘고, 시간이 다 되면 돌아간다. 격추될 수 있다.
   - 전투기(근접 항공 지원): 몇 초 뒤 날아와 폭탄을 떨어뜨린다. 목표 근처의 적 대공팀·대공포가 먼저 격추할 수 있다.
   - FPV 자폭드론: 적에게 날아가 부딪혀 터진다. 위에서 덮쳐서 장갑과 엄폐를 거의 무시한다. 전파 방해에 약하다.
   - 정찰드론: 기존 그대로, 이제 전파 방해로 떨어질 수 있다.
   격추된 기체는 떨어지는 데 시간이 걸리고, 헬기는 떨어진 곳에 피해를 준다. */
Object.assign(UT,{
  fpv:{n:'FPV 자폭드론',cls:'air',mv:12,vis:4,rng:[0,.9],atk:{inf:7,veh:9,air:0},cost:2,fly:1,hpMax:1,kami:1,desc:'적에게 날아가 부딪혀 터짐. 위에서 덮쳐 장갑·엄폐를 거의 무시. 한 발만 맞아도 떨어지고 전파 방해에 약함. 90초 뒤 배터리 소진'},
  aa:{n:'대공팀',cls:'inf',mv:3,vis:6,rng:[1,8],atk:{inf:0,veh:0,air:12},cost:4,aa:1,desc:'휴대용 대공미사일. 헬기·전투기를 잘 잡고 작은 드론엔 덜 맞음. 헬기는 플레어로 피하기도 함. 지상 공격 불가'},
  ew:{n:'전자전팀',cls:'inf',mv:3,vis:5,rng:[1,3],atk:{inf:3,veh:0,air:0},cost:3,jam:3.5,desc:'휴대 재머. 반경 3.5칸 안 적 드론의 조종 신호를 끊어 떨어뜨림. 헬기·전투기에는 효과 없음'},
  zu:{n:'대공포 차량',cls:'veh',mv:6,vis:6,rng:[1,7],atk:{inf:5,veh:1,air:8},sup:1,cost:6,hpMax:8,desc:'짐칸에 연장 기관포를 실은 차량. 드론·헬기를 가장 잘 맞힘. 장갑 얇음'},
  gunship:{n:'공격헬기',cls:'air',mv:9,vis:7,rng:[0,5.5],atk:{inf:7,veh:7,air:2},ex:1,sup:1,cost:10,fly:1,hpMax:14,heli:1,noBuy:1,desc:'화력 지원으로만 부름. 지정한 곳 위를 선회하며 사격. 탭해서 선회 지점을 옮길 수 있음'},
});
UT.dteam={n:'드론팀',cls:'inf',mv:3,vis:6,rng:[1,3],atk:{inf:2,veh:0,air:1},cost:4,dteam:1,desc:'FPV 조종수 팀. 멈춰서 자리를 잡으면 보이는 적에게 FPV를 띄움(드론 4대, 25초마다 1대 보급). 조종 거리 10칸, 조종수가 쓰러지면 드론도 떨어짐. 험비·장갑차에서 하차시킬 수도 있음'};
for(const t of ['fpv','dteam','aa','ew','zu'])if(!TYPES.includes(t))TYPES.splice(TYPES.indexOf('drone')+1+['fpv','dteam','aa','ew','zu'].indexOf(t),0,t);
UT.drone.hpMax=3;UT.drone.desc='건물 위로 날아 넓게 정찰. 공격 불가. 소총으론 잘 안 맞지만 전파 방해·대공에 약함';
Object.assign(COOL,{dteam:2.4,fpv:1,aa:7,ew:2.4,zu:.9,gunship:1.3});
Object.assign(VOLLEY,{dteam:2,fpv:1,aa:1,ew:2,zu:8,gunship:4});
SUP.gunship={n:'공격헬기',cost:10,rad:0,air:1,desc:'보이는 곳 위로 공격헬기가 와서 45초 동안 선회하며 사격. 대공에 격추될 수 있음',fn:(n,r,c)=>callGunship(n,r,c)};
Object.assign(SUP.air,{air:1,desc:'전투기가 몇 초 뒤 날아와 한 칸에 폭탄. 건물을 무너뜨림. 근처 적 대공이 먼저 격추할 수도',fn:(n,r,c)=>jetRun(n,r,c)});
CLSN.air='항공';

const GUN_T=45, JET_T=2.6, FPV_LIFE=90;
/* 하늘의 표적을 맞힐 확률 배수(거리·엄폐 명중률에 곱한다). 전용 대공 수단만 잘 맞는다. */
const AIR_ACC={aa:.8,zu:.6,ifv:.3,hmv:.26,gunship:.3,mg:.2,rifle:.12,ew:.1,sniper:.1,tank:.04,at:.05};
function airAcc(a,d,dd){const td=UT[d.type];let k=AIR_ACC[a.type]??.1;
  if(td.heli){if(a.type!=='aa')k=Math.min(.85,k*1.8);}           // 헬기는 크고 낮게 떠서 더 잘 맞는다
  else{if(a.type==='aa')k=.4;                                      // 작은 드론은 열 신호가 약하다
    if(a.type==='rifle'&&dd<1.6)k=Math.max(k,.22);                  // 가까이 온 드론에는 산탄총
    if(td.kami&&d.air&&d.air.dive)k*=.5;if(a.type==='gunship')k*=.5;}                          // 내리꽂는 FPV는 빠르다
  return k;}
/* 명중 뒤 처리: 헬기는 미사일을 플레어로 피할 수 있고, FPV는 한 발만 맞아도 떨어진다 */
function airHit(a,d,hits){const td=UT[d.type];if(!hits)return 0;
  if(td.heli&&a.type==='aa'&&(d.flares??0)>0&&Math.random()<.55){d.flares--;d.flareT=G.time;L(`${natName(d.nat)} 공격헬기 플레어로 미사일 회피`);return 0;}
  if(td.kami)d.hp=0;return hits;}

/* ---------- 공격헬기 ---------- */
// 세력의 지도 가장자리 한 점(아군 집결지 쪽)에서 들어온다
function airEdge(n,x,z){const e=NATS[n]&&NATS[n].edge;const m=.3;if(e==='서쪽')return [m,z];if(e==='동쪽')return [N-m,z];if(e==='북쪽')return [x,m];return [x,N-m];}
function callGunship(n,r,c){const [ex,ez]=airEdge(n,c+.5,r+.5);const u=mkUnit(n,'gunship',Math.min(N-1,Math.floor(ez)),Math.min(N-1,Math.floor(ex)));u.x=Math.min(N-.05,ex);u.z=Math.min(N-.05,ez);
  u.air={cx:c+.5,cz:r+.5,until:(G.time||0)+GUN_T,ang:Math.random()*6.283};u.flares=2;u.face=Math.atan2(r+.5-u.z,c+.5-u.x)*180/Math.PI;
  L(`${natName(n)} 공격헬기 진입`);return u;}
function gunshipTick(u,dt){const A=u.air;if(u.path&&u.path.length){const p=u.path[u.path.length-1];A.cx=p[0];A.cz=p[1];u.path=[];}
  if(u.tgt!=null){const e=G.units.find(z=>z.id===u.tgt);if(e){A.cx=e.x;A.cz=e.z;}}
  if(!A.leave&&G.time>=A.until){A.leave=1;L(`${natName(u.nat)} 공격헬기 복귀`);}
  let tx,tz;const sp=UT.gunship.mv*SPD_K;
  if(A.leave){const [ex,ez]=airEdge(u.nat,u.x,u.z);const ox=ex<1?-9:ex>N-1?9:0,oz=ez<1?-9:ez>N-1?9:0;tx=ex+ox;tz=ez+oz;}
  else{const R=2.2;A.ang+=dt*sp*.55/R;tx=A.cx+Math.cos(A.ang)*R;tz=A.cz+Math.sin(A.ang)*R;}
  const dx=tx-u.x,dz=tz-u.z,d=Math.hypot(dx,dz);if(d>.01){const st=Math.min(d,sp*dt);u.x+=dx/d*st;u.z+=dz/d*st;if(!(u.firedT>G.time-.8))u.face=Math.atan2(dz,dx)*180/Math.PI;}
  if(A.leave&&(u.x<-.5||u.z<-.5||u.x>N+.5||u.z>N+.5)){airRemove(u);return;}
  u.x=Math.min(N-.01,Math.max(.01,u.x));u.z=Math.min(N-.01,Math.max(.01,u.z));
  if(A.leave&&(u.x<=.02||u.z<=.02||u.x>=N-.02||u.z>=N-.02)){airRemove(u);return;}
  rtCell(u);}
/* 격파가 아니라 임무를 마치고 빠지는 것: 손실로 세지 않는다 */
function airRemove(u){G.units=G.units.filter(x=>x!==u);if(UI.sel===u)UI.sel=null;if(UI.group)UI.group=UI.group.filter(x=>x!==u);bump();}

/* ---------- 전투기 폭격 ---------- */
function jetRun(n,r,c){G.airq=G.airq||[];const j={kind:'jet',n,r,c,t:(G.time||0)+JET_T,id:UID++};G.airq.push(j);if(FXH.jet)FXH.jet(j);L(`${natName(n)} 전투기 폭격 진입`);return j;}
function jetDrop(j){const {n,r,c}=j;
  // 목표 근처(7칸 안) 적 대공팀·대공포가 한 번씩 쏜다. 빠르고 높이 날아서 잘 맞지 않는다.
  for(const e of G.units){if(e.nat===n||(e.type!=='aa'&&e.type!=='zu'))continue;if(Math.hypot(e.x-(c+.5),e.z-(r+.5))>7)continue;if(e.supp>.5)continue;
    e.firedT=G.time;e.face=Math.atan2(r+.5-e.z,c+.5-e.x)*180/Math.PI;const p=e.type==='aa'?.3:.12;if(FXH.aaShot)FXH.aaShot(e,j);
    if(Math.random()<p){const a=Math.random()*6.283,d=1.5+Math.random()*2;const x=Math.min(N-.5,Math.max(.5,c+.5+Math.cos(a)*d)),z=Math.min(N-.5,Math.max(.5,r+.5+Math.sin(a)*d));
      L(`${natName(e.nat)} ${UT[e.type].n} 전투기 격추! 폭격 실패`);G.nats[e.nat].kills++;e.kills=(e.kills||0)+1;
      crashAt({x,z,t:G.time+1.6,big:1,nat:n,kind:'jet'});if(FXH.jetDown)FXH.jetDown(j,x,z);sfx('boom');bump();return;}}
  if(FXH.bomb)FXH.bomb(r,c);sfx('arty');
  for(const [a,b] of supArea(r,c,0)){const x=G.map[a][b];const u=unitAt(a,b);
    if(u){const cov=UT[u.type].fly?0:TT[x.t].cov*.5;const d=Math.max(1,Math.round(9*(1-cov)*(.85+Math.random()*.3)));u.supp=2;harm(u,d,null,{kind:'blast',x:b+.5,z:a+.5,rad:.6});}
    if(x.t==='bldg'){damageBldg(a,b,24);if(typeof ignite==='function')ignite(a,b,.7);}}
  // 폭풍: 주변 부대도 제압
  for(const u of G.units)if(!UT[u.type].fly&&Math.hypot(u.x-(c+.5),u.z-(r+.5))<1.8)u.supp=Math.max(u.supp||0,1.5);
  bump();}

/* ---------- 추락 ---------- */
function crashAt(cr){(G.crash=G.crash||[]).push(cr);}
// 격추되어 사라진 기체: 떨어질 시간 뒤 땅에 부딪힌다(헬기는 주변에 피해)
function airDown(u,why){const t=UT[u.type];crashAt({x:u.x,z:u.z,t:(G.time||0)+(t.heli?2.2:1),big:t.heli?1:0,nat:u.nat,kind:u.type});
  if(t.heli)L(`${natName(u.nat)} 공격헬기 격추!`);else if(why==='jam')L(`${natName(u.nat)} ${t.n} 전파 방해로 추락`);}
function crashTick(){if(!G.crash||!G.crash.length)return;const keep=[];
  for(const cr of G.crash){if(cr.t>G.time){keep.push(cr);continue;}if(FXH.crash)FXH.crash(cr);
    if(!cr.big){if(cr.kind==='fpv')for(const u of G.units)if(!UT[u.type].fly&&Math.hypot(u.x-cr.x,u.z-cr.z)<.45){u.supp=Math.max(u.supp||0,1);harm(u,1,null,{kind:'blast',x:cr.x,z:cr.z,rad:.3});}continue;}
    sfx('boom');const r=Math.floor(cr.z),c=Math.floor(cr.x);
    for(const u of G.units.slice())if(!UT[u.type].fly&&Math.hypot(u.x-cr.x,u.z-cr.z)<1){u.supp=2;harm(u,4,null,{kind:'blast',x:cr.x,z:cr.z,rad:.6});}
    if(inb(r,c)&&G.map[r][c].t==='bldg'){damageBldg(r,c,8);if(typeof ignite==='function')ignite(r,c,.4);}}
  G.crash=keep;bump();}

/* ---------- FPV·정찰드론: 전파 방해와 돌입 ---------- */
function jammedBy(u){for(const e of G.units){const r=UT[e.type].jam;if(!r||e.nat===u.nat)continue;if(Math.hypot(e.x-u.x,e.z-u.z)<=r)return e;}return null;}
function droneTick(u,dt){const t=UT[u.type];u.air=u.air||{born:G.time||0};
  const j=jammedBy(u);u.jam=j?1:0;
  if(j&&Math.random()<(t.kami?.5:.15)*dt){if(G.nats[j.nat]){G.nats[j.nat].kills++;j.kills=(j.kills||0)+1;}airDown(u,'jam');FXH.kill(u);airRemove(u);G.nats[u.nat].losses++;return false;}
  if(!t.kami)return true;
  // 드론팀이 띄운 FPV: 조종수가 쓰러지거나 10칸 밖으로 나가면 신호가 끊긴다
  if(u.op!=null){const op=G.units.find(z=>z.id===u.op);if(!op||Math.hypot(op.x-u.x,op.z-u.z)>DT_LINK){L(`${natName(u.nat)} FPV 조종 신호 끊김`);airDown(u);FXH.kill(u);airRemove(u);return false;}}
  if(G.time-u.air.born>FPV_LIFE){L(`${natName(u.nat)} FPV 드론 배터리 소진`);airDown(u);FXH.kill(u);airRemove(u);return false;}
  let e=u.tgt!=null?G.units.find(z=>z.id===u.tgt):null;if(e&&(UT[e.type].fly||(G.fog&&!seen(e,u.nat))))e=null;
  // 명령이 없으면 가까이 보이는 지상 적을 스스로 노린다(값진 표적 우선)
  if(!e&&!(u.path&&u.path.length)){let bs=0;for(const o of G.units){if(o.nat===u.nat||UT[o.type].fly||(G.fog&&!seen(o,u.nat)))continue;const d=Math.hypot(o.x-u.x,o.z-u.z);if(d>4.5)continue;const s=UT[o.type].cost/(1+d);if(s>bs){bs=s;e=o;}}if(e)u.tgt=e.id;}
  if(!e){u.air.dive=0;return true;}
  u.path=[];const dx=e.x-u.x,dz=e.z-u.z,d=Math.hypot(dx,dz);u.air.dive=d<1.3?1:0;u.air.dd=d;u.face=Math.atan2(dz,dx)*180/Math.PI;
  // 전파 방해 중에는 조종이 흔들려 비틀거린다
  const wob=u.jam?(Math.random()-.5)*.9:0;const sp=t.mv*SPD_K*(u.air.dive?1.25:1);const st=Math.min(d,sp*dt);
  u.x=Math.min(N-.01,Math.max(.01,u.x+dx/(d||1)*st+wob*dt));u.z=Math.min(N-.01,Math.max(.01,u.z+dz/(d||1)*st-wob*dt));rtCell(u);if(!G.units.includes(u))return false;
  if(d<=.32){fpvBoom(u,e);return false;}
  return false;}
/* 부딪혀 터짐: 표적에 큰 피해(위에서 덮치므로 장갑 무시, 건물 안이면 지붕·벽이 일부 막는다), 주변에 파편 */
function fpvBoom(u,e){const te=UT[e.type];const ins=cell(e.r,e.c).t==='bldg'&&!te.fly;
  let dmg=te.cls==='veh'?7:4.5;if(ins)dmg*=.45;dmg*=.85+Math.random()*.3;dmg=Math.round(dmg*10)/10;
  if(FXH.fpvBoom)FXH.fpvBoom(u,e);sfx('hit');airRemove(u);
  e.supp=Math.max(e.supp||0,1.5);G.nats[u.nat].dmg=(G.nats[u.nat].dmg||0)+dmg;
  if(ins)damageBldg(e.r,e.c,3);
  L(`${natName(u.nat)} FPV 드론이 ${natName(e.nat)} ${te.n} 타격`);
  harm(e,dmg,u,{kind:'blast',x:e.x,z:e.z,rad:.35});
  for(const o of G.units.slice())if(o!==e&&!UT[o.type].fly&&Math.hypot(o.x-e.x,o.z-e.z)<.6){o.supp=Math.max(o.supp||0,1);harm(o,1,u,{kind:'frag',x:e.x,z:e.z,rad:.4});}
  bump();}

/* ---------- 드론팀 ---------- */
const DT_LINK=10, DT_SETUP=3, DT_GAP=9, DT_RESUP=25;
function dteamTick(u,dt){if(u.dr==null){u.dr=4;u.dsT=0;u.lt=-99;u.rs=G.time;}
  if(u.dr<4&&G.time-u.rs>=DT_RESUP){u.dr++;u.rs=G.time;}else if(u.dr>=4)u.rs=G.time;
  if((u.path&&u.path.length)||u.climb){u.dsT=0;return;}u.dsT+=dt;
  if(u.dsT<DT_SETUP||u.dr<=0||G.time-u.lt<DT_GAP||u.supp>.8)return;
  if(G.units.filter(f=>f.op===u.id).length>=2)return;
  const own=G.units.filter(f=>f.op===u.id).map(f=>f.tgt);let best=null,bs=0;
  for(const e of G.units){if(e.nat===u.nat||UT[e.type].fly||(G.fog&&!seen(e,u.nat)))continue;const d=Math.hypot(e.x-u.x,e.z-u.z);if(d>DT_LINK-1)continue;
    const s=UT[e.type].cost*(UT[e.type].cls==='veh'?2:1)/(3+d)*(cell(e.r,e.c).t==='bldg'?.5:1)*(own.includes(e.id)?.3:1);if(s>bs){bs=s;best=e;}}
  if(!best)return;launchFpv(u,best);}
function launchFpv(u,e){const f=mkUnit(u.nat,'fpv',u.r,u.c);f.x=u.x;f.z=u.z;f.op=u.id;f.tgt=e?e.id:null;f.air={born:G.time};u.dr--;u.lt=G.time;u.firedT=G.time;
  if(FXH.fpvLaunch)FXH.fpvLaunch(u,f);sfx('launch',.5);L(`${natName(u.nat)} 드론팀 FPV 이륙`);bump();return f;}
/* 험비·장갑차에서 드론팀 하차 (차량마다 한 번, 지휘 3) */
const DISMOUNT_CP=3;
function canDismount(v){return v&&(v.type==='hmv'||v.type==='ifv')&&!v.dis&&G.nats[v.nat].cp>=DISMOUNT_CP;}
function dismount(v){if(!canDismount(v))return null;let spot=null,bd=9;
  for(let i=0;i<16;i++){const a=i/16*6.283;for(const R of [.45,.7,1]){const x=v.x+Math.cos(a)*R,z=v.z+Math.sin(a)*R;const t=tileAt(x,z);if(!t||t.t==='bldg'||t.t==='water')continue;if(R<bd){bd=R;spot=[x,z];}}}
  if(!spot)return null;G.nats[v.nat].cp-=DISMOUNT_CP;v.dis=1;const u=mkUnit(v.nat,'dteam',Math.floor(spot[1]),Math.floor(spot[0]));u.x=spot[0];u.z=spot[1];u.face=v.face;
  L(`${natName(v.nat)} ${UT[v.type].n}에서 드론팀 하차`);if(FXH.land)FXH.land(u);bump();return u;}

/* 매 틱: 날아다니는 것들 (rtTick에서 부대 처리 전에 부른다) */
function airTick(dt){if(!G)return;
  if(G.airq&&G.airq.length){const keep=[];for(const j of G.airq){if(j.t>G.time){keep.push(j);continue;}jetDrop(j);}G.airq=keep;}
  crashTick();
  for(const u of G.units.slice()){if(!G.units.includes(u))continue;const t=UT[u.type];if(!t.fly)continue;
    if(t.heli){gunshipTick(u,dt);continue;}droneTick(u,dt);}
  for(const u of G.units.slice())if(UT[u.type].dteam&&G.units.includes(u))dteamTick(u,dt);
  // AI: 적이 가까이 보이면 험비·장갑차가 드론팀을 내려놓는다
  for(const v of G.units.slice()){if(!canDismount(v)||!isAI(v.nat)||G.units.filter(o=>o.nat===v.nat).length>=unitCap())continue;if(Math.random()>dt*.15)continue;
    if(G.units.some(e=>e.nat!==v.nat&&!UT[e.type].fly&&Math.hypot(e.x-v.x,e.z-v.z)<8&&(!G.fog||seen(e,v.nat))))dismount(v);}}

/* ---------- AI ---------- */
// 증원 가중치: 적 차량이 보이면 FPV, 적 비행체가 보이면 대공, 적 FPV가 보이면 전자전팀
function aiAirW(E,cnt){const eVeh=E.filter(e=>UT[e.type].cls==='veh').length,eAir=E.filter(e=>UT[e.type].fly).length,eFpv=E.filter(e=>UT[e.type].kami).length;
  return {fpv:cnt('fpv')<3&&E.length?.2+eVeh*.6:0,dteam:cnt('dteam')<2?(E.length?.9+eVeh*.5:.3):0,aa:cnt('aa')<2?(eAir?1.6:.3):0,zu:cnt('zu')<1?(eAir?1.4:.2):0,ew:cnt('ew')<2?(eFpv?2.2:.25):0};}
// FPV: 보이는 적 중 값진 지상 표적(차량 우선)을 골라 돌입. 없으면 평소처럼 움직인다.
function aiFpv(n,u,E){if(u.tgt!=null&&G.units.some(e=>e.id===u.tgt))return true;let best=null,bs=0;
  for(const e of E){if(UT[e.type].fly)continue;const d=Math.hypot(e.x-u.x,e.z-u.z);if(d>14)continue;const s=UT[e.type].cost*(UT[e.type].cls==='veh'?2:1)/(3+d)*(cell(e.r,e.c).t==='bldg'?.5:1);if(s>bs){bs=s;best=e;}}
  if(best){u.tgt=best.id;u.path=[];return true;}return false;}
// 공격헬기: 적이 여럿 보이고 아군 헬기가 없을 때, 적이 가장 몰린 곳에
function aiAirSup(n,E){const N2=G.nats[n];if(N2.cp<SUP.gunship.cost+2||WX[G.wx].noAir||E.length<3)return false;if(G.units.some(u=>u.nat===n&&u.type==='gunship'))return false;
  const eAA=E.filter(e=>e.type==='aa'||e.type==='zu').length;if(eAA>=2&&Math.random()<.7)return false;
  let best=null,bs=0;for(const e of E){if(UT[e.type].fly)continue;let s=0;for(const o of E)if(Math.hypot(o.x-e.x,o.z-e.z)<3)s+=UT[o.type].cost;if(s>bs){bs=s;best=e;}}
  if(!best||bs<9)return false;return support(n,'gunship',best.r,best.c);}
