/* ===================== DOCTRINE 화면·무전 (05zd-doctrine 규칙의 보이는 쪽) =====================
   지휘 승계·강화 보고(ACE)·총열 교체·매복 돌격을 무전과 전투 기록으로 알린다. 규칙에는 손대지 않는다. */
if(typeof VOX_P==='object')Object.assign(VOX_P,{succ:3,ace:2,barrel:1,amb:3});
if(typeof voxLine==='function'){const _vl=voxLine;voxLine=function(k,o){
  if(k!=='succ'&&k!=='ace'&&k!=='barrel'&&k!=='amb')return _vl(k,o);
  const u=o.u,n=o.nat??(u?u.nat:0),cs=voxCs(u),hq=voxHq(n),csK=voxCsKo(u),hqK=voxHqKo(n);const R=a=>a[Math.floor(Math.random()*a.length)];let L=null;
  if(k==='succ')L={who:cs,txt:R([`${hq}, ${cs}. Squad leader is down. I have command.`,`${cs}, my squad leader is hit! Taking charge, continuing mission.`]),
    ko:`${hqK}, ${csK}. 분대장이 쓰러졌다. 내가 지휘한다.`};
  else if(k==='ace'){const r=o.rep;const col={green:'green',amber:'amber',red:'red'};const colK={green:'충분',amber:'보통',red:'부족'};
    L={who:cs,txt:`${hq}, ${cs}. Objective secure, consolidating. ACE report: ammo ${col[r.ammo]}, ${r.cas?`${r.cas} casualties`:'no casualties'}, equipment ${col[r.eq]}. Over.`,
      ko:`${hqK}, ${csK}. 목표 확보, 강화 중. 탄약 ${colK[r.ammo]}, 사상자 ${r.cas}명, 장비 ${r.eq==='green'?'이상 없음':'일부 손상'}. 이상.`};}
  else if(k==='barrel')L={who:cs,txt:R([`${cs}, changing barrels!`,`Barrel change! ${cs} is down for a few seconds!`]),ko:`${csK}, 총열 교체! 잠깐 사격 중지!`};
  else if(k==='amb')L={who:cs,txt:o.near?R([`Ambush near! ${cs}, assault through, assault through!`,`Contact close! Frags out, push through!`]):R([`Ambush! ${cs} taking fire, get to cover!`,`${hq}, ${cs}, we're ambushed! Returning fire!`]),
    ko:o.near?`가까운 매복! ${csK}, 수류탄 던지고 돌파한다!`:`매복이다! ${csK}, 엄폐하고 응사한다!`};
  if(!L)return null;return {nat:n,...L,whoKo:o.u?csK:hqK};};}
function docSay(k,o){if(typeof voxEv!=='function'||typeof voxGap!=='function')return;const u=o.u;if(!u)return;
  try{if(!voxHears(u.nat))return;if(isAI(u.nat)&&!voxNear(u)&&k!=='ace')return;if(!voxGap(k+u.nat,k==='barrel'?20:8))return;voxEv(k,o);}catch(e){}}
function docMine(n){return typeof G==='object'&&G&&n===G.viewer&&!isAI(n);}
/* 05zd가 부르는 화면 쪽 갈고리 */
function docSuccFx(u,li){docSay('succ',{u});if(docMine(u.nat)&&typeof L==='function')L(`${UT[u.type].n}: 분대장 쓰러짐, ${li+1}번 병사가 지휘를 넘겨받음`);}
function docAceFx(rep,u){docSay('ace',{u,rep});if(docMine(rep.n)&&typeof L==='function'){const a={green:'충분',amber:'보통',red:'부족'}[rep.ammo];
  L(`${rep.obj.name} 강화·재편성: 탄약 나눔(${a}), 사상자 ${rep.cas}명, 15초 경계`);}}
{const _t=rtTick;rtTick=function(dt){_t(dt);if(!G||!G.units||G.over)return;const t=G.time||0;
  for(const u of G.units){if(u._swap>t&&!u._vSw){u._vSw=1;docSay('barrel',{u});}else if(!(u._swap>t))u._vSw=0;
    if(u._ambT===t&&u._ambR&&u._ambR!=='stay')docSay('amb',{u,near:u._ambR==='assault'||u._ambR==='gren'});}};}
