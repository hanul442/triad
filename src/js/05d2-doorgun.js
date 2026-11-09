/* ===================== 수송헬기 도어거너 엄호사격 =====================
   실제 휴이처럼 양쪽 문의 기관총 사수가 착륙 직전·땅에 있는 동안·이륙 직후 착륙장 둘레의 적을 쏜다.
   한 번에 짧은 연사(6발), 0.6초마다 한 번. 피해는 기관총보다 약하고(흔들리는 헬기에서 쏜다) 대신 맞은 쪽은 고개를 숙인다.
   건물 안(실내층)에 있는 적은 쏘지 않는다. 보이지 않는 적(전장의 안개)도 쏘지 않는다. */
const DG={R:4.2,from:2.2,to:3.4,gap:.6,k:6,p:.28,dmg:.55};
{const _hi=heliInsert;heliInsert=function(n,r,c){_hi.apply(this,arguments);const tl=(G.time||0)+HELI_T;(G.dg=G.dg||[]).push({n,r,c,x:c+.5,z:r+.5,a:tl-DG.from,b:tl+DG.to,nx:0});};}
function dgTargets(g){return G.units.filter(e=>{if(e.nat===g.n||UT[e.type].fly)return false;if(Math.hypot(e.x-g.x,e.z-g.z)>DG.R)return false;
  const X=cell(e.r,e.c);if(X.t==='bldg'&&eye(e)<bldgH(X))return false;if(G.fog&&typeof seen==='function'&&!seen(e,g.n))return false;return true;});}
function dgTick(){if(!G.dg||!G.dg.length)return;const now=G.time||0;
  G.dg=G.dg.filter(g=>now<=g.b);
  for(const g of G.dg){if(now<g.a||now<g.nx)continue;g.nx=now+DG.gap*(.85+Math.random()*.3);
    const T=dgTargets(g);if(!T.length)continue;T.sort((a,b)=>Math.hypot(a.x-g.x,a.z-g.z)-Math.hypot(b.x-g.x,b.z-g.z));const e=T[Math.random()<.7?0:Math.floor(Math.random()*T.length)];
    const veh=UT[e.type].cls==='veh';const X=cell(e.r,e.c);const cov=X.t==='rubble'||(typeof trenchAt==='function'&&trenchAt(e.x,e.z))?.5:1;
    let hits=0;for(let i=0;i<DG.k;i++)if(Math.random()<DG.p*cov)hits++;
    if(!veh&&hits)harm(e,Math.round(DG.dmg*hits/DG.k*(UT.mg.atk.inf||6)*DPS_K*COOL.mg*10*(.8+Math.random()*.4))/10,null,{kind:'bullet'});
    e.supp=Math.max(e.supp||0,hits?1.2:.8);
    if(typeof FXH.doorgun==='function')try{FXH.doorgun(g,e,hits,DG.k);}catch(err){}}}
{const _ht=heliTick;heliTick=function(){_ht.apply(this,arguments);dgTick();};}
