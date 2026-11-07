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
function eyeAt(type,r,c){const t=UT[type];if(t.fly)return 9;const x=cell(r,c);if(x.t==='bldg')return Math.max(.5,x.f-.5);return t.cls==='veh'?.8:.5;}
/* 실제 부대: 건물 안이면 지금 서 있는 층에서 본다(05e-floors). */
const eye=u=>{const e=eyeAt(u.type,u.r,u.c);if(UT[u.type].cls!=='inf'||cell(u.r,u.c).t!=='bldg'||typeof curFl!=='function')return e;return Math.min(e,curFl(u)+.5);};
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
   양 끝이 서 있는 칸(건물 안이면 바로 붙은 같은 블록 칸까지)은 가리지 않는다. */
function losOwn(r,c,rr,cc){if(r===rr&&c===cc)return true;if(Math.abs(r-rr)>1||Math.abs(c-cc)>1)return false;const a=G.map[rr][cc],b=G.map[r][c];return a.t==='bldg'&&b.t==='bldg'&&a.blk!=null&&a.blk===b.blk;}
function losPt(x1,z1,h1,x2,z2,h2){const dx=x2-x1,dz=z2-z1;if(dx*dx+dz*dz<.81)return true;
  const r1=Math.floor(z1),c1=Math.floor(x1),r2=Math.floor(z2),c2=Math.floor(x2);
  let c=c1,r=r1;const sx=dx>0?1:-1,sz=dz>0?1:-1;
  const tdx=Math.abs(dx)>1e-12?Math.abs(1/dx):Infinity,tdz=Math.abs(dz)>1e-12?Math.abs(1/dz):Infinity;
  let tmx=Math.abs(dx)>1e-12?((dx>0?c+1-x1:x1-c)*tdx):Infinity,tmz=Math.abs(dz)>1e-12?((dz>0?r+1-z1:z1-r)*tdz):Infinity;
  for(let g=0;g<4*N;g++){if(tmx<tmz){c+=sx;tmx+=tdx;}else{r+=sz;tmz+=tdz;}
    if(Math.min(tmx,tmz)>1+tdx&&Math.min(tmx,tmz)>1+tdz)break;
    if(!inb(r,c))break;if(r===r2&&c===c2)break;
    const x=G.map[r][c];if(!(x.smoke>0)&&x.t!=='bldg')continue;if(losOwn(r,c,r1,c1)||losOwn(r,c,r2,c2))continue;
    if(x.t!=='bldg')return false;           // 연막
    const bh=x.smoke>0?99:bldgH(x);const s=segBox(x1,z1,x2,z2,bldgBox(r,c));if(!s)continue;
    const hmin=Math.min(h1+(h2-h1)*s[0],h1+(h2-h1)*s[1]);if(bh>=hmin-.05)return false;}
  return true;}
/* 예전 칸 단위 호출(칸 중심끼리)도 그대로 쓸 수 있게 둔다 */
function los(r1,c1,h1,r2,c2,h2){return losPt(c1+.5,r1+.5,h1,c2+.5,r2+.5,h2);}
/* 부대 a가 부대 b를 시야선으로 보는가 */
function losU(a,b){const [ax,az]=posOf(a),[bx,bz]=posOf(b);return losPt(ax,az,eye(a),bx,bz,eye(b));}

function visRange(u){const t=UT[u.type];let v=t.vis;const x=cell(u.r,u.c);if(x.t==='bldg'){const f=Math.round(eye(u)+.5);v+=f>=5?2:f>=3?1:0;}
  if(isNight())v-=t.fly?1:2;v+=WX[G.wx].vis;if(x.smoke>0&&!t.fly)v=1;return Math.max(1,v);}
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
  const ck=qx+','+qz+','+v+','+h+','+sig+','+N;if(u._fov&&u._fov.k===ck)return u._fov.p;
  const M=N*FOW_R;const r1=u.r,c1=u.c;
  // 칸별 건물 상자·높이를 한 번만 구한다
  const bx0=Math.max(0,Math.floor(qx-v)),bx1=Math.min(N-1,Math.floor(qx+v)),bz0=Math.max(0,Math.floor(qz-v)),bz1=Math.min(N-1,Math.floor(qz+v));
  const W=bx1-bx0+1;const TB=new Array(W*(bz1-bz0+1));
  for(let r=bz0;r<=bz1;r++)for(let c=bx0;c<=bx1;c++){const x=G.map[r][c];const own=losOwn(r,c,r1,c1);
    TB[(r-bz0)*W+c-bx0]=x.t==='bldg'?{b:bldgBox(r,c),h:bldgH(x),sm:x.smoke>0,own}:{b:null,h:0,sm:x.smoke>0,own};}
  const gi0=Math.max(0,Math.floor((qx-v)*FOW_R)),gj0=Math.max(0,Math.floor((qz-v)*FOW_R)),GW=Math.min(M,Math.ceil((qx+v)*FOW_R)+1)-gi0,GH=Math.min(M,Math.ceil((qz+v)*FOW_R)+1)-gj0;
  const mk=new Uint8Array(GW*GH);const mark=(px,pz)=>{const i=Math.floor(px*FOW_R)-gi0,j=Math.floor(pz*FOW_R)-gj0;if(i>=0&&j>=0&&i<GW&&j<GH)mk[j*GW+i]=1;};
  mark(qx,qz);
  const nr=Math.ceil(2*Math.PI*v*FOW_R*1.6),st=.5/FOW_R;
  for(let k=0;k<nr;k++){const a=k/nr*2*Math.PI,cx=Math.cos(a),cz=Math.sin(a);let maxS=-Infinity;
    for(let d=st;d<=v;d+=st){const px=qx+cx*d,pz=qz+cz*d;if(px<0||pz<0||px>=N||pz>=N)break;const r=Math.floor(pz),c=Math.floor(px);
      const T=TB[(r-bz0)*W+c-bx0];if(!T)break;let bh=0,th=.3;
      if(!(T.own&&d<1.5)){if(T.b&&px>=T.b[0]&&px<=T.b[1]&&pz>=T.b[2]&&pz<=T.b[3]){bh=T.h;th=Math.max(.5,T.h-.3);}if(T.sm)bh=99;}
      if(d<.9||(th-h)/d>=maxS-.02)mark(px,pz);
      if(bh>0){const sl=(bh-h)/d;if(sl>maxS)maxS=sl;}}}
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
function spots(u,e){const t=UT[e.type];let v=visRange(u)+(t.cls==='veh'?1:t.fly?1:0);
  if(concealed(e))v*=SPOT_HIDE;
  if(t.hide&&inside(e)&&!firedRecently(e)&&e.shot!==G.turn)v=Math.min(v,1.5);
  const d=udist(u,e);if(d>v)return false;return d<.9||losU(u,e);}
function seen(e,n,vs){if(!G.fog||e.nat===n)return true;
  const ck='s'+n;G._sc=G._sc||{};const tq=Math.floor((G.time||0)*4);let c=G._sc[ck];if(!c||c.ver!==G.ver||c.tq!==tq){c=G._sc[ck]={ver:G.ver,tq,m:new Map()};}
  const pk=e.id+':'+e.r+','+e.c;if(c.m.has(pk))return c.m.get(pk);
  let ok=false;for(const u of G.units){if(u.nat!==n)continue;if(spots(u,e)){ok=true;break;}}
  c.m.set(pk,ok);return ok;}

/* ---------- 사격 가능 판정 ---------- */
function canHit(a,d,fromR,fromC,moved){const t=UT[a.type];if(!t.rng[1])return false;
  let ax,az,ae;if(fromR!=null){ax=fromC+.5;az=fromR+.5;ae=eyeAt(a.type,fromR,fromC);}else{[ax,az]=posOf(a);ae=eye(a);}
  const [dx,dz]=posOf(d);const dd=Math.hypot(ax-dx,az-dz);
  if(dd<t.rng[0]-.4||dd>t.rng[1]+.6)return false;if(!(t.atk[UT[d.type].cls]>0))return false;if(t.ind&&moved)return false;if(t.ind&&UT[d.type].fly)return false;
  if(t.ind)return seen(d,a.nat);
  return losPt(ax,az,ae,dx,dz,eye(d));}
function canHitTile(a,r2,c2,fromR,fromC,moved){const t=UT[a.type];if(!t.ex||!t.rng[1])return false;
  let ax,az,ae;if(fromR!=null){ax=fromC+.5;az=fromR+.5;ae=eyeAt(a.type,fromR,fromC);}else{[ax,az]=posOf(a);ae=eye(a);}
  const dd=Math.hypot(ax-(c2+.5),az-(r2+.5));
  if(dd<t.rng[0]-.4||dd>t.rng[1]+.6)return false;if(t.ind&&moved)return false;const x=G.map[r2][c2];if(x.t!=='bldg')return false;
  if(t.ind)return visSet(a.nat).has(key(r2,c2));
  // 건물 외벽 가장 가까운 점을 겨눈다
  const b=bldgBox(r2,c2);const tx=Math.min(b[1],Math.max(b[0],ax)),tz=Math.min(b[3],Math.max(b[2],az));
  return losPt(ax,az,ae,tx,tz,Math.max(.5,x.f-.5));}
