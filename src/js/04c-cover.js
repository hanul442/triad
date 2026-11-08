/* ===================== COVER: 칸 없는 엄폐와 명중률 =====================
   엄폐는 서 있는 칸 종류가 아니라 실제 위치와 쏘는 방향으로 정한다.
   - 건물 안: 40% (폭발물은 절반만)
   - 쏘는 쪽으로 반 칸 안에 건물 외벽이 있으면 벽 엄폐 35% (차량은 20%)
   - 쏘는 쪽으로 차량·잔해 차량·소품(G.covers)이 붙어 있으면 그 물체의 엄폐 (보병만)
   - 잔해 위 25%, 공원(나무) 15%. 연막 +15%, 제압당해 엎드린 보병 +10%
   옆이나 뒤에서 쏘면 벽·차량 엄폐는 없다. 2층 이상 높은 곳에서 내려 쏘면 낮은 엄폐는 절반.
   엄폐는 명중률을 깎는다. 피해 기댓값(calcDmg) = 기본 화력 × 명중률. */
const COVK={bldg:{n:'건물 안',v:.4},roof:{n:'옥상 난간',v:.25},wall:{n:'벽',v:.35},veh:{n:'차량',v:.3},wreck:{n:'잔해 차량',v:.3},prop:{n:'엄폐물',v:.25},car:{n:'차량',v:.3},barrier:{n:'방호벽',v:.35},hedge:{n:'덤불',v:.15},rubble:{n:'잔해',v:.25},park:{n:'나무',v:.15}};
const VOLLEY={rifle:4,mg:6,at:1,sniper:1,eng:2,mortar:1,ifv:3,tank:1,drone:1};
/* 엄폐물 목록: 지상 차량(서 있는 것) + 도시 소품·잔해 차량(G.covers: {x,z,r,cov,kind}) */
// 큰 도시는 소품이 수천 개라 칸별 묶음(G._cg)으로 가까운 것만 본다. 목록이 바뀌면 다시 묶는다.
function coverGrid(){const C=G.covers||[];let g=G._cg;if(g&&g.ref===C&&g.n===C.length&&g.N===N)return g.m;
  const m=new Map();for(const c of C){const k=Math.floor(c.z)*N+Math.floor(c.x);let a=m.get(k);if(!a)m.set(k,a=[]);a.push(c);}
  Object.defineProperty(G,'_cg',{value:{ref:C,n:C.length,N,m},writable:true,configurable:true,enumerable:false});return m;}
/* 세워 둔 차·불탄 차는 땅에 선 사람 눈높이를 가린다: 시야선이 그 위를 낮게(PROP_LOS_H층 아래) 지나가면 막힌다.
   바로 붙어 있는 쪽(엄폐로 쓰는 쪽)은 위나 옆으로 내다보니 막지 않는다. 낮은 소품(방호벽·모래주머니·덤불)은 시야를 막지 않는다. */
const PROP_LOS={car:1,wreck:1},PROP_LOS_H=.7;
function propBlocks(x1,z1,h1,x2,z2,h2){if(h1>=PROP_LOS_H&&h2>=PROP_LOS_H)return false;const C=G.covers;if(!C||!C.length)return false;
  const m=coverGrid();const dx=x2-x1,dz=z2-z1,L=Math.hypot(dx,dz);if(L<.5)return false;const seen=new Set();
  const n=Math.ceil(L/.3);for(let i=0;i<=n;i++){const px=x1+dx*i/n,pz=z1+dz*i/n;
    for(const [ox,oz] of [[-.2,-.2],[.2,-.2],[-.2,.2],[.2,.2]]){const k=Math.floor(pz+oz)*N+Math.floor(px+ox);if(seen.has(k))continue;seen.add(k);const a=m.get(k);if(!a)continue;
      for(const o of a){if(!PROP_LOS[o.kind])continue;const R=(o.r??.2)*.85;
        const t=((o.x-x1)*dx+(o.z-z1)*dz)/(L*L);if(t<=0||t>=1)continue;const qx=x1+dx*t,qz=z1+dz*t;if(Math.hypot(qx-o.x,qz-o.z)>R)continue;
        if(Math.hypot(o.x-x1,o.z-z1)<R+.3||Math.hypot(o.x-x2,o.z-z2)<R+.3)continue;
        if(h1+(h2-h1)*t<PROP_LOS_H)return true;}}}
  return false;}
function coverObjs(skip){const o=[];for(const u of G.units)if(u!==skip&&UT[u.type].cls==='veh'){const [x,z]=posOf(u);o.push({x,z,r:.22,cov:COVK.veh.v,kind:'veh'});}
  const m=coverGrid();o.near=(px,pz)=>{const out=o.slice();const r0=Math.floor(pz),c0=Math.floor(px);
    for(let r=r0-1;r<=r0+1;r++)for(let c=c0-1;c<=c0+1;c++){const a=m.get(r*N+c);if(a)for(const x of a)out.push(x);}return out;};
  return o;}
/* 점 (px,pz)에서 방향 (ux,uz)로 막아 주는 엄폐 */
function dirCoverAt(px,pz,ux,uz,cls,skip,objs){let best={cov:0,kind:null};const put=(cov,kind)=>{if(cov>best.cov)best={cov,kind};};
  const own=tileAt(px,pz);
  for(const k of [.15,.3,.45]){const qx=px+ux*k,qz=pz+uz*k;const r=Math.floor(qz),c=Math.floor(qx);if(!inb(r,c))break;const x=G.map[r][c];
    if(x.t==='bldg'&&x!==own){const b=bldgBox(r,c);if(qx>=b[0]&&qx<=b[1]&&qz>=b[2]&&qz<=b[3]){put(cls==='veh'?.2:COVK.wall.v,'wall');break;}}
    if(x.t==='rubble'&&x!==own)put(.2,'rubble');}
  if(cls==='inf'){const L=objs||coverObjs(skip);for(const o of L.near?L.near(px,pz):L){const vx=o.x-px,vz=o.z-pz,d=Math.hypot(vx,vz);const R=(o.r??.25)+.35;if(d>R||d<.02)continue;
    if((vx*ux+vz*uz)/d>.45)put(o.cov??(COVK[o.kind]||COVK.prop).v,o.kind||'prop');}}
  return best;}
/* 부대 d가 a의 사격에 대해 받는 엄폐 {cov, kind}. a가 없으면 어느 방향이든 가장 좋은 엄폐(표시용). */
function coverOf(d,a){const td=UT[d.type];if(td.fly)return {cov:0,kind:null};const x=cell(d.r,d.c);
  let best={cov:0,kind:null};const put=c=>{if(c.cov>best.cov)best=c;};
  if(x.t==='bldg')put(typeof onRoof==='function'&&onRoof(d)?{cov:COVK.roof.v,kind:'roof'}:{cov:COVK.bldg.v,kind:'bldg'});
  else{if(TT[x.t].cov)put({cov:TT[x.t].cov,kind:x.t});
    const ind=a&&UT[a.type].ind;const [px,pz]=posOf(d);const objs=coverObjs(d);
    if(td.cls==='inf'&&typeof trenchAt==='function'&&trenchAt(px,pz))put({cov:COVK.trench.v,kind:'trench'});// 참호 안: 사방·곡사 모두 (04d-fort)
    if(!ind){let dirs;if(a){const [ax,az]=posOf(a);const L=Math.hypot(ax-px,az-pz)||1;dirs=[[(ax-px)/L,(az-pz)/L]];}else dirs=DIR8.map(([p,q])=>{const L=Math.hypot(p,q);return [q/L,p/L];});
      const low=a&&eye(a)+elU(a)>=eye(d)+elU(d)+2;   // 내려다보는 사격(높은 건물·언덕)은 엄폐를 반만 쓴다
      for(const [ux,uz] of dirs){const c=dirCoverAt(px,pz,ux,uz,td.cls,d,objs);if(low)c.cov*=.5;put(c);}}
    if(td.cls==='inf'&&d.supp>0&&best.cov>0)best={cov:best.cov+.1,kind:best.kind};}
  if(x.smoke>0)best={cov:best.cov+.15,kind:best.kind||'smoke'};
  return best;}
/* 명중률 {p, cov, kind}: 거리에 따른 정확도 × (1 − 엄폐) */
function hitP(a,d){const ta=UT[a.type];const rm=ta.rng[1]||1;const dd=udist(a,d);
  const acc=a.type==='sniper'||ta.ind?1:Math.min(1,1.05-.3*Math.pow(dd/rm,2));
  const c=coverOf(d,a);let cov=c.cov;if(ta.ex&&c.kind==='bldg')cov*=.5;
  let p=Math.max(0,acc*(1-Math.min(.85,cov)));if(UT[d.type].fly&&typeof airAcc==='function')p*=airAcc(a,d,dd);  // 하늘의 표적은 대부분 빗나간다(05f-air)
  return {p,cov,kind:c.kind};}
/* 기본 화력(명중 시) */
function rawDmg(a,d,counter){const ta=UT[a.type],td=UT[d.type];let v=ta.atk[td.cls]||0;if(!v)return 0;
  v*=.4+.6*a.hp/hpMax(a);const ax=cell(a.r,a.c);
  if(a.type==='at'&&td.cls==='veh'&&(ax.t==='bldg'||ax.t==='rubble'))v*=1.25;
  if(td.cls==='veh'&&ta.cls==='inf'&&udist(a,d)<=1.2)v*=1.2;
  if(td.armor&&a.type!=='at'&&a.type!=='eng'&&a.type!=='tank')v*=.65;
  if(eye(a)>=eye(d)+2&&!ta.ind)v*=1.15;
  if(a.supp)v*=.7;v*=1+.1*(a.rank||0);if(counter)v*=.6;
  return v;}
/* 피해 기댓값 (AI 판단, 턴제식 공격, 경계 사격에 쓴다) */
function calcDmg(a,d,counter){const v=rawDmg(a,d,counter);if(!v)return 0;return v*hitP(a,d).p;}
/* 이 지점 근처에 엄폐가 되는 자리가 있으면 그쪽으로 붙는다 (보병 이동 명령의 도착점) */
function coverAt(px,pz,cls,objs){const t=tileAt(px,pz);if(!t)return 0;if(t.t==='bldg')return COVK.bldg.v;let b=TT[t.t].cov||0;
  if(cls==='inf'&&typeof trenchAt==='function'&&trenchAt(px,pz))b=Math.max(b,COVK.trench.v);
  for(const [p,q] of DIR8){const L=Math.hypot(p,q);b=Math.max(b,dirCoverAt(px,pz,q/L,p/L,cls,null,objs).cov);}return b;}
function coverSnap(u,x,z){if(UT[u.type].cls!=='inf')return [x,z];const objs=coverObjs(u);const c0=coverAt(x,z,'inf',objs);if(c0>=.3)return [x,z];
  let best=[x,z],bs=c0+.05;
  for(const rad of [.25,.45,.65])for(let i=0;i<12;i++){const a=i/12*Math.PI*2;const px=x+Math.cos(a)*rad,pz=z+Math.sin(a)*rad;if(!walkable(u,px,pz))continue;
    const t=tileAt(px,pz);if(t.t==='bldg')continue;const s=coverAt(px,pz,'inf',objs)-rad*.1;if(s>bs){bs=s;best=[px,pz];}}
  return best;}
