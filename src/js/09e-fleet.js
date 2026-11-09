/* ===================== FLEET 2: 승하차·공병전차·새 병종 운용·병과별 증원 메뉴 =====================
   병종 수치는 05c2-fleet. 여기서는 나머지를 한다(모든 표가 만들어진 뒤에 읽혀야 해서 09번대).
   1) 표 채우기: 새 병종이 아직 없는 표(사거리·관통·장갑·소리·총구·탄약…)는 비슷한 병종(FLEET_BASE) 값을 빌리고, 실제 제원에 맞게 고친다.
   2) 승하차(실제 기계화 보병처럼, 손대지 않아도):
      - 장갑차·보병전투차를 증원하면 소총분대가 타고 온다.
      - 분대가 멀리(8칸 넘게) 가야 하고 근처에 적이 없는데 3칸 안에 빈 장갑차가 있으면, 걸어가 타고 장갑차가 목적지까지 태워 간다.
      - 적이 가까이 보이거나(8칸) 장갑차가 맞거나 크게 다치면 바로 뒤 램프로 내린다. 목적지에 닿거나, 적·거점 가까이에서 멈춰 서도 내린다.
      - 내린 분대는 걸어서 남은 길을 가고, 장갑차는 그 뒤에서 화력으로 받친다(06b aiArmsPos).
      - 장갑차가 부서지면 탄 분대는 다치며 뛰어내린다.
      - 사람도 [탑승]·[하차] 버튼으로 직접 시킬 수 있다.
   3) 공병전차: 지나는 길의 적 방어물·잔해·불탄 차를 밀어 치우고 쟁기로 지뢰를 걷는다. 할 일이 없으면 가까운 아군 앞의 장애물을 찾아간다.
   4) 보병전투차는 서서 적 차량이 보이면 대전차미사일을 쏜다(2발, 보급 트럭이 다시 채움). 박격포 차량은 쏘고 나면 자리를 옮긴다.
   5) 증원 메뉴: 병과별(보병·기갑·기계화·포병·방공·드론·지원)로 묶고 위에 병과 칩을 둔다. 휴대폰은 칩이 가로로 밀리고 카드가 두 줄.
   6) AI도 같은 규칙으로 새 병종을 산다. */

/* ---------- 1) 표 채우기 ---------- */
const FLEET_TABLES=()=>[['VOLLEY',typeof VOLLEY==='object'?VOLLEY:null],['VEH',typeof VEH==='object'?VEH:null],['AIR_ACC',typeof AIR_ACC==='object'?AIR_ACC:null],
  ['VCREW',typeof VCREW==='object'?VCREW:null],['AMMO',typeof AMMO==='object'?AMMO:null],['LOAD',typeof LOAD==='object'?LOAD:null],['SUPF',typeof SUPF==='object'?SUPF:null],
  ['ARM',typeof ARM==='object'?ARM:null],['PEN',typeof PEN==='object'?PEN:null],['PEN_SH',typeof PEN_SH==='object'?PEN_SH:null],['SHELL_RK',typeof SHELL_RK==='object'?SHELL_RK:null],
  ['PV_CAP',typeof PV_CAP==='object'?PV_CAP:null],['BAE',typeof BAE==='object'?BAE:null],['HE',typeof HE==='object'?HE:null],['SEC',typeof SEC==='object'?SEC:null],
  ['WPN',typeof WPN==='object'?WPN:null],['GFXW',typeof GFXW==='object'?GFXW:null],['ESC_PREF',typeof ESC_PREF==='object'?ESC_PREF:null],['FORM_VEH',typeof FORM_VEH==='object'?FORM_VEH:null],
  ['WRK_KG',typeof WRK_KG==='object'?WRK_KG:null],
  ['MEN.mag',typeof MEN==='object'?MEN.mag:null],['MEN.rl',typeof MEN==='object'?MEN.rl:null],['MEN_N',typeof MEN_N==='object'?MEN_N:null],
  ['RANGE.d50',typeof RANGE==='object'?RANGE.d50:null],['RANGE.gl',typeof RANGE==='object'?RANGE.gl:null],['RANGE.vis',typeof RANGE==='object'?RANGE.vis:null],
  ...(typeof OPT==='object'?['vis','gl','therm','arc'].map(k=>['OPT.'+k,OPT[k]]):[]),
  ...(typeof REAL==='object'&&REAL.vsmk?[['REAL.vsmk',REAL.vsmk]]:[])];
for(const [nm,tb] of FLEET_TABLES()){if(!tb||typeof tb!=='object')continue;
  for(const [t,bases] of Object.entries(FLEET_BASE)){if(t in tb)continue;for(const b of bases){if(b in tb){const v=tb[b];tb[t]=Array.isArray(v)?v.slice():v&&typeof v==='object'?JSON.parse(JSON.stringify(v)):v;break;}}}}
/* 실제 제원에 맞게 고친다 */
{const set=(tb,o)=>{if(tb&&typeof tb==='object')Object.assign(tb,o);};
 // 장갑(균질압연강판 환산 mm: 정면, 측면, 후면, 상부)
 set(typeof ARM==='object'&&ARM,{bmp:[45,28,16,12],cev:[550,90,50,40],spaa:[22,15,12,10],mortv:[20,14,10,8]});
 // 관통력: 25~40mm 날개안정분리탄, 열압력탄은 장갑에 약함, 공병전차·자주대공포는 기관총·기관포
 set(typeof PEN==='object'&&PEN,{bmp:80,cev:25,spaa:40,tb:120});
 set(typeof PEN_SH==='object'&&PEN_SH,{mortv:[22,160]});set(typeof SHELL_RK==='object'&&SHELL_RK,{mortv:1.7});   // 120mm 고폭탄 약 20m
 set(typeof WRK_KG==='object'&&WRK_KG,{mortv:2.2});
 set(typeof VEH==='object'&&VEH,{bmp:{hl:.28,hw:.14,trav:60,tol:8,trk:1},cev:{hl:.37,hw:.16,trav:60,tol:12,trk:1},spaa:{hl:.28,hw:.14,trav:90,tol:10,trk:1},mortv:{hl:.29,hw:.12,trav:45,tol:10}});
 set(typeof AIR_ACC==='object'&&AIR_ACC,{spaa:.72,bmp:.32,cev:.15});
 set(typeof VCREW==='object'&&VCREW,{bmp:3,cev:3,spaa:3,mortv:4});
 set(typeof AMMO==='object'&&AMMO,{bmp:40,cev:60,spaa:50,mortv:12,tb:6});set(typeof LOAD==='object'&&LOAD,{bmp:18,cev:8,spaa:16,mortv:24,tb:10});
 set(typeof SUPF==='object'&&SUPF,{bmp:.6,spaa:.6,cev:.5});
 set(typeof VOLLEY==='object'&&VOLLEY,{bmp:3,cev:4,spaa:8,mortv:1,tb:1});
 set(typeof RANGE==='object'&&RANGE.d50,{bmp:16,cev:8,spaa:14,tb:6});set(typeof RANGE==='object'&&RANGE.gl,{bmp:3,spaa:3});
 if(typeof OPT==='object'){set(OPT.vis,{bmp:12,cev:10,spaa:12,mortv:8,tb:14});set(OPT.therm,{bmp:1});}
 if(typeof SEC==='object'){SEC.bmp=[{id:'coax',n:'동축 기관총',w:'coax',fx:'mg',atk:6,k:6,cd:1.1,rng:6,tur:1}];
   SEC.cev=[];SEC.spaa=[];SEC.mortv=[{id:'roof',n:'지붕 기관총',w:'hmg',fx:'hmv',atk:5,k:3,cd:1.6,rng:3,open:1,self:1}];}
 if(typeof HE==='object'){HE.bmp={rad:.3,pk:.45};HE.spaa={rad:.2,pk:.35};}
 if(typeof MEN_N==='object')MEN_N.tb=3;if(typeof SQUAD==='object')SQUAD.tb=3;
 if(typeof MEN==='object'){MEN.mag.tb=1;MEN.rl.tb=5;}
 if(typeof GFXW==='object'){GFXW.spaa={n:8,gap:.04,tr:2,v:85,fl:.11,sm:.1,im:2,he:.6,brass:1};GFXW.cev={...GFXW.hmv};}
 if(typeof WPN==='object'){WPN.spaa={...WPN.zu,vol:1.35};WPN.cev={...WPN.hmv};WPN.tb={...WPN.at};}
 if(typeof READ==='object'&&READ.ty)Object.assign(READ.ty,{bmp:'보전차',ifv:'장갑차',cev:'공병전차',spaa:'대공포',mortv:'박격포차',tb:'열압력'});
 if(typeof VOX_CS==='object')Object.assign(VOX_CS,{bmp:'보전차 #호',cev:'공병전차 #호',spaa:'대공 #호',mortv:'박격포 #호',tb:'화염 #조'});
 if(typeof VOX_CS_EN==='object')Object.assign(VOX_CS_EN,{bmp:'Bradley #',cev:'Dozer #',spaa:'Shilka #',mortv:'Mortar Track #',tb:'Thermo #'});
 if(typeof VOX_TN_EN==='object')Object.assign(VOX_TN_EN,{bmp:'B-M-P',cev:'engineer vehicle',spaa:'flak track',mortv:'mortar carrier',tb:'thermobaric team'});
 if(typeof ESC_PREF==='object'){ESC_PREF.bmp=2;delete ESC_PREF.cev;delete ESC_PREF.spaa;delete ESC_PREF.mortv;}
 if(typeof FORM_VEH==='object'){FORM_VEH.bmp=1;delete FORM_VEH.cev;delete FORM_VEH.spaa;delete FORM_VEH.mortv;}
 }
// 대공 규칙 표(05f3-aa, 다른 작업에서 들어옴)가 있으면 자주대공포는 대공포 차량 값을 빌려 조금 낫게
if(typeof AA==='object'&&AA&&AA.gun&&AA.gun.zu&&!AA.gun.spaa){const z=AA.gun.zu;AA.gun.spaa=Array.isArray(z)?z.map((v,i)=>i===0?v*1.15:i===1?Math.min(.95,v*1.2):v):JSON.parse(JSON.stringify(z));}
if(UT.zu&&UT.zu.atk.air>UT.spaa.atk.air)UT.spaa.atk.air=Math.round(UT.zu.atk.air*1.15);
/* 실제 장비 이름을 설명 앞에 */
for(const t of Object.keys(FLEET_REAL)){const u=UT[t];if(!u||u._real)continue;const r=FLEET_REAL[t].filter(Boolean);if(!r.length)continue;u._real=1;
  u.desc=`[${r[0]===r[1]||r.length<2?r[0]:r.join(' / ')}] `+u.desc;}
/* 공병전차 이동 규칙: 방어물·잔해·차는 밀고 지나가고(느리게), 벙커·컨테이너 더미·건물·물은 못 지난다 */
for(const [k,r] of Object.entries(NAV_RULE))r.dz=k==='bunker'||k==='cont'||k==='aid'?2:(r.trk===0&&r.veh===0?0:1);

/* ---------- 2) 승하차 ---------- */
const FLEET={ride:8,near:3,danger:8,hide:{fleet:1}};
const paxOf=v=>v&&v.pax||[];
const paxMen=u=>(typeof menN==='function'?menN(u.type):4);
const canRide=u=>{const t=UT[u.type];return !!t&&t.cls==='inf'&&!t.ind&&!t.fly&&u.type!=='mortar';};
const carryRoom=(v,u)=>{const C=CARRY[v.type];if(!C)return false;return paxOf(v).reduce((a,p)=>a+paxMen(p),0)+paxMen(u)<=C.cap;};
function fleetPathLeft(u){const P=u.path;if(!P||!P.length)return 0;let x=u.x,z=u.z,s=0;for(const p of P){s+=Math.hypot(p[0]-x,p[1]-z);x=p[0];z=p[1];}return s;}
/* 이 세력이 아는 지상 적이 (x,z) R칸 안에 있나 */
function fleetFoe(n,x,z,R){for(const e of G.units){if(!hostile(e.nat,n)||UT[e.type].fly)continue;if(Math.abs(e.x-x)>R||Math.abs(e.z-z)>R)continue;if(Math.hypot(e.x-x,e.z-z)>R)continue;if(G.fog&&!seen(e,n))continue;return e;}return null;}
/* 내릴 자리: 뒤 램프 쪽부터 */
function fleetSpot(v,u,i){const h=((v.hd??v.face??0)+180)*Math.PI/180;
  for(const R of [.42,.6,.8,1.05])for(let k=0;k<12;k++){const a=h+(k%2?1:-1)*Math.ceil(k/2)*.42+(i||0)*.35;const x=v.x+Math.cos(a)*R,z=v.z+Math.sin(a)*R;
    const t=tileAt(x,z);if(!t||t.t==='water'||t.t==='bldg')continue;if(typeof walkable==='function'&&!walkable(u,x,z))continue;return [x,z];}
  return [v.x,v.z];}
/* 태우기 */
function fleetEmbark(u,v){if(!G.units.includes(u)||!G.units.includes(v)||!carryRoom(v,u))return false;
  G.units=G.units.filter(o=>o!==u);v.pax=v.pax||[];v.pax.push(u);
  u.board=null;u.path=[];u.tgt=null;u.tgtTile=null;u.dest=null;u.cqb=null;u.job=null;u.supp=0;u.x=v.x;u.z=v.z;u.r=Math.floor(v.z);u.c=Math.floor(v.x);
  if(typeof UI==='object'){if(UI.sel===u){UI.sel=null;UI.phase=null;}if(UI.group)UI.group=UI.group.filter(o=>o!==u);}
  if(!aiRun(u.nat)||!G.fog)L(`${natName(u.nat)} ${UT[u.type].n} ${UT[v.type].n}에 탑승`);bump();return true;}
/* 내리기. why: contact(적)·hit(피격)·arrive(도착)·order(명령)·bail(격파) */
function fleetUnload(v,why){const P=paxOf(v);if(!P.length)return null;const out=[];
  P.forEach((u,i)=>{const [x,z]=fleetSpot(v,u,i);u.x=x;u.z=z;u.r=Math.floor(z);u.c=Math.floor(x);u.face=((v.hd??v.face??0)+180)%360;
    u.path=[];u.dest=null;u.tgt=null;u.done=false;u.moved=false;u.board=null;if(u.pq==null&&v.pq!=null)u.pq=v.pq;
    try{delete u._men;}catch(e){}u._tr=null;G.units.push(u);out.push(u);if(FXH.land)try{FXH.land(u);}catch(e){}});
  v.pax=[];const F=v.ferry;v.ferry=null;v._dmT=G.time||0;
  // 도착해서 내렸으면 남은 길을 걸어간다
  if(F&&F.dest&&why!=='contact'&&why!=='hit'&&why!=='bail')for(const u of out)if(Math.hypot(F.dest[0]-u.x,F.dest[1]-u.z)>1){u.path=pathPts(u,F.dest[0],F.dest[1]);u.dest=F.dest.slice();}
  if(why==='contact'||why==='hit')for(const u of out)u.supp=Math.max(u.supp||0,.6);
  if(!aiRun(v.nat)||!G.fog)L(`${natName(v.nat)} ${UT[v.type].n}에서 ${out.map(u=>UT[u.type].n).join('·')} 하차${why==='contact'?' (적 발견)':why==='hit'?' (피격)':''}`);
  bump();return out[0]||null;}
/* 걸어가 타기 시작 */
function fleetBoard(u,v,dest){if(!carryRoom(v,u))return false;u.board={id:v.id,t:G.time||0};u.path=pathPts(u,v.x,v.z);u.dest=null;u.tgt=null;
  v.ferry=v.ferry||{dest:null,wait:0,ids:[]};if(dest&&!v.ferry.dest)v.ferry.dest=dest.slice();v.ferry.ids.push(u.id);v.ferry.wait=(G.time||0)+12;v.path=[];return true;}
function fleetCancel(u){if(!u.board)return;const v=uById(u.board.id);u.board=null;if(v&&v.ferry){v.ferry.ids=v.ferry.ids.filter(i=>i!==u.id);if(!v.ferry.ids.length&&!paxOf(v).length)v.ferry=null;}}
/* 가장 가까운, 태울 수 있는 우리 장갑차 */
function fleetCarrier(u,R){let best=null,bd=R;for(const v of G.units){if(v.nat!==u.nat||!CARRY[v.type]||v.hold&&!aiRun(v.nat))continue;if(!carryRoom(v,u))continue;
  if(v.hp<hpMax(v)*.5||(v.vd&&v.vd.mob))continue;if(v._dmT!=null&&v._dmT>(G.time||0)-6)continue;if(v.ferry&&v.ferry.go)continue;
  const d=Math.hypot(v.x-u.x,v.z-u.z);if(d<bd){bd=d;best=v;}}return best;}
function fleetTick(dt){if(!G||!G.units)return;const now=G.time||0;
  // 장갑차
  for(const v of G.units.slice()){if(!CARRY[v.type]||!G.units.includes(v))continue;const P=paxOf(v);
    for(const p of P){p.x=v.x;p.z=v.z;p.r=v.r;p.c=v.c;}
    // 탈 분대를 기다리다가 다 탔거나 시간이 지나면 출발
    const F=v.ferry;
    if(F&&!F.go){const live=F.ids.filter(id=>{const u=uById(id);return u&&u.board&&u.board.id===v.id;});F.ids=live;
      if(!live.length&&!P.length){v.ferry=null;continue;}
      if(live.length&&now<F.wait){v.path=[];v._stopT=null;continue;}
      for(const id of live){const u=uById(id);if(u)fleetCancel(u);}
      if(!paxOf(v).length){v.ferry=null;continue;}
      if(!F.dest){v.ferry=null;v._stopT=null;continue;}   // 목적지 없이 탔다(사람이 [탑승]): 다음 명령까지 태운 채로
      F.go=1;v.path=pathPts(v,F.dest[0],F.dest[1]);v.dest=F.dest.slice();v._stopT=null;continue;}
    if(P.length){
      const foe=fleetFoe(v.nat,v.x,v.z,FLEET.danger);const hit=(v._hitT||-9)>now-1.5;
      if(foe||hit||v.hp<hpMax(v)*.45){fleetUnload(v,foe?'contact':'hit');continue;}
      const moving=v.path&&v.path.length;if(moving){v._stopT=null;continue;}
      if(v._stopT==null){v._stopT=now;continue;}
      if(now-v._stopT<2.5)continue;
      if(v.ferry&&v.ferry.go){fleetUnload(v,'arrive');continue;}
      // 멈춰 섰다: 적이 가깝거나(14칸) 거점 옆이면 내린다. 집결지에서 기다릴 때는 태운 채로
      const nearObj=G.objs.some(o=>Math.hypot(o.c+.5-v.x,o.r+.5-v.z)<3.2);
      if(nearObj||fleetFoe(v.nat,v.x,v.z,14))fleetUnload(v,'arrive');
      continue;}}
  // 타러 가는 분대
  for(const u of G.units.slice()){if(!u.board)continue;const v=uById(u.board.id);
    if(!v||!carryRoom(v,u)||now-u.board.t>14){fleetCancel(u);continue;}
    if(Math.hypot(v.x-u.x,v.z-u.z)<.85){fleetEmbark(u,v);if(v.ferry&&!v.ferry.ids.some(id=>{const o=uById(id);return o&&o.board;}))v.ferry.wait=Math.min(v.ferry.wait,now+1);continue;}
    if(!u.path||!u.path.length){if((u._bp||0)<now){u._bp=now+1.5;u.path=pathPts(u,v.x,v.z);}}}
  // 멀리 가는 분대는 근처 빈 장갑차를 탄다(1초에 한 번)
  if((G._flT||0)>now)return;G._flT=now+1;
  for(const u of G.units.slice()){if(!canRide(u)||u.board||u.hold||u.cqb||u.climb||u.job||u.post||!u.path||!u.path.length)continue;
    if(inside(u)&&cell(u.r,u.c).t==='bldg'&&(u.flT||0)>0)continue;
    if(u.man!=null&&typeof autoManual==='function'&&autoManual(u))continue;   // 부관 지휘 중 사람이 콕 집어 걸어가라 한 부대는 그대로([탑승] 버튼은 됨)
    if(fleetPathLeft(u)<FLEET.ride)continue;const end=u.path[u.path.length-1];
    if(fleetFoe(u.nat,u.x,u.z,9)||fleetFoe(u.nat,end[0],end[1],4))continue;
    const v=fleetCarrier(u,FLEET.near);if(!v||fleetFoe(v.nat,v.x,v.z,9))continue;
    if(v.ferry&&v.ferry.dest&&Math.hypot(v.ferry.dest[0]-end[0],v.ferry.dest[1]-end[1])>3)continue;
    fleetBoard(u,v,end);}}
{const _rt=rtTick;rtTick=function(dt){const r=_rt.apply(this,arguments);if(G&&!G.over)try{fleetTick(dt);cevTick(dt);bmpTick(dt);mortvTick(dt);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}return r;};}
// 맞으면 기억해 둔다(탄 분대가 내린다)
{const _h=harm;harm=function(u,amt,by,o){if(u&&CARRY[u.type]&&amt>0&&u.pax&&u.pax.length)u._hitT=G.time||0;return _h.apply(this,arguments);};}
// 장갑차가 부서지면 탄 분대가 다치며 뛰어내린다
{const _k=kill;kill=function(u,by){if(u&&u.pax&&u.pax.length&&G.units.includes(u)){const P=u.pax.slice();fleetUnload(u,'bail');
    for(const p of P){if(!G.units.includes(p))continue;p.supp=3;harm(p,Math.round(p.hp*(.25+Math.random()*.4)*10)/10,null,{kind:'blast',x:u.x,z:u.z,rad:.5});}
    L(`${natName(u.nat)} ${UT[u.type].n} 격파, 탄 분대 탈출`);}
  return _k.apply(this,arguments);};}
// 증원: 장갑차·보병전투차는 분대를 태우고 온다
{const _b=buy;buy=function(n,type,r,c){const v=_b.apply(this,arguments);const C=v&&CARRY[type];
  if(C&&C.with&&UT[C.with]){const u=mkUnit(n,C.with,r,c);u.done=true;G.units=G.units.filter(o=>o!==u);v.pax=[u];u.x=v.x;u.z=v.z;}return v;};}
// 타러 가거나 태워 가는 부대는 다른 AI 판단이 데려가지 않는다. 사람이 다른 명령을 주면 탑승을 그만둔다
{const _ai=aiThink;aiThink=function(n){const hid=[];
  for(const u of G.units)if(u.nat===n&&!u.job&&(u.board||(u.ferry&&(u.ferry.go||u.ferry.ids.length))||u._cevJ)){u.job=FLEET.hide;hid.push(u);}
  try{return _ai.apply(this,arguments);}finally{for(const u of hid)if(u.job===FLEET.hide)u.job=null;}};}
{const man=f=>function(u){if(u){if(u.board)fleetCancel(u);if(u.ferry){u.ferry.ids.forEach(id=>{const o=uById(id);if(o)fleetCancel(o);});u.ferry=null;}u._cevJ=null;}return f.apply(this,arguments);};
 orderMoveTo=man(orderMoveTo);orderStop=man(orderStop);orderAttack=man(orderAttack);}
/* 사람: [탑승]·[하차] */
function fleetBoardNear(u){const v=fleetCarrier(u,6);if(!v)return false;return fleetBoard(u,v,null);}

/* ---------- 3) 공병전차 ---------- */
const CEV={clr:.3,seek:10,front:5};
/* 밀어 치울 수 있는 것 목록 [{x,z,k,o}] (적이 놓은 방어물·지뢰는 이 세력이 알아야 한다) */
function cevJobs(n){const J=[];
  for(const f of G.forts||[]){if(f.prog<1||f.nat===n||f.k==='bunker'||f.k==='aid'||f.k==='fortb'||f.k==='trench')continue;if(f.k==='mine'&&!(typeof mineSeen==='function'&&mineSeen(f,n)))continue;J.push({x:f.x,z:f.z,k:'fort',o:f});}
  for(const d of G.debris||[])J.push({x:d.x,z:d.z,k:'deb',o:d});
  for(const c of G.covers||[])if(c.kind==='wreck'&&c.cov!=null&&!c.fort)J.push({x:c.x,z:c.z,k:'wreck',o:c});
  return J;}
/* 지나가며 치운다 */
function cevClear(u){let nav=false;const R=CEV.clr;
  for(const f of (G.forts||[]).slice()){if(f.prog<1||f.nat===u.nat||f.k==='bunker'||f.k==='aid'||f.k==='fortb')continue;const d=Math.hypot(f.x-u.x,f.z-u.z);
    if(f.k==='mine'){if(d<.42){fortRemove(f,'clear');if(!aiRun(u.nat)||!G.fog)L(`${natName(u.nat)} 공병전차 지뢰 개척`);}continue;}
    if(d<R+FORT[f.k].len/2&&inBox(fortShape(f),u.x,u.z,R))fortRemove(f,'crush');}
  if(G.debris&&G.debris.length){const keep=G.debris.filter(d=>!inBox(d,u.x,u.z,R));if(keep.length!==G.debris.length){G.debris=keep;nav=true;}}
  for(const c of G.covers||[])if(c.kind==='wreck'&&c.cov!=null&&!c.fort&&Math.hypot(c.x-u.x,c.z-u.z)<R+.12){c.cov=null;c.h=0;nav=true;}
  for(const p of G.props||[]){if(p.dead||Math.abs(p.x-u.x)>.5||Math.abs(p.z-u.z)>.5)continue;
    if(p.k==='car'&&inBox({x:p.x,z:p.z,ry:p.ry,hl:CAR_KIND_L[p.kind]/2,hw:CAR_KIND_W[p.kind]/2},u.x,u.z,.12)){if(typeof wrkPropSet==='function'&&wrkPropSet(p,p.crush?'dead':'crush'))nav=true;}
    else if((p.k==='barrier'||p.k==='bin')&&Math.hypot(p.x-u.x,p.z-u.z)<R){if(typeof wrkPropSet==='function'&&wrkPropSet(p,'dead'))nav=true;}}
  if(nav){if(typeof wrkNav==='function')wrkNav();else{G.navV=(G.navV||0)+1;bump();}}}
{const _c=fortCrush;fortCrush=function(u){if(u&&UT[u.type]&&UT[u.type].dozer){try{cevClear(u);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}}return _c.apply(this,arguments);};}
// 지뢰: 공병전차 쟁기는 밟기 전에 걷어 낸다(아직 모르는 지뢰도)
{const _m=mineTick;mineTick=function(dt){for(const u of G.units)if(UT[u.type].dozer&&G.forts)for(const f of G.forts.slice())if(f.k==='mine'&&f.prog>=1&&f.nat!==u.nat&&Math.hypot(f.x-u.x,f.z-u.z)<.42){fortRemove(f,'clear');if(!aiRun(u.nat)||!G.fog)L(`${natName(u.nat)} 공병전차 지뢰 개척`);}
  return _m.apply(this,arguments);};}
/* 할 일 찾기: 우리 전투 부대 앞(5칸 안)에 있는 장애물 중 가까운 것. 대전차 위협이 가까우면 가지 않는다 */
function cevTick(dt){const now=G.time||0;
  for(const u of G.units){if(!UT[u.type].dozer)continue;if(u._cevJ&&(u._cevJ.t<now-25||!(u.path&&u.path.length))){u._cevJ=null;}
    if(!selfRun(u)||u.hold||(u.path&&u.path.length)||(u._cvT||0)>now)continue;u._cvT=now+2;
    const mine=G.units.filter(o=>o.nat===u.nat&&o!==u&&!UT[o.type].fly&&!SELF_RUN[o.type]);
    let best=null,bs=-1e9;
    for(const j of cevJobs(u.nat)){const d=Math.hypot(j.x-u.x,j.z-u.z);if(d>CEV.seek)continue;let fr=99;for(const o of mine){const q=Math.hypot(o.x-j.x,o.z-j.z);if(q<fr)fr=q;}
      if(fr>CEV.front)continue;
      if(G.units.some(e=>hostile(e.nat,u.nat)&&(e.type==='at'||e.type==='atgm'||e.type==='tank'||e.type==='tb')&&Math.hypot(e.x-j.x,e.z-j.z)<5&&(!G.fog||seen(e,u.nat))))continue;
      const s=-d-fr*.8+(j.k==='fort'?3:0);if(s>bs){bs=s;best=j;}}
    if(best){u.path=pathPts(u,best.x,best.z);u.dest=[best.x,best.z];u._cevJ={t:now,k:best.k};}}}

/* ---------- 4) 보병전투차 대전차미사일, 박격포 차량 사격 후 이동 ---------- */
const BMP_ATGM={n:2,cd:14,rng:22};
function bmpTick(dt){const now=G.time||0;
  for(const u of G.units){if(u.type!=='bmp')continue;if(u.atg==null)u.atg=BMP_ATGM.n;
    if(u.atg<BMP_ATGM.n&&(u._atgR||0)<now&&typeof atDepot==='function'&&atDepot(u)){u.atg++;u._atgR=now+20;}
    if(u.atg<=0||(u.path&&u.path.length)||(u._atgT||0)>now||u.climb)continue;
    if(u.vd&&u.vd.gun)continue;
    let best=null,bs=0;const [ax,az]=posOf(u);
    for(const e of G.units){if(!hostile(e.nat,u.nat)||UT[e.type].cls!=='veh'||UT[e.type].fly)continue;const d=Math.hypot(e.x-u.x,e.z-u.z);if(d<3||d>BMP_ATGM.rng)continue;
      if(G.fog&&!seen(e,u.nat))continue;const [ex,ez]=posOf(e);if(!losPt(ax,az,eye(u)+.15,ex,ez,eye(e)))continue;
      const s=(UT[e.type].cost||4)*(e.type==='tank'?2:1)/(4+d);if(s>bs){bs=s;best=e;}}
    if(!best){u._atgT=now+1;continue;}
    const P=Object.create(u);P.type='atgm';atgmShoot(P,best);u.firedT=now;u.atg--;u._atgT=now+BMP_ATGM.cd;
    if(!aiRun(u.nat)||!G.fog)L(`${natName(u.nat)} 보병전투차 대전차미사일 발사`);}}
// 박격포 차량: 쏘고 나서 1~2칸 옮긴다(대포병 사격 피하기). 사람이 '고수'를 걸면 그대로
function mortvTick(dt){const now=G.time||0;
  for(const u of G.units){if(u.type!=='mortv'||!selfRun(u)||u.hold)continue;
    if(u.firedT&&u.firedT>(u._mvF||0)&&now-u.firedT>2.5&&!(u.path&&u.path.length)){u._mvF=u.firedT;
      for(let k=0;k<10;k++){const a=Math.random()*6.283,R=1+Math.random();const x=u.x+Math.cos(a)*R,z=u.z+Math.sin(a)*R;const t=tileAt(x,z);if(!t||t.t==='bldg'||t.t==='water')continue;
        if(fleetFoe(u.nat,x,z,6))continue;u.path=pathPts(u,x,z);if(u.path&&u.path.length)break;}}}}

/* ---------- 6) AI: 새 병종도 산다 ---------- */
if(typeof ARMS_MIX==='object'){ARMS_MIX.ifv=.1;ARMS_MIX.bmp=.09;ARMS_MIX.tb=.03;ARMS_MIX.mortv=.03;ARMS_MIX.cev=.02;ARMS_MIX.rifle=Math.max(.2,ARMS_MIX.rifle-.02);}
// 비싼 차량을 고르고 돈을 모으기로 했으면, 다음에 생각할 때도 같은 것을 노린다(매번 다시 뽑으면 모은 돈이 싼 것에 새어 나가 차량을 거의 못 샀다)
if(typeof aiArmsSave==='function'){const _s=aiArmsSave;aiArmsSave=function(n,pick,total){const r=_s.apply(this,arguments);const N2=G.nats[n];
  if(r&&UT[pick]&&UT[pick].cls==='veh'&&!(N2._sv&&N2._sv.until>(G.time||0)))N2._sv={t:pick,until:(G.time||0)+75};return r;};}
{const _b2=buy;buy=function(n,type){const u=_b2.apply(this,arguments);if(u&&G.nats[n]&&G.nats[n]._sv&&G.nats[n]._sv.t===type)G.nats[n]._sv=null;return u;};}
if(typeof ARMS_VEH==='object'&&!ARMS_VEH.includes('bmp'))ARMS_VEH.push('bmp');
if(typeof aiArmsW==='function'){const _w=aiArmsW;aiArmsW=function(n,E,cnt,total){const w=_w.apply(this,arguments);
  // 공병전차: 적 방어물·지뢰가 보이면 하나
  const obs=cevJobs(n).filter(j=>j.k==='fort').length;w.cev=cnt('cev')>=1?0:obs>=2?.25:w.cev||0;
  // 자주대공포: 적 비행체가 보이면(대공 셋 상한은 05f가 센다)
  const eAir=E.filter(e=>UT[e.type].fly).length;w.spaa=cnt('spaa')>=1?0:eAir>=2?.5:eAir?.2:0;
  // 열압력: 건물 안 적이 많을 때
  const eIn=E.filter(e=>!UT[e.type].fly&&cell(e.r,e.c).t==='bldg').length;if(w.tb!=null&&eIn>=3)w.tb*=1.8;
  // 기계화 보병: 장갑차를 부르면 분대도 같이 오니, 소총분대가 모자란 만큼 장갑차 쪽으로 돌린다
  const mech=cnt('ifv')+cnt('bmp');if(total>=4&&mech<3){for(const t of ['ifv','bmp'])if(w[t])w[t]*=2.2-mech*.4;if(w.rifle)w.rifle*=.8;}
  if(total<6){for(const t of ['bmp','mortv','cev'])if(w[t])w[t]*=.3;}
  const S=G.nats[n]._sv;if(S&&S.until>(G.time||0)&&w[S.t]>0)return {[S.t]:1};
  return w;};}

/* ---------- 화면: 탑승 표시, 버튼, 병과별 증원 메뉴 ---------- */
if(typeof v3UnitTag==='function'){const _ut=v3UnitTag;v3UnitTag=function(u){const h=_ut(u);const P=paxOf(u);if(!P.length)return h;
  return h+`<em title="탄 부대: ${P.map(p=>UT[p.type].n).join(', ')}">탑승 ${P.reduce((a,p)=>a+paxMen(p),0)}</em>`;};}
if(typeof uInfo==='function'){const _ui=uInfo;uInfo=function(u){let s=_ui(u);const P=paxOf(u);
  if(CARRY[u.type])s+=P.length?` · 탑승 ${P.map(p=>UT[p.type].n).join('·')}`:u.ferry&&u.ferry.ids.length?' · 분대 기다리는 중':' · 빈 차(분대 태울 수 있음)';
  if(u.board)s+=' · 장갑차 타러 가는 중';if(u.type==='bmp')s+=` · 미사일 ${u.atg??BMP_ATGM.n}발`;if(u._cevJ)s+=' · 장애물 치우러 가는 중';return s;};}
const FL_BTN=s=>{if(!s||!G||!G.units.includes(s)||s.nat!==G.viewer)return '';
  if(CARRY[s.type]&&paxOf(s).length)return `<button class="btn sm" data-act="fl:unload" id="ab-dis-unload" title="탄 분대를 뒤 램프로 내립니다">하차</button>`;
  if(canRide(s)&&!s.board&&fleetCarrier(s,6))return `<button class="btn sm" data-act="fl:board" id="ab-dis-board" title="6칸 안의 빈 장갑차·보병전투차에 탑니다">탑승</button>`;
  if(s.board)return `<button class="btn sm primary" data-act="fl:stay" id="ab-dis-stay" title="타러 가기를 그만둡니다">탑승 취소</button>`;return '';};
if(typeof renderActbar==='function'){const _ra=renderActbar;renderActbar=function(){const r=_ra.apply(this,arguments);if(typeof document==='undefined'||!G)return r;
  try{const el=$('#actbar');const ab=el&&el.querySelector(':scope>.ab');const s=UI.sel;if(ab&&s&&(!UI.phase||UI.phase==='select')&&!el.querySelector('[id^="ab-dis-"]')){const h=FL_BTN(s);if(h)ab.insertAdjacentHTML('afterbegin',h);}}catch(e){}
  return r;};}
if(typeof document!=='undefined')document.addEventListener('click',e=>{const b=e.target.closest('[data-act^="fl:"],[data-act^="buybr:"]');if(!b||b.disabled||!G)return;const a=b.dataset.act;
  if(a.startsWith('buybr:')){UI.buyBr=a.slice(6);try{localStorage.setItem('triad-buybr',UI.buyBr);}catch(_){}render();return;}
  if(G.over||isAI(G.viewer))return;const s=UI.sel;if(!s||!G.units.includes(s))return;
  if(a==='fl:unload'){if(fleetUnload(s,'order'))toast('분대 하차');render();return;}
  if(a==='fl:board'){if(fleetBoardNear(s))toast('가까운 장갑차로 가서 탑니다');else toast('6칸 안에 빈 장갑차가 없습니다');render();return;}
  if(a==='fl:stay'){fleetCancel(s);s.path=[];render();return;}});

/* 증원 메뉴: 병과 칩 + 병과별 카드 */
function buyCard(t,n,on){const u=UT[t];const C=CARRY[t];const tag=C?'분대 탑승':u.ind?'곡사':u.fly?'비행':u.logi?'자동':u.dozer?'길 개척':u.aa||u.atk.air>=8?'대공':u.atk.veh>=8?'대전차':'';
  const real=fleetReal(t,n);
  return `<button class="ucard bc" data-act="buy:${t}" id="buy-${t}" ${on?'':'disabled'} title="${u.desc}"><b>${u.n}</b><span class="bc-r">${real}</span><span class="bc-m"><small class="bc-c">${u.cost}</small>${tag?`<small class="bc-t">${tag}</small>`:''}</span></button>`;}
function buyMenu(n,ok){const N2=G.nats[n];let br=UI.buyBr;if(br==null){try{br=localStorage.getItem('triad-buybr');}catch(_){}br=br||'all';UI.buyBr=br;}
  const has=t=>UT[t]&&TYPES.includes(t)&&!UT[t].noBuy&&!(t==='vbied'&&!militia(n));
  const groups=BRANCH.map(b=>({...b,ts:b.ts.filter(has)})).filter(b=>b.ts.length);
  const rest=TYPES.filter(t=>has(t)&&!BRANCH.some(b=>b.ts.includes(t)));if(rest.length)groups.push({k:'etc',n:'기타',d:'',ts:rest});
  if(br!=='all'&&!groups.some(g=>g.k===br))br='all';
  let h=`<div class="bbr" role="tablist">`+[{k:'all',n:'전체'},...groups].map(g=>`<button class="bbr-c" role="tab" data-act="buybr:${g.k}" aria-selected="${br===g.k}">${g.n}</button>`).join('')+`</div>`;
  for(const g of groups){if(br!=='all'&&br!==g.k)continue;const ts=g.ts.slice().sort((a,b)=>UT[a].cost-UT[b].cost);
    h+=`<div class="bgrp"><h4>${g.n}${g.d?` <small>${g.d}</small>`:''}</h4><div class="ulist bl">${ts.map(t=>buyCard(t,n,ok(t))).join('')}</div></div>`;}
  return h;}
if(typeof renderPanel==='function'){const _rp=renderPanel;renderPanel=function(){const r=_rp.apply(this,arguments);if(typeof document==='undefined'||!G||!UI.sheet||UI.tab!=='cmd')return r;
  try{const p=$('#panel');const ul=p&&p.querySelector('.ulist:not(.bl)');if(!ul)return r;const n=G.viewer;
    const ok=t=>{const b=ul.querySelector('#buy-'+t);return b?!b.disabled:false;};
    const was=p.scrollTop;const box=document.createElement('div');box.className='buym';box.innerHTML=buyMenu(n,ok);ul.replaceWith(box);p.scrollTop=was;}catch(e){}
  return r;};}
if(typeof document!=='undefined'&&!document.getElementById('fleet-css')){const st=document.createElement('style');st.id='fleet-css';
  st.textContent=`.bbr{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:2px 0 8px;position:sticky;top:-14px;z-index:1;background:var(--surface)}
.bbr::-webkit-scrollbar{display:none}
.bbr-c{flex:none;min-height:34px;padding:0 12px;border-radius:17px;border:1px solid var(--line);background:var(--raise);color:var(--ink);font:inherit;font-size:12.5px;cursor:pointer;white-space:nowrap}
.bbr-c[aria-selected="true"]{background:var(--ink);color:var(--surface);border-color:var(--ink);font-weight:600}
.bbr-c:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.bgrp{margin:4px 0 12px}
.bgrp h4{margin:0 0 6px;font-size:12.5px;font-weight:600;color:var(--ink)}
.bgrp h4 small{font-weight:400;color:var(--muted);font-size:11px;margin-left:4px}
.ulist.bl{grid-template-columns:repeat(auto-fill,minmax(104px,1fr))}
.ucard.bc{align-items:flex-start;text-align:left;padding:7px 8px;gap:2px;min-height:58px}
.ucard.bc b{font-size:12.5px;line-height:1.25}
.bc-r{font-size:10.5px;color:var(--muted);line-height:1.25;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
.bc-m{display:flex;gap:4px;align-items:center;margin-top:auto}
.bc-c{font-family:var(--font-m);font-size:11px!important;color:var(--ink)!important;background:var(--surface);border:1px solid var(--line);border-radius:4px;padding:0 4px}
.bc-t{font-size:10px!important}
@media (max-width:760px){.ulist.bl{grid-template-columns:repeat(2,minmax(0,1fr))}.bbr{top:-14px}}`;
  document.head.appendChild(st);}
