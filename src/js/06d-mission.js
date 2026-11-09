/* ===================== MISSION: 임무형 지휘 (개선 묶음 B) =====================
   플레이어는 부대 하나하나를 끌고 다니지 않고, 묶어서 임무만 준다. 세부 이동·엄폐·사격은 소대 전술 AI(06c-tactics)가 한다.
   - 임무: 공격(그 지점·거점을 점령하고 나면 방어로 바뀜), 방어(그 둘레 3칸 안 엄폐에서 지킴),
           정찰(엄폐를 타고 번갈아 가며, 적을 보면 숨어서 보고), 지원 사격(그 자리에서 보이는 적을 제압).
   - 자율: 위임 = 측면·돌격·후퇴를 소대가 알아서 / 반자동 = 돌격·후퇴 전에 승인을 요청.
   - 포격 요청: 접적한 소대가 큰 적 무더기를 만나면 포격을 요청한다(지휘점수가 드니 언제나 승인 필요).
   - 보고: 임무 수령, 접적, 돌격, 목표 확보, 후퇴, 피해(전사·중상)가 무전 기록으로 올라온다.
   - 차량·곡사·저격 같은 다른 부대도 같은 임무에 넣을 수 있다: 차량은 보병 소대 곁을 따르고, 나머지는 소대 뒤를 따른다.
   - 임무 중인 부대에 직접 이동·공격·정지 명령을 주면 그 부대는 임무에서 빠진다.
   명령은 무전(05j-radio)으로 가고 바로 닿는다. */
const MSN={attack:{n:'공격'},defend:{n:'방어'},recon:{n:'정찰'},support:{n:'지원 사격'}};
const MSN_AUT={full:'위임',semi:'반자동'};
const MSN_ST={move:'이동',contact:'교전',assault:'돌격',retreat:'후퇴',regroup:'재편성'};
const MSN_REQ={assault:'돌격',retreat:'후퇴',arty:'포격'};
function msnLeave(u){if(!u)return;if(u.pl){const p=tacPl().find(q=>q.id===u.pl);if(p)p.mem=p.mem.filter(i=>i!==u.id);}u.pl=null;u.tk=null;u.msn=null;}
function msnOf(u){if(!u)return null;const id=u.pl||(u.msn&&u.msn.pl);return id?tacPl().find(q=>q.id===id)||null:null;}
/* 임무 주기: 보병은 4개 분대씩 소대로, 나머지는 그 소대를 따른다 */
function msnAssign(n,us,mode,x,z,aut){us=us.filter(u=>u&&G.units.includes(u)&&u.nat===n);if(!us.length||!MSN[mode])return null;const t=G.time||0;
  for(const u of us)msnLeave(u);
  const inf=us.filter(tacUnit).sort((a,b)=>a.x-b.x||a.z-b.z),oth=us.filter(u=>!tacUnit(u)&&!UT[u.type].fly);const P=[];
  for(let i=0;i<inf.length;i+=TAC.size+1){const ch=inf.slice(i,i+TAC.size+1);G.msnN=(G.msnN||0)+1;
    const p={id:TACID++,nat:n,mem:ch.map(u=>u.id),mode,st:'move',stT:t,ph:0,phT:t,obj:[Math.floor(z),Math.floor(x)],pt:[x,z],objT:t,auto:false,human:1,aut:aut==='semi'?'semi':'full',name:`${G.msnN}소대`,ok:{},rep:{}};
    tacPl().push(p);P.push(p);for(const u of ch){u.pl=p.id;u.tk={role:'move',at:-99};u.path=[];u.tgt=null;u.tgtTile=null;u.dest=null;u.hold=false;}msnCas(p,1);}
  const lead=P[0]||null;
  for(const u of oth){u.msn={mode,x,z,pl:lead?lead.id:null,t:-99};u.tgt=null;u.hold=false;}
  const who=P.map(p=>p.name).join('·')||`${oth.length}개 부대`;
  msnLog(n,`${who} ${MSN[mode].n} 임무 수령${aut==='semi'?' (반자동)':''}`);
  if(P.length)msnThink(n);
  return P;}
function msnLog(n,m){if(n===G.viewer)L(m);}
function msnReport(p,m){const t=G.time||0;const k=m.slice(0,6);if(p.rep[k]&&t-p.rep[k]<6)return;p.rep[k]=t;msnLog(p.nat,`${p.name}: ${m}`);}
/* 피해 보고: 새 전사·중상이 생기면 */
function msnCas(p,quiet){let k=0,w=0;for(const id of p.mem){const u=G.units.find(o=>o.id===id);if(!u||!u.ws)continue;for(const s of u.ws){if(s.s==='kia')k++;else if(s.s==='hw'||s.s==='evac')w++;}}
  const pk=p.ck??k,pw=p.cw??w;p.ck=k;p.cw=w;if(quiet)return;
  if(k>pk||w>pw)msnReport(p,`피해 보고: 전사 ${k-pk>0?k-pk:0} · 중상 ${w-pw>0?w-pw:0}`);}
/* 정찰 보고: 처음 본 적 */
function msnSpot(p,K){p.seen=p.seen||{};let nw=[];for(const k of K){if(p.seen[k.id])continue;p.seen[k.id]=1;nw.push(UT[k.ty].n);}if(nw.length)msnReport(p,`적 발견: ${nw.slice(0,3).join(', ')}${nw.length>3?` 외 ${nw.length-3}`:''}`);}
/* 승인 */
function msnOK(p,k){return p.ok&&p.ok[k]!=null&&(G.time||0)-p.ok[k]<30;}
function msnReq(p,k,a){const t=G.time||0;if(p.req&&p.req.k===k)return;if(p.no&&p.no[k]&&t-p.no[k]<25)return;p.req={k,t,a:a||null};msnReport(p,`${MSN_REQ[k]} 승인 요청`);}
function msnAnswer(pid,yes){const p=tacPl().find(q=>q.id===pid);if(!p||!p.req)return false;const r=p.req;p.req=null;const t=G.time||0;
  if(!yes){p.no=p.no||{};p.no[r.k]=t;msnReport(p,`${MSN_REQ[r.k]} 보류`);return true;}
  if(r.k==='arty'){const ok=support(p.nat,'arty',r.a[0],r.a[1]);if(!ok)msnLog(p.nat,'포격 지원을 할 수 없습니다(지휘점수·재정비·시야)');return ok;}
  p.ok[r.k]=t;msnReport(p,`${MSN_REQ[r.k]} 승인`);return true;}
/* 포격 요청: 아군이 2칸 안에 없는 적 무더기(가치 6 이상) */
function msnFireReq(p,K,est){const t=G.time||0;if(p.req||t-(p.artyT??-99)<45||est<6||!SUP.arty)return;const N2=G.nats[p.nat];if(N2.cp<SUP.arty.cost)return;
  let best=null,bs=0;for(const k of K){let s=0;for(const o of K)if(Math.hypot(o.x-k.x,o.z-k.z)<1.6)s+=tacCost(o.ty);if(G.units.some(o=>o.nat===p.nat&&!UT[o.type].fly&&Math.hypot(o.x-k.x,o.z-k.z)<2))continue;if(s>bs){bs=s;best=k;}}
  if(!best||bs<6||!canSupport(p.nat,'arty',Math.floor(best.z),Math.floor(best.x)))return;p.artyT=t;msnReq(p,'arty',[Math.floor(best.z),Math.floor(best.x)]);}
/* 소대가 아닌 임무 부대: 차량은 소대 곁, 나머지는 소대 뒤 */
function msnFollow(u){const m=u.msn;const t=G.time||0;if(!m||t-m.t<3||u.path&&u.path.length&&t-m.t<8)return;m.t=t;const p=m.pl?tacPl().find(q=>q.id===m.pl):null;
  let cx=m.x,cz=m.z;const c=p?tacCtr(p):null;if(c){cx=c[0];cz=c[1];}const t0=UT[u.type];
  if(t0.ind&&c){if(G.units.some(e=>e.nat!==u.nat&&canHit(u,e)))return;}           // 곡사: 쏠 수 있으면 자리 지킴
  const dx=m.x-cx,dz=m.z-cz,L0=Math.hypot(dx,dz)||1;const back=c?(t0.cls==='veh'&&!t0.ind?1.4:t0.ind?4:2.5):0;
  const gx=cx-dx/L0*back,gz=cz-dz/L0*back;if(Math.hypot(gx-u.x,gz-u.z)<1.2)return;const [sx,sz]=coverSnap(u,gx,gz);const P=pathPts(u,sx,sz);if(P.length){u.path=P;u.dest=[sx,sz];}}
/* 플레이어 세력 소대 판단(AI 세력은 aiThink 안에서) */
function msnThink(n){tacThink(n);for(const p of tacPl())if(p.nat===n&&p.human)msnCas(p);for(const u of G.units)if(u.nat===n&&u.msn)msnFollow(u);}
/* ---------- 엔진에 끼우기 ---------- */
{const _re=radioExec;radioExec=function(k,a,us){us=(us||[]).filter(u=>u&&G.units.includes(u));
  if(k==='mis'){if(!us.length)return;const n=us[0].nat;if(a[0]==='off'){us.forEach(msnLeave);msnLog(n,`${us.length}개 부대 임무 해제, 직접 지휘`);}else msnAssign(n,us,a[0],a[1],a[2],a[3]);for(const g of us)g._ack=G.time||0;return;}
  if(k!=='hold'&&k!=='floor')for(const u of us)if((u.pl||u.msn)&&!isAI(u.nat))msnLeave(u);   // 직접 명령을 받으면 임무에서 빠진다
  return _re(k,a,us);};}
{const _tick=rtTick;rtTick=function(dt){_tick(dt);if(!G||G.over||!G.units||!G.plat)return;const t=G.time||0;
  for(const n of G.order){if(isAI(n)||!G.nats[n].alive)continue;const N2=G.nats[n];if((N2.msnT||0)>t)continue;N2.msnT=t+TAC.think;
    if(!G.plat.some(p=>p.nat===n)&&!G.units.some(u=>u.nat===n&&u.msn))continue;try{msnThink(n);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}}};}
