/* ===================== COVER2: 병사들이 지형지물로 은폐·엄폐한다 =====================
   예전에는 엄폐를 분대 한가운데 점 하나로만 따졌고, 화면에서 엎드린 병사도 피해 계산에서는 서 있는 사람과 같았다.
   연막 구름 안에 들어간 부대도 바깥에서 그대로 보였다. 이 파일이 그걸 고친다. 모든 부대가 명령 없이 알아서 한다.
   1) 엄폐 판정은 병사 한 명 한 명: 쏘는 쪽을 향해 그 병사 앞에 벽·차·잔해·방호벽·덤불·구덩이·참호가 있는지 보고
      분대 평균을 명중률에 쓴다. 엎드린 병사는 몸이 작아 덜 맞는다(낮은 엄폐 뒤에 엎드리면 거의 안 보인다).
   2) 엎드림이 실제로 작동: 맨땅에서 위협을 받아 엎드린 병사(05z-drill 자세)는 총탄·파편 모두 덜 맞는다.
   3) 포탄이 날아오는 소리: 떨어지기 직전(자주포·다연장 1.3초, 박격포 0.8초) 떨어질 곳 둘레 병사가 바닥에 엎드린다.
   4) 포격을 받으면 그 자리를 벗어난다: 멈춰 있는 부대 가까이에 포탄이 떨어지면 2~3.5칸 떨어진 건물·참호·구덩이·잔해로
      옮긴다(차량은 포격 지역 밖으로 빠진다). 포격이 계속되는 곳에 버티고 있지 않는다.
   5) 총격 속 맨땅이면 가까운 엄폐로: 멈춘 부대가 총격을 받는데 엄폐가 없으면 1.4칸 안의 더 나은 자리(벽 모서리·차·잔해·
      방호벽·구덩이·건물)로 붙는다. 적에게 다가가지 않고, 쏘던 적이 사거리 밖으로 빠지지 않는 곳만. 차량은 벽·잔해 뒤로(차체 숨기기).
   6) 은폐: 엎드리거나 엄폐 뒤에 숨은 채 쏘지 않는 보병, 숲·잔해 속에 멈춘 차량은 더 가까이 와야 보인다.
   7) 연막: 연막 구름 안의 부대는 바깥에서 보이지 않는다(바로 옆 제외). 열상 장비(전차·장갑차·대전차 미사일·드론)는
      보병 연막 수류탄(가시광만 가림) 너머를 짧게 보지만, 차량 연막탄·포병 연막(적외선도 가림)은 못 본다. */
const CV={lay:.25,layLow:.12,seek:[.35,.7,1.05,1.4],seekCd:7,gain:.18,minCov:.25,duck:{spg:1.3,mlrs:1.3,mortar:.8},duckR:1.9,
  artR:1.8,artT:8,dodge:[2.2,2.8,3.5],dodgeCd:16,hide:.6,therm:{tank:1,ifv:1,atgm:1,drone:1},thermK:.6,q:.5};
const cvAct=m=>!m.dead&&!m.down&&!m.gone&&!m.task;
const cvNow=()=>G.time||0;
const cvLay=m=>m.lay||m.pr>0;
/* 병사 m이 (ax,az) 쪽에서 오는 직사에 대해 받는 엄폐. low = 내려다보는 사격 */
function cvMan(u,m,ax,az,low,objs){const t=tileAt(m.x,m.z);if(!t)return 0;if(t.t==='bldg')return COVK.bldg.v;
  let c=TT[t.t].cov||0;if(typeof trenchAt==='function'&&trenchAt(m.x,m.z))c=Math.max(c,COVK.trench.v);
  const d=Math.hypot(ax-m.x,az-m.z);if(d>.02){const k=dirCoverAt(m.x,m.z,(ax-m.x)/d,(az-m.z)/d,'inf',u,objs);c=Math.max(c,k.cov*(low?.5:1));}
  if(cvLay(m))c+=(c>=.2?CV.layLow:CV.lay)*(low?.5:1);   // 엎드리면 몸이 작아진다(위에서 내려다보면 덜)
  return Math.min(.85,c);}
/* 분대가 a의 직사에 대해 받는 엄폐(병사 평균). 0.5초·쏘는 쪽마다 기억 */
function cvSquad(d,a){const M=d._men;if(!M)return null;const L=M.filter(cvAct);if(!L.length)return null;
  const q=Math.floor(cvNow()/CV.q);let C=G._cvc;if(!C||C.q!==q){C={q,m:new Map()};Object.defineProperty(G,'_cvc',{value:C,writable:true,configurable:true,enumerable:false});}
  const k=d.id+':'+a.id;if(C.m.has(k))return C.m.get(k);
  const [ax,az]=posOf(a);const low=eye(a)+elU(a)>=eye(d)+elU(d)+2;const objs=coverObjs(d);let s=0,lay=0;
  for(const m of L){s+=cvMan(d,m,ax,az,low,objs);if(cvLay(m))lay++;}
  const r={cov:s/L.length,lay:lay/L.length};C.m.set(k,r);return r;}
{const _co=coverOf;coverOf=function(d,a){const r=_co(d,a);try{
    if(!a||UT[d.type].cls!=='inf'||UT[d.type].fly||UT[a.type].ind||!d._men)return r;const x=cell(d.r,d.c);if(x.t==='bldg')return r;
    const s=cvSquad(d,a);if(!s)return r;let cov=s.cov;if(x.smoke>0)cov+=.15;
    return {cov,kind:r.kind||(s.lay>.5?'prone':null)};}catch(e){return r;}};}
if(typeof COVK==='object')COVK.prone=COVK.prone||{n:'엎드림',v:CV.lay};
/* 은폐: 숨은 부대는 더 가까이 와야 보인다 */
function cvHidden(e){if(firedRecently(e))return false;if(e.path&&e.path.length)return false;
  const t=UT[e.type];if(t.cls==='inf')return (e._cvH||0)>=CV.hide;
  if(t.cls==='veh'&&!t.fly){const x=cell(e.r,e.c);return (x.t==='park'&&!x.yard&&!(x.tl>=.6))||x.t==='rubble'||(e._cvH||0)>=1;}
  return false;}
{const _cc=concealed;concealed=function(e){return _cc(e)||cvHidden(e);};}
/* ---------- 연막 ---------- */
const cvTherm=u=>!!CV.therm[u.type];
// 보병 연막 수류탄(가시광만 가림)으로 친 칸: x.hcT(끝나는 때). 차량 연막탄·포병 연막은 적외선도 가린다.
{const _ps=popSmoke;popSmoke=function(x,z,s){const ok=_ps(x,z,s);if(ok){const t=tileAt(x,z);if(t){if(G._hc){t.hcT=cvNow()+(s||REAL.smkS);(G._hcL=G._hcL||[]).push(t);}else t.hcT=0;}}return ok;};}
{const _ss=squadSmoke;squadSmoke=function(u){G._hc=1;try{return _ss(u);}finally{G._hc=0;}};}
{const _tl=tacSmokeLeg;tacSmokeLeg=function(u,K){G._hc=1;try{return _tl(u,K);}finally{G._hc=0;}};}
{const _su=support;support=function(n,k,r,c){const ok=_su(n,k,r,c);if(ok&&k==='smoke'&&typeof supArea==='function')for(const [a,b] of supArea(r,c,1))G.map[a][b].hcT=0;return ok;};}
const cvHC=x=>x&&x.smoke>0&&(x.hcT||0)>cvNow();
/* 열상으로 보병 연막 너머 보기: 그 칸들 연막을 잠깐 빼고 다시 따진다(거리는 줄어든다) */
function cvThermSees(u,e,sp){const L=G._hcL=(G._hcL||[]).filter(cvHC);if(!L.length)return false;
  const d=udist(u,e);if(d>visRange(u)*CV.thermK+(UT[e.type].cls==='veh'?1:0))return false;
  const keep=L.map(x=>x.smoke);for(const x of L)x.smoke=0;try{return sp(u,e);}finally{L.forEach((x,i)=>{x.smoke=keep[i];});}}
{const _sp=spots;spots=function(u,e){let ok=_sp(u,e);
    if(!ok&&cvTherm(u)&&(G._hcL||[]).length)ok=cvThermSees(u,e,_sp);
    if(ok){const x=cell(e.r,e.c);if(x.smoke>0&&udist(u,e)>=.9&&!(cvTherm(u)&&cvHC(x)))ok=false;}   // 연막 구름 안에 있으면 바깥에서 안 보인다
    return ok;};}
/* ---------- 포탄 소리: 떨어지기 직전 엎드린다 ---------- */
function cvDuck(){const S=G.shells;if(!S||!S.length)return;const now=cvNow();
  for(const s of S){if(s._dk)continue;const tti=s.t0+s.T-now;const lim=CV.duck[s.type]??1.1;if(tti>lim||tti<0)continue;s._dk=1;
    for(const u of G.units){if(UT[u.type].cls!=='inf'||!u._men)continue;if(Math.hypot(u.x-s.x1,u.z-s.z1)>CV.duckR+.5)continue;let n=0;
      for(const m of u._men){if(!cvAct(m))continue;if(Math.hypot(m.x-s.x1,m.z-s.z1)>CV.duckR)continue;const tt=tileAt(m.x,m.z);if(tt&&tt.t==='bldg')continue;
        m.pr=Math.max(m.pr||0,tti+1.4+menHash(u.id,m.i+33)*.6);n++;}
      if(n){u._dkT=now;tacN('cvDuck');}}}}
/* ---------- 포격을 받으면 자리를 옮긴다 ---------- */
{const _sb=shellBoom;shellBoom=function(s,x,z,h,r,c){const A=G._art||(G._art=[]);A.push({x,z,t:cvNow(),n:s.n});if(A.length>60)A.splice(0,A.length-60);return _sb(s,x,z,h,r,c);};}
// 맡은 일이 있는 부대(호위·보급·견인·건물 소탕·수동 조작)는 건드리지 않는다. 자리 고수(u.hold)는 포격에도 버티고, 엄폐는 바로 옆(0.7칸)만.
const cvIdle=u=>!(u.path&&u.path.length)&&!u.climb&&!u.cqb&&!u.brk&&!(u.vd&&u.vd.mob)&&u.towBy==null&&!UT[u.type].fly&&!UT[u.type].logi&&!u.esc&&!u.lj&&!u.post&&!u.job&&!u.rearm
  &&!(u.man!=null&&typeof autoManual==='function'&&autoManual(u));
function cvFoe(u){const t=cvNow();if(u._thr&&t-u._thr[2]<12)return [u._thr[0],u._thr[1]];
  let b=null,bd=1e9;const M=typeof memOf==='function'?memOf(u.nat):{};for(const id in M){const p=M[id];if(t-p.t>20)continue;const d=Math.hypot(p.x-u.x,p.z-u.z);if(d<bd){bd=d;b=[p.x,p.z];}}return b;}
function cvRing(u,cx,cz,rads,score){let best=null,bs=-1e9;
  for(const r of rads){const na=Math.max(12,Math.round(r*16));for(let i=0;i<na;i++){const a=i/na*6.283+(u.id%5)*.41;const x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;
      if(x<.2||z<.2||x>N-.2||z>N-.2||!walkable(u,x,z))continue;const s=score(x,z);if(s>bs){bs=s;best=[x,z,s];}}}
  return best;}
function cvGo(u,x,z,why){const P=pathPts(u,x,z);if(!P.length)return false;const e=P[P.length-1];if(Math.hypot(e[0]-x,e[1]-z)>.3)return false;
  let L=0,px=u.x,pz=u.z;for(const p of P){L+=Math.hypot(p[0]-px,p[1]-pz);px=p[0];pz=p[1];}if(L>Math.hypot(x-u.x,z-u.z)*2.2+1)return false;   // 멀리 돌아가야 하면 안 간다
  u.path=P;u.dest=[x,z];if(u.tk)u.tk.at=cvNow();u._cvMv=cvNow();u._cvWhy=why;tacN(why);return true;}
function cvDodge(u,objs){if(u.hold)return;const t=cvNow();if(t-(u._cvDg??-99)<CV.dodgeCd)return;const A=G._art;if(!A||!A.length)return;
  const ind=UT[u.type].ind;const H=A.filter(b=>t-b.t<CV.artT&&b.n!==u.nat&&Math.hypot(b.x-u.x,b.z-u.z)<CV.artR);if(!H.length)return;
  const own=cell(u.r,u.c);const inf=UT[u.type].cls==='inf';
  if(inf&&own.t==='bldg'&&!H.some(b=>Math.floor(b.z)===u.r&&Math.floor(b.x)===u.c))return;   // 다른 건물 안: 벽이 막아 준다
  if(inf&&typeof trenchAt==='function'&&trenchAt(u.x,u.z)&&H.every(b=>Math.hypot(b.x-u.x,b.z-u.z)>.35))return;   // 참호·구덩이 속은 버틴다
  const cx=H.reduce((a,b)=>a+b.x,0)/H.length,cz=H.reduce((a,b)=>a+b.z,0)/H.length;const foe=cvFoe(u);
  const s=cvRing(u,u.x,u.z,CV.dodge,(x,z)=>{const dh=Math.hypot(x-cx,z-cz);if(dh<2)return -1e9;const tl=tileAt(x,z);let v=Math.min(dh,4)*.5;
    if(inf){if(tl.t==='bldg')v+=1.2;else if(typeof trenchAt==='function'&&trenchAt(x,z))v+=1.4;else if(tl.t==='rubble')v+=.4;else v+=coverAt(x,z,'inf',objs)*.8;}
    if(foe&&!ind){const d0=Math.hypot(foe[0]-u.x,foe[1]-u.z),d1=Math.hypot(foe[0]-x,foe[1]-z);if(d1<d0-.5)v-=(d0-d1)*.6;}   // 적 쪽으로 뛰어들지 않는다
    return v-Math.hypot(x-u.x,z-u.z)*.15;});
  u._cvDg=t;if(s&&s[2]>-1e8&&cvGo(u,s[0],s[1],'cvDodge')){if(!G.fog||!isAI(u.nat))L(`${natName(u.nat)} ${UT[u.type].n} 포격 피해 자리 옮김`);}}
function cvSeek(u,objs){const t=cvNow();if(t-(u._cvSk??-99)<CV.seekCd||t-(u._cvDg??-99)<4)return;const tu=UT[u.type];if(tu.ind)return;
  const hot=t-(u._hitT??-99)<4||(u.supp||0)>.3||(u._thr&&t-u._thr[2]<4);if(!hot)return;
  const own=cell(u.r,u.c);if(own.t==='bldg')return;const foe=cvFoe(u);if(!foe)return;const [fx,fz]=foe;
  const cls=tu.cls==='veh'?'veh':'inf';
  const covAt=(x,z)=>{const tl=tileAt(x,z);if(!tl)return 0;if(tl.t==='bldg')return cls==='inf'?COVK.bldg.v:0;let c=cls==='inf'?TT[tl.t].cov||0:0;
    if(cls==='inf'&&typeof trenchAt==='function'&&trenchAt(x,z))c=Math.max(c,COVK.trench.v);const d=Math.hypot(fx-x,fz-z)||1;
    return Math.max(c,dirCoverAt(x,z,(fx-x)/d,(fz-z)/d,cls,u,objs).cov);};
  let cur;if(cls==='inf'&&u._men){const L=u._men.filter(cvAct);cur=L.length?L.reduce((a,m)=>a+covAt(m.x,m.z),0)/L.length:covAt(u.x,u.z);}else cur=covAt(u.x,u.z);
  u._cvSk=t;if(cur>=(cls==='veh'?.18:CV.minCov))return;
  const d0=Math.hypot(fx-u.x,fz-u.z),R=(tu.rng[1]||4)+.3;const inR=d0<=R;
  const s=cvRing(u,u.x,u.z,cls==='veh'?(u.hold?[.5]:[.5,.9,1.3]):(u.hold?CV.seek.slice(0,2):CV.seek),(x,z)=>{const d1=Math.hypot(fx-x,fz-z);if(d1<d0-.7)return -1e9;if(inR&&d1>R)return -1e9;if(d1<1.2)return -1e9;
    return covAt(x,z)-Math.hypot(x-u.x,z-u.z)*.1-Math.max(0,d0-d1)*.08;});
  if(!s)return;const sc=covAt(s[0],s[1]);if(sc<cur+CV.gain*(cls==='veh'?.8:1)||sc<(cls==='veh'?.18:CV.minCov))return;
  cvGo(u,s[0],s[1],'cvSeek');}
/* 병사 은폐 상태: 숨은 병사 비율(건물 안·엎드림·엄폐 뒤·숲) */
function cvHideTick(u,objs){const M=u._men;const tu=UT[u.type];
  if(tu.cls==='veh'){const foe=cvFoe(u);if(!foe){u._cvH=0;return;}const d=Math.hypot(foe[0]-u.x,foe[1]-u.z)||1;u._cvH=dirCoverAt(u.x,u.z,(foe[0]-u.x)/d,(foe[1]-u.z)/d,'veh',u,objs).cov>=.18?1:0;return;}
  if(!M)return;const L=M.filter(cvAct);if(!L.length){u._cvH=0;return;}const th=menThreatDir(u);const ux=Math.cos(th),uz=Math.sin(th);let h=0;
  for(const m of L){const tl=tileAt(m.x,m.z);if(!tl)continue;if(tl.t==='bldg'||cvLay(m)||(tl.t==='park'&&!tl.yard)||(typeof trenchAt==='function'&&trenchAt(m.x,m.z))){h++;continue;}
    if(dirCoverAt(m.x,m.z,ux,uz,'inf',u,objs).cov>=CV.minCov)h++;}
  u._cvH=h/L.length;}
/* 맨땅에서 위협을 받는 멈춘 병사는 재장전·경계 중에도 엎드린다(분대장 손신호·부상자 돌보기는 그대로). 엎드린 병사는 m.lay */
const CV_STAND={kneel:1,reload:1,aim:1};
function cvPose(u){const M=u._men;const moving=!!(u.path&&u.path.length)&&!u.climb;const thr=!moving&&!UT[u.type].ind&&menThreat(u);const th=thr?menThreatDir(u):0;
  for(const m of M){if(m.dead||m.gone){m.lay=0;continue;}
    if(thr&&!m.task&&!m.down&&m.spd<.05&&(m.pose==null||CV_STAND[m.pose])&&typeof drCover==='function'&&drCover(u,m,th).k==='open')m.pose='prone';
    m.lay=m.pose==='prone'||m.pose==='crawl'?1:0;}}
/* ---------- 엔진에 끼우기(05z-drill 뒤: 자세를 보고 엎드림을 정한다) ---------- */
{const _tick=rtTick;rtTick=function(dt){_tick(dt);if(!G||!G.units||G.over)return;
  try{for(const u of G.units)if(u._men&&UT[u.type].cls==='inf')cvPose(u);
    cvDuck();
    const t=cvNow();if((G._cvT||0)>t)return;G._cvT=t+CV.q;
    if(G._art&&G._art.length&&t-G._art[G._art.length-1].t>CV.artT)G._art.length=0;
    let objs=null;
    for(const u of G.units.slice()){const tu=UT[u.type];if(tu.fly||(tu.cls!=='inf'&&tu.cls!=='veh'))continue;if(!objs)objs=coverObjs();
      cvHideTick(u,objs);if(!cvIdle(u))continue;
      cvDodge(u,objs);if(!(u.path&&u.path.length))cvSeek(u,objs);}
  }catch(e){(G.errs=G.errs||[]).push(String(e&&e.stack||e));}};}
