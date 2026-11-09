/* ===================== 상륙: 해변 출구 뚫기 =====================
   상륙 미션에서 차량이 해변·섬에 갇혀 줄지어 서 있던 문제(관전·부관 지휘 측정: 인천 월미도 차량 61%가 섬을 못 떠남,
   오마하 차량은 해변을 벗어나는 데 평균 56초·9%는 끝까지 갇힘)를 실제 상륙전처럼 푼다.
   - 궤도 차량(전차·자주포·궤도 장갑차·공병전차)은 절벽 숲을 밀고 오른다: 느리고(이동 비용 4), 지나간 자리의 나무가 쓰러진다.
     바퀴 차량(보급·구급·험비 등)은 여전히 출구 길로만 간다.
   - 공병 출구 개척: 해변에서 막힌 차량이 있으면 가까운 공병이 그 앞의 해변 장애물(고슴도치·방벽·철조망·지뢰)로 먼저 가서 걷어 내고,
     절벽에 막혔으면 차량 바로 앞 절벽에 폭약을 터뜨려 차량 길(x.cut)을 낸다. 실제 오마하에서도 공병과 불도저가 골짜기 출구 옆 절벽에 길을 새로 냈다.
   - 막힘 판정: 해안 지대(해변·섬·절벽)의 아군 지상 차량이 갈 곳이 있거나 해변에 서 있는데 8초 동안 0.3칸도 못 움직였으면 막힌 것. */
const LX={trk:{tank:1,spg:1,bmp:1,cev:1,spaa:1},bluffCost:4,stuck:8,reach:10,cutT:14,maxCut:5};
const lxZone=y=>!!(y&&!y.sea&&(y.sand||y.wall||y.mudz||y.pier||y.bluff||y.isl||y.cau||y.draw));
/* 1) 궤도 차량은 절벽을 오른다, 공병이 낸 길(cut)은 모든 차량이 지난다 */
{const _mc=mcost;mcost=function(type,x){if(x&&x.bluff){const t=UT[type];if(t&&!t.fly&&t.cls==='veh'){if(x.cut)return 2;if(LX.trk[type])return LX.bluffCost;}}return _mc(type,x);};}
/* 2) 절벽 숲을 지나가면 나무가 쓰러진다(05o-wreck의 숲 헤치기와 같다: 마당(yard) 칸이라 거기서 빠졌다) */
{const _c=fortCrush;fortCrush=function(u){_c(u);if(!G.camp||navCls(u)!=='trk'&&navCls(u)!=='dz')return;const t=cell(u.r,u.c);if(!t||!(t.bluff||t.isl))return;
  const L=u._lxf;if(L&&Math.hypot(L[0]-u.x,L[1]-u.z)<=.22)return;u._lxf=[u.x,u.z];if(typeof wrkInit==='function')wrkInit();
  t.tl=Math.min(1,Math.round(((t.tl||0)+.06)*100)/100);if(G.fellZ&&G.fellZ.length<(typeof WRK!=='undefined'?WRK.maxFell:400))G.fellZ.push({x:Math.round(u.x*100)/100,z:Math.round(u.z*100)/100,r:.09,tk:1});G.wrkV=(G.wrkV||0)+1;};}
/* 3) 막힌 차량 찾기 */
function lxJammed(dt){const out=[];const t=G.time||0;
  for(const u of G.units){if(u.nat!==0||UT[u.type].fly||UT[u.type].cls!=='veh'||u.hp<=0)continue;const y=tileAt(u.x,u.z);
    if(!lxZone(y)){u._lxS=0;continue;}
    const P=u._lxP;if(!P||Math.hypot(P[0]-u.x,P[1]-u.z)>.3){u._lxP=[u.x,u.z];u._lxS=0;continue;}
    const onBeach=y.sand||y.wall||y.mudz||y.pier||y.isl||y.cau;const want=(u.path&&u.path.length)||onBeach;
    if(!want||u.hold&&!onBeach){u._lxS=0;continue;}u._lxS=(u._lxS||0)+dt;if(u._lxS>=LX.stuck)out.push(u);}
  return out;}
/* 차량 앞(동쪽, 가는 쪽)을 막는 적 장애물 */
function lxBlockers(u){const cls=navCls(u);const F=(G.forts||[]).filter(f=>f.nat!==0&&LAND_CLR[f.k]&&f.prog>=1&&(f.k==='mine'||NAV_RULE[f.k]&&NAV_RULE[f.k][cls]===2));let tx=u.x+1.5,tz=u.z;   // 이 차량을 실제로 막는 것(지뢰는 밟으면 터진다)let tx=u.x+1.5,tz=u.z;
  if(u.path&&u.path.length){const p=u.path[Math.min(u.path.length-1,2)];if(Array.isArray(p)){tx=p[0];tz=p[1];}else if(p&&p.x!=null){tx=p.x;tz=p.z;}else if(p&&p.c!=null){tx=p.c+.5;tz=p.r+.5;}}
  return F.filter(f=>{const d=Math.hypot(f.x-u.x,f.z-u.z);if(d>2.6)return false;return (f.x-u.x)*(tx-u.x)+(f.z-u.z)*(tz-u.z)>-.2||d<.8;}).sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z));}
/* 차량 바로 앞 절벽 줄: 그 줄의 절벽 칸(동쪽으로 이어진 것) */
function lxBluffRow1(r,x0){if(!inb(r,0))return null;let c=Math.floor(x0);for(let k=0;k<3&&inb(r,c+1)&&!G.map[r][c].bluff;k++)c++;
  if(!G.map[r][c]||!G.map[r][c].bluff||G.map[r][c].cut)return null;const tl=[];while(inb(r,c)&&G.map[r][c].bluff){tl.push(c);c++;}
  if(!inb(r,c)||mcost('sup',G.map[r][c])===Infinity)return null;
  if((G.forts||[]).some(f=>f.nat!==0&&f.k==='bunker'&&Math.abs(f.z-r-.5)<1.1&&f.x>=tl[0]-1&&f.x<c+.5))return null;return {r,c0:tl[0],tl};}
/* 차량 앞 절벽 줄(가까운 줄부터, 6줄 안): 절벽 칸들과 그 너머가 차가 다닐 땅이어야 한다 */
function lxBluffRow(u){const r0=Math.floor(u.z);for(let k=0;k<=12;k++){const d=k%2?(k+1)/2:-k/2;const o=lxBluffRow1(r0+d,u.x);if(o)return o;}return null;}   // 위가 건물이면 옆 줄(마을 길로 이어지는 줄)
function lxFreeEng(x,z,R){let best=null,bd=R;for(const e of G.units){if(e.nat!==0||e.type!=='eng'||e.hp<=0||e.man||e.brk||e._lxJob)continue;
    if(e._clr>0)continue;const d=Math.hypot(e.x-x,e.z-z);if(d<bd){bd=d;best=e;}}return best;}
const LX_BLOW={nest:1,wire:1,hedgehog:1,jersey:1,sandbag:1,mine:1};
function lxCut(job){const C=G.camp,S=C.st;const {r,tl}=job;for(const c of tl){const y=G.map[r][c];y.cut=1;y.tl=Math.max(y.tl||0,.85);}
  // 길 위의 적 진지·장애물도 함께 날린다(벙커는 남는다: 벙커 줄은 고르지 않는다)
  for(const f of (G.forts||[]).slice())if(f.nat!==0&&LX_BLOW[f.k]&&f.z>=r-.15&&f.z<r+1.15&&f.x>=tl[0]-.6&&f.x<tl[tl.length-1]+1.2)fortRemove(f,'clear');
  if(typeof wrkInit==='function'){wrkInit();for(const c of tl){if(typeof wrkFell==='function')wrkFell(c+.5,r+.5,.7,6);}
    if(typeof wrkCrater==='function')wrkCrater(tl[0]+.35,r+.5,.22);}
  G.navV=(G.navV||0)+1;G.wrkV=(G.wrkV||0)+1;if(typeof wrkReroute==='function')wrkReroute(tl[0]+.5,r+.5,3.5);bump();
  try{sfx('boom',1.4,tl[0]+.5,r+.5);}catch(e){}if(typeof FXH!=='undefined'&&typeof FXH.demo==='function')try{FXH.demo(tl[0]+.5,r+.5,1);}catch(e){}
  (C.cutL=C.cutL||[]).push({r,c1:tl[tl.length-1]+1});S.cuts=(S.cuts||0)+1;campMsg(`공병이 절벽에 폭약을 터뜨려 차량 길을 냈습니다 (${S.cuts}곳)`);}
/* 4) 공병 출구 개척 */
function lxTick(dt){const C=G.camp;if(!C||!landOn())return;const S=C.st;const J=lxJammed(dt);C._lxJobs=C._lxJobs||[];
  // 해변에 멈춰 선 차량: 공병이 낸 절벽 길이 가까이 있으면 그리로 올라간다(출구 길은 10c가 보낸다)
  if(C.cutL&&C.cutL.length)for(const u of J){if(u.hold||u.man&&!G.nats[0].auto&&!isAI(0)||(u.path&&u.path.length)||G.time-(u._lxGo||-99)<6)continue;
    const L=C.cutL.reduce((a,b)=>Math.abs(b.r+.5-u.z)<Math.abs(a.r+.5-u.z)?b:a);if(Math.abs(L.r+.5-u.z)>8)continue;u._lxGo=G.time;try{orderMoveTo(u,L.c1+.5,L.r+.5);}catch(e){}}
  // 일감 만들기: 막힌 차량마다 앞의 장애물, 없으면 앞의 절벽
  for(const u of J){if(C._lxJobs.some(j=>Math.hypot(j.x-u.x,j.z-u.z)<1.6))continue;
    const B=lxBlockers(u);if(B.length){const f=B[0];if(C._lxJobs.some(j=>j.f===f))continue;C._lxJobs.push({k:'clr',f,x:f.x,z:f.z,t:G.time,u:u.id});continue;}
    if((S.cuts||0)+C._lxJobs.filter(j=>j.k==='cut').length>=LX.maxCut)continue;
    if((C.cutL||[]).some(L=>Math.abs(L.r+.5-u.z)<=6))continue;   // 가까이 이미 낸 길이 있다: 그리로 간다
    const row=lxBluffRow(u);
    if(row&&!C._lxJobs.some(j=>j.k==='cut'&&Math.abs(j.r-row.r)<=1))C._lxJobs.push({k:'cut',...row,x:row.c0+.25,z:row.r+.5,t:G.time,u:u.id,w:0});}
  // 일감 처리
  C._lxJobs=C._lxJobs.filter(j=>{
    if(j.k==='clr'&&!G.forts.includes(j.f)){lxFree(j);return false;}
    if(j.k==='cut'&&G.map[j.r][j.c0].cut){lxFree(j);return false;}
    if(G.time-j.t>90){lxFree(j);return false;}   // 오래 못 하면 버린다(다시 막히면 새로 만든다)
    let e=j.e!=null?G.units.find(o=>o.id===j.e&&o.hp>0):null;
    if(!e||e.man||e.brk){if(e)e._lxJob=null;e=lxFreeEng(j.x,j.z,LX.reach);if(!e){j.e=null;return true;}j.e=e.id;e._lxJob=j;j.go=-99;}
    const d=Math.hypot(e.x-j.x,e.z-j.z),moving=e.path&&e.path.length;
    if(d>(j.k==='clr'?.85:1)){if(!moving&&G.time-(j.go||-99)>4){j.go=G.time;e._clrGo=G.time;try{orderMoveTo(e,j.k==='clr'?j.x-.25:j.x,j.z);}catch(err){}}return true;}
    if(moving)return true;j.w=(j.w||0)+dt*(e.supp?.5:1);e._clrGo=G.time;
    if(j.k==='clr'){if(j.w>=8){fortRemove(j.f,'clear');S.clr=(S.clr||0)+1;campMsg('공병이 막힌 차량 앞 장애물을 걷어 냈습니다');lxFree(j);return false;}return true;}   // 걷어 내기 8초(10c와 같다)
    if(j.w>=LX.cutT){lxCut(j);lxFree(j);return false;}return true;});}
function lxFree(j){if(j.e==null)return;const e=G.units.find(o=>o.id===j.e);if(e&&e._lxJob===j)e._lxJob=null;}
{const _t=landTick;landTick=function(C,dt){_t(C,dt);C._lxT=(C._lxT||0)+dt;if(C._lxT>=.5){const d=C._lxT;C._lxT=0;lxTick(d);}};}
/* 5) 일감을 맡은 공병은 10c landClearTick(3.5칸 안 가장 가까운 장애물)이 다른 곳으로 끌고 가지 않게 뺀다 */
{const _lc=landClearTick;landClearTick=function(dt){const J=(G.camp&&G.camp._lxJobs)||[];if(!J.length)return _lc(dt);
  const units=G.units;G.units=units.filter(u=>!u._lxJob);try{_lc(dt);}finally{G.units=units;}};}
