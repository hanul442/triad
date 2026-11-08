/* ===================== AI: 적이 든 건물에 돌입한다 (05k-cqb) =====================
   몇 초마다 적 보병이 든 건물 칸을 살핀다(보이는 적, 또는 방금 그 건물에서 쏜 적).
   가까이(CQB.seek칸 안) 성한 소총·공병·기관총 분대가 있고, 우리 체력이 그 칸 적보다 넉넉하면
   한두 분대를 돌입시킨다. 한 건물에는 한 번에 두 분대까지만 보낸다. */
function aiCqb(n){const N2=G.nats[n];if(!N2||!N2.alive)return;const t=G.time||0;if((N2.cqbT||0)>t)return;N2.cqbT=t+2.5+Math.random()*2;
  const mine=G.units.filter(u=>u.nat===n&&canClear(u)&&!u.job&&!u.post);
  const busy=new Map();for(const u of mine)if(u.cqb){const b=G.map[kr(u.cqb.k)][kc(u.cqb.k)].blk;busy.set(b,(busy.get(b)||0)+1);}
  const tiles=new Map();
  for(const e of G.units){if(e.nat===n||UT[e.type].cls!=='inf'||UT[e.type].fly)continue;const x=cell(e.r,e.c);if(!isB(x))continue;
    if(G.fog&&!seen(e,n)&&!(firedRecently(e)&&mine.some(u=>Math.hypot(u.x-e.x,u.z-e.z)<=visRange(u))))continue;
    const k=key(e.r,e.c);const o=tiles.get(k)||{r:e.r,c:e.c,blk:x.blk,n:0,hp:0};o.n++;o.hp+=e.hp;tiles.set(k,o);}
  // 전술 AI(06c-tactics)의 소대가 건물 안 적을 향해 돌격 중이면 그 건물을 먼저 치고, 그 소대 분대를 쓴다
  const pl=G.plat?(Array.isArray(G.plat)?G.plat:Object.values(G.plat)):[];const pri=new Map();
  for(const p of pl){if(!p||p.nat!==undefined&&p.nat!==n||p.st!=='assault'||p.foc==null)continue;const e=G.units.find(o=>o.id===p.foc);if(!e)continue;const k=key(e.r,e.c);if(tiles.has(k))pri.set(k,p.id);}
  const T=[...tiles.entries()].sort((a,b)=>(pri.has(b[0])-pri.has(a[0]))||a[1].hp-b[1].hp).map(([k,o])=>(o.pl=pri.get(k),o));
  for(const o of T){if((busy.get(o.blk)||0)>=2)continue;const cx=o.c+.5,cz=o.r+.5;
    const cand=mine.filter(u=>!u.cqb&&(o.pl==null||u.pl==null||u.pl===o.pl)&&u.hp>=hpMax(u)*.6&&(u.supp||0)<1&&Math.hypot(u.x-cx,u.z-cz)<CQB.seek).sort((a,b)=>Math.hypot(a.x-cx,a.z-cz)-Math.hypot(b.x-cx,b.z-cz));
    const need=o.n>=2?2:1;if(cand.length<need)continue;const go=cand.slice(0,Math.min(2,need+(o.hp>8?1:0)));
    if(go.reduce((s,u)=>s+u.hp,0)<o.hp*1.2)continue;
    let any=false;for(const u of go)if(orderClear(u,o.r,o.c))any=true;
    if(any){busy.set(o.blk,(busy.get(o.blk)||0)+go.length);G.cqbN=(G.cqbN||0)+1;}}}
const _cqbAi0=aiThink;
aiThink=function(n){_cqbAi0(n);try{aiCqb(n);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}};
