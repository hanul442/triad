/* ===================== POLISH UI: 하단 바를 바뀔 때만 다시 그리기 =====================
   하단 바는 0.25초마다 새로 그려져서, 누르는 순간 버튼이 바뀌면 클릭이 빠졌다.
   새로 그린 내용이 그 전과 같으면 원래 버튼(DOM)을 그대로 되돌려 놓고, 누르고 있는 동안(0.4초)은 다시 그리지 않는다. */
if(typeof document!=='undefined'){
  let abDown=0;
  document.addEventListener('pointerdown',e=>{if(e.target&&e.target.closest&&e.target.closest('#actbar'))abDown=Date.now();},true);
  const _ra=renderActbar;renderActbar=function(){const el=$('#actbar');if(!el)return _ra.apply(this,arguments);
    if(Date.now()-abDown<400&&el.childNodes.length)return;
    const old=[...el.childNodes],oh=el.innerHTML,hid=el.hidden;const r=_ra.apply(this,arguments);
    if(el.innerHTML===oh&&old.length){el.replaceChildren(...old);el.hidden=hid;}
    return r;};}
