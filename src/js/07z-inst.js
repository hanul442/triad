/* ===================== 성능: 병사를 묶어 그리기 =====================
   병사 한 명은 몸통·다리 둘, 세 덩어리라 큰 지도에서는 병사만으로 그리기 호출이 수백 번(그림자까지 두 배)이었다.
   병사 덩어리는 그대로 두고(위치·자세·애니메이션·보이기/숨기기 코드는 손대지 않음) 화면에는 직접 그리지 않는다(레이어 INST.L).
   대신 매 프레임 같은 형상·재질끼리 모아 InstancedMesh 하나로 그린다. 화면 밖 병사는 빼고 넣는다.
   몸통 모양 조합이 너무 많으면 묶음이 작아지니, 세력 쪽·병종마다 모양을 INST.var가지까지만 만들고 돌려 쓴다(07m-units 쪽 V3.solG).
   주소에 ?noinst 를 붙이면 꺼진다(비교용). */
const INST={L:5,var:8,on:true,set:new Set(),grp:new Map(),root:null,pool:new Map()};
try{if(typeof location!=='undefined'&&/[?&]noinst\b/.test(location.search))INST.on=false;}catch(e){}
function instReg(m){if(!INST.on||!m||!m.isMesh)return;m.layers.set(INST.L);m.userData.inst=0;INST.set.add(m);}
/* 병사 만들기를 감싼다: 모양 가짓수를 줄이고, 덩어리를 등록 */
if(typeof v3SoldierM==='function'){const _s=v3SoldierM;v3SoldierM=function(n,kind){
  if(INST.on&&V3.solG){const pk=(n%2)+'|'+kind;const pool=INST.pool.get(pk)||[];
    // 이미 충분히 만들었으면 기존 모양 중 하나를 고르도록 V3.solG를 잠깐 그 모양들로만 채운 것처럼 다룬다
    if(pool.length>=INST.var){const keys=new Set(V3.solG.keys());const g=_s(n,kind);const body=g.userData.tor;
      if(body&&!pool.includes(body.geometry)){body.geometry=pool[Math.floor(Math.random()*pool.length)];}
      for(const k of V3.solG.keys())if(!keys.has(k))V3.solG.delete(k);   // 이번에 새로 만든 모양은 버린다(다음에 또 안 쓰게)
      instReg(body);instReg(g.userData.legL);instReg(g.userData.legR);return g;}
    const g=_s(n,kind);const body=g.userData.tor;if(body&&!pool.includes(body.geometry)){pool.push(body.geometry);INST.pool.set(pk,pool);}
    instReg(body);instReg(g.userData.legL);instReg(g.userData.legR);return g;}
  return _s(n,kind);};}
/* 클릭으로 고르기는 예전처럼 병사에도 맞게 */
if(typeof v3Ray==='function'){const _r=v3Ray;v3Ray=function(){const rc=_r.apply(this,arguments);if(rc&&rc.layers)rc.layers.enable(INST.L);return rc;};}
/* 묶음 하나: 형상·재질·그림자 */
function instGroup(m){const k=m.geometry.uuid+'|'+m.material.uuid+'|'+(m.castShadow?1:0)+(m.receiveShadow?1:0);let g=INST.grp.get(k);
  if(!g){g={k,geo:m.geometry,mat:m.material,cs:m.castShadow,rs:m.receiveShadow,im:null,cap:0,n:0,used:0};INST.grp.set(k,g);}return g;}
function instEnsure(g,need){if(g.im&&g.cap>=need)return;const T=V3.T;let cap=Math.max(16,g.cap||16);while(cap<need)cap*=2;
  if(g.im){INST.root.remove(g.im);g.im.dispose();}
  const im=new T.InstancedMesh(g.geo,g.mat,cap);im.castShadow=g.cs;im.receiveShadow=g.rs;im.frustumCulled=false;im.instanceMatrix.setUsage(T.DynamicDrawUsage);
  im.userData.keepGeo=1;im.userData.keepMat=1;im.raycast=()=>{};INST.root.add(im);g.im=im;g.cap=cap;}
/* 매 프레임: 보이는 병사 덩어리의 월드 행렬을 묶음에 채운다 */
function instGather(scene,cam){const T=V3.T;if(!INST.root){INST.root=new T.Group();INST.root.name='inst';INST.root.matrixAutoUpdate=false;}
  if(INST.root.parent!==scene)scene.add(INST.root);
  scene.updateMatrixWorld();
  const fr=INST.fr||(INST.fr=new T.Frustum()),pm=INST.pm||(INST.pm=new T.Matrix4()),sp=INST.sp||(INST.sp=new T.Sphere(new T.Vector3(),.35));
  cam.updateMatrixWorld();pm.multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse);fr.setFromProjectionMatrix(pm);
  for(const g of INST.grp.values())g.n=0;
  const list=[];
  for(const m of INST.set){let o=m,vis=true;while(o.parent){if(!o.visible)vis=false;o=o.parent;}if(!o.visible)vis=false;
    if(o!==scene){m.userData.inst++;if(m.userData.inst>300)INST.set.delete(m);continue;}m.userData.inst=0;   // 장면에서 빠진 지 오래면 잊는다
    if(!vis)continue;sp.center.setFromMatrixPosition(m.matrixWorld);if(!fr.intersectsSphere(sp))continue;
    const g=instGroup(m);g.n++;list.push(m);}
  for(const g of INST.grp.values()){if(g.n)instEnsure(g,g.n);g.used=g.n;g.n=0;}
  for(const m of list){const g=instGroup(m);g.im.setMatrixAt(g.n++,m.matrixWorld);}
  for(const [k,g] of INST.grp){if(!g.im){if(!g.used)INST.grp.delete(k);continue;}g.im.count=g.used;g.im.visible=g.used>0;if(g.used)g.im.instanceMatrix.needsUpdate=true;}}
if(typeof startView==='function'){const f=startView;startView=async function(){const r=await f.apply(this,arguments);
  try{const R=V3.ren;if(INST.on&&R&&!R._inst){R._inst=1;const r0=R.render.bind(R);
    R.render=(s,c)=>{if(INST.on&&s===V3.scene&&c&&c.isCamera){try{instGather(s,c);}catch(e){instSet(false);console.error(e);}const au=s.matrixWorldAutoUpdate;s.matrixWorldAutoUpdate=false;try{r0(s,c);}finally{s.matrixWorldAutoUpdate=au;}}else r0(s,c);};}}catch(e){}
  return r;};}
/* 켜고 끄기(비교·문제 생길 때): 끄면 병사 덩어리를 다시 직접 그린다 */
function instSet(on){INST.on=!!on;for(const m of INST.set)m.layers.set(on?INST.L:0);if(INST.root)INST.root.visible=!!on;}

