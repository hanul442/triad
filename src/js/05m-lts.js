/* ===================== 최후 생존: 승점 대신 마지막까지 남은 세력이 이긴다 =====================
   - 새 게임·관전 설정의 '승리 방식'에서 고른다(G.win='lts'). 시나리오·캠페인은 원래 규칙 그대로.
   - 승점으로는 끝나지 않는다. 거점은 여전히 지휘점수(증원)를 준다.
   - 탈락: 싸울 수 있는 지상 부대가 하나도 없고, 그 부대를 다시 부를 지휘점수도 없으면(또는 증원이 끊긴 뒤면) 탈락.
   - 증원 중단(LTS.cut, 8분): 이때부터 아무도 증원·화력 지원을 못 부르고, 서로의 위치가 무전 감청으로 드러나
     AI가 남은 적을 찾아 나선다. 교착을 막는 장치다.
   - 항복(LTS.sur, LTS.surT): 증원이 끊긴 뒤 남은 전력이 가장 센 세력의 20% 밑으로 30초 동안 머물면 항복하고 탈락.
     남은 몇 부대가 구석에서 버티며 판을 끌지 않게 하는 서든데스다.
   - 제한 시간(LTS.max, 15분): 그래도 끝나지 않으면 남은 전력(부대 값×체력)이 큰 세력이 이긴다.
   - AI: 거점을 절반 넘게 쥐었거나 4분이 지나면 거점보다 적을 찾아 친다(웅크리지 않게). */
const LTS={cut:480,max:900,hunt:240,grace:4,sur:.2,surT:30};
const ltsOn=()=>!!(G&&G.win==='lts'&&!G.scn&&!G.camp);
/* 싸울 수 있는 지상 부대(보급·구난·구급차, 드론·자폭 차량은 빼고) */
const ltsFighter=u=>{const t=UT[u.type];return !t.fly&&!t.logi&&!t.kami&&(t.rng[1]||0)>0&&u.type!=='vbied'&&u.type!=='amb';};
function ltsCheapest(){let m=1e9;for(const k of Object.keys(UT)){const t=UT[k];if(t.noBuy||t.fly||t.logi||!(t.rng[1]>0))continue;if(t.cost<m)m=t.cost;}return m;}
const ltsCut=()=>ltsOn()&&(G.time||0)>=LTS.cut;
/* 세력의 남은 전력: 부대 값 × 남은 체력 비율 */
function ltsPower(n){let s=0;for(const u of G.units)if(u.nat===n&&ltsFighter(u))s+=UT[u.type].cost*Math.max(0,u.hp)/Math.max(1,hpMax(u));return s;}
function ltsCount(n){return G.units.filter(u=>u.nat===n&&ltsFighter(u)).length;}
function ltsOut(n,t,why){const N2=G.nats[n];N2.alive=false;N2.out=t;G.ltsOut=(G.ltsOut||[]).concat([{n,t,why}]);L(`${NATS[n].full} 탈락 — ${why}`);
  if(typeof ltsOutFx==='function')ltsOutFx(n);}
/* 항복: 남은 부대를 전장에서 거둔다(격파로 치지 않음). 마지막 자리는 남은 부대의 가운데 */
function ltsSurrender(n){const mine=G.units.filter(u=>u.nat===n);if(!mine.length)return;
  const f=mine.filter(ltsFighter),m=f.length?f:mine;let x=0,z=0;for(const u of m){x+=u.x??u.c+.5;z+=u.z??u.r+.5;}
  (G.ltsLast=G.ltsLast||{})[n]={x:x/m.length,z:z/m.length};
  G.units=G.units.filter(u=>u.nat!==n);if(typeof bump==='function')bump();
  if(typeof UI!=='undefined'&&UI){if(UI.sel&&UI.sel.nat===n)UI.sel=null;if(UI.follow&&UI.follow.nat===n)UI.follow=null;}}
/* 탈락 판정과 끝 */
function ltsCheck(){const t=G.time||0;const cheap=ltsCheapest();
  for(const n of G.order){const N2=G.nats[n];if(!N2.alive)continue;
    if(ltsCount(n)>0){N2.ltsT=null;continue;}
    if(!ltsCut()&&N2.cp>=cheap){N2.ltsT=null;continue;}   // 아직 다시 부를 수 있다
    N2.ltsT=N2.ltsT??t;if(t-N2.ltsT<LTS.grace)continue;
    ltsOut(n,t,'싸울 부대가 남지 않음');}
  if(ltsCut()){const al=G.order.filter(i=>G.nats[i].alive);
    if(al.length>1){const P={};for(const i of al)P[i]=ltsPower(i);
      for(const i of al){const N2=G.nats[i];if(!N2.alive)continue;const top=Math.max(...al.filter(j=>j!==i&&G.nats[j].alive).map(j=>P[j]));
        if(!(P[i]<top*LTS.sur)){N2.ltsS=null;continue;}
        N2.ltsS=N2.ltsS??t;if(t-N2.ltsS<LTS.surT)continue;
        ltsSurrender(i);ltsOut(i,t,'남은 병력이 항복');}}}
  const alive=G.order.filter(i=>G.nats[i].alive);
  if(alive.length<=1){G.over={win:alive[0]??null,why:alive.length?'최후 생존':'전멸'};return G.over;}
  if(t>=LTS.max){const top=alive.slice().sort((a,b)=>ltsPower(b)-ltsPower(a));G.over={win:top[0],why:`${fmtT(LTS.max)} 종료, 남은 전력 우세`};return G.over;}
  return null;}
{const _co=checkOver;checkOver=function(){if(!G||G.over||!ltsOn())return _co.apply(this,arguments);return ltsCheck();};}
/* 세력마다 마지막으로 쓰러진 부대 자리(관전 연출용) */
{const _k=kill;kill=function(u){if(G&&ltsOn()&&u&&ltsFighter(u))(G.ltsLast=G.ltsLast||{})[u.nat]={x:u.x,z:u.z};return _k.apply(this,arguments);};}
/* 증원 중단 뒤에는 증원·화력 지원을 못 부른다 */
{const _b=buy;buy=function(n){if(ltsCut())return null;return _b.apply(this,arguments);};}
{const _cs=canSupport;canSupport=function(){if(ltsCut())return false;return _cs.apply(this,arguments);};}
/* 새 판: 승리 방식 */
{const _n=newGame;newGame=function(cfg){let w=cfg&&cfg.win;
   if(w==null&&cfg&&!cfg.scn){try{const el=typeof document!=='undefined'&&document.getElementById('opt-win');if(el&&cfg.slots&&cfg.slots.includes('human'))w=el.value;}catch(e){}}
   const g=_n(cfg);g.win=w==='lts'&&!g.scn?'lts':'vp';if(g.win==='lts'){g.vpWin=1e9;g.maxR=Math.ceil(LTS.max/ROUND_S);}return g;};}
/* AI: 거점보다 적을 찾는다. 증원이 끊긴 뒤엔 보이지 않는 적의 자리도 안다(감청) */
{const _g=aiGoal;aiGoal=function(n,u,vis){if(!ltsOn())return _g.apply(this,arguments);const t=G.time||0;
   const own=G.objs.filter(o=>G.map[o.r][o.c].owner===n).length;const hunt=t>=LTS.hunt||own*2>G.objs.length||ltsCut();
   if(!hunt)return _g.apply(this,arguments);
   const pool=vis&&vis.length?vis:ltsCut()?G.units.filter(e=>e.nat!==n&&!UT[e.type].fly):[];
   let best=null,bd=1e9;for(const e of pool){const d=dist(u.r,u.c,e.r,e.c);if(d<bd){bd=d;best=[e.r,e.c];}}
   if(best)return best;
   // 보이는 적이 없으면 가장 가까운 살아 있는 적의 지휘소 쪽으로
   for(const m of G.order){if(m===n||!G.nats[m].alive||typeof hqOf!=='function')continue;const h=hqOf(m);const d=dist(u.r,u.c,Math.floor(h.z),Math.floor(h.x));if(d<bd){bd=d;best=[Math.floor(h.z),Math.floor(h.x)];}}
   return best||_g.apply(this,arguments);};}
/* 화면 위 목표 줄 */
{const _o=typeof scnObjective==='function'?scnObjective:null;if(_o){scnObjective=function(){if(!ltsOn())return _o.apply(this,arguments);const t=G.time||0;
   const left=G.order.filter(i=>G.nats[i].alive).map(i=>`<span style="color:${mapCol(i)}">${NATS[i].name} ${ltsCount(i)}</span>`).join(' · ');
   return {t:'최후 생존',m:'',html:`<span>남은 부대 ${left} · ${t<LTS.cut?`증원 중단까지 ${fmtT(LTS.cut-t)}`:`증원 끊김 · 제한 ${fmtT(LTS.max-t)}`}</span>`};};}}
/* 증원 중단 알림(한 번) */
{const _t=rtTick;rtTick=function(dt){_t(dt);if(G&&!G.over&&ltsOn()&&!G.ltsCutSaid&&(G.time||0)>=LTS.cut){G.ltsCutSaid=1;L('증원 중단 — 이제부터 남은 병력만으로 싸운다. 서로의 위치가 감청으로 드러남');
   if(typeof toast==='function'&&typeof document!=='undefined')toast('증원 중단: 남은 병력으로 끝까지');}};}
