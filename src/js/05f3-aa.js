/* ===================== AA: 대공팀이 헬기를 실제로 잡는다 =====================
   측정해 보니 대공팀(휴대용 대공미사일) 바로 앞에 공격헬기가 와도 45초 임무 동안 8%만 떨어뜨렸고, AI 대전에서는 2%였다.
   미사일이 맞아도 피해 9쯤이라 헬기(체력 14)가 버텼고, 재장전 7초 사이 헬기가 대공팀을 먼저 쓸어 버렸다. 수송헬기는 아예 쏠 수 없었다.
   실제 기준으로 고친다(지도 거리는 06y-range처럼 1칸 ≈ 12m로 줄인 값):
   - 미사일 명중: 스팅어·이글라급 탄두(약 3kg)가 헬기에 맞으면 대개 추락한다. 맞으면 60% 격추, 아니면 크게 부서져 임무를 버리고 돌아간다.
   - 조준: 적외선 탐색기가 표적 열을 잡는 데(신호음) 1.5초 걸린다. 그동안 표적을 계속 보고 있어야 쏜다.
   - 플레어: 헬기는 미사일 경보기가 발사를 잡으면 자동으로 플레어를 뿌리고 급선회한다. 요즘 탐색기는 플레어를 꽤 걸러 내서 속는 건 35%.
     공격헬기는 6회분, 수송헬기는 4회분을 싣는다.
   - 발견: 헬기는 크고 시끄러워 멀리서도 보인다(시야선이 열려 있으면 22칸 ≈ 260m, 날씨 시정 안에서).
   - 저고도 사격: 기관총·기관포·소총도 낮게 뜬 헬기를 쏜다(05f-air AIR_ACC). 체력이 35% 아래로 떨어진 공격헬기는 임무를 버리고 돌아간다.
   - 수송헬기: 내려앉는 동안(진입·착지·이륙) 대공팀·대공포·기관총·장갑차·소총이 쏜다. 내리기 전에 떨어지면 탄 분대도 잃고,
     많이 맞으면 투입을 포기하고 돌아간다.
   - 자동 임무: 대공팀·대공포는 아군이 본 적 항공기가 사거리 밖이면 스스로 쏠 수 있는 곳까지 다가간다(직접 명령·제자리 유지 중이 아닐 때).
   - AI: 적 헬기가 보이면 대공팀을 먼저 증원하고, 적 대공이 지키는 곳에는 수송헬기를 내리지 않는다. */
const AA={lock:1.5,flares:6,flareP:.35,killP:.6,hitLeft:.3,rtb:.35,heliVis:22,seek:12,trh:{hp:10,flares:4,abort:4,mis:.75,kill:.7},
  // 수송헬기에 쏘는 거리(칸)·한 번 연사가 맞을 확률·맞으면 피해. 기관포가 가장 무섭고 소총은 거의 긁기만 한다.
  gun:{zu:[20,.45,2.6],ifv:[16,.3,2],hmv:[14,.25,1.4],mg:[12,.22,1],tank:[10,.15,.8],rifle:[8,.12,.45]}};

/* ---------- 저고도 헬기에 대한 기관포 위력 ----------
   23mm(대공포)·30mm(장갑차) 고폭탄은 낮게 뜬 헬기에 치명적이다. 기관총(12.7mm·7.62mm)은 긁는 정도, 소총은 거의 못 뚫는다. */
UT.aa.desc='휴대용 대공미사일(스팅어·이글라급). 열을 1.5초 잡고 쏨. 헬기에 맞으면 대개 추락하고, 헬기는 플레어로 피하기도 함. 적 헬기가 보이면 스스로 다가가 쏘고, 평소엔 아군 주력 곁에 머묾. 지상 공격 불가';
UT.zu.atk.air=20;UT.ifv.atk.air=8;UT.hmv.atk.air=4;

// 대공 병종(대공팀·대공포 차량, 차량 스레드가 더하는 자주대공포 등): 02-helpers의 AA_T가 있으면 그것을 쓴다
const isAAT=t=>typeof AA_T==='object'&&AA_T?!!AA_T[t]:(t==='aa'||t==='zu');

/* ---------- 미사일 경보·플레어·명중 ---------- */
// 발사 순간: 헬기가 경보를 받고 플레어를 뿌린다(남아 있으면). 속을지는 여기서 정해 두고 airHit이 쓴다.
function aaWarn(d,a){d._mw=G.time||0;d._mwBy=a.id;d._decoy=false;if((d.flares??0)>0){d.flares--;d.flareT=G.time;d._decoy=Math.random()<AA.flareP;}
  const A=d.air;if(A&&!A.leave&&A.mode!=='brk'){A.mode='brk';A.side=Math.random()<.5?-1:1;A.sa=typeof gsAng==='function'?gsAng(A,Math.atan2(d.z-A.cz,d.x-A.cx)+A.side*1.2):A.sa;}}
airHit=function(a,d,hits){const td=UT[d.type];if(!hits)return 0;
  if(td.heli&&a.type==='aa'){if(d._decoy){d._decoy=false;L(`${natName(d.nat)} ${td.n} 플레어로 미사일 회피`);return 0;}
    if(Math.random()<AA.killP)d._mk=a.id;else{d._hp0=d.hp;d.hp+=1e3;d._mk=null;}return hits;}   // 격추가 아니면 피해는 아래 rtShoot에서 정한다
  if(td.kami)d.hp=0;return hits;};
{const _s=rtShoot;rtShoot=function(a,d){const heli=UT[d.type].heli&&a.type==='aa';if(heli)aaWarn(d,a);
  const r=_s.apply(this,arguments);
  if(heli&&d._hp0!=null){d.hp=Math.min(d._hp0,hpMax(d)*AA.hitLeft);d._hp0=null;}
  if(heli&&G.units.includes(d)){if(d._mk===a.id){d._mk=null;d.hp=0;kill(d,a);}
    else if(d.hp>0&&d.air&&!d.air.leave&&d.hp<hpMax(d)*AA.rtb){d.air.leave=1;L(`${natName(d.nat)} ${UT[d.type].n} 미사일 피격, 임무 포기하고 복귀`);}}
  else if(UT[d.type].heli&&G.units.includes(d)&&d.air&&!d.air.leave&&d.hp<hpMax(d)*AA.rtb){d.air.leave=1;L(`${natName(d.nat)} ${UT[d.type].n} 피격, 복귀`);}
  return r;};}
// 탐색기 고정: 같은 표적을 1.5초 보고 있어야 쏜다. 표적을 놓치면 처음부터.
{const _f=rtFight;rtFight=function(u){if(u.type!=='aa'||u.cd>0)return _f(u);const tg=rtPick(u);
  if(!tg){u._lk=null;return _f(u);}
  if(u._lk!==tg.id){u._lk=tg.id;u._lkT=G.time||0;u.face=Math.atan2(tg.z-u.z,tg.x-u.x)*180/Math.PI;return;}
  if((G.time||0)-u._lkT<AA.lock)return;return _f(u);};}
{const _cg=callGunship;callGunship=function(){const u=_cg.apply(this,arguments);if(u)u.flares=AA.flares;return u;};}

/* ---------- 헬기는 멀리서도 보인다 ---------- */
{const _sp=spots;spots=function(u,e){if(_sp(u,e))return true;const te=UT[e.type];if(!te.heli||UT[u.type].fly)return false;
  const d=Math.hypot(e.x-u.x,e.z-u.z);const cap=typeof seeCap==='function'?seeCap(u):99;if(d>Math.min(AA.heliVis,cap))return false;
  return losU(u,e);};}

/* ---------- 수송헬기 ---------- */
// 화면(07h-heli)과 같은 비행: 2.4초 진입 → 1.6초 하강 → 지상 → 이륙 → 이탈
const TRH={fly:2.4,desc:1.6,lift:1.2,out:2.6};
function trhPos(h,now){const t=now-h.t0,far=N*.9,stay=HELI_T-TRH.fly-TRH.desc+1.2;let x=h.x,z=h.z,y=.4;
  if(t<TRH.fly){const e=1-Math.pow(1-t/TRH.fly,2);x=h.sx+(h.x-h.sx)*e;z=h.sz+(h.z-h.sz)*e;y=3.5;}
  else if(t<TRH.fly+TRH.desc){y=3.5-3*(t-TRH.fly)/TRH.desc;}
  else if(t<TRH.fly+TRH.desc+stay){y=.4;}
  else if(t<TRH.fly+TRH.desc+stay+TRH.lift){y=.4+2.5*(t-TRH.fly-TRH.desc-stay)/TRH.lift;}
  else{const k=Math.min(1,(t-TRH.fly-TRH.desc-stay-TRH.lift)/TRH.out),e=k*k;x=h.x+(h.x-h.sx)*e*1.2;z=h.z+(h.z-h.sz)*e*1.2;y=3+e*2;}
  return [x,z,y];}
{const _hi=heliInsert;heliInsert=function(n,r,c){const before=(G.pending||[]).length;_hi.apply(this,arguments);const p=(G.pending||[])[before]||null;
  const dir=[[-1,0],[1,0],[0,-1],[0,1]][n]||[-1,0];const x=c+.5,z=r+.5;const now=G.time||0;
  (G.trh=G.trh||[]).push({id:UID++,n,r,c,x,z,sx:x+dir[0]*N*.9,sz:z+dir[1]*N*.9,t0:now,end:now+HELI_T+1.2+TRH.lift+TRH.out,hp:AA.trh.hp,flares:AA.trh.flares,p,nx:{},lk:{},fired:{}});};}
function trhGone(h,why,by){const now=G.time||0;const [x,z]=trhPos(h,now);h.end=now;h[why]=1;
  const pre=h.p&&(G.pending||[]).includes(h.p);if(pre)G.pending=G.pending.filter(p=>p!==h.p);
  if(G.dg)G.dg=G.dg.filter(g=>!(g.n===h.n&&g.r===h.r&&g.c===h.c));
  if(why==='down'){crashAt({x:Math.min(N-.5,Math.max(.5,x)),z:Math.min(N-.5,Math.max(.5,z)),t:now+1.6,big:1,nat:h.n,kind:'heli'});
    G.nats[h.n].losses++;if(by&&G.nats[by.nat]){G.nats[by.nat].kills++;by.kills=(by.kills||0)+1;}
    L(`${natName(h.n)} 수송헬기 격추!${pre?' 탄 분대도 잃음':''}`);}
  else L(`${natName(h.n)} 수송헬기 피격, 투입 포기하고 복귀`);
  bump();}
function trhShooters(h,x,z,y){const out=[];for(const s of G.units){if(s.nat===h.n||UT[s.type].fly||s.hp<=0||(s.supp||0)>1)continue;
  const g=s.type==='aa'?[UT.aa.rng[1]]:AA.gun[s.type];if(!g)continue;const d=Math.hypot(s.x-x,s.z-z);if(d>Math.min(g[0],AA.heliVis))continue;
  if(cell(s.r,s.c).t==='bldg'&&s.type!=='aa'&&eye(s)<bldgH(cell(s.r,s.c)))continue;   // 건물 안쪽 방에서는 하늘이 안 보인다
  const [sx,sz]=posOf(s);if(!losPt(sx,sz,eye(s),x,z,y))continue;out.push([s,d]);}return out;}
function trhTick(){if(!G.trh||!G.trh.length)return;const now=G.time||0;G.trh=G.trh.filter(h=>now<=h.end+.1);
  for(const h of G.trh){if(h.down||h.abort||now>=h.end||now<h.t0+.8)continue;const [x,z,y]=trhPos(h,now);
    for(const [s,d] of trhShooters(h,x,z,y)){if(h.down||h.abort)break;
      if(s.type==='aa'){if(h.fired[s.id]||(typeof amOf==='function'&&amOf(s)!=null&&amOf(s)<1))continue;if(s.cd>0)continue;
        if(h.lk[s.id]==null){h.lk[s.id]=now;continue;}if(now-h.lk[s.id]<AA.lock)continue;
        h.fired[s.id]=1;s.cd=COOL.aa;s.firedT=now;s.face=Math.atan2(z-s.z,x-s.x)*180/Math.PI;if(s.am!=null)s.am=Math.max(0,s.am-1);
        if(FXH.aaShot)try{FXH.aaShot(s,{r:Math.floor(z),c:Math.floor(x),flared:1});}catch(err){}sfx('launch',.6,s.x,s.z);
        let decoy=false;if(h.flares>0){h.flares--;decoy=Math.random()<AA.flareP;}
        if(decoy){L(`${natName(h.n)} 수송헬기 플레어로 미사일 회피`);continue;}
        if(Math.random()>AA.trh.mis*(1-.25*d/UT.aa.rng[1]))continue;
        if(Math.random()<AA.trh.kill)trhGone(h,'down',s);else{h.hp=Math.min(h.hp,AA.trh.abort-1);if(now<h.t0+HELI_T)trhGone(h,'abort');}
        continue;}
      const g=AA.gun[s.type];if((h.nx[s.id]||0)>now)continue;h.nx[s.id]=now+(COOL[s.type]||1.5)*(.85+Math.random()*.3);
      s.firedT=now;s.face=Math.atan2(z-s.z,x-s.x)*180/Math.PI;if(FXH.fire)try{FXH.fire(s,Math.floor(z),Math.floor(x));}catch(err){}
      const p=g[1]*(1-.5*d/g[0])*(s.supp>0?.6:1);if(Math.random()>p)continue;
      h.hp-=g[2]*(.7+Math.random()*.6);
      if(h.hp<=0)trhGone(h,'down',s);else if(h.hp<AA.trh.abort&&now<h.t0+HELI_T)trhGone(h,'abort');}}}
{const _ht=heliTick;heliTick=function(){trhTick();return _ht.apply(this,arguments);};}

/* ---------- 대공팀·대공포 자동 접근 ---------- */
// 아군이 본 적 항공기가 사거리 밖이거나 직접 안 보이면, 쏠 수 있는 곳(항공기에서 8칸쯤, 하늘이 트인 땅)으로 간다.
function aaSeekTick(){const now=G.time||0;if((G._aaSk||0)>now)return;G._aaSk=now+1;
  for(const u of G.units){if(!isAAT(u.type))continue;if(u.hold||u.climb||(u.path&&u.path.length)||!selfRun(u))continue;
    if(typeof amOf==='function'&&amOf(u)!=null&&amOf(u)<1)continue;
    const R=Math.min(UT[u.type].rng[1],AA.heliVis);let best=null,bd=1e9;
    for(const e of G.units){if(e.nat===u.nat||!UT[e.type].fly||UT[e.type].kami)continue;if(u.type==='aa'&&!UT[e.type].heli&&e.type!=='drone')continue;
      if(G.fog&&!seen(e,u.nat))continue;const d=Math.hypot(e.x-u.x,e.z-u.z);if(d>R+AA.seek)continue;
      if(d<=R&&typeof selfSees==='function'&&selfSees(u,e))continue;   // 이미 쏠 수 있다
      if(d<bd){bd=d;best=e;}}
    if(!best){u._aaGo=null;continue;}
    const ang=Math.atan2(u.z-best.z,u.x-best.x);let spot=null;
    for(const D of [8,6,10,4])for(const o of [0,.4,-.4,.8,-.8]){if(spot)break;const x=best.x+Math.cos(ang+o)*D,z=best.z+Math.sin(ang+o)*D;const t=tileAt(x,z);
      if(!t||t.t==='bldg'||t.t==='water'||!walkable(u,x,z))continue;spot=[x,z];}
    if(!spot)continue;if(u._aaGo&&Math.hypot(u._aaGo[0]-spot[0],u._aaGo[1]-spot[1])<1.5&&Math.hypot(u.x-spot[0],u.z-spot[1])<1)continue;
    u._aaGo=spot;orderMoveTo(u,spot[0],spot[1]);}}
/* ---------- 대공팀은 아군 주력 곁에 ----------
   헬기는 45초만 머문다. 대공팀이 멀리(측정상 평균 29칸) 있으면 걸어서 닿기 전에 떠난다.
   그래서 할 일이 없을 때는 아군 전투 부대가 몰린 곳 2칸 뒤(우리 쪽)에 자리 잡는다. 하늘이 보이는 땅을 고른다. */
function aaCoverSpot(u){const own=G.units.filter(o=>o.nat===u.nat&&!UT[o.type].fly&&!SELF_RUN[o.type]&&(UT[o.type].cls==='inf'||UT[o.type].cls==='veh'));
  if(own.length<2)return null;let x=0,z=0;for(const o of own){x+=o.x;z+=o.z;}x/=own.length;z/=own.length;
  const [ex,ez]=airEdge(u.nat,x,z);const dx=ex-x,dz=ez-z,L=Math.hypot(dx,dz)||1;x+=dx/L*2;z+=dz/L*2;
  for(const R of [0,.8,1.6,2.4])for(let i=0;i<8;i++){const a=i/8*6.283,px=x+Math.cos(a)*R,pz=z+Math.sin(a)*R;const t=tileAt(px,pz);
    if(t&&t.t!=='bldg'&&t.t!=='water'&&walkable(u,px,pz))return [px,pz];if(!R)break;}
  return null;}
function aaCoverTick(){const now=G.time||0;if((G._aaCv||0)>now)return;G._aaCv=now+4;
  for(const u of G.units){if(u.type!=='aa'||u.hold||u.climb||(u.path&&u.path.length)||!selfRun(u)||u._aaGo)continue;
    const sp=aaCoverSpot(u);if(!sp||Math.hypot(sp[0]-u.x,sp[1]-u.z)<7)continue;orderMoveTo(u,sp[0],sp[1]);}}
{const _at=airTick;airTick=function(dt){_at.apply(this,arguments);if(G){aaSeekTick();aaCoverTick();aaAirMemo();}};}
// 적 항공기(헬기)를 본 세력은 그 뒤로도 대공을 챙긴다. 적 전투기 폭격은 소리로 안다.
function aaAirMemo(){for(let n=0;n<G.nats.length;n++){const N2=G.nats[n];if(!N2||!aiRun(n))continue;
    if(G.units.some(e=>e.nat!==n&&UT[e.type].heli&&(!G.fog||seen(e,n))))N2.airSeenT=G.time||0;}}
{const _aw=aiArmsW;aiArmsW=function(n){const k=G._aiN;G._aiN=n;try{return _aw.apply(this,arguments);}finally{G._aiN=k;}};}
{const _j=jetRun;jetRun=function(n){for(let k=0;k<G.nats.length;k++)if(k!==n&&G.nats[k])G.nats[k].airSeenT=G.time||0;return _j.apply(this,arguments);};}

/* ---------- AI ---------- */
// 적 헬기가 보이면 대공팀을 가장 먼저(셋까지)
// 실제 기계화 부대는 중대마다 휴대용 대공 사수를 둔다: 처음부터 한 팀, 적 항공기를 겪었으면 두 팀, 지금 보이면 셋까지
{const _w=aiAirW;aiAirW=function(E,cnt){const w=_w.apply(this,arguments);const eHeli=E.filter(e=>UT[e.type].heli).length;
  const n=G._aiN;const seenAir=n!=null&&G.nats[n]&&(G.time||0)-(G.nats[n].airSeenT??-1e9)<300;
  const want=eHeli?3:seenAir?2:1;if(cnt('aa')<want)w.aa=Math.max(w.aa||0,eHeli?4+eHeli*1.5:seenAir?3:1.5);return w;};}
// 적 대공(본 것·기억하는 것)이 9칸 안에 있는 곳에는 수송헬기를 내리지 않는다
function aaThreatNear(n,x,z,R){for(const e of G.units){if(e.nat===n||!isAAT(e.type))continue;if(Math.hypot(e.x-x,e.z-z)>R)continue;
    if(!G.fog||seen(e,n))return true;const m=G.mem&&G.mem[n]&&G.mem[n][e.id];if(m&&Math.hypot(m.x-x,m.z-z)<=R)return true;}
  return false;}
{const _sup=support;support=function(n,kind,r,c){if(kind==='heli'&&typeof aiRun==='function'&&aiRun(n)&&aaThreatNear(n,c+.5,r+.5,9))return false;return _sup.apply(this,arguments);};}
