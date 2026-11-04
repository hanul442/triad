/* ===================== STAFF BRIEFING ===================== */
function makeBrief(n,inc){const B=[];const N=G.nats[n];const vs=visSet(n);
  B.push(['부관',`이번 턴 수입 자금 ${inc[0]>=0?'+':''}${inc[0]} · 철강 +${inc[1]} · 석유 +${inc[2]}${N.staff.length?` (참모 급여 −${N.staff.length} 포함)`:''}.`]);
  if(G.event)B.push(['속보',`${G.event[0]} — ${G.event[1]}.`]);
  if(G.done)B.push(['연구',`${TECH[G.done].n} 개발 완료: ${TECH[G.done].desc}.`]);
  B.push(['기상',`${String(hourOf()).padStart(2,'0')}:00 ${isNight()?'야간 (전 부대 시야 −1)':'주간'} · ${WX[G.wx].n} (${WX[G.wx].desc}).${hasStaff(n,'g2')?` 다음 라운드 예보: ${WX[G.wxNext].n}.`:''}`]);
  {let oc=0;for(const row of G.map)for(const x of row)if(x.owner===n&&x.occ>0)oc++;if(oc)B.push(['민사',`점령지 ${oc}곳 안정화 중 (수입 50%). 수비 병력이 없으면 저항군이 봉기할 수 있습니다.${G.partisan?` 이번 턴 봉기 ${G.partisan}건.`:''}`]);}
  {const L0=leader();if(L0.id===n&&L0.share>0.38)B.push(['G2',`우리가 전체 국력의 ${Math.round(L0.share*100)}%를 차지해 주변국들이 반(反)${natName(n)} 연합으로 결집하고 있습니다.`]);}
  {const T=terr();const fr={};for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){if(T[r][c]!==n)continue;for(const [a,b] of nbrs(r,c)){const o=T[a][b];if(o!=null&&o!==n&&hostile(n,o))fr[o]=(fr[o]||0)+1;}}
    const ks=Object.keys(fr);if(ks.length)B.push(['G3',`전선 접촉: ${ks.map(o=>`${natName(+o)} ${fr[o]}구간`).join(' · ')}. 철책·벙커로 전선을 굳히세요.`]);}
  {let mine=0,theirs=0;for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const x=G.map[r][c];if(!(x.t==='city'||x.t==='hq'||(x.bld&&x.bld.type==='port')))continue;if(!blockaded(r,c))continue;if(x.owner===n)mine++;else if(nbrs(r,c).some(([a,b])=>{const u=unitAt(a,b);return u&&u.nat===n&&warship(u.type);}))theirs++;}
    if(mine||theirs)B.push(['해군',`${mine?`아군 거점 ${mine}곳이 적 함대에 봉쇄됨 (수입·함정 생산 차단). `:''}${theirs?`아군 함대가 적 거점 ${theirs}곳을 봉쇄 중.`:''}`]);}
  if(G.supInfo.isol)B.push(['부관',`포위·고립된 부대 ${G.supInfo.isol}기가 보급 단절로 전력 손실 중입니다.`]);
  const [hr,hc]=N.hq;const foes=G.units.filter(e=>hostile(n,e.nat)&&seen(e,n,vs));
  if(hasStaff(n,'g2')){const th=G.nats.filter(M=>M.alive&&hostile(n,M.id)&&silos(M.id).some(([a,b])=>dist(a,b,hr,hc)<=MSL.b.rng)).map(M=>natName(M.id));
    if(th.length)B.push(['G2',`${th.join('·')}의 미사일 기지가 수도를 사정권에 두고 있습니다. 대공포·SAM 배치와 미사일 방어망 연구를 권고합니다.`]);
    const near=foes.filter(e=>dist(e.r,e.c,hr,hc)<=6);
    B.push(['G2',near.length?`수도 반경 6 내 적 ${near.length}기 포착 (${[...new Set(near.map(e=>natName(e.nat)))].join('·')}). 방어 태세 권고.`:`수도 주변 이상 없음. 식별된 적 병력 ${foes.length}기.`]);}
  if(hasStaff(n,'g3')){let best=null;for(const u of G.units){if(u.nat!==n||!hasAmmo(u))continue;const RS=reach(u);
      for(const e of foes){if(!dmgBase(u.type,e.type))continue;let can=false;
        if(UT[u.type].ind)can=canHit(u,e);else for(const k of RS.keys())if(dist(kr(k),kc(k),e.r,e.c)===1){can=true;break;}
        if(!can)continue;const d=calcDmg(u,e,false);const v=d*UT[e.type].cost[0]+(d>=e.hp?20:0);if(!best||v>best.v)best={u,e,d,v};}}
    if(best){G.hint={u:best.u.id,t:key(best.e.r,best.e.c)};B.push(['G3',`${UT[best.u.type].n}로 ${natName(best.e.nat)} ${UT[best.e.type].n} 타격 권고 (예상 피해 ${best.d}${best.d>=best.e.hp?', 격파 가능':''}). 지도에 점선으로 표시했습니다.`]);}
    else B.push(['G3','즉시 타격 가능한 목표 없음. 중립 거점 확보를 권고합니다.']);}
  if(hasStaff(n,'g4')){const s=G.supInfo;B.push(['G4',`보급선 밖 부대 ${s.unsup}기${s.short?`, 자원 부족으로 보급 실패 ${s.short}건`:''}${s.crashed?`, 항공기 추락 ${s.crashed}기`:''}. 비축 철강 ${N.s} · 석유 ${N.o}.`]);}
  else if(G.supInfo.unsup)B.push(['부관',`보급선 밖 부대 ${G.supInfo.unsup}기. 군수참모를 두면 상세 보고를 받습니다.`]);
  if(hasStaff(n,'eng')){let cnt=0;for(const row of G.map)for(const x of row)if(x.owner===n&&x.bld&&x.bld.left)cnt++;B.push(['G7',`진행 중 공사 ${cnt}건. 건설비 30% 절감 적용 중.`]);}
  {let st=0,cap=0;for(const id in (G.hangar||{})){const k=+id;if(cell(kr(k),kc(k)).owner===n){st+=G.hangar[id].length;cap+=baseCap(k);}}if(cap)B.push(['공군',`격납 항공기 ${st}/${cap}대${G.tankered?` · 공중급유 ${G.tankered}회`:''}.`]);}if(G.replen)B.push(['해군',`보급함이 함정 ${G.replen}척을 해상 보급했습니다.`]);G.tankered=0;G.replen=0;
  if(hasStaff(n,'air')){const low=G.units.filter(u=>u.nat===n&&UT[u.type].d==='air'&&u.fuel<=10).length;B.push(['A3',low?`연료 10 이하 항공기 ${low}기, 비행장 귀환 필요.`:'항공 전력 연료 양호.']);}
  return B;}
