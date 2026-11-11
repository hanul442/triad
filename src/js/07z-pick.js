/* ===================== 빠른 맞히기(탭·마우스 아래 물체 찾기) =====================
   three.js는 인스턴스 묶음(건물 벽·지붕·소품 수만 개)을 광선으로 맞힐 때 인스턴스마다 행렬을 곱해 둘레 공을 다시 구한다.
   그래서 탭 한 번·마우스 움직임 한 번에 10ms 넘게 걸렸다(PC에서 마우스를 움직이면 화면이 끊김).
   인스턴스마다 둘레 공(중심·반지름)을 한 번 구해 두고, 광선이 공을 지나지 않는 인스턴스는 바로 건너뛴다.
   공을 지나는 인스턴스는 three.js와 똑같이 맞혀 보므로 맞히는 결과는 그대로다. 인스턴스 행렬이 바뀌면(version) 다시 구한다. */
function pickPatch(T){const IM=T&&T.InstancedMesh;if(!IM||IM.prototype._pkFast)return;const R0=IM.prototype.raycast;
  const m4=new T.Matrix4(),iw=new T.Matrix4(),mesh=new T.Mesh(),sph=new T.Sphere(),v=new T.Vector3(),tmp=[];
  IM.prototype._pkFast=true;IM.prototype._pkR0=R0;   // 원래 함수(비교 시험용)
  IM.prototype.raycast=function(rc,out){const n=this.count;if(n<32||!this.geometry||this.material===undefined)return R0.call(this,rc,out);
    const mw=this.matrixWorld;if(this.boundingSphere===null)this.computeBoundingSphere();sph.copy(this.boundingSphere).applyMatrix4(mw);if(!rc.ray.intersectsSphere(sph))return;
    const g=this.geometry;if(g.boundingSphere===null)g.computeBoundingSphere();
    let C=this._pkC;const ver=this.instanceMatrix.version,me=mw.elements;
    if(!C||C.ver!==ver||C.n!==n||C.g!==g||C.gs!==g.boundingSphere.radius||C.mw.some((x,i)=>x!==me[i])){
      C=this._pkC={ver,n,g,gs:g.boundingSphere.radius,mw:me.slice(),s:new Float64Array(n*4)};const gc=g.boundingSphere.center,gr=g.boundingSphere.radius;
      for(let i=0;i<n;i++){this.getMatrixAt(i,m4);iw.multiplyMatrices(mw,m4);v.copy(gc).applyMatrix4(iw);const r=gr*iw.getMaxScaleOnAxis();
        C.s[i*4]=v.x;C.s[i*4+1]=v.y;C.s[i*4+2]=v.z;C.s[i*4+3]=r*1.001+1e-4;}}   // 반지름에 아주 조금 여유: 반올림 차이로 놓치지 않게
    const o=rc.ray.origin,d=rc.ray.direction,S=C.s;mesh.geometry=g;mesh.material=this.material;
    for(let i=0;i<n;i++){const q=i*4,dx=S[q]-o.x,dy=S[q+1]-o.y,dz=S[q+2]-o.z,t=dx*d.x+dy*d.y+dz*d.z,r=S[q+3];
      const d2=dx*dx+dy*dy+dz*dz-t*t;if(d2>r*r)continue;if(t<0&&dx*dx+dy*dy+dz*dz>r*r)continue;   // 광선 뒤쪽
      this.getMatrixAt(i,m4);iw.multiplyMatrices(mw,m4);mesh.matrixWorld=iw;mesh.raycast(rc,tmp);
      for(const h of tmp){h.instanceId=i;h.object=this;out.push(h);}tmp.length=0;}};}
if(typeof v3Init==='function'){const _i=v3Init;v3Init=function(){try{pickPatch(V3.T);}catch(e){}return _i.apply(this,arguments);};}
/* 큰 합친 메시(도시 벽·지붕·땅, 삼각형 수천~수만 개)는 three.js가 광선마다 삼각형을 전부 맞혀 본다.
   메시마다 땅 위(x·z) 격자를 만들어 칸별 삼각형 목록을 두고, 광선이 지나는 칸의 삼각형만 three.js 방식 그대로 맞혀 본다.
   격자용 번호 목록(index)만 새로 만들고 꼭짓점은 같이 쓰므로 맞힌 점·면 번호는 원래와 같다. */
function pickGridPatch(T){const MP=T&&T.Mesh&&T.Mesh.prototype;if(!MP||MP._pkGrid)return;MP._pkGrid=true;const C0=MP._computeIntersections;MP._pkC0=C0;
  const build=g=>{const pos=g.attributes.position,ix=g.index,nt=ix?ix.count/3:pos.count/3;if(g.boundingBox===null)g.computeBoundingBox();const bb=g.boundingBox;
    const x0=bb.min.x,z0=bb.min.z,ext=Math.max(bb.max.x-x0,bb.max.z-z0,1e-3),cs=Math.max(.5,ext/64),GX=Math.max(1,Math.ceil((bb.max.x-x0)/cs)+1),GZ=Math.max(1,Math.ceil((bb.max.z-z0)/cs)+1);
    const cnt=new Uint32Array(GX*GZ),V=i=>ix?ix.getX(i):i,e=1e-4,box=new Float64Array(nt*4);
    for(let t=0;t<nt;t++){let a=Infinity,b=-Infinity,c=Infinity,d=-Infinity;for(let k=0;k<3;k++){const v=V(t*3+k),x=pos.getX(v),z=pos.getZ(v);if(x<a)a=x;if(x>b)b=x;if(z<c)c=z;if(z>d)d=z;}
      const i0=Math.max(0,Math.floor((a-e-x0)/cs)),i1=Math.min(GX-1,Math.floor((b+e-x0)/cs)),j0=Math.max(0,Math.floor((c-e-z0)/cs)),j1=Math.min(GZ-1,Math.floor((d+e-z0)/cs));
      box[t*4]=i0;box[t*4+1]=i1;box[t*4+2]=j0;box[t*4+3]=j1;for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++)cnt[j*GX+i]++;}
    const st=new Uint32Array(GX*GZ+1);for(let q=0;q<GX*GZ;q++)st[q+1]=st[q]+cnt[q];if(st[GX*GZ]>nt*24)return null;   // 큰 삼각형이 많으면 쓰지 않는다
    const fill=st.slice(0,GX*GZ),idx=new Uint32Array(st[GX*GZ]*3),map=new Uint32Array(st[GX*GZ]);
    for(let t=0;t<nt;t++){for(let j=box[t*4+2];j<=box[t*4+3];j++)for(let i=box[t*4];i<=box[t*4+1];i++){const q=fill[j*GX+i]++;map[q]=t;idx[q*3]=V(t*3);idx[q*3+1]=V(t*3+1);idx[q*3+2]=V(t*3+2);}}
    const pg=new T.BufferGeometry();pg.attributes=g.attributes;pg.setIndex(new T.BufferAttribute(idx,1));
    return {pg,map,st,GX,GZ,x0,z0,cs,bb};};
  MP._computeIntersections=function(rc,out,ray){const g=this.geometry,m=this.material;
    if(!g||Array.isArray(m)||!g.attributes.position||g.drawRange.start!==0||g.drawRange.count!==Infinity)return C0.call(this,rc,out,ray);
    const nt=g.index?g.index.count/3:g.attributes.position.count/3;if(nt<1500)return C0.call(this,rc,out,ray);
    const pv=g.attributes.position.version,iv=g.index?g.index.version:-1;let P=g._pkG;
    if(!P||P.pv!==pv||P.iv!==iv||P.n!==nt||P.pos!==g.attributes.position||P.ix!==g.index){P=g._pkG={pv,iv,n:nt,pos:g.attributes.position,ix:g.index,G:build(g)};}
    const Gd=P.G;if(!Gd)return C0.call(this,rc,out,ray);
    // 광선이 상자 안을 지나는 구간 [ta,tb]
    const o=ray.origin,d=ray.direction,b=Gd.bb,e=1e-4;let ta=0,tb=Infinity;
    for(const [oo,dd,lo,hi] of [[o.x,d.x,b.min.x,b.max.x],[o.y,d.y,b.min.y,b.max.y],[o.z,d.z,b.min.z,b.max.z]]){
      if(Math.abs(dd)<1e-12){if(oo<lo-e||oo>hi+e)return;continue;}let t1=(lo-e-oo)/dd,t2=(hi+e-oo)/dd;if(t1>t2){const s=t1;t1=t2;t2=s;}if(t1>ta)ta=t1;if(t2<tb)tb=t2;}
    if(ta>tb)return;
    // 지나는 칸을 차례로(DDA)
    const cells=[],cs=Gd.cs,GX=Gd.GX,GZ=Gd.GZ;const px=o.x+d.x*ta-Gd.x0,pz=o.z+d.z*ta-Gd.z0;let i=Math.min(GX-1,Math.max(0,Math.floor(px/cs))),j=Math.min(GZ-1,Math.max(0,Math.floor(pz/cs)));
    const si=d.x>0?1:-1,sj=d.z>0?1:-1;const tdx=Math.abs(d.x)>1e-12?cs/Math.abs(d.x):Infinity,tdz=Math.abs(d.z)>1e-12?cs/Math.abs(d.z):Infinity;
    let tx=Math.abs(d.x)>1e-12?ta+((si>0?(i+1)*cs:i*cs)-px)/d.x:Infinity,tz=Math.abs(d.z)>1e-12?ta+((sj>0?(j+1)*cs:j*cs)-pz)/d.z:Infinity;
    for(let guard=0;guard<GX+GZ+4;guard++){cells.push(j*GX+i);
      // 칸 모서리를 스칠 때 옆 칸도 넣는다(반올림으로 놓치지 않게)
      if(Math.abs(tx-tz)<1e-9){if(i+si>=0&&i+si<GX)cells.push(j*GX+i+si);if(j+sj>=0&&j+sj<GZ)cells.push((j+sj)*GX+i);}
      if(tx<tz){if(tx>tb)break;i+=si;tx+=tdx;}else{if(tz>tb)break;j+=sj;tz+=tdz;}if(i<0||j<0||i>=GX||j>=GZ)break;}
    const seen=new Set(),tmp=[];this.geometry=Gd.pg;
    try{for(const q of cells){const a=Gd.st[q],z=Gd.st[q+1];if(a===z)continue;Gd.pg.drawRange.start=a*3;Gd.pg.drawRange.count=(z-a)*3;C0.call(this,rc,tmp,ray);
        for(const h of tmp){const f=Gd.map[h.faceIndex];if(seen.has(f))continue;seen.add(f);h.faceIndex=f;out.push(h);}tmp.length=0;}}
    finally{this.geometry=g;Gd.pg.drawRange.start=0;Gd.pg.drawRange.count=Infinity;}};}
if(typeof v3Init==='function'){const _i=v3Init;v3Init=function(){try{pickGridPatch(V3.T);}catch(e){}return _i.apply(this,arguments);};}
