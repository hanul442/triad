/* ===================== RULES: 이동·시야·전투·건물 ===================== */
function mcost(type,x){const t=UT[type];if(t.fly)return 1;if(x.t==='water')return Infinity;
  if(t.cls==='veh'){if(x.t==='bldg')return Infinity;return x.t==='rubble'?3:x.t==='park'?2:1;}
  return x.t==='rubble'||x.t==='bldg'?2:1;}
const inside=u=>!UT[u.type].fly&&cell(u.r,u.c).t==='bldg';
/* 시야·사격 판정(eye, los, visSet, seen, canHit…)은 04b-sight.js, 엄폐·피해(calcDmg)는 04c-cover.js */
const bump=()=>{G.ver=(G.ver||0)+1;};
/* 이동 가능 칸 (다익스트라). 아군은 지나갈 수 있고 적은 막는다. 보이는 적 지상 부대 옆에 들어서면 거기서 멈춘다. */
function reach(u){const t=UT[u.type];let mv=t.mv-(u.supp?1:0);const res=new Map(),prev=new Map();const O=occ();const vs=G.fog?1:null;
  const stopAt=(r,c)=>{if(t.fly)return false;for(const [a,b] of nbrs(r,c)){const e=O.get(key(a,b));if(e&&hostile(e.nat,u.nat)&&!UT[e.type].fly&&(!vs||seen(e,u.nat)))return true;}return false;};
  const st=key(u.r,u.c);res.set(st,0);const q=[[0,u.r,u.c]];
  while(q.length){q.sort((a,b)=>a[0]-b[0]);const [d,r,c]=q.shift();if(d>res.get(key(r,c)))continue;if(key(r,c)!==st&&stopAt(r,c))continue;
    for(const [a,b] of nbrs(r,c)){const x=G.map[a][b];const mc=mcost(u.type,x);if(mc===Infinity)continue;
      if(t.cls==='veh'&&a!==r&&b!==c&&(G.map[a][c].t==='bldg'&&G.map[r][b].t==='bldg'))continue;
      const nd=d+mc;if(nd>mv)continue;const k=key(a,b);const o=O.get(k);if(o&&o.nat!==u.nat)continue;if(o&&UT[o.type].fly!==t.fly&&false)continue;
      if(!res.has(k)||nd<res.get(k)){res.set(k,nd);prev.set(k,key(r,c));q.push([nd,a,b]);}}}
  for(const k of [...res.keys()]){const o=O.get(k);if(o&&o!==u)res.delete(k);}
  res.prev=prev;return res;}
/* ---------- 전투 ---------- */
function rollDmg(v){return Math.max(v>0?1:0,Math.round(v*(.85+Math.random()*.3)));}
function damageBldg(r,c,amt){const x=G.map[r][c];if(x.t!=='bldg'||amt<=0)return;x.bhp-=amt;bump();
  if(x.bhp<=0){const f0=x.f;x.t='rubble';G.navV=(G.navV||0)+1;x.f=0;x.bhp=0;FXH.collapse(r,c,f0);sfx('boom');L(`${x.obj!=null?G.objs[x.obj].name+' ':''}건물 붕괴`);
    const u=unitAt(r,c);if(u){u.hp-=5;u.supp=2;if(u.hp<=0)kill(u,null);}}}
function kill(u,by){FXH.kill(u);G.units=G.units.filter(x=>x!==u);bump();const N2=G.nats[u.nat];N2.losses++;if(by){G.nats[by.nat].kills++;by.kills=(by.kills||0)+1;by.rank=Math.min(2,Math.floor(by.kills/2));}
  L(`${natName(u.nat)} ${UT[u.type].n} 격파`);if(UI.sel===u)UI.sel=null;}
function attack(a,d){const ta=UT[a.type];a.shot=G.turn;FXH.fire(a,d.r,d.c);const dmg=rollDmg(calcDmg(a,d,false));d.hp-=dmg;
  if(ta.sup||ta.ex)d.supp=2;if(ta.ex&&cell(d.r,d.c).t==='bldg')damageBldg(d.r,d.c,Math.round(dmg*ta.ex*.6));
  G.nats[a.nat].dmg=(G.nats[a.nat].dmg||0)+dmg;
  if(d.hp<=0){if(G.units.includes(d))kill(d,a);}
  else if(G.units.includes(d)&&!UT[d.type].ind&&canHit(d,a)){const cd=rollDmg(calcDmg(d,a,true));if(cd>0){d.shot=G.turn;FXH.fire(d,a.r,a.c);a.hp-=cd;if(a.hp<=0)kill(a,d);}}
  bump();return dmg;}
function shootBldg(a,r,c){const ta=UT[a.type];a.shot=G.turn;FXH.fire(a,r,c);const amt=Math.round((ta.atk.inf+ta.atk.veh)/2*ta.ex*(.85+Math.random()*.3));damageBldg(r,c,amt);
  const u=unitAt(r,c);if(u&&G.units.includes(u)&&u.nat!==a.nat){u.hp-=Math.max(1,Math.round(amt*.25));u.supp=2;if(u.hp<=0)kill(u,a);}bump();}
/* 이동 직후: 거점 점령, 적의 경계 사격 */
function afterMove(u){const x=cell(u.r,u.c);if(UT[u.type].cap&&x.obj!=null&&x.owner!==u.nat){const was=x.owner;x.owner=u.nat;L(`${natName(u.nat)} ${G.objs[x.obj].name} 확보${was!=null?` (${natName(was)}에게서 탈환)`:''}`);sfx('build');}
  for(const w of G.units.slice()){if(!w.ow||w.nat===u.nat||!G.units.includes(u))continue;if(G.fog&&!seen(u,w.nat))continue;if(!canHit(w,u))continue;
    w.ow=false;L(`${natName(w.nat)} ${UT[w.type].n} 경계 사격`);const ta=UT[w.type];w.shot=G.turn;FXH.fire(w,u.r,u.c);const dmg=rollDmg(calcDmg(w,u,false)*.85);u.hp-=dmg;if(ta.sup||ta.ex)u.supp=2;
    if(u.hp<=0){kill(u,w);break;}}
  bump();}
function moveUnit(u,r,c){u.r=r;u.c=c;u.x=c+.5;u.z=r+.5;u.moved=true;bump();afterMove(u);}
function targetsOf(u,moved){const out=[];if(!UT[u.type].rng[1])return out;const vs=G.fog?1:null;
  for(const e of G.units){if(e.nat===u.nat)continue;if(vs&&!seen(e,u.nat))continue;if(canHit(u,e,null,null,moved))out.push(key(e.r,e.c));}
  if(UT[u.type].ex){const R2=UT[u.type].rng[1];for(let r=Math.max(0,u.r-R2);r<=Math.min(N-1,u.r+R2);r++)for(let c=Math.max(0,u.c-R2);c<=Math.min(N-1,u.c+R2);c++){const k=key(r,c);if(out.includes(k))continue;
    const o=unitAt(r,c);if(o&&o.nat===u.nat)continue;if(canHitTile(u,r,c,null,null,moved))out.push(k);}}
  return out;}
/* ---------- 증원·화력 지원 ---------- */
function deploySpots(n,type){const out=[];const O=occ();const inc=new Set(G.units.map(o=>key(Math.floor(o.z),Math.floor(o.x))));
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=G.map[r][c];if(O.has(key(r,c))||inc.has(key(r,c)))continue;if(mcost(type,x)===Infinity)continue;
    let ok=inZone(n,r,c);if(!ok)for(const o of G.objs){const y=G.map[o.r][o.c];if(y.owner===n&&dist(o.r,o.c,r,c)<=1&&!G.units.some(e=>e.nat!==n&&dist(e.r,e.c,o.r,o.c)<=2)){ok=true;break;}}
    if(ok)out.push(key(r,c));}return out;}
let UID=1;
function mkUnit(n,type,r,c){const u={id:UID++,nat:n,type,r,c,x:c+.5+(Math.random()-.5)*.3,z:r+.5+(Math.random()-.5)*.3,hp:UT[type].hpMax||10,done:false,moved:false,supp:0,ow:false,kills:0,rank:0,path:[],cd:Math.random()*1.5,tgt:null,tgtTile:null,face:n===1?180:n===2?90:n===3?270:0};G.units.push(u);bump();return u;}
function buy(n,type,r,c){const N2=G.nats[n];const t=UT[type];if(N2.cp<t.cost)return null;if(!deploySpots(n,type).includes(key(r,c)))return null;
  N2.cp-=t.cost;const u=mkUnit(n,type,r,c);u.done=true;N2.bought=(N2.bought||0)+1;L(`${natName(n)} ${t.n} 증원`);sfx('build');return u;}
function supArea(r,c,rad){const o=[];for(let a=r-rad;a<=r+rad;a++)for(let b=c-rad;b<=c+rad;b++)if(inb(a,b))o.push([a,b]);return o;}
function canSupport(n,kind,r,c){const N2=G.nats[n];if(N2.cp<SUP[kind].cost||(N2.supT||0)>(G.time||0))return false;if(kind==='air'&&WX[G.wx].noAir)return false;if(kind==='heli')return !WX[G.wx].noAir&&heliCanLand(n,r,c)&&visSet(n).has(key(r,c));return kind==='smoke'||visSet(n).has(key(r,c));}
function support(n,kind,r,c){if(!canSupport(n,kind,r,c))return false;const N2=G.nats[n];N2.cp-=SUP[kind].cost;N2.supT=(G.time||0)+SUP_CD;FXH.strike(kind,r,c,n);
  if(kind==='smoke'){for(const [a,b] of supArea(r,c,1))G.map[a][b].smoke=3;sfx('launch');L(`${natName(n)} 연막 차장`);bump();return true;}
  if(kind==='heli'){heliInsert(n,r,c);L(`${natName(n)} 헬기 투입 요청`);bump();return true;}
  sfx('arty');L(`${natName(n)} ${SUP[kind].n}`);
  for(const [a,b] of supArea(r,c,SUP[kind].rad)){const ctr=a===r&&b===c;const x=G.map[a][b];
    const u=unitAt(a,b);if(u){const cov=UT[u.type].fly?0:TT[x.t].cov*.5;const base=kind==='air'?9:(ctr?6:4);const d=Math.max(1,Math.round(base*(1-cov)*(.85+Math.random()*.3)));u.hp-=d;u.supp=2;if(u.hp<=0)kill(u,null);}
    if(x.t==='bldg')damageBldg(a,b,kind==='air'?24:(ctr?9:6));}
  if(typeof fortBlast==='function')fortBlast(c+.5,r+.5,kind==='air'?.7:1.5,kind==='air'?90:24);
  bump();return true;}
