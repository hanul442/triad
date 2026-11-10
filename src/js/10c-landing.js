/* ===================== CAMPAIGN: 상륙 작전 (노르망디 · 인천) =====================
   역사 속 두 상륙전을 이 게임의 지도와 부대로 다시 짠 임무 두 개. 순서 없이 둘 다 열려 있다.
   - 서쪽은 바다(x.sea), 그 앞이 모래사장(x.sand)·안벽(x.wall)·부두(x.pier), 그 뒤가 마을·도시.
   - 아군은 바다에서 상륙정(G.camp.boats)으로만 들어온다. 예정된 상륙파(M.lw)와 플레이어가 산 증원 모두
     '다음 상륙 지점'(G.camp.sec)으로 간다. 오는 동안 해안의 적 화기가 쏘아 상륙정이 다치거나 가라앉는다.
     해변에 연막을 치거나 적을 제압하면 덜 맞는다.
   - 구축함 함포(M.naval)가 보이는 해안 진지를 스스로 친다. 공병은 해변 장애물을 스스로 걷어 낸다.
   - 인천은 조수(M.tide)가 바뀐다: 썰물엔 갯벌이 드러나 상륙정이 못 온다(부두는 점령하면 언제나 쓸 수 있다).
   지형 플래그는 맵 다양화(03c-biome)와 같다: 바다 t:'water'+sea, 모래 t:'plaza'+sand, 부두 pier. 이 파일만 쓰는 것: wall(안벽), bluff(절벽: 차량 불가), mudz(썰물 때 드러나는 갯벌), cau(둑길). */
CAMP_IDS.push('omaha','incheon');
CAMP_OPS.push({id:'landing',n:'상륙 작전',ids:['omaha','incheon'],free:1,end:'두 상륙 작전을 모두 마쳤습니다.'});
const BOAT={lcvp:{n:'상륙정',hp:5,v:1.15},lcm:{n:'전차 상륙정',hp:8,v:.9}};
/* 상륙정을 쏘는 적: 0.5초마다 맞힐 확률(가까운 거리, 엄폐 없음 기준). 사거리는 8칸, 곡사는 BOAT_RNG */
const BOAT_HIT={mg:.045,rifle:.015,at:.07,tank:.08,ifv:.045,mortar:.03,sniper:.008,spg:.04,aa:.045,hmv:.02};
const BOAT_RNG={mortar:14,spg:16};
const LAND_CLR={hedgehog:1,wire:1,jersey:1,mine:1};
const landOn=()=>!!(G&&G.camp&&CAMP[G.camp.id]&&CAMP[G.camp.id].land);

/* ---------- 지도 도구 ---------- */
/* 마을로 바꾼다: 건물 층수를 낮추고 종류를 정한다. 블록마다 같은 층수 */
function landVillage(c0,fmax,ks){const B=new Map();
  for(let r=0;r<N;r++)for(let c=c0;c<N;c++){const x=G.map[r][c];if(x.t!=='bldg')continue;const k=x.blk??key(r,c);
    if(!B.has(k))B.set(k,Math.max(1,Math.min(fmax(c,r),x.f||1)));x.f=B.get(k);x.bmax=8+x.f*3;x.bhp=x.bmax;if(ks)x.ks=ks(x,c,r);}}
/* 상륙 지점: 행 r0~r1에서 바다를 따라 동쪽으로 가다 처음 닿는 땅 칸 */
function landSecTiles(r0,r1,cmax){const out=[];for(let r=Math.max(0,r0);r<=Math.min(N-1,r1);r++){let c=0;while(c<N&&G.map[r][c].sea)c++;
    if(c<=0||c>=N||(cmax!=null&&c>cmax))continue;const x=G.map[r][c];if(x.t==='water'||x.t==='bldg')continue;out.push([r,c]);}return out;}
function landSecDef(n,sub,r0,r1,o){return {n,sub,r0,r1,tl:landSecTiles(r0,r1,o&&o.cmax),...(o||{})};}
/* 썰물에 드러나는 갯벌: 땅에서 3칸 안의 바다 */
function landMudRing(R){for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=G.map[r][c];if(!x.sea)continue;
    let near=false;for(let a=r-R;a<=r+R&&!near;a++)for(let b=c-R;b<=c+R;b++)if(inb(a,b)&&!G.map[a][b].sea){near=true;break;}if(near)x.mudz=1;}}
/* 정해진 자리에 부대를 놓는다(벙커 안 등) */
function landPutAt(n,type,x,z,o){const u=campPut(n,type,Math.floor(z),Math.floor(x),{bldg:false,...(o||{})});if(!u)return null;
  if(u.r===Math.floor(z)&&u.c===Math.floor(x)){u.x=x;u.z=z;}return u;}
/* 차를 막는 길막이: 남북으로 세 개를 붙여 동서 길을 막는다 */
function landBlock(n,x,r){for(const dz of [.17,.5,.83])campFort(n,'jersey',x,r+dz,Math.PI/2);}
/* 해변 장애물(체코 고슴도치): 줄마다 듬성듬성 */
function landHedge(x0,rows,step){for(const r of rows)for(let z=r+.3;z<r+1;z+=step)campFort(1,'hedgehog',x0+((z*7.3)%1)*.5,z,((z*3.1)%1)*Math.PI);}
/* 지휘 방식: 설정 화면의 '지휘 방식'(기본 부관 지휘)을 따른다 */
function landCmdAuto(){if(typeof document==='undefined')return false;const el=document.getElementById('opt-cmd');let v=el?el.value:null;
  if(!v){try{v=localStorage.getItem('triad-cmd');}catch(e){}}return v?v==='auto':true;}
function landAfter(){if(landCmdAuto()&&typeof autoSet==='function')autoSet(0,true);}

/* ---------- 상륙 지점 ---------- */
function landSecOpen(i){const C=G.camp,s=C&&C.secs&&C.secs[i];if(!s)return false;if(s.tide&&C.st.low)return false;
  if(s.need!=null){const o=G.objs[s.need];if(G.map[o.r][o.c].owner!==0)return false;}return true;}
function landSec(){const C=G.camp;if(landSecOpen(C.sec))return C.sec;return C.secs.findIndex((s,j)=>landSecOpen(j));}
function landPick(i,ai){if(!landOn()||!landSecOpen(i))return false;if(!ai)G.camp.secMan=1;else if(G.camp.sec===i)return true;G.camp.sec=i;if(ai){campMsg(`다음 상륙 지점: ${G.camp.secs[i].n}`);return true;}if(typeof toast==='function')toast(`다음 상륙 지점: ${G.camp.secs[i].n}`);if(typeof render==='function')render();return true;}
function landBusy(){const s=new Set(G.units.map(u=>key(u.r,u.c)));for(const b of G.camp.boats||[])if(b.st==='in'||b.st==='un')s.add(key(b.r,b.c));return s;}
function landSpots(type){const i=landSec();if(i<0)return [];const busy=landBusy();
  return G.camp.secs[i].tl.filter(([r,c])=>!busy.has(key(r,c))&&mcost(type,G.map[r][c])<Infinity).map(([r,c])=>key(r,c));}
/* 증원은 바다로 온다: 배치 칸 = 지금 상륙 지점의 물가. 산 부대는 상륙정에 실려 온다(공중 부대는 바로 날아온다) */
{const _ds=deploySpots;deploySpots=function(n,type){if(!landOn()||n!==0)return _ds(n,type);return landSpots(type);};}
{const _b=buy;buy=function(n,type,r,c){if(!landOn()||n!==0||UT[type].fly)return _b(n,type,r,c);const N2=G.nats[n],t=UT[type];
  if(N2.cp<t.cost||!deploySpots(n,type).includes(key(r,c)))return null;
  N2.cp-=t.cost;N2.bought=(N2.bought||0)+1;landBoat(type,r,c,0);L(`${natName(n)} ${t.n} 상륙정 출발 (${G.camp.secs[landSec()]?.n||''})`);try{sfx('build');}catch(e){}
  return {id:0,boat:1,type,nat:n,face:0};};}
/* 차량이 절벽을 못 오른다: 출구 길로만 해변을 벗어난다 */
{const _mc=mcost;mcost=function(type,x){if(x.bluff){const t=UT[type];if(!t.fly&&t.cls==='veh')return Infinity;}return _mc(type,x);};}
/* 다른 판을 시작하면 세력 이름을 되돌린다(campStart는 newGame 뒤에 다시 바꾼다) */
{const _n=newGame;newGame=function(cfg){campNames(null);return _n(cfg);};}

/* ---------- 상륙정 ---------- */
function landBoat(type,r,c,lag){const C=G.camp;const veh=UT[type].cls==='veh';const k=veh?'lcm':'lcvp';const x=G.map[r][c];
  const ul=x.wall?(veh?6:6):veh?3:2;   // 안벽은 사다리를 걸고 오른다
  const b={id:(C.bid=(C.bid||0)+1),k,t:type,r,c,z:r+.5,tx:c-(veh?.62:.42),x:-1.6-(lag||0),st:'in',dmg:0,hp:BOAT[k].hp,ul,w:0};
  (C.boats=C.boats||[]).push(b);return b;}
/* 예정된 상륙파: sec = 지점 번호 | 'pick'(플레이어가 고른 곳) | 'all'(열린 해변 모두에 나눠서) */
function landWave(w){const C=G.camp;let secs=w.sec==='all'?C.secs.map((s,i)=>i).filter(i=>!C.secs[i].noAll):[w.sec==null||w.sec==='pick'?landSec():w.sec];
  secs=secs.filter(i=>i>=0&&landSecOpen(i));if(!secs.length)return false;const busy=landBusy();const per=Math.ceil(w.u.length/secs.length);
  w.u.forEach((t,j)=>{const si=secs[j%secs.length],q=Math.floor(j/secs.length);const tl=C.secs[si].tl.filter(([r,c])=>!busy.has(key(r,c))&&mcost(t,G.map[r][c])<Infinity);if(!tl.length)return;
    const [r,c]=tl[Math.min(tl.length-1,Math.floor((q+.5)/per*tl.length))];busy.add(key(r,c));landBoat(t,r,c,q*1.4+(j%secs.length)*.35);});
  if(w.msg)campMsg(w.msg);return true;}
function landFoes(){return G.units.filter(e=>e.nat!==0&&!UT[e.type].fly&&BOAT_HIT[e.type]&&e.hp>0);}
/* 해안의 적이 상륙정을 쏜다 */
function landFire(C,b,foes){const S=C.st;
  let smk=false;for(let c=Math.max(0,Math.floor(b.x));c<=Math.min(N-1,b.c+2);c++){const y=G.map[b.r][c];if(y&&y.smoke>0){smk=true;break;}}
  for(const e of foes){const R=BOAT_RNG[e.type]||8;const d=Math.hypot(e.x-b.x,e.z-b.z);if(d>R)continue;
    let p=BOAT_HIT[e.type]*(d>R*.6?.55:1)*(e.supp>0?.35:1)*(smk?.3:1)*(typeof bunkerAt==='function'&&bunkerAt(e.x,e.z)?1.25:1);
    if(e.am!=null&&typeof amFrac==='function'&&amFrac(e)<=0)p=0;
    if(Math.random()>=p)continue;b.dmg++;
    try{if(Math.random()<.5)FXH.fire(e,b.r,Math.max(0,Math.floor(b.x)),{x:b.x,z:b.z,r:b.r,c:Math.max(0,Math.floor(b.x)),type:'hmv',nat:0,hp:1,id:-b.id});}catch(err){}
    if(typeof FXH.splash==='function')FXH.splash(b.x+(Math.random()-.5)*.5,b.z+(Math.random()-.5)*.5,UT[e.type].ex||UT[e.type].ind?1:0);
    if(b.dmg>=b.hp){b.st='sink';b.w=4;S.sunk=(S.sunk||0)+1;G.nats[0].losses++;if(G.nats[1])G.nats[1].kills++;
      campMsg(`${BOAT[b.k].n}이 가라앉았습니다: ${UT[b.t].n} 손실`);if(typeof FXH.splash==='function')FXH.splash(b.x,b.z,2);try{sfx('boom',.8,b.x,b.z);}catch(err){}break;}}}
/* 땅에 닿아 내린다: 상륙정이 맞은 만큼 타고 온 병사가 다쳐 있다 */
function landUnload(C,b){const u=campPut(0,b.t,b.r,b.c,{bldg:false});if(!u)return null;u.face=0;u.x=Math.max(b.c+.2,Math.min(b.c+.8,u.x));
  C.st.landed=(C.st.landed||0)+1;if(b.dmg>0)harm(u,u.hp*Math.min(.7,b.dmg/b.hp*(UT[b.t].cls==='veh'?.5:.85)),null,{});
  // 직접 지휘라도 물가에 서 있지 않게: 보병은 몇 걸음 올라가 엎드린다(자연스러운 첫 행동)
  if(G.units.includes(u)&&UT[u.type].cls==='inf'&&!G.nats[0].auto&&typeof orderMoveTo==='function'){const tx=Math.min(N-.5,u.x+1.6);const y=tileAt(tx,u.z);if(y&&y.t!=='water')try{orderMoveTo(u,tx,u.z);}catch(e){}}
  if(typeof FXH.land==='function')try{FXH.land(u);}catch(e){}return u;}
/* 공병: 가까운 해변 장애물로 가서 걷어 낸다(8초, 제압당하면 느리게) */
function landClearTick(dt){const F=(G.forts||[]).filter(f=>f.nat!==0&&LAND_CLR[f.k]&&f.prog>=1);if(!F.length)return;const C=G.camp;
  for(const u of G.units){if(u.nat!==0||u.type!=='eng')continue;let best=null,bd=3.5;for(const f of F){const d=Math.hypot(f.x-u.x,f.z-u.z);if(d<bd){bd=d;best=f;}}
    if(!best){u._clr=0;continue;}const moving=u.path&&u.path.length;
    if(bd>.9){if(!moving&&!u.hold&&!u.man&&(G.time||0)-(u._clrGo||0)>4){u._clrGo=G.time||0;try{orderMoveTo(u,best.x-.25,best.z);}catch(e){}}continue;}
    if(moving)continue;if(u._clrF!==best.id){u._clrF=best.id;u._clr=0;}u._clr=(u._clr||0)+dt*(u.supp?.5:1);
    if(u._clr>=8){u._clr=0;fortRemove(best,'clear');C.st.clr=(C.st.clr||0)+1;if(C.st.clr===1||C.st.clr%5===0)campMsg(`공병이 해변 장애물을 걷어 냈습니다 (${C.st.clr}개)`);}}}
/* 구축함 함포: 해안 가까이 보이는 적(벙커 안 화기 먼저)을 친다. 아군이 붙어 있으면 쏘지 않는다 */
function landNaval(C,M,S){const nv=M.naval;if(!nv||G.time<nv.t0||G.time<(S.navT||0))return;const pre=nv.pre&&G.time<nv.pre;
  const V=visSet(0),vs={has:k=>pre||V.has(k)};const lim=pre?nv.preX:C.shore+nv.reach;
  const safe=(x,z)=>!G.units.some(o=>o.nat===0&&!UT[o.type].fly&&Math.hypot(o.x-x,o.z-z)<1.8);let best=null,bs=0;
  for(const e of G.units){if(e.nat===0||UT[e.type].fly||e.x>lim)continue;if(!vs.has(key(Math.floor(e.z),Math.floor(e.x)))||!safe(e.x,e.z))continue;
    const s=(typeof bunkerAt==='function'&&bunkerAt(e.x,e.z)?3:1)+({mg:1.5,at:1.2,tank:1.6,mortar:1.2,ifv:1,spg:1.4}[e.type]||.6)+Math.random();if(s>bs){bs=s;best=[e.x,e.z];}}
  for(const f of G.forts||[]){if(f.nat===0||(f.k!=='bunker'&&f.k!=='nest')||f.x>lim)continue;if(!vs.has(key(Math.floor(f.z),Math.floor(f.x)))||!safe(f.x,f.z))continue;
    const s=(f.k==='bunker'?2.2:1.4)+Math.random();if(s>bs){bs=s;best=[f.x,f.z,1];}}
  if(!best){S.navT=G.time+4;return;}S.navT=G.time+(pre?nv.preEvery:nv.every);const [tx,tz,fx]=best;const sp=fx?.3:.6;
  for(let i=0;i<nv.n;i++){const s=shellLaunch({x0:-5,z0:tz+(i-nv.n/2)*.9,h0:3,tx:tx+(Math.random()-.5)*sp,tz:tz+(Math.random()-.5)*sp,n:0,src:null,type:'spg',pw:nv.pw||1.6,spread:fx?.25:.45,delay:.5+i*.7,T:2.6,ap:6});s.off=1;}
  if(typeof FXH.naval==='function')FXH.naval(tx,tz,nv.n);
  if(!S.navMsg){S.navMsg=1;campMsg(nv.msg||'구축함이 해안 가까이 들어와 함포 사격을 시작합니다');}}
/* AI가 상륙 지점을 고른다(관전, 또는 부관 지휘에서 플레이어가 아직 직접 고르지 않았을 때).
   적 화기가 적고, 아군이 이미 연 출구·거점 옆이고, 남은 목표에 가까운 해변을 고른다 */
function landAiPick(C){const n0=G.nats[0];if(!(isAI(0)||(n0.auto&&!C.secMan)))return;
  const O=G.objs,foes=G.units.filter(e=>e.nat!==0&&!UT[e.type].fly),mine=G.units.filter(u=>u.nat===0&&!UT[u.type].fly);
  let pm=null;try{pm=typeof planMainOf==='function'?planMainOf(0):null;}catch(e){}
  const todo=O.filter((o,i)=>!ownObj(i));let best=-1,bs=-1e9;
  C.secs.forEach((s,i)=>{if(!landSecOpen(i)||!s.tl.length)return;const [r,c]=s.tl[Math.floor(s.tl.length/2)];const x=c+2.5,z=(s.r0+s.r1)/2+.5;const half=(s.r1-s.r0)/2+2;
    const near=(px,pz,R)=>Math.abs(pz-z)<=half&&px-x<=R&&px-x>=-2;
    let sc=-foes.filter(e=>near(e.x,e.z,7)).length*1.2-(G.forts||[]).filter(f=>f.nat!==0&&f.k==='bunker'&&near(f.x,f.z,7)).length*1.5;
    sc+=Math.min(6,mine.filter(u=>near(u.x,u.z,8)).length)*.35;
    O.forEach((o,j)=>{if(Math.abs(o.r+.5-z)<=half&&o.c-x<9){sc+=ownObj(j)?3:1;}});
    if(todo.length)sc-=Math.min(...todo.map(o=>Math.hypot(o.c-x,o.r-z)))*.12;
    if(pm&&pm.x!=null)sc-=Math.hypot(pm.x-x,pm.z-z)*.15;   // 06i-plan의 주공 목표 쪽 해변
    if(s.need!=null)sc+=4;   // 부두는 안벽보다 빨리 내린다
    if(i===C.sec)sc+=1;      // 자주 바꾸지 않게
    if(sc>bs){bs=sc;best=i;}});
  if(best>=0)landPick(best,true);}
function landTick(C,dt){const M=CAMP[C.id],S=C.st;C.boats=C.boats||[];
  C._apT=(C._apT||0)+dt;if(C._apT>=15||(G.time||0)<.2){C._apT=0;landAiPick(C);}
  if(M.tide)M.tide(C,S);
  S.lw=S.lw||{};for(const w of M.lw||[]){if(S.lw[w.t]||G.time<w.t)continue;if(landWave(w))S.lw[w.t]=1;}
  C._ht=(C._ht||0)+dt;const shoot=C._ht>=.5;if(shoot)C._ht=0;let foes=null;
  for(const b of C.boats){const v=BOAT[b.k].v;
    if(b.st==='in'){b.x=Math.min(b.tx,b.x+v*dt);if(b.x>=b.tx-1e-3){b.st='un';b.w=b.ul;}}
    else if(b.st==='un'){b.w-=dt;if(b.w<=0){landUnload(C,b);b.st='out';b.w=0;}}
    else if(b.st==='out'){b.x-=v*.8*dt;if(b.x<-2)b.gone=1;}
    else if(b.st==='sink'){b.w-=dt;if(b.w<=0)b.gone=1;}
    if(shoot&&(b.st==='in'||b.st==='un')&&b.x>b.tx-10){foes=foes||landFoes();landFire(C,b,foes);}}
  C.boats=C.boats.filter(b=>!b.gone);
  landClearTick(dt);landNaval(C,M,S);
  C._rsT=(C._rsT||0)+dt;if(C._rsT>=.5){C._rsT=0;landRush();}
  // 상륙정이 오는 중이거나 남은 상륙파가 있으면 '아군 전멸'로 끝내지 않는다
  if(C.boats.some(b=>b.st==='in'||b.st==='un')||(M.lw||[]).some(w=>!S.lw[w.t]))G.nats[0].emptyT=null;}

/* ---------- 화면: 상륙 지점 고르기 ---------- */
function landPanel(C){const S=C.st,M=CAMP[C.id];const nw=(M.lw||[]).find(w=>!(S.lw&&S.lw[w.t]));const inb=(C.boats||[]).filter(b=>b.st==='in'||b.st==='un').length;
  const bt=C.secs.map((s,i)=>`<button class="btn lsec${C.sec===i?' on':''}" data-act="land:${i}" ${landSecOpen(i)?'':'disabled'} title="${s.sub||''}">${s.n}</button>`).join('');
  const wait=nw?(G.time<nw.t?`다음 상륙파 ${fmtT(nw.t-G.time)} 뒤`:'다음 상륙파: 물때를 기다리는 중'):'예정된 상륙파 없음';
  return `<div class="lpan"><span class="lrow"><span class="lk">상륙 지점</span>${bt}</span><small>${wait}${inb?` · 오는 상륙정 ${inb}척`:''}${S.sunk?` · 침몰 ${S.sunk}척`:''}</small></div>`;}
function landLabels(C,S,want){(C.secs||[]).forEach((s,i)=>{if(!s.tl.length)return;const [r,c]=s.tl[Math.floor(s.tl.length/2)];const on=C.sec===i,op=landSecOpen(i);
    want.set('land-s'+i,{html:`<span>${s.n}${on?' · 다음 상륙':''}${op?'':' · 닫힘'}</span>`,cls:'v3c',col:on?'#f0c45a':op?'#9fc3d6':'#7d8790',p:[c+.5,.45,r+.5]});});}
const ownObj=i=>{const o=G.objs[i];return !!o&&G.map[o.r][o.c].owner===0;};

/* ===================== 임무 1: 오마하 ===================== */
CAMP.omaha={no:1,op:'landing',land:1,n:'피의 오마하',kind:'해안 상륙',when:'1944년 6월 6일 06:30 · 노르망디 오마하 해변',seed:61944,limit:18*60,hour:6.5,
  nats:[{name:'연합군',full:'연합군 제1보병사단'},{name:'독일군',full:'독일군 제352보병사단'}],
  brief:['D-Day. 연합군이 노르망디 해안 다섯 곳에 동시에 상륙합니다. 그중 오마하는 절벽 위 저항 거점이 해변 전체를 내려다보는 가장 험한 해변입니다. 새벽 함포 사격과 폭격은 대부분 빗나갔고, 벙커들은 멀쩡합니다.',
    '해변에서 절벽 위로 올라가는 길은 골짜기 출구 세 곳(D-1·E-1·F-1)뿐이고, 차량은 이 출구로만 해변을 벗어날 수 있습니다. 출구마다 벙커와 기관총 진지가 지키고, 길은 콘크리트 방벽으로 막혀 있습니다. 출구 두 곳을 열고 생로랑 마을을 점령하면 교두보가 섭니다.',
    '상륙파는 정해진 시각에 옵니다. 오른쪽 위 목표 창에서 다음 상륙파가 내릴 해변(도그·이지·폭스)을 고르세요. 증원을 사면 그 부대도 상륙정에 실려 같은 해변으로 옵니다. 부관 지휘(기본)라면 내린 부대는 알아서 목표로 나아갑니다.'],
  goals:['해변에 상륙하기','절벽 출구 두 곳 열기 (D-1·E-1·F-1 중)','생로랑 마을 점령'],
  intel:'벙커 6곳(출구마다 둘)과 기관총 진지, 절벽 위 박격포가 해변을 쏩니다. 물가 앞 모래밭엔 대전차 고슴도치가 늘어서 있어 차량이 돌아가야 합니다. 마을엔 예비대와 전차가 있고, 5분쯤부터 내륙에서 작은 반격이 옵니다. 상륙정은 해안 화기에 맞으면 다치거나 가라앉습니다. 해변에 연막을 치거나 적을 제압하면 덜 맞습니다. 30초 뒤부터 구축함이 해안에 바짝 붙어 보이는 벙커·진지를 함포로 부숩니다. 해변에 멈추지 말고 절벽 밑까지 뛰어가세요.',
  force:'1파: 소총분대 6 · 공병 3 · 기관총팀 · 전차 3 (해변 셋에 나눠서), 40초 뒤 2파 8개 부대. 그 뒤 1~2분마다 상륙파 7개가 정해진 시각에 옵니다(증원을 사지 않아도 이길 만큼). 부대는 시대 장비 대신 이 게임의 현대 부대로 재현합니다.',
  stars:['임무 성공','출구 세 곳 모두 열기','12분 안에 끝내기'],
  // 실제 오마하: 첫날 3만 4천 명이 내렸고 해변을 지킨 독일군은 2천 명 안팎이었다. 해변을 연 것은 수와 끈질긴 상륙파, 그리고 해안에 바짝 붙은 구축함 포격이었다.
  naval:{t0:30,every:14,n:4,reach:12,pw:3},after:landAfter,
  lw:[{t:0,sec:'all',u:['rifle','eng','tank','rifle','eng','tank','rifle','eng','tank','rifle','rifle','mg','rifle'],msg:'H시: 1파 상륙정이 해변으로 갑니다'},
    {t:40,sec:'all',u:['rifle','rifle','mg','at','rifle','eng','rifle','tank'],msg:'2파가 출발했습니다'},
    {t:100,sec:'pick',u:['rifle','rifle','mortar','at','mg','rifle'],msg:'3파가 출발했습니다'},
    {t:170,sec:'pick',u:['rifle','rifle','eng','tank','tank','rifle'],msg:'4파가 출발했습니다'},
    {t:250,sec:'pick',u:['rifle','mg','at','rifle','sniper','rifle'],msg:'5파가 출발했습니다'},
    {t:340,sec:'pick',u:['rifle','rifle','ifv','sup','amb'],msg:'6파가 출발했습니다: 보급·구급 차량'},
    {t:430,sec:'pick',u:['tank','ifv','rifle','rifle','at','tank'],msg:'7파가 출발했습니다'},
    {t:530,sec:'pick',u:['rifle','rifle','mg','tank','rifle'],msg:'8파가 출발했습니다'},
    {t:650,sec:'pick',u:['rifle','rifle','ifv','tank'],msg:'9파가 출발했습니다'}],
  waves:[{t:300,side:'e',u:['rifle','mg'],msg:'독일군 예비대가 내륙에서 다가옵니다'},
    {t:520,side:'e',u:['rifle','at','rifle']},
    {t:720,side:'e',u:['tank','rifle'],msg:'독일군 전차가 반격합니다'}],
  income:n=>n===0?6:0};
const OMAHA={SAND:10,BL:15,TOWN:18};
const omahaDraws=()=>[9,campMid(),N-10];
CAMP.omaha.setup=function(){const {SAND,BL,TOWN}=OMAHA;const D=omahaDraws();
  for(let r=0;r<N;r++)for(let c=0;c<TOWN;c++)campCell(r,c,c<SAND?{t:'water',sea:1}:c<BL?{t:'plaza',sand:1}:{t:'park',bluff:1,yard:1});
  // 골짜기 출구(draw)는 세 칸 너비: 가운데 길 + 양옆 완만한 풀밭(절벽 아님). 한 칸 길이면 차량이 줄줄이 막혔다
  for(const r of D){for(const dr of [-1,1])for(let c=BL;c<TOWN;c++)if(inb(r+dr,c))campCell(r+dr,c,{t:'park',yard:1,draw:1});
    for(let c=BL;c<TOWN;c++)campCell(r,c,{t:'road',ro:'h',rw:1,draw:1});
    let c=TOWN,k=0;while(inb(r,c)&&k++<10&&G.map[r][c].t!=='road'){campCell(r,c,{t:'road',ro:'h',rw:1});c++;}}
  landVillage(TOWN,c=>c<30?2:3,(x,c)=>x.f<=2?'house':'villa');
  G.props=(G.props||[]).filter(p=>p.x>=TOWN+.05);
  const m=campMid();// 마을 거점은 건물 안이 아니라 마을 한가운데 길목(교차로): 건물 칸이면 보병이 문을 못 찾아 둘레에 몰려 있기만 하고 끝내 못 잡는 판이 나왔다
  const town=campNear(m+3,TOWN+6,(r,c,x)=>(x.t==='road'||x.t==='plaza')&&Math.abs(r-m)>1&&[[0,1],[0,-1],[1,0],[-1,0]].some(([a,b])=>inb(r+a,c+b)&&G.map[r+a][c+b].t==='bldg'),9)||campNear(m+3,TOWN+6,(r,c,x)=>x.t==='bldg'&&Math.abs(r-m)>1,9)||[m+3,TOWN+6];
  campObjs([{r:D[0],c:BL+1,name:'D-1 출구 (비에르빌)',owner:1},{r:D[1],c:BL+1,name:'E-1 출구 (생로랑)',owner:1},{r:D[2],c:BL+1,name:'F-1 출구 (콜빌)',owner:1},{r:town[0],c:town[1],name:'생로랑 마을',owner:1}]);
  const C=G.camp;C.boats=[];C.shore=SAND;C.sec=1;
  C.secs=[landSecDef('도그 비치','북쪽 · D-1 출구 앞',1,D[0]+7),landSecDef('이지 비치','가운데 · E-1 출구 앞',D[0]+8,D[1]+8),landSecDef('폭스 비치','남쪽 · F-1 출구 앞',D[1]+9,N-2)];
  C.st={exits:0,allEx:0,landed:0,sunk:0,exo:{}};};
CAMP.omaha.units=function(){const {SAND,BL}=OMAHA;const D=omahaDraws();const m=campMid();
  for(const r of D){   // 출구마다 저항 거점: 벙커 둘, 기관총 진지 둘, 길막이
    const b1=campFort(1,'bunker',BL+1.5,r-1.5,Math.PI/2),b2=campFort(1,'bunker',BL+1.5,r+2.5,Math.PI/2);
    const n1=campFort(1,'nest',BL+.5,r-3.5,Math.PI/2),n2=campFort(1,'nest',BL+.5,r+4.5,Math.PI/2);
    for(const dr of [-1,0,1])landBlock(1,BL+.45,r+dr);
    if(b1)landPutAt(1,'mg',b1.x,b1.z,{post:1});if(b2)landPutAt(1,'at',b2.x,b2.z,{post:1});
    if(n1)landPutAt(1,'mg',n1.x,n1.z,{post:1});if(n2)landPutAt(1,'rifle',n2.x,n2.z,{post:1});
    if(r===m)landPutAt(1,'mortar',BL+3.5,r+2.5,{post:1});landPutAt(1,'rifle',BL+2.5,r+.5,{});}
  // 출구 사이 절벽 위 진지
  for(const r of [Math.round((D[0]+D[1])/2),Math.round((D[1]+D[2])/2)]){const n=campFort(1,'nest',BL+.6,r+.5,Math.PI/2);if(n)landPutAt(1,'mg',n.x,n.z,{post:1});landPutAt(1,'rifle',BL+1.5,r+2.5,{post:1});}
  // 해변 장애물과 철조망(사이사이 틈)
  const rows=[];for(let r=1;r<N-1;r++)if(D.every(d=>Math.abs(d-r)>1))rows.push(r);   // 출구 앞 세 줄은 공병이 미리 낸 통로
  landHedge(SAND+1.2,rows.filter(r=>r%2===0),.9);landHedge(SAND+2.7,rows.filter(r=>r%2===1),.9);
  for(const r of rows)if(r%4!==1&&D.every(d=>Math.abs(d-r)>1))campFort(1,'wire',BL-.3,r+.5,Math.PI/2);
  for(const r of D)for(const dz of [-1.5,2.5])campFort(1,'mine',BL-.8,r+dz,0);
  // 마을: 예비대
  const t=G.objs[3];campPut(1,'rifle',t.r,t.c,{bldg:true,post:1});campPut(1,'sniper',t.r-2,t.c,{bldg:true,post:1});campPut(1,'mg',t.r+1,t.c-1,{bldg:false,post:1});
  campPut(1,'rifle',t.r-3,t.c+2,{bldg:false});campPut(1,'at',t.r+3,t.c+1,{bldg:false});campPut(1,'tank',t.r,t.c+4,{bldg:false});campPut(1,'rifle',m-12,BL+8,{bldg:false});campPut(1,'rifle',m+12,BL+8,{bldg:false});
  G.nats[0].cp=8;G.nats[1].cp=0;};
/* 출구의 길막이(콘크리트 방벽): 출구를 점령하고 10초 지나면 공병·불도저가 치운다 */
const omahaBlocks=i=>{const o=G.objs[i];return (G.forts||[]).filter(f=>f.k==='jersey'&&f.nat!==0&&Math.abs(f.z-o.r-.5)<1.6&&Math.abs(f.x-o.c)<2.2);};
CAMP_TICK.omaha=function(C,S,dt){const O=G.objs;let ex=0;S.exT=S.exT||{};
  for(let i=0;i<3;i++)if(ownObj(i)){ex++;if(!S.exo[i]){S.exo[i]=1;campMsg(`${O[i].name} 확보${omahaBlocks(i).length?': 10초 뒤 길막이를 치우면 차량이 이 길로 해변을 벗어납니다':': 이 길로 차량이 해변을 벗어날 수 있습니다'}`);}
    S.exT[i]=(S.exT[i]||0)+dt;const bl=omahaBlocks(i);if(bl.length&&S.exT[i]>=10){for(const f of bl)fortRemove(f,'clear');campMsg(`${O[i].name} 길막이를 치웠습니다: 차량이 해변을 벗어납니다`);}}
  S.exits=ex;if(ex===3)S.allEx=1;
  // 해변에 멈춘 차량은 열린 출구 중 가까운 곳으로 올라간다(갈 데가 없으면 해변에서 기다린다)
  S.vT=(S.vT||0)+dt;if(S.vT>=3){S.vT=0;const open=[0,1,2].filter(i=>ownObj(i)&&!omahaBlocks(i).length);
    if(open.length)for(const u of G.units){if(u.nat!==0||UT[u.type].fly||UT[u.type].cls!=='veh'||u.hold||(u.path&&u.path.length))continue;if(u.x>=OMAHA.BL)continue;
      const i=open.reduce((a,b)=>Math.abs(O[b].r-u.z)<Math.abs(O[a].r-u.z)?b:a);try{orderMoveTo(u,OMAHA.TOWN+1.5,O[i].r+.5);}catch(e){}}}
  if(ownObj(3)&&ex>=2)G.over={win:0,why:'교두보 확보'};};
CAMP.omaha.stars2=(C,S,win,t)=>[win,win&&!!S.allEx,win&&t<=720];
CAMP.omaha.obj=function(C,S,li){const ex=S.exits||0;
  return `<ul class="cobj">${[li(S.landed?'ok':'',`해변 상륙 · 내린 부대 ${S.landed||0}`),li(ex>=2?'ok':'',`절벽 출구 열기 ${ex}/3 (두 곳 필요)`),li(ownObj(3)?'ok':'','생로랑 마을 점령')].join('')}</ul>${landPanel(C)}`;};
CAMP.omaha.labels=landLabels;

/* ===================== 임무 2: 인천 ===================== */
CAMP.incheon={no:2,op:'landing',land:1,n:'크로마이트',kind:'조수 상륙',when:'1950년 9월 15일 06:30 · 인천 월미도와 시가지',seed:91550,limit:20*60,hour:6.5,
  nats:[{name:'유엔군',full:'유엔군 제1해병사단'},{name:'북한군',full:'북한군 인천 수비대'}],
  brief:['낙동강까지 밀린 전쟁을 뒤집을 한 수. 인천 앞바다는 조수 간만 차가 커서, 상륙정이 들어올 수 있는 건 아침과 저녁 만조 몇 시간뿐입니다. 썰물이 되면 넓은 갯벌이 드러나 바다로는 아무것도 오지 못합니다.',
    '아침 만조에 먼저 항구 앞 섬 월미도를 빼앗습니다(그린 비치). 썰물 동안 월미도의 부대는 홀로 버텨야 합니다. 월미도는 둑길 하나로 항구와 이어져 있습니다.',
    '저녁 만조가 오면 시가지 북쪽 레드 비치와 남쪽 블루 비치로 주력이 올라갑니다. 해안은 모래밭이 아니라 높은 안벽이라 사다리를 걸고 올라야 해서 내리는 데 시간이 걸립니다. 인천항 부두를 점령하면 물때와 상관없이 부두로 증원을 받을 수 있습니다. 응봉산 관측소와 서울로 가는 경인가도 입구를 점령하고 월미도를 지키면 작전 성공입니다.'],
  goals:['아침 만조: 월미도 점령','썰물 동안 월미도 지키기 (90초 넘게 빼앗기면 실패)','저녁 만조: 응봉산과 경인가도 입구 점령','(선택) 인천항 부두 점령: 언제든 부두로 증원'],
  intel:'월미도엔 벙커와 기관총 진지, 해안포 대신 대전차팀과 박격포가 있습니다. 둑길 끝은 콘크리트 방벽으로 막혀 있습니다. 안벽 위 기관총이 레드·블루 비치를 내려다보고, 응봉산엔 박격포가 있습니다. 썰물 때 북한군 증원과 전차가 항구로 내려옵니다. 처음 1분 동안 함포가 월미도를 두들기고, 그 뒤로도 보이는 해안 진지를 칩니다.',
  force:'아침: 해병 소총분대 5 · 공병 · 기관총팀 · 대전차팀 · 전차 2, 이어서 2파. 저녁 만조: 레드·블루 비치에 상륙파 다섯(증원을 사지 않아도 이길 만큼). 부대는 시대 장비 대신 이 게임의 현대 부대로 재현합니다.',
  stars:['임무 성공','인천항 부두 점령','월미도를 한 번도 빼앗기지 않기'],
  naval:{t0:2,every:25,n:4,reach:14,pre:70,preX:11,preEvery:7,msg:'상륙 전 함포 사격: 함포가 월미도를 두들깁니다'},after:landAfter,
  // 실제 인천: 상륙 첫날 해병 1만 3천 명 대 인천 수비대 2천 명 남짓. 월미도는 한 대대가 45분 만에 빼앗았다.
  lw:[{t:0,sec:2,u:['rifle','rifle','eng','tank','rifle','mg','tank','rifle','at','rifle'],msg:'H시: 해병 3대대가 월미도 그린 비치로 갑니다'},
    {t:100,sec:2,u:['rifle','at','mortar','rifle','mg'],msg:'2파가 그린 비치로 갑니다'},
    {t:545,sec:0,u:['rifle','rifle','eng','mg','at','rifle','rifle','mortar'],msg:'저녁 만조: 해병 5연대가 레드 비치 안벽을 오릅니다'},
    {t:550,sec:3,u:['rifle','rifle','tank','ifv','mg','eng','rifle','tank'],msg:'해병 1연대가 블루 비치로 갑니다'},
    {t:660,sec:'pick',u:['tank','ifv','rifle','rifle','sup','amb'],msg:'다음 상륙파가 출발했습니다: 보급·구급 차량'},
    {t:780,sec:'pick',u:['rifle','rifle','at','mortar','tank'],msg:'다음 상륙파가 출발했습니다'},
    {t:900,sec:'pick',u:['rifle','rifle','mg','tank','ifv'],msg:'다음 상륙파가 출발했습니다'}],
  waves:[{t:300,side:'e',u:['rifle','mg'],msg:'썰물: 북한군 증원이 항구로 내려옵니다'},
    {t:460,side:'e',u:['tank','rifle']},
    {t:680,side:'e',u:['rifle','at','rifle'],msg:'북한군 증원이 시가지로 들어옵니다'},
    {t:900,side:'e',u:['tank','rifle']}],
  income:n=>n===0?5:0};
const INCH={COAST:13};
CAMP.incheon.setup=function(){const {COAST}=INCH;const m=campMid();
  for(let r=0;r<N;r++)for(let c=0;c<COAST;c++)campCell(r,c,{t:'water',sea:1});
  // 월미도: 서쪽은 모래(그린 비치), 가운데는 숲 언덕, 남쪽에 기름 창고
  const isl=(r,c)=>((c-6.2)/3.4)**2+((r-(m-.5))/5.2)**2<=1;
  for(let r=m-6;r<=m+5;r++){let first=true;for(let c=1;c<COAST;c++){if(!isl(r,c))continue;campCell(r,c,first?{t:'plaza',sand:1}:{t:'park',isl:1,yard:1});first=false;}}
  for(const [r,c] of [[m+3,7],[m+3,8]])if(G.map[r][c].isl)campCell(r,c,{t:'bldg',f:1,bmax:11,bhp:11,blk:90001,ks:'ware',isl:1});
  // 둑길: 월미도 동쪽 끝에서 안벽까지
  // 둑길은 두 줄(차가 엇갈려 지나간다): 한 줄이면 섬에 내린 차량이 줄지어 막혔다
  for(const r of [m-1,m]){let c=COAST-1;while(c>0&&!G.map[r][c].isl){campCell(r,c,{t:'road',ro:'h',rw:1,cau:1});c--;}}
  // 안벽과 부두 앞마당
  for(let r=0;r<N;r++){campCell(r,COAST,r===m||r===m-1?{t:'road',ro:'h',rw:1}:{t:'plaza',pier:1,wall:1});
    for(const c of [COAST+1,COAST+2])if(G.map[r][c].t!=='road')campCell(r,c,{t:'plaza',pier:1});}
  // 북쪽 잔교(부두): 바다로 두 칸 나간다
  const P0=m-9;for(let r=P0;r<=P0+2;r++)for(const c of [COAST-2,COAST-1])campCell(r,c,{t:'plaza',pier:1});
  // 응봉산: 시가지 북쪽 숲 언덕
  for(let r=m-12;r<=m-8;r++)for(let c=24;c<=28;c++)if(inb(r,c))campCell(r,c,{t:'park',hill:1,yard:1});
  landVillage(COAST+3,c=>c<COAST+8?1:c<30?3:4,(x,c)=>c<COAST+8?'ware':x.f<=2?'house':'shop');
  G.props=(G.props||[]).filter(p=>p.x>=COAST+3.05&&!(G.map[Math.floor(p.z)]&&G.map[Math.floor(p.z)][Math.floor(p.x)]&&G.map[Math.floor(p.z)][Math.floor(p.x)].hill));
  const gy=campNear(m,N-6,(r,c,x)=>x.t==='road',6)||[m,N-6];
  campObjs([{r:m-1,c:6,name:'월미도',owner:1},{r:P0+1,c:COAST+1,name:'인천항 부두',owner:1},{r:m-10,c:26,name:'응봉산 관측소',owner:1},{r:gy[0],c:gy[1],name:'경인가도 입구',owner:1}]);
  landMudRing(3);for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=G.map[r][c];if(x.cau)x.mudz=0;}
  const C=G.camp;C.boats=[];C.shore=COAST;C.sec=2;
  C.secs=[landSecDef('레드 비치','북쪽 안벽 · 사다리',2,P0-2,{tide:1}),landSecDef('인천항 부두','잔교 · 점령하면 물때 상관없음',P0,P0+2,{need:1,noAll:1}),
    landSecDef('그린 비치','월미도 서쪽 모래밭',m-6,m+5,{tide:1,cmax:6}),landSecDef('블루 비치','남쪽 안벽 · 사다리',m+7,N-3,{tide:1})];
  C.st={tide:'high1',low:0,wl:0,wlost:0,wtaken:0,pier:0,landed:0,sunk:0};};
CAMP.incheon.units=function(){const {COAST}=INCH;const m=campMid();const W=G.objs[0];
  // 월미도 수비대
  for(const [k,x,z,t] of [['bunker',4.6,m-3.2,'mg'],['bunker',5.4,m+2.6,'at'],['nest',7.6,m+.6,'rifle']]){const f=campFort(1,k,x,z,Math.PI/2);if(f)landPutAt(1,t,f.x,f.z,{post:1});}
  landPutAt(1,'mortar',8.5,m-2.5,{post:1});landPutAt(1,'rifle',7.5,m+3.5,{});
  landBlock(1,COAST-.55,m);landBlock(1,COAST-.55,m-1);
  landHedge(3.2,[m-4,m-2,m+1,m+3],1.1);
  // 안벽 위 진지: 레드·블루
  for(const r of [6,11,m+10,m+16]){const f=campFort(1,'nest',COAST+.6,r+.5,Math.PI/2);if(f)landPutAt(1,r%2?'rifle':'mg',f.x,f.z,{post:1});}
  for(const r of [4,9,14,m+8,m+13,m+19])campFort(1,'wire',COAST+1.3,r+.5,Math.PI/2);
  // 부두·시가지·응봉산
  const P=G.objs[1],Y=G.objs[2];campPut(1,'rifle',P.r,P.c+2,{bldg:false,post:1});campPut(1,'mg',P.r+2,P.c+3,{bldg:false,post:1});
  campPut(1,'mortar',Y.r,Y.c,{bldg:false,post:1});campPut(1,'mortar',Y.r+1,Y.c-2,{bldg:false,post:1});campPut(1,'mg',Y.r+2,Y.c,{bldg:false,post:1});campPut(1,'rifle',Y.r-1,Y.c+1,{bldg:false});
  campPut(1,'rifle',m+3,COAST+5,{bldg:true,post:1});campPut(1,'at',m-3,COAST+6,{bldg:false});campPut(1,'rifle',m,COAST+9,{bldg:true});campPut(1,'sniper',m+6,COAST+8,{bldg:true,post:1});
  const E=G.objs[3];campPut(1,'tank',E.r,E.c-2,{bldg:false});campPut(1,'rifle',E.r+1,E.c,{bldg:true,post:1});campPut(1,'at',E.r-1,E.c-1,{bldg:false,post:1});campPut(1,'rifle',m+12,COAST+12,{bldg:false});
  G.nats[0].cp=6;G.nats[1].cp=0;};
CAMP.incheon.tide=function(C,S){const t=G.time||0;const ph=t<240?'high1':t<540?'low1':t<1020?'high2':'low2';if(ph===S.tide)return;
  S.tide=ph;S.low=ph.startsWith('low')?1:0;
  if(ph==='high2'&&C.sec===2)C.sec=0;
  campMsg({low1:'썰물: 갯벌이 드러나 상륙정이 못 들어옵니다. 저녁 만조까지 월미도를 지키세요',high2:'저녁 만조: 레드·블루 비치 상륙이 시작됩니다',low2:'다시 썰물: 바다로 오는 증원이 끊깁니다(부두는 예외)'}[ph]);bump();};
const TIDE_N={high1:'아침 만조',low1:'썰물',high2:'저녁 만조',low2:'썰물'};
const TIDE_END={high1:240,low1:540,high2:1020,low2:1e9};
CAMP_TICK.incheon=function(C,S,dt){
  if(ownObj(0)){if(!S.wtaken){S.wtaken=1;campMsg('월미도 점령! 썰물 동안 섬을 지키세요');}S.wl=0;}
  else if(S.wtaken){if(!S.wl){S.wlost=1;campMsg('월미도를 빼앗겼습니다! 90초 안에 되찾으세요');}S.wl+=dt;if(S.wl>=90){G.over={win:1,why:'월미도 재함락'};return;}}
  // 둑길 끝 방벽: 월미도를 쥐고 10초 지나면 공병이 치운다(오마하 출구와 같다). 그 전엔 섬에 내린 차량이 영영 못 나갔다
  if(ownObj(0)){S.cwT=(S.cwT||0)+dt;const bl=inchCauBlocks();if(bl.length&&S.cwT>=10){for(const f of bl)fortRemove(f,'clear');campMsg('둑길 방벽을 치웠습니다: 월미도의 차량이 항구로 건너갈 수 있습니다');}}
  // 섬에 멈춘 차량: 썰물엔 섬을 지키고, 만조가 되면 둑길로 항구에 건너간다
  S.cvT=(S.cvT||0)+dt;if(S.cvT>=3){S.cvT=0;if(ownObj(0)&&!inchCauBlocks().length&&S.tide!=='low1'){const m=campMid();
    for(const u of G.units){if(u.nat!==0||UT[u.type].fly||UT[u.type].cls!=='veh'||u.hold||(u.path&&u.path.length))continue;if(u.x>=INCH.COAST)continue;
      try{orderMoveTo(u,INCH.COAST+2.5,m-.5+((u.id%3)-1)*.6);}catch(e){}}}}
  if(ownObj(1)&&!S.pier){S.pier=1;campMsg('인천항 부두 확보: 이제 물때와 상관없이 부두로 증원이 들어옵니다');}
  if(ownObj(0)&&ownObj(2)&&ownObj(3))G.over={win:0,why:'인천 탈환'};};
const inchCauBlocks=()=>{const m=campMid();return (G.forts||[]).filter(f=>f.k==='jersey'&&f.nat!==0&&f.z>=m-1&&f.z<m+1&&Math.abs(f.x-INCH.COAST)<1.2);};
CAMP.incheon.stars2=(C,S,win)=>[win,win&&!!S.pier,win&&!S.wlost];
CAMP.incheon.obj=function(C,S,li){const t=G.time||0;const end=TIDE_END[S.tide];
  const tide=`<p class="ltide${S.low?' low':''}">물때: ${TIDE_N[S.tide]}${end<1e8?` · ${S.low?'만조':'썰물'}까지 ${fmtT(end-t)}`:''}</p>`;
  return tide+`<ul class="cobj">${[li(ownObj(0)?'ok':'','월미도 점령'),li(S.wl>0?'bad':S.wtaken?'ok':'',S.wl>0?`월미도 되찾기: ${Math.ceil(90-S.wl)}초 남음`:'월미도 지키기'),
    li(ownObj(2)?'ok':'','응봉산 관측소 점령'),li(ownObj(3)?'ok':'','경인가도 입구 점령'),li(S.pier?'ok':'','(선택) 인천항 부두 점령')].join('')}</ul>${landPanel(C)}`;};
CAMP.incheon.labels=landLabels;

/* ---------- 설정 화면: 상륙 작전 목록 ---------- */
if(typeof showSetup==='function'){const _ss=showSetup;showSetup=function(){const r=_ss.apply(this,arguments);const el=typeof document!=='undefined'&&document.getElementById('camp-land');if(el)el.innerHTML=campList('landing');return r;};}

/* ---------- 해변 돌파: 물가에 멈춰 서면 죽는다 ----------
   실제 상륙 보병은 모래밭에서 엎드려 쏘지 않고, 해안 화기 아래를 뛰어 건너 절벽 밑·안벽 위로 붙는다(해변 교범: 해변을 빨리 비워라).
   AI 전술(접적 시 엄폐에 멈추기, 사거리 끝에서 멈춰 쏘기)이 모래밭 한가운데서 분대를 세워 두어 1파가 1분 안에 거의 전멸했다.
   - 아군 보병이 해변(모래·안벽·부두·갯벌)에 있으면 같은 줄로 해변 너머 첫 땅까지 뛰어 올라간다. 그동안 다른 판단이 멈추게 하지 않는다.
   - 해변에선 제압돼도 엎드려 굳지 않고 느리게나마 계속 기어 오른다. 해변을 벗어나면 평소 전술로 돌아간다. */
const landShore=y=>!!(y&&!y.sea&&(y.sand||y.wall||y.mudz||(y.pier&&!y.cau)));
const landOnBeach=u=>landOn()&&u.nat===0&&UT[u.type].cls==='inf'&&!u.brk&&!u.cqb&&landShore(tileAt(u.x,u.z));
function landInland(u){const r=Math.floor(u.z);let c=Math.floor(u.x);while(c<N&&landShore(G.map[r][c]))c++;
  if(c>=N||!G.map[r][c]||G.map[r][c].sea)return null;const y=G.map[r][c];if(mcost(u.type,y)===Infinity)return null;
  return [c+.6,u.z+((u.id*7)%5-2)*.08];}
function landRush(dt){const t=G.time||0;
  for(const u of G.units){if(!landOnBeach(u)){if(u._bch)u._bch=null;continue;}
    if(u.type==='eng'&&(t-(u._clrGo??-99)<10||u._clr>0))continue;   // 공병은 장애물을 걷어 내는 중
    if(u._bch&&u.path&&u.path.length&&t-u._bch.t<6)continue;
    const p=landInland(u);if(!p)continue;const P=pathPts(u,p[0],p[1]);if(!P.length)continue;
    u.path=P;u.dest=p;u.tgt=null;u.tgtTile=null;u._bch={t};if(u.tk){u.tk.at=t;u.tk.role='assault';}}}
{const _go=tacGo;tacGo=function(u,x,z,role){if(u&&u._bch&&landOnBeach(u)&&u.path&&u.path.length)return false;return _go.apply(this,arguments);};}
{const _r=tacReact;tacReact=function(u){if(u&&u._bch&&landOnBeach(u))return;return _r.apply(this,arguments);};}
{const _mv=rtMove;rtMove=function(u,dt){if(u._bch&&typeof pinned==='function'&&pinned(u)&&landOnBeach(u)){const s=u.supp;u.supp=PINNED-.01;try{_mv(u,dt*.6);}finally{u.supp=Math.max(u.supp,s);}return;}return _mv(u,dt);};}
