/* ===================== 공중전 연출 =====================
   공격헬기·FPV 드론·대공포 차량 모형, 대공미사일과 플레어, 빗나가는 대공 사격, 격추되어 떨어지는 기체,
   전투기 진입과 폭탄, 전자전팀의 방해 반경 표시. 시간은 게임 시간(G.time)으로 재서 배속·일시정지를 따른다. */
Object.assign(FXH,{jet:j=>v3Jet(j),jetDown:(j,x,z)=>{j.down=[x,z];},bomb:(r,c)=>v3Bomb(r,c),crash:cr=>v3Crash(cr),fpvBoom:(u,e)=>v3FpvBoom(u,e),aaShot:(e,j)=>v3AaAtJet(e,j),launch:(u,f)=>v3Launch(u,f)});
const AIRC={body:'#3d4038',dark:'#22231f'};
function v3AirMats(){if(V3.airM)return V3.airM;const T=V3.T;
  V3.airM={body:new T.MeshStandardMaterial({color:AIRC.body,roughness:.75,metalness:.2,flatShading:true}),dark:V3.M.dark,glass:new T.MeshStandardMaterial({color:'#2b3a40',roughness:.2,metalness:.6}),
    jet:new T.MeshStandardMaterial({color:'#7d8288',roughness:.6,metalness:.3,flatShading:true}),trail:new T.MeshBasicMaterial({color:'#d9d3c6',transparent:true,opacity:.5,depthWrite:false})};
  return V3.airM;}
/* ---------- 모형 ---------- */
function v3AirModel(u,g){const T=V3.T,M=v3AirMats();const B=(w,h,d,x,y,z,m,par)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),m||M.body);o.position.set(x,y,z);o.castShadow=true;(par||g).add(o);return o;};
  const Cy=(r1,r2,h,x,y,z,m,par)=>{const o=new T.Mesh(new T.CylinderGeometry(r1,r2,h,8),m||M.body);o.position.set(x,y,z);o.rotation.z=Math.PI/2;o.castShadow=true;(par||g).add(o);return o;};
  if(u.type==='gunship'){// 좁은 동체, 앞뒤로 앉는 조종석, 짧은 날개의 로켓 포드, 기수 아래 기관포
    B(.6,.12,.11,0,0,0);B(.18,.09,.09,.36,-.01,0);B(.3,.07,.075,.17,.085,0,M.glass);B(.24,.07,.2,-.04,.08,0);
    B(.52,.05,.05,-.54,.02,0);B(.07,.17,.02,-.79,.09,0);B(.05,.015,.2,-.72,.02,0);
    B(.09,.02,.42,-.02,-.03,0);for(const s of [-1,1]){Cy(.03,.03,.15,0,-.07,s*.17,M.dark);Cy(.022,.022,.12,.0,-.07,s*.1,M.body);}
    Cy(.012,.012,.12,.36,-.08,0,M.dark);B(.035,.04,.035,.31,-.06,0,M.dark);
    const hub=new T.Group();hub.position.set(0,.14,0);hub.userData.rotor=1;g.add(hub);
    for(let i=0;i<4;i++){const bl=new T.Mesh(new T.BoxGeometry(.6,.008,.035),M.dark);bl.geometry.translate(.3,0,0);bl.rotation.y=i*Math.PI/2;hub.add(bl);}
    const disc=new T.Mesh(new T.CircleGeometry(.6,24),new T.MeshBasicMaterial({color:'#1d1c1a',transparent:true,opacity:.22,depthWrite:false,side:T.DoubleSide}));disc.rotation.x=-Math.PI/2;disc.position.y=.14;g.add(disc);
    const tr=new T.Mesh(new T.CircleGeometry(.08,10),new T.MeshBasicMaterial({color:'#1d1c1a',transparent:true,opacity:.35,depthWrite:false,side:T.DoubleSide}));tr.position.set(-.79,.1,.02);g.add(tr);
    g.scale.setScalar(.58);return true;}
  if(u.type==='fpv'){// X자 프레임, 배터리, 아래에 매단 탄두. 실제보다 크게 그린다
    for(const a of [Math.PI/4,-Math.PI/4]){const o=B(.13,.008,.012,0,0,0,M.dark);o.rotation.y=a;}
    B(.04,.018,.03,0,.01,0,M.body);B(.03,.012,.022,-.005,.025,0,M.dark);Cy(.012,.009,.07,.01,-.016,0,new T.MeshStandardMaterial({color:'#6e6a50',flatShading:true}));
    for(const [a,b] of [[-.046,-.046],[.046,-.046],[-.046,.046],[.046,.046]]){const rt=new T.Mesh(new T.CylinderGeometry(.03,.03,.003,10),new T.MeshBasicMaterial({color:'#1d1c1a',transparent:true,opacity:.45,depthWrite:false}));rt.position.set(a,.012,b);rt.userData.rotor=1;g.add(rt);}
    return true;}
  return false;}
// 대공포 차량: 픽업 짐칸에 연장 기관포
function v3ZuBuild(){const T=V3.T,M=V3.M;const g=v3VehBuild('tech');let tur=null;g.traverse(o=>{if(o.userData.turret)tur=o;});
  if(tur){for(const c of [...tur.children])tur.remove(c);const m=MU;const add=(geo,mat,x,y,z)=>{const o=new T.Mesh(geo,mat);o.position.set(x,y,z);tur.add(o);return o;};
    add(new T.BoxGeometry(1.1*m,.35*m,1.3*m),M.steel,0,.2*m,0);add(new T.BoxGeometry(.5*m,.55*m,.08*m),M.dark,.1*m,.6*m,.6*m);add(new T.BoxGeometry(.5*m,.55*m,.08*m),M.dark,.1*m,.6*m,-.6*m);
    for(const s of [-1,1]){const b=add(new T.CylinderGeometry(.06*m,.07*m,2.4*m,8),M.steel,1.3*m,.65*m,s*.28*m);b.rotation.z=Math.PI/2-.35;add(new T.BoxGeometry(.4*m,.3*m,.18*m),M.dark,.2*m,.55*m,s*.28*m);}}
  return g;}
/* 높이: 헬기는 건물 위를 낮게, FPV는 지붕 높이로 다니다 표적에 내리꽂는다 */
function v3AirY(u){const top=(x,z)=>{let h=0;const r0=Math.floor(z),c0=Math.floor(x);for(let r=r0-1;r<=r0+1;r++)for(let c=c0-1;c<=c0+1;c++)if(inb(r,c))h=Math.max(h,v3Top(r,c));return h;};
  if(u.type==='gunship'){const leave=u.air&&u.air.leave;return Math.max(1.4,top(u.x,u.z)+.8)+(leave?.8:0);}
  if(u.type==='fpv'){const cr=Math.max(.9,v3Top(u.r,u.c)+.7);const A=u.air;if(!A||!A.dive)return cr;const e=G.units.find(z=>z.id===u.tgt);if(!e)return cr;
    const ty=(cell(e.r,e.c).t==='bldg'?v3Top(e.r,e.c):0)+.06;const k=Math.pow(Math.min(1,(A.dd||0)/1.3),.45);return ty+(cr-ty)*k;}// 거의 수직으로 내리꽂는다
  return null;}

/* ---------- 사격 ---------- */
// 하늘을 향한 사격·대공미사일·헬기 로켓은 여기서 그린다. 처리했으면 true.
function v3AirFire(a,r,c,d,shot){if(!V3.on)return false;const ta=UT[a.type];
  if(a.type==='aa'&&d){v3Missile(a,d,shot&&shot.hits>0);sfx('launch',.8);return true;}
  if(a.type==='gunship'&&d){v3Rockets(a,d,shot);return true;}
  if(d&&UT[d.type].fly){v3FlakTracers(a,d,shot);sfx(a.type==='zu'?'flak':'shot',.7);return true;}
  return false;}
const v3P=u=>{const o=V3.uo.get(u.id);if(o)return [o.position.x,o.position.y+(UT[u.type].fly?0:.1),o.position.z];return [u.x,v3UnitY(u)+.1,u.z];};
function v3Trail(x,y,z,col,sz,dur){const T=V3.T;const s=new T.Sprite(new T.SpriteMaterial({map:V3.puff,color:col||'#cfc8bb',transparent:true,depthWrite:false,opacity:.55}));s.position.set(x,y,z);V3.G.fx.add(s);
  V3.fx.push({o:s,t0:performance.now(),dur:dur||1600,upd:(o,k)=>{o.scale.setScalar((sz||.08)*(1+k*3));o.material.opacity=.55*(1-k);o.position.y=y+k*.1;}});}
// 빗나가는 사격: 예광탄이 기체 주변을 스쳐 하늘로 지나간다
function v3FlakTracers(a,d,shot){const T=V3.T;const [x1,y1,z1]=v3P(a);const [x2,y2,z2]=v3P(d);const n=a.type==='zu'?8:a.type==='mg'||a.type==='ifv'||a.type==='hmv'?4:2;const hits=shot?shot.hits:0;const tc=a.nat===G.viewer?'#8dff6e':'#ff5a3c';
  for(let i=0;i<n;i++){const hit=i<hits;const sp=hit?.04:.25+Math.random()*.45;const ox=(Math.random()-.5)*2*sp,oy=(Math.random()-.2)*2*sp,oz=(Math.random()-.5)*2*sp;
    const ex=x2+ox,ey=y2+oy,ez=z2+oz;const over=hit?1:2.2;const o=new T.Mesh(V3.tracerG||(V3.tracerG=new T.BoxGeometry(.012,.012,.35)),new T.MeshBasicMaterial({color:tc,blending:T.AdditiveBlending,transparent:true,depthWrite:false}));o.userData.keepGeo=1;
    o.lookAt(ex-x1,ey-y1,ez-z1);V3.G.fx.add(o);const L=Math.hypot(ex-x1,ey-y1,ez-z1);
    V3.fx.push({o,t0:performance.now()+i*(a.type==='zu'?45:70),dur:(140+L*16)*over,upd:(sh,k)=>{const q=k*over;sh.position.set(x1+(ex-x1)*q,y1+(ey-y1)*q,z1+(ez-z1)*q);}});
    if(hit)setTimeout(()=>{v3Burst(ex,ey,ez,.22,'#ffd27a',0,.2);},(140+L*16)+i*60);
    else if(a.type==='zu'&&Math.random()<.5)setTimeout(()=>{v3Burst(ex+(ex-x1)*.3,ey+(ey-y1)*.3+.3,ez+(ez-z1)*.3,.3,'#ffb060',1,0);},(140+L*16)*1.6+i*45);}
  v3Burst(x1+(x2-x1)*.02,y1,z1+(z2-z1)*.02,a.type==='zu'?.3:UT[a.type].cls==='inf'?.08:.22,'#ffd27a',0,UT[a.type].cls==='inf'?.15:.6);}
// 대공미사일: 연기 꼬리를 끌며 휘어 날아간다. 빗나가면 지나쳐서 공중에서 터진다.
function v3Missile(a,d,hit){const T=V3.T;const [x1,y1,z1]=v3P(a);const t0=performance.now();const tgt=()=>V3.uo.get(d.id)?v3P(d):null;
  const s0=tgt()||[d.x,3,d.z];const L=Math.hypot(s0[0]-x1,s0[1]-y1,s0[2]-z1);const dur=500+L*110;const side=(Math.random()-.5)*1.2;const miss=hit?0:1;
  const m=new T.Mesh(V3.misG||(V3.misG=new T.BoxGeometry(.06,.014,.014)),new T.MeshBasicMaterial({color:'#fff1c8'}));m.userData.keepGeo=1;V3.G.fx.add(m);let last=0,end=null;
  // 플레어: 헬기가 막 플레어를 뿌렸으면 미사일은 플레어 쪽으로 빠진다
  const flare=d.flareT!=null&&G.time-d.flareT<.3;
  V3.fx.push({o:m,t0,dur:dur*(miss?1.35:1),upd:(o,k)=>{const p=tgt()||end||s0;end=p;const q=k*(miss?1.35:1);
      const bx=p[0]+(miss?(flare?.6:1.2)*side:0),by=p[1]+(miss?(flare?-.7:.4):0),bz=p[2]+(miss?(flare?.4:-.8)*side:0);
      const x=x1+(bx-x1)*q+Math.sin(q*Math.PI)*side*.6,y=y1+(by-y1)*q+Math.sin(q*Math.PI)*.8,z=z1+(bz-z1)*q;
      o.lookAt(x+(bx-x1),y+(by-y1),z+(bz-z1));o.rotateY(Math.PI/2);o.position.set(x,y,z);const now=performance.now();if(now-last>35){last=now;v3Trail(x,y,z,'#d8d2c4',.06,1800);}
      if(k>=.98){if(hit){v3Burst(x,y,z,.7,'#ffb060',2,2);V3.shake=Math.max(V3.shake,.05);}else v3Burst(x,y,z,.45,'#ffc070',1,1);}}});
  if(flare)v3Flares(d);}
// 플레어: 밝은 불꽃 여러 개가 아래로 퍼지며 떨어진다
function v3Flares(d){const T=V3.T;const [x,y,z]=v3P(d);for(let i=0;i<8;i++){const s=new T.Sprite(new T.SpriteMaterial({map:V3.puff,color:'#fff0b0',blending:T.AdditiveBlending,transparent:true,depthWrite:false}));V3.G.fx.add(s);
  const a=i/8*6.283+Math.random()*.4,v=.5+Math.random()*.5;let last=0;V3.fx.push({o:s,t0:performance.now()+i*40,dur:2200,upd:(o,k)=>{const px=x+Math.cos(a)*v*k*1.6,pz=z+Math.sin(a)*v*k*1.6,py=y-k*k*1.6+k*.3;o.position.set(px,py,pz);o.scale.setScalar(.14*(1-k*.6));o.material.opacity=1-k;
    const now=performance.now();if(now-last>90){last=now;v3Trail(px,py,pz,'#bdb6a8',.05,1400);}}});}}
// 공격헬기: 로켓 두 발(연기 꼬리)과 기관포 예광탄
function v3Rockets(a,d,shot){const T=V3.T;const [x1,y1,z1]=v3P(a);const [x2,y2,z2]=v3P(d);sfx('launch',.7);
  for(let i=0;i<2;i++){const sx=(Math.random()-.5)*.3,sz=(Math.random()-.5)*.3;const hit=shot&&shot.hits>i;const ex=x2+(hit?0:sx*2),ez=z2+(hit?0:sz*2),ey=hit?y2:Math.max(0,y2-.05);
    const m=new T.Mesh(V3.misG||(V3.misG=new T.BoxGeometry(.06,.014,.014)),new T.MeshBasicMaterial({color:'#ffd9a0'}));m.userData.keepGeo=1;V3.G.fx.add(m);let last=0;const L=Math.hypot(ex-x1,ey-y1,ez-z1);
    V3.fx.push({o:m,t0:performance.now()+i*160,dur:250+L*60,upd:(o,k)=>{const x=x1+(ex-x1)*k,y=y1+(ey-y1)*k,z=z1+(ez-z1)*k;o.position.set(x,y,z);o.lookAt(ex,ey,ez);o.rotateY(Math.PI/2);const now=performance.now();if(now-last>30){last=now;v3Trail(x,y,z,'#cfc8bb',.07,1500);}
      if(k>=.97&&!o.userData.done){o.userData.done=1;v3Burst(ex,ey,ez,.7,'#ff8a3d',3,1.4);dsScar('scorch',ex,ez,.1);dsSpray(ex,ey,ez,22,.5);dsDust(ex,ez,.8,5000,3);V3.shake=Math.max(V3.shake,.05);sfx('hit',.7);}}});}
  for(let i=0;i<3;i++){const o=new T.Mesh(V3.tracerG||(V3.tracerG=new T.BoxGeometry(.012,.012,.35)),new T.MeshBasicMaterial({color:'#ffcf7a',blending:T.AdditiveBlending,transparent:true,depthWrite:false}));o.userData.keepGeo=1;
    const ex=x2+(Math.random()-.5)*.3,ez=z2+(Math.random()-.5)*.3;o.lookAt(ex-x1,y2-y1,ez-z1);V3.G.fx.add(o);V3.fx.push({o,t0:performance.now()+300+i*80,dur:220,upd:(sh,k)=>{sh.position.set(x1+(ex-x1)*k,y1+(y2-y1)*k,z1+(ez-z1)*k);if(k>.95)v3Impact(ex,y2-.05,ez);}});}
  v3Burst(x1,y1-.05,z1,.25,'#ffd27a',0,.5);}

/* ---------- 격추·추락 ---------- */
function v3AirKill(u){if(!V3.on)return;const o=V3.uo.get(u.id);if(!o)return;const T=V3.T;const heli=!!UT[u.type].heli;const w=o.userData.body.clone();
  w.traverse(m=>{if(m.isMesh){m.userData.keepGeo=1;m.userData.keepMat=1;}});const x0=o.position.x,y0=o.position.y,z0=o.position.z;w.position.set(x0,y0,z0);w.rotation.y=o.userData.body.rotation.y;
  V3.G.fx.add(w);const t0=G.time||0,fall=heli?2.2:1;const gy=v3TopAt(x0,z0)+(heli?.08:.02);const dx=(Math.random()-.5)*(heli?.8:.4),dz=(Math.random()-.5)*(heli?.8:.4);let last=0,landed=false;
  v3Burst(x0,y0,z0,heli?1:.35,'#ff8a3d',heli?3:1,heli?3:.6);if(heli){V3.shake=Math.max(V3.shake,.08);sfx('boom',.8);}
  V3.fx.push({o:w,t0:performance.now(),dur:heli?120000:fall*1000+400,upd:(ob)=>{const t=(G.time||0)-t0;const k=Math.min(1,t/fall);const now=performance.now();
    if(!landed){ob.position.set(x0+dx*k,y0+(gy-y0)*k*k,z0+dz*k);if(heli){ob.rotation.y+=.016*(3+k*10);ob.rotation.z=k*.5;}else{ob.rotation.x+=.2;ob.rotation.z+=.13;}
      if(now-last>(heli?50:80)){last=now;v3Trail(ob.position.x,ob.position.y,ob.position.z,heli?'#3b3833':'#5a554d',heli?.16:.06,heli?3200:1500);if(heli&&Math.random()<.5)v3Burst(ob.position.x,ob.position.y,ob.position.z,.3,'#ff7a2a',0,0);}
      if(k>=1){landed=true;const X=ob.position.x,Z=ob.position.z;
        if(heli){v3Burst(X,gy,Z,2,'#ff6a1a',8,6);dsSpray(X,gy,Z,120,1.3);dsScar('crater',X,Z,.35);dsFires(X,Z,4,60000,.6);dsDust(X,Z,2,16000,10);dsColumn(X,Z,1.2);V3.shake=Math.max(V3.shake,.3);
          ob.rotation.x=.3;ob.rotation.z=1.1;ob.position.y=gy-.02;ob.traverse(m=>{if(m.isMesh){m.material=V3.wreckM||(V3.wreckM=new T.MeshStandardMaterial({color:'#262421',roughness:1}));}});}
        else{v3Burst(X,gy,Z,u.type==='fpv'?.6:.35,'#ffa050',1,u.type==='fpv'?1:.3);dsScar('scorch',X,Z,.06);ob.visible=false;}}}
    else if(heli&&now-last>400){last=now;v3Trail(ob.position.x+(Math.random()-.5)*.2,gy+.2,ob.position.z,'#2f2c28',.2,5000);}}});}
// 전투기 추락: 떨어진 곳에서 큰 폭발
function v3Crash(cr){if(!V3.on||cr.kind!=='jet')return;const y=v3TopAt(cr.x,cr.z);v3Burst(cr.x,y+.2,cr.z,2.6,'#ff6a1a',10,7);dsSpray(cr.x,y+.2,cr.z,160,1.6);dsScar('crater',cr.x,cr.z,.45);dsFires(cr.x,cr.z,5,60000,1);dsColumn(cr.x,cr.z,2);V3.shake=Math.max(V3.shake,.35);}

/* ---------- 전투기 ---------- */
function v3JetModel(){const T=V3.T,M=v3AirMats();const g=new T.Group();const add=(geo,x,y,z,m)=>{const o=new T.Mesh(geo,m||M.jet);o.position.set(x,y,z);o.castShadow=true;g.add(o);return o;};
  add(new T.CylinderGeometry(.07,.09,1.1,8),0,0,0).rotation.z=Math.PI/2;add(new T.ConeGeometry(.07,.32,8),.7,0,0).rotation.z=-Math.PI/2;
  const wing=new T.Shape();wing.moveTo(.25,0);wing.lineTo(-.3,.55);wing.lineTo(-.42,.55);wing.lineTo(-.3,0);wing.lineTo(-.42,-.55);wing.lineTo(-.3,-.55);wing.closePath();
  const wg=new T.ExtrudeGeometry(wing,{depth:.02,bevelEnabled:false});wg.rotateX(Math.PI/2);add(wg,0,.01,0);
  const tail=new T.Shape();tail.moveTo(0,0);tail.lineTo(-.18,.28);tail.lineTo(-.26,.28);tail.lineTo(-.22,0);tail.closePath();add(new T.ExtrudeGeometry(tail,{depth:.02,bevelEnabled:false}),-.3,.03,-.01);
  add(new T.BoxGeometry(.2,.05,.07),.35,.07,0,M.glass);return g;}
// 전투기: 세력 쪽 가장자리에서 낮게 들어와 G.time이 j.t일 때 목표 위를 지나며 폭탄을 놓는다
function v3Jet(j){if(!V3.on)return;const T=V3.T;const [x,z]=v3x(j.r,j.c);const e=airEdge(j.n,x,z);let ux=x-e[0],uz=z-e[1];const L=Math.hypot(ux,uz)||1;ux/=L;uz/=L;
  const V=9,H=4.2;const g=v3JetModel();g.rotation.y=Math.atan2(-uz,ux);V3.G.fx.add(g);sfx('launch',.5);let last=0,bomb=null,boomed=false;
  V3.fx.push({o:g,t0:performance.now(),dur:1e9,upd:(o)=>{const t=(G.time||0)-j.t;let px=x+ux*V*t,pz=z+uz*V*t,py=H+Math.max(0,-t)*.25;
      if(j.down&&t>0){const k=Math.min(1,t/1.6);const [cx,cz]=j.down;px=x+(cx-x)*k;pz=z+(cz-z)*k;py=H-(H-v3TopAt(cx,cz))*k*k;o.rotation.x+=.12;
        const now=performance.now();if(now-last>40){last=now;v3Trail(px,py,pz,'#2f2c28',.18,3000);if(Math.random()<.6)v3Burst(px,py,pz,.4,'#ff7a2a',0,0);}if(k>=1){o.visible=false;V3.G.fx.remove(o);return;}}
      o.position.set(px,py,pz);
      // 폭탄: 지나가기 0.8초 전에 떨어져 목표에 꽂힌다
      if(!j.down&&t>-.8&&!bomb&&t<0){bomb=new T.Mesh(new T.CylinderGeometry(.025,.025,.14,6),V3.M.dark);bomb.rotation.z=Math.PI/2;bomb.rotation.y=o.rotation.y;V3.G.fx.add(bomb);bomb.userData.p=[px,py,pz];}
      if(bomb){const k=Math.min(1,(t+.8)/.8);const [bx,by,bz]=bomb.userData.p;bomb.position.set(bx+(x-bx)*k,by+(v3TopAt(x,z)-by)*k*k,bz+(z-bz)*k);if(k>=1||j.down){V3.G.fx.remove(bomb);bomb.geometry.dispose();bomb=null;}}
      if(Math.hypot(px-x,pz-z)>N*1.2&&t>0){o.visible=false;V3.G.fx.remove(o);}}});}
function v3Bomb(r,c){if(!V3.on)return;const [x,z]=v3x(r,c);
  v3Burst(x,v3Top(r,c)*.6+.3,z,2.4,'#ff6a1a',10,7);dsColumn(x,z,2.2);dsDust(x,z,3.6,26000,40);dsSpray(x,v3Top(r,c)*.5+.3,z,180,1.7);dsScar('crater',x,z,.45);dsFires(x,z,5,50000,1.2);V3.shake=Math.max(V3.shake,.35);sfx('boom');}
// 대공 사격이 지나가는 전투기를 노린다
function v3AaAtJet(e,j){if(!V3.on)return;const [x,z]=v3x(j.r,j.c);const T=V3.T;
  const [x1,y1,z1]=v3P(e);const m=new T.Mesh(V3.misG||(V3.misG=new T.BoxGeometry(.06,.014,.014)),new T.MeshBasicMaterial({color:'#fff1c8'}));m.userData.keepGeo=1;V3.G.fx.add(m);let last=0;
  const ex=x+(Math.random()-.5)*2,ez=z+(Math.random()-.5)*2,ey=4.4;V3.fx.push({o:m,t0:performance.now(),dur:1300,upd:(o,k)=>{const px=x1+(ex-x1)*k,py=y1+(ey-y1)*Math.sqrt(k),pz=z1+(ez-z1)*k;o.position.set(px,py,pz);const now=performance.now();if(now-last>35){last=now;v3Trail(px,py,pz,'#d8d2c4',.06,2000);}if(k>.97&&!o.userData.d){o.userData.d=1;v3Burst(px,py,pz,.5,'#ffc070',1,1);}}});}
function v3FpvBoom(u,e){if(!V3.on)return;const o=V3.uo.get(e.id);const x=o?o.position.x:e.x,z=o?o.position.z:e.z;const y=(o?o.position.y:v3UnitY(e))+.05;
  v3Burst(x,y,z,.9,'#ff8a3d',3,2.2);dsSpray(x,y,z,40,.6);dsScar('scorch',x,z,.12);dsDust(x,z,1,6000,4);V3.shake=Math.max(V3.shake,.08);sfx('boom',.6);}

/* ---------- 매 프레임: 헬기 기울기, 플레어, 전파 방해 반경, 흔들리는 드론 ---------- */
function v3AirFrame(now,dt){if(!G)return;const T=V3.T;v3Reticles(now);v3Links();
  for(const o of V3.uo.values()){const u=o.userData.u;if(!u)continue;const t=UT[u.type];
    if(t.heli){o.userData.body.rotation.z=-.14;if(u.flareT!=null&&o.userData.flT!==u.flareT){o.userData.flT=u.flareT;v3Flares(u);}}
    if(t.kami){o.userData.body.rotation.z=u.air&&u.air.dive?-.5:-.15;if(u.jam){o.userData.body.rotation.x=Math.sin(now/40)*.4;}else o.userData.body.rotation.x=0;}
    if(t.jam){let rg=o.userData.jamRing;if(!rg){rg=new T.Mesh(new T.RingGeometry(t.jam-.05,t.jam,64),new T.MeshBasicMaterial({color:mapCol(u.nat),transparent:true,opacity:.16,depthWrite:false}));rg.rotation.x=-Math.PI/2;rg.renderOrder=5;o.add(rg);o.userData.jamRing=rg;}
      rg.position.y=o.userData.ring.position.y+.01;rg.material.opacity=.1+.08*Math.sin(now/300);}}}

/* ---------- 추적 레티클: 아군 FPV가 노리는 표적, 아군 대공이 쫓는 적 기체에 붉은 모서리 괄호 ---------- */
function v3RetTex(){if(V3.retTex)return V3.retTex;V3.retTex=v3Tex(64,64,(g,w,h)=>{g.strokeStyle='#ff3b2f';g.lineWidth=4;const a=6,b=20;
  for(const [x,y,sx,sy] of [[a,a,1,1],[w-a,a,-1,1],[a,h-a,1,-1],[w-a,h-a,-1,-1]]){g.beginPath();g.moveTo(x,y+sy*b);g.lineTo(x,y);g.lineTo(x+sx*b,y);g.stroke();}
  g.lineWidth=2;g.beginPath();g.moveTo(w/2-5,h/2);g.lineTo(w/2+5,h/2);g.moveTo(w/2,h/2-5);g.lineTo(w/2,h/2+5);g.stroke();});return V3.retTex;}
function v3Reticles(now){const T=V3.T,vn=G.viewer;const want=[];
  for(const u of G.units){if(u.nat!==vn)continue;const t=UT[u.type];
    if(t.kami&&u.tgt!=null){const e=G.units.find(z=>z.id===u.tgt);if(e)want.push([e,u.air&&u.air.dive?1:.6]);}
    if((t.aa||u.type==='zu')&&u.lastShot&&(G.time-u.lastShot.t)<2){const e=G.units.find(z=>z.id===u.lastShot.tgt);if(e&&UT[e.type].fly)want.push([e,.9]);}}
  V3.rets=V3.rets||[];while(V3.rets.length<want.length){const s=new T.Sprite(new T.SpriteMaterial({map:v3RetTex(),transparent:true,depthTest:false,depthWrite:false}));s.renderOrder=9;V3.G.fx.add(s);V3.rets.push(s);}
  V3.rets.forEach((s,i)=>{if(!s.parent)V3.G.fx.add(s);const w=want[i];if(!w){s.visible=false;return;}const o=V3.uo.get(w[0].id);if(!o){s.visible=false;return;}s.visible=true;
    const big=UT[w[0].type].cls==='veh'||UT[w[0].type].heli;const p=1+Math.sin(now/90)*.06;s.position.set(o.position.x,o.position.y+(UT[w[0].type].fly?0:.08),o.position.z);s.scale.setScalar((big?.75:.45)*p*(V3.cs.d/14));s.material.opacity=w[1];});}

/* ---------- 드론팀: 이륙 먼지와 조종 신호선(아군만) ---------- */
function v3Launch(u,f){if(!V3.on)return;const o=V3.uo.get(u.id);const x=o?o.position.x:u.x,z=o?o.position.z:u.z;dsDust(x,z,.35,1400,2,'#9c9283');}
function v3Links(){const T=V3.T,vn=G.viewer;const L=[];for(const f of G.units){if(f.op==null||f.nat!==vn)continue;const a=V3.uo.get(f.op),b=V3.uo.get(f.id);if(a&&b)L.push(a.position.x,a.position.y+.12,a.position.z,b.position.x,b.position.y,b.position.z);}
  let ln=V3.linkLn;if(!ln||!ln.parent){ln=V3.linkLn=new T.LineSegments(new T.BufferGeometry(),new T.LineDashedMaterial({color:'#8dff6e',dashSize:.08,gapSize:.06,transparent:true,opacity:.45,depthWrite:false}));ln.userData.keepGeo=1;ln.renderOrder=7;V3.G.fx.add(ln);}
  ln.geometry.setAttribute('position',new T.Float32BufferAttribute(L,3));ln.computeLineDistances();ln.visible=L.length>0;}
