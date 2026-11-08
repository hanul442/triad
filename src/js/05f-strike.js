/* ===================== 전투기 폭격: 진입 → 투하 → 낙하 → 탄착 =====================
   예전에는 부른 뒤 2.6초에 한 번에 터졌다. 이제 실제 근접 항공 지원처럼 순서가 있다.
   1) 진입(1.6초): 우리 쪽 가장자리에서 비스듬히(±30도) 내려오며 들어온다. 무전 "전투기 진입".
   2) 투하: 목표 앞에서 폭탄을 놓는다. 이때 목표 근처 적 대공이 쏜다(격추되면 폭탄은 없다).
   3) 낙하(1.4초): 폭탄이 비행 방향으로 날아가며 떨어진다. 그동안 전투기는 급상승하며 선회해 빠진다.
   4) 탄착: 폭탄 세 발이 비행 방향을 따라 0.18초 간격으로 터진다. 가운데 발은 예전 피해 규칙 그대로, 앞뒤 발은 약하다.
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
  // 폭탄 세 발을 줄지어 놓는다(스틱): 목표 앞·목표·목표 뒤로 0.18초 간격, 비행 방향을 따라 걸어가듯 터진다
  const imp=j.imp??G.time+STRIKE.fall,hx=j.hx??1,hz=j.hz??0;G.bombs=G.bombs||[];
  for(const k of [-1,0,1]){const x=c+.5+hx*STICK.gap*k,z=r+.5+hz*STICK.gap*k;const br=Math.floor(z),bc=Math.floor(x);
    if(k&&!inb(br,bc))continue;G.bombs.push({n,r:k?br:r,c:k?bc:c,x:k?x:c+.5,z:k?z:r+.5,t:imp+STICK.dt*k,id:j.id,main:!k});}
  if(FXH.release)FXH.release(j);
  L(`${natName(n)} 폭탄 투하`);bump();};
// 탄착. 가운데 폭탄은 예전 jetDrop의 피해 규칙 그대로(한 칸 9 피해, 건물 24, 불, 1.8칸 제압).
// 앞뒤 폭탄은 더 약하다(5 피해, 건물 10, 1.3칸 제압). 가운데 폭탄의 폭풍은 1.6칸 안 다른 건물의 창과 벽을 조금 부순다.
const STICK={gap:.85,dt:.18,side:{dmg:5,bldg:10,supp:1.3},wave:{rad:1.6,bldg:3}};
function bombHit(b){const {r,c}=b;const main=b.main!==false;if(FXH.bomb)FXH.bomb(r,c,b);const S=STICK.side;
  if(inb(r,c)){const x=G.map[r][c];const u=unitAt(r,c);
    if(u){const cov=UT[u.type].fly?0:TT[x.t].cov*.5;const d=Math.max(1,Math.round((main?9:S.dmg)*(1-cov)*(.85+Math.random()*.3)));u.supp=2;harm(u,d,null,{kind:'blast',x:c+.5,z:r+.5,rad:.6});}
    if(x.t==='bldg'){damageBldg(r,c,main?24:S.bldg);if(typeof ignite==='function')ignite(r,c,main?.7:.35);}}
  const cx=b.x??c+.5,cz=b.z??r+.5,sr=main?1.8:S.supp;
  for(const u of G.units)if(!UT[u.type].fly&&Math.hypot(u.x-cx,u.z-cz)<sr)u.supp=Math.max(u.supp||0,1.5);
  if(main){const W=STICK.wave,R=Math.ceil(W.rad);for(let a=r-R;a<=r+R;a++)for(let bb=c-R;bb<=c+R;bb++){if((a===r&&bb===c)||!inb(a,bb))continue;const x=G.map[a][bb];if(x.t!=='bldg')continue;
      const d=Math.hypot(a-r,bb-c);if(d<=W.rad)damageBldg(a,bb,Math.max(1,Math.round(W.bldg*(1.2-d/W.rad))));}}
  bump();}
{const _at=airTick;airTick=function(dt){_at.apply(this,arguments);if(!G||!G.bombs||!G.bombs.length)return;
  const keep=[];for(const b of G.bombs){if(b.t>G.time){keep.push(b);continue;}bombHit(b);}G.bombs=keep;};}
