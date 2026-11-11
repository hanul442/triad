/* ===================== 건물 안 전투: 층마다 분대, 돌입·소탕 =====================
   - 칸+층 점유: 건물 칸 하나에 아군 보병 분대가 층마다 하나씩 함께 들 수 있다(층 수만큼, 최대 CQB.cap).
     먼저 들어온 분대가 원하는 층(보통 꼭대기)을 갖고, 나중 분대는 가장 가까운 빈 층으로 간다(flWant).
   - 같은 칸의 다른 층끼리는 바닥이 시야를 막는다(04b losPt). 같은 층(같은 방·붙은 방)에서 마주치면
     엄폐가 거의 없는 근접전이 되고 피해가 커진다.
   - 돌입·소탕(orderClear): 문 옆에 붙어 잠깐 대기 → 문 안으로 수류탄(공병·대전차팀은 폭약) → 들어가
     1층부터 한 층씩 올라가며 소탕한다. 다음 층으로 오르기 전에 위층에 수류탄을 던져 적을 누른다.
     계단을 오르는 동안은 쏘지 못하고, 머리를 내미는 순간 위층의 눌리지 않은 적이 먼저 쏜다(계단 싸움).
     칸을 정리하면 같은 건물의 다음 적 칸으로, 다 정리하면 건물을 차지하고 선다.
   - 포탄·폭탄·건물 사격은 위층·옥상에 그대로, 아래층일수록 덜 미친다(flShield). */
const CQB={autoFl:4,stallT:12,stallD:.3,cap:4,stack:1.6,bangCD:4.5,bang:2.2,charge:3.2,go:.5,roomCov:.12,nextCov:.22,roomK:1.5,pin:1.2,seek:7,maxT:150};
const canClear=u=>{const t=UT[u.type];return t.cls==='inf'&&!t.ind&&!t.fly&&!t.heli&&!t.kami&&!t.dteam&&u.type!=='sniper'&&(t.rng[1]||0)>0;};
/* 이 분대가 칸 (r,c)에 함께 들 자리가 있는가 (L: 이미 든 부대) */
function bldgRoom(u,r,c,L){const x=G.map[r][c];if(!isB(x)||UT[u.type].cls!=='inf'||UT[u.type].fly)return false;
  if(L.some(o=>o.nat!==u.nat||UT[o.type].cls!=='inf'))return false;return L.length<Math.min(CQB.cap,topFl(x)+1);}
/* 위에서 떨어지거나 위층을 겨눈 폭발이 이 부대에 미치는 비율: 맨 위 실내층·옥상은 그대로, 한 층 아래마다 0.55배 */
function flShield(u){if(UT[u.type].cls!=='inf')return 1;const x=cell(u.r,u.c);if(!isB(x))return 1;return Math.pow(.55,Math.max(0,topFl(x)-1-curFl(u)));}
/* 멈춘 분대가 갈 층: 돌입 중이면 소탕할 층, 아니면 원하는 층(u.flT, 없으면 꼭대기)에서 같은 칸 아군이 먼저 잡은 층을 피해 가장 가까운 빈 층 */
function flWant(u,x){if(u.cqb)return u.cqb.fl!=null?u.cqb.fl:Math.floor((u.fl||0)+1e-6);
  if(u.demo&&inb(u.demo.r,u.demo.c)&&cell(u.r,u.c)===G.map[u.demo.r][u.demo.c])return 0;   // 폭약은 1층 기둥에 건다(05n-demo): 설치하는 동안은 1층으로 내려온다
  const k=key(u.r,u.c),top=topFl(x);const want=u.flT==null?(u.type==='sniper'?top:Math.min(top,CQB.autoFl)):Math.min(top,u.flT);   // 따로 시키지 않으면 5층까지만 오른다(저격수는 꼭대기)
  if(u._inK!==k){u._inK=k;u._inT=G.time||0;u._flC=null;}
  const taken=new Set(),me=u._inT||0;
  for(const v of G.units){if(v===u||v.nat!==u.nat||v.r!==u.r||v.c!==u.c||UT[v.type].cls!=='inf'||v._inK!==k)continue;if(v.path&&v.path.length)continue;
    const f=v.cqb?flOf(v):v._flC;if(f==null)continue;const vt=v._inT||0;if(v.cqb||vt<me||(vt===me&&v.id<u.id))taken.add(f);}
  // 교전 중(방금 쐈다)이면 지금 층에서 계속 쏜다: 계단을 오르는 동안은 못 쏘니 싸움이 끝난 뒤 오른다(사람이 층을 시킨 때는 따른다)
  if(u.flT==null&&!u.climb&&u.fl!=null&&u.flK===k&&(G.time||0)-(u.firedT??-99)<4){const cur=Math.round(u.fl);if(Math.abs(u.fl-cur)<1e-6&&cur<=top&&!taken.has(cur)){u._flC=cur;return cur;}}
  let f=want;if(taken.has(f)){f=null;for(let d=1;d<=top;d++){if(want-d>=0&&!taken.has(want-d)){f=want-d;break;}if(want+d<=top&&!taken.has(want+d)){f=want+d;break;}}if(f==null)f=want;}
  u._flC=f;return f;}
if(typeof COVK==='object'){COVK.room=COVK.room||{n:'실내 근접',v:CQB.roomCov};COVK.stair=COVK.stair||{n:'계단',v:0};}
/* 같은 방에서 마주쳤나: 1 = 같은 칸 같은 층(옥상 포함), 2 = 같은 건물 붙은 칸 같은 실내층, 0 = 아님 */
function cqbRoom(a,d){if(UT[a.type].cls!=='inf'||UT[d.type].cls!=='inf'||a.climb||d.climb)return 0;const A=cell(a.r,a.c),D=cell(d.r,d.c);if(!isB(A)||!isB(D))return 0;
  const ea=eye(a),ed=eye(d);if(Math.abs(ea-ed)>=.6)return 0;if(a.r===d.r&&a.c===d.c)return 1;   // 같은 칸 같은 층(옥상끼리도)
  if(ea>=bldgH(A)-.05||ed>=bldgH(D)-.05)return 0;return sameBlk(A,D)&&Math.abs(a.r-d.r)+Math.abs(a.c-d.c)===1?2:0;}
/* 근접전: 방 안에서는 엄폐가 거의 없고, 계단 위의 적은 숨을 곳이 없다 */
const _cqbCov0=coverOf;
coverOf=function(d,a){if(a&&!UT[d.type].fly&&UT[d.type].cls==='inf'){if(d.climb&&d.onSt&&a.r===d.r&&a.c===d.c)return {cov:0,kind:'stair'};
    const s=cqbRoom(a,d);if(s)return {cov:s===1?CQB.roomCov:CQB.nextCov,kind:'room'};}return _cqbCov0(d,a);};
/* 같은 방이면 최소 사거리와 상관없이 쏜다(맞붙은 실내) */
const _cqbHit0=canHit;
canHit=function(a,d,fromR,fromC,moved){if(fromR==null&&!UT[a.type].ind&&(UT[a.type].rng[1]||0)>0&&(UT[a.type].atk[UT[d.type].cls]||0)>0&&cqbRoom(a,d))return true;return _cqbHit0(a,d,fromR,fromC,moved);};
const _cqbRaw0=rawDmg;
rawDmg=function(a,d,counter){const v=_cqbRaw0(a,d,counter);return v&&cqbRoom(a,d)?v*CQB.roomK:v;};   // 수류탄·근거리 사격

/* ---------- 돌입·소탕 명령 ---------- */
function orderClear(u,r,c){if(!canClear(u)||!inb(r,c)||!isB(G.map[r][c]))return false;
  u.tgt=null;u.tgtTile=null;u.dest=null;u.hold=false;u.flT=null;if(u.job&&typeof fortCancel==='function')fortCancel(u);
  u.cqb={k:key(r,c),st:'move',fl:null,t0:G.time||0,n:0};cqbPlan(u);bump();return true;}
/* 문 옆 대기 자리를 정한다: 목표 칸까지의 경로에서 그 건물로 들어가는 문 바로 앞(a) 점 */
function cqbPlan(u){const C=u.cqb;const r=kr(C.k),c=kc(C.k),X=G.map[r][c];
  if(sameBlk(cell(u.r,u.c),X)||cell(u.r,u.c)===X){C.st='entry';u.path=pathPts(u,c+.5,r+.5);return;}
  const p=pathPts(u,c+.5,r+.5);
  for(let i=1;i<p.length;i++){const q=p[i];if(q.door!=='b')continue;const t=tileAt(q[0],q[1]);if(!t||!(t===X||sameBlk(t,X)))continue;const a=p[i-1];if(a.door!=='a')break;
    C.sx=a[0];C.sz=a[1];C.dx=(a[0]+q[0])/2;C.dz=(a[1]+q[1])/2;C.er=Math.floor(q[1]);C.ec=Math.floor(q[0]);u.path=p.slice(0,i);C.st='move';
    // 같은 문에 이미 붙은 아군 분대가 있으면 문 반대편 벽에 붙는다
    if(G.units.some(o=>o!==u&&o.nat===u.nat&&o.cqb&&o.cqb.sx!=null&&Math.hypot(o.cqb.sx-a[0],o.cqb.sz-a[1])<.3)){const nx=q[0]-a[0],nz=q[1]-a[1],L=Math.hypot(nx,nz)||1;const tx=-nz/L*.32,tz=nx/L*.32;
      for(const sg of [1,-1]){const x=a[0]+tx*sg,z=a[1]+tz*sg;if(walkable(u,x,z)&&!G.units.some(o=>o!==u&&o.cqb&&o.cqb.sx!=null&&Math.hypot(o.cqb.sx-x,o.cqb.sz-z)<.25)){C.sx=x;C.sz=z;u.path=pathPts(u,x,z);break;}}}
    return;}
  // 문을 거치지 않는다(벽이 무너졌다): 바로 들어간다
  C.er=r;C.ec=c;C.st='entry';u.path=p;}
function cqbEnd(u,done,why){const C=u.cqb;if(!C)return;u.cqb=null;G.cqbWhy=G.cqbWhy||{};const w=done?'done':why||'order';G.cqbWhy[w]=(G.cqbWhy[w]||0)+1;u.flT=null;u._flC=null;if(done&&C&&(!isAI(u.nat)||!G.fog))L(`${natName(u.nat)} ${UT[u.type].n} 건물 소탕 완료`);bump();}
/* 수류탄(입구는 공병·대전차팀이면 폭약): 칸 (r,c)의 fl층 적을 누르고 다치게 한다 */
function cqbBang(a,r,c,fl,entry){const ta=UT[a.type];const ch=!!entry&&(a.type==='eng'||!!ta.ex);a.firedT=G.time||0;a.shot=G.turn;
  const amt=(ch?CQB.charge:CQB.bang)*(.8+Math.random()*.4)*((a.supp||0)>1?.6:1);let hit=0;
  for(const e of G.units.slice()){if(e.nat===a.nat||e.r!==r||e.c!==c||UT[e.type].cls!=='inf'||UT[e.type].fly||flOf(e)!==fl)continue;
    e.supp=Math.max(e.supp||0,2);harm(e,Math.round(amt*10)/10,a,{kind:'frag'});hit++;}
  if(ch)damageBldg(r,c,1);
  const C=a.cqb;const [px,pz]=entry&&C&&C.dx!=null?[C.dx,C.dz]:[c+.5,r+.5];
  if(typeof FXH.cqb==='function')FXH.cqb(a,{x:px,z:pz,fl,r,c,charge:ch,hit});
  bump();return hit;}
/* 같은 건물에서 아직 적이 든 가장 가까운 칸 */
function cqbNext(u,blk){let best=null,bd=1e9;for(const e of G.units){if(e.nat===u.nat||UT[e.type].cls!=='inf'||UT[e.type].fly)continue;const x=cell(e.r,e.c);if(!isB(x)||x.blk!==blk)continue;
  const d=Math.hypot(e.c+.5-u.x,e.r+.5-u.z);if(d<bd){bd=d;best=[e.r,e.c];}}return best;}
function cqbStep(u,t){const C=u.cqb;const r=kr(C.k),c=kc(C.k),X=G.map[r][c];
  if(!isB(X)){cqbEnd(u,0,'gone');return;}if(t-C.t0>CQB.maxT){cqbEnd(u,0,'slow');return;}                                         // 무너졌거나 너무 오래 걸린다
  if(aiRun(u.nat)&&u.hp<hpMax(u)*.3){cqbEnd(u,0,'hurt');return;}                                     // 너무 다쳤다: AI는 물러난다
  const moving=u.path&&u.path.length;
  if(C.st==='move'){if(moving)return;
    if(cell(u.r,u.c)===X||sameBlk(cell(u.r,u.c),X)){C.st='entry';return;}
    if(C.sx==null||Math.hypot(u.x-C.sx,u.z-C.sz)>.45){if(++C.n>3){cqbEnd(u,0,'nodoor');return;}cqbPlan(u);return;}
    C.st='stack';C.t=t+CQB.stack*(.8+Math.random()*.4);u.face=Math.atan2(C.dz-u.z,C.dx-u.x)*180/Math.PI;bump();return;}
  if(C.st==='stack'){if(t<C.t||u.climb)return;cqbBang(u,C.er,C.ec,0,true);C.st='entry';u.path=pathPts(u,c+.5,r+.5);bump();return;}
  if(C.st==='entry'){if(moving)return;
    if(u.r!==r||u.c!==c){if(++C.n>4){cqbEnd(u,0,'noentry');return;}u.path=pathPts(u,c+.5,r+.5);return;}
    C.st='clear';C.fl=flOf(u);bump();return;}
  // clear: 이 칸의 적을 층마다 찾아 소탕
  if(u.r!==r||u.c!==c){C.st='entry';return;}
  const foes=G.units.filter(e=>e.nat!==u.nat&&e.r===r&&e.c===c&&UT[e.type].cls==='inf'&&!UT[e.type].fly);
  if(!foes.length){const nx=cqbNext(u,X.blk);if(nx){C.k=key(nx[0],nx[1]);C.st='entry';C.fl=null;C.n=0;u.path=pathPts(u,nx[1]+.5,nx[0]+.5);return;}
    cqbEnd(u,true);return;}
  if(u.climb)return;const cf=flOf(u);
  if(foes.some(e=>flOf(e)===cf&&!e.climb)){C.fl=cf;return;}                                // 같은 방: 쏴서 정리
  const tf=foes.map(flOf).sort((a,b)=>Math.abs(a-cf)-Math.abs(b-cf))[0];const nf=cf+Math.sign(tf-cf);if(nf===cf)return;
  if((C.gT||0)<=t&&foes.some(e=>flOf(e)===nf)){cqbBang(u,r,c,nf);C.gT=t+CQB.bangCD;C.go=t+CQB.go;}   // 오르기 전에 위층에 수류탄
  if(t>=(C.go||0))C.fl=nf;}
/* 계단 싸움: 계단을 오르내리는 분대가 다음 층에 머리를 내밀면 그 층의 눌리지 않은 적이 먼저 쏜다 */
function cqbStairs(t){for(const u of G.units.slice()){if(!u.climb||!u.onSt||UT[u.type].cls!=='inf'||!G.units.includes(u))continue;
  const f=u.fl||0,dir=u.flDir||1,fr=f-Math.floor(f);if(fr<1e-6)continue;if(dir>0?fr<.5:fr>.5)continue;const tf=dir>0?Math.ceil(f):Math.floor(f);
  for(const d of G.units.slice()){if(d.nat===u.nat||d.r!==u.r||d.c!==u.c||UT[d.type].cls!=='inf'||UT[d.type].ind||!UT[d.type].rng[1])continue;
    if(d.climb||(d.cd||0)>0||(d.supp||0)>=CQB.pin||flOf(d)!==tf)continue;
    rtShoot(d,u);d.cd=COOL[d.type]*(.8+Math.random()*.3);d._amb=t;if(!G.units.includes(u))break;}}}
/* 계단에서 내려선 분대는 계단 자리를 비워 방 안으로 몇 걸음 물러선다(다음에 오르내리는 분대와 겹치지 않게) */
function stairClear(dt){for(const u of G.units){if(UT[u.type].cls!=='inf'||u.climb||(u.path&&u.path.length))continue;const x=cell(u.r,u.c);if(!isB(x))continue;
  const [sx,sz]=stairPos(u.r,u.c);if(Math.hypot(u.x-sx,u.z-sz)>.2)continue;const [tx,tz]=stairAway(u);
  const dx=tx-u.x,dz=tz-u.z,d=Math.hypot(dx,dz);if(d<.02)continue;const k=Math.min(1,UT[u.type].mv*SPD_K*.5*dt/d);u.x+=dx*k;u.z+=dz*k;}}
function cqbTick(){const t=G.time||0;stairClear(TICK);for(const u of G.units.slice())if(u.cqb&&G.units.includes(u))cqbStep(u,t);cqbStairs(t);}
const _cqbTick0=rtTick;
rtTick=function(dt){_cqbTick0(dt);if(G&&!G.over)try{cqbTick();}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}};
/* 다른 명령을 받으면 돌입을 멈춘다 */
const _cqbMv0=orderMoveTo,_cqbAt0=orderAttack,_cqbBd0=orderBldg,_cqbSt0=orderStop;
orderMoveTo=function(u,x,z){if(u.cqb)cqbEnd(u);return _cqbMv0(u,x,z);};
orderAttack=function(u,e){if(u.cqb)cqbEnd(u);return _cqbAt0(u,e);};
orderBldg=function(u,r,c){if(u.cqb)cqbEnd(u);return _cqbBd0(u,r,c);};
orderStop=function(u){if(u.cqb)cqbEnd(u);return _cqbSt0(u);};
/* 무전 명령 'clear' [r,c] (05j-radio) */
const _cqbRx0=radioExec;
radioExec=function(k,a,us){if(k!=='clear')return _cqbRx0(k,a,us);us=us.filter(u=>G.units.includes(u));for(const g of us){orderClear(g,a[0],a[1]);g._ack=G.time||0;}};
/* 패널에 보일 돌입 단계 */
function cqbTxt(u){const C=u.cqb;if(!C)return '';return C.st==='move'?'돌입: 문으로 가는 중':C.st==='stack'?'돌입: 문 옆 대기':C.st==='entry'?'돌입: 진입 중':u.climb?'돌입: 계단':`돌입: ${C.fl>=topFl(cell(u.r,u.c))?'옥상':(C.fl+1)+'층'} 소탕`;}
/* 헛걸음 막기: 경로가 있는데 CQB.stallT초 동안 목적지에 CQB.stallD칸도 더 가까워지지 못하면(문 앞에서 떨거나 왔다 갔다) 멈춘다.
   AI는 다음 생각에서 새 자리를 고르고, 돌입 중이면 돌입을 그만둔다. */
/* 간격 지키기 (보병):
   - 문은 한 번에 한 분대: 같은 문으로 아군 분대가 먼저(더 가까이) 지나가고 있으면 문 앞 0.7칸 밖에서 기다린다.
   - 앞서 같은 쪽으로 걷는 아군 분대에 0.5칸 안으로 붙으면 걸음을 늦춘다(줄줄이 겹쳐 걷지 않게). 마주 오는 분대는 막지 않는다. */
const SPACE={door:.7,doorIn:.5,follow:.5,slow:.25};
function doorAhead(u){const p=u.path;if(!p||!p.length)return null;
  for(let i=0;i<Math.min(3,p.length-1);i++){if(p[i].door==='a'&&p[i+1].door==='b'){const D=[(p[i][0]+p[i+1][0])/2,(p[i][1]+p[i+1][1])/2];return Math.hypot(D[0]-u.x,D[1]-u.z)<SPACE.door+.3?D:null;}if(p[i].door==='b')return null;}
  return null;}
function spaceWait(u){if(UT[u.type].cls!=='inf'||u.climb||u.cqb&&u.cqb.st==='stack')return 1;const t=G.time||0;
  const D=doorAhead(u);
  if(D){const du=Math.hypot(D[0]-u.x,D[1]-u.z);
    for(const o of G.units){if(o===u||o.nat!==u.nat||UT[o.type].cls!=='inf'||!o.path||!o.path.length||o._wait===t)continue;const dd=Math.hypot(D[0]-o.x,D[1]-o.z);
      if(dd<SPACE.doorIn&&dd<du-1e-6&&du>.25){u._wait=t;return 0;}}}
  const [tx,tz]=u.path[0];const hx=tx-u.x,hz=tz-u.z,hl=Math.hypot(hx,hz);if(hl<1e-6)return 1;
  for(const o of G.units){if(o===u||o.nat!==u.nat||UT[o.type].fly||!o.path||!o.path.length||o._wait===t)continue;const ox=o.x-u.x,oz=o.z-u.z,od=Math.hypot(ox,oz);if(od>SPACE.follow||od<1e-6)continue;
    if((ox*hx+oz*hz)/(od*hl)<.5)continue;   // 앞에 있지 않다
    const [px,pz]=o.path[0];const gx=px-o.x,gz=pz-o.z,gl=Math.hypot(gx,gz)||1;if((gx*hx+gz*hz)/(gl*hl)<.3)continue;   // 같은 쪽으로 가지 않는다
    if(cell(o.r,o.c).t==='bldg'&&typeof flOf==='function'&&flOf(o)!==flOf(u))continue;return SPACE.slow;}
  return 1;}
/* 목적지에 아군이 먼저 서 있으면 그 곁(0.6칸 안)에 닿은 것으로 치고 멈춘다(서로 밀며 제자리걸음하지 않게) */
function nearTaken(u){const p=u.path;if(!p||p.length!==1||UT[u.type].fly)return false;const [ex,ez]=p[0];if(Math.hypot(ex-u.x,ez-u.z)>.6)return false;
  for(const o of G.units){if(o===u||o.nat!==u.nat||UT[o.type].fly||o.path&&o.path.length)continue;if(u.fol&&u.fol.L===o.id)continue;if(Math.hypot(o.x-ex,o.z-ez)>.5)continue;   // 따라가는 선두(호위하는 차량) 곁 자리는 그 선두가 차지한 자리가 아니다
    if(o.r===u.r&&o.c===u.c&&cell(o.r,o.c).t==='bldg'&&typeof flOf==='function'&&flOf(o)!==flOf(u))continue;return true;}
  return false;}
{const _spMove0=rtMove;rtMove=function(u,dt){if(u.path&&u.path.length){if(nearTaken(u)){u.path=[];u.dest=null;return;}const k=spaceWait(u);if(k<=0)return;dt*=k;}return _spMove0(u,dt);};}
const _cqbMove0=rtMove;
// 나아감은 '남은 경로 길이'로 잰다(목적지까지 곧은 거리로 재면 건물을 돌아가는 길에서 멀쩡히 가는 부대를 세웠다).
// 처음 헛걸음이면 지금 자리에서 길을 다시 찾고, 또 헛걸음이면 그때 멈춘다. 지상 차량은 05b2-motion이 따로 빼낸다.
const pathLeft=u=>{const p=u.path;let d=0,x=u.x,z=u.z;for(const q of p){d+=Math.hypot(q[0]-x,q[1]-z);x=q[0];z=q[1];}return d;};
rtMove=function(u,dt){_cqbMove0(u,dt);if(!G.units.includes(u))return;const p=u.path;if(!p||!p.length){u._pw=null;return;}
  if(typeof isGV==='function'&&isGV(u)){u._pw=null;return;}
  const e=p[p.length-1],t=G.time||0,d=pathLeft(u);const w=u._pw;
  if(!w||Math.abs(w.x-e[0])>.01||Math.abs(w.z-e[1])>.01){u._pw={x:e[0],z:e[1],d,t,n:w&&w.n&&Math.hypot(w.x-e[0],w.z-e[1])<.6?w.n:0};return;}
  if(d<w.d-CQB.stallD){w.d=d;w.t=t;return;}
  if(t-w.t>CQB.stallT){G.stallN=(G.stallN||0)+1;
    if(!w.n&&!u.cqb){const np=pathPts(u,e[0],e[1]);if(np.length){u.path=np;u._pw={x:e[0],z:e[1],d:pathLeft(u),t,n:1};return;}}
    u._pw=null;u.path=[];u.dest=null;if(u.cqb)cqbEnd(u,0,'stall');}};
