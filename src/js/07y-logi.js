/* ===================== 화면: 보급 트럭·구난차·보급소·탄약 표시 =====================
   05j-supply의 규칙을 보여 준다. 기존 화면 함수(v3VehBuild, fortBar, uHealth, v3MorTag, v3FortFrame)는 감싸서 덧붙이기만 한다. */
/* ---------- 차량 모델 ---------- */
function v3LogiBuild(ty){const T=V3.T,mm=v3ModMats(),M=V3.M,m=MU;const g=new T.Group();
  const BODY=V3.vehBodyStub||(V3.vehBodyStub=new T.MeshStandardMaterial({color:'#6b6a55',flatShading:true}));
  const CAN=V3.canvasM||(V3.canvasM=new T.MeshStandardMaterial({color:'#6a6550',roughness:1,flatShading:true}));   // 짐칸 덮개 천
  const add=(geo,mat,x,y,z,par)=>{const o=new T.Mesh(geo,mat===0?BODY:mat);if(mat===0)o.userData.body=1;o.position.set(x,y,z);(par||g).add(o);return o;};
  const B=(w,h,d,x,y,z,mat=0,par)=>add(new T.BoxGeometry(w,h,d),mat,x,y,z,par);
  const wheel=(r,w,x,y,z)=>{const o=add(new T.CylinderGeometry(r,r,w,12),mm.tire,x,y,z);o.rotation.x=Math.PI/2;return o;};
  if(ty==='sup'){// 6륜 군용 화물트럭: 앞 운전석, 뒤 천막 짐칸(탄약 상자)
    B(7.2*m,.35*m,2.3*m,0,.95*m,0,M.dark);                                                  // 차대
    B(1.9*m,1.5*m,2.4*m,2.55*m,1.85*m,0);                                                   // 운전석
    B(.06*m,.6*m,2.0*m,3.5*m,2.2*m,0,mm.glass).rotation.z=-.15;                            // 앞유리
    B(1.0*m,.7*m,2.3*m,3.75*m,1.35*m,0);                                                    // 엔진 덮개
    B(4.4*m,.25*m,2.5*m,-1.15*m,1.25*m,0);                                                  // 짐칸 바닥
    for(const s of [-1,1])B(4.4*m,.6*m,.06*m,-1.15*m,1.65*m,s*1.22*m);                     // 짐칸 옆판
    const cv=add(new T.CylinderGeometry(1.25*m,1.25*m,4.3*m,10,1,false,0,Math.PI),CAN,-1.15*m,1.95*m,0);cv.rotation.z=Math.PI/2;cv.rotation.y=Math.PI/2;cv.scale.set(1,1,.75);   // 둥근 천막
    for(const [x,z] of [[2.6,1],[2.6,-1],[-.6,1],[-.6,-1],[-2.0,1],[-2.0,-1]])wheel(.55*m,.4*m,x*m,.55*m,z*1.05*m);
    B(.5*m,.35*m,.6*m,-3.2*m,1.55*m,.6*m,mm.plate);B(.5*m,.35*m,.6*m,-3.2*m,1.55*m,-.1*m,mm.plate);}   // 뒤에 내린 상자
  else{// 구난차: 8륜 대형 트럭, 뒤에 기중기 붐과 견인봉, 앞 윈치
    B(8.4*m,.4*m,2.5*m,0,1.0*m,0,M.dark);
    B(2.1*m,1.6*m,2.6*m,2.9*m,1.95*m,0);B(.06*m,.6*m,2.2*m,3.95*m,2.35*m,0,mm.glass).rotation.z=-.15;
    B(1.0*m,.8*m,2.5*m,4.0*m,1.45*m,0);
    B(4.6*m,.9*m,2.5*m,-.9*m,1.6*m,0);                                                      // 장비 상자
    for(const [x,z] of [[3.1,1],[3.1,-1],[1.8,1],[1.8,-1],[-1.6,1],[-1.6,-1],[-2.9,1],[-2.9,-1]])wheel(.6*m,.45*m,x*m,.6*m,z*1.08*m);
    const crane=new T.Group();crane.position.set(-1.6*m,2.1*m,0);g.add(crane);crane.userData.turret=1;   // 기중기는 포탑처럼 돈다
    add(new T.CylinderGeometry(.55*m,.65*m,.45*m,10),0,0,.2*m,0,crane);
    const boom=B(5.0*m,.45*m,.45*m,-2.0*m,.95*m,0,M.steel,crane);boom.rotation.z=-.32;     // 뒤로 뻗은 붐
    B(.08*m,1.2*m,.08*m,-4.3*m,1.2*m,0,M.dark,crane);                                       // 늘어진 줄
    B(1.2*m,.25*m,.3*m,-4.6*m,.85*m,0,M.steel);                                             // 견인봉
    for(const s of [-1,1])B(.5*m,.9*m,.3*m,-3.9*m,.5*m,s*1.05*m,M.steel);}                  // 지지 다리(스페이드)
  return g;}
{const _vb=v3VehBuild;v3VehBuild=function(ty){return ty==='sup'||ty==='rec'?v3LogiBuild(ty):_vb(ty);};}

/* ---------- 보급소·견인줄·보급선 ---------- */
function v3DepotMesh(n){const T=V3.T,m=MU;const g=new T.Group();const R=mulberry(n*131+7);
  const crate=V3.crateM||(V3.crateM=new T.MeshStandardMaterial({color:'#59583c',roughness:.95,flatShading:true}));
  const drum=V3.drumM||(V3.drumM=new T.MeshStandardMaterial({color:'#3c4636',roughness:.7,metalness:.3}));
  const net=V3.netM||(V3.netM=new T.MeshStandardMaterial({color:'#4c4f37',roughness:1,transparent:true,opacity:.86,side:T.DoubleSide,depthWrite:false}));
  const put=(geo,mat,x,y,z,ry)=>{const o=new T.Mesh(geo,mat);o.position.set(x,y,z);o.rotation.y=ry||0;o.castShadow=true;o.receiveShadow=true;g.add(o);return o;};
  for(let i=0;i<9;i++){const row=i%3,col=Math.floor(i/3),st=i>=6?1:0;put(new T.BoxGeometry(1.2*m,.6*m,.8*m),crate,(-1.6+col*1.3)*m,(.3+st*.6)*m,(row*.9-1.4)*m,(R()-.5)*.15);}
  for(let i=0;i<6;i++)put(new T.CylinderGeometry(.3*m,.3*m,.9*m,10),drum,(1.8+(i%3)*.65)*m,.45*m,(1.0+Math.floor(i/3)*.65)*m);
  const pl=put(new T.PlaneGeometry(7*m,5.5*m,6,5),net,0,2.2*m,0);pl.rotation.x=-Math.PI/2;pl.castShadow=true;
  const p=pl.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,(R()-.5)*.35*m-(Math.abs(p.getX(i))>3*m||Math.abs(p.getY(i))>2.4*m?.6*m:0));p.needsUpdate=true;pl.geometry.computeVertexNormals();
  for(const [x,z] of [[-3,-2.4],[3,-2.4],[-3,2.4],[3,2.4]])put(new T.CylinderGeometry(.05*m,.05*m,2.2*m,5),V3.M.dark,x*m,1.1*m,z*m);
  return g;}
function v3LogiFrame(){if(!G||!V3.T)return;const T=V3.T;
  if(!V3.lgGrp){V3.lgGrp=new T.Group();V3.scene.add(V3.lgGrp);V3.lgDep=new Map();
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(new Float32Array(96*6),3));
    V3.lgTow=new T.LineSegments(geo,new T.LineBasicMaterial({color:'#1d1c1a'}));V3.lgTow.frustumCulled=false;V3.lgGrp.add(V3.lgTow);
    const g2=new T.BufferGeometry();g2.setAttribute('position',new T.BufferAttribute(new Float32Array(96*6),3));
    V3.lgSup=new T.LineSegments(g2,new T.LineBasicMaterial({color:'#e8d48a',transparent:true,opacity:.55,depthTest:false}));V3.lgSup.frustumCulled=false;V3.lgSup.renderOrder=5;V3.lgGrp.add(V3.lgSup);}
  if(V3.lgOf!==G){for(const o of V3.lgDep.values())V3.lgGrp.remove(o);V3.lgDep.clear();V3.lgOf=G;}
  for(const n of G.order){if(!G.nats[n].alive&&!V3.lgDep.has(n))continue;const d=depotOf(n);let o=V3.lgDep.get(n);
    if(!o){o=v3DepotMesh(n);o.position.set(d.x,v3Top(Math.floor(d.z),Math.floor(d.x))+.003,d.z);o.rotation.y=n%2?Math.PI/2:0;V3.lgDep.set(n,o);V3.lgGrp.add(o);}
    o.visible=!G.fog||n===G.viewer||visSet(G.viewer).has(key(Math.floor(d.z),Math.floor(d.x)));}
  const pos=id=>{const o=V3.uo.get(id);return o&&o.visible!==false?o.position:null;};
  const fill=(line,pairs,dy)=>{const a=line.geometry.attributes.position;let k=0;for(const [p,q] of pairs){if(k>=95)break;a.setXYZ(k*2,p.x,p.y+dy,p.z);a.setXYZ(k*2+1,q.x,q.y+dy,q.z);k++;}
    a.needsUpdate=true;line.geometry.setDrawRange(0,k*2);line.visible=k>0;};
  const tow=[],sup=[];
  for(const u of G.units){if(u.type==='rec'&&u.tow!=null){const p=pos(u.id),q=pos(u.tow);if(p&&q)tow.push([p,q]);}
    if(u.type==='sup'&&u._srv&&u.nat===G.viewer){const p=pos(u.id);if(p)for(const id of u._srv){const q=pos(id);if(q)sup.push([p,q]);}}
    if(u.type==='rec'&&u._fixing!=null&&u.nat===G.viewer){const p=pos(u.id),q=pos(u._fixing);if(p&&q)sup.push([p,q]);}}
  fill(V3.lgTow,tow,.07);fill(V3.lgSup,sup,.12);}
if(typeof v3FortFrame==='function'){const _ff=v3FortFrame;v3FortFrame=function(){_ff();try{v3LogiFrame();}catch(e){}};}

/* ---------- 글자 표시 ---------- */
function amTag(u){const M=amMax(u);if(!M)return '';const f=amOf(u)/M;
  if(f<1/M)return '<em class="br" title="탄약 없음: 쏘지 못함">탄 없음</em>';if(f<AM_LOW)return '<em class="sh" title="탄약 부족: 아껴 쏘느라 느림">탄 부족</em>';return '';}
if(typeof v3MorTag==='function'){const _mt=v3MorTag;v3MorTag=function(u){let h=_mt(u);if(G&&u.nat===G.viewer){h+=amTag(u);
    if(u.type==='sup')h+=`<em style="background:#55613f" title="트럭 적재량">적재 ${Math.round(u.cargo??CARGO)}%</em>`;if(u.type==='rec'&&u.tow!=null)h+='<em style="background:#55613f" title="견인 중">견인</em>';
    if(u.towBy!=null)h+='<em title="구난차가 끌고 가는 중">견인됨</em>';}return h;};}
{const _uh=uHealth;uHealth=function(u){let h=_uh(u);const M=amMax(u);
   if(M){const a=Math.floor(amOf(u));h+=` · 탄약 ${a}/${M}${a<1?' (없음)':a/M<AM_LOW?' (부족)':''}`;}
   if(u.type==='sup')h+=` · 적재 ${Math.round(u.cargo??CARGO)}%${u._srv?` · ${u._srv.length}개 부대에 보급 중`:u.lj&&u.lj.k==='home'?' · 보급소로 복귀':''}`;
   if(u.type==='rec'){if(u.tow!=null)h+=' · 고장 차량 견인 중';else if(u._fixing!=null)h+=u._hk?' · 견인 고리 거는 중':' · 현장 수리 중';else if(u.lj&&u.lj.k==='fix')h+=' · 고장 차량에게 가는 중';}
   if(u.towBy!=null)h+=' · 견인되는 중';return h;};}

/* ---------- 동작 막대 버튼 ---------- */
function logiBar(s){const t=UT[s.type];let h='';
  if(s.type==='sup')h+=`<button class="btn sm" data-act="logi:home" id="ab-lg-home" title="보급소로 돌아가 탄약을 다시 싣습니다">보급소 복귀</button>`;
  if(s.type==='rec'){h+=s.tow!=null?`<button class="btn sm" data-act="logi:drop" id="ab-lg-drop" title="끌고 가던 차량을 그 자리에 내려놓습니다">견인 해제</button>`
      :`<button class="btn sm" data-act="logi:fix" id="ab-lg-fix" title="가장 급한 고장 차량에게 가서 고치거나 끌고 옵니다">견인·수리</button>`;}
  if(amMax(s)&&amFrac(s)<.95)h+=`<button class="btn sm" data-act="logi:rearm" id="ab-lg-rearm" title="가장 가까운 보급 트럭을 이 부대로 부릅니다">탄약 요청</button>`;
  return h;}
if(typeof fortBar==='function'){const _fb=fortBar;fortBar=function(s){return _fb(s)+logiBar(s);};}
if(typeof document!=='undefined')document.addEventListener('click',e=>{const b=e.target.closest('[data-act^="logi:"]');if(!b||b.disabled||!G||G.over||isAI(G.viewer))return;
  const s=UI.sel&&G.units.includes(UI.sel)?UI.sel:null;if(!s||s.nat!==G.viewer)return;const a=b.dataset.act.slice(5);let r=null;
  if(a==='home'&&s.type==='sup'){supHome(s);s.hold=false;}
  else if(a==='drop'&&s.type==='rec')lgDrop(s);
  else if(a==='fix'&&s.type==='rec')r=lgTow(s);
  else if(a==='rearm'){r=lgRearm(s);if(r&&typeof r==='object')toast(`${UT[r.type].n}이(가) 오는 중입니다`);}
  if(typeof r==='string')toast(r);bump();render();});
