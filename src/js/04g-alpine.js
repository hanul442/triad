/* ===================== 알프스 산악: 규칙 (이동·등반·눈·높이) =====================
   지도 모양은 03d-alpine.js. 칸 기울기 sl = 높이차/거리(1층 3m, 1칸 12m).
   근거: 미 육군 FM 5-33 지형 분석(기동 가능 경사), ATP 3-90.97 산악·혹한기 작전(지형 등급, 고정 로프, 산악 훈련병),
        FM 3-97.6 산악 작전(골짜기·고개가 기동로를 묶고, 고지가 길을 지배한다).
   - 차량: 길 밖에서 바퀴 차량은 30%, 궤도 차량은 45% 넘는 비탈을 못 오른다. 바위벽·너덜지대·산길은 어떤 차량도 못 간다.
     도로(골짜기 길)는 비탈과 상관없이 다닌다.
   - 보병: 45°(100%) 넘는 바위벽(cliff)은 등반 장비가 있어야 오른다. 다른 비탈은 느리게 걸어서 오른다(slopeK).
   - 산악보병(alp): 바위벽을 오른다(느리게). 오르는 동안 고정 로프를 걸어 두면, 그 바위벽은 다른 보병도 로프를 잡고 오를 수 있다
     (교범의 '선등조가 로프를 설치하고 본대가 따라 오른다'). 로프는 적도 쓸 수 있다.
     비탈 오르막에서 덜 지치고, 눈밭에서 스키·설피로 거의 느려지지 않는다.
   - 눈밭(설선 위): 보병 30%, 차량 40% 느리다. 산악보병은 5%.
   - 높은 곳: 숲 한계선 위에서는 앞이 트여 시야 +2, 봉우리 꼭대기는 +1 더. */
const ALP={veh:.3,trk:.45,climb:4,rope:5,snowInf:.7,snowVeh:.6,snowMtn:.95,ropeT:6};
const ALP_TRK={tank:1,spg:1,bmp:1,spaa:1,cev:1};
const alpOn=()=>!!(G&&G.feat&&G.feat.layout==='alpine');
/* 산악보병: 소총분대와 같은 화력, 등반 장비와 스키. 비싸다(교육·장비) */
UT.alp={n:'산악보병',cls:'inf',mv:4,vis:5,rng:[1,4],atk:{inf:5,veh:1,air:3},cost:4,cap:1,mtn:1,
  desc:'등반·스키 훈련을 받은 산악 소총분대. 다른 부대가 못 오르는 바위벽을 로프로 오르고, 오른 바위벽에는 고정 로프를 걸어 다른 보병도 따라오게 함. 눈밭·비탈에서 덜 느려짐'};
if(!TYPES.includes('alp'))TYPES.push('alp');
/* 이동 비용 */
{const _mc=mcost;mcost=function(type,x){const m=_mc(type,x);if(m===Infinity||!x||(x.sl==null&&!x.cliff&&!x.mtr))return m;const t=UT[type];if(!t||t.fly)return m;
  if(t.cls==='veh'){if(x.cliff||x.scree||x.mtr||x.summit)return Infinity;if(x.t!=='road'&&x.sl>(ALP_TRK[type]?ALP.trk:ALP.veh))return Infinity;return m;}
  if(x.cliff)return t.mtn?ALP.climb:x.rope?ALP.rope:Infinity;
  return m;};}
/* 비탈·눈 속도 */
{const _sk=slopeK;slopeK=function(u,dx,dz){let k=_sk(u,dx,dz);if(!G||!G.feat||G.feat.layout!=='alpine')return k;const t=UT[u.type];if(t.fly)return k;
  if(t.mtn&&k<1)k=Math.pow(k,.65);                                     // 산악보병: 오르막에서 덜 느려진다
  const x=tileAt(u.x,u.z);if(x&&x.snow&&x.t!=='road')k*=t.mtn?ALP.snowMtn:t.cls==='veh'?ALP.snowVeh:ALP.snowInf;
  return k;};}
/* 높은 곳은 멀리 본다 */
{const _vr=visRange;visRange=function(u){let v=_vr(u);if(!alpOn()||UT[u.type].fly)return v;const x=cell(u.r,u.c),A=G.feat.alp;
  if(A&&x&&x.el>=A.tl&&x.t!=='bldg')v+=2;if(x&&x.summit)v+=1;return v;};}
/* 고정 로프: 산악보병이 바위벽 칸에 ALP.ropeT초 머물며 오르면 건다. 칸 표시 x.rope = 건 세력+1. 이동 격자를 다시 만든다 */
function alpRopeTick(dt){if(!alpOn())return;G.ropes=G.ropes||[];
  for(const u of G.units){if(!UT[u.type].mtn)continue;const x=tileAt(u.x,u.z);if(!x||!x.cliff||x.rope){u._clT=0;continue;}
    u._clT=(u._clT||0)+dt;if(u._clT<ALP.ropeT)continue;u._clT=0;x.rope=u.nat+1;G.ropes.push({r:Math.floor(u.z),c:Math.floor(u.x),nat:u.nat,t:G.time||0});
    G.navV=(G.navV||0)+1;bump();if(!isAI(u.nat)||!G.fog)L(`${natName(u.nat)} 산악보병이 바위벽에 고정 로프를 걸었습니다`);}}
