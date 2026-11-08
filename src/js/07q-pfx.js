/* ===================== 입자 연출: 연기·불·폭발 =====================
   예전에는 연기 한 덩이마다 스프라이트와 재질을 새로 만들었다(폭발 하나에 수십 개, 그리기 호출도 그만큼).
   이제는 입자를 큰 버퍼 두 개(연기용·불빛용)에 고리처럼 돌려 쓰고, 움직임은 셰이더가 계산한다:
   태어난 자리·속도·수명만 한 번 쓰면, 바람에 밀리고 퍼지며 사라지는 것은 GPU가 매 화면 그린다.
   - 연기·먼지는 해와 하늘빛을 받는다(울퉁불퉁한 덩어리의 해 쪽은 밝고 반대쪽은 어둡다). 밤에는 어둡고, 불 옆에서는 아래가 주황빛.
   - 불·섬광·불똥은 더하기 혼합으로 빛난다.
   - 바람은 날씨와 지도에 따라 정해지고(DS.wind, 칸/초), 모든 연기가 같은 쪽으로 흘러간다.
   - 화면이 느려지면 입자 수를 줄인다(PFX.q). */
const PFX={q:1,qMax:1,on:false,base:0,t:0,em:[],mapE:new Map(),fireE:new Map(),ema:16,slow:0,col:new Map()};
const PFXK={SMOKE:0,FIRE:1,FLASH:2,SPARK:3};

const PFX_VS=`
uniform float uT;uniform vec2 uWind;uniform vec3 uSunV;
attribute vec4 a0;attribute vec4 a1;attribute vec4 a2;attribute vec4 a3;attribute vec4 a4;attribute vec4 a5;attribute vec4 a6;
varying vec2 vUv;varying vec4 vCol;varying vec3 vEm;varying float vK;varying float vKind;varying vec3 vSun;varying float vFog;
void main(){
  float age=uT-a0.w;float life=a1.w;float k=age/life;
  if(k<0.0||k>1.0){gl_Position=vec4(2.0,2.0,2.0,1.0);return;}
  float d=a2.z;float f=d>0.0?(1.0-exp(-d*age))/d:age;
  vec3 p=a0.xyz+a1.xyz*f+vec3(uWind.x,0.0,uWind.y)*a4.z*age;
  p.y+=0.5*a2.w*age*age;p.y=max(p.y,0.01);
  float e=1.0-pow(1.0-k,2.2);float s=mix(a2.x,a2.y,e);
  vec4 mv=modelViewMatrix*vec4(p,1.0);vec2 c=position.xy;float r=a4.x+a4.y*age;
  if(a4.w>2.5){
    vec3 vel=a1.xyz*exp(-d*age)+vec3(0.0,a2.w*age,0.0);vec2 dv=(modelViewMatrix*vec4(vel,0.0)).xy;float L=length(dv);
    vec2 dir=L>1e-4?dv/L:vec2(1.0,0.0);vec2 nr=vec2(-dir.y,dir.x);mv.xy+=dir*c.x*(s+L*0.035)+nr*c.y*s*0.5;r=0.0;
  }else{float cs=cos(r),sn=sin(r);mv.xy+=mat2(cs,sn,-sn,cs)*c*s;}
  gl_Position=projectionMatrix*mv;vFog=-mv.z;
  vUv=uv*0.5+vec2(mod(a6.y,2.0),floor(a6.y*0.5))*0.5;vK=k;vKind=a4.w;
  float fi=max(a6.x,1e-3);float a=a3.w*smoothstep(0.0,fi,k)*(a4.w>0.5?pow(1.0-k,1.6):(1.0-smoothstep(0.4,1.0,k))*mix(1.0,0.6,e));
  vCol=vec4(a3.rgb,a);vEm=a5.rgb*max(0.0,1.0-k/max(a5.w,1e-3));
  float cs2=cos(-r),sn2=sin(-r);vSun=vec3(mat2(cs2,sn2,-sn2,cs2)*uSunV.xy,uSunV.z);
}`;
const PFX_FS=`
uniform sampler2D uTex;uniform vec3 uSun;uniform vec3 uAmb;uniform float uAdd;
uniform vec3 fogColor;uniform float fogNear;uniform float fogFar;
varying vec2 vUv;varying vec4 vCol;varying vec3 vEm;varying float vK;varying float vKind;varying vec3 vSun;varying float vFog;
void main(){
  vec4 tx=texture2D(uTex,vUv);float dens=tx.a;
  float ff=smoothstep(fogNear,fogFar,vFog);vec3 col;float a;
  if(uAdd<0.5){
    vec3 n=normalize(vec3(tx.g*2.0-1.0,tx.b*2.0-1.0,0.55));
    float lam=clamp(dot(n,normalize(vSun)),-1.0,1.0)*0.5+0.5;
    col=vCol.rgb*(uAmb+uSun*lam*lam)*(0.72+0.28*tx.r)+vEm*(1.2-dens*0.6);
    a=vCol.a*dens;if(a<0.004)discard;
    col=mix(col,fogColor,ff);
  }else{
    float k=vK;vec3 ramp;
    if(vKind<1.5){vec2 lc=fract(vUv*2.0)*2.0-1.0;float rad=clamp(1.0-dot(lc,lc),0.0,1.0);ramp=mix(vec3(4.5,3.9,2.8),vec3(3.2,1.6,0.55),smoothstep(0.0,0.4,k));ramp=mix(ramp,vec3(1.0,0.3,0.06),smoothstep(0.4,0.9,k));dens=smoothstep(0.0,0.9,rad*rad*(0.4+tx.r*1.2))*(1.0-smoothstep(0.2,0.75,k));}
    else if(vKind<2.5){ramp=vec3(3.0,2.7,2.2);dens=smoothstep(0.0,0.9,dens);}
    else{ramp=vec3(2.6,1.5,0.6)*(1.2-k);dens=1.0;}
    col=vCol.rgb*ramp*(1.0-ff);a=vCol.a*dens;if(a<0.004)discard;
  }
  gl_FragColor=vec4(col,a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/* 연기 무늬 4가지(2×2): 알파=밀도, 초록·파랑=덩어리 표면의 기울기(빛 계산용), 빨강=잔주름 밝기 */
function pfxTex(){const T=V3.T;const S=128,W=S*2;const D=new Uint8Array(W*W*4);
  const R=mulberry(4242);const P=new Float32Array(512);for(let i=0;i<512;i++)P[i]=R();
  const hsh=(x,y,s)=>P[(((x*73856093)^(y*19349663)^(s*83492791))>>>0)%512];
  const vn=(x,y,s)=>{const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;const u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
    const a=hsh(xi,yi,s),b=hsh(xi+1,yi,s),c=hsh(xi,yi+1,s),d=hsh(xi+1,yi+1,s);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;};
  const fbm=(x,y,s)=>{let t=0,a=.5,f=1;for(let o=0;o<4;o++){t+=vn(x*f,y*f,s+o)*a;a*=.5;f*=2.03;}return t;};
  for(let v=0;v<4;v++){const ox=(v%2)*S,oy=(v>>1)*S;
    // 둥근 덩어리 여러 개가 겹친 꽃양배추 모양: 가장 앞에 솟은 덩어리의 구면이 표면이 된다
    const blobs=[[0,0,.46+R()*.06]];const nb=4+v;for(let i=0;i<nb;i++){const a=R()*6.283,d=.2+R()*.24;blobs.push([Math.cos(a)*d,Math.sin(a)*d,.24+R()*.14]);}
    for(let y=0;y<S;y++)for(let x=0;x<S;x++){const u=(x+.5)/S*2-1,w=(y+.5)/S*2-1;let best=-1,bn=null,bq=9;
      for(const [bx,by,br] of blobs){const dx=(u-bx)/br,dy=(w-by)/br,q=dx*dx+dy*dy;if(q<1){const hz=Math.sqrt(1-q)*br+br*.4;if(hz>best){best=hz;bn=[dx,-dy,Math.sqrt(1-q)];}}if(q<bq)bq=q;}
      const n=fbm(x/S*5,y/S*5,v*7),n2=fbm(x/S*13,y/S*13,v*7+3);
      const al=Math.max(0,Math.min(1,(1.1-bq-(n-.5)*.8)/.6));const i=((oy+y)*W+ox+x)*4;
      let nx=0,ny=0;if(bn){nx=bn[0]+(n2-.5)*.9;ny=bn[1]+(fbm(x/S*13+9,y/S*13,v*7+3)-.5)*.9;}
      D[i]=Math.min(255,(n2*.6+n*.5)*255);D[i+1]=(Math.max(-1,Math.min(1,nx))*.5+.5)*255;D[i+2]=(Math.max(-1,Math.min(1,ny))*.5+.5)*255;D[i+3]=al*al*(3-2*al)*255;}}
  const t=new T.DataTexture(D,W,W,T.RGBAFormat);t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;}

function pfxMesh(cap,add){const T=V3.T;const base=new T.PlaneGeometry(1,1);const g=new T.InstancedBufferGeometry();g.index=base.index;g.setAttribute('position',base.attributes.position);g.setAttribute('uv',base.attributes.uv);
  const A=[];for(let i=0;i<7;i++){const arr=new Float32Array(cap*4);if(i===0)for(let j=0;j<cap;j++)arr[j*4+3]=-1e6;const at=new T.InstancedBufferAttribute(arr,4);at.setUsage(T.DynamicDrawUsage);g.setAttribute('a'+i,at);A.push(at);}
  g.instanceCount=cap;
  const u=T.UniformsUtils.merge([T.UniformsLib.fog,{uT:{value:0},uWind:{value:new T.Vector2()},uSunV:{value:new T.Vector3(0,1,0)},uTex:{value:null},uSun:{value:new T.Color()},uAmb:{value:new T.Color()},uAdd:{value:add?1:0}}]);
  u.uTex.value=PFX.tex;
  const m=new T.ShaderMaterial({uniforms:u,vertexShader:PFX_VS,fragmentShader:PFX_FS,transparent:true,depthWrite:false,fog:true,blending:add?T.AdditiveBlending:T.NormalBlending});
  const mesh=new T.Mesh(g,m);mesh.frustumCulled=false;mesh.renderOrder=add?6:5;mesh.userData.keepGeo=1;mesh.userData.keepMat=1;
  return {mesh,A,cap,i:0,lo:1e9,hi:-1,wrap:false};}

function pfxInit(){if(PFX.on||!V3.T||!V3.scene)return;const T=V3.T;PFX.on=true;PFX.base=performance.now()/1000;
  const mob=typeof matchMedia==='function'&&matchMedia('(pointer:coarse)').matches;PFX.qMax=mob?.6:1;PFX.q=PFX.qMax;
  PFX.tex=pfxTex();PFX.s=pfxMesh(mob?3000:6000,false);PFX.a=pfxMesh(mob?1500:3000,true);V3.scene.add(PFX.s.mesh);V3.scene.add(PFX.a.mesh);
  PFX.ringTex=v3Tex(64,64,g=>{const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(.72,'rgba(255,255,255,0)');gr.addColorStop(.88,'rgba(255,255,255,.9)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);});
  PFX.ringG=new T.PlaneGeometry(1,1);PFX.ringG.rotateX(-Math.PI/2);
  PFX.sunV=new T.Vector3();PFX.tc=new T.Color();}

/* 색 이름 → 선형 RGB (자주 쓰는 색은 기억) */
function pfxC(h){let c=PFX.col.get(h);if(!c){const k=new V3.T.Color(h);c=[k.r,k.g,k.b];PFX.col.set(h,c);}return c;}
const pfxN=n=>Math.max(1,Math.round(n*PFX.q));
const pfxR=(a,b)=>a+Math.random()*(b-a);

/* 입자 하나. o: x,y,z 위치 / vx,vy,vz 처음 속도(칸/초) / life 초 / s0→s1 크기 / drag 감속 / acc 위아래 가속 / col,a 색·불투명
   / wind 바람 영향 / k 종류(PFXK) / em,emK 처음에 비치는 불빛과 꺼지는 시점(수명 비율) / fi 나타나는 시간(수명 비율) / dl 늦게 시작(초) */
function pfx(o){if(!PFX.on)pfxInit();if(!PFX.on)return;const B=o.k?PFX.a:PFX.s;const i=B.i;B.i=(i+1)%B.cap;if(B.i===0)B.wrap=true;if(i<B.lo)B.lo=i;if(i>B.hi)B.hi=i;
  const A=B.A,j=i*4;const c=pfxC(o.col||'#808080');const e=o.em?pfxC(o.em):null;
  let a=A[0].array;a[j]=o.x;a[j+1]=o.y||0;a[j+2]=o.z;a[j+3]=PFX.t+(o.dl||0);
  a=A[1].array;a[j]=o.vx||0;a[j+1]=o.vy||0;a[j+2]=o.vz||0;a[j+3]=o.life||1;
  a=A[2].array;a[j]=o.s0??.2;a[j+1]=o.s1??o.s0??.2;a[j+2]=o.drag||0;a[j+3]=o.acc||0;
  a=A[3].array;a[j]=c[0];a[j+1]=c[1];a[j+2]=c[2];a[j+3]=o.a??1;
  a=A[4].array;a[j]=o.rot??Math.random()*6.283;a[j+1]=o.rs??(Math.random()-.5)*.6;a[j+2]=o.wind??1;a[j+3]=o.k||0;
  a=A[5].array;if(e){const ei=o.emI??1;a[j]=e[0]*ei;a[j+1]=e[1]*ei;a[j+2]=e[2]*ei;a[j+3]=o.emK||.15;}else{a[j]=a[j+1]=a[j+2]=0;a[j+3]=1;}
  a=A[6].array;a[j]=o.fi??.08;a[j+1]=o.v??(Math.random()*4|0);a[j+2]=0;a[j+3]=0;}
function pfxFlush(B){if(B.hi<0)return;for(const at of B.A){if(B.wrap||!at.addUpdateRange){if(at.clearUpdateRanges)at.clearUpdateRanges();}else{at.clearUpdateRanges();at.addUpdateRange(B.lo*4,(B.hi-B.lo+1)*4);}at.needsUpdate=true;}B.lo=1e9;B.hi=-1;B.wrap=false;}

/* 흙·콘크리트 먼지 색 */
const PFX_DUST=['#8a7f6e','#a4977f','#bcae94','#766c5f'];
const pfxDustC=()=>PFX_DUST[Math.random()*4|0];

/* ---------- 폭발 ----------
   s: 크기(포탄 1, 큰 포탄·폭탄 1.4~2). o.ground: 땅에서(먼지 고리·흙기둥·충격파), o.fire: 화염 배수(연료·탄약), o.dust: 먼지 색 */
function pfxBlast(x,y,z,s,o){o=o||{};if(!V3.on)return;if(!PFX.on)pfxInit();if(!PFX.on)return;const gnd=o.ground!==false;const fk=o.fire||1;const sq=Math.sqrt(s);
  // 섬광: 한순간 하얗게
  pfx({x,y:y+.08*s,z,life:.07+.03*s,s0:s*.9,s1:s*2.2,k:PFXK.FLASH,col:'#fff1d6',a:1,fi:.01,wind:0});
  pfx({x,y:y+.1*s,z,life:.35+.1*s,s0:s*1.2,s1:s*1.9,k:PFXK.FLASH,col:'#ff9a48',a:.55,fi:.02,wind:0});
  pfx({x,y:y+.15*s,z,vy:.6,drag:2,life:.28+.12*s,s0:s*.7,s1:s*.9,k:PFXK.FIRE,col:'#ffffff',a:1,fi:.02,wind:0});
  // 불덩이: 바깥으로 밀려 나가다 금방 멈추고, 노랗던 것이 주황·검붉게 식는다
  const nf=pfxN(10+8*s*fk);for(let i=0;i<nf;i++){const a=Math.random()*6.283,el=gnd?pfxR(.15,1.3):pfxR(-1.2,1.3);const sp=pfxR(1.4,3.4)*sq*Math.sqrt(fk);
    pfx({x,y:y+.05,z,vx:Math.cos(a)*Math.cos(el)*sp,vy:Math.sin(el)*sp*.8+.4,vz:Math.sin(a)*Math.cos(el)*sp,drag:7,acc:.7,life:pfxR(.3,.55)*Math.sqrt(fk)*(.8+.2*s),s0:.14*s,s1:pfxR(.3,.6)*s*Math.sqrt(fk),k:PFXK.FIRE,col:'#ffffff',a:.95,fi:.04,rs:(Math.random()-.5)*3,wind:.3});}
  // 불덩이에서 피어오르는 검은 연기: 처음엔 아래가 불빛으로 주황, 위로 말려 올라가며 바람에 밀린다
  const ns=pfxN(6+5*s*fk);for(let i=0;i<ns;i++){const a=Math.random()*6.283,r=pfxR(0,.3)*s;
    pfx({x:x+Math.cos(a)*r,y:y+pfxR(.05,.3)*s,z:z+Math.sin(a)*r,vx:Math.cos(a)*pfxR(.2,.9)*s,vy:pfxR(.5,1.3)*sq,vz:Math.sin(a)*pfxR(.2,.9)*s,drag:1.1,acc:.04,
      life:pfxR(7,12)*sq*fk,s0:.25*s,s1:pfxR(1,1.7)*s,col:fk>1?(Math.random()<.5?'#2c2925':'#45403a'):(Math.random()<.5?'#5a5249':'#7a6f61'),a:.85,fi:.03,em:'#ff8030',emI:1.1,emK:.035,dl:pfxR(.03,.12),rs:(Math.random()-.5)*.5});}
  if(gnd){
    // 바닥을 따라 퍼지는 먼지 고리: 낮게 깔려 오래 머물고 바람에 흘러간다
    const col=o.dust;const nd=pfxN(9+8*s);for(let i=0;i<nd;i++){const a=i/nd*6.283+Math.random()*.5,sp=pfxR(1.6,3.2)*s;
      pfx({x:x+Math.cos(a)*.1,y:y+pfxR(.04,.14),z:z+Math.sin(a)*.1,vx:Math.cos(a)*sp,vy:pfxR(.05,.25),vz:Math.sin(a)*sp,drag:2.4,acc:.01,life:pfxR(12,24)*sq,s0:.25*s,s1:pfxR(1.1,1.8)*s,col:col||pfxDustC(),a:.6,fi:.03,rs:(Math.random()-.5)*.3});}
    // 솟구치는 흙기둥: 빠르게 올라갔다가 멈춰 걸리고, 흙은 떨어진다
    const nc=pfxN(5+3*s);for(let i=0;i<nc;i++){const a=Math.random()*6.283,sp=pfxR(.1,.6)*s;
      pfx({x,y:y+.1,z,vx:Math.cos(a)*sp,vy:pfxR(3,5.5)*sq,vz:Math.sin(a)*sp,drag:2.2,acc:-.6,life:pfxR(3,6)*sq,s0:.15*s,s1:pfxR(.7,1.1)*s,col:Math.random()<.5?'#6e6354':'#958871',a:.75,fi:.02,rs:(Math.random()-.5)*.4});}
    pfxRing(x,y,z,s);}
  else{const nd=pfxN(5+5*s);for(let i=0;i<nd;i++){const a=Math.random()*6.283,el=pfxR(-.6,.8),sp=pfxR(.8,2)*s;
      pfx({x,y,z,vx:Math.cos(a)*Math.cos(el)*sp,vy:Math.sin(el)*sp,vz:Math.sin(a)*Math.cos(el)*sp,drag:2.5,acc:-.03,life:pfxR(5,10)*sq,s0:.2*s,s1:pfxR(.8,1.4)*s,col:o.dust||'#9c9283',a:.6,fi:.03});}}
  // 불똥: 포물선을 그리며 떨어지는 빛줄기
  const nk=pfxN(12+10*s);for(let i=0;i<nk;i++){const a=Math.random()*6.283,el=gnd?pfxR(.25,1.4):pfxR(-1,1.4),sp=pfxR(2.5,6)*sq;
    pfx({x,y:y+.05,z,vx:Math.cos(a)*Math.cos(el)*sp,vy:Math.sin(el)*sp,vz:Math.sin(a)*Math.cos(el)*sp,drag:1.3,acc:-5,life:pfxR(.35,.9),s0:.022,s1:.016,k:PFXK.SPARK,col:'#ffd08a',a:1,fi:.01,wind:0});}
  // 남은 불씨에서 한동안 가는 연기
  pfxEmit({x,y:y+.05,z,dur:pfxR(8,16)*sq,rate:1.1,fn:e=>pfx({x:e.x+pfxR(-.15,.15)*s,y:e.y,z:e.z+pfxR(-.15,.15)*s,vy:pfxR(.15,.35),drag:.2,life:pfxR(4,7),s0:.12*s,s1:pfxR(.5,.9)*s,col:'#5b554d',a:.35,fi:.15})});
  if(V3.flash){V3.flash.position.set(x,y+.6,z);V3.flash.intensity=Math.max(V3.flash.intensity,(2+3*s)*Math.sqrt(fk)*2);V3.flashT=performance.now();}}

/* 충격파: 땅 위로 번지는 밝은 고리(아주 짧게) */
function pfxRing(x,y,z,s){if(!PFX.on)return;const T=V3.T;const m=new T.Mesh(PFX.ringG,new T.MeshBasicMaterial({map:PFX.ringTex,color:'#efe6d4',transparent:true,depthWrite:false,opacity:0}));m.userData.keepGeo=1;m.position.set(x,y+.03,z);m.renderOrder=4;V3.G.fx.add(m);
  V3.fx.push({o:m,t0:performance.now(),dur:300+120*s,upd:(o,k)=>{const e=1-Math.pow(1-k,3);o.scale.setScalar(.2+e*3.2*s);o.material.opacity=.55*(1-k);}});}

/* ---------- 계속 피어오르는 곳(불·연막·탄 건물) ---------- */
function pfxEmit(e){if(!PFX.on)return null;e.acc=e.acc||0;e.t1=PFX.t+(e.dur??1e9);PFX.em.push(e);return e;}
function pfxRun(list,dt,cx,cz,far){for(const e of list){const d=Math.hypot(e.x-cx,e.z-cz);const lod=d>far?.25:1;e.acc+=dt*e.rate*PFX.q*lod*(e.k??1);let n=0;while(e.acc>=1&&n<12){e.acc-=1;n++;e.fn(e);}if(e.acc>12)e.acc=0;}}

/* 불: 일렁이는 불꽃이 위로 핥고 올라가 사라지고, 위로 검은 연기가 흘러간다 */
function pfxFlame(e){const sp=e.sp||.4;pfx({x:e.x+pfxR(-.5,.5)*sp,y:e.y+.02,z:e.z+pfxR(-.5,.5)*sp,vx:pfxR(-.05,.05),vy:pfxR(.3,.6),vz:pfxR(-.05,.05),drag:.6,acc:.2,life:pfxR(.4,.8),s0:pfxR(.1,.17)*(e.sz||1),s1:.04*(e.sz||1),k:PFXK.FIRE,col:'#ffd9a8',a:.9,fi:.12,rs:(Math.random()-.5)*2,wind:.6});}
function pfxFireSmoke(e){const sp=e.sp||.4;pfx({x:e.x+pfxR(-.4,.4)*sp,y:e.y+.18,z:e.z+pfxR(-.4,.4)*sp,vx:0,vy:pfxR(.35,.6),vz:0,drag:.15,acc:.02,life:pfxR(5,8),s0:.12*(e.sz||1),s1:pfxR(.7,1.2)*(e.sz||1),col:Math.random()<.5?'#26231f':'#3a3530',a:.6,fi:.08,em:'#ff6a1a',emI:1.2,emK:.1});}
function pfxFire(x,z,y,n,dur,spread){if(!V3.on)return;if(!PFX.on)pfxInit();if(!PFX.on)return;const sz=Math.min(1.6,.7+n*.12);
  pfxEmit({x,y:y||.03,z,sp:spread||.5,sz,dur,rate:Math.min(14,3*n),fn:pfxFlame});
  pfxEmit({x,y:y||.03,z,sp:spread||.5,sz,dur,rate:Math.min(3,.5+n*.35),fn:pfxFireSmoke});}

/* ---------- 연막: 흰 연기가 바닥부터 짙게 피어올라 칸을 덮고, 바람 쪽으로 조금씩 흐른다 ---------- */
function pfxScreen(e){pfx({x:e.x+pfxR(-.45,.45),y:pfxR(.05,.25),z:e.z+pfxR(-.45,.45),vx:pfxR(-.12,.12),vy:pfxR(.04,.14),vz:pfxR(-.12,.12),drag:.35,acc:.003,life:pfxR(9,14),s0:pfxR(.45,.7),s1:pfxR(1.6,2.3),col:Math.random()<.5?'#dcdad3':'#c6c3ba',a:.5,fi:.12,wind:.35,rs:(Math.random()-.5)*.25});}
/* 연막탄 터짐: 통이 터지며 흰 연기가 사방으로 확 퍼진다 */
function pfxPop(x,y,z,s,col){if(!V3.on)return;if(!PFX.on)pfxInit();if(!PFX.on)return;const n=pfxN(10*s);
  for(let i=0;i<n;i++){const a=Math.random()*6.283,sp=pfxR(.6,1.6)*s;pfx({x,y:y+.05,z,vx:Math.cos(a)*sp,vy:pfxR(.1,.5),vz:Math.sin(a)*sp,drag:1.6,acc:.01,life:pfxR(10,16),s0:.2*s,s1:pfxR(1.3,2)*s,col:col||(Math.random()<.5?'#e2e0da':'#cbc8bf'),a:.55,fi:.04,wind:.4});}}

/* ---------- 지도에 맞춘 연기(연막 칸·부서진 건물·불난 건물) ---------- */
function pfxSyncMap(){if(!PFX.on)pfxInit();if(!PFX.on||!G)return;const want=new Map();const fresh=PFX.mapSeed!==V3.seed;PFX.mapSeed=V3.seed;
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=G.map[r][c];const [cx,cz]=v3x(r,c);const k=key(r,c);
    if(x.smoke>0){want.set('s'+k,{x:cx,z:cz,y:0,rate:2.4,fn:pfxScreen,boost:fresh?0:2.5});continue;}
    const dmg=x.t==='bldg'?1-x.bhp/x.bmax:x.t==='rubble'&&v3Hash(k,530)<.35?.7:0;if(dmg<.3)continue;const y=x.t==='bldg'?v3Top(r,c)-.05:.1;
    want.set('d'+k,{x:cx+(v3Hash(k,540)-.5)*.5,z:cz+(v3Hash(k,550)-.5)*.5,y,rate:.5+dmg*1.4,dmg,fn:e=>pfx({x:e.x+pfxR(-.2,.2),y:e.y+.1,z:e.z+pfxR(-.2,.2),vy:pfxR(.25,.45),drag:.12,acc:.015,life:pfxR(6,10),s0:.25,s1:pfxR(1,1.5)+e.dmg*.6,col:Math.random()<.6?'#3b3631':'#5e574e',a:.5,fi:.1})});
    if(dmg>=.5)want.set('f'+k,{x:cx+(v3Hash(k,570)-.5)*.4,z:cz+(v3Hash(k,571)-.5)*.4,y,sp:.3,sz:1,rate:5,fn:pfxFlame});}
  for(const [k,e] of PFX.mapE)if(!want.has(k))PFX.mapE.delete(k);
  for(const [k,e] of want){if(PFX.mapE.has(k)){Object.assign(PFX.mapE.get(k),{rate:e.rate,dmg:e.dmg});continue;}e.acc=0;PFX.mapE.set(k,e);
    // 새로 깔린 연막은 처음 2초 동안 세게 뿜고, 지도를 새로 열었을 땐 이미 퍼진 상태로 시작
    if(fresh&&e.fn===pfxScreen)for(let i=0;i<pfxN(18);i++){pfxScreen(e);const A=PFX.s.A[0].array;const j=((PFX.s.i-1+PFX.s.cap)%PFX.s.cap)*4;A[j+3]-=Math.random()*10;}
    if(e.boost)e.until=PFX.t+2;}}

/* ---------- 매 화면 ---------- */
function pfxFrame(now,dt){if(!PFX.on||!V3.on)return;PFX.t=now/1000-PFX.base;
  // 바람: 지도마다 방향이 다르고 천천히 돈다. 맑음은 산들바람, 비·폭풍은 세게(칸/초). 바뀔 때는 몇 초에 걸쳐.
  const sd=(G&&G.seed|0)||1;const ang=v3Hash(sd&0xffff,991)*6.283+Math.sin(PFX.t/80)*.35;const wx=G&&G.wx||'clear';
  const sp=(wx==='storm'?.24:wx==='rain'?.13:wx==='fog'?.025:.07)*(1+.25*Math.sin(PFX.t*.7)*Math.sin(PFX.t*.23));const k=1-Math.exp(-dt/4);
  DS.wind[0]+=(Math.cos(ang)*sp-DS.wind[0])*k;DS.wind[1]+=(Math.sin(ang)*sp-DS.wind[1])*k;
  // 느리면 입자를 줄인다
  PFX.ema+=(dt*1000-PFX.ema)*.05;if(PFX.fixQ)PFX.ema=16;if(PFX.ema>40){PFX.slow+=dt;if(PFX.slow>2){PFX.slow=0;PFX.q=Math.max(.35,PFX.q*.85);}}else if(PFX.ema<28){PFX.slow=0;PFX.q=Math.min(PFX.qMax,PFX.q+dt*.02);}else PFX.slow=0;
  const cs=V3.cs,far=Math.max(14,cs.d*1.8);
  PFX.em=PFX.em.filter(e=>e.t1>PFX.t);pfxRun(PFX.em,dt,cs.x,cs.z,far);
  for(const e of PFX.mapE.values())e.k=e.until&&e.until>PFX.t?3.5:1;pfxRun(PFX.mapE.values(),dt,cs.x,cs.z,far);
  pfxBldgFires(dt,cs,far);
  // 빛: 해 방향(카메라 기준), 해·하늘 밝기
  const sv=PFX.sunV.copy(V3.sun.position).sub(V3.sun.target.position).normalize().transformDirection(V3.cam.matrixWorldInverse);
  const sun=PFX.tc.copy(V3.sun.color).multiplyScalar(V3.sun.intensity*.42);
  for(const B of [PFX.s,PFX.a]){const u=B.mesh.material.uniforms;u.uT.value=PFX.t;u.uWind.value.set(DS.wind[0],DS.wind[1]);u.uSunV.value.copy(sv);u.uSun.value.copy(sun);
    u.uAmb.value.copy(V3.hemi.color).multiplyScalar(V3.hemi.intensity*.55).lerp(PFX.tc.copy(V3.hemi.groundColor).multiplyScalar(V3.hemi.intensity*.55),.3);pfxFlush(B);}}
/* 불난 건물(G.fires): 지붕에서 검은 연기가 굵게 솟아 바람에 길게 눕는다 */
function pfxBldgFires(dt,cs,far){const want=new Set(G&&G.fires||[]);for(const k of PFX.fireE.keys())if(!want.has(k))PFX.fireE.delete(k);
  for(const k of want){const X=G.map[kr(k)][kc(k)];if(!X||X.t!=='bldg')continue;let e=PFX.fireE.get(k);
    if(!e){const b=bldgBox(kr(k),kc(k));e={x:(b[0]+b[1])/2,z:(b[2]+b[3])/2,w:Math.max(.2,(b[1]-b[0])*.4),acc:0,fn:q=>pfx({x:q.x+pfxR(-1,1)*q.w,y:q.y,z:q.z+pfxR(-1,1)*q.w,vx:0,vy:pfxR(.5,.8),vz:0,drag:.08,acc:.02,life:pfxR(9,14),s0:.3,s1:pfxR(1.6,2.4),col:Math.random()<.6?'#1f1c19':'#35302b',a:.62,fi:.06,em:'#ff6a1a',emI:1.4,emK:.08})};PFX.fireE.set(k,e);}
    e.y=v3H(X.f)+.05;e.rate=(X.fire||0)*3;}
  pfxRun(PFX.fireE.values(),dt,cs.x,cs.z,far);}

/* ===================== 예전 연출 함수를 입자로 바꾼다 =====================
   부르는 쪽(포탄·미사일·공습·붕괴·차량 파괴…)은 그대로 두고, 그리는 방법만 바꾼다. */
/* 섬광과 불덩이(light가 있으면) + 연기 몇 덩이. light가 0이면 먼지·연기만 */
v3Burst=function(x,y,z,size,col,smoke,light){if(!V3.on)return;if(!PFX.on)pfxInit();if(!PFX.on)return;
  if(light){if(size<.4){pfx({x,y,z,life:.05+size*.25,s0:size*.8,s1:size*1.8,k:PFXK.FLASH,col,a:1,fi:.01,wind:0});
      if(V3.flash){V3.flash.position.set(x,y+.6,z);V3.flash.intensity=Math.max(V3.flash.intensity,light*6);V3.flashT=performance.now();}}
    else{pfx({x,y,z,life:.09,s0:size*.8,s1:size*1.9,k:PFXK.FLASH,col:'#fff1d6',a:1,fi:.01,wind:0});
      const nf=pfxN(3+size*5);for(let i=0;i<nf;i++){const a=Math.random()*6.283,el=pfxR(-.3,1.2),sp=pfxR(1,2.6)*size;pfx({x,y,z,vx:Math.cos(a)*Math.cos(el)*sp,vy:Math.sin(el)*sp+.3,vz:Math.sin(a)*Math.cos(el)*sp,drag:6.5,acc:.6,life:pfxR(.3,.6)*(.7+size*.3),s0:size*.15,s1:size*pfxR(.4,.7),k:PFXK.FIRE,col,a:.95,fi:.04,wind:.3,rs:(Math.random()-.5)*3});}
      const nk=pfxN(4+size*8);for(let i=0;i<nk;i++){const a=Math.random()*6.283,el=pfxR(-.2,1.3),sp=pfxR(2,5)*Math.sqrt(size);pfx({x,y,z,vx:Math.cos(a)*Math.cos(el)*sp,vy:Math.sin(el)*sp,vz:Math.sin(a)*Math.cos(el)*sp,drag:1.3,acc:-5,life:pfxR(.3,.8),s0:.02,s1:.015,k:PFXK.SPARK,col:'#ffd08a',a:1,fi:.01,wind:0});}
      if(V3.flash){V3.flash.position.set(x,y+.6,z);V3.flash.intensity=Math.max(V3.flash.intensity,light*6);V3.flashT=performance.now();}}}
  for(let i=0;i<smoke;i++){const a=Math.random()*6.283,r=Math.random()*size*.35;const dark=light?(i%2?'#4a443d':'#2e2a26'):col;
    pfx({x:x+Math.cos(a)*r,y,z:z+Math.sin(a)*r,vx:Math.cos(a)*pfxR(.1,.5)*size,vy:pfxR(.4,1)*(light?1:.5),vz:Math.sin(a)*pfxR(.1,.5)*size,drag:1,acc:.03,life:pfxR(3,6)*(light?1:1.4),s0:size*.25,s1:size*pfxR(.9,1.4),col:dark,a:light?.75:.55,fi:.04,dl:i*.05,em:light?'#ff7424':null,emI:1.4,emK:.12});}
  if(smoke>=3)v3Debris(x,y,z,smoke*2,.8);};
/* 총탄이 맞은 자리: 작은 흙·콘크리트 가루 */
v3Impact=function(x,y,z){if(!V3.on)return;if(!PFX.on)pfxInit();if(!PFX.on)return;
  for(let i=0;i<2;i++)pfx({x:x+pfxR(-.05,.05),y,z:z+pfxR(-.05,.05),vx:pfxR(-.3,.3),vy:pfxR(.2,.6),vz:pfxR(-.3,.3),drag:3,acc:-.1,life:pfxR(.7,1.3),s0:.04,s1:pfxR(.14,.22),col:pfxDustC(),a:.6,fi:.05,dl:i*.03});
  if(Math.random()<.3)pfx({x,y,z,vx:pfxR(-1,1),vy:pfxR(.5,1.5),vz:pfxR(-1,1),drag:1,acc:-5,life:.25,s0:.015,s1:.01,k:PFXK.SPARK,col:'#ffe0a0',a:1,fi:.01,wind:0});};
/* 연막 지원: 포탄 여러 발이 흩어져 터지며 흰 연기를 뿜는다(그 뒤 칸 연기는 pfxSyncMap이 이어 간다) */
{const _st=v3FxStrike;v3FxStrike=function(kind,r,c,n){if(kind==='smoke'&&V3.on){const [x,z]=v3x(r,c);for(let i=0;i<7;i++)setTimeout(()=>{const px=x+(Math.random()-.5)*2.4,pz=z+(Math.random()-.5)*2.4;pfx({x:px,y:.3,z:pz,life:.08,s0:.2,s1:.5,k:PFXK.FLASH,col:'#fff1d6',a:.8,fi:.01,wind:0});pfxPop(px,.05,pz,1.1);},i*110);return;}return _st.apply(this,arguments);};}
/* 지도 연기: 예전 스프라이트는 지우고 입자로 */
{const _ss=v3SyncSmoke;v3SyncSmoke=function(){_ss.apply(this,arguments);if(!V3.T)return;for(const sp of V3.smoke){V3.G.amb.remove(sp.o);if(sp.o.material)sp.o.material.dispose();}V3.smoke=[];pfxSyncMap();};}
/* 건물 붕괴: 무너지는 모습은 그대로, 분진은 입자로 — 바닥을 따라 둥글게 밀려 나가는 먼지 파도와 솟는 기둥, 오래 남는 뿌연 먼지 */
{const _co=v3FxCollapse;v3FxCollapse=function(r,c,f){const n0=V3.fx?V3.fx.length:0;const out=_co.apply(this,arguments);
  if(!V3.on||!V3.fx)return out;if(!PFX.on)pfxInit();
  // 예전 분진 스프라이트(덩어리 무늬)는 지운다
  V3.fx=V3.fx.filter((e,i)=>{if(i<n0||!e.o.isSprite||e.o.material.map!==(V3.puffD||V3.puff))return true;V3.G.fx.remove(e.o);e.o.material.dispose();return false;});
  const [x,z]=v3x(r,c);const nf=Math.max(1,f||3);const h=nf*FLOOR_H;const s=.8+Math.min(1.2,nf*.12);
  setTimeout(()=>{if(!V3.on)return;
    const n=pfxN(30+nf*3);for(let i=0;i<n;i++){const a=i/n*6.283+Math.random()*.3,sp=pfxR(2.2,4.2)*s;pfx({x:x+Math.cos(a)*.35,y:pfxR(.05,.25),z:z+Math.sin(a)*.35,vx:Math.cos(a)*sp,vy:pfxR(.05,.3),vz:Math.sin(a)*sp,drag:1.5,acc:.006,life:pfxR(18,32),s0:.5*s,s1:pfxR(2.2,3.4)*s,col:pfxDustC(),a:.62,fi:.03,rs:(Math.random()-.5)*.2,dl:pfxR(0,.25)});}
    const m=pfxN(16+nf*2);for(let i=0;i<m;i++){const a=Math.random()*6.283,rr=Math.random()*.4;pfx({x:x+Math.cos(a)*rr,y:pfxR(.1,h*.7),z:z+Math.sin(a)*rr,vx:Math.cos(a)*pfxR(.2,.7),vy:pfxR(.6,1.6),vz:Math.sin(a)*pfxR(.2,.7),drag:.7,acc:.01,life:pfxR(14,24),s0:.4*s,s1:pfxR(1.8,3)*s,col:Math.random()<.3?'#6c635a':'#a99a83',a:.55,fi:.04,dl:pfxR(0,.6)});}
    pfxEmit({x,y:.1,z,dur:25,rate:1.6,fn:e=>pfx({x:e.x+pfxR(-.5,.5),y:pfxR(.05,.3),z:e.z+pfxR(-.5,.5),vx:pfxR(-.2,.2),vy:pfxR(.1,.3),vz:pfxR(-.2,.2),drag:.4,life:pfxR(10,16),s0:.4,s1:pfxR(1.4,2),col:pfxDustC(),a:.4,fi:.15})});},250);
  return out;};}
/* 불난 건물: 예전 지붕 연기 스프라이트는 빼고(pfxBldgFires가 그린다), 창 불길·불빛은 그대로 */
{const _fb=v3FireBuild;v3FireBuild=function(k){const o=_fb.apply(this,arguments);for(const p of o.S){o.g.remove(p.s);p.s.material.dispose();}o.S=[];return o;};}
/* 지도 밖·잔해의 연기 기둥: 스프라이트 대신 입자 */
{const _ab=dsAmbientBuild;dsAmbientBuild=function(){const was=V3.ambSeed;_ab.apply(this,arguments);if(was===V3.ambSeed)return;if(!PFX.on)pfxInit();if(!PFX.on)return;
  PFX.em=PFX.em.filter(e=>!e.plume);
  for(const p of V3.plumes||[]){for(const s of p.sp){V3.G.amb.remove(s);s.material.dispose();}
    const e=pfxEmit({x:p.x,y:p.y0,z:p.z,plume:1,big:p.big,rate:p.big?1.4:.9,fn:q=>pfx({x:q.x+pfxR(-.3,.3)*(q.big?2:1),y:q.y+.1,z:q.z+pfxR(-.3,.3)*(q.big?2:1),vy:q.big?pfxR(.5,.8):pfxR(.35,.55),drag:.04,acc:.005,life:q.big?pfxR(20,28):pfxR(10,15),s0:q.big?.8:.3,s1:q.big?pfxR(5,7):pfxR(1.8,2.6),col:Math.random()<.6?'#3a3430':'#5d554d',a:q.big?.5:.45,fi:.05,em:q.big?'#ff6a1a':null,emI:.8,emK:.05})});
    // 처음부터 다 자란 기둥으로
    const n=Math.round(e.rate*(p.big?24:12));for(let i=0;i<n;i++){e.fn(e);const A=PFX.s.A[0].array;const j=((PFX.s.i-1+PFX.s.cap)%PFX.s.cap)*4;A[j+3]-=Math.random()*(p.big?24:12);}}
  V3.plumes=[];};}
{const _df=dsFrame;dsFrame=function(now,dt){_df.apply(this,arguments);pfxFrame(now,dt);};}
