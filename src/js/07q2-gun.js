/* ===================== 총격·포격 연출 (입자 엔진 07q-pfx 위에서) =====================
   예전에는 모든 사격이 "예광탄 하나 + 노란 점 하나"였다. 이제는 실제 모습에 가깝게:
   - 총구 화염: 총열 방향으로 짧게 뻗는 불꽃(한두 화면), 옅은 총구 연기. 전차·자주포는 큰 불덩이와 포구 제퇴기 옆 분출,
     둘레 땅의 흙먼지(포구 압력), 포신 후퇴.
   - 탄은 여러 발: 소총 2발, 기관총 6발 연사 등. 예광탄은 실제처럼 일부만(기관총 4발에 1발, 소총 5발에 1발, 저격 없음,
     기관포는 매발). 색은 편마다 붉은색·초록색(서방·동구권 예광탄 색).
   - 탄착은 맞은 곳의 재질에 따라: 흙(갈색 흙 튐), 눈(흰 가루), 모래, 진흙, 아스팔트·콘크리트 벽(회색 가루·파편·불꽃),
     금속 차체(불꽃 다발, 도탄), 물(물보라). 단단한 곳에서는 예광탄이 튕겨 하늘로 날아간다.
   - 로켓(RPG): 뒤 후폭풍 먼지, 모터 불꽃과 회색 연기 꼬리, 성형작약 탄착(날카로운 섬광·불꽃·검은 연기).
   - 대전차미사일: 연기 꼬리를 입자로(바람에 흩어지며 오래 남는다).
   - 포탄·박격포 탄착: 짧은 섬광, 위로 솟는 흙기둥(V자 분출), 떨어지는 흙덩이 줄기, 낮게 퍼지는 먼지 고리, 검은 화약 연기.
     영화 같은 불덩이는 거의 없다(고폭탄은 순간 섬광뿐). 눈 위면 흰 눈과 검은 흙, 물이면 물기둥.
   - 날아가는 포탄은 빛나지 않는 검은 점, 로켓탄만 불꽃과 연기 꼬리.
   타이머 대신 입자의 지연 시작(dl)을 써서 한 번에 버퍼에 쓴다. 카메라에서 먼 곳은 입자 수를 줄인다. */
const GFX={on:true,tc:new Map()};
/* 무기 모양: n 한 번에 쏘는 발 수, gap 발 사이(초), tr 예광탄 비율(0=없음), v 탄속(칸/초), fl 화염 크기, sm 연기, im 탄착 크기, he 고폭(작은 폭발) */
const GFXW={
  rifle:{n:2,gap:.11,tr:5,v:70,fl:.05,sm:.05,im:1},
  dteam:{n:2,gap:.12,tr:5,v:70,fl:.05,sm:.05,im:1},
  ew:{n:2,gap:.12,tr:5,v:70,fl:.05,sm:.05,im:1},
  mg:{n:6,gap:.075,tr:4,v:72,fl:.065,sm:.07,im:1.1,brass:1},
  sniper:{n:1,gap:0,tr:0,v:75,fl:.08,sm:.07,im:1.3,dust:1},
  hmv:{n:4,gap:.09,tr:4,v:75,fl:.09,sm:.09,im:1.5,brass:1},
  zu:{n:6,gap:.045,tr:2,v:80,fl:.1,sm:.1,im:2,he:.5,brass:1},
  ifv:{n:3,gap:.2,tr:1,v:85,fl:.13,sm:.13,im:2.2,he:1,brass:1},
};
const gfxR=(a,b)=>a+Math.random()*(b-a);
const gfxPick=a=>a[Math.random()*a.length|0];
/* 재질: 먼지 색(c), 튀는 흙덩이 색(k), 불꽃 확률(sp), 도탄 확률(ric) */
const GFXM={
  dirt:{c:['#6e5d48','#7f6c54','#5c4d3c'],k:['#3e342a','#4a3f33'],sp:0,ric:0,up:1},
  mud:{c:['#4a4034','#3f362c'],k:['#2f2822','#3a312a'],sp:0,ric:0,up:.6},
  snow:{c:['#eef1f3','#e2e7ea','#f7f9fa'],k:['#d8dee2','#4a4038'],sp:0,ric:0,up:1.2},
  sand:{c:['#cbb791','#bfa982','#d8c7a3'],k:['#a8946e','#b59f78'],sp:.05,ric:.05,up:1.3},
  road:{c:['#8d8882','#7a7570','#9a958d'],k:['#4b4844','#5d5955'],sp:.35,ric:.25,up:.8},
  wall:{c:['#bdb6aa','#a9a296','#cfc8bc'],k:['#857d72','#9a9285'],sp:.2,ric:.2,up:.9},
  tan:{c:['#d2bf9c','#c4b08b','#dccbaa'],k:['#a08c6a','#b09c79'],sp:.15,ric:.15,up:.9},
  rubble:{c:['#b0a796','#9c9483','#c2baa9'],k:['#6f685e','#857d72'],sp:.12,ric:.1,up:1},
  metal:{c:['#5a5852','#6a675f'],k:['#3a3936'],sp:1,ric:.45,up:.3},
  water:{c:['#e6eef0','#d4e0e3'],k:['#c9d6da'],sp:0,ric:0,up:1.6},
};
/* 이 자리 바닥 재질 */
function gfxGround(x,z){const r=Math.floor(z),c=Math.floor(x);if(!G||!inb(r,c))return 'dirt';const X=G.map[r][c];const cl=G.feat&&G.feat.clime;const wet=G.wx==='rain'||G.wx==='storm';
  if(X.t==='water')return 'water';if(X.t==='bldg')return cl==='desert'?'tan':'wall';if(X.t==='rubble')return cl==='winter'?'snow':'rubble';
  if(X.t==='road'||X.t==='plaza')return cl==='winter'&&Math.random()<.5?'snow':cl==='desert'?'sand':'road';
  return cl==='winter'?'snow':cl==='desert'?'sand':wet?'mud':'dirt';}
/* 카메라에서 멀면 입자를 줄인다 */
function gfxLod(x,z){const cs=V3.cs;if(!cs)return 1;const d=Math.hypot(cs.x-x,cs.z-z),far=Math.max(12,(cs.d||10)*1.6);return d<far?1:d<far*1.8?.5:.2;}
/* 예광탄 색: 편마다(보는 편 초록·적 빨강 — 예전 색 그대로, 실제 동구권·서방 예광탄 색) */
function gfxTrC(a){return G&&a.nat===G.viewer?'#86ff6a':'#ff5a30';}

/* ---------- 총구 ---------- */
/* x,y,z 총구, (dx,dy,dz) 단위 방향, s 화염 크기, sm 연기, dl 지연 */
function gfxMuzzle(x,y,z,dx,dy,dz,s,sm,dl,lod){dl=dl||0;
  // 앞으로 뻗는 화염(한두 화면) + 옆으로 갈라지는 작은 불꽃
  pfx({x:x+dx*s*.9,y:y+dy*s*.9,z:z+dz*s*.9,vx:dx*.05,vy:dy*.05,vz:dz*.05,life:.05,s0:s*.55,s1:s*.4,len:s*2,lmin:s*1.8,k:PFXK.STREAK,col:'#ffcf7a',a:1,fi:.01,wind:0,dl});
  pfx({x:x+dx*s*.2,y:y+dy*s*.2,z:z+dz*s*.2,life:.04,s0:s*1.1,s1:s*1.4,k:PFXK.FLASH,col:'#ffe0a8',a:.9,fi:.01,wind:0,dl});
  if(s>=.08){const px=-dz,pz=dx;for(const sg of [-1,1])pfx({x:x+px*sg*s*.4,y,z:z+pz*sg*s*.4,vx:px*sg*.05,vz:pz*sg*.05,life:.04,s0:s*.3,s1:s*.2,len:s*.9,lmin:s*.8,k:PFXK.STREAK,col:'#ffb860',a:.8,fi:.01,wind:0,dl});}
  // 총구 연기: 앞으로 조금 밀려 나가 옅게 퍼진다
  if(sm&&lod>.3&&Math.random()<.85)pfx({x:x+dx*sm*.5,y:y+dy*sm*.5,z:z+dz*sm*.5,vx:dx*gfxR(.3,.8),vy:dy*.5+gfxR(.05,.2),vz:dz*gfxR(.3,.8),drag:3,acc:.03,life:gfxR(.8,1.6),s0:sm*.35,s1:sm*gfxR(1,1.6),col:Math.random()<.5?'#c9c4ba':'#b3ada2',a:.32,fi:.05,wind:.8,dl});}
/* 탄피: 오른쪽 위로 튀어 떨어지는 작은 놋쇠 */
function gfxBrass(x,y,z,dx,dz,dl){pfx({x,y,z,vx:-dz*gfxR(.6,1.1)+gfxR(-.2,.2),vy:gfxR(.6,1.1),vz:dx*gfxR(.6,1.1)+gfxR(-.2,.2),acc:-7,drag:.3,life:gfxR(.28,.4),s0:.012,s1:.01,col:'#c9a24a',a:1,fi:.01,wind:0,dl,v:0});}

/* ---------- 예광탄 ---------- */
function gfxTracer(x1,y1,z1,x2,y2,z2,v,col,w,dl,len){const dx=x2-x1,dy=y2-y1,dz=z2-z1,d=Math.hypot(dx,dy,dz)||1e-3;
  pfx({x:x1,y:y1,z:z1,vx:dx/d*v,vy:dy/d*v,vz:dz/d*v,life:d/v,s0:w||.018,s1:w||.018,len:len||.5,k:PFXK.TRACER,col,a:1,fi:.001,wind:0,dl:dl||0});}
/* 도탄: 단단한 곳에서 튕겨 하늘로 */
function gfxRicochet(x,y,z,nx,ny,nz,col,dl){const a=Math.random()*6.283;let vx=nx*1.2+Math.cos(a)*.8,vy=Math.abs(ny)*.8+gfxR(.4,1.2),vz=nz*1.2+Math.sin(a)*.8;const L=Math.hypot(vx,vy,vz);const sp=gfxR(18,32);
  pfx({x,y,z,vx:vx/L*sp,vy:vy/L*sp,vz:vz/L*sp,life:gfxR(.15,.3),s0:.012,s1:.012,len:.25,k:PFXK.TRACER,col,a:.8,fi:.001,wind:0,dl});}

/* ---------- 탄착 ----------
   (nx,ny,nz) 맞은 면의 바깥 방향(땅이면 위), p 크기(소총 1), he 작은 고폭탄(기관포) */
function gfxHit(x,y,z,mat,nx,ny,nz,p,dl,lod,he){const M=GFXM[mat]||GFXM.dirt;p=p||1;dl=dl||0;lod=lod??1;const up=M.up;
  if(mat==='water'){for(let i=0;i<(lod>.4?3:1);i++)pfx({x:x+gfxR(-.02,.02),y,z:z+gfxR(-.02,.02),vx:gfxR(-.2,.2),vy:gfxR(1.2,2.2)*Math.sqrt(p),vz:gfxR(-.2,.2),drag:.8,acc:-7,life:gfxR(.35,.6),s0:.015*p,s1:.05*p,col:gfxPick(M.c),a:.75,fi:.02,wind:.2,dl});
    if(lod>.4)pfx({x,y:y+.01,z,vy:.1,drag:2,life:gfxR(.8,1.4),s0:.03*p,s1:.12*p,col:'#dfe8ea',a:.3,fi:.05,dl});return;}
  if(he){// 기관포 고폭탄: 짧은 섬광, 검은 화약 연기, 파편 불꽃
    pfx({x:x+nx*.02,y:y+ny*.02,z:z+nz*.02,life:.06,s0:.06*he*p*.5,s1:.16*he*p*.5,k:PFXK.FLASH,col:'#ffd9a0',a:1,fi:.01,wind:0,dl});
    pfx({x,y,z,vx:nx*.5,vy:ny*.5+.25,vz:nz*.5,drag:3,acc:.05,life:gfxR(1.6,2.6),s0:.04*p,s1:.16*p,col:Math.random()<.5?'#3a3530':'#4c463f',a:.6,fi:.04,em:'#ff8030',emI:1,emK:.06,dl});
    if(lod>.4)for(let i=0;i<3;i++){const a=Math.random()*6.283;pfx({x,y,z,vx:Math.cos(a)*gfxR(1,3)+nx*2,vy:gfxR(.5,2.5),vz:Math.sin(a)*gfxR(1,3)+nz*2,drag:1.2,acc:-6,life:gfxR(.15,.35),s0:.015,s1:.01,k:PFXK.SPARK,col:'#ffd08a',a:1,fi:.01,wind:0,dl});}}
  // 가루: 맞은 면에서 바깥으로 확 튀었다가 퍼지며 내려앉는다
  const nd=lod>.4?2:1;for(let i=0;i<nd;i++)pfx({x:x+gfxR(-.015,.015),y:y+.005,z:z+gfxR(-.015,.015),vx:nx*gfxR(.5,1.2)*up+gfxR(-.25,.25),vy:ny*gfxR(.6,1.4)*up+gfxR(.05,.3),vz:nz*gfxR(.5,1.2)*up+gfxR(-.25,.25),drag:4,acc:-.25,life:gfxR(.6,1.2)*(mat==='sand'||mat==='snow'?1.6:1),s0:.015*p,s1:gfxR(.07,.12)*p,col:gfxPick(M.c),a:mat==='metal'?.25:.65,fi:.03,wind:.6,dl:dl+i*.02});
  // 흙덩이·파편: 빠르게 튀어 떨어진다
  if(lod>.4&&mat!=='metal'){const nk=mat==='snow'||mat==='dirt'||mat==='sand'?3:2;for(let i=0;i<nk;i++)pfx({x,y,z,vx:nx*gfxR(.6,1.6)+gfxR(-.5,.5),vy:ny*gfxR(1,2.4)+gfxR(.2,.8),vz:nz*gfxR(.6,1.6)+gfxR(-.5,.5),drag:.6,acc:-7,life:gfxR(.25,.45),s0:.008*p,s1:.008*p,col:gfxPick(M.k),a:.95,fi:.01,wind:0,dl,v:0});}
  // 불꽃: 금속은 다발로, 콘크리트·아스팔트는 가끔
  if(Math.random()<M.sp){const n=mat==='metal'?(lod>.4?5:2):1+(Math.random()<.4);for(let i=0;i<n;i++){const a=Math.random()*6.283;pfx({x,y,z,vx:nx*gfxR(1,2.5)+Math.cos(a)*gfxR(.5,2),vy:ny*gfxR(1,2)+gfxR(.2,1.4),vz:nz*gfxR(1,2.5)+Math.sin(a)*gfxR(.5,2),drag:1.4,acc:-5,life:gfxR(.12,.3),s0:.012,s1:.008,k:PFXK.SPARK,col:'#ffe0a0',a:1,fi:.01,wind:0,dl});}
    if(mat==='metal')pfx({x:x+nx*.01,y:y+ny*.01,z:z+nz*.01,life:.035,s0:.03*p,s1:.06*p,k:PFXK.FLASH,col:'#fff0d0',a:.9,fi:.01,wind:0,dl});}
  // 눈·모래는 가는 가루가 한동안 떠 있다
  if((mat==='snow'||mat==='sand')&&lod>.4)pfx({x,y:y+.02,z,vx:gfxR(-.1,.1),vy:gfxR(.1,.25),vz:gfxR(-.1,.1),drag:1.5,life:gfxR(1.6,2.6),s0:.04*p,s1:.15*p,col:gfxPick(M.c),a:.3,fi:.1,wind:1,dl:dl+.05});}

/* 선분(x1,z1)→(x2,z2)이 상자 [x0,x1,z0,z1]에 처음 닿는 곳과 그 면의 바깥 방향 */
function gfxBoxHit(x1,z1,x2,z2,b){const dx=x2-x1,dz=z2-z1;let t0=0,t1=1,nx=0,nz=0;
  for(const [p,q,lo,hi,ax] of [[x1,dx,b[0],b[1],0],[z1,dz,b[2],b[3],1]]){if(Math.abs(q)<1e-9){if(p<lo||p>hi)return null;continue;}
    let ta=(lo-p)/q,tb=(hi-p)/q,s=-1;if(ta>tb){[ta,tb]=[tb,ta];s=1;}if(ta>t0){t0=ta;nx=ax===0?s:0;nz=ax===1?s:0;}if(tb<t1)t1=tb;if(t0>t1)return null;}
  if(t0<=0)return null;return {t:t0,x:x1+dx*t0,z:z1+dz*t0,nx,nz};}

/* 한 발이 떨어질 곳: 맞으면 표적 바로 옆, 빗나가면 둘레(주로 뒤쪽) — 건물 안 표적이면 그 건물 벽, 차량에 맞으면 차체 */
function gfxLand(x1,y1,z1,x2,y2,z2,d,hit,tile){const dx=x2-x1,dz=z2-z1,L=Math.hypot(dx,dz)||1,ux=dx/L,uz=dz/L;
  const vt=d&&UT[d.type]&&UT[d.type].cls==='veh';
  if(vt&&hit)return {x:x2-ux*.06+gfxR(-.05,.05),y:y2+gfxR(-.04,.06),z:z2-uz*.06+gfxR(-.05,.05),m:'metal',nx:-ux,ny:.3,nz:-uz};
  // 건물 안 표적(또는 건물 자체): 맞는 벽면
  const R=tile?tile[0]:d?d.r:Math.floor(z2),C=tile?tile[1]:d?d.c:Math.floor(x2);
  if(inb(R,C)&&G.map[R][C].t==='bldg'&&(tile||y2<v3Top(R,C)-.02)){const b=bldgBox(R,C);const h=gfxBoxHit(x1,z1,x2+ux*.6,z2+uz*.6,b);
    if(h){const sp=hit?.06:.22;const yt=v3Top(R,C);const yy=Math.min(yt-.02,Math.max(.03,(tile?gfxR(.05,yt*.9):y2)+gfxR(-sp,sp)*.6));const t=gfxR(-sp,sp);
      return {x:h.x+(-h.nz)*t+h.nx*.005,y:yy,z:h.z+h.nx*t+h.nz*.005,m:gfxGround(h.x-h.nx*.05,h.z-h.nz*.05),nx:h.nx,ny:0,nz:h.nz};}}
  // 땅: 맞으면 발밑 가까이, 빗나가면 앞뒤로 길게 흩어진다(대부분 뒤로 넘어간다)
  const along=hit?gfxR(-.04,.08):gfxR(-.25,.7),side=hit?gfxR(-.05,.05):gfxR(-.22,.22);const gx=x2+ux*along-uz*side,gz=z2+uz*along+ux*side;
  const r=Math.floor(gz),c=Math.floor(gx);
  if(inb(r,c)&&G.map[r][c].t==='bldg'){const b=bldgBox(r,c);const h=gfxBoxHit(x1,z1,gx+ux*.3,gz+uz*.3,b);if(h)return {x:h.x+h.nx*.005,y:Math.max(.03,Math.min(v3Top(r,c)-.02,y2*.6+gfxR(0,.1))),z:h.z+h.nz*.005,m:gfxGround(h.x-h.nx*.05,h.z-h.nz*.05),nx:h.nx,ny:0,nz:h.nz};}
  return {x:gx,y:(inb(r,c)?v3Top(r,c):0)+.005,z:gz,m:gfxGround(gx,gz),nx:0,ny:1,nz:0};}

/* ---------- 차량 포구 ---------- */
function gfxBarrel(a){const o=V3.uo.get(a.id);if(!o)return null;let tur=o.userData._gtur;
  if(tur===undefined){tur=null;o.traverse(q=>{if(!tur&&q.userData&&q.userData.turret)tur=q;});o.userData._gtur=tur;}
  if(!tur)return null;let B=tur.userData._bar;
  if(B===undefined){B=null;let best=0;tur.traverse(q=>{const g=q.geometry;if(q.isMesh&&g&&g.type==='CylinderGeometry'&&Math.abs(q.rotation.z-Math.PI/2)<.01&&g.parameters.height>best){best=g.parameters.height;B={m:q,x0:q.position.x,tip:q.position.x+g.parameters.height/2,y:q.position.y,z:q.position.z,len:g.parameters.height};}});tur.userData._bar=B;}
  if(!B)return null;const T=V3.T;tur.updateWorldMatrix(true,false);const p=tur.localToWorld(new T.Vector3(B.tip+(a.type==='spg'?.3*MU:0),B.y,B.z));const q=tur.localToWorld(new T.Vector3(B.tip-1,B.y,B.z));
  const dx=p.x-q.x,dy=p.y-q.y,dz=p.z-q.z,L=Math.hypot(dx,dy,dz)||1;return {x:p.x,y:p.y,z:p.z,dx:dx/L,dy:dy/L,dz:dz/L,B};}
/* 포신 후퇴: 순간 뒤로 밀렸다가 천천히 돌아온다 */
function gfxRecoil(B,amt){if(!B||!B.m)return;const m=B.m,x0=B.x0;const holder=new V3.T.Object3D();V3.G.fx.add(holder);
  V3.fx.push({o:holder,t0:performance.now(),dur:700,upd:(o,k)=>{const e=k<.08?k/.08:1-(k-.08)/.92;m.position.x=x0-amt*Math.max(0,e)*(k<.08?1:e);if(k>.98)m.position.x=x0;}});}

/* 큰 포 발사: 앞으로 터지는 불덩이와 연기, 제퇴기 옆 분출, 둘레 땅의 흙먼지(포구 압력) */
function gfxCannon(x,y,z,dx,dy,dz,s,gy){const sq=Math.sqrt(s);
  pfx({x:x+dx*.12*s,y:y+dy*.12*s,z:z+dz*.12*s,life:.07,s0:.5*s,s1:.9*s,k:PFXK.FLASH,col:'#fff1d6',a:1,fi:.01,wind:0});
  pfx({x:x+dx*.3*s,y:y+dy*.3*s,z:z+dz*.3*s,vx:dx*.1,vy:dy*.1,vz:dz*.1,life:.08,s0:.22*s,s1:.18*s,len:.75*s,lmin:.65*s,k:PFXK.STREAK,col:'#ffc070',a:1,fi:.01,wind:0});
  const px=-dz,pz=dx;for(const sg of [-1,1])pfx({x:x+px*sg*.08*s,y,z:z+pz*sg*.08*s,vx:px*sg*.1,vz:pz*sg*.1,life:.06,s0:.12*s,s1:.1*s,len:.35*s,lmin:.3*s,k:PFXK.STREAK,col:'#ffb060',a:.9,fi:.01,wind:0});
  for(let i=0;i<pfxN(7);i++){const sp=gfxR(2,5)*sq;pfx({x,y,z,vx:dx*sp+gfxR(-.6,.6),vy:dy*sp+gfxR(-.2,.6),vz:dz*sp+gfxR(-.6,.6),drag:8,acc:.6,life:gfxR(.18,.32),s0:.06*s,s1:gfxR(.18,.3)*s,k:PFXK.FIRE,col:'#ffffff',a:.95,fi:.03,wind:.2});}
  // 포구 연기: 앞으로 굵게 밀려 나가 둥근 덩어리로 멈추고, 오래 떠 있다
  for(let i=0;i<pfxN(9);i++){const sp=gfxR(.8,3.5)*sq,side=gfxR(-.5,.5);pfx({x:x+dx*.05,y,z:z+dz*.05,vx:dx*sp+px*side,vy:dy*sp+gfxR(0,.3),vz:dz*sp+pz*side,drag:2.6,acc:.03,life:gfxR(4,7)*sq,s0:.08*s,s1:gfxR(.35,.6)*s,col:Math.random()<.5?'#b8b2a6':'#9d978b',a:.5,fi:.03,wind:.8,em:'#ff9040',emI:.8,emK:.04});}
  for(const sg of [-1,1])for(let i=0;i<pfxN(3);i++){const sp=gfxR(1,2.2)*sq;pfx({x,y,z,vx:px*sg*sp+dx*.4,vy:gfxR(0,.3),vz:pz*sg*sp+dz*.4,drag:3,acc:.02,life:gfxR(3,5),s0:.06*s,s1:gfxR(.25,.4)*s,col:'#aaa498',a:.4,fi:.03,wind:.8});}
  // 땅: 포구 아래와 둘레가 확 일어난다(앞쪽이 가장 세다)
  if(gy!=null){const mat=gfxGround(x+dx*.4,z+dz*.4),M=GFXM[mat]||GFXM.dirt;const n=pfxN(14);for(let i=0;i<n;i++){const a=Math.random()*6.283;const fw=Math.max(0,Math.cos(a-Math.atan2(dz,dx)));const sp=gfxR(.8,2)*(.4+fw*1.4)*sq;
      pfx({x:x+dx*.2+Math.cos(a)*.05,y:gy+gfxR(.02,.08),z:z+dz*.2+Math.sin(a)*.05,vx:Math.cos(a)*sp,vy:gfxR(.05,.35),vz:Math.sin(a)*sp,drag:2.2,acc:.005,life:gfxR(3,6)*sq,s0:.1*s,s1:gfxR(.4,.7)*s,col:gfxPick(mat==='road'?GFXM.rubble.c:M.c),a:mat==='water'?.3:.5,fi:.03,wind:1});}}
  if(V3.flash){V3.flash.position.set(x+dx*.4,y+.4,z+dz*.4);V3.flash.intensity=Math.max(V3.flash.intensity,5*s);V3.flashT=performance.now();}
  const cs=V3.cs;if(cs){const dd=Math.hypot(cs.x-x,cs.z-z);V3.shake=Math.max(V3.shake||0,.06*s*Math.max(0,1-dd/10));}}

/* ---------- 고폭탄 탄착(포탄·박격포·전차 고폭탄·지뢰) ----------
   s: 크기(박격포 .85, 포탄 1.2~1.4, 전차 고폭 .55, 유탄 .4) */
function gfxShellHit(x,y,z,s,mat){if(!V3.on)return;if(!PFX.on)pfxInit();if(!PFX.on)return;mat=mat||gfxGround(x,z);const M=GFXM[mat]||GFXM.dirt;const sq=Math.sqrt(s);const water=mat==='water',snow=mat==='snow';
  // 섬광: 한순간. 고폭탄은 불덩이가 거의 없다
  pfx({x,y:y+.06*s,z,life:.06+.02*s,s0:.7*s,s1:1.5*s,k:PFXK.FLASH,col:'#fff3dc',a:1,fi:.01,wind:0});
  pfx({x,y:y+.1*s,z,life:.22,s0:.6*s,s1:1.1*s,k:PFXK.FLASH,col:'#ff9a48',a:.45,fi:.02,wind:0});
  for(let i=0;i<pfxN(4+3*s);i++){const a=Math.random()*6.283,sp=gfxR(1,2.6)*sq;pfx({x,y:y+.05,z,vx:Math.cos(a)*sp,vy:gfxR(.6,2.2)*sq,vz:Math.sin(a)*sp,drag:9,acc:.4,life:gfxR(.12,.24),s0:.08*s,s1:gfxR(.22,.36)*s,k:PFXK.FIRE,col:'#ffffff',a:.9,fi:.03,wind:.2});}
  // 흙기둥: 위로 V자로 솟구쳤다가 멈추고 흙은 떨어진다
  const ej=water?['#eef3f4','#dfe8ea','#f6f9fa']:snow?['#e9edf0','#4a4036','#d9dfe3','#5a4e42']:mat==='road'||mat==='wall'||mat==='rubble'?['#6f675c','#857c70','#5b544b','#4a443c']:mat==='sand'||mat==='tan'?['#b9a37d','#a58f6a','#c8b48e']:['#4f4337','#5f5244','#3f362d','#6b5d4c'];
  for(let i=0;i<pfxN(13+9*s);i++){const a=Math.random()*6.283,el=gfxR(1.15,1.52),sp=gfxR(1.8,3.6)*sq*(water?1.4:1);
    pfx({x:x+gfxR(-.05,.05)*s,y:y+.05,z:z+gfxR(-.05,.05)*s,vx:Math.cos(a)*Math.cos(el)*sp,vy:Math.sin(el)*sp,vz:Math.sin(a)*Math.cos(el)*sp,drag:2.2,acc:water?-3:-.9,life:gfxR(2.4,4.5)*sq*(water?.7:1),s0:.09*s,s1:gfxR(.3,.55)*s,col:gfxPick(ej),a:water?.7:.85,fi:.02,wind:.6,rs:(Math.random()-.5)*.6});}
  // 흙덩이 줄기: 사방으로 포물선을 그리며 떨어진다
  for(let i=0;i<pfxN(18+12*s);i++){const a=Math.random()*6.283,el=gfxR(.45,1.3),sp=gfxR(1.6,3.6)*sq;
    pfx({x,y:y+.05,z,vx:Math.cos(a)*Math.cos(el)*sp,vy:Math.sin(el)*sp,vz:Math.sin(a)*Math.cos(el)*sp,drag:.8,acc:-7,life:gfxR(.5,1)*sq,s0:.028*s,s1:.045*s,col:gfxPick(water?GFXM.water.c:snow?['#4a4036','#e6eaec']:M.k),a:.95,fi:.01,wind:0,v:0});}
  // 고폭 화약 연기: 가운데서 검게 피어오른다(물이면 거의 없다)
  if(!water)for(let i=0;i<pfxN(4+3*s);i++){const a=Math.random()*6.283,r=gfxR(0,.15)*s;
    pfx({x:x+Math.cos(a)*r,y:y+gfxR(.1,.35)*s,z:z+Math.sin(a)*r,vx:Math.cos(a)*gfxR(.1,.4)*s,vy:gfxR(.5,1.2)*sq,vz:Math.sin(a)*gfxR(.1,.4)*s,drag:1.1,acc:.04,life:gfxR(7,12)*sq,s0:.22*s,s1:gfxR(1,1.5)*s,col:gfxPick(['#4a453f','#5d5750','#3c3833']),a:.75,fi:.03,em:'#ff8030',emI:.9,emK:.025,dl:gfxR(.02,.1)});}
  // 낮게 퍼지는 먼지 고리
  const dc=water?GFXM.water.c:snow?GFXM.snow.c:mat==='road'||mat==='wall'?GFXM.rubble.c:M.c;
  const nd=pfxN(9+7*s);for(let i=0;i<nd;i++){const a=i/nd*6.283+Math.random()*.5,sp=gfxR(1.4,3)*s;
    pfx({x:x+Math.cos(a)*.1,y:y+gfxR(.03,.12),z:z+Math.sin(a)*.1,vx:Math.cos(a)*sp,vy:gfxR(.05,.25),vz:Math.sin(a)*sp,drag:2.5,acc:.01,life:gfxR(10,20)*sq*(mat==='mud'?.5:mat==='sand'?1.4:1),s0:.22*s,s1:gfxR(1,1.6)*s,col:gfxPick(dc),a:water?.35:.55,fi:.03,rs:(Math.random()-.5)*.3});}
  // 파편 불꽃 몇 개
  for(let i=0;i<pfxN(5+5*s);i++){const a=Math.random()*6.283,el=gfxR(.1,1.1),sp=gfxR(4,8)*sq;pfx({x,y:y+.05,z,vx:Math.cos(a)*Math.cos(el)*sp,vy:Math.sin(el)*sp,vz:Math.sin(a)*Math.cos(el)*sp,drag:1.5,acc:-4,life:gfxR(.15,.35),s0:.016,s1:.012,k:PFXK.SPARK,col:'#ffd8a0',a:1,fi:.01,wind:0});}
  pfxRing(x,y,z,s*.5);
  if(!water)pfxEmit({x,y:y+.04,z,dur:gfxR(5,10)*sq,rate:.9,fn:e=>pfx({x:e.x+gfxR(-.12,.12)*s,y:e.y,z:e.z+gfxR(-.12,.12)*s,vy:gfxR(.12,.3),drag:.2,life:gfxR(4,7),s0:.1*s,s1:gfxR(.4,.8)*s,col:'#57514a',a:.3,fi:.15})});
  if(V3.flash){V3.flash.position.set(x,y+.6,z);V3.flash.intensity=Math.max(V3.flash.intensity,(3+3*s)*2);V3.flashT=performance.now();}}

/* 성형작약(RPG·대전차미사일) 탄착: 날카로운 섬광, 불꽃 다발, 검은 연기 한 덩이 */
function gfxHeat(x,y,z,nx,ny,nz,s,mat){if(!PFX.on)pfxInit();if(!PFX.on)return;s=s||1;const M=GFXM[mat]||GFXM.dirt;
  pfx({x:x+nx*.03,y:y+ny*.03+.02,z:z+nz*.03,life:.07,s0:.35*s,s1:.8*s,k:PFXK.FLASH,col:'#fff4e0',a:1,fi:.01,wind:0});
  for(let i=0;i<pfxN(5);i++){const a=Math.random()*6.283,sp=gfxR(1,2.5);pfx({x,y,z,vx:Math.cos(a)*sp+nx*1.5,vy:gfxR(.3,1.6),vz:Math.sin(a)*sp+nz*1.5,drag:9,acc:.4,life:gfxR(.12,.22),s0:.05*s,s1:.16*s,k:PFXK.FIRE,col:'#ffffff',a:.9,fi:.03,wind:.2});}
  for(let i=0;i<pfxN(12);i++){const a=Math.random()*6.283,el=gfxR(-.2,1.3),sp=gfxR(3,7);pfx({x,y,z,vx:Math.cos(a)*Math.cos(el)*sp+nx*2,vy:Math.sin(el)*sp,vz:Math.sin(a)*Math.cos(el)*sp+nz*2,drag:1.4,acc:-5,life:gfxR(.2,.5),s0:.016,s1:.012,k:PFXK.SPARK,col:'#ffdca0',a:1,fi:.01,wind:0});}
  for(let i=0;i<pfxN(7);i++){const a=Math.random()*6.283;pfx({x:x+nx*.05,y:y+.03,z:z+nz*.05,vx:Math.cos(a)*gfxR(.2,.6)+nx*.6,vy:gfxR(.3,.9),vz:Math.sin(a)*gfxR(.2,.6)+nz*.6,drag:1.6,acc:.03,life:gfxR(4,7),s0:.1*s,s1:gfxR(.45,.7)*s,col:gfxPick(['#4d4842','#5e5852','#3e3a35']),a:.8,fi:.03,em:'#ff8030',emI:1,emK:.04,dl:gfxR(0,.06)});}
  if(mat!=='metal')for(let i=0;i<pfxN(6);i++){const a=Math.random()*6.283;pfx({x,y,z,vx:Math.cos(a)*gfxR(.5,1.5)+nx,vy:gfxR(.3,1.2)+ny,vz:Math.sin(a)*gfxR(.5,1.5)+nz,drag:2.5,acc:-.05,life:gfxR(3,6),s0:.08*s,s1:gfxR(.35,.6)*s,col:gfxPick(M.c),a:.55,fi:.03});}
  if(V3.flash){V3.flash.position.set(x,y+.5,z);V3.flash.intensity=Math.max(V3.flash.intensity,6*s);V3.flashT=performance.now();}}

/* ---------- 로켓(RPG): 후폭풍 → 모터 불꽃·연기 꼬리 → 성형작약 탄착 ---------- */
function gfxRocket(x1,y1,z1,L,v,onHit){const T=V3.T;const dx=L.x-x1,dy=L.y-y1,dz=L.z-z1,d=Math.hypot(dx,dy,dz)||1e-3,ux=dx/d,uy=dy/d,uz=dz/d;const dur=d/v*1000;
  // 후폭풍: 뒤로 회색 먼지가 크게 터진다
  pfx({x:x1+ux*.03,y:y1,z:z1+uz*.03,life:.05,s0:.08,s1:.14,k:PFXK.FLASH,col:'#ffe0a8',a:1,fi:.01,wind:0});
  for(let i=0;i<pfxN(8);i++){const sp=gfxR(1.2,3),sd=gfxR(-.5,.5);pfx({x:x1-ux*.04,y:y1,z:z1-uz*.04,vx:-ux*sp-uz*sd,vy:gfxR(-.1,.4),vz:-uz*sp+ux*sd,drag:2.8,acc:.02,life:gfxR(2.5,4.5),s0:.05,s1:gfxR(.22,.38),col:Math.random()<.5?'#bdb5a8':'#a69e90',a:.5,fi:.03,wind:.9});}
  const holder=new T.Object3D();V3.G.fx.add(holder);let lp=null,done=false;const sw=Math.random()*6.283;
  V3.fx.push({o:holder,t0:performance.now(),dur,upd:(o,k)=>{const wob=Math.sin(k*18+sw)*.012*(1-k);const x=x1+dx*k-uz*wob,y=y1+dy*k+Math.cos(k*18+sw)*.008,z=z1+dz*k+ux*wob;
      pfx({x,y,z,life:.04,s0:.04,s1:.025,k:PFXK.FLASH,col:'#ffd9a0',a:1,fi:.01,wind:0});
      // 연기 꼬리: 지난 화면 자리부터 지금 자리까지 촘촘히(빠른 로켓도 끊기지 않게)
      const p0=lp||[x1,y1,z1];const seg=Math.hypot(x-p0[0],y-p0[1],z-p0[2]);const n=Math.min(14,Math.ceil(seg/.05));
      for(let i=1;i<=n;i++){const t=i/n,px=p0[0]+(x-p0[0])*t,py=p0[1]+(y-p0[1])*t,pz=p0[2]+(z-p0[2])*t;
        pfx({x:px,y:py,z:pz,vx:gfxR(-.04,.04),vy:gfxR(0,.06),vz:gfxR(-.04,.04),drag:.8,acc:.01,life:gfxR(2.2,3.6),s0:.025,s1:gfxR(.11,.17),col:Math.random()<.5?'#d6d1c7':'#c2bcb0',a:.42,fi:.04,wind:1,dl:-(1-t)*.016});}
      lp=[x,y,z];
      if(k>.97&&!done){done=true;onHit&&onHit();}}});
  setTimeout(()=>{if(!done){done=true;onHit&&onHit();}},dur+60);}

/* ---------- 사격 한 번 ---------- */
const _gfxFireOld=v3FxFire;
v3FxFire=function(a,r,c,d,shot){if(typeof v3AirFire==='function'&&v3AirFire(a,r,c,d,shot))return;
  const ta=a&&UT[a.type];if(!ta||!V3.on||!GFX.on||ta.ind||!V3.T){return _gfxFireOld.apply(this,arguments);}
  if(typeof sndShot==='function')sndShot(a);if(!PFX.on)pfxInit();if(!PFX.on)return _gfxFireOld.apply(this,arguments);
  d=d||unitAt(r,c);const tile=d?null:[r,c];
  let [x1,y1,z1]=v3Pos(a.r,a.c,a);let [x2,y2,z2]=v3Pos(r,c,d);
  if(tile){const [cx,cz]=v3x(r,c);x2=cx;z2=cz;y2=Math.min(v3Top(r,c)*.6,y1+.1);}
  const lod=gfxLod(x1,z1),lod2=gfxLod(x2,z2);let dx=x2-x1,dy=y2-y1,dz=z2-z1;const D=Math.hypot(dx,dy,dz)||1e-3;dx/=D;dy/=D;dz/=D;
  const pHit=shot&&shot.k?Math.min(1,(shot.hits||0)/shot.k):.5;const tc=gfxTrC(a);
  // 전차: 주포 한 발
  if(a.type==='tank'){const br=gfxBarrel(a);if(br){x1=br.x;y1=br.y;z1=br.z;}const bdx=br?br.dx:dx,bdy=br?br.dy:dy,bdz=br?br.dz:dz;
    gfxCannon(x1,y1,z1,bdx,bdy,bdz,1,v3Top(a.r,a.c)+.01);if(br)gfxRecoil(br.B,.9*MU);
    const hit=Math.random()<Math.max(pHit,.35);const Ld=gfxLand(x1,y1,z1,x2,y2,z2,d,hit,tile);const dd=Math.hypot(Ld.x-x1,Ld.y-y1,Ld.z-z1);const v=110;
    gfxTracer(x1,y1,z1,Ld.x,Ld.y,Ld.z,v,'#ffe2a0',.028,0,.7);
    setTimeout(()=>{if(!V3.on)return;if(Ld.m==='metal'){gfxHeat(Ld.x,Ld.y,Ld.z,Ld.nx,Ld.ny,Ld.nz,1.2,'metal');gfxHit(Ld.x,Ld.y,Ld.z,'metal',Ld.nx,Ld.ny,Ld.nz,3,0,1);}
      else if(Ld.ny<.5){pfxBlast(Ld.x,Ld.y,Ld.z,.55,{ground:false,fire:.4,dust:gfxPick(GFXM[Ld.m]?GFXM[Ld.m].c:GFXM.wall.c)});v3Debris(Ld.x+Ld.nx*.05,Ld.y,Ld.z+Ld.nz*.05,6,.6);dsScar('scorch',Ld.x,Ld.z,.08);}
      else{gfxShellHit(Ld.x,Ld.y,Ld.z,.6,Ld.m);dsScar('crater',Ld.x,Ld.z,.09);}
      V3.shake=Math.max(V3.shake,.05);if(typeof sndBoom==='function')sndBoom(Ld.x,Ld.z,.5);},dd/v*1000);return;}
  // 대전차 로켓(RPG)
  if(a.type==='at'){const hit=Math.random()<pHit;const Ld=gfxLand(x1,y1,z1,x2,y2,z2,d,hit,tile);
    gfxRocket(x1,y1+.02,z1,Ld,24,()=>{if(!V3.on)return;gfxHeat(Ld.x,Ld.y,Ld.z,Ld.nx,Ld.ny,Ld.nz,1,Ld.m);if(Ld.ny>=.5)dsScar('scorch',Ld.x,Ld.z,.07);else v3Debris(Ld.x+Ld.nx*.05,Ld.y,Ld.z+Ld.nz*.05,4,.5);
      V3.shake=Math.max(V3.shake,.04);if(typeof sndBoom==='function')sndBoom(Ld.x,Ld.z,.5);});return;}
  // 공병: 수류탄·폭약을 던진다
  if(a.type==='eng'){const Ld=gfxLand(x1,y1,z1,x2,y2,z2,d,true,tile);const T=V3.T;const g=new T.Mesh(V3.gfxNadeG||(V3.gfxNadeG=new T.SphereGeometry(.012,6,4)),V3.M.dark);g.userData.keepGeo=1;g.userData.keepMat=1;V3.G.fx.add(g);
    V3.fx.push({o:g,t0:performance.now(),dur:600,upd:(o,k)=>{o.position.set(x1+(Ld.x-x1)*k,y1+(Ld.y-y1)*k+Math.sin(k*Math.PI)*.25,z1+(Ld.z-z1)*k);}});
    setTimeout(()=>{if(!V3.on)return;if(Ld.ny<.5){pfxBlast(Ld.x,Ld.y,Ld.z,.6,{ground:false,fire:.4,dust:GFXM.wall.c[0]});v3Debris(Ld.x,Ld.y,Ld.z,8,.7);}else gfxShellHit(Ld.x,Ld.y,Ld.z,.5,Ld.m);dsScar('scorch',Ld.x,Ld.z,.08);V3.shake=Math.max(V3.shake,.05);if(typeof sndBoom==='function')sndBoom(Ld.x,Ld.z,.5);},1600);return;}
  const W=GFXW[a.type]||GFXW.rifle;
  // 차량 기관총·기관포는 총열 끝에서
  if(ta.cls==='veh'){const br=gfxBarrel(a);if(br){x1=br.x;y1=br.y;z1=br.z;}}
  else{x1+=dx*.03;z1+=dz*.03;y1+=.01;}
  const n=Math.max(1,Math.round(W.n*(lod<.3?.5:1)));let first=1e9;
  for(let i=0;i<n;i++){const dl=i*W.gap*gfxR(.85,1.15);
    gfxMuzzle(x1,y1,z1,dx,dy,dz,W.fl,i%2===0?W.sm:0,dl,lod);
    if(W.brass&&lod>.4)gfxBrass(x1-dx*.02,y1,z1-dz*.02,dx,dz,dl);
    const hit=Math.random()<pHit;const Ld=gfxLand(x1,y1,z1,x2,y2,z2,d,hit,tile);const dd=Math.hypot(Ld.x-x1,Ld.y-y1,Ld.z-z1);const at=dl+dd/W.v;if(at<first)first=at;
    let trc=false;if(W.tr){const cnt=(GFX.tc.get(a.id)||Math.random()*W.tr|0)+1;GFX.tc.set(a.id,cnt%1e6);trc=cnt%W.tr===0;}
    if(trc){gfxTracer(x1,y1,z1,Ld.x,Ld.y,Ld.z,W.v,tc,W.he?.024:.018,dl,W.he?.55:.5);
      const M=GFXM[Ld.m];if(M&&Math.random()<M.ric*(W.he?.3:1))gfxRicochet(Ld.x,Ld.y,Ld.z,Ld.nx,Ld.ny,Ld.nz,tc,at);}
    gfxHit(Ld.x,Ld.y,Ld.z,Ld.m,Ld.nx,Ld.ny,Ld.nz,W.im,at,lod2,W.he);}
  // 저격수: 엎드린 자리 앞 흙이 총구 압력에 일어난다
  if(W.dust&&lod>.4){const gy=v3Top(a.r,a.c);if(y1-gy<.2){const m=gfxGround(x1+dx*.05,z1+dz*.05),M=GFXM[m]||GFXM.dirt;for(let i=0;i<3;i++)pfx({x:x1+dx*.06,y:gy+.02,z:z1+dz*.06,vx:dx*gfxR(.3,.8)+gfxR(-.3,.3),vy:gfxR(.05,.2),vz:dz*gfxR(.3,.8)+gfxR(-.3,.3),drag:2.5,life:gfxR(1.2,2),s0:.03,s1:gfxR(.1,.16),col:gfxPick(M.c),a:.45,fi:.04,wind:1});}}
  if(ta.cls==='veh'&&V3.flash&&typeof nightK==='function'&&nightK()>.4){V3.flash.position.set(x1,y1+.3,z1);V3.flash.intensity=Math.max(V3.flash.intensity,1.2);V3.flashT=performance.now();}
  setTimeout(()=>{if(!V3.on)return;if(Math.random()<.25&&!tile)dsScar('spray',x2,z2,.05);if(typeof sndImpact==='function')sndImpact(x2,z2);},first*1000);};

/* ---------- 박격포·자주포 발사 ---------- */
v3FxLaunch=function(a){if(typeof sndLaunch==='function')sndLaunch(a.x??a.c+.5,a.z??a.r+.5,UT[a.type].cls==='veh'?'gun':'mortar');if(!V3.on)return;if(!PFX.on)pfxInit();if(!PFX.on)return;
  const [x,y,z]=v3Pos(a.r,a.c,a);const gy=v3Top(a.r,a.c)+.01;const f=(a.face||0)*Math.PI/180;
  if(UT[a.type].cls==='veh'){const br=gfxBarrel(a);let X=x,Y=y+.1,Z=z,dx=Math.cos(f)*.6,dy=.8,dz=Math.sin(f)*.6;
    if(br){X=br.x;Y=br.y;Z=br.z;dx=br.dx;dy=Math.max(br.dy,.55);dz=br.dz;const L=Math.hypot(dx,dy,dz);dx/=L;dy/=L;dz/=L;gfxRecoil(br.B,1.1*MU);}
    gfxCannon(X,Y,Z,dx,dy,dz,1.25,gy);return;}
  // 박격포: 관 위로 짧은 섬광과 연기 한 줄, 받침판 둘레 먼지
  const X=x+Math.cos(f)*.02,Z=z+Math.sin(f)*.02,Y=y+.06;
  pfx({x:X,y:Y+.04,z:Z,life:.05,s0:.12,s1:.2,k:PFXK.FLASH,col:'#ffe6b0',a:1,fi:.01,wind:0});
  pfx({x:X,y:Y+.06,z:Z,vx:Math.cos(f)*.05,vy:.1,vz:Math.sin(f)*.05,life:.05,s0:.05,s1:.04,len:.16,lmin:.14,k:PFXK.STREAK,col:'#ffc878',a:1,fi:.01,wind:0});
  for(let i=0;i<pfxN(5);i++)pfx({x:X,y:Y+.05,z:Z,vx:Math.cos(f)*gfxR(.2,.6)+gfxR(-.15,.15),vy:gfxR(1,2.6),vz:Math.sin(f)*gfxR(.2,.6)+gfxR(-.15,.15),drag:2.5,acc:.02,life:gfxR(2,3.5),s0:.04,s1:gfxR(.16,.26),col:Math.random()<.5?'#c6c0b5':'#ada79c',a:.45,fi:.03,wind:1});
  const m=gfxGround(x,z),M=GFXM[m]||GFXM.dirt;for(let i=0;i<pfxN(6);i++){const an=Math.random()*6.283,sp=gfxR(.5,1.2);pfx({x,y:gy+.03,z,vx:Math.cos(an)*sp,vy:gfxR(.03,.15),vz:Math.sin(an)*sp,drag:2.5,life:gfxR(2,4),s0:.05,s1:gfxR(.18,.3),col:gfxPick(M.c),a:.4,fi:.03,wind:1});}};

/* ---------- 포탄 탄착 ---------- */
{const _bo=v3FxBoom;v3FxBoom=function(x,z,h,onB,s){if(!V3.on||!GFX.on||onB)return _bo.apply(this,arguments);if(!PFX.on)pfxInit();if(!PFX.on)return _bo.apply(this,arguments);
  if(typeof sndBoom==='function')sndBoom(x,z,(s&&s.pw||1)>1.2?1.3:1,{y:0});
  const pw=s&&s.pw||1;const sz=Math.min(1.6,.35+.6*pw);const big=pw>1.2;const y=v3TopAt(x,z);const m=gfxGround(x,z);
  gfxShellHit(x,y+.03,z,sz,m);
  if(m!=='water'){v3Debris(x,y+.15,z,big?10:pw<.5?2:6,.9);dsScar('crater',x,z,sz*.17);if((m==='dirt'||m==='sand')&&Math.random()<.15)dsFires(x,z,1,12000+Math.random()*12000,sz*.4,y+.03);}
  else if(typeof FXH.splash==='function')try{FXH.splash(x,z,big?1:0);}catch(e){}
  const cs=V3.cs;const dd=cs?Math.hypot(cs.x-x,cs.z-z):5;V3.shake=Math.max(V3.shake,(big?.2:.12)*Math.min(1,pw)*Math.max(.3,1-dd/14));};}

/* ---------- 날아가는 포탄: 빛나지 않는 검은 점. 로켓탄만 불꽃과 연기 꼬리 ---------- */
v3ShellsDraw=function(){if(!PFX.on)pfxInit();const T=V3.T;V3.shellO=V3.shellO||new Map();const live=new Set();const gt=(G.time||0)+(typeof RT!=='undefined'?Math.min(RT.acc||0,.1):0);
  for(const s of G.shells||[]){const k=(gt-s.t0)/s.T;if(k<0||k>1)continue;live.add(s.id);let o=V3.shellO.get(s.id);const rk=s.type==='mlrs';
    if(!o){o=new T.Sprite(new T.SpriteMaterial({map:V3.puff,color:rk?'#ffd9a0':'#26231f',blending:rk?T.AdditiveBlending:T.NormalBlending,transparent:true,depthWrite:false}));o.scale.setScalar(rk?.08:.045);V3.G.fx.add(o);V3.shellO.set(s.id,o);o.userData.lt=0;}
    const [x,z,h]=shellPos(s,Math.min(1,k));const y=v3H(h);o.position.set(x,y,z);
    if(PFX.on&&k-o.userData.lt>(rk?.012:.05)&&k<.98){o.userData.lt=k;
      if(rk){pfx({x,y,z,vx:gfxR(-.05,.05),vy:gfxR(-.02,.05),vz:gfxR(-.05,.05),drag:.6,acc:.01,life:gfxR(4,7),s0:.05,s1:gfxR(.25,.4),col:Math.random()<.5?'#d8d3c9':'#c3bdb1',a:.55,fi:.03,wind:1});
        pfx({x,y,z,life:.08,s0:.06,s1:.03,k:PFXK.FIRE,col:'#ffffff',a:.9,fi:.01,wind:0});}
      else if(k<.25)pfx({x,y,z,vy:.02,drag:.5,life:gfxR(.6,1),s0:.02,s1:.06,col:'#bdb7ac',a:.18,fi:.05,wind:1});}}
  for(const [id,o] of V3.shellO)if(!live.has(id)){V3.G.fx.remove(o);o.material.dispose();V3.shellO.delete(id);}};

/* ---------- 대전차 유도미사일: 발사·연기 꼬리·탄착 ---------- */
v3AtgmLaunch=function(a){if(!V3.on)return;if(!PFX.on)pfxInit();if(!PFX.on)return;const [x,y,z]=v3Pos(a.r,a.c,a);const f=(a.face||0)*Math.PI/180,ux=Math.cos(f),uz=Math.sin(f);
  pfx({x:x+ux*.04,y:y+.05,z:z+uz*.04,life:.06,s0:.12,s1:.22,k:PFXK.FLASH,col:'#ffe0a8',a:1,fi:.01,wind:0});
  // 발사관 뒤로 회색 후폭풍, 둘레 흙먼지
  for(let i=0;i<pfxN(10);i++){const sp=gfxR(1,2.8),sd=gfxR(-.6,.6);pfx({x:x-ux*.05,y:y+.03,z:z-uz*.05,vx:-ux*sp-uz*sd,vy:gfxR(-.05,.4),vz:-uz*sp+ux*sd,drag:2.6,acc:.02,life:gfxR(3,5),s0:.05,s1:gfxR(.25,.42),col:Math.random()<.5?'#c8c1b4':'#aaa295',a:.5,fi:.03,wind:.9});}
  const m=gfxGround(x,z),M=GFXM[m]||GFXM.dirt;for(let i=0;i<pfxN(5);i++){const an=Math.random()*6.283;pfx({x,y:v3Top(a.r,a.c)+.03,z,vx:Math.cos(an)*gfxR(.4,1),vy:.05,vz:Math.sin(an)*gfxR(.4,1),drag:2.5,life:gfxR(2,4),s0:.05,s1:.25,col:gfxPick(M.c),a:.35,fi:.03,wind:1});}};
{const _md=v3MissilesDraw;v3MissilesDraw=function(){if(!PFX.on)return _md.apply(this,arguments);V3.msO=V3.msO||new Map();const live=new Set();const now=performance.now();
  for(const m of G.missiles||[]){live.add(m.id);let o=V3.msO.get(m.id);if(!o){o=v3MsMesh(.09);V3.G.fx.add(o);V3.msO.set(m.id,o);o.userData.lt=0;o.userData.p=[m.x,m.z];}
    const y=.06+m.h*FLOOR_H;const [px,pz]=o.userData.p;const k=.35;const nx=px+(m.x-px)*k,nz=pz+(m.z-pz)*k;o.userData.p=[nx,nz];
    const ang=Math.atan2(-(m.z-pz),m.x-px);if(Math.abs(m.x-px)+Math.abs(m.z-pz)>.001)o.rotation.y=ang;o.rotation.z=m.dive?-.7:.08;o.position.set(nx,y,nz);
    const fl=o.children[1];if(fl)fl.scale.setScalar(.07+Math.random()*.06);   // 모터 불꽃이 떨린다
    {const bx=nx-Math.cos(ang)*.045,bz=nz+Math.sin(ang)*.045;const lp=o.userData.lp||[bx,y,bz];const seg=Math.hypot(bx-lp[0],y-lp[1],bz-lp[2]);const n=Math.min(10,Math.floor(seg/.04));
      for(let i=1;i<=n;i++){const t=i/n;pfx({x:lp[0]+(bx-lp[0])*t,y:lp[1]+(y-lp[1])*t,z:lp[2]+(bz-lp[2])*t,vx:gfxR(-.04,.04),vy:gfxR(0,.05),vz:gfxR(-.04,.04),drag:.7,acc:.008,life:gfxR(4,7),s0:.025,s1:gfxR(.14,.24),col:Math.random()<.5?'#e2ddd3':'#cdc7bb',a:.45,fi:.04,wind:1});}
      if(n||!o.userData.lp)o.userData.lp=n?[bx,y,bz]:lp;}}
  for(const [id,o] of V3.msO)if(!live.has(id)){V3.G.fx.remove(o);o.traverse(q=>{if(q.geometry)q.geometry.dispose();if(q.material)q.material.dispose();});V3.msO.delete(id);}};}
{const _mh=v3MsHit;v3MsHit=function(m,wall){if(!V3.on||!PFX.on)return _mh.apply(this,arguments);const y=.06+m.h*FLOOR_H;
  const t=G.units.find(u=>u.id===m.tgt);const veh=t&&UT[t.type]&&UT[t.type].cls==='veh'&&Math.hypot(t.x-m.x,t.z-m.z)<.4;const mat=veh?'metal':wall?gfxGround(m.x,m.z)==='tan'?'tan':'wall':gfxGround(m.x,m.z);
  gfxHeat(m.x,y,m.z,0,1,0,1.3,mat);if(veh)gfxHit(m.x,y,m.z,'metal',0,1,0,3,0,1);v3Debris(m.x,y,m.z,wall?8:4,.7);
  if(!wall){dsScar('scorch',m.x,m.z,.12);}V3.shake=Math.max(V3.shake,.08);};}

/* ===================== 공격헬기 무장: 로켓 포드·대전차 미사일·기수 기관포 =====================
   새 공격헬기 모형(07x3-aircraft)의 실제 무장 자리에서 쏜다(모형 1m 좌표: 로켓 포드 앞 끝 x 1.2·y 1.05·z ±1.4,
   바깥 미사일 레일 x 1.25·z ±2.3, 기관포 총구 x 6.3·y .8).
   - 로켓: 좌우 포드에서 번갈아, 발사 섬광과 흰 연기 뭉치, 모터 불꽃, 굵은 흰 연기 꼬리, 조금씩 흩어진다. 탄착은 작은 고폭탄.
   - 대전차 미사일(차량 표적): 레일에서 떨어지듯 나가 살짝 솟았다가 내리꽂힌다. 긴 연기 꼬리, 성형작약 탄착.
   - 기관포: 짧은 연사, 탄착이 표적 앞에서 표적 쪽으로 걸어 들어간다(30mm 고폭 작은 폭발). */
function gfxHeliNode(a){const o=V3.uo.get(a.id);if(!o)return null;let n=o.userData._gfxM;
  if(n===undefined){n=null;o.traverse(q=>{if(!n&&Math.abs(q.scale.x-MU)<1e-6&&q.children.length>8)n=q;});o.userData._gfxM=n;}return n;}
function gfxHeliPt(a,lx,ly,lz){const n=gfxHeliNode(a);if(!n)return null;n.updateWorldMatrix(true,false);const p=n.localToWorld(new V3.T.Vector3(lx,ly,lz));return [p.x,p.y,p.z];}
/* 로켓·미사일 한 발: (x1..)에서 (x2..)로. loft: 솟았다 내리꽂는 높이, v 칸/초, big 연기 굵기 */
function gfxAirRocket(x1,y1,z1,x2,y2,z2,v,o){const T=V3.T;const d=Math.hypot(x2-x1,y2-y1,z2-z1)||1e-3;const dur=d/v*1000+(o.drop?220:0);const loft=o.loft||0;let lp=null,done=false;const sd=(Math.random()-.5)*(o.wob||0);
  const holder=new T.Object3D();V3.G.fx.add(holder);
  const pos=k=>{if(o.drop){const kd=Math.min(1,k*dur/220);if(kd<1)return [x1,y1-kd*kd*.06,z1,false];k=(k*dur-220)/(dur-220);}
    const s=Math.sin(k*Math.PI);return [x1+(x2-x1)*k+sd*s*.3,y1-(o.drop?.06:0)+(y2-y1+(o.drop?.06:0))*k+loft*s*(1-k*.3),z1+(z2-z1)*k-sd*s*.2,true];};
  V3.fx.push({o:holder,t0:performance.now()+(o.dl||0)*1000,dur,upd:(h,k)=>{const [x,y,z,burn]=pos(k);
      if(burn){pfx({x,y,z,life:.04,s0:.05*(o.big||1),s1:.03,k:PFXK.FLASH,col:'#ffe0a8',a:1,fi:.01,wind:0});
        if(!lp){lp=[x,y,z];pfx({x,y,z,life:.06,s0:.12,s1:.22,k:PFXK.FLASH,col:'#fff0d0',a:1,fi:.01,wind:0});for(let i=0;i<pfxN(4);i++)pfx({x,y,z,vx:gfxR(-.4,.4),vy:gfxR(-.3,.2),vz:gfxR(-.4,.4),drag:2.5,life:gfxR(2.5,4),s0:.05,s1:gfxR(.2,.3)*(o.big||1),col:'#dcd8cf',a:.5,fi:.03,wind:1});}
        const seg=Math.hypot(x-lp[0],y-lp[1],z-lp[2]);const n=Math.min(14,Math.ceil(seg/.05));
        for(let i=1;i<=n;i++){const t=i/n;pfx({x:lp[0]+(x-lp[0])*t,y:lp[1]+(y-lp[1])*t,z:lp[2]+(z-lp[2])*t,vx:gfxR(-.04,.04),vy:gfxR(-.02,.05),vz:gfxR(-.04,.04),drag:.7,acc:.008,life:gfxR(3,5.5)*(o.big||1),s0:.03,s1:gfxR(.14,.22)*(o.big||1),col:Math.random()<.5?'#e4e0d7':'#cfc9bd',a:.48,fi:.04,wind:1,dl:-(1-t)*.016});}
        lp=[x,y,z];}
      if(k>.97&&!done){done=true;o.hit&&o.hit();}}});
  setTimeout(()=>{if(!done){done=true;o.hit&&o.hit();}},dur+(o.dl||0)*1000+80);}
/* 땅·벽·차량에 떨어진 자리에 맞는 폭발 */
function gfxAirBoom(L,s,heat){if(!V3.on)return;if(heat||L.m==='metal'){gfxHeat(L.x,L.y,L.z,L.nx,L.ny,L.nz,s*1.2,L.m);if(L.m==='metal')gfxHit(L.x,L.y,L.z,'metal',L.nx,L.ny,L.nz,3,0,1);}
  if(L.ny<.5&&L.m!=='metal'){pfxBlast(L.x,L.y,L.z,s*.8,{ground:false,fire:.4,dust:gfxPick((GFXM[L.m]||GFXM.wall).c)});v3Debris(L.x+L.nx*.05,L.y,L.z+L.nz*.05,6,.6);}
  else if(L.m!=='metal'){gfxShellHit(L.x,L.y,L.z,s,L.m);dsScar('crater',L.x,L.z,.08*s);}
  V3.shake=Math.max(V3.shake||0,.05*s);if(typeof sndBoom==='function')sndBoom(L.x,L.z,.5*s);}
v3Rockets=function(a,d,shot){if(!PFX.on)pfxInit();const [hx,hy,hz]=v3P(a);let [x2,y2,z2]=v3P(d);sndLaunch(hx,hz,'rocket');
  const veh=d&&UT[d.type]&&UT[d.type].cls==='veh';const hits=shot?shot.hits||0:1;const side=(GFX.hs=(GFX.hs||1)*-1);
  const mp=(lx,ly,lz)=>gfxHeliPt(a,lx,ly,lz)||[hx,hy-.05,hz];
  if(veh){// 대전차 미사일 한 발
    const P=mp(1.25,1.18,side*2.3);const hit=hits>0;const L=gfxLand(P[0],P[1],P[2],x2,y2,z2,d,hit,null);
    gfxAirRocket(P[0],P[1],P[2],L.x,L.y,L.z,14,{drop:1,loft:.35,big:1.2,hit:()=>gfxAirBoom(L,1.3,true)});}
  else{// 로켓 두 발: 좌우 포드에서 번갈아
    for(let i=0;i<2;i++){const sg=i?-side:side;const P=mp(1.25,1.05,sg*1.4);const hit=hits>i;const L=gfxLand(P[0],P[1],P[2],x2,y2,z2,d,hit,null);
      L.x+=gfxR(-.15,.15);L.z+=gfxR(-.15,.15);
      gfxAirRocket(P[0],P[1],P[2],L.x,L.y,L.z,30,{dl:i*.16,wob:.4,hit:()=>gfxAirBoom(L,.6,false)});}}
  // 기수 기관포: 짧은 연사, 탄착이 표적 쪽으로 걸어 들어간다
  const G0=mp(6.4,.8,0);const n=5;let dx=x2-G0[0],dy=y2-G0[1],dz=z2-G0[2];const D=Math.hypot(dx,dy,dz)||1;dx/=D;dy/=D;dz/=D;const tc=gfxTrC(a);
  for(let i=0;i<n;i++){const dl=.3+i*.1;const walk=(1-i/(n-1))*.7;const hit=i>=n-2&&hits>0;const L=gfxLand(G0[0],G0[1],G0[2],x2-dx*walk,y2,z2-dz*walk,d,hit,null);const dd=Math.hypot(L.x-G0[0],L.y-G0[1],L.z-G0[2]);
    gfxMuzzle(G0[0],G0[1],G0[2],dx,dy,dz,.11,i%2?0:.1,dl,1);if(i%2===0)gfxTracer(G0[0],G0[1],G0[2],L.x,L.y,L.z,70,tc,.022,dl,.5);
    gfxHit(L.x,L.y,L.z,L.m,L.nx,L.ny,L.nz,2.2,dl+dd/70,gfxLod(L.x,L.z),1);}};
/* 연기 꼬리(대공 미사일·추락·플레어·전투기): 스프라이트 대신 입자 하나로 — 그리기 호출이 줄고 바람을 탄다 */
{const _tr=v3Trail;v3Trail=function(x,y,z,col,sz,dur){if(!PFX.on)return _tr.apply(this,arguments);sz=sz||.08;pfx({x,y,z,vx:gfxR(-.03,.03),vy:gfxR(.02,.08),vz:gfxR(-.03,.03),drag:.6,life:(dur||1600)/1000*1.3,s0:sz*.8,s1:sz*3.6,col:col||'#cfc8bb',a:.5,fi:.04,wind:1});};}
