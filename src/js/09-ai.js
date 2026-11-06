/* ===================== AI ===================== */
async function runAI(){G.busy=true;const n=G.cur;render();
  if(G.scn&&SCN[G.scn.id]&&(SCN[G.scn.id].passive||[]).includes(n)){G.busy=false;await sleep(0);endTurn();return;}
  aiDiplo(n);aiEconomy(n,true);
  const ord={awacs:0,uav:0,ftr:0,stealth:0,bmb:1,heli:1,art:2,mlrs:2,sam:2,lrsam:2,bb:3,cg:3,dd:3,ff:3,pb:3,sub:4,cv:4,lst:4.5,th:4.5,recon:4.8,tank:5,ifv:5,aa:6,at:6,inf:7,spec:7,eng:7,tel:8,truck:8};
  for(const id in (G.hangar||{})){const k=+id;if(cell(kr(k),kc(k)).owner!==n)continue;for(const u of [...hangar(k)])if(!u.done&&!(G.wx==='storm'))sortie(n,k,u.id);}
  const mine=G.units.filter(u=>u.nat===n).sort((a,b)=>(ord[a.type]??5)-(ord[b.type]??5));
  for(const u of mine){if(G.over)break;if(!G.units.includes(u))continue;try{aiUnit(u);}catch(e){u.done=true;(G.errs=G.errs||[]).push(String(e&&e.stack||e));}
    if(G.speed){render();await sleep(G.speed);}}
  if(!G.over)aiLaunch(n);if(!G.over)aiEconomy(n,false);G.busy=false;if(G.over){save();render();return;}
  await sleep(0);endTurn();}
function aiLaunch(n){let g=0;while(canLaunch(n,'b')&&g++<4){let best=null;for(const k of mslTargets(n,'b',null)){const r=kr(k),c=kc(k);
      for(const sp of [0,1,2]){let v=0;for(const [a,b] of strikeHexes(r,c,sp)){const u=unitAt(a,b);if(!u)continue;const w=UT[u.type].cost[0]*SPREAD[sp].d[dist(a,b,r,c)]/5;v+=hostile(n,u.nat)?w:u.nat===n?-w*2:0;}
        const x=cell(r,c);if(x.bld&&hostile(n,x.owner))v+=6;if(!best||v>best.v)best={r,c,v,sp};}}
    if(!best||best.v<7)break;launch(n,'b',best.r,best.c,best.sp);}
  g=0;while(canLaunch(n,'c')&&g++<4){let best=null;for(const k of mslTargets(n,'c',null)){const e=unitAt(kr(k),kc(k));const v=UT[e.type].cost[0]*(e.hp<=7?2:1)+(UT[e.type].ind?2:0);if(!best||v>best.v)best={e,v};}
    if(!best||best.v<3)break;launch(n,'c',best.e.r,best.e.c);}}
function aiLst(u,RS,go,toward){const n=u.nat;
  if(u.cargo){const tg=[];for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const x=G.map[r][c];if(x.t==='sea')continue;if(x.owner!==n&&openTo(n,x.owner)&&(SITES.includes(x.t)||x.bld))tg.push([r,c]);}
    for(const e of G.units)if(hostile(n,e.nat)&&UT[e.type].d==='land')tg.push([e.r,e.c]);
    const home=connSet(...G.nats[n].hq,'inf');const cand=tg.filter(g=>!home.has(key(...g)));const list=(cand.length?cand:tg).sort((a,b)=>dist(u.r,u.c,...a)-dist(u.r,u.c,...b));const g=list[0];
    if(!g){u.done=true;return;}const gl=connSet(g[0],g[1],u.cargo.type);
    const spotsAt=(r,c)=>{const sr=u.r,sc=u.c;u.r=r;u.c=c;const sp=unloadSpots(u).filter(k=>gl.has(k));u.r=sr;u.c=sc;return sp;};
    let pick=[u.r,u.c],pd=Infinity;for(const [k] of RS){const r=kr(k),c=kc(k);const sp=spotsAt(r,c);const d=sp.length?Math.min(...sp.map(q=>dist(kr(q),kc(q),...g)))-20:dist(r,c,...g);if(d<pd){pd=d;pick=[r,c];}}
    if(pick[0]!==u.r||pick[1]!==u.c)go(pick[0],pick[1]);const sp=unloadSpots(u).filter(k=>gl.has(k)).sort((a,b)=>dist(kr(a),kc(a),...g)-dist(kr(b),kc(b),...g));
    if(sp.length)unload(u,kr(sp[0]),kc(sp[0]));u.done=true;return;}
  const want=G.units.filter(x=>x.nat===n&&x.wantShip&&UT[x.type].d==='land').sort((a,b)=>dist(u.r,u.c,a.r,a.c)-dist(u.r,u.c,b.r,b.c));
  if(want[0]&&dist(u.r,u.c,want[0].r,want[0].c)>1)toward([want[0].r,want[0].c]);u.done=true;}
function aiFocus(n){const N=G.nats[n];if(G.diff==='easy'){N.focus=null;return;}const ok=N.focus!=null&&G.nats[N.focus].alive&&hostile(n,N.focus);if(ok&&G.turn-(N.focusT||0)<5)return;
  let best=null,bv=Infinity;for(const M of G.nats){if(!M.alive||M.id===n||!hostile(n,M.id))continue;const v=power(M.id)*(1+dist(...N.hq,...M.hq)/10);if(v<bv){bv=v;best=M.id;}}N.focus=best;N.focusT=G.turn;}
function aiDiplo(n){aiFocus(n);const L0=leader();G.coal=null;
  if(L0.id!=null&&L0.share>0.38&&G.nats.filter(M=>M.alive).length>2){G.coal=L0.id;
    if(L0.id!==n){if(atPeace(n,L0.id)){delete G.peace[pk(n,L0.id)];L(`${natName(n)}, 패권 견제를 위해 ${natName(L0.id)}와의 조약 파기`);}
      for(const M of G.nats)if(M.alive&&M.ctrl==='ai'&&M.id!==n&&M.id!==L0.id&&hostile(n,M.id)&&Math.random()<0.5){sign(n,M.id);L(`${natName(n)}·${natName(M.id)} 반(反)${natName(L0.id)} 연합 결성`);}
      return;}}
  const others=G.nats.filter(M=>M.alive&&M.id!==n&&hostile(n,M.id));if(!others.length)return;
  const M=others[Math.floor(Math.random()*others.length)];if(Math.random()>0.08)return;
  if(M.ctrl==='human'){if(!G.offers.some(o=>o.from===n&&o.to===M.id)&&power(n)<power(M.id)*1.3)G.offers.push({from:n,to:M.id});}
  else if(aiAccept(M.id,n))sign(n,M.id);}
function aiEconomy(n,pre){const N=G.nats[n];
  if(!pre&&N.f>45){let best=null;for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const x=G.map[r][c];if(x.owner===n&&(x.t==='city'||x.t==='hq')&&(x.dev||0)<3&&x.occ<=0&&(!best||(x.dev||0)<(cell(...best).dev||0)))best=[r,c];}if(best)develop(n,...best);}
  if(pre&&N.f>=12&&N.s>=6){const want=N.pers==='방어'?3:N.pers==='균형'?2:1;let made=0;
    for(const u of G.units){if(made>=want)break;if(u.nat!==n||UT[u.type].d!=='land'||u.type==='truck')continue;
      const foe=G.units.filter(e=>hostile(n,e.nat)&&UT[e.type].d==='land'&&dist(e.r,e.c,u.r,u.c)<=3).sort((a,b)=>dist(a.r,a.c,u.r,u.c)-dist(b.r,b.c,u.r,u.c))[0];if(!foe)continue;
      if(!cell(u.r,u.c).fort&&fortable(n,u.r,u.c)&&Math.random()<0.5){if(fortify(n,'bunker',u.r,u.c))made++;continue;}
      const nb=nbrs(u.r,u.c).filter(([a,b])=>!unitAt(a,b)&&fortable(n,a,b)).sort((p,q)=>dist(p[0],p[1],foe.r,foe.c)-dist(q[0],q[1],foe.r,foe.c))[0];
      if(nb&&fortify(n,Math.random()<0.7?'fence':'mines',nb[0],nb[1]))made++;}}
  if(pre&&!N.res&&N.f>=22){const pri={공세:['armor','mass','precision','jet','mobil'],균형:['logistics','mass','radar','mobil','armor'],방어:['radar','armor','logistics','precision','mobil']}[N.pers];
    for(const k of [...pri,...Object.keys(TECH)])if(!hasTech(n,k)&&canPay(n,TECH[k].cost)&&N.f-TECH[k].cost[0]>=8){startResearch(n,k);break;}}
  if(pre){const pri={공세:['g3','g4','fin'],균형:['fin','g4','g3'],방어:['g2','fin','eng']}[N.pers];
    for(const r of pri)if(N.f>=STAFF_COST+8&&N.staff.length<STAFF_SLOTS&&!hasStaff(n,r)){hire(n,r);break;}
    const have=t=>G.map.some(row=>row.some(x=>x.owner===n&&x.bld&&x.bld.type===t));
    const airN=G.units.filter(x=>x.nat===n&&UT[x.type].d==='air').length;const hasHangar=G.map.some(row=>row.some(x=>x.owner===n&&x.bld&&x.bld.type==='hangar'));
    const want0=[];if(have('airfield')&&!hasHangar&&airN>=2)want0.push('hangar');const want=want0;const portOk=()=>{for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(buildable(n,r,c)&&coastal(r,c))return true;return false;};
    if(!have('port')&&(G.mt==='arch'||G.turn>6)&&portOk())want.push('port');if(!have('factory'))want.unshift('factory');else{if(!have('arsenal')&&G.turn>2)want.push('arsenal');if(have('port')&&!have('shipyard')&&G.turn>9&&N.f>30)want.push('shipyard');if(!have('silo')&&G.turn>8&&N.f>30)want.push('silo');if(!have('airfield')&&G.turn>5)want.push('airfield');if(!have('depot')&&G.turn>4)want.push('depot');if(!have('barracks'))want.push('barracks');}
    for(const t of want){if(!canPay(n,bCost(n,t)))break;const [hr,hc]=N.hq;let best=null;
      for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(siteOk(n,t,r,c)){const d=dist(r,c,hr,hc);if(!best||d<best[2])best=[r,c,d];}
      if(best){construct(n,t,best[0],best[1]);break;}}
    return;}
  const enemyAir=G.units.some(u=>u.nat!==n&&UT[u.type].d==='air');const my=G.units.filter(u=>u.nat===n);
  const trucks=my.filter(u=>u.type==='truck').length;let neutral=0;for(const row of G.map)for(const x of row)if(SITES.includes(x.t)&&x.owner==null)neutral++;
  const w={inf:neutral>3?3:1.6,truck:my.length>8&&trucks<my.length/9?1.2:0.1,tank:N.pers==='공세'?4:3,art:N.pers==='방어'?3:2,aa:enemyAir?3:0.6,sam:enemyAir?2.5:0.2,lst:(G.units.some(x=>x.nat===n&&x.wantShip)&&!G.units.some(x=>x.nat===n&&x.type==='lst'&&!x.cargo))?5:0,dd:2,sub:1,bb:1.5,cv:(my.filter(x=>UT[x.type].d==='air').length>=2?1:0.1),ftr:enemyAir?2:0.5,bmb:N.pers==='공세'?2:1,
    at:G.units.some(u=>u.nat!==n&&UT[u.type].cls==='armor')?2:0.6,eng:0.5,spec:1,recon:0.6,ifv:2,mlrs:N.pers==='공세'?1.2:1.6,lrsam:enemyAir?1.4:0.2,tel:stock(n).b+stock(n).c>0?0.8:0,
    pb:1,ff:G.units.some(u=>u.nat!==n&&u.type==='sub')?2:0.5,cg:enemyAir?1.2:0.4,heli:1.6,th:G.units.some(x=>x.nat===n&&x.wantShip)?1:0.1,uav:0.8,stealth:1.6,awacs:0.25,aor:my.filter(x=>warship(x.type)).length>=4&&!my.some(x=>x.type==='aor')?1.2:0,tnk:my.filter(x=>UT[x.type].d==='air').length>=4&&!my.some(x=>x.type==='tnk')?1:0};
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const x=G.map[r][c];if(x.owner!==n||x.used)continue;const p=producer(x);if(!p)continue;
    if(p==='silo'){const st=stock(n);if(hasTech(n,'rocketry')&&st.b<2&&canPay(n,MSL.b.cost))mprod(n,'b',r,c);else if(st.c<4&&N.f>12)mprod(n,'c',r,c);continue;}
    const opts=TYPES.filter(t=>UT[t].from.includes(p)&&prodOk(n,t,r,c)&&w[t]>0&&canPay(n,uCost(n,t))&&canSpawn(n,t,r,c));if(!opts.length)continue;
    let tot=opts.reduce((s,t)=>s+w[t],0),q=Math.random()*tot,pick=opts[0];for(const t of opts){q-=w[t];if(q<=0){pick=t;break;}}produce(n,pick,r,c);}}
function aiUnit(u){const n=u.nat,t=UT[u.type],RS=reach(u);const N=G.nats[n];
  const go=(r,c)=>{moveUnit(u,r,c,RS.get(key(r,c))||0);};
  const blocks=(r,c)=>{if(t.cap)return false;if(cell(r,c).rig&&warship(u.type))return false;const x=cell(r,c);return x.owner!==n&&(SITES.includes(x.t)||!!x.bld);};
  const toward=g=>{let pick=null,pd=dist(u.r,u.c,g[0],g[1]);for(const [k] of RS){const r=kr(k),c=kc(k);if(blocks(r,c))continue;const d=dist(r,c,g[0],g[1])-(t.d==='land'?(TR[cell(r,c).t].def)*0.05:0);if(d<pd){pd=d;pick=[r,c];}}if(pick)go(pick[0],pick[1]);};
  if(t.d==='air'&&G.wx==='storm'){u.done=true;return;}
  if(UT[u.type].carry){aiLst(u,RS,go,toward);return;}
  if(warship(u.type)){let rg=null;for(const [k] of RS){const x=cell(kr(k),kc(k));if(x.rig&&x.owner!==n&&openTo(n,x.owner)){rg=[kr(k),kc(k)];break;}}if(rg){go(rg[0],rg[1]);capture(u);return;}}
  if(u.type==='truck'){const S=supplySources(n);const needy=G.units.filter(x=>x.nat===n&&x.type!=='truck'&&UT[x.type].d==='land'&&!inSupply(x,S)).sort((a,b)=>dist(u.r,u.c,a.r,a.c)-dist(u.r,u.c,b.r,b.c));
    const g=needy[0]||G.units.filter(x=>x.nat===n&&x!==u&&UT[x.type].d==='land').sort((a,b)=>dist(b.r,b.c,...N.hq)-dist(a.r,a.c,...N.hq))[0];
    if(g&&dist(u.r,u.c,g.r,g.c)>1)toward([g.r,g.c]);u.done=true;return;}
  if(t.d==='air'){{const k=baseKeyOf(u.r,u.c);if(k!=null&&cell(kr(k),kc(k)).owner===n&&t.fuel&&u.fuel<=t.fuel*0.55&&storeAir(u,k))return;}
    const bases=[];for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const x=G.map[r][c];if(x.owner===n&&(x.t==='hq'||(x.bld&&x.bld.type==='airfield'&&!x.bld.left)))bases.push([r,c]);if(x.owner===n&&x.rwy!=null)bases.push([r,c]);}for(const v of G.units)if(v.nat===n&&v.type==='cv')bases.push([v.r,v.c]);
    bases.sort((a,b)=>dist(u.r,u.c,...a)-dist(u.r,u.c,...b));const b=bases[0];
    if(b&&u.fuel<=dist(u.r,u.c,b[0],b[1])+5){if(RS.has(key(b[0],b[1])))go(b[0],b[1]);else toward(b);u.done=true;return;}}
  if(!t.atk&&!t.sup&&!t.carry&&!t.carrier&&!t.replen){const [hr,hc]=N.hq;
    if(u.type==='tnk'){const air=G.units.filter(x=>x.nat===n&&x!==u&&UT[x.type].d==='air').sort((a,b)=>dist(b.r,b.c,hr,hc)-dist(a.r,a.c,hr,hc))[0];if(air&&dist(u.r,u.c,air.r,air.c)>1)toward([air.r,air.c]);}
    else if(u.type==='awacs'){const fr=G.units.filter(x=>x.nat===n&&x!==u&&UT[x.type].d!=='air').sort((a,b)=>dist(b.r,b.c,hr,hc)-dist(a.r,a.c,hr,hc))[0];if(fr&&dist(u.r,u.c,fr.r,fr.c)>1)toward([fr.r,fr.c]);}
    else if(dist(u.r,u.c,hr,hc)>3)toward([hr,hc]);u.done=true;return;}
  if(t.cap){let bc=null,bs=0;for(const [k] of RS){const r=kr(k),c=kc(k);const x=cell(r,c);
      if(x.owner!==n&&openTo(n,x.owner)&&(SITES.includes(x.t)||x.bld)){const sc=x.t==='hq'?100:x.t==='city'?20:x.bld?15:12;if(sc>bs){bs=sc;bc=[r,c];}}}
    if(bc){go(bc[0],bc[1]);capture(u);return;}}
  if(t.ind){if(hasAmmo(u)){let best=null;for(const e of G.units){if(!hostile(n,e.nat)||!canHit(u,e))continue;const d=calcDmg(u,e,false);const v=d*(UT[e.type].cost[0]+1)+(d>=e.hp?15:0);if(!best||v>best.v)best={e,v};}
      if(best&&best.v>0){attack(u,best.e);return;}}
    const foes=G.units.filter(e=>hostile(n,e.nat)).sort((a,b)=>dist(u.r,u.c,a.r,a.c)-dist(u.r,u.c,b.r,b.c));
    if(foes[0]){let pick=null,pv=Infinity;for(const [k] of RS){const r=kr(k),c=kc(k);const v=Math.abs(dist(r,c,foes[0].r,foes[0].c)-3);if(v<pv){pv=v;pick=[r,c];}}if(pick&&(pick[0]!==u.r||pick[1]!==u.c))go(pick[0],pick[1]);}
    u.done=true;return;}
  if(hasAmmo(u)){let best=null;const O=occ();
    const [lo,hi]=rngU(u);const foes=G.units.filter(e=>hostile(n,e.nat)&&dmgBase(u.type,e.type)&&dist(u.r,u.c,e.r,e.c)<=t.mv+hi+1);
    for(const [k] of RS){const r=kr(k),c=kc(k);for(const e of foes){const dd=dist(r,c,e.r,e.c);if(dd<lo||dd>hi)continue;
        const sr=u.r,sc=u.c;u.r=r;u.c=c;const d=calcDmg(u,e,false);u.r=sr;u.c=sc;
        let v=d*(UT[e.type].cost[0]+1)+(d>=e.hp?(UT[e.type].cost[0]+1)*4:0);const rest=Math.max(0,e.hp-d);const [elo,ehi]=rngU(e);
        if(rest>0&&!UT[e.type].ind&&hasAmmo(e)&&dd>=elo&&dd<=ehi)v-=dmgBase(e.type,u.type)*(rest/10)*(t.cost[0]+1)*0.8;
        if(d>0&&(!best||v>best.v))best={r,c,e,v};}}
    if(best&&best.v>0){go(best.r,best.c);attack(u,best.e);return;}}
  const reachSet=connSet(u.r,u.c,u.type);const ok=(r,c)=>t.d==='air'||reachSet.has(key(r,c))||nbrs(r,c).some(([a,b])=>reachSet.has(key(a,b)));
  let goals=[];for(const e of G.units)if(hostile(n,e.nat)&&dmgBase(u.type,e.type)&&ok(e.r,e.c))goals.push([e.r,e.c]);
  if(['recon','spec','heli','uav','ifv'].includes(u.type)){for(const s of routeStates())if(s.o!=null&&s.active&&hostile(n,s.o)){const k=s.rt.p[Math.floor(s.rt.p.length/2)];if(dist(u.r,u.c,kr(k),kc(k))<=7&&(t.d==='air'||reachSet.has(k)))goals.push([kr(k),kc(k)]);}}
  if(t.cap)for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const x=G.map[r][c];if(x.owner!==n&&openTo(n,x.owner)&&(SITES.includes(x.t)||x.bld)&&reachSet.has(key(r,c)))goals.push([r,c]);}
  if(warship(u.type)){for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const x=G.map[r][c];if(x.owner===n||!openTo(n,x.owner))continue;
      if(x.rig&&reachSet.has(key(r,c)))goals.push([r,c]);else if(x.owner!=null&&(x.t==='city'||x.t==='hq'||(x.bld&&x.bld.type==='port'))&&ok(r,c)&&!blockaded(r,c))goals.push([r,c]);}}
  if(u.type==='aor'){const sh=G.units.filter(x=>x.nat===n&&x!==u&&warship(x.type)).sort((a,b)=>dist(b.r,b.c,...N.hq)-dist(a.r,a.c,...N.hq))[0];goals=sh?[[sh.r,sh.c]]:[];}
  if(u.type==='cv'){const air=G.units.filter(x=>x.nat===n&&UT[x.type].d==='air');if(air.length)goals=[[air[0].r,air[0].c]];}
  if(t.d==='land'){const real=goals.length;u.wantShip=!real&&!G.nats.some(M=>M.alive&&M.id!==n&&hostile(n,M.id)&&reachSet.has(key(...M.hq)));
    if(u.wantShip){const lk=[...RS.loads][0];if(lk){load(u,unitAt(kr(lk),kc(lk)));return;}
      const ships=G.units.filter(x=>x.nat===n&&canCarry(x.type,u.type)&&!x.cargo).sort((a,b)=>dist(u.r,u.c,a.r,a.c)-dist(u.r,u.c,b.r,b.c));if(ships[0])goals=[[ships[0].r,ships[0].c]];}}
  if(N.pers==='방어'&&t.d==='land'&&G.turn<25&&!u.wantShip){const [hr,hc]=N.hq;goals=goals.filter(g=>dist(g[0],g[1],hr,hc)<=8);if(!goals.length&&dist(u.r,u.c,hr,hc)>3)goals=[[hr,hc]];}
  if(!goals.length){for(let i=0;i<NATS.length;i++){const M=G.nats[i];if(i!==n&&M.alive&&hostile(n,i)&&ok(...M.hq))goals.push(M.hq);}}
  if(goals.length){const T=terr();const fo=N.focus,fb=G.diff==='hard'?6:4;const bias=g=>{const own=T[g[0]][g[1]],un=(unitAt(g[0],g[1])||{}).nat;let b=0;if(G.coal!=null&&G.coal!==n&&(own===G.coal||un===G.coal))b+=6;if(fo!=null&&(own===fo||un===fo))b+=fb;return b;};goals.sort((a,b)=>dist(u.r,u.c,a[0],a[1])-bias(a)-dist(u.r,u.c,b[0],b[1])+bias(b));toward(goals[0]);}
  u.done=true;}
