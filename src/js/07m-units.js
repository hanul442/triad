/* ===================== 현대 부대 모형 =====================
   병사(플레이트캐리어·고컷 헬멧·광학조준경 소총)와 현대 차량(험비, 8륜 장갑차, 전차, 자주포).
   크기는 실제 비율: 타일 한 칸 ≈ 12m, 그래서 1m ≈ 0.083.
   차량은 종류마다 형상을 한 번만 만들어 두고 복제한다. 'body' 표시가 붙은 부품만 세력 색 재질로 바꾼다. */
const MU=1/12; // 1m

function v3ModMats(){if(V3.mm)return V3.mm;const T=V3.T;
  V3.mm={
    plate:new T.MeshStandardMaterial({color:'#5d5644',roughness:.9,flatShading:true}),   // 플레이트캐리어·주머니 (코요테 계열)
    gear:new T.MeshStandardMaterial({color:'#2b2a26',roughness:.85}),                      // 총·NVG·장비
    glass:new T.MeshStandardMaterial({color:'#1a2228',roughness:.25,metalness:.6}),        // 방탄유리
    tire:new T.MeshStandardMaterial({color:'#1c1c1b',roughness:.95}),
    track:new T.MeshStandardMaterial({color:'#2a2826',roughness:.9,metalness:.3,flatShading:true}),
    slat:new T.MeshStandardMaterial({color:'#3a3a35',roughness:.7,metalness:.4}),
  };return V3.mm;}

/* 옆모습(앞이 +x) 다각형을 폭 w만큼 밀어낸 차체. 경사 장갑을 만들 때 쓴다. */
function v3Prism(pts,w){const T=V3.T;const s=new T.Shape();pts.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();
  const g=new T.ExtrudeGeometry(s,{depth:w,bevelEnabled:false});g.translate(0,0,-w/2);return g;}

/* ---------- 병사 ----------
   병사 모형·자세는 07m2-soldier.js. 아래 v3PartsGeo는 부품 여러 개를 정점 색 형상 하나로 합치는 도구. */
Object.assign(SQUAD,{rifle:9,mg:6,at:4,sniper:2,eng:6,mortar:5,aa:3,ew:3,dteam:3,atgm:3});
function v3PartsGeo(parts){const T=V3.T;const P=[],Nn=[],C=[];const m4=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler(),v=new T.Vector3(),sc=new T.Vector3(),col=new T.Color();
  for(const p of parts){const g=p.g.index?p.g.toNonIndexed():p.g.clone();e.set(p.rx||0,p.ry||0,p.rz||0);q.setFromEuler(e);v.set(p.x||0,p.y||0,p.z||0);sc.set(p.sx||1,p.sy||1,p.sz||1);m4.compose(v,q,sc);g.applyMatrix4(m4);
    col.set(p.c);const pa=g.attributes.position.array,na=g.attributes.normal.array;for(let i=0;i<pa.length;i++){P.push(pa[i]);Nn.push(na[i]);}for(let i=0;i<pa.length/3;i++)C.push(col.r,col.g,col.b);g.dispose();}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(P,3));geo.setAttribute('normal',new T.Float32BufferAttribute(Nn,3));geo.setAttribute('color',new T.Float32BufferAttribute(C,3));return geo;}
/* ---------- 차량 ---------- */
/* 실제 군 장비 색(스타일 가이드): 양쪽 모두 바랜 올리브·황토. 세력은 발밑 표식과 팔의 색 테이프로 구분 */
const TAPE=['#7fb4d9','#d9765f','#e0b050','#b39ad9'];
function v3TapeMat(n){const id='tp'+n;if(!V3.matc.has(id))V3.matc.set(id,new V3.T.MeshBasicMaterial({color:TAPE[n]||'#ccc'}));return V3.matc.get(id);}
function v3CamoMat(n,kind){const id='cm'+kind+n;if(!V3.matc.has(id)){const T=V3.T;const base=kind==='veh'?(n%2?'#8d8268':'#55584a'):(n%2?'#7c735c':'#6f6a55');
    const col=new T.Color(base).lerp(new T.Color(MAPCOL[n]),.05);V3.matc.set(id,new T.MeshStandardMaterial({color:col,roughness:.85,metalness:kind==='veh'?.15:0,flatShading:true}));}
  return V3.matc.get(id);}
function v3VehicleM(ty,g,n){const T=V3.T;V3.vehT=V3.vehT||{};let body=v3CamoMat(n,'veh');
  // 민병대(홀수 세력)의 험비 자리는 짐칸에 기관총을 올린 민간 픽업(테크니컬)
  if(ty==='hmv'&&n%2){ty='tech';const id='tech'+n;if(!V3.matc.has(id))V3.matc.set(id,new T.MeshStandardMaterial({color:['#b8b09c','#3a3a38','#8c8270','#d0ccc2'][n%4],roughness:.6,metalness:.25,flatShading:true}));body=V3.matc.get(id);}
  if(!V3.vehT[ty])V3.vehT[ty]=ty==='zu'&&typeof v3ZuBuild==='function'?v3ZuBuild():ty==='mlrs'&&typeof v3MlrsBuild==='function'?v3MlrsBuild():v3VehBuild(ty);
  const src=V3.vehT[ty];const c=src.clone(true);
  c.traverse(m=>{if(m.isMesh){if(m.userData.body)m.material=body;m.castShadow=true;m.receiveShadow=true;}});
  g.add(c);let tur=null;c.traverse(m=>{if(m.userData.turret)tur=m;});if(tur)g.userData.tur=tur;return c;}

function v3VehBuild(ty){const T=V3.T,mm=v3ModMats(),M=V3.M;const g=new T.Group();
  const BODY=V3.vehBodyStub||(V3.vehBodyStub=new T.MeshStandardMaterial({color:'#6b6a55',flatShading:true}));
  const add=(geo,mat,x,y,z,par)=>{const m=new T.Mesh(geo,mat===0?BODY:mat);if(mat===0)m.userData.body=1;m.position.set(x,y,z);(par||g).add(m);return m;};
  const B=(w,h,d,x,y,z,mat=0,par)=>add(new T.BoxGeometry(w,h,d),mat,x,y,z,par);
  const P=(pts,w,x,y,z,mat=0,par)=>add(v3Prism(pts,w),mat,x,y,z,par);
  const wheel=(r,w,x,y,z)=>{const m=add(new T.CylinderGeometry(r,r,w,12),mm.tire,x,y,z);m.rotation.x=Math.PI/2;return m;};
  const gun=(len,r,x,y,z,par)=>{const m=add(new T.CylinderGeometry(r,r*1.15,len,8),M.steel,x+len/2,y,z,par);m.rotation.z=Math.PI/2;return m;};
  const tracks=(L,W,h,y)=>{for(const s of [-1,1]){B(L,h,W*.22,0,y,s*W*.39,mm.track);
      B(L*.9,h*.18,W*.24,0,y+h*.55,s*W*.39,0);}};// 궤도 위 펜더
  const m=MU;
  if(ty==='tech'){// 테크니컬: 픽업 차체 + 유리칸 + 짐칸 기관총(방패), 문짝에 흙먼지
    const K=CAR_KINDS.pickup,sc=pts=>pts.map(([x,y])=>[x*m,y*m]);
    P(sc(K.body),K.w*m,0,0,0);add(v3Prism(sc(K.cab),(K.w-.12)*m),mm.glass,0,0,0);
    B(1.4*m,.06*m,(K.w-.3)*m,.4*m,1.88*m,0);                                                   // 지붕
    for(const s of [-1,1])B(2.6*m,.35*m,.08*m,-1.5*m,1.3*m,s*(K.w/2-.05)*m);                  // 짐칸 옆판
    for(const [x,z] of [[1.75,1],[1.75,-1],[-1.75,1],[-1.75,-1]])wheel(.4*m,.3*m,x*m,.4*m,z*.85*m);
    const tur=new T.Group();tur.position.set(-1.6*m,1.15*m,0);tur.userData.turret=1;g.add(tur);
    add(new T.CylinderGeometry(.08*m,.12*m,.9*m,6),M.steel,0,.45*m,0,tur);                     // 거치대
    B(.06*m,.5*m,.9*m,.45*m,1.05*m,0,mm.slat,tur);gun(1.5*m,.06*m,.2*m,.95*m,0,tur);}
  else if(ty==='hmv'){// 험비: 4.6×2.2×1.9m, 넓고 낮은 차체, 지붕 기관총 사수석
    P([[-2.3*m,.45*m],[1.7*m,.45*m],[2.3*m,.75*m],[2.3*m,1.05*m],[1.0*m,1.2*m],[-2.3*m,1.2*m]],2.15*m,0,0,0);
    P([[-1.4*m,1.2*m],[.95*m,1.2*m],[.7*m,1.85*m],[-1.4*m,1.85*m]],1.95*m,0,0,0);           // 승무원 칸
    B(.06*m,.5*m,1.7*m,.84*m,1.5*m,0,mm.glass).rotation.z=-.35;                           // 앞유리
    for(const s of [-1,1])B(1.6*m,.38*m,.04*m,-.25*m,1.55*m,s*.99*m,mm.glass);             // 옆창
    B(.9*m,.35*m,2.0*m,-1.85*m,1.38*m,0);                                                   // 짐칸 덮개
    for(const [x,z] of [[1.45,1],[1.45,-1],[-1.45,1],[-1.45,-1]])wheel(.45*m,.38*m,x*m,.45*m,z*.92*m);
    const tur=new T.Group();tur.position.set(-.3*m,1.85*m,0);tur.userData.turret=1;g.add(tur);
    add(new T.CylinderGeometry(.55*m,.6*m,.25*m,10),0,0,.12*m,0,tur);                      // 사수 링
    B(.08*m,.55*m,1.1*m,.45*m,.45*m,0,0,tur);                                                // 방탄 방패
    gun(1.2*m,.05*m,.1*m,.4*m,0,tur);}
  else if(ty==='ifv'){// 8륜 장갑차: 7×2.7×2.6m, 경사 앞부분, 원격 사격 무기
    P([[-3.5*m,.55*m],[2.6*m,.55*m],[3.5*m,1.2*m],[3.3*m,1.7*m],[2.4*m,2.25*m],[-3.5*m,2.25*m]],2.7*m,0,0,0);
    for(const s of [-1,1])B(5.6*m,.12*m,.18*m,-.3*m,1.6*m,s*1.42*m,mm.slat);                // 옆 쇠살 장갑 띠
    for(const x of [2.2,1.0,-.8,-2.0])for(const s of [-1,1])wheel(.55*m,.4*m,x*m,.55*m,s*1.2*m);
    B(.9*m,.12*m,.9*m,1.4*m,2.31*m,.55*m,M.dark);B(.8*m,.1*m,.8*m,-2.4*m,2.3*m,-.5*m,M.dark);   // 해치
    B(1.2*m,.25*m,.5*m,-1.0*m,2.37*m,.85*m,mm.plate);                                         // 짐 묶음
    const tur=new T.Group();tur.position.set(.3*m,2.25*m,-.3*m);tur.userData.turret=1;g.add(tur);
    B(.7*m,.45*m,.6*m,0,.25*m,0,0,tur);B(.25*m,.2*m,.3*m,.1*m,.58*m,.25*m,mm.glass,tur);gun(1.3*m,.06*m,.3*m,.3*m,-.1*m,tur);}
  else if(ty==='tank'){// 주력전차: 차체 7.9×3.7m, 각진 포탑, 포신 5m
    P([[-3.9*m,.5*m],[3.2*m,.5*m],[3.95*m,1.1*m],[3.6*m,1.55*m],[-3.9*m,1.6*m]],3.0*m,0,0,0);
    tracks(7.6*m,3.7*m,1.0*m,.55*m);
    const tur=new T.Group();tur.position.set(-.4*m,1.6*m,0);tur.userData.turret=1;g.add(tur);
    P([[-2.6*m,0],[1.6*m,0],[2.4*m,.35*m],[2.2*m,.8*m],[-2.4*m,.85*m]],3.3*m,0,0,0,0,tur);   // 쐐기형 포탑
    B(1.0*m,.25*m,3.0*m,-2.6*m,.45*m,0,mm.slat,tur);                                         // 뒤 바구니
    B(.5*m,.3*m,.5*m,.2*m,1.0*m,.8*m,M.dark,tur);B(.45*m,.25*m,.45*m,-.4*m,1.0*m,-.8*m,M.dark,tur); // 조준경·해치
    const bar=gun(5.2*m,.1*m,2.2*m,.45*m,0,tur);
    add(new T.CylinderGeometry(.16*m,.16*m,.7*m,8),M.steel,4.4*m,.45*m,0,tur).rotation.z=Math.PI/2;} // 배연기
  else if(ty==='spg'){// 자주포: 궤도 차체에 높고 큰 상자 포탑, 긴 포신과 포구 제퇴기
    P([[-3.4*m,.5*m],[2.8*m,.5*m],[3.4*m,1.0*m],[3.1*m,1.5*m],[-3.4*m,1.5*m]],3.0*m,0,0,0);
    tracks(6.8*m,3.6*m,.95*m,.52*m);
    const tur=new T.Group();tur.position.set(-.9*m,1.5*m,0);tur.userData.turret=1;g.add(tur);
    P([[-2.2*m,0],[1.6*m,0],[1.9*m,.6*m],[1.6*m,1.45*m],[-2.2*m,1.45*m]],3.1*m,0,0,0,0,tur);
    B(.6*m,.35*m,.6*m,-.6*m,1.62*m,.8*m,M.dark,tur);B(.25*m,.25*m,3.2*m,-2.2*m,.9*m,0,mm.slat,tur);
    gun(6.2*m,.09*m,1.7*m,.7*m,0,tur);
    B(.35*m,.22*m,.5*m,8.0*m,.7*m,0,M.steel,tur);                                            // 포구 제퇴기
    B(.15*m,.6*m,.4*m,3.0*m,.9*m,0,M.dark);}                                                  // 이동 고정대
  return g;}
