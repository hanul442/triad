/* ===================== 3D VIEW (three.js) =====================
   전장은 three.js로 그린다. 엔진은 처음 화면을 열 때 불러온다(오프라인 캐시 포함).
   월드 좌표: 칸 (r,c)의 중심 = (x=c+.5, z=r+.5), 칸 한 변 = 1, 높이 단위는 층(FLOOR_H). */
const V3={on:false,busy:false,T:null};
async function v3Load(){if(V3.T)return V3.T;
  for(const s of ['./vendor/three.module.min.js','https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js']){try{V3.T=await import(s);return V3.T;}catch(e){}}return null;}
function v3Supported(){try{const c=document.createElement('canvas');return !!(window.WebGLRenderingContext&&(c.getContext('webgl2')||c.getContext('webgl')));}catch(e){return false;}}
async function startView(){if(V3.on||V3.busy)return;if(!v3Supported()){v3Fail('이 기기나 브라우저는 3D(WebGL)를 지원하지 않습니다.');return;}
  V3.busy=true;const T=await v3Load();V3.busy=false;if(!T){v3Fail('3D 엔진을 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 새로고침하세요.');return;}
  v3Init();V3.on=true;v3Size();
  Object.assign(FXH,{fire:v3FxFire,kill:v3FxKill,collapse:v3FxCollapse,strike:v3FxStrike,land:v3FxLand,boom:v3FxBoom,launch:v3FxLaunch,breach:v3FxBreach});
  if(G){v3Sync();v3HomeCam(true);}requestAnimationFrame(v3Frame);}
function v3Fail(m){const el=$('#v3d-err');if(el){el.textContent=m;el.hidden=false;}}

/* ---------- 기본 도구 ---------- */
const v3x=(r,c)=>[c+.5,r+.5];
function v3Hash(k,s){let h=(k*2654435761^(s||0)*40503)>>>0;h=Math.imul(h^h>>>15,2246822507)>>>0;h=Math.imul(h^h>>>13,3266489909)>>>0;return ((h^h>>>16)>>>0)/4294967296;}
const GH={road:0,plaza:0,park:0,rubble:0,bldg:.06,water:0};
const v3G=(r,c)=>GH[G.map[r][c].t]??0;
function v3Top(r,c){const x=G.map[r][c];return x.t==='bldg'?.06+x.f*FLOOR_H:v3G(r,c);}
const V3COL={road:'#3b3c3d',plaza:'#7f7d77',park:'#5a6247',rubble:'#5e5952',bldg:'#6d6b66',water:'#3a5560'};
function v3Tex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new V3.T.CanvasTexture(c);t.colorSpace=V3.T.SRGBColorSpace;return t;}

/* ---------- 초기화 ---------- */
function v3Init(){const T=V3.T;const cv=$('#v3d');
  const ren=new T.WebGLRenderer({canvas:cv,antialias:false,powerPreference:'high-performance'});
  // 레퍼런스처럼 살짝 거친 픽셀 화면: 화면 픽셀보다 낮은 해상도로 그리고 확대한다
  ren.setPixelRatio(v3PixelRatio());ren.shadowMap.enabled=true;ren.shadowMap.type=T.PCFSoftShadowMap;
  ren.toneMapping=T.ACESFilmicToneMapping;ren.toneMappingExposure=.92;ren.outputColorSpace=T.SRGBColorSpace;
  const scene=new T.Scene();const cam=new T.PerspectiveCamera(38,1,.1,400);
  const hemi=new T.HemisphereLight('#c9cccb','#6b6458',1.2);scene.add(hemi);
  const sun=new T.DirectionalLight('#f3e6d0',2.4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0004;sun.shadow.normalBias=.03;sun.shadow.radius=3;
  const sc=sun.shadow.camera;sc.near=1;sc.far=90;scene.add(sun);scene.add(sun.target);scene.fog=new T.Fog('#6f6a62',30,90);
  const flash=new T.PointLight('#ffaa55',0,10,1.6);scene.add(flash);
  // 판상형 아파트 외벽: 8열×8층, 칸마다 창 하나
  const WIN=[];const fr=mulberry(7);
  const facade=v3Tex(512,512,(g,w,h)=>{g.fillStyle='#a6a39c';g.fillRect(0,0,w,h);
    for(let y=0;y<8;y++)for(let x=0;x<8;x++){const t=fr();g.fillStyle=`rgba(${t<.5?40:255},${t<.5?36:250},${t<.5?30:240},${.03+fr()*.07})`;g.fillRect(x*64,y*64,64,64);}
    for(let i=0;i<5000;i++){const l=fr()<.5;g.fillStyle=l?'rgba(255,255,255,.05)':'rgba(0,0,0,.06)';g.fillRect(fr()*w,fr()*h,2,2);}
    g.fillStyle='rgba(50,46,40,.45)';for(let y=0;y<8;y++)g.fillRect(0,y*64+62,w,2);g.fillStyle='rgba(50,46,40,.22)';for(let x=0;x<8;x++)g.fillRect(x*64+63,0,1,h);
    for(let y=0;y<8;y++)for(let x=0;x<8;x++){const X=x*64+15,Y=y*64+14,bal=x%4===1||x%4===2;
      if(bal){g.fillStyle='rgba(0,0,0,.25)';g.fillRect(X-8,Y+34,50,8);g.fillStyle='#9a958a';g.fillRect(X-8,Y+30,50,6);g.fillStyle='#837e74';g.fillRect(X-8,Y+36,50,2);}
      g.fillStyle='#d2cec4';g.fillRect(X-2,Y-2,38,34);const r=fr();
      const gr=g.createLinearGradient(X,Y,X+34,Y+30);gr.addColorStop(0,r<.08?'#0b0c0d':'#3d4a55');gr.addColorStop(1,r<.08?'#151515':'#1a2026');g.fillStyle=gr;g.fillRect(X,Y,34,30);
      if(r>.08){g.fillStyle='#c9c5bb';g.fillRect(X+16,Y,2,30);g.fillRect(X,Y+12,34,2);if(r>.75){g.fillStyle='rgba(150,130,105,.75)';g.fillRect(X+1,Y+1,14,11);}}
      WIN.push([X,Y,r]);}
    for(let i=0;i<40;i++){const x=fr()*w,y=fr()*h,len=30+fr()*120;const gr=g.createLinearGradient(0,y,0,y+len);gr.addColorStop(0,'rgba(45,40,34,.18)');gr.addColorStop(1,'rgba(45,40,34,0)');g.fillStyle=gr;g.fillRect(x,y,2+fr()*5,len);}});
  facade.wrapS=facade.wrapT=T.RepeatWrapping;
  const lights=v3Tex(512,512,(g,w,h)=>{g.fillStyle='#000';g.fillRect(0,0,w,h);for(const [X,Y,r] of WIN){if(r>.08&&fr()<.32){g.fillStyle=fr()<.8?'#ffc77a':'#fff0cf';g.fillRect(X,Y,34,30);}}});
  lights.wrapS=lights.wrapT=T.RepeatWrapping;
  const roofT=v3Tex(256,256,(g,w,h)=>{g.fillStyle='#8f8d89';g.fillRect(0,0,w,h);for(let i=0;i<9000;i++){const v=90+fr()*90|0;g.fillStyle=`rgba(${v},${v},${v-6},.3)`;g.fillRect(fr()*w,fr()*h,2,2);}
    for(let i=0;i<7;i++){const x=fr()*w,y=fr()*h;g.fillStyle=`rgba(28,27,25,${.25+fr()*.25})`;g.beginPath();for(let j=0;j<9;j++){const a=j/9*6.283,rr=14+fr()*34;g[j?'lineTo':'moveTo'](x+Math.cos(a)*rr,y+Math.sin(a)*rr*.8);}g.closePath();g.fill();}g.strokeStyle='rgba(60,58,54,.35)';g.lineWidth=2;for(let i=0;i<=w;i+=64){g.beginPath();g.moveTo(i,0);g.lineTo(i,h);g.stroke();g.beginPath();g.moveTo(0,i);g.lineTo(w,i);g.stroke();}});
  roofT.wrapS=roofT.wrapT=T.RepeatWrapping;
  for(const t of [facade,lights,roofT])t.anisotropy=ren.capabilities.getMaxAnisotropy();
  const puff=v3Tex(64,64,(g)=>{const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.5,'rgba(255,255,255,.45)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);});
  const M={
    terr:new T.MeshStandardMaterial({roughness:.95,metalness:0}),
    wall:new T.MeshStandardMaterial({map:facade,emissiveMap:lights,emissive:'#ffffff',emissiveIntensity:0,vertexColors:true,roughness:.92}),
    roof:new T.MeshStandardMaterial({map:roofT,vertexColors:true,roughness:.95,flatShading:true,side:T.DoubleSide}),
    rubble:new T.MeshStandardMaterial({color:'#77736c',roughness:1,flatShading:true}),
    mark:new T.MeshStandardMaterial({color:'#d9d4c4',roughness:.8}),
    tree:new T.MeshStandardMaterial({color:'#3a352f',roughness:1,flatShading:true}),
    trunk:new T.MeshStandardMaterial({color:'#4a3b2c',roughness:1}),
    steel:new T.MeshStandardMaterial({color:'#3d4246',roughness:.6,metalness:.4}),
    conc:new T.MeshStandardMaterial({color:'#77736b',roughness:.95}),
    dark:new T.MeshStandardMaterial({color:'#1e2124',roughness:.8}),
    hl:new T.MeshBasicMaterial({transparent:true,opacity:.38,depthTest:false,depthWrite:false}),
    line:new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.95,depthTest:false,depthWrite:false}),
    smoke:new T.SpriteMaterial({map:puff,color:'#3e3a35',transparent:true,depthWrite:false,opacity:.55}),
    fire:new T.SpriteMaterial({map:puff,color:'#ff8a3a',transparent:true,depthWrite:false,blending:T.AdditiveBlending}),
  };
  V3.fowU={map:{value:null},n:{value:N}};
  for(const k of ['terr','wall','roof','rubble','tree','trunk','conc'])v3FowMat(M[k]);
  const G3={world:new T.Group(),city:new T.Group(),sites:new T.Group(),units:new T.Group(),hl:new T.Group(),fx:new T.Group(),amb:new T.Group()};
  for(const k in G3)scene.add(G3[k]);
  Object.assign(V3,{ren,scene,cam,cv,hemi,sun,flash,M,puff,G:G3,cs:{x:12,z:12,yaw:0,pitch:1.38,d:14,gx:12,gz:12,gyaw:0,gd:14},
    uo:new Map(),fx:[],smoke:[],labels:new Map(),tag:null,last:0,shake:0,matc:new Map()});
  v3Controls(cv);window.addEventListener('resize',v3Size);dsInit();}
// 전장의 안개: 안 보이는 칸을 지면·건물 모두 어둡게 (칸 경계는 부드럽게)
function v3FowMat(mat){mat.onBeforeCompile=sh=>{sh.uniforms.fowMap=V3.fowU.map;sh.uniforms.fowN=V3.fowU.n;
    sh.vertexShader='varying vec2 vFowW;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvec4 fowP=vec4(transformed,1.);\n#ifdef USE_INSTANCING\nfowP=instanceMatrix*fowP;\n#endif\nvFowW=(modelMatrix*fowP).xz;');
    sh.fragmentShader='uniform sampler2D fowMap;uniform float fowN;varying vec2 vFowW;\n'+sh.fragmentShader.replace('#include <fog_fragment>','{float fv=texture2D(fowMap,vFowW/fowN).r;vec3 gy=vec3(dot(gl_FragColor.rgb,vec3(.3,.59,.11)));gl_FragColor.rgb=mix(gy*vec3(.5,.54,.6),gl_FragColor.rgb,fv);}\n#include <fog_fragment>');};
  mat.customProgramCacheKey=()=>'fow';}
// 안개 텍스처: 한 칸을 FOW_R×FOW_R 점으로 (04b-sight의 잘게 나눈 시야). 선형 보간으로 경계가 부드럽다.
function v3FowUpd(vs){if(!V3.fowD)return;const d=V3.fowD,M=N*FOW_R;if(d.length!==M*M*4)return;const f=vs&&vs.fine;
  if(V3.fowSrc===f&&f)return;V3.fowSrc=f;for(let i=0;i<M*M;i++)d[i*4]=!f||f[i]?255:0;V3.fowT.needsUpdate=true;}
function v3PixelRatio(){const d=window.devicePixelRatio||1;return Math.max(.5,Math.min(1.1,d*.55));}
function v3Size(){if(!V3.ren)return;const a=$('#app');const w=a.clientWidth,h=a.clientHeight;V3.ren.setPixelRatio(v3PixelRatio());V3.ren.setSize(w,h,false);V3.cam.aspect=w/Math.max(1,h);V3.cam.fov=V3.cam.aspect<1?Math.min(62,38/Math.sqrt(V3.cam.aspect)):38;V3.cam.updateProjectionMatrix();}

/* ---------- 카메라 ---------- */
function v3Focus(r,c){const [x,z]=v3x(r,c);V3.cs.gx=x;V3.cs.gz=z;}
function camFollow(r,c){if(!V3.on)return;const s=V3.cs;const [x,z]=v3x(r,c);if(Math.hypot(x-s.gx,z-s.gz)>s.d*.35)v3Focus(r,c);}
function v3HomeCam(now){if(!G)return;const n=G.viewer;const sp=zoneSpots(n);const s=V3.cs;const m=(N-1)/2;
  const [r,c]=sp.length?sp[0]:[m,m];const [x,z]=v3x(r,c);const [mx,mz]=v3x(m,m);
  s.gx=x+(mx-x)*.45;s.gz=z+(mz-z)*.45;s.gyaw=[ -Math.PI/2, Math.PI/2, Math.PI, 0 ][n]??0;
  if(now){s.x=s.gx;s.z=s.gz;s.yaw=s.gyaw;}}
function v3Zoom(f){const s=V3.cs;s.gd=Math.min(Math.max(48,N*1.35),Math.max(4,s.gd*f));}
function v3Rot(dir){V3.cs.gyaw+=dir*Math.PI/4;}
function v3Pan(dx,dy){const s=V3.cs,h=V3.cv.clientHeight||600;const k=2*s.d*Math.tan(V3.cam.fov*Math.PI/360)/h;
  const cy=Math.cos(s.yaw),sy=Math.sin(s.yaw);const fx=-dx*k,fz=-dy*k/Math.max(.5,Math.sin(s.pitch));
  s.gx+=fx*cy+fz*sy;s.gz+=-fx*sy+fz*cy;s.gx=Math.min(N,Math.max(0,s.gx));s.gz=Math.min(N,Math.max(0,s.gz));s.x=s.gx;s.z=s.gz;}
function v3Controls(cv){const P=new Map();let start=null,moved=0,multi=false,last2=null;const pos=e=>[e.clientX,e.clientY];
  cv.addEventListener('contextmenu',e=>e.preventDefault());
  cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);P.set(e.pointerId,{p:pos(e),b:e.button,mod:e.shiftKey||e.ctrlKey||e.altKey});
    if(P.size===1){start={p:pos(e),t:performance.now()};moved=0;multi=false;}else{multi=true;last2=null;}});
  cv.addEventListener('pointermove',e=>{const q=P.get(e.pointerId);if(!q){if(e.pointerType==='mouse')v3Hover(e);return;}
    const np=pos(e),dx=np[0]-q.p[0],dy=np[1]-q.p[1];q.p=np;moved+=Math.abs(dx)+Math.abs(dy);
    if(P.size===1){if(q.b===2||q.mod){const s=V3.cs;s.gyaw-=dx*.006;s.yaw=s.gyaw;s.pitch=Math.min(1.5,Math.max(.2,s.pitch+dy*.005));}else v3Pan(dx,dy);}
    else if(P.size===2){const [a,b]=[...P.values()];const mx=(a.p[0]+b.p[0])/2,my=(a.p[1]+b.p[1])/2,dd=Math.hypot(a.p[0]-b.p[0],a.p[1]-b.p[1]),an=Math.atan2(b.p[1]-a.p[1],b.p[0]-a.p[0]);
      if(last2){const s=V3.cs;const pinch=Math.abs(dd-last2.dd)>1.5;let da=an-last2.an;if(da>Math.PI)da-=2*Math.PI;if(da<-Math.PI)da+=2*Math.PI;
        if(!pinch&&Math.abs(da)<.01)s.pitch=Math.min(1.5,Math.max(.2,s.pitch+(my-last2.my)*.005));else v3Pan(mx-last2.mx,my-last2.my);
        s.gd=Math.min(48,Math.max(4,s.gd*last2.dd/Math.max(10,dd)));s.d=s.gd;s.gyaw-=da;s.yaw=s.gyaw;}
      last2={mx,my,dd,an};}});
  const up=e=>{const had=P.has(e.pointerId);P.delete(e.pointerId);if(P.size<2)last2=null;
    if(had&&P.size===0&&!multi&&start&&moved<8&&performance.now()-start.t<700&&e.button!==2){const k=v3Pick(e.clientX,e.clientY);if(k!=null&&typeof tap==='function')tap(k);}
    if(P.size===0)start=null;};
  cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',e=>{P.delete(e.pointerId);multi=true;});
  cv.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&UI.hk!=null){UI.hk=null;v3SyncHl();}});
  cv.addEventListener('wheel',e=>{e.preventDefault();v3Zoom(Math.exp(e.deltaY*.0012));},{passive:false});
  document.addEventListener('keydown',e=>{if(!V3.on||e.target.closest('input,select,textarea'))return;const k=e.key.toLowerCase();
    if(k==='q')v3Rot(1);else if(k==='e')v3Rot(-1);else if(k==='r')V3.cs.pitch=Math.min(1.5,V3.cs.pitch+.12);else if(k==='f')V3.cs.pitch=Math.max(.2,V3.cs.pitch-.12);
    else if(k==='w'||k==='arrowup')v3Pan(0,60);else if(k==='s'||k==='arrowdown')v3Pan(0,-60);else if(k==='a'||k==='arrowleft')v3Pan(60,0);else if(k==='d'||k==='arrowright')v3Pan(-60,0);});}
function v3Ray(cx,cy){const T=V3.T,rc=V3.ray||(V3.ray=new T.Raycaster());const b=V3.cv.getBoundingClientRect();rc.setFromCamera(new T.Vector2((cx-b.left)/b.width*2-1,-(cy-b.top)/b.height*2+1),V3.cam);return rc;}
/* 화면 지점 → 칸 키. 부가로 V3.pickPt(땅 위 정확한 지점), V3.pickId(탭한 부대)를 남긴다. 작은 병사도 잘 집히게 가까운 부대를 찾아 준다. */
function v3Pick(cx,cy){if(!G)return null;V3.pickId=null;V3.pickPt=null;const rc=v3Ray(cx,cy);const hits=rc.intersectObjects([V3.G.units,V3.G.city,V3.G.world],true);let k=null;
  for(const h of hits){let o=h.object;if(!o.visible)continue;while(o&&o.userData.k==null&&o.parent)o=o.parent;if(o&&o.userData.k!=null){V3.pickId=o.userData.id;V3.pickPt=[h.point.x,h.point.z];return o.userData.k;}
    const m=h.object.userData;V3.pickPt=[h.point.x,h.point.z];if(m.keys&&h.instanceId!=null){k=m.keys[h.instanceId];break;}if(m.tri&&h.faceIndex!=null){k=m.tri[h.faceIndex];break;}if(h.object.parent===V3.G.world){k=key(Math.floor(h.point.z),Math.floor(h.point.x));break;}}
  if(k==null){const p=new V3.T.Vector3();if(rc.ray.intersectPlane(new V3.T.Plane(new V3.T.Vector3(0,1,0),0),p)){V3.pickPt=[p.x,p.z];const r=Math.floor(p.z),c=Math.floor(p.x);if(inb(r,c))k=key(r,c);}}
  // 가까운 부대(화면에서 28px 안) 우선
  {const v=new V3.T.Vector3();const b=V3.cv.getBoundingClientRect();let best=null,bd=28;for(const [id,o] of V3.uo){v.copy(o.position);v.y+=.08;v.project(V3.cam);const sx=(v.x+1)/2*b.width+b.left,sy=(1-v.y)/2*b.height+b.top;const d=Math.hypot(sx-cx,sy-cy);if(d<bd){bd=d;best=o;}}
    if(best){V3.pickId=best.userData.id;return best.userData.k;}}
  return k;}
let v3HovRaf=0;
function v3Hover(e){if(v3HovRaf)return;const x=e.clientX,y=e.clientY;v3HovRaf=requestAnimationFrame(()=>{v3HovRaf=0;const k=v3Pick(x,y);if(k!==UI.hk){UI.hk=k;v3SyncHl();if(typeof renderTip==='function')renderTip();}});}
function v3Clear(g){for(const o of [...g.children]){g.remove(o);o.traverse(x=>{if(x.geometry)x.geometry.dispose();});}}

/* ---------- 지면 ---------- */
function v3GroundTex(){const P=48,W=N*P;const cv=document.createElement('canvas');cv.width=cv.height=W;const g=cv.getContext('2d');V3.gcv=cv;V3.gctx=g;V3.gP=P;const R=mulberry((G.seed|0)^0x5151);
  const t=(r,c)=>inb(r,c)?G.map[r][c].t:'void';const rd=(r,c)=>t(r,c)==='road';const open=(r,c)=>{const q=t(r,c);return q==='road'||q==='plaza'||q==='void';};
  const BASE={road:'#353637',plaza:'#7d7a72',park:'#4a4c38',rubble:'#5a564f',bldg:'#4f5040',water:'#22303a'};
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const q=t(r,c),X=c*P,Y=r*P;const cx0=G.map[r][c];g.fillStyle=cx0.lot?'#3b3c3d':cx0.al?'#4a4945':cx0.yard?'#525638':BASE[q]||'#555';g.fillRect(X,Y,P,P);
    if(cx0.lot){// 주차장: 흰 주차선 두 줄과 가운데 통로
      g.fillStyle='rgba(225,222,210,.55)';for(let i=0;i<=4;i++){const x=X+i*P/4;g.fillRect(Math.min(x,X+P-1),Y+2,1,P*.3);g.fillRect(Math.min(x,X+P-1),Y+P*.68,1,P*.3);}
      g.fillStyle='rgba(0,0,0,.18)';for(let i=0;i<6;i++){g.beginPath();g.arc(X+R()*P,Y+R()*P,2+R()*5,0,7);g.fill();}continue;}
    if(cx0.al){g.fillStyle='rgba(20,20,20,.35)';cx0.ro==='h'?g.fillRect(X,Y+P/2-1,P,2):g.fillRect(X+P/2-1,Y,2,P);
      for(let i=0;i<10;i++){g.fillStyle=R()<.5?'rgba(25,22,18,.3)':'rgba(120,110,95,.2)';g.beginPath();g.arc(X+R()*P,Y+R()*P,2+R()*6,0,7);g.fill();}continue;}
    if(q==='plaza'){g.fillStyle='rgba(0,0,0,.13)';for(let i=0;i<=P;i+=12){g.fillRect(X+i,Y,1,P);g.fillRect(X,Y+i,P,1);}}
    if(q==='bldg'||q==='park'){for(let i=0;i<22;i++){g.fillStyle=R()<.45?'rgba(30,28,20,.28)':R()<.7?'rgba(96,104,58,.26)':'rgba(118,104,78,.22)';g.beginPath();g.arc(X+R()*P,Y+R()*P,3+R()*8,0,7);g.fill();}}
    if(q==='water'){g.fillStyle='#8a867d';g.fillRect(X,Y,P,3);g.fillRect(X,Y+P-3,P,3);g.fillRect(X,Y,3,P);g.fillRect(X+P-3,Y,3,P);g.fillStyle='rgba(160,190,200,.18)';g.fillRect(X+6,Y+8,P-12,2);g.fillRect(X+10,Y+18,P-18,2);}
    if(q==='park')for(let i=0;i<14;i++){g.fillStyle=R()<.4?'rgba(25,24,18,.3)':R()<.7?'rgba(90,100,60,.22)':'rgba(120,105,80,.18)';g.beginPath();g.arc(X+R()*P,Y+R()*P,2+R()*5,0,7);g.fill();}}
  // 얼룩·잡티
  for(let i=0;i<N*N*30;i++){g.fillStyle=R()<.5?'rgba(255,255,255,.035)':'rgba(0,0,0,.05)';g.fillRect(R()*W,R()*W,1+R()*2,1+R()*2);}
  for(let i=0;i<N*N*.4;i++){const x=R()*W,y=R()*W,rr=6+R()*26;const gr=g.createRadialGradient(x,y,0,x,y,rr);gr.addColorStop(0,'rgba(20,18,15,.16)');gr.addColorStop(1,'rgba(20,18,15,0)');g.fillStyle=gr;g.fillRect(x-rr,y-rr,rr*2,rr*2);}
  // 도로: 균열, 차선, 횡단보도, 인도
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){if(!rd(r,c))continue;const X=c*P,Y=r*P;
    g.strokeStyle='rgba(15,15,15,.35)';g.lineWidth=1;if(R()<.35){g.beginPath();let x=X+R()*P,y=Y+R()*P;g.moveTo(x,y);for(let i=0;i<4;i++){x+=(R()-.5)*20;y+=(R()-.5)*14;g.lineTo(x,y);}g.stroke();}
    const me=G.map[r][c];if(me.al)continue;const ro=me.ro||'x';const RO=(a,b)=>inb(a,b)&&G.map[a][b].t==='road'&&!G.map[a][b].al?G.map[a][b].ro:null;
    if(ro==='h'||ro==='v'){const H2=ro==='h';
      // 대로(2칸): 가운데 쪽 가장자리에 노란 겹선, 칸 가운데에 흰 점선. 거리(1칸): 가운데 노란 점선
      if(me.rw===2){const up=H2?RO(r-1,c)==='h':RO(r,c-1)==='v';g.fillStyle='rgba(214,186,96,.8)';
        if(H2){const y=up?Y:Y+P-5;g.fillRect(X,y+1,P,1.5);g.fillRect(X,y+3.5,P,1.5);}else{const x=up?X:X+P-5;g.fillRect(x+1,Y,1.5,P);g.fillRect(x+3.5,Y,1.5,P);}
        g.fillStyle='rgba(230,228,220,.6)';for(const o of [6,30])H2?g.fillRect(X+o,Y+P/2-1,12,2):g.fillRect(X+P/2-1,Y+o,2,12);}
      else{g.fillStyle='rgba(214,186,96,.7)';for(const o of [4,28])H2?g.fillRect(X+o,Y+P/2-1,16,2):g.fillRect(X+P/2-1,Y+o,2,16);}
      // 교차로 앞 횡단보도와 정지선
      g.fillStyle='rgba(225,220,200,.6)';
      if(H2){if(RO(r,c-1)==='x')for(let i=6;i<P-6;i+=8)g.fillRect(X+3,Y+i,10,4);if(RO(r,c+1)==='x')for(let i=6;i<P-6;i+=8)g.fillRect(X+P-13,Y+i,10,4);}
      else{if(RO(r-1,c)==='x')for(let i=6;i<P-6;i+=8)g.fillRect(X+i,Y+3,4,10);if(RO(r+1,c)==='x')for(let i=6;i<P-6;i+=8)g.fillRect(X+i,Y+P-13,4,10);}}
    const sw=8;for(const [a,b,x,y,w,hh] of [[r-1,c,X,Y,P,sw],[r+1,c,X,Y+P-sw,P,sw],[r,c-1,X,Y,sw,P],[r,c+1,X+P-sw,Y,sw,P]]){if(open(a,b))continue;
      g.fillStyle='#86827a';g.fillRect(x,y,w,hh);g.fillStyle='rgba(0,0,0,.12)';for(let i=0;i<Math.max(w,hh);i+=8)w>hh?g.fillRect(x+i,y,1,hh):g.fillRect(x,y+i,w,1);
      g.fillStyle='#a19c90';w>hh?g.fillRect(x,a<r?y+hh-1:y,w,1):g.fillRect(b<c?x+w-1:x,y,1,hh);}}
  // 한가운데 원형 광장: 둥근 포석 무늬와 동심원
  {let R0=0;for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(G.map[r][c].sq)R0=Math.max(R0,Math.hypot(r+.5-N/2,c+.5-N/2));
    if(R0){const X=N/2*P,Y=N/2*P;g.fillStyle='#8a867c';g.beginPath();g.arc(X,Y,(R0+.2)*P,0,7);g.fill();
      for(let i=1;i<6;i++){g.strokeStyle=i%2?'rgba(60,55,48,.35)':'rgba(230,225,210,.25)';g.lineWidth=i%2?3:2;g.beginPath();g.arc(X,Y,(R0+.2)*P*i/6+P*.3,0,7);g.stroke();}
      g.strokeStyle='rgba(60,55,48,.25)';g.lineWidth=2;for(let a=0;a<16;a++){const t=a/16*Math.PI*2;g.beginPath();g.moveTo(X+Math.cos(t)*P*1.4,Y+Math.sin(t)*P*1.4);g.lineTo(X+Math.cos(t)*(R0+.2)*P,Y+Math.sin(t)*(R0+.2)*P);g.stroke();}
      g.strokeStyle='#a19c90';g.lineWidth=4;g.beginPath();g.arc(X,Y,(R0+.2)*P,0,7);g.stroke();}}
  // 대각선·곡선 도로: 계단 모양 가장자리를 비스듬히 깎아 매끄럽게 (도로 쪽 모서리를 아스팔트 삼각형으로 채우고 연석선을 긋는다)
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){if(rd(r,c))continue;for(const [a,b] of v3Cham(r,c,true)){const X=c*P+(b>0?P:0),Y=r*P+(a>0?P:0),L=P*.62,sx=-b,sy=-a;
      g.fillStyle='#353637';g.beginPath();g.moveTo(X,Y);g.lineTo(X+sx*L,Y);g.lineTo(X,Y+sy*L);g.closePath();g.fill();
      g.strokeStyle='#8a867e';g.lineWidth=5;g.beginPath();g.moveTo(X+sx*L,Y);g.lineTo(X,Y+sy*L);g.stroke();g.strokeStyle='#a19c90';g.lineWidth=1;g.stroke();}}
  // 배치 구역은 아주 옅게 물들인다
  for(const n of G.order){g.fillStyle=MAPCOL[n]+'1c';for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(inZone(n,r,c))g.fillRect(c*P,r*P,P,P);}
  if(typeof dsReplay==='function')dsReplay();
  const tx=new V3.T.CanvasTexture(cv);tx.colorSpace=V3.T.SRGBColorSpace;tx.anisotropy=V3.ren.capabilities.getMaxAnisotropy();V3.gtex=tx;return tx;}
// 앙상한 나무: 줄기와 가지 몇 개를 한 형상으로 합친다
function v3DeadTree(){const T=V3.T;if(V3.treeG)return V3.treeG;const parts=[];const R=mulberry(99);
  const limb=(x,y,z,len,rad,ax,az)=>{const g=new T.CylinderGeometry(rad*.55,rad,len,4,1);g.translate(0,len/2,0);g.rotateX(ax);g.rotateZ(az);g.translate(x,y,z);parts.push(g.toNonIndexed());const e=new T.Vector3(0,len,0).applyEuler(new T.Euler(ax,0,az));return [x+e.x,y+e.y,z+e.z];};
  const top=limb(0,0,0,.42,.028,0,0);
  for(let i=0;i<5;i++){const a=i/5*6.283+R();const t=limb(top[0],.22+R()*.2,top[2],.18+R()*.14,.014,Math.cos(a)*.7,Math.sin(a)*.7);if(R()<.7)limb(t[0],t[1],t[2],.08+R()*.08,.007,Math.cos(a+1)*1.1,Math.sin(a+1)*1.1);}
  let n=0;for(const g of parts)n+=g.attributes.position.count;const P=new Float32Array(n*3);let o=0;for(const g of parts){P.set(g.attributes.position.array,o);o+=g.attributes.position.array.length;g.dispose();}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(P,3));geo.computeVertexNormals();V3.treeG=geo;return geo;}
function v3BuildWorld(){const T=V3.T,g=V3.G.world;v3Clear(g);const M=V3.M;
  const FM=N*FOW_R;if(!V3.fowT||V3.fowT.image.width!==FM){if(V3.fowT)V3.fowT.dispose();V3.fowD=new Uint8Array(FM*FM*4).fill(255);V3.fowT=new T.DataTexture(V3.fowD,FM,FM);V3.fowT.magFilter=V3.fowT.minFilter=T.LinearFilter;V3.fowT.needsUpdate=true;V3.fowU.map.value=V3.fowT;V3.fowU.n.value=N;}
  if(M.terr.map)M.terr.map.dispose();M.terr.map=v3GroundTex();M.terr.needsUpdate=true;
  const gp=new T.Mesh(new T.PlaneGeometry(N,N),M.terr);gp.rotation.x=-Math.PI/2;gp.position.set(N/2,0,N/2);gp.receiveShadow=true;g.add(gp);
  const m4=new T.Matrix4(),q=new T.Quaternion(),sc=new T.Vector3(),ps=new T.Vector3();const trees=[];
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=G.map[r][c];const [px0,pz]=v3x(r,c);const e=0;
    if(x.t==='park')for(let s=0;s<(x.yard?1:3);s++)if(v3Hash(key(r,c),50+s)<(x.yard?.45:.75))trees.push([px0+(v3Hash(key(r,c),60+s)-.5)*.7,e,pz+(v3Hash(key(r,c),70+s)-.5)*.7,.7+v3Hash(key(r,c),80+s)*.6,key(r,c)]);}
  if(trees.length){const tg=v3DeadTree();const tm=new T.InstancedMesh(tg,M.tree,trees.length);tm.castShadow=true;tm.receiveShadow=true;
    const trg=new T.CylinderGeometry(.02,.03,.04,5);trg.translate(0,.02,0);const trm=new T.InstancedMesh(trg,M.trunk,trees.length);const tc=new T.Color();
    trees.forEach(([x,y,z,s,k],j)=>{ps.set(x,y,z);sc.set(s,s*(.85+v3Hash(k,90+j)*.4),s);m4.compose(ps,q,sc);tm.setMatrixAt(j,m4);trm.setMatrixAt(j,m4);tm.setColorAt(j,tc.set('#ffffff').offsetHSL(0,0,(v3Hash(k,91+j)-.5)*.25));});tm.userData.keys=trees.map(t=>t[4]);g.add(tm);g.add(trm);}
  if(typeof v3BuildProps==='function')v3BuildProps(g);
  // 버려진 차량 (소품 모듈이 없을 때만)
  else{const cars=[];for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=G.map[r][c];const k=key(r,c);if(x.t==='road'&&v3Hash(k,700)<.07)cars.push([...v3x(r,c),k]);}
    if(cars.length){const cg=new T.BoxGeometry(.36,.14,.18);cg.translate(0,.09,0);const cm=new T.InstancedMesh(cg,new T.MeshStandardMaterial({color:'#4b4a46',roughness:.7,metalness:.2}),cars.length);cm.castShadow=true;
      const cab=new T.BoxGeometry(.18,.08,.16);cab.translate(-.02,.2,0);const ch=new T.InstancedMesh(cab,M.dark,cars.length);
      cars.forEach(([x,z,k],j)=>{ps.set(x+(v3Hash(k,701)-.5)*.5,0,z+(v3Hash(k,702)-.5)*.5);q.setFromAxisAngle(new T.Vector3(0,1,0),v3Hash(k,703)*6.28);sc.set(1,1,1);m4.compose(ps,q,sc);cm.setMatrixAt(j,m4);ch.setMatrixAt(j,m4);});q.identity();g.add(cm);g.add(ch);}}
  // 거점 둘레 모래주머니
  {const bags=[];for(const o of G.objs){const k=key(o.r,o.c);for(const [a,b] of [[-1,0],[1,0],[0,-1],[0,1]]){const r=o.r+a,c=o.c+b;if(!inb(r,c)||G.map[r][c].t==='bldg'||G.map[r][c].t==='water')continue;const [x,z]=v3x(r,c);bags.push([x-a*.38,z-b*.38,b?Math.PI/2:0]);}}
    if(bags.length){const bg=new T.BoxGeometry(.12,.12,.6);bg.translate(0,.06,0);const bm=new T.InstancedMesh(bg,new T.MeshStandardMaterial({color:'#8a7c62',roughness:1}),bags.length);bm.castShadow=true;
      bags.forEach(([x,z,rot],j)=>{ps.set(x,GH.plaza,z);q.setFromAxisAngle(new T.Vector3(0,1,0),rot);sc.set(1,1,1);m4.compose(ps,q,sc);bm.setMatrixAt(j,m4);});q.identity();g.add(bm);}}
  // 바깥 땅
  const out=new T.Mesh(new T.PlaneGeometry(N+120,N+120),new T.MeshStandardMaterial({color:'#3a3936',roughness:1}));out.rotation.x=-Math.PI/2;out.position.set(N/2,-.02,N/2);out.receiveShadow=true;g.add(out);
  // 격자선
  const L=[];for(let i2=0;i2<=N;i2++){L.push(0,.07,i2,N,.07,i2,i2,.07,0,i2,.07,N);}
  const lg=new T.BufferGeometry();lg.setAttribute('position',new T.Float32BufferAttribute(L,3));V3.grid=new T.LineSegments(lg,new T.LineBasicMaterial({color:'#ffffff',transparent:true,opacity:.12}));g.add(V3.grid);}
/* 칸 (r,c)의 네 모서리 중 대각선·곡선 도로가 감싼 모서리 목록 [[a,b]] (a,b = ±1: 북남, 서동).
   그 모서리는 땅에서는 아스팔트로 채우고 건물은 비스듬히 깎는다. */
function v3Cham(r,c){const R=(a,b)=>inb(a,b)&&G.map[a][b].t==='road'&&!G.map[a][b].al;const B=(a,b)=>R(a,b)&&(G.map[a][b].ro==='d'||G.map[a][b].ro==='c');const out=[];
  for(const [a,b] of [[-1,-1],[-1,1],[1,1],[1,-1]])if(R(r+a,c)&&R(r,c+b)&&R(r+a,c+b)&&(B(r+a,c)||B(r,c+b)))out.push([a,b]);return out;}
/* ---------- 건물 ---------- */
function v3BuildCity(){const T=V3.T,g=V3.G.city;v3Clear(g);const W1=[],U1=[],C1=[],R1=[],RU=[],RC=[],wt=[],rt=[],rub=[],ac=[];const col=new T.Color();
  // 위가 트인 상자: 네 벽(외벽 무늬) + 지붕. 경계 좌표로 받아 같은 블록 칸끼리 이어 붙인다.
  const quad=(A,B,C2,D,cl,k)=>{for(const p of [A,B,C2,A,C2,D]){R1.push(p[0],p[1],p[2]);RU.push(p[0]+p[1]*.7,p[2]+p[1]*.7);RC.push(cl.r,cl.g,cl.b);}rt.push(k,k);};
  const box=(x0,x1,z0,z1,y0,h,k,shade,u0,v0,rim,open,cham)=>{let c4=[[x0,z0],[x1,z0],[x1,z1],[x0,z1]];const y1=y0+h;
    // 깎인 모서리: 꼭짓점 하나를 두 점으로 바꿔 비스듬한 벽을 낸다
    if(cham&&cham.length){const L=.4,P=[];c4.forEach(([px,pz],i)=>{if(!cham.includes(i)){P.push([px,pz]);return;}const [qx,qz]=c4[(i+3)%4],[nx,nz]=c4[(i+1)%4];
        const dl=(ax,az)=>{const d=Math.hypot(ax-px,az-pz)||1,t=Math.min(L,d*.9)/d;return [px+(ax-px)*t,pz+(az-pz)*t];};P.push(dl(qx,qz),dl(nx,nz));});c4=P;rim=null;}
    const n4=c4.length;
    for(let s=0;s<n4;s++){const [ax,az]=c4[(s+1)%n4],[bx,bz]=c4[s];const len=Math.hypot(ax-bx,az-bz);const U=len/.21/8,V=h/FLOOR_H/8;const uu=u0+(Math.abs(az-bz)>Math.abs(ax-bx)?bz:bx)/.21/8;
      W1.push(ax,y0,az,bx,y0,bz,bx,y1,bz, ax,y0,az,bx,y1,bz,ax,y1,az);U1.push(uu,v0,uu+U,v0,uu+U,v0+V, uu,v0,uu+U,v0+V,uu,v0+V);
      for(let v=0;v<6;v++)C1.push(shade.r,shade.g,shade.b);wt.push(k,k);}
    const rcol=new T.Color('#b9b7b2').lerp(shade,.35).multiplyScalar(1-(1-shade.g)*.4);
    if(!open){if(n4===4)quad([x0,y1,z0],[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],rcol,k);
      else{let mx=0,mz=0;for(const [px,pz] of c4){mx+=px;mz+=pz;}mx/=n4;mz/=n4;for(let s=0;s<n4;s++){const [ax,az]=c4[s],[bx,bz]=c4[(s+1)%n4];
        for(const p2 of [[mx,y1,mz],[bx,y1,bz],[ax,y1,az],[mx,y1,mz],[mx,y1,mz],[mx,y1,mz]]){R1.push(p2[0],p2[1],p2[2]);RU.push(p2[0]+p2[1]*.7,p2[2]+p2[1]*.7);RC.push(rcol.r,rcol.g,rcol.b);}rt.push(k,k);}}}   // 단면(v3ApplyCut)이 사각형(6점) 단위로 다루도록 빈 삼각형을 덧붙인다
    // 옥상 난간
    if(rim){const pc=shade.clone().multiplyScalar(.95),t=.035,ph=.05,yt=y1+ph;
      const wall=(xa,za,xb,zb,ox,oz)=>{quad([xa,y1,za],[xb,y1,zb],[xb,yt,zb],[xa,yt,za],pc,k);quad([xa+ox,y1,za+oz],[xb+ox,y1,zb+oz],[xb+ox,yt,zb+oz],[xa+ox,yt,za+oz],pc,k);quad([xa,yt,za],[xb,yt,zb],[xb+ox,yt,zb+oz],[xa+ox,yt,za+oz],pc,k);};
      if(rim[0])wall(x0,z0,x1,z0,0,t);if(rim[2])wall(x0,z1,x1,z1,0,-t);if(rim[3])wall(x0,z0,x0,z1,t,0);if(rim[1])wall(x1,z0,x1,z1,-t,0);}};
  const FD={P:[],C:[],K:[]},FL=[];const TONES=['#bdbbb6','#a9a8a4','#c8c5be','#9c9b98','#b4afa6','#c2bdb3','#a3a19c','#8f8e8b'];const IN=.08;
  const GLASS=['#7d8790','#6a737b','#8a9096','#5f676e','#9a9a94'];const gab=[];// 고층은 유리 외벽 톤, 주택은 박공 지붕
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=G.map[r][c];const k=key(r,c);const [cx,cz]=v3x(r,c);
    if(x.t==='bldg'){const dmg=1-x.bhp/x.bmax;let h=x.f*FLOOR_H;if(dmg>.5)h*=1-(dmg-.5)*.6;
      const bt=x.blk!=null?v3Hash(x.blk,3):v3Hash(k,3);col.set(x.lm?'#e2dccb':x.f>=8?GLASS[Math.floor(bt*GLASS.length)]:TONES[Math.floor(bt*TONES.length)]);col.offsetHSL(0,0,(v3Hash(k,4)-.5)*.04);col.multiplyScalar(1-dmg*.55);
      const same=(a,b)=>inb(a,b)&&G.map[a][b].t==='bldg'&&x.blk!=null&&G.map[a][b].blk===x.blk&&G.map[a][b].bhp/G.map[a][b].bmax>.5&&dmg<.5;
      const sN=same(r-1,c),sE=same(r,c+1),sS=same(r+1,c),sW=same(r,c-1);
      const x0=cx-.5+(sW?0:IN),x1=cx+.5-(sE?0:IN),z0=cz-.5+(sN?0:IN),z1=cz+.5-(sS?0:IN);
      const cut=null;   // 건물 속 단면은 07f-floors가 그린 뒤에 덧씌운다(v3ApplyCut)
      const ch=dmg<.5?v3Cham(r,c).map(([a,b])=>a<0?(b<0?0:1):(b>0?2:3)):null;if(ch&&ch.length)x._ch=1;else delete x._ch;
      const fl=(bt*8|0);box(x0,x1,z0,z1,.06,h,k,col,fl*.37,Math.floor(v3Hash(x.blk??k,8)*8),dmg<.4?[!sN,!sE,!sS,!sW]:null,false,ch);
      v3Doors(FD,r,c,x0,x1,z0,z1,dmg);
      if(dmg<.4&&!(x.dist==='res'&&x.f<=2)){const st=v3Stair(r,c),ha=st.sx,hb=st.sx+st.ax*STAIR_L;box(Math.min(ha,hb)-.015,Math.max(ha,hb)+.015,st.sz-STAIR_W-.015,st.sz+STAIR_W+.015,.06+h,FLOOR_H*.6,k,col.clone().multiplyScalar(.8),0,0,null);}   // 옥상 계단 출입구
      if(x.dist==='res'&&x.f<=2&&dmg<.4){const rd2=(a,b)=>inb(a,b)&&G.map[a][b].t==='road';const ew=rd2(r-1,c)||rd2(r+1,c);gab.push({x:(x0+x1)/2,y:.06+h,z:(z0+z1)/2,sx:x1-x0,sz:z1-z0,ry:ew?0:Math.PI/2,k,col:ROOFC[Math.floor(v3Hash(x.blk??k,13)*ROOFC.length)]});}
      if(x.f>=4&&v3Hash(k,9)<.4&&dmg<.5){const sw=.22+v3Hash(k,10)*.14,ox=cx+(v3Hash(k,11)-.5)*.3,oz=cz+(v3Hash(k,12)-.5)*.3;box(ox-sw/2,ox+sw/2,oz-sw/2,oz+sw/2,.06+h,FLOOR_H*.9,k,col.clone().multiplyScalar(.85),0,0,null);}
      for(let i=0;i<3;i++)if(v3Hash(k,20+i)<.5&&dmg<.4)ac.push([cx+(v3Hash(k,22+i)-.5)*.6,.06+h,cz+(v3Hash(k,24+i)-.5)*.6,v3Hash(k,26+i),k]);
      if(dmg>.25)for(let i=0;i<Math.round(dmg*8);i++){const a=v3Hash(k,30+i)*6.283;rub.push([cx+Math.cos(a)*.5,.03,cz+Math.sin(a)*.5,.08+v3Hash(k,40+i)*.08,v3Hash(k,50+i)*3,k]);}}
    else if(x.t==='rubble'){for(let i=0;i<34;i++){const a=v3Hash(k,60+i)*6.283,rr=Math.sqrt(v3Hash(k,70+i))*.46;rub.push([cx+Math.cos(a)*rr,.01,cz+Math.sin(a)*rr,.025+Math.pow(v3Hash(k,80+i),2)*.09,v3Hash(k,90+i)*3,k]);}
      if(v3Hash(k,99)<.7){const ox=cx+(v3Hash(k,98)-.5)*.4,oz=cz+(v3Hash(k,97)-.5)*.4,w=.12+v3Hash(k,96)*.14;box(ox-w,ox+w,oz-.1,oz+.1,.02,FLOOR_H*(.5+v3Hash(k,95)*1.4),k,col.set('#8b857a'),v3Hash(k,94)*8,0,null);}}}
  const mk=(P,UV,C,mat,tri)=>{if(!P.length)return;const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(P,3));if(UV)geo.setAttribute('uv',new T.Float32BufferAttribute(UV,2));
    geo.setAttribute('color',new T.Float32BufferAttribute(C,3));geo.computeVertexNormals();const m=new T.Mesh(geo,mat);m.castShadow=m.receiveShadow=true;m.userData.tri=tri;g.add(m);return m;};
  const mw=mk(W1,U1,C1,V3.M.wall,wt),mr=mk(R1,RU,RC,V3.M.roof,rt);v3FloorMesh(g,FD,FL);V3.cityM={w:mw,r:mr,ac:null,gab:null};
  const m4=new T.Matrix4(),q=new T.Quaternion(),s=new T.Vector3(),p=new T.Vector3();
  if(rub.length){const im=new T.InstancedMesh(new T.DodecahedronGeometry(1,0),V3.M.rubble,rub.length);im.castShadow=im.receiveShadow=true;
    rub.forEach(([x,y,z,sz,rot],i)=>{p.set(x,y,z);q.setFromEuler(new T.Euler(rot,rot*2,0));s.set(sz,sz*.5,sz);m4.compose(p,q,s);im.setMatrixAt(i,m4);});im.userData.keys=rub.map(r=>r[5]);g.add(im);}
  if(ac.length){const im=new T.InstancedMesh(new T.BoxGeometry(.14,.08,.1),V3.M.conc,ac.length);im.castShadow=true;s.set(1,1,1);
    ac.forEach(([x,y,z,v],i)=>{p.set(x,y+.04,z);q.setFromAxisAngle(new T.Vector3(0,1,0),v>.5?Math.PI/2:0);const sz=v<.2?[2.2,1.6,1.4]:[1,1,1];s.set(...sz);m4.compose(p,q,s);im.setMatrixAt(i,m4);});im.userData.keys=ac.map(a=>a[4]);V3.cityM.ac=im;g.add(im);}
  if(gab.length){// 박공 지붕: 용마루가 길과 나란하게
    if(!V3.gabG){const P=[-.5,0,-.5,.5,0,-.5,.5,.2,0, -.5,0,-.5,.5,.2,0,-.5,.2,0, .5,0,.5,-.5,0,.5,-.5,.2,0, .5,0,.5,-.5,.2,0,.5,.2,0, -.5,0,.5,-.5,0,-.5,-.5,.2,0, .5,0,-.5,.5,0,.5,.5,.2,0];
      const ge=new T.BufferGeometry();ge.setAttribute('position',new T.Float32BufferAttribute(P,3));ge.computeVertexNormals();V3.gabG=ge;}
    if(!V3.M.gab){V3.M.gab=new T.MeshStandardMaterial({color:'#ffffff',roughness:.95,flatShading:true,side:T.DoubleSide});v3FowMat(V3.M.gab);}
    const im=new T.InstancedMesh(V3.gabG,V3.M.gab,gab.length);im.castShadow=im.receiveShadow=true;const e=new T.Euler();
    gab.forEach((o,i)=>{p.set(o.x,o.y,o.z);const rot=o.ry!==0;q.setFromEuler(e.set(0,o.ry,0));s.set(rot?o.sz+.04:o.sx+.04,1,rot?o.sx+.04:o.sz+.04);m4.compose(p,q,s);im.setMatrixAt(i,m4);im.setColorAt(i,col.set(o.col));});
    im.userData.keys=gab.map(o=>o.k);V3.cityM.gab=im;g.add(im);}
  v3CutPrep();
  if(typeof v3BuildShops==='function')v3BuildShops(g);}
const ROOFC=['#5b4a42','#4a4a4c','#6a5f55','#3f4448','#7a6e60','#584038'];

/* ---------- 거점 표시 ---------- */
function v3BuildSites(){const T=V3.T,g=V3.G.sites;v3Clear(g);
  for(const o of G.objs){const x=G.map[o.r][o.c];const [cx,cz]=v3x(o.r,o.c);const y=v3Top(o.r,o.c);const col=mapCol(x.owner);
    const pole=new T.Mesh(new T.CylinderGeometry(.02,.02,.9,6),V3.M.steel);pole.position.set(cx+.3,y+.45,cz-.3);pole.castShadow=true;g.add(pole);
    const fl=new T.Mesh(new T.PlaneGeometry(.38,.24),new T.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:.35,side:T.DoubleSide}));fl.position.set(cx+.5,y+.78,cz-.3);fl.userData.flag=1;g.add(fl);
    const ring=new T.Mesh(new T.RingGeometry(.52,.6,4,1,Math.PI/4),new T.MeshBasicMaterial({color:col,transparent:true,opacity:.85,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(cx,v3G(o.r,o.c)+.02,cz);ring.scale.set(1.3,1.3,1);g.add(ring);
    const beam=new T.Mesh(new T.CylinderGeometry(.04,.04,6,6,1,true),new T.MeshBasicMaterial({color:col,transparent:true,opacity:.13,depthWrite:false,blending:T.AdditiveBlending}));beam.position.set(cx,y+3,cz);g.add(beam);}}

/* ---------- 부대 모형 ---------- */
function v3NatMat(n){const id='n'+n;if(!V3.matc.has(id)){const col=new V3.T.Color(mapCol(n));V3.matc.set(id,new V3.T.MeshStandardMaterial({color:col,roughness:.6,emissive:col,emissiveIntensity:.25}));}return V3.matc.get(id);}
function v3BodyMat(n,done){const id='b'+n+(done?'d':'');if(!V3.matc.has(id)){const T=V3.T;const col=new T.Color('#565a45').lerp(new T.Color(MAPCOL[n]),.45);if(done)col.multiplyScalar(.5);V3.matc.set(id,new T.MeshStandardMaterial({color:col,roughness:.75,metalness:.15,flatShading:true}));}return V3.matc.get(id);}
/* 병사 한 명: 다리 둘(엉덩이를 축으로 흔들림), 몸통, 머리, 철모, 소총. 키 약 0.15칸(타일 한 칸 ≈ 12m) */
function v3Soldier(n,kind){if(typeof v3SoldierM==='function')return v3SoldierM(n,kind);const T=V3.T;const sg=V3.sg||(V3.sg={leg:new T.BoxGeometry(.016,.06,.018).translate(0,-.03,0),torso:new T.BoxGeometry(.044,.058,.03),head:new T.SphereGeometry(.015,8,6),
    helm:new T.SphereGeometry(.019,8,5,0,Math.PI*2,0,Math.PI/2),gun:new T.BoxGeometry(.075,.01,.01),pack:new T.BoxGeometry(.03,.034,.018),tube:new T.CylinderGeometry(.011,.011,.1,6).rotateZ(Math.PI/2)});
  const um=v3BodyMat(n,false),dk=V3.M.dark,sk=V3.skin||(V3.skin=new T.MeshStandardMaterial({color:'#b89878',roughness:.9}));
  const g=new T.Group();const mk=(geo,mat,x,y,z)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;g.add(m);return m;};
  const legL=mk(sg.leg,dk,0,.062,-.011),legR=mk(sg.leg,dk,0,.062,.011);
  const tor=mk(sg.torso,um,0,.09,0);mk(sg.head,sk,.002,.134,0);mk(sg.helm,um,0,.137,0);mk(sg.pack,um,-.022,.094,0);
  const gun=mk(sg.gun,dk,.03,.095,.02);if(kind==='at')mk(sg.tube,um,0,.12,-.018);if(kind==='sniper'){gun.scale.x=1.5;}if(kind==='mg'){gun.scale.set(1.2,1.6,1.4);}
  g.userData={legL,legR,tor};return g;}
const SQUAD={rifle:8,mg:5,at:4,sniper:2,eng:5,mortar:4};
function v3Model(u){const T=V3.T,t=UT[u.type];const g=new T.Group();const body=v3BodyMat(u.nat,false);const M=V3.M;const ty=u.type;
  const B=(w,h,d,x,y,z,mat,par)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat||body);m.position.set(x,y,z);m.castShadow=true;(par||g).add(m);return m;};
  const Cy=(r1,r2,h,x,y,z,rz,mat,par)=>{const m=new T.Mesh(new T.CylinderGeometry(r1,r2,h,8),mat||body);m.position.set(x,y,z);if(rz)m.rotation.z=rz;m.castShadow=true;(par||g).add(m);return m;};
  const root=new T.Group();const sold=[];
  if(t.cls==='inf'){const n=SQUAD[ty]||4;
    for(let i=0;i<n;i++){const m=v3Soldier(u.nat,i===0?ty:'rifle');root.add(m);const a=i/n*Math.PI*2+v3Hash(u.id,i)*.8,rr=i?.1+v3Hash(u.id,10+i)*.16:0;
      sold.push({m,slot:[Math.cos(a)*rr-(i?.05:0),Math.sin(a)*rr],wx:u.x+Math.cos(a)*rr,wz:u.z+Math.sin(a)*rr,ph:v3Hash(u.id,20+i)*6.28,spd:0});}
    if(ty==='mortar'){Cy(.016,.016,.11,.06,.05,0,-.6,M.steel);B(.05,.01,.05,.06,.005,0,M.dark);}}
  else if(t.cls==='veh'&&typeof v3VehicleM==='function')v3VehicleM(ty,g,u.nat);
  else if(t.cls==='veh'){const tank=ty==='tank';
    if(tank){B(.46,.1,.26,0,.08,0);for(const z of [-.14,.14])B(.48,.07,.06,0,.045,z,M.dark);const tur=new T.Group();tur.position.set(-.02,.15,0);g.add(tur);B(.2,.07,.18,0,0,0,body,tur);Cy(.013,.016,.36,.25,.01,0,Math.PI/2,M.steel,tur);g.userData.tur=tur;}
    else{B(.42,.11,.22,0,.1,0);B(.12,.04,.18,.15,.16,0);for(const [a,b] of [[-.14,.12],[0,.12],[.14,.12],[-.14,-.12],[0,-.12],[.14,-.12]]){const w=Cy(.045,.045,.035,a,.045,b,0,M.dark);w.rotation.x=Math.PI/2;}
      B(.1,.05,.1,0,.18,0);Cy(.008,.008,.16,.1,.19,0,Math.PI/2,M.steel);}}
  else if(typeof v3AirModel==='function'&&v3AirModel(u,g)){}// 공격헬기·FPV (07x-air)
  else{const bd=new T.Mesh(new T.BoxGeometry(.08,.025,.08),body);bd.castShadow=true;g.add(bd);
    for(const [a,b] of [[-.07,-.07],[.07,-.07],[-.07,.07],[.07,.07]]){const rt=new T.Mesh(new T.CylinderGeometry(.04,.04,.004,12),V3.M.dark);rt.position.set(a,.02,b);rt.userData.rotor=1;g.add(rt);}}
  const ring=new T.Mesh(new T.CircleGeometry(t.cls==='inf'?.035:.05,12),new T.MeshBasicMaterial({color:mapCol(u.nat),transparent:true,opacity:.9,depthWrite:false}));ring.rotation.x=-Math.PI/2;
  const sel=new T.Mesh(new T.RingGeometry(.3,.32,40),new T.MeshBasicMaterial({color:'#f2efe6',transparent:true,opacity:.7,depthTest:false}));sel.rotation.x=-Math.PI/2;sel.visible=false;sel.renderOrder=6;
  root.add(g);root.add(ring);root.add(sel);root.userData={k:null,body:g,ring,sel,figs:sold.map(s=>s.m),sold,air:!!t.fly,inf:t.cls==='inf'};
  if(t.fly){const sh=new T.Mesh(new T.CircleGeometry(.1,16),new T.MeshBasicMaterial({color:'#000',transparent:true,opacity:.28,depthWrite:false}));sh.rotation.x=-Math.PI/2;root.add(sh);root.userData.shadow=sh;}
  return root;}
function v3UnitY(u){if(UT[u.type].fly&&typeof v3AirY==='function'){const y=v3AirY(u);if(y!=null)return y;}if(UT[u.type].fly)return Math.max(2.4,v3Top(u.r,u.c)+1);const iy=v3InY(u);if(iy!=null)return iy;return v3Top(u.r,u.c)+.005;}
/* 쓰러진 병사: 그 자리에 오래 남는다 */
function v3Corpse(s,o,nat){if(!s.m.visible)return;const T=V3.T;const c=v3Soldier(nat,'rifle');c.position.set(s.wx,o.position.y,s.wz);c.rotation.set(0,Math.random()*6.28,0);
  c.userData.legL.rotation.z=.3;c.userData.legR.rotation.z=-.2;const wrap=new T.Group();wrap.position.copy(c.position);c.position.set(0,0,0);wrap.add(c);c.rotation.z=Math.PI/2*(Math.random()<.5?1:-1);c.position.y=.015;
  wrap.traverse(m=>{if(m.isMesh){m.material=V3.corpseM||(V3.corpseM=new T.MeshStandardMaterial({color:'#4a463e',roughness:1}));m.userData.keepMat=1;m.userData.keepGeo=1;}});wrap.userData.keepGeo=1;wrap.userData.keepMat=1;
  V3.G.fx.add(wrap);V3.fx.push({o:wrap,t0:performance.now(),dur:120000,upd:()=>{}});s.m.visible=false;if(typeof dsScar==='function')dsScar('blood',s.wx,s.wz,.07);}
function v3SyncUnits(vs,vn){const keep=new Set();
  for(const u of G.units){if(G.fog&&!seen(u,vn,vs))continue;keep.add(u.id);let o=V3.uo.get(u.id);
    if(!o){o=v3Model(u);o.position.set(u.x,v3UnitY(u),u.z);V3.G.units.add(o);V3.uo.set(u.id,o);}
    o.userData.k=key(u.r,u.c);o.userData.to=[u.x,v3UnitY(u),u.z];o.userData.id=u.id;o.userData.u=u;
    const S=o.userData.sold;if(S.length&&u._men)S.forEach((s,i)=>{const m=u._men[i];if(m&&m.dead&&s.m.visible)v3Corpse(s,o,u.nat);});else if(S.length){const nf=Math.max(1,Math.ceil(u.hp/hpMax(u)*S.length));S.forEach((s,i)=>{if(i>=nf&&s.m.visible)v3Corpse(s,o,u.nat);});}
    o.userData.sel.visible=u===UI.sel||(UI.group||[]).includes(u);const gy=o.userData.air?-(v3UnitY(u)-v3Top(u.r,u.c))+.02:.02;o.userData.ring.position.y=gy;o.userData.sel.position.y=gy+.01;if(o.userData.shadow)o.userData.shadow.position.y=gy-.005;}
  for(const [id,o] of V3.uo)if(!keep.has(id)){const dead=!G.units.some(u=>u.id===id);if(dead){const M=o.userData.u&&o.userData.u._men;o.userData.sold.forEach((s,i)=>{const m=M&&M[i];if(!m||m.dead)v3Corpse(s,o,o.userData.u?o.userData.u.nat:0);});}V3.G.units.remove(o);V3.uo.delete(id);}}
/* 매 프레임 부대 움직임: 부대 중심은 좌표를 따라가고, 병사들은 제각각 흩어져 걷는다 */
function v3AnimUnits(dt,now){if(!(dt>0))return;for(const o of V3.uo.values()){const to=o.userData.to,uu=o.userData.u;if(!to||!uu)continue;
    const tx=uu.x,tz=uu.z;const kk=1-Math.exp(-dt*12);o.position.x+=(tx-o.position.x)*kk;o.position.z+=(tz-o.position.z)*kk;
    let ty=to[1];if(o.userData.air)ty+=Math.sin(now/600+o.userData.id*1.7)*.06;o.position.y+=(ty-o.position.y)*Math.min(1,dt*6);
    const fa=(uu.face||0)*Math.PI/180;
    if(!o.userData.inf){const want=-fa;let cur=o.userData.body.rotation.y;let d=want-cur;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;o.userData.body.rotation.y=cur+d*Math.min(1,dt*5);
      if(o.userData.air)o.userData.body.traverse(x=>{if(x.userData.rotor)x.rotation.y+=dt*30;});}
    else if(uu._men&&typeof v3MenAnim==='function')v3MenAnim(o,uu,dt,now,fa);
    else{const moving=uu.path&&uu.path.length;const tight=cell(uu.r,uu.c).t==='bldg'?.55:1;const cf=Math.cos(fa),sf=Math.sin(fa);const vmax=UT[uu.type].mv*SPD_K*(uu.supp>0?.65:1)*1.2;
      const ud=o.userData;if(!ud.trail)ud.trail=[[tx,tz]];{const lt=ud.trail[0];if(Math.hypot(tx-lt[0],tz-lt[1])>.03){ud.trail.unshift([tx,tz]);if(ud.trail.length>60)ud.trail.pop();}}
      let si=-1;for(const s of o.userData.sold){si++;if(!s.m.visible)continue;const [lx,lz]=s.slot;let gx=tx+(lx*cf-lz*sf)*tight,gz=tz+(lx*sf+lz*cf)*tight;
        const ins=v3InSoldier(uu,s,si,dt);if(ins&&ins.x!=null){gx=ins.x;gz=ins.z;}
        else if(moving||(ins&&ins.trail)){// 이동 중에는 한 줄로 앞사람 발자국을 따른다(문·골목을 같은 길로 지나도록)
          const tp=ud.trail[Math.min(ud.trail.length-1,Math.round(si*2.3))];gx=tp[0];gz=tp[1];}
        const dx=gx-s.wx,dz=gz-s.wz,d=Math.hypot(dx,dz);const step=Math.min(d,vmax*dt*(d>.4?3:d>.15?1.6:1.1));
        if(d>.004){s.wx+=dx/d*step;s.wz+=dz/d*step;}s.spd+=((d>.01?step/dt:0)-s.spd)*Math.min(1,dt*8);
        const m=s.m;m.position.set(s.wx-o.position.x,ins?ins.y:0,s.wz-o.position.z);
        const head=s.spd>.05?Math.atan2(dz,dx):fa+Math.sin(now/1900+s.ph)*.25;let cur=m.rotation.y,want=-head,dd=want-cur;while(dd>Math.PI)dd-=2*Math.PI;while(dd<-Math.PI)dd+=2*Math.PI;m.rotation.y=cur+dd*Math.min(1,dt*8);
        const sw=Math.min(1,s.spd/.4)*Math.sin(now/70+s.ph)*.7;m.userData.legL.rotation.z=sw;m.userData.legR.rotation.z=-sw;
        const crouch=!moving&&(uu.supp>0||uu.tgt!=null||uu.shot===G.turn)?.75:1;m.scale.y+=(crouch-m.scale.y)*Math.min(1,dt*6);}}
    if(o.userData.sel.visible){const p=1+Math.sin(now/220)*.06;o.userData.sel.scale.set(p,p,p);}}}
/* ---------- 강조 표시 ---------- */
function v3SyncHl(){if(!V3.on||!G)return;const T=V3.T,g=V3.G.hl;v3Clear(g);const items=[];const add=(k,col)=>items.push([k,col]);
  if(UI.reach)for(const k of UI.reach.keys())add(k,'#5aa0ff');for(const k of UI.spots||[])add(k,'#5cd18a');
  if(UI.phase==='sup'&&UI.st!=null){const S=SUP[UI.supK];for(const [a,b] of supArea(kr(UI.st),kc(UI.st),S.rad))add(key(a,b),UI.supK==='smoke'?'#c3cbdb':'#ff8a3d');}
  if(UI.fc!=null)add(UI.fc,'#ff2a1a');if(UI.pane)add(key(UI.pane.r,UI.pane.c),'#f2efe6');
  if(G.hint&&G.cur===G.viewer)add(G.hint.t,'#f0c45a');
  {const s0=UI.sel;if(s0&&G.units.includes(s0)){if(s0.tgtTile!=null)add(s0.tgtTile,'#ff8a3d');}}
  const L=[],LC=[];const c=new T.Color();
  if(items.length){const geo=new T.BoxGeometry(.9,.02,.9);const im=new T.InstancedMesh(geo,V3.M.hl,items.length);im.renderOrder=3;const m4=new T.Matrix4();
    items.forEach(([k,col],i)=>{const r=kr(k),cc=kc(k);const [x,z]=v3x(r,cc);const y=v3Top(r,cc)+.04;m4.makeTranslation(x,y,z);im.setMatrixAt(i,m4);im.setColorAt(i,c.set(col));
      const h=.45;const P=[[x-h,z-h],[x+h,z-h],[x+h,z+h],[x-h,z+h]];for(let s=0;s<4;s++){const [a,b]=P[s],[d,e]=P[(s+1)%4];L.push(a,y+.01,b,d,y+.01,e);LC.push(c.r,c.g,c.b,c.r,c.g,c.b);}});
    g.add(im);}
  const seg=(r1,c1,r2,c2,col,y1,y2,arc)=>{const [x1,z1]=v3x(r1,c1),[x2,z2]=v3x(r2,c2);c.set(col);const n=16;
    for(let i=0;i<n;i+=2){const t1=i/n,t2=(i+1)/n;const f=t=>Math.sin(t*Math.PI)*arc;L.push(x1+(x2-x1)*t1,y1+(y2-y1)*t1+f(t1),z1+(z2-z1)*t1,x1+(x2-x1)*t2,y1+(y2-y1)*t2+f(t2),z1+(z2-z1)*t2);LC.push(c.r,c.g,c.b,c.r,c.g,c.b);}};
  if(G.hint&&G.cur===G.viewer){const a=G.units.find(u=>u.id===G.hint.u);if(a)seg(a.r,a.c,kr(G.hint.t),kc(G.hint.t),'#f0c45a',v3Top(a.r,a.c)+.3,v3Top(kr(G.hint.t),kc(G.hint.t))+.3,.6);}
  const s=UI.sel,k=UI.hk;
  if(s&&UI.phase==='select'&&UI.reach&&k!=null&&UI.reach.has(k)&&k!==key(s.r,s.c)){const pts=[];let q=k,guard=0;while(q!=null&&guard++<80){pts.push(q);if(q===key(s.r,s.c))break;q=UI.reach.prev.get(q);}
    c.set('#f2efe6');for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];const [x1,z1]=v3x(kr(a),kc(a)),[x2,z2]=v3x(kr(b),kc(b));L.push(x1,v3Top(kr(a),kc(a))+.12,z1,x2,v3Top(kr(b),kc(b))+.12,z2);LC.push(c.r,c.g,c.b,c.r,c.g,c.b);}}
  // 실시간 명령: 이동 경로(흰 점선)와 공격 대상(빨간 선)
  for(const u of [s,...(UI.group||[])]){if(!u||!G.units.includes(u)||!u.path||!u.path.length)continue;c.set('#f2efe6');let pr=[u.x,u.z];
    for(const q of u.path){L.push(pr[0],.06,pr[1],q[0],.06,q[1]);LC.push(c.r,c.g,c.b,c.r,c.g,c.b);pr=q;}
    const [ex,ez]=pr;for(let i=0;i<12;i++){const a1=i/12*6.283,a2=(i+1)/12*6.283;L.push(ex+Math.cos(a1)*.12,.06,ez+Math.sin(a1)*.12,ex+Math.cos(a2)*.12,.06,ez+Math.sin(a2)*.12);LC.push(c.r,c.g,c.b,c.r,c.g,c.b);}}
  // 사거리 안의 적: 작은 빨간 원
  if(s&&G.units.includes(s)){c.set('#ff5a3c');for(const e of G.units){if(e.nat===s.nat||!(UI.targets||[]).includes(key(e.r,e.c)))continue;const o=V3.uo.get(e.id);if(!o)continue;const ex=o.position.x,ez=o.position.z,y=o.position.y+.03;
      for(let i=0;i<16;i++){const a1=i/16*6.283,a2=(i+1)/16*6.283;L.push(ex+Math.cos(a1)*.28,y,ez+Math.sin(a1)*.28,ex+Math.cos(a2)*.28,y,ez+Math.sin(a2)*.28);LC.push(c.r,c.g,c.b,c.r,c.g,c.b);}}}
  if(s&&G.units.includes(s)){
    const tg=s.tgt!=null?G.units.find(e=>e.id===s.tgt):null;if(tg)seg(s.r,s.c,tg.r,tg.c,'#ff4a2a',v3Top(s.r,s.c)+.3,v3UnitY(tg)+.25,0);
  }
  // 사격선: 공격 확인 중이면 시야선을 보여준다
  if(s&&UI.fc!=null){const r2=kr(UI.fc),c2=kc(UI.fc);const d=unitAt(r2,c2);seg(s.r,s.c,r2,c2,'#ff6a3d',v3Top(s.r,s.c)+.25,(d?v3UnitY(d):v3Top(r2,c2))+.2,UT[s.type].ind?1.5+dist(s.r,s.c,r2,c2)*.3:0);}
  if(L.length){const lg=new T.BufferGeometry();lg.setAttribute('position',new T.Float32BufferAttribute(L,3));lg.setAttribute('color',new T.Float32BufferAttribute(LC,3));const ls=new T.LineSegments(lg,V3.M.line);ls.renderOrder=4;g.add(ls);}}

/* ---------- 시간·날씨 ---------- */
function v3Light(){const h=hourOf(),night=isNight(),dusk=(h===6||h===18||h===20&&false);const s=V3;const wx=G.wx||'clear';
  const P=night?{sun:'#7f95c9',si:.5,sky:'#2a3754',gr:'#141210',hi:.42,fog:'#0d131b',em:1.25}:dusk?{sun:'#ff9a5a',si:1.7,sky:'#d6a07a',gr:'#3f3226',hi:.55,fog:'#6f5a50',em:.55}:{sun:'#ffe9cc',si:2.3,sky:'#c9cccb',gr:'#6b6458',hi:1.15,fog:'#9a9183',em:0};
  s.sun.color.set(P.sun);s.sun.intensity=P.si*(wx==='clear'?1:.55);s.hemi.color.set(P.sky);s.hemi.groundColor.set(P.gr);s.hemi.intensity=P.hi;s.M.wall.emissiveIntensity=P.em;
  const fogC=new V3.T.Color(P.fog);if(wx==='rain'||wx==='storm')fogC.lerp(new V3.T.Color('#4a525a'),.5);s.scene.fog.color.copy(fogC);s.scene.background=fogC.clone();
  s.fogK=wx==='fog'?.45:wx==='storm'?.7:1;s.sunAng=dusk?(h===6?-1:1):night?.4:(h-12)/8;s.rain=(wx==='rain'||wx==='storm')?(wx==='storm'?1.6:1):0;}

/* ---------- 연기·불·비 ---------- */
function v3SyncSmoke(){const T=V3.T,g=V3.G.amb;for(const sp of V3.smoke)g.remove(sp.o);V3.smoke=[];
  const add=(x,y,z,ph,kind,sp)=>{const o=new T.Sprite((kind==='fire'?V3.M.fire:V3.M.smoke).clone());if(kind==='screen')o.material.color.set('#c9c6bd');g.add(o);V3.smoke.push({o,x,y,z,ph,kind,sp:sp||1});};
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=G.map[r][c];const [cx,cz]=v3x(r,c);const k=key(r,c);if(V3.smoke.length>320)break;
    if(x.smoke>0){for(let i=0;i<3;i++)add(cx+(v3Hash(k,500+i)-.5)*.7,0,cz+(v3Hash(k,510+i)-.5)*.7,v3Hash(k,520+i),'screen');continue;}
    const dmg=x.t==='bldg'?1-x.bhp/x.bmax:x.t==='rubble'&&v3Hash(k,530)<.35?.7:0;if(dmg<.3)continue;const y=x.t==='bldg'?v3Top(r,c)-.05:.1;
    for(let i=0;i<1+Math.round(dmg*2);i++)add(cx+(v3Hash(k,540+i)-.5)*.6,y,cz+(v3Hash(k,550+i)-.5)*.6,v3Hash(k,560+i),'smoke',.7+dmg);
    if(dmg>=.5)add(cx+(v3Hash(k,570)-.5)*.4,y,cz+(v3Hash(k,571)-.5)*.4,v3Hash(k,572),'fire');}
  if(!V3.dust){const n=500,P=new Float32Array(n*3);for(let i=0;i<n;i++)P.set([(Math.random()-.5)*30,Math.random()*6,(Math.random()-.5)*30],i*3);const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(P,3));
    V3.dust=new T.Points(geo,new T.PointsMaterial({color:'#d8d2c4',size:.05,transparent:true,opacity:.5,depthWrite:false}));V3.scene.add(V3.dust);}
  if(V3.rainObj){g.remove(V3.rainObj);V3.rainObj=null;}
  if(V3.rain){const n=1400,P=new Float32Array(n*6);for(let i=0;i<n;i++){const x=(Math.random()-.5)*40,y=Math.random()*14,z=(Math.random()-.5)*40;P.set([x,y,z,x-.05,y-.45,z],i*6);}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(P,3));V3.rainObj=new T.LineSegments(geo,new T.LineBasicMaterial({color:'#9fb0bf',transparent:true,opacity:.35,depthWrite:false}));g.add(V3.rainObj);}}

/* ---------- 이름표 (HTML) ---------- */
function v3SyncLabels(vs,vn){const lab=$('#v3d-lab');const want=new Map();
  for(const o of G.objs){const x=G.map[o.r][o.c];const [px0,pz]=v3x(o.r,o.c);want.set('o'+x.obj,{html:`<span>${o.name}</span>`,cls:'v3c',col:mapCol(x.owner),p:[px0,v3Top(o.r,o.c)+1.05,pz]});}
  for(const u of G.units){if(G.fog&&!seen(u,vn,vs))continue;const hm=hpMax(u);const hc=u.hp>hm*.6?'#5cd18a':u.hp>hm*.3?'#f0b23a':'#ff5a4e';
    const cv=u.nat===vn&&!UT[u.type].fly?coverOf(u):null;const tags=(typeof v3MorTag==='function'?v3MorTag(u):u.supp?'<em title="제압">제압</em>':'')+(cv&&cv.cov>=.2?`<u class="cv" title="엄폐: ${(COVK[cv.kind]||{n:'연막'}).n}">엄폐</u>`:'')+(u.ow?'<u>경계</u>':'')+(typeof v3RankTag==='function'?v3RankTag(u):u.rank?`<b>${'^'.repeat(u.rank)}</b>`:'');
    want.set('u'+u.id,{html:`${typeof v3UnitTag==='function'?v3UnitTag(u):`<i><s style="width:${Math.round(u.hp/hm*100)}%;background:${hc}"></s></i>`}${tags}`,cls:'v3u',col:mapCol(u.nat),uid:u.id});}
  if(typeof ccpOf==='function'&&G.order&&G.order.includes(vn)){const c=ccpOf(vn);want.set('ccp',{html:'<span>환자집결지</span>',cls:'v3c',col:'#e9e6dc',p:[c.x,v3TopAt(c.x,c.z)+.45,c.z]});}
  for(const [id,o] of V3.labels)if(!want.has(id)){o.el.remove();V3.labels.delete(id);}
  for(const [id,w] of want){let o=V3.labels.get(id);if(!o){const el=document.createElement('div');el.className='v3l '+w.cls;lab.appendChild(el);o={el};V3.labels.set(id,o);}
    if(o.html!==w.html){o.el.innerHTML=w.html;o.html=w.html;}o.el.style.setProperty('--c',w.col);o.p=w.p;o.uid=w.uid;}}
function v3PlaceLabels(){const v=V3.tmpV||(V3.tmpV=new V3.T.Vector3());const w=V3.cv.clientWidth,h=V3.cv.clientHeight;const far=V3.cs.d>30||V3.cine;
  for(const o of V3.labels.values()){let p=o.p;if(o.uid!=null){const uo=V3.uo.get(o.uid);if(!uo||far){o.el.style.display='none';continue;}p=[uo.position.x,uo.position.y+(uo.userData.air?.25:.45),uo.position.z];}
    v.set(p[0],p[1],p[2]).project(V3.cam);if(v.z>1||v.x<-1.1||v.x>1.1||v.y<-1.1||v.y>1.1){o.el.style.display='none';continue;}o.el.style.display='';
    o.el.style.transform=`translate(${((v.x+1)/2*w).toFixed(1)}px,${((1-v.y)/2*h).toFixed(1)}px) translate(-50%,-50%)`;}}

/* ---------- 동기화 ---------- */
function v3Sync(){if(!V3.on||!V3.ren||!G)return;const vn=G.viewer,vs=G.fog?visSet(vn):null;
  const tag=G.seed+'|'+N+'|'+G.map.map(row=>row.map(x=>x.t[0]).join('')).join('');
  if(V3.tag!==tag){const fresh=V3.seed!==G.seed+'|'+N;V3.seed=G.seed+'|'+N;V3.tag=tag;V3.ctag=null;v3BuildWorld();if(fresh){V3.uo.forEach(o=>V3.G.units.remove(o));V3.uo.clear();v3HomeCam(true);}}
  const ctag=tag+G.map.map(row=>row.map(x=>x.t==='bldg'?Math.round(x.bhp/x.bmax*6):'').join(',')).join('');if(V3.ctag!==ctag){V3.ctag=ctag;v3BuildCity();}v3ApplyCut(v3CutMap(vs,vn));
  const stag=tag+G.objs.map(o=>G.map[o.r][o.c].owner).join(',');if(V3.stag!==stag){V3.stag=stag;v3BuildSites();}
  const smk=ctag+'|'+G.wx+'|'+G.map.map(row=>row.map(x=>x.smoke?1:0).join('')).join('');
  v3Light();if(V3.smk!==smk){V3.smk=smk;v3SyncSmoke();}
  v3FowUpd(vs);V3.grid.visible=!!UI.grid;v3SyncUnits(vs,vn);v3SyncHl();v3SyncLabels(vs,vn);}

/* ---------- 연출 ---------- */
function v3Pos(r,c,u){if(u&&V3.uo.has(u.id)){const o=V3.uo.get(u.id);const S0=(o.userData.sold||[]).filter(s=>s.m.visible);const sh=(u._sh||[]).map(i=>o.userData.sold[i]).filter(s=>s&&s.m.visible);const S=sh.length?sh:S0;
    if(S.length){const s=S[Math.floor(Math.random()*S.length)];return [s.wx,o.position.y+.1,s.wz];}return [o.position.x,o.position.y+(UT[u.type].fly?0:.12),o.position.z];}
  if(u&&u.x!=null)return [u.x,v3UnitY(u)+.1,u.z];const [x,z]=v3x(r,c);return [x,v3Top(r,c)+.1,z];}
function v3FxFire(a,r,c){if(typeof v3AirFire==='function'&&v3AirFire(a,r,c,arguments[3],arguments[4]))return;if(typeof sfx==='function')sfx(UT[a.type].ind?'arty':UT[a.type].ex?'hit':'shot',.8);if(!V3.on)return;const T=V3.T;const [x1,y1,z1]=v3Pos(a.r,a.c,a);const d=arguments[3]||unitAt(r,c);const [x2,y2,z2]=v3Pos(r,c,d);
  const ind=UT[a.type].ind,dd=dist(a.r,a.c,r,c);const n=a.type==='mg'||a.type==='ifv'?4:1;const col=UT[a.type].ex?'#ffb060':'#ffe1a0';
  const tc=a.nat===G.viewer?'#8dff6e':'#ff5a3c';
  for(let i=0;i<n;i++){const j=(Math.random()-.5)*.15;let o;
    if(ind){o=new T.Sprite(new T.SpriteMaterial({map:V3.puff,color:col,blending:T.AdditiveBlending,transparent:true,depthWrite:false}));o.scale.setScalar(.24);}
    else{o=new T.Mesh(V3.tracerG||(V3.tracerG=new T.BoxGeometry(.012,.012,.35)),new T.MeshBasicMaterial({color:tc,blending:T.AdditiveBlending,transparent:true,depthWrite:false}));o.userData.keepGeo=1;o.lookAt(x2-x1,y2-y1,z2-z1);}
    V3.G.fx.add(o);V3.fx.push({o,t0:performance.now()+i*70,dur:ind?650:150+dd*14,upd:(sh,k)=>{sh.position.set(x1+(x2+j-x1)*k,y1+(y2-y1)*k+(ind?Math.sin(k*Math.PI)*(1.5+dd*.35):0),z1+(z2+j-z1)*k);}});}
  v3Burst(x1+(x2-x1)*.02,y1,z1+(z2-z1)*.02,UT[a.type].cls==='inf'?.08:.22,'#ffd27a',0,UT[a.type].cls==='inf'?.15:.6);
  if(typeof dsDust==='function'&&(UT[a.type].cls!=='inf'||a.type==='mg')&&Math.random()<.35)dsDust(x1,z1,.3,2600,1,'#8e887e',y1);// 총구 연기가 잠시 머문다
  setTimeout(()=>{if(UT[a.type].ex){v3Burst(x2,y2-.05,z2,.6,'#ff8a3d',3,1.5);dsScar(ind?'crater':'scorch',x2,z2,ind?.14:.11);dsSpray(x2,y2,z2,ind?48:26,ind?.7:.5);dsDust(x2,z2,ind?1.4:.8,ind?9000:5000,ind?6:4);if(ind)dsColumn(x2,z2,.7);}else{v3Impact(x2,y2-.05,z2);if(Math.random()<.25)dsScar('spray',x2,z2,.05);}if(UT[a.type].ex)V3.shake=Math.max(V3.shake,.05);if(typeof sfx==='function')sfx('hit',.6);},ind?650:170);}
function v3FxKill(u){if(UT[u.type].fly&&typeof v3AirKill==='function'){v3AirKill(u);return;}if(!V3.on||UT[u.type].cls==='inf')return;const [x,y,z]=v3Pos(u.r,u.c,u);if(UT[u.type].cls==='veh')dsWreck(u);setTimeout(()=>{v3Burst(x,y,z,1.3,'#ff7a2a',7,4);dsSpray(x,y+.1,z,50,.8);dsScar('scorch',x,z,.25);V3.shake=Math.max(V3.shake,.14);if(typeof sfx==='function')sfx('boom');},400);}
function v3FxCollapse(r,c,f){if(!V3.on)return;const T=V3.T;const [x,z]=v3x(r,c);const h=Math.max(1,f||3)*FLOOR_H;
  // 기울어지며 쓰러지는 건물: 밑변 한쪽을 축으로 돌면서 가라앉는다
  const dir=Math.floor(Math.random()*4);const piv=new T.Group();const ax=[[.45,0],[-.45,0],[0,.45],[0,-.45]][dir];piv.position.set(x+ax[0],.06,z+ax[1]);
  const geo=new T.BoxGeometry(.88,h,.88);const uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*.88/.21/8,uv.getY(i)*h/FLOOR_H/8);
  const mat=new T.MeshStandardMaterial({map:V3.M.wall.map,color:'#8f8b84',roughness:.95});const m=new T.Mesh(geo,mat);m.position.set(-ax[0],h/2,-ax[1]);m.castShadow=true;piv.add(m);V3.G.fx.add(piv);
  V3.fx.push({o:piv,t0:performance.now(),dur:1500,upd:(o,k)=>{const e=k*k;const ang=e*1.45;if(dir<2)o.rotation.z=(dir===0?-1:1)*ang;else o.rotation.x=(dir===2?1:-1)*ang;o.position.y=.06-e*h*.55;}});
  setTimeout(()=>{mat.dispose();},1600);
  // 분진 구름: 크게 퍼지며 천천히 가라앉는다
  for(let i=0;i<28;i++){const s=new T.Sprite(new T.SpriteMaterial({map:V3.puffD||V3.puff,color:i%3?'#a99a83':'#6c635a',transparent:true,depthWrite:false,opacity:0,rotation:Math.random()*6.28}));const a=Math.random()*6.283,sp=1.2+Math.random()*3.2,y0=.2+Math.random()*h*.6;s.position.set(x,y0,z);V3.G.fx.add(s);
    V3.fx.push({o:s,t0:performance.now()+300+i*30,dur:12000,upd:(o,k)=>{const e=1-Math.pow(1-k,2.6);o.position.set(x+Math.cos(a)*sp*e+DS.wind[0]*k*12,y0+e*1.4,z+Math.sin(a)*sp*e);o.scale.setScalar(.8+e*3.6);o.material.opacity=.6*(1-k)*(k<.06?k/.06:1);}});}
  v3Debris(x,h*.5,z,26,1.4);dsSpray(x,h*.4,z,160,1.5);dsScar('rubble',x,z,.9);
  setTimeout(()=>{v3Burst(x,.3,z,1.4,'#ffb070',0,2);dsDust(x,z,2.6,26000,22);dsFires(x,z,4,60000,.9);V3.shake=Math.max(V3.shake,.3);if(typeof sfx==='function')sfx('boom');},700);}
function v3FxStrike(kind,r,c,n){if(!V3.on)return;const [x,z]=v3x(r,c);if(kind==='heli'){v3Heli(r,c,n);return;}
  if(kind==='smoke'){for(let i=0;i<9;i++)v3Burst(x+(Math.random()-.5)*2.4,.3,z+(Math.random()-.5)*2.4,1.2,'#d6d3c8',2,0);return;}
  if(kind==='air'||kind==='gunship')return;// 전투기·공격헬기는 07x-air가 그린다
  if(kind==='arty'&&typeof shellBarrage==='function')return;   // 실제 포탄은 v3Shells가 그린다
  dsBarrage(r,c,9,2.8);}
// 총탄 착탄: 작은 흙먼지
function v3Impact(x,y,z){const T=V3.T;for(let i=0;i<2;i++){const s=new T.Sprite(new T.SpriteMaterial({map:V3.puff,color:'#9a8f80',transparent:true,depthWrite:false,opacity:0}));const ox=(Math.random()-.5)*.2,oz=(Math.random()-.5)*.2;V3.G.fx.add(s);
  V3.fx.push({o:s,t0:performance.now()+i*40,dur:700,upd:(o,k)=>{o.position.set(x+ox,y+k*.08,z+oz);o.scale.setScalar(.06+k*.14);o.material.opacity=.6*(1-k);}});}}
// 날아가는 콘크리트 파편: 납작한 조각이 돌며 떨어진다
function v3Debris(x,y,z,n,pow){const T=V3.T;const geo=V3.debG||(V3.debG=new T.BoxGeometry(.07,.02,.05));const mat=V3.debM||(V3.debM=new T.MeshStandardMaterial({color:'#77726a',roughness:1}));
  for(let i=0;i<n;i++){const d=new T.Mesh(geo,mat);d.userData.keepGeo=1;d.userData.keepMat=1;const s=.6+Math.random()*1.8;d.scale.set(s,s,s);d.castShadow=true;const vx=(Math.random()-.5)*3*pow,vz=(Math.random()-.5)*3*pow,vy=(1+Math.random()*2)*pow,rx=Math.random()*9,rz=Math.random()*9;V3.G.fx.add(d);
    V3.fx.push({o:d,t0:performance.now(),dur:2600,upd:(o,k)=>{const t=Math.min(k*2.6,1.3);const yy=y+vy*t-4.9*t*t*.6;o.position.set(x+vx*t,Math.max(.02,yy),z+vz*t);if(yy>.02){o.rotation.x=rx*t;o.rotation.z=rz*t;}}});}}
function v3Burst(x,y,z,size,col,smoke,light){const T=V3.T;const f=new T.Sprite(new T.SpriteMaterial({map:V3.puff,color:col,blending:T.AdditiveBlending,transparent:true,depthWrite:false}));f.position.set(x,y,z);V3.G.fx.add(f);
  V3.fx.push({o:f,t0:performance.now(),dur:450,upd:(o,k)=>{o.scale.setScalar(size*(.4+k*1.2));o.material.opacity=1-k;}});
  if(light){V3.flash.position.set(x,y+.6,z);V3.flash.intensity=light*6;V3.flashT=performance.now();}
  for(let i=0;i<smoke;i++){const s=new T.Sprite(new T.SpriteMaterial({map:V3.puff,color:i%2?'#a89c8a':'#5b544c',transparent:true,depthWrite:false,opacity:0}));const ox=(Math.random()-.5)*size*.6,oz=(Math.random()-.5)*size*.6,vy=.5+Math.random()*.7;s.position.set(x,y,z);V3.G.fx.add(s);
    V3.fx.push({o:s,t0:performance.now()+i*90,dur:2200,upd:(o,k)=>{o.position.set(x+ox*(1+k),y+vy*k*1.6,z+oz*(1+k));o.scale.setScalar(size*.5*(.5+k*1.6));o.material.opacity=.7*(1-k);}});}
  if(smoke>=3)v3Debris(x,y,z,smoke*2,.8);if(false)for(let i=0;i<10;i++){const d=new T.Mesh(new T.BoxGeometry(.05,.05,.05),V3.M.dark);d.position.set(x,y,z);const vx=(Math.random()-.5)*2.2,vz=(Math.random()-.5)*2.2,vy=1.5+Math.random()*1.5;V3.G.fx.add(d);
    V3.fx.push({o:d,t0:performance.now(),dur:900,upd:(o,k)=>{const t=k*.9;o.position.set(x+vx*t,Math.max(y-.1,y+vy*t-4.9*t*t),z+vz*t);o.rotation.x+=.2;}});}}

/* ---------- 매 프레임 ---------- */
function v3Frame(now){if(!V3.on)return;requestAnimationFrame(v3Frame);const rdt=Math.min(.5,(now-(V3.last||now))/1000),dt=Math.min(.05,rdt);V3.last=now;const s=V3.cs;
  const k=1-Math.exp(-dt*7);s.x+=(s.gx-s.x)*k;s.z+=(s.gz-s.z)*k;s.d+=(s.gd-s.d)*k;s.yaw+=(s.gyaw-s.yaw)*k;
  const cp=Math.cos(s.pitch);let sx=0,sz=0;if(V3.shake>0){sx=(Math.random()-.5)*V3.shake;sz=(Math.random()-.5)*V3.shake;V3.shake*=Math.exp(-dt*9);if(V3.shake<.003)V3.shake=0;}
  V3.cam.position.set(s.x+Math.sin(s.yaw)*cp*s.d+sx,Math.sin(s.pitch)*s.d,s.z+Math.cos(s.yaw)*cp*s.d+sz);V3.cam.lookAt(s.x,0,s.z);
  const fogK=V3.fogK||1;V3.scene.fog.near=s.d*.75*fogK;V3.scene.fog.far=s.d*2.8*fogK+10;
  const sa=V3.sunAng||0;V3.sun.position.set(s.x-12*sa-4,18-Math.abs(sa)*6,s.z+8);V3.sun.target.position.set(s.x,0,s.z);
  const shs=Math.min(34,Math.max(10,s.d*.85));const sc=V3.sun.shadow.camera;if(Math.abs(sc.right-shs)>.5){sc.left=-shs;sc.right=shs;sc.top=shs;sc.bottom=-shs;sc.updateProjectionMatrix();}
  if(G)v3AnimUnits(rdt,now);if(typeof dsFrame==='function')dsFrame(now,dt);if(typeof v3AirFrame==='function')v3AirFrame(now,dt);if(typeof v3WarFrame==='function')v3WarFrame(now,dt);if(typeof v3FortFrame==='function')v3FortFrame();
  for(const o of V3.G.sites.children)if(o.userData.flag)o.rotation.y=Math.sin(now/700+o.position.x)*.25;
  const tt=now/1000;for(const sp of V3.smoke){if(sp.kind==='fire'){const f=.75+Math.sin(tt*13+sp.ph*20)*.15+Math.sin(tt*7.3)*.1;sp.o.position.set(sp.x,sp.y+.15,sp.z);sp.o.scale.setScalar(.45*f);sp.o.material.opacity=.75*f;continue;}
    if(sp.kind==='screen'){const l=(tt*.08+sp.ph)%1;sp.o.position.set(sp.x+Math.sin(tt*.3+sp.ph*9)*.15,.4+l*.8,sp.z);sp.o.scale.setScalar(1.5+l*.6);sp.o.material.opacity=.75*Math.sin(l*Math.PI)+.15;continue;}
    const life=(tt*.22*sp.sp+sp.ph)%1;sp.o.position.set(sp.x+life*.5,sp.y+.2+life*3,sp.z-life*.3);sp.o.scale.setScalar(.35+life*1.6);sp.o.material.opacity=.55*Math.sin(life*Math.PI);}
  if(V3.rainObj){V3.rainObj.position.set(s.x,0,s.z);const p=V3.rainObj.geometry.attributes.position;const a=p.array,sp=dt*16*V3.rain;for(let i=0;i<a.length;i+=6){a[i+1]-=sp;a[i+4]-=sp;if(a[i+4]<0){a[i+1]+=14;a[i+4]+=14;}}p.needsUpdate=true;}
  if(V3.dust){V3.dust.position.set(s.x,0,s.z);V3.dust.rotation.y=tt*.02;}
  V3.fx=V3.fx.filter(f=>{const k2=(now-f.t0)/f.dur;if(k2<0){f.o.visible=false;return true;}f.o.visible=true;if(k2>=1){V3.G.fx.remove(f.o);if(f.o.material&&f.o.material!==V3.M.dark&&!f.o.userData.keepMat)f.o.material.dispose();if(f.o.geometry&&!f.o.userData.keepGeo)f.o.geometry.dispose();return false;}f.upd(f.o,k2);return true;});
  if(V3.flash.intensity>0){const e=(now-V3.flashT)/400;V3.flash.intensity=e>=1?0:V3.flash.intensity*(1-e*.5);}
  v3PlaceLabels();V3.ren.render(V3.scene,V3.cam);}
