/* ===================== VETERANS: 분대 경험치·계급·이름 붙은 베테랑·고참 명부 =====================
   - 분대는 싸우면서 경험치(u.xp)를 얻는다: 적을 쓰러뜨리거나(전사 8, 중상 5, 경상 2), 차량·드론·분대를 끝내거나,
     거점을 잡거나, 총알 속에서 버티거나(제압된 채 살아 있는 시간), 전투가 끝날 때 살아 있으면.
   - 계급(u.rank 0~3): 신병 → 숙련 → 노련 → 정예. 계급마다 화력 +10%(rawDmg), 사격 간격 −5%, 제압이 더 빨리 풀리고,
     사기 상한·회복이 오른다(morTick이 rank를 본다).
   - 병사 한 명이 적을 셋 이상 쓰러뜨리면 이름이 붙은 베테랑이 된다(u.vn[i], 개인 전과 u.vk[i]). 분대가 노련이 되면 분대장도 이름을 얻는다.
     싸울 수 있는 베테랑이 있는 분대는 사상자가 나도 사기가 덜 꺾인다. 베테랑이 전사하면 분대 사기가 크게 떨어진다.
   - 고참 명부(localStorage): 사람이 지휘한 일반 작전이 끝나면 살아남은 숙련 이상 분대가 명부에 오르고, 다음 작전 시작 때
     같은 병종 부대에 다시 배치된다. 잃은 병사만큼 신병이 채워져 경험치는 조금 묽어진다. 전사한 베테랑은 추모 명단에 남는다. */
const VET={ranks:[{n:'신병',xp:0},{n:'숙련',xp:25},{n:'노련',xp:65},{n:'정예',xp:130}],
  xp:{kia:8,hw:5,lw:2,veh:30,air:12,inf:10,cap:15,end:10,fire:.25},named:3,cdK:.05,suppK:.25,keep:.35,maxRoster:8,
  key:'triad-vets',onKey:'triad-vets-on'};
const VET_TITLES=[[10,'중사'],[6,'하사'],[3,'병장']];
const VET_SUR='김이박최정강조윤장임한오서신권황안송류전홍고문양손배백허남심노하곽성차주우구민진나지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용예경봉사부황보'.split('');
const VET_GIV=['민준','서준','도윤','예준','시우','하준','주원','지호','지후','준우','현우','건우','우진','선우','서진','민재','현준','연우','유준','정우','승우','승현','시윤','준혁','은우','지환','승민','지우','유찬','윤우','민성','준서','하율','태윤','재윤','동현','성민','태민','지훈','상우','다은','서연','지민','수아','하은','예린','채원','소율','유나','가은'];
const rankOf=xp=>{let r=0;for(let i=0;i<VET.ranks.length;i++)if((xp||0)>=VET.ranks[i].xp)r=i;return r;};
const rankName=u=>VET.ranks[u.rank||0].n;
const vetTitleOf=(i,k,r)=>i===0&&r>=2&&k<6?'하사':vetTitle(k);   // 노련 분대의 분대장은 하사 이상
const vetTitle=k=>{for(const [n,t] of VET_TITLES)if(k>=n)return t;return '일병';};
function vetName(){const used=new Set();for(const u of G.units||[])for(const s of u.vn||[])if(s)used.add(s);
  for(let i=0;i<30;i++){const s=VET_SUR[Math.floor(Math.random()*VET_SUR.length)]+VET_GIV[Math.floor(Math.random()*VET_GIV.length)];if(!used.has(s))return s;}
  return VET_SUR[0]+VET_GIV[Math.floor(Math.random()*VET_GIV.length)];}
const vetMenN=u=>u.ws?u.ws.length:UT[u.type].cls==='inf'&&typeof menOf==='function'?menOf(u).length||1:1;
function vetArr(u){const n=vetMenN(u);if(!u.vn||u.vn.length!==n){const o=u.vn||[],k=u.vk||[];u.vn=Array.from({length:n},(_,i)=>o[i]||null);u.vk=Array.from({length:n},(_,i)=>k[i]||0);}return u;}
const vetAble=(u,i)=>!u.ws||(u.ws[i]&&(u.ws[i].s==='ok'||u.ws[i].s==='lw')&&!u.ws[i].y);
/* 이름 붙은 베테랑 [{i,name,k,title,able}] */
function vetMen(u){if(!u.vn)return [];const o=[];u.vn.forEach((s,i)=>{if(s)o.push({i,name:s,k:u.vk[i]||0,title:vetTitleOf(i,u.vk[i]||0,u.rank||0),able:vetAble(u,i),kia:!!(u.ws&&u.ws[i]&&u.ws[i].s==='kia')});});return o;}
const vetLabel=v=>`${v.title} ${v.name}`;
/* 경험치를 주고 계급이 오르면 알린다 */
function giveXp(u,amt){if(!u||!(amt>0)||!G.units.includes(u))return;const was=u.rank||0;u.xp=Math.round(((u.xp||0)+amt)*100)/100;const r=rankOf(u.xp);
  if(r>was){u.rank=r;L(`${natName(u.nat)} ${UT[u.type].n} ${VET.ranks[r].n}(으)로 진급`);
    if(r>=2){vetArr(u);if(!u.vn[0]&&vetAble(u,0)){u.vn[0]=vetName();L(`${natName(u.nat)} ${UT[u.type].n} 분대장 ${u.vn[0]}, 베테랑으로 이름을 올림`);}}}
  else u.rank=Math.max(was,r);}
/* 쏜 사람 중 하나에게 개인 전과를 준다 */
function creditMan(by){if(!by||!G.units.includes(by))return;vetArr(by);const n=by.vn.length;
  let pool=(by._sh||[]).filter(i=>i<n&&vetAble(by,i));if(!pool.length)pool=[...Array(n).keys()].filter(i=>vetAble(by,i));if(!pool.length)return;
  const i=pool[Math.floor(Math.random()*pool.length)];by.vk[i]=(by.vk[i]||0)+1;
  if(!by.vn[i]&&by.vk[i]>=VET.named){by.vn[i]=vetName();L(`${natName(by.nat)} ${UT[by.type].n} ${by.vn[i]}, 적 ${by.vk[i]}명을 쓰러뜨려 베테랑이 됨`);}}
/* 베테랑이 전사했나(총에 맞아서든 피를 흘려서든) */
function vetWatch(u){if(!u.vn||!u.ws)return;for(let i=0;i<u.vn.length;i++){if(!u.vn[i]||!u.ws[i]||u.ws[i].s!=='kia')continue;u.vf=u.vf||[];if(u.vf.includes(i))continue;u.vf.push(i);vetFall(u,i);u.mor=Math.max(0,(u.mor??0)-10);}}
function vetFall(u,i){const v=vetMen(u).find(x=>x.i===i);if(!v)return;G.vetFallen=G.vetFallen||[];G.vetFallen.push({nat:u.nat,name:v.name,title:v.title,k:v.k,type:u.type,rid:u.rid||null});
  L(`${natName(u.nat)} 베테랑 ${vetLabel(v)} 전사`);}

/* ---------- 기존 규칙에 걸기 ---------- */
if(typeof woundMan==='function'){const _wm=woundMan;woundMan=function(u,m,kind,cov,by){vetArr(u);const m0=u.mor??80;const out=_wm(u,m,kind,cov,by);
    if(out==='stop')return out;
    const lost=m0-(u.mor??80);if(lost>0&&vetMen(u).some(v=>v.able&&v.i!==m.i))u.mor=Math.min(100,(u.mor??0)+lost*VET.keep);   // 베테랑이 버티면 덜 흔들린다
    if(by&&by.nat!==u.nat&&G.units.includes(by)){giveXp(by,VET.xp[out]||0);if(out==='kia'||out==='hw')creditMan(by);}
    return out;};}
{const _k=kill;kill=function(u,by){const r0=by?by.rank||0:0;const cls=UT[u.type].cls;
    if(u.rid){G.vetLost=G.vetLost||[];G.vetLost.push(u.rid);}
    _k(u,by);
    if(by){by.rank=r0;if(by.nat!==u.nat)giveXp(by,VET.xp[cls]||0);if(cls!=='inf')creditMan(by);}};}   // kill()의 옛 전과식 계급을 경험치 계급으로 되돌린다
{const _am=afterMove;afterMove=function(u){const x=cell(u.r,u.c);const was=x.obj!=null?x.owner:undefined;_am(u);if(was!==undefined&&G.units.includes(u)&&cell(u.r,u.c).owner===u.nat&&was!==u.nat)giveXp(u,VET.xp.cap);};}
{const _t=rtTick;rtTick=function(dt){const over0=!!(G&&G.over);_t(dt);if(!G||!G.units)return;
    for(const u of G.units){const r=u.rank||0;vetWatch(u);if((u.supp||0)>.3&&!UT[u.type].fly)giveXp(u,VET.xp.fire*dt);
      if(r){u.cd=(u.cd||0)-dt*VET.cdK*r;if(u.supp>0)u.supp=Math.max(0,u.supp-dt/3*VET.suppK*r);}}
    if(!over0&&G.over)vetEnd();};}

/* ---------- 고참 명부 ---------- */
const vetStore={get(){try{if(typeof localStorage==='undefined')return [];const a=JSON.parse(localStorage.getItem(VET.key)||'{}');return Array.isArray(a.roster)?a:{roster:[],fallen:[]};}catch(e){return {roster:[],fallen:[]};}},
  set(o){try{if(typeof localStorage!=='undefined')localStorage.setItem(VET.key,JSON.stringify(o));}catch(e){}},
  on(){try{return typeof localStorage==='undefined'||localStorage.getItem(VET.onKey)!=='0';}catch(e){return true;}},
  setOn(v){try{localStorage.setItem(VET.onKey,v?'1':'0');}catch(e){}}};
function vetRoster(){const s=vetStore.get();return {roster:s.roster||[],fallen:s.fallen||[]};}
/* 새 작전: 명부의 분대를 같은 병종 시작 부대에 입힌다 */
function vetDeploy(n){const S=vetRoster();const used=new Set();let k=0;
  for(const e of S.roster){const u=G.units.find(x=>x.nat===n&&x.type===e.type&&!x.rid&&!used.has(x));if(!u)continue;used.add(u);
    u.rid=e.id;u.xp=e.xp;u.rank=rankOf(e.xp);u.mor=80+u.rank*5;u.vn=null;vetArr(u);
    (e.men||[]).forEach(m=>{if(m.i<u.vn.length){u.vn[m.i]=m.n;u.vk[m.i]=m.k||0;}});k++;}
  G.vetIn=k;if(k)L(`고참 분대 ${k}개가 다시 합류`);}
{const _ng=newGame;newGame=function(cfg){const g=_ng(cfg);if(typeof document!=='undefined'&&!G.scn&&!G.boot&&vetStore.on()){const h=G.order.find(i=>G.nats[i].ctrl==='human');if(h!=null)vetDeploy(h);}return g;};}
/* 작전 끝: 살아남은 숙련 이상 분대를 명부에 올린다(사람이 지휘한 일반 작전만) */
function vetEnd(){if(G._vetDone)return;G._vetDone=1;const n=G.viewer;const human=G.nats[n]&&G.nats[n].ctrl==='human';
  for(const u of G.units)if(!UT[u.type].fly)giveXp(u,VET.xp.end);
  G.vetOut=[];if(!human||G.scn)return;
  const S=vetRoster();const mine=G.units.filter(u=>u.nat===n&&!UT[u.type].fly&&(u.rank||0)>=1);
  const deployed=new Set(G.units.filter(u=>u.rid).map(u=>u.rid).concat(G.vetLost||[]));
  const keep=S.roster.filter(e=>!deployed.has(e.id));
  const out=mine.map(u=>{vetArr(u);const tot=u.vn.length;const ok=u.ws?u.ws.filter(w=>w.s==='ok'||w.s==='lw').length:tot;
    const men=vetMen(u).filter(v=>!v.kia).map(v=>({i:v.i,n:v.name,k:v.k}));
    const xp=Math.round(u.xp*(.6+.4*ok/Math.max(1,tot)));   // 빈자리는 신병이 메운다
    return {id:u.rid||('v'+Date.now().toString(36)+u.id),type:u.type,xp,men,ops:((S.roster.find(e=>e.id===u.rid)||{}).ops||0)+1};});
  G.vetOut=out;
  const fallen=(G.vetFallen||[]).filter(f=>f.nat===n).map(f=>({n:f.name,t:f.title,k:f.k,type:f.type,d:new Date().toISOString().slice(0,10)}));
  vetStore.set({roster:out.concat(keep).sort((a,b)=>b.xp-a.xp).slice(0,VET.maxRoster),fallen:fallen.concat(S.fallen).slice(0,20)});}

/* ---------- 화면 ---------- */
function vetInfo(u){if(!u.xp&&!u.rank)return '';const v=vetMen(u).filter(x=>!x.kia);const nx=VET.ranks[(u.rank||0)+1];
  return ` · ${rankName(u)} (경험 ${Math.floor(u.xp||0)}${nx?`/${nx.xp}`:''})${v.length?' · 베테랑 '+v.map(x=>vetLabel(x)+(x.able?'':'(부상)')).join(', '):''}`;}
function v3RankTag(u){const r=u.rank||0;const star=vetMen(u).some(v=>v.able);if(!r&&!star)return '';
  const ch=Array.from({length:r},(_,i)=>`<path d="M1 ${3+i*3}l4-2.4 4 2.4" />`).join('');
  return `<b class="rk" title="${rankName(u)}${star?' · 베테랑 있음':''}">${r?`<svg viewBox="0 0 10 ${3+r*3}" width="9" height="${2+r*3}" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6">${ch}</g></svg>`:''}${star?'<svg viewBox="0 0 10 10" width="8" height="8" aria-hidden="true"><path d="M5 .6l1.3 3 3.2.3-2.4 2.1.7 3.2L5 7.6 2.2 9.2l.7-3.2L.5 3.9l3.2-.3z" fill="currentColor"/></svg>':''}</b>`;}
const vetRow=(type,rank,xp,men,extra)=>`<tr><td style="text-align:left">${UT[type]?UT[type].n:type}</td><td>${VET.ranks[rank].n}</td><td>${Math.floor(xp)}</td><td style="text-align:left;white-space:normal">${men.length?men.join(', '):'-'}</td>${extra!=null?`<td>${extra}</td>`:''}</tr>`;
function vetPanel(){const n=G.viewer;const mine=G.units.filter(u=>u.nat===n&&((u.xp||0)>=1||vetMen(u).length)).sort((a,b)=>(b.xp||0)-(a.xp||0));let h='';
  if(mine.length)h+=`<h3>우리 분대 경험 <span class="stats">숙련 ${VET.ranks[1].xp} · 노련 ${VET.ranks[2].xp} · 정예 ${VET.ranks[3].xp}</span></h3><div class="tbl"><table><tr><th>부대</th><th>계급</th><th>경험</th><th>베테랑(개인 전과)</th></tr>`+
    mine.slice(0,10).map(u=>vetRow(u.type,u.rank||0,u.xp||0,vetMen(u).filter(v=>!v.kia).map(v=>`${vetLabel(v)} ${v.k}${v.able?'':' (부상)'}`))).join('')+`</table></div>`;
  const fl=(G.vetFallen||[]).filter(f=>f.nat===n);if(fl.length)h+=`<h3>전사한 베테랑</h3><p>${fl.map(f=>`${f.title} ${f.name} (${UT[f.type].n}, 전과 ${f.k})`).join(' · ')}</p>`;
  if(G.over&&G.vetOut)h+=G.vetOut.length?`<p>살아남은 ${G.vetOut.length}개 분대가 고참 명부에 올랐습니다. 다음 작전에서 같은 병종으로 다시 합류합니다.</p>`:(G.nats[n].ctrl==='human'&&!G.scn?'<p>이번 작전에서 명부에 오른 분대는 없습니다. 숙련 이상으로 살아남으면 다음 작전에 데려갑니다.</p>':'');
  return h;}
function vetSetupHtml(){const S=vetRoster();const on=vetStore.on();
  if(!S.roster.length&&!S.fallen.length)return `<p class="vet-empty">고참 명부가 비어 있습니다. 작전에서 숙련 이상으로 살아남은 분대가 여기에 올라 다음 작전에 함께합니다.</p>`;
  let h=`<label class="vet-on"><input type="checkbox" id="vet-on" ${on?'checked':''}> 고참 분대 데려가기 <small>일반 작전에서 같은 병종 시작 부대에 배치</small></label>`;
  if(S.roster.length)h+=`<div class="tbl"><table><tr><th>부대</th><th>계급</th><th>경험</th><th>베테랑</th><th>작전</th></tr>`+S.roster.map(e=>vetRow(e.type,rankOf(e.xp),e.xp,(e.men||[]).map(m=>`${vetTitleOf(m.i,m.k,rankOf(e.xp))} ${m.n}`),e.ops||1)).join('')+`</table></div>`;
  if(S.fallen.length)h+=`<p class="vet-fallen"><b>추모</b> ${S.fallen.slice(0,8).map(f=>`${f.t} ${f.n}`).join(' · ')}</p>`;
  return h;}
if(typeof showSetup==='function'){const _ss=showSetup;showSetup=function(){_ss();const sl=$('#setup-err');if(!sl)return;let b=$('#vet-box');
    if(!b){b=document.createElement('div');b.id='vet-box';b.className='vet-box';sl.insertAdjacentElement('beforebegin',b);
      b.addEventListener('change',e=>{if(e.target&&e.target.id==='vet-on')vetStore.setOn(e.target.checked);});}
    b.innerHTML=`<h3 class="sec">고참 명부</h3>`+vetSetupHtml();};}
if(typeof renderPanel==='function'){const _rp=renderPanel;renderPanel=function(){_rp();const p=typeof document!=='undefined'&&$('#panel');if(!p||!UI.sheet||UI.tab!=='world')return;const h=vetPanel();if(h)p.insertAdjacentHTML('beforeend',h);};}
