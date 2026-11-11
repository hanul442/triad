/* ===================== EASY: 증원만 하다 끝나지 않게 =====================
   "조작법이 너무 어려움, 증원만 하다가 끝남" (2026-11-11).
   증원 메뉴에 부대가 서른 가지 넘게 있고, 하나 사려면 카드 → 초록 칸까지 눌러야 해서 판 내내 메뉴만 보다 끝났다.
   - 빠른 증원: 증원 메뉴 맨 위 묶음 카드(부관 추천·보병 소대·대전차조·기계화·전차). 한 번 탭하면 사서 목표 가까운 집결지에 바로 내린다.
     지휘점수가 모자라면 '예약'이 되어 모이는 대로 들어온다(그동안 부관 자동 증원은 기다린다). 다시 탭하면 예약 취소.
   - 낱개 카드도 탭 한 번에 목표 가까운 곳으로 내린다. 초록 칸을 직접 고르고 싶으면 메뉴의 [배치: 직접]으로 바꾼다(localStorage triad-buyhand).
   - 증원 메뉴를 보는 동안 전투가 멈춘다(사람 하나 대 AI일 때, 휴대폰 기본 켬·PC 기본 끔). 메뉴의 [메뉴 볼 때 멈춤]으로 바꾼다(localStorage triad-menuhold).
   - 부관 지휘일 때 하단 바에 [목표] 버튼: 누르고 지도를 탭하면 전 부대의 공격 목표. 휴대폰에서는 이 버튼이 가장 눈에 띈다.
   - 첫 판 안내 3단계(목표 → 증원은 자동 → 보고). 안내가 떠 있는 동안 전투가 멈춘다. 한 번 보면 다시 안 뜬다(localStorage triad-coach).
   CSS는 여기서 넣는다. */
const QB=[
  {k:'adj',n:'부관 추천',d:'지금 전황에 맞게 부관이 고릅니다'},
  {k:'inf',n:'보병 소대',ts:['rifle','rifle','mg'],d:'소총분대 2 · 기관총팀'},
  {k:'at',n:'대전차조',ts:['at','rifle'],d:'적 전차·장갑차 잡기'},
  {k:'mech',n:'기계화 분대',ts:['ifv'],d:'장갑차가 소총분대를 태워 옴'},
  {k:'tank',n:'전차',ts:['tank'],d:'화력과 장갑'}];
const qbStore=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v);}catch(e){}return null;};
const qbHuman=n=>G&&G.nats[n]&&!isAI(n)&&!G.over&&!G.boot&&!(typeof specOn==='function'&&specOn());
const qbRoom=n=>unitCap()-G.units.filter(u=>u.nat===n).length;
/* 부관 추천: 06b의 병종 비율(aiArmsW)로 지금 가장 모자란 병종부터, 가진 지휘점수로 살 수 있는 만큼(셋까지) */
function qbAdjPick(n,cp){const N2=G.nats[n],sv=N2._sv;N2._sv=null;try{return qbAdjPick0(n,cp);}finally{N2._sv=sv;}}   // 부관이 비싼 차량을 사려고 모으는 중(_sv)이어도 추천은 지금 살 수 있는 것으로
function qbAdjPick0(n,cp){const mine=G.units.filter(u=>u.nat===n);const E=G.units.filter(e=>e.nat!==n&&seen(e,n));
  const add={};const cnt=t=>mine.filter(u=>u.type===t).length+(add[t]||0);const out=[];let left=cp,tot=mine.length;
  for(let i=0;i<3&&out.length<qbRoom(n);i++){
    let w=typeof aiArmsW==='function'?aiArmsW(n,E,cnt,tot):{rifle:5,mg:2,at:1.5,ifv:1,tank:1};
    let best=null,bw=0;for(const t in w){const u=UT[t];if(!u||u.noBuy||u.fly||!TYPES.includes(t)||u.cost>left||!(w[t]>0))continue;if(w[t]>bw){bw=w[t];best=t;}}
    if(!best)break;out.push(best);left-=UT[best].cost;add[best]=(add[best]||0)+1;tot++;}
  return out;}
function qbTypes(n,b,cp){if(b.k==='adj')return qbAdjPick(n,cp);return b.ts.filter(t=>UT[t]&&TYPES.includes(t)&&!UT[t].noBuy);}
function qbCost(n,b){if(b.k==='adj'){const m=Math.min(...TYPES.filter(t=>UT[t]&&!UT[t].noBuy&&!UT[t].fly).map(t=>UT[t].cost));return Number.isFinite(m)?m:3;}return qbTypes(n,b).reduce((a,t)=>a+UT[t].cost,0);}
/* 내릴 곳: 주공 목표(없으면 아군 무리에서 가장 가까운 남의 거점)에 가장 가까운 배치 칸 */
function qbGoal(n){const I=G.nats[n].intent;if(I)return [I.z,I.x];const mine=G.units.filter(u=>u.nat===n);
  const m=(N-1)/2;const c={r:mine.length?mine.reduce((a,u)=>a+u.r,0)/mine.length:m,c:mine.length?mine.reduce((a,u)=>a+u.c,0)/mine.length:m};
  return typeof aiGoal==='function'?aiGoal(n,c,[]):[m,m];}
function qbPlace(n,t){if(qbRoom(n)<=0)return null;if(typeof airGrounded==='function'&&airGrounded(t))return null;const sp=deploySpots(n,t);if(!sp.length)return null;const g=qbGoal(n);
  sp.sort((a,b)=>dist(kr(a),kc(a),g[0],g[1])-dist(kr(b),kc(b),g[0],g[1]));
  const r=kr(sp[0]),c=kc(sp[0]);const u=buy(n,t,r,c);if(u)u.face=Math.atan2(g[0]-r,g[1]-c)*180/Math.PI;return u;}
/* 묶음 사기: 다 살 수 있을 때만 산다(부관 추천은 살 수 있는 만큼). 산 부대 수를 돌려준다 */
function qbBuy(n,b){const N2=G.nats[n];const ts=qbTypes(n,b,N2.cp);if(!ts.length)return 0;
  if(b.k!=='adj'&&(ts.reduce((a,t)=>a+UT[t].cost,0)>N2.cp||ts.length>qbRoom(n)))return 0;
  let k=0;for(const t of ts){if(qbPlace(n,t))k++;else break;}
  if(k&&n===G.viewer){if(typeof sndRadio==='function')sndRadio('ack');toast(`증원: ${ts.slice(0,k).map(t=>UT[t].n).join(' · ')} → 목표 쪽 집결지`);}
  return k;}
/* 예약: 지휘점수가 모이면 들어온다 */
function qbTick(){if(!G||G.over)return;for(const n of G.order){const N2=G.nats[n];if(!N2||!N2.qb)continue;
  if(isAI(n)){N2.qb=null;continue;}const b=QB.find(x=>x.k===N2.qb);if(!b){N2.qb=null;continue;}
  if(N2.cp>=qbCost(n,b)&&qbRoom(n)>0&&qbBuy(n,b))N2.qb=null;}}
{const _rt=rtTick;rtTick=function(dt){const r=_rt.apply(this,arguments);if(G&&!G.over){G._qbT=(G._qbT||0)-dt;if(G._qbT<=0){G._qbT=1;qbTick();}}return r;};}
// 예약이 있으면 부관 자동 증원은 기다린다(예약이 먼저)
{const _b=buy;buy=function(n){if(G&&G._adj===n&&G.nats[n]&&G.nats[n].qb)return null;return _b.apply(this,arguments);};}
function qbTap(n,k){const N2=G.nats[n];const b=QB.find(x=>x.k===k);if(!b)return;
  if(N2.qb===k){N2.qb=null;toast('예약 취소');render();return;}
  if(qbRoom(n)<=0){toast(`부대가 가득 찼습니다 (최대 ${unitCap()})`);return;}
  if(N2.cp>=qbCost(n,b)&&qbBuy(n,b)){UI.sheet=false;render();return;}
  N2.qb=k;toast(`${b.n} 예약: 지휘 ${qbCost(n,b)}이 모이면 목표 쪽으로 들어옵니다`);UI.sheet=false;render();}
const qbHand=()=>UI.buyHand==null?(UI.buyHand=qbStore('triad-buyhand')==='1'):UI.buyHand;
// 기본: 휴대폰은 켬(메뉴가 전장을 덮음), PC는 끔(옆 패널이라 전장이 보임)
const qbHoldOn=()=>{if(UI.menuHold==null){const v=qbStore('triad-menuhold');UI.menuHold=v==null?(typeof phOn==='function'&&phOn()):v==='1';}return UI.menuHold;};
function qbHtml(n){const N2=G.nats[n];const inc=typeof income==='function'?income(n):3;
  const cards=QB.map(b=>{const ts=qbTypes(n,b,N2.cp);if(b.k!=='adj'&&!ts.length)return '';const c=qbCost(n,b);const res=N2.qb===b.k;const ok=N2.cp>=c;
    const what=b.k==='adj'?(ts.length?ts.map(t=>UT[t].n).join(' · '):b.d):b.d;
    const st=res?`예약됨 · ${N2.cp}/${c}`:ok?(b.k==='adj'?'지금':`지휘 ${c}`):`예약 · 약 ${Math.max(1,Math.ceil((c-N2.cp)/Math.max(1,inc)))*30}초`;
    return `<button class="qb${res?' res':''}${ok?' ok':''}" data-act="qb:${b.k}" id="qb-${b.k}" aria-pressed="${res}"><b>${b.n}</b><span>${what}</span><small>${st}</small></button>`;}).join('');
  const auto=N2.auto&&N2.autoBuy!==false;
  return `<div class="qbx"><h4>빠른 증원 <small>한 번 탭하면 목표 가까운 집결지로 바로 들어옵니다</small></h4><div class="qbl">${cards}</div>`+
    (auto?`<p class="qbn"><b>자동 증원 켬</b> · 아무것도 안 눌러도 부관이 지휘점수로 부대를 사서 보냅니다.</p>`:'')+`<div class="qbo">`+
    `<button class="qbt" data-act="qb:hand" id="qb-hand" aria-pressed="${qbHand()}">배치: ${qbHand()?'직접 (초록 칸 탭)':'자동 (목표 가까이)'}</button>`+
    (qbHoldNeed()?`<button class="qbt" data-act="qb:hold" id="qb-hold" aria-pressed="${qbHoldOn()}">메뉴 볼 때 멈춤: ${qbHoldOn()?'켬':'끔'}</button>`:'')+`</div></div>`;}
if(typeof buyMenu==='function'){const _bm=buyMenu;buyMenu=function(n){const h=_bm.apply(this,arguments);try{if(!qbHuman(n))return h;return qbHtml(n)+`<h4 class="qbh">하나씩 고르기</h4>`+h;}catch(e){return h;}};}
/* 낱개 카드: 자동 배치면 탭 한 번에 내린다(09-input의 초록 칸 단계를 건너뜀) */
if(typeof window!=='undefined')window.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-act^="buy:"],[data-act^="qb:"]');if(!b||b.disabled||!G)return;const n=G.viewer;if(!qbHuman(n))return;
  const a=b.dataset.act;
  if(a.startsWith('qb:')){e.stopImmediatePropagation();const k=a.slice(3);
    if(k==='hand'){UI.buyHand=!qbHand();qbStore('triad-buyhand',UI.buyHand?'1':'0');render();return;}
    if(k==='hold'){UI.menuHold=!qbHoldOn();qbStore('triad-menuhold',UI.menuHold?'1':'0');render();return;}
    qbTap(n,k);return;}
  if(qbHand())return;const t=a.slice(4);if(!UT[t]||G.nats[n].cp<UT[t].cost)return;e.stopImmediatePropagation();
  const u=qbPlace(n,t);if(u){if(typeof sndRadio==='function')sndRadio('ack');toast(`${UT[t].n} 증원 → 목표 쪽 집결지`);UI.sheet=false;clearSel();if(typeof scnAfterAct==='function')scnAfterAct();}
  else toast(qbRoom(n)<=0?`부대가 가득 찼습니다 (최대 ${unitCap()})`:'내릴 자리가 없습니다');render();},true);
/* 메뉴를 보는 동안 멈춤: 사람이 하나뿐인 판에서 증원 메뉴나 첫 판 안내가 떠 있을 때 */
function qbHoldNeed(){return !!G&&G.order.filter(n=>!isAI(n)).length===1&&!(typeof specOn==='function'&&specOn());}
function qbHolding(){if(!G||G.over||G.boot||!qbHoldNeed())return false;if(UI.coach!=null)return true;
  return qbHoldOn()&&!!UI.sheet&&UI.tab==='cmd'&&typeof document!=='undefined'&&!!$('#sheet')&&!$('#sheet').hidden;}
if(typeof rtLoop==='function'){const _rl=rtLoop;rtLoop=function(now){if(qbHolding()){RT.last=now;RT.acc=0;requestAnimationFrame(rtLoop);return;}return _rl.apply(this,arguments);};}
/* 하단 바: 부관 지휘면 [목표] */
{const _ra=renderActbar;renderActbar=function(){const r=_ra.apply(this,arguments);try{const el=$('#actbar');if(!el||!G||G.over)return r;const n=G.viewer;
  if(!qbHuman(n)||!G.nats[n].auto||UI.sel&&G.units.includes(UI.sel)||UI.phase||UI.pane)return r;
  const row=el.querySelector('.adj-row');if(!row||row.querySelector('#ab-goal'))return r;
  const I=G.nats[n].intent;const i=row.querySelector('.adj-i');if(i&&!I)i.textContent='[목표]를 누르고 지도를 탭하면 전 부대가 그곳을 칩니다';
  const g=document.createElement('button');g.className='btn sm goal';g.dataset.act='adj:atk';g.id='ab-goal';g.title='누르고 지도(또는 작은 지도)를 탭하면 모든 부대의 공격 목표가 됩니다';g.textContent='목표';
  const m=row.querySelector('#ab-adj-more');if(m)row.insertBefore(g,m);else row.append(g);
  const q=G.nats[n].qb&&QB.find(x=>x.k===G.nats[n].qb);const rf=el.querySelector('#ab-reinf');if(rf&&q)rf.textContent=`증원 (예약 ${q.n})`;
  el.classList.add('has-goal');}catch(e){}return r;};}
/* 첫 판 안내 */
const COACH=[
  {t:'1/3 목표만 정하세요',m:'아래 노란 [목표]를 누르고 지도나 작은 지도에서 거점을 탭하세요. 모든 부대가 그곳으로 가서 싸웁니다. 이동·엄폐·사격은 부관이 합니다.',el:'#ab-goal'},
  {t:'2/3 증원은 부관이 알아서',m:'지휘점수가 모이면 부관이 알맞은 부대를 사서 보냅니다. 직접 고르고 싶으면 [증원·지원]에서 묶음 하나만 탭하세요. 메뉴를 보는 동안은 전투가 멈춥니다.',el:'#ab-reinf'},
  {t:'3/3 보고만 보세요',m:'거점이 공격받거나 탄약·대전차가 모자라면 작은 지도 아래에 보고가 뜹니다. 누르면 그곳으로 가고 버튼 하나로 증원·포격을 부릅니다. 목표를 바꾸고 싶을 때만 다시 [목표]를 누르세요.',el:null}];
function coachCan(){return typeof document!=='undefined'&&G&&!G.scn&&!G.camp&&!G.over&&qbHuman(G.viewer)&&G.nats[G.viewer].auto&&$('#setup')&&$('#setup').hidden;}
function coachShow(){let el=$('#coach');if(UI.coach==null||!coachCan()){if(el)el.hidden=true;document.querySelectorAll('.coach-hl').forEach(x=>x.classList.remove('coach-hl'));return;}
  if(!el){el=document.createElement('div');el.id='coach';el.className='coach';el.setAttribute('role','dialog');el.setAttribute('aria-live','polite');document.getElementById('app').appendChild(el);}
  const s=COACH[UI.coach];el.hidden=false;
  const h=`<b>${s.t}</b><p>${s.m}</p><div><button class="btn sm" data-act="coach:skip" id="coach-skip">그만 보기</button><button class="btn sm primary" data-act="coach:next" id="coach-next">${UI.coach===0?'직접 해 볼게요':UI.coach<COACH.length-1?'다음':'시작'}</button></div>`;
  if(el._h!==h){el.innerHTML=h;el._h=h;}
  document.querySelectorAll('.coach-hl').forEach(x=>x.classList.remove('coach-hl'));if(s.el){const t=$(s.el);if(t)t.classList.add('coach-hl');}}
function coachEnd(){UI.coach=null;qbStore('triad-coach','1');coachShow();}
{const _r=render;render=function(){try{if(G&&!G._coach&&coachCan()&&(G.time||0)>=1.5){G._coach=1;if(qbStore('triad-coach')!=='1'){G._adjHint=1;UI.coach=0;}}
    // 1단계는 목표를 정하면 저절로 넘어간다. 1단계 '직접 해 볼게요'는 안내를 잠깐 숨기고 목표 고르기로
    if(UI.coach===0&&G&&G.nats[G.viewer]&&G.nats[G.viewer].intent)UI.coach=1;}catch(e){}
  const r=_r.apply(this,arguments);try{if(UI.coach!=null&&UI.phase&&UI.phase.startsWith('aim:')){const el=$('#coach');if(el)el.hidden=true;}else coachShow();}catch(e){}return r;};}
if(typeof document!=='undefined')document.addEventListener('click',e=>{const b=e.target.closest('[data-act^="coach:"]');if(!b||!G)return;const a=b.dataset.act.slice(6);
  if(a==='skip'){coachEnd();render();return;}
  if(a==='next'){if(UI.coach===0){clearSel();UI.pane=null;UI.phase='aim:atk';render();return;}if(UI.coach>=COACH.length-1){coachEnd();render();return;}UI.coach++;render();}});
if(typeof document!=='undefined'&&!document.getElementById('easy-css')){const st=document.createElement('style');st.id='easy-css';
  st.textContent=`.qbx{margin:0 0 12px;padding:10px;border:1px solid rgba(255,210,122,.45);border-radius:8px;background:rgba(255,210,122,.07)}
.qbx h4,.qbh{margin:0 0 8px;font-size:13px;font-weight:600;color:var(--ink)}
.qbx h4 small{font-weight:400;color:var(--muted);font-size:11px;margin-left:4px}
.qbl{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:6px}
.qb{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-height:64px;padding:7px 9px;text-align:left;border-radius:7px;border:1px solid var(--line);background:var(--raise);color:var(--ink);font:inherit;cursor:pointer}
.qb b{font-size:13px}.qb span{font-size:11px;color:var(--muted);line-height:1.3}.qb small{margin-top:auto;font-size:11px;color:var(--muted);font-family:var(--font-m)}
.qb.ok{border-color:rgba(255,210,122,.6)}.qb.ok small{color:#ffd27a}
.qb.res{background:#ffd27a;color:#1a1408;border-color:#ffd27a}.qb.res span,.qb.res small{color:#3a2e10}
.qb:focus-visible,.qbt:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.qbn{margin:8px 0 0;font-size:11.5px;line-height:1.45;color:var(--muted)}.qbn b{color:#ffd27a;font-weight:600}
.qbo{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.qbt{min-height:32px;padding:0 10px;border-radius:16px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;font-size:11.5px;cursor:pointer}
#actbar .btn.goal{background:#ffd27a;color:#1a1408;border-color:#ffd27a;font-weight:700}
@media (max-width:760px),(pointer:coarse){#actbar.ph-idle.has-goal #ab-reinf{background:var(--raise);color:var(--ink);border-color:var(--line);font-weight:500}.qbl{grid-template-columns:repeat(2,minmax(0,1fr))}}
.coach{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(var(--dock-h,120px) + 12px);z-index:25;width:min(420px,calc(100vw - 32px));padding:12px 14px;border-radius:10px;background:rgba(13,18,24,.95);border:1px solid #ffd27a;color:#e8ecef;box-shadow:0 6px 24px rgba(0,0,0,.45)}
.coach b{color:#ffd27a;font-size:14px}.coach p{margin:6px 0 10px;font-size:13px;line-height:1.5}.coach div{display:flex;gap:8px;justify-content:flex-end}
.coach-hl{outline:3px solid #ffd27a!important;outline-offset:2px;animation:coachP 1.2s ease-in-out infinite}
@keyframes coachP{50%{outline-color:rgba(255,210,122,.25)}}
@media (prefers-reduced-motion:reduce){.coach-hl{animation:none}}`;
  document.head.appendChild(st);}
