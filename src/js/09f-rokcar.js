/* ===================== 지휘·연락 차량 2: 표·행동·AI (렉스턴·타스만·코란도) =====================
   수치와 실제 근거는 05c4-rokcar. 09e-fleet가 표를 빌려 채운 뒤에 고쳐야 해서 09번대.
   1) 표: 민수 차체(장갑 거의 없음), 바퀴 차량, 무장 없음, 승무원(운전병·지휘관·통신병).
   2) 행동(배치만 하면 알아서):
      - 렉스턴·타스만: 전선 뒤(4칸·5.5칸)에 자리 잡는다. 적이 가까이(7칸) 보이거나 맞으면 뒤로 물러난다.
        지휘 범위 안 아군은 조용할 때 사기가 더 빨리 돌아오고, 분대장이 쓰러져 머뭇거리는 시간이 줄어든다.
      - 타스만: 통신 모듈. 범위 안 아군 분대가 본 적은 관측반처럼 포병이 곧바로 쏜다.
      - 코란도: 앞선 아군 바로 뒤까지 올라가 살핀다(관측반처럼 바로 알림). 적이 6칸 안이거나 맞으면 물러난다.
   3) AI: 부대가 늘면 지휘차 하나, 연락차 하나를 부른다(보급 차량처럼 부대 수 상한과 따로). */

/* ---------- 1) 표 ---------- */
{const set=(tb,o)=>{if(tb&&typeof tb==='object')Object.assign(tb,o);};
 const CARS=['korando','rexton','tasman'];
 // 차체 크기(칸). 코란도 스포츠 5.0×1.9m, 렉스턴 스포츠 5.1×1.95m, 타스만 5.4×1.93m. 회전 포탑 없음
 set(typeof VEH==='object'&&VEH,{korando:{hl:.21,hw:.08,trav:0,tol:180},rexton:{hl:.215,hw:.082,trav:0,tol:180},tasman:{hl:.225,hw:.082,trav:0,tol:180}});
 // 장갑: 민수 철판(균질압연강판 환산 mm). 소총탄도 뚫는다
 set(typeof ARM==='object'&&ARM,{korando:[3,2,2,1],rexton:[3,2,2,1],tasman:[3,2,2,1]});
 set(typeof VCREW==='object'&&VCREW,{korando:2,rexton:2,tasman:3});
 if(typeof SEC==='object')for(const t of CARS)SEC[t]=[];
 for(const tb of [typeof AMMO==='object'&&AMMO,typeof LOAD==='object'&&LOAD,typeof SUPF==='object'&&SUPF,typeof VOLLEY==='object'&&VOLLEY,typeof PEN==='object'&&PEN,
   typeof HE==='object'&&HE,typeof GFXW==='object'&&GFXW,typeof WPN==='object'&&WPN])if(tb)for(const c of CARS)delete tb[c];   // 무장 없음
 if(typeof RANGE==='object'&&RANGE.vis)set(RANGE.vis,{korando:11,rexton:9,tasman:9});   // 쌍안경을 든 연락병이 조금 더 멀리 본다
 if(typeof OPT==='object'){set(OPT.vis,{korando:6,rexton:5,tasman:5});for(const t of CARS){if(OPT.therm)delete OPT.therm[t];if(OPT.gl)delete OPT.gl[t];if(OPT.arc)delete OPT.arc[t];}}
 if(typeof OBS==='object'&&OBS.types)OBS.types.korando=1;                                    // 연락차가 본 적은 포병이 바로 쏜다
 if(typeof TRP==='object'&&TRP.cap)set(TRP.cap,{korando:4,rexton:5,tasman:5});              // 덤불은 넘지만 나무는 못 쓰러뜨린다
 if(typeof READ==='object'&&READ.ty)Object.assign(READ.ty,{korando:'연락차',rexton:'지휘차',tasman:'지휘소'});
 if(typeof VOX_CS==='object')Object.assign(VOX_CS,{korando:'연락 #호',rexton:'지휘 #호',tasman:'통신 #호'});
 if(typeof VOX_CS_EN==='object')Object.assign(VOX_CS_EN,{korando:'Courier #',rexton:'Command #',tasman:'Signal #'});
 if(typeof VOX_TN_EN==='object')Object.assign(VOX_TN_EN,{korando:'liaison car',rexton:'command car',tasman:'command post'});
 if(typeof ESC_PREF==='object')for(const t of CARS)delete ESC_PREF[t];
 if(typeof FORM_VEH==='object')for(const t of CARS)delete FORM_VEH[t];
 if(typeof MAN_AUTO==='object')Object.assign(MAN_AUTO,{
   korando:'앞선 아군 바로 뒤까지 올라가 적을 살핍니다. 이 차가 본 적은 포병·박격포가 곧바로 쏩니다. 적이 6칸 안에 오거나 맞으면 물러납니다.',
   rexton:'전선 4칸 뒤에 서서 지휘합니다. 5칸 안 아군은 사기가 빨리 돌아오고 분대장이 쓰러져도 지휘가 빨리 이어집니다. 멀리 가는 작은 조(4명까지)를 태워 줍니다.',
   tasman:'전선 5~6칸 뒤에 이동 지휘소를 차립니다. 7칸 안 아군의 사기·지휘를 받치고, 그 아군이 본 적은 포병이 곧바로 쏩니다.'});
}

/* ---------- 2) 행동 ---------- */
const c2Of=u=>u&&C2[u.type];
const c2Moving=u=>!!(u.path&&u.path.length);
/* 지금 지휘 중인 차량(살아 있고 크게 다치지 않은) 목록. 0.5초마다 다시 센다 */
function c2Posts(){const t=G.time||0;const C=G._c2;if(C&&C.t>t-.5&&C.ver===G.ver)return C.L;
  const L=G.units.filter(u=>C2[u.type]&&C2[u.type].R&&u.hp>hpMax(u)*.3&&!(u.vd&&u.vd.fire));G._c2={t,ver:G.ver,L};return L;}
/* u를 지휘 범위 안에 두는 가장 좋은 차량 */
function c2Cover(u){let best=null;for(const v of c2Posts()){if(v.nat!==u.nat||v===u)continue;const S=C2[v.type];
  if(Math.abs(v.x-u.x)>S.R||Math.abs(v.z-u.z)>S.R||Math.hypot(v.x-u.x,v.z-u.z)>S.R)continue;if(!best||S.mor>C2[best.type].mor)best=v;}return best;}
/* 물러날 자리: 보급소 쪽으로 k칸 */
function c2Back(u,k){const d=depotOf(u.nat);const dx=d.x-u.x,dz=d.z-u.z,L=Math.hypot(dx,dz);if(L<1)return null;
  for(const s of [k,k*.6,k*1.4]){const x=u.x+dx/L*Math.min(s,L),z=u.z+dz/L*Math.min(s,L);const tl=tileAt(x,z);if(tl&&mcost(u.type,tl)<Infinity)return [x,z];}return null;}
/* 연락차가 살펴볼 자리: 적·거점에 가장 가까운 아군 바로 뒤, 알려진 적에게서 8칸 넘게 떨어진 곳 */
function c2Scout(u){const S=C2.korando;const n=u.nat;const d=depotOf(n);
  const tgt=G.objs.filter(o=>o.owner!==n).map(o=>[o.c+.5,o.r+.5]);
  for(const e of G.units)if(hostile(e.nat,n)&&!UT[e.type].fly&&(!G.fog||seen(e,n)))tgt.push([e.x,e.z]);
  if(!tgt.length)return null;
  let lead=null,ld=1e9,goal=null;
  for(const o of G.units){if(o.nat!==n||o===u)continue;const t=UT[o.type];if(t.fly||t.logi||t.ind||!t.rng[1])continue;
    for(const g of tgt){const q=Math.hypot(g[0]-o.x,g[1]-o.z);if(q<ld){ld=q;lead=o;goal=g;}}}
  if(!lead)return null;
  const dx=d.x-lead.x,dz=d.z-lead.z,L=Math.hypot(dx,dz)||1;
  for(const k of [1.5,3,4.5,6,8]){const x=lead.x+dx/L*Math.min(k,L),z=lead.z+dz/L*Math.min(k,L);if(hotAt(n,x,z,S.safe))continue;
    const tl=tileAt(x,z);if(!tl||tl.t==='bldg'||tl.t==='water'||mcost(u.type,tl)===Infinity)continue;return [x,z];}
  return null;}
function c2Tick(dt){const now=G.time||0;
  // 지휘 범위: 사기 회복, 지휘 승계 단축
  if(c2Posts().length)for(const u of G.units){if(UT[u.type].cls!=='inf'&&!(UT[u.type].cls==='veh'&&!UT[u.type].logi))continue;
    if(u.mor==null&&u._lapse==null)continue;const v=c2Cover(u);if(!v)continue;const S=C2[v.type];
    if(u.mor!=null&&(u.supp||0)<.6&&now-(u.casT??-99)>4)u.mor=Math.min(100,u.mor+S.mor*dt);
    if(u._lapse!=null&&u._lapse>now&&u._lpc!==u._lapse){u._lapse=now+(u._lapse-now)*S.lapse;u._lpc=u._lapse;}}
  // 차량 스스로
  for(const u of G.units){const S=c2Of(u);if(!S||!selfRun(u)||u.towBy!=null)continue;if(u.pax&&u.pax.length||u.ferry)continue;
    if(u.vd&&u.vd.mob)continue;
    const hit=now-(u._hitT??-99)<2;const near=hotAt(u.nat,u.x,u.z,S.flee);
    if(hit||near){if((u._c2F||0)<now){u._c2F=now+3;const p=c2Back(u,5);if(p){u.path=pathPts(u,p[0],p[1]);u.dest=p;u._c2T=now+6;}}continue;}
    if((u._c2T||0)>now)continue;u._c2T=now+(c2Moving(u)?4:2.5);
    const p=u.type==='korando'?c2Scout(u):(typeof polStage==='function'?polStage(u,S.back):null);if(!p)continue;
    if(Math.hypot(p[0]-u.x,p[1]-u.z)<(u.type==='korando'?1.2:2))continue;
    if(u.dest&&c2Moving(u)&&Math.hypot(u.dest[0]-p[0],u.dest[1]-p[1])<2)continue;
    const P=pathPts(u,p[0],p[1]);if(P&&P.length){u.path=P;u.dest=p;}}}
{const _rt=rtTick;rtTick=function(dt){const r=_rt.apply(this,arguments);if(G&&!G.over)try{c2Tick(dt);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}return r;};}
/* 타스만 통신 모듈: 범위 안 아군이 본 적은 관측반처럼 바로 사격 요청 */
if(typeof obsNat==='function'){const _o=obsNat;obsNat=function(n,e){const r=_o(n,e);if(r!==2)return r;
  const P=c2Posts().filter(v=>v.nat===n&&C2[v.type].link);if(!P.length)return r;
  const [ex,ez]=posOf(e),V=visMax()+1.5;
  for(const o of G.units){if(o.nat!==n||UT[o.type].fly)continue;const [ox,oz]=posOf(o);if(Math.abs(ox-ex)>V||Math.abs(oz-ez)>V)continue;
    if(!P.some(v=>Math.hypot(v.x-o.x,v.z-o.z)<=C2[v.type].R))continue;if(spots(o,e))return 1;}
  return r;};}

/* ---------- 3) AI ---------- */
function aiC2Buy(n){const N2=G.nats[n];if(!N2||G.over||N2.autoBuy===false)return;   // 자동 증원을 끄면 사지 않는다
  const mine=G.units.filter(u=>u.nat===n);
  const fight=mine.filter(u=>{const t=UT[u.type];return !t.fly&&!t.logi&&t.rng[1]>0;}).length;const cnt=t=>mine.filter(u=>u.type===t).length;
  const buyNear=t=>{if(N2.cp<UT[t].cost)return null;const d=depotOf(n);const sp=deploySpots(n,t);if(!sp.length)return null;
    sp.sort((a,b)=>Math.hypot(kc(a)+.5-d.x,kr(a)+.5-d.z)-Math.hypot(kc(b)+.5-d.x,kr(b)+.5-d.z));return buy(n,t,kr(sp[0]),kc(sp[0]));};
  const now=G.time||0;if((N2._c2B||0)>now)return;   // 잃은 뒤 바로 다시 사지 않는다(2분)
  let got=null;
  if(fight>=10&&!cnt('rexton')&&!cnt('tasman')&&N2.cp>=UT.tasman.cost+4)got=buyNear(Math.random()<.6?'tasman':'rexton');
  else if(fight>=7&&!cnt('korando')&&N2.cp>=UT.korando.cost+3&&Math.random()<.5)got=buyNear('korando');
  if(got)N2._c2B=now+120;}
{const _ai=aiThink;aiThink=function(n){const r=_ai.apply(this,arguments);try{if(G&&G.nats[n]&&aiRun(n))aiC2Buy(n);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}return r;};}

/* ---------- 화면: 정보 줄 ---------- */
if(typeof uInfo==='function'){const _ui=uInfo;uInfo=function(u){let s=_ui(u);const S=c2Of(u);if(!S)return s;
  if(S.R){const k=G.units.filter(o=>o.nat===u.nat&&o!==u&&UT[o.type].cls==='inf'&&Math.hypot(o.x-u.x,o.z-u.z)<=S.R).length;s+=` · 지휘 범위 ${S.R}칸 안 ${k}개 부대`;}
  if(u.type==='korando')s+=' · 살피는 중(본 적은 포병이 바로 쏨)';
  if(S.link)s+=' · 통신 모듈: 범위 안 아군이 본 적은 포병이 바로 쏨';return s;};}
