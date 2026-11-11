/* ===================== STREET: 시가지 제병협동 기동(교범식 거리 대형) =====================
   "무리를 지어서 가고 실제 교범 교리에 맞게". 05o-form의 행군 대형(선두 발자국 따라가기)을 시가지 거리에서 교범식으로 바꾼다.
   양쪽에 건물이 늘어선 거리(양쪽 벽이 2.6칸 안)에서만 쓰고, 트인 곳에서는 예전 종대·쐐기·차체 뒤 동행 그대로.
   공개 교범에서 가져온 규칙(출처는 README '거리 대형'):
   - 보병은 길 한가운데가 아니라 양쪽 인도, 건물 벽을 따라 간다. 분대마다 왼쪽·오른쪽을 나눠 맡는다(FM 7-7 4-17 "dismount teams staggered along the street sides").
     분대 안 병사들도 그 벽 쪽으로 한두 줄(05f-men). 길 건너편 건물 위층을 서로 봐 준다.
   - 차량은 길 가운데. 넓은 길(약 18m 이상)은 두 줄로 엇갈려(한쪽에 한 대씩, 서로 엄호), 좁은 길은 한 줄(FM 3-06.11 4-4d "one tank on each side", "single file").
     간격은 넓은 길 약 11m 엇갈림, 좁은 길 약 15m.
   - 누가 앞장서나: 적이 알려지지 않았으면 전차가 앞장서고 보병은 차량 옆을 따라 걷는다(차량 옆, 포 앞으로는 나서지 않음).
     적이 알려졌으면(교전 가능) 보병 두 분대(길 양쪽 하나씩, 좁은 길이면 하나)가 약 17m 앞서 나가고 차량은 뒤에서 엄호(FM 3-21.71 6-2e "two squads leading, one on either side of the street").
   - 포탑 경계 방향: 선두는 앞, 넓은 길의 둘째 줄부터는 길 건너편(위층), 좁은 길은 오른쪽·왼쪽 번갈아, 맨 뒤 차량은 뒤(FM 7-7 4-6 "lead orients to the front, the second to the right, the third to the left, the fourth to the rear").
     포탑 방향은 닫힌 해치 시야(05k-optics)에도 쓰이니 대열 전체가 사방을 본다.
   - 교차로: 그냥 지나가지 않는다(FM 3-06.11 "intersections ... normally used as engagement areas"). 선두 보병 분대가 길모퉁이로 먼저 가서 옆길을 살피는 동안
     선두 차량은 교차로 앞에서 잠깐 서고, 모퉁이를 잡으면(또는 8초) 멈추지 않고 건넌다. 건너는 동안 선두 포탑은 옆길을 본다. 다 건너면 모퉁이 분대가 따라붙는다.
   - 걸음: 선두는 가장 느린 부대에 맞추고 뒤처지면 늦추거나 기다린다(05o-form 그대로, "rate of movement is controlled by the lead element").
   게임 규칙(명중·피해)은 바꾸지 않는다. 무작위를 쓰지 않는다. */
const ST={scan:2.6,wide:1.5,gapW:.9,gapN:1.25,lane:.42,edge:.18,lead:1.4,infGap:1.1,upd:.3,secMid:60,xLook:[1.2,1.6,2.0,2.4],xOpen:1.0,xHold:8,xKeep:9,xPass:1.6,xMem:2.5};
const ST_VEH_SEC={tank:1,ifv:1,hmv:1,spg:1,aa:1};
const stP=(u,k,v)=>Object.defineProperty(u,k,{value:v,writable:true,configurable:true,enumerable:false});
/* 한쪽으로 벽(건물 칸·지도 끝)까지 비어 있는 거리 */
function stExt(x,z,nx,nz){const a=tileAt(x,z);for(let s=.05;s<=ST.scan+1e-6;s+=.1){const t=tileAt(x+nx*s,z+nz*s);if(!t)return {e:s-.05,b:1};if(t.t==='bldg'&&t!==a)return {e:s-.05,b:1};}return {e:ST.scan,b:0};}
/* 그 점에서 본 거리 모양: p=+쪽(진행 방향 기준 n=(-hz,hx)) 벽까지, m=-쪽 벽까지. 양쪽이 모두 건물이면 거리 */
function stGeo(x,z,hx,hz){const nx=-hz,nz=hx;const a=stExt(x,z,nx,nz),b=stExt(x,z,-nx,-nz);
  const t=tileAt(x,z);const street=!!a.b&&!!b.b&&!!t&&t.t!=='bldg'&&a.e+b.e>.5;return {p:a.e,m:b.e,pb:a.b,mb:b.b,w:a.e+b.e,street,nx,nz};}
/* 선두 길 앞쪽 d칸 점(길이 모자라면 끝점) */
function stAhead(R,d){let px=R.x,pz=R.z,left=d;const P=R.path||[];let hx,hz;[hx,hz]=formHead(R);
  for(const p of P){const s=Math.hypot(p[0]-px,p[1]-pz);if(s<1e-6)continue;const dx=(p[0]-px)/s,dz=(p[1]-pz)/s;
    if(s>=left)return {x:px+dx*left,z:pz+dz*left,dx,dz,ok:1};left-=s;px=p[0];pz=p[1];hx=dx;hz=dz;}
  return {x:px,z:pz,dx:hx,dz:hz,ok:0};}
/* ---------- 대열 묶음: 맨 앞(뿌리) 부대별로 차량·보병 ---------- */
const stG=new Map(),stI=new Map();
function stRoot(f){let R=f,g=0;while(R.fol&&g++<12){const q=formUnit(R.fol.L);if(!q||q===f)break;R=q;}return R;}
function stPlan(){stG.clear();stI.clear();const t=G.time||0;
  for(const f of G.units){if(!f.fol||UT[f.type].fly)continue;const R=stRoot(f);if(R===f||R.fol)continue;
    let P=stG.get(R.id);if(!P){P={R,veh:[],inf:[]};stG.set(R.id,P);}(formGV(f)?P.veh:P.inf).push(f);}
  for(const P of stG.values()){const R=P.R;
    const dep=u=>{let g=0,x=u;while(x&&x.fol&&g<12){x=formUnit(x.fol.L);g++;}return g;};
    P.veh.sort((a,b)=>dep(a)-dep(b)||a.id-b.id);
    // 보병: 처음 본 순서대로 왼쪽·오른쪽을 정해 둔다(뿌리가 바뀌면 다시)
    const cnt={1:0,'-1':0};for(const f of P.inf)if(f._stSd&&f._stSd.R===R.id)cnt[f._stSd.s]++;
    const [hx,hz]=formHead(R);let so=0;for(const f of P.inf)if(f._stSd&&f._stSd.R===R.id)so=Math.max(so,f._stSd.o+1);
    for(const f of P.inf.slice().sort((a,b)=>Math.hypot(a.x-R.x,a.z-R.z)-Math.hypot(b.x-R.x,b.z-R.z))){if(f._stSd&&f._stSd.R===R.id)continue;
      const lat=(f.x-R.x)*(-hz)+(f.z-R.z)*hx;let s=cnt[1]<cnt[-1]?1:cnt[-1]<cnt[1]?-1:(lat>=0?1:-1);cnt[s]++;stP(f,'_stSd',{R:R.id,s,o:so++});}
    P.inf.sort((a,b)=>a._stSd.o-b._stSd.o);
    const side={1:[],'-1':[]};for(const f of P.inf)side[f._stSd.s].push(f);P.side=side;
    P.veh.forEach((v,j)=>stI.set(v.id,{P,j:j+1}));
    for(const s of [1,-1])side[s].forEach((f,r)=>stI.set(f.id,{P,s,r}));
    P.th=formThreat(R);P.geo=stGeo(R.x,R.z,hx,hz);if(P.geo.street)stP(R,'_stT',t);stXing(P,t);}}
/* ---------- 자리 ---------- */
function stLat(p,h,lat,f){const x=p.x+h.nx*lat,z=p.z+h.nz*lat;if(formClear(f,p.x,p.z,x,z))return [x,z];
  const x2=p.x+h.nx*lat*.5,z2=p.z+h.nz*lat*.5;if(formClear(f,p.x,p.z,x2,z2))return [x2,z2];return [p.x,p.z];}
function stVehSlot(f,I,orig){const {P,j}=I;const R=P.R;const wide=P.geo.street&&P.geo.w>=ST.wide;
  const back=j*(wide?ST.gapW:ST.gapN)+(formGV(R)?0:ST.gapN*.5);
  const p=formTrailAt(R,back,f);const h=stGeo(p.x,p.z,p.dx,p.dz);const nV=P.veh.length+(formGV(R)?1:0);
  const last=nV>=3&&j===nV-(formGV(R)?1:0);
  // 포탑 경계 방향
  let sec;if(last)sec=180;else if(!h.street)sec=(j%2?1:-1)*45;
  const inSt=h.street||P.geo.street||(G.time||0)-(R._stT||-99)<4;
  if(!inSt){stAim(f,p,sec);return orig();}   // 트인 곳: 05o-form 차량 종대 그대로
  if(!h.street){stAim(f,p,sec??(j%2?-1:1)*ST.secMid);return [p.x,p.z];}   // 교차로 안: 선두 바퀴 자국 위로
  const c=(h.p-h.m)/2;   // 거리 가운데(+쪽으로 c)
  if(h.w>=ST.wide){const q=Math.min(ST.lane,h.w/4);const sR=Math.abs(c)<.12?1:(c>0?-1:1);   // 선두가 달린 차로 쪽
    const s=j%2?-sR:sR;if(sec==null)sec=-s*ST.secMid;stAim(f,p,sec);return stLat(p,h,c+s*q,f);}
  if(sec==null)sec=(j%2?-1:1)*ST.secMid;stAim(f,p,sec);return stLat(p,h,c,f);}
/* 포탑 방향(차체 진행 방향 기준 각, +는 n=(-hz,hx) 쪽). 각도 계산은 05b2와 같은 vDeg */
function stAim(f,p,sec){if(!ST_VEH_SEC[f.type])return;const a=vDeg(p.dx,p.dz);const nA=vDeg(-p.dz,p.dx);const sgn=vDiff(nA,a)>0?1:-1;
  stP(f,'_stAim',a+sgn*sec);stP(f,'_stAimT',G.time||0);}
function stInfSlot(f,I){const {P,s,r}=I;const R=P.R;const t=G.time||0;
  const X=R._xg;if(X&&X.sq&&X.sq.includes(f.id)&&X.ph!=='done'){stP(f,'_stSide',s);stP(f,'_stSideT',t);return X.cn[s];}
  const vehs=P.veh.length+(formGV(R)?1:0);const wide=P.geo.street&&P.geo.w>=ST.wide;let back;
  if(!vehs){back=.2+r*1.0+(s<0?.5:0);}   // 보병만: 양쪽 벽을 따라 엇갈려
  else if(P.th){// 교전 가능: 선두 분대(넓은 길 둘, 좁은 길 하나)가 앞장, 나머지는 차량 옆
    const lead=r===0&&(wide||s>0);back=lead?-ST.lead:(r-(wide?1:0)+(s<0&&!wide?1:0))*ST.infGap+.3;}
  else{const colLen=Math.max(0,vehs-1)*(wide?ST.gapW:ST.gapN);const nS=P.side[s].length;const sp=Math.min(1.6,Math.max(.9,(colLen+.6)/Math.max(1,nS-1)));
    back=-.25+r*sp+(s<0?.35:0);}   // 차량 옆을 따라(포 앞으로는 나서지 않게 선두 차체 옆에서 시작)
  const p=back<0?stAhead(R,-back):formTrailAt(R,back,f);const h=stGeo(p.x,p.z,p.dx,p.dz);
  // 교차로·광장 어귀(한쪽이 트임): 대열이 거리에 있으면 같은 쪽 줄을 지킨다(벽이 있으면 벽 곁, 없으면 길 가장자리쯤)
  if(!h.street&&!(P.geo.street||t-(R._stT||-99)<4))return null;
  const ws=s>0?h.p:h.m,wb=s>0?h.pb:h.mb;
  const lat=s*(h.street||wb?Math.max(0,ws-ST.edge):Math.min(ws,(f._stL||.7)));stP(f,'_stL',Math.abs(lat));
  stP(f,'_stSide',s);stP(f,'_stSideT',t);return stLat(p,h,lat,f);}
{const _s=formSlot;formSlot=function(f,L){const I=stI.get(f.id);if(!I)return _s(f,L);
  if(I.j!=null){const P=I.P;if(!P.geo.street&&!formGV(P.R))return _s(f,L);return stVehSlot(f,I,()=>_s(f,L));}
  const v=stInfSlot(f,I);if(v){stP(f,'_stS',v);return v;}return _s(f,L);};}
/* ---------- 교차로 ---------- */
function stXing(P,t){const R=P.R;let X=R._xg;
  if(X){const along=(R.x-X.x)*X.hx+(R.z-X.z)*X.hz;
    if(X.ph==='app'&&(along>-formHull(R).hl-.45||!R.path||!R.path.length)){X.ph=X.sq.length?'hold':'go';X.t1=t;}
    if(X.ph==='hold'){const ok=X.sq.every(id=>{const f=formUnit(id);if(!f||!f.fol)return true;const c=X.cn[f._stSd?f._stSd.s:1];return Math.hypot(f.x-c[0],f.z-c[1])<.5;});
      if(ok||t-X.t1>ST.xHold){X.ph='go';X.t1=t;}}
    if(X.ph==='go'&&(along>X.d0+ST.xPass||t-X.t1>ST.xKeep)){stP(R,'_xgLast',[X.x,X.z]);R._xg=null;stP(R,'_xg',null);}
    else if(t-X.t0>ST.xHold+ST.xKeep+12){R._xg=null;}
    return;}
  if(!P.geo.street||!R.path||!R.path.length||!formGV(R)&&!P.veh.length)return;
  const g=P.geo;
  for(const d of ST.xLook){const p=stAhead(R,d);if(!p.ok)break;const h=stGeo(p.x,p.z,p.dx,p.dz);
    if(!(h.p>g.p+ST.xOpen||h.m>g.m+ST.xOpen||!h.street&&tileAt(p.x,p.z)&&tileAt(p.x,p.z).t!=='bldg'))continue;
    const L=R._xgLast;if(L&&Math.hypot(L[0]-p.x,L[1]-p.z)<ST.xMem)return;
    // 모퉁이: 교차로 직전 점에서 양쪽 벽 곁
    const q=stAhead(R,Math.max(.3,d-.45));const hq=stGeo(q.x,q.z,q.dx,q.dz);
    const cn={1:[q.x+hq.nx*Math.max(0,hq.p-ST.edge),q.z+hq.nz*Math.max(0,hq.p-ST.edge)],'-1':[q.x-hq.nx*Math.max(0,hq.m-ST.edge),q.z-hq.nz*Math.max(0,hq.m-ST.edge)]};
    const sq=[];for(const s of [1,-1]){const f=P.side&&P.side[s][0];if(f)sq.push(f.id);}
    // 옆길이 열린 쪽(선두 포탑이 볼 쪽)
    const open=h.p>g.p+ST.xOpen?1:h.m>g.m+ST.xOpen?-1:0;
    const X2={x:q.x,z:q.z,hx:q.dx,hz:q.dz,d0:.45+1.2,ph:'app',t0:t,t1:t,sq,cn,open};stP(R,'_xg',X2);
    (G.tac||(G.tac={})).st_xing=((G.tac&&G.tac.st_xing)||0)+1;return;}}
/* 선두 걸음: 교차로 앞에서 모퉁이를 잡을 때까지 선다 */
// 걸음은 대열 맨 앞(뿌리)만 맞춘다: 자리가 뿌리 기준이라, 가운데 차량이 제 뒤 차를 기다리면 줄 전체가 서로 기다리다 멈춘다
{const _p=formPace;formPace=function(L){const X=L._xg;if(X&&X.ph==='hold')return 0;
  const P=stG.get(L.id);if(!P){if(L.fol&&stI.has(L.id))return 1;return _p(L);}
  let r=1,lag=0;for(const f of P.veh.concat(P.inf)){r=Math.min(r,formSpd(f)/formSpd(L)*(f.supp>0?.65:1));if((f._fLag||0)>lag)lag=f._fLag||0;}
  let k=Math.min(1,r*FORM.pace);if(lag>FORM.lagWait)k=0;else if(lag>FORM.lagSlow)k*=.4;
  // 교전 가능: 앞장선 보병이 자리를 잡을 때까지 차량은 엄호하며 천천히(보병 걸음보다 느리게)
  if(P.th&&P.geo.street&&P.side){const ld=[P.side[1][0],P.side[-1][0]].filter(Boolean);if(ld.some(f=>(f._fLag||0)>.5))k*=.45;else k*=.85;}
  return k;};}
// 교차로 앞에 선 선두는 따르는 부대가 없어도 서야 한다(05o-form rtMove 래퍼는 따르는 부대가 있을 때만 걸음을 바꾼다)
{const _mv=rtMove;rtMove=function(u,dt){if(!u.path||!u.path.length||formLead.has(u.id)||!stG.has(u.id))return _mv(u,dt);const k=formPace(u);if(k<=0){u._pg=null;return;}return _mv(u,dt*k);};}
/* ---------- 포탑 경계 방향 ---------- */
{const _t=vTurret;vTurret=function(u,dt){const now=G.time||0;
  if(u._aim!=null&&now-(u._aimT||-99)<VM.aimHold)return _t(u,dt);
  let want=null;const X=u._xg;
  if(X&&X.ph!=='app'&&X.open){const a=vDeg(X.hx,X.hz),nA=vDeg(-X.hz,X.hx);const sgn=vDiff(nA,a)>0?1:-1;want=a+sgn*X.open*75;}
  else if(u._stAim!=null&&now-(u._stAimT||-99)<1.2&&u.fol)want=u._stAim;
  if(want==null)return _t(u,dt);const s=vSpec(u);if(!s.trav)return _t(u,dt);u.tf=vTurn(u.tf,want,s.trav*dt);};}
/* ---------- 병사: 맡은 벽 쪽으로 한두 줄 ---------- */
if(typeof menMoveSpot==='function'){const _m=menMoveSpot;menMoveSpot=function(u,m,k){const s=u._stSide;const t=G.time||0;
  if(!s||t-(u._stSideT||-99)>1||!u.fol||cell(u.r,u.c).t==='bldg')return _m(u,m,k);
  const gap=MEN.gapW*.75;const P=menTrailAt(u,.04+gap*k);const nx=-P.dz*s,nz=P.dx*s;
  const fr=menFree(u,P.x,P.z,nx,nz,.6);let lat=Math.max(0,fr-.08-(k%2?.1:0));lat=Math.min(lat,.55);
  return [P.x+nx*lat,P.z+nz*lat];};}
// 길가를 따라 걷는 보병은 곁의 차량과 서로 밀어내지 않는다
if(typeof sepFree==='function'){const _sf=sepFree;sepFree=function(u){if(u.fol&&u.path&&u.path.length&&u._stSide&&(G.time||0)-(u._stSideT||-99)<1)return true;return _sf(u);};}
/* 매 틱: 대열 묶음을 먼저 만들고 따르기 */
{const _ft=formTick;formTick=function(){if(G&&G.units){try{stPlan();}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}}return _ft();};}
/* ---------- AI: 소대 행군에 차량을 하나 더(전차 반소대: 두 대가 서로 엄호) ---------- */
{const _fm=formMarch;formMarch=function(p,M,gx,gz,d){_fm(p,M,gx,gz,d);if(!aiRun(p.nat)||p._fv==null)return;const t=G.time||0;
  const L=formUnit(p._fv);if(!L)return;let w=p._fw!=null?formUnit(p._fw):null;
  if(w&&(w.nat!==p.nat||w._pj||w.man||w.hold||w===L||Math.hypot(w.x-L.x,w.z-L.z)>7))w=null;
  if(!w){const o=L.fesc;L.fesc=-1;w=formPickVeh(p,[L.x,L.z]);L.fesc=o;if(w===L)w=null;}
  if(!w){p._fw=null;return;}
  w.fesc=p.id;w.fescT=t;p._fw=w.id;if(w.fol&&w.fol.by!=='tac')w.fol=null;formBuild(L,M.concat([w]),'tac',null);};}
{const _fr=formRelease;formRelease=function(p,M){const w=p._fw!=null?formUnit(p._fw):null;if(w&&w.fesc===p.id){w.fesc=null;w.fol=null;}p._fw=null;return _fr(p,M);};}
/* 대열 차량이 거꾸로 선 채 가까운 자리만 좇으면(05b2: 가까운 뒤쪽 목적지는 후진) 끝까지 후진으로 간다.
   대열이 가는 쪽으로 차체가 반대면 자리 너머 한 칸을 더 보태 앞으로 돌아서 가게 한다 */
{const _ff=formFollow;formFollow=function(f,t){_ff(f,t);const I=stI.get(f.id);if(!I||I.j==null||!f.fol||!formGV(f)||!f.path||f.path.length!==1||f.hd==null)return;
  const [hx,hz]=formHead(I.P.R);if(Math.abs(vDiff(vDeg(hx,hz),f.hd))<100)return;const e=f.path[0];if((e[0]-f.x)*hx+(e[1]-f.z)*hz<.05)return;
  const x=e[0]+hx,z=e[1]+hz;if(formClear(f,e[0],e[1],x,z)){f.path.push([x,z]);}};}
