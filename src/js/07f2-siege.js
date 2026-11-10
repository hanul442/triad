/* ===================== 3D: 공성 야전 시설(06j-siege) =====================
   개인호: 둥글게 판 얕은 구덩이와 앞쪽 흙둔덕 · 차량 진지: 앞과 옆을 흙으로 둘러 파낸 경사로 ·
   대전차호: 길고 깊은 도랑과 뒤쪽 흙둑 · 관측소: 흙 덮개와 위장, 쌍안경 틈 · 탄약 집적소: 국방색 탄약 상자 더미와 방수포 ·
   지휘소: 천막 + 안테나 + 둘레 모래주머니 · 위장망: 기둥 네 개에 걸친 얼룩 그물 */
function v3SgMats(){if(V3.sgm)return V3.sgm;const T=V3.T;
  return V3.sgm={olive:new T.MeshStandardMaterial({color:'#4f5634',roughness:.9,flatShading:true}),
    box:new T.MeshStandardMaterial({color:'#56603a',roughness:.8,flatShading:true}),
    tarp:new T.MeshStandardMaterial({color:'#3f4630',roughness:1,flatShading:true}),
    tent:new T.MeshStandardMaterial({color:'#5d6143',roughness:1,flatShading:true}),
    net:new T.MeshStandardMaterial({color:'#4b5232',roughness:1,transparent:true,opacity:.82,side:2,flatShading:true}),
    ant:new T.MeshStandardMaterial({color:'#222',roughness:.6,metalness:.4})};}
function v3SiegeMesh(f){const T=V3.T,M=v3FortMats(),S=v3SgMats(),d=FORT[f.k];const g=new T.Group();const R=mulberry(f.id*733+11);
  const add=(geo,mat,x,y,z,rx,ry,rz)=>{const o=new T.Mesh(geo,mat);o.position.set(x,y,z);o.rotation.set(rx||0,ry||0,rz||0);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;};
  if(f.k==='scrape'){add(new T.CylinderGeometry(.07,.06,.004,9),M.pit,0,.003,0);
    for(let i=0;i<6;i++){const a=-1.3+i*.52;add(new T.BoxGeometry(.05,.022+R()*.01,.03),M.berm,Math.sin(a)*.085,.01,-Math.cos(a)*.085,.2,-a,0);}}
  else if(f.k==='vpos'){const L=d.len,W=d.w;add(new T.BoxGeometry(L*.8,.004,W*.7),M.pit,0,.003,-.02);
    add(new T.BoxGeometry(L,.05,.06),M.berm,0,.025,-W/2+.03,-.35,0,0);                 // 앞 둔덕(차체를 가림)
    for(const s of [-1,1])add(new T.BoxGeometry(.05,.035,W*.75),M.berm,s*L/2,.017,-.03,0,0,s*.3);
    add(new T.BoxGeometry(L*.6,.004,.12),M.berm,0,.004,W/2,-.12,0,0);}               // 뒤쪽 경사로
  else if(f.k==='ditch'){const L=d.len,W=d.w;add(new T.BoxGeometry(L,.004,W*.65),M.pit,0,.002,0);
    for(const s of [-1,1])add(new T.BoxGeometry(L,.03,.05),M.berm,0,.012,s*W*.42,s*.4,0,0);
    add(new T.BoxGeometry(L*1.02,.05,.07),M.berm,0,.025,W*.75,.2,0,0);}               // 파낸 흙을 뒤쪽(우리 쪽)에 쌓는다
  else if(f.k==='op'){add(new T.BoxGeometry(.14,.035,.12),M.berm,0,.018,0);add(new T.BoxGeometry(.15,.012,.13),M.plank,0,.042,0);
    add(new T.BoxGeometry(.16,.02,.14),S.net,0,.056,0,0,R()*.3,0);add(new T.BoxGeometry(.08,.01,.004),M.pit,0,.03,-.062);}
  else if(f.k==='ammo'){for(let i=0;i<7;i++){const row=i<4?0:1,col=row?i-4:i;add(new T.BoxGeometry(.045,.025,.028),S.box,-.07+col*.048+(row?.024:0),.013+row*.026,(R()-.5)*.02);}
    for(let i=0;i<3;i++)add(new T.BoxGeometry(.045,.025,.028),S.box,-.05+i*.05,.013,.05);
    add(new T.BoxGeometry(.2,.006,.11),S.tarp,0,.056,.01,.06,0,0);for(let i=0;i<6;i++)add(new T.BoxGeometry(.04,.02,.03),M.bag,-.1+i*.04,.01,-.075);}
  else if(f.k==='cpost'){const tent=add(new T.CylinderGeometry(.11,.11,.22,4),S.tent,0,.055,0,-Math.PI/2,0,Math.PI/4);tent.scale.set(1,1,.55);
    add(new T.CylinderGeometry(.0025,.0035,.32,4),S.ant,.12,.16,.06);add(new T.CylinderGeometry(.0025,.0035,.24,4),S.ant,.13,.12,-.05);
    add(new T.BoxGeometry(.05,.03,.03),S.olive,.12,.015,.04);
    for(let i=0;i<9;i++){const a=-1.6+i*.4;add(new T.BoxGeometry(.045,.025,.03),M.bag,Math.sin(a)*.17,.013,-Math.cos(a)*.13,0,-a,0);}}
  else if(f.k==='camo'){const L=d.len*.9;for(const [a,b] of [[-1,-1],[1,-1],[-1,1],[1,1]])add(new T.CylinderGeometry(.004,.004,.1,4),M.post,a*L/2,.05,b*L/2);
    const net=add(new T.PlaneGeometry(L*1.08,L*1.08,4,4),S.net,0,.1,0,-Math.PI/2,0,0);const p=net.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,(R()-.5)*.02-(Math.abs(p.getX(i))<L*.4&&Math.abs(p.getY(i))<L*.4?.0:.02));p.needsUpdate=true;net.geometry.computeVertexNormals();net.castShadow=false;}
  g.position.set(f.x,0,f.z);g.rotation.y=f.ry||0;return g;}
{const _fm=v3FortMesh;v3FortMesh=function(f){if(typeof SG_KIND!=='undefined'&&SG_KIND.has(f.k))return v3SiegeMesh(f);return _fm(f);};}
