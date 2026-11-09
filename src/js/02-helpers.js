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
/* 칸 (r,c)의 부대. fl을 주면 그 층의 부대만(건물 한 칸에 층마다 다른 분대가 있을 수 있다, 05e flOf) */
function unitAt(r,c,fl){for(const u of G.units)if(u.r===r&&u.c===c&&(fl==null||flOf(u)===fl))return u;return null;}
function unitsAt(r,c){return G.units.filter(u=>u.r===r&&u.c===c);}
function occ(){const m=new Map();for(const u of G.units)m.set(key(u.r,u.c),u);return m;}
/* 칸마다 그 칸의 부대 목록 */
function occAll(){const m=new Map();for(const u of G.units){const k=key(u.r,u.c);const a=m.get(k);if(a)a.push(u);else m.set(k,[u]);}return m;}
const natName=n=>n==null?'중립':NATS[n].name;
const mapCol=n=>n==null?'#8b9294':MAPCOL[n];
const isAI=n=>G.nats[n].ctrl==='ai';
/* AI 두뇌가 이 세력을 움직이는가: AI 세력, 또는 플레이어가 부관(06f-auto)에게 맡긴 세력 */
const aiRun=n=>G.nats[n].ctrl==='ai'||!!G.nats[n].auto;
/* 지원 부대는 누가 지휘하든 배치하면 제 일을 알아서 한다(06f-auto).
   보급 트럭·구난차·구급차: 탄약 보급·견인·수리·부상자 후송 / 박격포·자주포·다연장: 사거리 끝 안전한 자리로 옮겨 쏨 /
   저격수: 높은 곳·적과 5칸 거리 / 정찰드론: 적과 거점 쪽을 살핌 / 드론팀·FPV: 자리 잡고 자폭드론 운용 / 대공·대공포·전자전: 아군 곁을 따라감.
   플레이어가 직접 명령하면 그 일을 마칠 때까지(그 뒤 45초, 사수 명령이면 풀 때까지)는 손대지 않는다(u.man). */
/* 대공 병종(요격·격추를 하는 쪽) */
const AA_T={aa:1,zu:1,spaa:1};
const SELF_RUN={sup:1,rec:1,amb:1,mortar:1,spg:1,mlrs:1,sniper:1,drone:1,dteam:1,fpv:1,aa:1,zu:1,ew:1};
const selfRun=u=>aiRun(u.nat)||(!!SELF_RUN[u.type]&&!u.hold&&!(u.man!=null&&typeof autoManual==='function'&&autoManual(u)));
const hostile=(a,b)=>a!==b;
const hpMax=u=>UT[u.type].hpMax||10;
const hourOf=()=>Math.floor(typeof dayH==='function'?dayH():(7+(G.turn-1))%24);
const isNight=()=>typeof nightK==='function'?nightK()>=.5:(h=>h>=20||h<5)(hourOf());
function L(m){G.log.unshift(m);G.log=G.log.slice(0,8);try{if(typeof document!=='undefined'&&(!isAI(G.cur)||m.includes(natName(G.viewer))))toast(m);}catch(e){}}
function toast(m){if(typeof document==='undefined')return;const el=$('#toast');if(!el)return;el.textContent=m;el.hidden=false;el.classList.remove('in');void el.offsetWidth;el.classList.add('in');clearTimeout(toast.t);toast.t=setTimeout(()=>{el.hidden=true;},2600);}
/* 화면 연출 훅: 3D 화면이 있으면 그쪽에서 바꿔 끼운다. 테스트(노드)에서는 아무것도 하지 않는다. */
const FXH={fire(){},kill(){},collapse(){},strike(){},smoke(){},land(){}};
