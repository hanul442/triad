/* ===================== 도시 소품 =====================
   지금 시대 도시 느낌을 내는 소품들. 모두 칸 좌표와 v3Hash로 정해서, 같은 지도면 언제나 같은 자리에 놓인다.
   - v3BuildProps(g): 지면 그룹에 주차된 차(SUV·세단·픽업, 일부는 불탐), 신호등, 가로등, 공원(나무·벤치·산책로 등), 연못
   - v3BuildShops(g): 건물 그룹에 1층 상가(유리 진열창, 차양, 간판). 건물이 부서지면 다시 그려진다. */

function v3PropMats(){if(V3.pm)return V3.pm;const T=V3.T;
  const pm={
    car:new T.MeshStandardMaterial({color:'#ffffff',roughness:.45,metalness:.35}),
    glass:new T.MeshStandardMaterial({color:'#20282d',roughness:.2,metalness:.6}),
    tire:new T.MeshStandardMaterial({color:'#1b1b1a',roughness:.95}),
    pole:new T.MeshStandardMaterial({color:'#4a4c4c',roughness:.6,metalness:.5}),
    sig:new T.MeshStandardMaterial({color:'#1d1f1f',roughness:.7}),
    lamp:new T.MeshStandardMaterial({color:'#000',emissive:'#ffffff',emissiveIntensity:1.4}),
    leaf:new T.MeshStandardMaterial({color:'#ffffff',roughness:1,flatShading:true}),
    bark:new T.MeshStandardMaterial({color:'#4a3d30',roughness:1}),
    wood:new T.MeshStandardMaterial({color:'#6b5843',roughness:.9}),
    hedge:new T.MeshStandardMaterial({color:'#47513a',roughness:1,flatShading:true}),
    path:new T.MeshStandardMaterial({color:'#9a9283',roughness:1}),
    conc:new T.MeshStandardMaterial({color:'#8f8a80',roughness:1,flatShading:true}),
    bin:new T.MeshStandardMaterial({color:'#3f5143',roughness:.8,metalness:.3}),
    water:new T.MeshStandardMaterial({color:'#33464c',roughness:.08,metalness:.55}),
    stone:new T.MeshStandardMaterial({color:'#8c877d',roughness:1,flatShading:true}),
    reed:new T.MeshStandardMaterial({color:'#6b6a48',roughness:1,flatShading:true}),
    shop:new T.MeshStandardMaterial({color:'#ffffff',roughness:.25,metalness:.5}),
    awn:new T.MeshStandardMaterial({color:'#ffffff',roughness:.9,side:T.DoubleSide}),
    sign:new T.MeshStandardMaterial({color:'#ffffff',roughness:.6,emissive:'#ffffff',emissiveIntensity:0}),
  };
  for(const k in pm)if(k!=='lamp')v3FowMat(pm[k]);
  V3.pm=pm;return pm;}

/* 인스턴스 묶음: 같은 형상을 여러 자리에 한 번에 그린다 */
function v3Inst(g,geo,mat,list,opt){if(!list.length)return null;const T=V3.T;const im=new T.InstancedMesh(geo,mat,list.length);
  const m4=new T.Matrix4(),q=new T.Quaternion(),p=new T.Vector3(),s=new T.Vector3(),e=new T.Euler(0,0,0,'YXZ'),c=new T.Color();
  list.forEach((it,i)=>{p.set(it.x,it.y||0,it.z);e.set(it.rx||0,it.ry||0,it.rz||0);q.setFromEuler(e);const k=it.s??1;s.set(it.sx??k,it.sy??k,it.sz??k);m4.compose(p,q,s);im.setMatrixAt(i,m4);
    if(it.col)im.setColorAt(i,c.set(it.col));});
  im.castShadow=!(opt&&opt.noShadow);im.receiveShadow=true;if(opt&&opt.keys)im.userData.keys=list.map(it=>it.k);g.add(im);return im;}

/* ---------- 차 ---------- */
// 옆모습 두 개(차체, 유리칸)와 지붕판으로 차 한 대를 이룬다. 앞이 +x.
const CAR_KINDS={
  suv:{body:[[-2.45,.35],[2.45,.35],[2.45,.9],[1.6,1.05],[-2.45,1.05]],cab:[[-2.3,1.05],[1.4,1.05],[.8,1.75],[-2.3,1.75]],w:1.95},
  sedan:{body:[[-2.35,.3],[2.35,.3],[2.35,.75],[1.2,.85],[-2.35,.85]],cab:[[-1.5,.85],[1.0,.85],[.3,1.42],[-1.1,1.42]],w:1.82},
  pickup:{body:[[-2.8,.42],[2.8,.42],[2.8,1.0],[1.9,1.12],[-2.8,1.12]],cab:[[-.4,1.12],[1.7,1.12],[1.1,1.85],[-.4,1.85]],w:2.0},
};
function v3CarGeos(){if(V3.carG)return V3.carG;const m=MU;const out={};
  for(const k in CAR_KINDS){const d=CAR_KINDS[k];const sc=pts=>pts.map(([x,y])=>[x*m,y*m]);
    const top=d.cab[3][1],x0=d.cab[3][0]+.05,x1=d.cab[2][0]-.05;
    out[k]={body:v3Prism(sc(d.body),d.w*m),cab:v3Prism(sc(d.cab),(d.w-.12)*m),
      roof:new V3.T.BoxGeometry((x1-x0)*m,.06*m,(d.w-.32)*m).translate((x0+x1)/2*m,(top+.03)*m,0)};}
  out.wheel=new V3.T.CylinderGeometry(.34*MU,.34*MU,.24*MU,6).rotateX(Math.PI/2);
  V3.carG=out;return out;}

function v3BuildProps(g){const T=V3.T,pm=v3PropMats(),m=MU;
  if(!G.props)propCovers();const PR=G.props||[];
  /* 주차된 차: 인도 쪽 갓길에 나란히(자리는 genProps가 정함). 일부는 불타 검게 그을리고, 몇 대는 뒤집혀 있다 */
  const cars={suv:{b:[],c:[],r:[]},sedan:{b:[],c:[],r:[]},pickup:{b:[],c:[],r:[]}},wheels=[];
  for(const p of PR){if(p.k!=='car')continue;const {kind,x,z,ry,burnt,flip,col}=p;
    const fy=flip?(CAR_KINDS[kind].cab[2][1]+.05)*m:0,rx=flip?Math.PI:0;
    cars[kind].b.push({x,y:fy,z,ry,rx,col});if(!burnt)cars[kind].r.push({x,z,ry,col});cars[kind].c.push({x,y:fy,z,ry,rx,col:burnt?'#1a1816':'#ffffff'});
    if(!burnt&&!p.lot){const L=CAR_KINDS[kind].body[1][0]*.62*m,W=CAR_KINDS[kind].w*.5*m,cs=Math.cos(ry),sn=Math.sin(ry);
      for(const [fx,fz] of [[1,1],[1,-1],[-1,1],[-1,-1]]){const lx=fx*L,lz=fz*W;wheels.push({x:x+lx*cs+lz*sn,y:.34*m,z:z-lx*sn+lz*cs,ry});}}}
  const cg=v3CarGeos();
  for(const kind in cars){v3Inst(g,cg[kind].body,pm.car,cars[kind].b);v3Inst(g,cg[kind].cab,pm.glass,cars[kind].c);v3Inst(g,cg[kind].roof,pm.car,cars[kind].r);}
  v3Inst(g,cg.wheel,pm.tire,wheels,{noShadow:1});
  /* 신호등: 기둥 + 도로 위로 뻗은 팔 + 신호기 두 개 */
  {const pole=[],arm=[],head=[],lit=[];
    for(const s of PR){if(s.k!=='light')continue;const ry=Math.atan2(-s.dz,s.dx);
      pole.push({x:s.x,y:3*m,z:s.z});
      arm.push({x:s.x+s.dx*2.2*m,y:5.6*m,z:s.z+s.dz*2.2*m,ry});
      for(const f of [2.4,4.2]){const hx=s.x+s.dx*f*m,hz=s.z+s.dz*f*m;head.push({x:hx,y:5.1*m,z:hz,ry});
        lit.push({x:hx,y:4.75*m+(s.red?.6*m:0),z:hz,col:s.red?'#ff3b2f':'#3cff8a'});}}
    v3Inst(g,new T.CylinderGeometry(.09*m,.12*m,6*m,6),pm.pole,pole);
    v3Inst(g,new T.BoxGeometry(4.4*m,.12*m,.12*m),pm.pole,arm);
    v3Inst(g,new T.BoxGeometry(.4*m,1.2*m,.4*m),pm.sig,head);
    const lm=V3.litM||(V3.litM=new T.MeshBasicMaterial({color:'#ffffff'}));v3Inst(g,new T.SphereGeometry(.17*m,6,4),lm,lit,{noShadow:1});}
  /* 가로등 */
  {const pole=[],head=[];for(const l of PR){if(l.k!=='lamp')continue;pole.push({x:l.x,y:4*m,z:l.z});head.push({x:l.x,y:8*m,z:l.z,ry:l.ry});}
    v3Inst(g,new T.CylinderGeometry(.07*m,.1*m,8*m,5),pm.pole,pole);
    v3Inst(g,new T.BoxGeometry(1.2*m,.18*m,.35*m).translate(.6*m,0,0),pm.pole,head);}
  /* 콘크리트 방벽(저지 블록), 쓰레기 컨테이너, 생울타리 */
  {const bar=[],bin=[],lid=[],hedge=[];
    for(const p of PR){if(p.k==='barrier')bar.push({x:p.x,z:p.z,ry:p.ry});else if(p.k==='bin'){bin.push({x:p.x,y:.7*m,z:p.z,ry:p.ry});lid.push({x:p.x,y:1.45*m,z:p.z,ry:p.ry,rz:.08});}
      else if(p.k==='hedge')hedge.push({x:p.x,y:.5*m,z:p.z,ry:p.ry});}
    v3Inst(g,v3Prism([[-.3*m,0],[.3*m,0],[.1*m,.35*m],[.08*m,.8*m],[-.08*m,.8*m],[-.1*m,.35*m]],3.2*m).rotateY(Math.PI/2),pm.conc,bar);
    v3Inst(g,new T.BoxGeometry(1.0*m,1.4*m,1.9*m),pm.bin,bin);v3Inst(g,new T.BoxGeometry(1.1*m,.1*m,2.0*m),pm.sig,lid,{noShadow:1});
    v3Inst(g,new T.BoxGeometry(12*m,1*m,.9*m),pm.hedge,hedge);}
  v3BuildPark(g);v3BuildPonds(g);}

/* ---------- 공원 ---------- */
// 잎이 달린 나무: 몇 개의 각진 덩어리를 겹쳐 한 형상으로
function v3LeafTreeG(){if(V3.leafG)return V3.leafG;const T=V3.T;const parts=[];const R=mulberry(41);
  for(let i=0;i<4;i++){const s=(.9+R()*.6)*MU*2.2;const g=new T.IcosahedronGeometry(s,0);g.translate((R()-.5)*2.2*MU,7*MU+R()*2*MU,(R()-.5)*2.2*MU);parts.push(g.toNonIndexed());}
  let n=0;for(const g of parts)n+=g.attributes.position.count;const P=new Float32Array(n*3);let o=0;for(const g of parts){P.set(g.attributes.position.array,o);o+=g.attributes.position.array.length;g.dispose();}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(P,3));geo.computeVertexNormals();V3.leafG=geo;return geo;}
function v3BuildPark(g){const T=V3.T,pm=v3PropMats(),m=MU;
  const park=(r,c)=>inb(r,c)&&!G.map[r][c].yard&&(G.map[r][c].t==='park'||G.map[r][c].t==='water');
  const trees=[],trunks=[],bench=[],paths=[],plamp=[];const LEAF=['#6e6a4c','#7a7353','#5f5d43','#76704f','#665f45'];
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){if(G.map[r][c].t!=='park')continue;const k=key(r,c);const [cx,cz]=v3x(r,c);
    // 산책로: 이웃 공원 칸으로 이어지는 흙길, 칸 가운데서 만난다
    const yard=G.map[r][c].yard||G.map[r][c].wild;// 주택 마당·숲(03c)은 길·벤치 없이 나무만
    const nb=yard?[]:[[0,1],[1,0]].filter(([a,b])=>park(r+a,c+b));
    if(!yard&&(nb.length||v3Hash(k,400)<.5)){paths.push({x:cx,y:.004,z:cz,sx:1,sz:1,ry:0,k,disc:1});
      for(const [a,b] of nb)paths.push({x:cx+b*.5,y:.003,z:cz+a*.5,ry:b?0:Math.PI/2,k});}
    for(let i=0;i<2;i++)if(v3Hash(k,410+i)<(G.map[r][c].wild&&typeof natWildTrees==='function'?.08:.3)){const a=v3Hash(k,420+i)*6.28,rr=.26+v3Hash(k,430+i)*.16;const x=cx+Math.cos(a)*rr,z=cz+Math.sin(a)*rr,s=.8+v3Hash(k,440+i)*.5;
      trees.push({x,y:0,z,s,ry:v3Hash(k,450+i)*6.28,col:LEAF[Math.floor(v3Hash(k,460+i)*LEAF.length)],k});trunks.push({x,y:3.5*m*s,z,s});}
    if(yard)continue;
    if(v3Hash(k,470)<.45){const side=v3Hash(k,471)<.5;bench.push({x:cx+(side?.12:0),y:.25*m,z:cz+(side?0:.12),ry:side?Math.PI/2:0});}
    if(v3Hash(k,480)<.25)plamp.push({x:cx-.1,y:2*m,z:cz-.1});}
  v3Inst(g,v3LeafTreeG(),pm.leaf,trees,{keys:1});
  v3Inst(g,new T.CylinderGeometry(.18*m,.25*m,7*m,5),pm.bark,trunks);
  // 산책로: 칸 가운데 둥근 마당 + 이웃으로 뻗는 길
  {const disc=paths.filter(p=>p.disc).map(p=>({...p,rx:-Math.PI/2})),lane=paths.filter(p=>!p.disc).map(p=>({...p,rx:-Math.PI/2}));
    v3Inst(g,new T.CircleGeometry(.16,14),pm.path,disc,{noShadow:1});v3Inst(g,new T.PlaneGeometry(1,.06),pm.path,lane,{noShadow:1});}
  v3Inst(g,new T.BoxGeometry(1.8*m,.5*m,.6*m),pm.wood,bench);
  v3Inst(g,new T.CylinderGeometry(.06*m,.08*m,4*m,5),pm.pole,plamp);}

/* ---------- 연못 ---------- */
// 물 칸마다 울퉁불퉁한 원형 수면, 돌 테두리, 갈대 몇 무더기. 붙은 물 칸끼리는 수면이 겹쳐 하나로 보인다.
function v3BuildPonds(g){const T=V3.T,pm=v3PropMats(),m=MU;const stones=[],reeds=[];
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){if(G.map[r][c].t!=='water'||G.map[r][c].rv||G.map[r][c].sea)continue;   // 강은 07g가, 바다는 07g2가 그린다
   const k=key(r,c);const [cx,cz]=v3x(r,c);
    const wet=(a,b)=>inb(r+a,c+b)&&G.map[r+a][c+b].t==='water';
    const S=40,pts=[];for(let i=0;i<S;i++){const a=i/S*Math.PI*2;const dx=Math.cos(a),dz=Math.sin(a);
      // 물 칸 쪽으로는 칸 끝까지 뻗어 이웃 수면과 이어진다
      const toward=(dx>.6&&wet(0,1))||(dx<-.6&&wet(0,-1))||(dz>.6&&wet(1,0))||(dz<-.6&&wet(-1,0));
      const rr=toward?.62:.38+Math.sin(a*3+v3Hash(k,500)*6)*.035+Math.sin(a*5+v3Hash(k,501)*6)*.02;pts.push([dx*rr,dz*rr,toward]);}
    const sh=new T.Shape();pts.forEach(([x,z],i)=>i?sh.lineTo(x,-z):sh.moveTo(x,-z));sh.closePath();
    const wg=new T.ShapeGeometry(sh);wg.rotateX(-Math.PI/2);const w=new T.Mesh(wg,pm.water);w.position.set(cx,.012,cz);w.receiveShadow=true;g.add(w);
    pts.forEach(([x,z,toward],i)=>{if(toward||i%2)return;{const sz=(.25+v3Hash(k,510+i)*.3)*m*1.6;stones.push({x:cx+x*1.04,y:.006,z:cz+z*1.04,s:sz,sy:sz*.45,ry:v3Hash(k,520+i)*6});}});
    for(let i=0;i<3;i++){if(v3Hash(k,530+i)<.35)continue;const a=v3Hash(k,540+i)*6.28;const rr=.34;
      for(let j=0;j<5;j++)reeds.push({x:cx+Math.cos(a)*rr+(v3Hash(k,550+i*5+j)-.5)*.06,y:.6*m,z:cz+Math.sin(a)*rr+(v3Hash(k,560+i*5+j)-.5)*.06,rx:(v3Hash(k,570+j)-.5)*.4,rz:(v3Hash(k,580+j)-.5)*.4});}}
  v3Inst(g,new T.DodecahedronGeometry(1,0),pm.stone,stones);
  v3Inst(g,new T.ConeGeometry(.06*m,1.3*m,3),pm.reed,reeds,{noShadow:1});}

/* ---------- 1층 상가 ---------- */
const SHOP_AWN=['#3f4a3a','#5a2e2a','#283548','#7a6a4c','#5d5f5f','#6b4a2e','#8a8476'];
const SHOP_SIGN=['#d8d2c2','#c9b26a','#9c3b2f','#2f4a63','#e0ddd5','#3a3a3a','#b46a2c'];
function v3BuildShops(g){const T=V3.T,pm=v3PropMats(),m=MU,IN=.08,y0=.06;const glass=[],awn=[],sign=[],door=[];
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=G.map[r][c];if(x.t!=='bldg'||x.lm||x.dist==='res'||x._ch||x.ind||x.stn||x.ks==='villa'||x.ks==='school'||x.ks==='house'||(x.ks==='apt'&&v3Hash(key(r,c),670)<.7))continue;const dmg=1-x.bhp/x.bmax;if(dmg>=.4)continue;const k=key(r,c);const [cx,cz]=v3x(r,c);
    for(const [a,b,si] of [[-1,0,0],[1,0,1],[0,-1,2],[0,1,3]]){if(!inb(r+a,c+b)||G.map[r+a][c+b].t!=='road'||G.map[r+a][c+b].al)continue;if(v3Hash(k,600+si)<.3)continue;
      const d=.5-IN+.004;const fx=cx+b*d,fz=cz+a*d;const ry=b?Math.PI/2:0;const W=.82;
      // 바깥을 향한 단위벡터 (a,b) → 월드 (b,a)
      glass.push({x:fx,y:y0+.1,z:fz,ry,sx:W,sy:.17,sz:.01,col:H2(k,si)<.15?'#3b3530':'#ffffff'});
      if(dmg<.2&&v3Hash(k,610+si)<.75){const col=SHOP_AWN[Math.floor(v3Hash(k,620+si)*SHOP_AWN.length)];
        awn.push({x:fx+b*.035,y:y0+.215,z:fz+a*.035,ry,rx:(a+b)*.5,sx:W*.94,sy:.005,sz:.08,col});}
      sign.push({x:fx+b*.006,y:y0+.27,z:fz+a*.006,ry,sx:W*(.5+v3Hash(k,630+si)*.4),sy:.045,sz:.012,col:SHOP_SIGN[Math.floor(v3Hash(k,640+si)*SHOP_SIGN.length)]});}}
  function H2(k,s){return v3Hash(k,650+s);}
  const box=new T.BoxGeometry(1,1,1);
  // 주유소: 지붕(캐노피)과 기둥, 주유기
  const gas=[],gpost=[];for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=G.map[r][c];if(!x.gas)continue;const k=key(r,c);const [cx,cz]=v3x(r,c);
    if(v3Hash(k,660)<.5){gas.push({x:cx,y:y0+.32,z:cz,ry:0,sx:.78,sy:.05,sz:.56,col:'#e4e2dc'});gas.push({x:cx,y:y0+.3,z:cz+.28,ry:0,sx:.78,sy:.02,sz:.012,col:SHOP_SIGN[Math.floor(v3Hash(k,661)*SHOP_SIGN.length)]});
      for(const o of [-.22,.22]){gpost.push({x:cx+o,y:y0+.15,z:cz,ry:0,sx:.035,sy:.3,sz:.035,col:'#9a9890'});gpost.push({x:cx+o,y:y0+.03,z:cz,ry:0,sx:.06,sy:.06,sz:.28,col:'#bdbab2'});gpost.push({x:cx+o,y:y0+.075,z:cz+.06,ry:0,sx:.04,sy:.07,sz:.035,col:'#a83a30'});}}}
  if(gas.length)v3Inst(g,box,pm.awn,gas);if(gpost.length)v3Inst(g,box,pm.awn,gpost);
  v3Inst(g,box,pm.shop,glass,{noShadow:1});v3Inst(g,box,pm.awn,awn);v3Inst(g,box,pm.sign,sign,{noShadow:1});}
