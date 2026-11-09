/* ===================== 포탄: 박격포·자주포·포격 지원이 실제 궤적으로 날아간다 =====================
   쏘는 순간 피해가 나지 않는다. 포탄(G.shells)이 포물선을 그리며 날아가고, 떨어진 곳에서 터진다.
   조준은 흩어진다(거리에 비례). 가끔은 각을 잘못 잡아 크게 빗나가고, 날아가다 건물에 걸리면 그 벽·지붕에서 터진다.
   폭발은 반경 안 모두에게 피해를 준다. 건물 안에 있으면 거의 막아 주지만, 포탄이 바로 그 건물 그 층에 꽂히면 크게 다친다.
   높이 단위는 층(04b-sight와 같다). */
const SHELL_R=1.05;            // 폭발 반경(칸)
const SHELL_MIS=.1;            // 각도를 잘못 잡아 크게 빗나갈 확률
/* 조준점에서 흩어진 실제 탄착점 */
function shellAim(x0,z0,tx,tz,spread){const d=Math.hypot(tx-x0,tz-z0);let e=(spread??1)*(.1+d*.06);let mis=false;
  if(Math.random()<SHELL_MIS){e*=3.2;mis=true;}
  const a=Math.random()*6.283,rr=e*Math.sqrt(Math.random());
  // 크게 빗나갈 때는 주로 사거리 방향(짧거나 길게)으로
  if(mis){const k=(Math.random()<.5?-1:1)*(.6+Math.random()*.6)*e,dx=(tx-x0)/(d||1),dz=(tz-z0)/(d||1);return [tx+dx*k+(Math.random()-.5)*.4,tz+dz*k+(Math.random()-.5)*.4,true];}
  return [tx+Math.cos(a)*rr,tz+Math.sin(a)*rr,false];}
/* 포탄 하나를 띄운다. o: {x0,z0,h0,tx,tz,n,src,pw,spread,delay,T,ap,kind} */
let SHELL_ID=1;
function shellLaunch(o){G.shells=G.shells||[];const [x1,z1,mis]=shellAim(o.x0,o.z0,o.tx,o.tz,o.spread);
  const x1c=Math.min(N-.02,Math.max(.02,x1)),z1c=Math.min(N-.02,Math.max(.02,z1));const d=Math.hypot(x1c-o.x0,z1c-o.z0);
  const s={id:SHELL_ID++,x0:o.x0,z0:o.z0,h0:o.h0??.6,x1:x1c,z1:z1c,t0:(G.time||0)+(o.delay||0),T:o.T??(1.1+d*.16),ap:o.ap??(2.2+d*.55),
    n:o.n,src:o.src??null,type:o.type||'mortar',pw:o.pw??1,mis,k:0};
  G.shells.push(s);return s;}
/* 포탄 위치: k(0~1) */
function shellPos(s,k){return [s.x0+(s.x1-s.x0)*k,s.z0+(s.z1-s.z0)*k,s.h0*(1-k)+4*s.ap*k*(1-k)];}
/* 매 틱: 날아가는 포탄을 움직이고, 건물에 걸리거나 땅에 닿으면 터뜨린다 */
function shellTick(){if(!G.shells||!G.shells.length)return;const keep=[];
  for(const s of G.shells){const t=(G.time||0)-s.t0;if(t<0){keep.push(s);continue;}
    const k1=Math.min(1,t/s.T),k0=s.k;let hit=null;
    const [ax,az]=shellPos(s,k0),[bx,bz]=shellPos(s,k1);const steps=Math.max(1,Math.ceil(Math.hypot(bx-ax,bz-az)/.06));
    for(let i=1;i<=steps&&!hit;i++){const k=k0+(k1-k0)*i/steps;if(k<.08)continue;const [x,z,h]=shellPos(s,k);const r=Math.floor(z),c=Math.floor(x);if(!inb(r,c))continue;const X=G.map[r][c];
      if(X.t!=='bldg')continue;const bh=bldgH(X);if(h>bh)continue;const b=bldgBox(r,c);if(x<b[0]||x>b[1]||z<b[2]||z>b[3])continue;
      hit={x,z,h:Math.max(0,h),r,c};}
    s.k=k1;
    if(hit){shellBoom(s,hit.x,hit.z,hit.h,hit.r,hit.c);continue;}
    if(k1>=1){shellBoom(s,s.x1,s.z1,0,null,null);continue;}
    keep.push(s);}
  G.shells=keep;}
/* 폭발 피해를 준다(병사 단위 피해 모듈이 이 함수를 감쌀 수 있다) */
function blastHurt(u,dmg,by,o){if(!(dmg>0)||!G.units.includes(u))return;u.supp=Math.max(u.supp||0,1.6);
  if(by&&G.nats[by.nat])G.nats[by.nat].dmg=(G.nats[by.nat].dmg||0)+dmg;const kb=by&&G.units.includes(by)?by:null;
  if(typeof harm==='function'){harm(u,dmg,kb,o||{kind:'blast'});return;}   // 병사 단위 피해(05g-casualty)
  u.hp=Math.round((u.hp-dmg)*100)/100;if(u.hp<=0)kill(u,kb);}
/* 터짐: (x,z,h) 지점. 건물(r,c)에 꽂혔으면 r,c가 있다 */
function shellBoom(s,x,z,h,r,c){const by=s.src!=null?G.units.find(u=>u.id===s.src):null;const ta=UT[s.type]||UT.mortar;const base=DPS_K*(COOL[s.type]||4.6)*1.25*s.pw;
  if(r!=null){damageBldg(r,c,Math.max(1,Math.round((2+ta.ex*2)*s.pw*(.8+Math.random()*.4))));if(typeof ignite==='function')ignite(r,c,.18*s.pw);}
  const bf=r!=null?Math.floor(h):null;const SR=(typeof SHELL_RK==='object'&&SHELL_RK[s.type])||SHELL_R;   // 구경별 반경(05na-pen)
  for(const u of G.units.slice()){if(UT[u.type].fly)continue;const d=Math.hypot(u.x-x,u.z-z);if(d>SR*1.6)continue;
    const X=cell(u.r,u.c);const inB=X.t==='bldg'&&eye(u)<bldgH(X);let f=Math.max(0,1-d/SR);
    if(r!=null&&u.r===r&&u.c===c&&UT[u.type].cls==='inf'){const df=Math.abs(curFl(u)-bf);f=df<.6?1:df<1.6?.45:.12;}   // 꽂힌 건물: 그 층이 크게 다친다
    else if(inB)f*=.12;                                  // 다른 건물 안: 벽이 막아 준다
    else if(r!=null)f*=.6;
    if(r==null&&UT[u.type].cls==='inf'&&typeof trenchAt==='function'&&trenchAt(u.x,u.z))f*=d<.25?.8:.45;   // 참호: 바로 옆에 떨어지지 않으면 파편을 막는다                              // 벽·지붕에서 터진 파편이 길로 쏟아진다
    if(d>SR&&f<=0){u.supp=Math.max(u.supp||0,.8);continue;}
    const atk=ta.atk[UT[u.type].cls]||0;let dm=atk*base*f*(.8+Math.random()*.4);if(UT[u.type].armor&&typeof PEN_SH!=='object')dm*=.5;   // 장갑은 관통 판정(05na-pen)이 따진다
    dm=Math.round(dm*10)/10;
    if(dm>0&&UT[u.type].cls==='inf'&&typeof SHELL_PK==='object'){const fd=Math.max(.05,1-d/SR);blastHurt(u,Math.max(.1,dm),by,{kind:'blast',x,z,rad:SR,pk:Math.min(.97,(SHELL_PK[s.type]||.8)*Math.min(1.2,f/fd)*Math.min(1.3,s.pw)),sh:s.type});}   // 보병: 병사마다 거리로(05k blastMen, 05p 반경)
    else if(dm>0)blastHurt(u,dm,by,{kind:'blast',x,z,rad:SR*.6,sh:s.type});else u.supp=Math.max(u.supp||0,1);}
  if(typeof fortBlast==='function')fortBlast(x,z,r!=null?.5:.9,Math.round(14*s.pw));   // 바리케이드·참호도 부서진다(04d-fort)
  if(typeof FXH.boom==='function')FXH.boom(x,z,h,r!=null,s);
  bump();}
/* 곡사 화기의 한 발: 즉시 피해 대신 포탄을 띄운다 */
function shellShoot(a,d){a.shot=G.turn;a.firedT=G.time||0;a.face=Math.atan2(d.z-a.z,d.x-a.x)*180/Math.PI;
  const [ax,az]=posOf(a);const big=UT[a.type].cls==='veh';
  shellLaunch({x0:ax,z0:az,h0:eye(a),tx:d.x,tz:d.z,n:a.nat,src:a.id,type:a.type,pw:big?1.3:1,spread:big?1.15:1});
  a.lastShot={t:G.time||0,hits:0,k:1,tgt:d.id,shell:1};
  if(typeof FXH.launch==='function')FXH.launch(a);else FXH.fire(a,d.r,d.c,d,a.lastShot);return 0;}
{const _sh=rtShoot;rtShoot=function(a,d){if(UT[a.type].ind)return shellShoot(a,d);return _sh(a,d);};}
/* 포격 지원: 지도 밖 포대에서 포탄이 차례로 떨어진다 */
function shellBarrage(n,r,c,cnt,spread){const tx=c+.5,tz=r+.5;const fx=tx+(Math.random()<.5?-1:1)*N*.7,fz=tz-N*.6;
  for(let i=0;i<cnt;i++){const ox=(Math.random()-.5)*spread,oz=(Math.random()-.5)*spread;
    const s=shellLaunch({x0:fx,z0:fz,h0:8,tx:tx+ox,tz:tz+oz,n,src:null,type:'spg',pw:1.5,spread:.35,delay:.3+i*(.35+Math.random()*.3),T:2.2,ap:7});s.off=1;}}
