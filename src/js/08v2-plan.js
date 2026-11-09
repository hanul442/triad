/* ===================== 관전: AI 작전 계획 보이기 =====================
   AI가 무엇을 노리는지 보이게 한다(06i-plan). 관전 중에만:
   - 거점 이름표 옆에 세력 색으로 '주공 · 조공 · 방어 · 역습 · 집결' 표시
   - 하단 바(따라가는 부대가 없을 때)에 세력마다 지금 작전 한 줄 */
function planBadge(n,x){const P=G.plan&&G.plan[n];if(!P)return '';const main=P.main===x.id;
  if(x.k==='def')return '방어';if(x.cnt)return '역습';if(!x.go&&x.asm)return main?'주공(집결 중)':'조공(집결 중)';return main?'주공':'조공';}
function planTagsAt(i){if(!G.plan)return '';const out=[];
  for(const n of G.order){const P=G.plan[n];if(!P||!P.want)continue;const x=P.T.find(q=>q.obj===i&&(P.want.includes(q.id)||q.k==='def'));if(!x)continue;
    out.push(`<b style="color:${mapCol(n)}">${planBadge(n,x)}</b>`);}
  return out.length?` <small class="plan-tag">${out.join(' ')}</small>`:'';}
function planLine(){if(!G||!G.plan)return '';return G.order.map(n=>{const P=G.plan[n];if(!P||!P.T||!P.T.length)return '';
  const xs=P.T.filter(x=>P.want.includes(x.id)||x.k==='def').slice(0,3).map(x=>`${planBadge(n,x)} ${planName(x)}`);return `${NATS[n].name}: ${xs.join(', ')}`;}).filter(Boolean).join(' · ');}
if(typeof objLabel==='function'){const _ol=objLabel;objLabel=function(o){const s=_ol(o);if(typeof specOn!=='function'||!specOn())return s;const i=G.objs.indexOf(o);return i<0?s:s+planTagsAt(i);};}
if(typeof specBar==='function'){const _sb=specBar;specBar=function(){_sb();if(!G||G.over||typeof specFollowed!=='function'||specFollowed())return;
  const ib=typeof document!=='undefined'&&document.querySelector('#actbar #sp-i');if(!ib)return;const l=planLine();if(l&&ib.textContent!==l)ib.textContent=l;};}
