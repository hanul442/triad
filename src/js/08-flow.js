/* ===================== GAME FLOW ===================== */
function newGame(cfg){const sz=SIZES[cfg.size||'m'];setDims(sz.c,sz.r);const seed=cfg.seed??Math.floor(Math.random()*1e9);const act=cfg.slots.map((s,i)=>s!=='none'?i:-1).filter(i=>i>=0);
  const starts=startsFor(act.length);const map=genMap(seed,starts,cfg.mt,cfg.land,cfg.relief);
  const pers=['공세','균형','방어'];
  G={v:3,spectate:!cfg.slots.includes('human'),vic:cfg.vic||0,diff:cfg.diff||'normal',hist:[],mt:cfg.mt||'cont',peace:{},offers:[],wx:'clear',wxNext:rollWx(),cols:COLS,rows:ROWS,size:cfg.size||'m',turn:1,cur:act[0],map,units:[],nid:1,log:[],over:null,fog:cfg.fog&&cfg.slots.includes('human'),speed:cfg.speed,seed,hint:null,brief:[],supInfo:{},handoff:false,
    nats:NATS.map((_,i)=>({id:i,ctrl:cfg.slots[i],alive:cfg.slots[i]!=='none',f:12,s:8,o:6,staff:[],tech:[],res:null,perfidy:0,ask:{},pers:pers[Math.floor(Math.random()*3)],hq:null}))};
  act.forEach((n,j)=>{const [r,c]=starts[j];G.nats[n].hq=[r,c];const h=map[r][c];h.t='hq';h.owner=n;
    const nb=nbrs(r,c).filter(([a,b])=>map[a][b].t==='plain');const [br,bc]=nb[0];map[br][bc].owner=n;map[br][bc].bld={type:'barracks',left:0};
    const spots=[];for(const [a,b] of [...nbrs(r,c),...nb.flatMap(([x,y])=>nbrs(x,y))])if(map[a][b].t!=='sea'&&!(a===r&&b===c)&&!spots.some(s=>s[0]===a&&s[1]===b)&&mcost('tank',map[a][b].t)<Infinity)spots.push([a,b]);
    ['inf','inf','tank','truck'].forEach((t,i)=>{if(spots[i])mkUnit(t,n,spots[i][0],spots[i][1],false);});
    if(cfg.mt==='arch'){const cx=Math.floor(ROWS/2),cy=Math.floor(COLS/2);let best=null;
      for(let a=0;a<ROWS;a++)for(let b=0;b<COLS;b++)if(dist(a,b,r,c)===2&&map[a][b].t==='plain'&&!map[a][b].bld){const d=dist(a,b,cx,cy);if(!best||d<best[2])best=[a,b,d];}
      if(best){const [pr,pc]=best;for(const [a,b] of nbrs(pr,pc))if(dist(a,b,r,c)===3&&!SITES.includes(map[a][b].t)){map[a][b].t='sea';map[a][b].rig=false;}
        for(const u of [...G.units])if(map[u.r][u.c].t==='sea'&&UT[u.type].d!=='sea')G.units=G.units.filter(x=>x!==u);
        map[pr][pc].owner=n;map[pr][pc].bld={type:'port',left:0};const sea=nbrs(pr,pc).filter(([a,b])=>map[a][b].t==='sea');
        if(sea[0])mkUnit('lst',n,sea[0][0],sea[0][1],false);if(sea[1])mkUnit('dd',n,sea[1][0],sea[1][1],false);}}});
  buildRoads();G.viewer=act.find(n=>G.nats[n].ctrl==='human')??act[0];snapHist();beginTurn();}
function aliveNext(n){const K=NATS.length;for(let i=1;i<=K;i++){const j=(n+i)%K;if(G.nats[j].alive)return j;}return n;}
function endTurn(){if(G.over)return;scnEndTurn(G.cur);if(G.over){save();render();return;}clearSel();G.offers=G.offers.filter(o=>o.to!==G.cur);const nx=aliveNext(G.cur);if(nx<=G.cur){snapHist();G.turn++;G.wx=G.wxNext;G.wxNext=rollWx();L(`${G.turn}라운드 기상: ${WX[G.wx].n}`);checkOver();if(G.over){snapHist();save();render();return;}}G.cur=nx;beginTurn();
  if(isAI(G.cur)){render();runAI();return;}
  const humans=G.nats.filter(N=>N.alive&&N.ctrl==='human').length;if(humans>1&&G.viewer!==G.cur)G.handoff=true;
  G.viewer=G.cur;UI.tab='cmd';sfx('turn');runOrders(G.cur);save();render();centerHQ();}
function save(){try{const g={...G,busy:false,_terr:null};localStorage.setItem('triad-v3',JSON.stringify(g));}catch(e){}}
function loadSave(){try{const s=localStorage.getItem('triad-v3');if(!s)return null;const g=JSON.parse(s);return g&&g.v===3?g:null;}catch(e){return null;}}
