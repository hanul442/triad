/* ===================== SCENARIOS ===================== */
const SCN={
  tut:{n:'기초 훈련',d:'이동·건물 엄폐·사격·점령·증원, 부관에게 맡기기와 중대 목표를 차례로 익힙니다.'},
  assault:{n:'도심 돌파',d:'적이 모든 거점을 쥐고 있습니다. 8분 안에 거점 5곳을 동시에 확보하세요.'},
  hold:{n:'최후 방어',d:'도심 거점을 지키며 7분을 버티세요. 끝날 때 거점 3곳 이상을 갖고 있어야 합니다.'},
};
const SCN_HOLD_ADD=['rifle','rifle','rifle','mg','at','eng','mortar','ifv','tank','rifle'];
const SCN_ASSAULT_ADD=['rifle','rifle','rifle','eng','eng','mg','at','mortar','ifv','tank'];   // 2026-11-10: 12→10(관전 블루 10/10 → 3/6). 수는 비슷해도 전차·장갑차·공병이 붙은 공격 측 화력이 훨씬 세다
/* 도심 돌파: 수비는 거점을 다 쥐고 있어도 증원을 사지 않는다(정해진 수비대만) */
{const _in=income;income=function(n){if(G&&G.scn==='assault'&&n!==0)return 0;return _in(n);};}
/* 최후 방어: 지키는 블루는 거점 넷에서 수입이 많아 증원을 쏟아부었다. 수비 수입은 절반, 공격 측은 +4 (2026-11-10 관전 블루 6/6 → 3/4) */
{const _in=income;income=function(n){const v=_in(n);if(G&&G.scn==='hold')return n===0?Math.round(v*.5):v+4;return v;};}
function scnButtons(){return Object.keys(SCN).map(k=>`<button class="btn" data-act="scn:${k}" id="scn-${k}">${SCN[k].n}<small>${SCN[k].d}</small></button>`).join('');}
function startScn(k){const sp=+($('#opt-speed')?.value??260);scnSetup(k,sp);
  bump();G.boot=false;$('#setup').hidden=true;clearSel();rtStart();UI.sheet=false;render();if(typeof v3HomeCam==='function')v3HomeCam(false);}
/* 시나리오 판 차리기(화면 없이도 돈다: 관전·테스트용) */
function scnSetup(k,sp){sp=sp??260;
  if(k==='tut'){newGame({slots:['human','ai','none','none'],size:'s',fog:true,speed:sp,scn:'tut',seed:20261106,force:['rifle','rifle','mg','at'],maxR:30,vpWin:99});
    G.units=G.units.filter(u=>u.nat===0||u.type==='rifle');G.nats[1].cp=0;G.nats[0].cp=8;G.tut=0;G.diff='easy';}
  else if(k==='assault'){newGame({slots:['human','ai','none','none'],size:'m',fog:true,speed:sp,scn:'assault',maxR:16,vpWin:999});
    for(const o of G.objs){G.map[o.r][o.c].owner=1;if(o.c>=N/2-2||Math.random()<.5){const sp2=[[o.r,o.c],...nbrs(o.r,o.c)].find(([a,b])=>!unitAt(a,b)&&mcost('rifle',G.map[a][b])<Infinity);if(sp2)mkUnit(1,['rifle','mg','at','sniper'][Math.floor(Math.random()*4)],sp2[0],sp2[1]);}}
    // 시가전 공격은 공격 측이 3배 넘게 앞서야 한다(교범 3:1, 시가지는 그 이상). 기본 편성에 돌격 중대 하나를 더 붙이고, 수비는 지휘점수로 부대를 더 사지 못한다
    const B=G.units.filter(u=>u.nat===0);const br=Math.round(B.reduce((a,u)=>a+u.r,0)/(B.length||1)),bc=Math.round(B.reduce((a,u)=>a+u.c,0)/(B.length||1));
    if(typeof campPut==='function')for(const t of SCN_ASSAULT_ADD)campPut(0,t,br,bc,{bldg:false});
    G.nats[0].cp=20;G.nats[1].cp=0;}
  else if(k==='hold'){newGame({slots:['human','ai','none','none'],size:'m',fog:true,speed:sp,scn:'hold',maxR:14,vpWin:999});
    const m=(N-1)/2;const near=G.objs.slice().sort((a,b)=>dist(a.r,a.c,m,m)-dist(b.r,b.c,m,m)).slice(0,4);
    for(const o of near){G.map[o.r][o.c].owner=0;}
    for(const u of G.units.filter(u=>u.nat===0)){const o=near[u.id%4];const sp2=[[o.r,o.c],...nbrs(o.r,o.c),...nbrs(o.r,o.c).flatMap(([a,b])=>nbrs(a,b))].find(([a,b])=>!unitAt(a,b)&&mcost(u.type,G.map[a][b])<Infinity);if(sp2){u.r=sp2[0];u.c=sp2[1];}}
    // 공격 측은 3:1을 넘게 모아야 시가지 거점을 뺏는다: 레드에 돌격 중대 하나를 더 붙이고 지휘점수를 넉넉히 준다
    const R=G.units.filter(u=>u.nat===1);const rr=Math.round(R.reduce((a,u)=>a+u.r,0)/(R.length||1)),rc=Math.round(R.reduce((a,u)=>a+u.c,0)/(R.length||1));
    if(typeof campPut==='function')for(const t of SCN_HOLD_ADD)campPut(1,t,rr,rc,{bldg:false});
    G.nats[1].cp=40;G.diff='hard';}
  bump();return G;}
function scnObjective(){if(!G||!G.scn)return null;const n=0;if(G.camp&&typeof campObjective==='function')return campObjective();
  if(G.scn==='tut'){const S=[
      ['1/8 이동','소총분대를 탭해 고르고 땅을 탭하면 그리로 움직입니다. 건물에 들어가면 엄폐 40%를 받습니다. 맨땅에 멈춘 보병은 몇 초 뒤 스스로 개인호를 파고 들어갑니다.'],
      ['2/8 시야','건물은 시야를 가립니다. 높은 건물에 들어가면 더 멀리 봅니다. 화면을 드래그하거나 왼쪽 위 작은 지도를 눌러 둘러보세요. Space(휴대폰은 아래 ⏸)로 언제든 멈출 수 있습니다.'],
      ['3/8 사격','부대는 사거리 안의 적을 알아서 쏩니다. 부대를 고른 뒤 적을 탭하면 그 적을 쫓아가 공격합니다.'],
      ['4/8 점령','깃발과 빛기둥이 있는 거점에 부대를 들여보내 점령하세요. 땅을 딛는 전투 부대는 모두 점령할 수 있지만 보병 분대가 가장 빠르고(소총분대·공병 12초), 차량은 느리며 건물 거점엔 못 들어갑니다. 드론·항공기·보급차는 점령하지 못합니다. 거점마다 30초마다 승점과 지휘점수가 들어옵니다.'],
      ['5/8 증원','하단 바의 "증원·지원"을 열고 맨 위 빠른 증원 묶음(예: 보병 소대)이나 아래 낱개 카드를 한 번 탭해 보세요. 목표 가까운 집결지로 바로 들어오고, 지휘점수가 모자라면 예약됩니다. 메뉴를 보는 동안은 전투가 멈춥니다. 장갑차·보병전투차는 소총분대를 태우고 와서 적이나 거점 가까이에서 알아서 내려 주고, 분대가 멀리 갈 때는 근처 빈 장갑차를 타고 갑니다. 보급 트럭·구급차·구난차·공병전차는 배치만 하면 보급·후송·견인·장애물 치우기를 알아서 합니다.'],
      ['6/8 부관','부대마다 명령하기 번거로우면 부관(AI)에게 맡기세요. 아무 부대도 고르지 않은 상태에서 하단의 [부관에게 맡기기]를 누르세요.'],
      ['7/8 목표','부대는 저절로 소대·중대로 묶입니다. 아래 부대 목록 맨 앞의 [1중대](또는 [전체])를 누르고 3D 지도나 왼쪽 위 작은 지도에서 남은 거점을 탭하세요. 그곳이 중대의 공격 목표가 되고, 이동·엄폐·화력 지원은 부관이 합니다. [공격 → 방어로]를 누른 뒤 탭하면 지킬 곳이 됩니다.'],
      ['8/8 직접 명령','부대 하나를 골라 땅을 탭하면 그 부대만 직접 움직입니다(\'직접\' 표시, 45초 뒤나 [부관에게 돌려주기]로 다시 부관이 맡음). 고수·축성 같은 드문 명령은 [⋯]에 있습니다. 여러 부대는 지도 버튼의 [범위 선택]을 누르고 끌어서 한꺼번에 고릅니다. 중대를 골라 [증원 받기]를 누르면 새로 오는 부대가 그 중대로 갑니다. 남은 적을 몰아내고 거점을 모두 확보하세요.']];
    const i=Math.min(G.tut||0,7);return {t:S[i][0],m:S[i][1]};}
  if(G.scn==='assault')return {t:'도심 돌파',m:`거점 ${objCount(n)}/5 동시 확보 · 남은 시간 ${fmtT(16*ROUND_S-G.time)}`};
  if(G.scn==='hold')return {t:'최후 방어',m:`거점 ${objCount(n)}곳 유지 중 (3곳 이상) · 남은 시간 ${fmtT(14*ROUND_S-G.time)}`};
  return null;}
function scnAfterAct(){if(!G||G.scn!=='tut')return;const n=0;G.tut=G.tut||0;
  if(G.tut===0&&G.units.some(u=>u.nat===n&&u.moved))G.tut=1;
  else if(G.tut===1&&G.time>=12)G.tut=2;
  else if(G.tut===2&&G.nats[n].dmg>0)G.tut=3;
  else if(G.tut===3&&objCount(n)>0)G.tut=4;
  else if(G.tut===4&&G.nats[n].bought)G.tut=5;
  else if(G.tut===5&&G.nats[n].auto)G.tut=6;
  else if(G.tut===6&&G.nats[n].auto&&(G.nats[n].intent||G.org&&G.org[n]&&[...G.org[n].co,...G.org[n].pq].some(o=>o.intent)))G.tut=7;
  if(typeof document!=='undefined')renderObj();}
function scnCheck(){if(!G||!G.scn||G.over)return;const n=0;
  if(G.scn==='tut'){scnAfterAct();if(!G.units.some(u=>u.nat===1)&&objCount(n)===G.objs.length)G.over={win:0,why:'훈련 완료'};}
  if(G.scn==='assault'){if(objCount(n)>=5)G.over={win:0,why:'거점 5곳 확보'};else if(G.turn>16)G.over={win:1,why:'시간 초과'};}
  if(G.scn==='hold'){if(G.turn>14)G.over=objCount(n)>=3?{win:0,why:'방어 성공'}:{win:1,why:'거점 상실'};else if(objCount(n)===0&&!G.units.some(u=>u.nat===n))G.over={win:1,why:'방어선 붕괴'};}}
