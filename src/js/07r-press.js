/* ===================== 종군기자 카메라 =====================
   아군 부대 하나에 붙은 기자의 눈높이로 전장을 따라간다(1칸 ≈ 12m, 눈높이 ≈ 1.6m).
   - 기자는 부대가 지나온 길(05f u._tr)을 따라 뒤쪽 옆에 붙어 걷는다. 건물 안으로는 따라 들어가지 않고 밖에서 기다린다.
   - 가까이서 포탄이 터지면 몸을 낮추고 화면이 흔들린다.
   - 셔터를 누르면 그 순간을 높은 해상도로 한 번 더 그려 필름 사진으로 현상한다(흑백 또는 바랜 컬러, 입자, 주변부 감광).
   - 사진에는 시각·장소·상황 설명과 '보도 가치'(화면 안에서 벌어진 일의 크기)가 붙고, 사진첩에 남는다(이 기기에만 저장).
   조작: V 켜고 끄기 · Enter/X 셔터 · N 다음 대상 · B 흑백/컬러 · 휠/핀치 렌즈 · 끌기 시선 · Esc 나가기 */
const PR={on:false,film:'bw',mm:35,roll:36,left:36,reel:1,shots:[],ev:[],yaw:0,pitch:0,lyaw:0,lpitch:0,eye:.13,duck:0,
  rx:0,rz:0,ry:0,sub:null,lost:0,busy:false,reload:0,hudT:0,loaded:false};
const PR_KEY='triad-press-v1',PR_MAX=48;

/* ---------- 화면 안의 사건 기록(보도 가치 계산용) ---------- */
function prEv(x,z,w,k){if(!PR.on||x==null)return;const now=performance.now();PR.ev.push({t:now,x,z,w,k});if(PR.ev.length>80)PR.ev.splice(0,PR.ev.length-80);
  const d=Math.hypot(x-PR.rx,z-PR.rz);if(w>=3&&d<3.2){PR.duck=now+2200;if(typeof V3!=='undefined')V3.shake=Math.max(V3.shake||0,.05*(3.2-d)/3.2+.02);}}
{const W=(name,f)=>{const g=globalThis[name];if(typeof g!=='function')return;globalThis[name]=function(){try{f.apply(null,arguments);}catch(e){}return g.apply(this,arguments);};};
  W('v3FxFire',(a,r,c)=>{if(a)prEv(a.x,a.z,1,'fire');if(r!=null)prEv(c+.5,r+.5,.6,'hit');});
  W('v3FxKill',u=>{if(u)prEv(u.x,u.z,4,'kill');});
  W('v3FxCollapse',(r,c)=>prEv(c+.5,r+.5,6,'collapse'));
  W('v3FxStrike',(k,r,c)=>prEv(c+.5,r+.5,4,'strike'));
  W('v3FxBoom',(x,z)=>prEv(x,z,3,'boom'));
  W('v3FxBreach',(a,P)=>{if(P&&P.x!=null)prEv(P.x,P.z,3,'breach');});}

/* ---------- 따라갈 대상 ---------- */
/* 관전 중 전 세력 시야면 어느 세력이든 따라간다. 그 밖엔 보는 세력(없으면 아무) 지상 부대 */
const prAll=()=>typeof specOn==='function'&&specOn()&&UI.specVis==='all';
function prUnits(){if(!G)return[];if(prAll())return G.units.filter(u=>!UT[u.type].fly&&V3.uo.has(u.id));const n=G.viewer;const mine=G.units.filter(u=>u.nat===n&&!UT[u.type].fly&&V3.uo.has(u.id));return mine.length?mine:G.units.filter(u=>!UT[u.type].fly&&V3.uo.has(u.id));}
function prHeat(u){const now=performance.now();let s=u.tgt!=null?5:0;if(u.path&&u.path.length)s+=1;
  for(const e of PR.ev)if(now-e.t<5000&&Math.hypot(e.x-u.x,e.z-u.z)<4)s+=e.w*.5;
  if(UT[u.type].cls==='inf')s+=1;if(G.map[u.r][u.c].t==='bldg')s-=12;   // 기자는 거리에 남는다: 건물 안 부대는 덜 고른다
  return s;}
function prPick(next){const us=prUnits();if(!us.length){PR.sub=null;return null;}
  if(next&&PR.sub){const i=us.indexOf(PR.sub);PR.sub=us[(i+1)%us.length];}
  else{const fo=typeof specFollowed==='function'&&specOn()?specFollowed():null;const sel=fo&&us.includes(fo)?fo:UI.sel&&us.includes(UI.sel)?UI.sel:null;PR.sub=sel||us.slice().sort((a,b)=>prHeat(b)-prHeat(a))[0];}
  return PR.sub;}
function prSubPos(u){const o=V3.uo.get(u.id);if(!o)return [u.x,0,u.z];const S=(o.userData.sold||[]).filter(s=>s.m&&s.m.visible);
  if(!S.length)return [o.position.x,o.position.y,o.position.z];let x=0,z=0;for(const s of S){x+=s.wx;z+=s.wz;}return [x/S.length,o.position.y,z/S.length];}
const prWalk=(x,z)=>{const r=Math.floor(z),c=Math.floor(x);if(!inb(r,c))return false;const t=G.map[r][c].t;return t!=='bldg'&&t!=='water';};
// 벽에 코를 박지 않게: 사방 0.2칸(≈2.4m)이 비어 있어야 자리를 잡는다
const prOpen=(x,z)=>prWalk(x,z)&&prWalk(x+.2,z)&&prWalk(x-.2,z)&&prWalk(x,z+.2)&&prWalk(x,z-.2);
/* 두 점 사이에 건물이 없는지(끝 0.45칸은 문간일 수 있어 보지 않는다) */
function prClear(x1,z1,x2,z2){const d=Math.hypot(x2-x1,z2-z1),n=Math.ceil(d/.12);for(let i=1;i<n;i++){const k=i/n;if(d*(1-k)<.45)break;if(!prWalk(x1+(x2-x1)*k,z1+(z2-z1)*k))return false;}return true;}
/* 바깥 대상: 발자국 뒤쪽을 먼저 보고, 막혔으면 대상을 둘러싼 자리 중 대상이 보이고 뒤쪽이며 지금 자리에서 가까운 곳을 고른다 */
function prSpot(u,sx,sz,f,b,side){const fx=Math.cos(f),fz=Math.sin(f);let best=null,bs=-1e9;
  const C=[];for(const k of [1,-1,0])C.push([b.x-b.dz*side*k,b.z+b.dx*side*k,1.2]);
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;for(const r of [1.1,1.7])C.push([sx+Math.cos(a)*r,sz+Math.sin(a)*r,0]);}
  for(const [x,z,bon] of C){if(!prOpen(x,z)||!prClear(x,z,sx,sz))continue;const dx=x-sx,dz=z-sz,dl=Math.hypot(dx,dz)||1;
    const sc=bon-(dx*fx+dz*fz)/dl*1.4-Math.hypot(x-PR.rx,z-PR.rz)*.5;if(sc>bs){bs=sc;best=[x,z];}}
  return best;}
/* 건물 안 대상: 건물 옆 길가로 나가, 창가의 부대와 그들이 내다보는 거리를 같이 담는다 */
function prOutside(sx,sz,f){for(const da of [1.3,-1.3,.7,-.7,2,-2,0,Math.PI]){const a=f+da,cx=Math.cos(a),cz=Math.sin(a);
    for(let d=.4;d<=4;d+=.25){const x=sx+cx*d,z=sz+cz*d;if(prOpen(x,z)){for(const e of [1.1,.6,.3]){const x2=x+cx*e,z2=z+cz*e;if(prOpen(x2,z2)&&prClear(x2,z2,x,z))return [x2,z2];}return [x,z];}}}return null;}

/* ---------- 켜고 끄기 ---------- */
function prToggle(on){if(typeof V3==='undefined'||!V3.on||!G)return;on=on==null?!PR.on:on;if(on===PR.on)return;const s=V3.cs;
  if(on){if(V3.cine&&typeof v3Cine==='function')v3Cine();PR.bak={x:s.gx,z:s.gz,d:s.gd,pitch:s.pitch,yaw:s.gyaw};PR.on=true;PR.ev=[];
    const u=prPick(false);const p=u?prSubPos(u):[s.x,0,s.z];const f=u?(u.face||0)*Math.PI/180:0;
    PR.rx=p[0]-Math.cos(f)*1.2;PR.rz=p[2]-Math.sin(f)*1.2;if(!prOpen(PR.rx,PR.rz)){const o=prOutside(p[0],p[2],f);PR.rx=o?o[0]:p[0];PR.rz=o?o[1]:p[2];}PR.ry=0;PR.yaw=f;PR.pitch=0;PR.lyaw=PR.lpitch=0;
    V3.cam.near=.02;V3.cam.far=48;V3.cam.updateProjectionMatrix();prLoad();}
  else{PR.on=false;const b=PR.bak;if(b){s.gx=b.x;s.gz=b.z;s.gd=b.d;s.pitch=b.pitch;s.gyaw=b.yaw;}V3.cam.near=.1;V3.cam.far=400;if(typeof v3Size==='function')v3Size();prGal(false);}
  V3.press=PR.on;V3.cutTag=null;const app=$('#app');if(app)app.classList.toggle('press',PR.on);const pb=$('#b-press');if(pb)pb.setAttribute('aria-pressed',PR.on?'true':'false');
  const el=$('#press');if(el)el.hidden=!PR.on;prLens(0);prHud(true);if(typeof render==='function')render();}
function prLens(d){PR.mm=Math.max(24,Math.min(85,Math.round(PR.mm*(d>0?1.18:d<0?1/1.18:1))));if(!PR.on||!V3.cam)return;
  // 35mm 필름(36×24) 기준 세로 화각. 세로 화면은 카메라를 세워 든 것처럼 긴 변(36mm)을 세로로 쓴다.
  const a=V3.cam.aspect||1;V3.cam.fov=2*Math.atan((a<1?18:12)/PR.mm)*180/Math.PI;V3.cam.updateProjectionMatrix();}

/* ---------- 매 프레임: 기자 시점 (v3Frame이 카메라를 놓은 뒤 부른다) ---------- */
function prFrame(now,rdt){if(!G){prToggle(false);return;}const dt=Math.min(.1,rdt||.016);let u=PR.sub;
  if(!u||!G.units.includes(u)||!V3.uo.has(u.id)){if(!PR.lost)PR.lost=now;if(now-PR.lost>1200){PR.lost=0;const was=!!u;u=prPick(false);if(was&&typeof toast==='function')toast(u?`대상을 잃었습니다 · ${UT[u.type].n}에 합류`:'따라갈 부대가 없습니다');}}
  else PR.lost=0;
  let lx,ly,lz;
  if(u&&V3.uo.has(u.id)){const [sx,sy,sz]=prSubPos(u);
    // 기자 자리: 부대가 지나온 길에서 조금 뒤, 옆으로 비켜서
    let b;const f=(u.face||0)*Math.PI/180;const back=UT[u.type].cls==='inf'?1.3:1.6;
    if(u._tr&&u._tr.length>1&&typeof menTrailAt==='function'){const p=menTrailAt(u,back);b={x:p.x,z:p.z,dx:p.dx,dz:p.dz};}else b={x:sx-Math.cos(f)*back,z:sz-Math.sin(f)*back,dx:Math.cos(f),dz:Math.sin(f)};
    const side=.32;let tx=null,tz=null;const inB=G.map[u.r][u.c].t==='bldg';
    if(inB){const o=prOutside(sx,sz,f);if(o){tx=o[0];tz=o[1];}}
    else if(now>(PR.spotT||0)||PR.spotU!==u){PR.spotT=now+400;PR.spotU=u;PR.spot=prSpot(u,sx,sz,f,b,side);}
    if(!inB&&PR.spot){tx=PR.spot[0];tz=PR.spot[1];}
    if(tx!=null){const dx=tx-PR.rx,dz=tz-PR.rz,d=Math.hypot(dx,dz);const k=1-Math.exp(-dt*1.8);let m=d*k;m=Math.min(m,1.4*dt);   // 뛰어도 초속 17m를 넘지 않는다
      if(d>4){PR.rx=tx;PR.rz=tz;}else if(d>1e-4){const nx=PR.rx+dx/d*m,nz=PR.rz+dz/d*m;if(prWalk(nx,nz)){PR.rx=nx;PR.rz=nz;PR.blk=0;}else if((PR.blk=(PR.blk||0)+dt)>1.2){PR.rx=tx;PR.rz=tz;PR.blk=0;}}}   // 모퉁이에 막히면 잠깐 뒤 건너뛴다
    // 시선: 대상, 교전 중이면 대상과 적 사이
    lx=sx;ly=sy+.09;lz=sz;if(u.tgt!=null){const e=G.units.find(z=>z.id===u.tgt);const eo=e&&V3.uo.get(e.id);if(eo&&eo.visible){lx=sx+(eo.position.x-sx)*.42;lz=sz+(eo.position.z-sz)*.42;ly=sy+.09+(eo.position.y-sy)*.3;}}
    else if(inB){lx=sx+Math.cos(f)*.6;lz=sz+Math.sin(f)*.6;ly=Math.min(sy,.35)+.09;}   // 건물 안 대상: 부대가 든 건물과 그 앞을 함께 담는다
    else if(Math.hypot(sx-PR.rx,sz-PR.rz)<.35){lx=sx+Math.cos(f)*1.5;lz=sz+Math.sin(f)*1.5;}}
  else{lx=PR.rx+Math.cos(PR.yaw);lz=PR.rz+Math.sin(PR.yaw);ly=.13;}
  const r=Math.floor(PR.rz),c=Math.floor(PR.rx);const gy=inb(r,c)&&typeof v3G==='function'?v3G(r,c):0;PR.ry+=(gy-PR.ry)*Math.min(1,dt*6);
  const eyeT=now<PR.duck?.075:.13;PR.eye+=(eyeT-PR.eye)*Math.min(1,dt*(eyeT<PR.eye?9:2));
  const ex=PR.rx,ey=PR.ry+PR.eye,ez=PR.rz;
  const ty=Math.atan2(lz-ez,lx-ex),tp=Math.max(-.45,Math.min(.28,Math.atan2(ly-ey,Math.max(.05,Math.hypot(lx-ex,lz-ez)))));   // 위층 대상도 하늘만 찍지 않게
  let dy=ty-PR.yaw;while(dy>Math.PI)dy-=2*Math.PI;while(dy<-Math.PI)dy+=2*Math.PI;const kk=1-Math.exp(-dt*2.6);PR.yaw+=dy*kk;PR.pitch+=(tp-PR.pitch)*kk;
  if(!PR.drag&&now-(PR.dragT||0)>2500){PR.lyaw*=Math.exp(-dt*.8);PR.lpitch*=Math.exp(-dt*.8);}
  // 손으로 든 카메라: 숨쉬기, 걸음, 폭발 충격
  const tt=now/1000,sh=V3.shake||0;const bob=Math.sin(tt*1.3)*.004+Math.sin(tt*2.9)*.0025;
  const yaw=PR.yaw+PR.lyaw+Math.sin(tt*.7)*.006+(Math.random()-.5)*sh*.5,pit=Math.max(-1.2,Math.min(1.2,PR.pitch+PR.lpitch+bob+(Math.random()-.5)*sh*.4));
  const cam=V3.cam;cam.position.set(ex+(Math.random()-.5)*sh*.1,ey+(Math.random()-.5)*sh*.05,ez+(Math.random()-.5)*sh*.1);
  const cp=Math.cos(pit);cam.lookAt(ex+Math.cos(yaw)*cp,ey+Math.sin(pit),ez+Math.sin(yaw)*cp);cam.rotateZ(Math.sin(tt*.9)*.006+(Math.random()-.5)*sh*.3);
  // 그림자·비·먼지는 기자 주변을 기준으로, 안개는 땅 높이에 맞게
  const s=V3.cs;s.gx=s.x=ex+Math.cos(yaw)*4;s.gz=s.z=ez+Math.sin(yaw)*4;s.gd=s.d=14;
  const fk=V3.fogK||1;V3.scene.fog.near=3.5*fk;V3.scene.fog.far=30*fk;
  if(now-PR.hudT>250)prHud(false);}

/* ---------- 뷰파인더 표시 ---------- */
const PR_SH=['1/1000','1/500','1/250','1/125'],PR_F=['f/4','f/5.6','f/8','f/11'];
function prHud(force){PR.hudT=performance.now();const el=$('#press');if(!el||!PR.on)return;const u=PR.sub;
  const wx=G&&WX[G.wx];const dim=wx&&/밤|야간|안개|비/.test(wx.n)?1:0;const i=Math.max(0,Math.min(3,2-dim+(PR.mm>60?-1:0)));
  const ro=$('#pr-read');if(ro)ro.innerHTML=`<span>${PR_SH[i]}</span><span>${PR_F[3-i]}</span><span>ISO 400</span><span>${PR.mm}mm</span><span class="pr-film">${PR.film==='bw'?'흑백':'컬러'}</span><b>${PR.reload>performance.now()?'필름 감는 중':`${PR.roll-PR.left+1}/${PR.roll}`}</b>`;
  const sb=$('#pr-sub');if(sb)sb.textContent=u&&G.units.includes(u)?`${natName(u.nat)} ${UT[u.type].n}와 동행${u.tgt!=null?' · 교전 중':u.path&&u.path.length?' · 이동 중':''}`:'대상 없음';
  const n=$('#pr-n');if(n)n.textContent=PR.shots.length?String(PR.shots.length):'';
  const fb=$('#pr-film');if(fb)fb.setAttribute('aria-pressed',PR.film==='bw'?'true':'false');
  const sh=$('#pr-shut');if(sh)sh.disabled=PR.busy||PR.reload>performance.now();
  if(force){const g=$('#press-gal');if(g&&!g.hidden)prGalRender();}}

/* ---------- 셔터 ---------- */
function prShoot(){if(!PR.on||PR.busy)return;const now=performance.now();if(PR.reload>now)return;PR.busy=true;
  try{const ren=V3.ren,cv=V3.cv;const w=cv.clientWidth,h=cv.clientHeight;const pr0=ren.getPixelRatio();
    const hi=Math.max(pr0,Math.min(2,window.devicePixelRatio||1,1500/Math.max(w,h)));
    ren.setPixelRatio(hi);ren.setSize(w,h,false);ren.render(V3.scene,V3.cam);
    const W=cv.width,H=cv.height;const land=W>=H;let cw,ch;if(land){cw=W;ch=Math.round(W/1.5);if(ch>H){ch=H;cw=Math.round(H*1.5);}}else{ch=H;cw=Math.round(H/1.5);if(cw>W){cw=W;ch=Math.round(W*1.5);}}
    const L=Math.min(1200,Math.max(cw,ch)),sc=L/Math.max(cw,ch),ow=Math.round(cw*sc),oh=Math.round(ch*sc);
    const out=document.createElement('canvas');out.width=ow;out.height=oh;const g=out.getContext('2d');g.drawImage(cv,(W-cw)/2,(H-ch)/2,cw,ch,0,0,ow,oh);
    ren.setPixelRatio(pr0);ren.setSize(w,h,false);
    prDevelop(g,ow,oh,PR.film);
    const url=out.toDataURL('image/jpeg',.8);const meta=prJudge();
    const shot={id:Date.now().toString(36)+Math.floor(Math.random()*1e4),url,pt:oh>ow?1:0,film:PR.film,mm:PR.mm,reel:PR.reel,fr:PR.roll-PR.left+1,...meta};
    PR.shots.push(shot);if(PR.shots.length>PR_MAX)PR.shots.splice(0,PR.shots.length-PR_MAX);prSave();
    PR.left--;if(PR.left<=0){PR.left=PR.roll;PR.reel++;PR.reload=now+3500;if(typeof toast==='function')toast('필름 한 롤을 다 썼습니다 · 새 필름을 감는 중');}
    prShutterFx(shot);}
  catch(e){if(typeof toast==='function')toast('사진을 찍지 못했습니다. 다시 눌러 보세요');}
  finally{PR.busy=false;prHud(true);}}
function prShutterFx(shot){if(typeof sfx==='function')sfx('shutter');const f=$('#press-still');if(!f)return;
  f.querySelector('img').src=shot.url;f.querySelector('figcaption').textContent=shot.cap;f.hidden=false;f.classList.remove('out');void f.offsetWidth;
  clearTimeout(prShutterFx.t);clearTimeout(prShutterFx.t2);prShutterFx.t=setTimeout(()=>{f.classList.add('out');prShutterFx.t2=setTimeout(()=>{f.hidden=true;f.classList.remove('out');},380);},1100);}

/* 필름 현상: 흑백(진한 대비, 따뜻한 인화지) 또는 바랜 컬러(채도↓, 검정 들뜸, 어두운 곳 청록·밝은 곳 노랑). 입자와 주변부 감광 */
function prDevelop(g,w,h,film){const im=g.getImageData(0,0,w,h),d=im.data;let seed=(Math.random()*4294967296)>>>0;
  const rnd=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
  const cx=w/2,cy=h/2,R=Math.hypot(cx,cy),bw=film==='bw';const gr=bw?34:24;
  for(let y=0,i=0;y<h;y++){const dy=(y-cy)/R;for(let x=0;x<w;x++,i+=4){const dx=(x-cx)/R;const rr=(dx*dx+dy*dy)*1.7;const vg=1-.26*rr*rr-.08*rr;
      let r=d[i]/255,gg=d[i+1]/255,b=d[i+2]/255;const l=.3*r+.59*gg+.11*b;const n=(rnd()+rnd()-1)*gr/255*(1-Math.abs(l-.45)*1.1);
      if(bw){let y2=Math.pow(l,.78);y2=y2+(y2*y2*(3-2*y2)-y2)*.85;y2=Math.max(0,Math.min(1,(y2-.03)*1.1));y2=Math.max(0,y2*vg+n);r=y2*1.03;gg=y2;b=y2*.93;}
      else{const s=.5;r=l+(r-l)*s;gg=l+(gg-l)*s;b=l+(b-l)*s;const t=l;r+=t>.55?.035:-.01;gg+=t>.55?.012:.012;b+=t>.55?-.04:.022;
        r=.07+r*.86;gg=.07+gg*.86;b=.075+b*.84;r=r*vg+n;gg=gg*vg+n;b=b*vg+n;}
      d[i]=r*255;d[i+1]=gg*255;d[i+2]=b*255;}}
  g.putImageData(im,0,0);
  if(!bw&&Math.random()<.6){const lx=Math.random()<.5?0:w,ly=h*(.2+Math.random()*.6);const lg=g.createRadialGradient(lx,ly,0,lx,ly,w*.45);lg.addColorStop(0,'rgba(255,120,40,.28)');lg.addColorStop(1,'rgba(255,120,40,0)');g.globalCompositeOperation='screen';g.fillStyle=lg;g.fillRect(0,0,w,h);g.globalCompositeOperation='source-over';}
  if(Math.random()<.5){g.fillStyle=bw?'rgba(255,255,255,.35)':'rgba(255,240,220,.3)';for(let k=0;k<6;k++){g.fillRect(rnd()*w,rnd()*h,1,1+rnd()*3);}}}   // 먼지 티

/* 사진 설명과 보도 가치: 시선 앞 ±35°, 12칸 안에서 최근 4초 동안 일어난 일 */
function prJudge(){const now=performance.now(),cam=V3.cam;const fx=Math.cos(PR.yaw+PR.lyaw),fz=Math.sin(PR.yaw+PR.lyaw);const ex=cam.position.x,ez=cam.position.z;
  const inView=(x,z,far)=>{const dx=x-ex,dz=z-ez,d=Math.hypot(dx,dz);if(d>far)return 0;if(d<.2)return 1;return (dx*fx+dz*fz)/d>Math.cos(35*Math.PI/180)?1:0;};
  let sc=0;const kinds={};for(const e of PR.ev){if(now-e.t>4000||!inView(e.x,e.z,12))continue;const near=Math.hypot(e.x-ex,e.z-ez);const w=e.w*(near<2?1.6:near<5?1.2:.8);sc+=w;kinds[e.k]=(kinds[e.k]||0)+w;}
  let hurt=0,foes=0;for(const u of G.units){const o=V3.uo.get(u.id);if(!o||!o.visible||!inView(u.x,u.z,10))continue;if(u.nat!==(PR.sub?PR.sub.nat:G.viewer))foes++;if(u.ws)for(const w of u.ws)if(w.s==='lw'||w.s==='hw'||w.s==='evac')hurt++;}
  sc+=hurt*2+foes*1.5;let burn=0;if(G.fires)for(const k of G.fires){if(inView(kc(k)+.5,kr(k)+.5,10))burn++;}sc+=Math.min(4,burn);
  const u=PR.sub&&G.units.includes(PR.sub)?PR.sub:null;if(u&&Math.hypot(u.x-ex,u.z-ez)<1.6)sc*=1.25;
  const stars=Math.max(1,Math.min(5,Math.ceil(sc/5)));
  const what=kinds.collapse?'무너지는 건물':kinds.strike?'화력 지원이 떨어진 직후':kinds.kill>=4?'격파된 적':kinds.boom||kinds.breach?'포격 속에서':hurt?'부상자를 돌보는':kinds.fire>2||(u&&u.tgt!=null)?'교전 중인':foes?'적과 마주한':burn?'불타는 거리의':u&&u.path&&u.path.length?'이동 중인':u&&G.map[u.r][u.c].t==='bldg'?'건물을 지키는':'숨을 고르는';
  const who=u?`${natName(u.nat)} ${UT[u.type].n}`:'시가지';
  let place='';let bd=1e9;for(const o of G.objs){const d=Math.hypot(o.c+.5-ex,o.r+.5-ez);if(d<bd){bd=d;place=o.name;}}
  place=bd<7?`${place} 부근`:`${String.fromCharCode(65+Math.floor(ex/4)%26)}-${Math.floor(ez/4)+1} 구역`;
  const tm=typeof fmtT==='function'?fmtT(G.time||0):'';
  return {cap:`${place} · ${what} ${who}`,t:tm,stars,score:Math.round(sc),place};}

/* ---------- 사진첩 ---------- */
function prLoad(){if(PR.loaded)return;PR.loaded=true;try{const a=JSON.parse(localStorage.getItem(PR_KEY)||'null');if(a&&Array.isArray(a.s)){PR.shots=a.s.concat(PR.shots).slice(-PR_MAX);PR.reel=Math.max(PR.reel,a.reel||1)+ (a.s.length?1:0);}}catch(e){}}
function prSave(){let s=PR.shots.slice();for(let i=0;i<40&&s.length;i++){try{localStorage.setItem(PR_KEY,JSON.stringify({reel:PR.reel,s}));return;}catch(e){s=s.slice(Math.max(1,Math.floor(s.length/4)));}}try{localStorage.removeItem(PR_KEY);}catch(e){}}
function prGal(open){const g=$('#press-gal');if(!g)return;if(open)prLoad();g.hidden=!open;if(open){prGalRender();const b=g.querySelector('[data-act="pr-gal-close"]');if(b)b.focus();}else prView(null);}
const prStars=n=>'★'.repeat(n)+'☆'.repeat(5-n);
function prGalRender(){const g=$('#press-gal');if(!g)return;const L=$('#pr-sheet');const tot=PR.shots.reduce((a,s)=>a+s.stars,0);
  $('#pr-gal-sum').textContent=PR.shots.length?`${PR.shots.length}장 · 보도 가치 합계 ${tot}`:'';
  if(!PR.shots.length){L.innerHTML=`<p class="pr-empty">아직 찍은 사진이 없습니다. 기자 카메라를 켜고 셔터를 눌러 보세요.</p>`;return;}
  L.innerHTML=PR.shots.slice().reverse().map(s=>`<button class="pr-fr" data-act="pr-view:${s.id}" aria-label="${s.cap} 사진 크게 보기"><span class="pr-edge">TRIAD ${s.film==='bw'?'400TX':'C200'} <b>${s.fr}A</b></span><img src="${s.url}" alt="" loading="lazy"${s.pt?' class="pt"':''}><span class="pr-st">${prStars(s.stars)}</span></button>`).join('');}
function prView(id){const v=$('#pr-view');if(!v)return;const s=id&&PR.shots.find(x=>x.id===id);if(!s){v.hidden=true;PR.viewId=null;return;}PR.viewId=id;v.hidden=false;
  v.querySelector('img').src=s.url;$('#pr-cap').textContent=s.cap;$('#pr-meta').textContent=`${s.t?`작전 ${s.t} · `:''}${s.mm}mm · ${s.film==='bw'?'흑백':'컬러'} 필름 · 롤 ${s.reel} #${s.fr} · 보도 가치 ${prStars(s.stars)}`;
  const a=$('#pr-dl');a.href=s.url;a.download=`triad-${s.reel}-${s.fr}.jpg`;}
function prDel(){const id=PR.viewId;if(!id)return;PR.shots=PR.shots.filter(s=>s.id!==id);prSave();prView(null);prGalRender();prHud(false);}

/* ---------- 입력 ---------- */
if(typeof document!=='undefined'){
  document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;
    if(a==='press'){prToggle();return;}if(!a.startsWith('pr-'))return;
    if(a==='pr-shut')prShoot();else if(a==='pr-next'){prPick(true);prHud(false);}else if(a==='pr-film'){PR.film=PR.film==='bw'?'color':'bw';prHud(false);}
    else if(a==='pr-in')prLens(1);else if(a==='pr-out')prLens(-1);else if(a==='pr-exit')prToggle(false);else if(a==='pr-gal')prGal(true);else if(a==='pr-gal-close')prGal(false);
    else if(a.startsWith('pr-view:'))prView(a.slice(8));else if(a==='pr-view-close')prView(null);else if(a==='pr-del')prDel();
    if(a==='pr-in'||a==='pr-out')prHud(false);});
  // 기자 시점에서는 지도 조작 대신: 끌면 시선, 휠·핀치는 렌즈, 아군을 탭하면 그 부대로 옮긴다
  const P=new Map();let st=null,pin=0;
  const own=e=>PR.on&&e.target&&e.target.id==='v3d';
  window.addEventListener('pointerdown',e=>{if(!own(e))return;e.stopPropagation();try{e.target.setPointerCapture(e.pointerId);}catch(_){}P.set(e.pointerId,[e.clientX,e.clientY]);
    if(P.size===1){st={x:e.clientX,y:e.clientY,t:performance.now(),m:0};PR.drag=true;}else{st=null;const [a,b]=[...P.values()];pin=Math.hypot(a[0]-b[0],a[1]-b[1]);}},true);
  window.addEventListener('pointermove',e=>{if(!PR.on||!P.has(e.pointerId))return;e.stopPropagation();const q=P.get(e.pointerId);const dx=e.clientX-q[0],dy=e.clientY-q[1];P.set(e.pointerId,[e.clientX,e.clientY]);
    if(P.size===1){const k=(V3.cam.fov*Math.PI/180)/Math.max(200,V3.cv.clientHeight);PR.lyaw+=dx*k;PR.lpitch=Math.max(-.9,Math.min(.9,PR.lpitch-dy*k));PR.dragT=performance.now();if(st)st.m+=Math.abs(dx)+Math.abs(dy);}
    else if(P.size===2){const [a,b]=[...P.values()];const dd=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pin&&Math.abs(dd-pin)>24){prLens(dd>pin?1:-1);pin=dd;prHud(false);}}},true);
  const up=e=>{if(!P.has(e.pointerId))return;e.stopPropagation();P.delete(e.pointerId);if(P.size===0){PR.drag=false;
      if(st&&st.m<8&&performance.now()-st.t<600&&typeof v3Pick==='function'){v3Pick(e.clientX,e.clientY);const id=V3.pickId;const u=id!=null&&G?G.units.find(z=>z.id===id):null;
        if(u&&prUnits().includes(u)){PR.sub=u;prHud(false);if(typeof toast==='function')toast(`${UT[u.type].n}와 동행합니다`);}}st=null;}};
  window.addEventListener('pointerup',up,true);window.addEventListener('pointercancel',up,true);
  window.addEventListener('wheel',e=>{if(!own(e))return;e.preventDefault();e.stopPropagation();prLens(e.deltaY<0?1:-1);prHud(false);},{capture:true,passive:false});
  window.addEventListener('keydown',e=>{if(e.target.closest&&e.target.closest('input,select,textarea'))return;const k=e.key.toLowerCase();
    if(k==='v'&&!e.ctrlKey&&!e.metaKey){if(typeof V3!=='undefined'&&V3.on&&G){e.preventDefault();e.stopImmediatePropagation();prToggle();}return;}
    if(!PR.on)return;const gal=$('#press-gal');
    if(k==='escape'){e.preventDefault();e.stopImmediatePropagation();if(PR.viewId)prView(null);else if(gal&&!gal.hidden)prGal(false);else prToggle(false);return;}
    if(gal&&!gal.hidden)return;
    const map={enter:prShoot,x:prShoot,n:()=>{prPick(true);prHud(false);},b:()=>{PR.film=PR.film==='bw'?'color':'bw';prHud(false);},g:()=>prGal(true),'+':()=>{prLens(1);prHud(false);},'=':()=>{prLens(1);prHud(false);},'-':()=>{prLens(-1);prHud(false);}};
    // 기자 시점에서 지도용 키(WASD, Q/E, R/F, C)는 막는다. 스페이스(일시정지)는 그대로 둔다.
    if(map[k]){e.preventDefault();e.stopImmediatePropagation();map[k]();return;}
    if('wasdqerfc'.includes(k)&&k.length===1||k.startsWith('arrow'))e.stopImmediatePropagation();},true);
  window.addEventListener('resize',()=>{if(PR.on)setTimeout(()=>prLens(0),60);});
}
