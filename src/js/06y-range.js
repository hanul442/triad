/* ===================== RANGE: 실제 교전 거리 (1칸 ≈ 12m) =====================
   예전 값은 맨눈 시야 60m, 소총 60m라서 큰길에서도 늘 코앞에서 싸웠다. 실제 시가전 보병 교전은 길을 따라 50~150m,
   소총 유효 사거리는 300m 남짓이다. 그래서 직사 화기의 시야·사거리를 약 두 배로 늘리고, 실제로 어디까지 보이는지는
   시야선(건물·지형·연기)에 맡긴다. 골목·건물 사이에서는 여전히 가깝고, 큰길·광장·강변에서는 멀리서 싸운다.
   먼 거리 사격은 대부분 빗나간다: 거리 자체에 따른 명중 감소(RANGE.d50칸에서 절반)를 더하고,
   빗나가도 탄이 가까이 지나가면 몸을 숙이게(제압) 해서 먼 거리 사격은 주로 적을 묶어 두는 역할을 한다.
   곡사(박격포·자주포·다연장)는 관측자 체계가 따로 있어 이 파일에서 바꾸지 않는다. */
const RANGE={
  vis:{rifle:14,mg:14,at:14,eng:10,sniper:14,ifv:12,tank:12,hmv:12,zu:10,aa:12,atgm:12,ew:8,dteam:10,sup:8,rec:8,amb:8,drone:14,gunship:10},
  // 사거리 [최소, 최대](칸). 직사 화기는 실제 유효 사거리지만 실제로는 눈에 보이는 데까지(시야선)만 쏜다.
  //   소총 5.56mm 유효 ~300m지만 분대 표적 교전은 ~200m · 기관총 ~250m(지도 시야 한계) · RPG ~150m · 저격 ~300m(시야 한계)
  //   재블린급 대전차미사일 최소 65m · 전차포·기관포는 시야 끝까지 · 휴대 대공 미사일 ~300m
  // 곡사 화기는 관측자(분대 무전·드론·저격수)가 본 곳을 지도 끝까지 쏜다. 너무 가까우면 못 쏜다(최소 사거리).
  //   60~81mm 박격포 최소 ~70m · 견인·자주포 고각 사격 최소 ~150m · 다연장 로켓 최소 ~250m
  rng:{rifle:[1,16],mg:[1,20],at:[1,12],sniper:[2,25],ifv:[1,20],tank:[1,22],hmv:[1,18],zu:[1,20],aa:[1,25],atgm:[5,25],gunship:[0,8],
       mortar:[6,45],spg:[12,90],mlrs:[20,90]},
  gl:{sniper:6,atgm:6,mg:2,aa:2,hmv:2,ifv:3,tank:3},   // 멈췄을 때 광학 장비로 더 보는 거리(칸)
  d50:{rifle:9,mg:11,at:7,eng:4,sniper:40,ifv:14,tank:28,hmv:10,zu:12,aa:14,atgm:60,ew:4,dteam:4},   // 이 거리에서 명중률이 절반(조준·탄 퍼짐)
  envK:2,          // 밤·날씨·높은 곳 시야 보정도 같은 비율로 키운다
  nearSup:.55,     // 소총·차량 기관총 연사가 보병 근처를 지나가면 이만큼 제압
};
for(const k in RANGE.vis)if(UT[k]){UT[k].vis=RANGE.vis[k];if(typeof OPT==='object'&&OPT.vis)OPT.vis[k]=RANGE.vis[k];}
for(const k in RANGE.rng)if(UT[k])UT[k].rng=RANGE.rng[k].slice();
if(typeof OPT==='object')Object.assign(OPT.gl,RANGE.gl);
if(typeof CMB==='object')CMB.flashR=18;           // 총구 섬광은 더 멀리서 보인다
// 전술 AI의 거리(칸)도 같이 늘린다
if(typeof TAC==='object'){TAC.near=16;TAC.travel=14;TAC.leg=5;TAC.flankR=[5,8];}
if(typeof STAND==='object'){STAND.min=4;STAND.near=5;}
/* 시야 보정(층·언덕·밤·날씨)을 같은 비율로 */
{const _v=visRange;const VC=new Map();let vcT=-1;
 visRange=function(u){// 같은 4분의 1초·같은 칸이면 다시 계산하지 않는다(시야 거리가 늘어 seen()이 자주 부른다)
  const tq=Math.floor((G.time||0)*4);if(tq!==vcT||VC.g!==G){VC.clear();vcT=tq;VC.g=G;}
  const k=G._day?'d'+u.id:u.id,c=VC.get(k);   // 낮 시야(visDay: 조명탄 아래 판정)는 따로 기억if(c&&c.r===u.r&&c.c===u.c&&c.p===!!(u.path&&u.path.length)&&c.ver===G.ver)return c.v;
  const r=_v(u);const b=UT[u.type].vis;const v=r<=1?r:Math.max(1,b+(r-b)*RANGE.envK);VC.set(k,{r:u.r,c:u.c,p:!!(u.path&&u.path.length),ver:G.ver,v});return v;};}
/* 거리 자체에 따른 명중 감소 */
{const _h=hitP;hitP=function(a,d){const h=_h(a,d);const ta=UT[a.type];if(ta.ind||UT[d.type].fly||!h.p)return h;const D=RANGE.d50[a.type];if(!D)return h;
  const dd=udist(a,d);h.p*=1/(1+Math.pow(dd/D,2));return h;};}
/* 빗나간 연사도 고개를 숙이게 한다(보병 표적) */
{const _s=rtShoot;rtShoot=function(a,d){const r=_s(a,d);const ta=UT[a.type];
  if(G.units.includes(d)&&UT[d.type].cls==='inf'&&!ta.ind&&!ta.ex&&(ta.cls==='inf'||ta.cls==='veh')&&ta.atk&&ta.atk.inf>=4)d.supp=Math.min(3,Math.max(d.supp||0,RANGE.nearSup));
  return r;};}
