/* ===================== 3D: 상륙 작전 (바다·해변·안벽·갯벌·상륙정·구축함) =====================
   10c-landing의 지도 플래그를 그린다: sea(바다), sand(모래), bluff(절벽 풀밭), wall(안벽), pier(부두), cau(둑길), mudz(썰물 갯벌).
   - landTex: 땅 텍스처에 바다 깊이·모래·풀밭·콘크리트를 칠한다(v3TerrTex 뒤에 덧칠).
   - v3BuildCamp 뒤: 바다 수면, 지도 밖 먼바다, 안벽 벽면, 잔교, 둑길 둑, 갯벌 판(썰물에만 보임).
   - v3CampFrame 뒤: 구축함·수송선, 상륙정(오가고, 램프를 내리고, 가라앉는다), 물보라. */
const landIs=()=>!!(G&&G.camp&&typeof CAMP!=='undefined'&&CAMP[G.camp.id]&&CAMP[G.camp.id].land);
/* 바다 칸마다 가장 가까운 땅까지 거리(칸) */
function landSeaDist(){const D=new Int16Array(N*N).fill(99);const q=[];
  for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(!G.map[r][c].sea){D[r*N+c]=0;q.push(r*N+c);}
  for(let i=0;i<q.length;i++){const k=q[i],r=(k/N)|0,c=k%N;for(const [a,b] of [[r-1,c],[r+1,c],[r,c-1],[r,c+1]]){if(!inb(a,b))continue;const j=a*N+b;if(D[j]>D[k]+1){D[j]=D[k]+1;q.push(j);}}}
  return D;}
function landTex(g,P){const R=mulberry((G.seed^0x1a4d)>>>0);const D=landSeaDist();const at=(r,c)=>inb(r,c)?G.map[r][c]:null;
  const mix=(a,b,t)=>{const p=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16));const A=p(a),B=p(b);return `rgb(${A.map((v,i)=>Math.round(v+(B[i]-v)*t)).join(',')})`;};
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=G.map[r][c],X=c*P,Y=r*P;
    if(x.sea){const d=Math.min(7,D[r*N+c]);g.fillStyle=mix('#5f9294','#2b505b',(d-1)/6);g.fillRect(X,Y,P,P);
      g.fillStyle='rgba(200,225,230,.10)';for(let i=0;i<3;i++)g.fillRect(X+R()*P*.6,Y+R()*P,6+R()*14,1.5);
      if(d<=1){g.fillStyle='rgba(235,240,235,.35)';for(const [a,b,fx,fy,w,h] of [[r,c+1,X+P-6,Y,6,P],[r,c-1,X,Y,6,P],[r-1,c,X,Y,P,6],[r+1,c,X,Y+P-6,P,6]]){const y=at(a,b);if(y&&!y.sea)g.fillRect(fx,fy,w,h);}}
      continue;}
    if(x.sand){g.fillStyle='#958668';g.fillRect(X,Y,P,P);const w=at(r,c-1);if(w&&w.sea){const gr=g.createLinearGradient(X,0,X+P*.55,0);gr.addColorStop(0,'rgba(90,78,58,.55)');gr.addColorStop(1,'rgba(90,78,58,0)');g.fillStyle=gr;g.fillRect(X,Y,P*.55,P);}
      for(let i=0;i<26;i++){g.fillStyle=R()<.5?'rgba(255,245,220,.18)':'rgba(70,58,40,.16)';g.fillRect(X+R()*P,Y+R()*P,1+R()*2,1+R()*2);}
      g.strokeStyle='rgba(120,104,80,.25)';g.lineWidth=1;for(let i=0;i<2;i++){g.beginPath();const y0=Y+R()*P;g.moveTo(X,y0);g.quadraticCurveTo(X+P/2,y0+(R()-.5)*8,X+P,y0+(R()-.5)*6);g.stroke();}continue;}
    if(x.bluff){g.fillStyle='#5b6640';g.fillRect(X,Y,P,P);for(let i=0;i<18;i++){g.fillStyle=R()<.4?'rgba(122,104,72,.35)':R()<.7?'rgba(40,52,28,.35)':'rgba(140,150,90,.22)';g.beginPath();g.arc(X+R()*P,Y+R()*P,2+R()*6,0,7);g.fill();}
      const w=at(r,c-1);if(w&&w.sand){g.fillStyle='rgba(120,112,100,.9)';for(let i=0;i<14;i++){g.beginPath();g.arc(X+R()*P*.25,Y+R()*P,1.5+R()*2.5,0,7);g.fill();}}continue;}   // 자갈 둑(싱글)
    if(x.wall||x.pier){g.fillStyle=x.wall?'#87837a':'#7d786d';g.fillRect(X,Y,P,P);g.fillStyle='rgba(0,0,0,.14)';for(let i=0;i<=P;i+=16){g.fillRect(X+i,Y,1,P);g.fillRect(X,Y+i,P,1);}
      if(x.wall){g.fillStyle='#5f5c56';g.fillRect(X,Y,5,P);g.fillStyle='#2c2b28';for(let i=8;i<P;i+=16)g.fillRect(X+7,Y+i,3,3);}   // 안벽 끝 연석과 계선주
      continue;}
    if(x.isl&&x.t==='park'){g.fillStyle='rgba(60,70,40,.35)';g.fillRect(X,Y,P,P);}}}
{const _tt=typeof v3TerrTex==='function'?v3TerrTex:null;v3TerrTex=function(g,P){if(_tt)_tt(g,P);if(landIs())landTex(g,P);};}

function v3LandMats(){if(V3.landM)return V3.landM;const T=V3.T;
  V3.landM={sea:new T.MeshStandardMaterial({color:'#3f7480',roughness:.45,metalness:.05,transparent:true,opacity:.55,depthWrite:false}),
    deep:new T.MeshStandardMaterial({color:'#2b505b',roughness:.6,metalness:0}),
    wall:new T.MeshStandardMaterial({color:'#75716a',roughness:.95}),pile:new T.MeshStandardMaterial({color:'#4a4440',roughness:1}),
    rock:new T.MeshStandardMaterial({color:'#5c5a55',roughness:1}),mud:new T.MeshStandardMaterial({color:'#5d4f3d',roughness:1,metalness:0}),
    hull:new T.MeshStandardMaterial({color:'#59604f',roughness:.8,metalness:.2}),ship:new T.MeshStandardMaterial({color:'#5d656b',roughness:.7,metalness:.3}),
    deck:new T.MeshStandardMaterial({color:'#4b4f4e',roughness:.9}),dark:new T.MeshStandardMaterial({color:'#2a2c2b',roughness:.9}),
    man:new T.MeshStandardMaterial({color:'#4c5236',roughness:1}),wake:new T.MeshBasicMaterial({color:'#dfe9ea',transparent:true,opacity:.45,depthWrite:false})};
  return V3.landM;}
function landInst(geo,mat,list,g,sh){if(!list.length)return null;const T=V3.T;const im=new T.InstancedMesh(geo,mat,list.length);const m4=new T.Matrix4(),q=new T.Quaternion(),s=new T.Vector3(),p=new T.Vector3(),e=new T.Euler();
  list.forEach((o,i)=>{p.set(o[0],o[1],o[2]);e.set(0,o[3]||0,0);q.setFromEuler(e);s.set(o[4]||1,o[5]||1,o[6]||1);m4.compose(p,q,s);im.setMatrixAt(i,m4);});im.castShadow=!!sh;im.receiveShadow=true;g.add(im);return im;}
function v3BuildLand(g){const T=V3.T,M=v3LandMats();const at=(r,c)=>inb(r,c)?G.map[r][c]:null;
  const sea=[],mud=[],walls=[],piles=[],decks=[],rocks=[],clumps=[];
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=G.map[r][c];
    if(x.sea){sea.push([c+.5,.035,r+.5]);if(x.mudz)mud.push([c+.5,.04+v3Hash(key(r,c),3)*.004,r+.5]);continue;}
    if(x.wall){const w=at(r,c-1);if(w&&w.sea)walls.push([c+.05,.0,r+.5,0,1,1,1]);}
    if(x.pier&&!x.wall){let open=false;for(const [a,b] of [[r,c-1],[r-1,c],[r+1,c]]){const y=at(a,b);if(y&&y.sea)open=true;}
      if(open){decks.push([c+.5,.0,r+.5]);for(const [dx,dz] of [[.15,.15],[.85,.15],[.15,.85],[.85,.85]])piles.push([c+dx,-.08,r+dz]);}}
    if(x.cau)for(const s of [-1,1]){const y=at(r+s,c);if(y&&y.sea)rocks.push([c+.5,-.02,r+.5+s*.47,0,1,1,1]);}
    if(x.bluff)for(let i=0;i<4;i++){const h=v3Hash(key(r,c),20+i);if(h<.35)continue;clumps.push([c+v3Hash(key(r,c),30+i),.02,r+v3Hash(key(r,c),40+i),h*6,.6+h,.5+h*.8,.6+h]);}}
  const pl=new T.PlaneGeometry(1.002,1.002);pl.rotateX(-Math.PI/2);
  landInst(pl,M.sea,sea,g);
  const ws=new T.BoxGeometry(.1,.26,1.002);ws.translate(0,-.03,0);landInst(ws,M.wall,walls,g,true);
  const dk=new T.BoxGeometry(1,.05,1);dk.translate(0,.0,0);landInst(dk,M.wall,decks,g,true);
  landInst(new T.CylinderGeometry(.03,.03,.18,6),M.pile,piles,g);
  landInst(new T.BoxGeometry(1,.09,.12),M.rock,rocks,g,true);
  const cg=new T.IcosahedronGeometry(.07,0);cg.translate(0,.03,0);landInst(cg,new T.MeshStandardMaterial({color:'#4a5634',roughness:1,flatShading:true}),clumps,g,true);
  const mg=new T.PlaneGeometry(1.002,1.002);mg.rotateX(-Math.PI/2);V3.landMud=landInst(mg,M.mud,mud,g);if(V3.landMud)V3.landMud.visible=!!(G.camp.st&&G.camp.st.low);
  // 지도 밖 먼바다: 서쪽 전부, 바다가 닿는 남북 끝
  const far=(x0,x1,z0,z1)=>{const p=new T.PlaneGeometry(x1-x0,z1-z0);p.rotateX(-Math.PI/2);const o=new T.Mesh(p,M.deep);o.position.set((x0+x1)/2,-.01,(z0+z1)/2);o.receiveShadow=true;g.add(o);};
  const sh=G.camp.shore||8;far(-80,0,-60,N+60);far(0,sh,-60,0);far(0,sh,N,N+60);}
{const _bc=v3BuildCamp;v3BuildCamp=function(g){_bc(g);if(landIs())try{v3BuildLand(g);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}};}

/* ---------- 배: 구축함·수송선, 상륙정 ---------- */
function v3Destroyer(M){const T=V3.T,g=new T.Group();const L=7,W=.8;
  const hull=new T.Mesh(new T.BoxGeometry(W,.35,L),M.ship);hull.position.y=.05;g.add(hull);
  const bow=new T.Mesh(new T.ConeGeometry(W*.56,1.4,4),M.ship);bow.rotation.x=Math.PI/2;bow.rotation.y=Math.PI/4;bow.scale.set(1,1,.45);bow.position.set(0,.05,-L/2-.6);g.add(bow);
  const dk=new T.Mesh(new T.BoxGeometry(W*.96,.02,L),M.deck);dk.position.y=.23;g.add(dk);
  const br=new T.Mesh(new T.BoxGeometry(W*.6,.4,1.1),M.ship);br.position.set(0,.43,-1.3);g.add(br);
  const mast=new T.Mesh(new T.CylinderGeometry(.03,.03,1.1,5),M.dark);mast.position.set(0,.9,-1.1);g.add(mast);
  for(const z of [-.2,.8]){const f=new T.Mesh(new T.CylinderGeometry(.13,.15,.55,8),M.ship);f.position.set(0,.5,z);g.add(f);}
  g.userData.guns=[];for(const z of [-2.7,-2,2.2,2.9]){const t=new T.Mesh(new T.BoxGeometry(.32,.14,.36),M.ship);t.position.set(0,.3,z);const b=new T.Mesh(new T.CylinderGeometry(.025,.025,.5,5),M.dark);b.rotation.z=Math.PI/2;b.position.set(.3,.31,z);g.add(t,b);g.userData.guns.push([.55,.31,z]);}
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return g;}
function v3Transport(M){const T=V3.T,g=new T.Group();const h=new T.Mesh(new T.BoxGeometry(1.4,.6,9),M.ship);h.position.y=.15;g.add(h);
  const st=new T.Mesh(new T.BoxGeometry(1.2,.7,1.6),M.ship);st.position.set(0,.8,3.2);g.add(st);const f=new T.Mesh(new T.CylinderGeometry(.22,.26,.7,8),M.ship);f.position.set(0,1.4,3.4);g.add(f);
  for(const z of [-3,-1,1])for(const s of [-1,1]){const d=new T.Mesh(new T.BoxGeometry(.18,.3,.18),M.dark);d.position.set(s*.45,.55,z);g.add(d);}
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return g;}
function v3Boat(b,M){const T=V3.T,g=new T.Group();const big=b.k==='lcm';const L=big?1.15:.72,W=big?.42:.28,H=big?.15:.12;
  const hull=new T.Mesh(new T.BoxGeometry(L,H,W),M.hull);hull.position.y=H/2-.03;g.add(hull);
  const in_=new T.Mesh(new T.BoxGeometry(L*.8,.01,W*.8),M.dark);in_.position.set(-.02,H-.03,0);g.add(in_);
  const ramp=new T.Group();ramp.position.set(L/2,-.03,0);const rp=new T.Mesh(new T.BoxGeometry(.03,H+.02,W),M.hull);rp.position.set(0,(H+.02)/2,0);ramp.add(rp);g.add(ramp);
  const cab=new T.Mesh(new T.BoxGeometry(.1,.08,W*.5),M.hull);cab.position.set(-L/2+.08,H+.01,0);g.add(cab);
  if(big){const tk=new T.Mesh(new T.BoxGeometry(.55,.14,.28),b.t==='tank'||b.t==='ifv'?M.man:M.ship);tk.position.set(0,H+.04,0);g.add(tk);}
  else for(let i=0;i<8;i++){const h=new T.Mesh(new T.SphereGeometry(.022,5,4),M.man);h.position.set(-L*.3+(i%4)*L*.18,H+.0,((i/4|0)-.5)*W*.4);g.add(h);}
  const wk=new T.Mesh(new T.PlaneGeometry(L*.9,W*.7),M.wake);wk.rotation.x=-Math.PI/2;wk.position.set(-L*.85,.005,0);g.add(wk);
  g.traverse(o=>{if(o.isMesh&&o!==wk)o.castShadow=true;});g.userData={ramp,wk,ph:b.id*1.7};return g;}
function v3LandFrame(now){const C=G.camp,T=V3.T,M=v3LandMats();const t=now/1000;
  const tag=G.seed+'|'+C.id;if(!V3.landG||V3.landG.userData.tag!==tag){if(V3.landG)V3.scene.remove(V3.landG);const g=new T.Group();g.userData={tag,boats:new Map(),ships:[]};V3.landG=g;V3.scene.add(g);V3.landFx=[];
    // 구축함은 해안과 나란히, 수송선은 더 먼바다에
    for(const [x,z] of [[-4.5,N*.22],[-5,N*.62]]){const d=v3Destroyer(M);d.position.set(x,0,z);g.add(d);g.userData.ships.push(d);}
    for(const [x,z] of [[-13,N*.35],[-16,N*.75],[-12,N*.05]]){const s=v3Transport(M);s.position.set(x,0,z);s.rotation.y=.2;g.add(s);}}
  const g=V3.landG,BM=g.userData.boats;const seen=new Set();
  for(const sh of g.userData.ships){sh.position.y=Math.sin(t*.6+sh.position.z)*.02;sh.rotation.z=Math.sin(t*.5+sh.position.z)*.012;}
  for(const b of C.boats||[]){seen.add(b.id);let o=BM.get(b.id);if(!o){o=v3Boat(b,M);BM.set(b.id,o);g.add(o);}
    const u=o.userData;const bob=Math.sin(t*2.2+u.ph)*.012;
    if(b.st==='sink'){const k=1-Math.max(0,b.w)/4;o.position.set(b.x,.02+bob-k*.25,b.z);o.rotation.set(k*.5,0,k*.35);u.wk.visible=false;}
    else{o.position.set(b.x,.03+bob,b.z);o.rotation.set(Math.sin(t*1.7+u.ph)*.03,b.st==='out'?Math.PI:0,Math.sin(t*1.3+u.ph)*.02);
      u.wk.visible=b.st!=='un';u.wk.material.opacity=b.st==='un'?0:.4;
      const want=b.st==='un'?-1.25:0;u.ramp.rotation.z+=(want-u.ramp.rotation.z)*.12;}}
  for(const [id,o] of BM)if(!seen.has(id)){g.remove(o);BM.delete(id);}
  // 물보라
  const fx=V3.landFx||[];for(let i=fx.length-1;i>=0;i--){const f=fx[i];const k=(now-f.t0)/f.dur;if(k>=1){g.remove(f.o);f.o.material.dispose();fx.splice(i,1);continue;}
    f.o.position.y=f.y0+Math.sin(k*Math.PI)*f.h;f.o.scale.set(f.s*(.6+k*.8),f.s*(1.4-k*.5),1);f.o.material.opacity=(1-k)*.85;}
  if(V3.landMud)V3.landMud.visible=!!C.st.low;}
{const _cf=v3CampFrame;v3CampFrame=function(now){_cf(now);if(landIs())try{v3LandFrame(now);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}
  else if(V3.landG){V3.scene.remove(V3.landG);V3.landG=null;}};}
/* 물보라: 0 총탄, 1 포탄, 2 침몰 */
FXH.splash=function(x,z,big){if(typeof V3==='undefined'||!V3.on||!V3.landG)return;const T=V3.T;const n=big===2?6:big?3:1;
  for(let i=0;i<n;i++){const o=new T.Sprite(new T.SpriteMaterial({map:V3.puff,color:'#e6eef0',transparent:true,depthWrite:false,opacity:.85}));
    const s=(big===2?.5:big?.35:.14)*(.7+Math.random()*.6);o.position.set(x+(Math.random()-.5)*(big?.5:.15),.05,z+(Math.random()-.5)*(big?.5:.15));o.scale.set(s,s,1);V3.landG.add(o);
    (V3.landFx=V3.landFx||[]).push({o,t0:performance.now()+i*60,dur:big?1100:600,y0:.05,h:big===2?.5:big?.35:.12,s});}
  if(big&&typeof sndBoom==='function')try{sndBoom(x,z,.6,{});}catch(e){}};
/* 함포: 가까운 구축함 포구에 불꽃 */
FXH.naval=function(tx,tz,n){if(typeof V3==='undefined'||!V3.on||!V3.landG)return;const T=V3.T;const sh=V3.landG.userData.ships;if(!sh||!sh.length)return;
  const s=sh.reduce((a,b)=>Math.abs(b.position.z-tz)<Math.abs(a.position.z-tz)?b:a);
  for(let i=0;i<n;i++)setTimeout(()=>{if(!V3.landG)return;const gp=s.userData.guns[i%s.userData.guns.length];const o=new T.Sprite(new T.SpriteMaterial({map:V3.puff,color:'#ffb35a',transparent:true,depthWrite:false,blending:T.AdditiveBlending}));
    o.position.set(s.position.x+gp[0],gp[1]+.05,s.position.z+gp[2]);o.scale.set(.6,.6,1);V3.landG.add(o);(V3.landFx=V3.landFx||[]).push({o,t0:performance.now(),dur:350,y0:gp[1]+.05,h:.05,s:.6});
    const p=new T.Sprite(new T.SpriteMaterial({map:V3.puff,color:'#9a958c',transparent:true,depthWrite:false,opacity:.6}));p.position.copy(o.position);V3.landG.add(p);V3.landFx.push({o:p,t0:performance.now(),dur:2200,y0:gp[1]+.1,h:.4,s:.9});
    if(typeof sfx==='function')try{sfx('launch',.8,s.position.x,s.position.z);}catch(e){}},(.5+i*.7)*1000/Math.max(.25,(G&&G.spd)||1));};
