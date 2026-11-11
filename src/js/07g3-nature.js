/* ===================== 지형과 자연: 화면 =====================
   땅과 숲, 물, 하늘을 실제 풍경에 가깝게 다듬는다. 모두 보이는 것만 바꾸고 판정(시야·엄폐·이동)은 그대로다.
   - 땅 질감: 지면 셰이더에 월드 좌표 잡음 세 겹(큰 얼룩·중간 결·잔 알갱이)을 곱해 칸마다 같은 색으로 보이는 격자 느낌을 없앤다.
     풀밭이 가파르면 흙·돌이 드러난다(비탈 색).
   - 칸 경계: 풀밭·밭·숲 바닥처럼 무른 땅끼리 맞닿은 곳은 이웃 색을 불규칙하게 번지게 해 칼로 자른 듯한 경계를 지운다. 풀 포기·흙 자국도 흩뿌린다.
   - 숲: 칸마다 7~9그루, 키와 굵기가 제각각인 가문비(층층 원뿔)와 소나무(긴 줄기·위쪽 수관)를 섞고, 색을 한 그루씩 조금씩 다르게 한다. 숲 바닥엔 덤불.
   - 덤불: 목초지·숲 가장자리·공원에 낮은 관목을 흩는다.
   - 물: 강·연못·바다 수면에 바람결 잔물결(법선 흔들기), 바다는 해안에서 멀수록 짙어지고 안벽·모래 쪽엔 흰 물거품.
   - 궤도·바퀴 자국: 차량이 흙·풀밭을 지나가면 자국이 남는다(보이는 차량만, 오래된 자국부터 지운다).
   - 하늘: 지평선은 안개색, 위로 갈수록 하늘색인 둥근 하늘. 지도 밖에도 숲·들판을 이어 가장자리가 허공처럼 보이지 않게.
   캠페인 지도(G.camp)는 07c-camp가 따로 그리므로 땅 무늬와 숲만 건너뛴다. */
const NAT={tr:null,trN:0,trI:0,trSeed:null,last:new Map(),t:0};
const NAT_LO=typeof matchMedia==='function'&&matchMedia('(pointer:coarse)').matches;   // 휴대폰: 나무를 조금 덜
const natCl=()=>typeof bmClime==='function'?bmClime():'temp';
const natLay=()=>G&&G.feat&&G.feat.layout||'sym';
// 무른 땅(경계를 번지게 하고 자국이 남는 땅)
const natSoft=x=>!!x&&!x.sea&&!x.rv&&!x.lot&&!x.field&&!x.gas&&!x.quay&&!x.pier&&!x.cy&&(x.t==='park'||x.t==='rubble'||x.crop||x.mead||x.wild||x.fy||x.t==='road'&&x.dirt);

/* ---------- 잡음 텍스처 (이어 붙여도 이음매 없는 값 잡음, 세 채널 서로 다른 결) ---------- */
function natNoiseTex(){if(NAT.noise)return NAT.noise;const T=V3.T,S=256,d=new Uint8Array(S*S*4);const R=mulberry(0x6e61);
  const oct=(cells,amp,arr)=>{const g=[];for(let i=0;i<cells*cells;i++)g.push(R());const at=(i,j)=>g[((j%cells+cells)%cells)*cells+((i%cells+cells)%cells)];
    for(let y=0;y<S;y++)for(let x=0;x<S;x++){const fx=x/S*cells,fy=y/S*cells,i=Math.floor(fx),j=Math.floor(fy);let u=fx-i,v=fy-j;u=u*u*(3-2*u);v=v*v*(3-2*v);
      const a=at(i,j)+(at(i+1,j)-at(i,j))*u,b=at(i,j+1)+(at(i+1,j+1)-at(i,j+1))*u;arr[y*S+x]+=(a+(b-a)*v)*amp;}};
  const ch=[[4,8,16,32],[8,16,32,64],[32,64,128,256]].map(cs=>{const a=new Float32Array(S*S);let tot=0;cs.forEach((c,i)=>{const amp=1/(1+i*.9);tot+=amp;oct(c,amp,a);});for(let i=0;i<a.length;i++)a[i]/=tot;return a;});
  for(let i=0;i<S*S;i++){for(let k=0;k<3;k++){const v=ch[k][i];d[i*4+k]=Math.max(0,Math.min(255,Math.round((v-.5)*1.9*255+128)));}d[i*4+3]=255;}
  const tx=new T.DataTexture(d,S,S);tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.magFilter=T.LinearFilter;tx.minFilter=T.LinearMipmapLinearFilter;tx.generateMipmaps=true;tx.needsUpdate=true;NAT.noise=tx;return tx;}

/* ---------- 지면 셰이더: 잡음 얼룩 + 비탈 흙 ---------- */
function natTerrMat(){const m=V3.M&&V3.M.terr;if(!m||m.userData.nat)return;m.userData.nat=1;const ob=m.onBeforeCompile;const nt={value:natNoiseTex()};
  m.onBeforeCompile=function(sh,ren){ob.call(this,sh,ren);sh.uniforms.natN=nt;
    let vs=sh.vertexShader;
    if(vs.includes('float terrH(')){vs=vs.replace('#include <begin_vertex>','#include <begin_vertex>\n{vec2 sp=(modelMatrix*vec4(position,1.)).xz;float hx=terrH(sp+vec2(.25,0.))-terrH(sp-vec2(.25,0.)),hz=terrH(sp+vec2(0.,.25))-terrH(sp-vec2(0.,.25));vNatSl=length(vec2(hx,hz))/.5;}');
      sh.vertexShader='varying float vNatSl;\n'+vs;}else sh.vertexShader='varying float vNatSl;\n'+vs.replace('#include <begin_vertex>','#include <begin_vertex>\nvNatSl=0.;');
    sh.fragmentShader='uniform sampler2D natN;varying float vNatSl;\n'+sh.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
{vec2 wp=vFowW;float n1=texture2D(natN,wp*.045).r,n2=texture2D(natN,wp*.23).g,n3=texture2D(natN,wp*2.1).b,n4=texture2D(natN,wp*.71+.37).b;
 vec3 c=diffuseColor.rgb;float gr=clamp((c.g-max(c.r,c.b))*14.,0.,1.);   // 풀빛일수록 얼룩을 세게
 float k=(1.+(n1-.5)*(.16+.14*gr))*(1.+(n2-.5)*(.10+.12*gr))*(1.+(n3-.5)*.16)*(1.+(n4-.5)*.08);
 c*=k;c=mix(c,c*vec3(1.06,1.03,.86),gr*clamp((n1-.45)*3.,0.,1.)*.5);   // 마른 풀 얼룩
 float sl=clamp((vNatSl-.32)*2.4,0.,1.)*gr;c=mix(c,vec3(.36,.33,.28)*(.85+.3*n3),sl*.7);   // 가파른 풀밭: 흙·돌
 diffuseColor.rgb=c;}`);};
  m.customProgramCacheKey=()=>'fowNnat';m.needsUpdate=true;}

/* ---------- 땅 그림: 무른 땅 경계 번지기, 풀 포기, 바다 깊이·물거품 ---------- */
{const _tt=v3TerrTex;v3TerrTex=function(g,P){_tt(g,P);if(!G||campPlain())return;try{natGround(g,P);}catch(e){console.error(e);}};}
function natGround(g,P){const M=G.map,R=mulberry(((G.seed|0)^0x7a11)>>>0),cl=natCl();const at=(r,c)=>inb(r,c)?M[r][c]:null;
  // 칸마다 평균색: 작은 캔버스로 줄여 읽는다
  const sm=document.createElement('canvas');sm.width=sm.height=N;const sg=sm.getContext('2d');sg.imageSmoothingEnabled=true;sg.imageSmoothingQuality='high';sg.drawImage(g.canvas,0,0,N,N);
  const avg=sg.getImageData(0,0,N,N).data;const colOf=(r,c)=>{const i=(r*N+c)*4;return [avg[i],avg[i+1],avg[i+2]];};
  // 1) 경계 번지기: 이웃 색 덩어리를 경계 안쪽으로 흩뿌린다(양쪽 칸이 서로 하므로 들쭉날쭉한 띠가 된다)
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=M[r][c];if(!natSoft(x)||x.t==='road')continue;const X=c*P,Y=r*P;
    for(const [a,b] of [[-1,0],[1,0],[0,-1],[0,1]]){const y=at(r+a,c+b);if(!natSoft(y)||y.t==='road')continue;const q=colOf(r+a,c+b),p=colOf(r,c);
      if(Math.abs(q[0]-p[0])+Math.abs(q[1]-p[1])+Math.abs(q[2]-p[2])<14)continue;
      const n=Math.round(P*.55);for(let i=0;i<n;i++){const t=R()*P,dep=Math.pow(R(),1.6)*P*.32,rr=1.5+R()*4.5*(1-dep/(P*.4));
        const px=a?X+t:(b<0?X+dep:X+P-dep),py=b?Y+t:(a<0?Y+dep:Y+P-dep);
        g.fillStyle=`rgba(${q[0]},${q[1]},${q[2]},${(.35+R()*.45).toFixed(2)})`;g.beginPath();g.arc(px,py,rr,0,7);g.fill();}}}
  // 2) 풀 포기·흙 자국 (겨울엔 눈 사이로 마른 풀, 사막엔 자갈)
  const TUFT=cl==='winter'?['rgba(120,118,98,.35)','rgba(250,252,255,.4)']:cl==='desert'?['rgba(120,100,70,.35)','rgba(230,210,170,.3)']:cl==='autumn'?['rgba(95,80,45,.4)','rgba(150,120,60,.3)','rgba(40,38,25,.3)']:['rgba(40,48,25,.4)','rgba(120,130,75,.3)','rgba(70,80,40,.35)'];
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=M[r][c];if(!(x.t==='park'||x.mead)||x.crop||x.yard&&R()<.5)continue;const X=c*P,Y=r*P;const n=x.wild?14:26;
    for(let i=0;i<n;i++){const px=X+R()*P,py=Y+R()*P;g.strokeStyle=TUFT[Math.floor(R()*TUFT.length)];g.lineWidth=1;g.beginPath();for(let s=0;s<3;s++){g.moveTo(px,py);g.lineTo(px+(R()-.5)*3,py-1.5-R()*2.5);}g.stroke();}
    if(x.wild){for(let i=0;i<6;i++){g.fillStyle=R()<.5?'rgba(70,55,38,.3)':'rgba(25,22,16,.35)';g.beginPath();g.ellipse(X+R()*P,Y+R()*P,2+R()*4,1+R()*2,R()*3,0,7);g.fill();}}}   // 솔잎 깔린 흙
  // 3) 밭: 줄마다 생육이 조금씩 달라 진하고 옅은 띠, 가장자리 풀 둑
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=M[r][c];if(!x.crop||x.site)continue;const X=c*P,Y=r*P,h=x.cd==='h';
    for(let i=0;i<P;i+=6){if(R()<.35){g.fillStyle=R()<.5?'rgba(0,0,0,.07)':'rgba(255,245,210,.06)';h?g.fillRect(X,Y+i,P,6):g.fillRect(X+i,Y,6,P);}}
    for(const [a,b] of [[-1,0],[1,0],[0,-1],[0,1]]){const y=at(r+a,c+b);if(y&&y.crop)continue;g.fillStyle=cl==='winter'?'rgba(200,205,205,.5)':'rgba(70,82,45,.55)';
      for(let i=0;i<14;i++){const t=R()*P,o=R()*4;g.beginPath();g.arc(a?X+t:(b<0?X+o:X+P-o),b?Y+t:(a<0?Y+o:Y+P-o),1.5+R()*2.5,0,7);g.fill();}}}
  // 4) 바다: 해안에서 멀수록 짙게(칸 거리), 물에 닿은 모래·바위에 물거품
  const sea=[];for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(M[r][c].sea)sea.push([r,c]);
  if(sea.length){const D=new Map();const q=[];for(const [r,c] of sea)for(const [a,b] of BM_NB){const y=at(r+a,c+b);if(y&&!y.sea){D.set(key(r,c),0);q.push([r,c]);break;}}
    for(let i=0;i<q.length;i++){const [r,c]=q[i],d=D.get(key(r,c));for(const [a,b] of BM_NB){const y=at(r+a,c+b);if(!y||!y.sea||D.has(key(r+a,c+b)))continue;D.set(key(r+a,c+b),d+1);q.push([r+a,c+b]);}}
    for(const [r,c] of sea){const d=Math.min(6,D.get(key(r,c))??6),k=d/6;const X=c*P,Y=r*P;g.fillStyle=`rgb(${Math.round(42-26*k)},${Math.round(70-38*k)},${Math.round(74-32*k)})`;g.fillRect(X,Y,P,P);
      for(let i=0;i<6;i++){g.fillStyle='rgba(150,180,185,.05)';g.fillRect(X+R()*P,Y+R()*P,4+R()*10,1);}
      for(const [a,b] of BM_NB){const y=at(r+a,c+b);if(!y||y.sea)continue;const hard=y.quay||y.pier||y.t==='bldg';   // 안벽엔 얇은 거품, 물가엔 넓은 거품
        for(let i=0;i<(hard?10:26);i++){const t=R()*P,o=Math.pow(R(),2)*(hard?4:12);g.fillStyle=`rgba(225,232,230,${(.25+R()*.45).toFixed(2)})`;g.beginPath();g.arc(a?X+t:(b<0?X+o:X+P-o),b?Y+t:(a<0?Y+o:Y+P-o),.8+R()*2.2,0,7);g.fill();}}}}
  // 5) 연못·강가: 물가 쪽 젖은 흙 띠
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=M[r][c];if(!natSoft(x)||x.t==='road')continue;const X=c*P,Y=r*P;
    for(const [a,b] of BM_NB){const y=at(r+a,c+b);if(!y||!(y.t==='water'&&!y.sea&&!y.rv))continue;g.fillStyle=cl==='winter'?'rgba(150,160,165,.5)':'rgba(48,42,32,.45)';
      for(let i=0;i<16;i++){const t=R()*P,o=Math.pow(R(),1.5)*7;g.beginPath();g.arc(a?X+t:(b<0?X+o:X+P-o),b?Y+t:(a<0?Y+o:Y+P-o),1.5+R()*3,0,7);g.fill();}}}}

/* ---------- 나무 형상 ---------- */
function natMerge(parts){const T=V3.T;let n=0;const ps=parts.map(g=>g.index?g.toNonIndexed():g);for(const g of ps)n+=g.attributes.position.count;const P=new Float32Array(n*3);let o=0;
  for(const g of ps){P.set(g.attributes.position.array,o);o+=g.attributes.position.array.length;g.dispose();}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(P,3));geo.computeVertexNormals();
  // 아래는 그늘져 어둡고 꼭대기는 볕을 받아 밝게(정점 색 × 그루마다 색)
  let top=0;for(let i=1;i<P.length;i+=3)top=Math.max(top,P[i]);const C=new Float32Array(P.length);for(let i=0;i<P.length;i+=3){const v=.62+.55*Math.pow(P[i+1]/(top||1),1.3);C[i]=v;C[i+1]=v;C[i+2]=v*.96;}
  geo.setAttribute('color',new T.BufferAttribute(C,3));return geo;}
function natGeos(){if(NAT.geo)return NAT.geo;const T=V3.T;const G3={};
  // 가문비: 높이 1(=12m 기준 크기 s), 층층이 좁아지는 원뿔 네 겹. 바닥이 안 보이는 시점이 대부분이라 원뿔 밑면은 뺀다
  {const p=[new T.CylinderGeometry(.012,.018,.22,4,1,true).translate(0,.11,0)];const tiers=[[.15,.12,.34],[.36,.105,.3],[.56,.08,.26],[.74,.05,.26]];
    for(const [y,rad,h] of tiers)p.push(new T.ConeGeometry(rad,h,6,1,true).translate(0,y+h/2,0));G3.spruce=natMerge(p);}
  // 소나무: 곧고 긴 줄기, 위쪽에 납작한 수관 두세 덩어리 (참고 사진의 산 숲)
  {const p=[new T.CylinderGeometry(.01,.017,.62,4,1,true).translate(0,.31,0)];
    p.push(new T.OctahedronGeometry(.1,0).scale(1,.75,1).translate(0,.66,0),new T.OctahedronGeometry(.08,0).scale(1,.8,1).translate(.05,.78,.02),new T.OctahedronGeometry(.065,0).scale(1,.9,1).translate(-.03,.86,-.03),
      new T.ConeGeometry(.085,.3,6,1,true).translate(0,.52,0));G3.pine=natMerge(p);}
  // 덤불: 납작한 팔면체 두 개
  G3.bush=natMerge([new T.OctahedronGeometry(.05,0).scale(1.2,.6,1).translate(0,.025,0),new T.OctahedronGeometry(.035,0).scale(1,.7,1.1).translate(.035,.02,.015)]);
  // 지도 밖 먼 나무: 아주 단순한 원뿔
  G3.far=new T.ConeGeometry(.16,.85,5,1,true).translate(0,.425,0);
  NAT.geo=G3;return G3;}
function natMats(){if(NAT.mat)return NAT.mat;const T=V3.T;
  const M={tree:new T.MeshStandardMaterial({color:'#ffffff',roughness:1,flatShading:true,vertexColors:true}),bush:new T.MeshStandardMaterial({color:'#ffffff',roughness:1,flatShading:true,vertexColors:true}),
    far:new T.MeshStandardMaterial({color:'#ffffff',roughness:1,flatShading:true}),out:new T.MeshStandardMaterial({color:'#ffffff',roughness:1})};
  for(const k of ['tree','bush'])v3FowMat(M[k]);NAT.mat=M;return M;}
// 기후별 잎 색: [가문비, 소나무, 덤불, 먼 숲]
const NAT_PAL={
  temp:{sp:['#475a37','#4f623c','#3e5034','#58683f','#4a5d3a','#647043'],pi:['#5c6b3e','#677442','#737848','#556338','#6c7a45'],bu:['#4a5833','#566238','#646a44','#405034'],far:'#3e4c36',dead:'#6b5a40'},
  autumn:{sp:['#3e4e34','#465638','#4f5c3a','#3a4a31'],pi:['#56603a','#6a6538','#5a5833'],bu:['#7a5a2a','#8a4a24','#6e5a30','#5a4a2a'],far:'#3e4030',dead:'#7a5a36'},
  winter:{sp:['#dfe3e6','#cfd6d9','#5a6455','#e8ebed','#bfc8c8','#48524a'],pi:['#d6dbdd','#6a7260','#c4ccce'],bu:['#c9cfd2','#a9b0b0','#d6dadc'],far:'#c8ced1',dead:'#8a8478'},
  desert:{sp:['#56593a','#4f5536','#5e6040'],pi:['#6a6a44','#5f6240','#75714a'],bu:['#7a7450','#6e6a44','#8a8058','#62603e'],far:'#7a6e52',dead:'#8a7656'}};

/* 숲 칸의 나무들 — 07g2 bmBuildWorld가 숲 칸(x.wild)에 원래 놓던 큰 원뿔 대신 */
function natWildTrees(r,c,x,out){const k=key(r,c),cl=natCl(),pal=NAT_PAL[cl]||NAT_PAL.temp;const H=(s)=>v3Hash(k,s);
  // 3×3 칸 격자에서 흔들어 놓고 몇 개는 뺀다 → 칸 경계에서도 숲이 이어져 보인다
  const keep=NAT_LO?.62:.86;let i=0;
  for(let a=0;a<3;a++)for(let b=0;b<3;b++){i++;if(H(1100+i)>keep)continue;
    const px=c+(b+.5)/3+(H(1120+i)-.5)*.3,pz=r+(a+.5)/3+(H(1140+i)-.5)*.3;
    const big=H(1160+i),s=.62+big*big*.75;   // 대부분 중간, 가끔 큰 나무
    const pine=H(1180+i)<(cl==='desert'?.7:.32),dead=H(1200+i)<.025;
    const pl=pine?pal.pi:pal.sp;const col=dead?pal.dead:pl[Math.floor(H(1220+i)*pl.length)];
    (pine?out.pine:out.spruce).push({x:px,y:0,z:pz,s,sy:s*(.85+H(1240+i)*.45),ry:H(1260+i)*6.28,rx:(H(1280+i)-.5)*.08,rz:(H(1300+i)-.5)*.08,col,k});}
  // 숲 바닥 덤불
  const nb=NAT_LO?1:2+Math.floor(H(1320)*2);for(let j=0;j<nb;j++)out.bush.push({x:c+.1+H(1330+j)*.8,y:0,z:r+.1+H(1340+j)*.8,s:.8+H(1350+j)*.8,ry:H(1360+j)*6,col:pal.bu[Math.floor(H(1370+j)*pal.bu.length)],k});}

/* ---------- 지면 그룹: 숲·덤불·지도 밖 풍경 ---------- */
{const _bw=v3BuildWorld;v3BuildWorld=function(){_bw();try{natTerrMat();natWorld(V3.G.world);}catch(e){console.error(e);}};}
function natWorld(g){const T=V3.T,M=G.map,cl=natCl(),pal=NAT_PAL[cl]||NAT_PAL.temp,G3=natGeos(),MT=natMats();
  if(!campPlain()){const out={spruce:[],pine:[],bush:[]};
    for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=M[r][c],k=key(r,c),H=s=>v3Hash(k,s);
      if(x.t==='park'&&x.wild&&!x.orch)natWildTrees(r,c,x,out);
      // 목초지·공원·밭 가장자리 덤불(숲과 맞닿은 곳에 더)
      else if(x.mead||x.t==='park'&&!x.yard&&!x.sq||x.crop){let edge=0;for(const [a,b] of [[-1,0],[1,0],[0,-1],[0,1]]){const y=inb(r+a,c+b)?M[r+a][c+b]:null;if(y&&y.wild)edge++;}
        const n=x.crop?(edge?2:0):(edge?3:x.mead?(H(1400)<.45?1:0):(H(1400)<.3?1:0));
        for(let j=0;j<n;j++){let px=c+.08+H(1410+j)*.84,pz=r+.08+H(1420+j)*.84;
          if(x.crop){const e=H(1430+j)<.5?.06:.94;if(H(1440+j)<.5)px=c+e;else pz=r+e;}   // 밭은 둑에만
          out.bush.push({x:px,y:0,z:pz,s:.7+H(1450+j)*.9,ry:H(1460+j)*6,col:pal.bu[Math.floor(H(1470+j)*pal.bu.length)],k});}
        if(edge>=2&&x.mead&&H(1480)<.5)out.spruce.push({x:c+.2+H(1490)*.6,y:0,z:r+.2+H(1491)*.6,s:.5+H(1492)*.3,ry:H(1493)*6,col:pal.sp[Math.floor(H(1494)*pal.sp.length)],k});}}   // 숲 가장자리 어린 나무
    v3Inst(g,G3.spruce,MT.tree,out.spruce,{keys:1});v3Inst(g,G3.pine,MT.tree,out.pine,{keys:1});v3Inst(g,G3.bush,MT.bush,out.bush,{noShadow:1});}
  natOuter(g);}
/* 지도 밖: 바깥 땅에 잡음 얼룩을 입히고, 지도 종류에 따라 숲·들판 나무를 띠 모양으로 */
function natOuter(g){const T=V3.T,cl=natCl(),L=natLay(),pal=NAT_PAL[cl]||NAT_PAL.temp,G3=natGeos(),MT=natMats();
  for(const o of g.children)if(o.isMesh&&o.geometry.parameters&&o.geometry.parameters.width===N+120){const m=o.material;
    if(!m.userData.nat){m.userData.nat=1;const nt={value:natNoiseTex()};m.onBeforeCompile=sh=>{sh.uniforms.natN=nt;
        sh.vertexShader='varying vec2 vNatW;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvNatW=(modelMatrix*vec4(transformed,1.)).xz;');
        sh.fragmentShader='uniform sampler2D natN;varying vec2 vNatW;\n'+sh.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n{float a=texture2D(natN,vNatW*.04).r,b=texture2D(natN,vNatW*.19).g,c=texture2D(natN,vNatW*1.7).b;diffuseColor.rgb*=(.78+.44*a)*(.9+.2*b)*(.9+.2*c);}');};
      m.customProgramCacheKey=()=>'natOut';m.needsUpdate=true;}}
  if(campPlain())return;
  const dens={forest:2.4,country:.5,port:.12,river:.25,sym:.18}[L]??.2;const n=NAT_LO?dens*.6:dens;const far=[];const R=mulberry(((G.seed|0)^0x0a7e)>>>0);
  const band=10,A=-band,B=N+band;const area=(B-A)*(B-A)-N*N;const cnt=Math.min(9000,Math.round(area*n));
  for(let i=0;i<cnt;i++){let x=A+R()*(B-A),z=A+R()*(B-A);if(x>-.3&&x<N+.3&&z>-.3&&z<N+.3)continue;
    // 들판 지도는 띠 모양 수림(밭 사이 방풍림)이 되도록 줄무늬 잡음으로 거른다
    if(L==='country'&&Math.sin(x*.55+Math.sin(z*.21)*2)*Math.sin(z*.47+x*.13)<.2)continue;
    const s=.7+R()*.7;const tone=R();far.push({x,y:0,z,s,sy:s*(.9+R()*.5),ry:R()*6,col:'#'+new T.Color(pal.far).offsetHSL((R()-.5)*.03,0,(tone-.5)*.08).getHexString()});}
  v3Inst(g,G3.far,MT.far,far,{noShadow:1});}

/* ---------- 물결: 강·연못·바다 수면 ---------- */
NAT.wT={value:0};
function natWaterMat(m,sea){if(!m||m.userData.natW)return;m.userData.natW=1;const ob=m.onBeforeCompile;
  m.onBeforeCompile=function(sh,ren){if(ob)ob.call(this,sh,ren);sh.uniforms.natT=NAT.wT;
    if(!sh.vertexShader.includes('vFowW')){sh.vertexShader='varying vec2 vFowW;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFowW=(modelMatrix*vec4(transformed,1.)).xz;');sh.fragmentShader='varying vec2 vFowW;\n'+sh.fragmentShader;}
    sh.fragmentShader='uniform float natT;\n'+sh.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
{vec2 p=vFowW*${sea?'7.':'8.'};float t=natT;
 vec2 gw=vec2(cos(p.x*1.31+p.y*.42+t*1.1)*.9+cos(p.x*2.73-p.y*1.91+t*1.7)*.5+cos(p.x*5.1+p.y*3.7-t*2.3)*.3,
              cos(p.y*1.13-p.x*.37+t*.9)*.9+cos(p.y*2.31+p.x*1.73-t*1.3)*.5+cos(p.y*4.7-p.x*3.3+t*2.1)*.3)*${sea?'.035':'.03'};
 normal=normalize(normal+(viewMatrix*vec4(gw.x,0.,gw.y,0.)).xyz);}`);};
  const ck=m.customProgramCacheKey;m.customProgramCacheKey=()=>(ck?ck.call(m):'')+'natW'+(sea?1:0);m.needsUpdate=true;}
{const _bw=v3BuildWorld;v3BuildWorld=function(){_bw();try{
  if(V3.terrM)natWaterMat(V3.terrM.water,0);if(V3.pm)natWaterMat(V3.pm.water,0);
  if(V3.bmM){natWaterMat(V3.bmM.sea,1);const s=V3.bmM.sea;if(!s.userData.natA){s.userData.natA=1;s.transparent=true;s.opacity=.8;s.color.set('#5d7c86');s.roughness=.32;s.needsUpdate=true;}}   // 바다: 비치게 해 땅 그림의 깊이·물거품이 보인다
  }catch(e){console.error(e);}};}

/* ---------- 궤도·바퀴 자국 ---------- */
function natTrackInit(){if(NAT.tr)return;const T=V3.T;const CAP=NAT_LO?1500:3500;
  const tex=v3Tex(32,32,(g,w,h)=>{g.clearRect(0,0,w,h);for(const x0 of [3,21]){g.fillStyle='rgba(255,255,255,.75)';g.fillRect(x0,0,8,h);g.fillStyle='rgba(255,255,255,1)';for(let y=0;y<h;y+=4)g.fillRect(x0,y,8,2);}});
  tex.colorSpace=T.NoColorSpace;
  const mat=new T.MeshStandardMaterial({color:'#2e271e',roughness:1,transparent:true,opacity:.62,alphaMap:tex,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});v3FowMat(mat);
  const geo=new T.PlaneGeometry(1,1).rotateX(-Math.PI/2);const im=new T.InstancedMesh(geo,mat,CAP);im.count=0;im.frustumCulled=false;im.receiveShadow=true;im.renderOrder=1;
  const col=new Float32Array(CAP*3).fill(1);im.instanceColor=new T.InstancedBufferAttribute(col,3);
  NAT.tr=im;NAT.cap=CAP;NAT.m4=new T.Matrix4();NAT.q=new T.Quaternion();NAT.v=new T.Vector3();NAT.sv=new T.Vector3();NAT.e=new T.Euler();NAT.c=new T.Color();V3.scene.add(im);}
function natTracks(dt){if(!G||G.camp&&!G.feat)return;natTrackInit();const T=V3.T,im=NAT.tr;
  if(NAT.trSeed!==V3.seed){NAT.trSeed=V3.seed;NAT.trN=0;NAT.trI=0;im.count=0;NAT.last.clear();}
  const cl=natCl(),tc=cl==='winter'?'#5a5550':cl==='desert'?'#6e5a40':'#2e271e';let add=false;
  for(const u of G.units){const t=UT[u.type];if(!t||t.cls!=='veh'||t.fly||u.dead)continue;const o=V3.uo.get(u.id);if(!o||!o.visible)continue;
    const x=o.position.x,z=o.position.z;const L=NAT.last.get(u.id);if(!L){NAT.last.set(u.id,[x,z]);continue;}
    const dx=x-L[0],dz=z-L[1],d=Math.hypot(dx,dz);if(d<.07)continue;NAT.last.set(u.id,[x,z]);if(d>.6)continue;   // 순간 이동(배치·재생성)은 건너뛴다
    const r=Math.floor(z),c=Math.floor(x);if(!inb(r,c))continue;const tile=G.map[r][c];if(!natSoft(tile)&&!(tile.t==='road'&&tile.rural&&cl==='winter'))continue;
    const V=typeof VEH==='object'&&VEH[u.type]||{hw:.12,trk:0};const w=V.hw*2*(V.trk?1.05:.95);
    const i=NAT.trI;NAT.v.set(x-dx/2,0.006,z-dz/2);NAT.e.set(0,-Math.atan2(dz,dx)+Math.PI/2,0);NAT.q.setFromEuler(NAT.e);NAT.sv.set(w,1,d*1.05);NAT.m4.compose(NAT.v,NAT.q,NAT.sv);
    im.setMatrixAt(i,NAT.m4);NAT.c.set(tc).multiplyScalar(V.trk?1:1.25);im.setColorAt(i,NAT.c);NAT.trI=(i+1)%NAT.cap;NAT.trN=Math.min(NAT.cap,NAT.trN+1);add=true;}
  if(add){im.count=NAT.trN;im.instanceMatrix.needsUpdate=true;im.instanceColor.needsUpdate=true;}}

/* ---------- 하늘: 지평선 안개색 → 위로 하늘색 ---------- */
function natSkyInit(){if(NAT.sky)return;const T=V3.T;
  const mat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,depthTest:false,fog:false,uniforms:{hz:{value:new T.Color()},top:{value:new T.Color()},sunD:{value:new T.Vector3(0,1,0)},sunC:{value:new T.Color()}},
    vertexShader:'varying vec3 vD;void main(){vD=normalize(position);vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_Position.z=gl_Position.w*.9999;}',
    fragmentShader:'uniform vec3 hz,top,sunC;uniform vec3 sunD;varying vec3 vD;void main(){float h=clamp(vD.y,0.,1.);vec3 c=mix(hz,top,pow(h,.55));float s=max(0.,dot(normalize(vD),normalize(sunD)));c+=sunC*(pow(s,40.)*.35+pow(s,6.)*.08);gl_FragColor=vec4(c,1.);}'});
  const m=new T.Mesh(new T.SphereGeometry(200,24,12),mat);m.renderOrder=-10;m.frustumCulled=false;NAT.sky=m;V3.scene.add(m);}
function natSky(){natSkyInit();const T=V3.T,u=NAT.sky.material.uniforms,s=V3.cs;const fc=V3.scene.fog.color;
  const nk=typeof nightK==='function'?nightK():0;const cl=natCl();
  u.hz.value.copy(fc);NAT.c2=NAT.c2||new T.Color();NAT.c2.set(nk>.5?'#0d1626':cl==='desert'?'#9fb6c8':cl==='winter'?'#a9b8c6':'#7e98b2');
  u.top.value.copy(fc).lerp(NAT.c2,.62*(1-.4*(ENV3.wr||0))*(1-.7*(ENV3.wf||0)));
  u.sunD.value.copy(V3.sun.position).sub(V3.sun.target.position);u.sunC.value.copy(V3.sun.color).multiplyScalar((1-nk)*(1-(ENV3.wr||0)*.8));
  NAT.sky.position.copy(V3.cam.position);}

{const _ef=v3EnvFrame;v3EnvFrame=function(now,dt){_ef(now,dt);if(!G||!V3.on)return;try{NAT.wT.value=now/1000%1000;natSky();natTracks(dt);}catch(e){console.error(e);}};}
