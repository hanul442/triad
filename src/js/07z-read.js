/* ===================== READ: 전장 알아보기 쉽게 =====================
   병사 모형이 작고 화면이 어두워서 어디에 누가 있는지 알기 어렵다는 의견을 받아:
   - 부대 발밑에 세력 색 고리(보병 작은 고리, 차량 큰 고리). 땅 위에 깔려 건물·차에 가려지면 같이 가려진다.
   - 부대 이름표 앞에 병종 글자(소총·기관총·전차…)를 세력 색 칩으로 붙인다.
   - 멀리 볼 때(예전엔 이름표가 모두 사라짐)에도 병종 칩만은 남긴다. 그래서 줌을 빼고 전체 흐름을 볼 수 있다.
   - 적 부대 칩은 테두리를 굵게 해서 아군과 바로 갈린다. */
const READ={ty:{rifle:'소총',mg:'기관총',at:'대전차',atgm:'미사일',sniper:'저격',eng:'공병',mortar:'박격포',ifv:'장갑차',tank:'전차',hmv:'험비',spg:'자주포',drone:'드론',
  gunship:'공격헬기',sup:'보급',rec:'구난',amb:'구급',aa:'대공',zu:'대공포',ew:'전자전',fpv:'FPV',dteam:'드론팀',mlrs:'다연장',vbied:'차량',civ:'민간'},
  far:30};
function readTy(u){const t=UT[u.type]||{};return READ.ty[u.type]||(t.n||u.type).replace(/(분대|팀)$/,'').slice(0,3);}
/* 고리: 보병은 반지름 .19, 차량 .27 */
function readRing(o,u){const T=V3.T;const t=UT[u.type];if(o.userData.tring)return;const veh=t.cls==='veh'||t.fly;const r=veh?.27:.19;
  const key='rg'+u.nat+(veh?'v':'i');let geo=V3.matc.get(key+'g');if(!geo){geo=new T.RingGeometry(r-.034,r,28);V3.matc.set(key+'g',geo);}
  let mat=V3.matc.get(key);if(!mat){mat=new T.MeshBasicMaterial({color:mapCol(u.nat),transparent:true,opacity:.95,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});V3.matc.set(key,mat);}
  const m=new T.Mesh(geo,mat);m.rotation.x=-Math.PI/2;m.renderOrder=2;o.add(m);o.userData.tring=m;}
if(typeof v3SyncUnits==='function'){const _su=v3SyncUnits;v3SyncUnits=function(vs,vn){const r=_su.apply(this,arguments);if(!V3.T)return r;
  for(const o of V3.uo.values()){const u=o.userData.u;if(!u)continue;try{readRing(o,u);}catch(e){}const m=o.userData.tring;if(m&&o.userData.ring)m.position.y=o.userData.ring.position.y+.004;}
  return r;};}
/* 이름표 앞 병종 칩 */
if(typeof v3UnitTag==='function'){const _ut=v3UnitTag;v3UnitTag=function(u){const h=_ut(u);const foe=G&&u.nat!==G.viewer;return `<span class="ty${foe?' foe':''}">${readTy(u)}</span>${h}`;};}
/* 이름표 자리: 멀리 볼 때도 부대 이름표는 남기고 병종 칩만 보인다 */
v3PlaceLabels=function(){const v=V3.tmpV||(V3.tmpV=new V3.T.Vector3());const w=V3.cv.clientWidth,h=V3.cv.clientHeight;const far=V3.cs.d>READ.far,off=V3.cine||V3.press;
  const lab=$('#v3d-lab');if(lab&&lab._far!==far){lab._far=far;lab.classList.toggle('far',far);}
  for(const o of V3.labels.values()){let p=o.p;if(o.uid!=null){const uo=V3.uo.get(o.uid);if(!uo||off){o.el.style.display='none';continue;}p=[uo.position.x,uo.position.y+(uo.userData.air?.25:.45),uo.position.z];}
    v.set(p[0],p[1]+(typeof v3TY==='function'?v3TY(p[0],p[2]):0),p[2]).project(V3.cam);if(v.z>1||v.x<-1.1||v.x>1.1||v.y<-1.1||v.y>1.1){o.el.style.display='none';continue;}o.el.style.display='';
    o.el.style.transform=`translate(${((v.x+1)/2*w).toFixed(1)}px,${((1-v.y)/2*h).toFixed(1)}px) translate(-50%,-50%)`;}};
if(typeof document!=='undefined'&&!document.getElementById('read-css')){const st=document.createElement('style');st.id='read-css';
  st.textContent=`.v3u .ty{display:inline-block;font:700 9px/1 var(--font-d);letter-spacing:-.02em;color:#0b0f14;background:var(--c);padding:2px 3px 2px;border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,.7);white-space:nowrap}
.v3u .ty.foe{box-shadow:0 0 0 1.5px #0b0f14,0 0 0 2.5px var(--c)}
#v3d-lab.far .v3u>:not(.ty){display:none}
#v3d-lab.far .v3u .ty{font-size:8px;padding:1px 2px}
#v3d-lab.spec-clean .v3u>.ty{display:inline-block}`;
  document.head.appendChild(st);}
/* 처음 화면: 우리 집결지가 화면 아래 끝에 걸리지 않게 조금 더 우리 쪽으로 */
if(typeof v3HomeCam==='function'){const _hc=v3HomeCam;v3HomeCam=function(now){const r=_hc.apply(this,arguments);if(!G||!V3.cs)return r;const sp=zoneSpots(G.viewer);if(!sp.length)return r;
  const s=V3.cs;const [x,z]=v3x(sp[0][0],sp[0][1]);s.gx=s.gx+(x-s.gx)*.55;s.gz=s.gz+(z-s.gz)*.55;if(now){s.x=s.gx;s.z=s.gz;}return r;};}
