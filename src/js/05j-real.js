/* ===================== REAL: 공개 교범·실전 사례에서 가져온 시가전 규칙 =====================
   근거(공개 자료): FM 3-06.11 7장(시가지 무기 운용: 전차 포 앙각·부각, 밀폐 공간 무반동/로켓 후폭풍),
   그로즈니 1995 교훈(전차 포가 위층·지하를 못 쏨, 호위 없는 전차가 측면·후면·위에서 맞음),
   MWI "School of Street Fighting"(우크라이나: 보병-기갑 협동, 연막으로 도로 횡단), 분대 전투 교범(진입 전 수류탄, 연막 차장).
   1칸 ≈ 12m, 층 높이 ≈ 3m (eye 단위 1 = 한 층). */
const REAL={
  tankElev:20,          // 전차 주포 최대 앙각(도). 이보다 가파르게 위에 있는 적은 못 쏜다
  arc:{front:.55,side:1,rear:1.4,top:1.6},   // 차량 피격 방향별 피해·관통 배수(대전차 화기)
  arcN:{front:'정면',side:'측면',rear:'후면',top:'상부'},
  escortR:2,            // 이 거리(칸) 안에 아군 보병이 있으면 호위받는 차량
  vsmk:{tank:2,ifv:2},  // 차량 연막탄 발사기 사용 횟수
  ssmk:{rifle:2,mg:1,eng:2,at:1,dteam:1}, // 분대 연막 수류탄
  smkS:22,              // 연막이 머무는 초
};
const hDeg=(a,b)=>{let d=(a-b)%360;if(d>180)d-=360;if(d<-180)d+=360;return d;};
/* d가 a에게 맞는 방향: 정면·측면·후면·상부 */
function armorArc(d,a){const ta=UT[a.type];if(ta.fly||ta.ind||ta.kami)return 'top';
  const [ax,az]=posOf(a),[dx,dz]=posOf(d);const hd=Math.hypot(ax-dx,az-dz);
  if(eye(a)-eye(d)>=1.5&&(eye(a)-eye(d))*3>=hd*12*.45)return 'top';   // 위층에서 내리꽂으면(약 25° 이상) 얇은 상부 장갑
  const ang=Math.atan2(az-dz,ax-dx)*180/Math.PI;const rel=Math.abs(hDeg(ang,d.face||0));
  return rel<=35?'front':rel>=145?'rear':'side';}
/* 차량 근처(2칸)에 아군 보병이 있는가 */
const escorted=v=>G.units.some(o=>o.nat===v.nat&&UT[o.type].cls==='inf'&&Math.hypot(o.x-v.x,o.z-v.z)<=REAL.escortR);
const atWpn=a=>!!a&&(a.type==='at'||a.type==='eng'||a.type==='tank'||a.type==='fpv'||(UT[a.type].ex&&UT[a.type].atk.veh>=4));
/* 전차 주포는 가파른 위를 못 쏜다 (같은 거리라도 높을수록, 가까울수록 불가) */
function elevOK(a,d,ax,az,ae){if(a.type!=='tank'||UT[d.type].fly)return true;const [dx,dz]=posOf(d);const h=Math.hypot(ax-dx,az-dz)*12,v=(eye(d)-ae)*3;
  return Math.atan2(v,Math.max(.1,h))*180/Math.PI<=REAL.tankElev;}
{const _ch=canHit;canHit=function(a,d,fromR,fromC,moved){if(!_ch(a,d,fromR,fromC,moved))return false;if(a.type!=='tank')return true;
  let ax,az,ae;if(fromR!=null){[ax,az]=hypoPos(a,fromR,fromC,d.x,d.z);ae=eyeAt(a.type,fromR,fromC);}else{[ax,az]=posOf(a);ae=eye(a);}return elevOK(a,d,ax,az,ae);};}
/* 명중률: 먼 거리일수록 더 떨어지고, 움직이며 쏘거나 움직이는 표적은 덜 맞는다. 붙어서 던지는 수류탄은 건물 엄폐를 깎는다 */
{const _hp=hitP;hitP=function(a,d){const h=_hp(a,d);const ta=UT[a.type],td=UT[d.type];if(ta.ind||td.fly||!h.p)return h;let p=h.p;const dd=udist(a,d);const rm=ta.rng[1]||1;
  if(td.cls==='inf'&&h.kind==='bldg'&&(a.type==='rifle'||a.type==='eng')&&dd<=1.05&&Math.abs(eye(a)-eye(d))<=1.1){   // 진입 전 수류탄: 붙어 있는 같은 높이의 방
    const c=h.cov*(a.r===d.r&&a.c===d.c?.3:.5);p=p/(1-Math.min(.85,h.cov))*(1-c);h.cqb=1;}
  if(a.type!=='sniper')p*=1-.25*Math.min(1,Math.pow(dd/rm,2));                   // 사거리 끝에서는 탄이 흩어진다
  const am=a.path&&a.path.length,dm=d.path&&d.path.length;
  if(am)p*=ta.cls==='veh'?(a.type==='tank'||a.type==='ifv'?.9:.7):.6;            // 행진간 사격: 안정화 포탑만 덜 흔들린다
  if(dm&&td.cls==='inf'&&!ta.ex)p*=.8;                                          // 뛰어가는 병사는 맞히기 어렵다
  if(td.cls==='veh'&&atWpn(a)&&ta.cls==='inf'&&escorted(d))p*=.8;               // 호위 보병이 대전차조를 견제한다
  h.p=Math.max(0,Math.min(1,p));return h;};}
/* 차량 피해: 맞은 방향에 따라 관통이 달라지고, 호위 없는 차량은 대전차조에 더 크게 당한다 */
{const _harm=harm;harm=function(u,amt,by,o){o=o||{};if(u&&by&&amt>0&&UT[u.type].cls==='veh'&&G.units.includes(u)&&atWpn(by)&&!o.w&&by!==u){
    const s=o.pv?o.pv.arc:armorArc(u,by);o.arc=s;if(!o.pv){o.arm=REAL.arc[s];amt*=REAL.arc[s];}   // 관통 판정(05na-pen)이 있으면 그쪽 장갑을 쓴다if(UT[by.type].cls==='inf'&&!escorted(u)){amt*=1.25;o.lone=1;}
    u._arcT=G.time||0;u._arc=s;if(s!=='front'&&(!u._arcL||(G.time||0)-u._arcL>6)){u._arcL=G.time||0;L(`${natName(u.nat)} ${UT[u.type].n} ${REAL.arcN[s]} 피격${o.lone?' (호위 보병 없음)':''}`);}}
  const r=_harm(u,amt,by,o);if(u&&G.units.includes(u)&&UT[u.type].cls==='veh'&&by&&atWpn(by))vehSmoke(u,by);return r;};}
/* 차량 연막탄: 대전차 화기에 맞으면 연막을 터뜨리고 정면을 적에게 둔 채 뒤로 빠진다 */
function popSmoke(x,z,s){const r=Math.floor(z),c=Math.floor(x);if(!inb(r,c))return false;const t=G.map[r][c];t.smoke=Math.max(t.smoke||0,1);
  (G.smk=G.smk||[]).push({r,c,t:(G.time||0)+(s||REAL.smkS)});bump();return true;}
function vehSmoke(u,by){if(u.vsm==null)u.vsm=REAL.vsmk[u.type]||0;if(u.vsm<=0||((G.time||0)-(u._smT||-99))<8)return;u.vsm--;u._smT=G.time||0;
  const dx=by.x-u.x,dz=by.z-u.z,L0=Math.hypot(dx,dz)||1;const ux=dx/L0,uz=dz/L0;
  popSmoke(u.x,u.z);popSmoke(u.x+ux*.9,u.z+uz*.9);if(typeof FXH.vsmoke==='function')FXH.vsmoke(u,ux,uz);
  L(`${natName(u.nat)} ${UT[u.type].n} 연막탄 발사`);
  // 정면을 적 쪽으로 둔 채 1칸 남짓 후진
  if(!u.vd||!u.vd.mob){const bx=u.x-ux*1.3,bz=u.z-uz*1.3;if(walkable(u,bx,bz)&&!wallCross(u,u.x,u.z,bx,bz)){u.path=[[bx,bz]];u.tgt=null;u.rev=(G.time||0)+5;u.revF=Math.atan2(uz,ux)*180/Math.PI;u.face=u.revF;}}}
{const _mv=rtMove;rtMove=function(u,dt){_mv(u,dt);if(u.rev&&u.rev>(G.time||0)&&G.units.includes(u))u.face=u.revF;else if(u.rev)u.rev=0;};}
/* 분대 연막 수류탄: 사격받으며 트인 곳을 가로질러야 하면 적과 자기 사이에 연막을 친다 */
function squadSmoke(u){const t=UT[u.type];if(t.cls!=='inf'||!u.path||!u.path.length||!(u.supp>.3))return;if(u.ssm==null)u.ssm=REAL.ssmk[u.type]||0;if(u.ssm<=0)return;
  if((G.time||0)-(u._smT||-99)<12)return;if(cell(u.r,u.c).t==='bldg')return;
  const [px,pz]=u.path[0];const nx=tileAt(px,pz);if(!nx||nx.t==='bldg')return;
  let foe=null,fd=1e9;for(const e of G.units){if(!hostile(e.nat,u.nat)||UT[e.type].fly||!firedRecently(e))continue;if(G.fog&&!seen(e,u.nat))continue;const d=Math.hypot(e.x-u.x,e.z-u.z);if(d<fd&&d<9){fd=d;foe=e;}}
  if(!foe)return;const ux=(foe.x-u.x)/fd,uz=(foe.z-u.z)/fd;const mx=(u.x+px)/2+ux*.8,mz=(u.z+pz)/2+uz*.8;
  if(tileAt(mx,mz)&&tileAt(mx,mz).t!=='bldg'&&popSmoke(mx,mz,16)){u.ssm--;u._smT=G.time||0;if(typeof FXH.ssmoke==='function')FXH.ssmoke(u,mx,mz);L(`${natName(u.nat)} ${t.n} 연막 수류탄`);}}
/* 실내에서 대전차 화기를 쏘면 후폭풍: 다시 쏘기 오래 걸리고, 사수가 충격을 받는다. 옥상·밖은 괜찮다 */
{const _rs=rtShoot;rtShoot=function(a,d){const r=_rs(a,d);if(a.type==='at'&&G.units.includes(a)&&cell(a.r,a.c).t==='bldg'&&!(typeof onRoof==='function'&&onRoof(a))){
    a.cd=(a.cd||0)+COOL.at*.5;a.supp=Math.max(a.supp||0,.6);a._bb=G.time||0;if(typeof FXH.backblast==='function')FXH.backblast(a,d);
    if(Math.random()<.08)harm(a,.6,null,{kind:'blast'});}
  return r;};}
/* 매 틱: 연막 유지, 분대 연막 판단 */
{const _tick=rtTick;rtTick=function(dt){_tick(dt);if(!G||G.over)return;
  if(G.smk&&G.smk.length){const now=G.time||0;G.smk=G.smk.filter(s=>{if(s.t<=now)return false;const x=G.map[s.r][s.c];if(!(x.smoke>0)){x.smoke=1;bump();}return true;});}
  for(const u of G.units)if(UT[u.type].cls==='inf')squadSmoke(u);};}
/* 병종 설명에 새 규칙을 덧붙인다 */
UT.tank.desc+='. 주포 앙각 20°: 바로 앞 위층은 못 쏨. 측면·후면·위(상부)에 약하고 연막탄 2발';
UT.ifv.desc+='. 기관포는 위층도 쏨. 연막탄 2발';
UT.at.desc+='. 측면·후면·위층에서 쏘면 더 잘 뚫음. 실내에서 쏘면 후폭풍으로 재장전이 늦음(옥상은 괜찮음)';
