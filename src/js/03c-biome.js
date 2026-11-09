/* ===================== 지도 다양화: 농촌·숲·항구 도시, 계절·기후 =====================
   도시 배치(LAYOUTS)에 세 가지를 더한다. 셋 다 대칭 도시처럼 정준 사분면을 만들어 90도씩 돌려 놓으므로 네 세력이 공정하다.
   - country 농촌·보카주: 가운데 마을(교회·집·좁은 고리길), 둘레는 생울타리(보카주)로 갈린 밭·목초지·과수원·작은 숲·농가. 흙길이 마을로 모인다.
   - forest  숲: 거의 모두 숲. 벌목길, 빈터, 호수, 바위 언덕, 제재소, 가운데 산골 마을.
   - port    항구 도시: 한가운데 네모난 내항(바다), 둘레 부두(안벽 마당·잔교·크레인·정박한 배), 그 바깥 컨테이너 야적장과 창고, 더 바깥은 도시.
   rand = 씨앗으로 배치·고저차·기후를 고른다(같은 씨앗이면 언제나 같은 지도).
   기후(feat.clime): temp 지금 모습 | autumn 가을 | winter 겨울(눈, 길 밖 이동이 느리다) | desert 사막(모래빛 도시, 평지붕).
   칸 표시(새로 쓰는 것): crop(밭 1 밀·2 그루터기·3 푸른 작물·4 갈아엎은 땅, cd 고랑 방향), mead(목초지), orch(과수원), wild(숲),
   pc(생울타리로 갈린 필지 번호), dirt(흙길), rural(시골 포장도로), fy(농가 마당), grav(자갈 마당),
   sea(바다, t:water), quay(안벽 마당), pier(잔교), crane(크레인 자리), berth(배 정박 자리 번호), cy(컨테이너 야적장), logs(통나무 야적장), rock(바위).
   해안 상륙 캠페인(10b·10c)도 sea·sand·pier 표시를 같은 뜻으로 쓴다. */
Object.assign(LAYOUTS,{country:{n:'농촌 · 보카주 (생울타리 들판과 마을)'},forest:{n:'숲 (벌목길·호수·산골 마을)'},port:{n:'항구 도시 (가운데 내항·부두·컨테이너)'},rand:{n:'무작위'}});
const CLIMES={temp:{n:'온대 (기본)'},autumn:{n:'가을'},winter:{n:'겨울 (눈)'},desert:{n:'사막'}};
const BM_LAYOUTS=['sym','river','country','forest','port'];
/* 씨앗으로 고르기: 가중치 목록 [[값, 무게]] */
function bmPick(seed,salt,ws){const tot=ws.reduce((s,w)=>s+w[1],0);const x=propHash((seed>>>0)%2147483647,salt)*tot;let a=0;for(const [k,w] of ws){a+=w;if(x<a)return k;}return ws[ws.length-1][0];}
const pickLayout=seed=>bmPick(seed,911,[['sym',.22],['river',.18],['country',.22],['forest',.15],['port',.23]]);
const pickRelief=(seed,lay)=>bmPick(seed,912,lay==='forest'?[['hills',.6],['steep',.4]]:lay==='port'?[['flat',.55],['hills',.45]]:lay==='country'?[['flat',.35],['hills',.65]]:[['flat',.5],['hills',.35],['steep',.15]]);
const pickClime=(seed,lay)=>bmPick(seed,913,lay==='forest'||lay==='country'?[['temp',.4],['autumn',.3],['winter',.3]]:[['temp',.38],['autumn',.12],['winter',.22],['desert',.28]]);
/* 무작위·기후를 풀어 배치별 생성기로 보낸다. 바깥에서 05l-objs가 거점 이름을 붙이고, 05l2가 그 이름을 땅에 맞게 바꾼다 */
{const _gm=genMap;genMap=function(seed,objPer,opt){opt=Object.assign({},opt||{});
  if(opt.layout==='rand')opt.layout=pickLayout(seed);
  if(opt.relief==='rand')opt.relief=pickRelief(seed,opt.layout);
  const clime=opt.clime==='rand'?pickClime(seed,opt.layout):CLIMES[opt.clime]?opt.clime:'temp';
  const gen=BM_GEN[opt.layout];const out=gen?terrFinish(gen(seed,objPer,opt),seed,opt):_gm(seed,objPer,opt);
  out.feat.clime=clime;
  if(clime==='desert')for(const row of out.map)for(const x of row)if(x.ks==='house')x.ks='villa';   // 사막 집은 평지붕
  return out;};}
/* 고저차: 항구 내항과 부두는 바다 높이(0). 안벽에서 6칸에 걸쳐 언덕으로 올라간다 */
{const _gr=genRelief;genRelief=function(m,rnd,relief,sym,feat){const E=_gr(m,rnd,relief,sym,feat);if(!E||!feat||!feat.basin)return E;const W=N+1,b=feat.basin,c0=N/2;
  for(let j=0;j<W;j++)for(let i=0;i<W;i++){const d=Math.max(Math.abs(i-c0),Math.abs(j-c0))-b.R-3.5;E[j*W+i]*=sstep(0,6,d);}return E;};}

/* ---------- 공통 ---------- */
const bmGrid=H=>{const a=[];for(let r=0;r<H;r++)a.push(new Array(H).fill(null));return a;};
const BM_NB=[[-1,0],[1,0],[0,-1],[0,1]];
// 필지 자라기(growPieces와 같지만 엔진마다 결과가 같도록 shuf를 쓴다)
function bmGrow(rnd,cells,H,lo,hi){const free=new Set(cells.map(([r,c])=>r*H+c));const out=[];
  for(const [r0,c0] of shuf(cells.slice(),rnd)){const s0=r0*H+c0;if(!free.has(s0))continue;const target=lo+Math.floor(rnd()*(hi-lo+1));
    const got=[s0];free.delete(s0);const fr=[s0];
    while(got.length<target&&fr.length){const i=Math.floor(rnd()*fr.length);const v=fr[i];const r=Math.floor(v/H),c=v%H;
      const nb=BM_NB.map(([a,b])=>(r+a)*H+c+b).filter(x=>free.has(x)&&Math.abs(Math.floor(x/H)-r)+Math.abs(x%H-c)===1);
      if(!nb.length){fr.splice(i,1);continue;}const w=nb[Math.floor(rnd()*nb.length)];free.delete(w);got.push(w);fr.push(w);}
    out.push(got.map(v=>[Math.floor(v/H),v%H]));}
  return out;}
// 비어 있는(null) 칸 덩어리. ok(r,c)가 참인 칸만
function bmComps(can,H,ok){const seen=new Set(),out=[];
  for(let r=2;r<H;r++)for(let c=2;c<H;c++){if(can[r][c]||seen.has(r*H+c)||!ok(r,c))continue;const comp=[],q=[[r,c]];seen.add(r*H+c);
    while(q.length){const [a,b]=q.pop();comp.push([a,b]);for(const [p,o] of BM_NB.map(([x,y])=>[a+x,b+y])){if(p<2||o<2||p>=H||o>=H||can[p][o]||seen.has(p*H+o)||!ok(p,o))continue;seen.add(p*H+o);q.push([p,o]);}}
    out.push(comp);}
  return out;}
// 흙길: 출발점에서 목표 쪽으로 구불구불 걸어가 길에 닿으면 멈춘다
function bmTrack(rnd,can,H,r,c,tr,tc,mk){for(let s=0;s<H*3;s++){if(r<0||c<0||r>=H||c>=H)return;const x=can[r][c];if(x&&x.t==='road'&&s>0)return;
    if(!x||x.t!=='water')can[r][c]=mk();
    const dr=Math.sign(tr-r),dc=Math.sign(tc-c);if(!dr&&!dc)return;
    if(rnd()<.68){if(dr&&(!dc||Math.abs(tr-r)*rnd()>Math.abs(tc-c)*rnd()))r+=dr;else c+=dc;}else{if(rnd()<.5&&dc)c+=dc;else if(dr)r+=dr;else c+=dc;}}}
// 도로 방향(ro)을 이웃으로 정한다
function bmRoadDirs(can,H){const R=(r,c)=>r>=0&&c>=0&&r<H&&c<H&&can[r][c]&&can[r][c].t==='road';
  for(let r=0;r<H;r++)for(let c=0;c<H;c++){const x=can[r][c];if(!x||x.t!=='road'||!(x.dirt||x.rural))continue;const h=R(r,c-1)||R(r,c+1),v=R(r-1,c)||R(r+1,c);x.ro=h&&v?'x':v?'v':'h';}}
// 다른 건물에 갇혀 바깥으로 통하는 면이 없는 건물은 마당으로 (문이 바깥에만 나기 때문)
function bmOpenBldgs(can,H){const blks=new Map();for(let r=0;r<H;r++)for(let c=0;c<H;c++){const x=can[r][c];if(!x||x.t!=='bldg')continue;if(!blks.has(x.blk))blks.set(x.blk,[]);blks.get(x.blk).push([r,c]);}
  for(const cells of blks.values()){const open=cells.some(([r,c])=>BM_NB.some(([a,b])=>{const R=r+a,C=c+b;if(R<0||C<0||R>=H||C>=H)return true;const y=can[R][C];return !y||(y.t!=='bldg'&&y.t!=='water');}));
    if(!open)cells.forEach(([r,c])=>{can[r][c]={t:'plaza',court:1,dist:can[r][c].dist};});}}
// 거점: 정준 사분면에서 서로 떨어진 칸
function bmObjs(rnd,can,H,objPer,ok){const objs=[];let tries=0;const gap=Math.max(4,Math.round(H/4));
  while(objs.length<objPer&&tries++<2000){const r=3+Math.floor(rnd()*(H-4)),c=3+Math.floor(rnd()*(H-4));const x=can[r][c];if(!x||x.t==='road'||x.t==='water'||!ok(x,r,c))continue;
    if(objs.some(([a,b])=>dist(a,b,r,c)<(tries<1200?gap:3)))continue;if(Math.min(H-1-r,H-1-c)<1&&objs.length)continue;
    if(x.t==='bldg')x.f=Math.max(x.f,2);else{x.t='plaza';delete x.lot;delete x.crop;delete x.mead;delete x.wild;delete x.orch;delete x.yard;}x.lm=1;objs.push([r,c]);}
  return objs;}
/* 정준 사분면 → 90도씩 돌린 네 벌. 블록·필지·정박 번호는 ×4+k로 서로 다르게, 방향 표시(ro·cd)는 홀수 회전에서 바꾼다 */
function bmAssemble(can,objs,H,rnd){const m=[];for(let r=0;r<N;r++)m[r]=[];
  const rot=(r,c,k)=>{for(let j=0;j<k;j++){const t=r;r=c;c=N-1-t;}return [r,c];};const sw=v=>v==='h'?'v':v==='v'?'h':v;
  for(let r=0;r<H;r++)for(let c=0;c<H;c++){const x=can[r][c];for(let k=0;k<4;k++){const [a,b]=rot(r,c,k);const y={...x,owner:null,obj:null};
    for(const f of ['blk','pc','berth'])if(y[f]!=null)y[f]=y[f]*4+k;if(k%2){if(y.ro)y.ro=sw(y.ro);if(y.cd)y.cd=sw(y.cd);}if(y.dd&&k%2)y.dd=-y.dd;
    if(y.face!=null)y.face=(y.face+k)%4;m[a][b]=y;}}
  const names=shuf(OBJ_NAMES.slice(),rnd);let oi=0;const list=[];
  for(const [r,c] of objs)for(let k=0;k<4;k++){const [a,b]=rot(r,c,k);m[a][b].obj=oi;list.push({r:a,c:b,name:names[oi%names.length]});oi++;}
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=m[r][c];if(x.t==='bldg'){x.bmax=8+x.f*3;x.bhp=x.bmax;}x.smoke=0;}
  return {map:m,objs:list};}

/* ---------- 농촌 · 보카주 ---------- */
const BM_WOOD=['#6b5038','#7a5a40','#5a4a3a','#806650','#8a7055'];          // 통나무집·헛간 벽
const BM_BARN=['#7a3a2e','#6e4434','#8a4a36','#5f5550','#7b6a58'];         // 붉은 헛간, 낡은 판자
function genCountry(seed,objPer,opt){const rnd=mulberry((seed^0xc0417)>>>0);const H=N/2,mid=(N-1)/2;const can=bmGrid(H);
  const hyp=(r,c)=>Math.hypot(r-mid,c-mid);const isRd=(r,c)=>r>=0&&c>=0&&r<H&&c<H&&!!can[r][c]&&can[r][c].t==='road';
  const crop=()=>({t:'plaza',crop:1+Math.floor(rnd()*4),cd:rnd()<.5?'h':'v'});
  // 집결지: 풀밭·밭·흙 마당
  for(let r=0;r<H;r++)for(let c=0;c<H;c++)if(r<2||c<2){const p=rnd();can[r][c]=p<.5?{t:'park',yard:1,mead:1}:p<.85?crop():{t:'plaza',fy:1};}
  // 큰길: 가장자리에서 마을 한가운데로(네 벌이 바람개비 모양 십자로가 된다)
  for(let c=0;c<H;c++)can[H-1][c]={t:'road',ro:'h',rw:1,rural:1};
  const Rv=H*(.34+rnd()*.1);                                               // 마을 반지름
  const R1=Rv*(.55+rnd()*.1);for(let r=2;r<H;r++)for(let c=2;c<H;c++)if(Math.abs(hyp(r,c)-R1)<=.72)can[r][c]={t:'road',ro:'x',rw:1,rural:1};   // 마을 고리길
  for(let r=2;r<H;r++)for(let c=2;c<H;c++)if(hyp(r,c)<=1.6)can[r][c]={t:'plaza',sq:1,dist:'mid'};                  // 교회 앞 광장
  // 흙길: 집결지 가장자리에서 마을로 두세 갈래
  const nt=2+(rnd()<.5?1:0);for(let i=0;i<nt;i++){const side=rnd()<.5;const s=4+Math.floor(rnd()*(H-9));const [r,c]=side?[2,s]:[s,2];
    const a=Math.atan2(r-mid,c-mid)+(rnd()-.5)*.6;bmTrack(rnd,can,H,r,c,Math.round(mid+Math.sin(a)*R1),Math.round(mid+Math.cos(a)*R1),()=>({t:'road',rw:1,dirt:1}));}
  // 마을: 고리길 안팎으로 작은 필지. 가운데 가까운 큰 필지 하나는 종탑 있는 교회
  let bid=0,church=false;
  for(const comp of bmComps(can,H,(r,c)=>hyp(r,c)<Rv)){
    for(const P of bmGrow(rnd,comp,H,1,3)){const id=(++bid)*64;const near=P.some(([r,c])=>BM_NB.some(([a,b])=>isRd(r+a,c+b)));const q=rnd();
      if(!church&&P.length>=2&&P.some(([r,c])=>hyp(r,c)<R1+.5)){church=true;let ti=0,bd=-1;P.forEach(([r,c],i)=>{const d=hyp(r,c);if(d>bd){bd=d;ti=i;}});
        P.forEach(([r,c],i)=>can[r][c]={t:'bldg',f:i===ti?5:2,blk:id,ks:'villa',lkc:'#b9b0a0',church:1,dist:'mid'});continue;}
      if(!near||q<.14){P.forEach(([r,c])=>can[r][c]=rnd()<.75?{t:'park',yard:1,dist:'res'}:{t:'plaza',fy:1,dist:'res'});continue;}
      if(q<.36)P.forEach(([r,c])=>can[r][c]={t:'bldg',f:2+(rnd()<.4?1:0),blk:id,ks:'villa',dist:'mid'});           // 길가 2~3층 돌집(1층 가게)
      else{const f=rnd()<.55?2:1;P.forEach(([r,c])=>can[r][c]=rnd()<.8?{t:'bldg',f,blk:id,ks:'house',dist:'res'}:{t:'park',yard:1,dist:'res'});}}}
  // 들판: 남은 땅을 필지로 나누고 필지마다 쓰임을 정한다. 필지 경계에는 생울타리(소품)가 선다
  let pcN=0;const rest=[];for(let r=2;r<H;r++)for(let c=2;c<H;c++)if(!can[r][c])rest.push([r,c]);
  for(const P of bmGrow(rnd,rest,H,5,12)){const pc=++pcN;const q=rnd();
    if(q<.48){const k=1+Math.floor(rnd()*4),cd=rnd()<.5?'h':'v';P.forEach(([r,c])=>can[r][c]={t:'plaza',crop:k,cd,pc});}
    else if(q<.64){P.forEach(([r,c])=>can[r][c]={t:'park',yard:1,mead:1,pc});if(P.length>=6&&rnd()<.3){const [r,c]=P[Math.floor(rnd()*P.length)];can[r][c]={t:'water',pc};}}   // 목초지와 웅덩이
    else if(q<.74)P.forEach(([r,c])=>can[r][c]={t:'park',orch:1,wild:1,pc});
    else if(q<.86)P.forEach(([r,c])=>can[r][c]={t:'park',wild:1,pc});
    else{// 농가: 길에 붙은 칸에 살림집, 그 옆에 헛간, 나머지는 흙 마당
      const id=(++bid)*64;const fr=P.filter(([r,c])=>BM_NB.some(([a,b])=>isRd(r+a,c+b)));const h0=(fr.length?fr:P)[0];
      P.forEach(([r,c])=>can[r][c]={t:'plaza',fy:1,pc});can[h0[0]][h0[1]]={t:'bldg',f:2,blk:id+1,ks:'house',dist:'res',pc};
      const nb=P.filter(([r,c])=>can[r][c].t!=='bldg'&&Math.abs(r-h0[0])+Math.abs(c-h0[1])<=2).slice(0,1+Math.floor(rnd()*2));
      const bc=BM_BARN[Math.floor(rnd()*BM_BARN.length)];nb.forEach(([r,c])=>can[r][c]={t:'bldg',f:1,blk:id+2,ks:'house',lkc:bc,barn:1,dist:'res',pc});}}
  bmRoadDirs(can,H);bmOpenBldgs(can,H);
  const objs=bmObjs(rnd,can,H,objPer,x=>!x.crop||rnd()<.25);
  const out=bmAssemble(can,objs,H,rnd);out.feat={layout:'country'};return out;}

/* ---------- 숲 ---------- */
function genForest(seed,objPer,opt){const rnd=mulberry((seed^0xf0e57)>>>0);const H=N/2,mid=(N-1)/2;const can=bmGrid(H);
  const hyp=(r,c)=>Math.hypot(r-mid,c-mid);const isRd=(r,c)=>r>=0&&c>=0&&r<H&&c<H&&!!can[r][c]&&can[r][c].t==='road';const inner=(r,c)=>r>=2&&c>=2&&r<H&&c<H;
  for(let r=0;r<H;r++)for(let c=0;c<H;c++)if(r<2||c<2){const p=rnd();can[r][c]=p<.55?{t:'park',yard:1,mead:1}:p<.85?{t:'plaza',grav:1}:{t:'park',wild:1};}
  for(let c=0;c<H;c++)can[H-1][c]={t:'road',ro:'h',rw:1,dirt:1};                    // 숲을 가로지르는 임도(네 벌이 가운데서 만난다)
  // 호수: 사분면마다 하나쯤
  if(rnd()<.75){const lr=5+rnd()*(H-12),lc=5+rnd()*(H-12),R=1.4+rnd()*1.5,e=.7+rnd()*.6;
    for(let r=2;r<H-1;r++)for(let c=2;c<H-1;c++){const d=Math.hypot((r-lr)*e,(c-lc)/e);if(d<R&&!can[r][c])can[r][c]={t:'water'};else if(d<R+1.1&&!can[r][c])can[r][c]={t:'park',yard:1,mead:1};}}
  // 산골 마을: 가운데 작은 광장과 통나무집
  const Rh=Math.max(2.6,H*(.2+rnd()*.06));let bid=0;
  for(let r=2;r<H;r++)for(let c=2;c<H;c++)if(hyp(r,c)<=1.3)can[r][c]={t:'plaza',grav:1,sq:1};
  // 벌목길: 집결지에서 임도·마을로
  const nt=2+(rnd()<.6?1:0);for(let i=0;i<nt;i++){const side=rnd()<.5;const s=3+Math.floor(rnd()*(H-7));const [r,c]=side?[2,s]:[s,2];
    bmTrack(rnd,can,H,r,c,H-1-Math.floor(rnd()*3),H-1-Math.floor(rnd()*Rh),()=>({t:'road',rw:1,dirt:1}));}
  for(const comp of bmComps(can,H,(r,c)=>hyp(r,c)<Rh))for(const P of bmGrow(rnd,comp,H,1,2)){const id=(++bid)*64;const q=rnd();
    if(q<.55){const col=BM_WOOD[Math.floor(rnd()*BM_WOOD.length)],f=rnd()<.4?2:1;P.forEach(([r,c])=>can[r][c]={t:'bldg',f,blk:id,ks:'house',lkc:col,cabin:1,dist:'res'});}
    else P.forEach(([r,c])=>can[r][c]=rnd()<.6?{t:'park',yard:1,mead:1}:{t:'plaza',grav:1});}
  // 빈터(풀밭)와 사냥 오두막
  const free=()=>{const a=[];for(let r=2;r<H;r++)for(let c=2;c<H;c++)if(!can[r][c])a.push([r,c]);return a;};
  const blobs=bmGrow(rnd,free(),H,3,9);shuf(blobs,rnd);let cl=0;
  for(const P of blobs){if(cl>=Math.round(H*.32))break;if(P.length<3)continue;cl++;P.forEach(([r,c])=>can[r][c]={t:'park',yard:1,mead:1});
    if(rnd()<.4){const [r,c]=P[0];const id=(++bid)*64;can[r][c]={t:'bldg',f:1,blk:id,ks:'house',lkc:BM_WOOD[Math.floor(rnd()*BM_WOOD.length)],cabin:1,dist:'res'};}}
  // 제재소: 길가 빈 칸 몇 개에 창고 + 통나무 야적장
  {const cand=free().filter(([r,c])=>BM_NB.some(([a,b])=>isRd(r+a,c+b))&&hyp(r,c)>Rh);if(cand.length){const s=cand[Math.floor(rnd()*cand.length)];const id=(++bid)*64;let n=0;
    for(const [a,b] of [[0,0],[0,1],[1,0],[1,1],[0,-1],[-1,0]]){const r=s[0]+a,c=s[1]+b;if(!inner(r,c)||can[r][c])continue;can[r][c]=n<2?{t:'bldg',f:1,blk:id,ks:'ware',lkc:'#7a6a55',mill:1,dist:'res'}:{t:'plaza',logs:1};n++;}}}
  // 바위 언덕
  for(let i=0;i<2+Math.floor(rnd()*3);i++){const f=free();if(!f.length)break;const [r,c]=f[Math.floor(rnd()*f.length)];for(const [a,b] of [[0,0],[0,1],[1,0]])if(inner(r+a,c+b)&&!can[r+a][c+b]&&rnd()<.8)can[r+a][c+b]={t:'rubble',rock:1};}
  for(let r=2;r<H;r++)for(let c=2;c<H;c++)if(!can[r][c])can[r][c]={t:'park',wild:1};
  bmRoadDirs(can,H);bmOpenBldgs(can,H);
  const objs=bmObjs(rnd,can,H,objPer,x=>x.t==='bldg'||x.mead||x.grav||x.logs);
  const out=bmAssemble(can,objs,H,rnd);out.feat={layout:'forest'};return out;}

/* ---------- 항구 도시 ---------- */
function genPort(seed,objPer,opt){const rnd=mulberry((seed^0x90471)>>>0);const H=N/2,mid=(N-1)/2;const can=bmGrid(H);
  const ch=(r,c)=>Math.max(Math.abs(r-mid),Math.abs(c-mid));const Rb=Math.round(H*(.3+rnd()*.06));
  const isRd=(r,c)=>r>=0&&c>=0&&r<H&&c<H&&!!can[r][c]&&can[r][c].t==='road';
  const st=genLines(rnd);
  for(let r=0;r<H;r++)for(let c=0;c<H;c++){const d=ch(r,c);
    if(d<Rb)can[r][c]={t:'water',sea:1,dist:'ind'};
    else if(d<Rb+2)can[r][c]={t:'plaza',quay:1,dist:'ind'};
    else if(d<Rb+3){const ro=Math.abs(r-mid)>Math.abs(c-mid)+.1?'h':Math.abs(c-mid)>Math.abs(r-mid)+.1?'v':'x';can[r][c]={t:'road',ro,rw:1,dist:'ind'};}   // 부두 둘레길
    else if(r<2||c<2){const p=rnd();can[r][c]=p<.4?{t:'plaza',lot:1}:p<.7?{t:'plaza'}:p<.9?{t:'park'}:{t:'rubble'};}
    else if(st[r]||st[c]){const ro=st[r]&&st[c]?'x':st[r]?'h':'v';can[r][c]={t:'road',ro,rw:Math.max(st[r],st[c])};}}
  // 거리 일부 끊기(T자 교차로, 큰 블록): 대칭 도시와 같은 방식
  {const lines=[],cross=[];for(let i=3;i<H-2;i++)if(st[i]&&!st[i-1])lines.push(i);for(let j=2;j<H;j++)if(st[j]&&!st[j-1])cross.push(j);
    for(const i of lines)for(const ax of [0,1])for(let q=0;q+1<cross.length;q++){if(rnd()>(st[i]===2?.25:.5))continue;let a=cross[q];while(st[a])a++;const b=cross[q+1];
      for(let j=a;j<b;j++)for(let w=0;w<st[i];w++){const [r,c]=ax?[j,i+w]:[i+w,j];const x=can[r]&&can[r][c];if(x&&x.t==='road'&&!x.dist&&ch(r,c)>=Rb+3)can[r][c]=null;}}}
  // 잔교: 북쪽 안벽에서 남쪽으로, 서쪽 안벽에서 동쪽으로. 잔교 사이 물에 배가 댄다
  const r0=Math.floor(mid-Rb)+1,c0=r0;let bth=0;
  const pier=(alongC)=>{for(let p=c0+5+Math.floor(rnd()*2);p<=H-2;p+=4+(rnd()<.3?1:0)){const L=3+Math.floor(rnd()*3);
      for(let s=0;s<L;s++){const [r,c]=alongC?[r0+s,p]:[p,c0+s];if(r>=H||c>=H||!can[r][c]||!can[r][c].sea)break;can[r][c]={t:'plaza',pier:1,dist:'ind'};}
      if(rnd()<.75){const id=++bth;for(let s=0;s<L;s++){const [r,c]=alongC?[r0+s,p+1]:[p+1,c0+s];if(r>=H||c>=H||!can[r][c]||!can[r][c].sea)break;can[r][c].berth=id;}}}};
  pier(true);pier(false);
  // 안벽에 크레인: 물과 맞닿은 안벽 마당에 띄엄띄엄. 정박 자리 없는 긴 안벽에도 배 하나
  for(let r=0;r<H;r++)for(let c=0;c<H;c++){const x=can[r][c];if(!x||!x.quay)continue;const sea=BM_NB.find(([a,b])=>{const y=can[r+a]&&can[r+a][c+b];return y&&y.sea;});
    if(sea&&rnd()<.22){x.crane=1;x.face=sea[0]<0?0:sea[1]>0?1:sea[0]>0?2:3;}}
  // 블록: 부두 가까이는 컨테이너 야적장·창고, 바깥은 도시
  const dfn=comp=>{let d=0;for(const [r,c] of comp)d+=ch(r,c);d/=comp.length;const k=(d-Rb)/(H-Rb);return {d:Math.min(1,.3+k*.7),dist:k<.38?'ind':k<.7?'mid':'res'};};
  let bidN=0,cyN=0;FILL_BID=0;
  for(const comp of bmComps(can,H,()=>true)){const {dist}=dfn(comp);
    if(dist==='ind'&&comp.length>=3&&(!cyN||rnd()<.4)){cyN++;const cd=rnd()<.5?'h':'v';comp.forEach(([r,c])=>can[r][c]={t:'plaza',cy:1,cd,dist:'ind'});continue;}
    fillComp(rnd,can,comp,++bidN,mid,H,isRd,dfn);}
  for(let r=0;r<H;r++)for(let c=0;c<H;c++)if(!can[r][c])can[r][c]={t:'plaza'};
  const objs=bmObjs(rnd,can,H,objPer,x=>!x.crane&&!x.sea);
  const out=bmAssemble(can,objs,H,rnd);out.feat={layout:'port',basin:{R:Rb}};return out;}
const BM_GEN={country:genCountry,forest:genForest,port:genPort};

/* ---------- 소품: 생울타리·건초더미·컨테이너·크레인·배·통나무 ----------
   genProps(03b)가 만든 도시 소품 가운데 시골길·숲에 어울리지 않는 것(신호등·가로등·방벽·쓰레기통)은 빼고 덧붙인다 */
const CONT_COLS=['#8a3b2e','#2f5d7a','#b8862f','#4f6b3a','#7a7d80','#a85a32','#2e4a5e','#c2c0b8','#6b2f3a'];
const SHIP_COLS=['#3a3f44','#5a2a26','#25374a','#40463a','#2e2e30'];
let PLH_MAX=.7;      // 시야를 막는 소품 가운데 가장 높은 것(층). 04c propBlocks가 빨리 건너뛰는 데 쓴다
{const _gp=genProps;genProps=function(){let P=_gp();if(!G||!G.map)return P;const sd=(G.seed|0)%100000;const Hh=(k,s)=>propHash(k+sd*7919,s);
  P=P.filter(p=>{const r=Math.floor(p.z),c=Math.floor(p.x);if(!inb(r,c))return true;const x=G.map[r][c];
    if(x.dirt||x.rural){if(p.k==='light'||p.k==='bin'||p.k==='barrier'||p.k==='lamp')return false;if(p.k==='car')return Hh(key(r,c),777)<(x.dirt?.2:.45);}
    if(p.k==='hedge'&&(x.wild||x.mead||x.orch||x.pc!=null))return false;
    if(x.quay||x.pier)return p.k!=='hedge';
    return true;});
  bmProps(P,Hh);return P;};}
function bmProps(P,Hh){const M=G.map,at=(r,c)=>inb(r,c)?M[r][c]:null;
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=M[r][c],k=key(r,c),cx=c+.5,cz=r+.5;
    // 생울타리: 서로 다른 필지 사이(동·남 쪽만 세서 한 번씩), 그리고 길과 맞닿은 필지 가장자리. 군데군데 문(틈)
    if(x.pc!=null&&x.t!=='water'){BM_NB.forEach(([a,b],si)=>{const y=at(r+a,c+b);if(!y)return;
        const border=y.pc!=null&&y.pc!==x.pc&&y.t!=='water'&&(a>0||b>0),road=y.t==='road';if(!border&&!road)return;if(Hh(k,600+si)<.24)return;
        const o=road?.44:.5;P.push({k:'bocage',x:cx+b*o,z:cz+a*o,ry:b?Math.PI/2:0,tr:Hh(k,610+si)<.45});});}
    if(x.crop===2){for(let i=0;i<4;i++)if(Hh(k,620+i)<.3)P.push({k:'bale',x:cx+(Hh(k,630+i)-.5)*.75,z:cz+(Hh(k,640+i)-.5)*.75,ry:Hh(k,650+i)*6.28});}
    if(x.cy){// 컨테이너: 칸마다 세 줄, 1~3단. 가끔 빈 줄(지게차 길)
      const h=x.cd==='h';for(let i=-1;i<=1;i++){const q=Hh(k,660+i+1);if(q<.22)continue;const n=q<.5?1:q<.82?2:3;
        P.push({k:'cont',x:h?cx:cx+i*.3,z:h?cz+i*.3:cz,ry:h?0:Math.PI/2,n,col:CONT_COLS[Math.floor(Hh(k,670+i+1)*CONT_COLS.length)],c2:CONT_COLS[Math.floor(Hh(k,680+i+1)*CONT_COLS.length)]});}}
    if(x.crane)P.push({k:'crane',x:cx,z:cz,ry:[Math.PI/2,0,-Math.PI/2,Math.PI][x.face||0],col:Hh(k,690)<.5?'#c9a227':'#b5462e'});
    if(x.logs)for(let i=0;i<2;i++)P.push({k:'logs',x:cx+(i?.22:-.22),z:cz+(Hh(k,700+i)-.5)*.3,ry:Hh(k,705)<.5?0:Math.PI/2});}
  // 배: 같은 정박 번호의 물 칸 줄을 따라 한 척
  const B=new Map();for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=M[r][c];if(x.berth==null||x.t!=='water')continue;if(!B.has(x.berth))B.set(x.berth,[]);B.get(x.berth).push([r,c]);}
  for(const [id,cells] of B){if(cells.length<2)continue;let r0=1e9,r1=-1,c0=1e9,c1=-1;for(const [r,c] of cells){r0=Math.min(r0,r);r1=Math.max(r1,r);c0=Math.min(c0,c);c1=Math.max(c1,c);}
    const ns=r1-r0>=c1-c0;const len=(ns?r1-r0:c1-c0)+1-.35;const q=Hh(id,720);
    // 뱃머리는 바다 가운데 쪽
    const bx=(c0+c1+1)/2,bz=(r0+r1+1)/2;const out=ns?(Math.abs(r0-N/2)>Math.abs(r1+1-N/2)?1:-1):(Math.abs(c0-N/2)>Math.abs(c1+1-N/2)?1:-1);
    P.push({k:'ship',x:bx,z:bz,ry:ns?(out>0?-Math.PI/2:Math.PI/2):(out>0?0:Math.PI),len,cargo:q<.55,col:SHIP_COLS[Math.floor(Hh(id,721)*SHIP_COLS.length)],burnt:Hh(id,722)<.15});}}
/* 엄폐·시야: 소품 → G.covers. lh = 이보다 낮게 지나는 시야선을 막는 높이(층) */
{const _pc=propCovers;propCovers=function(){const C=_pc();if(!C||!G.props)return C;let mx=.7;
  for(const p of G.props){
    if(p.k==='bocage'){const ax=p.ry?0:1,az=p.ry?1:0;for(const s of [-.33,0,.33])C.push({x:p.x+ax*s,z:p.z+az*s,r:.17,kind:'bocage',lh:1.05});mx=Math.max(mx,1.05);}
    else if(p.k==='bale')C.push({x:p.x,z:p.z,r:.07,kind:'bale'});
    else if(p.k==='cont'){const ax=Math.cos(p.ry),az=-Math.sin(p.ry);const lh=p.n*.85;for(const s of [-.32,0,.32])C.push({x:p.x+ax*s,z:p.z+az*s,r:.13,kind:'cont',lh});mx=Math.max(mx,lh);}
    else if(p.k==='logs')C.push({x:p.x,z:p.z,r:.16,kind:'logs'});
    else if(p.k==='ship'){const ax=Math.cos(p.ry),az=-Math.sin(p.ry);for(let s=-p.len/2+.3;s<=p.len/2-.3;s+=.45)C.push({x:p.x+ax*s,z:p.z+az*s,r:.32,kind:'hull',lh:2.4});mx=Math.max(mx,2.4);}}
  PLH_MAX=mx;return C;};}
/* 지금 지도 이름: '농촌 · 겨울 · 완만한 언덕' */
function bmMapName(){const f=G&&G.feat;if(!f)return '';const L={sym:'대칭 도시',river:'강 도시',country:'농촌',forest:'숲',port:'항구 도시'}[f.layout]||'도시';
  const c=f.clime&&f.clime!=='temp'?' · '+{autumn:'가을',winter:'겨울',desert:'사막'}[f.clime]:'';const r=f.relief&&f.relief!=='flat'&&RELIEF[f.relief]?' · '+RELIEF[f.relief].n:'';return L+c+r;}
