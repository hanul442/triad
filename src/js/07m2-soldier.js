/* ===================== 병사 모습: 실제 비율·장비·자세 =====================
   키 약 1.78m 사람을 미터 단위로 짓고 MU(1/12)로 줄인다. 관절(엉덩이·무릎·어깨·팔꿈치)은 점으로 정하고
   팔다리는 두 점을 잇는 토막으로 그린다(팔꿈치·무릎은 두 마디 IK로 계산).
   - 정규군(짝수 세력): 같은 위장복(0번 멀티캠 계열, 2번 디지털 녹색), 덮개 씌운 고컷 헬멧·야간투시경 거치대·귀마개,
     플레이트캐리어(앞 탄창 주머니 셋, 행정 주머니, 허리띠), 장갑, 무릎 보호대, 보안경.
   - 민병대(홀수 세력): 후드·재킷·청바지 위에 플레이트캐리어나 가슴 조끼, 야구모자·비니·맨머리·스카프, 일부만 위장 재킷.
   - 피아 식별: 양 어깨와 헬멧 위의 세력 색 테이프(위에서 내려다보는 카메라에서 보인다).
   - 총: M4(광학조준경)·AK(나무 개머리)·기관총(탄통·양각대)·저격총(긴 조준경·양각대)·유탄발사기 단 소총.
     대전차·대공·유도미사일은 쏠 때 어깨에 올리고, 걸을 때는 등에 멘다. 드론 조종수는 조종기를 들고 고글을 쓴다.
   - 자세(형상을 미리 지어 두고 바꿔 낀다, 팔다리 따로 움직이지 않아 묶어 그리기에 그대로 들어간다):
     move 낮은 총 자세로 걷기, aim 서서 견착, kneel 무릎쏴, prone 엎드려쏴(팔꿈치를 땅에), reload 무릎 꿇고 탄창 교체,
     signal 한 팔 들어 수신호, carry 부상자를 어깨에 메고 걷기, down 누운 부상자, dead 쓰러진 시신.
     서 있는 자세(move·aim·signal·carry)만 다리 둘(legL/legR)을 따로 두어 걸음을 흔든다.
   - 위장무늬: 세력별 작은 무늬 그림(캔버스)을 위장복 부분에만 입힌다(정점 속성 camo). 다른 부분은 정점 색 그대로.
   - 묶어 그리기(07z-inst)와 맞추려고 세력·병종마다 모양 가짓수를 SOLV로 묶어 둔다. */
const SOLV={reg:4,mil:4};   // 07z-inst는 짝·홀 세력마다 병종당 8가지까지 묶는다(세력 둘씩 × 4)
const SOL_PAT=['mc','wd','dg','ds'];
const SOL_SKIN=['#c9a184','#b08466','#8a6248','#d5b195','#6e4b36','#a77b5c'];
const SOL_STAND={move:1,aim:1,signal:1,carry:1,point:1,leanL:1,leanR:1};
const SOL_POSES=['move','aim','kneel','prone','reload','signal','carry','down','dead','point','leanL','leanR','crawl','crawl2'];
/* 무기: sl 개머리 길이(견착점→손잡이), fh 앞손 위치(손잡이→총열 덮개) */
const SOL_GUN={m4:{sl:.3,fh:.3},ak:{sl:.32,fh:.3},gl:{sl:.3,fh:.27},mg:{sl:.36,fh:.4},dmr:{sl:.36,fh:.42}};

/* ---------- 위장무늬 그림 ---------- */
const SOL_CAMO={
  mc:{base:'#9b8b68',bl:[['#77704f',16,10,.55],['#5c6643',12,8,.45],['#6b5039',9,7,.35],['#b9a884',10,6,.3]],dk:'#3d3628'},
  wd:{base:'#727851',bl:[['#4d5b37',18,12,.6],['#5d4834',14,10,.5],['#222320',9,4,.35],['#a69c76',7,5,.2]]},
  dg:{base:'#646e4c',px:['#4a5638','#7d7d58','#353a2b','#59643f'],sz:4},
  ds:{base:'#b6a47d',bl:[['#917c5a',16,10,.55],['#6f5f45',10,7,.4],['#d0c19c',9,6,.3]]},
};
function solCamoTex(k){V3.solTex=V3.solTex||{};if(V3.solTex[k]!==undefined)return V3.solTex[k];
  let tex=null;try{if(typeof document==='undefined')throw 0;const S=128,cv=document.createElement('canvas');cv.width=cv.height=S;const x=cv.getContext('2d');
    const P=SOL_CAMO[k],r=mulberry(k.charCodeAt(0)*31+k.charCodeAt(1));x.fillStyle=P.base;x.fillRect(0,0,S,S);
    const blob=(cx,cy,rx,ry,a)=>{for(const ox of [-S,0,S])for(const oy of [-S,0,S]){x.beginPath();x.ellipse(cx+ox,cy+oy,rx,ry,a,0,Math.PI*2);x.fill();}};
    if(P.px){const z=P.sz;for(let i=0;i<S/z;i++)for(let j=0;j<S/z;j++){const v=r();if(v<.55)continue;x.fillStyle=P.px[Math.floor(r()*P.px.length)];
        const w=1+Math.floor(r()*3);x.fillRect(i*z,j*z,z*w,z);if(i*z+z*w>S)x.fillRect(i*z-S,j*z,z*w,z);}}
    else for(const [c,R,R2,dens] of P.bl){x.fillStyle=c;const n=Math.round(dens*60);for(let i=0;i<n;i++){const cx=r()*S,cy=r()*S;
        for(let j=0;j<3;j++)blob(cx+(r()-.5)*R,cy+(r()-.5)*R,R*(.4+r()*.6),R2*(.4+r()*.6),r()*3);}}
    if(P.dk){x.strokeStyle=P.dk;x.lineWidth=1.5;for(let i=0;i<14;i++){x.beginPath();let px=r()*S,py=r()*S;x.moveTo(px,py);for(let j=0;j<4;j++){px+=(r()-.5)*14;py+=(r()-.5)*14;x.lineTo(px,py);}x.stroke();}}
    const T=V3.T;tex=new T.CanvasTexture(cv);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=2;}catch(e){tex=null;}
  V3.solTex[k]=tex;return tex;}
/* 위장복 부분(camo=1)만 무늬를 곱한다 */
function solShader(m){m.onBeforeCompile=function(s,ren){const P=V3.T.Material.prototype.onBeforeCompile;if(P)P.call(this,s,ren);     // 지형 높이 훅(07g) 등 공통 훅을 먼저
  s.vertexShader='attribute float camo;\nvarying float vCamo;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCamo=camo;');
  s.fragmentShader='varying float vCamo;\n'+s.fragmentShader.replace('#include <map_fragment>','#ifdef USE_MAP\n diffuseColor.rgb*=mix(vec3(1.),texture2D(map,vMapUv).rgb,vCamo);\n#endif');};
  m.customProgramCacheKey=()=>'solcamo'+(V3.T.Material.prototype.customProgramCacheKey.call(m)||'');return m;}
/* 세력마다 재질 하나(무늬만 다르다). 시신은 먼지 낀 어두운 색 */
function solMat(n,dead){const id='sol'+(dead?'d':'')+n;if(V3.matc.has(id))return V3.matc.get(id);const T=V3.T;
  const m=solShader(new T.MeshStandardMaterial({vertexColors:true,roughness:.9,flatShading:true,map:solCamoTex(SOL_PAT[n%4]),color:dead?'#8f8a80':'#ffffff'}));
  V3.matc.set(id,m);return m;}

/* ---------- 짓는 도구 ---------- */
const solV=(x,y,z)=>new V3.T.Vector3(x,y,z);
/* 좌표틀: Y축을 정확히 두고 X를 그에 직교하게(몸통·머리) */
function solFrameY(o,xd,yd){const T=V3.T;const y=yd.clone().normalize();const x=xd.clone().sub(y.clone().multiplyScalar(xd.dot(y)));if(x.lengthSq()<1e-8)x.set(1,0,0);x.normalize();
  const z=new T.Vector3().crossVectors(x,y);return new T.Matrix4().makeBasis(x,y,z).setPosition(o);}
/* 좌표틀: X축(총열)을 정확히 두고 Y(위)를 그에 직교하게(무기) */
function solFrameX(o,xd,yd){const T=V3.T;const x=xd.clone().normalize();const y=yd.clone().sub(x.clone().multiplyScalar(yd.dot(x)));if(y.lengthSq()<1e-8)y.set(0,1,0);y.normalize();
  const z=new T.Vector3().crossVectors(x,y);return new T.Matrix4().makeBasis(x,y,z).setPosition(o);}
/* 두 마디 IK: 어깨 S → 손 H, 팔꿈치는 pole 쪽으로 굽는다 */
function solIK(S,H,L1,L2,pole){const d=H.clone().sub(S);const L=d.length()||1e-4;const dir=d.clone().divideScalar(L);const Lc=Math.min(L,L1+L2-.002);
  const a=(L1*L1-L2*L2+Lc*Lc)/(2*Lc),h=Math.sqrt(Math.max(0,L1*L1-a*a));const pp=pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir)));if(pp.lengthSq()<1e-8)pp.set(0,0,1);pp.normalize();
  return S.clone().add(dir.multiplyScalar(a)).add(pp.multiplyScalar(h));}
/* 부품 목록 P에 담는다. 부품: {g, M(미터 단위 행렬), c, cam} */
function solKit(P){const T=V3.T;const tmp=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler(),sc=new T.Vector3(1,1,1),up=new T.Vector3(0,1,0);
  const put=(F,g,c,cam,x,y,z,rx,ry,rz)=>{e.set(rx||0,ry||0,rz||0);q.setFromEuler(e);tmp.compose(solV(x||0,y||0,z||0),q,sc);P.push({g,M:F.clone().multiply(tmp),c,cam:cam?1:0});};
  const K={
    box:(F,w,h,d,x,y,z,c,cam,rx,ry,rz)=>put(F,new T.BoxGeometry(w,h,d),c,cam,x,y,z,rx,ry,rz),
    sph:(F,r,x,y,z,c,cam,sx,sy,sz,th)=>{const g=new T.SphereGeometry(r,7,th?3:5,0,Math.PI*2,0,th||Math.PI);if(sx)g.scale(sx,sy,sz);put(F,g,c,cam,x,y,z);},
    cyl:(F,r1,r2,h,x,y,z,c,cam,rx,ry,rz,n)=>put(F,new T.CylinderGeometry(r1,r2,h,Math.min(n||6,6),1,false),c,cam,x,y,z,rx,ry,rz),
    /* 두 점(월드, 미터)을 잇는 토막 */
    seg:(a,b,w,d,c,cam)=>{const v=b.clone().sub(a);const L=v.length();if(L<1e-4)return;q.setFromUnitVectors(up,v.clone().divideScalar(L));
      tmp.compose(a.clone().add(b).multiplyScalar(.5),q,sc);P.push({g:new T.BoxGeometry(w,L+w*.35,d),M:tmp.clone(),c,cam:cam?1:0});},
    /* 점에 놓는 상자, 축을 X 방향 d·위 u로 */
    at:(p,d,u,w,h,dd,c,cam)=>{P.push({g:new T.BoxGeometry(w,h,dd),M:solFrameX(p,d,u),c,cam:cam?1:0});},
  };return K;}
/* 합치기: 미터 → MU, 위장 UV(위치 투영)와 camo 속성 */
function solMerge(P){const T=V3.T;let nv=0;const gs=[];
  for(const p of P){const g=p.g.index?p.g.toNonIndexed():p.g;if(g!==p.g)p.g.dispose();g.applyMatrix4(p.M);gs.push([g,p]);nv+=g.attributes.position.count;}
  const pos=new Float32Array(nv*3),nor=new Float32Array(nv*3),col=new Float32Array(nv*3),uv=new Float32Array(nv*2),cam=new Float32Array(nv);const c=new T.Color();let o=0;
  for(const [g,p] of gs){const pa=g.attributes.position.array,na=g.attributes.normal.array,n=pa.length/3;c.set(p.c);
    for(let i=0;i<n;i++){const x=pa[i*3],y=pa[i*3+1],z=pa[i*3+2],j=o+i;pos[j*3]=x*MU;pos[j*3+1]=y*MU;pos[j*3+2]=z*MU;nor[j*3]=na[i*3];nor[j*3+1]=na[i*3+1];nor[j*3+2]=na[i*3+2];
      col[j*3]=c.r;col[j*3+1]=c.g;col[j*3+2]=c.b;uv[j*2]=(x*.8+z)*1.7;uv[j*2+1]=(y+x*.45)*1.7;cam[j]=p.cam;}
    o+=n;g.dispose();}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3));geo.setAttribute('normal',new T.BufferAttribute(nor,3));
  geo.setAttribute('color',new T.BufferAttribute(col,3));geo.setAttribute('uv',new T.BufferAttribute(uv,2));geo.setAttribute('camo',new T.BufferAttribute(cam,1));
  geo.computeBoundingSphere();return geo;}

/* ---------- 한 사람의 차림(모양 가짓수 하나) ---------- */
function solSpec(n,kind,vi){const r=mulberry(((n+1)*7919+vi*104729+[...kind].reduce((a,ch)=>a*31+ch.charCodeAt(0),7))|0);const pick=a=>a[Math.floor(r()*a.length)];
  const mil=n%2===1,W='#ffffff';const s={n,kind,mil,tape:TAPE[n]||'#ccc',skin:pick(SOL_SKIN)};
  const fade=c=>{const k=.9+r()*.14;const C=new V3.T.Color(c);C.multiplyScalar(k);return '#'+C.getHexString();};
  if(!mil){s.top=fade(W);s.topC=1;s.pants=s.top;s.pantsC=1;s.plate=n%4===0?pick(['#7d6c4f','#76674c','#6d6248']):pick(['#545a43','#5a5c48','#4d5340']);
    s.glove=n%4===0?'#5c513d':'#3a3b33';s.head=kind==='sniper'?'boonie':r()<.9?'helm':'boonie';s.helm=s.top;s.helmC=1;s.nvg=r()<.7;s.eye=r()<.6;s.rig='plate';s.knee=1;s.ear=1;
    s.gun=kind==='mg'?'mg':kind==='sniper'?'dmr':kind==='gl'?'gl':'m4';s.furn=r()<.35?'#7d6f52':'#262624';}
  else{const camoTop=r()<.35;s.top=camoTop?fade(W):pick(['#4a4a46','#2f3a2e','#5a5040','#3a3f4a','#55493b','#2c2c2b','#6b6b66','#6f5a3a','#3c4a5c']);s.topC=camoTop?1:0;
    s.pants=r()<.3?fade(W):pick(['#3c4656','#45526a','#7a6e55','#2a2a2a','#4d4a42','#5d5444']);s.pantsC=s.pants.startsWith('#f')||s.pants.startsWith('#e')?1:0;
    s.plate=pick(['#2a2a28','#7a6a50','#4a5040','#3a3a36','#5d5644']);s.glove=r()<.5?'#262624':s.skin;
    s.head=kind==='sniper'?'boonie':pick(['cap','cap','helm','helm','beanie','bare','scarf','boonie']);s.helm=pick(['#5c5f48','#6c6550','#3c3d36','#7a6e55']);s.helmC=0;
    s.nvg=s.head==='helm'&&r()<.25;s.eye=r()<.35;s.rig=r()<.65?'plate':'chest';s.knee=r()<.3;s.ear=r()<.5;s.scarf=s.head==='scarf'||r()<.25?pick(['#8a7d62','#2d2d2b','#6d3c32','#c7bfae']):null;
    s.cap=pick(['#2a2a2a','#7a6e55','#4a4a40','#5a2a24','#2e3a4a']);s.gun=kind==='mg'?'mg':kind==='sniper'?'dmr':kind==='gl'?'gl':r()<.55?'ak':'m4';s.furn=s.gun==='ak'?'#6b4a2c':'#262624';}
  s.pack=kind==='eng'||kind==='mortar'||kind==='medic'?'big':kind==='sniper'||kind==='dteam'||kind==='ew'?'none':pick(['small','small','big','none']);
  s.radio=kind==='lead'||kind==='ew'?1:kind==='rifle'||kind==='sniper'||kind==='gl'?r()<.1:r()<.4;
  s.size=1;return s;}

/* ---------- 무기(무기 좌표: 손잡이 위가 원점, X 총구 쪽) ---------- */
function solGun(K,F,s,ty){const dk='#262624',st='#3b3c3a',fu=s.furn;
  if(ty==='m4'||ty==='gl'){K.box(F,.27,.07,.042,.05,0,0,dk);K.box(F,.22,.056,.05,.29,0,0,fu);K.box(F,.15,0.018,0.018,.47,0,0,st);
    K.box(F,.17,.05,.036,-.17,-.012,0,fu);K.box(F,.03,.11,.04,-.26,-.02,0,fu);K.box(F,.03,.08,.026,-.012,-.05,0,dk,0,0,0,.3);
    K.box(F,.034,.12,.025,.085,-.08,0,dk,0,0,0,-.15);K.box(F,.08,.045,.034,.06,.062,0,'#1d1f1f');
    if(ty==='gl')K.box(F,.18,.05,.05,.28,-.05,0,'#34352f');}
  else if(ty==='ak'){K.box(F,.3,.07,.044,.06,0,0,'#2c2b28');K.box(F,.17,.056,.052,.29,-.003,0,fu);K.box(F,.2,0.018,0.018,.48,.005,0,st);
    K.box(F,.22,.06,.036,-.18,-.035,0,fu,0,0,0,.12);K.box(F,.03,.08,.026,-.01,-.05,0,'#2c2b28',0,0,0,.3);
    K.box(F,.036,.08,.025,.1,-.06,0,'#3a2e22',0,0,0,-.25);K.box(F,.036,.07,.025,.125,-.12,0,'#3a2e22',0,0,0,-.55);}
  else if(ty==='mg'){K.box(F,.34,.095,.065,.07,.01,0,dk);K.box(F,.2,.06,.06,.32,0,0,'#2f302d');K.box(F,.32,0.026,0.026,.55,.01,0,st);
    K.box(F,.2,.07,.045,-.18,-.01,0,dk);K.box(F,.03,.08,.026,-.012,-.055,0,dk,0,0,0,.3);K.box(F,.11,.11,.09,.07,-.1,-.03,'#4c5040');// 탄통
    K.box(F,.08,.012,.012,.2,.07,0,dk);for(const z of [-.03,.03])K.box(F,.22,.012,.012,.55,-.025,z,st,0,0,0,-.08);}// 손잡이·접힌 양각대
  else if(ty==='dmr'){const c=s.mil?'#2e2e2b':'#6f6650';K.box(F,.3,.065,.042,.06,0,0,c);K.box(F,.25,.055,.05,.33,0,0,c);K.box(F,.3,0.022,0.022,.6,0,0,st);
    K.box(F,.26,.075,.04,-.18,-.015,0,c);K.box(F,.03,.08,.026,-.012,-.05,0,dk,0,0,0,.3);K.box(F,.03,.08,.024,.09,-.07,0,dk);
    K.cyl(F,.022,.026,.32,.06,.075,0,'#1d1f1f',0,0,0,Math.PI/2,7);for(const z of [-.03,.03])K.box(F,.24,.012,.012,.42,-.035,z,st,0,0,0,-.1);}}
/* 발사관(좌표: 관 가운데, X 앞) */
function solTube(K,F,kind,s){const ol=s.mil?'#4a5040':'#5f6450';
  if(kind==='at'){K.cyl(F,.044,.044,1.0,0,0,0,ol,0,0,0,Math.PI/2,7);K.cyl(F,.05,.05,.06,.48,0,0,'#2a2a28',0,0,0,Math.PI/2,7);K.cyl(F,.05,.05,.06,-.48,0,0,'#2a2a28',0,0,0,Math.PI/2,7);K.box(F,.06,.05,.03,.08,.06,-.02,'#2a2a28');K.box(F,.04,.09,.03,.1,-.07,0,'#2a2a28');}
  else if(kind==='aa'){K.cyl(F,.038,.042,1.5,0,0,0,'#5d6450',0,0,0,Math.PI/2,7);K.box(F,.14,.09,.06,.1,-.08,0,'#3a3c36');K.box(F,.04,.18,.03,.22,.05,-.08,'#2a2a28');K.box(F,.08,.06,.07,-.1,-.06,.04,'#3a3c36');}
  else if(kind==='atgm'){K.cyl(F,.065,.07,1.2,0,0,0,'#6a6b55',0,0,0,Math.PI/2,8);K.box(F,.22,.15,.2,.12,.03,-.15,'#3e4038');K.cyl(F,.035,.035,.08,.27,.06,-.15,'#151615',0,0,0,Math.PI/2,6);}}

/* ---------- 자세: 아래(다리)·몸통 방향·윗몸(손과 무기) ---------- */
const SOL_POSE={
  move:{pel:[0,.95,0],tor:[.15,1,0],legs:'sep',up:'low'},
  aim:{pel:[0,.95,0],tor:[.1,1,0],legs:'sep',up:'aim'},
  signal:{pel:[0,.95,0],tor:[.05,1,0],legs:'sep',up:'sig'},
  carry:{pel:[0,.93,0],tor:[.5,1,0],legs:'sep',up:'carry'},
  kneel:{pel:[-.04,.57,0],tor:[.17,1,0],legs:'kneel',up:'aim'},
  reload:{pel:[-.04,.57,0],tor:[.28,1,0],legs:'kneel',up:'rel'},
  prone:{pel:[-.6,.14,0],tor:[1,.17,0],chest:[.17,-1,0],legs:'prone',up:'prone',head:[.65,1,0]},
  point:{pel:[0,.95,0],tor:[.12,1,0],legs:'sep',up:'point'},
  leanL:{pel:[0,.95,-.02],tor:[.1,1,-.36],legs:'sep',up:'aim'},
  leanR:{pel:[0,.95,.02],tor:[.1,1,.36],legs:'sep',up:'aim'},
  crawl:{pel:[-.6,.13,0],tor:[1,.12,0],chest:[.12,-1,0],legs:'crawlA',up:'crawl',head:[.7,1,0]},
  crawl2:{pel:[-.58,.13,0],tor:[1,.12,0],chest:[.12,-1,0],legs:'crawlB',up:'crawl2',head:[.7,1,0]},
  down:{pel:[-.45,.11,0],tor:[1,.03,0],chest:[-.03,1,0],legs:'down',up:'down',head:'body'},
  dead:{pel:[-.45,.11,0],tor:[1,.02,.18],chest:[-.2,1,-.35],legs:'dead',up:'dead',head:'body'},
};
const SOL_LAUNCH={at:1,aa:1,atgm:1};
function solBody(s,pose){const T=V3.T,P=[],K=solKit(P),Q=SOL_POSE[pose]||SOL_POSE.move,kind=s.kind;
  const pel=solV(...Q.pel),tY=solV(...Q.tor).normalize(),tX=Q.chest?solV(...Q.chest):solV(1,0,0);
  const TF=solFrameY(pel,tX,tY);const L=(x,y,z)=>solV(x,y,z).applyMatrix4(TF);                     // 몸통 좌표 → 월드
  const TR=new V3.T.Matrix3().setFromMatrix4(TF);const Ld=(x,y,z)=>solV(x,y,z).applyMatrix3(TR);                 // 몸통 방향 → 월드(길이 유지)
  const top=s.top,tc=s.topC,pc=s.pantsC,gear='#383830';
  /* 엉덩이·몸통·조끼 */
  K.box(TF,.2,.17,.34,0,.02,0,s.pants,pc);
  if(s.rig!=='plate')K.box(TF,.2,.3,.33,0,.25,0,top,tc);K.box(TF,.21,.12,.39,-.005,.4,0,top,tc);
  K.box(TF,.24,.06,.36,0,.12,0,gear);          // 허리띠·옆 주머니
  if(s.rig==='plate'){K.box(TF,.29,.3,.35,.0,.31,0,s.plate);for(const z of [-.085,0,.085])K.box(TF,.05,.11,.07,.165,.24,z,s.plate);K.box(TF,.035,.08,.15,.16,.4,0,s.plate);}
  else{K.box(TF,.25,.22,.33,.0,.3,0,s.plate);for(const z of [-.1,-.035,.035,.1])K.box(TF,.05,.12,.055,.14,.29,z,s.plate);}
  for(const z of [-.2,.2])K.box(TF,.07,.03,.07,-.005,.475,z*1.02,s.tape);                                  // 어깨 피아 식별 테이프
  if(s.scarf)K.box(TF,.16,.06,.2,.0,.53,0,s.scarf);
  K.box(TF,.1,.09,.1,.0,.53,0,s.skin);
  /* 등짐 */
  const pk=s.pack;if(pk==='small')K.box(TF,.13,.28,.27,-.21,.3,0,s.mil?'#3a3a34':s.plate);
  if(pk==='big'){const c=kind==='medic'?(s.mil?'#4a4a40':s.plate):s.mil?'#4a5040':s.plate;K.box(TF,.2,.44,.34,-.25,.29,0,c);K.box(TF,.16,.06,.3,-.24,.53,0,c);
    if(kind==='medic'){K.box(TF,.012,.16,.16,-.355,.32,0,'#e9e6dc');K.box(TF,.014,.11,.035,-.358,.32,0,'#b02a22');K.box(TF,.014,.035,.11,-.358,.32,0,'#b02a22');
      K.box(TF,.13,.012,.13,-.25,.565,0,'#e9e6dc');K.box(TF,.09,.014,.028,-.25,.567,0,'#b02a22');K.box(TF,.028,.014,.09,-.25,.567,0,'#b02a22');}
    if(kind==='eng'){K.seg(L(-.36,.1,.12),L(-.36,.62,.1),.035,.02,'#4a4038');K.box(TF,.02,.14,.11,-.37,.66,.1,'#3d4040');K.box(TF,.1,.08,.1,-.25,.6,-.08,'#6a6450');}
    if(kind==='mortar')K.cyl(TF,.04,.04,.75,-.3,.5,.08,'#3d4246',0,0,0,-.35);}
  if(s.radio){K.box(TF,.07,.16,.08,-.2,.42,.13,'#2c2d29');K.seg(L(-.21,.49,.15),L(-.32,1.25,.22),.012,.012,'#1e1e1c');}
  if(kind==='ew'){K.box(TF,.16,.32,.28,-.23,.32,0,'#3c3f38');for(const z of [-.1,.1])K.seg(L(-.25,.48,z),L(-.38,1.05,z*2.4),.014,.014,'#1e1e1c');K.box(TF,.04,.14,.2,.18,.33,0,'#55584e');}
  if(kind==='dteam'){K.box(TF,.15,.3,.3,-.22,.32,0,'#4b4d42');const dc='#2a2b28';K.box(TF,.1,.03,.1,-.31,.5,0,dc);for(const a of [.785,2.356,3.927,5.498])K.box(TF,.14,.012,.016,-.31+Math.cos(a)*.06,.515,Math.sin(a)*.06,dc,0,0,-a,0);}
  if(kind==='sniper'){const gh=['#5a5a3c','#4a4f34','#6b6244','#3e4330'];for(let i=0;i<9;i++)K.box(TF,.1,.06,.1,-.1+((i*37)%7)*.03,.36+((i*13)%5)*.04,-.18+((i*29)%9)*.045,gh[i%4],1,i*.7,i*1.3,i*.4);}
  /* 어깨·머리 */
  const shL=L(-.01,.455,-.2),shR=L(-.01,.455,.2);
  const neck=L(0,.57,0);let hY,hX;
  if(Q.head==='body'){hY=tY.clone();hX=Ld(1,0,0);}else if(Q.head){hY=solV(...Q.head).normalize();hX=solV(1,-.4,0);}else{hY=tY.clone().lerp(solV(0,1,0),.7).normalize();hX=solV(1,0,0);}
  const up=Q.up;let hc=neck.clone().add(hY.clone().multiplyScalar(.1)).add(solV(1,0,0).multiplyScalar(.015));
  if(up==='aim'&&Q.legs!=='prone')hc.add(Ld(0,-.02,.035));
  const HF=solFrameY(hc,hX,hY);solHead(K,HF,s);
  /* 손과 무기 */
  const gunT=s.gun,G=SOL_GUN[gunT],ar=s.topC?s.top:top;
  let hR=null,hLft=null,poleL=solV(0,-1,-.6),poleR=solV(-.2,-1,.8),gunF=null,tube=null,ctrl=null,sling=true;
  const launch=SOL_LAUNCH[kind]&&(up==='aim'),drone=kind==='dteam'&&(up==='aim');
  if(launch){const tc0=L(.1,.52,.17);tube=solFrameX(tc0,Ld(1,.04,0),Ld(0,1,0));hR=L(.14,.43,.15);hLft=L(.36,.45,.1);poleL=Ld(0,-1,-.4);}
  else if(drone){ctrl=L(.27,.29,0);hR=L(.24,.27,.08);hLft=L(.24,.27,-.08);poleL=Ld(-.3,-1,-.6);poleR=Ld(-.3,-1,.6);}
  else if(up==='low'){const g=L(.16,.17,.15),d=Ld(.85,-.42,-.25);gunF=solFrameX(g,d,Ld(0,1,0));hR=g;hLft=g.clone().add(d.clone().normalize().multiplyScalar(G.fh*.9));sling=false;}
  else if(up==='aim'){const sp=L(.03,.43,.11),d=Ld(1,.02,-.05).normalize();const g=sp.clone().add(d.clone().multiplyScalar(G.sl));gunF=solFrameX(g,d,Ld(0,1,0));hR=g;hLft=g.clone().add(d.clone().multiplyScalar(G.fh));
    poleR=Ld(-.2,-.6,1);poleL=Ld(0,-1,-.5);sling=false;}
  else if(up==='prone'){const sp=L(.03,.43,.11),d=solV(1,.03,-.04).normalize();const g=sp.clone().add(d.clone().multiplyScalar(G.sl));gunF=solFrameX(g,d,solV(0,1,0));hR=g;hLft=g.clone().add(d.clone().multiplyScalar(G.fh));
    poleR=solV(0,-1,.6);poleL=solV(0,-1,-.6);sling=false;
    if(gunT==='mg'||gunT==='dmr'){const tip=g.clone().add(d.clone().multiplyScalar(.5));for(const z of [-.06,.06])K.seg(tip.clone().add(solV(0,0,z)),solV(tip.x+.04,0,tip.z+z*2),.014,.014,'#3b3c3a');}}
  else if(up==='rel'){const g=L(.24,.25,.07),d=Ld(.8,-.25,-.5).normalize();gunF=solFrameX(g,d,Ld(.2,1,.4));hR=g;hLft=g.clone().add(d.clone().multiplyScalar(.08)).add(Ld(0,-.13,0));poleL=Ld(0,-1,-.8);sling=false;}
  else if(up==='sig'){const g=L(.13,.15,.16),d=Ld(.8,-.55,-.1);gunF=solFrameX(g,d,Ld(0,1,0));hR=g;hLft=L(.08,.95,-.25);poleL=Ld(.2,.2,-1);sling=false;}
  else if(up==='point'){const g=L(.13,.15,.16),d=Ld(.8,-.55,-.1);gunF=solFrameX(g,d,Ld(0,1,0));hR=g;hLft=L(.62,.5,-.12);poleL=Ld(0,-.3,-1);sling=false;}
  else if(up==='crawl'||up==='crawl2'){const a=up==='crawl'?1:-1;hR=solV(.08+.1*a,.04,.18);hLft=solV(.2-.12*a,.04,-.2);poleR=solV(-.3,0,1);poleL=solV(-.3,0,-1);
    const g=hR.clone().add(solV(0,.03,0));gunF=solFrameX(g,solV(1,.02,-.25),solV(0,0,-1));sling=false;}       // 총을 팔에 얹고 팔꿈치로 긴다
  else if(up==='carry'){hR=L(.13,.57,.23);hLft=L(.13,.57,-.23);poleR=Ld(.3,-1,.5);poleL=Ld(.3,-1,-.5);}
  else if(up==='down'){hR=solV(-.3,.05,.3);hLft=solV(-.05,.2,-.06);poleR=solV(0,.2,1);poleL=solV(0,1,-.4);
    gunF=solFrameX(solV(-.1,.035,.5),solV(1,0,.15),solV(0,0,-1));sling=false;}
  else if(up==='dead'){hR=solV(.05,.05,.55);hLft=solV(-.15,.05,-.55);poleR=solV(-1,.3,0);poleL=solV(-1,.3,0);
    gunF=solFrameX(solV(.3,.035,.75),solV(.8,0,.6),solV(0,0,-1));sling=false;}
  if(gunF)solGun(K,gunF,s,gunT);
  if(sling)solGun(K,solFrameX(L(-.21,.25,-.05),Ld(.15,.75,.6),Ld(-1,0,0)),s,gunT);   // 등에 멘 총
  if(tube)solTube(K,tube,kind,s);
  else if(SOL_LAUNCH[kind]&&up!=='down'&&up!=='dead')solTube(K,solFrameX(L(-.27,.36,.02),Ld(.2,1,-.55),Ld(-1,0,0)),kind,s);   // 등에 멘 발사관
  if(ctrl){K.at(ctrl,Ld(1,.6,0),Ld(-.6,1,0),.12,.03,.2,'#2a2b28');K.seg(ctrl.clone().add(Ld(0,.02,.07)),ctrl.clone().add(Ld(-.02,.14,.08)),.008,.008,'#1e1e1c');}
  /* 팔 */
  for(const [S,H,pole,side] of [[shR,hR,poleR,1],[shL,hLft,poleL,-1]]){const E=solIK(S,H,.29,.27,pole);
    K.seg(S,E,.105,.1,ar,s.topC);const hand=H.clone().sub(E).normalize();const W=H.clone().sub(hand.clone().multiplyScalar(.04));
    K.seg(E,W,.088,.085,ar,s.topC);K.seg(W,H.clone().add(hand.multiplyScalar(.03)),.085,.06,s.glove);
    if(kind==='medic')K.seg(S.clone().lerp(E,.3),S.clone().lerp(E,.55),.115,.11,'#e9e6dc');}               // 위생병 완장
  /* 다리(서 있는 자세는 따로 그린다) */
  if(Q.legs!=='sep')solLegs(K,s,Q.legs,TF,L);
  return solMerge(P);}
/* 머리(머리 좌표: 머리 가운데, Y 정수리, X 얼굴) */
function solHead(K,F,s){const dk='#262624';
  K.sph(F,.098,0,0,0,s.skin,0,.95,1.12,.9);
  if(s.eye)K.box(F,.03,.032,.15,.085,.012,0,'#151617');
  const h=s.head;
  if(h==='helm'){K.sph(F,.128,-.01,.025,0,s.helm,s.helmC,1,.95,1.02,Math.PI*.5);K.box(F,.05,.012,.05,-.02,.148,0,s.tape);
    if(s.nvg)K.box(F,.035,.045,.05,.115,.075,0,dk);if(s.ear)for(const z of [-.112,.112])K.box(F,.07,.07,.04,0,-.01,z,'#2f302b');
    K.box(F,.1,.02,.02,-.03,.07,.115,dk);K.box(F,.1,.02,.02,-.03,.07,-.115,dk);}// 옆 레일
  else if(h==='boonie'){const c=s.mil?'#6b6244':s.top;K.cyl(F,.1,.108,.08,0,.08,0,c,s.mil?0:1);K.cyl(F,.17,.17,.012,0,.045,0,c,s.mil?0:1,0,0,0,10);}
  else if(h==='cap'){K.sph(F,.104,0,.02,0,s.cap,0,1,1,1,Math.PI*.5);K.box(F,.09,.012,.12,.1,.035,0,s.cap);K.box(F,.03,.08,.22,0,-.01,0,dk);}
  else if(h==='beanie')K.sph(F,.106,0,.012,0,s.cap,0,1,1.1,1,Math.PI*.55);
  else if(h==='scarf'){K.sph(F,.104,0,.0,0,s.scarf,0,1,1.12,1,Math.PI*.62);K.box(F,.07,.06,.17,.07,-.045,0,s.scarf);}
  else K.sph(F,.1,-.005,.015,0,['#1d1a17','#3a2a1e','#2a2522'][s.skin.charCodeAt(2)%3],0,1,1,1,Math.PI*.42);
  if(s.kind==='dteam')K.box(F,.07,.06,.18,.09,.02,0,'#1c1c1a');}                                         // FPV 고글
/* 다리: 엉덩이·무릎·발목 점을 잇는다 */
function solLeg(K,s,hip,ank,pole,foot,knee){const kn=knee||solIK(hip,ank,.46,.45,pole);const pc=s.pantsC;
  K.seg(hip,kn,.15,.15,s.pants,pc);K.seg(kn,ank,.12,.12,s.pants,pc);
  if(s.knee){const out=pole.clone().normalize();K.at(kn.clone().add(out.multiplyScalar(.06)),ank.clone().sub(kn),solV(0,1,0),.09,.1,.13,'#2d2e2a');}
  const f=foot.clone().normalize();const sole=solV(0,1,0).sub(f.clone().multiplyScalar(f.y)).normalize();
  K.at(ank.clone().add(f.clone().multiplyScalar(.06)).add(sole.clone().multiplyScalar(-.04)),f,sole,.27,.1,.11,'#2e2a24');}
function solLegs(K,s,how,TF,L){
  if(how==='kneel'){solLeg(K,s,L(0,0,-.1),solV(.38,.09,-.14),solV(1,.2,0),solV(1,0,0));                    // 왼다리: 발을 앞에 딛고 무릎을 세움
    solLeg(K,s,L(0,0,.1),solV(-.4,.08,.15),solV(1,-1,0),solV(-.35,-1,0));}                               // 오른다리: 무릎을 땅에
  else if(how==='prone'){for(const z of [-1,1])solLeg(K,s,L(0,0,.1*z),solV(-1.42,.07,.26*z),solV(0,-1,.2*z),solV(-.25,-1,0));}
  else if(how==='crawlA'||how==='crawlB'){const a=how==='crawlA'?1:-1;solLeg(K,s,L(0,0,-.1*a),solV(-1.4,.07,-.22*a),solV(0,-1,-.2*a),solV(-.25,-1,0));
    solLeg(K,s,L(0,0,.1*a),solV(-1.0,.07,.42*a),solV(.2,-.2,a),solV(-.3,-1,.3*a));}                         // 한쪽 무릎을 옆으로 끌어올린다
  else if(how==='down'){solLeg(K,s,L(0,0,-.1),solV(-1.3,.06,-.16),solV(0,1,0),solV(-.1,1,0));solLeg(K,s,L(0,0,.1),solV(-1.05,.07,.25),solV(.2,1,.3),solV(-.2,1,.4));}
  else{solLeg(K,s,L(0,0,-.1),solV(-1.25,.06,-.38),solV(0,1,-.3),solV(-.2,.6,-.8));solLeg(K,s,L(0,0,.1),solV(-1.05,.08,.32),solV(.5,.4,1),solV(-.2,.8,.5));}}
/* 따로 움직이는 다리 하나(엉덩이가 원점) */
function solLegGeo(s){const P=[],K=solKit(P);solLeg(K,s,solV(0,0,0),solV(0,-.87,0),solV(1,0,0),solV(1,0,0));return solMerge(P);}

/* ---------- 병사 만들기 ---------- */
function v3SoldierM(n,kind){const T=V3.T;kind=kind||'rifle';
  const mil=n%2===1,vi=Math.floor(Math.random()*(mil?SOLV.mil:SOLV.reg));const vkey=n+'|'+kind+'|'+vi;
  V3.solR=V3.solR||new Map();V3.solByGeo=V3.solByGeo||new WeakMap();
  let R=V3.solR.get(vkey);
  if(!R){const s=solSpec(n,kind,vi);R={s,geo:{},leg:solLegGeo(s),n};R.geo.move=solBody(s,'move');V3.solR.set(vkey,R);V3.solByGeo.set(R.geo.move,R);}
  if(V3.solG)V3.solG.set(vkey,R.geo.move);                                                        // 묶어 그리기(07z-inst)가 모양 수를 센다
  const mat=solMat(n);
  const g=new T.Group();const body=new T.Mesh(R.geo.move,mat);body.castShadow=true;g.add(body);
  const legL=new T.Mesh(R.leg,mat),legR=new T.Mesh(R.leg,mat);legL.position.set(0,.95*MU,-.1*MU);legR.position.set(0,.95*MU,.1*MU);legL.castShadow=legR.castShadow=true;g.add(legL,legR);
  g.scale.setScalar(.95+Math.random()*.1);
  body.userData.keepGeo=1;legL.userData.keepGeo=1;legR.userData.keepGeo=1;
  g.userData={legL,legR,tor:body,pose:'move'};return g;}
V3.solG=V3.solG||new Map();
/* 자세 바꾸기: 몸 형상을 바꿔 끼우고, 서 있는 자세가 아니면 따로 그린 다리를 숨긴다 */
function v3FigPose(fig,pose){const U=fig&&fig.userData;if(!U||!U.tor||U.pose===pose)return;const body=U.tor;
  const R=body.userData.rec||(body.userData.rec=V3.solByGeo&&V3.solByGeo.get(body.geometry));if(!R)return;
  if(!SOL_POSE[pose])pose='move';let g=R.geo[pose];if(!g){g=R.geo[pose]=solBody(R.s,pose);}
  body.geometry=g;U.pose=pose;const st=!!SOL_STAND[pose];if(U.legL){U.legL.visible=st;U.legR.visible=st;if(!st){U.legL.rotation.z=0;U.legR.rotation.z=0;}}}
/* 시신: 그 병사의 차림 그대로, 먼지 낀 색으로 쓰러진 자세 */
function v3SoldierDead(fig,nat){const T=V3.T;const body=fig&&fig.userData&&fig.userData.tor;
  const R=body&&(body.userData.rec||(V3.solByGeo&&V3.solByGeo.get(body.geometry)))||null;
  let g;if(R){if(!R.geo.dead)R.geo.dead=solBody(R.s,'dead');g=R.geo.dead;}else{const f=v3SoldierM(nat,'rifle');v3FigPose(f,'dead');g=f.userData.tor.geometry;}
  const m=new T.Mesh(g,solMat(R?R.n:nat,true));m.castShadow=true;m.userData.keepGeo=1;m.userData.keepMat=1;return m;}
