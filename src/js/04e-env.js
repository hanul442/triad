/* ===================== 야간전과 날씨 =====================
   - 시간: 한 라운드(30초) = 1시간. 시작 시각을 고를 수 있고, 밤은 해질녘·새벽에 서서히 온다(nightK 0~1).
   - 밤 시야: 정규군 보병은 야간투시경(시야 −1), 민병대(홀수 세력) 보병은 맨눈(−2).
     차량·저격수·정찰드론은 열상 장비라 덜 깎인다. 밤에는 조준도 흔들린다(명중률 감소).
   - 조명탄: 지정한 곳 위에서 터져 낙하산에 매달려 천천히 내려온다. 비추는 동안은 그 둘레가 낮처럼 보인다(양쪽 모두).
     불타는 건물도 주변을 비춘다. 밤에 쏘면 총구 불꽃 때문에 더 멀리서 보인다.
   - 날씨: 맑음·비·짙은 안개·폭우가 몇 라운드씩 이어지며 바뀐다. 비·안개는 시야와 명중을 깎고,
     드론은 비에 느려지고 카메라가 흐려지며, 안개에는 땅을 거의 못 본다. 폭우에는 드론·헬기가 뜨지 못하고 떠 있던 드론은 바람에 떨어진다. */

const NIGHT_PEN={inf:[1,2],veh:[1,2],sniper:[0,1],drone:[0,0],fpv:[1,1],gunship:[0,0]};   // [정규군, 민병대] 밤 시야 감소
const NIGHT_ACC={inf:[.85,.7],veh:[.92,.8],sniper:[.95,.85],fly:[.95,.95]};               // 밤에 비추지 않은 표적을 쏠 때 명중 배수
const WX_FX={
  clear:{vis:0,fly:0,acc:1,flyAcc:1,spd:1,crash:0},
  rain:{vis:-1,fly:-2,acc:.92,flyAcc:.85,spd:.75,crash:.004},
  fog:{vis:-2,fly:-3,acc:.88,flyAcc:.7,spd:.9,crash:0},
  storm:{vis:-2,fly:-3,acc:.85,flyAcc:.6,spd:.55,crash:.06},
};
/* 날씨가 다음 라운드에 바뀔 확률과 바뀐다면 어디로 */
const WX_STAY={clear:.86,rain:.75,fog:.7,storm:.6};
const WX_NEXT={clear:{rain:.55,fog:.33,storm:.12},rain:{clear:.5,storm:.32,fog:.18},fog:{clear:.7,rain:.3},storm:{rain:.8,clear:.2}};
const START_HOURS={day:7,dusk:17,night:22,dawn:3};
/* 시간 흐름 모드: 게임 속 1시간이 실제 몇 초인가 (0 = 시간이 멈춤). 한 판(12분)에 흐르는 시간: 실시간 12분, 느리게 3시간, 보통 6시간, 빠르게 하루 */
const TIME_FLOW={fixed:{n:'고정',s:0},real:{n:'실시간',s:3600},slow:{n:'느리게',s:240},normal:{n:'보통',s:120},fast:{n:'빠르게',s:30}};
const hourSec=()=>{const f=TIME_FLOW[G&&G.tflow];return f?f.s:30;};

const FLARE={up:3.5,top:5.2,dur:42,rad:4.6,drift:.05};   // 터지기까지(초), 터지는 높이(칸), 타는 시간, 비추는 반경(칸)
Object.assign(SUP,{flare:{n:'조명탄',cost:1,rad:3,any:1,cdK:'flT',cd:10,fn:(n,r,c)=>flareCall(n,c+.5,r+.5),off:()=>nightK()<.3,
  desc:'박격포 조명탄. 보이지 않는 곳에도 쏠 수 있음. 40초 동안 둘레 4칸을 낮처럼 밝힘(적에게도 보임). 밤에만'}});

/* ---------- 시간 ---------- */
function dayH(){const s=hourSec();return ((G&&G.h0!=null?G.h0:7)+(s?((G&&G.time)||0)/s:0))%24;}
const smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
/* 0 = 낮, 1 = 한밤. 17:30~20:00 저물고, 04:00~06:30 밝아온다 */
function nightK(){if(!G)return 0;const h=dayH();return h>=12?smooth(17.5,20,h):1-smooth(4,6.5,h);}
/* 해질녘·새벽의 노을 정도(조명 색에만 쓴다) */
function duskK(){if(!G)return 0;const h=dayH();const k=Math.max(1-Math.abs(h-18.4)/1.6,1-Math.abs(h-5.4)/1.4,0);return k;}

/* ---------- 빛 ---------- */
const militia=n=>n%2===1;
function gearOf(u){const t=UT[u.type];if(t.fly)return NIGHT_PEN[u.type]?u.type:t.heli?'gunship':'drone';if(u.type==='sniper')return 'sniper';return t.cls==='veh'?'veh':'inf';}
/* 지금 빛나는 것들: 떠 있는 조명탄과 불타는 건물. 0.5초마다 다시 모은다 */
function lights(){const tq=Math.floor(((G&&G.time)||0)*2);const c=G._lit;if(c&&c.tq===tq&&c.ver===G.ver)return c;
  const L=[];let sig='';
  for(const f of G.flares||[]){const k=flareK(f);if(k<=0)continue;const x=Math.round(f.x*2)/2,z=Math.round(f.z*2)/2,rr=Math.round(FLARE.rad*k*2)/2;if(rr<.5)continue;L.push([x,z,rr]);sig+=x+','+z+','+rr+';';}
  for(const k of G.fires||[]){const r=kr(k),c2=kc(k);const x=G.map[r]&&G.map[r][c2];if(!x||!(x.fire>0))continue;L.push([c2+.5,r+.5,1.8]);sig+=k+';';}
  return G._lit={tq,ver:G.ver,L,sig};}
/* 조명탄이 비추는 세기: 터진 직후 밝고, 땅에 가까워질수록 좁아진다 */
function flareK(f){const t=(G.time||0)-f.t0;if(t<FLARE.up||t>FLARE.up+FLARE.dur)return 0;const a=(t-FLARE.up)/FLARE.dur;return Math.min(1,a*12)*(a>.8?(1-a)/.2:1);}
function litAt(x,z){if(nightK()<.3)return true;for(const [lx,lz,rr] of lights().L)if((x-lx)*(x-lx)+(z-lz)*(z-lz)<=rr*rr)return true;return false;}
const litU=u=>litAt(u.x??u.c+.5,u.z??u.r+.5);

/* 시야 보정(04b visRange가 부른다). G._day가 켜져 있으면 밤 보정 없이 계산한다(조명 받은 곳 판정용) */
function envVis(u){const t=UT[u.type];const W=WX_FX[G.wx]||WX_FX.clear;let v=t.fly?(t.heli?Math.ceil(W.fly/2):W.fly):W.vis;
  const nk=G._day?0:nightK();if(nk>0){const p=NIGHT_PEN[gearOf(u)]||NIGHT_PEN.inf;v-=Math.round(p[militia(u.nat)?1:0]*nk*2)/2;}
  return v;}
function visDay(u){G._day=1;try{return visRange(u);}finally{G._day=0;}}

/* 명중 보정: 밤에 비추지 않은 표적은 잘 안 맞고, 비·안개도 조준을 흐린다 */
function envHit(a,d){const ta=UT[a.type];if(ta.ind)return 1;const W=WX_FX[G.wx]||WX_FX.clear;let k=ta.fly?W.flyAcc:W.acc;
  if(G.wx==='fog'&&!ta.fly&&udist(a,d)<2.5)k=1;
  const nk=nightK();if(nk>0&&!litU(d)){const g=ta.fly?'fly':a.type==='sniper'?'sniper':ta.cls==='veh'?'veh':'inf';const m=NIGHT_ACC[g][militia(a.nat)?1:0];k*=1-(1-m)*nk;}
  return k;}
{const _h=hitP;hitP=function(a,d){const r=_h(a,d);r.p*=envHit(a,d);return r;};}

/* 발견: 밤이라 못 봤어도, 표적이 조명 아래 있거나 방금 쏴서 총구 불꽃이 보이면 낮 시야로 다시 따진다 */
{const _sp=spots;spots=function(u,e){if(_sp(u,e))return true;const nk=nightK();if(nk<.3||UT[e.type].fly)return false;
  const flash=firedRecently(e)&&(G.time||0)-e.firedT<2;if(!flash&&!litU(e))return false;
  const t=UT[e.type];let v=Math.min(visDay(u),visRange(u)+(flash?3:9))+(t.cls==='veh'?1:0);
  if(concealed(e))v*=SPOT_HIDE;if(t.hide&&inside(e)&&!firedRecently(e)&&e.shot!==G.turn)v=Math.min(v,1.5);
  const d=udist(u,e);if(d>v)return false;return d<.9||losU(u,e);};}

/* 안개(전장의 안개) 점: 밤 시야 밖이라도 조명이 비추는 곳은 보인다 */
{const _fov=unitFov;unitFov=function(u){const a=_fov(u);if(nightK()<.3)return a;const Ls=lights();if(!Ls.L.length)return a;
  const [ux,uz]=posOf(u);const vd=visDay(u);if(!Ls.L.some(([x,z,rr])=>Math.hypot(x-ux,z-uz)<vd+rr))return a;
  const c=u._fovL;if(c&&c.a===a&&c.sig===Ls.sig&&c.vd===vd)return c.p;
  const keepA=u._fov;u._fov=u._fovD;G._day=1;let b;try{b=_fov(u);}finally{G._day=0;}u._fovD=u._fov;u._fov=keepA;
  const M=N*FOW_R;const S=new Set(a);const out=a.slice();
  for(const p of b){if(S.has(p))continue;const i=p%M,j=(p-i)/M;if(litAt((i+.5)/FOW_R,(j+.5)/FOW_R))out.push(p);}
  u._fovL={a,sig:Ls.sig,vd,p:out};return out;};}

/* ---------- 조명탄 ---------- */
function flareCall(n,x,z){G.flares=G.flares||[];const f={id:UID++,nat:n,x,z,t0:G.time||0};G.flares.push(f);
  if(FXH.flare)FXH.flare(f);sfx('launch',.6);L(`${natName(n)} 조명탄 발사`);return f;}
function flareTick(dt){if(!G.flares||!G.flares.length)return;const w=FLARE.drift*dt;
  G.flares=G.flares.filter(f=>{const t=(G.time||0)-f.t0;if(t>FLARE.up)f.x=Math.min(N-.1,Math.max(.1,f.x+w)),f.z=Math.min(N-.1,Math.max(.1,f.z+w*.4));return t<=FLARE.up+FLARE.dur;});}

/* ---------- 날씨 ---------- */
function wxRound(){if(G.wxLock)return;const s=hourSec()||120;if(Math.random()>Math.min(1,60/s))return;   // 시간이 느리게 흐르면 날씨도 드물게 바뀐다
  const cur=G.wx||'clear';if(Math.random()<WX_STAY[cur])return;
  const nx=WX_NEXT[cur];let r=Math.random(),k=cur;for(const w in nx){r-=nx[w];if(r<0){k=w;break;}}
  if(k===cur)return;G.wx=k;const msg={clear:'날씨가 갰습니다',rain:'비가 내리기 시작합니다 · 시야와 드론 운용 감소',fog:'짙은 안개가 깔립니다 · 드론이 땅을 거의 못 봅니다',storm:'폭우와 강풍 · 드론·헬기 비행 불가'}[k];
  L(`날씨: ${msg}`);if(k==='storm')stormGround();bump();}
/* 폭우가 오면 공격헬기는 철수한다 */
function stormGround(){for(const u of G.units.slice())if(UT[u.type].heli&&typeof airRemove==='function'){L(`${natName(u.nat)} 공격헬기 기상 악화로 철수`);airRemove(u);}}
const airGrounded=type=>!!(G&&WX[G.wx]&&WX[G.wx].noAir&&UT[type]&&(UT[type].fly||UT[type].dteam));
{const _ds=deploySpots;deploySpots=function(n,type){if(airGrounded(type)&&UT[type].fly)return [];return _ds(n,type);};}
/* 드론: 바람·비에 느려지고 흔들리며, 폭우엔 떨어진다 */
function wxFlyK(u){const t=UT[u.type];if(!t.fly||t.heli)return 1;return (WX_FX[G.wx]||WX_FX.clear).spd;}
{const _mv=rtMove;rtMove=function(u,dt){const k=wxFlyK(u);if(k===1)return _mv(u,dt);const x0=u.x,z0=u.z;_mv(u,dt);if(!G.units.includes(u))return;u.x=x0+(u.x-x0)*k;u.z=z0+(u.z-z0)*k;rtCell(u);};}
if(typeof droneTick==='function'){const _dt=droneTick;droneTick=function(u,dt){const t=UT[u.type];const W=WX_FX[G.wx]||WX_FX.clear;
  if(W.crash&&!t.heli&&Math.random()<W.crash*dt){L(`${natName(u.nat)} ${t.n} ${G.wx==='storm'?'강풍에':'비바람에'} 추락`);if(typeof airDown==='function')airDown(u,'wx');FXH.kill(u);if(typeof airRemove==='function')airRemove(u);G.nats[u.nat].losses++;return false;}
  const k=wxFlyK(u);if(k===1)return _dt(u,dt);const x0=u.x,z0=u.z;const r=_dt(u,dt);if(!G.units.includes(u))return r;
  u.x=x0+(u.x-x0)*k;u.z=z0+(u.z-z0)*k;rtCell(u);return r;};}
if(typeof dteamTick==='function'){const _tt=dteamTick;dteamTick=function(u,dt){if(airGrounded('fpv')){u.dsT=0;return;}return _tt(u,dt);};}

/* ---------- AI 조명탄 ---------- */
/* 밤에 사격을 받는데 쏜 적이 안 보이거나, 거점 근처에서 싸울 때 그 앞을 밝힌다 */
function aiFlare(n){const N2=G.nats[n];if(nightK()<.6||!canSupport(n,'flare',0,0))return false;
  if(N2.cp<SUP.flare.cost)return false;
  if((G.flares||[]).some(f=>f.nat===n&&(G.time||0)-f.t0<FLARE.up+FLARE.dur*.7))return false;
  const mine=G.units.filter(u=>u.nat===n&&!UT[u.type].fly);
  const E=G.units.filter(e=>e.nat!==n&&!UT[e.type].fly);
  let best=null,bs=0;
  for(const u of mine){const s=(u.supp>.2?2:0)+(G.objs.some(o=>Math.hypot(o.c+.5-u.x,o.r+.5-u.z)<3&&G.map[o.r][o.c].owner!==n)?1:0)+(E.some(e=>Math.hypot(e.x-u.x,e.z-u.z)<15&&!seen(e,n))?1:0);if(!s)continue;
    if(litU(u))continue;
    // 가장 가까운 적(보이든 안 보이든 대략 그쪽) 2.5칸 앞
    let tx=N/2,tz=N/2,bd=99;for(const e of E){const d=Math.hypot(e.x-u.x,e.z-u.z);if(d<bd){bd=d;tx=e.x;tz=e.z;}}
    if(bd>16)continue;const sc=s+Math.random();if(sc>bs){bs=sc;const k=Math.max(bd*.6,bd-2.5)/(bd||1);/* 적 바로 앞을 비춘다 */best=[u.x+(tx-u.x)*k,u.z+(tz-u.z)*k];}}
  if(!best)return false;const r=Math.min(N-1,Math.max(0,Math.floor(best[1]))),c=Math.min(N-1,Math.max(0,Math.floor(best[0])));
  return support(n,'flare',r,c);}

/* ---------- 매 틱 ---------- */
function envTick(dt){flareTick(dt);
  // AI는 2초마다, 그리고 수입이 막 들어온 직후(지휘점수를 다 쓰기 전)에 조명탄을 따져 본다
  const fresh=G._envR!==G.turn;G._envR=G.turn;G._envT=(G._envT||0)-dt;if(G._envT<=0||fresh){G._envT=2;for(const n of G.order){if(!aiRun(n)||!G.nats[n].alive)continue;if(fresh||Math.random()<.35)try{aiFlare(n);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}}}}
{const _tk=rtTick;rtTick=function(dt){if(G&&!G.over)envTick(dt);return _tk(dt);};}

/* HUD 글: 날씨와 그 효과 */
function envTag(){const w=WX[G.wx]||WX.clear;const nk=nightK();const s=[w.n];if(w.noAir)s.push('드론 비행 불가');else if(G.wx==='fog')s.push('드론 시야 제한');else if(G.wx==='rain')s.push('드론 느림');
  if(nk>=.5)s.push(militia(G.viewer)?'맨눈 야간':'야간투시경');if(G.tflow==='fixed')s.push('시간 고정');return s.join(' · ');}
