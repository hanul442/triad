/* ===================== 알프스 산악: 표 채우기·구름·이름 =====================
   1) 산악보병(alp)이 아직 없는 표(탄약·사거리·소리·총구·무전 호출부호…)는 소총분대 값을 빌린다(모든 표가 만들어진 뒤라 09번대).
   2) 산 위 구름: 안개·비·폭우 날씨에는 구름이 봉우리를 덮는다. 구름 밑동(feat.alp.cloud, 숲 한계선 근처)보다 높은 곳에 있으면
      맨눈 시정이 3칸(약 36m)으로 줄고, 구름 속 부대는 밖에서 3칸 넘게 떨어지면 보이지 않는다. 열상 장비도 구름은 잘 못 뚫는다.
   3) 눈밭의 산악보병은 흰 위장복이라 멈춰 있으면 더 가까이 와야 보인다. */
{const fill=tb=>{if(tb&&typeof tb==='object'&&('rifle' in tb)&&!('alp' in tb)){const v=tb.rifle;tb.alp=Array.isArray(v)?v.slice():v&&typeof v==='object'?JSON.parse(JSON.stringify(v)):v;}};
  const L=[typeof VOLLEY==='object'&&VOLLEY,typeof COOL==='object'&&COOL,typeof AIR_ACC==='object'&&AIR_ACC,typeof MEN_N==='object'&&MEN_N,typeof AMMO==='object'&&AMMO,typeof LOAD==='object'&&LOAD,
    typeof SUPF==='object'&&SUPF,typeof CAPW==='object'&&CAPW,typeof ESC_PREF==='object'&&ESC_PREF,typeof SQUAD==='object'&&SQUAD,typeof WPN==='object'&&WPN,typeof GFXW==='object'&&GFXW,
    typeof PEN==='object'&&PEN,typeof KIT==='object'&&KIT,typeof READ==='object'&&READ.ty,typeof VOX_CS==='object'&&VOX_CS,typeof VOX_CS_EN==='object'&&VOX_CS_EN,typeof VOX_TN_EN==='object'&&VOX_TN_EN];
  if(typeof MEN==='object')L.push(MEN.mag,MEN.rl);if(typeof REAL==='object')L.push(...Object.values(REAL).filter(v=>v&&typeof v==='object'&&!Array.isArray(v)));
  if(typeof OPT==='object')L.push(...Object.values(OPT).filter(v=>v&&typeof v==='object'&&!Array.isArray(v)));
  if(typeof RANGE==='object')L.push(...Object.values(RANGE).filter(v=>v&&typeof v==='object'&&!Array.isArray(v)));
  if(typeof FF==='object')L.push(...Object.values(FF).filter(v=>v&&typeof v==='object'&&!Array.isArray(v)));
  if(typeof SEE==='object')L.push(SEE.hear);if(typeof TAC==='object')L.push(TAC.types);if(typeof AA==='object')L.push(...Object.values(AA).filter(v=>v&&typeof v==='object'&&!Array.isArray(v)));
  if(typeof UG==='object')L.push(UG.mhT);
  L.forEach(fill);
  if(typeof READ==='object'&&READ.ty)READ.ty.alp='산악';
  if(typeof VOX_CS==='object')VOX_CS.alp='산악 #분대';if(typeof VOX_CS_EN==='object')VOX_CS_EN.alp='Alpine #';if(typeof VOX_TN_EN==='object')VOX_TN_EN.alp='mountain infantry';
  if(typeof VOX_OBJ_EN==='object')Object.assign(VOX_OBJ_EN,ALP_OBJ_EN);
  UT.alp.desc=`[${FLEET_REAL.alp.join(' / ')}] `+UT.alp.desc.replace(/^\[[^\]]*\] /,'');}
/* ---------- 산 위 구름 ---------- */
const ALP_CLOUD={wx:{fog:1,rain:1,storm:1,snow:1,blizzard:1},see:3};
function alpCloud(){if(!alpOn()||!G.feat.alp)return null;const k=typeof wxKind==='function'?wxKind():G.wx;if(!ALP_CLOUD.wx[k]&&!ALP_CLOUD.wx[G.wx])return null;
  const A=G.feat.alp;return A.tl-(k==='fog'||k==='blizzard'?3:1);}   // 구름 밑동(층). 짙은 안개·눈보라는 더 낮게 깔린다
const alpInCloud=(u,cb)=>{if(cb==null||UT[u.type].fly)return false;const x=cell(u.r,u.c);return !!x&&(x.el||0)>=cb;};
{const _sc=seeCap;seeCap=function(u){const c=_sc(u);const cb=alpCloud();return alpInCloud(u,cb)?Math.min(c,ALP_CLOUD.see):c;};}
{const _sp=spots;spots=function(u,e){const r=_sp(u,e);if(!r||!alpOn())return r;const cb=alpCloud();
  if(cb!=null&&alpInCloud(e,cb)&&udist(u,e)>ALP_CLOUD.see)return false;
  // 흰 위장복: 눈밭에 멈춰 있는 산악보병
  if(UT[e.type].mtn&&cell(e.r,e.c).snow&&typeof seeStill==='function'&&seeStill(e)&&udist(u,e)>visRange(u)*.6)return false;
  return r;};}
