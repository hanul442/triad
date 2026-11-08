/* ===================== MOTION 화면: 포탑 선회, 차체 출렁임, 헬기 기울기 =====================
   - 포탑(userData.tur)은 차체와 따로 u.tf 방향을 본다.
   - 차체는 가속하면 앞이 살짝 들리고, 서면 앞으로 숙인다.
   - 공격헬기는 앞으로 갈수록 기수를 숙이고, 옆으로 미끄러지거나 꺾을 때 옆으로 기운다. */
{const _a=v3AnimUnits;v3AnimUnits=function(dt,now){_a(dt,now);if(!(dt>0)||!V3.uo)return;const k=Math.min(1,dt*10);
  for(const o of V3.uo.values()){const u=o.userData.u,b=o.userData.body;if(!u||!b||o.userData.inf||o.userData.air)continue;
    const tur=b.userData&&b.userData.tur;
    if(tur&&u.tf!=null){let want=-(u.tf*Math.PI/180)-b.rotation.y;while(want>Math.PI)want-=2*Math.PI;while(want<-Math.PI)want+=2*Math.PI;
      let d=want-tur.rotation.y;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;tur.rotation.y+=d*k;}
    const p=Math.max(-.05,Math.min(.05,(u._acc||0)*.025));b.rotation.z+=(p-b.rotation.z)*Math.min(1,dt*4);}};}
{const _f=v3AirFrame;v3AirFrame=function(now,dt){_f(now,dt);if(!G||!V3.uo)return;
  for(const o of V3.uo.values()){const u=o.userData.u,b=o.userData.body;if(!u||!b||u.type!=='gunship'||!u.air||u.air.vx==null)continue;
    b.rotation.order='YZX';const sp=UT.gunship.mv*SPD_K,f=(u.hd||0)*Math.PI/180;
    const fwd=(u.air.vx*Math.cos(f)+u.air.vz*Math.sin(f))/sp,lat=(-u.air.vx*Math.sin(f)+u.air.vz*Math.cos(f))/sp;
    const ud=o.userData;ud.pz=(ud.pz??-.06)+((-.05-.2*Math.max(-.5,Math.min(1,fwd)))-(ud.pz??-.06))*Math.min(1,dt*3);
    ud.bx=(ud.bx??0)+((.3*Math.max(-1,Math.min(1,lat)))-(ud.bx??0))*Math.min(1,dt*3);
    b.rotation.z=ud.pz;b.rotation.x=ud.bx;}};}
