/* ===================== 의료 2: 구호소·구급차·병원, 치료 후 복귀 =====================
   05g-casualty의 후송은 출발 지역 환자집결지까지 걸어가 끝났다(후송된 병사는 그 판에서 영영 빠짐). 여기서 바꾸는 것:
   - 후송조는 가장 가까운 의료 시설로 간다: 출발 지역 환자집결지, 앞쪽에 세운 구호소(05k-fort2), 우리가 쥔 종합병원,
     멈춰 기다리는 구급차.
   - 시설에 넘겨진 중상자는 치료를 받고, 일부가 시간이 지나 걸어서 원래 분대로 돌아온다(복귀).
       환자집결지 25% · 90초, 구호소 30% · 70초, 종합병원 60% · 45초
     분대가 이미 없어졌으면 대신 지휘점수 +1(회복병을 다른 곳에 보냄).
     병원을 적에게 빼앗기면 거기 누워 있던 환자는 포로가 된다.
   - 구호소·병원 둘레의 경상자는 치료받아 정상으로 돌아간다(구호소 1.2칸 20초, 병원 2칸 12초).
   - 구급차(새 병종): 부상자가 생긴 분대 뒤 안전한 곳에 서서 후송조를 받는다(분대 가까이에 이동 환자집결지가 생기는 셈).
     넷을 싣거나 더 올 부상자가 없으면 가까운 병원·구호소·환자집결지로 달려가 내려놓는다. 구급차가 부서지면 실린 환자도 죽는다.
   AI도 부상자가 쌓이면 구급차를 산다. */
Object.assign(UT,{amb:{n:'구급차',cls:'veh',mv:6,vis:4,rng:[0,0],atk:{inf:0,veh:0,air:0},cost:3,hpMax:6,logi:1,med:1,
  desc:'부상자가 생긴 분대 뒤에 서서 후송조를 받고(이동 환자집결지), 넷을 실으면 병원·구호소로 달려감. 무장 없음, 장갑 얇음'}});
if(!TYPES.includes('amb'))TYPES.splice(TYPES.indexOf('rec')>=0?TYPES.indexOf('rec')+1:TYPES.length,0,'amb');
Object.assign(COOL,{amb:1});if(typeof VCREW==='object')VCREW.amb=2;
const MED={base:{p:.25,t:90,n:'환자집결지'},aid:{p:.3,t:70,n:'구호소'},hosp:{p:.6,t:45,n:'종합병원'}};
const AMB_CAP=4;
/* 세력 n의 의료 시설 목록 [{k,x,z,id}] (구급차는 서서 기다리고 자리가 남은 것만) */
function medSites(n,amb){const out=[];const b=ccpBase(n);out.push({k:'base',x:b.x,z:b.z,id:'b'+n});
  for(const f of G.forts||[])if(f.k==='aid'&&f.nat===n&&f.prog>=1)out.push({k:'aid',x:f.x,z:f.z,id:'f'+f.id});
  if(typeof objsOf==='function'&&typeof objOn==='function'&&objOn())for(const o of objsOf(n,'hosp'))out.push({k:'hosp',x:o.c+.5,z:o.r+.5,id:'o'+G.objs.indexOf(o),oi:G.objs.indexOf(o)});
  if(amb!==false)for(const u of G.units)if(u.type==='amb'&&u.nat===n&&!(u.path&&u.path.length)&&(u.load||[]).length<AMB_CAP&&u.mj&&u.mj.k==='wait')out.push({k:'amb',x:u.x,z:u.z,id:'u'+u.id,u:u.id});
  return out;}
const ccpBase=ccpOf;
/* 가장 가까운 의료 시설. 위치를 주지 않으면 예전처럼 출발 지역 환자집결지 */
ccpOf=function(n,x,z,amb){if(x==null||!G||!G.units)return ccpBase(n);let best=null,bd=1e9;
  for(const s of medSites(n,amb)){const d=Math.hypot(s.x-x,s.z-z)*(s.k==='hosp'?.85:1);if(d<bd){bd=d;best=s;}}
  return best||ccpBase(n);};
const medStats=n=>{const S=casStats(n);if(S.rtd==null)S.rtd=0;if(S.pow==null)S.pow=0;return S;};
/* 후송조가 시설 c에 부상자를 넘겼다 (05g evTick이 부른다). cw = 부상 기록 */
function medAdmit(c,p,cw){if(!c||!cw)return;const uid=p.cas&&p.cas.u!=null?p.cas.u:null,ci=p.cas?p.cas.i:null;
  if(c.k==='amb'){const a=G.units.find(z=>z.id===c.u);if(a){(a.load=a.load||[]).push({u:uid,i:ci,w:cw});a._lt=G.time||0;return;}c={k:'base',...ccpBase(p.nat)};}
  medQueue(p.nat,c,uid,ci);}
function medQueue(n,c,uid,ci){const M=MED[c.k]||MED.base;G.med=G.med||[];
  G.med.push({nat:n,u:uid,i:ci,k:c.k,x:c.x,z:c.z,oi:c.oi,t:(G.time||0)+M.t*(.8+Math.random()*.4),ok:Math.random()<M.p});}
let MEDID=1;
function medTick(dt){const t=G.time||0;G.med=G.med||[];
  // 병원을 빼앗기면 환자는 포로
  if(G.med.length){const lost={};G.med=G.med.filter(e=>{if(e.k!=='hosp'||e.oi==null)return true;const o=G.objs[e.oi];const x=o&&G.map[o.r][o.c];if(x&&x.owner===e.nat&&x.t!=='rubble')return true;lost[e.nat]=(lost[e.nat]||0)+1;medStats(e.nat).pow++;return false;});
    for(const n in lost)if(!isAI(+n)||!G.fog||+n===G.viewer)L(`${natName(+n)} 병원을 잃어 환자 ${lost[n]}명이 포로가 됨`);}
  // 치료가 끝난 환자
  const keep=[];for(const e of G.med){if(e.t>t){keep.push(e);continue;}if(!e.ok)continue;const S=medStats(e.nat);S.rtd++;
    const u=e.u!=null?G.units.find(z=>z.id===e.u):null;
    if(u&&u.ws&&u.ws[e.i]&&u.ws[e.i].s==='evac'){const id='e'+(typeof EVID!=='undefined'?EVID++:'m'+(MEDID++));
      u.ws[e.i]={s:'ok',y:id};G.evac=G.evac||[];G.evac.push({id,nat:e.nat,u:u.id,ci:e.i,cas:{rtd:1},x:e.x,z:e.z,ph:'back',path:null,rp:0});
      const m=u._men&&u._men[e.i];if(m)manFlags(u,m);
      if(e.nat===G.viewer||!G.fog)casLog(`${natName(e.nat)} ${UT[u.type].n} 병사 치료 마치고 복귀 중`);}
    else{G.nats[e.nat].cp+=1;}}
  G.med=keep;
  // 시설 둘레: 경상자 치료, 쓰러진 중상자 지혈
  const sites={};for(const n of G.order)sites[n]=medSites(n,false).filter(s=>s.k!=='base');
  for(const u of G.units){if(UT[u.type].cls!=='inf'||!u.ws||!sites[u.nat]||!sites[u.nat].length)continue;const M=menOf(u);
    for(const m of M){const w=u.ws[m.i];if(w.y||(w.s!=='lw'&&w.s!=='hw'))continue;
      let k=null;for(const s of sites[u.nat]){const R=s.k==='hosp'?2:1.2;if(Math.hypot(m.x-s.x,m.z-s.z)<=R){k=s.k;break;}}if(!k)continue;
      if(w.s==='hw'){w.a=1;continue;}
      w.hl=(w.hl||0)+dt;if(w.hl>=(k==='hosp'?12:20)){w.s='ok';delete w.slow;delete w.hl;medStats(u.nat).rtd++;manFlags(u,m);casSync(u,null);}}}
  for(const u of G.units)if(u.type==='amb')ambTick(u,dt,t);}
/* ---------- 구급차 ---------- */
function ambWant(n,x,z,R){// 부상자가 기다리는 분대(중상자가 있고 아직 업혀 가지 않은)
  let best=null,bs=0;for(const o of G.units){if(o.nat!==n||!o.ws)continue;const hw=o.ws.filter(w=>w.s==='hw'&&!w.y).length+(G.evac||[]).filter(p=>p.nat===n&&p.u===o.id&&p.ph==='out').length;if(!hw)continue;
    if(inZone(n,o.r,o.c))continue;const d=Math.hypot(o.x-x,o.z-z);if(d>R)continue;
    if(G.units.some(a=>a.type==='amb'&&a.nat===n&&a.mj&&a.mj.id===o.id))continue;if(ambNo(n,o.id)||ambDanger(n,o.x,o.z,1))continue;const s=hw/(1+d*.15);if(s>bs){bs=s;best=o;}}
  return best;}
/* 분대 뒤(출발 지역 쪽) 안전한 자리 */
function ambSpot(a,o){const b=ccpBase(a.nat);const dx=b.x-o.x,dz=b.z-o.z,d=Math.hypot(dx,dz)||1;
  for(const k of [1.2,1.7,2.3,3]){const x=o.x+dx/d*k,z=o.z+dz/d*k;const t=tileAt(x,z);if(!t||t.t==='bldg'||t.t==='water')continue;if(ambDanger(a.nat,x,z))continue;if(!navOk(a,x,z))continue;return [x,z];}
  return null;}
function ambUnload(a){const fac=ccpOf(a.nat,a.x,a.z,false);for(const l of a.load||[])medQueue(a.nat,fac,l.u,l.i);
  if((a.load||[]).length&&(!isAI(a.nat)||!G.fog||a.nat===G.viewer))L(`${natName(a.nat)} 구급차 부상자 ${a.load.length}명을 ${MED[fac.k].n}에 내려놓음`);a.load=[];a.mj=null;}
function ambTick(a,dt,t){a.load=a.load||[];const moving=a.path&&a.path.length;const j=a.mj;
  if(j&&j.k==='go'){// 시설로 가는 중
    const f=ccpOf(a.nat,a.x,a.z,false);if(Math.hypot(f.x-a.x,f.z-a.z)<.7){ambUnload(a);return;}
    if(!moving&&(a._rp2||0)<t){a._rp2=t+3;a.path=pathPts(a,f.x,f.z);if(!a.path.length){ambUnload(a);}}return;}
  if(a.load.length>=AMB_CAP||(a.load.length&&t-(a._lt||0)>12&&!(G.evac||[]).some(p=>p.nat===a.nat&&p.ph==='out'&&Math.hypot(p.x-a.x,p.z-a.z)<4))){a.mj={k:'go'};const f=ccpOf(a.nat,a.x,a.z,false);a.path=pathPts(a,f.x,f.z);return;}
  if(j&&j.k==='wait'){const o=G.units.find(z=>z.id===j.id);
    // 총알이 날아오면 물러난다
    if(t-(a._hitT||-99)<3||hotAt(a.nat,a.x,a.z,1.8)){a.mj=null;if(a.load.length){a.mj={k:'go'};const f=ccpOf(a.nat,a.x,a.z,false);a.path=pathPts(a,f.x,f.z);}return;}
    const busy=(G.evac||[]).some(p=>p.nat===a.nat&&(p.ph==='out'||p.ph==='get')&&Math.hypot(p.x-a.x,p.z-a.z)<5)||(o&&o.ws&&o.ws.some(w=>w.s==='hw'&&!w.y));
    if(busy)a._wt=t;if(t-(a._wt||t)>20||!o){a.mj=null;}return;}
  if(j&&j.k==='move'){if(moving)return;const o=G.units.find(z=>z.id===j.id);if(!o){a.mj=null;return;}a.mj={k:'wait',id:o.id};a._wt=t;return;}
  if(a.hold||moving)return;
  if(a.load.length){const f=ccpOf(a.nat,a.x,a.z,false);if(Math.hypot(f.x-a.x,f.z-a.z)<1.2){ambUnload(a);return;}}
  if((a._auT||0)>t)return;a._auT=t+2;
  const o=ambWant(a.nat,a.x,a.z,selfRun(a)?99:7);if(!o)return;const sp=ambSpot(a,o);if(!sp)return;
  a.mj={k:'move',id:o.id};a.path=pathPts(a,sp[0],sp[1]);}
/* 구급차가 부서지면 실린 환자도 죽는다 */
{const _k=kill;kill=function(u,by){if(u&&u.type==='amb'&&u.load&&u.load.length){const S=medStats(u.nat);
     for(const l of u.load){S.dow++;S.kia++;const s=l.u!=null?G.units.find(z=>z.id===l.u):null;if(s&&s.ws&&s.ws[l.i]&&s.ws[l.i].s==='evac'){s.ws[l.i].s='kia';const m=s._men&&s._men[l.i];if(m){m.x=u.x;m.z=u.z;manFlags(s,m);}}}
     L(`${natName(u.nat)} 구급차 피격, 실린 부상자 ${u.load.length}명 사망`);u.load=[];}
   return _k(u,by);};}
/* ---------- 엔진에 끼우기 ---------- */
{const _t=rtTick;rtTick=function(dt){_t(dt);if(!G||!G.units||G.over)return;try{medTick(dt);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}};
 // 사람이 직접 명령하면 구급차는 맡은 일을 내려놓는다(실은 환자는 그대로)
 const man=f=>function(u){if(u&&u.type==='amb')u.mj=null;return f.apply(null,arguments);};orderMoveTo=man(orderMoveTo);orderStop=man(orderStop);}
/* ---------- AI: 부상자가 쌓이면 구급차 ---------- */
{const _ai=aiThink;aiThink=function(n){if(!G.over)try{aiMedBuy(n);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}return _ai(n);};}
function aiMedBuy(n){const N2=G.nats[n];const mine=G.units.filter(u=>u.nat===n);const amb=mine.filter(u=>u.type==='amb').length;const hurt=mine.reduce((a,u)=>a+(u.ws?u.ws.filter(w=>w.s==='hw'&&!w.y).length:0),0)+(G.evac||[]).filter(p=>p.nat===n&&p.ph==='out').length+(G.cas||[]).filter(o=>o.nat===n).length;
  const want=(G.size==='l'?2:1)+(hurt>=8?1:0);if(amb>=want)return;
  if(hurt<3||N2.cp<UT.amb.cost+3)return;const sp=deploySpots(n,'amb');if(!sp.length)return;const b=ccpBase(n);
  sp.sort((p,q)=>Math.hypot(kc(p)+.5-b.x,kr(p)+.5-b.z)-Math.hypot(kc(q)+.5-b.x,kr(q)+.5-b.z));buy(n,'amb',kr(sp[0]),kc(sp[0]));}

/* ---------- 남겨진 부상자 수습 ----------
   분대가 끝난 자리에 쓰러진 중상자(G.cas)는 예전엔 지나가던 분대가 2칸 안에 와야만 데려갔다.
   이제 구급차가 빈 틈에 직접 실으러 가고, AI는 근처에서 쉬고 있는 분대를 보내 데려온다. */
function orphFree(n,x,z,R){let best=null,bd=R;for(const o of G.cas||[]){if(o.nat!==n||o.taken)continue;const d=Math.hypot(o.x-x,o.z-z);if(d>=bd)continue;if((o._ambNo||0)>(G.time||0)||ambDanger(n,o.x,o.z))continue;bd=d;best=o;}return best;}
{const _at=ambTick;ambTick=function(a,dt,t){a.load=a.load||[];const j=a.mj;
  if(j&&j.k==='orph'){const o=(G.cas||[]).find(q=>q.id===j.id);
    if(!o||t-(a._hitT||-99)<3||hotAt(a.nat,a.x,a.z,1.8)){if(o)o.taken=0;a.mj=null;a.path=[];return;}
    if(Math.hypot(o.x-a.x,o.z-a.z)<.75){G.cas=G.cas.filter(q=>q!==o);a.load.push({u:null,i:null,w:o});a._lt=t;a.mj=null;
      if(!isAI(a.nat)||!G.fog||a.nat===G.viewer)L(`${natName(a.nat)} 구급차 남겨진 부상자 수습`);return;}
    if(!(a.path&&a.path.length)){if((j.tries=(j.tries||0)+1)>4){o.taken=0;o.noAmb=1;a.mj=null;return;}a.path=pathPts(a,o.x,o.z);}
    return;}
  _at(a,dt,t);
  if(a.mj||a.hold||(a.path&&a.path.length)||a.load.length>=AMB_CAP||(a._oT||0)>t)return;a._oT=t+2;
  const o=orphFree(a.nat,a.x,a.z,selfRun(a)?40:10);if(!o||o.noAmb)return;o.taken=1;a.mj={k:'orph',id:o.id};a.path=pathPts(a,o.x,o.z);};}
// 적 보병이 곁을 지나고 아군이 멀면 남겨진 부상자는 포로로 잡혀 간다
function orphPow(){if(!G.cas||!G.cas.length)return;G.cas=G.cas.filter(o=>{if(o.taken)return true;
  const foe=G.units.find(e=>hostile(e.nat,o.nat)&&UT[e.type].cls==='inf'&&Math.hypot(e.x-o.x,e.z-o.z)<1.2);if(!foe)return true;
  if(G.units.some(u=>u.nat===o.nat&&!UT[u.type].fly&&Math.hypot(u.x-o.x,u.z-o.z)<3))return true;
  medStats(o.nat).pow++;if(!isAI(o.nat)||!G.fog||o.nat===G.viewer||foe.nat===G.viewer)L(`${natName(foe.nat)} ${UT[foe.type].n}이(가) 남겨진 ${natName(o.nat)} 부상자를 포로로 잡음`);return false;});}
{const _mt=medTick;medTick=function(dt){_mt(dt);orphPow();};}
// 차가 움직이면(손으로 옮기면) 수습은 그만둔다
{const _om=orderMoveTo;orderMoveTo=function(u,x,z){if(u&&u.mj&&u.mj.k==='orph'){const o=(G.cas||[]).find(q=>q.id===u.mj.id);if(o)o.taken=0;}return _om(u,x,z);};}
// AI: 싸우지 않는 보병 분대를 가까운 부상자에게 보낸다(분대가 2칸 안에 오면 05g가 업고 간다)
function aiOrphan(n){if(!G.cas||!G.cas.length)return;const t=G.time||0;
  for(const o of G.cas){if(o.nat!==n||o.taken||(o._call||-99)>t-25)continue;if(hotAt(n,o.x,o.z,2.5))continue;
    let best=null,bd=14;for(const u of G.units){if(u.nat!==n||UT[u.type].cls!=='inf'||!u.ws||(u.supp||0)>.5||u.tgt||(u.path&&u.path.length))continue;
      if(typeof casAble==='function'&&casAble(u).length<3)continue;if(hotAt(n,u.x,u.z,4))continue;const x=cell(u.r,u.c);if(x.obj!=null&&x.cap)continue;
      const d=Math.hypot(u.x-o.x,u.z-o.z);if(d<bd){bd=d;best=u;}}
    if(best){o._call=t;orderMoveTo(best,o.x,o.z);}}}
{const _ai=aiThink;aiThink=function(n){if(!G.over)try{aiOrphan(n);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}return _ai(n);};}

/* ---------- 구급차 안전 (보급 트럭과 같은 규칙, 06e-polish) ----------
   적이 3.2칸 안에 보이거나 방금 맞았으면 하던 일을 버리고 물러난다(실었으면 시설로, 아니면 환자집결지로).
   그 분대·부상자는 30초 동안 다시 찾아가지 않는다. 교전 중인 곳(둘레에서 적이 방금 쐈거나 아군이 제압당한 곳)엔 들어가지 않는다.
   AI는 구급차를 잃으면 60초 동안 새로 사지 않는다. */
const AMBS={hot:3.2,hit:6,flee:30,fight:5,rebuy:60};
function ambDanger(n,x,z,sq){if(hotAt(n,x,z,AMBS.hot))return true;const t=G.time||0;
  for(const e of G.units){if(e.nat===n||!hostile(e.nat,n)||UT[e.type].fly)continue;if(!firedRecently(e))continue;if(G.fog&&!seen(e,n))continue;if(Math.hypot(e.x-x,e.z-z)<AMBS.fight)return true;}
  if(!sq&&G.units.some(u=>u.nat===n&&UT[u.type].cls==='inf'&&(u.supp||0)>.8&&Math.hypot(u.x-x,u.z-z)<2))return true;   // 분대 자체가 제압당하는 중이면 그 뒤로는 간다(sq)
  return false;}
function ambNo(n,id){const m=G.ambNog&&G.ambNog[n];return !!(m&&m[id]>(G.time||0));}
function ambFlee(a,t){const j=a.mj;G.ambNog=G.ambNog||{};const m=G.ambNog[a.nat]=G.ambNog[a.nat]||{};
  if(j&&j.id!=null){if(j.k==='orph'){const o=(G.cas||[]).find(q=>q.id===j.id);if(o){o.taken=0;o._ambNo=t+AMBS.flee;}}else m[j.id]=t+AMBS.flee;}
  if(a.load.length){a.mj={k:'go'};const f=ccpOf(a.nat,a.x,a.z,false);a.path=pathPts(a,f.x,f.z);}
  else{const b=ccpBase(a.nat);a.mj={k:'flee'};a.path=pathPts(a,b.x,b.z);}
  a._auT=t+4;a._oT=t+4;if(typeof tacN==='function')tacN('ambFlee');}
{const _at=ambTick;ambTick=function(a,dt,t){a.load=a.load||[];const j=a.mj;
  const hot=hotAt(a.nat,a.x,a.z,AMBS.hot)||t-(a._hitT??-99)<AMBS.hit;
  if(hot&&!a.hold&&!(j&&(j.k==='go'||j.k==='flee'))){const b=ccpBase(a.nat);if(Math.hypot(b.x-a.x,b.z-a.z)>1.5){ambFlee(a,t);return;}}
  if(j&&j.k==='flee'){if(!(a.path&&a.path.length))a.mj=null;return;}
  // 가는 길에 목적지가 교전으로 바뀌면 멈춘다
  if(j&&(j.k==='move'||j.k==='orph')&&a.path&&a.path.length&&(a._dzT||0)<t){a._dzT=t+1;const p=a.path[a.path.length-1];if(ambDanger(a.nat,p[0],p[1],j.k==='move')){ambFlee(a,t);return;}}
  return _at(a,dt,t);};}
// 플레이어가 직접 옮기면 물러나기는 끝
{const _om=orderMoveTo;orderMoveTo=function(u,x,z){if(u&&u.type==='amb'&&u.mj&&u.mj.k==='flee')u.mj=null;return _om(u,x,z);};}
// AI: 구급차를 막 잃었으면 바로 다시 사지 않는다
{const _k=kill;kill=function(u,by){if(u&&u.type==='amb'&&G.units.includes(u)){G.ambLost=G.ambLost||{};G.ambLost[u.nat]=G.time||0;}return _k(u,by);};}
{const _mb=aiMedBuy;aiMedBuy=function(n){if(G.ambLost&&(G.time||0)-(G.ambLost[n]??-999)<AMBS.rebuy)return;return _mb(n);};}
