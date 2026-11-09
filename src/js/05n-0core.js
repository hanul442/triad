/* ===================== URBAN CORE: 폭발 소식과 "누가 쐈나" =====================
   폭파(05n-demo)·지하(05n-under)가 같이 쓰는 작은 바탕.
   - UB.by: 지금 건물·사람을 다치게 하는 쪽 세력 번호(사격·포탄·폭탄 함수가 도는 동안만 정해진다).
     건물 피해(damageBldg)에는 쏜 쪽이 넘어오지 않아서, 감싼 함수들이 여기에 적어 둔다.
   - ubBlast(x,z,R,n): 폭발이 났다는 소식. 등록된 함수(onBlast)들이 받는다. G.ubHot에 최근 12초 폭발이 남는다. */
const UB={by:null,hooks:[]};
const onBlast=fn=>{UB.hooks.push(fn);};
function ubBlast(x,z,R,n){if(!G)return;const t=G.time||0;G.ubHot=(G.ubHot||[]).filter(b=>t-b.t<12);G.ubHot.push({x,z,R,n,t});
  for(const fn of UB.hooks)try{fn(x,z,R,n);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}}
/* 최근 폭발이 (x,z) 반경 r 안에 있었나 (초) */
const ubHotNear=(x,z,r,sec)=>(G.ubHot||[]).some(b=>(G.time||0)-b.t<sec&&Math.hypot(b.x-x,b.z-z)<=r+b.R);
/* fn을 세력 n이 한 일로 돌린다 */
function ubAs(n,fn){const p=UB.by;UB.by=n;try{return fn();}finally{UB.by=p;}}
{const _s=rtShoot;rtShoot=function(a,d){const ex=UT[a.type].ex;const r=ubAs(a.nat,()=>_s(a,d));if(ex&&r>0&&G.units)ubBlast(d.x,d.z,.35,a.nat);return r;};}
{const _s=rtShootBldg;rtShootBldg=function(a,r,c){ubAs(a.nat,()=>_s(a,r,c));ubBlast(c+.5,r+.5,.5,a.nat);};}
{const _s=shellBoom;shellBoom=function(s,x,z,h,r,c){const v=ubAs(s.n,()=>_s(s,x,z,h,r,c));ubBlast(x,z,SHELL_R,s.n);return v;};}
{const _s=support;support=function(n,kind,r,c){const ok=ubAs(n,()=>_s(n,kind,r,c));
  if(ok&&SUP[kind]&&!SUP[kind].fn&&kind!=='smoke'&&kind!=='heli'&&kind!=='arty')ubBlast(c+.5,r+.5,(SUP[kind].rad||1)+.5,n);return ok;};}
if(typeof jetDrop==='function'){const _s=jetDrop;jetDrop=function(j){const v=ubAs(j.n,()=>_s(j));ubBlast(j.c+.5,j.r+.5,1.3,j.n);return v;};}
if(typeof fpvBoom==='function'){const _s=fpvBoom;fpvBoom=function(u,e){const x=e.x,z=e.z,n=u.nat;const v=ubAs(n,()=>_s(u,e));ubBlast(x,z,.45,n);return v;};}
if(typeof msBlast==='function'){const _s=msBlast;msBlast=function(x,z,R,base,n,bc,br){const v=ubAs(n,()=>_s(x,z,R,base,n,bc,br));ubBlast(x,z,R,n);return v;};}
if(typeof msHit==='function'){const _s=msHit;msHit=function(m,e,r,c){const v=ubAs(m.n,()=>_s(m,e,r,c));ubBlast(m.x,m.z,.5,m.n);return v;};}
if(typeof breach==='function'){const _s=breach;breach=function(a,P){return ubAs(a.nat,()=>_s(a,P));};}
{const _s=attack;attack=function(a,d){return ubAs(a.nat,()=>_s(a,d));};}
{const _s=shootBldg;shootBldg=function(a,r,c){return ubAs(a.nat,()=>_s(a,r,c));};}
/* 건물 칸에 마지막으로 피해를 준 세력(불이 번져 무너져도 그 세력 몫) */
{const _d=damageBldg;damageBldg=function(r,c,amt){const x=G.map[r][c];if(x&&x.t==='bldg'&&amt>0&&UB.by!=null)x.lastBy=UB.by;return _d(r,c,amt);};}
