/* ===================== 무전 명령 =====================
   명령은 무전으로 내려가지만 늦지 않는다: 내리는 순간 부대가 받는다(한서 요청, 2026-11-09).
   재밍도 명령을 늦추지 않는다(재밍은 드론 조종 신호만 끊는다, 05f-air).
   무전 소리와 영어 교신(07z-vox)은 그대로 나고, 부대는 받자마자 "수신" 답을 한다.
   아래 교신 대기열(G.rq) 장치는 radioOn()이 늘 false라 쓰이지 않는다. 되살리려면 radioOn만 바꾸면 된다. */
const RADIO={base:.6,per:.035,max:1.4,talk:.35,fly:.25,jamOk:.35,retry:1.8,tries:3,runner:2.5};
const radioOn=()=>false;
/* 지휘소: 출발 지역 칸들의 가운데 */
function hqOf(n){G.hq=G.hq||{};if(G.hq[n])return G.hq[n];const sp=zoneSpots(n);let x=N/2,z=N/2;
  if(sp.length){x=sp.reduce((a,p)=>a+p[1]+.5,0)/sp.length;z=sp.reduce((a,p)=>a+p[0]+.5,0)/sp.length;}return G.hq[n]={x,z};}
/* 지상 부대가 적 재밍 반경 안에 있나 */
function radioCut(u){return !UT[u.type].fly&&typeof jammedBy==='function'&&!!jammedBy(u);}
function radioExec(k,a,us){us=us.filter(u=>G.units.includes(u));if(!us.length)return;
  if(k==='move')orderGroupMove(us,a[0],a[1]);
  else if(k==='atk'){const e=G.units.find(o=>o.id===a[0]);if(e)for(const g of us)if(UT[g.type].rng[1])orderAttack(g,e);}
  else if(k==='bldg'){if(G.map[a[0]][a[1]].t==='bldg')for(const g of us)orderBldg(g,a[0],a[1]);}
  else if(k==='stop')us.forEach(orderStop);
  else if(k==='floor')us.forEach(g=>orderFloor(g,a[0]));
  else if(k==='hold')us.forEach(g=>g.hold=a[0]);
  for(const g of us)g._ack=G.time||0;}
/* 명령 보내기: 바로 실행하지 않고 교신 대기열(G.rq)에 넣는다 */
function radioSend(n,us,k,a){us=us.filter(u=>u&&G.units.includes(u));if(!us.length)return null;
  if(!radioOn()){radioExec(k,a||[],us);return null;}
  const now=G.time||0;G.rq=G.rq||[];G.rnet=G.rnet||{};
  // 같은 부대에 아직 닿지 않은 명령은 새 명령으로 바뀐다
  const ids=new Set(us.map(u=>u.id));for(const e of G.rq)e.us=e.us.filter(id=>!ids.has(id));G.rq=G.rq.filter(e=>e.us.length);
  const fly=us.filter(u=>UT[u.type].fly),gnd=us.filter(u=>!UT[u.type].fly);let out=null;
  if(fly.length)G.rq.push(out={id:(G.rqI=(G.rqI||0)+1),nat:n,us:fly.map(u=>u.id),k,a:a||[],t0:now,at:now+RADIO.fly,n:0});
  if(gnd.length){const st=Math.max(now,G.rnet[n]||0);G.rnet[n]=st+RADIO.talk;const h=hqOf(n);
    const cx=gnd.reduce((s,u)=>s+u.x,0)/gnd.length,cz=gnd.reduce((s,u)=>s+u.z,0)/gnd.length;
    const at=st+RADIO.talk+RADIO.base+Math.min(RADIO.max,RADIO.per*Math.hypot(cx-h.x,cz-h.z));
    G.rq.push(out={id:(G.rqI=(G.rqI||0)+1),nat:n,us:gnd.map(u=>u.id),k,a:a||[],t0:now,at,n:0});}
  if(n===G.viewer&&typeof sfx==='function')sfx('radio',.5);bump();return out;}
/* 이 부대에 아직 닿지 않은 명령 */
function radioPend(u){if(!G.rq)return null;for(const e of G.rq)if(e.us.includes(u.id))return e;return null;}
/* 매 틱: 때가 된 교신을 전한다. 재밍 반경 안이면 대개 실패하고 다시 보낸다. */
function radioTick(){if(!G.rq||!G.rq.length)return;const now=G.time||0;const keep=[];
  for(const e of G.rq){if(e.at>now){keep.push(e);continue;}
    const us=e.us.map(id=>G.units.find(o=>o.id===id)).filter(Boolean);if(!us.length)continue;
    if(e.run){radioExec(e.k,e.a,us);if(e.nat===G.viewer)L(`${UT[us[0].type].n} 전령 도착, 명령 전달`);continue;}
    const ok=[],cut=[];for(const u of us){if(radioCut(u)&&Math.random()>RADIO.jamOk)cut.push(u);else ok.push(u);}
    if(ok.length){radioExec(e.k,e.a,ok);if(e.nat===G.viewer&&typeof sfx==='function')sfx('radio',.3);}
    if(cut.length){const r={...e,us:cut.map(u=>u.id),n:e.n+1,jam:1};
      if(r.n>=RADIO.tries){r.run=1;r.at=now+RADIO.runner;}else r.at=now+RADIO.retry*(.8+Math.random()*.4);
      if(e.nat===G.viewer&&!e.jam)L(`${UT[cut[0].type].n} 무전 두절 — 재송신 중`);keep.push(r);}
    bump();}
  G.rq=keep;}
/* 원래 함수 감싸기: 새 판 설정, 매 틱 교신 */
{const _n=newGame;newGame=function(cfg){const r=_n(cfg);G.radio=false;G.rq=[];G.rnet={};G.hq={};return r;};}
{const _t=rtTick;rtTick=function(dt){_t(dt);if(G&&!G.over)radioTick();};}
/* AI 명령의 무전(재밍 포함)은 06z-radio-ai가 같은 대기열로 다룬다. */
