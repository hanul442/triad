/* ===================== OPTICS: 병종별 시야와 곡사 관측 =====================
   - 병종마다 맨눈 시야가 다르다(OPT.vis). 멈춰서 자리를 잡으면 쌍안경·조준경·열상 장비로 더 멀리 본다(OPT.gl, OPT.settle초 뒤).
     밤에는 광학 보너스가 줄어든다(열상 장비가 있는 차량·대전차미사일은 덜 준다).
   - 전차·장갑차는 교전 중(최근 20초 안에 쏘았거나 맞았거나 제압됨) 해치를 닫는다: 앞쪽(포탑 방향) 부채꼴만 제 거리로 보고,
     옆·뒤는 잠망경으로 짧게 본다(OPT.arc).
   - 곡사(박격포·자주포·다연장)는 관측자가 본 적만 쏜다.
       자기 눈·쌍안경으로 보면 바로, 정찰 드론·저격수·드론팀·험비는 OBS.fast초, 다른 아군 분대는 무전 사격 요청 OBS.call초 뒤.
       재밍으로 무전이 끊긴 관측자의 보고는 닿지 않는다(드론은 재밍되면 떨어진다). 적이 4초 넘게 안 보이면 요청은 처음부터. */
const OPT={settle:2.5,
  vis:{rifle:5,mg:5,at:5,eng:4,sniper:7,mortar:4,atgm:6,aa:6,ew:4,dteam:5,ifv:5,tank:6,hmv:6,zu:5,spg:3,mlrs:3,sup:4,rec:4},
  gl:{sniper:2,mortar:3,atgm:2,mg:1,aa:1,hmv:1,ifv:1,tank:1},          // 멈췄을 때 광학 보너스(칸)
  therm:{atgm:1,ifv:1,tank:1},                                            // 열상: 밤에도 광학 보너스 유지
  arc:{tank:{half:.9,k:.45},ifv:{half:1.15,k:.55}},                       // 해치 닫음: 앞 부채꼴 반각(rad), 그 밖 거리 배율
  button:20};
const OBS={fast:2,call:8,lost:4,types:{drone:1,sniper:1,dteam:1,hmv:1,gunship:1}};
for(const k in OPT.vis)if(UT[k])UT[k].vis=OPT.vis[k];
if(UT.mortar)UT.mortar.desc='곡사. 멈추면 쌍안경으로 7칸까지 직접 관측. 드론·저격수가 본 적은 1.5초, 다른 아군 분대가 본 적은 무전 요청 5초 뒤 포격';
if(UT.spg)UT.spg.desc='곡사 장거리 포격. 관측자(드론·저격수·아군 분대 무전)가 본 곳을 쏘고, 이동 직후엔 쏘지 못함. 가까이 붙은 적에 약함';
if(UT.mlrs)UT.mlrs.desc='곡사 로켓 12발을 넓게 흩뿌림. 관측자가 본 곳을 쏘고, 다시 장전하는 데 25초. 가까운 적·대포병에 약함';
if(UT.sniper)UT.sniper.desc+='. 멈추면 조준경으로 9칸, 곡사 화기의 관측자 노릇';
/* 멈춘 지 얼마나 됐나 */
const optStill=u=>G.time==null||(G.time-(u._movT??-99))>=OPT.settle;
function optGlass(u){const g=OPT.gl[u.type];if(!g||!optStill(u))return 0;const nk=typeof nightK==='function'?nightK():0;return OPT.therm[u.type]?g:g*(1-.7*nk);}
{const _vr=visRange;visRange=function(u){const v=_vr(u);if(cell(u.r,u.c).smoke>0&&!UT[u.type].fly)return v;return v+optGlass(u);};}
{const _vm=visMax;visMax=function(){return _vm()+3;};}
/* 해치 닫은 차량의 시야각 */
function optButtoned(u){const a=OPT.arc[u.type];if(!a)return false;const t=G.time||0;return (u.supp||0)>0||t-(u.firedT??-99)<OPT.button||t-(u._hitT??-99)<OPT.button;}
function fovArc(u){if(!optButtoned(u))return null;const A=OPT.arc[u.type];const fd=u.tf??u.face??0;const f=fd*Math.PI/180;const q=Math.round(fd/15);   // 포탑 방향(차량 움직임 #43의 u.tf)을 본다
  return {key:'b'+q,k:a=>{let d=Math.abs(((a-f)%(2*Math.PI)+3*Math.PI)%(2*Math.PI)-Math.PI);return d<=A.half?1:A.k;}};}
{const _sp=spots;spots=function(u,e){if(!_sp(u,e))return false;const ar=fovArc(u);if(!ar)return true;const [ux,uz]=posOf(u),[ex,ez]=posOf(e);
  const k=ar.k(Math.atan2(ez-uz,ex-ux));if(k>=1)return true;const d=Math.hypot(ex-ux,ez-uz);return d<=Math.max(1.2,(visRange(u)+1)*k);};}
{const _h=harm;harm=function(u,amt,by,o){if(u&&amt>0)u._hitT=G.time||0;return _h(u,amt,by,o);};}
/* ---------- 곡사 관측 ---------- */
/* 세력 n에서 e를 가장 빨리 알려 줄 수 있는 관측자 종류: 1 관측 전문·곡사 반(빠름), 2 분대 무전, -1 없음. 0.25초마다 다시 센다 */
function obsNat(n,e){const t=G.time||0,tq=Math.floor(t*4);let C=G._obn;if(!C||C.tq!==tq||C.ver!==G.ver)C=G._obn={tq,ver:G.ver,m:new Map()};
  const ck=n+':'+e.id;if(C.m.has(ck))return C.m.get(ck);let best=-1;const [ex,ez]=posOf(e),V=visMax()+1.5;
  for(const o of G.units){if(o.nat!==n)continue;const [ox,oz]=posOf(o);if(Math.abs(ox-ex)>V||Math.abs(oz-ez)>V)continue;
    const c=OBS.types[o.type]||UT[o.type].ind?1:2;if(best!==-1&&c>=best)continue;
    if(!UT[o.type].fly&&typeof radioCut==='function'&&radioCut(o))continue;if(!spots(o,e))continue;best=c;if(c===1)break;}
  C.m.set(ck,best);return best;}
/* 관측된 적에 대한 사격 요청 상태: G.cff[n][id]={t0,last,c} */
function obsReady(a,e){const t=G.time||0;if(spots(a,e))return true;
  const c=obsNat(a.nat,e);if(c<0)return false;
  const C=(G.cff=G.cff||{})[a.nat]=(G.cff[a.nat]||{});let r=C[e.id];
  if(!r||t-r.last>OBS.lost)r=C[e.id]={t0:t,last:t,c};r.last=t;if(c<r.c)r.c=c;
  return t-r.t0>=(r.c===1?OBS.fast:OBS.call);}
{const _ch=canHit;canHit=function(a,d,fromR,fromC,moved){const r=_ch(a,d,fromR,fromC,moved);if(!r||!G.fog||!UT[a.type].ind)return r;
  if(fromR!=null)return obsNat(a.nat,d)>=0;           // AI가 자리를 따져 볼 때는 관측자가 있는지만 본다
  return obsReady(a,d);};}
/* 움직인 시각 기록 */
{const _t=rtTick;rtTick=function(dt){_t(dt);if(!G||!G.units)return;const t=G.time||0;for(const u of G.units){const px=u._opx,pz=u._opz;
  if(px==null||Math.abs(u.x-px)+Math.abs(u.z-pz)>.02){u._movT=t;u._opx=u.x;u._opz=u.z;}}};}
