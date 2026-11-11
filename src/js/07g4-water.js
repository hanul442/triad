/* ===================== 물가: 강둑·안벽을 실제처럼 =====================
   강과 바다를 거리보다 낮게 보인다(그림만, 판정은 그대로). 실제 도시의 강은 축대(석축) 아래로 흐르고, 항구 안벽은 물 위 2~3m에 선다.
   - 땅 판: 강·바다 칸을 WS.D만큼 내린다. 지면 셰이더에만 넣으므로 다리 상판·잔교·병사·소품은 제 높이(거리 높이)에 그대로 선다.
     강은 칸 모양이 아니라 강 꺾은선(feat.river)을 따라 매끈하게 파이고, 둑 칸(강 칸이지만 물길 밖)은 거리 높이의 강변 산책로가 된다.
   - 물: 강은 꺾은선을 따라 띠 모양 수면 하나(칸마다 네모 수면 대신), 바다는 07g2의 수면을 물 높이(WS.lv)로 내린다.
   - 강변: 석축 위 갓돌과 철 난간, 산책로 가로등. 다리: 상판 아래 보, 교각은 물속까지.
   - 항구: 안벽 면(콘크리트), 고무 방충재, 잔교 아래 말뚝.
   - 광장 분수: 한가운데 물 칸은 둥근 돌 수반과 물줄기(연못 대신). 시골 마을 광장은 동심원 대신 자갈 포석과 기념비.
   캠페인(G.camp)은 07c-camp가 따로 그리므로 건드리지 않는다. */
const WS={D:.3,lv:-.19,on:false,u:{t:{value:null},p:{value:null}}};
const wLv=()=>WS.on?WS.lv:0;   // 물 높이(화면)
const wRiver=()=>G&&!campPlain()&&G.feat&&G.feat.river&&G.feat.river.pts?G.feat.river:null;
const wFount=(r,c)=>{if(!inb(r,c))return false;const x=G.map[r][c];return x.t==='water'&&!x.rv&&!x.sea&&[[-1,0],[1,0],[0,-1],[0,1]].some(([a,b])=>inb(r+a,c+b)&&G.map[r+a][c+b].sq);};
// 물길 띠의 바깥 가장자리: 강 가운데선에서 이만큼이 둑 꼭대기
const wBank=()=>{const f=wRiver();return f?f.w/2:0;};

/* ---------- 낮출 곳: 0~1 값의 텍스처 (칸마다 8칸) ---------- */
function wSinkTex(){const T=V3.T,K=8,S=N*K;const d=new Uint8Array(S*S*4);const M=G.map,f=wRiver();let any=false;
  const sunk=(r,c)=>inb(r,c)&&(M[r][c].rv||M[r][c].sea||M[r][c].pier);
  const hb=f?f.w/2:0;
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=M[r][c];
    const near=sunk(r,c)||[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]].some(([a,b])=>sunk(r+a,c+b));if(!near)continue;
    for(let i=0;i<K;i++)for(let j=0;j<K;j++){const px=c+(j+.5)/K,pz=r+(i+.5)/K;let v=0;
      if(x.sea||x.pier)v=1;
      else if(f){// 강: 꺾은선에서 둑까지 매끈하게, 강 칸 밖으로는 .25칸까지만 번진다
        let mf=1;if(!x.rv){let dm=9;for(const [a,b] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]){if(!(sunk(r+a,c+b)&&M[r+a][c+b].rv))continue;
            const x0=c+b,z0=r+a;const dx=Math.max(x0-px,0,px-(x0+1)),dz=Math.max(z0-pz,0,pz-(z0+1));dm=Math.min(dm,Math.hypot(dx,dz));}mf=Math.max(0,1-dm/.25);}
        if(mf>0){const dd=plDist(f.pts,px,pz);let t=Math.min(1,Math.max(0,(hb+.12-dd)/.24));t=t*t*(3-2*t);v=t*mf;}}
      if(v>0){any=true;const o=((r*K+i)*S+c*K+j)*4;d[o]=Math.round(v*255);}}}
  if(!any)return null;
  for(let i=0;i<S*S;i++)d[i*4+3]=255;
  const tx=new T.DataTexture(d,S,S);tx.magFilter=tx.minFilter=T.LinearFilter;tx.wrapS=tx.wrapT=T.ClampToEdgeWrapping;tx.needsUpdate=true;return tx;}
// 지면 재질 정점 셰이더에 "낮추기"를 더한다(한 번만)
function wTerrMat(){const m=V3.M&&V3.M.terr;if(!m||m.userData.wsink)return;m.userData.wsink=1;const ob=m.onBeforeCompile;
  if(!WS.u.p.value)WS.u.p.value=new V3.T.Vector2(1,0);
  m.onBeforeCompile=function(sh,ren){if(ob)ob.call(this,sh,ren);sh.uniforms.wSinkT=WS.u.t;sh.uniforms.wSinkP=WS.u.p;
    sh.vertexShader='uniform sampler2D wSinkT;uniform vec2 wSinkP;\nfloat wSink(vec2 p){return wSinkP.y>0.?texture2D(wSinkT,p/wSinkP.x).r*wSinkP.y:0.;}\n'+
      sh.vertexShader.replace('mvPosition.y+=terrH(mvPosition.xz);','mvPosition.y+=terrH(mvPosition.xz)-wSink(mvPosition.xz);')
        .replace('worldPosition.y+=terrH(worldPosition.xz);','worldPosition.y+=terrH(worldPosition.xz)-wSink(worldPosition.xz);');};
  const ck=m.customProgramCacheKey;m.customProgramCacheKey=()=>(ck?ck.call(m):'')+'wS';m.needsUpdate=true;}

/* ---------- 땅 그림: 강둑·산책로, 안벽 면, 분수 자리, 시골 광장·마당 ---------- */
{const _tt=v3TerrTex;v3TerrTex=function(g,P){_tt(g,P);if(!G||campPlain())return;try{wGroundTex(g,P);}catch(e){console.error(e);}};}
function wGroundTex(g,P){const M=G.map,f=wRiver(),R=mulberry(((G.seed|0)^0x3a7e)>>>0);const at=(r,c)=>inb(r,c)?M[r][c]:null;
  const cl=typeof bmClime==='function'?bmClime():'temp',L=G.feat&&G.feat.layout;
  const GRASS={temp:'#56603f',autumn:'#6b6240',winter:'#d6dade',desert:'#a8946e'}[cl]||'#56603f';
  const PAVE=cl==='winter'?'#c9ccce':'#8e897d';
  if(f){const w=f.w;
    const path=()=>{g.beginPath();f.pts.forEach(([x,z],i)=>i?g.lineTo(x*P,z*P):g.moveTo(x*P,z*P));};
    g.save();g.beginPath();let n=0;for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=M[r][c];if(x.rv||x.bank){g.rect(c*P,r*P,P,P);n++;}}
    if(n){g.clip();g.lineCap=g.lineJoin='round';
      g.fillStyle=GRASS;g.fillRect(0,0,N*P,N*P);                                    // 둔치 풀밭
      for(let i=0;i<n*14;i++){g.fillStyle=R()<.5?'rgba(30,36,20,.25)':'rgba(150,150,110,.18)';g.beginPath();g.arc(R()*N*P,R()*N*P,1+R()*3,0,7);g.fill();}
      path();g.strokeStyle=PAVE;g.lineWidth=(w+1.45)*P;g.stroke();                 // 강변 산책로(보도블록)
      g.strokeStyle='rgba(0,0,0,.08)';g.lineWidth=(w+1.45)*P;g.setLineDash([2,P*.18]);g.stroke();g.setLineDash([]);
      path();g.strokeStyle=GRASS;g.lineWidth=(w+.95)*P;g.stroke();                  // 산책로와 축대 사이 좁은 풀띠
      path();g.strokeStyle='#a9a395';g.lineWidth=(w+.34)*P;g.stroke();               // 갓돌
      path();g.strokeStyle='#6b665c';g.lineWidth=(w+.22)*P;g.stroke();               // 석축 면
      g.strokeStyle='rgba(40,36,30,.45)';g.lineWidth=(w+.22)*P;g.setLineDash([1.5,5]);g.stroke();g.setLineDash([]);   // 돌 줄눈
      path();g.strokeStyle='#26343a';g.lineWidth=(w-.25)*P;g.stroke();}            // 강바닥(물 아래)
    g.restore();}
  // 바다·잔교 칸: 뭍과 맞닿은 쪽 .3칸은 콘크리트 안벽 면
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=M[r][c];if(!(x.sea||x.pier))continue;const X=c*P,Y=r*P,b=Math.round(P*.3);
    for(const [a,q] of [[-1,0],[1,0],[0,-1],[0,1]]){const y=at(r+a,c+q);if(!y||y.sea||y.pier||y.t==='water')continue;
      g.fillStyle='#5f5c56';if(a)g.fillRect(X,a<0?Y:Y+P-b,P,b);else g.fillRect(q<0?X:X+P-b,Y,b,P);
      g.fillStyle='rgba(20,30,30,.5)';if(a)g.fillRect(X,a<0?Y+b-3:Y+P-b,P,3);else g.fillRect(q<0?X+b-3:X+P-b,Y,3,P);}}   // 물때
  // 분수 자리: 둘레 광장과 같은 포석
  for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(wFount(r,c)){g.fillStyle='#8a867c';g.fillRect(c*P,r*P,P,P);}
  // 시골 마을 광장: 도시식 동심원 대신 자갈 포석
  if(L==='country'){for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=M[r][c];if(!x.sq)continue;const X=c*P,Y=r*P;
      g.fillStyle=cl==='winter'?'#c8cbcd':'#7b766b';g.fillRect(X,Y,P,P);
      for(let i=0;i<160;i++){g.fillStyle=R()<.5?'rgba(40,36,30,.16)':'rgba(200,192,175,.14)';g.fillRect(X+R()*P,Y+R()*P,2,2);}
      g.fillStyle='rgba(40,36,30,.1)';for(let i=4;i<P;i+=5){g.fillRect(X,Y+i,P,1);}
      for(const [a,b] of [[-1,0],[1,0],[0,-1],[0,1]]){const y=at(r+a,c+b);if(!y||y.sq||y.t==='road')continue;   // 가장자리 돌 경계석
        g.fillStyle='rgba(165,158,142,.9)';if(a)g.fillRect(X,a<0?Y:Y+P-3,P,3);else g.fillRect(b<0?X:X+P-3,Y,3,P);}}}
  // 숲·시골의 자갈 마당: 콘크리트 판처럼 보이지 않게 흙빛, 가장자리는 풀로 번진다
  if(L==='forest'||L==='country'){for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=M[r][c];if(!x.grav)continue;const X=c*P,Y=r*P;
      g.fillStyle=cl==='winter'?'#bfc2c2':'#6e6857';g.fillRect(X,Y,P,P);
      for(let i=0;i<50;i++){g.fillStyle=R()<.5?'rgba(40,34,26,.3)':'rgba(170,160,135,.28)';g.fillRect(X+R()*P,Y+R()*P,1.5,1.5);}
      for(let i=0;i<4;i++){g.fillStyle='rgba(50,40,30,.18)';g.beginPath();g.ellipse(X+R()*P,Y+R()*P,4+R()*8,2+R()*4,R()*3,0,7);g.fill();}   // 웅덩이 자국
      for(const [a,b] of [[-1,0],[1,0],[0,-1],[0,1]]){const y=at(r+a,c+b);if(!y||y.grav||y.t==='road'||y.t==='bldg')continue;
        for(let i=0;i<14;i++){const t=R()*P,dep=Math.pow(R(),1.5)*P*.28;const px=a?X+t:(b<0?X+dep:X+P-dep),py=b?Y+t:(a<0?Y+dep:Y+P-dep);
          g.fillStyle=GRASS;g.globalAlpha=.5+R()*.4;g.beginPath();g.arc(px,py,2+R()*4,0,7);g.fill();g.globalAlpha=1;}}}}}

/* ---------- 3D ---------- */
function wMats(){if(V3.wM)return V3.wM;const T=V3.T;
  const M={stone:new T.MeshStandardMaterial({color:'#a19b8e',roughness:.95}),iron:new T.MeshStandardMaterial({color:'#2d3133',roughness:.6,metalness:.5}),
    conc:new T.MeshStandardMaterial({color:'#7a766e',roughness:.95}),dark:new T.MeshStandardMaterial({color:'#4a4640',roughness:1}),
    rubber:new T.MeshStandardMaterial({color:'#1c1c1c',roughness:.9}),wood:new T.MeshStandardMaterial({color:'#4e4033',roughness:1}),
    lamp:new T.MeshStandardMaterial({color:'#f3e6c2',emissive:'#f3e6c2',emissiveIntensity:.25,roughness:.5}),
    fw:new T.MeshStandardMaterial({color:'#6f9aa6',roughness:.1,metalness:.3,transparent:true,opacity:.85}),
    paint:new T.MeshStandardMaterial({color:'#ffffff',roughness:.6}),jet:new T.MeshStandardMaterial({color:'#e8f2f4',roughness:.2,transparent:true,opacity:.55,depthWrite:false})};
  for(const k in M)v3FowMat(M[k]);V3.wM=M;return M;}
// 꺾은선 띠 형상: 가운데선에서 ±hw
function wRibbon(pts,hw,y){const T=V3.T,P=[],I=[];
  for(let i=0;i<pts.length;i++){const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)];const L=Math.hypot(b[0]-a[0],b[1]-a[1])||1;const nx=-(b[1]-a[1])/L,nz=(b[0]-a[0])/L;
    P.push(pts[i][0]+nx*hw,y,pts[i][1]+nz*hw,pts[i][0]-nx*hw,y,pts[i][1]-nz*hw);
    if(i){const o=(i-1)*2;I.push(o,o+2,o+1,o+1,o+2,o+3);}}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(P,3));geo.setIndex(I);geo.computeVertexNormals();
  const n=geo.attributes.normal;for(let i=0;i<n.count;i++)n.setXYZ(i,0,1,0);return geo;}
{const _bt=v3BuildTerrain;v3BuildTerrain=function(g){_bt(g);if(!G||campPlain())return;try{wBuildRiver(g);}catch(e){console.error(e);}};}
function wBuildRiver(g){const f=wRiver();if(!f||!WS.on)return;const T=V3.T,M=wMats(),TM=V3.terrM;const at=(r,c)=>inb(r,c)?G.map[r][c]:null;
  // 칸마다 네모 수면을 걷고 꺾은선 띠 수면 하나로
  for(const o of g.children.slice())if(o.isInstancedMesh&&TM&&o.material===TM.water){g.remove(o);o.geometry.dispose();}
  const pts=f.pts.filter(([x,z])=>x>-2&&z>-2&&x<N+2&&z<N+2);if(pts.length<2)return;
  const wm=new T.Mesh(wRibbon(pts,f.w/2+.14,WS.lv),TM.water);wm.receiveShadow=true;g.add(wm);
  // 강둑: 갓돌·난간·가로등 (다리·건물 칸은 건너뛴다)
  const cap=[],rail=[],post=[],lamp=[],head=[];const hb=f.w/2;
  for(const s of [-1,1]){let acc=0,lastLamp=-9;
    for(let i=0;i+1<pts.length;i++){const [ax,az]=pts[i],[bx,bz]=pts[i+1];const L=Math.hypot(bx-ax,bz-az)||1,ux=(bx-ax)/L,uz=(bz-az)/L,nx=-uz*s,nz=ux*s;
      const mx=(ax+bx)/2,mz=(az+bz)/2;const ry=-Math.atan2(uz,ux);acc+=L;
      const ok=d=>{const x=mx+nx*d,z=mz+nz*d;if(x<.05||z<.05||x>N-.05||z>N-.05)return null;const t=at(Math.floor(z),Math.floor(x));if(!t||t.br||t.t==='bldg'||t.t==='water'&&!t.rv)return null;return [x,z];};
      const c0=ok(hb+.16);if(c0)cap.push({x:c0[0],y:.015,z:c0[1],ry,sx:L+.04,sy:.03,sz:.13});
      const r0=ok(hb+.17);if(r0){rail.push({x:r0[0],y:.105,z:r0[1],ry,sx:L+.02,sy:.012,sz:.012});rail.push({x:r0[0],y:.06,z:r0[1],ry,sx:L+.02,sy:.006,sz:.006});post.push({x:ax+nx*(hb+.17),y:.055,z:az+nz*(hb+.17),sx:.012,sy:.11,sz:.012});}
      if(acc-lastLamp>2.6){const l=ok(hb+.55);if(l){const t=at(Math.floor(l[1]),Math.floor(l[0]));if(t&&t.t!=='road'){lastLamp=acc;lamp.push({x:l[0],y:.16,z:l[1]});head.push({x:l[0]-nx*.05,y:.32,z:l[1]-nz*.05,ry,sx:.05,sy:.025,sz:.05});}}}}}
  v3Inst(g,new T.BoxGeometry(1,1,1),M.stone,cap,{noShadow:1});v3Inst(g,new T.BoxGeometry(1,1,1),M.iron,rail,{noShadow:1});v3Inst(g,new T.BoxGeometry(1,1,1),M.iron,post,{noShadow:1});
  v3Inst(g,new T.CylinderGeometry(.008,.011,.32,5),M.iron,lamp);v3Inst(g,new T.BoxGeometry(1,1,1),M.lamp,head,{noShadow:1});
  // 다리: 상판 아래 보(옆에서 보면 두께가 있다)와 물에 닿는 교각 받침
  const beam=[],foot=[],walk=[],line=[];
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=G.map[r][c];if(!x.rv||!x.br||x.br===3)continue;const [cx,cz]=v3x(r,c);const H2=x.ro!=='v';
    beam.push(H2?{x:cx,y:-.025,z:cz,sx:1,sy:.09,sz:.86}:{x:cx,y:-.025,z:cz,sx:.86,sy:.09,sz:1});
    const lat=s=>{const y=H2?at(r+s,c):at(r,c+s);return !!(y&&y.br&&y.br!==3);};
    for(const s of [-1,1]){if(lat(s))continue;walk.push(H2?{x:cx,y:.078,z:cz+s*.39,sx:1,sy:.02,sz:.16}:{x:cx+s*.39,y:.078,z:cz,sx:.16,sy:.02,sz:1});}   // 보도
    if(!lat(-1)&&!lat(1))for(const o of [-.25,.25])line.push(H2?{x:cx+o,y:.072,z:cz,sx:.2,sy:.004,sz:.02,col:'#e8e4d8'}:{x:cx,y:.072,z:cz+o,sx:.02,sy:.004,sz:.2,col:'#e8e4d8'});   // 가운데 점선
    else if(lat(1)&&!lat(-1))for(const d of [-.012,.012])line.push(H2?{x:cx,y:.072,z:cz+.5+d,sx:1,sy:.004,sz:.012,col:'#d9b23a'}:{x:cx+.5+d,y:.072,z:cz,sx:.012,sy:.004,sz:1,col:'#d9b23a'});   // 중앙선(두 칸 다리)
    if((H2?c:r)%2===0)for(const s of [-1,1])foot.push(H2?{x:cx,y:WS.lv-.02,z:cz+s*.36,sx:.2,sy:.06,sz:.2}:{x:cx+s*.36,y:WS.lv-.02,z:cz,sx:.2,sy:.06,sz:.2});}
  v3Inst(g,new T.BoxGeometry(1,1,1),M.conc,beam);v3Inst(g,new T.BoxGeometry(1,1,1),M.stone,walk);v3Inst(g,new T.BoxGeometry(1,1,1),M.paint,line,{noShadow:1});v3Inst(g,new T.BoxGeometry(1,1,1),M.conc,foot,{noShadow:1});}

/* 항구: 안벽 방충재, 잔교 말뚝 / 분수 / 시골 광장 기념비 / 지도 가장자리 단면 */
function wBuildPort(g){if(!WS.on)return;const T=V3.T,M=wMats(),at=(r,c)=>inb(r,c)?G.map[r][c]:null;const fend=[],pile=[],cap=[];
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=G.map[r][c];const [cx,cz]=v3x(r,c);
    if(x.sea)for(const [a,b] of [[-1,0],[1,0],[0,-1],[0,1]]){const y=at(r+a,c+b);if(!y||y.sea||y.pier||y.t==='water')continue;
      for(const o of [-.25,.25])fend.push({x:cx+b*.47+(a?o:0),y:-.07,z:cz+a*.47+(b?o:0),sx:a?.09:.035,sy:.12,sz:b?.09:.035});}
    if(x.pier){for(const [a,b] of [[-1,-1],[-1,1],[1,-1],[1,1],[0,-1],[0,1],[-1,0],[1,0]])pile.push({x:cx+b*.4,y:(WS.lv-.08)/2,z:cz+a*.4,sx:1,sy:-(WS.lv-.08)/.3,sz:1});
      cap.push({x:cx,y:-.01,z:cz,sx:.98,sy:.05,sz:.98});}}
  v3Inst(g,new T.BoxGeometry(1,1,1),M.rubber,fend,{noShadow:1});v3Inst(g,new T.CylinderGeometry(.035,.035,.3,6),M.wood,pile);v3Inst(g,new T.BoxGeometry(1,1,1),M.wood,cap);}
function wBuildFountains(g){const T=V3.T,M=wMats();const seen=new Set();
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){if(seen.has(key(r,c))||!wFount(r,c))continue;const cells=[];const q=[[r,c]];seen.add(key(r,c));
    while(q.length){const [a,b]=q.pop();cells.push([a,b]);for(const [p,o] of [[a-1,b],[a+1,b],[a,b-1],[a,b+1]])if(!seen.has(key(p,o))&&wFount(p,o)){seen.add(key(p,o));q.push([p,o]);}}
    const cx=cells.reduce((s,[a,b])=>s+b+.5,0)/cells.length,cz=cells.reduce((s,[a])=>s+a+.5,0)/cells.length;const R0=Math.min(1.25,.42+Math.sqrt(cells.length)*.42);
    const rim=new T.Mesh(new T.CylinderGeometry(R0,R0+.04,.09,40,1,true),M.stone);rim.position.set(cx,.045,cz);rim.castShadow=rim.receiveShadow=true;g.add(rim);
    const lip=new T.Mesh(new T.RingGeometry(R0-.08,R0+.02,40),M.stone);lip.rotation.x=-Math.PI/2;lip.position.set(cx,.09,cz);lip.receiveShadow=true;g.add(lip);
    const wat=new T.Mesh(new T.CircleGeometry(R0-.06,40),M.fw);wat.rotation.x=-Math.PI/2;wat.position.set(cx,.06,cz);g.add(wat);
    for(const [rr,h,y] of [[.22,.12,.1],[.14,.1,.2],[.07,.12,.3]]){const p=new T.Mesh(new T.CylinderGeometry(rr,rr*1.1,h,16),M.stone);p.position.set(cx,y,cz);p.castShadow=true;g.add(p);}
    const bowl=new T.Mesh(new T.CylinderGeometry(.32,.12,.05,20),M.stone);bowl.position.set(cx,.27,cz);bowl.castShadow=true;g.add(bowl);
    const jet=new T.Mesh(new T.ConeGeometry(.05,.3,8,1,true),M.jet);jet.position.set(cx,.5,cz);g.add(jet);}}
function wBuildSquare(g){if(G.feat?.layout!=='country')return;const T=V3.T,M=wMats();let sx=0,sz=0,n=0;
  for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(G.map[r][c].sq){sx+=c+.5;sz+=r+.5;n++;}if(!n)return;
  // 사분면마다 광장이 하나씩: 가까운 칸끼리 묶어 가운데에 돌 기념비
  const cells=[];for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(G.map[r][c].sq)cells.push([c+.5,r+.5]);const groups=[];
  for(const p of cells){const gp=groups.find(q=>Math.hypot(q.x/q.n-p[0],q.z/q.n-p[1])<3);if(gp){gp.x+=p[0];gp.z+=p[1];gp.n++;}else groups.push({x:p[0],z:p[1],n:1});}
  for(const q of groups){const x=q.x/q.n,z=q.z/q.n;
    for(const [w,h,y] of [[.34,.05,.025],[.24,.05,.075]]){const b=new T.Mesh(new T.BoxGeometry(w,h,w),M.stone);b.position.set(x,y,z);b.castShadow=b.receiveShadow=true;g.add(b);}
    const ob=new T.Mesh(new T.CylinderGeometry(.025,.06,.42,4),M.stone);ob.rotation.y=Math.PI/4;ob.position.set(x,.31,z);ob.castShadow=true;g.add(ob);}}
// 지도 가장자리에서 낮춘 물길 단면이 허공으로 보이지 않게 흙벽
function wBuildEdge(g){if(!WS.on)return;const T=V3.T,M=wMats(),wall=[];
  for(let i=0;i<N;i++)for(const [r,c,ax] of [[0,i,'z0'],[N-1,i,'z1'],[i,0,'x0'],[i,N-1,'x1']]){const x=G.map[r][c];if(!(x.rv||x.sea||x.pier))continue;
    const [cx,cz]=v3x(r,c);if(ax[0]==='z')wall.push({x:cx,y:-WS.D/2,z:ax==='z0'?0:N,sx:1,sy:WS.D,sz:.02});else wall.push({x:ax==='x0'?0:N,y:-WS.D/2,z:cz,sx:.02,sy:WS.D,sz:1});}
  v3Inst(g,new T.BoxGeometry(1,1,1),M.dark,wall,{noShadow:1});}
{const _bw=v3BuildWorld;v3BuildWorld=function(){_bw();if(!G||campPlain())return;try{wAfterWorld();}catch(e){console.error(e);}};}
function wAfterWorld(){const T=V3.T,g=V3.G.world;
  if(WS.on){// 땅 판을 촘촘하게(낮춘 물길이 매끈하게) 바꾸고, 바깥 땅은 지도 자리를 비운다
    for(const o of g.children){if(!o.isMesh||o.isInstancedMesh)continue;
      if(o.material===V3.M.terr){const s=N*4;const geo=new T.PlaneGeometry(N,N,s,s);geo.rotateX(-Math.PI/2);o.geometry.dispose();o.geometry=geo;}
      else if(o.geometry.parameters&&o.geometry.parameters.width===N+120){const A=-60,B=N+60;const sh=new T.Shape([[A,-A],[B,-A],[B,-B],[A,-B]].map(([x,y])=>new T.Vector2(x,y)));
        sh.holes.push(new T.Path([[0,0],[0,-N],[N,-N],[N,0]].map(([x,y])=>new T.Vector2(x,y))));const geo=new T.ShapeGeometry(sh);geo.rotateX(-Math.PI/2);
        o.geometry.dispose();o.geometry=geo;o.rotation.set(0,0,0);o.position.set(0,-.02,0);}}}
  wBuildPort(g);wBuildFountains(g);wBuildSquare(g);wBuildEdge(g);}
// 새 지도마다: 낮출 곳 텍스처를 만들고 지면 재질에 건다. v3BuildWorld 안의 v3TerrUpd 다음에 불린다
{const _tu=v3TerrUpd;v3TerrUpd=function(){_tu();try{wSinkUpd();}catch(e){console.error(e);WS.on=false;}};}
function wSinkUpd(){const T=V3.T;if(WS.u.t.value&&WS.u.t.value!==WS.dummy)WS.u.t.value.dispose();WS.on=false;
  if(!WS.u.p.value)WS.u.p.value=new T.Vector2(1,0);WS.u.p.value.set(N,0);
  if(!WS.dummy){WS.dummy=new T.DataTexture(new Uint8Array(4),1,1);WS.dummy.needsUpdate=true;}WS.u.t.value=WS.dummy;
  if(!G||campPlain())return;const tx=wSinkTex();if(!tx)return;
  WS.u.t.value=tx;WS.u.p.value.set(N,WS.D);WS.on=true;wTerrMat();}
