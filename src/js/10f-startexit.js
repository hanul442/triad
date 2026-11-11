/* ---------- 출발 지점 출구 (시작할 때 갇히지 않게) ----------
   지도 가장자리 출발 띠에는 주차 차·바리케이드·쓰레기통·생울타리·컨테이너 같은 소품이 놓인다. 이것들이 띠에서 시가지로 나가는 길을
   모두 막으면 그 띠에서 시작한 부대(특히 차량)는 처음부터 갇혀 못 나온다(2026-11-11 측정: 장갑차 1~2%, 고성·특대 지도는 더 많다).
   판이 시작될 때 이동 격자(04d)로 확인한다: 출발 부대와 출발 띠의 빈 곳이 지도에서 가장 큰 덩어리(시가지 전체)와 이어지지 않으면,
   지형(건물·물·벽)은 그대로 두고 소품만 치워 가장 짧은 출구 길을 낸다. 실제로도 집결지의 길은 미리 치워 둔다.
   큰 시설(기름 탱크·냉각탑·굴뚝)은 치우지 않는다. 일반 판(newGame)과 임무(campStart: 부대를 놓은 뒤)에서 한 번씩 돈다. */
const SX={
  cls:['veh','trk','inf'],          // 바퀴 차량이 가장 까다롭고, 궤도 차량·보병도 따로 본다
  kinds:{car:'car',barrier:'barrier',bin:'bin',hedge:'hedge',hedgegap:'hedge',wagon:'wagon',bocage:'bocage',bocgap:'bocage',cont:'cont',logs:'logs',cwall:'cwall',plane:'plane'},
  minZone:25,                       // 출발 띠 안의 빈 덩어리가 이보다 작으면(작은 칸 25개 = 1칸) 차가 설 곳이 아니니 둔다
  blocked:12,                       // 길찾기에서 소품 칸 하나 지나는 값(빈 칸 1). 치울 소품을 적게 고른다
  rounds:24,
};
/* 소품만 빼고(치울 수 있는 것만) 격자를 만든다: 그 격자에서도 막힌 칸은 지형이라 출구로 쓸 수 없다 */
function sxGrids(cls){const P=G.props||[];const keep=P.filter(p=>!SX.kinds[p.k]);
  NAV.g=null;G.props=keep;let terr;try{terr=navGrid(cls).cost.slice();}finally{G.props=P;NAV.g=null;}
  const g=navGrid(cls),K=navComp(cls);return {W:g.W,cost:g.cost,terr,K};}
/* 이 부대 종류에게 출발점이 될 작은 칸들: 출발 부대 자리 + 살아 있는 세력의 출발 띠에서 넉넉한 빈 덩어리 */
function sxSources(cls,S,zone){const W=S.W,K=S.K,src=new Set();
  for(const u of G.units){const t=UT[u.type];if(!t||t.fly||u.towBy!=null)continue;if(navCls(u)!==(cls==='inf'?(u.type==='eng'?'eng':'inf'):cls))continue;
    const i=Math.floor(u.z*NAV_R),j=Math.floor(u.x*NAV_R);if(i>=0&&j>=0&&i<W&&j<W)src.add(i*W+j);}
  if(zone&&!G.scn&&G.nats)for(let n=0;n<G.nats.length;n++){if(!G.nats[n].alive)continue;
    for(let r=0;r<N;r++)for(let c=0;c<N;c++){if(!inZone(n,r,c))continue;
      for(let a=0;a<NAV_R;a++)for(let b=0;b<NAV_R;b++){const k=(r*NAV_R+a)*W+c*NAV_R+b;const l=K.lab[k];if(l>=0&&K.size[l]>=SX.minZone)src.add(k);}}}
  return [...src].filter(k=>{const l=K.lab[k];return !(l>=0&&K.size[l]===K.big);});}
/* 갇힌 칸들에서 큰 덩어리까지 가장 싼 길(소품 칸은 비싸게, 지형 칸은 못 지남). 길 위의 막힌 칸 목록 */
function sxLane(S,src){const W=S.W,C=S.cost,T=S.terr,K=S.K,D=new Float32Array(W*W).fill(Infinity),P=new Int32Array(W*W).fill(-1);
  const hk=[],hf=[];const push=(k,f)=>{let i=hk.length;hk.push(k);hf.push(f);while(i>0){const p=(i-1)>>1;if(hf[p]<=f)break;hk[i]=hk[p];hf[i]=hf[p];i=p;}hk[i]=k;hf[i]=f;};
  const pop=()=>{const k=hk[0],lk=hk.pop(),lf=hf.pop();if(hk.length){let i=0;for(;;){const l=2*i+1,r=l+1;let m=i,mf=lf;if(l<hk.length&&hf[l]<mf){m=l;mf=hf[l];}if(r<hk.length&&hf[r]<mf)m=r;if(m===i)break;hk[i]=hk[m];hf[i]=hf[m];i=m;}hk[i]=lk;hf[i]=lf;}return k;};
  for(const k of src){D[k]=0;push(k,0);}let end=-1,n=0;
  while(hk.length&&n++<400000){const f=hf[0],k=pop();if(f>D[k])continue;const l=K.lab[k];if(C[k]&&l>=0&&K.size[l]===K.big){end=k;break;}
    const i=(k/W)|0,j=k-i*W;
    for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){const ni=i+a,nj=j+b;if(ni<0||nj<0||ni>=W||nj>=W)continue;const q=ni*W+nj;if(!T[q])continue;
      const nd=D[k]+(C[q]?1:SX.blocked);if(nd<D[q]){D[q]=nd;P[q]=k;push(q,nd);}}}
  if(end<0)return null;const out=[];for(let k=end;k>=0;k=P[k])if(!C[k])out.push(k);return out;}
/* 막힌 칸을 덮는 소품(이 부대 종류를 완전히 막는 것)을 찾는다 */
function sxPropsOn(cls,cells,W){const O=navObstacles(),clr=NAV_CLR[cls],cs=1/NAV_R,P=G.props||[],out=new Set();
  for(const o of O){const pk=SX.kinds[o.k];if(!pk)continue;const rule=NAV_RULE[o.k];if(!rule||!rule[cls])continue;
    const R=Math.max(o.hl,o.hw)+clr+cs*3;let hit=false;
    for(const k of cells){const x=(k%W+.5)*cs,z=(((k/W)|0)+.5)*cs;if(Math.abs(x-o.x)>R||Math.abs(z-o.z)>R)continue;if(inBox(o,x,z,clr+cs*2.5)){hit=true;break;}/* 차량 격자는 3×3 열림(navOpen)으로 소품 둘레가 한 칸 더 막힌다 */}
    if(!hit)continue;
    let p=o.p;if(!p){let bd=.7;for(const q of P){if(q.k!==pk)continue;const d=Math.hypot(q.x-o.x,q.z-o.z);if(d<bd){bd=d;p=q;}}}
    if(p)out.add(p);}
  return out;}
/* 소품을 지도에서 뺀다: 엄폐 목록(propCovers가 만든 것)도 같이 뺀다 */
function sxRemove(set){if(!set.size)return;const gone=[...set];
  G.props=G.props.filter(p=>!set.has(p));
  if(G.covers)G.covers=G.covers.filter(c=>{if(c.fort||c.wrk)return true;
    for(const p of gone){const L=p.k==='hedge'||p.k==='bocage'||p.k==='wagon'||p.k==='cont'||p.k==='cwall'?.6:.3;if(Math.abs(c.x-p.x)<L&&Math.abs(c.z-p.z)<L)return false;}return true;});
  G.navV=(G.navV||0)+1;G.propV=(G.propV||0)+1;NAV.g=null;
  (G.sxGone=G.sxGone||[]).push(...gone.map(p=>[p.k,+p.x.toFixed(2),+p.z.toFixed(2)]));}
/* 출구 열기: 부대 종류마다 갇힌 출발점이 없어질 때까지(또는 SX.rounds 번) 소품을 치운다. 반환: 치운 소품 수 */
function startExits(){if(!G||!G.map||!G.props||!G.props.length||typeof navGrid!=='function')return 0;let n=0;
  // 먼저 출발 부대 자리, 다음에 출발 띠(나중에 부르는 부대가 놓일 곳)
  for(const cls of SX.cls)for(const zone of [false,true])for(let rd=0;rd<SX.rounds;rd++){const S=sxGrids(cls);const src=sxSources(cls,S,zone);if(!src.length)break;
    const cells=sxLane(S,src);if(!cells||!cells.length)break;const set=sxPropsOn(cls,cells,S.W);if(!set.size)break;sxRemove(set);n+=set.size;}
  // 치운 뒤 차량을 넓은 자리로 다시 옮긴다(05b2 vRoomyFix)
  if(n&&typeof vRoomyFix==='function')for(const u of G.units)vRoomyFix(u);
  return n;}
{const _ng=newGame;newGame=function(cfg){const r=_ng.apply(this,arguments);try{if(!(cfg&&cfg.scn))startExits();}catch(e){(G.errs||[]).push('startExits '+e.message);}return r;};}
if(typeof campStart==='function'){const _cs=campStart;campStart=function(id){const r=_cs.apply(this,arguments);try{if(r!==null&&G&&G.scn)startExits();}catch(e){(G.errs||[]).push('startExits '+e.message);}return r;};}
