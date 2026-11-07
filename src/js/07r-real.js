/* ===================== REAL 연출: 연막탄·연막 수류탄·후폭풍 (규칙은 05j-real) ===================== */
FXH.vsmoke=function(u,ux,uz){if(!V3.on)return;const y=.15;for(let i=0;i<6;i++){const a=Math.atan2(uz,ux)+(i-2.5)*.35,d=.35+Math.random()*.3;
  const x=u.x+Math.cos(a)*d,z=u.z+Math.sin(a)*d;setTimeout(()=>{v3Burst(x,y+.2,z,.25,'#ffe0a0',0,.4);dsDust(x,z,.9,REAL.smkS*1000,6,'#d8d5cc',.05);},i*60);}};
FXH.ssmoke=function(u,x,z){if(!V3.on)return;setTimeout(()=>dsDust(x,z,.8,16000,7,'#d2cfc6',.02),600);};
FXH.backblast=function(a,d){if(!V3.on)return;const [ax,az]=posOf(a);const dx=ax-d.x,dz=az-d.z,L0=Math.hypot(dx,dz)||1;const y=typeof v3UnitY==='function'?v3UnitY(a):.3;
  dsDust(ax+dx/L0*.25,az+dz/L0*.25,.5,2500,6,'#8d8478',y);};
