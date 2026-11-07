/* ===================== FLOORS: 문으로 들어가 계단으로 오르기 =====================
   보병은 건물 외벽을 넘지 못한다. 칸마다 바깥쪽 벽 몇 곳에 출입문이 있고, 그 문으로만 드나든다.
   (많이 부서진 건물은 벽이 뚫려 어디로든 드나든다.) 같은 블록 건물 칸끼리는 안에서 이어진다.
   건물 안 부대는 u.fl(층, 0 = 1층)을 가진다. 들어오면 1층이고, 멈춰 있으면 계단 자리로 가서
   한 층에 FLOOR_S초씩 걸려 꼭대기 층까지 오른다. 나가거나 낮은 건물 칸으로 옮길 때는 먼저 내려온다.
   눈높이(eye)는 지금 층을 따른다: 1층이면 길에 선 것과 같고, 꼭대기 층이면 예전처럼 건물 높이에서 본다. */
const FLOOR_S=2.4;             // 한 층 오르내리는 데 걸리는 시간(초)
const DOOR_W=.13;              // 문 너비 절반(칸): 이 안쪽으로 벽을 지나야 한다
const SIDES=[[-1,0],[0,1],[1,0],[0,-1]];   // 북 동 남 서 (dr,dc)
const isB=x=>!!x&&x.t==='bldg';
const sameBlk=(a,b)=>isB(a)&&isB(b)&&a.blk!=null&&a.blk===b.blk;
const breached=x=>isB(x)&&x.bhp/x.bmax<.4;
/* 두 칸 사이에 벽이 있는가 (건물 안팎, 또는 서로 다른 건물) */
function wallBetween(a,b){if(!isB(a)&&!isB(b))return false;if(sameBlk(a,b))return false;return true;}
/* 건물 칸 (r,c)의 s쪽 벽에 문이 있는가. 바깥(건물 아님, 물 아님)과 맞닿은 면 중에서 고르고, 칸마다 하나는 꼭 있다. */
function doorSides(r,c){const x=G.map[r][c];if(!isB(x))return null;
  const sig=SIDES.map(([a,b])=>{const r2=r+a,c2=c+b;if(!inb(r2,c2))return 0;const y=G.map[r2][c2];return !isB(y)&&y.t!=='water'?1:0;}).join('');
  if(x._dk===sig)return x._ds;const k=key(r,c);const out=[0,0,0,0];let any=false;
  for(let s=0;s<4;s++)if(sig[s]==='1'&&dHash(k,s)<.42){out[s]=1;any=true;}
  if(!any){const st=Math.floor(dHash(k,9)*4);for(let i=0;i<4;i++){const s=(st+i)%4;const [a,b]=SIDES[s];const y=inb(r+a,c+b)?G.map[r+a][c+b]:null;if(sig[s]==='1'&&y&&y.t==='road'){out[s]=1;any=true;break;}}
    if(!any)for(let i=0;i<4;i++){const s=(st+i)%4;if(sig[s]==='1'){out[s]=1;break;}}}
  x._dk=sig;x._ds=out;return out;}
function dHash(k,s){let h=(k*2654435761^(s+1)*40503)>>>0;h=Math.imul(h^h>>>15,2246822507)>>>0;h=Math.imul(h^h>>>13,3266489909)>>>0;return ((h^h>>>16)>>>0)/4294967296;}
/* 문 위치: s쪽 벽 가운데에서 벽을 따라 조금 비킨 점 [x,z] */
function doorPos(r,c,s){const o=(dHash(key(r,c),20+s)-.5)*.36;const cx=c+.5,cz=r+.5;
  return s===0?[cx+o,r]:s===1?[c+1,cz+o]:s===2?[cx+o,r+1]:[c,cz+o];}
/* 칸 (r,c)에서 옆 칸 (a,b)로 (가로·세로로) 넘어갈 수 있는가, 넘어간다면 지나야 할 문 [x,z] (벽이 없으면 true) */
function edgePass(r,c,a,b){const A=G.map[r][c],B=G.map[a][b];if(!wallBetween(A,B))return true;
  if(isB(A)&&isB(B))return breached(A)&&breached(B)?true:null;   // 다른 건물끼리는 벽을 못 뚫는다(둘 다 무너지기 직전이면 통과)
  const bi=isB(A)?[r,c]:[a,b],s=SIDES.findIndex(([p,q])=>bi[0]+p===(isB(A)?a:r)&&bi[1]+q===(isB(A)?b:c));
  if(breached(G.map[bi[0]][bi[1]]))return true;
  const ds=doorSides(bi[0],bi[1]);if(!ds||!ds[s])return null;return doorPos(bi[0],bi[1],s);}
/* 대각선 이동: 네 칸이 모두 같은 공간(모두 바깥, 또는 모두 같은 건물)일 때만 */
function diagPass(r,c,a,b){const P=[G.map[r][c],G.map[a][b],G.map[a][c],G.map[r][b]];
  if(P.every(x=>!isB(x)))return true;return P.every(x=>sameBlk(x,P[0]));}
function stepPass(r,c,a,b){if(a!==r&&b!==c)return diagPass(r,c,a,b);return edgePass(r,c,a,b)!=null;}
/* 선분이 문이 아닌 곳으로 벽을 지나가는가 (자유 이동·밀어내기·경로 다듬기에서 쓴다) */
function wallCross(u,x1,z1,x2,z2){if(UT[u.type].fly)return false;const n=Math.max(1,Math.ceil(Math.hypot(x2-x1,z2-z1)/.08));
  let pr=Math.floor(z1),pc=Math.floor(x1),px=x1,pz=z1;
  for(let i=1;i<=n;i++){const x=x1+(x2-x1)*i/n,z=z1+(z2-z1)*i/n;const r=Math.floor(z),c=Math.floor(x);
    if(r!==pr||c!==pc){if(!inb(r,c)||!inb(pr,pc))return true;
      if(r!==pr&&c!==pc){if(!diagPass(pr,pc,r,c))return true;}
      else{const d=edgePass(pr,pc,r,c);if(d==null)return true;
        if(d!==true){// 경계를 지난 점이 문 안쪽이어야 한다
          const t=r!==pr?((r>pr?r:pr)-pz)/((z-pz)||1e-9):((c>pc?c:pc)-px)/((x-px)||1e-9);const cx=px+(x-px)*t,cz=pz+(z-pz)*t;
          if(Math.hypot(cx-d[0],cz-d[1])>DOOR_W)return true;}}}
    pr=r;pc=c;px=x;pz=z;}
  return false;}
/* 계단 자리: 칸마다 한 모서리 */
function stairPos(r,c){const h=dHash(key(r,c),40);const sx=h<.5?-1:1,sz=(h*4|0)%2?-1:1;return [c+.5+sx*.27,r+.5+sz*.27];}
/* 칸에서 오를 수 있는 가장 높은 곳: 실내 층은 0..f-1, f는 옥상. 부서져 낮아진 만큼 줄어든다. */
function topFl(x){if(!isB(x))return 0;return Math.max(0,Math.ceil(bldgH(x)-.05));}
function roofFl(x){return isB(x)?topFl(x):0;}
const onRoof=u=>{const x=cell(u.r,u.c);return isB(x)&&UT[u.type].cls==='inf'&&curFl(u)>=roofFl(x)-1e-6&&roofFl(x)>0;};
/* 눈높이(층 단위): 실내는 그 층 +0.5, 옥상은 건물 높이 +0.3 */
function flEye(u){const x=cell(u.r,u.c);const f=curFl(u);return f>=roofFl(x)-1e-6?bldgH(x)+.3:f+.5;}
/* 지금 층을 아는가: 실제 서 있는 칸이 층을 기록한 칸과 같을 때만 (AI가 가상 칸에 옮겨 놓고 계산할 때는 꼭대기로 본다) */
function curFl(u){const x=cell(u.r,u.c);if(!isB(x))return 0;if(u.fl==null||u.flK!==key(u.r,u.c))return Math.max(0,topFl(x)-1);return Math.min(u.fl,topFl(x));}   // 모르면 맨 위 실내층
/* 남은 경로를 걷는 동안 머물 수 있는 가장 높은 층: 건물을 나가면 0, 같은 블록 안이면 지나는 칸 중 가장 낮은 꼭대기 */
function pathFlLim(u){const here=cell(u.r,u.c);let lim=topFl(here);let px=u.x,pz=u.z;
  for(const p of u.path){const n=Math.max(1,Math.ceil(Math.hypot(p[0]-px,p[1]-pz)/.25));
    for(let i=1;i<=n;i++){const t=tileAt(px+(p[0]-px)*i/n,pz+(p[1]-pz)*i/n);if(!t||!sameBlk(t,here)&&t!==here)return 0;lim=Math.min(lim,topFl(t));}
    px=p[0];pz=p[1];if(lim<=0)return 0;}
  return lim;}
/* 계단으로 한 걸음: 계단 자리로 걸어가서 목표 층까지 오르내린다. 계단에 있는 동안은 u.climb=1 */
function stairStep(u,dt,goal){const [sx,sz]=stairPos(u.r,u.c);const dx=sx-u.x,dz=sz-u.z,d=Math.hypot(dx,dz);
  const sp=UT[u.type].mv*SPD_K*.5*(u.supp>0?.65:1);u.climb=1;   // 계단으로 가는 동안과 오르내리는 동안은 쏘지 않는다
  if(d>.04){const k=Math.min(1,sp*dt/d);u.x+=dx*k;u.z+=dz*k;u.face=Math.atan2(dz,dx)*180/Math.PI;u.onSt=0;return;}
  u.onSt=1;
  const rate=dt/FLOOR_S*(u.supp>0?.6:1);
  u.flDir=goal>u.fl?1:-1;
  if(u.fl<goal)u.fl=Math.min(goal,u.fl+rate);else u.fl=Math.max(goal,u.fl-rate);
  if(Math.abs(u.fl-goal)<1e-6){u.fl=goal;endClimb(u);}
  const ef=Math.floor(u.fl+1e-6);if(ef!==u._efl){u._efl=ef;bump();}}
/* 매 틱: 층 기록을 서 있는 칸에 맞추고, 멈춰 있으면 원하는 층(u.flT, 없으면 꼭대기)으로 오른다.
   이동 중에 지금 층에서는 못 가는 곳이 남아 있으면 true(먼저 내려와야 하니 걷지 않는다). */
function flTick(u,dt){if(UT[u.type].cls!=='inf'){u.fl=0;return false;}const k=key(u.r,u.c),x=cell(u.r,u.c);
  if(u.flK!==k){const was=u.flK!=null&&inb(kr(u.flK),kc(u.flK))?G.map[kr(u.flK)][kc(u.flK)]:null;
    u.fl=u.fl==null&&isB(x)?Math.max(0,topFl(x)-1):isB(x)&&sameBlk(was,x)?Math.min(u.fl||0,topFl(x)):0;u.flK=k;u._efl=Math.floor(u.fl);bump();}
  if(!isB(x)){u.fl=0;if(u.climb)endClimb(u);return false;}
  if(u.fl>topFl(x))u.fl=topFl(x);
  const moving=u.path&&u.path.length;
  if(moving){const lim=pathFlLim(u);if(u.fl>lim+1e-6){stairStep(u,dt,lim);return true;}if(u.climb)endClimb(u);return false;}
  const goal=Math.min(topFl(x),u.flT==null?99:u.flT);
  if(Math.abs(u.fl-goal)>1e-6){stairStep(u,dt,goal);return true;}
  if(u.climb)endClimb(u);return false;}
/* 계단에서 내려선 뒤 자리 잡는 데 잠깐 걸린다(그동안 사격 없음) */
function endClimb(u){u.climb=0;u.onSt=0;u.cd=Math.max(u.cd||0,1);bump();}
/* 층 명령: 꼭대기로 / 1층으로 (UI 버튼) */
function orderFloor(u,up){u.flT=up?null:0;}
