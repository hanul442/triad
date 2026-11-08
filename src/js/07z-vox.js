/* ===================== 무전 음성: 부대들이 주고받는 무전을 귀로 듣는다 =====================
   - 본부의 명령, 부대의 수신 응답, 적 발견, 사상자, 격파, 거점 확보·상실, 화력 지원 요청, 재밍 두절·전령을 한국어 문장으로 만든다.
   - 기기에 한국어 음성이 있으면 말소리(speechSynthesis)로 읽고, 앞뒤로 무전기 "치익"과 잡음을 깐다.
     없거나 설정이 '잡음'이면 알아들을 수 없는 무전 소리(02b sndRadio)에 자막만 붙인다.
   - 무전망은 한 번에 한 교신만 싣는다. 급한 교신(부상자, 적 발견)이 먼저고, 오래 기다린 교신은 버린다.
   - 들리는 세력: 내 편. 관전 중 전 세력 시야면 모든 세력(세력마다 목소리 높이가 다르다), 한 세력 시야면 그 세력.
   - AI의 기동 명령은 너무 많아 카메라 가까이 있거나 따라가는 부대 것만 골라 듣는다.
   - 설정: 소리 창의 '무전 말'(목소리/잡음/끔)과 '자막'. 이 기기에만 저장. */
const VOX={mode:'voice',sub:true,q:[],busy:false,t:{},wait:new Set(),voice:null,lines:[]};
const VOX_K='triad-vox-v1';
const VOX_HQ=['독수리','호랑이','늑대','매'];
const VOX_CS={rifle:'소총 #분대',mg:'기관총 #팀',at:'대전차 #팀',sniper:'저격 #조',eng:'공병 #분대',mortar:'박격포 #반',ifv:'장갑차 #호',tank:'전차 #호',
  drone:'드론 #호',hmv:'험비 #호',spg:'자주포 #호',fpv:'자폭드론 #호',aa:'대공 #팀',ew:'전자전 #팀',zu:'대공포 #호',gunship:'헬기 #호',dteam:'드론 #팀',
  atgm:'미사일 #팀',mlrs:'로켓 #호',sup:'보급 #호',rec:'구난 #호'};
const VOX_P={cas:4,contact:3,cap:3,lost:3,kill:2,gone:2,sup:2,jam:2,order:1,ack:1,arr:1,test:5};
/* 호출부호: 세력·병종마다 들어온 순서대로 1, 2, 3… */
function voxCs(u){if(!u)return '';if(u._cs==null){const n=G._csN=G._csN||{};const k=u.nat+'|'+u.type;u._cs=n[k]=(n[k]||0)+1;}
  return (VOX_CS[u.type]||(UT[u.type].n+' #호')).replace('#',u._cs);}
const voxHq=n=>VOX_HQ[n]||'본부';
/* 자리 말하기: 가까운 거점 이름, 없으면 '다 4 구역' */
const VOX_COL='가나다라마바사아자차카타파하';
function voxPlace(x,z){let best=null,bd=1e9;for(const o of G.objs||[]){const d=Math.hypot(o.c+.5-x,o.r+.5-z);if(d<bd){bd=d;best=o;}}
  if(best&&bd<4)return best.name;return `${VOX_COL[Math.floor(x/4)%VOX_COL.length]} ${Math.floor(z/4)+1} 구역`;}
/* 방향(+z가 남쪽)과 거리(1칸 ≈ 12m) */
function voxDir(dx,dz){const i=((Math.round(Math.atan2(dz,dx)/(Math.PI/4))%8)+8)%8;return ['동','남동','남','남서','서','북서','북','북동'][i];}
const voxM=d=>Math.max(10,Math.round(d*12/10)*10);
const voxTn=t=>(UT[t]?UT[t].n:'부대').replace(/분대|팀$/,'').replace('FPV ','')||'부대';
/* 교신 한 줄: {nat, who(말하는 쪽), txt, k} */
function voxLine(k,o){const u=o.u,n=o.nat??(u?u.nat:0),cs=voxCs(u),hq=voxHq(n);const R=(a)=>a[Math.floor(Math.random()*a.length)];
  switch(k){
    case 'order':{const more=o.more?` 외 ${o.more}개 부대`:'';let w;
      if(o.kind==='atk')w=`${o.tgt?voxTn(o.tgt.type):'표적'} 제압하라`;else if(o.kind==='bldg')w=`${o.place} 건물에 사격하라`;
      else if(o.kind==='stop'||o.kind==='hold')w='현 위치에서 대기';else if(o.kind==='floor')w='층을 옮겨라';else w=`${o.place} 쪽으로 이동하라`;
      return {nat:n,who:hq,txt:`${cs}${more}, 여기 ${hq}. ${w}, 이상.`};}
    case 'ack':return {nat:n,who:cs,txt:`${hq}, ${cs}. ${o.kind==='atk'?'수신, 사격 개시.':o.kind==='move'?R(['수신, 이동한다.','알았다, 지금 간다.']):'수신 완료.'}`};
    case 'jam':return {nat:n,who:hq,txt:`${cs}, ${cs}, 여기 ${hq}. 응답하라. 잡음이 심하다.`,jam:1};
    case 'run':return {nat:n,who:hq,txt:`${cs}와 교신 두절. 전령을 보낸다.`,jam:1};
    case 'contact':return {nat:n,who:cs,txt:`${hq}, 여기 ${cs}. 적 ${voxTn(o.e.type)}, ${voxDir(o.e.x-u.x,o.e.z-u.z)}쪽 ${voxM(Math.hypot(o.e.x-u.x,o.e.z-u.z))}미터. 교전 중!`};
    case 'cas':return o.out==='lw'?{nat:n,who:cs,txt:`${cs}, 경상자 하나. 계속 싸운다.`}:o.out==='kia'?{nat:n,who:cs,txt:`${hq}, ${cs}. 한 명 전사.`}:{nat:n,who:cs,txt:`위생병! 위생병! ${cs}, 중상자 발생!`};
    case 'kill':return {nat:n,who:cs,txt:`${hq}, ${cs}. 적 ${voxTn(o.e.type)} 격파!`};
    case 'gone':return {nat:n,who:hq,txt:`${cs}, 응답하라. ${cs}… 교신 끊겼다.`};
    case 'cap':return {nat:n,who:cs,txt:`${hq}, 여기 ${cs}. ${o.obj} 확보!`};
    case 'lost':return {nat:n,who:hq,txt:`전 부대, ${o.obj} 빼앗겼다. 다시 찾아라.`};
    case 'sup':return {nat:n,who:hq,txt:`${R(['포대','항공'])} 나와라, 여기 ${hq}. ${SUP[o.kind]?SUP[o.kind].n:'화력 지원'} 요청, ${o.place}. 이상.`};
    case 'arr':return {nat:n,who:cs,txt:`${hq}, ${cs} 집결지 도착. 명령 바란다.`};
    case 'test':return {nat:n,who:hq,txt:'무전 점검. 감도 양호, 이상.'};}
  return null;}
/* 이 세력의 무전이 들리나 */
function voxHears(n){if(typeof G==='undefined'||!G||G.boot||G.over)return false;if(typeof radioShows==='function')return radioShows(n);return n===G.viewer;}
/* 카메라(귀) 가까이 있거나 따라가는 부대인가: AI 명령은 이런 부대 것만 */
function voxNear(u){if(!u)return false;if(UI.follow===u.id||(typeof PR!=='undefined'&&PR.on&&PR.sub===u)||UI.sel===u)return true;
  if(typeof V3==='undefined'||!V3.cs)return false;return Math.hypot(u.x-V3.cs.x,u.z-V3.cs.z)<Math.max(8,Math.min(16,V3.cs.d*.45));}
/* 같은 종류 교신은 세력마다 잠깐 쉬었다가(실제 시간 초) */
function voxGap(key,s){const now=Date.now();if(now-(VOX.t[key]||0)<s*1000)return false;VOX.t[key]=now;return true;}
function voxEv(k,o){if(VOX.mode==='off'||typeof document==='undefined')return null;const n=o.nat??(o.u?o.u.nat:null);if(n==null||!voxHears(n))return null;
  const L2=voxLine(k,o);if(!L2)return null;const own=!isAI(n);const it={...L2,g:G,k,p:(VOX_P[k]||1)+(own&&(k==='order'||k==='ack')?2:0),at:Date.now(),ttl:k==='order'?4000:k==='ack'?6000:7000,id:o.u?o.u.id:null};
  // 같은 부대의 같은 종류 교신이 이미 줄에 있으면 새 것으로 바꾼다
  VOX.q=VOX.q.filter(x=>!(x.k===k&&x.id!=null&&x.id===it.id));VOX.q.push(it);
  if(VOX.q.length>4){VOX.q.sort((a,b)=>b.p-a.p||a.at-b.at);VOX.q.length=4;}return it;}

/* ---------- 듣기: 한국어 음성 고르기, 무전기 소리, 자막 ---------- */
function voxVoice(){if(typeof speechSynthesis==='undefined')return null;if(VOX.voice)return VOX.voice;const vs=speechSynthesis.getVoices().filter(v=>/^ko/i.test(v.lang));
  return VOX.voice=vs.find(v=>v.localService)||vs[0]||null;}
const voxSpeaks=()=>VOX.mode==='voice'&&!!voxVoice();
/* 무전기 "치익"(누를 때·뗄 때)과 말하는 동안 깔리는 잡음 */
function voxSquelch(end,jam){const a=SFX.ctx;if(!a||!SFX.on)return;const t=a.currentTime+.01;const V={a,mix:SFX.bus.radio};
  sndNz(V,t,end?.18:.08,'bandpass',end?2400:2600,.5,end?.5:.45,.003);if(!end)sndTn(V,t+.02,.05,1250,0,.15,'square');if(jam&&!end)sndNz(V,t,.5,'bandpass',1500,.4,.5,.01);}
function voxBed(on,jam){const a=SFX.ctx;if(!a)return;if(!VOX.bed){const s=a.createBufferSource();s.buffer=SFX.noise;s.loop=true;const f=a.createBiquadFilter();f.type='bandpass';f.frequency.value=1900;f.Q.value=.7;
    const g=a.createGain();g.gain.value=0;s.connect(f);f.connect(g);g.connect(SFX.bus.radio);s.start();VOX.bed=g;}
  VOX.bed.gain.setTargetAtTime(on&&SFX.on?(jam?.32:.05):0,a.currentTime,.04);}
function voxSub(it){if(!VOX.sub||typeof document==='undefined')return;let el=document.getElementById('rvox');
  if(!el){el=document.createElement('div');el.id='rvox';el.className='rvox';el.setAttribute('aria-hidden','true');(document.getElementById('app')||document.body).appendChild(el);}
  VOX.lines.push({it,t:Date.now()});if(VOX.lines.length>3)VOX.lines.shift();voxSubDraw();}
function voxSubDraw(){const el=typeof document!=='undefined'&&document.getElementById('rvox');if(!el)return;const now=Date.now();VOX.lines=VOX.lines.filter(l=>now-l.t<7000);
  el.innerHTML=VOX.lines.map(l=>`<p class="${l.it.jam?'jm':''}${now-l.t>5500?' old':''}"><b style="color:${mapCol(l.it.nat)}">${l.it.who}</b> ${l.it.txt.replace(/</g,'&lt;')}</p>`).join('');el.hidden=!VOX.lines.length||!VOX.sub;
  // 하단 바 바로 위에 붙인다(휴대폰에선 하단 바가 높다). 좁은 화면은 두 줄만
  if(!el.hidden){const ab=document.getElementById(typeof PR!=='undefined'&&PR.on?'press':'actbar');const r=ab&&!ab.hidden?ab.getBoundingClientRect():null;
    const top=r&&r.height&&!(typeof PR!=='undefined'&&PR.on)?r.top:innerHeight-56;el.style.bottom=Math.max(12,innerHeight-top+8)+'px';
    if(innerWidth<560){const ps=el.querySelectorAll('p');for(let i=0;i<ps.length-2;i++)ps[i].remove();}}}
/* 줄에서 하나 꺼내 들려준다 */
function voxPump(){if(VOX.busy||!VOX.q.length||!SFX.on||VOX.mode==='off')return;const test=VOX.q.some(x=>x.k==='test');if(!test&&(typeof G==='undefined'||!G||G.paused||G.boot))return;
  const now=Date.now();VOX.q=VOX.q.filter(x=>now-x.at<x.ttl&&(x.k==='test'||x.g===G&&voxHears(x.nat)));if(!VOX.q.length)return;VOX.q.sort((a,b)=>b.p-a.p||a.at-b.at);const it=VOX.q.shift();
  VOX.busy=true;voxSub(it);const done=()=>{if(!VOX.busy)return;clearTimeout(VOX.to);voxBed(false);voxSquelch(true,it.jam);setTimeout(()=>{VOX.busy=false;},260);};
  if(voxSpeaks()){try{audio();voxSquelch(false,it.jam);voxBed(true,it.jam);const s=new SpeechSynthesisUtterance(it.txt);s.voice=voxVoice();s.lang=s.voice.lang;
      // 세력마다, 말하는 사람마다 목소리 높이를 조금씩 다르게. 배속이 빠르면 빨리 말한다
      let h=0;for(const ch of it.who)h=(h*31+ch.charCodeAt(0))%997;s.pitch=Math.max(.5,Math.min(1.6,[1,.82,1.18,.92][it.nat%4]+(h%7-3)*.03+(it.p>=3?.08:0)));
      s.rate=Math.min(1.7,(it.p>=3?1.25:1.12)*(G.spd>=4?1.2:1));s.volume=Math.min(1,SFX.vol.master*SFX.vol.radio*1.3);
      s.onend=s.onerror=done;VOX.to=setTimeout(done,1500+it.txt.length*110);speechSynthesis.speak(s);return;}catch(e){}}
  // 목소리가 없으면: 알아들을 수 없는 무전 소리 + 자막
  VOX.inner=true;try{_voxRadio(VOX_R[it.k]||'ack');}finally{VOX.inner=false;}const d=SFX.ctx?Math.max(.6,(SFX.radioEnd||0)-SFX.ctx.currentTime):1.2;VOX.to=setTimeout(done,d*1000);}
const VOX_R={order:'hq',ack:'ack',jam:'lost',run:'lost',contact:'contact',cas:'casualty',kill:'capture',gone:'lost',cap:'capture',lost:'lost',sup:'support',arr:'reinforce',test:'ack'};
let _voxRadio=typeof sndRadio==='function'?sndRadio:()=>false;
function voxLoad(){try{const o=JSON.parse(localStorage.getItem(VOX_K)||'null');if(o){if(['voice','beep','off'].includes(o.mode))VOX.mode=o.mode;VOX.sub=o.sub!==false;}}catch(e){}}
function voxSave(){try{localStorage.setItem(VOX_K,JSON.stringify({mode:VOX.mode,sub:VOX.sub}));}catch(e){}}
function voxSet(mode,sub){if(mode)VOX.mode=mode;if(sub!=null)VOX.sub=!!sub;voxSave();VOX.q=[];if(VOX.mode!=='voice'&&typeof speechSynthesis!=='undefined')speechSynthesis.cancel();voxSync();voxSubDraw();}
function voxSync(){if(typeof document==='undefined')return;const s=document.getElementById('snd-vox');if(s)s.value=VOX.mode;const c=document.getElementById('snd-sub');if(c)c.checked=VOX.sub;
  const h=document.getElementById('snd-voxh');if(h)h.hidden=!(VOX.mode==='voice'&&!voxVoice());}

/* ---------- 사건 연결 ---------- */
(function(){
  // 사람이 내린 명령: 본부가 부르고, 닿으면 부대가 답한다
  const _rs=radioSend;radioSend=function(n,us,k,a){const r=_rs.apply(this,arguments);try{const g=(us||[]).filter(u=>u&&G.units.includes(u));
      if(g.length&&k!=='floor'){const u=g[0];const tgt=k==='atk'?G.units.find(o=>o.id===(a||[])[0]):null;
        const place=k==='move'?voxPlace(a[0],a[1]):k==='bldg'?voxPlace(a[1]+.5,a[0]+.5):'';
        if(voxEv('order',{u,nat:n,kind:k,tgt,place,more:g.length-1}))for(const x of g)VOX.wait.add(x.id);}}catch(e){}return r;};
  // AI 명령: 카메라 가까이 있거나 따라가는 부대 것만, 세력마다 4초에 한 번
  const _as=aiRadioSend;aiRadioSend=function(n,list){try{if(VOX.mode!=='off'&&voxHears(n)){const pick=list.find(([u])=>voxNear(u));
      if(pick&&voxGap('ai'+n,4)){const [u,s]=pick;const tgt=s.tgt!=null?G.units.find(o=>o.id===s.tgt):null;const kind=tgt?'atk':s.end?'move':'hold';
        if(voxEv('order',{u,nat:n,kind,tgt,place:s.end?voxPlace(s.end[0],s.end[1]):''}))VOX.wait.add(u.id);}}}catch(e){}return _as.apply(this,arguments);};
  const _rx=radioExec;radioExec=function(k,a,us){const r=_rx.apply(this,arguments);try{const u=(us||[]).find(x=>VOX.wait.has(x.id));
      if(u){for(const x of us)VOX.wait.delete(x.id);let kind=k;if(k==='ai'){const s=a.st&&a.st[u.id];kind=s&&s.tgt!=null?'atk':s&&s.end?'move':'hold';}voxEv('ack',{u,kind});}}catch(e){}return r;};
  // 재밍: 처음 끊길 때와 전령을 보낼 때
  const _rt=radioTick;radioTick=function(){const r=_rt.apply(this,arguments);try{for(const e of G.rq||[]){const id=e.us[0];if(!VOX.wait.has(id))continue;
      if(e.run&&!e._vr){e._vr=1;const u=G.units.find(o=>o.id===id);if(u)voxEv('run',{u});}else if(e.jam&&!e._vj){e._vj=1;const u=G.units.find(o=>o.id===id);if(u)voxEv('jam',{u});}}}catch(e){}return r;};
  // 적 발견: 한동안 조용하던 부대가 처음 쏠 때
  const _sh=rtShoot;rtShoot=function(a,d){const quiet=(G.time||0)-(a.firedT??-99)>15;const r=_sh.apply(this,arguments);
    try{if(quiet&&d&&!UT[a.type].ind&&(G.time||0)-(a._vcT??-99)>25&&voxHears(a.nat)&&voxGap('ct'+a.nat,5)){a._vcT=G.time||0;voxEv('contact',{u:a,e:d});}}catch(e){}return r;};
  // 사상자
  const _cas=FXH.cas;FXH.cas=function(u,m,out){try{if(u&&G.units.includes(u)&&(out==='hw'||out==='kia'||out==='lw'&&Math.random()<.35)&&voxGap('cas'+u.nat+out,out==='hw'?3:6))voxEv('cas',{u,out});}catch(e){}return _cas&&_cas.apply(this,arguments);};
  // 격파·부대 상실
  const _k=kill;kill=function(u,by){try{if(by&&by.nat!==u.nat){if(voxGap('kill'+by.nat,6))voxEv('kill',{u:by,e:u});}else if(!UT[u.type].fly&&voxGap('gone'+u.nat,10))voxEv('gone',{u});}catch(e){}return _k.apply(this,arguments);};
  // 거점 확보·상실
  const _am=afterMove;afterMove=function(u){const x=cell(u.r,u.c),was=x.owner;const r=_am.apply(this,arguments);
    try{if(x.obj!=null&&was!==x.owner&&x.owner===u.nat){const obj=G.objs[x.obj].name;if(was!=null||voxGap('cap'+u.nat,5))voxEv('cap',{u,obj});if(was!=null)voxEv('lost',{nat:was,obj});}}catch(e){}return r;};
  // 화력 지원 요청, 증원 도착
  const _sp=support;support=function(n,k,r,c){const ok=_sp.apply(this,arguments);try{if(ok&&voxGap('sup'+n,5))voxEv('sup',{nat:n,kind:k,place:voxPlace(c+.5,r+.5)});}catch(e){}return ok;};
  const _b=buy;buy=function(n,t,r,c){const u=_b.apply(this,arguments);try{if(u&&!isAI(n)&&!UT[t].fly)voxEv('arr',{u});}catch(e){}return u;};
  // 무전 음성을 쓰는 동안 예전 무전 소리 연결(07z-sound)은 쉰다. 음량 시험은 점검 교신으로.
  if(typeof sndRadio==='function'){_voxRadio=sndRadio;sndRadio=function(kind){if(VOX.mode==='off'||VOX.inner)return _voxRadio.apply(this,arguments);
    if(kind==='ack'&&typeof G!=='undefined'&&G){VOX.q=[];const it={...voxLine('test',{nat:G.viewer||0}),g:G,k:'test',p:5,at:Date.now(),ttl:3000,id:null};VOX.q.push(it);voxPump();}return false;};}
  if(typeof document==='undefined')return;
  voxLoad();
  const st=document.createElement('style');st.textContent=`.rvox{position:fixed;left:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 108px);z-index:4;max-width:min(440px,calc(100vw - 24px));pointer-events:none;display:flex;flex-direction:column;gap:3px}
.rvox p{margin:0;padding:4px 8px;background:rgba(9,13,18,.78);border-left:2px solid rgba(240,196,90,.8);border-radius:3px;font-family:var(--font-m);font-size:12px;line-height:1.4;color:#e8ecef;transition:opacity .4s}
.rvox p.jm{border-left-color:#ff8a3d;color:#d9c2b0}.rvox p.old{opacity:.45}.rvox b{font-weight:600;margin-right:4px}
#app.press .rvox{bottom:calc(env(safe-area-inset-bottom,0px) + 64px)}
.sndpop .sp-v{display:flex;align-items:center;gap:8px;margin-top:6px}.sndpop .sp-v span{flex:1}
.sndpop select{background:var(--raise);color:#e8ecef;border:1px solid rgba(255,255,255,.18);border-radius:4px;font:inherit;height:32px;padding:0 6px}
.sndpop .sp-c{display:flex;align-items:center;gap:8px;margin-top:6px;min-height:32px}.sndpop .sp-c input{width:18px;height:18px;margin:0}
.sndpop .sp-n{margin:4px 0 0;color:#8e99a3;font-size:10.5px;line-height:1.4}`;document.head.appendChild(st);
  // 소리 창에 '무전 말'과 '자막'
  const pop=document.getElementById('sndpop');
  if(pop&&!document.getElementById('snd-vox')){const box=document.createElement('div');
    box.innerHTML=`<label class="sp-v"><span>무전 말</span><select id="snd-vox"><option value="voice">목소리</option><option value="beep">잡음</option><option value="off">끔</option></select></label>
<label class="sp-c"><input type="checkbox" id="snd-sub"><span>무전 자막</span></label><p class="sp-n" id="snd-voxh" hidden>이 기기에 한국어 음성이 없어 잡음과 자막으로 들려줍니다.</p>`;
    pop.appendChild(box);
    box.querySelector('#snd-vox').addEventListener('change',e=>{voxSet(e.target.value);if(VOX.mode!=='off')sndRadio('ack');});
    box.querySelector('#snd-sub').addEventListener('change',e=>voxSet(null,e.target.checked));}
  if(typeof speechSynthesis!=='undefined'){speechSynthesis.addEventListener?.('voiceschanged',()=>{VOX.voice=null;voxSync();});voxVoice();}
  // 휴대폰은 첫 터치 전엔 말을 막는다: 첫 조작에서 빈 말로 깨운다
  const unlock=()=>{if(VOX.unl||typeof speechSynthesis==='undefined')return;VOX.unl=1;try{const s=new SpeechSynthesisUtterance(' ');s.volume=0;speechSynthesis.speak(s);}catch(e){}};
  document.addEventListener('pointerdown',unlock,{passive:true});document.addEventListener('keydown',unlock);
  // 일시정지하면 말을 끊는다
  setInterval(()=>{try{if(typeof G!=='undefined'&&G&&(G.paused||G.boot)&&VOX.busy&&typeof speechSynthesis!=='undefined'&&speechSynthesis.speaking){speechSynthesis.cancel();}voxPump();voxSubDraw();}catch(e){}},150);
  voxSync();
})();
