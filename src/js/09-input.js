/* ===================== INPUT ===================== */
function select(u){UI.sel=u;UI.phase='select';UI.orig=null;UI.pane=null;UI.fc=null;UI.spots=[];UI.reach=reach(u);UI.targets=targetsOf(u,false);if(typeof camFollow==='function')camFollow(u.r,u.c);sfx('click',.5);render();}
function clearSel(){UI.sel=null;UI.phase=null;UI.orig=null;UI.reach=null;UI.targets=[];UI.fc=null;UI.spots=[];UI.st=null;}
function finish(u){u.done=true;clearSel();render();if(typeof scnAfterAct==='function')scnAfterAct();}
function tap(k){if(!G||G.busy||G.over||G.handoff||isAI(G.cur)||!$('#setup').hidden)return;const r=kr(k),c=kc(k),n=G.cur;const vs=G.fog?visSet(n):null;
  const u0=unitAt(r,c);const u=u0&&(!G.fog||seen(u0,n,vs))?u0:null;
  if(UI.phase==='buy'){if(UI.spots.includes(k)){const nu=buy(n,UI.buyT,r,c);if(nu){nu.face=Math.atan2((N-1)/2-r,(N-1)/2-c)*180/Math.PI;}clearSel();render();if(typeof scnAfterAct==='function')scnAfterAct();}return;}
  if(UI.phase==='sup'){if(UI.st===k){doSupport();return;}UI.st=k;if(!canSupport(n,UI.supK,r,c)){toast('보이는 곳에만 지원할 수 있습니다');UI.st=null;}render();return;}
  const s=UI.sel;
  if(s&&(UI.phase==='select'||UI.phase==='moved')){
    if(UI.targets.includes(k)){if(UI.fc===k){fire(s,r,c);return;}UI.fc=k;render();return;}
    UI.fc=null;
    if(UI.phase==='select'&&UI.reach&&UI.reach.has(k)&&k!==key(s.r,s.c)){UI.orig=[s.r,s.c];s.face=Math.atan2(r-s.r,c-s.c)*180/Math.PI;moveUnit(s,r,c);
      if(!G.units.includes(s)){clearSel();render();return;}
      UI.phase='moved';UI.reach=null;UI.targets=targetsOf(s,true);
      // 경계 사격을 받았거나 점령했으면 되돌릴 수 없다
      if(s.hp<(UI.origHp??s.hp)||cell(r,c).obj!=null)UI.orig=null;
      if(!UI.targets.length){finish(s);return;}render();return;}
    if(UI.phase==='moved')return;}
  if(u&&u.nat===n&&!u.done){UI.origHp=u.hp;select(u);return;}
  clearSel();UI.pane={r,c};render();}
function fire(s,r,c){const d=unitAt(r,c);s.face=Math.atan2(r-s.r,c-s.c)*180/Math.PI;if(d&&d.nat!==s.nat)attack(s,d);else shootBldg(s,r,c);finish(s);}
function doSupport(){const n=G.cur;const k=UI.st;if(k==null)return;if(support(n,UI.supK,kr(k),kc(k))){clearSel();render();if(typeof scnAfterAct==='function')scnAfterAct();}}
if(typeof document!=='undefined'){
document.addEventListener('click',e=>{const tb=e.target.closest('[data-tab]');if(tb&&G){UI.tab=tb.dataset.tab;UI.sheet=true;render();return;}
  const b=e.target.closest('[data-act]');if(!b||b.disabled)return;const a=b.dataset.act;const n=G?G.cur:0;sfx('click',.4);
  if(a==='start'){const slots=NATS.map((_,i)=>$('#slot-'+i).value);const act=slots.filter(s=>s!=='none');
    if(act.length<2){$('#setup-err').textContent='세력을 둘 이상 활성화하세요.';return;}
    $('#setup-err').textContent='';UI.setupSlots=slots;newGame({slots,size:$('#opt-size').value,diff:$('#opt-diff').value,fog:$('#opt-fog').value==='1',speed:+$('#opt-speed').value});$('#setup').hidden=true;clearSel();UI.sheet=false;
    render();if(isAI(G.cur))runAI();return;}
  if(a.startsWith('scn:')){startScn(a.slice(4));return;}
  if(a==='resume'){const o=loadSave();if(!o)return;N=o.N;G=o.G;UID=o.UID;$('#setup').hidden=true;clearSel();G.busy=false;G.running=false;render();if(isAI(G.cur)&&!G.over&&!G.handoff)runAI();return;}
  if(a==='new'){showSetup();return;}
  if(a==='snd'){SFX.on=!SFX.on;try{localStorage.setItem('triad-sound',SFX.on?'1':'0');}catch(e){}if(G)render();return;}
  if(a==='fs'){const el=document.documentElement;if(document.fullscreenElement)document.exitFullscreen();else if(el.requestFullscreen)el.requestFullscreen().catch(()=>{});return;}
  if(!G)return;
  if(a==='menu'){UI.sheet=!UI.sheet;render();return;}
  if(a==='sheet-close'){UI.sheet=false;render();return;}
  if(a==='report'){UI.sheet=true;UI.tab='world';render();return;}
  if(a.startsWith('zoom:')){v3Zoom(+a.slice(5)>0?.75:1.33);return;}
  if(a.startsWith('rot:')){v3Rot(+a.slice(4));return;}
  if(a==='home'){v3HomeCam(false);return;}
  if(a==='grid'){UI.grid=!UI.grid;render();return;}
  if(a==='handoff'){G.handoff=false;clearSel();render();if(typeof v3HomeCam==='function')v3HomeCam(false);return;}
  if(G.busy||isAI(n)||G.over)return;
  const s=UI.sel;
  if(a==='end'){clearSel();endTurn();render();if(isAI(G.cur))runAI();if(typeof scnAfterAct==='function')scnAfterAct();return;}
  if(a==='next'){const us=G.units.filter(u=>u.nat===n&&!u.done);if(us.length){UI.ni=((UI.ni||0)+1)%us.length;select(us[UI.ni]);}return;}
  if(a==='reinf'){UI.sheet=true;UI.tab='cmd';render();return;}
  if(a.startsWith('buy:')){const t=a.slice(4);if(G.nats[n].cp<UT[t].cost)return;clearSel();UI.phase='buy';UI.buyT=t;UI.spots=deploySpots(n,t);if(window.innerWidth<=760)UI.sheet=false;
    if(!UI.spots.length){toast('배치할 칸이 없습니다');clearSel();}render();return;}
  if(a==='buy-cancel'||a==='sup-cancel'){clearSel();render();return;}
  if(a.startsWith('sup:')){clearSel();UI.phase='sup';UI.supK=a.slice(4);UI.st=null;if(window.innerWidth<=760)UI.sheet=false;render();return;}
  if(a==='sup-fire'){doSupport();return;}
  if(a==='close'){UI.pane=null;render();return;}
  if(!s)return;
  if(a==='confirm'&&UI.fc!=null){fire(s,kr(UI.fc),kc(UI.fc));return;}
  if(a==='fc-cancel'){UI.fc=null;render();return;}
  if(a==='wait'){finish(s);return;}
  if(a==='ow'){s.ow=true;L(`${UT[s.type].n} 경계 태세`);finish(s);return;}
  if(a==='cancel'){if(UI.phase==='moved'&&UI.orig){s.r=UI.orig[0];s.c=UI.orig[1];s.moved=false;bump();select(s);}else if(UI.phase==='moved'){finish(s);}else{clearSel();render();}}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(UI.sheet){UI.sheet=false;render();}else if(UI.sel||UI.phase||UI.pane){clearSel();UI.pane=null;render();}}});
}
