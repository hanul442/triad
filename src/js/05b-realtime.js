/* ===================== REAL-TIME: 실시간 전투 =====================
   지도·시야·피해 계산은 그대로 쓰고, 시간이 흐르며 모든 부대가 동시에 움직이고 쏜다.
   부대는 칸 단위 경로를 따라 이동하고(prog: 다음 칸까지 진행도), 쿨다운마다 사거리 안의 적을 자동으로 쏜다.
   30초가 한 단계(라운드): 지휘점수·승점 지급, 날씨, 연막 소멸, 시간 흐름. */
const ROUND_S=30, TICK=.1;
const COOL={rifle:2.2,mg:1.1,at:3.2,sniper:3.6,eng:2.6,mortar:4.6,ifv:1.6,tank:3.6,drone:1};
const DPS_K=.16;           // 초당 피해 = 공격력 × DPS_K (엄폐·체력 보정 전)
const SUP_CD=20;           // 화력 지원 재사용 대기(초)
/* 한 칸 가는 데 걸리는 시간(초) */
function cellSec(u,x){const t=UT[u.type];return 1.25*4/t.mv*mcost(u.type,x)*(u.supp>0?1.5:1);}
/* 다른 부대가 있거나 들어오는 중인 칸인가 */
function rtBusy(k,u){for(const o of G.units){if(o===u)continue;if(key(o.r,o.c)===k)return o;if(o.path&&o.path.length&&o.path[0]===k&&o.prog>0)return o;}return null;}
/* 경로 찾기(다익스트라). 부대는 무시하고 지형만 본다. 목표에 못 가면 가장 가까운 곳까지. */
function pathTo(u,r2,c2,avoid){const t=UT[u.type];const st=key(u.r,u.c),goal=key(r2,c2);if(st===goal)return [];
  const D=new Map([[st,0]]),P=new Map();const q=[[0,u.r,u.c]];let best=st,bd=dist(u.r,u.c,r2,c2);
  while(q.length){let mi=0;for(let i=1;i<q.length;i++)if(q[i][0]<q[mi][0])mi=i;const [d,r,c]=q[mi];q[mi]=q[q.length-1];q.pop();
    const k=key(r,c);if(d>D.get(k))continue;if(k===goal){best=k;break;}const h=dist(r,c,r2,c2);if(h<bd){bd=h;best=k;}
    for(const [a,b] of nbrs(r,c)){const mc=mcost(u.type,G.map[a][b]);if(mc===Infinity)continue;
      if(a!==r&&b!==c&&!t.fly&&(G.map[a][c].t==='bldg'&&G.map[r][b].t==='bldg'||mcost(u.type,G.map[a][c])===Infinity||mcost(u.type,G.map[r][b])===Infinity))continue;
      const nd=d+mc*(a!==r&&b!==c?1.02:1);const nk=key(a,b);if(avoid&&avoid.has(nk))continue;if(!D.has(nk)||nd<D.get(nk)){D.set(nk,nd);P.set(nk,k);q.push([nd,a,b]);}}}
  const out=[];let k=best;while(k!==st&&k!=null){out.push(k);k=P.get(k);}return out.reverse();}
/* 명령 */
function orderMove(u,r,c){u.path=pathTo(u,r,c);u.prog=0;u.tgt=null;u.tgtTile=null;u.wait=0;u.dest=key(r,c);}
function orderAttack(u,e){u.tgt=e.id;u.tgtTile=null;u.dest=null;if(canHit(u,e)){u.path=[];u.prog=0;}else{u.path=pathTo(u,e.r,e.c);u.prog=0;}}
function orderBldg(u,r,c){u.tgtTile=key(r,c);u.tgt=null;if(canHitTile(u,r,c)){u.path=[];u.prog=0;}else{u.path=pathTo(u,r,c);u.prog=0;}}
function orderStop(u){u.path=[];u.prog=0;u.tgt=null;u.tgtTile=null;u.dest=null;}
/* 사격 한 발 */
function rtShoot(a,d){const ta=UT[a.type];a.shot=G.turn;a.face=Math.atan2(d.r-a.r,d.c-a.c)*180/Math.PI;FXH.fire(a,d.r,d.c);
  const dmg=Math.round(calcDmg(a,d,false)*DPS_K*COOL[a.type]*(.8+Math.random()*.4)*10)/10;d.hp=Math.round((d.hp-dmg)*10)/10;
  if(ta.sup||ta.ex)d.supp=Math.max(d.supp||0,ta.sup?1.2:1);
  if(ta.ex&&cell(d.r,d.c).t==='bldg')damageBldg(d.r,d.c,Math.max(1,Math.round(dmg*ta.ex*.8)));
  G.nats[a.nat].dmg=(G.nats[a.nat].dmg||0)+dmg;if(d.hp<=0&&G.units.includes(d))kill(d,a);return dmg;}
function rtShootBldg(a,r,c){const ta=UT[a.type];a.shot=G.turn;a.face=Math.atan2(r-a.r,c-a.c)*180/Math.PI;FXH.fire(a,r,c);
  const amt=Math.max(1,Math.round((ta.atk.inf+ta.atk.veh)/2*ta.ex*DPS_K*COOL[a.type]*1.2*(.85+Math.random()*.3)));damageBldg(r,c,amt);
  const u=unitAt(r,c);if(u&&G.units.includes(u)&&u.nat!==a.nat){u.hp=Math.round((u.hp-amt*.2)*10)/10;u.supp=Math.max(u.supp||0,1);if(u.hp<=0)kill(u,a);}}
/* 자동 표적: 가장 이득이 큰 적 */
function rtPick(u){const vs=G.fog?visSet(u.nat):null;let best=null,bs=0;
  for(const e of G.units){if(e.nat===u.nat||(vs&&!seen(e,u.nat,vs)))continue;if(dist(u.r,u.c,e.r,e.c)>UT[u.type].rng[1])continue;if(!canHit(u,e))continue;
    const s=calcDmg(u,e,false)*UT[e.type].cost/Math.max(1,e.hp)+(u.tgt===e.id?99:0);if(s>bs){bs=s;best=e;}}
  return best;}
function rtMove(u,dt){if(!u.path||!u.path.length)return;const k=u.path[0],r=kr(k),c=kc(k);const x=G.map[r][c];
  if(mcost(u.type,x)===Infinity){u.path=[];u.prog=0;return;}
  if(u.prog===0||u.prog>=.98){const o=rtBusy(k,u);if(o){u.wait=(u.wait||0)+dt;u.prog=Math.min(u.prog,.0);
      if(u.wait>1.2){u.wait=0;if(u.path.length<=1||o.nat!==u.nat&&!UT[o.type].fly){u.path=[];}else{const f=u.path[u.path.length-1];u.path=pathTo(u,kr(f),kc(f),new Set([k]));}}
      return;}}
  u.wait=0;if(u.prog===0)u.face=Math.atan2(r-u.r,c-u.c)*180/Math.PI;
  u.prog+=dt/cellSec(u,x);
  if(u.prog>=1){u.prog=0;u.r=r;u.c=c;u.path.shift();u.moved=true;bump();afterMove(u);if(!G.units.includes(u))return;
    if(u.tgt!=null){const e=G.units.find(z=>z.id===u.tgt);if(e&&canHit(u,e)){u.path=[];}}
    if(u.tgtTile!=null&&canHitTile(u,kr(u.tgtTile),kc(u.tgtTile))){u.path=[];}}}
function rtFight(u){const t=UT[u.type];if(!t.rng[1]||u.cd>0)return;const moving=!!(u.path&&u.path.length);if(t.ind&&moving)return;
  // 명령받은 표적을 쫓는다
  if(u.tgt!=null){const e=G.units.find(z=>z.id===u.tgt);if(!e||(G.fog&&!seen(e,u.nat))){u.tgt=null;}
    else if(!canHit(u,e)&&!moving&&!u.hold){u.path=pathTo(u,e.r,e.c);u.prog=0;}}
  let tg=rtPick(u);
  if(!tg&&u.tgtTile!=null){const r=kr(u.tgtTile),c=kc(u.tgtTile);if(G.map[r][c].t!=='bldg'){u.tgtTile=null;}else if(canHitTile(u,r,c)){rtShootBldg(u,r,c);u.cd=COOL[u.type]*(.9+Math.random()*.2);return;}}
  if(!tg)return;rtShoot(u,tg);u.cd=COOL[u.type]*(.85+Math.random()*.3)*(moving?1.5:1);}
/* 30초마다: 수입·승점·날씨·연막 */
function rtRound(){G.turn++;for(const n of G.order){if(!G.nats[n].alive)continue;G.nats[n].cp+=income(n);G.nats[n].vp+=objCount(n);}
  if(Math.random()<.35)G.wx=rollWx();for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=G.map[r][c];if(x.smoke>0)x.smoke--;}
  G.hist.push(G.order.map(k=>G.nats[k].vp));bump();save();}
function rtTick(dt){if(!G||G.over)return;G.time=(G.time||0)+dt;
  while(G.time>=G.turn*ROUND_S&&!G.over)rtRound();
  for(const u of G.units.slice()){if(!G.units.includes(u))continue;if(u.supp>0)u.supp=Math.max(0,u.supp-dt/3);u.cd=(u.cd||0)-dt;rtMove(u,dt);if(G.units.includes(u))rtFight(u);}
  for(const n of G.order){if(!isAI(n)||!G.nats[n].alive)continue;const N2=G.nats[n];N2.aiT=(N2.aiT??Math.random()*1.5)-dt;
    if(N2.aiT<=0){N2.aiT=1.6+Math.random()*1.2;try{aiThink(n);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}}}
  if(typeof scnAfterAct==='function'&&G.scn==='tut')scnAfterAct();
  checkOver();}
/* 시뮬레이션을 secs초만큼 돌린다(테스트·관전용) */
function rtRun(secs){const n=Math.round(secs/TICK);for(let i=0;i<n&&!G.over;i++)rtTick(TICK);return G.over;}
/* 브라우저 루프 */
const RT={last:0,acc:0,uiT:0,v:-1};
function rtLoop(now){requestAnimationFrame(rtLoop);const dt0=Math.min(.25,(now-(RT.last||now))/1000);RT.last=now;if(!G||G.over)return;
  const setupOpen=!$('#setup').hidden;if(G.paused||(setupOpen&&!G.boot))return;
  RT.acc+=dt0*(G.spd||1);let n=0;while(RT.acc>=TICK&&n++<12){RT.acc-=TICK;rtTick(TICK);}
  RT.uiT-=dt0;if(RT.uiT<=0||(RT.v!==G.ver&&RT.uiT<.15)||G.over){RT.uiT=.25;RT.v=G.ver;render();}}
function rtStart(){if(RT.started)return;RT.started=true;requestAnimationFrame(rtLoop);}
const fmtT=s=>{s=Math.max(0,Math.floor(s));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;};
