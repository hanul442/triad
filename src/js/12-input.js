/* ===================== INPUT ===================== */
function clearSel(){UI.mt=null;UI.fc=null;UI.sel=null;UI.phase=null;UI.orig=null;UI.reach=null;UI.loads=[];UI.targets=[];UI.unloads=[];UI.pane=null;}
function pathField(type,tr,tc){const F=new Map([[key(tr,tc),0]]);const q=[[tr,tc,0]];
  while(q.length){let bi=0;for(let i=1;i<q.length;i++)if(q[i][2]<q[bi][2])bi=i;const [r,c,d]=q.splice(bi,1)[0];if(d>F.get(key(r,c)))continue;const step=mcost(type,G.map[r][c].t);
    for(const [a,b] of nbrs(r,c)){if(mcost(type,G.map[a][b].t)===Infinity)continue;const nd=d+(step===Infinity?1:step);const k=key(a,b);if(!F.has(k)||nd<F.get(k)){F.set(k,nd);q.push([a,b,nd]);}}}return F;}
function execOrder(u){const o=u.order;if(!o||o.t!=='goto')return false;if(u.r===o.r&&u.c===o.c){u.order=null;return false;}const F=pathField(u.type,o.r,o.c);const RS=reach(u);
  const cur=F.has(key(u.r,u.c))?F.get(key(u.r,u.c)):Infinity;let best=null,bv=cur;for(const [k,cost] of RS){if(!F.has(k))continue;const v=F.get(k);if(v<bv||(v===bv&&best&&cost<RS.get(best))){bv=v;best=k;}}
  if(best==null||best===key(u.r,u.c)){if(cur===Infinity)u.order=null;return false;}moveUnit(u,kr(best),kc(best),RS.get(best));if(G.units.includes(u)&&u.r===o.r&&u.c===o.c){u.order=null;L(`${UT[u.type].n} 목표 도착`);}return true;}
function runOrders(n){const vs=G.fog?visSet(n):null;let moved=0,woke=0;
  for(const u of [...G.units]){if(u.nat!==n||!u.order||u.done)continue;
    if(u.order.t==='sentry'){if(G.units.some(e=>hostile(n,e.nat)&&dist(e.r,e.c,u.r,u.c)<=3&&(!vs||seen(e,n,vs)))){u.order=null;woke++;}continue;}
    if(execOrder(u))moved++;if(!G.units.includes(u))continue;if(targetsOf(u,vs).length){u.order=null;woke++;}else u.done=true;}
  if(moved||woke)toast(`예약 명령: 이동 ${moved}기${woke?` · 적 발견으로 대기 해제 ${woke}기`:''}`);}
function select(u){sfx('click',.7);clearSel();UI.sel=u;UI.phase='select';UI.reach=reach(u);UI.loads=[...UI.reach.loads];UI.unloads=unloadSpots(u);const vs=G.fog?visSet(u.nat):null;UI.targets=targetsOf(u,vs);UI.tab='cmd';render();}
function finish(u){u.done=true;clearSel();checkOver();if(G.over)save();render();}
function tap(k){if(!G||G.busy||G.over||G.handoff||isAI(G.cur)||!$('#setup').hidden)return;const r=kr(k),c=kc(k),n=G.cur;const vs=G.fog?visSet(n):null;
  let u=unitAt(r,c);if(u&&vs&&!seen(u,n,vs))u=null;const s=UI.sel;
  if(UI.phase==='msl'){if(!UI.targets.includes(k))return;if(UI.mk==='b'&&UI.mt!==k){UI.mt=k;UI.sp=UI.sp??1;render();return;}launch(n,UI.mk,r,c,UI.sp??1);clearSel();render();return;}
  if(UI.phase==='goto'&&s){if(k===key(s.r,s.c))return;s.order={t:'goto',r,c};const okm=execOrder(s);if(G.units.includes(s)){if(okm||UI.reach)s.done=true;}L(`${UT[s.type].n} 목표 지정`);clearSel();checkOver();render();return;}
  if(s){
    if(UI.unloads.includes(k)){unload(s,r,c);finish(s);return;}
    if(UI.phase==='unload')return;
    if(UI.targets.includes(k)&&u){if(UI.fc!==k){UI.fc=k;render();return;}attack(s,u);clearSel();checkOver();render();return;}
    if(UI.phase==='select'&&UI.loads.includes(k)){load(s,unitAt(r,c));clearSel();render();return;}
    if(UI.phase==='select'&&UI.reach.has(k)&&k!==key(s.r,s.c)){UI.orig=[s.r,s.c,s.fuel];G.reacted=false;moveUnit(s,r,c,UI.reach.get(k));if(G.reacted)UI.orig=null;if(!G.units.includes(s)){clearSel();checkOver();render();return;}UI.phase='moved';UI.reach=null;UI.loads=[];
      if(capturable(s)){capture(s);finish(s);return;}UI.unloads=unloadSpots(s);
      UI.targets=targetsOf(s,G.fog?visSet(n):null);if(!UI.targets.length&&!UI.unloads.length){L(`${UT[s.type].n} 이동 완료`);finish(s);return;}render();return;}
    if(UI.phase==='moved')return;}
  if(u&&u.nat===n&&!u.done){select(u);return;}
  clearSel();{const rk=cell(r,c).rwy;if(rk!=null&&!(u)){UI.pane={r:kr(rk),c:kc(rk)};UI.tab='cmd';render();return;}}UI.pane={r,c};UI.tab='cmd';render();}
if(typeof document!=='undefined'){
document.addEventListener('click',e=>{const tb=e.target.closest('[data-tab]');if(tb&&G){UI.tab=tb.dataset.tab;UI.sheet=true;render();return;}
  const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;const n=G?G.cur:0;
  if(a==='start'){const slots=NATS.map((_,i)=>$('#slot-'+i).value);const act=slots.filter(s=>s!=='none');const size=$('#opt-size').value;
    if(act.length>SIZES[size].max){$('#setup-err').textContent=`${SIZES[size].n} 맵은 최대 ${SIZES[size].max}세력까지 가능합니다.`;return;}
    if(act.length<2){$('#setup-err').textContent='세력을 둘 이상 활성화하세요.';return;}
    $('#setup-err').textContent='';UI.setupSlots=slots;newGame({slots,size,land:$('#opt-land').value,relief:$('#opt-relief').value,vic:+$('#opt-vic').value,diff:$('#opt-diff').value,mt:$('#opt-mt').value,fog:$('#opt-fog').value==='1',speed:+$('#opt-speed').value});$('#setup').hidden=true;clearSel();UI.tab='cmd';save();render();centerHQ();
    if(isAI(G.cur))runAI();return;}
  if(a.startsWith('scn:')){startScn(a.slice(4));return;}
  if(a==='resume'){const g=loadSave();if(!g)return;G=g;if(!G.roads)buildRoads();setDims(G.cols||26,G.rows||18);$('#setup').hidden=true;clearSel();G.busy=false;render();centerHQ();if(isAI(G.cur)&&!G.over)runAI();return;}
  if(a==='new'){showSetup();return;}
  if(!G)return;
  if(a.startsWith('zoom:')){const b2=$('#board'),st=$('#stage');const cx=(b2.scrollLeft+b2.clientWidth/2-st.offsetLeft)/UI.zoom,cy=(b2.scrollTop+b2.clientHeight/2-st.offsetTop)/UI.zoom;
    UI.zoom=Math.min(1.8,Math.max(0.35,+(UI.zoom+(+a.slice(5))*0.2).toFixed(2)));render();b2.scrollLeft=st.offsetLeft+cx*UI.zoom-b2.clientWidth/2;b2.scrollTop=st.offsetTop+cy*UI.zoom-b2.clientHeight/2;updateRegion();return;}
  if(a==='home'){centerHQ();return;}
  if(a==='grid'){UI.grid=!UI.grid;render();return;}
  if(a==='snd'){toggleSound();render();return;}
  if(a.startsWith('dev:')){if(UI.pane)develop(n,UI.pane.r,UI.pane.c);render();return;}
  if(a==='report'){UI.sheet=true;UI.tab='cmd';render();return;}
  if(a==='next'){const us=G.units.filter(u=>u.nat===n&&!u.done&&!u.order);if(us.length&&!G.busy&&!isAI(n)){UI.ni=((UI.ni||0)+1)%us.length;const u=us[UI.ni];select(u);centerOn(u.r,u.c);}return;}
  if(a==='panel'){UI.tab='cmd';UI.sheet=true;render();return;}
  if(a==='menu'){UI.sheet=!UI.sheet;render();return;}
  if(a==='sheet-close'){UI.sheet=false;render();return;}
  if(a==='fs'){const d=document;if(d.fullscreenElement){d.exitFullscreen&&d.exitFullscreen();}else{const r=d.documentElement.requestFullscreen?d.documentElement.requestFullscreen():null;if(r&&r.catch)r.catch(()=>toast('이 화면에서는 전체화면을 쓸 수 없습니다. 브라우저에서 직접 열어 주세요.'));else if(!r)toast('이 브라우저는 전체화면을 지원하지 않습니다. 홈 화면에 추가해 보세요.');}return;}
  if(a.startsWith('card:')){const u=G.units.find(x=>x.id===+a.slice(5));if(u&&u.nat===n&&!u.done&&!G.busy&&!isAI(n)){if(window.innerWidth<=760)UI.sheet=false;select(u);centerOn(u.r,u.c);}return;}
  if(a==='handoff'){G.handoff=false;render();centerHQ();return;}
  if(a==='end'){endTurn();return;}
  if(a==='close'){clearSel();render();return;}
  if(a.startsWith('prod:')){produce(n,a.slice(5),UI.pane.r,UI.pane.c);render();return;}
  if(a.startsWith('bld:')){construct(n,a.slice(4),UI.pane.r,UI.pane.c);render();return;}
  if(a.startsWith('hire:')){hire(n,a.slice(5));render();return;}
  if(a.startsWith('fort:')){fortify(n,a.slice(5),UI.pane.r,UI.pane.c);render();return;}
  if(a.startsWith('sortie:')){if(!UI.pane)return;const u=sortie(n,key(UI.pane.r,UI.pane.c),+a.slice(7));if(u){if(window.innerWidth<=760)UI.sheet=false;select(u);centerOn(u.r,u.c);}else toast('비행장 주변에 빈 칸이 없어 출격할 수 없습니다.');return;}
  if(a.startsWith('mprod:')){mprod(n,a.slice(6),UI.pane.r,UI.pane.c);render();return;}
  if(a.startsWith('msl:')){const k=a.slice(4);clearSel();UI.phase='msl';UI.mk=k;UI.targets=mslTargets(n,k,G.fog?visSet(n):null);UI.tab='cmd';render();return;}
  if(a==='msl-cancel'){clearSel();render();return;}
  if(a.startsWith('spread:')){UI.sp=+a.slice(7);render();return;}
  if(a==='fire-msl'&&UI.mt!=null){const k=UI.mt;launch(n,'b',kr(k),kc(k),UI.sp??1);clearSel();render();return;}
  if(a.startsWith('res:')){startResearch(n,a.slice(4));render();return;}
  if(a.startsWith('acc:')){const f=+a.slice(4);G.offers=G.offers.filter(o=>!(o.from===f&&o.to===n));sign(f,n);render();return;}
  if(a.startsWith('rej:')){const f=+a.slice(4);G.offers=G.offers.filter(o=>!(o.from===f&&o.to===n));L(`${natName(n)}, ${natName(f)}의 제안 거절`);render();return;}
  if(a.startsWith('peace:')){propose(n,+a.slice(6));render();return;}
  if(a.startsWith('war:')){declare(n,+a.slice(4));render();return;}
  if(a.startsWith('fire:')){const N=G.nats[n];N.staff=N.staff.filter(s=>s.role!==a.slice(5));render();return;}
  const s=UI.sel;if(!s)return;
  if(a==='confirm'&&UI.fc!=null){tap(UI.fc);return;}
  if(a==='fc-cancel'){UI.fc=null;render();return;}
  if(a==='dig'){const r=s.r,c=s.c;clearSel();UI.pane={r,c};render();return;}
  if(a==='store'){const k=baseKeyOf(s.r,s.c);if(k!=null&&storeAir(s,k)){clearSel();render();}return;}
  if(a==='goto'){UI.phase='goto';render();return;}
  if(a==='goto-cancel'){select(s);return;}
  if(a==='sentry'){s.order={t:'sentry'};L(`${UT[s.type].n} 경계 태세`);finish(s);return;}
  if(a==='unorder'){s.order=null;select(s);return;}
  if(a==='wait'){finish(s);return;}
  if(a==='capture'){capture(s);finish(s);return;}
  if(a==='unload'){UI.prev=UI.phase;UI.phase='unload';UI.unloads=unloadSpots(s);UI.reach=null;UI.loads=[];UI.targets=[];render();return;}
  if(a==='unload-cancel'){if(UI.prev==='select')select(s);else{UI.phase='moved';UI.unloads=[];UI.targets=targetsOf(s,G.fog?visSet(n):null);render();}return;}
  if(a==='cancel'){if(UI.phase==='moved'&&!UI.orig){finish(s);return;}if(UI.phase==='moved'){s.r=UI.orig[0];s.c=UI.orig[1];s.fuel=UI.orig[2];s.moved=false;select(s);}else{clearSel();render();}}});
$('#map').addEventListener('click',e=>{const p=e.target.closest('[data-k]');if(p)tap(+p.dataset.k);});
let rgnRaf=0;$('#board').addEventListener('scroll',()=>{if(rgnRaf)return;rgnRaf=requestAnimationFrame(()=>{rgnRaf=0;updateRegion();});},{passive:true});
}
function showSetup(){{const sl=$('#scn-list');if(sl)sl.innerHTML=scnButtons();}const box=$('#slots');box.innerHTML=NATS.map((N,i)=>`<div class="slot"><i class="sw" style="background:${N.col}"></i><label for="slot-${i}">${N.full}</label><select id="slot-${i}"><option value="human">사람</option><option value="ai">AI</option><option value="none">없음</option></select></div>`).join('');
  NATS.forEach((_,i)=>{$('#slot-'+i).value=UI.setupSlots[i];});$('#b-resume').hidden=!loadSave();$('#setup').hidden=false;}
if(typeof document!=='undefined'){$('#map').addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;const p=e.target.closest('[data-k]');const k=p?+p.dataset.k:null;if(k!==UI.hk){UI.hk=k;drawPath();}});
  $('#map').addEventListener('pointerleave',()=>{UI.hk=null;drawPath();});}
