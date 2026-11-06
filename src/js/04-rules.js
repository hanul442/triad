/* ===================== RULES: 이동·시야·전투·건물 ===================== */
function mcost(type,x){const t=UT[type];if(t.fly)return 1;if(x.t==='water')return Infinity;
  if(t.cls==='veh'){if(x.t==='bldg')return Infinity;return x.t==='rubble'?3:x.t==='park'?2:1;}
  return x.t==='rubble'||x.t==='bldg'?2:1;}
const inside=u=>!UT[u.type].fly&&cell(u.r,u.c).t==='bldg';
/* 눈높이 (층 단위). 건물 안 보병은 그 건물 높이에서 본다. */
function eyeAt(type,r,c){const t=UT[type];if(t.fly)return 9;const x=cell(r,c);if(x.t==='bldg')return Math.max(.5,x.f-.5);return t.cls==='veh'?.8:.5;}
const eye=u=>eyeAt(u.type,u.r,u.c);
function blockH(x){if(x.smoke>0)return 99;if(x.t==='bldg')return x.f;return 0;}
/* 시야선: 두 칸 사이를 잘게 따라가며, 중간 칸의 건물이 선보다 높으면 막힌다. */
function los(r1,c1,h1,r2,c2,h2){const d=dist(r1,c1,r2,c2);if(d<=1)return true;const steps=d*4;
  for(let i=1;i<steps;i++){const t=i/steps;const r=Math.round(r1+(r2-r1)*t),c=Math.round(c1+(c2-c1)*t);if((r===r1&&c===c1)||(r===r2&&c===c2))continue;
    const b=blockH(G.map[r][c]);if(b>0&&b>=h1+(h2-h1)*t-.05)return false;}
  return true;}
function visRange(u){const t=UT[u.type];let v=t.vis;const x=cell(u.r,u.c);if(x.t==='bldg')v+=x.f>=5?2:x.f>=3?1:0;
  if(isNight())v-=t.fly?1:2;v+=WX[G.wx].vis;if(x.smoke>0&&!t.fly)v=1;return Math.max(1,v);}
/* 세력 n이 보는 칸 (G.ver로 캐시) */
function visSet(n){const ck='v'+n;G._vc=G._vc||{};const c0=G._vc[ck];if(c0&&c0.ver===G.ver)return c0.s;const s=new Set();
  for(const u of G.units){if(u.nat!==n)continue;const v=visRange(u),h=eye(u);
    for(let r=Math.max(0,u.r-v);r<=Math.min(N-1,u.r+v);r++)for(let c=Math.max(0,u.c-v);c<=Math.min(N-1,u.c+v);c++){const k=key(r,c);if(s.has(k))continue;
      const tx=G.map[r][c];const th=tx.t==='bldg'?Math.max(.5,tx.f-.5):.5;if(los(u.r,u.c,h,r,c,th))s.add(k);}}
  G._vc[ck]={ver:G.ver,s};return s;}
/* 세력 n이 부대 e를 보는가. 건물 안 저격수는 붙어 있어야 보인다(사격한 라운드에는 드러남). */
function seen(e,n,vs){if(!G.fog||e.nat===n)return true;vs=vs||visSet(n);if(!vs.has(key(e.r,e.c)))return false;
  if(UT[e.type].hide&&inside(e)&&e.shot!==G.turn&&!G.units.some(u=>u.nat===n&&dist(u.r,u.c,e.r,e.c)<=1))return false;return true;}
const bump=()=>{G.ver=(G.ver||0)+1;};
/* 이동 가능 칸 (다익스트라). 아군은 지나갈 수 있고 적은 막는다. 보이는 적 지상 부대 옆에 들어서면 거기서 멈춘다. */
function reach(u){const t=UT[u.type];let mv=t.mv-(u.supp?1:0);const res=new Map(),prev=new Map();const O=occ();const vs=G.fog?visSet(u.nat):null;
  const stopAt=(r,c)=>{if(t.fly)return false;for(const [a,b] of nbrs(r,c)){const e=O.get(key(a,b));if(e&&hostile(e.nat,u.nat)&&!UT[e.type].fly&&(!vs||seen(e,u.nat,vs)))return true;}return false;};
  const st=key(u.r,u.c);res.set(st,0);const q=[[0,u.r,u.c]];
  while(q.length){q.sort((a,b)=>a[0]-b[0]);const [d,r,c]=q.shift();if(d>res.get(key(r,c)))continue;if(key(r,c)!==st&&stopAt(r,c))continue;
    for(const [a,b] of nbrs(r,c)){const x=G.map[a][b];const mc=mcost(u.type,x);if(mc===Infinity)continue;
      if(t.cls==='veh'&&a!==r&&b!==c&&(G.map[a][c].t==='bldg'&&G.map[r][b].t==='bldg'))continue;
      const nd=d+mc;if(nd>mv)continue;const k=key(a,b);const o=O.get(k);if(o&&o.nat!==u.nat)continue;if(o&&UT[o.type].fly!==t.fly&&false)continue;
      if(!res.has(k)||nd<res.get(k)){res.set(k,nd);prev.set(k,key(r,c));q.push([nd,a,b]);}}}
  for(const k of [...res.keys()]){const o=O.get(k);if(o&&o!==u)res.delete(k);}
  res.prev=prev;return res;}
/* ---------- 전투 ---------- */
function canHit(a,d,fromR,fromC,moved){const t=UT[a.type];if(!t.rng[1])return false;const r=fromR??a.r,c=fromC??a.c;const dd=dist(r,c,d.r,d.c);
  if(dd<t.rng[0]||dd>t.rng[1])return false;if(!(t.atk[UT[d.type].cls]>0))return false;if(t.ind&&moved)return false;if(t.ind&&UT[d.type].fly)return false;
  if(t.ind){return visSet(a.nat).has(key(d.r,d.c));}
  return los(r,c,eyeAt(a.type,r,c),d.r,d.c,eye(d));}
function canHitTile(a,r2,c2,fromR,fromC,moved){const t=UT[a.type];if(!t.ex||!t.rng[1])return false;const r=fromR??a.r,c=fromC??a.c;const dd=dist(r,c,r2,c2);
  if(dd<t.rng[0]||dd>t.rng[1])return false;if(t.ind&&moved)return false;const x=G.map[r2][c2];if(x.t!=='bldg')return false;
  if(t.ind)return visSet(a.nat).has(key(r2,c2));return los(r,c,eyeAt(a.type,r,c),r2,c2,Math.max(.5,x.f-.5));}
function calcDmg(a,d,counter){const ta=UT[a.type],td=UT[d.type];let v=ta.atk[td.cls]||0;if(!v)return 0;
  v*=.4+.6*a.hp/hpMax(a);const x=cell(d.r,d.c);let cov=td.fly?0:TT[x.t].cov;if(ta.ex&&x.t==='bldg')cov*=.5;if(x.smoke>0)cov+=.15;v*=1-cov;
  const ax=cell(a.r,a.c);
  if(a.type==='at'&&td.cls==='veh'&&(ax.t==='bldg'||ax.t==='rubble'))v*=1.25;
  if(td.cls==='veh'&&ta.cls==='inf'&&dist(a.r,a.c,d.r,d.c)<=1)v*=1.2;
  if(td.armor&&a.type!=='at'&&a.type!=='eng'&&a.type!=='tank')v*=.65;
  if(eye(a)>=eye(d)+2&&!ta.ind)v*=1.15;
  if(a.supp)v*=.7;v*=1+.1*(a.rank||0);if(counter)v*=.6;
  return v;}
function rollDmg(v){return Math.max(v>0?1:0,Math.round(v*(.85+Math.random()*.3)));}
function damageBldg(r,c,amt){const x=G.map[r][c];if(x.t!=='bldg'||amt<=0)return;x.bhp-=amt;bump();
  if(x.bhp<=0){const f0=x.f;x.t='rubble';x.f=0;x.bhp=0;FXH.collapse(r,c,f0);sfx('boom');L(`${x.obj!=null?G.objs[x.obj].name+' ':''}건물 붕괴`);
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
function moveUnit(u,r,c){u.r=r;u.c=c;u.moved=true;bump();afterMove(u);}
function targetsOf(u,moved){const out=[];if(!UT[u.type].rng[1])return out;const vs=G.fog?visSet(u.nat):null;
  for(const e of G.units){if(e.nat===u.nat)continue;if(vs&&!seen(e,u.nat,vs))continue;if(canHit(u,e,null,null,moved))out.push(key(e.r,e.c));}
  if(UT[u.type].ex){const R2=UT[u.type].rng[1];for(let r=Math.max(0,u.r-R2);r<=Math.min(N-1,u.r+R2);r++)for(let c=Math.max(0,u.c-R2);c<=Math.min(N-1,u.c+R2);c++){const k=key(r,c);if(out.includes(k))continue;
    const o=unitAt(r,c);if(o&&o.nat===u.nat)continue;if(canHitTile(u,r,c,null,null,moved))out.push(k);}}
  return out;}
/* ---------- 증원·화력 지원 ---------- */
function deploySpots(n,type){const out=[];const O=occ();
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=G.map[r][c];if(O.has(key(r,c)))continue;if(mcost(type,x)===Infinity)continue;
    let ok=inZone(n,r,c);if(!ok)for(const o of G.objs){const y=G.map[o.r][o.c];if(y.owner===n&&dist(o.r,o.c,r,c)<=1&&!G.units.some(e=>e.nat!==n&&dist(e.r,e.c,o.r,o.c)<=2)){ok=true;break;}}
    if(ok)out.push(key(r,c));}return out;}
let UID=1;
function mkUnit(n,type,r,c){const u={id:UID++,nat:n,type,r,c,hp:UT[type].hpMax||10,done:false,moved:false,supp:0,ow:false,kills:0,rank:0,face:n===1?180:n===2?90:n===3?270:0};G.units.push(u);bump();return u;}
function buy(n,type,r,c){const N2=G.nats[n];const t=UT[type];if(N2.cp<t.cost)return null;if(!deploySpots(n,type).includes(key(r,c)))return null;
  N2.cp-=t.cost;const u=mkUnit(n,type,r,c);u.done=true;N2.bought=(N2.bought||0)+1;L(`${natName(n)} ${t.n} 증원`);sfx('build');return u;}
function supArea(r,c,rad){const o=[];for(let a=r-rad;a<=r+rad;a++)for(let b=c-rad;b<=c+rad;b++)if(inb(a,b))o.push([a,b]);return o;}
function canSupport(n,kind,r,c){const N2=G.nats[n];if(N2.cp<SUP[kind].cost||N2.used===G.turn)return false;if(kind==='air'&&WX[G.wx].noAir)return false;return kind==='smoke'||visSet(n).has(key(r,c));}
function support(n,kind,r,c){if(!canSupport(n,kind,r,c))return false;const N2=G.nats[n];N2.cp-=SUP[kind].cost;N2.used=G.turn;FXH.strike(kind,r,c);
  if(kind==='smoke'){for(const [a,b] of supArea(r,c,1))G.map[a][b].smoke=3;sfx('launch');L(`${natName(n)} 연막 차장`);bump();return true;}
  sfx('arty');L(`${natName(n)} ${SUP[kind].n}`);
  for(const [a,b] of supArea(r,c,SUP[kind].rad)){const ctr=a===r&&b===c;const x=G.map[a][b];
    const u=unitAt(a,b);if(u){const cov=UT[u.type].fly?0:TT[x.t].cov*.5;const base=kind==='air'?9:(ctr?6:4);const d=Math.max(1,Math.round(base*(1-cov)*(.85+Math.random()*.3)));u.hp-=d;u.supp=2;if(u.hp<=0)kill(u,null);}
    if(x.t==='bldg')damageBldg(a,b,kind==='air'?24:(ctr?9:6));}
  bump();return true;}
