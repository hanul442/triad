/* ===================== TUTORIAL & SCENARIOS ===================== */
// 튜토리얼과 시나리오. 각 항목은 고정 시드 맵 위에 부대·시설을 배치하고 목표를 검사한다.
const HUMAN=0,FOE=1;
function scnFree(near,lo,hi,ok){let best=null;for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const d=dist(r,c,near[0],near[1]);if(d<lo||d>hi||unitAt(r,c))continue;if(ok&&!ok(r,c))continue;if(!best||d<best[2])best=[r,c,d];}return best&&[best[0],best[1]];}
const landFree=(r,c)=>G.map[r][c].t!=='sea'&&mcost('tank',G.map[r][c].t)<Infinity&&!SITES.includes(G.map[r][c].t)&&!G.map[r][c].bld&&G.map[r][c].rwy==null;
const seaFree=(r,c)=>G.map[r][c].t==='sea'&&!G.map[r][c].rig;
function nearestCity(from,pred){let best=null;for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const x=G.map[r][c];if(x.t!=='city'||(pred&&!pred(x,r,c)))continue;const d=dist(r,c,...from);if(!best||d<best[2])best=[r,c,d];}return best&&[best[0],best[1]];}
function scnUnit(t,n,at,done){if(!at)return null;const u=mkUnit(t,n,at[0],at[1],!!done);return u;}
function scnCarrier(t,n,cargo,at){const l=scnUnit(t,n,at);if(!l)return null;const c={id:G.nid++,type:cargo,nat:n,r:l.r,c:l.c,hp:10,fuel:UT[cargo].fuel,ammo:UT[cargo].ammo,done:false,moved:false,cargo:null};l.cargo=c;return l;}
const cityCount=n=>{let k=0;for(const row of G.map)for(const x of row)if(x.owner===n&&(x.t==='city'||x.t==='hq'))k++;return k;};

const SCN={
  tut:{name:'기초 훈련',brief:'이동·점령·생산·공격·상륙·건설을 차례로 익힙니다.',
    cfg:{slots:['human','ai','none','none','none','none'],size:'m',mt:'cont',seed:20261104,fog:false,vic:0},passive:[FOE],
    setup(){const B=G.nats[HUMAN];B.f=40;B.s=30;B.o=20;const hq=B.hq;const S=G.scn;
      const city=nearestCity(hq,x=>x.owner==null);S.city=city;S.c0=cityCount(HUMAN);
      const iu=scnUnit('inf',HUMAN,scnFree(city,2,2,landFree));S.inf=iu&&iu.id;
      const tk=G.units.find(u=>u.nat===HUMAN&&u.type==='tank');const ep=tk&&scnFree([tk.r,tk.c],2,2,landFree);const en=scnUnit('inf',FOE,ep,true);S.enemy=en&&en.id;
      const sea=scnFree(hq,1,7,(r,c)=>seaFree(r,c)&&nbrs(r,c).some(([a,b])=>landFree(a,b)&&!unitAt(a,b)));const lst=sea&&scnCarrier('lst',HUMAN,'inf',sea);S.lst=lst?lst.id:null;
      S.u0=G.units.filter(u=>u.nat===HUMAN).length;},
    steps:[
      {t:'보병을 탭해 선택하세요. 파란 칸이 이동할 수 있는 곳입니다.',done:()=>UI.sel&&UI.sel.type==='inf'},
      {t:'근처 중립 도시(회색 이름표) 위로 보병을 옮기세요. 도시에 들어가면 자동으로 점령됩니다.',done:()=>cityCount(HUMAN)>G.scn.c0},
      {t:'별 모양 수도를 탭하고 하단 바의 생산·건설에서 보병을 하나 생산하세요.',done:()=>G.units.filter(u=>u.nat===HUMAN).length+(G.scn.landedN||0)>G.scn.u0||G.log.some(l=>l.includes('보병 생산'))},
      {t:'전차를 고르고 붉게 표시된 적 보병을 탭하세요. 첫 탭은 전투 예측, 두 번째 탭이 공격입니다.',done:()=>{const e=G.units.find(u=>u.id===G.scn.enemy);return !e||e.hp<10;}},
      {t:'보병을 태운 상륙함을 고르세요. 내릴 수 있는 해안이 초록으로 표시되면 탭해서 상륙시키세요.',done:()=>G.scn.lst==null||G.scn.landed},
      {t:'수도 근처 빈 땅을 탭하고 생산·건설에서 비행장을 지으세요. 활주로가 2칸으로 깔립니다.',done:()=>G.map.some(row=>row.some(x=>x.owner===HUMAN&&x.bld&&x.bld.type==='airfield'))},
      {t:'아무것도 선택하지 않은 상태에서 하단 바의 턴 종료를 누르세요.',done:()=>G.turn>=2},
      {t:'훈련 완료! 왼쪽 위 메뉴에서 참모부·연구·외교·교범도 둘러보세요. 준비되면 메뉴의 정세 탭에서 새 작전을 시작하세요.',done:()=>false}],
    obj:()=>SCN.tut.steps[G.scn.step].t},
  island:{name:'섬 탈환',brief:'적이 점령한 중앙 섬 도시를 16라운드 안에 되찾으세요.',
    cfg:{slots:['human','ai','none','none','none','none'],size:'m',mt:'arch',seed:777,fog:true,vic:0},limit:16,
    setup(){const B=G.nats[HUMAN];B.f=30;B.s=24;B.o=24;const S=G.scn;const mid=[Math.floor(ROWS/2),Math.floor(COLS/2)];
      const t=nearestCity(mid,x=>x.owner==null)||nearestCity(mid);S.target=t;const x=cell(...t);x.owner=FOE;
      if(!unitAt(...t))scnUnit('inf',FOE,t,true);scnUnit('aa',FOE,scnFree(t,1,1,landFree),true);scnUnit('at',FOE,scnFree(t,1,2,landFree),true);
      const hq=B.hq;for(const cg of ['tank','inf'])scnCarrier('lst',HUMAN,cg,scnFree(hq,2,8,seaFree));scnUnit('bb',HUMAN,scnFree(hq,2,8,seaFree));},
    win:()=>cell(...G.scn.target).owner===HUMAN,
    obj:()=>`목표: 중앙 섬 도시 ${names().city[key(...G.scn.target)]||''} 탈환 · ${G.turn}/${SCN.island.limit}라운드`},
  sead:{name:'방공망 돌파',brief:'적 수도를 지키는 방공 부대를 14라운드 안에 모두 제거하세요.',
    cfg:{slots:['human','ai','none','none','none','none'],size:'m',mt:'cont',seed:4242,fog:true,vic:0},limit:14,
    setup(){const B=G.nats[HUMAN],R=G.nats[FOE];B.f=40;B.s=30;B.o=40;B.tech=['rocketry'];const S=G.scn;const ids=[];
      for(const [t,lo,hi] of [['lrsam',1,2],['sam',2,3],['sam',2,3],['aa',1,2],['aa',2,3]]){const u=scnUnit(t,FOE,scnFree(R.hq,lo,hi,landFree),true);if(u)ids.push(u.id);}S.targets=ids;
      const af=scnFree(B.hq,2,4,(r,c)=>siteOk(HUMAN,'airfield',r,c));if(af){B.f+=40;B.s+=30;B.o+=10;construct(HUMAN,'airfield',...af);cell(...af).bld.left=0;cell(...af).used=false;
        const hg=scnFree(af,1,2,(r,c)=>siteOk(HUMAN,'hangar',r,c));if(hg){construct(HUMAN,'hangar',...hg);cell(...hg).bld.left=0;}
        const k=key(...af);for(const t of ['bmb','bmb','ftr','stealth']){const u=mkUnit(t,HUMAN,...af,false);removeUnit(u);hangar(k).push(u);}}
      scnUnit('tel',HUMAN,scnFree(B.hq,1,3,landFree));stock(HUMAN).c=3;stock(HUMAN).b=1;},
    win:()=>!G.units.some(u=>G.scn.targets.includes(u.id)),
    obj:()=>`목표: 적 방공 부대 제거 · 남은 ${G.units.filter(u=>G.scn.targets.includes(u.id)).length}/${G.scn.targets.length} · ${G.turn}/${SCN.sead.limit}라운드 · 비행장을 눌러 출격`},
  blockade:{name:'해상 봉쇄',brief:'적 항구 도시를 함대로 둘러싸 3라운드 동안 봉쇄하세요.',
    cfg:{slots:['human','ai','none','none','none','none'],size:'m',mt:'arch',seed:9090,fog:true,vic:0},limit:18,
    setup(){const B=G.nats[HUMAN],R=G.nats[FOE];B.f=30;B.s=24;B.o=30;const S=G.scn;S.cnt=0;
      const t=nearestCity(R.hq,(x,r,c)=>nbrs(r,c).some(([a,b])=>G.map[a][b].t==='sea'))||R.hq;S.target=t;cell(...t).owner=FOE;
      for(const ty of ['dd','dd','ff','sub','aor'])scnUnit(ty,HUMAN,scnFree(B.hq,1,9,seaFree));},
    onEnd(){if(blockaded(...G.scn.target))G.scn.cnt++;},
    win:()=>G.scn.cnt>=3,
    obj:()=>`목표: 적 항구 도시 ${names().city[key(...G.scn.target)]||''} 봉쇄 ${G.scn.cnt}/3라운드 · ${G.turn}/${SCN.blockade.limit}라운드${blockaded(...G.scn.target)?' · 지금 봉쇄 중':''}`},
};
function startScn(id){const S=SCN[id];if(!S)return;newGame({...S.cfg,speed:140});G.scn={id,step:0};S.setup();G.units.forEach(u=>{if(u.nat===G.cur&&!u.cargo)u.done=false;});
  L(`작전 개시: ${S.name}`);$('#setup').hidden=true;clearSel();UI.sheet=false;save();render();centerHQ();}
function scnCheck(){if(!G||!G.scn||G.over)return;const S=SCN[G.scn.id];if(!S)return;
  if(S.steps){while(G.scn.step<S.steps.length-1&&S.steps[G.scn.step].done()){G.scn.step++;toast('훈련 목표 달성');}}
  if(S.win&&S.win()){G.over={win:HUMAN,scn:'clear'};save();}}
function scnEndTurn(n){if(!G.scn||G.nats[n].ctrl!=='human')return;const S=SCN[G.scn.id];if(!S)return;if(S.onEnd)S.onEnd();
  if(S.win&&S.win()){G.over={win:HUMAN,scn:'clear'};return;}if(S.limit&&G.turn>=S.limit)G.over={win:FOE,scn:'fail'};}
function renderObj(){const el=$('#obj');if(!el)return;if(!G||!G.scn||G.over){el.hidden=true;return;}const S=SCN[G.scn.id];if(!S){el.hidden=true;return;}
  el.hidden=false;el.innerHTML=`<b>${S.name}${S.steps?` ${Math.min(G.scn.step+1,S.steps.length)}/${S.steps.length}`:''}</b><span>${S.obj()}</span>`;}
function scnButtons(){return Object.entries(SCN).map(([id,S])=>`<button class="btn" data-act="scn:${id}" id="scn-${id}"><span>${S.name}</span><small>${S.brief}</small></button>`).join('');}
