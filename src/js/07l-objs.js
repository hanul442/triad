/* ===================== 3D: 특별 거점 건물, 지뢰·벙커·요새화·구호소, 구급차 =====================
   05l-objs의 거점 종류마다 한눈에 알아보는 모습을 건물 위·앞에 얹는다(건물 색은 07-view3d가 x.lkc로 칠한다).
     병원: 옥상 헬기장과 붉은 십자 간판 · 방송국: 붉은·흰 송신 철탑과 접시 · 통신탑: 높은 격자 철탑과 깜박이는 등
     발전소: 줄무늬 굴뚝 둘과 변압기 · 역: 둥근 지붕 승강장과 시계탑 · 시장: 줄무늬 차양 노점 · 항만청: 컨테이너와 기중기
     대성당: 뾰족 첨탑과 십자가 · 관공서: 돔과 기둥 현관, 국기 · 거래소: 기둥 현관과 금빛 박공 · 도서관: 넓은 계단과 청동 지붕
     경찰청: 경광등과 안테나, 바리케이드 · 공항: 관제탑과 바람자루 · 스타디움: 둥근 관중석과 조명탑
   건물이 반 넘게 부서지면 옥상 장식은 사라지고, 무너지면 다 사라진다. */
function v3LmMats(){if(V3.lmM)return V3.lmM;const T=V3.T;const S=(c,o)=>{const m=new T.MeshStandardMaterial(Object.assign({color:c,roughness:.8,flatShading:true},o||{}));if(typeof v3FowMat==='function'&&V3.fowU)v3FowMat(m);return m;};
  return V3.lmM={white:S('#ecebe6'),red:S('#c8322c'),steel:S('#77797a',{metalness:.5,roughness:.5}),dark:S('#2a2b2c'),glass:S('#5d7380',{metalness:.3,roughness:.25}),
    conc:S('#a8a49b'),stone:S('#d6cdb8'),gold:S('#c6a24a',{metalness:.5,roughness:.4}),copper:S('#5f8f7c'),blue:S('#2f5fb0'),awnA:S('#b83a32'),awnB:S('#e4dccb'),awnC:S('#2f6f5a'),
    cont:[S('#a3462c'),S('#2f5f8a'),S('#5e6f3a'),S('#b88a2a')],pad:S('#3a3c3d'),
    lamp:new T.MeshStandardMaterial({color:'#ff3b2f',emissive:'#ff2a1a',emissiveIntensity:1.5}),blueL:new T.MeshStandardMaterial({color:'#3b7bff',emissive:'#2a62ff',emissiveIntensity:1.2}),
    sock:new T.MeshStandardMaterial({color:'#ff8a2a',roughness:.9,side:T.DoubleSide})};}
/* 거점 칸에서 길 쪽(앞) 방향 [dr,dc] */
function v3LmFront(r,c){for(const [a,b] of [[1,0],[0,1],[-1,0],[0,-1]]){const R=r+a,C=c+b;if(!inb(R,C))continue;const y=G.map[R][C];if(y.t==='road'||y.t==='plaza'||y.t==='park')return [a,b];}return [1,0];}
function v3LmBuild(o){const T=V3.T,M=v3LmMats(),m=MU;const x=G.map[o.r][o.c];const k=objKind(o);if(!k||x.t==='rubble'||x.t==='water')return null;
  const g=new T.Group();const [cx,cz]=v3x(o.r,o.c);g.position.set(cx,0,cz);
  const bl=x.t==='bldg';const dmg=bl?1-x.bhp/x.bmax:0;if(bl&&dmg>=.5)return null;
  const top=bl?.06+x.f*FLOOR_H:0;const [fr,fc]=v3LmFront(o.r,o.c);const fa=Math.atan2(fr,fc);   // 앞쪽(로컬 +x)으로 돌린 그룹
  const F=new T.Group();F.rotation.y=-fa;g.add(F);
  const add=(geo,mat,px,py,pz,par,rx,ry,rz)=>{const q=new T.Mesh(geo,mat);q.position.set(px,py,pz);if(rx||ry||rz)q.rotation.set(rx||0,ry||0,rz||0);q.castShadow=true;q.receiveShadow=true;(par||g).add(q);return q;};
  const box=(w,h,d,mat,px,py,pz,par)=>add(new T.BoxGeometry(w,h,d),mat,px,py,pz,par);
  const cyl=(r1,r2,h,mat,px,py,pz,seg,par)=>add(new T.CylinderGeometry(r1,r2,h,seg||10),mat,px,py,pz,par);
  const cross=(px,py,pz,s,par,face)=>{// 흰 바탕에 붉은 십자. face 'y' = 눕힘(옥상), 아니면 +x를 바라보는 세로 판
    if(face==='y'){box(s,.004,s,M.white,px,py,pz,par);box(s*.7,.006,s*.22,M.red,px,py+.002,pz,par);box(s*.22,.006,s*.7,M.red,px,py+.002,pz,par);return;}
    box(.004,s,s,M.white,px,py,pz,par);box(.006,s*.7,s*.22,M.red,px+.003,py,pz,par);box(.006,s*.22,s*.7,M.red,px+.003,py,pz,par);};
  const flag=(px,py,pz,h,col,par)=>{cyl(.006,.006,h,M.steel,px,py+h/2,pz,5,par);box(.003,.06,.1,new T.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:.2,side:T.DoubleSide}),px,py+h-.04,pz+.05,par);};
  const lattice=(h,w0,w1,par,px,pz,py)=>{const L=new T.Group();L.position.set(px||0,py||0,pz||0);(par||g).add(L);
    for(const [sx,sz] of [[1,1],[1,-1],[-1,1],[-1,-1]]){const a=new T.Vector3(sx*w0,0,sz*w0),b=new T.Vector3(sx*w1,h,sz*w1);const len=a.distanceTo(b);const q=new T.Mesh(new T.CylinderGeometry(.006,.006,len,4),M.steel);q.position.copy(a.clone().add(b).multiplyScalar(.5));q.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());q.castShadow=true;L.add(q);}
    const n=Math.round(h/.14);for(let i=1;i<=n;i++){const y=i*h/n,w=w0+(w1-w0)*i/n;for(const [ax,az,rot] of [[0,w,0],[0,-w,0],[w,0,1],[-w,0,1]]){const q=new T.Mesh(new T.BoxGeometry(rot?.006:2*w,.006,rot?2*w:.006),M.steel);q.position.set(ax,y,az);L.add(q);}}
    return L;};
  const blink=[];
  if(k==='hosp'){if(bl){// 옥상 헬기장 + 네 면 붉은 십자
      cyl(.3,.3,.012,M.pad,0,top+.006,0,16);const ring=add(new T.TorusGeometry(.24,.008,4,24),M.white,0,top+.014,0,null,Math.PI/2);ring.castShadow=false;
      box(.03,.004,.18,M.white,-.06,top+.015,0);box(.03,.004,.18,M.white,.06,top+.015,0);box(.12,.004,.03,M.white,0,top+.015,0);
      cross(.43,top-.12,0,.2,F);cross(.3,top+.02,.3,.2,F,'y');cross(-.3,top+.02,-.3,.2,F,'y');
      box(.16,.012,.36,M.white,.5,.24,0,F);for(const s of [-1,1])cyl(.008,.008,.24,M.steel,.56,.12,s*.16,5,F);   // 응급실 차양
      cross(.585,.27,0,.1,F);}
    else{// 야전병원: 큰 천막 셋 + 헬기장
      for(const [px,pz] of [[-.2,-.22],[.14,-.22],[-.2,.12]]){const tn=add(new T.CylinderGeometry(.13,.13,.3,3),M.white,px,.07,pz,null,-Math.PI/2,0,Math.PI/2);tn.scale.set(1,1,.62);for(const s2 of [-1,1]){const pl=box(.08,.004,.02,M.red,px,.1,pz+s2*.045);pl.rotation.x=s2*.95;const pl2=box(.02,.004,.08,M.red,px,.1,pz+s2*.045);pl2.rotation.x=s2*.95;}}
      cyl(.17,.17,.01,M.pad,.2,.005,.2,16);box(.025,.004,.13,M.white,.15,.012,.2);box(.025,.004,.13,M.white,.25,.012,.2);box(.1,.004,.025,M.white,.2,.012,.2);
      flag(.42,0,-.42,.34,'#ffffff');}}
  else if(k==='bcast'){const base=bl?top:0;const h=bl?1.6:1.8;
    for(let i=0;i<6;i++)cyl(.03-i*.004,.03-(i+1)*.004,h/6,i%2?M.white:M.red,0,base+h/6*(i+.5),0,6);
    for(const [y,a] of [[.45,0],[.62,2.2]]){const d=add(new T.SphereGeometry(.07,10,6,0,Math.PI*2,0,Math.PI/2.6),M.white,Math.cos(a)*.05,base+h*y,Math.sin(a)*.05,null,0,a,Math.PI/2);d.material=M.white;}
    const l=add(new T.SphereGeometry(.02,6,6),M.lamp,0,base+h+.02,0);blink.push(l);
    if(bl){box(.04,.12,.44,M.dark,.43,top-.1,0,F);box(.042,.03,.3,M.red,.43,top-.1,0,F);}else{box(.3,.12,.14,M.white,.28,.06,-.25);cyl(.05,.05,.02,M.white,.28,.14,-.25,10).rotation.x=.6;}}
  else if(k==='comm'){const base=bl?top:0;const h=bl?1.8:2.2;lattice(h,bl?.09:.11,.02,null,0,0,base);
    for(let i=0;i<3;i++){const a=i*2.1;const d=add(new T.CylinderGeometry(.035,.035,.02,10),M.white,Math.cos(a)*.035,base+h*.78,Math.sin(a)*.035,null,0,-a,Math.PI/2);}
    cyl(.004,.004,.25,M.steel,0,base+h+.12,0,4);const l=add(new T.SphereGeometry(.018,6,6),M.lamp,0,base+h+.25,0);blink.push(l);const l2=add(new T.SphereGeometry(.014,6,6),M.lamp,0,base+h*.55,0);blink.push(l2);
    if(!bl){box(.18,.1,.14,M.conc,.3,.05,.3);}}
  else if(k==='power'){if(bl){for(let i=0;i<7;i++)cyl(.07-i*.003,.075-i*.003,.15,i%2?M.white:M.red,-.2,top+.075+i*.15,.2,10);box(.5,.08,.3,M.conc,.05,top+.04,-.15);}
    else{for(const [px,pz] of [[-.22,-.18],[.08,-.22]])for(let i=0;i<6;i++)cyl(.07-i*.004,.075-i*.004,.2,i%2?M.white:M.red,px,.1+i*.2,pz,10);
      for(const [px,pz] of [[.25,.2],[.0,.25],[-.25,.22]]){box(.12,.12,.09,M.dark,px,.06,pz);for(const s of [-1,0,1])cyl(.008,.008,.05,M.white,px+s*.03,.145,pz,5);}
      lattice(.55,.05,.02,null,.36,-.3,0);}}
  else if(k==='rail'){if(bl){const v=add(new T.CylinderGeometry(.3,.3,.8,14,1,false,0,Math.PI),M.glass,0,top,0,F,0,0,Math.PI/2);v.rotation.set(Math.PI/2,0,Math.PI/2);v.scale.set(1,1,.55);
      box(.12,.8,.12,M.stone,.34,top+.4,.34,F);add(new T.CylinderGeometry(.045,.045,.006,14),M.white,.403,top+.68,.34,F,0,0,Math.PI/2);
      add(new T.ConeGeometry(.1,.16,4),M.copper,.34,top+.88,.34,F,0,Math.PI/4,0);}
    else{box(.9,.012,.34,M.dark,0,.22,0,F);for(const s of [-.4,0,.4])for(const t of [-1,1])cyl(.008,.008,.22,M.steel,s,.11,t*.14,5,F);box(.9,.03,.18,M.conc,0,.015,0,F);for(const t of [-1,1])box(.95,.006,.01,M.steel,0,.003,t*.3,F);}}
  else if(k==='supply'){if(o.name==='항만청'){const base=bl?top:0;for(let i=0;i<6;i++){const q=box(.2,.07,.08,M.cont[i%4],(i%3-1)*.22,base+.035+Math.floor(i/3)*.07,-.2,F);}
      const cr=new T.Group();cr.position.set(.1,base,.18);F.add(cr);for(const s of [-1,1])cyl(.012,.012,.6,M.gold,s*.25,.3,0,5,cr);box(.6,.03,.03,M.gold,0,.6,0,cr);box(.03,.03,.5,M.gold,0,.6,-.15,cr);}
    else{const base=bl?0:0;const cols=[M.awnA,M.awnB,M.awnC];for(let i=0;i<6;i++){const px=(i%3-1)*.28,pz=Math.floor(i/3)?.2:-.2;const st=box(.2,.07,.13,M.conc,px,base+.035,pz);const aw=box(.24,.01,.17,cols[i%3],px,base+.14,pz);aw.rotation.x=(pz>0?-1:1)*.25;
        for(const s of [-1,1])cyl(.004,.004,.14,M.steel,px+s*.1,base+.07,pz+(pz>0?.07:-.07),4);box(.05,.03,.04,M.cont[i%4],px+.04,base+.085,pz);}
      if(bl){for(let i=0;i<4;i++){const aw=box(.2,.01,.08,cols[i%3],.5,.22,(i-1.5)*.21,F);aw.rotation.z=-.3;}}}}
  else if(k==='spire'){const base=bl?top:0;const sx=bl?.3:0,sz=bl?.3:0;
    box(.22,bl?.5:.9,.22,M.stone,sx,base+(bl?.25:.45),sz,F);const h0=base+(bl?.5:.9);const sp=add(new T.ConeGeometry(.16,1.1,4),M.copper,sx,h0+.55,sz,F,0,Math.PI/4,0);
    box(.01,.12,.01,M.gold,sx,h0+1.16,sz,F);box(.07,.01,.01,M.gold,sx,h0+1.18,sz,F);
    if(bl){const rw=add(new T.CylinderGeometry(.09,.09,.006,16),M.glass,.435,top-.15,0,F,0,0,Math.PI/2);for(const s of [-.25,.25]){const pk=add(new T.ConeGeometry(.08,.22,4),M.copper,-.15,top+.11,s,F,0,Math.PI/4,0);}}}
  else if((k==='gov'||k==='bank'||k==='archive')&&!bl){// 빈터: 기둥이 둘린 작은 기념관
    const rf=k==='bank'?M.gold:k==='archive'?M.copper:M.stone;box(.66,.05,.52,M.stone,0,.025,0,F);for(let i=0;i<3;i++)box(.08,.012*(3-i),.4,M.stone,.37+i*.04,.006*(3-i),0,F);
    for(const cx2 of [-.27,-.09,.09,.27])for(const cz2 of [-.2,.2])cyl(.02,.022,.26,M.white,cx2,.18,cz2,8,F);
    box(.36,.2,.3,M.stone,-.05,.15,0,F);box(.66,.04,.5,M.stone,0,.33,0,F);const pd=add(new T.CylinderGeometry(.1,.1,.5,3),rf,0,.37,0,F);pd.rotation.set(0,0,Math.PI/2);pd.rotation.order='ZYX';pd.rotation.y=Math.PI/2;pd.scale.set(1,1,1);
    if(k==='gov'){flag(-.4,0,.4,.5,'#d9d2c0',F);flag(-.4,0,-.4,.5,'#d9d2c0',F);}}
  else if(k==='gov'||k==='bank'||k==='archive'){// 기둥 현관(앞) + 박공, 관공서는 돔, 도서관은 계단과 청동 지붕
    const h=bl?Math.min(top,.06+3*FLOOR_H):.4;const nC=k==='archive'?6:4;
    for(let i=0;i<nC;i++)cyl(.018,.02,h-.06,M.stone,.5,.06+(h-.06)/2,(i/(nC-1)-.5)*.62,8,F);
    box(.14,.04,.72,M.stone,.48,.02,0,F);box(.16,.035,.72,M.stone,.48,h+.017,0,F);
    const ped=add(new T.CylinderGeometry(.08,.08,.72,3),k==='bank'?M.gold:M.stone,.48,h+.06,0,F,Math.PI/2,0,0);ped.rotation.set(Math.PI/2,0,0);ped.scale.set(1,1,.45);
    if(k==='archive')for(let i=0;i<4;i++)box(.04,.012*(4-i),.8,M.stone,.6+i*.04,.006*(4-i),0,F);
    if(bl){if(k==='gov'){cyl(.3,.32,.16,M.stone,0,top+.08,0,16);for(let i=0;i<12;i++){const a=i/12*6.283;cyl(.012,.012,.16,M.white,Math.cos(a)*.31,top+.08,Math.sin(a)*.31,5);}const d=add(new T.SphereGeometry(.3,18,9,0,Math.PI*2,0,Math.PI/2),M.copper,0,top+.16,0);cyl(.04,.04,.1,M.stone,0,top+.5,0,8);add(new T.SphereGeometry(.03,8,6),M.gold,0,top+.57,0);}
      if(k==='archive')box(.84,.03,.84,M.copper,0,top+.015,0);
      flag(-.3,top,-.3,.4,k==='bank'?'#c6a24a':'#d9d2c0',null);}
    else{box(.1,.5,.1,M.stone,-.1,.25,-.1);flag(-.35,0,.3,.5,'#d9d2c0');}}
  else if(k==='police'){if(!bl){// 검문소: 초소와 차단봉, 경찰차
      box(.26,.16,.2,M.white,-.15,.08,-.15,F);box(.265,.03,.205,M.blue,-.15,.12,-.15,F);box(.28,.02,.22,M.dark,-.15,.17,-.15,F);
      const l1=box(.06,.025,.04,M.blueL,-.18,.19,-.15,F),l2=box(.06,.025,.04,M.lamp,-.12,.19,-.15,F);blink.push(l1,l2);
      box(.025,.07,.025,M.dark,.05,.035,.25,F);const arm=box(.4,.012,.012,M.red,.25,.07,.25,F);
      box(.2,.05,.09,M.white,.2,.035,-.2,F);box(.1,.03,.08,M.dark,.18,.07,-.2,F);box(.03,.012,.06,M.blueL,.18,.09,-.2,F);
      for(let i=0;i<3;i++)box(.03,.05,.14,i%2?M.white:M.red,.42,.025,(i-1)*.18,F);cyl(.004,.004,.5,M.steel,-.3,.25,-.3,4);}
    else{const base=top;box(.5,.08,.36,M.white,-.1,base+.04,-.1,F);box(.505,.025,.365,M.blue,-.1,base+.06,-.1,F);box(.3,.04,.07,M.dark,.2,base+.02,0,F);const l1=box(.12,.04,.07,M.blueL,.13,base+.05,0,F);const l2=box(.12,.04,.07,M.lamp,.27,base+.05,0,F);blink.push(l1,l2);
    cyl(.004,.004,.5,M.steel,-.3,base+.25,-.3,4);
    if(bl)box(.04,.05,.6,M.blue,.43,top-.06,0,F);
    for(let i=0;i<3;i++){const b=box(.03,.05,.14,i%2?M.white:M.red,.68,.025,(i-1)*.18,F);}}}
  else if(k==='air'){if(o.name==='스타디움'&&!bl){const n=20;for(let i=0;i<n;i++){const a=i/n*Math.PI*2;const q=box(.16,.14,.06,M.conc,Math.cos(a)*.43,.07,Math.sin(a)*.38);q.rotation.y=-a+Math.PI/2;q.rotation.x=0;
        const s2=box(.16,.05,.06,i%2?M.awnA:M.awnB,Math.cos(a)*.47,.17,Math.sin(a)*.42);s2.rotation.y=-a+Math.PI/2;}
      add(new T.CircleGeometry(.36,20),M.awnC,0,.004,0,null,-Math.PI/2);
      for(const [px,pz] of [[.42,.36],[-.42,.36],[.42,-.36],[-.42,-.36]]){cyl(.008,.01,.6,M.steel,px,.3,pz,5);box(.08,.05,.02,M.white,px,.62,pz);}}
    else{const base=bl?top:0;const sx=bl?-.25:-.3,sz=bl?-.25:-.3;cyl(.06,.07,bl?.7:.9,M.conc,sx,base+(bl?.35:.45),sz,10);const ch=base+(bl?.7:.9);
      cyl(.15,.1,.1,M.glass,sx,ch+.05,sz,10);cyl(.16,.16,.025,M.white,sx,ch+.11,sz,10);cyl(.004,.004,.1,M.steel,sx,ch+.15,sz,4);const l=add(new T.SphereGeometry(.012,6,6),M.lamp,sx,ch+.2,sz);blink.push(l);
      cyl(.004,.004,.3,M.steel,.35,base+.15,.35,4);const ws=add(new T.ConeGeometry(.025,.1,8,1,true),M.sock,.4,base+.29,.35,null,0,0,Math.PI/2);
      if(!bl){cyl(.22,.22,.01,M.pad,.12,.005,.1,16);box(.03,.004,.14,M.white,.06,.012,.1);box(.03,.004,.14,M.white,.18,.012,.1);box(.1,.004,.03,M.white,.12,.012,.1);}}}
  if(!bl&&!(k==='air'&&o.name==='스타디움')&&k!=='police'&&k!=='hosp')g.scale.setScalar(1.35);
  g.userData.blink=blink;g.userData.ok=o;return g;}
function v3BuildLandmarks(par){if(!G||!G.objs||typeof objKind!=='function')return;V3.lmBlink=[];
  for(const o of G.objs){let g=null;try{g=v3LmBuild(o);}catch(e){console.warn(e);}if(!g)continue;par.add(g);V3.lmBlink.push(...g.userData.blink);}}
{const _bc=v3BuildCity;v3BuildCity=function(){_bc.apply(this,arguments);try{v3BuildLandmarks(V3.G.city);}catch(e){console.warn(e);}};}

/* ---------- 지뢰·벙커·요새화·구호소 모형 ---------- */
function v3Fort2Mesh(f){const T=V3.T,m=MU,M=v3FortMats(),L=v3LmMats();const g=new T.Group();const R=mulberry(f.id*911+5);
  const add=(geo,mat,x,y,z,rx,ry,rz)=>{const o=new T.Mesh(geo,mat);o.position.set(x,y,z);o.rotation.set(rx||0,ry||0,rz||0);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;};
  if(f.k==='mine'){add(new T.CylinderGeometry(.03,.034,.008,10),M.pit,0,.004,0);add(new T.CylinderGeometry(.022,.024,.01,10),L.dark,0,.009,0);add(new T.SphereGeometry(.006,5,4),L.steel,0,.015,0);
    for(let i=0;i<5;i++){const a=R()*6.28;add(new T.BoxGeometry(.012,.004,.01),M.berm,Math.cos(a)*.04,.002,Math.sin(a)*.04,0,a,0);}}
  else if(f.k==='bunker'){const s=.28;add(new T.BoxGeometry(s,.11,s),M.conc,0,.055,0);add(new T.BoxGeometry(s+.04,.025,s+.04),M.conc,0,.12,0);
    add(new T.BoxGeometry(s*.7,.022,.01),L.dark,0,.08,-s/2-.002);add(new T.BoxGeometry(.01,.022,s*.5),L.dark,s/2+.002,.08,-.03);add(new T.BoxGeometry(.01,.022,s*.5),L.dark,-s/2-.002,.08,-.03);
    for(let i=0;i<10;i++){const a=-1.4+i*.31;add(new T.BoxGeometry(.05,.03,.03),M.bag,Math.sin(a)*.2,.015,-Math.cos(a)*.2,0,-a,0);}
    add(new T.BoxGeometry(.06,.07,.02),L.dark,0,.035,s/2+.001);}// 뒷문
  else if(f.k==='fortb'){// 건물 칸 바깥 면마다 층별 창턱 모래주머니 줄 + 옥상 난간 모래주머니
    const x=(G.map[f.r]&&G.map[f.r][f.c])||{f:1};const fl=x.t==='bldg'?Math.min(x.f,6):1;const same=(a,b)=>inb(a,b)&&G.map[a][b].t==='bldg'&&x.blk!=null&&G.map[a][b].blk===x.blk;
    const faces=[[-1,0],[1,0],[0,-1],[0,1]].filter(([a,b])=>!same(f.r+a,f.c+b));
    for(const [a,b] of faces){const ox=b*.43,oz=a*.43;for(let i=0;i<fl;i++){const y=.06+i*FLOOR_H+.075;
        for(const s of [-.25,0,.25]){const bx=b?ox:s,bz=a?oz:s;const o=add(new T.BoxGeometry(b?.035:.17,.035,a?.035:.17),M.bag,bx,y,bz);o.rotation.y=(R()-.5)*.1;}}
      const yt=.06+(x.f||1)*FLOOR_H+.02;for(const s of [-.3,-.1,.1,.3])add(new T.BoxGeometry(b?.05:.16,.04,a?.05:.16),M.bag,b?ox*.95:s,yt,a?oz*.95:s);}}
  else if(f.k==='aid'){const tent=add(new T.CylinderGeometry(.13,.13,.26,3),L.white,0,.065,0,-Math.PI/2,0,Math.PI/2);tent.scale.set(1,1,.62);
    for(const s2 of [-1,1]){const pl=add(new T.BoxGeometry(.06,.004,.016),L.red,0,.1,s2*.04);pl.rotation.x=s2*.95;const pl2=add(new T.BoxGeometry(.016,.004,.06),L.red,0,.1,s2*.04);pl2.rotation.x=s2*.95;}
    add(new T.CylinderGeometry(.004,.004,.22,4),L.steel,.16,.11,.1);add(new T.BoxGeometry(.003,.05,.07),L.white,.16,.19,.135);add(new T.BoxGeometry(.004,.035,.012),L.red,.161,.19,.135);add(new T.BoxGeometry(.004,.012,.035),L.red,.161,.19,.135);
    for(let i=0;i<2;i++)add(new T.BoxGeometry(.09,.012,.035),L.white,-.05+i*.1,.006,.15);}
  g.position.set(f.x,0,f.z);g.rotation.y=f.ry||0;return g;}
{const _fm=v3FortMesh;v3FortMesh=function(f){if(f.k==='mine'||f.k==='bunker'||f.k==='fortb'||f.k==='aid')return v3Fort2Mesh(f);return _fm(f);};
 const _ff=v3FortFrame;v3FortFrame=function(){_ff();if(!G||!V3.fortObj)return;
   // 지뢰: 우리 것이거나 찾아낸 것만 보인다(전 세력 시야면 다 보임)
   for(const f of G.forts||[]){if(f.k!=='mine')continue;const o=V3.fortObj.get(f.id);if(o)o.visible=!G.fog||f.nat===G.viewer||!!(f.spot&&f.spot[G.viewer]);}
   // 깜박이는 경고등
   if(V3.lmBlink&&V3.lmBlink.length){const on=Math.floor(performance.now()/600)%2===0;for(const b of V3.lmBlink)if(b.material&&b.material.emissiveIntensity!=null)b.visible=on||b.material===V3.lmM.blueL;}};}

/* ---------- 구급차 ---------- */
function v3AmbBuild(){const T=V3.T,mm=v3ModMats(),m=MU,L=v3LmMats();const g=new T.Group();
  const BODY=V3.ambBody||(V3.ambBody=new T.MeshStandardMaterial({color:'#d9d8d0',roughness:.6,flatShading:true}));
  const add=(geo,mat,x,y,z)=>{const o=new T.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=true;g.add(o);return o;};
  const B=(w,h,d,mat,x,y,z)=>add(new T.BoxGeometry(w,h,d),mat,x,y,z);
  B(5.6*m,.3*m,2.1*m,mm.tire||L.dark,0,.7*m,0);
  B(3.4*m,2.2*m,2.2*m,BODY,-.9*m,1.95*m,0);                            // 환자칸
  B(1.6*m,1.5*m,2.1*m,BODY,1.6*m,1.6*m,0);B(.06*m,.7*m,1.9*m,mm.glass||L.glass,2.42*m,1.95*m,0).rotation.z=-.2;
  const st=B(5.0*m,.25*m,2.25*m,V3.ambStripe||(V3.ambStripe=new T.MeshStandardMaterial({color:'#c8322c'})),0,1.15*m,0);st.userData.body=1;   // 세력 띠(몸체 색으로 물듦)
  for(const s of [-1,1]){B(.05*m,1.0*m,.3*m,L.red,-.9*m,2.1*m,s*1.12*m);B(.05*m,.3*m,1.0*m,L.red,-.9*m,2.1*m,s*1.12*m).rotation.x=Math.PI/2;}
  B(1.0*m,.3*m,.3*m,L.red,-.9*m,3.1*m,0);B(.3*m,.3*m,1.0*m,L.red,-.9*m,3.1*m,0);
  const lb=B(.4*m,.2*m,1.4*m,L.blueL,1.6*m,2.45*m,0);
  for(const [x,z] of [[1.7,1],[1.7,-1],[-1.8,1],[-1.8,-1]]){const w=add(new T.CylinderGeometry(.45*m,.45*m,.35*m,12),mm.tire||L.dark,x*m,.45*m,z*1.05*m);w.rotation.x=Math.PI/2;}
  return g;}
{const _vb=v3VehBuild;v3VehBuild=function(ty){return ty==='amb'?v3AmbBuild():_vb(ty);};}
if(typeof v3UnitTag==='function'){const _ut=v3UnitTag;v3UnitTag=function(u){let h=_ut(u);if(u.type==='amb'){const n=(u.load||[]).length;h+=`<em title="실은 부상자">환자 ${n}/${typeof AMB_CAP!=='undefined'?AMB_CAP:4}</em>`;}return h;};}
