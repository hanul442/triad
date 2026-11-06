/* ===================== MAP GEN =====================
   도시는 90도 회전 대칭으로 만든다. 그래서 2세력(서·동)이든 4세력이든 출발 조건이 같다.
   가장자리 2줄은 집결지, 그 안쪽은 도로와 건물 블록, 한가운데는 넓은 대로. */
function inZone(n,r,c){if(n==null)return false;const e=[c<=1,c>=N-2,r<=1,r>=N-2][n];const corner=(r<=1||r>=N-2)&&(c<=1||c>=N-2);return e&&!corner;}
function genMap(seed,objPer){const rnd=mulberry(seed);const H=N/2;
  // 도로 줄: 대칭이 되도록 앞쪽 절반만 정하고 뒤집는다.
  const st=new Array(N).fill(false);st[2]=true;let i=3;
  while(i<H-1){const b=2+Math.floor(rnd()*3);i+=b;if(i<H-1){st[i]=true;i++;}}
  st[H-1]=true;for(let j=0;j<H;j++)st[N-1-j]=st[j];
  const bi=[];let cnt=0;for(let j=0;j<N;j++){if(st[j])cnt++;bi.push(cnt);}
  const m=[];for(let r=0;r<N;r++){m[r]=[];for(let c=0;c<N;c++)m[r][c]=null;}
  const blockType={};const blockBase={};
  const mid=(N-1)/2;
  const can=[];// 정준 사분면 칸
  for(let r=0;r<H;r++)for(let c=0;c<H;c++){let x;
    if(r<2||c<2){const p=rnd();x={t:p<.14?'park':p<.2?'rubble':'plaza'};}
    else if(st[r]||st[c])x={t:'road'};
    else{const bid=bi[r]*100+bi[c];if(!blockType[bid]){const p=rnd();blockType[bid]=p<.7?'bldg':p<.84?'park':p<.93?'plaza':'ruin';
        const d=Math.max(Math.abs(r-mid),Math.abs(c-mid))/H;blockBase[bid]=Math.max(1,Math.round(7.2-5.6*d+(rnd()-.5)*2));}
      const bt=blockType[bid];
      if(bt==='bldg'){const p=rnd();x=p<.88?{t:'bldg',f:Math.max(1,Math.min(8,blockBase[bid]+Math.round((rnd()-.5)*2.4)))}:p<.95?{t:'plaza'}:{t:'rubble'};}
      else if(bt==='park')x={t:rnd()<.08?'water':'park'};
      else if(bt==='plaza')x={t:rnd()<.1?'park':'plaza'};
      else{const p=rnd();x=p<.5?{t:'rubble'}:{t:'bldg',f:1+Math.floor(rnd()*3)};}
      x.blk=bid;}
    can.push([r,c,x]);}
  // 거점: 정준 사분면 안쪽에서 서로 떨어진 칸을 고른다.
  const objs=[];let tries=0;
  while(objs.length<objPer&&tries++<400){const r=3+Math.floor(rnd()*(H-4)),c=3+Math.floor(rnd()*(H-4));const x=can[r*H+c][2];
    if(x.t==='road'||x.t==='water')continue;if(objs.some(([a,b])=>dist(a,b,r,c)<4))continue;if(Math.min(H-1-r,H-1-c)<1&&objs.length)continue;
    if(x.t==='bldg')x.f=Math.max(x.f,4);else x.t='plaza';x.lm=1;objs.push([r,c]);}
  const rot=(r,c,k)=>{for(let j=0;j<k;j++){const t=r;r=c;c=N-1-t;}return [r,c];};
  for(const [r,c,x] of can)for(let k=0;k<4;k++){const [a,b]=rot(r,c,k);const y={...x,owner:null,obj:null};if(y.blk!=null)y.blk=y.blk*4+k;m[a][b]=y;}
  let oi=0;const names=OBJ_NAMES.slice();for(let j=names.length-1;j>0;j--){const q=Math.floor(rnd()*(j+1));[names[j],names[q]]=[names[q],names[j]];}
  const list=[];for(const [r,c] of objs)for(let k=0;k<4;k++){const [a,b]=rot(r,c,k);m[a][b].obj=oi;list.push({r:a,c:b,name:names[oi%names.length]});oi++;}
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=m[r][c];if(x.t==='bldg'){x.bmax=8+x.f*3;x.bhp=x.bmax;}x.smoke=0;}
  return {map:m,objs:list};}
