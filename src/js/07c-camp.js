/* ===================== 3D: 캠페인 임무 소품 =====================
   - v3BuildCamp(g): 다리(콘크리트 상판·난간·교각). 지도가 바뀌면(폭파) 다시 그려진다.
   - v3CampFrame: 대사관 승차 지점에서 기다리는 피란민, 서강교 폭약(깜빡이는 빨간 불). */
function v3CampMats(){if(V3.campM)return V3.campM;const T=V3.T;
  V3.campM={deck:new T.MeshStandardMaterial({color:'#8a8780',roughness:.95}),rail:new T.MeshStandardMaterial({color:'#5d5f60',roughness:.7,metalness:.3}),
    pier:new T.MeshStandardMaterial({color:'#6e6b64',roughness:1}),box:new T.MeshStandardMaterial({color:'#3d3a2c',roughness:.8}),
    led:new T.MeshBasicMaterial({color:'#ff3a2a'}),skin:new T.MeshStandardMaterial({color:'#b48a6a',roughness:.9})};return V3.campM;}
function v3BuildCamp(g){if(!G||!G.camp)return;const T=V3.T,M=v3CampMats();
  // 강: 연못용 돌·갈대가 칸마다 찍히지 않게 강물 판을 한 장 더 덮는다
  if(G.camp.id==='bridge'){const W=[];for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(G.map[r][c].t==='water')W.push([r,c]);
    if(W.length){M.river=M.river||new T.MeshStandardMaterial({color:'#2f4148',roughness:.35,metalness:.25});const geo=new T.PlaneGeometry(1.002,1.002);geo.rotateX(-Math.PI/2);
      const im=new T.InstancedMesh(geo,M.river,W.length);const m4=new T.Matrix4();W.forEach(([r,c],i)=>{m4.makeTranslation(c+.5,.05,r+.5);im.setMatrixAt(i,m4);});im.receiveShadow=true;g.add(im);}}
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=G.map[r][c];if(!x.br)continue;
    const d=new T.Mesh(new T.BoxGeometry(1,.05,1),M.deck);d.position.set(c+.5,.02,r+.5);d.receiveShadow=true;d.castShadow=true;g.add(d);
    for(const s of [-1,1]){const y=G.map[r+s]&&G.map[r+s][c];if(y&&y.br)continue;   // 다리 바깥쪽 가장자리에만 난간
      const rl=new T.Mesh(new T.BoxGeometry(1,.06,.03),M.rail);rl.position.set(c+.5,.08,r+.5+s*.48);rl.castShadow=true;g.add(rl);
      if(c%2===0){const p=new T.Mesh(new T.BoxGeometry(.12,.3,.12),M.pier);p.position.set(c+.5,-.12,r+.5+s*.38);g.add(p);}}}}
function v3CampFrame(now){const C=G&&G.camp;const T=V3.T;
  if(!C){if(V3.campG){V3.scene.remove(V3.campG);V3.campG=null;}return;}
  const tag=G.seed+'|'+C.id;if(!V3.campG||V3.campG.userData.tag!==tag){if(V3.campG)V3.scene.remove(V3.campG);const g=new T.Group();g.userData.tag=tag;V3.campG=g;V3.scene.add(g);
    const M=v3CampMats();g.userData.civ=[];
    if(C.id==='evac'){const cols=['#c9c1ae','#3b5a7a','#8a3b33','#d8d4c8','#4d5a3c','#6a5a7a','#b0884a','#2d2f33','#a7a29a','#5e7d8c','#c06a3a','#3f3a36'];
      for(let i=0;i<EVAC_N;i++){const p=new T.Group();const body=new T.Mesh(new T.CylinderGeometry(.022,.026,.085,6),new T.MeshStandardMaterial({color:cols[i%cols.length],roughness:.9}));body.position.y=.045;body.castShadow=true;
        const head=new T.Mesh(new T.SphereGeometry(.017,6,5),M.skin);head.position.y=.105;p.add(body,head);
        const a=i*2.39,rr=.12+Math.sqrt(i)*.07;p.userData={ox:Math.cos(a)*rr,oz:Math.sin(a)*rr,ph:i*1.7};g.add(p);g.userData.civ.push(p);}}
    if(C.id==='bridge'){const b=new T.Mesh(new T.BoxGeometry(.18,.08,.12),M.box);b.position.set(C.charge.x,.09,C.charge.z);b.castShadow=true;const l=new T.Mesh(new T.SphereGeometry(.025,6,5),M.led);l.position.set(C.charge.x+.05,.15,C.charge.z);g.add(b,l);g.userData.charge=[b,l];}}
  const g=V3.campG,S=C.st,t=now/1000;
  if(g.userData.civ.length){const y0=typeof v3TopAt==='function'?Math.min(.1,v3TopAt(C.lz.x,C.lz.z)):0;
    g.userData.civ.forEach((p,i)=>{p.visible=i<S.wait;if(!p.visible)return;const u=p.userData;p.position.set(C.lz.x+u.ox,y0+Math.abs(Math.sin(t*2+u.ph))*.004,C.lz.z+u.oz);p.rotation.y=Math.sin(t*.4+u.ph)*.8;});}
  if(g.userData.charge){const on=!S.disarmed&&!S.blown;g.userData.charge.forEach(o=>o.visible=on);if(on)g.userData.charge[1].visible=Math.floor(t*(S.charge<60?4:1.5))%2===0;}}
