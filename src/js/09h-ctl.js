/* ===================== 조작 다듬기 (2026-11-12 "조작법도 개선해주고") =====================
   - 지도 버튼에 마우스를 올리면 무슨 버튼인지(단축키 포함) 뜬다. 전에는 그림만 있고 설명이 없었다.
   - 하단 명령 버튼 단축키(PC): X 정지 · Z 고수 · T 돌입 · U 탑승/하차 · B 증원·지원 · G 목표. 버튼에 작은 글자로 표시한다.
   - Tab / Shift+Tab: 아군 부대를 하나씩 넘기며 고르고 카메라가 따라간다(쉬는 부대 먼저).
   - ? 키 또는 지도 버튼 [?]: 조작 안내판. PC와 휴대폰에 맞는 조작을 보여 준다.
   - 작은 지도 오른쪽 클릭(PC): 고른 부대를 그곳으로 보낸다(중대·소대를 골랐으면 그곳이 목표).
   - 하단 바 '탭: 이동 · 적 탭: 공격' 같은 사용법 문구는 명령을 몇 번 내리고 나면 숨겨 부대 상태가 잘리지 않게 한다.
   - 휴대폰: 알림(토스트)이 한 줄에서 잘리지 않고 두 줄까지 보인다. 하단 바 [목표] 안내 문구를 짧게('목표 없음'). */
const CTL_KEYS=[['ab-stop','X'],['ab-hold','Z'],['ab-clear','T'],['ab-dis-board','U'],['ab-dis-stay','U'],['ab-dis-unload','U'],['ab-dis','U'],['ab-reinf','B'],['ab-goal','G'],['ab-adj-atk','G']];
const CTL_HINT_N=6;// 이만큼 명령을 내리면 사용법 문구를 숨긴다
const ctlFine=()=>typeof window!=='undefined'&&!!(window.matchMedia&&window.matchMedia('(hover:hover) and (pointer:fine)').matches);
function ctlStore(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v);}catch(e){}return null;}
function ctlOrdN(){return +(ctlStore('triad-ordn')||0)||0;}
/* 명령 표시(고리)가 뜰 때마다 = 사람이 명령을 내렸을 때 */
if(typeof v3Ping==='function'){const _p=v3Ping;v3Ping=function(){try{const n=ctlOrdN();if(n<99)ctlStore('triad-ordn',String(n+1));}catch(e){}return _p.apply(this,arguments);};}
/* 하단 바 손질 */
const CTL_TIPS=[' · 탭: 이동 · 적 탭: 공격',' · 직접 명령하면 이 부대만 직접 지휘'];
function ctlActbar(el){if(!el)return;
  // 사용법 문구는 익숙해지면 숨긴다
  if(ctlOrdN()>=CTL_HINT_N){const sp=el.querySelector(':scope>span');if(sp){let h=sp.innerHTML;const o=h;for(const t of CTL_TIPS)h=h.split(t).join('');h=h.replace(/^탭: 이동 · 적 탭: 공격$/,'');if(h!==o)sp.innerHTML=h;}}
  // 휴대폰: [목표] 안내를 짧게
  if(typeof phOn==='function'&&phOn()){const i=el.querySelector('.adj-row .adj-i');if(i&&i.textContent==='[목표]를 누르고 지도를 탭하면 전 부대가 그곳을 칩니다'){i.textContent='목표 없음';i.title='[목표]를 누르고 지도를 탭하면 전 부대가 그곳을 칩니다';}}
  // 단축키 표시
  const fine=ctlFine();
  for(const [id,k] of CTL_KEYS){const b=el.querySelector('#'+id);if(!b||b.dataset.key)continue;b.dataset.key=k;b.setAttribute('aria-keyshortcuts',k);
    const t=b.getAttribute('title');b.title=(t?t+' · ':(b.textContent.trim()+' · '))+'단축키 '+k;
    if(fine){const kb=document.createElement('kbd');kb.className='kk';kb.textContent=k;kb.setAttribute('aria-hidden','true');b.appendChild(kb);}}}
if(typeof renderActbar==='function'){const _ra=renderActbar;renderActbar=function(){const r=_ra.apply(this,arguments);try{if(typeof document!=='undefined'&&G)ctlActbar($('#actbar'));}catch(e){}return r;};}
/* 단축키로 버튼 누르기 */
function ctlCan(){return typeof pcCan==='function'&&pcCan()&&!(typeof PR!=='undefined'&&PR.on)&&!(typeof UI!=='undefined'&&UI.sheet);}
function ctlPress(k){const el=typeof document!=='undefined'&&$('#actbar');if(!el)return false;
  for(const [id,kk] of CTL_KEYS){if(kk!==k)continue;const b=el.querySelector('#'+id);if(b&&!b.disabled&&b.offsetParent!==null){b.click();return true;}}
  if(k==='B'){const b=el.querySelector('#ab-reinf');if(!b){UI.sheet=true;UI.tab='cmd';render();return true;}}
  return false;}
/* Tab: 다음 부대 */
function ctlNext(dir){if(!G)return;const n=G.viewer;const us=G.units.filter(u=>u.nat===n).sort((a,b)=>a.id-b.id);if(!us.length)return;
  const idle=u=>!(u.path&&u.path.length)&&u.tgt==null;
  // 쉬는 부대가 있으면 쉬는 부대만 돈다
  const pool=us.filter(idle).length?us.filter(idle):us;
  const cur=UI.sel&&G.units.includes(UI.sel)?UI.sel:null;let i=cur?pool.indexOf(cur):-1;
  if(i<0){i=dir>0?pool.findIndex(u=>!cur||u.id>cur.id):-1;if(i<0)i=dir>0?0:pool.length-1;}else i=(i+dir+pool.length)%pool.length;
  const u=pool[i];clearSel();select(u);if(typeof V3!=='undefined'&&V3.cs){V3.cs.gx=u.x;V3.cs.gz=u.z;}
  toast(`${UT[u.type].n}${idle(u)?' · 대기 중':''} (${i+1}/${pool.length}${pool.length<us.length?' 쉬는 부대':''})`);render();}
/* 작은 지도 오른쪽 클릭: 그곳으로 */
function ctlMmOrder(x,z){if(!G||!(typeof pcCan==='function'&&pcCan()))return false;
  if(typeof orgCan==='function'&&typeof orgAimable==='function'&&orgCan()&&orgAimable()){orgAimAt(x,z);return true;}
  const g=typeof pcGrp==='function'?pcGrp():[];if(!g.length){toast('먼저 부대를 고르세요');return false;}
  const r=Math.max(0,Math.min(N-1,Math.floor(z))),c=Math.max(0,Math.min(N-1,Math.floor(x)));
  if(typeof V3!=='undefined'){V3.pickPt=[x,z];V3.pickId=null;}
  const ph=UI.phase;if(ph&&ph!=='select')UI.phase='select';const add=UI.addSel;UI.addSel=false;UI.shift=false;
  try{tap(key(r,c));}finally{UI.addSel=add;}return true;}
/* 조작 안내판 */
function ctlHelpHtml(){const ph=typeof phOn==='function'&&phOn()&&!ctlFine();
  const row=(k,v)=>`<tr><th>${k}</th><td>${v}</td></tr>`;
  const pc=`<h4>마우스</h4><table>${row('왼쪽 클릭','아군 고르기 · 고른 채 땅 클릭 = 이동 · 적 클릭 = 공격')}${row('왼쪽 끌기','화면 이동')}${row('Shift+끌기','범위 안 아군 고르기 (Shift+클릭은 더하기·빼기)')}${row('오른쪽 클릭','고른 부대 이동·공격 · 배치·지원 고르기 취소')}${row('오른쪽 끌기','회전·기울기')}${row('휠','확대·축소')}${row('아군 더블클릭','그 소대 전체')}${row('작은 지도','왼쪽 = 카메라 이동 · 오른쪽 = 고른 부대를 그곳으로')}</table>`+
    `<h4>키보드</h4><table>${row('X · Z · T · U','정지 · 고수 · 돌입 · 탑승/하차')}${row('G · B','목표 · 증원·지원')}${row('Tab / Shift+Tab','다음·이전 부대 (쉬는 부대 먼저)')}${row('Ctrl+숫자 · 숫자','부대 번호 붙이기 · 부르기 (두 번 = 카메라)')}${row('Ctrl+A · H','전체 고르기 · 집결지로')}${row('WASD · 화살표 · Q/E · R/F','화면 이동 · 회전 · 기울기')}${row('Space · Esc','일시정지 · 선택 해제')}${row('C · V · K · M · L · P','낮은 시점 · 기자 카메라 · 작은 지도 · 소리 · 저사양 · 화면 질감')}${row('?','이 안내')}</table>`;
  const tp=`<h4>손가락</h4><table>${row('탭','아군 고르기 · 고른 채 땅 탭 = 이동 · 적 탭 = 공격')}${row('아래 부대 칩','그 부대 고르기 + 카메라 이동')}${row('같은 부대 두 번 탭','근처 아군 모두 · 소대가 있으면 소대 전체')}${row('한 손가락 끌기','화면 이동')}${row('두 손가락','확대·회전 · 같이 위아래로 = 기울기')}${row('두 손가락 탭','선택 해제')}${row('길게 눌러 끌기 · [□] 버튼','범위 안 아군 고르기')}${row('길게 누르기','그 지점 정보')}${row('작은 지도 탭','카메라 이동 (목표 고르는 중엔 목표)')}</table>`;
  return `<div class="kh-h"><b>조작 안내</b><button class="ib" data-act="keys" id="kh-x" aria-label="닫기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div><div class="kh-b">${ph?tp:pc+tp}<p>제일 쉬운 방법: 아래 노란 [목표]를 누르고 지도를 탭하세요. 나머지는 부관이 합니다.</p></div>`;}
function ctlHelp(on){const el=$('#keyhelp');if(!el)return;const o=on==null?el.hidden:on;if(o)el.innerHTML=ctlHelpHtml();el.hidden=!o;const b=$('#b-keys');if(b)b.setAttribute('aria-pressed',String(o));if(o){const x=$('#kh-x');if(x)x.focus();}}
/* 지도 버튼 설명 + [?] 버튼 */
const CTL_TT={'b-rot':'시점 회전 (Q/E · 오른쪽 끌기)','z-in':'확대 (휠)','z-out':'축소 (휠)','b-home':'집결지로 이동 (H)','b-grid':'격자 표시','b-fs':'전체화면','b-box':'범위 선택: 누른 뒤 끌기 (PC는 Shift+끌기)'};
function ctlTitles(){const m=$('#mapctl');if(!m)return;
  if(!$('#b-keys')){const b=document.createElement('button');b.className='ib x';b.id='b-keys';b.dataset.act='keys';b.setAttribute('aria-label','조작 안내 (?)');b.setAttribute('aria-pressed','false');b.setAttribute('aria-keyshortcuts','?');b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 9a3 3 0 1 1 4 2.8c-.7.3-1 .9-1 1.6V15"/><circle cx="12" cy="18.5" r=".6"/></svg>';
    const more=$('#b-more');if(more)m.insertBefore(b,more);else m.appendChild(b);}
  for(const b of m.querySelectorAll('button')){const t=CTL_TT[b.id]||b.getAttribute('aria-label');if(t&&!b.title)b.title=t;}
  const a=$('#app');if(a&&!$('#keyhelp')){const d=document.createElement('div');d.id='keyhelp';d.className='keyhelp';d.setAttribute('role','dialog');d.setAttribute('aria-label','조작 안내');d.hidden=true;a.appendChild(d);}}
if(typeof document!=='undefined'){
  if(!document.getElementById('ctl-css')){const st=document.createElement('style');st.id='ctl-css';
    st.textContent=`#actbar .btn .kk{display:inline-block;margin-left:6px;padding:0 4px;min-width:14px;border:1px solid currentColor;border-radius:3px;font:600 10px/14px var(--font-m,monospace);opacity:.55;text-align:center;vertical-align:1px}
.keyhelp{position:absolute;z-index:28;left:50%;top:50%;transform:translate(-50%,-50%);width:min(560px,calc(100vw - 32px));max-height:min(80vh,calc(100vh - 32px));display:flex;flex-direction:column;background:rgba(13,18,24,.97);border:1px solid rgba(255,255,255,.18);border-radius:10px;color:#e8ecef;box-shadow:0 10px 32px rgba(0,0,0,.5)}
.keyhelp[hidden]{display:none}
.keyhelp .kh-h{display:flex;align-items:center;justify-content:space-between;padding:8px 8px 8px 16px;border-bottom:1px solid rgba(255,255,255,.1)}
.keyhelp .kh-h b{font-size:15px}
.keyhelp .kh-b{overflow:auto;padding:4px 16px 14px;overscroll-behavior:contain}
.keyhelp h4{margin:12px 0 4px;font-size:12px;font-weight:600;color:#ffd27a}
.keyhelp table{width:100%;border-collapse:collapse;font-size:12.5px;line-height:1.45;border:0;table-layout:fixed}
.keyhelp th{width:38%;padding:4px 10px 4px 0;text-align:left;white-space:normal;border:0;background:none;font:600 12px/1.45 var(--font-m,monospace);color:#cfd6dc;vertical-align:top}
.keyhelp td{padding:4px 0;color:#e8ecef;text-align:left;white-space:normal;border:0;border-top:1px solid rgba(255,255,255,.06);background:none;font:inherit}
.keyhelp tr:first-child td{border-top:0}
.keyhelp th{border-top:1px solid rgba(255,255,255,.06)}.keyhelp tr:first-child th{border-top:0}
.keyhelp p{margin:12px 0 0;font-size:12px;color:#aab4bd;line-height:1.5}
@media (max-width:760px){.toast{white-space:normal;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.4;text-align:center;width:max-content}
  .toast[hidden]{display:none}
  .keyhelp th{width:42%}}`;
    document.head.appendChild(st);}
  const init=()=>ctlTitles();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  document.addEventListener('click',e=>{const b=e.target.closest('[data-act="keys"]');if(!b)return;ctlHelp(b.id==='kh-x'?false:null);});
  window.addEventListener('keydown',e=>{if(e.target&&e.target.closest&&e.target.closest('input,select,textarea'))return;
    const kh=$('#keyhelp');
    if(kh&&!kh.hidden&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();ctlHelp(false);const b=$('#b-keys');if(b)b.focus();return;}
    if(e.key==='?'||e.key==='F1'){if(!G||!$('#setup')||!$('#setup').hidden)return;e.preventDefault();e.stopImmediatePropagation();ctlHelp(null);return;}
    if(e.ctrlKey||e.metaKey||e.altKey||!ctlCan())return;
    if(e.key==='Tab'){const ae=document.activeElement;if(ae&&ae!==document.body&&ae.tagName!=='CANVAS')return;e.preventDefault();e.stopPropagation();ctlNext(e.shiftKey?-1:1);return;}
    if(e.shiftKey)return;const k=(e.key||'').toUpperCase();
    if('XZTUBG'.includes(k)&&k.length===1&&ctlPress(k)){e.preventDefault();e.stopPropagation();}},true);
  // 작은 지도 오른쪽 클릭 (문서 캡처 단계에서 작은 지도의 카메라 이동보다 먼저)
  document.addEventListener('pointerdown',e=>{if(e.button!==2||typeof MM==='undefined'||!MM.cv||e.target!==MM.cv)return;e.preventDefault();e.stopImmediatePropagation();
    const r=MM.cv.getBoundingClientRect();if(typeof mmFrom==='function'){const p=mmFrom(e.clientX-r.left,e.clientY-r.top);if(p&&ctlMmOrder(p[0],p[1]))render();}},true);
  document.addEventListener('contextmenu',e=>{if(typeof MM!=='undefined'&&MM.cv&&e.target===MM.cv)e.preventDefault();},true);}
