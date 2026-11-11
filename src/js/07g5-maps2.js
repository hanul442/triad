/* ===================== 지도 더 늘리기: 화면 (03d-maps2) =====================
   - 땅 그림: 활주로(콘크리트 판·흰 중심선·끝 표시), 유도로(노란 중심선), 계류장, 돌길, 성벽 기초, 기름 탱크 방유턱, 발전소 마당, 화물 인입선, 막다른 길 돌림 광장.
   - 소품: 성벽(총안 있는 돌벽과 성벽 길), 기름 탱크, 냉각탑, 굴뚝, 주기한 비행기, 운하 가로수, 운하 다리 난간.
   기후 색(눈·모래)은 07g2가 칸 위에 덮는다. */
{const _tt=v3TerrTex;v3TerrTex=function(g,P){_tt(g,P);if(!G||G.camp||!G.feat||!M2_LAYOUTS.includes(G.feat.layout))return;try{m2GroundTex(g,P);}catch(e){console.error(e);}};}
function m2GroundTex(g,P){const R=mulberry(((G.seed|0)^0x3a2f)>>>0);const M=G.map,at=(r,c)=>inb(r,c)?M[r][c]:null;const cl=bmClime();
  const blot=(X,Y,n,cols,r0,r1)=>{for(let i=0;i<n;i++){g.fillStyle=cols[Math.floor(R()*cols.length)];g.beginPath();g.arc(X+R()*P,Y+R()*P,r0+R()*(r1-r0),0,7);g.fill();}};
  const same=(r,c,f)=>{const y=at(r,c);return !!y&&!!y[f];};
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=M[r][c],X=c*P,Y=r*P;
    if(x.rwy){// 활주로: 콘크리트 판 이음매, 가장자리 흰 선, 가운데 흰 점선, 끝은 피아노 건반 표시
      g.fillStyle='#8f8d86';g.fillRect(X,Y,P,P);g.fillStyle='rgba(0,0,0,.12)';for(let i=0;i<=P;i+=P/2){g.fillRect(X+i,Y,1,P);g.fillRect(X,Y+i,P,1);}
      blot(X,Y,5,['rgba(40,38,34,.18)','rgba(25,25,25,.25)'],2,7);
      g.fillStyle='rgba(240,238,230,.85)';const h=x.ro==='h',v=x.ro==='v';
      if(h){if(!same(r-1,c,'rwy'))g.fillRect(X,Y+3,P,2);if(!same(r+1,c,'rwy'))g.fillRect(X,Y+P-5,P,2);
        if(!same(r-1,c,'rwy')||!same(r+1,c,'rwy')){const top=!same(r-1,c,'rwy');if(!x.thr)for(const o of [4,28])g.fillRect(X+o,top?Y+P-2:Y,14,2);}}
      if(v){if(!same(r,c-1,'rwy'))g.fillRect(X+3,Y,2,P);if(!same(r,c+1,'rwy'))g.fillRect(X+P-5,Y,2,P);
        if(!same(r,c-1,'rwy')||!same(r,c+1,'rwy')){const lf=!same(r,c-1,'rwy');if(!x.thr)for(const o of [4,28])g.fillRect(lf?X+P-2:X,Y+o,2,14);}}
      if(x.thr){for(let i=0;i<4;i++)h?g.fillRect(X+8,Y+6+i*10,P-16,5):g.fillRect(X+6+i*10,Y+8,5,P-16);}
      // 바퀴 자국(검은 고무)
      if(!x.thr)for(let i=0;i<3;i++){g.fillStyle='rgba(20,20,20,.18)';const t=R()*P;h?g.fillRect(X,Y+P*.2+R()*P*.6,P,2):g.fillRect(X+P*.2+R()*P*.6,Y,2,P);}
      continue;}
    if(x.twy){g.fillStyle='#4a4b4d';g.fillRect(X,Y,P,P);blot(X,Y,5,['rgba(20,20,20,.2)','rgba(120,118,110,.12)'],2,6);
      g.fillStyle='rgba(222,184,52,.9)';const T=(a,b)=>{const y=at(r+a,c+b);return !!y&&(y.twy||y.rwy||y.apr);};
      if(T(0,-1)||T(0,1)){g.fillRect(T(0,-1)?X:X+P/2,Y+P/2-1.5,T(0,-1)&&T(0,1)?P:P/2,3);}if(T(-1,0)||T(1,0)){g.fillRect(X+P/2-1.5,T(-1,0)?Y:Y+P/2,3,T(-1,0)&&T(1,0)?P:P/2);}
      g.fillStyle='rgba(235,232,220,.5)';if(!T(-1,0)&&x.ro!=='v')g.fillRect(X,Y+2,P,1.5);if(!T(1,0)&&x.ro!=='v')g.fillRect(X,Y+P-3.5,P,1.5);if(!T(0,-1)&&x.ro!=='h')g.fillRect(X+2,Y,1.5,P);if(!T(0,1)&&x.ro!=='h')g.fillRect(X+P-3.5,Y,1.5,P);
      continue;}
    if(x.apr){g.fillStyle='#9a978e';g.fillRect(X,Y,P,P);g.fillStyle='rgba(0,0,0,.13)';for(let i=0;i<=P;i+=P/3){g.fillRect(X+i,Y,1,P);g.fillRect(X,Y+i,P,1);}
      blot(X,Y,6,['rgba(30,28,24,.22)','rgba(60,50,40,.16)'],2,8);g.fillStyle='rgba(222,184,52,.75)';g.fillRect(X+P/2-1,Y+4,2,P-8);g.beginPath();g.arc(X+P/2,Y+P/2,P*.32,0,7);g.strokeStyle='rgba(222,184,52,.6)';g.lineWidth=1.5;g.stroke();continue;}
    if(x.pwr||x.tkf){g.fillStyle=x.tkf?'#7b776c':'#85837c';g.fillRect(X,Y,P,P);
      if(x.tkf){for(let i=0;i<50;i++){g.fillStyle=R()<.5?'rgba(40,38,34,.3)':'rgba(190,185,170,.25)';g.fillRect(X+R()*P,Y+R()*P,1.5,1.5);}
        g.strokeStyle='rgba(60,56,48,.7)';g.lineWidth=3;g.strokeRect(X+3,Y+3,P-6,P-6);g.beginPath();g.arc(X+P/2,Y+P/2,P*.4,0,7);g.fillStyle='rgba(40,36,30,.35)';g.fill();}
      else{g.fillStyle='rgba(0,0,0,.1)';for(let i=0;i<=P;i+=P/2){g.fillRect(X+i,Y,1,P);g.fillRect(X,Y+i,P,1);}blot(X,Y,4,['rgba(30,28,24,.2)'],2,6);}
      continue;}
    if(x.spur){// 화물 인입선: 자갈 바닥, 침목, 레일 두 줄
      g.fillStyle='#5d5852';g.fillRect(X,Y,P,P);for(let i=0;i<40;i++){g.fillStyle=R()<.5?'rgba(30,28,26,.35)':'rgba(150,145,135,.3)';g.fillRect(X+R()*P,Y+R()*P,2,2);}
      const h=x.ro!=='v';g.fillStyle='#4a3a2c';for(let i=2;i<P;i+=6)h?g.fillRect(X+i,Y+P*.28,3,P*.44):g.fillRect(X+P*.28,Y+i,P*.44,3);
      g.fillStyle='#8a8a88';for(const o of [P*.36,P*.62])h?g.fillRect(X,Y+o,P,2):g.fillRect(X+o,Y,2,P);continue;}
    if(x.cwl){g.fillStyle='#625c52';g.fillRect(X,Y,P,P);blot(X,Y,10,['rgba(30,28,24,.25)','rgba(160,150,130,.18)'],2,6);continue;}
    if(x.cds&&x.t==='plaza'){// 막다른 길 돌림 광장: 둥근 아스팔트
      g.fillStyle='#55603b';g.fillRect(X,Y,P,P);g.fillStyle='#38393a';g.beginPath();g.arc(X+P/2,Y+P/2,P*.48,0,7);g.fill();g.fillStyle='#4f5a37';g.beginPath();g.arc(X+P/2,Y+P/2,P*.14,0,7);g.fill();continue;}
    if(x.cob){// 돌길·광장 포석: 작은 돌을 줄지어
      const base=x.t==='road'?'#6a6358':'#7a7264';g.fillStyle=base;g.fillRect(X,Y,P,P);
      for(let j=0;j<P;j+=5)for(let i=(j/5)%2?0:3;i<P;i+=6){g.fillStyle=`rgba(${R()<.5?'25,22,18':'170,160,140'},${.12+R()*.16})`;g.fillRect(X+i,Y+j,5,4);}
      if(x.t==='road'&&!x.al){g.fillStyle='rgba(60,56,50,.5)';const rc=(a,b)=>{const y=at(r+a,c+b);return !!y&&(y.t==='road'||y.sq);};   // 가운데 배수로
        if(rc(0,-1)||rc(0,1))g.fillRect(X,Y+P/2-1,P,2);if(rc(-1,0)||rc(1,0))g.fillRect(X+P/2-1,Y,2,P);}
      continue;}}}

/* ---------- 소품 ---------- */
function m2Mats(){if(V3.m2M)return V3.m2M;const T=V3.T;
  const M={stone:new T.MeshStandardMaterial({color:'#ffffff',roughness:.95}),steel:new T.MeshStandardMaterial({color:'#ffffff',roughness:.45,metalness:.35}),
    conc:new T.MeshStandardMaterial({color:'#b9b6ae',roughness:.95,side:T.DoubleSide}),plane:new T.MeshStandardMaterial({color:'#ffffff',roughness:.55,metalness:.3})};
  for(const k in M)v3FowMat(M[k]);V3.m2M=M;return M;}
function m2Geos(){if(V3.m2G)return V3.m2G;const T=V3.T;const G3={};
  G3.box=new T.BoxGeometry(1,1,1);G3.cyl=new T.CylinderGeometry(.5,.5,1,16);G3.cone=new T.ConeGeometry(.5,1,16);
  // 냉각탑: 쌍곡면(허리가 잘록한 콘크리트 통)
  const pts=[[1,0],[.92,.4],[.8,1],[.7,1.7],[.66,2.2],[.68,2.6],[.74,3]].map(([x,y])=>new T.Vector2(x*.95,y));G3.ctw=new T.LatheGeometry(pts,24);
  G3.stack=new T.CylinderGeometry(.09,.15,1,12).translate(0,.5,0);
  V3.m2G=G3;return G3;}
{const _bw=v3BuildWorld;v3BuildWorld=function(){_bw();if(!G||G.camp||!G.feat||!M2_LAYOUTS.includes(G.feat.layout))return;try{m2BuildWorld(V3.G.world);}catch(e){console.error(e);}};}
function m2BuildWorld(g){const T=V3.T,M3=m2Mats(),G3=m2Geos(),pm=v3PropMats(),cl=bmClime();
  const stone=[],steel=[],tankC=[],tankTop=[],ctw=[],stk=[],plane=[],trees=[];
  const snow=cl==='winter';const WALL=cl==='desert'?'#c4ad86':'#8d8576',WTOP=snow?'#e6e9ec':cl==='desert'?'#b49c76':'#7a7366';
  for(const p of G.props||[]){const cs=Math.cos(p.ry||0),sn=Math.sin(p.ry||0);
    if(p.k==='cwall'){const H=.68,W=.22;stone.push({x:p.x,y:H/2,z:p.z,ry:p.ry,sx:p.len,sy:H,sz:W,col:WALL});stone.push({x:p.x,y:H+.005,z:p.z,ry:p.ry,sx:p.len,sy:.02,sz:W*.8,col:WTOP});
      // 총안(바깥 쪽 성가퀴): 성 가운데에서 먼 쪽 가장자리
      const nx=-sn,nz=-cs;const out=((p.x-N/2)*nx+(p.z-N/2)*nz)>0?1:-1;const n=Math.max(1,Math.round(p.len/.14));
      for(let i=0;i<n;i++){const t=(i+.5)/n-.5;stone.push({x:p.x+cs*t*p.len+nx*out*W*.4,y:H+.06,z:p.z-sn*t*p.len+nz*out*W*.4,ry:p.ry,sx:p.len/n*.55,sy:.12,sz:.05,col:WALL});}
      stone.push({x:p.x+nx*out*W*.5,y:.05,z:p.z+nz*out*W*.5,ry:p.ry,sx:p.len,sy:.1,sz:.08,col:'#6f685c'});}   // 비탈진 밑동
    else if(p.k==='otank'){const col=p.burnt?'#2a2724':p.col;tankC.push({x:p.x,y:p.h/2,z:p.z,sx:.7,sy:p.h,sz:.7,col});tankTop.push({x:p.x,y:p.h+.04,z:p.z,sx:.72,sy:.08,sz:.72,col:p.burnt?'#1e1c1a':'#a8aaa6'});
      steel.push({x:p.x+.35,y:p.h/2,z:p.z,sx:.02,sy:p.h,sz:.05,col:'#4a4c4c'});   // 사다리
      if(!p.burnt)steel.push({x:p.x,y:p.h*.55,z:p.z-.351,sx:.3,sy:.05,sz:.01,col:'#9a3a2a'});}
    else if(p.k==='ctower'){ctw.push({x:p.x,y:0,z:p.z});}
    else if(p.k==='stack'){stk.push({x:p.x,y:0,z:p.z,sx:1,sy:5,sz:1,col:'#a8a59c'});for(const y of [4.3,4.75])steel.push({x:p.x,y,z:p.z,sx:.21,sy:.22,sz:.21,col:'#b5402e'});}
    else if(p.k==='plane'){const big=p.big,L=big?1.5:.9,col=p.burnt?'#1f1d1b':p.col;const A=(lx,ly,lz,sx,sy,sz,c)=>plane.push({x:p.x+lx*cs+lz*sn,y:ly,z:p.z-lx*sn+lz*cs,ry:p.ry,sx,sy,sz,col:c||col});
      A(0,big?.2:.12,0,L,big?.2:.11,big?.2:.11);A(L*.5,big?.2:.12,0,L*.08,big?.14:.07,big?.14:.07,'#2a3036');                       // 동체·기수
      A(big?.05:-.05,big?.22:.11,0,big?.32:.24,.025,big?1.7:.75);                                                                   // 주익
      A(-L*.44,big?.26:.15,0,.12,.02,big?.6:.3);A(-L*.44,big?.38:.21,0,.14,big?.26:.14,.02);                                         // 꼬리날개
      if(big)for(const s of [-.4,-.7,.4,.7])A(.12,.15,s,.22,.08,.08,'#3a3e42');                                                      // 엔진 넷
      if(!p.burnt)A(L*.3,big?.27:.17,0,L*.16,.04,big?.12:.08,'#20282d');}                                                         // 조종석 창
    else if(p.k==='ctree'){trees.push({x:p.x,y:0,z:p.z,s:p.s,ry:p.ry,col:(BM_LEAF[cl]||['#5f6b3c','#4f5a34','#66703f'])[Math.floor((p.x*7+p.z*13)%3)]});}
    else if(p.k==='rail2'){stone.push({x:p.x,y:.05,z:p.z,ry:p.ry,sx:1,sy:.1,sz:.05,col:snow?'#d8dcdf':'#8a8276'});}}
  v3Inst(g,G3.box,M3.stone,stone);v3Inst(g,G3.box,M3.steel,steel);v3Inst(g,G3.cyl,M3.steel,tankC);v3Inst(g,G3.cyl,M3.steel,tankTop);
  v3Inst(g,G3.ctw,M3.conc,ctw);v3Inst(g,G3.stack,M3.conc,stk);v3Inst(g,G3.box,M3.plane,plane);v3Inst(g,v3LeafTreeG(),pm.leaf,trees);}
