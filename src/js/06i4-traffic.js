/* ===================== TRAFFIC: 길 막힘·마주침·길 겹침 =====================
   "길이 막히면 이동하는거랑 애들끼리 차량이 가는길이 겹치는거랑 서로 반대편에서 오다가 마주보고 멈춰지는 현상".
   실제 지도(tools/traffic.mjs: 마주 오기·길 막힘·교차로)에서 부대 30~45%가 목적지 앞에서 멈춰 서던 원인을 고친다.
   1) 대형 행군 중 막혀서 길을 다시 찾으면(05b·05b2) 경로 배열이 바뀌는데, 대형(05o)은 이것을 '다른 명령'으로 여겨
      대형에서 빼면서 원래 갈 자리(F.end)를 버렸다 → 따르던 부대가 대형 자리(길 중간)에 그대로 섰다.
      같은 곳으로 가는 새 길이면 대형 길로 받아들인다. */
const TRF={same:.35};
/* 1) 대형: 같은 끝점으로 다시 찾은 길은 대형 길로 받아들인다 */
{const _ff=formFollow;formFollow=function(f,t){const F=f.fol;
  if(F&&f.path&&f.path.length&&f.path!==f._fP&&f._fPe){const e=f.path[f.path.length-1];if(Math.hypot(e[0]-f._fPe[0],e[1]-f._fPe[1])<TRF.same)formP(f,f.path);}
  _ff(f,t);
  if(f.fol&&f.path&&f.path.length&&f.path===f._fP){const e=f.path[f.path.length-1];f._fPe=[e[0],e[1]];}else if(!f.fol)f._fPe=null;};}
/* 2) 차량 앞 길 비켜 주기: 가는 차량 앞(차체 앞 약 6m, 차폭+약 2.5m) 안에 선 아군 보병은 옆으로 비켜 선다.
   예전에는 앞을 막은 보병과 차량이 서로 정면으로 밀기만 해서, 호위 분대가 제 장갑차 앞을 막고 장갑차가 멈췄다(tools/jam.mjs veh<inf).
   보병은 걸음 속도(초당 약 0.7칸)로만 비킨다. 건물 안·계단·탑승 중인 분대는 그대로 */
TRF.laneAhead=.55;TRF.laneSide=.2;TRF.laneV=.7;
function trfLaneClear(dt){for(const v of G.units){if(!isGV(v)||!(v.path&&v.path.length)||v.towBy!=null||v.hd==null)continue;
    const s=vSpec(v),a=(v.vs<-.02?v.hd+180:v.hd)*Math.PI/180,fx=Math.cos(a),fz=Math.sin(a),reach=s.hl+TRF.laneAhead,W=s.hw+TRF.laneSide;
    for(const o of G.units){if(o.nat!==v.nat||UT[o.type].cls!=='inf'||UT[o.type].fly||o.climb||o.inV||o.pax)continue;
      const ox=o.x-v.x,oz=o.z-v.z;if(ox>1.2||ox<-1.2||oz>1.2||oz<-1.2)continue;
      const al=ox*fx+oz*fz;if(al<s.hl*.3||al>reach)continue;const lat=-ox*fz+oz*fx;if(Math.abs(lat)>=W)continue;
      const t=tileAt(o.x,o.z);if(!t||t.t==='bldg')continue;
      // 이미 가까운 쪽으로, 가운데면 차량 오른쪽으로(오른쪽 = 진행 방향 시계 방향)
      const sg=Math.abs(lat)<.03?1:Math.sign(lat),need=W-Math.abs(lat),m=Math.min(need,TRF.laneV*dt);
      for(const g of [sg,-sg]){const x=o.x-fz*m*g,z=o.z+fx*m*g;if(walkable(o,x,z)&&!wallCross(o,o.x,o.z,x,z)){o.x=x;o.z=z;rtCell(o);break;}}}}}
{const _sep=rtSeparate;rtSeparate=function(dt){try{trfLaneClear(dt);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}_sep(dt);};}
/* 3) 차체 뒤 동행 보병은 뒤 차량이 지나갈 차로 밖(차체 옆 모서리 바깥)에 선다.
   05o의 동행 자리(좌우 약 2.6m)는 뒤따르는 차량 차로 한가운데여서, 뒤 차는 보병에 막히고 보병은 다시 그 자리로 돌아와
   대열 전체가 서로를 기다렸다(tools/traffic.mjs: 무리 이동 시간의 대부분이 같은 무리끼리 막힘). 셋째부터도 양쪽으로 나눈다.
   길이 좁아 옆이 막히면 조금씩 안쪽으로 */
TRF.escLat=.36;
{const _s=formSlot;formSlot=function(f,L){const F=f.fol;if(!F||F.k!=='esc')return _s(f,L);
  // 시가지 거리 대형(06i3)이 자리를 정하면 그대로
  if(typeof stI!=='undefined'){const I=stI.get(f.id);if(I&&I.j!=null)return _s(f,L);if(I){const v=stInfSlot(f,I);if(v){stP(f,'_stS',v);return v;}}}
  const [hx,hz]=formHead(L);const px=-hz,pz=hx;const h=formHull(L);const side=F.i%2?-1:1;let lee=0;const th=formThreat(L);if(th){const cr=th[0]*px+th[1]*pz;lee=cr>0?-1:1;}
  const back=h.hl+FORM.esc+(F.i===2?.35:0)+(F.i>2?(F.i-2)*FORM.gapI:0);const p=formTrailAt(L,back,f);
  const lat0=side*Math.max(TRF.escLat,h.hw+.2)+lee*.08;
  for(const k of [1,.7,.45]){const x=p.x+(-p.dz)*lat0*k,z=p.z+p.dx*lat0*k;if(formClear(f,p.x,p.z,x,z))return [x,z];}
  return [p.x,p.z];};}
/* 4) 선두 기다림에 끝을 둔다: 뒤처진 부대를 기다리느라 선두가 완전히 서는 시간은 모두 합쳐 TRF.waitMax초까지(잘 따라오는 동안 조금씩 다시 찬다).
   그다음은 서지 않고 천천히(TRF.waitSlow) 계속 간다. 뒤처진 부대는 제 속도로 따라오고, 10초 넘게 못 따라오면 05o가 대형에서 빼서 따로 목적지로 보낸다.
   예전에는 자리를 못 잡고 맴도는 부대 하나 때문에 대열 전체가 수십 초씩 섰다(tools/traffic.mjs 'lead-wait').
   교차로 앞 정지(06i3)는 그대로 */
TRF.waitMax=3;TRF.waitSlow=.35;TRF.waitGain=0;
{const _p=formPace;formPace=function(L){const k=_p(L);const t=G.time||0;const X=L._xg;if(X&&X.ph==='hold')return k;
  const dt=Math.max(0,Math.min(.5,t-(L._fwT??t)));if(L._fwT!==t){L._fwT=t;L._fwB=Math.max(0,(L._fwB||0)-(k>0?dt*TRF.waitGain:0));}
  if(k>0)return k;
  if((L._fwB||0)<TRF.waitMax){if(L._fwC!==t){L._fwC=t;L._fwB=(L._fwB||0)+dt;}return k;}
  return TRF.waitSlow*Math.min(1,FORM.pace);};}
/* 5) 선두가 뒤로 빼는 동안(바퀴 차량 세 번에 돌기·막혀서 후진)은 발자국을 남기지 않는다.
   거꾸로 남은 발자국 때문에 따르는 부대의 자리가 선두 앞쪽으로 잡혀, 선두를 지나쳤다 되돌아오기를 되풀이했다 */
{const _r=formTrailRec;formTrailRec=function(L){if(formGV(L)&&(L.vs||0)<-.02){const T=L._ftr;if(T&&T.length>1){T.length=0;T.push([L.x,L.z]);}return;}return _r(L);};}
/* 6) 목적지에 다른 차량이 있을 때(05b2: 그 차 바로 앞에서 멈춤): 그 차가 지나가는 중이면 잠깐 기다리고(최대 TRF.occWait초),
   서 있으면 바로 옆 빈자리(차체가 들어가고 다른 차와 0.75칸 넘게 떨어진 곳)로 목적지를 옮긴다.
   예전에는 서로 맞바꾸는 두 무리에서 상대 차가 아직 떠나지 않은 자리를 보고 목적지 1칸 앞에 그대로 섰다 */
TRF.occWait=6;TRF.occR=.75;
function trfFreeSpot(u,x,z){const occ=(px,pz)=>G.units.some(o=>o!==u&&isGV(o)&&Math.hypot(o.x-px,o.z-pz)<TRF.occR);
  for(const r of [.8,1.1,1.4,1.8])for(let k=0;k<12;k++){const a=k*Math.PI/6+r,px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;const t=tileAt(px,pz);
    if(!t||mcost(u.type,t)===Infinity||!walkable(u,px,pz)||occ(px,pz))continue;if(hullPen(u,px,pz,u.hd)>0)continue;return [px,pz];}
  return null;}
{const _mv=rtMove;rtMove=function(u,dt){
  if(isGV(u)&&u.path&&u.path.length===1&&!u.fol&&u.towBy==null){const [tx,tz]=u.path[0];const d=Math.hypot(tx-u.x,tz-u.z);
    if(d<.95){const o=G.units.find(o=>o!==u&&isGV(o)&&Math.hypot(o.x-tx,o.z-tz)<TRF.occR);
      if(o){const t=G.time||0;
        if(o.path&&o.path.length&&(u._occT==null||t-u._occT<TRF.occWait)){if(u._occT==null)u._occT=t;u.vs=0;u.face=u.hd;return;}   // 지나가는 차: 기다린다
        const p=trfFreeSpot(u,tx,tz);u._occT=null;if(p){const P=pathPts(u,p[0],p[1]);if(P.length){u.path=P;if(u.dest)u.dest=[p[0],p[1]];}}}
      else u._occT=null;}}
  return _mv(u,dt);};}
/* 7) 길이 막히면 돌아간다: 길 위에 선 부대(서 있는 차량·움직이지 않는 아군·적, 오래 마주 선 부대)에 막혀 TRF.blkT초 넘게 못 나아가면
   그 부대 자리를 잠깐(TRF.avoidT초) 막힌 곳으로 여기고 길을 다시 찾는다. 돌아가는 길이 너무 멀면(지나가는 부대: 남은 길 ×2.2 + 8칸, 서 있는 부대: ×3 + 24칸 넘게)
   그대로 기다리며 비켜 지나가기를 계속한다. 다시 찾은 길(05b·05b2의 재탐색 포함)은 그동안 그 자리를 피한다.
   예전 길찾기는 부대를 모르고 지형·물체만 봐서, 좁은 골목에 차가 서 있으면 다시 찾아도 같은 골목으로 들어가 멈췄다.
   마주 오는 두 부대가 서로 막으면 부대마다 기다리는 시간을 조금씩 달리해(번호) 한쪽이 먼저 돌아간다 */
TRF.blkT=2.2;TRF.blkMovT=3.5;TRF.avoidT=20;TRF.detourK=2.2;TRF.detourAdd=8;TRF.detourKS=3;TRF.detourAddS=24;TRF.prog=.25;
function trfPathLen(x,z,P){let L=0;for(const p of P){L+=Math.hypot(p[0]-x,p[1]-z);x=p[0];z=p[1];}return L;}
/* 막힌 자리 찍기: 그 부대 차체(보병은 반경 0.2칸)에 길 찾는 부대의 여유폭을 더한 만큼 이동 격자를 잠깐 0으로 */
function trfStamp(u,list){const cls=navCls(u);if(!cls)return null;const g=navGrid(cls),W=g.W,C=g.cost,cs=1/NAV_R,clr=(NAV_CLR[cls]||.03)+.04;const saved=[];
  for(const o of list){let hl,hw,ry;if(isGV(o)){const s=vSpec(o);hl=s.hl;hw=s.hw;ry=-(o.hd??o.face??0)*Math.PI/180;}else{hl=hw=.2;ry=0;}
    hl+=clr;hw+=clr;const R=Math.max(hl,hw)+cs,co=Math.cos(ry),sn=Math.sin(ry);
    const j0=Math.max(0,Math.floor((o.x-R)*NAV_R)),j1=Math.min(W-1,Math.floor((o.x+R)*NAV_R)),i0=Math.max(0,Math.floor((o.z-R)*NAV_R)),i1=Math.min(W-1,Math.floor((o.z+R)*NAV_R));
    for(let i=i0;i<=i1;i++){const dz=(i+.5)*cs-o.z;for(let j=j0;j<=j1;j++){const k=i*W+j;if(!C[k])continue;const dx=(j+.5)*cs-o.x;
      if(Math.abs(dx*co-dz*sn)<=hl&&Math.abs(dx*sn+dz*co)<=hw){saved.push(k,C[k]);C[k]=0;}}}}
  return ()=>{for(let q=saved.length-2;q>=0;q-=2)C[saved[q]]=saved[q+1];};}
function trfAvoidList(u){const A=u._avd;if(!A||!A.length)return null;const t=G.time||0;const L=[];
  for(let i=A.length-1;i>=0;i--){const a=A[i];const o=a.t>t?G.units.find(z=>z.id===a.id):null;if(!o||Math.hypot(o.x-a.x,o.z-a.z)>.6){A.splice(i,1);continue;}L.push(o);}   // 떠난 부대는 잊는다
  return L.length?L:null;}
{const _pp=pathPts;pathPts=function(u,x,z){const L=u&&!UT[u.type].fly?trfAvoidList(u):null;if(!L)return _pp(u,x,z);
  // 목적지가 막힌 자리 안이면 피하지 않는다(그 부대 곁으로 가는 명령)
  if(L.some(o=>Math.hypot(o.x-x,o.z-z)<.6))return _pp(u,x,z);
  const undo=trfStamp(u,L);try{return _pp(u,x,z);}finally{if(undo)undo();}};}
/* 가는 쪽 바로 앞을 막은 땅 위 부대 */
function trfBlocker(u){const h=sepHead(u);if(!h)return null;const uv=isGV(u);let best=null,bd=9;
  for(const o of G.units){if(o===u||UT[o.type].fly||o.inV||o.pax)continue;if(o.fol&&o.fol.L===u.id)continue;   // 내 대열을 따르는 부대는 아니다
    if(u.fol&&u.fol.L===o.id)continue;
    const dx=o.x-u.x,dz=o.z-u.z;if(dx>1.4||dx<-1.4||dz>1.4||dz<-1.4)continue;const d=Math.hypot(dx,dz);
    const R=(uv||isGV(o))?(uv?vSpec(u).hl:.1)+(isGV(o)?vSpec(o).hl:.1)+.35:.7;if(d>R)continue;
    const fw=(dx*h[0]+dz*h[1])/(d||1);if(fw<.35)continue;
    const lat=Math.abs(-dx*h[1]+dz*h[0]);if(lat>(uv?vSpec(u).hw:.15)+(isGV(o)?vSpec(o).hw:.15)+.15)continue;
    if(d<bd){bd=d;best=o;}}
  return best;}
function trfCheckBlocked(u){if(!u.path||!u.path.length||u.fol||u.climb||u.towBy!=null||u.tow!=null||u.cqb)return;const t=G.time||0;
  const P=u._tbP;if(!P||Math.hypot(u.x-P[0],u.z-P[1])>TRF.prog){u._tbP=[u.x,u.z,t];return;}
  const st=t-P[2];if(st<TRF.blkT)return;
  const o=trfBlocker(u);if(!o){return;}
  const mov=!!(o.path&&o.path.length)&&!o.hold;if(mov&&st<TRF.blkMovT+(u.id%7)*.4)return;
  if(u._tbAt!=null&&t-u._tbAt<3)return;u._tbAt=t;   // 3초에 한 번만
  const end=u.path[u.path.length-1];if(Math.hypot(end[0]-u.x,end[1]-u.z)<1.2)return;   // 거의 다 왔으면 그 자리 근처에서 선다(05b·05b2)
  const A=u._avd||(u._avd=[]);const prev=A.slice();
  if(!A.some(a=>a.id===o.id))A.push({id:o.id,x:o.x,z:o.z,t:t+TRF.avoidT});
  const old=trfPathLen(u.x,u.z,u.path);const NP=pathPts(u,end[0],end[1]);const e2=NP[NP.length-1];
  const ok=NP.length&&e2&&Math.hypot(e2[0]-end[0],e2[1]-end[1])<1&&trfPathLen(u.x,u.z,NP)<=(mov?old*TRF.detourK+TRF.detourAdd:old*TRF.detourKS+TRF.detourAddS);   // 서 있는 부대는 언제 비킬지 모르니 더 멀리 돌아도 된다
  if(ok){u.path=NP;u._tbP=[u.x,u.z,t];u._blk=0;u._rb=0;
    // 내 대열을 따르는 부대도 같은 자리를 피한다(대열에서 빠져 따로 길을 찾을 때)
    for(const f of G.units){if(!f.fol)continue;let R=f,g=0;while(R.fol&&g++<12){const q=formUnit(R.fol.L);if(!q||q===f)break;R=q;}if(R===u)f._avd=u._avd.map(a=>({...a}));}(G.tac||(G.tac={})).trf_detour=((G.tac&&G.tac.trf_detour)||0)+1;}
  else{u._avd=prev;u._tbFail=t;}}
/* 05b2는 차가 오래(1.5~3초) 막히면 2초 동안 다른 차량 차체를 무시하고 지나간다(서로 기다리다 멈추지 않게). 마주 오며 엇갈리는 차에는 그대로 두되,
   서 있는 차(움직이지 않는 아군·적)를 뚫고 지나가지는 않게 한다: 먼저 돌아갈 길을 찾고, 돌아갈 길이 없을 때(10초 안에 실패)만 그대로 둔다 */
function trfNoGhost(u){const t=G.time||0;if(!(u._ygh>t))return;if(u._tbFail!=null&&t-u._tbFail<10)return;const o=trfBlocker(u);if(!o||!isGV(o))return;
  if(o.path&&o.path.length&&!o.hold)return;if(o.nat===u.nat&&!o.hold&&!(o.towBy!=null||o.tow!=null))return;   // 서 있는 아군(멈춤 아님)은 05b2가 비켜 준다
  u._ygh=0;u._tbP=[u.x,u.z,t-TRF.blkT];u._tbAt=null;}
{const _mv=rtMove;rtMove=function(u,dt){if(isGV(u))trfNoGhost(u);_mv(u,dt);if(!G.units.includes(u))return;try{trfCheckBlocked(u);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}};}
