/* ===================== 지상 차량 모형: 실제 장비처럼 =====================
   한서의 요청(실제 UH-1 사진처럼 현실적으로)에 맞춰 지상 차량을 모두 다시 만든다.
   - 실제 치수(1m = MU)와 실제 장비의 생김새: 궤도 고리와 보기륜, 측면 스커트, 포탑 해치·조준경·연막탄 발사기,
     안테나, 짐 묶음, 바퀴 허브, 유리창, 전조등. 짝수 세력은 서방식(M1·스트라이커·험비·K9·하이마스),
     홀수 세력은 동구권식(T-90·BTR·테크니컬·그라드).
   - 위장 도색: 세력마다 다른 3색 무늬를 셰이더로 칠한다(차량 기준 좌표라 움직여도 무늬가 따라간다).
     아래쪽과 윗면에는 흙먼지, 전체에 얼룩. 겨울 지도에서는 흰 칠을 덧바른다.
   - 세력 표식: 차체 옆·뒤와 윗면(위에서 보는 시점)에 흰 기호(Λ, +, △, =), 안테나에 세력 색 띠.
   - 성능: 차종·세력마다 한 번 만들고, 움직이는 덩어리(차체·포탑·발사대)마다 재질별로 형상을 하나로 합친다.
     그래서 부품이 많아져도 차량 한 대는 메쉬 10여 개다.
   기존 함수(v3VehicleM, v3VehBuild, v3ZuBuild, v3MlrsBuild, v3AmbBuild, v3LogiBuild)를 이 파일이 대신한다.
   포탑은 userData.turret, 세력 몸체는 userData.body 표시를 그대로 지킨다(07x2-motion, 07b-destruct가 쓴다). */
const VX={mats:new Map(),U:null};
const VX_CAMO=[// [바탕, 무늬1, 무늬2] 바랜 군용색
  ['#4d5139','#5f523c','#26271f'],   // 0 서방 3색(녹·갈·흑)
  ['#8b8066','#666446','#6d5a42'],   // 1 사막 황토 + 올리브·갈색 줄무늬
  ['#535a40','#77714f','#2a2b24'],   // 2 녹색 + 모래·흑
  ['#64665a','#43443c','#8a846f']];  // 3 회녹 + 짙은 회·모래
const VX_CIV=['#b8b09c','#3a3a38','#8c8270','#d0ccc2'];
const VX_GLSL=`
float vxH(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float vxN(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
  return mix(mix(mix(vxH(i),vxH(i+vec3(1,0,0)),f.x),mix(vxH(i+vec3(0,1,0)),vxH(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(vxH(i+vec3(0,0,1)),vxH(i+vec3(1,0,1)),f.x),mix(vxH(i+vec3(0,1,1)),vxH(i+vec3(1,1,1)),f.x),f.y),f.z);}
float vxF(vec3 p){return .55*vxN(p)+.3*vxN(p*2.1+5.2)+.15*vxN(p*4.3+1.7);}`;
function vxUni(){if(VX.U)return VX.U;const T=V3.T;return VX.U={uDust:{value:new T.Color('#8f8268')},uWash:{value:0}};}
/* 차량 재질: k=종류, camo=위장 세 색(없으면 단색), dk=흙먼지 정도 */
function vxMat(key,o){if(VX.mats.has(key))return VX.mats.get(key);const T=V3.T;const U=vxUni();
  const m=new T.MeshStandardMaterial({color:o.c||'#ffffff',roughness:o.r??.85,metalness:o.mt??.1,flatShading:o.flat!==false,map:o.map||null,vertexColors:!!o.vc,emissive:o.em||'#000000',emissiveIntensity:o.ei??1});
  const camo=o.camo;const u={uC0:{value:new T.Color(camo?camo[0]:'#fff')},uC1:{value:new T.Color(camo?camo[1]:'#fff')},uC2:{value:new T.Color(camo?camo[2]:'#fff')},
    uK:{value:camo?1:0},uDK:{value:o.dk??1},uSc:{value:o.sc||7.5}};
  m.onBeforeCompile=function(sh,ren){const P=V3.T.Material.prototype.onBeforeCompile;if(P)P.call(this,sh,ren);   // 지형 높이 훅(07g)을 먼저: 빠지면 차가 언덕 속에 묻힌다
    Object.assign(sh.uniforms,u,{uDust:U.uDust,uWash:U.uWash});
    sh.vertexShader='attribute vec3 aV;\nvarying vec3 vV;\nvarying vec3 vON;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvV=aV;vON=normal;');
    sh.fragmentShader='uniform vec3 uC0,uC1,uC2,uDust;uniform float uK,uDK,uSc,uWash;varying vec3 vV;varying vec3 vON;\n'+VX_GLSL+'\n'+sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
  {vec3 q=vV*uSc;
   if(uK>.5){float a=vxF(q*vec3(1.,1.7,1.)),b=vxF(q*vec3(1.2,1.9,1.2)+17.3);vec3 c=mix(uC0,uC1,smoothstep(.5,.53,a));c=mix(c,uC2,smoothstep(.6,.63,b)*(1.-smoothstep(.52,.55,a)*.3));diffuseColor.rgb=c;}
   float g=vxN(vV*190.);diffuseColor.rgb*=.86+.24*g;
   float h=vV.y*12.;float n=vxN(vV*55.);
   float d=(1.-smoothstep(.15,1.25+n*.4,h))*.6+smoothstep(.7,.95,vON.y)*.25*(.5+.7*n);
   diffuseColor.rgb=mix(diffuseColor.rgb,uDust,clamp(d*uDK,0.,.75));
   if(uWash>0.){float w=smoothstep(.38,.55,vxF(vV*28.+3.));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.8,.81,.79),w*uWash*uK);}}`);};
  m.customProgramCacheKey=()=>'vx';
  VX.mats.set(key,m);return m;}
function vxTrackTex(){if(VX.trT)return VX.trT;const T=V3.T;const c=document.createElement('canvas');c.width=64;c.height=8;const x=c.getContext('2d');
  x.fillStyle='#4a4842';x.fillRect(0,0,64,8);for(let i=0;i<64;i+=8){x.fillStyle='#1e1d1b';x.fillRect(i,0,3,8);x.fillStyle='#5c5a52';x.fillRect(i+4,0,1,8);}
  const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(9,9);t.magFilter=T.NearestFilter;VX.trT=t;return t;}
/* 작은 부품 색은 정점 색 하나의 재질로 합친다(그리기 횟수 줄이기) */
const VX_VC={tire:'#1f1f1d',rubber:'#262624',steel:'#3f413c',dark:'#252623',hub:'#3d4033',lens:'#cfc9a8',mark:'#d9d6c8',plate:'#6c6248',bag:'#565743',
  drum:'#3c4636',red:'#b3302a',white:'#e2e0d8',rust:'#6b4630',slat:'#3a3a35',tape:null,canvas:null};
function vxVcCol(k,n){return k==='tape'?(TAPE[n]||'#ccc'):k==='canvas'?(n%2?'#7a7058':'#5d5d48'):VX_VC[k];}
/* 재질 열쇠 → 재질. n=세력 */
function vxMatOf(k,n){
  switch(k){
    case 'vc':return vxMat('vc',{c:'#ffffff',r:.85,mt:.2,vc:1});
    case 'body':return vxMat('body'+n,{camo:VX_CAMO[n%4],r:.82,mt:.12});
    case 'civ':return vxMat('civ'+n,{c:VX_CIV[n%4],r:.55,mt:.25});
    case 'tape':return vxMat('tape'+n,{c:TAPE[n]||'#ccc',r:.9,dk:.2});
    case 'canvas':return vxMat('canvas'+(n%2),{c:n%2?'#7a7058':'#5d5d48',r:1});
    case 'track':return vxMat('track',{c:'#ffffff',map:typeof document!=='undefined'?vxTrackTex():null,r:.9,mt:.35,dk:1.3});
    case 'tire':return vxMat('tire',{c:'#1f1f1d',r:.95,mt:0,dk:1.3});
    case 'rubber':return vxMat('rubber',{c:'#262624',r:.95,mt:0});
    case 'steel':return vxMat('steel',{c:'#3f413c',r:.5,mt:.55});
    case 'dark':return vxMat('dark',{c:'#252623',r:.8,mt:.2});
    case 'hub':return vxMat('hub',{c:'#3d4033',r:.7,mt:.3});
    case 'glass':return vxMat('glass',{c:'#141a1e',r:.2,mt:.7,dk:.35});
    case 'lens':return vxMat('lens',{c:'#cfc9a8',r:.3,mt:.3,em:'#5a5440',ei:.6,dk:.2});
    case 'mark':return vxMat('mark',{c:'#d9d6c8',r:.8,dk:.7});
    case 'plate':return vxMat('plate',{c:'#6c6248',r:.95});
    case 'bag':return vxMat('bag',{c:'#565743',r:1});
    case 'drum':return vxMat('drum',{c:'#3c4636',r:.7,mt:.3});
    case 'red':return vxMat('red',{c:'#b3302a',r:.7,dk:.5});
    case 'white':return vxMat('white',{c:'#e2e0d8',r:.7,dk:.5});
    case 'amber':return vxMat('amber',{c:'#ffb33a',em:'#ff9a1a',ei:.9,r:.4,dk:0});
    case 'blue':return vxMat('blue',{c:'#3b7bff',em:'#2a62ff',ei:1.1,r:.4,dk:0});
    case 'rust':return vxMat('rust',{c:'#6b4630',r:1,mt:.2});
    case 'slat':return vxMat('slat',{c:'#3a3a35',r:.7,mt:.4});
    default:return vxMat('dark',{c:'#252623'});}}

/* ---------- 만드는 도구 (치수는 m) ---------- */
function vxKit(){const T=V3.T,m=MU;const root=new T.Group();const stub=VX.stub||(VX.stub=new T.MeshBasicMaterial());
  const put=(geo,k,x,y,z,par,r)=>{const o=new T.Mesh(geo,stub);o.userData.mk=k||'body';o.position.set(x*m,y*m,z*m);if(r)o.rotation.set(r[0]||0,r[1]||0,r[2]||0);(par||root).add(o);return o;};
  const K={T,m,root,
    G:(x,y,z,par)=>{const g=new T.Group();g.position.set(x*m,y*m,z*m);(par||root).add(g);return g;},
    B:(w,h,d,x,y,z,k,par,r)=>put(new T.BoxGeometry(w*m,h*m,d*m),k,x,y,z,par,r),
    C:(rt,rb,h,x,y,z,k,par,r,seg)=>put(new T.CylinderGeometry(rt*m,rb*m,h*m,seg||8),k,x,y,z,par,r),
    // x축 원통: x0에서 앞(+x)으로 len
    Cx:(r,len,x0,y,z,k,par,seg,r2)=>put(new T.CylinderGeometry((r2??r)*m,r*m,len*m,seg||8),k,x0+len/2,y,z,par,[0,0,-Math.PI/2]),
    Cz:(r,w,x,y,z,k,par,seg)=>put(new T.CylinderGeometry(r*m,r*m,w*m,seg||12),k,x,y,z,par,[Math.PI/2,0,0]),
    // 옆모습 다각형(x,y)을 폭 w로
    P:(pts,w,x,y,z,k,par)=>put(v3Prism(pts.map(([a,b])=>[a*m,b*m]),w*m),k,x,y,z,par),
    // 위에서 본 다각형(x,z)을 높이 h로(아래 y)
    PT:(pts,h,x,y,z,k,par)=>{const s=new T.Shape();pts.forEach(([a,b],i)=>i?s.lineTo(a*m,-b*m):s.moveTo(a*m,-b*m));s.closePath();
      const g=new T.ExtrudeGeometry(s,{depth:h*m,bevelEnabled:false});g.rotateX(-Math.PI/2);return put(g,k,x,y,z,par);},
    // 위 반원통(x축): 천막 덮개·갈빗대
    H:(r,len,x0,y,z,k,par,sy)=>{const g=new T.CylinderGeometry(r*m,r*m,len*m,10,1,true,0,Math.PI);g.rotateZ(Math.PI/2);g.scale(1,sy||1,1);return put(g,k,x0+len/2,y,z,par);},
    S:(rx,ry,rz,x,y,z,k,par,half)=>{const g=new T.SphereGeometry(1,12,half?5:8,0,Math.PI*2,0,half?Math.PI/2:Math.PI);g.scale(rx*m,ry*m,rz*m);return put(g,k,x,y,z,par);}};
  /* 바퀴: 타이어 + 허브 + 볼트 원판 */
  K.wheel=(r,w,x,y,z,par,big)=>{const s=Math.sign(z)||1;K.Cz(r,w,x,y,z,'tire',par,12);K.Cz(r*.58,w*.12,x,y,z+s*w*.5,'hub',par,8);K.Cz(r*.22,w*.1,x,y,z+s*(w*.56),'dark',par,6);
    if(big)K.Cz(r*.62,w*1.02,x,y,z,'dark',par,8);};
  /* 궤도 고리(구멍 뚫린 옆모습) + 안쪽 보기륜. 앞 아이들러(xf,yf,rf), 뒤 스프로킷(xr,yr,rr), 땅 닿는 구간 [gr,gf] */
  K.track=(o)=>{const {xf,yf,rf,xr,yr,rr,gf,gr,w,z,t,nw,rw,par}=o;
    const loop=(d)=>{const pts=[];for(let a=90;a>=-55;a-=15){const q=a*Math.PI/180;pts.push([xf+(rf-d)*Math.cos(q),yf+(rf-d)*Math.sin(q)]);}
      pts.push([gf-d*.4,d]);pts.push([gr+d*.4,d]);for(let a=235;a>=90;a-=15){const q=a*Math.PI/180;pts.push([xr+(rr-d)*Math.cos(q),yr+(rr-d)*Math.sin(q)]);}return pts;};
    const s=new T.Shape();loop(0).forEach(([a,b],i)=>i?s.lineTo(a*m,b*m):s.moveTo(a*m,b*m));s.closePath();
    const hl=new T.Path();loop(t).reverse().forEach(([a,b],i)=>i?hl.lineTo(a*m,b*m):hl.moveTo(a*m,b*m));hl.closePath();s.holes.push(hl);
    const g=new T.ExtrudeGeometry(s,{depth:w*m,bevelEnabled:false,curveSegments:4});g.translate(0,0,-w*m/2);put(g,'track',0,0,z,par);
    const ww=w*.86;K.Cz(rf-t-.02,ww,xf,yf,z,'hub',par,10);K.Cz(rr-t-.02,ww,xr,yr,z,'dark',par,10);
    for(let i=0;i<nw;i++){const x=gr+(gf-gr)*(i+.5)/nw;K.Cz(rw,ww,x,t+rw,z,'hub',par,10);K.Cz(rw*.45,ww+.02,x,t+rw,z,'dark',par,6);}
    if(o.ret)for(const x of o.ret)K.Cz(.12,ww*.6,x,o.ry,z,'dark',par,6);};
  /* 표식: 흰 기호. at=[x,y,z], face: 'z+','z-','y','x-','x+', s=크기(m), n=세력 */
  K.mark=(n,at,face,s,par)=>{const sym=n%4;const bars=[];const L=s,W=s*.16;
    if(sym===0)bars.push([-.22*s,0,L*.62,W,.62],[.22*s,0,L*.62,W,-.62]);                 // Λ
    else if(sym===1)bars.push([0,0,L,W,0],[0,0,W,L,0]);                                    // +
    else if(sym===2)bars.push([0,-.29*s,L,W,0],[-.25*s,.144*s,L,W,1.047],[.25*s,.144*s,L,W,-1.047]);  // △
    else bars.push([0,.2*s,L,W,0],[0,-.2*s,L,W,0]);                                       // =
    const th=.02;for(const [u,v,a,b,rot] of bars){let o;
      if(face==='y'){o=K.B(a,th,b,at[0]+u,at[1],at[2]+v,'mark',par,[0,-rot,0]);}
      else if(face[0]==='z'){const sg=face[1]==='+'?1:-1;o=K.B(a,b,th,at[0]+u*sg,at[1]+v,at[2],'mark',par,[0,0,rot*sg]);}
      else{const sg=face[1]==='+'?1:-1;o=K.B(th,b,a,at[0],at[1]+v,at[2]-u*sg,'mark',par,[rot*sg,0,0]);}}};
  /* 안테나: 얇은 막대 + 세력 색 띠 */
  K.ant=(x,y,z,h,par)=>{K.C(.012,.025,h,x,y+h/2,z,'dark',par,null,4);K.B(.05,.22,.05,x,y+h*.86,z,'tape',par);K.C(.07,.07,.1,x,y+.05,z,'dark',par,null,6);};
  /* 연막탄 발사기 묶음 */
  K.smoke=(x,y,z,side,par,n=3)=>{for(let i=0;i<n;i++)K.Cx(.06,.32,x-.1,y+.02*i,z+side*(i*.13),'dark',par,6);};
  /* 기관총 */
  K.mg=(x,y,z,len,par,heavy)=>{K.B(.55,.16,.14,x,y,z,'steel',par);K.Cx(heavy?.035:.025,len,x+.25,y+.02,z,'steel',par,6);K.B(.22,.18,.1,x+.05,y-.02,z+(heavy?.12:.1),'plate',par);};
  /* 짐: 천 주머니·말린 위장망·연료통 */
  K.bag=(x,y,z,l,par,k)=>K.B(l,.35,.45,x,y,z,k||'bag',par);
  K.roll=(x,y,z,l,par)=>K.Cz(.2,l,x,y,z,'canvas',par,8);
  K.can=(x,y,z,par)=>{K.B(.18,.46,.34,x,y,z,'drum',par);K.B(.04,.06,.2,x,y+.25,z,'dark',par);};
  /* 전조등 */
  K.lamp=(x,y,z,par)=>{K.B(.08,.16,.2,x,y,z,'dark',par);K.B(.02,.11,.15,x+.045,y,z,'lens',par);};
  return K;}

/* ---------- 재질별로 합치기 ----------
   그룹(차체·포탑·발사대)마다 바로 아래 메쉬들을 재질 열쇠별로 한 형상으로 합친다.
   aV: 차량 기준 좌표(정지 자세). 위장 무늬와 흙먼지가 이 좌표를 쓴다. */
function vxBake(root,n){const T=V3.T;const col=new T.Color();root.updateMatrixWorld(true);const inv=new T.Matrix4().copy(root.matrixWorld).invert();
  const walk=(grp)=>{const byK=new Map();for(const c of [...grp.children]){if(c.isMesh&&c.userData.mk){const b=c.userData.mk in VX_VC?'vc':c.userData.mk;if(!byK.has(b))byK.set(b,[]);byK.get(b).push(c);grp.remove(c);}else if(c.isGroup)walk(c);}
    const gm=new T.Matrix4().multiplyMatrices(inv,grp.matrixWorld);
    for(const [k,list] of byK){const P=[],Nn=[],UV=[],AV=[],CC=[];const v=new T.Vector3();
      for(const o of list){o.updateMatrix();let g=o.geometry.index?o.geometry.toNonIndexed():o.geometry;g.applyMatrix4(o.matrix);
        const pa=g.attributes.position.array,na=g.attributes.normal.array,ua=g.attributes.uv?g.attributes.uv.array:null;
        for(let i=0;i<pa.length;i+=3){P.push(pa[i],pa[i+1],pa[i+2]);Nn.push(na[i],na[i+1],na[i+2]);v.set(pa[i],pa[i+1],pa[i+2]).applyMatrix4(gm);AV.push(v.x,v.y,v.z);}
        const nv=pa.length/3;for(let i=0;i<nv;i++){UV.push(ua?ua[i*2]:0,ua?ua[i*2+1]:0);}
        if(k==='vc'){col.set(vxVcCol(o.userData.mk,n));for(let i=0;i<nv;i++)CC.push(col.r,col.g,col.b);}
        if(g!==o.geometry)g.dispose();o.geometry.dispose();}
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(P,3));geo.setAttribute('normal',new T.Float32BufferAttribute(Nn,3));
      geo.setAttribute('uv',new T.Float32BufferAttribute(UV,2));geo.setAttribute('aV',new T.Float32BufferAttribute(AV,3));if(k==='vc')geo.setAttribute('color',new T.Float32BufferAttribute(CC,3));geo.computeBoundingSphere();
      const mesh=new T.Mesh(geo,VX.stub);mesh.userData.mk=k;if(k==='body')mesh.userData.body=1;mesh.userData.keepGeo=1;grp.add(mesh);}};
  walk(root);return root;}

/* ===================== 차종별 ===================== */
/* 주력전차. 서방식(M1/K2 꼴): 쐐기 포탑, 측면 스커트, 7개 보기륜. 동구권식(T-90 꼴): 낮은 둥근 포탑, 반응장갑, 머리 위 철망, 뒤 연료통 */
function vxTank(K,n){const east=n%2===1;const {B,C,Cx,P,PT,S,G}=K;
  const tw=.64,tz=1.53;
  for(const s of [-1,1])K.track(east?{xf:3.15,yf:.62,rf:.36,xr:-3.3,yr:.66,rr:.38,gf:2.7,gr:-2.85,w:.6,z:s*tz,t:.08,nw:6,rw:.37}
                                    :{xf:3.25,yf:.72,rf:.38,xr:-3.4,yr:.75,rr:.42,gf:2.75,gr:-2.8,w:tw,z:s*tz,t:.08,nw:7,rw:.33});
  P([[-3.7,.5],[3.35,.5],[3.9,1.12],[-3.75,1.12]],2.3,0,0,0);                            // 아래 차체(궤도 사이)
  if(!east){
    P([[-3.9,1.1],[3.85,1.1],[3.95,1.25],[1.6,1.62],[-3.9,1.6]],3.66,0,0,0);              // 위 차체(궤도 위까지)
    for(const s of [-1,1]){B(6.9,.62,.07,.3,.82,s*1.86);for(const x of [-2.1,-.7,.7,2.1])B(.05,.6,.03,x,.82,s*1.9,'dark');B(.6,.5,.08,3.6,.85,s*1.84);} // 측면 스커트·이음매
    B(1.5,.04,2.6,-3.1,1.62,0,'dark');for(let i=0;i<6;i++)B(.06,.05,2.5,-3.75+i*.27,1.65,0,'steel');                     // 뒤 엔진 덮개 격자
    B(.7,.08,.6,2.3,1.6,0,'dark');for(const z of [-.18,0,.18])B(.06,.08,.12,2.62,1.66,z,'glass');                   // 조종수 해치·잠망경
    for(const s of [-1,1])K.lamp(3.86,1.23,s*1.45);
    K.mark(n,[-2.4,.84,1.92],'z+',.45);K.mark(n,[-2.4,.84,-1.92],'z-',.45);K.mark(n,[-3.93,1.35,0],'x-',.45);
  }else{
    P([[-3.7,1.1],[3.45,1.1],[3.9,1.18],[1.8,1.5],[-3.7,1.5]],3.5,0,0,0);
    for(let i=0;i<4;i++)for(let j=-2;j<=2;j++)B(.32,.1,.5,2.25+i*.36,1.42-i*.07,j*.55,0,null,[0,0,.17]);             // 앞 경사판 반응장갑
    for(const s of [-1,1]){B(6.2,.55,.04,0,.86,s*1.79,'rubber');for(let i=0;i<5;i++)B(.48,.44,.1,1.3+i*.5,.88,s*1.83);}   // 고무 스커트 + 앞쪽 반응장갑
    for(const s of [-1,1])K.Cz(.3,1.1,-3.95,1.4,s*.75,'drum');                                                          // 뒤 연료통
    B(1.7,.04,2.4,-2.7,1.51,0,'dark');for(let i=0;i<5;i++)B(.06,.05,2.3,-3.4+i*.3,1.53,0,'steel');
    for(const s of [-1,1])K.lamp(3.5,1.5,s*1.2);
    K.mark(n,[-1.5,.98,1.86],'z+',.5);K.mark(n,[-1.5,.98,-1.86],'z-',.5);K.mark(n,[-3.75,1.32,0],'x-',.4);
    K.mark(n,[2.6,1.5,0],'y',.6);}
  const tur=G(east?-.2:-.35,east?1.5:1.62,0);tur.userData.turret=1;
  if(!east){// 쐐기 포탑
    PT([[2.75,.75],[1.9,1.72],[-2.1,1.78],[-2.3,1.45],[-3.45,1.4],[-3.5,-1.4],[-2.3,-1.45],[-2.1,-1.78],[1.9,-1.72],[2.75,-.75]],.8,0,0,0,'body',tur);
    B(.7,.62,1.0,2.55,.42,0,'body',tur);const gx=2.85;                                                                  // 방패(맨틀릿)
    Cx(.11,2.0,gx,.42,0,'steel',tur,8);Cx(.095,1.6,gx+2.0,.42,0,'steel',tur,8);Cx(.15,.7,gx+1.65,.42,0,'steel',tur,8);Cx(.085,1.0,gx+3.6,.42,0,'steel',tur,8);// 포신·배연기
    B(.14,.08,.08,gx+4.62,.53,0,'dark',tur);
    B(.6,.42,.45,1.35,1.0,.95,'body',tur);B(.04,.28,.34,1.66,1.0,.95,'glass',tur);                                     // 포수 조준경
    C(.18,.2,.48,.8,1.04,-.75,'body',tur);B(.36,.34,.4,.8,1.42,-.75,'body',tur);B(.04,.2,.3,.99,1.42,-.75,'glass',tur);   // 차장 조준경(CITV)
    C(.45,.5,.25,-.5,.92,.75,'dark',tur,null,10);K.mg(-.2,1.25,.75,1.1,tur,true);B(.3,.3,.3,-.6,1.18,.75,'body',tur);       // 차장 해치·원격 기관총
    C(.4,.42,.12,-.5,.86,-.85,'dark',tur,null,10);K.mg(.05,1.15,-.85,.8,tur);B(.06,.4,.7,.25,1.12,-.85,'body',tur);         // 장전수 해치·기관총·방패
    K.smoke(1.95,.62,1.45,1,tur);K.smoke(1.95,.62,-1.45,-1,tur);
    for(const s of [-1,1]){B(1.9,.05,.05,-2.8,1.1,s*1.62,'slat',tur);for(const x of [-3.6,-2.8,-2])B(.05,.35,.05,x,.95,s*1.62,'slat',tur);}  // 뒤 바구니 난간
    K.bag(-2.6,1.0,1.25,1.4,tur);K.roll(-3.1,1.05,0,2.4,tur);K.bag(-2.4,1.0,-1.2,1.0,tur,'plate');K.can(-3.75,.95,-.9,tur);
    K.ant(-3.2,.8,1.3,2.2,tur);K.ant(-3.2,.8,-1.3,1.6,tur);B(.04,.5,.04,1.0,1.05,0,'dark',tur);                         // 안테나·풍향 센서
    K.mark(n,[-1.4,.42,1.79],'z+',.5,tur);K.mark(n,[-1.4,.42,-1.79],'z-',.5,tur);K.mark(n,[-1.0,.81,0],'y',.9,tur);
  }else{// 둥근 주조 포탑 + 반응장갑 + 철망
    S(1.75,.72,1.6,0,0,0,'body',tur,true);B(2.4,.25,2.6,-.4,.08,0,'body',tur);
    for(const s of [-1,1]){B(1.3,.42,.55,1.25,.3,s*.75,'body',tur,[0,s*-.55,0]);B(1.2,.12,.5,1.0,.62,s*.8,'body',tur);}    // 앞 반응장갑 '조개'
    for(let i=0;i<3;i++)for(const s of [-1,1])B(.4,.08,.35,.2-i*.45,.72,s*(.5+i*.08),'body',tur);                        // 지붕 반응장갑
    for(const s of [-1,1]){B(.35,.3,.3,1.35,.55,s*.55,'dark',tur);B(.03,.18,.18,1.53,.55,s*.55,'red',tur);}              // 적외선 교란기(시토라)
    B(.4,.45,.6,1.6,.3,0,'body',tur);const gx=1.75;Cx(.1,1.8,gx,.3,0,'steel',tur,8);Cx(.085,2.6,gx+1.8,.3,0,'steel',tur,8);Cx(.1,.35,gx+4.4,.3,0,'steel',tur,8);
    C(.42,.45,.25,-.3,.75,-.6,'body',tur,null,10);K.mg(-.1,1.08,-.6,1.0,tur,true);B(.3,.3,.25,.25,.95,.6,'body',tur);B(.03,.18,.2,.41,.95,.6,'glass',tur);
    K.smoke(.3,.4,1.45,1,tur,4);K.smoke(.3,.4,-1.45,-1,tur,4);
    K.Cx(.12,2.2,-2.6,.6,1.0,'drum',tur,8);                                                                              // 뒤 스노클 통
    K.bag(-1.6,.5,-1.2,1.0,tur);K.roll(-1.75,.6,.2,1.6,tur);
    for(const [x,z] of [[1.3,1.4],[1.3,-1.4],[-1.6,1.4],[-1.6,-1.4]])B(.06,1.3,.06,x,1.0,z,'slat',tur);                 // 머리 위 철망(코프 케이지)
    for(let i=0;i<8;i++)B(.04,.04,3.0,1.35-i*.42,1.62,0,'slat',tur);for(const z of [-1.4,0,1.4])B(3.1,.04,.04,-.15,1.66,z,'slat',tur);
    K.ant(-1.4,.5,1.2,2.0,tur);
    K.mark(n,[-.6,.4,1.62],'z+',.45,tur);K.mark(n,[-.6,.4,-1.62],'z-',.45,tur);}
}
/* 장갑차. 서방식(스트라이커 꼴 8륜): 상자 차체, 덧댄 장갑판, 원격 사격 무기, 쇠살 장갑. 동구권식(BTR-82 꼴): 뾰족한 배 모양 앞, 작은 원뿔 포탑 */
function vxIfv(K,n){const east=n%2===1;const {B,C,Cx,P,G}=K;
  if(!east){
    for(const x of [2.3,1.05,-.85,-2.1])for(const s of [-1,1])K.wheel(.55,.42,x,.55,s*1.13,null,true);
    P([[-3.45,.5],[2.6,.5],[3.45,1.0],[3.45,1.25],[-3.45,1.25]],2.2,0,0,0);
    P([[-3.5,1.2],[3.45,1.2],[3.5,1.4],[2.35,2.15],[-3.5,2.15]],2.72,0,0,0);
    for(const s of [-1,1]){for(let i=0;i<5;i++)for(let j=0;j<2;j++)B(1.12,.4,.05,-2.8+i*1.18,1.48+j*.44,s*1.38);
      for(let i=0;i<9;i++)B(.05,1.2,.05,-3.35+i*.75,1.55,s*1.62,'slat');for(let j=0;j<4;j++)B(6.1,.04,.05,-.35,1.0+j*.36,s*1.62,'slat');}   // 덧댄 장갑판·쇠살 장갑
    B(.8,.06,.7,2.0,2.17,.65,'dark');for(const z of [.45,.65,.85])B(.05,.08,.12,2.42,2.22,z,'glass');                 // 조종수 해치
    B(.04,1.2,1.6,-3.52,1.3,0,'dark');B(.04,1.1,1.5,-3.54,1.3,0,'body');                                               // 뒤 램프
    for(const s of [-1,1]){K.lamp(3.42,1.32,s*1.15);K.smoke(2.6,2.15,s*1.2,s);}
    K.bag(-2.5,2.32,.8,1.2);K.bag(-2.6,2.32,-.6,1.0,null,'plate');K.roll(-3.1,2.3,0,2.0);K.can(-1.6,2.38,1.1);K.can(-1.4,2.38,1.1);
    B(.9,.4,.04,2.7,1.6,-1.39,'dark');                                                                                // 배기 격자
    K.ant(-3.1,2.15,1.1,2.2);K.ant(-3.1,2.15,-1.1,1.8);
    K.mark(n,[-1.0,1.9,1.44],'z+',.5);K.mark(n,[-1.0,1.9,-1.44],'z-',.5);K.mark(n,[-3.56,1.85,0],'x-',.45);K.mark(n,[.8,2.16,0],'y',.75);
    const tur=G(.3,2.15,-.25);tur.userData.turret=1;                                                                   // 원격 사격 무기(M151 꼴)
    C(.42,.48,.22,0,.11,0,'dark',tur,null,10);B(.5,.5,.5,0,.45,0,'body',tur);K.mg(.25,.55,.0,1.25,tur,true);
    B(.4,.3,.3,.15,.85,-.35,'body',tur);B(.03,.22,.22,.36,.85,-.35,'glass',tur);
    for(let i=0;i<6;i++)B(.12,.14,.12,-1.0+Math.cos(i)*.32,2.22,.7+Math.sin(i)*.32,'glass');                          // 차장 잠망경
  }else{
    for(const x of [2.65,1.3,-1.0,-2.35])for(const s of [-1,1])K.wheel(.56,.4,x,.56,s*1.22,null,true);
    P([[-3.8,.55],[2.6,.55],[3.85,1.15],[3.8,1.35],[-3.8,1.35]],2.5,0,0,0);
    P([[-3.8,1.3],[3.8,1.3],[2.2,2.0],[-3.6,2.0]],2.9,0,0,0);
    for(const s of [-1,1]){B(7.0,.08,.5,-.2,2.08,s*1.22,0,null,[s*.5,0,0]);                                           // 안으로 기운 위 옆판
      B(.9,.75,.05,.15,1.45,s*1.46,'dark');B(.82,.68,.04,.15,1.45,s*1.48);                                             // 옆문(2·3축 사이)
      for(const x of [2.0,-.6,-1.6,-2.6])B(.12,.1,.05,x,1.85,s*1.47,'glass');}
    B(.06,.5,2.0,3.3,1.55,0,0,null,[0,0,-.9]);                                                                         // 앞 파도막이판
    for(const s of [-1,1])K.lamp(3.6,1.38,s*1.0);B(.5,.3,.4,-3.7,1.75,.9,'dark');B(.5,.3,.4,-3.7,1.75,-.9,'dark');   // 배기구
    for(const [x,z] of [[1.8,.6],[1.8,-.6],[-1.6,.6],[-1.6,-.6]])C(.3,.3,.07,x,2.06,z,'dark',null,null,8);             // 둥근 해치
    K.bag(-2.6,2.15,.0,1.6);K.can(-3.2,2.25,.8);K.roll(-3.3,2.2,-.6,1.2);
    K.ant(-3.2,2.0,1.0,2.0);
    K.mark(n,[-2.0,1.65,1.46],'z+',.5);K.mark(n,[-2.0,1.65,-1.46],'z-',.5);K.mark(n,[-3.82,1.6,0],'x-',.4);K.mark(n,[-.8,2.06,0],'y',.75);
    const tur=G(.9,2.0,0);tur.userData.turret=1;                                                                       // 원뿔 포탑 + 30mm 기관포
    C(.55,.78,.58,0,.29,0,'body',tur,null,10);B(.5,.32,.4,.55,.35,0,'body',tur);
    Cx(.06,1.2,.7,.38,0,'steel',tur,6);Cx(.045,1.9,1.9,.38,0,'steel',tur,6);Cx(.06,.2,3.8,.38,0,'steel',tur,6);Cx(.025,.6,.7,.38,-.22,'steel',tur,6);
    B(.35,.28,.25,.15,.7,.45,'body',tur);B(.03,.18,.18,.33,.7,.45,'glass',tur);
    K.smoke(-.2,.35,.75,1,tur);K.smoke(-.2,.35,-.75,-1,tur);}
}
/* 험비(M1151 꼴): 넓고 낮은 차체, 장갑 문, 사수 방패(O-GPK)와 M2 */
function vxHmv(K,n){const {B,C,Cx,P,G}=K;
  for(const [x,z] of [[1.55,1],[1.55,-1],[-1.45,1],[-1.45,-1]])K.wheel(.47,.4,x,.47,z*.93,null,true);
  P([[-2.4,.5],[2.35,.5],[2.4,.98],[1.2,1.2],[-2.4,1.2]],2.18,0,0,0);
  P([[-1.55,1.18],[.92,1.18],[.62,1.9],[-1.55,1.9]],2.0,0,0,0);
  for(const s of [-1,1]){B(1.0,.12,.3,1.55,1.0,s*1.0,0);B(1.0,.12,.3,-1.45,1.0,s*1.0,0);                              // 바퀴 위 펜더
    B(.48,.3,.04,.15,1.6,s*1.01,'glass');B(.48,.3,.04,-.65,1.6,s*1.01,'glass');B(.03,.62,.04,-.25,1.5,s*1.02,'dark');  // 장갑 문 작은 창
    B(.08,.5,.04,.82,1.55,s*1.0,'dark');}
  for(const z of [-.5,.5])B(.05,.32,.8,.78,1.6,z,'glass',null,[0,0,-.4]);                                             // 두 장 앞유리
  for(let i=0;i<6;i++)B(.04,.3,.06,2.39,.78,-.5+i*.2,'dark');B(.18,.12,2.1,2.42,.55,0,'dark');                         // 그릴·범퍼
  for(const s of [-1,1])K.lamp(2.32,.98,s*.75);
  B(.95,.3,2.0,-1.98,1.34,0);K.bag(-2.0,1.65,.5,.8);K.can(-2.2,1.66,-.5);K.can(-1.95,1.66,-.5);
  K.ant(-2.3,1.2,.95,2.4);K.ant(-2.3,1.2,-.95,1.6);
  K.mark(n,[1.75,1.08,0],'y',.55);K.mark(n,[-.25,1.12,1.03],'z+',.35);K.mark(n,[-.25,1.12,-1.03],'z-',.35);
  const tur=G(-.35,1.9,0);tur.userData.turret=1;
  C(.6,.62,.18,0,.09,0,'dark',tur,null,10);
  B(.06,.55,1.1,.55,.5,0,'body',tur);for(const s of [-1,1])B(.06,.55,.55,.35,.5,s*.72,'body',tur,[0,s*.7,0]);           // 사수 방패(앞+양옆)
  B(.07,.22,.2,.56,.66,.28,'glass',tur);B(.07,.22,.2,.56,.66,-.28,'glass',tur);for(const s of [-1,1])B(.5,.45,.06,-.1,.45,s*.6,'body',tur);
  K.mg(.4,.45,0,1.15,tur,true);}
/* 민병대 픽업(테크니컬): 민간 픽업 + 롤바 + 짐칸 중기관총(방패) + 녹·흙먼지 */
function vxTech(K,n,zu){const {B,C,Cx,P,G}=K;const pk=CAR_KINDS.pickup;const sc=pts=>pts.map(([x,y])=>[x,y]);
  P(sc(pk.body),pk.w,0,0,0,'civ');K.P(sc(pk.cab),pk.w-.12,0,0,0,'glass');
  B(1.4,.06,pk.w-.3,.4,1.88,0,'civ');
  for(const s of [-1,1])B(2.6,.35,.08,-1.5,1.3,s*(pk.w/2-.05),'civ');
  for(const [x,z] of [[1.75,1],[1.75,-1],[-1.75,1],[-1.75,-1]])K.wheel(.4,.3,x,.4,z*.85);
  B(.08,.7,1.7,-.25,1.55,0,'dark');B(.08,.08,1.7,-.25,1.9,0,'dark');                                                  // 롤바
  for(const [x,y,z,w,h] of [[.9,1.05,.88,.4,.22],[-2.6,.95,-.88,.5,.25],[1.9,.85,-.9,.35,.18]])B(w,h,.04,x,y,z*(pk.w/2)/.9,'rust');  // 녹
  for(const s of [-1,1])K.lamp(2.2,.9,s*.7);
  if(!zu){K.Cz(.36,.25,-2.1,1.25,.45,'tire',null,10);K.can(-2.6,1.25,-.5);}
  K.mark(n,[1.4,1.12,0],'y',.45);
  const tur=G(-1.6,1.15,0);tur.userData.turret=1;
  if(zu){// ZU-23-2: 쌍열 23mm, 사수석, 탄통, 얇은 방패
    B(1.2,.3,1.3,0,.15,0,'steel',tur);B(.5,.5,.06,.15,.6,.62,'body',tur);B(.5,.5,.06,.15,.6,-.62,'body',tur);B(.35,.12,.35,-.4,.45,0,'dark',tur);
    for(const s of [-1,1]){const b=K.Cx(.045,2.4,.2,.75,s*.25,'steel',tur,6);b.rotation.z+=.32;b.position.y+=.35*MU;B(.45,.32,.18,.15,.55,s*.4,'drum',tur);}
    B(.6,.5,1.0,.4,.75,0,'body',tur);}
  else{C(.08,.12,.9,0,.45,0,'steel',tur,null,6);B(.06,.5,.9,.45,1.05,0,'body',tur);Cx(.045,1.5,.2,.95,0,'steel',tur,6);B(.5,.18,.16,0,.95,0,'steel',tur);Cx(.08,.15,1.7,.95,0,'steel',tur,6);
    B(.22,.18,.12,.05,.88,.14,'drum',tur);}}
/* 자주포(K9·M109 꼴): 큰 상자 포탑을 뒤에, 긴 155mm 포신과 두 겹 포구 제퇴기, 앞 갑판의 포신 고정대 */
function vxSpg(K,n){const {B,C,Cx,P,PT,G}=K;
  for(const s of [-1,1])K.track({xf:3.2,yf:.7,rf:.36,xr:-3.3,yr:.72,rr:.38,gf:2.7,gr:-2.75,w:.55,z:s*1.45,t:.08,nw:6,rw:.34,ret:[2.0,0,-2.0],ry:1.0});
  P([[-3.5,.5],[3.0,.5],[3.6,1.05],[-3.55,1.05]],2.2,0,0,0);
  P([[-3.6,1.0],[3.4,1.0],[3.65,1.2],[2.4,1.55],[-3.6,1.55]],3.4,0,0,0);
  for(const s of [-1,1]){B(6.8,.08,.6,.0,1.08,s*1.5,0);K.lamp(3.5,1.3,s*1.3);}
  B(.9,.06,.7,2.6,1.4,.8,'dark');                                                                                     // 조종수 해치
  K.mark(n,[1.5,1.56,-.6],'y',.5);
  const tur=G(-1.0,1.55,0);tur.userData.turret=1;
  PT([[1.6,1.0],[1.3,1.55],[-2.5,1.55],[-2.5,-1.55],[1.3,-1.55],[1.6,-1.0]],1.3,0,0,0,'body',tur);
  B(.7,.8,1.0,1.75,.6,0,'body',tur);const gx=2.1;
  Cx(.13,1.6,gx,.65,0,'steel',tur,8);Cx(.11,5.6,gx+1.6,.65,0,'steel',tur,8);Cx(.2,.8,gx+2.8,.65,0,'steel',tur,8);              // 포신·배연기
  B(.3,.32,.55,gx+7.35,.65,0,'steel',tur);B(.3,.32,.55,gx+7.8,.65,0,'steel',tur);Cx(.12,.3,gx+7.45,.65,0,'dark',tur,8);        // 두 겹 제퇴기
  for(const s of [-1,1]){B(2.0,.45,.3,-.6,.5,s*1.7,'body',tur);B(.04,.35,.3,.5,.95,s*1.4,'dark',tur);K.smoke(1.3,1.05,s*1.25,s,tur);}  // 옆 짐상자
  C(.38,.42,.25,-.6,1.42,.75,'dark',tur,null,10);K.mg(-.3,1.75,.75,1.1,tur,true);C(.32,.34,.12,-.9,1.36,-.7,'dark',tur,null,10);
  B(.04,.9,1.4,-2.53,.6,0,'dark',tur);K.bag(-1.8,1.45,-.3,1.1,tur);K.roll(-2.2,1.45,.6,1.4,tur);
  K.ant(-2.2,1.3,1.2,2.0,tur);K.ant(-2.2,1.3,-1.2,1.5,tur);
  K.mark(n,[-1.2,.6,1.57],'z+',.6,tur);K.mark(n,[-1.2,.6,-1.57],'z-',.6,tur);K.mark(n,[-.8,1.31,0],'y',1.0,tur);}
/* 군용 트럭 운전실. kind: 'cab'(FMTV 꼴 평평한 앞), 'hood'(우랄·KamAZ 꼴 긴 보닛) */
function vxCab(K,n,x,kind,w=2.4){const {B,C}=K;
  if(kind==='hood'){B(1.6,.95,2.2,x+.9,1.45,0);B(1.6,.2,.4,x+.9,1.0,1.15,0);B(1.6,.2,.4,x+.9,1.0,-1.15,0);           // 보닛·펜더
    for(let i=0;i<7;i++)B(.04,.6,.06,x+1.72,1.3,-.6+i*.2,'dark');K.lamp(x+1.7,1.2,.95);K.lamp(x+1.7,1.2,-.95);
    B(1.5,1.4,w,x-.6,2.0,0);B(.06,.6,w-.3,x+.16,2.35,0,'glass',null,[0,0,-.12]);for(const s of [-1,1])B(.7,.45,.04,x-.5,2.35,s*w/2,'glass');
    K.mark(n,[x+.9,1.94,0],'y',.5);return;}
  B(1.9,1.65,w,x,1.9,0);B(.06,.65,w-.3,x+.95,2.35,0,'glass');B(.06,.06,w-.2,x+.97,2.35,0,'dark');                   // 운전실·두 장 앞유리
  for(let i=0;i<5;i++)B(.04,.55,.06,x+.97,1.45,-.5+i*.25,'dark');B(.2,.2,w+.1,x+1.0,1.0,0,'dark');                   // 그릴·범퍼
  for(const s of [-1,1]){B(.75,.55,.04,x+.2,2.3,s*w/2,'glass');K.lamp(x+.95,1.25,s*(w/2-.25));B(.04,.35,.18,x+1.1,2.25,s*(w/2+.2),'dark');B(.3,.04,.04,x+1.0,2.4,s*(w/2+.08),'dark');}  // 옆창·전조등·거울
  B(1.8,.08,w-.2,x-.05,2.75,0);K.mark(n,[x,2.8,0],'y',.6);}
/* 보급 트럭(6륜): 운전실 + 천막 짐칸(갈빗대), 뒤에서 보이는 탄약 상자, 예비 타이어, 연료통, 배기관 */
function vxSup(K,n){const {B,C,Cx}=K;const east=n%2===1;
  B(7.2,.35,1.1,0,.95,0,'dark');vxCab(K,n,east?1.6:2.6,east?'hood':'cab');
  for(const [x,z] of [[2.7,1],[2.7,-1],[-.7,1],[-.7,-1],[-2.0,1],[-2.0,-1]])K.wheel(.55,.42,x,.55,z*1.05,null,true);
  for(const s of [-1,1]){B(1.0,.12,.4,-1.35,1.18,s*1.05,0);K.Cz(.3,1.0,1.0,.95,s*.75,'drum');}                          // 펜더·연료통
  K.Cz(.5,.3,1.25,1.7,.0,'tire');B(.06,1.2,.06,1.35,2.6,1.0,'dark');                                                   // 예비 타이어·배기관
  B(4.4,.25,2.5,-1.15,1.25,0);for(const s of [-1,1]){B(4.4,.6,.06,-1.15,1.65,s*1.22);for(let i=0;i<6;i++)B(.04,.55,.04,-3.2+i*.82,1.65,s*1.26,'dark');}
  K.H(1.22,4.2,-3.2,2.25,0,'canvas',null,.7);B(4.2,.9,2.44,-1.1,1.8,0,'canvas');for(let i=0;i<5;i++)K.H(1.24,.06,-3.2+i*1.03,2.25,0,'dark',null,.71);   // 천막 덮개·갈빗대
  B(.04,1.4,2.3,-3.22,1.95,0,'dark');for(let i=0;i<3;i++)for(let j=0;j<2;j++)B(.5,.4,.6,-3.05,1.6+j*.42,-.7+i*.7,'plate');   // 뒤 열린 칸의 탄약 상자
  {const mx=east?.8:2.2,my=east?2.78:2.84;K.C(.42,.45,.12,mx+.15,my,.5,'dark',null,null,10);K.mg(mx,my+.2,.5,1.1,null,true);}   // 운전실 위 링 마운트 기관총(05na-pen)
  K.ant(1.4,2.75,-1.0,1.4);K.mark(n,[-1.2,3.22,0],'y',.9);K.mark(n,[-1.2,1.7,1.29],'z+',.5);K.mark(n,[-1.2,1.7,-1.29],'z-',.5);}
/* 구난차(8륜 HEMTT 꼴): 운전실, 장비 상자, 돌아가는 기중기 붐과 고리, 뒤 견인 받침과 땅 버팀, 호박색 경광등 */
function vxRec(K,n){const {B,C,Cx,G}=K;
  B(8.4,.4,1.2,0,1.0,0,'dark');vxCab(K,n,3.0,'cab',2.5);C(.08,.1,.12,2.9,2.84,.85,'amber',null,null,6);C(.08,.1,.12,2.9,2.84,-.85,'amber',null,null,6);
  for(const [x,z] of [[3.1,1],[3.1,-1],[1.8,1],[1.8,-1],[-1.6,1],[-1.6,-1],[-2.9,1],[-2.9,-1]])K.wheel(.6,.45,x,.6,z*1.08,null,true);
  for(const s of [-1,1]){B(3.0,.9,.5,-.3,1.65,s*1.0);for(let i=0;i<3;i++)B(.04,.75,.04,-1.6+i*1.0,1.65,s*1.26,'dark');}   // 장비 상자
  B(4.6,.15,2.5,-.9,1.25,0);K.can(.8,1.55,0);K.roll(.6,1.5,.6,.9);
  B(1.2,.25,.3,-4.6,.85,0,'steel');B(.3,.4,1.0,-4.2,.85,0,'steel');for(const s of [-1,1])B(.5,.9,.3,-3.9,.5,s*1.05,'steel');  // 견인 받침·버팀
  K.mark(n,[.3,1.65,1.26],'z+',.55);K.mark(n,[.3,1.65,-1.26],'z-',.55);
  K.C(.42,.45,.12,2.75,2.84,.6,'dark',null,null,10);K.mg(2.6,3.04,.6,1.1,null,true);   // 운전실 위 링 마운트 기관총(05na-pen)
  const cr=G(-1.6,2.1,0);cr.userData.turret=1;                                                                         // 기중기는 포탑처럼 돈다
  C(.6,.7,.45,0,.2,0,'body',cr,null,10);B(1.0,.6,.9,.2,.65,0,'body',cr);
  const boom=B(5.2,.42,.42,-2.0,1.0,0,'steel',cr,[0,0,-.32]);B(4.0,.3,.3,-2.3,1.1,0,'body',cr,[0,0,-.32]);           // 두 단 붐
  B(.04,1.4,.04,-4.45,1.0,0,'dark',cr);B(.2,.2,.12,-4.45,.25,0,'steel',cr);}
/* 구급차(M997 꼴): 험비 앞부분 + 높은 환자칸. 흰 바탕에 붉은 십자를 양옆·뒤·지붕에 */
function vxAmb(K,n){const {B,C,P}=K;
  for(const [x,z] of [[1.6,1],[1.6,-1],[-1.5,1],[-1.5,-1]])K.wheel(.47,.4,x,.47,z*.93,null,true);
  P([[-2.6,.5],[2.35,.5],[2.4,.98],[1.2,1.2],[-2.6,1.2]],2.18,0,0,0);
  P([[.0,1.18],[.92,1.18],[.62,1.9],[.0,1.9]],2.0,0,0,0);for(const z of [-.5,.5])B(.05,.32,.8,.78,1.6,z,'glass',null,[0,0,-.4]);
  for(let i=0;i<6;i++)B(.04,.3,.06,2.39,.78,-.5+i*.2,'dark');B(.18,.12,2.1,2.42,.55,0,'dark');for(const s of [-1,1])K.lamp(2.32,.98,s*.75);
  B(2.75,1.7,2.15,-1.3,2.0,0);B(.04,1.4,1.0,-2.69,1.95,0,'dark');                                                      // 환자칸·뒷문
  const cross=(x,y,z,face,sz)=>{if(face==='y'){B(sz,.02,sz,x,y,z,'white');B(sz*.7,.03,sz*.2,x,y,z,'red');B(sz*.2,.03,sz*.7,x,y,z,'red');}
    else if(face==='x'){B(.02,sz,sz,x,y,z,'white');B(.03,sz*.7,sz*.2,x,y,z,'red');B(.03,sz*.2,sz*.7,x,y,z,'red');}
    else{B(sz,sz,.02,x,y,z,'white');B(sz*.7,sz*.2,.03,x,y,z,'red');B(sz*.2,sz*.7,.03,x,y,z,'red');}};
  cross(-1.3,2.1,1.09,'z',1.0);cross(-1.3,2.1,-1.09,'z',1.0);cross(-2.71,2.35,0,'x',.6);cross(-1.3,2.86,0,'y',1.4);
  B(.25,.1,.5,.4,1.95,0,'blue');K.ant(-2.4,2.85,.9,1.2);K.can(-2.5,1.4,-.9);}
/* 다연장. 서방식(하이마스 꼴): 6륜 운전실 + 6발 상자. 동구권식(그라드 꼴): 긴 보닛 트럭 + 40발 관 묶음 */
function vxMlrs(K,n){const {B,C,Cx,G}=K;const east=n%2===1;
  B(7.2,.4,1.1,0,1.0,0,'dark');vxCab(K,n,east?1.6:2.7,east?'hood':'cab');
  for(const x of east?[2.6,-.6,-2.0]:[2.6,.2,-1.4,-2.8])for(const s of [-1,1])K.wheel(.55,.42,x,.55,s*1.1,null,true);
  for(const s of [-1,1])K.Cz(.28,.9,.9,.95,s*.75,'drum');B(4.8,.2,2.4,-1.2,1.25,0);K.mark(n,[-1.3,1.25,1.22],'z+',.5);K.mark(n,[-1.3,1.25,-1.22],'z-',.5);
  const tur=G(-1.3,1.35,0);tur.userData.turret=1;B(1.4,.3,1.4,0,.15,0,'dark',tur);
  const box=G(0,.35,0,tur);box.rotation.z=.42;
  if(!east){B(4.6,1.0,2.1,0,.55,0,'body',box);B(4.62,.06,2.12,0,1.05,0,'dark',box);
    for(let i=0;i<2;i++)for(let j=0;j<3;j++){K.Cx(.2,.04,2.3,.3+i*.5,-.6+j*.6,'dark',box,8);}
    K.mark(n,[-.6,1.07,0],'y',.8,box);}
  else{for(let i=0;i<4;i++)for(let j=0;j<10;j++)K.Cx(.062,3.0,-1.5,.15+i*.135,-.62+j*.138,'steel',box,6);
    for(const x of [-1.2,0,1.2])B(.12,.7,1.5,x,.35,0,'body',box);B(3.0,.12,1.5,0,-.05,0,'body',box);}}
/* 자폭 차량: 민간 픽업 앞·옆창을 철판으로 덮고 좁은 틈만 남김, 짐칸에 덮개 상자 */
function vxVbied(K,n){const {B}=K;vxTech(K,n,false);for(const o of [...K.root.children])if(o.userData&&o.userData.turret)K.root.remove(o);
  B(.08,.9,1.85,1.0,1.45,0,'rust',null,[0,0,-.3]);B(.1,.06,1.2,1.05,1.55,0,'dark',null,[0,0,-.3]);
  for(const s of [-1,1])B(1.4,.75,.06,.3,1.5,s*.93,'rust');B(2.2,.9,1.7,-1.5,1.6,0,'steel');
  for(const [x,z] of [[-.9,.5],[-2.1,-.4]])B(.5,.04,.5,x,2.06,z,'rust');B(.22,.9,.6,2.3,.8,0,'steel');}

const VX_BUILD={tank:vxTank,ifv:vxIfv,hmv:vxHmv,tech:(K,n)=>vxTech(K,n,false),zu:(K,n)=>vxTech(K,n,true),spg:vxSpg,sup:vxSup,rec:vxRec,amb:vxAmb,mlrs:vxMlrs,vbied:vxVbied};
function vxTemplate(ty,n){const key=ty+'|'+n;V3.vxT=V3.vxT||new Map();if(V3.vxT.has(key))return V3.vxT.get(key);
  const f=VX_BUILD[ty]||vxTank;const K=vxKit();f(K,n);const g=vxBake(K.root,n);V3.vxT.set(key,g);return g;}
/* 한 판마다: 겨울이면 흰 칠, 사막이면 흙먼지를 밝게 */
function vxClime(){const U=vxUni();const c=typeof G!=='undefined'&&G&&G.feat&&G.feat.clime||'temp';
  U.uWash.value=c==='winter'?.6:0;U.uDust.value.set(c==='desert'?'#b3a07c':c==='winter'?'#9c978c':'#8f8268');}

v3VehicleM=function(ty,g,n){if(ty==='hmv'&&n%2)ty='tech';
  vxClime();const src=vxTemplate(ty,n);const c=src.clone(true);
  c.traverse(o=>{if(o.isMesh){o.material=vxMatOf(o.userData.mk,n);o.castShadow=true;o.receiveShadow=true;o.userData.keepGeo=1;}});
  g.add(c);let tur=null;c.traverse(o=>{if(o.userData.turret)tur=o;});if(tur)g.userData.tur=tur;return c;};
/* 예전 이름으로 부르는 곳을 위해: 형상 틀만 돌려준다 */
v3VehBuild=function(ty){return vxTemplate(ty,0);};
v3ZuBuild=function(){return vxTemplate('zu',1);};
v3MlrsBuild=function(){return vxTemplate('mlrs',0);};
