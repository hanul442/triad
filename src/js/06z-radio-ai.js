/* ===================== AI 명령도 무전으로 =====================
   (06z: 전술 AI·임무 지휘(06c-tactics, 06d-mission)가 감싼 aiThink까지 바깥에서 감싸야 해서 06 묶음 맨 끝에 둔다)
   05j-radio는 사람의 명령만 늦췄다. 이 파일은 AI가 내린 기동·사격 명령도 같은 교신 대기열(G.rq)에 넣는다.
   - aiThink(다른 모듈이 감싼 것까지 모두)를 한 번 더 감싼다. 생각하기 전 부대마다 명령 상태를 적어 두고,
     생각한 뒤 바뀐 부대는 원래 명령으로 되돌린 다음 새 명령을 무전으로 보낸다.
   - 한 번 생각할 때 내린 명령들은 교신 한 번(여러 부대를 함께 부름)으로 친다. 부대가 하나 늘 때마다 교신이 조금 길어진다.
   - 무전이 아직 닿지 않은 부대에는 AI가 새 명령을 덧씌우지 않는다(계속 바꾸면 영영 닿지 않는다).
   - 재밍 반경 안이면 사람과 똑같이 재송신하고, 끝내 안 되면 전령이 간다.
   - 갓 배치된 부대(생각 전엔 없던 부대), 증원·화력 지원 요청은 바로 실행된다. */
const RADIO_AI={more:.12,maxTalk:1.2};
function aiOrdState(u){return {p:u.path,pl:u.path?u.path.length:0,tgt:u.tgt??null,tt:u.tgtTile??null,d:u.dest,h:u.hold};}
function aiOrdChanged(u,s){return u.path!==s.p||(u.path?u.path.length:0)!==s.pl||(u.tgt??null)!==s.tgt||(u.tgtTile??null)!==s.tt||u.dest!==s.d||u.hold!==s.h;}
/* 무전이 닿으면: 경로는 지금 자리에서 다시 찾는다(그사이 부대가 움직였을 수 있다) */
function aiOrdApply(u,a){const e=a.tgt!=null?G.units.find(o=>o.id===a.tgt):null;
  u.tgt=e?e.id:null;u.tgtTile=a.tt!=null&&G.map[kr(a.tt)][kc(a.tt)].t==='bldg'?a.tt:null;u.dest=a.d?a.d.slice():null;u.hold=a.h;
  if(a.end){u.path=pathPts(u,a.end[0],a.end[1]);if(a.d)u.dest=[a.end[0],a.end[1]];}
  else if(e&&!canHit(u,e))u.path=pathPts(u,e.x,e.z);
  else u.path=[];}
{const _x=radioExec;radioExec=function(k,a,us){if(k!=='ai')return _x(k,a,us);
   us=us.filter(u=>G.units.includes(u));for(const u of us){const s=a.st&&a.st[u.id];if(s)aiOrdApply(u,s);u._ack=G.time||0;}};}
/* AI 교신: 부대마다 대기열 한 줄(재밍·표시는 부대별), 무전망 시간은 한 번의 교신으로 묶는다 */
function aiRadioSend(n,list){if(!list.length)return;const now=G.time||0;G.rq=G.rq||[];G.rnet=G.rnet||{};const h=hqOf(n);
  const gnd=list.filter(([u])=>!UT[u.type].fly),fly=list.filter(([u])=>UT[u.type].fly);
  for(const [u,s] of fly)G.rq.push({id:(G.rqI=(G.rqI||0)+1),nat:n,us:[u.id],k:'ai',a:{st:{[u.id]:s}},t0:now,at:now+RADIO.fly,n:0,ai:1});
  if(!gnd.length)return;const st=Math.max(now,G.rnet[n]||0);const talk=Math.min(RADIO_AI.maxTalk,RADIO.talk+RADIO_AI.more*(gnd.length-1));G.rnet[n]=st+talk;
  gnd.forEach(([u,s],i)=>{const at=st+Math.min(talk,RADIO.talk+RADIO_AI.more*i)+RADIO.base+Math.min(RADIO.max,RADIO.per*Math.hypot(u.x-h.x,u.z-h.z));
    G.rq.push({id:(G.rqI=(G.rqI||0)+1),nat:n,us:[u.id],k:'ai',a:{st:{[u.id]:s}},t0:now,at,n:0,ai:1});});}
/* 새 명령 상태를 무전용으로 떼어 낸다: 경로는 끝점만 */
function aiOrdPack(u){const p=u.path&&u.path.length?u.path[u.path.length-1]:null;
  return {end:p?[p[0],p[1]]:null,tgt:u.tgt??null,tt:u.tgtTile??null,d:u.dest?u.dest.slice():null,h:u.hold};}
{const _a=aiThink;aiThink=function(n){if(!radioOn())return _a(n);
   const before=new Map();for(const u of G.units)if(u.nat===n)before.set(u,aiOrdState(u));
   const r=_a(n);const send=[];
   for(const [u,s] of before){if(!G.units.includes(u)||!aiOrdChanged(u,s))continue;
     const pk=aiOrdPack(u);
     // 원래 명령으로 되돌린다(새 명령은 무전이 닿은 뒤에)
     u.path=s.p;u.tgt=s.tgt;u.tgtTile=s.tt;u.dest=s.d;u.hold=s.h;
     if(radioPend(u))continue;send.push([u,pk]);}
   aiRadioSend(n,send);G.aiRadioN=(G.aiRadioN||0)+send.length;return r;};}
