/* ===================== CAMPAIGN: 난이도 =====================
   사람이 직접 하는 캠페인 임무(하령·상륙·역사 전투)에 난이도 셋을 둔다. 브리핑에서 고르고, 고른 값은 기억한다.
   - 쉬움: 예전 그대로(관전·테스트도 이 값). campStart(id)만 부르면 쉬움이다.
   - 보통·어려움: 조작이 귀찮아지는 게 아니라 적이 더 영리하고 끈질기다.
     1) 적 증원이 더 일찍, 더 크게 온다(그 증원 자신의 병종을 하나둘 더 붙인다: 시대에 맞는 부대만 나온다).
     2) 적 거점을 빼앗으면 잠시 뒤 적이 역습 부대를 보낸다(그 임무 증원 병종으로, 적 증원이 오던 가장자리에서).
     3) 적에게도 포병·연막이 생긴다(포병 전용 점수). 적이 보는 곳에 부대가 몰려 있으면 포탄이 떨어진다.
     4) 아군 지휘점수(시작·수입)가 줄고, 어려움에선 아군 증원이 늦고 한 부대가 빠진다.
     5) 적 사격이 조금 더 아프다(보통 +10%, 어려움 +20%).
   G.camp.diff = 'easy'|'normal'|'hard'. G.camp.dv = {rsp(적 포병 점수), cN(역습 횟수), cT(마지막 역습), own(거점 주인)}. */
const CDIFF_K='triad-camp-diff', CDIFF_WIN='triad-campaign-d';
const CDIFF={
  easy:{n:'쉬움',d:'예전 난이도. 적 증원이 정해진 만큼만 오고, 적은 포병을 쓰지 않습니다.'},
  normal:{n:'보통',d:'적 증원이 더 일찍·크게 오고, 거점을 빼앗으면 적이 역습합니다. 적 포병이 몰려 있는 부대를 노리고, 아군 지휘점수가 줄어듭니다.',
    wAdd:1,wT:.88,cK:3,cDelay:25,cCd:120,cMax:3,rsp0:4,rspInc:3,bCp:.7,bInc:.67,bwLate:0,bwDrop:0,dm:1.1},
  hard:{n:'어려움',d:'적 증원이 훨씬 크고 빠르며, 역습이 잦고 강합니다. 적 포병이 자주 떨어지고, 아군 지휘점수는 절반, 아군 증원은 늦고 작습니다.',
    wAdd:2,wT:.78,cK:5,cDelay:15,cCd:90,cMax:4,rsp0:8,rspInc:5,bCp:.5,bInc:.5,bwLate:45,bwDrop:1,dm:1.2},
};
const CDIFF_IDS=['easy','normal','hard'];
function campDef(id){return CAMP[id];}
/* 임무마다 적이 쓸 수 있는 화력 지원(시대·세력에 맞게). 없으면 포병·연막. 모가디슈 민병대는 없음 */
const CDIFF_SUP={mogadishu:[]};
function cdiffGet(){try{if(typeof localStorage==='undefined')return 'normal';const v=localStorage.getItem(CDIFF_K);return CDIFF[v]?v:'normal';}catch(e){return 'normal';}}
function cdiffSet(v){if(!CDIFF[v])return;try{localStorage.setItem(CDIFF_K,v);}catch(e){}}
/* 지금 판의 난이도 설정. 쉬움이거나 캠페인이 아니면 null */
function cdiffOf(){const C=G&&G.camp;if(!C||!C.diff||C.diff==='easy')return null;return CDIFF[C.diff]||null;}
/* 가장 어려운 난이도로 이긴 기록 */
function cdiffWins(){try{if(typeof localStorage==='undefined')return {};const o=JSON.parse(localStorage.getItem(CDIFF_WIN)||'{}');return o&&typeof o==='object'?o:{};}catch(e){return {};}}
function cdiffRecord(id,diff){const s=cdiffWins();if(CDIFF_IDS.indexOf(diff)>CDIFF_IDS.indexOf(s[id]||''))s[id]=diff;try{localStorage.setItem(CDIFF_WIN,JSON.stringify(s));}catch(e){}return s;}

/* 적 증원: 시각을 앞당기고, 그 증원의 병종을 돌려 가며 wAdd개 더 붙인다 */
function cdiffWaves(M,D){return (M.waves||[]).map(w=>{const u=w.u.slice();for(let i=0;i<D.wAdd;i++)u.push(w.u[i%w.u.length]);return {...w,t:Math.max(20,Math.round(w.t*D.wT)),u};});}
/* 아군 증원: 늦추고, 마지막 부대를 뺀다(하나만 남으면 그대로) */
function cdiffBw(M,D){return (M.bw||[]).map(w=>({...w,t:w.t+D.bwLate,u:w.u.length>2?w.u.slice(0,w.u.length-D.bwDrop):w.u.slice()}));}
/* 역습 부대: 그 임무 적 증원 병종(뒤 증원일수록 강하니 뒤에서부터)에서 k개 */
function cdiffCounterU(M,k){const pool=[];for(const w of (M.waves||[]).slice().reverse())for(const t of w.u)pool.push(t);
  if(!pool.length)pool.push('rifle','mg','at');const inf=pool.filter(t=>UT[t]&&UT[t].cls==='inf'),veh=pool.filter(t=>UT[t]&&UT[t].cls==='veh');
  const out=[];for(let i=0;out.length<k&&i<k*3;i++){const v=(i%3===2&&veh.length)?veh[(i/3|0)%veh.length]:inf.length?inf[i%inf.length]:pool[i%pool.length];if(UT[v])out.push(v);}return out;}

/* ---------- 시작: campStart(id, diff) ---------- */
{const _cs=campStart;campStart=function(id,diff){const g=_cs(id);if(!g||!G.camp)return g;const M=CAMP[id];
  G.camp.diff=CDIFF[diff]?diff:'easy';const D=cdiffOf();if(!D)return g;
  G.camp.waves=cdiffWaves(M,D);G.camp.bwv=cdiffBw(M,D);
  G.nats[0].cp=Math.max(2,Math.round((G.nats[0].cp||0)*D.bCp));
  const ws=(M.waves||[])[0];G.camp.dv={rsp:D.rsp0,cN:0,cT:-1e9,own:G.objs.map(o=>G.map[o.r][o.c].owner),side:(ws&&ws.side)||'e',span:ws&&ws.span,acc:0};
  return g;};}

/* ---------- 지휘점수: 아군 수입을 줄인다 ---------- */
{const _in=income;income=function(n){const v=_in(n);const D=cdiffOf();if(!D||n!==0)return v;return Math.max(1,Math.round(v*D.bInc));};}

/* ---------- 매 초: 적 포병 점수·역습 ---------- */
function cdiffTick(dt){const C=G.camp,D=cdiffOf();if(!C||!D||G.over||!C.dv)return;const V=C.dv;const t=G.time||0;
  V.acc+=dt;if(V.acc<1)return;V.acc=0;
  V.rspT=V.rspT||t;if(t-V.rspT>=30){V.rspT=t;V.rsp=Math.min(30,V.rsp+D.rspInc);}
  const M=CAMP[C.id];
  G.objs.forEach((o,i)=>{const cur=G.map[o.r][o.c].owner,was=V.own[i];V.own[i]=cur;
    // 적(1)이 쥐고 있던 거점을 아군이 빼앗았다 → 잠시 뒤 역습
    if(was===1&&cur===0&&V.cN<D.cMax&&t-V.cT>=D.cCd){V.cN++;V.cT=t;(V.q=V.q||[]).push({at:t+D.cDelay,i});
      campMsg(`${o.name} 점령. 적이 역습을 준비합니다. 진지를 다지세요`);}});
  for(const q of (V.q||[]).slice()){if(t<q.at)continue;V.q.splice(V.q.indexOf(q),1);const o=G.objs[q.i];
    const out=campWave({side:V.side,span:V.span,u:cdiffCounterU(M,D.cK),msg:`적 역습! ${o.name}을(를) 되찾으러 옵니다`});
    // 역습 부대는 곧장 그 거점으로 간다
    for(const u of out){u.post=0;if(typeof orderMove==='function')try{orderMove(u,o.r,o.c);}catch(e){}}}}
{const _ct=campTick;campTick=function(dt){try{cdiffTick(dt);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}return _ct(dt);};}

/* ---------- 적 포병: 따로 모은 점수로만 부르고(증원 구매에는 안 씀), 포병·연막만 ---------- */
function cdiffSupOk(kind){const C=G.camp;const al=CDIFF_SUP[C.id]||['arty','smoke'];return al.includes(kind);}
{const _cs=canSupport;canSupport=function(n,kind,r,c){if(n!==0&&G._cdSup&&!cdiffSupOk(kind))return false;return _cs(n,kind,r,c);};}
if(typeof aiSupport==='function'){const _as=aiSupport;aiSupport=function(n,E){const D=cdiffOf();if(!D||n===0||!G.camp.dv)return _as(n,E);
  const N2=G.nats[n],V=G.camp.dv,keep=N2.cp;N2.cp=V.rsp;G._cdSup=1;let r=false;
  try{r=_as(n,E);}finally{V.rsp=N2.cp;N2.cp=keep;G._cdSup=0;}return r;};}
/* 다른 지원(공격헬기·미사일 등)은 캠페인 적에게 주지 않는다 */
if(typeof aiAirSup==='function'){const _aa=aiAirSup;aiAirSup=function(n,E){if(cdiffOf()&&n!==0)return false;return _aa(n,E);};}

/* ---------- 적 사격 ---------- */
{const _rd=rawDmg;rawDmg=function(a,d,counter){const v=_rd(a,d,counter);const D=cdiffOf();return D&&a.nat!==0&&d.nat===0?v*D.dm:v;};}

/* ---------- 끝: 난이도별 승리 기록 ---------- */
{const _ce=campEnd;campEnd=function(){const had=G.camp&&G.camp.res;const R=_ce();if(!had&&R&&R.win&&G.camp.diff)cdiffRecord(G.camp.id,G.camp.diff);if(R)R.diff=G.camp.diff||'easy';return R;};}

/* ---------- 화면 ---------- */
function cdiffPicker(){const cur=cdiffGet();
  return `<h3 class="sec">난이도</h3><div class="cdiff" role="radiogroup" aria-label="난이도">${CDIFF_IDS.map(k=>`<button class="btn sm${k===cur?' primary':''}" role="radio" aria-checked="${k===cur}" data-act="cdiff:${k}" id="cdiff-${k}">${CDIFF[k].n}</button>`).join('')}</div><p class="cdiff-d" id="cdiff-d">${CDIFF[cur].d}</p>`;}
{const _cb=campBrief;campBrief=function(id){_cb(id);const el=typeof document!=='undefined'&&document.querySelector('#brief .card .crow');if(!el)return;el.insertAdjacentHTML('beforebegin',cdiffPicker());};}
function cdiffPick(k){cdiffSet(k);if(typeof document==='undefined')return;for(const b of document.querySelectorAll('.cdiff .btn')){const on=b.id==='cdiff-'+k;b.classList.toggle('primary',on);b.setAttribute('aria-checked',on);}
  const d=document.getElementById('cdiff-d');if(d)d.textContent=CDIFF[k].d;}
/* 작전 개시·다시 하기: 고른(기억한) 난이도로 */
{const _cg=campGo;campGo=function(id){const diff=cdiffGet();
  const _s=campStart;campStart=function(i){return _s(i,diff);};try{return _cg(id);}finally{campStart=_s;}};}
/* 임무 목록: 이긴 가장 높은 난이도를 별 옆에 */
{const _cl=campList;campList=function(opId){const W=cdiffWins();return _cl(opId).replace(/id="camp-(\w+)"([^]*?)<span class="cst"([^>]*)>/g,(m,id,mid,attr)=>{const d=W[id];
  return d&&d!=='easy'&&CDIFF[d]?`id="camp-${id}"${mid}<span class="cst"${attr}><em class="cdw" title="${CDIFF[d].n} 난이도로 이김">${CDIFF[d].n}</em>`:m;});};}
/* 결과 화면에 난이도 */
{const _cd=campDebrief;campDebrief=function(){_cd();const C=G&&G.camp;if(!C||typeof document==='undefined')return;const p=document.querySelector('#debrief .card h2+p');if(p&&!p.querySelector('.cdl'))p.insertAdjacentHTML('beforeend',` · <span class="cdl">난이도 ${CDIFF[C.diff||'easy'].n}</span>`);};}
/* 목표 패널 제목에 난이도 */
{const _co=campObjective;campObjective=function(){const o=_co();if(o&&G.camp&&G.camp.diff&&G.camp.diff!=='easy')o.t+=` · ${CDIFF[G.camp.diff].n}`;return o;};}
