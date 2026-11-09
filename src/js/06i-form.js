/* ===================== FORM-AI: AI 소대·차량의 행군 대형 =====================
   05o-form의 대형을 AI(부관 포함)가 쓴다.
   - 소대 행군(06c tacMove에서 목표가 멀고 적이 안 보일 때): 예전에는 분대마다 따로 몇 칸씩 갔다.
     이제 선두 분대를 정하고 나머지는 시가지에서는 엇갈린 종대, 트인 곳에서는 쐐기로 따라간다.
     근처(4칸)에 놀고 있는 전차·장갑차·험비가 있으면 소대에 붙여 선두로 세우고, 보병 둘은 차체 뒤에 붙어 걷는다.
     차량은 보병 걸음에 맞춰 간다. 목표가 가까워지거나 적이 보이면 대형을 풀고 예전처럼 번갈아 이동·교전한다.
   - 따로 진격하는 AI 차량(06b aiArmsAdvance): 같은 쪽으로 가는 앞 차가 가까우면 그 뒤에 붙어 차량 종대로 간다. */
const FORM_HIDE={form:1};
const FORM_VEH={tank:1,ifv:1,hmv:1};
function formRelease(p,M){for(const u of M)if(u.fol&&u.fol.by==='tac')u.fol=null;const v=p._fv!=null?formUnit(p._fv):null;
  if(v&&v.fesc===p.id){v.fesc=null;v.fol=null;}p._fv=null;p._fl=null;}
/* 소대에 붙일 차량: 4칸 안, 놀고 있거나 혼자 진격 중, 다른 소대에 안 붙은 것 */
function formPickVeh(p,c){const n=p.nat,t=G.time||0;let best=null,bd=4;
  for(const v of G.units){if(v.nat!==n||!FORM_VEH[v.type]||v._pj||v.man||v.post||v.cqb||v.hold||v.msn||v.hp<hpMax(v)*.4)continue;
    if(v.fesc!=null&&v.fesc!==p.id&&t-(v.fescT||-99)<5)continue;if(v.fol&&v.fol.by!=='tac')continue;
    const d=Math.hypot(v.x-c[0],v.z-c[1]);if(d<bd){bd=d;best=v;}}
  return best;}
/* 길을 앞에서 len칸까지만 */
function formCut(u,P,len){const out=[];let px=u.x,pz=u.z,left=len;
  for(const p of P){const s=Math.hypot(p[0]-px,p[1]-pz);if(s>=left){const f=left/(s||1);out.push([px+(p[0]-px)*f,pz+(p[1]-pz)*f]);return out;}out.push(p);left-=s;px=p[0];pz=p[1];}
  return out;}
function formMarch(p,M,gx,gz,d){const t=G.time||0;const c=tacCtr(p);
  let v=p._fv!=null?formUnit(p._fv):null;if(v&&(v.nat!==p.nat||v._pj||v.man||v.hold||Math.hypot(v.x-c[0],v.z-c[1])>7))v=null;
  if(!v&&aiRun(p.nat))v=formPickVeh(p,c);
  if(v){v.fesc=p.id;v.fescT=t;p._fv=v.id;if(v.fol)v.fol=null;}else p._fv=null;
  let L=v;if(!L){L=p._fl!=null?M.find(u=>u.id===p._fl):null;if(!L)L=formPickLead(M,gx,gz);}
  p._fl=L.id;if(L.fol)L.fol=null;
  // 선두: 길을 따라 몇 칸씩. 남은 길이 짧아지면 미리 더 간다(멈칫하지 않게)
  const e=L.path&&L.path.length?L.path[L.path.length-1]:null;
  if(!e||Math.hypot(e[0]-L.x,e[1]-L.z)<2.2){const P=formCut(L,pathPts(L,gx,gz),Math.min(6,d));
    if(P.length){L.path=P;L.dest=null;L.tgt=null;L.tgtTile=null;if(L.tk)L.tk.at=t;}}
  if(L.tk)L.tk.role='move';
  formBuild(L,M,'tac',null);
  for(const u of M)if(u!==L&&u.tk){u.tk.role='move';}}
{const _tm=tacMove;tacMove=function(p,M,objs){if(!p.obj||!M.length)return _tm(p,M,objs);
  const [or,oc]=p.obj;const gx=p.pt?p.pt[0]:oc+.5,gz=p.pt?p.pt[1]:or+.5;const c=tacCtr(p);const d=Math.hypot(gx-c[0],gz-c[1]);
  const arrived=d<1.8||p.mode==='defend'&&d<3;
  const near=d<TAC.travel||p.mode==='recon'||tacKnown(p.nat).some(k=>Math.hypot(k.x-c[0],k.z-c[1])<12);
  if(arrived||near||M.length<2&&!(aiRun(p.nat)&&formPickVeh(p,c))){formRelease(p,M);return _tm(p,M,objs);}
  formMarch(p,M,gx,gz,d);};}
// 접적·후퇴 등으로 행군을 벗어난 소대는 대형을 푼다
{const _tp=tacPlatoon;tacPlatoon=function(p,K,objs){_tp(p,K,objs);if(p.st!=='move'&&(p._fv!=null||p._fl!=null))formRelease(p,tacMembers(p));};}
/* 혼자 진격하는 AI 차량: 앞 차를 따라 차량 종대 */
if(typeof aiArmsAdvance==='function'){const _a=aiArmsAdvance;aiArmsAdvance=function(n,u,E,goal){const ok=_a(n,u,E,goal);
  if(!ok||!formGV(u)||u.fol)return ok;try{formConvoy(n,u,goal);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}return ok;};}
function formConvoy(n,u,goal){const gx=goal[1]+.5,gz=goal[0]+.5;const my=Math.hypot(gx-u.x,gz-u.z);const end=u.path[u.path.length-1];
  let best=null,bd=5;
  for(const v of G.units){if(v===u||v.nat!==n||!formGV(v)||!v.path||!v.path.length||v.fesc!=null&&v.fesc!==undefined)continue;
    const ve=v.path[v.path.length-1];if(Math.hypot(ve[0]-end[0],ve[1]-end[1])>3.5)continue;if(Math.hypot(gx-v.x,gz-v.z)>my-.6)continue;
    const d=Math.hypot(v.x-u.x,v.z-u.z);if(d<bd){bd=d;best=v;}}
  if(!best)return;
  // 줄 끝에 선다(이미 누가 따르고 있으면 그 뒤로). 돌고 도는 고리는 만들지 않는다
  let tail=best,guard=0;for(;;){const nx=G.units.find(o=>o!==u&&o.fol&&o.fol.L===tail.id&&o.fol.k==='col'&&formGV(o));if(!nx||guard++>8)break;tail=nx;}
  for(let x=tail,g=0;x&&g<10;g++){if(x===u)return;x=x.fol?formUnit(x.fol.L):null;}
  u.fol={L:tail.id,k:'col',i:1,d0:FORM.gapV,gap:FORM.gapV,end:end.slice(),by:'arm'};formP(u,u.path);u._fT=null;}
// 행군 대형의 차량·따르는 차량은 예전 AI가 건드리지 않는다
{const _ai=aiThink;aiThink=function(n){const t=G.time||0;const hid=[];
  for(const u of G.units)if(u.nat===n&&!u.job&&(u.fesc!=null&&t-(u.fescT||-99)<5||u.fol&&u.fol.by==='arm')){u.job=FORM_HIDE;hid.push(u);}
  try{return _ai(n);}finally{for(const u of hid)if(u.job===FORM_HIDE)u.job=null;}};}
// 오래된 차량 붙임은 푼다(소대가 사라졌거나 판단이 끊김)
{const _t=rtTick;rtTick=function(dt){_t(dt);if(!G||G.over||!G.units)return;const t=G.time||0;if((G._fvT||0)>t)return;G._fvT=t+1;
  for(const v of G.units)if(v.fesc!=null&&t-(v.fescT||-99)>=5){v.fesc=null;}};}
