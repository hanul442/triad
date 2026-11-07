/* ===================== 보급: 탄약·보급 트럭·견인·수리 =====================
   - 탄약: 쏠 때마다 한 발(한 번의 사격)씩 줄어든다. 30% 아래면 아껴 쏘느라 느려지고, 다 떨어지면 쏘지 못한다.
   - 보급소: 세력마다 출발 지역 도로 위에 하나. 출발 지역 안에 있으면 탄약이 천천히 찬다.
   - 보급 트럭: 탄약을 싣고 다니며, 멈춘 자리 둘레의 아군에게 나눠 준다. 비면 보급소로 돌아가 다시 싣는다.
   - 구난차: 고장 난 아군 차량에 가서, 안전하면 그 자리에서 고치고, 적이 가까우면 보급소까지 끌고 간다.
   - 보급소 옆에 세운 차량은 체력·무장·궤도·승무원을 회복한다.
   AI도 같은 규칙으로 트럭과 구난차를 사서 쓴다. 기존 AI(06-ai) 코드는 건드리지 않고 aiThink를 감싼다. */
Object.assign(UT,{
  sup:{n:'보급 트럭',cls:'veh',mv:6,vis:4,rng:[0,0],atk:{inf:0,veh:0,air:0},cost:3,hpMax:6,logi:1,desc:'탄약을 싣고 다니며 멈춘 자리 둘레(1.6칸)의 아군에게 나눠 줌. 비면 보급소로 돌아가 다시 실음. 무장 없음, 장갑 얇음'},
  rec:{n:'구난차',cls:'veh',mv:5,vis:4,rng:[0,0],atk:{inf:0,veh:0,air:0},cost:4,hpMax:10,logi:1,desc:'고장 난 아군 차량을 그 자리에서 고치거나, 적이 가까우면 보급소까지 끌고 감. 무장 없음'},
});
for(const t of ['sup','rec'])if(!TYPES.includes(t))TYPES.splice(TYPES.indexOf('spg')+1+(t==='rec'?1:0),0,t);
Object.assign(COOL,{sup:1,rec:1});
if(typeof VCREW==='object')Object.assign(VCREW,{sup:2,rec:3});
/* 병종별 탄약(사격 횟수)과, 한 번 가득 채우는 데 드는 트럭 적재량 */
const AMMO={rifle:40,mg:60,at:6,sniper:18,eng:8,mortar:12,ifv:45,tank:22,hmv:55,spg:10,aa:4,ew:30,zu:60,dteam:30};
const LOAD={rifle:8,mg:10,at:10,sniper:3,eng:8,mortar:14,ifv:16,tank:24,hmv:10,spg:28,aa:10,ew:6,zu:16,dteam:6};
const CARGO=100,AM_LOW=.3,SERVE_R=1.6,DEPOT_R=1.8;
const amMax=u=>AMMO[u.type]||0;
function amOf(u){const M=amMax(u);if(!M)return null;if(u.am==null)u.am=M;return u.am;}
const amFrac=u=>{const M=amMax(u);return M?amOf(u)/M:1;};
/* 보급소: 출발 지역의 도로·광장 중 한 곳(환자집결지와 다른 곳) */
function depotOf(n){G.depot=G.depot||{};if(G.depot[n])return G.depot[n];
  let sp=zoneSpots(n).filter(([r,c])=>['road','plaza'].includes(G.map[r][c].t));if(!sp.length)sp=zoneSpots(n).filter(([r,c])=>G.map[r][c].t!=='water'&&G.map[r][c].t!=='bldg');
  const p=sp.length?sp[Math.floor(sp.length*.35)]:[Math.floor(N/2),Math.floor(N/2)];return G.depot[n]={x:p[1]+.5,z:p[0]+.5};}
const atDepot=u=>{const d=depotOf(u.nat);return Math.hypot(u.x-d.x,u.z-d.z)<DEPOT_R;};
const uById=id=>G.units.find(o=>o.id===id);
const idle=u=>!(u.path&&u.path.length);
/* 적이 가까운가(보이는 적이 r칸 안) */
function hotAt(n,x,z,r){for(const e of G.units){if(e.nat===n||UT[e.type].fly)continue;if(G.fog&&!seen(e,n))continue;if(Math.hypot(e.x-x,e.z-z)<r)return true;}return false;}
/* 차량 고장 정도: 0이면 멀쩡 */
function vNeed(v){if(UT[v.type].cls!=='veh')return 0;const V=v.vd;let s=0;if(V&&V.mob)s+=3;if(V&&V.gun)s+=2;if(v.hp<hpMax(v)*.6)s+=1;if(V&&V.crew.some(c=>c!=='ok'))s+=.5;return s;}
function lgLog(u,msg){if(!isAI(u.nat)||!G.fog)L(`${natName(u.nat)} ${UT[u.type].n} ${msg}`);}

/* ---------- 탄약 소모: 사격하면(쿨다운이 새로 걸리면) 한 발 ---------- */
{const _fight=rtFight;rtFight=function(u){const M=amMax(u);if(!M)return _fight(u);if(amOf(u)<1)return;const cd0=u.cd;_fight(u);
   if(u.cd>cd0+.01){u.am=Math.max(0,u.am-1);if(u.am/M<AM_LOW)u.cd*=1.35;
     if(u.am<1){lgLog(u,'탄약 소진');if(u.nat===G.viewer&&!isAI(u.nat)&&typeof toast==='function')toast(`${UT[u.type].n} 탄약 소진: 보급 트럭을 보내거나 출발 지역으로 물리세요`);}}};}

/* ---------- 매 틱: 보급소·트럭·구난차 ---------- */
function lgTick(dt){const t=G.time||0;
  for(const u of G.units.slice()){if(!G.units.includes(u))continue;const ty=UT[u.type];if(ty.fly)continue;
    // 출발 지역 안: 탄약이 천천히(보급소 바로 옆은 빠르게) 찬다
    const M=amMax(u);if(M&&amOf(u)<M&&inZone(u.nat,u.r,u.c))u.am=Math.min(M,u.am+M*(atDepot(u)?.12:.03)*dt);
    // 보급소 옆에 멈춘 차량: 정비
    if(ty.cls==='veh'&&idle(u)&&atDepot(u)&&u.towBy==null)fixVeh(u,dt,1);
    if(u.type==='sup')supTick(u,dt);else if(u.type==='rec')recTick(u,dt,t);}
  towTick();}
/* 차량 정비. k: 보급소 1, 현장 수리 .6. 고장은 정비 시간이 쌓이면 하나씩 고친다(궤도 → 무장 → 승무원 순) */
function fixVeh(v,dt,k){const V=v.vd,hm=hpMax(v);const cap=k>=1?hm:hm*.8;let busy=false;
  if(v.hp<cap){v.hp=Math.min(cap,Math.round((v.hp+.35*k*dt)*100)/100);busy=true;}
  if(V){const need=V.mob?'mob':V.gun?'gun':k>=1&&V.crew.some(c=>c!=='ok')?'crew':null;
    if(need){busy=true;v._fx=(v._fx||0)+dt*k;const T={mob:14,gun:9,crew:12}[need];
      if(v._fx>=T){v._fx=0;if(need==='crew'){const i=V.crew.findIndex(c=>c!=='ok');V.crew[i]='ok';lgLog(v,'승무원 보충');}else{V[need]=0;lgLog(v,need==='mob'?'궤도·바퀴 수리 완료':'무장 수리 완료');}bump();}}}
  return busy;}

/* ---------- 보급 트럭 ---------- */
function supTick(u,dt){if(u.cargo==null)u.cargo=CARGO;u._srv=null;
  if(atDepot(u)||inZone(u.nat,u.r,u.c))u.cargo=Math.min(CARGO,u.cargo+(atDepot(u)?12:4)*dt);
  // 멈춰 있으면 둘레 아군에게 나눠 준다
  if(idle(u)&&u.cargo>.1){const near=G.units.filter(o=>o.nat===u.nat&&o!==u&&amMax(o)&&amOf(o)<amMax(o)-.05&&!UT[o.type].fly&&Math.hypot(o.x-u.x,o.z-u.z)<SERVE_R);
    if(near.length){u._srv=near.map(o=>o.id);for(const o of near){const M=amMax(o);const want=Math.min(M-o.am,M*.14*dt/near.length*2);const cost=want/M*LOAD[o.type];
        const k=Math.min(1,u.cargo/Math.max(1e-6,cost));o.am+=want*k;u.cargo=Math.max(0,u.cargo-cost*k);}}}
  if(u.hold||!idle(u))return;
  if(u.lj&&u.lj.k==='serve'){const e=uById(u.lj.id);if(!e||amFrac(e)>.97||u.cargo<1)u.lj=null;else if(Math.hypot(e.x-u.x,e.z-u.z)>SERVE_R*.8){if((u._rp2||0)<(G.time||0)){u._rp2=(G.time||0)+3;u.path=pathPts(u,e.x,e.z);
      // 트럭이 더 다가갈 수 없는 곳(건물 깊숙이)이면 포기하고 한동안 그 부대는 건너뛴다
      if(!u.path.length&&Math.hypot(e.x-u.x,e.z-u.z)>SERVE_R){(u.nog=u.nog||{})[e.id]=(G.time||0)+40;u.lj=null;}}return;}else return;}
  if(u.lj&&u.lj.k==='home'){if(atDepot(u)&&u.cargo<CARGO-1)return;u.lj=null;}
  if(u._srv)return;                                   // 지금 누군가에게 나눠 주는 중
  if(u.cargo<15){if(!atDepot(u))supHome(u);return;}
  if((u._auT||0)>(G.time||0))return;u._auT=(G.time||0)+2;
  const ai=isAI(u.nat),R=ai?99:5;let best=null,bs=0;
  for(const o of G.units){if(o.nat!==u.nat||o===u||!amMax(o)||UT[o.type].fly)continue;const f=amFrac(o);if(f>.6||inZone(o.nat,o.r,o.c))continue;const d=Math.hypot(o.x-u.x,o.z-u.z);if(d>R)continue;
    if(u.nog&&(u.nog[o.id]||0)>(G.time||0))continue;if(G.units.some(s=>s!==u&&s.type==='sup'&&s.nat===u.nat&&s.lj&&s.lj.id===o.id))continue;
    const s=(1-f)*LOAD[o.type]/(1+d*.25)*(f<.05?2:1);if(s>bs){bs=s;best=o;}}
  if(best)supSend(u,best);}
function supSend(u,e){u.lj={k:'serve',id:e.id};u.path=pathPts(u,e.x,e.z);u._rp2=(G.time||0)+3;}
function supHome(u){const d=depotOf(u.nat);u.lj={k:'home'};u.path=pathPts(u,d.x,d.z);}

/* ---------- 구난차 ---------- */
function recTick(u,dt,t){u._fixing=null;
  if(u.tow!=null){const v=uById(u.tow);if(!v){u.tow=null;u.lj=null;}
    else if(atDepot(u)&&idle(u)){v.towBy=null;u.tow=null;u.lj=null;lgLog(v,'보급소로 견인 완료');bump();}
    else if(idle(u)){const d=depotOf(u.nat);u.path=pathPts(u,d.x,d.z);}
    return;}
  if(u.lj&&u.lj.k==='fix'){const v=uById(u.lj.id);if(!v||!vNeed(v)||v.towBy!=null){u.lj=null;u._hk=0;return;}
    const d=Math.hypot(v.x-u.x,v.z-u.z);
    if(d>1.15){if(!(v.vd&&v.vd.mob)&&v.path&&v.path.length&&d>4){u.lj=null;return;}   // 고친다던 차가 떠나 버림
      if(idle(u)&&(u._rp2||0)<t){u._rp2=t+3;u.path=pathPts(u,v.x,v.z);if(!u.path.length&&d>2.5){u.lj=null;}}return;}
    if(!idle(u))return;
    const hot=hotAt(u.nat,v.x,v.z,5)||t-(v._hitT||-99)<8;
    if(v.vd&&v.vd.mob&&hot){u._hk=(u._hk||0)+dt;u._fixing=v.id;          // 견인 고리를 거는 중
      if(u._hk>=3){u._hk=0;u.tow=v.id;v.towBy=u.id;v.path=[];v.tgt=null;const p=depotOf(u.nat);u.path=pathPts(u,p.x,p.z);lgLog(v,'견인 시작');bump();}return;}
    u._hk=0;u._fixing=v.id;if(!fixVeh(v,dt,.6)||!vNeed(v)){u.lj=null;u._fixing=null;}return;}
  if(u.hold||!idle(u))return;
  if((u._auT||0)>t)return;u._auT=t+2;
  const v=recPick(u,isAI(u.nat)?99:7);if(v)recSend(u,v);}
function recPick(u,R){let best=null,bs=0;
  for(const v of G.units){if(v.nat!==u.nat||v===u||v.towBy!=null)continue;const need=vNeed(v);if(!need)continue;if(atDepot(v))continue;
    if(v.vd&&!v.vd.mob&&v.path&&v.path.length)continue;   // 움직이는 차는 쫓아가지 않는다
    if(G.units.some(s=>s!==u&&s.type==='rec'&&s.nat===u.nat&&(s.tow===v.id||s.lj&&s.lj.id===v.id)))continue;
    const d=Math.hypot(v.x-u.x,v.z-u.z);if(d>R)continue;const s=need/(1+d*.2);if(s>bs){bs=s;best=v;}}
  return best;}
function recSend(u,v){u.lj={k:'fix',id:v.id};u._hk=0;u.path=pathPts(u,v.x,v.z);u._rp2=(G.time||0)+3;}
/* 끌려가는 차량은 구난차 뒤 0.85칸에 붙어 따라온다 */
function towTick(){for(const u of G.units){if(u.type!=='rec'||u.tow==null)continue;const v=uById(u.tow);if(!v)continue;
  const a=(u.face||0)*Math.PI/180,tx=u.x-Math.cos(a)*.85,tz=u.z-Math.sin(a)*.85;const dx=tx-v.x,dz=tz-v.z,d=Math.hypot(dx,dz);
  if(d>.02){const nx=tx,nz=tz;if(tileAt(nx,nz)&&mcost(v.type,tileAt(nx,nz))<Infinity){v.x=nx;v.z=nz;}
    v.face=Math.atan2(u.z-v.z,u.x-v.x)*180/Math.PI;if(typeof rtCell==='function')rtCell(v);}}}

/* ---------- 엔진에 끼우기 ---------- */
{const _tick=rtTick;rtTick=function(dt){_tick(dt);if(!G||!G.units||G.over)return;try{lgTick(dt);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}};
 // 견인 중인 구난차는 느리다. 끌려가는 차는 스스로 움직이지 않는다
 const _mv=rtMove;rtMove=function(u,dt){if(u.towBy!=null){u.path=[];return;}if(u.tow!=null)return _mv(u,dt*.55);return _mv(u,dt);};
 // 사람이 직접 이동 명령을 내리면 맡은 보급·수리 일을 내려놓는다(견인은 유지)
 const man=f=>function(u){if(u&&UT[u.type]&&UT[u.type].logi){u.lj=null;u._hk=0;}if(u&&u.towBy!=null)return;return f.apply(null,arguments);};
 orderMoveTo=man(orderMoveTo);orderStop=man(orderStop);}
/* 플레이어 명령 */
function lgRearm(u){let best=null,bd=1e9;for(const s of G.units){if(s.type!=='sup'||s.nat!==u.nat||s.cargo<5)continue;const d=Math.hypot(s.x-u.x,s.z-u.z);if(d<bd){bd=d;best=s;}}
  if(!best)return '보급 트럭이 없습니다. 증원에서 보급 트럭을 부르세요';supSend(best,u);best.hold=false;return best;}
function lgTow(u,v){v=v||recPick(u,99);if(!v)return '고칠 아군 차량이 없습니다';recSend(u,v);u.hold=false;return v;}
function lgDrop(u){const v=u.tow!=null?uById(u.tow):null;if(v)v.towBy=null;u.tow=null;u.lj=null;}

/* ---------- AI ---------- */
const LJ_HIDE={logi:1};
{const _ai=aiThink;aiThink=function(n){
   // 보급 차량과 재보급하러 돌아가는 부대는 일반 AI가 움직이지 않게 잠시 가린다
   if(!G.over)aiLogiBuy(n);   // 증원보다 먼저: 일반 AI가 지휘점수를 다 쓰기 전에
   const hid=G.units.filter(u=>u.nat===n&&!u.job&&(UT[u.type].logi||u.rearm||u.towBy!=null));for(const u of hid)u.job=LJ_HIDE;
   try{_ai(n);}finally{for(const u of hid)if(u.job===LJ_HIDE)u.job=null;}
   if(!G.over)aiLogi(n);};}
/* 보급 차량은 부대 수 상한과 따로 센다(많아야 트럭 2·구난차 1) */
function aiLogiBuy(n){const N2=G.nats[n];const mine=G.units.filter(u=>u.nat===n);const cnt=t=>mine.filter(u=>u.type===t).length;
  const armed=mine.filter(u=>amMax(u));const low=armed.filter(u=>amFrac(u)<.5).length;const broke=mine.filter(u=>vNeed(u)>=2).length;
  const buyNear=(t)=>{const d=depotOf(n);const sp=deploySpots(n,t);if(!sp.length)return null;sp.sort((a,b)=>Math.hypot(kc(a)+.5-d.x,kr(a)+.5-d.z)-Math.hypot(kc(b)+.5-d.x,kr(b)+.5-d.z));return buy(n,t,kr(sp[0]),kc(sp[0]));};
  const supWant=armed.length>=12?2:1;
  if(cnt('sup')<supWant&&(low>=2||(G.time||0)>150&&!cnt('sup'))&&N2.cp>=UT.sup.cost)buyNear('sup');
  else if(!cnt('rec')&&broke&&N2.cp>=UT.rec.cost)buyNear('rec');}
function aiLogi(n){const mine=G.units.filter(u=>u.nat===n);const armed=mine.filter(u=>amMax(u));
  // 탄약이 떨어진 부대: 가까운 트럭이 없으면 보급소로 물러났다가 채우고 돌아간다
  const sups=mine.filter(u=>u.type==='sup'&&(u.cargo??CARGO)>10);
  // 무장이 부서진 차량은 보급소로 돌아가 고친다(구난차가 오면 현장에서 고친다)
  for(const u of mine){if(UT[u.type].cls!=='veh'||UT[u.type].logi||u.towBy!=null)continue;const V=u.vd;
    if(u.rearm===2){if(!(V&&V.gun)&&u.hp>=hpMax(u)*.9)u.rearm=0;else if(idle(u)&&!atDepot(u)&&!(V&&V.mob)){const d=depotOf(n);u.path=pathPts(u,d.x,d.z);}continue;}
    if(V&&V.gun&&!V.mob&&!u.rearm){u.rearm=2;u.tgt=null;const d=depotOf(n);u.path=pathPts(u,d.x,d.z);}}
  for(const u of armed){if(u.rearm===2)continue;if(u.rearm){if(amFrac(u)>=.85||!G.units.includes(u)){u.rearm=0;}else if(idle(u)&&!inZone(n,u.r,u.c)){const d=depotOf(n);u.path=pathPts(u,d.x,d.z);}continue;}
    if(amOf(u)>=1||inZone(n,u.r,u.c)||u.brk)continue;if(sups.some(s=>Math.hypot(s.x-u.x,s.z-u.z)<12))continue;
    u.rearm=1;u.tgt=null;u.tgtTile=null;const d=depotOf(n);u.path=pathPts(u,d.x,d.z);}}
