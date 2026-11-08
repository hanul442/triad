/* ===================== UNDER: 쥐구멍·지하실·땅굴 =====================
   근거(공개 자료): FM 3-21.71 6장(벽에 쥐구멍을 뚫어 건물 사이를 오간다, 문은 "죽음의 깔때기"),
   MWI 팔루자 사례 연구(저항세력이 건물 사이 벽을 뚫고 땅굴로 빠져나감), 모술 사례 연구(공병이 땅굴을 찾아 막음),
   마리우폴·바흐무트(지하실과 지하망에서 포격을 버팀).
   - 쥐구멍: 소총분대·공병이 붙어 있는 건물 벽에 폭약을 붙여 구멍을 낸다(공병 3.5초, 소총 6초).
     구멍은 문처럼 쓰인다(05e edgePass). 다른 건물끼리, 또는 길에서 건물로 새 출입구를 낸다.
     터질 때 벽 너머 적은 제압되고 파편에 다친다.
   - 지하실: 일부 건물(층이 많을수록 자주)에 있다. 내려가면 포격·폭탄·붕괴에 거의 안 다치고, 드론·적에게 안 보이지만
     같은 칸에 들어온 적하고만 싸울 수 있다. 건물이 무너져도 살아남지만 잔해에 8초 갇힌다. 오르내리는 데 2.2초.
   - 땅굴: 공병이 건물·잔해 안에서 최대 7칸까지 판다(지휘 2, 1칸에 약 5.5초). 다 파면 아군 보병이 길찾기에서
     알아서 쓴다(땅 위로 돌아가는 것보다 빠를 때). 안에 있는 동안은 보이지도 맞지도 않는다.
     적 부대가 입구 1.3칸 안에 오면 입구가 드러나고, 드러난 입구에 적 공병이 모두 4초 붙어 있거나 큰 폭발이 나면 무너진다.
     무너질 때 안에 있던 부대는 다치고 들어간 쪽으로 밀려난다.
   AI: 적과 가까운 건물 안에서는 적 쪽으로 쥐구멍을 내고, 포격을 맞으면 지하실로 내려가며, 공병이 남의 거점 밑으로 땅굴을 판다. */
const UG={mhT:{eng:3.5,rifle:6},mhDmg:2,bsmP:[0,.15,.4,.55],bsmT:2.2,bsmBlast:.15,trap:8,
  tunCost:2,tunRate:.18,tunMax:7,tunSpd:.8,tunFind:1.3,tunCut:4,aiTunMax:2};
const mhTypes=t=>t==='rifle'||t==='eng';
const mhKey=(r,c,a,b)=>{const k1=key(r,c),k2=key(a,b);return k1<k2?k1+'_'+k2:k2+'_'+k1;};
/* 두 칸 사이 벽 가운데(조금 비킨) 점 */
function mhPt(r,c,a,b){const j=(dHash(Math.min(key(r,c),key(a,b)),7)-.5)*.3;return r===a?[Math.max(c,b),r+.5+j]:[c+.5+j,Math.max(r,a)];}
const mhAt=(r,c,a,b)=>G.mh&&G.mh[mhKey(r,c,a,b)];
{const _ep=edgePass;edgePass=function(r,c,a,b){const v=_ep(r,c,a,b);if(v===true||!G.mh)return v;const h=G.mh[mhKey(r,c,a,b)];return h?[h.x,h.z]:v;};}
/* 건물 칸 (r2,c2)에 구멍을 낼 수 있는 옆 칸 고르기: u에서 가장 가까운 쪽 */
function mhPlan(u,r2,c2){if(!inb(r2,c2)||G.map[r2][c2].t!=='bldg')return null;let best=null,bd=1e9;
  for(const [p,q] of SIDES){const r=r2+p,c=c2+q;if(!inb(r,c))continue;const A=G.map[r][c],B=G.map[r2][c2];if(A.t==='water'||!wallBetween(A,B)||mhAt(r,c,r2,c2))continue;
    if(A.t!=='bldg'&&mcost(u.type,A)===Infinity)continue;const [hx,hz]=mhPt(r,c,r2,c2);
    const sx=hx+(c+.5-hx)*.36,sz=hz+(r+.5-hz)*.36;const d=Math.hypot(sx-u.x,sz-u.z);if(d<bd){bd=d;best={r,c,a:r2,b:c2,hx,hz,sx,sz};}}
  return best;}
function mhOrder(u,r2,c2){if(!mhTypes(u.type))return '소총분대와 공병만 벽을 뚫을 수 있습니다';const P=mhPlan(u,r2,c2);if(!P)return '구멍을 낼 벽이 없습니다(건물 벽을 탭하세요)';
  u.mh=Object.assign(P,{t:0,t0:G.time||0,need:UG.mhT[u.type]});u.tgt=null;u.tgtTile=null;u.path=pathPts(u,P.sx,P.sz);u.dest=[P.sx,P.sz];bump();return null;}
function mhMake(u){const P=u.mh;u.mh=null;if(u.job==='ug')u.job=null;const k=mhKey(P.r,P.c,P.a,P.b);if(G.mh[k])return;
  G.mh[k]={x:P.hx,z:P.hz,nat:u.nat,t:G.time||0,r:P.r,c:P.c,a:P.a,b:P.b};G.navV=(G.navV||0)+1;
  ubAs(u.nat,()=>{for(const [r,c] of [[P.a,P.b],[P.r,P.c]])if(G.map[r][c].t==='bldg')damageBldg(r,c,UG.mhDmg);});
  for(const e of G.units.slice()){if(e.nat===u.nat||UT[e.type].cls!=='inf'||!G.units.includes(e))continue;if(Math.floor(e.z)!==P.a||Math.floor(e.x)!==P.b)continue;
    e.supp=Math.min(3,(e.supp||0)+1.5);harm(e,1.2,u,{kind:'frag',x:P.hx,z:P.hz,rad:.4});}
  if(FXH.mhole)FXH.mhole(G.mh[k]);sfx('boom',.7,P.hx,P.hz);ubBlast(P.hx,P.hz,.25,u.nat);L(`${natName(u.nat)} ${UT[u.type].n} 벽에 쥐구멍`);bump();}
function mhTick(u,dt){const P=u.mh;if(!P)return;const t=G.time||0;
  if(t-P.t0>45||!u.dest||Math.hypot(u.dest[0]-P.sx,u.dest[1]-P.sz)>.05){u.mh=null;if(u.job==='ug')u.job=null;return;}
  if(Math.floor(u.z)!==P.r||Math.floor(u.x)!==P.c||Math.hypot(u.x-P.sx,u.z-P.sz)>.6||(u.path&&u.path.length))return;
  if((u.supp||0)<(typeof PINNED!=='undefined'?PINNED:1.6))P.t+=dt;if(P.t>=P.need)mhMake(u);}
/* ---------- 지하실 ---------- */
const bsmHas=x=>!!x&&!!x.bsm&&(x.t==='bldg'||x.t==='rubble');
const sameTile=(a,b)=>Math.floor(a.x)===Math.floor(b.x)&&Math.floor(a.z)===Math.floor(b.z);
function bsmOrder(u,down){if(UT[u.type].cls!=='inf')return '보병만 지하실을 씁니다';const t=G.time||0;
  if(down){if(u.bsm||u.bsmGo)return null;if(!bsmHas(cell(u.r,u.c)))return '이 건물에는 지하실이 없습니다';u.bsmGo={down:1,t:t+UG.bsmT};u.path=[];u.tgt=null;u.tgtTile=null;u.flT=0;bump();return null;}
  if(!u.bsm||u.bsmGo)return null;if((u.trapT||0)>t)return '잔해에 갇혀 나갈 수 없습니다';u.bsmGo={down:0,t:t+UG.bsmT};bump();return null;}
function bsmTick(u,dt){const t=G.time||0;
  if(u.bsmGo&&u.bsmGo.down&&(u.fl||0)>.01){u.bsmGo.t=t+UG.bsmT;u.flT=0;}   // 위층이면 먼저 1층까지 내려온다
  if(u.bsmGo&&t>=u.bsmGo.t){const d=u.bsmGo.down;u.bsmGo=null;u.bsm=d?1:0;if(!d&&u._bp){u.path=u._bp;u._bp=null;}bump();
    if(u.nat===G.viewer&&!isAI(u.nat))L(`${UT[u.type].n} ${d?'지하실로 대피':'지상으로'}`);}
  if(u.bsm){u.supp=Math.max(0,(u.supp||0)-dt*.4);if(u.mor!=null)u.mor=Math.min(100,u.mor+dt*.8);
    if(!bsmHas(cell(u.r,u.c)))u.bsm=0;}}
/* ---------- 땅굴 ---------- */
const tunLive=T=>!T.dead;
const tunDone=T=>!T.dead&&T.prog>=1;
const tunById=id=>(G.tun||[]).find(T=>T.id===id);
function tunOrder(u,x,z){if(u.type!=='eng')return '공병만 땅굴을 팝니다';const X=cell(u.r,u.c);if(X.t!=='bldg'&&X.t!=='rubble')return '땅굴은 건물이나 잔해 안에서 시작합니다';
  const N2=G.nats[u.nat];const cost=isAI(u.nat)?Math.min(UG.tunCost,Math.max(1,N2.cp)):UG.tunCost;if(N2.cp<cost)return `지휘점수 ${UG.tunCost}이 필요합니다`;if(u.tunDig&&tunById(u.tunDig)&&tunById(u.tunDig).prog<1)return '이미 땅굴을 파는 중입니다';
  const d=Math.hypot(x-u.x,z-u.z);if(d>UG.tunMax)return `땅굴은 ${UG.tunMax}칸까지 팔 수 있습니다`;if(d<1.2)return '너무 가깝습니다';
  const E=tileAt(x,z);if(!E||mcost('rifle',E)===Infinity)return '나갈 곳을 팔 수 없는 땅입니다';
  N2.cp-=cost;const T={id:UID++,nat:u.nat,a:[u.x,u.z],b:[x,z],len:Math.round(d*100)/100,prog:0,dig:u.id,kn:{},cut:{},born:G.time||0};
  (G.tun=G.tun||[]).push(T);u.tunDig=T.id;u.path=[];u.tgt=null;u.tgtTile=null;u.dest=null;L(`${natName(u.nat)} 공병 땅굴 파기 시작`);bump();return null;}
function tunDigTick(T,dt){if(T.prog>=1)return;let dg=G.units.find(o=>o.id===T.dig);
  const ok=o=>o&&o.nat===T.nat&&o.type==='eng'&&!o.tun&&!(o.path&&o.path.length)&&Math.hypot(o.x-T.a[0],o.z-T.a[1])<.5;
  if(!ok(dg)){dg=G.units.find(ok);if(dg){T.dig=dg.id;dg.tunDig=T.id;}}
  if(!dg||(dg.supp||0)>=1.6)return;T.prog=Math.min(1,T.prog+dt*UG.tunRate/T.len*(1+.1*(dg.rank||0)));
  if(T.prog>=1){dg.tunDig=null;if(dg.job==='ug')dg.job=null;L(`${natName(T.nat)} 땅굴 완성 (${Math.round(T.len*12)}m)`);bump();}}
function tunCollapse(T,why){if(T.dead)return;T.dead=1;bump();
  for(const u of G.units.slice()){if(!u.tun||u.tun.id!==T.id)continue;const back=u.tun.to==='a'?T.b:T.a;u.tun=null;
    harm(u,6,null,{kind:'crush'});if(G.units.includes(u))tunPlace(u,back);}
  if(FXH.tunGone)FXH.tunGone(T);L(`${natName(T.nat)} 땅굴 붕괴${why?' ('+why+')':''}`);}
function tunPlace(u,p){u.x=p[0]+(Math.random()-.5)*.08;u.z=p[1]+(Math.random()-.5)*.08;u._tr=[[u.x,u.z]];
  for(const m of (u._men||[]))if(!m.gone&&!m.task){m.x=u.x+(Math.random()-.5)*.12;m.z=u.z+(Math.random()-.5)*.12;}
  if(typeof rtCell==='function')rtCell(u);bump();}
/* 땅굴로 가는 길이 땅 위로 가는 길보다 크게 길지 않으면(1.2배 안) 입구까지의 길을 주고 u.tunPlan을 적어 둔다 */
const ppLen=(u,P)=>{let s=0,px=u.x,pz=u.z;for(const p of P){s+=Math.hypot(p[0]-px,p[1]-pz);px=p[0];pz=p[1];}return [s,px,pz];};
{const _pp=pathPts;pathPts=function(u,x,z){
  if(u.tunPlan){const T=tunById(u.tunPlan.id);const e=T&&T[u.tunPlan.from];if(e&&Math.hypot(e[0]-x,e[1]-z)<.05)return _pp(u,x,z);u.tunPlan=null;}
  const P=_pp(u,x,z);if(!G||!G.tun||!G.tun.length||!G.units.includes(u)||UT[u.type].cls!=='inf'||u.tun)return P;
  const [l0,ex,ez]=ppLen(u,P);const L0=l0+Math.hypot(ex-x,ez-z)*3;let best=null,bc=L0*1.2;   // 숨어서 가니 조금 더 걸려도 땅굴
  for(const T of G.tun){if(T.nat!==u.nat||!tunDone(T)||T.id===u.tunSkip)continue;
    for(const [f,o] of [['a','b'],['b','a']]){const A=T[f],B=T[o];const dA=Math.hypot(A[0]-u.x,A[1]-u.z);if(dA>L0*.6)continue;
      const c=dA*1.25+T.len/UG.tunSpd+Math.hypot(B[0]-x,B[1]-z)*1.25;if(c<bc){bc=c;best={id:T.id,from:f,dest:[x,z]};}}}
  if(!best)return P;const A=tunById(best.id)[best.from];u.tunPlan=best;return _pp(u,A[0],A[1]);};}
function tunEnter(u){const pl=u.tunPlan;const T=tunById(pl.id);u.tunPlan=null;if(!T||!tunDone(T))return false;
  u.tun={id:T.id,to:pl.from==='a'?'b':'a',t:(G.time||0)+T.len/(UG.tunSpd*UT[u.type].mv*SPD_K),dest:pl.dest};u.path=[];u.tgt=null;u.tgtTile=null;bump();return true;}
function tunTravel(u){const T=tunById(u.tun.id);if(!T||T.dead){u.tun=null;return;}if((G.time||0)<u.tun.t)return;
  const dest=u.tun.dest;const p=T[u.tun.to];u.tun=null;tunPlace(u,p);u.tunSkip=T.id;u.path=dest?pathPts(u,dest[0],dest[1]):[];u.tunSkip=null;u.dest=dest;}
function tunWatch(dt){const t=G.time||0;
  for(const T of G.tun||[]){if(T.dead)continue;tunDigTick(T,dt);
    const ends=T.prog>=1?[T.a,T.b]:[T.a];
    for(const e of G.units){if(e.nat===T.nat||e.tun||e.bsm||UT[e.type].fly)continue;
      for(const p of ends){const d=Math.hypot(e.x-p[0],e.z-p[1]);if(d>UG.tunFind)continue;
        if(!T.kn[e.nat]){T.kn[e.nat]=1;if(e.nat===G.viewer)L('적 땅굴 입구 발견');}
        if(e.type==='eng'&&d<.7){T.cut[e.nat]=(T.cut[e.nat]||0)+dt;if(T.cut[e.nat]>=UG.tunCut){tunCollapse(T,'적 공병이 막음');break;}}}
      if(T.dead)break;}}
  G.tun=(G.tun||[]).filter(T=>!T.dead||t-(T.deadT??(T.deadT=t))<30);}
onBlast((x,z,R,n)=>{if(!G.tun||R<.8)return;for(const T of G.tun){if(T.dead)continue;for(const p of [T.a,T.b])if(Math.hypot(p[0]-x,p[1]-z)<=R*.6&&Math.random()<.5){tunCollapse(T,'폭격');break;}}});
/* ---------- 규칙 연결 ---------- */
{const _rm=rtMove;rtMove=function(u,dt){
  if(u.tun)return;
  if(u.bsmGo){if(u.path&&u.path.length&&u.bsmGo.down){u._bp=u.path;u.path=[];}return;}
  if(u.bsm){if(u.path&&u.path.length){if((u.trapT||0)>(G.time||0)){u.path=[];return;}u._bp=u.path;u.path=[];u.bsmGo={down:0,t:(G.time||0)+UG.bsmT};}return;}
  if(u.tunPlan){const T=tunById(u.tunPlan.id);const e=T&&T[u.tunPlan.from];if(!e||T.dead)u.tunPlan=null;
    else if(Math.hypot(u.x-e[0],u.z-e[1])<.3){if(tunEnter(u))return;}
    else if(!u.path||!u.path.length)u.tunPlan=null;}
  return _rm(u,dt);};}
const ugHid=u=>!!(u&&(u.tun||u.bsm));
{const _c=canHit;canHit=function(a,d,fromR,fromC,moved){if(a.tun||d.tun)return false;
  if(a.bsm&&(UT[d.type].fly||!sameTile(a,d)))return false;if(d.bsm&&(UT[a.type].cls!=='inf'||!sameTile(a,d)))return false;return _c(a,d,fromR,fromC,moved);};}
{const _c=canHitTile;canHitTile=function(a,r,c,fr,fc,mv){if(a.tun||a.bsm)return false;return _c(a,r,c,fr,fc,mv);};}
{const _s=seen;seen=function(e,n,vs){if(e&&(e.tun||e.bsm)&&e.nat!==n){if(e.tun)return false;
    for(const o of G.units)if(o.nat===n&&!o.tun&&!o.bsm&&UT[o.type].cls!=='air'&&sameTile(o,e))return true;return false;}return _s(e,n,vs);};}
{const _h=harm;harm=function(u,amt,by,o){if(u&&u.tun&&!(o&&o.kind==='crush'))return 0;
  if(u&&u.bsm&&o&&(o.kind==='blast'||o.kind==='frag'||o.kind==='crush'))amt=Math.round(amt*UG.bsmBlast*100)/100;return _h(u,amt,by,o);};}
{const _d=damageBldg;damageBldg=function(r,c,amt){const x=G.map[r][c];const was=x.t==='bldg';_d(r,c,amt);
  if(was&&x.t!=='bldg')for(const u of G.units)if(u.bsm&&Math.floor(u.z)===r&&Math.floor(u.x)===c){u.trapT=(G.time||0)+UG.trap;if(u.nat===G.viewer)L(`${UT[u.type].n} 무너진 건물 지하실에 갇힘`);}};}
{const _n=newGame;newGame=function(cfg){const g=_n(cfg);G.mh=G.mh||{};G.tun=G.tun||[];
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=G.map[r][c];if(x.t!=='bldg'||x.bsm!=null)continue;x.bsm=dHash(key(r,c),33)<UG.bsmP[Math.min(3,x.f||1)]?1:0;}return g;};}
/* ---------- AI ---------- */
function ugNearEnemy(u,R){let b=null,bd=R;for(const e of G.units){if(e.nat===u.nat||UT[e.type].fly||e.tun)continue;if(G.fog&&!seen(e,u.nat))continue;const d=Math.hypot(e.x-u.x,e.z-u.z);if(d<bd){bd=d;b=e;}}return b;}
function ugAI(n){const t=G.time||0;const N2=G.nats[n];
  for(const u of G.units){if(u.nat!==n||UT[u.type].cls!=='inf')continue;
    if(u.job==='ug'&&(u._ugT||0)<t&&!u.bsm&&!u.mh&&!(u.tunDig&&tunById(u.tunDig)&&tunById(u.tunDig).prog<1))u.job=null;
    if(u.bsm&&u.job==='ug'){const quiet=!ubHotNear(u.x,u.z,1.5,14);const intr=G.units.some(e=>e.nat!==n&&UT[e.type].cls==='inf'&&sameTile(e,u));if(quiet||intr){bsmOrder(u,false);u.job=null;}continue;}
    if(u.job||u.tun||u.bsmGo||u.mh)continue;const X=cell(u.r,u.c);
    // 포격 아래: 지하실로
    if(bsmHas(X)&&(u.supp||0)>=1&&ubHotNear(u.x,u.z,1.2,4)&&!G.units.some(e=>e.nat!==n&&UT[e.type].cls==='inf'&&Math.hypot(e.x-u.x,e.z-u.z)<1.5)){if(!bsmOrder(u,true)){u.job='ug';u._ugT=t+40;}continue;}
    // 적과 가까운 건물 안: 적 쪽 옆 건물로 쥐구멍
    if(mhTypes(u.type)&&X.t==='bldg'&&!(u.path&&u.path.length)&&Math.random()<.3){const e=ugNearEnemy(u,5);if(e){
      let best=null,bd=Math.hypot(e.x-u.x,e.z-u.z)-.4;for(const [p,q] of SIDES){const a=u.r+p,b=u.c+q;if(!inb(a,b))continue;const Y=G.map[a][b];
        if(Y.t!=='bldg'||!wallBetween(X,Y)||mhAt(u.r,u.c,a,b))continue;const d=Math.hypot(e.x-(b+.5),e.z-(a+.5));if(d<bd){bd=d;best=[a,b];}}
      if(best&&!mhOrder(u,best[0],best[1])){u.job='ug';u._ugT=t+30;continue;}}}
    // 공병: 드러난 적 땅굴 입구를 막으러 / 남의 거점 밑으로 땅굴
    if(u.type==='eng'){
      const T=(G.tun||[]).find(T=>!T.dead&&T.nat!==n&&T.kn[n]&&[T.a,T.b].some(p=>Math.hypot(p[0]-u.x,p[1]-u.z)<4));
      if(T){const p=[T.a,T.b].sort((p,q)=>Math.hypot(p[0]-u.x,p[1]-u.z)-Math.hypot(q[0]-u.x,q[1]-u.z))[0];u.path=pathPts(u,p[0],p[1]);u.dest=[p[0],p[1]];u.job='ug';u._ugT=t+20;continue;}
      if((X.t==='bldg'||X.t==='rubble')&&N2.cp>=1&&(G.tun||[]).filter(T=>!T.dead&&T.nat===n).length<UG.aiTunMax&&Math.random()<.25){
        let best=null,bd=UG.tunMax;for(const o of G.objs){const Y=G.map[o.r][o.c];if(Y.owner===n)continue;const d=Math.hypot(o.c+.5-u.x,o.r+.5-u.z);if(d>2&&d<bd){bd=d;best=o;}}
        if(best&&!tunOrder(u,best.c+.5,best.r+.5)){u.job='ug';u._ugT=t+90;}}}}}
{const _t=rtTick;rtTick=function(dt){_t(dt);if(!G||!G.units||G.over)return;try{const t=G.time||0;
  for(const u of G.units.slice()){if(UT[u.type].cls!=='inf')continue;if(u.mh)mhTick(u,dt);if(u.bsm||u.bsmGo)bsmTick(u,dt);if(u.tun)tunTravel(u);}
  tunWatch(dt);
  if(t>=(G._ugAI||0)){G._ugAI=t+2;for(const n of G.order||[])if(G.nats[n].alive&&isAI(n))ugAI(n);}}
  catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}};}
