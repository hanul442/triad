/* ===================== HELPERS ===================== */
const $=s=>document.querySelector(s);
const key=(r,c)=>r*100+c, kr=k=>Math.floor(k/100), kc=k=>k%100;
const sleep=ms=>new Promise(res=>setTimeout(res,ms));
let G=null;
const UI={tab:'cmd',group:[],sel:null,phase:null,orig:null,reach:null,targets:[],spots:[],pane:null,fc:null,hk:null,setupSlots:['human','ai','none','none']};
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const inb=(r,c)=>r>=0&&c>=0&&r<N&&c<N;
const dist=(a,b,c,d)=>Math.max(Math.abs(a-c),Math.abs(b-d));
const DIR8=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
function nbrs(r,c){const o=[];for(const [a,b] of DIR8){const x=r+a,y=c+b;if(inb(x,y))o.push([x,y]);}return o;}
const cell=(r,c)=>G.map[r][c];
function unitAt(r,c){for(const u of G.units)if(u.r===r&&u.c===c)return u;return null;}
function occ(){const m=new Map();for(const u of G.units)m.set(key(u.r,u.c),u);return m;}
const natName=n=>n==null?'중립':NATS[n].name;
const mapCol=n=>n==null?'#8b9294':MAPCOL[n];
const isAI=n=>G.nats[n].ctrl==='ai';
const hostile=(a,b)=>a!==b;
const hpMax=u=>UT[u.type].hpMax||10;
const hourOf=()=>(7+(G.turn-1))%24;
const isNight=()=>{const h=hourOf();return h>=20||h<5;};
function L(m){G.log.unshift(m);G.log=G.log.slice(0,8);try{if(typeof document!=='undefined'&&(!isAI(G.cur)||m.includes(natName(G.viewer))))toast(m);}catch(e){}}
function toast(m){if(typeof document==='undefined')return;const el=$('#toast');if(!el)return;el.textContent=m;el.hidden=false;el.classList.remove('in');void el.offsetWidth;el.classList.add('in');clearTimeout(toast.t);toast.t=setTimeout(()=>{el.hidden=true;},2600);}
/* 화면 연출 훅: 3D 화면이 있으면 그쪽에서 바꿔 끼운다. 테스트(노드)에서는 아무것도 하지 않는다. */
const FXH={fire(){},kill(){},collapse(){},strike(){},smoke(){},land(){}};
