/* ===================== PLAN: 목표를 이해하는 작전 계획 =====================
   "AI 관전하는데 AI가 objective를 이해 못하는 거 같아."
   예전에는 소대·차량이 저마다 '가장 가까운 남의 거점'으로 달려갔다. 그래서 힘이 흩어지고, 잡은 거점은 비워 두고,
   캠페인 임무(피란민 후송·폭약 해체·월미도 지키기)는 아예 몰랐다.
   여기서는 세력마다 몇 초에 한 번 작전을 짠다(교리: 공격·방어·증원·지원).
   - 방어: 위협받는 우리 거점(아는 적이 6칸 안)에는 적 전력의 1.3배를 붙인다. 빼앗긴 지 얼마 안 된 거점은 곧바로 역습한다.
   - 공격: 남의 거점 중 가치·거리·적 수비를 따져 '주공' 하나를 고르고, 적 수비의 2.5배(최소 소대 둘 남짓)를 몰아준다.
     힘이 남으면 '조공' 하나를 더 둔다. 남는 부대는 모두 주공으로(집중).
   - 집결: 주공 부대는 목표 5~6칸 앞 집결지에 모였다가, 맡은 힘의 65%가 모이거나 50초가 지나면 함께 들어간다.
     모이는 동안 화력 지원(포격·항공)은 목표 둘레 적을 먼저 친다(공격 준비 사격).
   - 지원: 곡사·저격·드론은 주공(없으면 가장 급한 방어)을 받쳐 준다. 새 증원은 주공 쪽 배치 칸에 내린다.
   - 임무: 캠페인마다 무엇이 승리 조건인지 안다(PLAN_M). 대사관 철수는 차량이 승차 지점과 집결지를 오가고,
     다리 확보는 공병이 폭약을 해체하는 동안 소대가 둘레를 쓸고, 인천은 월미도를 먼저 잡아 썰물 동안 지킨다.
   부관(06f)에게 플레이어가 목표를 주었으면 그 목표가 먼저다. 계획은 소대 목표(tacPickObj)와 aiGoal만 바꾸니
   이동·엄폐·사격·무전 지연은 예전 두뇌가 그대로 한다.
   G.plan[n] = {t, T:[과제], main(과제 id), a:{무리 id: 과제 id}, log}. 과제 = {id,k:'atk'|'def',x,z,r,c,obj,v(가치),need,est,go,asm:[x,z],why} */
const PLAN={cons:45,hyst:18,every:4,thr:6,est0:4,ratio:2.5,defK:1.3,min:5,asmD:5.5,go:.65,goT:50,counter:75,keep:1.35};
const PLAN_JOB={plan:1};
function planOf(n){G.plan=G.plan||{};return G.plan[n]||(G.plan[n]={t:-99,T:[],main:null,a:{},lost:{}});}
const planStr=u=>tacCost(u.type)*Math.max(.15,u.hp/hpMax(u));
/* 이 세력이 계획을 짜는가: AI 세력과 부관 세력. 부관에게 목표를 주었으면 그 목표를 따른다 */
const planOn=n=>!!(G&&G.nats&&G.nats[n]&&G.nats[n].alive!==false&&aiRun(n));
const planUser=(n,pq)=>typeof autoOn==='function'&&autoOn(n)&&!!autoIOf(n,pq);
/* 계획에 넣는 무리: 소대(사람 임무 소대·수비대 빼고), 소대 밖 지상 전투 차량 */
const planVeh=u=>{const t=UT[u.type];return t.cls==='veh'&&!t.ind&&!t.fly&&!t.logi&&!SELF_RUN[u.type]&&u.type!=='amb'&&!u.post&&!u.job;};
function planGroups(n){const out=[];
  for(const p of tacPl()){if(p.nat!==n||p.human||p.mode==='defend'&&!p._pd)continue;const M=tacMembers(p);if(!M.length)continue;const c=tacCtr(p);
    out.push({id:'p'+p.id,p,x:c[0],z:c[1],s:M.reduce((a,u)=>a+planStr(u),0),pq:M[0].pq});}
  for(const u of G.units){if(u.nat!==n||!planVeh(u)||u.pl)continue;out.push({id:'u'+u.id,u,x:u.x,z:u.z,s:planStr(u),pq:u.pq});}
  return out;}
/* 거점 둘레에서 이미 지키는 힘(수비대 소대·고정 부대·건물 안 보병) */
function planHeld(n,x,z,R){let s=0;for(const u of G.units){if(u.nat!==n||UT[u.type].fly||UT[u.type].logi||u.pl&&!(G.plat||[]).some(p=>p.id===u.pl&&p.mode==='defend'&&!p._pd)||planVeh(u))continue;if(Math.hypot(u.x-x,u.z-z)<R)s+=planStr(u);}return s;}
/* 적 수비 추정: 기억(20초)에 남은 적 + 진지. 아무것도 모르는 남의 거점은 소대 하나쯤 있다고 본다 */
function planEst(n,K,x,z,R,own){let s=0,k=0;for(const e of K){const d=Math.hypot(e.x-x,e.z-z);if(d>R)continue;k++;s+=tacCost(e.ty)*Math.max(.2,e.e.hp/hpMax(e.e))*(d<R*.6?1:.6);}
  for(const f of G.forts||[]){if(f.nat===n||f.prog<1)continue;if(Math.hypot(f.x-x,f.z-z)<R*.7)s+=f.k==='bunker'?3:f.k==='nest'||f.k==='fortb'?2:0;}
  if(!k&&own!=null&&own!==n)s=Math.max(s,PLAN.est0);return s;}
/* 집결지: 맡은 무리의 무게중심에서 목표 쪽, 목표 앞 asmD 칸 */
function planAsm(n,x,z,G0){const S=G0.reduce((a,g)=>a+g.s,0);const d=depotOf(n);const cx=S>0?G0.reduce((a,g)=>a+g.x*g.s,0)/S:d.x,cz=S>0?G0.reduce((a,g)=>a+g.z*g.s,0)/S:d.z;
  const dx=cx-x,dz=cz-z,L=Math.hypot(dx,dz)||1;if(L<PLAN.asmD+1)return null;const f=PLAN.asmD/L;
  return [Math.max(.5,Math.min(N-.5,x+dx*f)),Math.max(.5,Math.min(N-.5,z+dz*f))];}
/* ---------- 과제 만들기 ---------- */
function planTasks(n,K){const t=G.time||0;const P=planOf(n);const T=[];const M=planMission(n);
  // 거점 주인 기억(빼앗기면 역습 시각)
  P.cap=P.cap||{};for(let i=0;i<G.objs.length;i++){const o=G.objs[i];const own=G.map[o.r][o.c].owner;const k='o'+i;if(P[k]===n&&own!==n)P.lost[i]=t;else if(own===n){delete P.lost[i];if(P[k]!==n&&P[k]!==undefined)P.cap[i]=t;}P[k]=own;}
  const objs=M&&M.objs?M.objs:G.objs.map((o,i)=>({i,v:10}));
  for(let q of objs){const o=G.objs[q.i];if(!o)continue;const x=o.c+.5,z=o.r+.5;const own=G.map[o.r][o.c].owner;
    if(own===n){if(q.def===0)continue;const est=planEst(n,K,x,z,PLAN.thr,own);
      const cons=P.cap&&P.cap[q.i]!=null&&t-P.cap[q.i]<PLAN.cons;   // 막 잡은 거점: 자리를 굳히고 재편성(역습 대비)
      if(cons&&!q.def)q={...q,def:1.5};
      if(est>0||q.def)T.push({id:'d'+q.i,k:'def',obj:q.i,x,z,r:o.r,c:o.c,v:q.v*(q.def||1)+est,est,need:Math.max(est*PLAN.defK,q.def?PLAN.min*q.def:0)-planHeld(n,x,z,3.5)*.5,why:est>0?'위협받는 거점 방어':'거점 확보 유지'});}
    else{if(q.atk===0)continue;const est=planEst(n,K,x,z,5,own);
      const cnt=P.lost[q.i]!=null&&t-P.lost[q.i]<PLAN.counter;   // 빼앗긴 지 얼마 안 됐으면 역습
      T.push({id:'a'+q.i,k:'atk',obj:q.i,x,z,r:o.r,c:o.c,v:q.v*(q.atk||1)+(cnt?12:0)+(own==null?3:0),est,need:Math.max(PLAN.min,est*PLAN.ratio),cnt,why:cnt?'역습':own==null?'빈 거점 점령':'적 거점 공격'});}}
  if(M&&M.extra)for(const x of M.extra)T.push(x);
  return T;}
/* 과제 순서: 방어(위협 큰 것) → 역습 → 공격(가치/거리/수비) */
function planScore(T0,G0){const cx=G0.length?G0.reduce((a,g)=>a+g.x,0)/G0.length:N/2,cz=G0.length?G0.reduce((a,g)=>a+g.z,0)/G0.length:N/2;
  for(const T of T0){const d=Math.hypot(T.x-cx,T.z-cz);
    T.sc=T.k==='def'?100+T.v*2+(T.est>0?40:0):T.v*3-d*.9-T.est*1.2+(T.cnt?60:0)+(T.pri||0);}
  return T0.sort((a,b)=>b.sc-a.sc);}
/* ---------- 계획 ---------- */
function planMake(n){const t=G.time||0;const P=planOf(n);const K=tacKnown(n);const G0=planGroups(n);
  const T=planScore(planTasks(n,K),G0);const old=P.a||{};const A={};const have={};const byId={};for(const x of T){have[x.id]=0;byId[x.id]=x;}
  const free=G0.filter(g=>!planUser(n,g.pq));const gid={};for(const g of free)gid[g.id]=g;
  const atk=T.filter(x=>x.k==='atk'),def=T.filter(x=>x.k==='def'&&x.need>0);
  // 주공: 공격 과제 중 첫째. 조공: 힘이 남으면 둘째
  let main=atk[0]||null;const pm=P.main&&atk.find(x=>x.id===P.main);if(main&&pm&&pm!==main&&main.sc-pm.sc<PLAN.hyst){atk.splice(atk.indexOf(pm),1);atk.unshift(pm);main=pm;}   // 주공은 쉽게 바꾸지 않는다
  const total=free.reduce((a,g)=>a+g.s,0);
  const defNeed=def.reduce((a,x)=>a+x.need,0);
  const want=[...def];if(main)want.push(main);if(atk[1]&&total-defNeed-(main?main.need:0)>=atk[1].need)want.push(atk[1]);
  // 1) 하던 일을 계속(필요의 1.35배까지)
  const left=new Set(free.map(g=>g.id));
  for(const g of free){const o=old[g.id];const x=o&&byId[o];if(!x||!want.includes(x))continue;if(have[x.id]>=x.need*PLAN.keep&&x!==main&&!(x.k==='def'&&Math.hypot(g.x-x.x,g.z-x.z)<4))continue;A[g.id]=x.id;have[x.id]+=g.s;left.delete(g.id);}
  // 2) 모자란 과제에 가까운 무리부터
  for(const x of want){while(have[x.id]<x.need){let best=null,bd=1e9;for(const id of left){const g=gid[id];const d=Math.hypot(g.x-x.x,g.z-x.z);if(d<bd){bd=d;best=g;}}
      if(!best)break;A[best.id]=x.id;have[x.id]+=best.s;left.delete(best.id);}}
  // 3) 남는 무리는 주공으로(없으면 가장 급한 방어)
  const sink=main||def[0]||null;if(sink)for(const id of left){A[id]=sink.id;have[sink.id]+=gid[id].s;}
  // 집결: 공격은 모였다가 함께 들어간다(역습·약한 목표는 바로)
  const prevT=Object.fromEntries((P.T||[]).map(x=>[x.id,x]));
  for(const x of want){if(x.k!=='atk')continue;const pv=prevT[x.id];x.go=pv?!!pv.go:false;x.asm=pv?pv.asm:null;x.arr=pv?pv.arr:null;
    if(x.go)continue;if(x.cnt||x.est<=PLAN.est0*.6){x.go=true;continue;}
    const mine=free.filter(g=>A[g.id]===x.id);const tot=mine.reduce((a,g)=>a+g.s,0);x.asm=x.asm||planAsm(n,x.x,x.z,mine);if(!x.asm){x.go=true;continue;}
    const near=mine.filter(g=>Math.hypot(g.x-x.asm[0],g.z-x.asm[1])<3.5||Math.hypot(g.x-x.x,g.z-x.z)<PLAN.asmD).reduce((a,g)=>a+g.s,0);
    if(x.arr==null&&near>0)x.arr=t;
    const late=G.camp&&CAMP[G.camp.id]&&t>CAMP[G.camp.id].limit*.45||G.scn==='assault'&&t>ROUND_S*16*.4;   // 시간이 모자라면 기다리지 않는다
    const enough=tot>=x.need*.6;
    if(tot>0&&near>=tot*PLAN.go&&(enough||late)||x.arr!=null&&(t-x.arr>PLAN.goT&&(enough||late)||t-x.arr>PLAN.goT*2.4)){x.go=true;planLog(n,`${planName(x)} 공격 개시`);}}
  for(const x of T)x.have=have[x.id]||0;
  const newMain=main?main.id:null;
  if(main&&newMain!==P.lm){P.lm=newMain;planLog(n,`작전: 주공 ${planName(main)}${atk[1]&&want.includes(atk[1])?` · 조공 ${planName(atk[1])}`:''}`);}
  P.T=T;P.a=A;P.main=newMain;P.t=t;P.want=want.map(x=>x.id);
  return P;}
function planName(x){return x.name||(x.obj!=null&&G.objs[x.obj]?G.objs[x.obj].name:'목표');}
function planLog(n,m){const P=planOf(n);P.log=P.log||[];P.log.unshift({t:G.time||0,m});P.log=P.log.slice(0,6);}
/* 이 무리가 맡은 과제 */
function planTaskOf(n,gid){const P=G.plan&&G.plan[n];if(!P)return null;const id=P.a[gid];return id?P.T.find(x=>x.id===id)||null:null;}
function planMainOf(n){const P=G.plan&&G.plan[n];if(!P)return null;return P.T.find(x=>x.id===P.main)||P.T.find(x=>P.want&&P.want.includes(x.id))||null;}
/* 과제가 가리키는 점: 집결 중이면 집결지 */
function planPt(x){return x.k==='atk'&&!x.go&&x.asm?x.asm:[x.x,x.z];}

/* ---------- 임무별 지식 ----------
   objs: [{i,v,atk,def}] 거점마다 가치(v), 공격·방어 가중(0이면 그 과제를 만들지 않음, def>0이면 위협 없어도 그만큼 지킨다)
   extra: 거점이 아닌 과제(폭약 둘레 쓸기 등). job(n): 특정 부대에게 맡기는 일(후송·해체) */
const PLAN_M={
  evac:{side:{0:{objs:()=>[{i:0,v:30,atk:2,def:3}],job:planEvac}}},
  bridge:{side:{0:{objs:()=>{const S=G.camp.st;return S.disarmed?[{i:0,v:30,atk:2,def:S.counter?2.5:1},{i:1,v:4,atk:.6,def:0}]:[{i:0,v:8,atk:.5,def:0},{i:1,v:3,atk:.4,def:0}];},
      extra:()=>{const S=G.camp.st,ch=G.camp.charge;if(S.disarmed||S.blown)return [];return [{id:'x-ch',k:'atk',name:'서강교 폭약',x:ch.x,z:ch.z,r:Math.floor(ch.z),c:Math.floor(ch.x),v:40,est:0,need:PLAN.min*1.5,pri:80,why:'폭약 둘레 확보'}];},job:planDisarm},
    1:{objs:()=>[{i:0,v:30,def:2},{i:1,v:6,def:1}]}}},
  station:{side:{0:{objs:()=>{const S=G.camp.st;return [{i:0,v:30,atk:2,def:S.taken?2.5:1},{i:1,v:12,atk:1,def:.5}];}},
    1:{objs:()=>[{i:0,v:30,atk:2.5,def:2},{i:1,v:10,atk:1,def:1}]}}},
  omaha:{side:{0:{objs:()=>{const ex=[0,1,2].filter(ownObj).length;return [0,1,2].map(i=>({i,v:ex>=2?6:20,atk:1,def:.5})).concat([{i:3,v:ex>=2?40:4,atk:ex>=2?2:.2,def:1.5}]);}},
    1:{objs:()=>[0,1,2,3].map(i=>({i,v:i===3?20:14,def:1.2}))}}},
  incheon:{side:{0:{objs:()=>{const S=G.camp.st,w=ownObj(0);const late=S.tide!=='high1'&&S.tide!=='low1';
      // 아침 만조엔 월미도만, 썰물엔 월미도를 지키고(바다 증원이 끊긴다), 저녁 만조에 시가지로
      // 썰물 동안 남는 힘은 부두로: 부두를 잡으면 물때와 상관없이 증원이 들어온다
      if(!late)return [{i:0,v:40,atk:3,def:w?4:0},{i:1,v:w&&S.low?25:1,atk:w&&S.low?1.5:0,def:w?1:0},{i:2,v:1,atk:0,def:0},{i:3,v:1,atk:0,def:0}];
      return [{i:0,v:40,atk:3,def:2},{i:1,v:10,atk:.8,def:.5},{i:2,v:30,atk:2,def:1},{i:3,v:30,atk:2,def:1}];}},
    1:{objs:()=>[{i:0,v:30,atk:2.5,def:2},{i:1,v:10,def:1},{i:2,v:16,def:1.2},{i:3,v:16,def:1.2}]}}},
  'scn:assault':{side:{0:{objs:()=>G.objs.map((o,i)=>({i,v:12,atk:1,def:1}))}}},
  'scn:hold':{side:{0:{objs:()=>G.objs.map((o,i)=>{const m=(N-1)/2;const d=dist(o.r,o.c,m,m);return {i,v:d<8?20:6,atk:d<8?1.5:.3,def:d<8?1.5:.5};})}}},
};
function planMission(n){const k=G.camp?G.camp.id:G.scn&&G.scn!=='camp'?'scn:'+G.scn:null;const M=k&&PLAN_M[k];const s=M&&M.side[n];if(!s)return null;
  return {objs:s.objs?s.objs():null,extra:s.extra?s.extra():null,job:s.job||null};}
/* 일을 맡은 부대: 소대·aiThink에서 빼고(u.job=PLAN_JOB) 여기서 직접 몬다 */
function planTake(u,k){if(u.job&&u.job!==PLAN_JOB)return false;if(u.pl&&typeof msnLeave==='function')msnLeave(u);u.job=PLAN_JOB;u._pj=k;return true;}
function planFree(u){if(u.job===PLAN_JOB){u.job=null;u._pj=null;}}
function planGo(u,x,z,R){if(Math.hypot(u.x-x,u.z-z)<(R||.4))return;if(u.dest&&Math.hypot(u.dest[0]-x,u.dest[1]-z)<.3&&u.path&&u.path.length)return;const P=pathPts(u,x,z);if(P.length){u.path=P;u.dest=[x,z];u.tgt=null;u.tgtTile=null;}}
/* 대사관 철수: 험비·장갑차는 승차 지점 ↔ 서쪽 집결지를 오간다 */
function planEvac(n){const C=G.camp,S=C.st,lz=C.lz;const e=G.objs[0];
  // 대사관 경비대는 건물을 떠나지 않는다(빈 건물은 적 분대 하나만 들어와도 넘어간다)
  if(e&&S.wait>0)for(const u of G.units)if(u.nat===n&&UT[u.type].cls==='inf'&&u.r===e.r&&u.c===e.c&&!u.post){u.post=1;u._pgd=1;}
  for(const u of G.units){if(u.nat!==n||!EVAC_CAP[u.type])continue;if(u.vd&&u.vd.mob){planFree(u);continue;}if(!planTake(u,'evac'))continue;
    const p=S.pax[u.id]||0;
    if(p>0&&(p>=EVAC_CAP[u.type]||S.wait<=0)){// 집결지로
      if(inZone(n,u.r,u.c))continue;let best=null,bd=1e9;for(const [r,c] of zoneSpots(n)){const d=Math.hypot(c+.5-u.x,r+.5-u.z);if(d<bd&&mcost(u.type,G.map[r][c])<Infinity){bd=d;best=[c+.5,r+.5];}}
      if(best)planGo(u,best[0],best[1],.3);}
    else if(S.wait>0){// 승차 지점: 이미 다른 차가 서 있으면 옆에서 기다린다
      const busy=G.units.some(v=>v!==u&&v.nat===n&&EVAC_CAP[v.type]&&Math.hypot(v.x-lz.x,v.z-lz.z)<.9);
      const d=Math.hypot(u.x-lz.x,u.z-lz.z);if(d<1.5&&!(u.path&&u.path.length))continue;
      if(busy&&d<3)continue;planGo(u,lz.x+(busy?(u.id%2?.6:-.6):0),lz.z+(busy?.7:0),.3);}
    else planFree(u);}}
/* 다리 확보: 공병(없으면 소총분대) 하나가 폭약 위에 서서 해체한다. 크게 다치거나 무너지면 다른 부대로 바꾼다 */
function planDisarm(n){const C=G.camp,S=C.st,ch=C.charge;const cur=G.units.find(u=>u.nat===n&&u._pj==='dis');
  if(S.disarmed||S.blown){if(cur)planFree(cur);return;}
  let w=cur;if(w&&(w.hp<hpMax(w)*.3||w.brk)){planFree(w);w=null;}
  if(!w){let bs=-1e9;for(const u of G.units){if(u.nat!==n||(u.type!=='eng'&&u.type!=='rifle')||u.post||u.cqb||u.job&&u.job!==TAC_HIDE)continue;const s=(u.type==='eng'?8:0)-Math.hypot(u.x-ch.x,u.z-ch.z)+u.hp/hpMax(u)*3;if(s>bs){bs=s;w=u;}}
    if(!w||!planTake(w,'dis'))return;planLog(n,`${UT[w.type].n}: 서강교 폭약 해체 투입`);}
  // 폭약 둘레 3칸에 적이 있으면 강 이쪽에서 기다리고, 비면 붙는다
  const foe=G.units.some(e=>e.nat!==n&&!UT[e.type].fly&&Math.hypot(e.x-ch.x,e.z-ch.z)<3.2);const d=Math.hypot(w.x-ch.x,w.z-ch.z);
  if(!foe||d<2.2)planGo(w,ch.x,ch.z,.25);
  else{const dx=w.x-ch.x;planGo(w,ch.x+Math.sign(dx||-1)*3.6,ch.z,.6);}}

/* ---------- 엔진에 끼우기 ---------- */
function planThink(n){if(!planOn(n))return null;const P=planOf(n);const t=G.time||0;const M=planMission(n);
  if(t-P.t>=PLAN.every||!P.T.length)planMake(n);
  if(M&&M.job)try{M.job(n);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}
  return P;}
// 소대 목표: 계획이 맡긴 과제(부관에게 목표를 주었으면 그 목표)
{const _tp=tacPickObj;tacPickObj=function(p,K){const n=p.nat;if(!planOn(n)||p.human||planUser(n,p.pq)||p.mode==='defend'&&!p._pd)return _tp(p,K);
  const x=planTaskOf(n,'p'+p.id);if(!x){if(p._pd){p._pd=0;p.mode='attack';}return _tp(p,K);}
  const [px,pz]=planPt(x);
  if(x.k==='def'){p.mode='defend';p._pd=1;}else if(p._pd){p._pd=0;p.mode='attack';}
  if(!p.obj||p.obj[0]!==x.r||p.obj[1]!==x.c||!p.pt||Math.hypot(p.pt[0]-px,p.pt[1]-pz)>.3){p.obj=[x.r,x.c];p.pt=[px,pz];p.objT=G.time||0;}
  p.task=x.id;};}
// 소대 밖 부대(차량·곡사·저격·드론): 맡은 과제, 없으면 주공. 배치 칸 고르기(가짜 부대)도 주공 쪽으로
{const _g=aiGoal;aiGoal=function(n,u,vis){const g=_g(n,u,vis);if(!planOn(n)||planUser(n,u&&u.pq))return g;
  if(u&&u.id!=null&&vis&&vis.some(e=>e.r===g[0]&&e.c===g[1])&&dist(u.r,u.c,g[0],g[1])<4)return g;   // 바로 앞 적과 싸우는 중
  const x=(u&&u.id!=null&&planTaskOf(n,'u'+u.id))||planMainOf(n);if(!x)return g;const [px,pz]=planPt(x);
  if(x.k==='def'&&u&&u.id!=null&&Math.hypot(u.x-x.x,u.z-x.z)<3)return g&&dist(g[0],g[1],x.r,x.c)<4?g:[x.r,x.c];
  return [Math.floor(pz),Math.floor(px)];};}
// 화력 지원: 주공 목표(공격 준비 사격)와 위협받는 거점 둘레 적을 먼저
{const _s=aiSupport;aiSupport=function(n,E){if(!planOn(n)||!E.length)return _s(n,E);const P=G.plan&&G.plan[n];if(!P||!P.want)return _s(n,E);
  const pts=P.T.filter(x=>P.want.includes(x.id)).map(x=>[x.x,x.z]);const near=E.filter(e=>pts.some(([x,z])=>Math.hypot(e.x-x,e.z-z)<5));
  if(near.length&&near.length<E.length&&_s(n,near))return true;return _s(n,E);};}
// aiThink: 먼저 작전을 짜고(소대 목표가 계획을 따르게), 일을 맡은 부대는 u.job으로 예전 두뇌에서 빠진다
{const _ai=aiThink;aiThink=function(n){if(G._supOnly===n)return _ai(n);try{planThink(n);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}return _ai(n);};}
