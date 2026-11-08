/* ===================== TERRAIN: 고저차 · 강 · 다리 · 철도 =====================
   지형 높이는 층 단위(1층 ≈ 3m)로 칸 꼭짓점마다 하나씩(G.elv, (N+1)×(N+1)) 둔다. 칸 높이 x.el = 네 꼭짓점 평균.
   - 같은 건물 블록은 꼭짓점을 블록 평균으로 평평하게 다진다(경사는 길과 마당이 받는다).
   - 가장자리 집결지는 높이 0이라 세력끼리 출발 조건이 같다.
   - 대칭 도시: 언덕을 정준 사분면에서 만들어 90도씩 돌려 놓는다(4세력 공정).
   - 강이 흐르는 도시(비대칭): 도심이 한쪽으로 치우치고, 강이 구불구불 지나가며 큰길마다 다리가 놓이고,
     철도가 강을 건너 도심 옆 역을 지난다. 강변은 둔치 공원, 철길·강가 바깥 블록은 공업지대가 된다.
   규칙에서 쓰는 것: elT(r,c) 칸 높이, elAt(x,z) 실제 좌표 높이(이중선형), slopeK(u,dx,dz) 비탈 속도 배수. */
const RELIEF={flat:{n:'평지',h:0},hills:{n:'완만한 언덕',h:3.5},steep:{n:'가파른 구릉',h:6}};   // h: 가장 높은 언덕(층)
const LAYOUTS={sym:{n:'대칭 도시 (4세력 공정)'},river:{n:'강이 흐르는 도시 (비대칭)'}};
const EL_MAX=8;                    // 높이 상한(층). 3D 높이 텍스처의 눈금 범위
const shuf=(a,rnd)=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};   // 엔진마다 sort 비교 횟수가 달라 같은 씨앗이 다른 지도가 되지 않게
const sstep=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};

function elT(r,c){const x=G.map[r]&&G.map[r][c];return x&&x.el||0;}
function elAt(x,z){const E=G&&G.elv;if(!E)return 0;const W=N+1;const fx=Math.max(0,Math.min(N-1e-6,x)),fz=Math.max(0,Math.min(N-1e-6,z));
  const i=Math.floor(fx),j=Math.floor(fz),u=fx-i,v=fz-j;const a=E[j*W+i],b=E[j*W+i+1],c=E[(j+1)*W+i],d=E[(j+1)*W+i+1];
  return (a*(1-u)+b*u)*(1-v)+(c*(1-u)+d*u)*v;}
const elU=u=>u&&inb(u.r,u.c)?elT(u.r,u.c):0;
/* 비탈 속도 배수: 오르막은 느리고(차량이 더) 내리막은 조금 빠르다. 경사 = 높이차(층×3m) / 거리(칸×12m) */
function slopeK(u,dx,dz){if(!G.elv||UT[u.type].fly)return 1;const d=Math.hypot(dx,dz);if(d<1e-6)return 1;const L=.35;
  const g=(elAt(u.x+dx/d*L,u.z+dz/d*L)-elAt(u.x,u.z))/L*.25;
  if(g>0)return 1/(1+g*(UT[u.type].cls==='veh'?4.5:2.6));return 1+Math.min(.12,-g*.6);}

/* 점에서 꺾은선까지 거리 */
function plDist(pts,x,z){let best=1e9;for(let i=0;i+1<pts.length;i++){const [ax,az]=pts[i],[bx,bz]=pts[i+1];const dx=bx-ax,dz=bz-az,L=dx*dx+dz*dz||1;
  const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/L));const d=Math.hypot(ax+dx*t-x,az+dz*t-z);if(d<best)best=d;}return best;}

/* 꺾은선에서 가장 가까운 구간의 방향 */
function plDir(pts,x,z){let best=1e9,u=[1,0];for(let i=0;i+1<pts.length;i++){const [ax,az]=pts[i],[bx,bz]=pts[i+1];const dx=bx-ax,dz=bz-az,L=dx*dx+dz*dz||1;
  const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/L));const d=Math.hypot(ax+dx*t-x,az+dz*t-z);if(d<best){best=d;const l=Math.sqrt(L);u=[dx/l,dz/l];}}return u;}
/* ---------- 고저차 ----------
   opt.relief: flat|hills|steep, sym: 90도 대칭으로 만들지, feat: 강(골짜기를 판다) */
function genRelief(m,rnd,relief,sym,feat){const amp=(RELIEF[relief]||RELIEF.flat).h;if(!amp)return null;const W=N+1;
  // 언덕: 가우스 봉우리 몇 개 + 낮은 물결
  const hills=[];const nh=sym?2+Math.floor(rnd()*2):3+Math.floor(rnd()*3);
  for(let i=0;i<nh;i++){const lo=sym?3:4,hi=sym?N/2:N-4;hills.push({x:lo+rnd()*(hi-lo),z:lo+rnd()*(hi-lo),R:N*(.09+rnd()*.1),h:amp*(.55+rnd()*.45)});}
  const waves=[];for(let i=0;i<3;i++){const a=rnd()*6.283,f=(.12+rnd()*.18);waves.push({fx:Math.cos(a)*f,fz:Math.sin(a)*f,p:rnd()*6.283,a:amp*.12});}
  const f0=(x,z)=>{let h=0;for(const o of hills){const d=Math.hypot(x-o.x,z-o.z)/o.R;h+=o.h*Math.exp(-d*d);}for(const w of waves)h+=w.a*(1+Math.sin(x*w.fx+z*w.fz+w.p));return h;};
  const rot=(x,z)=>[N-z,x];
  const E=new Array(W*W);let mx=0;
  for(let j=0;j<W;j++)for(let i=0;i<W;i++){let h;
    if(sym){h=0;let x=i,z=j;for(let k=0;k<4;k++){h=Math.max(h,f0(x,z));[x,z]=rot(x,z);}}   // 네 방향 중 가장 높은 값(대칭)
    else h=f0(i,j);
    h*=sstep(2.2,6.5,Math.min(i,j,N-i,N-j));                                                // 집결지는 평지
    if(feat&&feat.river)h*=sstep(feat.river.w*.5,feat.river.w*.5+5,plDist(feat.river.pts,i,j)); // 강 골짜기
    E[j*W+i]=h;if(h>mx)mx=h;}
  if(mx>amp){const k=amp/mx;for(let q=0;q<E.length;q++)E[q]*=k;}
  return E;}
/* 높이 마무리: 언덕 꼭대기 일부 블록은 공원으로, 건물 블록·물은 평평하게, 칸 높이 계산 */
function finishRelief(m,E,objs,canon){const W=N+1;if(!E){for(let r=0;r<N;r++)for(let c=0;c<N;c++)delete m[r][c].el;return null;}
  const amp=Math.max(...E)||1;const isObj=new Set(objs.map(o=>o.r*N+o.c));
  const tile=(r,c)=>(E[r*W+c]+E[r*W+c+1]+E[(r+1)*W+c]+E[(r+1)*W+c+1])/4;
  // 언덕 꼭대기 공원: 높은 곳의 건물 블록 절반을 숲 공원으로 (도시의 산자락 공원처럼)
  const blk=new Map();for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=m[r][c];if(x.t!=='bldg'||x.blk==null)continue;if(!blk.has(x.blk))blk.set(x.blk,[]);blk.get(x.blk).push([r,c]);}
  for(const [id,cells] of blk){if(cells.some(([r,c])=>isObj.has(r*N+c)||m[r][c].stn))continue;let h=0;for(const [r,c] of cells)h+=tile(r,c);h/=cells.length;
    if(h>amp*.72&&propHash(canon(id),77)<.55)for(const [r,c] of cells){const x=m[r][c];x.t='park';x.hill=1;delete x.f;delete x.blk;delete x.bmax;delete x.bhp;}}
  // 건물 블록을 평평하게: 작은 블록부터, 큰 블록이 마지막에 덮어쓴다
  const B=new Map();for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=m[r][c];if(x.t!=='bldg')continue;const k=x.blk!=null?'b'+x.blk:'t'+r*N+c;if(!B.has(k))B.set(k,[]);B.get(k).push([r,c]);}
  const flat=cells=>{const vs=new Set();for(const [r,c] of cells)for(const [a,b] of [[0,0],[0,1],[1,0],[1,1]])vs.add((r+a)*W+c+b);let s=0;for(const v of vs)s+=E[v];s/=vs.size;for(const v of vs)E[v]=s;};
  const BL=[...B.values()].sort((a,b)=>a.length-b.length);for(let it=0;it<6;it++)(it%2?BL.slice().reverse():BL).forEach(flat);   // 맞붙은 블록끼리 몇 번 주고받아 기울기를 길 쪽으로 민다
  // 물: 강은 바닥(0), 연못은 칸 평균으로
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=m[r][c];if(x.rv)for(const [a,b] of [[0,0],[0,1],[1,0],[1,1]])E[(r+a)*W+c+b]=0;}
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=m[r][c];if(x.t==='water'&&!x.rv)flat([[r,c]]);}
  for(let q=0;q<E.length;q++)E[q]=Math.round(Math.min(EL_MAX,Math.max(0,E[q]))*100)/100;
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const v=Math.round(tile(r,c)*100)/100;if(v>0)m[r][c].el=v;else delete m[r][c].el;}
  return E;}

/* ---------- 강이 흐르는 도시 (비대칭) ---------- */
function genLinesN(rnd){const st=new Array(N).fill(0);st[2]=1;st[N-3]=1;let i=3,n=0;
  while(true){const w=(n%2===1&&rnd()<.7)?2:1;const b=4+Math.floor(rnd()*4);if(i+b+w>N-7)break;i+=b;for(let j=0;j<w;j++)st[i+j]=w;i+=w;n++;}
  return st;}
function genMapRiver(seed,objPer,opt){const rnd=mulberry((seed^0x5eed1)>>>0);const H=N;
  const can=[];for(let r=0;r<N;r++)can[r]=new Array(N).fill(null);
  const inner=(r,c)=>r>=2&&c>=2&&r<N-2&&c<N-2;const isRd=(r,c)=>r>=0&&c>=0&&r<N&&c<N&&can[r][c]&&can[r][c].t==='road';
  const cr=N*(.36+rnd()*.28),cc=N*(.36+rnd()*.28);                 // 도심(업무지구) 중심: 지도 가운데에서 비켜 있다
  const sR=genLinesN(rnd),sC=genLinesN(rnd);
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    if(!inner(r,c)){const p=rnd();can[r][c]=p<.4?{t:'plaza',lot:1}:p<.7?{t:'plaza'}:p<.9?{t:'park'}:{t:'rubble'};}
    else if(sR[r]||sC[c]){const ro=sR[r]&&sC[c]?'x':sR[r]?'h':'v';can[r][c]={t:'road',ro,rw:Math.max(sR[r],sC[c])};}}
  // 1) 거리 끊기 → T자 교차로, 큰 블록
  const starts=st=>{const o=[];for(let i=2;i<N-2;i++)if(st[i]&&!st[i-1])o.push(i);return o;};
  for(const [axis,st,cr2] of [[0,sR,sC],[1,sC,sR]]){const L=starts(st),X=starts(cr2);
    for(const i of L){if(i===2||i===N-3)continue;for(let q=0;q+1<X.length;q++){if(rnd()>(st[i]===2?.15:.38))continue;let a=X[q];while(cr2[a])a++;const b=X[q+1];
      for(let j=a;j<b;j++)for(let w=0;w<st[i];w++){const [r,c]=axis?[j,i+w]:[i+w,j];if(inner(r,c))can[r][c]=null;}}}}
  // 2) 도심에서 뻗는 대각선 대로 두 개
  const dirs=shuf([[-1,-1],[1,1],[-1,1],[1,-1]],rnd).slice(0,2);
  for(const [dr,dc] of dirs){const dd=dr===dc?1:-1;let r=Math.round(cr),c=Math.round(cc);
    for(let s=0;s<N;s++){for(const [a,b] of [[r,c],[r,c+dd]]){if(!inner(a,b))continue;const x=can[a][b];can[a][b]=x&&x.t==='road'&&x.ro!=='d'?{t:'road',ro:'x',rw:2}:{t:'road',ro:'d',dd,rw:2};}
      r+=dr;c+=dc;if(!inner(r,c))break;}}
  // 3) 도심 순환로와 광장
  const hyp=(r,c)=>Math.hypot(r+.5-cr,c+.5-cc);const R1=N*(.17+rnd()*.06);
  for(let r=2;r<N-2;r++)for(let c=2;c<N-2;c++){if(Math.abs(hyp(r,c)-R1)>.74)continue;const x=can[r][c];can[r][c]=x&&x.t==='road'?{t:'road',ro:'x',rw:Math.max(1,x.rw||1)}:{t:'road',ro:'c',rw:1};}
  for(let r=2;r<N-2;r++)for(let c=2;c<N-2;c++){const h=hyp(r,c);if(h<=.8)can[r][c]={t:'water',dist:'down'};else if(h<=2.3)can[r][c]={t:'plaza',dist:'down',sq:1};}
  // 4) 강: 지도를 가로지르는 굽은 물길. 도심에서 4~8칸 떨어져 지나간다
  const th=[0,Math.PI/2,Math.PI/5,-Math.PI/5,Math.PI*.3][Math.floor(rnd()*5)];const D=[Math.cos(th),Math.sin(th)],Nn=[-D[1],D[0]];
  const side=rnd()<.5?-1:1,off=(4+rnd()*4)*side;const C0=[cc+.5+Nn[0]*off,cr+.5+Nn[1]*off];
  const A1=1.2+rnd()*1.8,f1=.07+rnd()*.06,p1=rnd()*6.28,A2=.6+rnd()*.8,f2=.17+rnd()*.1,p2=rnd()*6.28;const rw=2.2+rnd()*.9;
  const rpts=[];for(let s=-N*1.5;s<=N*1.5;s+=.5){const o=A1*Math.sin(s*f1+p1)+A2*Math.sin(s*f2+p2);const x=C0[0]+D[0]*s+Nn[0]*o,z=C0[1]+D[1]*s+Nn[1]*o;if(x<-3||z<-3||x>N+3||z>N+3)continue;rpts.push([x,z]);}
  const was=can.map(row=>row.slice());const rd=[];for(let r=0;r<N;r++){rd[r]=[];for(let c=0;c<N;c++)rd[r][c]=plDist(rpts,c+.5,r+.5);}
  for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(rd[r][c]<rw/2)can[r][c]={t:'water',rv:1,dist:'mid'};
  // 다리: 물에 잠긴 직선 도로 구간 중 양 끝이 뭍인 것. 대로는 늘, 거리는 절반쯤. 최소 3개
  const runs=[];const seenB=new Set();
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const w=was[r][c];if(!(can[r][c]&&can[r][c].rv)||!w||w.t!=='road'||seenB.has(r*N+c))continue;
    for(const ax of ['h','v']){if(w.ro!==ax&&w.ro!=='x')continue;const [dr,dc]=ax==='h'?[0,1]:[1,0];
      const ok=(a,b)=>inb(a,b)&&can[a][b]&&can[a][b].rv&&was[a][b]&&was[a][b].t==='road'&&(was[a][b].ro===ax||was[a][b].ro==='x');
      let a=r,b=c;while(ok(a-dr,b-dc)){a-=dr;b-=dc;}const cells=[];let x=a,y=b;while(ok(x,y)){cells.push([x,y]);x+=dr;y+=dc;}
      const land=(p,q)=>inb(p,q)&&!(can[p][q]&&(can[p][q].rv||can[p][q].t==='water'));
      if(cells.length<2||cells.length>7||!land(a-dr,b-dc)||!land(x,y))continue;
      if(cells.some(([p,q])=>seenB.has(p*N+q)&&ax==='h'))continue;
      const line=ax==='h'?(sR[r]===2&&sR[r-1]===2?r-1:r):(sC[c]===2&&sC[c-1]===2?c-1:c);
      runs.push({ax,cells,line,av:(ax==='h'?sR[r]:sC[c])===2,d:Math.hypot(cells[0][0]-cr,cells[0][1]-cc)});cells.forEach(([p,q])=>seenB.add(p*N+q));break;}}
  const pick=new Set();const lines=new Map();for(const b of runs){const k=b.ax+b.line;if(!lines.has(k))lines.set(k,{av:b.av,d:b.d,runs:[]});lines.get(k).runs.push(b);}
  for(const [k,L] of lines)if(L.av||rnd()<.45)pick.add(k);
  if(pick.size<3)[...lines.entries()].filter(([k])=>!pick.has(k)).sort((a,b)=>a[1].d-b[1].d).slice(0,3-pick.size).forEach(([k])=>pick.add(k));
  let nb=0;for(const [k,L] of lines){if(!pick.has(k))continue;nb++;for(const b of L.runs)for(const [r,c] of b.cells)can[r][c]={t:'road',ro:b.ax,rw:was[r][c].rw||1,br:2,rv:1,dist:'mid'};}
  // 강변 둔치: 물가 한 줄은 공원·산책로
  for(let r=2;r<N-2;r++)for(let c=2;c<N-2;c++){if(can[r][c])continue;if(rd[r][c]<rw/2+1.05)can[r][c]=rnd()<.82?{t:'park',bank:1}:{t:'plaza',bank:1};}
  // 5) 철도: 강을 크게 비껴 건너고 도심 옆을 지난다
  const ph=th+Math.PI/2+(rnd()-.5)*.9;const D2=[Math.cos(ph),Math.sin(ph)],N2=[-D2[1],D2[0]];const so=(3.2+rnd()*2.5)*(rnd()<.5?-1:1);
  const S0=[cc+.5+N2[0]*so,cr+.5+N2[1]*so];const B=.8+rnd()*1.4,fb=.05+rnd()*.05,pb=rnd()*6.28;
  const lpts=[];for(let s=-N*1.5;s<=N*1.5;s+=.5){const o=B*Math.sin(s*fb+pb);const x=S0[0]+D2[0]*s+N2[0]*o,z=S0[1]+D2[1]*s+N2[1]*o;if(x<-3||z<-3||x>N+3||z>N+3)continue;lpts.push([x,z]);}
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const d=plDist(lpts,c+.5,r+.5);if(d>=.62)continue;const x=can[r][c];
    if(x&&x.t==='road'&&!x.br){const [ux,uz]=plDir(lpts,c+.5,r+.5);const along=x.ro==='h'?Math.abs(ux):x.ro==='v'?Math.abs(uz):0;
      if(along<.8){x.rail=1;continue;}}                                                // 건널목(길을 가로지른다). 길과 나란히 겹치면 철길이 길을 차지한다
    can[r][c]=x&&(x.rv||x.t==='water')?{t:'plaza',rail:1,br:3,rv:1,dist:'mid'}:{t:'plaza',rail:1,dist:'mid'};}
  // 역: 철길에서 도심과 가장 가까운 지점 옆 블록
  let best=null,bd=1e9;for(const [x,z] of lpts){if(x<6||z<6||x>N-6||z>N-6)continue;const d=Math.hypot(x-cc-.5,z-cr-.5);if(d<bd){bd=d;best=[x,z];}}
  let stn=null;if(best){const i=lpts.indexOf(best);const a=lpts[Math.max(0,i-2)],b=lpts[Math.min(lpts.length-1,i+2)];const tx=b[0]-a[0],tz=b[1]-a[1],tl=Math.hypot(tx,tz)||1;
    let nx=-tz/tl,nz=tx/tl;if((cc+.5-best[0])*nx+(cr+.5-best[1])*nz<0){nx=-nx;nz=-nz;}const cells=[];
    for(let s=-1.6;s<=1.6;s+=.4)for(let o=1.1;o<=2.6;o+=.4){const x=best[0]+tx/tl*s+nx*o,z=best[1]+tz/tl*s+nz*o;const r=Math.floor(z),c=Math.floor(x);if(!inner(r,c)||can[r][c])continue;if(!cells.some(([p,q])=>p===r&&q===c))cells.push([r,c]);}
    if(cells.length>=3){for(const [r,c] of cells)can[r][c]={t:'bldg',f:2,blk:99999,stn:1,dist:'mid'};stn=cells[0];}
    for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=can[r][c];if(x&&x.rail&&x.t==='plaza'&&Math.hypot(c+.5-best[0],r+.5-best[1])<2.4)x.plat=1;}}
  // 6) 블록 채우기. 철길·강가 바깥 블록은 공업지대가 되기 쉽다
  const near=(r,c,d)=>rd[r][c]<rw/2+d||plDist(lpts,c+.5,r+.5)<d;
  const dfn=comp=>{let d=0,nr=0;for(const [r,c] of comp){d+=Math.hypot(r+.5-cr,c+.5-cc);if(near(r,c,2.6))nr++;}d=d/comp.length/(N*.62);
    let dist=d<.3?'down':d<.62?'mid':'res';if(d>.28&&nr>=comp.length*.3&&propHash(comp[0][0]*N+comp[0][1],seed%997)<.7)dist='ind';return {d:Math.min(1,d),dist};};
  let bidN=0;FILL_BID=0;const seen=new Set();
  for(let r=2;r<N-2;r++)for(let c=2;c<N-2;c++){if(can[r][c]||seen.has(r*N+c))continue;const comp=[];const q=[[r,c]];seen.add(r*N+c);
    while(q.length){const [a,b]=q.pop();comp.push([a,b]);for(const [p,o] of [[a-1,b],[a+1,b],[a,b-1],[a,b+1]]){if(!inner(p,o)||can[p][o]||seen.has(p*N+o))continue;seen.add(p*N+o);q.push([p,o]);}}
    fillComp(rnd,can,comp,++bidN,0,H,isRd,dfn);}
  // 7) 거점: 역, 다리목, 그리고 서로 떨어진 곳
  const objs=[];const want=objPer*4;const gap=Math.max(4,Math.round(N/8));const zone=(r,c)=>r<3||c<3||r>N-4||c>N-4;
  const okT=(r,c)=>{const x=can[r][c];return x&&!zone(r,c)&&!x.stn&&x.t!=='road'&&x.t!=='water'&&!x.rail&&!x.rv;};
  const take=(r,c)=>{if(!okT(r,c)||objs.some(([a,b])=>dist(a,b,r,c)<gap-1))return false;const x=can[r][c];if(x.t==='bldg'){if(!x.stn)x.f=Math.max(x.f,4);}else{x.t='plaza';delete x.lot;}x.lm=1;objs.push([r,c]);return true;};
  if(stn){const x=can[stn[0]][stn[1]];x.lm=1;objs.push(stn);}
  const heads=[];for(const [k,L] of lines)if(pick.has(k))for(const b of L.runs){const [dr,dc]=b.ax==='h'?[0,1]:[1,0];const e=[[b.cells[0][0]-dr*2,b.cells[0][1]-dc*2],[b.cells[b.cells.length-1][0]+dr*2,b.cells[b.cells.length-1][1]+dc*2]];
    for(const [r,c] of e)for(const [a,q] of [[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1]])if(inb(r+a,c+q))heads.push([r+a,c+q]);}
  for(const [r,c] of shuf(heads,rnd)){if(objs.length>=Math.min(want,3))break;take(r,c);}
  let tries=0;while(objs.length<want&&tries++<4000){const r=3+Math.floor(rnd()*(N-6)),c=3+Math.floor(rnd()*(N-6));if(tries>2500&&okT(r,c)&&!objs.some(([a,b])=>dist(a,b,r,c)<3)){const x=can[r][c];if(x.t!=='bldg'){x.t='plaza';delete x.lot;}x.lm=1;objs.push([r,c]);continue;}take(r,c);}
  const m=can.map(row=>row.map(x=>({...x,owner:null,obj:null})));
  let oi=0;const names=OBJ_NAMES.filter(n=>!/역/.test(n)||!stn);for(let j=names.length-1;j>0;j--){const q=Math.floor(rnd()*(j+1));[names[j],names[q]]=[names[q],names[j]];}
  const list=[];let ni=0;for(const [r,c] of objs){m[r][c].obj=oi;list.push({r,c,name:m[r][c].stn?'중앙역':names[ni++%names.length]});oi++;}
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=m[r][c];if(x.t==='bldg'){x.bmax=8+x.f*3;x.bhp=x.bmax;}x.smoke=0;}
  const feat={layout:'river',river:{pts:rpts.map(p=>[+p[0].toFixed(2),+p[1].toFixed(2)]),w:+rw.toFixed(2)},rail:{pts:lpts.map(p=>[+p[0].toFixed(2),+p[1].toFixed(2)])},bridges:nb,cbd:[+cc.toFixed(2),+cr.toFixed(2)]};
  return {map:m,objs:list,feat};}

/* 지도 생성 마무리(대칭·비대칭 공통): 고저차를 입힌다. 비대칭 도시는 propHash로 블록 id를 그대로, 대칭 도시는 정준 블록 id(blk/4)로 정해 네 사분면이 같게 한다 */
function terrFinish(out,seed,opt){opt=opt||{};const relief=RELIEF[opt.relief]?opt.relief:'flat';const sym=!out.feat||out.feat.layout!=='river';
  const rnd=mulberry((seed^0x7e44a1)>>>0);const E=genRelief(out.map,rnd,relief,sym,out.feat);
  const elv=finishRelief(out.map,E,out.objs,sym?(id=>Math.floor(id/4)):(id=>id));
  out.feat=Object.assign(out.feat||{layout:'sym'},{relief});out.elv=elv;return out;}

/* 철길 소품: 화물열차 몇 량(엄폐가 되는 큰 덩어리), 건널목 차단기. genProps 끝에서 부른다 */
function railProps(P){const f=G.feat;if(!f||!f.rail)return;const pts=f.rail.pts;if(pts.length<4)return;const R=mulberry((G.seed^0x7a11)>>>0);
  const at=s=>{const i=Math.max(0,Math.min(pts.length-2,Math.floor(s)));const a=pts[i],b=pts[i+1];return [a[0],a[1],Math.atan2(b[1]-a[1],b[0]-a[0])];};
  const trains=1+Math.floor(R()*2);for(let t=0;t<trains;t++){const s0=4+R()*(pts.length-20);const n=3+Math.floor(R()*5);const col=['#5a4636','#3f4a52','#6b5a3f','#4a3a32'][Math.floor(R()*4)];
    for(let i=0;i<n;i++){const [x,z,a]=at(s0+i*1.1);const r=Math.floor(z),c=Math.floor(x);if(!inb(r,c)||!G.map[r][c].rail||G.map[r][c].br||G.map[r][c].t==='road')continue;
      P.push({k:'wagon',x,z,ry:-a,col:i===0&&t===0?'#2d3236':col,loco:i===0&&t===0,burnt:R()<.12});}}
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=G.map[r][c];if(x.t!=='road'||!x.rail)continue;P.push({k:'xing',x:c+.5,z:r+.5});}}
