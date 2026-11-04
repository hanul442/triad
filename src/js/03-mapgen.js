/* ===================== MAP GEN ===================== */
function genMap(seed,starts,mt){const arch=mt==='arch';const rnd=mulberry(seed);let v=[];
  for(let r=0;r<ROWS;r++){v[r]=[];for(let c=0;c<COLS;c++)v[r][c]=rnd();}
  for(let it=0;it<4;it++){const nv=v.map(x=>x.slice());for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){let s=v[r][c],n=1;for(const [a,b] of nbrs(r,c)){s+=v[a][b];n++;}nv[r][c]=s/n;}v=nv;}
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const e=Math.min(r,c,ROWS-1-r,COLS-1-c);if(e<2)v[r][c]-=0.05*(2-e);}
  const flat=v.flat().sort((a,b)=>a-b);const th=flat[Math.floor(flat.length*(arch?0.64:0.42))],hi=flat[Math.floor(flat.length*0.94)];
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
