/* ===================== 도시 디테일 =====================
   건물과 거리를 실제 도시처럼 보이게 하는 장식. 그림만 바꾸고 게임 규칙(엄폐·시야·이동)은 건드리지 않는다.
   - 외벽(v3BuildCity 뒤): 발코니(아파트는 샷시로 막은 발코니), 벽걸이 실외기, 벽돌 상가의 비상계단과 세로 간판,
     홈통, 유리 빌딩의 세로 멀리언, 창고 셔터와 배관. 창 자리는 외벽 무늬(64px 칸)와 맞춘다.
   - 옥상: 환기구, 위성 안테나, 태양광 판, 고층 곤돌라, 초록 방수 페인트 옥상(우레탄 방수).
   - 전투 흔적: 창 위 그을음, 무너진 건물의 철근, 길로 쏟아진 잔해와 먼지.
   - 거리(v3BuildWorld 뒤): 전봇대와 전선, 버스 정류장, 가로수, 소화전, 맨홀·빗물받이, 덧씌운 아스팔트,
     쓰레기 봉투 더미, 통신 함체.
   외벽·옥상 장식은 건물 단면(07f-floors)이 잘린 층보다 위에 있으면 숨긴다. */

const CXW=1.68;   // 외벽 무늬 한 장(8칸)의 가로 길이: 창 한 칸 = .21
// 외벽 종류별 창 세로 자리(층 높이 대비, 아래에서): 0 패널, 1 유리, 2 벽돌, 3 골함석
const CX_WIN=[[.31,.78],[0,.77],[.25,.75],[.75,.91]];
const CX={cut:null,ctag:null,lab:[],fac:[]};

function cxMats(){if(CX.m)return CX.m;const T=V3.T;
  const m={
    paint:new T.MeshStandardMaterial({color:'#ffffff',roughness:.85}),
    iron:new T.MeshStandardMaterial({color:'#ffffff',roughness:.6,metalness:.45}),
    glass:new T.MeshStandardMaterial({color:'#ffffff',roughness:.22,metalness:.55}),
    deb:new T.MeshStandardMaterial({color:'#ffffff',roughness:1,flatShading:true}),
    wire:new T.LineBasicMaterial({color:'#1b1a19',transparent:true,opacity:.85}),
  };
  for(const k of ['paint','iron','glass','deb'])v3FowMat(m[k]);
  // 그을음: 아래가 짙고 위로 옅어지는 불규칙한 띠
  const R=mulberry(77);
  const soot=v3Tex(64,128,(g,w,h)=>{g.clearRect(0,0,w,h);for(let i=0;i<26;i++){const x=10+R()*44,ww=6+R()*16,top=R()*60;const gr=g.createLinearGradient(0,h,0,top);
      gr.addColorStop(0,'rgba(0,0,0,.55)');gr.addColorStop(.45,'rgba(0,0,0,.28)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(x-ww/2,top,ww,h-top);}});
  m.grime=new T.MeshBasicMaterial({map:soot,color:'#2a241c',transparent:true,opacity:.45,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  m.soot=new T.MeshBasicMaterial({map:soot,color:'#16130f',transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  // 바닥 얼룩: 흙먼지(밝게), 덧씌운 아스팔트·기름(어둡게). 둥글고 가장자리가 흐린 무늬
  const blot=v3Tex(64,64,(g,w,h)=>{g.clearRect(0,0,w,h);for(let i=0;i<14;i++){const x=16+R()*32,y=16+R()*32,r=8+R()*16;const gr=g.createRadialGradient(x,y,0,x,y,r);
      gr.addColorStop(0,'rgba(255,255,255,.5)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);}});
  m.dust=new T.MeshStandardMaterial({map:blot,color:'#a39883',roughness:1,transparent:true,opacity:.45,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
  m.stain=new T.MeshStandardMaterial({color:'#ffffff',roughness:1,transparent:true,opacity:.5,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  for(const k of ['dust','stain'])v3FowMat(m[k]);
  CX.m=m;return m;}

function cxGeos(){if(CX.g)return CX.g;const T=V3.T;
  const dish=new T.CylinderGeometry(.034,.01,.014,10);dish.rotateX(-1.05);dish.translate(0,.05,0);
  const flat=new T.PlaneGeometry(1,1);flat.rotateX(-Math.PI/2);
  CX.g={box:new T.BoxGeometry(1,1,1),cyl:new T.CylinderGeometry(.5,.5,1,6),ico:new T.IcosahedronGeometry(1,0),dode:new T.DodecahedronGeometry(1,0),
    plane:new T.PlaneGeometry(1,1),flat,dish};
  return CX.g;}

/* 인스턴스 묶음. it: {x,y,z,sx,sy,sz,rx,ry,rz,col,k} (y는 가운데). keyed면 단면용 키·높이를 남긴다 */
function cxInst(g,geo,mat,L,opt){if(!L.length)return null;
  const T=V3.T;const im=new T.InstancedMesh(geo,mat,L.length);
  const m4=new T.Matrix4(),q=new T.Quaternion(),p=new T.Vector3(),s=new T.Vector3(),e=new T.Euler(0,0,0,'YXZ'),c=new T.Color();
  L.forEach((it,i)=>{p.set(it.x,it.y,it.z);e.set(it.rx||0,it.ry||0,it.rz||0);q.setFromEuler(e);s.set(it.sx,it.sy,it.sz);m4.compose(p,q,s);im.setMatrixAt(i,m4);im.setColorAt(i,c.set(it.col||'#ffffff'));});
  im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;
  im.castShadow=!(opt&&opt.noShadow);im.receiveShadow=!(opt&&opt.noRecv);im.computeBoundingSphere();
  if(!(opt&&opt.chunk))im.userData.chunk=1;   // 작은 형상은 07z-perf가 구역별로 쪼개지 않는다(쪼개면 그리기 호출만 는다)
  im.userData.cx=1;if(opt&&opt.fac)CX.fac.push(im);
  if(opt&&opt.keyed){im.userData.chunk=1;   // 07z-perf가 조각내지 않게(단면이 이 메시를 직접 고친다)
    const by=new Map();L.forEach((it,i)=>{if(it.k==null)return;let a=by.get(it.k);if(!a)by.set(it.k,a=[]);a.push(i);});
    CX.cut.push({im,by,y:L.map(it=>it.cy!=null?it.cy:it.y+(it.sy||0)/2),m0:im.instanceMatrix.array.slice()});}
  g.add(im);return im;}

/* 칸의 바깥 벽 면들. 빈 땅을 향한 면만(이웃 건물과 맞댄 면은 뺀다). v3BuildCity의 box()와 같은 꼭짓점·무늬 좌표를 쓴다 */
function cxFaces(r,c,x0,x1,z0,z1){const F=[];
  const S=[[-1,0,[x1,z0],[x0,z0],0,-1,x0],[0,1,[x1,z1],[x1,z0],1,0,z0],[1,0,[x0,z1],[x1,z1],0,1,x1],[0,-1,[x0,z0],[x0,z1],-1,0,z1]];
  for(const [a,b,A,B,nx,nz,cb] of S){const rr=r+a,cc=c+b;if(inb(rr,cc)&&G.map[rr][cc].t==='bldg')continue;
    const len=Math.hypot(B[0]-A[0],B[1]-A[1]);if(len<.15)continue;const nb=inb(rr,cc)?G.map[rr][cc]:null;
    F.push({ax:A[0],az:A[1],dx:(B[0]-A[0])/len,dz:(B[1]-A[1])/len,len,nx,nz,cb,ry:Math.atan2(nx,nz),road:!!nb&&nb.t==='road'&&!nb.al,nb});}
  return F;}
// 면 위 자리: 면 시작점에서 t만큼, 바깥으로 o만큼
const cxAt=(f,t,o)=>[f.ax+f.dx*t+f.nx*o,f.az+f.dz*t+f.nz*o];
// 이 면에서 창 칸 가운데가 오는 자리 목록 [t, 무늬 속 칸 번호 0..7]
function cxCols(f,u0,m){const uA=u0+f.cb/CXW,out=[];const n0=Math.ceil(uA*8-.5+m/.21);
  for(let n=n0;;n++){const t=.21*(n+.5-uA*8);if(t>f.len-m)break;out.push([t,((n%8)+8)%8]);}return out;}

const CX_SIGN=['#7d3a31','#2f4b66','#a8913f','#4c6648','#d6d0c2','#5e3a55','#b55a2c','#c9c3b4'];
const CX_DEB={0:['#8f8a82','#a39e94','#77736c','#b3ada2'],1:['#8f969a','#a9b0b2','#6f777c','#8f8a82'],2:['#7d5a4b','#8e6a58','#6b5248','#a08672'],3:['#8c9194','#6f7578','#9a8f80']};

/* ---------- 건물: 외벽·옥상·전투 흔적 ---------- */
function cxBuildCity(){const T=V3.T,g=V3.G.city;if(!G||!g||!T)return;cxMats();cxGeos();CX.cut=[];CX.lab=[];CX.fac=[];CX.labMesh=null;CX.ctag=null;CX.prev=new Map();
  const FH=FLOOR_H,IN=.08,M=G.map;const cl=typeof bmClime==='function'?bmClime():'temp';
  const P=[],I=[],GL=[],CY=[],DI=[],SO=[],DEB=[],DU=[],RP=[],RC=[],GR=[];   // 칠한 상자, 쇠, 유리, 원통, 접시 안테나, 그을음, 잔해, 먼지, 옥상 상자·원통
  const roofPaint=[],HP=[],LAB=new Map();const H=v3Hash;
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=M[r][c];const k=key(r,c);const [cx,cz]=v3x(r,c);
    if(x.t==='rubble'){// 무너진 칸: 잔해 더미에서 삐져나온 철근
      for(let i=0;i<4;i++)if(H(k,600+i)<.6){const a=H(k,610+i)*6.283,rr=H(k,620+i)*.3,l=.06+H(k,630+i)*.1;I.push({x:cx+Math.cos(a)*rr,y:.03+l*.4,z:cz+Math.sin(a)*rr,sx:.006,sy:l,sz:.006,rx:(H(k,640+i)-.5)*1.4,rz:(H(k,650+i)-.5)*1.4,col:'#4a3a30'});}
      continue;}
    if(x.t!=='bldg'||x.lm)continue;
    const dmg=1-x.bhp/x.bmax;let h=x.f*FH;if(dmg>.5)h*=1-(dmg-.5)*.6;
    const ks=x.ks||(x.ind?'ware':x.f>=8?'tower':x.dist==='res'&&x.f<=2?'house':'panel');const bk=x.blk??k;
    const s=ks==='house'&&H(bk,5)<.45?0:(KSTY[ks]||KSTY.panel).s;
    const same=(a,b)=>inb(a,b)&&M[a][b].t==='bldg'&&x.blk!=null&&M[a][b].blk===x.blk&&M[a][b].bhp/M[a][b].bmax>.5&&dmg<.5;
    const x0=cx-.5+(same(r,c-1)?0:IN),x1=cx+.5-(same(r,c+1)?0:IN),z0=cz-.5+(same(r-1,c)?0:IN),z1=cz+.5-(same(r+1,c)?0:IN);
    const u0=((H(bk,3)*8)|0)*.37;const nf=Math.max(1,Math.floor(h/FH+.01));const W=CX_WIN[s];
    const faces=x._ch?[]:cxFaces(r,c,x0,x1,z0,z1);const ok=i=>dmg<.25||H(k,700+i)>dmg*1.6;   // 조금 부서진 건물은 장식이 듬성듬성
    const box=(L,f,t,o,y,sx,sy,sz,col,ex)=>{const [px,pz]=cxAt(f,t,o);L.push(Object.assign({x:px,y,z:pz,sx,sy,sz,ry:f.ry,col,k},ex||null));};
    const yF=i=>.06+i*FH;
    if(dmg<.4)faces.forEach((f,fi)=>{const cols=cxCols(f,u0,.06);const fk=k*4+fi;
      // 1층 아래 걸레받이(돌·타일 띠)와 땅 쪽 때(빗물 튄 자국)
      if(s!==1)box(P,f,f.len/2,.005,.06+.035,f.len,.07,.012,s===2?'#6a5d52':s===3?'#6b6e6f':'#6a6762');
      GR.push({x:f.ax+f.dx*f.len/2+f.nx*.004,y:.06+.13,z:f.az+f.dz*f.len/2+f.nz*.004,sx:f.len,sy:.26,sz:1,ry:f.ry,col:'#ffffff'});
      // 벽돌 건물 지붕선 코니스
      if(s===2&&!gableRoof(x))box(P,f,f.len/2,.018,.06+h-.016,f.len,.03,.036,'#b8af9e');
      // 전쟁 대비: 아래 두 층 창을 판자로 막거나 모래주머니를 쌓았다
      if(s===0||s===2)for(const [t,n] of cols){if(s===0&&(n%4===1||n%4===2)||s===2&&n%4===3)continue;
        for(let i=0;i<Math.min(2,nf);i++){if(i===0&&(ks==='shop'||x.dist==='down'))continue;const yc=yF(i)+(W[0]+W[1])/2*FH,hh=(W[1]-W[0])*FH;const q=H(fk,1500+i*8+n);
          if(q<.08){box(P,f,t,.007,yc,.13,hh*1.05,.008,['#8a7450','#7d6a4c','#96825c'][(H(fk,1510+n)*3)|0]);box(P,f,t,.012,yc+(H(fk,1520+n)-.5)*hh*.4,.15,.012,.006,'#6b5a40');}   // 판자
          else if(q<.12)box(P,f,t,.022,yF(i)+W[0]*FH+.022,.13,.045,.04,'#8a7c62');}}   // 모래주머니
      // 홈통: 면 끝 모서리
      if(nf>=2&&H(fk,710)<.7)P.push({x:f.ax+f.dx*(f.len-.03)+f.nx*.01,y:.06+h/2,z:f.az+f.dz*(f.len-.03)+f.nz*.01,sx:.014,sy:h,sz:.014,col:s===3?'#7d8487':'#6e6b65',k});
      if(s===0){// 패널·아파트: 발코니(무늬의 발코니 칸 1·2에 맞춘다)와 실외기
        const apt=ks==='apt',bal=apt||H(bk,720)<.7;
        for(const [t,n] of cols){for(let i=1;i<nf;i++){if(!ok(i*8+n))continue;const y=yF(i);
            if(n%4===1&&bal&&t+.21<f.len-.04){const tc=t+.105;
              box(P,f,tc,.035,y+.2*FH,.42,.014,.07,'#b9b5ac');                                   // 바닥판
              if(apt){const yb=y+.2*FH;box(GL,f,tc,.066,yb+.1,.42,.17,.006,H(fk,760+i)<.15?'#3c4448':'#93a3ab');box(P,f,tc,.068,yb+.018,.43,.03,.012,'#d8d4cc');box(P,f,tc,.068,yb+.19,.43,.012,.012,'#e2ded6');}   // 샷시로 막은 발코니
              else{box(I,f,tc,.068,y+.2*FH+.045,.42,.006,.006,'#3a3a37');box(P,f,tc,.068,y+.2*FH+.02,.42,.03,.004,'#a8a49b');}}   // 난간
            else if(n%4!==1&&n%4!==2&&H(fk,800+i*8+n)<.24)box(P,f,t,.022,y+W[0]*FH-.035,.075,.052,.04,H(fk,900+i)<.5?'#cfccc4':'#b9b7b0');}}}   // 벽걸이 실외기
      else if(s===2){// 벽돌: 창 아래 실외기, 빈 벽 칸(3)에 세로 간판, 상가·빌라 한 면에 비상계단
        let signs=0;
        for(const [t,n] of cols){
          if(n%4===3){if((ks==='shop'||ks==='villa'&&x.dist!=='res')&&signs<2&&nf>=2&&H(fk,820+n)<.45){const top=Math.min(nf-1,3);signs++;
              box(P,f,t,.06,(yF(1)+yF(top)+FH*.9)/2,.022,yF(top)-yF(1)+FH*.85,.11,CX_SIGN[(H(fk,830+n)*CX_SIGN.length)|0],{});
              box(I,f,t,.01,yF(top)+FH*.85,.012,.012,.03,'#3a3a37');}
            continue;}
          for(let i=1;i<nf;i++)if(ok(i*8+n)&&H(fk,840+i*8+n)<.2)box(P,f,t,.02,yF(i)+W[0]*FH+.022,.07,.045,.045,'#c9c6bd');}
        const fire=(ks==='shop'||ks==='villa'||ks==='school')&&nf>=3&&f.road&&fi===faces.findIndex(q=>q.road)&&H(bk,850)<.55;
        if(fire){const pair=cols.find(([t,n])=>n%4===0&&t+.21<f.len-.04);if(pair){const tc=pair[0]+.105,w=.44,dep=.08;
            for(let i=1;i<nf;i++){const y=yF(i)+W[0]*FH-.012;
              box(I,f,tc,dep/2+.004,y,w,.008,dep,'#34322f');                 // 발판
              box(I,f,tc,dep+.002,y+.05,w,.006,.006,'#34322f');              // 손잡이
              box(I,f,tc,dep+.002,y+.025,w,.004,.004,'#34322f');
              for(const e of [-1,1])box(I,f,tc+e*w/2,dep/2+.004,y+.025,.006,.05,dep,'#34322f');
              if(i<nf-1){const run=w*.7,ang=Math.atan2(FH,run);box(I,f,tc,dep/2+.004,y+FH/2,Math.hypot(run,FH),.008,dep*.55,'#2b2a28',{rz:(i%2?1:-1)*ang});}}}}}
      else if(s===1){// 유리 빌딩: 칸 경계마다 세로 멀리언
        if(H(bk,860)<.65)for(const [t] of cols){const tb=t-.105;if(tb<.03)continue;box(P,f,tb,.012,.06+h/2,.014,h,.024,'#c4c7c6');}}
      else if(s===3){// 창고·공장: 셔터와 벽 배관
        if(f.len>.4){const w=Math.min(.36,f.len*.55),tc=f.len/2+(H(fk,870)-.5)*(f.len-w-.1);
          box(P,f,tc,.006,.06+.12,w,.24,.012,['#8a8d8c','#6d7a80','#8c6e56','#9a9890'][(H(fk,871)*4)|0]);
          box(P,f,tc,.014,.06+.25,w+.03,.02,.025,'#5e6266');}
        if(H(fk,880)<.45&&h>.3){const y=.06+h-.07-H(fk,881)*.1;const [px,pz]=cxAt(f,f.len/2,.018);CY.push({x:px,y,z:pz,sx:.022,sy:f.len*.92,sz:.022,rx:Math.PI/2,ry:f.ry+Math.PI/2,col:'#7b7f80',k});}}});
    if(ks==='apt'&&nf>=6&&dmg<.3&&x.blk!=null){const f=faces.find(q=>q.road)||faces[0];if(f&&f.len>.6){const o=LAB.get(x.blk);const sc=(f.road?2:0)+H(k,990);if(!o||sc>o.sc)LAB.set(x.blk,{sc,f,k,top:.06+h,blk:x.blk});}}
    // 옥상
    const top=.06+h;
    if(dmg<.4&&!gableRoof(x)&&ks!=='ware'){const st=v3Stair(r,c);const free=(px,pz)=>Math.hypot(px-st.sx,pz-st.sz)>.22&&px>x0+.05&&px<x1-.05&&pz>z0+.05&&pz<z1-.05;
      const spot=(i)=>{const px=cx+(H(k,900+i)-.5)*.75,pz=cz+(H(k,910+i)-.5)*.75;return free(px,pz)?[px,pz]:null;};
      for(let i=0;i<3;i++)if(H(k,920+i)<.45){const p=spot(i);if(p){RC.push({x:p[0],y:top+.025,z:p[1],sx:.026,sy:.05,sz:.026,col:'#8d8a84',k});RC.push({x:p[0],y:top+.053,z:p[1],sx:.04,sy:.008,sz:.04,col:'#6f6c67',k});}}   // 환기구
      const resi=ks==='apt'||ks==='panel'||ks==='villa'||ks==='house'||ks==='shop';
      if(resi)for(let i=0;i<2;i++)if(H(k,930+i)<.28){const p=spot(3+i);if(p){DI.push({x:p[0],y:top,z:p[1],sx:1,sy:1,sz:1,cy:top+.08,ry:Math.PI+(H(k,935+i)-.5)*.8,col:'#a9a7a0',k});
          I.push({x:p[0],y:top+.025,z:p[1],sx:.006,sy:.05,sz:.006,col:'#4a4a47',k});}}   // 위성 안테나(남쪽을 본다)
      if((ks==='house'||ks==='villa'||ks==='school'||ks==='office')&&H(k,940)<.3){const n=2+(H(k,941)*2|0);for(let i=0;i<n;i++){const px=cx-.2+i*.15,pz=cz+.12;if(!free(px,pz))continue;
          GL.push({x:px,y:top+.04,z:pz,sx:.13,sy:.008,sz:.2,rx:-.45,col:'#2c3a4a',k});I.push({x:px,y:top+.02,z:pz-.06,sx:.12,sy:.04,sz:.006,col:'#555',k});}}   // 태양광 판
      if(s===1&&nf>=10&&H(bk,950)<.5&&!x._ch){RP.push({x:cx,y:top+.03,z:cz,sx:.16,sy:.05,sz:.1,col:'#a7aaa8',k});RP.push({x:cx+.09,y:top+.065,z:cz,sx:.2,sy:.016,sz:.016,col:'#8f9391',k});}   // 외벽 청소 곤돌라
      if((ks==='office'||ks==='tower'||ks==='school'||ks==='shop'&&x.dist==='down')&&!x._ch)for(let i=0;i<2;i++)if(H(k,970+i)<.5){const p=spot(6+i);if(!p)continue;const rot=H(k,975+i)<.5?0:Math.PI/2;   // 냉각탑·공조기: 상자 위에 팬 두 개
          RP.push({x:p[0],y:top+.035,z:p[1],sx:.2,sy:.07,sz:.11,ry:rot,col:'#b4b6b3',k});for(const d of [-.05,.05])RC.push({x:p[0]+(rot?0:d),y:top+.072,z:p[1]+(rot?d:0),sx:.07,sy:.006,sz:.07,col:'#2f3132',k});}
      if(ks==='tower'&&nf>=14&&H(bk,980)<.35&&!x._ch&&Math.hypot(st.sx-cx,st.sz-cz)>.15)HP.push({x:cx,y:top+.004,z:cz,k,cy:top+.01});   // 옥상 헬기장
      if((s===0||ks==='villa'||ks==='school')&&cl!=='winter'&&cl!=='desert'&&H(bk,960)<.38)roofPaint.push([k,H(bk,961)<.8?'#6f8c6c':'#7a6f5e']);}   // 초록 우레탄 방수 옥상
    // 전투 흔적
    if(dmg>.12&&faces.length){const n=Math.round(dmg*8);for(let i=0;i<n;i++){const f=faces[(H(k,1000+i)*faces.length)|0];const cols=cxCols(f,u0,.06);if(!cols.length)continue;
        const [t]=cols[(H(k,1010+i)*cols.length)|0];const fl=Math.min(nf-1,(H(k,1020+i)*nf)|0);const y0=yF(fl)+(W[0]+W[1])/2*FH;const hh=FH*(1.1+H(k,1030+i)*.9);
        const [px,pz]=cxAt(f,t,.004);SO.push({x:px,y:y0+hh/2,z:pz,sx:.2+H(k,1040+i)*.1,sy:hh,sz:1,cy:y0+.02,ry:f.ry,col:'#ffffff',k});}}
    if(dmg>.5){const n=6+Math.round(dmg*6);for(let i=0;i<n;i++){const e=(H(k,1100+i)*4)|0,t=H(k,1110+i);const px=e===0?x0+(x1-x0)*t:e===1?x1:e===2?x0+(x1-x0)*t:x0,pz=e===1?z0+(z1-z0)*t:e===3?z0+(z1-z0)*t:e===0?z0:z1;
        const l=.03+H(k,1120+i)*.07;I.push({x:px,y:top+l*.4,z:pz,sx:.004,sy:l,sz:.004,rx:(H(k,1130+i)-.5)*1.2,rz:(H(k,1140+i)-.5)*1.2,col:'#4a3a30',k});}}
    if(dmg>.3){const pal=CX_DEB[s]||CX_DEB[0];
      for(const f of cxFaces(r,c,x0,x1,z0,z1)){if(f.nb&&f.nb.t==='water')continue;const n=Math.round(dmg*10);const fk=k*4+f.ry*7|0;
        for(let i=0;i<n;i++){const t=H(fk,1200+i)*f.len,o=.02+Math.pow(H(fk,1210+i),1.6)*.42,sz=.014+Math.pow(H(fk,1220+i),2)*.045;const [px,pz]=cxAt(f,t,o);
          DEB.push({x:px,y:sz*.25,z:pz,sx:sz*1.4,sy:sz*.6,sz:sz,rx:H(fk,1230+i)*3,ry:H(fk,1240+i)*6,col:pal[(H(fk,1250+i)*pal.length)|0]});}
        const [px,pz]=cxAt(f,f.len/2,.2);DU.push({x:px,y:.008,z:pz,sx:Math.abs(f.dx)>.5?f.len*1.25:.55,sy:1,sz:Math.abs(f.dx)>.5?.55:f.len*1.25,ry:0,col:'#ffffff'});}}}
  const m=CX.m,G2=CX.g;
  // 외벽의 작은 장식은 그림자를 드리우지 않는다(그림자 패스 비용). 옥상 설비·비상계단은 드리운다
  cxInst(g,G2.box,m.paint,P,{keyed:1,noShadow:1,fac:1});cxInst(g,G2.box,m.iron,I,{keyed:1});cxInst(g,G2.box,m.glass,GL,{keyed:1,noShadow:1,fac:1});cxInst(g,G2.cyl,m.paint,CY,{keyed:1,noShadow:1,fac:1});cxInst(g,G2.dish,m.paint,DI,{keyed:1});
  cxInst(g,G2.box,m.paint,RP,{keyed:1});cxInst(g,G2.cyl,m.paint,RC,{keyed:1});
  cxInst(g,G2.plane,m.soot,SO,{keyed:1,noShadow:1,noRecv:1});cxInst(g,G2.plane,m.grime,GR,{noShadow:1,noRecv:1,fac:1});
  if(HP.length){const im=cxInst(g,G2.flat,cxHeliMat(),HP.map(o=>Object.assign(o,{sx:.62,sy:1,sz:.62,col:'#ffffff'})),{keyed:1,noShadow:1});}
  cxAptLabels(g,[...LAB.values()]);
  cxInst(g,G2.dode,m.deb,DEB);cxInst(g,G2.flat,m.dust,DU,{noShadow:1});
  // 옥상 칠: 지붕 사각형(키별)의 꼭짓점 색을 바꾼다
  const C=V3.cityM,rq=C&&C.rq,ra=C&&C.r&&C.r.geometry.attributes.color;
  if(rq&&ra&&roofPaint.length){const col=new T.Color(),o=new T.Color();for(const [k,hex] of roofPaint){col.set(hex);for(const q of rq.get(k)||[])for(let v=0;v<6;v++){const i=q*6+v;o.setRGB(ra.getX(i),ra.getY(i),ra.getZ(i));o.lerp(col,.75);ra.setXYZ(i,o.r,o.g,o.b);}}ra.needsUpdate=true;}}

/* 헬기장 표시: 원과 H */
function cxHeliMat(){if(CX.heli)return CX.heli;const T=V3.T;const t=v3Tex(128,128,(g,w,h)=>{g.clearRect(0,0,w,h);g.strokeStyle='rgba(225,220,205,.85)';g.lineWidth=7;g.beginPath();g.arc(64,64,54,0,7);g.stroke();
    g.fillStyle='rgba(225,220,205,.85)';g.fillRect(40,34,12,60);g.fillRect(76,34,12,60);g.fillRect(40,58,48,12);});
  CX.heli=new T.MeshStandardMaterial({map:t,transparent:true,depthWrite:false,roughness:1,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});v3FowMat(CX.heli);return CX.heli;}
/* 아파트 동 번호: 길 쪽 벽 꼭대기에 크게 칠한 "1xx". 번호 40개를 한 장(8×5칸)에 그려 두고 한 메시로 그린다 */
function cxLabMat(){if(CX.labM)return CX.labM;const T=V3.T;
  const t=v3Tex(1024,320,(c,w,h)=>{c.clearRect(0,0,w,h);c.fillStyle='rgba(70,72,76,.9)';c.font='bold 46px sans-serif';c.textAlign='center';c.textBaseline='middle';
    for(let i=0;i<40;i++)c.fillText(String(101+i),(i%8)*128+64,Math.floor(i/8)*64+34);});
  CX.labM=new T.MeshStandardMaterial({map:t,transparent:true,depthWrite:false,roughness:1,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});v3FowMat(CX.labM);return CX.labM;}
function cxAptLabels(g,list){if(!list.length)return;const T=V3.T,P=[],UV=[];
  for(const o of list){const i=((o.blk%40)+40)%40,u0=(i%8)/8,u1=u0+1/8,v1=1-Math.floor(i/8)/5,v0=v1-1/5;const f=o.f,[cx,cz]=cxAt(f,f.len/2,.003);
    const w=.25,ux=-f.dx,uz=-f.dz,y0=o.top-.325,y1=o.top-.075;   // 바깥에서 볼 때 글자가 바로 읽히게(면 진행 방향의 반대가 오른쪽)
    const A=[cx-ux*w,y0,cz-uz*w],B=[cx+ux*w,y0,cz+uz*w],C=[cx+ux*w,y1,cz+uz*w],D=[cx-ux*w,y1,cz-uz*w];
    for(const q of [A,B,C,A,C,D])P.push(...q);UV.push(u0,v0,u1,v0,u1,v1,u0,v0,u1,v1,u0,v1);CX.lab.push({k:o.k,y:o.top-.08});}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(P,3));geo.setAttribute('uv',new T.Float32BufferAttribute(UV,2));geo.computeVertexNormals();
  const m=new T.Mesh(geo,cxLabMat());m.receiveShadow=true;m.userData.cx=1;g.add(m);CX.labMesh=m;CX.lab0=geo.attributes.position.array.slice();}
/* 단면: 잘린 층(lv) 위에 있는 외벽·옥상 장식을 숨긴다 */
function cxApplyCut(m){if(!CX.cut||!CX.cut.length)return;const tag=[...m].map(([k,v])=>k+':'+v).sort().join(';');if(tag===CX.ctag)return;CX.ctag=tag;
  const keys=new Set([...CX.prev.keys(),...m.keys()]);
  for(const E of CX.cut){const A=E.im.instanceMatrix.array;let ch=false;
    for(const k of keys){const lv=m.get(k);if(CX.prev.get(k)===lv)continue;const idx=E.by.get(k);if(!idx)continue;const cy=lv==null?1e9:.06+lv*FLOOR_H+FLOOR_H*CUT_SILL;
      for(const i of idx){const o=i*16;if(E.y[i]>cy+.005)for(let j=0;j<16;j++)A[o+j]=0;else for(let j=0;j<16;j++)A[o+j]=E.m0[o+j];}ch=true;}
    if(ch)E.im.instanceMatrix.needsUpdate=true;}
  if(CX.labMesh){const A=CX.labMesh.geometry.attributes.position;CX.lab.forEach((L,i)=>{const lv=m.get(L.k);const show=lv==null||L.y<=.06+lv*FLOOR_H+FLOOR_H*CUT_SILL;
      for(let j=0;j<18;j++)A.array[i*18+j]=show?CX.lab0[i*18+j]:0;});A.needsUpdate=true;}
  CX.prev=new Map(m);}

/* ---------- 거리 ---------- */
function cxBuildStreet(){const T=V3.T,g=V3.G.world;if(!G||!g||!T)return;cxMats();cxGeos();const M=G.map,H=v3Hash,cl=typeof bmClime==='function'?bmClime():'temp';
  const at=(r,c)=>inb(r,c)?M[r][c]:null;const road=(r,c)=>{const q=at(r,c);return !!q&&q.t==='road'&&!q.al;};
  const curb=(r,c)=>{const q=at(r,c);return !!q&&q.t!=='road'&&q.t!=='plaza'&&q.t!=='water'&&!q.sea;};
  const city=q=>!q.dirt&&!q.rural&&!q.rail&&!q.br&&!q.sea&&!q.pier&&!q.quay&&!q.sand;
  // 기존 소품(가로등·차·방벽 등)과 겹치지 않게
  const busy=new Set();for(const p of G.props||[])busy.add(Math.round(p.x*8)+','+Math.round(p.z*8));
  const near=(x,z)=>{const a=Math.round(x*8),b=Math.round(z*8);for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)if(busy.has((a+i)+','+(b+j)))return true;return false;};
  const take=(x,z)=>busy.add(Math.round(x*8)+','+Math.round(z*8));
  const P=[],I=[],GL=[],CY=[],ST=[],BAG=[],LEAF=[],TR=[],L=[],AR=[];const poles=new Map();
  const LEAFC=cl==='autumn'?['#8a6a3a','#9b7440','#7a5a32','#a07a3e']:['#6e6a4c','#7a7353','#5f5d43','#76704f'];
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const me=M[r][c];if(me.t!=='road'||!city(me))continue;const k=key(r,c),cx=c+.5,cz=r+.5;
    // 맨홀·빗물받이·덧씌운 아스팔트(골목에도)
    if(H(k,1300)<.3){const ox=(H(k,1301)-.5)*.5,oz=(H(k,1302)-.5)*.5;CY.push({x:cx+ox,y:.002,z:cz+oz,sx:.058,sy:.004,sz:.058,col:'#3b3a37'});}
    if(H(k,1310)<.35){const ro=me.ro==='v'?0:Math.PI/2;ST.push({x:cx+(H(k,1311)-.5)*.6,y:.003,z:cz+(H(k,1312)-.5)*.6,sx:.1+H(k,1313)*.22,sy:1,sz:.06+H(k,1314)*.14,ry:ro+(H(k,1315)-.5)*.2,col:H(k,1316)<.6?'#1d1c1a':'#45423d'});}
    if(me.al)continue;const ro=me.ro||'x';
    if(me.rw===2&&(ro==='h'||ro==='v')){// 대로 차선 화살표: 교차로 앞 칸, 우측 통행
      const h=ro==='h';const first=h?!(road(r-1,c)&&at(r-1,c).ro==='h'):!(road(r,c-1)&&at(r,c-1).ro==='v');
      const dx=h?(first?-1:1):0,dz=h?0:(first?1:-1);const nx=r+dz,nc=c+dx;
      if(road(nx,nc)&&(at(nx,nc).ro||'x')==='x')for(const o of [-.25,.25])AR.push({x:cx+(h?-dx*.12:o),y:.004,z:cz+(h?o:-dz*.12),sx:.09,sy:1,sz:.2,ry:Math.atan2(-dx,-dz),col:'#ffffff'});}
    const sides=[[-1,0],[1,0],[0,-1],[0,1]].filter(([a,b])=>curb(r+a,c+b));
    sides.forEach(([a,b],si)=>{const sk=k*4+si;const nb=at(r+a,c+b);
      // 자리: 길 가운데에서 보도 쪽으로 o, 길을 따라 t
      const pos=(t,o)=>[cx+b*o+(a?t:0),cz+a*o+(b?t:0)];const ryA=a?0:-Math.PI/2;   // 상자 가로축을 길 방향으로
      if(H(sk,1320)<.3){const [px,pz]=pos(.38*(a?b||1:a||1)*(H(sk,1321)<.5?1:-1),.47);ST.push({x:px,y:.003,z:pz,sx:.05,sy:1,sz:.02,ry:ryA,col:'#26231f'});}   // 빗물받이
      if(ro!=='h'&&ro!=='v')return;
      const nearX=(a?[[r,c-1],[r,c+1]]:[[r-1,c],[r+1,c]]).some(([p,q])=>road(p,q)&&(at(p,q).ro||'x')==='x');
      // 소화전: 교차로 가까운 보도
      if(nearX&&H(sk,1330)<.35){const [px,pz]=pos((H(sk,1331)-.5)*.6,.44);if(!near(px,pz)){take(px,pz);CY.push({x:px,y:.024,z:pz,sx:.022,sy:.048,sz:.022,col:H(sk,1332)<.7?'#8e2d24':'#b49a3a'});CY.push({x:px,y:.05,z:pz,sx:.028,sy:.008,sz:.028,col:'#5b2520'});}}
      // 버스 정류장: 대로, 교차로에서 떨어진 칸
      if(me.rw===2&&!nearX&&H(sk,1340)<.12){const tc=.16;const [px,pz]=pos(tc,.43);if(!near(px,pz)){for(const d of [-.15,0,.15])take(...pos(tc+d,.43));
          const [bx,bz]=pos(tc,.478),[fx,fz]=pos(tc,.43);
          P.push({x:fx,y:.205,z:fz,sx:.36,sy:.014,sz:.1,ry:ryA,col:'#5d6266'});GL.push({x:bx,y:.11,z:bz,sx:.36,sy:.17,sz:.006,ry:ryA,col:'#7e8c93'});
          for(const d of [-.17,.17]){const [qx,qz]=pos(tc+d,.392);I.push({x:qx,y:.1,z:qz,sx:.01,sy:.2,sz:.01,ry:ryA,col:'#3a3b3a'});}
          const [sx2,sz2]=pos(tc,.455);P.push({x:sx2,y:.042,z:sz2,sx:.22,sy:.012,sz:.035,ry:ryA,col:'#6b5843'});
          const [ax,az]=pos(tc+.19,.43);P.push({x:ax,y:.1,z:az,sx:.008,sy:.15,sz:.09,ry:ryA,col:'#d6d6cf'});}}
      // 가로수: 도심·중심가 대로
      const bd=nb&&nb.t==='bldg'?nb.dist:nb&&nb.t==='park'?'park':null;
      if(me.rw===2&&(bd==='down'||bd==='mid'||bd==='park'))for(const t of [-.27,.27]){if(H(sk,1350+(t>0))>.5)continue;const [px,pz]=pos(t,.44);if(near(px,pz))continue;take(px,pz);
          const sc=.62+H(sk,1352+(t>0))*.22;TR.push({x:px,y:.17*sc,z:pz,sx:.016,sy:.34*sc,sz:.016,col:'#4a3d30'});ST.push({x:px,y:.003,z:pz,sx:.085,sy:1,sz:.085,col:'#2e2a22'});
          if(cl!=='winter'&&cl!=='desert')LEAF.push({x:px,y:0,z:pz,sx:sc,sy:sc,sz:sc,ry:H(sk,1354)*6,col:LEAFC[(H(sk,1355)*LEAFC.length)|0]});}
      // 쓰레기 봉투 더미와 상자 (수거가 끊긴 도시)
      if(H(sk,1360)<.11){const tc=(H(sk,1361)-.5)*.6;const n=3+(H(sk,1362)*4|0);for(let i=0;i<n;i++){const [px,pz]=pos(tc+(H(sk,1363+i)-.5)*.12,.465-H(sk,1370+i)*.04);const s=.016+H(sk,1380+i)*.012;
          BAG.push({x:px,y:s*.6,z:pz,sx:s,sy:s*.75,sz:s*1.1,ry:H(sk,1390+i)*6,col:['#1d1d1e','#2a2c2e','#3a4a5c','#5c5a54','#cfccc4'][(H(sk,1400+i)*5)|0]});}
        if(H(sk,1365)<.6){const [px,pz]=pos(tc+.07,.47);P.push({x:px,y:.017,z:pz,sx:.05,sy:.034,sz:.04,ry:ryA+(H(sk,1366)-.5),col:'#8a7556'});}}
      // 연석: 차도와 보도 사이 돌 턱(건널목 칸은 비워 둔다 = 턱 낮춤)
      {const [px,pz]=pos(0,.333);P.push({x:px,y:.007,z:pz,sx:1,sy:.014,sz:.016,ry:ryA,col:'#a6a195'});}
      // 교통 표지판: 교차로 앞 보도
      if(nearX&&H(sk,1600)<.3){const [px,pz]=pos((H(sk,1601)<.5?1:-1)*.3,.4);if(!near(px,pz)){take(px,pz);I.push({x:px,y:.11,z:pz,sx:.007,sy:.22,sz:.007,col:'#4a4b4a'});
          const kind=(H(sk,1602)*4)|0;P.push({x:px,y:.205,z:pz,sx:.006,sy:kind===3?.05:.06,sz:kind===3?.08:.06,ry:ryA,col:['#9c2b25','#2a4f8a','#c9a53a','#2a4f8a'][kind]});
          if(kind===0)P.push({x:px,y:.205,z:pz,sx:.007,sy:.012,sz:.04,ry:ryA,col:'#e8e4da'});}}   // 빨강(진입 금지), 파랑(방향), 노랑(주의), 길 이름판
      // 볼라드: 교차로 모퉁이
      if(nearX&&H(sk,1610)<.35){const e=H(sk,1611)<.5?1:-1;for(let i=0;i<3;i++){const [px,pz]=pos(e*(.42-i*.05),.36);CY.push({x:px,y:.022,z:pz,sx:.014,sy:.044,sz:.014,col:'#7b7d7c'});}}
      // 보도에 세운 오토바이·자전거
      if((bd==='res'||bd==='mid')&&H(sk,1620)<.12){const n=1+(H(sk,1621)*3|0);for(let i=0;i<n;i++){const [px,pz]=pos((H(sk,1622)-.5)*.5+i*.06,.4);const col=['#8e2d24','#2f4b66','#c9c6bd','#2b2b2b','#a8913f'][(H(sk,1623+i)*5)|0];
          const ry=ryA+Math.PI/2+(H(sk,1630+i)-.5)*.4;P.push({x:px,y:.022,z:pz,sx:.022,sy:.03,sz:.075,ry,col});P.push({x:px,y:.042,z:pz,sx:.018,sy:.008,sz:.035,ry,col:'#1f1f1f'});}}
      // 공사 칸막이·꼬깔
      if(H(sk,1640)<.025){const tc=(H(sk,1641)-.5)*.5;for(let i=0;i<3;i++){const [px,pz]=pos(tc+i*.07,.3);CY.push({x:px,y:.018,z:pz,sx:.022,sy:.036,sz:.022,col:i%2?'#e0ddd4':'#c4632a'});}
        const [bx,bz]=pos(tc+.07,.25);P.push({x:bx,y:.03,z:bz,sx:.22,sy:.04,sz:.008,ry:ryA,col:'#c9b23a'});}
      // 통신 함체
      if(H(sk,1410)<.05){const [px,pz]=pos((H(sk,1411)-.5)*.6,.475);if(!near(px,pz)){take(px,pz);P.push({x:px,y:.035,z:pz,sx:.045,sy:.07,sz:.025,ry:ryA,col:'#8e9190'});}}
      // 전봇대: 골목이 아닌 좁은 길(대로·도심 제외), 길마다 한쪽에만 3칸 간격
      if(me.rw!==2&&bd!=='down'){const line=a?'h'+r:'v'+c,pos0=a?c:r,want=H(a?r*131+7:c*131+11,1420)<.5?-1:1;const s2=a?a:b;
        const other=a?curb(r-a,c):curb(r,c-b);if(s2!==want&&other)return;
        const off=(H(a?r:c,1421)*3)|0;if((pos0+off)%3!==0)return;const [px,pz]=pos(.2,.455);if(near(px,pz))return;take(px,pz);
        const key2=line+(s2>0?'+':'-');let arr=poles.get(key2);if(!arr)poles.set(key2,arr=[]);
        arr.push({x:px,z:pz,i:pos0,ax:a,bx:b,tf:H(sk,1422)<.35,drop:nb&&nb.t==='bldg'?Math.min(.5,nb.f*FLOOR_H*.85):0,dk:sk});}});}
  // 전봇대와 전선
  const sag=(x1,y1,z1,x2,y2,z2,d)=>{let px=x1,py=y1,pz=z1;for(let j=1;j<=6;j++){const t=j/6;const x=x1+(x2-x1)*t,z=z1+(z2-z1)*t,y=y1+(y2-y1)*t-Math.sin(Math.PI*t)*d;L.push(px,py,pz,x,y,z);px=x;py=y;pz=z;}};
  for(const arr of poles.values()){arr.sort((p,q)=>p.i-q.i);
    arr.forEach((p,j)=>{const ry=p.ax?Math.PI/2:0;   // 가로대는 길을 가로지른다
      CY.push({x:p.x,y:.43,z:p.z,sx:.024,sy:.86,sz:.024,col:'#8b8780'});P.push({x:p.x,y:.78,z:p.z,sx:.16,sy:.014,sz:.014,ry,col:'#5f5d58'});
      if(p.tf)CY.push({x:p.x-p.bx*.03,y:.66,z:p.z-p.ax*.03,sx:.05,sy:.07,sz:.05,col:'#7d817f'});
      if(p.drop&&H(p.dk,1430)<.6){const tx=p.x+p.bx*.12+(p.ax?(H(p.dk,1431)-.5)*.3:0),tz=p.z+p.ax*.12+(p.bx?(H(p.dk,1431)-.5)*.3:0);sag(p.x,.7,p.z,tx,p.drop,tz,.03);}
      const q=arr[j+1];if(!q||q.i-p.i>3)return;
      for(let i=p.i+1;i<q.i;i++)if(p.ax?!road(Math.floor(p.z),i):!road(i,Math.floor(p.x)))return;
      const lx=p.ax?0:.06,lz=p.ax?.06:0;
      sag(p.x-lx,.785,p.z-lz,q.x-lx,.785,q.z-lz,.05);sag(p.x+lx,.785,p.z+lz,q.x+lx,.785,q.z+lz,.05);sag(p.x,.62,p.z,q.x,.62,q.z,.07);sag(p.x,.58,p.z,q.x,.58,q.z,.08);});}
  const m=CX.m,G2=CX.g;
  cxInst(g,G2.box,m.paint,P);cxInst(g,G2.box,m.iron,I);cxInst(g,G2.box,m.glass,GL);cxInst(g,G2.cyl,m.paint,CY);cxInst(g,G2.cyl,m.paint,TR);
  cxInst(g,G2.flat,m.stain,ST,{noShadow:1});if(AR.length)cxInst(g,G2.flat,cxArrowMat(),AR,{noShadow:1});cxInst(g,G2.ico,m.deb,BAG);
  if(LEAF.length&&typeof v3LeafTreeG==='function')cxInst(g,v3LeafTreeG(),v3PropMats().leaf,LEAF,{chunk:1});
  if(L.length){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(L,3));const ln=new T.LineSegments(geo,m.wire);ln.frustumCulled=false;ln.userData.cx=1;g.add(ln);}}

function cxArrowMat(){if(CX.arrow)return CX.arrow;const T=V3.T;const t=v3Tex(32,64,(g,w,h)=>{g.clearRect(0,0,w,h);g.fillStyle='rgba(226,222,206,.75)';g.fillRect(13,22,6,40);g.beginPath();g.moveTo(16,2);g.lineTo(29,24);g.lineTo(3,24);g.closePath();g.fill();});
  CX.arrow=new T.MeshStandardMaterial({map:t,transparent:true,depthWrite:false,roughness:1,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});v3FowMat(CX.arrow);return CX.arrow;}
/* 원래 함수를 감싼다 */
if(typeof v3BuildCity==='function'){const f=v3BuildCity;v3BuildCity=function(){const r=f.apply(this,arguments);try{cxBuildCity();}catch(e){console.warn('city detail',e);}return r;};}
if(typeof v3BuildWorld==='function'){const f=v3BuildWorld;v3BuildWorld=function(){const r=f.apply(this,arguments);try{cxBuildStreet();}catch(e){console.warn('street detail',e);}return r;};}
// 멀리서 볼 때(지도 전체)는 외벽의 작은 장식을 그리지 않는다: 몇 픽셀도 안 되는데 삼각형만 많다
const CX_FAR=24;
if(typeof v3EnvFrame==='function'){const f=v3EnvFrame;v3EnvFrame=function(){const r=f.apply(this,arguments);try{const on=!V3.cs||V3.cs.d<CX_FAR;if(CX.facOn!==on||CX.facN!==CX.fac.length){CX.facOn=on;CX.facN=CX.fac.length;for(const m of CX.fac)m.visible=on;}}catch(e){}return r;};}
if(typeof v3ApplyCut==='function'){const f=v3ApplyCut;v3ApplyCut=function(m){const r=f.apply(this,arguments);try{cxApplyCut(m);}catch(e){console.warn('city cut',e);}return r;};}
