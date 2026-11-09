/* ===================== STANDOFF: 적 코앞까지 걸어 들어가지 않기 =====================
   AI 1000판·16판 측정에서 보병 사격의 70%가 2칸(약 24m) 안이었다. 대부분 움직이던 분대가 적 바로 앞까지 걸어가서 쏜 것.
   실제 보병은 적을 보면 그 자리에서 엄폐하고 사거리 끝에서 싸운다(접적 시 행동). 붙는 것은 제압한 뒤 돌격할 때와 건물 소탕뿐이다.
   - 목적지: 돌격이 아니면 아는 적에게서 STAND.min칸 안쪽으로 자리를 잡지 않는다. 더 가까우면 적 반대쪽으로 물려 엄폐를 고른다.
   - 접적 반응: 행군·번갈아 이동·지키기뿐 아니라 측면 이동·화력 기반 자리 잡기 중에도
     적을 직접 보고 그 적이 STAND.near칸 안이면 가까운 엄폐에 멈춰 쏜다(측면조는 멀리서 보이는 적에는 계속 간다).
   - 움직이며 쏘는 사격 군기(06c TAC_QUIET)는 그대로: 멈춘 쪽이 쏜다.
   돌격(assault)·건물 진입(u.cqb)·후퇴는 손대지 않는다. */
const STAND={min:2.8,near:3.2,in:1.6};
/* 아는 적 중 (x,z)에서 가장 가까운 것 */
function standFoe(n,x,z){const M=typeof memOf==='function'?memOf(n):{};const t=G.time||0;let best=null,bd=1e9;
  for(const id in M){const p=M[id];if(t-p.t>(TAC.memAge||20))continue;const e=G.units.find(o=>String(o.id)===id);if(!e||UT[e.type].fly||UT[e.type].ind)continue;
    const d=Math.hypot(p.x-x,p.z-z);if(d<bd){bd=d;best={x:p.x,z:p.z,d,e};}}
  return best;}
/* 목적지를 적에게서 떼어 놓기 */
{const _go=tacGo;tacGo=function(u,x,z,role){const r=role||(u.tk&&u.tk.role);
  if(r!=='assault'&&r!=='ret'&&!u.cqb&&u.tk){const inB=(tileAt(x,z)||{}).t==='bldg';const lim=inB?STAND.in:STAND.min;const f=standFoe(u.nat,x,z);
    if(f&&f.d<lim){const ux=(x-f.x)/(f.d||1),uz=(z-f.z)/(f.d||1);const ax=f.x+ux*(lim+.4),az=f.z+uz*(lim+.4);const objs=coverObjs(u);
      const s=tacSpot(u,ax,az,[0,.4,.8,1.2],(px,pz)=>{const d=Math.hypot(px-f.x,pz-f.z);if(d<lim)return -1e9;return tacCov(px,pz,f.x,f.z,objs)*4-Math.hypot(px-ax,pz-az)*.6-Math.hypot(px-u.x,pz-u.z)*.15;});
      if(!s){if(Math.hypot(u.x-f.x,u.z-f.z)>=lim){u.path=[];u.dest=null;u.tk.at=G.time||0;if(role)u.tk.role=role;tacN('standoff');return false;}}   // 물릴 자리가 없으면 지금 자리에서 멈춘다
      else{x=s[0];z=s[1];tacN('standoff');}}}
  return _go(u,x,z,role);};}
/* 접적 반응을 측면·화력 기반 이동에도 */
{const _r=tacReact;tacReact=function(u){if(!u.tk||tacIdle(u)||u.brk)return;const r=u.tk.role;
  if(r==='move'||r==='bound'||r==='hold')return _r(u);
  if(r!=='flank'&&r!=='bof'&&r!=='cap')return;const t=G.time||0;if((u._rcT||0)>t)return;u._rcT=t+.5;
  const R=Math.min(UT[u.type].rng[1]+.4,STAND.near);let foe=null;
  for(const e of G.units){if(e.nat===u.nat||UT[e.type].fly)continue;if(Math.hypot(e.x-u.x,e.z-u.z)>R)continue;if(G.fog&&!selfSees(u,e))continue;if(!canHit(u,e))continue;foe=e;break;}
  if(!foe)return;if(r==='cap'&&u.dest&&Math.hypot(u.dest[0]-u.x,u.dest[1]-u.z)<1)return;   // 거점 바로 앞이면 마저 들어간다
  const objs=coverObjs(u);const s=tacSpot(u,u.x,u.z,[0,.25,.5],(x,z)=>tacCov(x,z,foe.x,foe.z,objs)*4-Math.hypot(x-u.x,z-u.z)*1.5+Math.min(0,Math.hypot(x-foe.x,z-foe.z)-Math.hypot(u.x-foe.x,u.z-foe.z))*2);   // 적 쪽으로 다가가는 자리는 피한다
  u.path=s&&Math.hypot(s[0]-u.x,s[1]-u.z)>.08?pathPts(u,s[0],s[1]):[];u.dest=null;u.tk.role='react';u.tk.at=t;tacN('react');};}
/* 보병 시야·사거리: 거리 1칸 ≈ 12m. 맨눈 60m·소총 60m로는 도시 큰길에서도 늘 코앞 교전이 된다.
   트인 길·광장에서는 더 멀리서 보고 쏘게 한다(건물이 시야를 가리는 골목은 그대로 가깝다). 먼 거리 명중률은 05j-real의 거리 감쇠가 낮춘다. */
const STAND_R={vis:{rifle:7,mg:7,at:7,eng:5},rng:{rifle:6,mg:7,at:5}};
for(const k in STAND_R.vis)if(UT[k]){UT[k].vis=STAND_R.vis[k];if(typeof OPT==='object')OPT.vis[k]=STAND_R.vis[k];}
for(const k in STAND_R.rng)if(UT[k])UT[k].rng=[UT[k].rng[0],STAND_R.rng[k]];
