/* ===================== DOCTRINE: 교범에 나오는 전투 습관 =====================
   공개 교범에서 가져온 규칙들이다. 모든 부대가 명령 없이 알아서 한다(사람이 직접 찍은 명령·고수는 존중).
   근거: FM 3-21.8(보병 소총 소대·분대: 사격 통제·화력 분배, 매복 대응 전투 훈련, 강화·재편성, 지휘 승계,
   개인 이동 기술 3~5초 약진), FM 3-22.68(기관총: 사격 속도, 총열 교체, 탄착 지역), FM 3-21.75(개인 전투 기술),
   ATP 3-21.8(방어: 사거리 카드·준비된 사격 진지).

   1) 기관총 사격 속도: 접적 처음 25초, 적이 6칸(약 70m) 안, 아군이 돌격 중일 때는 '급속 사격', 그 밖에는
      '지속 사격'(사격 간격 1.7배). 쏠수록 총열이 달궈지고, 한계에 이르면 6초 동안 총열을 갈아 끼운다(쏘지 못함).
      움직인 기관총은 거치(양각대·삼각대)하는 1.5초 뒤에야 쏜다.
   2) 탄착 지역: 기관총 연사는 길쭉한 띠로 떨어진다. 겨눈 분대 둘레(사선 방향으로 1.6칸, 옆으로 .6칸)의
      다른 적 보병도 고개를 숙인다(피해는 없음, 제압만).
   3) 화력 분배: 나를 쏘는 적에게 먼저 응사한다(그 적이 하찮은 표적이 아니면). 이미 아군 둘 이상이 쏘고 있는
      거의 끝난 보병 표적은 놔두고 다른 표적을 고른다(헛방 줄이기). 차량은 모두가 계속 친다.
   4) 매복 대응: 조용히 움직이던 보병이 갑자기 총격을 받으면(8초 넘게 교전 없음)
      - 가까운 매복(3칸, 약 36m: 수류탄 거리 안): 그 자리에 엎드리면 몰살이니 수류탄을 던지고 쏜 적에게 곧장 돌격한다.
      - 먼 매복: 멈추고 엄폐로 붙어 응사한다(05zc 엄폐 찾기가 이어받는다).
      매복의 첫 사격은 적이 서서 걷고 있어 더 잘 맞는다(×1.2).
   5) 지휘 승계: 분대를 이끌던 사람이 쓰러지면 다음 사람이 지휘를 넘겨받는 몇 초 동안(신병 4초, 계급마다 짧아짐)
      분대가 머뭇거린다(느리게 움직이고 사격이 늦음). 저격수는 지금 지휘하는 사람을 노린다.
   6) 주요 화기 다시 잡기: 분대 기관총 사수·대전차 사수가 쓰러지면 8초 뒤 남은 소총수가 그 화기를 넘겨받는다.
   7) 강화·재편성: 거점을 차지하면 둘레 3칸 아군이 탄약을 나눠 맞추고(분대끼리 평균), 사기가 오르고,
      AI 보병은 15초 동안 거점 둘레에서 경계하며 역습에 대비한다(멀리 가는 이동은 미룸).
   8) 사거리 카드: 20초 넘게 한자리에서 지킨 부대는 둘레 거리를 재 두어 더 잘 맞힌다(×1.12).
   9) 약진과 숨: 위협 속에 트인 땅(길·광장·공터)을 건너는 보병은 뛰어서 건넌다(×1.3). 뛰면 숨이 차고,
      숨이 많이 차면 더 뛰지 못하고 조준이 흔들린다(최대 −20%). 멈추면 숨을 고른다. */
const DOC={
  mg:{rapidT:25,closeR:6,susK:1.7,heatR:1,heatS:.4,cool:.25,max:30,swap:6,setup:1.5,quiet:15},
  bz:{len:1.6,wid:.6,supp:.35},
  dist:{ret:3,over:2,low:2},
  amb:{quiet:8,near:3,gren:3,grenN:2,grenAmt:.6,grenR:.45,grenPk:.5,first:1.2,hold:8},
  lead:{lapse:4,perRank:.8,min:1.5,slow:.5,cdK:1.3,mor:6},
  reman:8,
  cons:{r:3,t:15,mor:8},
  rc:{t:20,k:1.12},
  rush:{k:1.3,gain:.08,walk:.02,rest:.05,stop:.5,aim:.2}};
const docNow=()=>G.time||0;
const docInf=u=>UT[u.type]&&UT[u.type].cls==='inf'&&!UT[u.type].fly;
const docManual=u=>u.man!=null&&typeof autoManual==='function'&&autoManual(u);
function docN(k){if(typeof tacN==='function')tacN('doc_'+k);}
/* ---------- 1) 기관총 사격 속도·총열 ---------- */
function mgRapid(u,t){const e=u.lastShot?G.units.find(z=>z.id===u.lastShot.tgt):null;
  if(t-(u._ctS??-99)<DOC.mg.rapidT)return true;
  if(e&&Math.hypot(e.x-u.x,e.z-u.z)<=DOC.mg.closeR)return true;
  // 아군이 표적 쪽으로 돌격 중이면 엄호 사격을 끊지 않는다
  if(e)for(const o of G.units)if(o.nat===u.nat&&o!==u&&o.path&&o.path.length&&o.tk&&o.tk.role==='assault'&&Math.hypot(o.x-e.x,o.z-e.z)<4)return true;
  return false;}
{const _f=rtFight;rtFight=function(u){if(u.type!=='mg')return _f(u);const t=docNow();
  if((u._swap||0)>t)return;   // 총열 교체 중
  const moving=!!(u.path&&u.path.length);if(moving)u._mvT=t;
  if(!moving&&t-(u._mvT??-99)<DOC.mg.setup)return;   // 거치 중
  const cd0=u.cd,f0=u.firedT;_f(u);if(!(u.cd>cd0+.01))return;
  if(t-(f0??-99)>DOC.mg.quiet)u._ctS=t;   // 새 교전 시작
  const rap=mgRapid(u,t);u._rof=rap?'rapid':'sus';if(!rap)u.cd*=DOC.mg.susK;
  u._heat=(u._heat||0)+(rap?DOC.mg.heatR:DOC.mg.heatS);
  if(u._heat>=DOC.mg.max){u._heat=0;u._swap=t+DOC.mg.swap;u.cd=Math.max(u.cd,DOC.mg.swap);u._swapN=(u._swapN||0)+1;docN('swap');
    const M=u._men;if(M){let k=0;for(const m of M)if(menAct(m)&&k<2){m.rl=Math.max(m.rl||0,DOC.mg.swap);k++;}}}};}
/* ---------- 2) 탄착 지역 + 4) 매복 + 응사 기록 ---------- */
function docQuiet(d,t){const last=Math.max(d._hitT??-99,d._thr?d._thr[2]:-99,d.firedT??-99);return t-last>DOC.amb.quiet;}
// 사람이 직접 지휘하는 세력(부관 끔)의 이동 명령은 지휘관 몫이라 건드리지 않는다
function ambOk(d){return docInf(d)&&aiRun(d.nat)&&d.path&&d.path.length&&!d.hold&&!d.cqb&&!d.brk&&!d.job&&!d.esc&&!d.rearm&&!d.climb&&!d.lj&&!d.post&&d.towBy==null
  &&cell(d.r,d.c).t!=='bldg'&&!docManual(d);}
function docBeaten(a,d){const B=DOC.bz;const dx=d.x-a.x,dz=d.z-a.z,L=Math.hypot(dx,dz);if(L<.5)return 0;const ux=dx/L,uz=dz/L;let n=0;const t=docNow();
  for(const e of G.units){if(e===d||e.nat===a.nat||!docInf(e)||!hostile(a.nat,e.nat))continue;const ex=e.x-d.x,ez=e.z-d.z;
    const al=ex*ux+ez*uz,lat=Math.abs(-ex*uz+ez*ux);if(Math.abs(al)>B.len||lat>B.wid)continue;
    if(typeof cell==='function'&&cell(e.r,e.c).t==='bldg')continue;   // 건물 안은 벽이 막는다
    e.supp=Math.min(3,(e.supp||0)+B.supp);e._thr=[a.x,a.z,t];n++;}
  if(n)docN('beaten');return n;}
function docAmbush(a,d){const t=docNow();const dd=Math.hypot(a.x-d.x,a.z-d.z);d._ambT=t;docN('ambush');
  if(dd<=DOC.amb.near){
    // 가까운 매복: 수류탄을 던지고 곧장 돌격해 빠져나간다
    if(dd<=DOC.amb.gren&&docInf(a)&&!a.nocas){a.supp=Math.min(3,(a.supp||0)+1);a._thr=[d.x,d.z,t];a._hitT=t;
      for(let i=0;i<DOC.amb.grenN&&G.units.includes(a);i++){const ang=Math.random()*6.283,rr=Math.random()*.35,x=a.x+Math.cos(ang)*rr,z=a.z+Math.sin(ang)*rr;
        if(typeof FXH==='object'&&typeof FXH.boom==='function')try{FXH.boom(x,z,0,false,{pw:.4,gl:1});}catch(e){}
        harm(a,DOC.amb.grenAmt,d,{kind:'frag',x,z,rad:DOC.amb.grenR,pk:DOC.amb.grenPk});if(a.hp<=0&&G.units.includes(a))kill(a,d);}}
    if(!G.units.includes(a))return 'gren';
    const P=pathPts(d,a.x,a.z);if(P.length){d.path=P;d.dest=null;d.tgt=null;d.tgtTile=null;d.supp=Math.min(d.supp||0,1);d._amb={id:a.id,t:t+DOC.amb.hold};
      if(d.tk){d.tk.role='assault';d.tk.at=t;}docN('ambNear');return 'assault';}
    return 'stay';}
  // 먼 매복: 멈춰 엄폐하고 응사(소대 전술 부대는 06c tacReact가 맡음)
  if(!d.tk){d.path=[];d.dest=null;}docN('ambFar');return 'halt';}
{const _s=rtShoot;rtShoot=function(a,d){const t=docNow();let amb=false;
  try{amb=docInf(d)&&!UT[a.type].ind&&!UT[a.type].fly&&docQuiet(d,t)&&ambOk(d);}catch(e){}
  if(amb)d._ambNow=1;let r;try{r=_s(a,d);}finally{if(d)d._ambNow=0;}
  try{if(G.units.includes(d)){d._shBy={id:a.id,t};
      if(a.type==='mg'&&docInf(d))docBeaten(a,d);
      if(amb&&G.units.includes(a))d._ambR=docAmbush(a,d);}}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}
  return r;};}
/* ---------- 3) 화력 분배 ---------- */
function docPickOnly(_p,u,keep){const all=G.units;G.units=all.filter(keep);try{return _p(u);}finally{G.units=all;}}
function docOverkill(u,b,t){if(UT[b.type].cls!=='inf')return false;let n=0;
  for(const o of G.units)if(o!==u&&o.nat===u.nat&&o.lastShot&&o.lastShot.tgt===b.id&&t-o.lastShot.t<DOC.dist.over)n++;
  if(n<2)return false;const able=typeof casAble==='function'&&b._men?casAble(b).length:Math.ceil(b.hp/2);return able<=DOC.dist.low;}
{const _p=rtPick;rtPick=function(u){const b=_p(u);if(!b||u.tgt===b.id||UT[u.type].ind)return b;const t=docNow();
  try{
    // 나를 쏘는 적에게 응사
    const s=u._shBy;if(s&&t-s.t<DOC.dist.ret&&s.id!==b.id){const e=G.units.find(z=>z.id===s.id);
      if(e&&e.nat!==u.nat){const alt=docPickOnly(_p,u,z=>z===e||z.nat===u.nat);
        if(alt===e&&calcDmg(u,e,false)>=.5*calcDmg(u,b,false)){docN('retFire');return e;}}}
    // 거의 끝난 표적에 몰리지 않는다
    if(docOverkill(u,b,t)){const alt=docPickOnly(_p,u,z=>z!==b);if(alt&&calcDmg(u,alt,false)>=.5*calcDmg(u,b,false)){docN('spread');return alt;}}
  }catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}
  return b;};}
/* 매복 첫 사격·사거리 카드·숨찬 사수 */
{const _h=hitP;hitP=function(a,d){const h=_h(a,d);if(!h||!h.p)return h;const t=docNow();let k=1;
  if(d._ambNow)k*=DOC.amb.first;
  if(!UT[a.type].ind&&!UT[d.type].fly&&t-(a._stillT??t)>=DOC.rc.t)k*=DOC.rc.k;
  const f=a.fat||0;if(f>DOC.rush.stop)k*=1-DOC.rush.aim*Math.min(1,(f-DOC.rush.stop)/(1-DOC.rush.stop));
  if(k!==1)h.p=Math.min(.98,h.p*k);return h;};}
/* ---------- 5) 지휘 승계 · 6) 화기 다시 잡기 · 8) 정지 시간 · 9) 숨 ---------- */
function docLeadTick(u,t){const M=u._men;if(!M||typeof drLead!=='function')return;const L=drLead(M);const li=L?L.i:-1;
  if(u._ldI==null){u._ldI=li;return;}
  if(li!==u._ldI){const old=M.find(m=>m.i===u._ldI);const lost=!old||!menAct(old);
    if(lost&&li>=0&&!(old&&old.task)){const lap=Math.max(DOC.lead.min,DOC.lead.lapse-DOC.lead.perRank*(u.rank||0));u._lapse=t+lap;u._succ=(u._succ||0)+1;
      if(u._ldI!==0)u.mor=Math.max(0,(u.mor??80)-DOC.lead.mor);docN('succession');if(typeof docSuccFx==='function')try{docSuccFx(u,li);}catch(e){}}
    u._ldI=li;}}
{const _t=rtTick;rtTick=function(dt){_t(dt);if(!G||!G.units||G.over)return;const t=docNow();
  for(const u of G.units){try{
    const px=u._px,pz=u._pz;if(px==null||Math.abs(px-u.x)>.02||Math.abs(pz-u.z)>.02||(u.path&&u.path.length)){u._stillT=t;}
    if(u._stillT==null)u._stillT=t;u._px=u.x;u._pz=u.z;
    if(!docInf(u))continue;
    if(u._men)docLeadTick(u,t);
    const mv=!!(u.path&&u.path.length)&&px!=null&&Math.hypot(px-u.x,pz-u.z)>.001;
    const f=u.fat||0;u.fat=Math.max(0,Math.min(1,f+(u._rushing?DOC.rush.gain:mv?-DOC.rush.walk:-DOC.rush.rest)*dt));if(!u.fat)delete u.fat;
  }catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}}};}
const docOpen=u=>{const x=tileAt(u.x,u.z);return !!x&&(x.t==='road'||x.t==='plaza'||x.t==='park'||x.t==='grass'||x.t==='field'||(TT[x.t]&&!TT[x.t].cov&&x.t!=='bldg'));};
{const _m=rtMove;rtMove=function(u,dt){if(!docInf(u))return _m(u,dt);const t=docNow();let k=1;
  if((u._lapse||0)>t)k*=DOC.lead.slow;
  // 7) 강화: 거점 둘레에 남는다(AI 보병, 멀리 가는 이동만 미룸)
  const C=u._cons;if(C&&C.t>t&&aiRun(u.nat)&&!u.man&&!u.brk&&!u.rearm&&!u.job&&u.path&&u.path.length){const e=u.path[u.path.length-1];
    if(Math.hypot(e[0]-C.x,e[1]-C.z)>DOC.cons.r+.5){docN('consHold');return;}}
  // 9) 위협 속 트인 땅은 뛰어서 건넌다(숨이 차면 못 뜀)
  const thr=(u.supp||0)>0||t-(u._hitT??-99)<5||(u._thr&&t-u._thr[2]<5);
  u._rushing=!!(thr&&(u.fat||0)<DOC.rush.stop&&u.path&&u.path.length&&!u.climb&&docOpen(u));
  if(u._rushing)k*=DOC.rush.k;
  return _m(u,dt*k);};}
{const _f=rtFight;rtFight=function(u){const t=docNow();const cd0=u.cd;_f(u);if((u._lapse||0)>t&&u.cd>cd0+.01)u.cd*=DOC.lead.cdK;};}
/* 저격수는 지금 지휘하는 사람을 노린다 */
if(typeof snpVictim==='function'){snpVictim=function(u){const M=menOf(u);const L=M.filter(m=>!m.dead&&!m.gone&&!m.down);if(!L.length)return null;
  const ld=typeof drLead==='function'?drLead(M):null;
  let best=null,bs=-1e9;for(const m of L){const s=Math.random()+((ld?m===ld:m.i===0)?1.2:0)+(m.spd>.05?.5:0)-(m.pr>0?.4:0);if(s>bs){bs=s;best=m;}}return best;};}
/* 6) 쓰러진 사수의 화기를 남은 소총수가 넘겨받는다 */
if(typeof kitAble==='function'&&typeof KIT==='object'){const _k=kitAble;kitAble=function(u,k){const n=_k(u,k);const K=KIT[u.type];const M=u._men;if(!K||!M||!u.ws)return n;
  const full=Object.values(K).filter(v=>v===k).length;if(n>=full)return n;if(docNow()-(u.casT??-99)<DOC.reman)return n;
  // 넘겨받을 사람: 분대장·위생병·다른 화기 사수가 아닌, 싸울 수 있는 소총수. 화기 종류마다 앞 번호부터 나눈다
  const ld=typeof drLead==='function'?drLead(M):null;const spare=M.filter(m=>menAct(m)&&m!==ld&&m.i!==1&&!K[m.i]).length;
  const order=[...new Set(Object.values(K))];let used=0;for(const kk of order){if(kk===k)break;const f2=Object.values(K).filter(v=>v===kk).length;used+=Math.max(0,f2-_k(u,kk));}
  return n+Math.max(0,Math.min(full-n,spare-used));};}
/* ---------- 7) 강화·재편성: 거점을 차지하면 ---------- */
function docConsolidate(n,o,t){const cx=o.c+.5,cz=o.r+.5;const us=G.units.filter(u=>u.nat===n&&!UT[u.type].fly&&Math.hypot(u.x-cx,u.z-cz)<=DOC.cons.r);if(!us.length)return null;
  // 탄약 나눠 맞추기(같은 거점의 분대·차량끼리)
  let am=0,mx=0;const A=us.filter(u=>typeof amMax==='function'&&amMax(u)&&typeof amOf==='function');for(const u of A){am+=amOf(u);mx+=amMax(u);}
  const fr=mx?am/mx:1;for(const u of A)u.am=amMax(u)*fr;
  let cas=0;
  for(const u of us){if(docInf(u)){u.mor=Math.min(100,(u.mor??80)+DOC.cons.mor);u.supp=(u.supp||0)*.5;u._cons={t:t+DOC.cons.t,x:cx,z:cz};}
    if(u.ws)cas+=u.ws.filter(w=>w.s==='hw'||w.s==='kia').length;}
  const rep={n,obj:o,ammo:fr>=.6?'green':fr>=.3?'amber':'red',cas,eq:us.some(u=>u.vd&&(u.vd.mob||u.vd.gun))?'amber':'green',units:us.length,t};
  (G.cons=G.cons||[]).push(rep);if(G.cons.length>20)G.cons.shift();docN('consolidate');return rep;}
{const _am=afterMove;afterMove=function(u){const x=cell(u.r,u.c),was=x.owner;const r=_am.apply(this,arguments);
  try{if(x.obj!=null&&was!==x.owner&&x.owner===u.nat&&G.objs&&G.objs[x.obj]){const rep=docConsolidate(u.nat,G.objs[x.obj],docNow());if(rep&&typeof docAceFx==='function')docAceFx(rep,u);}}
  catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}return r;};}
