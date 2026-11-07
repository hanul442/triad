/* ===================== 벽 뚫기: 대전차 화기·전차포·폭약으로 적이 든 건물을 친다 =====================
   건물 안 적 보병은 창가에 붙지 않으면 총으로 맞추기 어렵다. 대전차팀·공병·전차는 그 층 외벽을 겨눠 쏴서
   구멍(G.holes)을 내고, 그 층 사람들을 크게 다치게 한다. 위아래 층은 덜 다치고, 불이 붙기도 한다.
   표적은 보이는 적, 또는 방금 그 건물에서 쏜(총구 화염으로 들킨) 적이다. */
function breachPt(a,e){const X=cell(e.r,e.c);if(X.t!=='bldg'||UT[e.type].cls!=='inf')return null;const he=eye(e);if(he>=bldgH(X)-.05)return null;
  const [ax,az]=posOf(a);const b=bldgBox(e.r,e.c);const px=Math.min(b[1],Math.max(b[0],ax)),pz=Math.min(b[3],Math.max(b[2],az));const q=1e-6;
  const side=Math.abs(px-b[0])<q&&b[0]>e.c+q?3:Math.abs(px-b[1])<q&&b[1]<e.c+1-q?1:Math.abs(pz-b[2])<q&&b[2]>e.r+q?0:Math.abs(pz-b[3])<q&&b[3]<e.r+1-q?2:-1;
  if(side<0)return null;const t=UT[a.type];const d=Math.hypot(px-ax,pz-az);if(d>t.rng[1]+.6)return null;
  const fl=Math.floor(curFl(e)+1e-6),h=fl+.5;if(!losPt(ax,az,eye(a),px,pz,h))return null;
  return {x:px,z:pz,h,fl,side,r:e.r,c:e.c};}
/* 이번에 벽을 칠지: 보병 표적이 건물 안이면 벽을 치고, 표적이 없으면 건물 안에 숨은(또는 막 쏜) 적을 찾는다 */
function breachPick(u,tg){const t=UT[u.type];if(!t.ex||t.ind||!t.rng[1])return null;
  if(tg){if(UT[tg.type].cls!=='inf')return null;const P=breachPt(u,tg);return P&&Math.random()<.8?P:null;}
  const [ux,uz]=posOf(u);let best=null,bd=1e9;
  for(const e of G.units){if(e.nat===u.nat||UT[e.type].cls!=='inf'||cell(e.r,e.c).t!=='bldg')continue;const d=Math.hypot(e.x-ux,e.z-uz);if(d>t.rng[1]+1.2||d>=bd)continue;
    if(G.fog&&!seen(e,u.nat)&&!(firedRecently(e)&&d<=visRange(u)))continue;const P=breachPt(u,e);if(P){best=P;bd=d;}}
  return best;}
function breach(a,P){const ta=UT[a.type];a.shot=G.turn;a.firedT=G.time||0;a.face=Math.atan2(P.z-a.z,P.x-a.x)*180/Math.PI;
  G.holes=G.holes||[];G.holes.push({r:P.r,c:P.c,x:P.x,z:P.z,h:P.h,side:P.side});if(G.holes.length>240)G.holes.shift();
  a.lastShot={t:G.time||0,hits:1,k:1,breach:1};
  if(typeof FXH.breach==='function')FXH.breach(a,P);else FXH.fire(a,P.r,P.c);
  const X=G.map[P.r][P.c];const base=3+ta.ex*1.5;
  for(const u of G.units.slice()){if(u.nat===a.nat||UT[u.type].cls!=='inf'||u.r==null)continue;const Y=cell(u.r,u.c);if(Y.t!=='bldg')continue;
    let m;if(u.r===P.r&&u.c===P.c)m=1;else if(Math.abs(u.r-P.r)+Math.abs(u.c-P.c)===1&&Y.blk!=null&&Y.blk===X.blk)m=.3;else continue;
    const df=Math.abs(curFl(u)-P.fl);m*=df<.5?1:df<1.5?.35:.06;if(eye(u)>=bldgH(Y)-.05)m*=.4;   // 옥상은 덜 다친다
    blastHurt(u,Math.round(base*m*(.8+Math.random()*.4)*10)/10,a,{kind:'blast',x:P.x,z:P.z,rad:.5});}
  damageBldg(P.r,P.c,Math.max(2,Math.round((ta.atk.veh||4)*ta.ex*.25+1.5)));
  if(typeof ignite==='function')ignite(P.r,P.c,.28*ta.ex);
  bump();}
