/* ===================== CIV: 민간인과 대피 =====================
   근거(공개 자료): MWI 모술 사례 연구(전단·전화로 대피 유도, 좁은 탈출로, 저격수 건물 공습으로 민간인 200명 넘게 사망),
   MWI 팔루자 사례 연구(주민 25~30만 중 약 3만 명이 남아 있었음), FM 3-21.71(민간인이 있을 수 있는 건물엔 수류탄 대신 섬광탄).
   - 건물 몇 곳(약 4분의 1)에 민간인이 남아 있다(층이 많을수록 많다). 지도에 표시된다.
   - 건물이 맞으면 피해만큼 민간인이 다치고, 무너지면 대부분 죽는다. 그 건물을 친 세력이 승점을 잃는다(약 3명에 1점).
     불이 번져 무너져도 마지막으로 친 세력 몫이다.
   - 근처에서 총격·폭발이 나면 민간인이 몇 명씩 무리 지어 지도 가장자리로 피란한다. 길 위 피란민도 폭발에 다친다.
   - 아군 보병이 민간인이 있는 건물 칸에 4초 머무르면(적이 가깝지 않을 때) 모두를 자기 편 뒤쪽으로 안내한다.
     무사히 빠져나가면 4명에 지휘점수 1을 얻는다.
   - AI는 민간인이 여섯 명 이상 있는 곳에는 포격·폭격을 부르지 않는다. */
const CIV={occ:.25,cap:9,vp:.34,kill:1.4,fleeR:2.5,panicP:.35,spd:.32,escort:4,cpEsc:.25,aiMax:6,bullet:.12};
const civRoll=v=>Math.floor(v)+(Math.random()<v%1?1:0);
const civOn=()=>!!(G&&G.civOn);
function civStats(n){const N2=G.nats[n];if(N2.civK==null){N2.civK=0;N2.civE=0;N2.civPen=0;N2.civCp=0;}return N2;}
function civKill(n,cnt,x,z){if(!(cnt>0))return;G.civDead=(G.civDead||0)+cnt;if(FXH.civDead)FXH.civDead(x,z,cnt);
  if(n!=null&&G.nats[n]){const N2=civStats(n);N2.civK+=cnt;N2.civPen+=cnt*CIV.vp;while(N2.civPen>=1){N2.civPen-=1;N2.vp=Math.max(0,N2.vp-1);}
    L(`${natName(n)} 공격에 민간인 ${cnt}명 사망`);}else L(`민간인 ${cnt}명 사망`);}
/* 피란 무리: 가장자리로 걸어간다. esc = 안내한 세력 */
function civEdge(n,x,z){if(n!=null&&typeof airEdge==='function')return airEdge(n,x,z);
  const d=[[x,0],[N-x,1],[z,2],[N-z,3]].sort((a,b)=>a[0]-b[0])[0][1];return d===0?[.2,z]:d===1?[N-.2,z]:d===2?[x,.2]:[x,N-.2];}
function civFlee(r,c,cnt,esc){if(!(cnt>0))return null;const x=G.map[r][c];x.civ=Math.max(0,(x.civ||0)-cnt);
  let sx=c+.5,sz=r+.5;if(x.t==='bldg'&&typeof doorSides==='function'){const ds=doorSides(r,c);if(ds){const s=ds.findIndex(v=>v);if(s>=0){const [a,b]=SIDES[s];[sx,sz]=doorPos(r,c,s);sx+=b*.12;sz+=a*.12;}}}
  const [tx,tz]=civEdge(esc,sx,sz);let path=null;
  try{if(typeof navPath==='function')path=navPath({type:'rifle',x:sx,z:sz,nat:-1,id:-1},tx,tz);}catch(e){path=null;}
  if(!path||!path.length)path=[[tx,tz]];else if(Math.hypot(path[path.length-1][0]-tx,path[path.length-1][1]-tz)>1)path.push([tx,tz]);
  const g={id:UID++,x:sx,z:sz,n:cnt,path,esc:esc??null,t0:G.time||0};(G.civF=G.civF||[]).push(g);bump();return g;}
function civGroupTick(dt){const keep=[];
  for(const g of G.civF||[]){if(g.n<=0)continue;const p=g.path[0];if(!p){civOut(g);continue;}
    const dx=p[0]-g.x,dz=p[1]-g.z,d=Math.hypot(dx,dz);const st=CIV.spd*dt*(g.esc!=null?.85:1);
    if(d<=st){g.x=p[0];g.z=p[1];g.path.shift();}else{g.x+=dx/d*st;g.z+=dz/d*st;}
    if(g.x<.35||g.z<.35||g.x>N-.35||g.z>N-.35||(G.time||0)-g.t0>240){civOut(g);continue;}keep.push(g);}
  G.civF=keep;}
function civOut(g){G.civOut=(G.civOut||0)+g.n;if(g.esc!=null&&G.nats[g.esc]){const N2=civStats(g.esc);N2.civE+=g.n;N2.civCp+=g.n*CIV.cpEsc;const a=Math.floor(N2.civCp);if(a>0){N2.civCp-=a;N2.cp+=a;}
  if(g.esc===G.viewer)L(`민간인 ${g.n}명 안전하게 대피`);}g.n=0;}
/* 건물 피해 → 안의 민간인 */
{const _d=damageBldg;damageBldg=function(r,c,amt){const x=G.map[r][c];const pop=x.civ||0;if(!civOn()||!pop||x.t!=='bldg'||!(amt>0))return _d(r,c,amt);
  const by=UB.by!=null?UB.by:x.lastBy!=null?x.lastBy:null;_d(r,c,amt);
  let dead=Math.min(pop,civRoll(pop*Math.min(1,amt/(x.bmax||10)*CIV.kill)));
  if(x.t!=='bldg')dead=Math.min(pop,dead+civRoll((pop-dead)*.7));
  x.civ=pop-dead;x.civP=1;civKill(by,dead,c+.5,r+.5);if(x.t!=='bldg'&&x.civ>0)civFlee(r,c,x.civ,null);};}
onBlast((x,z,R,n)=>{if(!civOn())return;for(const g of G.civF||[]){if(g.n<=0)continue;const d=Math.hypot(g.x-x,g.z-z);if(d>R)continue;
  const dead=Math.min(g.n,civRoll(g.n*(1-d/R)*.8));if(dead){g.n-=dead;civKill(n,dead,g.x,g.z);}}});
{const _s=rtShoot;rtShoot=function(a,d){const r=_s(a,d);if(!civOn()||!(r>0)||!G.civF)return r;
  for(const g of G.civF){if(g.n>0&&Math.hypot(g.x-d.x,g.z-d.z)<.35&&Math.random()<CIV.bullet){g.n--;civKill(a.nat,1,g.x,g.z);break;}}return r;};}
/* 무서워서 나간다: 근처 총격·폭발 */
function civPanic(){const t=G.time||0;const sh=G.units.filter(u=>u.firedT!=null&&t-u.firedT<2);
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=G.map[r][c];if(!x.civ||x.t!=='bldg')continue;const cx=c+.5,cz=r+.5;
    const dz=x.civP||ubHotNear(cx,cz,CIV.fleeR,3)||sh.some(u=>Math.hypot(u.x-cx,u.z-cz)<CIV.fleeR);if(!dz||Math.random()>CIV.panicP)continue;
    x.civP=0;civFlee(r,c,Math.min(x.civ,2+Math.floor(Math.random()*4)),null);}}
/* 아군 보병이 건물에 머물면 안내해서 내보낸다 */
function civEscort(dt){for(const u of G.units){if(UT[u.type].cls!=='inf'||u.tun||u.bsm){u._esc=0;continue;}const r=Math.floor(u.z),c=Math.floor(u.x);if(!inb(r,c))continue;const x=G.map[r][c];
  if(!x.civ||x.t!=='bldg'||(u.path&&u.path.length)||(u.supp||0)>.6){u._esc=0;continue;}
  if(u._escK!==key(r,c)){u._escK=key(r,c);u._esc=0;}
  if(G.units.some(e=>e.nat!==u.nat&&!UT[e.type].fly&&Math.hypot(e.x-u.x,e.z-u.z)<2)){u._esc=0;continue;}
  u._esc=(u._esc||0)+dt;if(u._esc<CIV.escort)continue;u._esc=0;const n=x.civ;civFlee(r,c,n,u.nat);L(`${natName(u.nat)} ${UT[u.type].n} 민간인 ${n}명 대피 안내`);}}
const civIn=(r,c,rad)=>{let s=0;for(let a=r-rad;a<=r+rad;a++)for(let b=c-rad;b<=c+rad;b++)if(inb(a,b))s+=G.map[a][b].civ||0;
  for(const g of G.civF||[])if(Math.abs(g.x-(c+.5))<=rad+.5&&Math.abs(g.z-(r+.5))<=rad+.5)s+=g.n;return s;};
{const _c=canSupport;canSupport=function(n,kind,r,c){if(!_c(n,kind,r,c))return false;
  if(civOn()&&isAI(n)&&kind!=='smoke'&&kind!=='heli'&&SUP[kind]&&!SUP[kind].any&&civIn(r,c,(SUP[kind].rad||1))>=CIV.aiMax)return false;return true;};}
{const _n=newGame;newGame=function(cfg){const g=_n(cfg);G.civOn=!(cfg&&cfg.civ===false);G.civF=[];G.civDead=0;G.civOut=0;
  if(G.civOn)for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=G.map[r][c];if(x.t!=='bldg'||x.civ!=null)continue;const k=key(r,c);
    x.civ=dHash(k,51)<CIV.occ?Math.min(CIV.cap,Math.max(1,Math.round((x.f||1)*(1+dHash(k,52)*1.5)))):0;}
  for(const n of G.order||[])civStats(n);return g;};}
{const _t=rtTick;rtTick=function(dt){_t(dt);if(!civOn()||!G.units||G.over)return;try{const t=G.time||0;civGroupTick(dt);civEscort(dt);
  if(t>=(G._civT||0)){G._civT=t+1;civPanic();}}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}};}
