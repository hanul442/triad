/* ===================== 알프스 산악: 병종·AI·헬기 =====================
   - 산악보병(alp)을 증원 메뉴 보병 칸에 넣고, 실제 부대 이름을 붙인다. 아직 없는 표 값은 소총분대 것을 빌린다(09e-fleet, 09f-alpine).
   - 알프스 지도에서 시작 부대: 소총분대 둘을 산악보병으로.
   - AI 구성(산악전 교리, FM 3-97.6·ATP 3-90.97): 경보병·산악보병 중심, 박격포(곡사는 능선 뒤 사각을 친다)와 저격·관측을 늘리고,
     길에 묶이는 전차·차륜 장갑차·자주포는 줄인다.
   - 헬기 착륙지: 비탈 12%(약 7°) 넘는 땅, 바위벽·너덜지대에는 내리지 않는다(헬기 착륙지 선정 기준).
   - 고정 로프(04g alpRopeTick)는 실시간 틱마다 돈다. */
FLEET_BASE.alp=['rifle'];
FLEET_REAL.alp=['산악보병 분대 (미 제10산악사단·한국군 산악여단)','산악소총 분대 (러시아 제34산악여단)'];
{const b=BRANCH.find(x=>x.k==='inf');if(b&&!b.ts.includes('alp'))b.ts.splice(b.ts.indexOf('rifle')+1,0,'alp');}
Object.assign(COOL,{alp:COOL.rifle});
if(typeof CAPW==='object')CAPW.alp=1;
const ALP_START=['alp','alp','rifle','mg','at','sniper','mortar','ifv'];
{const _ng=newGame;newGame=function(cfg){cfg=Object.assign({},cfg||{});
  if(!cfg.force&&!cfg.scn&&!cfg.camp&&(cfg.layout==='alpine'||cfg.layout==='rand')){if(cfg.seed==null)cfg.seed=Math.floor(Math.random()*1e9);
    const lay=cfg.layout==='rand'?pickLayout(cfg.seed):cfg.layout;if(lay==='alpine')cfg.force=ALP_START.slice();}
  return _ng(cfg);};}
/* AI 증원 가중치 */
const ALP_MIX={alp:.2,rifle:.5,mortar:1.5,sniper:1.4,tank:.35,ifv:.45,bmp:.5,hmv:.6,spg:.55,mlrs:.6,cev:.3};
{const _aw=aiArmsW;aiArmsW=function(n,E,cnt,total){const w=_aw(n,E,cnt,total);if(!alpOn())return w;
  for(const t in ALP_MIX)if(t!=='alp'&&w[t]!=null)w[t]*=ALP_MIX[t];
  const want=ALP_MIX.alp*unitCap(),lack=want-cnt('alp');w.alp=ALP_MIX.alp*(lack>0?1+lack*.9:.15)*(total<6?1.6:1);return w;};}
/* 헬기 착륙지 */
{const _hc=heliCanLand;heliCanLand=function(n,r,c){if(!_hc(n,r,c))return false;if(!alpOn())return true;const x=G.map[r][c];return !(x.cliff||x.scree||(x.sl||0)>.12);};}
/* 실시간 틱 */
{const _t=rtTick;rtTick=function(dt){_t(dt);if(!G||!G.units||G.over||!alpOn())return;try{alpRopeTick(dt);}catch(err){(G.errs=G.errs||[]).push(String(err&&err.stack||err));}};}
