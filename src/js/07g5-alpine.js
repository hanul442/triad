/* ===================== 3D: 알프스 산악 =====================
   - 지면 셰이더: 기울기가 가파른 곳은 바위(지층 줄무늬), 설선(feat.alp.sn)보다 높은 곳은 눈. 칸 경계가 아니라 높이·기울기로 번진다.
     바위벽엔 눈이 덜 붙는다.
   - 땅 그림: 바위벽(금), 너덜지대(자갈), 고산 초지(짧은 풀·돌), 눈밭, 봉우리 꼭대기 자갈, 산길(좁은 오솔길).
   - 바위: 너덜지대·바위벽·고산 초지에 크고 작은 바윗덩이. 눈밭은 눈 덮인 바위.
   - 봉우리: 돌탑(케른)과 나무 정상 십자가.
   - 고정 로프: 산악보병이 건 로프(G.ropes)를 바위벽 비탈을 따라 주황색 줄로.
   - 먼 산맥: 지도 밖 둘레에 눈 덮인 봉우리들(안개에 묻혀 흐릿하게).
   - 구름: 안개·비 날씨에는 구름 밑동(09f alpCloud)보다 높은 봉우리에 구름 덩이가 걸린다.
   - 카메라: 산 위를 볼 때 바라보는 높이를 땅 높이에 맞춘다(관전 감독이 잡을 때는 감독 값을 따른다).
   - 산악보병 모형: 큰 배낭, 헬멧. 겨울이면 흰 위장복. */
const ALP3={u:{value:null},rope:-1,cloudOn:null};
function alpTerrMat(){const m=V3.M&&V3.M.terr;if(!m||m.userData.alp)return;m.userData.alp=1;const ob=m.onBeforeCompile;const T=V3.T;if(!ALP3.u.value)ALP3.u.value=new T.Vector4(0,99,1.15,99);
  m.onBeforeCompile=function(sh,ren){ob.call(this,sh,ren);sh.uniforms.alpP=ALP3.u;
    if(!sh.vertexShader.includes('float terrH('))return;
    sh.vertexShader='varying float vAlpH;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvAlpH=terrH((modelMatrix*vec4(position,1.)).xz);');
    const nat=sh.fragmentShader.includes('uniform sampler2D natN');
    sh.fragmentShader='uniform vec4 alpP;varying float vAlpH;\n'+(nat?'':'uniform sampler2D natN;varying float vNatSl;\n')+sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
{if(alpP.x>.5){vec2 wp=vFowW;float n1=texture2D(natN,wp*.11).r,n2=texture2D(natN,wp*.55).g,n3=texture2D(natN,wp*2.3).b;
 vec3 c=diffuseColor.rgb;
 float rk=smoothstep(alpP.z*.72,alpP.z*1.02,vNatSl+(n1-.5)*.3);                                   // 바위
 vec3 rock=vec3(.37,.35,.32)*(.72+.5*n2)*(.86+.28*n3);rock*=.88+.12*sin(vAlpH*7.+n1*4.);            // 지층 줄무늬
 c=mix(c,rock,rk*.88);
 float hi=smoothstep(alpP.w-.4,alpP.w+.6,vAlpH+(n2-.5)*.8);c=mix(c,c*vec3(1.08,1.05,.82),hi*(1.-rk)*.6); // 숲 한계선 위 마른 고산 풀
 float sn=smoothstep(alpP.y+.05,alpP.y+.5,vAlpH+(n1-.5)*.45)*(1.-rk*.7);
 c=mix(c,vec3(.91,.93,.96)*(.9+.12*n3),sn);
 diffuseColor.rgb=c;}}`);};
  const ck=m.customProgramCacheKey;m.customProgramCacheKey=()=>(ck?ck.call(m):'')+'alp';m.needsUpdate=true;}
function alpTerrUpd(){if(!ALP3.u.value)return;const A=G&&G.feat&&G.feat.layout==='alpine'&&!G.camp?G.feat.alp:null;
  if(!A){ALP3.u.value.set(0,99,1.15,99);return;}ALP3.u.value.set(1,A.sn*FLOOR_H,1.15,A.tl*FLOOR_H);}

/* ---------- 땅 그림 ---------- */
{const _tt=v3TerrTex;v3TerrTex=function(g,P){_tt(g,P);if(!G||G.camp||!G.feat||G.feat.layout!=='alpine')return;try{alpGround(g,P);}catch(e){console.error(e);}};}
function alpGround(g,P){const M=G.map,R=mulberry(((G.seed|0)^0xa1e5)>>>0),win=G.feat.clime==='winter';const at=(r,c)=>inb(r,c)?M[r][c]:null;
  const dots=(X,Y,n,cols,r0,r1)=>{for(let i=0;i<n;i++){g.fillStyle=cols[Math.floor(R()*cols.length)];g.beginPath();g.arc(X+R()*P,Y+R()*P,r0+R()*(r1-r0),0,7);g.fill();}};
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=M[r][c],X=c*P,Y=r*P;
    const base=()=>{if(x.cliff){g.fillStyle='#67645e';g.fillRect(X,Y,P,P);g.strokeStyle='rgba(30,28,26,.45)';g.lineWidth=1.4;for(let i=0;i<4;i++){g.beginPath();let px=X+R()*P,py=Y;g.moveTo(px,py);for(let k=0;k<4;k++){px+=(R()-.5)*P*.35;py+=P/4;g.lineTo(px,py);}g.stroke();}
        dots(X,Y,10,['rgba(150,146,138,.35)','rgba(40,38,34,.3)'],1.5,4);if(x.snow||win)dots(X,Y,6,['rgba(235,238,242,.75)'],2,5);return true;}
      if(x.scree){g.fillStyle=win||x.snow?'#c9ccd0':'#7a766c';g.fillRect(X,Y,P,P);dots(X,Y,40,['rgba(55,52,48,.45)','rgba(170,165,155,.45)','rgba(110,105,96,.5)'],1,3);return true;}
      if(x.summit){g.fillStyle=win||x.snow?'#d9dce0':'#8a8578';g.fillRect(X,Y,P,P);dots(X,Y,30,['rgba(60,56,50,.4)','rgba(200,195,185,.4)'],1,2.5);return true;}
      if(x.snow){g.fillStyle='#e7eaee';g.fillRect(X,Y,P,P);dots(X,Y,10,['rgba(170,182,195,.3)','rgba(255,255,255,.5)'],3,9);return true;}
      if(x.alm){g.fillStyle=win?'#dfe3e7':'#6e7148';g.fillRect(X,Y,P,P);dots(X,Y,16,win?['rgba(160,170,180,.3)']:['rgba(150,140,90,.35)','rgba(60,62,40,.35)','rgba(130,128,120,.45)'],1.5,4);
        if(!win)dots(X,Y,5,['rgba(225,215,120,.5)','rgba(220,220,230,.5)','rgba(160,110,170,.45)'],.8,1.4);return true;}
      return false;};
    if(x.mtr){// 산길: 아래 땅을 칠하고 이웃 길(산길·도로·꼭대기·산장)로 좁은 오솔길
      if(!base()){g.fillStyle=win?'#e3e6ea':x.wild?'#2f3526':'#58613c';g.fillRect(X,Y,P,P);dots(X,Y,10,['rgba(110,120,70,.3)','rgba(60,50,35,.3)'],2,6);}
      const w=Math.max(3,P*.13),cx=X+P/2,cy=Y+P/2;g.strokeStyle=win||x.snow?'rgba(150,140,125,.85)':'#806e52';g.lineWidth=w;g.lineCap='round';
      let any=false;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){if(!a&&!b)continue;const y=at(r+a,c+b);if(!y||!(y.mtr||y.t==='road'||y.summit||y.hut))continue;if(a&&b){const p=at(r+a,c),q=at(r,c+b);if(p&&(p.mtr||p.t==='road')||q&&(q.mtr||q.t==='road'))continue;}
        any=true;g.beginPath();g.moveTo(cx,cy);g.quadraticCurveTo(cx+b*P*.25+(R()-.5)*P*.2,cy+a*P*.25+(R()-.5)*P*.2,cx+b*P*.5,cy+a*P*.5);g.stroke();}
      if(!any){g.beginPath();g.arc(cx,cy,w,0,7);g.fillStyle=g.strokeStyle;g.fill();}
      continue;}
    if(x.t==='road'||x.t==='bldg'||x.t==='water')continue;
    base();}}

/* ---------- 바위·정상 십자가·먼 산맥 ---------- */
function alpGeos(){if(V3.alpG)return V3.alpG;const T=V3.T;const rock=new T.IcosahedronGeometry(1,0);const p=rock.attributes.position;const R=mulberry(0x40c4);
  for(let i=0;i<p.count;i++){const k=.75+R()*.5;p.setXYZ(i,p.getX(i)*k,p.getY(i)*k*.7,p.getZ(i)*k);}rock.computeVertexNormals();
  return V3.alpG={rock,box:new T.BoxGeometry(1,1,1)};}
function alpMats(){if(V3.alpM)return V3.alpM;const T=V3.T;const S=(c,o)=>{const m=new T.MeshStandardMaterial(Object.assign({color:c,roughness:.95,flatShading:true},o||{}));v3FowMat(m);return m;};
  const far=new T.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true});
  return V3.alpM={rock:S('#ffffff'),wood:S('#5a4632'),rope:S('#e0782a',{roughness:.7}),far};}
{const _bw=v3BuildWorld;v3BuildWorld=function(){_bw();try{alpTerrMat();alpTerrUpd();alpWorld(V3.G.world);}catch(e){console.error(e);}};}
function alpWorld(g){ALP3.rope=-1;ALP3.cloudOn=null;if(V3.alpRope){V3.alpRope.parent&&V3.alpRope.parent.remove(V3.alpRope);V3.alpRope=null;}if(V3.alpCloud){V3.alpCloud.parent&&V3.alpCloud.parent.remove(V3.alpCloud);V3.alpCloud=null;}
  if(!G||G.camp||!G.feat||G.feat.layout!=='alpine')return;const T=V3.T,M=G.map,G3=alpGeos(),MT=alpMats(),win=G.feat.clime==='winter';
  for(const o of g.children)if(o.isMesh&&o.geometry.parameters&&o.geometry.parameters.width===N+120)o.material.color.set(win?'#c9ced3':'#3d4730');
  const rocks=[],wood=[];const RC=['#8a867e','#77736b','#9a958b','#6c6862'];
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=M[r][c],k=key(r,c),H=s=>v3Hash(k,s);const snow=x.snow||win;
    const add=(n,s0,s1,pr)=>{for(let i=0;i<n;i++){if(H(2000+i)>pr)continue;const s=s0+H(2010+i)*(s1-s0);rocks.push({x:c+.1+H(2020+i)*.8,y:s*.25,z:r+.1+H(2030+i)*.8,sx:s,sy:s*(.7+H(2040+i)*.6),sz:s*(.8+H(2050+i)*.4),ry:H(2060+i)*6.28,rx:(H(2070+i)-.5)*.6,col:snow&&H(2080+i)<.6?'#e6e9ec':RC[Math.floor(H(2090+i)*RC.length)]});}};
    if(x.cliff)add(4,.07,.2,.8);else if(x.scree)add(7,.03,.09,.85);else if(x.alm)add(3,.03,.1,.45);else if(x.summit)add(2,.03,.06,.5);else if(x.wild&&x.el>2)add(1,.05,.12,.25);
    if(x.summit&&x.obj!=null){// 돌탑과 정상 십자가(꼭대기 칸 모서리)
      const px=c+.82,pz=r+.2;for(let i=0;i<4;i++)rocks.push({x:px,y:.02+i*.035,z:pz,s:.06-i*.011,sy:.045-i*.006,ry:i*1.3,col:RC[i%RC.length]});
      wood.push({x:px+.12,y:.22,z:pz+.08,sx:.025,sy:.44,sz:.025});wood.push({x:px+.12,y:.33,z:pz+.08,sx:.18,sy:.025,sz:.025});}}
  v3Inst(g,G3.rock,MT.rock,rocks);v3Inst(g,G3.box,MT.wood,wood);
  // 먼 산맥: 지도 밖 둘레. 정점 색은 아래 바위 → 위 눈
  const R=mulberry(((G.seed|0)^0xfa1)>>>0),pos=[],col=[];const C=new T.Color(),cR=new T.Color('#5b5d5c'),cF=new T.Color('#34402e'),cS=new T.Color('#eef1f4');
  const peak=(cx,cz,rad,h)=>{const n=7,ring=[];const top=[cx+(R()-.5)*rad*.2,h,cz+(R()-.5)*rad*.2];
    for(let i=0;i<n;i++){const a=i/n*6.283+R()*.4,rr=rad*(.75+R()*.45);ring.push([cx+Math.cos(a)*rr,-.5,cz+Math.sin(a)*rr]);}
    const mid=ring.map(p=>[p[0]+(top[0]-p[0])*.45+(R()-.5)*rad*.15,h*(.38+R()*.12),p[2]+(top[2]-p[2])*.45+(R()-.5)*rad*.15]);
    const cv=y=>{const t=y/h;if(t>.62)C.copy(cS);else if(t>.3)C.copy(cR).lerp(cS,Math.max(0,(t-.45)*2));else C.copy(cF).lerp(cR,t/.3);if(win)C.lerp(cS,.75);return C;};
    const tri=(a,b,c)=>{for(const p of [a,b,c]){pos.push(p[0],p[1],p[2]);const k=cv(p[1]);col.push(k.r,k.g,k.b);}};
    for(let i=0;i<n;i++){const j=(i+1)%n;tri(ring[i],ring[j],mid[j]);tri(ring[i],mid[j],mid[i]);tri(mid[i],mid[j],top);}};
  const Cn=N/2;for(let i=0;i<34;i++){const a=i/34*6.283+R()*.12;const d=N*.9+R()*N*.5;const rad=11+R()*12;peak(Cn+Math.cos(a)*d,Cn+Math.sin(a)*d,rad,6+R()*8+(d-N*.9)*.18);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('color',new T.Float32BufferAttribute(col,3));geo.computeVertexNormals();
  const far=new T.Mesh(geo,MT.far);far.receiveShadow=false;far.castShadow=false;g.add(far);}

/* ---------- 고정 로프·구름·카메라 높이 (매 프레임) ---------- */
function alpRopes(){const T=V3.T,MT=alpMats(),G3=alpGeos();if(V3.alpRope){V3.alpRope.parent&&V3.alpRope.parent.remove(V3.alpRope);V3.alpRope=null;}const L=G.ropes||[];if(!L.length)return;
  const list=[];for(const p of L){const x0=p.c+.5,z0=p.r+.5;const e=.35;const gx=elAt(x0+e,z0)-elAt(x0-e,z0),gz=elAt(x0,z0+e)-elAt(x0,z0-e);const gl=Math.hypot(gx,gz)||1;const ux=gx/gl,uz=gz/gl;   // 오르막 방향
    for(let s=-.45;s<.45;s+=.15)list.push({x:x0+ux*(s+.075),y:.03,z:z0+uz*(s+.075),sx:.16,sy:.012,sz:.014,ry:-Math.atan2(uz,ux)});   // 땅에 붙은 줄(지형 높이는 셰이더가 정점마다 더한다)
    list.push({x:x0-ux*.45,y:.06,z:z0-uz*.45,sx:.03,sy:.08,sz:.03});list.push({x:x0+ux*.45,y:.06,z:z0+uz*.45,sx:.03,sy:.08,sz:.03});}
  const g=new T.Group();v3Inst(g,G3.box,MT.rope,list,{noShadow:1});V3.G.world.add(g);V3.alpRope=g;}
function alpClouds(on){const T=V3.T;if(V3.alpCloud){V3.alpCloud.parent&&V3.alpCloud.parent.remove(V3.alpCloud);V3.alpCloud=null;}if(on==null)return;
  const g=new T.Group();const R=mulberry(((G.seed|0)^0xc10d)>>>0);const spots=[];for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=G.map[r][c];if((x.el||0)>=on)spots.push([r,c]);}
  const n=Math.min(70,Math.round(spots.length*.35));for(let i=0;i<n&&spots.length;i++){const [r,c]=spots[Math.floor(R()*spots.length)];
    const s=new T.Sprite(new T.SpriteMaterial({map:V3.puff,color:i%3?'#e8eaec':'#c9cdd1',transparent:true,depthWrite:false,opacity:.42+R()*.2}));
    s.position.set(c+R(),.25+R()*1.1,r+R());const k=2.2+R()*3.2;s.scale.set(k*1.6,k,1);s.userData.v=(R()-.5)*.08;g.add(s);}
  V3.G.world.add(g);V3.alpCloud=g;}
{const _ef=v3EnvFrame;v3EnvFrame=function(now,dt){_ef(now,dt);if(!G||!V3.on||G.camp||!G.feat||G.feat.layout!=='alpine')return;try{
    const n=(G.ropes||[]).length;if(n!==ALP3.rope){ALP3.rope=n;alpRopes();}
    const cb=typeof alpCloud==='function'?alpCloud():null;if(cb!==ALP3.cloudOn){ALP3.cloudOn=cb;alpClouds(cb);}
    if(V3.alpCloud)for(const s of V3.alpCloud.children){s.position.x+=s.userData.v*dt;}
    const s=V3.cs;const want=elAt(s.x,s.z)*FLOOR_H*.85;if(s.ly==null||s.ly===0||s.ly===ALP3.ly){s.ly=ALP3.ly=(s.ly||0)+(want-(s.ly||0))*Math.min(1,dt*4);}
  }catch(e){console.error(e);}};}
/* ---------- 산악보병 모형 ---------- */
{const _sk=v3SolKind;v3SolKind=function(ty,i,n){if(ty!=='alp')return _sk(ty,i,n);return G&&G.feat&&G.feat.clime==='winter'?'alpw':'alp';};}
{const _ss=solSpec;solSpec=function(n,kind,vi){const s=_ss(n,kind,vi);if(kind==='alp'||kind==='alpw'){s.pack='big';s.head='helm';s.radio=vi===0?1:s.radio;
    if(kind==='alpw'){s.top=s.pants=s.helm='#e3e6e9';s.topC=s.pantsC=s.helmC=0;s.plate='#d5d8db';}}return s;};}
