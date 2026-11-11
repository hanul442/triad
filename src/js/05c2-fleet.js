/* ===================== FLEET: 차량·병종 늘리기 (실제 장비) =====================
   "시가전에서 중요한 건 소총부대지만 다 장비를 쓰지 않나, 장갑차 같은 거". 실제 시가전(팔루자·그로즈니·모술·마리우폴)은
   보병이 장갑차를 타고 와서 내려 싸우고, 공병전차가 잔해와 방벽을 치우고, 자주대공포와 박격포 차량이 뒤를 받친다.
   여기서는 새 병종의 수치와 실제 장비 이름만 정한다. 승하차·공병전차 일·표 채우기는 09e-fleet.js가 한다.

   새 병종 (짝수 세력 = 서방·한국군 장비, 홀수 세력 = 동구권·민병대 장비)
   - 보병전투차 bmp: K21·M2 브래들리 / BMP-2. 25~40mm 기관포 + 대전차미사일 2발, 분대 하나를 태운다.
   - 공병전차 cev: M1150 돌파차량·D9 장갑불도저 / IMR-2. 주포 없이 기관총만. 방벽·잔해·지뢰를 밀어 길을 연다.
   - 자주대공포 spaa: K30 비호·게파르트 / ZSU-23-4 실카. 레이더로 드론·헬기를 잘 잡고, 건물 위층도 쏜다.
   - 박격포 차량 mortv: M1129 스트라이커 120mm / 2S9 노나-S. 차에서 바로 쏘고, 쏜 뒤 자리를 옮긴다(대포병 회피).
   - 열압력 로켓팀 tb: 칼구스타프 열압력탄·SMAW-NE / RPO-A 슈멜. 건물 안 적에게 강하다.
   - 장갑차(ifv)는 차륜형 장갑차(스트라이커 / BTR-82A)로 이름을 바로 하고, 분대 하나를 태운다.

   증원 메뉴는 병과(BRANCH)로 나눠 보인다: 보병 · 기갑·기계화 · 포병 · 방공·드론 · 지원.
   근거(공개 자료): FM 3-06 시가지 작전, ATP 3-21.71 기계화 보병 소대, ATP 3-34.22 공병, 각 장비 공개 제원. 1칸 ≈ 12m. */
Object.assign(UT,{
  bmp:{n:'보병전투차',cls:'veh',mv:5.5,vis:12,rng:[1,22],atk:{inf:6,veh:5,air:4},cost:10,hpMax:12,
    desc:'궤도형 보병전투차. 기관포(서방 25~40mm, 동구권 30mm)와 대전차미사일 2발로 전차도 잡음. 분대 하나를 태우고 와서 내려 주고, 내린 뒤에는 뒤에서 화력으로 받침. 증원하면 소총분대가 타고 옴'},
  cev:{n:'공병전차',cls:'veh',mv:4,vis:10,rng:[1,12],atk:{inf:4,veh:0,air:2},cost:7,hpMax:14,dozer:1,
    desc:'불도저 삽날을 단 중장갑 공병 차량. 주포 없이 기관총만 있음. 앞을 막는 방벽·고슴도치·잔해·불탄 차를 밀어 길을 내고, 쟁기로 지뢰를 걷음. 적 방어물 쪽으로 알아서 감'},
  spaa:{n:'자주대공포',cls:'veh',mv:5,vis:12,rng:[1,24],atk:{inf:6,veh:2,air:10},sup:1,cost:8,hpMax:10,
    desc:'레이더를 단 궤도형 쌍열 대공포. 드론·헬기를 가장 멀리서 잡고, 아군 위로 오는 미사일도 요격. 높이 쳐들 수 있어 건물 위층 적도 쏨. 대전차 무기에 약함'},
  mortv:{n:'박격포 차량',cls:'veh',mv:6,vis:8,rng:[6,60],ind:1,atk:{inf:7,veh:3,air:0},ex:1.5,sup:1,cost:7,hpMax:9,
    desc:'120mm 박격포를 실은 차량. 아군이 보는 곳을 쏘고, 쏘고 나면 대포병 사격을 피해 자리를 옮김. 박격포반보다 멀리·세게 쏘지만 비쌈'},
  tb:{n:'열압력 로켓팀',cls:'inf',mv:3,vis:14,rng:[1,14],atk:{inf:9,veh:3,air:0},ex:3,cost:5,
    desc:'어깨에 메는 열압력 로켓(서방 칼구스타프·SMAW, 동구권 RPO-A). 창문·출입구로 쏘아 건물 안 적을 크게 다치게 함. 재장전이 느리고 장갑엔 약함'},
});
UT.ifv.n='차륜형 장갑차';
UT.ifv.desc='바퀴 8개의 병력 수송 장갑차. 빠르고 보병 제압에 강함. 분대 하나를 태우고 와서 내려 준 뒤 원격 사격 무기로 받침. 증원하면 소총분대가 타고 옴. 건물 진입 불가';
UT.ifv.cost=8;          // 차량 6 + 탑승 소총분대 3, 함께 오니 1 덜
UT.sniper.n='저격조';  // 저격수 + 관측수 둘이 한 조
/* 실제 장비 이름 [서방(짝수 세력), 동구권(홀수 세력)] */
const FLEET_REAL={
  rifle:['K2·M4 소총 분대','AK-74 분대'],mg:['K6·M240 기관총조','PKM 기관총조'],at:['칼구스타프·AT4','RPG-7'],atgm:['재블린·현궁','코르넷'],
  tb:['칼구스타프 열압력탄·SMAW-NE','RPO-A 슈멜'],sniper:['M110·K14 저격조','SVD 저격조'],eng:['전투공병 분대','공병 분대'],
  tank:['K2·M1A2','T-90·T-72'],bmp:['K21·M2 브래들리','BMP-2'],ifv:['스트라이커·K808','BTR-82A'],hmv:['M1151 험비','테크니컬'],
  cev:['M1150 돌파차량·D9 장갑불도저','IMR-2'],mortar:['81mm 박격포반','82mm 박격포반'],mortv:['M1129 스트라이커 120mm','2S9 노나-S'],
  spg:['K9·M109','2S3·2S19'],mlrs:['천무·하이마스','BM-21 그라드'],aa:['스팅어·신궁','이글라'],zu:['차량 탑재 대공포','ZU-23-2 테크니컬'],
  spaa:['K30 비호·게파르트','ZSU-23-4 실카'],ew:['휴대 재머','휴대 재머'],drone:['소형 정찰드론','소형 정찰드론'],dteam:['FPV 조종팀','FPV 조종팀'],
  fpv:['FPV 자폭드론','FPV 자폭드론'],sup:['K311·FMTV','우랄·카마즈'],rec:['M88·K288','BREM'],amb:['K-151·M997 구급차','UAZ 구급차'],vbied:['','자폭 차량']};
// 국군 세력(05c3-rok)이면 국군 이름, 아니면 서방(짝수)·동구권(홀수)
const fleetReal=(t,n)=>{if(typeof isRok==='function'&&isRok(n)&&typeof ROK_REAL==='object'&&ROK_REAL[t])return ROK_REAL[t];const r=FLEET_REAL[t];return r?r[typeof natEast==='function'?(natEast(n)?1:0):n%2]||r[0]:'';};
/* 병과: 증원 메뉴의 묶음과 순서 */
const BRANCH=[
  {k:'inf',n:'보병',d:'거점을 잡고 건물을 장악하는 주력',ts:['rifle','mg','at','atgm','tb','sniper','eng']},
  {k:'arm',n:'기갑·기계화',d:'보병을 태워 오고 화력으로 받치는 차량',ts:['tank','bmp','ifv','hmv','cev','vbied']},
  {k:'art',n:'포병',d:'아군이 보는 곳을 멀리서 쏘는 곡사 화기',ts:['mortar','mortv','spg','mlrs']},
  {k:'ad',n:'방공·드론',d:'적 드론·헬기를 막고 우리 드론을 띄움',ts:['aa','zu','spaa','ew','drone','dteam','fpv']},
  {k:'sup',n:'지원',d:'배치만 하면 보급·후송·견인을 알아서',ts:['sup','rec','amb']}];
const branchOf=t=>{for(const b of BRANCH)if(b.ts.includes(t))return b.k;return UT[t]&&UT[t].cls==='inf'?'inf':UT[t]&&UT[t].fly?'ad':'arm';};
/* 탑승: 태울 수 있는 사람 수와, 증원할 때 함께 오는 분대 */
const CARRY={ifv:{cap:9,with:'rifle'},bmp:{cap:9,with:'rifle'}};
/* 새 병종이 아직 없는 표(사거리·관통·소리·총구 등)는 비슷한 병종 값을 빌린다(09e-fleet). 앞에 있는 것부터 */
const FLEET_BASE={bmp:['ifv','tank'],cev:['tank'],spaa:['zu','ifv'],mortv:['mortar','spg'],tb:['at']};
/* 목록 순서: 비슷한 병종 옆에 */
for(const [t,after] of [['tb','at'],['bmp','tank'],['cev','hmv'],['mortv','mortar'],['spaa','zu']])
  if(!TYPES.includes(t)){const i=TYPES.indexOf(after);TYPES.splice(i>=0?i+1:TYPES.length,0,t);}
Object.assign(COOL,{bmp:1.4,cev:1.2,spaa:.8,mortv:4,tb:7});
Object.assign(SELF_RUN,{cev:1,spaa:1,mortv:1});
