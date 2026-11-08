/* ===================== 진지 구축 2: 지뢰·벙커·건물 요새화·구호소 =====================
   04d-fort의 방어물에 네 가지를 더한다.
   - 대전차 지뢰(공병): 땅에 묻어 적에게 보이지 않는다. 적 차량이 밟으면 터져 궤도가 끊기고 크게 다친다.
     보병은 밟아도 터지지 않는다. 적 공병이 가까이(반 칸) 오면 찾아내 걷어 낸다. 아군 차량은 안전한 통로를 알아 터뜨리지 않는다.
   - 콘크리트 벙커(공병): 지붕 덮인 토치카. 안의 보병은 사방 엄폐 60%, 포격에도 버틴다. 모든 차량을 막는다.
   - 건물 요새화(보병): 지금 있는 건물 칸의 창을 모래주머니로 막고 벽에 사격 구멍을 낸다.
     그 칸 안 보병 엄폐 40% → 55%(옥상 25% → 45%), 건물이 받는 피해 −30%. 건물이 무너지면 사라진다.
   - 구호소(보병): 앞쪽에 세우는 천막 응급소. 후송조가 출발 지역까지 가지 않고 가까운 구호소로 간다(05m-med).
   방어물은 G.forts에 같은 모양 {id,k,nat,x,z,ry,hp,prog}로 들어간다. 건물 요새화는 칸 가운데에 놓이고 칸에 x.fb = 세력을 남긴다. */
Object.assign(FORT,{
  mine:{n:'대전차 지뢰',len:.16,w:.16,cov:0,h:0,hp:20,bt:6,cost:2,desc:'적에게 보이지 않는 지뢰. 적 차량이 밟으면 궤도가 끊기고 크게 다침. 보병은 안 터짐. 적 공병이 걷어 냄',hidden:1},
  bunker:{n:'벙커',len:.3,w:.3,cov:.6,h:.13,hp:160,bt:20,cost:4,desc:'지붕 덮인 콘크리트 토치카. 안의 보병은 사방 엄폐 60%(포격에도). 모든 차량을 막음',inside:1},
  fortb:{n:'건물 요새화',len:.9,w:.9,cov:0,h:0,hp:400,bt:16,cost:2,desc:'지금 있는 건물 칸의 창을 모래주머니로 막음. 안 보병 엄폐 55%, 건물 피해 −30%',inside:1,bldg:1},
  aid:{n:'구호소',len:.3,w:.22,cov:0,h:.1,hp:25,bt:10,cost:2,desc:'앞쪽 응급 천막. 부상자를 가까운 여기로 후송하고, 둘레 경상자를 치료함',med:1},
});
FORT_KS.push('mine','bunker','fortb','aid');
Object.assign(COVK,{bunker:{n:'벙커',v:.6},fortb:{n:'요새화 건물',v:.55}});
Object.assign(NAV_RULE,{mine:{inf:0,eng:0,veh:0,trk:0},bunker:{inf:2,eng:2,veh:2,trk:2},fortb:{inf:0,eng:0,veh:0,trk:0},aid:{inf:0,eng:0,veh:2,trk:2}});
// 벙커는 안으로 들어가 앉아야 하므로 보병은 막지 않는다(사격 구멍 뒤에 선다)
NAV_RULE.bunker.inf=0;NAV_RULE.bunker.eng=0;
{const _fk=fortKinds;fortKinds=function(type){const k=_fk(type).slice();if(!k.length)return k;
   if(type==='eng'){/* 공병은 전부(FORT_KS) */}
   else{if(type!=='sniper'&&type!=='mortar')k.push('fortb');k.push('aid');}
   return [...new Set(k)].filter(x=>FORT[x]);};}
/* 놓을 수 있나: 지뢰는 도로·광장 등 맨땅, 요새화는 건물 칸 */
{const _cp=fortCanPlace;fortCanPlace=function(n,k,x,z){
   if(k==='fortb'){const t=tileAt(x,z);if(!t||t.t!=='bldg')return '건물 칸을 고르세요';if(t.fb!=null)return '이미 요새화한 건물입니다';if(t.bhp<t.bmax*.5)return '너무 부서진 건물입니다';
     const r=Math.floor(z),c=Math.floor(x);if((G.forts||[]).some(f=>f.k==='fortb'&&Math.floor(f.z)===r&&Math.floor(f.x)===c))return '이미 요새화 중입니다';return null;}
   const why=_cp(n,k,x,z);if(why)return why;
   if(k==='bunker'||k==='aid'){for(const f of G.forts||[])if(Math.hypot(f.x-x,f.z-z)<.3&&f.k!=='mine')return '다른 방어물과 너무 붙어 있습니다';}
   if(k==='aid'&&(G.forts||[]).some(f=>f.k==='aid'&&f.nat===n&&Math.hypot(f.x-x,f.z-z)<3))return '3칸 안에 이미 구호소가 있습니다';
   return null;};}
/* 요새화: 칸 가운데에 놓고 그 건물 칸 안에서 짓는다 */
{const _of=orderFort;orderFort=function(u,k,x,z){if(k!=='fortb')return _of(u,k,x,z);
   const r=Math.floor(z),c=Math.floor(x);const d=FORT.fortb;if(!fortKinds(u.type).includes(k))return '이 부대는 지을 수 없습니다';const N2=G.nats[u.nat];if(N2.cp<d.cost)return '지휘점수가 모자랍니다';
   const why=fortCanPlace(u.nat,k,c+.5,r+.5);if(why)return why;
   const f={id:FORT_ID++,k,nat:u.nat,x:c+.5,z:r+.5,ry:0,hp:d.hp,prog:0,paid:d.cost,r,c};G.forts=G.forts||[];G.forts.push(f);N2.cp-=d.cost;
   if(u.job)fortCancel(u);u.tgt=null;u.tgtTile=null;let sx=c+.5,sz=r+.5;
   // 건물 속에서 걸어갈 수 있는 점(칸 가운데가 막혔으면 둘레)
   if(!walkable(u,sx,sz)){for(const [a,b] of [[.25,0],[-.25,0],[0,.25],[0,-.25],[.25,.25],[-.25,-.25]])if(walkable(u,sx+a,sz+b)){sx+=a;sz+=b;break;}}
   u.dest=[sx,sz];u.path=pathPts(u,sx,sz);u.job={id:f.id,x:sx,z:sz,fb:1};G.fortV=(G.fortV||0)+1;bump();return f;};}
/* 다 지은 요새화는 칸에 표시. 건물이 무너지면 지운다 */
function fort2Sync(){for(const f of (G.forts||[]).slice()){if(f.k!=='fortb')continue;const x=inb(f.r,f.c)?G.map[f.r][f.c]:null;
    if(!x||x.t!=='bldg'){if(x)delete x.fb;fortRemove(f,'blast');continue;}
    if(f.prog>=1&&x.fb!==f.nat){x.fb=f.nat;}}}
/* 엄폐: 벙커 안(사방), 요새화한 건물 칸 */
function bunkerAt(x,z){for(const f of G.forts||[])if(f.k==='bunker'&&f.prog>=1&&inBox(fortShape(f),x,z,.02))return f;return null;}
{const _co=coverOf;coverOf=function(d,a){const c=_co(d,a);const td=UT[d.type];if(td.cls!=='inf')return c;
   const x=cell(d.r,d.c);
   if(x.t==='bldg'&&x.fb!=null&&c.kind==='roof'&&c.cov<.45)return {cov:.45+(c.cov-COVK.roof.v),kind:'fortb'};   // 옥상 난간 모래주머니
   if(x.t==='bldg'&&x.fb!=null&&c.kind==='bldg'){const v=a&&UT[a.type].ex?.42:COVK.fortb.v;if(c.cov<v)return {cov:v+(c.cov-COVK.bldg.v),kind:'fortb'};}
   if(x.t!=='bldg'){const [px,pz]=posOf(d);if(bunkerAt(px,pz)&&c.cov<COVK.bunker.v)return {cov:COVK.bunker.v+(x.smoke>0?.15:0),kind:'bunker'};}
   return c;};
 const _ca=coverAt;coverAt=function(px,pz,cls,objs){const v=_ca(px,pz,cls,objs);if(cls!=='inf')return v;const t=tileAt(px,pz);
   if(t&&t.t==='bldg'&&t.fb!=null)return Math.max(v,COVK.fortb.v);if(bunkerAt(px,pz))return Math.max(v,COVK.bunker.v);return v;};}
// 벙커는 포격도 막는다(참호와 같이 trenchAt을 통해)
{const _ta=trenchAt;trenchAt=function(x,z){return _ta(x,z)||!!bunkerAt(x,z);};}
/* 요새화한 건물은 덜 부서진다 */
{const _db=damageBldg;damageBldg=function(r,c,amt){const x=inb(r,c)?G.map[r][c]:null;if(x&&x.fb!=null&&amt>0)amt=amt*.7;return _db(r,c,amt);};}
/* 폭발: 지뢰는 폭발에 같이 터지고(유도 폭발), 요새화는 건물과 운명을 같이 한다 */
{const _fb=fortBlast;fortBlast=function(x,z,rad,amt){if(!G.forts)return;const keep=G.forts.filter(f=>f.k==='fortb');G.forts=G.forts.filter(f=>f.k!=='fortb');
   try{_fb(x,z,rad,amt);}finally{G.forts=G.forts.concat(keep.filter(f=>!G.forts.includes(f)));}};}
/* ---------- 지뢰 ---------- */
const mineSeen=(f,n)=>f.nat===n||!!(f.spot&&f.spot[n]);
function mineTick(dt){const ms=(G.forts||[]).filter(f=>f.k==='mine'&&f.prog>=1);if(!ms.length)return;
  for(const f of ms){
    for(const u of G.units){if(u.nat===f.nat||UT[u.type].fly)continue;const d=Math.hypot(u.x-f.x,u.z-f.z);
      // 적 공병이 찾아내 걷어 낸다
      if(u.type==='eng'&&d<.55){f.spot=f.spot||{};if(!f.spot[u.nat]){f.spot[u.nat]=1;if(!isAI(u.nat)||!G.fog)L(`${natName(u.nat)} 공병 지뢰 발견`);}
        f.hp-=dt*4;if(f.hp<=0){fortRemove(f,'clear');if(!isAI(u.nat)||!G.fog)L(`${natName(u.nat)} 공병 지뢰 제거`);break;}continue;}
      if(UT[u.type].cls!=='veh')continue;
      if(d<.13+.06){mineBoom(f,u);break;}}}}
function mineBoom(f,v){fortRemove(f,'blast');if(FXH.boom)try{FXH.boom(f.x,f.z,0,false,{pw:1.3});}catch(e){}
  for(const u of G.units.slice()){if(UT[u.type].fly)continue;const d=Math.hypot(u.x-f.x,u.z-f.z);if(d>.6)continue;
    if(u===v){if(UT[u.type].cls==='veh'){const V=vdOf(u);V.mob=1;}harm(u,u.type==='tank'||u.type==='spg'?5:7,null,{kind:'blast',x:f.x,z:f.z,rad:.4,arm:1.3});}
    else harm(u,2.5*(1-d/.6),null,{kind:'blast',x:f.x,z:f.z,rad:.4});}
  L(`${natName(v.nat)} ${UT[v.type].n} 지뢰를 밟음`);bump();}
/* ---------- 매 틱 ---------- */
// 요새화 일은 건물 속 자리 잡기(05e)가 도착점을 바꿔 놓아 04d의 확인을 못 넘는다. 따로 센다: 그 칸 안에 멈춰 있으면 진행
{const _ft=fortTick;fortTick=function(dt){const fj=[];for(const u of G.units)if(u.job&&u.job.fb){fj.push(u);u._fbj=u.job;u.job=null;}
   try{_ft(dt);}finally{for(const u of fj){if(!u.job)u.job=u._fbj;delete u._fbj;}}
   try{fortbTick(dt,fj);fort2Sync();mineTick(dt);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}};}
function fortbTick(dt,list){for(const u of list){const j=u.job;if(!j||!j.fb)continue;const f=(G.forts||[]).find(o=>o.id===j.id);if(!f||f.prog>=1){u.job=null;continue;}
    const inT=Math.floor(u.z)===f.r&&Math.floor(u.x)===f.c;const moving=u.path&&u.path.length;
    if(moving){const e=u.path[u.path.length-1];if(Math.floor(e[1])!==f.r||Math.floor(e[0])!==f.c)fortCancel(u);continue;}   // 다른 곳으로 가라는 명령
    if(!inT){if((u._fbT=(u._fbT||0)+dt)>6){u._fbT=0;fortCancel(u);}continue;}u._fbT=0;
    f.prog=Math.min(1,f.prog+dt/FORT.fortb.bt*(u.type==='eng'?1.8:1)*(u.supp>0?.4:1));
    if(f.prog>=1){u.job=null;const x=G.map[f.r][f.c];if(x.t==='bldg')x.fb=f.nat;G.fortV=(G.fortV||0)+1;bump();if(!isAI(u.nat)||!G.fog)L(`${natName(u.nat)} 건물 요새화 완료`);try{sfx('build');}catch(e){}}}}

/* ---------- AI: 지뢰·벙커·요새화·구호소 ---------- */
{const _af=aiFort;aiFort=function(n){_af(n);try{aiFort2(n);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}};}
function aiFort2(n){const N2=G.nats[n];if(Math.random()>.35)return;const own=G.objs.filter(o=>G.map[o.r][o.c].owner===n);
  const mine=(G.forts||[]).filter(f=>f.nat===n);const cnt=k=>mine.filter(f=>f.k===k).length;
  const eVeh=G.units.some(e=>e.nat!==n&&UT[e.type].cls==='veh'&&seen(e,n));
  for(const u of G.units){if(u.nat!==n||u.job||(u.path&&u.path.length)||u.tgt!=null||u.brk)continue;const ks=fortKinds(u.type);if(!ks.length)continue;
    const o=own.find(q=>Math.hypot(q.c+.5-u.x,q.r+.5-u.z)<3);
    const t=tileAt(u.x,u.z);
    // 거점 건물 안에 들어앉은 보병: 그 칸을 요새화
    if(o&&t&&t.t==='bldg'&&t.fb==null&&ks.includes('fortb')&&N2.cp>=6&&cnt('fortb')<own.length*2){if(typeof orderFort(u,'fortb',u.x,u.z)!=='string')return;}
    if(!o)continue;
    // 공병: 적 차량이 오면 거점으로 오는 길목 도로에 지뢰
    if(u.type==='eng'&&eVeh&&N2.cp>=6&&cnt('mine')<3+own.length*2){const [fx,fz]=fortFront(n,u.x,u.z);
      for(const s of [.8,1.2,1.6]){const x=u.x+fx*s+(Math.random()-.5)*.4,z=u.z+fz*s+(Math.random()-.5)*.4;const tt=tileAt(x,z);if(!tt||tt.t!=='road')continue;if(typeof orderFort(u,'mine',x,z)!=='string')return;}}
    // 공병: 지휘점수가 넉넉하면 거점 앞 벙커
    if(u.type==='eng'&&N2.cp>=12&&cnt('bunker')<own.length&&t&&t.t!=='bldg'){const [fx,fz]=fortFront(n,u.x,u.z);if(typeof orderFort(u,'bunker',u.x+fx*.3,u.z+fz*.3)!=='string')return;}}
  // 구호소: 부상자가 많은데 앞쪽(출발 지역에서 먼 곳)에 구호소가 없으면, 거점 근처 쉬는 보병이 세운다
  const hurt=G.units.filter(u=>u.nat===n&&u.ws&&u.ws.some(w=>w.s==='hw'&&!w.y)).length+(G.evac||[]).filter(p=>p.nat===n&&p.ph==='out').length;
  if(hurt>=2&&N2.cp>=5&&cnt('aid')<Math.max(1,own.length)){
    for(const u of G.units){if(u.nat!==n||u.job||(u.path&&u.path.length)||u.brk||!fortKinds(u.type).includes('aid')||u.type==='eng')continue;
      if(inZone(n,u.r,u.c))continue;const t=tileAt(u.x,u.z);if(!t||t.t==='bldg')continue;
      if(mine.some(f=>f.k==='aid'&&Math.hypot(f.x-u.x,f.z-u.z)<5))continue;
      if(hotAt(n,u.x,u.z,3))continue;
      const [fx,fz]=fortFront(n,u.x,u.z);if(typeof orderFort(u,'aid',u.x-fx*.6,u.z-fz*.6)!=='string')return;}}}
