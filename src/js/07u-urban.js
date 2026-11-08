/* ===================== 3D·조작: 쥐구멍·지하·땅굴·폭약·저격 표시·민간인·자폭 차량 =====================
   05n-*.js 규칙을 보여 주고 명령 버튼을 단다. 기존 화면 함수(fortBar, fortTip, tap, renderActbar, uInfo,
   v3VehicleM, v3FortFrame)는 감싸서 덧붙이기만 한다. */
const UGV={civCol:['#c9c2b3','#5b6b7d','#8a5a44','#d8d3c8','#4d5a3f','#9b8f7a','#2f3338','#b07a52'],lab:new Map()};
/* 글자 딱지(스프라이트). 같은 글자·색은 한 번만 그린다 */
function ugLabel(txt,col,bg){const k=txt+'|'+col+'|'+(bg||'');let tex=UGV.lab.get(k);const T=V3.T;
  if(!tex){const cv=document.createElement('canvas');cv.width=128;cv.height=40;const g=cv.getContext('2d');g.font='bold 22px sans-serif';g.textAlign='center';g.textBaseline='middle';
    const w=Math.min(124,g.measureText(txt).width+18);g.fillStyle=bg||'rgba(16,18,20,.72)';g.beginPath();if(g.roundRect)g.roundRect(64-w/2,4,w,32,8);else g.rect(64-w/2,4,w,32);g.fill();
    g.fillStyle=col||'#eee';g.fillText(txt,64,21);tex=new T.CanvasTexture(cv);UGV.lab.set(k,tex);}
  const s=new T.Sprite(new T.SpriteMaterial({map:tex,transparent:true,depthTest:false,depthWrite:false}));s.scale.set(.42,.13,1);s.renderOrder=20;s.userData.keepMat=0;return s;}
function ugMats(){if(V3.ugm)return V3.ugm;const T=V3.T;return V3.ugm={
  hole:new T.MeshBasicMaterial({color:'#15130f'}),pit:new T.MeshBasicMaterial({color:'#1b1712'}),dirt:new T.MeshStandardMaterial({color:'#6e5e47',roughness:1,flatShading:true}),
  line:new T.LineDashedMaterial({color:'#e8dcc0',dashSize:.08,gapSize:.06,transparent:true,opacity:.45,depthWrite:false}),
  bomb:new T.MeshBasicMaterial({color:'#ff4b2b'}),ring:new T.MeshBasicMaterial({color:'#ff5a3c',transparent:true,opacity:.6,side:T.DoubleSide,depthWrite:false}),
  steel:new T.MeshStandardMaterial({color:'#8a8478',roughness:.7,metalness:.4,flatShading:true})};}
function ugGeos(){if(V3.ugg)return V3.ugg;const T=V3.T;return V3.ugg={hole:new T.BoxGeometry(.11,.11,.11),pit:new T.CylinderGeometry(.065,.065,.012,10),
  mound:new T.TorusGeometry(.085,.025,4,10).rotateX(Math.PI/2),bomb:new T.BoxGeometry(.05,.03,.04),ring:new T.RingGeometry(.22,.27,24).rotateX(-Math.PI/2),
  civ:new T.BoxGeometry(.032,.13,.026).translate(0,.065,0)};}
function ugReset(){const T=V3.T;if(V3.ugGrp)V3.scene.remove(V3.ugGrp);V3.ugGrp=new T.Group();V3.scene.add(V3.ugGrp);V3.ugObj=new Map();V3.ugOf=G;
  const CAP=420;const im=new T.InstancedMesh(ugGeos().civ,new T.MeshStandardMaterial({color:'#ffffff',roughness:1}),CAP);im.count=0;im.castShadow=true;im.frustumCulled=false;
  im.instanceColor=new T.InstancedBufferAttribute(new Float32Array(CAP*3),3);V3.ugCiv=im;V3.ugGrp.add(im);}
/* 그릴 것 하나를 id로 붙잡아 두고, 이번 프레임에 안 쓰였으면 지운다 */
function ugGet(id,mk){let o=V3.ugObj.get(id);if(!o){o=mk();V3.ugObj.set(id,o);V3.ugGrp.add(o);}o.userData.live=V3.ugTick;return o;}
function ugFrame(){if(!G||!V3.T||!V3.scene)return;if(V3.ugOf!==G||!V3.ugGrp)ugReset();const T=V3.T,M=ugMats(),Gm=ugGeos();V3.ugTick=(V3.ugTick||0)+1;
  const vn=G.viewer,fog=G.fog&&!G.spec,now=performance.now(),t=G.time||0;const mine=n=>n===vn||!fog;
  // 쥐구멍
  for(const [k,h] of Object.entries(G.mh||{}))ugGet('mh'+k,()=>{const m=new T.Mesh(Gm.hole,M.hole);m.position.set(h.x,.055,h.z);return m;});
  // 땅굴 입구와 (우리 편이면) 지나는 길
  for(const T2 of G.tun||[]){if(T2.dead)continue;const show=mine(T2.nat)||T2.kn[vn];if(!show)continue;
    for(const [e,p] of [['a',T2.a],['b',T2.b]]){if(e==='b'&&T2.prog<1)continue;ugGet(`tu${T2.id}${e}`,()=>{const g=new T.Group();const pit=new T.Mesh(Gm.pit,M.pit);pit.position.y=.007;const md=new T.Mesh(Gm.mound,M.dirt);md.position.y=.015;g.add(pit,md);g.position.set(p[0],0,p[1]);return g;});}
    if(mine(T2.nat)){const L=ugGet(`tl${T2.id}`,()=>{const geo=new T.BufferGeometry().setFromPoints([new T.Vector3(T2.a[0],.025,T2.a[1]),new T.Vector3(T2.b[0],.025,T2.b[1])]);const l=new T.Line(geo,M.line);l.computeLineDistances();return l;});
      const k=Math.max(.02,T2.prog);L.scale.set(1,1,1);L.geometry.setDrawRange(0,2);if(k<1){const x=T2.a[0]+(T2.b[0]-T2.a[0])*k,z=T2.a[1]+(T2.b[1]-T2.a[1])*k;const P=L.geometry.attributes.position;P.setXYZ(1,x,.025,z);P.needsUpdate=true;L.computeLineDistances();}
      else if(!L.userData.full){const P=L.geometry.attributes.position;P.setXYZ(1,T2.b[0],.025,T2.b[1]);P.needsUpdate=true;L.computeLineDistances();L.userData.full=1;}
      if(T2.prog<1){const s=ugGet(`tp${T2.id}`,()=>ugLabel('땅굴 파는 중','#e8dcc0'));s.position.set(T2.a[0],.3,T2.a[1]);s.material.opacity=.85;}}}
  // 지하·땅굴 안 부대: 3D에서 숨기고, 우리 편이면 딱지
  for(const u of G.units){if(!u.tun&&!u.bsm&&!u.bsmGo)continue;const o=V3.uo.get(u.id);
    if(o&&(u.tun||u.bsm))o.visible=false;if(!mine(u.nat))continue;
    let x=u.x,z=u.z,txt=u.bsmGo?(u.bsmGo.down?'지하로…':'올라오는 중'):'지하실';
    if(u.tun){const T2=tunById(u.tun.id);if(T2){const to=T2[u.tun.to],fr=u.tun.to==='a'?T2.b:T2.a;const dur=T2.len/(UG.tunSpd*UT[u.type].mv*SPD_K);const k=Math.max(0,Math.min(1,1-(u.tun.t-t)/dur));x=fr[0]+(to[0]-fr[0])*k;z=fr[1]+(to[1]-fr[1])*k;}txt='땅굴 이동';}
    const s=ugGet('ul'+u.id+txt,()=>ugLabel(txt,'#d9e6f2'));s.position.set(x,.22,z);}
  // 폭약(우리 편 것만, 기폭 중이면 빨리 깜빡)
  for(const d of G.demo||[]){if(d.gone||!mine(d.nat))continue;const x=d.c+.5,z=d.r+.5;const b=ugGet('db'+d.id,()=>{const m=new T.Mesh(Gm.bomb,M.bomb);m.position.set(x,.03,z);return m;});
    b.visible=Math.floor(now/(d.fuse!=null?90:600))%2===0;const s=ugGet('dl'+d.id,()=>ugLabel('폭약','#ffb39e'));s.position.set(x,bldgH(G.map[d.r][d.c])*FLOOR_H+.12,z+.16);}
  // 저격 추정 위치(우리 편이 맞았을 때)
  for(const m of G.snpMk||[]){if(m.t<=t||(fog&&m.n!==vn))continue;const id='sm'+m.id+'_'+Math.round(m.x*100);
    const r=ugGet(id,()=>{const g=new T.Group();const ring=new T.Mesh(Gm.ring,M.ring.clone());ring.position.y=.03;g.add(ring);const s=ugLabel('저격 추정','#ffd0c4');s.position.y=.3;g.add(s);g.position.set(m.x,0,m.z);return g;});
    const k=1+.15*Math.sin(now/180);r.children[0].scale.set(k,1,k);r.children[0].material.opacity=Math.min(.6,(m.t-t)/SNP.mark);}
  // 민간인: 건물 표시(숫자) + 피란 무리
  if(G.civOn){for(let rr=0;rr<N;rr++)for(let cc=0;cc<N;cc++){const x=G.map[rr][cc];if(!x.civ||x.t!=='bldg')continue;
      const s=ugGet(`cv${rr}_${cc}_${x.civ}`,()=>{const s=ugLabel(`민간인 ${x.civ}`,'#e6eef7','rgba(52,78,104,.78)');s.scale.set(.34,.105,1);return s;});s.position.set(cc+.5,bldgH(x)*FLOOR_H+.1,rr+.38);}
    const im=V3.ugCiv;const mat=new T.Matrix4(),q=new T.Quaternion(),sc=new T.Vector3(1,1,1),ps=new T.Vector3(),col=new T.Color();let i=0;
    for(const g of G.civF||[]){if(g.n<=0)continue;if(fog&&typeof seenPt==='function'&&!seenPt(vn,g.x,g.z))continue;const k=Math.min(8,g.n);const p=g.path[0]||[g.x,g.z];const fa=Math.atan2(p[0]-g.x,p[1]-g.z);
      for(let j=0;j<k&&i<im.count+420;j++){if(i>=420)break;const a=j*2.4+g.id,rd=.035+.03*(j%3);const bob=Math.abs(Math.sin(now/140+j*1.7))*.008;
        ps.set(g.x+Math.cos(a)*rd,bob,g.z+Math.sin(a)*rd);q.setFromAxisAngle(new T.Vector3(0,1,0),fa);sc.set(1,j%4===3?.62:1,1);mat.compose(ps,q,sc);im.setMatrixAt(i,mat);
        col.set(UGV.civCol[(g.id*7+j*3)%UGV.civCol.length]);im.setColorAt(i,col);i++;}}
    im.count=i;im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;}
  for(const [id,o] of V3.ugObj)if(o.userData.live!==V3.ugTick){V3.ugGrp.remove(o);V3.ugObj.delete(id);}}
if(typeof v3FortFrame==='function'){const _f=v3FortFrame;v3FortFrame=function(){_f();try{ugFrame();}catch(e){if(!UGV.err){UGV.err=1;console.warn('ugFrame',e);}}};}
/* ---------- 효과 ---------- */
FXH.mhole=function(h){if(typeof V3==='undefined'||!V3.on)return;try{dsDust(h.x,h.z,.35,1400,6,'#a39a88');v3Debris(h.x,.06,h.z,7,.45);v3Burst(h.x,.06,h.z,.25,'#ffb070',1,.4);}catch(e){}};
FXH.tunGone=function(T2){if(typeof V3==='undefined'||!V3.on)return;try{for(const p of [T2.a,T2.b]){dsDust(p[0],p[1],.5,2400,8,'#8a7a62');dsScar('crater',p[0],p[1],.12);}}catch(e){}};
FXH.demo=function(x,z,f){if(typeof V3==='undefined'||!V3.on)return;try{const y=(f||1)*FLOOR_H*.5;v3Burst(x,y,z,1.4,'#ff7a2a',6,4);dsColumn(x,z,1.6);dsDust(x,z,2.4,30000,50);dsSpray(x,y,z,220,1);v3Debris(x,y,z,30,1.6);V3.shake=Math.max(V3.shake||0,.12);}catch(e){}};
FXH.vbBoom=function(x,z,R){if(typeof V3==='undefined'||!V3.on)return;try{v3Burst(x,.2,z,R*1.1,'#ff6a1a',8,6);dsColumn(x,z,R*1.4);dsDust(x,z,R*2,30000,55);dsSpray(x,.3,z,280,R*1.1);v3Debris(x,.2,z,34,1.8);
  dsScar('crater',x,z,.32);dsFires(x,z,6,40000,.9);V3.shake=Math.max(V3.shake||0,.16);}catch(e){}};
/* 자폭 차량: 민간 픽업에 철판을 덧댄 모습 */
if(typeof v3VehicleM==='function'){const _v=v3VehicleM;v3VehicleM=function(ty,g,n){if(ty!=='vbied')return _v(ty,g,n);const c=_v('hmv',g,n|1);const T=V3.T,M=ugMats(),m=MU;
  for(const [w,h,d,x,y,z] of [[.06*m,1.1*m,2.6*m,1.05*m,1.1*m,0],[.06*m,1.1*m,2.6*m,-1.05*m,1.1*m,0],[2.1*m,.9*m,.06*m,0,1.2*m,2.3*m],[1.9*m,.5*m,1.6*m,0,1.6*m,-.9*m]]){const b=new T.Mesh(new T.BoxGeometry(w,h,d),M.steel);b.position.set(x,y,z);b.castShadow=true;c.add(b);}
  c.traverse(o=>{if(o.isMesh&&o.userData.turret)o.visible=false;});return c;};}
/* ---------- 버튼과 탭 ---------- */
const ugSel=()=>{const s=UI.sel&&G.units.includes(UI.sel)?UI.sel:null;return s?[s,...(UI.group||[])].filter(x=>x&&G.units.includes(x)&&x.nat===G.viewer):[];};
function ugBar(s){if(!s||s.nat!==G.viewer)return '';const t=UT[s.type];let h='';const ph=UI.phase;const b=(a,txt,on,dis,tip)=>`<button class="btn sm${on?' primary':''}" data-act="${a}" id="ab-${a.replace(':','-')}" ${dis?'disabled':''} title="${tip||''}">${txt}</button>`;
  if(s.type==='vbied')return b('ug:det','지금 폭파',false,false,'그 자리에서 터뜨린다');
  if(t.cls!=='inf')return '';
  if(mhTypes(s.type))h+=b('ug:mh','벽 뚫기',ph==='ug:mh',false,'붙어 있는 건물 벽에 쥐구멍을 낸다');
  if(s.bsm||s.bsmGo||bsmHas(cell(s.r,s.c)))h+=b('ug:bsm',s.bsm?'지상으로':'지하실로',!!s.bsm,!!s.bsmGo,'포격·폭격에 거의 안 다치고 안 보이지만 같은 칸의 적과만 싸운다');
  if(s.type==='eng')h+=b('ug:tun',`땅굴 ${UG.tunCost}`,ph==='ug:tun',G.nats[s.nat].cp<UG.tunCost,`건물·잔해 안에서 ${UG.tunMax}칸까지 땅굴을 판다`);
  if(s.type==='eng'||s.type==='rifle')h+=b('ug:demo',`폭약 ${DEMO.cost}`,ph==='ug:demo',G.nats[s.nat].cp<DEMO.cost,'건물에 폭약을 숨겨 둔다. 적이 들어오면 보고 있다가 터뜨린다');
  return h;}
if(typeof fortBar==='function'){const _fb=fortBar;fortBar=function(s){return _fb(s)+ugBar(s);};}
if(typeof fortTip==='function'){const _ft=fortTip;fortTip=function(){const p=UI.phase;if(p==='ug:mh')return '뚫을 건물(옆 건물 벽)을 탭하세요';if(p==='ug:tun')return '땅굴이 나올 곳을 탭하세요';if(p==='ug:demo')return '폭약을 심을 건물을 탭하세요';return _ft();};}
{const _tap=tap;tap=function(k){const p=UI.phase;if(!G||!p||!p.startsWith('ug:')||!UI.sel)return _tap(k);
  const r=kr(k),c=kc(k),pt=(typeof V3!=='undefined'&&V3.pickPt)||[c+.5,r+.5];const grp=ugSel();let msg=null,ok=0;
  for(const u of grp){let m;if(p==='ug:mh'){if(!mhTypes(u.type))continue;m=mhOrder(u,r,c);}else if(p==='ug:tun'){if(u.type!=='eng')continue;m=tunOrder(u,pt[0],pt[1]);}
    else if(p==='ug:demo'){if(u.type!=='eng'&&u.type!=='rifle')continue;m=demoOrder(u,r,c);}else continue;if(m)msg=msg||m;else{ok++;if(p!=='ug:tun')break;}}
  if(!ok&&msg)toast(msg);else if(ok){sfx('click',.6);if(typeof sndRadio==='function')sndRadio('ack');if(typeof v3Ping==='function')v3Ping(pt[0],pt[1],p==='ug:demo'?'#ff8a5a':'#e8dcc0');}
  UI.phase='select';render();};}
if(typeof document!=='undefined')document.addEventListener('click',e=>{const b=e.target.closest('[data-act^="ug:"]');if(!b||b.disabled||!G||G.over||isAI(G.viewer))return;const a=b.dataset.act;const grp=ugSel();
  if(a==='ug:fire'){const P=UI.pane;const d=P&&(G.demo||[]).find(d=>!d.gone&&d.nat===G.viewer&&d.r===P.r&&d.c===P.c);if(d&&demoFire(d))toast('기폭');render();return;}
  if(!grp.length)return;
  if(a==='ug:det'){let n=0;for(const u of grp)if(vbDet(u))n++;if(n)toast('자폭 차량 기폭');render();return;}
  if(a==='ug:bsm'){const down=!grp[0].bsm;let msg=null;for(const u of grp){if(UT[u.type].cls!=='inf')continue;const m=bsmOrder(u,down);if(m)msg=msg||m;}if(msg)toast(msg);render();return;}
  UI.phase=UI.phase===a?'select':a;render();});
/* 칸 정보에 민간인·지하실·폭약 */
if(typeof renderActbar==='function'){const _ra=renderActbar;renderActbar=function(){_ra();try{const el=$('#actbar');if(!el||!G||!UI.pane||UI.sel)return;const {r,c}=UI.pane;const x=cell(r,c);const ex=[];
  if(x.civ)ex.push(`민간인 ${x.civ}명`);if(x.bsm&&(x.t==='bldg'||x.t==='rubble'))ex.push('지하실 있음');
  const d=(G.demo||[]).find(d=>!d.gone&&d.nat===G.viewer&&d.r===r&&d.c===c);if(d)ex.push(d.fuse!=null?'폭약 기폭 중':'아군 폭약 설치됨');
  const sp=el.querySelector('span');if(sp&&ex.length)sp.textContent+=' · '+ex.join(' · ');
  const ab=el.querySelector('.ab');if(ab&&d&&d.fuse==null&&!isAI(G.viewer))ab.insertAdjacentHTML('afterbegin','<button class="btn sm primary" data-act="ug:fire" id="ab-ug-fire">폭약 터뜨리기</button>');}catch(e){}};}
if(typeof uInfo==='function'){const _ui=uInfo;uInfo=function(u){let s=_ui(u);if(u.tun)s+=' · 땅굴 이동 중';else if(u.bsm)s+=(u.trapT||0)>(G.time||0)?' · 지하실(잔해에 갇힘)':' · 지하실';else if(u.bsmGo)s+=u.bsmGo.down?' · 지하로 내려가는 중':' · 올라오는 중';
  if(u.mh)s+=' · 벽 뚫는 중';if(u.demo)s+=' · 폭약 설치 중';if(u.tunDig&&tunById(u.tunDig)&&tunById(u.tunDig).prog<1)s+=` · 땅굴 ${Math.round(tunById(u.tunDig).prog*100)}%`;return s;};}
