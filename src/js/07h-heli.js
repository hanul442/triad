/* ===================== 수송 헬기 연출 =====================
   지도 밖에서 날아와 목표 위에서 내려앉고(로터 바람에 먼지가 밀려남), 분대를 내려놓은 뒤 다시 떠난다.
   시간은 게임 시간(G.time)으로 재서 배속·일시정지를 따라간다. 로터 원반이 그림자를 드리운다. */
function v3HeliModel(){const T=V3.T;const g=new T.Group();const body=new T.MeshStandardMaterial({color:'#7f7865',roughness:.85,flatShading:true});const dk=V3.M.dark;
  const B=(w,h,d,x,y,z,m)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),m||body);o.position.set(x,y,z);o.castShadow=true;g.add(o);return o;};
  B(.5,.16,.2,0,.17,0);B(.22,.1,.16,.3,.19,0);B(.14,.09,.14,.42,.2,0,V3.M.glass||dk);// 동체·앞부분·조종석 유리
  B(.42,.05,.05,-.42,.2,0);B(.05,.14,.03,-.6,.26,0);B(.03,.02,.16,-.6,.3,0);// 꼬리 붐·수직핀·수평핀
  B(.12,.05,.22,-.05,.27,0,dk);B(.4,.02,.02,0,.06,.09,dk);B(.4,.02,.02,0,.06,-.09,dk);for(const z of [-.09,.09])for(const x of [-.14,.12])B(.02,.07,.02,x,.1,z,dk);// 엔진·스키드
  const hub=new T.Group();hub.position.set(.02,.32,0);g.add(hub);
  for(let i=0;i<4;i++){const bl=B(.72,.008,.03,.36,0,0,dk);bl.position.set(0,0,0);bl.geometry.translate(.36,0,0);bl.rotation.y=i*Math.PI/2;hub.add(bl);g.remove(bl);}
  const disc=new T.Mesh(new T.CircleGeometry(.72,24),new T.MeshBasicMaterial({color:'#1d1c1a',transparent:true,opacity:.28,depthWrite:false,side:T.DoubleSide}));disc.rotation.x=-Math.PI/2;disc.position.y=.315;disc.castShadow=true;g.add(disc);
  const tr=new T.Mesh(new T.CircleGeometry(.09,12),new T.MeshBasicMaterial({color:'#1d1c1a',transparent:true,opacity:.35,depthWrite:false,side:T.DoubleSide}));tr.rotation.y=Math.PI/2;tr.position.set(-.6,.26,.02);g.add(tr);
  g.userData.hub=hub;return g;}
function v3Heli(r,c,n){if(!V3.on)return;const T=V3.T;const [x,z]=v3x(r,c);const y0=v3Top(r,c);const h=v3HeliModel();V3.G.fx.add(h);
  const dir=[[-1,0],[1,0],[0,-1],[0,1]][n??0]||[-1,0];const far=N*.9;const sx=x+dir[0]*far,sz=z+dir[1]*far;const ang=Math.atan2(-(z-sz),x-sx);h.rotation.y=ang;
  const t0=G.time,FLY=2.4,DESC=1.6,STAY=HELI_T-FLY-DESC+1.2,LIFT=1.2,OUT=2.6;const TOTAL=FLY+DESC+STAY+LIFT+OUT;let dustT=0;
  // 대공에 맞은 헬기(05f3-aa): 격추되면 모형을 지우고(추락 연출은 잔해가 맡는다), 투입을 포기하면 그 자리에서 돌아 나간다
  let H=null,ab=null;
  if(typeof sndTrack==='function')sndTrack(h,'rotor');
  V3.fx.push({o:h,t0:performance.now(),dur:1e9,upd:(o)=>{const t=G.time-t0;const now=performance.now();o.userData.hub.rotation.y=now/14;
    let px=x,pz=z,py=y0+.06,tilt=0;
    if(!H){H=(G.trh||[]).find(e=>e.n===n&&e.r===r&&e.c===c&&!e.vis&&Math.abs(e.t0-t0)<.5)||null;if(H)H.vis=1;}
    if(H&&H.down){// 격추: 불붙어 돌면서 떨어지고, 땅에 닿으면 폭발과 불
      if(!ab){ab={t:t,x:o.position.x,y:o.position.y,z:o.position.z,gy:v3TopAt(o.position.x,o.position.z)};v3Burst(ab.x,ab.y+.2,ab.z,1.2,'#ff7a2a',5,3);}
      const k=Math.min(1,(t-ab.t)/1.6);o.position.set(ab.x,ab.y+(ab.gy+.1-ab.y)*k*k,ab.z);o.rotation.y+=.25;o.rotation.z=.5*k;
      if(now-dustT>90){dustT=now;v3Trail(o.position.x,o.position.y+.2,o.position.z,'#3a3430',.18,2600);}
      if(k>=1){o.visible=false;v3Burst(ab.x,ab.gy+.2,ab.z,2,'#ff6a1a',8,5);dsSpray(ab.x,ab.gy+.2,ab.z,100,1.2);dsScar('crater',ab.x,ab.z,.35);dsFires(ab.x,ab.z,3,25000,1);dsColumn(ab.x,ab.z,1.5);V3.shake=Math.max(V3.shake,.25);return false;}
      return;}
    if(H&&H.abort){if(!ab)ab={t:t,x:o.position.x,y:o.position.y,z:o.position.z};const k=Math.min(1,(t-ab.t)/OUT),e=k*k;
      if(k>=1){o.visible=false;return false;}o.position.set(ab.x+(sx-x)*e*1.2,Math.max(ab.y,y0+.3)+e*2.5,ab.z+(sz-z)*e*1.2);o.rotation.y=ang+Math.PI;o.rotation.z=-.3;return;}
    if(t<FLY){const k=t/FLY,e=1-Math.pow(1-k,2);px=sx+(x-sx)*e;pz=sz+(z-sz)*e;py=4.2-e*.6;tilt=.25*(1-k);}
    else if(t<FLY+DESC){const k=(t-FLY)/DESC;py=3.6-(3.6-y0-.06)*(1-Math.pow(1-k,2.2));}
    else if(t<FLY+DESC+STAY){py=y0+.06;}
    else if(t<FLY+DESC+STAY+LIFT){const k=(t-FLY-DESC-STAY)/LIFT;py=y0+.06+k*k*2.4;}
    else if(t<TOTAL){const k=(t-FLY-DESC-STAY-LIFT)/OUT,e=k*k;px=x+(x-sx)*e*1.2;pz=z+(z-sz)*e*1.2;py=2.46+e*2.5;tilt=-.25*Math.min(1,k*3);}
    else{o.visible=false;return false;}
    o.position.set(px,py,pz);o.rotation.z=tilt;o.rotation.y=t<FLY+DESC+STAY+LIFT?ang:ang+Math.PI;
    // 로터 바람: 낮게 떠 있을 때 바닥에서 먼지가 밀려난다
    if(py-y0<1.6&&now-dustT>140){dustT=now;const a=Math.random()*6.283;const d=.3+Math.random()*.5;dsDust(px+Math.cos(a)*d,pz+Math.sin(a)*d,.55,1600,1,'#9c9283',y0+.05);}}});}
// 착지한 분대: 헬기 옆에서 흩어져 나온다(모형은 v3SyncUnits가 만든다)
function v3FxLand(u){if(!V3.on)return;dsDust(u.x,u.z,.8,1800,4,'#9c9283');}
/* ---------- 시네마틱 시점: 낮은 각도로 선택한 부대 뒤에서 본다 ---------- */
function v3Cine(){const s=V3.cs;V3.cine=!V3.cine;if(V3.cine){V3.cineBak={pitch:s.pitch,d:s.gd,yaw:s.gyaw};s.pitch=.22;s.gd=4.2;const u=UI.sel;if(u){s.gx=u.x;s.gz=u.z;s.gyaw=-(u.face||0)*Math.PI/180+Math.PI/2;}}
  else{const b=V3.cineBak||{pitch:1.38,d:14,yaw:s.gyaw};s.pitch=b.pitch;s.gd=b.d;s.gyaw=b.yaw;}
  const el=$('#b-cine');if(el)el.setAttribute('aria-pressed',V3.cine?'true':'false');}
