/* ===================== 전투기 폭격 연출 =====================
   05f-strike의 순서(진입 → 투하 → 낙하 → 탄착)를 그린다. 시간은 게임 시간(G.time)으로 재서 배속·일시정지를 따른다.
   - 두 대 편대(윙맨은 폭탄을 안 놓음)가 비스듬히 내려오며 들어오고, 투하 뒤 급상승하며 옆으로 선회해 빠진다.
     선회할 때 날개 끝에 하얀 수증기 꼬리, 꼬리에 엔진 불빛.
   - 폭탄은 비행 방향으로 날아가며 떨어진다(앞으로 나가면서 고개를 숙임). 떨어지는 동안 휘파람 소리.
   - 제트 소리는 다가올 때 높고 멀어질 때 낮아진다(도플러). 투하 뒤 급상승 굉음.
   - 부른 쪽 화면에는 목표에 붉은 조준 괄호. 대공이 쏘면 플레어를 뿌린다.
   - 탄착 폭발은 07x-air의 v3Bomb(→ 07b 연기·먼지 함수)을 그대로 쓰고, 카메라 흔들림만 거리에 따라 키운다.
   - 관전 자동 연출이면 카메라가 탄착 지점으로 가서 폭발이 끝날 때까지 머문다. */
const JETF={V:9,Hr:3.2,dive:1.1,climb:1.8,om:.8,bank:1.05,straight:1.3,life:6};
// 게임 시각 t에서 편대장기의 자리·자세. τ=t-탄착 시각. 투하 전엔 직선 강하, 투하 뒤엔 목표 위를 지나며 상승한 다음 옆으로 선회.
function jetPose(j,t){const tau=t-j.imp,tr=j.rel-j.imp,x0=j.c+.5,z0=j.r+.5,V=JETF.V,h0=Math.atan2(j.hz,j.hx);
  if(tau<=tr){const y=JETF.Hr+(tr-tau)*JETF.dive;return {x:x0+j.hx*V*tau,z:z0+j.hz*V*tau,y,yaw:h0,pitch:-Math.atan2(JETF.dive,V),roll:0,s:-1};}
  const s=tau-tr,s1=Math.min(s,JETF.straight),s2=Math.max(0,s-JETF.straight),sg=j.turn||1,w=JETF.om*sg;
  let x=x0+j.hx*V*tr+j.hx*V*s1,z=z0+j.hz*V*tr+j.hz*V*s1;const th=h0+w*s2;
  x+=V/w*(Math.sin(th)-Math.sin(h0));z+=-V/w*(Math.cos(th)-Math.cos(h0));
  const ramp=Math.min(1,s/.5),y=JETF.Hr+JETF.climb*(s-.25*(1-Math.exp(-s/.25)));
  return {x,z,y,yaw:th,pitch:Math.atan2(JETF.climb*ramp,V)*1.4,roll:sg*JETF.bank*Math.min(1,s2/.6),s};}
function jetPlace(o,p){o.position.set(p.x,p.y,p.z);o.rotation.set(p.roll,-p.yaw,p.pitch,'YZX');}
function v3JetGlow(){const T=V3.T;const s=new T.Sprite(new T.SpriteMaterial({map:V3.puff,color:'#ffb060',blending:T.AdditiveBlending,transparent:true,depthWrite:false,opacity:.5}));s.position.set(-.62,0,0);s.scale.setScalar(.14);s.userData.keepMat=1;return s;}
function v3JetDispose(g){g.traverse(m=>{if(m.isMesh&&m.geometry)m.geometry.dispose();if(m.isSprite&&m.material)m.material.dispose();});}
// 터치 기기(대개 휴대폰)는 수증기 꼬리를 절반만 뿌린다
const JET_VAP_MS=(typeof matchMedia==='function'&&matchMedia('(pointer:coarse)').matches)?90:45;
function v3StrikeJet(j){if(!V3.on)return;const T=V3.T;V3.jets=V3.jets||new Map();
  const lead=v3JetModel(),wing=v3JetModel();const gl=v3JetGlow(),gw=v3JetGlow();lead.add(gl);wing.add(gw);V3.G.fx.add(lead);V3.G.fx.add(wing);
  const k='jet'+j.id;if(SFX.ctx){SFX.track.push({o:lead,kind:'jet',k});}
  const tip=new T.Vector3();let lastV=0,lastE=0,roar=false,lastD=null,lastT=null;V3.jets.set(j.id,lead);
  const end=()=>{V3.jets.delete(j.id);for(const g of [lead,wing]){V3.G.fx.remove(g);v3JetDispose(g);}};
  V3.fx.push({o:new T.Object3D(),t0:performance.now(),dur:1e9,upd:()=>{const t=G.time||0;
      if(j.down&&t>j.rel){// 격추: 떨어진 곳으로 곤두박질(윙맨은 그대로 빠져나간다)
        const k2=Math.min(1,(t-j.rel)/1.6);const p0=jetPose(j,j.rel);const [cx,cz]=j.down;const gy=v3TopAt(cx,cz);
        lead.position.set(p0.x+(cx-p0.x)*k2,p0.y-(p0.y-gy)*k2*k2,p0.z+(cz-p0.z)*k2);lead.rotation.x+=.14;gl.visible=false;
        const now=performance.now();if(now-lastV>40){lastV=now;v3Trail(lead.position.x,lead.position.y,lead.position.z,'#2f2c28',.18,3000);if(Math.random()<.6)v3Burst(lead.position.x,lead.position.y,lead.position.z,.4,'#ff7a2a',0,0);}
        if(k2>=1)lead.visible=false;}
      else{const p=jetPose(j,t);jetPlace(lead,p);
        // 선회 중: 날개 끝 수증기, 엔진 불빛이 밝아진다
        const pull=p.s>=0&&p.s<3;gl.material.opacity=pull?.95:.45;gl.scale.setScalar(pull?.22:.13);
        const now=performance.now();if(pull&&now-lastV>JET_VAP_MS&&t-lastE>.03){lastV=now;lastE=t;for(const zz of [.55,-.55]){tip.set(-.38,.01,zz);lead.localToWorld(tip);v3Trail(tip.x,tip.y,tip.z,'#eef0f0',.025,700);}}
        if(p.s>=0&&!roar){roar=true;v3JetRoar(p.x,p.z,p.y);}
        // 도플러: 귀(카메라)와의 거리가 줄면 높게, 늘면 낮게
        if(SFX.ctx&&SFX.loops){const e=sndEar();const D=Math.hypot(p.x-e.x,p.z-e.z,p.y-e.h);if(lastD!=null&&t>lastT){const vr=(D-lastD)/(t-lastT)*SND_M;const f=Math.min(1.4,Math.max(.72,SND_C/(SND_C+vr)));
            const Lp=SFX.loops.get(k);if(Lp){const at=SFX.ctx.currentTime;for(const s of Lp.src){if(s.playbackRate)s.playbackRate.setTargetAtTime(f,at,.08);else if(s.frequency){if(s._b==null)s._b=s.frequency.value;s.frequency.setTargetAtTime(s._b*f,at,.08);}}}}
          if(t!==lastT){lastD=D;lastT=t;}}}
      // 윙맨: 0.25초 뒤, 옆으로 1칸 비켜 따라온다
      const q=jetPose(j,t-.25);const ox=-Math.sin(q.yaw)*(j.turn||1)*-1,oz=Math.cos(q.yaw)*(j.turn||1)*-1;q.x+=ox*1.1;q.z+=oz*1.1;q.y+=.35;jetPlace(wing,q);
      const far=(o)=>o.position.x<-N*.6||o.position.x>N*1.6||o.position.z<-N*.6||o.position.z>N*1.6;
      if(t-j.imp>JETF.life||(far(lead)||!lead.visible)&&far(wing)&&t>j.imp){end();return false;}}});}
// 투하 직후 급상승: 낮게 깔리는 굉음
function v3JetRoar(x,z,y){const V=sndVoice(x,z,{vol:1.5,dur:3.5,wet:1.2,y});if(!V)return;sndNz(V,V.t,2.8,'lowpass',900,.5,.9,.35,260);sndNz(V,V.t+.1,1.6,'bandpass',2600,.8,.25,.2,1200);sndTn(V,V.t,2.4,90,55,.25,'sawtooth',.3);}
/* ---------- 폭탄: 비행 방향으로 날아가며 떨어진다 ---------- */
function v3BombModel(){const T=V3.T;if(!V3.bombG){const b=new T.CylinderGeometry(.03,.03,.2,8);b.rotateZ(Math.PI/2);const n=new T.ConeGeometry(.03,.07,8);n.rotateZ(-Math.PI/2);n.translate(.135,0,0);
    const f=new T.BoxGeometry(.05,.07,.006);f.translate(-.1,0,0);const f2=f.clone();f2.rotateX(Math.PI/2);V3.bombG=[b,n,f,f2];V3.bombM=new T.MeshStandardMaterial({color:'#4b4d42',roughness:.7,metalness:.3});}
  const g=new T.Group();for(const geo of V3.bombG){const m=new T.Mesh(geo,V3.bombM);m.castShadow=true;g.add(m);}g.userData.keepGeo=1;return g;}
function v3StrikeRelease(j){if(!V3.on)return;const p0=jetPose(j,j.rel),fall=Math.max(.2,j.imp-j.rel);
  if(typeof sndWhistle==='function')sndWhistle(j.c+.5,j.r+.5,fall/Math.max(.25,G.spd||1));
  if(j.n===G.viewer&&!isAI(j.n)&&typeof sndRadio==='function')sndRadio('support');
  // 세 발이 줄지어 떨어진다(05f-strike의 G.bombs와 같은 자리·시각)
  const list=(G.bombs||[]).filter(b=>b.id===j.id);if(!list.length)list.push({x:j.c+.5,z:j.r+.5,t:j.imp});
  list.forEach((bb,i)=>{const x0=bb.x??bb.c+.5,z0=bb.z??bb.r+.5,gy=v3TopAt(x0,z0),fl=Math.max(.2,bb.t-j.rel);const lag=(i-1)*.12;
    const sx=p0.x+j.hx*lag,sz=p0.z+j.hz*lag;
    const b=v3BombModel();b.rotation.order='YZX';b.scale.setScalar(1.4);b.rotation.y=-Math.atan2(j.hz,j.hx);V3.G.fx.add(b);
    V3.fx.push({o:b,t0:performance.now(),dur:1e9,upd:(o)=>{const t=G.time||0;const k=Math.min(1,Math.max(0,(t-j.rel)/fl));
        o.position.set(sx+(x0-sx)*k,p0.y-(p0.y-gy)*k*k,sz+(z0-sz)*k);o.rotation.z=-Math.atan2(2*k*(p0.y-gy),Math.hypot(x0-sx,z0-sz));
        if(k>=1)return false;}});});}
/* ---------- 부른 쪽 화면: 목표 조준 괄호(탄착이 가까울수록 빨리 깜빡임) ---------- */
function v3StrikeMark(j){if(!V3.on||j.n!==G.viewer||typeof v3RetTex!=='function')return;const T=V3.T;const x=j.c+.5,z=j.r+.5,y=v3TopAt(x,z)+.08;
  const s=new T.Sprite(new T.SpriteMaterial({map:v3RetTex(),transparent:true,depthTest:false,depthWrite:false}));s.renderOrder=9;s.position.set(x,y,z);V3.G.fx.add(s);
  V3.fx.push({o:s,t0:performance.now(),dur:1e9,upd:(o)=>{const t=G.time||0,left=j.imp-t;if(left<=0||j.down)return false;const hz=left<1.2?14:6;
      o.material.opacity=.55+.45*Math.sin(t*hz);o.scale.setScalar(.9*(V3.cs.d/14)*(1+Math.max(0,left-1)*.08));}});}
/* ---------- 대공이 쏘면 편대장기가 플레어를 뿌린다 ---------- */
function v3JetFlares(j){const g=V3.jets&&V3.jets.get(j.id);if(!g)return;const T=V3.T;const x=g.position.x,y=g.position.y,z=g.position.z;
  for(let i=0;i<6;i++){const s=new T.Sprite(new T.SpriteMaterial({map:V3.puff,color:'#fff0c0',blending:T.AdditiveBlending,transparent:true,depthWrite:false}));s.position.set(x,y,z);V3.G.fx.add(s);
    const vx=(Math.random()-.5)*2.4-j.hx*1.5,vz=(Math.random()-.5)*2.4-j.hz*1.5,vy=-.4-Math.random()*.6;let lt=0;
    V3.fx.push({o:s,t0:performance.now()+i*70,dur:1800,upd:(o,k)=>{const tt=k*1.8;const px=x+vx*tt,py=y+vy*tt-1.2*tt*tt,pz=z+vz*tt;o.position.set(px,py,pz);o.scale.setScalar(.12*(1-k*.6));o.material.opacity=1-k;
      const now=performance.now();if(now-lt>90){lt=now;v3Trail(px,py,pz,'#d9d6cf',.06,1600);}}});}}
/* ---------- 탄착: 포탄과는 급이 다른 큰 폭발 ----------
   가운데 폭탄(P=1)이 제일 크고, 앞뒤 폭탄(P=.6)은 작다. 입자는 07q-pfx(연기·폭발 엔진)에 그리고, 없으면 예전 v3Bomb.
   순서: 화면 전체 섬광 → 큰 불덩이(1초 넘게 굴러 오름) → 버섯구름 기둥 → 바닥을 굴러 나가는 먼지 벽 →
   흙·잔해, 주변 건물 유리 파편 → 몇 분 남는 검은 연기 기둥과 불. 흔들림·저음은 가까울수록 세다. */
const BOOM={P:{main:1,side:.6}};
function v3ScreenFlash(a){if(typeof document==='undefined'||a<.05)return;let el=V3.flashEl;
  if(!el){el=V3.flashEl=document.createElement('div');el.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:40;opacity:0;background:radial-gradient(circle at 50% 50%,rgba(255,250,236,1) 0%,rgba(255,214,150,.75) 45%,rgba(255,170,90,.35) 100%);mix-blend-mode:screen';document.body.appendChild(el);}
  el.style.transition='none';el.style.opacity=String(Math.min(.95,a));void el.offsetWidth;el.style.transition='opacity .55s cubic-bezier(.2,.7,.3,1)';el.style.opacity='0';}
// 버섯구름: 불덩이가 솟아오르며 기둥을 끌고, 꼭대기에서 검은 연기가 옆으로 말려 퍼진다
function pfxMushroom(x,y,z,P){const H=3.4*P,t0=PFX.t,R=.5*P;
  pfxEmit({x,y,z,dur:2.4,rate:34*P,fn:e=>{const age=PFX.t-t0,h=y+H*(1-Math.exp(-age/.65)),hot=Math.max(0,1-age/1.4);
    if(Math.random()<hot*.8)pfx({x:x+pfxR(-R,R)*.6,y:h,z:z+pfxR(-R,R)*.6,vx:pfxR(-.3,.3),vy:pfxR(.3,.8),vz:pfxR(-.3,.3),drag:2,life:pfxR(.5,.9),s0:.5*P,s1:pfxR(.9,1.4)*P,k:PFXK.FIRE,col:'#ffffff',a:.9,fi:.04,rs:(Math.random()-.5)*2,wind:.2});
    const a=Math.random()*6.283,sp=pfxR(.5,1.4)*P;   // 갓: 꼭대기에서 바깥으로 말려 나가는 검은 연기
    pfx({x:x+Math.cos(a)*R*.5,y:h+pfxR(-.2,.2)*P,z:z+Math.sin(a)*R*.5,vx:Math.cos(a)*sp,vy:pfxR(.1,.5),vz:Math.sin(a)*sp,drag:.9,acc:.02,life:pfxR(16,26),s0:.6*P,s1:pfxR(1.8,2.8)*P,col:Math.random()<.6?'#211e1a':'#3b352e',a:.88,fi:.03,em:'#ff7a2a',emI:hot*1.6,emK:.05,rs:(Math.random()-.5)*.4});
    if(Math.random()<.6)pfx({x:x+pfxR(-.25,.25)*P,y:y+Math.random()*(h-y),z:z+pfxR(-.25,.25)*P,vx:pfxR(-.1,.1),vy:pfxR(.3,.9),vz:pfxR(-.1,.1),drag:.6,life:pfxR(10,16),s0:.35*P,s1:pfxR(.9,1.4)*P,col:Math.random()<.5?'#5c5248':'#7a6d5c',a:.75,fi:.04,rs:(Math.random()-.5)*.3});}});}
// 바닥을 굴러 나가는 먼지 벽: 낮고 빠르게 퍼진 뒤 오래 걸려 있다
function pfxDustWall(x,y,z,P,col){const n=pfxN(40*P);for(let i=0;i<n;i++){const a=i/n*6.283+Math.random()*.3,sp=pfxR(4,7)*P;
  pfx({x:x+Math.cos(a)*.2,y:y+pfxR(.05,.35)*P,z:z+Math.sin(a)*.2,vx:Math.cos(a)*sp,vy:pfxR(.05,.3),vz:Math.sin(a)*sp,drag:1.5,acc:.01,life:pfxR(16,28),s0:.4*P,s1:pfxR(1.6,2.6)*P,col:col||pfxDustC(),a:.72,fi:.02,rs:(Math.random()-.5)*.3});}}
// 주변 건물 창이 깨진다: 반짝이는 유리 조각이 벽에서 쏟아진다
function pfxGlass(x,z,rad){const R=Math.ceil(rad);const r0=Math.floor(z),c0=Math.floor(x);
  for(let r=r0-R;r<=r0+R;r++)for(let c=c0-R;c<=c0+R;c++){if(!inb(r,c)||G.map[r][c].t!=='bldg')continue;const d=Math.hypot(r+.5-z,c+.5-x);if(d>rad+.5||d<.3)continue;
    const top=v3Top(r,c),n=pfxN(10);const ux=(c+.5-x)/d,uz=(r+.5-z)/d;
    for(let i=0;i<n;i++){const fx=c+.5-ux*.5+pfxR(-.35,.35)*Math.abs(uz),fz=r+.5-uz*.5+pfxR(-.35,.35)*Math.abs(ux);
      pfx({x:fx,y:pfxR(.2,Math.max(.3,top*.95)),z:fz,vx:-ux*pfxR(.3,1.4),vy:pfxR(-.2,.6),vz:-uz*pfxR(.3,1.4),drag:.6,acc:-4,life:pfxR(.6,1.3),s0:.03,s1:.02,k:PFXK.SPARK,col:'#d6eef6',a:.95,fi:.01,wind:0,dl:pfxR(.03,.2)});}}}
// 몇 분 남는 검은 연기 기둥
function pfxPlume(x,y,z,P,dur){pfxEmit({x,y,z,dur,rate:2.4*P,fn:e=>{const age=(PFX.t-e.t1+dur)/dur,k=1-age*.6;
  pfx({x:e.x+pfxR(-.3,.3)*P,y:e.y+.2,z:e.z+pfxR(-.3,.3)*P,vx:pfxR(-.05,.05),vy:pfxR(.4,.65),vz:pfxR(-.05,.05),drag:.14,acc:0,life:pfxR(18,28),s0:.4*P,s1:pfxR(2.6,3.8)*P*k,col:Math.random()<.6?'#1c1916':'#2e2a25',a:.72*k,fi:.06,em:'#ff6a1a',emI:.8*k,emK:.04,rs:(Math.random()-.5)*.3});}});}
function sndBigBoom(x,z,P){if(typeof sndVoice!=='function')return;if(typeof sndBoom==='function')sndBoom(x,z,1.6+1.4*P);
  const V=sndVoice(x,z,{vol:1.6*P+.4,dur:7,wet:1.6});if(!V)return;const t=V.t;
  sndTn(V,t,3.6,46,17,1.2*P,'sine',.01);sndNz(V,t+.02,5,'lowpass',180,.5,.9*P,.12,45);            // 땅을 울리는 저음, 길게 구르는 울림
  sndNz(V,t+.4,3.5,'bandpass',900,.6,.18*P,.4,300);for(let i=0;i<14*P;i++)sndNz(V,t+.5+Math.random()*3,.04,'bandpass',1500+Math.random()*3000,1.5,.05+Math.random()*.08,.001);}
function v3StrikeBomb(r,c,b){if(!V3.on)return;const main=!b||b.main!==false,P=main?BOOM.P.main:BOOM.P.side;
  const x=b&&b.x!=null?b.x:c+.5,z=b&&b.z!=null?b.z:r+.5;const top=inb(r,c)?v3Top(r,c):0,onB=top>.2,y=onB?top*.65:.08;
  const d=Math.hypot(V3.cs.x-x,V3.cs.z-z),near=Math.min(1,Math.max(0,1.3-d/(V3.cs.d*1.4)));
  if(typeof pfxBlast!=='function'||(!PFX.on&&(pfxInit(),!PFX.on))){v3Bomb(r,c);V3.shake=Math.max(V3.shake,.6*near);return;}
  // 섬광: 장면 전체를 비추는 빛 + 화면 섬광
  v3ScreenFlash((main?.85:.4)*near);if(V3.flash){V3.flash.position.set(x,y+1.2,z);V3.flash.intensity=Math.max(V3.flash.intensity,(main?60:28));V3.flashT=performance.now();}
  pfx({x,y:y+.3,z,life:.18,s0:4*P,s1:8*P,k:PFXK.FLASH,col:'#fff6e0',a:1,fi:.01,wind:0});
  // 불덩이: 포탄(크기 1)의 3배 남짓. 오래 굴러 오르는 큰 불덩이를 덧붙인다
  pfxBlast(x,y,z,3.2*P,{ground:!onB,fire:2.2});
  const nf=pfxN(28*P);for(let i=0;i<nf;i++){const a=Math.random()*6.283,el=pfxR(.1,1.3),sp=pfxR(1,2.6)*P;
    pfx({x,y:y+.15,z,vx:Math.cos(a)*Math.cos(el)*sp,vy:Math.sin(el)*sp+.8,vz:Math.sin(a)*Math.cos(el)*sp,drag:3,acc:.5,life:pfxR(.9,1.7),s0:.4*P,s1:pfxR(1,1.6)*P,k:PFXK.FIRE,col:'#ffffff',a:.95,fi:.03,rs:(Math.random()-.5)*2,wind:.2});}
  pfxMushroom(x,y,z,P);
  // 바닥 먼지 벽: 건물 위에 떨어져도 길바닥에서 일어난다
  pfxDustWall(x,.02,z,P*(onB?.9:1),onB?'#9c9283':null);if(typeof pfxRing==='function')pfxRing(x,.03,z,4.5*P);
  // 잔해·흙·패인 자국·유리
  if(typeof v3Debris==='function')v3Debris(x,y+.2,z,Math.round(36*P),1.6*P);dsSpray(x,y+.25,z,Math.round(240*P),2.1*P);dsScar('crater',x,z,.55*P);
  if(main)pfxGlass(x,z,2.2);
  // 남는 것: 검은 연기 기둥과 불
  pfxPlume(x,onB?top*.8:.05,z,P,main?150:60);if(typeof pfxFire==='function')pfxFire(x,z,onB?top*.8:.03,main?7:3,main?70000:35000,.9*P);else dsFires(x,z,5,50000,1.2);
  // 흔들림: 가까우면 크게. 땅울림은 조금 늦게 한 번 더
  V3.shake=Math.max(V3.shake,(main?1.25:.6)*near);if(main)V3.fx.push({o:new V3.T.Object3D(),t0:performance.now()+260,dur:60,upd:o=>{if(!o.userData.d){o.userData.d=1;V3.shake=Math.max(V3.shake,.5*near);}}});
  sndBigBoom(x,z,P);if(main&&typeof specStrikeHit==='function')specStrikeHit(x,z);
  // 몇 초 동안 띄엄띄엄 잔폭(잔해·연료가 터지는 것). 피해 규칙과는 무관한 연출
  if(main){const n=3+(Math.random()*3|0);for(let i=0;i<n;i++){const a=Math.random()*6.283,rd=.3+Math.random()*.8,px=x+Math.cos(a)*rd,pz=z+Math.sin(a)*rd;
    V3.fx.push({o:new V3.T.Object3D(),t0:performance.now()+700+i*600+Math.random()*900,dur:60,upd:o=>{if(o.userData.d)return;o.userData.d=1;const yy=v3TopAt(px,pz)*.5+.15;
        pfxBlast(px,yy,pz,.6,{fire:2});dsSpray(px,yy,pz,24,.5);V3.shake=Math.max(V3.shake,.07*near);if(typeof sndBoom==='function')sndBoom(px,pz,.5);}});}}}
Object.assign(FXH,{jet:j=>{if(j.imp==null)return v3Jet(j);v3StrikeJet(j);v3StrikeMark(j);if(typeof specStrike==='function')specStrike(j);},
  release:j=>v3StrikeRelease(j),bomb:(r,c,b)=>v3StrikeBomb(r,c,b)});
{const _aa=FXH.aaShot;FXH.aaShot=function(e,j){const r=_aa?_aa.apply(this,arguments):undefined;if(V3.on&&!j.flared){j.flared=1;v3JetFlares(j);}return r;};}
/* ---------- 관전 자동 연출: 공습이 오면 탄착 지점으로 컷 ---------- */
function specStrike(j){if(typeof UI==='undefined'||typeof specOn!=='function'||!specOn()||!UI.specAuto)return;const cur=UI.specStrike;
  if(cur&&(G.time||0)<cur.until)return;UI.specStrike={x:j.c+.5,z:j.r+.5,hx:j.hx,hz:j.hz,imp:j.imp,until:j.imp+6,id:j.id};}
if(typeof specCam==='function'){const _sc=specCam;specCam=function(now){const r=_sc.apply(this,arguments);const S=typeof UI!=='undefined'&&UI.specStrike;
  if(S){if(!specOn()||!UI.specAuto||(G.time||0)>S.until)UI.specStrike=null;else{// 접근 중엔 들어오는 쪽으로 조금 당겨 넓게 잡고, 탄착 무렵 목표로 모인다
    const left=Math.max(0,S.imp-(G.time||0)),pull=Math.min(6,left*2.2);V3.cs.gx=S.x-S.hx*pull;V3.cs.gz=S.z-S.hz*pull;V3.cs.gd=left>.3?20:(S.punch&&now<S.punch?12:17);UI.specHotT=now;}}return r;};}
/* 관전: 가운데 폭탄이 터지는 순간 잠깐 느리게(0.3배, 1.6초) 하고 카메라를 당긴다 */
function specStrikeHit(x,z){if(typeof UI==='undefined'||typeof specOn!=='function'||!specOn()||!UI.specAuto||!UI.specStrike)return;const S=UI.specStrike,now=performance.now();
  S.punch=now+1100;if(UI.slowmo)return;const sp=G.spd||1;UI.slowmo={sp};G.spd=sp*.3;
  setTimeout(()=>{const m=UI.slowmo;UI.slowmo=null;if(m&&G&&Math.abs((G.spd||1)-m.sp*.3)<1e-6)G.spd=m.sp;},1600);}
