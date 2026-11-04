/* ===================== DATA ===================== */
const R=20,S3=Math.sqrt(3);let COLS=26,ROWS=18,W=0,H=0;
function setDims(c,r){COLS=c;ROWS=r;W=S3*R*(COLS+0.5);H=1.5*R*(ROWS-1)+2*R;}setDims(26,18);
const SIZES={m:{n:'중형',c:26,r:18,max:4},l:{n:'대형',c:36,r:26,max:6},xl:{n:'초대형',c:48,r:34,max:6}};
const NATS=[{name:'블루',full:'블루 연방',col:'var(--n0)'},{name:'레드',full:'레드 공화국',col:'var(--n1)'},{name:'앰버',full:'앰버 왕국',col:'var(--n2)'},{name:'바이올렛',full:'바이올렛 연합',col:'var(--n3)'},{name:'틸',full:'틸 공화국',col:'var(--n4)'},{name:'슬레이트',full:'슬레이트 동맹',col:'var(--n5)'}];
function startsFor(k){const m=Math.floor(COLS/2);const all=[[3,3],[ROWS-4,COLS-4],[3,COLS-4],[ROWS-4,3],[3,m],[ROWS-4,m]];return all.slice(0,k);}
const TR={sea:{n:'바다',def:0},plain:{n:'평지',def:0},forest:{n:'숲',def:1},mountain:{n:'산악',def:2},city:{n:'도시',def:2},hq:{n:'수도',def:3},oil:{n:'유전',def:1},mine:{n:'광산',def:1}};
const SITES=['city','hq','oil','mine'];
const UT={
  /* 지상 — 보병 계열 */
  inf:{n:'보병',d:'land',cls:'inf',mv:3,vis:2,fuel:0,ammo:0,ua:1,cost:[1,0,0],from:['hq','barracks'],cap:1,foot:1,atk:{inf:5,soft:6,armor:1,heli:1}},
  at:{n:'대전차팀',d:'land',cls:'inf',mv:3,vis:2,fuel:0,ammo:4,cost:[2,1,0],from:['hq','barracks'],foot:1,atk:{inf:3,soft:6,armor:8,heli:3}},
  eng:{n:'공병',d:'land',cls:'inf',mv:3,vis:2,fuel:0,ammo:0,ua:1,cost:[2,1,0],from:['barracks'],cap:1,foot:1,infil:1,mineproof:1,atk:{inf:3,soft:3,armor:1}},
  spec:{n:'특수부대',d:'land',cls:'inf',mv:4,vis:3,fuel:0,ammo:0,ua:1,cost:[3,1,0],from:['barracks'],cap:1,foot:1,infil:1,stealth:1,climb:1,atk:{inf:7,soft:8,armor:4,heli:2}},
  /* 지상 — 차량 */
  truck:{n:'보급트럭',d:'land',cls:'soft',mv:5,vis:2,fuel:50,ammo:0,cost:[2,1,0],from:['hq','barracks'],sup:1},
  recon:{n:'정찰차',d:'land',cls:'soft',mv:6,vis:4,fuel:40,ammo:6,cost:[2,1,1],from:['barracks','factory'],atk:{inf:5,soft:5,armor:1,heli:1}},
  ifv:{n:'장갑차',d:'land',cls:'armor',mv:5,vis:2,fuel:50,ammo:6,cost:[3,2,1],from:['factory'],cap:1,atk:{inf:6,soft:6,armor:4,heli:2}},
  tank:{n:'전차',d:'land',cls:'armor',mv:4,vis:2,fuel:50,ammo:6,cost:[3,3,1],from:['factory'],heavy:'arsenal',atk:{inf:7,soft:8,armor:6,ship:2,heli:1}},
  art:{n:'자주포',d:'land',cls:'soft',mv:3,vis:2,fuel:40,ammo:5,cost:[3,2,0],from:['factory'],rng:[2,3],ind:1,atk:{inf:8,soft:7,armor:6,ship:5}},
  mlrs:{n:'다연장로켓',d:'land',cls:'soft',mv:3,vis:2,fuel:40,ammo:3,cost:[6,3,1],from:['factory'],heavy:'arsenal',rng:[2,5],ind:1,splash:1,atk:{inf:7,soft:7,armor:4,ship:4}},
  /* 지상 — 방공·미사일 */
  aa:{n:'대공포',d:'land',cls:'soft',mv:4,vis:2,fuel:50,ammo:6,cost:[2,2,0],from:['factory'],ad:1,atk:{inf:6,soft:4,armor:2,heli:9,jet:7}},
  sam:{n:'단거리 SAM',d:'land',cls:'soft',mv:3,vis:3,fuel:40,ammo:4,cost:[4,3,1],from:['factory'],rng:[1,3],ind:1,ad:1,atk:{heli:8,jet:8}},
  lrsam:{n:'장거리 SAM',d:'land',cls:'soft',mv:2,vis:4,fuel:40,ammo:4,cost:[6,4,2],from:['factory'],heavy:'arsenal',rng:[2,5],ind:1,ad:1,abm:1,req:'abm',atk:{heli:5,jet:9}},
  tel:{n:'이동식 발사대',d:'land',cls:'soft',mv:3,vis:2,fuel:40,ammo:0,cost:[5,3,1],from:['factory'],heavy:'arsenal',req:'rocketry',launcher:1},
  /* 해상 */
  lst:{n:'상륙함',d:'sea',cls:'ship',mv:5,vis:2,fuel:70,ammo:0,cost:[2,2,1],from:['port'],carry:1},
  pb:{n:'고속정',d:'sea',cls:'ship',mv:7,vis:3,fuel:50,ammo:6,cost:[3,1,1],from:['port'],atk:{inf:3,soft:4,ship:3,sub:2,heli:2}},
  ff:{n:'호위함',d:'sea',cls:'ship',mv:5,vis:3,fuel:70,ammo:8,cost:[4,3,2],from:['port'],rng:[1,2],ad:1,atk:{inf:3,soft:3,ship:4,sub:9,heli:4,jet:4}},
  dd:{n:'구축함',d:'sea',cls:'ship',mv:5,vis:3,fuel:70,ammo:8,cost:[4,3,2],from:['port'],rng:[1,2],ad:1,atk:{inf:5,soft:5,armor:4,ship:6,sub:7,heli:5,jet:5}},
  cg:{n:'이지스 순양함',d:'sea',cls:'ship',mv:5,vis:4,fuel:80,ammo:10,cost:[7,5,4],from:['port'],heavy:'shipyard',rng:[1,3],ad:1,abm:1,req:'aegis',atk:{inf:4,soft:4,armor:3,ship:6,sub:4,heli:8,jet:8}},
  sub:{n:'잠수함',d:'sea',cls:'sub',mv:4,vis:2,fuel:60,ammo:5,cost:[4,2,2],from:['port'],stealth:1,atk:{ship:9,sub:5}},
  bb:{n:'전함',d:'sea',cls:'ship',mv:4,vis:3,fuel:80,ammo:6,cost:[7,6,4],from:['port'],heavy:'shipyard',rng:[1,3],atk:{inf:7,soft:8,armor:6,ship:8}},
  aor:{n:'보급함',d:'sea',cls:'ship',mv:5,vis:2,fuel:90,ammo:0,cost:[4,2,2],from:['port'],replen:2},
  cv:{n:'항공모함',d:'sea',cls:'ship',mv:4,vis:4,fuel:90,ammo:0,cost:[9,7,5],from:['port'],heavy:'shipyard',carrier:1},
  /* 공중 */
  heli:{n:'공격헬기',d:'air',cls:'heli',mv:5,vis:3,fuel:24,ammo:6,cost:[5,2,2],from:['airfield'],atk:{inf:7,soft:8,armor:7,ship:3,heli:4}},
  th:{n:'수송헬기',d:'air',cls:'heli',mv:6,vis:2,fuel:30,ammo:0,cost:[3,1,2],from:['airfield'],carry:1,footOnly:1},
  uav:{n:'무인기',d:'air',cls:'heli',mv:5,vis:4,fuel:60,ammo:2,cost:[2,1,1],from:['airfield'],atk:{inf:4,soft:5,armor:4,ship:2}},
  ftr:{n:'전투기',d:'air',cls:'jet',mv:7,vis:3,fuel:30,ammo:6,cost:[5,2,3],from:['airfield'],atk:{heli:7,jet:7}},
  stealth:{n:'스텔스기',d:'air',cls:'jet',mv:7,vis:3,fuel:30,ammo:4,cost:[8,3,5],from:['airfield'],stealth:2,req:'stealth',atk:{inf:6,soft:7,armor:6,ship:6,heli:7,jet:8}},
  bmb:{n:'폭격기',d:'air',cls:'jet',mv:6,vis:2,fuel:30,ammo:4,cost:[6,2,3],from:['airfield'],atk:{inf:8,soft:8,armor:7,ship:7}},
  awacs:{n:'조기경보기',d:'air',cls:'jet',mv:6,vis:7,fuel:40,ammo:0,cost:[6,2,3],from:['airfield']},
  tnk:{n:'공중급유기',d:'air',cls:'jet',mv:7,vis:3,fuel:70,ammo:0,cost:[5,1,4],from:['airfield'],tanker:2},
};
const TYPES=Object.keys(UT);
const CLS=['inf','soft','armor','ship','sub','heli','jet'];
const CLSN={inf:'보병',soft:'경차량',armor:'기갑',ship:'함선',sub:'잠수함',heli:'헬기·드론',jet:'항공기'};
const dmgBase=(a,b)=>(UT[a].atk&&UT[a].atk[UT[b].cls])||0;
const reqOk=(n,t)=>!UT[t].req||hasTech(n,UT[t].req);
const canCarry=(ct,ut)=>!!UT[ct].carry&&UT[ut].d==='land'&&(!UT[ct].footOnly||!!UT[ut].foot);
const BT={
  barracks:{n:'병영',s:'병',cost:[4,2,0],t:1,desc:'보병·보급트럭 생산'},
  factory:{n:'공장',s:'공',cost:[8,6,0],t:2,desc:'전차·자주포·대공포 생산'},
  airfield:{n:'비행장',s:'비',cost:[10,6,2],t:2,desc:'활주로 2칸 · 항공기 2대 격납 · 생산·급유·수리'},
  shipyard:{n:'조선소',s:'조',cost:[8,6,0],t:2,coast:1,desc:'항구 옆 · 전함·항모·이지스 건조 · 인접 함정 수리 +3'},
  arsenal:{n:'병기창',s:'창',cost:[8,6,1],t:2,desc:'공장 옆 · 전차·다연장·장거리 SAM·발사대 생산'},
  hangar:{n:'격납고',s:'격',cost:[5,4,0],t:1,desc:'비행장 옆에 지음 · 항공기 4대 추가 격납'},
  port:{n:'항구',s:'항',cost:[8,5,0],t:2,coast:1,desc:'함정 생산·보급(반경 3), 해안만'},
  depot:{n:'보급창',s:'보',cost:[5,3,0],t:1,desc:'지상 보급 반경 4, 수리'},
  radar:{n:'레이더',s:'레',cost:[6,4,0],t:1,desc:'시야 반경 5'},
  silo:{n:'미사일 기지',s:'미',cost:[12,8,4],t:3,desc:'미사일 생산·발사 (턴당 1발)'},
};
const STAFF={
  g2:{n:'정보참모',code:'G2',desc:'전 부대 시야 +1, 위협 보고'},
  g3:{n:'작전참모',code:'G3',desc:'공격 피해 +15%, 공격 목표 추천'},
  g4:{n:'군수참모',code:'G4',desc:'보급 비용 −40%, 보급 반경 +1'},
  eng:{n:'공병참모',code:'G7',desc:'건설비 −30%, 공기 −1턴'},
  fin:{n:'재정참모',code:'G8',desc:'도시 자금 수입 +25%'},
  air:{n:'항공참모',code:'A3',desc:'항공기 연료 소모 절반, 항공 피해 +10%'},
};
const STAFF_COST=6, STAFF_SLOTS=3;
const TECH={
  armor:{n:'복합장갑',cost:[12,10,2],t:3,desc:'전차·장갑차가 받는 피해 −20%'},
  precision:{n:'정밀 포격',cost:[12,8,2],t:3,desc:'자주포·다연장로켓 사거리 +1'},
  jet:{n:'제트 엔진',cost:[14,8,8],t:4,desc:'항공기 이동 +2'},
  radar:{n:'통합 레이더망',cost:[10,8,2],t:3,desc:'전 부대 시야 +1'},
  logistics:{n:'병참 혁신',cost:[10,6,4],t:3,desc:'보급 비용 −30%, 트럭 보급 반경 +1'},
  amphib:{n:'상륙전 교리',cost:[8,6,4],t:2,desc:'하선한 부대가 바로 행동'},
  mass:{n:'대량생산',cost:[16,10,0],t:4,desc:'부대 생산 자금 −20%'},
  mobil:{n:'총동원령',cost:[14,4,2],t:3,desc:'병력 상한 +8'},
  rocketry:{n:'로켓 공학',cost:[12,10,6],t:3,desc:'탄도미사일 생산 가능'},
  abm:{n:'미사일 방어망',cost:[12,8,4],t:3,desc:'적 탄도미사일 50% 요격, 장거리 SAM 생산'},
  sat:{n:'정찰위성',cost:[14,10,6],t:4,desc:'4라운드마다 그 라운드 동안 전 지도 정찰'},
  stealth:{n:'스텔스 기술',cost:[14,8,8],t:4,desc:'스텔스기 생산 (적에게 2칸 안에서만 보임)'},
  aegis:{n:'이지스 체계',cost:[14,10,6],t:4,desc:'이지스 순양함 생산 (방공·탄도탄 요격)'},
};
for(const k in TECH){TECH[k].cost=TECH[k].cost.map(v=>Math.round(v*1.6));TECH[k].t+=1;}
const WX={clear:{n:'맑음',p:.6,desc:'특이사항 없음'},rain:{n:'비',p:.22,desc:'지상 차량 이동 −1, 항공 시야 −1'},storm:{n:'폭풍',p:.1,desc:'항공기 출격 불가, 함정 이동 −2'},fog:{n:'짙은 안개',p:.08,desc:'전 부대 시야 −1'}};
function rollWx(){let q=Math.random();for(const k in WX){q-=WX[k].p;if(q<=0)return k;}return 'clear';}
const EVENTS=[
  {n:'국채 발행',f:n=>{G.nats[n].f+=8;return '자금 +8';}},
  {n:'유전 화재',f:n=>{const N=G.nats[n];const l=Math.min(N.o,6);N.o-=l;return `석유 −${l}`;}},
  {n:'의용군 합류',f:n=>{const [r,c]=G.nats[n].hq;const sp=[[r,c],...nbrs(r,c)].find(([a,b])=>cell(a,b).t!=='sea'&&!unitAt(a,b));if(!sp)return null;mkUnit('inf',n,sp[0],sp[1],true);return '수도 인근에 보병 1기';}},
  {n:'철강 노조 파업',f:n=>{const N=G.nats[n];const l=Math.min(N.s,5);N.s-=l;return `철강 −${l}`;}},
  {n:'해외 원조',f:n=>{const N=G.nats[n];N.s+=4;N.o+=4;return '철강 +4 · 석유 +4';}},
  {n:'전쟁 영웅 탄생',f:n=>{const us=G.units.filter(u=>u.nat===n&&(u.rank||0)<3);if(!us.length)return null;const u=us[Math.floor(Math.random()*us.length)];u.rank=(u.rank||0)+1;return `${UT[u.type].n} 1개 부대 진급`;}},
];
const SURN=['김','이','박','최','정','강','조','윤','장','한','오','서','신','권','황'];
const GIVEN=['준혁','서윤','도현','민재','하은','지훈','태윤','수아','현우','예린','건우','시우','유진','재원'];
const RANKS=['소령','중령','대령'];
const RES=['자금','철강','석유'];
