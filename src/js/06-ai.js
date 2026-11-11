/* ===================== AI (실시간) ===================== */
const AI_ORDER=['spg','mortar','sniper','mg','at','rifle','eng','hmv','ifv','tank','drone'];
const unitCap=()=>({s:16,m:22,l:28,xl:32,xxl:36}[G.size]||22);
function aiGoal(n,u,vis){let best=null,bd=1e9;
  for(const o of G.objs){if(G.map[o.r][o.c].owner===n)continue;const d=dist(u.r,u.c,o.r,o.c);if(d<bd){bd=d;best=[o.r,o.c];}}
  for(const e of vis){const d=dist(u.r,u.c,e.r,e.c)+2;if(d<bd){bd=d;best=[e.r,e.c];}}
  if(!best){const m=(N-1)/2;best=[Math.round(m),Math.round(m)];
    // 모든 거점을 가졌으면 가장 위협받는 아군 거점으로
    for(const o of G.objs){const d=Math.min(...G.units.filter(e=>e.nat!==n).map(e=>dist(e.r,e.c,o.r,o.c)),99);if(d<bd){bd=d;best=[o.r,o.c];}}}
  return best;}
function aiAtkScore(u,e,r,c,moved){const sv=u.r,sc=u.c;u.r=r;u.c=c;let s=-1;
  try{if(canHit(u,e,null,null,moved)){const d=calcDmg(u,e,false);s=d*UT[e.type].cost/hpMax(e)*1.4;if(d>=e.hp)s+=UT[e.type].cost*2.2;
      if(!UT[e.type].ind&&d<e.hp&&canHit(e,u)){s-=calcDmg(e,u,true)*UT[u.type].cost/10;}}}
  finally{u.r=sv;u.c=sc;}return s;}
function aiPosScore(u,r,c,goal,vis,n){const t=UT[u.type],x=G.map[r][c];let s=0;
  if(t.cap&&x.obj!=null&&x.owner!==n)s+=70*Math.min(1,t.cap)*(t.cls==='veh'?.6:1);   // 차량은 거점보다 보병 곁이 먼저
  if(x.obj!=null&&x.owner===n&&t.cls==='inf')s+=vis.some(e=>dist(e.r,e.c,r,c)<=5)?14:3;
  const gd=dist(r,c,goal[0],goal[1]);
  if(t.ind||u.type==='sniper'){const near=vis.length?Math.min(...vis.map(e=>dist(e.r,e.c,r,c))):gd;s-=Math.abs(near-(u.type==='spg'?20:u.type==='mortar'?12:u.type==='mlrs'?26:5))*2.2+(vis.length?0:gd*(t.ind?.6:2));}
  else if(t.fly){const near=vis.length?Math.min(...vis.map(e=>dist(e.r,e.c,r,c))):gd;s-=Math.abs(near-4)*2+gd*.6;}
  else s-=gd*2.6;
  // 높은 곳(감제고지): 언덕·높은 건물은 멀리 보고 내려다 쏜다. 적이 가까울수록(12칸 안) 더 노린다. 기관총·저격수는 더
  {const hi=(x.el||0)+(x.t==='bldg'&&t.cls==='inf'?Math.min(x.f,(typeof CQB==='object'?CQB.autoFl:4)+1)*.8:0);
   if(hi>0&&(t.cls==='inf'||t.ind)){const k=u.type==='sniper'||u.type==='mg'?1.6:t.ind?.6:1;const near=vis.some(e=>dist(e.r,e.c,r,c)<=12)?1.5:1;s+=Math.min(4.5,hi)*k*near;}}
  if(t.cls==='inf'){if(x.t==='bldg')s+=5;else if(x.t==='rubble')s+=3;else if(x.t==='park')s+=1.2;}
  let threat=0;const sv=u.r,sc=u.c;u.r=r;u.c=c;
  for(const e of vis){const de=dist(e.r,e.c,r,c);if(de>UT[e.type].rng[1]+2)continue;if(canHit(e,u)){threat+=calcDmg(e,u,false);}
    if(t.cls==='veh'&&UT[e.type].cls==='inf'&&de<=2)s-=e.type==='at'||e.type==='eng'?9:3;}
  u.r=sv;u.c=sc;s-=threat*UT[u.type].cost/hpMax(u)*.55;
  if(x.smoke>0)s+=2;if(typeof aiArmsPos==='function')s+=aiArmsPos(u,r,c,goal,vis,n);return s;}
/* 실시간 AI: 1.6~2.8초마다 한 번 생각한다. 지원 → 증원 → 부대마다 다음 자리 고르기. 사격은 부대가 알아서 한다. */
function aiThink(n){const N2=G.nats[n];
  const vis=()=>G.units.filter(e=>e.nat!==n&&seen(e,n));
  // 화력 지원
  // 다른 모듈이 aiAirSup를 감싸 새 지원(미사일 등)을 붙이므로, 제병협동 지원을 못 부른 때는 그쪽도 물어본다
  if(typeof aiSupport==='function'){const E=vis();if(!aiSupport(n,E)&&E.length&&typeof aiAirSup==='function')aiAirSup(n,E);}
  else{const E=vis();if(E.length&&N2.cp>=SUP.arty.cost+2&&(N2.supT||0)<=G.time){let best=null,bs=0;
      for(const e of E)for(const [a,b] of supArea(e.r,e.c,1)){let s=0;for(const [p,q] of supArea(a,b,1)){const o=unitAt(p,q);if(!o)continue;s+=o.nat===n?-UT[o.type].cost*1.5:UT[o.type].cost;}if(s>bs){bs=s;best=[a,b];}}
      const tk=E.find(e=>e.type==='tank'&&!inside(e));
      if(tk&&N2.cp>=SUP.air.cost+3&&!WX[G.wx].noAir&&!G.units.some(o=>o.nat===n&&dist(o.r,o.c,tk.r,tk.c)<1))support(n,'air',tk.r,tk.c);
      else if(typeof aiAirSup==='function'&&aiAirSup(n,E)){}
      else if(best&&bs>=9)support(n,'arty',best[0],best[1]);}}
  // 증원
  {const E=vis();const reserve=typeof aiSupReserve==='function'?aiSupReserve(n,E):E.length>=3&&(N2.supT||0)<=G.time?6:0;let guard=0;
    while(guard++<3&&G.units.filter(u=>u.nat===n).length<unitCap()){const mine=G.units.filter(u=>u.nat===n);const cnt=t=>mine.filter(u=>u.type===t).length;
      const eVeh=E.filter(e=>UT[e.type].cls==='veh').length;
      let w={rifle:5,mg:2,at:1.5+eVeh*2,sniper:cnt('sniper')<2?1.2:.2,eng:1,mortar:cnt('mortar')<2?1.4:.3,ifv:cnt('ifv')<2?1.2:.3,tank:N2.cp>=10&&cnt('tank')<2?2:0,drone:cnt('drone')<1?1:0,hmv:cnt('hmv')<2?1:.2,spg:N2.cp>=10&&cnt('spg')<1?1.2:0};if(typeof aiAirW==='function')Object.assign(w,aiAirW(E,cnt));
      if(typeof aiArmsW==='function')w=aiArmsW(n,E,cnt,mine.length);
      let af=Object.keys(w).filter(t=>w[t]>0&&UT[t]&&!UT[t].noBuy);
      if(typeof aiArmsW!=='function')af=af.filter(t=>UT[t].cost<=N2.cp-reserve);if(!af.length)break;
      let tot=af.reduce((a,t)=>a+w[t],0),r=Math.random()*tot,pick=af[0];for(const t of af){r-=w[t];if(r<=0){pick=t;break;}}
      const sp=deploySpots(n,pick);if(!sp.length)break;const goal=aiGoal(n,{r:Math.round((N-1)/2),c:Math.round((N-1)/2)},[]);
      sp.sort((a,b)=>dist(kr(a),kc(a),goal[0],goal[1])-dist(kr(b),kc(b),goal[0],goal[1]));
      if(UT[pick].cost>N2.cp-reserve){if(typeof aiArmsSave==='function'&&aiArmsSave(n,pick,mine.length))break;
        const cheap=af.filter(t=>UT[t].cost<=N2.cp-reserve&&!UT[t].fly);if(!cheap.length)break;pick=cheap.includes('rifle')?'rifle':cheap.reduce((a,b)=>w[b]>w[a]?b:a);}
      if(!buy(n,pick,kr(sp[0]),kc(sp[0])))break;}}
  // 부대 기동: 가는 중이면 대개 그대로 두고, 멈춘 부대는 다음 자리를 고른다
  const E=vis();
  for(const u of G.units){if(u.nat!==n||u.job||u.post||u.cqb)continue;const t=UT[u.type];if(t.heli)continue;if(t.kami&&typeof aiFpv==='function'&&aiFpv(n,u,E))continue;if(t.dteam&&E.some(e=>Math.hypot(e.x-u.x,e.z-u.z)<9)&&Math.random()<.85)continue;
    if(u.path&&u.path.length&&Math.random()<.75)continue;
    if(t.ind&&E.some(e=>canHit(u,e))&&Math.random()<.85)continue; // 곡사: 쏠 수 있으면 자리 지킴
    const goal=aiGoal(n,u,E);if(typeof aiArmsAdvance==='function'&&Math.random()<.7&&aiArmsAdvance(n,u,E,goal))continue;const R=reach(u);let bestT=key(u.r,u.c),bestS=-1e9;const pe=u.path&&u.path.length?u.path[u.path.length-1]:null;const endK=pe?key(Math.floor(pe[1]),Math.floor(pe[0])):-1;
    for(const k of R.keys()){const r=kr(k),c=kc(k);let s=aiPosScore(u,r,c,goal,E,n);let as=0;
      if(!t.ind)for(const e of E){if(dist(r,c,e.r,e.c)>t.rng[1])continue;const v=aiAtkScore(u,e,r,c,true);if(v>as)as=v;}
      else if(k!==key(u.r,u.c))s-=3;
      s+=as*.8;if(k===key(u.r,u.c))s+=1.5;if(k===endK)s+=3;if(k!==key(u.r,u.c)&&G.units.some(o=>o!==u&&o.nat===n&&o.r===kr(k)&&o.c===kc(k)&&!UT[o.type].fly))s-=4;/* 아군이 든 칸은 꼭 필요할 때만 함께 든다 */if(s>bestS){bestS=s;bestT=k;}}   // 가던 곳은 웬만큼 나아야 바꾼다(왔다 갔다 방지)
    if(bestT!==key(u.r,u.c)&&bestT!==endK){const [jx,jz]=coverSnap(u,kc(bestT)+.2+Math.random()*.6,kr(bestT)+.2+Math.random()*.6);u.path=pathPts(u,jx,jz);u.tgt=null;u.dest=null;}}
  if(typeof aiArmsEscort==='function')aiArmsEscort(n);
  if(typeof aiFort==='function')aiFort(n);
  checkOver();}
