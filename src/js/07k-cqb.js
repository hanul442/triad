/* ===================== 3D: 건물 돌입 연출 (05k-cqb) =====================
   수류탄·폭약이 터지는 섬광과 연기, 소리. 폭약은 문틀이 날아가는 파편이 더 많다. */
FXH.cqb=function(a,P){if(typeof sfx==='function')sfx('boom',P.charge?.9:.55,P.x,P.z);if(!V3.on)return;
  const x=G.map[P.r]&&G.map[P.r][P.c];const y=.06+Math.min(P.fl,x?bldgH(x):0)*FLOOR_H+FLOOR_H*.35;
  v3Burst(P.x,y,P.z,P.charge?.55:.32,P.charge?'#ffb25a':'#fff1c4',P.charge?2:1,P.charge?1.2:.6);
  if(typeof dsSpray==='function')dsSpray(P.x,y,P.z,P.charge?30:10,P.charge?.55:.3);
  if(P.charge&&typeof dsDust==='function')dsDust(P.x,P.z,.6,3500,6);
  V3.shake=Math.max(V3.shake||0,P.charge?.06:.025);};
