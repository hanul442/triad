/* ===================== 3D VIEW (three.js) =====================
   규칙·AI는 그대로 두고 전장을 3D 도시로 그린다. three.js는 켤 때만 불러온다.
   좌표: 2D 지도 px(r,c)를 R로 나눈 값이 월드 x·z, 칸 반지름 = 1. */
const V3={on:false,busy:false,T:null,hk:null};
const V3K='triad-3d';
function v3Pref(){try{const v=localStorage.getItem(V3K);return v==null?true:v==='1';}catch(e){return true;}}
function v3SavePref(on){try{localStorage.setItem(V3K,on?'1':'0');}catch(e){}}
function v3Supported(){try{const c=document.createElement('canvas');return !!(window.WebGLRenderingContext&&(c.getContext('webgl2')||c.getContext('webgl')));}catch(e){return false;}}
async function v3Load(){if(V3.T)return V3.T;
  for(const s of ['./vendor/three.module.min.js','https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js']){try{V3.T=await import(s);return V3.T;}catch(e){}}return null;}
async function setV3(on){if(typeof document==='undefined')return;const btn=$('#b-3d');
  if(on){if(V3.busy)return;if(!v3Supported()){toast('이 기기는 3D 화면을 지원하지 않습니다');return;}
    V3.busy=true;const T=await v3Load();V3.busy=false;if(!T){toast('3D 엔진을 불러오지 못했습니다. 2D 지도로 표시합니다');return;}
    if(!V3.ren)v3Init();V3.on=true;$('#app').classList.add('v3');$('#v3d').hidden=false;$('#v3d-lab').hidden=false;v3Size();
    if(G){v3Sync();const N=G.nats[G.viewer];if(N&&N.hq&&!V3.cs.set)v3Focus(...N.hq,true);}requestAnimationFrame(v3Frame);}
  else{V3.on=false;$('#app').classList.remove('v3');const cv=$('#v3d');if(cv)cv.hidden=true;const lb=$('#v3d-lab');if(lb)lb.hidden=true;if(G){render();const s=UI.sel;if(s)centerOn(s.r,s.c);else centerHQ();}}
  if(btn)btn.setAttribute('aria-pressed',V3.on?'true':'false');v3SavePref(V3.on);}

/* ---------- 기본 도구 ---------- */
const v3x=(r,c)=>{const [x,y]=px(r,c);return [x/R,y/R];};
function v3Hash(k,s){let h=(k*2654435761^(s||0)*40503)>>>0;h=Math.imul(h^h>>>15,2246822507)>>>0;h=Math.imul(h^h>>>13,3266489909)>>>0;return ((h^h>>>16)>>>0)/4294967296;}
function v3Elev(r,c){const t=G.map[r][c].t;const k=key(r,c);if(t==='sea')return -.34;if(t==='mountain')return .5+v3Hash(k,7)*.45;if(t==='forest')return .05+v3Hash(k,3)*.04;
  if(t==='urban'||t==='city'||t==='hq')return .03;return .02+v3Hash(k,5)*.05;}
function v3Ground(r,c){return Math.max(-.12,v3Elev(r,c));}
const V3COL={sea:'#25414f',plain:'#857b5c',forest:'#4f5a37',mountain:'#776753',city:'#4c4a47',hq:'#46443f',oil:'#6f6650',mine:'#7a7262',urban:'#57544f'};
function v3Tex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new V3.T.CanvasTexture(c);t.colorSpace=V3.T.SRGBColorSpace;return t;}

/* ---------- 초기화 ---------- */
function v3Init(){const T=V3.T;const cv=$('#v3d');
  const ren=new T.WebGLRenderer({canvas:cv,antialias:true,powerPreference:'high-performance'});
  ren.setPixelRatio(Math.min(2,window.devicePixelRatio||1));ren.shadowMap.enabled=true;ren.shadowMap.type=T.PCFSoftShadowMap;
  ren.toneMapping=T.ACESFilmicToneMapping;ren.toneMappingExposure=1.05;ren.outputColorSpace=T.SRGBColorSpace;
  const scene=new T.Scene();const cam=new T.PerspectiveCamera(38,1,.1,500);
  const hemi=new T.HemisphereLight('#c9d6e2','#4d4334',.9);scene.add(hemi);
  const sun=new T.DirectionalLight('#fff0d8',2.2);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);const sc=sun.shadow.camera;sc.left=-16;sc.right=16;sc.top=16;sc.bottom=-16;sc.near=1;sc.far=90;sun.shadow.bias=-.0006;sun.shadow.normalBias=.02;
  scene.add(sun);scene.add(sun.target);scene.fog=new T.Fog('#8f8a80',30,90);
  const flash=new T.PointLight('#ffaa55',0,9,1.6);scene.add(flash);
  // 재질 텍스처
  const facade=v3Tex(256,256,(g,w,h)=>{g.fillStyle='#a49e93';g.fillRect(0,0,w,h);for(let i=0;i<900;i++){g.fillStyle=`rgba(${Math.random()<.5?0:255},${Math.random()<.5?0:255},${Math.random()<.5?0:255},.05)`;g.fillRect(Math.random()*w,Math.random()*h,3,3);}
    for(let y=0;y<8;y++){g.fillStyle='rgba(60,55,50,.35)';g.fillRect(0,y*32+29,w,3);for(let x=0;x<8;x++){g.fillStyle=Math.random()<.12?'#5b5650':'#2b3036';g.fillRect(x*32+8,y*32+8,16,15);}}});
  facade.wrapS=facade.wrapT=T.RepeatWrapping;
  const lights=v3Tex(256,256,(g,w,h)=>{g.fillStyle='#000';g.fillRect(0,0,w,h);for(let y=0;y<8;y++)for(let x=0;x<8;x++){if(Math.random()<.34){g.fillStyle=Math.random()<.8?'#ffc77a':'#fff0cf';g.fillRect(x*32+8,y*32+8,16,15);}}});
  lights.wrapS=lights.wrapT=T.RepeatWrapping;
  const puff=v3Tex(64,64,(g)=>{const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.5,'rgba(255,255,255,.45)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);});
  const M={
    terr:new T.MeshStandardMaterial({roughness:.95,metalness:0,flatShading:true}),
    water:new T.MeshStandardMaterial({color:'#2a5468',roughness:.22,metalness:.15,transparent:true,opacity:.78}),
    wall:new T.MeshStandardMaterial({map:facade,emissiveMap:lights,emissive:'#ffffff',emissiveIntensity:0,vertexColors:true,roughness:.92}),
    roof:new T.MeshStandardMaterial({vertexColors:true,roughness:.95,flatShading:true}),
    rubble:new T.MeshStandardMaterial({color:'#4f4943',roughness:1,flatShading:true}),
    road:new T.MeshStandardMaterial({color:'#2c2c2b',roughness:.9}),
    rock:new T.MeshStandardMaterial({color:'#7d6d58',roughness:1,flatShading:true}),
    tree:new T.MeshStandardMaterial({color:'#3c4a2b',roughness:1,flatShading:true}),
    steel:new T.MeshStandardMaterial({color:'#3d4246',roughness:.6,metalness:.4}),
    conc:new T.MeshStandardMaterial({color:'#77736b',roughness:.95}),
    dark:new T.MeshStandardMaterial({color:'#1e2124',roughness:.8}),
    hl:new T.MeshBasicMaterial({transparent:true,opacity:.42,depthTest:false,depthWrite:false}),
    line:new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.95,depthTest:false,depthWrite:false}),
    smoke:new T.SpriteMaterial({map:puff,color:'#3e3a35',transparent:true,depthWrite:false,opacity:.55}),
    fire:new T.SpriteMaterial({map:puff,color:'#ff8a3a',transparent:true,depthWrite:false,blending:T.AdditiveBlending}),
  };
  M.hl.vertexColors=false;
  const G3={world:new T.Group(),city:new T.Group(),sites:new T.Group(),units:new T.Group(),hl:new T.Group(),fx:new T.Group(),amb:new T.Group()};
  for(const k in G3)scene.add(G3[k]);
  Object.assign(V3,{ren,scene,cam,cv,hemi,sun,flash,M,puff,G:G3,cs:{x:20,z:15,yaw:0,pitch:.92,d:17,gx:20,gz:15,gyaw:0,gd:17,set:false},
    uo:new Map(),fx:[],smoke:[],labels:new Map(),tag:null,last:0,shake:0});
  v3Controls(cv);window.addEventListener('resize',v3Size);}
function v3Size(){if(!V3.ren)return;const a=$('#app');const w=a.clientWidth,h=a.clientHeight;V3.ren.setSize(w,h,false);V3.cam.aspect=w/Math.max(1,h);V3.cam.updateProjectionMatrix();}

/* ---------- 카메라 조작 ---------- */
function v3Bounds(){return [W/R,H/R];}
function v3Focus(r,c,now){const [x,z]=v3x(r,c);const s=V3.cs;s.gx=x;s.gz=z;s.set=true;if(now){s.x=x;s.z=z;}}
function v3Zoom(f){const s=V3.cs;s.gd=Math.min(60,Math.max(5,s.gd*f));}
function v3Rot(dir){V3.cs.gyaw+=dir*Math.PI/3;}
function v3Pan(dx,dy){const s=V3.cs,h=V3.cv.clientHeight||600;const k=2*s.d*Math.tan(V3.cam.fov*Math.PI/360)/h;
  const cy=Math.cos(s.yaw),sy=Math.sin(s.yaw);const fx=-dx*k,fz=-dy*k/Math.max(.5,Math.sin(s.pitch));
  s.gx+=fx*cy+fz*sy;s.gz+=-fx*sy+fz*cy;const [bw,bh]=v3Bounds();s.gx=Math.min(bw,Math.max(0,s.gx));s.gz=Math.min(bh,Math.max(0,s.gz));s.x=s.gx;s.z=s.gz;s.set=true;}
function v3Controls(cv){const P=new Map();let start=null,moved=0,multi=false,last2=null;
  const pos=e=>[e.clientX,e.clientY];
  cv.addEventListener('contextmenu',e=>e.preventDefault());
  cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);P.set(e.pointerId,{p:pos(e),b:e.button,mod:e.shiftKey||e.ctrlKey||e.altKey});
    if(P.size===1){start={p:pos(e),t:performance.now()};moved=0;multi=false;}else{multi=true;last2=null;}});
  cv.addEventListener('pointermove',e=>{const q=P.get(e.pointerId);
    if(!q){if(e.pointerType==='mouse')v3Hover(e);return;}
    const np=pos(e),dx=np[0]-q.p[0],dy=np[1]-q.p[1];q.p=np;moved+=Math.abs(dx)+Math.abs(dy);
    if(P.size===1){if(q.b===2||q.mod){const s=V3.cs;s.gyaw-=dx*.006;s.yaw=s.gyaw;s.pitch=Math.min(1.38,Math.max(.32,s.pitch+dy*.005));}else v3Pan(dx,dy);}
    else if(P.size===2){const [a,b]=[...P.values()];const mx=(a.p[0]+b.p[0])/2,my=(a.p[1]+b.p[1])/2,dd=Math.hypot(a.p[0]-b.p[0],a.p[1]-b.p[1]),an=Math.atan2(b.p[1]-a.p[1],b.p[0]-a.p[0]);
      if(last2){v3Pan(mx-last2.mx,my-last2.my);const s=V3.cs;s.gd=Math.min(60,Math.max(5,s.gd*last2.dd/Math.max(10,dd)));s.d=s.gd;let da=an-last2.an;if(da>Math.PI)da-=2*Math.PI;if(da<-Math.PI)da+=2*Math.PI;s.gyaw-=da;s.yaw=s.gyaw;
        s.pitch=Math.min(1.38,Math.max(.32,s.pitch+((my-last2.my)*(Math.abs(da)<.01&&Math.abs(dd-last2.dd)<3?.004:0))));}
      last2={mx,my,dd,an};}});
  const up=e=>{const had=P.has(e.pointerId);P.delete(e.pointerId);if(P.size<2)last2=null;
    if(had&&P.size===0&&!multi&&start&&moved<8&&performance.now()-start.t<700&&e.button!==2){const k=v3Pick(e.clientX,e.clientY);if(k!=null)tap(k);}
    if(P.size===0)start=null;};
  cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',e=>{P.delete(e.pointerId);multi=true;});
  cv.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&UI.hk!=null){UI.hk=null;drawPath();}});
  cv.addEventListener('wheel',e=>{e.preventDefault();v3Zoom(Math.exp(e.deltaY*.0012));},{passive:false});
  document.addEventListener('keydown',e=>{if(!V3.on||e.target.closest('input,select,textarea'))return;const k=e.key.toLowerCase();
    if(k==='q')v3Rot(1);else if(k==='e')v3Rot(-1);else if(k==='r')V3.cs.pitch=Math.min(1.38,V3.cs.pitch+.12);else if(k==='f')V3.cs.pitch=Math.max(.32,V3.cs.pitch-.12);
    else if(k==='w'||k==='arrowup')v3Pan(0,60);else if(k==='s'||k==='arrowdown')v3Pan(0,-60);else if(k==='a'||k==='arrowleft')v3Pan(60,0);else if(k==='d'||k==='arrowright')v3Pan(-60,0);});}
function v3Ray(cx,cy){const T=V3.T,rc=V3.ray||(V3.ray=new T.Raycaster());const b=V3.cv.getBoundingClientRect();
  rc.setFromCamera(new T.Vector2((cx-b.left)/b.width*2-1,-(cy-b.top)/b.height*2+1),V3.cam);return rc;}
function v3Pick(cx,cy){if(!G)return null;const rc=v3Ray(cx,cy);
  const hits=rc.intersectObjects([V3.G.units,V3.G.city,V3.G.world],true);
  for(const h of hits){let o=h.object;while(o&&o.userData.k==null&&o.parent)o=o.parent;if(o&&o.userData.k!=null)return o.userData.k;
    const m=h.object.userData;if(m.keys&&h.instanceId!=null)return m.keys[h.instanceId];if(m.tri&&h.faceIndex!=null)return m.tri[h.faceIndex];}
  const p=new V3.T.Vector3();if(rc.ray.intersectPlane(new V3.T.Plane(new V3.T.Vector3(0,1,0),0),p)){const [bw,bh]=v3Bounds();if(p.x<0||p.z<0||p.x>bw||p.z>bh)return null;return hexAt(p.x*R,p.z*R);}return null;}
let v3HovRaf=0;
function v3Hover(e){if(v3HovRaf)return;const x=e.clientX,y=e.clientY;v3HovRaf=requestAnimationFrame(()=>{v3HovRaf=0;const k=v3Pick(x,y);if(k!==UI.hk){UI.hk=k;drawPath();}});}

/* ---------- 지형 ---------- */
function v3BuildWorld(){const T=V3.T,g=V3.G.world;v3Clear(g);const n=ROWS*COLS;const M=V3.M;
  const hex=new T.CylinderGeometry(1,1,1,6);hex.translate(0,-.5,0);
  const im=new T.InstancedMesh(hex,M.terr,n);im.receiveShadow=true;const keys=[];const m4=new T.Matrix4(),q=new T.Quaternion(),sc=new T.Vector3(),ps=new T.Vector3();let i=0;
  const peaks=[],trees=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const [x,z]=v3x(r,c);const e=v3Elev(r,c);ps.set(x,e,z);sc.set(1,e+1.4,1);m4.compose(ps,q,sc);im.setMatrixAt(i,m4);keys.push(key(r,c));i++;
    const t=G.map[r][c].t;if(t==='mountain')peaks.push([x,z,e,key(r,c)]);if(t==='forest')trees.push([x,z,e,key(r,c)]);}
  im.userData.keys=keys;im.instanceMatrix.needsUpdate=true;g.add(im);V3.terr=im;
  if(peaks.length){const cg=new T.ConeGeometry(.9,1,6);cg.translate(0,.5,0);const pm=new T.InstancedMesh(cg,M.rock,peaks.length);pm.castShadow=pm.receiveShadow=true;const pk=[];
    peaks.forEach(([x,z,e,k],j)=>{const h=.5+v3Hash(k,11)*.9;ps.set(x+(v3Hash(k,12)-.5)*.2,e,z+(v3Hash(k,13)-.5)*.2);q.setFromAxisAngle(new T.Vector3(0,1,0),v3Hash(k,14)*6);sc.set(1,h,1);m4.compose(ps,q,sc);pm.setMatrixAt(j,m4);pk.push(k);});
    pm.userData.keys=pk;q.identity();g.add(pm);}
  if(trees.length){const tg=new T.ConeGeometry(.17,.5,5);tg.translate(0,.25,0);const per=5;const tm=new T.InstancedMesh(tg,M.tree,trees.length*per);tm.castShadow=true;const tk=[];let j=0;
    for(const [x,z,e,k] of trees)for(let s=0;s<per;s++){const a=v3Hash(k,20+s)*6.283,rr=.2+v3Hash(k,30+s)*.55,hh=.7+v3Hash(k,40+s)*.7;ps.set(x+Math.cos(a)*rr,e,z+Math.sin(a)*rr);sc.set(hh,hh,hh);q.identity();m4.compose(ps,q,sc);tm.setMatrixAt(j++,m4);tk.push(k);}
    tm.userData.keys=tk;g.add(tm);}
  const [bw,bh]=v3Bounds();const wp=new T.Mesh(new T.PlaneGeometry(bw+160,bh+160),M.water);wp.rotation.x=-Math.PI/2;wp.position.set(bw/2,-.12,bh/2);wp.receiveShadow=true;g.add(wp);
  const bed=new T.Mesh(new T.PlaneGeometry(bw+160,bh+160),new T.MeshStandardMaterial({color:'#1a2b33',roughness:1}));bed.rotation.x=-Math.PI/2;bed.position.set(bw/2,-1.4,bh/2);g.add(bed);
  // 도로
  if(!G.roads)buildRoads();const P=[];const quad=(ax,az,bx,bz,ya,yb,w)=>{const dx=bx-ax,dz=bz-az,L=Math.hypot(dx,dz)||1,nx=-dz/L*w,nz=dx/L*w;
    P.push(ax+nx,ya,az+nz, bx+nx,yb,bz+nz, bx-nx,yb,bz-nz, ax+nx,ya,az+nz, bx-nx,yb,bz-nz, ax-nx,ya,az-nz);};
  const segs=new Set();for(const rt of G.roads)for(let s=1;s<rt.p.length;s++){const a=rt.p[s-1],b=rt.p[s];const id=a<b?a+'-'+b:b+'-'+a;if(segs.has(id))continue;segs.add(id);
    const [ax,az]=v3x(kr(a),kc(a)),[bx,bz]=v3x(kr(b),kc(b));quad(ax,az,bx,bz,v3Ground(kr(a),kc(a))+.012,v3Ground(kr(b),kc(b))+.012,.13);}
  if(P.length){const rg=new T.BufferGeometry();rg.setAttribute('position',new T.Float32BufferAttribute(P,3));rg.computeVertexNormals();const rm=new T.Mesh(rg,M.road);rm.receiveShadow=true;rm.renderOrder=1;M.road.polygonOffset=true;M.road.polygonOffsetFactor=-2;g.add(rm);}
  // 격자선
  const L=[];for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const [x,z]=v3x(r,c);const y=v3Ground(r,c)+.02;for(let s=0;s<6;s++){const a1=Math.PI/180*(60*s-90),a2=Math.PI/180*(60*s-30);L.push(x+Math.cos(a1),y,z+Math.sin(a1),x+Math.cos(a2),y,z+Math.sin(a2));}}
  const lg=new T.BufferGeometry();lg.setAttribute('position',new T.Float32BufferAttribute(L,3));V3.grid=new T.LineSegments(lg,new T.LineBasicMaterial({color:'#ffffff',transparent:true,opacity:.16}));g.add(V3.grid);}
function v3Clear(g){for(const o of [...g.children]){g.remove(o);o.traverse(x=>{if(x.geometry&&!x.userData.shared)x.geometry.dispose();});}}
function v3TerrColors(vs){const T=V3.T,im=V3.terr;if(!im)return;const col=new T.Color(),tint=new T.Color();let terrO=null;try{terrO=terr();}catch(e){}let i=0;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const x=G.map[r][c],k=key(r,c);col.set(V3COL[x.t]||'#777');const j=(v3Hash(k,1)-.5)*.08;col.offsetHSL(0,0,j);
    const o=terrO?terrO[r][c]:null;if(o!=null&&x.t!=='sea'){tint.set(MAPCOL[o]);col.lerp(tint,.16);}
    if(x.ruin)col.multiplyScalar(1-x.ruin*.13);if(vs&&!vs.has(k))col.multiplyScalar(.38);im.setColorAt(i++,col);}
  if(im.instanceColor)im.instanceColor.needsUpdate=true;}

/* ---------- 시가지 건물 ---------- */
function v3BuildCity(){const T=V3.T,g=V3.G.city;v3Clear(g);const W1=[],U1=[],C1=[],R1=[],RC=[],wt=[],rt=[],rub=[];const col=new T.Color();
  const box=(cx,cz,y0,w,d,h,rot,k,shade,u0,v0)=>{const cs=Math.cos(rot),sn=Math.sin(rot);const p=(a,b)=>[cx+a*cs-b*sn,cz+a*sn+b*cs];
    const c4=[p(-w/2,-d/2),p(w/2,-d/2),p(w/2,d/2),p(-w/2,d/2)];const y1=y0+h;const lens=[w,d,w,d];
    for(let s=0;s<4;s++){const [ax,az]=c4[s],[bx,bz]=c4[(s+1)%4];const U=lens[s]/.09/8,V=h/.1/8;
      W1.push(ax,y0,az,bx,y0,bz,bx,y1,bz, ax,y0,az,bx,y1,bz,ax,y1,az);U1.push(u0,v0,u0+U,v0,u0+U,v0+V, u0,v0,u0+U,v0+V,u0,v0+V);
      for(let v=0;v<6;v++)C1.push(shade.r,shade.g,shade.b);wt.push(k,k);}
    R1.push(c4[0][0],y1,c4[0][1],c4[2][0],y1,c4[2][1],c4[1][0],y1,c4[1][1], c4[0][0],y1,c4[0][1],c4[3][0],y1,c4[3][1],c4[2][0],y1,c4[2][1]);
    const rcol=shade.clone().multiplyScalar(.62);for(let v=0;v<6;v++)RC.push(rcol.r,rcol.g,rcol.b);rt.push(k,k);};
  const TONES=['#e2dccd','#cfc6b3','#b9b2a6','#d8cfbf','#a9a49a','#c7b9a0'];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const x=G.map[r][c];if(!(x.t==='urban'||x.t==='city'||x.t==='hq'))continue;const k=key(r,c);const [cx,cz]=v3x(r,c);const y0=v3Ground(r,c);
    const ruin=x.ruin||0,dev=x.dev||0;const big=x.t==='hq'?2.6:x.t==='city'?1.8:1;const surv=[1,.78,.55,.32][ruin],hm=[1,.66,.42,.22][ruin];
    const slots=[];for(let s=0;s<6;s++){const a=Math.PI/180*(30+60*s);slots.push([Math.cos(a)*.58,Math.sin(a)*.58,a]);}
    if(x.t!=='urban')for(let s=0;s<6;s++){const a=Math.PI/180*(60*s);if(v3Hash(k,90+s)<.5)slots.push([Math.cos(a)*.86,Math.sin(a)*.86,a]);}
    slots.forEach(([ox,oz,a],s)=>{const hsh=v3Hash(k,100+s);if(hsh>surv)return;const w=.24+v3Hash(k,110+s)*.16,d=.24+v3Hash(k,120+s)*.14;
      let h=(.22+Math.pow(v3Hash(k,130+s),2)*.9)*big*(1+dev*.22);if(x.t==='hq'&&s===0)h=3.4*(1+dev*.15);h*=hm;if(ruin)h*=.7+v3Hash(k,140+s+ruin)*.5;
      col.set(TONES[Math.floor(v3Hash(k,150+s)*TONES.length)]);if(ruin)col.multiplyScalar(1-ruin*.17);
      box(cx+ox,cz+oz,y0,w,d,Math.max(.06,h),a+(v3Hash(k,160+s)-.5)*.25,k,col,v3Hash(k,170+s)*8,Math.floor(v3Hash(k,180+s)*8));});
    for(let i=0;i<ruin*5;i++){const a=v3Hash(k,200+i)*6.283,rr=.15+v3Hash(k,210+i)*.6;rub.push([cx+Math.cos(a)*rr,y0,cz+Math.sin(a)*rr,.12+v3Hash(k,220+i)*.16,v3Hash(k,230+i)*3,k]);}}
  const mk=(P,UV,C,mat,tri)=>{if(!P.length)return;const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(P,3));if(UV)geo.setAttribute('uv',new T.Float32BufferAttribute(UV,2));
    geo.setAttribute('color',new T.Float32BufferAttribute(C,3));geo.computeVertexNormals();const m=new T.Mesh(geo,mat);m.castShadow=m.receiveShadow=true;m.userData.tri=tri;g.add(m);};
  mk(W1,U1,C1,V3.M.wall,wt);mk(R1,null,RC,V3.M.roof,rt);
  if(rub.length){const T2=V3.T;const geo=new T2.DodecahedronGeometry(1,0);const im=new T2.InstancedMesh(geo,V3.M.rubble,rub.length);im.castShadow=im.receiveShadow=true;const m4=new T2.Matrix4(),q=new T2.Quaternion(),s=new T2.Vector3(),p=new T2.Vector3();
    rub.forEach(([x,y,z,sz,rot],i)=>{p.set(x,y,z);q.setFromEuler(new T2.Euler(rot,rot*2,0));s.set(sz,sz*.45,sz);m4.compose(p,q,s);im.setMatrixAt(i,m4);});im.userData.keys=rub.map(r=>r[5]);g.add(im);}}

/* ---------- 거점·시설 ---------- */
function v3BuildSites(){const T=V3.T,g=V3.G.sites;v3Clear(g);const M=V3.M;
  const add=(geo,mat,x,y,z,ry)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);if(ry)m.rotation.y=ry;m.castShadow=m.receiveShadow=true;g.add(m);return m;};
  const nat=n=>V3.natMat(n);
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const x=G.map[r][c];const [cx,cz]=v3x(r,c);const y=v3Ground(r,c);const k=key(r,c);
    if(SITES.includes(x.t)){const fx=cx+(x.t==='hq'||x.t==='city'?.32:.45),fz=cz-(x.t==='hq'||x.t==='city'?.12:.35);const ph=x.t==='hq'?1.6:1.1;
      add(new T.CylinderGeometry(.018,.018,ph,5),M.steel,fx,y+ph/2,fz);const fl=add(new T.BoxGeometry(.34,.2,.01),nat(x.owner),fx+.17,y+ph-.11,fz);fl.castShadow=false;}
    if(x.t==='oil'){add(new T.CylinderGeometry(.04,.16,.75,4),M.steel,cx-.1,y+.37,cz+.05);add(new T.CylinderGeometry(.22,.22,.2,10),M.conc,cx+.25,y+.1,cz+.2);add(new T.CylinderGeometry(.16,.16,.16,10),M.conc,cx-.3,y+.08,cz+.3);}
    if(x.t==='mine'){add(new T.CylinderGeometry(.42,.3,.06,8),M.dark,cx,y+.02,cz);add(new T.BoxGeometry(.5,.08,.1),M.steel,cx+.25,y+.25,cz,.4);add(new T.BoxGeometry(.22,.22,.22),M.conc,cx+.5,y+.11,cz-.1);}
    if(x.rig){add(new T.BoxGeometry(.7,.08,.6),M.steel,cx,.35,cz);for(const [a,b] of [[-.3,-.25],[.3,-.25],[-.3,.25],[.3,.25]])add(new T.CylinderGeometry(.03,.03,.5,4),M.steel,cx+a,.1,cz+b);add(new T.CylinderGeometry(.03,.07,.5,4),M.steel,cx+.2,.62,cz);}
    if(x.bld){const b=x.bld,t=b.type;const om=nat(x.owner);
      if(t==='airfield'&&b.rw!=null){const [rx,rz]=v3x(kr(b.rw),kc(b.rw));const dx=rx-cx,dz=rz-cz,L=Math.hypot(dx,dz);const rw=add(new T.BoxGeometry(L+1.4,.03,.42),M.dark,(cx+rx)/2,y+.02,(cz+rz)/2,-Math.atan2(dz,dx));rw.castShadow=false;
        add(new T.BoxGeometry(.4,.22,.3),M.conc,cx-dz/L*.45,y+.11,cz+dx/L*.45);}
      else if(t==='hangar'){const hg=new T.CylinderGeometry(.32,.32,.6,12,1,false,0,Math.PI);hg.rotateZ(Math.PI/2);add(hg,M.conc,cx,y,cz);}
      else if(t==='port'||t==='shipyard'){add(new T.BoxGeometry(.75,.12,.3),M.conc,cx,y+.06,cz);add(new T.BoxGeometry(.06,.7,.06),om,cx+.3,y+.35,cz);add(new T.BoxGeometry(.4,.05,.05),om,cx+.15,y+.68,cz);}
      else if(t==='radar'){add(new T.CylinderGeometry(.05,.08,.5,6),M.steel,cx,y+.25,cz);const dish=add(new T.SphereGeometry(.22,10,6,0,Math.PI*2,0,Math.PI/2.4),om,cx,y+.55,cz);dish.rotation.x=1.1;dish.userData.spin=1;}
      else{add(new T.BoxGeometry(.6,.28,.46),M.conc,cx,y+.14,cz);add(new T.BoxGeometry(.62,.05,.48),om,cx,y+.3,cz);}
      if(b.left){g.children[g.children.length-1].material=M.dark;}}
    if(x.fort){const f=x.fort;const om=nat(f.o);
      if(f.t==='fence'){for(let i=-2;i<=2;i++)add(new T.BoxGeometry(.03,.16,.03),M.steel,cx+i*.18,y+.08,cz+.55);add(new T.BoxGeometry(.75,.02,.02),om,cx,y+.14,cz+.55);}
      else if(f.t==='bunker'){add(new T.SphereGeometry(.25,10,6,0,Math.PI*2,0,Math.PI/2),M.conc,cx-.35,y,cz+.35);add(new T.BoxGeometry(.2,.03,.02),M.dark,cx-.35,y+.15,cz+.12);}
      else if(f.t==='mines'&&f.o===G.viewer){for(let i=0;i<5;i++)add(new T.CylinderGeometry(.04,.04,.02,6),om,cx+(v3Hash(k,300+i)-.5)*.8,y+.01,cz+(v3Hash(k,310+i)-.5)*.8);}}}}

/* ---------- 부대 모형 ---------- */
V3.natMat=n=>{const c=V3.matc||(V3.matc=new Map());const id='n'+n;if(!c.has(id)){const col=new V3.T.Color(n==null?'#8b9294':MAPCOL[n]);c.set(id,new V3.T.MeshStandardMaterial({color:col,roughness:.6,emissive:col,emissiveIntensity:.18}));}return c.get(id);};
function v3BodyMat(n,done){const c=V3.matc||(V3.matc=new Map());const id='b'+n+(done?'d':'');if(!c.has(id)){const T=V3.T;const col=new T.Color('#565a45').lerp(new T.Color(MAPCOL[n]),.42);if(done)col.multiplyScalar(.5);c.set(id,new T.MeshStandardMaterial({color:col,roughness:.75,metalness:.15,flatShading:true}));}return c.get(id);}
function v3Model(u){const T=V3.T,t=UT[u.type];const g=new T.Group();const body=v3BodyMat(u.nat,false);const M=V3.M;
  const B=(w,h,d,x,y,z,mat)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat||body);m.position.set(x,y,z);m.castShadow=true;g.add(m);return m;};
  const Cy=(r1,r2,h,x,y,z,rz,mat,seg)=>{const m=new T.Mesh(new T.CylinderGeometry(r1,r2,h,seg||8),mat||body);m.position.set(x,y,z);if(rz)m.rotation.z=rz;m.castShadow=true;g.add(m);return m;};
  const cls=t.cls,ty=u.type;
  if(cls==='inf'){for(const [ox,oz] of [[-.1,-.1],[.12,0],[-.08,.12]]){Cy(.05,.06,.2,ox,.1,oz);const hd=new T.Mesh(new T.SphereGeometry(.05,8,6),body);hd.position.set(ox,.25,oz);hd.castShadow=true;g.add(hd);
      if(ty==='at')Cy(.025,.025,.24,ox+.04,.22,oz,Math.PI/2,M.steel);}
    if(ty==='spec')g.scale.setScalar(.95);}
  else if(t.d==='land'){const tank=cls==='armor';B(.46,tank?.13:.12,.28,0,tank?.11:.12,0);
    if(tank){Cy(.03,.03,.46,0,.06,.15,Math.PI/2,M.dark);Cy(.03,.03,.46,0,.06,-.15,Math.PI/2,M.dark);}
    else{for(const [a,b] of [[-.15,.15],[.15,.15],[-.15,-.15],[.15,-.15]]){const w=Cy(.06,.06,.04,a,.06,b,0,M.dark);w.rotation.x=Math.PI/2;}}
    if(ty==='tank'||ty==='ifv'){B(.2,.08,.18,-.02,.22,0);Cy(.018,.018,ty==='tank'?.36:.2,ty==='tank'?.22:.14,.23,0,Math.PI/2,M.steel);}
    else if(ty==='art'){B(.22,.12,.22,-.06,.24,0);const br=Cy(.025,.025,.48,.2,.36,0,Math.PI/2-.45,M.steel);}
    else if(ty==='mlrs'||ty==='tel'||ty==='sam'||ty==='lrsam'){const rk=B(ty==='tel'?.5:.3,.1,.2,-.04,.25,0,M.steel);rk.rotation.z=ty==='tel'?.15:.45;}
    else if(ty==='aa'){B(.18,.1,.18,-.04,.22,0);Cy(.012,.012,.3,.1,.32,.04,Math.PI/2-.7,M.steel);Cy(.012,.012,.3,.1,.32,-.04,Math.PI/2-.7,M.steel);}
    else{B(.16,.12,.22,.13,.24,0);}}
  else if(t.d==='sea'){const L=ty==='cv'?.95:ty==='bb'?.85:ty==='pb'?.42:.7;const W2=ty==='cv'?.26:.17;
    const hull=new T.Shape();hull.moveTo(-L/2,-W2/2);hull.lineTo(L/2-.12,-W2/2);hull.lineTo(L/2,0);hull.lineTo(L/2-.12,W2/2);hull.lineTo(-L/2,W2/2);hull.closePath();
    const hg=new T.ExtrudeGeometry(hull,{depth:.1,bevelEnabled:false});hg.rotateX(Math.PI/2);hg.translate(0,.1,0);const hm=new T.Mesh(hg,body);hm.castShadow=true;g.add(hm);
    if(ty==='sub'){hm.scale.y=.4;B(.1,.12,.06,0,.08,0);}
    else if(ty==='cv'){B(.9,.02,.3,0,.11,0,M.dark);B(.12,.16,.06,.1,.2,-.1);}
    else{B(L*.28,.12,W2*.6,-.04,.16,0);if(ty!=='lst'&&ty!=='aor')Cy(.015,.015,.2,L*.25,.13,0,Math.PI/2,M.steel);if(ty==='bb')Cy(.02,.02,.24,-L*.3,.13,0,Math.PI/2,M.steel);}}
  else{const jet=cls==='jet';
    if(jet){const f=Cy(.045,.03,.6,0,0,0,Math.PI/2);const wg=new T.Shape();wg.moveTo(.08,0);wg.lineTo(-.14,.3);wg.lineTo(-.2,.3);wg.lineTo(-.12,0);wg.lineTo(-.2,-.3);wg.lineTo(-.14,-.3);wg.closePath();
      const geo=new T.ExtrudeGeometry(wg,{depth:.015,bevelEnabled:false});geo.rotateX(Math.PI/2);const wm=new T.Mesh(geo,body);wm.castShadow=true;g.add(wm);B(.08,.12,.01,-.24,.06,0);
      if(ty==='awacs'){const d=Cy(.14,.14,.03,-.05,.1,0,0,M.steel,14);}}
    else{const bd=new T.Mesh(new T.SphereGeometry(.12,10,8),body);bd.scale.set(1.6,.8,.8);bd.castShadow=true;g.add(bd);Cy(.02,.012,.34,-.28,.02,0,Math.PI/2);
      const rot=new T.Mesh(new T.BoxGeometry(.7,.01,.04),M.dark);rot.position.y=.12;rot.userData.rotor=1;g.add(rot);const r2=rot.clone();r2.rotation.y=Math.PI/2;r2.userData.rotor=1;g.add(r2);}}
  // 세력 표시 고리와 선택 고리
  const ring=new T.Mesh(new T.RingGeometry(.36,.44,24),V3.natMat(u.nat));ring.rotation.x=-Math.PI/2;ring.userData.ring=1;
  const sel=new T.Mesh(new T.RingGeometry(.48,.54,32),new T.MeshBasicMaterial({color:'#f2efe6',transparent:true,opacity:.9,depthTest:false}));sel.rotation.x=-Math.PI/2;sel.visible=false;sel.renderOrder=5;
  const root=new T.Group();root.add(g);root.add(ring);root.add(sel);root.userData={k:null,body:g,ring,sel,air:t.d==='air',jet:cls==='jet'};
  if(t.d==='air'){const sh=new T.Mesh(new T.CircleGeometry(.22,16),new T.MeshBasicMaterial({color:'#000',transparent:true,opacity:.28,depthWrite:false}));sh.rotation.x=-Math.PI/2;sh.userData.shadow=1;root.add(sh);root.userData.shadow=sh;}
  return root;}
function v3UnitY(u){const t=UT[u.type];const g=v3Ground(u.r,u.c);if(t.d==='sea')return -.12;return Math.max(-.12,g)+(t.d==='air'?(t.cls==='jet'?2.1:1.2):0);}
function v3SyncUnits(vs,vn){const T=V3.T,keep=new Set();const tri=new T.Vector3();
  for(const u of G.units){if(vs&&!seen(u,vn,vs))continue;keep.add(u.id);let o=V3.uo.get(u.id);const done=!!(u.done&&u.nat===G.cur);
    if(!o||o.userData.type!==u.type||o.userData.nat!==u.nat){if(o){V3.G.units.remove(o);}o=v3Model(u);o.userData.type=u.type;o.userData.nat=u.nat;const [x,z]=v3x(u.r,u.c);o.position.set(x,v3UnitY(u),z);V3.G.units.add(o);V3.uo.set(u.id,o);}
    const [x,z]=v3x(u.r,u.c);o.userData.k=key(u.r,u.c);o.userData.to=[x,v3UnitY(u),z];o.userData.u=u;
    const ry=-(u.face||0)*Math.PI/180;o.userData.body.rotation.y=ry;
    if(o.userData.done!==done){o.userData.done=done;const m=v3BodyMat(u.nat,done);o.userData.body.traverse(x=>{if(x.isMesh&&x.material!==V3.M.steel&&x.material!==V3.M.dark)x.material=m;});}
    o.userData.sel.visible=u===UI.sel;o.userData.ring.position.y=(o.userData.air?-o.userData.to[1]+v3Ground(u.r,u.c)+.03:.03);
    if(o.userData.shadow)o.userData.shadow.position.y=o.userData.ring.position.y-.005;}
  for(const [id,o] of V3.uo)if(!keep.has(id)){V3.G.units.remove(o);V3.uo.delete(id);}}

/* ---------- 강조 표시 ---------- */
function v3SyncHl(){const T=V3.T,g=V3.G.hl;v3Clear(g);const items=[];const add=(k,col)=>items.push([k,col]);
  if(UI.reach)for(const k of UI.reach.keys())add(k,FX.move);for(const k of UI.loads||[])add(k,FX.move);for(const k of UI.unloads||[])add(k,FX.ok);
  if(UI.phase==='msl'&&UI.mt!=null){for(const [a,b] of strikeHexes(kr(UI.mt),kc(UI.mt),UI.sp??1))add(key(a,b),FX.hit);}
  for(const k of UI.targets||[])add(k,FX.hit);if(UI.fc!=null)add(UI.fc,'#ff2a1a');if(UI.pane)add(key(UI.pane.r,UI.pane.c),FX.ink);
  if(G.hint&&G.cur===G.viewer)add(G.hint.t,FX.hit);
  const L=[],LC=[];const c=new T.Color();
  if(items.length){const geo=new T.CylinderGeometry(.9,.9,.02,6);const im=new T.InstancedMesh(geo,V3.M.hl,items.length);im.renderOrder=3;const m4=new T.Matrix4();
    items.forEach(([k,col],i)=>{const r=kr(k),cc=kc(k);const [x,z]=v3x(r,cc);m4.makeTranslation(x,v3Ground(r,cc)+.05,z);im.setMatrixAt(i,m4);im.setColorAt(i,c.set(col));
      const y=v3Ground(r,cc)+.06;for(let s=0;s<6;s++){const a1=Math.PI/180*(60*s-90),a2=Math.PI/180*(60*s-30);L.push(x+Math.cos(a1)*.9,y,z+Math.sin(a1)*.9,x+Math.cos(a2)*.9,y,z+Math.sin(a2)*.9);for(let v=0;v<2;v++)LC.push(c.r,c.g,c.b);}});
    g.add(im);}
  const seg=(r1,c1,r2,c2,col,h)=>{const [x1,z1]=v3x(r1,c1),[x2,z2]=v3x(r2,c2);c.set(col);const y1=v3Ground(r1,c1)+(h||.25),y2=v3Ground(r2,c2)+(h||.25);const n=12;
    for(let i=0;i<n;i++){if(i%2)continue;const t1=i/n,t2=(i+1)/n;const arc=t=>Math.sin(t*Math.PI)*.5;L.push(x1+(x2-x1)*t1,y1+(y2-y1)*t1+arc(t1),z1+(z2-z1)*t1,x1+(x2-x1)*t2,y1+(y2-y1)*t2+arc(t2),z1+(z2-z1)*t2);LC.push(c.r,c.g,c.b,c.r,c.g,c.b);}};
  for(const u of G.units){if(u.nat!==G.viewer||!u.order||u.order.t!=='goto')continue;seg(u.r,u.c,u.order.r,u.order.c,MAPCOL[G.viewer]);}
  if(G.hint&&G.cur===G.viewer){const a=G.units.find(u=>u.id===G.hint.u);if(a)seg(a.r,a.c,kr(G.hint.t),kc(G.hint.t),FX.hit,.4);}
  // 이동 경로 미리보기
  const s=UI.sel,k=UI.hk;if(s&&UI.phase==='select'&&UI.reach&&k!=null&&UI.reach.has(k)&&k!==key(s.r,s.c)){const pts=[];let q=k,guard=0;while(q!=null&&guard++<60){pts.push(q);if(q===key(s.r,s.c))break;q=UI.reach.prev.get(q);}
    c.set('#f2efe6');for(let i=1;i<pts.length;i++){const [x1,z1]=v3x(kr(pts[i-1]),kc(pts[i-1])),[x2,z2]=v3x(kr(pts[i]),kc(pts[i]));L.push(x1,v3Ground(kr(pts[i-1]),kc(pts[i-1]))+.15,z1,x2,v3Ground(kr(pts[i]),kc(pts[i]))+.15,z2);LC.push(c.r,c.g,c.b,c.r,c.g,c.b);}}
  if(L.length){const lg=new T.BufferGeometry();lg.setAttribute('position',new T.Float32BufferAttribute(L,3));lg.setAttribute('color',new T.Float32BufferAttribute(LC,3));const ls=new T.LineSegments(lg,V3.M.line);ls.renderOrder=4;g.add(ls);}
  // 선택 부대 사거리
  if(s){const hi=rngU(s)[1];if(hi>1){const rg=new T.RingGeometry((hi+.5)*S3-.04,(hi+.5)*S3+.04,64);const m=new T.Mesh(rg,new T.MeshBasicMaterial({color:FX.hit,transparent:true,opacity:.5,depthTest:false}));m.rotation.x=-Math.PI/2;const [x,z]=v3x(s.r,s.c);m.position.set(x,v3Ground(s.r,s.c)+.07,z);m.renderOrder=3;g.add(m);}}}

/* ---------- 시간·날씨 ---------- */
function v3Light(){const h=hourOf(),night=isNight(),dusk=(h===6||h===18);const s=V3;const wx=G.wx||'clear';
  const P=night?{sun:'#7f95c9',si:.45,sky:'#2a3754',gr:'#141210',hi:.4,fog:'#0d131b',em:1.25,bg:'#0b1017'}:dusk?{sun:'#ff9a5a',si:1.7,sky:'#d6a07a',gr:'#3f3226',hi:.55,fog:'#6f5a50',em:.55,bg:'#5d4a44'}:{sun:'#fff0d8',si:2.3,sky:'#c8d6e3',gr:'#54493a',hi:.85,fog:'#9a958a',em:0,bg:'#8d8a82'};
  s.sun.color.set(P.sun);s.sun.intensity=P.si*(wx==='clear'?1:.55);s.hemi.color.set(P.sky);s.hemi.groundColor.set(P.gr);s.hemi.intensity=P.hi;s.M.wall.emissiveIntensity=P.em;
  const fogC=new V3.T.Color(P.fog);if(wx==='rain'||wx==='storm')fogC.lerp(new V3.T.Color('#4a525a'),.5);s.scene.fog.color.copy(fogC);s.scene.background=fogC.clone();
  const fd=wx==='fog'?.45:wx==='storm'?.7:1;s.fogK=fd;s.sunAng=dusk?(h===6?-1:1):night?.4:(h-12)/8;s.rain=(wx==='rain'||wx==='storm')?(wx==='storm'?1.6:1):0;}

/* ---------- 연기·불 ---------- */
function v3SyncSmoke(){const T=V3.T,g=V3.G.amb;for(const sp of V3.smoke)g.remove(sp.o);V3.smoke=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const x=G.map[r][c];if(!x.ruin)continue;const [cx,cz]=v3x(r,c);const y=v3Ground(r,c);const k=key(r,c);
    for(let i=0;i<x.ruin*2&&V3.smoke.length<260;i++){const o=new T.Sprite(V3.M.smoke.clone());const ph=v3Hash(k,400+i);V3.smoke.push({o,x:cx+(v3Hash(k,410+i)-.5)*.9,z:cz+(v3Hash(k,420+i)-.5)*.9,y,ph,sp:.6+x.ruin*.25,fire:false});g.add(o);}
    if(x.ruin>=2){const o=new T.Sprite(V3.M.fire.clone());V3.smoke.push({o,x:cx+(v3Hash(k,430)-.5)*.5,z:cz+(v3Hash(k,431)-.5)*.5,y,ph:v3Hash(k,432),fire:true});g.add(o);}}
  // 최근 격파 흔적
  if(V3.scorch)g.remove(V3.scorch);const sc=(G.scorch||[]).filter(s=>G.turn-s.t<=6);if(sc.length){const im=new T.InstancedMesh(new T.CircleGeometry(.45,14),new T.MeshBasicMaterial({color:'#15110d',transparent:true,opacity:.55,depthWrite:false}),sc.length);const m4=new T.Matrix4(),q=new T.Quaternion().setFromEuler(new T.Euler(-Math.PI/2,0,0)),s=new T.Vector3(1,1,1),p=new T.Vector3();
    sc.forEach((o,i)=>{const [x,z]=v3x(o.r,o.c);p.set(x,v3Ground(o.r,o.c)+.035,z);m4.compose(p,q,s);im.setMatrixAt(i,m4);});im.renderOrder=2;g.add(im);V3.scorch=im;}else V3.scorch=null;
  if(V3.rainObj){g.remove(V3.rainObj);V3.rainObj=null;}
  if(V3.rain){const n=1400,P=new Float32Array(n*6);for(let i=0;i<n;i++){const x=(Math.random()-.5)*40,y=Math.random()*14,z=(Math.random()-.5)*40;P.set([x,y,z,x-.05,y-.45,z],i*6);}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(P,3));V3.rainObj=new T.LineSegments(geo,new T.LineBasicMaterial({color:'#9fb0bf',transparent:true,opacity:.35,depthWrite:false}));g.add(V3.rainObj);}}

/* ---------- 이름표 (HTML) ---------- */
function v3SyncLabels(vs,vn){const lab=$('#v3d-lab');const want=new Map();const NMS=names();
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const x=G.map[r][c];if(x.t!=='city'&&x.t!=='hq')continue;const k=key(r,c);const nm=(NMS.city[k]||'')+(x.dev?' '+'▮'.repeat(x.dev):'')+(x.ruin?` · 파괴 ${x.ruin}/3`:'');
    const [px0,pz]=v3x(r,c);want.set('c'+k,{html:`<span>${x.t==='hq'?'★ ':''}${nm}</span>`,cls:'v3c',col:mapCol(x.owner),p:[px0,v3Ground(r,c)+.02,pz+.95]});}
  for(const u of G.units){if(vs&&!seen(u,vn,vs))continue;const t=UT[u.type];const low=(t.fuel&&u.fuel<=t.fuel*.25)||(t.ammo&&u.ammo===0);if(u.hp>=10&&!u.rank&&!low&&!u.cargo&&!u.dug)continue;
    const hc=u.hp>6?'#5cd18a':u.hp>3?'#f0b23a':'#ff5a4e';const [x,z]=v3x(u.r,u.c);
    want.set('u'+u.id,{html:`${u.rank?`<b>${'^'.repeat(u.rank)}</b>`:''}${u.hp<10?`<i><s style="width:${u.hp*10}%;background:${hc}"></s></i>`:''}${low?'<em>!</em>':''}${u.cargo?`<u>${UT[u.cargo.type].n[0]}</u>`:''}${u.dug?'<u>참호</u>':''}`,cls:'v3u',col:mapCol(u.nat),p:[x,v3UnitY(u)+.55,z],uid:u.id});}
  for(const [id,o] of V3.labels)if(!want.has(id)){o.el.remove();V3.labels.delete(id);}
  for(const [id,w] of want){let o=V3.labels.get(id);if(!o){const el=document.createElement('div');el.className='v3l '+w.cls;lab.appendChild(el);o={el};V3.labels.set(id,o);}
    if(o.html!==w.html){o.el.innerHTML=w.html;o.html=w.html;}o.el.style.setProperty('--c',w.col);o.p=w.p;o.uid=w.uid;}}
function v3PlaceLabels(){const T=V3.T,v=V3.tmpV||(V3.tmpV=new T.Vector3());const w=V3.cv.clientWidth,h=V3.cv.clientHeight;
  for(const o of V3.labels.values()){let p=o.p;if(o.uid!=null){const uo=V3.uo.get(o.uid);if(uo)p=[uo.position.x,uo.position.y+.55,uo.position.z];}
    v.set(p[0],p[1],p[2]).project(V3.cam);if(v.z>1||v.x<-1.1||v.x>1.1||v.y<-1.1||v.y>1.1){o.el.style.display='none';continue;}o.el.style.display='';
    o.el.style.transform=`translate(${((v.x+1)/2*w).toFixed(1)}px,${((1-v.y)/2*h).toFixed(1)}px) translate(-50%,-50%)`;}}

/* ---------- 동기화 (render 때마다) ---------- */
function v3Sync(){if(!V3.on||!V3.ren||!G)return;const vn=G.viewer,vs=G.fog?visSet(vn):null;
  const tag=G.seed+'|'+ROWS+'x'+COLS+'|'+G.map.map(row=>row.map(x=>x.t[0]+(x.t==='mountain'?'':'')).join('')).join('');
  if(V3.tag!==tag){V3.tag=tag;V3.ctag=null;V3.stag=null;v3BuildWorld();const [bw,bh]=v3Bounds();if(!V3.cs.set){V3.cs.x=V3.cs.gx=bw/2;V3.cs.z=V3.cs.gz=bh/2;}V3.uo.forEach(o=>V3.G.units.remove(o));V3.uo.clear();}
  const ctag=G.map.map(row=>row.map(x=>(x.ruin||0)+''+(x.dev||0)).join('')).join('');if(V3.ctag!==ctag+tag){V3.ctag=ctag+tag;v3BuildCity();}
  const stag=JSON.stringify(G.map.map(row=>row.map(x=>[x.owner,x.bld&&[x.bld.type,x.bld.left,x.bld.rw],x.fort&&[x.fort.t,x.fort.o],x.rig?1:0])))+vn;if(V3.stag!==stag){V3.stag=stag;v3BuildSites();}
  const smk=ctag+'|'+(G.wx||'')+'|'+(G.scorch||[]).filter(s=>G.turn-s.t<=6).length+'|'+G.turn;
  v3Light();if(V3.smk!==smk){V3.smk=smk;v3SyncSmoke();}
  v3TerrColors(vs);V3.grid.visible=!!UI.grid;v3SyncUnits(vs,vn);v3SyncHl();v3SyncLabels(vs,vn);}

/* ---------- 연출 ---------- */
function v3FxFire(a,d){if(!V3.on||!V3.ren)return;const T=V3.T;const [x1,z1]=v3x(a.r,a.c),[x2,z2]=v3x(d.r,d.c);const y1=v3UnitY(a)+.2,y2=v3UnitY(d)+.15;const dd=dist(a.r,a.c,d.r,d.c);const far=dd>1||UT[a.type].ind;
  const n=far&&['art','bb','mlrs'].includes(a.type)?3:1;
  for(let i=0;i<n;i++){const o=(i-(n-1)/2)*.18;const shell=new T.Sprite(new T.SpriteMaterial({map:V3.puff,color:'#ffd27a',blending:T.AdditiveBlending,transparent:true,depthWrite:false}));shell.scale.setScalar(far?.22:.14);V3.G.fx.add(shell);
    V3.fx.push({o:shell,t0:performance.now()+i*110,dur:far?520:160,upd:(sh,k)=>{const x=x1+(x2+o-x1)*k,z=z1+(z2+o-z1)*k;const y=y1+(y2-y1)*k+(far?Math.sin(k*Math.PI)*(1.2+dd*.5):0);sh.position.set(x,y,z);}});}
  v3Burst(x1+(x2-x1)*.08,y1,z1+(z2-z1)*.08,.25,'#ffcc66',0,1);
  setTimeout(()=>{v3Burst(x2,y2,z2,.55,'#ff8a3d',2,1.6);V3.shake=Math.max(V3.shake,.04);},far?560:170);}
function v3FxKill(u){if(!V3.on||!V3.ren)return;const [x,z]=v3x(u.r,u.c);const y=v3UnitY(u)+.1;
  setTimeout(()=>{v3Burst(x,y,z,1.3,'#ff7a2a',7,4);V3.shake=Math.max(V3.shake,.14);},450);}
function v3Burst(x,y,z,size,col,smoke,light){const T=V3.T;const f=new T.Sprite(new T.SpriteMaterial({map:V3.puff,color:col,blending:T.AdditiveBlending,transparent:true,depthWrite:false}));f.position.set(x,y,z);V3.G.fx.add(f);
  V3.fx.push({o:f,t0:performance.now(),dur:450,upd:(o,k)=>{o.scale.setScalar(size*(.4+k*1.2));o.material.opacity=1-k;}});
  if(light){V3.flash.position.set(x,y+.6,z);V3.flash.intensity=light*6;V3.flashT=performance.now();}
  for(let i=0;i<smoke;i++){const s=new T.Sprite(new T.SpriteMaterial({map:V3.puff,color:'#4a4540',transparent:true,depthWrite:false,opacity:0}));const ox=(Math.random()-.5)*size*.6,oz=(Math.random()-.5)*size*.6,vy=.5+Math.random()*.7;s.position.set(x,y,z);V3.G.fx.add(s);
    V3.fx.push({o:s,t0:performance.now()+i*90,dur:2200,upd:(o,k)=>{o.position.set(x+ox*(1+k),y+vy*k*1.6,z+oz*(1+k));o.scale.setScalar(size*.5*(.5+k*1.6));o.material.opacity=.7*(1-k);}});}
  if(smoke>=5)for(let i=0;i<10;i++){const T2=V3.T;const d=new T2.Mesh(new T2.BoxGeometry(.05,.05,.05),V3.M.dark);d.position.set(x,y,z);const vx=(Math.random()-.5)*2.2,vz=(Math.random()-.5)*2.2,vy=1.5+Math.random()*1.5;V3.G.fx.add(d);
    V3.fx.push({o:d,t0:performance.now(),dur:900,upd:(o,k)=>{const t=k*.9;o.position.set(x+vx*t,Math.max(y-.1,y+vy*t-4.9*t*t),z+vz*t);o.rotation.x+=.2;}});}}

/* ---------- 매 프레임 ---------- */
function v3Frame(now){if(!V3.on)return;requestAnimationFrame(v3Frame);const dt=Math.min(.05,(now-(V3.last||now))/1000);V3.last=now;const s=V3.cs,T=V3.T;
  const k=1-Math.exp(-dt*7);s.x+=(s.gx-s.x)*k;s.z+=(s.gz-s.z)*k;s.d+=(s.gd-s.d)*k;s.yaw+=(s.gyaw-s.yaw)*k;
  const cp=Math.cos(s.pitch);let sx=0,sz=0;if(V3.shake>0){sx=(Math.random()-.5)*V3.shake;sz=(Math.random()-.5)*V3.shake;V3.shake*=Math.exp(-dt*9);if(V3.shake<.003)V3.shake=0;}
  V3.cam.position.set(s.x+Math.sin(s.yaw)*cp*s.d+sx,Math.sin(s.pitch)*s.d,s.z+Math.cos(s.yaw)*cp*s.d+sz);V3.cam.lookAt(s.x,0,s.z);
  const fogK=V3.fogK||1;V3.scene.fog.near=s.d*.9*fogK;V3.scene.fog.far=s.d*3.4*fogK+12;
  const sa=V3.sunAng||0;V3.sun.position.set(s.x-12*sa-4,18-Math.abs(sa)*6,s.z+8);V3.sun.target.position.set(s.x,0,s.z);
  const shs=Math.min(40,Math.max(12,s.d*.9));const sc=V3.sun.shadow.camera;if(Math.abs(sc.right-shs)>.5){sc.left=-shs;sc.right=shs;sc.top=shs;sc.bottom=-shs;sc.updateProjectionMatrix();}
  // 부대 이동
  for(const o of V3.uo.values()){const to=o.userData.to;if(!to)continue;const kk=1-Math.exp(-dt*9);o.position.x+=(to[0]-o.position.x)*kk;o.position.z+=(to[2]-o.position.z)*kk;
    let ty=to[1];if(o.userData.air)ty+=Math.sin(now/600+o.id*1.7)*.05;o.position.y+=(ty-o.position.y)*kk;
    if(o.userData.air){o.userData.body.traverse(x=>{if(x.userData.rotor)x.rotation.y+=dt*28;});}
    if(o.userData.sel.visible){const p=1+Math.sin(now/220)*.06;o.userData.sel.scale.set(p,p,p);}}
  for(const o of V3.G.sites.children)if(o.userData.spin)o.rotation.z+=dt*1.2;
  // 연기
  const tt=now/1000;for(const sp of V3.smoke){if(sp.fire){const f=.75+Math.sin(tt*13+sp.ph*20)*.15+Math.sin(tt*7.3)*.1;sp.o.position.set(sp.x,sp.y+.18,sp.z);sp.o.scale.setScalar(.45*f);sp.o.material.opacity=.75*f;continue;}
    const life=(tt*.22*sp.sp+sp.ph)%1;sp.o.position.set(sp.x+life*.5,sp.y+.2+life*3.2,sp.z-life*.3);sp.o.scale.setScalar(.35+life*1.6);sp.o.material.opacity=.55*Math.sin(life*Math.PI);}
  if(V3.rainObj){V3.rainObj.position.set(s.x,0,s.z);const p=V3.rainObj.geometry.attributes.position;const a=p.array,sp=dt*16*V3.rain;for(let i=0;i<a.length;i+=6){a[i+1]-=sp;a[i+4]-=sp;if(a[i+4]<0){a[i+1]+=14;a[i+4]+=14;}}p.needsUpdate=true;}
  // 연출
  V3.fx=V3.fx.filter(f=>{const k2=(now-f.t0)/f.dur;if(k2<0){f.o.visible=false;return true;}f.o.visible=true;if(k2>=1){V3.G.fx.remove(f.o);if(f.o.material&&f.o.material!==V3.M.dark)f.o.material.dispose();return false;}f.upd(f.o,k2);return true;});
  if(V3.flash.intensity>0){const e=(now-V3.flashT)/400;V3.flash.intensity=e>=1?0:V3.flash.intensity*(1-e*.5);}
  v3PlaceLabels();V3.ren.render(V3.scene,V3.cam);
  if(G&&!(now%8<1))v3Region();}
function v3Region(){const el=$('#hud-region');if(!el||!G)return;const s=V3.cs;const h=hexAt(s.x*R,s.z*R);const t=regionAt((h/COLS)|0,h%COLS);if(el.textContent!==t)el.textContent=t;}

if(typeof document!=='undefined'){requestAnimationFrame(()=>{if(v3Pref())setV3(true);});}
