/* ===================== SIGHT2: 실제처럼 보이고, 들리고, 알아본다 =====================
   1칸 ≈ 12m. 시야선(04b)·밤과 날씨(04e)·광학 장비(05k-optics)·실제 거리(06y-range) 위에 얹는다. AI와 플레이어 모두 같은 규칙.
   - 기상 시정: 날씨마다 눈에 보이는 거리의 상한이 있다(짙은 안개 약 60m, 모래폭풍 약 40m, 눈보라 약 60m, 폭우 약 150m).
     기후에 따라 같은 날씨도 모습이 다르다: 겨울엔 비 → 눈, 폭우 → 눈보라 / 사막엔 안개 → 먼지 연무, 폭우 → 모래폭풍, 한낮 → 아지랑이.
     열상 장비(전차·장갑차·대전차미사일·저격수·드론 등 정규군 장비)는 안개·먼지를 조금 더 꿰뚫어 본다. 드론은 안개·모래에 땅을 거의 못 본다.
   - 밤: 맨눈은 달빛에 따라 40~100m, 야간투시경 110~150m, 열상은 낮과 같다. 흐리면 달빛이 없다.
   - 역광: 해가 낮게 뜬 아침·저녁, 해를 마주 보는 쪽은 60%까지만 보인다.
   - 표적의 노출: 멈춰서 자리 잡은 보병은 더 가까이 와야 보인다. 쏘면 섬광·후폭풍·먼지로 더 멀리서 보이고(전차포·자주포는 훨씬),
     마른 땅을 달리는 차량은 먼지 꼬리로 멀리서 보인다.
   - 소리: 총포 소리와 차량 엔진·궤도 소리는 벽 너머로도 들린다. 들은 쪽은 대강의 자리(멀수록 부정확)를 기억한다(05k-combat의 세력 기억).
     비·폭우·모래폭풍은 소리를 묻는다. 플레이어에게는 미니맵의 '기억된 적' 표시로 보인다.
   - 발견과 식별: 보이기는 해도 시야 거리의 절반보다 멀면 무슨 부대인지 모른다(미확인 보병/차량). */
const SEE={
  wx:{clear:[99,99],haze:[18,18],rain:[30,40],storm:[12,16],fog:[5,9],snow:[16,22],blizzard:[5,8],dust:[10,14],sand:[3,5]},   // [맨눈·야간투시경, 열상] 시정 상한(칸)
  wxFly:{rain:12,storm:6,fog:2,snow:8,blizzard:3,dust:5,sand:2},          // 드론·헬기가 땅을 보는 상한
  night:{eye:[3.5,8],nvg:[9,12.5],old:[6,8.5]},                           // 한밤 시야 상한 [달 없음, 보름달]: 맨눈 · 야간투시경 · 구형 야간 장비
  therm:{tank:1,ifv:1,atgm:1,sniper:1,hmv:1,aa:1,drone:1,gunship:1,fpv:1},   // 열상 장비(정규군). 민병대는 드론만
  still:.8,stillT:3,
  glare:{k:.6,half:.55},
  sig:{mg:1.15,at:1.45,atgm:1.5,tank:1.6,ifv:1.25,spg:1.8,mlrs:2,mortar:1.2,zu:1.3,hmv:1.1,aa:1.3},
  dust:1.3,
  hear:{rifle:30,mg:34,at:30,eng:20,sniper:22,atgm:30,tank:70,ifv:45,hmv:30,zu:45,spg:90,mlrs:90,mortar:34,aa:30,dteam:12},
  engine:{tank:26,ifv:22,spg:24,mlrs:18,hmv:14,zu:14,sup:14,rec:16,amb:12,vbied:12},
  hearWx:{clear:1,haze:1,rain:.75,storm:.5,fog:1,snow:.9,blizzard:.5,dust:.9,sand:.45},
  idK:.5,
};
const WXK={snow:{n:'눈',m:'눈이 내립니다 · 시정 약 200m'},blizzard:{n:'눈보라',m:'눈보라 · 시정 약 60m, 드론·헬기 비행 불가'},
  dust:{n:'먼지 연무',m:'먼지 연무가 깔립니다 · 시정 약 120m, 드론 시야 제한'},sand:{n:'모래폭풍',m:'모래폭풍 · 시정 약 40m, 드론·헬기 비행 불가'},haze:{n:'아지랑이',m:''}};
/* 날씨가 땅 위에서 보이는 모습: 기후를 따른다. 규칙(드론·헬기·명중)은 바탕 날씨(G.wx)를 그대로 쓴다 */
function wxKind(){const w=(G&&G.wx)||'clear';const cl=typeof climeOf==='function'&&G&&!campPlain()?climeOf():'temp';
  if(cl==='winter')return w==='rain'?'snow':w==='storm'?'blizzard':w;
  if(cl==='desert'){if(w==='fog')return 'dust';if(w==='storm')return 'sand';if(w==='clear'&&typeof dayH==='function'){const h=dayH();if(h>=11&&h<=16.5)return 'haze';}}
  return w;}
function wxName(k){k=k||wxKind();return WXK[k]?WXK[k].n:(WX[k]||WX.clear).n;}
/* 비 하나로 시야를 깎던 예전 값은 상한(SEE.wx)으로 옮긴다. 명중·드론 효과는 그대로 */
if(typeof WX_FX==='object'){WX_FX.rain.vis=0;WX_FX.storm.vis=0;WX_FX.fog.vis=0;}

/* 달빛 0~1: 판마다 달의 모양이 다르다(시드로 정함). 구름 낀 날은 달빛이 거의 없다 */
function moonK(){const s=(G&&G.seed)||7;const p=(s*0.6180339887)%1;let m=(1-Math.cos(2*Math.PI*p))/2;const k=wxKind();if(k!=='clear'&&k!=='haze')m*=.2;return m;}
const seeMil=u=>typeof militia==='function'&&militia(u.nat);
function hasTherm(u){if(!SEE.therm[u.type])return false;const t=UT[u.type];return t.fly||!seeMil(u);}
/* 이 부대의 눈이 닿는 상한(칸): 날씨와 밤 */
function seeCap(u){const t=UT[u.type];const k=wxKind();const th=hasTherm(u);let cap=t.fly?(SEE.wxFly[k]??99):(SEE.wx[k]||SEE.wx.clear)[th?1:0];
  const nk=G._day?0:(typeof nightK==='function'?nightK():0);
  if(nk>0&&!th){const kind=t.cls==='inf'?(seeMil(u)?'eye':'nvg'):(seeMil(u)?'old':'nvg');const N2=SEE.night[kind];const m=moonK();const cn=N2[0]+(N2[1]-N2[0])*m;
    const c=cn+(99-cn)*Math.pow(1-nk,2);if(c<cap)cap=c;}
  return cap;}
/* 열상 장비는 밤에도 낮처럼 본다: 밤 시야 감소(04e)와 광학 감소(05k)를 열상 장비에는 걸지 않는다. 민병대 차량은 구형이라 덜 본다 */
if(typeof NIGHT_PEN==='object')NIGHT_PEN.veh=[0,1];
if(typeof optGlass==='function'){const _og=optGlass;optGlass=function(u){const g=OPT.gl[u.type];if(g&&hasTherm(u)&&!UT[u.type].fly)return optStill(u)?g:0;return _og(u);};}
{const _vr=visRange;visRange=function(u){const v=_vr(u);const cap=seeCap(u);return v>cap?Math.max(1,cap):v;};}

/* ---------- 역광 ---------- */
/* 해의 방향(지도 좌표, 화면의 해와 같다: 아침엔 +x, 저녁엔 −x 쪽, 늘 조금 +z). 해가 낮고 하늘이 맑을 때만 */
function sunLow(){if(typeof dayH!=='function'||typeof nightK!=='function')return null;const k=wxKind();if(k!=='clear'&&k!=='haze')return null;if(nightK()>.35)return null;
  const h=dayH();const sa=Math.max(-.95,Math.min(.95,(h-12)/6.5));if(Math.abs(sa)<.55)return null;const x=-12*sa-4,z=8,L=Math.hypot(x,z);return [x/L,z/L];}
function glared(u,e){if(UT[u.type].fly)return false;const s=sunLow();if(!s)return false;const [ux,uz]=posOf(u),[ex,ez]=posOf(e);const dx=ex-ux,dz=ez-uz,L=Math.hypot(dx,dz)||1;
  return (dx*s[0]+dz*s[1])/L>Math.cos(SEE.glare.half);}

/* ---------- 표적의 노출 ---------- */
const seeStill=e=>typeof optStill==='function'?optStill(e)&&(G.time||0)-(e._movT??-99)>=SEE.stillT:false;
function seeFlash(e){return e.firedT!=null&&(G.time||0)-e.firedT<2;}
function dryGround(e){const k=wxKind();if(k!=='clear'&&k!=='haze'&&k!=='dust')return false;if(typeof climeOf==='function'&&climeOf()==='winter')return false;const x=cell(e.r,e.c);return x.t!=='road'&&x.t!=='bldg';}
/* 보이는 거리를 줄이는 것(역광, 멈춘 보병): 1보다 작은 배수 */
function seeShrink(u,e){const t=UT[e.type];let k=1;
  if(t.cls==='inf'&&!t.fly&&!firedRecently(e)&&seeStill(e))k*=SEE.still;
  if(glared(u,e))k*=SEE.glare.k;return k;}
/* 더 멀리서 보이게 하는 것(쏜 직후의 섬광·후폭풍, 달리는 차량의 먼지): 1보다 큰 배수 */
function seeGrow(e){const t=UT[e.type];let k=1;if(seeFlash(e))k=Math.max(k,SEE.sig[e.type]||1);
  if(t.cls==='veh'&&!t.fly&&e.path&&e.path.length&&!seeStill(e)&&dryGround(e))k=Math.max(k,SEE.dust);return k;}
{const _sp=spots;spots=function(u,e){const r=_sp(u,e);const t=UT[e.type];if(t.fly)return r;
  if(r){const k=seeShrink(u,e);if(k>=1)return true;const d=udist(u,e);if(d<.9)return true;
    let v=visRange(u);if(typeof nightK==='function'&&nightK()>=.3&&(seeFlash(e)||(typeof litU==='function'&&litU(e))))v=Math.max(v,visDay(u));   // 조명탄 아래·섬광은 낮 시야로 본 것
    v+=t.cls==='veh'?1:0;if(concealed(e))v*=SPOT_HIDE;return d<=Math.max(1.2,v*k);}
  const g=seeGrow(e);if(g<=1)return false;if(typeof stairHid==='function'&&stairHid(e,u))return false;
  const d=udist(u,e);let v=(visRange(u)+(t.cls==='veh'?1:0))*g;const cap=seeCap(u)*1.3;if(v>cap&&cap<visRange(u)*g)v=Math.max(visRange(u),cap);   // 안개 속 섬광은 조금만 더 멀리
  if(glared(u,e))v*=SEE.glare.k;if(d>v)return false;return losU(u,e);};}

/* ---------- 소리 ---------- */
/* 세력 n 중 (x,z)에서 R칸 안에 있는 지상 부대가 있으면 대강의 자리를 기억한다. 멀수록 크게 빗나간다 */
function hearPut(n,e,x,z,R,how){const M=memOf(n),o=M[e.id],t=G.time||0;if(o&&t-o.t<2.5)return false;let bd=R+1;
  for(const u of G.units){if(u.nat!==n||UT[u.type].fly)continue;const d=Math.hypot(u.x-x,u.z-z);if(d<bd)bd=d;}
  if(bd>R)return false;const er=.4+bd*.1,a=Math.random()*6.283,q=Math.random();memPut(n,e,x+Math.cos(a)*er*q,z+Math.sin(a)*er*q,how||'hear');return true;}
function hearShot(a){const R0=SEE.hear[a.type];if(!R0||UT[a.type].fly)return;const t=G.time||0;if((a._hrT||0)>t)return;a._hrT=t+1.5;
  const R=R0*(SEE.hearWx[wxKind()]??1);for(const n of G.order){if(n===a.nat||!G.nats[n]||!G.nats[n].alive)continue;if(seen(a,n))continue;hearPut(n,a,a.x,a.z,R);}}
if(typeof memFlash==='function'){const _mf=memFlash;memFlash=function(a){_mf(a);try{hearShot(a);}catch(err){}};}
/* 움직이는 차량 소리: 2초마다 */
function hearTick(dt){G._hrT=(G._hrT||0)-dt;if(G._hrT>0)return;G._hrT=2;const W=SEE.hearWx[wxKind()]??1;
  for(const e of G.units){const R0=SEE.engine[e.type];if(!R0||UT[e.type].fly||!(e.path&&e.path.length))continue;
    for(const n of G.order){if(n===e.nat||!G.nats[n]||!G.nats[n].alive)continue;if(seen(e,n))continue;hearPut(n,e,e.x,e.z,R0*W,'hear');}}}
{const _t=rtTick;rtTick=function(dt){_t(dt);if(!G||!G.units||G.over||!G.fog||typeof memOf!=='function')return;try{hearTick(dt);}catch(err){(G.errs=G.errs||[]).push(String(err&&err.stack||err));}};}

/* ---------- 발견과 식별 ---------- */
/* 세력 n이 e가 무슨 부대인지 아는가: 보이는 부대 중 하나라도 시야 거리 × SEE.idK 안에 있으면 안다(쌍안경·조준경 보너스 포함) */
function identified(e,n){if(!G.fog||e.nat===n)return true;const tq=Math.floor((G.time||0)*2);let C=G._idc;if(!C||C.tq!==tq||C.ver!==G.ver)C=G._idc={tq,ver:G.ver,m:new Map()};
  const ck=n+':'+e.id;if(C.m.has(ck))return C.m.get(ck);let ok=false;
  for(const u of G.units){if(u.nat!==n)continue;const d=udist(u,e);const v=visRange(u)*SEE.idK+(UT[e.type].cls==='veh'?1:0);if(d<=Math.max(1.5,v)&&spots(u,e)){ok=true;break;}}
  C.m.set(ck,ok);return ok;}
function unknownName(e){const t=UT[e.type];return t.fly?'미확인 비행체':t.cls==='veh'?'미확인 차량':'미확인 보병';}
/* 마우스를 올렸을 때 글: 알아보지 못한 적은 종류와 체력을 숨긴다 */
if(typeof renderTip==='function'){const _rt=renderTip;renderTip=function(){_rt();try{const el=typeof $==='function'&&$('#tip');if(!el||el.hidden||!G||!G.fog||UI.hk==null)return;
  const u=unitAt(kr(UI.hk),kc(UI.hk));if(!u||u.nat===G.viewer||!seen(u,G.viewer)||identified(u,G.viewer))return;
  el.innerHTML=el.innerHTML.replace(`${UT[u.type].n}</span> ${u.hp}/${hpMax(u)}`,`${unknownName(u)}</span> · 멀어서 식별 불가`);}catch(err){}};}

/* ---------- 화면 글: 날씨 이름과 시정 ---------- */
function seeTag(){const n=G.viewer;if(n==null)return '';const probe={type:'rifle',nat:n};const c=seeCap(probe);const s=[];if(c<14)s.push(`시정 약 ${Math.round(c*12/10)*10}m`);
  if(sunLow())s.push(dayH()<12?'동쪽 역광':'서쪽 역광');return s.join(' · ');}
if(typeof envTag==='function'){const _et=envTag;envTag=function(){let s=_et();const k=wxKind();if(WXK[k]&&WXK[k].n)s=s.replace((WX[G.wx]||WX.clear).n,WXK[k].n);const x=seeTag();return x?s+' · '+x:s;};}
