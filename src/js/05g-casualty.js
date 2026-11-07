/* ===================== CASUALTY: 맞은 곳에 따라 다치는 병사, 부상자 후송, 사기, 차량 부위 피해 =====================
   보병 분대에는 체력 막대가 없다. 총알·파편이 들어오면 병사 한 명 한 명이 맞고, 맞은 부위에 따라
     정상 → 경상(계속 싸움, 다리면 느림) → 중상(쓰러져 피를 흘림, 싸울 수 없음) → 전사
   가 정해진다. 몸통은 방탄판이 막아 주기도 한다. 분대의 화력(u.hp)은 싸울 수 있는 병사 수로 거꾸로 정한다.
   - 중상자: 엄폐 밖에 쓰러지면 가까운 전우가 엄폐 뒤로 끌어 옮기고, 위생병(없으면 전우)이 지혈한다(출혈이 느려짐).
     그다음 전우 한 명이 업고 자기 편 환자집결지(G.ccp)로 데려간다. 그동안 분대는 그 두 사람만큼 약해진다.
     업고 간 전우는 부상자를 넘기고 분대로 돌아온다. 피가 다 흐르면 전사.
   - 싸울 수 있는 병사가 아무도 없으면 분대는 끝난다. 남은 중상자는 그 자리에 남고(G.cas), 지나가는 아군 분대가 데려간다.
   - 제압: 맞거나 총알이 스치면 쌓이고(최대 3) 시간이 지나면 줄어든다. 1.6을 넘으면 꼼짝 못 하고 엎드린다(이동 불가, 사격 느림).
   - 사기(u.mor 0~100): 사상자·제압으로 떨어지고 조용하면 돌아온다. 50 아래는 흔들림(사격 느림), 20 아래는 공황:
     환자집결지 쪽으로 물러나고 쏘지 않으며 명령을 듣지 않는다(45까지 회복하면 다시 싸운다). 공황이어도 부상자는 업고 간다.
   - 차량: 대전차 화기에 뚫리면 엔진·궤도(기동 불능), 포·포탑(무장 파손), 승무원 부상, 탄약·연료(화재 → 승무원 탈출, 잠시 뒤 유폭).
     승무원 둘 이상이 쓰러지거나, 움직이지도 쏘지도 못하면 승무원이 차를 버린다. */
const CAS_K=1.15;               // 체력 1만큼의 피해가 병사 몇 명을 다치게 하나(분대 인원 비례) 보정
const PINNED=1.6;               // 이 이상 제압되면 꼼짝 못 함
const VCREW={tank:4,ifv:3,hmv:4,spg:4};
const WLOC={head:'머리',torso:'몸통',arm:'팔',leg:'다리'};
const WST={ok:'정상',lw:'경상',hw:'중상',kia:'전사',evac:'후송됨',rear:'후방'};
Object.assign(FXH,{cas(){},cook(){},vhit(){}});
const casStats=n=>{const N2=G.nats[n];return N2.cas||(N2.cas={kia:0,wia:0,lw:0,evac:0,dow:0,veh:0});};
const wiaDn=S=>{S.wia=Math.max(0,S.wia-1);};
function casLog(m){G.log.unshift(m);G.log=G.log.slice(0,8);}
const roleOf=(u,i)=>i===0?'분대장':i===1&&(u._men||[]).length>=5?'위생병':'';
/* 저장해 둔 부상 기록(u.ws)을 병사 목록에 입힌다. menInit(05f) 끝에서 부른다. */
function casLoad(u,M){if(!u.ws||u.ws.length!==M.length)u.ws=M.map(()=>({s:'ok'}));if(u.mor==null)u.mor=80+(u.rank||0)*5;
  for(const m of M)manFlags(u,m);}
function manFlags(u,m){const w=u.ws[m.i];m.dead=w.s==='kia'?(m.dead||G.time||.001):0;m.down=w.s==='hw'&&!w.y?1:0;m.gone=(w.s==='evac'||w.s==='rear'||w.s==='orph'||w.y)?1:0;
  if(m.down)m.pr=1e9;else if(m.pr>1e8)m.pr=0;if(m.dead||m.down||m.gone)m.task=null;}
const menOf=u=>u._men||(typeof menInit==='function'?menInit(u):[]);
/* 싸울 수 있는 병사(정상·경상, 분대에 있음). 부상자를 돌보는 사람도 센다. */
const casAble=u=>menOf(u).filter(m=>{const w=u.ws[m.i];return (w.s==='ok'||w.s==='lw')&&!w.y;});
/* 분대 화력 = 싸울 수 있는 병사 몫(경상은 0.7, 부상자를 돌보는 중이면 0.4) */
function casSync(u,by){const M=menOf(u);let v=0,able=0;for(const m of M){manFlags(u,m);const w=u.ws[m.i];if((w.s!=='ok'&&w.s!=='lw')||w.y)continue;able++;v+=(w.s==='lw'?.7:1)*(m.task?.4:1);}
  if(!able){if(G.units.includes(u)){casOrphan(u);L(`${natName(u.nat)} ${UT[u.type].n} 전투 불능`);kill(u,by);}return 0;}
  u.hp=Math.max(.1,Math.round(hpMax(u)*v/M.length*10)/10);return able;}
/* 분대가 끝나면 남은 중상자는 그 자리에 남는다 */
function casOrphan(u){G.cas=G.cas||[];for(const m of menOf(u)){const w=u.ws[m.i];if(w.s==='hw'&&!w.y){G.cas.push({id:'c'+u.id+'_'+m.i,nat:u.nat,x:m.x,z:m.z,b:w.b,a:w.a||0,w:w.w,s:'hw'});w.s='orph';manFlags(u,m);}}}
/* ---------- 맞은 부위와 결과 ---------- */
function pickW(t){let r=Math.random(),a=0;for(const k in t){a+=t[k];if(r<a)return k;}return Object.keys(t).pop();}
const LOC_OPEN={head:.1,torso:.42,arm:.2,leg:.28},LOC_COV={head:.22,torso:.2,arm:.38,leg:.2},LOC_FRAG={head:.12,torso:.35,arm:.25,leg:.28};
const OUT={bullet:{head:{kia:.7,hw:.3},torso:{kia:.3,hw:.6,lw:.1},arm:{lw:.8,hw:.2},leg:{hw:.45,lw:.55}},
  frag:{head:{kia:.6,hw:.4},torso:{kia:.25,hw:.6,lw:.15},arm:{lw:.65,hw:.35},leg:{hw:.5,lw:.5}}};
/* 병사 m이 맞았다: 결과(stop/lw/hw/kia) */
function woundRoll(kind,cov){if(kind==='blast'||kind==='crush'){const loc=pickW(LOC_FRAG);return {loc,out:pickW(kind==='blast'?{kia:.42,hw:.43,lw:.15}:{kia:.38,hw:.45,lw:.17})};}
  const frag=kind==='frag';const loc=pickW(frag?LOC_FRAG:cov>=.25?LOC_COV:LOC_OPEN);
  if(loc==='torso'&&Math.random()<(frag?.3:.45))return {loc,out:'stop'};      // 방탄판이 막음
  return {loc,out:pickW(OUT[frag?'frag':'bullet'][loc])};}
function woundMan(u,m,kind,cov,by){const w=u.ws[m.i];let {loc,out}=woundRoll(kind,cov);const t=G.time||0;
  if(out==='stop'){m.pr=Math.max(m.pr||0,1.4+Math.random());u.supp=Math.min(3,(u.supp||0)+.3);return 'stop';}
  if(w.s==='hw')out='kia';else if(out==='lw'&&w.s==='lw')out='hw';
  const S=casStats(u.nat);const was=w.s;w.s=out;w.w=loc;u.casT=t;
  if(out==='hw'){w.b=(loc==='head'||loc==='torso'?70:kind==='blast'?90:140)+Math.random()*120;w.a=0;w.dt=t;S.wia++;}
  else if(out==='kia'){S.kia++;if(was==='hw')wiaDn(S);}
  else if(out==='lw'){S.lw++;if(loc==='leg')w.slow=1;}
  manFlags(u,m);
  u.mor=Math.max(0,(u.mor??80)-(out==='kia'?12:out==='hw'?9:4)-(m.i===0&&out!=='lw'?10:0));
  for(const o of u._men)if(o!==m&&menAct(o)&&Math.hypot(o.x-m.x,o.z-m.z)<.3)o.pr=Math.max(o.pr||0,1.2+Math.random());
  if(u.nat===G.viewer||by&&by.nat===G.viewer){const who=roleOf(u,m.i)||'병사';casLog(`${natName(u.nat)} ${UT[u.type].n} ${who} ${WLOC[loc]} ${out==='kia'?'전사':out==='hw'?'중상':'경상'}`);}
  FXH.cas(u,m,out);return out;}
/* 피해가 어느 병사에게 가나: 총알은 노출되고 움직이는 사람, 폭발은 터진 곳에 가까운 사람 */
function casPick(u,kind,by,o,M){const ex=kind==='blast'||kind==='frag'||kind==='crush';
  const L=M.filter(m=>!m.dead&&!m.gone&&(ex||!m.down));if(!L.length)return null;
  let ux=1,uz=0;if(by){const d=Math.hypot(by.x-u.x,by.z-u.z)||1;ux=(by.x-u.x)/d;uz=(by.z-u.z)/d;}
  const inB=cell(u.r,u.c).t==='bldg';const objs=!ex&&!inB&&typeof coverObjs==='function'?coverObjs(u):null;
  let best=null,bs=-1e9,bc=0;
  for(const m of L){let cov=.4,s;
    if(!ex){const t=tileAt(m.x,m.z);if(t&&t.t!=='bldg'&&objs)cov=Math.max(TT[t.t].cov||0,dirCoverAt(m.x,m.z,ux,uz,'inf',u,objs).cov);
      s=Math.random()*.7-cov+(m.spd>.05?.25:0)-(m.pr>0?.15:0)-(m.down?.3:0);}
    else if(o&&o.x!=null){const d=Math.hypot(m.x-o.x,m.z-o.z);s=Math.random()*.6-d/Math.max(.3,o.rad||.4)-(m.pr>0?.15:0);}
    else s=Math.random();
    if(s>bs){bs=s;best=m;bc=cov;}}
  return {m:best,cov:bc};}
function hurtMen(u,amt,by,o){const M=menOf(u);const kind=o.kind||'bullet';
  u.supp=Math.min(3,(u.supp||0)+(kind==='bullet'?.2:.5));u._hitT=G.time||0;if(by)u._thr=[by.x,by.z,G.time||0];
  if(u.nocas){casSync(u,by);return;}                         // 테스트용: 다치지 않는 표적
  const ex=amt/hpMax(u)*M.length*CAS_K;let c=Math.floor(ex)+(Math.random()<ex%1?1:0);
  if(kind==='bullet'&&by&&!UT[by.type].ex)c=Math.min(c,o.hits||c);
  for(let i=0;i<c;i++){const p=casPick(u,kind,by,o,M);if(!p)break;woundMan(u,p.m,kind,p.cov,by);}
  casSync(u,by);}
/* ---------- 차량 ---------- */
function vdOf(u){return u.vd||(u.vd={mob:0,gun:0,crew:Array.from({length:VCREW[u.type]||3},()=>'ok'),fire:0});}
function hurtVeh(u,amt,by,o){const V=vdOf(u);const ta=by?UT[by.type]:null;const kind=o.kind||'bullet';
  u.hp=Math.round((u.hp-amt)*10)/10;u._hitT=G.time||0;
  const heavy=kind==='blast'||kind==='crush'||(ta&&ta.atk.veh>=5);const S=casStats(u.nat);const nm=`${natName(u.nat)} ${UT[u.type].n}`;
  const rolls=Math.min(3,Math.max(1,o.hits||1));const crewHit=()=>{const i=V.crew.findIndex(c=>c==='ok');if(i<0)return;V.crew[i]=Math.random()<.4?'kia':'hw';if(V.crew[i]==='kia')S.kia++;else S.wia++;};
  for(let k=0;k<rolls;k++){
    if(heavy){const pen=UT[u.type].armor?(by&&(by.type==='at'||by.type==='eng')?.75:by&&by.type==='tank'?.6:.35):u.type==='hmv'?.95:.85;if(Math.random()>pen)continue;
      const r=Math.random();
      if(r<.28){if(!V.mob){V.mob=1;L(`${nm} 기동 불능`);}}
      else if(r<.5){if(!V.gun){V.gun=1;L(`${nm} 무장 파손`);}}
      else if(r<.78){crewHit();if(Math.random()<.4)crewHit();}
      else{V.fire=1;}
      FXH.vhit(u,r);}
    else if(u.type==='hmv'&&Math.random()<.18)crewHit();}       // 험비는 장갑이 얇아 소총탄에도 승무원이 다친다
  if(!G.units.includes(u))return;
  const crewDown=V.crew.filter(c=>c!=='ok').length;
  if(u.hp<=0){S.veh++;casCook(u,.5);kill(u,by);return;}
  if(V.fire){L(`${nm} 화재, 승무원 탈출`);S.veh++;casCook(u,u.type==='hmv'?.2:.8);kill(u,by);return;}
  if(crewDown>=2||crewDown>=V.crew.length-1||V.mob&&V.gun){L(`${nm} 승무원이 차를 버림`);S.veh++;kill(u,by);return;}}
/* 불붙은 차량은 몇 초 뒤 탄약이 터진다(주변 부대 피해) */
function casCook(u,p){if(Math.random()>p)return;(G.cook=G.cook||[]).push({t:(G.time||0)+4+Math.random()*9,x:u.x,z:u.z,big:u.type==='tank'||u.type==='spg'?1:0});}
function cookTick(){if(!G.cook||!G.cook.length)return;const keep=[];
  for(const c of G.cook){if(c.t>G.time){keep.push(c);continue;}FXH.cook(c.x,c.z,c.big);
    for(const u of G.units.slice()){if(UT[u.type].fly)continue;const d=Math.hypot(u.x-c.x,u.z-c.z);if(d<(c.big?.9:.6))harm(u,(c.big?5:3)*(1-d),null,{kind:'blast',x:c.x,z:c.z,rad:.6});}}
  G.cook=keep;}
/* harm(04-rules)에서 부른다: 처리했으면 true */
function harmX(u,amt,by,o){const c=UT[u.type].cls;if(c==='inf'){hurtMen(u,amt,by,o);return true;}if(c==='veh'){hurtVeh(u,amt,by,o);return true;}return false;}
/* ---------- 환자집결지 ---------- */
function ccpOf(n){G.ccp=G.ccp||{};if(G.ccp[n])return G.ccp[n];let sp=zoneSpots(n).filter(([r,c])=>['road','plaza','park'].includes(G.map[r][c].t));if(!sp.length)sp=zoneSpots(n).filter(([r,c])=>G.map[r][c].t!=='water'&&G.map[r][c].t!=='bldg');
  const p=sp.length?sp[Math.floor(sp.length*.6)]:[Math.floor(N/2),Math.floor(N/2)];return G.ccp[n]={x:p[1]+.5,z:p[0]+.5};}
/* ---------- 분대 안: 끌어 옮기기, 응급처치, 후송 보내기 ---------- */
const CAS_SP=()=>UT.rifle.mv*SPD_K;
function casStep(u,m,tx,tz,sp,dt){const dx=tx-m.x,dz=tz-m.z,d=Math.hypot(dx,dz);if(d<.02)return true;const st=Math.min(d,sp*dt);const nx=m.x+dx/d*st,nz=m.z+dz/d*st;
  if(menClear(u,m.x,m.z,nx,nz)){m.x=nx;m.z=nz;m.stk=0;}else{m.stk=(m.stk||0)+dt;if(m.stk>2){m.x=tx;m.z=tz;m.stk=0;}}
  m.f=Math.atan2(dz,dx);m.spd=st/dt;return d<=st+.02;}
/* 부상자를 끌어다 놓을 엄폐 자리 */
function casCoverSpot(u,x,z){const th=menThreatDir(u);const ux=Math.cos(th),uz=Math.sin(th);const objs=coverObjs(u);let best=null,bs=.15;
  for(const rad of [0,.12,.24,.36,.48])for(let i=0;i<(rad?10:1);i++){const a=i/10*6.283;const px=x+Math.cos(a)*rad,pz=z+Math.sin(a)*rad;if(rad&&!menClear(u,x,z,px,pz))continue;const t=tileAt(px,pz);if(!t||t.t==='bldg')continue;
    const s=dirCoverAt(px,pz,ux,uz,'inf',u,objs).cov+(TT[t.t].cov||0)*.5-rad*.25;if(s>bs){bs=s;best=[px,pz];}}
  return best;}
function casTick(u,dt){const M=menOf(u);const t=G.time||0;const S=casStats(u.nat);let ch=false;
  // 출혈
  for(const m of M){const w=u.ws[m.i];if(w.s!=='hw'||w.y)continue;w.b-=dt*(w.a?.35:1);if(w.b<=0){w.s='kia';S.dow++;wiaDn(S);S.kia++;u.mor=Math.max(0,u.mor-6);ch=true;manFlags(u,m);}}
  // 하던 일: 끌어 옮기기·지혈
  const base=CAS_SP();
  for(const m of M){const k=m.task;if(!k)continue;const c=M[k.t],cw=c&&u.ws[k.t];if(!c||!cw||cw.s!=='hw'||cw.y||m.dead||m.down||m.gone){m.task=null;ch=true;continue;}
    if(k.k==='drag'){if(k.ph==='go'){if(casStep(u,m,c.x,c.z,base*1.6,dt))k.ph='pull';}
      else{const px=m.x,pz=m.z;const done=casStep(u,m,k.x,k.z,base*.45,dt);c.x+=m.x-px;c.z+=m.z-pz;if(done){cw.dr=1;m.task=null;ch=true;}}}
    else if(k.k==='aid'){if(Math.hypot(c.x-m.x,c.z-m.z)>.06)casStep(u,m,c.x+.04,c.z,base*1.6,dt);else{m.spd=0;k.tm+=dt;if(k.tm>=k.need){cw.a=1;m.task=null;ch=true;}}}}
  {const busy=new Set(M.filter(m=>m.task).map(m=>m.task.t));const free=()=>M.filter(m=>menAct(m)&&m.lag<=0);
    const inB=cell(u.r,u.c).t==='bldg';
    for(const c of M){const w=u.ws[c.i];if(w.s!=='hw'||w.y||busy.has(c.i))continue;
      const ct=tileAt(c.x,c.z);
      // 엄폐 밖이면 먼저 끌어 옮긴다
      if(!w.dr&&!inB&&!u.brk&&ct&&ct.t!=='bldg'){const sp=casCoverSpot(u,c.x,c.z);if(sp&&Math.hypot(sp[0]-c.x,sp[1]-c.z)>.05){const F=free().filter(m=>m.i!==0&&roleOf(u,m.i)!=='위생병');const F2=F.length?F:free();
          if(F2.length>1){F2.sort((a,b)=>Math.hypot(a.x-c.x,a.z-c.z)-Math.hypot(b.x-c.x,b.z-c.z));F2[0].task={k:'drag',t:c.i,ph:'go',x:sp[0],z:sp[1]};busy.add(c.i);ch=true;continue;}}
        else w.dr=1;}
      if(!w.a){const med=M[1]&&roleOf(u,1)==='위생병'&&menAct(M[1])?M[1]:null;const F=med?[med]:free().filter(m=>m.i!==0);
        if(F.length&&(med||free().length>2)){F.sort((a,b)=>Math.hypot(a.x-c.x,a.z-c.z)-Math.hypot(b.x-c.x,b.z-c.z));F[0].task={k:'aid',t:c.i,tm:0,need:med?6:11};busy.add(c.i);ch=true;continue;}}
      // 후송: 지혈했거나 오래 기다렸고, 꼼짝 못 하는 상황이 아니면 한 명이 업고 간다
      if((w.a||t-(w.dt||0)>25)&&(u.supp||0)<1.2){const F=free().filter(m=>m.i!==0&&roleOf(u,m.i)!=='위생병');const able=casAble(u).length;
        if(F.length&&able>=3){F.sort((a,b)=>Math.hypot(a.x-c.x,a.z-c.z)-Math.hypot(b.x-c.x,b.z-c.z));evStart(u,F[0],{u:u.id,i:c.i,x:c.x,z:c.z});busy.add(c.i);ch=true;}}}
    // 쓰러진 채 남겨진 아군 부상자(분대가 끝난 자리)를 데려간다
    if(G.cas&&G.cas.length&&casAble(u).length>=3&&(u.supp||0)<1.2)for(const o of G.cas){if(o.nat!==u.nat||o.taken)continue;if(Math.hypot(o.x-u.x,o.z-u.z)>2&&!M.some(m=>menAct(m)&&Math.hypot(m.x-o.x,m.z-o.z)<.8))continue;   // 분대 근처이거나 병사 하나라도 곁에 있으면
      const F=free().filter(m=>m.i!==0);if(!F.length)break;F.sort((a,b)=>Math.hypot(a.x-o.x,a.z-o.z)-Math.hypot(b.x-o.x,b.z-o.z));o.taken=1;evStart(u,F[0],{orph:o.id,x:o.x,z:o.z});ch=true;break;}}
  if(ch)casSync(u,null);}
/* ---------- 후송조: 전우 한 명이 부상자를 업고 환자집결지로, 넘기고 돌아온다 ---------- */
let EVID=1;
function evStart(u,car,cas){G.evac=G.evac||[];const p={id:'e'+(EVID++),nat:u.nat,u:u.id,ci:car.i,cas,x:car.x,z:car.z,ph:'get',path:null,rp:0};
  u.ws[car.i].y=p.id;car.task=null;manFlags(u,car);G.evac.push(p);return p;}
function evCas(p){if(p.cas.orph)return (G.cas||[]).find(o=>o.id===p.cas.orph)||null;const u=G.units.find(z=>z.id===p.cas.u);return u?u.ws[p.cas.i]:p.cas.w||null;}
// 후송조가 없어도 남겨진 부상자의 출혈·수습 표시는 매 틱 갱신한다
function evTick(dt){G.evac=G.evac||[];const keep=[];const S=n=>casStats(n);
  for(const p of G.evac){const u=G.units.find(z=>z.id===p.u);let goal;
    const w=evCas(p);
    if(p.ph==='get'){if(!w||w.s!=='hw'||(p.cas.u!=null&&w.y&&w.y!==p.id)){p.ph=u?'back':'rear';p.path=null;}
      else{const m=u&&p.cas.u!=null?u._men[p.cas.i]:null;goal=m?[m.x,m.z]:[p.cas.x,p.cas.z];
        if(Math.hypot(goal[0]-p.x,goal[1]-p.z)<.06){// 업는다
          if(p.cas.orph){G.cas=G.cas.filter(o=>o!==w);p.cas.w=w;}else{w.y=p.id;if(m)manFlags(u,m);p.cas.w=w;}
          p.ph='out';p.path=null;if(u)casSync(u,null);}}}
    if(p.ph==='out'){const cw=p.cas.w||w;if(cw&&cw.s==='hw'){cw.b-=dt*(cw.a?.35:.5);if(cw.b<=0){cw.s='kia';S(p.nat).dow++;wiaDn(S(p.nat));S(p.nat).kia++;p.drop=[p.x,p.z];
          if(p.cas.u!=null&&u){cw.y=0;const m=u._men[p.cas.i];if(m){m.x=p.x;m.z=p.z;manFlags(u,m);}}else FXH.cas(null,{x:p.x,z:p.z,orph:1},'kia');p.ph=u?'back':'rear';p.path=null;}}
      if(p.ph==='out'){const c=ccpOf(p.nat);goal=[c.x,c.z];
        if(Math.hypot(goal[0]-p.x,goal[1]-p.z)<.3){if(cw){cw.s='evac';cw.y=0;}S(p.nat).evac++;wiaDn(S(p.nat));if(u&&p.cas.u!=null){const m=u._men[p.cas.i];if(m)manFlags(u,m);}
          p.ph=u?'back':'rear';p.path=null;}}}
    if(p.ph==='back'){if(!u){p.ph='rear';p.path=null;}else{goal=[u.x,u.z];if(Math.hypot(goal[0]-p.x,goal[1]-p.z)<.35){const m=u._men[p.ci];u.ws[p.ci].y=0;if(m){m.x=p.x;m.z=p.z;m.lag=0;manFlags(u,m);}casSync(u,null);continue;}}}
    if(p.ph==='rear'){const c=ccpOf(p.nat);goal=[c.x,c.z];if(Math.hypot(goal[0]-p.x,goal[1]-p.z)<.3){continue;}}
    if(!goal){continue;}
    // 길 따라 걷기(업고 가면 느리다)
    const pu={type:'rifle',nat:p.nat,x:p.x,z:p.z,r:Math.floor(p.z),c:Math.floor(p.x),path:p.path||[]};
    p.rp-=dt;if(!p.path||!p.path.length||p.rp<=0&&p.ph!=='out'){p.path=pathPts(pu,goal[0],goal[1]);p.rp=3;if(!p.path.length)p.path=[goal];}
    const sp=CAS_SP()*(p.ph==='out'?.5:p.ph==='get'?1.3:1);let left=sp*dt;
    while(left>0&&p.path.length){const [tx,tz]=p.path[0];const dx=tx-p.x,dz=tz-p.z,d=Math.hypot(dx,dz);if(d<=left){p.x=tx;p.z=tz;left-=d;p.path.shift();}else{p.x+=dx/d*left;p.z+=dz/d*left;left=0;}p.f=Math.atan2(dz,dx);}
    keep.push(p);}
  G.evac=keep;
  // 남겨진 부상자 출혈
  if(G.cas&&G.cas.length){G.cas=G.cas.filter(o=>{if(o.taken&&!G.evac.some(p=>p.cas.orph===o.id))o.taken=0;o.b-=dt*(o.a?.35:1);if(o.b<=0){const s=S(o.nat);s.dow++;wiaDn(s);s.kia++;FXH.cas(null,{x:o.x,z:o.z,orph:1},'kia');return false;}return true;});}}
/* ---------- 사기 ---------- */
function morTick(u,dt){const t=G.time||0;const M=menOf(u);const able=casAble(u).length;const cap=Math.min(100,(85+(u.rank||0)*5)*(.4+.6*able/M.length));
  if((u.supp||0)>=PINNED)u.mor-=1.1*dt;
  else if(t-(u.casT??-99)>10&&(u.supp||0)<.6){if((u._frT||0)<=t){u._frT=t+1;u._fr=G.units.some(o=>o!==u&&o.nat===u.nat&&Math.hypot(o.x-u.x,o.z-u.z)<2.5);}u.mor+=2*dt*(u._fr?1.5:1);}
  u.mor=Math.max(0,Math.min(cap,u.mor));
  if(!u.brk&&u.mor<20){u.brk=1;L(`${natName(u.nat)} ${UT[u.type].n} 공황, 뒤로 물러남`);u._rt=0;}
  if(u.brk&&u.mor>=45){u.brk=0;u.path=[];L(`${natName(u.nat)} ${UT[u.type].n} 다시 전열로`);}
  if(u.brk&&(u._rt||0)<=t&&!(u.path&&u.path.length)){u._rt=t+8;const c=ccpOf(u.nat);const dx=c.x-u.x,dz=c.z-u.z,d=Math.hypot(dx,dz);
    if(d>1.5){const k=Math.min(5,d)/d;u.path=pathPts(u,u.x+dx*k,u.z+dz*k);u.tgt=null;u.tgtTile=null;u.dest=null;}}}
/* ---------- 엔진에 끼우기 ---------- */
const pinned=u=>UT[u.type].cls==='inf'&&(u.supp||0)>=PINNED&&!u.brk;
const shaken=u=>(u.mor??80)<50;
{const _tick=rtTick;rtTick=function(dt){_tick(dt);if(!G||!G.units)return;
   for(const u of G.units.slice()){if(!G.units.includes(u)||UT[u.type].cls!=='inf')continue;try{casTick(u,dt);if(G.units.includes(u))morTick(u,dt);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}}
   try{evTick(dt);cookTick();}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}};
 const _mv=rtMove;rtMove=function(u,dt){if(u.vd&&u.vd.mob){u.path=[];return;}if(pinned(u))return;
   if(UT[u.type].cls==='inf'&&u.ws&&u.ws.some(w=>w.slow&&w.s==='lw'&&!w.y)){return _mv(u,dt*.8);}return _mv(u,dt);};
 const _fight=rtFight;rtFight=function(u){if(u.brk)return;if(u.vd&&u.vd.gun)return;const cd0=u.cd;_fight(u);if(u.cd>cd0+.01){let k=1;
     if(pinned(u))k*=1.6;if(shaken(u))k*=1.25;if(u.vd){const cd=u.vd.crew.filter(c=>c!=='ok').length;k*=1+.4*cd;}u.cd*=k;}};
 // 총알이 스치기만 해도 고개를 숙인다: 사격마다 제압이 쌓인다
 const _shoot=rtShoot;rtShoot=function(a,d){const s0=d.supp||0;const r=_shoot(a,d);if(G.units.includes(d)&&UT[d.type].cls==='inf'){d.supp=Math.min(3,Math.max(d.supp||0,s0)+(UT[a.type].sup?.3:.1));}return r;};
 // 공황 상태 분대는 명령을 듣지 않는다
 const deaf=f=>function(u){if(u&&u.brk){if(u.nat===G.viewer&&!isAI(u.nat))toast('공황 상태라 명령을 듣지 않습니다');return;}return f.apply(null,arguments);};
 orderMoveTo=deaf(orderMoveTo);orderAttack=deaf(orderAttack);orderBldg=deaf(orderBldg);}
/* 화면용: 병사 상태 요약 */
function casSummary(u){if(UT[u.type].cls!=='inf'||!u.ws)return null;const c={ok:0,lw:0,hw:0,kia:0,evac:0,away:0};for(const w of u.ws){if(w.y&&w.s!=='hw')c.away++;else if(w.s==='rear'||w.s==='orph')c.away++;else c[w.s]=(c[w.s]||0)+1;}return c;}
