/* ===================== 칸 맞추기 (2026-11-09 점검) =====================
   부대의 칸(u.r,u.c)은 좌표(u.x,u.z)에서 나온다. 차량 움직임(05b2)의 몇몇 갈래와 배치 직후 자리 고치기가 좌표만 바꾸고 칸을 그대로 둬,
   AI 관전 판에서 드물게(작은 지도 3판에 1번쯤) 보급 트럭·장갑차가 옆 칸에 서 있는 것으로 셈해졌다(점령·시야·점유가 한 칸 어긋남).
   매 틱 끝에 어긋난 부대만 rtCell로 맞춘다(맞춘 칸으로 점령·건물 진입 같은 뒤처리도 함께). */
{const _t=rtTick;rtTick=function(dt){const r=_t.apply(this,arguments);if(!G||!G.units)return r;
  for(const u of G.units){if(u.x==null||u.z==null)continue;const rr=Math.min(N-1,Math.max(0,Math.floor(u.z))),cc=Math.min(N-1,Math.max(0,Math.floor(u.x)));if(rr!==u.r||cc!==u.c){try{rtCell(u);}catch(e){u.r=rr;u.c=cc;}if(u.r!==rr||u.c!==cc){u.r=rr;u.c=cc;}}}
  return r;};}
