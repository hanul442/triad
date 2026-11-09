/* ===================== 총구 자리: 주포·동축·차장·장전수·지붕 기관총 =====================
   차량 모형(07zv)은 재질별로 합쳐져 포신 원통을 찾을 수 없다. 모형을 만든 좌표 그대로 총구 끝을 적어 두고,
   포탑(돌아가는 무리) 또는 차체 기준으로 실제 화면 위치를 구한다. 05na-pen 부무장은 shot.mnt로 어느 총인지 알려 준다.
   좌표: 모형 단위(m), 앞이 +x. [x, y, z, 'tur'|'hull'] */
const MNT={
  tank:{w:{main:[7.45,.42,0],coax:[2.95,.42,.38],cmd:[1.15,1.27,.75],ldr:[1.1,1.17,-.85]},e:{main:[6.5,.3,0],coax:[1.95,.3,.32],cmd:[1.15,1.1,-.6]}},
  ifv:{w:{main:[1.75,.57,0]},e:{main:[4.0,.38,0],coax:[1.3,.38,-.22]}},
  spg:{w:{main:[9.95,.65,0],roof:[1.05,1.77,.75]}},
  hmv:{w:{main:[1.8,.47,0]}},
  sup:{w:{ring:[3.55,3.06,.5,'hull']},e:{ring:[2.15,3.0,.5,'hull']}},
  rec:{w:{ring:[3.95,3.06,.6,'hull']}},
};
let MNT_CUR=null;
function mntAt(a,id){const T=MNT[a.type];if(!T)return null;const k=(a.nat%2===1&&T.e)?T.e:T.w;const p=k[id]||(id!=='main'?null:null);if(!p)return null;
  const o=V3.uo.get(a.id);if(!o)return null;let tur=o.userData._gtur;
  if(tur===undefined){tur=null;o.traverse(q=>{if(!tur&&q.userData&&q.userData.turret)tur=q;});o.userData._gtur=tur;}
  let base=null;if(p[3]==='hull'){o.traverse(q=>{if(!base&&q.isMesh&&q.userData&&q.userData.body&&q.parent)base=q.parent;});}else base=tur;if(!base)return null;
  const V=V3.T.Vector3;base.updateWorldMatrix(true,false);const P=base.localToWorld(new V(p[0]*MU,p[1]*MU,p[2]*MU)),Q=base.localToWorld(new V((p[0]-1)*MU,p[1]*MU,p[2]*MU));
  const dx=P.x-Q.x,dy=P.y-Q.y,dz=P.z-Q.z,L=Math.hypot(dx,dy,dz)||1;return {x:P.x,y:P.y,z:P.z,dx:dx/L,dy:dy/L,dz:dz/L,B:null};}
{const _b=gfxBarrel;gfxBarrel=function(a){if(MNT_CUR){const m=mntAt(a,MNT_CUR);if(m)return m;}const r=_b(a);if(r)return r;return mntAt(a,'main');};}
{const _f=v3FxFire;v3FxFire=function(a,r,c,d,shot){const p=MNT_CUR;MNT_CUR=shot&&shot.mnt||null;try{return _f.apply(this,arguments);}finally{MNT_CUR=p;}};}
