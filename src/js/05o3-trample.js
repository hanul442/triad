/* ===================== 차량이 나무·덤불을 쓰러뜨리며 지나간다 =====================
   나무 하나하나(05f4-veg가 화면과 같은 자리로 계산한 원)를 차체 사각형으로 훑는다.
   차량마다 넘어뜨릴 수 있는 줄기 굵기(가슴높이 지름, cm)가 다르다. 미 육군 지형 분석 교범(FM 5-33)은
   궤도 차량이 지름 20cm 안팎의 나무까지 밀어 넘기고, 그보다 굵은 나무가 빽빽한 숲은 전차에도 장애물이라고 본다.
   주력전차(50–60t)는 40cm, 공병전차(배토판)는 55cm, 자주포·보병전투차 25–30cm, 바퀴 장갑차 15cm,
   트럭·험비 같은 가벼운 바퀴 차량은 어린나무(6cm)만 넘기고 덤불만 깔아뭉갠다.
   - 넘길 수 있는 나무: 진행 방향으로 쓰러진다(G.fellZ에 그 나무 자리만 적는다 → 07zw가 눕혀 그림, 05f4 vegDown이 길을 열어 줌).
     굵을수록 차가 잠깐 더 느려진다. 숲 칸의 x.tl이 올라 많이 쓰러진 숲은 시야를 덜 가린다(04b).
     굵은 줄기(15cm 이상)는 땅에 누운 통나무 엄폐(G.covers kind 'log')가 된다.
   - 못 넘기는 굵은 나무: 차체 앞에 걸리면 옆으로 비켜 가며 크게 느려진다. 계속 밀면(2.5초) 1.6배 굵기까지는 결국 넘어간다.
   - 덤불: 모든 지상 차량이 깔아뭉갠다(G.tramp). 깔린 덤불은 병사가 그냥 지나간다.
   - 바퀴 차량은 숲(야생림) 칸에서 더 느리다(이동 비용 2 → 3). 궤도 차량은 그대로. */
const TRP={cap:{tank:40,cev:55,spg:30,bmp:25,spaa:28,ifv:20,rec:12,mlrs:10,mortv:8,zu:6,hmv:6,sup:6,amb:6,vbied:6},
  logCm:15,maxLog:700,maxFell:3000,push:2.5,forceK:1.6,tlTree:.07};
WRK.maxFell=Math.max(WRK.maxFell,TRP.maxFell);
COVK.log=COVK.log||{n:'쓰러진 나무',v:.35};
const trpCap=u=>TRP.cap[u.type]??(VEH[u.type]&&VEH[u.type].trk?25:6);
/* 나무 줄기 지름(cm): 원 반지름에서 어림하고 자리마다 ±15% 다르게 */
function trpCm(o){if(o.t!=='tree')return 0;if(o.p)return 35;const r=o.r-VEG.body;const j=.85+vegFallH(Math.round(o.x*733),Math.round(o.z*739))*.3;
  return Math.round((r<.045?r*1200:r*300)*j);}
const trpKey=o=>Math.round(o.x*1000)+'|'+Math.round(o.z*1000);
function trpInit(){if(!G)return;if(!G.tramp)G.tramp=[];if(!G._trK||G._trK.ref!==G.tramp){const s=new Set(G.tramp.map(trpKey));Object.defineProperty(G,'_trK',{value:{ref:G.tramp,s},writable:true,configurable:true,enumerable:false});}return G._trK.s;}
/* 깔린 덤불은 병사를 막지 않는다 */
{const _d=vegDown;vegDown=function(o){if(o.t==='bush'&&G.tramp&&G.tramp.length&&trpInit().has(trpKey(o)))return true;return _d(o);};}
/* 나무 하나 쓰러뜨리기. dir = 쓰러지는 방향(라디안, x→z) */
function trpFell(o,dir,cm){wrkInit();G.fellZ.push({x:Math.round(o.x*1e4)/1e4,z:Math.round(o.z*1e4)/1e4,r:.02,tk:1,fd:Math.round(dir*100)/100});
  o.fv=-1;G.wrkV=(G.wrkV||0)+1;
  const r=Math.floor(o.z),c=Math.floor(o.x),t=inb(r,c)?G.map[r][c]:null;
  if(t&&t.t==='park'){const was=t.tl||0;t.tl=Math.min(1,Math.round((was+TRP.tlTree)*100)/100);if(was<.6&&t.tl>=.6)bump();}
  // 누운 줄기: 통나무 엄폐(쓰러진 방향으로 줄기 가운데쯤)
  if(cm>=TRP.logCm&&Array.isArray(G.covers)){const n=G._trLog=(G._trLog||0);if(n<TRP.maxLog){G._trLog=n+1;const L=Math.min(.12,.03+cm*.002);
    G.covers.push({x:Math.round((o.x+Math.cos(dir)*L)*1000)/1000,z:Math.round((o.z+Math.sin(dir)*L)*1000)/1000,r:.07,kind:'log',cov:cm>=30?.4:.3,h:Math.min(.05,.015+cm*.0008),trp:1});}}
  if(FXH.treeFall)FXH.treeFall(o.x,o.z,cm,dir);}
function trpBush(o){const s=trpInit();const k=trpKey(o);if(s.has(k))return;s.add(k);G.tramp.push({x:Math.round(o.x*1000)/1000,z:Math.round(o.z*1000)/1000});G.trampV=(G.trampV||0)+1;}
/* 차 한 대가 지금 자리에서 훑는다 */
function trpTick(u){const cls=navCls(u);if(cls!=='trk'&&cls!=='veh'&&cls!=='dz')return;if(typeof vegNear!=='function')return;
  const L0=u._trp;if(L0&&Math.hypot(L0[0]-u.x,L0[1]-u.z)<.035)return;u._trp=[u.x,u.z];
  const s=vSpec(u),a=(u.hd??u.face??0)*Math.PI/180,cs=Math.cos(a),sn=Math.sin(a),cap=trpCap(u),now=G.time||0;
  const R=Math.hypot(s.hl,s.hw)+.06;const seen=new Set();let slow=1,push=0,hit=null;
  for(let rr=Math.floor(u.z-R);rr<=Math.floor(u.z+R);rr++)for(let cc=Math.floor(u.x-R);cc<=Math.floor(u.x+R);cc++){const Lc=vegNear(cc+.5,rr+.5);if(!Lc)continue;
    for(const o of Lc){if(seen.has(o))continue;seen.add(o);const dx=o.x-u.x,dz=o.z-u.z;if(dx*dx+dz*dz>R*R)continue;
      const lx=dx*cs+dz*sn,lz=-dx*sn+dz*cs;   // 차체 좌표: lx 앞, lz 옆
      if(o.t==='bush'){const br=(o.r-VEG.body)*.5;if(Math.abs(lx)<=s.hl+br&&Math.abs(lz)<=s.hw+br&&!vegDown(o))trpBush(o);continue;}
      if(o.p)continue;   // 보카주 나무는 생울타리째(05o-wreck)
      const tr=.012;if(Math.abs(lx)>s.hl+tr||Math.abs(lz)>s.hw+tr)continue;if(vegDown(o))continue;
      const cm=trpCm(o);
      if(cm<=cap){const side=(vegFallH(Math.round(o.x*577),Math.round(o.z*613))-.5)*.8+(lz>0?.25:-.25);   // 앞으로, 걸린 쪽으로 조금 비껴
        trpFell(o,a+(u.vs<0?Math.PI:0)+side,cm);slow=Math.min(slow,1-.45*cm/Math.max(cap,1));continue;}
      // 너무 굵다: 앞쪽에 걸렸을 때만 비킨다(뒤로 빼는 중이면 무시)
      if(lx<s.hl*.2||u.vs<0)continue;
      const c=u._trC;if(c&&c.k===trpKey(o)){if(now-c.t>TRP.push){if(cm<=cap*TRP.forceK){trpFell(o,a,cm);u._trC=null;slow=Math.min(slow,.35);}else c.pass=1;continue;}if(c.pass)continue;}
      else u._trC={k:trpKey(o),t:now};
      slow=Math.min(slow,.45);const need=s.hw+tr-Math.abs(lz);if(need>Math.abs(push)){push=(lz>0?-1:1)*need;hit=o;}}}
  if(slow<1){if(!(u._trT>now))u._trS=1;u._trS=Math.min(u._trS,slow);u._trT=now+.4;}
  if(hit){const st=Math.min(Math.abs(push),.012)*Math.sign(push);const nx=u.x-sn*st,nz=u.z+cs*st;   // 옆(lz 방향)으로
    if(walkable(u,nx,nz)&&!wallCross(u,u.x,u.z,nx,nz)){u.x=nx;u.z=nz;}}}
/* 나무 목록이 없는 숲 칸(캠페인 지도 등): 예전처럼 지나간 자리 둘레를 칸 단위로 쓰러뜨린다 */
function wrkForestFallback(u){const t=cell(u.r,u.c);if(!t||t.t!=='park'||t.yard)return;const L=vegNear(u.x,u.z);if(L&&L.some(o=>o.t==='tree'))return;
  const P=u._wfl;if(P&&Math.hypot(P[0]-u.x,P[1]-u.z)<=.22)return;u._wfl=[u.x,u.z];wrkInit();
  t.tl=Math.min(1,Math.round(((t.tl||0)+.04)*100)/100);if(G.fellZ.length<WRK.maxFell)G.fellZ.push({x:Math.round(u.x*100)/100,z:Math.round(u.z*100)/100,r:.08,tk:1,fd:Math.round((u.hd||0)*Math.PI/180*100)/100});G.wrkV=(G.wrkV||0)+1;}
/* 05o-wreck이 감싼 fortCrush 위에 덧댄다(차가 움직인 틱마다 불린다) */
{const _c=fortCrush;fortCrush=function(u){_c(u);try{trpTick(u);}catch(e){}};}
/* 나무를 밀어 넘기는 동안 잠깐 느려진다 */
{const _mv=rtMove;rtMove=function(u,dt){if(u._trT!=null){const now=G.time||0;if(u._trT>now&&isGV(u))return _mv(u,dt*(u._trS||1));u._trT=null;u._trS=1;}return _mv(u,dt);};}
/* 바퀴 차량은 숲에서 더 느리다 */
{const _mc=mcost;mcost=function(type,x){const v=_mc(type,x);if(v===2&&x&&x.t==='park'&&x.wild&&!x.orch){const t=UT[type];if(t&&t.cls==='veh'&&!t.fly&&!(VEH[type]&&VEH[type].trk)&&(TRP.cap[type]??6)<15&&type!=='cev')return 3;}return v;};}
{const _n=newGame;newGame=function(){const v=_n.apply(this,arguments);if(G){G.tramp=[];G.trampV=0;G._trLog=0;}return v;};}
