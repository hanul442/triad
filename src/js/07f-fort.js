/* ===================== 3D: 설치형 방어물 =====================
   G.forts(04d-fort.js)를 그린다. 짓는 중에는 낮게 솟아오르고, 부서지면 먼지와 파편이 튄다.
   - 모래주머니: 엇갈려 쌓은 자루 3단
   - 철조망: 말뚝 + 코일 세 줄(아래 둘, 위 하나)
   - 콘크리트 방벽: 저지 블록(소품 방벽과 같은 단면)
   - 대전차 장애물: 철골 세 개를 엇갈려 붙인 고슴도치
   로컬 x축 = 방어물 길이 방향 (04d inBox와 같은 회전 규칙) */
function v3FortMats(){if(V3.fm)return V3.fm;const T=V3.T;
  return V3.fm={
    bag:new T.MeshStandardMaterial({color:'#a08f6c',roughness:1,flatShading:true}),
    wire:new T.MeshStandardMaterial({color:'#4a4943',roughness:.6,metalness:.5}),
    post:new T.MeshStandardMaterial({color:'#4b3d2c',roughness:1}),
    conc:new T.MeshStandardMaterial({color:'#8f8a80',roughness:1,flatShading:true}),
    steel:new T.MeshStandardMaterial({color:'#5b4334',roughness:.8,metalness:.35,flatShading:true}),
    ghost:new T.MeshBasicMaterial({color:'#e8e2d0',transparent:true,opacity:.35,depthWrite:false})};}
function v3FortGeos(){if(V3.fg)return V3.fg;const T=V3.T,m=MU;
  const tor=new T.TorusGeometry(.42*m,.045*m,3,9).rotateY(Math.PI/2);
  const beam=new T.BoxGeometry(2.1*m,.16*m,.16*m);
  return V3.fg={bag:new T.BoxGeometry(.62*m,.24*m,.4*m),tor,post:new T.CylinderGeometry(.05*m,.06*m,1.3*m,4),beam,
    jersey:v3Prism([[-.3*m,0],[.3*m,0],[.1*m,.35*m],[.08*m,.8*m],[-.08*m,.8*m],[-.1*m,.35*m]],FORT.jersey.len).rotateY(Math.PI/2)};}
function v3FortMesh(f){const T=V3.T,m=MU,M=v3FortMats(),Gx=v3FortGeos(),d=FORT[f.k];const g=new T.Group();const R=mulberry(f.id*977+3);
  const add=(geo,mat,x,y,z,rx,ry,rz)=>{const o=new T.Mesh(geo,mat);o.position.set(x,y,z);o.rotation.set(rx||0,ry||0,rz||0);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;};
  if(f.k==='sandbag'){const L=d.len,n=Math.max(3,Math.round(L/(.6*m)));
    for(let row=0;row<3;row++){const cnt=row===2?n-1:n,sh=(row===1?.25:row===2?.5:0)*L/n;
      for(let i=0;i<cnt;i++){const x=-L/2+(i+.5)*L/n+sh;
        for(const zz of row<2?[-.2*m,.2*m]:[0])add(Gx.bag,M.bag,x+(R()-.5)*.08*m,(.12+row*.22)*m,zz+(R()-.5)*.06*m,0,(R()-.5)*.25,(R()-.5)*.08);}}}
  else if(f.k==='wire'){const L=d.len,n=Math.round(L/(.22*m));
    for(const [zz,yy] of [[-.38*m,.42*m],[.38*m,.42*m],[0,1.05*m]])for(let i=0;i<n;i++)add(Gx.tor,M.wire,-L/2+(i+.5)*L/n,yy,zz,(R()-.5)*.5,(R()-.5)*.3,0);
    for(const s of [-.5,0,.5])add(Gx.post,M.post,s*L*.9,.65*m,0,(R()-.5)*.15,0,(R()-.5)*.15);}
  else if(f.k==='jersey')add(Gx.jersey,M.conc,0,0,0);
  else if(f.k==='hedgehog'){const h=new T.Group();for(const [rx,ry,rz] of [[0,0,0],[0,Math.PI/2,0],[0,0,Math.PI/2]]){const o=new T.Mesh(Gx.beam,M.steel);o.rotation.set(rx,ry,rz);o.castShadow=true;h.add(o);}
    h.rotation.set(.615,R()*Math.PI,.785);h.position.y=.78*m;g.add(h);}
  g.position.set(f.x,0,f.z);g.rotation.y=f.ry;return g;}
/* 매 프레임: 새로 생긴 방어물을 만들고, 짓는 정도를 높이로 보여 주고, 사라진 것은 지운다 */
function v3FortFrame(){if(!G||!V3.T)return;const T=V3.T;
  if(!V3.fortGrp){V3.fortGrp=new T.Group();V3.scene.add(V3.fortGrp);V3.fortObj=new Map();}
  if(V3.fortOf!==G){for(const o of V3.fortObj.values())V3.fortGrp.remove(o);V3.fortObj.clear();V3.fortOf=G;}
  const live=new Set();
  for(const f of G.forts||[]){live.add(f.id);let o=V3.fortObj.get(f.id);if(!o){o=v3FortMesh(f);V3.fortObj.set(f.id,o);V3.fortGrp.add(o);}
    const k=f.prog>=1?1:.12+.88*f.prog;if(Math.abs(o.scale.y-k)>.002){o.scale.y=k;}
    // 안개 속 적 방어물은 짓는 중일 때 보이지 않는다(다 지으면 지형처럼 보인다)
    o.visible=!(G.fog&&f.nat!==G.viewer&&f.prog<1);}
  for(const [id,o] of V3.fortObj)if(!live.has(id)){V3.fortGrp.remove(o);V3.fortObj.delete(id);}}
FXH.fortGone=function(f,why){if(typeof V3==='undefined'||!V3.on)return;try{
  if(typeof dsDust==='function')dsDust(f.x,f.z,why==='blast'?.7:.4,1600,why==='blast'?8:4,f.k==='sandbag'?'#a39370':'#8a847a');
  if(typeof v3Debris==='function')v3Debris(f.x,.05,f.z,why==='blast'?10:5,.6);}catch(e){}};

/* ---------- 조작 UI ---------- */
// 선택한 부대의 동작 막대에 붙는 축성 버튼들
function fortBar(s){const ks=fortKinds(s.type);if(!ks.length)return '';const open=UI.phase==='fortmenu'||UI.phase==='fort';const cp=G.nats[G.viewer].cp;
  let h=`<button class="btn sm${open?' primary':''}" data-act="fort" id="ab-fort" title="모래주머니·철조망 같은 방어물을 쌓습니다">축성</button>`;
  if(open)h+=ks.map(k=>`<button class="btn sm${UI.phase==='fort'&&UI.fortK===k?' primary':''}" data-act="fort:${k}" id="ab-fort-${k}" ${cp>=FORT[k].cost?'':'disabled'} title="${FORT[k].desc}">${FORT[k].n} ${FORT[k].cost}</button>`).join('');
  return h;}
function fortTip(){if(UI.phase==='fortmenu')return '지을 방어물을 고르세요';if(UI.phase==='fort')return `${FORT[UI.fortK].n}을(를) 놓을 곳을 탭하세요 · 도로 위면 길을 가로질러 놓입니다`;return null;}
/* 축성 단계에서 땅을 탭했을 때. 여러 부대를 골랐으면 쉬고 있는 부대부터 하나씩 맡긴다 */
function fortTap(grp,x,z){const k=UI.fortK;const can=grp.filter(g=>fortKinds(g.type).includes(k));if(!can.length){toast('고른 부대 중 이 방어물을 지을 수 있는 부대가 없습니다');return;}
  const u=can.find(g=>!g.job)||can[0];const r=orderFort(u,k,x,z);if(typeof r==='string'){toast(r);return;}
  sfx('click',.6);if(!can.some(g=>!g.job))UI.phase='select';}
