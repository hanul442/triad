/* ===================== ECONOMY ===================== */
const MSL={c:{n:'순항미사일',cost:[4,2,3],rng:8,dmg:7,desc:'사거리 8 · 단일 목표 정밀타격 · 대공포·SAM·구축함에 요격될 수 있음'},b:{n:'탄도미사일',cost:[8,6,6],rng:14,dmg:5,desc:'사거리 14 · 목표 칸과 주변 6칸 광역피해 · 시설 파괴 · 미사일 방어망만 요격'}};
const MSL_CAP=6, ICPT={aa:0.3,sam:0.6,lrsam:0.6,cg:0.6,ff:0.35,dd:0.4,bb:0.3,pb:0.1,cv:0.2};
const TELR={c:7,b:11};
const FORT={fence:{n:'철책',cost:[3,0,0],desc:'적 지상 부대는 진입하면 멈춤 · 아군 방어 ★+1 · 적이 올라서면 절단'},bunker:{n:'벙커',cost:[5,2,0],desc:'아군 방어 ★+2 · 적이 올라서면 파괴'},mines:{n:'지뢰지대',cost:[3,1,0],desc:'적에게 안 보임 · 진입한 적 지상 부대 체력 −3, 정지'}};
const fortCap=n=>(hasStaff(n,'eng')?5:3)+G.units.filter(u=>u.nat===n&&u.type==='eng').length;
function fortStop(u,x){return UT[u.type].d==='land'&&!UT[u.type].infil&&x.fort&&hostile(u.nat,x.fort.o)&&x.fort.t!=='bunker';}
function fortable(n,r,c){const x=cell(r,c);if(x.t==='sea'||SITES.includes(x.t)||x.bld||x.fort)return false;const u=unitAt(r,c);if(u&&u.nat!==n)return false;
  const T=terr();if(T[r][c]===n)return true;return nbrs(r,c).some(([a,b])=>{const v=unitAt(a,b);return v&&v.nat===n&&UT[v.type].d==='land';})||(u&&UT[u.type].d==='land');}
function fortify(n,t,r,c){const N=G.nats[n];if((N.fb||0)>=fortCap(n)||!fortable(n,r,c)||!canPay(n,FORT[t].cost))return false;pay(n,FORT[t].cost);N.fb=(N.fb||0)+1;cell(r,c).fort={t,o:n};L(`${natName(n)} ${FORT[t].n} 설치`);G._terr=null;return true;}
function terr(){if(G._terr&&G._terrT===G.turn+'/'+G.cur+'/'+G._terrV)return G._terr;const src=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const x=G.map[r][c];if(x.owner==null)continue;if(SITES.includes(x.t)||x.bld)src.push([r,c,x.owner,x.t==='hq'?4:x.t==='city'?3:2]);}
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const x=G.map[r][c];if(x.fort)src.push([r,c,x.fort.o,1]);}
  const T=[],BD=[],TI=[];for(let r=0;r<ROWS;r++){T[r]=new Array(COLS).fill(null);BD[r]=new Array(COLS).fill(99);TI[r]=new Array(COLS).fill(false);}
  for(const [a,b,o,rad] of src)for(let r=Math.max(0,a-rad);r<=Math.min(ROWS-1,a+rad);r++)for(let c=Math.max(0,b-rad-1);c<=Math.min(COLS-1,b+rad+1);c++){
    if(G.map[r][c].t==='sea')continue;const d=dist(r,c,a,b);if(d>rad)continue;const sc=d-rad*0.01;
    if(sc<BD[r][c]-1e-9){BD[r][c]=sc;T[r][c]=o;TI[r][c]=false;}else if(Math.abs(sc-BD[r][c])<1e-9&&o!==T[r][c])TI[r][c]=true;}
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(TI[r][c])T[r][c]=null;
  G._terr=T;G._terrV=(G._terrV||0);G._terrT=G.turn+'/'+G.cur+'/'+G._terrV;return T;}
const terrDirty=()=>{G._terr=null;G._terrV=(G._terrV||0)+1;};
function leader(){let best=null,bp=0,tot=0;for(const N of G.nats){if(!N.alive)continue;const p=power(N.id);tot+=p;if(p>bp){bp=p;best=N.id;}}return {id:best,share:tot?bp/tot:0};}
function silos(n){const L=[];for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const x=G.map[r][c];if(x.owner===n&&x.bld&&x.bld.type==='silo'&&!x.bld.left)L.push([r,c]);}return L;}
const stock=n=>{const N=G.nats[n];N.msl=N.msl||{c:0,b:0};return N.msl;};
function launchers(n){const L=silos(n).map(([r,c])=>({r,c,c_:MSL.c.rng,b_:MSL.b.rng}));for(const u of G.units)if(u.nat===n&&u.type==='tel')L.push({r:u.r,c:u.c,c_:TELR.c,b_:TELR.b});return L;}
function canLaunch(n,k){return stock(n)[k]>0&&(G.nats[n].fired||0)<launchers(n).length;}
function inMslRange(n,k,r,c){return launchers(n).some(l=>dist(l.r,l.c,r,c)<=l[k+'_']);}
function mslTargets(n,k,vs){const out=[];const S=launchers(n);const inR=(r,c)=>S.some(l=>dist(l.r,l.c,r,c)<=l[k+'_']);
  if(k==='c'){for(const e of G.units)if(hostile(n,e.nat)&&(!vs||seen(e,n,vs))&&inR(e.r,e.c))out.push(key(e.r,e.c));}
  else for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){if(vs&&!vs.has(key(r,c)))continue;if(!inR(r,c))continue;const x=G.map[r][c];const u=unitAt(r,c);
    if((u&&hostile(n,u.nat))||(x.bld&&hostile(n,x.owner)))out.push(key(r,c));}
  return out;}
function mprod(n,k,r,c){const x=cell(r,c);if(x.used||stock(n)[k]>=MSL_CAP||!canPay(n,MSL[k].cost)||(k==='b'&&!hasTech(n,'rocketry')))return false;pay(n,MSL[k].cost);stock(n)[k]++;x.used=true;L(`${natName(n)} ${MSL[k].n} 생산`);return true;}
function mslAnim(from,to,ok){if(typeof document==='undefined')return;sfx('launch');setTimeout(()=>sfx(ok?'boom':'flak'),700);const g=$('#g-pops');if(!g)return;const [x1,y1]=px(...from),[x2,y2]=px(...to);
  const mx=(x1+x2)/2,my=Math.min(y1,y2)-Math.max(40,dist(...from,...to)*12);const ns='http://www.w3.org/2000/svg';
  const p=document.createElementNS(ns,'path');p.setAttribute('d',`M${x1} ${y1}Q${mx} ${my} ${x2} ${y2}`);p.setAttribute('pathLength','100');p.setAttribute('class','msl');g.appendChild(p);
  const b=document.createElementNS(ns,'circle');b.setAttribute('cx',x2);b.setAttribute('cy',y2);b.setAttribute('r','4');b.setAttribute('class',ok?'boom':'boom icpt');g.appendChild(b);
  setTimeout(()=>{p.remove();b.remove();},1700);}
function launch(n,k,r,c){if(!canLaunch(n,k))return false;const N=G.nats[n];stock(n)[k]--;N.fired=(N.fired||0)+1;
  const lf=launchers(n).filter(l=>dist(l.r,l.c,r,c)<=l[k+'_']).sort((a,b)=>dist(a.r,a.c,r,c)-dist(b.r,b.c,r,c))[0];if(!lf)return false;const from=[lf.r,lf.c];const x=cell(r,c);const tgt=unitAt(r,c);
  if(k==='c'){if(!tgt){mslAnim(from,[r,c],true);return true;}
    for(const e of G.units){const p=ICPT[e.type];if(!p||e.nat!==tgt.nat||dist(e.r,e.c,r,c)>2||!hasAmmo(e))continue;
      if(Math.random()<p){mslAnim(from,[r,c],false);pop(r,c,'요격');L(`${natName(n)} ${MSL.c.n} → ${natName(e.nat)} ${UT[e.type].n}에 요격됨`);return true;}}
    mslAnim(from,[r,c],true);const def=UT[tgt.type].d==='land'?TR[x.t].def+(x.bld?1:0)+(tgt.dug?1:0):0;
    const d=Math.max(1,Math.round(MSL.c.dmg*(1-0.08*def)*(0.85+Math.random()*0.3)));tgt.hp-=d;pop(r,c,'−'+d);
    let m=`${natName(n)} ${MSL.c.n} → ${natName(tgt.nat)} ${UT[tgt.type].n} −${d}`;if(tgt.hp<=0){fxKill(tgt);removeUnit(tgt);m+=' 격파';G.nats[n].kills=(G.nats[n].kills||0)+1;}L(m);}
  else{const dn=tgt?tgt.nat:x.owner;
    for(const e of G.units){if(!UT[e.type].abm||!hostile(n,e.nat)||!hasAmmo(e)||dist(e.r,e.c,r,c)>4)continue;if(Math.random()<0.45){e.ammo--;mslAnim(from,[r,c],false);pop(r,c,'요격');L(`${natName(n)} ${MSL.b.n} → ${natName(e.nat)} ${UT[e.type].n}에 요격됨`);return true;}}
    if(dn!=null&&hasTech(dn,'abm')&&Math.random()<0.5){mslAnim(from,[r,c],false);pop(r,c,'요격');L(`${natName(n)} ${MSL.b.n} → ${natName(dn)} 미사일 방어망에 요격됨`);return true;}
    mslAnim(from,[r,c],true);let hits=0,kills=0;
    for(const [a,b] of [[r,c],...nbrs(r,c)]){const u=unitAt(a,b);if(!u)continue;const y=cell(a,b);const def=UT[u.type].d==='land'?TR[y.t].def+(y.bld?1:0)+(u.dug?1:0):0;
      const d=Math.max(1,Math.round((a===r&&b===c?MSL.b.dmg:3)*(1-0.08*def)*(0.85+Math.random()*0.3)));u.hp-=d;pop(a,b,'−'+d);hits++;if(u.hp<=0){fxKill(u);removeUnit(u);kills++;}}
    let m=`${natName(n)} ${MSL.b.n} 착탄 — 부대 ${hits}기 피해${kills?`, ${kills}기 격파`:''}`;
    const bk=baseKeyOf(r,c);
    if(bk!=null){const y=cell(kr(bk),kc(bk));y.bld.left=Math.max(y.bld.left,2);const H=hangar(bk);m+=`, ${natName(y.owner)} 활주로 피격 (2턴 복구)`;
      if(H.length){const v=H.splice(Math.floor(Math.random()*H.length),1)[0];m+=`, 격납 중 ${UT[v.type].n} 파괴`;G.nats[n].kills=(G.nats[n].kills||0)+1;}}
    else if(x.bld){m+=`, ${natName(x.owner)} ${BT[x.bld.type].n} 파괴`;x.bld=null;if(x.t==='plain'||x.t==='forest')x.owner=null;}if(x.fort){m+=`, ${FORT[x.fort.t].n} 파괴`;x.fort=null;}terrDirty();L(m);}
  checkOver();return true;}
function producer(x){if(x.t==='hq')return 'hq';if(x.bld&&!x.bld.left)return x.bld.type;return null;}
const BASE_CAP=2,HANGAR_CAP=4;
function rwyFor(n,r,c){const cand=nbrs(r,c).filter(([a,b])=>{const y=cell(a,b);return ['plain','forest'].includes(y.t)&&!y.bld&&y.rwy==null&&!unitAt(a,b)&&(y.owner==null||y.owner===n);});
  cand.sort((p,q)=>Math.abs(p[0]-r)-Math.abs(q[0]-r));return cand.length?key(...cand[0]):null;}
function baseKeyOf(r,c){const x=cell(r,c);if(x.bld&&x.bld.type==='airfield')return key(r,c);if(x.rwy!=null){const y=cell(kr(x.rwy),kc(x.rwy));if(y.bld&&y.bld.type==='airfield')return x.rwy;}return null;}
function baseCells(k){const x=cell(kr(k),kc(k));return [[kr(k),kc(k)],[kr(x.bld.rw),kc(x.bld.rw)]];}
function baseHangars(k){const x=cell(kr(k),kc(k));const H=new Set();for(const [a,b] of baseCells(k))for(const [p,q] of nbrs(a,b)){const y=cell(p,q);if(y.owner===x.owner&&y.bld&&y.bld.type==='hangar'&&!y.bld.left)H.add(key(p,q));}return H.size;}
function baseCap(k){const x=cell(kr(k),kc(k));if(!x.bld||x.bld.type!=='airfield'||x.bld.left)return 0;return BASE_CAP+HANGAR_CAP*baseHangars(k);}
function hangar(k){G.hangar=G.hangar||{};return G.hangar[k]||(G.hangar[k]=[]);}
function storeAir(u,k){const H=hangar(k);if(UT[u.type].d!=='air'||H.length>=baseCap(k)||cell(kr(k),kc(k)).owner!==u.nat)return false;removeUnit(u);u.done=true;u.r=kr(k);u.c=kc(k);H.push(u);L(`${natName(u.nat)} ${UT[u.type].n} 격납 (${H.length}/${baseCap(k)})`);return true;}
function sortieSpots(k){const out=[];for(const [a,b] of [...baseCells(k),...baseCells(k).flatMap(([a,b])=>nbrs(a,b))])if(!unitAt(a,b)&&!out.some(o=>o[0]===a&&o[1]===b))out.push([a,b]);return out;}
function sortie(n,k,id){const H=hangar(k);const i=H.findIndex(u=>u.id===id);if(i<0||H[i].done||baseCap(k)===0)return null;const sp=sortieSpots(k)[0];if(!sp)return null;
  const u=H.splice(i,1)[0];u.r=sp[0];u.c=sp[1];u.moved=false;G.units.push(u);L(`${natName(n)} ${UT[u.type].n} 출격`);return u;}
function nearBld(n,r,c,type){return nbrs(r,c).some(([a,b])=>{const y=cell(a,b);return y.owner===n&&y.bld&&y.bld.type===type&&!y.bld.left;});}
const HEAVYN={arsenal:'병기창',shipyard:'조선소'};
function prodOk(n,t,r,c){return reqOk(n,t)&&(!UT[t].heavy||nearBld(n,r,c,UT[t].heavy));}
function canSpawn(n,t,r,c){if(UT[t].d==='air'){const k=baseKeyOf(r,c);if(k!=null&&k===key(r,c)&&hangar(k).length<baseCap(k))return true;}return !!spawnSpot(t,r,c);}
function siteOk(n,t,r,c){if(!buildable(n,r,c))return false;if(BT[t].coast&&!coastal(r,c))return false;if(t==='airfield'&&rwyFor(n,r,c)==null)return false;
  if(t==='shipyard'&&!nearBld(n,r,c,'port'))return false;if(t==='arsenal'&&!nearBld(n,r,c,'factory'))return false;
  if(t==='hangar'&&!nbrs(r,c).some(([a,b])=>{const k=baseKeyOf(a,b);return k!=null&&cell(kr(k),kc(k)).owner===n;}))return false;return true;}
function spawnSpot(type,r,c){if(UT[type].d==='sea'){for(const [a,b] of nbrs(r,c))if(cell(a,b).t==='sea'&&!unitAt(a,b))return [a,b];return null;}return unitAt(r,c)?null:[r,c];}
function armyCap(n){let k=0,dv=0;for(const row of G.map)for(const x of row)if(x.owner===n&&(x.t==='city'||x.t==='hq')){k++;dv+=x.dev||0;}return 6+3*k+2*dv+(hasTech(n,'mobil')?8:0);}
function armySize(n){let k=0;for(const u of G.units)if(u.nat===n)k+=u.cargo?2:1;for(const id in (G.hangar||{}))for(const u of G.hangar[id])if(u.nat===n)k++;return k;}
function produce(n,type,r,c){if(!prodOk(n,type,r,c))return false;const x=cell(r,c);
  if(UT[type].d==='air'&&x.bld&&x.bld.type==='airfield'){const k=key(r,c);if(hangar(k).length<baseCap(k)){if(x.used||!canPay(n,uCost(n,type))||armySize(n)>=armyCap(n))return false;
    pay(n,uCost(n,type));x.used=true;const u=mkUnit(type,n,r,c,true);removeUnit(u);hangar(k).push(u);L(`${natName(n)} ${UT[type].n} 생산 (격납고 ${hangar(k).length}/${baseCap(k)})`);return true;}}const sp=spawnSpot(type,r,c);if(UT[type].d==='sea'&&blockaded(r,c))return false;if(!sp||x.used||!canPay(n,uCost(n,type))||armySize(n)>=armyCap(n))return false;
  pay(n,uCost(n,type));x.used=true;mkUnit(type,n,sp[0],sp[1],true);L(`${natName(n)} ${UT[type].n} 생산`);return true;}
function coastal(r,c){return nbrs(r,c).some(([a,b])=>cell(a,b).t==='sea');}
function buildable(n,r,c){const x=cell(r,c);if(!['plain','forest'].includes(x.t)||x.bld||x.rwy!=null||unitAt(r,c))return false;if(x.owner!=null&&x.owner!==n)return false;
  for(let a=Math.max(0,r-2);a<=Math.min(ROWS-1,r+2);a++)for(let b=Math.max(0,c-3);b<=Math.min(COLS-1,c+3);b++){const y=G.map[a][b];if(y.owner===n&&(y.t==='city'||y.t==='hq')&&dist(a,b,r,c)<=2)return true;}return false;}
function construct(n,type,r,c){const cost=bCost(n,type);if(!canPay(n,cost)||!siteOk(n,type,r,c))return false;let rw=null;if(type==='airfield'){rw=rwyFor(n,r,c);const y=cell(kr(rw),kc(rw));y.owner=n;y.rwy=key(r,c);}
  pay(n,cost);const x=cell(r,c);x.owner=n;x.bld={type,left:Math.max(1,BT[type].t-(hasStaff(n,'eng')?1:0))};if(rw!=null)x.bld.rw=rw;x.used=true;terrDirty();L(`${natName(n)} ${BT[type].n} 착공`);return true;}
const devCost=l=>[6+6*l,4+3*l,0];
function develop(n,r,c){const x=cell(r,c);if(x.owner!==n||!(x.t==='city'||x.t==='hq'))return false;const l=x.dev||0;if(l>=3||x.devT===G.turn||!canPay(n,devCost(l)))return false;pay(n,devCost(l));x.dev=l+1;x.devT=G.turn;L(`${natName(n)} ${names().city[key(r,c)]||'도시'} 개발 Lv${x.dev}`);return true;}
function income(n){let f=0,s=0,o=0;const fin=hasStaff(n,'fin')?1.25:1;
  for(let rr=0;rr<ROWS;rr++)for(let cc=0;cc<COLS;cc++){const x=G.map[rr][cc];if(x.owner!==n)continue;const k=x.occ>0?0.5:1;if(x.rig){o+=Math.floor(4*k);continue;}const bl=(x.t==='city'||x.t==='hq')&&blockaded(rr,cc);if(x.t==='hq'){f+=(bl?3:6)+2*(x.dev||0);s+=3;o+=2;}else if(x.t==='city'){f+=bl?0:(3*fin+2*(x.dev||0))*k;s+=k;}else if(x.t==='oil')o+=Math.floor(3*k);else if(x.t==='mine')s+=Math.floor(4*k);}
  f=Math.floor(f)-G.nats[n].staff.length;return [f,s,o];}
function startResearch(n,k){const N=G.nats[n];if(N.res||hasTech(n,k)||!canPay(n,TECH[k].cost))return false;pay(n,TECH[k].cost);N.res={k,left:TECH[k].t};L(`${natName(n)} ${TECH[k].n} 연구 착수`);return true;}
function sign(a,b){G.peace[pk(a,b)]=G.turn+10;L(`${natName(a)}·${natName(b)} 10턴 불가침 조약 체결`);}
function declare(a,b){if(atPeace(a,b)){G.nats[a].perfidy=G.turn+10;L(`${natName(a)}, ${natName(b)}에 선전포고 (조약 파기)`);}delete G.peace[pk(a,b)];}
function aiAccept(m,n){const M=G.nats[m],N=G.nats[n];if((N.perfidy||0)>G.turn)return false;if(((M.ask||{})[n]||0)>G.turn)return false;
  const pm=power(m),pn=power(n);let p={공세:.3,균형:.55,방어:.8}[M.pers];if(pn>pm*1.3)p+=.2;if(pn<pm*0.5)p-=.3;
  const ok=Math.random()<p;if(!ok){M.ask=M.ask||{};M.ask[n]=G.turn+3;}return ok;}
function propose(n,m){if(!hostile(n,m))return;if(G.nats[m].ctrl==='human'||aiAccept(m,n))sign(n,m);else L(`${natName(m)}, ${natName(n)}의 조약 제안 거절`);}
function hire(n,role){const N=G.nats[n];if(N.staff.length>=STAFF_SLOTS||hasStaff(n,role)||N.f<STAFF_COST)return false;N.f-=STAFF_COST;
  N.staff.push({role,name:RANKS[Math.floor(Math.random()*3)]+' '+SURN[Math.floor(Math.random()*SURN.length)]+GIVEN[Math.floor(Math.random()*GIVEN.length)]});L(`${natName(n)} ${STAFF[role].n} 임명`);return true;}

function beginTurn(){const n=G.cur,N=G.nats[n];const am=N.ctrl==='ai'?({easy:.75,normal:1,hard:1.3}[G.diff]||1):1;const inc=income(n).map(v=>v>0?Math.round(v*am):v);N.f+=inc[0];N.s+=inc[1];N.o+=inc[2];
  for(const row of G.map)for(const x of row){if(x.owner!==n)continue;x.used=false;if(x.bld&&x.bld.left>0)x.bld.left--;}
  const S=supplySources(n);const g4=(hasStaff(n,'g4')?0.6:1)*(hasTech(n,'logistics')?0.7:1);let unsup=0,short=0,crashed=0,isol=0;
  for(const u of [...G.units]){if(u.nat!==n)continue;const t=UT[u.type];u.dug=t.d==='land'&&u.type!=='truck'&&!u.moved;u.supNow=!!u.sup;u.sup=false;u.done=false;u.moved=false;const ok=inSupply(u,S);if(ok)u.oos=0;
    if(ok){if(t.fuel&&u.fuel<t.fuel){const need=Math.ceil((t.fuel-u.fuel)/10*g4);if(N.o>=need){N.o-=need;u.fuel=t.fuel;}else short++;}
      if(t.ammo&&u.ammo<t.ammo){const need=Math.ceil((t.ammo-u.ammo)/3*g4);if(N.s>=need){N.s-=need;u.ammo=t.ammo;}else short++;}
      const x=cell(u.r,u.c);const rep=(t.d==='land'&&x.owner===n&&(x.t==='city'||x.t==='hq'||(x.bld&&x.bld.type==='depot')))||(t.d==='air'&&((x.owner===n&&(x.t==='hq'||(x.bld&&x.bld.type==='airfield')))||G.units.some(v=>v.nat===n&&v.type==='cv'&&dist(v.r,v.c,u.r,u.c)<=1)))||(t.d==='sea'&&nbrs(u.r,u.c).some(([a,b])=>{const y=cell(a,b);return y.owner===n&&y.bld&&y.bld.type==='port';}));
      if(rep&&u.hp<10&&N.f>=1){N.f-=1;u.hp=Math.min(10,u.hp+(t.d==='sea'&&nbrs(u.r,u.c).some(([a,b])=>{const y=cell(a,b);return y.owner===n&&y.bld&&y.bld.type==='shipyard'&&!y.bld.left;})?3:2));}}
    else if(t.d==='sea'&&G.units.some(v=>v.nat===n&&v!==u&&UT[v.type].replen&&dist(v.r,v.c,u.r,u.c)<=UT[v.type].replen)){
      if(t.fuel&&u.fuel<t.fuel){const need=Math.ceil((t.fuel-u.fuel)/10*g4);if(N.o>=need){N.o-=need;u.fuel=t.fuel;}}if(t.ammo&&u.ammo<t.ammo){const need=Math.ceil((t.ammo-u.ammo)/3*g4);if(N.s>=need){N.s-=need;u.ammo=t.ammo;}}G.replen=(G.replen||0)+1;}
    else if(t.d==='air'&&G.units.some(v=>v.nat===n&&v!==u&&UT[v.type].tanker&&dist(v.r,v.c,u.r,u.c)<=UT[v.type].tanker)){if(t.fuel&&u.fuel<t.fuel){const need=Math.ceil((t.fuel-u.fuel)/10*g4);if(N.o>=need){N.o-=need;u.fuel=t.fuel;}}G.tankered=(G.tankered||0)+1;}
    else{unsup++;if(t.d!=='air'){u.oos=(u.oos||0)+1;if(u.oos>=2&&u.hp>1){u.hp--;isol++;}}if(t.d==='air'){u.fuel-=hasStaff(n,'air')?1:2;if(u.fuel<=0){removeUnit(u);crashed++;L(`${natName(n)} ${t.n} 연료 고갈로 추락`);}}}}
  for(const id in (G.hangar||{})){const H=G.hangar[id];for(const u of H){if(u.nat!==n)continue;u.done=false;u.moved=false;const t=UT[u.type];
      if(t.fuel&&u.fuel<t.fuel){const need=Math.ceil((t.fuel-u.fuel)/10*g4);if(N.o>=need){N.o-=need;u.fuel=t.fuel;}}
      if(t.ammo&&u.ammo<t.ammo){const need=Math.ceil((t.ammo-u.ammo)/3*g4);if(N.s>=need){N.s-=need;u.ammo=t.ammo;}}
      if(u.hp<10&&N.f>=1){N.f-=1;u.hp=Math.min(10,u.hp+3);}}}
  N.fb=0;G.partisan=0;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const x=G.map[r][c];if(x.owner!==n||!(x.occ>0))continue;x.occ--;
    const pv=x.prev;if(pv!=null&&x.t!=='sea'&&G.nats[pv].alive&&hostile(n,pv)&&!unitAt(r,c)&&!nbrs(r,c).some(([a,b])=>{const v=unitAt(a,b);return v&&v.nat===n;})&&Math.random()<0.15){mkUnit('inf',pv,r,c,false);G.partisan++;L(`${natName(n)} 점령지 ${TR[x.t].n}에서 ${natName(pv)} 저항군 봉기`);}}
  N.fired=0;N.tech=N.tech||[];if(N.res&&--N.res.left<=0){N.tech.push(N.res.k);L(`${natName(n)} ${TECH[N.res.k].n} 연구 완료`);G.done=N.res.k;N.res=null;}else G.done=null;
  G.event=null;if(G.turn>2&&Math.random()<0.12){const E=EVENTS[Math.floor(Math.random()*EVENTS.length)];const r=E.f(n);if(r){G.event=[E.n,r];L(`${natName(n)} 속보 · ${E.n}: ${r}`);}}
  for(const k in G.peace)if(G.peace[k]===G.turn&&k.split('-').map(Number).includes(n))L(`${k.split('-').map(x=>natName(+x)).join('·')} 불가침 조약 만료 — 교전 재개`);
  G.hint=null;G.supInfo={unsup,short,crashed,isol};if(N.ctrl==='human')G.brief=makeBrief(n,inc);}
