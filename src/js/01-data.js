/* ===================== DATA =====================
   TRIAD 시가전: 도시 한 곳을 두고 분대 단위로 싸우는 턴제 전략 게임.
   지도는 정사각 격자(가로·세로·대각 8방향), 거리는 체비셰프 거리. */
let N=44;                      // 지도 한 변 칸 수 (정사각)
const SIZES={s:{n:'소형 36×36',c:36,obj:1},m:{n:'중형 52×52',c:52,obj:3},l:{n:'대형 64×64',c:64,obj:4}};
const NATS=[
  {name:'블루',full:'블루 연방군',col:'var(--n0)',edge:'서쪽'},
  {name:'레드',full:'레드 공화국군',col:'var(--n1)',edge:'동쪽'},
  {name:'앰버',full:'앰버 민병대',col:'var(--n2)',edge:'북쪽'},
  {name:'바이올렛',full:'바이올렛 연합군',col:'var(--n3)',edge:'남쪽'},
];
const MAPCOL=['#4f8cff','#ff5a4e','#f0a537','#b383ff'];
/* 지형: cov = 받는 피해 감소, blk = 시야를 막는가 */
const TT={
  road:{n:'도로',cov:0},
  plaza:{n:'광장',cov:0},
  park:{n:'공원',cov:.15},
  rubble:{n:'잔해',cov:.25},
  bldg:{n:'건물',cov:.4},
  water:{n:'분수·연못',cov:0},
};
/* 병종. cls: inf(보병) veh(차량) air(드론)
   rng: [최소, 최대] 사거리, ind: 곡사(시야 없이 아군이 보는 곳 사격, 이동 후 사격 불가)
   ex: 폭발물(건물 피해 배수, 건물 엄폐 절반 무시), sup: 제압 사격, cap: 거점 점령 가능 */
const UT={
  rifle:{n:'소총분대',cls:'inf',mv:4,vis:5,rng:[1,4],atk:{inf:5,veh:1,air:3},cost:3,cap:1,desc:'거점 점령과 건물 장악의 주력'},
  mg:{n:'기관총팀',cls:'inf',mv:3,vis:5,rng:[1,5],atk:{inf:6,veh:1,air:4},sup:1,cost:4,desc:'맞은 적은 제압되어 다음 턴 약해짐. 경계 사격에 강함'},
  at:{n:'대전차팀',cls:'inf',mv:3,vis:5,rng:[1,4],atk:{inf:2,veh:8,air:1},ex:1,cost:4,desc:'기갑 사냥꾼. 건물·잔해 안에서 쏘면 기갑에 +25%'},
  sniper:{n:'저격수',cls:'inf',mv:4,vis:7,rng:[2,8],atk:{inf:6,veh:0,air:3},cost:5,hide:1,desc:'건물 안에 있으면 붙어 있는 적만 발견 가능'},
  eng:{n:'공병',cls:'inf',mv:4,vis:4,rng:[1,1],atk:{inf:6,veh:5,air:0},ex:3,cap:1,cost:4,desc:'폭약과 화염. 붙어 있는 건물에 큰 피해'},
  mortar:{n:'박격포',cls:'inf',mv:3,vis:4,rng:[2,7],ind:1,atk:{inf:5,veh:2,air:0},ex:1,sup:1,cost:5,desc:'곡사. 아군 누구든 보고 있는 칸을 포격'},
  ifv:{n:'장갑차',cls:'veh',mv:6,vis:5,rng:[1,5],atk:{inf:5,veh:3,air:4},cost:6,desc:'빠른 기동과 보병 제압. 건물 진입 불가'},
  tank:{n:'전차',cls:'veh',mv:5,vis:5,rng:[1,6],atk:{inf:7,veh:8,air:2},ex:2,armor:1,cost:8,desc:'최강 화력과 두꺼운 장갑(대전차 무기 외 피해 −35%). 골목에서 대전차팀에 약함'},
  drone:{n:'정찰드론',cls:'air',mv:7,vis:7,rng:[0,0],atk:{},cost:3,fly:1,hpMax:5,desc:'건물 위로 날아 넓게 정찰. 공격 불가'},
};
const TYPES=Object.keys(UT);
const CLSN={inf:'보병',veh:'차량',air:'드론'};
/* 화력 지원 (지휘점수 소모, 나라당 턴에 하나씩) */
const SUP={
  arty:{n:'포병 사격',cost:6,rad:1,desc:'보이는 지점 3×3 포격. 부대 피해·제압, 건물 파손'},
  air:{n:'근접 항공 지원',cost:9,rad:0,desc:'보이는 한 칸 정밀 폭격. 건물을 무너뜨림'},
  smoke:{n:'연막',cost:2,rad:1,desc:'3×3 연막. 2라운드 동안 시야를 가림'},
};
const OBJ_NAMES=['시청','중앙역','방송국','종합병원','발전소','경찰청','중앙시장','대성당','통신탑','국립도서관','항만청','증권거래소','연방 법원','주 의회','공항 터미널','스타디움'];
const WX={clear:{n:'맑음',p:.62,vis:0},rain:{n:'비',p:.22,vis:-1},fog:{n:'짙은 안개',p:.1,vis:-2},storm:{n:'폭우',p:.06,vis:-2,noAir:1}};
const FLOOR_H=.32;          // 3D에서 한 층 높이
const BASE_CP=3, OBJ_CP=2;    // 턴마다 지휘점수: 기본 + 거점당
