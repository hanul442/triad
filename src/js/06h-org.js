/* ===================== ORG: 중대·소대 자동 편성 =====================
   "중대 소대 만드는 건 자동으로", "내가 목표를 주고 증원해 주는 형식으로".
   - 사람 세력의 전투 부대(보병·차량)는 저절로 소대(4개 부대까지)로, 소대는 중대(3개 소대까지)로 묶인다.
     지원 부대(보급·구급·구난·박격포·포병·저격·드론·대공·전자전)는 '본부'에 남아 알아서 일한다(02-helpers SELF_RUN).
   - 새로 온 증원은 '증원 받는 중대'(N2.reinfCo)로, 정하지 않았으면 가장 작은 중대의 빈 소대로 들어간다. 다 차면 새 중대.
   - 목표: 소대 목표 > 중대 목표 > 전체 주공(N2.intent) 순으로 따른다(06f autoIOf).
     부관 지휘 중이면 부관이 그 목표로 움직이고, 직접 지휘면 그 부대들에게 공격·방어 임무(06d)를 준다.
   - 손으로 다시 묶을 수도 있다(새 소대로·새 중대로).
   G.org[n] = {co:[{id,no,name,intent}], pq:[{id,co,no,name,intent}]}, 부대는 u.pq(소대 id). */
const ORG={pl:4,co:3,coMax:4,tick:1};
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
  O.pq=O.pq.filter(p=>live.has(p.id)&&O.co.some(c=>c.id===p.co));O.co=O.co.filter(c=>O.pq.some(p=>p.co===c.id));
  const ok=new Set(O.pq.map(p=>p.id));for(const u of G.units)if(u.nat===n&&u.pq!=null&&(!ok.has(u.pq)||orgHQ(u)))u.pq=null;
  const N2=G.nats[n];if(N2.reinfCo!=null&&!orgCo(n,N2.reinfCo))N2.reinfCo=null;}
/* 판 처음: 아군 전투 부대를 좌우로 늘어놓고 고르게 소대로 나눈다 */
function orgInit(n,us){if(!us.length)return;const d=typeof depotOf==='function'?depotOf(n):{x:N/2,z:N/2};
  const fx=N/2-d.x,fz=N/2-d.z,L=Math.hypot(fx,fz)||1;const sx=-fz/L,sz=fx/L;   // 앞쪽에 직각인 축
  us=us.slice().sort((a,b)=>(a.x*sx+a.z*sz)-(b.x*sx+b.z*sz)||a.id-b.id);
  const k=Math.ceil(us.length/ORG.pl);let c=null,pq=null,cur=-1;
  for(let i=0;i<us.length;i++){const j=Math.floor(i*k/us.length);if(j!==cur){cur=j;if(!c||orgCoPqs(n,c).length>=ORG.co)c=orgNewCo(n);pq=orgNewPq(n,c);}us[i].pq=pq.id;}}
/* 새 부대 하나를 넣을 소대 */
function orgPlace(n,u){const O=orgOf(n),N2=G.nats[n];let c=orgCo(n,N2.reinfCo);const pick=!!c;
  if(!c){let bs=1e9;for(const q of O.co){const P=orgCoPqs(n,q);const full=P.length>=ORG.co&&P.every(p=>orgPqUnits(n,p).length>=ORG.pl);if(full)continue;const m=orgCoUnits(n,q).length;if(m<bs){bs=m;c=q;}}}
  if(!c)c=orgNewCo(n);
  let pq=null,bm=99;for(const p of orgCoPqs(n,c)){const m=orgPqUnits(n,p).length;if(m<ORG.pl&&m<bm){bm=m;pq=p;}}
  if(!pq){if(pick&&orgCoPqs(n,c).length>=ORG.coMax)c=orgNewCo(n);pq=orgNewPq(n,c);}
  u.pq=pq.id;return pq;}
function orgTick(n){orgClean(n);const O=orgOf(n);const us=G.units.filter(u=>u.nat===n&&!orgHQ(u)&&u.pq==null);if(!us.length)return;
  if(!O.co.length)orgInit(n,us);else for(const u of us){const p=orgPlace(n,u);if(n===G.viewer&&(G.time||0)>3)L(`${UT[u.type].n} → ${p.name} 배속`);}}
/* 목표 */
function orgIntent(n,pqId){if(!G.org||!G.org[n])return null;const p=orgPq(n,pqId);if(p){if(p.intent)return p.intent;const c=orgCo(n,p.co);if(c&&c.intent)return c.intent;return null;}
  if(pqId==null){const c=orgCo(n,G.nats[n].reinfCo);if(c&&c.intent)return c.intent;}return null;}
function orgClearIntents(n){if(!G.org||!G.org[n])return;for(const c of G.org[n].co)c.intent=null;for(const p of G.org[n].pq)p.intent=null;}
function orgRefUnits(n,ref){if(!ref)return [];if(ref.k==='hq')return orgHQUnits(n);if(ref.k==='co'){const c=orgCo(n,ref.id);return c?orgCoUnits(n,c):[];}const p=orgPq(n,ref.id);return p?orgPqUnits(n,p):[];}
function orgRefName(n,ref){if(!ref)return '';if(ref.k==='hq')return '본부';const o=ref.k==='co'?orgCo(n,ref.id):orgPq(n,ref.id);return o?o.name:'';}
/* 중대·소대에 목표 주기. k=null이면 목표를 지운다(부관 재량·임무 해제) */
function orgAim(n,ref,k,x,z){const O=orgOf(n);const o=ref.k==='co'?orgCo(n,ref.id):ref.k==='pq'?orgPq(n,ref.id):null;if(!o)return null;
  const I=k?autoMkIntent(k,x,z):null;o.intent=I;if(ref.k==='co')for(const p of O.pq)if(p.co===o.id)p.intent=null;
  G.nats[n].aiT=0;
  if(!autoOn(n)){const us=orgRefUnits(n,ref);if(us.length)radioSend(n,us,'mis',I?[I.k==='def'?'defend':'attack',I.x,I.z,'full']:['off']);}
  return I;}
/* 손으로 다시 묶기: 고른 전투 부대를 새 소대로(같은 중대) 또는 새 중대로 */
function orgRegroup(n,us,kind){us=us.filter(u=>u&&u.nat===n&&!orgHQ(u)&&G.units.includes(u));if(!us.length)return null;orgClean(n);
  let c=null;if(kind==='pq'){const p0=orgPq(n,us[0].pq);c=p0?orgCo(n,p0.co):null;if(c&&orgCoPqs(n,c).filter(p=>orgPqUnits(n,p).some(u=>!us.includes(u))).length>=ORG.coMax)c=null;}
  if(!c)c=orgNewCo(n);const made=[];
  for(let i=0;i<us.length;i+=ORG.pl){const p=orgNewPq(n,c);made.push(p);for(const u of us.slice(i,i+ORG.pl))u.pq=p.id;}
  orgClean(n);return {c,made};}
/* ---------- 엔진에 끼우기 ---------- */
{const _t=rtTick;rtTick=function(dt){_t(dt);if(!G||G.over||!G.units)return;const t=G.time||0;if((G.orgT||0)>t)return;G.orgT=t+ORG.tick;
  for(const n of G.order){if(isAI(n)||!G.nats[n].alive)continue;try{orgTick(n);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}}};}
// 산 부대는 바로 소대에 넣는다
{const _b=buy;buy=function(n){const u=_b.apply(this,arguments);if(u&&G.org&&G.org[n]&&!isAI(n)&&!orgHQ(u)&&u.pq==null){const p=orgPlace(n,u);if(n===G.viewer)L(`${UT[u.type].n} → ${p.name} 배속`);}return u;};}
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
