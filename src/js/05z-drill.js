/* ===================== DRILL: 분대 안 병사들의 전투 동작 =====================
   05f-men.js가 병사 자리·사격·재장전·엎드림을 정한다. 이 파일은 그 위에 "어떤 자세로, 어디를 보고" 있는지를 정한다.
   게임 규칙·병사 위치·누가 쏘는지는 바꾸지 않는다(난수도 쓰지 않는다). 그래서 승패와 결과는 그대로다.
   병사마다 m.pose(그리는 쪽이 쓰는 자세 이름)와 m.leanS(기울이는 쪽, 1 = 바라보는 방향의 오른쪽)만 정한다.
   m.pose가 없으면 그리는 쪽 기본 판단(서기·무릎·엎드림)을 쓴다.

   교범에서 가져온 동작(FM 3-21.8 분대 전투 훈련, 접적 시 행동):
   - 접적: 처음 총격을 받거나 처음 쏘면 분대장이 적 쪽을 가리킨다. 엄폐가 없는 병사는 엎드린다.
   - 엄폐에 따른 자세: 낮은 엄폐(차량·모래주머니·잔해) 뒤는 무릎쏴, 건물 모서리는 몸을 옆으로 내밀어 쏘고,
     맨땅에서 위협을 받으면 엎드려 쏜다. 쏘지 않을 때는 엄폐 뒤로 몸을 낮춘다.
   - 재장전: 무릎을 꿇고 탄창을 간다(엎드려 있으면 엎드린 채).
   - 번갈아 이동: 멈춰 엄호하는 조는 무릎쏴로 위협 쪽을 겨누고, 조가 바뀔 때 분대장이 손으로 신호한다.
   - 수신호: 이동 명령 때 "앞으로", 멈출 때 "정지", 새 표적을 잡을 때 그쪽을 가리킨다.
   - 경계: 조용할 때 멈춘 분대는 한쪽 무릎을 꿇고 자기 구역을 천천히 훑으며, 가끔 고개를 크게 돌려 둘러본다.
   - 부상자: 끄는 사람은 숙여서 끌고, 응급처치하는 사람은 무릎을 꿇는다. 쓰러진 사람은 누워 있다. */
const DRILL={quiet:6,point:1.6,tgtPt:1,sig:1.2,halt:1.3,bnd:.9,fireT:.7,kneelT:1.5,glanceA:1.6,glanceT:1.4,gap:6};
/* 분대장: 살아서 함께 움직이는 병사 중 번호가 가장 앞선 사람 */
function drLead(M){for(const m of M)if(menAct(m))return m;return null;}
/* 점(x,z)이 이웃 건물 벽 안인가(자기 칸 건물은 아님) */
function drWall(x,z,own){const t=tileAt(x,z);if(!t||t.t!=='bldg'||t===own)return false;if(typeof bldgBox!=='function')return true;const b=bldgBox(Math.floor(z),Math.floor(x));return x>=b[0]&&x<=b[1]&&z>=b[2]&&z<=b[3];}
/* 병사 자리에서 위협 쪽 엄폐 모양: in(건물 안) · corner(건물 모서리, 옆으로 내밀어 쏨) · wall(벽 뒤) · low(낮은 엄폐) · open(맨땅) */
function drCover(u,m,th){const p=m.sp||[m.x,m.z];const k=p[0].toFixed(2)+','+p[1].toFixed(2)+','+th.toFixed(1);if(m._ck===k)return m._cv;
  const [x,z]=p;const own=tileAt(x,z);let cv={k:'open',s:0};
  if(own&&own.t==='bldg')cv={k:'in',s:0};
  else{const ux=Math.cos(th),uz=Math.sin(th),nx=-uz,nz=ux;   // n = 바라보는 쪽의 오른쪽
    const front=drWall(x+ux*.16,z+uz*.16,own)||drWall(x+ux*.3,z+uz*.3,own);
    if(front){const R=drWall(x+nx*.13+ux*.2,z+nz*.13+uz*.2,own),L=drWall(x-nx*.13+ux*.2,z-nz*.13+uz*.2,own);
      cv=R&&!L?{k:'corner',s:-1}:L&&!R?{k:'corner',s:1}:!L&&!R?{k:'corner',s:menHash(u.id,m.i+5)<.5?1:-1}:{k:'wall',s:0};}
    else{const c=typeof dirCoverAt==='function'?dirCoverAt(x,z,ux,uz,'inf',u,null):{cov:0};const tr=typeof trenchAt==='function'&&trenchAt(x,z);
      if(tr||c.cov>=.15||(own&&own.t==='rubble'))cv={k:'low',s:0};}}
  m._ck=k;m._cv=cv;return cv;}
/* 분대장 손신호 걸기 */
function drSig(dr,kind,dur,f,t,gk){if(dr.sk&&t<dr.se&&dr.pri>(kind==='point'?1:0)&&kind!=='point')return;
  gk=gk||kind;if(t-(dr['l'+gk]??-99)<DRILL.gap)return;dr['l'+gk]=t;   // 같은 신호를 몇 초마다 되풀이하지 않는다
 dr.sk=kind;dr.se=t+dur;dr.sf=f;dr.pri=kind==='point'?1:0;}
/* 매 틱: 자세·시선 */
function drillTick(u,dt){const M=u._men;if(!M)return;const t=G.time||0;const dr=M.dr||(M.dr={last:-99,pe:'',mv:false,ph:-1,tg:null,sk:null,se:0,sf:0,pri:0,stop:t});
  const moving=!!(u.path&&u.path.length)&&!u.climb;const thr=menThreat(u);const th=menThreatDir(u);const L=drLead(M);
  // 접적: 조용하다가 처음 총격을 주고받으면 분대장이 적 쪽을 가리킨다
  const last=Math.max(u._hitT??-99,u._thr?u._thr[2]:-99,u.firedT??-99);
  if(last>dr.last+.01){if(last-dr.last>DRILL.quiet)drSig(dr,'point',DRILL.point,th,t);dr.last=last;}
  // 새 표적: 그쪽을 가리킨다
  const tg=u.lastShot&&t-u.lastShot.t<.5?u.lastShot.tgt:null;
  if(tg!=null&&tg!==dr.tg){const e=G.units.find(z=>z.id===tg);if(e&&dr.tg!=null)drSig(dr,'point',DRILL.tgtPt,Math.atan2(e.z-u.z,e.x-u.x),t);dr.tg=tg;}
  // 이동 명령 "앞으로" · 멈춤 "정지"
  const pe=moving?u.path[u.path.length-1].join(','):'';
  if(moving&&pe!==dr.pe){const p=u.path[0];drSig(dr,'signal',DRILL.sig,Math.atan2(p[1]-u.z,p[0]-u.x),t,'go');}
  if(!moving&&dr.mv){drSig(dr,'signal',DRILL.halt,L?L.f:0,t,'halt');dr.stop=t;}
  dr.pe=pe;dr.mv=moving;
  // 번갈아 이동: 조가 바뀔 때마다 신호
  const act=M.filter(menAct);const bound=moving&&thr&&act.length>=4;const ph=bound?Math.floor(t/MEN.bound)%2:-1;
  if(bound&&ph!==dr.ph)drSig(dr,'signal',DRILL.bnd,th,t,'bnd');dr.ph=ph;
  const sigOn=dr.sk&&t<dr.se;
  for(const m of M){m.leanS=0;
    if(m.dead||m.gone){m.pose=null;continue;}
    if(m.down){m.pose='down';continue;}
    if(m.task){m.pose=m.task.k==='drag'?(m.task.ph==='pull'?'carry':null):m.task.k==='aid'?'kneel':null;continue;}
    const firing=t-(m.ft??-99)<DRILL.fireT;const mv=m.spd>.05;
    if(m===L&&sigOn&&!(m.pr>0)){m.pose=dr.sk;if(!mv||dr.sk==='point')m.f=dr.sf;continue;}
    if(mv){m.pose=m.crawl?'crawl':null;continue;}
    if(m.pr>0){m.pose='prone';continue;}
    if(m.rl>0){m.pose='reload';continue;}
    if(moving){m.pose=m.hold?'kneel':null;if(m.hold&&!firing)m.f=th+((m.i%3)-1)*.25;continue;}   // 엄호하는 조: 위협 쪽 부채꼴을 겨눈다
    if(UT[u.type].ind){m.pose=thr||firing||t-dr.stop>DRILL.kneelT?'kneel':null;continue;}   // 박격포 사수들은 포 옆에 무릎 꿇고 쏜다
    const cv=drCover(u,m,th);
    if(cv.k==='in'){m.pose=firing?'aim':thr?'kneel':null;continue;}
    if(cv.k==='corner'){m.pose=firing?'lean':thr?'kneel':null;if(firing)m.leanS=cv.s;continue;}
    if(cv.k==='wall'||cv.k==='low'){m.pose=thr||firing?'kneel':t-dr.stop>DRILL.kneelT?'kneel':null;}
    else m.pose=thr?'prone':t-dr.stop>DRILL.kneelT?'kneel':null;   // 맨땅: 위협을 받으면 엎드리고, 조용하면 한쪽 무릎을 꿇고 경계
    // 경계: 조용할 때 가끔 고개를 크게 돌려 둘러본다(병사마다 때가 다르다)
    if(!thr&&!firing){const P=4+menHash(u.id,m.i+90)*3,ph2=(t+menHash(u.id,m.i)*P)%P;if(ph2<DRILL.glanceT){const s=Math.sin(ph2/DRILL.glanceT*Math.PI);const k=Math.floor((t+menHash(u.id,m.i)*P)/P);m.f+=(menHash(u.id*3+k,m.i)-.5)*2*DRILL.glanceA*s;}}}}
{const _tick=rtTick;rtTick=function(dt){_tick(dt);if(!G||!G.units)return;for(const u of G.units)if(u._men&&UT[u.type].cls==='inf')try{drillTick(u,dt);}catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}};}
