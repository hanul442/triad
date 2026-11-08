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
function v3StrikeRelease(j){if(!V3.on)return;const x0=j.c+.5,z0=j.r+.5,gy=v3TopAt(x0,z0),p0=jetPose(j,j.rel),fall=Math.max(.2,j.imp-j.rel);
  const b=v3BombModel();b.rotation.order='YZX';b.scale.setScalar(1.4);b.rotation.y=-Math.atan2(j.hz,j.hx);V3.G.fx.add(b);
  if(typeof sndWhistle==='function')sndWhistle(x0,z0,fall/Math.max(.25,G.spd||1));
  if(j.n===G.viewer&&!isAI(j.n)&&typeof sndRadio==='function')sndRadio('support');
  V3.fx.push({o:b,t0:performance.now(),dur:1e9,upd:(o)=>{const t=G.time||0;const k=Math.min(1,Math.max(0,(t-j.rel)/fall));
      o.position.set(p0.x+(x0-p0.x)*k,p0.y-(p0.y-gy)*k*k,p0.z+(z0-p0.z)*k);o.rotation.z=-Math.atan2(2*k*(p0.y-gy),Math.hypot(x0-p0.x,z0-p0.z));
      if(k>=1)return false;}});}
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
/* ---------- 탄착: 기존 큰 폭발 + 거리에 따른 흔들림 + 잔폭 ---------- */
function v3StrikeBomb(r,c){if(!V3.on)return;const sh=V3.shake;const [x,z]=v3x(r,c);
  // 연기·폭발 입자 엔진(07q-pfx)이 있으면 큰 폭발을 그쪽에 맡긴다. 없으면 예전 v3Bomb
  if(typeof pfxBlast==='function'){const top=v3Top(r,c),y=top*.6+.05;pfxBlast(x,y,z,2,{ground:top<.2});dsSpray(x,y+.25,z,180,1.7);dsScar('crater',x,z,.45);dsFires(x,z,5,50000,1.2);sfx('boom',1.8,x,z);}
  else v3Bomb(r,c);const d=Math.hypot(V3.cs.x-x,V3.cs.z-z);
  V3.shake=Math.max(sh,.6*Math.min(1,Math.max(.15,1.25-d/18))*Math.min(1.4,14/Math.max(6,V3.cs.d)));
  // 몇 초 동안 띄엄띄엄 작은 잔폭(잔해·연료가 터지는 것). 피해 규칙과는 무관한 연출
  const n=2+(Math.random()*2|0);for(let i=0;i<n;i++){const a=Math.random()*6.283,rd=.25+Math.random()*.45,px=x+Math.cos(a)*rd,pz=z+Math.sin(a)*rd;let done=false;
    V3.fx.push({o:new V3.T.Object3D(),t0:performance.now()+500+i*500+Math.random()*700,dur:60,upd:()=>{if(done)return;done=true;const y=v3TopAt(px,pz)*.5+.15;
        if(typeof pfxBlast==='function')pfxBlast(px,y,pz,.5,{fire:2});else v3Burst(px,y,pz,.55,'#ff9a40',2,1.2);dsSpray(px,y,pz,24,.5);V3.shake=Math.max(V3.shake,.05);if(typeof sndBoom==='function')sndBoom(px,pz,.5);}});}}
Object.assign(FXH,{jet:j=>{if(j.imp==null)return v3Jet(j);v3StrikeJet(j);v3StrikeMark(j);if(typeof specStrike==='function')specStrike(j);},
  release:j=>v3StrikeRelease(j),bomb:(r,c)=>v3StrikeBomb(r,c)});
{const _aa=FXH.aaShot;FXH.aaShot=function(e,j){const r=_aa?_aa.apply(this,arguments):undefined;if(V3.on&&!j.flared){j.flared=1;v3JetFlares(j);}return r;};}
/* ---------- 관전 자동 연출: 공습이 오면 탄착 지점으로 컷 ---------- */
function specStrike(j){if(typeof UI==='undefined'||typeof specOn!=='function'||!specOn()||!UI.specAuto)return;const cur=UI.specStrike;
  if(cur&&(G.time||0)<cur.until)return;UI.specStrike={x:j.c+.5,z:j.r+.5,hx:j.hx,hz:j.hz,imp:j.imp,until:j.imp+3.2,id:j.id};}
if(typeof specCam==='function'){const _sc=specCam;specCam=function(now){const r=_sc.apply(this,arguments);const S=typeof UI!=='undefined'&&UI.specStrike;
  if(S){if(!specOn()||!UI.specAuto||(G.time||0)>S.until)UI.specStrike=null;else{// 접근 중엔 들어오는 쪽으로 조금 당겨 넓게 잡고, 탄착 무렵 목표로 모인다
    const left=Math.max(0,S.imp-(G.time||0)),pull=Math.min(6,left*2.2);V3.cs.gx=S.x-S.hx*pull;V3.cs.gz=S.z-S.hz*pull;V3.cs.gd=left>.3?20:16;UI.specHotT=now;}}return r;};}
