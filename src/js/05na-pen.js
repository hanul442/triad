/* ===================== 관통·장갑·부무장: 무기마다 실제 위력 =====================
   피해는 "얼마나 세게"가 아니라 "뚫리느냐"로 정한다.
   - 차량은 방향별 장갑 두께(균질압연강판 환산 mm), 무기는 관통력(mm)을 가진다. 맞을 때마다 맞은 자리에 따라 조금씩 다르다(약점·경사).
     뚫으면 안까지 피해(넘치게 뚫을수록 크게, 부품·승무원), 못 뚫으면 차체 피해는 없다.
     소총·기관총은 전차·장갑차를 못 뚫는다. 대신 잠망경·조준경을 깨고, 해치 밖으로 몸을 내민 차장을 맞히고, 승무원이 해치를 닫게 만든다.
     RPG 정면은 전차를 못 뚫지만(궤도를 끊을 수는 있다) 측면·후면·위는 뚫는다. 대전차미사일은 위에서 내리꽂아 뚫는다.
   - 전차 주포 고폭탄은 보병에게 치명적이다: 터진 곳 반경 약 10m 안 병사가 크게 다친다. 사격통제장치로 거의 다 맞는다.
   - 장갑차 기관포(30mm 고폭)는 한 발 한 발이 작은 폭발. 12.7mm·기관포는 벽돌 벽을 뚫는다.
   - 차량 부무장: 전차 동축 기관총·차장 원격 기관총·장전수 기관총, 장갑차(BTR) 동축 기관총, 자주포·트럭 지붕 기관총.
     주포와 따로 자기 장전 시간으로 보병·얇은 차량을 쏜다. 해치를 열고 쏘는 기관총은 해치를 닫으면 못 쏜다.
   - 포탄 폭발 반경은 구경에 따라: 박격포 약 17m, 다연장 22m, 155mm 26m.
   근거(공개 자료): FM 3-20.12 전차 사격, FM 3-22.68 기관총, FM 3-09 화력, ATP 3-21.8 소대 교범의 무기 효과, 공개된 장갑·관통 추정치. 1칸 ≈ 12m. */
const ARM={            // [정면, 측면, 후면, 상부·바닥]
  tank:[600,90,50,40], ifv:[25,14,10,8], spg:[30,18,15,12], hmv:[10,9,8,5], rec:[12,10,8,6],
  mlrs:[6,5,5,4], zu:[2,2,2,2], sup:[5,4,4,3], amb:[4,3,3,3], vbied:[6,3,3,3],
};
const ARC_I={front:0,side:1,rear:2,top:3};
const PEN={            // 무기 관통력(mm)
  rifle:7, dteam:7, ew:7, mg:9, sniper:14, coax:9, lmg:9, hmg:25, hmv:25, zu:35, ifv:60, gunship:70,
  at:450, eng:700, atgm:900, fpv:300, tank:750, aa:0, vbied:300,
};
const PEN_SH={mortar:[18,120],spg:[30,250],mlrs:[25,150]};   // 포탄: [파편, 직격]
const SHELL_RK={mortar:1.4,spg:2.2,mlrs:1.8};               // 포탄 폭발 반경(칸)
const PV_CAP={tank:1.6,spg:2,ifv:3};
const BAE={tank:1.8,atgm:1.5,eng:1.4,fpv:1.2};                 // 뚫은 뒤 안쪽 피해(대구경 날개안정분리탄·유도탄은 크다)                       // 넘치게 뚫어도 커지는 한계(큰 차는 안이 나뉘어 있다)
const armOf=u=>ARM[u.type]||[8,6,6,5];
/* 이 무기가 이 방향을 뚫을 수 있나(평균) */
const penOf=(by,o)=>{if(o&&o.w&&PEN[o.w]!=null)return PEN[o.w];if(!by)return null;const p=Object.getPrototypeOf(by);
  return PEN[by.type]??(p&&PEN[p.type])??10;};
/* 맞은 방향 */
function pvArc(u,by,o){if(o&&o.sh)return 'top';if(!by)return o&&o.kind==='crush'?'top':'side';
  if(by.type==='atgm'||by.type==='eng'&&Math.hypot(by.x-u.x,by.z-u.z)<1.4)return 'top';   // 유도미사일은 위로 내리꽂고, 공병은 엔진 갑판에 폭약을 붙인다
  return armorArc(u,by);}
/* 관통 판정: {pen, r(관통/장갑), P, A, arc} */
function pvRoll(u,by,o,amt){const arc=pvArc(u,by,o);const A=armOf(u)[ARC_I[arc]];let P;
  if(o.sh){const S=PEN_SH[o.sh]||PEN_SH.mortar;const d=o.x!=null?Math.hypot(u.x-o.x,u.z-o.z):1;P=d<.18?S[1]:S[0];}
  else if(o.pen!=null)P=o.pen;
  else if(!by){if(o.kind==='crush')P=A*1.2;else{const d=o.x!=null?Math.hypot(u.x-o.x,u.z-o.z):0;P=amt*25*Math.max(.3,1-d/Math.max(.3,(o.rad||.4)*2));}}
  else P=penOf(by,o);
  const Pe=P*(.8+Math.random()*.4),Ae=A*(.8+Math.random()*.4);
  return {pen:Pe>Ae,r:Pe/Math.max(1,Ae),P,A,arc};}
/* 승무원 한 명이 다친다 */
function pvCrew(u,why){const V=vdOf(u);const i=V.crew.findIndex(c=>c==='ok');if(i<0)return;const S=casStats(u.nat);V.crew[i]=Math.random()<.4?'kia':'hw';
  if(V.crew[i]==='kia')S.kia++;else S.wia++;if(why&&(u.nat===G.viewer||!isAI(u.nat)))L(`${natName(u.nat)} ${UT[u.type].n} ${why}`);}
/* 못 뚫은 탄: 잠망경·조준경, 밖에 나와 있던 차장, 궤도 */
function pvGlance(u,by,o,R){const V=vdOf(u);const now=G.time||0;const nm=`${natName(u.nat)} ${UT[u.type].n}`;const bullet=R.P<100&&!o.sh&&o.kind!=='blast';
  if(bullet){const n=Math.min(4,o.hits||1);const snp=by&&by.type==='sniper';const heavy=R.P>=20;
    for(let i=0;i<n;i++){
      if(Math.random()<(snp?.12:heavy?.05:.02)&&(V.opt||0)<3){V.opt=(V.opt||0)+1;if(V.opt===1||V.opt===3)L(`${nm} 잠망경·조준경 파손${V.opt>=3?' (거의 안 보임)':''}`);}
      if(!(u.btn>now)&&Math.random()<(snp?.3:.05)){pvCrew(u,'차장 피격(해치 밖)');u.btn=now+20;}}
    u.btn=Math.max(u.btn||0,now+10);u.supp=Math.max(u.supp||0,.4);return;}
  // 큰 탄(RPG 정면·포탄 파편): 궤도·바퀴, 바깥 장비, 승무원 충격
  if(R.arc!=='top'&&R.P>=150&&Math.random()<.12&&!V.mob){V.mob=1;L(`${nm} 궤도 끊어짐`);}
  else if(Math.random()<(R.P>=150?.15:.05)&&(V.opt||0)<3)V.opt=(V.opt||0)+1;
  u.btn=Math.max(u.btn||0,now+12);u.supp=Math.max(u.supp||0,.8);}
/* 1) 차량 피해: 관통 판정 */
{const _harm=harm;harm=function(u,amt,by,o){o=o||{};
  if(u&&amt>0&&G.units.includes(u)&&UT[u.type].cls==='veh'&&!o.pv&&!(by&&by===u)){
    const R=pvRoll(u,by,o,amt);o.pv=R;u._arcT=G.time||0;u._arc=R.arc;
    if(!R.pen){pvGlance(u,by,o,R);u._hitT=G.time||0;
      if(R.r>.75&&R.P>=100){amt*=(R.r-.75)*.8;o.kind='frag';}       // 거의 뚫을 뻔: 안쪽 파편(스폴)만 조금
      else{if(typeof tacN==='function')tacN('nopen');return _harm(u,0,by,o);}}
    else amt*=Math.min(PV_CAP[u.type]||3,1+.5*Math.log2(Math.max(1,R.r)))*(by&&!o.w&&!o.sh?BAE[by.type]||1:1);
    amt=Math.round(amt*10)/10;}
  return _harm(u,amt,by,o);};}
/* 2) 못 뚫는 표적은 덜 노린다(소총이 전차를 쏘느라 보병을 놓치지 않게). 조준경이 깨진 차량은 덜 맞힌다 */
{const _rd=rawDmg;rawDmg=function(a,d,counter){let v=_rd(a,d,counter);if(!v)return v;
  if(UT[d.type].cls==='veh'&&!UT[a.type].ind){const P=penOf(a);if(P!=null&&P<armOf(d)[2]*.9)v*=.05;}
  return v;};}
{const _hp=hitP;hitP=function(a,d){const h=_hp(a,d);const ta=UT[a.type],td=UT[d.type];if(td.fly||ta.ind)return h;let p=h.p;
  // 전차 주포: 사격통제장치로 거의 다 맞는다. 고폭탄은 엄폐물에 맞아도 터지니 엄폐는 폭발에서 따진다(05k blastMen)
  if(a.type==='tank'&&td.cls==='inf'&&!a._sec){const rm=ta.rng[1]||1;const moving=a.path&&a.path.length;p=Math.max(p,(moving?.8:.92)*(1-.15*Math.pow(udist(a,d)/rm,2)));}
  // 12.7mm·기관포는 벽돌·콘크리트 벽을 뚫는다
  else if(h.kind==='bldg'&&(PEN[a._sec?a._w:a.type]||0)>=25&&ta.cls==='veh'){p=p/(1-Math.min(.85,h.cov))*(1-h.cov*.55);}
  if(a.vd&&a.vd.opt)p*=1-.18*a.vd.opt;
  h.p=Math.max(0,Math.min(1,p));return h;};}
/* 3) 보병이 맞는 폭발: 전차 고폭탄(반경 약 10m), 장갑차 기관포·헬기 로켓(한 발마다 작은 폭발) */
const HE={tank:{rad:.85,pk:.85},gunship:{rad:.6,pk:.45},ifv:{rad:.28,pk:.45}};   // 120mm 고폭 약 10m, 헬기 70mm 로켓 약 10m·30mm 약 4m을 섞어 약 7m, 30mm 기관포 약 3m
{const _harm=harm;harm=function(u,amt,by,o){o=o||{};
  if(u&&by&&amt>0&&!o.w&&!by._sec&&HE[by.type]&&G.units.includes(u)&&UT[u.type].cls==='inf'&&o.x==null&&!u.nocas&&typeof blastMen==='function'){
    const H=HE[by.type];const inB=cell(u.r,u.c).t==='bldg';/* 건물 안: 방마다 벽이 있어 한 방만 크게 다친다 */const M=menOf(u).filter(m=>!m.dead&&!m.gone);if(M.length){
      const n=by.type==='tank'?1:Math.max(1,Math.min(by.type==='gunship'?2:4,o.hits||1));   // 헬기: 한 번에 로켓 한두 발 + 기관포
      for(let i=0;i<n&&G.units.includes(u);i++){const m=M[Math.floor(Math.random()*M.length)];const a=Math.random()*6.283,r=Math.random()*.15;
        _harm(u,amt/n,by,{kind:'blast',x:m.x+Math.cos(a)*r,z:m.z+Math.sin(a)*r,rad:inB?H.rad*.5:H.rad,pk:H.pk});}
      return amt;}}
  return _harm(u,amt,by,o);};}
/* 4) 차량 부무장 */
// w: 무기(관통·모양), atk: 대보병 화력, k: 한 번에 쏘는 발수, cd: 다시 쏘기(초), rng: 사거리(칸), tur: 포탑과 같은 쪽만, open: 해치 열고 쏨
// 트럭 링 마운트는 자위용: 가까이(3칸) 온 적에게만 쏜다(먼 적에게 쏘아 자리를 드러내지 않는다)
const SEC={
  tank:[{id:'coax',n:'동축 기관총',w:'coax',fx:'mg',atk:6,k:6,cd:1.1,rng:6,tur:1},
        {id:'cmd',n:'차장 원격 기관총',w:'hmg',fx:'hmv',atk:6.5,k:4,cd:1.4,rng:6},
        {id:'ldr',n:'장전수 기관총',w:'lmg',fx:'mg',atk:4.5,k:5,cd:1.3,rng:5,open:1,west:1}],
  ifv:[{id:'coax',n:'동축 기관총',w:'coax',fx:'mg',atk:6,k:6,cd:1.1,rng:6,tur:1,east:1}],
  spg:[{id:'roof',n:'지붕 기관총',w:'hmg',fx:'hmv',atk:6,k:4,cd:1.5,rng:6,open:1}],
  sup:[{id:'ring',n:'링 마운트 기관총',w:'hmg',fx:'hmv',atk:5,k:3,cd:1.6,rng:3,open:1,self:1}],
  rec:[{id:'ring',n:'링 마운트 기관총',w:'hmg',fx:'hmv',atk:5,k:3,cd:1.6,rng:3,open:1,self:1}],
};
const secList=u=>{const L=SEC[u.type];if(!L)return null;const east=natEast(u.nat);return L.filter(s=>!(s.west&&east)&&!(s.east&&!east));};
/* 이 총으로 노릴 만한가: 보병, 또는 이 총이 옆을 뚫는 차량 */
const secTgtOK=(s,e)=>{const td=UT[e.type];if(td.fly)return false;if(td.cls==='inf')return true;return td.cls==='veh'&&PEN[s.w]>=armOf(e)[1]*.9;};
function secShoot(u,s){const now=G.time||0;u._sc=u._sc||{};if((u._sc[s.id]||0)>now)return false;
  const V=u.vd;if(V){if(s.tur&&V.gun)return false;if(V.crew&&V.crew.filter(c=>c==='ok').length<2)return false;}
  if(s.open&&u.btn>now)return false;                        // 해치를 닫았다
  if(u.brk||u.climb)return false;
  const P=Object.create(u);P.type='hmv';P._sec=1;P._w=s.w;
  const R=s.rng*Math.max(1,(UT.mg.rng[1]||6)/6)+.5;let best=null,bs=0;   // 사거리는 기관총팀 사거리에 맞춰 늘어난다(사거리 조정 06y)
  for(const e of G.units){if(!hostile(e.nat,u.nat)||!secTgtOK(s,e))continue;const dx=e.x-u.x,dz=e.z-u.z;const d2=dx*dx+dz*dz;if(d2>R*R||d2<.25)continue;
    if(s.tur){const ang=Math.atan2(dz,dx)*180/Math.PI;if(Math.abs(hDeg(ang,u.tf??u.face??0))>25)continue;}
    if(G.fog&&!seen(e,u.nat))continue;if(G.fog&&typeof selfSees==='function'&&!selfSees(u,e))continue;
    const [ax,az]=posOf(u),[ex,ez]=posOf(e);if(!losPt(ax,az,eye(u),ex,ez,eye(e)))continue;
    const sc=(UT[e.type].cost||3)/(1+Math.sqrt(d2)*.3)*(firedRecently(e)?1.6:1)*(u._tg===e.id||u.tgt===e.id?1.3:1);if(sc>bs){bs=sc;best=e;}}
  if(!best){u._sc[s.id]=now+.6;return false;}
  const d=best;const h=hitP(P,d);let hits=0;for(let i=0;i<s.k;i++)if(Math.random()<h.p)hits++;
  u._sc[s.id]=now+s.cd*(.85+Math.random()*.3);u.firedT=now;u.shot=G.turn;
  const shot={t:now,hits,k:s.k,cover:h.kind,cov:h.cov,tgt:d.id,mnt:s.id,w:s.fx};P.lastShot=shot;FXH.fire(P,d.r,d.c,d,shot);
  if(typeof memFlash==='function')memFlash(u);
  if(UT[d.type].cls==='inf')d.supp=Math.min(3,Math.max(d.supp||0,hits?1.2:.8));
  if(typeof tacN==='function')tacN('sec_'+s.id);
  if(!hits)return true;
  const dmg=Math.round(s.atk*hits/s.k*DPS_K*s.cd*(.8+Math.random()*.4)*10)/10;
  G.nats[u.nat].dmg=(G.nats[u.nat].dmg||0)+dmg;harm(d,dmg,u,{kind:'bullet',hits,w:s.w});if(d.hp<=0&&G.units.includes(d))kill(d,u);
  return true;}
{const _f=rtFight;rtFight=function(u){const r=_f(u);const L=G.units.includes(u)&&secList(u);
  if(L&&L.length)for(const s of L){try{secShoot(u,s);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}if(!G.units.includes(u))break;}
  return r;};}
/* 병종 설명 */
UT.tank.desc=UT.tank.desc.replace('최강 화력과 두꺼운 장갑(대전차 무기 외 피해 −35%)','120mm 고폭탄(반경 약 10m)과 정면 600mm급 장갑: 소총·기관총·RPG 정면으로는 못 뚫음. 동축·차장·장전수 기관총으로 보병을 따로 쏨');
UT.ifv.desc+='. 30mm 기관포는 벽을 뚫고, 동구권형은 동축 기관총도 쏨. 소총탄은 막지만 12.7mm 측면·RPG에는 뚫림';
UT.hmv.desc+='. 12.7mm는 벽돌 벽과 얇은 장갑을 뚫음';
UT.spg.desc+='. 지붕 12.7mm 기관총으로 가까운 보병을 쏨(해치를 열어야 함)';
for(const t of ['sup','rec'])if(UT[t])UT[t].desc=UT[t].desc.replace('무장 없음','운전실 위 링 마운트 기관총만 있음');
UT.at.desc+='. RPG는 전차 정면(600mm)을 못 뚫음: 측면·후면·위를 노려야 함';
/* 5) 광역 무기: 실제 탄약의 살상·제압 반경(1칸 ≈ 12m)
   R: 이 안에서 병사마다 거리로 다칠 확률(가운데 pk, 가장자리 0), Rs: 이 안은 모두 고개를 숙인다(제압),
   vd: 차량이 가운데서 받는 피해, pen: 가운데 관통력(mm, 멀수록 줄어 파편만 남는다).
   Mk82 500파운드 폭탄 살상 약 30m·파편 위험 수백 m, 155mm 고폭탄 살상 약 25~50m, 81mm 박격포 약 20~25m,
   122mm 그라드 로켓 약 30m, 순항미사일(450kg 탄두) 약 40m, 탄도미사일(480kg) 약 45m, 70mm 헬기 로켓 약 10m. */
const SHELL_PK={mortar:.8,spg:.92,mlrs:.85};
const AOE={
  bomb:{R:2.5,pk:.95,Rs:5,vd:9,pen:300},        // Mk82 한 발(스틱의 가운데·앞·뒤 모두 같은 폭탄)
  cruise:{R:3.2,pk:.97,Rs:6,vd:12,pen:400},
  tbm:{R:3.8,pk:.97,Rs:7,vd:16,pen:500},
  cruiseDown:{R:1.6,pk:.8,Rs:3,vd:4,pen:120},    // 요격돼 떨어진 잔해·탄두
};
function aoe(x,z,K,by){const now=G.time||0;let hit=0;
  for(const u of G.units.slice()){if(UT[u.type].fly||!G.units.includes(u))continue;const d=Math.hypot(u.x-x,u.z-z);if(d>K.Rs)continue;
    u.supp=Math.min(3,Math.max(u.supp||0,.6+1.6*(1-d/K.Rs)));u._thr=[x,z,now];
    if(d>K.R*1.25)continue;hit++;
    if(UT[u.type].cls==='inf')harm(u,1,by||null,{kind:'blast',x,z,rad:K.R,pk:K.pk});
    else{const k=Math.max(0,1-d/K.R*.85);const dm=Math.round(K.vd*k*(.85+Math.random()*.3)*10)/10;if(dm>0)harm(u,dm,by||null,{kind:'blast',x,z,rad:K.R,pen:K.pen*Math.max(.12,1-d/K.R)});}}
  if(typeof tacN==='function')tacN('aoe_hit',hit);return hit;}
// 전투기 폭탄: 예전엔 그 칸의 한 부대만 맞았다. 이제 폭탄마다 반경 안 모두
if(typeof bombHit==='function'){bombHit=function(b){const {r,c}=b;const main=b.main!==false;if(FXH.bomb)FXH.bomb(r,c,b);const S=STICK.side;
  const cx=b.x??c+.5,cz=b.z??r+.5;aoe(cx,cz,AOE.bomb,null);
  if(inb(r,c)){const x=G.map[r][c];if(x.t==='bldg'){damageBldg(r,c,main?24:S.bldg);if(typeof ignite==='function')ignite(r,c,main?.7:.35);}}
  const W=STICK.wave,R=Math.ceil(W.rad);for(let a=r-R;a<=r+R;a++)for(let bb=c-R;bb<=c+R;bb++){if((a===r&&bb===c)||!inb(a,bb))continue;const x=G.map[a][bb];if(x.t!=='bldg')continue;
    const d=Math.hypot(a-r,bb-c);if(d<=W.rad)damageBldg(a,bb,Math.max(1,Math.round(W.bldg*(main?1:.6)*(1.2-d/W.rad))));}
  if(typeof fortBlast==='function')fortBlast(cx,cz,1.2,60);
  bump();};}
// 미사일 타격: 반경을 실제 탄두 크기로, 피해는 병사마다
if(typeof msBlast==='function'){msBlast=function(x,z,R,base,n,bc,br){if(FXH.msBoom)FXH.msBoom(x,z,R);sfx('boom',1.1,x,z);
  const K=R>=2?AOE.tbm:R>=1.2?AOE.cruise:AOE.cruiseDown;const r0=Math.floor(z),c0=Math.floor(x);const RB=Math.max(R,K.R*.7);
  for(let r=r0-Math.ceil(RB);r<=r0+Math.ceil(RB);r++)for(let c=c0-Math.ceil(RB);c<=c0+Math.ceil(RB);c++){if(!inb(r,c))continue;const d=Math.hypot(c+.5-x,r+.5-z);if(d>RB)continue;
    if(G.map[r][c].t==='bldg'){damageBldg(r,c,Math.round(r===r0&&c===c0?bc:br*(1-d/RB*.6)));if(typeof ignite==='function'&&G.map[r][c].t==='bldg')ignite(r,c,.3);}}
  aoe(x,z,K,null);if(typeof fortBlast==='function')fortBlast(x,z,K.R,40);bump();};}
if(SUP.tbm)SUP.tbm.desc=SUP.tbm.desc.replace('반경 2칸 초토화','반경 약 4칸(45m) 살상, 7칸 제압');
if(SUP.cruise)SUP.cruise.desc=SUP.cruise.desc.replace('큰 폭발','반경 약 3칸(40m) 살상');
if(SUP.air)SUP.air.desc=SUP.air.desc.replace('한 칸에 폭탄','500파운드 폭탄 3발을 줄지어(한 발 살상 반경 약 30m)');
