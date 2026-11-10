/* ===================== SIEGE: 부대가 알아서 진지를 파고 넓혀 가는 공성전 =====================
   "진지 설치나 의료막사 같은 걸 애들이 적극적으로 했으면 좋겠어. 공성전이 이어지도록."
   예전에는 방어물이 플레이어 명령 아니면 거의 안 생겼다(AI 16판 중 0개). 지휘점수를 증원이 먼저 다 써 버리고,
   쉬는 보병만 짓는데 쉬는 보병이 드물었다. 여기서 실제 교리(생존성 작업·장애물 계획·전진 지원)대로 바꾼다.
   1) 새 야전 시설(04d·05k-fort2의 FORT에 더한다)
      개인호   멈춘 보병이 명령 없이 스스로 파는 얕은 호. 안의 병사는 참호처럼 사방·포격 엄폐. 지휘점수 0
      차량 진지 공병이 파는 차체 엄폐호(hull-down). 안의 전차·장갑차는 포탑만 내놓아 직사 엄폐 40%, 포격 피해 −40%
      대전차호 길게 판 도랑. 모든 차량을 막고 보병은 건넌다. 공병전차가 메우거나 공병이 폭파해 메운다
      관측소   흙과 위장으로 덮은 감시 진지. 우리 보병이 곁(반 칸)에 있으면 둘레 4칸을 계속 지켜본다
      탄약 집적소 앞쪽에 쌓아 둔 탄약 상자. 둘레 부대가 트럭 없이 탄약을 채운다(재고 60). 보급 트럭이 곁에 서면 다시 채운다.
               부서지면 유폭한다
      지휘소   천막·안테나·모래주머니. 둘레 2.5칸 우리 부대는 사기가 빨리 돌아오고 제압이 빨리 풀린다
      위장망   멈춘 부대(차량 포함) 위에 친 그물. 쏘지 않고 멈춰 있으면 적이 훨씬 가까이 와야 본다
   2) 모두가 알아서(명령 없이, 플레이어 부대 포함): 멈춘 보병은 6초 뒤 개인호를 판다. 쉬는 보병은 곁의 부서진 우리 방어물을
      고친다. 공병은 바로 앞(1칸) 적 장애물을 걷어 낸다. AI·부관 차량은 비어 있는 차량 진지로 들어간다.
   3) AI·부관의 방어(거점마다 진지 계획, 위협 방향 기준): 1선 참호·기관총 진지 → 뒤쪽 구호소·탄약 집적소 → 앞쪽 철조망 지대 →
      관측소 → 지휘소 → (공병) 벙커·차량 진지·대전차호 → 위장망. 위협받는 거점부터, 지휘점수 일부를 증원보다 먼저 떼어 둔다.
   4) AI·부관의 공격: 주공 집결지에 구호소·탄약 집적소를 세운다(전진 지원 거점). 주공의 공병은 목표 둘레 적 진지를 폭파
      (벙커·기관총 진지·방벽·장애물·대전차호, 연막을 치고 접근)하고 지뢰·철조망을 개척한다. 그래서 공성은 오래 가도 영원히 막히지 않는다. */
Object.assign(FORT,{
  scrape:{n:'개인호',len:.2,w:.13,cov:0,h:0,hp:40,bt:14,cost:0,desc:'멈춘 보병이 스스로 파는 얕은 호. 안의 병사 사방 엄폐 50%(포격 파편도 막음). 지휘점수 없음',inside:1,auto:1},
  vpos:{n:'차량 진지',len:.42,w:.3,cov:0,h:0,hp:120,bt:18,cost:2,desc:'공병이 판 차체 엄폐호. 안의 차량은 포탑만 내놓아 직사 엄폐 40%, 포격 피해 −40%',inside:1},
  ditch:{n:'대전차호',len:.6,w:.14,cov:0,h:0,hp:220,bt:22,cost:2,desc:'길게 판 도랑. 모든 차량을 막고 보병은 건넘. 공병전차가 메우거나 공병이 폭파'},
  op:{n:'관측소',len:.14,w:.14,cov:0,h:.05,hp:30,bt:10,cost:1,desc:'위장한 감시 진지. 우리 보병이 곁에 있으면 둘레 4칸을 계속 지켜봄',inside:1},
  ammo:{n:'탄약 집적소',len:.22,w:.18,cov:0,h:.08,hp:18,bt:8,cost:2,desc:'앞쪽 탄약 더미. 둘레 부대가 트럭 없이 탄약을 채움(재고 60, 트럭이 다시 채움). 맞으면 유폭',stock:60},
  cpost:{n:'지휘소',len:.26,w:.2,cov:0,h:.1,hp:40,bt:14,cost:3,desc:'천막·안테나 지휘소. 둘레 2.5칸 아군 사기 회복 2배, 제압이 빨리 풀림'},
  camo:{n:'위장망',len:.3,w:.3,cov:0,h:0,hp:10,bt:6,cost:1,desc:'그물로 덮어 숨김. 그 아래 멈춘 부대(차량 포함)는 쏘지 않으면 적이 훨씬 가까이 와야 봄'},
});
FORT_KS.push('scrape','vpos','ditch','op','ammo','cpost','camo');
Object.assign(COVK,{scrape:{n:'개인호',v:.5},vpos:{n:'차량 진지',v:.4}});
Object.assign(NAV_RULE,{scrape:{inf:0,eng:0,veh:0,trk:0},vpos:{inf:0,eng:0,veh:0,trk:0},ditch:{inf:0,eng:0,veh:2,trk:2},op:{inf:0,eng:0,veh:0,trk:0},
  ammo:{inf:0,eng:0,veh:2,trk:2},cpost:{inf:0,eng:0,veh:2,trk:2},camo:{inf:0,eng:0,veh:0,trk:0}});
const SG={every:2.5,scrapeIdle:6,scrapeMax:36,opR:4,opMan:.5,ammoR:.9,ammoK:.06,truckK:6,cpR:2.5,repK:.5,brcT:6,brcAI:3.5,brcMe:1.1,vposR:2.2,
  fortRes:{calm:3,hot:6},orders:2,asmR:2};
const SG_KIND=new Set(['scrape','vpos','ditch','op','ammo','cpost','camo']);
const SG_NOBLOCK=k=>{const r=NAV_RULE[k];return r&&!r.inf&&!r.eng&&!r.veh&&!r.trk;};
/* 누가 무엇을: 보병은 개인호·관측소·위장망, 소총·기관총은 탄약 집적소·지휘소도. 공병은 전부(FORT_KS) */
{const _fk=fortKinds;fortKinds=function(type){const k=_fk(type).slice();if(!k.length||type==='eng')return k;
   k.push('scrape','op','camo');if(type==='rifle'||type==='mg')k.push('ammo','cpost');return [...new Set(k)].filter(x=>FORT[x]);};}
{const _cp=fortCanPlace;fortCanPlace=function(n,k,x,z){const why=_cp(n,k,x,z);if(why||!SG_KIND.has(k))return why;
   const fs=G.forts||[];
   if(k==='ammo'||k==='cpost'||k==='vpos'){for(const f of fs)if(f.k!=='mine'&&f.k!=='scrape'&&f.k!=='camo'&&Math.hypot(f.x-x,f.z-z)<.3)return '다른 시설과 너무 붙어 있습니다';}
   if(k==='cpost'&&fs.some(f=>f.k==='cpost'&&f.nat===n&&Math.hypot(f.x-x,f.z-z)<3))return '3칸 안에 이미 지휘소가 있습니다';
   if(k==='ammo'&&fs.some(f=>f.k==='ammo'&&f.nat===n&&Math.hypot(f.x-x,f.z-z)<1.5))return '1.5칸 안에 이미 탄약 집적소가 있습니다';
   if(k==='op'&&fs.some(f=>f.k==='op'&&f.nat===n&&Math.hypot(f.x-x,f.z-z)<1.5))return '1.5칸 안에 이미 관측소가 있습니다';
   if(k==='camo'&&fs.some(f=>f.k==='camo'&&Math.hypot(f.x-x,f.z-z)<.25))return '이미 위장망이 있습니다';
   return null;};}
/* 탄약 집적소 재고 */
{const _of=orderFort;orderFort=function(u,k,x,z){const f=_of(u,k,x,z);if(f&&typeof f==='object'&&FORT[k].stock)f.st=FORT[k].stock;return f;};}
/* 길을 막지 않는 시설은 이동 격자에 넣지 않는다(성능) */
{const _no=navObstacles;navObstacles=function(){return _no().filter(o=>!(o.fort&&o.k&&SG_NOBLOCK(o.k)));};}
/* 공병전차는 장애물만 치운다(개인호·관측소·집적소·지휘소·위장망은 건드리지 않음) */
if(typeof cevJobs==='function'){const _cj=cevJobs;cevJobs=function(n){return _cj(n).filter(j=>!(j.k==='fort'&&j.o&&SG_KIND.has(j.o.k)&&j.o.k!=='ditch'&&j.o.k!=='vpos'));};}
/* 안에 있나. 다 지은 새 시설을 칸별로 묶어 둔다(참호 판정은 병사마다 자주 불려 빨라야 한다) */
function sgIdx(){const v=G.fortV||0;let I=G._sgI;if(I&&I.v===v&&I.f===G.forts)return I.m;const m=new Map();
  for(const f of G.forts||[]){if(f.prog<1||!SG_KIND.has(f.k))continue;const k=Math.floor(f.z)*N+Math.floor(f.x);let a=m.get(k);if(!a)m.set(k,a=[]);a.push(f);}
  Object.defineProperty(G,'_sgI',{value:{v,f:G.forts,m},writable:true,configurable:true,enumerable:false});return m;}
function sgIn(k,x,z,nat,pad){if(!G.forts||!G.forts.length)return null;const m=sgIdx();if(!m.size)return null;const r0=Math.floor(z),c0=Math.floor(x);
  for(let r=r0-1;r<=r0+1;r++)for(let c=c0-1;c<=c0+1;c++){const a=m.get(r*N+c);if(!a)continue;for(const f of a)if(f.k===k&&f.prog>=1&&(nat==null||f.nat===nat)&&inBox(fortShape(f),x,z,pad||.01))return f;}
  return null;}
// 개인호는 참호와 같다(사방 엄폐·포격 파편 막음). 포탄 구덩이(05o-wreck)와 같은 방식
{const _ta=trenchAt;trenchAt=function(x,z){return _ta(x,z)||!!sgIn('scrape',x,z);};}
/* 차량 진지: 직사 엄폐, 포격 피해 감소 */
{const _co=coverOf;coverOf=function(d,a){const c=_co(d,a);const t=UT[d.type];if(t.cls!=='veh'||t.fly)return c;
   if(a&&UT[a.type].ind)return c;const [px,pz]=posOf(d);if(sgIn('vpos',px,pz,null,.04)&&c.cov<COVK.vpos.v)return {cov:COVK.vpos.v,kind:'vpos'};return c;};}
{const _h=harm;harm=function(u,amt,by,o){if(u&&amt>0&&o&&o.kind==='blast'&&UT[u.type]&&UT[u.type].cls==='veh'&&!UT[u.type].fly&&sgIn('vpos',u.x,u.z,null,.04))amt*=.6;return _h(u,amt,by,o);};}
/* 위장망: 멈추고 쏘지 않는 부대는 숨는다 */
{const _cc=concealed;concealed=function(e){if(_cc(e))return true;const t=UT[e.type];if(t.fly||firedRecently(e)||(e.path&&e.path.length))return false;return !!sgIn('camo',e.x,e.z,null,.03);};}
/* 관측소: 우리 보병이 곁에 있으면 둘레 opR칸을 본다(시야선은 땅 높이에서 막히지 않게 높게 본다고 친다: 건물 속은 못 봄) */
function sgOpList(n){const q=Math.floor((G.time||0)*4),C=G._sgO;if(C&&C.q===q&&C.v===(G.fortV||0)&&C.n===n)return C.L;const out=[];for(const f of G.forts||[]){if(f.k!=='op'||f.prog<1||f.nat!==n)continue;
    if(!G.units.some(u=>u.nat===n&&UT[u.type].cls==='inf'&&Math.hypot(u.x-f.x,u.z-f.z)<SG.opMan))continue;out.push(f);}
  Object.defineProperty(G,'_sgO',{value:{q,v:G.fortV||0,n,L:out},writable:true,configurable:true,enumerable:false});return out;}
{const _s=seen;seen=function(e,n,vs){if(_s(e,n,vs))return true;if(!G.fog||e.nat===n||!G.forts||!G.forts.length)return false;try{const L=sgOpList(n);if(!L.length)return false;
     const [ex,ez]=posOf(e);if(cell(e.r,e.c).t==='bldg'&&!(typeof onRoof==='function'&&onRoof(e)))return false;
     for(const f of L)if(Math.hypot(ex-f.x,ez-f.z)<=SG.opR*(concealed(e)?SPOT_HIDE:1))return true;}catch(err){}return false;};
 const _v=visSet;visSet=function(n){const s=_v(n);if(s._op)return s;s._op=1;try{const L=sgOpList(n);if(!L.length)return s;const R=s.R||FOW_R,M=N*R,rr=SG.opR;
     for(const v of L){const i0=Math.max(0,Math.floor((v.x-rr)*R)),i1=Math.min(M-1,Math.floor((v.x+rr)*R)),j0=Math.max(0,Math.floor((v.z-rr)*R)),j1=Math.min(M-1,Math.floor((v.z+rr)*R));
       for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const px=(i+.5)/R,pz=(j+.5)/R;if(Math.hypot(px-v.x,pz-v.z)>rr)continue;const r=Math.floor(pz),c=Math.floor(px);if(G.map[r][c].t==='bldg')continue;
         s.fine[j*M+i]=1;s.add(key(r,c));}}}catch(e){}return s;};}
/* 탄약 집적소가 부서지면 유폭한다 */
{const _fr=fortRemove;fortRemove=function(f,why){const was=G.forts&&G.forts.includes(f);_fr(f,why);
   if(was&&f.k==='ammo'&&f.prog>=1&&why==='blast'&&(f.st||0)>5){const k=Math.min(1,(f.st||0)/60);if(FXH.boom)try{FXH.boom(f.x,f.z,0,false,{pw:1+k});}catch(e){}
     for(const u of G.units.slice()){if(UT[u.type].fly)continue;const d=Math.hypot(u.x-f.x,u.z-f.z);if(d>.6)continue;harm(u,Math.max(1,Math.round(5*k*(1-d/.6))),null,{kind:'blast',x:f.x,z:f.z,rad:.5});}
     fortBlast(f.x,f.z,.5,40*k);if(!isAI(f.nat)||!G.fog)L(`${natName(f.nat)} 탄약 집적소 유폭`);}};}

/* ---------- 매 틱: 집적소·지휘소·수리·개인호·폭파 일 ---------- */
// 폭파 일(u.job.brc)은 04d fortTick이 모르는 일이라 그동안 빼 둔다(05k-fort2 요새화와 같은 방식)
{const _ft=fortTick;fortTick=function(dt){const bj=[];for(const u of G.units)if(u.job&&u.job.brc){bj.push(u);u._brj=u.job;u.job=null;}
   try{_ft(dt);}finally{for(const u of bj){if(!u.job)u.job=u._brj;delete u._brj;}}
   try{sgTick(dt,bj);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}};}
function sgTick(dt,bj){const t=G.time||0;const fs=G.forts||[];
  for(const u of bj)sgBreachTick(u,dt);
  if(fs.length){
    for(const f of fs){if(f.prog<1)continue;const d=FORT[f.k];
      // 탄약 집적소: 둘레 부대가 채운다
      if(f.k==='ammo'&&typeof amMax==='function'){
        for(const u of G.units){if(u.nat!==f.nat||UT[u.type].fly||Math.hypot(u.x-f.x,u.z-f.z)>SG.ammoR)continue;
          if(u.type==='sup'){if(u.cargo>20&&(f.st||0)<d.stock&&!(u.path&&u.path.length)){const m=Math.min(d.stock-(f.st||0),SG.truckK*dt);f.st=(f.st||0)+m;u.cargo-=m;}continue;}
          const M=amMax(u);if(!M||(f.st||0)<=.05||amOf(u)>=M-.05)continue;const want=Math.min(M-u.am,M*SG.ammoK*dt),cost=want/M*LOAD[u.type];const k=Math.min(1,f.st/Math.max(1e-6,cost));u.am+=want*k;f.st=Math.max(0,f.st-cost*k);}}
      // 수리: 곁에서 쉬는 우리 보병이 부서진 방어물을 고친다
      if(f.hp<d.hp&&f.k!=='fortb'&&f.k!=='mine'&&((f._rpT||0)<=t)){f._rpT=t+.5;
        const w=G.units.find(u=>u.nat===f.nat&&UT[u.type].cls==='inf'&&!u.job&&!(u.path&&u.path.length)&&!(u.supp>.6)&&Math.hypot(u.x-f.x,u.z-f.z)<Math.max(.45,d.len/2+.15));
        if(w)f.hp=Math.min(d.hp,f.hp+.5*d.hp/d.bt*SG.repK*(w.type==='eng'?1.8:1));}}
    // 지휘소: 사기·제압
    const cps=fs.filter(f=>f.k==='cpost'&&f.prog>=1);
    if(cps.length)for(const u of G.units){if(UT[u.type].fly||!cps.some(f=>f.nat===u.nat&&Math.hypot(u.x-f.x,u.z-f.z)<SG.cpR))continue;
      if(u.supp>0)u.supp=Math.max(0,u.supp-dt*.12);
      if(u.mor!=null&&u.mor<90&&(u.supp||0)<.6&&t-(u.casT??-99)>10)u.mor=Math.min(90,u.mor+2*dt);}}
  // 개인호: 멈춘 보병이 스스로 판다(모든 세력, 명령 없이)
  if((G._sgS||0)<=t){G._sgS=t+1;sgScrapes(t);}
  // 공병: 바로 앞 적 장애물을 걷어 낸다(플레이어 부대도)
  if((G._sgB||0)<=t){G._sgB=t+1.5;try{sgBreachAll();}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}}}
function sgScrapes(t){const fs=G.forts||(G.forts=[]);
  for(const u of G.units){const ty=UT[u.type];if(ty.cls!=='inf'||ty.fly)continue;
    const still=!(u.path&&u.path.length)&&!u.job&&!u.brk&&!u.cqb&&!u.pax&&u.towBy==null&&!u.tun&&!u.inV&&u.x!=null;
    if(!still){u._stT=null;continue;}if(u._stT==null){u._stT=t;continue;}if(t-u._stT<SG.scrapeIdle)continue;
    if(!fortKinds(u.type).includes('scrape'))continue;const tl=tileAt(u.x,u.z);if(!tl||tl.t==='bldg'||tl.t==='water'||inZone(u.nat,u.r,u.c))continue;
    if(trenchAt(u.x,u.z)||(typeof bunkerAt==='function'&&bunkerAt(u.x,u.z)))continue;
    if(fs.some(f=>(f.k==='scrape'||f.k==='trench')&&Math.hypot(f.x-u.x,f.z-u.z)<.3))continue;
    // 상한: 오래되고 빈 개인호부터 메운다
    const my=fs.filter(f=>f.k==='scrape'&&f.nat===u.nat);
    if(my.length>=SG.scrapeMax){const old=my.find(f=>!G.units.some(o=>o.nat===f.nat&&Math.hypot(o.x-f.x,o.z-f.z)<.6));if(!old)continue;fortRemove(old);}
    const tg=u.tgt;const f=orderFort(u,'scrape',u.x,u.z);if(typeof f==='string'){u._stT=t;continue;}u.tgt=tg;}}

/* ---------- 공병 폭파·개척 ---------- */
const SG_BRC=new Set(['bunker','nest','jersey','hedgehog','ditch','sandbag','wire','mine','vpos']);
function sgSeesFort(f,n){if(f.k==='mine')return typeof mineSeen==='function'&&mineSeen(f,n);if(!G.fog)return true;return seenPt(n,f.x,f.z);}
function sgBreachAll(){if(!G.forts||!G.forts.length)return;
  for(const u of G.units){if(u.type!=='eng'||u.job||u.brk||u.cqb||u.pax||u.towBy!=null||u.hold)continue;const ai=aiRun(u.nat);
    if(!ai&&u.path&&u.path.length)continue;                       // 플레이어 공병: 멈춰 있을 때만 바로 앞 장애물
    if(ai&&G._supOnly===u.nat)continue;
    const R=ai?SG.brcAI:SG.brcMe;const goal=ai?sgAtkPt(u):null;if(ai&&!goal)continue;
    let best=null,bs=1e9;
    for(const f of G.forts){if(f.nat===u.nat||f.prog<1||!SG_BRC.has(f.k))continue;const d=Math.hypot(f.x-u.x,f.z-u.z);if(d>R)continue;
      if(!ai&&f.k!=='wire'&&f.k!=='mine'&&f.k!=='hedgehog'&&f.k!=='jersey'&&f.k!=='ditch')continue;
      if(goal&&Math.hypot(f.x-goal[0],f.z-goal[1])>3.5&&d>1.2)continue;  // 주공 목표 둘레(또는 바로 앞)만
      if(G.units.some(o=>o!==u&&o.job&&o.job.brc===f.id))continue;
      if(!sgSeesFort(f,u.nat))continue;const s=d-(f.k==='bunker'||f.k==='nest'?1:0);if(s<bs){bs=s;best=f;}}
    if(best)sgBreach(u,best);}}
/* AI 공병이 맡은 공격 목표(주공) */
function sgAtkPt(u){const P=G.plan&&G.plan[u.nat];if(!P||!P.T)return null;let x=null;
  if(u.pl!=null&&P.a)x=P.T.find(q=>q.id===P.a['p'+u.pl]);if(!x)x=P.T.find(q=>q.id===P.main);if(!x||x.k!=='atk')return null;
  if(x.asm&&!x.go&&Math.hypot(u.x-x.x,u.z-x.z)>PLAN.asmD+1)return null;return [x.x,x.z];}
function sgBreach(u,f){const d=FORT[f.k];
  // 지뢰·철조망은 걸어 들어가 걷어 낸다(05k-fort2 mineTick, 04d fortCrush)
  if(f.k==='mine'||f.k==='wire'){u.path=pathPts(u,f.x,f.z);u.tgt=null;return;}
  const vx=u.x-f.x,vz=u.z-f.z,dl=Math.hypot(vx,vz)||1,o=d.len/2+.12;let sx=f.x+vx/dl*o,sz=f.z+vz/dl*o;if(!walkable(u,sx,sz)){sx=f.x;sz=f.z;}
  if(hotAt(u.nat,f.x,f.z,2.2)&&typeof popSmoke==='function'&&(u.ssm==null||u.ssm>0)){try{const ok=popSmoke((u.x+f.x)/2,(u.z+f.z)/2,REAL&&REAL.smkS);if(ok&&u.ssm!=null)u.ssm--;}catch(e){}}
  u.tgt=null;u.tgtTile=null;u.path=pathPts(u,sx,sz);u.dest=[sx,sz];u.job={brc:f.id,x:sx,z:sz,w:0,t0:G.time||0};
  if(!isAI(u.nat)||!G.fog)L(`${natName(u.nat)} 공병 ${d.n} 폭파하러 접근`);}
function sgBreachTick(u,dt){const j=u.job;const f=(G.forts||[]).find(o=>o.id===j.brc);const t=G.time||0;
  if(!f||!G.units.includes(u)||t-j.t0>60||u.brk){u.job=null;return;}
  if(!u.dest||Math.hypot(u.dest[0]-j.x,u.dest[1]-j.z)>.01){u.job=null;return;}   // 다른 명령
  const near=Math.hypot(u.x-j.x,u.z-j.z)<.3;if(u.path&&u.path.length)return;if(!near){u.job=null;return;}
  j.w+=dt*(u.supp>.6?.4:1);u.face=Math.atan2(f.z-u.z,f.x-u.x)*180/Math.PI;if(j.w<SG.brcT)return;
  u.job=null;if(FXH.boom)try{FXH.boom(f.x,f.z,0,false,{pw:1.1});}catch(e){}
  for(const o of G.units.slice()){if(UT[o.type].fly||o===u)continue;const d=Math.hypot(o.x-f.x,o.z-f.z);if(d>.35)continue;harm(o,Math.max(1,Math.round(4*(1-d/.35))),u,{kind:'blast',x:f.x,z:f.z,rad:.3});}
  fortRemove(f,'blast');try{sfx('boom');}catch(e){}if(!isAI(u.nat)||!G.fog)L(`${natName(u.nat)} 공병 ${FORT[f.k].n} 폭파`);bump();}

/* ---------- AI·부관: 진지 계획 ---------- */
// 위협 방향 f(앞), 옆 s. p=[앞,옆] 칸. need: 'eng' 공병만, veh: 우리 차량이 둘레에 있을 때, eveh: 적 차량을 본 적 있을 때
const SG_DEF=[
  {k:'trench',p:[.7,0]},{k:'nest',p:[.62,.5]},{k:'trench',p:[.7,-.55]},
  {k:'aid',p:[-1.1,.35]},{k:'ammo',p:[-.85,-.4]},
  {k:'wire',p:[1.55,0]},{k:'wire',p:[1.55,.48]},{k:'wire',p:[1.55,-.48]},
  {k:'op',p:[2.3,.2]},{k:'cpost',p:[-1.35,-.05],main:1},
  {k:'bunker',p:[.5,.1],eng:1},{k:'vpos',p:[.25,.95],eng:1,veh:1},{k:'vpos',p:[.25,-.95],eng:1,veh:1},
  {k:'ditch',p:[2.7,0],eng:1,eveh:1},{k:'trench',p:[-.2,.9]},{k:'trench',p:[-.2,-.9]},
  {k:'camo',on:'vpos'},{k:'camo',on:'cpost'},{k:'camo',on:'ammo'}];
const SG_ATK=[{k:'aid',p:[-.2,.3]},{k:'ammo',p:[-.4,-.35]},{k:'camo',on:'ammo'}];
function sgWho(n,x,z,k,R,need){let best=null,bd=1e9;
  for(const u of G.units){if(u.nat!==n||u.job||(u.path&&u.path.length)||u.brk||u.cqb||u.pax||u.post||u.hold&&!aiRun(n)||u.man)continue;
    if(need&&u.type!=='eng')continue;if(!fortKinds(u.type).includes(k))continue;const d=Math.hypot(u.x-x,u.z-z);if(d>R)continue;
    if(u.type==='sniper'||u.type==='mortar')continue;
    const s=d-(u.type==='eng'&&FORT[k].bt>=12?1:0)+(u.tgt!=null?1.5:0);if(s<bd){bd=s;best=u;}}
  return best;}
function sgTry(n,k,x,z,R,need){if(!inb(Math.floor(z),Math.floor(x)))return 0;const N2=G.nats[n];
  for(const [a,b] of [[0,0],[.2,0],[-.2,0],[0,.2],[0,-.2],[.3,.3],[-.3,-.3]]){const px=x+a,pz=z+b;if(fortCanPlace(n,k,px,pz))continue;
    const u=sgWho(n,px,pz,k,R,need);if(!u)return 0;const f=orderFort(u,k,px,pz);return typeof f!=='string'?1:0;}
  return -1;}
function sgSlots(n,list,cx,cz,fx,fz,ctx,budget){let made=0;const fs=G.forts||[];
  for(let i=0;i<list.length&&made<SG.orders;i++){const S=list[i];const d=FORT[S.k];if(!d)continue;
    if(S.eng&&!G.units.some(u=>u.nat===n&&u.type==='eng'))continue;if(S.veh&&!ctx.veh)continue;if(S.eveh&&!ctx.eveh)continue;if(S.main&&!ctx.main)continue;
    if(ctx.hot&&S.p&&S.p[0]>1.2)continue;                      // 적이 바로 앞이면 앞쪽 작업은 미룬다
    let x,z;if(S.on){const b=fs.find(f=>f.nat===n&&f.k===S.on&&Math.hypot(f.x-cx,f.z-cz)<3);if(!b||b.prog<1)continue;x=b.x;z=b.z;}
    else{x=cx+fx*S.p[0]-fz*S.p[1];z=cz+fz*S.p[0]+fx*S.p[1];}
    if(fs.some(f=>f.nat===n&&f.k===S.k&&Math.hypot(f.x-x,f.z-z)<.45))continue;          // 이미 있음
    const key=ctx.id+':'+i;if((ctx.P.fail[key]||0)>(G.time||0))continue;
    if(d.cost>budget())break;
    const r=sgTry(n,S.k,x,z,S.eng?Math.max(ctx.R,6):ctx.R,S.eng);if(r===1)made++;else if(r===-1)ctx.P.fail[key]=(G.time||0)+60;}
  return made;}
function sgEVeh(n){const N2=G.nats[n];const now=G.units.some(e=>e.nat!==n&&UT[e.type].cls==='veh'&&!UT[e.type].logi&&!UT[e.type].fly&&seen(e,n));if(now)N2._sawVeh=G.time||0;
  return now||(N2._sawVeh!=null&&(G.time||0)-N2._sawVeh<120);}
function aiSiege(n){const N2=G.nats[n];if(!N2||N2.alive===false)return;const t=G.time||0;N2._sg=N2._sg||{fail:{}};const P=N2._sg;
  if((P.t||0)>t)return;P.t=t+SG.every;
  const own=G.objs.filter(o=>G.map[o.r][o.c].owner===n);
  G.forts=G.forts||[];const budget=()=>N2.cp-2;
  const eveh=sgEVeh(n);let made=0;
  // 위협받는 거점부터
  const L=own.map(o=>{const x=o.c+.5,z=o.r+.5;return {o,x,z,hot:hotAt(n,x,z,2.5),warm:hotAt(n,x,z,6)};}).sort((a,b)=>(b.warm-a.warm)||(b.hot-a.hot));
  let mainDone=false;
  for(const q of L){if(made>=SG.orders)break;const [fx,fz]=fortFront(n,q.x,q.z);
    const veh=G.units.some(u=>u.nat===n&&UT[u.type].cls==='veh'&&!UT[u.type].logi&&!UT[u.type].ind&&!UT[u.type].fly&&Math.hypot(u.x-q.x,u.z-q.z)<4);
    const cpk=!G.forts.some(f=>f.nat===n&&f.k==='cpost');const main=!mainDone&&(cpk||G.forts.some(f=>f.nat===n&&f.k==='cpost'&&Math.hypot(f.x-q.x,f.z-q.z)<3));mainDone=mainDone||main;
    made+=sgSlots(n,SG_DEF,q.x,q.z,fx,fz,{id:'o'+q.o.r+'_'+q.o.c,P,R:3,veh,eveh,main,hot:q.hot},budget);}
  // 공격: 주공 집결지에 전진 지원 거점
  const PL=G.plan&&G.plan[n];if(PL&&PL.T&&made<SG.orders){const x=PL.T.find(q=>q.id===PL.main);
    if(x&&x.k==='atk'&&x.asm){const [ax,az]=x.asm;const L2=Math.hypot(x.x-ax,x.z-az)||1;const fx=(x.x-ax)/L2,fz=(x.z-az)/L2;
      if(!hotAt(n,ax,az,1.5))made+=sgSlots(n,SG_ATK,ax,az,fx,fz,{id:'a'+x.id,P,R:SG.asmR+1,veh:0,eveh:0,main:0,hot:0},budget);}}
  // 차량은 비어 있는 차량 진지로
  sgVpos(n);}
function sgVpos(n){const V=(G.forts||[]).filter(f=>f.k==='vpos'&&f.nat===n&&f.prog>=1);if(!V.length)return;
  for(const f of V){if(G.units.some(u=>UT[u.type].cls==='veh'&&!UT[u.type].fly&&Math.hypot(u.x-f.x,u.z-f.z)<.2))continue;
    let best=null,bd=SG.vposR;for(const u of G.units){const t=UT[u.type];if(u.nat!==n||t.cls!=='veh'||t.fly||t.logi||u.type==='amb'||u.rearm||u.pax&&u.pax.length||u.post||(u.path&&u.path.length)||u.hold&&!aiRun(n)||u.man||u.job)continue;
      if(t.ind&&u.type!=='spg')continue;if(G.forts.some(o=>o.k==='vpos'&&o.prog>=1&&Math.hypot(u.x-o.x,u.z-o.z)<.2))continue;
      const d=Math.hypot(u.x-f.x,u.z-f.z);if(d<bd){bd=d;best=u;}}
    if(best){best.path=pathPts(best,f.x,f.z);best.tgt=null;}}}
/* (지휘점수를 잠깐 깎아 두면 aiThink 끝의 checkOver가 '점수 없음'으로 보고 세력을 없앨 수 있어, 증원 구매만 막는다) */
{const _b=buy;buy=function(n,type){const K=G&&G._sgKeep;if(K&&K.n===n&&UT[type]&&G.nats[n].cp-UT[type].cost<K.keep)return null;return _b.apply(this,arguments);};}
/* 증원보다 먼저 축성 몫을 떼어 둔다: 진지 계획에 빈 자리가 있고 쉬는 보병이 있으면 이번 생각에서 증원에 쓸 점수를 줄인다 */
{const _ai=aiThink;aiThink=function(n){const N2=G.nats&&G.nats[n];if(!N2||G._supOnly===n)return _ai(n);
   const hot=G.objs.some(o=>G.map[o.r][o.c].owner===n&&hotAt(n,o.c+.5,o.r+.5,6));const keep=Math.min(N2.cp,hot?SG.fortRes.hot:SG.fortRes.calm);
   const was=G._sgKeep;G._sgKeep={n,keep};let out;try{out=_ai(n);}finally{G._sgKeep=was;}
   try{aiSiege(n);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}return out;};}
/* ---------- 공성이 이어지게: 승점만 먼저 채운다고 끝나지 않는다 ----------
   예전에는 승점이 기준(거점×6+12)에 닿으면 바로 끝나, 거점을 반씩 나눠 쥔 팽팽한 싸움도 7~9분이면 끝났다.
   이제 기준에 닿아도 2위보다 거점 수만큼(최소 8) 앞서야 이긴다. 비등하면 시간 끝까지 싸운다(기본 24 → 32라운드, 16분). */
const SG_LEAD=n=>Math.max(12,(G.objs||[]).length*2);
{const _n=newGame;newGame=function(cfg){const g=_n(cfg);try{const G0=typeof G!=='undefined'&&G?G:g;if(G0&&cfg&&!cfg.maxR&&!G0.scn&&G0.win!=='lts'&&G0.maxR===24)G0.maxR=32;}catch(e){}return g;};}
{const _c=checkOver;checkOver=function(){const was=G.over;const o=_c();if(!o||was||G.scn||G.win==='lts'||o.why!==`승점 ${G.vpWin} 달성`)return o;
   const alive=G.order.filter(i=>G.nats[i].alive).sort((a,b)=>G.nats[b].vp-G.nats[a].vp);if(alive.length<2)return o;
   if(G.nats[alive[0]].vp-G.nats[alive[1]].vp>=SG_LEAD())return o;
   G.over=null;
   if(G.turn>G.maxR){const score=n=>G.nats[n].vp*1000+objCount(n)*100+G.units.filter(u=>u.nat===n).length;alive.sort((a,b)=>score(b)-score(a));G.over={win:alive[0],why:`${G.maxR}라운드 종료, 승점 우세`};return G.over;}
   return null;};}
/* 작전 계획(06i)의 적 수비 추정에 참호·철조망·개인호·관측소도 더한다: 진지가 깊을수록 공격 측은 더 많이 모아 준비 사격 뒤에 들어간다 */
{const SG_EST={trench:.8,wire:.5,scrape:.3,op:.3,vpos:1,ditch:.5,ammo:.3,cpost:.3};const _pe=planEst;planEst=function(n,K,x,z,R,own){let s=_pe(n,K,x,z,R,own);
   for(const f of G.forts||[]){if(f.nat===n||f.prog<1||!SG_EST[f.k])continue;if(Math.hypot(f.x-x,f.z-z)<R*.7)s+=SG_EST[f.k];}return s;};}
