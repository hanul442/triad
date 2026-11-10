/* ===================== 나무·덤불: 보병이 뚫고 지나가지 않게 =====================
   화면이 그리는 나무 줄기·아래 가지·덤불 자리를 화면과 같은 해시(v3Hash)로 다시 계산해 둔다.
     숲 칸(07g3 natWildTrees): 가문비·소나무와 바닥 덤불 / 목초지·공원·밭 가장자리 덤불과 어린 가문비(07g3 natWorld)
     공원·마당 나무(07p v3BuildPark) / 공원 마른 나무(07 v3BuildWorld) / 대로 가로수(07w) / 보카주 나무(07g2)
   병사(05f-men)는 그 둘레 원 안으로 들어가지 않는다: 줄기를 향해 걸으면 옆으로 비켜 돌아가고,
   설 자리·엄폐 자리가 나무 안이면 바깥으로 민다. 차량은 그대로 숲을 밀고 나간다(05o-wreck, 10d-landexit).
   포격·전차에 쓰러진 나무(G.fellZ, 07zw-wreck과 같은 규칙)와 부서진 보카주는 막지 않는다.
   생울타리(hedge·bocage 줄)는 보병이 헤치고 지나가는 규칙(04d NAV_RULE inf:1)이라 그대로 둔다. */
const VEG={body:.02,   // 병사 몸 반지름(약 0.25m)
  head:.15};           // 선 병사 키(1.8m): 이보다 높은 가지는 걸리지 않는다
const vegH=(k,s)=>typeof v3Hash==='function'?v3Hash(k,s):0;
const vegFallH=(a,b)=>{let h=Math.imul((a|0)^0x9e3779b9,2654435761)^Math.imul(b|0,40503);h=Math.imul(h^h>>>15,2246822507);h^=h>>>13;return (h>>>0)/4294967296;};   // 07zw wrvHash와 같은 식
/* 가문비 원뿔 층(07g3 natGeos와 같은 값): [밑 높이, 반지름, 높이] */
const VEG_SPR=[[.15,.12,.34],[.36,.105,.3],[.56,.08,.26],[.74,.05,.26]];
/* 가문비: 줄기와, 밑면이 병사 키보다 낮은 가지 층 중 가장 넓은 것 */
function vegSpruceR(s,sy){let r=.018*s;for(const [y,rad] of VEG_SPR)if(y*sy<VEG.head-.01)r=Math.max(r,rad*s*.85);return r;}
function vegPineR(s,sy){let r=.017*s;if(.37*sy<VEG.head-.01)r=Math.max(r,.085*s*.8);return r;}
function vegClime(){return typeof bmClime==='function'?bmClime():'temp';}
/* 지도 전체의 나무·덤불 원 목록 {x,z,r,t:'tree'|'bush',p?} */
function vegBuild(){const M=G.map,O=[],cl=vegClime();const add=(x,z,r,t,p)=>O.push({x,z,r:r+VEG.body,t,p,fv:-1,fell:0});
  const bush=s=>.05*s*.85;
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=M[r][c];if(!x)continue;const k=key(r,c),H=s=>vegH(k,s);
    if(!G.camp&&typeof natWildTrees==='function'){
      if(x.t==='park'&&x.wild&&!x.orch){let i=0;   // 숲: 3×3 격자
        for(let a=0;a<3;a++)for(let b=0;b<3;b++){i++;if(H(1100+i)>.86)continue;
          const px=c+(b+.5)/3+(H(1120+i)-.5)*.3,pz=r+(a+.5)/3+(H(1140+i)-.5)*.3;const big=H(1160+i),s=.62+big*big*.75,sy=s*(.85+H(1240+i)*.45);
          const pine=H(1180+i)<(cl==='desert'?.7:.32);add(px,pz,pine?vegPineR(s,sy):vegSpruceR(s,sy),'tree');}
        const nb=2+Math.floor(H(1320)*2);for(let j=0;j<nb;j++)add(c+.1+H(1330+j)*.8,r+.1+H(1340+j)*.8,bush(.8+H(1350+j)*.8),'bush');}
      else if(x.mead||x.t==='park'&&!x.yard&&!x.sq||x.crop){let edge=0;for(const [a,b] of [[-1,0],[1,0],[0,-1],[0,1]]){const y=inb(r+a,c+b)?M[r+a][c+b]:null;if(y&&y.wild)edge++;}
        const n=x.crop?(edge?2:0):(edge?3:x.mead?(H(1400)<.45?1:0):(H(1400)<.3?1:0));
        for(let j=0;j<n;j++){let px=c+.08+H(1410+j)*.84,pz=r+.08+H(1420+j)*.84;
          if(x.crop){const e=H(1430+j)<.5?.06:.94;if(H(1440+j)<.5)px=c+e;else pz=r+e;}
          add(px,pz,bush(.7+H(1450+j)*.9),'bush');}
        if(edge>=2&&x.mead&&H(1480)<.5){const s=.5+H(1492)*.3;add(c+.2+H(1490)*.6,r+.2+H(1491)*.6,vegSpruceR(s,s),'tree');}}}
    if(x.t==='park'){const cx=c+.5,cz=r+.5;
      // 공원·마당·숲의 활엽수(07p): 가지는 높고 줄기만 걸린다
      for(let i=0;i<2;i++)if(H(410+i)<(x.wild&&typeof natWildTrees==='function'?.08:.3)){const a=H(420+i)*6.28,rr=.26+H(430+i)*.16,s=.8+H(440+i)*.5;add(cx+Math.cos(a)*rr,cz+Math.sin(a)*rr,.021*s,'tree');}
      // 마른 나무(07 v3BuildWorld)
      if(!x.wild&&!x.mead)for(let s=0;s<(x.yard?1:3);s++)if(H(50+s)<(x.yard?.45:.75))add(cx+(H(60+s)-.5)*.7,cz+(H(70+s)-.5)*.7,.03*(.7+H(80+s)*.6),'tree');}}
  // 대로 가로수(07w cxBuildStreet와 같은 자리)
  {const at=(r,c)=>inb(r,c)?M[r][c]:null;const curb=(r,c)=>{const q=at(r,c);return !!q&&q.t!=='road'&&q.t!=='plaza'&&q.t!=='water'&&!q.sea;};
    const city=q=>!q.dirt&&!q.rural&&!q.rail&&!q.br&&!q.sea&&!q.pier&&!q.quay&&!q.sand;
    for(let r=0;r<N;r++)for(let c=0;c<N;c++){const me=M[r][c];if(!me||me.t!=='road'||!city(me)||me.al||me.rw!==2)continue;const ro=me.ro||'x';if(ro!=='h'&&ro!=='v')continue;
      const k=key(r,c),cx=c+.5,cz=r+.5;const sides=[[-1,0],[1,0],[0,-1],[0,1]].filter(([a,b])=>curb(r+a,c+b));
      sides.forEach(([a,b],si)=>{const sk=k*4+si,nb=at(r+a,c+b);const bd=nb&&nb.t==='bldg'?nb.dist:nb&&nb.t==='park'?'park':null;if(bd!=='down'&&bd!=='mid'&&bd!=='park')return;
        for(const t of [-.27,.27]){if(vegH(sk,1350+(t>0))>.5)continue;add(cx+b*.44+(a?t:0),cz+a*.44+(b?t:0),.012,'tree');}});}}
  // 보카주 위 나무(07g2)
  for(const p of G.props||[])if(p.k==='bocage'&&p.tr)add(p.x,p.z,.025,'tree',p);
  return O;}
/* 칸별 색인. 지도·소품이 바뀌면 다시 만든다 */
function vegIdx(){if(!G||!G.map)return null;const V=G._veg;if(V&&V.map===G.map&&V.nv===(G.navV||0)&&V.np===(G.props?G.props.length:0)&&V.n===N)return V.g;
  const g=new Map();for(const o of vegBuild()){for(let a=Math.floor(o.z-o.r);a<=Math.floor(o.z+o.r);a++)for(let b=Math.floor(o.x-o.r);b<=Math.floor(o.x+o.r);b++){const kk=a*1000+b;let L=g.get(kk);if(!L)g.set(kk,L=[]);L.push(o);}}
  Object.defineProperty(G,'_veg',{value:{map:G.map,nv:G.navV||0,np:G.props?G.props.length:0,n:N,g},writable:true,configurable:true,enumerable:false});return g;}
/* 이 나무가 쓰러졌는가(07zw wrvTrees와 같은 규칙) */
function vegDown(o){if(o.p)return !!o.p.dead;if(o.t!=='tree')return false;const v=G.wrkV||0;if(o.fv===v)return o.fell;o.fv=v;o.fell=0;
  for(const q of G.fellZ||[]){const d=Math.hypot(q.x-o.x,q.z-o.z);if(d>q.r)continue;if(d<q.r*.6||vegFallH(Math.round(o.x*997),Math.round(o.z*991))<.65){o.fell=1;break;}}return o.fell;}
/* (x,z) 둘레의 서 있는 나무·덤불 */
function vegNear(x,z){const g=vegIdx();if(!g)return null;const L=g.get(Math.floor(z)*1000+Math.floor(x));return L||null;}
/* 점이 나무·덤불 안인가 */
function vegIn(x,z){const L=vegNear(x,z);if(L)for(const o of L){const dx=x-o.x,dz=z-o.z;if(dx*dx+dz*dz<o.r*o.r&&!vegDown(o))return o;}return null;}
/* 나무·덤불 밖으로 민 자리 (sx,sz는 밀 방향이 애매할 때 쓰는 기준점: 보통 지금 병사 자리) */
function vegPush(x,z,sx,sz){for(let it=0;it<3;it++){const o=vegIn(x,z);if(!o)break;let dx=x-o.x,dz=z-o.z,d=Math.hypot(dx,dz);
    if(d<1e-4){dx=(sx??o.x+1)-o.x;dz=(sz??o.z)-o.z;d=Math.hypot(dx,dz);if(d<1e-4){dx=1;dz=0;d=1;}}
    x=o.x+dx/d*(o.r+.002);z=o.z+dz/d*(o.r+.002);}return [x,z];}
/* 걷는 방향 비틀기: 앞(look 안)에 줄기·덤불이 길을 막으면 그 둘레를 도는 쪽으로 방향을 꺾는다. 결과는 단위 벡터 */
function vegSteer(x,z,ux,uz,look){const L=vegNear(x,z),L2=vegNear(x+ux*look,z+uz*look);let best=null,bt=1e9;
  for(const A of [L,L2])if(A)for(const o of A){const ox=o.x-x,oz=o.z-z;const t=ox*ux+oz*uz;if(t<=0||t>look+o.r)continue;const lat=ox*-uz+oz*ux;   // 진행선에서 옆으로 떨어진 거리
    if(Math.abs(lat)>=o.r)continue;if(t<bt&&!vegDown(o)){bt=t;best={o,lat};}}
  if(!best)return [ux,uz];const {o,lat}=best;const ox=o.x-x,oz=o.z-z,d=Math.hypot(ox,oz)||1e-4;
  // 줄기 중심에서 먼 쪽으로 접선 방향
  const side=lat>0?-1:lat<0?1:((Math.floor(o.x*977+o.z*613)&1)?1:-1);const rr=Math.min(1,o.r/d);const ang=Math.asin(rr)+.05;
  const base=Math.atan2(oz,ox)+side*ang;const tx=Math.cos(base),tz=Math.sin(base);
  return tx*ux+tz*uz>-.2?[tx,tz]:[ux,uz];}
