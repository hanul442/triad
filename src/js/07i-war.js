/* ===================== 포탄·벽 구멍·건물 화재 그리기 =====================
   G.shells: 날아가는 포탄을 매 화면 포물선 위에 그린다(게임 시간 기준이라 배속·일시정지를 따른다).
   FXH.boom: 포탄이 땅이나 건물에 터지는 장면. FXH.launch: 박격포·자주포 발사. FXH.breach: 로켓이 벽에 꽂혀 구멍이 나는 장면.
   G.holes: 외벽 구멍(검게 뚫리고 위로 그을음). G.fires: 불난 건물(창마다 불길, 지붕 위 검은 연기 기둥). */
const v3H=h=>.06+h*FLOOR_H;     // 층 높이 → 화면 높이
function v3FxLaunch(a){if(typeof sfx==='function')sfx(UT[a.type].cls==='veh'?'boom':'launch',.7);if(!V3.on)return;const [x,y,z]=v3Pos(a.r,a.c,a);
  v3Burst(x,y+.05,z,UT[a.type].cls==='veh'?.7:.35,'#ffd27a',1,UT[a.type].cls==='veh'?1.5:.6);dsDust(x,z,UT[a.type].cls==='veh'?.9:.45,4000,2,'#8e887e',y);}
function v3FxBoom(x,z,h,onB,s){if(typeof sfx==='function')sfx('boom',onB?.8:.7);if(!V3.on)return;const big=(s&&s.pw||1)>1.2;const sz=big?1.4:1;
  if(onB){const y=v3H(h);v3Burst(x,y,z,sz*1.1,'#ffb060',3,2.2);v3Debris(x,y,z,big?18:12,1.1);dsSpray(x,y,z,big?110:70,sz*.8);dsDust(x,z,sz*1.6,14000,8,'#9c9283',y*.6);
    const r=Math.floor(z),c=Math.floor(x);if(inb(r,c)){const b=bldgBox(r,c);const gx=Math.min(b[1]+.12,Math.max(b[0]-.12,x)),gz=Math.min(b[3]+.12,Math.max(b[2]-.12,z));dsScar('rubble',gx,gz,.22*sz);}}
  else{const y=v3TopAt(x,z);v3Burst(x,y+.15,z,sz*1.1,'#ffb060',0,2.5);dsColumn(x,z,sz*1.2);dsDust(x,z,sz*2.2,15000+Math.random()*9000,14);
    dsSpray(x,y+.3,z,big?110:70,sz*.9);v3Debris(x,y+.2,z,big?14:8,1);dsScar('crater',x,z,sz*.19);if(Math.random()<.35)dsFires(x,z,1+Math.round(Math.random()*2),18000+Math.random()*20000,sz*.6,y+.03);}
  const cs=V3.cs;const dd=cs?Math.hypot(cs.x-x,cs.z-z):5;V3.shake=Math.max(V3.shake,(big?.2:.12)*Math.max(.3,1-dd/14));}
/* 로켓·전차포가 벽에 꽂힌다: 연기 꼬리를 끌며 날아가 벽에서 터진다 */
function v3FxBreach(a,P){if(typeof sfx==='function')sfx('launch',.8);if(!V3.on)return;const T=V3.T;const [x1,y1,z1]=v3Pos(a.r,a.c,a);const x2=P.x,z2=P.z,y2=v3H(P.h);
  const d=Math.hypot(x2-x1,z2-z1),dur=180+d*90;const tr=new T.Sprite(new T.SpriteMaterial({map:V3.puff,color:'#ffd9a0',blending:T.AdditiveBlending,transparent:true,depthWrite:false}));tr.scale.setScalar(.12);V3.G.fx.add(tr);
  let lastP=0;V3.fx.push({o:tr,t0:performance.now(),dur,upd:(o,k)=>{const x=x1+(x2-x1)*k,y=y1+(y2-y1)*k+Math.sin(k*Math.PI)*.04,z=z1+(z2-z1)*k;o.position.set(x,y,z);
    if(k-lastP>.12){lastP=k;dsDust(x,z,.18,2600,1,'#bdb5a8',y);}}});
  v3Burst(x1,y1,z1,.3,'#ffd27a',1,.6);dsDust(x1-(x2-x1)/d*.25,z1-(z2-z1)/d*.25,.5,3000,2,'#c9c1b3',y1);   // 뒤 폭풍
  setTimeout(()=>{if(!V3.on)return;const nx=P.side===1?1:P.side===3?-1:0,nz=P.side===2?1:P.side===0?-1:0;
    v3Burst(x2+nx*.05,y2,z2+nz*.05,.9,'#ff9a40',3,1.8);v3Debris(x2+nx*.08,y2,z2+nz*.08,12,.9);dsSpray(x2+nx*.1,y2,z2+nz*.1,60,.6);dsDust(x2+nx*.2,z2+nz*.2,1,10000,6,'#a39a8c',y2);
    dsScar('rubble',x2+nx*.18,z2+nz*.18,.16);V3.shake=Math.max(V3.shake,.08);if(typeof sfx==='function')sfx('boom',.7);},dur);}
/* ---------- 매 화면 ---------- */
function v3WarFrame(now,dt){if(!G)return;v3ShellsDraw();v3HolesSync();v3FiresDraw(now);}
function v3ShellsDraw(){const T=V3.T;V3.shellO=V3.shellO||new Map();const live=new Set();const gt=(G.time||0)+(typeof RT!=='undefined'?Math.min(RT.acc||0,.1):0);
  for(const s of G.shells||[]){const k=(gt-s.t0)/s.T;if(k<0||k>1)continue;live.add(s.id);let o=V3.shellO.get(s.id);
    if(!o){o=new T.Sprite(new T.SpriteMaterial({map:V3.puff,color:'#ffe2a8',blending:T.AdditiveBlending,transparent:true,depthWrite:false}));o.scale.setScalar(.09);V3.G.fx.add(o);V3.shellO.set(s.id,o);o.userData.lt=0;}
    const [x,z,h]=shellPos(s,Math.min(1,k));const y=v3H(h);o.position.set(x,y,z);
    // 연기 꼬리: 조금씩 남긴다
    if(k-o.userData.lt>.06&&k<.97){o.userData.lt=k;const p=new T.Sprite(new T.SpriteMaterial({map:V3.puff,color:'#cfc8bc',transparent:true,depthWrite:false,opacity:.0}));p.position.set(x,y,z);V3.G.fx.add(p);
      V3.fx.push({o:p,t0:performance.now(),dur:900,upd:(q,kk)=>{q.scale.setScalar(.05+kk*.12);q.material.opacity=.35*(1-kk);}});}}
  for(const [id,o] of V3.shellO)if(!live.has(id)){V3.G.fx.remove(o);o.material.dispose();V3.shellO.delete(id);}}
/* 벽 구멍 무늬: 들쭉날쭉한 검은 구멍 + 깨진 테두리 + 위로 번진 그을음 */
function v3HoleTex(){if(V3.holeTex)return V3.holeTex;const T=V3.T;const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');const R=mulberry(77);
  const blob=(cx,cy,rad,col,n)=>{g.fillStyle=col;g.beginPath();for(let i=0;i<=n;i++){const a=i/n*6.283,rr=rad*(.65+R()*.5);const x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;i?g.lineTo(x,y):g.moveTo(x,y);}g.fill();};
  const gr=g.createLinearGradient(0,64,0,0);gr.addColorStop(0,'rgba(20,18,16,0)');gr.addColorStop(.45,'rgba(20,18,16,.55)');gr.addColorStop(1,'rgba(20,18,16,0)');g.fillStyle=gr;g.beginPath();g.ellipse(32,22,22,22,0,0,6.283);g.fill();   // 그을음
  blob(32,38,17,'#8d867c',16);blob(32,38,12,'#0d0c0b',14);
  for(let i=0;i<10;i++){g.fillStyle=R()<.5?'#5a554e':'#a39c90';g.fillRect(14+R()*36,24+R()*30,2+R()*3,2+R()*3);}
  V3.holeTex=new T.CanvasTexture(c);return V3.holeTex;}
function v3HolesSync(){const H=G.holes||[];const sig=H.length+':'+V3.seed+':'+G.ver;if(V3.holeSig===sig)return;
  // 건물 상태가 바뀌었을 수 있으니 G.ver가 바뀔 때 다시 본다(구멍 수는 적다)
  V3.holeSig=sig;const T=V3.T;if(V3.holeG){V3.scene.remove(V3.holeG);V3.holeG.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
  const g=new T.Group();V3.holeG=g;V3.scene.add(g);if(!H.length)return;
  const mat=V3.holeM||(V3.holeM=new T.MeshBasicMaterial({map:v3HoleTex(),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));
  const geo=V3.holeGeo||(V3.holeGeo=new T.PlaneGeometry(.26,.26));
  for(const p of H){const X=G.map[p.r]&&G.map[p.r][p.c];if(!X||X.t!=='bldg'||p.h>bldgH(X))continue;const m=new T.Mesh(geo,mat);m.userData.keepGeo=1;m.userData.keepMat=1;
    const nx=p.side===1?1:p.side===3?-1:0,nz=p.side===2?1:p.side===0?-1:0;m.position.set(p.x+nx*.006,v3H(p.h)+.02,p.z+nz*.006);m.rotation.y=Math.atan2(nx,nz);g.add(m);}}
/* 불난 건물: 바깥 벽 창마다 불길(타오른 층까지), 지붕 위로 검은 연기 기둥 */
function v3FireBuild(k){const T=V3.T;const r=kr(k),c=kc(k);const X=G.map[r][c];const b=bldgBox(r,c);const g=new T.Group();const q=1e-6;const F=[];
  const faces=[];if(b[0]>c+q)faces.push([b[0]-.01,null,-1,0]);if(b[1]<c+1-q)faces.push([b[1]+.01,null,1,0]);if(b[2]>r+q)faces.push([null,b[2]-.01,0,-1]);if(b[3]<r+1-q)faces.push([null,b[3]+.01,0,1]);
  for(let f=0;f<X.f;f++)for(const fc of faces){const o=(v3Hash(k,f*7+fc[2]*3+fc[3])-.5)*.5;const x=fc[0]!=null?fc[0]:c+.5+o,z=fc[1]!=null?fc[1]:r+.5+o;
    const s=new T.Sprite(new T.SpriteMaterial({map:V3.puff,color:v3Hash(k,f+40)<.4?'#ffd27a':'#ff7a24',blending:T.AdditiveBlending,transparent:true,depthWrite:false,opacity:0}));s.position.set(x,v3H(f+.45),z);g.add(s);F.push({s,f,ph:v3Hash(k,f+60)*20});}
  const S=[];const top=v3H(X.f);for(let i=0;i<10;i++){const s=new T.Sprite(new T.SpriteMaterial({map:V3.puffD||V3.puff,color:i%3?'#26221f':'#3a332d',transparent:true,depthWrite:false,opacity:0,rotation:Math.random()*6.28}));g.add(s);S.push({s,ph:i/10});}
  const light=new T.PointLight('#ff7a2a',0,2.2,2);light.position.set(c+.5,top*.5,r+.5);g.add(light);
  V3.scene.add(g);return {g,F,S,top,x:c+.5,z:r+.5,light};}
function v3FiresDraw(now){V3.fireO=V3.fireO||new Map();const want=new Set(G.fires||[]);
  for(const [k,o] of V3.fireO){const X=G.map[kr(k)][kc(k)];if(!want.has(k)||X.t!=='bldg'||V3.fireSeed!==V3.seed){V3.scene.remove(o.g);o.g.traverse(q=>{if(q.material)q.material.dispose();});V3.fireO.delete(k);}}
  V3.fireSeed=V3.seed;const t=now/1000;
  for(const k of want){let o=V3.fireO.get(k);if(!o){o=v3FireBuild(k);V3.fireO.set(k,o);}const X=G.map[kr(k)][kc(k)];const I=X.fire||0;
    for(const f of o.F){const on=f.f<=(X.fireFl||0)+.3;const fl=.7+Math.sin(t*15+f.ph)*.2+Math.sin(t*8.7+f.ph*2)*.1;const sz=.12+.1*I;f.s.material.opacity=on?.9*fl*Math.min(1,I*1.6):0;f.s.scale.set(sz*fl,sz*fl*1.5,1);}
    for(const p of o.S){const l=(t*.12+p.ph)%1;p.s.position.set(o.x+DS.wind[0]*l*40+Math.sin(t*.4+p.ph*9)*.1,o.top+l*3.2,o.z+DS.wind[1]*l*40);p.s.scale.setScalar(.3+l*1.6);p.s.material.opacity=.6*I*Math.sin(l*Math.PI);}
    o.light.intensity=1.2*I*(.8+Math.sin(t*11)*.2);}}
