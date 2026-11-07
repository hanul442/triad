/* ===================== 미사일 연출 =====================
   대전차 유도미사일(G.missiles): 흰 연기 꼬리를 끌며 날아가 마지막에 위에서 내리꽂힌다. 쏠 때 뒤로 후폭풍 먼지.
   다연장 로켓: 발사대에서 불꽃과 큰 먼지 구름, 로켓은 포탄 모듈(07i)이 연기 꼬리를 그린다.
   순항미사일: 지도 끝에서 낮게 날아온다. 탄도미사일: 떨어질 곳에 붉은 경고 원, 마지막 순간 하늘에서 거의 수직으로 떨어진다.
   큰 폭발: 화구, 버섯 모양 연기 기둥, 넓은 먼지, 크레이터, 불. 시간은 게임 시간(G.time). */
Object.assign(FXH,{atgm:(a,m)=>v3AtgmLaunch(a,m),msHit:(m,wall)=>v3MsHit(m,wall),mlrs:a=>v3MlrsLaunch(a),strikeM:j=>v3StrikeM(j),msDown:j=>v3MsDown(j),msBoom:(x,z,R)=>v3MsBoom(x,z,R)});
function v3MsMesh(len,col){const T=V3.T;const g=new T.Group();const b=new T.Mesh(new T.CylinderGeometry(.012,.012,len,6),new T.MeshStandardMaterial({color:col||'#c9c4b6',roughness:.6}));b.rotation.z=Math.PI/2;g.add(b);
  const f=new T.Sprite(new T.SpriteMaterial({map:V3.puff,color:'#ffd9a0',blending:T.AdditiveBlending,transparent:true,depthWrite:false}));f.scale.setScalar(.1);f.position.x=-len/2;g.add(f);return g;}
function v3Puff(x,y,z,col,sz,dur,op){const T=V3.T;const p=new T.Sprite(new T.SpriteMaterial({map:V3.puff,color:col,transparent:true,depthWrite:false,opacity:0}));p.position.set(x,y,z);V3.G.fx.add(p);
  V3.fx.push({o:p,t0:performance.now(),dur,upd:(q,k)=>{q.scale.setScalar(sz*(1+k*2.5));q.material.opacity=(op||.5)*(1-k);q.position.y=y+k*.12;}});}
/* ---------- 대전차 유도미사일 ---------- */
function v3AtgmLaunch(a){if(!V3.on)return;const [x,y,z]=v3Pos(a.r,a.c,a);const f=(a.face||0)*Math.PI/180;
  v3Burst(x,y+.05,z,.35,'#ffd27a',0,.8);for(let i=0;i<4;i++)v3Puff(x-Math.cos(f)*(.15+i*.1),y,z-Math.sin(f)*(.15+i*.1),'#cfc6b6',.12,2600,.55);   // 뒤로 터지는 후폭풍
  dsDust(x-Math.cos(f)*.3,z-Math.sin(f)*.3,.5,3500,2,'#a8a090');}
function v3MissilesDraw(){V3.msO=V3.msO||new Map();const live=new Set();const now=performance.now();
  for(const m of G.missiles||[]){live.add(m.id);let o=V3.msO.get(m.id);if(!o){o=v3MsMesh(.09);V3.G.fx.add(o);V3.msO.set(m.id,o);o.userData.lt=0;o.userData.p=[m.x,m.z];}
    const y=.06+m.h*FLOOR_H;const [px,pz]=o.userData.p;const k=.35;const nx=px+(m.x-px)*k,nz=pz+(m.z-pz)*k;o.userData.p=[nx,nz];
    const ang=Math.atan2(-(m.z-pz),m.x-px);if(Math.abs(m.x-px)+Math.abs(m.z-pz)>.001)o.rotation.y=ang;o.rotation.z=m.dive?-.7:.08;o.position.set(nx,y,nz);
    if(now-o.userData.lt>45){o.userData.lt=now;v3Puff(nx,y,nz,'#ddd6c8',.05,2200,.5);}}
  for(const [id,o] of V3.msO)if(!live.has(id)){V3.G.fx.remove(o);o.traverse(q=>{if(q.geometry)q.geometry.dispose();if(q.material)q.material.dispose();});V3.msO.delete(id);}}
function v3MsHit(m,wall){if(!V3.on)return;const y=.06+m.h*FLOOR_H;v3Burst(m.x,y,m.z,.9,'#ff9a40',3,2);dsSpray(m.x,y,m.z,50,.6);v3Debris(m.x,y,m.z,8,.8);
  if(!wall){dsScar('scorch',m.x,m.z,.12);dsDust(m.x,m.z,.8,6000,3);}V3.shake=Math.max(V3.shake,.08);}
/* ---------- 다연장 로켓 ---------- */
function v3MlrsLaunch(a){if(!V3.on)return;const [x,y,z]=v3Pos(a.r,a.c,a);const f=(a.face||0)*Math.PI/180;
  for(let i=0;i<UT[a.type].salvo;i++)setTimeout(()=>{if(!V3.on)return;v3Burst(x+Math.cos(f)*.1,y+.18,z+Math.sin(f)*.1,.4,'#ffd27a',0,1.2);v3Puff(x-Math.cos(f)*.35,y+.05,z-Math.sin(f)*.35,'#bdb4a4',.25,5000,.6);},i*140/(G.spd||1));
  dsDust(x-Math.cos(f)*.5,z-Math.sin(f)*.5,1.6,9000,8,'#a39a8a');V3.shake=Math.max(V3.shake,.06);}
function v3MlrsBuild(){const T=V3.T,M=V3.M,mm=v3ModMats();const m=MU;const g=new T.Group();
  const BODY=V3.vehBodyStub||(V3.vehBodyStub=new T.MeshStandardMaterial({color:'#6b6a55',flatShading:true}));
  const B=(w,h,d,x,y,z,mat,par)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),mat||BODY);if(!mat)o.userData.body=1;o.position.set(x,y,z);(par||g).add(o);return o;};
  B(7.2*m,.5*m,2.4*m,0,1.0*m,0);B(1.9*m,1.7*m,2.4*m,2.7*m,1.95*m,0);B(.1*m,.7*m,2.0*m,3.66*m,2.3*m,0,mm.glass);   // 차대·운전실·앞유리
  for(const x of [2.6,.2,-1.4,-2.8])for(const s of [-1,1]){const w=new T.Mesh(new T.CylinderGeometry(.55*m,.55*m,.4*m,12),mm.tire);w.rotation.x=Math.PI/2;w.position.set(x*m,.55*m,s*1.1*m);g.add(w);}
  const tur=new T.Group();tur.position.set(-1.2*m,1.3*m,0);tur.userData.turret=1;g.add(tur);
  const box=new T.Group();box.position.set(0,.3*m,0);box.rotation.z=.42;tur.add(box);
  B(4.4*m,1.3*m,2.2*m,0,.65*m,0,null,box);for(let i=0;i<3;i++)for(let j=0;j<4;j++){const t=new T.Mesh(new T.CircleGeometry(.18*m,8),M.dark);t.rotation.y=Math.PI/2;t.position.set(2.21*m,(.25+i*.4)*m,(-.75+j*.5)*m);box.add(t);}
  return g;}
/* ---------- 순항·탄도미사일 ---------- */
function v3StrikeM(j){if(!V3.on)return;const T=V3.T;const t0=j.t0,dur=j.t-j.t0;
  if(j.kind==='tbm'){// 경고 원: 떨어질 곳(모두에게 보인다)
    const ring=new T.Mesh(new T.RingGeometry(2.1,2.2,64),new T.MeshBasicMaterial({color:'#ff3b2f',transparent:true,opacity:.5,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(j.x,v3TopAt(j.x,j.z)+.03,j.z);ring.renderOrder=6;V3.G.fx.add(ring);
    const cross=new T.Mesh(new T.RingGeometry(.15,.22,24),ring.material.clone());cross.rotation.x=-Math.PI/2;cross.position.copy(ring.position);V3.G.fx.add(cross);
    const ms=v3MsMesh(.35,'#d8d4cc');V3.G.fx.add(ms);ms.visible=false;let lt=0;
    V3.fx.push({o:ring,t0:performance.now(),dur:1e9,upd:(o)=>{const t=(G.time||0)-t0;const k=t/dur;if(k>=1){V3.G.fx.remove(o);V3.G.fx.remove(cross);V3.G.fx.remove(ms);o.material.dispose();cross.material.dispose();o.visible=false;return;}
      const p=.35+.3*Math.sin(t*(4+k*14));o.material.opacity=p;cross.material.opacity=p;o.scale.setScalar(1+(1-k)*.15);
      const fall=1.1;if(dur-t<fall){const q=1-(dur-t)/fall;ms.visible=true;const y=24*(1-q*q);ms.position.set(j.x+(1-q)*1.2,y,j.z-(1-q)*.6);ms.rotation.z=-Math.PI/2+.12;
        const now=performance.now();if(now-lt>30){lt=now;v3Puff(ms.position.x,y+.2,ms.position.z,'#e8e2d6',.12,3000,.6);}}}});
    if(typeof sfx==='function')sfx('turn',.6);return;}
  // 순항미사일: 세력 쪽 가장자리에서 낮게 들어온다
  const e=airEdge(j.n,j.x,j.z);let ux=j.x-e[0],uz=j.z-e[1];const L=Math.hypot(ux,uz)||1;ux/=L;uz/=L;const V=Math.max(4,L/dur*1.05);
  const ms=v3MsMesh(.3,'#bfbab0');ms.rotation.y=Math.atan2(-uz,ux);V3.G.fx.add(ms);let lt=0;
  V3.fx.push({o:ms,t0:performance.now(),dur:1e9,upd:(o)=>{const t=(G.time||0)-j.t;if(t>=0||j.down&&t>-.05){V3.G.fx.remove(o);o.visible=false;return;}
    const x=j.x+ux*V*t,z=j.z+uz*V*t;const top=v3TopAt(x,z);let y=Math.max(top+.5,1.3);if(t>-.5)y=top+(y-top)*(-t/.5);o.position.set(x,Math.max(.1,y),z);
    if(t>-.5)o.rotation.z=-.5;const now=performance.now();if(now-lt>40){lt=now;v3Puff(x-ux*.15,y,z-uz*.15,'#d6cfc2',.07,2400,.45);}}});}
function v3MsDown(j){if(!V3.on)return;const [x,z]=j.down;v3Burst(x,1.4,z,1.2,'#ffb060',3,3);dsSpray(x,1.2,z,60,.9);}
function v3MsBoom(x,z,R){if(!V3.on)return;const T=V3.T;const y=v3TopAt(x,z);const big=R>2;
  v3Burst(x,y+.4,z,R*1.8,'#ff6a1a',12,9);setTimeout(()=>{if(V3.on)v3Burst(x,y+.9,z,R*1.2,'#ffb060',4,4);},140);
  dsColumn(x,z,R*1.4);dsDust(x,z,R*2.2,32000,big?60:40);dsSpray(x,y+.4,z,big?320:220,R*1.1);v3Debris(x,y+.3,z,big?40:26,1.8);dsScar('crater',x,z,R*.32);dsFires(x,z,big?9:6,60000,R*.9);
  // 충격파 고리: 땅을 따라 빠르게 퍼진다
  const ring=new T.Mesh(new T.RingGeometry(.9,1,48),new T.MeshBasicMaterial({color:'#e8dcc8',transparent:true,opacity:.6,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(x,y+.05,z);V3.G.fx.add(ring);
  V3.fx.push({o:ring,t0:performance.now(),dur:700,upd:(o,k)=>{o.scale.setScalar(.2+k*R*2.4);o.material.opacity=.6*(1-k);}});
  V3.shake=Math.max(V3.shake,big?.6:.45);}
/* 매 화면 (v3AirFrame에 붙인다) */
{const _f=v3AirFrame;v3AirFrame=function(now,dt){_f(now,dt);if(G)v3MissilesDraw();};}
