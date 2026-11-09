/* ===================== AUTO: 부관에게 맡기기 (쉬운 지휘) =====================
   "어렵다, 명령만 내리면 AI가 알아서 했으면" 하는 의견을 받아, 플레이어 세력도 AI 두뇌(aiThink: 소대 전술·화력 지원·
   증원·보급·후송·건물 돌입…)가 움직이게 한다. 플레이어는 큰 방향만 정한다.
   - G.nats[n].auto = 부관이 지휘 중. 컨트롤은 그대로 사람(ctrl 'human')이라 화면·조작은 바뀌지 않는다.
   - 주공 목표 N2.intent = {k:'atk'|'def', x,z, r,c}: 공격이면 모든 소대·차량이 그쪽으로, 방어면 그 둘레를 지킨다.
     없으면 부관이 알아서 가까운 거점부터 잡는다.
   - 플레이어가 부대에 직접 명령(이동·공격·정지 등)을 주면 그 부대는 '직접 지휘'(u.man)가 되어 부관이 손대지 않는다.
     명령을 다 하고 45초 동안 새 명령이 없으면(사수 명령이 아니면) 다시 부관에게 돌아간다.
   - 자동 증원 N2.autoBuy(기본 켬): 끄면 부관이 지휘점수로 부대를 사지 않는다(화력 지원은 계속 부른다).
   - 부관이 부르는 화력 지원은 AI처럼 구호소·민간인 둘레를 피한다(G._adj).
   이 파일은 06z-radio-ai보다 먼저 읽혀야 한다: 부관의 명령도 무전(06z-radio-ai)을 탄다. */
const AUTO={hold:45,near:4};
const AUTO_HIDE={auto:1};
const autoOn=n=>!!(G&&G.nats&&G.nats[n]&&G.nats[n].auto&&!isAI(n));
function autoSet(n,on){const N2=G.nats[n];if(!N2)return;N2.auto=!!on;if(N2.autoBuy==null)N2.autoBuy=true;
  if(!on){// 부관이 짠 소대는 풀고, 부대는 그 자리에 선다
    const P=tacPl();for(let i=P.length-1;i>=0;i--){const p=P[i];if(p.nat!==n||p.human)continue;for(const id of p.mem){const u=G.units.find(o=>o.id===id);if(u){u.pl=null;u.tk=null;}}P.splice(i,1);}
    for(const u of G.units)if(u.nat===n)u.man=null;}
  else{N2.aiT=0;}}
/* 주공 목표: 거점 1.5칸 안을 누르면 그 거점에 맞춘다 */
function autoMkIntent(k,x,z){let bx=x,bz=z,obj=null;for(const o of G.objs){const d=Math.hypot(o.c+.5-x,o.r+.5-z);if(d<1.5&&(!obj||d<obj.d)){obj={o,d};}}
  if(obj){bx=obj.o.c+.5;bz=obj.o.r+.5;}bx=Math.max(.5,Math.min(N-.5,bx));bz=Math.max(.5,Math.min(N-.5,bz));
  return {k:k==='def'?'def':'atk',x:bx,z:bz,r:Math.floor(bz),c:Math.floor(bx),t:G.time||0,obj:obj?obj.o.name:null};}
function autoIntent(n,k,x,z){const N2=G.nats[n];if(!N2)return null;if(typeof orgClearIntents==='function')orgClearIntents(n);   // 전체 주공을 정하면 중대·소대 목표는 지운다
  if(!k){N2.intent=null;return null;}N2.intent=autoMkIntent(k,x,z);N2.aiT=0;return N2.intent;}
/* 이 소대(편성 pq)가 따를 목표: 소대 목표 > 중대 목표 > 전체 주공 */
function autoIOf(n,pq){const I=typeof orgIntent==='function'?orgIntent(n,pq):null;return I||G.nats[n].intent;}
/* 직접 지휘 중인가: 움직이는 중·사수 중이면 계속, 아니면 마지막 명령 뒤 45초 */
function autoManual(u){if(u.man==null)return false;const t=G.time||0;if(u.hold||u.path&&u.path.length||u.tgt!=null||u.cqb)return true;
  if(t-u.man<AUTO.hold)return true;u.man=null;return false;}
/* ---------- 엔진에 끼우기 ---------- */
// 플레이어 명령을 받은 부대는 직접 지휘로
{const _rs=radioSend;radioSend=function(n,us,k,a){if(k!=='mis'&&k!=='ai'){const on=autoOn(n);for(const u of us||[])if(u&&u.nat===n&&(on||SELF_RUN[u.type]))u.man=G.time||0;}return _rs.apply(this,arguments);};}
// 부관 세력: 직접 지휘 부대를 숨기고 생각한다. 자동 증원이 꺼져 있으면 사지 않는다
{const _ai=aiThink;aiThink=function(n){if(!autoOn(n))return _ai(n);const hid=[];
  for(const u of G.units)if(u.nat===n&&!u.job&&autoManual(u)){u.job=AUTO_HIDE;hid.push(u);}
  const prev=G._adj;G._adj=n;
  try{return _ai(n);}finally{G._adj=prev;for(const u of hid)if(u.job===AUTO_HIDE)u.job=null;}};}
// 임무 지휘(06d)의 소대 판단은 부관 세력이면 aiThink 안에서 이미 한다(두 번 하면 직접 지휘 부대까지 소대로 끌려간다)
{const _m=msnThink;msnThink=function(n){if(!autoOn(n))return _m(n);for(const p of tacPl())if(p.nat===n&&p.human)msnCas(p);for(const u of G.units)if(u.nat===n&&u.msn)msnFollow(u);};}
{const _b=buy;buy=function(n){if(G._adj===n&&G.nats[n]&&G.nats[n].autoBuy===false)return null;return _b.apply(this,arguments);};}
// 주공 목표: 소대가 아닌 부대(차량·곡사·저격·드론)는 aiGoal로, 바로 앞 적과 싸우는 중이면 그 적
{const _g=aiGoal;aiGoal=function(n,u,vis){const g=_g(n,u,vis);const I=autoOn(n)&&autoIOf(n,u.pq);if(!I)return g;
  if(vis&&vis.some(e=>e.r===g[0]&&e.c===g[1])&&dist(u.r,u.c,g[0],g[1])<AUTO.near)return g;
  if(I.k==='def'&&dist(u.r,u.c,I.r,I.c)<3)return g&&dist(g[0],g[1],I.r,I.c)<4?g:[I.r,I.c];
  return [I.r,I.c];};}
// 주공 목표: 소대는 목표를 그쪽으로(수비대로 남긴 소대는 그대로)
{const _tp=tacPickObj;tacPickObj=function(p,K){const N2=G.nats[p.nat];const I=autoOn(p.nat)&&!p.human?autoIOf(p.nat,p.pq):null;
  if(p.mode==='defend'&&!p._idef)return _tp(p,K);
  if(!I){if(p._idef){p._idef=0;p.mode='attack';p.obj=null;p.pt=null;}return _tp(p,K);}
  if(I.k==='def'){p.mode='defend';p._idef=1;}else if(p._idef){p._idef=0;p.mode='attack';}
  const t=G.time||0;if(!p.obj||p.obj[0]!==I.r||p.obj[1]!==I.c||!p.pt||p.pt[0]!==I.x||p.pt[1]!==I.z){p.obj=[I.r,I.c];p.pt=[I.x,I.z];p.objT=t;}};}
// 새 판: 설정 화면의 '지휘 방식'을 읽는다(자유 전투만). cfg.auto로 직접 줄 수도 있다
{const _n=newGame;newGame=function(cfg){const r=_n(cfg);let on=cfg&&cfg.auto;
  if(on==null&&cfg&&cfg.slots&&!cfg.force&&typeof document!=='undefined'){const el=document.getElementById('opt-cmd');on=el?el.value==='auto':false;}
  for(const n of G.order){const N2=G.nats[n];N2.autoBuy=true;N2.intent=null;N2.auto=false;if(on&&N2.ctrl==='human')autoSet(n,true);}
  return r;};}
/* ---------- 직접 지휘 세력의 지원 부대: AI 두뇌를 지원 부대에만 돌린다 ----------
   G._supOnly=n 인 동안: 전투 부대·직접 명령 받은 부대는 숨기고, 증원 구매·화력 지원·진지 공사(지휘점수가 드는 일)는 하지 않는다. */
{const _ai=aiThink;aiThink=function(n){if(G._supOnly!==n)return _ai(n);const hid=[];
  for(const u of G.units)if(u.nat===n&&!u.job&&(!selfRun(u)||u.msn||u.pl)){u.job=AUTO_HIDE;hid.push(u);}
  try{return _ai(n);}finally{for(const u of hid)if(u.job===AUTO_HIDE)u.job=null;}};}
{const _s=support;support=function(n){if(G._supOnly===n)return false;return _s.apply(this,arguments);};}
{const _b=buy;buy=function(n){if(G._supOnly===n)return null;return _b.apply(this,arguments);};}
if(typeof aiFort==='function'){const _f=aiFort;aiFort=function(n){if(G._supOnly===n)return;return _f.apply(this,arguments);};}
if(typeof polMortar==='function'){const _pm=polMortar;polMortar=function(u){if(u.man!=null&&autoManual(u))return;return _pm.apply(this,arguments);};}
{const _t=rtTick;rtTick=function(dt){_t(dt);if(!G||G.over)return;
  for(const n of G.order){const N2=G.nats[n];if(aiRun(n)||!N2.alive)continue;N2.sT=(N2.sT??1)-dt;if(N2.sT>0)continue;N2.sT=2+Math.random()*.8;
    if(!G.units.some(u=>u.nat===n&&SELF_RUN[u.type]))continue;const p=G._supOnly;G._supOnly=n;
    try{aiThink(n);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}finally{G._supOnly=p;}}};}
