/* ===================== 제네바 협약: 의료 보호 =====================
   근거(공개 자료): 제네바 제1협약 19·24·35조(의료 부대·위생 요원·의료 수송은 공격하지 않는다),
   21조(본래 임무를 벗어나 적에게 해로운 행위에 쓰이면 경고 뒤 보호를 잃는다).
   - 보호 대상: 구급차, 구호소(완공된 aid 진지), 출발 지역의 환자집결지.
   - 협약을 지키는 세력의 부대와 AI는 이들을 일부러 겨누지 않고, AI는 그 둘레에 포격·폭격을 부르지 않는다.
     다른 적을 쏘다 폭발에 휘말리는 것은 막지 않는다(우발 피해는 벌점 없음).
   - 일부러 쏘면(직접 사격 명령, 지원 사격을 그 자리에) 위반: 승점 −2, 쏜 세력 보병 사기 −4, 맞은 세력 보병 사기 +3.
     같은 공격자-대상 쌍은 15초에 한 번만 센다. 무전 기록과 관전 화면(자동 연출이 그 장면으로 감)에 나온다.
   - 새 게임 설정 "제네바 협약": 모두 지킴 / 민병대는 무시(기본: 앰버 민병대 AI는 보호 대상도 겨눈다, 벌점은 받는다) / 끄기(규칙 없음).
   - 구호소 둘레 1.2칸에서 그 세력 부대가 사격하면 구호소를 사격 진지로 쓴 것으로 보고 30초 동안 보호를 잃는다. */
const GEN={vp:2,morA:4,morV:3,cd:15,lose:30,loseR:1.2,mil:2,supPad:.6};
function genMode(){return G&&G.geneva||'mil';}
function genOn(){return genMode()!=='off';}
// 이 세력이 협약을 지키는가(민병대 무시 모드에서 민병대는 안 지킨다)
function genKeeps(n){if(!genOn())return false;if(genMode()==='mil'&&n===GEN.mil)return false;return true;}
function genProtUnit(e){return !!(e&&e.type==='amb'&&genOn()&&!((e._genOff||0)>(G.time||0)));}
// (x,z) 둘레 rad 안의 보호 시설·차량(세력 n의 적 것만)
function genSites(n){const out=[];if(!genOn())return out;const t=G.time||0;
  for(const f of G.forts||[])if(f.k==='aid'&&f.prog>=1&&f.nat!==n&&!((f._genOff||0)>t))out.push({x:f.x,z:f.z,nat:f.nat,k:'aid',f});
  for(const m of G.order||[]){if(m===n||!G.nats[m]||!G.nats[m].alive)continue;if(typeof ccpBase==='function'){const b=ccpBase(m);if(b)out.push({x:b.x,z:b.z,nat:m,k:'ccp'});}}
  for(const u of G.units)if(u.nat!==n&&genProtUnit(u))out.push({x:u.x,z:u.z,nat:u.nat,k:'amb',u});
  return out;}
function genNear(n,x,z,rad){return genSites(n).find(s=>hostile(s.nat,n)&&Math.hypot(s.x-x,s.z-z)<=rad)||null;}
const GEN_NAME={amb:'구급차',aid:'구호소',ccp:'환자집결지'};
function genBreach(n,site,by){if(!genOn()||!site||!G.nats[n])return;const t=G.time||0;G.genCd=G.genCd||{};
  const key=n+':'+(site.u?site.u.id:site.k+Math.round(site.x)+','+Math.round(site.z));if((G.genCd[key]||-99)>t)return;G.genCd[key]=t+GEN.cd;
  const N2=G.nats[n];N2.vp=Math.max(0,(N2.vp||0)-GEN.vp);N2.genV=(N2.genV||0)+1;
  for(const u of G.units){if(UT[u.type].cls!=='inf')continue;if(u.nat===n)u.mor=Math.max(0,(u.mor??80)-GEN.morA);else if(u.nat===site.nat)u.mor=Math.min(100,(u.mor??80)+GEN.morV);}
  L(`⚠ ${natName(n)}이(가) 표시된 ${natName(site.nat)} ${GEN_NAME[site.k]}을(를) 공격: 제네바 협약 위반 (승점 −${GEN.vp})`);
  G.genEv=G.genEv||[];G.genEv.push({t,n,v:site.nat,k:site.k,x:site.x,z:site.z,by:by?by.id:null});
  if(typeof genSpec==='function')genSpec(site,by);}
/* 표적 고르기: 지키는 세력은 보호 대상을 건너뛴다. 사람이 직접 찍은 표적(u.tgt)은 그대로 쏜다(위반은 벌점) */
{const _p=rtPick;rtPick=function(u){if(!genKeeps(u.nat))return _p(u);
  const prot=G.units.filter(e=>e.nat!==u.nat&&genProtUnit(e)&&!(u.tgt===e.id&&!isAI(u.nat)));if(!prot.length)return _p(u);
  const all=G.units;G.units=all.filter(e=>!prot.includes(e));try{return _p(u);}finally{G.units=all;}};}
// AI가 보호 대상을 공격 명령 표적으로 고르지 않게
{const _oa=orderAttack;orderAttack=function(u,e){if(isAI(u.nat)&&genKeeps(u.nat)&&genProtUnit(e)&&e.nat!==u.nat)return;return _oa(u,e);};}
/* 직접 사격: 보호 대상을 겨눈 사격은 위반 */
{const _s=rtShoot;rtShoot=function(a,d){if(genOn()&&d&&genProtUnit(d)&&hostile(a.nat,d.nat))genBreach(a.nat,{x:d.x,z:d.z,nat:d.nat,k:'amb',u:d},a);return _s(a,d);};}
/* 지원 사격: AI(지키는 세력)는 보호 시설 둘레를 피하고, 그 자리에 부르면 위반 */
{const _c=canSupport;canSupport=function(n,kind,r,c){if(!_c(n,kind,r,c))return false;
  if(isAI(n)&&genKeeps(n)&&kind!=='smoke'&&kind!=='heli'&&SUP[kind]&&!SUP[kind].any&&genNear(n,c+.5,r+.5,(SUP[kind].rad||1)+GEN.supPad))return false;return true;};}
{const _su=support;support=function(n,kind,r,c){const ok=_su(n,kind,r,c);
  if(ok&&genOn()&&kind!=='smoke'&&kind!=='heli'&&SUP[kind]&&!SUP[kind].any){const s=genNear(n,c+.5,r+.5,(SUP[kind].rad||1)+.2);if(s)genBreach(n,s,null);}return ok;};}
/* 보호를 잃는 경우: 구호소 곁에서 그 세력 부대가 사격(사격 진지로 씀) */
function genTick(){if(!genOn())return;const t=G.time||0;
  for(const f of G.forts||[]){if(f.k!=='aid'||f.prog<1)continue;if((f._genOff||0)>t)continue;
    const u=G.units.find(o=>o.nat===f.nat&&UT[o.type].rng&&UT[o.type].rng[1]&&t-(o.firedT??-99)<1&&Math.hypot(o.x-f.x,o.z-f.z)<GEN.loseR);
    if(u){f._genOff=t+GEN.lose;if(!isAI(f.nat)||!G.fog||f.nat===G.viewer)L(`${natName(f.nat)} 구호소 곁에서 사격: 30초 동안 협약 보호를 잃음`);}}}
{const _t=rtTick;rtTick=function(dt){_t(dt);if(!G||!G.units||G.over)return;try{genTick();}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}};}
/* 새 게임 설정 */
{const _n=newGame;newGame=function(cfg){const g=_n(cfg);let m=cfg&&cfg.geneva;
  if(!m){try{const el=typeof document!=='undefined'&&document.getElementById('opt-geneva');m=el?el.value:null;}catch(e){m=null;}}
  G.geneva=['all','mil','off'].includes(m)?m:'mil';G.genEv=[];G.genCd={};return g;};}
