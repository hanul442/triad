/* ===================== DRILLS: 교범의 소대 전투 훈련 (공격·철수·제병협동) =====================
   06c-tactics(소대 두뇌)가 하던 '화력 기반 + 측면 + 돌격 + 후퇴'를 교범 순서대로 다듬는다.
   근거(공개 교범): FM 7-8 4장 전투 훈련(BD1 소대 공격, BD2 접적 대응, BD3 접촉 단절),
   ATP 3-21.8(보병 소대·분대, 2016) 공격·철수, FM 3-21.10(소총 중대: 예비대 투입),
   FM 3-06.11 4장(시가지 제병협동: 보병이 앞서고 전차가 감시·제압, 한자리에서 오래 쏘지 않기),
   FM 7-7 4장(기계화 소대: 하차 분대를 차량이 화력 기반으로 엄호), ATP 3-20.15(전차 소대: 감시 진지·차체 은폐).

   1) 지원 사격 먼저: 화력 기반(기관총 등)이 자리를 잡고 실제로 쏘기 시작한 뒤에야 측면조가 움직인다
      (BD1: "base-of-fire element is set first"). 그 전까지 측면조는 엄폐에서 기다리며 쏜다. 최대 10초.
   2) 예비대: 네 분대 소대는 하나를 화력 기반 뒤에 예비로 남겼다가 돌격이 시작되거나, 분대를 잃거나,
      교전이 40초 넘게 끌리면 투입한다.
   3) 사격 전환·중지: 아군 돌격조가 표적에 2.5칸(약 30m) 안으로 붙으면, 다른 아군은 그 표적 대신
      뒤쪽(종심)의 다른 적을 쏜다. 다른 적이 없고 아군이 1.5칸 안이면 사격을 멈춘다(lift/shift fire).
   4) 횡대 돌격: 돌격조는 한 점으로 몰려가지 않고 적을 향해 옆으로 1칸씩 벌려 늘어서서 들어간다.
   5) 포격 직후 돌격: 우리 포탄이 초점 적 1.6칸 안에 떨어지고 그친 지 10초 안이면, 적이 고개를 들기 전에 돌격한다.
   6) 교대 철수(BD3 접촉 단절): 불리해 물러날 때 한꺼번에 등을 보이지 않는다. 적과 먼 반이 먼저 3칸 물러나
      엄폐에 자리 잡는 동안 가까운 반(기관총 포함)이 쏘며 버티고, 그다음 서로 바꾼다. 첫 이동 때 연막을 친다.
   7) 소대 접적 정지(BD2): 한 분대가 적을 보고 엄폐로 멈추면 2초 안에 6칸 안 같은 소대 분대도 이동을 멈추고 엄폐에 붙는다.
   8) 차량 화력 지원: 근처(6칸)에 노는 전차·장갑차·험비는 접적한 소대에 붙어 화력 기반이 된다.
      보병 앞으로 나가지 않고, 알려진 대전차 화기에서 4칸 넘게 떨어진, 초점 적이 보이는 엄폐 자리에서 초점 적을 먼저 쏜다.
   9) 대전차 진지 변환: 대전차 로켓을 쏜 분대는 후폭풍·섬광으로 들켰으니 곧 0.6~1.4칸 옆 다른 엄폐로 옮긴다.
   AI와 부관(자동) 세력만. 사람이 직접 찍은 명령·고수·건물 소탕·호송 중인 부대는 건드리지 않는다. 1칸 ≈ 12m. */
const DR={sbfWait:10,sbfFire:4,resT:40,shift:2.5,lift:1.5,line:1.0,art:{r:1.6,lift:1.2,win:10},
  brk:{leg:3,max:30,n:3,turn:12},halt:{r:6},veh:{r:6,stand:4,max:2,rel:10,life:70},scoot:{d:.6,r:[.6,1,1.4]}};
const drNow=()=>G.time||0;
function drN(k){if(typeof tacN==='function')tacN('dr_'+k);}
const drFree=u=>!u.hold&&!u.cqb&&!u.post&&!u.esc&&!u.rearm&&!u.climb&&u.towBy==null&&!(u.man!=null&&typeof autoManual==='function'&&autoManual(u));
/* ---------- 1) 2) 4) 5) 소대 공격 ---------- */
function drSbfOK(p,M,t){const B=M.filter(u=>p.roles&&p.roles[u.id]==='bof');if(!B.length)return true;
  if(t-(p.stT??t)>DR.sbfWait)return true;
  return B.some(u=>tacIdle(u)&&t-(u.firedT??-99)<DR.sbfFire);}
function drWaitCover(u,F,objs){if(!tacIdle(u))return;const t=drNow();if(t-(u.tk.at||0)<4)return;
  const s=tacSpot(u,u.x,u.z,[0,.35,.7],(x,z)=>tacCov(x,z,F.x,F.z,objs)*4-Math.hypot(x-u.x,z-u.z)*1.2);
  if(s&&Math.hypot(s[0]-u.x,s[1]-u.z)>.12)tacGo(u,s[0],s[1],u.tk.role);else u.tk.at=t;}
{const _c=tacContact;tacContact=function(p,M,K,objs,str,est){const t=drNow();
  if(p.human||!aiRun(p.nat))return _c(p,M,K,objs,str,est);
  // 기다리던 분대를 다시 측면조로 (화력 기반이 섰거나 돌격·투입 조건)
  const nM0=p._drN??M.length;const lost=M.length<nM0;p._drN=M.length;
  if(p.roles){const ok=drSbfOK(p,M,t);for(const u of M){const r=p.roles[u.id];
      if(r==='wait'&&(ok||p.st==='assault'))p.roles[u.id]='man';
      if(r==='res'&&(p.st==='assault'||lost||t-(p.stT??t)>DR.resT)){p.roles[u.id]='man';drN('reserve');}}}
  const st0=p.st,F0=p.rolesF;const before=new Map(M.map(u=>[u.id,u.tk.at]));
  _c(p,M,K,objs,str,est);
  if(!p.roles)return;const F=K.find(k=>k.id===p.foc);if(!F)return;
  // 역할이 새로 나뉘었으면: 예비대 하나, 화력 기반이 설 때까지 측면조는 대기
  if(p.rolesF!==F0||p._drR!==p.rolesF+':'+M.length){p._drR=p.rolesF+':'+M.length;
    const man=M.filter(u=>p.roles[u.id]==='man');
    if(man.length>=3&&p.st==='contact'){const r=man.slice().sort((a,b)=>Math.hypot(b.x-F.x,b.z-F.z)-Math.hypot(a.x-F.x,a.z-F.z))[0];p.roles[r.id]='res';drStop(r);drN('resHeld');}
    if(p.st==='contact'&&!drSbfOK(p,M,t))for(const u of man)if(p.roles[u.id]==='man'){p.roles[u.id]='wait';if(u.tk.at!==before.get(u.id))drStop(u);drN('sbfWait');}}
  // 대기·예비: 엄폐에 붙어 있는다(예비는 화력 기반 뒤)
  const B=M.filter(u=>p.roles[u.id]==='bof');
  for(const u of M){const r=p.roles[u.id];if(r==='wait'){u.tk.role='wait';drWaitCover(u,F,objs);}
    else if(r==='res'){u.tk.role='res';if(!tacIdle(u)||t-(u.tk.at||0)<6)continue;const c=B.length?[B.reduce((a,v)=>a+v.x,0)/B.length,B.reduce((a,v)=>a+v.z,0)/B.length]:[u.x,u.z];
      const dx=c[0]-F.x,dz=c[1]-F.z,L0=Math.hypot(dx,dz)||1;const ax=c[0]+dx/L0*1.2,az=c[1]+dz/L0*1.2;
      const s=tacSpot(u,ax,az,[0,.4,.8],(x,z)=>tacCov(x,z,F.x,F.z,objs)*5-tacExpo(x,z,K,objs,null)-Math.hypot(x-ax,z-az)*.6);
      if(s&&Math.hypot(s[0]-u.x,s[1]-u.z)>.3)tacGo(u,s[0],s[1],'res');else u.tk.at=t;}}
  // 5) 포격 직후 돌격
  if(p.st==='contact'&&st0==='contact'&&t-(p.asT??-99)>30&&t-p.stT>6&&drArtLift(F,t)){p.st='assault';p.stT=t;p.asT=t;tacN('assault');drN('artAssault');
    for(const u of M)if(p.roles[u.id]==='wait'||p.roles[u.id]==='res')p.roles[u.id]='man';}
  // 4) 횡대 돌격: 방금 돌격 명령을 받은 분대를 적 앞 가로줄로 벌린다
  const A=M.filter(u=>u.tk.role==='assault'&&u.tk.at===t);if(A.length>=2)drOnLine(A,F,K,objs);};}
function drStop(u){u.path=[];u.dest=null;u.tk.at=drNow()-99;}
function drArtLift(F,t){const A=G._art;if(!A||!A.length)return false;let last=-1e9;
  for(const s of A)if(Math.hypot(s.x-F.x,s.z-F.z)<DR.art.r&&s.n!==F.e.nat)last=Math.max(last,s.t);
  return t-last>=DR.art.lift&&t-last<=DR.art.win;}
function drOnLine(A,F,K,objs){const cx=A.reduce((a,u)=>a+u.x,0)/A.length,cz=A.reduce((a,u)=>a+u.z,0)/A.length;
  const dx=cx-F.x,dz=cz-F.z,L0=Math.hypot(dx,dz)||1;const ux=dx/L0,uz=dz/L0,px=-uz,pz=ux;
  const S=A.slice().sort((a,b)=>((a.x-cx)*px+(a.z-cz)*pz)-((b.x-cx)*px+(b.z-cz)*pz));
  S.forEach((u,i)=>{const off=(i-(S.length-1)/2)*DR.line;const ax=F.x+ux*1.5+px*off,az=F.z+uz*1.5+pz*off;
    const s=tacSpot(u,ax,az,[0,.3,.6],(x,z)=>tacCov(x,z,F.x,F.z,objs)*3-Math.hypot(x-ax,z-az)*2-tacExpo(x,z,K,objs,F)*.3);
    if(s)tacGo(u,s[0],s[1],'assault');});
  drN('line');}
/* ---------- 3) 사격 전환·중지 ---------- */
let DR_AS=[],DR_AST=-1,DR_ASG=null;
function drAsList(){const t=drNow();if(DR_AST!==t||DR_ASG!==G){DR_AST=t;DR_ASG=G;DR_AS=G.units.filter(o=>o.tk&&o.tk.role==='assault');}return DR_AS;}
function drAssaultNear(u,e,R){for(const o of drAsList())if(o.nat===u.nat&&o!==u&&Math.hypot(o.x-e.x,o.z-e.z)<R)return true;return false;}
{const _p=rtPick;rtPick=function(u){const b=_p(u);if(!b||!aiRun(u.nat)||UT[u.type].ind||UT[u.type].fly)return b;
  if(u.tk&&u.tk.role==='assault')return b;if(Math.hypot(b.x-u.x,b.z-u.z)<2)return b;   // 내 코앞 적은 쏜다
  if(!drAssaultNear(u,b,DR.shift))return b;
  const alt=typeof docPickOnly==='function'?docPickOnly(_p,u,z=>z.nat===u.nat||z!==b&&!drAssaultNear(u,z,DR.shift)):null;
  if(alt&&alt!==b&&alt.nat!==u.nat){drN('shift');return alt;}
  if(drAssaultNear(u,b,DR.lift)){drN('lift');return null;}
  return b;};}
/* ---------- 6) 교대 철수 ---------- */
{const _r=tacRetreat;tacRetreat=function(p,M,K,objs){if(p.human||!aiRun(p.nat)||M.length<2)return _r(p,M,K,objs);const t=drNow();
  if(p.st!=='retreat'){p.st='retreat';p.stT=t;tacN('retreat');if(!G.fog)L(`${natName(p.nat)} 소대 교대 철수`);}
  const dE=u=>{let m=1e9;for(const k of K)m=Math.min(m,Math.hypot(k.x-u.x,k.z-u.z));return m;};
  const S=M.slice().sort((a,b)=>dE(b)-dE(a));const h=Math.ceil(S.length/2);
  // 기관총은 가까운 반(마지막까지 엄호)
  let A=S.slice(0,h),Bn=S.slice(h);const mg=A.find(u=>u.type==='mg');if(mg&&Bn.length){const sw=Bn.find(u=>u.type!=='mg');if(sw){A=A.map(u=>u===mg?sw:u);Bn=Bn.map(u=>u===sw?mg:u);}}
  p._bk={A:A.map(u=>u.id),B:Bn.map(u=>u.id),ph:0,go:0,goT:t,n:0,smk:0};drN('brk');drBreak(p,M,K,objs);};}
function drBreak(p,M,K,objs){const t=drNow(),bk=p._bk;const ids=bk.ph?bk.B:bk.A;const mov=M.filter(u=>ids.includes(u.id)),cov=M.filter(u=>!ids.includes(u.id));
  const home=ccpOf(p.nat);
  if(!bk.go){for(const u of mov){const dx=home.x-u.x,dz=home.z-u.z,L0=Math.hypot(dx,dz)||1;const ax=u.x+dx/L0*DR.brk.leg,az=u.z+dz/L0*DR.brk.leg;
      const s=tacSpot(u,ax,az,[0,.6,1.2],(x,z)=>tacCov(x,z,x-dx,z-dz,objs)*5-tacExpo(x,z,K,objs,null)*1.2-Math.hypot(x-ax,z-az)*.4);if(s)tacGo(u,s[0],s[1],'ret');}
    for(const u of cov){u.tk.role='cover';}
    if(!bk.smk&&K.length){bk.smk=1;drSmokeScreen(cov.length?cov:mov,K);}
    bk.go=1;bk.goT=t;return;}
  if(mov.every(tacIdle)&&t-bk.goT>1.5||t-bk.goT>DR.brk.turn){bk.ph^=1;bk.go=0;bk.n++;drN('bound');}}
function drSmokeScreen(C,K){if(typeof popSmoke!=='function')return;for(const u of C){if(u.ssm==null)u.ssm=(REAL.ssmk||{})[u.type]||0;if(u.ssm<=0)continue;
    let f=null,fd=1e9;for(const k of K){const d=Math.hypot(k.x-u.x,k.z-u.z);if(d<fd){fd=d;f=k;}}if(!f)return;
    const sx=u.x+(f.x-u.x)/(fd||1)*.9,sz=u.z+(f.z-u.z)/(fd||1)*.9;const st=tileAt(sx,sz);
    if(st&&st.t!=='bldg'&&popSmoke(sx,sz,18)){u.ssm--;u._smT=drNow();if(typeof FXH.ssmoke==='function')FXH.ssmoke(u,sx,sz);tacN('smoke');drN('brkSmoke');return;}}}
{const _pl=tacPlatoon;tacPlatoon=function(p,K0,objs){if(p.st==='retreat'&&p._bk){const M=tacMembers(p);if(!M.length)return;const t=drNow();
    if(t-p.stT>DR.brk.max||p._bk.n>=DR.brk.n){p._bk=null;p.st='regroup';p.stT=t;return;}
    const K=K0.filter(k=>M.some(u=>Math.hypot(k.x-u.x,k.z-u.z)<TAC.near));drBreak(p,M,K,objs);return;}
  if(p._bk&&p.st!=='retreat')p._bk=null;
  return _pl(p,K0,objs);};}
/* ---------- 7) 소대 접적 정지 ---------- */
{const _re=tacReact;tacReact=function(u){const r0=u.tk&&u.tk.at;_re(u);if(!u.tk||u.tk.role!=='react'||u.tk.at===r0||!aiRun(u.nat))return;const t=drNow();
  const p=u.pl&&tacPl().find(q=>q.id===u.pl);if(!p||p.human||t-(p._haltT??-99)<6)return;p._haltT=t;let n=0;
  for(const o of tacMembers(p)){if(o===u||tacIdle(o)||!o.tk)continue;const rr=o.tk.role;if(rr!=='move'&&rr!=='bound')continue;if(Math.hypot(o.x-u.x,o.z-u.z)>DR.halt.r)continue;
    const objs=coverObjs(o);const s=tacSpot(o,o.x,o.z,[0,.3,.6],(x,z)=>coverAt(x,z,'inf',objs)*4-Math.hypot(x-o.x,z-o.z)*1.5);
    o.path=s&&Math.hypot(s[0]-o.x,s[1]-o.z)>.08?pathPts(o,s[0],s[1]):[];o.dest=null;o.tk.role='react';o.tk.at=t;n++;}
  if(n)drN('halt');};}
/* ---------- 8) 차량 화력 지원 ---------- */
const DR_HIDE={drv:1};
const DR_VEH={tank:1,ifv:1,hmv:1};
function drVehOK(v){return DR_VEH[v.type]&&drFree(v)&&!v._pj&&!v.msn&&!v.fol&&!v.lj&&(!v.job||v.job===DR_HIDE)&&!(v.pax&&v.pax.length)&&v.hp>=hpMax(v)*.4;}
function drVehThink(n){const t=drNow();const P=tacPl().filter(p=>p.nat===n&&!p.human&&(p.st==='contact'||p.st==='assault')&&p.foc!=null);
  // 풀어 주기
  for(const v of G.units){if(v.nat!==n||!v._sbf)continue;const p=P.find(q=>q.id===v._sbf.p);const F=p&&G.units.find(e=>e.id===p.foc);
    let off=!drVehOK(v)||t-v._sbf.t>DR.veh.life||drAtNear(v,n,3);
    if(!off&&(!p||!F)){if(v._sbf.end==null)v._sbf.end=t;off=t-v._sbf.end>=DR.veh.rel;}else if(!off)v._sbf.end=null;
    if(off){v._sbf=null;if(v.job===DR_HIDE)v.job=null;}}
  for(const p of P){const c=tacCtr(p);if(!c)continue;const F=G.units.find(e=>e.id===p.foc);if(!F)continue;
    let have=G.units.filter(v=>v.nat===n&&v._sbf&&v._sbf.p===p.id);
    if(have.length<DR.veh.max)for(const v of G.units){if(have.length>=DR.veh.max)break;if(v.nat!==n||v._sbf||!drVehOK(v)||v.fesc!=null&&t-(v.fescT||-99)<5)continue;
      if(Math.hypot(v.x-c[0],v.z-c[1])>DR.veh.r||drAtNear(v,n,DR.veh.stand))continue;v._sbf={p:p.id,t,f:F.id};have.push(v);drN('vehSbf');}
    for(const v of have)drVehPos(v,p,F,n);}}
function drAtNear(v,n,R){for(const k of tacKnown(n))if((k.ty==='at'||k.ty==='atgm'||k.ty==='eng'||k.ty==='tank')&&Math.hypot(k.x-v.x,k.z-v.z)<R)return true;return false;}
function drVehPos(v,p,F,n){const t=drNow();v._sbf.f=F.id;if(v.path&&v.path.length&&t-(v._sbf.mt??-99)<6)return;
  const R=UT[v.type].rng[1]||8;const K=tacKnown(n);const objs=coverObjs();
  const inf=tacMembers(p);const front=inf.length?Math.min(...inf.map(u=>Math.hypot(u.x-F.x,u.z-F.z))):0;
  const d0=Math.hypot(v.x-F.x,v.z-F.z);const sees=d0<=R*.9&&losPt(v.x,v.z,eye(v),F.x,F.z,eye(F));
  if(sees&&d0>=front-.3&&!drAtNear(v,n,DR.veh.stand))return;   // 지금 자리가 좋으면 그대로 쏜다
  const AT=K.filter(k=>k.ty==='at'||k.ty==='atgm'||k.ty==='eng');
  const s=tacSpot(v,v.x,v.z,[0,.8,1.6,2.4,3.2],(x,z)=>{const d=Math.hypot(x-F.x,z-F.z);if(d>R*.9||d<front-.3)return -1e9;
    for(const k of AT)if(Math.hypot(k.x-x,k.z-z)<DR.veh.stand)return -1e9;
    if(!losPt(x,z,eye(v),F.x,F.z,eye(F)))return -1e8;
    return tacCov(x,z,F.x,F.z,objs)*6-Math.hypot(x-v.x,z-v.z)*.8-Math.abs(d-Math.max(front+1,R*.6))*.3;});
  if(!s||Math.hypot(s[0]-v.x,s[1]-v.z)<.3)return;{const d=Math.hypot(s[0]-F.x,s[1]-F.z);if(d>R*.9||d<front-.3||!losPt(s[0],s[1],eye(v),F.x,F.z,eye(F)))return;}
  const P2=pathPts(v,s[0],s[1]);if(P2.length){v.path=P2;v.dest=[s[0],s[1]];v._sbf.mt=t;}}
// 붙은 차량은 소대의 초점 적을 먼저 쏜다
{const _p=rtPick;rtPick=function(u){if(!u._sbf)return _p(u);const F=G.units.find(e=>e.id===u._sbf.f);const b=_p(u);
  if(!F||!b||b===F)return b;if(Math.hypot(b.x-u.x,b.z-u.z)<2.5)return b;
  const alt=typeof docPickOnly==='function'?docPickOnly(_p,u,z=>z===F||z.nat===u.nat):null;return alt===F?F:b;};}
{const _ai=aiThink;aiThink=function(n){let hid=[];if(aiRun(n)){hid=G.units.filter(v=>v.nat===n&&v._sbf&&!v.job);for(const v of hid)v.job=DR_HIDE;}
  try{_ai(n);}finally{for(const v of hid)if(v.job===DR_HIDE)v.job=null;}
  try{if(aiRun(n))drVehThink(n);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}};}
/* ---------- 9) 대전차 진지 변환 ---------- */
{const _s=rtShoot;rtShoot=function(a,d){const r=_s(a,d);try{if(a.type==='at'&&UT[d.type].cls==='veh'&&aiRun(a.nat)&&drFree(a)&&!a.job&&!(a.path&&a.path.length))a._scoot={t:drNow()+DR.scoot.d,x:d.x,z:d.z};}catch(e){}return r;};}
function drScoot(u){const s0=u._scoot;if(!s0||drNow()<s0.t)return;u._scoot=null;if(!G.units.includes(u)||(u.path&&u.path.length)||!drFree(u)||u.job)return;
  const objs=coverObjs(u);const s=tacSpot(u,u.x,u.z,DR.scoot.r,(x,z)=>{const d=Math.hypot(x-u.x,z-u.z);if(d<.5)return -1e9;return tacCov(x,z,s0.x,s0.z,objs)*5-d*.8+(Math.hypot(x-s0.x,z-s0.z)<=(UT[u.type].rng[1]||8)?.5:0);});
  if(!s)return;const P=pathPts(u,s[0],s[1]);if(!P.length)return;u.path=P;u.dest=[s[0],s[1]];if(u.tk)u.tk.at=drNow();drN('scoot');}
{const _tick=rtTick;rtTick=function(dt){_tick(dt);if(!G||G.over||!G.units)return;for(const u of G.units)if(u._scoot)try{drScoot(u);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}};}
