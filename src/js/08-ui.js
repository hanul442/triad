/* ===================== UI: HUD·하단 바·메뉴 ===================== */
function render(){if(!G||typeof document==='undefined')return;if(UI.sel){if(G.units.includes(UI.sel))UI.targets=targetsOf(UI.sel,false);else clearSel();}if(typeof scnCheck==='function')scnCheck();
  if(G.over&&!G._rep){G._rep=true;UI.sheet=true;UI.tab='world';sfx(G.over.win===G.viewer?'win':'boom');}
  const ho=$('#handoff');if(ho)ho.hidden=true;
  renderHUD();renderActbar();renderPanel();renderObj();if(typeof v3Sync==='function')v3Sync();}
function renderHUD(){const h=hourOf(),vn=G.viewer,N2=G.nats[vn];const night=isNight();
  const ic=night?`<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M8.5 1.2A5 5 0 1 0 10.8 9 4 4 0 0 1 8.5 1.2Z" fill="#e8ecef"/></svg>`:`<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="2.6" fill="#f0c45a"/></svg>`;
  $('#hud-clock').innerHTML=`${ic}<b>${String(h).padStart(2,'0')}:00</b><small>${fmtT(G.time||0)} / ${fmtT(G.maxR*ROUND_S)} · ${WX[G.wx].n}${G.paused?' · 일시정지':G.spd!==1?` · ${G.spd}배속`:''}</small>`;
  $('#hud-res').innerHTML=`<i class="dot" style="background:${mapCol(vn)}"></i><span class="rv"><b>${N2.cp}</b><small class="lbl">지휘 +${income(vn)}/30초</small></span>${G.scn?'':`<span class="rv"><b>${N2.vp}/${G.vpWin}</b><small class="lbl">승점</small></span>`}<span class="rv"><b>${objCount(vn)}/${G.objs.length}</b><small class="lbl">거점</small></span>`;
  const pl=$('#hud-obj');pl.style.borderColor=mapCol(vn);pl.innerHTML=G.order.map(n=>`<span style="color:${mapCol(n)}">${'■'.repeat(objCount(n))||'·'}</span>`).join(' ')+`<span class="nt"> ${G.objs.length-G.order.reduce((a,n)=>a+objCount(n),0)}</span>`;
  $('#app').classList.toggle('sheet-open',!!UI.sheet);$('#sheet').hidden=!UI.sheet;
  const g=$('#b-grid');if(g)g.setAttribute('aria-pressed',UI.grid?'true':'false');const sn=$('#b-snd');if(sn)sn.setAttribute('aria-pressed',SFX.on?'true':'false');}
function uInfo(u){const t=UT[u.type];const x=cell(u.r,u.c);const where=x.t==='bldg'?`건물 ${x.f}층`:TT[x.t].n;
  const st=u.path&&u.path.length?'이동 중':u.tgt!=null?'교전 명령':'대기';const cv=coverOf(u);const cvt=cv.cov>0&&cv.kind!=='bldg'?` · 엄폐 ${(COVK[cv.kind]||{n:'연막'}).n} ${Math.round(cv.cov*100)}%`:'';return `체력 ${Math.ceil(u.hp)}/${hpMax(u)} · ${where}${cvt} · ${st}${u.supp>0?' · 제압됨':''}${u.hold?' · 자리 고수':''}${u.rank?' · 숙련 '+u.rank:''}`;}
function renderActbar(){const el=$('#actbar');if(!el)return;const n=G.viewer;el.hidden=false;let h='';const s=UI.sel&&G.units.includes(UI.sel)?UI.sel:null;if(UI.sel&&!s)clearSel();
  if(G.over){const w=G.over.win;el.innerHTML=`<b>${w==null?'무승부':NATS[w].full+' 승리'}</b><span>${G.over.why} · ${fmtT(G.time||0)}</span><div class="ab"><button class="btn sm" data-act="report" id="ab-rep">전황</button><button class="btn sm primary" data-act="new" id="ab-new">새 작전</button></div>`;return;}
  if(G.boot||isAI(n)){el.innerHTML=`<b>관전</b><span>AI끼리 싸우는 중</span>`;return;}
  const pz=`<button class="btn sm${G.paused?' primary':''}" data-act="pause" id="ab-pause">${G.paused?'재개':'일시정지'}</button>`;
  if(UI.phase==='buy'){const t=UT[UI.buyT];h=`<b>${t.n} 배치</b><span>초록 칸을 탭하세요 · 지휘 ${t.cost}</span><div class="ab"><button class="btn sm" data-act="buy-cancel" id="ab-bc">취소</button></div>`;}
  else if(UI.phase==='sup'){const S=SUP[UI.supK];h=`<b>${S.n}</b><span>${UI.st!=null?'같은 칸을 다시 탭하거나 실행':'목표 지점을 탭하세요'} · ${S.desc}</span><div class="ab">${UI.st!=null?`<button class="btn sm primary" data-act="sup-fire" id="ab-sf">실행</button>`:''}<button class="btn sm" data-act="sup-cancel" id="ab-sc">취소</button></div>`;}
  else if(s){const t=UT[s.type];
    const ng=(UI.group||[]).filter(x=>G.units.includes(x)).length;const tip=UI.phase==='demo'?'부술 건물을 탭하세요':(ng?`외 ${ng}개 부대 · `:'')+'탭: 이동 · 적 탭: 공격';
    h=`<b style="color:${mapCol(n)}">${t.n}</b><span>${uInfo(s)} · ${tip}</span><div class="ab">${t.ex?`<button class="btn sm${UI.phase==='demo'?' primary':''}" data-act="demo" id="ab-demo">건물 사격</button>`:''}<button class="btn sm${s.hold?' primary':''}" data-act="hold" id="ab-hold">고수</button><button class="btn sm" data-act="stop" id="ab-stop">정지</button><button class="btn sm" data-act="cancel" id="ab-cancel">해제</button></div>`;}
  else if(UI.pane){const {r,c}=UI.pane;const x=cell(r,c);const u=unitAt(r,c);const vis=!G.fog||visSet(n).has(key(r,c));
    const nm=x.obj!=null?G.objs[x.obj].name+' · ':'';const own=x.obj!=null?` · ${natName(x.owner)} 거점`:'';
    const what=x.t==='bldg'?`${x.f}층 건물 · 내구 ${Math.ceil(x.bhp)}/${x.bmax} · 엄폐 40%`:`${TT[x.t].n}${TT[x.t].cov?` · 엄폐 ${Math.round(TT[x.t].cov*100)}%`:''}`;
    const uo=u&&(!G.fog||seen(u,n))?` · ${natName(u.nat)} ${UT[u.type].n} ${uInfo(u)}`:'';
    h=`<b>${nm}${x.t==='bldg'?'건물':TT[x.t].n}</b><span>${what}${own}${x.smoke?' · 연막':''}${vis?'':' · 시야 밖'}${uo}</span><div class="ab"><button class="btn sm" data-act="close" id="ab-close">닫기</button>${pz}</div>`;}
  else{const N2=G.nats[n];const cnt=G.units.filter(u=>u.nat===n).length;const cd=Math.max(0,(N2.supT||0)-(G.time||0));
    h=`<b>${NATS[n].name} 지휘소</b><span>부대 ${cnt} · 지휘 ${N2.cp}${cd?` · 화력 지원 ${Math.ceil(cd)}초`:''} · 아군을 탭해 지휘</span><div class="ab"><button class="btn sm" data-act="reinf" id="ab-reinf">증원·지원</button><button class="btn sm" data-act="all" id="ab-all">전체 선택</button><button class="btn sm" data-act="spd" id="ab-spd">${G.spd}×</button>${pz}</div>`;}
  el.innerHTML=h;}
function renderObj(){const el=$('#obj');if(!el)return;const m=typeof scnObjective==='function'?scnObjective():null;if(m&&!G.over){el.hidden=false;el.innerHTML=`<b>${m.t}</b> ${m.m}`;}else el.hidden=true;}
function renderTip(){const el=$('#tip');if(!el||!G)return;const k=UI.hk;if(k==null||UI.sel||UI.phase){el.hidden=true;return;}const r=kr(k),c=kc(k);const x=cell(r,c);const u=unitAt(r,c);
  const vis=!G.fog||visSet(G.viewer).has(k);let s=x.obj!=null?`<b>${G.objs[x.obj].name}</b> ${natName(x.owner)} · `:'';s+=x.t==='bldg'?`${x.f}층 건물 ${x.bhp}/${x.bmax}`:TT[x.t].n;
  if(u&&(!G.fog||seen(u,G.viewer)))s+=` · <span style="color:${mapCol(u.nat)}">${UT[u.type].n}</span> ${u.hp}/${hpMax(u)}`;if(!vis)s+=' · 시야 밖';el.innerHTML=s;el.hidden=false;}
function renderPanel(){const p=$('#panel');if(!p||!UI.sheet)return;document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===UI.tab?'true':'false'));
  const n=G.viewer,N2=G.nats[n];let h='';
  if(UI.tab==='cmd'){const myTurn=G.cur===n&&!isAI(n)&&!G.busy&&!G.over;
    h+=`<h3>증원 요청 <span class="stats">지휘 ${N2.cp} · 30초마다 +${income(n)}</span></h3><p>집결지나 우리 거점 바로 옆(적이 2칸 안에 없을 때)에 배치합니다. 배치한 턴에는 움직이지 못합니다.</p><div class="ulist">`+
      TYPES.map(t=>`<button class="ucard" data-act="buy:${t}" id="buy-${t}" ${myTurn&&N2.cp>=UT[t].cost?'':'disabled'} title="${UT[t].desc}"><b>${UT[t].n}</b><small>${UT[t].cost}</small></button>`).join('')+`</div>`;
    h+=`<h3>화력 지원 <span class="stats">${SUP_CD}초마다 1회</span></h3><div class="grid">`+Object.keys(SUP).map(k=>`<button class="btn" data-act="sup:${k}" id="sup-${k}" ${myTurn&&N2.cp>=SUP[k].cost&&N2.used!==G.turn&&!(k==='air'&&WX[G.wx].noAir)?'':'disabled'}>${SUP[k].n} · ${SUP[k].cost}<small>${k==='air'&&WX[G.wx].noAir?'폭우로 출격 불가':SUP[k].desc}</small></button>`).join('')+`</div>`;
    h+=`<h3>병종</h3><div class="tbl"><table><tr><th>병종</th><th>이동</th><th>사거리</th><th>대보병</th><th>대기갑</th><th>특징</th></tr>`+TYPES.map(t=>{const u=UT[t];return `<tr><td>${u.n}</td><td>${u.mv}</td><td>${u.rng[1]?u.rng[0]+'–'+u.rng[1]:'-'}</td><td>${u.atk.inf||'-'}</td><td>${u.atk.veh||'-'}</td><td style="text-align:left;white-space:normal;min-width:160px">${u.desc}</td></tr>`;}).join('')+`</table></div>`;
    h+=`<div class="log">${G.log.map(l=>`<div>${l}</div>`).join('')}</div>`;}
  else if(UI.tab==='world'){if(G.over)h+=`<h3>${G.over.win==null?'무승부':NATS[G.over.win].full+' 승리'}</h3><p>${G.over.why}</p>`;
    h+=`<h3>전황 <span class="stats">승점 ${G.vpWin} 먼저 달성 또는 ${fmtT(G.maxR*ROUND_S)} 뒤 승점 우세</span></h3><div class="tbl"><table><tr><th>세력</th><th>승점</th><th>거점</th><th>부대</th><th>지휘</th><th>격파</th><th>손실</th></tr>`+
      G.order.map(i=>{const x=G.nats[i];return `<tr><td style="color:${mapCol(i)}">${NATS[i].name}${x.alive?'':' (전멸)'}</td><td>${x.vp}</td><td>${objCount(i)}</td><td>${G.units.filter(u=>u.nat===i).length}</td><td>${i===n||!G.fog?x.cp:'?'}</td><td>${x.kills}</td><td>${x.losses}</td></tr>`;}).join('')+`</table></div>`;
    h+=`<h3>거점</h3><div class="kv">`+G.objs.map(o=>`<dt>${o.name}</dt><dd style="color:${mapCol(G.map[o.r][o.c].owner)}">${natName(G.map[o.r][o.c].owner)}${G.map[o.r][o.c].t==='rubble'?' · 잔해':''}</dd>`).join('')+`</div>`;
    if(G.hist.length>1)h+=vpChart();}
  else h+=RULES_HTML;
  p.innerHTML=h;}
function vpChart(){const W2=320,H2=120;const mx=Math.max(G.vpWin,...G.hist.flat());const n=G.hist.length;
  const lines=G.order.map((nat,j)=>`<polyline fill="none" stroke="${mapCol(nat)}" stroke-width="2" points="${G.hist.map((v,i)=>`${(i/(n-1)*W2).toFixed(1)},${(H2-v[j]/mx*H2).toFixed(1)}`).join(' ')}"/>`).join('');
  return `<h3>승점 추이</h3><svg viewBox="-4 -4 ${W2+8} ${H2+8}" style="width:100%;max-width:360px" role="img" aria-label="라운드별 승점"><line x1="0" x2="${W2}" y1="${H2-G.vpWin/mx*H2}" y2="${H2-G.vpWin/mx*H2}" stroke="#555" stroke-dasharray="4 3"/>${lines}</svg>`;}
const RULES_HTML=`<h3>목표</h3><ul class="rules"><li>전투는 실시간으로 흐릅니다. 30초마다 거점 하나당 승점 +1, 지휘점수 +2가 들어옵니다(기본 지휘 +3)</li><li>승점을 먼저 채우거나, 제한 시간이 끝났을 때 승점이 많은 쪽이 이깁니다. 적을 전멸시켜도 승리</li><li>거점은 소총분대·공병이 들어가면 점령됩니다</li></ul>
<h3>지휘</h3><ul class="rules"><li>아군을 탭해 고른 뒤 땅을 탭하면 그곳으로 이동, 적을 탭하면 쫓아가 공격합니다</li><li>부대는 사거리 안에 보이는 적을 알아서 쏩니다. 움직이면서 쏘면 연사가 느려지고, 박격포는 멈춰야 쏩니다</li><li>고수: 적을 쫓지 않고 자리를 지킵니다 · 정지: 명령 취소 · 건물 사격: 폭발물 부대로 건물을 부숩니다</li><li>Space 또는 일시정지 버튼으로 멈추고 생각할 수 있습니다. 배속은 0.5×·1×·2×</li></ul>
<h3>이동과 시야</h3><ul class="rules"><li>건물은 시야를 가립니다. 높은 건물 안에 있으면 더 멀리, 낮은 건물 너머까지 봅니다</li><li>차량은 건물에 못 들어가고 잔해·공원에서 느립니다. 보병은 건물·잔해를 지날 때 느려집니다</li><li>밤에는 시야 −2, 비 −1, 안개·폭우 −2</li></ul>
<h3>전투</h3><ul class="rules"><li>엄폐: 건물 40%, 잔해 25%, 공원 15%만큼 피해가 줄어듭니다. 폭발물(전차·대전차·공병·박격포)은 건물 엄폐를 절반만 받습니다</li><li>기관총·폭발물에 맞으면 제압: 잠시 느려지고 공격 −30%</li><li>전차는 장갑이 두꺼워 대전차팀·공병·전차 말고는 피해 −35%</li><li>건물 안 대전차팀은 기갑에 +25%, 차량에 붙은 보병은 +20%. 2층 이상 높은 곳에서 쏘면 +15%</li><li>저격수는 건물 안에 있으면 붙어 있는 적에게만 보입니다(쏘면 잠시 드러남)</li></ul>
<h3>건물 파괴</h3><ul class="rules"><li>폭발물은 건물 자체를 쏠 수 있고, 안에 숨은 적도 함께 피해를 입습니다</li><li>내구가 0이 되면 건물이 무너져 잔해가 되고, 안에 있던 부대는 큰 피해를 입습니다</li></ul>
<h3>증원과 화력 지원</h3><ul class="rules"><li>지휘점수로 집결지나 거점 옆에 증원을 부릅니다</li><li>포병 사격(3×3), 근접 항공 지원(한 칸, 건물 붕괴), 연막(3×3 시야 차단)은 ${SUP_CD}초마다 하나씩, 연막 말고는 보이는 곳에만 씁니다</li></ul>
<h3>화면</h3><ul class="rules"><li>드래그: 이동 · 두 손가락: 확대·회전 · 마우스 휠: 확대 · 오른쪽 드래그 또는 Shift+드래그: 회전·기울기</li><li>키보드: WASD 이동, Q/E 회전, R/F 기울기, Space 일시정지</li></ul>`;
function showSetup(){const sl=$('#scn-list');if(sl&&typeof scnButtons==='function')sl.innerHTML=scnButtons();
  const box=$('#slots');box.innerHTML=NATS.map((N2,i)=>`<div class="slot"><i class="sw" style="background:${N2.col}"></i><label for="slot-${i}">${N2.full} <small>${N2.edge}</small></label><select id="slot-${i}"><option value="human">사람</option><option value="ai">AI</option>${i>1?'<option value="none">없음</option>':''}</select></div>`).join('');
  NATS.forEach((_,i)=>{$('#slot-'+i).value=UI.setupSlots[i]||'none';});$('#b-resume').hidden=!loadSave();$('#setup').hidden=false;}
