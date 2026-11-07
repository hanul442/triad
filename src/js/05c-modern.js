/* ===================== 현대 장비 =====================
   기존 병종 표에 현대 시가전 차량 두 종을 더한다.
   험비: 지붕 기관총을 단 경량 전술차. 자주포: 곡사 장거리 포격 차량. */
Object.assign(UT,{
  hmv:{n:'험비',cls:'veh',mv:7,vis:6,rng:[1,5],atk:{inf:4,veh:1,air:3},sup:1,cost:4,hpMax:8,desc:'지붕 기관총을 단 경량 전술차. 빠른 정찰과 제압, 장갑은 얇음'},
  spg:{n:'자주포',cls:'veh',mv:4,vis:4,rng:[3,10],ind:1,atk:{inf:6,veh:4,air:0},ex:2,sup:1,cost:8,desc:'곡사 장거리 포격. 아군이 보는 곳을 쏘고, 이동 직후엔 쏘지 못함. 가까이 붙은 적에 약함'},
});
for(const t of ['hmv','spg'])if(!TYPES.includes(t))TYPES.splice(TYPES.indexOf('tank')+(t==='spg'?1:0),0,t);
Object.assign(COOL,{hmv:1.2,spg:6}); // 다시 쏘기까지 걸리는 초
