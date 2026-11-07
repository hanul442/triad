/* ===================== 3D: 부상자·후송조·환자집결지·차량 피격 =====================
   05g-casualty의 상태를 그린다.
   - 중상자는 그 자리에 누워 있다(엎드린 자세, 피 웅덩이). 끌려가면 끌려간 자리로 미끄러진다.
   - 후송조: 한 사람이 부상자를 어깨에 메고 걷는다. 부상자를 데리러 가거나 돌아올 때는 혼자 뛴다.
   - 분대가 끝난 자리에 남겨진 부상자(G.cas)도 누워 있다.
   - 환자집결지: 자기 편 출발 지역의 천막 하나와 흰 깃발.
   - 차량: 뚫린 곳에서 불꽃이 튀고, 유폭은 큰 폭발과 불길. */
FXH.cas=function(u,m,out){if(!V3.on)return;const x=m.x,z=m.z;if(out==='hw'||out==='kia')dsScar('blood',x,z,out==='kia'?.06:.05);if(m.orph)return;};
FXH.cook=function(x,z,big){if(!V3.on)return;const y=v3TopAt(x,z);setTimeout(()=>{v3Burst(x,y+.1,z,big?1.8:1.1,'#ff7a2a',big?9:5,big?6:3);dsSpray(x,y+.1,z,big?90:50,big?1:.7);dsScar('scorch',x,z,big?.32:.22);dsFires(x,z,big?6:3,60000,.5,.05);dsDust(x,z,1.2,9000,5,'#4a4540');
  V3.shake=Math.max(V3.shake,big?.22:.12);if(typeof sndCook==='function')sndCook(x,z,big);},0);};
FXH.vhit=function(u,r){if(!V3.on)return;const o=V3.uo.get(u.id);if(!o)return;const p=o.position;setTimeout(()=>{v3Burst(p.x,p.y+.12,p.z,.35,'#ffd27a',1,1.2);if(r>.78||u.vd&&u.vd.fire)dsFires(p.x,p.z,2,8000,.15,p.y+.1);},180);};
/* 쓰러진 병사가 시체로 바뀐 것을 기억(후송 중 죽은 병사도 한 번만 시체로) */
{const _c=v3Corpse;v3Corpse=function(s,o,nat){if(s.cx)return;s.cx=1;return _c(s,o,nat);};}
/* 병사 보이기: 후송 중이면 분대 쪽 모형은 숨기고, 돌아오면 다시 보인다 */
{const _a=v3MenAnim;v3MenAnim=function(o,uu,dt,now,fa){const M=uu._men,S=o.userData.sold;
   S.forEach((s,i)=>{const m=M[i];if(!m||s.cx)return;if(m.gone&&!m.dead)s.m.visible=false;else if(!s.m.visible){s.m.visible=true;if(m.dead){s.wx=m.x;s.wz=m.z;}}});
   _a(o,uu,dt,now,fa);
   // 쓰러진 사람은 팔다리를 움직이지 않는다
   S.forEach((s,i)=>{const m=M[i];if(m&&m.down&&s.m.userData.legL){s.m.userData.legL.rotation.z=.2;s.m.userData.legR.rotation.z=-.1;}});};}
function v3CasFig(nat,lying){const f=v3Soldier(nat,'rifle');if(lying){f.rotation.z=-1.42;f.position.y=.012;}return f;}
/* 후송조·남겨진 부상자·환자집결지를 맞춘다(매 동기화) */
function v3SyncCas(vs,vn){const T=V3.T;V3.evo=V3.evo||new Map();V3.orpo=V3.orpo||new Map();const see=(x,z)=>!G.fog||!vs||vs.has(key(Math.floor(z),Math.floor(x)));
  const keepE=new Set();
  for(const p of G.evac||[]){if(!see(p.x,p.z)&&p.nat!==vn)continue;keepE.add(p.id);let o=V3.evo.get(p.id);
    if(!o){o=new T.Group();const car=v3CasFig(p.nat,false);o.add(car);const cas=v3CasFig(p.nat,false);cas.rotation.set(0,0,-1.5);cas.position.set(-.004,.1,0);car.add(cas);
      o.userData={car,cas,ph:.0};o.position.set(p.x,v3TopAt(p.x,p.z),p.z);V3.G.units.add(o);V3.evo.set(p.id,o);}
    o.userData.p=p;o.userData.cas.visible=p.ph==='out';}
  for(const [id,o] of V3.evo)if(!keepE.has(id)){V3.G.units.remove(o);V3.evo.delete(id);}
  const keepO=new Set();
  for(const c of G.cas||[]){if(!see(c.x,c.z))continue;keepO.add(c.id);if(V3.orpo.has(c.id))continue;const f=v3CasFig(c.nat,true);const g=new T.Group();g.add(f);g.position.set(c.x,v3TopAt(c.x,c.z),c.z);f.rotation.y=Math.random()*6.28;V3.G.units.add(g);V3.orpo.set(c.id,g);}
  for(const [id,o] of V3.orpo)if(!keepO.has(id)){V3.G.units.remove(o);V3.orpo.delete(id);
    const still=(G.cas||[]).some(c=>c.id===id);const taken=(G.evac||[]).some(p=>p.cas.orph===id);// 숨이 멎었으면 시체로 남긴다
    if(!still&&!taken){const s={m:v3CasFig(0,false),wx:o.position.x,wz:o.position.z};s.m.visible=true;v3Corpse(s,{position:o.position},0);}}
  // 환자집결지 천막: 내 편 것만(적 것은 보일 때)
  V3.ccpo=V3.ccpo||new Map();
  for(const n of G.order||[]){const c=ccpOf(n);const vis=n===vn||see(c.x,c.z);let o=V3.ccpo.get(n);
    if(o&&o.userData.seed!==G.seed){V3.G.units.remove(o);V3.ccpo.delete(n);o=null;}
    if(!o&&vis){o=new T.Group();const tan=new T.MeshStandardMaterial({color:n%2?'#8a7e62':'#6f7158',roughness:1});const wh=new T.MeshStandardMaterial({color:'#e9e6dc',roughness:.9});
      const roof=new T.Mesh(new T.CylinderGeometry(.13,.13,.26,3,1,false),tan);roof.rotation.z=Math.PI/2;roof.rotation.x=Math.PI/2;roof.position.y=.065;roof.scale.set(1,1,.62);roof.castShadow=true;o.add(roof);
      const pole=new T.Mesh(new T.BoxGeometry(.006,.2,.006),V3.M.dark||tan);pole.position.set(.17,.1,.1);o.add(pole);const fl=new T.Mesh(new T.BoxGeometry(.07,.045,.003),wh);fl.position.set(.205,.17,.1);o.add(fl);
      for(let i=0;i<3;i++){const st=new T.Mesh(new T.BoxGeometry(.09,.012,.035),wh);st.position.set(-.06+i*.06,.006,.16);o.add(st);}// 들것
      o.position.set(c.x,v3TopAt(c.x,c.z),c.z);o.userData.seed=G.seed;V3.G.units.add(o);V3.ccpo.set(n,o);}
    if(o)o.visible=vis;}}
/* 매 프레임: 후송조 걷기 */
function v3AnimCas(dt,now){if(!V3.evo)return;for(const o of V3.evo.values()){const p=o.userData.p;if(!p)continue;const k=1-Math.exp(-dt*8);
    const px=o.position.x,pz=o.position.z;o.position.x+=(p.x-px)*k;o.position.z+=(p.z-pz)*k;o.position.y=v3TopAt(p.x,p.z);
    const sp=Math.hypot(o.position.x-px,o.position.z-pz)/Math.max(dt,1e-3);const car=o.userData.car;
    if(sp>.02){const want=-Math.atan2(p.z-pz,p.x-px);let d=want-car.rotation.y;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;car.rotation.y+=d*Math.min(1,dt*8);}
    const sw=Math.min(1,sp/.3)*Math.sin(now/(p.ph==='out'?110:70))*.6;if(car.userData.legL){car.userData.legL.rotation.z=sw;car.userData.legR.rotation.z=-sw;}}}
{const _s=v3SyncUnits;v3SyncUnits=function(vs,vn){_s(vs,vn);try{v3SyncCas(vs,vn);}catch(e){console.warn(e);}};
 const _a=v3AnimUnits;v3AnimUnits=function(dt,now){_a(dt,now);if(dt>0)v3AnimCas(dt,now);};}
/* 이름표: 보병은 병사 한 명당 칸 하나(초록 정상, 노랑 경상, 빨강 중상, 회색 후송 중, 검정 전사), 차량은 체력 + 고장 */
function v3UnitTag(u){if(UT[u.type].cls==='inf'&&u.ws){return `<i class="pp">${u.ws.map(w=>`<b class="${w.s==='orph'||w.s==='rear'?'ev':w.y&&w.s!=='hw'?'aw':w.s==='hw'&&w.y?'hy':w.s}"></b>`).join('')}</i>`;}
  const hm=hpMax(u);const hc=u.hp>hm*.6?'#5cd18a':u.hp>hm*.3?'#f0b23a':'#ff5a4e';let h=`<i><s style="width:${Math.round(u.hp/hm*100)}%;background:${hc}"></s></i>`;
  if(u.vd){if(u.vd.mob)h+='<em title="기동 불능">궤</em>';if(u.vd.gun)h+='<em title="무장 파손">포</em>';const cd=u.vd.crew.filter(c=>c!=='ok').length;if(cd)h+=`<em title="승무원 부상">승${cd}</em>`;}
  return h;}
function v3MorTag(u){if(UT[u.type].cls!=='inf')return '';if(u.brk)return '<em class="br" title="공황: 후퇴 중, 명령 불가">공황</em>';if((u.supp||0)>=PINNED)return '<em title="제압: 꼼짝 못 함">제압</em>';if((u.mor??80)<50)return '<em class="sh" title="사기 저하: 사격 느림">흔들림</em>';return '';}
