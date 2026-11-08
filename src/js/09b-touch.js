/* ===================== 터치 지휘 =====================
   휴대폰에서 작은 병사를 손가락으로 집기 어렵기 때문에:
   - 부대 목록(화면 아래 칩): 탭하면 고르고 카메라가 그 부대로 간다. 다시 탭하면 해제
   - 길게 누른 채 끌기: 범위 안의 아군을 한꺼번에 선택
   - 길게 누르기(끌지 않음): 그 지점 정보
   - 두 손가락 탭: 선택·명령 모드 취소
   - 명령을 내린 지점에 잠깐 표시가 뜬다 */
function canCmd(){return G&&!G.over&&!G.boot&&!isAI(G.viewer)&&$('#setup').hidden;}
function boxSelect(a,b){if(!canCmd()||typeof V3==='undefined'||!V3.cam)return;const n=G.viewer;const r=V3.cv.getBoundingClientRect();
  const x0=Math.min(a[0],b[0]),x1=Math.max(a[0],b[0]),y0=Math.min(a[1],b[1]),y1=Math.max(a[1],b[1]);const v=new V3.T.Vector3();
  const us=G.units.filter(u=>{if(u.nat!==n)return false;const o=V3.uo.get(u.id);if(!o)return false;v.copy(o.position);if(typeof v3TY==='function')v.y+=v3TY(v.x,v.z);v.project(V3.cam);
    const sx=(v.x+1)/2*r.width+r.left,sy=(1-v.y)/2*r.height+r.top;return sx>=x0-10&&sx<=x1+10&&sy>=y0-10&&sy<=y1+10;});
  if(!us.length){toast('범위 안에 아군이 없습니다');return;}
  clearSel();select(us[0]);UI.group=us.slice(1);toast(`${us.length}개 부대 선택`);render();}
function holdTap(k){if(!G)return;const r=kr(k),c=kc(k),x=cell(r,c),n=G.viewer;const pid=V3.pickId;const u0=pid!=null?G.units.find(z=>z.id===pid):null;
  const u=u0&&(!G.fog||seen(u0,n))?u0:null;const vis=!G.fog||visSet(n).has(k);
  let s=x.obj!=null?`${G.objs[x.obj].name} · ${natName(x.owner)} · `:'';s+=x.t==='bldg'?`${x.f}층 건물 ${Math.ceil(x.bhp)}/${x.bmax}`:TT[x.t].n;
  if(u)s=`${natName(u.nat)} ${UT[u.type].n} · ${uHealth(u)}`;if(!vis)s+=' · 시야 밖';toast(s);}
function twoTap(){if(!G||(!UI.sel&&!UI.phase&&!UI.pane))return;clearSel();UI.pane=null;toast('선택 해제');render();}
/* 명령 지점 표시: 땅 위에 퍼지는 고리 */
function v3Ping(x,z,col){if(typeof V3==='undefined'||!V3.on||!V3.T)return;const T=V3.T;
  const m=new T.Mesh(new T.RingGeometry(.12,.2,28),new T.MeshBasicMaterial({color:col||'#f2efe6',transparent:true,depthWrite:false,side:T.DoubleSide}));
  m.rotation.x=-Math.PI/2;m.position.set(x,.08,z);m.renderOrder=5;V3.G.fx.add(m);
  V3.fx.push({o:m,t0:performance.now(),dur:650,upd:(o,k)=>{o.scale.setScalar(1+k*2.2);o.material.opacity=1-k;}});}
/* 부대 목록 */
let rosterSig='',rosterSel=null;
function renderRoster(){const el=$('#roster');if(!el)return;const n=G.viewer;
  const show=canCmd()&&!UI.phase?.match?.(/^(buy|sup)$/);const us=show?G.units.filter(u=>u.nat===n):[];
  const sel=new Set([UI.sel,...(UI.group||[])].filter(Boolean).map(u=>u.id));
  const hp=u=>{const c=typeof casSummary==='function'?casSummary(u):null;return c?(c.ok+c.lw)/Math.max(1,u.ws.length):u.hp/hpMax(u);};
  const sig=us.map(u=>`${u.id}${sel.has(u.id)?'*':''}${Math.round(hp(u)*8)}${u.path&&u.path.length?'m':''}${u.tgt!=null?'t':''}${u.brk?'b':''}`).join(',');
  if(sig===rosterSig)return;rosterSig=sig;el.hidden=!us.length;
  el.innerHTML=us.map(u=>{const f=Math.max(0,Math.min(1,hp(u)));const st=u.brk?'공황':u.path&&u.path.length?'이동':u.tgt!=null?'교전':'';
    return `<button class="rc" data-act="pick:${u.id}" id="rc-${u.id}" aria-pressed="${sel.has(u.id)}"><b>${UT[u.type].n}</b>${st?`<small>${st}</small>`:''}<i style="--f:${f};--c:${f>.6?'#5cd18a':f>.3?'#f0c45a':'#ff6a3d'}"></i></button>`;}).join('');
  const sid=UI.sel?UI.sel.id:null;if(sid!==rosterSel){rosterSel=sid;const on=$('#rc-'+sid);if(on&&on.scrollIntoView)on.scrollIntoView({block:'nearest',inline:'center'});}}
function rosterPick(id){if(!canCmd())return;const u=G.units.find(x=>x.id===id&&x.nat===G.viewer);if(!u)return;
  if(UI.sel===u&&!(UI.group||[]).length){clearSel();render();return;}
  UI.group=[];select(u);if(typeof V3!=='undefined'&&V3.cs){V3.cs.gx=u.x;V3.cs.gz=u.z;}}
if(typeof document!=='undefined')document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;
  if(a==='more'){const m=$('#mapctl');const o=!m.classList.contains('open');m.classList.toggle('open',o);b.setAttribute('aria-expanded',o?'true':'false');return;}
  // 지도 버튼 밖의 버튼을 누르면 펼친 지도 버튼은 접는다
  if(!b.closest('#mapctl'))closeMore();
  if(a.startsWith('pick:'))rosterPick(+a.slice(5));});
function closeMore(){const m=$('#mapctl');if(m&&m.classList.contains('open')){m.classList.remove('open');const mb=$('#b-more');if(mb)mb.setAttribute('aria-expanded','false');}}
