/* ===================== SIMPLE: 하단 바 줄이기 =====================
   "조작법 간편화가 필요해". 버튼이 너무 많아서 자주 쓰는 것만 보이고 나머지는 [⋯]에 접는다.
   - 기본 흐름: 아래 편성 칩(전체·1중대·…)을 고르고 지도를 탭하면 그곳이 목표(08p-org). 부대 하나를 고르고 땅을 탭하면 이동.
   - 부대를 골랐을 때 늘 보이는 것: 그 자리에서 바로 쓸 수 있는 것(돌입·하차·옥상·폭약 터뜨리기·보급 버튼·부관에게 돌려주기),
     [소대](그 부대의 소대 고르기), [정지], [✕](선택 해제). 켜져 있는 버튼(고수 등)도 보인다.
     나머지(고수·축성·임무·건물 사격·벽 뚫기·폭약·같은 병종·추가 선택·새 소대/중대로)는 [⋯]를 눌러 편다.
   - 중대·전체를 골랐을 때는 첫 부대의 개별 버튼을 숨기고 중대 줄만 보인다([⋯]로 펼 수 있음).
   - 아무것도 안 골랐을 때 [전체 선택]은 편성 칩(전체)이 대신한다.
   - 무엇을 고르든 메뉴 단계(축성·임무·폭약 자리 고르기 등) 중에는 다 보인다. */
if(typeof document!=='undefined'&&!document.getElementById('simple-css')){const st=document.createElement('style');st.id='simple-css';
  st.textContent=`#actbar .sx-h{display:none!important}
#actbar.sx-org>b,#actbar.sx-org>span{display:none}
@media (max-width:760px){#actbar>span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}}`;
  document.head.appendChild(st);}
const SX_KEEP=/^ab-(clear|dis|floor|adj-free|ug-fire|ug-det|lg-|stop|cancel|org-mypq|msn-ok|msn-no|sx-more)/;
{const _s=select;select=function(u){UI.abMore=false;return _s.apply(this,arguments);};}
{const _c=clearSel;clearSel=function(){UI.abMore=false;return _c.apply(this,arguments);};}
{const _ra=renderActbar;renderActbar=function(){const r=_ra.apply(this,arguments);const el=$('#actbar');if(!el||!G||G.over)return r;
  try{el.classList.remove('sx-org');
    const s=UI.sel&&G.units.includes(UI.sel)?UI.sel:null;const n=G.viewer;
    if(!s){if(typeof orgOn==='function'&&orgOn(n)&&el.querySelector('.org-row')){const a=el.querySelector('#ab-all');if(a)a.remove();}return r;}
    const cancel=el.querySelector('#ab-cancel');if(cancel){cancel.textContent='✕';cancel.title='선택 해제';cancel.setAttribute('aria-label','선택 해제');}
    if(UI.phase&&UI.phase!=='select')return r;                      // 메뉴 단계: 다 보인다
    const org=!!(UI.org&&typeof orgRefUnits==='function'&&orgRefUnits(n,UI.org).length);
    const ab=el.querySelector(':scope>.ab');if(!ab)return r;
    if(org)el.classList.add('sx-org');
    // 선택 줄(같은 병종·소대·중대·추가 선택·새로 묶기)은 접고 [소대]만 아래로 옮긴다
    const row=el.querySelector('.org-row');const selRow=row&&!org?row:null;
    const pq=selRow&&selRow.querySelector('#ab-org-mypq');
    let hidden=0;
    if(!UI.abMore){
      if(selRow){if(pq){pq.textContent='소대';ab.prepend(pq);}if(UI.addSel){const ad=selRow.querySelector('#ab-org-add');if(ad)ab.prepend(ad);}selRow.classList.add('sx-h');hidden++;}
      for(const b of ab.querySelectorAll('button')){if(SX_KEEP.test(b.id||'')&&!(org&&!/^ab-(cancel|msn-)/.test(b.id)))continue;if(b.classList.contains('primary')||b.getAttribute('aria-pressed')==='true')continue;b.classList.add('sx-h');hidden++;}}
    if(hidden||UI.abMore){const m=document.createElement('button');m.className='btn sm';m.dataset.act='sx:more';m.id='ab-sx-more';m.setAttribute('aria-expanded',UI.abMore?'true':'false');
      m.title=UI.abMore?'접기':'고수·축성·임무·같은 병종 고르기·새로 묶기 등';m.textContent=UI.abMore?'접기':'⋯';const c=ab.querySelector('#ab-cancel');if(c)ab.insertBefore(m,c);else ab.append(m);}
  }catch(e){}
  return r;};}
if(typeof document!=='undefined')document.addEventListener('click',e=>{const b=e.target.closest('[data-act="sx:more"]');if(!b||!G)return;UI.abMore=!UI.abMore;render();});
