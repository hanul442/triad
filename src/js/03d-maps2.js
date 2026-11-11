/* ===================== 지도 더 늘리기: 교외 신도시·공업 단지·성곽 구시가지·운하 도시·비행장 =====================
   03c-biome처럼 정준 사분면 하나를 만들어 90도씩 돌려 놓는다(네 세력이 공정하다). 가장자리 2줄은 집결지.
   - suburb     교외 신도시: 가운데 큰길 십자로 네 모퉁이에 쇼핑몰과 큰 주차장, 둘레는 막다른 길(쿨데삭)을 따라 마당 있는 단독주택, 학교·교회·공원.
                탁 트인 마당과 낮은 집이라 보병은 집집마다 끊어 싸우고, 차량은 굽은 길을 돌아야 한다.
   - industrial 공업 단지: 넓은 대로 격자에 큰 창고·공장, 한가운데 발전소(냉각탑·굴뚝), 기름 탱크 단지, 화물 인입선, 컨테이너 야적장.
                큰 건물과 탱크가 시야를 막고 긴 대로는 전차의 사격장이 된다.
   - oldtown    성곽 구시가지: 성벽(높이 약 8m, 아무도 넘지 못함)이 둥글게 감싼 중세 도심. 성문으로만 드나든다. 안쪽은 구불구불한 돌길과
                빽빽한 3~5층 집, 가운데 대성당 광장. 성벽 밖은 순환 공원·순환로·근대 시가지. 성벽 망루는 높은 사격 자리.
   - canal      운하 도시: 가운데 광장을 겹겹이 둘러싼 운하. 운하 양쪽은 가로수 길, 그 사이에 좁고 높은 운하 집.
                차량은 다리로만 운하를 건너고(다리는 폭파·복구된다, 05o2-bridge), 운하 집 창가가 다리를 내려다본다.
   - airfield   비행장: 한가운데서 십자로 만나는 활주로 두 개, 유도로, 계류장의 비행기, 격납고·관제탑·연료 탱크.
                둘레는 거의 풀밭이라 엄폐가 드물다. 건물 무리(거점)를 잇는 탁 트인 땅을 건너는 싸움.
   칸 표시(새로 쓰는 것): rwy(활주로, ro 방향), thr(활주로 끝 표시), twy(유도로), apr(계류장), cob(돌길), cwl(성벽 자리), cgt(성문),
   cnl(운하 다리), cq(운하 가로수 길), tkf(기름 탱크 단지), pwr(발전소 마당), ctw(냉각탑 자리), stk(굴뚝 자리), spur(화물 인입선, ro 방향). */
Object.assign(LAYOUTS,{suburb:{n:'교외 신도시 (막다른 길·단독주택·쇼핑몰)'},industrial:{n:'공업 단지 (공장·발전소·기름 탱크)'},
  oldtown:{n:'성곽 구시가지 (성벽·성문·대성당)'},canal:{n:'운하 도시 (겹겹 운하·다리·운하 집)'},airfield:{n:'비행장 (활주로·격납고·관제탑)'}});
const M2_LAYOUTS=['suburb','industrial','oldtown','canal','airfield'];
BM_LAYOUTS.push(...M2_LAYOUTS);
const M2_NAMES={suburb:'교외 신도시',industrial:'공업 단지',oldtown:'성곽 구시가지',canal:'운하 도시',airfield:'비행장'};
/* 무작위: 열 가지 배치에서 고른다. 새 배치의 고저차·기후도 여기서 정한다(운하는 늘 평지) */
const pickLayout2=seed=>bmPick(seed,931,[['sym',.11],['river',.09],['country',.11],['forest',.08],['port',.11],['suburb',.1],['industrial',.1],['oldtown',.11],['canal',.09],['airfield',.1]]);
const pickRelief2=(seed,lay)=>lay==='canal'?'flat':bmPick(seed,932,lay==='airfield'?[['flat',.7],['hills',.3]]:lay==='oldtown'?[['flat',.3],['hills',.5],['steep',.2]]:[['flat',.55],['hills',.45]]);
const pickClime2=(seed,lay)=>bmPick(seed,933,lay==='canal'?[['temp',.45],['autumn',.25],['winter',.3]]:[['temp',.36],['autumn',.18],['winter',.24],['desert',.22]]);
/* 거점이 16개보다 많으면(특대형·초대형) 겹친 이름을 다른 이름으로 */
const OBJ_EXTRA=[['구청','gov','the district office'],['전화국','comm','the telephone exchange'],['정수장','power','the waterworks'],['조차장','rail','the rail yard'],
  ['물류 센터','supply','the logistics center'],['시립 박물관','archive','the museum'],['소방서','police','the fire station'],['대학병원','hosp','the university hospital'],
  ['군 사령부','gov','the garrison HQ'],['변전소','power','the substation'],['화물 터미널','supply','the cargo terminal'],['시민 회관','archive','the civic hall']];
{const _gm=genMap;genMap=function(seed,objPer,opt){opt=Object.assign({},opt||{});
  if(opt.layout==='rand')opt.layout=pickLayout2(seed);
  if(M2_LAYOUTS.includes(opt.layout)){if(opt.relief==='rand'||opt.layout==='canal')opt.relief=pickRelief2(seed,opt.layout);if(opt.clime==='rand')opt.clime=pickClime2(seed,opt.layout);}
  const out=_gm(seed,objPer,opt);
  const seen=new Set();let ei=0;for(const o of out.objs){if(seen.has(o.name)&&ei<OBJ_EXTRA.length)o.name=OBJ_EXTRA[ei++][0];seen.add(o.name);}
  return out;};}

/* ---------- 공통 ---------- */
// 도로 방향(ro)이 없는 도로 칸에 이웃으로 방향을 준다(h·v·x)
function m2RoadDirs(can,H){const R=(r,c)=>r>=0&&c>=0&&r<H&&c<H&&can[r][c]&&can[r][c].t==='road';
  for(let r=0;r<H;r++)for(let c=0;c<H;c++){const x=can[r][c];if(!x||x.t!=='road'||x.ro)continue;const h=R(r,c-1)||R(r,c+1),v=R(r-1,c)||R(r+1,c);x.ro=h&&v?'x':v?'v':'h';if(!x.rw)x.rw=1;}}
// 줄 무늬(가로·세로 길 자리): 2에서 시작해 간격 lo~hi로. 마지막 줄 H-1은 큰길
function m2Lines(rnd,H,lo,hi){const st=new Array(H).fill(0);st[2]=1;let i=2;while(true){i+=lo+Math.floor(rnd()*(hi-lo+1));if(i>H-lo+1)break;st[i]=1;}st[H-1]=2;return st;}
// 4방향으로 이어진 굵은 선(r0,c0)→(r1,c1)
function m2Line(r0,c0,r1,c1,put){const n=Math.ceil(Math.max(Math.abs(r1-r0),Math.abs(c1-c0))*2)+1;let pr=null,pc=null;
  for(let i=0;i<=n;i++){const r=Math.round(r0+(r1-r0)*i/n),c=Math.round(c0+(c1-c0)*i/n);if(pr!=null&&r!==pr&&c!==pc)put(pr,c);put(r,c);pr=r;pc=c;}}
const m2In=(H,r,c)=>r>=2&&c>=2&&r<H&&c<H;
// 덩어리(comp)의 테두리 상자
function m2Box(comp){let r0=1e9,r1=-1,c0=1e9,c1=-1;for(const [r,c] of comp){r0=Math.min(r0,r);r1=Math.max(r1,r);c0=Math.min(c0,c);c1=Math.max(c1,c);}return {r0,r1,c0,c1};}
// 집결지: 주차장·공터·풀밭
function m2Stage(can,H,rnd,kind){for(let r=0;r<H;r++)for(let c=0;c<H;c++)if(r<2||c<2){const p=rnd();
  can[r][c]=kind==='grass'?(p<.6?{t:'park',yard:1,mead:1}:p<.9?{t:'plaza',grav:1}:{t:'plaza',lot:1}):(p<.4?{t:'plaza',lot:1}:p<.7?{t:'plaza'}:p<.9?{t:'park'}:{t:'rubble'});}}
// 줄 무늬로 길을 깔고 교차로 사이 구간 일부를 지운다(T자 교차로·큰 블록)
function m2Grid(rnd,can,H,st,cut,mk,skip){
  for(let r=2;r<H;r++)for(let c=2;c<H;c++){if(can[r][c]||skip&&skip(r,c))continue;if(st[r]||st[c])can[r][c]=mk(st[r]&&st[c]?'x':st[r]?'h':'v',Math.max(st[r],st[c]));}
  const lines=[];for(let i=3;i<H-1;i++)if(st[i])lines.push(i);const cross=[];for(let j=2;j<H;j++)if(st[j])cross.push(j);
  for(const i of lines)for(const ax of [0,1])for(let q=0;q+1<cross.length;q++){if(rnd()>cut)continue;const a=cross[q]+1,b=cross[q+1];
    for(let j=a;j<b;j++){const [r,c]=ax?[j,i]:[i,j];const x=can[r][c];if(x&&x.t==='road'&&x.gl)can[r][c]=null;}}}

/* ---------- 교외 신도시 ---------- */
function genSuburb(seed,objPer,opt){const rnd=mulberry((seed^0x5b0b5)>>>0);const H=N/2,mid=(N-1)/2;const can=bmGrid(H);
  const isRd=(r,c)=>r>=0&&c>=0&&r<H&&c<H&&!!can[r][c]&&can[r][c].t==='road';
  m2Stage(can,H,rnd,'grass');
  // 쇼핑몰: 큰길 십자로 모퉁이. 2층 상가 건물과 넓은 주차장
  const Mz=Math.max(4,Math.round(H*.24)),m0=H-1-Mz;
  for(let r=m0;r<H-1;r++)for(let c=m0;c<H-1;c++)can[r][c]={t:'plaza',lot:1,dist:'mid'};
  {const b0=H-2-Math.max(2,Math.round(Mz*.55)),id=63*64;for(let r=b0;r<H-1;r++)for(let c=b0;c<H-1;c++)if(r<H-2||c<H-2)can[r][c]={t:'bldg',f:2,blk:id,ks:'shop',mall:1,dist:'mid'};
    can[H-2][H-2]={t:'plaza',court:1,dist:'mid'};}
  // 길: 십자 큰길(2칸) + 성긴 간선 격자. 간선 일부를 지워 큰 덩어리를 만든다
  for(let i=2;i<H;i++){can[H-1][i]={t:'road',rw:2,dist:'mid'};can[i][H-1]={t:'road',rw:2,dist:'mid'};}
  // 둥근 순환로: 격자 느낌을 깬다
  {const hyp=(r,c)=>Math.hypot(r-mid,c-mid),R1=H*(.55+rnd()*.12);for(let r=2;r<H;r++)for(let c=2;c<H;c++){if(Math.abs(hyp(r,c)-R1)>.74)continue;const x=can[r][c];if(x&&!(x.t==='road'))continue;can[r][c]={t:'road',ro:x?'x':'c',rw:1,dist:'res'};}}
  const st=m2Lines(rnd,H,6,8);st[H-1]=0;
  m2Grid(rnd,can,H,st,.42,(ro,rw)=>({t:'road',ro,rw:1,gl:1,dist:'res'}));
  // 덩어리 채우기
  let bid=0,school=0,church=0,park=0;
  const house=(r,c,id)=>{const q=rnd();can[r][c]=q<.14?{t:'bldg',f:2+(rnd()<.3?1:0),blk:id,ks:'villa',dist:'res'}:{t:'bldg',f:rnd()<.55?2:1,blk:id,ks:'house',dist:'res'};};
  for(const comp of bmComps(can,H,()=>true)){const n=comp.length;const B=m2Box(comp);const q=rnd();
    if(n<=3){comp.forEach(([r,c])=>can[r][c]=rnd()<.5?{t:'park',yard:1}:{t:'plaza',gas:1});continue;}
    if(n>=10&&n<=70&&!school&&q<.35){school=1;const id=(++bid)*64;comp.forEach(([r,c])=>can[r][c]=(r===B.r0||c===B.c0)?{t:'bldg',f:3,blk:id,ks:'school',dist:'res'}:{t:'plaza',field:1,dist:'res'});continue;}
    if(n>=8&&!park&&q<.5){park=1;const cr=(B.r0+B.r1)/2,cc=(B.c0+B.c1)/2;comp.forEach(([r,c])=>can[r][c]=Math.hypot(r-cr,c-cc)<1.2&&n>=12?{t:'water'}:{t:'park',dist:'res'});continue;}
    if(n>=6&&!church&&q<.62){church=1;const id=(++bid)*64;comp.forEach(([r,c],i)=>{const front=BM_NB.some(([a,b])=>isRd(r+a,c+b));can[r][c]=i<3&&front?{t:'bldg',f:i?2:5,blk:id,ks:'villa',lkc:'#c9c2b4',church:1,dist:'res'}:{t:'plaza',lot:1,dist:'res'};});continue;}
    // 막다른 길: 덩어리 가운데에서 가까운 길까지 곧게 뚫고, 끝은 돌림 광장
    if(n>=8){const cr=Math.round((B.r0+B.r1)/2),cc=Math.round((B.c0+B.c1)/2);const inC=new Set(comp.map(([r,c])=>r*H+c));
      let best=null;for(const [dr,dc] of BM_NB){const path=[];let r=cr,c=cc,ok=false;for(let s=0;s<H;s++){if(!inC.has(r*H+c))break;path.push([r,c]);if(isRd(r+dr,c+dc)){ok=true;break;}r+=dr;c+=dc;}
        if(ok&&path.length>=2&&(!best||path.length<best.p.length))best={p:path,dr,dc};}
      if(best){best.p.forEach(([r,c],i)=>can[r][c]=i===0?{t:'plaza',cds:1,dist:'res'}:{t:'road',ro:best.dc?'h':'v',rw:1,cds:1,dist:'res'});}}
    // 집: 길(막다른 길 포함)에 닿은 칸마다 한 채, 뒤는 마당
    for(const [r,c] of comp){const x=can[r][c];if(x){if(x.t==='road'||x.cds)continue;}const front=BM_NB.some(([a,b])=>isRd(r+a,c+b)||(m2In(H,r+a,c+b)&&can[r+a][c+b]&&can[r+a][c+b].cds));
      if(front&&rnd()<.88)house(r,c,(++bid)*64);else can[r][c]={t:'park',yard:1,dist:'res'};}}
  m2RoadDirs(can,H);bmOpenBldgs(can,H);
  const objs=bmObjs(rnd,can,H,objPer,x=>x.t==='bldg'||x.field||x.lot&&x.dist==='mid'||x.church);
  const out=bmAssemble(can,objs,H,rnd);out.feat={layout:'suburb'};return out;}

/* ---------- 공업 단지 ---------- */
function genIndustrial(seed,objPer,opt){const rnd=mulberry((seed^0x1d057)>>>0);const H=N/2,mid=(N-1)/2;const can=bmGrid(H);
  const isRd=(r,c)=>r>=0&&c>=0&&r<H&&c<H&&!!can[r][c]&&can[r][c].t==='road';const ch=(r,c)=>Math.max(Math.abs(r-mid),Math.abs(c-mid));
  m2Stage(can,H,rnd,'city');
  // 발전소: 한가운데. 터빈동(3층 공장), 냉각탑 2×2, 굴뚝, 콘크리트 마당
  const Pz=Math.max(3,Math.round(H*.17));
  for(let r=H-Pz;r<H;r++)for(let c=H-Pz;c<H;c++)can[r][c]={t:'plaza',pwr:1,dist:'ind'};
  can[H-1][H-1]={t:'plaza',pwr:1,stk:1,dist:'ind'};
  {const a=H-Pz;can[a][a]=Object.assign(can[a][a],{ctw:1});can[a][a+1]=Object.assign(can[a][a+1],{ctw:1});can[a+1][a]=Object.assign(can[a+1][a],{ctw:1});can[a+1][a+1]=Object.assign(can[a+1][a+1],{ctw:1});
    const id=62*64;for(const [r,c] of [[a,H-2],[a+1,H-2],[a,H-3]])if(r<H-1&&c>a+1)can[r][c]={t:'bldg',f:3,blk:id,ks:'factory',ind:1,dist:'ind'};}
  // 대로 격자: 큰길(2칸) 십자 + 간선. 발전소 둘레 길
  for(let i=2;i<H-Pz-1;i++){can[H-1][i]={t:'road',rw:2,dist:'ind'};can[i][H-1]={t:'road',rw:2,dist:'ind'};}
  for(let i=H-Pz-1;i<H;i++){can[H-Pz-1][i]={t:'road',rw:1,dist:'ind'};can[i][H-Pz-1]={t:'road',rw:1,dist:'ind'};}
  const st=m2Lines(rnd,H,6,9);st[H-1]=0;
  m2Grid(rnd,can,H,st,.22,(ro,rw)=>({t:'road',ro,rw:rnd()<.3?2:1,gl:1,dist:'ind'}));
  // 덩어리: 기름 탱크 단지, 컨테이너 야적장, 화물 인입선, 나머지는 창고·공장(구역 ind), 가장자리 몇 곳은 노동자 주택
  const dfn=comp=>{let d=0;for(const [r,c] of comp)d+=ch(r,c);d/=comp.length;const k=d/H;return {d:Math.min(1,.3+k*.7),dist:k>.82&&rnd()<.35?'res':'ind'};};
  let tk=0,cy=0,sp=0,bidN=0;FILL_BID=0;
  for(const comp of bmComps(can,H,()=>true)){const n=comp.length,B=m2Box(comp);const q=rnd();
    if(n>=6&&tk<2&&q<.22){tk++;const keep=new Set();for(const [r,c] of comp)if(r-B.r0<3&&c-B.c0<5){can[r][c]={t:'plaza',tkf:1,dist:'ind'};}else keep.add(r*H+c);   // 기름 탱크: 덩어리 한쪽 3×5칸
      for(const sub of bmComps(can,H,(r,c)=>keep.has(r*H+c)))fillComp(rnd,can,sub,++bidN,mid,H,isRd,dfn);continue;}
    if(n>=5&&cy<2&&q<.36){cy++;const cd=rnd()<.5?'h':'v';comp.forEach(([r,c])=>can[r][c]={t:'plaza',cy:1,cd,dist:'ind'});continue;}
    if(n>=10&&sp<2&&q<.55&&B.c1-B.c0>=4){sp++;const rr=B.r0+Math.floor((B.r1-B.r0)/2);   // 인입선: 덩어리를 가로지르는 철길, 양옆은 창고
      for(const [r,c] of comp)if(r===rr)can[r][c]={t:'plaza',spur:1,ro:'h',dist:'ind'};
      const rest=new Set(comp.filter(([r])=>r!==rr).map(([r,c])=>r*H+c));
      for(const sub of bmComps(can,H,(r,c)=>rest.has(r*H+c)))fillComp(rnd,can,sub,++bidN,mid,H,isRd,()=>({d:.5,dist:'ind'}));
      continue;}
    fillComp(rnd,can,comp,++bidN,mid,H,isRd,dfn);}
  for(let r=0;r<H;r++)for(let c=0;c<H;c++)if(!can[r][c])can[r][c]={t:'plaza',dist:'ind'};
  m2RoadDirs(can,H);bmOpenBldgs(can,H);
  const objs=bmObjs(rnd,can,H,objPer,x=>x.t==='bldg'||x.tkf||x.pwr&&!x.ctw&&!x.stk||x.spur);
  const out=bmAssemble(can,objs,H,rnd);out.feat={layout:'industrial'};return out;}

/* ---------- 성곽 구시가지 ---------- */
const OT_COLS=['#d8c9a8','#cbb48c','#e0d2b4','#b9a07a','#d4bfa0','#c2a98a','#e6dcc6','#b08f6a','#cfc2a6'];
function genOldtown(seed,objPer,opt){const rnd=mulberry((seed^0x01d70)>>>0);const H=N/2,mid=(N-1)/2;const can=bmGrid(H);
  const hyp=(r,c)=>Math.hypot(r-mid,c-mid);const isRd=(r,c)=>r>=0&&c>=0&&r<H&&c<H&&!!can[r][c]&&can[r][c].t==='road';
  m2Stage(can,H,rnd,'city');
  const Rw=H*(.6+rnd()*.08);                                        // 성벽 반지름
  // 대성당 광장
  for(let r=2;r<H;r++)for(let c=2;c<H;c++){const h=hyp(r,c);if(h<=.8)can[r][c]={t:'water',dist:'down'};else if(h<=Math.max(1.8,H*.09))can[r][c]={t:'plaza',sq:1,cob:1,dist:'down'};}
  // 성벽(두께 한 칸, 4방향으로 이어지게)과 그 바깥 순환 공원·순환로
  for(let r=2;r<H;r++)for(let c=2;c<H;c++){const d=hyp(r,c)-Rw;if(Math.abs(d)<=.72)can[r][c]={t:'plaza',cwl:1,dist:'mid'};}
  for(let r=2;r<H;r++)for(let c=2;c<H;c++){if(can[r][c])continue;const d=hyp(r,c)-Rw;if(d>.72&&d<=1.9)can[r][c]={t:'park',dist:'mid'};else if(d>1.9&&d<=2.65)can[r][c]={t:'road',ro:'c',rw:1,dist:'mid'};}
  // 성문 길: 집결지 → 성문 → 광장. 성문 칸은 길(cgt), 양옆 성벽 칸은 망루
  const gates=2+(H>=32?1:0);
  for(let i=0;i<gates;i++){const a=.32+(i+.5)/gates*(Math.PI/2-.64)+(rnd()-.5)*.14;   // 사분면 안 각도(0=왼쪽, π/2=위쪽)
    const t=Math.min((mid-2)/Math.max(.05,Math.sin(a)),(mid-2)/Math.max(.05,Math.cos(a)));
    const walk=[];m2Line(mid-Math.sin(a)*t,mid-Math.cos(a)*t,mid-Math.sin(a)*1.9,mid-Math.cos(a)*1.9,(r,c)=>{if(m2In(H,r,c))walk.push([r,c]);});
    for(const [r,c] of walk){const x=can[r][c];if(x&&(x.sq||x.t==='water'))continue;const gate=Math.abs(hyp(r,c)-Rw)<=.72;can[r][c]={t:'road',rw:1,cob:hyp(r,c)<Rw+.8?1:0,cgt:gate?1:0,dist:hyp(r,c)<Rw?'down':'mid'};}
    // 망루: 성문 양옆 성벽 칸
    for(const [r,c] of walk){if(!can[r][c].cgt)continue;for(const [a2,b2] of BM_NB){const y=m2In(H,r+a2,c+b2)&&can[r+a2][c+b2];if(y&&y.cwl&&!y.tower)can[r+a2][c+b2]={t:'bldg',f:3,blk:(61*64)+((r+a2)*H+c+b2)%60,ks:'villa',lkc:'#9c9384',tower:1,dist:'mid'};}}}
  // 성벽 둘레 망루 몇 개 더(높은 사격 자리)
  {const ring=[];for(let r=2;r<H;r++)for(let c=2;c<H;c++){const x=can[r][c];if(x&&x.cwl&&!x.tower&&BM_NB.every(([a,b])=>!(m2In(H,r+a,c+b)&&can[r+a][c+b]&&can[r+a][c+b].t==='bldg')))ring.push([r,c]);}
    for(let i=0;i<ring.length;i+=7){const [r,c]=ring[(i+Math.floor(rnd()*3))%ring.length];if(can[r][c].cwl)can[r][c]={t:'bldg',f:3,blk:(61*64)+(r*H+c)%60,ks:'villa',lkc:'#9c9384',tower:1,dist:'mid'};}}
  // 성 안 골목: 길에서 길로 구불구불
  const lanes=Math.round(H*.18);for(let i=0;i<lanes;i++){const a=rnd()*Math.PI/2,rr=Rw*(.35+rnd()*.5);const r0=Math.round(mid-Math.sin(a)*rr),c0=Math.round(mid-Math.cos(a)*rr);
    if(!m2In(H,r0,c0)||can[r0][c0])continue;const b=a+(rnd()<.5?1:-1)*(.5+rnd()*.6),r2=Math.round(mid-Math.sin(b)*rr*(.8+rnd()*.4)),c2=Math.round(mid-Math.cos(b)*rr*(.8+rnd()*.4));
    bmTrack(rnd,can,H,r0,c0,r2,c2,()=>({t:'road',rw:1,cob:1,al:1,dist:'down'}));}
  for(let r=2;r<H;r++)for(let c=2;c<H;c++){const x=can[r][c];if(x&&x.t==='road'&&x.al&&hyp(r,c)>=Rw-.72)can[r][c]=Math.abs(hyp(r,c)-Rw)<=.72?{t:'plaza',cwl:1,dist:'mid'}:null;}   // 골목은 성벽을 넘지 않는다
  // 성 밖: 근대 시가지 격자
  const st=m2Lines(rnd,H,5,7);
  m2Grid(rnd,can,H,st,.35,(ro,rw)=>({t:'road',ro,rw,gl:1,dist:'mid'}),(r,c)=>hyp(r,c)<Rw+2.7);
  // 덩어리 채우기: 성 안은 빽빽한 옛집, 가운데 대성당. 성 밖은 보통 도시
  let bid=0,cath=false;FILL_BID=0;const dfn=comp=>{let d=0;for(const [r,c] of comp)d+=hyp(r,c);d/=comp.length;return {d:Math.min(1,d/H),dist:d<H*1.05?'mid':'res'};};
  for(const comp of bmComps(can,H,()=>true)){let inside=0;for(const [r,c] of comp)if(hyp(r,c)<Rw)inside++;
    if(inside<comp.length/2){fillComp(rnd,can,comp,++bid,mid,H,isRd,dfn);continue;}
    for(const P of bmGrow(rnd,comp,H,1,4)){const id=(++bid)*64;
      if(!cath&&P.length>=2&&P.some(([r,c])=>hyp(r,c)<H*.2)){cath=true;let ti=0,bd=1e9;P.forEach(([r,c],i)=>{const d=hyp(r,c);if(d<bd){bd=d;ti=i;}});
        P.forEach(([r,c],i)=>can[r][c]={t:'bldg',f:i===ti?8:4,blk:id,ks:'villa',lkc:'#a9a294',church:1,dist:'down'});continue;}
      if(rnd()<.08){P.forEach(([r,c])=>can[r][c]={t:'plaza',court:1,cob:1,dist:'down'});continue;}
      const f=3+Math.floor(rnd()*3),col=OT_COLS[Math.floor(rnd()*OT_COLS.length)],ks=rnd()<.3?'shop':'villa';P.forEach(([r,c])=>can[r][c]={t:'bldg',f,blk:id,ks,lkc:col,old:1,dist:'down'});}}
  for(let r=0;r<H;r++)for(let c=0;c<H;c++)if(!can[r][c])can[r][c]={t:'plaza',dist:'mid'};
  m2RoadDirs(can,H);bmOpenBldgs(can,H);
  const objs=bmObjs(rnd,can,H,objPer,x=>(x.t==='bldg'&&!x.tower)||x.sq);
  const out=bmAssemble(can,objs,H,rnd);out.feat={layout:'oldtown',wall:{R:Rw}};return out;}

/* ---------- 운하 도시 ---------- */
const CN_COLS=['#a8644a','#b87a5a','#8a5a46','#c9a27e','#e6dfd2','#9a6a52','#d0b090','#7a5446','#b5866a','#efe8dc'];
function genCanal(seed,objPer,opt){const rnd=mulberry((seed^0xca7a1)>>>0);const H=N/2,mid=(N-1)/2;const can=bmGrid(H);
  const hyp=(r,c)=>Math.hypot(r-mid,c-mid);const isRd=(r,c)=>r>=0&&c>=0&&r<H&&c<H&&!!can[r][c]&&can[r][c].t==='road';
  m2Stage(can,H,rnd,'city');
  // 운하: 3.5칸 남짓 간격의 동심원. 맨 바깥은 지도 크기에 따라
  const rings=[];for(let R=4.6+rnd()*.6;R<H*.88&&rings.length<4;R+=3.9+rnd()*.5)rings.push(R);
  for(let r=2;r<H;r++)for(let c=2;c<H;c++){const h=hyp(r,c);
    if(h<=Math.max(1.8,H*.08)){can[r][c]={t:'plaza',sq:1,cob:1,dist:'down'};continue;}
    for(const R of rings){const d=Math.abs(h-R);if(d<=.72){can[r][c]={t:'water',sea:1,cnw:1,dist:'mid'};break;}if(d<=1.62){can[r][c]={t:'road',ro:'c',rw:1,cq:1,dist:'mid'};break;}}}
  // 곧은 길: 십자 큰길 + 사분면마다 가로·세로 하나씩. 운하를 지나는 칸은 다리
  const lines=[['r',H-1],['c',H-1],['r',Math.round(mid-rings[0]-2.4-rnd()*2)],['c',Math.round(mid-rings[Math.min(1,rings.length-1)]+.5+rnd()*1.5)]];
  for(const [ax,i] of lines){if(i<2||i>=H)continue;for(let j=2;j<H;j++){const [r,c]=ax==='r'?[i,j]:[j,i];const x=can[r][c];if(x&&x.sq)continue;
      const w=i===H-1?2:1;if(x&&x.cnw)can[r][c]={t:'road',ro:ax==='r'?'h':'v',rw:w,br:1,cnl:1,dist:'mid'};else if(x&&x.cq)can[r][c]={t:'road',ro:'x',rw:w,cq:1,dist:'mid'};else can[r][c]={t:'road',ro:ax==='r'?'h':'v',rw:w,dist:'mid'};}}
  // 운하 고리 바깥: 근대 시가지 격자
  {const Ro=rings[rings.length-1]+1.7;const st=m2Lines(rnd,H,5,7);m2Grid(rnd,can,H,st,.3,(ro,rw)=>({t:'road',ro,rw,gl:1,dist:'mid'}),(r,c)=>hyp(r,c)<Ro+.6);}
  // 덩어리 채우기: 운하 사이는 좁고 높은 운하 집이 줄지어 서고 뒤는 정원. 맨 바깥은 보통 도시
  let bid=0;FILL_BID=0;const Rout=rings[rings.length-1]+1.7;
  const dfn=comp=>({d:.6,dist:'res'});
  for(const comp of bmComps(can,H,()=>true)){let out=0;for(const [r,c] of comp)if(hyp(r,c)>Rout)out++;
    if(out>comp.length/2&&comp.length>6){fillComp(rnd,can,comp,++bid,mid,H,isRd,dfn);continue;}
    const inner=comp.every(([r,c])=>hyp(r,c)<rings[0]);
    if(inner&&comp.length>=3){const id=(++bid)*64;comp.forEach(([r,c])=>can[r][c]={t:'bldg',f:4,blk:id,ks:'office',lkc:'#cfc4ae',palace:1,dist:'down'});continue;}
    for(const [r,c] of comp){const front=BM_NB.some(([a,b])=>isRd(r+a,c+b));
      if(front||rnd()<.25){const f=4+Math.floor(rnd()*2)-(rnd()<.15?1:0);can[r][c]={t:'bldg',f,blk:(++bid)*64,ks:rnd()<.25?'shop':'villa',lkc:CN_COLS[Math.floor(rnd()*CN_COLS.length)],gable:1,dist:'mid'};}
      else can[r][c]=rnd()<.8?{t:'park',yard:1,dist:'mid'}:{t:'plaza',court:1,dist:'mid'};}}
  for(let r=0;r<H;r++)for(let c=0;c<H;c++)if(!can[r][c])can[r][c]={t:'plaza',dist:'mid'};
  m2RoadDirs(can,H);bmOpenBldgs(can,H);
  const objs=bmObjs(rnd,can,H,objPer,x=>x.t==='bldg'||x.sq);
  const out=bmAssemble(can,objs,H,rnd);out.feat={layout:'canal',canal:{rings}};return out;}

/* ---------- 비행장 ---------- */
function genAirfield(seed,objPer,opt){const rnd=mulberry((seed^0xa1f1d)>>>0);const H=N/2,mid=(N-1)/2;const can=bmGrid(H);
  const isRd=(r,c)=>r>=0&&c>=0&&r<H&&c<H&&!!can[r][c]&&can[r][c].t==='road';
  m2Stage(can,H,rnd,'grass');
  // 활주로: 한가운데 십자(정준 사분면의 맨 아래 줄·맨 오른쪽 줄이 네 벌 모여 폭 2칸 활주로 두 개가 된다)
  for(let i=3;i<H;i++){can[H-1][i]={t:'plaza',rwy:1,ro:'h',thr:i===3?1:0};can[i][H-1]={t:'plaza',rwy:1,ro:'v',thr:i===3?1:0};}
  can[H-1][H-1]={t:'plaza',rwy:1,ro:'x'};
  for(let i=2;i<3;i++){can[H-1][i]={t:'park',yard:1,mead:1};can[i][H-1]={t:'park',yard:1,mead:1};}
  // 유도로: 활주로와 나란히(3칸 떨어져) L자, 끝마다 활주로로 이어진다
  const T=H-5,t0=5;
  for(let i=t0;i<H-1;i++){if(!can[T][i])can[T][i]={t:'plaza',twy:1,ro:'h'};if(!can[i][T])can[i][T]={t:'plaza',twy:1,ro:'v'};}
  can[T][T]={t:'plaza',twy:1,ro:'x'};
  for(const s of [t0,Math.round((t0+T)/2)])for(let j=T+1;j<H-1;j++){if(!can[j][s])can[j][s]={t:'plaza',twy:1,ro:'v'};if(!can[s][j])can[s][j]={t:'plaza',twy:1,ro:'h'};}
  // 계류장(유도로 안쪽 네모)과 주기한 비행기, 그 바깥에 격납고 줄·관제탑·터미널, 연료 탱크
  const A=Math.max(3,Math.round(H*.18)),a0=T-A;   // 계류장 a0..T-1
  for(let r=a0;r<T;r++)for(let c=a0;c<T;c++)can[r][c]={t:'plaza',apr:1,dist:'ind'};
  let bid=0;const hg=(r,c,id,f,ks,o)=>{if(m2In(H,r,c)&&!can[r][c])can[r][c]=Object.assign({t:'bldg',f,blk:id,ks,dist:'ind'},o||{});};
  {const r=a0-1;let c=a0;while(c+1<T){const id=(++bid)*64,w=c+2<T&&rnd()<.6?2:1;for(let k=0;k<w;k++){hg(r,c+k,id,2,'ware',{lkc:'#8a8f93',hgr:1});hg(r-1,c+k,id,2,'ware',{lkc:'#8a8f93',hgr:1});}c+=w+1;}}   // 북쪽 격납고 줄
  {const c=a0-1;let r=a0;while(r+1<T){const id=(++bid)*64,w=r+2<T&&rnd()<.6?2:1;for(let k=0;k<w;k++){hg(r+k,c,id,2,'ware',{lkc:'#7d8670',hgr:1});hg(r+k,c-1,id,2,'ware',{lkc:'#7d8670',hgr:1});}r+=w+1;}}   // 서쪽 격납고 줄
  hg(a0-2,a0-2,(++bid)*64,6,'office',{lkc:'#d8d4c8',atc:1});hg(a0-1,a0-1,bid*64,2,'office',{lkc:'#d8d4c8',atc:1});   // 관제탑
  {const id=(++bid)*64;for(let k=-1;k<=1;k++)hg(a0-1+k,a0-3,id,3,'office',{lkc:'#c8c2b6'});}   // 터미널
  // 연료 탱크 단지(2×2), 막사
  {const r=Math.max(3,a0-6),c=Math.max(3,T-3);for(const [a,b] of [[0,0],[0,1],[1,0],[1,1]])if(m2In(H,r+a,c+b)&&!can[r+a][c+b])can[r+a][c+b]={t:'plaza',tkf:1,dist:'ind'};}
  {const r=Math.max(3,a0-6),c=Math.max(3,Math.round(a0/2));const id=(++bid)*64;for(let k=0;k<3;k++)hg(r,c+k,id,2,'panel',{lkc:'#a8a48e'});const id2=(++bid)*64;for(let k=0;k<3;k++)hg(r+2,c+k,id2,2,'panel',{lkc:'#a8a48e'});}
  // 정비 도로: 집결지에서 격납고 앞까지
  for(const s of [0,1]){const [r,c]=s?[2,3+Math.floor(rnd()*Math.max(1,a0-4))]:[3+Math.floor(rnd()*Math.max(1,a0-4)),2];bmTrack(rnd,can,H,r,c,a0-3,a0-3,()=>({t:'road',rw:1,rural:1}));}
  // 나머지: 풀밭, 군데군데 덤불·숲·흙 둔덕
  for(let r=2;r<H;r++)for(let c=2;c<H;c++){if(can[r][c])continue;const q=rnd();can[r][c]=q<.82?{t:'park',yard:1,mead:1}:q<.93?{t:'park',wild:1}:{t:'rubble',rock:1};}
  // 활주로에 붙은 칸은 풀밭(덤불·바위가 붙지 않게)
  for(let r=2;r<H;r++)for(let c=2;c<H;c++){const x=can[r][c];if((x.wild||x.rock)&&BM_NB.some(([a,b])=>m2In(H,r+a,c+b)&&(can[r+a][c+b].rwy||can[r+a][c+b].twy||can[r+a][c+b].apr)))can[r][c]={t:'park',yard:1,mead:1};}
  bmRoadDirs(can,H);bmOpenBldgs(can,H);
  const objs=bmObjs(rnd,can,H,objPer,x=>x.t==='bldg'||x.apr||x.tkf);
  const out=bmAssemble(can,objs,H,rnd);out.feat={layout:'airfield'};return out;}
Object.assign(BM_GEN,{suburb:genSuburb,industrial:genIndustrial,oldtown:genOldtown,canal:genCanal,airfield:genAirfield});

/* ---------- 소품: 성벽·기름 탱크·냉각탑·굴뚝·비행기·화차·운하 가로수·다리 난간 ---------- */
const PLANE_COLS=['#6a6e66','#7d8285','#56604a','#8e9294','#4c5658'];
{const _gp=genProps;genProps=function(){let P=_gp();if(!G||!G.map||!G.feat||!M2_LAYOUTS.includes(G.feat.layout))return P;const sd=(G.seed|0)%100000;const Hh=(k,s)=>propHash(k+sd*7919,s);
  const M=G.map,at=(r,c)=>inb(r,c)?M[r][c]:null;
  // 활주로·계류장·성벽 자리·탱크 단지·발전소 마당에는 도시 소품을 두지 않는다
  P=P.filter(p=>{const r=Math.floor(p.z),c=Math.floor(p.x);const x=at(r,c);if(!x)return true;if(x.rwy||x.twy||x.apr||x.cwl||x.tkf||x.pwr||x.spur)return false;
    if(x.cnl&&(p.k==='car'||p.k==='barrier'||p.k==='bin'))return false;if(x.cob&&p.k==='light')return false;return true;});
  const done=new Set();
  // 여러 칸짜리 소품은 칸 덩어리의 가운데에
  const blob=(r,c,f)=>{const out=[],q=[[r,c]];done.add(key(r,c));while(q.length){const [a,b]=q.pop();out.push([a,b]);for(const [p,s] of BM_NB){const y=at(a+p,b+s);if(y&&f(y)&&!done.has(key(a+p,b+s))){done.add(key(a+p,b+s));q.push([a+p,b+s]);}}}return out;};
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=M[r][c],k=key(r,c),cx=c+.5,cz=r+.5;
    if(x.ctw&&!done.has(k)){const b=blob(r,c,y=>y.ctw);let sx=0,sz=0;for(const [a,q] of b){sx+=q+.5;sz+=a+.5;}P.push({k:'ctower',x:sx/b.length,z:sz/b.length,ry:0});}
    if(x.stk&&!done.has(k)){const b=blob(r,c,y=>y.stk);let sx=0,sz=0;for(const [a,q] of b){sx+=q+.5;sz+=a+.5;}P.push({k:'stack',x:sx/b.length,z:sz/b.length,ry:0});}
    if(x.tkf){P.push({k:'otank',x:cx+(Hh(k,901)-.5)*.08,z:cz+(Hh(k,902)-.5)*.08,ry:0,h:.42+Hh(k,903)*.3,col:Hh(k,904)<.7?'#cfd0cc':'#9aa09a',burnt:Hh(k,905)<.1});}
    if(x.apr&&r%2===0&&c%2===0&&Hh(k,910)<.75){const ry=[0,Math.PI/2,Math.PI,-Math.PI/2][Math.floor(Hh(k,911)*4)];P.push({k:'plane',x:cx,z:cz,ry,col:PLANE_COLS[Math.floor(Hh(k,912)*PLANE_COLS.length)],big:Hh(k,913)<.3,burnt:Hh(k,914)<.12});}
    if(x.spur){const h=x.ro!=='v';if(Hh(k,920)<.45)P.push({k:'wagon',x:cx,z:cz,ry:h?0:Math.PI/2,col:['#5a3a2e','#3e4a52','#6a5a44','#4a4e44'][Math.floor(Hh(k,921)*4)],loco:false,burnt:Hh(k,922)<.1});}
    if(x.cq&&x.t==='road'&&!x.cnl){// 운하 가로수: 물 쪽 길섶에
      BM_NB.forEach(([a,b],si)=>{const y=at(r+a,c+b);if(!y||!y.cnw)return;if(Hh(k,930+si)<.55)P.push({k:'ctree',x:cx+b*.36,z:cz+a*.36,s:.5+Hh(k,935+si)*.2,ry:Hh(k,940+si)*6.28});});}
    if(x.cnl){const h=x.ro!=='v';for(const s of [-1,1])P.push({k:'rail2',x:cx+(h?0:s*.46),z:cz+(h?s*.46:0),ry:h?0:Math.PI/2});}}
  // 성벽: 성 둘레 원을 따라 짧은 토막. 길(성문)·망루 칸 위에는 두지 않는다
  if(G.feat.wall){const R=G.feat.wall.R,cx0=N/2,cz0=N/2,n=Math.max(48,Math.round(2*Math.PI*R/.5));
    for(let i=0;i<n;i++){const a0=i/n*Math.PI*2,a1=(i+1)/n*Math.PI*2;const p0=[cx0+Math.cos(a0)*R,cz0+Math.sin(a0)*R],p1=[cx0+Math.cos(a1)*R,cz0+Math.sin(a1)*R];
      const pm=[(p0[0]+p1[0])/2,(p0[1]+p1[1])/2];const bad=[p0,pm,p1].some(([x,z])=>{const y=at(Math.floor(z),Math.floor(x));return !y||y.t==='road'||y.t==='bldg';});if(bad)continue;
      P.push({k:'cwall',x:pm[0],z:pm[1],ry:-Math.atan2(p1[1]-p0[1],p1[0]-p0[0]),len:Math.hypot(p1[0]-p0[0],p1[1]-p0[1])+.04});}}
  return P;};}
{const _pc=propCovers;propCovers=function(){const C=_pc();if(!C||!G.props||!G.feat||!M2_LAYOUTS.includes(G.feat.layout))return C;let mx=PLH_MAX;
  for(const p of G.props){
    if(p.k==='cwall'){C.push({x:p.x,z:p.z,r:.2,kind:'cwall',lh:2.1});mx=Math.max(mx,2.1);}
    else if(p.k==='otank'){const lh=p.h/FLOOR_H;for(const [a,b] of [[0,0],[-.18,0],[.18,0],[0,-.18],[0,.18]])C.push({x:p.x+a,z:p.z+b,r:.2,kind:'otank',lh});mx=Math.max(mx,lh);}
    else if(p.k==='ctower'){for(let a=0;a<8;a++)C.push({x:p.x+Math.cos(a*Math.PI/4)*.6,z:p.z+Math.sin(a*Math.PI/4)*.6,r:.45,kind:'ctower',lh:9});C.push({x:p.x,z:p.z,r:.5,kind:'ctower',lh:9});mx=Math.max(mx,9);}
    else if(p.k==='stack'){C.push({x:p.x,z:p.z,r:.16,kind:'stack',lh:9});mx=Math.max(mx,9);}
    else if(p.k==='plane'){const ax=Math.cos(p.ry),az=-Math.sin(p.ry);for(const s of [-.25,0,.25])C.push({x:p.x+ax*s,z:p.z+az*s,r:.1,kind:p.burnt?'wreck':'plane',lh:.9});}}
  PLH_MAX=mx;return C;};}
/* 지금 지도 이름 */
{const _bn=bmMapName;bmMapName=function(){const f=G&&G.feat;if(!f||!M2_NAMES[f.layout])return _bn();const s=_bn();return M2_NAMES[f.layout]+s.slice(s.indexOf(' · ')>=0?s.indexOf(' · '):s.length);};}
