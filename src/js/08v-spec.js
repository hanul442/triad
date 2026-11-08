/* ===================== 관전 모드: 모든 세력을 AI가 지휘한다 =====================
   - 새 게임 화면의 "AI 관전"에서 세력 수·도시 크기를 골라 시작한다. 자유 전투에서 모든 세력을 AI로 둬도 관전 모드가 된다.
   - AI는 평소처럼 전장의 안개 속에서 싸우고, 관전자는 화면에서만 전 세력 시야(또는 한 세력 시야)를 고른다.
   - 카메라: 자유 이동, 부대를 탭하면 따라가기, 자동 연출(교전이 가장 뜨거운 곳을 따라감).
   - 배속: 일시정지·1×·2×·4×·8×. 관전 판은 저장하지 않는다(사람이 하던 판의 저장을 덮어쓰지 않게). */
const SPEC_SPD=[1,2,4,8];
const specOn=()=>!!(G&&G.spec&&!G.boot);
/* 관전 판 설정: 세력 수(2~4)에 맞는 슬롯 */
function specSlots(n){n=Math.max(2,Math.min(4,n|0||2));return NATS.map((_,i)=>i<n?'ai':'none');}
function specStart(cfg){cfg=cfg||{};const opt=id=>typeof document!=='undefined'&&document.getElementById(id)?document.getElementById(id).value:null;
  UI.specCfg={n:cfg.n||2,size:cfg.size||'m',layout:cfg.layout||opt('opt-layout')||'sym',relief:cfg.relief||opt('opt-relief')||'flat'};   // 지형은 자유 전투 설정을 따른다
  newGame({slots:specSlots(UI.specCfg.n),size:UI.specCfg.size,layout:UI.specCfg.layout,relief:UI.specCfg.relief,diff:'normal',fog:true,speed:0,seed:cfg.seed});
  G.spd=1;G.paused=false;return G;}
/* 교전이 가장 뜨거운 부대: 최근 4초 안에 쏜 부대가 둘레 5칸에 많을수록, 적이 가까울수록 높다.
   교전이 없으면 적과 가장 가까운 부대(전선). skip에 든 부대는 뺀다. */
function specHot(skip){if(!G||!G.units.length)return null;const t=G.time||0;const hot=u=>t-(u.firedT??-99)<4;
  const fire=G.units.filter(hot);let best=null,bs=0;
  for(const u of G.units){if(skip&&skip.has(u.id))continue;let s=0;
    for(const o of fire){const d=Math.hypot(o.x-u.x,o.z-u.z);if(d<5)s+=(o.nat===u.nat?1:1.4)*(1-d/6);}
    if(hot(u))s+=1;if(s>bs){bs=s;best=u;}}
  if(best)return {u:best,s:bs};
  let bd=1e9;for(const u of G.units){if(skip&&skip.has(u.id))continue;for(const e of G.units){if(e.nat===u.nat)continue;const d=Math.hypot(e.x-u.x,e.z-u.z);if(d<bd){bd=d;best=u;}}}
  return best?{u:best,s:0}:null;}
function specFollowed(){const id=UI.follow;return id==null?null:G.units.find(u=>u.id===id)||null;}
/* 지금 관전자에게 보이는 부대인가 */
function specVisible(u){if(!G.fog||UI.specVis==='all')return true;return seen(u,G.viewer);}
function specFollow(u,auto){UI.follow=u?u.id:null;UI.specAuto=!!auto;UI.specHotT=performance.now();
  if(u&&typeof V3!=='undefined'&&V3.cs){if(V3.cs.gd>22)V3.cs.gd=15;V3.cs.gx=u.x;V3.cs.gz=u.z;}}
function specNext(){const cur=specFollowed();const skip=new Set(cur?[cur.id]:[]);
  // 같은 교전에 있는 부대들도 건너뛰어 다른 곳으로 간다
  if(cur)for(const o of G.units)if(Math.hypot(o.x-cur.x,o.z-cur.z)<4)skip.add(o.id);
  const h=specHot(skip)||specHot(cur?new Set([cur.id]):null);if(h)specFollow(h.u,UI.specAuto);}
/* 매 프레임: 따라가는 부대에 카메라를 붙이고, 자동 연출이면 몇 초마다 더 뜨거운 곳으로 옮긴다 */
function specCam(now){if(!specOn()||typeof V3==='undefined'||!V3.cs)return;let u=specFollowed();
  if(UI.follow!=null&&(!u||!specVisible(u))){u=null;UI.follow=null;if(!UI.specAuto&&!G.over)toast('따라가던 부대를 놓쳤습니다');}
  if(UI.specAuto&&!G.paused&&!G.over&&(!u||now-(UI.specHotT||0)>7000)){UI.specHotT=now;const h=specHot(null);
    // 지금 부대가 아직 충분히 뜨거우면 머문다(화면이 자주 튀지 않게)
    if(h&&specVisible(h.u)&&(!u||h.u.id!==u.id&&specScore(u)<h.s*.6)){UI.follow=h.u.id;u=h.u;if(V3.cs.gd>22)V3.cs.gd=15;}}
  if(u){V3.cs.gx=u.x;V3.cs.gz=u.z;}}
function specScore(u){const t=G.time||0;let s=t-(u.firedT??-99)<4?1:0;for(const o of G.units){if(t-(o.firedT??-99)>=4)continue;const d=Math.hypot(o.x-u.x,o.z-u.z);if(d<5)s+=(o.nat===u.nat?1:1.4)*(1-d/6);}return s;}
function specVisLabel(){return UI.specVis==='all'?'전체':NATS[G.viewer].name;}
/* 시야 순환: 전체 → 각 세력 → 전체 */
function specCycleVis(){const act=G.order.filter(i=>G.nats[i].alive);
  if(UI.specVis==='all'){UI.specVis='nat';G.viewer=act[0]??G.viewer;}
  else{const i=act.indexOf(G.viewer);if(i>=0&&i<act.length-1)G.viewer=act[i+1];else UI.specVis='all';}
  bump();}
function specSetSpd(s){G.spd=s;G.paused=false;}

/* ---------- 화면: 관전 중에는 HUD·하단 바를 바꾼다 ---------- */
function specHUD(){const r=$('#hud-res');if(!r)return;
  r.innerHTML=`<span class="rv"><b>관전</b><small class="lbl">시야 ${specVisLabel()}</small></span><span class="rv"><b>${G.order.map(n=>`<span class="spec-sc${G.nats[n].alive?'':' out'}" style="color:${mapCol(n)}" title="${NATS[n].name} 승점">${G.nats[n].vp}</span>`).join(' ')}</b><small class="lbl">승점 / ${G.vpWin}</small></span>`;
  const t=$('#t-cmd');if(t)t.hidden=true;}
function specBar(){const el=$('#actbar');if(!el)return;el.hidden=false;
  if(G.over){const w=G.over.win;el.innerHTML=`<b>${w==null?'무승부':`<span style="color:${mapCol(w)}">${NATS[w].full}</span> 승리`}</b><span>${G.over.why} · ${fmtT(G.time||0)}</span><div class="ab"><button class="btn sm" data-act="report" id="ab-rep">전황</button><button class="btn sm primary" data-act="spec-again" id="ab-sagain">다시 관전</button><button class="btn sm" data-act="new" id="ab-new">새 작전</button></div>`;return;}
  const u=specFollowed();
  const t=u?`<span style="color:${mapCol(u.nat)}">${NATS[u.nat].name} ${UT[u.type].n}</span>`:'관전';
  const i=u?`${UI.specAuto?'자동 연출 · ':''}${uInfo(u)}`:UI.specAuto?'교전을 찾는 중':'드래그로 둘러보고, 부대를 탭하면 따라갑니다';
  const seg=`<div class="spec-seg" role="group" aria-label="배속"><button class="btn sm${G.paused?' primary':''}" data-act="spec-pause" id="sp-pause" aria-label="${G.paused?'재개':'일시정지'} (Space)" aria-pressed="${G.paused}">${G.paused?'▶':'❚❚'}</button>`+
    SPEC_SPD.map((s,i)=>`<button class="btn sm${!G.paused&&G.spd===s?' primary':''}" data-act="spec-spd:${s}" id="sp-spd-${s}" aria-label="${s}배속 (${i+1})" aria-pressed="${!G.paused&&G.spd===s}">${s}×</button>`).join('')+`</div>`;
  const ab=`${seg}<button class="btn sm" data-act="spec-vis" id="sp-vis">시야: ${specVisLabel()}</button><button class="btn sm${UI.specAuto?' primary':''}" data-act="spec-auto" id="sp-auto" aria-pressed="${!!UI.specAuto}">자동 연출</button><button class="btn sm" data-act="spec-next" id="sp-next">다음 교전</button>${u?`<button class="btn sm" data-act="spec-free" id="sp-free">자유 카메라</button>`:''}`;
  // 버튼은 바뀔 때만 다시 그린다(0.25초마다 갈아 끼우면 누르는 사이 버튼이 사라져 탭이 씹힌다)
  const box=el.querySelector('#sp-ab');
  if(!box){el.innerHTML=`<b id="sp-t"></b><span id="sp-i"></span><div class="ab" id="sp-ab"></div>`;return specBar();}
  if(box._h!==ab){box._h=ab;box.innerHTML=ab;}
  const tb=el.querySelector('#sp-t'),ib=el.querySelector('#sp-i');if(tb.innerHTML!==t)tb.innerHTML=t;if(ib.textContent!==i)ib.textContent=i;}
/* 새 게임 화면의 "AI 관전" 칸 (body.html을 건드리지 않고 넣는다) */
function specSetupBox(){if($('#spec-box'))return;const card=$('#setup .card');const anchor=$('#slots');if(!card||!anchor)return;
  const box=document.createElement('div');box.id='spec-box';box.className='spec-box';
  box.innerHTML=`<h3 class="sec">AI 관전</h3><p>모든 세력을 AI가 지휘하고 지켜보기만 합니다. 배속, 전 세력 시야, 부대 따라가기를 쓸 수 있습니다.</p>
<div class="slot"><span></span><label for="spec-n">세력 수</label><select id="spec-n"><option value="2">2세력</option><option value="3">3세력</option><option value="4">4세력</option></select></div>
<div class="slot"><span></span><label for="spec-size">도시 크기</label><select id="spec-size"><option value="s">소형 32×32</option><option value="m" selected>중형 44×44</option><option value="l">대형 56×56</option></select></div>
<button class="btn" data-act="spec-start" id="b-spec">관전 시작</button>`;
  const h=anchor.previousElementSibling;card.insertBefore(box,h&&h.tagName==='H3'?h:anchor);}
function specBegin(){$('#setup').hidden=true;clearSel();UI.sheet=false;UI.tab='world';render();rtStart();
  if(typeof V3!=='undefined'&&V3.cs){const m=N/2;V3.cs.gx=m;V3.cs.gz=m;V3.cs.gd=Math.min(Math.max(48,N*1.35),N*.8);}}

/* ---------- 기존 함수 감싸기 ---------- */
(function(){
  const _new=newGame;newGame=function(cfg){const g=_new(cfg);g.spec=!g.nats.some(x=>x.ctrl==='human');
    if(g.spec){UI.specVis='all';UI.follow=null;UI.specAuto=true;UI.specHotT=0;}return g;};
  const _save=save;save=function(){if(G&&G.spec)return;return _save.apply(this,arguments);};
  // 전 세력 시야: AI의 안개는 그대로 두고, 그리는 동안만 안개를 끈다
  const allView=fn=>function(){if(!specOn()||UI.specVis!=='all'||!G.fog)return fn.apply(this,arguments);G.fog=false;try{return fn.apply(this,arguments);}finally{G.fog=true;}};
  render=allView(render);
  if(typeof document==='undefined')return;
  const st=document.createElement('style');st.textContent=`.spec-seg{display:flex;gap:2px}.spec-seg .btn{min-width:40px;padding:6px 8px;font-family:var(--font-m)}
.spec-sc.out{opacity:.4}.spec-box{display:flex;flex-direction:column;gap:8px}`;document.head.appendChild(st);
  const _rh=renderHUD;renderHUD=function(){_rh.apply(this,arguments);if(specOn())specHUD();else{const t=$('#t-cmd');if(t)t.hidden=false;}};
  const _ra=renderActbar;renderActbar=function(){if(specOn())return specBar();return _ra.apply(this,arguments);};
  const _rp=renderPanel;renderPanel=function(){if(specOn()&&UI.tab==='cmd')UI.tab='world';return _rp.apply(this,arguments);};
  renderTip=allView(renderTip);
  const _ss=showSetup;showSetup=function(){_ss.apply(this,arguments);specSetupBox();if(UI.specCfg){$('#spec-n').value=String(UI.specCfg.n);$('#spec-size').value=UI.specCfg.size;}};
  // 관전 중 탭: 보이는 부대를 탭하면 따라간다. 명령은 내리지 않는다.
  const _tap=tap;tap=function(k){if(!specOn())return _tap.apply(this,arguments);const id=typeof V3!=='undefined'?V3.pickId:null;
    const u=id!=null?G.units.find(z=>z.id===id):null;if(u&&specVisible(u)){specFollow(u,false);render();}};
  // 집 버튼: 관전 중에는 도시 전체가 보이게 물러난다
  const _home=v3HomeCam;v3HomeCam=function(now){if(!specOn())return _home.apply(this,arguments);const s=V3.cs,m=N/2;
    s.gx=m;s.gz=m;s.gd=Math.min(Math.max(48,N*1.35),N*.8);if(now){s.x=s.gx;s.z=s.gz;s.d=s.gd;}else{UI.follow=null;UI.specAuto=false;renderActbar();}};
  // 손으로 화면을 끌면 자유 카메라
  const _pan=v3Pan;v3Pan=function(){if(specOn()&&(UI.follow!=null||UI.specAuto)){UI.follow=null;UI.specAuto=false;renderActbar();}return _pan.apply(this,arguments);};
  const _fr=v3Frame;v3Frame=function(now){specCam(now);return _fr.apply(this,arguments);};
  v3Frame=allView(v3Frame);
  document.addEventListener('click',e=>{const b=e.target.closest('[data-act^="spec"]');if(!b||b.disabled)return;const a=b.dataset.act;
    if(a==='spec-start'){specStart({n:+$('#spec-n').value,size:$('#spec-size').value});specBegin();return;}
    if(a==='spec-again'){specStart(UI.specCfg||{n:G.order.length,size:G.size,layout:G.feat?.layout,relief:G.feat?.relief});specBegin();return;}
    if(!specOn())return;
    if(a==='spec-pause')G.paused=!G.paused;
    else if(a.startsWith('spec-spd:'))specSetSpd(+a.slice(9));
    else if(a==='spec-vis')specCycleVis();
    else if(a==='spec-auto'){UI.specAuto=!UI.specAuto;UI.specHotT=0;if(!UI.specAuto)UI.follow=null;}
    else if(a==='spec-next')specNext();
    else if(a==='spec-free'){UI.follow=null;UI.specAuto=false;}
    render();});
  document.addEventListener('keydown',e=>{if(!specOn()||!$('#setup').hidden||e.target.closest&&e.target.closest('input,select,textarea')||e.ctrlKey||e.metaKey||e.altKey)return;
    const i='1234'.indexOf(e.key);if(i>=0){specSetSpd(SPEC_SPD[i]);render();return;}
    if(e.key==='Escape'&&!UI.sheet&&(UI.follow!=null||UI.specAuto)){UI.follow=null;UI.specAuto=false;render();}});
})();
