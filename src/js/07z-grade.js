/* ===================== 3D: 화면 질감 (색보정·픽셀·대기 원근) =====================
   전장을 낮은 해상도의 렌더 타깃에 먼저 그린 뒤, 화면 전체에 한 번 더 그리면서
   - 깊이에 따른 옅은 대기 안개(낮은 시점일수록 멀리 있는 건물이 뿌옇게),
   - 채도를 뺀 회녹색 톤(그늘은 푸르스름한 회색, 밝은 곳은 바랜 올리브),
   - 4×4 디더링과 단계가 줄어든 색(거친 픽셀 화면)
   을 입힌다. 화면 질감은 [화면 질감] 버튼이나 P 키로 거칠게 → 보통 → 선명(끔) 순으로 바꾼다.
   외벽 무늬는 벽돌·돌 창틀로 다시 그리고, 옥상 물탱크와 길 위 잔해를 덧붙인다(규칙에는 영향 없음). */
const GRADE={lv:1,levels:[{n:'거칠게',pr:.34},{n:'보통',pr:.5},{n:'선명',pr:0}],rt:null,q:null,raw:null,key:'triad-look'};
try{if(typeof localStorage!=='undefined'){const v=+localStorage.getItem(GRADE.key);if(v>=0&&v<3&&localStorage.getItem(GRADE.key)!==null)GRADE.lv=v;}}catch(e){}
const grOn=()=>GRADE.levels[GRADE.lv].pr>0;

/* 화면 픽셀 크기: 거칠게·보통이면 CSS 픽셀보다 크게 그리고(캔버스는 image-rendering:pixelated로 늘어난다) */
if(typeof v3PixelRatio==='function'){const f=v3PixelRatio;v3PixelRatio=function(){const L=GRADE.levels[GRADE.lv];return L.pr>0?L.pr:f.apply(this,arguments);};}

function grInit(){const T=V3.T,ren=V3.ren;if(GRADE.raw||!ren)return;
  const rt=new T.WebGLRenderTarget(4,4,{type:T.HalfFloatType,minFilter:T.NearestFilter,magFilter:T.NearestFilter,depthBuffer:true});
  rt.depthTexture=new T.DepthTexture(4,4);rt.depthTexture.type=T.UnsignedIntType;
  const mat=new T.ShaderMaterial({depthTest:false,depthWrite:false,
    uniforms:{tCol:{value:rt.texture},tDep:{value:rt.depthTexture},near:{value:.1},far:{value:400},haze:{value:new T.Color()},hazeK:{value:0},hazeD:{value:30},
      res:{value:new T.Vector2(1,1)},grade:{value:1},night:{value:0}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`#include <packing>
uniform sampler2D tCol;uniform sampler2D tDep;uniform float near,far,hazeK,hazeD,grade,night;uniform vec3 haze;uniform vec2 res;varying vec2 vUv;
float b2(vec2 a){a=floor(a);return fract(a.x*.5+a.y*a.y*.75);}
float bayer(vec2 p){return b2(p*.5)*.25+b2(p)-.47;}
void main(){vec3 c=texture2D(tCol,vUv).rgb;float d=texture2D(tDep,vUv).x;
  float vz=-perspectiveDepthToViewZ(d,near,far);
  // 대기 원근: 멀수록 안개색으로. 하늘(깊이 1)은 이미 배경색이다.
  if(d<1.){float h=(1.-exp(-vz/hazeD))*hazeK;vec3 hz=mix(haze,vec3(dot(haze,vec3(.3,.59,.11)))*vec3(.9,1.,.94),.55*(1.-night));c=mix(c,hz,clamp(h,0.,.85));}
  c=toneMapping(c);c=linearToOutputTexel(vec4(c,1.)).rgb;
  if(grade>0.){float l=dot(c,vec3(.299,.587,.114));
    vec3 g=mix(vec3(l),c,mix(.6,.8,night));                              // 채도 빼기
    g*=mix(vec3(.92,.98,1.02),vec3(.99,1.01,.91),smoothstep(.15,.75,l));   // 그늘은 청회색, 빛은 바랜 올리브
    g=g*.92+.035;g=mix(g,g*g*(3.-2.*g),.25);                            // 검은색을 살짝 띄우고 대비는 부드럽게
    float L=28.;g=floor(g*L+bayer(gl_FragCoord.xy)+.5)/L;               // 4×4 디더링, 색 단계 줄이기
    vec2 v=vUv-.5;g*=1.-dot(v,v)*.35;c=g;}
  gl_FragColor=vec4(clamp(c,0.,1.),1.);}`});
  const q=new T.Mesh(new T.PlaneGeometry(2,2),mat);q.frustumCulled=false;const sc=new T.Scene();sc.add(q);
  const raw=ren.render.bind(ren);ren.info.autoReset=false;
  Object.assign(GRADE,{rt,mat,sc,cam:new T.OrthographicCamera(-1,1,1,-1,0,1),raw,v2:new T.Vector2(),dir:new T.Vector3()});
  ren.render=function(scene,cam){ren.info.reset();
    if(!grOn()||scene!==V3.scene||ren.getRenderTarget()!==null||!cam.isPerspectiveCamera)return raw(scene,cam);
    const s=ren.getDrawingBufferSize(GRADE.v2);if(rt.width!==s.x||rt.height!==s.y)rt.setSize(s.x,s.y);
    ren.setRenderTarget(rt);raw(scene,cam);ren.setRenderTarget(null);
    const U=mat.uniforms;U.near.value=cam.near;U.far.value=cam.far;U.res.value.copy(s);
    const bg=scene.background&&scene.background.isColor?scene.background:scene.fog?scene.fog.color:null;if(bg)U.haze.value.copy(bg);
    // 내려다볼수록(위에서 수직) 안개가 옅다: 지도 보기는 그대로, 낮은 시점·기자 카메라는 먼 거리가 뿌옇게
    cam.getWorldDirection(GRADE.dir);const down=-GRADE.dir.y;U.hazeK.value=Math.min(1,Math.max(0,(.8-down)/.55))*(UI&&UI.nvg?.3:.75);
    U.hazeD.value=Math.max(10,(V3.fogK||1)*26);
    U.night.value=typeof nightK==='function'&&G?nightK():0;U.grade.value=UI&&UI.nvg?0:1;
    raw(GRADE.sc,GRADE.cam);};}

function grSet(lv){GRADE.lv=(lv+3)%3;try{localStorage.setItem(GRADE.key,String(GRADE.lv));}catch(e){}
  if(typeof v3Size==='function')v3Size();const b=$('#b-look');if(b){b.setAttribute('aria-pressed',grOn()?'true':'false');b.setAttribute('aria-label',`화면 질감: ${GRADE.levels[GRADE.lv].n} (P)`);}
  if(typeof toast==='function')toast(`화면 질감: ${GRADE.levels[GRADE.lv].n}`);}
if(typeof document!=='undefined'){
  document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-act="look"]');if(b)grSet(GRADE.lv+1);});
  document.addEventListener('keydown',e=>{if(e.target.closest&&e.target.closest('input,select,textarea'))return;if((e.key==='p'||e.key==='P')&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&V3.on&&!V3.press)grSet(GRADE.lv+1);});}

/* ---------- 외벽: 벽돌과 돌 창틀 ----------
   창 자리(64px 칸, 창 34×30)는 원래 무늬와 같다: 밤 창불(emissiveMap)이 같은 자리를 쓴다. */
function grFacade(){const T=V3.T,M=V3.M;if(!M||M.wall.userData.brick)return;
  if(Array.isArray(M.walls))return;   // 건물 종류별 외벽(V3.M.walls)이 있으면 그쪽 무늬를 그대로 쓴다const fr=mulberry(17);
  const tex=v3Tex(512,512,(g,w,h)=>{
    g.fillStyle='#9b9184';g.fillRect(0,0,w,h);   // 줄눈
    // 벽돌: 한 층(64px)에 8단, 한 장 16×7, 단마다 반 장씩 어긋나게
    for(let y=0;y<h;y+=8){const off=((y/8)%2)*8;for(let x=-off;x<w;x+=16){const t=fr();const v=t<.08?-28:t>.93?16:(fr()-.5)*18;
      const r=150+v,gg=128+v*.9,b=110+v*.8;g.fillStyle=`rgb(${r|0},${gg|0},${b|0})`;g.fillRect(x+1,y+1,14,6);}}
    // 그을음·얼룩 띠(층마다 다르게)
    for(let y=0;y<8;y++){g.fillStyle=`rgba(40,36,30,${.05+fr()*.12})`;g.fillRect(0,y*64,w,64);}
    for(let y=0;y<8;y++){g.fillStyle='#b9b2a3';g.fillRect(0,y*64+59,w,5);g.fillStyle='rgba(30,26,22,.45)';g.fillRect(0,y*64+58,w,1);}   // 층 띠(돌 코니스)
    for(let y=0;y<8;y++)for(let x=0;x<8;x++){const X=x*64+15,Y=y*64+14;
      g.fillStyle='#c4bdae';g.fillRect(X-5,Y-8,44,6);              // 상인방(돌)
      g.fillStyle='#bdb6a7';g.fillRect(X-4,Y+30,42,4);g.fillStyle='rgba(20,18,15,.5)';g.fillRect(X-4,Y+34,42,2);   // 창턱과 그 아래 그늘
      g.fillStyle='#6d665b';g.fillRect(X-2,Y-2,38,32);              // 창 깊이(안쪽 벽)
      const r=fr();const gr=g.createLinearGradient(X,Y,X+20,Y+30);gr.addColorStop(0,r<.1?'#0a0b0b':'#2e353a');gr.addColorStop(1,r<.1?'#121212':'#15191c');g.fillStyle=gr;g.fillRect(X,Y,34,30);
      if(r>=.1){g.fillStyle='#8b8578';g.fillRect(X+16,Y,2,30);g.fillRect(X,Y+11,34,2);   // 창살
        if(r>.7){g.fillStyle='rgba(120,108,90,.8)';g.fillRect(X+1,Y+1,15,10);}            // 반쯤 내린 덧창
        g.fillStyle='rgba(190,200,205,.14)';g.fillRect(X+2,Y+13,13,3);}
      else if(fr()<.5){g.fillStyle='rgba(15,13,11,.6)';g.fillRect(X-6,Y-10,46,12);}}         // 깨진 창 위 그을음
    for(let i=0;i<50;i++){const x=fr()*w,y=fr()*h,len=30+fr()*140;const gr=g.createLinearGradient(0,y,0,y+len);gr.addColorStop(0,'rgba(35,31,26,.22)');gr.addColorStop(1,'rgba(35,31,26,0)');g.fillStyle=gr;g.fillRect(x,y,2+fr()*6,len);}
    for(let i=0;i<6000;i++){g.fillStyle=fr()<.5?'rgba(255,250,235,.05)':'rgba(0,0,0,.07)';g.fillRect(fr()*w,fr()*h,2,2);}});
  tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.magFilter=T.NearestFilter;tex.anisotropy=V3.ren.capabilities.getMaxAnisotropy();
  const old=M.wall.map;M.wall.map=tex;M.wall.userData.brick=1;M.wall.needsUpdate=true;if(old&&old!==tex)old.dispose();}

/* ---------- 옥상 물탱크·길 위 잔해 ---------- */
function grProps(){const T=V3.T,g=V3.G.city;if(!G||!g)return;
  if(!GRADE.geo){const tank=new T.CylinderGeometry(.075,.075,.12,10);tank.translate(0,.17,0);const cap=new T.ConeGeometry(.082,.05,10);cap.translate(0,.255,0);
    const legs=new T.BoxGeometry(.11,.11,.11);legs.translate(0,.055,0);
    GRADE.geo={tank,cap,legs,chunk:new T.BoxGeometry(1,1,1)};
    const wood=new T.MeshStandardMaterial({color:'#5a4a3c',roughness:1,flatShading:true}),iron=new T.MeshStandardMaterial({color:'#34312d',roughness:.8,metalness:.3,wireframe:true}),
      deb=new T.MeshStandardMaterial({color:'#ffffff',roughness:1,flatShading:true});
    for(const m of [wood,iron,deb])if(typeof v3FowMat==='function')v3FowMat(m);GRADE.mat={wood,iron,deb};}
  const tanks=[],deb=[];const col=new T.Color();
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=G.map[r][c];const k=key(r,c);const [cx,cz]=v3x(r,c);
    if(x.t==='bldg'&&x.f>=3&&x.f<8&&!x.lm&&x.ks!=='ware'&&x.ks!=='house'&&x.bhp/x.bmax>.6&&v3Hash(k,201)<.16){const a=v3Hash(k,202)<.5?-1:1,b=v3Hash(k,203)<.5?-1:1;
      tanks.push([cx+a*.24,.06+x.f*FLOOR_H,cz+b*.24,v3Hash(k,204)*3]);}
    else if(x.t==='road'||x.t==='plaza'){const n=v3Hash(k,210)<.45?1+Math.floor(v3Hash(k,211)*4):0;
      for(let i=0;i<n;i++){const s=.018+Math.pow(v3Hash(k,220+i),2)*.05;deb.push([cx+(v3Hash(k,230+i)-.5)*.9,s*.3,cz+(v3Hash(k,240+i)-.5)*.9,s,v3Hash(k,250+i)*3,v3Hash(k,260+i)]);}}}
  const m4=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler(),p=new T.Vector3(),sc=new T.Vector3();
  const inst=(geo,mat,list,fill)=>{if(!list.length)return;const m=new T.InstancedMesh(geo,mat,list.length);list.forEach((a,i)=>{fill(a,i,m);m.setMatrixAt(i,m4);});
    m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;m.castShadow=true;m.receiveShadow=true;m.computeBoundingSphere();g.add(m);};
  for(const [geo,mat] of [[GRADE.geo.tank,GRADE.mat.wood],[GRADE.geo.cap,GRADE.mat.wood],[GRADE.geo.legs,GRADE.mat.iron]])
    inst(geo,mat,tanks,a=>{m4.compose(p.set(a[0],a[1],a[2]),q.setFromEuler(e.set(0,a[3],0)),sc.set(1,1,1));});
  inst(GRADE.geo.chunk,GRADE.mat.deb,deb,(a,i,m)=>{m4.compose(p.set(a[0],a[1],a[2]),q.setFromEuler(e.set(a[4]*.3,a[4],a[4]*.2)),sc.set(a[3]*1.6,a[3]*.6,a[3]));
    col.set(a[5]<.3?'#4a4640':a[5]<.7?'#77716a':'#8d8478');m.setColorAt(i,col);});}

if(typeof startView==='function'){const f=startView;startView=async function(){const r=await f.apply(this,arguments);try{if(V3.ren){grInit();grFacade();v3Size();}}catch(e){console.warn('grade',e);}return r;};}
if(typeof v3BuildCity==='function'){const f=v3BuildCity;v3BuildCity=function(){const r=f.apply(this,arguments);try{grProps();}catch(e){console.warn('grade props',e);}return r;};}
