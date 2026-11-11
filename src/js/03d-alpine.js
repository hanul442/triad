/* ===================== 알프스 산악 지형 =====================
   "산악병만 가고 전차는 못 가는 길". 지도 한가운데 고개(분지) 마을로 네 골짜기가 모이고, 골짜기 사이는 봉우리와 바위 능선이다.
   네 세력은 저마다 자기 골짜기 입구(가장자리)에서 출발한다. 지형은 90도 회전 대칭이라 공정하다.
   - 골짜기: U자(빙하 골짜기) 바닥은 완만해서 도로가 고개까지 오르고 차량이 다닌다(경사 약 10~20%).
   - 골짜기 벽과 능선: 숲 → 숲 한계선 위 고산 초지·너덜지대 → 설선 위 눈밭. 높은 비탈은 계단처럼 평평한 턱과 바위벽(절벽)이 번갈아 난다.
   - 봉우리: 골짜기 둘을 내려다보는 피라미드 봉우리, 꼭대기에 작은 평지(관측소).
   - 산길: 골짜기 도로에서 산장을 지나 봉우리를 넘어 옆 골짜기로 가는 좁은 길. 보병만 다닌다(차량 불가).
   경사(칸 기울기, 높이차/거리) 기준은 미 육군 지형 분석(FM 5-33)과 산악전 교범(ATP 3-90.97)을 따른다:
     바퀴 차량은 30% 넘는 비탈, 궤도 차량은 45% 넘는 비탈을 길 밖으로 못 오른다. 45°(100%) 넘는 바위벽은 등반(로프)이 있어야 오른다.
   규칙(이동·시야·산악병)은 04g-alpine.js, 3D 모습은 07g5-alpine.js.
   칸 표시: sl(기울기), cliff(바위벽), scree(너덜지대), snow(눈밭), alm(고산 초지), mtr(산길), summit(봉우리 꼭대기), hut(산장),
   alpRole(거점 역할: pass 고개 · summit 봉우리 · valley 골짜기 마을 · hut 산장), hospice(고개 구호소), chalet(목조 산장집). */
LAYOUTS.alpine={n:'알프스 산악 (고개·봉우리·바위벽, 산악병만 오르는 길)'};
RELIEF.alpine={n:'알프스 산악',h:0};
const ALP_CHALET=['#d6cbb5','#c9b89a','#b59a74','#e0d8c8','#a88a62','#9c7b55'];   // 샬레: 흰 회벽·밝은 나무
const ALPG={tree:.42,snow:{temp:.78,autumn:.62,winter:.08},T:3};
/* 지도 크기에 맞춘 치수(칸·층). H: 지도 반쪽, Rb: 고개 분지 반지름, Hp: 고개 높이, Hm: 능선 덩어리, Hpk: 봉우리, pk: 봉우리 자리(가운데에서 축마다), w0·wW: 골짜기 바닥 반폭·벽 폭 */
function alpDims(){const H=N/2;return {H,Rb:Math.max(3.4,H*.26),Hp:H*.3,Hm:H*.36,Hpk:H*.56,pk:H*.5,Rm:H*.44,w0:Math.max(1.7,H*.085),wW:Math.max(2.6,H*.13)};}
/* 값 잡음(0~1), 부드러움 */
function alpNoise(x,z,salt){const i=Math.floor(x),j=Math.floor(z),u=x-i,v=z-j;const h=(a,b)=>propHash(((a+4096)*7919+(b+4096))|0,salt);const s=t=>t*t*(3-2*t);const su=s(u),sv=s(v);
  return (h(i,j)*(1-su)+h(i+1,j)*su)*(1-sv)+(h(i,j+1)*(1-su)+h(i+1,j+1)*su)*sv;}
const alpFbm=(x,z,salt)=>alpNoise(x/4.3,z/4.3,salt)*.55+alpNoise(x/2.1,z/2.1,salt+1)*.3+alpNoise(x,z,salt+2)*.15;
/* 높이(층). a, b = 지도 가운데에서 두 축까지 거리(칸). a·b를 맞바꿔도 같아서 90도 회전 대칭이 된다 */
function alpH(a,b,D,salt){const H=D.H,s=Math.max(a,b),d=Math.min(a,b);
  const t=Math.max(0,Math.min(1,(s-D.Rb)/(H-2.2-D.Rb)));let h=D.Hp*Math.pow(1-t,1.1);              // 골짜기 바닥: 입구 0 → 고개 Hp
  const vm=sstep(D.w0,D.w0+D.wW,d),bm=sstep(D.Rb-.3,D.Rb+2.2,s),em=sstep(1.2,4.5,H-s);            // 골짜기 바닥·고개 분지·가장자리 집결지는 0
  const da=a-D.pk,db=b-D.pk;const q=Math.max(Math.abs(da),Math.abs(db))*.6+Math.hypot(da,db)*.4;   // 피라미드 봉우리(모서리 능선이 선다)
  const cone=D.Hpk*Math.max(0,1-q/D.Rm);
  const n=alpFbm(d,s,salt),rg=1-Math.abs(alpNoise(d/3.1,s/3.1,salt+5)*2-1);                       // 잡음, 능선 모양 잡음(골짜기·리지)
  const mass=D.Hm*(.75+.5*n)*(1-sstep(H*.5,H*.97,s));                                              // 골짜기 사이 능선 덩어리(가장자리 쪽 산자락은 낮다)
  let m=mass+cone+(rg-.5)*H*.12;
  h+=Math.max(0,m)*vm*bm*em;
  // 바위 띠: 고개보다 높은 비탈은 평평한 턱과 가파른 바위벽이 번갈아 난다
  const T=ALPG.T,tf=sstep(D.Hp+.5,D.Hp+3,h)*(.6+.4*alpNoise(d*.6,s*.6,salt+9));const k=Math.floor(h/T),f=h/T-k;const ht=(k+sstep(.5,.84,f))*T;
  h+=(ht-h)*tf;
  return Math.min(h,D.top==null?1e9:D.top);}
/* 꼭짓점 높이 전체 (N+1)² */
function alpElev(D,salt){const W=N+1,H=D.H;D.top=null;D.top=alpH(D.pk+1.2,D.pk,D,salt);const E=new Array(W*W);
  for(let j=0;j<W;j++)for(let i=0;i<W;i++)E[j*W+i]=alpH(Math.abs(i-H),Math.abs(j-H),D,salt);return E;}
const alpTileEl=(E,r,c)=>{const W=N+1;return (E[r*W+c]+E[r*W+c+1]+E[(r+1)*W+c]+E[(r+1)*W+c+1])/4;};
/* 칸 기울기(높이차/거리): 1층 3m, 1칸 12m */
function alpTileSl(E,r,c){const W=N+1;const e00=E[r*W+c],e01=E[r*W+c+1],e10=E[(r+1)*W+c],e11=E[(r+1)*W+c+1];
  const gx=(e01-e00+e11-e10)/2,gz=(e10-e00+e11-e01)/2;return Math.hypot(gx,gz)*.25;}
const ALP_CLIFF=1,ALP_STEEP=.55;
function genAlpine(seed,objPer,opt){const rnd=mulberry((seed^0xa1b5)>>>0);const H=N/2,mid=(N-1)/2;const can=bmGrid(H);const D=alpDims();const salt=(seed%9973)+11;
  const E=alpElev(D,salt);const cl=CLIMES[opt&&opt.clime]?opt.clime:'temp';
  const tl=D.Hp+D.Hpk*ALPG.tree,sn=cl==='winter'?D.Hp*.55:D.top-(cl==='autumn'?D.H*.24:D.H*.13);   // 설선: 여름엔 봉우리 꼭대기만, 가을엔 더 아래, 겨울엔 골짜기 위 전부
  const el=(r,c)=>alpTileEl(E,r,c),sl=(r,c)=>alpTileSl(E,r,c);
  const ab=(r,c)=>[H-c-.5,H-r-.5];const sOf=(r,c)=>{const [a,b]=ab(r,c);return Math.max(a,b);},dOf=(r,c)=>{const [a,b]=ab(r,c);return Math.min(a,b);};
  const hyp=(r,c)=>Math.hypot(r-mid,c-mid);const isRd=(r,c)=>r>=0&&c>=0&&r<H&&c<H&&!!can[r][c]&&can[r][c].t==='road';
  // 1) 땅: 높이·기울기로 정한다
  const nat=(r,c)=>{const e=el(r,c),g=sl(r,c),d=dOf(r,c);
    if(g>ALP_CLIFF)return {t:'rubble',rock:1,cliff:1,...(e>=sn?{snow:1}:{})};
    if(e>=sn)return g>ALP_STEEP?{t:'rubble',rock:1,scree:1,snow:1}:{t:'park',yard:1,mead:1,snow:1,alm:1};
    if(e>=tl)return g>ALP_STEEP?{t:'rubble',rock:1,scree:1}:{t:'park',yard:1,mead:1,alm:1};
    if(d<D.w0+.6||g<.1)return {t:'park',yard:1,mead:1};
    // 숲. 가끔 눈사태 길·빈터(풀밭)
    return alpNoise(r*.7,c*.7,salt+31)<.18?{t:'park',yard:1,mead:1}:{t:'park',wild:1};};
  for(let r=0;r<H;r++)for(let c=0;c<H;c++){
    if(r<2||c<2){const p=rnd();can[r][c]=p<.6?{t:'park',yard:1,mead:1}:p<.9?{t:'plaza',grav:1}:{t:'park',wild:1};}
    else can[r][c]=nat(r,c);}
  // 2) 골짜기 도로: 입구에서 고개 분지 가운데까지 (네 벌이 바람개비 모양 십자)
  for(let c=0;c<H;c++)can[H-1][c]={t:'road',ro:'h',rw:1,rural:1};
  // 3) 고개 분지 마을: 가운데 광장, 고리길, 목조 산장집(샬레), 구호소(호스피스)와 예배당
  const R1=Math.max(1.9,D.Rb*.6);let bid=0;
  for(let r=2;r<H;r++)for(let c=2;c<H;c++){if(sOf(r,c)>D.Rb-.2)continue;const h=hyp(r,c);
    if(h<=1.6)can[r][c]={t:'plaza',sq:1,grav:1,dist:'mid'};else if(Math.abs(h-R1-.6)<=.72&&can[r][c].t!=='road')can[r][c]={t:'road',ro:'x',rw:1,rural:1};else if(can[r][c].t!=='road')can[r][c]=null;}
  let hosp=null,chapel=false;
  for(const comp of bmComps(can,H,(r,c)=>sOf(r,c)<=D.Rb-.2))for(const P of bmGrow(rnd,comp,H,1,3)){const id=(++bid)*64;const near=P.some(([r,c])=>BM_NB.some(([a,b])=>isRd(r+a,c+b)));
    if(!hosp&&P.length>=2&&near){hosp=P;P.forEach(([r,c])=>can[r][c]={t:'bldg',f:3,blk:id,ks:'villa',lkc:'#cbc3b2',hospice:1,dist:'mid'});continue;}
    if(!chapel&&P.length>=2&&near){chapel=true;let ti=0,bd=-1;P.forEach(([r,c],i)=>{const d=hyp(r,c);if(d>bd){bd=d;ti=i;}});
      P.forEach(([r,c],i)=>can[r][c]={t:'bldg',f:i===ti?4:2,blk:id,ks:'villa',lkc:'#d8d2c4',church:1,dist:'mid'});continue;}
    if(!near&&rnd()<.6||rnd()<.28){P.forEach(([r,c])=>can[r][c]={t:'park',yard:1,mead:1,dist:'res'});continue;}
    const col=ALP_CHALET[Math.floor(rnd()*ALP_CHALET.length)],f=rnd()<.6?2:1;P.forEach(([r,c])=>can[r][c]={t:'bldg',f,blk:id,ks:'house',lkc:col,cabin:1,chalet:1,dist:'res'});}
  for(let r=0;r<H;r++)for(let c=0;c<H;c++)if(!can[r][c])can[r][c]={t:'park',yard:1,mead:1};
  // 4) 골짜기 마을: 도로 북쪽 두 줄에 여관·농가·헛간, 둘레는 건초 풀밭
  const vc0=Math.max(3,Math.round(H*.2)),vL=Math.max(3,Math.round(H*.17));let inn=null;
  for(let c=vc0;c<vc0+vL&&c<H-D.Rb-1;c++)for(const r of [H-2,H-3]){if(r<2)continue;const x=can[r][c];if(x.t==='road'||x.cliff||sl(r,c)>.3)continue;
    const q=propHash(r*97+c,salt+41);if(!inn&&r===H-2&&c<vc0+vL-1){const id=(++bid)*64;inn=[r,c];for(const cc of [c,c+1])can[r][cc]={t:'bldg',f:2,blk:id,ks:'house',lkc:'#d9cdb4',chalet:1,inn:1,dist:'res'};c++;continue;}
    if(q<.5)can[r][c]={t:'bldg',f:q<.25?2:1,blk:(++bid)*64,ks:'house',lkc:q<.2?BM_WOOD[Math.floor(q*20)%BM_WOOD.length]:ALP_CHALET[Math.floor(q*40)%ALP_CHALET.length],cabin:1,chalet:1,barn:q<.2?1:undefined,dist:'res'};
    else can[r][c]={t:'park',yard:1,mead:1};}
  // 풀밭 군데군데 건초 헛간
  for(let r=2;r<H-1;r++)for(let c=2;c<H;c++){const x=can[r][c];if(!x.mead||x.alm||sOf(r,c)<D.Rb+1||propHash(r*131+c,salt+43)>.045)continue;if(BM_NB.some(([a,b])=>isRd(r+a,c+b)))continue;
    can[r][c]={t:'bldg',f:1,blk:(++bid)*64,ks:'house',lkc:BM_WOOD[(r+c)%BM_WOOD.length],cabin:1,barn:1,hay:1,dist:'res'};}
  // 5) 봉우리 꼭대기: 3×3 평지(관측소 자리)
  const pr=Math.round(H-D.pk-.5),pc=pr;const top=[];
  for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const r=pr+a,c=pc+b;if(r<2||c<2||r>=H||c>=H)continue;can[r][c]={t:'plaza',grav:1,summit:1,...(el(r,c)>=sn?{snow:1}:{})};top.push([r,c]);}
  // 6) 산길: 보병이 오르기 쉬운 길을 찾는다(바위벽은 피하고, 가파른 오르막일수록 비싸다). 도로 → 산장 → 봉우리 → 옆 골짜기
  const trail=(sr,sc,tr,tc,hard)=>{const K=(r,c)=>r*H+c;const Dd=new Map([[K(sr,sc),0]]),Pv=new Map();const q=[[0,sr,sc]];
    while(q.length){let bi=0;for(let i=1;i<q.length;i++)if(q[i][0]<q[bi][0])bi=i;const [d0,r,c]=q.splice(bi,1)[0];if(d0>(Dd.get(K(r,c))??1e9))continue;if(r===tr&&c===tc)break;
      for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){if(!a&&!b)continue;const R=r+a,C=c+b;if(R<2||C<2||R>=H||C>=H)continue;const y=can[R][C];if(y.t==='bldg'||y.t==='water'||y.cliff&&!hard)continue;
        if(a&&b&&(can[r][C].cliff||can[R][c].cliff))continue;
        const L=a&&b?1.414:1,gr=Math.abs(el(R,C)-el(r,c))*.25/L;if(gr>.8&&!hard)continue;
        const nd=d0+L*(1+Math.pow(gr*3.2,2)+(y.t==='road'&&!y.mtr?.4:0)+(y.snow?.3:0)+(y.wild?.15:0)+(y.cliff?12:0));if(nd<(Dd.get(K(R,C))??1e9)){Dd.set(K(R,C),nd);Pv.set(K(R,C),K(r,c));q.push([nd,R,C]);}}}
    const out=[];let k=K(tr,tc);if(!Dd.has(k))return out;while(k!=null){out.push([Math.floor(k/H),k%H]);k=Pv.get(k);}return out.reverse();};
  const mk=(r,c)=>{const x=can[r][c];if(x.t==='road'&&!x.mtr||x.summit||x.t==='bldg')return;can[r][c]={t:'road',rw:1,dirt:1,mtr:1,...(x.snow?{snow:1}:{}),...(x.alm?{alm:1}:{})};};
  const ts=Math.max(D.w0+3,Math.round(H*.42));
  // 작은 지도는 봉우리가 바위벽에 둘러싸이기도 한다: 길이 없으면 바위벽을 깎아 지그재그 턱길을 낸다(그 칸은 바위벽이 아니다)
  const route=(a,b,c,d)=>{const p=trail(a,b,c,d);return p.length?p:trail(a,b,c,d,1);};
  const up=route(H-1,ts,pr+1,pc);up.forEach(([r,c])=>mk(r,c));
  const down=route(pr,pc+1,ts,H-1);down.forEach(([r,c])=>mk(r,c));
  // 산장: 오르는 길 가운데쯤, 숲 한계선 언저리의 평평한 자리 옆
  let hut=null;{let bs=1e9;for(let i=2;i<up.length-3;i++){const [r,c]=up[i];for(const [a,b] of BM_NB){const R=r+a,C=c+b;if(R<2||C<2||R>=H||C>=H)continue;const y=can[R][C];if(y.t==='road'||y.cliff||y.t==='bldg'||y.summit||sl(R,C)>.6)continue;
        const s2=Math.abs(el(R,C)-(tl-1))+sl(R,C)*4;if(s2<bs){bs=s2;hut=[R,C];}}}
    if(hut)can[hut[0]][hut[1]]={t:'bldg',f:2,blk:(++bid)*64,ks:'house',lkc:'#6b5038',cabin:1,chalet:1,hut:1,dist:'res'};}
  bmRoadDirs(can,H);bmOpenBldgs(can,H);
  // 7) 거점: 고개 → 봉우리 → 골짜기 마을 → 산장 순으로 objPer개
  const objs=[];const take=(p,role)=>{if(!p||objs.length>=objPer)return;const [r,c]=p;const x=can[r][c];if(x.t!=='bldg')x.t=x.t==='road'?x.t:'plaza';x.lm=1;x.alpRole=role;objs.push([r,c]);};
  if(hosp){let best=hosp[0],bd=-1;for(const [r,c] of hosp){const d=hyp(r,c);if(d>bd){bd=d;best=[r,c];}}take(best,'pass');}
  take([pr,pc],'summit');if(inn)take(inn,'valley');if(hut)take(hut,'hut');
  while(objs.length<objPer){const r=2+Math.floor(rnd()*(H-3)),c=2+Math.floor(rnd()*(H-3));const x=can[r][c];if(x.t==='road'||x.cliff||x.t==='water'||objs.some(([a,b])=>dist(a,b,r,c)<4))continue;take([r,c],'pass');}
  const out=bmAssemble(can,objs,H,rnd);
  // 건물 칸은 블록마다 평평하게(경사는 둘레 땅이 받는다)
  {const W=N+1,m=out.map;const B=new Map();for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=m[r][c];if(x.t!=='bldg')continue;const k=x.blk;if(!B.has(k))B.set(k,[]);B.get(k).push([r,c]);}
    const flat=cells=>{const vs=new Set();for(const [r,c] of cells)for(const [a,b] of [[0,0],[0,1],[1,0],[1,1]])vs.add((r+a)*W+c+b);let s=0;for(const v of vs)s+=E[v];s/=vs.size;for(const v of vs)E[v]=s;};
    for(let it=0;it<2;it++)for(const cells of B.values())flat(cells);
    for(let q=0;q<E.length;q++)E[q]=Math.round(Math.max(0,E[q])*100)/100;
    for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=m[r][c];const v=Math.round(alpTileEl(E,r,c)*100)/100;if(v>0)x.el=v;else delete x.el;x.sl=Math.round(alpTileSl(E,r,c)*100)/100;}}
  out.feat={layout:'alpine',alp:{tl:+tl.toFixed(2),sn:+sn.toFixed(2),pass:+D.Hp.toFixed(2),peak:+D.top.toFixed(2)}};out._E=E;return out;}
BM_GEN.alpine=genAlpine;
/* 고저차 마무리: 알프스는 genAlpine이 만든 높이를 그대로 쓴다 */
{const _tf=terrFinish;terrFinish=function(out,seed,opt){if(!out||!out.feat||out.feat.layout!=='alpine')return _tf(out,seed,opt);
  out.feat.relief='alpine';out.elv=out._E;delete out._E;return out;};}
/* 무작위 지도에서 알프스가 뽑히면 기후는 사막을 빼고 고른다 */
const pickAlpClime=seed=>bmPick(seed,914,[['temp',.45],['autumn',.2],['winter',.35]]);
{const _gm=genMap;genMap=function(seed,objPer,opt){opt=Object.assign({},opt||{});if(opt.layout==='rand')opt.layout=pickLayout(seed);
  if(opt.layout==='alpine'&&(opt.clime==='rand'||opt.clime==='desert'))opt.clime=pickAlpClime(seed);return _gm(seed,objPer,opt);};}
{const _mn=bmMapName;bmMapName=function(){const f=G&&G.feat;if(!f||f.layout!=='alpine')return _mn();const c=f.clime&&f.clime!=='temp'?' · '+{autumn:'가을',winter:'겨울'}[f.clime]:' · 여름';return '알프스 산악'+c;};}
/* 산길·바위·눈밭·꼭대기에는 도시 소품(차·가로등·벤치…)을 두지 않는다 */
{const _gp=genProps;genProps=function(){const P=_gp();if(!G||!G.map||!G.feat||G.feat.layout!=='alpine')return P;
  return P.filter(p=>{const r=Math.floor(p.z),c=Math.floor(p.x);if(!inb(r,c))return true;const x=G.map[r][c];return !(x.mtr||x.cliff||x.scree||x.summit||x.snow||x.alm);});};}
