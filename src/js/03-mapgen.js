/* ===================== MAP GEN =====================
   지금의 미국 도시처럼 만든다: 바둑판 도로(1칸 거리 + 2칸 대로), 블록 안을 가르는 뒷골목,
   한가운데 고층 업무지구 → 중층 상가 → 바깥 주택가, 사이사이 주차장·광장·공원·폐허 블록.
   도시는 90도 회전 대칭이라 2세력(서·동)이든 4세력이든 출발 조건이 같다. 가장자리 2줄은 집결지.
   칸 정보: t(지형), f(층수), blk(같은 건물 묶음), ro(도로 방향 h·v·x), rw(도로 폭 칸 수), al(뒷골목), lot(주차장), dist(구역) */
function inZone(n,r,c){if(n==null)return false;const e=[c<=1,c>=N-2,r<=1,r>=N-2][n];const corner=(r<=1||r>=N-2)&&(c<=1||c>=N-2);return e&&!corner;}
// 도로 줄 무늬: 앞쪽 절반만 정하고 뒤집는다. 0=블록, 1=거리, 2=대로(두 줄이 한 대로)
function genLines(rnd){const H=N/2;const st=new Array(N).fill(0);st[2]=1;let i=3,n=0;
  while(true){const left=H-1-i;const w=(n%2===1&&rnd()<.75)?2:1;
    const maxb=Math.min(7,left-w-4);if(maxb<4)break;const b=4+Math.floor(rnd()*(maxb-3));i+=b;
    for(let j=0;j<w;j++)st[i+j]=w;i+=w;n++;}
  st[H-1]=2;for(let j=0;j<H;j++)st[N-1-j]=st[j];return st;}
function genMap(seed,objPer){const rnd=mulberry(seed);const H=N/2;const mid=(N-1)/2;
  const st=genLines(rnd);
  const can=[];for(let r=0;r<H;r++){can[r]=[];for(let c=0;c<H;c++)can[r][c]=null;}
  // 집결지 둘레: 주차장과 공터
  for(let r=0;r<H;r++)for(let c=0;c<H;c++){
    if(r<2||c<2){const p=rnd();can[r][c]=p<.4?{t:'plaza',lot:1}:p<.7?{t:'plaza'}:p<.9?{t:'park'}:{t:'rubble'};}
    else if(st[r]||st[c]){const ro=st[r]&&st[c]?'x':st[r]?'h':'v';can[r][c]={t:'road',ro,rw:Math.max(st[r],st[c])};}}
  // 블록 단위로 채운다
  const rs=[];for(let r=2;r<H;r++)if(!st[r]&&st[r-1])rs.push(r);
  let bidN=0;
  for(const r0 of rs){let r1=r0;while(r1+1<H&&!st[r1+1])r1++;
    for(let c0=2;c0<H;c0++){if(st[c0]||!st[c0-1])continue;let c1=c0;while(c1+1<H&&!st[c1+1])c1++;
      fillBlock(rnd,can,r0,r1,c0,c1,++bidN,mid,H);}}
  // 거점: 정준 사분면 안쪽에서 서로 떨어진 칸을 고른다.
  const objs=[];let tries=0;const gap=Math.max(4,Math.round(H/4));
  while(objs.length<objPer&&tries++<900){const r=3+Math.floor(rnd()*(H-4)),c=3+Math.floor(rnd()*(H-4));const x=can[r][c];
    if(x.t==='road'||x.t==='water')continue;if(objs.some(([a,b])=>dist(a,b,r,c)<(tries<500?gap:3)))continue;if(Math.min(H-1-r,H-1-c)<1&&objs.length)continue;
    if(x.t==='bldg')x.f=Math.max(x.f,4);else{x.t='plaza';delete x.lot;}x.lm=1;objs.push([r,c]);}
  const m=[];for(let r=0;r<N;r++)m[r]=[];
  const rot=(r,c,k)=>{for(let j=0;j<k;j++){const t=r;r=c;c=N-1-t;}return [r,c];};
  for(let r=0;r<H;r++)for(let c=0;c<H;c++){const x=can[r][c];for(let k=0;k<4;k++){const [a,b]=rot(r,c,k);const y={...x,owner:null,obj:null};
      if(y.blk!=null)y.blk=y.blk*4+k;if(y.ro&&k%2&&y.ro!=='x')y.ro=y.ro==='h'?'v':'h';m[a][b]=y;}}
  let oi=0;const names=OBJ_NAMES.slice();for(let j=names.length-1;j>0;j--){const q=Math.floor(rnd()*(j+1));[names[j],names[q]]=[names[q],names[j]];}
  const list=[];for(const [r,c] of objs)for(let k=0;k<4;k++){const [a,b]=rot(r,c,k);m[a][b].obj=oi;list.push({r:a,c:b,name:names[oi%names.length]});oi++;}
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=m[r][c];if(x.t==='bldg'){x.bmax=8+x.f*3;x.bhp=x.bmax;}x.smoke=0;}
  return {map:m,objs:list};}
/* 블록 하나 채우기. 구역(가운데일수록 높다)에 따라 필지를 나누고 건물 높이를 정한다. */
function fillBlock(rnd,can,r0,r1,c0,c1,bid,mid,H){const w=c1-c0+1,h=r1-r0+1;
  const d=Math.max(Math.abs((r0+r1)/2-mid),Math.abs((c0+c1)/2-mid))/H;// 0 = 도심, 1 = 가장자리
  const dist=d<.36?'down':d<.66?'mid':'res';
  const set=(r,c,x)=>{x.dist=dist;can[r][c]=x;};
  const all=f=>{for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++)set(r,c,f(r,c));};
  const p=rnd();
  // 특수 블록
  if(p<.07){all(()=>({t:rnd()<.06?'water':'park'}));return;}                                   // 공원
  if(p<.12&&dist!=='down'){all(()=>rnd()<.08?{t:'rubble'}:{t:'plaza',lot:1});return;}          // 큰 주차장
  if(p<.17){all(()=>{const q=rnd();return q<.55?{t:'rubble'}:{t:'bldg',f:1+Math.floor(rnd()*3),blk:bid*64};});return;}// 폭격 맞은 폐허
  if(p<.21&&dist==='down'){all((r,c)=>(r===r0||r===r1||c===c0||c===c1)&&rnd()<.25?{t:'park'}:{t:'plaza'});return;}// 시청 앞 광장
  // 뒷골목: 블록을 긴 쪽으로 가른다
  const alleyP={down:.35,mid:.75,res:.6}[dist];let strips=[[r0,r1,c0,c1]];
  if(rnd()<alleyP){if(h>=5&&(h>=w||w<5)){const a=r0+Math.floor(h/2);for(let c=c0;c<=c1;c++)set(a,c,{t:'road',ro:'h',rw:1,al:1});strips=[[r0,a-1,c0,c1],[a+1,r1,c0,c1]];}
    else if(w>=5){const a=c0+Math.floor(w/2);for(let r=r0;r<=r1;r++)set(r,a,{t:'road',ro:'v',rw:1,al:1});strips=[[r0,r1,c0,a-1],[r0,r1,a+1,c1]];}}
  let lot=0;
  for(const [a0,a1,b0,b1] of strips){const sh=a1-a0+1,sw=b1-b0+1;const alongC=sw>=sh;// 필지는 긴 쪽을 따라 자른다
    const len=alongC?sw:sh;let i=0;
    while(i<len){const L=Math.min(len-i,{down:2+Math.floor(rnd()*3),mid:1+Math.floor(rnd()*3),res:1+Math.floor(rnd()*2)}[dist]);
      const cells=[];for(let j=i;j<i+L;j++){if(alongC)for(let r=a0;r<=a1;r++)cells.push([r,b0+j]);else for(let c=b0;c<=b1;c++)cells.push([a0+j,c]);}
      const id=bid*64+(++lot);const q=rnd();
      if(dist==='down'){
        if(q<.1)cells.forEach(([r,c])=>set(r,c,{t:'plaza'}));
        else{const f=Math.max(5,Math.min(12,Math.round(12-d*14+(rnd()-.4)*4)));cells.forEach(([r,c])=>set(r,c,{t:'bldg',f,blk:id}));}}
      else if(dist==='mid'){
        if(q<.11)cells.forEach(([r,c])=>set(r,c,{t:'plaza',lot:1}));
        else if(q<.15)cells.forEach(([r,c])=>set(r,c,{t:'rubble'}));
        else if(q<.18)cells.forEach(([r,c])=>set(r,c,{t:'plaza'}));
        else{const f=Math.max(2,Math.min(7,Math.round(6-d*5+(rnd()-.5)*3)));cells.forEach(([r,c])=>set(r,c,{t:'bldg',f,blk:id}));}}
      else{// 주택가: 마당 있는 1~2층 집, 가끔 3층 연립, 가끔 상가 주차장
        if(q<.08)cells.forEach(([r,c])=>set(r,c,{t:'plaza',lot:1}));
        else{const f=rnd()<.15?3:rnd()<.5?2:1;const front=(r,c)=>[[r-1,c],[r+1,c],[r,c-1],[r,c+1]].some(([a,b])=>a>=0&&b>=0&&a<H&&b<H&&can[a][b]&&can[a][b].t==='road'&&!can[a][b].al);
          cells.forEach(([r,c])=>set(r,c,front(r,c)?(rnd()<.85?{t:'bldg',f,blk:id}:{t:'park',yard:1}):(rnd()<.2?{t:'bldg',f:1,blk:id}:{t:'park',yard:1})));}}
      i+=L;}}}
