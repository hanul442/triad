/* ===================== 실제 비율 항공기 모형 =====================
   수송헬기는 UH-1 휴이처럼: 올리브색 동체, 두 날 메인 로터와 흐릿한 회전면, 왼쪽 꼬리 로터, 스키드,
   활짝 열린 화물칸 문과 기관총을 든 도어거너. 공격헬기는 앞뒤로 앉는 조종석·기수 센서·기관포·날개 무장.
   정찰드론·FPV 자폭드론·전투기도 실제 생김새대로. 1m = MU(1/12 타일).
   형상은 종류마다 한 번 만들어 두고 복제한다(형상·재질 공유).

   수송헬기 비행도 실제처럼: 나무·지붕 위를 낮게 날아와 감속하며 기수를 들고(플레어), 잠깐 떠 있다가
   천천히 내려앉는다. 분대가 내리면 떠올라 기수를 숙이고 앞으로 가속하며 몸을 기울여 선회해 빠진다.
   낮게 뜰수록 로터 바람이 바닥 먼지를 둥글게 밀어낸다. */
const ACM={};
function acMats(){if(ACM.od)return ACM;const T=V3.T;const S=(c,r,m,o)=>new T.MeshStandardMaterial(Object.assign({color:c,roughness:r??.8,metalness:m??.15,flatShading:true,side:T.DoubleSide},o||{}));
  Object.assign(ACM,{
    od:S('#5b6142',.8,.1),        // 올리브 드랩 (휴이)
    ah:S('#474d39',.78,.15),       // 공격헬기 짙은 올리브
    gray:S('#7b8189',.6,.3),       // 전투기 회색
    dg:S('#3a3d40',.7,.3),         // 드론 짙은 회색
    blk:S('#1b1c1d',.85,.2),       // 바퀴·고무·포신
    metal:S('#5a5d5c',.5,.6),
    inside:S('#121310',.95,0),     // 열린 문 안쪽 어둠
    glass:S('#22323a',.15,.7,{opacity:.92,transparent:true}),
    nozzle:S('#2c2a28',.6,.6),
    war:S('#5f6247',.75,.2),       // 탄두·폭탄
    blade:new T.MeshStandardMaterial({color:'#1e1f1d',roughness:.7,transparent:true,opacity:.55,depthWrite:false,side:T.DoubleSide}),
    disc:new T.MeshBasicMaterial({map:acDiscTex(),transparent:true,depthWrite:false,side:T.DoubleSide}),
    pdisc:new T.MeshBasicMaterial({color:'#1a1a19',transparent:true,opacity:.32,depthWrite:false,side:T.DoubleSide}),
  });return ACM;}
// 회전면: 안쪽은 거의 투명, 날 끝 쪽으로 갈수록 살짝 어둡고 끝에 가는 고리
function acDiscTex(){return v3Tex(128,128,(g,w,h)=>{const c=w/2;const gr=g.createRadialGradient(c,c,4,c,c,c);
  gr.addColorStop(0,'rgba(20,20,18,0)');gr.addColorStop(.25,'rgba(20,20,18,.05)');gr.addColorStop(.8,'rgba(20,20,18,.13)');gr.addColorStop(.93,'rgba(20,20,18,.22)');gr.addColorStop(.97,'rgba(20,20,18,.08)');gr.addColorStop(1,'rgba(20,20,18,0)');
  g.fillStyle=gr;g.fillRect(0,0,w,h);});}

/* 단면을 이어 붙인 동체. st = [x, 중심높이, 반높이, 반폭, 각진 정도(2=타원, 클수록 상자)] (앞이 +x, 오른쪽이 +z).
   a0~a1: 단면 각도 범위(0=오른쪽, π/2=위). 범위를 좁히고 조금 키우면 유리창·문 같은 덧판이 된다. */
function acStAt(st,x){if(x>=st[0][0])return st[0];for(let i=1;i<st.length;i++)if(x>=st[i][0]){const a=st[i-1],b=st[i],k=(x-b[0])/(a[0]-b[0]||1);return b.map((v,j)=>v+(a[j]-v)*k);}return st[st.length-1];}
function acLoft(st,o){o=o||{};const T=V3.T;const seg=o.seg||14,a0=o.a0??0,a1=o.a1??Math.PI*2,sc=o.sc||1,full=a1-a0>=6.28;
  let S=st;if(o.x0!=null){const xs=new Set([o.x0,o.x1]);for(const s of st)if(s[0]<o.x0&&s[0]>o.x1)xs.add(s[0]);S=[...xs].sort((a,b)=>b-a).map(x=>{const s=acStAt(st,x);return [x,s[1],s[2],s[3],s[4]];});}
  const P=[],I=[];const n=full?seg:seg+1;const pw=(v,p)=>Math.sign(v)*Math.pow(Math.abs(v),2/p);
  for(const [x,y,hh,hw,p] of S)for(let j=0;j<n;j++){const a=a0+(a1-a0)*j/seg;P.push(x,y+hh*sc*pw(Math.sin(a),p),hw*sc*pw(Math.cos(a),p));}
  for(let i=0;i<S.length-1;i++)for(let j=0;j<(full?seg:seg);j++){const j2=full?(j+1)%n:j+1;const a=i*n+j,b=i*n+j2,c=(i+1)*n+j,d=(i+1)*n+j2;I.push(a,c,b,b,c,d);}
  if(full&&!o.open)for(const [i,s] of [[0,S[0]],[S.length-1,S[S.length-1]]]){const ci=P.length/3;P.push(s[0],s[1],0);for(let j=0;j<n;j++)I.push(ci,i*n+j,i*n+(j+1)%n);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setIndex(I);g.computeVertexNormals();return g;}
// 옆모습(x,y) 판을 두께 d로 (꼬리날개 등). plan=true면 위에서 본 (x,z) 판(주날개 등)
function acPlate(pts,d,plan){const T=V3.T;const s=new T.Shape();pts.forEach(([a,b],i)=>i?s.lineTo(a,b):s.moveTo(a,b));s.closePath();
  const g=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:false});if(plan){g.rotateX(Math.PI/2);g.translate(0,d/2,0);}else g.translate(0,0,-d/2);return g;}
// 두 점을 잇는 원기둥(관·포신·지지대)
function acRod(par,mat,a,b,r,seg){const T=V3.T;const va=new T.Vector3(...a),vb=new T.Vector3(...b);const L=va.distanceTo(vb);
  const m=new T.Mesh(new T.CylinderGeometry(r,r,L,seg||6),mat);m.position.copy(va).add(vb).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),vb.clone().sub(va).normalize());m.castShadow=true;par.add(m);return m;}
// 닫힌 판(꼬리날개 등)은 앞면만 그려야 뒷면 그늘이 새까맣게 비치지 않는다
function acFront(mat){if(!mat.userData.front){mat.userData.front=mat.clone();mat.userData.front.side=V3.T.FrontSide;}return mat.userData.front;}
function acMesh(par,geo,mat,x,y,z,shadow){if(geo.type==='ExtrudeGeometry'||geo.type==='CylinderGeometry'||geo.type==='BoxGeometry')mat=acFront(mat);const m=new V3.T.Mesh(geo,mat);m.position.set(x||0,y||0,z||0);if(shadow!==false)m.castShadow=true;par.add(m);return m;}
// 메인 로터: 날(blades)과 흐릿한 회전면. 허브 그룹이 rotor 표시를 달고 돈다
function acRotor(par,x,y,R,nb,chord){const T=V3.T,M=acMats();const hub=new T.Group();hub.position.set(x,y,0);hub.userData.rotor=1;par.add(hub);
  for(let i=0;i<nb;i++){const b=new T.Mesh(new T.BoxGeometry(R,.07,chord),M.blade);b.geometry.translate(R/2,0,0);b.rotation.y=i*Math.PI*2/nb;b.rotation.x=.04;hub.add(b);}
  acMesh(hub,new T.CylinderGeometry(.28,.28,.25,8),M.metal,0,0,0);
  const d=new T.Mesh(new T.CircleGeometry(R,40),M.disc);d.rotation.x=-Math.PI/2;d.position.set(x,y+.02,0);d.renderOrder=3;par.add(d);return hub;}
// 꼬리 로터: 동체 옆에 세워진 회전면. trot 표시 그룹이 z축으로 돈다
function acTail(par,x,y,z,R,nb){const T=V3.T,M=acMats();const g=new T.Group();g.position.set(x,y,z);g.userData.trot=1;par.add(g);
  for(let i=0;i<nb;i++){const b=new T.Mesh(new T.BoxGeometry(.2,R*2,.04),M.blade);b.rotation.z=i*Math.PI/nb+(nb===4&&i%2?.35:0);g.add(b);}
  const d=new T.Mesh(new T.CircleGeometry(R,24),M.disc);d.position.set(x,y,z+(z<0?-.02:.02));par.add(d);return g;}

/* ---------- UH-1 휴이 (수송헬기) ---------- */
const HUEY_ST=[[3.95,1.2,.1,.1,2],[3.65,1.22,.5,.62,2.2],[3.15,1.35,.8,1.0,2.6],[2.4,1.45,.9,1.2,3.4],[1.2,1.48,.93,1.25,4.6],[-1.6,1.5,.93,1.25,5],[-2.5,1.7,.72,1.0,3.5],[-3.3,1.97,.42,.5,2.6],[-6,2.1,.27,.3,2.2],[-8.9,2.2,.15,.16,2]];
function acHueyTpl(){if(ACM.huey)return ACM.huey;const T=V3.T,M=acMats();const g=new T.Group();
  acMesh(g,acLoft(HUEY_ST,{seg:20}),M.od);
  // 앞유리(위·앞), 턱 아래 창, 조종석 문 창
  acMesh(g,acLoft(HUEY_ST,{x0:3.72,x1:2.3,a0:.42,a1:2.72,seg:10,sc:1.025}),M.glass,0,0,0,false);
  for(const [a0,a1] of [[-2.55,-2.0],[-1.14,-.6]])acMesh(g,acLoft(HUEY_ST,{x0:3.6,x1:2.95,a0,a1,seg:3,sc:1.03}),M.glass,0,0,0,false);
  for(const [a0,a1] of [[.18,.95],[2.19,2.96]])acMesh(g,acLoft(HUEY_ST,{x0:2.3,x1:1.25,a0,a1,seg:4,sc:1.02}),M.glass,0,0,0,false);
  // 활짝 연 화물칸 문: 안쪽 어둠, 뒤로 밀린 문짝(작은 창 두 개)
  for(const [a0,a1] of [[-.62,.98],[2.16,3.76]])acMesh(g,acLoft(HUEY_ST,{x0:1.0,x1:-1.25,a0,a1,seg:6,sc:1.015}),M.inside,0,0,0,false);
  for(const s of [-1,1]){acMesh(g,new T.BoxGeometry(1.25,1.45,.06),M.od,-1.75,1.5,s*1.3);acMesh(g,new T.BoxGeometry(.4,.42,.07),M.glass,-1.95,1.85,s*1.3,false);}
  // 엔진·변속기 덮개, 공기 흡입구, 위로 꺾인 배기구
  acMesh(g,acLoft([[1.35,2.42,.05,.45,3],[1.0,2.72,.33,.62,4],[-2.0,2.74,.33,.66,4],[-2.7,2.62,.2,.42,3]],{seg:12}),M.od);
  acMesh(g,new T.BoxGeometry(.12,.3,.9),M.inside,1.06,2.82,0,false);
  acRod(g,M.blk,[-2.6,2.7,0],[-3.25,3.0,0],.27,8);
  // 마스트, 두 날 로터와 안정 막대(벨 바)
  acRod(g,M.metal,[0,3.0,0],[0,3.75,0],.12,8);
  const hub=acRotor(g,0,3.8,7.3,2,.53);const bar=new T.Group();hub.add(bar);acRod(bar,M.metal,[0,.12,-1.1],[0,.12,1.1],.03,4);for(const s of [-1,1])acMesh(bar,new T.BoxGeometry(.35,.08,.12),M.blk,0,.12,s*1.15);
  // 꼬리: 수직핀(뒤로 기운), 꼬리 아래 받침, 수평 승강타, 왼쪽 꼬리 로터
  acMesh(g,acPlate([[-8.2,2.05],[-9.45,3.6],[-10.0,3.6],[-9.4,2.0]],.2),M.od);acRod(g,M.metal,[-8.7,2.05,0],[-9.2,1.45,0],.04,4);
  acMesh(g,new T.BoxGeometry(.6,.07,2.9),M.od,-5.6,2.12,0);acMesh(g,new T.BoxGeometry(.4,.4,.35),M.od,-9.65,3.25,0);
  acTail(g,-9.7,3.25,-.3,1.3,2);
  // 스키드: 두 줄 관, 앞이 들린 끝, 휜 가로 관 두 개
  for(const s of [-1,1]){acRod(g,M.metal,[-2.1,.1,s*1.3],[2.3,.1,s*1.3],.06,6);acRod(g,M.metal,[2.3,.1,s*1.3],[2.75,.42,s*1.3],.06,6);
    for(const x of [1.25,-.95]){acRod(g,M.metal,[x,.1,s*1.3],[x,.45,s*1.22],.06,5);acRod(g,M.metal,[x,.45,s*1.22],[x,.62,s*.8],.06,5);}}
  for(const x of [1.25,-.95])acRod(g,M.metal,[x,.62,-.8],[x,.62,.8],.06,5);
  // 안테나·조종석 위 와이어 커터
  acRod(g,M.blk,[2.6,2.35,0],[2.2,2.75,0],.03,4);acRod(g,M.blk,[3.0,.6,0],[3.25,.3,0],.03,4);
  g.traverse(m=>{if(m.isMesh){m.userData.keepGeo=1;m.userData.keepMat=1;}});return ACM.huey=g;}
// 휴이 한 대: 도어거너 둘(문에 걸린 기관총)과 화물칸의 분대원(pax: 내리면 숨긴다)
function acHuey(n){const T=V3.T,M=acMats();const root=new T.Group();const g=acHueyTpl().clone();g.scale.setScalar(MU);root.add(g);root.userData.body=g;
  const pax=[];const sol=(x,z,ry,sy,isPax)=>{const s=v3Soldier(n,'rifle');s.scale.set(12,12*sy,12);s.position.set(x,.62,z);s.rotation.y=ry;g.add(s);if(isPax)pax.push(s);return s;};
  for(const s of [-1,1]){sol(-1.0,s*.95,-s*Math.PI/2,.78);const gun=new T.Group();gun.position.set(-.75,1.45,s*1.15);g.add(gun);
    acMesh(gun,new T.BoxGeometry(.25,.18,.5),M.blk,0,0,0);acRod(gun,M.blk,[0,.02,0],[0,.02,s*1.15],.04,4);acRod(gun,M.metal,[0,-.1,-s*.1],[0,-.6,-s*.25],.03,4);}
  for(const [x,z] of [[.6,-.55],[.6,.55],[-.2,-.5],[-.2,.5],[.2,0]])sol(x,z,(z<0?1:-1)*Math.PI/2,.72,1);
  root.userData.pax=pax;g.traverse(m=>{if(m.userData.trot)root.userData.trot=m;if(m.userData.rotor)root.userData.hub=m;});return root;}

/* ---------- 공격헬기 (탠덤 조종석) ---------- */
const AH_ST=[[7.35,1.5,.2,.2,2],[6.8,1.55,.5,.42,2.4],[5.6,1.6,.72,.5,3],[3.4,1.72,.85,.56,3.5],[1.0,1.82,.95,.75,4],[-2.4,1.96,.8,.7,4],[-4,2.12,.42,.38,3],[-9.3,2.32,.22,.2,2.5]];
function acApacheTpl(){if(ACM.ah64)return ACM.ah64;const T=V3.T,M=acMats();const g=new T.Group();
  acMesh(g,acLoft(AH_ST,{seg:18}),M.ah);
  // 계단식 조종석 덮개(앞 사수석 낮게, 뒤 조종사석 높게)와 유리
  const CN=[[6.3,2.05,.06,.3,2],[5.7,2.15,.38,.42,2.4],[4.4,2.32,.48,.46,2.6],[3.9,2.34,.5,.46,2.6],[3.6,2.5,.52,.46,2.6],[2.2,2.6,.52,.46,2.6],[1.4,2.4,.25,.4,2]];
  acMesh(g,acLoft(CN,{a0:0,a1:Math.PI,seg:10}),M.glass,0,0,0,false);acMesh(g,new T.BoxGeometry(.1,.5,.9),M.ah,3.75,2.55,0);acMesh(g,new T.BoxGeometry(1.0,.25,.9),M.ah,1.6,2.62,0);
  // 기수 아래 센서 포탑, 기관포
  acMesh(g,new T.CylinderGeometry(.42,.42,.7,10),M.ah,7.15,1.38,0).rotation.x=Math.PI/2;acMesh(g,new T.BoxGeometry(.25,.32,.5),M.glass,7.5,1.4,0,false);
  acMesh(g,new T.SphereGeometry(.32,8,6),M.blk,4.4,.95,0);acRod(g,M.blk,[4.4,.9,0],[6.3,.8,0],.06,6);
  // 양옆 엔진 나셀(뒤쪽 배기는 옆으로 꺾임)
  for(const s of [-1,1]){acMesh(g,acLoft([[1.2,2.35,.05,.05,2],[.9,2.38,.42,.42,2.6],[-2.6,2.38,.45,.45,2.6],[-3.4,2.38,.32,.32,2]],{seg:10}),M.ah,0,0,s*1.05);
    acMesh(g,new T.BoxGeometry(.7,.4,.15),M.nozzle,-3.0,2.38,s*1.5);acMesh(g,new T.CircleGeometry(.36,10),M.inside,.9,2.38,s*1.05).rotation.y=Math.PI/2;}
  // 짧은 날개와 무장: 안쪽 로켓 포드, 바깥쪽 대전차 미사일 네 발
  for(const s of [-1,1]){acMesh(g,new T.BoxGeometry(1.6,.14,2.1),M.ah,.35,1.75,s*1.65);
    for(const z of [1.4,2.3]){acRod(g,M.ah,[.4,1.7,s*z],[.4,1.35,s*z],.07,4);}
    acMesh(g,new T.CylinderGeometry(.28,.28,1.6,10),M.war,.4,1.05,s*1.4).rotation.z=Math.PI/2;acMesh(g,new T.CircleGeometry(.26,10),M.inside,1.21,1.05,s*1.4).rotation.y=Math.PI/2;
    for(const [dy,dz] of [[-.12,-.14],[-.12,.14],[-.42,-.14],[-.42,.14]]){acMesh(g,new T.CylinderGeometry(.09,.09,1.6,6),M.war,.45,1.3+dy,s*2.3+dz).rotation.z=Math.PI/2;}}
  // 주 바퀴·꼬리 바퀴
  for(const s of [-1,1]){acRod(g,M.metal,[2.8,1.1,s*.5],[2.8,.38,s*1.05],.07,5);acMesh(g,new T.CylinderGeometry(.36,.36,.24,10),M.blk,2.8,.36,s*1.15).rotation.x=Math.PI/2;}
  acRod(g,M.metal,[-8.6,2.2,0],[-8.8,.3,0],.06,5);acMesh(g,new T.CylinderGeometry(.2,.2,.12,8),M.blk,-8.8,.22,0).rotation.x=Math.PI/2;
  // 마스트, 네 날 로터, 마스트 위 레이더 돔
  acRod(g,M.metal,[0,2.75,0],[0,3.75,0],.14,8);acRotor(g,0,3.8,7.3,4,.53);acMesh(g,new T.SphereGeometry(.45,10,6),M.ah,0,4.25,0).scale.y=.6;
  // 꼬리: 수직핀, 아래쪽 수평 안정판, 왼쪽 X자 꼬리 로터
  acMesh(g,acPlate([[-8.5,2.2],[-9.6,4.3],[-10.25,4.3],[-9.7,2.15]],.22),M.ah);acMesh(g,new T.BoxGeometry(.75,.08,3.4),M.ah,-9.6,2.4,0);
  acTail(g,-9.95,3.85,-.32,1.4,4);
  g.traverse(m=>{if(m.isMesh){m.userData.keepGeo=1;m.userData.keepMat=1;}});return ACM.ah64=g;}

/* ---------- 전투기 (단발 다목적기) ---------- */
const JET_ST=[[7.7,0,.04,.04,2],[6.6,0,.32,.32,2],[5.0,.05,.48,.45,2.2],[3.0,0,.55,.6,2.6],[0,-.05,.55,.7,3],[-3.5,-.05,.55,.65,3],[-6.0,0,.48,.5,2.4],[-7.3,0,.42,.42,2]];
function acJetTpl(){if(ACM.jet)return ACM.jet;const T=V3.T,M=acMats();const g=new T.Group();
  acMesh(g,acLoft(JET_ST,{seg:16}),M.gray);
  acMesh(g,new T.SphereGeometry(1,12,8),M.glass,4.3,.45,0,false).scale.set(1.7,.5,.42);
  // 동체 아래 공기 흡입구
  acMesh(g,acLoft([[3.4,-.6,.28,.45,4],[0,-.55,.3,.48,4],[-2,-.4,.2,.4,3]],{seg:10}),M.gray);acMesh(g,new T.BoxGeometry(.06,.45,.8),M.inside,3.42,-.6,0,false);
  // 주날개(앞전 연장부 포함), 수평 꼬리날개 — 양쪽 대칭
  for(const s of [-1,1]){const w=acPlate([[5.0,.5],[1.2,1.3],[-2.3,4.7],[-3.3,4.7],[-3.6,.5]],.12,true);if(s<0)w.scale(1,1,-1);acMesh(g,w,M.gray,0,-.1,0);
    const h=acPlate([[-5.2,.5],[-7.0,2.9],[-7.9,2.9],[-7.9,.5]],.08,true);if(s<0)h.scale(1,1,-1);acMesh(g,h,M.gray,0,-.05,0);
    acMesh(g,new T.CylinderGeometry(.07,.07,3.0,6),M.war,-1.6,-.05,s*4.8).rotation.z=Math.PI/2;
    for(const z of [2.0,3.1]){acRod(g,M.gray,[-1.2,-.15,s*z],[-1.2,-.4,s*z],.05,4);const b=acMesh(g,new T.CylinderGeometry(.18,.18,2.2,8),M.war,-1.2,-.55,s*z);b.rotation.z=Math.PI/2;acMesh(g,new T.ConeGeometry(.18,.5,8),M.war,-.1+.25,-.55,s*z).rotation.z=-Math.PI/2;}}
  acMesh(g,new T.CylinderGeometry(.3,.3,3.5,10),M.gray,-.5,-.85,0).rotation.z=Math.PI/2;
  // 수직 꼬리날개, 배기구
  acMesh(g,acPlate([[-3.6,.4],[-6.4,3.3],[-7.5,3.3],[-7.4,.4]],.12),M.gray);
  acMesh(g,new T.CylinderGeometry(.42,.36,.8,12),M.nozzle,-7.65,0,0).rotation.z=Math.PI/2;
  g.traverse(m=>{if(m.isMesh){m.userData.keepGeo=1;m.userData.keepMat=1;}});return ACM.jet=g;}

/* ---------- 정찰드론 (사각 쿼드콥터, 짐벌 카메라) — 잘 보이게 실제보다 크게 ---------- */
function acQuadTpl(){if(ACM.quad)return ACM.quad;const T=V3.T,M=acMats();const g=new T.Group();
  acMesh(g,acLoft([[.55,.05,.06,.2,2],[.35,.06,.13,.32,3],[-.4,.06,.13,.32,3],[-.55,.05,.08,.22,2]],{seg:10}),M.dg);
  for(const [a,b] of [[1,1],[1,-1],[-1,1],[-1,-1]]){acRod(g,M.dg,[a*.2,.08,b*.2],[a*.82,.12,b*.82],.045,5);acMesh(g,new T.CylinderGeometry(.08,.08,.12,8),M.blk,a*.82,.16,b*.82);
    const p=new T.Mesh(new T.CircleGeometry(.48,20),M.pdisc);p.rotation.x=-Math.PI/2;p.position.set(a*.82,.23,b*.82);p.userData.rotor=1;g.add(p);
    const bl=new T.Mesh(new T.BoxGeometry(.9,.015,.06),M.blk);bl.position.set(a*.82,.23,b*.82);bl.userData.rotor=1;g.add(bl);}
  acMesh(g,new T.SphereGeometry(.12,8,6),M.blk,.42,-.12,0);acMesh(g,new T.CircleGeometry(.05,8),M.glass,.535,-.13,0,false).rotation.y=Math.PI/2;
  for(const s of [-1,1]){acRod(g,M.blk,[.1,0,s*.18],[.15,-.3,s*.32],.02,4);acRod(g,M.blk,[-.1,0,s*.18],[-.15,-.3,s*.32],.02,4);acRod(g,M.blk,[.25,-.3,s*.32],[-.25,-.3,s*.32],.02,4);}
  acRod(g,M.blk,[-.3,.18,0],[-.32,.45,0],.012,3);
  g.traverse(m=>{if(m.isMesh){m.userData.keepGeo=1;m.userData.keepMat=1;}});return ACM.quad=g;}

/* ---------- FPV 자폭드론: 탄소 프레임, 배터리, 앞으로 기운 카메라, 배에 묶은 대전차 탄두 ---------- */
function acFpvTpl(){if(ACM.fpv)return ACM.fpv;const T=V3.T,M=acMats();const g=new T.Group();
  for(const [a,b] of [[1,1],[1,-1],[-1,1],[-1,-1]]){acRod(g,M.blk,[0,0,0],[a*.55,0,b*.55],.035,4);acMesh(g,new T.CylinderGeometry(.07,.07,.09,8),M.metal,a*.55,.05,b*.55);
    const p=new T.Mesh(new T.CircleGeometry(.36,16),M.pdisc);p.rotation.x=-Math.PI/2;p.position.set(a*.55,.11,b*.55);p.userData.rotor=1;g.add(p);}
  acMesh(g,new T.BoxGeometry(.5,.05,.24),M.blk,0,.02,0);acMesh(g,new T.BoxGeometry(.38,.14,.2),new T.MeshStandardMaterial({color:'#2f3a4a',roughness:.6}),-.03,.12,0);
  acMesh(g,new T.BoxGeometry(.06,.035,.22),M.war,-.03,.12,0);
  acMesh(g,new T.BoxGeometry(.1,.1,.1),M.blk,.25,.08,0).rotation.z=-.4;acRod(g,M.metal,[-.22,.05,.06],[-.38,.28,.12],.01,3);
  // 탄두: 앞을 보고 배에 묶임(원뿔 머리, 몸통, 꼬리 날개)
  acMesh(g,new T.CylinderGeometry(.11,.11,.5,8),M.war,.05,-.13,0).rotation.z=Math.PI/2;acMesh(g,new T.ConeGeometry(.11,.32,8),M.war,.46,-.13,0).rotation.z=-Math.PI/2;
  acMesh(g,new T.CylinderGeometry(.05,.05,.3,6),M.blk,-.33,-.13,0).rotation.z=Math.PI/2;for(const r of [0,Math.PI/2])acMesh(g,new T.BoxGeometry(.12,.22,.01),M.blk,-.45,-.13,0).rotation.x=r;
  for(const x of [-.1,.15])acMesh(g,new T.BoxGeometry(.03,.2,.27),M.blk,x,-.07,0);
  g.traverse(m=>{if(m.isMesh){m.userData.keepGeo=1;m.userData.keepMat=1;}});return ACM.fpv=g;}

/* ---------- 부대 모형에 끼우기 ---------- */
{const _m=v3AirModel;v3AirModel=function(u,g){const tp=u.type==='gunship'?acApacheTpl:u.type==='fpv'?acFpvTpl:u.type==='drone'?acQuadTpl:null;if(!tp)return _m(u,g);
  const c=tp().clone();c.scale.setScalar(MU);g.add(c);g.userData.trots=[];c.traverse(m=>{if(m.userData.trot)g.userData.trots.push(m);});return true;};}
v3JetModel=function(){const T=V3.T;const g=new T.Group();const c=acJetTpl().clone();c.scale.setScalar(MU);g.add(c);return g;};

/* ---------- 매 프레임: 꼬리 로터 돌리기, 정찰드론은 가는 쪽으로 살짝 숙인다 ---------- */
{const _f=v3AirFrame;v3AirFrame=function(now,dt){_f(now,dt);if(!G||!V3.uo||!(dt>0))return;
  for(const o of V3.uo.values()){const b=o.userData.body,u=o.userData.u;if(!b||!u)continue;
    if(b.userData.trots)for(const t of b.userData.trots)t.rotation.z+=dt*42;
    if(u.type==='drone'){const ud=o.userData,px=ud.dpx??o.position.x,pz=ud.dpz??o.position.z;const vx=(o.position.x-px)/dt,vz=(o.position.z-pz)/dt;ud.dpx=o.position.x;ud.dpz=o.position.z;
      const f=-(b.rotation.y||0);const fw=vx*Math.cos(f)+vz*Math.sin(f),lt=-vx*Math.sin(f)+vz*Math.cos(f);const k=Math.min(1,dt*4);
      b.rotation.order='YZX';b.rotation.z+=(Math.max(-.3,Math.min(.3,-fw*.12))-b.rotation.z)*k;b.rotation.x+=(Math.max(-.3,Math.min(.3,lt*.12))-b.rotation.x)*k;}}};}

/* ---------- 수송헬기 투입 비행 ---------- */
const HUEY_FLY={v0:5,t1:1.0,Ta:3.6,Td:5.0,hov:.9,clr:.9,lift:1.2};
// 주변(반경 2칸)에서 가장 높은 것: 지붕, 또는 숲 칸의 나무 꼭대기(약 12m)
function acClear(x,z){let h=0;const r0=Math.floor(z),c0=Math.floor(x);for(let r=r0-2;r<=r0+2;r++)for(let c=c0-2;c<=c0+2;c++)if(inb(r,c)){const m=G.map[r][c];h=Math.max(h,v3Top(r,c)+(m.t==='park'&&(m.wild||m.orch)?(m.orch?.6:1.0):0));}return h;}
const acSm=k=>{k=Math.max(0,Math.min(1,k));return k*k*(3-2*k);};
function acDustCol(){return typeof bmClime==='function'&&bmClime()==='winter'?'#dfe3e6':typeof bmClime==='function'&&bmClime()==='desert'?'#b49c74':'#9c9283';}
v3Heli=function(r,c,n){if(!V3.on)return;const T=V3.T;const [x,z]=v3x(r,c);const y0=v3Top(r,c);const H=acHuey(n);const h=H.userData.body;V3.G.fx.add(H);h.rotation.order='YZX';
  const dir=[[-1,0],[1,0],[0,-1],[0,1]][n??0]||[-1,0];const F=HUEY_FLY;const Dd=F.v0*(F.Ta-F.t1)/2,D=F.v0*F.t1+Dd;
  const sx=x+dir[0]*D,sz=z+dir[1]*D;const ang=Math.atan2(dir[1],-dir[0]);// 기수 = 착륙지 쪽
  const t0=G.time;const LAND=HELI_T+1.6;const turn=Math.random()<.5?1:-1;let dustT=0,lastT=t0,pitch=-.1,roll=0,cruise=acClear(sx,sz)+F.clr;
  const dep={x,z,y:y0,psi:ang,v:0};
  if(typeof sndTrack==='function')sndTrack(H,'rotor');
  V3.fx.push({o:H,t0:performance.now(),dur:1e9,upd:(o)=>{const t=G.time-t0;const now=performance.now();const dt=Math.max(0,Math.min(.1,G.time-lastT));lastT=G.time;
    if(H.userData.hub)H.userData.hub.rotation.y-=Math.max(.35,dt*34);if(H.userData.trot)H.userData.trot.rotation.z+=Math.max(.5,dt*48);
    let px=x,pz=z,py=y0,psi=ang,wp=0,wr=0;
    if(t<F.Ta){// 접근: 순항 후 감속. 감속하는 동안 기수를 들어 속도를 죽인다
      let d,v;if(t<F.t1){d=D-F.v0*t;v=F.v0;wp=-.12;}else{const q=(t-F.t1)/(F.Ta-F.t1);d=Dd*(1-q)*(1-q);v=F.v0*(1-q);wp=.2*Math.min(1,(1-q)/.3);}
      px=x+dir[0]*d;pz=z+dir[1]*d;cruise=Math.max(cruise-dt*.3,acClear(px,pz)+F.clr);const hk=acSm((t-F.t1)/(F.Ta-F.t1));py=cruise+(y0+F.hov-cruise)*hk;
      py=Math.max(py,acClear(px,pz)*(1-hk)+.4);}
    else if(t<F.Td){const k=(t-F.Ta)/(F.Td-F.Ta);py=y0+F.hov*(1-acSm(k));wp=.03;wr=Math.sin(t*2.3)*.025;px+=Math.sin(t*1.7)*.03*(1-k);pz+=Math.cos(t*1.3)*.03*(1-k);}
    else if(t<LAND){py=y0;wp=0;if(t>=HELI_T)for(const p of H.userData.pax)p.visible=false;}
    else{for(const p of H.userData.pax)p.visible=false;const q=t-LAND;
      if(q<F.lift){py=y0+F.hov*acSm(q/F.lift);wp=-.06*q/F.lift;dep.y=py;}
      else{// 이륙: 기수를 숙여 앞으로 가속하며 몸을 기울여 돌아 나간다
        const w=q-F.lift;const om=w<3.2?turn*.95:0;dep.v=Math.min(F.v0,dep.v+dt*2.2);dep.psi+=om*dt;
        dep.x+=Math.cos(dep.psi)*dep.v*dt;dep.z+=-Math.sin(dep.psi)*dep.v*dt;dep.y=Math.max(dep.y+dt*.5,acClear(dep.x,dep.z)+F.clr*Math.min(1,w/2));
        px=dep.x;pz=dep.z;py=dep.y;psi=dep.psi;wp=-.08-.1*Math.min(1,dep.v/F.v0)*(dep.v<F.v0?1:.4);wr=-om*dep.v*.08;
        if(w>9||Math.hypot(px-x,pz-z)>N*.75+8){o.visible=false;return false;}}
      if(q<F.lift){px=x;pz=z;dep.x=x;dep.z=z;}}
    const k=Math.min(1,dt*3.5);pitch+=(wp-pitch)*k;roll+=(Math.max(-.45,Math.min(.45,wr))-roll)*k;
    H.position.set(px,py,pz);h.rotation.set(roll,psi,pitch);
    // 로터 바람: 낮을수록 넓고 진하게 먼지가 둥글게 밀려난다
    const ag=py-v3TopAt(px,pz);if(ag<1.4&&now-dustT>150-ag*60){dustT=now;const I=1-ag/1.4;const gy=v3TopAt(px,pz)+.03;
      for(let i=0;i<1+Math.round(I*2);i++){const a=Math.random()*6.283;const d=.35+Math.random()*.45;dsDust(px+Math.cos(a)*d,pz+Math.sin(a)*d,.35+I*.45,1400+I*800,1,acDustCol(),gy);}}}});};
