/* ===================== CAMPAIGN: 역사 전투 =====================
   실제 전투 여섯을 이 게임의 지도와 부대로 다시 짠 임무. 순서 없이 모두 열려 있다.
   임무마다 그때의 지형(도시·마을·사막·강), 계절과 날씨, 시각, 양쪽 병력 구성과 전개(증원·반격이 오는 때와 방향)를 따른다.
   - 지키는 임무(M.surv)는 제한 시간까지 버티면 성공, 핵심 거점을 오래 빼앗기면 실패.
   - 공격 임무는 브리핑의 목표를 이루면 성공.
   부대는 시대 장비 대신 이 게임의 현대 부대로 재현한다(브리핑에 적는다). 레드는 민병대 규칙(04e militia)을 따라 열상·야간 장비가 없다.
   M.bio=1: 자유 전투처럼 기후·지형·숲을 그린다(10b campPlain). 아른헴만 하령 '다리 확보'처럼 강을 직접 판다. */
const HIST_IDS=['pavlov','arnhem','bastogne','seoul','mogadishu','easting'];
CAMP_IDS.push(...HIST_IDS);
CAMP_OPS.push({id:'history',n:'역사 전투',ids:HIST_IDS,free:1,end:'역사 전투를 모두 마쳤습니다.'});

/* ---------- 도구 ---------- */
const hFoeNear=(o,R)=>G.units.some(u=>u.nat!==0&&!UT[u.type].fly&&u.hp>0&&campDist(u,o)<R);
const hMineNear=(o,R,f)=>G.units.some(u=>u.nat===0&&!UT[u.type].fly&&u.hp>0&&campDist(u,o)<R&&(!f||f(u)));
/* 건물 한 덩어리(같은 blk)의 층수를 바꾼다 */
function hFloors(r,c,f){const x0=G.map[r][c];const k=x0.blk;for(let a=0;a<N;a++)for(let b=0;b<N;b++){const x=G.map[a][b];if(x.t!=='bldg'||(k!=null?x.blk!==k:!(a===r&&b===c)))continue;x.f=f;x.bmax=8+f*3;x.bhp=x.bmax;}}
const hBldg=(r,c,f,R)=>campNear(r,c,(a,b,x)=>x.t==='bldg'&&(x.f||1)>=(f||1),R||8);
const hOpen=(r,c,R)=>campNear(r,c,(a,b,x)=>(x.t==='road'||x.t==='plaza')&&!x.br,R||8);
/* 부대 여럿: [[종류, r, c, 옵션]] */
function hPut(n,list){const out=[];for(const [t,r,c,o] of list){const u=campPut(n,t,Math.max(0,Math.min(N-1,Math.round(r))),Math.max(0,Math.min(N-1,Math.round(c))),{bldg:false,...(o||{})});if(u)out.push(u);}return out;}
/* 거점 i를 잃은 채로 몇 초 지났나(되찾으면 0). 처음 잃을 때 한 번 알린다 */
function hLost(S,i,dt,msg){S.lost=S.lost||{};if(ownObj(i)){S.lost[i]=0;return 0;}if(!S.lost[i]){if(msg)campMsg(msg);S.ever=S.ever||{};S.ever[i]=1;}S.lost[i]=(S.lost[i]||0)+dt;return S.lost[i];}
/* 탄약을 다시 채운다(보급 투하) */
function hResupply(pred){let k=0;for(const u of G.units){if(u.nat!==0||!pred(u))continue;if(typeof amMax==='function'&&amMax(u)){u.am=amMax(u);k++;}if(u.cargo!=null&&typeof CARGO!=='undefined')u.cargo=CARGO;}return k;}
/* 아군 화력 지원(포병·항공) 막기: 이번 틱부터 몇 초 */
const hNoSup=(n,s)=>{G.nats[n].supT=Math.max(G.nats[n].supT||0,(G.time||0)+(s||2));};
const hSecs=s=>`${Math.max(0,Math.ceil(s))}초`;
/* 시작할 때 부대 수(별: 잃은 차량 등) */
function hIds(pred){return G.units.filter(pred).map(u=>u.id);}
const hGone=ids=>(ids||[]).filter(id=>!G.units.some(u=>u.id===id)).length;
/* 길을 넓힌다(건물을 헐어 도로): 행 r들, 열 c0~c1 */
function hRoad(rows,c0,c1,o){for(const r of rows)for(let c=c0;c<=c1;c++){if(!inb(r,c))continue;campCell(r,c,{t:'road',ro:'h',rw:rows.length,...(o||{})});}
  G.props=(G.props||[]).filter(p=>!(rows.includes(Math.floor(p.z))&&p.x>=c0&&p.x<c1+1));}

/* ===================== 1. 파블로프의 집 ===================== */
CAMP.pavlov={no:1,op:'history',bio:1,n:'파블로프의 집',kind:'건물 사수',when:'1942년 10월 · 스탈린그라드 1월 9일 광장',seed:42927,limit:13*60,hour:15,clime:'autumn',wx:'clear',
  surv:'파블로프의 집 사수',
  nats:[{name:'소련군',full:'소련군 제13근위소총사단'},{name:'독일군',full:'독일군 제6군'}],
  brief:['1942년 9월 말, 스탈린그라드 시내 1월 9일 광장. 야코프 파블로프 중사의 분대가 광장을 내려다보는 4층 아파트를 빼앗아 들어앉았습니다. 볼가강까지는 몇 백 미터, 이 집을 내주면 독일군이 강가 나루터를 직접 쏠 수 있습니다.',
    '수비대는 광장 쪽에 지뢰와 철조망을 깔고, 창마다 기관총과 대전차총을 걸고, 뒤쪽 제분소(대대 지휘소)까지 참호를 팠습니다. 광장을 건너오는 적은 사방이 트인 곳에서 십자 사격을 받습니다.',
    '13분을 버티세요. 집을 60초 넘게 빼앗기면 실패입니다. 4분 30초와 9분에 볼가강을 건너온 증원이 제분소 쪽으로 옵니다.'],
  goals:['파블로프의 집을 13분 지키기','집을 빼앗기면 60초 안에 되찾기','(선택) 제분소 지휘소도 지키기'],
  intel:'독일군은 광장 동쪽 건물에 보병·기관총·박격포와 돌격포를 두고, 1분 30초마다 동·북·남에서 보병 중대·공병·전차를 번갈아 보냅니다. 공병은 벽을 폭파해 길을 내려 합니다. 광장의 지뢰는 차량만 터뜨립니다. 전차는 창가 기관총을 노리니 대전차팀을 위층에 두세요.',
  force:'집 안: 소총분대 3 · 기관총팀 2 · 대전차팀(대전차총). 제분소와 참호: 소총분대 2 · 기관총팀 · 공병 · 박격포. 실제 수비대는 25명 남짓, 나중에 아파나시예프 중위의 기관총 소대가 더해졌습니다. 부대는 이 게임의 현대 부대로 재현합니다.',
  stars:['임무 성공','집을 한 번도 빼앗기지 않기','제분소도 끝까지 지키기'],
  income:n=>n===0?2:0};
CAMP.pavlov.setup=function(){const m=campMid();
  // 파블로프의 집: 도심 서쪽, 4층으로. 동쪽 앞은 1월 9일 광장(트인 곳)
  const h=hBldg(m-1,m-4,3,8)||hBldg(m-1,m-4,1,10)||[m-1,m-4];hFloors(h[0],h[1],4);
  for(let r=h[0]-4;r<=h[0]+4;r++)for(let c=h[1]+2;c<=h[1]+7;c++){if(!inb(r,c))continue;const x=G.map[r][c];if(x.t==='bldg'&&x.blk===G.map[h[0]][h[1]].blk)continue;campCell(r,c,{t:'plaza',sq:1});}
  G.props=(G.props||[]).filter(p=>!(p.z>=h[0]-4&&p.z<h[0]+5&&p.x>=h[1]+2&&p.x<h[1]+8));
  const mill=hBldg(h[0]+5,h[1]-6,2,7)||hBldg(h[0]+5,h[1]-6,1,9)||[h[0]+5,h[1]-6];hFloors(mill[0],mill[1],3);
  campObjs([{r:h[0],c:h[1],name:'파블로프의 집',owner:0},{r:mill[0],c:mill[1],name:'제분소 (대대 지휘소)',owner:0}]);
  G.camp.sq={r0:h[0]-4,r1:h[0]+4,c0:h[1]+2,c1:h[1]+7};
  G.camp.st={};};
CAMP.pavlov.units=function(){const H=G.objs[0],Ml=G.objs[1],q=G.camp.sq;
  hPut(0,[['mg',H.r,H.c,{bldg:true,post:1}],['mg',H.r,H.c,{bldg:true,post:1}],['at',H.r,H.c,{bldg:true,post:1}],['rifle',H.r,H.c,{bldg:true,post:1}],['rifle',H.r,H.c,{bldg:true,post:1}],['rifle',H.r,H.c,{bldg:true}],
    ['rifle',Ml.r,Ml.c,{bldg:true,post:1}],['mg',Ml.r,Ml.c,{bldg:true,post:1}],['eng',Ml.r-1,Ml.c+1,{}],['mortar',Ml.r+1,Ml.c-2,{post:1}],['rifle',(H.r+Ml.r)/2,(H.c+Ml.c)/2,{}]]);
  // 광장 쪽 방어: 지뢰(차량용)·철조망 두 줄, 집 앞 모래주머니
  for(let r=q.r0+1;r<=q.r1-1;r+=2)campFort(0,'mine',q.c0+2.5,r+.5,0);
  for(let r=q.r0;r<=q.r1;r++)if(r%3!==1)campFort(0,'wire',q.c0+1.4,r+.5,Math.PI/2);
  for(const dz of [-1.4,-.4,.6,1.6])campFort(0,'sandbag',q.c0+.4,H.r+.5+dz,Math.PI/2);
  // 집 ↔ 제분소 참호
  const n=Math.ceil(Math.hypot(Ml.c-H.c,Ml.r-H.r)/.45);for(let i=1;i<n;i++){const t=i/n;campFort(0,'trench',H.c+.5+(Ml.c-H.c)*t,H.r+.5+(Ml.r-H.r)*t,Math.atan2(Ml.r-H.r,Ml.c-H.c));}
  // 광장 건너 독일군
  hPut(1,[['rifle',H.r-3,q.c1+2,{bldg:true,post:1}],['mg',H.r+2,q.c1+2,{bldg:true,post:1}],['rifle',H.r+4,q.c1+3,{bldg:true}],['mortar',H.r,q.c1+6,{post:1}],['tank',H.r,q.c1+5,{}],['rifle',H.r-6,q.c1+1,{}],['eng',H.r+1,q.c1+4,{}]]);
  G.nats[0].cp=4;G.nats[1].cp=0;};
{const m=26,sp=[m-12,m+12];
 CAMP.pavlov.waves=[{t:50,side:'e',span:sp,u:['rifle','rifle','mg'],msg:'독일군 보병이 광장 건너편에서 공격해 옵니다'},
  {t:150,side:'n',span:[m-14,m+6],u:['rifle','tank'],msg:'북쪽에서 돌격포를 앞세운 보병이 다가옵니다'},
  {t:230,side:'e',span:sp,u:['rifle','rifle','mg','mortar']},
  {t:320,side:'s',span:[m-14,m+6],u:['tank','rifle','at']},
  {t:410,side:'e',span:sp,u:['rifle','eng','rifle','mg'],msg:'독일군 공병이 폭약을 들고 다가옵니다'},
  {t:500,side:'e',span:sp,u:['tank','tank','rifle']},
  {t:590,side:'n',span:[m-14,m+6],u:['rifle','rifle','mg','eng']},
  {t:680,side:'e',span:sp,u:['rifle','tank','rifle','at'],msg:'독일군의 마지막 대공세입니다'}];}
CAMP.pavlov.bw=[{t:270,at:[30,3],u:['mg','rifle','at'],msg:'볼가강을 건너온 증원: 아파나시예프 중위의 기관총 소대'},{t:540,at:[30,3],u:['rifle','rifle','at'],msg:'밤사이 볼가강을 건너온 증원이 제분소에 닿았습니다'}];
CAMP_TICK.pavlov=function(C,S,dt){if(hLost(S,0,dt,'파블로프의 집이 넘어갔습니다! 60초 안에 되찾으세요')>=60)G.over={win:1,why:'파블로프의 집 함락'};};
CAMP.pavlov.stars2=(C,S,win)=>[win,win&&!(S.ever&&S.ever[0]),win&&ownObj(1)];
CAMP.pavlov.obj=function(C,S,li){const l=(S.lost&&S.lost[0])||0;
  return `<ul class="cobj">${[li(l>0?'bad':'ok',l>0?`집을 되찾기: ${hSecs(60-l)} 남음`:'파블로프의 집 지키기'),li(ownObj(1)?'ok':'bad','(선택) 제분소 지휘소')].join('')}</ul>`;};

/* ===================== 2. 아른헴 다리 ===================== */
CAMP.arnhem={no:2,op:'history',river:1,n:'머나먼 다리',kind:'교두보 사수',when:'1944년 9월 18일 09:00 · 네덜란드 아른헴 라인강 다리',seed:44917,limit:12*60,hour:9,
  surv:'다리 북단 사수',
  nats:[{name:'영국군',full:'영국군 제1공수사단 제2대대'},{name:'독일군',full:'독일군 제2SS기갑군단'}],
  brief:['마켓 가든 작전. 공수부대가 네덜란드의 다리들을 잡고, 지상의 30군단이 그 길을 따라 라인강까지 올라올 계획입니다. 존 프로스트 중령의 제2공수대대는 아른헴 다리 북단에 닿아 다리 옆 집들을 차지했습니다. 사단의 나머지는 시내에서 막혀 오지 못했습니다.',
    '아침 9시, 남쪽 나이메헌 쪽으로 갔던 그레브너 대위의 SS 정찰대대가 다리를 건너 돌아옵니다. 장갑차와 반궤도 차량이 좁은 다리 위로 줄지어 달려올 겁니다. 그 뒤로 SS 기갑척탄병과 전차가 시내 쪽에서 둘러쌉니다.',
    '대전차팀과 기관총을 다리 진입로를 내려다보는 집에 두고 12분을 버티세요. 3분 20초쯤 제3대대 C중대 일부, 7분쯤 여단 본부 병력이 다리에 닿습니다. 다리 북단을 90초 넘게 빼앗기면 실패입니다. 공병이 램프에 대전차 지뢰를 깔아 두었습니다. 실제로 프로스트 대대는 사흘 밤낮을 버텼지만 30군단은 끝내 오지 못했습니다.'],
  goals:['다리 북단을 12분 지키기','다리 북단을 빼앗기면 90초 안에 되찾기','(선택) 대대 본부와 학교를 끝까지 지키기'],
  intel:'45초 뒤 정찰대대(장갑차·반궤도 차량 7대)가 다리를 건너 돌진합니다. 2분 30초부터 북쪽·남쪽 시내에서 SS 보병이, 5분부터 전차와 돌격포가 옵니다. 강은 건널 수 없어 동쪽 적은 다리로만 옵니다. 공수부대라 차량이 없고 증원도 거의 없습니다. 탄약을 아끼세요.',
  force:'소총분대 5 · 기관총팀 2 · 대전차팀 3(PIAT·6파운드 대전차포) · 공병 2 · 박격포 1. 차량 없음. 3분 20초에 C중대 일부(소총분대 2 · 대전차팀), 7분에 여단 본부 병력(소총분대 · 기관총팀 · 대전차팀)이 합류합니다. 부대는 이 게임의 현대 부대로 재현합니다.',
  stars:['임무 성공','대대 본부와 학교를 끝까지 지키기','정찰대대 차량 5대 이상 격파'],
  income:n=>n===0?1:0};
const ARN={W:m=>[m-2,m-1,m,m+1]};
CAMP.arnhem.setup=function(){const m=campMid();const W=ARN.W(m);
  for(let r=0;r<N;r++)for(const c of W)campCell(r,c,{t:'water'});
  for(const r of [m-1,m]){for(const c of W)campCell(r,c,{t:'road',ro:'h',rw:2,br:1});
    for(const dir of [-1,1]){let c=dir<0?W[0]-1:W[3]+1;let k=0;while(inb(r,c)&&k++<8&&G.map[r][c].t!=='road'){campCell(r,c,{t:'road',ro:'h',rw:2});c+=dir;}}}
  // 다리 진입로(램프) 양옆 집: 대대 본부(북쪽 집)와 학교(남쪽)
  const hq=hBldg(m-4,W[0]-3,2,6)||[m-4,W[0]-3],sc=hBldg(m+3,W[0]-3,2,6)||[m+3,W[0]-3];hFloors(hq[0],hq[1],3);hFloors(sc[0],sc[1],3);
  campObjs([{r:m-1,c:W[0]-4,name:'다리 북단',owner:0},{r:hq[0],c:hq[1],name:'대대 본부',owner:0},{r:sc[0],c:sc[1],name:'학교 (공병 거점)',owner:0}]);
  G.camp.st={gr:[]};};
CAMP.arnhem.units=function(){const m=campMid();const W=ARN.W(m);const B=G.objs[0],HQ=G.objs[1],SC=G.objs[2];
  hPut(0,[['at',HQ.r,HQ.c,{bldg:true,post:1}],['mg',HQ.r,HQ.c,{bldg:true,post:1}],['rifle',HQ.r,HQ.c,{bldg:true,post:1}],
    ['eng',SC.r,SC.c,{bldg:true,post:1}],['eng',SC.r,SC.c,{bldg:true,post:1}],['at',SC.r,SC.c,{bldg:true,post:1}],
    ['mg',B.r-2,B.c+1,{bldg:true,post:1}],['at',B.r+3,B.c+1,{bldg:true,post:1}],['rifle',B.r,B.c,{post:1}],['rifle',B.r+1,B.c-1,{post:1}],['rifle',B.r-3,B.c-3,{bldg:true}],['rifle',B.r+5,B.c-3,{bldg:true}],['mortar',B.r,B.c-5,{post:1}]]);
  for(const dz of [-.6,.6])campFort(0,'sandbag',W[0]-3.4,m+dz,Math.PI/2);
  // 영국군 공병이 다리 진입로(램프)에 깐 대전차 지뢰
  for(const [dx,dz] of [[-.8,-.7],[-.8,.3],[-1.6,-.3],[-1.6,.7]])campFort(0,'mine',W[0]+dx,m+dz,0);
  // 남단(동쪽 강변)의 독일군
  hPut(1,[['rifle',m-3,W[3]+3,{bldg:true,post:1}],['mg',m+2,W[3]+3,{bldg:true,post:1}],['mortar',m+1,W[3]+7,{post:1}]]);
  G.nats[0].cp=4;G.nats[1].cp=0;};
{const m=26,wb=[2,21];
 CAMP.arnhem.waves=[{t:150,side:'n',span:wb,u:['rifle','rifle','mg'],msg:'북쪽 시내에서 SS 기갑척탄병이 다가옵니다'},
  {t:210,side:'s',span:wb,u:['rifle','mg','mortar']},
  {t:300,side:'n',span:wb,u:['tank','rifle','rifle'],msg:'독일군 전차가 시내 쪽에서 들어옵니다'},
  {t:390,side:'s',span:wb,u:['rifle','eng','mg']},
  {t:480,side:'e',span:[m-1,m],u:['rifle','rifle','mg'],msg:'다리 남단에서 SS 보병이 다시 건너옵니다'},
  {t:570,side:'n',span:wb,u:['spg','rifle','mg'],msg:'돌격포가 집을 하나씩 직사로 무너뜨립니다'},
  {t:660,side:'s',span:wb,u:['tank','rifle','at']}];}
CAMP.arnhem.bw=[{t:200,at:[18,1],u:['rifle','rifle','at'],msg:'제3대대 C중대 일부가 시내를 뚫고 다리에 닿았습니다'},{t:420,at:[30,1],u:['rifle','mg','at'],msg:'여단 본부 방위소대와 공병 일부가 다리 쪽 집들로 들어왔습니다'}];
CAMP_TICK.arnhem=function(C,S,dt){
  // 그레브너 정찰대대: 45초에 남쪽에서 다리 위로 한 줄로 돌진한다
  if(!S.grDone&&G.time>=45){S.grDone=1;const m=campMid();const W=ARN.W(m);const us=[];['hmv','hmv','ifv','hmv','ifv','hmv','hmv'].forEach((t,i)=>{const u=campPut(1,t,m-1+(i%2),N-2-Math.floor(i/2),{bldg:false});if(u){us.push(u);u.face=180;}});
    S.gr=us.map(u=>u.id);campMsg('SS 정찰대대가 다리 남단에서 돌진합니다! 다리 위 차량을 노리세요');
    const ob=G.objs[0];for(const u of us)try{orderMoveTo(u,ob.c+.5,ob.r+.5+((u.id%2)?.5:0));}catch(e){}}
  if(S.grDone&&!S.grEnd){const k=hGone(S.gr);if(k>=5){S.grEnd=1;campMsg(`정찰대대 차량 ${k}대 격파: 다리 위가 불타는 잔해로 막혔습니다`);}}
  if(hLost(S,0,dt,'다리 북단을 빼앗겼습니다! 90초 안에 되찾으세요')>=90)G.over={win:1,why:'다리 북단 함락'};};
CAMP.arnhem.stars2=(C,S,win)=>[win,win&&ownObj(1)&&ownObj(2),win&&hGone(S.gr)>=5];
CAMP.arnhem.obj=function(C,S,li){const l=(S.lost&&S.lost[0])||0;const k=hGone(S.gr);
  return `<ul class="cobj">${[li(l>0?'bad':'ok',l>0?`다리 북단 되찾기: ${hSecs(90-l)} 남음`:'다리 북단 지키기'),li(ownObj(1)&&ownObj(2)?'ok':'bad','(선택) 대대 본부·학교'),li(k>=5?'ok':'',S.grDone?`정찰대대 차량 격파 ${k}/${S.gr.length}`:'정찰대대가 곧 다리를 건너옵니다')].join('')}</ul>`;};

/* ===================== 3. 바스토뉴 ===================== */
CAMP.bastogne={no:3,op:'history',bio:1,n:'포위된 바스토뉴',kind:'포위 방어',when:'1944년 12월 22일 09:00 · 벨기에 아르덴 바스토뉴',seed:44122,limit:16*60,hour:9,layout:'country',clime:'winter',relief:'hills',wx:'fog',tflow:'fixed',
  nats:[{name:'미군',full:'미군 제101공수사단'},{name:'독일군',full:'독일군 제47기갑군단'}],
  brief:['벌지 전투. 아르덴 숲을 뚫고 나온 독일군이 일곱 갈래 길이 모이는 마을 바스토뉴를 에워쌌습니다. 안에는 제101공수사단과 제10기갑사단의 전투단 몇이 갇혀 있습니다. 탄약과 의약품이 모자라고, 짙은 겨울 안개 탓에 비행기가 뜨지 못합니다.',
    '독일군이 항복을 권했고, 매콜리프 준장은 한 마디로 답했습니다. "NUTS!(어림없다)". 이제 사방에서 공격이 옵니다. 시내 교차로를 지키고, 바깥 마을 샹과 마르비에서 적을 늦추세요.',
    '7분쯤 날씨가 개면 수송기가 탄약을 떨어뜨리고 포병·항공 지원을 부를 수 있습니다. 11분쯤 패튼의 제4기갑사단 선봉이 남쪽에서 포위망을 뚫고 들어옵니다. 그 선봉이 시내 교차로에 닿을 때 교차로가 우리 손에 있으면 성공입니다.'],
  goals:['바스토뉴 시내 교차로 지키기 (45초 넘게 빼앗기면 실패)','날씨가 갤 때까지 버티기: 보급 투하','제4기갑사단 선봉과 시내 교차로에서 만나기'],
  intel:'독일군 국민척탄병과 기갑교도사단이 동·북·남·서 모든 방향에서 번갈아 옵니다. 8분 40초쯤 크리스마스 공세: 기갑척탄병사단 전차가 북서쪽 샹으로 들어옵니다. 눈 덮인 들판은 길 밖 이동이 느리고, 안개 속에선 60m 앞도 잘 안 보입니다. 날씨가 개기 전엔 포병·항공 지원을 부를 수 없습니다(포탄을 아껴야 했습니다).',
  force:'공수 소총분대 4 · 기관총팀 2 · 대전차팀 2 · 박격포 2 · 공병 · 자주포 1, 제10기갑사단 전투단 전차 2 · 장갑차 1. 바깥 마을에 소총·기관총·대전차팀. 부대는 이 게임의 현대 부대로 재현합니다.',
  stars:['임무 성공','샹·마르비를 끝까지 지키기','잃은 부대 6개 이하'],
  income:n=>n===0?(G.camp&&G.camp.st.drop?3:1):0};
CAMP.bastogne.setup=function(){const m=campMid();
  // 시내 교차로: 가운데 마을에서 길이 가장 많이 만나는 칸
  let best=null,bs=-1;for(let r=m-6;r<=m+6;r++)for(let c=m-6;c<=m+6;c++){const x=G.map[r][c];if(x.t!=='road')continue;let s=0;for(const [a,b] of [[0,1],[0,-1],[1,0],[-1,0]])if(inb(r+a,c+b)&&G.map[r+a][c+b].t==='road')s++;s=s*10-Math.hypot(r-m,c-m);if(s>bs){bs=s;best=[r,c];}}
  const X=best||[m,m];
  const pick=(r,c)=>campNear(r,c,(a,b,x)=>x.t==='bldg',6)?(campNear(r,c,(a,b,x)=>(x.t==='road'||x.t==='plaza')&&[[0,1],[0,-1],[1,0],[-1,0]].some(([p,q])=>inb(a+p,b+q)&&G.map[a+p][b+q].t==='bldg'),6)||campNear(r,c,(a,b,x)=>x.t!=='water'&&x.t!=='bldg',6)):campNear(r,c,(a,b,x)=>x.t!=='water'&&x.t!=='bldg',6);
  const ch=pick(m-11,m-11)||[m-11,m-11],mv=pick(m+11,m+11)||[m+11,m+11];
  campObjs([{r:X[0],c:X[1],name:'바스토뉴 시내 교차로',owner:0},{r:ch[0],c:ch[1],name:'샹 (북서쪽 마을)',owner:0},{r:mv[0],c:mv[1],name:'마르비 (남동쪽 마을)',owner:0}]);
  G.camp.st={};};
CAMP.bastogne.units=function(){const X=G.objs[0],Ch=G.objs[1],Mv=G.objs[2];
  hPut(0,[['rifle',X.r-1,X.c-1,{bldg:true,post:1}],['rifle',X.r+1,X.c+1,{bldg:true}],['rifle',X.r-2,X.c+2,{}],['rifle',X.r+2,X.c-2,{}],['mg',X.r,X.c+1,{bldg:true,post:1}],['mg',X.r+1,X.c-1,{bldg:true}],
    ['at',X.r-1,X.c+2,{}],['at',X.r+2,X.c+1,{}],['mortar',X.r,X.c-3,{post:1}],['mortar',X.r+1,X.c-4,{post:1}],['eng',X.r-1,X.c-2,{}],['spg',X.r+3,X.c-4,{post:1}],
    ['tank',X.r-2,X.c,{}],['tank',X.r+2,X.c,{}],['ifv',X.r,X.c-2,{}],
    ['rifle',Ch.r,Ch.c,{bldg:true,post:1}],['mg',Ch.r+1,Ch.c+1,{post:1}],['rifle',Mv.r,Mv.c,{bldg:true,post:1}],['at',Mv.r-1,Mv.c-1,{post:1}]]);
  for(const o of [Ch,Mv])for(const [dx,dz] of [[-.8,-.8],[.8,.8],[.8,-.8]])campFort(0,'trench',o.c+.5+dx,o.r+.5+dz,Math.PI/4);   // 언 땅에 판 개인호
  // 포위망: 동쪽 숲 가장자리의 독일군
  hPut(1,[['rifle',X.r-3,N-6,{}],['mg',X.r+2,N-5,{post:1}],['mortar',X.r,N-4,{post:1}],['rifle',4,X.c+4,{}],['rifle',N-5,X.c-3,{}],['spg',X.r+3,N-2,{post:1}]]);
  G.nats[0].cp=4;G.nats[1].cp=0;};
CAMP.bastogne.waves=[{t:40,side:'e',u:['rifle','rifle','mg'],msg:'동쪽 비조리 쪽에서 국민척탄병이 공격합니다'},
  {t:110,side:'n',span:[10,40],u:['rifle','rifle','mg','mortar']},
  {t:180,side:'w',span:[10,40],u:['rifle','rifle','at'],msg:'서쪽도 막혔습니다: 독일군이 사방에서 옵니다'},
  {t:250,side:'s',span:[10,40],u:['tank','tank','rifle','rifle'],msg:'남쪽에서 기갑교도사단 전차가 다가옵니다'},
  {t:330,side:'e',u:['tank','rifle','mg','at']},
  {t:420,side:'n',span:[10,40],u:['rifle','rifle','mg']},
  {t:520,side:'w',span:[2,20],u:['tank','tank','tank','rifle','rifle','rifle'],msg:'크리스마스 공세: 독일 전차가 북서쪽 샹으로 밀고 들어옵니다'},
  {t:600,side:'s',span:[10,40],u:['rifle','mg','at']},
  {t:680,side:'e',u:['tank','tank','rifle','rifle']}];
const BAST={drop:420,relief:660};
CAMP.bastogne.bw=[{t:BAST.relief,at:[48,2],u:['tank','tank','tank','ifv','rifle','rifle'],msg:'제4기갑사단 선봉(에이브럼스 중령)이 남쪽 아스누아에서 포위망을 뚫고 들어옵니다'}];
CAMP_TICK.bastogne=function(C,S,dt){const t=G.time||0;
  if(!S.nuts&&t>=200){S.nuts=1;campMsg('독일군의 항복 권고에 매콜리프 준장이 답했습니다: "NUTS!"');}
  if(!S.drop){hNoSup(0);if(t>=BAST.drop){S.drop=1;G.wx='clear';const k=hResupply(()=>true);G.nats[0].cp+=10;G.nats[0].supT=0;
    campMsg(`날씨가 갰습니다: C-47 수송기가 낙하산으로 탄약을 떨어뜨립니다(${k}개 부대 재보급) · 포병·항공 지원 가능`);try{sfx('build');}catch(e){}bump();}}
  if(t>=BAST.relief&&!S.relief){S.relief=1;S.rel=G.units.filter(u=>u.nat===0&&(u.type==='tank'||u.type==='ifv')&&u.c<=4&&u.r>=N-10).map(u=>u.id);}
  const X=G.objs[0];
  if(S.relief&&ownObj(0)&&G.units.some(u=>S.rel.includes(u.id)&&campDist(u,X)<4))G.over={win:0,why:'포위 돌파: 제4기갑사단과 연결'};
  else if(hLost(S,0,dt,'시내 교차로를 빼앗겼습니다! 45초 안에 되찾으세요')>=45)G.over={win:1,why:'바스토뉴 함락'};};
// 선봉은 곧장 시내 교차로로 간다(직접 지휘라도: 실제로 에이브럼스는 멈추지 않고 밀고 들어왔다)
{const _t=CAMP_TICK.bastogne;CAMP_TICK.bastogne=function(C,S,dt){_t(C,S,dt);if(!S.rel||G.over)return;S.relT=(S.relT||0)+dt;if(S.relT<3)return;S.relT=0;const X=G.objs[0];
  for(const u of G.units)if(S.rel.includes(u.id)&&!(u.path&&u.path.length)&&campDist(u,X)>3)try{orderMoveTo(u,X.c+.5,X.r+.5);}catch(e){}};}
CAMP.bastogne.stars2=(C,S,win,t,loss)=>[win,win&&ownObj(1)&&ownObj(2),win&&loss<=6];
CAMP.bastogne.obj=function(C,S,li){const t=G.time||0;const l=(S.lost&&S.lost[0])||0;
  return `<ul class="cobj">${[li(l>0?'bad':'ok',l>0?`시내 교차로 되찾기: ${hSecs(45-l)} 남음`:'시내 교차로 지키기'),
    li(S.drop?'ok':'',S.drop?'보급 투하 완료 · 화력 지원 가능':`날씨가 갤 때까지 ${fmtT(BAST.drop-t)} (지원 사격 불가)`),
    li('',S.relief?'제4기갑사단 선봉을 시내 교차로에서 맞기':`제4기갑사단 도착까지 ${fmtT(BAST.relief-t)}`),li(ownObj(1)&&ownObj(2)?'ok':'bad','(선택) 샹·마르비 지키기')].join('')}</ul>`;};

/* ===================== 4. 서울 수복 ===================== */
CAMP.seoul={no:4,op:'history',bio:1,n:'서울 수복',kind:'시가지 돌파',when:'1950년 9월 25일 07:00 · 서울 마포에서 중앙청까지',seed:50925,limit:16*60,hour:7,clime:'autumn',wx:'clear',tflow:'fixed',
  nats:[{name:'유엔군',full:'미 제1해병사단 · 국군 제17연대'},{name:'북한군',full:'북한군 제25여단 · 제78연대'}],
  brief:['인천에 상륙한 해병대가 한강을 건너 서울로 들어갑니다. 북한군은 마포에서 서울역, 중앙청으로 이어지는 큰길을 200m마다 바리케이드로 막았습니다. 쌀가마니와 흙자루를 사람 키만큼 쌓고, 그 뒤에 대전차포와 기관총을 두고, 앞에는 지뢰를 묻었습니다.',
    '해병대의 방식은 바리케이드 하나씩입니다. 박격포와 전차포로 바리케이드 뒤를 두드리고, 공병이 지뢰를 걷고, 전차가 자루 더미를 밀어 무너뜨리는 동안 보병이 양옆 건물을 한 채씩 쓸어 나갑니다. 큰길 한가운데로만 몰려가면 대전차포에 당합니다.',
    '마포 바리케이드와 서울역 바리케이드를 넘어 중앙청을 점령하고, 둘레를 쓸어 60초를 지키면 중앙청에 다시 국기가 오릅니다.'],
  goals:['마포 바리케이드 돌파','서울역 바리케이드 돌파','중앙청 점령 뒤 60초 지키기 (둘레 3칸 안에 적이 있으면 멈춤)'],
  intel:'바리케이드마다 기관총 진지·대전차팀·소총분대가 있고 양옆 건물에 저격수가 숨습니다. 중앙청엔 수비대와 박격포, 전차(T-34)가 있습니다. 3분·6분·9분쯤 북한군이 북쪽·남쪽 골목과 동쪽에서 역습합니다. 밤에는 전차를 앞세운 역습도 왔습니다.',
  force:'해병 소총분대 6 · 공병 2 · 전차 3(M26) · 공병전차(불도저) · 기관총팀 2 · 박격포 2. 5분·10분에 해병 증원이 서쪽에서 옵니다. 부대는 이 게임의 현대 부대로 재현합니다.',
  stars:['임무 성공','두 바리케이드를 끝까지 쥐고 있기','12분 안에 끝내기'],
  income:n=>n===0?3:0};
const SEOUL={bar:m=>[m-9,m+1],gov:m=>[m-4,m+16]};
CAMP.seoul.setup=function(){const m=campMid();
  hRoad([m-1,m],2,N-3);   // 마포대로: 서쪽 끝에서 동쪽 끝까지 넓은 큰길
  const [cA,cB]=SEOUL.bar(m);const gv=SEOUL.gov(m);
  const g=hBldg(gv[0],gv[1],3,7)||hBldg(gv[0],gv[1],1,9)||gv;hFloors(g[0],g[1],4);
  // 거점은 중앙청 건물 바로 앞마당(건물 칸이면 보병이 둘레에만 몰려 끝내 못 잡는 판이 나왔다: 오마하 마을과 같은 까닭)
  const yd=campNear(g[0],g[1],(r,c,x)=>x.t!=='bldg'&&x.t!=='water'&&[[0,1],[0,-1],[1,0],[-1,0]].some(([a,b])=>inb(r+a,c+b)&&G.map[r+a][c+b].blk!=null&&G.map[r+a][c+b].blk===G.map[g[0]][g[1]].blk),4)||g;
  campObjs([{r:m,c:cA+1,name:'마포 바리케이드',owner:1},{r:m,c:cB+1,name:'서울역 바리케이드',owner:1},{r:yd[0],c:yd[1],name:'중앙청',owner:1}]);
  G.camp.gov=g;
  G.camp.st={hold:0};};
CAMP.seoul.units=function(){const m=campMid();const [cA,cB]=SEOUL.bar(m);const Gv=G.objs[2];
  for(const c of [cA,cB]){
    for(let z=m-1+.2;z<m+1;z+=.32)campFort(1,'sandbag',c+.5,z,Math.PI/2);   // 쌀가마니·흙자루 바리케이드(바퀴 차량을 막고 전차는 밀고 지나간다)
    for(const z of [m-.6,m+.4])campFort(1,'mine',c-.6,z,0);
    for(const dz of [-1.6,1.6]){const f=campFort(1,'nest',c+1.4,m+dz,Math.PI/2);if(f)landPutAt(1,dz<0?'mg':'at',f.x,f.z,{post:1});}
    hPut(1,[['rifle',m-2,c+1,{bldg:true,post:1}],['rifle',m+1,c+2,{bldg:true,post:1}],['at',m,c+2,{post:1}],['sniper',m-3,c+3,{bldg:true,post:1}]]);}
  hPut(1,[['rifle',Gv.r,Gv.c,{bldg:true,post:1}],['mg',Gv.r,Gv.c,{bldg:true,post:1}],['rifle',Gv.r,Gv.c-1,{bldg:true,post:1}],['mortar',Gv.r-1,Gv.c+3,{post:1}],['mortar',Gv.r+2,Gv.c+3,{post:1}],['tank',m,Gv.c-2,{}],['at',m+1,Gv.c-3,{post:1}],['rifle',m-1,cB+6,{bldg:true}]]);
  hPut(0,[['rifle',m-3,2],['rifle',m-2,3],['rifle',m+1,3],['rifle',m+2,2],['rifle',m-4,4],['rifle',m+3,4],['eng',m-1,4],['eng',m,4],['tank',m-1,2],['tank',m,2],['tank',m,5],['cev',m-1,5],['mg',m-5,2],['mg',m+4,2],['mortar',m-6,1],['mortar',m+5,1]]);
  G.nats[0].cp=6;G.nats[1].cp=0;};
CAMP.seoul.waves=[{t:180,side:'n',span:[18,40],u:['rifle','rifle','mg'],msg:'북한군이 북쪽 골목에서 역습합니다'},
  {t:360,side:'s',span:[18,40],u:['tank','rifle','rifle'],msg:'북한군 전차(T-34)가 남쪽에서 역습합니다'},
  {t:540,side:'e',u:['rifle','mg','at']},
  {t:720,side:'n',span:[24,44],u:['tank','rifle','rifle','mg'],msg:'북한군 전차가 중앙청 쪽에서 역습합니다'},
  {t:880,side:'s',span:[24,44],u:['rifle','rifle','at']}];
CAMP.seoul.bw=[{t:300,u:['rifle','rifle','tank','eng'],msg:'해병 증원: 제1해병연대 3대대가 마포로 들어옵니다'},{t:600,u:['rifle','rifle','mg','at'],msg:'제7해병연대가 서쪽에서 합류합니다'}];
CAMP_TICK.seoul=function(C,S,dt){
  if(typeof landClearTick==='function')landClearTick(dt);   // 공병은 바리케이드 앞 지뢰·철조망을 스스로 걷는다(상륙 작전과 같은 규칙)
  for(const i of [0,1])if(ownObj(i)&&!(S.got&&S.got[i])){(S.got=S.got||{})[i]=1;campMsg(`${G.objs[i].name} 돌파! ${i===0?'다음은 서울역 바리케이드':'중앙청이 보입니다'}`);}
  const g=G.objs[2];const own=ownObj(2);const near=hFoeNear(g,3);S.near=near?1:0;
  if(own&&!S.taken){S.taken=1;campMsg('중앙청 점령! 둘레를 쓸고 60초를 지키세요');for(const u of G.units)if(u.nat===1)u.post=0;}
  if(!own)S.hold=0;else if(!near){S.hold+=dt;if(S.hold>=60)G.over={win:0,why:'중앙청에 다시 국기가 올랐습니다'};}};
CAMP.seoul.stars2=(C,S,win,t)=>[win,win&&ownObj(0)&&ownObj(1),win&&t<=720];
CAMP.seoul.obj=function(C,S,li){const own=ownObj(2);
  return `<ul class="cobj">${[li(ownObj(0)?'ok':'','마포 바리케이드 돌파'),li(ownObj(1)?'ok':'','서울역 바리케이드 돌파'),li(own?'ok':'','중앙청 점령'),
    li(own&&S.near?'bad':'',own?`중앙청 지키기 ${Math.floor(S.hold)}/60초${S.near?' · 둘레 3칸에 적이 있어 멈춤':''}`:'점령 뒤 60초 지키기')].join('')}</ul>`;};

/* ===================== 5. 모가디슈 ===================== */
CAMP.mogadishu={no:5,op:'history',bio:1,n:'블랙호크 다운',kind:'추락 지점 구출',when:'1993년 10월 3일 16:30 · 소말리아 모가디슈 바카라 시장',seed:93103,limit:16*60,hour:16.5,clime:'desert',wx:'clear',tflow:'normal',
  nats:[{name:'미군',full:'미군 태스크포스 레인저 · 제10산악사단'},{name:'민병대',full:'아이디드파 민병대(SNA)'}],
  brief:['고딕 서펜트 작전. 레인저와 델타가 올림픽 호텔 근처에서 아이디드파 간부들을 붙잡은 직후, 블랙호크 "슈퍼 6-1"이 RPG를 맞고 시장 골목에 떨어졌습니다. 가까이 있던 레인저 몇 분대가 추락 지점으로 달려가 둘레를 지키고 있습니다.',
    '도시 전체가 들고일어났습니다. 골목마다 민병대가 RPG와 소총을 들고 몰려오고, 길은 불타는 타이어와 잔해로 막혔습니다. 제10산악사단과 말레이시아·파키스탄군의 구출 호송대가 서쪽 경기장에서 출발합니다.',
    '추락 지점을 지키며 호송대를 그곳까지 데려가세요. 호송대 차량이 닿으면 조종사들을 꺼내는 동안(2분 30초, 둘레 2칸에 적이 있으면 멈춤. 부서진 기체에 낀 조종사를 꺼내는 데 실제로는 밤새 걸렸습니다) 버티면 성공입니다. 추락 지점을 45초 넘게 빼앗기면 실패입니다.'],
  goals:['추락 지점 지키기 (45초 넘게 빼앗기면 실패)','구출 호송대를 추락 지점까지','조종사 수습 2분 30초 버티기'],
  intel:'민병대 소총·RPG(대전차팀)·기관총과 기관총 트럭(험비)이 1분마다 사방 골목에서 몰려옵니다. 시장 쪽 건물 지붕엔 RPG 사수가 숨어 있습니다. 길막이(모래주머니)는 바퀴 차량을 막으니 전차를 앞세우거나 돌아가세요. 곧 해가 집니다. 민병대는 야간 장비가 없지만, 이날 낮 작전이라 레인저도 야간투시경을 두고 나왔습니다. 리틀버드 공격헬기가 2분 30초마다 교대로 와서 추락 지점 위를 돕니다.',
  force:'추락 지점: 레인저·델타 소총분대 4 · 기관총팀 · 저격수(델타), 위에 리틀버드 공격헬기. 호송대: 험비 4 · 장갑차 3(말레이시아) · 전차 1(파키스탄) · 소총분대 3 · 대전차팀. 부대는 이 게임의 현대 부대로 재현합니다.',
  stars:['임무 성공','8분 안에 호송대 연결','잃은 부대 4개 이하'],
  income:n=>n===0?2:0};
CAMP.mogadishu.setup=function(){const m=campMid();
  // 모가디슈는 1~3층 돌집과 흰 회벽 가게가 빽빽한 낮은 도시(올림픽 호텔만 5층)
  landVillage(0,()=>3,(x)=>x.f<=2?'villa':'shop');
  const cs=campNear(m-3,m+9,(r,c,x)=>x.t==='road'&&[[0,1],[0,-1],[1,0],[-1,0]].some(([a,b])=>inb(r+a,c+b)&&G.map[r+a][c+b].t==='bldg'),8)||hOpen(m-3,m+9,10)||[m-3,m+9];
  const ht=hBldg(m+4,m+5,3,7)||[m+4,m+5];hFloors(ht[0],ht[1],5);
  const st=campNear(m,3,(r,c,x)=>x.t==='plaza'||x.t==='road',6)||[m,3];
  campObjs([{r:cs[0],c:cs[1],name:'슈퍼 6-1 추락 지점',owner:0},{r:ht[0],c:ht[1],name:'올림픽 호텔',owner:1},{r:st[0],c:st[1],name:'국립 경기장',owner:0}]);
  G.camp.st={rec:0,gsN:0};};
CAMP.mogadishu.units=function(){const m=campMid();const Cs=G.objs[0],Ht=G.objs[1];
  hPut(0,[['rifle',Cs.r,Cs.c,{post:1}],['rifle',Cs.r-1,Cs.c+1,{bldg:true,post:1}],['rifle',Cs.r+1,Cs.c-1,{bldg:true}],['mg',Cs.r+1,Cs.c+1,{bldg:true,post:1}],['sniper',Cs.r-1,Cs.c-1,{bldg:true,post:1}],['rifle',Cs.r,Cs.c+1,{post:1}]]);
  hPut(0,[['tank',m,3],['ifv',m-1,2],['ifv',m+1,2],['ifv',m-2,3],['hmv',m+2,3],['hmv',m-3,2],['hmv',m+3,2],['hmv',m-4,3],['rifle',m-5,2],['rifle',m+4,2],['rifle',m+5,3],['at',m-6,2]]);
  // 길막이: 서쪽에서 추락 지점으로 가는 큰길 몇 곳에 타이어·잔해 더미(바퀴 차량을 막는다)
  let k=0;for(let c=m-6;c<=m+5&&k<4;c+=4){for(let r=2;r<N-2;r++){const x=G.map[r][c];if(x.t!=='road'||x.ro!=='h'||Math.abs(r-Cs.r)>9||(r*7+c)%3)continue;campFort(1,'sandbag',c+.5,r+.3,Math.PI/2);campFort(1,'sandbag',c+.5,r+.7,Math.PI/2);k++;break;}}
  // 민병대: 시장 둘레와 호송대 길목의 건물들
  hPut(1,[['mg',Cs.r,Cs.c+5,{bldg:true}],['rifle',Cs.r-4,Cs.c+3,{bldg:true}],['at',Cs.r+4,Cs.c+3,{bldg:true,post:1}],['rifle',Cs.r+5,Cs.c-4,{}],['at',Cs.r-5,Cs.c-3,{bldg:true,post:1}],
    ['rifle',Ht.r,Ht.c,{bldg:true,post:1}],['at',Ht.r+1,Ht.c-2,{bldg:true}],['hmv',Cs.r+5,Cs.c+4,{}],
    ['rifle',m-4,m-3,{bldg:true,post:1}],['at',m+3,m-1,{bldg:true,post:1}],['rifle',m+1,m-6,{bldg:true}],['mg',m-2,m+2,{bldg:true,post:1}],['hmv',m+6,m,{}],['at',m-7,m+2,{bldg:true,post:1}]]);
  G.nats[0].cp=4;G.nats[1].cp=0;};
CAMP.mogadishu.waves=[{t:45,side:'e',u:['rifle','at','rifle'],msg:'민병대가 시장 골목에서 추락 지점으로 몰려옵니다'},
  {t:100,side:'n',span:[14,44],u:['rifle','at','mg']},{t:160,side:'s',span:[14,44],u:['rifle','rifle','at','hmv'],msg:'기관총 트럭(테크니컬)이 다가옵니다'},
  {t:220,side:'e',u:['rifle','at','rifle','mg']},{t:280,side:'n',span:[8,40],u:['rifle','rifle','at']},{t:340,side:'s',span:[8,40],u:['at','rifle','hmv']},
  {t:400,side:'e',u:['rifle','at','rifle','rifle'],msg:'밤이 깊어 갑니다: 민병대가 더 모여듭니다'},{t:470,side:'n',span:[14,44],u:['rifle','at','mg','hmv']},
  {t:540,side:'s',span:[14,44],u:['rifle','rifle','at']},{t:620,side:'e',u:['rifle','at','mg','rifle']},{t:700,side:'n',span:[14,44],u:['rifle','at','rifle']},{t:780,side:'s',span:[14,44],u:['rifle','hmv','at']}];
const MOG={gs:150,rec:150};   // 리틀버드 두 대씩 교대로 추락 지점 위를 돈다(한 번에 45초, 2분 30초마다)
CAMP_TICK.mogadishu=function(C,S,dt){const cs=G.objs[0];
  if(G.time>=(S.gsT??2)&&typeof callGunship==='function'&&!WX[G.wx].noAir){S.gsT=G.time+MOG.gs;try{callGunship(0,cs.r,cs.c);campMsg(S.gsN++?'리틀버드가 교대해 추락 지점 위로 돌아왔습니다':'리틀버드(AH-6)가 추락 지점 위를 돌며 엄호합니다');}catch(e){}}
  if(hLost(S,0,dt,'추락 지점을 빼앗겼습니다! 45초 안에 되찾으세요')>=45){G.over={win:1,why:'추락 지점 함락'};return;}
  if(!S.link&&hMineNear(cs,2.5,u=>UT[u.type].cls==='veh')){S.link=1;S.linkT=G.time;campMsg('호송대가 추락 지점에 닿았습니다! 조종사들을 꺼내는 동안 2분 30초 버티세요');}
  S.near=hFoeNear(cs,2)?1:0;
  if(S.link&&ownObj(0)&&!S.near){S.rec+=dt;if(S.rec>=MOG.rec)G.over={win:0,why:'조종사 수습 완료: 경기장으로 철수'};}};
CAMP.mogadishu.stars2=(C,S,win,t,loss)=>[win,win&&S.linkT!=null&&S.linkT<=480,win&&loss<=4];
CAMP.mogadishu.obj=function(C,S,li){const l=(S.lost&&S.lost[0])||0;
  return `<ul class="cobj">${[li(l>0?'bad':'ok',l>0?`추락 지점 되찾기: ${hSecs(45-l)} 남음`:'추락 지점 지키기'),li(S.link?'ok':'',S.link?`호송대 연결 (${fmtT(S.linkT)})`:'구출 호송대를 추락 지점까지'),
    li(S.link&&S.near?'bad':'',S.link?`조종사 수습 ${Math.floor(S.rec)}/${MOG.rec}초${S.near?' · 둘레 2칸에 적이 있어 멈춤':''}`:`조종사 수습 ${MOG.rec}초`)].join('')}</ul>`;};

/* ===================== 6. 73 이스팅 ===================== */
CAMP.easting={no:6,op:'history',bio:1,n:'73 이스팅',kind:'사막 기갑전',when:'1991년 2월 26일 16:10 · 이라크 남부 사막',seed:91226,limit:15*60,hour:16.2,layout:'country',clime:'desert',relief:'flat',wx:'fog',tflow:'fixed',
  nats:[{name:'미군',full:'미 제2기갑수색연대 E중대'},{name:'이라크군',full:'이라크 공화국수비대 타와칼나 사단'}],
  brief:['사막의 폭풍 작전 지상전 셋째 날. 모래바람에 시야가 수백 미터로 줄어든 사막에서, 맥매스터 대위의 E중대(이글 트룹)가 지도 위 남북 좌표선 73 이스팅을 향해 동쪽으로 나아갑니다. 앞에는 공화국수비대 타와칼나 사단의 여단 진지가 있습니다.',
    '이라크군 전차와 장갑차는 모래 둑을 쌓은 진지(헐다운)에 들어앉아 서쪽을 보고 있습니다. 그러나 그들의 조준경은 모래바람을 뚫지 못합니다. 아군 전차·장갑차의 열상 조준경은 먼지 너머를 봅니다. 먼저 보고 먼저 쏘세요.',
    '70 이스팅 전초를 걷어 내고 73 이스팅 주진지와 뒤쪽 보급 집적소를 점령하면 성공입니다. 진지에 정면으로 붙기 전에 멈춰서 쏘고, 장갑차 대전차미사일과 전차가 서로 엄호하며 나아가세요.'],
  goals:['70 이스팅 전초 점령','73 이스팅 주진지 점령','보급 집적소 점령'],
  intel:'주진지에 전차 5대가 모래 둑 뒤에, 보병전투차 4대와 보병이 참호에 있습니다. 뒤엔 자주포가 있고, 5분·8분·11분쯤 사단 예비대 전차가 반격해 옵니다. 먼지 연무: 맨눈 시정 약 120m, 열상 약 170m. 이라크군은 열상 장비가 없어 맨눈으로만 봅니다. 날씨 탓에 항공 지원은 없습니다.',
  force:'전차 6(M1A1) · 장갑차 6(M3 브래들리) · 박격포 차량 · 자주포 · 정찰 소총분대 2. 6분에 옆 중대(전차 2 · 장갑차 2)가 합류합니다. 실제 E중대는 23분 만에 전차 28대 등을 부수고 한 대도 잃지 않았습니다. 부대는 이 게임의 현대 부대로 재현합니다.',
  stars:['임무 성공','전차를 한 대도 잃지 않기','10분 안에 끝내기'],
  income:n=>n===0?3:0};
CAMP.easting.setup=function(){const m=campMid();
  // 사막: 생울타리·밭·숲을 걷어 내고 트인 모래땅으로. 건물은 동쪽 농가 몇 채만 남긴다
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=G.map[r][c];if(x.t==='road'&&!x.br)continue;if(x.br){campCell(r,c,{t:'plaza',sand:1});continue;}if(x.t==='bldg'&&c>=m+6&&Math.abs(r-m)<14){x.pc=null;continue;}if(x.t==='water'){campCell(r,c,{t:'plaza',sand:1});continue;}
    if(x.t==='bldg'||x.t==='park'||x.t==='plaza'||x.t==='rubble')campCell(r,c,{t:'plaza',sand:1});}   // 모래땅: 생울타리·덤불·밭이 생기지 않는다
  const ob=(r,c)=>campNear(r,c,(a,b,x)=>x.t!=='bldg'&&x.t!=='water',6)||[r,c];
  const o0=ob(m,m-5),o1=ob(m,m+8),o2=ob(m+5,m+16);
  campObjs([{r:o0[0],c:o0[1],name:'70 이스팅 전초',owner:1},{r:o1[0],c:o1[1],name:'73 이스팅 주진지',owner:1},{r:o2[0],c:o2[1],name:'보급 집적소',owner:1}]);
  G.camp.st={};};
CAMP.easting.units=function(){const m=campMid();const O0=G.objs[0],O1=G.objs[1],O2=G.objs[2];
  // 주진지: 남북으로 늘어선 전차 진지(모래 둑 두 개) + 참호
  const C1=O1.c;for(let i=0;i<5;i++){const r=m-8+i*4;campFort(1,'sandbag',C1-.2,r+.35,Math.PI/2);campFort(1,'sandbag',C1-.2,r+.65,Math.PI/2);landPutAt(1,'tank',C1+.35,r+.5,{});}
  for(let i=0;i<4;i++){const r=m-6+i*4;campFort(1,'sandbag',C1+1.3,r+.5,Math.PI/2);landPutAt(1,'bmp',C1+1.8,r+.5,{});}
  for(const dr of [-5,-1,3,7]){campFort(1,'trench',C1+.6,m+dr+.5,Math.PI/2);}
  hPut(1,[['rifle',m-5,C1+1,{post:1}],['rifle',m+3,C1+1,{post:1}],['mg',m-1,C1+1,{post:1}],['at',m+7,C1+1,{post:1}],['at',m-8,C1+2,{post:1}],
    ['bmp',O0.r-1,O0.c,{}],['rifle',O0.r+1,O0.c,{post:1}],['mg',O0.r,O0.c+1,{post:1}],
    ['spg',O2.r,O2.c+3,{post:1}],['spg',O2.r-3,O2.c+3,{post:1}],['rifle',O2.r,O2.c,{bldg:false,post:1}],['mortar',O2.r+2,O2.c-1,{post:1}]]);
  hPut(0,[['tank',m-3,2],['tank',m-1,2],['tank',m+1,2],['tank',m+3,2],['tank',m-5,2],['tank',m+5,2],['ifv',m-2,1],['ifv',m,1],['ifv',m+2,1],['ifv',m-4,1],['ifv',m+4,1],['ifv',m-6,1],['mortv',m-7,1],['spg',m+7,1],['rifle',m-8,1],['rifle',m+6,1]]);
  G.camp.st.tk=hIds(u=>u.nat===0&&u.type==='tank');
  G.nats[0].cp=4;G.nats[1].cp=0;};
CAMP.easting.waves=[{t:300,side:'e',u:['tank','bmp'],msg:'타와칼나 사단 예비대 전차가 반격해 옵니다'},{t:480,side:'e',u:['bmp','tank','rifle']},{t:660,side:'n',span:[30,48],u:['tank','bmp','rifle'],msg:'북동쪽에서 이라크군 전차가 옆을 칩니다'}];
CAMP.easting.bw=[{t:360,u:['tank','tank','ifv','ifv'],msg:'옆 중대(아이언 트룹)가 합류합니다'}];
CAMP_TICK.easting=function(C,S,dt){hNoSup(0,2);   // 모래바람: 항공 지원 없음(포병은 아래에서 따로 허용)
  if(!S.o0&&ownObj(0)){S.o0=1;campMsg('70 이스팅 전초 점령: 주진지가 열상 조준경에 잡힙니다');}
  // 새로 온 전차도 '잃지 않기'에 센다
  for(const u of G.units)if(u.nat===0&&u.type==='tank'&&!S.tk.includes(u.id))S.tk.push(u.id);
  if(ownObj(1)&&ownObj(2))G.over={win:0,why:'73 이스팅 돌파'};};
CAMP.easting.stars2=(C,S,win,t)=>[win,win&&hGone(S.tk)===0,win&&t<=600];
CAMP.easting.obj=function(C,S,li){const k=hGone(S.tk);
  return `<ul class="cobj">${[li(ownObj(0)?'ok':'','70 이스팅 전초'),li(ownObj(1)?'ok':'','73 이스팅 주진지'),li(ownObj(2)?'ok':'','보급 집적소'),li(k?'bad':'ok',`잃은 전차 ${k}`)].join('')}</ul>`;};
/* 73 이스팅: 아군 포병(자주포·박격포 차량의 자체 사격)은 쏠 수 있게 항공·포병 요청만 막는다 → hNoSup은 지휘점수로 부르는 지원만 막는다(부대 사격과 무관) */

/* ---------- AI가 아는 임무(06i-plan) ---------- */
if(typeof PLAN_M==='object'){
  PLAN_M.pavlov={side:{0:{objs:()=>[{i:0,v:40,atk:3,def:4},{i:1,v:14,atk:1,def:1.5}]},1:{objs:()=>[{i:0,v:40,atk:3,def:1},{i:1,v:14,atk:1.2,def:.5}]}}};
  PLAN_M.arnhem={side:{0:{objs:()=>[{i:0,v:40,atk:3,def:4},{i:1,v:12,atk:1,def:1.5},{i:2,v:12,atk:1,def:1.5}]},1:{objs:()=>[{i:0,v:40,atk:3,def:1},{i:1,v:12,atk:1.2,def:.5},{i:2,v:12,atk:1.2,def:.5}]}}};
  PLAN_M.bastogne={side:{0:{objs:()=>[{i:0,v:40,atk:3,def:4},{i:1,v:10,atk:.8,def:1},{i:2,v:10,atk:.8,def:1}]},1:{objs:()=>[{i:0,v:40,atk:3,def:1},{i:1,v:12,atk:1.5,def:.5},{i:2,v:12,atk:1.5,def:.5}]}}};
  PLAN_M.seoul={side:{0:{objs:()=>{const a=ownObj(0),b=ownObj(1);
      if(!a)return [{i:0,v:40,atk:3,def:0},{i:1,v:4,atk:.3,def:0},{i:2,v:2,atk:0,def:0}];
      if(!b)return [{i:0,v:8,atk:1,def:.8},{i:1,v:40,atk:3,def:0},{i:2,v:4,atk:.3,def:0}];
      return [{i:0,v:6,atk:1,def:.5},{i:1,v:8,atk:1,def:.8},{i:2,v:50,atk:3,def:2.5}];}},
    1:{objs:()=>[{i:0,v:16,atk:.6,def:1.5},{i:1,v:20,atk:.8,def:1.5},{i:2,v:40,atk:1.5,def:2.5}]}}};
  PLAN_M.mogadishu={side:{0:{objs:()=>[{i:0,v:50,atk:3,def:4},{i:1,v:2,atk:0,def:0},{i:2,v:4,atk:.5,def:.3}]},1:{objs:()=>[{i:0,v:50,atk:3,def:.5},{i:1,v:10,atk:.5,def:1.5},{i:2,v:4,atk:.4,def:0}]}}};
  PLAN_M.easting={side:{0:{objs:()=>{const a=ownObj(0);return [{i:0,v:a?6:40,atk:2,def:.5},{i:1,v:a?40:12,atk:a?3:.6,def:1},{i:2,v:a&&ownObj(1)?40:10,atk:a?1.5:.3,def:.5}];}},
    1:{objs:()=>[{i:0,v:10,atk:.4,def:1},{i:1,v:30,atk:1,def:2.5},{i:2,v:20,atk:.8,def:1.5}]}}};
}

/* ---------- 73 이스팅: 열상 조준경이 먼지를 뚫는다 ----------
   먼지 연무 속 명중 보정(날씨 ×.88)은 아군 열상 장비(전차·장갑차)에겐 거의 없다. 시정 상한은 06y2-sight가 이미 열상과 맨눈을 나눈다. */
{const _eh=envHit;envHit=function(a,d){const k=_eh(a,d);if(G&&G.camp&&G.camp.id==='easting'&&a&&a.nat===0&&(a.type==='tank'||a.type==='ifv'))return Math.max(k,.97);return k;};}

/* ---------- 설정 화면: 역사 전투 목록 ---------- */
if(typeof showSetup==='function'){const _ss=showSetup;showSetup=function(){const r=_ss.apply(this,arguments);const el=typeof document!=='undefined'&&document.getElementById('camp-hist');if(el)el.innerHTML=campList('history');return r;};}
