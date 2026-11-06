/* ===================== COMBAT / ACTIONS ===================== */
function calcDmg(a,d,rand){const b=dmgBase(a.type,d.type);if(!b)return 0;let v=b*(a.hp/10);
  if(UT[d.type].d==='land'){const x=cell(d.r,d.c);const fd=x.fort&&x.fort.o===d.nat?(x.fort.t==='bunker'?2:x.fort.t==='fence'?1:0):0;v*=1-0.08*(TR[x.t].def+(x.bld?1:0)+(d.dug?1:0)+fd);if(x.t==='city'||x.t==='hq'||x.t==='urban'){if(UT[d.type].cls==='inf')v*=x.ruin>=2?0.72:0.8;if(UT[a.type].cls==='armor'&&dist(a.r,a.c,d.r,d.c)===1)v*=0.85;}
    if((a.type==='at'||a.type==='spec')&&UT[d.type].cls==='armor'&&['urban','city','hq'].includes(cell(a.r,a.c).t))v*=1.25;}
  v*=1+0.1*(a.rank||0);if(UT[d.type].cls==='armor'&&hasTech(d.nat,'armor'))v*=0.8;
  if(!UT[a.type].ind&&dist(a.r,a.c,d.r,d.c)===1){let fl=0;for(const v2 of G.units){if(v2!==a&&v2.nat===a.nat&&UT[v2.type].atk&&dist(v2.r,v2.c,d.r,d.c)===1)fl++;}v*=1+0.1*Math.min(3,fl);}
  if(a.supNow)v*=0.7;
  if(hasStaff(a.nat,'g3'))v*=1.15;if(UT[a.type].d==='air'&&hasStaff(a.nat,'air'))v*=1.1;
  if(rand)v*=0.85+Math.random()*0.3;return Math.max(0,Math.round(v));}
function canHit(a,d,ar,ac){if(!hasAmmo(a)||!dmgBase(a.type,d.type))return false;const [lo,hi]=rngU(a);const dd=dist(ar??a.r,ac??a.c,d.r,d.c);return dd>=lo&&dd<=hi;}
function targetsOf(u,vs){if(UT[u.type].ind&&u.moved)return [];if(UT[u.type].d==='air'&&G.wx==='storm')return [];
  return G.units.filter(e=>hostile(u.nat,e.nat)&&canHit(u,e)&&(!vs||seen(e,u.nat,vs))).map(e=>key(e.r,e.c));}
function pop(r,c,t){if(typeof document==='undefined')return;const [x,y]=px(r,c);const g=$('#g-pops');if(!g)return;const el=document.createElementNS('http://www.w3.org/2000/svg','text');
  el.setAttribute('x',x+6);el.setAttribute('y',y-8);el.setAttribute('class','pop');el.textContent=t;g.appendChild(el);setTimeout(()=>el.remove(),1000);}
const removeUnit=u=>{G.units=G.units.filter(x=>x!==u);};
function attack(a,d){if(!G.units.includes(a)||!G.units.includes(d))return;{const [x1,y1]=px(a.r,a.c),[x2,y2]=px(d.r,d.c);if(UT[a.type].d!=='sea'||a.type!=='lst')a.face=Math.atan2(y2-y1,x2-x1)*180/Math.PI;}fxFire(a,d);const dmg=calcDmg(a,d,true);if(!UT[a.type].ua)a.ammo--;d.hp-=dmg;pop(d.r,d.c,'−'+dmg);
  let m=`${natName(a.nat)} ${UT[a.type].n} → ${natName(d.nat)} ${UT[d.type].n} −${dmg}`;
  const promo=x=>{if((x.rank||0)<3){x.rank=(x.rank||0)+1;m+=` · ${UT[x.type].n} 진급(${'★'.repeat(x.rank)})`;}};
  if(UT[a.type].splash){let sh=0;for(const [x,y] of nbrs(d.r,d.c)){const v=unitAt(x,y);if(!v||v===d||!hostile(a.nat,v.nat)||!dmgBase(a.type,v.type))continue;const sd=Math.max(1,Math.round(calcDmg(a,v,false)*0.3));v.hp-=sd;pop(x,y,'−'+sd);sh++;if(v.hp<=0){removeUnit(v);G.nats[a.nat].kills=(G.nats[a.nat].kills||0)+1;}}if(sh)m+=` · 주변 ${sh}기 피해`;}
  if((UT[a.type].ind||a.type==='bmb'||a.type==='bb'))damageCity(d.r,d.c,0.5);else if(['armor','ship'].includes(UT[a.type].cls))damageCity(d.r,d.c,0.15);
  if(d.hp>0&&(UT[a.type].ind||a.type==='bmb'||a.type==='bb')&&UT[d.type].d!=='air'){d.sup=true;m+=' · 제압';}
  if(d.hp<=0){fxKill(d);removeUnit(d);m+=' 격파'+(d.cargo?'(탑재 손실)':'');promo(a);G.nats[a.nat].kills=(G.nats[a.nat].kills||0)+1;}
  else if(!UT[d.type].ind&&canHit(d,a)){const cd=calcDmg(d,a,true);if(!UT[d.type].ua)d.ammo--;if(cd>0){a.hp-=cd;pop(a.r,a.c,'−'+cd);m+=` / 반격 −${cd}`;if(a.hp<=0){fxKill(a);removeUnit(a);m+=' 격파';promo(d);G.nats[d.nat].kills=(G.nats[d.nat].kills||0)+1;}}}
  a.done=true;L(m);if(G.hint&&G.hint.u===a.id)G.hint=null;}
const warship=t=>UT[t].d==='sea'&&!!UT[t].atk;
function blockaded(r,c){const x=cell(r,c);if(x.owner==null||x.t==='sea')return false;let h=false,f=false;
  for(const [a,b] of nbrs(r,c)){if(cell(a,b).t!=='sea')continue;const u=unitAt(a,b);if(!u||!warship(u.type))continue;if(u.nat===x.owner)f=true;else if(hostile(u.nat,x.owner))h=true;}return h&&!f;}
function capturable(u){const x=cell(u.r,u.c);if(x.owner===u.nat||!openTo(u.nat,x.owner))return false;return (!!UT[u.type].cap&&(SITES.includes(x.t)||!!x.bld))||(!!x.rig&&warship(u.type));}
function capture(u){if(!G.units.includes(u))return;const x=cell(u.r,u.c);const prev=x.owner;if(prev!=null&&x.dev)x.dev--;x.owner=u.nat;u.done=true;terrDirty();
  if(x.bld&&x.bld.type==='airfield'){cell(kr(x.bld.rw),kc(x.bld.rw)).owner=u.nat;const H=hangar(key(u.r,u.c));if(H.length){L(`${natName(u.nat)}, 비행장 격납 항공기 ${H.length}대 노획·파괴`);G.nats[u.nat].kills=(G.nats[u.nat].kills||0)+H.length;H.length=0;}}if(prev!=null&&x.t!=='hq'&&x.t!=='sea'){x.occ=5;x.prev=prev;}else{x.occ=0;}
  const what=x.rig?'해상 유전':x.bld?BT[x.bld.type].n:TR[x.t].n;L(`${natName(u.nat)} ${what} 점령${prev!=null?` (${natName(prev)}에게서)`:''}`);
  if(x.t==='hq'&&prev!=null)eliminate(prev,u.nat);}
function eliminate(n,by){const N=G.nats[n];N.alive=false;N.staff=[];for(const id in (G.hangar||{}))G.hangar[id]=G.hangar[id].filter(u=>u.nat!==n);
  for(const row of G.map)for(const x of row){if(x.owner===n){x.owner=by;if(SITES.includes(x.t)){x.occ=5;x.prev=null;}}if(x.fort&&x.fort.o===n)x.fort.o=by;}terrDirty();
  G.units=G.units.filter(u=>u.nat!==n);L(`★ ${NATS[n].full} 수도 함락 — ${NATS[by].full}에 병합`);checkOver();}
function score(n){let sc=0;for(const row of G.map)for(const x of row){if(x.owner!==n)continue;if(x.t==='hq')sc+=30+5*(x.dev||0);else if(x.t==='city')sc+=10+5*(x.dev||0);else if(x.t==='oil'||x.t==='mine'||x.rig)sc+=5;}
  sc+=(G.nats[n].kills||0)*2;for(const u of G.units)if(u.nat===n)sc+=Math.round(UT[u.type].cost[0]*u.hp/10);for(const id in (G.hangar||{}))for(const u of G.hangar[id])if(u.nat===n)sc+=UT[u.type].cost[0];return sc;}
function snapHist(){G.hist=G.hist||[];G.hist.push({t:G.turn,s:G.nats.map(N=>N.alive?score(N.id):null)});}
function checkOver(){const alive=G.nats.filter(N=>N.alive);const humans=alive.filter(N=>N.ctrl==='human');
  if(G.vic&&G.turn>G.vic&&alive.length>1){let best=null,bs=-1;for(const N of alive){const v=score(N.id);if(v>bs){bs=v;best=N.id;}}G.over={win:best,score:true};return;}
  if(alive.length===1)G.over={win:alive[0].id};else if(!humans.length&&!G.spectate)G.over={win:null};}
function unloadSpots(l){if(!UT[l.type].carry||!l.cargo)return [];return nbrs(l.r,l.c).filter(([a,b])=>!unitAt(a,b)&&mcost(l.cargo.type,cell(a,b).t)<Infinity).map(([a,b])=>key(a,b));}
function load(u,l){removeUnit(u);u.done=true;l.cargo=u;L(`${natName(u.nat)} ${UT[u.type].n} 상륙함 탑승`);}
function unload(l,r,c){if(G.scn)G.scn.landed=true;const u=l.cargo;l.cargo=null;u.r=r;u.c=c;u.done=!hasTech(l.nat,'amphib');u.dug=false;G.units.push(u);l.done=true;L(`${natName(l.nat)} ${UT[u.type].n} 상륙`);if(capturable(u))capture(u);}
function adReact(u){const tag=G.turn*10+G.cur;
  for(const e of [...G.units]){if(!G.units.includes(u))return;if(!UT[e.type].ad||!hostile(e.nat,u.nat)||!hasAmmo(e)||e.rx===tag)continue;
    const [,hi]=rngU(e);const dd=dist(e.r,e.c,u.r,u.c);if(dd>hi)continue;const st=UT[u.type].stealth;if(st&&dd>st)continue;if(!dmgBase(e.type,u.type))continue;
    e.rx=tag;if(!UT[e.type].ua)e.ammo--;G.reacted=true;sfx('flak');fxFire(e,u);const d=Math.max(1,Math.round(calcDmg(e,u,true)*0.6));u.hp-=d;pop(u.r,u.c,'−'+d);
    let m=`${natName(e.nat)} ${UT[e.type].n} 대공 사격 → ${natName(u.nat)} ${UT[u.type].n} −${d}`;
    if(u.hp<=0){fxKill(u);removeUnit(u);m+=' 격추'+(u.cargo?'(탑승 부대 손실)':'');G.nats[e.nat].kills=(G.nats[e.nat].kills||0)+1;}L(m);}}
function moveUnit(u,r,c,cost){{const [x1,y1]=px(u.r,u.c),[x2,y2]=px(r,c);if(x1!==x2||y1!==y2)u.face=Math.atan2(y2-y1,x2-x1)*180/Math.PI;}u.r=r;u.c=c;u.moved=true;u.dug=false;{const x=G.map[r][c];if(x.t==='urban'&&UT[u.type].d==='land'&&x.owner!==u.nat&&openTo(u.nat,x.owner)){x.owner=u.nat;terrDirty();}}if(UT[u.type].fuel)u.fuel=Math.max(0,u.fuel-cost);
  const x=cell(r,c);if(x.fort&&UT[u.type].d==='land'&&hostile(u.nat,x.fort.o)){const f=x.fort;x.fort=null;terrDirty();
    if(f.t==='mines'&&UT[u.type].mineproof){L(`${natName(u.nat)} 공병, ${natName(f.o)} 지뢰지대 제거`);}
    else if(f.t==='mines'){u.hp-=3;pop(r,c,'−3');L(`${natName(u.nat)} ${UT[u.type].n} 지뢰 피해 −3${u.hp<=0?' 격파':''}`);if(u.hp<=0)removeUnit(u);}
    else L(`${natName(u.nat)} ${UT[u.type].n}, ${natName(f.o)} ${FORT[f.t].n} ${f.t==='fence'?'절단':'파괴'}`);}
  if(UT[u.type].d==='air'&&G.units.includes(u))adReact(u);}
function mkUnit(type,n,r,c,done){const t=UT[type];const u={id:G.nid++,type,nat:n,r,c,hp:10,fuel:t.fuel,ammo:t.ammo,done,moved:false,cargo:null};G.units.push(u);return u;}
