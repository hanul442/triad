/* ===================== FORM: 부대끼리 대형을 지어 함께 움직이기 =====================
   "보병이랑 애들이 좀 더 현실적으로 무리를 지어서 가면 좋겠다 헬기나 다른것들도", "차량에 은엄폐해서 가는 느낌".
   예전에는 같은 곳으로 가는 부대도 저마다 따로 길을 찾아 제 속도로 달려서, 빠른 차량은 혼자 앞서고 보병은 흩어져 늘어졌다.
   여기서는 한 부대를 선두로 정하고 나머지가 선두를 기준으로 한 자리(대형 자리)를 따라간다.
   - 종대(col): 시가지·도로. 선두가 지나간 발자국을 따라 약 12m 간격, 길이 넓으면 좌우로 엇갈려 선다(엇갈린 종대).
   - 쐐기(wedge): 트인 들판·공원. 선두 뒤로 좌우 비스듬히 펼친다(약 10m 간격). 자리가 막혔으면 발자국 위로.
   - 동행(esc): 보병이 전차·장갑차 바로 뒤 양쪽 모서리에 붙어 차체를 방패 삼아 걷는다. 적이 있는 쪽 반대편으로 붙는다.
   - 차량 종대: 차량끼리는 약 17m 간격으로 앞 차 발자국을 따른다.
   선두는 가장 느린 부대 걸음에 맞춰 가고, 뒤처진 부대가 있으면 속도를 줄이거나 기다린다.
   따르는 부대가 다른 명령(접적 반응·직접 명령)을 받으면 대형에서 빠진다.
   대형은 행군할 때만 쓴다. 적이 가까우면(06c) 번갈아 이동·화력 기반·측면 기동으로 바뀐다.
   u.fol = {L:선두 id, k:'col'|'wedge'|'auto'|'esc', i:순번, d0:첫 간격, gap:간격, end:[x,z]|null(풀릴 때 갈 자리), by:'tac'|'ord'|'arm'}.
   공격헬기는 두 대 편대(선두·윙맨)로 온다: 이동할 때는 윙맨이 선두 오른쪽 뒤에, 대기할 때는 다른 각도에서 서로 엄호하고,
   선두가 사격 비행을 하는 동안 윙맨은 대기하며 지켜본 뒤 번갈아 들어간다. */
const FORM={gapI:1.0,gapV:1.45,wedge:.8,stag:.22,esc:.3,upd:.3,repath:1.2,lagSlow:1.2,lagWait:2.4,stuck:10,trail:.12,trailN:180,ordMin:5,ordR:6,pace:.92};
const formLead=new Map();   // 선두 id → 따르는 부대들(틱마다 다시 만든다)
const formUnit=id=>G.units.find(o=>o.id===id)||null;
const formSpd=u=>(UT[u.type]&&UT[u.type].mv)||3;
const formGV=u=>{const t=UT[u.type];return !!t&&t.cls==='veh'&&!t.fly;};
const formHull=u=>typeof vSpec==='function'?vSpec(u):{hl:.25,hw:.11};
const formIdle=u=>!(u.path&&u.path.length);
const formP=(f,v)=>Object.defineProperty(f,'_fP',{value:v,writable:true,configurable:true,enumerable:false});
/* 선두 발자국(저장하지 않음): 가장 최근이 앞 */
function formTrailRec(L){let T=L._ftr;if(!T){T=[[L.x,L.z]];Object.defineProperty(L,'_ftr',{value:T,writable:true,configurable:true,enumerable:false});return;}
  const h=T[0];if(Math.hypot(L.x-h[0],L.z-h[1])>FORM.trail){T.unshift([L.x,L.z]);if(T.length>FORM.trailN)T.length=FORM.trailN;}}
/* 발자국을 따라 선두에서 dist만큼 뒤의 점과 그 점의 진행 방향. 발자국이 짧으면 끝에서 따르는 부대 쪽으로 늘린다 */
function formTrailAt(L,dist,f){const T=L._ftr||[[L.x,L.z]];let px=L.x,pz=L.z,acc=0;
  for(let i=0;i<T.length;i++){const q=T[i];const s=Math.hypot(q[0]-px,q[1]-pz);
    if(acc+s>=dist&&s>1e-6){const k=(dist-acc)/s;return {x:px+(q[0]-px)*k,z:pz+(q[1]-pz)*k,dx:(px-q[0])/s,dz:(pz-q[1])/s};}acc+=s;px=q[0];pz=q[1];}
  // 발자국이 모자라면: 마지막 점에서 따르는 부대 쪽으로(처음 모일 때 줄을 서게)
  const left=dist-acc;const hd=formHead(L);let dx=f?f.x-px:-hd[0],dz=f?f.z-pz:-hd[1];const m=Math.hypot(dx,dz);
  if(m<1e-6){dx=-hd[0];dz=-hd[1];}else{dx/=m;dz/=m;}const k=Math.min(left,m||left);
  return {x:px+dx*k,z:pz+dz*k,dx:hd[0],dz:hd[1]};}
/* 선두가 가는 방향(단위 벡터): 발자국 → 차체 → 바라보는 쪽 */
function formHead(L){const T=L._ftr;if(T&&T.length>2){const q=T[Math.min(T.length-1,4)];const dx=L.x-q[0],dz=L.z-q[1],m=Math.hypot(dx,dz);if(m>.2)return [dx/m,dz/m];}
  if(L.path&&L.path.length){const p=L.path[0];const dx=p[0]-L.x,dz=p[1]-L.z,m=Math.hypot(dx,dz);if(m>.05)return [dx/m,dz/m];}
  const a=((L.hd!=null&&formGV(L)?L.hd:L.face)||0)*Math.PI/180;return [Math.cos(a),Math.sin(a)];}
/* 선두 둘레가 시가지(건물·도로)인가: 종대, 아니면 쐐기. 0.6초마다 */
function formUrban(L){const t=G.time||0;if(L._fuT!=null&&t-L._fuT<.6)return L._fu;L._fuT=t;let u=false;const r0=Math.floor(L.z),c0=Math.floor(L.x);
  const c=tileAt(L.x,L.z);if(c&&(c.t==='road'||c.t==='plaza'||c.t==='rubble'||c.t==='bldg'))u=true;
  else for(let a=-1;a<=1&&!u;a++)for(let b=-1;b<=1;b++){if(!inb(r0+a,c0+b))continue;const x=G.map[r0+a][c0+b];if(x.t==='bldg'){u=true;break;}}
  Object.defineProperty(L,'_fu',{value:u,writable:true,configurable:true,enumerable:false});return u;}
/* 선두 쪽에서 본 위협 방향(아는 적 중 가장 가까운). 없으면 null */
function formThreat(L){if(typeof memOf!=='function')return null;const M=memOf(L.nat);const t=G.time||0;let best=null,bd=14;
  for(const id in M){const p=M[id];if(t-p.t>20)continue;const d=Math.hypot(p.x-L.x,p.z-L.z);if(d<bd){bd=d;best=[p.x-L.x,p.z-L.z];}}
  return best;}
/* 곧게 갈 수 있나(부대 기준) */
function formClear(u,x1,z1,x2,z2){if(!walkable(u,x2,z2))return false;if(wallCross(u,x1,z1,x2,z2))return false;
  if(formGV(u))return segClear(u,x1,z1,x2,z2);
  if(typeof navSegOk==='function'&&!navSegOk(u,x1,z1,x2,z2))return false;return true;}
/* 따르는 부대 f의 대형 자리 */
function formSlot(f,L){const F=f.fol;let k=F.k;if(k==='auto')k=formUrban(L)?'col':'wedge';
  const [hx,hz]=formHead(L);const px=-hz,pz=hx;   // 선두 기준 오른쪽
  if(k==='esc'){// 차체 뒤 모서리: 차체 반길이 + 0.3칸 뒤, 좌우 0.14칸. 적이 보이면 반대쪽으로 0.12칸 더
    const h=formHull(L);const side=F.i%2?-1:1;let lee=0;const th=formThreat(L);if(th){const cr=th[0]*px+th[1]*pz;lee=cr>0?-1:1;}
    const back=h.hl+FORM.esc+(F.i===2?.35:0)+(F.i>2?(F.i-2)*FORM.gapI:0);const p=formTrailAt(L,back,f);   // 둘째 분대는 반 걸음 뒤(서로 밀지 않게)
    const lat=F.i>2?0:side*.22+lee*.1;const x=p.x+(-p.dz)*lat,z=p.z+p.dx*lat;
    if(formClear(f,p.x,p.z,x,z))return [x,z];return [p.x,p.z];}
  if(k==='wedge'){const rank=Math.ceil(F.i/2),side=F.i%2?-1:1;const sp=F.gap*FORM.wedge;const back=F.d0+(rank-1)*sp;
    const p=formTrailAt(L,back,f);const lat=side*rank*sp;const x=p.x+(-p.dz)*lat,z=p.z+p.dx*lat;
    if(walkable(f,x,z)&&!wallCross(f,p.x,p.z,x,z)&&(!formGV(f)||segClear(f,p.x,p.z,x,z)))return [x,z];return [p.x,p.z];}
  // 종대: 발자국 위, 넓은 길이면 좌우로 엇갈리게
  const back=F.d0+(F.i-1)*F.gap;const p=formTrailAt(L,back,f);if(formGV(f))return [p.x,p.z];
  const side=F.i%2?-1:1;const lat=side*FORM.stag;const x=p.x+(-p.dz)*lat,z=p.z+p.dx*lat;const x2=p.x+(-p.dz)*lat*1.6,z2=p.z+p.dx*lat*1.6;
  if(walkable(f,x2,z2)&&!wallCross(f,p.x,p.z,x2,z2)&&tileAt(x,z)&&tileAt(x,z).t!=='bldg')return [x,z];return [p.x,p.z];}
/* 대형에서 빼기. go: 풀릴 때 갈 자리가 있으면 그리로 */
function formDrop(f,go){const F=f.fol;f.fol=null;formP(f,null);if(!F)return;if(go&&F.end&&G.units.includes(f)){f.path=pathPts(f,F.end[0],F.end[1]);f.dest=F.end;}}
/* 선두 발자국을 거쳐 자리로 가는 길: 따르는 부대에서 곧게 닿는 가장 가까운 발자국부터 자리 곁 발자국까지 */
function formVia(f,L,s){const T=L._ftr;if(!T||T.length<2)return null;let j=-1,jd=2.5,k=0,kd=1e9;
  for(let i=0;i<T.length;i++){const q=T[i];const d=Math.hypot(q[0]-f.x,q[1]-f.z);if(d<jd){jd=d;j=i;}const e=Math.hypot(q[0]-s[0],q[1]-s[1]);if(e<kd){kd=e;k=i;}}
  if(j<0||j<k)return null;// 발자국을 따라 앞으로 가며 곧게 닿는 가장 먼 점부터
  let a=j;while(a>k&&formClear(f,f.x,f.z,T[a-1][0],T[a-1][1]))a--;if(a===j&&!formClear(f,f.x,f.z,T[j][0],T[j][1]))return null;
  const out=[];for(let i=a;i>=k;i-=3)out.push([T[i][0],T[i][1]]);if(out.length&&out[out.length-1]!==T[k])out.push([T[k][0],T[k][1]]);
  out.push([s[0],s[1]]);return out;}
/* 따르는 부대 하나: 자리를 다시 잡고 그리로 간다 */
function formFollow(f,t){const F=f.fol;const L=formUnit(F.L);
  if(!L||L===f||L.nat!==f.nat||f.cqb||f.post){formDrop(f,true);return;}
  if(f.climb)return;
  if(f.path!==f._fP&&f.path&&f.path.length){formDrop(f,false);return;}   // 다른 명령을 받았다
  // 명령 행군·차량 종대: 선두가 다 왔으면 저마다 제 자리로
  if(F.by!=='tac'){let R=L,g=0;while(R.fol&&g++<10){const q=formUnit(R.fol.L);if(!q||q===f)break;R=q;}   // 줄 맨 앞 부대가 다 왔는가
    const e=R.path&&R.path.length?R.path[R.path.length-1]:null;if(!e||Math.hypot(e[0]-R.x,e[1]-R.z)<1.6&&R.path.length<=2){formDrop(f,true);return;}}
  if(f._fT!=null&&t-f._fT<FORM.upd&&f.path&&f.path.length)return;f._fT=t;
  const s=formSlot(f,L);const d=Math.hypot(s[0]-f.x,s[1]-f.z);f._fLag=d;
  if(d>FORM.lagWait){if(f._fLagT==null)f._fLagT=t;else if(t-f._fLagT>FORM.stuck){f._fLagT=null;formDrop(f,true);return;}}else f._fLagT=null;
  if(d<.08){f.path=[];formP(f,f.path);return;}
  if(formClear(f,f.x,f.z,s[0],s[1]))f.path=[[s[0],s[1]]];
  else{const V=formVia(f,L,s);if(V)f.path=V;   // 선두 발자국을 따라(길찾기보다 훨씬 싸다)
    else if(f._fRp==null||t-f._fRp>FORM.repath||!f.path||!f.path.length){f._fRp=t;
      // 길찾기는 선두가 실제로 밟은 점(자리 곁 발자국, 없으면 선두 자리)으로: 못 가는 점을 찾느라 지도 전체를 뒤지지 않게
      let tx=L.x,tz=L.z;const T=L._ftr;if(T&&T.length){let kd=1e9;for(const q of T){const e=Math.hypot(q[0]-s[0],q[1]-s[1]);if(e<kd){kd=e;tx=q[0];tz=q[1];}}}
      const P=pathPts(f,tx,tz);f.path=P.length?P:[];}}
  formP(f,f.path);f.dest=null;if(f.tk)f.tk.at=t;}
/* 선두 걸음: 가장 느린 부대에 맞추고, 뒤처지면 늦추거나 기다린다 */
function formPace(L){const fs=formLead.get(L.id);if(!fs||!fs.length)return 1;let r=1,lag=0;
  for(const f of fs){r=Math.min(r,formSpd(f)/formSpd(L)*(f.supp>0?.65:1));if((f._fLag||0)>lag)lag=f._fLag||0;}
  let k=Math.min(1,r*FORM.pace);if(lag>FORM.lagWait)k=0;else if(lag>FORM.lagSlow)k*=.4;return k;}
{const _mv=rtMove;rtMove=function(u,dt){if(!formLead.size||!formLead.has(u.id)||!u.path||!u.path.length)return _mv(u,dt);const k=formPace(u);
  if(k<=0){u._pg=null;return;}return _mv(u,dt*k);};}
// 차체 뒤에 붙은 보병은 그 차량과 서로 밀어내지 않는다(05b rtSeparate는 sepFree면 건너뛴다)
if(typeof sepFree==='function'){const _sf=sepFree;sepFree=function(u){if(u.fol&&u.fol.k==='esc'&&u.path&&u.path.length)return true;return _sf(u);};}
/* 매 틱: 선두 목록, 발자국, 따르기 */
function formTick(){formLead.clear();const t=G.time||0;
  for(const f of G.units){if(!f.fol)continue;const a=formLead.get(f.fol.L);if(a)a.push(f);else formLead.set(f.fol.L,[f]);}
  if(!formLead.size)return;
  for(const id of formLead.keys()){const L=formUnit(id);if(L)formTrailRec(L);}
  for(const f of G.units.slice())if(f.fol&&G.units.includes(f))formFollow(f,t);}
{const _t=rtTick;rtTick=function(dt){_t(dt);if(!G||G.over||!G.units)return;try{formTick();}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}};}

/* ---------- 대형 짜기 ---------- */
/* 선두 L 뒤에 부대들을 붙인다. 차량이 선두면 보병 둘은 차체 뒤(동행), 나머지는 그 뒤로 */
function formBuild(L,us,by,ends){us=us.filter(u=>u!==L&&!UT[u.type].fly);const lv=formGV(L);
  const inf=us.filter(u=>!formGV(u)),veh=us.filter(formGV);
  const near=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  const mk=(f,Lu,k,i,d0,gap)=>{const F={L:Lu.id,k,i,d0,gap,end:ends?ends.get(f)||null:null,by};const o=f.fol;
    if(o&&o.L===F.L&&o.k===F.k&&o.i===F.i&&o.by===by){o.end=F.end;return;}f.fol=F;formP(f,f.path);f._fT=null;};
  // 차량 종대: 선두에 가까운 차부터 앞 차를 따른다
  veh.sort((a,b)=>near(a,L)-near(b,L));let prev=lv?L:null,tail=L;
  const escOf=new Map();if(lv)escOf.set(L,0);
  for(const v of veh){mk(v,prev||L,'col',1,prev?FORM.gapV:FORM.gapI*1.4,FORM.gapV);prev=v;tail=v;escOf.set(v,0);}
  // 보병: 차량마다 둘까지 차체 뒤에 붙고, 나머지는 맨 뒤 차량(없으면 선두) 뒤에서 종대·쐐기
  inf.sort((a,b)=>near(a,L)-near(b,L));let rest=[];
  for(const f of inf){let best=null,bd=1e9;for(const [v,c] of escOf){if(c>=2||!['tank','ifv','hmv','spg'].includes(v.type))continue;const d=near(f,v);if(d<bd){bd=d;best=v;}}
    if(best){const c=escOf.get(best)+1;escOf.set(best,c);mk(f,best,'esc',c,0,FORM.gapI);}else rest.push(f);}
  const back=formGV(tail)?formHull(tail).hl+FORM.esc+1.0:FORM.gapI;
  rest.forEach((f,j)=>mk(f,tail,'auto',j+1,back,FORM.gapI));}
/* 선두 고르기: 차량이 섞였으면 전차 > 장갑차 > 험비, 아니면 목표에 가장 가까운 부대(소총분대 우선) */
/* 가는 첫 방향: 길을 따라 1.5칸 간 곳 쪽 */
function formDir(u,gx,gz){let px=u.x,pz=u.z,left=1.5,tx=gx,tz=gz;for(const p of u.path||[]){const s=Math.hypot(p[0]-px,p[1]-pz);if(s>=left){const f=left/(s||1);tx=px+(p[0]-px)*f;tz=pz+(p[1]-pz)*f;break;}left-=s;px=p[0];pz=p[1];tx=px;tz=pz;}
  const dx=tx-u.x,dz=tz-u.z,m=Math.hypot(dx,dz);return m>.05?[dx/m,dz/m]:null;}
/* 선두 고르기: 차량이 섞였으면 차량 중에서(전차 > 장갑차 > 험비), 아니면 보병 중에서.
   가는 첫 방향으로 가장 앞에 선 부대: 뒤에 선 부대를 선두로 세우면 선두가 동료를 헤치고 나가야 한다 */
function formPickLead(us,gx,gz){const rk={tank:.6,ifv:.4,hmv:.2};const hasInf=us.some(u=>!formGV(u));const C=hasInf&&us.some(u=>rk[u.type])?us.filter(u=>rk[u.type]):us;
  const cx=us.reduce((a,u)=>a+u.x,0)/us.length,cz=us.reduce((a,u)=>a+u.z,0)/us.length;
  const D0=(()=>{const dx=gx-cx,dz=gz-cz,m=Math.hypot(dx,dz)||1;return [dx/m,dz/m];})();
  let best=null,bs=-1e9;for(const u of C){const D=formDir(u,gx,gz)||D0;let ah=0;for(const v of us)if(v!==u)ah+=Math.max(0,(v.x-u.x)*D[0]+(v.z-u.z)*D[1]);   // 제 길 앞을 막고 선 동료
    let s=-ah+(rk[u.type]||0);if(u.type==='rifle')s+=.2;if(s>bs){bs=s;best=u;}}return best;}
/* 직접 명령: 여러 부대를 멀리 보내면 행군 대형으로 가서, 다 오면 원래 정한 자리로 흩어진다 */
{const _g=orderGroupMove;orderGroupMove=function(us,x,z){_g(us,x,z);try{formOrder(us,x,z);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}};}
function formOrder(us,x,z){us=us.filter(u=>G.units.includes(u)&&!UT[u.type].fly&&!u.climb);if(us.length<2)return;
  const cx=us.reduce((a,u)=>a+u.x,0)/us.length,cz=us.reduce((a,u)=>a+u.z,0)/us.length;
  us=us.filter(u=>Math.hypot(u.x-cx,u.z-cz)<FORM.ordR);if(us.length<2||Math.hypot(x-cx,z-cz)<FORM.ordMin)return;
  const L=formPickLead(us,x,z);const ends=new Map();for(const u of us)if(u!==L&&u.dest)ends.set(u,u.dest.slice());
  for(const u of us)if(u.fol&&u!==L)u.fol=null;if(L.fol)L.fol=null;
  formBuild(L,us,'ord',ends);}

/* ---------- 공격헬기 두 대 편대 ---------- */
const FLT={back:.9,side:.8,spread:1.0,cdK:1.6,runGap:1.5};
if(typeof callGunship==='function'){const _c=callGunship;callGunship=function(n,r,c){const u=_c(n,r,c);if(!u||!u.air)return u;
  const [hx,hz]=[Math.cos((u.face||0)*Math.PI/180),Math.sin((u.face||0)*Math.PI/180)];
  let x=u.x-hx*FLT.back-hz*FLT.side,z=u.z-hz*FLT.back+hx*FLT.side;x=Math.min(N-.05,Math.max(.05,x));z=Math.min(N-.05,Math.max(.05,z));
  const w=mkUnit(n,'gunship',Math.min(N-1,Math.floor(z)),Math.min(N-1,Math.floor(x)));w.x=x;w.z=z;w.face=u.face;
  w.air={cx:u.air.cx,cz:u.air.cz,until:u.air.until,ang:u.air.ang};w.flares=u.flares;w.wing=u.id;u.flt=1;w.flt=1;
  L(`${natName(n)} 공격헬기 2대 편대`);return u;};}
/* 윙맨 자리: 선두 오른쪽 뒤(제형) */
function fltSlot(Lu){const A=Lu.air;let hx=A.vx||0,hz=A.vz||0;const m=Math.hypot(hx,hz);if(m>.15){hx/=m;hz/=m;}else{const a=(Lu.hd??Lu.face??0)*Math.PI/180;hx=Math.cos(a);hz=Math.sin(a);}
  return [Lu.x-hx*FLT.back-hz*FLT.side,Lu.z-hz*FLT.back+hx*FLT.side];}
/* 윙맨이 편대 자리로 날아가기(가속도 한계, 05f2와 같은 방식) */
function fltFly(u,tx,tz,dt,lead){const A=u.air;if(A.vx==null){A.vx=0;A.vz=0;}if(u.hd==null)u.hd=u.face||0;const sp=UT.gunship.mv*SPD_K*1.15;
  const dx=tx-u.x,dz=tz-u.z,d=Math.hypot(dx,dz);const lv=Math.hypot(lead.air.vx||0,lead.air.vz||0);
  const vw=Math.min(sp,lv+Math.sqrt(2*GS.acc*d)*.9);const wx=d>.01?dx/d*vw:0,wz=d>.01?dz/d*vw:0;
  let ax=wx-A.vx,az=wz-A.vz;const am=Math.hypot(ax,az),lim=GS.acc*dt*1.4;if(am>lim){ax*=lim/am;az*=lim/am;}A.vx+=ax;A.vz+=az;u.x+=A.vx*dt;u.z+=A.vz*dt;
  u.hd=vTurn(u.hd,lead.hd??lead.face??u.hd,GS.yaw*dt);u.face=u.hd;}
if(typeof gunshipTick==='function'){const _g=gunshipTick;gunshipTick=function(u,dt){const Lu=u.wing!=null?G.units.find(o=>o.id===u.wing&&o.air):null;
  if(!Lu){if(u.wing!=null)u.wing=null;return _g(u,dt);}
  const A=u.air,LA=Lu.air,now=G.time||0;
  if(u.path&&u.path.length){const p=u.path[u.path.length-1];LA.cx=p[0];LA.cz=p[1];u.path=[];if(LA.mode==='hold'){LA.mode='in';LA.sa=null;}}   // 윙맨에게 준 명령은 편대장에게
  if(u.tgt!=null&&Lu.tgt==null)Lu.tgt=u.tgt;
  A.cx=LA.cx;A.cz=LA.cz;A.until=LA.until;
  const transit=LA.leave||(LA.mode||'in')==='in'&&Math.hypot(LA.cx-Lu.x,LA.cz-Lu.z)>GS.rs+1.4;
  if(transit){const [sx,sz]=fltSlot(Lu);fltFly(u,Math.min(N-.05,Math.max(.05,sx)),Math.min(N-.05,Math.max(.05,sz)),dt,Lu);A.mode='in';A.sa=null;
    if(LA.leave&&(u.x<=.05||u.z<=.05||u.x>=N-.05||u.z>=N-.05||Math.hypot(Lu.x-u.x,Lu.z-u.z)>4)){A.leave=1;}
    u.x=Math.min(N-.01,Math.max(.01,u.x));u.z=Math.min(N-.01,Math.max(.01,u.z));rtCell(u);return;}
  // 대기 자리는 편대장과 다른 각도(서로 엄호)
  if(A.mode==='in'&&A.sa==null&&LA.sa!=null)A.sa=gsAng(A,LA.sa+(u.id%2?1:-1)*FLT.spread);
  // 편대장이 사격 비행 중이면 윙맨은 대기하며 엄호, 끝나면 들어간다
  if(A.mode==='hold'&&(LA.mode==='run'||LA.mode==='brk'))A.mt=Math.max(A.mt||0,now+FLT.runGap);
  return _g(u,dt);};}
// 편대는 두 대가 나눠 쏜다(한 대씩 쏘는 간격을 늘려 합친 화력이 한 대일 때의 약 1.2배)
{const _f=rtFight;rtFight=function(u){if(!u.flt)return _f(u);const c0=u.cd;_f(u);if(c0<=0&&u.cd>0)u.cd*=FLT.cdK;};}
