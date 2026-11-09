/* ===================== 도어거너 사격 연출 =====================
   휴이 모형(07x3) 양쪽 문 기관총 총구(모형 1m 좌표 x -.75, y 1.47, z ±2.3)에서, 표적 쪽 문으로 쏜다.
   총구 화염·탄피, 예광탄(4발에 1발), 탄착이 표적 둘레를 훑는다. */
{const _vh=v3Heli;v3Heli=function(r,c,n){const n0=V3.fx?V3.fx.length:0;const out=_vh.apply(this,arguments);if(V3.fx&&V3.fx.length>n0){V3.hueys=V3.hueys||new Map();V3.hueys.set(key(r,c),V3.fx[V3.fx.length-1].o);}return out;};}
FXH.doorgun=function(g,e,hits,k){if(typeof sndShot==='function')sndShot({type:'mg',x:g.x,z:g.z,r:g.r,c:g.c,nat:g.n});if(!V3.on||typeof gfxMuzzle!=='function')return;if(!PFX.on)pfxInit();if(!PFX.on)return;
  const H=V3.hueys&&V3.hueys.get(key(g.r,g.c));if(!H||!H.visible||!H.userData.body)return;const T=V3.T;const b=H.userData.body;b.updateWorldMatrix(true,false);
  const [x2,y2,z2]=v3Pos(e.r,e.c,e);let best=null;for(const s of [-1,1]){const p=b.localToWorld(new T.Vector3(-.75,1.47,s*2.3));const d=Math.hypot(p.x-x2,p.z-z2);if(!best||d<best.d)best={p,d};}
  const P=best.p;let dx=x2-P.x,dy=y2-P.y,dz=z2-P.z;const D=Math.hypot(dx,dy,dz)||1;dx/=D;dy/=D;dz/=D;const tc=gfxTrC({nat:g.n});const lod=gfxLod(P.x,P.z);
  for(let i=0;i<k;i++){const dl=i*.07*gfxR(.85,1.15);gfxMuzzle(P.x,P.y,P.z,dx,dy,dz,.07,i%2?0:.07,dl,lod);if(lod>.4)gfxBrass(P.x,P.y,P.z,dx,dz,dl);
    const L=gfxLand(P.x,P.y,P.z,x2,y2,z2,e,i<hits,null);// 흔들리는 헬기: 더 넓게 흩어진다
    if(L.ny>.5){L.x+=gfxR(-.12,.12);L.z+=gfxR(-.12,.12);}const dd=Math.hypot(L.x-P.x,L.y-P.y,L.z-P.z);
    if((i+(GFX.dgc=(GFX.dgc||0)+1))%4===0)gfxTracer(P.x,P.y,P.z,L.x,L.y,L.z,72,tc,.018,dl,.5);
    gfxHit(L.x,L.y,L.z,L.m,L.nx,L.ny,L.nz,1.1,dl+dd/72,gfxLod(L.x,L.z));}};
