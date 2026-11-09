/* ===================== AUTO UI: 부관 지휘 화면 (06f-auto) =====================
   - 새 판 설정에 '지휘 방식' 줄: 부관에게 맡기기(기본) / 직접 지휘. 고른 값은 localStorage triad-cmd.
   - 아무 부대도 고르지 않은 하단 바(지휘소)에 부관 줄: 공격 목표·방어 지점·부관 재량, 자동 증원, 부관 켜고 끄기.
   - 공격 목표·방어 지점은 3D 지도나 작은 지도(08n-minimap)를 탭해 정한다. 목표는 지도에 '주공' 이름표로 남는다.
   - 부대를 골라 직접 명령하면 그 부대에 '직접' 표시가 붙고, [부관에게 돌려주기]로 되돌린다.
   CSS는 여기서 넣는다. */
if(typeof document!=='undefined'&&!document.getElementById('adj-css')){const st=document.createElement('style');st.id='adj-css';
  st.textContent=`.adj-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center;width:100%;padding:2px 0 6px;border-bottom:1px solid rgba(255,255,255,.12);margin-bottom:6px;font-size:12.5px}
.adj-row b{color:#ffd27a;font-size:13px}.adj-row .adj-i{color:#c9d1d6}.adj-row .btn{min-height:32px}
.v3u u.man{border-color:#ffd27a;color:#ffd27a}
.adj-row .adj-s{display:none}
@media (max-width:760px){.adj-row{gap:4px}.adj-row .adj-l{display:none}.adj-row .adj-s{display:inline}.adj-row .btn{padding:0 9px;min-height:30px;font-size:12px}.adj-row .adj-i{flex:1 1 100%;font-size:11.5px}}`;
  document.head.appendChild(st);}
const ADJ_K={atk:'공격',def:'방어'};
const adjL=(l,sh)=>`<span class="adj-l">${l}</span><span class="adj-s">${sh}</span>`;
function adjDesc(I){if(!I)return '부관 재량 (가까운 거점부터)';if(I.obj)return `${ADJ_K[I.k]} · ${I.obj}`;
  let o=null,bd=7;for(const q of G.objs){const d=Math.hypot(q.c+.5-I.x,q.r+.5-I.z);if(d<bd){bd=d;o=q;}}return `${ADJ_K[I.k]} · ${o?o.name+' 근처':'지정 지점'}`;}
const adjCan=()=>G&&!G.over&&!G.boot&&!isAI(G.viewer)&&!(typeof specOn==='function'&&specOn());
function adjAim(x,z){const n=G.viewer;const k=UI.phase==='aim:def'?'def':'atk';const I=autoIntent(n,k,x,z);UI.phase=null;
  if(I){if(typeof v3Ping==='function')v3Ping(I.x,I.z,'#ffd27a');if(typeof sndRadio==='function')sndRadio('ack');toast(`주공 목표: ${adjDesc(I)}`);L(`부관: 주공 ${adjDesc(I)}`);}render();}
/* 설정 화면: 지휘 방식 */
function adjSetupRow(){const sz=document.getElementById('opt-size');if(!sz||document.getElementById('opt-cmd'))return;const row=sz.closest('.slot');if(!row)return;
  const d=document.createElement('div');d.className='slot';let v='auto';try{v=localStorage.getItem('triad-cmd')||'auto';}catch(e){}
  d.innerHTML=`<span></span><label for="opt-cmd">지휘 방식</label><select id="opt-cmd"><option value="auto">부관에게 맡기기 (목표만 정하면 AI가 알아서, 쉬움)</option><option value="direct">직접 지휘 (부대마다 명령)</option></select>`;
  row.parentNode.insertBefore(d,row);const sel=d.querySelector('select');sel.value=v==='direct'?'direct':'auto';sel.addEventListener('change',()=>{try{localStorage.setItem('triad-cmd',sel.value);}catch(e){}});}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',adjSetupRow);else adjSetupRow();}
/* 하단 바 */
{const _ra=renderActbar;renderActbar=function(){_ra();const el=$('#actbar');if(!el||!adjCan())return;const n=G.viewer,N2=G.nats[n];
  if(UI.phase==='aim:atk'||UI.phase==='aim:def'){const k=UI.phase==='aim:def'?'방어 지점':'공격 목표';
    el.innerHTML=`<b style="color:#ffd27a">${k} 지정</b><span>지도나 왼쪽 위 작은 지도를 탭하세요 · 거점 가까이 누르면 그 거점</span><div class="ab"><button class="btn sm" data-act="adj:cancel" id="ab-adj-cancel">취소</button></div>`;return;}
  const s=UI.sel&&G.units.includes(UI.sel)?UI.sel:null;
  if(s){const grp=[s,...(UI.group||[])].filter(u=>u&&G.units.includes(u));const ab=el.querySelector('.ab');
    if(!N2.auto){if(ab&&grp.some(u=>SELF_RUN[u.type]&&u.man!=null))ab.insertAdjacentHTML('afterbegin','<button class="btn sm primary" data-act="adj:free" id="ab-adj-free" title="보급·후송·견인·포 자리 잡기를 다시 알아서 합니다">자동 임무로</button>');return;}
    if(ab&&grp.some(u=>u.man!=null))ab.insertAdjacentHTML('afterbegin','<button class="btn sm primary" data-act="adj:free" id="ab-adj-free" title="이 부대를 다시 부관이 지휘합니다">부관에게 돌려주기</button>');
    const sp=el.querySelector(':scope>span');if(sp&&!grp.some(u=>u.man!=null))sp.insertAdjacentText('beforeend',' · 직접 명령하면 이 부대만 직접 지휘');return;}
  if(UI.pane||UI.phase==='buy'||UI.phase==='sup')return;
  const div=document.createElement('div');div.className='adj-row';
  if(N2.auto){const I=N2.intent;const og=typeof orgOn==='function'&&orgOn(n);
    // 목표는 아래 편성 칩(전체·중대)을 고르고 지도를 탭해서 준다. 여기엔 상태와 설정(⚙)만
    div.innerHTML=`<b>부관 지휘</b><span class="adj-i">${I?`주공: ${adjDesc(I)}`:og?'중대를 고르고 지도를 탭하면 그곳을 공격합니다':`주공: ${adjDesc(I)}`}</span>`+
      `<button class="btn sm" data-act="adj:more" id="ab-adj-more" aria-expanded="${!!UI.adjMore}" title="자동 증원·직접 지휘">⚙</button>`+
      (UI.adjMore||!og?(og?'':`<button class="btn sm${I&&I.k==='atk'?' primary':''}" data-act="adj:atk" id="ab-adj-atk">${adjL('공격 목표','공격')}</button><button class="btn sm${I&&I.k==='def'?' primary':''}" data-act="adj:def" id="ab-adj-def">${adjL('방어 지점','방어')}</button>`)+
      (I?`<button class="btn sm" data-act="adj:free-all" id="ab-adj-any" title="부관이 가까운 거점부터 알아서 잡습니다">${adjL('목표 지우기','지우기')}</button>`:'')+
      (UI.adjMore?`<button class="btn sm" data-act="adj:buy" id="ab-adj-buy" aria-pressed="${N2.autoBuy!==false}" title="부관이 지휘점수로 부대를 사서 보냅니다">${adjL('자동 증원: ','증원 ')}${N2.autoBuy!==false?'켬':'끔'}</button>`+
      `<button class="btn sm" data-act="adj:off" id="ab-adj-off" title="모든 부대를 직접 지휘합니다">${adjL('직접 지휘로','직접')}</button>`:''):'');}
  else div.innerHTML=`<span class="adj-i">어렵다면 부관에게 맡기세요: 목표만 정하면 이동·엄폐·지원·증원을 AI가 합니다</span><button class="btn sm primary" data-act="adj:on" id="ab-adj-on">부관에게 맡기기</button>`;
  el.prepend(div);
  if(N2.auto){const sp=el.querySelector(':scope>span');if(sp)sp.textContent=sp.textContent.replace('아군을 탭해 지휘','부대를 골라 직접 명령도 가능');}};}
if(typeof document!=='undefined')document.addEventListener('click',e=>{const b=e.target.closest('[data-act^="adj:"]');if(!b||b.disabled||!adjCan())return;
  const a=b.dataset.act.slice(4),n=G.viewer,N2=G.nats[n];
  if(a==='atk'||a==='def'){clearSel();UI.pane=null;UI.phase='aim:'+a;render();return;}
  if(a==='cancel'){UI.phase=null;render();return;}
  if(a==='more'){UI.adjMore=!UI.adjMore;render();return;}
  if(a==='free-all'){autoIntent(n,null);toast('부관 재량: 가까운 거점부터 잡습니다');render();return;}
  if(a==='buy'){N2.autoBuy=N2.autoBuy===false;toast(`자동 증원 ${N2.autoBuy?'켬':'끔'}`);render();return;}
  if(a==='on'){autoSet(n,true);toast('부관이 지휘합니다 · 중대를 고르고 지도를 탭해 목표를 정하세요');render();return;}
  if(a==='off'){autoSet(n,false);toast('직접 지휘로 바꿨습니다');render();return;}
  if(a==='free'){const grp=[UI.sel,...(UI.group||[])].filter(u=>u&&G.units.includes(u)&&(N2.auto||SELF_RUN[u.type]));for(const u of grp){u.man=null;u.hold=false;}toast(N2.auto?`${grp.length}개 부대를 부관에게 돌려줌`:`${grp.length}개 지원 부대 자동 임무`);clearSel();render();return;}});
/* 지도 탭: 목표 지정 중이면 목표로 */
{const _tap=tap;tap=function(k){if(G&&!G.over&&(UI.phase==='aim:atk'||UI.phase==='aim:def')){const pt=(typeof V3!=='undefined'&&V3.pickPt)||[kc(k)+.5,kr(k)+.5];adjAim(pt[0],pt[1]);return;}return _tap(k);};}
if(typeof mmPick==='function'){const _mp=mmPick;mmPick=function(x,z,first){if(G&&(UI.phase==='aim:atk'||UI.phase==='aim:def')){if(first)adjAim(x,z);return false;}return _mp.apply(this,arguments);};}
/* 작은 지도에 주공 목표 */
{const _mo=typeof mmOverlay==='function'?mmOverlay:null;mmOverlay=function(g){if(_mo)_mo(g);if(!G||!autoOn(G.viewer))return;const I=G.nats[G.viewer].intent;if(!I||typeof mmTo!=='function')return;
  const [x,y]=mmTo(I.x,I.z);g.strokeStyle='#ffd27a';g.lineWidth=1.8;g.beginPath();g.arc(x,y,6,0,6.283);g.stroke();g.beginPath();g.moveTo(x-9,y);g.lineTo(x-3,y);g.moveTo(x+3,y);g.lineTo(x+9,y);g.moveTo(x,y-9);g.lineTo(x,y-3);g.moveTo(x,y+3);g.lineTo(x,y+9);g.stroke();
  if(I.k==='def'){g.fillStyle='rgba(255,210,122,.25)';g.beginPath();g.arc(x,y,6,0,6.283);g.fill();}};}
/* 3D 지도에 주공 이름표, 직접 지휘 부대 표시 */
if(typeof occLabels==='function'){const _ol=occLabels;occLabels=function(want,vs,vn){_ol.apply(this,arguments);if(!G||!autoOn(vn))return;const I=G.nats[vn].intent;if(!I)return;
  const y=(typeof v3TopAt==='function'?v3TopAt(I.x,I.z):0)+.7;want.set('adj-int',{html:`<span>주공 · ${ADJ_K[I.k]}</span>`,cls:'v3c',col:'#ffd27a',p:[I.x,y,I.z]});};}
if(typeof v3UnitTag==='function'){const _ut=v3UnitTag;v3UnitTag=function(u){const h=_ut(u);return G&&u.nat===G.viewer&&u.man!=null&&autoOn(u.nat)?h+'<u class="man">직접</u>':h;};}
/* 판을 시작하면 한 번 안내 */
{const _r=render;render=function(){const r=_r.apply(this,arguments);try{if(G&&!G._adjHint&&adjCan()&&G.nats[G.viewer].auto&&$('#setup').hidden){G._adjHint=1;toast('부관이 부대를 지휘합니다 · 아래 [1중대]를 고르고 지도를 탭하면 그곳을 공격합니다');}}catch(e){}return r;};}
/* 지원 부대 정보: 자동 임무 중인지 */
{const _ui=uInfo;uInfo=function(u){let s=_ui(u);if(G&&u.nat===G.viewer&&!isAI(u.nat)&&SELF_RUN[u.type])s+=selfRun(u)?' · 자동 임무':' · 직접 명령 중';return s;};}
