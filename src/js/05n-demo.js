/* ===================== DEMO: 건물 폭파와 자폭 차량 =====================
   근거(공개 자료): MWI 모술 사례 연구(IS의 자폭 차량 482회, 대로에 구덩이·도랑을 파서 속도를 늦춰 막음, 대전차 화기로 격파),
   MWI 팔루자 사례 연구(건물 문·옥상에 폭발물, 건물째 무너뜨리는 함정), FM 3-21.71(장애물은 화력으로 덮어야 한다).
   - 건물 폭파: 공병(6초)이나 소총분대(10초)가 건물 칸 안에 들어가 폭약을 설치한다(지휘 1). 설치된 폭약은 적에게 보이지 않는다.
     적 보병이 그 칸에 들어오고 아군이 그 칸에 없고, 우리 편 누군가 그 적을 보고 있으면 1.2초 뒤 터진다(원격 기폭).
     직접 터뜨릴 수도 있다. 터지면 건물이 무너지고 안의 부대가 크게 다치며 옆 건물도 상한다.
     적 공병이 아무도 안 보는 사이 그 칸에 5초 머무르면 폭약을 찾아 해체한다.
   - 자폭 차량(민병대 전용): 빠르고 싸지만 무장이 없다. 적 부대 0.6칸 안에 들어가거나, 공격 명령을 받은 건물에 닿으면
     터진다(반경 1.7칸, 건물·방어물·주변 부대 모두에 큰 피해, 아군도 다친다). 맞아서 부서지면 60% 확률로 그 자리에서 터진다.
     방벽·고슴도치·구덩이는 경로를 막아 늦춘다(04d 길찾기). AI는 적 차량·무리·적이 든 건물을 노린다. */
const DEMO={plant:6,plantR:10,cost:1,fuse:1.2,defuse:5,vbR:1.7,vbInf:14,vbBld:30};
Object.assign(UT,{vbied:{n:'자폭 차량',cls:'veh',mv:8,vis:3,rng:[0,.6],atk:{inf:0,veh:0,air:0},cost:5,hpMax:6,kami:1,
  desc:'민병대 전용. 적에게 몰고 가 터뜨린다(반경 1.7칸). 무장 없음, 장갑 얇음. 방벽·구덩이에 막힌다'}});
if(!TYPES.includes('vbied'))TYPES.splice(TYPES.indexOf('hmv')+1,0,'vbied');
COOL.vbied=1;
{const _n=newGame;newGame=function(cfg){ARMS_MIX.vbied=ARMS_MIX.vbied||.04;if(!ARMS_MIX._ub){ARMS_MIX._ub=1;ARMS_MIX.eng+=.02;}return _n(cfg);};}   // ARMS_MIX(06b)는 뒤에서 만들어진다
{const _d=deploySpots;deploySpots=function(n,type){if(type==='vbied'&&!militia(n))return [];return _d(n,type);};}
if(typeof aiArmsW==='function'){const _w=aiArmsW;aiArmsW=function(n,E,cnt,total){const w=_w(n,E,cnt,total);if(!militia(n))delete w.vbied;else if(w.vbied&&cnt('vbied')>=2)w.vbied*=.1;return w;};}
/* ---------- 건물 폭파 ---------- */
const inTile=(u,r,c)=>Math.floor(u.z)===r&&Math.floor(u.x)===c;
function demoOrder(u,r,c){if(u.type!=='eng'&&u.type!=='rifle')return '공병·소총분대만 폭약을 설치합니다';if(!inb(r,c)||G.map[r][c].t!=='bldg')return '건물을 고르세요';
  if((G.demo||[]).some(d=>d.r===r&&d.c===c&&d.nat===u.nat))return '이미 폭약이 있습니다';if(G.nats[u.nat].cp<DEMO.cost)return `지휘점수 ${DEMO.cost}이 필요합니다`;
  u.demo={r,c,t:0,t0:G.time||0};u.tgt=null;u.tgtTile=null;if(!inTile(u,r,c)){u.path=pathPts(u,c+.5,r+.5);u.dest=[c+.5,r+.5];}else{u.path=[];u.dest=null;}bump();return null;}
function demoPlantTick(u,dt){const D=u.demo;const t=G.time||0;if(t-D.t0>60||G.map[D.r][D.c].t!=='bldg'){u.demo=null;return;}
  if(u.dest&&Math.hypot(u.dest[0]-(D.c+.5),u.dest[1]-(D.r+.5))>.05&&!inTile(u,D.r,D.c)){u.demo=null;return;}   // 다른 명령을 받음
  if(!inTile(u,D.r,D.c)||(u.path&&u.path.length)||(u.supp||0)>=1.6)return;D.t+=dt;if(D.t<(u.type==='eng'?DEMO.plant:DEMO.plantR))return;
  const N2=G.nats[u.nat];u.demo=null;if(u.job==='ug')u.job=null;if(N2.cp<DEMO.cost)return;N2.cp-=DEMO.cost;
  (G.demo=G.demo||[]).push({id:UID++,nat:u.nat,r:D.r,c:D.c,t:t,fuse:null,df:{}});L(`${natName(u.nat)} 공병 건물에 폭약 설치`);bump();}
function demoBoom(d){const x=G.map[d.r][d.c];d.gone=1;const cx=d.c+.5,cz=d.r+.5;if(FXH.demo)FXH.demo(cx,cz,x.f||1);sfx('boom',1.6,cx,cz);
  ubAs(d.nat,()=>{for(const u of G.units.slice()){if(!G.units.includes(u)||UT[u.type].fly)continue;const dd=Math.hypot(u.x-cx,u.z-cz);if(dd>1.2)continue;
      const k=inTile(u,d.r,d.c)?1:.35;harm(u,Math.round(9*k*10)/10,null,{kind:inTile(u,d.r,d.c)?'crush':'blast',x:cx,z:cz,rad:.8});if(G.units.includes(u))u.supp=Math.min(3,(u.supp||0)+2);}
    if(x.t==='bldg')damageBldg(d.r,d.c,x.bmax+5);
    for(const [p,q] of SIDES){const r=d.r+p,c=d.c+q;if(inb(r,c)&&G.map[r][c].t==='bldg')damageBldg(r,c,6);}});
  if(typeof fortBlast==='function')fortBlast(cx,cz,1.2,60);ubBlast(cx,cz,1.3,d.nat);L(`${natName(d.nat)} 건물 폭파`);bump();}
function demoFire(d){if(!d.gone&&d.fuse==null){d.fuse=(G.time||0)+DEMO.fuse;return true;}return false;}
function demoTick(dt){const t=G.time||0;
  for(const d of G.demo||[]){if(d.gone)continue;if(G.map[d.r][d.c].t!=='bldg'){d.gone=1;continue;}
    if(d.fuse!=null){if(t>=d.fuse)demoBoom(d);continue;}
    const inT=G.units.filter(u=>inTile(u,d.r,d.c)&&!UT[u.type].fly&&!u.tun);const mine=inT.some(u=>u.nat===d.nat);
    const foes=inT.filter(u=>u.nat!==d.nat&&UT[u.type].cls==='inf');
    if(foes.length&&!mine&&foes.some(e=>seen(e,d.nat))&&G.nats[d.nat].alive){demoFire(d);continue;}
    for(const e of foes)if(e.type==='eng'&&!(e.path&&e.path.length)&&!foes.some(f=>seen(f,d.nat))){d.df[e.nat]=(d.df[e.nat]||0)+dt;
      if(d.df[e.nat]>=DEMO.defuse){d.gone=1;L(`${natName(e.nat)} 공병 폭약 해체`);bump();break;}}}
  if(G.demo&&G.demo.length>40)G.demo=G.demo.filter(d=>!d.gone);}
/* ---------- 자폭 차량 ---------- */
function vbBoom(u,k){if(u._boom)return;u._boom=1;const x=u.x,z=u.z,R=DEMO.vbR*k,n=u.nat;if(FXH.vbBoom)FXH.vbBoom(x,z,R);sfx('boom',2,x,z);
  ubAs(n,()=>{for(const e of G.units.slice()){if(e===u||!G.units.includes(e)||UT[e.type].fly)continue;const d=Math.hypot(e.x-x,e.z-z);if(d>R)continue;
      const dm=Math.round(((1-d/R)*DEMO.vbInf*k+2)*10)/10;harm(e,dm,u,{kind:'blast',x,z,rad:R*.5});if(G.units.includes(e))e.supp=Math.min(3,(e.supp||0)+2.2);}
    const r0=Math.floor(z),c0=Math.floor(x),C=Math.ceil(R);for(let r=r0-C;r<=r0+C;r++)for(let c=c0-C;c<=c0+C;c++){if(!inb(r,c)||G.map[r][c].t!=='bldg')continue;const d=Math.hypot(c+.5-x,r+.5-z);if(d>R+.4)continue;
      damageBldg(r,c,Math.round((1-Math.min(1,d/(R+.4)))*DEMO.vbBld*k)+4);if(typeof ignite==='function'&&G.map[r][c].t==='bldg')ignite(r,c,.4*k);}});
  if(typeof fortBlast==='function')fortBlast(x,z,R*.8,120*k);ubBlast(x,z,R,n);L(`${natName(n)} 자폭 차량 폭발`);
  if(G.units.includes(u)){FXH.kill(u);G.units=G.units.filter(o=>o!==u);if(UI.sel===u)UI.sel=null;}bump();}
{const _k=kill;kill=function(u,by){if(u.type==='vbied'&&!u._boom&&G.units.includes(u)){if(Math.random()<.6){vbBoom(u,.7);if(G.nats[u.nat])G.nats[u.nat].losses++;if(by&&G.nats[by.nat])G.nats[by.nat].kills++;return;}}return _k(u,by);};}
function vbTick(u){const t=G.time||0;if(u._boom)return;let hit=u.det;
  if(!hit)for(const e of G.units){if(e.nat===u.nat||UT[e.type].fly||e.tun||e.bsm)continue;if(Math.hypot(e.x-u.x,e.z-u.z)<.6){hit=true;break;}}
  if(!hit&&u.tgtTile!=null){const r=kr(u.tgtTile),c=kc(u.tgtTile);if(Math.hypot(c+.5-u.x,r+.5-u.z)<.95)hit=true;}
  if(hit){vbBoom(u,1);return;}
  // 공격 명령: 표적을 따라가는 길을 3초마다 다시 잡는다(rtFight는 자폭 장비를 쏘게 하지 않는다)
  if(u.tgt!=null&&t>=(u._vbP||0)){u._vbP=t+3;const e=G.units.find(o=>o.id===u.tgt);if(!e)u.tgt=null;else u.path=pathPts(u,e.x,e.z);}
  if(u.tgtTile!=null&&(!u.path||!u.path.length)&&t>=(u._vbP||0)){u._vbP=t+3;const r=kr(u.tgtTile),c=kc(u.tgtTile);u.path=pathPts(u,c+.5,r+.5);}}
function vbAI(n){for(const u of G.units){if(u.nat!==n||u.type!=='vbied')continue;u.job='vb';if(u.tgt!=null&&G.units.some(e=>e.id===u.tgt))continue;if(u.tgtTile!=null)continue;
  let best=null,bs=-1e9;for(const e of G.units){if(e.nat===n||!hostile(e.nat,n)||UT[e.type].fly||e.tun||e.bsm)continue;if(G.fog&&!seen(e,n))continue;
    const d=Math.hypot(e.x-u.x,e.z-u.z);if(d>16)continue;const near=G.units.filter(o=>o.nat===e.nat&&Math.hypot(o.x-e.x,o.z-e.z)<1.5).length;
    const s=(UT[e.type].cls==='veh'?3:0)+(e.type==='tank'?2:0)+near*2+(cell(e.r,e.c).t==='bldg'?1.5:0)-d*.35;if(s>bs){bs=s;best=e;}}
  if(best){const B=cell(best.r,best.c);if(B.t==='bldg'&&UT[best.type].cls==='inf'){u.tgtTile=key(best.r,best.c);u.tgt=null;u.path=pathPts(u,best.c+.5,best.r+.5);}else{u.tgt=best.id;u.tgtTile=null;u.path=pathPts(u,best.x,best.z);}}}}
function vbDet(u){if(u&&u.type==='vbied'){u.det=1;return true;}return false;}
{const _t=rtTick;rtTick=function(dt){_t(dt);if(!G||!G.units||G.over)return;try{const t=G.time||0;
  for(const u of G.units.slice()){if(u.demo)demoPlantTick(u,dt);if(u.type==='vbied'&&G.units.includes(u))vbTick(u);}
  demoTick(dt);
  if(t>=(G._dmAI||0)){G._dmAI=t+1.5;for(const n of G.order||[])if(G.nats[n].alive&&isAI(n)){vbAI(n);demoAI(n);}}}
  catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}};}
/* AI: 지키는 거점 둘레 건물에 폭약을 심어 둔다(나라당 셋까지) */
function demoAI(n){const N2=G.nats[n];if(N2.cp<DEMO.cost||(G.demo||[]).filter(d=>!d.gone&&d.nat===n).length>=3||Math.random()>.3)return;
  for(const u of G.units){if(u.nat!==n||(u.type!=='eng'&&u.type!=='rifle')||u.job||u.demo||u.tunDig||u.mh)continue;
    for(const o of G.objs){if(G.map[o.r][o.c].owner!==n||dist(o.r,o.c,u.r,u.c)>4)continue;
      for(const [p,q] of SIDES){const r=o.r+p,c=o.c+q;if(!inb(r,c)||G.map[r][c].t!=='bldg'||(G.demo||[]).some(d=>!d.gone&&d.r===r&&d.c===c))continue;
        if(!demoOrder(u,r,c)){u.job='ug';u._ugT=(G.time||0)+40;return;}}}}}
