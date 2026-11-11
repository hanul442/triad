/* ===================== CAMPAIGN: 하령 작전 =====================
   가상의 현대 내전. 하령시를 두고 연방군(블루, 플레이어)과 공화국군(레드)이 싸운다.
   임무 세 개가 차례로 열린다: 대사관 철수 → 다리 확보 → 방송국 탈환.
   임무마다 고정 시드 지도에 손을 대고(강·다리·대사관), 부대와 방어물을 미리 놓고, 매 틱 목표를 확인한다.
   G.camp = {id, st(임무 상태), res(끝난 뒤 결과)}. 저장(save)에 그대로 실린다.
   진행 기록은 localStorage 'triad-campaign' = {임무 id: 받은 별 수}. */
const CAMP_K='triad-campaign';
const CAMP_IDS=['evac','bridge','station'];
/* 작전(임무 묶음). free=1이면 순서 없이 모두 열린다. 10c-landing이 '상륙 작전'을 더한다 */
const CAMP_OPS=[{id:'haryeong',n:'하령 작전',ids:['evac','bridge','station'],end:'하령 작전을 모두 마쳤습니다. 방송국에서 연방의 목소리가 다시 흘러나옵니다.'}];
const campOpOf=id=>CAMP_OPS.find(o=>o.ids.includes(id))||CAMP_OPS[0];
/* 세력 이름: 역사 임무는 잠시 바꾸고, 다른 판을 시작하면 되돌린다 */
const NATS_DEF=NATS.map(o=>({...o}));
function campNames(list){NATS.forEach((o,i)=>Object.assign(o,NATS_DEF[i],(list&&list[i])||{}));}
const EVAC_CAP={hmv:3,ifv:5};   // 한 번에 태우는 사람 수
const EVAC_T=3;               // 한 사람이 타는 데 걸리는 초
const EVAC_N=20;
const CAMP={
  evac:{no:1,n:'마지막 호송',kind:'대사관 철수',when:'개전 첫날 17:40 · 하령시 동부 외교가',seed:41077,limit:10*60,
    brief:['공화국군 선봉이 동쪽 강변을 넘어 시내로 들어왔습니다. 외교가의 중립국 대사관에 직원과 피란민 20명이 갇혀 있고, 경비 분대 셋이 겨우 버티고 있습니다.',
      '험비와 장갑차를 대사관 앞 승차 지점까지 몰고 가서 멈추면 사람들이 한 명씩 탑니다(험비 3명, 장갑차 5명). 한 번에 다 태울 수 없으니 여러 번 오가야 합니다. 태운 차를 서쪽 집결지로 데려오면 구출입니다.'],
    goals:['피란민 20명을 서쪽 집결지로 후송','대사관을 20초 넘게 빼앗기지 않기','피란민을 5명 이상 잃지 않기'],
    intel:'동쪽·북쪽·남쪽 골목에서 1분마다 적 증원이 들어오고, 대사관 동쪽 건물엔 적 매복조가 있습니다. 시간이 갈수록 장갑차와 대전차팀이 섞입니다. 사람을 태운 차가 부서지면 탄 사람도 잃습니다.',
    force:'험비 2 · 장갑차 1 · 소총분대 2 · 대전차팀 1 · 기관총팀 1, 대사관 경비 소총분대 3 · 기관총팀 · 대전차팀. 2분 30초·5분 30초에 아군 증원(장갑차·험비·보병)이 서쪽에서 옵니다.',
    stars:['임무 성공','피란민 20명 모두 구출','4분 안에 끝내기']},
  bridge:{no:2,n:'강을 건너라',kind:'다리 확보',when:'D+3 05:50 · 서강 중류',seed:52331,limit:14*60,
    brief:['공화국군이 시내를 가르는 서강을 방어선으로 삼았습니다. 남은 다리는 가운데 서강교와 북쪽 철교뿐이고, 공화국군 공병이 서강교 한가운데에 폭약을 걸었습니다.',
      '폭약이 터지기 전에 소총분대나 공병을 폭약 옆에 세워 해체하세요(근처 3칸 안에 적이 없어야 합니다. 공병은 18초, 소총분대는 36초 걸립니다). 그리고 동쪽 끝 교두보를 빼앗아 반격을 2분 버티면 다리는 우리 것입니다.'],
    goals:['4분 안에 서강교 폭약 해체','서강교 동단 교두보 점령','점령 뒤 공화국군 반격을 2분 버티기'],
    intel:'동쪽 강변에 모래주머니·철조망·기관총 진지가 있고, 건물 안에 저격수와 박격포가 숨어 있습니다. 강은 건널 수 없습니다. 북쪽 철교로 돌아가는 길도 있습니다.',
    force:'소총분대 3 · 공병 2 · 기관총팀 · 대전차팀 · 박격포 · 장갑차 · 전차. 2분 30초·5분 30초에 아군 증원이 옵니다.',
    stars:['임무 성공','폭약을 1분 30초 넘게 남기고 해체','잃은 부대 4개 이하']},
  station:{no:3,n:'목소리를 되찾다',kind:'거점 탈환',when:'D+6 21:10 · 도심 방송국',seed:63919,limit:15*60,
    brief:['도심 방송국을 쥔 공화국군이 연방 정부가 항복했다는 거짓 방송을 내보내고 있습니다. 방송국 둘레는 모래주머니·철조망·기관총 진지·대전차 장애물로 굳게 막혀 있습니다.',
      '방송국을 점령한 뒤 60초를 지키면 방송이 우리 손에 들어옵니다. 둘레 3칸 안에 적이 있으면 시간이 멈추고, 방송국을 빼앗기면 처음부터 다시 셉니다. 북동쪽 송신 중계소를 먼저 빼앗으면 적 포병·항공 지원이 끊깁니다.'],
    goals:['중앙 방송국 점령','점령 뒤 60초 유지 (둘레 3칸 안에 적이 있으면 멈춤)','(선택) 송신 중계소 점령: 적 화력 지원 차단'],
    intel:'방송국 건물에 소총분대·기관총팀이 자리를 지키고, 지붕엔 저격수, 뒤쪽엔 박격포와 전차가 있습니다. 정면 도로는 철조망과 대전차 장애물로 막혀 있습니다. 공병으로 철조망을 끊거나 건물을 부숴 길을 내세요.',
    force:'소총분대 4 · 공병 2 · 기관총팀 2 · 대전차팀 2 · 저격수 · 박격포 · 장갑차 2 · 전차. 3분·7분에 아군 증원이 옵니다.',
    stars:['임무 성공','송신 중계소 점령','8분 안에 끝내기']},
};

/* 캠페인 지도를 07c-camp가 따로 그리는가(하령·상륙). 역사 전투(M.bio)는 자유 전투처럼 기후·지형·숲을 그린다 */
function campPlain(){return !!(G&&G.camp)&&!(typeof CAMP!=='undefined'&&CAMP[G.camp.id]&&CAMP[G.camp.id].bio);}

/* ---------- 진행 기록 ---------- */
function campLoad(){try{if(typeof localStorage==='undefined')return {};const o=JSON.parse(localStorage.getItem(CAMP_K)||'{}');return o&&typeof o==='object'?o:{};}catch(e){return {};}}
function campRecord(id,stars){const s=campLoad();s[id]=Math.max(s[id]||0,stars);try{localStorage.setItem(CAMP_K,JSON.stringify(s));}catch(e){}return s;}
function campOpen(id){const op=campOpOf(id);const i=op.ids.indexOf(id);if(i<0)return false;return !!op.free||i===0||!!campLoad()[op.ids[i-1]];}

/* ---------- 지도·배치 도구 ---------- */
const campMid=()=>Math.round((N-1)/2);
function campNear(r0,c0,ok,R=10){for(let d=0;d<=R;d++){let best=null,bd=1e9;
    for(let r=r0-d;r<=r0+d;r++)for(let c=c0-d;c<=c0+d;c++){if(Math.max(Math.abs(r-r0),Math.abs(c-c0))!==d||!inb(r,c)||!ok(r,c,G.map[r][c]))continue;const h=Math.hypot(r-r0,c-c0);if(h<bd){bd=h;best=[r,c];}}
    if(best)return best;}return null;}
/* (r0,c0) 가까이 비어 있고 갈 수 있는 칸에 부대를 놓는다. o.bldg: true=건물 안만, false=건물 밖만. o.post: AI가 자리를 지킨다 */
function campPut(n,type,r0,c0,o={}){const busy=new Set(G.units.map(u=>key(u.r,u.c)));
  const sp=campNear(r0,c0,(r,c,x)=>mcost(type,x)<Infinity&&!busy.has(key(r,c))&&(o.bldg==null||(x.t==='bldg')===o.bldg),12);if(!sp)return null;
  const u=mkUnit(n,type,sp[0],sp[1]);if(o.post)u.post=1;u.face=o.face??(n===0?0:180);return u;}
/* 임무 거점만 남긴다: [{r,c,name,owner}] */
function campObjs(list){for(const row of G.map)for(const x of row){x.obj=null;x.lm=0;}
  G.objs=list.map((o,i)=>{const x=G.map[o.r][o.c];x.obj=i;x.owner=o.owner??null;x.lm=1;return {r:o.r,c:o.c,name:o.name};});}
/* 다 지어진 방어물을 놓는다. ry=Math.PI/2면 서쪽을 바라본다 */
function campFort(n,k,x,z,ry){G.forts=G.forts||[];if(fortCanPlace(n,k,x,z))return null;const f={id:FORT_ID++,k,nat:n,x,z,ry:ry??Math.PI/2,hp:FORT[k].hp,prog:1,paid:0};G.forts.push(f);return f;}
function campCell(r,c,o){const x=G.map[r][c];G.map[r][c]={...o,owner:null,obj:null,smoke:0,dist:x.dist};}
/* 지도 가장자리에서 들어오는 적 증원 자리 */
/* span=[a,b]: 그 가장자리에서 들어오는 칸의 범위(n·s는 열, e·w는 행). 없으면 예전 자리 */
function campEdge(side,i,span){const m=campMid();
  if(span){const [a,b]=span,k=a+((i*3)%(b-a+1));if(side==='n')return [0,k];if(side==='s')return [N-1,k];if(side==='w')return [k,0];return [k,N-1];}
  if(side==='n')return [0,m+2+((i*3)%12)];if(side==='s')return [N-1,m+2+((i*3)%12)];if(side==='w')return [m-8+((i*5)%17),0];return [m-8+((i*5)%17),N-1];}
function campMsg(m){if(G.camp)(G.camp.log=G.camp.log||[]).unshift(m);L(m);}
function campWave(w){let i=0;const out=[];for(const t of w.u){const [r,c]=campEdge(w.side,i++,w.span);const u=campPut(1,t,r,c,{bldg:false});if(u)out.push(u);}
  if(w.msg)campMsg(w.msg);return out;}
/* 아군 증원: 서쪽 가장자리 가운데쯤에 내린다 */
function campBlueWave(w){const m=campMid();const r0=w.at?w.at[0]:m,c0=w.at?w.at[1]:1;const out=[];w.u.forEach((t,i)=>{const u=campPut(0,t,r0+((i%2)?1:-1)*(1+Math.floor(i/2)*2),c0,{bldg:false});if(u)out.push(u);});
  if(w.msg)campMsg(w.msg);return out;}
const campDist=(u,o)=>Math.hypot(u.x-(o.c+.5),u.z-(o.r+.5));

/* ---------- 임무별 지도 손질·배치 ---------- */
CAMP.evac.setup=function(){const m=campMid();
  // 대사관: 동쪽 도심 가장자리의 2층 이상 건물
  const e=campNear(m,m+9,(r,c,x)=>x.t==='bldg'&&x.f>=2&&c>m+5,10)||[m,m+9];
  campObjs([{r:e[0],c:e[1],name:'대사관',owner:0}]);
  // 승차 지점: 대사관 건물 옆, 차가 설 수 있는 서쪽(집결지 쪽) 칸
  const lz=campNear(e[0],e[1]-1,(r,c,x)=>x.t!=='bldg'&&mcost('hmv',x)<Infinity&&c<=e[1],5)||campNear(e[0],e[1],(r,c,x)=>x.t!=='bldg'&&mcost('hmv',x)<Infinity,6);
  G.camp.lz={x:lz[1]+.5,z:lz[0]+.5};G.camp.st={wait:EVAC_N,saved:0,lost:0,pax:{},load:{},lostT:0};
};
CAMP.evac.units=function(){const m=campMid();const e=G.objs[0];
  for(const [t,dr] of [['hmv',-3],['hmv',-1],['ifv',1],['rifle',3],['rifle',-5],['at',5],['mg',-7]])campPut(0,t,m+dr,1,{bldg:false});
  for(const t of ['rifle','mg','rifle','at','rifle'])campPut(0,t,e.r,e.c,{face:0,bldg:true,post:1});   // 대사관 경비는 자리를 지킨다
  // 적 선봉: 동쪽 강변 쪽에서 막 들어온 참(대사관 바로 옆이나 구출 길 위에는 없다)
  for(const [t,r,c] of [['rifle',m-6,m+17],['rifle',m+6,m+17],['mg',m+1,m+19],['at',m-3,m+20],['sniper',m+8,m+16],['rifle',m+3,m+19],['hmv',m,m+20]])campPut(1,t,r,c,{bldg:false,post:t==='sniper'||t==='mg'});
  G.nats[0].cp=6;G.nats[1].cp=0;};
CAMP.evac.waves=[
  {t:40,side:'e',u:['rifle','rifle','mg']},
  {t:95,side:'n',u:['rifle','at','mg'],msg:'북쪽 골목에서 적 보병이 들어옵니다'},
  {t:150,side:'e',u:['ifv','rifle','at'],msg:'동쪽에서 적 장갑차가 다가옵니다'},
  {t:210,side:'s',u:['rifle','mg','at']},
  {t:280,side:'e',u:['tank','rifle','at'],msg:'적 전차가 외교가로 들어옵니다'},
  {t:360,side:'n',u:['ifv','rifle','rifle']},
  {t:450,side:'e',u:['tank','rifle','mg']},
];
/* 아군 증원: 정해진 시각에 서쪽에서 온다(지휘점수를 모아 사지 않아도 임무를 해낼 수 있게) */
CAMP.evac.bw=[{t:150,u:['ifv','rifle','mg'],msg:'아군 증원: 장갑차 소대가 서쪽에서 들어옵니다'},{t:330,u:['hmv','rifle','at'],msg:'아군 증원이 도착했습니다'}];
/* 구출 길목 매복: 적 선봉 일부가 대사관 동쪽 건물에 들어앉아 오가는 차를 노린다
   (예전엔 적이 멀리 동쪽 끝에만 있어 관전 AI 블루가 6판 모두 3분 만에 끝냈다) */
CAMP.evac.after=function(){const m=campMid();for(const [t,r,c] of [['rifle',m-3,m+13],['mg',m+3,m+13],['at',m,m+14]])campPut(1,t,r,c,{bldg:true,post:1});};
CAMP.evac.income=n=>n===0?3:0;

CAMP.bridge.setup=function(){const m=campMid();const W=[m-2,m-1,m,m+1];   // 강: 가운데 네 줄(약 48m)
  const B=[{r:m,w:2,main:1},{r:7,w:1}];
  for(let r=0;r<N;r++)for(const c of W)campCell(r,c,{t:'water'});
  for(const b of B)for(let i=0;i<b.w;i++){const r=b.r-(b.w>1?1:0)+i;
    for(const c of W)campCell(r,c,{t:'road',ro:'h',rw:b.w,br:b.main?1:2});
    // 다리 끝에서 가장 가까운 도로까지 길을 낸다(건물을 헐어 진입로)
    for(const dir of [-1,1]){let c=dir<0?W[0]-1:W[3]+1;let k=0;while(inb(r,c)&&k++<8&&G.map[r][c].t!=='road'){campCell(r,c,{t:'road',ro:'h',rw:b.w});c+=dir;}}}
  G.camp.charge={x:m,z:m};   // 서강교(두 줄) 한가운데
  campObjs([{r:m-1,c:W[3]+2,name:'서강교 동단',owner:1},{r:7,c:W[3]+2,name:'철교 동단',owner:1}]);
  G.camp.st={charge:240,dis:0,disarmed:0,left:0,counter:0,hold:0};};
CAMP.bridge.units=function(){const m=campMid();const E=m+3;
  for(const [t,dr] of [['rifle',-2],['rifle',0],['rifle',2],['eng',-1],['eng',1],['mg',-4],['at',4],['mortar',-6],['ifv',3],['tank',-3]])campPut(0,t,m+dr,2,{bldg:false});
  // 동쪽 강변 방어선
  for(const [t,r,c,o] of [['rifle',m-2,E+1,{post:1}],['rifle',m+1,E+2,{post:1}],['mg',m-1,E+2,{post:1}],['mg',m+3,E+1,{post:1}],['sniper',m-5,E+3,{post:1,bldg:true}],['at',m,E+4,{}],['mortar',m+2,E+7,{post:1}],['ifv',m-1,E+6,{}],
    ['rifle',7,E+1,{post:1}],['mg',8,E+2,{post:1}],['rifle',m+8,E+3,{}]])campPut(1,t,r,c,{bldg:false,...o});
  for(const [k,dz,dx] of [['sandbag',-1.6,1.2],['sandbag',.4,1.2],['nest',-.6,1.5],['wire',-.5,-.6],['sandbag',-6.6,1.2]])campFort(1,k,m+2+dx+.5,m+dz,Math.PI/2);
  G.nats[0].cp=8;G.nats[1].cp=0;};
CAMP.bridge.bw=[{t:150,u:['rifle','rifle','eng'],msg:'아군 증원: 보병 소대가 서쪽에서 들어옵니다'},{t:330,u:['ifv','rifle','at','tank'],msg:'아군 기갑 증원이 도착했습니다'}];
/* 균형(2026-11-10): 관전 AI 블루가 6판 모두 6분 안팎에 끝냈다. 폭약 시한 5→4분, 강변 뒤 수비 다섯을 더 두고,
   공화국군이 2~3분마다 증원을 보내며, 교두보 반격에 전차·보병이 더 붙는다. 같은 시드 4판: 블루 2/4(평균 11.6분) */
CAMP.bridge.after=function(){const m=campMid();const E=m+3;
  for(const [t,r,c,o] of [['rifle',m-3,E+3,{post:1,bldg:true}],['mg',m+2,E+3,{post:1,bldg:true}],['at',m-1,E+5,{}],['tank',m+1,E+8,{}],['rifle',m+4,E+5,{post:1}]])campPut(1,t,r,c,o);};
CAMP.bridge.waves=[{t:120,side:'e',u:['rifle','mg']},{t:240,side:'e',u:['ifv','rifle','at']},{t:380,side:'n',u:['rifle','rifle','mg']},{t:520,side:'e',u:['tank','rifle']}];
CAMP.bridge.income=n=>n===0?4:0;

CAMP.station.setup=function(){const m=campMid();
  const s=campNear(m,m+4,(r,c,x)=>x.t==='bldg'&&x.f>=5&&c>=m+3,8)||campNear(m,m+4,(r,c,x)=>x.t==='bldg',10);
  const y=campNear(9,m+11,(r,c,x)=>x.t==='bldg'&&x.f>=3,8)||campNear(9,m+11,(r,c,x)=>x.t!=='water',8);
  campObjs([{r:s[0],c:s[1],name:'중앙 방송국',owner:1},{r:y[0],c:y[1],name:'송신 중계소',owner:1}]);
  G.camp.st={hold:0,relay:0};};
CAMP.station.units=function(){const m=campMid();const s=G.objs[0],y=G.objs[1];
  for(const [t,dr,c] of [['rifle',-3,1],['rifle',-1,1],['rifle',1,1],['rifle',3,1],['eng',-2,2],['eng',2,2],['mg',-5,1],['mg',5,1],['at',-4,2],['at',4,2],['sniper',0,0],['mortar',-6,0],['ifv',-1,3],['ifv',1,3],['tank',0,3]])campPut(0,t,m+dr,c,{bldg:false});
  // 방송국 수비대: 건물 안 고정 + 둘레 경계
  campPut(1,'rifle',s.r,s.c,{bldg:true,post:1});campPut(1,'mg',s.r,s.c,{bldg:true,post:1});campPut(1,'sniper',s.r,s.c,{bldg:true,post:1});campPut(1,'rifle',s.r,s.c-1,{bldg:true,post:1});
  campPut(1,'mg',s.r-2,s.c-2,{bldg:false,post:1});campPut(1,'rifle',s.r+2,s.c-2,{bldg:false,post:1});campPut(1,'at',s.r,s.c-3,{bldg:false});
  campPut(1,'mortar',s.r,s.c+4,{bldg:false,post:1});campPut(1,'tank',s.r+1,s.c+3,{bldg:false});campPut(1,'aa',s.r-1,s.c+3,{bldg:false,post:1});campPut(1,'rifle',s.r+4,s.c+1,{bldg:false});
  campPut(1,'rifle',y.r,y.c,{bldg:true,post:1});campPut(1,'mg',y.r+1,y.c-1,{bldg:false,post:1});campPut(1,'ew',y.r,y.c+1,{bldg:false,post:1});
  // 방송국 앞 방어선: 서쪽 반원
  for(let i=0;i<9;i++){const a=Math.PI*(.62+i*.095);const R=2.6;const x=s.c+.5+Math.cos(a)*R,z=s.r+.5+Math.sin(a)*R;const k=i%4===1?'nest':i%2?'sandbag':'wire';
    const t=tileAt(x,z);campFort(1,t&&t.t==='road'&&i%3===0?'hedgehog':k,x,z,Math.atan2(-Math.cos(a),-Math.sin(a)));}
  for(const [dr,dc] of [[-3,-4],[3,-4]])campFort(1,'jersey',s.c+.5+dc,s.r+.5+dr,Math.PI/2);
  G.nats[0].cp=10;G.nats[1].cp=0;};
CAMP.station.waves=[
  {t:40,side:'e',u:['rifle','mg']},
  {t:100,side:'e',u:['rifle','rifle','mg','at'],msg:'공화국군 증원이 방송국으로 향합니다'},
  {t:220,side:'n',u:['ifv','rifle','rifle']},
  {t:360,side:'e',u:['tank','rifle','at','mg'],msg:'적 전차가 방송국 쪽으로 옵니다'},
  {t:520,side:'s',u:['ifv','rifle','rifle','at']},
  {t:700,side:'e',u:['tank','rifle','mg','rifle']},
];
CAMP.station.bw=[{t:180,u:['rifle','rifle','mg','eng'],msg:'아군 증원: 보병 소대가 서쪽에서 들어옵니다'},{t:420,u:['tank','ifv','rifle','rifle'],msg:'아군 기갑 증원이 도착했습니다'}];
CAMP.station.income=n=>n===0?4:0;

/* ---------- 시작 ---------- */
function campStart(id){const M=CAMP[id];if(!M)return null;
  // 역사 전투(10e)는 지도 종류·기후·고저차·날씨를 정한다(M.layout·clime·relief·wx). 하령·상륙 임무는 예전처럼 온대 평지 도시
  newGame({slots:['human','ai','none','none'],size:M.size||'m',fog:true,speed:0,scn:'camp',seed:M.seed,force:[],maxR:Math.ceil(M.limit/ROUND_S),vpWin:9999,hour:M.hour,layout:M.layout,clime:M.clime,relief:M.relief,wx:M.wx,tflow:M.tflow});
  G.camp={id,st:{},log:[]};G.wx=M.wx||'clear';campNames(M.nats);
  M.setup();
  G.navV=(G.navV||0)+1;if(typeof propCovers==='function')propCovers();
  M.units();
  if(typeof fortCovers==='function'){fortCovers();G.fortNV=(G.fortNV||0)+1;G.fortV=(G.fortV||0)+1;}
  for(const n of G.order)G.nats[n].alive=true;
  if(M.after)M.after();
  bump();return G;}

/* ---------- 매 틱 ---------- */
function campTick(dt){const C=G.camp;if(!C||G.over)return;const M=CAMP[C.id];if(!M)return;
  C.st.w=C.st.w||{};for(const w of M.waves||[]){if(C.st.w[w.t]||G.time<w.t)continue;C.st.w[w.t]=1;campWave(w);}
  C.st.bw=C.st.bw||{};for(const w of M.bw||[]){if(C.st.bw[w.t]||G.time<w.t)continue;C.st.bw[w.t]=1;campBlueWave(w);}
  if(M.land&&typeof landTick==='function')landTick(C,dt);
  CAMP_TICK[C.id](C,C.st,dt);
  // 버티기 임무(M.surv): 시간이 다 되도록 버티면 성공
  if(!G.over&&G.time>=M.limit)G.over=M.surv?{win:0,why:M.surv}:{win:1,why:'작전 시간 초과'};
  if(G.over)campEnd();}
const CAMP_TICK={
  evac(C,S,dt){const lz=C.lz;
    for(const id of Object.keys(S.pax)){if(G.units.some(u=>u.id===+id))continue;const p=S.pax[id];delete S.pax[id];delete S.load[id];if(p>0){S.lost+=p;campMsg(`피란민 ${p}명을 태운 차량이 격파됐습니다`);}}
    for(const u of G.units){if(u.nat!==0)continue;const cap=EVAC_CAP[u.type];if(!cap)continue;const p=S.pax[u.id]||0;
      const still=!(u.path&&u.path.length);
      if(S.wait>0&&p<cap&&still&&!(u.vd&&u.vd.mob)&&Math.hypot(u.x-lz.x,u.z-lz.z)<1.8){S.load[u.id]=(S.load[u.id]||0)+dt;
        if(S.load[u.id]>=EVAC_T){S.load[u.id]=0;S.wait--;S.pax[u.id]=p+1;if(S.pax[u.id]===cap||!S.wait)campMsg(`${UT[u.type].n}에 피란민 ${S.pax[u.id]}명 탑승. 서쪽 집결지로 데려가세요`);}}
      else S.load[u.id]=0;
      // 기동 불능이 된 차: 승차 지점 옆이면 사람들이 대사관으로 돌아가고, 아니면 가까이 멈춘 다른 차로 옮겨 탄다
      if(p>0&&u.vd&&u.vd.mob){if(Math.hypot(u.x-lz.x,u.z-lz.z)<2){S.wait+=p;S.pax[u.id]=0;campMsg(`${UT[u.type].n} 기동 불능: 피란민 ${p}명이 대사관으로 돌아갔습니다`);continue;}
        const o=G.units.find(v=>v!==u&&v.nat===0&&EVAC_CAP[v.type]&&!(v.vd&&v.vd.mob)&&(S.pax[v.id]||0)<EVAC_CAP[v.type]&&Math.hypot(v.x-u.x,v.z-u.z)<1.2&&!(v.path&&v.path.length));
        if(o){const k=Math.min(p,EVAC_CAP[o.type]-(S.pax[o.id]||0));S.pax[o.id]=(S.pax[o.id]||0)+k;S.pax[u.id]=p-k;campMsg(`피란민 ${k}명이 ${UT[o.type].n}으로 옮겨 탔습니다`);}continue;}
      if(p>0&&inZone(0,u.r,u.c)){S.saved+=p;S.pax[u.id]=0;campMsg(`피란민 ${p}명 후송 완료 (${S.saved}/${EVAC_N})`);try{sfx('build');}catch(e){}}}
    const e=G.objs[0];if(G.map[e.r][e.c].owner!==0&&S.wait>0){if(!S.lostT)campMsg('대사관이 넘어갔습니다! 20초 안에 되찾으세요');S.lostT+=dt;}else S.lostT=0;
    if(S.lost>=5)G.over={win:1,why:`피란민 ${S.lost}명 희생`};
    else if(S.lostT>=20)G.over={win:1,why:'대사관 함락'};
    else if(!S.wait&&!Object.values(S.pax).some(p=>p>0))G.over={win:0,why:`피란민 ${S.saved}명 구출`};},
  bridge(C,S,dt){const ch=C.charge;
    if(!S.disarmed&&!S.blown){S.charge-=dt;
      const foe=G.units.some(u=>u.nat!==0&&!UT[u.type].fly&&Math.hypot(u.x-ch.x,u.z-ch.z)<3);
      const w=G.units.filter(u=>u.nat===0&&(u.type==='eng'||u.type==='rifle')&&!(u.path&&u.path.length)&&Math.hypot(u.x-ch.x,u.z-ch.z)<.9);
      if(w.length&&!foe){S.dis=Math.min(1,S.dis+dt/(w.some(u=>u.type==='eng')?18:36));S.work=1;}else S.work=0;
      if(S.dis>=1){S.disarmed=1;S.left=Math.max(0,S.charge);campMsg('서강교 폭약 해체 완료');try{sfx('build');}catch(e){}}
      else if(S.charge<=0){campBlow();G.over={win:1,why:'서강교 폭파'};return;}}
    const bh=G.objs[0];const own=G.map[bh.r][bh.c].owner===0;
    if(S.disarmed&&own&&!S.counter){S.counter=1;campWave({side:'e',u:['tank','ifv','rifle','rifle','at','mg','tank','rifle','rifle','mg'],msg:'공화국군 반격! 교두보를 2분 지키세요'});}
    if(S.counter&&own){S.hold+=dt;if(S.hold>=120)G.over={win:0,why:'서강교 확보'};}},
  station(C,S,dt){const s=G.objs[0],y=G.objs[1];
    const relay=G.map[y.r][y.c].owner===0;if(relay&&!S.relay){S.relay=1;campMsg('송신 중계소 확보: 적의 포병·항공 지원이 끊겼습니다');}
    if(relay)G.nats[1].supT=Math.max(G.nats[1].supT||0,G.time+5);
    const own=G.map[s.r][s.c].owner===0;const near=G.units.some(u=>u.nat!==0&&!UT[u.type].fly&&campDist(u,s)<3);
    if(own&&!S.taken){S.taken=1;campMsg('방송국 점령! 둘레를 소탕하고 60초를 버티세요');for(const u of G.units)if(u.nat===1)u.post=0;}
    S.near=near?1:0;if(!own)S.hold=0;else if(!near){S.hold+=dt;if(S.hold>=60)G.over={win:0,why:'방송국 탈환'};}},
};
/* 폭약이 터져 다리가 무너진다: 다리 칸은 물이 되고 위에 있던 부대는 잃는다 */
function campBlow(){const S=G.camp.st;S.blown=1;const ch=G.camp.charge;
  for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(G.map[r][c].br===1)campCell(r,c,{t:'water'});
  G.navV=(G.navV||0)+1;if(typeof propCovers==='function'){propCovers();if(typeof fortCovers==='function')fortCovers();}
  for(const u of G.units.slice())if(!UT[u.type].fly&&tileAt(u.x,u.z)?.t==='water')kill(u,null);
  try{FXH.strike('air',Math.floor(ch.z),Math.floor(ch.x),1);}catch(e){}
  campMsg('서강교가 폭파됐습니다');bump();}

/* ---------- 끝: 별 매기기 ---------- */
function campEnd(){const C=G.camp;if(C.res)return C.res;const S=C.st,win=G.over&&G.over.win===0;const t=G.time||0,loss=G.nats[0].losses;
  const got=M0=>M0.stars2?M0.stars2(C,S,win,t,loss):null;const g0=got(CAMP[C.id]);
  const gotK={evac:[win,win&&S.saved>=EVAC_N,win&&t<=240],bridge:[win,win&&S.left>=90,win&&loss<=4],station:[win,win&&!!S.relay,win&&t<=480]};const gotA=g0||gotK[C.id];
  const n=gotA.filter(Boolean).length;C.res={win,got:gotA,n,t,loss,kills:G.nats[0].kills,kia:(G.nats[0].cas||{}).kia||0};
  if(win)campRecord(C.id,n);return C.res;}

/* ---------- 화면에 보일 목표 ---------- */
function campObjective(){const C=G&&G.camp;if(!C)return null;const M=CAMP[C.id],S=C.st;const left=fmtT(M.limit-(G.time||0));
  const li=(st,txt)=>`<li class="${st}">${txt}</li>`;let L2=[];
  if(M.obj)return {t:`${M.n} · 남은 시간 ${left}`,m:'',html:M.obj(C,S,li)};
  if(C.id==='evac'){const ride=Object.values(S.pax).reduce((a,p)=>a+p,0);
    L2=[li(S.saved>=EVAC_N?'ok':'',`피란민 후송 ${S.saved}/${EVAC_N} · 대기 ${S.wait} · 차 안 ${ride}`),
      li(S.lostT>0?'bad':'',S.lostT>0?`대사관 빼앗김: ${Math.ceil(20-S.lostT)}초 안에 되찾기`:'대사관 지키기'),li(S.lost?'bad':'',`잃은 피란민 ${S.lost}/4`)];}
  if(C.id==='bridge'){L2=[li(S.disarmed?'ok':S.charge<60?'bad':'',S.disarmed?'폭약 해체 완료':`폭약 해체 ${Math.round(S.dis*100)}%${S.work?' (작업 중)':''} · 폭발까지 ${fmtT(S.charge)}`),
      li(G.map[G.objs[0].r][G.objs[0].c].owner===0?'ok':'','서강교 동단 점령'),li(S.hold>=120?'ok':'',S.counter?`반격 버티기 ${fmtT(120-S.hold)}`:'반격 2분 버티기')];}
  if(C.id==='station'){const s=G.objs[0];const own=G.map[s.r][s.c].owner===0;
    L2=[li(own?'ok':'','중앙 방송국 점령'),li(own&&S.near?'bad':'',own?`방송국 유지 ${Math.floor(S.hold)}/60초${S.near?' · 둘레 3칸에 적이 있어 멈춤':''}`:'점령 뒤 60초 유지'),li(S.relay?'ok':'','(선택) 송신 중계소 점령')];}
  return {t:`${M.no}. ${M.n} · 남은 시간 ${left}`,m:'',html:`<ul class="cobj">${L2.join('')}</ul>`};}
/* 3D 라벨 (07-view3d v3SyncLabels가 부른다) */
function campLabels(want){const C=G&&G.camp;if(!C||typeof v3TopAt!=='function')return;const S=C.st;if(CAMP[C.id]&&CAMP[C.id].labels)CAMP[C.id].labels(C,S,want);
  if(C.id==='evac'&&S.wait>0)want.set('camp-lz',{html:`<span>피란민 ${S.wait}명 · 승차 지점</span>`,cls:'v3c',col:'#f0c45a',p:[C.lz.x,v3TopAt(C.lz.x,C.lz.z)+.5,C.lz.z]});
  if(C.id==='bridge'&&!S.disarmed&&!S.blown)want.set('camp-ch',{html:`<span>폭약 ${fmtT(S.charge)}${S.dis>0?` · 해체 ${Math.round(S.dis*100)}%`:''}</span>`,cls:'v3c',col:'#ff5a4e',p:[C.charge.x,.5,C.charge.z]});}

/* ---------- 화면: 임무 선택·브리핑·결과 ---------- */
const STAR=(on)=>`<i class="cstar${on?' on':''}" aria-hidden="true">★</i>`;
function campList(opId){const P=campLoad();const op=CAMP_OPS.find(o=>o.id===opId)||CAMP_OPS[0];
  return op.ids.map(id=>{const M=CAMP[id];const open=campOpen(id);const s=P[id]||0;
    return `<button class="btn cmis" data-act="camp:${id}" id="camp-${id}" ${open?'':'disabled'}><span class="cno">${M.no}</span><span class="cbody"><b>${M.n}</b><small>${M.kind} · ${open?M.when:'앞 임무를 마치면 열립니다'}</small></span><span class="cst" aria-label="별 ${s}개">${[0,1,2].map(i=>STAR(i<s)).join('')}</span></button>`;}).join('');}
function campBrief(id){const M=CAMP[id];if(!M||!campOpen(id))return;UI.campSel=id;const el=$('#brief');if(!el)return;
  el.querySelector('.card').innerHTML=`<p class="ckick">${campOpOf(id).n} · 임무 ${M.no} · ${M.kind}</p><h2>${M.n}</h2><p class="cwhen">${M.when}</p>
    ${M.brief.map(p=>`<p>${p}</p>`).join('')}
    <h3 class="sec">목표</h3><ol class="cgoal">${M.goals.map(g=>`<li>${g}</li>`).join('')}</ol>
    <h3 class="sec">적 정보</h3><p>${M.intel}</p>
    <h3 class="sec">아군 병력</h3><p>${M.force}</p>
    <h3 class="sec">별 · 제한 시간 ${fmtT(M.limit)}</h3><ul class="cstars">${M.stars.map(s=>`<li>${STAR(1)} ${s}</li>`).join('')}</ul>
    <div class="crow"><button class="btn" data-act="camp-back" id="b-cback">임무 선택</button><button class="btn primary" data-act="camp-go" id="b-cgo">작전 개시</button></div>`;
  $('#setup').hidden=true;el.hidden=false;const b=$('#b-cgo');if(b)b.focus();}
function campGo(id){id=id||UI.campSel;if(!campStart(id))return;const br=$('#brief');if(br)br.hidden=true;const db=$('#debrief');if(db)db.hidden=true;
  $('#setup').hidden=true;G.boot=false;clearSel();UI.sheet=false;rtStart();render();if(typeof v3HomeCam==='function')v3HomeCam(false);toast(`임무 ${CAMP[id].no} ${CAMP[id].n}: ${CAMP[id].goals[0]}`);}
function campDebrief(){const C=G&&G.camp;if(!C||typeof document==='undefined')return;const R=campEnd();const M=CAMP[C.id];const el=$('#debrief');if(!el)return;
  const op=campOpOf(C.id);const i=op.ids.indexOf(C.id),next=op.ids[i+1];
  el.querySelector('.card').innerHTML=`<p class="ckick">임무 ${M.no} · ${M.n}</p><h2 class="${R.win?'cwin':'close'}">${R.win?'임무 성공':'임무 실패'}</h2><p>${G.over.why} · ${fmtT(R.t)}</p>
    <ul class="cstars">${M.stars.map((s,j)=>`<li class="${R.got[j]?'on':''}">${STAR(R.got[j])} ${s}</li>`).join('')}</ul>
    <div class="kv"><dt>격파</dt><dd>${R.kills}</dd><dt>잃은 부대</dt><dd>${R.loss}</dd><dt>전사</dt><dd>${R.kia}</dd></div>
    <div class="crow"><button class="btn" data-act="camp-list" id="b-clist">임무 선택</button><button class="btn" data-act="camp-retry" id="b-cretry">다시 하기</button>${R.win&&next?`<button class="btn primary" data-act="camp:${next}" id="b-cnext">다음 임무</button>`:''}${R.win&&!next?`<button class="btn primary" data-act="camp-list" id="b-cend">작전 종료</button>`:''}</div>
    ${R.win&&!next?`<p>${M.endTxt||op.end}</p>`:''}`;
  el.hidden=false;}
