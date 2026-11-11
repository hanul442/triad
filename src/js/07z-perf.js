/* ===================== 3D: 큰 지도 성능 =====================
   지형·소품·잔해는 종류마다 지도 전체를 덮는 인스턴스 메시 하나로 그린다. 그러면 메시 하나가 지도 전체 크기라서
   카메라 밖에 있어도 잘리지 않고(시야 절두체 컬링), 그림자 패스에서도 지도 전체를 다시 그린다.
   v3BuildWorld·v3BuildCity가 끝난 뒤, 큰 인스턴스 메시를 지도 구역(조각)별로 나눠 화면·그림자 범위 밖 조각은 아예 그리지 않게 한다.
   모양·색·클릭(userData.keys)은 그대로다. 단면(07f-floors)이 직접 고치는 메시(V3.cityM)는 건드리지 않는다. */
const PERF={triPer:3000,maxPer:4};
/* 한 줄에 몇 조각으로 나눌지: 조각 하나에 삼각형이 3000개쯤 되게(그리기 호출 수가 너무 늘지 않게), 많아야 4×4.
   작은 메시는 나누지 않는다. */
const perfPer=tris=>Math.max(1,Math.min(PERF.maxPer,Math.floor(Math.sqrt(tris/PERF.triPer))));
function v3Chunk(g,skip){if(!g||!V3.T)return;const T=V3.T;
  for(const o of [...g.children]){if(!o.isInstancedMesh||skip.has(o)||o.count<2||o.userData.chunk)continue;
    const geo=o.geometry;const tri=(geo.index?geo.index.count:geo.attributes.position.count)/3;const per=perfPer(tri*o.count);if(per<2)continue;const CH=N/per;
    o.updateMatrix();const A=o.instanceMatrix.array,B=new Map();
    for(let i=0;i<o.count;i++){const cx=Math.min(per-1,Math.max(0,Math.floor(A[i*16+12]/CH))),cz=Math.min(per-1,Math.max(0,Math.floor(A[i*16+14]/CH)));const k=cz*per+cx;let b=B.get(k);if(!b)B.set(k,b=[]);b.push(i);}
    if(B.size<2)continue;
    const keys=Array.isArray(o.userData.keys)?o.userData.keys:null,IC=o.instanceColor;
    for(const idx of B.values()){const m=new T.InstancedMesh(geo,o.material,idx.length);
      idx.forEach((i,j)=>{for(let q=0;q<16;q++)m.instanceMatrix.array[j*16+q]=A[i*16+q];if(IC){m.setColorAt(j,new T.Color().fromArray(IC.array,i*3));}});
      if(IC)m.instanceColor.needsUpdate=true;
      m.castShadow=o.castShadow;m.receiveShadow=o.receiveShadow;m.renderOrder=o.renderOrder;m.frustumCulled=o.frustumCulled;m.visible=o.visible;m.name=o.name;
      m.position.copy(o.position);m.quaternion.copy(o.quaternion);m.scale.copy(o.scale);
      m.userData={...o.userData,chunk:1};if(keys)m.userData.keys=idx.map(i=>keys[i]);
      m.computeBoundingSphere();g.add(m);}
    g.remove(o);if(o.dispose)o.dispose();}}   // 형상·재질은 조각들이 같이 쓰므로 버리지 않는다
/* 원래 함수를 감싼다: 다른 파일을 고치지 않고 덧붙인다 */
if(typeof v3BuildWorld==='function'){const f=v3BuildWorld;v3BuildWorld=function(){const r=f.apply(this,arguments);v3Chunk(V3.G.world,new Set());return r;};}
if(typeof v3BuildCity==='function'){const f=v3BuildCity;v3BuildCity=function(){const r=f.apply(this,arguments);const C=V3.cityM||{};v3Chunk(V3.G.city,new Set([C.w,C.r,C.ac,C.gab].filter(Boolean)));return r;};}
/* 성능 표시: 주소 끝에 ?fps 를 붙이면 왼쪽 아래에 초당 프레임·그리기 호출·삼각형·시뮬 시간을 보여 준다 */
function perfHud(){if(typeof document==='undefined'||!/[?&]fps\b/.test(location.search)||!V3.ren||V3.hud)return;
  const el=document.createElement('div');el.style.cssText='position:fixed;left:8px;bottom:8px;z-index:99;font:600 11px/1.4 "IBM Plex Mono",monospace;color:#e8e4da;background:rgba(13,18,23,.78);padding:4px 7px;border-radius:4px;pointer-events:none;white-space:pre';document.body.appendChild(el);
  const H=V3.hud={el,n:0,t0:performance.now(),calls:0,tris:0,sim:0,ticks:0};const R=V3.ren,r0=R.render.bind(R);
  R.render=(s,c)=>{V3.liteSkip=false;r0(s,c);if(V3.liteSkip)return;H.n++;H.calls+=R.info.render.calls;H.tris+=R.info.render.triangles;const now=performance.now();
    if(now-H.t0>=1000){const k=H.n||1;el.textContent=`${(H.n*1000/(now-H.t0)).toFixed(0)} fps  ${Math.round(H.calls/k)} draws  ${Math.round(H.tris/k/1000)}k tris\nsim ${(H.sim/Math.max(1,H.ticks)).toFixed(1)} ms/tick  ${G?G.units.length:0} units`;H.n=H.calls=H.tris=H.sim=H.ticks=0;H.t0=now;}};
  const tk=rtTick;rtTick=function(dt){const t=performance.now();const r=tk.apply(this,arguments);H.sim+=performance.now()-t;H.ticks++;return r;};}
if(typeof startView==='function'){const f=startView;startView=async function(){const r=await f.apply(this,arguments);try{perfHud();}catch(e){}return r;};}
