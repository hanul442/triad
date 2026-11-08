/* ===================== 3D·화면: 무전 지연 =====================
   05j-radio의 교신 대기열을 보여 준다(내 편만. 관전 중 전 세력 시야면 모든 세력).
   - 아직 닿지 않은 명령: 부대에서 목적지까지 노란 점선, 목적지에 작은 마름모.
   - 재밍으로 끊긴 명령: 주황 점선. 이름표에 '무전 1.2'·'두절'·'전령', 막 받았으면 '수신'. */
/* 이 세력의 무전을 화면에 보여 주나: 내 편, 또는 관전 중 전 세력 시야 */
const radioShows=n=>n===G.viewer||(typeof specOn==='function'&&specOn()&&UI.specVis==='all');
function v3RadioTag(u,vn){if(!radioShows(u.nat)||!radioOn())return '';const now=G.time||0;const e=radioPend(u);
  if(e){if(e.run)return '<em class="rd jm" title="재밍으로 무전이 끊겨 전령이 명령을 들고 가는 중">전령</em>';
    if(e.jam)return '<em class="rd jm" title="적 재밍: 무전 두절, 재송신 중">두절</em>';
    return `<em class="rd" title="무전으로 명령 전달 중">무전 ${Math.max(0,e.at-now).toFixed(1)}</em>`;}
  if(u._ack!=null&&now-u._ack<1.2)return '<u class="rk" title="명령 수신">수신</u>';
  if((u===UI.sel||(UI.group||[]).includes(u))&&radioCut(u))return '<em class="rd jm" title="적 재밍 반경 안: 새 명령이 잘 닿지 않음">재밍</em>';return '';}
function v3RadioDest(e,u){if(e.k==='move')return [e.a[0],e.a[1]];if(e.k==='atk'){const t=G.units.find(o=>o.id===e.a[0]);return t?[t.x,t.z]:null;}
  if(e.k==='bldg')return [e.a[1]+.5,e.a[0]+.5];
  if(e.k==='ai'){const s=e.a.st&&e.a.st[u.id];if(!s)return null;if(s.end)return s.end;const t=s.tgt!=null&&G.units.find(o=>o.id===s.tgt);if(t)return [t.x,t.z];if(s.tt!=null)return [kc(s.tt)+.5,kr(s.tt)+.5];}
  return null;}
function v3RadioLines(L,LC,c){if(!radioOn()||!G.rq)return;const vn=G.viewer;
  for(const e of G.rq){if(!radioShows(e.nat))continue;c.set(e.jam?'#ff8a3d':'#f0c45a');
    for(const id of e.us){const u=G.units.find(o=>o.id===id);if(!u)continue;const d=v3RadioDest(e,u);const o=V3.uo.get(u.id);const x1=o?o.position.x:u.x,z1=o?o.position.z:u.z,y=.07;
      if(!d){for(let i=0;i<8;i++){const a1=i/8*6.283,a2=(i+.5)/8*6.283;L.push(x1+Math.cos(a1)*.2,y,z1+Math.sin(a1)*.2,x1+Math.cos(a2)*.2,y,z1+Math.sin(a2)*.2);LC.push(c.r,c.g,c.b,c.r,c.g,c.b);}continue;}
      const [x2,z2]=d,len=Math.hypot(x2-x1,z2-z1),n=Math.max(2,Math.floor(len/.18));
      for(let i=0;i<n;i+=2){const t1=i/n,t2=Math.min(1,(i+1)/n);L.push(x1+(x2-x1)*t1,y,z1+(z2-z1)*t1,x1+(x2-x1)*t2,y,z1+(z2-z1)*t2);LC.push(c.r,c.g,c.b,c.r,c.g,c.b);}
      const r=.11,P=[[x2+r,z2],[x2,z2+r],[x2-r,z2],[x2,z2-r]];for(let s=0;s<4;s++){const [a,b]=P[s],[p,q]=P[(s+1)%4];L.push(a,y,b,p,y,q);LC.push(c.r,c.g,c.b,c.r,c.g,c.b);}}}}
/* 선택 정보: 무전 상태 한 줄 */
{const _i=uInfo;uInfo=function(u){let s=_i(u);if(!radioOn()||!radioShows(u.nat))return s;const e=radioPend(u);
   if(e)s+=e.run?' · 전령이 명령을 들고 가는 중':e.jam?' · 무전 두절, 재송신 중':` · 무전 전달 중 ${Math.max(0,e.at-(G.time||0)).toFixed(1)}초`;
   else if(radioCut(u))s+=' · 적 재밍 반경 안(명령 지연)';return s;};}
