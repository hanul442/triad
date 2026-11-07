/* ===================== MEN: 분대 안의 병사 한 명 한 명 =====================
   분대(부대)는 여전히 한 점(u.x,u.z)으로 길을 찾고 싸운다. 그 점은 분대장이 가는 곳이다.
   병사들은 그 점에 묶인 고정 대형이 아니라 각자 자리를 정하고 따로 움직인다(u._men, 저장하지 않음).
   - 출발: 명령을 받으면 앞사람부터 차례로 몸을 일으켜 나간다(0.2~0.3초씩 늦게).
   - 이동: 분대장이 지나간 발자국(u._tr)을 따라간다. 넓은 길에서는 길 양쪽 벽을 따라 엇갈린 두 줄,
     건물 안·골목·문에서는 한 줄. 사이 간격은 넓은 곳 약 2.5m, 좁은 곳 약 1.5m.
   - 교전 중 이동(제압당했거나 최근 쏘거나 맞았음): 앞조·뒷조로 나눠 한 조가 멈춰 엄호하는 동안
     다른 조가 3~4초 뛰어 나간다(번갈아 이동).
   - 정지: 도착점 둘레에서 각자 엄폐가 가장 좋은 자리(소품·차량·벽)를 골라 흩어진다. 서로 붙지 않고,
     적이 있는 쪽을 보되 병사마다 조금씩 다른 방향을, 맨 뒤 한 명은 뒤쪽을 경계한다.
     건물 안이면 쏘는 쪽 창가에 늘어선다.
   - 사격: 분대가 쏠 때마다 쏠 수 있는 병사 몇 명이 실제로 쏜다(총구 섬광·예광탄이 그 병사에게서 나감).
     탄창을 다 쓰면 재장전하는데, 짝(둘씩 한 조)이 재장전 중이면 겹치지 않게 조금 더 쏜다.
   - 반응: 제압당하면 엎드리고, 엄폐 밖에 있던 병사는 가까운 엄폐로 기어간다. 옆 사람이 쓰러지면 잠깐 엎드린다.
   - 사상자: 맞을 때마다 병사 한 명씩 다친다(05g-casualty). 엄폐 밖·움직이는 병사가 먼저 맞는다.
   게임 규칙(명중률·피해)은 바뀌지 않는다. 이 파일은 분대 점을 움직이지 않는다. */
const MEN_N={rifle:9,mg:6,at:4,sniper:2,eng:6,mortar:5};
const MEN={gapW:.2,gapN:.12,spread:.11,bound:3.4,threatT:5,mag:{rifle:5,mg:3,at:1,sniper:4,eng:3,mortar:2},rl:{rifle:2.4,mg:4,at:3.2,sniper:2.6,eng:2.4,mortar:2.8}};
const menN=ty=>(typeof SQUAD==='object'&&SQUAD[ty])||MEN_N[ty]||4;
const menWX=(u,x1,z1,x2,z2)=>typeof wallCross==='function'&&wallCross(u,x1,z1,x2,z2);
/* 두 점 사이를 병사가 곧게 갈 수 있는가(벽·물·건물 경계) */
function menClear(u,x1,z1,x2,z2){if(!walkable(u,x2,z2))return false;const a=tileAt(x1,z1),b=tileAt(x2,z2);
  if(a&&b&&(a.t==='bldg')!==(b.t==='bldg')&&typeof wallCross!=='function')return false;return !menWX(u,x1,z1,x2,z2);}
function menHash(id,i){const s=Math.sin(id*127.1+i*311.7)*43758.5453;return s-Math.floor(s);}
function menInit(u){const n=menN(u.type);const M=[];
  for(let i=0;i<n;i++){const a=menHash(u.id,i)*6.283,r=i?.06+menHash(u.id,i+40)*.12:0;let x=u.x+Math.cos(a)*r,z=u.z+Math.sin(a)*r;if(!menClear(u,u.x,u.z,x,z)){x=u.x;z=u.z;}
    M.push({i,x,z,f:(u.face||0)*Math.PI/180,dead:0,mag:MEN.mag[u.type]||4,rl:0,lag:0,pr:0,ft:-99,aim:null,sp:null,spd:0,stk:0,sec:0});}
  Object.defineProperty(u,'_men',{value:M,writable:true,configurable:true,enumerable:false});u._tr=[[u.x,u.z]];if(typeof casLoad==='function')casLoad(u,M);return M;}
/* 지금 분대와 함께 움직이고 싸우는 병사: 전사·중상(쓰러짐)·후송 중·부상자 돌보는 중이 아닌 사람 (05g-casualty) */
const menAct=m=>!m.dead&&!m.down&&!m.gone&&!m.task;
const menAlive=u=>(u._men||[]).filter(menAct);
/* 분대장 발자국: 지나온 길을 점으로 남긴다(가장 최근이 앞) */
function menTrail(u){const T=u._tr||(u._tr=[[u.x,u.z]]);const h=T[0];const d=Math.hypot(u.x-h[0],u.z-h[1]);
  if(d>.04){T.unshift([u.x,u.z]);if(T.length>90)T.length=90;}}   // 머리 점을 끌고 다니면(느리게 걸을 때) 발자국이 벽을 가로지르는 직선이 된다: 새 점만 더한다
/* 발자국을 따라 분대장에게서 L만큼 뒤의 점과 진행 방향 */
function menTrailAt(u,L){const T=u._tr;let acc=0;for(let i=0;i<T.length-1;i++){const a=T[i],b=T[i+1];const s=Math.hypot(a[0]-b[0],a[1]-b[1]);
    if(acc+s>=L){const k=(L-acc)/(s||1);return {x:a[0]+(b[0]-a[0])*k,z:a[1]+(b[1]-a[1])*k,dx:(a[0]-b[0])/(s||1),dz:(a[1]-b[1])/(s||1),ok:1};}acc+=s;}
  const e=T[T.length-1];const f=(u.face||0)*Math.PI/180;return {x:e[0],z:e[1],dx:Math.cos(f),dz:Math.sin(f),ok:0};}
/* 병사 m이 곧게 갈 수 있는 발자국 중 분대장에게 가장 가까운 점(0.4초마다 다시 찾는다) */
function menVia(u,m,t,gx,gz){if(m.wp&&t-m.wpT<.4&&menClear(u,m.x,m.z,m.wp[0],m.wp[1]))return m.wp;const T=u._tr||[];m.wpT=t;m.wp=null;
  for(let i=0;i<T.length;i++){const p=T[i];if(Math.hypot(p[0]-m.x,p[1]-m.z)>2.6)continue;if(menClear(u,m.x,m.z,p[0],p[1])){m.wp=[p[0],p[1]];break;}}
  if(!m.wp&&typeof navPath==='function'&&gx!=null){// 발자국으로도 안 되면(따로 떨어졌던 병사) 문을 아는 길찾기로 제 길을 낸다
    if(!m.np||t-m.npT>1.5){m.npT=t;const me={type:u.type,x:m.x,z:m.z,r:Math.floor(m.z),c:Math.floor(m.x)};m.np=navPath(me,gx,gz)||[];}
    while(m.np.length&&Math.hypot(m.np[0][0]-m.x,m.np[0][1]-m.z)<.03)m.np.shift();
    if(m.np.length&&menClear(u,m.x,m.z,m.np[0][0],m.np[0][1]))m.wp=m.np[0];}
  return m.wp;}
/* 병사와 같은 공간(같은 건물 또는 바깥)에 있는 가장 가까운 발자국 */
function menTrailNear(u,m){const T=u._tr||[];const a=tileAt(m.x,m.z);let best=null,bd=1e9;
  for(const p of T){const b=tileAt(p[0],p[1]);if(!b)continue;const same=a&&((a.t==='bldg')===(b.t==='bldg'))&&(a.t!=='bldg'||a.blk===b.blk);const d=Math.hypot(p[0]-m.x,p[1]-m.z)+(same?0:5);if(d<bd){bd=d;best=p;}}
  return best;}
/* 점 p에서 옆(nx,nz) 방향으로 몇 칸까지 비어 있는가(벽·건물 전까지, 최대 lim) */
function menFree(u,x,z,nx,nz,lim){let d=0;for(let s=.05;s<=lim+1e-6;s+=.05){if(!menClear(u,x,z,x+nx*s,z+nz*s))break;d=s;}return d;}
/* 이 분대가 지금 위협을 받는가: 제압, 최근 사격, 최근 피격 */
function menThreat(u){const t=G.time||0;return u.supp>0||t-(u.firedT??-99)<MEN.threatT||t-(u._hitT??-99)<MEN.threatT;}
/* 위협 방향(라디안): 마지막으로 쏜 적 → 내가 노리는 적 → 바라보는 쪽 */
function menThreatDir(u){const t=G.time||0;if(u._thr&&t-u._thr[2]<12)return Math.atan2(u._thr[1]-u.z,u._thr[0]-u.x);
  if(u.tgt!=null){const e=G.units.find(z=>z.id===u.tgt);if(e)return Math.atan2(e.z-u.z,e.x-u.x);}return (u.face||0)*Math.PI/180;}
/* 새 이동 명령: 앞쪽(첫 경유점에 가까운) 병사부터 차례로 출발 */
function menNewOrder(u,M){const p=u.path[0]||[u.x,u.z];const L=M.filter(menAct).sort((a,b)=>Math.hypot(a.x-p[0],a.z-p[1])-Math.hypot(b.x-p[0],b.z-p[1]));
  const thr=menThreat(u);L.forEach((m,k)=>{m.rank=k;m.lag=k*(thr?.12:.24)+menHash(u.id,k+70)*.15;m.sp=null;});u._plan=0;}
/* 이동 중 병사 한 명이 갈 곳: 발자국 위 자기 순번 자리, 넓은 길이면 길 한쪽(벽 쪽)으로 비켜서 */
function menMoveSpot(u,m,k){const wide=cell(u.r,u.c).t!=='bldg';let gap=wide?MEN.gapW:MEN.gapN;
  const P=menTrailAt(u,.04+gap*k);const nx=-P.dz,nz=P.dx;
  if(!wide||k===0)return [P.x,P.z];
  const side=k%2?1:-1;const fr=menFree(u,P.x,P.z,nx*side,nz*side,.42),fl=menFree(u,P.x,P.z,-nx*side,-nz*side,.42);
  if(fr+fl<.3)return [P.x,P.z];                       // 좁은 길·골목: 한 줄
  let lat=Math.max(0,Math.min(fr-.07,.34));if(fr<.12)lat=0;   // 넓은 길: 벽을 따라 비켜선다
  return [P.x+nx*side*lat,P.z+nz*side*lat];}
/* 멈춘 분대: 병사마다 엄폐 자리 고르기 */
function menPlan(u,M){const L=M.filter(menAct);if(!L.length)return;const th=menThreatDir(u);const ux=Math.cos(th),uz=Math.sin(th);const here=cell(u.r,u.c);
  u._plan=1;u._planT=G.time||0;u._planF=th;
  if(here.t==='bldg'){// 건물 안: 쏘는 쪽 벽(창가)을 따라 늘어선다
    const ax=Math.abs(ux)>Math.abs(uz);const cx=u.c+.5,cz=u.r+.5;const n=L.length;
    L.forEach((m,k)=>{const lat=(k-(n-1)/2)/Math.max(1,n-1)*.62;let x,z;
      if(k<6){if(ax){x=cx+Math.sign(ux)*.31;z=cz+lat;}else{z=cz+Math.sign(uz)*.31;x=cx+lat;}}
      else{x=cx+(menHash(u.id,90+k)-.5)*.4;z=cz+(menHash(u.id,95+k)-.5)*.4;}
      m.sp=[x,z];m.sec=th+(k%3-1)*.35;});return;}
  const objs=typeof coverObjs==='function'?coverObjs(u):[];const C=[];
  for(const rad of [0,.1,.18,.26,.34,.42]){const na=rad?Math.round(rad*40):1;for(let i=0;i<na;i++){const a=i/na*6.283+menHash(u.id,i)*.3;const x=u.x+Math.cos(a)*rad,z=u.z+Math.sin(a)*rad;
      if(rad&&!menClear(u,u.x,u.z,x,z))continue;const t=tileAt(x,z);if(!t||t.t==='bldg')continue;
      let cov=typeof dirCoverAt==='function'?dirCoverAt(x,z,ux,uz,'inf',u,objs).cov:0;
      // 벽에 붙기: 옆에 건물 벽이 있으면 조금 더 좋다(시가지에서는 벽을 따라 선다)
      let hug=0;for(const [p,q] of [[1,0],[-1,0],[0,1],[0,-1]]){const tt=tileAt(x+p*.13,z+q*.13);if(tt&&tt.t==='bldg'){hug=.06;break;}}
      C.push({x,z,s:cov+hug-rad*.22+(t.t==='rubble'?.04:0)+(typeof trenchAt==='function'&&trenchAt(x,z)?.6:0)});/* 참호가 있으면 그 안으로 */}}
  const taken=[];const ord=L.slice().sort((a,b)=>(a.i===0?-1:0)-(b.i===0?-1:0));
  ord.forEach((m,k)=>{let best=null,bs=-1e9;for(const c of C){let s=c.s;for(const t of taken){const d=Math.hypot(c.x-t[0],c.z-t[1]);if(d<MEN.spread)s-=1;else if(d<MEN.spread*1.6)s-=.08;}
      s-=Math.hypot(c.x-m.x,c.z-m.z)*.05;if(s>bs){bs=s;best=c;}}
    const p=best?[best.x,best.z]:[u.x,u.z];taken.push(p);m.sp=p;
    // 경계 방향: 위협 쪽 부채꼴로 나눠 보고, 맨 뒤 한 명은 뒤를 본다
    const n=L.length;m.sec=(k===n-1&&n>=4&&!menThreat(u))?th+Math.PI:th+((k%5)-2)*.32;});}
/* 쏠 수 있는 병사 고르기(분대 사격 때) */
function menShooters(u,k){const M=u._men;if(!M)return [];const t=G.time||0;
  const ok=M.filter(m=>menAct(m)&&m.rl<=0&&m.lag<=0&&!(m.pr>0&&m.crawl));const mv=ok.filter(m=>m.spd<.05);const pool=(mv.length?mv:ok).slice();
  const out=[];for(let i=0;i<k&&pool.length;i++){const j=Math.floor(Math.random()*pool.length);out.push(pool.splice(j,1)[0]);}
  for(const m of out){m.ft=t;m.mag--;if(m.mag<=0){const bud=M[m.i^1];if(bud&&menAct(bud)&&bud.rl>0&&m.mag>-2)continue;m.rl=(MEN.rl[u.type]||2.5)*(.85+Math.random()*.3);}}
  return out;}
/* 매 틱: 병사들 */
function menTick(u,dt){let M=u._men;if(!M)M=menInit(u);const t=G.time||0;
  // 사상자는 체력에서 거꾸로 셈하지 않고, 맞을 때마다 병사 한 명씩 정한다(05g-casualty의 hurtMen)
  menTrail(u);const moving=!!(u.path&&u.path.length)&&!u.climb;
  const pe=moving?u.path[u.path.length-1].join(','):'';if(moving&&u._pe!==pe)menNewOrder(u,M);u._pe=pe;
  const thr=menThreat(u);const L=M.filter(menAct);
  if(!moving){if(!u._plan||(thr&&Math.abs(Math.atan2(Math.sin(menThreatDir(u)-u._planF),Math.cos(menThreatDir(u)-u._planF)))>.8)||t-(u._planT||0)>15||u._planK!==key(u.r,u.c)){menPlan(u,M);u._planK=key(u.r,u.c);}}
  else u._plan=0;
  // 번갈아 이동: 위협 속에서 움직이면 앞조·뒷조가 교대로 멈춘다
  const bound=moving&&thr&&L.length>=4;const ph=Math.floor(t/MEN.bound)%2;
  const base=UT[u.type].mv*SPD_K*(u.supp>0?.65:1);const sorted=moving?L.slice().sort((a,b)=>(a.rank??a.i)-(b.rank??b.i)):L;
  sorted.forEach((m,k)=>{if(m.rl>0)m.rl-=dt;if(m.rl<=0&&m.mag<=0){m.mag=MEN.mag[u.type]||4;m.rl=0;}if(m.pr>0)m.pr-=dt;if(m.lag>0){m.lag-=dt;if(moving){m.spd=0;return;}}
    let gx,gz,dash=1;
    if(moving){[gx,gz]=menMoveSpot(u,m,k);const team=k<Math.ceil(L.length/2)?0:1;
      if(bound&&team!==ph&&Math.hypot(gx-m.x,gz-m.z)<.75){gx=m.x;gz=m.z;m.hold=1;}else{if(bound&&m.hold){dash=1.9;}m.hold=bound&&Math.hypot(gx-m.x,gz-m.z)>.15?m.hold:0;}}
    else{const sp=m.sp||[u.x,u.z];gx=sp[0];gz=sp[1];
      if(u.supp>0&&!m.pr)m.pr=.6+Math.random()*.6;}            // 제압: 엎드린다
    // 곧장 못 가면(벽·건물 경계) 분대장이 지나간 발자국을 거꾸로 따라간다: 지금 자리에서 곧게 보이는 가장 앞쪽 발자국으로
    if(Math.hypot(gx-m.x,gz-m.z)>.006&&!menClear(u,m.x,m.z,gx,gz)){const w=menVia(u,m,t,gx,gz);if(w){gx=w[0];gz=w[1];}}
    let dx=gx-m.x,dz=gz-m.z,d=Math.hypot(dx,dz);
    if(d>.3)dash=Math.max(dash,1.7);else if(d>.12)dash=Math.max(dash,1.25);
    const crawl=m.pr>0&&!moving;m.crawl=crawl;let sp=base*(crawl?.35:dash)*(m.rl>0&&!moving?.6:1);
    if(d>.006){const st=Math.min(d,sp*dt);let nx=m.x+dx/d*st,nz=m.z+dz/d*st;
      if(!menClear(u,m.x,m.z,nx,nz)){m.stk+=dt;nx=m.x;nz=m.z;m.wp=null;// 막혔으면 서서 다음 틱에 발자국 길을 다시 찾는다(벽은 절대 통과하지 않는다)
        if(m.stk>2.5){const P=menTrailNear(u,m);if(P){nx=P[0];nz=P[1];}m.stk=0;}}   // 오래 끼어 있으면 가장 가까운 발자국 자리로 옮긴다
      else m.stk=0;
      m.spd=Math.hypot(nx-m.x,nz-m.z)/dt;m.x=nx;m.z=nz;if(m.spd>.02)m.f=Math.atan2(dz,dx);}
    else m.spd=0;
    // 너무 멀리 떨어지면(밀려나거나 막힘) 분대장 곁으로 붙인다
    if(Math.hypot(m.x-u.x,m.z-u.z)>2.2){const P=menTrailAt(u,.1);m.x=P.x;m.z=P.z;}
    if(m.spd<=.02){const aim=t-m.ft<1.2&&m.aim;m.f=aim?Math.atan2(m.aim[1]-m.z,m.aim[0]-m.x):(m.sec??m.f)+Math.sin(t*.5+m.i*1.7)*.18;}});
  // 서로 겹치지 않게
  for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){const a=L[i],b=L[j];const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz),R=moving?.05:.07;if(d>=R)continue;
    const p=(R-d)/2,nx=d>1e-4?dx/d:Math.cos(i+j),nz=d>1e-4?dz/d:Math.sin(i+j);
    if(menClear(u,a.x,a.z,a.x-nx*p,a.z-nz*p)){a.x-=nx*p;a.z-=nz*p;}if(menClear(u,b.x,b.z,b.x+nx*p,b.z+nz*p)){b.x+=nx*p;b.z+=nz*p;}}}
/* 엔진에 끼우기: 틱 끝에 병사 갱신, 사격 때 실제로 쏜 병사·맞은 쪽 위협 방향 기록 */
{const _tick=rtTick;rtTick=function(dt){_tick(dt);if(!G||!G.units)return;for(const u of G.units)if(UT[u.type].cls==='inf')try{menTick(u,dt);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}};
 const _shoot=rtShoot;rtShoot=function(a,d){if(UT[a.type].cls==='inf'){if(!a._men)menInit(a);const sh=menShooters(a,VOLLEY[a.type]||1);for(const m of sh)m.aim=[d.x,d.z];a._sh=sh.map(m=>m.i);}
   d._thr=[a.x,a.z,G.time||0];d._hitT=G.time||0;return _shoot(a,d);};
 const _sb=rtShootBldg;rtShootBldg=function(a,r,c){if(UT[a.type].cls==='inf'){if(!a._men)menInit(a);const sh=menShooters(a,Math.min(3,VOLLEY[a.type]||1));for(const m of sh)m.aim=[c+.5,r+.5];a._sh=sh.map(m=>m.i);}return _sb(a,r,c);};}
