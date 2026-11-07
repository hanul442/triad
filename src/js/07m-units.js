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
   영화 Civil War(2024)처럼: 정규군(짝수 세력)은 같은 군복과 헬멧, 민병대(홀수 세력)는 청바지·후드·야구모자 위에
   플레이트캐리어를 걸친 제각각 차림. 병사마다 머리·조끼·배낭·총이 조금씩 다르고, 분대장은 무전기 안테나를 단다.
   다리 둘(걸음 흔들림)을 빼면 몸 전체를 정점 색을 쓴 형상 하나로 합쳐서, 인원이 많아도 그리기 부담이 작다. */
Object.assign(SQUAD,{rifle:9,mg:6,at:4,sniper:2,eng:6,mortar:5,aa:3,ew:3});
const SOL={
  reg:{top:['#6f6a55','#726b55','#6a6650'],pants:['#69634e','#6d6651'],plate:['#7a6a50','#6c6248','#5c5a46'],head:['helm','helm','helm','helm','helm','boonie']},
  mil:{top:['#4a4a46','#2f3a2e','#5a5040','#3a3f4a','#6f6a55','#55493b','#2c2c2b','#6b6b66'],pants:['#3c4656','#7a6e55','#2a2a2a','#69634e','#4d4a42'],
       plate:['#2a2a28','#7a6a50','#4a5040','#3a3a36'],head:['cap','cap','cap','helm','helm','helm','beanie','boonie','bare']},
};
const SKIN=['#c9a184','#b08466','#8a6248','#d5b195','#6e4b36'];
function v3PartsGeo(parts){const T=V3.T;const P=[],Nn=[],C=[];const m4=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler(),v=new T.Vector3(),sc=new T.Vector3(),col=new T.Color();
  for(const p of parts){const g=p.g.index?p.g.toNonIndexed():p.g.clone();e.set(p.rx||0,p.ry||0,p.rz||0);q.setFromEuler(e);v.set(p.x||0,p.y||0,p.z||0);sc.set(p.sx||1,p.sy||1,p.sz||1);m4.compose(v,q,sc);g.applyMatrix4(m4);
    col.set(p.c);const pa=g.attributes.position.array,na=g.attributes.normal.array;for(let i=0;i<pa.length;i++){P.push(pa[i]);Nn.push(na[i]);}for(let i=0;i<pa.length/3;i++)C.push(col.r,col.g,col.b);g.dispose();}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(P,3));geo.setAttribute('normal',new T.Float32BufferAttribute(Nn,3));geo.setAttribute('color',new T.Float32BufferAttribute(C,3));return geo;}
function v3SoldierM(n,kind){const T=V3.T;
  const B=(w,h,d)=>new T.BoxGeometry(w,h,d),pick=(a)=>a[Math.floor(Math.random()*a.length)];
  const st=n%2?SOL.mil:SOL.reg;const top=pick(st.top),pants=pick(st.pants),plate=pick(st.plate),skin=pick(SKIN);
  let head=pick(st.head);if(kind==='sniper')head=Math.random()<.6?'boonie':head;
  const radio=kind!=='rifle'&&kind!=='sniper'?Math.random()<.5:Math.random()<.14;
  const pack=kind==='eng'||kind==='mortar'?'big':kind==='sniper'?'none':pick(['small','small','big','none']);
  const gunT=kind==='mg'?'mg':kind==='sniper'?'dmr':n%2&&Math.random()<.2?'ak':'m4';
  const vkey=[n%2,kind,top,pants,plate,skin,head,radio,pack,gunT].join('|');
  V3.solG=V3.solG||new Map();let G1=V3.solG.get(vkey);
  if(!G1){const tape=TAPE[n]||'#ccc',dk='#262624',hc=head==='helm'?(n%2?pick(['#6c6550','#3c3d36','#7a6e55']):'#6a6550'):head==='cap'?pick(['#2a2a2a','#7a6e55','#4a4a40','#5a2a24']):head==='beanie'?pick(['#2c2c2c','#4a4a3e']):'#6f6a55';
    const L=[
      {g:B(.04,.056,.034),y:.092,c:top},                                   // 몸통
      {g:B(.05,.048,.044),y:.096,x:.001,c:plate},                          // 플레이트캐리어 (어깨가 넓어 보이게)
      {g:B(.012,.016,.034),y:.086,x:.027,c:plate},                         // 앞 탄창 주머니
      {g:B(.016,.012,.03),y:.071,x:0,c:pants},                             // 허리·벨트
      {g:B(.012,.008,.009),y:.107,z:-.027,c:tape},{g:B(.012,.008,.009),y:.107,z:.027,c:tape},  // 팔의 색 테이프
      // 팔: 어깨에서 앞으로 뻗어 총을 잡는다
      {g:B(.034,.012,.012),x:.016,y:.102,z:-.024,ry:-.35,rz:-.35,c:top},
      {g:B(.034,.012,.012),x:.02,y:.1,z:.024,ry:.45,rz:-.25,c:top},
      {g:new T.SphereGeometry(.0135,7,5),x:.002,y:.133,c:skin},            // 머리
    ];
    if(head==='helm'){L.push({g:new T.SphereGeometry(.0175,8,5,0,Math.PI*2,0,Math.PI*.45),y:.135,c:hc});if(!(n%2)||Math.random()<.4)L.push({g:B(.007,.009,.011),x:.016,y:.14,c:dk});}
    else if(head==='boonie'){L.push({g:new T.CylinderGeometry(.013,.015,.011,8),y:.143,c:hc},{g:new T.CylinderGeometry(.026,.026,.002,10),y:.138,c:hc});}
    else if(head==='cap'){L.push({g:new T.SphereGeometry(.0145,8,4,0,Math.PI*2,0,Math.PI*.5),y:.136,c:hc},{g:B(.014,.002,.016),x:.016,y:.137,c:hc},{g:B(.004,.008,.03),y:.133,c:dk});}// 모자 + 귀마개 헤드셋
    else if(head==='beanie')L.push({g:new T.SphereGeometry(.015,8,4,0,Math.PI*2,0,Math.PI*.55),y:.135,c:hc});
    else L.push({g:B(.004,.01,.032),y:.134,c:dk});                       // 맨머리 + 헤드셋
    if(pack==='small')L.push({g:B(.018,.03,.026),x:-.032,y:.1,c:plate});
    if(pack==='big')L.push({g:B(.026,.046,.032),x:-.036,y:.1,c:n%2?pick(['#3a3a34','#4a5040','#5a5040']):'#5d5644'});
    if(radio)L.push({g:B(.012,.02,.014),x:-.03,y:.118,z:.01,c:dk},{g:B(.0015,.08,.0015),x:-.032,y:.165,z:.012,rz:.12,c:dk});
    // 총: 몸 앞에 비스듬히 든 자세
    const gx=.034,gy=.098,gz=.008,ry=.25;
    if(gunT==='mg')L.push({g:B(.09,.016,.012),x:gx+.006,y:gy,z:gz,ry,c:dk},{g:B(.016,.02,.016),x:gx-.004,y:gy-.014,z:gz,ry,c:'#4a4a40'});
    else if(gunT==='dmr')L.push({g:B(.11,.009,.008),x:gx+.012,y:gy,z:gz,ry,c:dk},{g:B(.024,.008,.007),x:gx,y:gy+.008,z:gz,ry,c:dk});
    else L.push({g:B(.07,.009,.008),x:gx,y:gy,z:gz,ry,c:gunT==='ak'?'#4a3a2a':dk},{g:B(.016,.007,.006),x:gx-.002,y:gy+.008,z:gz,ry,c:dk},{g:B(.008,.016,.006),x:gx+.004,y:gy-.011,z:gz,ry,rz:gunT==='ak'?.4:0,c:dk});
    if(kind==='at')L.push({g:new T.CylinderGeometry(.009,.009,.1,6),x:-.03,y:.122,z:-.012,rz:Math.PI/2-.35,c:n%2?'#4a5040':'#6b6650'});
    if(kind==='aa')L.push({g:new T.CylinderGeometry(.008,.01,.13,6),x:.005,y:.135,z:-.016,rz:Math.PI/2-.25,c:'#5d6450'},{g:B(.014,.018,.01),x:.03,y:.125,z:-.016,c:dk});// 어깨에 멘 대공미사일 발사관
    if(kind==='ew')L.push({g:B(.024,.036,.03),x:-.034,y:.104,c:'#3c3f38'},{g:B(.0015,.07,.0015),x:-.036,y:.15,z:-.01,rz:.25,c:dk},{g:B(.0015,.07,.0015),x:-.036,y:.15,z:.01,rz:-.25,c:dk},{g:B(.03,.012,.02),x:.036,y:.104,z:.01,c:'#55584e'});// 재머 배낭·안테나·휴대 장비
    if(kind==='mortar'&&Math.random()<.5)L.push({g:new T.CylinderGeometry(.007,.007,.07,6),x:-.034,y:.13,rz:.3,c:'#3d4246'});
    G1=v3PartsGeo(L);V3.solG.set(vkey,G1);}
  const bodyM=V3.solM||(V3.solM=new T.MeshStandardMaterial({vertexColors:true,roughness:.88,flatShading:true}));
  const lg=V3.solLeg||(V3.solLeg=B(.016,.064,.019).translate(0,-.032,0));
  const pid='pl'+pants;if(!V3.matc.has(pid))V3.matc.set(pid,new T.MeshStandardMaterial({color:pants,roughness:.9,flatShading:true}));const pm=V3.matc.get(pid);
  const g=new T.Group();const body=new T.Mesh(G1,bodyM);body.castShadow=true;g.add(body);
  const legL=new T.Mesh(lg,pm),legR=new T.Mesh(lg,pm);legL.position.set(0,.066,-.011);legR.position.set(0,.066,.011);legL.castShadow=legR.castShadow=true;g.add(legL,legR);
  const sz=.96+Math.random()*.1;g.scale.setScalar(sz);
  body.userData.keepGeo=1;legL.userData.keepGeo=1;legR.userData.keepGeo=1;
  g.userData={legL,legR,tor:body};return g;}

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
  if(!V3.vehT[ty])V3.vehT[ty]=ty==='zu'&&typeof v3ZuBuild==='function'?v3ZuBuild():v3VehBuild(ty);
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
