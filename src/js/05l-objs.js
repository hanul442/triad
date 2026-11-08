/* ===================== 특별 거점: 건물마다 다른 모습과 쓰임 =====================
   거점 이름이 곧 그 건물의 종류다. 종류마다 차지한 세력이 얻는 것이 다르다.
     종합병원   의료: 후송된 중상자를 받아 치료하고(여럿이 분대로 돌아옴), 둘레 경상자를 치료 (05m-med)
     방송국     방송: 우리 보병 사기가 빨리 오르고, 차지하는 순간 다른 세력 보병 사기가 떨어짐
     통신탑     통신: 무전이 40% 빨리 닿고 둘레 4칸은 재밍이 안 먹힘. 탑 둘레 5칸 감시
     발전소     전력: 지휘점수 +2 /30초
     중앙역     철도: 둘레 2칸에서 증원, 증원 비용 1 환급
     중앙시장·항만청  물자: 둘레 2칸 아군 탄약 보충·차량 정비·보급 트럭 재적재
     대성당     첨탑: 아군이 곁에 있으면 둘레 7칸 감시
     시청·연방 법원·주 의회  행정: 승점 +1 /30초
     증권거래소 자금: 지휘점수 +1 /30초, 차지할 때마다 +4
     국립도서관 설계도: 둘레 4칸 건물 속까지 보임
     경찰청     무기고: 둘레 2칸 보병 탄약 보충, 둘레 2칸에서 증원한 보병은 숙련으로 시작
     공항 터미널·스타디움  항공: 둘레 2칸에서 드론·항공 증원, 항공 증원 비용 1 환급
   감시(ov)는 시야선 없이 높은 곳에서 내려다보는 것이라, 그 안의 적은 우리 모든 부대에게 보인다.
   캠페인은 임무가 따로 규칙을 정하므로 모습만 바뀌고 쓰임은 꺼진다. */
const OBJK={
  hosp:{n:'의료',ic:'✚',col:'#f2f0ea',fn:'후송된 중상자를 받아 치료해 분대로 돌려보냄(환자집결지보다 많이·빨리), 둘레 2칸 경상자 치료'},
  bcast:{n:'방송',ic:'📡',col:'#c7cdd3',fn:'우리 보병 사기 회복 1.5배, 차지하는 순간 다른 세력 보병 사기 −10'},
  comm:{n:'통신',ic:'📶',col:'#9aa2a8',fn:'무전 40% 빨라짐, 둘레 4칸 재밍 무시, 탑 둘레 5칸 감시',ov:5},
  power:{n:'전력',ic:'⚡',col:'#a7a097',fn:'지휘점수 +2 /30초',cp:2},
  rail:{n:'철도',ic:'🚉',col:'#b07a5a',fn:'둘레 2칸에서 증원, 증원 비용 1 환급',dep:2},
  supply:{n:'물자',ic:'📦',col:'#b8a68c',fn:'둘레 2칸 아군 탄약 보충·차량 정비·보급 트럭 재적재'},
  spire:{n:'첨탑',ic:'⛪',col:'#c7bba4',fn:'아군이 1칸 안에 있으면 둘레 7칸 감시',ov:7,ovNeed:1},
  gov:{n:'행정',ic:'🏛',col:'#e6d6b0',fn:'승점 +1 /30초',vp:1},
  bank:{n:'자금',ic:'💰',col:'#d6cfc0',fn:'지휘점수 +1 /30초, 차지할 때마다 +4',cp:1},
  archive:{n:'설계도',ic:'📜',col:'#c9ae86',fn:'둘레 4칸 건물 속까지 감시',ov:4,ovB:1},
  police:{n:'무기고',ic:'🚓',col:'#8fa3c4',fn:'둘레 2칸 보병 탄약 보충, 둘레 2칸에서 증원한 보병은 숙련으로 시작',dep:2},
  air:{n:'항공',ic:'✈',col:'#bfc3c4',fn:'둘레 2칸에서 드론·항공 증원, 항공 증원 비용 1 환급',dep:2,depFly:1},
};
const OBJ_KIND={'종합병원':'hosp','방송국':'bcast','통신탑':'comm','발전소':'power','중앙역':'rail','중앙시장':'supply','항만청':'supply','대성당':'spire',
  '시청':'gov','연방 법원':'gov','주 의회':'gov','증권거래소':'bank','국립도서관':'archive','경찰청':'police','공항 터미널':'air','스타디움':'air'};
// 광장(빈터)에 어울리는 것과 건물에 어울리는 것
const OBJ_OPEN=['통신탑','발전소','스타디움','중앙시장'],OBJ_SEMI=['항만청','종합병원','경찰청','공항 터미널'];
const objKind=o=>o?OBJ_KIND[o.name]||null:null;
const objOn=()=>!!G&&!G.camp;
/* 세력 n이 가진 종류 k 거점들 */
function objsOf(n,k){if(!G||!G.objs)return [];return G.objs.filter(o=>objKind(o)===k&&G.map[o.r][o.c].owner===n&&G.map[o.r][o.c].t!=='rubble');}
const objHas=(n,k)=>objOn()&&objsOf(n,k).length>0;
/* 거점 설명 한 줄(화면용) */
function objFnText(o){const k=objKind(o);if(!k)return '';const d=OBJK[k];return `${d.ic} ${d.n}: ${d.fn}${G&&G.camp?' (캠페인에서는 꺼짐)':''}`;}
function objLabel(o){const k=objKind(o);return k?`${OBJK[k].ic} ${o.name}`:o.name;}

/* ---------- 지도 만들 때: 거점 이름을 땅 모양에 맞춰 다시 붙이고 건물 색을 입힌다 ---------- */
{const _gm=genMap;genMap=function(seed,objPer){const out=_gm(seed,objPer);try{objAssign(out,seed);}catch(e){}return out;};}
function objAssign(out,seed){const {map,objs}=out;const R=mulberry((seed|0)^0x5eed0b);
  const sh=a=>{for(let j=a.length-1;j>0;j--){const q=Math.floor(R()*(j+1));[a[j],a[q]]=[a[q],a[j]];}return a;};
  const open=sh(OBJ_NAMES.filter(s=>OBJ_OPEN.includes(s))),semi=sh(OBJ_NAMES.filter(s=>OBJ_SEMI.includes(s))),closed=sh(OBJ_NAMES.filter(s=>!OBJ_OPEN.includes(s)&&!OBJ_SEMI.includes(s)));
  // 같은 정준 거점의 네 회전 복사본은 땅 모양이 같다. 광장은 빈터용 → 반쯤 → 건물용, 건물은 건물용 → 반쯤 → 빈터용 순으로 이름을 받는다
  for(const o of objs){const x=map[o.r][o.c];const order=x.t==='bldg'?[closed,semi,open]:[open,semi,closed];const pool=order.find(a=>a.length);o.name=(pool&&pool.shift())||o.name;
    const k=OBJ_KIND[o.name];if(!k)continue;x.lk=k;
    // 같은 건물(blk) 전체를 그 건물 색으로
    if(x.t==='bldg'&&x.blk!=null){for(let r=Math.max(0,o.r-4);r<=Math.min(N-1,o.r+4);r++)for(let c=Math.max(0,o.c-4);c<=Math.min(N-1,o.c+4);c++){const y=map[r][c];if(y.t==='bldg'&&y.blk===x.blk)y.lkc=OBJK[k].col;}}
    x.lkc=OBJK[k].col;
    // 높이: 병원은 5층 이상, 관공서는 4층 이상
    if(x.t==='bldg'){if(k==='hosp')x.f=Math.max(x.f,5);if(k==='gov'||k==='bank'||k==='archive')x.f=Math.max(x.f,4);
      x.bmax=8+x.f*3;x.bhp=x.bmax;}}}

/* ---------- 감시: 통신탑·첨탑·설계도 ---------- */
function objOvList(n){if(!objOn())return [];const out=[];
  for(const o of G.objs){const k=objKind(o);const d=k&&OBJK[k];if(!d||!d.ov)continue;const x=G.map[o.r][o.c];if(x.owner!==n||x.t==='rubble')continue;
    if(d.ovNeed&&!G.units.some(u=>u.nat===n&&!UT[u.type].fly&&Math.abs(u.x-(o.c+.5))<=1.6&&Math.abs(u.z-(o.r+.5))<=1.6))continue;
    out.push({x:o.c+.5,z:o.r+.5,r:d.ov,b:!!d.ovB,k});}
  return out;}
function objOvSees(e,n){if(!G||!G.fog||e.nat===n)return false;const L=objOvList(n);if(!L.length)return false;const [ex,ez]=posOf(e);
  for(const v of L){if(Math.hypot(ex-v.x,ez-v.z)>v.r)continue;
    // 설계도: 건물 속 적만 / 탑·첨탑: 건물 속은 못 봄(지붕·창가 제외)
    const inB=cell(e.r,e.c).t==='bldg';if(v.b?inB:(!inB||(typeof onRoof==='function'&&onRoof(e))))return true;}
  return false;}
{const _s=seen;seen=function(e,n,vs){if(_s(e,n,vs))return true;try{return objOvSees(e,n);}catch(err){return false;}};
 const _v=visSet;visSet=function(n){const s=_v(n);if(s._ov)return s;s._ov=1;try{const L=objOvList(n);if(!L.length)return s;const R=s.R||FOW_R,M=N*R;
     for(const v of L){const i0=Math.max(0,Math.floor((v.x-v.r)*R)),i1=Math.min(M-1,Math.floor((v.x+v.r)*R)),j0=Math.max(0,Math.floor((v.z-v.r)*R)),j1=Math.min(M-1,Math.floor((v.z+v.r)*R));
       for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const px=(i+.5)/R,pz=(j+.5)/R;if(Math.hypot(px-v.x,pz-v.z)>v.r)continue;const r=Math.floor(pz),c=Math.floor(px);if(v.b&&G.map[r][c].t!=='bldg')continue;
         s.fine[j*M+i]=1;s.add(key(r,c));}}}catch(e){}return s;};}

/* ---------- 무전: 통신탑 ---------- */
if(typeof radioSend==='function'){const _rs=radioSend;radioSend=function(n,us,k,a){const n0=(G.rq||[]).length;const now=G.time||0;const out=_rs(n,us,k,a);
   if(objHas(n,'comm')&&G.rq)for(let i=n0;i<G.rq.length;i++){const e=G.rq[i];if(e.nat===n&&e.t0===now)e.at=now+(e.at-now)*.6;}return out;};}
if(typeof radioCut==='function'){const _rc=radioCut;radioCut=function(u){if(objOn())for(const o of objsOf(u.nat,'comm'))if(Math.hypot(u.x-(o.c+.5),u.z-(o.r+.5))<=4)return false;return _rc(u);};}

/* ---------- 지휘점수·승점 ---------- */
{const _in=income;income=function(n){let cp=_in(n);if(!objOn())return cp;for(const k in OBJK)if(OBJK[k].cp)cp+=OBJK[k].cp*objsOf(n,k).length;return cp;};
 const _rr=rtRound;rtRound=function(){_rr.apply(this,arguments);if(!objOn())return;for(const n of G.order){if(!G.nats[n].alive)continue;const v=objsOf(n,'gov').length;if(v)G.nats[n].vp+=v;}};}

/* ---------- 증원: 역·경찰청·공항 둘레 ---------- */
{const _ds=deploySpots;deploySpots=function(n,type){const out=_ds(n,type);if(!objOn())return out;const fly=!!UT[type].fly;const have=new Set(out);
   const O=occ();const inc=new Set(G.units.map(o=>key(Math.floor(o.z),Math.floor(o.x))));
   for(const o of G.objs){const k=objKind(o);const d=k&&OBJK[k];if(!d||!d.dep||(d.depFly&&!fly))continue;const y=G.map[o.r][o.c];if(y.owner!==n||y.t==='rubble')continue;
     if(G.units.some(e=>e.nat!==n&&dist(e.r,e.c,o.r,o.c)<=2))continue;   // 적이 붙어 있으면 못 내림
     for(let r=o.r-d.dep;r<=o.r+d.dep;r++)for(let c=o.c-d.dep;c<=o.c+d.dep;c++){if(!inb(r,c))continue;const kk=key(r,c);if(have.has(kk)||O.has(kk)||inc.has(kk))continue;if(mcost(type,G.map[r][c])===Infinity)continue;have.add(kk);out.push(kk);}}
   return out;};
 const _b=buy;buy=function(n,type,r,c){const u=_b(n,type,r,c);if(!u||!objOn())return u;const N2=G.nats[n];const near=k=>objsOf(n,k).some(o=>dist(o.r,o.c,r,c)<=2);
   if(near('rail')&&!UT[type].fly){N2.cp+=1;}
   else if(UT[type].fly&&objHas(n,'air')){N2.cp+=1;}
   if(UT[type].cls==='inf'&&near('police')&&typeof giveXp==='function'&&!(u.xp>=25)){giveXp(u,25-(u.xp||0));}
   return u;};}

/* ---------- 매 틱: 차지 바뀜, 물자·무기고, 방송 ---------- */
function objCapture(o,n,was){const k=objKind(o);if(!k)return;const d=OBJK[k];
  if(k==='bcast'){for(const u of G.units)if(u.nat!==n&&UT[u.type].cls==='inf')u.mor=Math.max(0,(u.mor??80)-10);
    for(const u of G.units)if(u.nat===n&&UT[u.type].cls==='inf')u.mor=Math.min(100,(u.mor??80)+8);}
  if(k==='bank')G.nats[n].cp+=4;
  if(!isAI(n)||!G.fog||n===G.viewer)L(`${natName(n)} ${o.name} 장악 · ${d.ic} ${d.n}: ${d.fn}`);}
function objTick(dt){if(!objOn()||!G.objs)return;
  const ow=G.objs.map(o=>G.map[o.r][o.c].owner);const prev=G._objOw;G._objOw=ow;
  if(prev&&prev.length===ow.length)for(let i=0;i<ow.length;i++)if(ow[i]!=null&&ow[i]!==prev[i])objCapture(G.objs[i],ow[i],prev[i]);
  for(const o of G.objs){const k=objKind(o);if(k!=='supply'&&k!=='police')continue;const x=G.map[o.r][o.c];if(x.owner==null||x.t==='rubble')continue;const n=x.owner;const cx=o.c+.5,cz=o.r+.5;
    for(const u of G.units){if(u.nat!==n||UT[u.type].fly)continue;if(Math.abs(u.x-cx)>2.5||Math.abs(u.z-cz)>2.5)continue;
      if(k==='police'&&UT[u.type].cls!=='inf')continue;
      if(typeof amMax==='function'){const M=amMax(u);if(M&&amOf(u)<M)u.am=Math.min(M,u.am+M*.05*dt);}
      if(k==='supply'){if(u.type==='sup'&&u.cargo!=null)u.cargo=Math.min(typeof CARGO!=='undefined'?CARGO:100,u.cargo+6*dt);
        if(UT[u.type].cls==='veh'&&typeof fixVeh==='function'&&!(u.path&&u.path.length)&&u.towBy==null)fixVeh(u,dt,.5);}}}}
{const _t=rtTick;rtTick=function(dt){_t(dt);if(!G||!G.units||G.over)return;try{objTick(dt);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}};}
/* 방송: 사기 회복 1.5배 */
if(typeof morTick==='function'){const _m=morTick;morTick=function(u,dt){const m0=u.mor;_m(u,dt);if(m0!=null&&u.mor>m0&&objHas(u.nat,'bcast'))u.mor=Math.min(100,u.mor+(u.mor-m0)*.5);};}

/* ---------- AI: 쓸모 있는 거점을 조금 더 노린다 ---------- */
// 거점 점수에 종류별 가치를 얹는다(이미 가진 종류는 덜)
const OBJ_AIW={hosp:6,bcast:5,comm:6,power:7,rail:5,supply:5,spire:4,gov:8,bank:5,archive:3,police:5,air:3};
{const _ps=aiPosScore;aiPosScore=function(u,r,c,goal,vis,n){let s=_ps(u,r,c,goal,vis,n);if(!objOn())return s;const x=G.map[r][c];
   if(x.obj!=null&&x.owner!==n&&UT[u.type].cap){const k=objKind(G.objs[x.obj]);if(k)s+=(OBJ_AIW[k]||0)*(objsOf(n,k).length?.4:1);}return s;};}
