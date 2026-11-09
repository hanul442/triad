/* ===================== 헬기 투입 =====================
   화력 지원의 하나: 보이는 빈 도로·광장·공원에 수송 헬기가 내려와 소총분대를 내려놓는다.
   부대는 헬기가 착지한 뒤(게임 시간 HELI_T초) 생긴다. 그동안은 G.pending에 예약으로만 있다. */
const HELI_T=5.5;
SUP.heli={n:'헬기 투입',cost:7,rad:0,desc:'보이는 빈 도로·광장·공원에 소총분대를 헬기로 내려놓음. 착지까지 몇 초 걸림'};
function heliCanLand(n,r,c){if(!inb(r,c))return false;const x=G.map[r][c];if(x.t!=='road'&&x.t!=='plaza'&&x.t!=='park')return false;
  if(G.units.some(u=>u.nat===n)&&G.units.filter(u=>u.nat===n).length>=unitCap())return false;
  if(G.units.some(u=>!UT[u.type].fly&&Math.floor(u.z)===r&&Math.floor(u.x)===c))return false;
  if((G.pending||[]).some(p=>p.r===r&&p.c===c))return false;
  // 내릴 자리가 비어 있어야 한다: 세워 둔 차·잔해 차·쓰레기통·가로등·울타리·방어물 위나 나무가 선 공원에는 내리지 않는다
  if(x.t==='park'&&!x.mead)return false;
  const cx=c+.5,cz=r+.5;if((G.covers||[]).some(o=>Math.hypot(o.x-cx,o.z-cz)<.4+(o.r||.1)))return false;
  if((G.props||[]).some(p=>(p.k==='lamp'||p.k==='light')&&Math.hypot(p.x-cx,p.z-cz)<.45))return false;
  if((G.forts||[]).some(f=>Math.hypot(f.x-cx,f.z-cz)<.55))return false;
  return true;}
function heliInsert(n,r,c){G.pending=G.pending||[];G.pending.push({t:(G.time||0)+HELI_T,n,type:'rifle',r,c});}
/* 매 틱: 때가 된 예약을 부대로 바꾼다 */
function heliTick(){if(!G.pending||!G.pending.length)return;const keep=[];
  for(const p of G.pending){if(p.t>G.time){keep.push(p);continue;}const u=mkUnit(p.n,p.type,p.r,p.c);u.face=Math.random()*360;L(`${natName(p.n)} ${UT[p.type].n} 헬기 투입`);if(typeof FXH.land==='function')FXH.land(u);}
  G.pending=keep;}
