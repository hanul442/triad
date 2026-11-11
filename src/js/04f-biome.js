/* ===================== 지도 다양화: 규칙 =====================
   03c-biome이 놓은 소품과 기후가 싸움에 주는 영향.
   - 생울타리(보카주): 보병은 헤치고 지나가지만 느리다. 바퀴 차량은 막히고 궤도 차량(전차·자주포)은 뚫고 지나간다. 땅에 선 눈높이를 가리고 엄폐 30%.
   - 컨테이너: 누구도 못 지나간다. 쌓인 높이만큼 시야를 막고 엄폐 40%. 선체(정박한 배)는 부두 위 시야를 크게 막는다.
   - 통나무 더미: 차량은 막히고 엄폐 35%. 건초더미: 엄폐 25%.
   - 겨울: 눈 덮인 길 밖에서는 보병 10%, 차량 18% 느리다. */
Object.assign(COVK,{bocage:{n:'생울타리',v:.3},bale:{n:'건초더미',v:.25},cont:{n:'컨테이너',v:.4},hull:{n:'선체',v:.4},logs:{n:'통나무 더미',v:.35}});
Object.assign(PROP_LOS,{bocage:1,cont:1,hull:1});
Object.assign(NAV_RULE,{bocage:{inf:2,eng:2,veh:2,trk:1},bocgap:{inf:0,eng:0,veh:2,trk:1},cont:{inf:2,eng:2,veh:2,trk:2},logs:{inf:0,eng:0,veh:2,trk:2}});
{const _no=navObstacles;navObstacles=function(){const O=_no();
  for(const p of G.props||[]){
    if(p.k==='bocage')hedgeObs(O,p,'bocage','bocgap',.085);   // 보병은 틈으로만(04d hedgeGap)
    else if(p.k==='cont')O.push({k:'cont',x:p.x,z:p.z,ry:p.ry,hl:.47,hw:.1});
    else if(p.k==='logs')O.push({k:'logs',x:p.x,z:p.z,ry:p.ry,hl:.2,hw:.09});}
  return O;};}
const climeOf=()=>G&&G.feat&&G.feat.clime||'temp';
{const _sk=slopeK;slopeK=function(u,dx,dz){const k=_sk(u,dx,dz);if(climeOf()!=='winter'||UT[u.type].fly)return k;const t=tileAt(u.x,u.z);
  return t&&t.t!=='road'?k*(UT[u.type].cls==='veh'?.82:.9):k;};}
