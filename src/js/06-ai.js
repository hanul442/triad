/* ===================== AI ===================== */
const AI_ORDER=['mortar','sniper','mg','at','rifle','eng','ifv','tank','drone'];
const unitCap=()=>({s:14,m:18,l:22}[G.size]||18);
async function runAI(){if(G.running)return;G.running=true;
  try{while(G&&!G.over&&isAI(G.cur)&&!G.handoff){const g=G;G.busy=true;if(typeof render==='function')render();
      try{await aiTurn(G.cur);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}
      if(G!==g)return;G.busy=false;endTurn();if(typeof render==='function')render();if(G.speed)await sleep(G.speed);}}
  finally{if(G){G.running=false;G.busy=false;}if(typeof render==='function')render();}}
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
  if(t.cap&&x.obj!=null&&x.owner!==n)s+=70;
  if(x.obj!=null&&x.owner===n&&t.cls==='inf')s+=vis.some(e=>dist(e.r,e.c,r,c)<=5)?14:3;
  const gd=dist(r,c,goal[0],goal[1]);
  if(t.ind||u.type==='sniper'){const near=vis.length?Math.min(...vis.map(e=>dist(e.r,e.c,r,c))):gd;s-=Math.abs(near-(t.ind?5:5))*2.2+(vis.length?0:gd*2);}
  else if(t.fly){const near=vis.length?Math.min(...vis.map(e=>dist(e.r,e.c,r,c))):gd;s-=Math.abs(near-4)*2+gd*.6;}
  else s-=gd*2.6;
  if(t.cls==='inf'){if(x.t==='bldg')s+=5+Math.min(4,x.f)*.6;else if(x.t==='rubble')s+=3;else if(x.t==='park')s+=1.2;}
  let threat=0;const sv=u.r,sc=u.c;u.r=r;u.c=c;
  for(const e of vis){const de=dist(e.r,e.c,r,c);if(de>UT[e.type].rng[1]+2)continue;if(canHit(e,u)){threat+=calcDmg(e,u,false);}
    if(t.cls==='veh'&&UT[e.type].cls==='inf'&&de<=2)s-=e.type==='at'||e.type==='eng'?9:3;}
  u.r=sv;u.c=sc;s-=threat*UT[u.type].cost/hpMax(u)*.55;
  if(x.smoke>0)s+=2;return s;}
async function aiTurn(n){const N2=G.nats[n];const vs=G.fog?visSet(n):null;
  const vis=()=>G.units.filter(e=>e.nat!==n&&(!vs||seen(e,n,visSet(n))));
  // 화력 지원
  {const E=vis();if(E.length&&N2.cp>=SUP.arty.cost+2&&N2.used!==G.turn){let best=null,bs=0;
      for(const e of E)for(const [a,b] of supArea(e.r,e.c,1)){let s=0;for(const [p,q] of supArea(a,b,1)){const o=unitAt(p,q);if(!o)continue;s+=o.nat===n?-UT[o.type].cost*1.5:UT[o.type].cost;}if(s>bs){bs=s;best=[a,b];}}
      const tk=E.find(e=>e.type==='tank'&&!inside(e));
      if(tk&&N2.cp>=SUP.air.cost+3&&!WX[G.wx].noAir&&!G.units.some(o=>o.nat===n&&o.r===tk.r&&o.c===tk.c))support(n,'air',tk.r,tk.c);
      else if(best&&bs>=9)support(n,'arty',best[0],best[1]);}}
  // 증원
  {const E=vis();const reserve=E.length>=3&&N2.used!==G.turn?6:0;let guard=0;
    while(guard++<8&&G.units.filter(u=>u.nat===n).length<unitCap()){const mine=G.units.filter(u=>u.nat===n);const cnt=t=>mine.filter(u=>u.type===t).length;
      const eVeh=E.filter(e=>UT[e.type].cls==='veh').length;
      const w={rifle:5,mg:2,at:1.5+eVeh*2,sniper:cnt('sniper')<2?1.2:.2,eng:1,mortar:cnt('mortar')<2?1.4:.3,ifv:cnt('ifv')<2?1.2:.3,tank:N2.cp>=10&&cnt('tank')<2?2:0,drone:cnt('drone')<1?1:0};
      const af=Object.keys(w).filter(t=>w[t]>0&&UT[t].cost<=N2.cp-reserve);if(!af.length)break;
      let tot=af.reduce((a,t)=>a+w[t],0),r=Math.random()*tot,pick=af[0];for(const t of af){r-=w[t];if(r<=0){pick=t;break;}}
      const sp=deploySpots(n,pick);if(!sp.length)break;const goal=aiGoal(n,{r:Math.round((N-1)/2),c:Math.round((N-1)/2)},[]);
      sp.sort((a,b)=>dist(kr(a),kc(a),goal[0],goal[1])-dist(kr(b),kc(b),goal[0],goal[1]));
      if(!buy(n,pick,kr(sp[0]),kc(sp[0])))break;}}
  // 부대 행동
  const mine=G.units.filter(u=>u.nat===n&&!u.done).sort((a,b)=>AI_ORDER.indexOf(a.type)-AI_ORDER.indexOf(b.type));
  for(const u of mine){if(G.over||!G.units.includes(u)||u.done)continue;const t=UT[u.type];const E=vis();const goal=aiGoal(n,u,E);
    // 곡사: 제자리 사격이 가능하면 쏜다
    if(t.ind){let best=null,bs=0;for(const e of E){const s=aiAtkScore(u,e,u.r,u.c,false);if(s>bs){bs=s;best=e;}}
      if(best){attack(u,best);u.done=true;await aiPause(u);continue;}}
    const R=reach(u);let bestT=key(u.r,u.c),bestA=null,bestS=-1e9;
    for(const k of R.keys()){const r=kr(k),c=kc(k);const moved=k!==key(u.r,u.c);if(t.ind&&!moved&&E.length)continue;
      let s=aiPosScore(u,r,c,goal,E,n);let a=null,as=0;
      if(!(t.ind&&moved))for(const e of E){if(dist(r,c,e.r,e.c)>t.rng[1])continue;const v=aiAtkScore(u,e,r,c,moved);if(v>as){as=v;a=e;}}
      s+=as;if(s>bestS){bestS=s;bestT=k;bestA=a;}}
    const tr=kr(bestT),tc=kc(bestT);
    if(bestT!==key(u.r,u.c)){u.face=Math.atan2(tr-u.r,tc-u.c)*180/Math.PI;moveUnit(u,tr,tc);await aiPause(u);if(!G.units.includes(u)||G.over)continue;}
    if(bestA&&G.units.includes(bestA)&&canHit(u,bestA,null,null,u.moved)){u.face=Math.atan2(bestA.r-u.r,bestA.c-u.c)*180/Math.PI;attack(u,bestA);await aiPause(u);}
    else if(t.rng[1]&&!t.ind&&E.some(e=>dist(e.r,e.c,u.r,u.c)<=t.rng[1]+3))u.ow=true;
    if(G.units.includes(u))u.done=true;}
  checkOver();}
async function aiPause(u){if(!G.speed||typeof document==='undefined')return;if(typeof render==='function')render();
  if(G.viewer!=null&&(!G.fog||seen(u,G.viewer))&&typeof camFollow==='function')camFollow(u.r,u.c);await sleep(G.speed);}
