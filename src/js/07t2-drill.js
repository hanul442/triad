/* ===================== 3D: 전투 동작 자세(05z-drill의 m.pose) =====================
   병사 모형이 자세를 직접 그릴 줄 알면(v3FigPose가 있으면) 그쪽이 m.pose를 읽으니 여기서는 아무것도 하지 않는다.
   없으면 지금 모형으로 할 수 있는 만큼 흉내 낸다: 몸 낮추기(무릎·재장전), 눕기(엎드림·기기·부상),
   몸을 옆으로 기울이기(모서리 사격), 숙이기(부상자 끌기), 한 팔 들기(수신호)·앞으로 뻗기(가리키기). */
function v3DrillArm(fig){if(fig.userData.drArm)return fig.userData.drArm;const T=V3.T;
  const g=V3.drArmG||(V3.drArmG=new T.BoxGeometry(.013,.042,.013).translate(0,.021,0));const mt=V3.drArmM||(V3.drArmM=new T.MeshStandardMaterial({color:'#6a6550',roughness:.9,flatShading:true}));const a=new T.Mesh(g,mt);a.castShadow=true;a.userData.keepGeo=1;a.userData.keepMat=1;
  a.position.set(.002,.112,-.027);a.visible=false;fig.add(a);fig.userData.drArm=a;return a;}
{const _a=v3MenAnim;v3MenAnim=function(o,uu,dt,now,fa){_a(o,uu,dt,now,fa);if(typeof v3FigPose==='function')return;
  const M=uu._men,S=o.userData.sold;if(!M||!S)return;const k=Math.min(1,dt*8);
  S.forEach((s,i)=>{const m=M[i],fig=s.m;if(!m||!fig||!fig.visible||s.cx)return;const p=m.pose;
    if(s.dz==null){s.dz=fig.rotation.z;s.ds=fig.scale.y;s.dx=0;fig.rotation.order='YXZ';}   // 옆 기울기를 몸 앞 방향 축으로(방향 돌리기 전에)
    if(!p){s.dz=fig.rotation.z;s.ds=fig.scale.y;s.dx+=(0-s.dx)*k;fig.rotation.x=s.dx;if(fig.userData.drArm)fig.userData.drArm.visible=false;return;}
    const lie=p==='prone'||p==='crawl'||p==='down';
    const tz=lie?-1.42:p==='carry'?-.45:0,ts=p==='kneel'||p==='reload'?.72:p==='carry'?.86:1,tx=p==='lean'?(m.leanS||1)*.32:0;
    s.dz+=(tz-s.dz)*k;s.ds+=(ts-s.ds)*k;s.dx+=(tx-s.dx)*k;fig.rotation.z=s.dz;fig.scale.y=s.ds;fig.rotation.x=s.dx;
    const sig=p==='signal'||p==='point';const arm=sig||fig.userData.drArm?v3DrillArm(fig):null;
    if(arm){arm.visible=sig;if(sig){const w=p==='signal'?Math.sin(now/160+i)*.25:0;arm.rotation.set(0,0,p==='point'?-1.45:-.15+w);}}});};}
