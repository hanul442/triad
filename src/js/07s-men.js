/* ===================== 3D: 병사 한 명 한 명 그리기 =====================
   05f-men.js가 정한 병사 위치(u._men)를 그대로 따라 그린다. 자세: 서기 / 무릎쏴(쏘거나 재장전·엄호 중) / 엎드림(제압·옆 사람 피격).
   건물 안 계단을 오르내리는 중이면 07f-floors(v3InSoldier)의 계단 위치와 높이를 쓴다.
   분대가 쏠 때는 실제로 쏜 병사들에게서 예광탄이 하나씩 조금씩 엇갈려 나간다. */
function v3MenAnim(o,uu,dt,now,fa){const M=uu._men,S=o.userData.sold;const ox=o.position.x,oz=o.position.z;const k=1-Math.exp(-dt*10);const t=G.time||0;
  const moving=!!(uu.path&&uu.path.length);
  S.forEach((s,i)=>{const m=M[i];if(!m||!s.m.visible)return;let gx=m.x,gz=m.z,y=0;
    const ins=typeof v3InSoldier==='function'?v3InSoldier(uu,s,i,dt):null;
    if(ins){y=ins.y||0;if(ins.stair&&ins.x!=null){gx=ins.x;gz=ins.z;}}
    const pk=ins&&!ins.stair&&!moving&&typeof v3WinPeek==='function'?v3WinPeek(uu,m,t):null;if(pk){gx=pk.x;gz=pk.z;y+=pk.y;}   // 창가 병사: 쏠 때 창 밖으로 몸을 내민다
    const dx=gx-s.wx,dz=gz-s.wz,d=Math.hypot(dx,dz);
    if(d>.8){s.wx=gx;s.wz=gz;}else{s.wx+=dx*k;s.wz+=dz*k;}
    const v=ins&&ins.stair?d*k/dt:m.spd;s.spd+=(v-s.spd)*Math.min(1,dt*8);
    const fig=s.m;
    const prone=m.pr>0||(!moving&&uu.supp>0&&m.spd<.05);
    const kneel=!prone&&m.spd<.05&&(m.rl>0||t-m.ft<2.5||m.hold||uu.tgt!=null);
    const head=ins&&ins.stair&&s.spd>.05?Math.atan2(dz,dx):pk?pk.f:m.f;
    let cur=fig.rotation.y,want=-head,dd=want-cur;while(dd>Math.PI)dd-=2*Math.PI;while(dd<-Math.PI)dd+=2*Math.PI;fig.rotation.y=cur+dd*Math.min(1,dt*9);
    const tilt=prone?-1.42:0;fig.rotation.z+=(tilt-fig.rotation.z)*Math.min(1,dt*7);
    const sy=kneel?.72:1;fig.scale.y+=(sy-fig.scale.y)*Math.min(1,dt*7);
    if(pk){s.py=(s.py??y)+(y-(s.py??y))*k;y=s.py;}else s.py=y;   // 창턱으로 오르내림은 부드럽게
    fig.position.set(s.wx-ox,y+(prone?.012:0)-(typeof trenchAt==='function'&&trenchAt(s.wx,s.wz)?.9*MU:0),s.wz-oz);/* 참호 안 병사는 허리까지 잠긴다 */
    const gait=prone?.25:1,sw=Math.min(1,s.spd/.35)*Math.sin(now/(prone?160:70)+s.ph)*.7*gait;
    if(fig.userData.legL){fig.userData.legL.rotation.z=sw;fig.userData.legR.rotation.z=-sw;}});}
/* 분대 사격 연출: 쏜 병사마다 예광탄 하나씩 */
{const _f=v3FxFire;v3FxFire=function(a,r,c){const args=[...arguments];if(!a||!UT[a.type]||UT[a.type].cls!=='inf'||!a._sh||a._sh.length<2)return _f.apply(null,args);
  const sh=a._sh.slice(0,4);sh.forEach((i,k)=>{const go=()=>{if(!G||!V3.uo.has(a.id))return;const keep=a._sh;a._sh=[i];try{_f.apply(null,args);}finally{a._sh=keep;}};if(k===0)go();else setTimeout(go,k*55+Math.random()*60);});};}
