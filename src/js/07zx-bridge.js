/* ===================== 3D·조작: 무너진 다리와 임시 다리 (05o2-bridge의 화면 쪽) =====================
   - 끊긴 경간: 남은 다리 쪽에서 상판 조각이 꺾여 강물에 처박히고, 둘레에 콘크리트 덩어리가 떨어져 있다.
   - 임시 다리(공병이 놓은 것): 상판 위에 철판 띠를 깐다.
   - 공병 버튼 [다리 복구], 폭약 버튼은 다리에도 쓴다. 무너질 때 물보라와 먼지. */
function brvBuild(){const T=V3.T;if(!V3.brG){V3.brG=new T.Group();V3.brG.name='bridges';V3.scene.add(V3.brG);}const g=V3.brG;
  for(const o of [...g.children]){g.remove(o);if(o.dispose)o.dispose();}
  const slab=[],chunk=[],plate=[];const at=(r,c)=>inb(r,c)?G.map[r][c]:null;
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=G.map[r][c];const [cx,cz]=v3x(r,c);
    if(x.t==='water'&&x.brX){const H2=(x.brX.ro||'h')!=='v';
      // 이웃 다리(또는 강가) 쪽에서 상판 반쪽이 꺾여 물에 처박힌다
      for(const s of [-1,1]){const y=H2?at(r,c+s):at(r+s,c);if(!y||y.t==='water'&&!y.br)continue;const h=v3Hash(key(r,c),900+s);
        const L=.3+h*.06,ang=.2+h*.15,dy=Math.sin(ang)*L,dh=Math.cos(ang)*L;const ox=H2?s*(.5-dh):0,oz=H2?0:s*(.5-dh);
        slab.push({x:cx+ox,y:.045-dy,z:cz+oz,sx:H2?L*2:.98,sy:.05,sz:H2?.98:L*2,rz:H2?s*ang:0,rx:H2?0:-s*ang,col:x.brX.rail?'#55524d':'#6f6c66'});}
      for(let i=0;i<9;i++){const h1=v3Hash(key(r,c),910+i),h2=v3Hash(key(r,c),930+i),h3=v3Hash(key(r,c),950+i);const s=.04+h3*.06;
        chunk.push({x:cx+(h1-.5)*.8,y:.01,z:cz+(h2-.5)*.8,s,sy:s*.5,ry:h1*6,rx:(h2-.5),col:h3<.5?'#6f6b63':'#8c877d'});}}
    else if(x.br&&x.rep&&x.t!=='water'){const H2=x.ro!=='v';for(let i=-2;i<=2;i++)plate.push(H2?{x:cx+i*.19,y:.075,z:cz,sx:.17,sy:.012,sz:.8,col:'#3f413f'}:{x:cx,y:.075,z:cz+i*.19,sx:.8,sy:.012,sz:.17,col:'#3f413f'});}}
  const M=V3.brM||(V3.brM=(()=>{const m=new T.MeshStandardMaterial({color:'#ffffff',roughness:.95,flatShading:true});if(typeof v3FowMat==='function')v3FowMat(m);return m;})());
  const box=V3.brBox||(V3.brBox=new T.BoxGeometry(1,1,1)),dod=V3.brDod||(V3.brDod=new T.DodecahedronGeometry(1,0));
  for(const [L,geo] of [[slab,box],[chunk,dod],[plate,box]]){const im=v3Inst(g,geo,M,L);if(im){im.userData.keepGeo=1;im.userData.keepMat=1;}}
  V3.brSeen=G.brV||0;V3.brOf=G;}
if(typeof dsFrame==='function'){const _f=dsFrame;dsFrame=function(now,dt){_f(now,dt);if(V3.on&&G&&V3.scene&&((V3.brSeen!==(G.brV||0))||V3.brOf!==G))try{brvBuild();}catch(e){console.warn(e);}};}
Object.assign(FXH,{
  brFall(r,c,B){if(typeof V3==='undefined'||!V3.on)return;const [x,z]=v3x(r,c);
    if(FXH.splash)try{FXH.splash(x,z,2);}catch(e){}
    if(typeof v3Debris==='function')v3Debris(x,.15,z,18,1.2);if(typeof dsDust==='function')dsDust(x,z,1.4,14000,9,'#9c9384',.1);
    if(typeof v3Burst==='function')v3Burst(x,.2,z,1,'#d8d2c4',3,0);V3.shake=Math.max(V3.shake||0,.12);},
  brFix(r,c){if(typeof V3==='undefined'||!V3.on)return;const [x,z]=v3x(r,c);if(typeof dsDust==='function')dsDust(x,z,.5,4000,3,'#7a7368');}});
/* ---------- 조작 ---------- */
if(typeof ugBar==='function'){const _b=ugBar;ugBar=function(s){let h=_b(s);if(!s||s.nat!==G.viewer||s.type!=='eng')return h;const on=UI.phase==='ug:brfix';
  return h+`<button class="btn sm${on?' primary':''}" data-act="ug:brfix" id="ab-ug-brfix" ${G.nats[s.nat].cp<BRG.fixCost?'disabled':''} title="끊긴 다리 경간에 ${BRG.fixT}초 동안 임시 다리를 놓는다">다리 복구 ${BRG.fixCost}</button>`;};}
if(typeof fortTip==='function'){const _ft=fortTip;fortTip=function(){const p=UI.phase;if(p==='ug:brfix')return '끊긴 다리(강가나 남은 다리에 붙은 칸)를 탭하세요';if(p==='ug:demo')return '폭약을 심을 건물이나 다리를 탭하세요';return _ft();};}
{const _tap=tap;tap=function(k){const p=UI.phase;if(!G||p!=='ug:brfix'||!UI.sel)return _tap(k);const r=kr(k),c=kc(k);
  const grp=typeof ugSel==='function'?ugSel():[UI.sel];let msg=null,ok=0;for(const u of grp){if(u.type!=='eng')continue;const m=brFixOrder(u,r,c);if(m)msg=msg||m;else{ok++;break;}}
  if(!ok&&msg)toast(msg);else if(ok){sfx('click',.6);if(typeof sndRadio==='function')sndRadio('ack');if(typeof v3Ping==='function')v3Ping(c+.5,r+.5,'#e8dcc0');UI.phase='select';}render();};}
if(typeof uInfo==='function'){const _ui=uInfo;uInfo=function(u){let s=_ui(u);if(u.brFix)s+=u.brFix.paid?` · 다리 놓는 중 ${Math.round(u.brFix.t/BRG.fixT*100)}%`:' · 다리 놓으러 가는 중';else if(u.demo&&u.demo.br)s=s.replace(' · 폭약 설치 중','')+' · 다리에 폭약 설치 중';return s;};}
