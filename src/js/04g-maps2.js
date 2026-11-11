/* ===================== 지도 더 늘리기: 규칙 (03d-maps2) =====================
   - 성벽(높이 약 8m): 누구도 넘지 못한다. 성문(길)으로만 드나든다. 시야를 막고 붙어 서면 엄폐 55%.
   - 기름 탱크·냉각탑·굴뚝: 누구도 지나가지 못하고 높이만큼 시야를 막는다. 탱크 옆 엄폐 45%(맞으면 위험하지만 총알은 막는다).
   - 주기한 비행기: 보병은 날개 밑으로 지나가지만 차량은 막힌다. 엄폐는 얇다(20%).
   - 운하: 물 칸이라 보병도 차량도 다리로만 건넌다. 다리는 05o2-bridge 규칙대로 폭파·복구된다. */
Object.assign(COVK,{cwall:{n:'성벽',v:.55},otank:{n:'기름 탱크',v:.45},ctower:{n:'냉각탑',v:.6},stack:{n:'굴뚝',v:.35},plane:{n:'비행기',v:.2}});
Object.assign(PROP_LOS,{cwall:1,otank:1,ctower:1,stack:1});
Object.assign(NAV_RULE,{cwall:{inf:2,eng:2,veh:2,trk:2},otank:{inf:2,eng:2,veh:2,trk:2},ctower:{inf:2,eng:2,veh:2,trk:2},stack:{inf:2,eng:2,veh:2,trk:2},plane:{inf:0,eng:0,veh:2,trk:2}});
{const _no=navObstacles;navObstacles=function(){const O=_no();
  for(const p of G.props||[]){
    if(p.k==='cwall')O.push({k:'cwall',x:p.x,z:p.z,ry:p.ry,hl:p.len/2+.02,hw:.11});
    else if(p.k==='otank')O.push({k:'otank',x:p.x,z:p.z,ry:0,hl:.34,hw:.34});
    else if(p.k==='ctower')O.push({k:'ctower',x:p.x,z:p.z,ry:0,hl:.9,hw:.9});
    else if(p.k==='stack')O.push({k:'stack',x:p.x,z:p.z,ry:0,hl:.16,hw:.16});
    else if(p.k==='plane')O.push({k:'plane',x:p.x,z:p.z,ry:p.ry,hl:p.big?.6:.4,hw:p.big?.5:.3});}
  return O;};}
/* 운하 다리가 무너지면 그 칸은 운하 물(바다 높이로 그린다) */
if(typeof brFall==='function'){const _bf=brFall;brFall=function(r,c,n){const x=inb(r,c)?G.map[r][c]:null;const cn=!!(x&&x.cnl);_bf(r,c,n);if(cn&&G.map[r][c].t==='water'){G.map[r][c].sea=1;G.map[r][c].cnw=1;G.map[r][c].cnl=1;}};}
