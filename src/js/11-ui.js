/* ===================== UI: HUD, ACTION BAR, PANELS ===================== */
function renderStatus(){const n=G.cur,N=G.nats[n],inc=income(n);const el=$('#hud-res');
  if(isAI(n)){el.innerHTML=`<i class="dot" style="background:${mapCol(n)}"></i><b>${NATS[n].full}</b><small>${G.busy?'작전 중':'대기'}</small>`;}
  else{const rv=(lbl,v,d)=>`<span class="rv"><b>${v}</b><small><span class="lbl">${lbl} </span>${d!=null?(d>=0?'+':'')+d:''}</small></span>`;
    el.innerHTML=`<i class="dot" style="background:${mapCol(n)}"></i>${rv('자금',N.f,inc[0])}${rv('철강',N.s,inc[1])}${rv('석유',N.o,inc[2])}${rv('병력',armySize(n)+'/'+armyCap(n),null)}`;
    el.title=`${NATS[n].full} · 자금 ${N.f} · 철강 ${N.s} · 석유 ${N.o}`;}
  document.querySelectorAll('.tab').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===UI.tab)));
  const sh=$('#sheet');sh.hidden=!UI.sheet;$('#app').classList.toggle('sheet-open',!!UI.sheet);$('#b-menu').setAttribute('aria-expanded',String(!!UI.sheet));
  $('#b-grid').setAttribute('aria-pressed',String(!!UI.grid));{const b=$('#b-snd');if(b){b.setAttribute('aria-pressed',String(SFX.on));b.style.opacity=SFX.on?1:.45;}}}
function unitCard(u){const t=UT[u.type];const S=supplySources(u.nat);const x=cell(u.r,u.c);
  return `<dl class="kv"><dt>체력</dt><dd>${u.hp}/10</dd><dt>연료</dt><dd>${t.fuel?`${u.fuel}/${t.fuel}`:'불필요'}</dd><dt>탄약</dt><dd>${t.ua?'∞':t.ammo?`${u.ammo}/${t.ammo}`:'—'}</dd>
  ${u.supNow?'<dt>상태</dt><dd>제압됨 (이동 −1, 공격 −30%)</dd>':''}${u.order?`<dt>명령</dt><dd>${u.order.t==='sentry'?'경계 (적이 3칸 안에 오면 해제)':`목표 이동 (${u.order.r},${u.order.c})`}</dd>`:''}<dt>숙련</dt><dd>${u.rank?'★'.repeat(u.rank)+` (공격 +${u.rank*10}%)`:'신병'}</dd><dt>태세</dt><dd>${u.dug?'참호 (방어 ★+1)':UT[u.type].d==='land'&&u.type!=='truck'?'기동 중':'—'}${u.oos?` · 보급 단절 ${u.oos}턴`:''}</dd><dt>사거리</dt><dd>${rngU(u).join('–')}${t.ind?' (간접 · 이동 후 사격 불가)':''}</dd><dt>보급</dt><dd>${inSupply(u,S)?'보급선 내':'보급선 밖'}</dd><dt>지형</dt><dd>${x.bld?BT[x.bld.type].n:TR[x.t].n}</dd>${u.cargo?`<dt>탑재</dt><dd>${UT[u.cargo.type].n} (${u.cargo.hp})</dd>`:''}</dl>`;}
function briefHtml(){return G.brief&&G.brief.length?`<div class="brief">${G.brief.map(([w,t])=>`<div><b>${w}</b><span>${t}</span></div>`).join('')}</div>`:'';}
function panelCmd(){const n=G.cur;let h='';const s=UI.sel,P=UI.pane;
  if(UI.phase==='msl'){const M=MSL[UI.mk];return `<h3>${M.n} 발사 <span class="stats">보유 ${stock(n)[UI.mk]} · 이번 턴 ${G.nats[n].fired||0}/${launchers(n).length}발</span></h3><p>${M.desc}.</p><p>지도의 붉은 칸을 탭하면 발사합니다.</p>`;}
  if(G.busy)return `<h3>${NATS[n].full} 작전 중</h3><p>AI가 부대를 기동하고 있습니다.</p>${G.log.length?`<div class="log">${G.log.map(l=>`<span>${l}</span>`).join('')}</div>`:''}`;
  if(s){const t=UT[s.type];
    if(UI.fc!=null){const d=unitAt(kr(UI.fc),kc(UI.fc));if(d){const ev=calcDmg(s,d,false);const lo=Math.round(ev*0.85),hi=Math.min(d.hp,Math.round(ev*1.15));const rest=d.hp-ev;
      let cnt='반격 없음';if(rest>0&&!UT[d.type].ind&&canHit(d,s)){const sv=d.hp;d.hp=rest;const ce=calcDmg(d,s,false);d.hp=sv;cnt=`예상 반격 −${ce}`;}
      return `<h3>전투 예측 <span class="stats">${t.n} → ${natName(d.nat)} ${UT[d.type].n}</span></h3><dl class="kv"><dt>예상 피해</dt><dd>−${lo}~${hi} (적 체력 ${d.hp})</dd><dt>결과</dt><dd>${lo>=d.hp?'격파 확실':hi>=d.hp?'격파 가능':cnt}</dd><dt>적 방어</dt><dd>${UT[d.type].d==='land'?`★${TR[cell(d.r,d.c).t].def+(cell(d.r,d.c).bld?1:0)+(d.dug?1:0)}${d.dug?' (참호)':''}`:'—'}</dd></dl><p>하단 바의 공격을 누르거나 같은 적을 한 번 더 탭하세요.</p>`;}}
    let hint=UI.phase==='select'?'파란 칸으로 이동, 붉은 칸의 적을 탭하면 공격합니다.':(UI.targets.length?'붉은 칸의 적을 공격하거나 대기하세요.':'다음 행동을 고르세요.');
    if(t.ind&&UI.phase==='select')hint='자주포는 이동하면 그 턴엔 사격할 수 없습니다.';
    h=`<h3>${NATS[s.nat].name} ${t.n} <span class="stats">${({land:'지상',sea:'해상',air:'공중'})[t.d]} · 이동 ${t.mv}</span></h3><p>${hint}</p>${unitCard(s)}`;
    if(UI.phase==='select'&&fortable(n,s.r,s.c)&&!cell(s.r,s.c).fort)h+=`<div class="row"><button class="btn" data-act="dig" id="b-dig">이 자리에 방어 시설</button></div>`;
    return h;}
  if(P){const x=cell(P.r,P.c);const p=producer(x);
    const title=x.bld?`${BT[x.bld.type].n}${x.bld.left?` (공사 중 · ${x.bld.left}턴)`:''}`:TR[x.t].n;
    h=`<h3>${title} <span class="stats">${natName(x.owner)} · 방어 ★${TR[x.t].def+(x.bld?1:0)}</span></h3>`;
    if(x.owner===n&&p==='silo'){const st=stock(n);h+=`<p>${x.used?'이번 턴엔 이미 생산했습니다.':'생산할 미사일을 고르세요.'} 보유 순항 ${st.c} · 탄도 ${st.b} (종류별 최대 ${MSL_CAP}).</p><div class="grid">`+
      ['c','b'].map(k=>{const ok=!x.used&&st[k]<MSL_CAP&&canPay(n,MSL[k].cost)&&(k==='c'||hasTech(n,'rocketry'));return `<button class="btn" data-act="mprod:${k}" id="mp-${k}" ${ok?'':'disabled'}><span>${MSL[k].n}</span><small>${fmtCost(MSL[k].cost)}</small><small>${k==='b'&&!hasTech(n,'rocketry')?'로켓 공학 연구 필요':MSL[k].desc}</small></button>`;}).join('')+'</div>';}
    else if(x.owner===n&&p){const types=TYPES.filter(t=>UT[t].from.includes(p));if(p==='port'&&blockaded(P.r,P.c))h+='<p>적 함대에 봉쇄되어 함정을 만들 수 없습니다. 아군 군함으로 봉쇄를 풀어야 합니다.</p>';
      const full=armySize(n)>=armyCap(n);
      h+=x.used?'<p>이번 턴엔 이미 생산했습니다.</p>':full?`<p>병력 상한 ${armyCap(n)}기에 도달했습니다. 도시를 더 확보하면 상한이 늘어납니다.</p>`:`<p>생산할 부대를 고르세요. 생산된 부대는 다음 턴부터 움직입니다. 병력 ${armySize(n)}/${armyCap(n)}.</p>`;
      h+=`<div class="grid">`+types.map(t=>{const rq=prodOk(n,t,P.r,P.c);const ok=rq&&!x.used&&!full&&canPay(n,uCost(n,t))&&canSpawn(n,t,P.r,P.c);return `<button class="btn" data-act="prod:${t}" id="pp-${t}" ${ok?'':'disabled'}><span>${UT[t].n}</span><small>${rq?fmtCost(uCost(n,t)):!reqOk(n,t)?TECH[UT[t].req].n+' 연구 필요':'옆에 '+HEAVYN[UT[t].heavy]+' 필요'}</small></button>`;}).join('')+'</div>';}
    else if(buildable(n,P.r,P.c)){h+=`<p>이 부지에 건설할 시설을 고르세요.</p><div class="grid">`+Object.keys(BT).map(b=>{const c=bCost(n,b);const ok=canPay(n,c)&&siteOk(n,b,P.r,P.c);
        return `<button class="btn" data-act="bld:${b}" id="bb-${b}" ${ok?'':'disabled'}><span>${BT[b].n}</span><small>${fmtCost(c)}</small><small>${BT[b].desc}</small></button>`;}).join('')+'</div>';}
    else{const yld=x.rig?'석유 4':{hq:'자금 6 · 철강 3 · 석유 2',city:'자금 3 · 철강 1',oil:'석유 3',mine:'철강 4'}[x.t];
      h+=`<p>${yld?`매 턴 ${yld}. `:''}${(x.t==='city'||x.t==='hq')&&blockaded(P.r,P.c)?'해상 봉쇄 중이라 자금 수입이 끊겼습니다. ':''}${x.rig&&x.owner!==n?'구축함·전함·잠수함·항공모함이 올라가 점령할 수 있습니다.':x.owner!==n&&(SITES.includes(x.t)||x.bld)?'보병으로 점령할 수 있습니다.':x.t==='plain'||x.t==='forest'?'아군 도시·수도 반경 2 안의 빈 평지·숲에만 건설할 수 있습니다.':''}</p>`;}
    if(x.fort&&(x.fort.t!=='mines'||x.fort.o===n))h+=`<p>${natName(x.fort.o)} ${FORT[x.fort.t].n}: ${FORT[x.fort.t].desc}.</p>`;
    if(x.occ>0)h+=`<p>점령지 안정화 ${x.occ}턴 남음 (수입 50%).</p>`;
    if((x.t==='city'||x.t==='hq')&&x.owner===n){const CC=connectedCities(n);const con=CC.has(key(P.r,P.c));const rts=routeStates().filter(s=>s.o===n&&(s.rt.a===key(P.r,P.c)||s.rt.b===key(P.r,P.c)));
      h+=`<h3>교역 <span class="stats">${con?'수도와 연결됨':'수도와 끊김'}</span></h3><p>이 도시의 교역로 ${rts.filter(s=>s.active).length}/${rts.length}개 활성 (각 자금 +2). ${x.t==='city'?(con?`교역 성장 ${x.grow||0}/8 — 8이 되면 개발 단계가 무료로 1 오릅니다.`:'수도와 교역로로 이어져야 자연 성장합니다.'):''}${x.ruin?` 시가지 파괴 ${x.ruin}/3 (자금 −${x.ruin}, 3턴마다 1단계 복구).`:''}</p>`;}
    if((x.t==='city'||x.t==='hq')&&x.owner===n){const l=x.dev||0;h+=`<h3>도시 개발 <span class="stats">Lv${l}/3</span></h3><p>단계마다 자금 수입 +2, 병력 상한 +2, 점수 +5. 점령당하면 1단계 떨어집니다.</p>`+(l<3?`<div class="row"><button class="btn" data-act="dev:1" id="b-dev" ${canPay(n,devCost(l))&&x.devT!==G.turn?'':'disabled'}>Lv${l+1}로 개발 · ${fmtCost(devCost(l))}</button></div>`:'<p>최대 단계입니다.</p>');}
    if(x.bld&&x.bld.type==='airfield'&&x.owner===n){const k=key(P.r,P.c);const H=hangar(k);const cap=baseCap(k);
      h+=`<h3>격납고 <span class="stats">${H.length}/${cap}대 · 격납고 ${baseHangars(k)}동</span></h3><p>${x.bld.left?`활주로 공사·복구 중 (${x.bld.left}턴). 끝나야 출격·격납할 수 있습니다.`:'격납된 항공기는 매 턴 급유·재무장·수리되고 적 공격을 받지 않습니다. 비행장 옆에 격납고를 지으면 4대씩 늘어납니다.'}</p>`+
        (H.length?`<div class="grid">${H.map(u=>`<button class="btn" data-act="sortie:${u.id}" id="so-${u.id}" ${u.done||x.bld.left?'disabled':''}><span>${UT[u.type].n} 출격</span><small>체력 ${u.hp} · 연료 ${u.fuel}${UT[u.type].ammo?` · 탄약 ${u.ammo}`:''}</small><small>${u.done?'정비 중 · 다음 턴 출격 가능':'출격 준비 완료'}</small></button>`).join('')}</div>`:'<p>격납된 항공기가 없습니다. 항공기를 활주로 칸으로 옮긴 뒤 하단 바의 격납을 누르세요.</p>');}
    if(fortable(n,P.r,P.c)){const N=G.nats[n];const left=fortCap(n)-(N.fb||0);h+=`<h3>방어 시설 <span class="stats">이번 턴 ${left}/${fortCap(n)}개 설치 가능</span></h3><div class="grid">`+Object.keys(FORT).map(t=>{const ok=left>0&&canPay(n,FORT[t].cost);
      return `<button class="btn" data-act="fort:${t}" id="ft-${t}" ${ok?'':'disabled'}><span>${FORT[t].n}</span><small>${fmtCost(FORT[t].cost)}</small><small>${FORT[t].desc}</small></button>`;}).join('')+'</div>';}
    return h;}
  const left=G.units.filter(u=>u.nat===n&&!u.done).length;
  const offs=(G.offers||[]).filter(o=>o.to===n);
  const offHtml=offs.map(o=>`<div class="brief"><div><b>외교</b><span>${NATS[o.from].full}이(가) 10턴 불가침 조약을 제안합니다. <button class="btn sm" data-act="acc:${o.from}" id="acc-${o.from}">수락</button> <button class="btn sm" data-act="rej:${o.from}" id="rej-${o.from}">거절</button></span></div></div>`).join('');
  const sl=launchers(n).length;const st=stock(n);
  const mslHtml=sl||st.c||st.b?`<div class="brief"><div><b>미사일</b><span>발사대 ${sl}기 · 순항 ${st.c} · 탄도 ${st.b} · 이번 턴 발사 ${G.nats[n].fired||0}/${sl} <span class="row" style="margin-top:6px"><button class="btn sm" data-act="msl:c" id="b-msl-c" ${canLaunch(n,'c')?'':'disabled'}>순항미사일 발사</button><button class="btn sm" data-act="msl:b" id="b-msl-b" ${canLaunch(n,'b')?'':'disabled'}>탄도미사일 발사</button></span></span></div></div>`:'';
  const idle=G.units.filter(u=>u.nat===n&&!u.done&&!u.order);
  const list=idle.length?`<div class="ulist">${idle.slice(0,48).map(u=>`<button class="ucard" data-act="card:${u.id}" id="uc-${u.id}"><svg viewBox="-14 -14 28 28" width="28" height="28" aria-hidden="true"><circle r="11.5" fill="#0d1218" stroke="${mapCol(n)}" stroke-width="2.2"/><g fill="#ece6d6" stroke="#1d2126" stroke-width=".5">${GLY[u.type]}</g></svg><span>${UT[u.type].n}</span><small>${u.hp}</small></button>`).join('')}</div>`:'';
  h=offHtml+mslHtml+`<h3>${NATS[n].full} 사령부</h3><p>부대를 탭해 이동·공격하고, 아군 수도·시설을 탭해 생산, 영토 안 빈 땅을 탭해 건설합니다.</p>${idle.length?`<h3>대기 부대 <span class="stats">${idle.length}기</span></h3>${list}`:''}<h3>브리핑</h3>${briefHtml()}`;
  if(G.log.length)h+=`<div class="log">${G.log.map(l=>`<span>${l}</span>`).join('')}</div>`;return h;}
function panelStaff(){const n=G.cur,N=G.nats[n];if(isAI(n))return `<p>AI 차례입니다.</p>`;
  let h=`<h3>참모부 <span class="stats">${N.staff.length}/${STAFF_SLOTS}석 · 임명 자금 ${STAFF_COST} · 급여 턴당 1</span></h3>`;
  h+=N.staff.length?`<div class="brief">${N.staff.map(s=>`<div><b>${STAFF[s.role].code}</b><span><strong>${s.name}</strong> · ${STAFF[s.role].n} — ${STAFF[s.role].desc} <button class="btn sm" data-act="fire:${s.role}" id="fire-${s.role}">해임</button></span></div>`).join('')}</div>`:'<p>아직 임명된 참모가 없습니다. 참모는 능력 보정과 매 턴 브리핑을 제공합니다.</p>';
  h+=`<h3>임명 가능</h3><div class="grid">`+Object.keys(STAFF).filter(r=>!hasStaff(n,r)).map(r=>`<button class="btn" data-act="hire:${r}" id="hire-${r}" ${N.staff.length<STAFF_SLOTS&&N.f>=STAFF_COST?'':'disabled'}><span>${STAFF[r].code} ${STAFF[r].n}</span><small>${STAFF[r].desc}</small></button>`).join('')+'</div>';
  h+=`<h3>이번 턴 브리핑</h3>${briefHtml()}`;return h;}
function panelTech(){const n=G.cur,N=G.nats[n];if(isAI(n))return `<p>AI 차례입니다.</p>`;
  let h=`<h3>연구소 <span class="stats">${N.res?`진행 중: ${TECH[N.res.k].n} · ${N.res.left}턴 남음`:'대기 중'}</span></h3><p>한 번에 하나씩 연구할 수 있고, 비용은 착수할 때 냅니다. 남는 자원을 기술 우위로 바꾸세요.</p><div class="grid">`;
  h+=Object.keys(TECH).map(k=>{const T=TECH[k];const done=hasTech(n,k);const cur=N.res&&N.res.k===k;const ok=!done&&!N.res&&canPay(n,T.cost);
    return `<button class="btn" data-act="res:${k}" id="res-${k}" ${ok?'':'disabled'}><span>${done?'✓ ':''}${T.n}</span><small>${T.desc}</small><small>${done?'완료':cur?`연구 중 · ${N.res.left}턴`:`${fmtCost(T.cost)} · ${T.t}턴`}</small></button>`;}).join('');
  return h+'</div>';}
function panelWorld(){let h=`<h3>정세 보고</h3><div class="tbl"><table><tr><th>세력</th><th>통제</th><th>상태</th><th>도시</th><th>유전·광산</th><th>병력</th><th>참모</th><th>점수</th><th>성향</th><th>관계</th></tr>`;const me=G.cur;
  for(const N of G.nats){if(N.ctrl==='none')continue;let ci=0,rs=0;for(const row of G.map)for(const x of row){if(x.owner!==N.id)continue;if(x.t==='city'||x.t==='hq')ci++;if(x.t==='oil'||x.t==='mine')rs++;}
    const un=G.units.filter(u=>u.nat===N.id).length;
    h+=`<tr><td style="text-align:left"><i class="sw" style="background:${NATS[N.id].col}"></i> ${NATS[N.id].name}</td><td>${N.ctrl==='human'?'사람':'AI'}</td><td>${N.alive?'건재':'멸망'}</td><td>${ci}</td><td>${rs}</td><td>${un}</td><td>${N.staff.length}</td><td>${N.alive?score(N.id):0}</td><td>${N.ctrl==='ai'?N.pers:'—'}</td><td>${N.id===me?'—':!N.alive?'—':atPeace(me,N.id)?`불가침 ${G.peace[pk(me,N.id)]-G.turn}턴`:'교전'}</td></tr>`;}
  h+=`</table></div>`;if(!isAI(me)){const others=G.nats.filter(N=>N.alive&&N.id!==me);
    h+=`<h3>외교</h3><p>불가침 조약은 10턴 유지되고 만료되면 교전이 재개됩니다. 조약을 깨고 선전포고하면 10턴 동안 누구도 조약에 응하지 않습니다.${(G.nats[me].perfidy||0)>G.turn?` 현재 신뢰 하락 ${G.nats[me].perfidy-G.turn}턴.`:''}</p><div class="grid">`+
      others.map(N=>atPeace(me,N.id)?`<button class="btn" data-act="war:${N.id}" id="war-${N.id}"><span>${NATS[N.id].name}에 선전포고</span><small>조약 파기 · 신뢰 하락</small></button>`:`<button class="btn" data-act="peace:${N.id}" id="peace-${N.id}"><span>${NATS[N.id].name}에 불가침 제안</span><small>${N.ctrl==='ai'?N.pers+' 성향 · 수락 불확실':'사람 세력 · 즉시 체결'}</small></button>`).join('')+`</div>`;}
  h+=`<div>`;
  h+=`</div>${G.vic?`<p>점수전: ${G.vic}라운드가 끝나면 점수가 가장 높은 세력이 승리합니다. 지금 ${G.turn}라운드.</p>`:''}${(G.hist||[]).length>1?warReport():''}<p>상대 수도(★)를 보병으로 점령하면 그 세력의 영토 전체를 병합합니다. 마지막까지 남은 세력이 승리합니다.</p>`;
  if(G.log.length)h+=`<div class="log">${G.log.map(l=>`<span>${l}</span>`).join('')}</div>`;
  return h+`<div class="row"><button class="btn" data-act="new" id="b-new2">새 작전</button></div>`;}
function panelRules(){let h=`<h3>교범</h3><ul class="rules">
  <li>자원 3종: 자금(도시 3·수도 6), 철강(광산 4·수도 3·도시 1), 석유(유전 3·해상 유전 4·수도 2). 도시 개발 1단계마다 자금 +2. 참모 1명당 자금 −1.</li>
  <li>보급선: 수도 반경 3, 도시 2, 보급창 4, 보급트럭 1 안의 지상 부대는 턴 시작 때 연료·탄약을 채웁니다 (석유·철강 소모). 함정은 항구 반경 3·도시 옆, 항공기는 비행장·수도 위에서만 보급.</li>
  <li>보급선 밖 항공기는 매 턴 연료 −2, 0이 되면 추락합니다. 연료가 바닥난 부대는 움직이지 못합니다. 유닛 왼쪽 위 붉은 점은 연료·탄약 부족 표시입니다.</li>
  <li>아군 도시·수도·보급창 위 지상 부대, 항구 옆 함정, 비행장 위 항공기는 턴마다 체력 +2 (자금 1).</li>
  <li>병력 상한 = 6 + 보유 도시·수도 × 3. 영토를 넓혀야 군대를 키울 수 있습니다.</li>
  <li>시설은 아군 도시·수도 반경 2 안 평지·숲에 지으며 공사 기간이 있습니다. 시설 1곳당 턴마다 1기 생산.</li>
  <li>자주포는 사거리 2–3 간접사격으로 반격을 받지 않지만, 이동한 턴엔 못 쏩니다. 잠수함은 인접해야 보입니다.</li>
  <li>바다 건너엔 상륙함: 지상 부대를 고르면 근처 상륙함이 점선으로 표시되고, 탭하면 탑승합니다. 상륙함을 고르면 내릴 수 있는 해안이 초록으로 표시되고, 탭하면 바로 상륙합니다. 도시·자원지 위로 이동하거나 상륙하면 자동으로 점령됩니다.</li>
  <li>해군: 구축함은 사거리 1–2, 전함은 1–3으로 이동 후에도 함포사격이 가능해 해안의 지상 부대를 칠 수 있습니다. 항공모함 주변 1칸의 항공기는 연료·탄약 보급과 수리를 받습니다.</li>
  <li>해상 유전(바다 위 시추 플랫폼)은 군함이 올라가 점령하며 매 턴 석유 4를 줍니다.</li>
  <li>해상 봉쇄: 적 군함이 해안 도시·수도·항구 옆에 있고 아군 군함이 없으면 그 도시 자금 수입이 끊기고(수도는 절반) 항구는 함정 생산과 보급이 막힙니다. 지도에 붉은 물결로 표시됩니다.</li>
  <li>군도 지형은 섬들로 나뉘어 상륙함 없이는 적 수도에 갈 수 없습니다. 각 세력은 항구와 상륙함·구축함을 갖고 시작합니다.</li>
  <li>영토: 도시·수도·자원지·시설 주변이 자기 영토로 칠해집니다. 붉은 실선은 교전 중인 전선, 초록 점선은 조약국과의 국경입니다.</li>
  <li>방어 시설(턴당 3개, 공병참모 5개): 영토 안이나 아군 지상 부대 옆에 설치. 철책은 적 지상 부대를 멈춰 세우고, 벙커는 방어 ★+2, 지뢰지대는 적에게 보이지 않고 진입 시 체력 −3. 적이 올라서면 철책은 절단, 벙커는 파괴됩니다.</li>
  <li>점령한 도시·자원지는 5턴 동안 수입 50%이고, 주변에 수비 병력이 없으면 원래 주인의 저항군이 봉기할 수 있습니다. 수도를 빼앗아 병합한 땅도 5턴간 안정화가 필요합니다.</li>
  <li>한 세력이 전체 국력의 38%를 넘으면 나머지 AI들이 조약을 맺고 그 세력을 집중 견제합니다.</li>
  <li>비행장은 활주로 2칸으로 지어지고 항공기 2대를 격납합니다. 비행장에 붙여 격납고를 지으면 1동마다 4대씩 늘어납니다. 비행장에서 만든 항공기는 격납고로 들어가고, 비행장 칸을 눌러 출격시킵니다. 격납된 항공기는 매 턴 급유·재무장·수리되며 공격받지 않습니다.</li>
  <li>항공기를 활주로 칸에 세우고 하단 바의 격납을 누르면 들어갑니다. 탄도미사일이 활주로에 떨어지면 2턴 동안 복구해야 하고 격납 중 1대가 파괴됩니다. 보병으로 비행장을 점령하면 격납 항공기는 모두 파괴됩니다.</li>
  <li>교역로: 거점 사이 도로의 양 끝을 같은 세력이 가지면 교역로가 열려 턴마다 자금 +2. 적 부대가 도로 위에 서면 차단됩니다(붉은 점선). 수도와 교역로로 이어진 도시는 8턴마다 개발 단계가 저절로 오릅니다. 지상 부대는 도로 위에서 숲도 1칸 비용으로 지나갑니다.</li>
  <li>시가전: 도시·수도의 보병 계열은 받는 피해 −20%, 기갑이 도시를 근접 공격하면 −15%. 포병·폭격·전함·미사일은 시가지를 부수고(최대 3단계), 단계마다 그 도시 자금 −1. 3턴마다 1단계씩 복구됩니다.</li>
  <li>탄도미사일 타격 범위: 목표를 탭한 뒤 집중(1칸 8)·표준(중심 5·주변 3)·광역(반경 2칸, 4·3·2)을 고르고 발사합니다.</li>
  <li>예약 명령: 부대를 고르고 '목표 이동'을 누른 뒤 먼 지점을 탭하면 매 턴 자동으로 그쪽으로 이동합니다. '경계'는 적이 3칸 안에 나타날 때까지 대기 목록에서 빠집니다. 적과 마주치면 명령이 풀립니다.</li>
  <li>협공: 적에게 붙어 있는 아군이 많을수록 근접 공격 피해가 늘어납니다(1기당 +10%, 최대 +30%). 포병·다연장·폭격기·전함에 맞고 살아남은 지상·해상 부대는 제압되어 다음 턴 이동 −1, 공격 −30%가 됩니다.</li>
  <li>도시 개발: 아군 도시·수도를 눌러 최대 3단계까지 개발합니다. 단계마다 자금 +2, 병력 상한 +2.</li>
  <li>정찰위성 연구 후에는 4라운드마다 그 라운드 동안 지도 전체가 보입니다.</li>
  <li>조선소는 항구 옆에 지으며 전함·항공모함·이지스 순양함을 만들 수 있게 하고, 옆 함정을 턴마다 3씩 수리합니다. 병기창은 공장 옆에 지으며 전차·다연장로켓·장거리 SAM·이동식 발사대를 만들 수 있게 합니다.</li>
  <li>보급함 반경 2칸 안의 아군 함정은 항구 밖에서도 연료와 탄약을 보급받습니다.</li>
  <li>공중급유기 반경 2칸 안의 아군 항공기는 기지 밖에서도 연료를 채워 추락하지 않습니다.</li>
  <li>방공 반응 사격: 대공포·SAM·구축함·호위함·이지스 순양함은 적 항공기가 사거리 안으로 들어오면 그 즉시 자동으로 한 번 사격합니다(턴마다 1회). 스텔스기는 2칸 안까지 다가와야 맞힙니다. 방공망을 피해 우회하거나 먼저 지상군·미사일로 방공 부대를 제거하세요.</li>
  <li>장거리 SAM·이지스 순양함은 주변 4칸 안으로 떨어지는 적 탄도미사일을 45% 확률로 요격합니다.</li>
  <li>특수부대는 산을 쉽게 넘고 인접해야만 보이며, 공병과 함께 철책·지뢰에 멈추지 않습니다. 공병은 지뢰를 피해 없이 제거하고 방어 시설 설치 한도를 늘립니다.</li>
  <li>다연장로켓은 사거리 2–5로 목표 주변 칸까지 피해를 줍니다. 이동식 발사대는 미사일 기지 없이도 미사일을 쏠 수 있는 발사대가 됩니다(순항 7칸, 탄도 11칸).</li>
  <li>수송헬기는 보병 계열 1개 부대를 태워 어디든 내려줄 수 있습니다(공중강습). 장갑차도 점령할 수 있습니다.</li>
  <li>미사일 기지(3턴 공사)에서 미사일을 만들고, 기지 1곳당 턴마다 1발 쏠 수 있습니다. 순항미사일은 사거리 8의 정밀타격으로 목표 주변 2칸 안의 대공포(30%)·SAM(60%)·구축함(40%)에 요격될 수 있습니다.</li>
  <li>탄도미사일(로켓 공학 필요)은 사거리 14, 목표 칸과 주변 6칸 전체에 피해(아군 포함)를 주고 시설을 파괴합니다. 미사일 방어망 연구가 있어야만 50% 요격합니다.</li>
  <li>지대공미사일(SAM)은 사거리 1–3으로 항공기를 잡고, 설치형이라 이동한 턴엔 쏠 수 없습니다.</li>
  <li>한 턴 동안 움직이지 않은 지상 부대는 참호를 파서 방어 ★+1 (점선 표시). 움직이면 사라집니다.</li>
  <li>적을 격파한 부대는 진급합니다 (★ 최대 3, 단계마다 공격 +10%).</li>
  <li>보급선 밖 지상·해상 부대는 2턴째부터 매 턴 체력 −1. 적의 보급선을 끊어 포위하세요.</li>
  <li>기상: 비(지상 차량 이동 −1), 폭풍(항공기 출격 불가·함정 이동 −2), 짙은 안개(시야 −1). 정보참모가 있으면 다음 라운드 예보를 받습니다.</li>
  <li>적 부대를 탭하면 먼저 전투 예측이 나오고, 한 번 더 탭하면 공격합니다. 초록 점은 불가침 조약 상대입니다.</li>
  <li>방어 ★ 하나당 지상 부대 피해 −8%. 숲 1, 산 2, 도시 2, 수도 3, 시설 위 +1.</li></ul>`;
  h+=`<div class="tbl"><table><tr><th>부대</th><th>비용</th><th>이동</th><th>연료</th><th>탄약</th><th>생산</th></tr>`+TYPES.map(t=>{const u=UT[t];return `<tr><th>${u.n}</th><td>${u.cost.join('/')}</td><td>${u.mv}</td><td>${u.fuel||'—'}</td><td>${u.ua?'∞':u.ammo||'—'}</td><td style="text-align:left;font-family:var(--font-d)">${u.from.map(f=>f==='hq'?'수도':BT[f].n).join('·')}</td></tr>`;}).join('')+`</table></div><p class="stats">비용 = 자금/철강/석유</p>`;
  h+=`<div class="tbl"><table><tr><th>공격＼대상</th>${CLS.map(c=>`<th>${CLSN[c]}</th>`).join('')}</tr>`+TYPES.filter(a=>UT[a].atk).map(a=>`<tr><th>${UT[a].n}</th>${CLS.map(c=>{const v=UT[a].atk[c]||0;return `<td style="background:color-mix(in srgb,var(--hit) ${v*7}%,transparent)">${v||'–'}</td>`;}).join('')}</tr>`).join('')+`</table></div><p class="stats">체력 10 공격자의 기본 피해 (대상 최대 체력 10). 대상 분류: ${TYPES.map(t=>`${UT[t].n}=${CLSN[UT[t].cls]}`).join(', ')}</p>`;
  return h;}
function warReport(){const H=(G.hist||[]).filter(h=>h&&h.s);const act=G.nats.filter(N=>N.ctrl!=='none');let max=1;for(const h of H)for(const v of h.s)if(v!=null&&v>max)max=v;
  const W2=320,H2=140,pl=30,pb=18,pt=8,pr=8;const xs=i=>pl+(H.length<2?0:i*(W2-pl-pr)/(H.length-1)),ys=v=>pt+(H2-pt-pb)*(1-v/max);
  let svg=`<svg viewBox="0 0 ${W2} ${H2}" width="100%" role="img" aria-label="세력별 점수 추이"><g stroke="#2b363f" stroke-width="1">${[0,.5,1].map(f=>`<line x1="${pl}" x2="${W2-pr}" y1="${ys(max*f).toFixed(1)}" y2="${ys(max*f).toFixed(1)}"/>`).join('')}</g>`+
    [0,.5,1].map(f=>`<text x="${pl-4}" y="${(ys(max*f)+3).toFixed(1)}" text-anchor="end" font-size="8" fill="#93a0a8" font-family="IBM Plex Mono,monospace">${Math.round(max*f)}</text>`).join('')+
    (H.length?`<text x="${pl}" y="${H2-4}" font-size="8" fill="#93a0a8" font-family="IBM Plex Mono,monospace">R${H[0].t}</text><text x="${W2-pr}" y="${H2-4}" text-anchor="end" font-size="8" fill="#93a0a8" font-family="IBM Plex Mono,monospace">R${H[H.length-1].t}</text>`:'');
  for(const N of act){const pts=H.map((h,i)=>h.s[N.id]!=null?`${xs(i).toFixed(1)},${ys(h.s[N.id]).toFixed(1)}`:null).filter(Boolean);if(pts.length>1)svg+=`<polyline points="${pts.join(' ')}" fill="none" stroke="${mapCol(N.id)}" stroke-width="2" stroke-linejoin="round"/>`;}
  svg+='</svg>';
  const rows=act.map(N=>{let ci=0;for(const row of G.map)for(const x of row)if(x.owner===N.id&&(x.t==='city'||x.t==='hq'))ci++;return {N,sc:N.alive?score(N.id):0,ci};}).sort((a,b)=>b.sc-a.sc);
  return `<h3>전쟁 보고서 <span class="stats">${G.turn}라운드</span></h3>${svg}<div class="tbl"><table><tr><th>세력</th><th>점수</th><th>도시</th><th>격파</th><th>상태</th></tr>${rows.map(({N,sc,ci})=>`<tr><td style="text-align:left"><i class="sw" style="background:${mapCol(N.id)}"></i> ${NATS[N.id].name}${N.ctrl==='human'?' (사람)':''}</td><td>${sc}</td><td>${ci}</td><td>${N.kills||0}</td><td>${N.alive?'건재':'멸망'}</td></tr>`).join('')}</table></div>`;}
function renderPanel(){const p=$('#panel');
  if(G.over&&G.over.scn){const S=SCN[G.scn.id];p.innerHTML=`<h3>${S.name}: ${G.over.scn==='clear'?'작전 성공':'작전 실패'}</h3><p>${G.over.scn==='clear'?`${G.turn}라운드 만에 목표를 달성했습니다.`:'제한 라운드 안에 목표를 달성하지 못했습니다.'}</p>${warReport()}<div class="row"><button class="btn primary" data-act="scn:${G.scn.id}" id="b-retry">다시 도전</button><button class="btn" data-act="new" id="b-new-s">작전 선택</button></div>`;return;}
  if(G.over){const w=G.over.win;p.innerHTML=`<h3>${w==null?'작전 실패':NATS[w].full+' 승리'}</h3><p>${w==null?'모든 사람 세력이 멸망했습니다.':G.over.score?`${G.vic}라운드 점수전에서 가장 높은 점수를 얻었습니다.`:`${G.turn}라운드 만에 전구를 통일했습니다.`}</p>${warReport()}<div class="row"><button class="btn primary" data-act="new" id="b-new-r">새 작전</button></div><div class="log">${G.log.map(l=>`<span>${l}</span>`).join('')}</div>`;return;}
  p.innerHTML=({cmd:panelCmd,staff:panelStaff,tech:panelTech,world:panelWorld,rules:panelRules})[UI.tab]();}
function render(){if(!G||typeof document==='undefined')return;scnCheck();if(G.over&&!G._rep){G._rep=true;UI.sheet=true;UI.tab='cmd';sfx(G.over.win===G.viewer?'win':'boom');}renderStatus();renderBoard();renderPanel();renderObj();
  $('#handoff').hidden=!(G.handoff&&!G.over);$('#ho-title').textContent=`${NATS[G.cur].full} 차례`;}
function centerHQ(){if(typeof document==='undefined')return;const N=G.nats[G.viewer];if(!N||!N.hq)return;centerOn(...N.hq);}
