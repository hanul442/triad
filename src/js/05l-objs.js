/* ===================== 특별 거점: 건물마다 다른 모습과 쓰임 =====================
   거점 이름이 곧 그 건물의 종류다. 종류마다 차지한 세력이 얻는 것이 다르다.
     종합병원   의료: 후송된 중상자를 받아 치료하고(여럿이 분대로 돌아옴), 둘레 경상자를 치료 (05m-med)
     방송국     방송: 우리 보병 사기가 빨리 오르고, 차지하는 순간 다른 세력 보병 사기가 떨어짐
     통신탑     통신: 무전이 40% 빨리 닿고 둘레 4칸은 재밍이 안 먹힘. 탑 둘레 5칸 감시
     발전소     전력: 지휘점수 +2 /30초
     중앙역     철도: 둘레 2칸에서 증원, 증원 비용 1 환급
     중앙시장·항만청  물자: 둘레 2칸 아군 탄약 보충·차량 정비·보급 트럭 재적재
     대성당     첨탑: 아군이 곁에 있으면 둘레 7칸 감시
     시청·연방 법원·주 의회  행정: 승점 +1 /30초
     증권거래소 자금: 지휘점수 +1 /30초, 차지할 때마다 +4
     국립도서관 설계도: 둘레 4칸 건물 속까지 보임
     경찰청     무기고: 둘레 2칸 보병 탄약 보충, 둘레 2칸에서 증원한 보병은 숙련으로 시작
     공항 터미널·스타디움  항공: 둘레 2칸에서 드론·항공 증원, 항공 증원 비용 1 환급
   감시(ov)는 시야선 없이 높은 곳에서 내려다보는 것이라, 그 안의 적은 우리 모든 부대에게 보인다.
   캠페인은 임무가 따로 규칙을 정하므로 모습만 바뀌고 쓰임은 꺼진다. */
const OBJK={
  hosp:{n:'의료',ic:'✚',col:'#f2f0ea',fn:'후송된 중상자를 받아 치료해 분대로 돌려보냄(환자집결지보다 많이·빨리), 둘레 2칸 경상자 치료'},
  bcast:{n:'방송',ic:'📡',col:'#c7cdd3',fn:'우리 보병 사기 회복 1.5배, 차지하는 순간 다른 세력 보병 사기 −10'},
  comm:{n:'통신',ic:'📶',col:'#9aa2a8',fn:'둘레 4칸 우리 드론은 재밍에 안 끊김, 탑 둘레 5칸 감시',ov:5},
  power:{n:'전력',ic:'⚡',col:'#a7a097',fn:'지휘점수 +2 /30초',cp:2},
  rail:{n:'철도',ic:'🚉',col:'#b07a5a',fn:'둘레 2칸에서 증원, 증원 비용 1 환급',dep:2},
  supply:{n:'물자',ic:'📦',col:'#b8a68c',fn:'둘레 2칸 아군 탄약 보충·차량 정비·보급 트럭 재적재'},
  spire:{n:'첨탑',ic:'⛪',col:'#c7bba4',fn:'아군이 1칸 안에 있으면 둘레 7칸 감시',ov:7,ovNeed:1},
  gov:{n:'행정',ic:'🏛',col:'#e6d6b0',fn:'승점 +1 /30초',vp:1},
  bank:{n:'자금',ic:'💰',col:'#d6cfc0',fn:'지휘점수 +1 /30초, 차지할 때마다 +4',cp:1},
  archive:{n:'설계도',ic:'📜',col:'#c9ae86',fn:'둘레 4칸 건물 속까지 감시',ov:4,ovB:1},
  police:{n:'무기고',ic:'🚓',col:'#8fa3c4',fn:'둘레 2칸 보병 탄약 보충, 둘레 2칸에서 증원한 보병은 숙련으로 시작',dep:2},
  air:{n:'항공',ic:'✈',col:'#bfc3c4',fn:'둘레 2칸에서 드론·항공 증원, 항공 증원 비용 1 환급',dep:2,depFly:1},
};
const OBJ_KIND={'종합병원':'hosp','방송국':'bcast','통신탑':'comm','발전소':'power','중앙역':'rail','중앙시장':'supply','항만청':'supply','대성당':'spire',
  '시청':'gov','연방 법원':'gov','주 의회':'gov','증권거래소':'bank','국립도서관':'archive','경찰청':'police','공항 터미널':'air','스타디움':'air'};
// 광장(빈터)에 어울리는 것과 건물에 어울리는 것
const OBJ_OPEN=['통신탑','발전소','스타디움','중앙시장'],OBJ_SEMI=['항만청','종합병원','경찰청','공항 터미널'];
const objKind=o=>o?OBJ_KIND[o.name]||null:null;
const objOn=()=>!!G&&!G.camp;
/* 세력 n이 가진 종류 k 거점들 */
function objsOf(n,k){if(!G||!G.objs)return [];return G.objs.filter(o=>objKind(o)===k&&G.map[o.r][o.c].owner===n&&G.map[o.r][o.c].t!=='rubble');}
const objHas=(n,k)=>objOn()&&objsOf(n,k).length>0;
/* 거점 설명 한 줄(화면용) */
function objFnText(o){const k=objKind(o);if(!k)return '';const d=OBJK[k];return `${d.ic} ${d.n}: ${d.fn}${G&&G.camp?' (캠페인에서는 꺼짐)':''}`;}
function objLabel(o){const k=objKind(o);return k?`${OBJK[k].ic} ${o.name}`:o.name;}

/* ---------- 지도 만들 때: 거점 이름을 땅 모양에 맞춰 다시 붙이고 건물 색을 입힌다 ---------- */
{const _gm=genMap;genMap=function(seed,...a){const out=_gm(seed,...a);try{objAssign(out,seed);}catch(e){}return out;};}
/* 거점 자리를 넓은 곳으로 옮긴다: 한 칸짜리 집이나 도로에 낀 빈터면 3칸 안에서 큰 건물(4칸 이상)이나 3×3 빈터를 찾는다.
   정준 거점 하나(목록에서 넷씩 묶인 첫째)로 찾고 나머지 셋은 90도씩 돌린 자리로 옮겨 대칭을 지킨다. */
function objRelocate(map,objs,GS){GS=GS||4;const H=map.length;const at=(r,c)=>r>=0&&c>=0&&r<H&&c<H?map[r][c]:null;
  const rot=(r,c,k)=>{for(let j=0;j<k;j++){const t=r;r=c;c=H-1-t;}return [r,c];};
  const blkN=(r,c)=>{const x=map[r][c];if(x.t!=='bldg'||x.blk==null)return 0;let n=0;for(let a=-3;a<=3;a++)for(let b=-3;b<=3;b++){const y=at(r+a,c+b);if(y&&y.t==='bldg'&&y.blk===x.blk)n++;}return n;};
  const open=(r,c)=>{const y=at(r,c);return !!y&&y.t!=='road'&&y.t!=='bldg'&&y.t!=='water'&&!y.lm;};
  const win3=(r,c)=>{for(let a=-2;a<=0;a++)for(let b=-2;b<=0;b++){let ok=true;for(let i=0;i<3&&ok;i++)for(let j=0;j<3;j++){const R=r+a+i,C=c+b+j;if(!(R===r&&C===c)&&!open(R,C)){ok=false;break;}}if(ok)return true;}return false;};
  const good=(r,c)=>{const x=at(r,c);if(!x||x.t==='road'||x.t==='water'||x.t==='rubble'||objFixed(x))return false;if(x.lm&&x.obj==null)return false;return objFootprint(map,{r,c}).fp.n>=4;};
  for(let i=0;i+GS-1<objs.length;i+=GS){const o=objs[i];if(map[o.r][o.c].stn||good(o.r,o.c))continue;let best=null,bd=99;
    for(let a=-4;a<=4;a++)for(let b=-4;b<=4;b++){const r=o.r+a,c=o.c+b;const d=Math.max(Math.abs(a),Math.abs(b));if(d>=bd||!good(r,c))continue;
      if(r<3||c<3||r>H-4||c>H-4)continue;
      // 다른 거점(넷 모두)과 3칸 이상 떨어지게
      let far=true;for(let j=0;j<objs.length&&far;j++){if(j>=i&&j<i+GS)continue;const q=objs[j];for(let k=0;k<GS;k++){const [rr,cc]=rot(r,c,k);if(Math.max(Math.abs(rr-q.r),Math.abs(cc-q.c))<3){far=false;break;}}}
      // 같은 묶음의 회전 복사본끼리도
      for(let k=1;k<GS&&far;k++){const [rr,cc]=rot(r,c,k);if(Math.max(Math.abs(rr-r),Math.abs(cc-c))<4)far=false;}
      if(!far)continue;best=[r,c];bd=d;}
    if(!best)continue;
    for(let k=0;k<GS;k++){const q=objs[i+k];const [or,oc]=[q.r,q.c];const ox=map[or][oc];const idx=ox.obj;ox.obj=null;ox.lm=0;
      const [nr,nc]=rot(best[0],best[1],k);const y=map[nr][nc];y.obj=idx;y.lm=1;if(y.t==='bldg'){y.f=Math.max(y.f,4);y.bmax=8+y.f*3;y.bhp=y.bmax;}else{y.t='plaza';delete y.lot;}q.r=nr;q.c=nc;}}}
/* 거점 목록이 넷씩 90도 회전 묶음인가(대칭 도시). 비대칭 도시(강 도시 등)는 하나씩 따로 다룬다 */
// 지형 스레드(03a)가 정한 칸: 강·다리·철로·역은 옮기거나 합치거나 광장으로 바꾸지 않는다
function objFixed(y){return !!(y.rv||y.br||y.rail||y.stn);}
function objSym(map,objs){const H=map.length;if(objs.length%4)return false;
  for(let i=0;i<objs.length;i+=4){let r=objs[i].r,c=objs[i].c;for(let k=1;k<4;k++){const t=r;r=c;c=H-1-t;if(objs[i+k].r!==r||objs[i+k].c!==c)return false;}}return true;}
function objAssign(out,seed){const {map,objs}=out;const R=mulberry((seed|0)^0x5eed0b);const GS=objSym(map,objs)?4:1;objRelocate(map,objs,GS);
  const sh=a=>{for(let j=a.length-1;j>0;j--){const q=Math.floor(R()*(j+1));[a[j],a[q]]=[a[q],a[j]];}return a;};
  const open=sh(OBJ_NAMES.filter(s=>OBJ_OPEN.includes(s))),semi=sh(OBJ_NAMES.filter(s=>OBJ_SEMI.includes(s))),closed=sh(OBJ_NAMES.filter(s=>!OBJ_OPEN.includes(s)&&!OBJ_SEMI.includes(s)));
  // 같은 정준 거점의 네 회전 복사본은 땅 모양이 같다. 광장은 빈터용 → 반쯤 → 건물용, 건물은 건물용 → 반쯤 → 빈터용 순으로 이름을 받는다
  for(const o of objs){const x=map[o.r][o.c];const order=x.t==='bldg'?[closed,semi,open]:[open,semi,closed];const pool=order.find(a=>a.length);o.name=(pool&&pool.shift())||o.name;
    const k=OBJ_KIND[o.name];if(!k)continue;x.lk=k;
    // 같은 건물(blk) 전체를 그 건물 색으로
    if(x.t==='bldg'&&x.blk!=null){for(let r=Math.max(0,o.r-4);r<=Math.min(N-1,o.r+4);r++)for(let c=Math.max(0,o.c-4);c<=Math.min(N-1,o.c+4);c++){const y=map[r][c];if(y.t==='bldg'&&y.blk===x.blk)y.lkc=OBJK[k].col;}}
    x.lkc=OBJK[k].col;
    // 높이: 병원은 5층 이상, 관공서는 4층 이상
    if(x.t==='bldg'){if(k==='hosp')x.f=Math.max(x.f,5);if(k==='gov'||k==='bank'||k==='archive')x.f=Math.max(x.f,4);
      x.bmax=8+x.f*3;x.bhp=x.bmax;}}
  for(let i=0;i+GS-1<objs.length;i+=GS)objFpApply(map,objs.slice(i,i+GS));}
/* 거점이 차지하는 땅(모습을 얹을 범위). 건물이면 같은 건물(blk) 전체를 같은 높이로 맞춘 한 덩이,
   빈터면 둘레 8칸이 모두 빈터(도로·건물·물·다른 거점이 아님)일 때 3×3 단지로 넓힌다. */
function objFootprint(map,o){const x=map[o.r][o.c];const H=map.length;const at=(r,c)=>r>=0&&c>=0&&r<H&&c<H?map[r][c]:null;
  if(x.t==='bldg'&&x.blk!=null){
    // 거점 칸을 품는 3×3(없으면 2×2) 건물 덩어리를 한 채로 합쳐 큰 건물로 만든다(길·빈터는 건드리지 않음)
    const okB=(r,c)=>{const y=at(r,c);return !!y&&y.t==='bldg'&&!objFixed(y)&&r>0&&c>0&&r<H-1&&c<H-1&&!y.lm&&y.obj==null||(r===o.r&&c===o.c);};
    const M=[];merge:for(const n of [3,2])for(let a=-(n-1);a<=0;a++)for(let b=-(n-1);b<=0;b++){let ok=true;for(let i=0;i<n&&ok;i++)for(let j=0;j<n;j++)if(!okB(o.r+a+i,o.c+b+j)){ok=false;break;}if(!ok)continue;
      for(let i=0;i<n;i++)for(let j=0;j<n;j++)M.push([o.r+a+i,o.c+b+j]);break merge;}
    const inM=(r,c)=>M.some(p=>p[0]===r&&p[1]===c);
    const seen=new Set([o.r*1000+o.c]),q=[[o.r,o.c]],L=[];
    while(q.length&&L.length<16){const [r,c]=q.shift();L.push([r,c]);for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){const R=r+a,C=c+b,y=at(R,C);if(!y||y.t!=='bldg'||!(y.blk===x.blk||inM(R,C))||seen.has(R*1000+C))continue;if(Math.abs(R-o.r)>3||Math.abs(C-o.c)>3)continue;seen.add(R*1000+C);q.push([R,C]);}}
    // 모형은 블록 안에 꽉 차는 가장 큰 직사각형(거점 칸 포함)에 얹는다. ㄱ자 블록에서 길 위로 삐져나오지 않게
    const S=new Set(L.map(p=>p[0]*1000+p[1]));let best={r0:o.r,r1:o.r,c0:o.c,c1:o.c,n:1},bs=1;
    for(let r0=o.r-3;r0<=o.r;r0++)for(let c0=o.c-3;c0<=o.c;c0++)for(let r1=o.r;r1<=o.r+3;r1++)for(let c1=o.c;c1<=o.c+3;c1++){
      const a=(r1-r0+1)*(c1-c0+1);const sq=Math.min(r1-r0,c1-c0)+1;const sc=a+sq*2;if(sc<=bs)continue;let ok=true;
      for(let r=r0;r<=r1&&ok;r++)for(let c=c0;c<=c1;c++)if(!S.has(r*1000+c)){ok=false;break;}
      if(ok){bs=sc;best={r0,r1,c0,c1,n:a,blkN:L.length};}}
    return {fp:best,M,L,plaza:0};}
  const free=(r,c)=>{const y=at(r,c);return !!y&&!objFixed(y)&&y.t!=='road'&&y.t!=='bldg'&&y.t!=='water'&&(!y.lm||(r===o.r&&c===o.c));};
  // 거점 칸을 품는 3×3(없으면 2×2) 창 가운데 모두 빈터인 것
  for(const n of [3,2])for(let a=-(n-1);a<=0;a++)for(let b=-(n-1);b<=0;b++){let ok=true;for(let i=0;i<n&&ok;i++)for(let j=0;j<n;j++)if(!free(o.r+a+i,o.c+b+j)){ok=false;break;}if(!ok)continue;
    const L=[];for(let i=0;i<n;i++)for(let j=0;j<n;j++)L.push([o.r+a+i,o.c+b+j]);
    return {fp:{r0:o.r+a,r1:o.r+a+n-1,c0:o.c+b,c1:o.c+b+n-1,n:n*n},M:[],L,plaza:1};}
  return {fp:{r0:o.r,r1:o.r,c0:o.c,c1:o.c,n:1},M:[],L:[[o.r,o.c]],plaza:0};}
/* 정준 거점에서 고른 땅을 네 회전 복사본에 똑같이 깐다(맵 회전 대칭 유지) */
function objFpApply(map,g){const H=map.length;const rot=(r,c,k)=>{for(let j=0;j<k;j++){const t=r;r=c;c=H-1-t;}return [r,c];};
  const res=objFootprint(map,g[0]);const bl=map[g[0].r][g[0].c].t==='bldg';
  const f=bl?Math.max(...g.map(o=>map[o.r][o.c].f)):0;
  g.forEach((o,k)=>{const x=map[o.r][o.c];const R=([r,c])=>rot(r,c,k);
    for(const p of res.M){const [r,c]=R(p);map[r][c].blk=x.blk;}
    for(const p of res.L){const [r,c]=R(p);const y=map[r][c];
      if(res.plaza){y.t='plaza';delete y.lot;delete y.yard;y.site=1;}
      else if(bl){y.f=f;y.bmax=8+f*3;y.bhp=y.bmax;y.lkc=x.lkc;y.lk=x.lk;}}
    const [a0,b0]=R([res.fp.r0,res.fp.c0]),[a1,b1]=R([res.fp.r1,res.fp.c1]);
    o.fp={...res.fp,r0:Math.min(a0,a1),r1:Math.max(a0,a1),c0:Math.min(b0,b1),c1:Math.max(b0,b1)};});}
/* ---------- 감시: 통신탑·첨탑·설계도 ---------- */
function objOvList(n){if(!objOn())return [];const out=[];
  for(const o of G.objs){const k=objKind(o);const d=k&&OBJK[k];if(!d||!d.ov)continue;const x=G.map[o.r][o.c];if(x.owner!==n||x.t==='rubble')continue;
    if(d.ovNeed&&!G.units.some(u=>u.nat===n&&!UT[u.type].fly&&Math.abs(u.x-(o.c+.5))<=1.6&&Math.abs(u.z-(o.r+.5))<=1.6))continue;
    out.push({x:o.c+.5,z:o.r+.5,r:d.ov,b:!!d.ovB,k});}
  return out;}
function objOvSees(e,n){if(!G||!G.fog||e.nat===n)return false;const L=objOvList(n);if(!L.length)return false;const [ex,ez]=posOf(e);
  for(const v of L){if(Math.hypot(ex-v.x,ez-v.z)>v.r)continue;
    // 설계도: 건물 속 적만 / 탑·첨탑: 건물 속은 못 봄(지붕·창가 제외)
    const inB=cell(e.r,e.c).t==='bldg';if(v.b?inB:(!inB||(typeof onRoof==='function'&&onRoof(e))))return true;}
  return false;}
{const _s=seen;seen=function(e,n,vs){if(_s(e,n,vs))return true;try{return objOvSees(e,n);}catch(err){return false;}};
 const _v=visSet;visSet=function(n){const s=_v(n);if(s._ov)return s;s._ov=1;try{const L=objOvList(n);if(!L.length)return s;const R=s.R||FOW_R,M=N*R;
     for(const v of L){const i0=Math.max(0,Math.floor((v.x-v.r)*R)),i1=Math.min(M-1,Math.floor((v.x+v.r)*R)),j0=Math.max(0,Math.floor((v.z-v.r)*R)),j1=Math.min(M-1,Math.floor((v.z+v.r)*R));
       for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const px=(i+.5)/R,pz=(j+.5)/R;if(Math.hypot(px-v.x,pz-v.z)>v.r)continue;const r=Math.floor(pz),c=Math.floor(px);if(v.b&&G.map[r][c].t!=='bldg')continue;
         s.fine[j*M+i]=1;s.add(key(r,c));}}}catch(e){}return s;};}

/* ---------- 통신탑 ---------- */
// 통신탑 둘레 4칸: 우리 드론 조종 신호는 적 재밍에 끊기지 않는다
if(typeof jammedBy==='function'){const _jb=jammedBy;jammedBy=function(u){if(objOn())for(const o of objsOf(u.nat,'comm'))if(Math.hypot(u.x-(o.c+.5),u.z-(o.r+.5))<=4)return null;return _jb(u);};}

/* ---------- 지휘점수·승점 ---------- */
{const _in=income;income=function(n){let cp=_in(n);if(!objOn())return cp;for(const k in OBJK)if(OBJK[k].cp)cp+=OBJK[k].cp*objsOf(n,k).length;return cp;};
 const _rr=rtRound;rtRound=function(){_rr.apply(this,arguments);if(!objOn())return;for(const n of G.order){if(!G.nats[n].alive)continue;const v=objsOf(n,'gov').length;if(v)G.nats[n].vp+=v;}};}

/* ---------- 증원: 역·경찰청·공항 둘레 ---------- */
{const _ds=deploySpots;deploySpots=function(n,type){const out=_ds(n,type);if(!objOn())return out;const fly=!!UT[type].fly;const have=new Set(out);
   const O=occ();const inc=new Set(G.units.map(o=>key(Math.floor(o.z),Math.floor(o.x))));
   for(const o of G.objs){const k=objKind(o);const d=k&&OBJK[k];if(!d||!d.dep||(d.depFly&&!fly))continue;const y=G.map[o.r][o.c];if(y.owner!==n||y.t==='rubble')continue;
     if(G.units.some(e=>e.nat!==n&&dist(e.r,e.c,o.r,o.c)<=2))continue;   // 적이 붙어 있으면 못 내림
     for(let r=o.r-d.dep;r<=o.r+d.dep;r++)for(let c=o.c-d.dep;c<=o.c+d.dep;c++){if(!inb(r,c))continue;const kk=key(r,c);if(have.has(kk)||O.has(kk)||inc.has(kk))continue;if(mcost(type,G.map[r][c])===Infinity)continue;have.add(kk);out.push(kk);}}
   return out;};
 const _b=buy;buy=function(n,type,r,c){const u=_b(n,type,r,c);if(!u||!objOn())return u;const N2=G.nats[n];const near=k=>objsOf(n,k).some(o=>dist(o.r,o.c,r,c)<=2);
   if(near('rail')&&!UT[type].fly){N2.cp+=1;}
   else if(UT[type].fly&&objHas(n,'air')){N2.cp+=1;}
   if(UT[type].cls==='inf'&&near('police')&&typeof giveXp==='function'&&!(u.xp>=25)){giveXp(u,25-(u.xp||0));}
   return u;};}

/* ---------- 매 틱: 차지 바뀜, 물자·무기고, 방송 ---------- */
function objCapture(o,n,was){const k=objKind(o);if(!k)return;const d=OBJK[k];
  if(k==='bcast'){for(const u of G.units)if(u.nat!==n&&UT[u.type].cls==='inf')u.mor=Math.max(0,(u.mor??80)-10);
    for(const u of G.units)if(u.nat===n&&UT[u.type].cls==='inf')u.mor=Math.min(100,(u.mor??80)+8);}
  if(k==='bank')G.nats[n].cp+=4;
  if(!isAI(n)||!G.fog||n===G.viewer)L(`${natName(n)} ${o.name} 장악 · ${d.ic} ${d.n}: ${d.fn}`);}
function objTick(dt){if(!objOn()||!G.objs)return;
  const ow=G.objs.map(o=>G.map[o.r][o.c].owner);const prev=G._objOw;G._objOw=ow;
  if(prev&&prev.length===ow.length)for(let i=0;i<ow.length;i++)if(ow[i]!=null&&ow[i]!==prev[i])objCapture(G.objs[i],ow[i],prev[i]);
  for(const o of G.objs){const k=objKind(o);if(k!=='supply'&&k!=='police')continue;const x=G.map[o.r][o.c];if(x.owner==null||x.t==='rubble')continue;const n=x.owner;const cx=o.c+.5,cz=o.r+.5;
    for(const u of G.units){if(u.nat!==n||UT[u.type].fly)continue;if(Math.abs(u.x-cx)>2.5||Math.abs(u.z-cz)>2.5)continue;
      if(k==='police'&&UT[u.type].cls!=='inf')continue;
      if(typeof amMax==='function'){const M=amMax(u);if(M&&amOf(u)<M)u.am=Math.min(M,u.am+M*.05*dt);}
      if(k==='supply'){if(u.type==='sup'&&u.cargo!=null)u.cargo=Math.min(typeof CARGO!=='undefined'?CARGO:100,u.cargo+6*dt);
        if(UT[u.type].cls==='veh'&&typeof fixVeh==='function'&&!(u.path&&u.path.length)&&u.towBy==null)fixVeh(u,dt,.5);}}}}
{const _t=rtTick;rtTick=function(dt){_t(dt);if(!G||!G.units||G.over)return;try{objTick(dt);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}};}
/* 방송: 사기 회복 1.5배 */
if(typeof morTick==='function'){const _m=morTick;morTick=function(u,dt){const m0=u.mor;_m(u,dt);if(m0!=null&&u.mor>m0&&objHas(u.nat,'bcast'))u.mor=Math.min(100,u.mor+(u.mor-m0)*.5);};}

/* ---------- AI: 쓸모 있는 거점을 조금 더 노린다 ---------- */
// 거점 점수에 종류별 가치를 얹는다(이미 가진 종류는 덜)
const OBJ_AIW={hosp:6,bcast:5,comm:6,power:7,rail:5,supply:5,spire:4,gov:8,bank:5,archive:3,police:5,air:3};
{const _ps=aiPosScore;aiPosScore=function(u,r,c,goal,vis,n){let s=_ps(u,r,c,goal,vis,n);if(!objOn())return s;const x=G.map[r][c];
   if(x.obj!=null&&x.owner!==n&&UT[u.type].cap){const k=objKind(G.objs[x.obj]);if(k)s+=(OBJ_AIW[k]||0)*(objsOf(n,k).length?.4:1);}return s;};}

/* ---------- 점령은 버텨야 넘어간다 ----------
   남의 거점은 밟는 순간 넘어가지 않는다. 점령할 수 있는 병력이 거점 땅에 머물러야 하고(기본 12초),
   주인 쪽 병력이 거점 둘레 1칸 안에 있으면 다툼 중이라 진행이 멈춘다. 진지로 굳힌 건물(fb)·벙커는 더 오래 걸린다.
   병력이 빠지면 진행은 천천히 줄어든다. 주인 없는 거점은 예전처럼 밟으면 바로 확보. */
const CAP={t:12,fb:1.6,bunker:1.3,decay:.5};
const capOn=()=>!!G&&!!G.objs;   // 점령 규칙은 캠페인에도 쓴다(특별 거점 기능 objOn은 캠페인에서 꺼짐)
{const _am=afterMove;afterMove=function(u){const x=cell(u.r,u.c);
  if(!capOn()||!UT[u.type].cap||x.obj==null||x.owner==null||x.owner===u.nat)return _am(u);
  const was=x.owner;x.owner=u.nat;try{_am(u);}finally{x.owner=was;}   // 경계 사격 등 나머지는 그대로, 소유만 미룬다
  if(!x.cap||x.cap.n!==u.nat)x.cap={n:u.nat,p:x.cap&&x.cap.n===u.nat?x.cap.p:0};};}
function capArea(o,m){const f=o.fp||{r0:o.r,r1:o.r,c0:o.c,c1:o.c};return {x0:f.c0-m,x1:f.c1+1+m,z0:f.r0-m,z1:f.r1+1+m};}
function capIn(u,A){return u.x>=A.x0&&u.x<=A.x1&&u.z>=A.z0&&u.z<=A.z1;}
function capNeed(o){const x=G.map[o.r][o.c];let k=CAP.t;if(x.fb!=null&&x.fb===x.owner)k*=CAP.fb;
  if((G.forts||[]).some(f=>f.k==='bunker'&&f.nat===x.owner&&f.prog>=1&&Math.hypot(f.x-(o.c+.5),f.z-(o.r+.5))<2.5))k*=CAP.bunker;return k;}
function capTick(dt){for(const o of G.objs){const x=G.map[o.r][o.c];const c=x.cap;if(!c)continue;
  if(x.owner==null||x.owner===c.n||x.t==='rubble'){delete x.cap;continue;}
  const inA=capArea(o,.3),near=capArea(o,1.3);
  const atk=G.units.filter(u=>u.nat===c.n&&UT[u.type].cap&&!UT[u.type].fly&&capIn(u,inA));
  if(!atk.length){c.p-=dt*CAP.decay;if(c.p<=0)delete x.cap;continue;}
  c.k=G.units.some(u=>u.nat===x.owner&&!UT[u.type].fly&&u.type!=='amb'&&capIn(u,near))?1:0;   // 다툼 중
  if(c.k)continue;const S=atk.reduce((a,u)=>a+(UT[u.type].cap||0),0);c.p+=dt*Math.min(1.5,.75*Math.min(1,S)+.25*S);   // 점령 힘(05l3-capture): 소총분대 하나면 1, 전차 혼자면 .5
  if(c.p>=capNeed(o)){const was=x.owner;x.owner=c.n;delete x.cap;
    L(`${natName(c.n)} ${o.name} 확보 (${natName(was)}에게서 탈환)`);sfx('build');
    if(typeof giveXp==='function'&&typeof VET!=='undefined')for(const u of atk)giveXp(u,VET.xp.cap);}}}
function capPct(o){const x=G.map[o.r][o.c];return x.cap?Math.min(99,Math.floor(x.cap.p/capNeed(o)*100)):null;}
{const _ot=objTick;objTick=function(dt){if(capOn())capTick(dt);return _ot(dt);};}
{const _ol=objLabel;objLabel=function(o){const s=_ol(o);const p=G&&G.map&&capPct(o);if(p==null)return s;const x=G.map[o.r][o.c];return `${s} · ${natName(x.cap.n)} 점령 ${p}%${x.cap.k?' (다툼)':''}`;};}
