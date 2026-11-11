/* ===================== 국군 장비 모형 =====================
   국군 세력(05c3-rok isRok)의 차량은 기본 서방식 대신 실제 국군 장비 꼴로 짓는다. 07zv-vehicles의 vxKit·vxBake를 그대로 쓴다(치수 m, 앞 +x).
   - K2 흑표: 6개 보기륜(유기압 현수장치), 긴 뒤 바구니(자동장전장치)가 달린 각진 포탑, 55구경장 긴 포신(열 덮개 마디), 포탑 앞 모서리 레이더 판,
     차장 파노라마 조준경, K6 원격 기관총.
   - K808 백호: 8×8 차륜형, 쐐기 모양 앞, 매끈한 옆판, K6 원격사격무기, 뒤 램프.
   - KLTV: 4문 소형전술차량, 평평한 보닛, 지붕 사수 방패 + K6 기관총.
   - K600 코뿔소: K1 차체 + 앞 V자 지뢰 쟁기 + 오른쪽 굴삭 팔 + 뒤 통로 표지 발사기.
   - K239 천무: 8×8 트럭 + 6발 들이 상자 포드 둘.
   - KM-SAM 천궁: 8×8 트럭 + 8발 수직 발사 상자(세워 쏨).
   - K263A1 자주발칸: 알루미늄 상자 궤도 차체 + 6열 20mm 발칸 포탑 + 사격 레이더.
   - K30 비호복합: 서방식 자주대공포 포탑 양옆에 신궁 2연장 발사관.
   - 120mm 자주박격포: K808 차체 + 열린 지붕 박격포.
   - KUH-1 수리온: 수송헬기를 휴이 대신 수리온으로(네 날 로터, 바퀴 착륙장치, 미닫이 문, 쌍발 엔진). */
function vxK2(K,n){const {B,C,Cx,P,PT,G}=K;
  for(const s of [-1,1])K.track({xf:3.3,yf:.7,rf:.38,xr:-3.45,yr:.74,rr:.42,gf:2.85,gr:-2.95,w:.64,z:s*1.55,t:.08,nw:6,rw:.36,ret:[2.0,.6,-.8,-2.2],ry:1.12});
  P([[-3.8,.5],[3.4,.5],[3.95,1.1],[-3.85,1.1]],2.3,0,0,0);
  P([[-3.95,1.08],[3.9,1.08],[4.0,1.22],[1.8,1.6],[-3.95,1.6]],3.6,0,0,0);
  for(const s of [-1,1]){B(7.1,.66,.07,.25,.82,s*1.86);for(const x of [-2.4,-1.0,.4,1.8])B(.05,.64,.03,x,.82,s*1.9,'dark');   // 측면 스커트
    B(.7,.5,.08,3.65,.88,s*1.84);K.lamp(3.9,1.2,s*1.4);B(.3,.12,.18,3.95,1.33,s*1.2,'dark');}                          // 앞 스커트·전조등·흙받이
  B(1.6,.04,2.7,-3.15,1.62,0,'dark');for(let i=0;i<7;i++)B(.06,.05,2.6,-3.85+i*.25,1.65,0,'steel');                    // 엔진 덮개 격자
  B(.7,.08,.6,2.35,1.58,0,'dark');for(const z of [-.2,0,.2])B(.06,.08,.12,2.66,1.64,z,'glass');                         // 조종수 해치·잠망경
  K.can(-3.9,1.4,1.3);K.can(-3.9,1.4,-1.3);
  K.mark(n,[-2.6,.84,1.92],'z+',.45);K.mark(n,[-2.6,.84,-1.92],'z-',.45);K.mark(n,[-3.98,1.35,0],'x-',.45);
  const tur=G(-.3,1.6,0);tur.userData.turret=1;
  // 각진 포탑: 앞은 쐐기, 뒤는 길게 늘어난 바구니(자동장전장치)
  PT([[2.6,.55],[2.3,1.62],[-1.6,1.75],[-2.0,1.5],[-3.9,1.45],[-4.05,1.1],[-4.05,-1.1],[-3.9,-1.45],[-2.0,-1.5],[-1.6,-1.75],[2.3,-1.62],[2.6,-.55]],.82,0,0,0,'body',tur);
  PT([[2.75,.5],[2.4,1.5],[1.7,1.55],[1.7,-1.55],[2.4,-1.5],[2.75,-.5]],.12,0,.82,0,'body',tur);                       // 앞 지붕 경사 장갑
  B(.7,.6,.9,2.55,.42,0,'body',tur);const gx=2.85;
  // 120mm 55구경장: 열 덮개 마디 셋 + 포구 기준 장치
  Cx(.12,1.9,gx,.42,0,'steel',tur,8);Cx(.105,1.9,gx+1.9,.42,0,'steel',tur,8);Cx(.095,1.7,gx+3.8,.42,0,'steel',tur,8);
  for(const x of [gx+1.9,gx+3.8])Cx(.125,.08,x-.04,.42,0,'dark',tur,8);B(.12,.08,.1,gx+5.45,.54,0,'dark',tur);
  for(const s of [-1,1]){B(.06,.32,.42,2.2,.55,s*1.25,'dark',tur,[0,s*.35,0]);B(.04,.22,.3,2.24,.55,s*1.25,'slat',tur,[0,s*.35,0]);}  // 레이더 경보·밀리미터파 레이더 판
  B(.55,.45,.5,1.3,1.03,-.95,'body',tur);B(.04,.3,.36,1.58,1.03,-.95,'glass',tur);                                      // 포수 조준경
  C(.16,.18,.42,.55,1.03,.85,'body',tur);C(.24,.24,.32,.55,1.4,.85,'body',tur,null,10);B(.04,.18,.28,.79,1.4,.85,'glass',tur);   // 차장 파노라마 조준경
  C(.45,.48,.14,-.6,.9,.7,'dark',tur,null,10);B(.42,.3,.36,-.3,1.08,-.55,'body',tur);K.mg(-.2,1.3,-.55,1.25,tur,true);      // 차장 해치·K6 원격 기관총
  K.smoke(1.6,.6,1.62,1,tur,4);K.smoke(1.6,.6,-1.62,-1,tur,4);
  B(1.9,.05,.05,-3.0,1.18,1.55,'slat',tur);B(1.9,.05,.05,-3.0,1.18,-1.55,'slat',tur);K.bag(-3.1,1.05,1.05,1.3,tur);K.roll(-3.6,1.05,0,2.0,tur);
  K.ant(-3.5,.82,1.2,2.2,tur);K.ant(-3.5,.82,-1.2,1.7,tur);B(.04,.45,.04,.9,1.05,0,'dark',tur);
  K.mark(n,[-1.5,.42,1.77],'z+',.5,tur);K.mark(n,[-1.5,.42,-1.77],'z-',.5,tur);K.mark(n,[-1.4,.83,0],'y',.9,tur);}

function vxK808(K,n,mortar){const {B,C,Cx,P,G}=K;
  for(const x of [2.4,1.15,-.85,-2.1])for(const s of [-1,1])K.wheel(.58,.44,x,.58,s*1.18,null,true);
  P([[-3.55,.55],[2.5,.55],[3.6,1.2],[3.6,1.35],[-3.55,1.35]],2.3,0,0,0);
  P([[-3.6,1.3],[3.6,1.3],[3.65,1.42],[2.3,2.2],[-3.6,2.2]],2.75,0,0,0);
  for(const s of [-1,1]){B(7.0,.08,.06,-.05,1.36,s*1.39,'dark');for(const x of [2.4,1.15,-.85,-2.1])B(1.0,.12,.42,x,1.24,s*1.22,'body');   // 옆 이음선·펜더
    B(.9,.85,.05,.2,1.75,s*1.39,'dark');B(.82,.78,.04,.2,1.75,s*1.41);B(.22,.14,.04,.2,2.0,s*1.43,'glass');               // 옆 비상문
    K.lamp(3.55,1.38,s*1.1);K.smoke(2.45,2.2,s*1.15,s);}
  for(const z of [-.55,-.3,-.05])B(.05,.1,.16,2.55,2.15,z,'glass');B(.85,.06,.7,2.0,2.22,-.35,'dark');                   // 조종수 잠망경·해치
  B(.04,1.25,1.7,-3.62,1.35,0,'dark');B(.04,1.15,1.6,-3.64,1.35,0,'body');                                               // 뒤 램프
  K.bag(-2.6,2.38,.85,1.0);K.can(-1.7,2.42,1.15);K.roll(-3.1,2.35,-.6,1.4);
  K.ant(-3.2,2.2,1.15,2.3);K.ant(-3.2,2.2,-1.15,1.8);
  K.mark(n,[-1.2,1.95,1.42],'z+',.5);K.mark(n,[-1.2,1.95,-1.42],'z-',.5);K.mark(n,[-3.66,1.9,0],'x-',.45);
  if(mortar){// 열린 지붕 두 쪽과 120mm 박격포
    for(const s of [-1,1])B(1.8,.06,.65,-1.6,2.38,s*.95,'body',null,[s*-.9,0,0]);
    const tur=G(-1.6,2.2,0);tur.userData.turret=1;C(.55,.6,.2,0,.1,0,'dark',tur,null,10);
    const tube=G(0,.25,0,tur);tube.rotation.z=1.0;Cx(.12,2.0,-.3,0,0,'steel',tube,8);Cx(.14,.15,1.6,0,0,'dark',tube,8);B(.5,.3,.6,-.3,0,0,'dark',tube);
    return;}
  K.mark(n,[.9,2.21,.4],'y',.7);
  const tur=G(.35,2.2,.3);tur.userData.turret=1;                                                                       // K6 원격사격무기
  C(.4,.46,.2,0,.1,0,'dark',tur,null,10);B(.55,.42,.55,0,.42,0,'body',tur);K.mg(.3,.5,0,1.4,tur,true);
  B(.38,.3,.28,.1,.82,-.32,'body',tur);B(.03,.22,.2,.3,.82,-.32,'glass',tur);B(.25,.2,.2,-.25,.42,.38,'drum',tur);}

function vxKltv(K,n){const {B,C,Cx,P,G}=K;
  for(const [x,z] of [[1.5,1],[1.5,-1],[-1.4,1],[-1.4,-1]])K.wheel(.45,.36,x,.45,z*.9,null,true);
  P([[-2.35,.48],[2.3,.48],[2.38,.95],[1.25,1.12],[-2.35,1.12]],2.0,0,0,0);
  P([[-1.75,1.1],[.95,1.1],[.6,1.85],[-1.75,1.85]],1.9,0,0,0);
  for(const s of [-1,1]){B(.95,.14,.32,1.5,.98,s*.92,0);B(.95,.14,.32,-1.4,.98,s*.92,0);
    for(const x of [.2,-.75])B(.6,.36,.04,x,1.58,s*.96,'glass');B(.03,.7,.04,-.27,1.45,s*.97,'dark');B(.03,.7,.04,-1.25,1.45,s*.97,'dark');  // 4문·창
    B(.2,.06,.04,.05,1.3,s*.97,'dark');B(.2,.06,.04,-.9,1.3,s*.97,'dark');}                                              // 문 손잡이
  B(.05,.42,1.7,.78,1.5,0,'glass',null,[0,0,-.55]);B(.05,.04,1.7,.62,1.72,0,'dark',null,[0,0,-.55]);                     // 한 장 앞유리
  for(let i=0;i<7;i++)B(.04,.26,.05,2.37,.78,-.45+i*.15,'dark');B(.16,.14,1.95,2.42,.55,0,'dark');B(.1,.08,.9,2.4,.4,0,'steel');   // 그릴·범퍼·견인 고리
  for(const s of [-1,1])K.lamp(2.33,.92,s*.7);
  B(.7,.32,1.7,-2.0,1.28,0);K.can(-2.38,1.0,.6);B(.08,.6,.6,-2.4,.95,-.45,'tire');                                      // 뒤 짐칸·예비 바퀴
  K.ant(-2.2,1.12,.85,2.3);K.ant(-2.2,1.12,-.85,1.6);
  K.mark(n,[1.7,1.13,0],'y',.5);K.mark(n,[-.3,1.0,.98],'z+',.32);K.mark(n,[-.3,1.0,-.98],'z-',.32);
  const tur=G(-.5,1.85,0);tur.userData.turret=1;
  C(.55,.58,.16,0,.08,0,'dark',tur,null,10);B(.06,.5,1.0,.5,.45,0,'body',tur);for(const s of [-1,1])B(.06,.5,.5,.3,.45,s*.65,'body',tur,[0,s*.7,0]);
  B(.07,.2,.18,.51,.6,.26,'glass',tur);K.mg(.3,.62,0,1.15,tur,true);B(.2,.2,.18,0,.6,.15,'drum',tur);}

function vxK600(K,n){const {B,C,Cx,P,G}=K;
  for(const s of [-1,1])K.track({xf:3.2,yf:.7,rf:.38,xr:-3.35,yr:.74,rr:.42,gf:2.75,gr:-2.85,w:.62,z:s*1.5,t:.08,nw:6,rw:.36});
  P([[-3.7,.5],[3.3,.5],[3.85,1.1],[-3.75,1.1]],2.3,0,0,0);
  P([[-3.85,1.08],[3.8,1.08],[3.9,1.22],[1.7,1.55],[-3.85,1.55]],3.5,0,0,0);
  for(const s of [-1,1]){B(6.8,.62,.07,.2,.82,s*1.8);K.lamp(3.8,1.2,s*1.35);}
  // 앞 V자 지뢰 쟁기(톱니 날)
  const pl=G(4.35,.45,0);for(const s of [-1,1]){B(.14,.75,1.9,0,.15,s*.85,'body',pl,[0,s*.45,0]);for(let i=0;i<6;i++)B(.4,.08,.1,.25,-.2,s*(.2+i*.3),'steel',pl,[0,0,-.4]);}
  for(const s of [-1,1])B(1.0,.14,.14,-.6,.35,s*1.0,'steel',pl,[0,0,.25]);
  // 상부 구조(포탑 대신 낮은 상자)와 원격 기관총
  const tur=G(-.4,1.55,0);tur.userData.turret=1;
  B(3.4,.75,2.7,0,.38,0,'body',tur);B(.9,.5,2.4,1.9,.28,0,'body',tur,[0,0,-.45]);
  B(.4,.32,.36,.2,.92,-.6,'body',tur);K.mg(.45,.98,-.6,1.2,tur,true);C(.38,.4,.1,-.6,.8,.6,'dark',tur,null,10);
  K.smoke(1.1,.6,1.3,1,tur);K.smoke(1.1,.6,-1.3,-1,tur);
  // 오른쪽 굴삭 팔(접어 둠)
  const arm=G(.6,.8,-1.15,tur);B(2.6,.22,.25,-.6,.15,0,'body',arm,[0,0,.18]);B(1.6,.2,.22,-1.4,.55,0,'body',arm,[0,0,-.5]);B(.45,.4,.35,-2.1,.25,0,'steel',arm);
  // 뒤 통로 표지 발사기
  for(let i=0;i<3;i++)Cx(.07,.5,-1.95,.95,.9-i*.18,'dark',tur,6);
  K.ant(-1.6,.75,1.1,2.0,tur);K.mark(n,[-2.4,.86,1.86],'z+',.45);K.mark(n,[-2.4,.86,-1.86],'z-',.45);K.mark(n,[0,.76,0],'y',.8,tur);}

/* 8×8 트럭 차체: 운전실(앞) + 짐받이. 천무·천궁 공용 */
function vxTruck8(K,n){const {B}=K;B(7.6,.45,1.15,-.1,1.0,0,'dark');vxCab(K,n,2.85,'cab',2.5);
  for(const x of [2.75,1.35,-1.25,-2.55])for(const s of [-1,1])K.wheel(.58,.45,x,.58,s*1.12,null,true);
  for(const s of [-1,1]){B(1.0,.12,.5,2.05,1.25,s*1.15,'body');B(3.6,.14,.4,-1.9,1.25,s*1.15,'body');K.Cz(.28,.9,.9,1.0,s*.8,'drum');}
  B(4.9,.22,2.45,-1.5,1.32,0);K.mark(n,[-1.3,1.3,1.25],'z+',.5);K.mark(n,[-1.3,1.3,-1.25],'z-',.5);}
function vxChunmoo(K,n){const {B,G}=K;vxTruck8(K,n);
  const tur=G(-1.55,1.45,0);tur.userData.turret=1;B(1.6,.32,1.6,0,.16,0,'dark',tur);
  const box=G(0,.38,0,tur);box.rotation.z=.4;
  for(const s of [-1,1]){B(4.4,.95,1.02,0,.5,s*.55,'body',box);B(4.42,.05,1.04,0,.99,s*.55,'dark',box);
    for(let i=0;i<2;i++)for(let j=0;j<3;j++)K.Cx(.17,.04,2.2,.27+i*.46,s*.55-.3+j*.3,'dark',box,8);}                   // 239mm 6발 포드 둘
  K.mark(n,[-.6,1.01,.55],'y',.6,box);}
function vxKmsam(K,n){const {B,C,G}=K;vxTruck8(K,n);
  for(const s of [-1,1])B(.5,.6,.25,-3.7,.6,s*1.0,'steel');                                                             // 뒤 받침다리
  const tur=G(-2.9,1.45,0);tur.userData.turret=1;B(.9,.3,1.8,0,.15,0,'dark',tur);
  const box=G(0,.3,0,tur);box.rotation.z=1.25;                                                                          // 수직에 가깝게 세운 발사 상자
  B(4.0,1.15,2.1,2.0,.58,0,'body',box);B(.05,1.1,2.05,4.02,.58,0,'dark',box);
  for(let i=0;i<2;i++)for(let j=0;j<4;j++)B(.04,.42,.42,4.05,.33+i*.5,-.72+j*.48,'steel',box);                         // 유도탄 8발 뚜껑
  for(const s of [-1,1])B(4.0,.1,.1,2.0,1.17,s*1.0,'slat',box);
  K.mark(n,[2.0,.58,1.06],'z+',.6,box);K.mark(n,[2.0,.58,-1.06],'z-',.6,box);}
function vxK263(K,n){const {B,C,Cx,P,G}=K;
  for(const s of [-1,1])K.track({xf:2.3,yf:.55,rf:.3,xr:-2.35,yr:.58,rr:.32,gf:1.9,gr:-2.0,w:.42,z:s*1.18,t:.07,nw:5,rw:.3});
  P([[-2.55,.45],[2.1,.45],[2.65,1.05],[2.3,1.95],[-2.55,1.95]],2.45,0,0,0);                                          // 알루미늄 상자 차체
  for(const s of [-1,1]){K.lamp(2.5,1.15,s*.9);B(4.6,.06,.4,-.15,.98,s*1.32,'body');}
  B(.04,1.3,1.6,-2.57,1.2,0,'dark');B(.7,.06,.6,1.4,1.97,-.75,'dark');K.ant(-2.3,1.95,1.0,2.0);
  K.mark(n,[-1.2,1.4,1.24],'z+',.45);K.mark(n,[-1.2,1.4,-1.24],'z-',.45);K.mark(n,[-2.6,1.6,0],'x-',.4);
  const tur=G(-.4,1.95,0);tur.userData.turret=1;
  C(.85,.9,.45,0,.22,0,'body',tur,null,12);B(.6,.55,.6,.65,.45,0,'body',tur);
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2;Cx(.035,1.9,.9,.5+Math.sin(a)*.09,Math.cos(a)*.09,'steel',tur,5);}Cx(.13,.25,.9,.5,0,'dark',tur,8);   // 20mm 6열 발칸
  B(.5,.5,.06,-.55,.75,.6,'dark',tur);C(.3,.3,.06,-.55,.85,-.55,'dark',tur,[0,0,1.3],10);B(.08,.25,.08,-.55,.6,-.55,'dark',tur);}   // 탄통·사격 레이더
/* 비호복합: 서방식 자주대공포 포탑 양옆에 신궁 2연장 */
function vxBihoC(K,n){vxSpaa(K,n);let tur=null;K.root.traverse(o=>{if(o.userData&&o.userData.turret)tur=o;});if(!tur)return;
  for(const s of [-1,1])for(const y of [.95,1.2])K.Cx(.1,1.55,-.9,y,s*1.55,'drum',tur,8);
  for(const s of [-1,1])K.B(.3,.6,.12,-.2,1.05,s*1.42,'dark',tur);}
const ROK_VX={tank:vxK2,ifv:(K,n)=>vxK808(K,n,false),mortv:(K,n)=>vxK808(K,n,true),hmv:vxKltv,cev:vxK600,mlrs:vxChunmoo,kmsam:vxKmsam,zu:vxK263,spaa:vxBihoC};
VX_BUILD.kmsam=vxKmsam;   // 국군 전용이지만, 진열장이나 기본 세력에서 불려도 모형이 있게
{const _vt=vxTemplate;vxTemplate=function(ty,n){if(!isRok(n)||!ROK_VX[ty])return _vt(ty,n);
  const key='rok|'+ty+'|'+n;V3.vxT=V3.vxT||new Map();if(V3.vxT.has(key))return V3.vxT.get(key);
  const K=vxKit();ROK_VX[ty](K,n);const g=vxBake(K.root,n);V3.vxT.set(key,g);return g;};}

/* ---------- KUH-1 수리온 ---------- */
const SUR_ST=[[5.3,1.4,.12,.12,2],[4.95,1.45,.58,.6,2.2],[4.35,1.6,.92,.98,2.6],[3.4,1.7,1.08,1.12,3.6],[1.5,1.75,1.12,1.16,4.6],[-1.9,1.8,1.12,1.16,5],[-3.0,2.0,.85,.95,3.5],[-3.9,2.3,.5,.55,2.6],[-7.2,2.5,.3,.32,2.2],[-10.2,2.65,.18,.2,2]];
function acSurionTpl(){if(ACM.kuh)return ACM.kuh;const T=V3.T,M=acMats();const g=new T.Group();const S=ACM.kuhM||(ACM.kuhM=M.ah.clone());S.color.set('#4b5440');
  acMesh(g,acLoft(SUR_ST,{seg:20}),S);
  acMesh(g,acLoft(SUR_ST,{x0:5.1,x1:3.3,a0:.35,a1:2.79,seg:10,sc:1.02}),M.glass,0,0,0,false);                           // 넓은 앞유리
  for(const [a0,a1] of [[.25,1.05],[2.09,2.89]])acMesh(g,acLoft(SUR_ST,{x0:3.25,x1:2.3,a0,a1,seg:4,sc:1.02}),M.glass,0,0,0,false);   // 조종석 문 창
  for(const [a0,a1] of [[-.55,.9],[2.24,3.69]])acMesh(g,acLoft(SUR_ST,{x0:1.8,x1:-.6,a0,a1,seg:6,sc:1.015}),M.inside,0,0,0,false);  // 열린 미닫이 문 안쪽
  for(const s of [-1,1]){acMesh(g,new T.BoxGeometry(1.5,1.35,.06),S,-1.45,1.8,s*1.24);acMesh(g,new T.BoxGeometry(.45,.4,.07),M.glass,-1.45,2.05,s*1.26,false);   // 뒤로 민 문짝
    acMesh(g,new T.BoxGeometry(2.2,.45,.5),S,.2,.9,s*1.25);                                                              // 옆 스폰슨(연료·착륙장치)
    acRod(g,M.metal,[.2,.75,s*1.3],[.2,.3,s*1.45],.07,5);acMesh(g,new T.CylinderGeometry(.33,.33,.22,10),M.blk,.2,.33,s*1.5).rotation.x=Math.PI/2;}
  acRod(g,M.metal,[4.2,.9,0],[4.2,.3,0],.06,5);acMesh(g,new T.CylinderGeometry(.24,.24,.16,8),M.blk,4.2,.25,0).rotation.x=Math.PI/2;   // 앞바퀴
  // 쌍발 엔진·변속기 덮개, 배기구
  acMesh(g,acLoft([[2.2,2.82,.05,.5,3],[1.8,3.0,.35,.75,4],[-2.3,3.0,.35,.78,4],[-3.2,2.85,.2,.5,3]],{seg:12}),S);
  for(const s of [-1,1])acRod(g,M.nozzle,[-2.7,2.95,s*.5],[-3.4,3.05,s*.8],.18,8);
  acRod(g,M.metal,[0,3.3,0],[0,3.85,0],.14,8);acRotor(g,0,3.9,7.9,4,.6);
  // 꼬리: 수직핀, 수평 안정판, 오른쪽 네 날 꼬리 로터
  acMesh(g,acPlate([[-9.4,2.4],[-10.4,4.1],[-11.0,4.1],[-10.5,2.3]],.22),S);acMesh(g,new T.BoxGeometry(.7,.08,3.0),S,-9.0,2.6,0);
  acTail(g,-10.7,3.75,.35,1.5,4);acRod(g,M.blk,[2.9,2.6,0],[2.5,2.95,0],.03,4);
  g.traverse(m=>{if(m.isMesh){m.userData.keepGeo=1;m.userData.keepMat=1;}});return ACM.kuh=g;}
function acSurion(n){const T=V3.T,M=acMats();const root=new T.Group();const g=acSurionTpl().clone();g.scale.setScalar(MU);root.add(g);root.userData.body=g;
  const pax=[];const sol=(x,z,ry,sy,isPax)=>{const s=v3Soldier(n,'rifle');s.scale.set(12,12*sy,12);s.position.set(x,.68,z);s.rotation.y=ry;g.add(s);if(isPax)pax.push(s);return s;};
  for(const s of [-1,1]){sol(-.2,s*1.0,-s*Math.PI/2,.78);const gun=new T.Group();gun.position.set(.1,1.5,s*1.2);g.add(gun);                    // 도어건(K12)
    acMesh(gun,new T.BoxGeometry(.25,.18,.5),M.blk,0,0,0);acRod(gun,M.blk,[0,.02,0],[0,.02,s*1.1],.04,4);acRod(gun,M.metal,[0,-.1,-s*.1],[0,-.65,-s*.25],.03,4);}
  for(const [x,z] of [[1.3,-.6],[1.3,.6],[.6,-.55],[.6,.55],[-.9,-.5],[-.9,.5],[-1.6,0]])sol(x,z,(z<0?1:-1)*Math.PI/2,.72,1);
  root.userData.pax=pax;g.traverse(m=>{if(m.userData.trot)root.userData.trot=m;if(m.userData.rotor)root.userData.hub=m;});return root;}
{const _h=acHuey;acHuey=function(n){return isRok(n)?acSurion(n):_h(n);};}
