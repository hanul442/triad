/* ===================== FORT: 설치형 방어물과 세밀한 이동 격자 =====================
   1) 이동 격자: 칸 하나를 NAV_R×NAV_R 작은 칸으로 나눠, 주차된 차·콘크리트 방벽·잔해 차량·설치한 방어물이
      실제로 차지하는 자리를 막는다. 차량은 차폭만큼 여유를 두고 계산해 장애물을 넘어가지 않고 돌아간다.
      부대 종류(navCls)마다 막히는 것이 다르다:
        inf  보병: 차와 철조망에 막힌다. 모래주머니·방벽·대전차 장애물은 넘어간다
        eng  공병: 보병과 같지만 철조망을 끊고 지나간다
        veh  바퀴 차량: 차·방벽·모래주머니·대전차 장애물에 막힌다. 철조망은 깔고 지나간다(끊어짐)
        trk  궤도 차량(전차·자주포): 모래주머니·철조망은 짓밟아 부수고, 방벽·대전차 장애물·차에는 막힌다
   2) 방어물: 보병이 지휘점수를 써서 원하는 곳에 짓는다. 다 지으면 엄폐(G.covers)가 되고 길을 막는다.
      포격·폭발물에 부서지고, 전차는 가벼운 것을 깔아뭉갠다.
   G.forts: [{id,k,nat,x,z,ry,hp,prog}]  (x,z = unit 좌표, ry = 길이 방향 회전, 길이 축은 로컬 x) */
const NAV_R=5;
const FORT={
  sandbag:{n:'모래주머니',len:.3,w:.08,cov:.4,h:.09,hp:30,bt:6,cost:1,desc:'보병 엄폐 40%. 바퀴 차량을 막고 전차는 짓밟음'},
  wire:{n:'철조망',len:.42,w:.09,cov:0,h:.08,hp:14,bt:5,cost:1,desc:'보병을 막음(공병은 끊고 통과). 차량은 깔고 지나감'},
  jersey:{n:'콘크리트 방벽',len:.3,w:.07,cov:.35,h:.07,hp:70,bt:9,cost:2,desc:'모든 차량을 막는 저지 블록. 엄폐 35%'},
  hedgehog:{n:'대전차 장애물',len:.15,w:.15,cov:.1,h:.12,hp:55,bt:7,cost:2,desc:'철골 고슴도치. 모든 차량을 막고 보병은 지나감'},
  trench:{n:'참호',len:.5,w:.11,cov:0,h:0,hp:90,bt:12,cost:1,desc:'땅을 파 들어가 앉는 호. 안의 보병은 사방 엄폐 50%(포격에도). 바퀴 차량은 못 건넘',inside:1},
  nest:{n:'기관총 진지',len:.28,w:.28,cov:.45,h:.1,hp:45,bt:9,cost:2,desc:'반원형 모래주머니 진지. 앞쪽 엄폐 45%. 바퀴 차량을 막음',inside:1},
};
const FORT_KS=Object.keys(FORT);
Object.assign(COVK,{trench:{n:'참호',v:.5},nest:{n:'기관총 진지',v:.45},sandbag:{n:'모래주머니',v:.4},jersey:{n:'콘크리트 방벽',v:.35},hedgehog:{n:'대전차 장애물',v:.1}});
/* 누가 무엇을 지을 수 있나: 공병은 전부, 소총·기관총은 모래주머니·철조망, 나머지 보병은 모래주머니 */
function fortKinds(type){const t=UT[type];if(!t||t.cls!=='inf')return [];if(type==='eng')return FORT_KS.slice();if(type==='mg')return ['sandbag','wire','trench','nest'];if(type==='rifle')return ['sandbag','wire','trench'];return ['sandbag','trench'];}
const navCls=u=>{const t=UT[u.type];if(t.fly)return null;if(t.cls==='inf')return u.type==='eng'?'eng':t.mtn?'mtn':'inf';return u.type==='cev'?'dz':u.type==='tank'||u.type==='spg'||u.type==='bmp'||u.type==='spaa'?'trk':'veh';};
const NAV_CLR={inf:.03,eng:.03,mtn:.03,veh:.14,trk:.15,dz:.16};   // dz 공병전차(규칙은 09e-fleet). 차량은 차체 반폭 이상 건물에서 떨어져 벽을 파고들지 않게
/* 장애물 k가 부대 종류 cls에게: 0 지나감, 1 부수고 지나감, 2 막힘 */
const NAV_RULE={
  car:{inf:2,eng:2,veh:2,trk:2},hedge:{inf:1,eng:1,veh:2,trk:1},wagon:{inf:1,eng:1,veh:2,trk:2},   // 생울타리: 보병은 헤치고 전차는 뚫고 바퀴 차량은 막힘. 화차: 차량은 막힘
  barrier:{inf:0,eng:0,veh:2,trk:2},bin:{inf:0,eng:0,veh:2,trk:1},wreck:{inf:0,eng:0,veh:2,trk:2},
  sandbag:{inf:0,eng:0,veh:2,trk:1},wire:{inf:2,eng:1,veh:1,trk:1},jersey:{inf:0,eng:0,veh:2,trk:2},hedgehog:{inf:0,eng:0,veh:2,trk:2},
  trench:{inf:0,eng:0,veh:2,trk:0},nest:{inf:0,eng:0,veh:2,trk:1}};
/* 길을 막는 물체 목록 (방향 있는 상자) */
function navObstacles(){const O=[];
  for(const p of G.props||[]){
    if(p.k==='car'){const fl=p.flip?1.05:1;O.push({k:'car',x:p.x,z:p.z,ry:p.ry,hl:CAR_KIND_L[p.kind]/2*fl,hw:CAR_KIND_W[p.kind]/2*fl,p});}
    else if(p.k==='hedge')O.push({k:'hedge',x:p.x,z:p.z,ry:p.ry,hl:.5,hw:.04});          // 공원 둘레 생울타리(길이 12m)
    else if(p.k==='wagon')O.push({k:'wagon',x:p.x,z:p.z,ry:p.ry,hl:.25,hw:.085});       // 철길 위 화차
    else if(p.k==='barrier')O.push({k:'barrier',x:p.x,z:p.z,ry:p.ry,hl:.135,hw:.026});
    else if(p.k==='bin')O.push({k:'bin',x:p.x,z:p.z,ry:p.ry+Math.PI/2,hl:.08,hw:.045});}
  // 싸움 중에 생긴 잔해 차량(3D 화면이 G.covers에 넣는다)
  for(const c of G.covers||[])if(c.kind==='wreck'&&c.cov!=null&&!c.fort)O.push({k:'wreck',x:c.x,z:c.z,ry:0,hl:.15,hw:.15});
  for(const f of G.forts||[])if(f.prog>=1){const d=FORT[f.k];O.push({k:f.k,x:f.x,z:f.z,ry:f.ry,hl:d.len/2,hw:d.w/2,fort:f.id});}
  return O;}
/* 점이 상자(+여유 c) 안에 있나 */
function inBox(o,px,pz,c){const dx=px-o.x,dz=pz-o.z,cs=Math.cos(o.ry),sn=Math.sin(o.ry);const lx=dx*cs-dz*sn,lz=dx*sn+dz*cs;return Math.abs(lx)<=o.hl+c&&Math.abs(lz)<=o.hw+c;}
/* 이동 격자. cost: 0 = 막힘, 그 밖 = 지형 이동 비용(부수고 지나가는 칸은 +4)
   바탕(지형 + 소품 + 잔해 차량)과 방어물 층을 따로 둔다. 방어물이 생기거나 부서지면 바탕을 복사해 방어물만 다시 얹는다.
   지형이 바뀌면(건물 붕괴: damageBldg) G.navV가, 방어물이 바뀌면 G.fortNV가 오른다. 지도를 직접 고친 뒤에는 G.navV를 올려야 한다 */
const NAV={g:null,grids:{},base:{}};
const navWreckN=()=>{let n=0;for(const c of G.covers||[])if(c.kind==='wreck'&&c.cov!=null&&!c.fort)n++;return n;};
function navStamp(cost,W,list,cls,mask){const cs=1/NAV_R,clr=NAV_CLR[cls];   // mask: 이 큰 칸들 안의 작은 칸만 찍는다(navBase 부분 갱신)
  for(const o of list){const rule=NAV_RULE[o.k];const v=rule?rule[cls==='mtn'?'inf':cls]:0;if(!v)continue;const R=Math.max(o.hl,o.hw)+clr+cs;
    const j0=Math.max(0,Math.floor((o.x-R)*NAV_R)),j1=Math.min(W-1,Math.floor((o.x+R)*NAV_R)),i0=Math.max(0,Math.floor((o.z-R)*NAV_R)),i1=Math.min(W-1,Math.floor((o.z+R)*NAV_R));
    for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){const k=i*W+j;if(mask&&!mask[((i/NAV_R)|0)*N+((j/NAV_R)|0)])continue;if(!cost[k])continue;if(!inBox(o,(j+.5)*cs,(i+.5)*cs,clr))continue;
      if(v===2)cost[k]=0;else if(cost[k]<8)cost[k]+=4;}}}
/* navBase 기억: 지형(TC)이 그대로면 지형 층을 다시 쓰고, 장애물이 늘기만 했으면(잔해 차량 추가 등) 새 것만 더 찍는다.
   찍기(navStamp)는 '0으로' 또는 '8 미만이면 +4'라서 순서와 상관없이 결과가 같다 */
const NAVB={};
const navObsKey=o=>o.k+'|'+o.x+'|'+o.z+'|'+o.ry+'|'+o.hl+'|'+o.hw;
function navBase(cls){if(NAV.base[cls])return NAV.base[cls];
  const W=N*NAV_R,clr=NAV_CLR[cls];const ty=cls==='mtn'?'alp':cls==='inf'||cls==='eng'?'rifle':cls==='trk'||cls==='dz'?'tank':'ifv';   // 궤도 차량은 바퀴 차량이 못 가는 땅(상륙 절벽 숲)도 오른다
  const TC=new Uint8Array(N*N);for(let r=0;r<N;r++)for(let c=0;c<N;c++){const m=mcost(ty,G.map[r][c]);TC[r*N+c]=m===Infinity?0:Math.min(250,m);}
  let C=NAVB[cls];
  const tc=(x,z)=>{if(x<0||z<0||x>=N||z>=N)return 0;return TC[(z|0)*N+(x|0)];};const d=clr+.08;
  const terrAt=(i,j)=>{const pz=(i+.5)/NAV_R,px=(j+.5)/NAV_R;let m=tc(px,pz);
    // 차량: 차폭만큼 건물·물 칸에서 떨어진다
    if(m&&clr>.05&&(!tc(px+d,pz)||!tc(px-d,pz)||!tc(px,pz+d)||!tc(px,pz-d)))m=0;return m;};
  if(!C||C.N!==N||C.W!==W||C.clr!==clr||C.TC.length!==TC.length){
    const terr=new Uint8Array(W*W);for(let i=0;i<W;i++)for(let j=0;j<W;j++)terr[i*W+j]=terrAt(i,j);
    C=NAVB[cls]={N,W,clr,TC,terr,keys:null,cost:null,list:null};}
  else{// 바뀐 칸(건물 붕괴 등)과 그 옆 칸만 다시 계산한다(작은 칸 값은 ±1칸 안의 지형만 본다)
    const mask=new Uint8Array(N*N);let any=false;
    for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(C.TC[r*N+c]!==TC[r*N+c]){any=true;for(let a=Math.max(0,r-1);a<=Math.min(N-1,r+1);a++)for(let b=Math.max(0,c-1);b<=Math.min(N-1,c+1);b++)mask[a*N+b]=1;}
    if(any){const terr=C.terr.slice();const R=NAV_R;
      for(let r=0;r<N;r++)for(let c=0;c<N;c++){if(!mask[r*N+c])continue;for(let i=r*R;i<r*R+R;i++)for(let j=c*R;j<c*R+R;j++)terr[i*W+j]=terrAt(i,j);}
      if(C.cost){const cost=C.cost.slice();for(let r=0;r<N;r++)for(let c=0;c<N;c++){if(!mask[r*N+c])continue;for(let i=r*R;i<r*R+R;i++)for(let j=c*R;j<c*R+R;j++)cost[i*W+j]=terr[i*W+j];}
        navStamp(cost,W,C.list,cls,mask);C.cost=cost;}
      C.terr=terr;C.TC=TC;}}
  // 장애물 열쇠는 NAV.obs 하나에 한 번만 만든다(네 부대 종류가 같이 쓴다)
  if(NAVB.obs!==NAV.obs){NAVB.obs=NAV.obs;const L=NAV.obs.filter(o=>!o.fort),K=L.map(navObsKey),M=new Map();for(const k of K)M.set(k,(M.get(k)||0)+1);NAVB.ol={L,K,M};}
  const list=NAVB.ol.L,keys=NAVB.ol.M;
  let cost=null;
  if(C.keys){let sub=true;for(const [k,n] of C.keys)if((keys.get(k)||0)<n){sub=false;break;}
    if(sub){const left=new Map(C.keys);const extra=[],K=NAVB.ol.K;for(let q=0;q<list.length;q++){const k=K[q];const n=left.get(k)||0;if(n>0)left.set(k,n-1);else extra.push(list[q]);}
      cost=C.cost.slice();navStamp(cost,W,extra,cls);}}
  if(!cost){cost=C.terr.slice();navStamp(cost,W,list,cls);}
  C.keys=keys;C.cost=cost;C.list=list;
  return NAV.base[cls]={W,cost};}
function navGrid(cls){const q=NAV.grids[cls];
  if(q&&NAV.g===G&&NAV.nv===(G.navV||0)&&NAV.fv===(G.fortNV||0)&&NAV.cl===(G.covers?G.covers.length:0)&&NAV.pl===(G.props?G.props.length:0))return q;
  const wn=navWreckN(),pl=G.props?G.props.length:0;
  if(NAV.g!==G||NAV.nv!==(G.navV||0)||NAV.wn!==wn||NAV.pl!==pl||NAV.n!==N){NAV.g=G;NAV.nv=G.navV||0;NAV.wn=wn;NAV.pl=pl;NAV.n=N;NAV.base={};NAV.grids={};NAV.fv=null;}
  if(NAV.fv!==(G.fortNV||0)){NAV.fv=G.fortNV||0;NAV.grids={};}
  NAV.cl=G.covers?G.covers.length:0;
  if(NAV.grids[cls])return NAV.grids[cls];
  NAV.obs=navObstacles();const b=navBase(cls);const cost=b.cost.slice();navStamp(cost,b.W,NAV.obs.filter(o=>o.fort),cls);
  if(cls==='veh'||cls==='trk')navOpen(cost,b.W);
  return NAV.grids[cls]={W:b.W,cost};}
/* 차량 격자 다듬기(열림 연산): 3×3 작은 칸(약 7m 네모)이 통째로 비어 있는 곳에 속한 칸만 남긴다.
   주차 차 사이 틈처럼 차 중심은 들어가도 차체(길이 7~8m)가 돌 수 없는 좁은 틈·외딴 칸으로 길을 내지 않게 한다 */
function navOpen(cost,W){const ok=new Uint8Array(W*W);
  for(let i=1;i<W-1;i++)for(let j=1;j<W-1;j++){let f=1;for(let a=-1;a<=1&&f;a++)for(let b=-1;b<=1;b++)if(!cost[(i+a)*W+j+b]){f=0;break;}if(f)ok[i*W+j]=1;}
  for(let i=0;i<W;i++)for(let j=0;j<W;j++){const k=i*W+j;if(!cost[k])continue;let keep=0;
    for(let a=-1;a<=1&&!keep;a++)for(let b=-1;b<=1;b++){const ii=i+a,jj=j+b;if(ii>=0&&jj>=0&&ii<W&&jj<W&&ok[ii*W+jj]){keep=1;break;}}
    if(!keep)cost[k]=0;}}
function navCost(cls,x,z){const g=navGrid(cls);const j=Math.floor(x*NAV_R),i=Math.floor(z*NAV_R);if(i<0||j<0||i>=g.W||j>=g.W)return 0;return g.cost[i*g.W+j];}
/* walkable()가 부른다: 이 점에 서 있을 수 있나 */
function navOk(u,x,z){const c=navCls(u);return !c||navCost(c,x,z)>0;}
/* 선분이 막힌 칸을 지나지 않나 (segClear가 부른다) */
function navSegOk(u,x1,z1,x2,z2){const c=navCls(u);if(!c)return true;const n=Math.max(1,Math.ceil(Math.hypot(x2-x1,z2-z1)/(.5/NAV_R)));
  for(let i=1;i<=n;i++){if(!navCost(c,x1+(x2-x1)*i/n,z1+(z2-z1)*i/n))return false;}return true;}
/* 보병: 작은 칸에서 옆 작은 칸으로 갈 때 칸 경계에 건물 벽이 있으면 문으로만 지난다 (05e-floors의 edgePass·diagPass) */
function navWallOk(i,j,ni,nj){const R=NAV_R,tr=(i/R)|0,tc=(j/R)|0,nr=(ni/R)|0,nc=(nj/R)|0;if(tr===nr&&tc===nc)return true;
  if(tr!==nr&&tc!==nc)return diagPass(tr,tc,nr,nc);
  const d=edgePass(tr,tc,nr,nc);if(d==null)return false;if(d===true)return true;
  if(i!==ni&&j!==nj)return false;// 문은 곧게 지난다
  const cx=tr!==nr?(j+.5)/R:Math.max(tc,nc),cz=tr!==nr?Math.max(tr,nr):(i+.5)/R;return Math.hypot(cx-d[0],cz-d[1])<=DOOR_W;}
/* navPath 작업 배열: W마다 하나. gen을 올려 지난 호출 값을 무효로 만든다 */
const NAVS={};
function navScratch(W){let S=NAVS[W];if(!S||S.gen>=2e9){S=NAVS[W]={D:new Float32Array(W*W),P:new Int32Array(W*W),st:new Uint32Array(W*W),hk:new Int32Array(W*W*8+8),hf:new Float64Array(W*W*8+8),gen:0,em:null,eg:null};}
  S.gen++;return S;}
/* navWallOk를 칸 쌍마다 기억한다: 큰 칸(r,c)에서 8방향(d) 옆 칸으로. 문 위치가 있으면 작은 칸마다 거리 검사만 다시 한다 */
function navWallMemo(S,gen){const M=N*N*8;if(!S.em||S.em.length!==M){S.em=new Array(M);S.eg=new Uint32Array(M);}const em=S.em,eg=S.eg,R=NAV_R;
  return (i,j,ni,nj)=>{const tr=(i/R)|0,tc=(j/R)|0,nr=(ni/R)|0,nc=(nj/R)|0;if(tr===nr&&tc===nc)return true;
    const di=nr-tr+1,dj=nc-tc+1,q=(tr*N+tc)*8+(di*3+dj>4?di*3+dj-1:di*3+dj);
    let d;if(eg[q]===gen)d=em[q];else{d=tr!==nr&&tc!==nc?(diagPass(tr,tc,nr,nc)?true:null):edgePass(tr,tc,nr,nc);em[q]=d;eg[q]=gen;}
    if(d==null)return false;if(d===true)return true;
    if(i!==ni&&j!==nj)return false;// 문은 곧게 지난다
    const cx=tr!==nr?(j+.5)/R:Math.max(tc,nc),cz=tr!==nr?Math.max(tr,nr):(i+.5)/R;return Math.hypot(cx-d[0],cz-d[1])<=DOOR_W;};}
/* A* 경로: 작은 칸 단위. 목표에 못 가면 가장 가까운 곳까지. 반환: 작은 칸 중심점 목록(꺾이는 곳만) */
function navPath(u,x,z){const cls=navCls(u);if(!cls)return null;const g=navGrid(cls),W=g.W,C=g.cost;
  const cl=v=>Math.max(0,Math.min(W-1,v));let s=cl(Math.floor(u.z*NAV_R))*W+cl(Math.floor(u.x*NAV_R));const gi=cl(Math.floor(z*NAV_R)),gj=cl(Math.floor(x*NAV_R)),goal=gi*W+gj;
  const pre=[];
  if(!C[s]){// 장애물 안에 끼어 있으면 가장 가까운 빈 칸으로 먼저 나온다
    const si=Math.floor(s/W),sj=s%W;let bk=-1,bd=1e9;for(let a=-4;a<=4;a++)for(let b=-4;b<=4;b++){const i=si+a,j=sj+b;if(i<0||j<0||i>=W||j>=W||!C[i*W+j])continue;const d=a*a+b*b;if(d<bd){bd=d;bk=i*W+j;}}
    if(bk<0)return [];s=bk;pre.push([(bk%W+.5)/NAV_R,(Math.floor(bk/W)+.5)/NAV_R]);}
  // 작업 배열은 지도 크기마다 하나씩 두고 다시 쓴다(부를 때마다 새로 만들면 느리다). gen 도장이 이번 호출 값이면 유효, 아니면 D=∞·P=-1·done=0
  const S=navScratch(W);const gen=S.gen,D=S.D,P=S.P,st=S.st,g2=gen*2,g3=gen*2+1;   // st: gen*2 = 열림(D·P 유효), gen*2+1 = 닫힘
  // 휴리스틱을 조금 부풀려(×1.15) 훑는 칸 수를 줄인다. 경로는 거의 최단 그대로
  const H=k=>{const i=(k/W)|0,di=i>gi?i-gi:gi-i,j=k-i*W,dj=j>gj?j-gj:gj-j;return (di>dj?di+.414*dj:dj+.414*di)*1.15;};
  const hk=S.hk,hf=S.hf;let hn=0;
  const push=(k,f)=>{let i=hn++;while(i>0){const p=(i-1)>>1;if(hf[p]<=f)break;hk[i]=hk[p];hf[i]=hf[p];i=p;}hk[i]=k;hf[i]=f;};
  const pop=()=>{const k=hk[0];hn--;if(hn>0){const lk=hk[hn],lf=hf[hn];let i=0;for(;;){const l=2*i+1,r=l+1;let m=i,mf=lf;if(l<hn&&hf[l]<mf){m=l;mf=hf[l];}if(r<hn&&hf[r]<mf)m=r;if(m===i)break;hk[i]=hk[m];hf[i]=hf[m];i=m;}hk[i]=lk;hf[i]=lf;}return k;};
  const walls=(cls==='inf'||cls==='eng'||cls==='mtn')&&typeof edgePass==='function';
  // 칸 경계를 지날 수 있는지(navWallOk)는 이번 길찾기 동안 지도가 그대로라 칸 쌍마다 한 번만 계산한다
  const wok=walls?navWallMemo(S,gen):null;
  D[s]=0;P[s]=-1;st[s]=gen*2;push(s,H(s));let best=s,bh=H(s),n=0;
  while(hn&&n++<120000){const k=pop();if(st[k]===g3)continue;st[k]=g3;if(k===goal){best=k;break;}const h=H(k);if(h<bh){bh=h;best=k;}
    const i=(k/W)|0,j=k-i*W,dk=D[k];
    for(let a=-1;a<=1;a++){const ni=i+a;if(ni<0||ni>=W)continue;for(let b=-1;b<=1;b++){if(!a&&!b)continue;const nj=j+b;if(nj<0||nj>=W)continue;const nk=ni*W+nj;const c=C[nk];if(!c||st[nk]===g3)continue;
      if(a&&b&&(!C[i*W+nj]||!C[ni*W+j]))continue;
      if(walls&&!wok(i,j,ni,nj))continue;
      const nd=dk+c*(a&&b?1.414:1);if(nd<(st[nk]>=g2?D[nk]:Infinity)){D[nk]=nd;P[nk]=k;st[nk]=g2;push(nk,nd+H(nk));}}}}
  const Pk=k=>st[k]>=gen*2?P[k]:-1;
  const cells=[];let k=best;while(k!==s&&k>=0){cells.push(k);k=Pk(k);}cells.reverse();
  // 방향이 바뀌는 곳만 남긴다
  const out=pre.slice();let pd=null;const pt=c=>[(c%W+.5)/NAV_R,(Math.floor(c/W)+.5)/NAV_R];
  const tileOf=c=>[((c/W|0)/NAV_R)|0,((c%W)/NAV_R)|0];
  for(let q=0;q<cells.length;q++){const pv=q?cells[q-1]:s;const d=cells[q]-pv;
    if(walls){const [r0,c0]=tileOf(pv),[r1,c1]=tileOf(cells[q]);// 문을 지나는 곳은 문 앞(a)·문 안(b) 두 점으로 꼭 남긴다
      if((r0!==r1||c0!==c1)&&Array.isArray(edgePass(r0,c0,r1,c1))){const A=pt(pv),B=pt(cells[q]);A.door='a';B.door='b';
        if(out.length&&out[out.length-1][0]===A[0]&&out[out.length-1][1]===A[1])out.pop();out.push(A,B);pd=null;continue;}}
    if(q&&d!==pd&&pd!==null)out.push(pt(pv));pd=d;}
  if(cells.length){const L=pt(cells[cells.length-1]),e=out[out.length-1];if(!e||e[0]!==L[0]||e[1]!==L[1])out.push(L);}
  out.reached=best===goal;return out;}

/* ---------- 방어물 ---------- */
let FORT_ID=1;
function fortShape(f){const d=FORT[f.k];return {x:f.x,z:f.z,ry:f.ry,hl:d.len/2,hw:d.w/2};}
/* 위협 방향(벽이 바라볼 쪽): 가까이 보이는 적, 없으면 적 쪽(지도 가운데 방향) */
function fortFront(n,x,z){let best=null,bd=8;for(const e of G.units){if(e.nat===n||(G.fog&&!seen(e,n)))continue;const d=Math.hypot(e.x-x,e.z-z);if(d<bd){bd=d;best=e;}}
  let fx,fz;if(best){fx=best.x-x;fz=best.z-z;}else{const m=N/2;fx=m-x;fz=m-z;if(Math.hypot(fx,fz)<1){const e=[[1,0],[-1,0],[0,1],[0,-1]][n]||[1,0];fx=e[0];fz=e[1];}}
  const L=Math.hypot(fx,fz)||1;return [fx/L,fz/L];}
/* 놓일 방향: 도로 위면 도로를 가로질러, 아니면 위협 방향을 마주 보게 */
function fortPose(n,x,z){let [fx,fz]=fortFront(n,x,z);const r=Math.floor(z),c=Math.floor(x);const rd=(a,b)=>inb(a,b)&&G.map[a][b].t==='road';
  if(rd(r,c)){const h=rd(r,c-1)||rd(r,c+1),v=rd(r-1,c)||rd(r+1,c);if(h&&!v){fx=Math.sign(fx)||1;fz=0;}else if(v&&!h){fx=0;fz=Math.sign(fz)||1;}}
  return {ry:Math.atan2(-fx,-fz),fx,fz};}
function fortCanPlace(n,k,x,z){const t=tileAt(x,z);if(!t)return '지도 밖입니다';if(t.t==='bldg'||t.t==='water')return '건물·물 위에는 지을 수 없습니다';
  for(const f of G.forts||[])if(Math.hypot(f.x-x,f.z-z)<.16)return '이미 방어물이 있습니다';
  if(!navCost('inf',x,z))return '차나 철조망에 막힌 자리입니다';
  return null;}
/* 명령: 부대 u가 (x,z)에 방어물 k를 짓는다. 성공하면 방어물, 실패하면 이유 문자열 */
function orderFort(u,k,x,z){const d=FORT[k];if(!d||!fortKinds(u.type).includes(k))return '이 부대는 지을 수 없습니다';const N2=G.nats[u.nat];
  if(N2.cp<d.cost)return '지휘점수가 모자랍니다';const why=fortCanPlace(u.nat,k,x,z);if(why)return why;
  const {ry,fx,fz}=fortPose(u.nat,x,z);G.forts=G.forts||[];const f={id:FORT_ID++,k,nat:u.nat,x,z,ry,hp:d.hp,prog:0,paid:d.cost};G.forts.push(f);N2.cp-=d.cost;
  // 방어물 뒤(위협 반대쪽)에 서서 짓는다
  // 참호·진지는 안에서, 나머지는 뒤에서 짓는다
  let sx=d.inside?x:x-fx*(d.w/2+.1),sz=d.inside?z:z-fz*(d.w/2+.1);if(!walkable(u,sx,sz)){sx=x;sz=z;}
  if(u.job)fortCancel(u);u.tgt=null;u.tgtTile=null;u.dest=[sx,sz];u.path=pathPts(u,sx,sz);u.job={id:f.id,x:sx,z:sz};G.fortV=(G.fortV||0)+1;bump();return f;}
function fortCancel(u){const j=u.job;u.job=null;if(!j)return;const f=(G.forts||[]).find(o=>o.id===j.id);
  if(f&&f.prog<1&&!G.units.some(o=>o!==u&&o.job&&o.job.id===f.id)){if(f.prog<.05)G.nats[f.nat].cp+=f.paid||0;fortRemove(f);}}
function fortRemove(f,why){const was=G.forts.includes(f);G.forts=G.forts.filter(o=>o!==f);if(!was)return;if(f.prog>=1){fortCovers();G.fortNV=(G.fortNV||0)+1;}
  G.fortV=(G.fortV||0)+1;if(why&&FXH.fortGone)FXH.fortGone(f,why);bump();}
/* 다 지은 방어물을 엄폐 목록(G.covers)에 넣는다. 길이 방향으로 원 세 개 */
function fortCovers(){G.covers=(G.covers||[]).filter(c=>!c.fort);
  for(const f of G.forts||[]){if(f.prog<1)continue;const d=FORT[f.k];if(!d.cov)continue;const ax=Math.cos(f.ry),az=-Math.sin(f.ry);const n=d.len>.2?3:1;
    if(f.k==='nest'){// 앞쪽 반원(로컬 −z)에 엄폐 셋
      const cs=Math.cos(f.ry),sn=Math.sin(f.ry);for(const a of [-.9,0,.9]){const lx=Math.sin(a)*.12,lz=-Math.cos(a)*.12;G.covers.push({x:f.x+lx*cs+lz*sn,z:f.z-lx*sn+lz*cs,r:.07,kind:'nest',cov:d.cov,h:d.h,fort:f.id});}continue;}
    for(let i=0;i<n;i++){const s=n===1?0:(i-1)*d.len/3;G.covers.push({x:f.x+ax*s,z:f.z+az*s,r:Math.max(.08,d.len/(n*2)),kind:f.k,cov:d.cov,h:d.h,fort:f.id});}}}
/* 이 점이 다 지은 참호 안인가 (04c coverOf·coverAt이 부른다) */
function trenchAt(x,z){for(const f of G.forts||[])if(f.k==='trench'&&f.prog>=1&&inBox(fortShape(f),x,z,.01))return true;return false;}
/* 매 틱: 짓기 진행 */
function fortTick(dt){if(!G.forts)G.forts=[];
  for(const u of G.units){const j=u.job;if(!j)continue;const f=G.forts.find(o=>o.id===j.id);if(!f||f.prog>=1){u.job=null;continue;}
    if(!u.dest||Math.hypot(u.dest[0]-j.x,u.dest[1]-j.z)>.01){fortCancel(u);continue;}// 다른 명령을 받았다
    const near=Math.hypot(u.x-j.x,u.z-j.z)<.3;const moving=u.path&&u.path.length;
    if(!near){if(!moving)fortCancel(u);continue;}if(moving)continue;
    const d=FORT[f.k];f.prog=Math.min(1,f.prog+dt/d.bt*(u.type==='eng'?1.8:1)*(u.supp>0?.4:1));u.face=Math.atan2(f.z-u.z,f.x-u.x)*180/Math.PI;
    if(f.prog>=1){u.job=null;fortCovers();G.fortNV=(G.fortNV||0)+1;G.fortV=(G.fortV||0)+1;bump();if(!isAI(u.nat)||!G.fog)L(`${natName(u.nat)} ${d.n} 설치 완료`);try{sfx('build');}catch(e){}
      // 방어물 자리에 걸친 부대는 살짝 밀어낸다
      for(const o of G.units)if(!navOk(o,o.x,o.z)&&o.path&&!o.path.length){const p=navPath(o,o.x,o.z);if(p&&p.length)o.path=[p[0]];}}}}
/* 차량이 가벼운 방어물을 깔고 지나가면 부서진다. 공병은 철조망을 끊는다 */
function fortCrush(u){const cls=navCls(u);if(!cls||cls==='inf'||cls==='mtn'||!G.forts||!G.forts.length)return;
  for(const f of G.forts.slice()){if(f.prog<1)continue;const r=NAV_RULE[f.k][cls];if(r!==1)continue;
    if(!inBox(fortShape(f),u.x,u.z,NAV_CLR[cls]*.8))continue;
    if(cls==='eng'){f.hp-=.25;if(f.hp>0)continue;}
    fortRemove(f,'crush');}}
/* 폭발: (x,z) 둘레 rad 안의 방어물이 부서진다 */
function fortBlast(x,z,rad,amt){if(!G.forts||!G.forts.length)return;
  for(const f of G.forts.slice()){const d=Math.hypot(f.x-x,f.z-z)-FORT[f.k].len/2;if(d>rad)continue;f.hp-=amt*(1-Math.max(0,d)/(rad+.01)*.6);if(f.hp<=0)fortRemove(f,'blast');}}
/* AI: 거점 둘레에서 쉬고 있는 보병이 가끔 모래주머니·방벽을 쌓는다 */
function aiFort(n){const N2=G.nats[n];if(N2.cp<6||Math.random()>.35)return;const mine=(G.forts||[]).filter(f=>f.nat===n).length;
  const own=G.objs.filter(o=>G.map[o.r][o.c].owner===n);if(mine>=4+own.length*3)return;
  const eVeh=G.units.some(e=>e.nat!==n&&UT[e.type].cls==='veh'&&seen(e,n));
  for(const u of G.units){if(u.nat!==n||u.job||(u.path&&u.path.length)||u.tgt!=null)continue;const ks=fortKinds(u.type);if(!ks.length||u.type==='sniper'||u.type==='mortar')continue;
    const o=own.find(q=>Math.hypot(q.c+.5-u.x,q.r+.5-u.z)<2.5);if(!o)continue;
    const [fx,fz]=fortFront(n,u.x,u.z);const x=u.x+fx*.22,z=u.z+fz*.22;if((G.forts||[]).some(f=>Math.hypot(f.x-x,f.z-z)<.45))continue;
    const t=tileAt(x,z);const p=Math.random();const k=u.type==='eng'&&eVeh&&t&&t.t==='road'&&ks.includes('hedgehog')?'hedgehog':u.type==='eng'&&p<.3?'jersey':u.type==='mg'&&p<.6?'nest':t&&t.t!=='road'&&p<.45&&ks.includes('trench')?'trench':'sandbag';
    if(N2.cp-FORT[k].cost<4)return;if(typeof orderFort(u,k,x,z)!=='string')return;}}
