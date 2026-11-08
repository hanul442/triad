/* ===================== SNIPE: 저격수와 대저격 =====================
   근거(공개 자료): FM 3-21.71 6장(분대·소대는 저격에 매우 약하다, 대저격 훈련, 저격수는 후송도 막는다),
   MWI 모술 사례 연구(IS 저격수가 건물 위층에서 진격을 늦춤, 저격수 건물에 대한 공습).
   - 저격수의 한 발은 분대에서 한 사람을 고른다: 분대장(0번)을 먼저 노리고, 움직이거나 드러난 사람을 노린다.
     방탄판이 잘 막지 못하고 치명상이 많다. 맞은 분대는 크게 제압되고 사기가 떨어진다(누가 쐈는지 못 보면 더).
   - 쏘면 위치가 드러난다: 밖이나 옥상에서는 5초, 건물 안 깊숙이서는 60% 확률로 2.5초 동안 맞은 쪽 세력이 볼 수 있다.
     맞은 쪽 지도에는 8초 동안 "저격 추정 위치"가 뜬다(조금 빗나간 자리).
   - AI 대저격: 추정 위치가 건물이면 근처 전차·대전차팀·박격포·자주포가 그 건물을 친다.
     AI 저격수는 한자리에서 세 발 넘게 쏘고 들켰으면 다른 건물로 자리를 옮긴다. */
const SNP={supp:1,mor:6,morUnseen:10,revIn:2.5,revOut:5,revInP:.6,mark:8,jit:.6,relocN:3};
function snpVictim(u){const M=menOf(u);const L=M.filter(m=>!m.dead&&!m.gone&&!m.down);if(!L.length)return null;
  let best=null,bs=-1e9;for(const m of L){const s=Math.random()+(m.i===0?1.2:0)+(m.spd>.05?.5:0)-(m.pr>0?.4:0);if(s>bs){bs=s;best=m;}}return best;}
{const _h=hurtMen;hurtMen=function(u,amt,by,o){o=o||{};
  if(!by||by.type!=='sniper'||(o.kind||'bullet')!=='bullet'||u.nocas)return _h(u,amt,by,o);
  const m=snpVictim(u);u._hitT=G.time||0;u._thr=[by.x,by.z,G.time||0];
  if(m)woundMan(u,m,'blast',0,by);   // 겨눈 한 발: 방탄판에 잘 안 막히고 치명상이 많다
  const unseen=G.fog&&!seen(by,u.nat);u.supp=Math.min(3,(u.supp||0)+SNP.supp);if(u.mor!=null)u.mor=Math.max(0,u.mor-(unseen?SNP.morUnseen:SNP.mor));
  casSync(u,by);};}
{const _s=rtShoot;rtShoot=function(a,d){const r=_s(a,d);if(a.type!=='sniper'||!G.units)return r;const t=G.time||0;
  const k=key(a.r,a.c);a._snpN=a._snpK===k?(a._snpN||0)+1:1;a._snpK=k;
  const inB=cell(a.r,a.c).t==='bldg'&&!(typeof onRoof==='function'&&onRoof(a));
  if(!inB||Math.random()<SNP.revInP)a._snpRev={n:d.nat,t:t+(inB?SNP.revIn:SNP.revOut)};
  const j=SNP.jit;G.snpMk=(G.snpMk||[]).filter(m=>m.t>t);G.snpMk.push({x:a.x+(Math.random()-.5)*j*2,z:a.z+(Math.random()-.5)*j*2,t:t+SNP.mark,n:d.nat,id:a.id});
  if(d.nat===G.viewer&&!isAI(d.nat)&&t-(G._snpAl||-99)>6){G._snpAl=t;L('저격! 추정 위치를 지도에 표시');}
  return r;};}
{const _s=seen;seen=function(e,n,vs){if(e&&e.type==='sniper'&&e._snpRev&&e._snpRev.n===n&&e._snpRev.t>(G.time||0))return true;return _s(e,n,vs);};}
function snpAI(n){const t=G.time||0;
  for(const m of G.snpMk||[]){if(m.n!==n||m.used||m.t<=t)continue;const r=Math.floor(m.z),c=Math.floor(m.x);if(!inb(r,c)||G.map[r][c].t!=='bldg')continue;
    let best=null,bd=1e9;for(const u of G.units){if(u.nat!==n||u.job||u.tgt!=null||u.tgtTile!=null||(u.path&&u.path.length))continue;const ta=UT[u.type];if(!ta.ex||!ta.rng[1])continue;
      if(!canHitTile(u,r,c))continue;const d=Math.hypot(u.x-m.x,u.z-m.z);if(d<bd){bd=d;best=u;}}
    if(best){orderBldg(best,r,c);m.used=1;}}
  for(const u of G.units){if(u.nat!==n||u.type!=='sniper'||u.job||(u._snpN||0)<SNP.relocN||!(u._snpRev&&u._snpRev.t>t-4))continue;
    let best=null,bs=-1e9;for(let r=u.r-3;r<=u.r+3;r++)for(let c=u.c-3;c<=u.c+3;c++){if(!inb(r,c)||(r===u.r&&c===u.c))continue;const X=G.map[r][c];if(X.t!=='bldg'||X.f<2)continue;
      if(G.units.some(e=>e.nat!==n&&Math.hypot(e.x-(c+.5),e.z-(r+.5))<2))continue;const s=X.f-Math.hypot(r-u.r,c-u.c)*.5+Math.random();if(s>bs){bs=s;best=[r,c];}}
    if(best){orderMove(u,best[0],best[1]);u._snpN=0;u.job='ug';u._ugT=t+12;}}}
{const _t=rtTick;rtTick=function(dt){_t(dt);if(!G||!G.units||G.over)return;const t=G.time||0;if(t<(G._snpAI||0))return;G._snpAI=t+1;
  try{for(const n of G.order||[])if(G.nats[n].alive&&isAI(n))snpAI(n);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}};}
