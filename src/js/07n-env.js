/* ===================== 야간전과 날씨: 화면 =====================
   빛과 색은 시각에 따라 매 프레임 조금씩 바뀌고(낮 → 노을 → 밤), 날씨도 몇 초에 걸쳐 스며든다.
   조명탄은 낙하산에 매달려 흔들리며 내려오고, 아래를 하얗게 비춘다. 밤에는 야간투시경 화면(녹색 단색, 잡음)을 켤 수 있다. */
const ENVP={
  day:{sun:'#ffe9cc',si:2.3,sky:'#c9cccb',gr:'#6b6458',hi:1.15,fog:'#9a9183'},
  dusk:{sun:'#ffa060',si:2.8,sky:'#e0bba0',gr:'#5a4636',hi:1.2,fog:'#8a6c58'},
  night:{sun:'#7f95c9',si:.35,sky:'#2c3a58',gr:'#141310',hi:.42,fog:'#0b1017'},
};
const ENV3={wr:0,wf:0,ws:0,bolt:0,boltT:8,flares:new Map(),pool:[],mist:[],init:false};

/* v3Light 대신: 목표값만 정하고 실제 반영은 v3EnvFrame이 부드럽게 한다 */
function v3EnvLight(){const wx=G.wx||'clear';const k=typeof wxKind==='function'?wxKind():wx;V3.rain=k==='snow'?.09:k==='blizzard'?.22:k==='sand'||k==='dust'?0:wx==='rain'?1:wx==='storm'?1.6:0;}

function v3EnvInit(){const T=V3.T;ENV3.init=true;ENV3.g=new T.Group();V3.scene.add(ENV3.g);
  // 조명탄 빛: 개수가 바뀌면 셰이더를 다시 만들어야 하므로 처음부터 3개를 꺼 둔 채 둔다
  for(let i=0;i<3;i++){const l=new T.PointLight('#fff0d8',0,14,1.3);V3.scene.add(l);ENV3.pool.push(l);}
  ENV3.glowM=new T.SpriteMaterial({map:V3.puff,color:'#fff6e4',blending:T.AdditiveBlending,transparent:true,depthWrite:false});
  ENV3.haloM=new T.SpriteMaterial({map:V3.puff,color:'#ffe2b0',blending:T.AdditiveBlending,transparent:true,depthWrite:false,opacity:.35});
  ENV3.chuteM=new T.MeshBasicMaterial({color:'#d8d2c2',side:T.DoubleSide});ENV3.chuteG=new T.SphereGeometry(.09,8,4,0,Math.PI*2,0,Math.PI*.42);
  ENV3.lineM=new T.LineBasicMaterial({color:'#bdb6a6',transparent:true,opacity:.6});
  // 낮게 깔리는 안개 덩어리
  for(let i=0;i<34;i++){const s=new T.Sprite(new T.SpriteMaterial({map:V3.puff,color:'#c3c1ba',transparent:true,depthWrite:false,opacity:0,fog:true}));s.userData={ph:Math.random()*6.28,a:Math.random()*6.28,r:Math.random(),y:.15+Math.random()*.5,sz:2.5+Math.random()*3};ENV3.g.add(s);ENV3.mist.push(s);}
  ENV3.terrR=V3.M.terr.roughness;ENV3.roofR=V3.M.roof.roughness;}

const _ec=[];function envCol(i,h){if(!_ec[i])_ec[i]=new V3.T.Color();return _ec[i].set(h);}
function v3EnvFrame(now,dt){if(!G||!V3.on)return;if(!ENV3.init)v3EnvInit();const T=V3.T,s=V3.cs;
  const nk=nightK(),dk=duskK()*(1-nk*.6);const wx=G.wx||'clear';const wk=typeof wxKind==='function'?wxKind():wx;const snowy=wk==='snow'||wk==='blizzard',sandy=wk==='sand'||wk==='dust';
  // 날씨는 몇 초에 걸쳐 바뀐다
  const ek=ENV3.seed!==G.seed?1:1-Math.exp(-dt/3.5);ENV3.seed=G.seed;ENV3.wr+=((snowy||sandy?0:wx==='rain'?1:wx==='storm'?1:0)-ENV3.wr)*ek;ENV3.wf+=((wk==='fog'||wk==='blizzard'||wk==='sand'?1:wk==='dust'?.7:wk==='snow'?.35:0)-ENV3.wf)*ek;ENV3.ws+=((wx==='storm'&&!snowy&&!sandy?1:0)-ENV3.ws)*ek;
  const wr=ENV3.wr,wf=ENV3.wf,ws=ENV3.ws;
  const D=ENVP.day,K=ENVP.dusk,Nn=ENVP.night;
  const mix=(k,i)=>envCol(i,D[k]).lerp(envCol(i+1,K[k]),dk).lerp(envCol(i+2,Nn[k]),nk);
  const num=k=>(D[k]*(1-dk)+K[k]*dk)*(1-nk)+Nn[k]*nk;
  // 번개
  if(ws>.5){ENV3.boltT-=dt;if(ENV3.boltT<=0){ENV3.boltT=5+Math.random()*11;ENV3.bolt=1;ENV3.boltAt=now;if(typeof sfx==='function')setTimeout(()=>sfx('boom',.35),400+Math.random()*900);}}
  let bolt=0;if(ENV3.bolt){const e=(now-ENV3.boltAt)/1000;bolt=e<.08?1:e<.16?.2:e<.24?.8:Math.max(0,1-(e-.24)*4);if(e>.5)ENV3.bolt=0;}
  V3.sun.color.copy(mix('sun',0));V3.sun.intensity=num('si')*(1-.45*Math.max(wr,wf*.8));
  V3.hemi.color.copy(mix('sky',3));V3.hemi.groundColor.copy(mix('gr',6));V3.hemi.intensity=num('hi')*(1-.15*wr)+bolt*2.2;
  V3.M.wall.emissiveIntensity=nk*.75+dk*.2;
  const fc=mix('fog',9);if(wr>0)fc.lerp(envCol(12,nk>.5?'#151a20':'#4a525a'),.5*wr);if(wf>0)fc.lerp(envCol(13,nk>.5?'#1c2026':sandy?(wk==='sand'?'#b08a58':'#bfa784'):snowy?'#d3d8dd':'#a7a59d'),(sandy?.75:.55)*wf);if(bolt)fc.lerp(envCol(14,'#9aa6b8'),bolt*.6);
  V3.scene.fog.color.copy(fc);if(!V3.scene.background||!V3.scene.background.isColor)V3.scene.background=new T.Color();V3.scene.background.copy(fc);
  V3.fogK=(1-.55*wf)*(1-.3*ws)*(1-.25*nk);const fk=Math.max(wf,ws*.6);V3.scene.fog.near=s.d*.75*V3.fogK*(1-fk)+s.d*.25*fk;V3.scene.fog.far=(s.d*2.8*V3.fogK+10)*(1-fk)+s.d*1.45*fk;
  const h=dayH();V3.sunAng=nk>.85?.4:Math.max(-.95,Math.min(.95,(h-12)/6.5));
  // 젖은 땅: 더 어둡고 덜 거칠다(빛을 번들거리게 받는다)
  V3.M.terr.roughness=ENV3.terrR-.38*wr;V3.M.roof.roughness=ENV3.roofR-.3*wr;const wet=1-.28*wr;V3.M.terr.color.setRGB(wet,wet,wet);
  if(V3.rainObj){if(snowy){V3.rainObj.material.opacity=(wk==='blizzard'?.8:.6)*(nk>.5?.5:1);V3.rainObj.material.color.set(nk>.5?'#8a929a':'#f4f6f8');V3.rainObj.scale.set(1,.25,1);}   // 눈송이: 짧고 하얗게, 천천히
    else{V3.rainObj.material.opacity=.38*wr*(nk>.5?.6:1);V3.rainObj.material.color.set(nk>.5?'#6f8090':'#9fb0bf');V3.rainObj.scale.set(1,1,1);}}
  // 안개 덩어리
  const fo=.45*wf+.1*wr*(1-nk);for(const m of ENV3.mist){const u=m.userData;m.visible=fo>.01;if(!m.visible)continue;const R=s.d*.9;const a=u.a+now/1000*.01;
    const x=s.x+Math.cos(a)*R*u.r+Math.sin(now/9000+u.ph)*1.5,z=s.z+Math.sin(a)*R*u.r;m.position.set(x,u.y,z);m.scale.setScalar(u.sz*(1+s.d*.03));m.material.opacity=fo*(.6+.4*Math.sin(now/3000+u.ph));m.material.color.set(nk>.5?'#2a3038':sandy?'#c29a66':snowy?'#e2e6ea':'#c3c1ba');}
  // 야간투시경: 별빛을 증폭하듯 그늘 없이 고르게 밝힌다(색은 CSS 필터가 녹색 단색으로 바꾼다)
  const q=UI.nvg?Math.min(1,nk*1.4):0;if(q>0){V3.hemi.color.lerp(envCol(15,'#d8dde0'),q);V3.hemi.groundColor.lerp(envCol(16,'#5a5c58'),q);V3.hemi.intensity+=(1.5-V3.hemi.intensity)*q;
    V3.sun.color.lerp(envCol(17,'#c8d0d8'),q);V3.sun.intensity+=(.9-V3.sun.intensity)*q;V3.M.wall.emissiveIntensity*=1-.5*q;fc.lerp(envCol(18,'#3a3f40'),q);V3.scene.fog.color.copy(fc);V3.scene.background.copy(fc);}
  v3EnvFlares(now);}

/* 조명탄: G.flares를 그대로 따라 그린다 */
function v3EnvFlares(now){const T=V3.T;const seen=new Set();const used=[];const tnow=G.time||0;
  for(const f of G.flares||[]){seen.add(f.id);let o=ENV3.flares.get(f.id);
    if(!o){o={g:new T.Group(),glow:new T.Sprite(ENV3.glowM),halo:new T.Sprite(ENV3.haloM),chute:new T.Mesh(ENV3.chuteG,ENV3.chuteM),pop:false,trailT:0};
      const lg=new T.BufferGeometry().setFromPoints([new T.Vector3(-.07,.02,0),new T.Vector3(0,-.16,0),new T.Vector3(.07,.02,0),new T.Vector3(0,-.16,0)]);o.line=new T.LineSegments(lg,ENV3.lineM);
      o.chute.position.y=.0;o.line.position.y=0;o.glow.position.y=-.17;o.halo.position.y=-.17;o.g.add(o.glow,o.halo,o.chute,o.line);ENV3.g.add(o.g);ENV3.flares.set(f.id,o);}
    const t=tnow-f.t0;if(t<FLARE.up){o.g.visible=false;continue;}
    const a=(t-FLARE.up)/FLARE.dur;const k=flareK(f);const y=FLARE.top-(FLARE.top-.35)*a;
    if(!o.pop){o.pop=true;v3Burst(f.x,y,f.z,.8,'#fff3dd',0,0);}
    const sw=Math.sin(now/650+f.id)*.12;o.g.visible=k>0;o.g.position.set(f.x+sw*.4,y,f.z);o.g.rotation.z=sw*.5;
    const fl=.85+Math.sin(now/37+f.id)*.08+Math.sin(now/91)*.07;o.glow.scale.setScalar(.32*fl);o.halo.scale.setScalar(2.2*fl*k);o.halo.material.opacity=.35;
    // 흰 연기 꼬리
    if(now>o.trailT&&k>0){o.trailT=now+260;const p=new T.Sprite(new T.SpriteMaterial({map:V3.puff,color:'#b9b4aa',transparent:true,depthWrite:false,opacity:0}));const px=o.g.position.x,py=y-.17,pz=f.z;V3.G.fx.add(p);
      V3.fx.push({o:p,t0:now,dur:5000,upd:(q,kk)=>{q.position.set(px+kk*.25,py+kk*.35,pz+kk*.1);q.scale.setScalar(.08+kk*.5);q.material.opacity=.32*(1-kk)*(kk<.1?kk*10:1);}});}
    if(k>0)used.push([o.g.position.x,y-.2,f.z,k*fl]);}
  for(const [id,o] of ENV3.flares)if(!seen.has(id)){ENV3.g.remove(o.g);o.line.geometry.dispose();ENV3.flares.delete(id);}
  // 화면 가운데에 가까운 조명탄부터 빛을 준다
  const s=V3.cs;used.sort((p,q)=>Math.hypot(p[0]-s.x,p[2]-s.z)-Math.hypot(q[0]-s.x,q[2]-s.z));
  ENV3.pool.forEach((l,i)=>{const u=used[i];if(!u){l.intensity=0;return;}l.position.set(u[0],u[1],u[2]);l.intensity=(UI.nvg?16:45)*u[3];l.distance=FLARE.rad*1.9;});}

function v3Flare(f){}
FXH.flare=v3Flare;

/* 야간투시경 화면 */
function nvgSet(on){UI.nvg=!!on;const cv=$('#v3d');if(cv)cv.classList.toggle('nvg',UI.nvg);const ov=$('#nvg-ov');if(ov)ov.hidden=!UI.nvg;const b=$('#b-nvg');if(b)b.setAttribute('aria-pressed',UI.nvg?'true':'false');}
function nvgHud(){const b=$('#b-nvg');if(!b||!G)return;const nk=nightK();const show=nk>.2;b.hidden=!show;if(!show&&UI.nvg)nvgSet(false);}
