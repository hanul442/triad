/* ===================== MISSION UI: 임무형 지휘 화면 (06d-mission) =====================
   부대(또는 두 번 탭해 묶은 부대들)를 고르고 [임무] → 공격·방어·정찰·지원 사격 중 하나 → 지도에서 지점을 탭.
   [자율] 버튼으로 위임/반자동을 바꾼다. 소대의 승인 요청(돌격·후퇴·포격)은 하단 바 위에 승인/보류 버튼으로 뜬다.
   CSS는 body.html·style.css를 건드리지 않으려고 여기서 넣는다. */
if(typeof document!=='undefined'&&!document.getElementById('msn-css')){const st=document.createElement('style');st.id='msn-css';
  st.textContent='.msn-req{display:flex;flex-wrap:wrap;gap:6px;align-items:center;width:100%;padding:4px 0 6px;border-bottom:1px solid rgba(255,255,255,.12);margin-bottom:6px;font-size:13px}.msn-req b{color:#ffd27a}.msn-req .btn{min-height:32px}';
  document.head.appendChild(st);}
const msnGrp=()=>{const s=UI.sel&&G.units.includes(UI.sel)?UI.sel:null;return [s,...(UI.group||[])].filter(x=>x&&G.units.includes(x));};
if(typeof fortBar==='function'){const _fb=fortBar;fortBar=function(s){let h=_fb(s);if(!s||s.nat!==G.viewer||isAI(G.viewer))return h;const open=UI.phase==='msnmenu'||UI.phase==='msn';
  h+=`<button class="btn sm${open?' primary':''}" data-act="msn:menu" id="ab-msn" title="부대를 묶어 임무만 주면 이동·엄폐·사격은 알아서 합니다">임무</button>`;
  if(open){for(const k in MSN)h+=`<button class="btn sm${UI.phase==='msn'&&UI.msnK===k?' primary':''}" data-act="msn:${k}" id="ab-msn-${k}">${MSN[k].n}</button>`;
    h+=`<button class="btn sm" data-act="msn:aut" id="ab-msn-aut" title="위임: 측면·돌격·후퇴를 소대가 알아서 / 반자동: 돌격·후퇴 전에 승인 요청">자율: ${MSN_AUT[UI.msnAut||'full']}</button>`;
    if(msnGrp().some(u=>u.pl||u.msn))h+=`<button class="btn sm" data-act="msn:off" id="ab-msn-off">임무 해제</button>`;}
  return h;};}
if(typeof fortTip==='function'){const _ft=fortTip;fortTip=function(){if(UI.phase==='msnmenu')return '줄 임무를 고르세요';if(UI.phase==='msn')return `${MSN[UI.msnK].n} 지점을 탭하세요 · 자율 ${MSN_AUT[UI.msnAut||'full']}`;return _ft();};}
{const _tap=tap;tap=function(k){if(G&&!G.over&&UI.phase==='msn'&&UI.sel&&G.units.includes(UI.sel)){const r=kr(k),c=kc(k),n=G.viewer;
    const pt=(typeof V3!=='undefined'&&V3.pickPt)||[c+.5,r+.5];const grp=msnGrp();
    radioSend(n,grp,'mis',[UI.msnK,pt[0],pt[1],UI.msnAut||'full']);if(typeof v3Ping==='function')v3Ping(pt[0],pt[1],'#ffd27a');if(typeof sndRadio==='function')sndRadio('ack');
    UI.phase='select';render();return;}
  return _tap(k);};}
{const _ui=uInfo;uInfo=function(u){let s=_ui(u);const p=msnOf(u);if(p&&p.human)s+=` · ${p.name} ${MSN[p.mode].n}·${MSN_ST[p.st]||p.st}`;else if(u.msn)s+=` · ${MSN[u.msn.mode].n} 임무(따라감)`;return s;};}
/* 승인 요청 띠 */
{const _ra=renderActbar;renderActbar=function(){_ra();const el=$('#actbar');if(!el||!G||G.over||isAI(G.viewer))return;
  const R=(G.plat||[]).filter(p=>p.nat===G.viewer&&p.human&&p.req&&p.mem.length);if(!R.length)return;
  const div=document.createElement('div');div.className='msn-req';
  div.innerHTML=R.slice(0,2).map(p=>`<b>${p.name}</b> ${MSN_REQ[p.req.k]} 승인 요청 <button class="btn sm primary" data-act="msn:ok:${p.id}" id="ab-msn-ok-${p.id}">승인</button><button class="btn sm" data-act="msn:no:${p.id}" id="ab-msn-no-${p.id}">보류</button>`).join(' ');
  el.prepend(div);};}
if(typeof document!=='undefined')document.addEventListener('click',e=>{const b=e.target.closest('[data-act^="msn:"]');if(!b||b.disabled||!G||G.over||isAI(G.viewer))return;
  const a=b.dataset.act.slice(4);const n=G.viewer;
  if(a.startsWith('ok:')||a.startsWith('no:')){msnAnswer(+a.slice(3),a.startsWith('ok:'));render();return;}
  const grp=msnGrp();if(!grp.length)return;
  if(a==='menu'){UI.phase=UI.phase==='msnmenu'||UI.phase==='msn'?'select':'msnmenu';render();return;}
  if(a==='aut'){UI.msnAut=(UI.msnAut||'full')==='full'?'semi':'full';render();return;}
  if(a==='off'){radioSend(n,grp,'mis',['off']);UI.phase='select';render();return;}
  if(MSN[a]){UI.phase='msn';UI.msnK=a;render();}});
