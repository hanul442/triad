/* ===================== DESTRUCTION: 바닥 흔적·먼지·불·잔해 =====================
   파괴는 이 게임의 볼거리다. 한 번 맞은 자리는 그대로 남는다:
   - 바닥 흔적(구덩이·그을음·파편 자국)은 지면 캔버스에 바로 그리고, 목록에 두었다가 지도를 다시 그릴 때 재생한다.
   - 먼지 구름은 수십 초 머물며 바람에 흘러가고, 작은 불길은 한동안 일렁이고, 부서진 차량은 그 자리에 남는다. */
const DS={wind:[.045,.018]};
function dsInit(){const el=$('#v3d-grain');if(!el)return;const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');const im=g.createImageData(128,128);const R=mulberry(31);
  for(let i=0;i<im.data.length;i+=4){const v=96+R()*64|0;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255;}g.putImageData(im,0,0);el.style.backgroundImage=`url(${c.toDataURL()})`;
  // 울퉁불퉁한 먼지 덩어리 무늬: 둥근 안개가 아니라 덩어리진 구름으로 보이게
  V3.puffD=v3Tex(96,96,(g2)=>{const R2=mulberry(77);for(let i=0;i<9;i++){const x=28+R2()*40,y=28+R2()*40,r=14+R2()*18;const gr=g2.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(255,255,255,.95)');gr.addColorStop(.6,'rgba(255,255,255,.55)');gr.addColorStop(1,'rgba(255,255,255,0)');g2.fillStyle=gr;g2.fillRect(0,0,96,96);}});}
/* ---------- 바닥 흔적 ---------- */
function dsScar(kind,x,z,r,seed){if(!V3.on)return;const sc={k:kind,x,z,r,s:seed??Math.random()*1e6|0};if(!V3.scars||V3.scars.seed!==V3.seed)V3.scars={seed:V3.seed,list:[]};V3.scars.list.push(sc);if(V3.scars.list.length>900)V3.scars.list.shift();dsDraw(sc);if(V3.gtex)V3.gtex.needsUpdate=true;}
function dsReplay(){if(!V3.scars||V3.scars.seed!==V3.seed)return;for(const sc of V3.scars.list)dsDraw(sc);}
function dsDraw(sc){const g=V3.gctx,P=V3.gP;if(!g)return;const R=mulberry(sc.s);const X=sc.x*P,Y=sc.z*P,rr=sc.r*P;g.save();g.translate(X,Y);
  if(sc.k==='crater'){// 구덩이: 어두운 안쪽, 밝은 흙 테두리, 둘레로 흩어진 흙
    for(let i=0;i<26;i++){const a=R()*6.283,d=rr*(1+R()*1.6);g.fillStyle=R()<.5?'rgba(20,17,13,.5)':'rgba(120,106,84,.45)';g.beginPath();g.arc(Math.cos(a)*d,Math.sin(a)*d,1+R()*3,0,7);g.fill();}
    let gr=g.createRadialGradient(0,0,0,0,0,rr*1.5);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(.55,'rgba(0,0,0,0)');gr.addColorStop(.75,'rgba(135,118,92,.32)');gr.addColorStop(1,'rgba(135,118,92,0)');g.fillStyle=gr;g.beginPath();for(let j=0;j<14;j++){const a=j/14*6.283,d=rr*1.5*(.8+R()*.4);g[j?'lineTo':'moveTo'](Math.cos(a)*d,Math.sin(a)*d);}g.closePath();g.fill();
    gr=g.createRadialGradient(0,0,0,0,0,rr);gr.addColorStop(0,'rgba(10,9,8,.95)');gr.addColorStop(.6,'rgba(22,19,16,.85)');gr.addColorStop(1,'rgba(40,36,30,0)');g.fillStyle=gr;g.beginPath();for(let j=0;j<12;j++){const a=j/12*6.283,d=rr*(.75+R()*.45);g[j?'lineTo':'moveTo'](Math.cos(a)*d,Math.sin(a)*d);}g.closePath();g.fill();}
  else if(sc.k==='scorch'){// 그을음: 검은 얼룩
    const gr=g.createRadialGradient(0,0,0,0,0,rr);gr.addColorStop(0,'rgba(8,7,6,.8)');gr.addColorStop(.5,'rgba(14,12,10,.5)');gr.addColorStop(1,'rgba(20,18,15,0)');g.fillStyle=gr;g.beginPath();for(let j=0;j<12;j++){const a=j/12*6.283,d=rr*(.7+R()*.5);g[j?'lineTo':'moveTo'](Math.cos(a)*d,Math.sin(a)*d);}g.closePath();g.fill();}
  else if(sc.k==='spray'){// 파편 자국: 검은 점과 옅은 콘크리트 가루가 넓게 흩어진다
    const n=Math.round(rr*2.2);for(let i=0;i<n;i++){const a=R()*6.283,d=Math.pow(R(),.6)*rr;const dk=R()<.62;g.fillStyle=dk?`rgba(12,11,9,${.35+R()*.45})`:`rgba(170,160,140,${.25+R()*.35})`;const s=dk?1+R()*2.2:1+R()*1.4;g.fillRect(Math.cos(a)*d,Math.sin(a)*d,s,s);}}
  else if(sc.k==='rubble'){// 무너진 자리: 회색 콘크리트 가루와 검은 균열
    for(let i=0;i<60;i++){const a=R()*6.283,d=Math.pow(R(),.7)*rr;g.fillStyle=R()<.6?`rgba(150,144,132,${.3+R()*.4})`:`rgba(18,16,14,${.3+R()*.4})`;const s=1+R()*4;g.fillRect(Math.cos(a)*d,Math.sin(a)*d,s,s*.7);}
    g.strokeStyle='rgba(10,9,8,.55)';g.lineWidth=1.2;for(let i=0;i<5;i++){g.beginPath();let x=(R()-.5)*rr,y=(R()-.5)*rr;g.moveTo(x,y);for(let j=0;j<5;j++){x+=(R()-.5)*rr*.5;y+=(R()-.5)*rr*.5;g.lineTo(x,y);}g.stroke();}}
  else if(sc.k==='blood'){// 쓰러진 자리: 검붉은 얼룩
    g.fillStyle=`rgba(72,16,12,${.5+R()*.3})`;for(let i=0;i<9;i++){const a=R()*6.283,d=R()*rr*1.3;g.beginPath();g.arc(Math.cos(a)*d,Math.sin(a)*d,1+R()*rr*.6,0,7);g.fill();}}
  else if(sc.k==='tread'){// 차량 바퀴 자국·기름
    const gr=g.createRadialGradient(0,0,0,0,0,rr);gr.addColorStop(0,'rgba(6,6,8,.75)');gr.addColorStop(1,'rgba(6,6,8,0)');g.fillStyle=gr;g.beginPath();g.ellipse(0,0,rr,rr*.7,R()*3,0,7);g.fill();}
  g.restore();}
/* ---------- 먼지 구름: 크고 뿌옇게, 오래 ---------- */
function dsDust(x,z,size,dur,n,col,y0){if(!V3.on)return;const T=V3.T;n=n||10;const now=performance.now();
  for(let i=0;i<n;i++){const c=col||(i%4===0?'#7d7569':i%4===1?'#bfb29a':i%4===2?'#a79b86':'#8f8678');const s=new T.Sprite(new T.SpriteMaterial({map:V3.puffD||V3.puff,color:c,transparent:true,depthWrite:false,opacity:0,rotation:Math.random()*6.28}));
    const a=Math.random()*6.283,rd=Math.pow(Math.random(),.7)*size*.55,px=x+Math.cos(a)*rd,pz=z+Math.sin(a)*rd,py=(y0||.1)+Math.random()*size*.3;const sz=size*(.28+Math.random()*.4),rise=.15+Math.random()*.4,ph=Math.random()*9,spin=(Math.random()-.5)*.3;
    s.position.set(px,py,pz);s.renderOrder=2;V3.G.fx.add(s);
    V3.fx.push({o:s,t0:now+i*70,dur:dur*(.7+Math.random()*.6),upd:(o,k)=>{const e=1-Math.pow(1-k,2);const t=k*dur/1000;o.position.set(px+DS.wind[0]*t+Math.sin(t*.4+ph)*.06,py+rise*e,pz+DS.wind[1]*t);o.scale.setScalar(sz*(.4+e*.9));o.material.rotation+=spin*.016;o.material.opacity=.62*(k<.06?k/.06:1)*Math.pow(1-k,.7);}});}}
/* 먼지 기둥: 착탄점에서 위로 솟구친 뒤 옆으로 퍼진다 */
function dsColumn(x,z,size){if(!V3.on)return;const T=V3.T;const now=performance.now();
  for(let i=0;i<9;i++){const s=new T.Sprite(new T.SpriteMaterial({map:V3.puffD||V3.puff,color:i%2?'#c2b49b':'#8f8375',transparent:true,depthWrite:false,opacity:0,rotation:Math.random()*6.28}));const a=Math.random()*6.283,sp=.2+Math.random()*.5,h=size*(1.2+Math.random()*1.2),sz=size*(.4+Math.random()*.4);
    s.position.set(x,.1,z);V3.G.fx.add(s);
    V3.fx.push({o:s,t0:now+i*45,dur:1800+Math.random()*900,upd:(o,k)=>{const e=1-Math.pow(1-k,3);o.position.set(x+Math.cos(a)*sp*e*size,.1+h*e,z+Math.sin(a)*sp*e*size);o.scale.setScalar(sz*(.3+e*1.5));o.material.opacity=.9*(1-k*k);}});}}
/* ---------- 작은 불길: 한동안 일렁인다 ---------- */
function dsFires(x,z,n,dur,spread,y){if(!V3.on)return;const T=V3.T;const now=performance.now();
  for(let i=0;i<n;i++){const f=new T.Sprite(new T.SpriteMaterial({map:V3.puff,color:Math.random()<.3?'#ffd27a':'#ff8a2a',transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:0}));
    const px=x+(Math.random()-.5)*(spread||.6),pz=z+(Math.random()-.5)*(spread||.6),py=(y||.03)+Math.random()*.05,ph=Math.random()*20,sz=.08+Math.random()*.1;f.position.set(px,py,pz);V3.G.fx.add(f);
    const sm=new T.Sprite(new T.SpriteMaterial({map:V3.puff,color:'#2a2622',transparent:true,depthWrite:false,opacity:0}));sm.position.set(px,py+.15,pz);V3.G.fx.add(sm);
    V3.fx.push({o:f,t0:now+Math.random()*600,dur:dur,upd:(o,k)=>{const t=performance.now()/1000;const fl=.7+Math.sin(t*17+ph)*.2+Math.sin(t*9.3+ph*2)*.1;const life=k<.1?k/.1:1-Math.max(0,k-.7)/.3;o.scale.set(sz*fl,sz*fl*(1.3+Math.sin(t*11+ph)*.3),1);o.position.y=py+sz*.6;o.material.opacity=.95*fl*life;}});
    V3.fx.push({o:sm,t0:now+Math.random()*600,dur:dur,upd:(o,k)=>{const t=performance.now()/1000;const l=(t*.35+ph)%1;const life=k<.1?k/.1:1-Math.max(0,k-.7)/.3;o.position.set(px+l*.2+DS.wind[0]*l*4,py+.1+l*.9,pz+DS.wind[1]*l*4);o.scale.setScalar(.12+l*.5);o.material.opacity=.45*Math.sin(l*Math.PI)*life;}});}}
/* ---------- 파편 비: 검은 조각이 넓게 흩어져 떨어지고, 떨어진 자리는 바닥에 남는다 ---------- */
function dsSpray(x,y,z,n,pow,scar){if(!V3.on)return;const T=V3.T;const P=new Float32Array(n*3),V=[];
  for(let i=0;i<n;i++){const a=Math.random()*6.283,sp=(Math.random()*.9+.3)*pow*2.4,vy=(Math.random()*2.2+.8)*pow;V.push([Math.cos(a)*sp,vy,Math.sin(a)*sp]);P.set([x,y,z],i*3);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(P,3));
  const pts=new T.Points(geo,V3.sprayM||(V3.sprayM=new T.PointsMaterial({color:'#17150f',size:.03,sizeAttenuation:true,transparent:true,opacity:.95,depthWrite:false})));pts.userData.keepMat=1;V3.G.fx.add(pts);
  const G9=5.5;let scarred=false;const t0=performance.now();const dur=2200*Math.sqrt(pow);
  V3.fx.push({o:pts,t0,dur,upd:(o,k)=>{const t=k*dur/1000;const a=geo.attributes.position.array;for(let i=0;i<n;i++){const [vx,vy,vz]=V[i];const yy=y+vy*t-G9*t*t*.5;a[i*3]=x+vx*t;a[i*3+1]=Math.max(.01,yy);a[i*3+2]=z+vz*t;}geo.attributes.position.needsUpdate=true;
    if(!scarred&&k>.45&&scar!==false){scarred=true;dsScar('spray',x,z,pow*1.3);}}});}
/* ---------- 차량 잔해: 검게 탄 채 그 자리에 ---------- */
function dsWreck(u){if(!V3.on)return;const o=V3.uo.get(u.id);if(!o||!o.userData.body)return;const T=V3.T;const w=o.userData.body.clone();
  const m=V3.wreckM||(V3.wreckM=new T.MeshStandardMaterial({color:'#2a2825',roughness:1,metalness:.1}));w.traverse(x=>{if(x.isMesh){x.material=m;x.userData.keepMat=1;x.userData.keepGeo=1;}});w.userData.keepMat=1;w.userData.keepGeo=1;
  w.position.set(o.position.x,o.position.y+.01,o.position.z);w.rotation.z=(Math.random()-.5)*.25;w.rotation.x=(Math.random()-.5)*.15;V3.G.fx.add(w);
  V3.fx.push({o:w,t0:performance.now(),dur:240000,upd:()=>{}});
  if(G&&Array.isArray(G.covers))G.covers.push({x:o.position.x,z:o.position.z,r:.3,cov:.3,kind:'wreck'});// 잔해는 엄폐물이 된다(04c-cover)
  dsScar('tread',o.position.x,o.position.z,.3);dsFires(o.position.x,o.position.z,3,45000+Math.random()*30000,.35,.12);dsDust(o.position.x,o.position.z,.9,9000,5,'#55504a');}
/* ---------- 포격: 포탄이 차례로 떨어지며 먼지 기둥을 세우고 파편을 뿌린다 ---------- */
function dsShell(x,z,big){if(!V3.on)return;const T=V3.T;const y0=v3TopAt(x,z);
  // 낙하하는 포탄: 하늘에서 비스듬히 꽂히는 짧은 선
  const tr=new T.Mesh(V3.tracerG||(V3.tracerG=new T.BoxGeometry(.012,.012,.35)),new T.MeshBasicMaterial({color:'#ffe9b0',blending:T.AdditiveBlending,transparent:true,depthWrite:false}));tr.userData.keepGeo=1;
  const sx=x+2.5,sz=z-1.5,sy=y0+9;tr.position.set(sx,sy,sz);tr.lookAt(x,y0,z);V3.G.fx.add(tr);
  V3.fx.push({o:tr,t0:performance.now(),dur:380,upd:(o,k)=>{o.position.set(sx+(x-sx)*k,sy+(y0-sy)*k,sz+(z-sz)*k);}});
  setTimeout(()=>{if(!V3.on)return;const s=big?1.6:1.1;v3Burst(x,y0+.15,z,s*1.1,'#ffb060',0,2.5);dsColumn(x,z,s*1.3);dsDust(x,z,s*2.4,16000+Math.random()*10000,18);
    dsSpray(x,y0+.3,z,big?110:70,s*.9);v3Debris(x,y0+.2,z,big?16:9,1.1);dsScar('crater',x,z,s*.2);if(Math.random()<.5)dsFires(x,z,1+Math.round(Math.random()*2),20000+Math.random()*25000,s*.7,y0+.03);
    V3.shake=Math.max(V3.shake,big?.2:.12);if(typeof sfx==='function')sfx('boom');},380);}
function dsBarrage(r,c,n,spread){const [cx,cz]=v3x(r,c);for(let i=0;i<n;i++)setTimeout(()=>{const ox=(Math.random()-.5)*spread,oz=(Math.random()-.5)*spread;dsShell(cx+ox,cz+oz,i===0||Math.random()<.25);},200+i*(260+Math.random()*220));}
function v3TopAt(x,z){const r=Math.floor(z),c=Math.floor(x);return inb(r,c)?v3Top(r,c):0;}
