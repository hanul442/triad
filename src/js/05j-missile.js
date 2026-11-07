/* ===================== 미사일: 대전차 유도미사일·다연장 로켓·미사일 타격 =====================
   - 대전차 유도미사일팀: 멈춰 서서 쏜다. 미사일(G.missiles)이 눈에 보이게 날아가 표적을 따라가다 마지막에 위에서 내리꽂힌다.
     표적이 연막에 들어가거나 시야에서 사라지면 유도가 끊겨 마지막으로 본 곳에 떨어진다. 날아가다 건물에 걸리면 벽에서 터진다.
   - 다연장 로켓 차량: 곡사. 한 번에 로켓 12발을 넓게 흩뿌린다(포탄 모듈 05g의 G.shells를 쓴다). 다시 장전하는 데 오래 걸린다.
   - 미사일 타격(화력 지원): 순항미사일은 낮게 날아와 한 곳을 크게 부수고, 근처 적 대공이 요격할 수 있다.
     탄도미사일은 늦게 떨어지는 대신 요격할 수 없고 반경 2칸을 초토화한다. 떨어질 곳은 모두에게 경고 표시가 뜬다. */
Object.assign(UT,{
  atgm:{n:'대전차미사일팀',cls:'inf',mv:3,vis:6,rng:[2,9],atk:{inf:3,veh:12,air:0},ex:2,cost:6,guided:1,desc:'유도미사일. 멈춰서 쏘고, 미사일이 표적을 따라가 위에서 내리꽂힘(장갑 무시). 연막·시야 밖으로 숨으면 유도가 끊김. 재장전이 느림'},
  mlrs:{n:'다연장 로켓',cls:'veh',mv:5,vis:4,rng:[5,15],ind:1,atk:{inf:6,veh:4,air:0},ex:2,sup:1,cost:10,hpMax:8,salvo:12,desc:'곡사 로켓 12발을 넓게 흩뿌림. 아군이 보는 곳을 쏘고, 다시 장전하는 데 25초. 가까운 적·대포병에 약함'},
});
for(const t of ['atgm','mlrs'])if(!TYPES.includes(t))TYPES.splice(TYPES.indexOf(t==='atgm'?'at':'spg')+1,0,t);
Object.assign(COOL,{atgm:9,mlrs:25});
Object.assign(VOLLEY,{atgm:1,mlrs:1});
SUP.cruise={n:'순항미사일',cost:12,rad:1,desc:'몇 초 뒤 낮게 날아와 큰 폭발. 건물을 무너뜨림. 근처 적 대공이 요격할 수 있음',fn:(n,r,c)=>msStrike(n,r,c,'cruise')};
SUP.tbm={n:'탄도미사일',cost:16,rad:2,desc:'8초 뒤 거의 수직으로 떨어짐. 요격 불가, 반경 2칸 초토화. 떨어질 곳은 적에게도 보임',fn:(n,r,c)=>msStrike(n,r,c,'tbm')};
const MS_SPD=3.4, MS_CRUISE=1.9, MS_DIVE=1.6;
let MS_ID=1;

/* ---------- 대전차 유도미사일 ---------- */
function atgmShoot(a,d){if(a.path&&a.path.length)return 0;   // 움직이면서는 못 쏜다
  a.shot=G.turn;a.firedT=G.time||0;a.face=Math.atan2(d.z-a.z,d.x-a.x)*180/Math.PI;const [ax,az]=posOf(a);
  const m={id:MS_ID++,x:ax,z:az,h:eye(a)+.2,tgt:d.id,tx:d.x,tz:d.z,n:a.nat,src:a.id,born:G.time||0,lock:1};(G.missiles=G.missiles||[]).push(m);
  a.lastShot={t:G.time||0,hits:0,k:1,tgt:d.id,shell:1};if(FXH.atgm)FXH.atgm(a,m);sfx('launch',.9,a.x,a.z);return 0;}
{const _s=rtShoot;rtShoot=function(a,d){const t=UT[a.type];if(t.guided)return atgmShoot(a,d);if(t.salvo)return mlrsShoot(a,d);return _s(a,d);};}
// 표적이 서 있는 높이(층): 차량·밖의 보병은 땅, 건물 안이면 지붕
function msTgtH(e){const X=cell(e.r,e.c);return X.t==='bldg'?bldgH(X):UT[e.type].cls==='veh'?.5:.2;}
function msTick(dt){if(!G.missiles||!G.missiles.length)return;const keep=[];
  for(const m of G.missiles){const e=G.units.find(u=>u.id===m.tgt);
    // 유도: 표적이 살아 있고 연막 밖이며 우리 편이 보고 있으면 따라간다
    if(e&&m.lock){const X=cell(e.r,e.c);if(X.smoke>0||(G.fog&&!seen(e,m.n))){m.lock=0;if(m.lockLost==null){m.lockLost=1;const a=Math.random()*6.283,d=.6+Math.random()*.9;m.tx+=Math.cos(a)*d;m.tz+=Math.sin(a)*d;L(`${natName(m.n)} 대전차미사일 유도 끊김`);}}else{m.tx=e.x;m.tz=e.z;}}
    const dx=m.tx-m.x,dz=m.tz-m.z,D=Math.hypot(dx,dz);const st=Math.min(D,MS_SPD*dt);
    m.x+=dx/(D||1)*st;m.z+=dz/(D||1)*st;
    const th=e&&m.lock?msTgtH(e):.1;m.h=D>MS_DIVE?Math.min(MS_CRUISE,m.h+dt*1.6):th+(Math.max(m.h,th)-th)*Math.max(0,(D-st)/Math.max(.01,D));m.dive=D<=MS_DIVE;
    // 날아가다 건물에 걸린다
    const r=Math.floor(m.z),c=Math.floor(m.x);let wall=false;
    if(inb(r,c)&&G.map[r][c].t==='bldg'&&!(e&&e.r===r&&e.c===c)){const X=G.map[r][c];const b=bldgBox(r,c);if(m.h<bldgH(X)&&m.x>=b[0]&&m.x<=b[1]&&m.z>=b[2]&&m.z<=b[3])wall=true;}
    if(wall){msHit(m,null,r,c);continue;}
    if(D-st<.08){msHit(m,e&&Math.hypot(e.x-m.x,e.z-m.z)<.4?e:null,null,null);continue;}
    if(G.time-m.born>12){msHit(m,null,null,null);continue;}
    keep.push(m);}
  G.missiles=keep;}
function msHit(m,e,r,c){const by=G.units.find(u=>u.id===m.src)||null;if(FXH.msHit)FXH.msHit(m,r!=null);sfx('boom',.75,m.x,m.z);
  if(r!=null){damageBldg(r,c,6);if(typeof ignite==='function')ignite(r,c,.15);}
  if(e){const te=UT[e.type];const ins=cell(e.r,e.c).t==='bldg';
    // 위에서 내리꽂혀 장갑이 얇은 윗면을 친다
    let dmg=te.cls==='veh'?8:3;if(ins){dmg*=.5;damageBldg(e.r,e.c,5);}dmg=Math.round(dmg*(.85+Math.random()*.3)*10)/10;
    if(by&&G.nats[by.nat])G.nats[by.nat].dmg=(G.nats[by.nat].dmg||0)+dmg;e.supp=Math.max(e.supp||0,2);harm(e,dmg,by&&G.units.includes(by)?by:null,{kind:'blast',x:m.x,z:m.z,rad:.4});}
  for(const u of G.units.slice()){if(u===e||UT[u.type].fly)continue;const d=Math.hypot(u.x-m.x,u.z-m.z);if(d>.6)continue;blastHurt(u,Math.round(1.2*(1-d/.6)*10)/10,by,{kind:'blast',x:m.x,z:m.z,rad:.3});}
  if(typeof fortBlast==='function')fortBlast(m.x,m.z,.4,6);bump();}

/* ---------- 다연장 로켓 ---------- */
function mlrsShoot(a,d){a.shot=G.turn;a.firedT=G.time||0;a.face=Math.atan2(d.z-a.z,d.x-a.x)*180/Math.PI;const [ax,az]=posOf(a);const t=UT[a.type];
  const dd=Math.hypot(d.x-ax,d.z-az);
  for(let i=0;i<t.salvo;i++){const o=(i/t.salvo-.5)*1.6;const ux=(d.x-ax)/(dd||1),uz=(d.z-az)/(dd||1);
    // 로켓마다 흩어진다(사거리 방향으로 길게)
    const s=shellLaunch({x0:ax,z0:az,h0:eye(a)+.3,tx:d.x+ux*o*.8+(Math.random()-.5)*1.2,tz:d.z+uz*o*.8+(Math.random()-.5)*1.2,n:a.nat,src:a.id,type:'mlrs',pw:.1,spread:.9,delay:i*.14,T:.9+dd*.1,ap:1.2+dd*.22});s.rk=1;}
  a.lastShot={t:G.time||0,hits:0,k:1,tgt:d.id,shell:1};if(FXH.mlrs)FXH.mlrs(a);sfx('launch',1,a.x,a.z);L(`${natName(a.nat)} 다연장 로켓 일제 사격`);return 0;}

/* ---------- 미사일 타격 ---------- */
function msStrike(n,r,c,kind){const j={id:MS_ID++,kind,n,r,c,x:c+.5,z:r+.5,t:(G.time||0)+(kind==='tbm'?8:4.5),t0:G.time||0};(G.strikes=G.strikes||[]).push(j);
  if(FXH.strikeM)FXH.strikeM(j);L(`${natName(n)} ${kind==='tbm'?'탄도미사일 발사':'순항미사일 발사'}`);return j;}
function strikeTick(){if(!G.strikes||!G.strikes.length)return;const keep=[];
  for(const j of G.strikes){if(j.t>G.time){keep.push(j);continue;}
    if(j.kind==='cruise'){// 근처(6칸) 적 대공이 요격을 시도한다
      let down=null;for(const e of G.units){if(e.nat===j.n||(e.type!=='aa'&&e.type!=='zu'))continue;if(Math.hypot(e.x-j.x,e.z-j.z)>6||e.supp>.5)continue;
        e.firedT=G.time;if(FXH.aaShot)FXH.aaShot(e,j);if(Math.random()<(e.type==='zu'?.3:.22)){down=e;break;}}
      if(down){L(`${natName(down.nat)} ${UT[down.type].n} 순항미사일 요격!`);G.nats[down.nat].kills++;down.kills=(down.kills||0)+1;
        const a=Math.random()*6.283,d=1+Math.random()*1.5;j.down=[Math.min(N-.5,Math.max(.5,j.x+Math.cos(a)*d)),Math.min(N-.5,Math.max(.5,j.z+Math.sin(a)*d))];
        if(FXH.msDown)FXH.msDown(j);msBlast(j.down[0],j.down[1],.7,3,j.n,4,0);continue;}
      msBlast(j.x,j.z,1.6,9,j.n,40,8);}
    else msBlast(j.x,j.z,2.2,14,j.n,60,16);}
  G.strikes=keep;}
/* 큰 폭발: 반경 R, 중심 피해 base. 중심 건물 bc, 주변 건물 br만큼 부순다 */
function msBlast(x,z,R,base,n,bc,br){if(FXH.msBoom)FXH.msBoom(x,z,R);sfx('boom',1.1,x,z);
  const r0=Math.floor(z),c0=Math.floor(x);
  for(let r=r0-Math.ceil(R);r<=r0+Math.ceil(R);r++)for(let c=c0-Math.ceil(R);c<=c0+Math.ceil(R);c++){if(!inb(r,c))continue;const d=Math.hypot(c+.5-x,r+.5-z);if(d>R)continue;
    if(G.map[r][c].t==='bldg'){damageBldg(r,c,Math.round(r===r0&&c===c0?bc:br*(1-d/R*.6)));if(typeof ignite==='function'&&G.map[r][c].t==='bldg')ignite(r,c,.3);}}
  for(const u of G.units.slice()){if(UT[u.type].fly||!G.units.includes(u))continue;const d=Math.hypot(u.x-x,u.z-z);if(d>R*1.3)continue;
    if(d>R){u.supp=Math.max(u.supp||0,1.5);continue;}const X=cell(u.r,u.c);const inB=X.t==='bldg'&&!(u.r===r0&&u.c===c0);
    let dm=base*(1-d/R*.75)*(inB?.35:1)*(UT[u.type].armor?.7:1)*(.85+Math.random()*.3);dm=Math.round(dm*10)/10;blastHurt(u,dm,null,{kind:'blast',x,z,rad:R*.5});}
  if(typeof fortBlast==='function')fortBlast(x,z,R,40);bump();}

/* 매 틱 (rtTick에서) */
function msAllTick(dt){if(!G)return;msTick(dt);strikeTick();}

/* ---------- AI ---------- */
// 증원: 적 차량이 보이면 대전차미사일팀, 다연장 로켓은 하나쯤
{const _w=aiAirW;aiAirW=function(E,cnt){const w=_w(E,cnt);const eVeh=E.filter(e=>UT[e.type].cls==='veh').length;
  return Object.assign(w,{atgm:cnt('atgm')<2?(eVeh?1.4+eVeh*.7:.5):0,mlrs:cnt('mlrs')<1?(E.length>=3?2:1):0});};}
// 화력 지원: 적이 몰려 있으면 탄도미사일, 값진 차량이 밖에 있으면 순항미사일
{const _s=aiAirSup;aiAirSup=function(n,E){const N2=G.nats[n];
  if((N2.supT||0)<=G.time&&E.length>=3){let best=null,bs=0;
    for(const e of E){if(UT[e.type].fly)continue;let s=0;for(const o of G.units){if(UT[o.type].fly)continue;const d=Math.hypot(o.x-e.x,o.z-e.z);if(d>2)continue;s+=(o.nat===n?-2:1)*UT[o.type].cost;}if(s>bs){bs=s;best=e;}}
    if(best&&bs>=20&&N2.cp>=SUP.tbm.cost+3&&Math.random()<.5&&support(n,'tbm',best.r,best.c))return true;
    const v=E.find(e=>(e.type==='tank'||e.type==='spg'||e.type==='mlrs')&&!G.units.some(o=>o.nat===n&&Math.hypot(o.x-e.x,o.z-e.z)<2));
    if(v&&N2.cp>=SUP.cruise.cost+3&&Math.random()<.5&&support(n,'cruise',v.r,v.c))return true;}
  return _s(n,E);};}
