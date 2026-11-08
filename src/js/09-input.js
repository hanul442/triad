/* ===================== INPUT ===================== */
function select(u){UI.sel=u;UI.phase='select';UI.pane=null;UI.fc=null;UI.spots=[];UI.reach=null;UI.targets=targetsOf(u,false);sfx('click',.5);render();}
function clearSel(){UI.group=[];UI.sel=null;UI.phase=null;UI.orig=null;UI.reach=null;UI.targets=[];UI.fc=null;UI.spots=[];UI.st=null;}
/* 실시간 조작: 아군을 탭해 고르고, 땅을 탭하면 이동, 적을 탭하면 공격. 선택은 유지된다. */
/* 실시간 조작: 아군을 탭해 고르고(두 번 탭하면 근처 아군 모두), 땅 아무 곳이나 탭하면 그 지점으로, 적을 탭하면 공격. */
function tap(k){if(!G||G.over||G.boot||!$('#setup').hidden)return;const r=kr(k),c=kc(k),n=G.viewer;const vs=G.fog?visSet(n):null;
  const pt=(typeof V3!=='undefined'&&V3.pickPt)||[c+.5,r+.5];const pid=typeof V3!=='undefined'?V3.pickId:null;
  const u0=pid!=null?G.units.find(z=>z.id===pid):null;const u=u0&&(!G.fog||seen(u0,n,vs))?u0:null;
  if(UI.phase==='buy'){if(UI.spots.includes(k)){const nu=buy(n,UI.buyT,r,c);if(nu){nu.face=Math.atan2((N-1)/2-r,(N-1)/2-c)*180/Math.PI;}clearSel();render();if(typeof scnAfterAct==='function')scnAfterAct();}return;}
  if(UI.phase==='sup'){if(UI.st===k){doSupport();return;}UI.st=k;if(!canSupport(n,UI.supK,r,c)){toast((G.nats[n].supT||0)>G.time?'화력 지원 재정비 중입니다':'보이는 곳에만 지원할 수 있습니다');UI.st=null;}render();return;}
  const s=UI.sel&&G.units.includes(UI.sel)?UI.sel:null;const grp=[s,...(UI.group||[])].filter(x=>x&&G.units.includes(x));
  if(u&&u.nat===n){const now=Date.now();
    if(u===s&&now-(UI.lastTap||0)<400){UI.group=G.units.filter(o=>o.nat===n&&o!==u&&Math.hypot(o.x-u.x,o.z-u.z)<4.5);toast(`${UI.group.length+1}개 부대 선택`);render();return;}
    UI.lastTap=now;if(u===s&&!UI.group.length){clearSel();render();return;}UI.group=[];select(u);return;}
  if(s&&UI.phase==='fort'&&typeof fortTap==='function'){fortTap(grp,pt[0],pt[1]);render();return;}
  if(s&&UI.phase==='clear'){const cl=grp.filter(g=>typeof canClear==='function'&&canClear(g));if(G.map[r][c].t==='bldg'&&cl.length){radioSend(n,cl,'clear',[r,c]);if(typeof v3Ping==='function')v3Ping(c+.5,r+.5,'#ff5a3c');L(`${cl.length>1?cl.length+'개 분대':UT[cl[0].type].n} 건물 돌입 명령`);}else toast('돌입할 건물을 탭하세요');UI.phase='select';render();return;}
  if(s&&UI.phase==='demo'){if(G.map[r][c].t==='bldg'){radioSend(n,[s],'bldg',[r,c]);L(`${UT[s.type].n} 건물 사격 명령`);}UI.phase='select';render();return;}
  if(grp.length){if(u&&u.nat!==n){radioSend(n,grp.filter(g=>UT[g.type].rng[1]),'atk',[u.id]);if(typeof v3Ping==='function')v3Ping(u.x,u.z,'#ff5a3c');sfx('click',.6);if(typeof sndRadio==='function')sndRadio('ack');render();return;}
    radioSend(n,grp,'move',[pt[0],pt[1]]);if(typeof v3Ping==='function')v3Ping(pt[0],pt[1]);sfx('click',.4);if(typeof sndRadio==='function'&&Math.random()<.6)sndRadio('ack');render();return;}
  clearSel();UI.pane={r,c};render();}
function doSupport(){const n=G.viewer;const k=UI.st;if(k==null)return;if(support(n,UI.supK,kr(k),kc(k))){clearSel();render();if(typeof scnAfterAct==='function')scnAfterAct();}}
if(typeof document!=='undefined'){
document.addEventListener('click',e=>{const tb=e.target.closest('[data-tab]');if(tb&&G){UI.tab=tb.dataset.tab;UI.sheet=true;render();return;}
  const b=e.target.closest('[data-act]');if(!b||b.disabled)return;const a=b.dataset.act;const n=G?G.viewer:0;sfx('click',.4);
  if(a==='start'){const slots=NATS.map((_,i)=>$('#slot-'+i).value);const act=slots.filter(s=>s!=='none');
    if(act.length<2){$('#setup-err').textContent='세력을 둘 이상 활성화하세요.';return;}
    $('#setup-err').textContent='';UI.setupSlots=slots;newGame({slots,size:$('#opt-size').value,diff:$('#opt-diff').value,fog:$('#opt-fog').value==='1',hour:$('#opt-hour')?.value||'day',wx:$('#opt-wx')?.value||'auto',tflow:$('#opt-tflow')?.value||'normal',speed:+$('#opt-speed').value});$('#setup').hidden=true;clearSel();UI.sheet=false;
    render();rtStart();return;}
  if(a.startsWith('scn:')){startScn(a.slice(4));return;}
  if(a.startsWith('camp:')){const d=$('#debrief');if(d)d.hidden=true;campBrief(a.slice(5));return;}
  if(a==='camp-go'){campGo();return;}
  if(a==='camp-back'||a==='camp-list'){showSetup();return;}
  if(a==='camp-retry'){campGo(G&&G.camp?G.camp.id:UI.campSel);return;}
  if(a==='resume'){const o=loadSave();if(!o)return;N=o.N;G=o.G;UID=o.UID;$('#setup').hidden=true;clearSel();G.paused=false;render();rtStart();return;}
  if(a==='new'){showSetup();return;}
  if(a==='snd'){sndPop();return;}
  if(a==='snd-mute'){toggleSound();if(G)render();return;}
  if(a==='fs'){const el=document.documentElement;if(document.fullscreenElement)document.exitFullscreen();else if(el.requestFullscreen)el.requestFullscreen().catch(()=>{});return;}
  if(!G)return;
  if(a==='menu'){UI.sheet=!UI.sheet;render();return;}
  if(a==='sheet-close'){UI.sheet=false;render();return;}
  if(a==='report'){UI.sheet=true;UI.tab='world';render();return;}
  if(a.startsWith('zoom:')){v3Zoom(+a.slice(5)>0?.75:1.33);return;}
  if(a.startsWith('rot:')){v3Rot(+a.slice(4));return;}
  if(a==='home'){v3HomeCam(false);return;}
  if(a==='cine'){if(typeof v3Cine==='function')v3Cine();return;}
  if(a==='grid'){UI.grid=!UI.grid;render();return;}
  if(a==='handoff'){G.handoff=false;clearSel();render();if(typeof v3HomeCam==='function')v3HomeCam(false);return;}
  if(a==='nvg'){if(typeof nvgSet==='function')nvgSet(!UI.nvg);return;}
  if(a==='pause'){G.paused=!G.paused;render();return;}
  if(a==='spd'){G.spd=G.spd===1?2:G.spd===2?.5:1;render();return;}
  if(G.boot||isAI(n)||G.over)return;
  const s=UI.sel;
  if(a==='all'){const us=G.units.filter(u=>u.nat===n);if(us.length){select(us[0]);UI.group=us.slice(1);toast(`${us.length}개 부대 선택`);render();}return;}
  if(a==='next'){const us=G.units.filter(u=>u.nat===n&&!(u.path&&u.path.length));if(us.length){UI.ni=((UI.ni||0)+1)%us.length;select(us[UI.ni]);if(typeof camFollow==='function')v3Focus(us[UI.ni].r,us[UI.ni].c);}return;}
  if(a==='reinf'){UI.sheet=true;UI.tab='cmd';render();return;}
  if(a.startsWith('buy:')){const t=a.slice(4);if(G.nats[n].cp<UT[t].cost)return;clearSel();UI.phase='buy';UI.buyT=t;UI.spots=deploySpots(n,t);if(window.innerWidth<=760)UI.sheet=false;
    if(!UI.spots.length){toast('배치할 칸이 없습니다');clearSel();}render();return;}
  if(a==='buy-cancel'||a==='sup-cancel'){clearSel();render();return;}
  if(a.startsWith('sup:')){clearSel();UI.phase='sup';UI.supK=a.slice(4);UI.st=null;if(window.innerWidth<=760)UI.sheet=false;render();return;}
  if(a==='sup-fire'){doSupport();return;}
  if(a==='close'){UI.pane=null;render();return;}
  if(!s)return;
  const grp=[s,...(UI.group||[])].filter(x=>x&&G.units.includes(x));
  if(a==='stop'){radioSend(n,grp,'stop');render();return;}
  if(a==='dismount'){const v=dismount(s);if(v){select(v);}else toast('내릴 자리가 없거나 지휘점수가 모자랍니다');render();return;}
  if(a==='floor'){const pe=radioPend(s);const up=pe&&pe.k==='floor'?!pe.a[0]:s.flT===0;radioSend(n,grp,'floor',[up]);render();return;}
  if(a==='hold'){const pe=radioPend(s);const h=!(pe&&pe.k==='hold'?pe.a[0]:s.hold);radioSend(n,grp,'hold',[h]);render();return;}
  if(a==='fort'){UI.phase=UI.phase==='fortmenu'||UI.phase==='fort'?'select':'fortmenu';render();return;}
  if(a.startsWith('fort:')){UI.phase='fort';UI.fortK=a.slice(5);render();return;}
  if(a==='clear'){UI.phase=UI.phase==='clear'?'select':'clear';render();return;}
  if(a==='demo'){UI.phase=UI.phase==='demo'?'select':'demo';render();return;}
  if(a==='cancel'){clearSel();render();}});
document.addEventListener('keydown',e=>{if(e.target.closest&&e.target.closest('input,select,textarea'))return;if(e.key===' '&&G&&!G.boot&&$('#setup').hidden){e.preventDefault();G.paused=!G.paused;render();return;}if((e.key==='c'||e.key==='C')&&G&&typeof v3Cine==='function'){v3Cine();return;}if((e.key==='n'||e.key==='N')&&G&&typeof nvgSet==='function'&&nightK()>.2){nvgSet(!UI.nvg);return;}if(e.key==='Escape'){if(UI.sheet){UI.sheet=false;render();}else if(UI.sel||UI.phase||UI.pane){clearSel();UI.pane=null;render();}}});
}
