/* ===================== 지도 다양화: 화면 =====================
   03c-biome이 만든 땅과 소품을 그리고, 기후(feat.clime)에 맞춰 색을 바꾼다.
   - 땅 그림(v3TerrTex 뒤): 밭 고랑, 목초지, 숲 바닥, 흙길·시골 포장도로, 농가·자갈 마당, 바다·안벽·잔교·컨테이너 야적장. 그 위에 눈·모래·낙엽.
   - 지면 그룹(v3BuildWorld 뒤): 침엽수·과수원, 바다 수면·안벽 턱·잔교 바닥, 생울타리·건초더미·컨테이너·크레인·배·통나무.
   - 건물(v3BuildCity 뒤): 겨울엔 지붕에 눈. 외벽·지붕 색표(KSTY·ROOFC)와 하늘·안개 색(ENVP)은 기후마다 바꿔 끼운다.
   캠페인 지도(G.camp)는 07c-camp가 직접 그리므로 건드리지 않는다. */
const BM3={orig:null,cl:null};
const bmClime=()=>G&&!G.camp&&G.feat&&G.feat.clime||'temp';
function bmClimeApply(){const cl=bmClime();
  if(!BM3.orig)BM3.orig={ksty:JSON.parse(JSON.stringify(KSTY)),roof:ROOFC.slice(),env:JSON.parse(JSON.stringify(ENVP))};
  if(BM3.cl===cl)return;BM3.cl=cl;const O=BM3.orig;
  for(const k in O.ksty)KSTY[k].c=O.ksty[k].c.slice();ROOFC.splice(0,ROOFC.length,...O.roof);for(const t in O.env)Object.assign(ENVP[t],O.env[t]);
  if(cl==='desert'){const T=V3.T,s=new T.Color('#d8c49c'),c=new T.Color();for(const k in KSTY)KSTY[k].c=KSTY[k].c.map(h=>'#'+c.set(h).lerp(s,.5).getHexString());
    ROOFC.splice(0,ROOFC.length,'#b9a382','#a8916e','#c4b08e','#9c8566');Object.assign(ENVP.day,{fog:'#c4ae8a',sky:'#e2d4b6',gr:'#8f7a5a',sun:'#fff0d4'});Object.assign(ENVP.dusk,{fog:'#a07a58'});}
  else if(cl==='winter'){ROOFC.splice(0,ROOFC.length,'#e8ebee','#dfe3e7','#d5dade','#eef0f2');Object.assign(ENVP.day,{fog:'#b4b9be',sky:'#d6dade',gr:'#a9aeb2',sun:'#fff6ec'});Object.assign(ENVP.dusk,{fog:'#958a8a',gr:'#8a8a90'});}
  else if(cl==='autumn')Object.assign(ENVP.day,{fog:'#a08c70',gr:'#6e5a44'});}
const BM_LEAF={temp:null,autumn:['#a0522d','#b8862f','#8b4513','#c46a2b','#9a6a2a','#7a5a2a'],winter:['#d9dee1','#cfd5d8','#e4e7e9'],desert:['#7d7a4a','#8a8452','#6e6c42']};
const BM_PINE={temp:['#34402e','#3d4a34','#2e3a2a','#46513a'],autumn:['#34402e','#3d4a34','#2e3a2a'],winter:['#dfe3e6','#c9d0d3','#56604f','#e8ebed'],desert:['#5a5e3e','#4f5536']};
const BM_HEDGE={temp:['#3f4a30','#46512f','#3a442c'],autumn:['#5a4a2a','#6b5530','#4f4a2c'],winter:['#c9cfd2','#b9c0c3','#d6dadc'],desert:['#6e6a44','#7a7450']};

/* ---------- 땅 그림 ---------- */
{const _tt=v3TerrTex;v3TerrTex=function(g,P){_tt(g,P);if(!G||G.camp)return;try{bmGroundTex(g,P);}catch(e){console.error(e);}};}
function bmGroundTex(g,P){const R=mulberry(((G.seed|0)^0xb10e)>>>0);const M=G.map,cl=bmClime();const at=(r,c)=>inb(r,c)?M[r][c]:null;
  const blot=(X,Y,n,cols,r0,r1)=>{for(let i=0;i<n;i++){g.fillStyle=cols[Math.floor(R()*cols.length)];g.beginPath();g.arc(X+R()*P,Y+R()*P,r0+R()*(r1-r0),0,7);g.fill();}};
  const along=(X,Y,ro,o,w,col)=>{g.fillStyle=col;if(ro==='v')g.fillRect(X+o,Y,w,P);else if(ro==='h')g.fillRect(X,Y+o,P,w);else{g.fillRect(X+o,Y,w,P);g.fillRect(X,Y+o,P,w);}};
  const CROP={1:['#a38d4e','#b8a25e'],2:['#9a8a60','#ab9a6c'],3:['#56643a','#677645'],4:['#584837','#4a3b2c']};
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=M[r][c],X=c*P,Y=r*P;
    if(x.crop&&!x.site){const [a,b]=CROP[x.crop]||CROP[1];g.fillStyle=a;g.fillRect(X,Y,P,P);g.fillStyle=b;const h=x.cd==='h';for(let i=1;i<P;i+=6)h?g.fillRect(X,Y+i,P,3):g.fillRect(X+i,Y,3,P);
      blot(X,Y,6,['rgba(30,25,15,.15)','rgba(255,240,200,.08)'],2,7);}
    else if(x.mead){g.fillStyle='#55603b';g.fillRect(X,Y,P,P);blot(X,Y,18,['rgba(110,120,70,.35)','rgba(40,45,25,.3)','rgba(140,130,80,.2)'],2,6);}
    else if(x.wild){g.fillStyle=x.orch?'#4c5534':'#2f3526';g.fillRect(X,Y,P,P);blot(X,Y,20,['rgba(20,22,14,.4)','rgba(80,70,45,.3)','rgba(60,75,40,.3)'],2,8);
      if(x.orch){g.fillStyle='rgba(120,128,80,.35)';for(const o of [10,34])g.fillRect(X,Y+o,P,5);}}
    else if(x.fy||x.logs){g.fillStyle=x.logs?'#6e5c45':'#76695a';g.fillRect(X,Y,P,P);blot(X,Y,12,['rgba(40,32,22,.25)','rgba(150,135,110,.2)'],2,7);}
    else if(x.grav){g.fillStyle='#77736a';g.fillRect(X,Y,P,P);for(let i=0;i<60;i++){g.fillStyle=R()<.5?'rgba(40,38,34,.35)':'rgba(190,185,170,.3)';g.fillRect(X+R()*P,Y+R()*P,1.5,1.5);}}
    else if(x.t==='road'&&(x.dirt||x.rural)){// 시골길: 풀·흙 길섶 위에 좁은 길. 이웃 길 쪽으로만 팔을 뻗는다
      const vc=x.rural?'#5b5a46':'#55603b';g.fillStyle=vc;g.fillRect(X,Y,P,P);blot(X,Y,8,['rgba(110,120,70,.3)','rgba(60,50,35,.3)'],2,6);
      const w=Math.round(P*(x.rural?.56:.42)),o=(P-w)/2,rc=(a,b)=>{const y=at(r+a,c+b);return !!y&&(y.t==='road'||y.sq||y.lm||y.site);};
      const col=x.rural?'#3d3e3f':'#76684f';g.fillStyle=col;g.fillRect(X+o,Y+o,w,w);
      if(rc(-1,0))g.fillRect(X+o,Y,w,o+1);if(rc(1,0))g.fillRect(X+o,Y+o+w-1,w,o+1);if(rc(0,-1))g.fillRect(X,Y+o,o+1,w);if(rc(0,1))g.fillRect(X+o+w-1,Y+o,o+1,w);
      if(x.dirt){// 바퀴 자국: 길이 뻗은 팔에만, 가운데 풀띠를 사이에 두고 두 줄 (철길처럼 칸을 가로지르지 않게)
        g.fillStyle='rgba(95,120,60,.35)';g.fillRect(X+o+w*.4,Y+o+w*.4,w*.2,w*.2);
        const rut=(x0,y0,x1,y1)=>{g.fillStyle='rgba(58,46,34,.16)';g.fillRect(Math.min(x0,x1),Math.min(y0,y1),Math.abs(x1-x0)||3,Math.abs(y1-y0)||3);};
        const a1=o+w*.27,a2=o+w*.73-3,cx0=X+o,cx1=X+o+w,cy0=Y+o,cy1=Y+o+w;
        if(rc(-1,0)){rut(X+a1,Y,X+a1,cy1-w*.3);rut(X+a2,Y,X+a2,cy1-w*.3);}if(rc(1,0)){rut(X+a1,cy0+w*.3,X+a1,Y+P);rut(X+a2,cy0+w*.3,X+a2,Y+P);}
        if(rc(0,-1)){rut(X,Y+a1,cx1-w*.3,Y+a1);rut(X,Y+a2,cx1-w*.3,Y+a2);}if(rc(0,1)){rut(cx0+w*.3,Y+a1,X+P,Y+a1);rut(cx0+w*.3,Y+a2,X+P,Y+a2);}}
      else if(x.ro==='h'||x.ro==='v'){g.fillStyle='rgba(225,220,200,.55)';for(const q of [6,30])x.ro==='h'?g.fillRect(X+q,Y+P/2-1,12,2):g.fillRect(X+P/2-1,Y+q,2,12);}
      if(x.dirt){for(let i=0;i<22;i++){const e=R()<.5,t=R()*P,sd=R()<.5?o:o+w;g.fillStyle=R()<.6?'rgba(85,96,59,.55)':'rgba(118,104,79,.5)';g.beginPath();
          const h=(rc(0,-1)||rc(0,1)),v=(rc(-1,0)||rc(1,0));if(h&&(e||!v))g.arc(X+t,Y+sd+(R()-.5)*3,1.5+R()*2.5,0,7);else if(v)g.arc(X+sd+(R()-.5)*3,Y+t,1.5+R()*2.5,0,7);g.fill();}}
      else blot(X,Y,4,['rgba(15,15,15,.25)'],2,5);}
    else if(x.sea){g.fillStyle='#16242c';g.fillRect(X,Y,P,P);}
    else if(x.quay){g.fillStyle='#878379';g.fillRect(X,Y,P,P);g.fillStyle='rgba(0,0,0,.14)';for(let i=0;i<=P;i+=16){g.fillRect(X+i,Y,1,P);g.fillRect(X,Y+i,P,1);}
      for(const [a,b] of BM_NB){const y=at(r+a,c+b);if(!y||!y.sea)continue;g.fillStyle='rgba(214,186,96,.85)';if(a)g.fillRect(X,a<0?Y+6:Y+P-9,P,3);else g.fillRect(b<0?X+6:X+P-9,Y,3,P);}
      blot(X,Y,4,['rgba(30,26,22,.22)'],3,8);}
    else if(x.pier){g.fillStyle='#6a5a48';g.fillRect(X,Y,P,P);g.fillStyle='rgba(30,24,18,.4)';const ns=(at(r-1,c)&&at(r-1,c).pier)||(at(r+1,c)&&at(r+1,c).pier)||(at(r-1,c)&&at(r-1,c).quay)||(at(r+1,c)&&at(r+1,c).quay);
      for(let i=0;i<P;i+=5)ns?g.fillRect(X,Y+i,P,1):g.fillRect(X+i,Y,1,P);}
    else if(x.cy){g.fillStyle='#4b4c4c';g.fillRect(X,Y,P,P);g.fillStyle='rgba(230,226,210,.5)';x.cd==='h'?(g.fillRect(X,Y+1,P,1),g.fillRect(X,Y+P-2,P,1)):(g.fillRect(X+1,Y,1,P),g.fillRect(X+P-2,Y,1,P));blot(X,Y,5,['rgba(0,0,0,.2)'],2,6);}}
  // 기후
  if(cl==='temp')return;
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=M[r][c],X=c*P,Y=r*P;if(x.sea||x.rv)continue;
    if(cl==='winter'){
      if(x.t==='water'){g.fillStyle='rgba(170,190,200,.85)';g.fillRect(X,Y,P,P);continue;}   // 언 연못
      if(x.t==='road'){g.fillStyle='rgba(220,226,232,.3)';g.fillRect(X,Y,P,P);g.fillStyle='rgba(236,240,243,.92)';   // 길: 눈이 녹은 바퀴 자국, 가장자리에 치운 눈
        for(const [a,b] of BM_NB){const y=at(r+a,c+b);if(y&&y.t==='road')continue;if(a)g.fillRect(X,a<0?Y:Y+P-7,P,7);else g.fillRect(b<0?X:X+P-7,Y,7,P);}
        if(x.dirt||x.rural){g.fillStyle='rgba(230,234,238,.8)';g.fillRect(X,Y,P,P);along(X,Y,x.ro,P*.36,4,'rgba(90,80,70,.45)');along(X,Y,x.ro,P*.58,4,'rgba(90,80,70,.45)');}
        continue;}
      g.fillStyle='rgba(228,232,236,.88)';g.fillRect(X,Y,P,P);blot(X,Y,8,['rgba(165,176,186,.25)','rgba(255,255,255,.35)'],3,9);
      if(x.crop)along(X,Y,x.cd,P*.5,3,'rgba(120,110,90,.25)');
      if(x.wild)blot(X,Y,6,['rgba(60,66,56,.25)'],2,6);}
    else if(cl==='desert'){
      if(x.t==='water')continue;
      if(x.t==='road'){g.fillStyle='rgba(190,165,120,.2)';g.fillRect(X,Y,P,P);for(let i=0;i<30;i++){g.fillStyle='rgba(205,180,135,.35)';g.fillRect(X+R()*P,Y+R()*P,2,1);}continue;}
      if(x.t==='park'){g.fillStyle='rgba(178,154,110,.85)';g.fillRect(X,Y,P,P);blot(X,Y,10,['rgba(90,90,55,.45)','rgba(120,100,70,.3)'],1.5,4);continue;}
      g.fillStyle='rgba(196,172,128,.38)';g.fillRect(X,Y,P,P);}
    else if(cl==='autumn'){if(x.t==='park'||x.mead||x.crop===3)blot(X,Y,14,['rgba(170,90,40,.35)','rgba(190,140,50,.3)','rgba(120,70,40,.3)'],2,6);
      else if(x.t==='road'&&R()<.3)blot(X,Y,4,['rgba(150,90,40,.3)'],1.5,4);}}}

/* ---------- 지면 그룹 ---------- */
function bmMats(){if(V3.bmM)return V3.bmM;const T=V3.T;
  const M={pine:new T.MeshStandardMaterial({color:'#ffffff',roughness:1,flatShading:true}),sea:new T.MeshStandardMaterial({color:'#4a6470',roughness:.3,metalness:.15}),
    conc:new T.MeshStandardMaterial({color:'#8f8a80',roughness:1}),deck:new T.MeshStandardMaterial({color:'#6b5843',roughness:.9}),
    paint:new T.MeshStandardMaterial({color:'#ffffff',roughness:.6,metalness:.3}),hay:new T.MeshStandardMaterial({color:'#ffffff',roughness:1}),
    log:new T.MeshStandardMaterial({color:'#7a6046',roughness:1}),hedge:new T.MeshStandardMaterial({color:'#ffffff',roughness:1,flatShading:true})};
  for(const k in M)v3FowMat(M[k]);V3.bmM=M;return M;}
function bmMerge(parts){const T=V3.T;let n=0;const ps=parts.map(g=>g.index?g.toNonIndexed():g);for(const g of ps)n+=g.attributes.position.count;const P=new Float32Array(n*3);let o=0;
  for(const g of ps){P.set(g.attributes.position.array,o);o+=g.attributes.position.array.length;g.dispose();}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(P,3));geo.computeVertexNormals();return geo;}
function bmGeos(){if(V3.bmG)return V3.bmG;const T=V3.T;const G3={};
  G3.pine=bmMerge([new T.CylinderGeometry(.016,.022,.16,5).translate(0,.08,0),new T.ConeGeometry(.17,.42,7).translate(0,.33,0),new T.ConeGeometry(.12,.32,7).translate(0,.56,0)]);
  G3.hedge=new T.BoxGeometry(1,.3,.17).translate(0,.15,0);G3.tile=new T.PlaneGeometry(1,1).rotateX(-Math.PI/2);
  G3.bale=new T.CylinderGeometry(.05,.05,.09,8).rotateZ(Math.PI/2).translate(0,.05,0);G3.cont=new T.BoxGeometry(.94,.27,.2).translate(0,.135,0);
  G3.log=new T.CylinderGeometry(.025,.025,.42,6).rotateZ(Math.PI/2);
  {const s=new T.Shape();s.moveTo(-.5,-.5);s.lineTo(.3,-.5);s.lineTo(.5,0);s.lineTo(.3,.5);s.lineTo(-.5,.5);s.closePath();   // 배 몸통(위에서 본 모양) 길이 1 · 폭 1
    G3.hull=new T.ExtrudeGeometry(s,{depth:.22,bevelEnabled:false}).rotateX(Math.PI/2).translate(0,.2,0);}
  G3.box=new T.BoxGeometry(1,1,1);G3.cyl=new T.CylinderGeometry(.5,.5,1,8);
  V3.bmG=G3;return G3;}
// 소품 기준 좌표계(앞 = +x, ry만큼 돈다)의 한 점
const bmAt=(p,lx,ly,lz,o)=>{const cs=Math.cos(p.ry||0),sn=Math.sin(p.ry||0);return Object.assign({x:p.x+lx*cs+lz*sn,y:ly,z:p.z-lx*sn+lz*cs,ry:p.ry||0},o||{});};
{const _bw=v3BuildWorld;v3BuildWorld=function(){bmClimeApply();_bw();if(!G||G.camp)return;try{bmBuildWorld(V3.G.world);}catch(e){console.error(e);}};}
{const _bc=v3BuildCity;v3BuildCity=function(){bmClimeApply();_bc();if(!G||G.camp)return;try{bmCityTint();}catch(e){console.error(e);}};}
function bmBuildWorld(g){const T=V3.T,pm=v3PropMats(),M3=bmMats(),G3=bmGeos(),cl=bmClime();const M=G.map;
  const pal=(a,k,s)=>a[Math.floor(v3Hash(k,s)*a.length)];
  // 연못: 겨울엔 언 얼음
  if(!pm.water.userData.c0)pm.water.userData.c0=pm.water.color.getHex();pm.water.color.setHex(cl==='winter'?0x9fb2bb:pm.water.userData.c0);pm.water.roughness=cl==='winter'?.35:.08;
  // 나뭇잎 색: 가을 단풍, 겨울 눈, 사막 마른 잎
  const LF=BM_LEAF[cl];if(LF)for(const o of g.children)if(o.isInstancedMesh&&o.material===pm.leaf){const c=new T.Color();for(let i=0;i<o.count;i++)o.setColorAt(i,c.set(pal(LF,i,7)));if(o.instanceColor)o.instanceColor.needsUpdate=true;}
  // 바깥 땅
  for(const o of g.children)if(o.isMesh&&o.geometry.parameters&&o.geometry.parameters.width===N+120){const L=G.feat.layout;
    o.material.color.set(cl==='winter'?'#c4c9cd':cl==='desert'?'#a08a66':L==='forest'?'#2f3526':L==='country'?'#4f5636':'#3a3936');}
  const pines=[],leafs=[],sea=[],edge=[],deck=[];
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=M[r][c],k=key(r,c),cx=c+.5,cz=r+.5;
    if(x.t==='park'&&x.wild&&!x.orch&&typeof natWildTrees!=='function'){const n=3+(v3Hash(k,801)<.4?1:0);for(let i=0;i<n;i++){const px=cx+(v3Hash(k,810+i)-.5)*.84,pz=cz+(v3Hash(k,815+i)-.5)*.84,s=.75+v3Hash(k,820+i)*.6;
        if(v3Hash(k,830+i)<(cl==='autumn'?.35:.15))leafs.push({x:px,y:0,z:pz,s:s*.9,ry:v3Hash(k,840+i)*6.28,col:pal(LF||['#6e6a4c','#7a7353','#5f5d43'],k,850+i),k});
        else pines.push({x:px,y:0,z:pz,s,ry:v3Hash(k,860+i)*6.28,col:pal(BM_PINE[cl]||BM_PINE.temp,k,870+i),k});}}
    if(x.orch)for(const [a,b] of [[-.25,-.25],[-.25,.25],[.25,-.25],[.25,.25]])leafs.push({x:cx+a,y:0,z:cz+b,s:.45+v3Hash(k,880+a*4+b*8+9)*.15,ry:v3Hash(k,890)*6.28,col:pal(LF||['#5f6b3c','#6e7a44','#56603a'],k,895+a*4+b*8+9),k});
    if(x.sea){sea.push({x:cx,y:wLv()+.005,z:cz});
      for(const [a,b] of BM_NB){const y=inb(r+a,c+b)?M[r+a][c+b]:null;if(!y||y.sea||y.t==='water')continue;edge.push({x:cx+b*.5,y:.03,z:cz+a*.5,sx:b?.08:1.04,sy:.06,sz:a?.08:1.04});}}
    if(x.pier){deck.push({x:cx,y:.035,z:cz,sx:.98,sy:.05,sz:.98});}}
  v3Inst(g,G3.pine,M3.pine,pines,{keys:1});v3Inst(g,v3LeafTreeG(),pm.leaf,leafs,{keys:1});
  v3Inst(g,G3.tile,M3.sea,sea,{noShadow:1});v3Inst(g,G3.box,M3.conc,edge);v3Inst(g,G3.box,M3.deck,deck);
  // 소품
  const hedge=[],htree=[],bale=[],cont=[],paint=[],hull=[],logs=[];const P=G.props||[];
  for(const p of P){
    if(p.k==='bocage'){hedge.push({x:p.x,y:0,z:p.z,ry:p.ry,col:pal(BM_HEDGE[cl]||BM_HEDGE.temp,Math.floor(p.x*97+p.z*13),3)});
      if(p.tr)htree.push({x:p.x,y:0,z:p.z,s:.55+((p.x*7+p.z*3)%1)*.2,ry:p.x+p.z,col:pal(LF||['#5f6b3c','#4f5a34','#66703f'],Math.floor(p.x*31+p.z*7),5)});}
    else if(p.k==='bale')bale.push({x:p.x,y:0,z:p.z,ry:p.ry,col:cl==='winter'?'#dcdcd4':'#c2a35c'});
    else if(p.k==='cont')for(let i=0;i<p.n;i++)cont.push({x:p.x,y:i*.275,z:p.z,ry:p.ry,col:i%2?p.c2:p.col});
    else if(p.k==='logs'){for(const [lz,ly] of [[-.05,.025],[0,.025],[.05,.025],[-.025,.068],[.025,.068],[0,.11]])logs.push(bmAt(p,0,ly,lz));}
    else if(p.k==='crane'){const col=p.col;   // 안벽 갠트리 크레인(STS): 레일 위 네 다리, 바다 쪽으로 길게 뻗은 붐, 꼭대기 A자 틀
      for(const a of [-.2,.42])for(const b of [-.3,.3])paint.push(bmAt(p,a,.85,b,{sx:.05,sy:1.7,sz:.05,col}));
      for(const a of [-.2,.42])paint.push(bmAt(p,a,1.72,0,{sx:.06,sy:.08,sz:.66,col}));
      for(const b of [-.3,.3])paint.push(bmAt(p,.11,.55,b,{sx:.66,sy:.05,sz:.04,col}));
      paint.push(bmAt(p,.55,1.86,0,{sx:3.0,sy:.09,sz:.14,col}));                        // 붐(뒤로 .95, 바다 쪽으로 2칸)
      paint.push(bmAt(p,.1,1.98,0,{sx:.34,sy:.16,sz:.3,col:'#d8d4c8'}));                // 기계실
      paint.push(bmAt(p,.1,2.3,0,{sx:.06,sy:.6,sz:.3,col}));paint.push(bmAt(p,-.75,1.95,0,{sx:.2,sy:.14,sz:.18,col:'#4a4c4c'}));
      paint.push(bmAt(p,1.45,1.78,0,{sx:.16,sy:.08,sz:.18,col:'#3a3c3e'}));paint.push(bmAt(p,1.45,1.15,0,{sx:.012,sy:1.2,sz:.012,col:'#2a2a2a'}));
      paint.push(bmAt(p,1.45,.58,0,{sx:.26,sy:.04,sz:.08,col:'#3a3c3e'}));}   // 스프레더
    else if(p.k==='ship'){const col=p.burnt?'#1d1b19':p.col,L=p.len,big=L>=3.4,W=big?.86:.7,wl=wLv(),n0=paint.length;hull.push({x:p.x,y:wl,z:p.z,ry:p.ry,sx:L,sy:1,sz:W,col});
      const bx=-L/2+(big?.45:.25),bh=big?.5:.22;   // 선교(뒤쪽 하얀 탑)
      paint.push(bmAt(p,bx,.2+bh/2,0,{sx:.24,sy:bh,sz:W*.8,col:p.burnt?'#2a2724':'#e0ddd4'}));paint.push(bmAt(p,bx,.21+bh,0,{sx:.18,sy:.05,sz:W*.95,col:'#3a3c3e'}));
      paint.push(bmAt(p,bx-.2,.3+bh*.5,0,{sx:.09,sy:.2,sz:.09,col:p.burnt?'#111':'#9a3a2a'}));
      if(p.cargo){const hs=Math.floor(v3Hash(Math.floor(p.x*13+p.z*7),99)*3);const lanes=big?[-.27,-.09,.09,.27]:[-.13,.13];
        for(let s=bx+.3,i=0;s<L/2-.35;s+=.31,i++)for(let li=0;li<lanes.length;li++){const n=1+((i+li+hs)%3===0?0:1)+(big&&(i+hs)%4<2?1:0);
          for(let h=0;h<n;h++)paint.push(bmAt(p,s,.26+h*.12,lanes[li],{sx:.29,sy:.11,sz:big?.17:.24,col:CONT_COLS[Math.floor(v3Hash(Math.floor(p.x*13+p.z*7),i*8+li*2+h)*CONT_COLS.length)]}));}
      for(let i=n0;i<paint.length;i++)paint[i].y+=wl;}}}
  v3Inst(g,G3.hedge,M3.hedge,hedge);v3Inst(g,v3LeafTreeG(),pm.leaf,htree);v3Inst(g,G3.bale,M3.hay,bale);v3Inst(g,G3.cont,M3.paint,cont);
  v3Inst(g,G3.box,M3.paint,paint);v3Inst(g,G3.hull,M3.paint,hull);v3Inst(g,G3.log,M3.log,logs);}
/* 겨울: 평지붕·난간 위에 눈 */
function bmCityTint(){const W=V3.M.walls||[V3.M.wall];for(const m of W){if(m.userData.c0==null)m.userData.c0=m.color.getHex();m.color.setHex(bmClime()==='desert'?0xf0dcb4:m.userData.c0);}   // 사막: 모래빛 외벽
  if(bmClime()!=='winter')return;const m=V3.cityM&&V3.cityM.r;if(!m)return;const a=m.geometry.attributes.color;if(!a)return;
  for(let i=0;i<a.count;i++){a.setXYZ(i,a.getX(i)+(.9-a.getX(i))*.8,a.getY(i)+(.92-a.getY(i))*.8,a.getZ(i)+(.94-a.getZ(i))*.8);}a.needsUpdate=true;}
/* 겨울 비 → 눈 */
{const _ef=v3EnvFrame;v3EnvFrame=function(now,dt){_ef(now,dt);if(bmClime()==='winter'&&V3.rainObj){V3.rainObj.material.color.set('#f2f4f6');V3.rainObj.material.opacity=Math.min(.75,V3.rainObj.material.opacity*1.8);}};}
