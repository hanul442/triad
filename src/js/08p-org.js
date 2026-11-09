/* ===================== ORG UI: 중대·소대 지휘 화면 (06h-org) =====================
   - 아무 부대도 고르지 않은 하단 바에 편성 줄: [1중대] [2중대] … [본부]. 누르면 그 중대 전체를 고른다.
   - 중대·소대를 고르면: 공격 목표·방어 지점·목표 지우기, 증원 받기(새 부대가 이 중대로), 소대 고르기.
     부관 지휘면 부관이 그 목표로 움직이고, 직접 지휘면 공격·방어 임무를 준다.
   - 부대 하나를 고르면 선택 줄: 같은 병종 모두·소대·중대·추가 선택(켜면 탭으로 넣고 빼기, PC는 Shift)·새 소대로·새 중대로.
   - 아래 부대 목록은 중대 → 소대 → 부대 순으로, 머리 칩을 누르면 그 소대(중대)를 고른다.
   - 지도·작은 지도에 중대·소대 목표 표시. */
if(typeof document!=='undefined'&&!document.getElementById('org-css')){const st=document.createElement('style');st.id='org-css';
  st.textContent=`.org-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center;width:100%;padding:2px 0 6px;border-bottom:1px solid rgba(255,255,255,.12);margin-bottom:6px;font-size:12.5px}
.org-row b{color:#9fd3ff;font-size:13px}.org-row .adj-i{color:#c9d1d6}.org-row .btn{min-height:32px}
.org-row .oc{display:inline-flex;gap:5px;align-items:baseline}.org-row .oc small{color:#c9d1d6;font-weight:400}.org-row .oc em{font-style:normal;color:#9fd3ff}
.org-row .btn[aria-pressed="true"]{border-color:#9fd3ff;color:#9fd3ff}
#roster .rh{flex:0 0 auto;min-height:34px;padding:0 8px;border-radius:8px;border:1px solid rgba(159,211,255,.45);background:rgba(20,40,60,.75);color:#9fd3ff;font:600 12px/1 inherit;cursor:pointer}
#roster .rh.co{background:rgba(159,211,255,.18);color:#d9efff}#roster .rh[aria-pressed="true"]{background:#9fd3ff;color:#0d1a26}
.v3u u.pq{border-color:#9fd3ff;color:#9fd3ff}
.org-row .adj-s{display:none}
@media (max-width:760px){.org-row{gap:4px}.org-row .adj-l{display:none}.org-row .adj-s{display:inline}.org-row .btn{padding:0 9px;min-height:30px;font-size:12px}.org-row .adj-i{flex:1 1 100%;font-size:11.5px}.org-row .oc small{display:none}}`;
  document.head.appendChild(st);}
const orgCan=()=>adjCan()&&orgOn(G.viewer);
const orgGrp=()=>{const s=UI.sel&&G.units.includes(UI.sel)?UI.sel:null;return s?[s,...(UI.group||[])].filter(u=>u&&G.units.includes(u)):[];};
function orgIDesc(n,I,o){if(I)return adjDesc(I);const c=o&&o.co!=null?orgCo(n,o.co):null;if(c&&c.intent)return `중대 목표 · ${adjDesc(c.intent)}`;return autoOn(n)?(G.nats[n].intent?`전체 주공 · ${adjDesc(G.nats[n].intent)}`:'부관 재량'):'목표 없음';}
/* 중대·소대·본부 고르기 */
function orgSelect(ref){const n=G.viewer;const us=orgRefUnits(n,ref);if(!us.length){toast('남은 부대가 없습니다');return;}
  clearSel();select(us[0]);UI.group=us.slice(1);UI.org=ref;render();}
function orgSetSel(us,msg){us=us.filter(u=>u&&G.units.includes(u));if(!us.length){clearSel();render();return;}const add=UI.addSel;select(us[0]);UI.group=us.slice(1);UI.addSel=add;if(msg)toast(msg);render();}
function orgToggle(u){const g=orgGrp();const on=g.includes(u);orgSetSel(on?g.filter(x=>x!==u):g.concat([u]),`${on?'뺌':'넣음'} · ${on?g.length-1:g.length+1}개 부대 선택`);}
{const _s=select;select=function(u){UI.org=null;return _s.apply(this,arguments);};}
{const _c=clearSel;clearSel=function(){UI.org=null;UI.addSel=false;return _c.apply(this,arguments);};}
/* 하단 바 */
function orgChip(n,c){const us=orgCoUnits(n,c);const I=c.intent;const rc=G.nats[n].reinfCo===c.id;
  const pr=UI.org&&UI.org.k==='co'&&UI.org.id===c.id;
  return `<button class="btn sm oc" data-act="org:co:${c.id}" id="ab-org-co-${c.no}" aria-pressed="${pr}" title="${c.name} 전체 고르기"><b>${c.name}</b><small>${I?`${ADJ_K[I.k]}${I.obj?' '+I.obj:''}`:''}</small><em>${us.length}</em>${rc?' ★':''}</button>`;}
{const _ra=renderActbar;renderActbar=function(){_ra();const el=$('#actbar');if(!el||!orgCan())return;const n=G.viewer,O=orgOf(n),N2=G.nats[n];
  if(UI.phase==='aim:atk'||UI.phase==='aim:def'){if(UI.aimOrg){const b=el.querySelector(':scope>b');if(b)b.textContent=`${orgRefName(n,UI.aimOrg)} ${b.textContent}`;}return;}
  const g=orgGrp();const div=document.createElement('div');div.className='org-row';
  if(g.length){
    if(UI.phase&&UI.phase!=='select')return;
    const ref=UI.org&&orgRefUnits(n,UI.org).length?UI.org:null;
    if(ref&&ref.k==='hq'){const T={};for(const u of g)T[UT[u.type].n]=(T[UT[u.type].n]||0)+1;
      div.innerHTML=`<b>본부</b><span class="adj-i">지원 부대 ${g.length}개 · 알아서 일합니다 (${Object.entries(T).map(([k,v])=>`${k} ${v}`).join(', ')})</span>`;}
    else if(ref){const o=ref.k==='co'?orgCo(n,ref.id):orgPq(n,ref.id);const c=ref.k==='co'?o:orgCo(n,o.co);const P=c?orgCoPqs(n,c):[];
      let h=`<b>${o.name}</b><span class="adj-i">${ref.k==='co'?`${P.length}개 소대 · `:''}${g.length}개 부대 · ${orgIDesc(n,o.intent,ref.k==='pq'?o:null)}</span>`;
      h+=`<button class="btn sm${o.intent&&o.intent.k==='atk'?' primary':''}" data-act="org:atk" id="ab-org-atk" title="${o.name}이 그쪽을 공격합니다">${adjL('공격 목표','공격')}</button>`;
      h+=`<button class="btn sm${o.intent&&o.intent.k==='def'?' primary':''}" data-act="org:def" id="ab-org-def" title="${o.name}이 그 둘레를 지킵니다">${adjL('방어 지점','방어')}</button>`;
      if(o.intent)h+=`<button class="btn sm" data-act="org:clr" id="ab-org-clr" title="${autoOn(n)?'위 단위(중대·전체 주공) 목표를 따릅니다':'임무를 풉니다'}">${adjL('목표 지우기','지우기')}</button>`;
      if(c)h+=`<button class="btn sm" data-act="org:reinf" id="ab-org-reinf" aria-pressed="${N2.reinfCo===c.id}" title="새로 오는 증원 부대가 ${c.name}으로 갑니다">${N2.reinfCo===c.id?'★ 증원 받는 중':adjL(`증원은 ${c.name}로`,'증원 받기')}</button>`;
      if(ref.k==='co'&&P.length>1)for(const p of P)h+=`<button class="btn sm" data-act="org:pq:${p.id}" id="ab-org-pq-${p.sh}">${p.no}소대</button>`;
      if(ref.k==='pq'&&c)h+=`<button class="btn sm" data-act="org:co:${c.id}" id="ab-org-up">${adjL(`${c.name} 전체`,c.name)}</button>`;
      div.innerHTML=h;}
    else{const s=g[0];const p=orgPq(n,s.pq);const same=G.units.filter(u=>u.nat===n&&u.type===s.type).length;const cb=g.some(u=>!orgHQ(u));
      let h=`<span class="adj-i">${g.length>1?`${g.length}개 부대`:p?p.name:orgHQ(s)?'본부':''}</span>`;
      if(same>1)h+=`<button class="btn sm" data-act="org:same" id="ab-org-same" title="같은 병종 모두 고르기">${adjL(`${UT[s.type].n} 모두`,'같은 병종')} ${same}</button>`;
      if(p)h+=`<button class="btn sm" data-act="org:pq:${p.id}" id="ab-org-mypq">${adjL(p.name,'소대')}</button><button class="btn sm" data-act="org:co:${p.co}" id="ab-org-myco">${adjL(`${orgCo(n,p.co)?.name||''} 전체`,'중대')}</button>`;
      else if(orgHQ(s))h+=`<button class="btn sm" data-act="org:hq" id="ab-org-hq">본부 전체</button>`;
      h+=`<button class="btn sm" data-act="org:add" id="ab-org-add" aria-pressed="${!!UI.addSel}" title="켜면 아군을 탭할 때마다 선택에 넣고 뺍니다 (PC는 Shift+클릭)">${adjL('추가 선택: ','추가 ')}${UI.addSel?'켬':'끔'}</button>`;
      if(cb)h+=`<button class="btn sm" data-act="org:newpq" id="ab-org-newpq" title="고른 부대로 새 소대를 만듭니다">${adjL('새 소대로 묶기','새 소대')}</button><button class="btn sm" data-act="org:newco" id="ab-org-newco" title="고른 부대로 새 중대를 만듭니다">${adjL('새 중대로 묶기','새 중대')}</button>`;
      div.innerHTML=h;}
    el.prepend(div);return;}
  if(UI.pane||UI.phase==='buy'||UI.phase==='sup'||!O.co.length&&!orgHQUnits(n).length)return;
  const hq=orgHQUnits(n).length;
  div.innerHTML=`<span class="adj-i adj-l">편성</span>`+O.co.map(c=>orgChip(n,c)).join('')+(hq?`<button class="btn sm oc" data-act="org:hq" id="ab-org-hq" title="지원 부대(알아서 일함)"><b>본부</b><em>${hq}</em></button>`:'');
  const a=el.querySelector('.adj-row');if(a)a.after(div);else el.prepend(div);};}
if(typeof document!=='undefined'){
  document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b||b.disabled||!G||!orgCan())return;const act=b.dataset.act;const n=G.viewer;
    if(act==='adj:cancel'&&UI.aimOrg){const r=UI.aimOrg;UI.aimOrg=null;orgSelect(r);return;}
    if(!act.startsWith('org:'))return;const a=act.slice(4);
    if(a.startsWith('co:')){orgSelect({k:'co',id:+a.slice(3)});return;}
    if(a.startsWith('pq:')){orgSelect({k:'pq',id:+a.slice(3)});return;}
    if(a==='hq'){orgSelect({k:'hq'});return;}
    const g=orgGrp();
    if(a==='atk'||a==='def'){if(!UI.org)return;UI.aimOrg=UI.org;UI.phase='aim:'+a;render();return;}
    if(a==='clr'){if(!UI.org)return;orgAim(n,UI.org,null);toast(`${orgRefName(n,UI.org)} 목표 지움`);render();return;}
    if(a==='reinf'){const o=UI.org&&(UI.org.k==='co'?orgCo(n,UI.org.id):orgCo(n,orgPq(n,UI.org.id)?.co));if(!o)return;const N2=G.nats[n];
      N2.reinfCo=N2.reinfCo===o.id?null:o.id;toast(N2.reinfCo!=null?`새 증원 부대는 ${o.name}로 갑니다`:'증원은 가장 작은 중대부터 채웁니다');
      if(N2.reinfCo!=null&&!autoOn(n)){UI.sheet=true;UI.tab='cmd';}render();return;}
    if(!g.length)return;
    if(a==='same'){const t=g[0].type;orgSetSel(G.units.filter(u=>u.nat===n&&u.type===t),`${UT[t].n} ${G.units.filter(u=>u.nat===n&&u.type===t).length}개 선택`);return;}
    if(a==='add'){UI.addSel=!UI.addSel;toast(UI.addSel?'아군을 탭하면 선택에 넣고 뺍니다':'추가 선택 끔');render();return;}
    if(a==='newpq'||a==='newco'){const r=orgRegroup(n,g,a==='newpq'?'pq':'co');if(!r)return;toast(`${r.made.map(p=>p.name).join(', ')} 편성`);L(`편성: ${r.made.map(p=>p.name).join(', ')}`);
      orgSelect(a==='newco'?{k:'co',id:r.c.id}:{k:'pq',id:r.made[0].id});return;}});
  window.addEventListener('keydown',e=>{if(e.key==='Shift')UI.shift=true;});
  window.addEventListener('keyup',e=>{if(e.key==='Shift')UI.shift=false;});
  window.addEventListener('blur',()=>{UI.shift=false;});}
/* 지도에서 목표를 찍으면 고른 중대·소대의 목표로 */
{const _aa=adjAim;adjAim=function(x,z){const ref=UI.aimOrg;if(!ref)return _aa(x,z);const n=G.viewer;const k=UI.phase==='aim:def'?'def':'atk';UI.aimOrg=null;UI.phase=null;
  const I=orgAim(n,ref,k,x,z);if(I){if(typeof v3Ping==='function')v3Ping(I.x,I.z,'#9fd3ff');if(typeof sndRadio==='function')sndRadio('ack');const m=`${orgRefName(n,ref)}: ${adjDesc(I)}`;toast(m);L(m);if(typeof scnAfterAct==='function')scnAfterAct();}
  orgSelect(ref);};}
/* 추가 선택: 아군을 탭하면 넣고 빼기 */
const orgAdding=()=>(UI.addSel||UI.shift)&&UI.sel&&G.units.includes(UI.sel)&&(!UI.phase||UI.phase==='select');
{const _tap=tap;tap=function(k){if(G&&!G.over&&orgAdding()){const pid=typeof V3!=='undefined'?V3.pickId:null;const u=pid!=null?G.units.find(z=>z.id===pid&&z.nat===G.viewer):null;if(u){orgToggle(u);return;}}return _tap(k);};}
if(typeof rosterPick==='function'){const _rp=rosterPick;rosterPick=function(id){if(G&&orgAdding()){const u=G.units.find(x=>x.id===id&&x.nat===G.viewer);if(u){orgToggle(u);return;}}return _rp(id);};}
/* 부대 목록: 중대 → 소대 → 부대, 마지막에 본부 */
if(typeof renderRoster==='function'){const _rr=renderRoster;let sig0='';renderRoster=function(){const el=$('#roster');if(!el||!G)return _rr();const n=G.viewer;if(!orgOn(n))return _rr();
  const show=canCmd()&&!UI.phase?.match?.(/^(buy|sup)$/);const all=show?G.units.filter(u=>u.nat===n):[];
  const sel=new Set([UI.sel,...(UI.group||[])].filter(Boolean).map(u=>u.id));
  const hp=u=>{const c=typeof casSummary==='function'?casSummary(u):null;return c?(c.ok+c.lw)/Math.max(1,u.ws.length):u.hp/hpMax(u);};
  const O=orgOf(n);const R=UI.org?`${UI.org.k}${UI.org.id||''}`:'';const groups=[];const used=new Set();
  for(const c of O.co){const P=orgCoPqs(n,c);let first=true;for(const p of P){const us=all.filter(u=>u.pq===p.id);if(!us.length)continue;us.forEach(u=>used.add(u.id));groups.push({c:first?c:null,p,us});first=false;}}
  const hq=all.filter(u=>!used.has(u.id));if(hq.length)groups.push({hq:1,us:hq});
  const sig=R+'|'+groups.map(g=>(g.c?'C'+g.c.id:'')+(g.p?'P'+g.p.id:'H')+':'+g.us.map(u=>`${u.id}${sel.has(u.id)?'*':''}${Math.round(hp(u)*8)}${u.path&&u.path.length?'m':''}${u.tgt!=null?'t':''}${u.brk?'b':''}`).join(',')).join(';');
  if(sig===sig0)return;sig0=sig;el.hidden=!all.length;
  const chip=u=>{const f=Math.max(0,Math.min(1,hp(u)));const st=u.brk?'공황':u.path&&u.path.length?'이동':u.tgt!=null?'교전':'';
    return `<button class="rc" data-act="pick:${u.id}" id="rc-${u.id}" aria-pressed="${sel.has(u.id)}"><b>${UT[u.type].n}</b>${st?`<small>${st}</small>`:''}<i style="--f:${f};--c:${f>.6?'#5cd18a':f>.3?'#f0c45a':'#ff6a3d'}"></i></button>`;};
  el.innerHTML=groups.map(g=>{let h='';
    if(g.c)h+=`<button class="rh co" data-act="org:co:${g.c.id}" aria-pressed="${!!(UI.org&&UI.org.k==='co'&&UI.org.id===g.c.id)}">${g.c.name}</button>`;
    if(g.p)h+=`<button class="rh" data-act="org:pq:${g.p.id}" aria-pressed="${!!(UI.org&&UI.org.k==='pq'&&UI.org.id===g.p.id)}" title="${g.p.name}">${g.p.no}소대</button>`;
    else h+=`<button class="rh" data-act="org:hq" aria-pressed="${!!(UI.org&&UI.org.k==='hq')}">본부</button>`;
    return h+g.us.map(chip).join('');}).join('');
  const sid=UI.sel?UI.sel.id:null;if(sid!==rosterSel){rosterSel=sid;const on=$('#rc-'+sid);if(on&&on.scrollIntoView)on.scrollIntoView({block:'nearest',inline:'center'});}};}
/* 작은 지도·3D 지도에 중대·소대 목표 */
function orgMarks(n){if(!orgOn(n))return [];const O=orgOf(n);const M=new Map();
  for(const o of [...O.co,...O.pq]){const I=o.intent;if(!I)continue;const k=`${I.k}${I.x.toFixed(1)},${I.z.toFixed(1)}`;const m=M.get(k)||{I,names:[]};m.names.push(o.sh||o.name);M.set(k,m);}
  return [...M.values()];}
{const _mo=mmOverlay;mmOverlay=function(g){_mo(g);if(!G||typeof mmTo!=='function')return;
  for(const m of orgMarks(G.viewer)){const [x,y]=mmTo(m.I.x,m.I.z);g.strokeStyle='#9fd3ff';g.lineWidth=1.6;g.beginPath();g.arc(x,y,5,0,6.283);g.stroke();
    if(m.I.k==='def'){g.fillStyle='rgba(159,211,255,.25)';g.fill();}g.fillStyle='#9fd3ff';g.font='bold 9px sans-serif';g.fillText(m.names.join(' ').replace(/중대/g,''),x+7,y-5);}};}
if(typeof occLabels==='function'){const _ol=occLabels;occLabels=function(want,vs,vn){_ol.apply(this,arguments);if(!G)return;let i=0;
  for(const m of orgMarks(vn)){const y=(typeof v3TopAt==='function'?v3TopAt(m.I.x,m.I.z):0)+.7;want.set('org-int-'+(i++),{html:`<span>${m.names.join('·')} · ${ADJ_K[m.I.k]}</span>`,cls:'v3c',col:'#9fd3ff',p:[m.I.x,y,m.I.z]});}};}
if(typeof v3UnitTag==='function'){const _ut=v3UnitTag;v3UnitTag=function(u){const h=_ut(u);if(!G||u.nat!==G.viewer||u.pq==null||!(u===UI.sel||(UI.group||[]).includes(u)))return h;const p=orgPq(u.nat,u.pq);return p?h+`<u class="pq">${p.sh}</u>`:h;};}
{const _ui=uInfo;uInfo=function(u){let s=_ui(u);if(G&&u.nat===G.viewer&&!isAI(u.nat)){const p=orgPq(u.nat,u.pq);if(p)s+=` · ${p.name}`;}return s;};}
