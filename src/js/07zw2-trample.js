/* ===================== 3D: 차량에 깔린 덤불·쓰러지는 나무 (05o3-trample의 화면 쪽) =====================
   - 깔린 덤불(G.tramp): 납작하게 눌리고 옆으로 퍼진다.
   - 나무가 넘어갈 때: 흙먼지·잎 부스러기와 "우지끈" 꺾이는 소리. 눕는 모양은 07zw wrvTrees(fd 방향). */
const TRV={v:-1,t:0,list:null,done:null};
{const _w=v3BuildWorld;v3BuildWorld=function(){const v=_w.apply(this,arguments);TRV.list=null;TRV.v=-1;TRV.done=null;return v;};}
function trvIndex(){const g=V3.G&&V3.G.world;const geo=typeof NAT==='object'&&NAT.geo&&NAT.geo.bush;if(!g||!geo)return TRV.list=[];const L=[];
  for(const o of g.children)if(o.isInstancedMesh&&o.geometry===geo){const n=o.count,A=o.instanceMatrix.array.slice(0,n*16);const grid=new Map();
    for(let i=0;i<n;i++){const k=Math.floor(A[i*16+14])*N+Math.floor(A[i*16+12]);let a=grid.get(k);if(!a)grid.set(k,a=[]);a.push(i);}L.push({o,m0:A,grid});}
  TRV.done=new Set();return TRV.list=L;}
function trvBushes(){const L=TRV.list||trvIndex();if(!L.length)return;const T=V3.T;const m=new T.Matrix4(),s=new T.Matrix4(),t=new T.Matrix4(),t2=new T.Matrix4();
  for(const p of G.tramp||[]){const key=p.x+'|'+p.z;if(TRV.done.has(key))continue;TRV.done.add(key);
    for(const M of L){const I=M.grid.get(Math.floor(p.z)*N+Math.floor(p.x));if(!I)continue;let ch=false;
      for(const i of I){const x=M.m0[i*16+12],z=M.m0[i*16+14];if(Math.hypot(x-p.x,z-p.z)>.03)continue;
        m.fromArray(M.m0,i*16);const y=M.m0[i*16+13];s.makeScale(1.25,.22,1.25);t.makeTranslation(x,y,z);t2.makeTranslation(-x,-y,-z);t.multiply(s).multiply(t2).multiply(m);M.o.setMatrixAt(i,t);ch=true;}
      if(ch)M.o.instanceMatrix.needsUpdate=true;}}}
function trvFrame(now){if(!V3.on||!G||!V3.G||!V3.G.world)return;if(now-TRV.t<300)return;TRV.t=now;const v=G.trampV||0;if(v===TRV.v&&TRV.list)return;
  if(!TRV.list)trvIndex();TRV.v=v;try{trvBushes();}catch(e){console.warn(e);}}
if(typeof dsFrame==='function'){const _f=dsFrame;dsFrame=function(now,dt){_f(now,dt);trvFrame(now);};}
/* 나무가 꺾여 넘어가는 소리: 줄기가 쪼개지는 딱딱 소리 → 가지가 쓸리는 소리 → 땅에 닿는 쿵 */
function sndTreeFall(x,z,cm){if(typeof sndVoice!=='function')return;const V=sndVoice(x,z,{vol:.55+Math.min(.5,cm/80),dur:2.2});if(!V)return;const t=V.t;
  for(let i=0;i<5;i++)sndNz(V,t+i*.035+Math.random()*.03,.03+Math.random()*.03,'bandpass',900+Math.random()*1600,1.4,.35,.001);
  sndNz(V,t+.25,1.1,'lowpass',2600,.7,.18,.15,600);
  sndTn(V,t+1.05,.45,70,38,.5,'sine',.01);sndNz(V,t+1.05,.4,'lowpass',260,.8,.4,.005);}
FXH.treeFall=function(x,z,cm,dir){if(typeof V3==='undefined'||!V3.on)return;const L=.06+cm*.003;
  if(typeof dsDust==='function')dsDust(x+Math.cos(dir)*L,z+Math.sin(dir)*L,.18+cm*.004,2200,3,'#6f6248');
  const n=FXH._tfN=(FXH._tfN||0)+1;if(cm>=12||n%3===0)try{sndTreeFall(x,z,cm);}catch(e){}};
