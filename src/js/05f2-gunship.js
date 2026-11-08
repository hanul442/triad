/* ===================== GUNSHIP: 공격헬기의 거리 유지와 사격 비행 =====================
   예전에는 목표 위 2.2칸 원을 돌며 기수를 순간적으로 표적에 돌렸다. 이제는 실제 공격헬기 운용처럼:
   - 진입(in): 지도 가장자리에서 들어와 목표에서 떨어진 대기 지점(3.6칸 ≈ 43m. 실제 수 km 대치를 지도 크기에 맞게 줄인 값)으로 간다.
   - 대기(hold): 대기 지점에서 제자리 비행하며 옆으로 천천히 미끄러지고, 기수를 표적 쪽으로 돌려 쏜다.
   - 사격 비행(run): 몇 초마다 목표를 비스듬히 스쳐 지나가는 직선으로 들어오며 쏜다(기총·로켓 사격 비행).
   - 이탈(brk): 목표를 지나면 옆으로 꺾어 빠져나가 다른 방향의 대기 지점으로 간다. 체력이 40% 아래면 사격 비행 없이 대기만.
   기수 방향(u.hd)은 초당 정해진 각도만 돈다. 기수에서 40° 안쪽 표적만 쏜다(rtFight 감쌈).
   속도는 가속도 한계 안에서만 바뀐다(A.vx, A.vz: 화면이 이것으로 기수 숙임·기울기를 그린다). */
const GS={rs:3.6,yaw:75,acc:1.3,fire:40,hold:[5,8],runOff:.7,runPast:1.6,brk:[.9,1.4]};
const gsRand=([a,b])=>a+Math.random()*(b-a);
const gsClamp=v=>Math.min(N-.3,Math.max(.3,v));
function gsSpot(A,ang){return [gsClamp(A.cx+Math.cos(ang)*GS.rs),gsClamp(A.cz+Math.sin(ang)*GS.rs)];}
/* 대기 방향: 지도 밖으로 나가는 방향이면 가장 가까운 지도 안 방향으로 돌린다(지도 가장자리 목표) */
function gsAng(A,ang){for(const o of [0,.4,-.4,.8,-.8,1.2,-1.2,1.6,-1.6,2.2,-2.2,3.1]){const a=ang+o,x=A.cx+Math.cos(a)*GS.rs,z=A.cz+Math.sin(a)*GS.rs;if(x>.3&&z>.3&&x<N-.3&&z<N-.3)return a;}return ang;}
/* 겨눌 곳: 쏘려고 고른 표적(잠깐 기억), 없으면 목표 지점 */
function gsFocus(u){const A=u.air;if(u._gt!=null&&(G.time||0)-(u._gtT||-99)<3){const e=G.units.find(z=>z.id===u._gt);if(e)return [e.x,e.z];}return [A.cx,A.cz];}
gunshipTick=function(u,dt){const A=u.air,now=G.time||0;
  if(u.hd==null)u.hd=u.face||0;if(A.vx==null){A.vx=0;A.vz=0;}if(!A.mode)A.mode='in';
  // 명령: 탭한 곳·공격 명령 표적이 새 목표 지점
  if(u.path&&u.path.length){const p=u.path[u.path.length-1];A.cx=p[0];A.cz=p[1];u.path=[];if(A.mode==='hold'){A.mode='in';A.sa=null;}}
  if(u.tgt!=null){const e=G.units.find(z=>z.id===u.tgt);if(e){A.cx=e.x;A.cz=e.z;}}
  if(!A.leave&&now>=A.until){A.leave=1;L(`${natName(u.nat)} 공격헬기 복귀`);}
  const sp=UT.gunship.mv*SPD_K;let tx,tz,full=0,yawTo=null;
  if(A.leave){const [ex,ez]=airEdge(u.nat,u.x,u.z);const ox=ex<1?-9:ex>N-1?9:0,oz=ez<1?-9:ez>N-1?9:0;tx=ex+ox;tz=ez+oz;full=1;}
  else{
    if(A.mode==='in'){if(A.sa==null)A.sa=gsAng(A,Math.atan2(u.z-A.cz,u.x-A.cx));[tx,tz]=gsSpot(A,A.sa);
      if(Math.hypot(tx-u.x,tz-u.z)<.5){A.mode='hold';A.mt=now+gsRand(GS.hold);}
      if(Math.hypot(A.cx-u.x,A.cz-u.z)<GS.rs+1.5)yawTo=gsFocus(u);}
    else if(A.mode==='hold'){const ang=A.sa+.16*Math.sin(now*.45+u.id);[tx,tz]=gsSpot(A,ang);yawTo=gsFocus(u);
      if(now>=A.mt&&u.hp>hpMax(u)*.4){// 사격 비행: 목표를 비스듬히 스쳐 지나가는 선
        const dx=A.cx-u.x,dz=A.cz-u.z,d=Math.hypot(dx,dz)||1,ux=dx/d,uz=dz/d;A.side=Math.random()<.5?-1:1;
        A.ex=gsClamp(A.cx+ux*GS.runPast-uz*GS.runOff*A.side);A.ez=gsClamp(A.cz+uz*GS.runPast+ux*GS.runOff*A.side);A.mode='run';A.rt=now;}
      else if(now>=A.mt)A.mt=now+gsRand(GS.hold);}
    else if(A.mode==='run'){tx=A.ex;tz=A.ez;full=1;const f=gsFocus(u);const vd=Math.atan2(A.vz,A.vx)*180/Math.PI,fd=Math.atan2(f[1]-u.z,f[0]-u.x)*180/Math.PI;
      if(Math.abs(vDiff(fd,vd))<70)yawTo=f;
      if(Math.hypot(tx-u.x,tz-u.z)<.5||now-A.rt>9){A.mode='brk';A.sa=gsAng(A,Math.atan2(u.z-A.cz,u.x-A.cx)+A.side*gsRand(GS.brk));}}
    else{[tx,tz]=gsSpot(A,A.sa);full=1;if(Math.hypot(tx-u.x,tz-u.z)<.6){A.mode='hold';A.mt=now+gsRand(GS.hold);}}}
  // 속도: 목표 쪽 원하는 속도로, 가속도 한계 안에서
  const dx=tx-u.x,dz=tz-u.z,d=Math.hypot(dx,dz);const vw=full?sp:Math.min(sp,Math.sqrt(2*GS.acc*d)*.9);
  const wx=d>.01?dx/d*vw:0,wz=d>.01?dz/d*vw:0;let ax=wx-A.vx,az=wz-A.vz;const am=Math.hypot(ax,az),lim=GS.acc*dt*(full?1.4:1);if(am>lim){ax*=lim/am;az*=lim/am;}
  A.vx+=ax;A.vz+=az;u.x+=A.vx*dt;u.z+=A.vz*dt;
  // 기수: 표적이 있으면 표적, 아니면 가는 방향(느리면 그대로)
  let want=u.hd;if(yawTo)want=Math.atan2(yawTo[1]-u.z,yawTo[0]-u.x)*180/Math.PI;else if(Math.hypot(A.vx,A.vz)>.25)want=Math.atan2(A.vz,A.vx)*180/Math.PI;
  u.hd=vTurn(u.hd,want,GS.yaw*dt);u.face=u.hd;
  if(A.leave&&(u.x<-.5||u.z<-.5||u.x>N+.5||u.z>N+.5)){airRemove(u);return;}
  u.x=Math.min(N-.01,Math.max(.01,u.x));u.z=Math.min(N-.01,Math.max(.01,u.z));
  if(A.leave&&(u.x<=.02||u.z<=.02||u.x>=N-.02||u.z>=N-.02)){airRemove(u);return;}
  rtCell(u);};
/* 사격: 기수 앞 40° 안의 표적만. 쏜 뒤에도 기수는 그대로(기수 회전은 gunshipTick이 한다) */
{const _f=rtFight;rtFight=function(u){if(u.type!=='gunship'||!u.air)return _f(u);if(u.hd==null)u.hd=u.face||0;
  if(u.cd<=0){const tg=rtPick(u);if(tg){u._gt=tg.id;u._gtT=G.time||0;const w=Math.atan2(tg.z-u.z,tg.x-u.x)*180/Math.PI;if(Math.abs(vDiff(w,u.hd))>GS.fire)return;}}
  _f(u);u.face=u.hd;};}
