/* ===================== 승리 조건: 결정적 승리만 판을 끝낸다 =====================
   "승점을 더 빡빡하게" — 예전에는 거점을 쥐고 있던 시간만큼 쌓인 승점이 기준(거점×6+12)에 닿고 2위보다 앞서 있으면 끝났다.
   그래서 거점을 7:5로 나눠 쥔 채 싸움이 한창이어도 승점 계산으로 끝나고, 반대로 한쪽 병력이 다 녹아 내려도
   자기 집결지 곁 거점 두세 개를 쥐고 있으면 몇 분씩 판이 질질 끌렸다(AI 23판을 16분 끝까지 돌려 본 기록).
   실제 작전 목표처럼 바꾼다. 판을 끝내는 것은 둘뿐이다.
     1) 거점 장악: 전체 거점의 2/3 이상을 쥐고(다른 어느 세력보다 많이) 90초를 버티면 이긴다. 핵심 지형 확보.
        (중형 12개 중 8개, 대형 16개 중 11개, 소형 4개 중 3개) 거점을 하나라도 내주면 시계가 처음부터 다시 간다.
     2) 전선 붕괴(항복): 3분이 지난 뒤, 남은 전투력(부대 값×체력 + 지휘점수 절반)이 가장 센 적의 30% 밑이고
        거점을 1/3 이하로 쥔 세력이 그 상태로 60초를 넘기면 항복한다. 남은 부대는 전장에서 물러나고 거점은 빈다.
        싸울 힘이 없는 쪽이 구석 거점에 기대 버티며 판을 끌지 않게 한다(실제로도 전투력을 잃은 부대는 전투 불능 판정).
   승점은 그대로 쌓이지만(거점 하나당 30초마다 +1) 기준을 채워도 끝나지 않는다. 제한 시간(16분)이 끝나면 승점이 많은 쪽이 이긴다.
   적을 모두 없애도 이긴다. 시나리오·캠페인·최후 생존은 원래 규칙 그대로. */
const VICT={hold:{frac:2/3,t:90},col:{r:.3,t:60,k:.5,min:180,obj:1/3}};
const winOn=()=>!!(G&&!G.scn&&!G.camp&&G.win!=='lts');
const winNeed=()=>Math.max(1,Math.ceil((G.objs||[]).length*VICT.hold.frac));
/* 세력의 전투력: 싸우는 지상 부대 값×체력 + 다시 부를 지휘점수 절반 */
function winPow(n){return (typeof ltsPower==='function'?ltsPower(n):0)+VICT.col.k*Math.max(0,G.nats[n].cp||0);}
/* 1초마다: 장악 시계와 붕괴 시계를 잰다 */
function winTick(){if(!winOn()||G.over)return;const t=G.time||0;const W=G.winS||(G.winS={hold:{},col:{}});
  const al=G.order.filter(i=>G.nats[i].alive);if(al.length<2)return;
  const cnt={};for(const i of al)cnt[i]=objCount(i);const need=winNeed();
  for(const i of al){const more=al.every(j=>j===i||cnt[i]>cnt[j]);
    if(cnt[i]>=need&&more){if(W.hold[i]==null){W.hold[i]=t;L(`${NATS[i].full} 거점 ${cnt[i]}/${G.objs.length} 장악 — ${VICT.hold.t}초 지키면 승리`);}}
    else if(W.hold[i]!=null){delete W.hold[i];L(`${NATS[i].full} 거점 장악 풀림`);}
    if(W.hold[i]!=null&&t-W.hold[i]>=VICT.hold.t){G.over={win:i,why:`거점 ${cnt[i]}/${G.objs.length} 장악`};return;}}
  if(t<VICT.col.min){W.col={};return;}
  const P={};for(const i of al)P[i]=winPow(i);
  for(const i of al){const top=Math.max(...al.filter(j=>j!==i).map(j=>P[j]));
    if(P[i]<top*VICT.col.r&&cnt[i]<=Math.floor(G.objs.length*VICT.col.obj)){if(W.col[i]==null){W.col[i]=t;if(G.nats[i].ctrl==='human')L(`${NATS[i].full} 전선 붕괴 직전 — ${VICT.col.t}초 안에 전투력을 되찾거나 거점을 넓혀야 함`);}}
    else delete W.col[i];
    if(W.col[i]!=null&&t-W.col[i]>=VICT.col.t){winFold(i,t);
      const left=G.order.filter(j=>G.nats[j].alive);
      if(left.length<=1||G.nats[i].ctrl==='human'){const w=left.slice().sort((a,b)=>winPow(b)-winPow(a))[0];G.over={win:w??null,why:left.length<=1?'적 전선 붕괴(항복)':`${NATS[i].name} 전선 붕괴(항복)`};return;}}}}
/* 항복: 부대를 거두고 거점을 비운다 */
function winFold(n,t){if(typeof ltsSurrender==='function')ltsSurrender(n);else G.units=G.units.filter(u=>u.nat!==n);
  for(const o of G.objs){const x=G.map[o.r][o.c];if(x.owner===n)x.owner=null;}
  const N2=G.nats[n];N2.alive=false;N2.out=t;G.winOut=(G.winOut||[]).concat([{n,t}]);delete G.winS.col[n];delete G.winS.hold[n];
  L(`${NATS[n].full} 전선 붕괴 — 남은 병력이 항복`);if(typeof ltsOutFx==='function'){G.ltsOut=(G.ltsOut||[]).concat([{n,t,why:'전선 붕괴(항복)'}]);ltsOutFx(n);}
  if(typeof bump==='function')bump();}
{const _t=rtTick;rtTick=function(dt){_t(dt);if(!G||G.over||!winOn())return;const s=Math.floor(G.time||0);if(G._winT===s)return;G._winT=s;try{winTick();}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}};}
/* 승점 기준으로는 끝나지 않는다(06j 앞섬 규칙 대신). 시간이 다 되면 승점으로 */
{const _c=checkOver;checkOver=function(){const was=G&&G.over;const o=_c.apply(this,arguments);if(!o||was||!winOn())return o;
   if(o.why!==`승점 ${G.vpWin} 달성`)return o;
   G.over=null;
   if(G.turn>G.maxR){const al=G.order.filter(i=>G.nats[i].alive);const score=n=>G.nats[n].vp*1000+objCount(n)*100+G.units.filter(u=>u.nat===n).length;al.sort((a,b)=>score(b)-score(a));G.over={win:al[0],why:`${fmtT(G.maxR*ROUND_S)} 종료, 승점 우세`};return G.over;}
   return null;};}
/* 시간 끝 문구도 분으로 */
{const _c=checkOver;checkOver=function(){const was=G&&G.over;const o=_c.apply(this,arguments);if(o&&!was&&winOn()&&o.why===`${G.maxR}라운드 종료, 승점 우세`)o.why=`${fmtT(G.maxR*ROUND_S)} 종료, 승점 우세`;return o;};}
/* AI 작전 계획: 적이 장악 시계를 돌리면 그 적의 거점을 먼저 친다(장악 저지). 우리가 한두 개 모자라면 더 민다 */
{const _pt=planTasks;planTasks=function(n,K){const T=_pt.apply(this,arguments);if(!winOn()||!G.winS)return T;const need=winNeed();const mine=objCount(n);
   for(const x of T){if(x.k!=='atk'||x.obj==null)continue;const o=G.objs[x.obj];const own=G.map[o.r][o.c].owner;
     if(own!=null&&own!==n&&G.winS.hold[own]!=null){x.pri=(x.pri||0)+45;x.why='거점 장악 저지';}
     else if(mine<need&&need-mine<=2){x.pri=(x.pri||0)+12;}}
   return T;};}
/* 화면 위 목표 줄: 장악·붕괴 시계 */
function winLine(){const t=G.time||0;const W=G.winS||{hold:{},col:{}};const need=winNeed();const al=G.order.filter(i=>G.nats[i].alive);
  const own=al.map(i=>`<span style="color:${mapCol(i)}">${NATS[i].name} ${objCount(i)}</span>`).join(' · ');
  let s=`거점 ${own} (장악 ${need}/${G.objs.length})`;
  for(const i of al)if(W.hold[i]!=null)s+=` · <b style="color:${mapCol(i)}">${NATS[i].name} 장악 ${fmtT(VICT.hold.t-(t-W.hold[i]))}</b>`;
  for(const i of al)if(W.col[i]!=null)s+=` · <b style="color:${mapCol(i)}">${NATS[i].name} 붕괴 ${fmtT(VICT.col.t-(t-W.col[i]))}</b>`;
  s+=` · 남은 ${fmtT(G.maxR*ROUND_S-t)}`;return s;}
{const _o=typeof scnObjective==='function'?scnObjective:null;if(_o){scnObjective=function(){if(!winOn())return _o.apply(this,arguments);
   return {t:'작전 목표',m:'',html:`<span>${winLine()}</span>`};};}}
