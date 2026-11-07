/* ===================== 전투 기록: 파괴된 도시와 전황의 기록 =====================
   전투 내내 G.chron에 기록을 남긴다. 화면은 07r-recap.js가 그린다.
   - base: 전투 시작 때 도시(칸마다 지형·층수)
   - fr: 3초마다 부대 위치·거점 주인·세력별 전력
   - ev: 사건(격파·건물 붕괴·화재·거점 확보·화력 지원·추락)
   - hits: 포탄·폭발이 떨어진 곳(지도에 탄흔으로 남는다)
   - heat: 칸마다 전투가 얼마나 격렬했는지
   전투가 끝나면 chronEnd()가 통계를 내고 기록 보관함(localStorage)에 넣는다. */
const CHRON={dt:3,maxEv:500,maxHits:900,keep:6,key:'triad-chron'};
const CHRON_TYPES=Object.keys(UT);
const b36=(v,w)=>{v=Math.max(0,Math.min(36**w-1,Math.round(v)));return v.toString(36).padStart(w,'0');};
/* 칸 하나를 글자 하나로: 건물은 층수(A=0층…), 나머지는 지형 */
function chronTile(x){if(x.t==='bldg')return String.fromCharCode(65+Math.min(25,x.f||1));return {road:'r',plaza:'p',park:'g',rubble:'x',water:'w'}[x.t]||'r';}
function chronMap(){let t='',d='',b='';for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=G.map[r][c];t+=chronTile(x);
    d+=x.t==='bldg'&&x.bmax?String(Math.max(0,Math.min(9,Math.round(x.bhp/x.bmax*9)))):'9';b+=x.burnt||x.fire>0?'1':'0';}
  return {t,d,b};}
function chronInit(){if(!G||!G.map)return;
  G.chron={v:1,t0:Date.now(),base:chronMap(),fr:[],ev:[],hits:[],heat:new Array(N*N).fill(0),top:{},peak:{},nx:0,shots:G.order.map(()=>0),strikes:G.order.map(()=>0),fires:0};
  chronSample();}
const chronOn=()=>G&&G.chron&&!G.chron.end;
function chronHeat(x,z,v){const C=G.chron;const r=Math.floor(z),c=Math.floor(x);if(!inb(r,c))return;C.heat[r*N+c]=Math.round((C.heat[r*N+c]+v)*10)/10;}
function chronEv(k,x,z,o){if(!chronOn())return;const C=G.chron;if(C.ev.length>=CHRON.maxEv&&k==='kill')return;
  C.ev.push(Object.assign({t:Math.round((G.time||0)*10)/10,k,x:Math.round(x*100)/100,z:Math.round(z*100)/100},o||{}));}
/* 3초마다 한 장: 부대마다 6글자(세력·병종·x·z), 거점 주인, 세력별 전력(체력 합) */
function chronSample(){const C=G.chron;let u='';const s=G.order.map(()=>0);
  for(const x of G.units){if(x.dead)continue;const j=G.order.indexOf(x.nat);if(j<0)continue;s[j]+=Math.max(0,x.hp||0);
    u+=x.nat+b36(CHRON_TYPES.indexOf(x.type),1)+b36(x.x*8,2)+b36(x.z*8,2);}
  const o=G.objs.map(ob=>{const w=G.map[ob.r][ob.c].owner;return w==null?'-':String(w);}).join('');
  C.fr.push({t:Math.round((G.time||0)*10)/10,u,o,s:s.map(v=>Math.round(v))});
  // 거점 주인이 바뀌었으면 사건으로
  const prev=C.lastO;if(prev!=null)for(let i=0;i<o.length;i++)if(o[i]!==prev[i]&&o[i]!=='-'){const ob=G.objs[i];chronEv('cap',ob.c+.5,ob.r+.5,{n:+o[i],w:prev[i]==='-'?null:+prev[i],o:i});}
  C.lastO=o;
  for(const n of G.order){const k=objCount(n);if(k>(C.peak[n]||0))C.peak[n]=k;}
  C.nx=(G.time||0)+CHRON.dt;}
/* 유닛 하나의 짧은 이름(경험치 스레드가 u.name을 붙이면 그걸 쓴다) */
const chronName=u=>u.name||`${UT[u.type].n} ${u.id}호`;

/* ---------- 게임 로직에 기록을 건다 (원래 함수는 그대로 부른다) ---------- */
{const _ng=newGame;newGame=function(cfg){const g=_ng(cfg);try{chronInit();}catch(e){}return g;};}
{const _k=kill;kill=function(u,by){const live=G.units.includes(u);const ux=u.x,uz=u.z;_k(u,by);
  if(!live||!chronOn())return;chronHeat(ux,uz,3);
  if(by){const T=G.chron.top;const id=by.id;T[id]=T[id]||{n:by.nat,ty:by.type,nm:chronName(by),k:0};T[id].k++;T[id].nm=chronName(by);}
  chronEv('kill',ux,uz,{n:u.nat,ty:u.type,by:by?by.nat:null,bt:by?by.type:null});};}
{const _d=damageBldg;damageBldg=function(r,c,amt){const x=G.map[r][c];const was=x.t==='bldg',f0=x.f;_d(r,c,amt);
  if(!was||!chronOn())return;chronHeat(c+.5,r+.5,Math.min(4,(amt||0)*.15));
  if(x.t!=='bldg')chronEv('fall',c+.5,r+.5,{f:f0,o:x.obj!=null?x.obj:undefined});};}
if(typeof ignite==='function'){const _i=ignite;ignite=function(r,c,p){const ok=_i(r,c,p);if(ok&&chronOn()){G.chron.fires++;chronEv('fire',c+.5,r+.5);}return ok;};}
{const _s=support;support=function(n,kind,r,c){const ok=_s(n,kind,r,c);if(ok&&chronOn()){const j=G.order.indexOf(n);if(j>=0)G.chron.strikes[j]++;chronEv('sup',c+.5,r+.5,{n,s:kind});chronHeat(c+.5,r+.5,2);}return ok;};}
if(typeof shellBoom==='function'){const _b=shellBoom;shellBoom=function(s,x,z,h,r,c){_b(s,x,z,h,r,c);if(!chronOn())return;const C=G.chron;chronHeat(x,z,1.5);
  if(C.hits.length<CHRON.maxHits)C.hits.push([Math.round(x*50)/50,Math.round(z*50)/50,r!=null?1:0,Math.round(G.time||0)]);};}
{const _sh=rtShoot;rtShoot=function(a,d){const r=_sh(a,d);if(chronOn()&&d){chronHeat(d.x,d.z,.08);const j=G.order.indexOf(a.nat);if(j>=0)G.chron.shots[j]++;}return r;};}
if(typeof crashAt==='function'){const _c=crashAt;crashAt=function(cr){_c(cr);if(chronOn()&&cr&&cr.big)chronEv('crash',cr.x??0,cr.z??0,{ty:cr.kind});};}
{const _t=rtTick;rtTick=function(dt){_t(dt);if(!G||!G.chron)return;if(chronOn()&&(G.time||0)>=G.chron.nx)chronSample();if(G.over&&!G.chron.end)chronEnd();};}

/* ---------- 전투가 끝나면: 통계 ---------- */
function chronStats(){const C=G.chron;const B=C.base.t,F=chronMap();let b0=0,fl0=0,fallen=0,flLost=0,dmg=0,burnt=0;
  for(let i=0;i<B.length;i++){const a=B.charCodeAt(i);if(a<65||a>90)continue;const f=a-65;b0++;fl0+=f;
    if(F.t[i]==='x'){fallen++;flLost+=f;}else{if(+F.d[i]<9)dmg++;}if(F.b[i]==='1')burnt++;}
  const nats=G.order.map((n,j)=>{const x=G.nats[n];const cs=x.cas||{};
    return {n,ctrl:x.ctrl,alive:!!x.alive,vp:x.vp,objs:objCount(n),peak:C.peak[n]||0,kills:x.kills||0,losses:x.losses||0,kia:cs.kia||0,wia:(cs.wia||0)+(cs.lw||0),evac:cs.evac||0,bought:x.bought||0,shots:C.shots[j]||0,strikes:C.strikes[j]||0,units:G.units.filter(u=>u.nat===n).length};});
  const top=Object.values(C.top).sort((a,b)=>b.k-a.k).slice(0,3);
  return {b0,fl0,fallen,flLost,dmg,burnt,ruin:fl0?Math.round(flLost/fl0*100):0,shells:C.hits.length,fires:C.fires,nats,top,fin:F};}
/* 주요 장면: 첫 교전, 첫 붕괴, 가장 큰 붕괴, 거점 쟁탈, 마지막 격파 */
function chronMoments(){const C=G.chron;const M=[];const ev=C.ev;const nm=n=>n==null?'중립':NATS[n].name;
  const first=k=>ev.find(e=>e.k===k);const k1=first('kill');if(k1)M.push({t:k1.t,x:k1.x,z:k1.z,k:'kill',s:`첫 교전: ${nm(k1.n)} ${UT[k1.ty]?UT[k1.ty].n:''} 격파`});
  const falls=ev.filter(e=>e.k==='fall');if(falls.length){const f1=falls[0];M.push({t:f1.t,x:f1.x,z:f1.z,k:'fall',s:`첫 건물 붕괴 (${f1.f}층)`});
    const big=falls.slice(1).sort((a,b)=>b.f-a.f)[0];if(big&&big.f>=3)M.push({t:big.t,x:big.x,z:big.z,k:'fall',s:`${big.f}층 건물 붕괴${big.o!=null?' · '+G.objs[big.o].name:''}`});}
  const caps=ev.filter(e=>e.k==='cap');const swaps=caps.filter(e=>e.w!=null);
  for(const e of swaps.slice(0,4))M.push({t:e.t,x:e.x,z:e.z,k:'cap',s:`${nm(e.n)}, ${G.objs[e.o].name} 탈환`});
  if(!swaps.length&&caps.length){const e=caps[caps.length-1];M.push({t:e.t,x:e.x,z:e.z,k:'cap',s:`${nm(e.n)}, ${G.objs[e.o].name} 확보`});}
  const fs=first('fire');if(fs)M.push({t:fs.t,x:fs.x,z:fs.z,k:'fire',s:'시가지에 첫 화재'});
  const cr=first('crash');if(cr)M.push({t:cr.t,x:cr.x,z:cr.z,k:'crash',s:'항공기 추락'});
  const kl=ev.filter(e=>e.k==='kill'&&!(UT[e.ty]&&UT[e.ty].fly));if(kl.length>1){const e=kl[kl.length-1];M.push({t:e.t,x:e.x,z:e.z,k:'kill',s:`마지막 격파: ${nm(e.n)} ${UT[e.ty]?UT[e.ty].n:''}`});}
  M.sort((a,b)=>a.t-b.t);return M.slice(0,10);}
/* 끝. 통계를 내고 보관함에 넣는다(구경용 첫 화면 전투·훈련은 빼고) */
function chronEnd(){const C=G.chron;if(!C||C.end)return;chronSample();C.end=1;C.stats=chronStats();C.moments=chronMoments();
  if(!G.boot&&G.scn!=='tut'){try{chronArchive(chronRecord());}catch(e){}}}
/* 보관용 기록 한 건 */
function chronRecord(){const C=G.chron,S=C.stats;
  return {v:1,id:C.t0,at:Date.now(),seed:G.seed,size:G.size,N,scn:G.scn||null,viewer:G.viewer,order:G.order.slice(),win:G.over?G.over.win:null,why:G.over?G.over.why:'',time:Math.round(G.time||0),
    objs:G.objs.map(o=>({r:o.r,c:o.c,name:o.name})),base:C.base,fin:S.fin,heat:C.heat,fr:C.fr,ev:C.ev,hits:C.hits,stats:Object.assign({},S,{fin:undefined}),moments:C.moments,img:C._img||null};}
function chronList(){try{if(typeof localStorage==='undefined')return [];const a=JSON.parse(localStorage.getItem(CHRON.key)||'[]');return Array.isArray(a)?a:[];}catch(e){return [];}}
/* 새 기록을 앞에 넣는다. 저장 공간이 모자라면 오래된 기록의 사진·리플레이부터 덜어 낸다 */
function chronArchive(rec){if(typeof localStorage==='undefined')return false;let a=chronList().filter(x=>x.id!==rec.id);a.unshift(rec);a=a.slice(0,CHRON.keep);
  for(let tries=0;tries<12;tries++){try{localStorage.setItem(CHRON.key,JSON.stringify(a));return true;}catch(e){
    const old=a.slice(1).reverse().find(x=>x.img)||a.slice(1).reverse().find(x=>x.fr&&x.fr.length);
    if(old){if(old.img)old.img=null;else old.fr=[];continue;}if(a.length>1){a.pop();continue;}if(rec.img){rec.img=null;continue;}if(rec.fr.length){rec.fr=rec.fr.filter((_,i)=>i%2===0);continue;}return false;}}
  return false;}
/* 기록을 화면에 붙인 사진으로 보탠다(종군기자 카메라 같은 기능이 쓸 수 있다): chronPhoto(dataURL, '설명') */
function chronPhoto(url,cap){if(!G||!G.chron||!url)return;const C=G.chron;C._ph=C._ph||[];C._ph.push({t:Math.round(G.time||0),url,cap:cap||''});if(C._ph.length>12)C._ph.shift();}
