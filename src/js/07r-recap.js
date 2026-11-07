/* ===================== 전투 후 기록 화면 =====================
   전투가 끝나면 폐허가 된 도시의 지도, 리플레이, 항공 사진(전/후), 전황 통계, 주요 장면을 보여 준다.
   기록은 05j-chron.js가 모은다. 지난 전투는 시작 화면의 [지난 전투 기록]에서 다시 본다. */
const RC={rec:null,t:0,play:false,mode:'after',spd:1,last:0,cache:null,ck:'',pulse:null,raf:0};
const RC_S=720;   // 지도 캔버스 크기(픽셀)
const rcH=(i,s)=>{let h=(i*2654435761^(s||0)*40503)>>>0;h=Math.imul(h^h>>>15,2246822507)>>>0;h=Math.imul(h^h>>>13,3266489909)>>>0;return ((h^h>>>16)>>>0)/4294967296;};
const rcEsc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const rcCol=n=>n==null||n==='-'?'#8b9294':MAPCOL[+n];
const rcNat=n=>n==null?'무승부':NATS[n].name;

/* ---------- 항공 사진: 3D 도시를 바로 위에서 한 장 찍는다 ---------- */
function rcAerial(){try{if(typeof V3==='undefined'||!V3.on||!V3.ren||!G)return null;const ren=V3.ren,cam=V3.cam,sc=V3.scene;const m=N/2;
    const fov=cam.fov,asp=cam.aspect;const W=1024;const D=m*1.06/Math.tan(19*Math.PI/180);
    cam.fov=38;cam.aspect=1;cam.updateProjectionMatrix();cam.position.set(m,D,m+.001);cam.lookAt(m,0,m);
    const fn=sc.fog.near,ff=sc.fog.far;sc.fog.near=D*4;sc.fog.far=D*6;
    const S=V3.sun.shadow.camera;const sh=[S.left,S.right,S.top,S.bottom];S.left=-N*.75;S.right=N*.75;S.top=N*.75;S.bottom=-N*.75;S.far=160;S.updateProjectionMatrix();
    V3.sun.position.set(m-16,22,m+10);V3.sun.target.position.set(m,0,m);V3.sun.target.updateMatrixWorld();
    const lab=V3.grid?V3.grid.visible:false;if(V3.grid)V3.grid.visible=false;
    if(typeof v3FowUpd==='function'){v3FowUpd(null);}
    // 다음 날 아침 정찰 사진처럼: 맑은 낮 빛으로, 터지는 중인 화염·먼지는 빼고
    const turn=G.turn,wx=G.wx,fxv=V3.G&&V3.G.fx?V3.G.fx.visible:true;G.turn=3;G.wx='clear';if(typeof v3Light==='function')v3Light();if(V3.G&&V3.G.fx)V3.G.fx.visible=false;
    ren.setPixelRatio(1);ren.setSize(W,W,false);ren.render(sc,cam);const url=ren.domElement.toDataURL('image/jpeg',.72);
    G.turn=turn;G.wx=wx;if(typeof v3Light==='function')v3Light();if(V3.G&&V3.G.fx)V3.G.fx.visible=fxv;
    cam.fov=fov;cam.aspect=asp;sc.fog.near=fn;sc.fog.far=ff;[S.left,S.right,S.top,S.bottom]=sh;S.far=90;S.updateProjectionMatrix();if(V3.grid)V3.grid.visible=lab;
    V3.fowSrc=-1;if(typeof v3Size==='function')v3Size();if(typeof bump==='function')bump();
    return url&&url.length>2000?url:null;}catch(e){return null;}}
/* 전투 시작 사진: 새 작전이 열리고 도시가 그려진 뒤 */
{const _ng=newGame;newGame=function(cfg){const g=_ng(cfg);const me=G;if(typeof setTimeout==='function'&&typeof document!=='undefined')setTimeout(()=>{if(G!==me||G.boot||!G.chron||G.over)return;const u=rcAerial();if(u)G.chron._img={pre:u,post:null};},1600);return g;};}
/* 전투 끝 사진: 기록이 보관된 뒤 사진을 덧붙여 다시 보관한다 */
{const _e=chronEnd;chronEnd=function(){const C=G&&G.chron;const was=C&&C.end;_e();if(!C||was||G.boot||G.scn==='tut'||typeof document==='undefined')return;
  setTimeout(()=>{if(!G||G.chron!==C)return;const u=rcAerial();if(u){C._img=Object.assign({pre:null},C._img||{},{post:u});try{chronArchive(chronRecord());}catch(e){}if(RC.rec&&RC.rec.id===C.t0){RC.rec.img=C._img;rcAerialHTML();}}},900);};}
/* 전투가 끝나면 잠깐 뒤 기록 화면을 연다 */
{const _r=render;render=function(){_r();if(!G||!G.over||G.boot||!G.chron||G._rc)return;G._rc=true;if(!G.chron.end)chronEnd();
  setTimeout(()=>{if(G&&G.over&&G.chron)rcOpen(chronRecord());},2200);};}

/* ---------- 시각 t의 도시 ---------- */
function rcState(rec,t){const end=t>=rec.time-.01;const fall=new Set(),fire=new Map();
  for(const e of rec.ev){if(e.t>t)break;const i=Math.floor(e.z)*rec.N+Math.floor(e.x);if(e.k==='fall')fall.add(i);else if(e.k==='fire'&&!fire.has(i))fire.set(i,e.t);}
  return {end,fall,fire};}
/* 건물·잔해 층. 무너진 칸 수가 바뀔 때만 다시 그린다 */
function rcCity(rec,st,mode){const n=rec.N,cs=RC_S/n;const pre=mode==='before';const ck=rec.id+':'+mode+':'+(pre?0:st.end?'E':st.fall.size)+':'+(pre?0:[...st.fire.keys()].filter(i=>st.end||RC.t-st.fire.get(i)>=50).length);
  if(RC.cache&&RC.ck===ck)return RC.cache;
  const cv=RC.cache||document.createElement('canvas');cv.width=cv.height=RC_S;const g=cv.getContext('2d');RC.ck=ck;RC.cache=cv;
  const B=rec.base.t,F=rec.fin;const tileAt=i=>{if(pre)return B[i];if(st.end)return F.t[i];return st.fall.has(i)?'x':B[i];};
  // 땅
  g.fillStyle='#303234';g.fillRect(0,0,RC_S,RC_S);
  for(let i=0;i<n*n;i++){const r=Math.floor(i/n),c=i%n,x=c*cs,y=r*cs;const ch=B[i];
    if(ch==='p'){g.fillStyle='#6c6a64';g.fillRect(x,y,cs,cs);}else if(ch==='g'){g.fillStyle='#4b5340';g.fillRect(x,y,cs,cs);g.fillStyle='rgba(30,36,26,.5)';for(let k=0;k<3;k++){const a=rcH(i,k);g.beginPath();g.arc(x+cs*rcH(i,k+9),y+cs*rcH(i,k+19),cs*(.12+a*.14),0,6.29);g.fill();}}
    else if(ch==='w'){g.fillStyle='#34505a';g.fillRect(x,y,cs,cs);}
    else if(ch>='A'&&ch<='Z'){g.fillStyle='#5f5d58';g.fillRect(x-.5,y-.5,cs+1,cs+1);}   // 건물 터의 보도
    for(let k=0;k<6;k++){g.fillStyle=rcH(i,k+40)<.5?'rgba(255,255,255,.035)':'rgba(0,0,0,.06)';g.fillRect(x+cs*rcH(i,k+50),y+cs*rcH(i,k+60),1.5,1.5);}}
  // 건물 그림자(남동쪽으로 길게)
  g.fillStyle='rgba(8,8,8,.42)';
  for(let i=0;i<n*n;i++){const ch=tileAt(i);if(!(ch>='A'&&ch<='Z'))continue;const f=ch.charCodeAt(0)-65,r=Math.floor(i/n),c=i%n;const d=Math.min(cs*2.2,cs*(.18+f*.16));
    g.beginPath();g.moveTo(c*cs,r*cs+cs);g.lineTo(c*cs+cs,r*cs);g.lineTo(c*cs+cs+d,r*cs+d*.7);g.lineTo(c*cs+cs+d,r*cs+cs+d*.7);g.lineTo(c*cs+d,r*cs+cs+d*.7);g.closePath();g.fill();}
  // 잔해: 칸 밖으로 흘러넘친 파편
  for(let i=0;i<n*n;i++){if(tileAt(i)!=='x')continue;const r=Math.floor(i/n),c=i%n,x=c*cs,y=r*cs;const was=B[i]>='A'&&B[i]<='Z';
    g.fillStyle=was?'#7c756a':'#6c665d';g.fillRect(x,y,cs,cs);const k0=was?Math.min(60,14+(B.charCodeAt(i)-65)*5):12;
    for(let k=0;k<k0;k++){const a=rcH(i,k),b=rcH(i,k+100),s=rcH(i,k+200);const spill=was?.35:.1;
      g.fillStyle=s<.33?'#4a463f':s<.66?'#9a9284':'#857d70';const w=cs*(.05+s*.14);g.fillRect(x-cs*spill+a*cs*(1+2*spill),y-cs*spill+b*cs*(1+2*spill),w,w*(.6+a*.6));}
    if(was){g.fillStyle='rgba(40,36,32,.35)';g.beginPath();g.arc(x+cs*.5,y+cs*.5,cs*.32,0,6.29);g.fill();}}
  // 지붕
  for(let i=0;i<n*n;i++){const ch=tileAt(i);if(!(ch>='A'&&ch<='Z'))continue;const f=ch.charCodeAt(0)-65,r=Math.floor(i/n),c=i%n,x=c*cs,y=r*cs;
    const v=Math.min(190,128+f*6);g.fillStyle=`rgb(${v},${v-2},${v-7})`;g.fillRect(x,y,cs,cs);
    // 테두리(옆 칸 높이가 다르면 난간 선)
    g.fillStyle='rgba(30,28,25,.45)';const nb=(a,b)=>{if(a<0||b<0||a>=n||b>=n)return -1;const q=tileAt(a*n+b);return q>='A'&&q<='Z'?q.charCodeAt(0)-65:-1;};
    if(nb(r-1,c)!==f)g.fillRect(x,y,cs,1.2);if(nb(r,c-1)!==f)g.fillRect(x,y,1.2,cs);if(nb(r+1,c)!==f)g.fillRect(x,y+cs-1.2,cs,1.2);if(nb(r,c+1)!==f)g.fillRect(x+cs-1.2,y,1.2,cs);
    // 얼룩·실외기
    for(let k=0;k<2;k++){if(rcH(i,k+300)<.5)continue;g.fillStyle='rgba(40,38,34,.22)';g.beginPath();g.arc(x+cs*rcH(i,k+310),y+cs*rcH(i,k+320),cs*(.1+rcH(i,k+330)*.2),0,6.29);g.fill();}
    if(rcH(i,340)<.4){g.fillStyle='#a9a69e';g.fillRect(x+cs*rcH(i,341)*.7,y+cs*rcH(i,342)*.7,cs*.18,cs*.14);}
    // 부서진 정도와 그을음(전투 뒤)
    if(!pre){const dm=st.end?9-(+F.d[i]):0;for(let k=0;k<dm;k++){g.fillStyle=`rgba(25,23,20,${.18+rcH(i,k+400)*.2})`;const s=cs*(.08+rcH(i,k+410)*.22);g.beginPath();g.arc(x+cs*rcH(i,k+420),y+cs*rcH(i,k+430),s,0,6.29);g.fill();}
      const burnt=st.end?F.b[i]==='1':st.fire.has(i)&&RC.t-st.fire.get(i)>=50;
      if(burnt){g.fillStyle='rgba(18,16,14,.62)';g.fillRect(x,y,cs,cs);for(let k=0;k<4;k++){g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.arc(x+cs*rcH(i,k+500),y+cs*rcH(i,k+510),cs*.28,0,6.29);g.fill();}}}}
  return cv;}
function rcFrame(rec,t){const F=rec.fr;if(!F||!F.length)return null;let lo=0,hi=F.length-1;if(t<=F[0].t)return F[0];while(lo<hi){const m=(lo+hi+1)>>1;if(F[m].t<=t)lo=m;else hi=m-1;}return F[lo];}
function rcUnits(f){const o=[];if(!f)return o;for(let i=0;i+5<f.u.length;i+=6){o.push({n:+f.u[i],ty:CHRON_TYPES[parseInt(f.u[i+1],36)]||'rifle',x:parseInt(f.u.slice(i+2,i+4),36)/8,z:parseInt(f.u.slice(i+4,i+6),36)/8});}return o;}
/* 지도 한 장 그리기 */
function rcDraw(){const rec=RC.rec;const cv=$('#rc-map');if(!rec||!cv)return;const g=cv.getContext('2d');const n=rec.N,cs=RC_S/n;const mode=RC.mode;
  const t=mode==='before'?0:mode==='replay'?RC.t:rec.time;RC.t=mode==='replay'?RC.t:t;const st=rcState(rec,t);
  g.drawImage(rcCity(rec,st,mode==='heat'?'after':mode),0,0);
  if(mode!=='before'){
    // 탄흔
    for(const h of rec.hits||[]){if(h[3]!=null&&h[3]>t)continue;const x=h[0]*cs,y=h[1]*cs;const gr=g.createRadialGradient(x,y,0,x,y,cs*.42);gr.addColorStop(0,'rgba(14,12,10,.85)');gr.addColorStop(.6,'rgba(30,26,22,.45)');gr.addColorStop(1,'rgba(30,26,22,0)');g.fillStyle=gr;g.beginPath();g.arc(x,y,cs*.42,0,6.29);g.fill();
      g.fillStyle='rgba(20,18,15,.55)';for(let k=0;k<7;k++){const a=rcH(Math.round(h[0]*97+h[1]*31),k)*6.29,rr=cs*(.3+rcH(Math.round(h[0]*13+h[1]*71),k)*.6);g.fillRect(x+Math.cos(a)*rr,y+Math.sin(a)*rr,1.6,1.6);}}
    // 불타는 건물
    const now=performance.now()/1000;for(const [i,ft] of st.fire){if(st.end||t-ft>=50||st.fall.has(i))continue;const x=(i%n+.5)*cs,y=(Math.floor(i/n)+.5)*cs;const f=.7+Math.sin(now*9+i)*.15;
      const gr=g.createRadialGradient(x,y,0,x,y,cs*.9);gr.addColorStop(0,`rgba(255,150,60,${.75*f})`);gr.addColorStop(.5,`rgba(220,80,30,${.35*f})`);gr.addColorStop(1,'rgba(220,80,30,0)');g.fillStyle=gr;g.beginPath();g.arc(x,y,cs*.9,0,6.29);g.fill();}
    // 쓰러진 자리(전투 뒤 지도)
    if(mode==='after')for(const e of rec.ev){if(e.k!=='kill'||(UT[e.ty]&&UT[e.ty].fly))continue;const x=e.x*cs,y=e.z*cs,s=cs*.16;g.strokeStyle=rcCol(e.n);g.globalAlpha=.75;g.lineWidth=1.4;g.beginPath();g.moveTo(x-s,y-s);g.lineTo(x+s,y+s);g.moveTo(x+s,y-s);g.lineTo(x-s,y+s);g.stroke();g.globalAlpha=1;}
  }
  if(mode==='heat'){let mx=0;for(const v of rec.heat)mx=Math.max(mx,v);if(mx>0){g.save();g.globalCompositeOperation='lighter';
    for(let i=0;i<n*n;i++){const v=rec.heat[i];if(v<=0)continue;const k=Math.sqrt(v/mx);const x=(i%n+.5)*cs,y=(Math.floor(i/n)+.5)*cs;const gr=g.createRadialGradient(x,y,0,x,y,cs*1.4);gr.addColorStop(0,`rgba(255,${120-k*70|0},40,${.42*k})`);gr.addColorStop(1,'rgba(255,80,40,0)');g.fillStyle=gr;g.fillRect(x-cs*1.4,y-cs*1.4,cs*2.8,cs*2.8);}g.restore();}}
  // 부대(리플레이)
  const fr=mode==='replay'?rcFrame(rec,t):mode==='before'?rec.fr&&rec.fr[0]:null;
  if(fr)for(const u of rcUnits(fr)){const T2=UT[u.ty]||{};const x=u.x*cs,y=u.z*cs;g.fillStyle=rcCol(u.n);g.strokeStyle='rgba(0,0,0,.7)';g.lineWidth=1;
    if(T2.fly){g.beginPath();g.moveTo(x,y-cs*.28);g.lineTo(x+cs*.24,y+cs*.18);g.lineTo(x-cs*.24,y+cs*.18);g.closePath();g.fill();g.stroke();}
    else if(T2.cls==='veh'){g.fillRect(x-cs*.26,y-cs*.2,cs*.52,cs*.4);g.strokeRect(x-cs*.26,y-cs*.2,cs*.52,cs*.4);}
    else{g.beginPath();g.arc(x,y,cs*.2,0,6.29);g.fill();g.stroke();}}
  // 방금 일어난 사건
  if(mode==='replay')for(const e of rec.ev){if(e.t>t)break;const a=t-e.t;if(a>4)continue;const k=1-a/4;const x=e.x*cs,y=e.z*cs;
    if(e.k==='kill'){g.strokeStyle=`rgba(255,240,220,${k})`;g.lineWidth=1.5;g.beginPath();g.arc(x,y,cs*(.3+a*.25),0,6.29);g.stroke();}
    else if(e.k==='fall'){g.fillStyle=`rgba(214,196,160,${.55*k})`;g.beginPath();g.arc(x,y,cs*(.8+a*.6),0,6.29);g.fill();}
    else if(e.k==='sup'){g.strokeStyle=`rgba(255,170,90,${k})`;g.lineWidth=2;g.beginPath();g.arc(x,y,cs*(1.2+a*.3),0,6.29);g.stroke();}}
  // 거점
  const owners=mode==='replay'&&fr?fr.o:mode==='before'?null:(rec.fr&&rec.fr.length?rec.fr[rec.fr.length-1].o:null);
  rec.objs.forEach((o,i)=>{const x=(o.c+.5)*cs,y=(o.r+.5)*cs;const w=owners?owners[i]:'-';g.lineWidth=2.2;g.strokeStyle='rgba(0,0,0,.6)';g.beginPath();g.arc(x,y,cs*.62,0,6.29);g.stroke();
    g.strokeStyle=rcCol(w);g.lineWidth=1.6;g.beginPath();g.arc(x,y,cs*.62,0,6.29);g.stroke();g.fillStyle=rcCol(w);g.beginPath();g.arc(x,y,cs*.14,0,6.29);g.fill();
    if(cs>=12){g.font=`600 ${Math.max(9,cs*.62)|0}px ${getComputedStyle(document.body).fontFamily}`;g.textAlign='center';g.fillStyle='rgba(0,0,0,.75)';g.fillText(o.name,x+1,y-cs*.8+1);g.fillStyle='#ecebe6';g.fillText(o.name,x,y-cs*.8);}});
  // 고른 장면 표시
  if(RC.pulse){const p=RC.pulse;const x=p.x*cs,y=p.z*cs;const a=(performance.now()/600)%1;g.strokeStyle=`rgba(255,255,255,${1-a})`;g.lineWidth=2;g.beginPath();g.arc(x,y,cs*(.6+a*1.6),0,6.29);g.stroke();}
  // 필름 같은 마감: 살짝 탈색된 비네트
  const vg=g.createRadialGradient(RC_S/2,RC_S/2,RC_S*.35,RC_S/2,RC_S/2,RC_S*.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.35)');g.fillStyle=vg;g.fillRect(0,0,RC_S,RC_S);
  const tl=$('#rc-tl');if(tl&&mode==='replay'){tl.value=String(Math.round(RC.t*10));$('#rc-tt').textContent=`${fmtT(RC.t)} / ${fmtT(rec.time)}`;}}
/* 리플레이: 전투 전체를 약 40초에 */
function rcLoop(now){RC.raf=0;const rec=RC.rec;if(!rec||$('#recap').hidden)return;const dt=Math.min(.1,(now-(RC.last||now))/1000);RC.last=now;
  if(RC.mode==='replay'&&RC.play){RC.t+=dt*Math.max(4,rec.time/40)*RC.spd;if(RC.t>=rec.time){RC.t=rec.time;RC.play=false;rcCtl();}}
  rcDraw();if(RC.play||RC.pulse||RC.mode==='replay')RC.raf=requestAnimationFrame(rcLoop);}
function rcKick(){if(!RC.raf){RC.last=0;RC.raf=requestAnimationFrame(rcLoop);}}
function rcCtl(){const b=$('#rc-play');if(b){b.textContent=RC.play?'멈춤':'재생';b.setAttribute('aria-pressed',RC.play?'true':'false');}
  document.querySelectorAll('#recap [data-rcm]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.rcm===RC.mode?'true':'false'));
  const rp=$('#rc-rp');if(rp)rp.hidden=RC.mode!=='replay';const sp=$('#rc-spd');if(sp)sp.textContent=RC.spd+'×';
  const cap=$('#rc-cap');if(cap)cap.textContent={before:'전투 전 도시',after:'전투 후 폐허 · ✕ 쓰러진 자리 · 검은 점 탄흔',heat:'격전지 · 밝을수록 싸움이 격렬했던 곳',replay:'리플레이 · 점 보병 · 네모 차량 · 세모 항공'}[RC.mode];}

/* ---------- 화면 ---------- */
function rcStrength(rec){const F=rec.fr||[];if(F.length<2)return '';const W=320,H=90;let mx=1;for(const f of F)for(const v of f.s)mx=Math.max(mx,v);const T=rec.time||F[F.length-1].t||1;
  const ln=rec.order.map((n,j)=>`<polyline fill="none" stroke="${rcCol(n)}" stroke-width="1.8" stroke-linejoin="round" points="${F.map(f=>`${(f.t/T*W).toFixed(1)},${(H-(f.s[j]||0)/mx*H).toFixed(1)}`).join(' ')}"/>`).join('');
  const mk=(rec.moments||[]).map(m=>`<line x1="${(m.t/T*W).toFixed(1)}" x2="${(m.t/T*W).toFixed(1)}" y1="0" y2="${H}" stroke="rgba(255,255,255,.12)"/>`).join('');
  return `<svg viewBox="-2 -2 ${W+4} ${H+4}" class="rc-chart" role="img" aria-label="세력별 전력 추이">${mk}${ln}</svg><div class="rc-axis"><span>0:00</span><span>${fmtT(T)}</span></div>`;}
function rcAerialHTML(){const box=$('#rc-air');if(!box)return;const im=RC.rec&&RC.rec.img;if(!im||!im.post&&!im.pre){box.hidden=true;return;}box.hidden=false;
  if(im.pre&&im.post){box.innerHTML=`<h3>항공 정찰 사진 <span class="stats">작전 전 · 다음 날 아침 · 밀어서 비교</span></h3><div class="rc-wipe"><img src="${im.post}" alt="전투 뒤 도시 항공 사진"><img src="${im.pre}" alt="전투 전 도시 항공 사진" id="rc-pre" style="clip-path:inset(0 50% 0 0)"><i id="rc-bar" style="left:50%"></i><span class="tag l">전</span><span class="tag r">후</span></div><input type="range" id="rc-wipe" min="0" max="100" value="50" aria-label="전후 비교 위치">`;}
  else box.innerHTML=`<h3>항공 사진</h3><div class="rc-wipe"><img src="${im.post||im.pre}" alt="도시 항공 사진"></div>`;}
function rcHTML(rec){const S=rec.stats||{};const V=rec.viewer;const human=S.nats&&S.nats.some(x=>x.ctrl==='human');
  const res=rec.win==null?'무승부':human?(rec.win===V?'승리':'패배'):`${rcNat(rec.win)} 승리`;const cls=rec.win==null?'draw':human?(rec.win===V?'win':'loss'):'draw';
  const d=new Date(rec.at);const ds=`${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  const kia=(S.nats||[]).reduce((a,x)=>a+x.kia,0);
  const tiles=[[fmtT(rec.time),'전투 시간'],[`${S.fallen||0}<small>/${S.b0||0}</small>`,'무너진 건물 칸'],[`${S.ruin||0}%`,'사라진 층 면적'],[S.burnt||0,'불탄 건물 칸'],[S.shells||0,'떨어진 포탄'],[kia,'전사자']];
  const rows=(S.nats||[]).map(x=>`<tr><td style="color:${rcCol(x.n)}">${NATS[x.n].name}${x.ctrl==='human'?' <small>(나)</small>':''}</td><td>${x.n===rec.win?'승리':x.alive?'—':'전멸'}</td><td>${x.objs}<small>/${x.peak}</small></td><td>${x.kills}</td><td>${x.losses}</td><td>${x.kia}</td><td>${x.wia}</td><td>${x.evac}</td><td>${x.bought}</td></tr>`).join('');
  const top=(S.top||[]).filter(x=>x.k>0).map((x,i)=>`<li><b>${i+1}</b><span style="color:${rcCol(x.n)}">${rcEsc(x.nm)}</span><small>${NATS[x.n].name} · 격파 ${x.k}</small></li>`).join('');
  const mom=(rec.moments||[]).map((m,i)=>`<li><button class="rc-mom" data-rcmom="${i}"><time>${fmtT(m.t)}</time><span>${rcEsc(m.s)}</span></button></li>`).join('');
  return `<div class="rc-wrap">
  <header class="rc-head"><div><p class="rc-kicker">전투 후 기록 · ${ds} · ${SIZES[rec.size]?SIZES[rec.size].n:''}</p><h2 class="rc-res ${cls}">${res}</h2><p class="rc-why">${rcEsc(rec.why)}${rec.win!=null&&human&&rec.win!==V?` · ${rcNat(rec.win)} 승리`:''}</p></div>
    <button class="ib" data-rc="close" id="rc-x" aria-label="기록 닫기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>
  <div class="rc-grid">
   <section class="rc-mapcol">
    <div class="rc-modes" role="group" aria-label="지도 보기">${[['before','전투 전'],['after','전투 후'],['heat','격전지'],['replay','리플레이']].map(([k,l])=>`<button class="btn sm" data-rcm="${k}" aria-pressed="false">${l}</button>`).join('')}</div>
    <div class="rc-mapbox"><canvas id="rc-map" width="${RC_S}" height="${RC_S}" aria-label="폐허 지도"></canvas></div>
    <p class="rc-cap" id="rc-cap"></p>
    <div class="rc-rp" id="rc-rp" hidden><button class="btn sm" id="rc-play" data-rc="play" aria-pressed="false">재생</button><input type="range" id="rc-tl" min="0" max="${Math.round(rec.time*10)}" value="0" aria-label="리플레이 시간"><button class="btn sm" id="rc-spd" data-rc="spd">1×</button><span class="rc-tt" id="rc-tt"></span></div>
    <div id="rc-air" hidden></div>
   </section>
   <section class="rc-side">
    <div class="rc-tiles">${tiles.map(([v,l])=>`<div><b>${v}</b><span>${l}</span></div>`).join('')}</div>
    <h3>세력별 전과</h3><div class="tbl"><table><tr><th>세력</th><th>결과</th><th>거점<small>/최대</small></th><th>격파</th><th>손실</th><th>전사</th><th>부상</th><th>후송</th><th>증원</th></tr>${rows}</table></div>
    <h3>전력 추이</h3>${rcStrength(rec)}
    ${mom?`<h3>주요 장면 <span class="stats">누르면 그 순간으로</span></h3><ol class="rc-moms">${mom}</ol>`:''}
    ${top?`<h3>전공 부대</h3><ol class="rc-top">${top}</ol>`:''}
    <div id="rc-ph"></div>
    <div class="rc-act"><button class="btn" data-rc="png">지도 이미지 저장</button><button class="btn" data-rc="look">폐허 둘러보기</button>${G&&G.over?'<button class="btn primary" data-act="new">새 작전</button>':'<button class="btn primary" data-rc="close">닫기</button>'}</div>
   </section>
  </div></div>`;}
function rcPhotos(){const box=$('#rc-ph');if(!box)return;const C=G&&G.chron;const ph=C&&RC.rec&&C.t0===RC.rec.id?C._ph:null;if(!ph||!ph.length){box.innerHTML='';return;}
  box.innerHTML=`<h3>현장 사진</h3><div class="rc-photos">${ph.map(p=>`<figure><img src="${p.url}" alt="${rcEsc(p.cap||'현장 사진')}"><figcaption>${fmtT(p.t)} ${rcEsc(p.cap)}</figcaption></figure>`).join('')}</div>`;}
function rcRoot(){let el=$('#recap');if(!el){el=document.createElement('div');el.id='recap';el.className='recap';el.hidden=true;el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','전투 후 기록');document.body.appendChild(el);}return el;}
function rcOpen(rec){if(!rec||typeof document==='undefined')return;RC.rec=rec;RC.cache=null;RC.ck='';RC.pulse=null;RC.play=false;RC.t=0;RC.spd=1;RC.mode='after';
  const el=rcRoot();el.innerHTML=rcHTML(rec);el.hidden=false;const sh=$('#sheet');if(sh&&G&&G.over){UI.sheet=false;$('#app').classList.remove('sheet-open');sh.hidden=true;}
  rcAerialHTML();rcPhotos();rcCtl();rcDraw();const x=$('#rc-x');if(x)x.focus();}
function rcClose(){const el=$('#recap');if(el)el.hidden=true;RC.play=false;RC.pulse=null;}
/* 지난 전투 목록 */
function rcThumb(rec){const n=rec.N,c=document.createElement('canvas');c.width=c.height=n*2;const g=c.getContext('2d');g.fillStyle='#303234';g.fillRect(0,0,n*2,n*2);
  for(let i=0;i<n*n;i++){const ch=rec.fin.t[i];g.fillStyle=ch==='x'?'#8a8274':ch==='g'?'#4b5340':ch==='p'?'#6c6a64':ch==='w'?'#34505a':ch>='A'&&ch<='Z'?(rec.fin.b[i]==='1'?'#3a3734':'#a7a49d'):'#303234';g.fillRect(i%n*2,Math.floor(i/n)*2,2,2);}
  return c.toDataURL();}
function rcArchive(){const a=chronList();const el=rcRoot();RC.rec=null;
  const items=a.map((r,i)=>{const d=new Date(r.at);const S=r.stats||{};const hu=S.nats&&S.nats.some(x=>x.ctrl==='human');const res=r.win==null?'무승부':hu?(r.win===r.viewer?'승리':'패배'):`${rcNat(r.win)} 승리`;
    return `<li><button class="rc-arc" data-rcarc="${i}"><img src="${rcThumb(r)}" alt="" width="72" height="72"><span><b>${res}</b><small>${d.getMonth()+1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} · ${SIZES[r.size]?SIZES[r.size].n:''} · ${fmtT(r.time)}</small><small>무너진 건물 ${S.fallen||0}칸 · 도시 ${S.ruin||0}% 파괴</small></span></button></li>`;}).join('');
  el.innerHTML=`<div class="rc-wrap rc-narrow"><header class="rc-head"><div><p class="rc-kicker">보관함 · 최근 ${CHRON.keep}판</p><h2 class="rc-res draw">지난 전투 기록</h2></div><button class="ib" data-rc="close" aria-label="닫기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>
    ${items?`<ol class="rc-arcs">${items}</ol>`:`<div class="rc-empty"><p>아직 끝낸 전투가 없습니다. 작전을 하나 끝내면 무너진 도시와 전황이 여기에 남습니다.</p><button class="btn primary" data-rc="close">작전 고르기</button></div>`}</div>`;
  el.hidden=false;}
function rcPng(){const cv=$('#rc-map');if(!cv)return;try{const a=document.createElement('a');a.download=`triad-폐허-${new Date(RC.rec.at).toISOString().slice(0,10)}.png`;a.href=cv.toDataURL('image/png');document.body.appendChild(a);a.click();a.remove();toast('지도 이미지를 저장했습니다');}catch(e){toast('이 화면에서는 이미지를 저장할 수 없습니다');}}
if(typeof document!=='undefined'){
  document.addEventListener('click',e=>{const t=e.target;
    const op=t.closest('[data-act="recap"]');if(op){if(G&&G.chron){if(!G.chron.end&&G.over)chronEnd();rcOpen(G.over?chronRecord():null);}return;}
    if(t.closest('[data-act="archive"]')){rcArchive();return;}
    const root=t.closest('#recap');if(!root)return;if(t.closest('[data-act="new"]')){rcClose();return;}
    const m=t.closest('[data-rcm]');if(m){RC.mode=m.dataset.rcm;RC.pulse=null;if(RC.mode==='replay'&&RC.t>=RC.rec.time-.1)RC.t=0;rcCtl();rcDraw();rcKick();return;}
    const mo=t.closest('[data-rcmom]');if(mo){const p=RC.rec.moments[+mo.dataset.rcmom];RC.mode='replay';RC.t=Math.max(0,p.t-2);RC.play=true;RC.spd=1;RC.pulse=p;setTimeout(()=>{if(RC.pulse===p)RC.pulse=null;},6000);rcCtl();rcKick();const mb=$('#rc-map');if(mb&&mb.scrollIntoView&&window.innerWidth<=760)mb.scrollIntoView({block:'center',behavior:'smooth'});return;}
    const ar=t.closest('[data-rcarc]');if(ar){const r=chronList()[+ar.dataset.rcarc];if(r)rcOpen(r);return;}
    const b=t.closest('[data-rc]');if(!b)return;const a=b.dataset.rc;
    if(a==='close'){rcClose();return;}
    if(a==='look'){rcClose();if(typeof v3HomeCam==='function'&&G)v3HomeCam(false);toast('폐허를 둘러보세요. 아래 [전투 기록]으로 다시 열 수 있습니다');return;}
    if(a==='play'){if(RC.t>=RC.rec.time-.1)RC.t=0;RC.play=!RC.play;rcCtl();rcKick();return;}
    if(a==='spd'){RC.spd=RC.spd===1?3:RC.spd===3?.5:1;rcCtl();return;}
    if(a==='png'){rcPng();return;}});
  document.addEventListener('input',e=>{const t=e.target;if(t.id==='rc-tl'&&RC.rec){RC.t=+t.value/10;RC.play=false;rcCtl();rcDraw();return;}
    if(t.id==='rc-wipe'){const v=+t.value;const p=$('#rc-pre'),b=$('#rc-bar');if(p)p.style.clipPath=`inset(0 ${100-v}% 0 0)`;if(b)b.style.left=v+'%';}});
  document.addEventListener('keydown',e=>{const el=$('#recap');if(el&&!el.hidden&&e.key==='Escape'){rcClose();e.stopPropagation();}},true);}
