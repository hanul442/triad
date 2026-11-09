/* ===================== 3D: 부서진 지형지물 (05o-wreck의 화면 쪽) =====================
   - 나무: G.fellZ 안의 나무는 폭발 반대쪽으로 쓰러져 눕는다(전차가 지나간 자리는 진행 방향 옆으로).
   - 소품: 불탄 차는 검게, 뒤집힌 차는 뒤집혀, 밟힌 차는 납작하게. 가로등·신호등·쓰레기통은 쓰러지고 생울타리는 주저앉는다.
   - 길로 쏟아진 잔해 더미(G.debris)와 구덩이 둘레의 흙더미(G.craters)를 그린다.
   지면 그룹의 인스턴스 메시를 직접 고친다. 07z-perf가 조각낸 뒤(v3BuildWorld 바깥)에 원래 행렬을 기억해 두고, 상태가 바뀌면 원래 행렬에서 다시 계산한다. */
const WRV={recG:null,treeV:-1,propV:-1,pileV:-1,t:0,meshes:null};
const wrvHash=(a,b)=>{let h=Math.imul((a|0)^0x9e3779b9,2654435761)^Math.imul(b|0,40503);h=Math.imul(h^h>>>15,2246822507);h^=h>>>13;return (h>>>0)/4294967296;};
/* 소품을 그리는 동안 쓴 형상을 적어 둔다(공원·연못은 빼고) */
if(typeof v3Inst==='function'){const _i=v3Inst;v3Inst=function(g,geo,mat,list,opt){if(WRV.recG&&list&&list.length)WRV.recG.add(geo);return _i(g,geo,mat,list,opt);};}
if(typeof v3BuildProps==='function'){const _b=v3BuildProps;v3BuildProps=function(g){WRV.recG=new Set();try{return _b(g);}finally{WRV.props=WRV.recG;WRV.recG=null;}};}
if(typeof v3BuildPark==='function'){const _b=v3BuildPark;v3BuildPark=function(g){const s=WRV.recG;WRV.recG=null;try{return _b(g);}finally{WRV.recG=s;}};}
if(typeof v3BuildPonds==='function'){const _b=v3BuildPonds;v3BuildPonds=function(g){const s=WRV.recG;WRV.recG=null;try{return _b(g);}finally{WRV.recG=s;}};}
{const _w=v3BuildWorld;v3BuildWorld=function(){const v=_w.apply(this,arguments);WRV.meshes=null;WRV.treeV=WRV.propV=WRV.pileV=-1;return v;};}
/* 지면 그룹을 훑어 나무 메시·소품 메시를 고른다 */
function wrvIndex(){const g=V3.G&&V3.G.world;if(!g)return null;const T=V3.T;
  const treeGeo=new Set([V3.leafG,V3.treeG,V3.bmG&&V3.bmG.pine,typeof NAT==='object'&&NAT.geo&&NAT.geo.spruce,typeof NAT==='object'&&NAT.geo&&NAT.geo.pine].filter(Boolean));
  const trunkMat=new Set([V3.pm&&V3.pm.bark,V3.M&&V3.M.trunk].filter(Boolean));const propGeo=WRV.props||new Set();
  const trees=[],props=[];
  for(const o of g.children){if(!o.isInstancedMesh)continue;const isT=treeGeo.has(o.geometry)||trunkMat.has(o.material);const isP=!isT&&propGeo.has(o.geometry);if(!isT&&!isP)continue;
    const m0=o.instanceMatrix.array.slice(0,o.count*16);const c0=o.instanceColor?o.instanceColor.array.slice(0,o.count*3):null;
    (isT?trees:props).push({o,m0,c0,own:null});}
  // 소품 인스턴스 → 가장 가까운 소품
  const P=G.props||[];const grid=new Map();P.forEach((p,i)=>{const k=Math.floor(p.z)*N+Math.floor(p.x);let a=grid.get(k);if(!a)grid.set(k,a=[]);a.push(i);});
  for(const M of props){const A=M.m0,n=M.o.count;M.own=new Int32Array(n).fill(-1);
    for(let i=0;i<n;i++){const x=A[i*16+12],z=A[i*16+14];let best=-1,bd=.36;const r0=Math.floor(z),c0=Math.floor(x);
      for(let a=r0-1;a<=r0+1;a++)for(let b=c0-1;b<=c0+1;b++){const L=grid.get(a*N+b);if(!L)continue;for(const j of L){const d=Math.hypot(P[j].x-x,P[j].z-z);if(d<bd){bd=d;best=j;}}}
      M.own[i]=best;}}
  return WRV.meshes={trees,props,tmp:{m:new T.Matrix4(),r:new T.Matrix4(),t:new T.Matrix4(),t2:new T.Matrix4(),q:new T.Quaternion(),v:new T.Vector3(),ax:new T.Vector3(),c:new T.Color()}};}
/* 원래 행렬 m0[i]를 바닥 (px,0,pz)을 축으로 ax 방향 축에 대해 ang만큼 돌린다 */
function wrvTilt(M,i,px,py,pz,axx,axz,ang,sy){const S=WRV.meshes.tmp;S.m.fromArray(M.m0,i*16);
  if(sy!=null){S.r.makeScale(1,sy,1);}else{S.ax.set(axx,0,axz).normalize();S.r.makeRotationAxis(S.ax,ang);}
  S.t.makeTranslation(px,py,pz);S.t2.makeTranslation(-px,-py,-pz);S.t.multiply(S.r).multiply(S.t2).multiply(S.m);M.o.setMatrixAt(i,S.t);}
function wrvHide(M,i){const S=WRV.meshes.tmp;S.m.makeScale(0,0,0);M.o.setMatrixAt(i,S.m);}
/* 쓰러진 나무 */
function wrvTrees(){const W=WRV.meshes;const Z=G.fellZ||[];const zg=new Map();
  for(const f of Z){for(let a=Math.floor(f.z-f.r);a<=Math.floor(f.z+f.r);a++)for(let b=Math.floor(f.x-f.r);b<=Math.floor(f.x+f.r);b++){const k=a*N+b;let L=zg.get(k);if(!L)zg.set(k,L=[]);L.push(f);}}
  for(const M of W.trees){const A=M.m0,n=M.o.count;let ch=false;
    for(let i=0;i<n;i++){const x=A[i*16+12],z=A[i*16+14];const L=zg.get(Math.floor(z)*N+Math.floor(x));let f=null;
      if(L)for(const q of L){const d=Math.hypot(q.x-x,q.z-z);if(d>q.r)continue;const h=wrvHash(Math.round(x*997),Math.round(z*991));if(d<q.r*.6||h<.65){f=q;break;}}
      const was=M.o.userData.wf&&M.o.userData.wf[i];
      if(!f){if(was){M.o.setMatrixAt(i,W.tmp.m.fromArray(A,i*16));M.o.userData.wf[i]=0;ch=true;}continue;}
      if(was)continue;const h=wrvHash(Math.round(x*577),Math.round(z*613));let dx=x-f.x,dz=z-f.z;const dl=Math.hypot(dx,dz);
      if(f.tk||dl<.02){const a=h*6.283;dx=Math.cos(a);dz=Math.sin(a);}else{dx/=dl;dz/=dl;}
      // 쓰러지는 방향(dx,dz)에 수직인 축으로 눕힌다
      wrvTilt(M,i,x,0,z,dz,-dx,1.3+h*.25);(M.o.userData.wf||(M.o.userData.wf=new Uint8Array(n)))[i]=1;ch=true;}
    if(ch)M.o.instanceMatrix.needsUpdate=true;}}
/* 부서진 소품 */
function wrvProps(){const W=WRV.meshes;const P=G.props||[];const dark='#1d1b18';
  for(const M of W.props){const n=M.o.count;let ch=false,cc=false;const cy=M.o.geometry.boundingBox||(M.o.geometry.computeBoundingBox(),M.o.geometry.boundingBox);
    for(let i=0;i<n;i++){const j=M.own[i];if(j<0)continue;const p=P[j];if(!p)continue;const st=p.dead?'dead':p.crush?'crush':p.flip?'flip':p.burnt?'burn':'';
      const key=st;const U=M.o.userData.ws||(M.o.userData.ws=[]);if(U[i]===key)continue;U[i]=key;ch=true;
      const A=M.m0;const iy=A[i*16+13];
      if(!st){M.o.setMatrixAt(i,W.tmp.m.fromArray(A,i*16));if(M.c0&&M.o.instanceColor){M.o.instanceColor.array.set(M.c0.subarray(i*3,i*3+3),i*3);cc=true;}continue;}
      if(p.k==='car'||p.k==='wagon'){
        if(st==='dead'){wrvHide(M,i);continue;}
        // 바퀴·지붕판(작은 인스턴스)은 타 버리거나 깔려 사라진다
        const small=(cy.max.y-cy.min.y)<.05&&(cy.max.x-cy.min.x)<.08;
        if(small&&(st==='burn'||st==='crush'||st==='flip')){wrvHide(M,i);continue;}
        if(st==='crush')wrvTilt(M,i,p.x,0,p.z,0,0,0,.32);
        else if(st==='flip'){const cs=Math.cos(p.ry),sn=-Math.sin(p.ry);wrvTilt(M,i,p.x,.07,p.z,cs,sn,Math.PI);}
        else M.o.setMatrixAt(i,W.tmp.m.fromArray(A,i*16));
        if(M.o.instanceColor){W.tmp.c.set(dark);W.tmp.c.toArray(M.o.instanceColor.array,i*3);cc=true;}continue;}
      if(p.k==='hedge'||p.k==='bocage'){wrvTilt(M,i,A[i*16+12],0,A[i*16+14],0,0,0,.28);continue;}
      if(p.k==='barrier'){const h=wrvHash(j,7);wrvTilt(M,i,p.x,0,p.z,Math.cos(p.ry),-Math.sin(p.ry),(h<.5?-1:1)*1.4);continue;}
      // 가로등·신호등·쓰레기통: 밑동을 축으로 한쪽으로 쓰러진다(같은 소품의 기둥·팔·등은 같이 돈다). 신호등 불은 꺼진다
      if(p.k==='light'&&M.o.material===V3.litM){wrvHide(M,i);continue;}
      const a=wrvHash(j,3)*6.283;wrvTilt(M,i,p.x,0,p.z,Math.cos(a),Math.sin(a),p.k==='bin'?1.57:1.48);}
    if(ch)M.o.instanceMatrix.needsUpdate=true;if(cc)M.o.instanceColor.needsUpdate=true;}}
/* 잔해 더미·구덩이 흙 테두리: 작은 덩어리를 쌓는다 */
function wrvPiles(){const T=V3.T;if(!V3.wrkG){V3.wrkG=new T.Group();V3.wrkG.name='wreck';V3.scene.add(V3.wrkG);}const g=V3.wrkG;
  for(const o of [...g.children]){g.remove(o);if(o.dispose)o.dispose();}
  const ch=[],slab=[],dirt=[];const CC=['#6c675f','#5a5650','#7a746a','#47443f','#837c70','#3a3835'];
  for(const d of G.debris||[]){const n=Math.round(10+d.d*70);const ax=d.dr?1:0,az=d.dr?0:1;
    for(let i=0;i<n;i++){const h1=wrvHash(d.s*37+i,1),h2=wrvHash(d.s*37+i,2),h3=wrvHash(d.s*37+i,3);
      const u=(h1-.5)*2*d.hl,v=(h2-.5)*d.d;const edge=1-Math.max(Math.abs(u)/d.hl,Math.abs(v)/(d.d/2+1e-6)*.8);   // 가운데·건물 쪽이 높다
      const sz=.018+h3*.03+d.d*.025;const toB=(v+d.d/2)/(d.d+1e-6);
      (i%3?ch:slab).push({x:d.x+ax*u-d.dc*v,z:d.z+az*u-d.dr*v,y:Math.max(0,(edge*.5+toB*.5)*d.d*.22)*(.6+h3*.6),s:sz,sx:sz*(i%3?1:2.2),sy:sz*(i%3?.55+h1*.3:.25),sz:sz*(i%3?1:1.4),ry:h2*6.28,rx:(h3-.5)*.7,rz:(h1-.5)*.6,col:CC[Math.floor(h1*CC.length)]});}}
  for(const c of G.craters||[]){if(c.r<.08)continue;const n=Math.round(8+c.r*40);const s0=wrvHash(Math.round(c.x*97),Math.round(c.z*89))*6.28;
    for(let i=0;i<n;i++){const h=wrvHash(i,Math.round(c.x*31+c.z*17)),h2=wrvHash(i+99,Math.round(c.x*13+c.z*41));const a=s0+i/n*6.283+(h2-.5)*.6;const rr=c.r*(.95+h*.45);dirt.push({x:c.x+Math.cos(a)*rr,z:c.z+Math.sin(a)*rr,y:-c.r*.03,s:c.r*(.12+h2*.14),sx:c.r*(.16+h*.16),sy:c.r*(.05+h*.05),ry:a+h2,col:h<.35?'#4a4136':h<.7?'#5c5143':'#6d6352'});}}
  const M=WRV.mat||(WRV.mat=(()=>{const m=new T.MeshStandardMaterial({color:'#ffffff',roughness:1,flatShading:true});if(typeof v3FowMat==='function')v3FowMat(m);return m;})());
  const geo=WRV.geo||(WRV.geo=new T.DodecahedronGeometry(1,0)),box=WRV.box||(WRV.box=new T.BoxGeometry(1,1,1));
  for(const [L,sh,gg] of [[ch,true,geo],[slab,true,box],[dirt,false,geo]]){if(!L.length)continue;const im=v3Inst(g,gg,M,L,{noShadow:!sh});if(im){im.userData.keepGeo=1;im.userData.keepMat=1;im.userData.chunk=1;}}}
function wrvFrame(now){if(!V3.on||!G||!V3.G||!V3.G.world)return;if(now-WRV.t<350)return;WRV.t=now;
  const wv=G.wrkV||0,pv=G.propV||0;if(wv===WRV.pileV&&pv===WRV.propV&&wv===WRV.treeV&&WRV.meshes)return;
  if(!WRV.meshes&&!wrvIndex())return;
  try{if(WRV.treeV!==wv){WRV.treeV=wv;wrvTrees();}
    if(WRV.propV!==pv){WRV.propV=pv;wrvProps();}
    if(WRV.pileV!==wv){WRV.pileV=wv;wrvPiles();}}catch(e){console.warn(e);}}
if(typeof dsFrame==='function'){const _f=dsFrame;dsFrame=function(now,dt){_f(now,dt);wrvFrame(now);};}
/* ---------- 순간 연출 ---------- */
Object.assign(FXH,{
  crater(c,grow){if(typeof V3==='undefined'||!V3.on||typeof dsScar!=='function')return;dsScar('crater',c.x,c.z,c.r*1.15);if(c.r>=.2)dsScar('spray',c.x,c.z,c.r*4);},
  propHit(p,st){if(typeof V3==='undefined'||!V3.on)return;
    if(st==='burn'||st==='flip'){if(typeof dsFires==='function')dsFires(p.x,p.z,2,25000+Math.random()*20000,.18,.1);if(typeof dsScar==='function')dsScar('scorch',p.x,p.z,.22);}
    if(st==='flip'&&typeof v3Debris==='function')v3Debris(p.x,.1,p.z,6,.8);
    if(st==='crush'&&typeof dsDust==='function')dsDust(p.x,p.z,.35,2500,3,'#6d665c');},
  debris(d){if(typeof V3==='undefined'||!V3.on)return;if(typeof dsDust==='function')dsDust(d.x,d.z,.6+d.d*2,14000,6);if(typeof dsScar==='function')dsScar('rubble',d.x,d.z,.35+d.d);},
  floorFall(r,c,rf0,rf1){if(typeof V3==='undefined'||!V3.on)return;const [x,z]=v3x(r,c);const y=(rf1+.5)*FLOOR_H;
    if(typeof v3Debris==='function')v3Debris(x,y,z,10+(rf0-rf1)*6,1);if(typeof dsDust==='function')dsDust(x,z,1.1,12000,8,null,y*.6);
    if(typeof v3Burst==='function')v3Burst(x,y,z,.8,'#cbb79a',2,0);V3.shake=Math.max(V3.shake||0,.07);if(typeof sfx==='function')sfx('boom',.9,x,z);}});
