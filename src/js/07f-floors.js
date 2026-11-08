/* ===================== 3D: 건물 안 보여 주기 =====================
   2026-11: 건물을 잘라 보이는 단면도는 끈다(CUT_ON). 지붕이 그대로 있으니 안에 누가 있는지는
   지붕 테두리(세력 색)와 층 표시("2층", "옥상")로 알린다(v3SyncOcc). 아래 단면 코드는 다시 켤 때를 위해 남겨 둔다.
   예전: 보이는 보병이 들어 있는 건물 칸은 그 부대가 선 층에서 잘라 그린다(단면도):
   그 층 바닥, 허리 높이까지의 벽(창턱), 벽 단면, 안쪽 벽면, 칸막이, 계단실(아래층으로 내려가는 계단).
   잘린 위쪽은 옅은 윤곽선으로만 남겨 원래 높이를 알 수 있게 한다.
   모든 건물 칸에는 출입문(05e doorSides)을 그린다. 병사들은 계단 자리에 줄지어 한 명씩 오르내리고,
   층에 도착하면 쏘는 쪽 창가로 흩어진다. */
const CUT_SILL=.42;            // 잘린 벽 높이(층 높이 대비): 창턱쯤
const STAIR_L=.18,STAIR_W=.085;
/* 보이는 보병이 서 있는 건물 칸 → 잘라 보일 층. 옥상에 선 부대는 자를 필요가 없다(계단을 오르는 중이면 맨 위층을 보인다). */
const CUT_ON=false;
function v3CutMap(vs,vn){const m=new Map();m.up=new Map();if(!G||!CUT_ON)return m;const lvs=new Map();
  for(const u of G.units){if(UT[u.type].cls!=='inf')continue;if(G.fog&&!seen(u,vn,vs))continue;const x=cell(u.r,u.c);if(x.t!=='bldg')continue;
    const rf=roofFl(x);if(rf<=0)continue;let lv=Math.max(0,Math.ceil(curFl(u)-.05));if(lv>=rf){if(!u.climb)continue;lv=rf-1;}
    const k=key(u.r,u.c);if(!lvs.has(k))lvs.set(k,new Set());lvs.get(k).add(lv);}
  // 한 칸 여러 층에 부대가 있으면 가장 낮은 층에서 자르고, 위층들은 반투명 바닥판으로 보인다(아래층 부대가 비쳐 보이게)
  for(const [k,S] of lvs){const a=[...S].sort((p,q)=>p-q);m.set(k,a[0]);if(a.length>1)m.up.set(k,a.slice(1));}
  return m;}
/* 도시 메시를 다시 만들지 않고 칸 단위로 자른다: 벽 사각형은 높이를 낮추고(창 무늬도 같이), 지붕·난간은 한 점으로 접는다.
   v3BuildCity가 끝날 때 원본 좌표와 칸별 사각형 목록을 저장해 둔다. */
function v3CutPrep(){const C=V3.cityM;if(!C)return;const by=(mesh)=>{const mp=new Map();if(!mesh)return mp;const t=mesh.userData.tri;for(let i=0;i<t.length;i+=2){const k=t[i];if(!mp.has(k))mp.set(k,[]);mp.get(k).push(i/2);}return mp;};
  C.wq=by(C.w);C.rq=by(C.r);C.w0=C.w?C.w.geometry.attributes.position.array.slice():null;C.wu0=C.w?C.w.geometry.attributes.uv.array.slice():null;C.r0=C.r?C.r.geometry.attributes.position.array.slice():null;
  const inst=(im)=>{if(!im)return null;const mp=new Map();im.userData.keys.forEach((k,i)=>{if(!mp.has(k))mp.set(k,[]);mp.get(k).push(i);});const m0=im.instanceMatrix.array.slice();return {im,mp,m0};};
  C.ai=inst(C.ac);C.gi=inst(C.gab);C.cut=new Map();V3.cutTag=null;}
function v3ApplyCut(m){const C=V3.cityM;if(!C||!C.wq)return;const tag=[...m].sort((a,b)=>a[0]-b[0]).join(';')+'|'+(m.up?[...m.up].map(([k,v])=>k+':'+v.join(',')).sort().join(';'):'');if(tag===V3.cutTag)return;V3.cutTag=tag;
  const T=V3.T;const wp=C.w&&C.w.geometry.attributes.position,wu=C.w&&C.w.geometry.attributes.uv,rp=C.r&&C.r.geometry.attributes.position;
  const keys=new Set([...C.cut.keys(),...m.keys()]);let dw=false,dr=false,di=false;
  for(const k of keys){const old=C.cut.get(k),lv=m.get(k);if(old===lv)continue;
    // 원래대로
    for(const q of C.wq.get(k)||[]){const o=q*18;for(let j=0;j<18;j++)wp.array[o+j]=C.w0[o+j];const ou=q*12;for(let j=0;j<12;j++)wu.array[ou+j]=C.wu0[ou+j];dw=true;}
    for(const q of C.rq.get(k)||[]){const o=q*18;for(let j=0;j<18;j++)rp.array[o+j]=C.r0[o+j];dr=true;}
    for(const I of [C.ai,C.gi]){if(!I)continue;for(const i of I.mp.get(k)||[]){for(let j=0;j<16;j++)I.im.instanceMatrix.array[i*16+j]=I.m0[i*16+j];I.im.instanceMatrix.needsUpdate=true;}}
    if(lv==null)continue;
    const cy=.06+lv*FLOOR_H+FLOOR_H*CUT_SILL;
    for(const q of C.wq.get(k)||[]){const o=q*18,ou=q*12;let yb=1e9,yt=-1e9;for(let v=0;v<6;v++){const y=wp.array[o+v*3+1];yb=Math.min(yb,y);yt=Math.max(yt,y);}
      if(yt<=cy)continue;const ny=Math.max(cy,yb);let vb=0,vt=0;for(let v=0;v<6;v++){const y=wp.array[o+v*3+1];if(y===yb)vb=wu.array[ou+v*2+1];else vt=wu.array[ou+v*2+1];}
      for(let v=0;v<6;v++){if(wp.array[o+v*3+1]===yt){wp.array[o+v*3+1]=ny;wu.array[ou+v*2+1]=vb+(vt-vb)*(ny-yb)/((yt-yb)||1);}else if(wp.array[o+v*3+1]>ny)wp.array[o+v*3+1]=ny;}}
    for(const q of C.rq.get(k)||[]){const o=q*18;for(let v=1;v<6;v++)for(let j=0;j<3;j++)rp.array[o+v*3+j]=rp.array[o+j];}
    for(const I of [C.ai,C.gi]){if(!I)continue;for(const i of I.mp.get(k)||[]){for(let j=0;j<16;j++)I.im.instanceMatrix.array[i*16+j]=0;I.im.instanceMatrix.needsUpdate=true;}}}
  if(dw){wp.needsUpdate=true;wu.needsUpdate=true;}if(dr)rp.needsUpdate=true;
  C.cut=new Map(m);
  // 잘린 칸의 속(바닥·벽 단면·칸막이·계단실)은 작은 메시 하나로 따로 만든다
  if(V3.cutG){V3.cutG.traverse(o=>{if(o.geometry)o.geometry.dispose();});V3.scene.remove(V3.cutG);}
  const g=new T.Group();V3.cutG=g;V3.scene.add(g);const D={P:[],C:[],K:[]},L=[],UP=[];const shade=new T.Color('#b4afa6');
  for(const [k,lv] of m){const r=kr(k),c=kc(k),x=G.map[r][c];if(x.t!=='bldg')continue;const b=bldgBox(r,c);const dmg=1-x.bhp/x.bmax;let h=x.f*FLOOR_H;if(dmg>.5)h*=1-(dmg-.5)*.6;
    v3CutTile(D,L,r,c,x,b[0],b[1],b[2],b[3],lv,h,shade);
    for(const ul of (m.up&&m.up.get(k))||[])v3UpPlate(UP,L,b[0],b[1],b[2],b[3],ul);}
  v3FloorMesh(g,D,L);v3UpMesh(g,UP);}
/* 위층 반투명 바닥판과 그 층의 벽 윤곽 */
function v3UpPlate(UP,L,x0,x1,z0,z1,lv){const y=.06+lv*FLOOR_H+.002;UP.push(x0,y,z0,x0,y,z1,x1,y,z1,x0,y,z0,x1,y,z1,x1,y,z0);
  const yt=y+FLOOR_H*CUT_SILL;for(const [ax,az,bx,bz] of [[x0,z0,x1,z0],[x1,z0,x1,z1],[x1,z1,x0,z1],[x0,z1,x0,z0]]){L.push(ax,y,az,bx,y,bz,ax,yt,az,bx,yt,bz);}}
function v3UpMesh(g,UP){if(!UP.length)return;const T=V3.T;const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(UP,3));geo.computeVertexNormals();
  g.add(new T.Mesh(geo,V3.M.upPl||(V3.M.upPl=new T.MeshBasicMaterial({color:'#d8d0c0',transparent:true,opacity:.22,depthWrite:false,side:T.DoubleSide}))));}
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
function v3InY(u){const x=cell(u.r,u.c);if(UT[u.type].cls!=='inf'||x.t!=='bldg')return null;const f=u.fl!=null&&u.flK===key(u.r,u.c)?u.fl:topFl(x);return .06+Math.min(f,bldgH(x))*FLOOR_H+.005;}
/* 건물 안 병사 한 명이 갈 자리 {x,z,y(부대 바닥 기준 높이)}. null이면 평소 대형.
   계단으로 가는 중: 한 줄로 뒤따른다(trail). 계단 위: 한 줄로 계단을 타고(앞사람부터) 오르내린다.
   멈춰 있으면 쏘는 쪽 창가(옥상이면 난간)에 붙는다. */
function v3InSoldier(uu,s,i,dt){if(!inb(uu.r,uu.c))return null;const x=cell(uu.r,uu.c);   // 지도 크기가 바뀐 직후 남은 이전 판 부대
  if(UT[uu.type].cls!=='inf'||x.t!=='bldg')return null;
  const k=key(uu.r,uu.c);const ufl=uu.fl!=null&&uu.flK===k?uu.fl:roofFl(x);const st=v3Stair(uu.r,uu.c);const moving=uu.path&&uu.path.length;
  if(uu.climb&&!uu.onSt)return {trail:1,y:0};
  if(uu.climb){const dir=uu.flDir||1;const sf=Math.max(0,Math.min(roofFl(x),ufl-dir*i*.16));const fr=sf-Math.floor(sf),even=Math.floor(sf)%2===0;const p=even?fr:1-fr;
    return {x:st.sx+st.ax*STAIR_L*p,z:st.sz+(i%2?.025:-.025),y:(sf-ufl)*FLOOR_H,stair:1};}
  if(moving)return null;
  const fa=(uu.face||0)*Math.PI/180,fx=Math.cos(fa),fz=Math.sin(fa);const n=(SQUAD[uu.type]||4);
  const ax=Math.abs(fx)>Math.abs(fz);const cx=uu.c+.5,cz=uu.r+.5;const lat=(i-(n-1)/2)/Math.max(1,n-1)*.62;let gx,gz;
  // 같은 칸 같은 층에 아군 분대가 더 있으면 뒤에 온 분대는 한 줄 안쪽에 선다(겹치지 않게)
  let row=0;if(i===0||!uu._rowT||uu._rowT<(G.time||0)-1){uu._row=0;for(const o of G.units)if(o!==uu&&o.r===uu.r&&o.c===uu.c&&o.id<uu.id&&UT[o.type].cls==='inf'&&!o.climb&&Math.abs((o.fl||0)-(uu.fl||0))<.5)uu._row++;uu._rowT=G.time||0;}row=Math.min(2,uu._row||0);
  const off=.31-row*.15;
  if(ax){gx=cx+Math.sign(fx)*off;gz=cz+lat;}else{gz=cz+Math.sign(fz)*off;gx=cx+lat;}
  if(i>=6){gx=cx+(v3Hash(uu.id,90+i)-.5)*.4;gz=cz+(v3Hash(uu.id,95+i)-.5)*.4;}
  return {x:gx,z:gz,y:0};}

/* ---------- 점유 표시: 건물 안 보병이 있는 칸의 지붕 테두리와 층 표시 ---------- */
/* 보이는 보병이 든 건물 칸 → {nat, fls:Set(층 이름)} */
function v3OccMap(vs,vn){const m=new Map();if(!G)return m;
  for(const u of G.units){if(UT[u.type].cls!=='inf')continue;if(G.fog&&!seen(u,vn,vs))continue;const x=cell(u.r,u.c);if(x.t!=='bldg')continue;
    const k=key(u.r,u.c);let o=m.get(k);if(!o)m.set(k,o={nat:u.nat,mix:false,fls:new Set()});if(o.nat!==u.nat)o.mix=true;
    o.fls.add(onRoof(u)?'옥상':`${Math.floor(curFl(u)+1e-6)+1}층`);}
  return m;}
/* 지붕 위 테두리: 세력 색 선(두 세력이 한 칸에 있으면 흰색) */
function v3SyncOcc(vs,vn){const T=V3.T;const m=V3.press?new Map():v3OccMap(vs,vn);
  const tag=[...m].map(([k,o])=>k+':'+(o.mix?'x':o.nat)).sort().join(';')+'|'+(V3.ctag||'');if(tag===V3.occTag)return m;V3.occTag=tag;
  if(V3.occG){V3.occG.geometry.dispose();V3.scene.remove(V3.occG);V3.occG=null;}
  if(!m.size)return m;const P=[],C=[];const col=new T.Color();
  for(const [k,o] of m){const r=kr(k),c=kc(k),x=G.map[r][c];const b=bldgBox(r,c);const y=v3Top(r,c)+(gableRoof(x)?.21:.07);const e=.03;
    col.set(o.mix?'#ffffff':mapCol(o.nat));const x0=b[0]+e,x1=b[1]-e,z0=b[2]+e,z1=b[3]-e;
    for(const [a,b2,c2,d] of [[x0,z0,x1,z0],[x1,z0,x1,z1],[x1,z1,x0,z1],[x0,z1,x0,z0]]){P.push(a,y,b2,c2,y,d);C.push(col.r,col.g,col.b,col.r,col.g,col.b);}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setAttribute('color',new T.Float32BufferAttribute(C,3));
  V3.occG=new T.LineSegments(g,V3.M.occ||(V3.M.occ=new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.9,depthWrite:false})));V3.occG.renderOrder=5;V3.scene.add(V3.occG);
  return m;}
/* 층 표시 이름표(v3SyncLabels가 부른다) */
function occLabels(want,vs,vn){if(V3.press)return;const m=v3OccMap(vs,vn);
  for(const [k,o] of m){const r=kr(k),c=kc(k);const [cx,cz]=v3x(r,c);const fl=[...o.fls].sort((a,b)=>(a==='옥상')-(b==='옥상')||parseInt(a)-parseInt(b)).join('·');
    want.set('occ'+k,{html:`<span>${fl}</span>`,cls:'v3o',col:o.mix?'#ffffff':mapCol(o.nat),p:[cx+.32,v3Top(r,c)+(gableRoof(G.map[r][c])?.3:.12),cz-.32]});}}

/* ---------- 창가에서 내다보기 ----------
   단면도를 끈 뒤로는 실내 병사가 벽에 가려 안 보인다. 창가(바깥 외벽 가까이)에 선 병사는 쏘거나 막 쏜 뒤에
   창턱 바로 안쪽까지 나와 창 구멍으로 보였다가(PEEK_OUT) 다시 벽 안으로 숨는다(PEEK_IN). 총구 화염도 그 자리에서 난다.
   돌려주는 값: 병사가 갈 자리 {x,z,f(바라볼 방향)} 또는 null(창가가 아님) */
const PEEK_OUT=-.014,PEEK_IN=.07,PEEK_T=1.3;
function v3WinPeek(uu,m,t){const x=cell(uu.r,uu.c);if(x.t!=='bldg'||onRoof(uu)||uu.climb)return null;const b=bldgBox(uu.r,uu.c),e=1e-6,r=uu.r,c=uu.c;
  // 바깥과 맞닿은 외벽(같은 블록과 붙지 않은 면)만: [벽 좌표, 축(0=x,1=z), 바깥 방향]
  const W=[];if(b[0]>c+e)W.push([b[0],0,-1]);if(b[1]<c+1-e)W.push([b[1],0,1]);if(b[2]>r+e)W.push([b[2],1,-1]);if(b[3]<r+1-e)W.push([b[3],1,1]);
  let best=null,bd=.2;for(const w of W){const d=Math.abs((w[1]?m.z:m.x)-w[0]);if(d<bd){bd=d;best=w;}}if(!best)return null;
  const [wv,ax,sg]=best;const peek=t-(m.ft??-99)<PEEK_T;const off=peek?PEEK_OUT:-PEEK_IN;
  const lo=ax?b[0]+.06:b[2]+.06,hi=ax?b[1]-.06:b[3]-.06;let along=Math.min(hi,Math.max(lo,ax?m.x:m.z));
  // 외벽 무늬(07-view3d facade)의 창 한가운데로 맞춘다: 창은 .21칸마다, 건물마다 무늬가 u0만큼 밀려 있다.
  // 무늬 u는 벽 사각형의 첫 꼭짓점 A에서 B 쪽으로 감긴다(07-view3d box): 북·동쪽 벽은 좌표가 줄어드는 쪽으로.
  {const bt=x.blk!=null?v3Hash(x.blk,3):v3Hash(key(r,c),3);const P=.5-8*((bt*8|0)*.37);const L0=ax?b[0]:b[2],L1=ax?b[1]:b[3];const rev=ax?sg<0:sg>0;
    const at=n=>rev?L0+L1-.21*(n+P):.21*(n+P)+L0-L1;const n0=Math.round((rev?(L0+L1-along):(along-L0+L1))/.21-P);let bw=null,bdd=1e9;
    for(const n of [n0-1,n0,n0+1]){const v=at(n);if(v<lo-.02||v>hi+.02)continue;const dd=Math.abs(v-along);if(dd<bdd){bdd=dd;bw=v;}}
    if(bw!=null)along=bw+(m.i%2?.012:-.012);}
  const px=ax?along:wv+sg*off,pz=ax?wv+sg*off:along;
  const f=peek&&m.aim?Math.atan2(m.aim[1]-pz,m.aim[0]-px):ax?(sg>0?Math.PI/2:-Math.PI/2):(sg>0?0:Math.PI);
  return {x:px,z:pz,f,peek,y:peek?.06:0};}   // 내밀 때는 창턱 높이로 몸을 올린다(창은 층 높이의 .31~.78)

/* ---------- 창이 뚫린 건물의 속: 층마다 바닥판 ----------
   외벽 창은 구멍이라(07-view3d winA) 안이 들여다보인다. 층마다 어두운 바닥판을 깔아 병사가 그 위에 서 보이고,
   아래층·땅이 비쳐 보이지 않게 한다. v3BuildCity가 끝날 때마다 다시 만든다. */
function v3BuildSlabs(g){const T=V3.T;const L=[];
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=G.map[r][c];if(x.t!=='bldg')continue;const b=bldgBox(r,c);const top=bldgH(x);const k=key(r,c);
    for(let f=0;f<x.f&&f<top-.05;f++)L.push([(b[0]+b[1])/2,.06+f*FLOOR_H+.004,(b[2]+b[3])/2,b[1]-b[0]-.012,b[3]-b[2]-.012,k]);}
  if(!L.length)return;const im=new T.InstancedMesh(new T.BoxGeometry(1,.012,1),V3.M.slab||(V3.M.slab=new T.MeshStandardMaterial({color:'#4a453e',roughness:1})),L.length);
  im.receiveShadow=true;const m4=new T.Matrix4(),q=new T.Quaternion(),p=new T.Vector3(),sc=new T.Vector3();
  L.forEach(([x,y,z,sx,sz],i)=>{p.set(x,y,z);sc.set(sx,1,sz);m4.compose(p,q,sc);im.setMatrixAt(i,m4);});im.userData.keys=L.map(o=>o[5]);g.add(im);}
{const _bc=v3BuildCity;v3BuildCity=function(){_bc.apply(this,arguments);try{v3BuildSlabs(V3.G.city);}catch(e){console.error(e);}};}
