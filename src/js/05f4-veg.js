/* ===================== 나무·덤불: 보병이 뚫고 지나가지 않게 =====================
   화면이 그리는 나무 줄기·아래 가지·덤불 자리를 화면과 같은 해시(v3Hash)로 다시 계산해 둔다.
     숲 칸(07g3 natWildTrees): 가문비·소나무와 바닥 덤불 / 목초지·공원·밭 가장자리 덤불과 어린 가문비(07g3 natWorld)
     공원·마당 나무(07p v3BuildPark) / 공원 마른 나무(07 v3BuildWorld) / 대로 가로수(07w) / 보카주 나무(07g2)
   병사(05f-men)는 그 둘레 원 안으로 들어가지 않는다: 줄기를 향해 걸으면 옆으로 비켜 돌아가고,
   설 자리·엄폐 자리가 나무 안이면 바깥으로 민다. 차량은 그대로 숲을 밀고 나간다(05o-wreck, 10d-landexit).
   포격·전차에 쓰러진 나무(G.fellZ, 07zw-wreck과 같은 규칙)와 부서진 보카주는 막지 않는다.
   생울타리(hedge·bocage 줄)는 틈으로만 지나간다(04d hedgeGap, NAV_RULE inf:2). 전차가 밟거나 포탄에 쓰러지면 누구나 넘는다.
   분대 길찾기는 막지 않지만 병사가 안에 서면 안 되는 낮은 물체도 같은 원으로 다룬다:
     통나무 더미(logs), 쓰레기 컨테이너(bin), 공원 벤치, 거점 둘레 모래주머니(07 v3BuildWorld가 그리는 것) */
const VEG={body:.02,   // 병사 몸 반지름(약 0.25m)
  head:.15};           // 선 병사 키(1.8m): 이보다 높은 가지는 걸리지 않는다
const vegH=(k,s)=>typeof v3Hash==='function'?v3Hash(k,s):0;
const vegFallH=(a,b)=>{let h=Math.imul((a|0)^0x9e3779b9,2654435761)^Math.imul(b|0,40503);h=Math.imul(h^h>>>15,2246822507);h^=h>>>13;return (h>>>0)/4294967296;};   // 07zw wrvHash와 같은 식
/* 가문비 원뿔 층(07g3 natGeos와 같은 값): [밑 높이, 반지름, 높이] */
const VEG_SPR=[[.15,.12,.34],[.36,.105,.3],[.56,.08,.26],[.74,.05,.26]];
/* 가문비: 줄기와, 밑면이 병사 키보다 낮은 가지 층 중 가장 넓은 것 */
function vegSpruceR(s,sy){let r=.018*s;for(const [y,rad] of VEG_SPR)if(y*sy<VEG.head+.005)r=Math.max(r,rad*s*.95);return r;}
function vegPineR(s,sy){let r=.017*s;if(.37*sy<VEG.head+.005)r=Math.max(r,.085*s*.9);return r;}
function vegClime(){return typeof bmClime==='function'?bmClime():'temp';}
/* 지도 전체의 나무·덤불 원 목록 {x,z,r,t:'tree'|'bush',p?} */
function vegBuild(){const M=G.map,O=[],cl=vegClime(),benches=[];const add=(x,z,r,t,p)=>O.push({x,z,r:r+VEG.body,t,p,fv:-1,fell:0});
  const bush=s=>.066*s;   // 팔면체 두 덩이(긴 쪽 .07)
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
      if(!x.yard&&!x.wild&&H(470)<.45){const side=H(471)<.5;benches.push([cx+(side?.12:0),cz+(side?0:.12),side]);}   // 공원 벤치(07p)
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
  // 상자 모양: (x,z) 가운데, (ax,az) 긴 쪽 단위 방향, hl 반 길이, hw 반 폭
  const bar=(x,z,ax,az,hl,hw,t,p)=>O.push({x,z,r:Math.hypot(hl+VEG.body,hw+VEG.body),b:{ax,az,hl:hl+VEG.body,hw:hw+VEG.body},t,p,fv:-1,fell:0});
  for(const [x,z,side] of benches)bar(x,z,side?0:1,side?1:0,.075,.025,'prop');
  for(const p of G.props||[]){const cs=Math.cos(p.ry||0),sn=Math.sin(p.ry||0);
    if(p.k==='logs')bar(p.x,p.z,cs,-sn,.2,.08,'prop',p);                 // 통나무 더미(길이 약 5m)
    else if(p.k==='bin')bar(p.x,p.z,sn,cs,.08,.045,'prop',p);}           // 쓰레기 컨테이너
  // 거점 둘레 모래주머니(07 v3BuildWorld와 같은 자리)
  for(const o of G.objs||[])for(const [a,b] of [[-1,0],[1,0],[0,-1],[0,1]]){const r=o.r+a,c=o.c+b;if(!inb(r,c)||M[r][c].t==='bldg'||M[r][c].t==='water')continue;
    bar(c+.5-a*.38,r+.5-b*.38,b?1:0,b?0:1,.3,.06,'prop');}
  return O;}
/* 칸별 색인. 지도·소품이 바뀌면 다시 만든다 */
function vegIdx(){if(!G||!G.map)return null;const V=G._veg;if(V&&V.map===G.map&&V.nv===(G.navV||0)&&V.np===(G.props?G.props.length:0)&&V.no===(G.objs?G.objs.length:0)&&V.n===N)return V.g;
  const g=new Map();for(const o of vegBuild()){for(let a=Math.floor(o.z-o.r);a<=Math.floor(o.z+o.r);a++)for(let b=Math.floor(o.x-o.r);b<=Math.floor(o.x+o.r);b++){const kk=a*1000+b;let L=g.get(kk);if(!L)g.set(kk,L=[]);L.push(o);}}
  Object.defineProperty(G,'_veg',{value:{map:G.map,nv:G.navV||0,np:G.props?G.props.length:0,no:G.objs?G.objs.length:0,n:N,g},writable:true,configurable:true,enumerable:false});return g;}
/* 이 나무가 쓰러졌는가(07zw wrvTrees와 같은 규칙) */
function vegDown(o){if(o.p)return !!(o.p.dead||o.p.crush);if(o.t!=='tree')return false;const v=G.wrkV||0;if(o.fv===v)return o.fell;o.fv=v;o.fell=0;
  for(const q of G.fellZ||[]){const d=Math.hypot(q.x-o.x,q.z-o.z);if(d>q.r)continue;if(d<q.r*.6||vegFallH(Math.round(o.x*997),Math.round(o.z*991))<.65){o.fell=1;break;}}return o.fell;}
/* (x,z) 둘레의 서 있는 나무·덤불 */
function vegNear(x,z){const g=vegIdx();if(!g)return null;const L=g.get(Math.floor(z)*1000+Math.floor(x));return L||null;}
/* 점이 이 물체 안인가 (원 또는 상자) */
function vegHit(o,x,z){const dx=x-o.x,dz=z-o.z;if(dx*dx+dz*dz>=o.r*o.r)return false;if(!o.b)return true;const B=o.b;return Math.abs(dx*B.ax+dz*B.az)<B.hl&&Math.abs(-dx*B.az+dz*B.ax)<B.hw;}
/* 점이 나무·덤불 안인가 */
function vegIn(x,z){const L=vegNear(x,z);if(L)for(const o of L)if(vegHit(o,x,z)&&!vegDown(o))return o;return null;}
/* 물체 o 밖으로 민 자리 */
function vegOut(o,x,z,sx,sz){let dx=x-o.x,dz=z-o.z;
  if(o.b){const B=o.b;let l=dx*B.ax+dz*B.az,w=-dx*B.az+dz*B.ax;const pl=B.hl-Math.abs(l),pw=B.hw-Math.abs(w);   // 덜 파고든 쪽 면으로
    if(pw<=pl)w=(w>=0?1:-1)*(B.hw+.002);else l=(l>=0?1:-1)*(B.hl+.002);return [o.x+l*B.ax-w*B.az,o.z+l*B.az+w*B.ax];}
  let d=Math.hypot(dx,dz);if(d<1e-4){dx=(sx??o.x+1)-o.x;dz=(sz??o.z)-o.z;d=Math.hypot(dx,dz);if(d<1e-4){dx=1;dz=0;d=1;}}
  return [o.x+dx/d*(o.r+.002),o.z+dz/d*(o.r+.002)];}
/* 나무·덤불 밖으로 민 자리 (sx,sz는 밀 방향이 애매할 때 쓰는 기준점: 보통 지금 병사 자리). 겹친 덤불 사이라 못 빠져나오면 null */
function vegPush(x,z,sx,sz){for(let it=0;it<4;it++){const o=vegIn(x,z);if(!o)return [x,z];[x,z]=vegOut(o,x,z,sx,sz);}return vegIn(x,z)?null:[x,z];}
/* 병사 한 걸음: (nx,nz)가 나무·덤불 안이면 바깥으로 민 자리, 그것도 안 되면 제자리. 이미 안에 있으면(배치·밀려남) 나오게 둔다 */
function vegStep(u,m,nx,nz){if(!vegIn(nx,nz)||vegIn(m.x,m.z))return [nx,nz];
  const t=G.time||0;if(m.vfree>t)return [nx,nz];   // 한참 막혀 있었으면 잠깐 헤치고 지나간다(덤불 사이에 갇히지 않게)
  const q=vegPush(nx,nz,m.x,m.z);if(q&&(typeof menClear!=='function'||menClear(u,m.x,m.z,q[0],q[1]))){m.vstk=0;return q;}
  m.vstk=(m.vstk||0)+1;if(m.vstk>15){m.vstk=0;m.vfree=t+.8;}return [m.x,m.z];}
/* 걷는 방향 비틀기: 앞(look 안)에 줄기·덤불이 길을 막으면 그 둘레를 도는 쪽으로 방향을 꺾는다. 결과는 단위 벡터 */
function vegSteer(x,z,ux,uz,look){const L=vegNear(x,z),L2=vegNear(x+ux*look,z+uz*look);let best=null,bt=1e9;
  for(const A of [L,L2])if(A)for(const o of A){let cx=o.x,cz=o.z,rad=o.r;
      if(o.b){const B=o.b;const l=Math.max(-B.hl,Math.min(B.hl,(x-o.x)*B.ax+(z-o.z)*B.az));cx=o.x+B.ax*l;cz=o.z+B.az*l;rad=B.hw;}   // 상자: 가장 가까운 등줄기 점을 원으로
      const ox=cx-x,oz=cz-z;const t=ox*ux+oz*uz;if(t<=0||t>look+rad)continue;const lat=ox*-uz+oz*ux;   // 진행선에서 옆으로 떨어진 거리
      if(Math.abs(lat)>=rad)continue;if(t<bt&&!vegDown(o)){bt=t;best={cx,cz,rad,lat};}}
  if(!best)return [ux,uz];const {cx,cz,rad,lat}=best;const ox=cx-x,oz=cz-z,d=Math.hypot(ox,oz)||1e-4;
  // 줄기 중심에서 먼 쪽으로 접선 방향
  const side=lat>0?-1:lat<0?1:((Math.floor(cx*977+cz*613)&1)?1:-1);const rr=Math.min(1,rad/d);const ang=Math.asin(rr)+.05;
  const base=Math.atan2(oz,ox)+side*ang;const tx=Math.cos(base),tz=Math.sin(base);
  return tx*ux+tz*uz>-.2?[tx,tz]:[ux,uz];}
/* 울타리가 쓰러지면(전차·포탄) 이동 격자를 다시 만든다: 그 자리로 보병도 넘어간다 */
if(typeof wrkPropSet==='function'){const _w=wrkPropSet;wrkPropSet=function(p,st){const ok=_w(p,st);if(ok&&st==='dead'&&p&&(p.k==='hedge'||p.k==='bocage'))G.navV=(G.navV||0)+1;return ok;};}
