/* ===================== SOUND =====================
   소리는 파일 없이 Web Audio로 합성한다(외부 음원 없음). 첫 사용자 조작 이후에만 소리가 난다.
   전장 소리는 자리가 있다: 카메라가 보는 지점이 귀다.
   - 멀수록 작아지고 고음이 먼저 사라진다(가까운 총성은 날카롭게 "탁", 먼 총성은 둔하게 "퉁").
   - 소리는 음속(343m/s, 1칸=12m)만큼 늦게 닿는다. 먼 폭발은 섬광이 먼저 보이고 소리가 뒤따른다.
   - 좌우로 나뉘어 들린다(카메라 회전을 따른다).
   - 가까운 건물 벽에서 메아리가 되돌아오고, 건물이 빽빽한 곳일수록 잔향이 길다. 건물 안에서 쏜 총은 둔탁하게 울린다.
   무전(radio)·환경음(amb)·전투음(fx)은 따로 음량을 조절한다. */
const SND_M=12,SND_C=343;
const SFX={ctx:null,on:true,last:{},vol:{master:.8,fx:.9,radio:.7,amb:.5},n:0,loops:new Map(),track:[],radioEnd:0,radioP:0};
try{if(typeof localStorage!=='undefined'){SFX.on=localStorage.getItem('triad-sound')!=='0';const v=JSON.parse(localStorage.getItem('triad-snd-vol')||'null');if(v)for(const k in SFX.vol)if(typeof v[k]==='number')SFX.vol[k]=Math.min(1,Math.max(0,v[k]));}}catch(e){}
function sndSave(){try{localStorage.setItem('triad-sound',SFX.on?'1':'0');localStorage.setItem('triad-snd-vol',JSON.stringify(SFX.vol));}catch(e){}}
function sndApplyVol(){const a=SFX.ctx;if(!a)return;const t=a.currentTime;SFX.master.gain.setTargetAtTime(SFX.on?SFX.vol.master:0,t,.03);
  for(const k of ['fx','radio','amb'])SFX.bus[k].gain.setTargetAtTime(SFX.vol[k]*(k==='fx'?1:k==='radio'?1.1:.9),t,.03);}
function audio(){if(typeof window==='undefined'||!SFX.on)return null;try{if(!SFX.ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;const a=new AC();SFX.ctx=a;
    // 마스터 → 리미터 → 스피커. 버스: 전투(fx)·무전(radio)·환경(amb)·조작음(ui)
    const comp=a.createDynamicsCompressor();comp.threshold.value=-16;comp.knee.value=10;comp.ratio.value=5;comp.attack.value=.002;comp.release.value=.25;comp.connect(a.destination);
    SFX.master=a.createGain();SFX.master.connect(comp);SFX.bus={};for(const k of ['fx','radio','amb','ui']){const g=a.createGain();g.connect(SFX.master);SFX.bus[k]=g;}SFX.bus.ui.gain.value=.7;
    SFX.noise=noiseBuf(a,2);SFX.crk=crackleBuf(a);
    // 도시 잔향: 합성한 임펄스 응답(초반 반사 몇 개 + 1.8초 꼬리)
    SFX.rev=a.createConvolver();SFX.rev.buffer=urbanIR(a);const rg=a.createGain();rg.gain.value=.55;SFX.rev.connect(rg);rg.connect(SFX.bus.fx);
    sndApplyVol();}
  if(SFX.ctx.state==='suspended')SFX.ctx.resume();return SFX.ctx;}catch(e){return null;}}
function noiseBuf(a,dur){const b=a.createBuffer(1,Math.max(1,Math.floor(a.sampleRate*dur)),a.sampleRate);const d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return b;}
// 불타는 소리: 드문드문 튀는 짧은 딱딱 소리를 2초짜리 고리로
function crackleBuf(a){const n=a.sampleRate*2,b=a.createBuffer(1,n,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*.04;
  for(let k=0;k<70;k++){const p=Math.floor(Math.random()*(n-800)),amp=.2+Math.random()*.8,len=80+Math.random()*500;for(let i=0;i<len;i++)d[p+i]+=(Math.random()*2-1)*amp*Math.exp(-i/(len*.25));}return b;}
function urbanIR(a){const len=Math.floor(a.sampleRate*1.9),b=a.createBuffer(2,len,a.sampleRate);for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);let lp=0;
    for(let i=0;i<len;i++){const t=i/a.sampleRate;lp+=((Math.random()*2-1)-lp)*Math.max(.05,.6-t*.35);d[i]=lp*Math.pow(1-i/len,2.4)*.6;}
    for(let k=0;k<7;k++){const p=Math.floor(a.sampleRate*(.02+Math.random()*.16));d[p]+=(.5-k*.05)*(Math.random()<.5?-1:1);}}return b;}

/* ---------- 귀의 자리와 거리 ---------- */
// 귀 = 카메라가 바라보는 땅 지점. 줌아웃할수록 귀가 높이 떠서 모든 소리가 멀어진다.
function sndEar(){if(typeof V3!=='undefined'&&V3&&V3.cs)return {x:V3.cs.x,z:V3.cs.z,h:Math.max(1,V3.cs.d*.22),yaw:V3.cs.yaw||0};
  const n=typeof N==='number'?N:30;return {x:n/2,z:n/2,h:6,yaw:0};}
// 한 점의 소리가 귀에 어떻게 닿는지: gain(크기), cut(저역통과 Hz), delay(초), pan(-1..1), m(미터)
function sndPlace(x,z,ear,y){const e=ear||sndEar();const dx=x-e.x,dz=z-e.z,hd=Math.hypot(dx,dz);const D=Math.hypot(hd,Math.max(.3,e.h-(y||0)*.5));const m=D*SND_M;
  const gain=1/(1+Math.pow(m/55,1.2));const cut=Math.max(380,17000*Math.exp(-m/230));const delay=Math.min(1.1,Math.max(0,(m-e.h*SND_M*.8))/SND_C);
  const rx=dx*Math.cos(e.yaw)-dz*Math.sin(e.yaw);const pan=Math.max(-.9,Math.min(.9,rx/(hd+e.h*.6+.5)));return {gain,cut,delay,pan,m};}
// 소리 난 곳 주변의 건물: 안쪽인지(ind), 빽빽한 정도(dens 0..1), 메아리를 돌려줄 벽(walls)
function sndRoom(x,z){const none={ind:0,dens:0,walls:[]};if(typeof G==='undefined'||!G||!G.map)return none;const n=G.map.length;const r0=Math.floor(z),c0=Math.floor(x);if(r0<0||c0<0||r0>=n||c0>=n)return none;
  const C=SFX.rc||(SFX.rc={g:null,v:null,m:new Map()});const v=G.navV||0;if(C.g!==G||C.v!==v){C.g=G;C.v=v;C.m.clear();}
  const k=r0*4096+c0;if(C.m.has(k))return C.m.get(k);const B=(r,c)=>r>=0&&c>=0&&r<n&&c<n&&G.map[r][c].t==='bldg'&&(G.map[r][c].f||0)>0;
  let cnt=0,tot=0;for(let dr=-3;dr<=3;dr++)for(let dc=-3;dc<=3;dc++){if(dr*dr+dc*dc>10)continue;tot++;if(B(r0+dr,c0+dc))cnt++;}
  const walls=[];for(const [p,q] of [[0,1],[1,0],[0,-1],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]){for(let s=1;s<=9;s++){const r=r0+p*s,c=c0+q*s;if(r<0||c<0||r>=n||c>=n)break;
      if(B(r,c)){if(s===1&&B(r0,c0))break;const dd=Math.hypot(p,q)*(s-.5);walls.push({x:x+q*(s-.5),z:z+p*(s-.5),h:G.map[r][c].f,d:dd});break;}}}
  walls.sort((a,b)=>a.d-b.d);const o={ind:B(r0,c0)?1:0,dens:cnt/tot,walls:walls.slice(0,4)};C.m.set(k,o);return o;}

/* ---------- 목소리(voice): 한 지점에서 나는 소리 한 덩어리 ---------- */
// mix에 원음을 꽂으면 거리 필터·패닝·잔향·벽 메아리가 붙는다. t는 소리가 귀에 닿기 시작하는 시각.
function sndVoice(x,z,o={}){const a=audio();if(!a)return null;const e=sndEar();const P=sndPlace(x,z,e,o.y);const R=o.dry?{ind:0,dens:0,walls:[]}:sndRoom(x,z);
  const g=P.gain*(o.vol??1);if(g<.006)return null;if(SFX.n>48&&g<.2||SFX.n>80&&g<.6)return null;
  const dur=(o.dur||1)+P.delay+2;SFX.n++;setTimeout(()=>{SFX.n--;},dur*1000);
  const t=a.currentTime+.015+P.delay;const bus=SFX.bus[o.bus||'fx'];const mix=a.createGain();
  const lp=a.createBiquadFilter();lp.type='lowpass';lp.Q.value=.4;lp.frequency.value=P.cut*(R.ind?.3:1);
  const dg=a.createGain();dg.gain.value=g*(R.ind?.8:1);mix.connect(lp);lp.connect(dg);
  if(a.createStereoPanner){const pn=a.createStereoPanner();pn.pan.value=P.pan;dg.connect(pn);pn.connect(bus);}else dg.connect(bus);
  if(!o.dry){const rs=a.createGain();rs.gain.value=Math.sqrt(g)*(o.wet??1)*(.06+R.dens*.34+(R.ind?.3:0));mix.connect(rs);rs.connect(SFX.rev);
    const D0=P.m/SND_M;for(const w of R.walls.slice(0,3)){const p1=Math.hypot(w.x-x,w.z-z),Q=sndPlace(w.x,w.z,e,0),p2=Q.m/SND_M;const extra=Math.max(.02,(p1+p2-D0)*SND_M/SND_C);if(extra>1.6)continue;
      const eg=(o.vol??1)*.6*Math.min(1,w.h/3)/(1+Math.pow((p1+p2)*SND_M/55,1.2))*(R.ind?.5:1);if(eg<.004)continue;
      const dl=a.createDelay(2);dl.delayTime.value=extra;const el=a.createBiquadFilter();el.type='lowpass';el.frequency.value=Math.min(P.cut,Q.cut)*.55;const eG=a.createGain();eG.gain.value=eg;
      mix.connect(dl);dl.connect(el);el.connect(eG);if(a.createStereoPanner){const ep=a.createStereoPanner();ep.pan.value=Q.pan;eG.connect(ep);ep.connect(bus);}else eG.connect(bus);}}
  return {a,t,mix,P,R};}
// 원음 재료: 잡음 한 토막(필터+엔벨로프), 음 하나(주파수 미끄럼)
function sndNz(V,t,dur,type,f,q,peak,att=.002,f2){const a=V.a;const s=a.createBufferSource();s.buffer=SFX.noise;const fl=a.createBiquadFilter();fl.type=type;fl.frequency.setValueAtTime(f,t);if(f2)fl.frequency.exponentialRampToValueAtTime(f2,t+dur);fl.Q.value=q;
  const g=a.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),t+att);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(fl);fl.connect(g);g.connect(V.mix);
  s.start(t,Math.random()*1.2);s.stop(t+dur+.05);}
function sndTn(V,t,dur,f0,f1,peak,type='sine',att=.004){const a=V.a;const o=a.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+dur);
  const g=a.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),t+att);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(V.mix);o.start(t);o.stop(t+dur+.05);}

/* ---------- 총성 ---------- */
// 병종별 총: rd 한 사람이 쏘는 발 수 [최소,최대], gap 발 간격(초), crack 초음속 "딱", body [중심Hz, Q, 길이, 크기], low [시작Hz, 끝Hz, 길이, 크기], vol
const WPN={
  rifle:{rd:[1,3],gap:.12,crack:.8,body:[1700,.9,.08,.9],low:[150,60,.05,.3],vol:1.2},
  eng:{rd:[1,2],gap:.14,crack:.6,body:[1500,.9,.08,.8],low:[140,60,.06,.3],vol:1.15},
  dteam:{rd:[1,2],gap:.14,crack:.6,body:[1700,.9,.07,.7],low:[150,60,.05,.25],vol:1.05},
  ew:{rd:[1,2],gap:.14,crack:.6,body:[1700,.9,.07,.7],low:[150,60,.05,.25],vol:1.05},
  aa:{rd:[1,2],gap:.14,crack:.6,body:[1700,.9,.07,.7],low:[150,60,.05,.25],vol:1.05},
  at:{rd:[1,2],gap:.14,crack:.6,body:[1600,.9,.07,.7],low:[150,60,.05,.25],vol:1.05},
  mg:{rd:[5,9],gap:.075,crack:.8,body:[1250,.8,.08,.85],low:[115,50,.07,.45],vol:1},
  sniper:{rd:[1,1],gap:.2,crack:1.1,body:[950,.7,.17,1],low:[95,38,.16,.65],vol:1.25},
  hmv:{rd:[4,7],gap:.11,crack:.7,body:[800,.8,.1,.9],low:[90,42,.12,.7],vol:1.2},
  ifv:{rd:[3,5],gap:.22,crack:.5,body:[620,.7,.13,.9],low:[80,36,.2,.9],vol:1.35},
  zu:{rd:[6,10],gap:.07,crack:.6,body:[900,.7,.1,.85],low:[95,45,.1,.7],vol:1.25},
  gunship:{rd:[8,12],gap:.09,crack:.5,body:[720,.7,.1,.85],low:[85,40,.12,.75],vol:1.3},
  tank:{rd:[1,1],gap:.2,crack:.6,body:[420,.6,.55,1],low:[62,26,.8,1],vol:1.8},
  spg:{rd:[1,1],gap:.2,crack:.5,body:[360,.6,.7,1],low:[55,22,1,1],vol:1.9},
  mortar:{rd:[1,1],gap:.2,crack:0,body:[520,.7,.22,.8],low:[210,90,.16,.9],vol:1}};
function sndRound(V,t,W){if(W.crack)sndNz(V,t,.018,'highpass',3200,.7,W.crack*.9,.001);const b=W.body;sndNz(V,t,b[2],'bandpass',b[0],b[1],b[3],.002,b[0]*.55);
  if(W.low)sndTn(V,t,W.low[2],W.low[0],W.low[1],W.low[3],'sine',.003);}
// 부대 하나의 사격 한 번: 쏘는 병사 수만큼 엇갈려 쏜다
function sndShot(a,tx,tz){const W=WPN[a.type];if(!W||!audio())return;const x=a.x??a.c+.5,z=a.z??a.r+.5;if(a.type==='at'){sndLaunch(x,z,'rocket');}else{const V=sndVoice(x,z,{vol:W.vol,dur:2});if(V){
  const men=UT[a.type]&&UT[a.type].cls==='inf'?Math.max(1,(a._sh||[]).length):1;let t=V.t;
  for(let m=0;m<men;m++){let tt=t+(m?Math.random()*.35:0);const n=W.rd[0]+Math.floor(Math.random()*(W.rd[1]-W.rd[0]+1));for(let i=0;i<n;i++){sndRound(V,tt,W);tt+=W.gap*(.85+Math.random()*.3);}}}}
  if(typeof G!=='undefined'&&G&&a.nat===G.viewer&&!isAI(a.nat)){const wm=SFX.ct||(SFX.ct=new WeakMap());const lt=wm.get(a);if(lt==null||(G.time||0)-lt>20)sndRadio('contact');wm.set(a,G.time||0);}}
// 총알이 닿은 곳: 가까울 때만 들리는 "퍽", 가끔 도탄음
function sndImpact(x,z){const V=sndVoice(x,z,{vol:.35,dur:.6,wet:.3});if(!V)return;sndNz(V,V.t,.04,'bandpass',2600,1.2,.6);if(Math.random()<.14)sndTn(V,V.t+.01,.32,3400,1100,.12,'sine',.005);}

/* ---------- 폭발 ---------- */
// size: .5 작은 탄(RPG·기관포탄) / 1 포탄 / 1.6 항공폭탄·유폭. 앞의 "쾅" + 낮은 울림 + 떨어지는 파편 소리
function sndBoom(x,z,size=1,o={}){const V=sndVoice(x,z,{vol:(o.vol??1)*(.7+size*.6),dur:3+size,wet:1.3,y:o.y});if(!V)return;const t=V.t;
  sndNz(V,t,.06,'highpass',1400,.6,.9,.001);sndNz(V,t,.5+size*.9,'lowpass',1100,.6,1,.004,140);sndTn(V,t,.5+size*.6,70,24,1,'sine',.006);
  if(size>.8)sndNz(V,t+.05,1.4+size*1.2,'lowpass',220,.5,.5,.08,60);
  const deb=Math.round(4+size*8);for(let i=0;i<deb;i++)sndNz(V,t+.25+Math.random()*(.6+size*.9),.03,'bandpass',1800+Math.random()*2600,1.5,.05+Math.random()*.07,.001);}
// 건물 붕괴: 길게 무너지는 울림과 쏟아지는 잔해
function sndCrumble(x,z,f){const V=sndVoice(x,z,{vol:1.4,dur:5,wet:1.4});if(!V)return;const t=V.t;sndNz(V,t,3.2,'lowpass',380,.6,.9,.3,90);sndTn(V,t,2.5,48,26,.8,'sine',.2);
  for(let i=0;i<26;i++)sndNz(V,t+.2+Math.random()*2.8,.05+Math.random()*.08,'bandpass',700+Math.random()*2500,1.2,.08+Math.random()*.16,.002);}
// 유폭: 큰 폭발 뒤로 탄약이 튀며 터진다
function sndCook(x,z,big){sndBoom(x,z,big?1.6:1.1);const V=sndVoice(x,z,{vol:.8,dur:5});if(!V)return;for(let i=0;i<(big?18:9);i++){const tt=V.t+.4+Math.random()*3.5;sndNz(V,tt,.05,'bandpass',900+Math.random()*1500,1,.4,.001);}}
// 발사음: RPG·대공미사일은 "퍽"하고 쉭 날아간다. 박격포는 "텅", 자주포·전차는 큰 포성
function sndLaunch(x,z,kind){if(kind==='mortar'){const V=sndVoice(x,z,{vol:1.1,dur:1});if(V)sndRound(V,V.t,WPN.mortar);return;}
  if(kind==='gun'){const V=sndVoice(x,z,{vol:1.9,dur:3,wet:1.3});if(V)sndRound(V,V.t,WPN.spg);return;}
  const V=sndVoice(x,z,{vol:kind==='missile'?1:.95,dur:2});if(!V)return;sndNz(V,V.t,.08,'lowpass',900,.7,.9,.002);sndTn(V,V.t,.12,120,50,.7);
  sndNz(V,V.t+.03,kind==='missile'?1.5:.7,'bandpass',500,2,.5,.06,kind==='missile'?3200:2400);}
// 포탄이 날아오는 휘파람(포탄 낙하 직전)
function sndWhistle(x,z,dur){const V=sndVoice(x,z,{vol:.35,dur,dry:1});if(!V)return;sndTn(V,V.t,dur,1900,650,.25,'sine',dur*.5);}

/* ---------- 계속 나는 소리: 헬기 로터, 드론, 전투기, 차량 엔진, 불 ---------- */
function sndLoopMake(kind){const a=SFX.ctx;const out=a.createGain();out.gain.value=0;const lp=a.createBiquadFilter();lp.type='lowpass';lp.frequency.value=8000;const pn=a.createStereoPanner?a.createStereoPanner():null;
  out.connect(lp);if(pn){lp.connect(pn);pn.connect(SFX.bus.fx);}else lp.connect(SFX.bus.fx);const src=[];
  const nz=(type,f,q,g)=>{const s=a.createBufferSource();s.buffer=SFX.noise;s.loop=true;const fl=a.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;const gg=a.createGain();gg.gain.value=g;s.connect(fl);fl.connect(gg);gg.connect(out);s.start(0,Math.random()*1.5);src.push(s);return gg;};
  const osc=(type,f,g,to)=>{const o=a.createOscillator();o.type=type;o.frequency.value=f;const gg=a.createGain();gg.gain.value=g;o.connect(gg);gg.connect(to||out);o.start();src.push(o);return o;};
  const lfo=(rate,param,depth)=>{const o=a.createOscillator();o.frequency.value=rate;const d=a.createGain();d.gain.value=depth;o.connect(d);d.connect(param);o.start();src.push(o);return o;};
  let base=1;
  if(kind==='rotor'){const g=nz('lowpass',360,.8,1.4);g.gain.value=.7;lfo(5.4,g.gain,.7);const w=nz('bandpass',1700,6,.12);lfo(5.4,w.gain,.08);osc('sawtooth',58,.12);base=1.3;}
  else if(kind==='drone'||kind==='fpv'){const f=kind==='fpv'?310:205;const bp=a.createBiquadFilter();bp.type='bandpass';bp.frequency.value=kind==='fpv'?1500:1100;bp.Q.value=.8;bp.connect(out);
    for(const k of [1,1.034,.973,1.061]){const o=osc('sawtooth',f*k,.12,bp);lfo(.3+Math.random()*.6,o.frequency,f*.03);}nz('bandpass',3000,.7,.08);base=kind==='fpv'?.55:.38;}
  else if(kind==='jet'){nz('lowpass',1300,.5,1);nz('bandpass',3800,1.2,.25);osc('sawtooth',95,.1);base=2.2;}
  else if(kind==='tracks'||kind==='wheels'){const f=kind==='tracks'?36:52;const o=osc('sawtooth',f,.5);lfo(.2,o.frequency,3);nz('lowpass',200,.6,.5);
    if(kind==='tracks'){const c=nz('bandpass',2400,3,.0);lfo(8.5,c.gain,.18);}base=kind==='tracks'?.7:.45;out.gain.value=0;}
  else if(kind==='fire'){const s=a.createBufferSource();s.buffer=SFX.crk;s.loop=true;const hp=a.createBiquadFilter();hp.type='highpass';hp.frequency.value=600;s.connect(hp);hp.connect(out);s.start(0,Math.random()*2);src.push(s);nz('lowpass',240,.5,.25);base=.55;}
  return {kind,out,lp,pn,src,base};}
function sndLoopStop(L){const a=SFX.ctx;const t=a.currentTime;L.out.gain.setTargetAtTime(0,t,.12);setTimeout(()=>{for(const s of L.src)try{s.stop();}catch(e){}L.out.disconnect();},900);}
// 매 화면(07-view3d)에서 부른다. 들릴 만한 소리 8개만 남긴다.
function sndFrame(now){const a=SFX.ctx;if(!a)return;if(now-(SFX.lf||0)<70)return;SFX.lf=now;const want=new Map();
  if(SFX.on&&a.state==='running'&&typeof G!=='undefined'&&G&&!G.paused&&!G.over){const e=sndEar();const add=(k,kind,x,z,y,v)=>{const P=sndPlace(x,z,e,y);const g=P.gain*v;if(g>.01)want.set(k,{kind,P,g});};
    for(const u of G.units){const t=UT[u.type];if(!t||u.x==null)continue;const o=typeof V3!=='undefined'&&V3.uo?V3.uo.get(u.id):null;const y=o?o.position.y:0;
      if(t.heli)add('u'+u.id,'rotor',u.x,u.z,y,1);else if(u.type==='drone'||u.type==='fpv')add('u'+u.id,u.type,u.x,u.z,y,1);
      else if(t.cls==='veh'&&u.path&&u.path.length)add('u'+u.id,u.type==='hmv'?'wheels':'tracks',u.x,u.z,0,1);}
    SFX.track=SFX.track.filter(T=>T.o.parent&&T.o.visible!==false);for(const T of SFX.track)add(T.k,T.kind,T.o.position.x,T.o.position.z,T.o.position.y,1);
    if(G.fires)for(const k of G.fires)add('f'+k,'fire',kc(k)+.5,kr(k)+.5,0,1);}
  const L=[...want.entries()].sort((p,q)=>q[1].g-p[1].g).slice(0,8);const keep=new Set(L.map(p=>p[0]));
  for(const [k,Lp] of SFX.loops)if(!keep.has(k)){sndLoopStop(Lp);SFX.loops.delete(k);}
  const t=a.currentTime;for(const [k,w] of L){let Lp=SFX.loops.get(k);if(!Lp){Lp=sndLoopMake(w.kind);SFX.loops.set(k,Lp);}
    Lp.out.gain.setTargetAtTime(w.g*Lp.base,t,.15);Lp.lp.frequency.setTargetAtTime(w.P.cut,t,.15);if(Lp.pn)Lp.pn.pan.setTargetAtTime(w.P.pan,t,.15);}
  sndAmb(t);}
// 3D 연출 물체(수송 헬기·전투기)를 따라가는 소리
function sndTrack(o,kind){if(!SFX.ctx||!o)return;SFX.track.push({o,kind,k:'t'+(SFX.tk=(SFX.tk||0)+1)});}

/* ---------- 환경음: 바람, 비, 멀리서 들리는 전투 ---------- */
function sndAmb(t){const a=SFX.ctx;let A=SFX.amb;const live=SFX.on&&typeof G!=='undefined'&&G&&!G.over;
  if(!A){A=SFX.amb={};const mk=(type,f,q)=>{const s=a.createBufferSource();s.buffer=SFX.noise;s.loop=true;const fl=a.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;const g=a.createGain();g.gain.value=0;s.connect(fl);fl.connect(g);g.connect(SFX.bus.amb);s.start();return {g,fl};};
    A.wind=mk('lowpass',420,.9);A.rain=mk('highpass',2200,.5);A.hum=mk('bandpass',140,.8);A.next=0;}
  const wx=live?G.wx:'clear';const rain=wx==='storm'?1:wx==='rain'?.55:0;const night=live&&typeof isNight==='function'&&isNight();
  A.wind.g.gain.setTargetAtTime(live?.16+.08*Math.sin(t*.13)+(wx==='storm'?.15:0):0,t,.8);A.wind.fl.frequency.setTargetAtTime(330+160*Math.sin(t*.21),t,.8);
  A.rain.g.gain.setTargetAtTime(live?rain*.22:0,t,1);A.hum.g.gain.setTargetAtTime(live?(night?.04:.08):0,t,1);
  // 멀리서 들리는 다른 구역의 교전: 귀에서 먼 곳에 가끔 짧은 연사나 둔한 폭음
  if(live&&!G.paused&&!G.boot&&t>A.next){A.next=t+4+Math.random()*9;const e=sndEar(),ang=Math.random()*6.28,d=22+Math.random()*18;const x=e.x+Math.cos(ang)*d,z=e.z+Math.sin(ang)*d;
    if(Math.random()<.65){const V=sndVoice(x,z,{vol:.9,dur:3,bus:'amb',dry:1});if(V){const W=Math.random()<.5?WPN.mg:WPN.rifle;let tt=V.t;for(let i=0;i<3+Math.random()*6;i++){sndRound(V,tt,W);tt+=W.gap*(1+Math.random());}}}
    else{const V=sndVoice(x,z,{vol:1.4,dur:3,bus:'amb',dry:1});if(V){sndNz(V,V.t,1.4,'lowpass',500,.5,1,.01,90);sndTn(V,V.t,1,55,24,.8);}}}}

/* ---------- 무전 ---------- */
// 알아들을 수 없는 합성 음성: 성대 톱니파 → 모음 포먼트 두 개 → 무전기 대역(400–2800Hz) → 찌그러짐. 앞뒤로 스켈치 "치익"
const RADIO={ack:{p:1,syl:[3,5],rate:.12,pitch:110},contact:{p:3,syl:[6,9],rate:.1,pitch:135},casualty:{p:4,syl:[7,10],rate:.09,pitch:150},
  capture:{p:2,syl:[5,7],rate:.12,pitch:115},lost:{p:3,syl:[6,8],rate:.1,pitch:140},support:{p:2,syl:[5,8],rate:.11,pitch:105},reinforce:{p:1,syl:[4,6],rate:.12,pitch:112},hq:{p:2,syl:[6,9],rate:.12,pitch:98}};
const VOWEL=[[800,1200],[500,1900],[300,2300],[500,900],[350,800],[650,1700]];
function sndRadio(kind){const R=RADIO[kind];const a=audio();if(!R||!a)return false;const now=a.currentTime;if(now<SFX.radioEnd&&R.p<=SFX.radioP)return false;if(now<SFX.radioEnd-.3&&R.p>SFX.radioP)SFX.radioCut&&SFX.radioCut();
  const out=a.createGain();out.gain.value=1;const hp=a.createBiquadFilter();hp.type='highpass';hp.frequency.value=420;const lp=a.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2700;
  const sh=a.createWaveShaper();const cv=new Float32Array(256);for(let i=0;i<256;i++){const x=i/128-1;cv[i]=Math.tanh(x*3.2)*.8;}sh.curve=cv;const og=a.createGain();og.gain.value=.55;
  out.connect(hp);hp.connect(lp);lp.connect(sh);sh.connect(og);og.connect(SFX.bus.radio);SFX.radioCut=()=>{og.gain.setTargetAtTime(0,a.currentTime,.02);};
  const V={a,mix:out};const t0=now+.05;sndNz(V,t0,.07,'bandpass',2600,.5,.5,.002);sndTn(V,t0+.02,.05,1250,0,.18,'square');
  const pitch=R.pitch*(.9+Math.random()*.2);const n=R.syl[0]+Math.floor(Math.random()*(R.syl[1]-R.syl[0]+1));let t=t0+.13;
  for(let i=0;i<n;i++){const d=R.rate*(.7+Math.random()*.7);const [f1,f2]=VOWEL[Math.floor(Math.random()*VOWEL.length)];const f0=pitch*(1+(Math.random()-.5)*.12)*(1-i/n*.12);
    const o=a.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(f0,t);o.frequency.linearRampToValueAtTime(f0*(.92+Math.random()*.14),t+d);const sg=a.createGain();sg.gain.setValueAtTime(.0001,t);sg.gain.exponentialRampToValueAtTime(.5,t+.015);sg.gain.setValueAtTime(.5,t+d*.7);sg.gain.exponentialRampToValueAtTime(.0001,t+d);
    for(const [f,q,g] of [[f1,6,1],[f2,9,.6]]){const bp=a.createBiquadFilter();bp.type='bandpass';bp.frequency.value=f;bp.Q.value=q;const gg=a.createGain();gg.gain.value=g*2.2;o.connect(bp);bp.connect(gg);gg.connect(sg);}
    sg.connect(out);o.start(t);o.stop(t+d+.02);if(Math.random()<.5)sndNz(V,t,.035,'bandpass',3800,1.5,.25,.002);
    t+=d+(i%3===2?.07+Math.random()*.08:.012);}
  sndNz(V,t0,t-t0,'bandpass',1900,.6,.06,.04);sndNz(V,t+.02,.16,'bandpass',2400,.5,.55,.004);
  SFX.radioEnd=t+.2;SFX.radioP=R.p;return true;}

/* ---------- 조작음과 옛 호출 ---------- */
// sfx(kind, vol, x, z): 자리(x,z)가 있으면 전장 소리, 없으면 화면 조작음
function sfx(kind,vol=1,x,z){const a=audio();if(!a)return;if(x!=null&&z!=null){
    if(kind==='boom')sndBoom(x,z,vol);else if(kind==='hit')sndBoom(x,z,.45*vol);else if(kind==='arty')sndBoom(x,z,1.1*vol);else if(kind==='launch')sndLaunch(x,z,'rocket');else if(kind==='crumble')sndCrumble(x,z);return;}
  const now=performance.now();if(now-(SFX.last[kind]||0)<70)return;SFX.last[kind]=now;const t=a.currentTime;
  const env=(node,peak,dur,attack=.005)=>{const g=a.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(peak*vol,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+dur);node.connect(g);g.connect(SFX.bus.ui);return g;};
  const noise=(dur,type,freq,q=1)=>{const s=a.createBufferSource();s.buffer=SFX.noise;const f=a.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;s.connect(f);s.start(t,Math.random());s.stop(t+dur+.05);return f;};
  const tone=(freq,dur,type='sine',to)=>{const o=a.createOscillator();o.type=type;o.frequency.setValueAtTime(freq,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+dur);o.start(t);o.stop(t+dur+.05);return o;};
  if(kind==='click'){env(tone(880,.05),.12,.05);}
  else if(kind==='build'){env(tone(330,.12,'triangle'),.16,.12);}
  else if(kind==='turn'){env(tone(660,.18),.18,.2);}
  else if(kind==='distant'){env(noise(1.6,'lowpass',260),.5*1,1.5,.05);env(tone(48,1.2,'sine',24),.35,1.2,.05);}
  else if(kind==='boom'){env(noise(.9,'lowpass',380),.75,.85,.01);env(tone(70,.6,'sine',30),.5,.6);}
  else if(kind==='win'){[523,659,784,1046].forEach((f,i)=>{const o=a.createOscillator();o.type='triangle';o.frequency.value=f;const g=a.createGain();g.gain.setValueAtTime(.0001,t+i*.13);g.gain.exponentialRampToValueAtTime(.18*vol,t+i*.13+.02);g.gain.exponentialRampToValueAtTime(.0001,t+i*.13+.5);o.connect(g);g.connect(SFX.bus.ui);o.start(t+i*.13);o.stop(t+i*.13+.6);});}
  else if(kind==='shot'||kind==='hit'||kind==='arty'||kind==='launch'||kind==='flak'){const e=sndEar();if(kind==='launch')sndLaunch(e.x,e.z,'rocket');else sndBoom(e.x,e.z,kind==='arty'?1:.5,{vol:.6});}}
function toggleSound(){SFX.on=!SFX.on;sndSave();if(SFX.on){audio();sndApplyVol();sfx('click');}else sndApplyVol();sndPopSync();}
function sndPopSync(){if(typeof document==='undefined')return;const b=document.getElementById('b-smute');if(b){b.setAttribute('aria-pressed',SFX.on?'true':'false');b.textContent=SFX.on?'켜짐':'꺼짐';}
  document.querySelectorAll('[data-snd]').forEach(i=>{i.value=Math.round(SFX.vol[i.dataset.snd]*100);i.disabled=!SFX.on;});const sn=document.getElementById('b-snd');if(sn)sn.setAttribute('aria-pressed',SFX.on?'true':'false');}
