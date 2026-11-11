/* ===================== TACTICS: 소대 단위 전술 AI (개선 묶음 A) =====================
   예전 AI는 부대마다 따로 '가장 가까운 거점·적 쪽, 쏠 수 있는 칸'을 골라서 다 같이 앞으로 달려가 마주 보고 싸웠다.
   여기서는 보병(소총·기관총·대전차·공병)을 2~4개 분대씩 소대로 묶고, 소대가 함께 판단한다.
   - 적이 없을 때: 멀면 함께 행군, 가까워지면 반씩 번갈아 엄폐에서 엄폐로 이동(한쪽이 멈춰 지켜보는 동안 다른 쪽이 감).
   - 접적: 기관총(없으면 소총 하나)이 엄폐 뒤 사거리 끝쪽에서 화력 기반이 되어 제압하고,
     나머지는 적이 아는 사격선을 피해 옆으로 돌아간다(측면). 트인 길을 건널 때는 연막을 친다.
     적이 제압되면(엎드림) 측면조가 붙어 마무리한다(돌격).
   - 불리하면(전력이 적의 절반 아래, 사기 바닥) 엄폐를 타고 물러나 재편성한 뒤 다시 간다.
   - 적 위치는 세력 기억(05k-combat의 G.mem: 본 자리·총구 섬광)을 쓴다. 안 보여도 잠시 기억한다.
   - 거점을 잡으면 한 분대를 남겨 지키게 하고 다음 거점으로 간다.
   - 움직이다 적을 직접 보면 가까운 엄폐에 붙어 멈추고 응사한다(접적 반응). 측면조·후퇴 중엔 계속 간다.
   차량·곡사·저격·드론·헬기는 예전 AI(06-ai, 06b-arms)가 그대로 맡는다. 플레이어 부대는 임무를 받으면(묶음 B) 같은 두뇌를 쓴다. */
const TAC={types:{rifle:1,mg:1,at:1,eng:1},size:3,memAge:20,near:9,travel:9,leg:3.2,flankR:[3,4.2],ret:.42,regroup:18,think:2};
const tacUnit=u=>!!TAC.types[u.type]&&!u.post&&!u.cqb&&!u.rearm&&u.towBy==null&&(!u.job||u.job===TAC_HIDE);   // 탄약을 받으러 물러나는 부대(u.rearm, 05j)·견인되는 차량은 소대 기동에서 뺀다   // 건물 진입·소탕 중(u.cqb, 05k-cqb)이면 손대지 않는다
const TAC_HIDE={tac:1};
const tacCost=t=>(UT[t]&&UT[t].cost)||3;
function tacPl(){return G.plat||(G.plat=[]);}
let TACID=1;
/* 이 세력이 아는 적: 기억에 남은 지 20초가 안 된 지상 부대 */
function tacKnown(n){const M=typeof memOf==='function'?memOf(n):{};const t=G.time||0;const out=[];
  for(const id in M){const p=M[id];if(t-p.t>TAC.memAge)continue;const e=G.units.find(o=>String(o.id)===id);if(!e||UT[e.type].fly)continue;
    out.push({id:e.id,x:p.x,z:p.z,h:p.h,ty:e.type,age:t-p.t,e});}
  return out;}
/* 점 (x,z)가 (fx,fz) 쪽에서 오는 사격에 대해 받는 엄폐 */
function tacCov(x,z,fx,fz,objs){const t=tileAt(x,z);if(!t)return 0;if(t.t==='bldg')return COVK.bldg.v;let b=TT[t.t].cov||0;
  if(typeof trenchAt==='function'&&trenchAt(x,z))b=Math.max(b,.45);const d=Math.hypot(fx-x,fz-z)||1;
  return Math.max(b,dirCoverAt(x,z,(fx-x)/d,(fz-z)/d,'inf',null,objs).cov);}
const tacEye=(x,z)=>{const t=tileAt(x,z);return t&&t.t==='bldg'?Math.max(.5,Math.min(t.f,(typeof CQB==='object'?CQB.autoFl:4)+1)-.5):.5;};   // 건물 안이면 분대가 오를 층(05k-cqb CQB.autoFl)
/* 내려다보는 이점(층): 높은 층·언덕에서는 멀리 보고 낮은 엄폐 너머를 쏜다 */
const tacHigh=(x,z,h)=>Math.max(0,Math.min(4,tacEye(x,z)+(typeof gndAt==='function'?gndAt(x,z):0)-h));
/* 노출: 아는 적 중 이 점을 쏠 수 있는 쪽(사거리 + 시야선)의 위협 합 */
function tacExpo(x,z,K,objs,skip){let s=0;const h=tacEye(x,z);for(const k of K){if(k===skip)continue;const t=UT[k.ty];const d=Math.hypot(k.x-x,k.z-z);if(d>(t.rng[1]||4)+.8)continue;
    if(t.ind){s+=tacCost(k.ty)*.3;continue;}if(!losPt(k.x,k.z,k.h,x,z,h))continue;s+=tacCost(k.ty)*(1-Math.min(.85,tacCov(x,z,k.x,k.z,objs)))*(t.cls==='veh'?1.4:1);}
  return s;}
/* 후보 자리 고르기: (cx,cz) 둘레 반지름 rads에서 점수가 가장 높은 걸을 수 있는 점 */
function tacSpot(u,cx,cz,rads,score){let best=null,bs=-1e9;
  for(const r of rads){const na=r<.05?1:Math.max(8,Math.round(r*9));for(let i=0;i<na;i++){const a=i/na*6.283+(u.id%7)*.37;const x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;
      if(x<.2||z<.2||x>N-.2||z>N-.2)continue;if(!walkable(u,x,z))continue;const s=score(x,z);if(s>bs){bs=s;best=[x,z];}}}
  return best;}
/* 길을 따라 L칸 간 곳 */
function tacAlong(u,gx,gz,L){const P=pathPts(u,gx,gz);if(!P.length)return null;let px=u.x,pz=u.z,left=L;
  for(const p of P){const s=Math.hypot(p[0]-px,p[1]-pz);if(s>=left){const f=left/(s||1);return [px+(p[0]-px)*f,pz+(p[1]-pz)*f];}left-=s;px=p[0];pz=p[1];}
  return [px,pz];}
function tacGo(u,x,z,role){if(u.dest&&Math.hypot(u.dest[0]-x,u.dest[1]-z)<.15&&u.path&&u.path.length)return;
  const P=pathPts(u,x,z);if(!P.length)return false;u.path=P;u.dest=[x,z];u.tgt=null;u.tgtTile=null;u.tk.at=G.time||0;if(role)u.tk.role=role;return true;}
const tacIdle=u=>!(u.path&&u.path.length);
/* ---------- 소대 편성 ---------- */
function tacOrganize(n){const P=tacPl();const t=G.time||0;
  for(const p of P)if(p.nat===n)p.mem=p.mem.filter(id=>G.units.some(u=>u.id===id&&u.nat===n));
  for(let i=P.length-1;i>=0;i--)if(P[i].nat===n&&!P[i].mem.length)P.splice(i,1);
  if(!aiRun(n))return;
  for(const u of G.units){if(u.nat!==n||!tacUnit(u))continue;if(u.pl&&P.some(p=>p.id===u.pl&&p.mem.includes(u.id)))continue;
    if(!u.tk)u.tk={role:'move',at:t};
    let best=null,bd=7;for(const p of P){if(p.nat!==n||p.mode==='defend'||p.mem.length>=TAC.size+1)continue;const c=tacCtr(p);if(!c)continue;const d=Math.hypot(c[0]-u.x,c[1]-u.z);if(d<bd){bd=d;best=p;}}
    if(!best){best={id:TACID++,nat:n,mem:[],mode:'attack',st:'move',stT:t,ph:0,phT:t,obj:null,objT:-99};P.push(best);}
    best.mem.push(u.id);u.pl=best.id;}}
function tacMembers(p){return p.mem.map(id=>G.units.find(u=>u.id===id)).filter(u=>u&&tacUnit(u));}
function tacCtr(p){const M=tacMembers(p);if(!M.length)return null;return [M.reduce((a,u)=>a+u.x,0)/M.length,M.reduce((a,u)=>a+u.z,0)/M.length];}
/* 소대 목표: 우리 것이 아닌 거점 중 가깝고 다른 소대가 덜 노리는 곳. 위협받는 우리 거점은 지키러 간다 */
function tacPickObj(p,K){const n=p.nat,t=G.time||0;const c=tacCtr(p);if(!c)return;
  if(p.mode==='defend'&&p.obj)return;
  if(p.obj&&t-p.objT<30){const o=G.map[p.obj[0]]&&G.map[p.obj[0]][p.obj[1]];if(o&&(o.obj==null||o.owner!==n))return;}
  let best=null,bs=-1e9;
  for(const o of G.objs){const x=G.map[o.r][o.c];const d=Math.hypot(o.c+.5-c[0],o.r+.5-c[1]);let s=-d;
    const others=tacPl().filter(q=>q!==p&&q.nat===n&&q.obj&&q.obj[0]===o.r&&q.obj[1]===o.c).length;s-=others*7;
    if(x.owner===n){const th=K.some(k=>Math.hypot(k.x-o.c-.5,k.z-o.r-.5)<6);if(!th)continue;s+=6;}
    else if(x.owner!=null)s+=2;
    if(s>bs){bs=s;best=[o.r,o.c];}}
  if(!best){// 거점을 다 가졌으면 가장 가까운 아는 적 쪽, 없으면 도시 한가운데
    let bk=null,bd=1e9;for(const k of K){const d=Math.hypot(k.x-c[0],k.z-c[1]);if(d<bd){bd=d;bk=k;}}
    const cl=v=>Math.max(0,Math.min(N-1,Math.floor(v)));best=bk?[cl(bk.z),cl(bk.x)]:[Math.floor(N/2),Math.floor(N/2)];}   // 지도 밖(드나드는 항공기)이면 가장자리 칸으로
  if(!p.obj||p.obj[0]!==best[0]||p.obj[1]!==best[1]){p.obj=best;p.objT=t;}}
/* ---------- 소대 판단 ---------- */
function tacThink(n){tacOrganize(n);const K=tacKnown(n);const objs=coverObjs();
  for(const p of tacPl()){if(p.nat!==n)continue;try{tacPlatoon(p,K,objs);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}}}
function tacPlatoon(p,K0,objs){const M=tacMembers(p);if(!M.length)return;const t=G.time||0;const c=tacCtr(p);
  if(p.auto!==false&&aiRun(p.nat))tacPickObj(p,K0);
  const K=K0.filter(k=>M.some(u=>Math.hypot(k.x-u.x,k.z-u.z)<TAC.near));
  for(const u of M)if(!u.tk)u.tk={role:'move',at:t};
  // 전력 비교: 우리(체력·사기 반영) 대 가까운 적
  const str=M.reduce((a,u)=>a+tacCost(u.type)*u.hp/hpMax(u)*((u.mor??80)<30?.5:1),0);
  const est=K.filter(k=>Math.hypot(k.x-c[0],k.z-c[1])<7).reduce((a,k)=>a+tacCost(k.ty)*(k.e.hp/hpMax(k.e))*(UT[k.ty].cls==='veh'&&!M.some(u=>u.type==='at'||u.type==='eng')?1.5:1),0);
  const mor=M.reduce((a,u)=>a+(u.mor??80),0)/M.length;
  if(p.st==='retreat'){if(t-p.stT<12&&M.some(u=>!tacIdle(u)))return;p.st='regroup';p.stT=t;if(p.human)msnReport(p,'후퇴 완료, 재편성 중');}
  if(p.st==='regroup'&&t-p.stT<TAC.regroup&&(mor<55||est>str)){tacHold(p,M,K,objs);return;}
  const hurt=M.reduce((a,u)=>a+(u.supp||0),0)/M.length>.8||M.some(u=>t-(u.casT??-99)<8);
  if(K.length&&p.mode!=='recon'&&t-(p.retT??-99)>60&&(est>=4&&str<est*TAC.ret&&hurt||mor<28&&est>0)){
    if(p.human&&p.aut==='semi'&&!msnOK(p,'retreat'))msnReq(p,'retreat');      // 반자동: 물러나기 전에 승인을 받는다
    else{p.retT=t;tacRetreat(p,M,K,objs);return;}}
  if(!K.length){if(p.st!=='move'){p.st='move';p.stT=t;}tacMove(p,M,objs);return;}
  if(p.st!=='contact'&&p.st!=='assault'){p.st='contact';p.stT=t;p.roles=null;if(p.human)msnReport(p,'접적, 교전 시작');}
  if(p.mode==='recon'){tacHold(p,M,K,objs);if(p.human)msnSpot(p,K);return;}   // 정찰: 엄폐에 숨어 보고만 한다
  if(p.human)msnFireReq(p,K,est);
  tacContact(p,M,K,objs,str,est);}
/* 적 없음: 멀면 함께 행군, 가까우면 번갈아 엄폐 이동, 도착하면 거점을 잡고 둘레를 지킨다 */
function tacMove(p,M,objs){const t=G.time||0;const n=p.nat;if(!p.obj)return;const [or,oc]=p.obj;const gx=p.pt?p.pt[0]:oc+.5,gz=p.pt?p.pt[1]:or+.5;const c=tacCtr(p);
  const d=Math.hypot(gx-c[0],gz-c[1]);const X=G.map[or]&&G.map[or][oc];if(!X){p.obj=null;p.pt=null;return;}   // 지도 밖 목표는 버리고 다음에 새로 고른다
  if(d<1.8||p.mode==='defend'&&d<3){// 도착: 점령할 수 있는 분대 하나는 거점 칸으로, 나머지는 둘레 엄폐
    const cap=X.obj!=null&&X.owner!==n?M.filter(u=>UT[u.type].cap).sort((a,b)=>UT[b.type].cap-UT[a.type].cap)[0]||null:null;   // 점령 힘이 가장 큰 분대가 들어간다
    if(cap&&tacIdle(cap)&&(cap.r!==or||cap.c!==oc))tacGo(cap,gx,gz,'cap');
    for(const u of M){if(u===cap||!tacIdle(u)||t-(u.tk.at||0)<8||u.tk.role==='hold'&&Math.hypot(u.x-gx,u.z-gz)<2.6)continue;const i=M.indexOf(u);const ang=i/M.length*6.283;
      const s=tacSpot(u,gx+Math.cos(ang)*1.2,gz+Math.sin(ang)*1.2,[0,.4,.8],(x,z)=>coverAt(x,z,'inf',objs)-Math.hypot(x-u.x,z-u.z)*.05);if(s)tacGo(u,s[0],s[1],'hold');}
    if(p.human&&p.mode==='attack'&&(X.obj==null||X.owner===n)&&M.every(tacIdle)){p.mode='defend';msnReport(p,X.obj!=null?`${G.objs[X.obj].name} 확보, 방어로 전환`:'목표 지점 도착, 방어로 전환');return;}
    // 다 잡았으면 한 분대를 수비로 남기고 소대는 다음 목표로
    if(X.obj!=null&&X.owner===n&&p.mode==='attack'&&M.length>=3&&!tacPl().some(q=>q.nat===n&&q.mode==='defend'&&q.obj&&q.obj[0]===or&&q.obj[1]===oc)){
      const g=M.slice().sort((a,b)=>Math.hypot(a.x-gx,a.z-gz)-Math.hypot(b.x-gx,b.z-gz))[0];p.mem=p.mem.filter(id=>id!==g.id);
      const q={id:TACID++,nat:n,mem:[g.id],mode:'defend',st:'move',stT:t,ph:0,phT:t,obj:[or,oc],objT:t};tacPl().push(q);g.pl=q.id;p.objT=-99;tacN('garrison');}
    return;}
  const near=d<TAC.travel||p.mode==='recon'||tacKnown(n).some(k=>Math.hypot(k.x-c[0],k.z-c[1])<12);
  if(!near||M.length<2){// 행군: 다 같이 몇 칸씩
    for(const u of M){if(!tacIdle(u)&&t-(u.tk.at||0)<10)continue;const i=M.indexOf(u);const a=i*2.4;const L=Math.min(6,d);
      const q=tacAlong(u,gx+Math.cos(a)*.6,gz+Math.sin(a)*.6,L);if(q)tacGo(u,q[0],q[1],'move');}
    return;}
  // 번갈아 이동: 한쪽(ph)이 엄폐에서 엄폐로 가는 동안 다른 쪽은 멈춰서 지켜본다
  const A=M.filter((u,i)=>i%2===p.ph),B=M.filter((u,i)=>i%2!==p.ph);
  if(A.every(tacIdle)&&t-p.phT>2||t-p.phT>14){p.ph=1-p.ph;p.phT=t;tacN('bound');
    for(const u of B){const q=tacAlong(u,gx,gz,Math.min(TAC.leg,d));if(!q)continue;
      const s=tacSpot(u,q[0],q[1],[0,.3,.6,.9],(x,z)=>coverAt(x,z,'inf',objs)*3-Math.hypot(x-gx,z-gz)*.25-Math.hypot(x-q[0],z-q[1])*.4)||q;tacGo(u,s[0],s[1],'bound');}}}
/* 접적: 화력 기반 + 측면 기동 + 제압되면 돌격 */
function tacContact(p,M,K,objs,str,est){const t=G.time||0;
  // 초점 적: 우리 소대에 가장 위협적인(가깝고 비싼) 아는 적
  const c=tacCtr(p);let F=null,fs=-1e9;for(const k of K){const d=Math.hypot(k.x-c[0],k.z-c[1]);const s=tacCost(k.ty)-d*1.2-k.age*.3;if(s>fs){fs=s;F=k;}}
  if(!F)return;p.foc=F.id;
  // 역할: 기관총은 화력 기반, 없으면 적과 가장 잘 보이는 소총 하나. 대전차는 차량이 초점이면 측면, 아니면 화력 기반
  if(!p.roles||p.rolesF!==F.id||Object.keys(p.roles).length!==M.length){p.roles={};p.rolesF=F.id;const veh=UT[F.ty].cls==='veh';
    let bof=M.filter(u=>u.type==='mg'||u.type==='at'&&!veh);
    if(!bof.length&&M.length>=2){const r=M.slice().sort((a,b)=>Math.hypot(a.x-F.x,a.z-F.z)-Math.hypot(b.x-F.x,b.z-F.z));bof=[r[0]];}
    if(p.mode==='defend'||p.mode==='support')bof=M.slice();   // 방어·지원 사격: 모두 자리에서 쏜다
    for(const u of M)p.roles[u.id]=bof.includes(u)?'bof':'man';}
  const bof=M.filter(u=>p.roles[u.id]==='bof'),man=M.filter(u=>p.roles[u.id]==='man');
  const fx=F.x,fz=F.z;
  // 화력 기반: 엄폐 뒤, 초점까지 시야가 트이고 사거리 55~90% 거리
  for(const u of bof){const R=UT[u.type].rng[1];const d0=Math.hypot(u.x-fx,u.z-fz);
    const see=d0>=Math.min(2,R*.5)&&d0<=R*.95&&losPt(u.x,u.z,eye(u),fx,fz,F.h);const ok=see&&tacCov(u.x,u.z,fx,fz,objs)>=.25;
    if(ok||(!tacIdle(u)&&t-(u.tk.at||0)<8)||see&&u.tk.role==='bof'&&t-(u.tk.at||0)<15){u.tk.role='bof';continue;}
    const s=tacSpot(u,u.x,u.z,[0,.5,1,1.5,2.2],(x,z)=>{const d=Math.hypot(x-fx,z-fz);if(d<1.6||d>R*.95)return -1e9;if(p.pt&&p.mode==='defend'&&Math.hypot(x-p.pt[0],z-p.pt[1])>3.2)return -1e9;if(!losPt(x,z,tacEye(x,z),fx,fz,F.h))return -1e8;
      return tacCov(x,z,fx,fz,objs)*12+tacHigh(x,z,F.h+(typeof gndAt==='function'?gndAt(fx,fz):0))*1.6-tacExpo(x,z,K,objs,F)*.8-Math.abs(d-R*.72)*.8-Math.hypot(x-u.x,z-u.z)*.9;});
    if(s&&s[0]>-1e7)tacGo(u,s[0],s[1],'bof');}
  if(!man.length)return;
  const bx=bof.length?bof.reduce((a,u)=>a+u.x,0)/bof.length:c[0],bz=bof.length?bof.reduce((a,u)=>a+u.z,0)/bof.length:c[1];const axis=Math.atan2(bz-fz,bx-fx);
  const fe=F.e;const supd=fe&&G.units.includes(fe)&&((typeof pinned==='function'&&pinned(fe))||fe.brk||(fe.mor??80)<35||UT[fe.type].cls==='inf'&&fe.hp<hpMax(fe)*.35);
  const weak=est<=str*.35;
  if(p.st==='contact'&&(supd||weak)&&man.every(u=>tacIdle(u)||u.tk.role==='flank'&&Math.hypot(u.x-fx,u.z-fz)<3.6)&&t-p.stT>10&&t-(p.asT??-99)>30){
    if(p.human&&p.aut==='semi'&&!msnOK(p,'assault'))msnReq(p,'assault');
    else{p.st='assault';p.stT=t;p.asT=t;tacN('assault');if(p.human)msnReport(p,'적 제압, 돌격');}}
  if(p.st==='assault'&&!supd&&!weak&&t-p.stT>20){p.st='contact';p.stT=t;}
  for(const u of man){const R=UT[u.type].rng[1];
    if(p.st==='assault'){// 돌격: 초점 1칸 안쪽 엄폐(건물이면 문 앞)
      if(!tacIdle(u)&&u.tk.role==='assault'&&t-(u.tk.at||0)<10)continue;const d0=Math.hypot(u.x-fx,u.z-fz);if(d0<2.1&&tacIdle(u))continue;
      const s=tacSpot(u,fx,fz,[1.2,1.6,2],(x,z)=>tacCov(x,z,fx,fz,objs)*6-tacExpo(x,z,K,objs,F)*.5-Math.hypot(x-u.x,z-u.z)*.5);
      if(s){tacGo(u,s[0],s[1],'assault');tacSmokeLeg(u,K);}continue;}
    // 측면: 화력 기반 축에서 70도 이상 돈 자리, 엄폐 좋고 가는 길이 덜 노출된 곳
    if(!tacIdle(u)&&u.tk.role==='flank'&&t-(u.tk.at||0)<14)continue;
    if(tacIdle(u)&&u.tk.role==='flank'&&t-(u.tk.at||0)<12&&Math.hypot(u.x-fx,u.z-fz)<R)continue;   // 자리 잡았으면 쏘면서 기다린다
    const s=tacSpot(u,fx,fz,[TAC.flankR[0],(TAC.flankR[0]+TAC.flankR[1])/2,TAC.flankR[1]],(x,z)=>{const a=Math.atan2(z-fz,x-fx);let da=Math.abs(Math.atan2(Math.sin(a-axis),Math.cos(a-axis)));
      if(bof.length&&da<1.0)return -1e9;const mx=(x+u.x)/2,mz=(z+u.z)/2;const dd=Math.hypot(x-u.x,z-u.z);if(dd>7)return -1e9;
      let nearE=0;for(const k of K)if(k!==F&&Math.hypot(k.x-x,k.z-z)<2.2)nearE+=6;
      const ax1=u.x+(x-u.x)/3,az1=u.z+(z-u.z)/3,ax2=u.x+(x-u.x)*2/3,az2=u.z+(z-u.z)*2/3;
      for(const k of K)for(const [qx,qz] of [[ax1,az1],[ax2,az2],[mx,mz]])if(Math.hypot(k.x-qx,k.z-qz)<2)nearE+=4;   // 가는 길에 적 코앞을 지나지 않게
      return tacCov(x,z,fx,fz,objs)*10+Math.min(da,1.9)*2.2-nearE-tacExpo(x,z,K,objs,null)*.6-(tacExpo(ax1,az1,K,objs,null)+tacExpo(ax2,az2,K,objs,null))*.35-dd*.55;});
    if(s){if(tacGo(u,s[0],s[1],'flank')){tacN('flank');tacSmokeLeg(u,K);}}}}
/* 트인 길을 노출된 채 건너야 하면 연막 수류탄 */
function tacSmokeLeg(u,K){if(typeof popSmoke!=='function'||!u.path||!u.path.length)return;if(u.ssm==null)u.ssm=(REAL.ssmk||{})[u.type]||0;if(u.ssm<=0||(G.time||0)-(u._smT||-99)<10)return;const pl=u.pl&&tacPl().find(q=>q.id===u.pl);if(pl&&(G.time||0)-(pl.smT??-99)<25)return;
  let px=u.x,pz=u.z,L=0;for(const q of u.path){const s=Math.hypot(q[0]-px,q[1]-pz);for(let k=.5;k<=s;k+=.5){const x=px+(q[0]-px)*k/s,z=pz+(q[1]-pz)*k/s;const tl=tileAt(x,z);
      if(tl&&(tl.t==='road'||tl.t==='plaza')&&tacExpo(x,z,K,null,null)>=3){let f=null,fd=1e9;for(const kk of K){const d=Math.hypot(kk.x-x,kk.z-z);if(d<fd){fd=d;f=kk;}}
        const ux=(f.x-x)/(fd||1),uz=(f.z-z)/(fd||1);const sx=x+ux*.7,sz=z+uz*.7;const st=tileAt(sx,sz);if(st&&st.t!=='bldg'&&popSmoke(sx,sz,18)){u.ssm--;u._smT=G.time||0;if(pl)pl.smT=u._smT;if(typeof FXH.ssmoke==='function')FXH.ssmoke(u,sx,sz);tacN('smoke');}return;}}
    L+=s;if(L>3.5)return;px=q[0];pz=q[1];}}
/* 후퇴: 엄폐를 타고 집결지 쪽으로 3~5칸, 기관총이 마지막까지 엄호 */
function tacRetreat(p,M,K,objs){const t=G.time||0;if(p.st!=='retreat'){p.st='retreat';p.stT=t;tacN('retreat');if(p.human)msnReport(p,'불리하여 후퇴');else if(!G.fog)L(`${natName(p.nat)} 소대 후퇴`);}
  const home=ccpOf(p.nat);
  for(const u of M){if(!tacIdle(u)&&u.tk.role==='ret')continue;const dx=home.x-u.x,dz=home.z-u.z,L0=Math.hypot(dx,dz)||1;const ax=u.x+dx/L0*4,az=u.z+dz/L0*4;
    const s=tacSpot(u,ax,az,[0,.6,1.2,1.8],(x,z)=>tacCov(x,z,x-dx,z-dz,objs)*5-tacExpo(x,z,K,objs,null)*1.2-Math.hypot(x-ax,z-az)*.4);if(s)tacGo(u,s[0],s[1],'ret');}}
/* 제자리 지키기: 노출됐으면 가까운 엄폐로 */
function tacHold(p,M,K,objs){const t=G.time||0;for(const u of M){if(!tacIdle(u)||t-(u.tk.at||0)<6)continue;
  const s=tacSpot(u,u.x,u.z,[0,.35,.7],(x,z)=>coverAt(x,z,'inf',objs)*4-(K.length?tacExpo(x,z,K,objs,null):0)-Math.hypot(x-u.x,z-u.z));if(s&&Math.hypot(s[0]-u.x,s[1]-u.z)>.15)tacGo(u,s[0],s[1],'hold');else u.tk.at=t;}}
/* 접적 반응: 행군·번갈아 이동 중 적을 직접 보면 가까운 엄폐에 붙어 멈춘다 */
function tacReact(u){if(!u.tk||tacIdle(u)||u.brk)return;const r=u.tk.role;if(r!=='move'&&r!=='bound'&&r!=='hold')return;const t=G.time||0;if((u._rcT||0)>t)return;u._rcT=t+.5;
  const R=UT[u.type].rng[1]+.4;let foe=null;for(const e of G.units){if(e.nat===u.nat||UT[e.type].fly)continue;if(Math.hypot(e.x-u.x,e.z-u.z)>R)continue;if(G.fog&&!selfSees(u,e))continue;if(!canHit(u,e))continue;foe=e;break;}
  if(!foe)return;const objs=coverObjs(u);const s=tacSpot(u,u.x,u.z,[0,.25,.5],(x,z)=>tacCov(x,z,foe.x,foe.z,objs)*4-Math.hypot(x-u.x,z-u.z)*1.5);
  u.path=s&&Math.hypot(s[0]-u.x,s[1]-u.z)>.08?pathPts(u,s[0],s[1]):[];u.dest=null;u.tk.role='react';u.tk.at=t;tacN('react');}
/* 갇힘 풀기: 길이 있는데 6초 넘게 제자리면 길을 버리고 다음 판단에서 새 자리를 고른다 */
function tacStall(u){const t=G.time||0;if(tacIdle(u)||u.climb){u._tst=null;return;}const p=u._tst;
  if(!p||Math.hypot(p[0]-u.x,p[1]-u.z)>.12){u._tst=[u.x,u.z,t];return;}
  if(t-p[2]>6){u._tst=null;u.path=[];u.dest=null;u.tk.at=-99;tacN('unstick');}}
/* ---------- 엔진에 끼우기 ---------- */
{const _ai=aiThink;aiThink=function(n){let hid=[];try{tacThink(n);hid=G.units.filter(u=>u.nat===n&&u.tk&&tacUnit(u)&&u.pl&&!u.job);for(const u of hid)u.job=TAC_HIDE;}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}
  try{_ai(n);}finally{for(const u of hid)if(u.job===TAC_HIDE)u.job=null;}};}
/* 사격 군기: 움직이는 중에는 함부로 쏘지 않고 멈춰서 쏜다. 엄호는 멈춰 있는 쪽이 한다.
   다만 접촉하면(교범의 '접촉 시 행동') 바로 응사한다: 방금 총에 맞았거나 눌렸고, 보이는 적이 사거리 안에 있을 때,
   또는 보이는 적이 4칸(약 50m) 안에 있을 때. 돌격조는 쏘며 나아간다(사격과 기동). */
function tacHot(u){const t=G.time||0;const hot=(u.supp||0)>0||t-(u._hitT??-99)<3;const R=hot?(UT[u.type].rng[1]||4):u.tk&&u.tk.role==='assault'?6:4;
  return G.units.some(e=>e.nat!==u.nat&&!UT[e.type].fly&&Math.hypot(e.x-u.x,e.z-u.z)<R&&(!G.fog||seen(e,u.nat)));}
const TAC_QUIET={flank:1,ret:1,move:1,bound:1,bof:1,hold:1,cap:1,assault:1};
{const _f=rtFight;rtFight=function(u){if(u.tk&&u.pl&&TAC_QUIET[u.tk.role]&&u.path&&u.path.length&&!u.climb){
    if(!tacHot(u))return;}
  return _f(u);};}
{const _tick=rtTick;rtTick=function(dt){_tick(dt);if(!G||G.over||!G.units)return;
  for(const u of G.units)if(u.tk&&u.pl)try{tacReact(u);tacStall(u);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}};}
