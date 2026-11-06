/* ===================== MOVEMENT / VISION / SUPPLY ===================== */
function mcost(type,t){const d=UT[type].d;
  if(d==='air')return 1;if(d==='sea')return t==='sea'?1:Infinity;if(t==='sea')return Infinity;
  const foot=UT[type].foot;if(t==='forest')return foot?1:2;if(t==='mountain')return UT[type].climb?1:foot?2:Infinity;return 1;}
function reach(u){const mv=(UT[u.type].d==='air'&&G.wx==='storm')?0:mvU(u);const lim=UT[u.type].fuel?Math.min(mv,u.fuel):mv;
  const rh=roadHex(),prev=new Map(),best=new Map([[key(u.r,u.c),0]]),q=[[u.r,u.c,0]],loads=new Set(),land=UT[u.type].d==='land',O=occ();
  while(q.length){let bi=0;for(let i=1;i<q.length;i++)if(q[i][2]<q[bi][2])bi=i;const [r,c,d]=q.splice(bi,1)[0];if(d>best.get(key(r,c)))continue;
    for(const [nr,nc] of nbrs(r,c)){const k=key(nr,nc),o=O.get(k);
      if(land&&o&&o.nat===u.nat&&canCarry(o.type,u.type)&&!o.cargo){if(d+1<=lim)loads.add(k);continue;}
      const nd=d+(rh.has(k)&&land?1:mcost(u.type,G.map[nr][nc].t));if(nd>lim)continue;if(o&&o.nat!==u.nat)continue;
      if(!best.has(k)||nd<best.get(k)){best.set(k,nd);prev.set(k,key(r,c));if(!fortStop(u,G.map[nr][nc]))q.push([nr,nc,nd]);}}}
  const res=new Map();for(const [k,v] of best){const o=O.get(k);if(!o||o===u)res.set(k,v);}res.loads=loads;res.prev=prev;return res;}
function connSet(r,c,type){const seen=new Set([key(r,c)]);const q=[[r,c]];
  while(q.length){const [a,b]=q.shift();for(const [x,y] of nbrs(a,b)){const k=key(x,y);if(!seen.has(k)&&mcost(type,G.map[x][y].t)<Infinity){seen.add(k);q.push([x,y]);}}}return seen;}
function visSet(n){const s=new Set();if(G.turn%4===0&&hasTech(n,'sat')){for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)s.add(key(r,c));return s;}const src=[];const g2=hasStaff(n,'g2')?1:0;
  for(const u of G.units)if(u.nat===n)src.push([u.r,u.c,visU(u)]);
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const x=G.map[r][c];if(x.owner!==n)continue;
    let rad=x.t==='hq'?3:x.t==='city'?2:1;if(x.bld&&x.bld.type==='radar'&&!x.bld.left)rad=5;src.push([r,c,rad]);}
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)for(const [a,b,d] of src)if(dist(r,c,a,b)<=d){s.add(key(r,c));break;}return s;}
function seen(e,n,vs){if(!G.fog||e.nat===n)return true;if(!vs.has(key(e.r,e.c)))return false;
  if(UT[e.type].stealth)return G.units.some(u=>u.nat===n&&dist(u.r,u.c,e.r,e.c)<=UT[e.type].stealth);return true;}
function supplySources(n){const g4=hasStaff(n,'g4')?1:0;const S=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const x=G.map[r][c];if(x.owner!==n)continue;
    if(x.t==='hq')S.push({r,c,land:3+g4,sea:1,air:0.5});else if(x.t==='city')S.push({r,c,land:2+g4,sea:1,air:0});
    if(x.bld&&!x.bld.left){const b=x.bld.type;if(b==='depot')S.push({r,c,land:4+g4,sea:0,air:0});if(b==='port'&&!blockaded(r,c))S.push({r,c,land:1,sea:3+g4,air:0});if(b==='airfield')S.push({r,c,land:1,sea:0,air:0.5});}}
  for(const u of G.units)if(u.nat===n&&u.type==='cv')S.push({r:u.r,c:u.c,land:0,sea:1+g4,air:1,truck:u.id});
  for(const u of G.units)if(u.nat===n&&u.type==='truck')S.push({r:u.r,c:u.c,land:1+g4+(hasTech(n,'logistics')?1:0),sea:0,air:0,truck:u.id});return S;}
function inSupply(u,S){const d=UT[u.type].d;return S.some(s=>s[d]&&s.truck!==u.id&&dist(s.r,s.c,u.r,u.c)<=s[d]);}
