/* ===================== 무전을 실제처럼, 여러 말투로 (07z-vox 위에 얹는다) =====================
   - 호출부호: 실제 부대처럼 소대-분대 번호. 1번 소총 분대는 "Rifle One-One"(한국어 "소총 1-1"), 4번은 "Two-One". 지휘관은 "Eagle Six".
   - 무전 절차어: Over(응답 바람)·Out(끝)·Roger·Wilco·Say again·Break, 한국어는 "여기는 ○○", "이상", "알았음", "끝", "다시 보내라".
   - 사건마다 말투가 여러 개다(같은 말이 연달아 나오지 않는다). 영어와 한국어 문장은 늘 짝으로 고른다.
   - 실제 보고 양식:
     · 적 차량·항공 발견은 SPOT(SALUTE 줄임) 보고: 수·종류, 하는 일(이동 방향·사격·정지), 좌표, 시각.
     · 중상자가 나오면 몇 초 뒤 9-line 환자 후송 요청(1번 좌표, 3번 긴급 환자 수, 6번 적 상황, 7번 표시)과 본부 답(구급차 출동 / 환자 집결점으로).
     · 포격은 사격 요청(효력사, 좌표, 표적 종류, 아군이 가까우면 '근접 위험') → 포대 복창 → 발사(Shot) → 탄착(Splash) → 사격 임무 종료.
     · 가끔 본부가 상황 보고(SITREP)를 부르고 한 부대가 위치·전투력·탄약·접적 여부를 보고한다.
   - 무전 언어: 영어 또는 한국어로 들을 수 있다(소리 창 '무전 언어'). 한국어는 군대식으로 숫자를 읽는다(1-1 → 하나 다시 하나, 좌표 0417 → 공 넷 하나 칠). */
VOX.lang='en';
const VOX_LK='triad-vox-lang';
Object.assign(VOX_P,{medevac:3,medack:2,sitq:1,sitrep:1,fdc:1,shot:1,eom:1});
const VOX_NUM=['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Niner'];
const VOX_FDC=['Steel Rain','Red Leg','Hammer','Anvil'],VOX_FDC_KO=['강철비','천둥','망치','모루'];
/* 소대-분대 번호: 셋씩 한 소대 */
const voxPS=n=>[Math.floor((n-1)/3)+1,(n-1)%3+1];
const voxNumEn=x=>String(x).split('').map(d=>VOX_NUM[+d]).join(' ');
voxCsKo=function(u){if(!u)return '';if(u._cs==null){const n=G._csN=G._csN||{};const k=u.nat+'|'+u.type;u._cs=n[k]=(n[k]||0)+1;}
  const [p,s]=voxPS(u._cs);const base=(VOX_CS[u.type]||(UT[u.type].n+' #호')).replace(/\s*#.*$/,'');return `${base} ${p}-${s}`;};
voxCs=function(u){if(!u)return '';voxCsKo(u);const [p,s]=voxPS(u._cs);return `${(VOX_CS_EN[u.type]||'Unit #').replace(/\s*#.*$/,'')} ${voxNumEn(p)}-${voxNumEn(s)}`;};
voxHq=n=>(VOX_HQ_EN[n]||'Command')+' Six';
/* 좌표: 칸 번호 네 자리(가로 두 자리, 세로 두 자리) */
const voxGrid=(x,z)=>String(Math.max(0,Math.floor(x))).padStart(2,'0')+String(Math.max(0,Math.floor(z))).padStart(2,'0');
const voxGridEn=(x,z)=>voxGrid(x,z).split('').map(d=>VOX_NUM[+d].toLowerCase()).join(' ');
const VOX_SAY_KO=['공','하나','둘','삼','넷','오','육','칠','팔','아홉'];
/* 한국어 목소리로 읽을 때: 호출부호·좌표 숫자를 군대식으로 */
function voxSayKo(s){return String(s).replace(/(\d)-(\d)/g,(m,a,b)=>`${VOX_SAY_KO[a]} 다시 ${VOX_SAY_KO[b]}`)
  .replace(/좌표 (\d{4})/g,(m,g)=>'좌표 '+g.split('').map(d=>VOX_SAY_KO[d]).join(' '));}
const voxColor=a=>a==null?'green':a>.6?'green':a>.3?'amber':'red';
const VOX_COLK={green:'충분',amber:'보통',red:'부족'};
/* 같은 사건에서 바로 전 말투는 피해서 하나 고른다 */
const VOX_LAST={};
function voxPick(k,list){if(!list.length)return null;let i=Math.floor(Math.random()*list.length);if(list.length>1&&i===VOX_LAST[k])i=(i+1)%list.length;VOX_LAST[k]=i;return list[i];}
/* 적이 하는 일: 이동(어느 쪽으로)·사격·정지 */
function voxAct(e){const t=G.time||0;if(e.path&&e.path.length){const p=e.path[e.path.length-1];const px=Array.isArray(p)?p[0]:p.x,pz=Array.isArray(p)?p[1]:p.z;
    if(px!=null&&Math.hypot(px-e.x,pz-e.z)>.8){const d=voxDir(px-e.x,pz-e.z);return [`moving ${d}`,`${voxDirKo(px-e.x,pz-e.z)}쪽으로 이동 중`];}}
  if(t-(e.firedT??-99)<4)return ['firing','사격 중'];return ['stationary','정지 상태'];}
/* 포격 표적이 무엇인가, 아군이 가까운가 */
function voxTgt(n,x,z){let veh=0,inf=0,own=0;for(const u of G.units){const d=Math.hypot(u.x-x,u.z-z);if(UT[u.type].fly)continue;
    if(u.nat===n){if(d<2.2)own++;continue;}if(d>2.5||!seen(u,n))continue;if(UT[u.type].cls==='veh')veh++;else inf++;}
  const c=G.map&&G.map[Math.floor(z)]&&G.map[Math.floor(z)][Math.floor(x)];const bl=c&&c.t==='bldg';
  const t=veh?['Enemy armor in the open','적 기갑']:bl?['Enemy in a building','건물 안의 적']:inf?['Troops in the open','개활지의 적 보병']:['Suspected enemy position','적 추정 진지'];
  return {t,dc:own>0};}
const voxAmb=n=>G.units.find(u=>u.nat===n&&u.type==='amb');

/* 사건마다 [영어, 한국어] 말투 여러 개 */
function voxVariants(k,o,c){const {cs,hq,csK,hqK}=c;
  switch(k){
    case 'order':{const who=o.more?`${cs} and ${o.more} more`:cs,whoK=o.more?`${csK} 외 ${o.more}개 부대`:csK;let W;
      if(o.kind==='atk'){const tn=o.tgt?voxTnEn(o.tgt.type):'target',tk=o.tgt?voxTn(o.tgt.type):'표적';
        W=[[`Engage that enemy ${tn}`,`적 ${tk} 제압하라`],[`Destroy the enemy ${tn}`,`적 ${tk} 격파하라`],[`Put fire on the enemy ${tn}`,`적 ${tk}에 사격 집중하라`]];}
      else if(o.kind==='bldg')W=[[`Put fire on the building at ${c.place}`,`${c.placeK} 건물에 사격하라`],[`Suppress the building at ${c.place}`,`${c.placeK} 건물 제압하라`]];
      else if(o.kind==='stop'||o.kind==='hold')W=[['Hold your position','현 위치 고수하라'],['Halt. Hold current location','정지, 현 위치에서 대기하라'],['Stay put and maintain security','그 자리에서 경계하라']];
      else if(o.kind==='floor')W=[['Change floors','층을 옮겨라']];
      else W=[[`Move to ${c.place}`,`${c.placeK} 방향으로 이동하라`],[`Displace to ${c.place}. Report when set`,`${c.placeK}까지 이동, 도착하면 보고하라`],[`Proceed to ${c.place}`,`${c.placeK}까지 전진하라`]];
      const w=voxPick('ow'+o.kind,W);
      return [[`${who}, this is ${hq}. ${w[0]}. Over.`,`${whoK}, 여기는 ${hqK}. ${w[1]}. 이상.`],[`${who}, ${hq}. ${w[0]}, over.`,`${whoK}, ${hqK}. ${w[1]}, 이상.`],
        [`${who}, ${hq}. ${w[0]}. How copy, over?`,`${whoK} 나와라, 여기는 ${hqK}. ${w[1]}. 감도 있나, 이상.`]];}
    case 'ack':{const A=o.kind==='atk'?[['Roger, engaging.','알았음, 사격 개시.'],['Wilco, engaging now.','실시하겠음, 교전 개시.'],['Solid copy, target identified. Firing.','표적 확인, 사격한다.']]
        :o.kind==='move'?[['Wilco, moving.','알았음, 이동 개시.'],['Roger, Oscar Mike.','알았음, 지금 출발.'],['Copy, on the move. Out.','수신 양호, 이동한다. 끝.']]
        :[['Roger, out.','알았음, 끝.'],['Wilco, holding. Out.','알았음, 현 위치 고수. 끝.'],['Solid copy. Out.','수신 양호. 끝.']];
      return A.map(a=>[[`${hq}, ${cs}. ${a[0]}`,`${hqK}, ${csK}. ${a[1]}`],[`${cs}, ${a[0].charAt(0).toLowerCase()+a[0].slice(1)}`,`${csK}, ${a[1]}`]]).flat();}
    case 'jam':return [[`${cs}, ${cs}, this is ${hq}. Say again, you are broken and unreadable. Over.`,`${csK}, ${csK}, 여기는 ${hqK}. 감도 불량, 다시 보내라. 이상.`],
      [`${cs}, ${hq}. Radio check, how copy? … Nothing but static.`,`${csK}, ${hqK}. 무전 점검, 감도 있나? … 잡음뿐이다.`],
      [`${cs}, ${hq}. Say again all after "move". Over.`,`${csK}, ${hqK}. "이동" 이후 전부 다시 보내라. 이상.`]];
    case 'run':return [[`No comms with ${cs}. Sending a runner.`,`${csK} 교신 두절. 전령 보낸다.`],[`${cs} is off the net. Get a runner out to them.`,`${csK} 무전망 이탈. 전령 보내라.`]];
    case 'contact':{const e=o.e,u=o.u,d=Math.hypot(e.x-u.x,e.z-u.z),dir=voxDir(e.x-u.x,e.z-u.z),dk=voxDirKo(e.x-u.x,e.z-u.z),m=voxM(d),tn=voxTnEn(e.type),tk=voxTn(e.type);
      return [[`Contact! Contact! ${hq}, ${cs}. Enemy ${tn}, ${dir}, ${m} meters. Engaging, over.`,`접적! 접적! ${hqK}, 여기는 ${csK}. 적 ${tk}, ${dk}쪽 ${m}미터. 교전 중. 이상.`],
        [`${cs}, contact ${dir}! Enemy ${tn}, ${m} meters!`,`${csK}, ${dk}쪽 접적! 적 ${tk}, ${m}미터!`],
        [`Break, break. ${hq}, ${cs}. Troops in contact, enemy ${tn} ${m} meters ${dir}. Over.`,`긴급, 긴급. ${hqK}, ${csK}. 교전 발생, 적 ${tk} ${dk}쪽 ${m}미터. 이상.`],
        [`${hq}, ${cs}. Taking fire from the ${dir}, ${tn}, ${m} meters. Returning fire.`,`${hqK}, ${csK}. ${dk}쪽 ${m}미터에서 적 ${tk} 사격. 응사 중.`]];}
    case 'cas':{const w=o.hw||0,d=o.kia||0;const num=x=>['zero','one','two','three','four','five','six'][x]||String(x);
      const parts=[w?`${num(w)} wounded`:'',d?`${num(d)} K-I-A`:''].filter(Boolean).join(', ');const pk=[w?`부상 ${w}명`:'',d?`전사 ${d}명`:''].filter(Boolean).join(', ');
      if(w&&!d)return [[`Medic! Medic! ${cs}, ${parts}, need a medic up here!`,`위생병! 위생병! ${csK}, ${pk}! 위생병 올라와라!`],
        [`${hq}, ${cs}. ${voxCap(parts)}. Treating at our position, over.`,`${hqK}, ${csK}. ${pk}. 현 위치에서 응급 처치 중. 이상.`],
        [`${hq}, ${cs}. Casualty report: ${parts}. Request casualty evac.`,`${hqK}, ${csK}. 사상자 보고, ${pk}. 후송 요청.`]];
      return [[`${hq}, ${cs}. ${voxCap(parts)}. We're still in the fight.`,`${hqK}, ${csK}. ${pk}. 계속 싸운다.`],
        [`${hq}, ${cs}. Casualty report: ${parts}. Continuing mission, over.`,`${hqK}, ${csK}. 사상자 보고, ${pk}. 임무 계속. 이상.`],
        [`${hq}, ${cs}. Be advised, ${parts}. Still combat effective.`,`${hqK}, ${csK}. ${pk}. 전투 가능.`]];}
    case 'medevac':{const u=o.u,g=voxGrid(u.x,u.z),ge=voxGridEn(u.x,u.z),w=o.hw||1,num=['zero','one','two','three','four','five','six'][w]||String(w);const hot=!!voxFoe(u);
      const l6=hot?['Line six, enemy troops in area.','6번, 적 활동 중.']:['Line six, no enemy in area.','6번, 적 없음.'];
      return [[`${hq}, ${cs}. Nine-line follows. Line one, grid ${ge}. Line three, ${num} urgent. ${l6[0]} Line seven, smoke. Over.`,`${hqK}, 여기는 ${csK}. 환자 후송 요청. 1번, 좌표 ${g}. 3번, 긴급 환자 ${w}명. ${l6[1]} 7번, 연막 표시. 이상.`],
        [`${hq}, ${cs}. Request urgent MEDEVAC. Line one, grid ${ge}. Line three, ${num} urgent. Line seven, marked by smoke. Over.`,`${hqK}, ${csK}. 긴급 후송 요청. 1번, 좌표 ${g}. 3번, 긴급 ${w}명. 7번, 연막으로 표시. 이상.`]];}
    case 'medack':{const a=voxAmb(o.nat??o.u.nat);if(a){const ac=voxCs(a),ak=voxCsKo(a);
        return [[`${cs}, ${hq}. Roger your nine-line. ${ac} is en route. Out.`,`${csK}, ${hqK}. 후송 요청 알았음. ${ak} 출동. 끝.`],[`${cs}, ${hq}. Copy all. ${ac} moving to your pos, pop smoke on arrival. Out.`,`${csK}, ${hqK}. 전부 알았음. ${ak} 그쪽으로 간다. 도착하면 연막 터뜨려라. 끝.`]];}
      return [[`${cs}, ${hq}. No evac assets available. Move casualties to the CCP. Out.`,`${csK}, ${hqK}. 가용 후송 수단 없음. 환자 집결점으로 옮겨라. 끝.`],[`${cs}, ${hq}. Copy. No ambulance on the net. Hold casualties at your pos. Out.`,`${csK}, ${hqK}. 알았음. 구급차 없음. 현 위치에서 환자 지켜라. 끝.`]];}
    case 'pin':{const e=o.e,u=o.u;const dir=e?voxDir(e.x-u.x,e.z-u.z):null,dk=e?voxDirKo(e.x-u.x,e.z-u.z):null;
      return [[`${hq}, ${cs}. We're pinned down${dir?`, fire from the ${dir}`:''}! Can't move!`,`${hqK}, ${csK}. 적 사격에 묶였다${dk?`, ${dk}쪽`:''}! 움직일 수 없다!`],
        [`${cs} taking heavy fire${dir?` from the ${dir}`:''}! We're suppressed!`,`${csK}, ${dk?dk+'쪽에서 ':''}집중 사격 받는 중! 제압당했다!`],
        [`${hq}, ${cs}. Suppressed, request smoke on our position, over!`,`${hqK}, ${csK}. 제압됨, 우리 위치에 연막 요청! 이상!`]];}
    case 'fall':return [[`${cs} falling back! We can't hold here!`,`${csK} 후퇴한다! 여기선 못 버틴다!`],[`${hq}, ${cs}. Breaking contact, falling back!`,`${hqK}, ${csK}. 접촉 이탈, 후퇴한다!`],[`${cs}, we're pulling back! Covering fire!`,`${csK} 철수한다! 엄호 사격!`]];
    case 'rally':return [[`${hq}, ${cs}. We've regrouped, moving back up.`,`${hqK}, ${csK}. 재정비 완료, 다시 전진한다.`],[`${hq}, ${cs}. Reorganized and ready. Over.`,`${hqK}, ${csK}. 재편성 완료, 준비됐다. 이상.`]];
    case 'spot':{const e=o.e,u=o.u,dd=Math.hypot(e.x-u.x,e.z-u.z);let cnt=0;for(const x of G.units)if(x.nat===e.nat&&x.type===e.type&&Math.hypot(x.x-e.x,x.z-e.z)<4&&seen(x,u.nat))cnt++;cnt=Math.max(1,cnt);
      const what=UT[e.type].fly?(e.type==='gunship'?'helo':'drone'):UT[e.type].cls==='veh'?(e.type==='tank'?'tank':voxTnEn(e.type)):voxTnEn(e.type);
      const nw=['one','one','two','three','four','five','six'][cnt]||String(cnt);const whatS=cnt>1?`${nw} enemy ${what}s`:`one enemy ${what}`;const whatK=`적 ${voxTn(e.type)} ${cnt}대`;
      const [ac,ak]=voxAct(e);const ge=voxGridEn(e.x,e.z),g=voxGrid(e.x,e.z);
      if(UT[e.type].fly)return [[`Air! ${hq}, ${cs}. Enemy ${what} ${voxDir(e.x-u.x,e.z-u.z)}, ${voxM(dd)} meters!`,`대공 경계! ${hqK}, ${csK}. 적 ${voxTn(e.type)}, ${voxDirKo(e.x-u.x,e.z-u.z)}쪽 ${voxM(dd)}미터!`],
        [`${hq}, ${cs}. Be advised, enemy ${what} overhead, ${ac}. Over.`,`${hqK}, ${csK}. 적 ${voxTn(e.type)} 상공, ${ak}. 이상.`]];
      return [[`${hq}, ${cs}. Spot report: ${whatS}, ${ac}, grid ${ge}, time now. Over.`,`${hqK}, 여기는 ${csK}. 적 발견 보고: ${whatK}, ${ak}, 좌표 ${g}, 현재 시각. 이상.`],
        [`${hq}, ${cs}. Be advised, ${whatS}, ${voxDir(e.x-u.x,e.z-u.z)}, ${voxM(dd)} meters, ${ac}.`,`${hqK}, ${csK}. ${whatK}, ${voxDirKo(e.x-u.x,e.z-u.z)}쪽 ${voxM(dd)}미터, ${ak}.`],
        [`Heads up! ${voxCap(whatS)}, grid ${ge}, ${ac}!`,`주의! ${whatK}, 좌표 ${g}, ${ak}!`]];}
    case 'air':{const a={air:['Fast movers','전투기'],gunship:['Gunship','공격헬기'],heli:['Helos','헬기'],cruise:['Missile','순항 미사일'],tbm:['Ballistic missile','탄도 미사일']}[o.kind]||['Air support','항공 지원'];
      return [[`All stations, ${hq}. ${a[0]} inbound on ${c.place}. Heads down.`,`전 부대, 여기는 ${hqK}. ${a[1]} 진입, ${c.placeK}. 몸 낮춰라.`],
        [`All units, ${hq}. ${a[0]} inbound, target ${c.place}. Check fire, keep clear.`,`전 부대, ${hqK}. ${a[1]} 접근, 목표 ${c.placeK}. 근처에서 물러나라.`]];}
    case 'sup':{const T=voxTgt(o.nat,o.x,o.z),f=VOX_FDC[o.nat%4],fk=VOX_FDC_KO[o.nat%4];
      if(o.kind==='smoke')return [[`${f}, this is ${hq}. Fire mission, smoke, ${c.place}. Screen. Over.`,`${fk}, 여기는 ${hqK}. 사격 요청, 연막, ${c.placeK}. 차장. 이상.`],[`${f}, ${hq}. Request smoke at ${c.place} to screen our movement. Over.`,`${fk}, ${hqK}. ${c.placeK}에 연막 요청, 기동 엄호. 이상.`]];
      const dc=T.dc?[' Danger close!',' 근접 위험!']:['',''];
      return [[`${f}, this is ${hq}. Fire for effect. ${voxCap(c.place)}. ${T.t[0]}.${dc[0]} Over.`,`${fk}, 여기는 ${hqK}. 효력사. ${c.placeK}. ${T.t[1]}.${dc[1]} 이상.`],
        [`${f}, ${hq}. Fire mission. Grid ${voxGridEn(o.x,o.z)}. ${T.t[0]}. Fire for effect.${dc[0]} Over.`,`${fk}, ${hqK}. 사격 요청. 좌표 ${voxGrid(o.x,o.z)}. ${T.t[1]}. 효력사.${dc[1]} 이상.`]];}
    case 'fdc':{const T=voxTgt(o.nat,o.x,o.z),f=VOX_FDC[o.nat%4],fk=VOX_FDC_KO[o.nat%4];
      return [[`${hq}, ${f}. Fire for effect, grid ${voxGridEn(o.x,o.z)}${T.dc?', danger close':''}. Out.`,`${hqK}, ${fk}. 효력사, 좌표 ${voxGrid(o.x,o.z)}${T.dc?', 근접 위험':''}. 알았음.`],
        [`${hq}, ${f}. Roger, fire for effect, out.`,`${hqK}, ${fk}. 알았음, 효력사. 끝.`]];}
    case 'shot':return [['Shot, over.','발사, 이상.'],['Shot, rounds on the way. Over.','발사, 포탄 날아간다. 이상.']];
    case 'splash':return [['Splash, over.','탄착 오 초 전, 이상.'],['Splash. Out.','탄착 임박. 끝.']];
    case 'eom':{const f=VOX_FDC[o.nat%4],fk=VOX_FDC_KO[o.nat%4];return [[`${f}, ${hq}. End of mission, target suppressed. Out.`,`${fk}, ${hqK}. 사격 임무 종료, 표적 제압됨. 끝.`],[`${f}, ${hq}. Good rounds. End of mission. Out.`,`${fk}, ${hqK}. 명중 양호. 사격 임무 종료. 끝.`]];}
    case 'rounds':return [[`${cs}, shot, over.`,`${csK}, 발사, 이상.`],[`${cs}, firing for effect.`,`${csK}, 효력사 중.`],[`${cs}, rounds complete.`,`${csK}, 사격 완료.`]];
    case 'breach':return [[`${cs}, breaching now!`,`${csK}, 진입한다!`],[`${cs}, stacked on the door. Frag out, going in!`,`${csK}, 출입구 대기. 수류탄 투척, 진입!`],[`${cs}, entering the building!`,`${csK}, 건물 진입!`]];
    case 'clear':return [[`${hq}, ${cs}. Building clear.`,`${hqK}, ${csK}. 건물 소탕 완료.`],[`${hq}, ${cs}. Structure secure, no more hostiles.`,`${hqK}, ${csK}. 건물 확보, 남은 적 없음.`],[`${hq}, ${cs}. All rooms clear, over.`,`${hqK}, ${csK}. 모든 방 확인 완료. 이상.`]];
    case 'ammo':return [[`${hq}, ${cs}. Ammo amber, request resupply. Over.`,`${hqK}, ${csK}. 탄약 부족, 보급 요청. 이상.`],[`${cs} is black on ammo! Send the truck!`,`${csK} 탄약 바닥났다! 보급차 보내라!`],[`${hq}, ${cs}. Running low on ammo, need resupply.`,`${hqK}, ${csK}. 탄약이 떨어져 간다. 보급 바란다.`]];
    case 'inpos':return [[`${hq}, ${cs}. Set.`,`${hqK}, ${csK}. 위치 도착.`],[`${hq}, ${cs}. In position, over.`,`${hqK}, ${csK}. 진지 도착. 이상.`],[`${cs}, at the checkpoint. Holding.`,`${csK}, 통제점 도착. 대기 중.`]];
    case 'kill':{const e=o.e,tn=voxTnEn(e.type),tk=voxTn(e.type);
      if(UT[e.type].fly)return [[`Splash one ${tn}!`,`적 ${tk} 격추!`],[`${hq}, ${cs}. Enemy ${tn} down!`,`${hqK}, ${csK}. 적 ${tk} 격추!`]];
      if(UT[e.type].cls==='veh')return [[`${hq}, ${cs}. Enemy ${tn} destroyed!`,`${hqK}, ${csK}. 적 ${tk} 격파!`],[`Good hit, good hit! ${voxCap(tn)} is burning!`,`명중, 명중! 적 ${tk} 불탄다!`],[`${hq}, ${cs}. Target destroyed. Scanning for more.`,`${hqK}, ${csK}. 표적 파괴. 다음 표적 찾는 중.`]];
      return [[`${hq}, ${cs}. Enemy ${tn} down.`,`${hqK}, ${csK}. 적 ${tk} 제압.`],[`${cs}, target down.`,`${csK}, 표적 쓰러뜨림.`],[`${hq}, ${cs}. Good effect on target.`,`${hqK}, ${csK}. 표적 효과 양호.`]];}
    case 'gone':return [[`${cs}, ${hq}, radio check, over. … ${cs}, come in.`,`${csK}, 여기는 ${hqK}. 감도 있나, 이상. … ${csK}, 응답하라.`],[`${cs}, ${hq}. How copy, over? … Nothing.`,`${csK}, ${hqK}. 감도 있나? … 응답 없음.`]];
    case 'cap':{const ob=voxObj(o.obj),obk=o.objKo??o.obj;return [[`${hq}, ${cs}. ${voxCap(ob)} is secure!`,`${hqK}, ${csK}. ${obk} 확보!`],[`${hq}, ${cs}. We're on ${ob}. Consolidating, over.`,`${hqK}, ${csK}. ${obk} 점령, 진지 강화 중. 이상.`],[`${hq}, ${cs}. Objective seized, setting security.`,`${hqK}, ${csK}. 목표 탈취, 경계 실시.`]];}
    case 'lost':{const ob=voxObj(o.obj),obk=o.objKo??o.obj;return [[`All stations, ${hq}. We've lost ${ob}. Take it back.`,`전 부대, 여기는 ${hqK}. ${obk} 빼앗겼다. 다시 찾아라.`],[`All units, ${hq}. ${voxCap(ob)} has fallen. Prepare to counter-attack.`,`전 부대, ${hqK}. ${obk} 상실. 역습 준비하라.`]];}
    case 'arr':return [[`${hq}, ${cs}. At the rally point, awaiting orders.`,`${hqK}, 여기는 ${csK}. 집결지 도착, 명령 대기 중.`],[`${hq}, ${cs}. Checking in on the net, ready.`,`${hqK}, ${csK}. 무전망 가입, 준비 완료.`]];
    case 'sitq':return [[`All stations, ${hq}. Send SITREP, over.`,`전 부대, 여기는 ${hqK}. 상황 보고하라. 이상.`],[`All stations, this is ${hq}. SITREP, over.`,`전 부대, ${hqK}. 현 상황 보고 바람. 이상.`]];
    case 'sitrep':{const u=o.u,M=UT[u.type].hpMax||10,pc=Math.max(10,Math.round(u.hp/M*10)*10);const am=typeof amOf==='function'&&typeof amMax==='function'&&amMax(u)?amOf(u)/amMax(u):null;const col=voxColor(am);
      const ct=(G.time||0)-(u.firedT??-99)<10;const str=pc>=90?['full strength','전투력 온전']:[`${pc} percent strength`,`전투력 ${pc}%`];
      return [[`${hq}, ${cs}. SITREP: at ${c.place}, ${str[0]}, ammo ${col}, ${ct?'in contact':'no contact'}. Over.`,`${hqK}, ${csK}. 상황 보고: 현 위치 ${c.placeK}, ${str[1]}, 탄약 ${VOX_COLK[col]}, ${ct?'교전 중':'적 접촉 없음'}. 이상.`],
        [`${hq}, ${cs}. Located ${c.place}. ${voxCap(str[0])}. Ammo ${col}. ${ct?'Engaging enemy.':'Nothing significant to report.'} Over.`,`${hqK}, ${csK}. 위치 ${c.placeK}. ${str[1]}. 탄약 ${VOX_COLK[col]}. ${ct?'적과 교전 중.':'특이 사항 없음.'} 이상.`]];}
    case 'test':return [['Radio check. Read you loud and clear. Over.','무전 점검. 감도 양호, 이상.'],['Radio check, how copy? Lima Charlie. Out.','무전 점검, 감도 어떤가? 감도 양호. 끝.']];}
  return null;}
const VOX_HQ_SAYS=new Set(['order','jam','run','gone','lost','sup','air','sitq','medack','eom','test']);
{const _vl=voxLine;voxLine=function(k,o){try{const u=o.u,n=o.nat??(u?u.nat:0);
    const c={cs:voxCs(u),hq:voxHq(n),csK:voxCsKo(u),hqK:voxHqKo(n)};
    if(o.x!=null){c.place=voxPlace(o.x,o.z);c.placeK=voxPlaceKo(o.x,o.z);}else if(u){c.place=voxPlace(u.x,u.z);c.placeK=voxPlaceKo(u.x,u.z);}
    const V=voxVariants(k,o,c);if(V&&V.length){const p=voxPick(k+(o.kind||''),V);let who=VOX_HQ_SAYS.has(k)?c.hq:c.cs,whoK=VOX_HQ_SAYS.has(k)?c.hqK:c.csK;
      if(k==='fdc'||k==='shot'||k==='splash'){who=VOX_FDC[n%4];whoK=VOX_FDC_KO[n%4];}
      if(!u&&!VOX_HQ_SAYS.has(k)&&!(k==='fdc'||k==='shot'||k==='splash')){who=c.hq;whoK=c.hqK;}
      return {nat:n,who,whoKo:whoK,txt:p[0],ko:p[1],jam:k==='jam'||k==='run'?1:undefined};}}catch(e){}
  return _vl(k,o);};}
/* 이어지는 교신: 중상자 → 9-line → 본부 답, 포격 요청 → 복창 → 발사 → 탄착 → 사격 종료 */
{const _ev=voxEv;voxEv=function(k,o){const it=_ev(k,o);try{if(it&&G){const t=G.time||0,n=o.nat??(o.u?o.u.nat:0);
    if(k==='cas'&&o.hw>0&&o.u&&voxGap('medevac'+n,40)){VOX.tm.push({at:t+3,k:'medevac',o:{u:o.u,hw:o.hw},g:G});VOX.tm.push({at:t+7,k:'medack',o:{u:o.u,nat:n},g:G});}
    if(k==='sup'&&o.kind==='arty'){VOX.tm=VOX.tm.filter(x=>!(x.k==='splash'&&x.o.nat===n&&x.at>t));
      VOX.tm.push({at:t+.6,k:'fdc',o:{nat:n,x:o.x,z:o.z},g:G},{at:t+1.4,k:'shot',o:{nat:n},g:G},{at:t+2.2,k:'splash',o:{nat:n},g:G},{at:t+14,k:'eom',o:{nat:n},g:G});}}}catch(e){}return it;};}
/* 상황 보고: 내 세력에 3분쯤마다 한 번(조용할 때만). 본부가 묻고 카메라 가까운 부대가 답한다 */
{const _sc=voxScan;voxScan=function(){_sc();try{const t=G.time||0;if(t<60)return;for(const n of G.order){if(!G.nats[n].alive||isAI(n)||!voxHears(n))continue;
    if(VOX.busy||VOX.q.length)continue;const us=G.units.filter(u=>u.nat===n&&!UT[u.type].fly&&(UT[u.type].cls!=='veh'||u.type==='tank'||u.type==='ifv'));if(!us.length)continue;
    if(!voxGap('sit'+n,170))continue;const u=us.find(voxNear)||us[Math.floor(Math.random()*us.length)];
    voxEv('sitq',{nat:n});VOX.tm.push({at:t+2,k:'sitrep',o:{u},g:G});}}catch(e){}};}

/* ---------- 한국어로 듣기 ---------- */
function voxVoicesKo(){if(typeof speechSynthesis==='undefined')return [];if(VOX.voicesKo)return VOX.voicesKo;const ko=speechSynthesis.getVoices().filter(v=>/^ko/i.test(v.lang));
  const male=ko.filter(v=>/male|man|injoon|minsu|hyunsu|남/i.test(v.name)&&!/female|woman|yuna|sora|heami|seoyeon|여/i.test(v.name));VOX.maleKo=male.length>0;
  return VOX.voicesKo=(male.length?male:ko).sort((a,b)=>(a.localService?0:1)-(b.localService?0:1));}
const voxKo=()=>VOX.lang==='ko'&&voxVoicesKo().length>0;
voxSpeaks=()=>VOX.mode==='voice'&&(voxKo()||!!voxVoice(0));
voxPump=function(){if(VOX.busy||!VOX.q.length||!SFX.on||VOX.mode==='off')return;const test=VOX.q.some(x=>x.k==='test');if(!test&&(typeof G==='undefined'||!G||G.paused||G.boot))return;
  const now=Date.now();VOX.q=VOX.q.filter(x=>now-x.at<x.ttl&&(x.k==='test'||x.g===G&&voxHears(x.nat)));if(!VOX.q.length)return;VOX.q.sort((a,b)=>b.p-a.p||a.at-b.at);const it=VOX.q.shift();
  VOX.busy=true;voxSub(it);const done=()=>{if(!VOX.busy)return;clearTimeout(VOX.to);voxBed(false);voxSquelch(true,it.jam);setTimeout(()=>{VOX.busy=false;},260);};
  if(voxSpeaks()){try{audio();voxSquelch(false,it.jam);voxBed(true,it.jam);const ko=voxKo();const txt=ko?voxSayKo(it.ko):it.txt;const s=new SpeechSynthesisUtterance(txt);
      const vs=ko?voxVoicesKo():null;s.voice=ko?vs[(it.nat||0)%vs.length]:voxVoice(it.nat);s.lang=s.voice.lang;
      // 세력마다, 말하는 사람마다 목소리 높이를 조금씩 다르게. 급한 교신은 높고 빠르게
      let h=0;for(const ch of it.who)h=(h*31+ch.charCodeAt(0))%997;const male=ko?VOX.maleKo:VOX.male;const base=male?[.95,.82,1.05,.88]:[.62,.55,.7,.58];
      s.pitch=Math.max(.3,Math.min(1.4,base[it.nat%4]+(h%7-3)*.025+(it.p>=3?.06:0)));
      s.rate=Math.min(1.7,(it.p>=3?1.25:1.12)*(ko?1.05:1)*(G&&G.spd>=4?1.2:1));s.volume=Math.min(1,SFX.vol.master*SFX.vol.radio*1.3);
      s.onend=s.onerror=done;VOX.to=setTimeout(done,1500+txt.length*(ko?170:110));speechSynthesis.speak(s);return;}catch(e){}}
  VOX.inner=true;try{_voxRadio(VOX_R[it.k]||'ack');}finally{VOX.inner=false;}const d=SFX.ctx?Math.max(.6,(SFX.radioEnd||0)-SFX.ctx.currentTime):1.2;VOX.to=setTimeout(done,d*1000);};
Object.assign(VOX_R,{medevac:'casualty',medack:'hq',sitq:'hq',sitrep:'ack',fdc:'support',shot:'support',splash:'support',eom:'hq',spot:'contact',pin:'contact',fall:'lost'});
{const _sy=voxSync;voxSync=function(){_sy();if(typeof document==='undefined')return;const l=document.getElementById('snd-lang');if(l)l.value=VOX.lang;
  const h=document.getElementById('snd-voxh');if(h&&VOX.mode==='voice'){const noKo=!voxVoicesKo().length,noEn=!voxVoice(0);
    h.hidden=!(VOX.lang==='ko'?noKo:noEn);h.textContent=VOX.lang==='ko'?(noEn?'이 기기에 한국어·영어 음성이 없어 잡음과 자막으로 들려줍니다.':'이 기기에 한국어 음성이 없어 영어로 읽습니다.'):'이 기기에 영어 음성이 없어 잡음과 자막으로 들려줍니다.';}};}
(function(){if(typeof document==='undefined')return;try{const l=localStorage.getItem(VOX_LK);if(l==='en'||l==='ko')VOX.lang=l;}catch(e){}
  const vx=document.getElementById('snd-vox');if(vx&&!document.getElementById('snd-lang')){const lab=document.createElement('label');lab.className='sp-v';
    lab.innerHTML='<span>무전 언어</span><select id="snd-lang"><option value="en">영어</option><option value="ko">한국어</option></select>';vx.closest('label').after(lab);
    lab.querySelector('select').addEventListener('change',e=>{VOX.lang=e.target.value;try{localStorage.setItem(VOX_LK,VOX.lang);}catch(x){}
      // 한국어로 들으면 자막도 한국어, 영어로 들으면 영어
      if(VOX.sub!=='off')VOX.sub=VOX.lang;voxSet();if(VOX.mode!=='off')sndRadio('ack');});}
  if(typeof speechSynthesis!=='undefined')speechSynthesis.addEventListener?.('voiceschanged',()=>{VOX.voicesKo=null;voxSync();});
  voxSync();})();
