/* ===================== 3D: 지형 높이 · 강 · 다리 · 철도 =====================
   지형 높이는 셰이더에서 입힌다: 모든 재질의 정점을 월드 좌표로 옮긴 뒤 높이 텍스처(G.elv)만큼 들어 올린다.
   그래서 건물·소품·병사·효과가 따로 높이를 몰라도 언덕 위에 제대로 선다(그림자 깊이 재질 포함).
   - v3TerrInstall(): Material.prototype.onBeforeCompile에 높이 훅을 건다(v3Init에서 재질을 만들기 전에).
   - v3TerrUpd(): 새 지도마다 높이 텍스처를 채운다. 지면 재질은 높이 기울기로 법선을 다시 구해 비탈에 음영이 진다.
   - v3TerrTex(g,P): 지면 그림에 강(둑·물결)과 철길(자갈·침목·레일·승강장)을 그린다.
   - v3BuildTerrain(g): 강물 수면, 다리(상판·난간·교각), 철교, 전차선 기둥, 화물열차, 건널목 차단기, 역 승강장 지붕.
   - v3TY(x,z): 땅의 화면 높이. 화면 좌표로 투영하는 코드(라벨·부대 고르기)가 더한다. */
const TERR3={u:{map:{value:null},p:{value:null}},on:false};
const v3TY=(x,z)=>G&&G.elv?elAt(x,z)*FLOOR_H:0;
const TERR_GLSL='uniform sampler2D terrHM;uniform vec4 terrHP;\nfloat terrH(vec2 p){if(terrHP.x<=0.)return 0.;return texture2D(terrHM,(p+.5)/terrHP.y).r*terrHP.x;}\n';
const TERR_SPRITE='vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );';
function v3TerrHook(sh,mat){const T=V3.T;if(!T)return;let vs=sh.vertexShader;
  const hasP=vs.includes('#include <project_vertex>'),hasS=vs.includes(TERR_SPRITE);if(!hasP&&!hasS)return;
  if(!TERR3.u.p.value)TERR3.u.p.value=new T.Vector4(0,1,0,0);
  sh.uniforms.terrHM=TERR3.u.map;sh.uniforms.terrHP=TERR3.u.p;
  if(hasP)vs=vs.replace('#include <project_vertex>','vec4 mvPosition=vec4(transformed,1.);\n#ifdef USE_BATCHING\nmvPosition=batchingMatrix*mvPosition;\n#endif\n#ifdef USE_INSTANCING\nmvPosition=instanceMatrix*mvPosition;\n#endif\nmvPosition=modelMatrix*mvPosition;mvPosition.y+=terrH(mvPosition.xz);mvPosition=viewMatrix*mvPosition;gl_Position=projectionMatrix*mvPosition;');
  vs=vs.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\n#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0\nworldPosition.y+=terrH(worldPosition.xz);\n#endif');
  if(hasS)vs=vs.replace(TERR_SPRITE,'vec4 tW=modelMatrix*vec4(0.,0.,0.,1.);tW.y+=terrH(tW.xz);vec4 mvPosition=viewMatrix*tW;');
  if(mat&&mat.userData&&mat.userData.terrN)vs=vs.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\n{vec2 tp=(modelMatrix*vec4(position,1.)).xz;float hx=terrH(tp+vec2(.3,0.))-terrH(tp-vec2(.3,0.)),hz=terrH(tp+vec2(0.,.3))-terrH(tp-vec2(0.,.3));objectNormal=normalize(vec3(-hx/.6,1.,-hz/.6));}');
  sh.vertexShader=TERR_GLSL+vs;}
function v3TerrInstall(){if(TERR3.on||!V3.T)return;TERR3.on=true;const P=V3.T.Material.prototype;const prev=P.onBeforeCompile;
  P.onBeforeCompile=function(sh,ren){prev.call(this,sh,ren);v3TerrHook(sh,this);};}
function v3TerrUpd(){const T=V3.T;v3TerrInstall();if(!TERR3.u.p.value)TERR3.u.p.value=new T.Vector4(0,1,0,0);const W=N+1;
  if(V3.M&&V3.M.terr)V3.M.terr.userData.terrN=1;
  if(!G.elv){TERR3.u.p.value.set(0,W,0,0);return;}
  let tx=TERR3.tex;if(!tx||tx.image.width!==W){if(tx)tx.dispose();tx=new T.DataTexture(new Uint8Array(W*W*4),W,W);tx.magFilter=tx.minFilter=T.LinearFilter;tx.wrapS=tx.wrapT=T.ClampToEdgeWrapping;TERR3.tex=tx;}
  const d=tx.image.data;for(let i=0;i<W*W;i++){d[i*4]=Math.round(Math.max(0,Math.min(1,G.elv[i]/EL_MAX))*255);d[i*4+3]=255;}tx.needsUpdate=true;
  TERR3.u.map.value=tx;TERR3.u.p.value.set(EL_MAX*FLOOR_H,W,0,0);}

/* ---------- 지면 그림: 강, 철길 ---------- */
function v3TerrTex(g,P){const f=G.feat;if(!f)return;const R=mulberry((G.seed^0x41f)>>>0);
  const path=pts=>{g.beginPath();pts.forEach(([x,z],i)=>i?g.lineTo(x*P,z*P):g.moveTo(x*P,z*P));};
  if(f.river){const w=f.river.w;
    // 강 칸: 흙둑 → 돌 축대 → 물. 물은 꺾은선을 굵게 그어 매끄럽게
    for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(G.map[r][c].rv){g.fillStyle='#4d4940';g.fillRect(c*P,r*P,P,P);}
    g.lineCap=g.lineJoin='round';path(f.river.pts);g.strokeStyle='#7f7a6f';g.lineWidth=(w+.25)*P;g.stroke();
    g.strokeStyle='#5c5850';g.lineWidth=(w+.05)*P;g.stroke();g.strokeStyle='#1f2d34';g.lineWidth=(w-.12)*P;g.stroke();
    g.strokeStyle='rgba(70,95,105,.35)';g.lineWidth=(w-.9)*P;g.stroke();
    // 물결: 흐름 방향 짧은 빛줄
    for(let i=0;i+1<f.river.pts.length;i++){const [ax,az]=f.river.pts[i],[bx,bz]=f.river.pts[i+1];const L=Math.hypot(bx-ax,bz-az)||1,nx=-(bz-az)/L,nz=(bx-ax)/L;
      for(let k=0;k<3;k++){const o=(R()-.5)*(w-.6),x=ax+nx*o,z=az+nz*o;g.strokeStyle=`rgba(170,195,200,${.06+R()*.08})`;g.lineWidth=1.2;g.beginPath();g.moveTo(x*P,z*P);g.lineTo((x+(bx-ax)*.6)*P,(z+(bz-az)*.6)*P);g.stroke();}}}
  if(f.rail){const pts=f.rail.pts;g.lineCap=g.lineJoin='round';
    // 승강장: 역 옆 철길 칸에 밝은 콘크리트
    for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(G.map[r][c].plat){g.fillStyle='#9a958a';g.fillRect(c*P,r*P,P,P);g.fillStyle='rgba(225,200,90,.55)';}
    path(pts);g.strokeStyle='rgba(40,36,30,.35)';g.lineWidth=P*.62;g.stroke();g.strokeStyle='#6d675d';g.lineWidth=P*.46;g.stroke();
    for(let i=0;i<pts.length*40;i++){const j=Math.floor(R()*(pts.length-1));const t=R();const x=pts[j][0]+(pts[j+1][0]-pts[j][0])*t,z=pts[j][1]+(pts[j+1][1]-pts[j][1])*t;
      g.fillStyle=R()<.5?'rgba(30,28,24,.35)':'rgba(170,160,145,.3)';g.fillRect(x*P+(R()-.5)*P*.4,z*P+(R()-.5)*P*.4,1.5,1.5);}
    // 침목과 레일 (궤간 1.435m ≈ .12칸)
    let acc=0;for(let i=0;i+1<pts.length;i++){const [ax,az]=pts[i],[bx,bz]=pts[i+1];const L=Math.hypot(bx-ax,bz-az)||1,ux=(bx-ax)/L,uz=(bz-az)/L,nx=-uz,nz=ux;
      for(let s=(.06-acc%.06);s<L;s+=.06){const x=ax+ux*s,z=az+uz*s;g.strokeStyle='#3a3029';g.lineWidth=1.6;g.beginPath();g.moveTo((x+nx*.13)*P,(z+nz*.13)*P);g.lineTo((x-nx*.13)*P,(z-nz*.13)*P);g.stroke();}acc+=L;}
    for(const o of [-.065,.065]){g.beginPath();pts.forEach(([x,z],i)=>{const j=Math.min(i,pts.length-2);const L=Math.hypot(pts[j+1][0]-pts[j][0],pts[j+1][1]-pts[j][1])||1;const nx=-(pts[j+1][1]-pts[j][1])/L,nz=(pts[j+1][0]-pts[j][0])/L;
        const X=(x+nx*o)*P,Z=(z+nz*o)*P;i?g.lineTo(X,Z):g.moveTo(X,Z);});g.strokeStyle='#a3a29c';g.lineWidth=1.3;g.stroke();}
    // 승강장 노란 안전선
    for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(G.map[r][c].plat){g.fillStyle='rgba(215,190,80,.6)';for(let i=0;i<4;i++)g.fillRect(c*P+R()*P*.8,r*P+R()*P*.8,6,2);}}}

/* ---------- 3D: 강물·다리·철도 ---------- */
// 철길 꺾은선에서 (x,z)와 가장 가까운 구간의 방향 단위벡터
function v3RailDir(x,z){const pts=G.feat&&G.feat.rail?G.feat.rail.pts:[];let bd=1e9,u=[1,0];for(let i=0;i+1<pts.length;i++){const [ax,az]=pts[i],[bx,bz]=pts[i+1];const d=Math.hypot((ax+bx)/2-x,(az+bz)/2-z);
    if(d<bd){bd=d;const L=Math.hypot(bx-ax,bz-az)||1;u=[(bx-ax)/L,(bz-az)/L];}}return u;}
function v3TerrMats(){if(V3.terrM)return V3.terrM;const T=V3.T;
  const M={water:new T.MeshStandardMaterial({color:'#2c3e45',roughness:.22,metalness:.35,transparent:true,opacity:.92}),
    deck:new T.MeshStandardMaterial({color:'#ffffff',roughness:.95}),rail:new T.MeshStandardMaterial({color:'#5d5f60',roughness:.7,metalness:.3}),
    pier:new T.MeshStandardMaterial({color:'#6e6b64',roughness:1}),steel:new T.MeshStandardMaterial({color:'#3e4447',roughness:.6,metalness:.5}),
    wag:new T.MeshStandardMaterial({color:'#ffffff',roughness:.75,metalness:.2}),dark:new T.MeshStandardMaterial({color:'#1e2022',roughness:.8}),
    stripe:new T.MeshStandardMaterial({color:'#c9c4b8',roughness:.6}),red:new T.MeshStandardMaterial({color:'#9c3128',roughness:.6}),
    canopy:new T.MeshStandardMaterial({color:'#7b7f80',roughness:.7,metalness:.3})};
  for(const k in M)if(k!=='water')v3FowMat(M[k]);v3FowMat(M.water);V3.terrM=M;return M;}
function v3BuildTerrain(g){const f=G.feat;if(!f||G.camp)return;const T=V3.T,M=v3TerrMats();const at=(r,c)=>inb(r,c)?G.map[r][c]:null;
  const water=[],deck=[],rails=[],piers=[],gird=[],poles=[],arms=[],wag=[],wtop=[],xing=[],xbar=[],can=[],canP=[];
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=G.map[r][c];if(!x.rv)continue;const [cx,cz]=v3x(r,c);
    water.push({x:cx,y:.016,z:cz,rx:-Math.PI/2,sx:1.002,sy:1.002});
    if(!x.br)continue;
    if(x.br===3)continue;   // 철교는 아래에서 철길 꺾은선을 따라 잇는다
    const H2=x.ro!=='v';deck.push({x:cx,y:.045,z:cz,sx:1,sy:.05,sz:1,col:'#8a8780'});
    for(const s of [-1,1]){const y=H2?at(r+s,c):at(r,c+s);if(y&&y.br)continue;   // 다리 바깥 가장자리에만 난간
      rails.push(H2?{x:cx,y:.1,z:cz+s*.47,sx:1,sy:.06,sz:.03}:{x:cx+s*.47,y:.1,z:cz,sx:.03,sy:.06,sz:1});
      if((H2?c:r)%2===0)piers.push(H2?{x:cx,y:-.1,z:cz+s*.36,sx:.12,sy:.3,sz:.12}:{x:cx+s*.36,y:-.1,z:cz,sx:.12,sy:.3,sz:.12});}}
  if(f.rail){const pts=f.rail.pts;
    // 철교: 물 위 구간마다 상판과 양옆 강철 거더를 꺾은선 방향으로
    for(let i=0;i+1<pts.length;i++){const [ax,az]=pts[i],[bx,bz]=pts[i+1];const mx=(ax+bx)/2,mz=(az+bz)/2;const t=at(Math.floor(mz),Math.floor(mx));if(!t||t.br!==3)continue;
      const L=Math.hypot(bx-ax,bz-az)||1,ux=(bx-ax)/L,uz=(bz-az)/L,ry=-Math.atan2(uz,ux);
      deck.push({x:mx,y:.05,z:mz,ry,sx:L+.03,sy:.05,sz:.56,col:'#6f6c66'});
      for(const s2 of [-1,1])gird.push({x:mx-uz*s2*.27,y:.12,z:mz+ux*s2*.27,ry,sx:L+.03,sy:.11,sz:.035});
      if(i%3===0)piers.push({x:mx,y:-.1,z:mz,ry,sx:.14,sy:.3,sz:.5});}
    // 전차선 기둥: 1.6칸마다 철길 한쪽에
    let acc=0;for(let i=0;i+1<pts.length;i++){const [ax,az]=pts[i],[bx,bz]=pts[i+1];const L=Math.hypot(bx-ax,bz-az)||1,ux=(bx-ax)/L,uz=(bz-az)/L;acc+=L;if(acc<1.6)continue;acc=0;
      const x=ax-uz*.3,z=az+ux*.3;const r=Math.floor(z),c=Math.floor(x);const t=at(r,c);if(!t||t.t==='bldg'||t.t==='road'&&!t.rail||t.rv&&!t.br)continue;
      poles.push({x,y:.17,z});arms.push({x:ax-uz*.15,y:.33,z:az+ux*.15,ry:-Math.atan2(-ux,uz)});}
    // 승강장 지붕: 역 근처 철길을 따라 역 쪽으로
    const st=[];for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(G.map[r][c].stn)st.push([c+.5,r+.5]);
    if(st.length){const sx=st.reduce((s,p)=>s+p[0],0)/st.length,sz=st.reduce((s,p)=>s+p[1],0)/st.length;
      for(let i=0;i+1<pts.length;i++){const [ax,az]=pts[i],[bx,bz]=pts[i+1];const r=Math.floor(az),c=Math.floor(ax);if(!at(r,c)?.plat)continue;const L=Math.hypot(bx-ax,bz-az)||1;let nx=-(bz-az)/L,nz=(bx-ax)/L;
        if((sx-ax)*nx+(sz-az)*nz<0){nx=-nx;nz=-nz;}const ry=-Math.atan2(bz-az,bx-ax);can.push({x:ax+nx*.42,y:.25,z:az+nz*.42,ry,sx:.55,sy:.02,sz:.32});if(i%2===0)canP.push({x:ax+nx*.5,y:.12,z:az+nz*.5});}}}
  for(const p of G.props||[]){
    if(p.k==='wagon'){const col=p.burnt?'#2a2622':p.col;wag.push({x:p.x,y:.11,z:p.z,ry:p.ry,sx:.5,sy:p.loco?.17:.15,sz:.17,col});
      wtop.push({x:p.x,y:.035,z:p.z,ry:p.ry,sx:.46,sy:.05,sz:.13});
      if(p.loco)wag.push({x:p.x+Math.cos(p.ry)*.12,y:.22,z:p.z-Math.sin(p.ry)*.12,ry:p.ry,sx:.18,sy:.08,sz:.15,col:'#3a4045'});}
    else if(p.k==='xing'){const r=Math.floor(p.z),c=Math.floor(p.x);const x=G.map[r][c];if(x.ro!=='h'&&x.ro!=='v')continue;const H2=x.ro==='h';
      for(const s of [-1,1]){const ox=H2?s*.5:s*.42,oz=H2?s*.42:s*.5;xing.push({x:p.x+ox,y:.08,z:p.z+oz,sx:.025,sy:.16,sz:.025});
        xbar.push({x:p.x+ox+(H2?0:-s*.2),y:.15,z:p.z+oz+(H2?-s*.2:0),ry:H2?Math.PI/2:0,sx:.4,sy:.018,sz:.018});}}}
  const box=()=>new T.BoxGeometry(1,1,1);
  v3Inst(g,new T.PlaneGeometry(1,1),M.water,water,{noShadow:1});
  v3Inst(g,box(),M.deck,deck);v3Inst(g,box(),M.rail,rails);v3Inst(g,box(),M.pier,piers);v3Inst(g,box(),M.steel,gird);
  v3Inst(g,new T.CylinderGeometry(.012,.015,.34,5),M.steel,poles);v3Inst(g,box().scale(.3,.012,.012),M.steel,arms);
  v3Inst(g,box(),M.wag,wag);v3Inst(g,box(),M.dark,wtop);v3Inst(g,box(),M.stripe,xing);v3Inst(g,box(),M.red,xbar);
  v3Inst(g,box(),M.canopy,can);v3Inst(g,new T.CylinderGeometry(.01,.01,.24,5),M.steel,canP);}

/* ---------- 화면 → 땅 (언덕 높이를 따라) ---------- */
function v3TerrRay(rc){const T=V3.T;const p=new T.Vector3(),pl=new T.Plane(new T.Vector3(0,1,0),0);let h=0;
  for(let i=0;i<5;i++){pl.constant=-h;if(!rc.ray.intersectPlane(pl,p))return null;const nh=v3TY(p.x,p.z);if(Math.abs(nh-h)<.002)break;h=nh;}return p;}
v3Ground=(o=>function(cx,cy){if(!G||!G.elv)return o(cx,cy);return v3TerrRay(v3Ray(cx,cy));})(v3Ground);
v3Pick=(o=>function(cx,cy,rad){const k=o(cx,cy,rad);if(!G||!G.elv||V3.pickId!=null)return k;const p=v3TerrRay(v3Ray(cx,cy));if(!p)return k;
  const r=Math.floor(p.z),c=Math.floor(p.x);if(!inb(r,c))return k;const t0=k!=null&&inb(kr(k),kc(k))?G.map[kr(k)][kc(k)]:null;
  if(t0&&t0.t==='bldg'&&G.map[r][c].t!=='bldg')return k;V3.pickPt=[p.x,p.z];return key(r,c);})(v3Pick);
