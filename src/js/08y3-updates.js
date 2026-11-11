/* 업데이트 로그: 시작 화면·설명서에서 여는 패치 노트 창.
   글은 src/updates/*.md 에 쓰고, build.mjs가 UPDATES 로 넣어 준다(쓰는 법: src/updates/README.md). */
const UPD_KEY='triad-upd-seen';
function updList(){return typeof UPDATES!=='undefined'&&Array.isArray(UPDATES)?UPDATES:[];}
function updLatest(){const u=updList()[0];return u?u.d+'|'+u.t:'';}
function updEsc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function updDay(d){const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(d);return m?`${+m[1]}년 ${+m[2]}월 ${+m[3]}일`:d;}
/* 제목 끝의 (#126) 같은 PR 번호는 작게 */
function updTitle(t){const m=/^(.*?)\s*\((#[^)]*)\)\s*$/.exec(t);return m?`${updEsc(m[1])} <small>${updEsc(m[2])}</small>`:updEsc(t);}
function updatesHtml(){const L=updList();if(!L.length)return '<p class="upd-none">아직 적힌 업데이트가 없습니다.</p>';
  let h='',day='';
  for(const u of L){
    if(u.d!==day){if(day)h+='</div></section>';day=u.d;h+=`<section class="upd-day"><h3>${updDay(day)}</h3><div class="upd-items">`;}
    h+=`<article class="upd-it"><h4>${updTitle(u.t)}</h4>`+(u.b&&u.b.length?`<ul>${u.b.map(x=>`<li>${updEsc(x)}</li>`).join('')}</ul>`:'')+'</article>';}
  return h+'</div></section>';}
function updSeen(){try{return localStorage.getItem(UPD_KEY)||'';}catch(e){return '';}}
function updMark(){try{localStorage.setItem(UPD_KEY,updLatest());}catch(e){}updBadge();}
function updNew(){return !!updLatest()&&updSeen()!==updLatest();}
function updBadge(){const n=updNew();
  document.querySelectorAll('[data-updbtn="open"]').forEach(b=>{let s=b.querySelector('.upd-new');
    if(n&&!s){s=document.createElement('span');s.className='upd-new';s.textContent='새 소식';b.appendChild(s);}
    else if(!n&&s)s.remove();});}
function updOpen(on){let o=document.getElementById('updates');
  if(!o){o=document.createElement('div');o.className='overlay';o.id='updates';o.hidden=true;o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');o.setAttribute('aria-label','업데이트 로그');
    o.innerHTML=`<div class="card upd-card"><div class="man-top"><h2>업데이트 로그</h2><button class="ib" data-updbtn="close" aria-label="업데이트 로그 닫기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div><p class="upd-intro">무엇이 새로 생기고 고쳐졌는지 날짜별로 적었습니다. 위가 최신입니다.</p><div class="upd-body"></div></div>`;document.body.appendChild(o);}
  if(on){o.querySelector('.upd-body').innerHTML=updatesHtml();o.hidden=false;o.scrollTop=0;updMark();const b=o.querySelector('[data-updbtn="close"]');if(b)b.focus();}
  else{o.hidden=true;const b=document.getElementById('b-updates');if(b&&b.offsetParent)b.focus();}}
/* 창 위에 쌓인 설명서보다 먼저 받으려고 window 캡처로 듣는다 */
/* 설명서 맨 위에도 업데이트 로그로 가는 버튼 */
if(typeof manualHtml==='function'){const _mh=manualHtml;manualHtml=function(){return '<button class="btn sm upd-link" data-updbtn="open">업데이트 로그 · 최근에 바뀐 것'+(updNew()?'<span class="upd-new">새 소식</span>':'')+'</button>'+_mh.apply(this,arguments);};}
if(typeof document!=='undefined'){
  if(!document.getElementById('upd-css')){const st=document.createElement('style');st.id='upd-css';st.textContent=`
#updates{z-index:30}
.upd-card{max-width:640px;padding:16px;gap:10px}
.upd-intro{margin:0;color:var(--muted);font-size:13px}
.upd-body{display:flex;flex-direction:column;gap:16px;font-size:14px;line-height:1.55}
.upd-day h3{margin:0 0 6px;font-size:13px;font-weight:700;color:var(--muted);letter-spacing:.02em;border-bottom:1px solid var(--line);padding-bottom:4px}
.upd-items{display:flex;flex-direction:column;gap:10px}
.upd-it h4{margin:0;font-size:15px;font-weight:700}
.upd-it h4 small{font-weight:400;font-size:12px;color:var(--muted)}
.upd-it ul{margin:4px 0 0;padding-left:18px;color:var(--muted);display:flex;flex-direction:column;gap:2px}
.upd-none{color:var(--muted)}
.upd-new{display:inline-block;margin-left:8px;padding:1px 6px;border-radius:4px;font-size:11px;font-weight:700;background:var(--accent,#4f8cff);color:#0d1218;vertical-align:1px}
.upd-link{align-self:flex-start}
@media (max-width:760px){#updates{align-items:stretch;padding:0}#updates .upd-card{border-radius:0;max-width:none;min-height:100%;padding:12px max(16px,env(safe-area-inset-right,0px)) calc(16px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px))}}`;document.head.appendChild(st);}
  const card=document.querySelector('#setup .card');
  if(card&&!document.getElementById('b-updates')){const b=document.createElement('button');b.className='btn';b.id='b-updates';b.dataset.updbtn='open';b.textContent='업데이트 로그';
    const m=document.getElementById('b-manual'),p=card.querySelector(':scope>p');if(m)m.after(b);else if(p)p.after(b);else card.prepend(b);}
  updBadge();
  window.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-updbtn]');if(!t)return;e.preventDefault();e.stopPropagation();updOpen(t.dataset.updbtn==='open');},true);
  window.addEventListener('keydown',e=>{const o=document.getElementById('updates');if(e.key==='Escape'&&o&&!o.hidden){e.stopImmediatePropagation();updOpen(false);}},true);
}
