/* ===================== COMBAT: 전투 판정 다듬기 (개선 묶음 H) =====================
   1) 폭발은 병사 한 명 한 명에게: 폭심에서 각 병사까지 거리로 다칠 확률을 따로 굴린다.
      엎드린 병사는 덜 다치고, 폭심 쪽에 벽·차량·소품이 있으면 파편을 막아 주며, 다른 건물 안이면 벽이 막는다.
      전차포·로켓·폭약처럼 바로 쏘는 폭발물도 겨눈 병사 곁에서 터진다(예전엔 분대 아무나 다쳤다).
   2) 쏘는 부대가 직접 봐야 겨눠 쏜다. 드론이나 다른 분대가 찾아 준 적은 '위치만 아는 적'이다.
   3) 세력마다 적 위치를 기억한다(본 자리, 총구 섬광이 보이거나 들린 자리). 직접 안 보이는 적에게는
      기관총·소총·장갑차가 마지막으로 안 자리에 제압 사격을 한다: 거의 안 맞지만 고개를 못 들게 한다.
   4) 소총분대는 9명이 다 같은 소총수가 아니다: 분대장, 위생병, 기관총 사수 둘(제압 사격 강화),
      유탄수 둘(엄폐 뒤 적에게 40mm 유탄), 대전차 사수(일회용 로켓 2발, 3칸 안 차량).
   5) 소총 사거리 5칸(약 60m), 기관총 6칸. 대신 먼 거리는 잘 안 맞는다(04c hitP 거리 감소). */
const CMB={memT:30,supAge:14,supR:.75,flashR:9,rk:2,rkR:3.2,glP:.3,glMin:1.2,glMax:3.6};
UT.rifle.rng=[1,5];UT.mg.rng=[1,6];
UT.rifle.desc+='. 9명: 분대장·위생병·기관총 사수 2·유탄수 2·대전차 사수(일회용 로켓 2발, 3칸 안 차량)';
/* ---------- 분대 편성 ---------- */
const KIT={rifle:{2:'ar',3:'gl',4:'at',6:'ar',7:'gl'}};
const KITN={ar:'기관총 사수',gl:'유탄수',at:'대전차 사수'};
const KITM={ar:'mg',at:'at'};
// 3D 병사 모양(07-view3d): 기관총 사수는 큰 총, 대전차 사수는 로켓 통을 멘다
function squadKit(ty,i){const k=KIT[ty]&&KIT[ty][i];return k?KITM[k]||'rifle':null;}
function kitName(ty,i){const k=KIT[ty]&&KIT[ty][i];return k?KITN[k]:'';}
// 지금 싸울 수 있는 그 역할 병사 수(병사 정보가 아직 없으면 편성대로)
function kitAble(u,k){const K=KIT[u.type];if(!K)return 0;const M=u._men;if(!M)return Object.values(K).filter(v=>v===k).length;
  let n=0;for(const m of M)if(K[m.i]===k&&menAct(m))n++;return n;}
function volleyOf(a){const v=VOLLEY[a.type]||1;return a.type==='rifle'?v-1+kitAble(a,'ar'):v;}
{const _rd=rawDmg;rawDmg=function(a,d,counter){let v=_rd(a,d,counter);if(v&&a.type==='rifle'&&UT[d.type].cls==='inf')v*=.92+.05*kitAble(a,'ar');return v;};}
/* ---------- 적 위치 기억 ---------- */
function memOf(n){if(!G.mem)G.mem={};return G.mem[n]||(G.mem[n]={});}
function memPut(n,e,x,z,how){const M=memOf(n);const o=M[e.id];const t=G.time||0;if(o&&o.how==='see'&&how!=='see'&&t-o.t<1)return;
  M[e.id]={x:Math.round(x*100)/100,z:Math.round(z*100)/100,h:Math.round(eye(e)*10)/10,t,ty:e.type,how};}
function memTick(){const t=G.time||0;
  for(const n of G.order){if(!G.nats[n]||!G.nats[n].alive)continue;const M=memOf(n);
    for(const e of G.units){if(e.nat===n||UT[e.type].fly)continue;if(seen(e,n))memPut(n,e,e.x,e.z,'see');}
    let ids=null;for(const id in M){const o=M[id];if(t-o.t>CMB.memT){delete M[id];continue;}if(!ids)ids=new Set(G.units.map(u=>String(u.id)));if(!ids.has(id))delete M[id];}}}
/* 총구 섬광: 쏜 적 근처(9칸)에서 그쪽이 트인 부대가 있으면 대강의 자리를 안다 */
function memFlash(a){const t=G.time||0;if((a._flT||0)>t)return;a._flT=t+1;if(UT[a.type].ind||UT[a.type].fly)return;const [ax,az]=posOf(a),ae=eye(a);
  for(const n of G.order){if(n===a.nat||!G.nats[n]||!G.nats[n].alive)continue;const o=memOf(n)[a.id];if(o&&t-o.t<1.5)continue;
    for(const u of G.units){if(u.nat!==n||UT[u.type].fly)continue;const d=Math.hypot(u.x-ax,u.z-az);if(d>CMB.flashR)continue;const [ux,uz]=posOf(u);
      if(!losPt(ux,uz,eye(u),ax,az,ae))continue;const er=.25+d*.05,ang=Math.random()*6.283;memPut(n,a,ax+Math.cos(ang)*er*Math.random(),az+Math.sin(ang)*er*Math.random(),'flash');break;}}}
/* ---------- 직접 봐야 조준 ---------- */
function selfSees(u,e){if(UT[u.type].ind)return true;try{return spots(u,e);}catch(err){return true;}}
/* ---------- 제압 사격: 안 보이는 적의 마지막 자리 ---------- */
const SUPF={mg:.7,rifle:.35,ifv:.6,hmv:.5,zu:.6};
function supFire(u,moving){if(!G.fog)return false;const t=UT[u.type];const k0=SUPF[u.type];if(!k0||u.brk||t.ind)return false;if(moving&&t.cls!=='veh')return false;
  if(typeof amFrac==='function'&&amFrac(u)<.35)return false;                  // 탄이 모자라면 아낀다
  const M=memOf(u.nat),now=G.time||0,R=t.rng[1]+.4;const [ax,az]=posOf(u),ae=eye(u);let best=null,bs=0;
  for(const id in M){const p=M[id];const age=now-p.t;if(age>CMB.supAge)continue;const d=Math.hypot(p.x-ax,p.z-az);if(d>R||d<t.rng[0])continue;
    const e=G.units.find(o=>String(o.id)===id);if(!e)continue;
    if(!(t.atk[UT[e.type].cls]>0))continue;
    if(G.units.some(o=>o.nat===u.nat&&!UT[o.type].fly&&Math.hypot(o.x-p.x,o.z-p.z)<.9))continue;   // 아군 근처는 쏘지 않는다
    if(!losPt(ax,az,ae,p.x,p.z,p.h))continue;
    const s=(UT[e.type].cost||3)/(1+age*.3)+(firedRecently(e)?3:0);if(s>bs){bs=s;best=p;}}
  if(!best)return false;
  const k=volleyOf(u);u.shot=G.turn;u.firedT=now;u.face=Math.atan2(best.z-u.z,best.x-u.x)*180/Math.PI;
  if(t.cls==='inf'&&typeof menShooters==='function'){if(!u._men)menInit(u);const sh=menShooters(u,k);for(const m of sh)m.aim=[best.x,best.z];u._sh=sh.map(m=>m.i);}
  const r=Math.floor(best.z),c=Math.floor(best.x);FXH.fire(u,r,c,null,{t:now,hits:0,k,sup:1});
  for(const e of G.units.slice()){if(e.nat===u.nat||UT[e.type].fly)continue;const d=Math.hypot(e.x-best.x,e.z-best.z);if(d>CMB.supR)continue;
    if(UT[e.type].cls==='inf')e.supp=Math.min(3,(e.supp||0)+k0*(1-d/CMB.supR*.5));e._thr=[u.x,u.z,now];
    const p=hitP(u,e).p*.22;let hits=0;for(let i=0;i<k;i++)if(Math.random()<p)hits++;
    if(hits){const dmg=Math.round(rawDmg(u,e,false)*hits/k*DPS_K*COOL[u.type]*(.8+Math.random()*.4)*10)/10;if(dmg>0){harm(e,dmg,u,{kind:'bullet',hits});if(e.hp<=0&&G.units.includes(e))kill(e,u);}}}
  tacN('supf');return true;}
/* 전술 통계(측정·관전용) */
function tacN(k,v){if(!G.tac)Object.defineProperty(G,'tac',{value:{},writable:true,configurable:true,enumerable:false});G.tac[k]=(G.tac[k]||0)+(v||1);}
/* ---------- 병사별 폭발 피해 ---------- */
function blastMen(u,amt,by,o){const M=menOf(u);const n=M.length||1;const now=G.time||0;
  const R=o.pk?o.rad:Math.max(.3,(o.rad||.4)*2);const g=d=>Math.max(0,1-d/R);
  const I=o.pk?0:amt/hpMax(u)*n*CAS_K;const gc=Math.max(.25,g(Math.hypot(u.x-o.x,u.z-o.z)));
  const bt=tileAt(o.x,o.z);const objs=coverObjs(u);let near=0;
  for(const m of M){if(m.dead||m.gone)continue;const d=Math.hypot(m.x-o.x,m.z-o.z);if(d<R*1.4)near++;
    let p=o.pk?o.pk*g(d):Math.min(.95,I/n*g(d)/gc);
    if(p>0){
      if((m.pr>0||m.lay)&&!m.down&&d>.03)p*=.4;                                     // 엎드렸으면 파편이 위로 지나간다
      const mt=tileAt(m.x,m.z);
      if(mt&&mt.t==='bldg'){if(!(bt&&bt.t==='bldg'&&(bt===mt||bt.blk!=null&&bt.blk===mt.blk)))p*=o.gl?.6:.35;}   // 밖에서 터지면 벽이 막는다(유탄은 창문으로 들어오기도)
      else if(d>.05){const c=dirCoverAt(m.x,m.z,(o.x-m.x)/d,(o.z-m.z)/d,'inf',u,objs).cov;if(c>0)p*=Math.max(.25,1-c*1.5);
        if(typeof trenchAt==='function'&&trenchAt(m.x,m.z))p*=.5;}}
    if(p>0&&Math.random()<p)woundMan(u,m,o.kind==='frag'?'frag':'blast',0,by);
    else if(d<R*1.4&&!m.down)m.pr=Math.max(m.pr||0,.8+Math.random());}      // 가까이 터지면 바닥에 엎드린다
  u.supp=Math.min(3,(u.supp||0)+.15+.7*near/n);u._hitT=now;if(by)u._thr=[by.x,by.z,now];
  casSync(u,by);}
{const _hx=harmX;harmX=function(u,amt,by,o){if(o&&(o.kind==='blast'||o.kind==='frag')&&UT[u.type].cls==='inf'&&!u.nocas){
    if(o.x==null&&by&&UT[by.type]&&UT[by.type].ex&&!UT[by.type].ind){   // 바로 쏜 폭발물: 겨눈 병사 곁에 터진다
      const L=menOf(u).filter(m=>!m.dead&&!m.gone);const m=L.length?L[Math.floor(Math.random()*L.length)]:null;
      if(m){const a=Math.random()*6.283,r=Math.random()*.14;o.x=m.x+Math.cos(a)*r;o.z=m.z+Math.sin(a)*r;o.rad=o.rad||(by.type==='tank'?.35:.25);}}
    if(o.x!=null){blastMen(u,amt,by,o);return true;}}
  return _hx(u,amt,by,o);};}
/* ---------- 유탄: 엄폐 뒤 적에게 ---------- */
function squadGL(a,d){if(a.type!=='rifle'||UT[d.type].cls!=='inf'||!G.units.includes(d)||!G.units.includes(a))return;const gl=kitAble(a,'gl');if(!gl)return;
  const dd=Math.hypot(a.x-d.x,a.z-d.z);if(dd<CMB.glMin||dd>CMB.glMax)return;const c=coverOf(d,a);if(c.cov<.2)return;if(Math.random()>CMB.glP*gl/2)return;
  const L=menOf(d).filter(m=>!m.dead&&!m.gone);if(!L.length)return;const m=L[Math.floor(Math.random()*L.length)];
  const sc=.05+dd*.04,ang=Math.random()*6.283,rr=Math.random()*sc;const x=m.x+Math.cos(ang)*rr,z=m.z+Math.sin(ang)*rr;
  const gm=(a._men||[]).find(q=>KIT.rifle[q.i]==='gl'&&menAct(q));if(gm){gm.ft=G.time||0;gm.aim=[x,z];}
  if(typeof FXH.boom==='function')FXH.boom(x,z,0,false,{pw:.35,gl:1});
  harm(d,.5,a,{kind:'frag',x,z,rad:.32,pk:.5,gl:1});if(d.hp<=0&&G.units.includes(d))kill(d,a);tacN('gl');}
/* ---------- 분대 대전차 로켓 ---------- */
function squadRocket(u){if((u.rk??CMB.rk)<=0||u.climb||(u.path&&u.path.length)||u.brk||(typeof pinned==='function'&&pinned(u)))return false;
  if(typeof casAble==='function'&&casAble(u).length<2)return false;
  let best=null,bs=0;for(const e of G.units){if(e.nat===u.nat||UT[e.type].cls!=='veh')continue;const d=Math.hypot(e.x-u.x,e.z-u.z);if(d>CMB.rkR)continue;
    if(G.fog&&!selfSees(u,e))continue;if(!canHit(u,e))continue;const s=(UT[e.type].cost||4)/(1+d*.3);if(s>bs){bs=s;best=e;}}
  if(!best)return false;const d=best;const now=G.time||0;
  const P=Object.create(u);P.type='at';P.hp=hpMax(P)*u.hp/hpMax(u);
  const M=u._men||[];const gun=M.find(q=>KIT.rifle[q.i]==='at'&&menAct(q))||M.find(menAct);if(gun){gun.ft=now;gun.aim=[d.x,d.z];gun.rl=3;P._sh=[gun.i];}
  u.rk=(u.rk??CMB.rk)-1;u.shot=G.turn;u.firedT=now;u.face=Math.atan2(d.z-u.z,d.x-u.x)*180/Math.PI;u.cd=COOL.rifle*1.4;
  const h=hitP(P,d);const hit=Math.random()<h.p*.85;u.lastShot={t:now,hits:hit?1:0,k:1,cover:h.kind,cov:h.cov,tgt:d.id,rocket:1};
  FXH.fire(P,d.r,d.c,d,u.lastShot);if(cell(u.r,u.c).t==='bldg'&&typeof FXH.backblast==='function')FXH.backblast(u,d);
  d._thr=[u.x,u.z,now];d._hitT=now;memFlash(u);tacN('rocket');
  if(!isAI(u.nat)||!G.fog)L(`${natName(u.nat)} ${UT[u.type].n} 대전차 로켓 발사${hit?'':' (빗나감)'}`);
  if(hit){const dmg=Math.round(rawDmg(P,d,false)*DPS_K*COOL.at*(.8+Math.random()*.4)*10)/10;G.nats[u.nat].dmg=(G.nats[u.nat].dmg||0)+dmg;
    harm(d,dmg,P,{kind:'blast',hits:1});if(d.hp<=0&&G.units.includes(d))kill(d,P);
    if(Object.prototype.hasOwnProperty.call(P,'kills')){u.kills=P.kills;u.rank=P.rank;}}
  return true;}
/* ---------- 엔진에 끼우기 ---------- */
{const _sh=rtShoot;rtShoot=function(a,d){const r=_sh(a,d);try{if(a&&d){memFlash(a);
      if(a.type==='rifle'&&G.units.includes(d)&&UT[d.type].cls==='inf'){const ar=kitAble(a,'ar');if(ar)d.supp=Math.min(3,(d.supp||0)+.12*ar);squadGL(a,d);}}}
    catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}return r;};}
{const _f=rtFight;rtFight=function(u){if(u.type==='rifle'&&(u.cd||0)<=0&&squadRocket(u))return;return _f(u);};}
{const _tick=rtTick;rtTick=function(dt){_tick(dt);if(!G||G.over||!G.units)return;const t=G.time||0;
  if((G._memT||0)<=t){G._memT=t+.5;try{memTick();}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}
    // 출발 지역에 들어온 소총분대는 쓴 로켓을 다시 받는다(20초에 한 발)
    for(const u of G.units)if(u.type==='rifle'&&(u.rk??CMB.rk)<CMB.rk&&inZone(u.nat,u.r,u.c)){u._rkT=(u._rkT||0)+.5;if(u._rkT>=20){u._rkT=0;u.rk++;}}}};}
