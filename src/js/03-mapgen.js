/* ===================== MAP GEN ===================== */
function genMap(seed,starts,mt,land,relief){const arch=mt==='arch';const seaQ=(arch?0.64:0.42)+({few:.1,many:-.12}[land]||0),hiQ={low:.975,high:.86}[relief]||.94;const rnd=mulberry(seed);let v=[];
  for(let r=0;r<ROWS;r++){v[r]=[];for(let c=0;c<COLS;c++)v[r][c]=rnd();}
  for(let it=0;it<4;it++){const nv=v.map(x=>x.slice());for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){let s=v[r][c],n=1;for(const [a,b] of nbrs(r,c)){s+=v[a][b];n++;}nv[r][c]=s/n;}v=nv;}
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const e=Math.min(r,c,ROWS-1-r,COLS-1-c);if(e<2)v[r][c]-=0.05*(2-e);}
  const flat=v.flat().sort((a,b)=>a-b);const th=flat[Math.floor(flat.length*seaQ)],hi=flat[Math.floor(flat.length*hiQ)];
  const m=[];for(let r=0;r<ROWS;r++){m[r]=[];for(let c=0;c<COLS;c++)m[r][c]={t:v[r][c]>th?'plain':'sea',owner:null,bld:null};}
  const setLand=(r,c)=>{if(m[r][c].t==='sea')m[r][c].t='plain';};
  for(const s of starts)for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(dist(r,c,s[0],s[1])<=2)setLand(r,c);
  const link=(a,b)=>{for(const [r,c] of hexLine(a,b)){setLand(r,c);if(rnd()<0.5){const nb=nbrs(r,c);const [x,y]=nb[Math.floor(rnd()*nb.length)];setLand(x,y);}}};
  if(arch){}else if(starts.length===2)link(starts[0],starts[1]);else for(let i=0;i<starts.length;i++)link(starts[i],starts[(i+1)%starts.length]);
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const x=m[r][c];if(x.t==='sea')continue;if(v[r][c]>hi)x.t='mountain';else if(rnd()<0.2)x.t='forest';}
  for(const s of starts)for(const [r,c] of [s,...nbrs(...s)])if(m[r][c].t!=='sea')m[r][c].t='plain';
  for(const s of starts)for(const a of nbrs(...s))for(const [r,c] of nbrs(...a))if(m[r][c].t==='mountain')m[r][c].t='forest';
  const sites=[...starts];
  const place=(t,ok,tries=600)=>{for(let i=0;i<tries;i++){const r=Math.floor(rnd()*ROWS),c=Math.floor(rnd()*COLS);const x=m[r][c];
      if(x.t==='sea'||SITES.includes(x.t))continue;if(sites.some(s=>dist(r,c,s[0],s[1])<3))continue;if(!ok(r,c))continue;
      x.t=t;sites.push([r,c]);return true;}return false;};
  for(const s of starts){const near=(a,b)=>(r,c)=>{const d=dist(r,c,s[0],s[1]);return d>=a&&d<=b;};
    place('city',near(3,4));place('oil',near(3,5));place('mine',near(3,5));}
  const far=(r,c)=>starts.every(s=>dist(r,c,s[0],s[1])>=4);
  const A=(ROWS*COLS)/(26*18);let cities=0;while(cities<Math.round(5*A)+starts.length*2&&place('city',far))cities++;
  {let rigs=0,tries=0;while(rigs<Math.round(3*A)+2&&tries++<2000){const r=Math.floor(rnd()*ROWS),c=Math.floor(rnd()*COLS);const x=m[r][c];
      if(x.t!=='sea'||x.rig||!far(r,c)||nbrs(r,c).filter(([a,b])=>m[a][b].t==='sea').length<5||sites.some(s=>dist(r,c,s[0],s[1])<3))continue;x.rig=true;sites.push([r,c]);rigs++;}}
  for(let i=0;i<Math.round(4*A)+1;i++)place('oil',far);for(let i=0;i<Math.round(4*A)+1;i++)place('mine',far);
  return m;}
/* 도로·교역로: 거점(도시·수도·유전·광산)끼리 가까운 2곳까지 바다·산을 피해 잇는다. */
function buildRoads(){const sites=[];for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(['city','hq','oil','mine'].includes(G.map[r][c].t))sites.push([r,c]);
  const out=[],done=new Set();
  for(const a of sites){const near=sites.filter(b=>b!==a).map(b=>[b,dist(a[0],a[1],b[0],b[1])]).filter(p=>p[1]<=7).sort((p,q)=>p[1]-q[1]).slice(0,2);
    for(const [b] of near){const id=[key(...a),key(...b)].sort().join('-');if(done.has(id))continue;done.add(id);const line=hexLine(a,b);
      if(line.some(([r,c])=>G.map[r][c].t==='sea'||G.map[r][c].t==='mountain'))continue;out.push({a:key(...a),b:key(...b),p:line.map(([r,c])=>key(r,c))});}}
  G.roads=out;}
const RH={g:null,s:null};
function roadHex(){if(RH.g!==G.roads){RH.g=G.roads;RH.s=new Set((G.roads||[]).flatMap(r=>r.p));}return RH.s;}
// 교역로 상태: 양 끝을 같은 세력이 갖고 경로에 적 부대가 없으면 활성
function routeStates(){const O=occ();return (G.roads||[]).map(rt=>{const A=G.map[kr(rt.a)][kc(rt.a)],B=G.map[kr(rt.b)][kc(rt.b)];const o=A.owner;
  if(o==null||B.owner!==o)return {rt,o:null,active:false};let cut=null,at=null;for(const k of rt.p){const u=O.get(k);if(u&&hostile(o,u.nat)){cut=u.nat;at=k;break;}}return {rt,o,active:cut==null,cut,at};});}
function connectedCities(n){const N=G.nats[n];if(!N||!N.hq)return new Set();const adj=new Map();
  for(const s of routeStates()){if(s.o!==n||!s.active)continue;for(const [x,y] of [[s.rt.a,s.rt.b],[s.rt.b,s.rt.a]]){if(!adj.has(x))adj.set(x,[]);adj.get(x).push(y);}}
  const st=key(...N.hq),seen=new Set([st]),q=[st];while(q.length){const k=q.shift();for(const y of adj.get(k)||[])if(!seen.has(y)){seen.add(y);q.push(y);}}return seen;}
const SPREAD={0:{n:'집중',d:[8],desc:'한 칸에 강한 피해'},1:{n:'표준',d:[5,3],desc:'중심과 주변 6칸'},2:{n:'광역',d:[4,3,2],desc:'반경 2칸 넓게, 약하게'}};
function damageCity(r,c,chance){const x=G.map[r][c];if(!(x.t==='city'||x.t==='hq'))return;if((x.ruin||0)<3&&Math.random()<chance){x.ruin=(x.ruin||0)+1;x.rep=0;L(`${names().city[key(r,c)]||'도시'} 시가지 파괴 (${x.ruin}/3)`);}}
