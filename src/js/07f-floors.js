/* ===================== 3D: 건물 안 보여 주기 =====================
   보이는 보병이 들어 있는 건물 칸은 그 부대가 선 층에서 잘라 그린다(단면도):
   그 층 바닥, 허리 높이까지의 벽(창턱), 벽 단면, 안쪽 벽면, 칸막이, 계단실(아래층으로 내려가는 계단).
   잘린 위쪽은 옅은 윤곽선으로만 남겨 원래 높이를 알 수 있게 한다.
   모든 건물 칸에는 출입문(05e doorSides)을 그린다. 병사들은 계단 자리에 줄지어 한 명씩 오르내리고,
   층에 도착하면 쏘는 쪽 창가로 흩어진다. */
const CUT_SILL=.42;            // 잘린 벽 높이(층 높이 대비): 창턱쯤
const STAIR_L=.18,STAIR_W=.085;
/* 보이는 보병이 서 있는 건물 칸 → 잘라 보일 층 */
function v3CutMap(vs,vn){const m=new Map();if(!G)return m;
  for(const u of G.units){if(UT[u.type].cls!=='inf')continue;if(G.fog&&!seen(u,vn,vs))continue;const x=cell(u.r,u.c);if(x.t!=='bldg')continue;
    const lv=Math.min(topFl(x),Math.max(0,Math.ceil(curFl(u)-.05)));const k=key(u.r,u.c);if(!m.has(k)||m.get(k)<lv)m.set(k,lv);}
  return m;}
/* 계단 자리와 계단 방향(칸 가운데 쪽, x축) */
function v3Stair(r,c){const [sx,sz]=stairPos(r,c);const ax=sx>c+.5?-1:1;return {sx,sz,ax};}
/* 사각형 한 면을 배열에 넣는다 (D: {P,C,K} 위치·색·칸 키) */
function v3DQuad(D,A,B,C2,E,col,k){for(const p of [A,B,C2,A,C2,E]){D.P.push(p[0],p[1],p[2]);D.C.push(col.r,col.g,col.b);}D.K.push(k,k);}
function v3DBox(D,x0,x1,y0,y1,z0,z1,col,k,noBottom){const c2=col.clone().multiplyScalar(.82),c3=col.clone().multiplyScalar(.68);
  v3DQuad(D,[x0,y1,z0],[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],col,k);
  v3DQuad(D,[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],c2,k);v3DQuad(D,[x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],c3,k);
  v3DQuad(D,[x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],c2,k);v3DQuad(D,[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],c3,k);}
/* 잘린 건물 칸의 속 */
function v3CutTile(D,L,r,c,x,x0,x1,z0,z1,lvl,hFull,shade){const T=V3.T,k=key(r,c);const y=.06+lvl*FLOOR_H,yt=Math.min(.06+hFull,y+FLOOR_H*CUT_SILL),t=.03;
  const floorC=new T.Color('#7a7266').lerp(shade,.15),wallC=new T.Color('#c9c2b4').lerp(shade,.3),cutC=new T.Color('#5d574e'),dark=new T.Color('#1f1d1a');
  const st=v3Stair(r,c);const hx0=Math.min(st.sx,st.sx+st.ax*STAIR_L),hx1=Math.max(st.sx,st.sx+st.ax*STAIR_L),hz0=st.sz-STAIR_W,hz1=st.sz+STAIR_W;
  // 바닥: 계단실 구멍만 비우고 네 조각으로
  const fy=y+.002;const slab=(a0,a1,b0,b1)=>{if(a1-a0>.001&&b1-b0>.001)v3DQuad(D,[a0,fy,b0],[a0,fy,b1],[a1,fy,b1],[a1,fy,b0],floorC,k);};
  slab(x0,x1,z0,hz0);slab(x0,x1,hz1,z1);slab(x0,hx0,hz0,hz1);slab(hx1,x1,hz0,hz1);
  // 바닥 얼룩·타일 줄
  const tl=floorC.clone().multiplyScalar(.9);for(let i=1;i<4;i++){const zz=z0+(z1-z0)*i/4;v3DQuad(D,[x0,fy+.0005,zz-.002],[x0,fy+.0005,zz+.002],[x1,fy+.0005,zz+.002],[x1,fy+.0005,zz-.002],tl,k);}
  // 계단실: 아래층으로 내려가는 계단(구멍 속), 구멍 둘레 난간
  if(lvl>0){const n=7,dir=((lvl-1)%2===0)?1:-1;   // 짝수 층에서 출발하는 계단은 계단 자리에서 ax쪽으로 오른다
    for(let i=0;i<n;i++){const f=(i+1)/n;const hy=y-FLOOR_H*(1-f);const a=dir>0?st.sx+st.ax*STAIR_L*(i/n):st.sx+st.ax*STAIR_L*(1-(i+1)/n),b=a+st.ax*STAIR_L/n;
      v3DBox(D,Math.min(a,b),Math.max(a,b),hy-.012,hy,hz0+.004,hz1-.004,new T.Color('#8a8377').multiplyScalar(.75+.25*f),k);}
    v3DQuad(D,[hx0,y-FLOOR_H+.003,hz0],[hx0,y-FLOOR_H+.003,hz1],[hx1,y-FLOOR_H+.003,hz1],[hx1,y-FLOOR_H+.003,hz0],dark,k);}
  else v3DQuad(D,[hx0,fy+.001,hz0],[hx0,fy+.001,hz1],[hx1,fy+.001,hz1],[hx1,fy+.001,hz0],new T.Color('#4c463e'),k);
  const rl=new T.Color('#3a3631');v3DBox(D,hx0,hx1,y,y+.045,hz1,hz1+.006,rl,k);
  // 계단실 벽(한쪽)
  v3DBox(D,hx0,hx1,y,yt,hz0-.012,hz0,wallC.clone().multiplyScalar(.9),k);
  // 칸막이 벽 하나(문틈 있음)
  if(v3Hash(k,300+lvl)<.75){const vert=v3Hash(k,310+lvl)<.5;const p=.35+v3Hash(k,320+lvl)*.3,g0=.3+v3Hash(k,330+lvl)*.25;
    if(vert){const xx=x0+(x1-x0)*p;if(xx<hx0-.03||xx>hx1+.03){v3DBox(D,xx-.008,xx+.008,y,yt,z0,z0+(z1-z0)*g0,wallC,k);v3DBox(D,xx-.008,xx+.008,y,yt,z0+(z1-z0)*(g0+.2),z1,wallC,k);}}
    else{const zz=z0+(z1-z0)*p;if(zz<hz0-.03||zz>hz1+.03){v3DBox(D,x0,x0+(x1-x0)*g0,y,yt,zz-.008,zz+.008,wallC,k);v3DBox(D,x0+(x1-x0)*(g0+.2),x1,y,yt,zz-.008,zz+.008,wallC,k);}}}
  // 가구 몇 개(넘어진 책상·매트리스)
  for(let i=0;i<3;i++)if(v3Hash(k,340+i+lvl*7)<.6){const px=x0+.08+(x1-x0-.16)*v3Hash(k,350+i+lvl*7),pz=z0+.08+(z1-z0-.16)*v3Hash(k,360+i+lvl*7);if(px>hx0-.06&&px<hx1+.06&&pz>hz0-.06&&pz<hz1+.06)continue;
    const w=.03+v3Hash(k,370+i)*.04;v3DBox(D,px-w,px+w,y,y+.012+v3Hash(k,380+i)*.02,pz-.025,pz+.025,new T.Color(['#5b5248','#6d6a63','#4a4f52'][i]),k);}
  // 안쪽 벽면과 벽 단면(두께)
  const inner=(ax,az,bx,bz,nx,nz)=>{v3DQuad(D,[ax+nx*t,y,az+nz*t],[bx+nx*t,y,bz+nz*t],[bx+nx*t,yt,bz+nz*t],[ax+nx*t,yt,az+nz*t],wallC,k);
    v3DQuad(D,[ax,yt,az],[bx,yt,bz],[bx+nx*t,yt,bz+nz*t],[ax+nx*t,yt,az+nz*t],cutC,k);};
  inner(x0,z0,x1,z0,0,1);inner(x1,z1,x0,z1,0,-1);inner(x0,z1,x0,z0,1,0);inner(x1,z0,x1,z1,-1,0);
  // 창 자리: 벽 단면 위에 짧은 기둥(창틀)
  const pc=new T.Color('#8e877b');for(const [ax,az,bx,bz,nx,nz] of [[x0,z0,x1,z0,0,1],[x0,z1,x1,z1,0,-1],[x0,z0,x0,z1,1,0],[x1,z0,x1,z1,-1,0]]){const len=Math.hypot(bx-ax,bz-az),n=Math.max(2,Math.round(len/.21));
    for(let i=0;i<=n;i++){const f=i/n,px=ax+(bx-ax)*f,pz=az+(bz-az)*f;v3DBox(D,px-.01+nx*.0,px+.01+nx*t,yt,yt+.02,pz-.01,pz+.01+nz*t,pc,k);}}
  // 잘린 위쪽: 옅은 윤곽선
  const top=.06+hFull;if(top>yt+.02){for(const [a,b] of [[x0,z0],[x1,z0],[x1,z1],[x0,z1]])L.push(a,yt,b,a,top,b);
    for(const yy of [top])for(const [a,b,c2,d] of [[x0,z0,x1,z0],[x1,z0,x1,z1],[x1,z1,x0,z1],[x0,z1,x0,z0]])L.push(a,yy,b,c2,yy,d);
    for(let f=lvl+2;f<x.f;f++){const yy=.06+f*FLOOR_H;if(yy>=top)break;for(const [a,b,c2,d] of [[x0,z0,x1,z0],[x1,z0,x1,z1],[x1,z1,x0,z1],[x0,z1,x0,z0]])L.push(a,yy,b,c2,yy,d);}}}
/* 출입문: 바깥 벽면에 어두운 문, 문틀, 작은 차양 */
function v3Doors(D,r,c,x0,x1,z0,z1,dmg){const ds=doorSides(r,c);if(!ds)return;const T=V3.T,k=key(r,c);const dk=new T.Color('#191714'),fr=new T.Color('#4a453d'),cn=new T.Color('#7d776d');
  const w=.055,h=.17,o=.004,y0=.06;
  for(let s=0;s<4;s++){if(!ds[s])continue;const [dx,dz]=doorPos(r,c,s);
    if(s===0||s===2){const z=s===0?z0-o:z1+o,sg=s===0?-1:1;
      v3DBox(D,dx-w-.012,dx+w+.012,y0,y0+h+.012,Math.min(z,z-sg*o),Math.max(z,z-sg*o)+.001,fr,k);
      v3DQuad(D,[dx-w,y0,z+sg*.001],[dx+w,y0,z+sg*.001],[dx+w,y0+h,z+sg*.001],[dx-w,y0+h,z+sg*.001],dk,k);
      if(dmg<.4)v3DBox(D,dx-w-.03,dx+w+.03,y0+h+.02,y0+h+.032,Math.min(z,z+sg*.06),Math.max(z,z+sg*.06),cn,k);
      v3DBox(D,dx-w-.02,dx+w+.02,0,y0+.012,Math.min(z,z+sg*.05),Math.max(z,z+sg*.05),cn,k);}
    else{const x=s===3?x0-o:x1+o,sg=s===3?-1:1;
      v3DBox(D,Math.min(x,x-sg*o),Math.max(x,x-sg*o)+.001,y0,y0+h+.012,dz-w-.012,dz+w+.012,fr,k);
      v3DQuad(D,[x+sg*.001,y0,dz+w],[x+sg*.001,y0,dz-w],[x+sg*.001,y0+h,dz-w],[x+sg*.001,y0+h,dz+w],dk,k);
      if(dmg<.4)v3DBox(D,Math.min(x,x+sg*.06),Math.max(x,x+sg*.06),y0+h+.02,y0+h+.032,dz-w-.03,dz+w+.03,cn,k);
      v3DBox(D,Math.min(x,x+sg*.05),Math.max(x,x+sg*.05),0,y0+.012,dz-w-.02,dz+w+.02,cn,k);}}}
function v3FloorMesh(g,D,L){const T=V3.T;
  if(D.P.length){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(D.P,3));geo.setAttribute('color',new T.Float32BufferAttribute(D.C,3));geo.computeVertexNormals();
    const m=new T.Mesh(geo,V3.M.inner||(V3.M.inner=new T.MeshStandardMaterial({vertexColors:true,roughness:.95,side:T.DoubleSide})));m.castShadow=m.receiveShadow=true;m.userData.tri=D.K;g.add(m);}
  if(L.length){const lg=new T.BufferGeometry();lg.setAttribute('position',new T.Float32BufferAttribute(L,3));
    g.add(new T.LineSegments(lg,V3.M.ghost||(V3.M.ghost=new T.LineBasicMaterial({color:'#e8e2d4',transparent:true,opacity:.28,depthWrite:false}))));}}
/* 건물 안 보병의 높이: 지금 층 바닥 */
function v3InY(u){const x=cell(u.r,u.c);if(UT[u.type].cls!=='inf'||x.t!=='bldg')return null;const f=u.fl!=null&&u.flK===key(u.r,u.c)?u.fl:topFl(x);return .06+f*FLOOR_H+.005;}
/* 건물 안 병사 한 명이 갈 자리와 그 병사의 층.
   계단을 오르내리는 중이면 계단 자리로 모여 한 명씩 계단을 타고, 멈춰 있으면 쏘는 쪽 창가에 붙는다. */
function v3InSoldier(uu,s,i,dt){const x=cell(uu.r,uu.c);if(UT[uu.type].cls!=='inf'||x.t!=='bldg'){s.fl=null;return null;}
  const k=key(uu.r,uu.c);const ufl=uu.fl!=null&&uu.flK===k?uu.fl:topFl(x);
  if(s.fl==null||s.flK!==k){s.fl=ufl;s.flK=k;}
  const st=v3Stair(uu.r,uu.c);const moving=uu.path&&uu.path.length;
  const d=Math.hypot(s.wx-st.sx,s.wz-st.sz);
  // 이 병사의 층: 계단 근처에 와야 따라 오르내린다
  if(Math.abs(s.fl-ufl)>1e-3){if(d<.12||Math.abs(s.fl-ufl)<.02){const rate=dt/FLOOR_S*1.7;s.fl=s.fl<ufl?Math.min(ufl,s.fl+rate):Math.max(ufl,s.fl-rate);}}
  const onStair=Math.abs(s.fl-ufl)>1e-3||uu.climb;
  let gx,gz;
  if(onStair){// 계단 위: 층의 소수 부분만큼 계단을 따라 간다(층마다 꺾어 올라감)
    const f=s.fl-Math.floor(s.fl),even=Math.floor(s.fl)%2===0;const p=Math.abs(s.fl-ufl)>1e-3||f>1e-3?(even?f:1-f):0;
    gx=st.sx+st.ax*STAIR_L*p+(i%2?.012:-.012);gz=st.sz+(i%3-1)*.02;
    if(Math.abs(s.fl-ufl)<1e-3&&uu.climb){// 계단 앞에 줄을 선다(칸 가운데 쪽으로)
      const zs=st.sz>uu.r+.5?-1:1;gx=st.sx+st.ax*(i%2?.06:.02);gz=st.sz+zs*(.05+i*.035);}}
  else if(!moving){// 창가: 쏘는 방향 벽을 따라 늘어선다
    const fa=(uu.face||0)*Math.PI/180,fx=Math.cos(fa),fz=Math.sin(fa);const n=(SQUAD[uu.type]||4);
    const ax=Math.abs(fx)>Math.abs(fz);const cx=uu.c+.5,cz=uu.r+.5;const lat=(i-(n-1)/2)/Math.max(1,n-1)*.62;
    if(ax){gx=cx+Math.sign(fx)*.31;gz=cz+lat;}else{gz=cz+Math.sign(fz)*.31;gx=cx+lat;}
    if(i>=6){gx=cx+(v3Hash(uu.id,90+i)-.5)*.4;gz=cz+(v3Hash(uu.id,95+i)-.5)*.4;}}
  else return {y:(s.fl-ufl)*FLOOR_H};
  return {x:gx,z:gz,y:(s.fl-ufl)*FLOOR_H,stair:!!onStair};}
