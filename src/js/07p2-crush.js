/* ===================== 3D: 전차에 깔린 주차 차 =====================
   05b2-motion이 전차·자주포가 깔고 지나간(또는 끼인 차량이 밀고 나간) 주차 차를 p.crush로 표시하면,
   그 차의 차체·유리칸·지붕·바퀴 인스턴스를 찾아 납작하게 누른다. 인스턴스 메시는 07z-perf가 지도 조각별로 나눠도
   형상(geometry)은 같이 쓰므로 형상과 자리로 찾는다. */
const CRUSH={body:.32,top:.18,dark:'#5a5650'};
function v3CrushCar(p){if(typeof V3==='undefined'||!V3.on||!V3.G||!V3.G.world||!V3.carG)return;const T=V3.T,cg=V3.carG[p.kind];if(!cg)return;
  const m4=new T.Matrix4(),pos=new T.Vector3(),q=new T.Quaternion(),sc=new T.Vector3(),c=new T.Color(CRUSH.dark);
  // 바퀴 자리(07p-props와 같은 계산)
  const wh=[];if(!p.burnt&&!p.lot){const m=MU,L=CAR_KINDS[p.kind].body[1][0]*.62*m,W=CAR_KINDS[p.kind].w*.5*m,cs=Math.cos(p.ry),sn=Math.sin(p.ry);
    for(const [fx,fz] of [[1,1],[1,-1],[-1,1],[-1,-1]]){const lx=fx*L,lz=fz*W;wh.push([p.x+lx*cs+lz*sn,p.z-lx*sn+lz*cs]);}}
  const parts=new Map([[cg.body,CRUSH.body],[cg.cab,CRUSH.top],[cg.roof,CRUSH.top],[V3.carG.wheel,.5]]);
  V3.G.world.traverse(o=>{if(!o.isInstancedMesh)return;const k=parts.get(o.geometry);if(k==null)return;let hit=false;
    for(let i=0;i<o.count;i++){o.getMatrixAt(i,m4);m4.decompose(pos,q,sc);
      const at=o.geometry===V3.carG.wheel?wh.some(([x,z])=>Math.abs(pos.x-x)<.004&&Math.abs(pos.z-z)<.004):Math.abs(pos.x-p.x)<.002&&Math.abs(pos.z-p.z)<.002;
      if(!at)continue;
      // 바닥(지금 높이) 기준으로 위아래만 누르고, 조금 옆으로 퍼지게
      const y0=o.geometry===V3.carG.wheel?0:pos.y;const S=new T.Matrix4().makeScale(1.04,k,1.04),A=new T.Matrix4().makeTranslation(-pos.x,-y0,-pos.z),B=new T.Matrix4().makeTranslation(pos.x,y0,pos.z);
      m4.premultiply(A).premultiply(S).premultiply(B);o.setMatrixAt(i,m4);if(o.instanceColor&&o.geometry===cg.body){o.getColorAt(i,c);c.multiplyScalar(.6);o.setColorAt(i,c);o.instanceColor.needsUpdate=true;}hit=true;}
    if(hit){o.instanceMatrix.needsUpdate=true;o.computeBoundingSphere();}});}
FXH.carCrush=function(p){try{v3CrushCar(p);if(typeof sfx==='function')sfx('crumble',.5,p.x,p.z);}catch(e){}};
/* 새로 그린 지도(불러오기 등)에도 이미 깔린 차를 누른 채로 */
if(typeof v3BuildWorld==='function'){const f=v3BuildWorld;v3BuildWorld=function(){const r=f.apply(this,arguments);try{for(const p of G.props||[])if(p.crush)v3CrushCar(p);}catch(e){}return r;};}
