/* ===================== 도시 소품 배치 (게임 규칙 쪽) =====================
   주차된 차, 불탄 차, 콘크리트 방벽, 쓰레기 컨테이너, 공원 생울타리처럼 엄폐가 되는 소품과
   신호등·가로등처럼 보기만 하는 소품의 자리를 지도에서 정한다. 같은 지도면 언제나 같은 자리.
   G.props: 3D 화면이 그리는 목록. G.covers: 시야·엄폐 규칙이 읽는 목록 [{x,z,r,kind}] (단위 좌표 = unit.x/z). */
function propHash(k,s){let h=(k*2654435761^(s||0)*40503)>>>0;h=Math.imul(h^h>>>15,2246822507)>>>0;h=Math.imul(h^h>>>13,3266489909)>>>0;return ((h^h>>>16)>>>0)/4294967296;}
const CAR_KIND_W={suv:.17,sedan:.155,pickup:.17};       // 차 폭(칸)
const CAR_KIND_L={suv:.41,sedan:.39,pickup:.47};        // 차 길이(칸)
const PROP_COLS=['#d9d7d2','#c3c4c4','#2a2b2d','#1f2c3a','#6c6f71','#4b1f22','#b8b2a3','#3d4436','#e2e0da','#7a2e26'];

function genProps(){const P=[];const t=(r,c)=>inb(r,c)?G.map[r][c].t:'void';const rd=(r,c)=>t(r,c)==='road';
  const curb=(r,c)=>{const q=t(r,c);return q!=='road'&&q!=='plaza'&&q!=='void';};
  const sd=(G.seed|0)%100000;const H=(k,s)=>propHash(k+sd*7919,s);
  const nearObj=(r,c)=>G.objs.some(o=>Math.max(Math.abs(o.r-r),Math.abs(o.c-c))<=2);
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const k=key(r,c),cx=c+.5,cz=r+.5;
    if(rd(r,c)){const h=rd(r,c-1)||rd(r,c+1),v=rd(r-1,c)||rd(r+1,c);
      if(h&&v){// 교차로: 막힌 길모퉁이 두 곳에 신호등
        [[-1,-1],[1,1],[-1,1],[1,-1]].filter(([a,b])=>curb(r+a,c+b)).slice(0,2).forEach(([a,b])=>P.push({k:'light',x:cx+b*.43,z:cz+a*.43,dx:-b*Math.SQRT1_2,dz:-a*Math.SQRT1_2,red:H(k,1+a+b*3)<.5}));
        continue;}
      // 거점 가까운 길에는 도로를 가로지르는 콘크리트 방벽 줄(검문소)
      if(nearObj(r,c)&&H(k,5)<.35){const along=h;for(let i=-1;i<=1;i++){if(i===0&&H(k,6)<.5)continue;// 가운데 한 칸은 가끔 비워 둔다
          P.push({k:'barrier',x:along?cx+(H(k,7)-.5)*.3:cx+i*.28,z:along?cz+i*.28:cz+(H(k,7)-.5)*.3,ry:along?Math.PI/2:0});}}
      const sides=[[-1,0],[1,0],[0,-1],[0,1]].filter(([a,b])=>curb(r+a,c+b));
      sides.forEach(([a,b],si)=>{
        if(H(k,10+si)<.3)P.push({k:'lamp',x:cx+b*.42,z:cz+a*.42,ry:Math.atan2(a,-b)});
        if(H(k,15+si)<.1)P.push({k:'bin',x:cx+b*.4+(a?(H(k,16+si)-.5)*.5:0),z:cz+a*.4+(b?(H(k,16+si)-.5)*.5:0),ry:a?0:Math.PI/2});
        const n=H(k,20+si)<.42?1+(H(k,24+si)<.35?1:0):0;
        for(let i=0;i<n;i++){const j=si*7+i*31;const along=n===1?(H(k,30+j)-.5)*.3:(i?.21:-.21);
          const kind=['suv','suv','sedan','sedan','pickup'][Math.floor(H(k,40+j)*5)];const burnt=H(k,50+j)<.14;const flip=burnt&&H(k,55+j)<.3;
          const x=a?cx+along:cx+b*.24,z=b?cz+along:cz+a*.24;
          const ry=(a?0:Math.PI/2)+(H(k,60+j)<.5?0:Math.PI)+(H(k,70+j)-.5)*(burnt?.8:.08);
          P.push({k:'car',kind,x,z,ry,burnt,flip,col:burnt?'#2b2723':PROP_COLS[Math.floor(H(k,80+j)*PROP_COLS.length)]});}});}
    else if(t(r,c)==='park'){// 도로와 맞닿은 공원 가장자리에 낮은 생울타리
      [[-1,0],[1,0],[0,-1],[0,1]].forEach(([a,b],si)=>{if(t(r+a,c+b)!=='road'||H(k,90+si)<.35)return;P.push({k:'hedge',x:cx+b*.44,z:cz+a*.44,ry:b?Math.PI/2:0});});}}
  return P;}

// 엄폐가 되는 소품만 골라 G.covers로. 시야·엄폐 규칙이 읽는다.
function propCovers(){if(!G||!G.map)return;G.props=genProps();const C=[];
  for(const p of G.props){
    if(p.k==='car')C.push({x:p.x,z:p.z,r:.2,kind:p.burnt?'wreck':'car',h:.13});
    else if(p.k==='barrier')C.push({x:p.x,z:p.z,r:.14,kind:'barrier',h:.07});
    else if(p.k==='bin')C.push({x:p.x,z:p.z,r:.1,kind:'bin',h:.1});
    else if(p.k==='hedge'){const ax=p.ry?0:1,az=p.ry?1:0;for(const s of [-.25,.25])C.push({x:p.x+ax*s,z:p.z+az*s,r:.25,kind:'hedge',h:.08});}}
  G.covers=C;return C;}
