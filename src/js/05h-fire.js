/* ===================== 건물 화재 =====================
   폭발(포탄·대전차 화기·공습·붕괴)이 건물에 불을 붙인다. 불은 커지면서 위층으로 타고 오르고(x.fireFl),
   같은 블록 옆 칸으로, 드물게 붙어 있는 다른 건물로 번진다. 타는 동안 건물이 상하고 안의 보병이 다친다.
   연료(x.fuel)를 다 태우면 꺼지고 그을린 채 남는다(x.burnt). 많이 상하면 무너진다(damageBldg).
   G.fires: 타고 있는 칸 key 목록. */
const FIRE_DPS=.32;            // 다 타오를 때 초당 건물 피해
const FIRE_HURT=.22;           // 다 타오를 때 초당 보병 피해
function ignite(r,c,p){if(!inb(r,c))return false;const x=G.map[r][c];if(x.t!=='bldg'||x.fire>0||x.burnt)return false;if(Math.random()>=(p??1))return false;
  x.fire=.25;x.fuel=35+Math.random()*45;x.fireFl=0;x.fdmg=0;G.fires=G.fires||[];G.fires.push(key(r,c));
  L(`${x.obj!=null?G.objs[x.obj].name+' ':''}건물에 불이 붙었다`);bump();return true;}
function fireTick(dt){if(!G.fires||!G.fires.length)return;const keep=[];
  for(const k of G.fires){const r=kr(k),c=kc(k);const x=G.map[r][c];if(x.t!=='bldg'||!(x.fire>0)){x.fire=0;continue;}
    x.fire=Math.min(1,x.fire+dt*.045);x.fuel-=dt*(.4+x.fire*.6);
    x.fireFl=Math.min(Math.max(0,x.f-1),x.fireFl+dt*.05*x.fire);
    x.fdmg+=dt*FIRE_DPS*x.fire;if(x.fdmg>=1){const a=Math.floor(x.fdmg);x.fdmg-=a;damageBldg(r,c,a);if(x.t!=='bldg')continue;}
    // 번짐
    for(const [a,b] of nbrs(r,c)){const y=G.map[a][b];if(y.t!=='bldg'||y.fire>0||y.burnt)continue;const same=y.blk!=null&&y.blk===x.blk;
      if(Math.random()<dt*x.fire*(same?.022:.004))ignite(a,b,1);}
    // 안의 보병
    for(const u of G.units.slice()){if(u.r!==r||u.c!==c||UT[u.type].cls!=='inf')continue;const fl=curFl(u);if(fl>x.fireFl+1.2&&x.fire<.8)continue;
      blastHurt(u,Math.round(dt*FIRE_HURT*x.fire*100)/100,null);u.supp=Math.max(u.supp||0,1);
      // 멈춰 있는 부대는 불을 피해 나간다
      if(G.units.includes(u)&&x.fire>.55&&!(u.path&&u.path.length)&&u._fleeK!==k){u._fleeK=k;const out=fireExit(u);if(out)orderMove(u,out[0],out[1]);}}
    if(x.fuel<=0){x.fire=0;x.burnt=1;bump();continue;}
    keep.push(k);}
  G.fires=keep;}
/* 불난 건물에서 가장 가까운 바깥 칸 */
function fireExit(u){let best=null,bd=1e9;for(let a=u.r-3;a<=u.r+3;a++)for(let b=u.c-3;b<=u.c+3;b++){if(!inb(a,b))continue;const y=G.map[a][b];if(y.t==='bldg'||mcost(u.type,y)===Infinity)continue;
  const d=dist(u.r,u.c,a,b);if(d<bd){bd=d;best=[a,b];}}return best;}
/* 건물이 무너지면 옆 건물에 불이 옮겨 붙기도 한다 */
{const _db=damageBldg;damageBldg=function(r,c,amt){const x=G.map[r][c];const was=x.t==='bldg';_db(r,c,amt);
  if(was&&x.t!=='bldg'){x.fire=0;for(const [a,b] of nbrs(r,c))ignite(a,b,.18);}};}
