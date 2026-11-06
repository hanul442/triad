/* ===================== FLOW: 새 게임·턴·승패·저장 ===================== */
const START_FORCE=['rifle','rifle','rifle','mg','at','sniper','mortar','ifv'];
function zoneSpots(n){const o=[];for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(inZone(n,r,c))o.push([r,c]);
  const m=(N-1)/2;o.sort((a,b)=>(Math.abs(a[0]-m)+Math.abs(a[1]-m))-(Math.abs(b[0]-m)+Math.abs(b[1]-m)));return o;}
function newGame(cfg){cfg=cfg||{};const size=SIZES[cfg.size||'m']?cfg.size||'m':'m';N=SIZES[size].c;
  const seed=cfg.seed??Math.floor(Math.random()*1e9);const slots=cfg.slots||['human','ai','none','none'];
  const {map,objs}=genMap(seed,SIZES[size].obj);UID=1;
  G={seed,size,map,objs,units:[],turn:1,cur:0,fog:cfg.fog!==false,log:[],ver:1,wx:'clear',diff:cfg.diff||'normal',speed:cfg.speed??140,
    maxR:cfg.maxR||24,vpWin:cfg.vpWin||objs.length*4+10,hist:[],errs:[],scn:cfg.scn||null,
    nats:NATS.map((_,i)=>({ctrl:slots[i]||'none',cp:6,vp:0,alive:slots[i]&&slots[i]!=='none',kills:0,losses:0,used:0,dmg:0}))};
  const act=G.nats.map((x,i)=>x.alive?i:-1).filter(i=>i>=0);G.order=act;
  for(const n of act){const sp=zoneSpots(n);const force=cfg.force||START_FORCE;let i=0;
    for(const t of force){while(i<sp.length&&mcost(t,G.map[sp[i][0]][sp[i][1]])===Infinity)i++;if(i>=sp.length)break;mkUnit(n,t,sp[i][0],sp[i][1]);i++;}}
  G.cur=act[0];G.viewer=act.find(i=>G.nats[i].ctrl==='human')??act[0];
  const humans=act.filter(i=>G.nats[i].ctrl==='human');G.hot=humans.length>1;
  beginTurn(G.cur,true);return G;}
function rollWx(){const r=Math.random();let a=0;for(const k in WX){a+=WX[k].p;if(r<a)return k;}return 'clear';}
function income(n){let cp=BASE_CP;for(const o of G.objs)if(G.map[o.r][o.c].owner===n)cp+=OBJ_CP;
  const k={easy:.75,normal:1,hard:1.3}[G.diff]||1;return isAI(n)&&G.nats.some(x=>x.ctrl==='human')?Math.round(cp*k):cp;}
const objCount=n=>G.objs.filter(o=>G.map[o.r][o.c].owner===n).length;
function beginTurn(n,first){const N2=G.nats[n];
  for(const u of G.units)if(u.nat===n){u.done=false;u.moved=false;u.ow=false;if(u.supp>0)u.supp--;}
  if(!first){N2.cp+=income(n);N2.vp+=objCount(n);}
  bump();checkOver();}
function endTurn(){if(G.over)return;const n=G.cur;for(const u of G.units)if(u.nat===n)u.done=true;
  const ord=G.order.filter(i=>G.nats[i].alive);let i=ord.indexOf(n);let nx=ord[(i+1)%ord.length];
  if(ord.indexOf(nx)<=i){G.turn++;G.wx=Math.random()<.35?rollWx():G.wx;
    for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=G.map[r][c];if(x.smoke>0)x.smoke--;}
    G.hist.push(G.order.map(k=>G.nats[k].vp));}
  G.cur=nx;UI.sel=null;UI.phase=null;UI.pane=null;UI.fc=null;
  if(G.hot&&!isAI(nx)){G.viewer=nx;G.handoff=true;}else if(!isAI(nx))G.viewer=nx;
  beginTurn(nx);save();}
function checkOver(){if(G.over)return G.over;const act=G.order.filter(i=>G.nats[i].alive);
  for(const n of act){const N2=G.nats[n];if(!G.units.some(u=>u.nat===n)&&N2.cp<3&&!objCount(n)){N2.alive=false;L(`${NATS[n].full} 전멸`);}}
  const alive=G.order.filter(i=>G.nats[i].alive);
  if(alive.length<=1){G.over={win:alive[0]??null,why:'적 전멸'};return G.over;}
  if(G.scn){if(typeof scnCheck==='function')scnCheck();return G.over||null;}
  const top=alive.slice().sort((a,b)=>G.nats[b].vp-G.nats[a].vp);
  if(G.nats[top[0]].vp>=G.vpWin){G.over={win:top[0],why:`승점 ${G.vpWin} 달성`};return G.over;}
  if(G.turn>G.maxR){const score=n=>G.nats[n].vp*1000+objCount(n)*100+G.units.filter(u=>u.nat===n).length;top.sort((a,b)=>score(b)-score(a));G.over={win:top[0],why:`${G.maxR}라운드 종료, 승점 우세`};return G.over;}
  return null;}
const SAVE_K='triad-urban-save';
function save(){try{if(typeof localStorage==='undefined'||G.scn==='tut')return;const s=JSON.stringify({G,N,UID},(k,v)=>k==='_vc'?undefined:v);localStorage.setItem(SAVE_K,s);}catch(e){}}
function loadSave(){try{if(typeof localStorage==='undefined')return null;const s=localStorage.getItem(SAVE_K);if(!s)return null;const o=JSON.parse(s);if(!o.G||!o.G.map||o.G.over)return null;return o;}catch(e){return null;}}
