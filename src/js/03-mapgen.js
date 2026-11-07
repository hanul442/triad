/* ===================== MAP GEN =====================
   격자 느낌을 깬 미국 도시: 기본 바둑판 위에 도심으로 모이는 대각선 대로, 도심을 감싸는 둥근 순환로,
   군데군데 끊겨 T자로 만나는 거리, 블록 안으로 꺾여 들어가는 막다른 골목, 한가운데 원형 광장과 분수.
   블록은 도로로 갈린 덩어리라 모양이 제각각이고, 필지는 그 안에서 자라나 ㄱ자·ㄷ자 건물과 안뜰이 생긴다.
   구역: 한가운데 고층 업무지구 → 중층 상가 → 바깥 주택가. 도시는 90도 회전 대칭(4세력 공정), 가장자리 2줄은 집결지.
   칸 정보: t(지형), f(층수), blk(같은 건물 묶음), ro(도로 h·v·x·d(대각)·c(곡선)), dd(대각 방향 ±1), rw(폭), al(골목), lot(주차장), yard(마당), dist(구역) */
function inZone(n,r,c){if(n==null)return false;const e=[c<=1,c>=N-2,r<=1,r>=N-2][n];const corner=(r<=1||r>=N-2)&&(c<=1||c>=N-2);return e&&!corner;}
// 도로 줄 무늬: 앞쪽 절반만 정하고 뒤집는다. 0=블록, 1=거리, 2=대로(두 줄이 한 대로)
function genLines(rnd){const H=N/2;const st=new Array(N).fill(0);st[2]=1;let i=3,n=0;
  while(true){const left=H-1-i;const w=(n%2===1&&rnd()<.75)?2:1;
    const maxb=Math.min(7,left-w-4);if(maxb<4)break;const b=4+Math.floor(rnd()*(maxb-3));i+=b;
    for(let j=0;j<w;j++)st[i+j]=w;i+=w;n++;}
  st[H-1]=2;for(let j=0;j<H;j++)st[N-1-j]=st[j];return st;}
function genMap(seed,objPer){const rnd=mulberry(seed);const H=N/2;const mid=(N-1)/2;
  const st=genLines(rnd);const hyp=(r,c)=>Math.hypot(r-mid,c-mid);
  const can=[];for(let r=0;r<H;r++){can[r]=[];for(let c=0;c<H;c++)can[r][c]=null;}
  const isRd=(r,c)=>r>=0&&c>=0&&r<H&&c<H&&can[r][c]&&can[r][c].t==='road';
  // 집결지 둘레: 주차장과 공터
  for(let r=0;r<H;r++)for(let c=0;c<H;c++){
    if(r<2||c<2){const p=rnd();can[r][c]=p<.4?{t:'plaza',lot:1}:p<.7?{t:'plaza'}:p<.9?{t:'park'}:{t:'rubble'};}
    else if(st[r]||st[c]){const ro=st[r]&&st[c]?'x':st[r]?'h':'v';can[r][c]={t:'road',ro,rw:Math.max(st[r],st[c])};}}
  // 1) 거리 끊기: 1칸 거리의 교차로 사이 구간을 일부 지운다 → 큰 블록, T자 교차로
  const lines=[];for(let i=3;i<H-2;i++)if(st[i]&&!st[i-1])lines.push(i);
  const cross=[];for(let j=2;j<H;j++)if(st[j]&&!st[j-1])cross.push(j);
  for(const i of lines)for(const axis of [0,1])for(let q=0;q+1<cross.length;q++){if(rnd()>(st[i]===2?.2:.42))continue;
    let a=cross[q];while(st[a])a++;const b=cross[q+1];
    for(let j=a;j<b;j++)for(let w=0;w<st[i];w++){const [r,c]=axis?[j,i+w]:[i+w,j];can[r][c]=null;}}
  // 2) 대각선 대로: 바깥 모서리에서 도심 광장으로 (네 사분면이 모여 X자)
  const d0=3+Math.floor(rnd()*2);
  for(let i=d0;i<H;i++)for(const [r,c] of [[i,i],[i,i+1]]){if(c>=H)continue;const x=can[r][c];
    can[r][c]=x&&x.t==='road'&&x.ro!=='d'?{t:'road',ro:'x',rw:2}:{t:'road',ro:'d',dd:1,rw:2};}
  // 3) 둥근 순환로: 도심을 감싼다
  const R1=H*(.5+rnd()*.12);
  for(let r=2;r<H;r++)for(let c=2;c<H;c++){if(Math.abs(hyp(r,c)-R1)>.74)continue;const x=can[r][c];
    can[r][c]=x&&x.t==='road'?{t:'road',ro:'x',rw:Math.max(1,x.rw||1)}:{t:'road',ro:'c',rw:1};}
  // 4) 한가운데 원형 광장과 분수
  const R0=Math.max(2.3,H*.15);
  for(let r=2;r<H;r++)for(let c=2;c<H;c++){const h=hyp(r,c);if(h<=.8)can[r][c]={t:'water',dist:'down'};else if(h<=R0)can[r][c]={t:'plaza',dist:'down',sq:1};}
  // 5) 블록 = 도로로 갈린 덩어리. 하나씩 채운다
  let bidN=0;FILL_BID=0;const seen=new Set();
  for(let r=2;r<H;r++)for(let c=2;c<H;c++){if(can[r][c]||seen.has(r*H+c))continue;
    const comp=[];const q=[[r,c]];seen.add(r*H+c);
    while(q.length){const [a,b]=q.pop();comp.push([a,b]);for(const [p,o] of [[a-1,b],[a+1,b],[a,b-1],[a,b+1]]){if(p<2||o<2||p>=H||o>=H||can[p][o]||seen.has(p*H+o))continue;seen.add(p*H+o);q.push([p,o]);}}
    fillComp(rnd,can,comp,++bidN,mid,H,isRd);}
  // 거점: 정준 사분면 안쪽에서 서로 떨어진 칸을 고른다.
  const objs=[];let tries=0;const gap=Math.max(4,Math.round(H/4));
  while(objs.length<objPer&&tries++<900){const r=3+Math.floor(rnd()*(H-4)),c=3+Math.floor(rnd()*(H-4));const x=can[r][c];
    if(x.t==='road'||x.t==='water')continue;if(objs.some(([a,b])=>dist(a,b,r,c)<(tries<500?gap:3)))continue;if(Math.min(H-1-r,H-1-c)<1&&objs.length)continue;
    if(x.t==='bldg')x.f=Math.max(x.f,4);else{x.t='plaza';delete x.lot;}x.lm=1;objs.push([r,c]);}
  const m=[];for(let r=0;r<N;r++)m[r]=[];
  const rot=(r,c,k)=>{for(let j=0;j<k;j++){const t=r;r=c;c=N-1-t;}return [r,c];};
  for(let r=0;r<H;r++)for(let c=0;c<H;c++){const x=can[r][c];for(let k=0;k<4;k++){const [a,b]=rot(r,c,k);const y={...x,owner:null,obj:null};
      if(y.blk!=null)y.blk=y.blk*4+k;if(y.ro&&k%2&&(y.ro==='h'||y.ro==='v'))y.ro=y.ro==='h'?'v':'h';if(y.dd&&k%2)y.dd=-y.dd;m[a][b]=y;}}
  let oi=0;const names=OBJ_NAMES.slice();for(let j=names.length-1;j>0;j--){const q=Math.floor(rnd()*(j+1));[names[j],names[q]]=[names[q],names[j]];}
  const list=[];for(const [r,c] of objs)for(let k=0;k<4;k++){const [a,b]=rot(r,c,k);m[a][b].obj=oi;list.push({r:a,c:b,name:names[oi%names.length]});oi++;}
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=m[r][c];if(x.t==='bldg'){x.bmax=8+x.f*3;x.bhp=x.bmax;}x.smoke=0;}
  return {map:m,objs:list};}
/* 블록 하나 채우기. comp = 도로로 둘러싸인 칸 목록(모양이 제각각).
   구역(가운데일수록 높다)에 따라 안뜰·막다른 골목을 내고, 필지를 무작위로 자라게 해 ㄱ자·ㄷ자 건물을 만든다. */
function growPieces(rnd,cells,H,lo,hi){const free=new Set(cells.map(([r,c])=>r*H+c));const out=[];
  for(const [r0,c0] of cells.slice().sort(()=>rnd()-.5)){const s0=r0*H+c0;if(!free.has(s0))continue;const target=lo+Math.floor(rnd()*(hi-lo+1));
    const got=[s0];free.delete(s0);const fr=[s0];
    while(got.length<target&&fr.length){const i=Math.floor(rnd()*fr.length);const v=fr[i];const r=Math.floor(v/H),c=v%H;
      const nb=[[r-1,c],[r+1,c],[r,c-1],[r,c+1]].map(([a,b])=>a*H+b).filter(x=>free.has(x));
      if(!nb.length){fr.splice(i,1);continue;}const w=nb[Math.floor(rnd()*nb.length)];free.delete(w);got.push(w);fr.push(w);}
    out.push(got.map(v=>[Math.floor(v/H),v%H]));}
  return out;}
let FILL_BID=0;
function fillComp(rnd,can,comp,bid,mid,H,isRd){const n=comp.length;
  // 거리가 끊겨 아주 커진 덩어리는 몇 조각으로 나눠 따로 채운다(조각마다 공원·주차장·건물이 섞이게)
  if(n>30){for(const pc of growPieces(rnd,comp,H,14,24))fillComp(rnd,can,pc,1000+(++FILL_BID),mid,H,isRd);return;}
  let d=0;for(const [r,c] of comp)d+=Math.max(Math.abs(r-mid),Math.abs(c-mid));d=d/n/H;// 0 = 도심, 1 = 가장자리
  const dist=d<.36?'down':d<.66?'mid':'res';
  const set=(r,c,x)=>{x.dist=dist;can[r][c]=x;};
  const inC=new Set(comp.map(([r,c])=>r*H+c));const has=(r,c)=>inC.has(r*H+c);
  const p=rnd();
  // 특수 블록 (작은 덩어리는 광장·공원이 되기 쉽다)
  if(n<=2&&rnd()<.5){comp.forEach(([r,c])=>set(r,c,rnd()<.5?{t:'plaza'}:{t:'park'}));return;}
  if(p<.07){comp.forEach(([r,c])=>set(r,c,{t:rnd()<.06?'water':'park'}));return;}                                   // 공원
  if(p<.11&&dist!=='down'){comp.forEach(([r,c])=>set(r,c,rnd()<.08?{t:'rubble'}:{t:'plaza',lot:1}));return;}        // 큰 주차장
  if(p<.15){comp.forEach(([r,c])=>{const q=rnd();set(r,c,q<.55?{t:'rubble'}:{t:'bldg',f:1+Math.floor(rnd()*3),blk:bid*64});});return;}// 폭격 맞은 폐허
  const free=new Set(inC);
  // 안뜰: 사방이 같은 블록인 안쪽 칸을 비워 ㅁ자·ㄷ자 건물
  if(dist!=='res'&&n>=12){const cp=dist==='down'?.2:.45;
    for(const [r,c] of comp){let ins=true;for(let a=-1;a<=1&&ins;a++)for(let b=-1;b<=1;b++)if(!has(r+a,c+b)){ins=false;break;}
      if(ins&&rnd()<cp){set(r,c,rnd()<.3?{t:'park',yard:1}:{t:'plaza',court:1});free.delete(r*H+c);}}}
  // 막다른 골목: 길에서 블록 안으로 들어가 한 번 꺾인다
  const alleys=n>=16&&dist!=='down'&&rnd()<.6?1:0;
  for(let k=0;k<alleys;k++){const starts=comp.filter(([r,c])=>free.has(r*H+c)&&[[r-1,c],[r+1,c],[r,c-1],[r,c+1]].some(([a,b])=>isRd(a,b)&&!can[a][b].al));if(!starts.length)break;
    let [r,c]=starts[Math.floor(rnd()*starts.length)];const dirs=[[-1,0],[1,0],[0,-1],[0,1]];let [dr,dc]=dirs.find(([a,b])=>isRd(r-a,c-b))||[1,0];
    let len=2+Math.floor(rnd()*4),turn=1+Math.floor(rnd()*len);
    for(let s=0;s<len&&free.has(r*H+c);s++){set(r,c,{t:'road',ro:dc?'h':'v',rw:1,al:1});free.delete(r*H+c);
      if(s===turn){const t=rnd()<.5?[dc,dr]:[-dc,-dr];if(free.has((r+t[0])*H+c+t[1])){dr=t[0];dc=t[1];}}r+=dr;c+=dc;}}
  // 필지: 남은 칸에서 씨앗을 골라 무작위로 자라게 한다
  const size={down:[3,8],mid:[2,5],res:[1,3]}[dist];let lot=0;
  for(const C of growPieces(rnd,comp.filter(([r,c])=>free.has(r*H+c)),H,size[0],size[1])){
    const id=bid*64+(++lot);const q=rnd();
    if(dist==='down'){
      if(q<.08)C.forEach(([r,c])=>set(r,c,{t:'plaza'}));
      else{const f=Math.max(5,Math.min(12,Math.round(12-d*14+(rnd()-.4)*4)));C.forEach(([r,c])=>set(r,c,{t:'bldg',f,blk:id}));}}
    else if(dist==='mid'){
      if(q<.06)C.forEach(([r,c])=>set(r,c,{t:'plaza',lot:1}));
      else if(q<.09)C.forEach(([r,c])=>set(r,c,{t:'rubble'}));
      else if(q<.11)C.forEach(([r,c])=>set(r,c,{t:'plaza'}));
      else{const f=Math.max(2,Math.min(7,Math.round(6-d*5+(rnd()-.5)*3)));C.forEach(([r,c])=>set(r,c,{t:'bldg',f,blk:id}));}}
    else{// 주택가: 마당 있는 1~2층 집, 가끔 3층 연립, 가끔 상가 주차장
      if(q<.08)C.forEach(([r,c])=>set(r,c,{t:'plaza',lot:1}));
      else{const f=rnd()<.15?3:rnd()<.5?2:1;const front=(r,c)=>[[r-1,c],[r+1,c],[r,c-1],[r,c+1]].some(([a,b])=>isRd(a,b)&&!can[a][b].al);
        C.forEach(([r,c])=>set(r,c,front(r,c)?(rnd()<.85?{t:'bldg',f,blk:id}:{t:'park',yard:1}):(rnd()<.2?{t:'bldg',f:1,blk:id}:{t:'park',yard:1})));}}}
  // 밖으로 통하는 면이 하나도 없는 건물(다른 건물에 갇힘)은 안뜰로 바꾼다. 문이 바깥에만 나기 때문
  const blks=new Map();for(const [r,c] of comp){const x=can[r][c];if(x.t!=='bldg')continue;if(!blks.has(x.blk))blks.set(x.blk,[]);blks.get(x.blk).push([r,c]);}
  for(const cells of blks.values()){const open=cells.some(([r,c])=>[[r-1,c],[r+1,c],[r,c-1],[r,c+1]].some(([a,b])=>a<0||b<0||a>=H||b>=H||!can[a][b]||(can[a][b].t!=='bldg'&&can[a][b].t!=='water')));
    if(!open)cells.forEach(([r,c])=>set(r,c,{t:'plaza',court:1}));}}
