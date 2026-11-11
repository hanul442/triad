/* ===================== ORG: 중대·소대 자동 편성 =====================
   "중대 소대 만드는 건 자동으로", "내가 목표를 주고 증원해 주는 형식으로".
   - 사람 세력의 전투 부대(보병·차량)는 저절로 소대(4개 부대까지)로, 소대는 중대(3개 소대까지)로 묶인다.
     병종을 따른다(실제 편제): 보병 소대 분대 4개(화기팀 둘까지), 기계화 소대 장갑차 4대 + 분대 4개, 전차소대 4대.
     손실로 작아진 소대는 가까운 같은 갈래 소대와 합치고(옆 중대와도), 소대 하나만 남은 중대는 가까운 중대로 들어간다.
     새로 배속된 부대는 소대 임무를 같이 받거나 소대가 있는 곳으로 합류한다(orgJoin).
     지원 부대(보급·구급·구난·박격포·포병·저격·드론·대공·전자전)는 '본부'에 남아 알아서 일한다(02-helpers SELF_RUN).
   - 새로 온 증원은 '증원 받는 중대'(N2.reinfCo)로, 정하지 않았으면 가장 작은 중대의 빈 소대로 들어간다. 다 차면 새 중대.
   - 목표: 소대 목표 > 중대 목표 > 전체 주공(N2.intent) 순으로 따른다(06f autoIOf).
     부관 지휘 중이면 부관이 그 목표로 움직이고, 직접 지휘면 그 부대들에게 공격·방어 임무(06d)를 준다.
   - 손으로 다시 묶을 수도 있다(새 소대로·새 중대로).
   G.org[n] = {co:[{id,no,name,intent}], pq:[{id,co,no,name,intent}]}, 부대는 u.pq(소대 id). */
const ORG={pl:4,co:3,coMax:4,tick:1};
/* 중대에 이 갈래 소대가 하나 더 들어갈 자리: 보병·기계화 소대 셋 + 전차소대 하나(모두 넷까지) */
function orgCoRoom(n,c,tank){const P=orgCoPqs(n,c);if(P.length>=ORG.coMax)return false;if(tank)return true;return P.filter(p=>orgPqKind(n,p)!=='tank').length<ORG.co&&(P.length<ORG.co||P.some(p=>orgPqKind(n,p)==='tank'));}
const orgHQ=u=>!!SELF_RUN[u.type]||!!(UT[u.type]&&UT[u.type].fly);
const orgOn=n=>!!(G&&G.org&&G.org[n]&&G.nats[n]&&!isAI(n));
function orgOf(n){G.org=G.org||{};return G.org[n]||(G.org[n]={co:[],pq:[]});}
const orgCo=(n,id)=>id==null?null:orgOf(n).co.find(c=>c.id===id)||null;
const orgPq=(n,id)=>id==null?null:orgOf(n).pq.find(p=>p.id===id)||null;
const orgPqUnits=(n,p)=>G.units.filter(u=>u.nat===n&&u.pq===p.id);
const orgCoPqs=(n,c)=>orgOf(n).pq.filter(p=>p.co===c.id);
const orgCoUnits=(n,c)=>{const ids=new Set(orgCoPqs(n,c).map(p=>p.id));return G.units.filter(u=>u.nat===n&&ids.has(u.pq));};
const orgHQUnits=n=>G.units.filter(u=>u.nat===n&&orgHQ(u));
function orgNewCo(n){const O=orgOf(n);let k=1;while(O.co.some(c=>c.no===k))k++;const c={id:(G.orgId=(G.orgId||0)+1),no:k,name:`${k}중대`,intent:null};O.co.push(c);O.co.sort((a,b)=>a.no-b.no);return c;}
function orgNewPq(n,c){const O=orgOf(n);let k=1;while(O.pq.some(p=>p.co===c.id&&p.no===k))k++;
  const p={id:(G.orgId=(G.orgId||0)+1),co:c.id,no:k,name:`${c.no}중대 ${k}소대`,sh:`${c.no}-${k}`,intent:null};O.pq.push(p);O.pq.sort((a,b)=>(orgCo(n,a.co)?.no||0)-(orgCo(n,b.co)?.no||0)||a.no-b.no);return p;}
/* 죽어서 빈 소대·중대는 지운다 */
function orgClean(n){const O=orgOf(n);const live=new Set();for(const u of G.units)if(u.nat===n&&u.pq!=null)live.add(u.pq);
  for(const [x] of orgPax(n))if(x.pq!=null)live.add(x.pq);
  O.pq=O.pq.filter(p=>live.has(p.id)&&O.co.some(c=>c.id===p.co));O.co=O.co.filter(c=>O.pq.some(p=>p.co===c.id));
  const ok=new Set(O.pq.map(p=>p.id));for(const u of G.units)if(u.nat===n&&u.pq!=null&&(!ok.has(u.pq)||orgHQ(u)))u.pq=null;
  const N2=G.nats[n];if(N2.reinfCo!=null&&!orgCo(n,N2.reinfCo))N2.reinfCo=null;}
/* 병종 갈래와 실제 편제(한·미 보병·기계화·전차 소대):
   - 보병 소대: 분대 4개까지(소총분대 셋 + 화기분대 하나 꼴). 기관총·대전차 같은 화기팀은 소대에 둘까지 → 화기가 한 소대에 몰리지 않는다.
   - 기계화 보병 소대: 장갑차 4대까지 + 하차 분대 4개까지(K21·브래들리 소대는 장갑차 4대에 분대가 한 대씩). 장갑차 안에 탄 분대도 그 소대.
   - 전차 소대: 전차 4대(K2·M1 소대). 전차는 다른 병종과 섞지 않는다.
   - 중대: 소대 셋, 여기에 전차(또는 기계화) 소대 하나를 더 붙여 '중대 전투단'이 될 수 있다. */
const ORG_TANK=t=>t==='tank'||!!(UT[t]&&UT[t].mbt)||!!(typeof FLEET_BASE==='object'&&FLEET_BASE[t]&&FLEET_BASE[t][0]==='tank'&&!SELF_RUN[t]&&!(UT[t]&&UT[t].dozer));
const orgKind=u=>ORG_TANK(u.type)?'tank':UT[u.type]&&UT[u.type].cls==='veh'?'veh':'inf';
const ORG_WPN=new Set(['mg','at','atgm','tb']);
const orgWpn=u=>ORG_WPN.has(u.type)||!!(UT[u.type]&&UT[u.type].wpn);
const ORG_CAP={tank:4,veh:4,inf:4,w:2};
const ORG_VEH=ORG_CAP.veh;
/* 장갑차에 탄 분대(지도 밖 G.units에 없다)까지 포함한 소대원 */
function orgPax(n){const o=[];for(const v of G.units)if(v.nat===n&&v.pax&&v.pax.length)for(const p of v.pax)o.push([p,v]);return o;}
function orgPqAll(n,p){const us=orgPqUnits(n,p);for(const [x,v] of orgPax(n))if(x.pq===p.id||(x.pq==null&&v.pq===p.id))us.push(x);return us;}
function orgCnt(us){const c={tank:0,veh:0,inf:0,w:0};for(const x of us){c[orgKind(x)]++;if(orgWpn(x))c.w++;}return c;}
/* 이 부대들이 한 소대로 편제에 맞는가 */
function orgCapOk(us){const c=orgCnt(us);if(c.tank&&(c.veh||c.inf))return false;return c.tank<=ORG_CAP.tank&&c.veh<=ORG_CAP.veh&&c.inf<=ORG_CAP.inf&&c.w<=ORG_CAP.w;}
function orgPqKind(n,p){const us=orgPqAll(n,p);if(us.length&&us.every(u=>orgKind(u)==='tank'))return 'tank';return us.some(u=>orgKind(u)==='veh')?'mech':'inf';}
const ORG_KN={tank:'전차',mech:'기계화',inf:'보병'};
/* 이 소대에 이 부대가 맞는가 */
function orgFits(n,p,u){const us=orgPqAll(n,p).filter(x=>x!==u&&!(u.pax||[]).includes(x));return orgCapOk(us.concat([u],u.pax||[]));}
/* 소대가 작아졌나: 편제의 절반 이하 */
function orgSmall(us){const c=orgCnt(us);if(c.tank)return c.tank<=ORG_CAP.tank/2;return c.inf+c.veh<=2||c.veh&&c.veh<=ORG_CAP.veh/2&&c.inf<=ORG_CAP.inf/2;}
const orgCtr=us=>us.length?[us.reduce((a,u)=>a+u.x,0)/us.length,us.reduce((a,u)=>a+u.z,0)/us.length]:null;
/* 소대를 다른 중대로 옮긴다(번호도 그 중대를 따라) */
function orgMovePq(n,p,c){const O=orgOf(n);const c0=orgCo(n,p.co);if(!p.intent&&c0&&c0.intent)p.intent=c0.intent;let k=1;while(O.pq.some(q=>q!==p&&q.co===c.id&&q.no===k))k++;
  p.co=c.id;p.no=k;p.name=`${c.no}중대 ${k}소대`;p.sh=`${c.no}-${k}`;O.pq.sort((a,b)=>(orgCo(n,a.co)?.no||0)-(orgCo(n,b.co)?.no||0)||a.no-b.no);}
/* 판 처음: 전차는 전차소대로, 나머지는 좌우로 늘어놓아 고르게 소대로 나누고(화기팀은 소대마다 고르게) 장갑차를 소대마다 나눠 붙인다.
   중대는 보병·기계화 소대 셋씩, 전차소대는 중대마다 하나씩 붙이고 남으면 전차 중대. */
function orgInit(n,us){if(!us.length)return;const d=typeof depotOf==='function'?depotOf(n):{x:N/2,z:N/2};
  const fx=N/2-d.x,fz=N/2-d.z,L=Math.hypot(fx,fz)||1;const sx=-fz/L,sz=fx/L;   // 앞쪽에 직각인 축
  const lat=u=>u.x*sx+u.z*sz;us=us.slice().sort((a,b)=>lat(a)-lat(b)||a.id-b.id);
  const tanks=us.filter(u=>orgKind(u)==='tank'),veh=us.filter(u=>orgKind(u)==='veh'),inf=us.filter(u=>orgKind(u)==='inf');
  const G2=[];
  if(inf.length+veh.length){const k=Math.max(1,Math.ceil(inf.length/ORG_CAP.inf),Math.ceil(veh.length/ORG_CAP.veh),Math.ceil(inf.filter(orgWpn).length/ORG_CAP.w));for(let j=0;j<k;j++)G2.push([]);
    const rif=inf.filter(u=>!orgWpn(u)),wp=inf.filter(orgWpn);
    for(let i=0;i<rif.length;i++)G2[Math.floor(i*k/rif.length)].push(rif[i]);
    const ctr=g=>g.length?g.reduce((a,x)=>a+lat(x),0)/g.length:0;
    const put=(u,ok)=>{let b=null,bs=1e9;for(const g of G2){if(!ok(g))continue;const c=orgCnt(g);const sc=(orgKind(u)==='veh'?c.veh*100:c.w*100+c.inf*30)+(g.length?Math.abs(ctr(g)-lat(u)):0);if(sc<bs){bs=sc;b=g;}}(b||G2[G2.push([])-1]).push(u);};
    for(const u of wp)put(u,g=>orgCapOk(g.concat([u])));
    for(const v of veh)put(v,g=>orgCapOk(g.concat([v])));}
  const IG=G2.filter(g=>g.length),TG=[];
  if(tanks.length){const k=Math.ceil(tanks.length/ORG_CAP.tank);for(let j=0;j<k;j++)TG.push(tanks.filter((_,i)=>Math.floor(i*k/tanks.length)===j));}
  const nc=Math.max(Math.ceil(IG.length/ORG.co),IG.length?0:1);const C=[];for(let i=0;i<nc;i++)C.push(orgNewCo(n));
  IG.forEach((g,i)=>{const c=C[Math.floor(i*nc/IG.length)];const p=orgNewPq(n,c);for(const u of g)u.pq=p.id;});
  TG.forEach((g,i)=>{let c=C[i]&&orgCoPqs(n,C[i]).length<ORG.coMax?C[i]:null;if(!c){c=C.find(q=>!orgCoPqs(n,q).length||orgCoPqs(n,q).every(p=>orgPqKind(n,p)==='tank')&&orgCoPqs(n,q).length<ORG.co);if(!c){c=orgNewCo(n);C.push(c);}}
    const p=orgNewPq(n,c);for(const u of g)u.pq=p.id;});
  for(const [x,v] of orgPax(n))if(x.pq==null&&v.pq!=null)x.pq=v.pq;}
/* 새 부대 하나를 넣을 소대: 증원 받는 중대(없으면 작은 중대부터)에서 병종이 맞고 빈자리가 있는 소대(가장 모자란 소대부터), 없으면 새 소대·새 중대 */
function orgPlace(n,u){const O=orgOf(n),N2=G.nats[n];const c0=orgCo(n,N2.reinfCo);
  const cs=c0?[c0]:O.co.slice().sort((a,b)=>orgCoUnits(n,a).length-orgCoUnits(n,b).length||a.no-b.no);
  const k=orgKind(u);
  for(const c of cs){let pq=null,bm=1e9;for(const p of orgCoPqs(n,c)){if(p.man&&!c0)continue;if(!orgFits(n,p,u))continue;const us=orgPqAll(n,p);const q=orgCnt(us);
      // 모자란 정도: 장갑차는 분대보다 차가 적은 소대, 분대는 차보다 분대가 적은 소대를 먼저
      const m=us.length*10+(k==='veh'?(q.veh>=q.inf?40:0)-(q.inf>q.veh?20:0):k==='inf'?(q.veh>q.inf?-20:0):0);if(m<bm){bm=m;pq=p;}}
    if(pq){u.pq=pq.id;for(const x of u.pax||[])x.pq=pq.id;return pq;}}
  // 전차소대는 보병 중대에 하나 더 붙을 수 있다(중대 전투단)
  let c=c0?(orgCoPqs(n,c0).length<ORG.coMax?c0:null):cs.find(q=>orgCoRoom(n,q,k==='tank'));
  if(!c)c=orgNewCo(n);const pq=orgNewPq(n,c);u.pq=pq.id;for(const x of u.pax||[])x.pq=pq.id;return pq;}
/* 새로 배속된 부대는 알아서 소대로 간다: 직접 지휘면 소대(중대) 임무를 같이 받고, 임무가 없으면 소대가 있는 곳으로 합류.
   부관 지휘면 부관이 소대 목표로 움직인다. 기지에서 산 증원만(헬기 투입·시나리오로 놓인 부대는 그 자리에 둔다). */
function orgJoin(n,u,p){if(!u||!p||!G.units.includes(u)||autoOn(n)||UT[u.type].fly)return;const I=orgIntent(n,p.id);
  if(I){radioSend(n,[u],'mis',[I.k==='def'?'defend':'attack',I.x,I.z,'full']);return;}
  const c=orgCtr(orgPqUnits(n,p).filter(x=>x!==u&&!x.pax?.includes(u)));if(!c)return;if(Math.hypot(c[0]-u.x,c[1]-u.z)<5)return;
  radioSend(n,[u],'move',[c[0],c[1]]);}
/* 손실 뒤 재편: 병종이 맞는 작은 소대 둘(가까이 있는)을 하나로 합친다(같은 중대 먼저, 없으면 옆 중대와도).
   소대 하나만 남은 작은 중대는 자리가 있는 가까운 중대로 들어간다. 손으로 묶은 소대는 그대로 */
function orgMerge(n){const O=orgOf(n);let done=null;
  const P=O.pq.filter(p=>!p.man).map(p=>({p,us:orgPqAll(n,p)})).filter(q=>q.us.length&&orgSmall(q.us)).sort((a,b)=>a.us.length-b.us.length);
  for(const cross of [false,true]){
    for(let i=0;i<P.length&&!done;i++)for(let j=0;j<P.length&&!done;j++){if(i===j)continue;const a=P[i],b=P[j];if((a.p.co===b.p.co)===cross)continue;
      if(a.us.length>b.us.length||a.us.length===b.us.length&&i>j)continue;   // 작은 소대가 큰 소대로
      if(!orgCapOk(a.us.concat(b.us)))continue;if((orgPqKind(n,a.p)==='tank')!==(orgPqKind(n,b.p)==='tank'))continue;
      const ca=orgCtr(a.us.filter(u=>G.units.includes(u))),cb=orgCtr(b.us.filter(u=>G.units.includes(u)));if(!ca||!cb||Math.hypot(ca[0]-cb[0],ca[1]-cb[1])>10)continue;
      for(const u of a.us)u.pq=b.p.id;if(!b.p.intent&&a.p.intent&&!cross)b.p.intent=a.p.intent;done={from:a.p.name,to:b.p.name};}
    if(done)break;}
  if(!done)for(const c of O.co){const cp=orgCoPqs(n,c);if(cp.length!==1||cp[0].man)continue;const p=cp[0];const us=orgPqAll(n,p);const tk=orgPqKind(n,p)==='tank';
    const cc=orgCtr(us.filter(u=>G.units.includes(u)));if(!cc)continue;let best=null,bd=14;
    for(const q of O.co){if(q===c)continue;const qp=orgCoPqs(n,q);if(!orgCoRoom(n,q,tk)||qp.some(x=>x.man))continue;const qn=orgCoUnits(n,q).length,cn=us.length;if(qn<cn||qn===cn&&q.no>c.no)continue;   // 작은 중대가 큰 중대로
      const qc=orgCtr(orgCoUnits(n,q));if(!qc)continue;const dd=Math.hypot(qc[0]-cc[0],qc[1]-cc[1]);if(dd<bd){bd=dd;best=q;}}
    if(best){const from=p.name;orgMovePq(n,p,best);done={from,to:p.name,co:1};break;}}
  if(done){orgClean(n);if(n===G.viewer)L(done.co?`재편: ${done.from} → ${done.to} (작은 중대 통합)`:`재편: ${done.from} 남은 병력 → ${done.to}`);}
  return done;}
/* 편성 요약: "1중대(보병 2·전차 1)" */
function orgSum(n,c){const T={};for(const p of orgCoPqs(n,c)){const k=ORG_KN[orgPqKind(n,p)];T[k]=(T[k]||0)+1;}return Object.entries(T).map(([k,v])=>`${k} ${v}`).join('·');}
function orgTick(n){const O=orgOf(n);
  // 장갑차에서 내린·탄 분대가 소대를 잃지 않게: 차에 탄 분대도 산 부대로 친다
  for(const [x,v] of orgPax(n))if(x.pq==null&&v.pq!=null&&!orgHQ(x))x.pq=v.pq;
  orgClean(n);const us=G.units.filter(u=>u.nat===n&&!orgHQ(u)&&u.pq==null);
  if(us.length){if(!O.co.length){orgInit(n,us);if(n===G.viewer)L(`편성: ${O.co.map(c=>`${c.name}(${orgSum(n,c)} 소대)`).join(', ')}${orgHQUnits(n).length?` · 본부 지원 ${orgHQUnits(n).length}`:''}`);}
    else for(const u of us){const p=orgPlace(n,u);if(n===G.viewer&&(G.time||0)>3)L(`${UT[u.type].n} → ${p.name}(${ORG_KN[orgPqKind(n,p)]}) 배속`);}}
  if((G.time||0)>=(G.orgMT||0)){G.orgMT=(G.time||0)+5;orgMerge(n);}}
/* 목표 */
function orgIntent(n,pqId){if(!G.org||!G.org[n])return null;const p=orgPq(n,pqId);if(p){if(p.intent)return p.intent;const c=orgCo(n,p.co);if(c&&c.intent)return c.intent;return null;}
  if(pqId==null){const c=orgCo(n,G.nats[n].reinfCo);if(c&&c.intent)return c.intent;}return null;}
function orgClearIntents(n){if(!G.org||!G.org[n])return;for(const c of G.org[n].co)c.intent=null;for(const p of G.org[n].pq)p.intent=null;}
function orgRefUnits(n,ref){if(!ref)return [];if(ref.k==='hq')return orgHQUnits(n);if(ref.k==='all')return G.units.filter(u=>u.nat===n&&u.pq!=null);if(ref.k==='co'){const c=orgCo(n,ref.id);return c?orgCoUnits(n,c):[];}const p=orgPq(n,ref.id);return p?orgPqUnits(n,p):[];}
function orgRefName(n,ref){if(!ref)return '';if(ref.k==='hq')return '본부';if(ref.k==='all')return '전체';const o=ref.k==='co'?orgCo(n,ref.id):orgPq(n,ref.id);return o?o.name:'';}
/* 중대·소대에 목표 주기. k=null이면 목표를 지운다(부관 재량·임무 해제) */
function orgAim(n,ref,k,x,z){const O=orgOf(n);
  if(ref.k==='all'){// 전체: 부관이면 전체 주공, 직접 지휘면 중대마다 임무
    if(autoOn(n))return autoIntent(n,k,x,z);let I=null;for(const c of O.co.slice())I=orgAim(n,{k:'co',id:c.id},k,x,z)||I;return I;}const o=ref.k==='co'?orgCo(n,ref.id):ref.k==='pq'?orgPq(n,ref.id):null;if(!o)return null;
  const I=k?autoMkIntent(k,x,z):null;o.intent=I;if(ref.k==='co')for(const p of O.pq)if(p.co===o.id)p.intent=null;
  G.nats[n].aiT=0;
  if(!autoOn(n)){const us=orgRefUnits(n,ref);if(us.length)radioSend(n,us,'mis',I?[I.k==='def'?'defend':'attack',I.x,I.z,'full']:['off']);}
  return I;}
/* 손으로 다시 묶기: 고른 전투 부대를 새 소대로(같은 중대) 또는 새 중대로 */
function orgRegroup(n,us,kind){us=us.filter(u=>u&&u.nat===n&&!orgHQ(u)&&G.units.includes(u));if(!us.length)return null;orgClean(n);
  let c=null;if(kind==='pq'){const p0=orgPq(n,us[0].pq);c=p0?orgCo(n,p0.co):null;if(c&&orgCoPqs(n,c).filter(p=>orgPqUnits(n,p).some(u=>!us.includes(u))).length>=ORG.coMax)c=null;}
  if(!c)c=orgNewCo(n);const made=[];
  for(let i=0;i<us.length;i+=ORG.pl){const p=orgNewPq(n,c);p.man=true;made.push(p);for(const u of us.slice(i,i+ORG.pl))u.pq=p.id;}
  orgClean(n);return {c,made};}
/* ---------- 엔진에 끼우기 ---------- */
{const _t=rtTick;rtTick=function(dt){_t(dt);if(!G||G.over||!G.units)return;const t=G.time||0;if((G.orgT||0)>t)return;G.orgT=t+ORG.tick;
  for(const n of G.order){if(isAI(n)||!G.nats[n].alive)continue;try{orgTick(n);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}}};}
// 산 부대는 바로 소대에 넣는다
{const _b=buy;buy=function(n){const u=_b.apply(this,arguments);if(u&&G.org&&G.org[n]&&!isAI(n)&&!orgHQ(u)&&u.pq==null){const p=orgPlace(n,u);if(n===G.viewer)L(`${UT[u.type].n} → ${p.name}(${ORG_KN[orgPqKind(n,p)]}) 배속`);if((G.time||0)>3)orgJoin(n,u,p);}return u;};}
// 부관 지휘: 전술 소대(06c)는 편성 소대 안에서만 짠다
{const _to=tacOrganize;tacOrganize=function(n){if(!autoOn(n)||!orgOn(n))return _to(n);const P=tacPl();const t=G.time||0;
  for(const p of P)if(p.nat===n)p.mem=p.mem.filter(id=>G.units.some(u=>u.id===id&&u.nat===n));
  for(let i=P.length-1;i>=0;i--)if(P[i].nat===n&&!P[i].mem.length)P.splice(i,1);
  for(const u of G.units){if(u.nat!==n||!tacUnit(u))continue;const cur=u.pl!=null?P.find(p=>p.id===u.pl&&p.mem.includes(u.id)):null;
    if(cur&&(cur.human||cur.mode==='defend'&&!cur._idef||cur.pq===u.pq))continue;
    if(cur)cur.mem=cur.mem.filter(i=>i!==u.id);if(!u.tk)u.tk={role:'move',at:t};
    let best=null,bd=7;for(const p of P){if(p.nat!==n||p.human||p.pq!==u.pq||p.mode==='defend'&&!p._idef||p.mem.length>=TAC.size+1)continue;const c=tacCtr(p);if(!c)continue;const d=Math.hypot(c[0]-u.x,c[1]-u.z);if(d<bd){bd=d;best=p;}}
    if(!best){best={id:TACID++,nat:n,mem:[],mode:'attack',st:'move',stT:t,ph:0,phT:t,obj:null,objT:-99,pq:u.pq};P.push(best);}
    best.mem.push(u.id);u.pl=best.id;}
  for(let i=P.length-1;i>=0;i--)if(P[i].nat===n&&!P[i].mem.length)P.splice(i,1);};}
// 직접 지휘의 임무: 편성 소대마다 따로 임무 소대가 되고 이름도 편성을 따른다
{const _ma=msnAssign;msnAssign=function(n,us,mode,x,z,aut){if(!orgOn(n))return _ma.apply(this,arguments);
  const by=new Map();for(const u of us||[]){const k=u&&u.pq!=null?u.pq:'x';if(!by.has(k))by.set(k,[]);by.get(k).push(u);}
  if(by.size<2&&!by.has('x')){const P=_ma.apply(this,arguments);const p=orgPq(n,[...by.keys()][0]);if(p&&P)P.forEach((q,i)=>{q.pq=p.id;q.name=P.length>1?`${p.name}-${i+1}`:p.name;});return P;}
  let all=[];for(const [k,g] of by){const P=_ma(n,g,mode,x,z,aut)||[];const p=orgPq(n,k);if(p)P.forEach((q,i)=>{q.pq=p.id;q.name=P.length>1?`${p.name}-${i+1}`:p.name;});all=all.concat(P);}return all;};}
