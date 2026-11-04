/* ===================== HELPERS ===================== */
const $=s=>document.querySelector(s);
const key=(r,c)=>r*100+c, kr=k=>Math.floor(k/100), kc=k=>k%100;
const sleep=ms=>new Promise(res=>setTimeout(res,ms));
let G=null;
const UI={tab:'cmd',zoom:1,sel:null,phase:null,orig:null,reach:null,loads:[],targets:[],unloads:[],pane:null,setupSlots:['human','ai','ai','ai','ai','none']};
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function px(r,c){return [S3*R*(c+0.5*(r&1))+S3*R/2,1.5*R*r+R];}
function nbrs(r,c){const d=(r&1)?[[0,-1],[0,1],[-1,0],[-1,1],[1,0],[1,1]]:[[0,-1],[0,1],[-1,-1],[-1,0],[1,-1],[1,0]];
  const o=[];for(const [a,b] of d){const x=r+a,y=c+b;if(x>=0&&x<ROWS&&y>=0&&y<COLS)o.push([x,y]);}return o;}
function cube(r,c){const x=c-(r-(r&1))/2;return [x,r,-x-r];}
function dist(a,b,c,d){const p=cube(a,b),q=cube(c,d);return Math.max(Math.abs(p[0]-q[0]),Math.abs(p[1]-q[1]),Math.abs(p[2]-q[2]));}
function hexLine(a,b){const n=dist(a[0],a[1],b[0],b[1]);const A=cube(...a),B=cube(...b);const out=[];
  for(let i=0;i<=n;i++){const t=n?i/n:0;let x=A[0]+(B[0]-A[0])*t+1e-6,y=A[1]+(B[1]-A[1])*t+1e-6,z=A[2]+(B[2]-A[2])*t-2e-6;
    let rx=Math.round(x),ry=Math.round(y),rz=Math.round(z);const dx=Math.abs(rx-x),dy=Math.abs(ry-y),dz=Math.abs(rz-z);
    if(dx>dy&&dx>dz)rx=-ry-rz;else if(dy>dz)ry=-rx-rz;else rz=-rx-ry;
    const rr=ry,cc=rx+(ry-(ry&1))/2;if(rr>=0&&rr<ROWS&&cc>=0&&cc<COLS)out.push([rr,cc]);}return out;}
const cell=(r,c)=>G.map[r][c];
function unitAt(r,c){for(const u of G.units)if(u.r===r&&u.c===c)return u;return null;}
function occ(){const m=new Map();for(const u of G.units)m.set(key(u.r,u.c),u);return m;}
const natCol=n=>n==null?'var(--neutral)':NATS[n].col;
const natName=n=>n==null?'중립':NATS[n].name;
const hasStaff=(n,role)=>G.nats[n].staff.some(s=>s.role===role);
const isAI=n=>G.nats[n].ctrl==='ai';
function L(m){G.log.unshift(m);G.log=G.log.slice(0,6);try{if(typeof document!=='undefined'&&G.viewer!=null&&(!isAI(G.cur)||m.includes(natName(G.viewer))))toast(m);}catch(e){}}
const fmtCost=c=>c.map((v,i)=>v?`${RES[i]} ${v}`:'').filter(Boolean).join(' · ')||'무료';
function bCost(n,type){const c=BT[type].cost;return hasStaff(n,'eng')?c.map(v=>Math.ceil(v*0.7)):c;}
function canPay(n,c){const N=G.nats[n];return N.f>=c[0]&&N.s>=c[1]&&N.o>=c[2];}
function pay(n,c){const N=G.nats[n];N.f-=c[0];N.s-=c[1];N.o-=c[2];}
function hasAmmo(u){return UT[u.type].ua||u.ammo>0;}
function rngOf(t){return UT[t].rng||[1,1];}
const hasTech=(n,k)=>(G.nats[n].tech||[]).includes(k);
function rngU(u){const r=rngOf(u.type);return (u.type==='art'||u.type==='mlrs')&&hasTech(u.nat,'precision')?[r[0],r[1]+1]:r;}
function mvU(u){const t=UT[u.type];let m=t.mv-(u.supNow?1:0);if(t.d==='air'){if(G.wx==='storm')return 0;if(hasTech(u.nat,'jet'))m+=2;}
  if(G.wx==='rain'&&t.d==='land'&&u.type!=='inf')m-=1;if(G.wx==='storm'&&t.d==='sea')m-=2;return Math.max(1,m);}
function visU(u){const t=UT[u.type];let v=t.vis+(hasStaff(u.nat,'g2')?1:0)+(hasTech(u.nat,'radar')?1:0);if(G.wx==='fog')v--;if(G.turn&&isNight())v--;if(G.wx==='rain'&&t.d==='air')v--;return Math.max(1,v);}
const pk=(a,b)=>Math.min(a,b)+'-'+Math.max(a,b);
const atPeace=(a,b)=>!!(G.peace&&G.peace[pk(a,b)]>G.turn);
function hostile(a,b){if(a==null||b==null||a===b)return false;return !atPeace(a,b);}
const openTo=(n,o)=>o==null||hostile(n,o);
function uCost(n,t){const c=UT[t].cost;return hasTech(n,'mass')?[Math.ceil(c[0]*0.8),c[1],c[2]]:c;}
function power(n){let p=0;for(const u of G.units)if(u.nat===n)p+=UT[u.type].cost[0]*u.hp/10+1;for(const row of G.map)for(const x of row)if(x.owner===n&&(x.t==='city'||x.t==='hq'))p+=2;return p;}
