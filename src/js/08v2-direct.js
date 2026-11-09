/* ===================== 관전 자동 연출: 전쟁 다큐·중계 감독 =====================
   관전 모드에서 "자동 연출"이 켜져 있으면 이 감독이 카메라를 맡는다.
   - 사건을 모은다: 총격, 전차·장갑차 격파, 건물 붕괴, 큰 폭발, 포격, 돌입, 상륙·강습, 미사일, 거점 공방·점령.
     최근 사건이 몰린 곳(이야기)을 고르고, 큰 사건(격파·붕괴·점령)은 하던 샷을 끊고 넘어간다.
   - 샷을 바꿔 가며 찍는다: 넓은 전경(est), 헬기 선회(heli), 어깨 너머(over), 차량 추격(follow), 낮은 앵글(low),
     거점 선회(obj), 조용할 때 전선(front). 새 장소는 넓은 샷으로 열고, 같은 샷을 잇달아 쓰지 않는다.
   - 샷마다 최소·최대 길이가 있다(실제 시간). 짧은 컷이 튀지 않게 최소 길이 전에는 큰 사건만 끊는다.
   - 장소가 바뀌면 짧게 암전하며 컷, 같은 장소에서 샷만 바뀌면 바로 컷, 샷 안에서는 부드럽게 따라간다.
   - 카메라와 피사체 사이를 건물·언덕이 가리면 방향을 돌리거나 높이를 올린다. 카메라는 건물 속·땅 밑에 들어가지 않는다.
   - 새 이야기·점령 때 화면 아래에 중계 자막을 띄운다.
   공습(07x-strike)과 세력 탈락(08v-spec)은 그쪽이 고른 자리를 쓰고, 각도만 감독이 정한다. */
const DIR_SHOT={   // 최소·최대 길이(ms), 기본 기울기, 거리
  est:{min:5000,max:8000,p:.92,d:24},heli:{min:6000,max:10000,p:.6,d:13},over:{min:5000,max:9000,p:.2},
  follow:{min:6000,max:11000,p:.3,d:5.5},low:{min:4500,max:7000,p:.11},obj:{min:6000,max:9000,p:.5,d:10},
  front:{min:6000,max:12000,p:.85},ext:{min:0,max:1e9,p:.45}};
const DIR_W={fire:.35,fireV:1.2,duel:2,kill:2.5,killV:7,collapse:8,strike:4,boom:1.5,boomB:3.5,breach:3,land:3.5,ms:6,cap:9,assault:2.5};
const DIR_R=4.5,DIR_BIG=7;
const DIR={ev:[],shot:null,cam:null,story:null,hist:[],here:0,own:null,g:null,fol:null,skip:null,bak:null,prev:new Map(),cap:null,chk:0,on:false};
const dirNow=()=>typeof performance!=='undefined'?performance.now():Date.now();
function dirOn(){return typeof specOn==='function'&&specOn()&&!!UI.specAuto&&!(typeof PR!=='undefined'&&PR.on);}
function dirReset(){Object.assign(DIR,{ev:[],shot:null,cam:null,story:null,hist:[],here:0,own:null,g:G,fol:null,skip:null,prev:new Map(),cap:null,chk:0});}

/* ---------- 사건 기록 ---------- */
function dirEv(x,z,w,k,o){if(!G||!G.spec||x==null||!isFinite(x)||!isFinite(z))return;const t=dirNow();DIR.ev.push({t,x,z,w,k,o:o||null});
  if(DIR.ev.length>160)DIR.ev.splice(0,DIR.ev.length-160);}
const dirVeh=u=>!!u&&UT[u.type]&&UT[u.type].cls==='veh';
const dirFly=u=>!!u&&UT[u.type]&&!!UT[u.type].fly;
{const W=(name,f)=>{const g=globalThis[name];if(typeof g!=='function')return;globalThis[name]=function(){try{f.apply(null,arguments);}catch(e){}return g.apply(this,arguments);};};
  W('v3FxFire',(a,r,c,d)=>{if(!a||a.x==null)return;const t=d&&d.type?d:null;const v=dirVeh(a);dirEv(a.x,a.z,v&&dirVeh(t)?DIR_W.duel:v?DIR_W.fireV:DIR_W.fire,v&&dirVeh(t)?'duel':'fire',{u:a.id,t:t?t.id:null});});
  W('v3FxKill',u=>{if(u)dirEv(u.x,u.z,dirVeh(u)?DIR_W.killV:dirFly(u)?6:DIR_W.kill,dirVeh(u)||dirFly(u)?'killV':'kill',{type:u.type,nat:u.nat});});
  W('v3FxCollapse',(r,c)=>dirEv(c+.5,r+.5,DIR_W.collapse,'collapse'));
  W('v3FxStrike',(k,r,c)=>dirEv(c+.5,r+.5,DIR_W.strike,'strike',{kind:k}));
  W('v3FxBoom',(x,z,h,onB,s)=>{const b=(s&&s.pw||1)>1.2;dirEv(x,z,b?DIR_W.boomB:DIR_W.boom,'boom');});
  W('v3FxBreach',(a,P)=>{if(P&&P.x!=null)dirEv(P.x,P.z,DIR_W.breach,'breach',{u:a&&a.id});});
  W('v3FxLand',u=>{if(u)dirEv(u.x,u.z,DIR_W.land,'land',{u:u.id});});
  W('v3MsBoom',(x,z)=>dirEv(x,z,DIR_W.ms,'boom'));}

/* 거점: 소유가 바뀌면 점령 사건, 점령이 진행 중이면 공방(계속 이어지는 이야기) */
function dirWatch(now){if(DIR.g!==G)dirReset();if(!G||!G.objs)return;const own=G.objs.map(o=>G.map[o.r][o.c].owner??null);
  if(DIR.own&&DIR.own.length===own.length)for(let i=0;i<own.length;i++)if(own[i]!==DIR.own[i]&&own[i]!=null){const o=G.objs[i];dirEv(o.c+.5,o.r+.5,DIR_W.cap,'cap',{oi:i,was:DIR.own[i],now:own[i]});}
  DIR.own=own;}
function dirAssaults(){const out=[];if(!G||!G.objs)return out;for(let i=0;i<G.objs.length;i++){const o=G.objs[i],x=G.map[o.r][o.c];if(x.cap&&x.cap.p>0)out.push({x:o.c+.5,z:o.r+.5,w:DIR_W.assault,k:'assault',o:{oi:i,n:x.cap.n}});}return out;}

/* ---------- 이야기 고르기 ---------- */
function dirSeeAt(x,z){if(!G.fog||UI.specVis==='all')return true;return G.units.some(u=>Math.hypot(u.x-x,u.z-z)<3&&specVisible(u));}
/* 지금 가장 볼 만한 곳: 최근 사건(무게 × 시간 감쇠)이 반경 안에 몰린 곳. 다음 교전으로 넘긴 자리는 잠시 뺀다 */
function dirStories(now){const ev=DIR.ev.filter(e=>now-e.t<12000);DIR.ev=ev.length>160?ev.slice(-160):ev;
  const all=ev.map(e=>({...e,w:e.w*Math.exp(-(now-e.t)/3500)})).concat(dirAssaults());
  const sk=DIR.skip&&now<DIR.skip.until?DIR.skip:null;const out=[];
  for(const c of all){if(c.w<.15)continue;if(sk&&Math.hypot(c.x-sk.x,c.z-sk.z)<7)continue;if(c.x<0||c.z<0||c.x>N||c.z>N)continue;
    let s=0,sx=0,sz=0;const kw={};
    for(const e of all){const d=Math.hypot(e.x-c.x,e.z-c.z);if(d>=DIR_R)continue;const f=e.w*(1-d/DIR_R*.7);s+=f;sx+=e.x*f;sz+=e.z*f;kw[e.k]=(kw[e.k]||0)+f;}
    if(s<=0)continue;const k=Object.keys(kw).sort((a,b)=>kw[b]-kw[a])[0];
    let src=c;if(kw.cap||kw.assault){const ce=all.find(e=>(e.k==='cap'||e.k==='assault')&&Math.hypot(e.x-c.x,e.z-c.z)<DIR_R&&e.o);if(ce)src=ce;}
    out.push({x:sx/s,z:sz/s,s,k:kw.cap?'cap':kw.collapse>=DIR_W.collapse*.5?'collapse':k,kw,src});}
  out.sort((a,b)=>b.s-a.s);
  // 비슷한 자리는 하나로
  const res=[];for(const o of out){if(res.some(r=>Math.hypot(r.x-o.x,r.z-o.z)<DIR_R*.8))continue;if(!dirSeeAt(o.x,o.z))continue;res.push(o);if(res.length>=6)break;}
  return res;}
/* 사건이 없으면: 총을 쏜 곳(specHot), 그것도 없으면 전선 */
function dirQuiet(){const h=specHot(null);if(h&&h.s>0&&specVisible(h.u))return {x:h.u.x,z:h.u.z,s:h.s*.5,k:'fire',kw:{fire:1},uid:h.u.id};
  const f=specFront();return {x:f.x,z:f.z,s:0,k:'front',kw:{},front:f};}

/* 이야기 속 주인공: 가까이서 최근에 쏜 부대, 기갑 이야기면 차량, 건물 밖·보이는 부대를 낫게 */
function dirCast(st){const t=G.time||0;let best=null,bs=-1;const armor=st.k==='duel'||st.k==='killV';const air=st.k==='land';
  for(const u of G.units){if(!specVisible(u))continue;const d=Math.hypot(u.x-st.x,u.z-st.z);if(d>DIR_R+1)continue;if(dirFly(u)&&!air)continue;
    let s=2-d/DIR_R;if(t-(u.firedT??-99)<4)s+=2;if(u.tgt!=null)s+=1;if(armor&&dirVeh(u))s+=2;if(dirInB(u))s-=1.2;if(UT[u.type].logi||!(UT[u.type].rng&&UT[u.type].rng[1]>0))s-=2;if(st.uid===u.id)s+=3;
    if(s>bs){bs=s;best=u;}}
  return best;}
function dirFoe(u){if(!u)return null;const t=u.tgt!=null&&G.units.find(o=>o.id===u.tgt);if(t&&Math.hypot(t.x-u.x,t.z-u.z)<12)return t;
  let b=null,bd=9;for(const o of G.units){if(o.nat===u.nat||dirFly(o)||!specVisible(o))continue;const d=Math.hypot(o.x-u.x,o.z-u.z);if(d<bd){bd=d;b=o;}}return b;}
function dirInB(u){const r=Math.floor(u.z),c=Math.floor(u.x);return inb(r,c)&&G.map[r][c].t==='bldg';}

/* ---------- 가림 검사 ---------- */
function dirTop(x,z){const r=Math.floor(z),c=Math.floor(x);let h=typeof v3TY==='function'?v3TY(x,z):0;if(inb(r,c)){const m=G.map[r][c];if(m.t==='bldg')h+=.06+(m.f||0)*FLOOR_H;else if(m.t==='rubble')h+=.18;}return h;}
/* 둘레까지 본 높이: 카메라가 벽에 바짝 붙으면 가까운 면이 화면을 덮는다 */
function dirTopR(x,z,r){let h=dirTop(x,z);for(let i=0;i<8;i++){const a=i*Math.PI/4;h=Math.max(h,dirTop(x+Math.cos(a)*r,z+Math.sin(a)*r));}return h;}
function dirCamAt(P){const cp=Math.cos(P.pitch);return {x:P.x+Math.sin(P.yaw)*cp*P.d,y:P.ly+Math.sin(P.pitch)*P.d,z:P.z+Math.cos(P.yaw)*cp*P.d};}
/* 카메라→피사체 선이 건물·언덕에 막히는 정도(0이면 깨끗). 피사체 바로 곁(.6칸)은 본다(벽에 붙은 부대) */
function dirBlock(P){const C=dirCamAt(P);let b=0;
  if(dirTopR(C.x,C.z,.4)>C.y-.1)b+=6;   // 카메라가 건물 속이나 땅 밑
  if(C.x<-6||C.z<-6||C.x>N+6||C.z>N+6)b+=2;   // 맵 밖 멀리
  const n=18;for(let i=1;i<n;i++){const k=i/n;const x=C.x+(P.x-C.x)*k,z=C.z+(P.z-C.z)*k;if(Math.hypot(x-P.x,z-P.z)<.6)break;const y=C.y+(P.ly-C.y)*k;if(dirTop(x,z)>y-.03)b++;}
  return b;}
/* 원하는 방향에서 가장 가까운 깨끗한 방향을 찾고, 없으면 높이 올린다 */
const DIR_YO=[0,.35,-.35,.7,-.7,1.05,-1.05,1.57,-1.57,2.2,-2.2,Math.PI];
/* 순서: 같은 높이에서 방향 → 더 가까이 → 그래도 막히면 조금씩 높인다(낮은 샷이 금세 항공 샷이 되지 않게) */
const DIR_DS=[1,.75,.55];
function dirClear(P){let best=null,bb=1e9;
  for(let up=0;up<6;up++){const pitch=Math.min(1.25,P.pitch+up*.13);
    for(const ds of DIR_DS){const d=Math.max(2.4,P.d*ds);
      for(const o of DIR_YO){const Q={...P,yaw:P.yaw+o,pitch,d};const b0=dirBlock(Q);if(b0===0)return Q;const b=b0+Math.abs(o)*.3+up*.5+(1-ds);if(b<bb){bb=b;best=Q;}}}}
  return best||P;}

/* ---------- 샷 정하기 ---------- */
function dirPos(u){const o=typeof V3!=='undefined'&&V3.uo&&V3.uo.get(u.id);const x=o?o.position.x:u.x,z=o?o.position.z:u.z;
  const y=(o?o.position.y:0)+(typeof v3TY==='function'?v3TY(x,z):0)+.08;return {x,z,y};}
function dirHead(u){const p=DIR.prev.get(u.id);if(p&&Math.hypot(u.x-p.x,u.z-p.z)>.02)return Math.atan2(u.x-p.x,u.z-p.z);
  const f=(u.face||0)*Math.PI/180;return Math.atan2(Math.cos(f),Math.sin(f));}   // face는 x축에서 잰 각(도)
function dirMoving(u){const p=DIR.prev.get(u.id);return !!p&&Math.hypot(u.x-p.x,u.z-p.z)>.05;}
/* 이야기와 지난 샷을 보고 다음 샷 종류를 고른다 */
function dirPlan(st,u,t,fresh){if(st.k==='front')return 'front';
  const recent=DIR.hist.slice(-2);const pick=opts=>opts.find(k=>!recent.includes(k))||opts.find(k=>k!==DIR.hist[DIR.hist.length-1])||opts[0];
  if(st.k==='cap'||st.k==='assault'&&!u)return fresh||DIR.hist[DIR.hist.length-1]!=='obj'?'obj':pick(u&&!dirInB(u)?['low','heli','est']:['heli','est']);
  if(fresh)return st.k==='collapse'||st.k==='land'||!u?'heli':pick(['est','heli']);
  if(!u||dirInB(u))return pick(['heli','est','obj'].filter(k=>k!=='obj'||st.k==='assault'));
  if(dirVeh(u))return pick(dirMoving(u)?['follow','low','over','heli']:t?['low','over','heli','est']:['low','heli','est']);
  if(st.k==='assault')return pick(t?['over','obj','low','heli']:['obj','low','heli']);
  return pick(t?['over','low','heli','est']:['low','heli','est']);}
/* 샷의 지금 구도(이상적인 자리). 움직이는 샷은 매 프레임 다시 잰다 */
function dirPose(sh,now){const D=DIR_SHOT[sh.k]||DIR_SHOT.est;const age=(now-sh.t0)/1000;
  const u=sh.uid!=null&&G.units.find(o=>o.id===sh.uid),t=sh.tid!=null&&G.units.find(o=>o.id===sh.tid);
  const U=u?dirPos(u):null,Tp=t?dirPos(t):null;const gy=(x,z)=>(typeof v3TY==='function'?v3TY(x,z):0)+.05;
  if(sh.k==='front'){const f=sh.f;const fu=f.u!=null&&G.units.find(o=>o.id===f.u);const x=fu?fu.x:f.x,z=fu?fu.z:f.z;const mg=Math.min(N/2,(f.d||18)*.3),cl=v=>Math.max(mg,Math.min(N-mg,v));
    return {x:cl(x),z:cl(z),ly:0,yaw:sh.yaw+age*.02,pitch:D.p,d:f.d||18};}
  if(sh.k==='obj'){const o=G.objs[sh.oi];const x=o?o.c+.5:sh.x,z=o?o.r+.5:sh.z;return {x,z,ly:gy(x,z),yaw:sh.yaw+age*.11,pitch:D.p,d:D.d};}
  if(sh.k==='est'){const x=U?(sh.x+U.x)/2:sh.x,z=U?(sh.z+U.z)/2:sh.z;return {x,z,ly:gy(x,z),yaw:sh.yaw+age*.025,pitch:D.p,d:D.d};}
  if(sh.k==='heli'){const x=U?(sh.x*.4+U.x*.6):sh.x,z=U?(sh.z*.4+U.z*.6):sh.z;return {x,z,ly:gy(x,z),yaw:sh.yaw+age*.09*sh.dir,pitch:D.p,d:D.d};}
  if(!U)return null;
  if(sh.k==='follow'){const h=sh.h;const x=U.x+Math.sin(h)*1.1,z=U.z+Math.cos(h)*1.1;return {x,z,ly:U.y,yaw:h+Math.PI+.22*sh.dir,pitch:D.p,d:D.d};}
  if(sh.k==='over'&&Tp){const dx=Tp.x-U.x,dz=Tp.z-U.z,dd=Math.hypot(dx,dz)||1;const k=Math.min(.45,2.6/dd);const x=U.x+dx*k,z=U.z+dz*k;
    const hd=dd*k+1.4;return {x,z,ly:(U.y+Tp.y)/2,yaw:Math.atan2(-dx,-dz)+.3*sh.dir,pitch:D.p,d:hd/Math.cos(D.p)};}
  if(sh.k==='low'){let x=U.x,z=U.z,d=3.6,a=sh.yaw;
    if(Tp){const dx=Tp.x-U.x,dz=Tp.z-U.z,dd=Math.hypot(dx,dz);a=Math.atan2(dx,dz)+Math.PI/2*sh.dir;if(dd<6){x=(U.x+Tp.x)/2;z=(U.z+Tp.z)/2;d=Math.max(3.6,dd*.9+1.8);}else{x=U.x+dx/dd*1.2;z=U.z+dz/dd*1.2;}}
    return {x,z,ly:Math.max(U.y-.04,gy(x,z)),yaw:a+age*.03*sh.dir,pitch:D.p,d};}
  return {x:U.x,z:U.z,ly:U.y,yaw:sh.yaw,pitch:.6,d:12};}

/* 새 샷 시작 */
function dirShot(st,now,cut){if(st.k==='front'&&DIR.shot&&DIR.shot.k==='front'){DIR.shot.f=st.front;DIR.shot.t0=now;return DIR.shot;}   // 조용할 땐 전선 샷을 이어 간다
  const fresh=!DIR.story||Math.hypot(st.x-DIR.story.x,st.z-DIR.story.z)>6||DIR.story.k!==st.k&&(st.k==='cap'||st.k==='collapse');
  const u=st.k==='front'?null:dirCast(st);const t=u?dirFoe(u):null;const k=dirPlan(st,u,t,fresh);
  const cy=DIR.cam?DIR.cam.yaw:(V3.cs?V3.cs.yaw:0);
  const sh={k,t0:now,x:st.x,z:st.z,uid:u?u.id:null,tid:t?t.id:null,yaw:cy+(fresh?.5:.9),dir:Math.random()<.5?-1:1,h:u?dirHead(u):0,oi:st.src&&st.src.o&&st.src.o.oi!=null?st.src.o.oi:null,f:st.front,yo:0,po:0,s:st.s};
  if(k==='obj'&&sh.oi==null){let bd=1e9;G.objs.forEach((o,i)=>{const d=Math.hypot(o.c+.5-st.x,o.r+.5-st.z);if(d<bd){bd=d;sh.oi=i;}});}
  if(k==='front')sh.yaw=cy;
  // 처음 구도부터 가리지 않는 방향을 잡는다
  const P=dirPose(sh,now);if(!P){return dirShot({...st,k:'front',front:specFront()},now,cut);}
  const Q=dirClear(P);sh.yo=Q.yaw-P.yaw;sh.po=Q.pitch-P.pitch;sh.dk=Q.d/P.d;
  DIR.hist.push(k);if(DIR.hist.length>6)DIR.hist.shift();DIR.here=fresh?0:DIR.here+1;DIR.story=st;DIR.shot=sh;
  UI.follow=u?u.id:null;DIR.fol=UI.follow;UI.specFront=null;
  // 컷: 장소가 바뀌면 짧은 암전, 같은 장소면 바로 컷
  if(cut!==false){const C={...Q};if(DIR.cam&&!fresh&&Math.hypot(C.x-DIR.cam.x,C.z-DIR.cam.z)<1.5&&Math.abs(C.d-DIR.cam.d)<3){/* 거의 같은 구도면 부드럽게 잇는다 */}else{DIR.cam=C;if(fresh)dirDip();}}
  if(fresh||st.k==='cap')dirCaption(st,u,t);
  return sh;}

/* ---------- 매 프레임 ---------- */
function dirFrame(now){const s=V3.cs;if(!DIR.on){DIR.on=true;DIR.bak={pitch:s.pitch};DIR.cam=null;DIR.shot=null;DIR.story=null;}
  const rdt=Math.min(.25,Math.max(0,(now-(DIR.lt||now))/1000));DIR.lt=now;
  let sh=DIR.shot;
  // 다른 곳에서 부대를 골라 줬다(다음 교전, 전쟁 범죄 목격 등): 그 부대 이야기로 간다
  if(UI.follow!=null&&UI.follow!==DIR.fol){const u=G.units.find(o=>o.id===UI.follow);if(u){sh=dirShot({x:u.x,z:u.z,s:5,k:'fire',kw:{},uid:u.id},now);sh.t0=now;}}
  const age=sh?now-sh.t0:1e9,D=sh?DIR_SHOT[sh.k]:null;
  const subj=sh&&sh.uid!=null?G.units.find(o=>o.id===sh.uid):null;const lost=sh&&sh.uid!=null&&(!subj||!specVisible(subj));
  if(!G.paused&&!G.over&&(now-DIR.chk>450||!sh||lost)){DIR.chk=now;
    const ss=dirStories(now);const best=ss[0]||null;
    const cur=sh&&DIR.story;const curS=cur?(ss.find(o=>Math.hypot(o.x-cur.x,o.z-cur.z)<DIR_R)||{s:0}).s:0;
    // 바로 끊을 큰 사건: 다른 곳의 격파·붕괴·점령(2초는 보여 주고)
    const big=DIR.ev.find(e=>e.w>=DIR_BIG&&now-e.t<4000&&(!cur||Math.hypot(e.x-cur.x,e.z-cur.z)>DIR_R)&&!e.used&&dirSeeAt(e.x,e.z));
    let next=null;
    if(!sh)next=best||dirQuiet();
    else if(big&&age>2000){big.used=1;next=ss.find(o=>Math.hypot(o.x-big.x,o.z-big.z)<DIR_R)||{x:big.x,z:big.z,s:big.w,k:big.k,kw:{},src:big};}
    else if(sh.k==='front'&&age>1500&&best&&best.s>1)next=best;   // 전선은 채우는 샷: 교전이 붙으면 바로 간다
    else if(lost&&age>1200)next=best&&Math.hypot(best.x-sh.x,best.z-sh.z)<DIR_R?best:(best||dirQuiet());
    else if(age>=D.min){
      const stay=curS*Math.pow(.8,DIR.here)*1.25;
      if(best&&Math.hypot(best.x-cur.x,best.z-cur.z)>DIR_R&&best.s>Math.max(1,stay*1.4))next=best;   // 더 뜨거운 곳
      else if(age>=D.max){const far=ss.find(o=>Math.hypot(o.x-cur.x,o.z-cur.z)>DIR_R);next=curS>0&&DIR.here<3?ss.find(o=>Math.hypot(o.x-cur.x,o.z-cur.z)<DIR_R)||best:(far||best||dirQuiet());}   // 같은 곳 다른 샷, 오래 머물렀으면 다른 곳
      else if(sh.k==='front'&&best&&best.s>1)next=best;}
    if(next&&next.k==='front'&&sh&&sh.k==='front'){sh.t0=now;sh.f=next.front;next=null;}
    if(next)sh=dirShot(next,now);}
  if(!sh)return;
  const P0=dirPose(sh,now);if(!P0){DIR.shot=null;return;}
  // 차량 추격은 진행 방향을 천천히 따라 돈다
  if(sh.k==='follow'&&subj){const h=dirHead(subj);let dh=h-sh.h;dh=Math.atan2(Math.sin(dh),Math.cos(dh));sh.h+=dh*Math.min(1,rdt*1.2);}
  if(subj&&(!DIR.prev.has(subj.id)||now-(DIR.prev.get(subj.id).t||0)>400))DIR.prev.set(subj.id,{x:subj.x,z:subj.z,t:now});
  // 0.4초마다 가림을 다시 보고, 막히면 방향·높이를 고친다
  let P={...P0,yaw:P0.yaw+sh.yo,pitch:Math.min(1.3,P0.pitch+sh.po),d:P0.d*(sh.dk||1)};
  if(now-(sh.ck||0)>400){sh.ck=now;if(dirBlock(P)>0){const Q=dirClear(P0);sh.yo=Q.yaw-P0.yaw;sh.po=Q.pitch-P0.pitch;sh.dk=Q.d/P0.d;P=Q;}
    else if(sh.po>0||(sh.dk||1)<1){const Q={...P,pitch:P0.pitch+Math.max(0,sh.po-.13),d:P0.d*Math.min(1,(sh.dk||1)+.15)};if(dirBlock(Q)===0){sh.po=Q.pitch-P0.pitch;sh.dk=Q.d/P0.d;}}}
  // 부드럽게 따라간다(샷 안의 움직임). 컷은 dirShot에서 cam을 바로 바꿨다
  const c=DIR.cam||(DIR.cam={...P});const kp=1-Math.exp(-rdt*(sh.k==='follow'?2.6:1.8)),ka=1-Math.exp(-rdt*1.6);
  c.x+=(P.x-c.x)*kp;c.z+=(P.z-c.z)*kp;c.ly+=(P.ly-c.ly)*kp;c.d+=(P.d-c.d)*ka;c.pitch+=(P.pitch-c.pitch)*ka;
  let dy=P.yaw-c.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));c.yaw+=dy*ka;
  dirApply(c);}
/* 감독의 구도를 실제 카메라에 넣는다(v3Frame의 따라가기 보간은 그대로 두면 아무 일도 안 한다) */
function dirApply(c){const s=V3.cs;
  // 맞춘 뒤에도 카메라가 건물 속이나 땅 밑이면 올린다
  let pitch=c.pitch,d=c.d;for(let i=0;i<12;i++){const C=dirCamAt({...c,pitch,d});if(dirTopR(C.x,C.z,.4)<C.y-.12)break;if(i<4&&d>2.4)d=Math.max(2.4,d*.8);else pitch=Math.min(1.35,pitch+.1);}   // 먼저 다가서고, 그래도 안 되면 올린다
  s.x=s.gx=Math.max(-2,Math.min(N+2,c.x));s.z=s.gz=Math.max(-2,Math.min(N+2,c.z));s.d=s.gd=d;s.yaw=s.gyaw=c.yaw;s.pitch=pitch;s.ly=c.ly;dirOffset(true);}
/* 아래 패널(목표·관전 막대)과 위 HUD가 가린 곳을 빼고 남은 화면 한가운데에 피사체가 오게 시야를 위로 민다(낮은 샷에서 피사체가 패널 밑에 숨지 않게) */
function dirOffset(on){if(typeof document==='undefined'||!V3.cam)return;const cam=V3.cam,now=dirNow();
  if(!on){if(cam.view&&cam.view.enabled){cam.clearViewOffset();}DIR.vo=null;return;}
  if(DIR.vo&&now-DIR.vo.t<500)return;const a=document.getElementById('app'),dk=document.querySelector('.dock');if(!a||!dk)return;
  const A=a.getBoundingClientRect(),w=A.width,h=A.height;if(!(w>0&&h>0))return;let bot=h;
  for(const el of dk.children){if(el.hidden)continue;const R=el.getBoundingClientRect();if(R.height>0&&R.width>w*.25)bot=Math.min(bot,R.top-A.top);}
  const top=Math.min(h*.15,64);const sh=Math.max(0,Math.min(h*.22,h/2-(top+bot)/2));DIR.vo={t:now};
  if(Math.abs((cam.view&&cam.view.enabled?cam.view.offsetY:0)-sh)<2&&(!cam.view||cam.view.fullWidth===w))return;
  if(sh<2)cam.clearViewOffset();else cam.setViewOffset(w,h,0,sh,w,h);}
/* 공습·세력 탈락: 자리와 거리는 그쪽이 정하고, 감독은 각도와 컷만 맡는다 */
function dirExt(now){const s=V3.cs,S=UI.specStrike;if(!S&&!(UI.specOut&&now<UI.specOut.until)){DIR.shot=null;DIR.story=null;return dirFrame(now);}const k=S?'strike':'out';
  if(!DIR.shot||DIR.shot.k!=='ext'||DIR.shot.e!==k){const yaw=S?Math.atan2(S.hx??0,S.hz??1):(DIR.cam?DIR.cam.yaw:s.yaw);
    DIR.shot={k:'ext',e:k,t0:now,yaw,x:s.gx,z:s.gz,yo:0,po:0,dir:1};DIR.story={x:s.gx,z:s.gz,k};DIR.cam={x:s.gx,z:s.gz,ly:0,yaw,pitch:S?.42:.7,d:s.gd};dirDip();
    if(S)dirCaption({k:'air',x:s.gx,z:s.gz},null,null);else if(UI.specOut)dirCaption({k:'out',x:s.gx,z:s.gz},null,null);}
  const sh=DIR.shot;const rdt=Math.min(.25,Math.max(0,(now-(DIR.lt||now))/1000));DIR.lt=now;
  let P={x:s.gx,z:s.gz,ly:(typeof v3TY==='function'?v3TY(s.gx,s.gz):0),yaw:sh.yaw+(S?0:(now-sh.t0)/1000*.12),pitch:S?.42:.7,d:s.gd};
  if(now-(sh.ck||0)>400){sh.ck=now;const Q=dirBlock(P)?dirClear(P):P;sh.yo=Q.yaw-P.yaw;sh.po=Q.pitch-P.pitch;}P.yaw+=sh.yo;P.pitch+=sh.po;
  const c=DIR.cam,kk=1-Math.exp(-rdt*2.2);c.x+=(P.x-c.x)*kk;c.z+=(P.z-c.z)*kk;c.ly+=(P.ly-c.ly)*kk;c.d+=(P.d-c.d)*kk;c.pitch+=(P.pitch-c.pitch)*kk;let dy=P.yaw-c.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));c.yaw+=dy*kk;
  dirApply(c);}
/* 자동 연출이 꺼지면 원래 기울기로 돌려준다 */
function dirRelease(){if(!DIR.on)return;DIR.on=false;dirOffset(false);DIR.shot=null;DIR.story=null;DIR.cam=null;dirCapHide();
  if(typeof V3!=='undefined'&&V3.cs){const s=V3.cs;s.ly=0;s.pitch=DIR.bak?DIR.bak.pitch:1.1;if(s.gd<8)s.gd=s.d=12;}}

/* ---------- 중계 화면: 암전 컷과 자막 ---------- */
function dirDip(){if(typeof document==='undefined')return;const el=document.getElementById('dir-dip');if(!el)return;el.classList.remove('on');void el.offsetWidth;el.classList.add('on');}
const dirNat=n=>n!=null&&NATS[n]?NATS[n].name:'';
function dirCapText(st,u,t){const nm=i=>G.objs&&G.objs[i]?G.objs[i].name:'거점';const o=st.src&&st.src.o||{};
  const vs=u&&t?`${dirNat(u.nat)} ${UT[u.type].n} 대 ${dirNat(t.nat)} ${UT[t.type].n}`:u?`${dirNat(u.nat)} ${UT[u.type].n}`:'';
  switch(st.k){
    case 'cap':return ['거점 점령',`${nm(o.oi)} · ${o.now!=null?NATS[o.now].full:''}${o.was!=null?` (${dirNat(o.was)}에게서)`:''}`];
    case 'assault':return ['거점 공방',`${nm(o.oi)}${o.n!=null?` · ${dirNat(o.n)} 진입 중`:''}`];
    case 'duel':case 'killV':return ['기갑 교전',vs];
    case 'collapse':return ['건물 붕괴',vs||'시가지'];
    case 'strike':return ['포격',vs];
    case 'boom':return ['폭발',vs];
    case 'breach':return ['건물 돌입',vs];
    case 'land':return ['상륙·강습',vs];
    case 'air':return ['공습','폭격기 접근 중'];
    case 'out':return ['세력 탈락','마지막 부대가 쓰러진 자리'];
    case 'front':return ['전선','양측이 다가가는 중'];
    default:return [st.kw&&st.kw.kill>1?'격전':'교전',vs];}}
function dirCaption(st,u,t){const tx=dirCapText(st,u,t);DIR.cap={t:dirNow(),tx};if(typeof document==='undefined')return;const el=document.getElementById('dir-cap');if(!el)return;
  el.innerHTML=`<b>${tx[0]}</b><span>${tx[1]||''}</span><i>LIVE · ${fmtT(G.time||0)}</i>`;el.classList.remove('on');void el.offsetWidth;el.classList.add('on');
  clearTimeout(DIR.capTo);DIR.capTo=setTimeout(dirCapHide,4200);}
function dirCapHide(){if(typeof document==='undefined')return;const el=document.getElementById('dir-cap');if(el)el.classList.remove('on');}

/* ---------- 끼워 넣기 ---------- */
(function(){
  const _sc=specCam;specCam=function(now){
    if(!specOn()||typeof V3==='undefined'||!V3.cs){dirRelease();return _sc.apply(this,arguments);}
    dirWatch(now);
    if(!dirOn()){dirRelease();return _sc.apply(this,arguments);}
    if(!DIR.on){DIR.on=true;DIR.bak={pitch:V3.cs.pitch};}
    if(UI.specStrike||UI.specOut&&now<UI.specOut.until){const r=_sc.apply(this,arguments);dirExt(now);return r;}
    if(DIR.shot&&DIR.shot.k==='ext'){DIR.shot=null;DIR.story=null;}
    dirFrame(now);};
  // 다음 교전: 지금 자리는 20초 동안 빼고 다른 이야기로
  const _nx=specNext;specNext=function(){if(!dirOn()||!DIR.story)return _nx.apply(this,arguments);const now=dirNow();
    DIR.skip={x:DIR.story.x,z:DIR.story.z,until:now+20000};const ss=dirStories(now);dirShot(ss[0]||dirQuiet(),now);};
  if(typeof document==='undefined')return;
  const st=document.createElement('style');st.textContent=`#dir-dip{position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;z-index:4}
#dir-dip.on{animation:dirdip .34s ease-out}@keyframes dirdip{0%{opacity:0}25%{opacity:1}100%{opacity:0}}
#dir-cap{position:absolute;left:16px;bottom:calc(var(--dir-cap-b,120px));display:flex;flex-direction:column;gap:2px;max-width:min(78vw,420px);padding:7px 14px 8px 12px;
  background:linear-gradient(90deg,rgba(9,13,18,.9),rgba(9,13,18,.72));border-left:3px solid #d8b24a;color:#e8ecef;pointer-events:none;z-index:5;opacity:0;transform:translateX(-12px);transition:opacity .35s,transform .35s,bottom .25s}
#dir-cap.on{opacity:1;transform:none}#dir-cap b{font-size:15px;letter-spacing:.02em}#dir-cap span{font-size:12.5px;color:#c4ccd2}#dir-cap span:empty{display:none}
#dir-cap i{font-style:normal;font-family:var(--font-m);font-size:10.5px;color:#d8b24a;letter-spacing:.08em}
@media (prefers-reduced-motion:reduce){#dir-dip.on{animation:none}#dir-cap{transition:none;transform:none}}`;document.head.appendChild(st);
  const mk=()=>{const app=document.getElementById('app')||document.body;if(!document.getElementById('dir-dip')){const d=document.createElement('div');d.id='dir-dip';app.appendChild(d);}
    if(!document.getElementById('dir-cap')){const c=document.createElement('div');c.id='dir-cap';c.setAttribute('aria-live','polite');app.appendChild(c);}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mk);else mk();
  // 자막은 하단 바 바로 위에
  setInterval(()=>{const c=document.getElementById('dir-cap'),ab=document.getElementById('actbar'),app=document.getElementById('app');if(!c||!ab||!app||ab.hidden)return;
    const a=app.getBoundingClientRect();let top=ab.getBoundingClientRect().top;const rv=document.getElementById('rvox');if(rv&&!rv.hidden&&rv.textContent.trim()){const q=rv.getBoundingClientRect();if(q.height&&q.left<420)top=Math.min(top,q.top);}
    c.style.setProperty('--dir-cap-b',Math.max(16,a.bottom-top+10)+'px');},300);
})();
