/* ===================== SIGHT: 칸 없는 시야 =====================
   시야선은 부대의 실제 위치(x=열, z=행)에서 상대의 실제 위치까지 곧게 쏜 광선이다.
   건물은 칸마다 상자(화면과 같은 여백 BLD_IN)로 보고, 광선이 상자를 지나는 구간에서
   광선 높이가 건물보다 낮으면 막힌다. 높이 단위는 층.
   시야 범위는 원형(유클리드 거리)이고, 전장의 안개는 한 칸을 FOW_R×FOW_R 점으로 잘게 나눠 계산한다. */
const BLD_IN=.08;              // 건물 외벽이 칸 가장자리에서 들어간 정도 (07-view3d와 같게)
const FOW_R=3;                 // 안개 해상도: 한 칸당 점 수 (가로·세로)
const SPOT_HIDE=.6;            // 숨은 보병(건물·공원·연막 안)은 이 비율 거리에서야 발견된다
const FIRE_REVEAL=4;           // 쏜 뒤 이 초 동안은 숨어 있어도 드러난다

/* 부대의 현재 위치. AI가 가상의 칸(r,c)으로 옮겨 놓고 계산할 때는 그 칸 중심을 쓴다. */
function posOf(u){if(u.x!=null&&Math.floor(u.x)===u.c&&Math.floor(u.z)===u.r)return [u.x,u.z];return [u.c+.5,u.r+.5];}
const udist=(a,b)=>{const [ax,az]=posOf(a),[bx,bz]=posOf(b);return Math.hypot(ax-bx,az-bz);};

/* 눈높이 (층 단위). 건물 안 보병은 그 건물 높이에서 본다. */
function eyeAt(type,r,c){const t=UT[type];if(t.fly)return 9;const x=cell(r,c);if(x.t==='bldg')return t.ind?bldgH(x)+.3:Math.max(.5,x.f-.5);return t.cls==='veh'?.8:.5;}
/* 실제 부대: 건물 안이면 지금 서 있는 층에서 본다(05e-floors). */
const eye=u=>{const e=eyeAt(u.type,u.r,u.c);if(UT[u.type].cls!=='inf'||cell(u.r,u.c).t!=='bldg'||typeof curFl!=='function')return e;return flEye(u);};
/* 건물 높이(층). 많이 부서지면 낮아진다(화면과 같은 식). */
function bldgH(x){if(x.t!=='bldg')return 0;const dmg=1-x.bhp/x.bmax;return dmg>.5?x.f*(1-(dmg-.5)*.6):x.f;}
function blockH(x){if(x.smoke>0)return 99;return bldgH(x);}
/* 건물 칸의 상자 [x0,x1,z0,z1]. 같은 블록 건물과 붙은 면은 여백 없이 잇는다. */
function bldgBox(r,c){const x=G.map[r][c];const same=(a,b)=>inb(a,b)&&G.map[a][b].t==='bldg'&&x.blk!=null&&G.map[a][b].blk===x.blk;
  return [c+(same(r,c-1)?0:BLD_IN),c+1-(same(r,c+1)?0:BLD_IN),r+(same(r-1,c)?0:BLD_IN),r+1-(same(r+1,c)?0:BLD_IN)];}
/* 선분(x1,z1)→(x2,z2)이 상자를 지나는 구간 [t0,t1], 안 지나면 null */
function segBox(x1,z1,x2,z2,b){let t0=0,t1=1;const dx=x2-x1,dz=z2-z1;
  for(const [p,d,lo,hi] of [[x1,dx,b[0],b[1]],[z1,dz,b[2],b[3]]]){if(Math.abs(d)<1e-9){if(p<lo||p>hi)return null;continue;}
    let a=(lo-p)/d,c=(hi-p)/d;if(a>c)[a,c]=[c,a];t0=Math.max(t0,a);t1=Math.min(t1,c);if(t0>t1)return null;}
  return [t0,t1];}
/* 시야선: 실제 좌표 사이. 지나는 칸을 DDA로 차례로 밟는다.
   건물 안(눈높이가 건물 높이보다 낮음)에 있는 끝점은 창가에서만 밖이 보인다:
   광선이 자기 칸 상자를 바깥쪽 외벽(같은 블록과 붙지 않은 면)으로, WIN칸 안에서 빠져나가야 한다.
   옥상(눈높이가 건물 높이 이상)이면 자기 칸은 가리지 않는다. 같은 블록의 다른 칸도 보통 건물처럼 가린다. */
const WIN=.4;
const TREE_H=2;                // 공원 나무 높이(층). 이보다 낮게 지나는 시야선만 숲에 가린다
const WOOD_L=1.6;              // 숲을 이 길이(칸)보다 오래 지나면 안 보인다(약 20m)
/* 선 자리의 지면 높이(층): 건물 칸은 다진 칸 높이, 나머지는 꼭짓점 높이를 보간한 실제 비탈 높이 */
function gndAt(x,z){if(!G.elv)return 0;const r=Math.floor(z),c=Math.floor(x);if(!inb(r,c))return 0;const t=G.map[r][c];return t.t==='bldg'?t.el||0:elAt(x,z);}
function losOwn(r,c,rr,cc){return r===rr&&c===cc;}
/* 끝점 P(px,pz,ph)가 다른 끝 O를 향해 자기 칸을 벗어날 수 있는가 */
function losEnd(px,pz,ph,ox,oz,oh){const r=Math.floor(pz),c=Math.floor(px);if(!inb(r,c))return true;const x=G.map[r][c];if(x.t!=='bldg')return true;
  const bh=bldgH(x)+(x.el||0);   /* 높이는 지형 높이(03a)를 더한 절대값 */if(ph>=bh-.05)return true;const b=bldgBox(r,c);const s=segBox(px,pz,ox,oz,b);if(!s)return true;
  const L=Math.hypot(ox-px,oz-pz);const inside=px>=b[0]&&px<=b[1]&&pz>=b[2]&&pz<=b[3];
  if(!inside){const hmin=Math.min(ph+(oh-ph)*s[0],ph+(oh-ph)*s[1]);return bh<hmin-.05;}
  if(s[1]>=1-1e-9)return true;                       // 같은 방 안
  if(s[1]*L>WIN)return false;                         // 창에서 너무 멀다
  const ex=px+(ox-px)*s[1],ez=pz+(oz-pz)*s[1],e=1e-6;
  return (Math.abs(ex-b[0])<e&&b[0]>c+e)||(Math.abs(ex-b[1])<e&&b[1]<c+1-e)||(Math.abs(ez-b[2])<e&&b[2]>r+e)||(Math.abs(ez-b[3])<e&&b[3]<r+1-e);}
function losPt(x1,z1,h1,x2,z2,h2){const dx=x2-x1,dz=z2-z1;
  const r1=Math.floor(z1),c1=Math.floor(x1),r2=Math.floor(z2),c2=Math.floor(x2);
  if(inb(r1,c1)&&inb(r2,c2)){const A=G.map[r1][c1],B=G.map[r2][c2];
    if(r1===r2&&c1===c2&&A.t==='bldg'){const bh=bldgH(A);if((h1<bh-.05||h2<bh-.05)&&Math.abs(h1-h2)>=.6)return false;}  // 같은 칸 다른 층: 바닥·천장이 막는다
    if(A.t==='bldg'&&B.t==='bldg'&&A.blk!=null&&A.blk===B.blk&&Math.abs(r1-r2)+Math.abs(c1-c2)<=1&&Math.abs(h1-h2)<.6&&h1<bldgH(A)&&h2<bldgH(B))return true;}  // 같은 건물 같은 층의 옆방
  if(G.elv){h1+=gndAt(x1,z1);h2+=gndAt(x2,z2);}   // 언덕 위 눈높이(비탈이면 선 자리 높이)
  if(!losEnd(x1,z1,h1,x2,z2,h2)||!losEnd(x2,z2,h2,x1,z1,h1))return false;
  if(r1===r2&&c1===c2)return true;
  const L=Math.hypot(dx,dz);let wood=0;
  let c=c1,r=r1;const sx=dx>0?1:-1,sz=dz>0?1:-1;
  const tdx=Math.abs(dx)>1e-12?Math.abs(1/dx):Infinity,tdz=Math.abs(dz)>1e-12?Math.abs(1/dz):Infinity;
  let tmx=Math.abs(dx)>1e-12?((dx>0?c+1-x1:x1-c)*tdx):Infinity,tmz=Math.abs(dz)>1e-12?((dz>0?r+1-z1:z1-r)*tdz):Infinity;
  for(let g=0;g<4*N;g++){if(tmx<tmz){c+=sx;tmx+=tdx;}else{r+=sz;tmz+=tdz;}
    if(Math.min(tmx,tmz)>1+tdx&&Math.min(tmx,tmz)>1+tdz)break;
    if(!inb(r,c))break;if(r===r2&&c===c2)break;
    const x=G.map[r][c];const te=x.el||0;
    if(G.elv&&x.t!=='bldg'&&Math.max(G.elv[r*(N+1)+c],G.elv[r*(N+1)+c+1],G.elv[(r+1)*(N+1)+c],G.elv[(r+1)*(N+1)+c+1])>Math.min(h1,h2)-.5){
      const s=segBox(x1,z1,x2,z2,[c,c+1,r,r+1]);if(s){for(const t of [s[0],(s[0]+s[1])/2,s[1]]){if(elAt(x1+dx*t,z1+dz*t)>h1+(h2-h1)*t-.05)return false;}}}   // 땅(언덕 능선)이 가린다: 칸 안 세 점의 실제 지면 높이
    if(x.t==='park'&&!x.yard&&!(x.smoke>0)){const s=segBox(x1,z1,x2,z2,[c,c+1,r,r+1]);   // 숲: 나무 높이(약 6m)보다 낮게 숲을 오래 지나면 가린다
      if(s&&Math.min(h1+(h2-h1)*s[0],h1+(h2-h1)*s[1])<te+TREE_H){wood+=(s[1]-s[0])*L;if(wood>WOOD_L)return false;}continue;}
    if(!(x.smoke>0)&&x.t!=='bldg')continue;
    if(x.t!=='bldg')return false;           // 연막
    const bh=x.smoke>0?99:bldgH(x)+te;const s=segBox(x1,z1,x2,z2,bldgBox(r,c));if(!s)continue;
    const hmin=Math.min(h1+(h2-h1)*s[0],h1+(h2-h1)*s[1]);if(bh>=hmin-.05)return false;}
  if(typeof propBlocks==='function'&&propBlocks(x1,z1,h1,x2,z2,h2))return false;   // 세워 둔 차·불탄 차(04c-cover)
  return true;}
/* 건물 칸 (r,c) 안에서 (tx,tz)를 향한 창가 자리: 바깥쪽 외벽에서 .16칸 안쪽. 바깥 벽이 없으면 null */
function winPt(r,c,tx,tz){const b=bldgBox(r,c),e=1e-6;const cand=[];const cx=c+.5,cz=r+.5;
  const along=(v,lo,hi)=>Math.min(hi-.14,Math.max(lo+.14,v));
  if(b[0]>c+e)cand.push([b[0]+.16,along(tz,b[2],b[3])]);if(b[1]<c+1-e)cand.push([b[1]-.16,along(tz,b[2],b[3])]);
  if(b[2]>r+e)cand.push([along(tx,b[0],b[1]),b[2]+.16]);if(b[3]<r+1-e)cand.push([along(tx,b[0],b[1]),b[3]-.16]);
  if(!cand.length)return null;let best=null,bd=1e9;for(const p of cand){const d=Math.hypot(p[0]-tx,p[1]-tz);if(d<bd){bd=d;best=p;}}return best;}
/* 예전 칸 단위 호출(칸 중심끼리)도 그대로 쓸 수 있게 둔다 */
function los(r1,c1,h1,r2,c2,h2){return losPt(c1+.5,r1+.5,h1,c2+.5,r2+.5,h2);}
/* 부대 a가 부대 b를 시야선으로 보는가 */
function losU(a,b){const [ax,az]=posOf(a),[bx,bz]=posOf(b);return losPt(ax,az,eye(a),bx,bz,eye(b));}

function visRange(u){const t=UT[u.type];let v=t.vis;const x=cell(u.r,u.c);if(x.t==='bldg'){const f=Math.round(eye(u)+.5);v+=f>=5?2:f>=3?1:0;}else if(x.el){v+=x.el>=3?2:x.el>=1.5?1:0;}   // 언덕 위는 멀리 본다
  v+=typeof envVis==='function'?envVis(u):(isNight()?-(t.fly?1:2):0)+WX[G.wx].vis;if(x.smoke>0&&!t.fly)v=1;return Math.max(1,v);}
/* 숨은 상태: 쏜 지 얼마 안 됐으면 드러난다 */
const firedRecently=e=>e.firedT!=null&&(G.time||0)-e.firedT<FIRE_REVEAL;
function concealed(e){const t=UT[e.type];if(t.fly||t.cls!=='inf')return false;if(firedRecently(e))return false;const x=cell(e.r,e.c);return x.t==='bldg'||x.t==='park'||x.smoke>0;}

/* 지형 상태 요약: 시야 캐시를 지형이 바뀔 때만 버리려고 쓴다 */
function terrSig(){const c=G._ts;if(c&&c.ver===G.ver)return c.s;let s=0;
  for(let r=0;r<N;r++)for(let q=0;q<N;q++){const x=G.map[r][q];const v=(x.t==='bldg'?Math.round(bldgH(x)*2)*7+1:x.t==='rubble'?2:0)+(x.smoke>0?3:0);s=(Math.imul(s,31)+Math.round(v*10)+r*q)|0;}
  G._ts={ver:G.ver,s};return s;}

/* 한 부대가 보는 안개 점들: 사방으로 광선을 뻗어 가며 지금까지 가장 가파른 장애물보다 높이 보이는 점만 남긴다(높이맵 시야).
   위치가 1/4칸 이상 움직이거나 지형이 바뀔 때만 다시 계산한다. */
function unitFov(u){const [ux,uz]=posOf(u);const qx=Math.round(ux*4)/4,qz=Math.round(uz*4)/4;const v=visRange(u),h=eye(u);const sig=terrSig();
  const ar=typeof fovArc==='function'?fovArc(u):null;const ck=qx+','+qz+','+v+','+h+','+sig+','+N+(ar?','+ar.key:'');if(u._fov&&u._fov.k===ck)return u._fov.p;
  const M=N*FOW_R;const r1=u.r,c1=u.c;
  // 칸별 건물 상자·높이를 한 번만 구한다
  const bx0=Math.max(0,Math.floor(qx-v)),bx1=Math.min(N-1,Math.floor(qx+v)),bz0=Math.max(0,Math.floor(qz-v)),bz1=Math.min(N-1,Math.floor(qz+v));
  const W=bx1-bx0+1;const TB=new Array(W*(bz1-bz0+1));
  for(let r=bz0;r<=bz1;r++)for(let c=bx0;c<=bx1;c++){const x=G.map[r][c];const own=r===r1&&c===c1;
    TB[(r-bz0)*W+c-bx0]=x.t==='bldg'?{b:bldgBox(r,c),h:bldgH(x),sm:x.smoke>0&&!own,own,e:x.el||0}:{b:null,h:0,sm:x.smoke>0&&!own,own,e:x.el||0,wd:x.t==='park'&&!x.yard};}
  // 건물 안이면 창가로만 내다본다
  const oc=G.map[r1]&&G.map[r1][c1];const h0=h+gndAt(qx,qz);   // 지형 높이를 더한 눈높이
  const inB=oc&&oc.t==='bldg'&&h<bldgH(oc)-.05?bldgBox(r1,c1):null;
  const gi0=Math.max(0,Math.floor((qx-v)*FOW_R)),gj0=Math.max(0,Math.floor((qz-v)*FOW_R)),GW=Math.min(M,Math.ceil((qx+v)*FOW_R)+1)-gi0,GH=Math.min(M,Math.ceil((qz+v)*FOW_R)+1)-gj0;
  const mk=new Uint8Array(GW*GH);const mark=(px,pz)=>{const i=Math.floor(px*FOW_R)-gi0,j=Math.floor(pz*FOW_R)-gj0;if(i>=0&&j>=0&&i<GW&&j<GH)mk[j*GW+i]=1;};
  mark(qx,qz);
  const nr=Math.ceil(2*Math.PI*v*FOW_R*1.6),st=.5/FOW_R;
  for(let k=0;k<nr;k++){const a=k/nr*2*Math.PI,cx=Math.cos(a),cz=Math.sin(a);let maxS=-Infinity;let dOut=-1,dEnd=ar?v*ar.k(a):v,wood=0;   // 시야각(05k-optics): 해치 닫은 전차는 옆·뒤가 짧다
    if(inB){const s=segBox(qx,qz,qx+cx*v,qz+cz*v,inB);if(s&&s[0]<1e-9){dOut=s[1]*v;if(!losEnd(qx,qz,h0,qx+cx*v,qz+cz*v,h0))dEnd=Math.min(v,dOut+.05);}}
    for(let d=st;d<=dEnd;d+=st){const px=qx+cx*d,pz=qz+cz*d;if(px<0||pz<0||px>=N||pz>=N)break;const r=Math.floor(pz),c=Math.floor(px);
      const T=TB[(r-bz0)*W+c-bx0];if(!T)break;let bh=0,th=.3;
      if(!(T.own&&(d<=dOut||!inB))){if(T.b&&px>=T.b[0]&&px<=T.b[1]&&pz>=T.b[2]&&pz<=T.b[3]){bh=T.h;th=Math.max(.5,T.h-.3);}if(T.sm)bh=99;}
      const ge=T.b?T.e:G.elv?elAt(px,pz):0;th+=ge;if(bh>0)bh+=ge;else if(ge>0&&!T.own)bh=ge;     // 땅 자체도 가린다(언덕 너머)
      if(T.wd&&!T.own){if(h0<ge+TREE_H+.3)wood+=st;if(wood>WOOD_L)bh=Math.max(bh,ge+TREE_H);}   // 숲을 오래 지나면 나무 높이만큼 가린다
      if(d<.9||(th-h0)/d>=maxS-.02)mark(px,pz);
      if(bh>0){const sl=(bh-h0)/d;if(sl>maxS)maxS=sl;}}}
  const out=[];for(let j=0;j<GH;j++)for(let i=0;i<GW;i++)if(mk[j*GW+i])out.push((j+gj0)*M+i+gi0);
  u._fov={k:ck,p:out};return out;}
/* 세력 n의 시야: 칸 집합(예전 호환) + 잘게 나눈 안개 점(.fine). 위치가 계속 바뀌므로 0.25초마다 갱신 */
function visSet(n){const ck='v'+n;G._vc=G._vc||{};const tq=Math.floor((G.time||0)*4);const c0=G._vc[ck];if(c0&&c0.ver===G.ver&&c0.tq===tq)return c0.s;
  const M=N*FOW_R;const fine=new Uint8Array(M*M);const s=new Set();
  for(const u of G.units){if(u.nat!==n)continue;for(const p of unitFov(u)){if(fine[p])continue;fine[p]=1;const i=p%M,j=(p-i)/M;s.add(key(Math.floor(j/FOW_R),Math.floor(i/FOW_R)));}
    s.add(key(u.r,u.c));}
  s.fine=fine;s.R=FOW_R;G._vc[ck]={ver:G.ver,tq,s};return s;}
/* 실제 좌표 한 점이 세력 n에게 보이는가 */
function seenPt(n,x,z){const s=visSet(n);const M=N*FOW_R;const i=Math.floor(x*FOW_R),j=Math.floor(z*FOW_R);if(i<0||j<0||i>=M||j>=M)return false;return !!s.fine[j*M+i];}

/* 세력 n이 부대 e를 보는가: n의 부대 중 하나라도 시야 거리 안에서 시야선이 트이면 보인다.
   숨은 보병은 더 가까이 와야 보이고, 건물 안 저격수는 바로 옆(1.5칸)이어야 보인다. 쏘면 잠시 드러난다. */
function spots(u,e){const t=UT[e.type];if(typeof stairHid==='function'&&stairHid(e,u))return false;let v=visRange(u)+(t.cls==='veh'?1:t.fly?1:0);
  if(concealed(e))v*=SPOT_HIDE;
  if(t.hide&&inside(e)&&!firedRecently(e)&&e.shot!==G.turn)v=Math.min(v,1.5);
  const d=udist(u,e);if(d>v)return false;return d<.9||losU(u,e);}
/* spots()가 쓰는 시야 거리의 상한: 가장 먼 병종 시야 + 고층 보너스 2 + 차량·항공 1 + 날씨 */
function visMax(){const w=G.wx;if(G._vmx&&G._vmx.w===w)return G._vmx.v;let m=0;for(const k in UT)m=Math.max(m,UT[k].vis||0);
  const v=m+3+Math.max(0,WX[w].vis)+(G.elv?2:0);Object.defineProperty(G,'_vmx',{value:{w,v},writable:true,configurable:true,enumerable:false});return v;}
/* seen 캐시 열쇠. 예전 문자열 열쇠 e.id+':'+e.r+','+e.c 와 똑같이 갈린다(문자열 "16"과 숫자 16은 같은 열쇠).
   흔한 경우(정수 id, 지도 안 칸)는 숫자로 만들어 빠르게 */
const seenInt=v=>typeof v==='number'?(Number.isInteger(v)?v:null):typeof v==='string'&&v!==''&&String(+v)===v&&Number.isInteger(+v)?+v:null;
function seenKey(e){const id=seenInt(e.id),r=seenInt(e.r),c=seenInt(e.c);
  if(id!==null&&r!==null&&c!==null&&Math.abs(id)<1e9&&r>=0&&c>=0&&r<N&&c<N)return (id*N+r)*N+c;return e.id+':'+e.r+','+e.c;}
function seen(e,n,vs){if(!G.fog||e.nat===n)return true;
  const ck='s'+n;G._sc=G._sc||{};const tq=Math.floor((G.time||0)*4);let c=G._sc[ck];if(!c||c.ver!==G.ver||c.tq!==tq){c=G._sc[ck]={ver:G.ver,tq,m:new Map()};}
  const pk=seenKey(e);if(c.m.has(pk))return c.m.get(pk);
  // 시야 거리가 아무리 길어도 닿지 않는 부대는 시야선 계산 없이 건너뛴다(성능)
  const [ex,ez]=posOf(e),V=visMax()+1.5;
  let ok=false;for(const u of G.units){if(u.nat!==n)continue;const at=u.x!=null&&Math.floor(u.x)===u.c&&Math.floor(u.z)===u.r;const ux=at?u.x:u.c+.5,uz=at?u.z:u.r+.5;   // posOf(u)를 풀어 씀(배열을 안 만든다)
    if(Math.abs(ux-ex)>V||Math.abs(uz-ez)>V)continue;if(spots(u,e)){ok=true;break;}}
  c.m.set(pk,ok);return ok;}

/* ---------- 사격 가능 판정 ---------- */
/* AI가 가상의 칸에 세워 볼 때: 건물 안 보병은 표적 쪽 창가에 선다고 본다 */
function hypoPos(a,r,c,tx,tz){const x=cell(r,c);if(x.t==='bldg'&&UT[a.type].cls==='inf'&&!UT[a.type].ind){const w=winPt(r,c,tx,tz);if(w)return w;}return [c+.5,r+.5];}
/* 곡사 화기는 하늘이 트인 곳(지상·옥상)에서만 쏜다 */
function indOK(a,ax,az,ae){const r=Math.floor(az),c=Math.floor(ax);const x=inb(r,c)?G.map[r][c]:null;if(!x||x.t!=='bldg')return true;return ae>=bldgH(x)-.05;}
function canHit(a,d,fromR,fromC,moved){const t=UT[a.type];if(!t.rng[1])return false;if(typeof stairHid==='function'&&stairHid(d,a))return false;
  let ax,az,ae;const [dx,dz]=posOf(d);if(fromR!=null){[ax,az]=hypoPos(a,fromR,fromC,dx,dz);ae=eyeAt(a.type,fromR,fromC);}else{[ax,az]=posOf(a);ae=eye(a);}const dd=Math.hypot(ax-dx,az-dz);
  if(dd<t.rng[0]-.4||dd>t.rng[1]+.6)return false;if(!(t.atk[UT[d.type].cls]>0))return false;if(t.ind&&moved)return false;if(t.ind&&UT[d.type].fly)return false;
  if(t.ind)return indOK(a,ax,az,ae)&&seen(d,a.nat);
  return losPt(ax,az,ae,dx,dz,eye(d));}
function canHitTile(a,r2,c2,fromR,fromC,moved){const t=UT[a.type];if(!t.ex||!t.rng[1])return false;
  let ax,az,ae;if(fromR!=null){[ax,az]=hypoPos(a,fromR,fromC,c2+.5,r2+.5);ae=eyeAt(a.type,fromR,fromC);}else{[ax,az]=posOf(a);ae=eye(a);}
  const dd=Math.hypot(ax-(c2+.5),az-(r2+.5));
  if(dd<t.rng[0]-.4||dd>t.rng[1]+.6)return false;if(t.ind&&moved)return false;const x=G.map[r2][c2];if(x.t!=='bldg')return false;
  if(t.ind)return false;            // 곡사포로 건물을 노리지 않는다
  // 건물 외벽 가장 가까운 점을 겨눈다
  const b=bldgBox(r2,c2);const tx=Math.min(b[1],Math.max(b[0],ax)),tz=Math.min(b[3],Math.max(b[2],az));
  return losPt(ax,az,ae,tx,tz,Math.max(.5,x.f-.5));}
