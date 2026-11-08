/* ===================== 전투기 폭격: 진입 → 투하 → 낙하 → 탄착 =====================
   예전에는 부른 뒤 2.6초에 한 번에 터졌다. 이제 실제 근접 항공 지원처럼 순서가 있다.
   1) 진입(1.6초): 우리 쪽 가장자리에서 비스듬히(±30도) 내려오며 들어온다. 무전 "전투기 진입".
   2) 투하: 목표 앞에서 폭탄을 놓는다. 이때 목표 근처 적 대공이 쏜다(격추되면 폭탄은 없다).
   3) 낙하(1.4초): 폭탄이 비행 방향으로 날아가며 떨어진다. 그동안 전투기는 급상승하며 선회해 빠진다.
   4) 탄착: 피해 규칙은 예전과 같다(한 칸, 건물 손상, 주변 제압).
   부른 뒤 탄착까지 3초. 연출(07x-strike)은 j.hx/j.hz(진입 방향)와 j.rel/j.imp(투하·탄착 시각)를 읽는다. */
const STRIKE={app:1.6,fall:1.4,ang:30};
jetRun=function(n,r,c){G.airq=G.airq||[];const t0=G.time||0;const x=c+.5,z=r+.5;
  const e=airEdge(n,x,z);let ux=x-e[0],uz=z-e[1];const d=Math.hypot(ux,uz);if(d<.5){ux=N/2-x;uz=N/2-z;}
  // 들어오는 각도를 조금 비틀어 매번 같은 직선이 되지 않게
  const a=Math.atan2(uz,ux)+(Math.random()*2-1)*STRIKE.ang*Math.PI/180;
  const j={kind:'jet',n,r,c,t:t0+STRIKE.app,rel:t0+STRIKE.app,imp:t0+STRIKE.app+STRIKE.fall,hx:Math.cos(a),hz:Math.sin(a),turn:Math.random()<.5?-1:1,id:UID++};
  G.airq.push(j);if(FXH.jet)FXH.jet(j);
  L(`${natName(n)} 전투기 진입, 탄착 ${Math.round(STRIKE.app+STRIKE.fall)}초 전`);
  // 우리 부대가 목표 바로 옆이면 근접 위험 경고
  if(G.units.some(u=>u.nat===n&&!UT[u.type].fly&&Math.hypot(u.x-x,u.z-z)<1.6))L(`${natName(n)} 근접 위험! 아군이 탄착 지점 가까이 있음`);
  return j;};
// 투하 순간: 대공이 먼저 쏘고, 살아남으면 폭탄이 떨어지기 시작한다
jetDrop=function(j){const {n,r,c}=j;
  for(const e of G.units){if(e.nat===n||(e.type!=='aa'&&e.type!=='zu'))continue;if(Math.hypot(e.x-(c+.5),e.z-(r+.5))>7)continue;if(e.supp>.5)continue;
    e.firedT=G.time;e.face=Math.atan2(r+.5-e.z,c+.5-e.x)*180/Math.PI;const p=e.type==='aa'?.3:.12;if(FXH.aaShot)FXH.aaShot(e,j);
    if(Math.random()<p){const a=Math.random()*6.283,d=1.5+Math.random()*2;const x=Math.min(N-.5,Math.max(.5,c+.5+Math.cos(a)*d)),z=Math.min(N-.5,Math.max(.5,r+.5+Math.sin(a)*d));
      L(`${natName(e.nat)} ${UT[e.type].n} 전투기 격추! 폭격 실패`);G.nats[e.nat].kills++;e.kills=(e.kills||0)+1;
      crashAt({x,z,t:G.time+1.6,big:1,nat:n,kind:'jet'});if(FXH.jetDown)FXH.jetDown(j,x,z);sfx('boom',1.2,x,z);bump();return;}}
  (G.bombs=G.bombs||[]).push({n,r,c,t:j.imp??G.time+STRIKE.fall,id:j.id});if(FXH.release)FXH.release(j);
  L(`${natName(n)} 폭탄 투하`);bump();};
// 탄착: 예전 jetDrop의 피해 규칙 그대로
function bombHit(b){const {r,c}=b;if(FXH.bomb)FXH.bomb(r,c,b);
  for(const [a,bb] of supArea(r,c,0)){const x=G.map[a][bb];const u=unitAt(a,bb);
    if(u){const cov=UT[u.type].fly?0:TT[x.t].cov*.5;const d=Math.max(1,Math.round(9*(1-cov)*(.85+Math.random()*.3)));u.supp=2;harm(u,d,null,{kind:'blast',x:bb+.5,z:a+.5,rad:.6});}
    if(x.t==='bldg'){damageBldg(a,bb,24);if(typeof ignite==='function')ignite(a,bb,.7);}}
  for(const u of G.units)if(!UT[u.type].fly&&Math.hypot(u.x-(c+.5),u.z-(r+.5))<1.8)u.supp=Math.max(u.supp||0,1.5);
  bump();}
{const _at=airTick;airTick=function(dt){_at.apply(this,arguments);if(!G||!G.bombs||!G.bombs.length)return;
  const keep=[];for(const b of G.bombs){if(b.t>G.time){keep.push(b);continue;}bombHit(b);}G.bombs=keep;};}
