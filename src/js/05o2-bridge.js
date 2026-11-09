/* ===================== BRIDGE: 다리가 무너지고, 공병이 폭파하고 다시 놓는다 =====================
   다리 칸(x.br: 1·2 찻길 다리, 3 철교)은 한 칸이 한 경간(약 12 m)이다. 폭발 위력(05o wrkBlast의 kg)만큼 상하고,
   견딜 수 있는 양을 넘으면 그 경간이 강으로 떨어진다.
     콘크리트 찻길 다리 150 kg, 철교 120 kg, 공병이 놓은 임시 다리 60 kg (같은 칸 직격은 전부, 옆 칸은 거리만큼 덜).
     → 155mm 포탄(7 kg)으로는 거의 안 무너지고, 항공 폭탄(90 kg) 두 발이나 탄도미사일 한 발이면 끊긴다.
   - 무너지면 그 칸은 물이 되고(x.brX에 원래 다리를 기억), 위의 차량은 강에 빠져 잃고, 보병은 크게 다쳐 강가로 헤엄쳐 나온다.
     이동 격자가 바뀌고 그 다리로 가던 부대는 다른 다리로 돌아간다.
   - 폭파: 공병(12초)·소총분대(20초)가 다리 위에서 폭약을 설치한다(지휘 2, 05n-demo의 폭약 목록 G.demo에 br:1로 들어감).
     적 지상 부대가 그 다리(이어진 다리 칸) 폭약 1.5칸 안에 들어오고 우리 편이 그 적을 보고 있으면 1.2초 뒤 터진다. 직접 터뜨릴 수도 있다.
     AI는 적 차량이 다가오는 다리에 미리 폭약을 심는다.
   - 복구: 공병이 끊긴 경간 옆(강가나 남은 다리 위)에서 35초 동안 임시 다리를 놓는다(지휘 3). 쉬고 있는 공병은
     가까이(3칸) 끊긴 다리가 있고 둘레에 적이 안 보이면 알아서 복구한다(부대는 제 할 일을 스스로 한다). */
const BRG={hp:{1:150,2:150,3:120},rep:60,plant:12,plantR:20,cost:2,fixT:35,fixCost:3,trig:1.5,auto:3};
const brOn=x=>!!x&&!!x.br&&x.t!=='water';
const brHp=x=>x.brHp??(x.rep?BRG.rep:BRG.hp[x.br]||150);
/* 다리 칸 (r,c)에 피해 amt(kg) */
function brDmg(r,c,amt,n){const x=inb(r,c)?G.map[r][c]:null;if(!brOn(x)||!(amt>0))return false;x.brHp=Math.round((brHp(x)-amt)*10)/10;bump();
  if(x.brHp<=0){brFall(r,c,n);return true;}return false;}
/* 경간이 무너진다 */
function brFall(r,c,n){const x=G.map[r][c];if(!brOn(x))return;
  const brX={br:x.br,ro:x.ro,rw:x.rw,rail:x.rail?1:0,t:x.t,rep:x.rep?1:0};
  G.map[r][c]={t:'water',rv:1,owner:x.owner??null,obj:x.obj??null,smoke:0,dist:x.dist,el:x.el,brX};
  for(const u of G.units.slice()){if(UT[u.type].fly||Math.floor(u.z)!==r||Math.floor(u.x)!==c)continue;
    if(UT[u.type].cls!=='inf'){harm(u,u.hp+99,null,{kind:'crush'});if(G.units.includes(u))kill(u,null);continue;}
    harm(u,Math.max(1,u.hp*(.45+Math.random()*.35)),null,{kind:'crush'});if(!G.units.includes(u))continue;
    const s=brShore(r,c);if(s){u.x=s[1]+.5;u.z=s[0]+.5;if(typeof rtCell==='function')rtCell(u);else{u.r=s[0];u.c=s[1];}}u.path=[];u.dest=null;u.supp=3;}
  G.navV=(G.navV||0)+1;G.wrkV=(G.wrkV||0)+1;G.brV=(G.brV||0)+1;if(typeof wrkReroute==='function')wrkReroute(c+.5,r+.5,2);
  for(const d of G.demo||[])if(d.br&&d.r===r&&d.c===c)d.gone=1;
  if(FXH.brFall)FXH.brFall(r,c,brX);sfx('boom',1.4,c+.5,r+.5);L(`${brX.rep?'임시 ':''}${brX.rail?'철교':'다리'} 붕괴${n!=null?` (${natName(n)})`:''}`);bump();}
/* 가장 가까운 땅(강가) */
function brShore(r,c){let best=null,bd=1e9;for(let a=r-3;a<=r+3;a++)for(let b=c-3;b<=c+3;b++){if(!inb(a,b))continue;const y=G.map[a][b];if(y.t==='water'||y.t==='bldg')continue;const d=Math.hypot(a-r,b-c);if(d<bd){bd=d;best=[a,b];}}return best;}
/* 이어진 다리 칸 (한 다리) */
function brSpan(r,c){const out=[],seen=new Set([key(r,c)]),q=[[r,c]];while(q.length){const [a,b]=q.pop();out.push([a,b]);
  for(const [p,s] of [[-1,0],[1,0],[0,-1],[0,1]]){const k=key(a+p,b+s);if(seen.has(k)||!inb(a+p,b+s)||!brOn(G.map[a+p][b+s]))continue;seen.add(k);q.push([a+p,b+s]);}}return out;}
/* 폭발이 다리에 닿는다 */
if(typeof wrkBlast==='function'){const _b=wrkBlast;wrkBlast=function(x,z,kg,o){_b(x,z,kg,o);if(!G||!G.map||!(kg>=1))return;
  const R=.5+wrkR(kg,1.2);for(let a=Math.floor(z-R);a<=Math.floor(z+R);a++)for(let b=Math.floor(x-R);b<=Math.floor(x+R);b++){if(!inb(a,b)||!brOn(G.map[a][b]))continue;
    const on=a===Math.floor(z)&&b===Math.floor(x);const d=Math.max(0,Math.hypot(b+.5-x,a+.5-z)-.5);const k=on?1:Math.max(0,.35*(1-d/(R-.5+1e-6)));if(k>0)brDmg(a,b,kg*k,UB&&UB.by);}};}
/* ---------- 폭파 ---------- */
function brDemoOrder(u,r,c){if(u.type!=='eng'&&u.type!=='rifle')return '공병·소총분대만 폭약을 설치합니다';if(!inb(r,c)||!brOn(G.map[r][c]))return '다리를 고르세요';
  if((G.demo||[]).some(d=>!d.gone&&d.br&&d.r===r&&d.c===c))return '이미 폭약이 있습니다';if(G.nats[u.nat].cp<BRG.cost)return `지휘점수 ${BRG.cost}이 필요합니다`;
  if(u.brFix)u.brFix=null;u.demo={r,c,t:0,t0:G.time||0,br:1};u.tgt=null;u.tgtTile=null;
  if(!inTile(u,r,c)){u.path=pathPts(u,c+.5,r+.5);u.dest=[c+.5,r+.5];}else{u.path=[];u.dest=null;}bump();return null;}
{const _o=demoOrder;demoOrder=function(u,r,c){if(inb(r,c)&&brOn(G.map[r][c]))return brDemoOrder(u,r,c);return _o(u,r,c);};}
{const _p=demoPlantTick;demoPlantTick=function(u,dt){const D=u.demo;if(!D||!D.br)return _p(u,dt);const t=G.time||0;
  if(t-D.t0>90||!brOn(G.map[D.r][D.c])){u.demo=null;return;}
  if(u.dest&&Math.hypot(u.dest[0]-(D.c+.5),u.dest[1]-(D.r+.5))>.05&&!inTile(u,D.r,D.c)){u.demo=null;return;}
  if(!inTile(u,D.r,D.c)||(u.path&&u.path.length)||(u.supp||0)>=1.6)return;D.t+=dt;if(D.t<(u.type==='eng'?BRG.plant:BRG.plantR))return;
  const N2=G.nats[u.nat];u.demo=null;if(u.job==='ug')u.job=null;if(N2.cp<BRG.cost)return;N2.cp-=BRG.cost;
  (G.demo=G.demo||[]).push({id:UID++,nat:u.nat,r:D.r,c:D.c,t,fuse:null,df:{},br:1});L(`${natName(u.nat)} 다리에 폭약 설치`);bump();};}
{const _t=demoTick;demoTick=function(dt){const all=G.demo||[];const B=all.filter(d=>d.br);if(!B.length)return _t(dt);
  G.demo=all.filter(d=>!d.br);try{_t(dt);}finally{const rest=G.demo;G.demo=all.filter(d=>d.br||rest.includes(d));}
  const t=G.time||0;
  for(const d of B){if(d.gone)continue;if(!brOn(G.map[d.r][d.c])){d.gone=1;continue;}
    if(d.fuse!=null){if(t>=d.fuse)brBoom(d);continue;}
    if(!G.nats[d.nat].alive)continue;const span=brSpan(d.r,d.c);const S=new Set(span.map(([a,b])=>key(a,b)));
    if(G.units.some(u=>u.nat===d.nat&&!UT[u.type].fly&&inTile(u,d.r,d.c)))continue;
    const foe=G.units.find(e=>hostile(e.nat,d.nat)&&!UT[e.type].fly&&S.has(key(Math.floor(e.z),Math.floor(e.x)))&&Math.hypot(e.x-d.c-.5,e.z-d.r-.5)<=BRG.trig&&seen(e,d.nat));
    if(foe)d.fuse=t+.3;}};}   // 다리 폭약은 미리 연결해 둔 회로라 바로 터진다
function brBoom(d){d.gone=1;const cx=d.c+.5,cz=d.r+.5;if(FXH.demo)FXH.demo(cx,cz,1);
  ubAs(d.nat,()=>{for(const u of G.units.slice()){if(!G.units.includes(u)||UT[u.type].fly)continue;const dd=Math.hypot(u.x-cx,u.z-cz);if(dd>1)continue;if(inTile(u,d.r,d.c))continue;
      harm(u,Math.round(6*(1-dd)*10)/10+.5,null,{kind:'blast',x:cx,z:cz,rad:.6});if(G.units.includes(u))u.supp=Math.min(3,(u.supp||0)+2);}
    brFall(d.r,d.c,d.nat);});
  if(typeof ubBlast==='function')ubBlast(cx,cz,1,d.nat);L(`${natName(d.nat)} 다리 폭파`);bump();}
/* 강으로 나뉜 땅 덩어리 번호(다리·물 칸은 -1). 지도가 바뀔 때(G.navV)만 다시 센다 */
function brSides(){const v=G.navV||0;if(G._brs&&G._brs.v===v&&G._brs.N===N)return G._brs.id;const id=new Int32Array(N*N).fill(-1);let n=0;
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){if(id[r*N+c]>=0)continue;const x=G.map[r][c];if(x.t==='water'||x.br)continue;const q=[[r,c]];id[r*N+c]=n;
    while(q.length){const [a,b]=q.pop();for(const [p,s] of [[-1,0],[1,0],[0,-1],[0,1]]){const A=a+p,B=b+s;if(!inb(A,B)||id[A*N+B]>=0)continue;const y=G.map[A][B];if(y.t==='water'||y.br)continue;id[A*N+B]=n;q.push([A,B]);}}n++;}
  Object.defineProperty(G,'_brs',{value:{v,N,id},writable:true,configurable:true,enumerable:false});return id;}
/* AI: 강 건너편에 적 차량이 보이면(다리에서 10칸 안), 우리 쪽 8칸 안의 공병·소총분대가 그 다리에 폭약을 심는다.
   다리 건너편 7칸 안에 우리 지상 부대가 둘 넘게 있으면(그쪽에서 싸우는 중이면) 끊지 않는다 */
function brAI(n){if(G.nats[n].cp<BRG.cost+1)return;if((G.demo||[]).filter(d=>!d.gone&&d.br&&d.nat===n).length>=2)return;
  const S=brSides();const side=u=>S[Math.floor(u.z)*N+Math.floor(u.x)];
  const foesV=G.units.filter(e=>hostile(e.nat,n)&&UT[e.type].cls==='veh'&&!UT[e.type].fly&&seen(e,n));if(!foesV.length)return;
  for(const u of G.units){if(u.nat!==n||(u.type!=='eng'&&u.type!=='rifle')||u.job||u.demo||u.brFix||u.tunDig||u.mh||u.cqb)continue;const su=side(u);if(su<0)continue;
    for(let a=u.r-8;a<=u.r+8;a++)for(let b=u.c-8;b<=u.c+8;b++){if(!inb(a,b)||!brOn(G.map[a][b]))continue;
      const span=brSpan(a,b);if((G.demo||[]).some(d=>!d.gone&&d.br&&span.some(([p,q])=>p===d.r&&q===d.c)))continue;
      // 다리 양 끝 땅 덩어리
      const ends=new Set();for(const [p,q] of span)for(const [dp,dq] of [[-1,0],[1,0],[0,-1],[0,1]]){const A=p+dp,B=q+dq;if(inb(A,B)&&S[A*N+B]>=0)ends.add(S[A*N+B]);}
      if(!ends.has(su)||ends.size<2)continue;
      const far=[...ends].filter(k=>k!==su);
      if(!foesV.some(e=>far.includes(side(e))&&Math.hypot(e.x-b-.5,e.z-a-.5)<10))continue;
      if(G.units.filter(o=>o.nat===n&&!UT[o.type].fly&&far.includes(side(o))&&Math.hypot(o.x-b-.5,o.z-a-.5)<7).length>2)continue;
      // 다리 가운데 칸에 심는다
      const [mr,mc]=span.slice().sort((p,q)=>Math.hypot(p[0]-a,p[1]-b)-Math.hypot(q[0]-a,q[1]-b))[Math.floor(span.length/2)]||[a,b];
      if(!brDemoOrder(u,mr,mc)){u.job='ug';u._ugT=(G.time||0)+45;return;}}}}
/* ---------- 복구 ---------- */
const brBroken=x=>!!x&&x.t==='water'&&!!x.brX;
/* 놓을 수 있나: 옆 칸이 땅이나 남은 다리여야 한다(한쪽 끝부터 이어 놓는다) */
function brFixFrom(r,c){for(const [p,q] of [[-1,0],[1,0],[0,-1],[0,1]]){const a=r+p,b=c+q;if(!inb(a,b))continue;const y=G.map[a][b];if(y.t!=='water'&&y.t!=='bldg')return [a,b];}return null;}
function brFixOrder(u,r,c){if(u.type!=='eng')return '공병만 다리를 놓습니다';if(!inb(r,c)||!brBroken(G.map[r][c]))return '끊긴 다리를 고르세요';
  const f=brFixFrom(r,c);if(!f)return '강가나 남은 다리에 붙은 칸부터 놓을 수 있습니다';if(G.nats[u.nat].cp<BRG.fixCost)return `지휘점수 ${BRG.fixCost}이 필요합니다`;
  if(G.units.some(o=>o!==u&&o.brFix&&o.brFix.r===r&&o.brFix.c===c))return '이미 다른 공병이 놓고 있습니다';
  u.demo=null;u.brFix={r,c,t:0,t0:G.time||0,fr:f,paid:0};u.tgt=null;u.tgtTile=null;const x=f[1]+.5+(c-f[1])*.3,z=f[0]+.5+(r-f[0])*.3;u.path=pathPts(u,x,z);u.dest=[x,z];bump();return null;}
function brFixTick(u,dt){const F=u.brFix;const t=G.time||0;if(!brBroken(G.map[F.r][F.c])||t-F.t0>150){u.brFix=null;return;}
  if(!u.dest||Math.hypot(u.dest[0]-(F.fr[1]+.5+(F.c-F.fr[1])*.3),u.dest[1]-(F.fr[0]+.5+(F.r-F.fr[0])*.3))>.05){u.brFix=null;return;}   // 다른 명령
  if(u.path&&u.path.length)return;if(Math.hypot(u.x-(F.c+.5),u.z-(F.r+.5))>1.1)return;
  if(!F.paid){if(G.nats[u.nat].cp<BRG.fixCost){u.brFix=null;return;}G.nats[u.nat].cp-=BRG.fixCost;F.paid=1;L(`${natName(u.nat)} 공병 임시 다리 놓는 중`);}
  F.t+=dt*((u.supp||0)>=1?.4:1);u.face=Math.atan2(F.r+.5-u.z,F.c+.5-u.x)*180/Math.PI;if(F.t<BRG.fixT)return;
  const x=G.map[F.r][F.c],B=x.brX;const ro=B.ro||(Math.abs(F.r-F.fr[0])?'v':'h');
  G.map[F.r][F.c]={t:'road',ro,rw:1,br:2,rv:1,rep:1,brHp:BRG.rep,owner:x.owner??null,obj:x.obj??null,smoke:0,dist:x.dist,el:x.el};
  u.brFix=null;G.navV=(G.navV||0)+1;G.wrkV=(G.wrkV||0)+1;G.brV=(G.brV||0)+1;if(typeof wrkReroute==='function')wrkReroute(F.c+.5,F.r+.5,3);
  if(FXH.brFix)FXH.brFix(F.r,F.c);L(`${natName(u.nat)} 공병 임시 다리 완성`);try{sfx('build');}catch(e){}bump();}
/* 쉬는 공병은 가까운 끊긴 다리를 알아서 놓는다(둘레 3칸에 보이는 적이 없을 때) */
function brAuto(){for(const u of G.units){if(u.type!=='eng'||u.brFix||u.demo||u.job||u.tunDig||u.mh||u.cqb||(u.path&&u.path.length)||u.tgt!=null)continue;
  if(G.nats[u.nat].cp<BRG.fixCost)continue;if(G.units.some(e=>hostile(e.nat,u.nat)&&!UT[e.type].fly&&Math.hypot(e.x-u.x,e.z-u.z)<4&&seen(e,u.nat)))continue;
  let best=null,bd=BRG.auto+.01;for(let a=u.r-3;a<=u.r+3;a++)for(let b=u.c-3;b<=u.c+3;b++){if(!inb(a,b)||!brBroken(G.map[a][b])||!brFixFrom(a,b))continue;
    if(G.units.some(o=>o.brFix&&o.brFix.r===a&&o.brFix.c===b))continue;const d=Math.hypot(b+.5-u.x,a+.5-u.z);if(d<bd){bd=d;best=[a,b];}}
  if(best)brFixOrder(u,best[0],best[1]);}}
{const _t=rtTick;rtTick=function(dt){_t(dt);if(!G||!G.units||G.over)return;try{
  for(const u of G.units.slice())if(u.brFix)brFixTick(u,dt);
  const t=G.time||0;if(t>=(G._brT||0)){G._brT=t+2;brAuto();for(const n of G.order||[])if(G.nats[n].alive&&aiRun(n))brAI(n);}}
  catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}};}
/* 다른 명령을 받으면 복구를 그만둔다 */
{const _m=orderMoveTo;orderMoveTo=function(u){if(u&&u.brFix)u.brFix=null;return _m.apply(this,arguments);};}
