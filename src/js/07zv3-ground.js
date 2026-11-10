/* ===================== 3D: 부대가 밟는 바닥 높이 =====================
   지형 높이(언덕)는 셰이더가 정점마다 올린다(07g). 여기서는 그 위에 따로 그린 바닥 위로 부대를 올린다.
   - 다리 상판·잔교·임시 다리 철판: 위에 선 차량과 병사가 상판 속에 묻히지 않게 상판 윗면에 세운다.
   - 길로 쏟아진 잔해 더미(G.debris)·무너진 건물 칸의 돌무더기: 차량은 그 위를 타고 넘는다(더미 속으로 파고들지 않게).
   그림만 바꾼다. 판정(시야·엄폐·이동)은 그대로. */
const GDK={br:.07,rail:.075,rep:.081,pier:.06,campBr:.045,campPier:.025,rub:.03};
/* 칸 (r,c)에 깔린 상판 윗면 높이(없으면 0) */
function gdDeck(r,c){if(!inb(r,c))return 0;const x=G.map[r][c];let h=0;
  if(x.br&&x.t!=='water')h=G.camp?GDK.campBr:x.br===3?GDK.rail:GDK.br;
  if(x.br&&x.rep&&x.t!=='water')h=Math.max(h,GDK.rep);
  if(x.pier&&!x.wall)h=Math.max(h,G.camp?GDK.campPier:GDK.pier);
  return h;}
/* (px,pz)에서 잔해 더미의 높이(07zw-wreck wrvPiles와 같은 모양) */
function gdDebH(px,pz){let h=0;for(const d of G.debris||[]){if(d.x==null)continue;const dx=px-d.x,dz=pz-d.z;
    const u=d.dr?dx:dz,v=d.dr?-dz*d.dr:-dx*d.dc,hw=d.d/2+1e-6;if(Math.abs(u)>d.hl||Math.abs(v)>hw)continue;
    const edge=1-Math.max(Math.abs(u)/d.hl,Math.abs(v)/hw*.8),toB=(v+d.d/2)/(d.d+1e-6);
    h=Math.max(h,Math.max(0,(edge*.5+toB*.5)*d.d*.22)*.8+(.03+d.d*.025)*.3);}
  return h;}
/* 차량 차체가 걸치는 바닥: 가운데와 앞뒤 끝 중 가장 높은 곳 (u.hd는 도 단위, 05b2) */
function gdVehLift(u){const a=(u.hd??u.face??0)*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a);let h=0;
  for(const s of [0,-.16,.16]){const x=u.x+ca*s,z=u.z+sa*s;const r=Math.floor(z),c=Math.floor(x);if(!inb(r,c))continue;
    const t=G.map[r][c];h=Math.max(h,gdDeck(r,c),t.t==='rubble'?GDK.rub:0,gdDebH(x,z));}
  return h;}
{const _uy=v3UnitY;v3UnitY=function(u){const y=_uy(u);const t=UT[u.type];if(!G||!t||t.fly)return y;
  try{if(t.cls==='inf'){if(G.map[u.r]&&G.map[u.r][u.c]&&G.map[u.r][u.c].t==='bldg')return y;return y+gdDeck(u.r,u.c);}
    return y+gdVehLift(u);}catch(e){return y;}};}
