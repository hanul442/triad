/* ===================== LOGI: 보급 트럭을 덜 잃게 =====================
   AI 관전 24판(main b56393a): 보급 트럭이 판마다 10대 나와 6.2대(62%)가 부서졌다. 12판을 더 들여다보니
   38대 중 32대가 탄약을 나르러 가는 길에, 25대는 적이 4칸 안에 있을 때 죽었다(공격헬기·대전차·박격포).
   예전 위험 판단(hotAt)은 '지금 보이는 지상 적'만 봐서, 안 보이지만 기억하는 적과 헬기는 몰랐다.
   - 위험: 보이는 지상 적(3.2칸) + 세력이 8초 안에 본 적(기억, 3.2칸) + 적 공격헬기·FPV(4.5칸).
   - 트럭은 받을 부대 바로 곁이 아니라 그 부대에서 보급소 쪽으로 1.1칸 뒤에 선다(나눠 주는 거리 1.6칸 안).
   - 가는 길이나 서 있는 자리가 위험하면 보급소로 물러나고, 그 부대는 30초 동안 건너뛴다(기존 규칙과 같음). */
const LOGI={r:3.2,air:4.5,mem:8,back:1.1};

function logiDanger(n,x,z){const t=G.time||0;
  if(hotAt(n,x,z,LOGI.r))return true;
  if(typeof memOf==='function'){const M=memOf(n);for(const id in M){const p=M[id];if(t-p.t>LOGI.mem)continue;if(Math.hypot(p.x-x,p.z-z)<LOGI.r)return true;}}
  for(const e of G.units){if(e.nat===n||!(e.type==='gunship'||e.type==='fpv'))continue;if(G.fog&&!seen(e,n))continue;if(Math.hypot(e.x-x,e.z-z)<LOGI.air)return true;}
  return false;}
/* 받을 부대 뒤 (보급소 쪽) 만남 지점 */
function logiMeet(u,e){const d=depotOf(u.nat);const dx=d.x-e.x,dz=d.z-e.z,L=Math.hypot(dx,dz)||1;const k=Math.min(LOGI.back,L);
  const x=e.x+dx/L*k,z=e.z+dz/L*k;return walkable(u,x,z)?[x,z]:[e.x,e.z];}
if(typeof supSend==='function'){const _ss=supSend;supSend=function(u,e){if(!selfRun(u))return _ss(u,e);
  if(logiDanger(u.nat,e.x,e.z)){(u.nog=u.nog||{})[e.id]=(G.time||0)+20;u._auT=0;return;}
  const r=_ss(u,e);if(u.lj&&u.lj.k==='serve'){const m=logiMeet(u,e);const P=pathPts(u,m[0],m[1]);if(P.length)u.path=P;}return r;};}
if(typeof supTick==='function'){const _st=supTick;supTick=function(u,dt){
  // 기존 판단은 받을 부대 바로 곁까지 다시 길을 찾는다: 만남 지점까지만 가게 고친다
  const pre=u.lj&&u.lj.k==='serve'?u.lj.id:null;const pp=u.path;
  _st(u,dt);if(!G.units.includes(u)||!selfRun(u))return;const t=G.time||0;
  if(pre!=null&&u.lj&&u.lj.k==='serve'&&u.lj.id===pre&&u.path!==pp&&u.path&&u.path.length){const e=uById(pre);if(e){const m=logiMeet(u,e);const P=pathPts(u,m[0],m[1]);if(P.length)u.path=P;}}
  if(atDepot(u)||(u.lj&&u.lj.k==='home'&&u.path&&u.path.length))return;
  if((u._lgT||0)>t)return;u._lgT=t+.5;
  let bad=logiDanger(u.nat,u.x,u.z);
  if(!bad&&u.lj&&u.lj.k==='serve'){const e=uById(u.lj.id);if(e&&logiDanger(u.nat,e.x,e.z))bad=true;}
  if(bad){if(u.lj&&u.lj.id!=null)(u.nog=u.nog||{})[u.lj.id]=t+POL.truckFlee;supHome(u);u._idleT=null;if(typeof tacN==='function')tacN('truckFlee');}};}
