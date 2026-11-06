/* ===================== RENDER (tactical map) ===================== */
function hexPts(x,y,rr){let p='';for(let i=0;i<6;i++){const a=Math.PI/180*(60*i-90);p+=(x+rr*Math.cos(a)).toFixed(1)+','+(y+rr*Math.sin(a)).toFixed(1)+' ';}return p;}
const MAPCOL=['#4f8cff','#ff5a4e','#f0a537','#b383ff','#3fc6c0','#c3cbdb'];
const mapCol=n=>n==null?'#8b9294':MAPCOL[n];
const FX={move:'#5aa0ff',hit:'#ff6a3d',ok:'#5cd18a',ink:'#f2efe6'};
const hourOf=()=>(6+(G.turn-1)*2)%24;
const isNight=()=>{const h=hourOf();return h>=20||h<5;};
function hexAt(x,y){const r0=Math.round((y-R)/(1.5*R));let best=0,bd=1e18;
  for(let r=r0-1;r<=r0+1;r++){if(r<0||r>=ROWS)continue;const c0=Math.round((x-S3*R/2)/(S3*R)-0.5*(r&1));
    for(let c=c0-1;c<=c0+1;c++){if(c<0||c>=COLS)continue;const [cx,cy]=px(r,c);const d=(cx-x)*(cx-x)+(cy-y)*(cy-y);if(d<bd){bd=d;best=r*COLS+c;}}}return best;}
function mkNoise(seed){const rnd=mulberry(seed);const N=256;const p=new Float32Array(N*N);for(let i=0;i<N*N;i++)p[i]=rnd();
  return (x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;const a=p[(yi&255)*N+(xi&255)],b=p[(yi&255)*N+((xi+1)&255)],c=p[((yi+1)&255)*N+(xi&255)],d=p[((yi+1)&255)*N+((xi+1)&255)];
    const u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;};}
function boxBlur(a,w,h,r){if(r<1)return;const t=new Float32Array(a.length),k=2*r+1;
  for(let y=0;y<h;y++){let s=0;for(let x=-r;x<=r;x++)s+=a[y*w+Math.min(w-1,Math.max(0,x))];for(let x=0;x<w;x++){t[y*w+x]=s/k;s+=a[y*w+Math.min(w-1,x+r+1)]-a[y*w+Math.max(0,x-r)];}}
  for(let x=0;x<w;x++){let s=0;for(let y=-r;y<=r;y++)s+=t[Math.min(h-1,Math.max(0,y))*w+x];for(let y=0;y<h;y++){a[y*w+x]=s/k;s+=t[Math.min(h-1,y+r+1)*w+x]-t[Math.max(0,y-r)*w+x];}}}
const NM={};
function names(){const tag=G.seed+'|'+ROWS+'x'+COLS;if(NM.tag===tag)return NM;const rnd=mulberry((G.seed^0x5bd1e995)>>>0);const pick=a=>a[Math.floor(rnd()*a.length)];
  const P=['TELL','AIN','KAFR','DEIR','RAS','BIR','QASR','WADI','JEBEL','UMM'],S1=['AL','RA','SHA','MI','ZA','KHA','DA','NU','HA','BE','TA','SU','QA','RI','YA','FA'],S2=['SHAN','RAN','DUR','LIK','MAR','ZAN','HIR','BAD','NUR','KAN','RIM','SAL'];
  const city={};for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const t=G.map[r][c].t;if(t==='city'||t==='hq')city[key(r,c)]=(rnd()<.55?pick(P)+' ':'')+pick(S1)+pick(S2);}
  const CMP=[['NORTHWEST','NORTH','NORTHEAST'],['WEST','CENTRAL','EAST'],['SOUTHWEST','SOUTH','SOUTHEAST']];const sec=[];
  for(let sr=0;sr<3;sr++)for(let sc=0;sc<3;sc++){const cnt={sea:0,mountain:0,forest:0,all:0};
    for(let r=Math.floor(sr*ROWS/3);r<Math.floor((sr+1)*ROWS/3);r++)for(let c=Math.floor(sc*COLS/3);c<Math.floor((sc+1)*COLS/3);c++){const t=G.map[r][c].t;cnt.all++;if(cnt[t]!=null)cnt[t]++;}
    const f=k=>cnt[k]/Math.max(1,cnt.all);sec.push(CMP[sr][sc]+' '+(f('sea')>.6?'GULF':f('sea')>.42?'STRAIT':f('mountain')>.1?'HIGHLANDS':f('forest')>.24?'WOODS':'SANDS'));}
  Object.assign(NM,{tag,city,sec});return NM;}
const regionAt=(r,c)=>names().sec[Math.min(2,Math.floor(r*3/ROWS))*3+Math.min(2,Math.floor(c*3/COLS))];
const TV={};
function buildTerrain(){if(typeof document==='undefined')return false;const S=2,tw=Math.ceil(W/S),th=Math.ceil(H/S);
  const day=document.createElement('canvas');day.width=tw;day.height=th;let ctx=null;try{ctx=day.getContext('2d');}catch(e){}if(!ctx)return false;
  const n=mkNoise((G.seed&0xffff)+11);const N=tw*th;const land=new Float32Array(N),fo=new Float32Array(N),mt=new Float32Array(N);
  for(let y=0;y<th;y++)for(let x=0;x<tw;x++){const i=y*tw+x;const h=hexAt(x*S+1,y*S+1);const t=G.map[(h/COLS)|0][h%COLS].t;land[i]=t==='sea'?0:1;fo[i]=t==='forest'?1:0;mt[i]=t==='mountain'?1:0;}
  const rad=Math.max(2,Math.round(R/S*0.5));boxBlur(land,tw,th,rad);boxBlur(land,tw,th,rad);boxBlur(fo,tw,th,rad+1);boxBlur(mt,tw,th,rad+1);boxBlur(mt,tw,th,rad);
  const E=new Float32Array(N);for(let y=0;y<th;y++)for(let x=0;x<tw;x++){const i=y*tw+x;E[i]=.55*n(x/38,y/38)+.3*n(x/13+50,y/13)+.15*n(x/4.5,y/4.5+20)+mt[i]*.6+fo[i]*.06;}
  const img=ctx.createImageData(tw,th);const D=img.data;
  for(let y=0;y<th;y++)for(let x=0;x<tw;x++){const i=y*tw+x;const lb=land[i];let r,g,b;
    if(lb<.5){const t=Math.min(1,lb/.5),k=t*t*t;r=20+32*k;g=31+60*k;b=45+52*k;const w=(n(x/3,y/1.3+70)-.5)*7;r+=w;g+=w;b+=w*1.3;}
    else if(lb<.555){const v=n(x/2,y/2)*10;r=200+v;g=180+v;b=136+v;}
    else{const v=n(x/2.2+9,y/2.2)*16-8;r=182+v;g=153+v;b=108+v*.8;
      if(mt[i]>.12){const k=Math.min(1,(mt[i]-.12)*1.7);r+=(116-r)*k;g+=(94-g)*k;b+=(68-b)*k;}
      if(fo[i]>.28&&n(x/2.4,y/2.4+40)>.4){const k=Math.min(1,(fo[i]-.28)*2.2);r+=(106-r)*k;g+=(104-g)*k;b+=(64-b)*k;}
      const xa=Math.max(0,x-1),ya=Math.max(0,y-1),xb=Math.min(tw-1,x+1),yb=Math.min(th-1,y+1);const sh=(E[ya*tw+xa]-E[yb*tw+xb])*140;r+=sh;g+=sh;b+=sh;
      const q=Math.floor(E[i]*11);if(x<tw-1&&y<th-1&&(Math.floor(E[i+1]*11)!==q||Math.floor(E[i+tw]*11)!==q)){r*=.82;g*=.82;b*=.82;}}
    D[4*i]=r<0?0:r>255?255:r;D[4*i+1]=g<0?0:g>255?255:g;D[4*i+2]=b<0?0:b>255?255:b;D[4*i+3]=255;}
  ctx.putImageData(img,0,0);
  if(!G.roads)buildRoads();ctx.strokeStyle='#8a8476';ctx.lineWidth=1.6;ctx.lineCap='round';ctx.lineJoin='round';
  for(const rt of G.roads){ctx.beginPath();rt.p.forEach((k,i)=>{const [x,y]=px(kr(k),kc(k));if(i)ctx.lineTo(x/S,y/S);else ctx.moveTo(x/S,y/S);});ctx.stroke();}
  const rnd=mulberry((G.seed^0x3c6ef372)>>>0);const lights=[],glows=[];const BC=['#ddd4c1','#c9bfa9','#ebe4d4','#bdb29c'];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const x=G.map[r][c];const [X,Y]=px(r,c);const cx=X/S,cy=Y/S;
    if(x.t==='city'||x.t==='hq'){const rr=x.t==='hq'?12:9;glows.push([cx,cy,rr]);ctx.strokeStyle='#958f81';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(cx,cy,rr*.55,0,Math.PI*2);ctx.stroke();
      for(let k=0;k<3;k++){const a=rnd()*Math.PI*2;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*rr*1.1,cy+Math.sin(a)*rr*1.1);ctx.stroke();}
      for(let gy=-rr;gy<=rr;gy+=3)for(let gx=-rr;gx<=rr;gx+=3){if(Math.hypot(gx,gy)>rr*(0.7+0.4*rnd()))continue;const bx=Math.round(cx+gx),by=Math.round(cy+gy);if(bx<0||by<0||bx>=tw||by>=th||land[by*tw+bx]<.56)continue;
        const w=rnd()<.22?3:2,h=rnd()<.22?3:2;ctx.fillStyle=BC[Math.floor(rnd()*BC.length)];ctx.fillRect(bx,by,w,h);ctx.fillStyle='rgba(55,45,35,.5)';ctx.fillRect(bx+w,by+1,1,h);lights.push([bx,by,w,h]);}}
    else if(x.t==='urban'){const rr=R/S*0.95;glows.push([cx,cy,rr*.75]);ctx.fillStyle='rgba(118,110,96,.6)';ctx.beginPath();for(let i=0;i<6;i++){const a=Math.PI/180*(60*i-30),X2=cx+rr*Math.cos(a),Y2=cy+rr*Math.sin(a);if(i)ctx.lineTo(X2,Y2);else ctx.moveTo(X2,Y2);}ctx.fill();
      for(let gy=-rr;gy<=rr;gy+=4)for(let gx=-rr;gx<=rr;gx+=4){if(Math.hypot(gx,gy)>rr*.84||rnd()<.12)continue;const bx=Math.round(cx+gx),by=Math.round(cy+gy);if(bx<0||by<0||bx>=tw||by>=th)continue;
        const w=rnd()<.3?3:2,h=rnd()<.3?3:2;ctx.fillStyle=BC[Math.floor(rnd()*BC.length)];ctx.fillRect(bx,by,w,h);ctx.fillStyle='rgba(55,45,35,.5)';ctx.fillRect(bx+w,by+1,1,h);lights.push([bx,by,w,h]);}}
    else if(x.t==='oil'){ctx.fillStyle='#4a4639';ctx.fillRect(cx-3,cy-3,6,6);ctx.fillStyle='#2a2823';ctx.fillRect(cx-1,cy-5,2,8);ctx.fillRect(cx-3,cy-1,6,1);ctx.fillStyle='#7b7462';ctx.fillRect(cx+3,cy+1,3,2);}
    else if(x.t==='mine'){ctx.fillStyle='#8c8577';ctx.beginPath();ctx.arc(cx,cy,5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#6a6458';ctx.beginPath();ctx.arc(cx,cy,3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#4f4a41';ctx.beginPath();ctx.arc(cx,cy,1.4,0,Math.PI*2);ctx.fill();}
    if(x.rig){ctx.fillStyle='#5b6670';ctx.fillRect(cx-3,cy-3,6,6);ctx.fillStyle='#8d98a1';ctx.fillRect(cx-2,cy-2,4,4);ctx.fillStyle='#2c3238';ctx.fillRect(cx+2,cy-5,1,3);}}
  const night=document.createElement('canvas');night.width=tw;night.height=th;const nc=night.getContext('2d');const di=ctx.getImageData(0,0,tw,th);const nd=di.data;
  for(let i=0;i<nd.length;i+=4){nd[i]*=.27;nd[i+1]*=.31;nd[i+2]*=.46;}nc.putImageData(di,0,0);
  nc.globalCompositeOperation='lighter';for(const [cx,cy,rr] of glows){const gr=nc.createRadialGradient(cx,cy,0,cx,cy,rr*1.7);gr.addColorStop(0,'rgba(255,180,90,.26)');gr.addColorStop(1,'rgba(255,180,90,0)');nc.fillStyle=gr;nc.fillRect(cx-rr*2,cy-rr*2,rr*4,rr*4);}
  nc.globalCompositeOperation='source-over';for(const [bx,by,w,h] of lights){if(rnd()<.78){nc.fillStyle=rnd()<.8?'#ffd98a':'#fff1c9';nc.fillRect(bx+Math.floor(rnd()*w),by+Math.floor(rnd()*h),1,1);}}
  Object.assign(TV,{day,night,tw,th});return true;}
function ensureTerrain(){const cv=$('#terrain');if(!cv)return;const tag=G.seed+'|'+ROWS+'x'+COLS;
  if(TV.tag!==tag){TV.tag=tag;TV.ok=buildTerrain();TV.shown=null;}
  cv.style.width=(W*UI.zoom).toFixed(0)+'px';cv.style.height=(H*UI.zoom).toFixed(0)+'px';if(!TV.ok)return;
  const ph=isNight()?'night':'day';if(TV.shown!==ph){cv.width=TV.tw;cv.height=TV.th;cv.getContext('2d').drawImage(ph==='night'?TV.night:TV.day,0,0);TV.shown=ph;}
  const h=hourOf();cv.style.filter=(h===18||h===6)?'sepia(.35) saturate(1.15) brightness(.82)':'none';}
const GLY={
  inf:'<circle cx="-3" cy="-3.2" r="1.9"/><circle cx="3.4" cy="0" r="1.9"/><circle cx="-3" cy="3.2" r="1.9"/>',
  truck:'<rect x="-7.5" y="-3.6" width="10" height="7.2" rx="1"/><rect x="3.4" y="-3.1" width="4.3" height="6.2" rx="1.2"/>',
  tank:'<rect x="-7.5" y="-5" width="13" height="10" rx="1.6"/><rect x="0" y="-.9" width="9.5" height="1.8" rx=".6"/><circle cx="-1.5" r="3.4"/>',
  art:'<rect x="-7.5" y="-4.6" width="12" height="9.2" rx="1.4"/><rect x="-2" y="-.8" width="12" height="1.6" rx=".5"/><circle cx="-2.5" r="2.6"/>',
  aa:'<rect x="-6.5" y="-4.6" width="11" height="9.2" rx="1.4"/><rect x="0" y="-2.6" width="8" height="1.3"/><rect x="0" y="1.3" width="8" height="1.3"/><circle cx="-1" r="2.4"/>',
  sam:'<rect x="-7.5" y="-5" width="14" height="10" rx="1.2"/><rect x="-5" y="-3.6" width="9" height="2.6" rx=".4"/><rect x="-5" y="1" width="9" height="2.6" rx=".4"/>',
  lst:'<path d="M-9 -4.2H5.5L9 0L5.5 4.2H-9Z"/><rect x="-6.5" y="-2.2" width="9" height="4.4" rx=".5" fill="#8f8a7d"/>',
  dd:'<path d="M-9.5 -2.6H5L10.5 0L5 2.6H-9.5Z"/><rect x="-4" y="-1.4" width="5" height="2.8" rx=".5" fill="#8f8a7d"/>',
  sub:'<ellipse rx="9.5" ry="2.6"/><rect x="-1.5" y="-1.6" width="3.4" height="3.2" rx="1" fill="#8f8a7d"/>',
  bb:'<path d="M-10.5 -3.8H6L11 0L6 3.8H-10.5Z"/><circle cx="3.5" r="1.8" fill="#8f8a7d"/><circle cx="-5.5" r="1.8" fill="#8f8a7d"/><rect x="-2" y="-1.6" width="3" height="3.2" fill="#8f8a7d"/>',
  aor:'<path d="M-10 -3.4H6L10 0L6 3.4H-10Z"/><rect x="-7" y="-2.2" width="3.2" height="4.4" fill="#8f8a7d"/><rect x="-3" y="-2.2" width="3.2" height="4.4" fill="#8f8a7d"/><rect x="1" y="-2.2" width="3.2" height="4.4" fill="#8f8a7d"/>',
  cv:'<rect x="-10.5" y="-4.6" width="21" height="9.2" rx="1"/><path d="M-9 3L8 -3" stroke="#6d695e" stroke-width="1"/><rect x="2" y="2.4" width="4" height="1.8" fill="#8f8a7d"/>',
  ftr:'<path d="M9.5 0L-6 -7.5L-3 0L-6 7.5Z"/>',
  spec:'<circle cx="-2.5" cy="-2.8" r="2"/><circle cx="2.8" cy="2.4" r="2"/><path d="M-6.5 5.5L6.5 -5.5" stroke="#ece6d6" stroke-width="1.5"/>',
  eng:'<circle cx="-3.5" cy="-3" r="1.9"/><circle cx="-3.5" cy="3" r="1.9"/><rect x="0" y="-1" width="7" height="2" rx=".6"/><rect x="6" y="-3.2" width="2.6" height="6.4" rx=".6"/>',
  at:'<circle cx="-4.5" cy="-3" r="1.9"/><circle cx="-4.5" cy="3" r="1.9"/><rect x="-1.5" y="-1.3" width="11" height="2.6" rx="1"/>',
  recon:'<rect x="-7" y="-3.4" width="14" height="6.8" rx="2.6"/><circle cx="2.5" r="1.7" fill="#8f8a7d"/>',
  ifv:'<rect x="-8" y="-4.6" width="14.5" height="9.2" rx="1.6"/><rect x="1" y="-.6" width="7.5" height="1.2"/><rect x="-3.5" y="-2.3" width="5" height="4.6" rx="1" fill="#8f8a7d"/>',
  mlrs:'<rect x="-8.5" y="-4.6" width="16" height="9.2" rx="1.2"/><rect x="-5.5" y="-3.4" width="9" height="6.8" fill="#8f8a7d"/><path d="M-5.5 -1.1h9M-5.5 1.1h9M-2.5 -3.4v6.8M.5 -3.4v6.8" stroke="#ece6d6" stroke-width=".6"/>',
  lrsam:'<rect x="-9.5" y="-4.6" width="18" height="9.2" rx="1"/><rect x="-6.5" y="-3.2" width="14" height="2.6" rx="1" fill="#8f8a7d"/><rect x="-6.5" y=".6" width="14" height="2.6" rx="1" fill="#8f8a7d"/>',
  tel:'<rect x="-10" y="-3.8" width="20" height="7.6" rx="1.2"/><path d="M-7.5 0H7" stroke="#8f8a7d" stroke-width="2.8" stroke-linecap="round"/><path d="M7 -1.4L9.5 0L7 1.4Z" fill="#8f8a7d"/>',
  pb:'<path d="M-7.5 -2.2H3L7.5 0L3 2.2H-7.5Z"/><rect x="-4" y="-1" width="3" height="2" fill="#8f8a7d"/>',
  ff:'<path d="M-9.5 -2.8H5L10 0L5 2.8H-9.5Z"/><rect x="-5" y="-1.4" width="4" height="2.8" fill="#8f8a7d"/><circle cx="3" r="1.2" fill="#8f8a7d"/>',
  cg:'<path d="M-10.5 -3.4H5.5L10.5 0L5.5 3.4H-10.5Z"/><rect x="-4" y="-2" width="5.5" height="4" fill="#8f8a7d"/><rect x="2.5" y="-1.6" width="2.4" height="3.2" fill="#6d695e"/><rect x="-8.5" y="-1.6" width="2.4" height="3.2" fill="#6d695e"/>',
  heli:'<ellipse cx="1.5" rx="5" ry="3"/><rect x="-9.5" y="-.8" width="7.5" height="1.6"/><path d="M-5 -6.5L8 6.5M-5 6.5L8 -6.5" stroke="#ece6d6" stroke-width="1.2"/>',
  th:'<rect x="-8.5" y="-2.8" width="17" height="5.6" rx="2.6"/><circle cx="-5" r="5.5" fill="none" stroke="#ece6d6" stroke-width=".9"/><circle cx="5" r="5.5" fill="none" stroke="#ece6d6" stroke-width=".9"/>',
  uav:'<path d="M6.5 0L-1.5 -8.5H-3.5L-.8 -1H-6L-7 -3H-8.2L-7.6 0L-8.2 3H-7L-6 1H-.8L-3.5 8.5H-1.5Z"/>',
  stealth:'<path d="M9.5 0L-7 -9.5L-4 -3.2L-6.2 0L-4 3.2L-7 9.5Z"/>',
  tnk:'<path d="M8.5 0L3 -1.6L.5 -10H-2L-1.5 -1.6H-7L-8.5 -3.8H-10L-9.2 0L-10 3.8H-8.5L-7 1.6H-1.5L-2 10H.5L3 1.6Z"/><path d="M-9.5 0H-13.5" stroke="#ece6d6" stroke-width="1.4"/>',
  awacs:'<path d="M8 0L3 -1.4L1 -9H-1.5L-1 -1.4H-7L-8.5 -3.5H-9.8L-9 0L-9.8 3.5H-8.5L-7 1.4H-1L-1.5 9H1L3 1.4Z"/><ellipse cx="-2.5" rx="3.6" ry="3.6" fill="#8f8a7d"/>',
  bmb:'<path d="M8.5 0L3 -1.7L0 -9.5H-3L-2 -1.7H-7L-9 -4.5H-10.5L-9.5 0L-10.5 4.5H-9L-7 1.7H-2L-3 9.5H0L3 1.7Z"/>'};
function unitInner(u,sel){const col=mapCol(u.nat),t=UT[u.type];const done=u.done&&u.nat===G.cur;const air=t.d==='air';let s='';
  if(air)s+=`<ellipse cx="5" cy="9" rx="8" ry="3" fill="#000" opacity=".3"/>`;
  s+=`<circle r="11.5" fill="rgba(10,14,19,.76)" stroke="${col}" stroke-width="2.2"/>`;
  if(sel)s+=`<circle r="15.5" fill="none" stroke="${FX.ink}" stroke-width="1.4" stroke-dasharray="3 2.5"/>`;
  s+=`<g transform="rotate(${Math.round(u.face||0)})" fill="#ece6d6" stroke="#1d2126" stroke-width=".5">${GLY[u.type]}</g>`;
  if(u.hp<10){const hc=u.hp>6?'#5cd18a':u.hp>3?'#f0b23a':'#ff5a4e';s+=`<rect x="-9" y="13" width="18" height="2.8" rx="1" fill="rgba(0,0,0,.65)"/><rect x="-9" y="13" width="${(18*u.hp/10).toFixed(1)}" height="2.8" rx="1" fill="${hc}"/>`;}
  for(let i=0;i<(u.rank||0);i++)s+=`<path d="M-16.5 ${-6+i*3.4}l2.6 -1.8l2.6 1.8" stroke="#f0b23a" stroke-width="1.4" fill="none"/>`;
  if(u.dug)s+=`<path d="M-12 8a12 6 0 0 0 24 0" fill="none" stroke="#c9b48a" stroke-width="2.4" stroke-dasharray="2.6 1.2"/>`;
  if(G.peace&&u.nat!==G.viewer&&atPeace(u.nat,G.viewer))s+=`<circle cx="10" cy="-10" r="3" fill="${FX.ok}" stroke="#0b0f14"/>`;
  if((t.fuel&&u.fuel<=t.fuel*0.25)||(t.ammo&&u.ammo===0))s+=`<circle cx="-10" cy="-10" r="3" fill="${FX.hit}" stroke="#0b0f14"/>`;
  if(u.supNow)s+=`<g transform="translate(0,-15)"><circle r="3.6" fill="#a19c90" stroke="#0b0f14" stroke-width=".6"/><circle cx="3.2" cy="1" r="2.6" fill="#a19c90"/></g>`;
  if(u.order&&u.order.t==='sentry'&&u.nat===G.viewer)s+=`<g transform="translate(11,9)"><circle r="4.2" fill="#0b0f14" stroke="#e8ecef" stroke-width=".8"/><ellipse rx="2.6" ry="1.5" fill="none" stroke="#e8ecef" stroke-width=".8"/><circle r=".9" fill="#e8ecef"/></g>`;
  if(u.cargo)s+=`<rect x="5" y="5" width="11" height="9" rx="1.5" fill="${col}" stroke="#0b0f14"/><text x="10.5" y="12" text-anchor="middle" font-size="6.5" font-weight="700" fill="#fff">${UT[u.cargo.type].n[0]}</text>`;
  return `<g opacity="${done?.5:1}">${s}</g>`;}
const UL={els:new Map(),g:null};
function renderUnits(vs,vn){const layer=$('#g-units');if(UL.g!==G){layer.innerHTML='';UL.els.clear();UL.g=G;}const keep=new Set();
  for(const u of G.units){if(vs&&!seen(u,vn,vs))continue;keep.add(u.id);const [x,y]=px(u.r,u.c);let el=UL.els.get(u.id);
    if(!el){el=document.createElementNS('http://www.w3.org/2000/svg','g');el.setAttribute('class','u');el.style.transform=`translate(${x}px,${y}px)`;layer.appendChild(el);UL.els.set(u.id,el);}
    el.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;const sel=u===UI.sel;const t=UT[u.type];
    const sig=[u.type,u.nat,u.hp,u.rank,u.dug,u.done&&u.nat===G.cur,sel,Math.round(u.face||0),u.cargo&&u.cargo.type,(t.fuel&&u.fuel<=t.fuel*.25)||(t.ammo&&u.ammo===0),G.peace&&atPeace(u.nat,G.viewer),u.supNow,u.order&&u.order.t].join('|');
    if(el._sig!==sig){el.innerHTML=unitInner(u,sel);el._sig=sig;}}
  for(const [id,el] of UL.els)if(!keep.has(id)){el.remove();UL.els.delete(id);}}
function renderBoard(){const vn=G.viewer,vs=G.fog?visSet(vn):null;ensureTerrain();let grid='',fog='',sitesH='',hlH='',rng='';const NMS=names();
  const gs=UI.grid?.18:.05;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const x=G.map[r][c];const [cx,cy]=px(r,c);const k=key(r,c);
    grid+=`<polygon data-k="${k}" points="${hexPts(cx,cy,R-0.4)}" fill="transparent" stroke="rgba(255,255,255,${gs})" stroke-width=".8"/>`;
    if(vs&&!vs.has(k))fog+=`<polygon points="${hexPts(cx,cy,R+0.6)}"/>`;
    const oc=mapCol(x.owner);
    if(x.t==='city'||x.t==='hq'){const nm0=NMS.city[k]||'';const nm=nm0+(x.dev?' '+'▮'.repeat(x.dev):'');const w=nm.length*4.9+13;
      sitesH+=`<g transform="translate(${cx},${cy+12})"><rect x="${-w/2}" y="0" width="${w}" height="11.5" rx="1.5" fill="rgba(9,13,18,.88)"/><rect x="${-w/2}" y="0" width="3" height="11.5" fill="${oc}"/><text x="1.5" y="8.4" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="7.4" font-weight="600" letter-spacing=".04em" fill="#e9e6dc">${nm}</text></g>`;
      if(x.t==='hq')sitesH+=`<path d="M${cx} ${cy-9}l2.3 4.6 5 .7-3.6 3.5.9 5-4.6-2.4-4.6 2.4.9-5-3.6-3.5 5-.7z" fill="${oc}" stroke="#0b0f14" stroke-width=".9"/>`;}
    else if(x.t==='oil'||x.t==='mine'||x.rig){const ic=x.t==='mine'?`<path d="M-2.6 2L0 -2.6L2.6 2Z" fill="#e9e6dc"/>`:`<path d="M0 -3C-2.4 0-2.4 2.6 0 2.6S2.4 0 0 -3Z" fill="#e9e6dc"/>`;
      sitesH+=`<g transform="translate(${cx+8},${cy-8})"><rect x="-5" y="-5" width="10" height="10" transform="rotate(45)" fill="rgba(9,13,18,.86)" stroke="${oc}" stroke-width="1.6"/>${ic}</g>`;}
    if(x.bld&&x.bld.type==='airfield'){const b=x.bld;const [rx,ry]=px(kr(b.rw),kc(b.rw));const dx=rx-cx,dy=ry-cy,Ln=Math.hypot(dx,dy),ux=dx/Ln,uy=dy/Ln;const ang=Math.atan2(dy,dx)*180/Math.PI;
      const mx=(cx+rx)/2,my=(cy+ry)/2,len=Ln+R*1.5;const k=key(r,c);const H=hangar(k);const cap=baseCap(k);
      sitesH+=`<g transform="translate(${mx.toFixed(1)},${my.toFixed(1)}) rotate(${ang.toFixed(1)})" opacity="${b.left?.55:1}"><rect x="${(-len/2).toFixed(1)}" y="-5.5" width="${len.toFixed(1)}" height="11" rx="1" fill="#34383b" stroke="${b.left?FX.hit:'#55595c'}" stroke-width="1" ${b.left?'stroke-dasharray="3 2"':''}/>`+
        `<path d="M${(-len/2+8).toFixed(1)} 0H${(len/2-8).toFixed(1)}" stroke="#e9e6dc" stroke-width="1" stroke-dasharray="5 4"/>`+[-1,1].map(sg=>`<path d="M${(sg*(len/2-3)).toFixed(1)} -4V4M${(sg*(len/2-5)).toFixed(1)} -4V4" stroke="#e9e6dc" stroke-width=".9"/>`).join('')+
        `<rect x="${(-Ln/2-6).toFixed(1)}" y="5.5" width="14" height="7" fill="#45494b"/></g>`;
      sitesH+=`<g transform="translate(${cx},${cy-15})"><rect x="-17" y="-6" width="34" height="12" rx="2" fill="rgba(9,13,18,.9)" stroke="${oc}" stroke-width="1.4"/><text y="3.4" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="7.5" font-weight="600" fill="#e9e6dc">${b.left?'복구 '+b.left:'✈ '+H.length+'/'+cap}</text></g>`;}
    else if(x.bld&&x.bld.type==='shipyard'){const b=x.bld;sitesH+=`<g transform="translate(${cx},${cy})" opacity="${b.left?.55:1}"><rect x="-12" y="-7" width="24" height="14" rx="1.5" fill="#3a3f43" stroke="${oc}" stroke-width="1.6" ${b.left?'stroke-dasharray="2.5 2"':''}/><rect x="-9" y="-3.5" width="18" height="7" fill="#22374a"/><path d="M-7 0H6L8.5 0" stroke="#9aa3a8" stroke-width="2.4" stroke-linecap="round"/><path d="M10 -9V7M10 -9H2" stroke="#f0b23a" stroke-width="1.4"/></g>`;}
    else if(x.bld&&x.bld.type==='arsenal'){const b=x.bld;sitesH+=`<g transform="translate(${cx},${cy})" opacity="${b.left?.55:1}"><rect x="-12" y="-8" width="24" height="16" rx="1.5" fill="#6e6a62" stroke="${oc}" stroke-width="1.6" ${b.left?'stroke-dasharray="2.5 2"':''}/><path d="M-12 -2l4 -6v6l4 -6v6l4 -6v6l4 -6v6l4 -6v6" fill="none" stroke="#4a4740" stroke-width="1.2"/><rect x="-5" y="2" width="10" height="5" fill="#2a2d30"/></g>`;}
    else if(x.bld&&x.bld.type==='hangar'){const b=x.bld;sitesH+=`<g transform="translate(${cx},${cy})" opacity="${b.left?.55:1}"><rect x="-11" y="-8" width="22" height="16" rx="7" fill="#7d8184" stroke="${oc}" stroke-width="1.6" ${b.left?'stroke-dasharray="2.5 2"':''}/>${[-5,-1.5,2,5.5].map(v=>`<path d="M${v} -7.5V7.5" stroke="#5c6063" stroke-width="1"/>`).join('')}<rect x="-4" y="5" width="8" height="3" fill="#2a2d30"/></g>`;}
    else if(x.bld){const b=x.bld;sitesH+=`<g transform="translate(${cx},${cy})" opacity="${b.left?.6:1}"><rect x="-8" y="-8" width="16" height="16" rx="2.5" fill="rgba(9,13,18,.88)" stroke="${oc}" stroke-width="1.6" ${b.left?'stroke-dasharray="2.5 2"':''}/><text y="3.6" text-anchor="middle" font-size="9.5" font-weight="700" fill="#e9e6dc">${b.left?b.left:BT[b.type].s}</text></g>`;}
    if(x.ruin>0){sitesH+=`<polygon points="${hexPts(cx,cy,R-1.5)}" fill="#15120f" opacity="${(x.ruin*.16).toFixed(2)}"/>`;for(let i=0;i<x.ruin*3;i++){const ox=((i*37)%17)-8,oy=((i*53)%13)-6;sitesH+=`<rect x="${(cx+ox).toFixed(1)}" y="${(cy+oy).toFixed(1)}" width="3" height="2.4" fill="${i%2?'#4a4540':'#2c2926'}"/>`;}for(let i=0;i<x.ruin;i++)sitesH+=`<circle cx="${cx-5+i*5}" cy="${cy-4}" r="3.2" class="rise" style="animation-delay:${i*0.9}s"/>`;}
    if(x.occ>0&&x.owner!=null)sitesH+=`<circle cx="${cx-10}" cy="${cy-9}" r="3.4" fill="rgba(9,13,18,.86)" stroke="${oc}" stroke-width="1.4" stroke-dasharray="1.6 1.4"/>`;
    if((x.t==='city'||x.t==='hq'||(x.bld&&x.bld.type==='port'))&&blockaded(r,c))sitesH+=`<path d="M${cx-13} ${cy-11}q2 -3 4 0t4 0t4 0" fill="none" stroke="${FX.hit}" stroke-width="2"/>`;}
  {const T=terr();let tint='',bord='',front='';
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const o=T[r][c];if(o==null)continue;const [cx,cy]=px(r,c);
      tint+=`<polygon points="${hexPts(cx,cy,R+0.5)}" fill="${mapCol(o)}"/>`;
      for(const [a,b] of nbrs(r,c)){const p=T[a][b];if(p===o)continue;if(p!=null&&(a<r||(a===r&&b<c)))continue;
        const [nx,ny]=px(a,b);const mx=(cx+nx)/2,my=(cy+ny)/2,dx=nx-cx,dy=ny-cy,L2=Math.hypot(dx,dy),qx=-dy/L2*R/2,qy=dx/L2*R/2;
        const seg=`M${(mx+qx).toFixed(1)} ${(my+qy).toFixed(1)}L${(mx-qx).toFixed(1)} ${(my-qy).toFixed(1)}`;
        if(p==null)bord+=`<path d="${seg}" stroke="${mapCol(o)}" stroke-width="1.6" opacity=".75"/>`;
        else front+=`<path d="${seg}" stroke="${hostile(o,p)?FX.hit:FX.ok}" stroke-width="${hostile(o,p)?3:2}" stroke-linecap="round" ${hostile(o,p)?'':'stroke-dasharray="3 3"'}/>`;}}
    var terrH=`<g pointer-events="none" opacity=".12">${tint}</g><g pointer-events="none" fill="#04070c" opacity=".55">${fog}</g><g pointer-events="none" fill="none">${bord}${front}</g>`;}
  let trH='';for(const s of routeStates()){if(s.o==null)continue;const mine=s.o===vn||(G.peace&&atPeace(s.o,vn));if(!mine&&!s.active)continue;const pts=s.rt.p.map(k=>px(kr(k),kc(k)).map(v=>v.toFixed(1)).join(',')).join(' ');
    if(s.active)trH+=`<polyline points="${pts}" fill="none" stroke="${mapCol(s.o)}" stroke-width="${mine?2:1.4}" opacity="${mine?.9:.45}" class="trade"/>`;
    else{trH+=`<polyline points="${pts}" fill="none" stroke="${FX.hit}" stroke-width="1.8" stroke-dasharray="3 4" opacity=".85"/>`;if(s.at!=null){const [x,y]=px(kr(s.at),kc(s.at));trH+=`<path d="M${x-5} ${y-5}l10 10M${x+5} ${y-5}l-10 10" stroke="${FX.hit}" stroke-width="2.4"/>`;}}}
  let scH='';for(const sc of (G.scorch||[])){const age=G.turn-sc.t;if(age>6)continue;const [x,y]=px(sc.r,sc.c);const op=(.5*(1-age/7)).toFixed(2);scH+=sc.s?`<circle cx="${x}" cy="${y}" r="9" fill="#1a1d1f" opacity="${op}"/><circle cx="${x+5}" cy="${y-3}" r="4" fill="#2a2e30" opacity="${op}"/>`:`<circle cx="${x}" cy="${y}" r="10" fill="#1c1611" opacity="${op}"/><circle cx="${x-4}" cy="${y+3}" r="5" fill="#2b2219" opacity="${op}"/>`;}
  let fortH='';for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const f=G.map[r][c].fort;if(!f)continue;if(f.t==='mines'&&f.o!==vn)continue;const [cx,cy]=px(r,c);const col=mapCol(f.o);
    if(f.t==='fence')fortH+=`<path d="M${cx-12} ${cy+9}l4 -5l4 5l4 -5l4 5l4 -5l4 5" fill="none" stroke="${col}" stroke-width="1.6"/><path d="M${cx-12} ${cy+6.5}h24" stroke="${col}" stroke-width=".8"/>`;
    else if(f.t==='bunker')fortH+=`<path d="M${cx-9} ${cy+11}A9 7 0 0 1 ${cx+9} ${cy+11}Z" fill="${col}" stroke="#0b0f14" stroke-width=".8"/><path d="M${cx-4} ${cy+8}h8" stroke="#0b0f14" stroke-width="1.6"/>`;
    else fortH+=`<g fill="${col}">${[[-6,9],[0,11],[6,9],[-3,5],[3,5]].map(([a,b])=>`<circle cx="${cx+a}" cy="${cy+b}" r="1.6"/>`).join('')}</g>`;}
  const ring=(r,c,hexes,col,op)=>{const [cx,cy]=px(r,c);const rad=(hexes+0.5)*S3*R;rng+=`<circle cx="${cx}" cy="${cy}" r="${rad.toFixed(0)}" fill="${col}" fill-opacity="${op}" stroke="${col}" stroke-opacity=".55" stroke-width="1.2" stroke-dasharray="5 4"/>`;};
  for(const u of G.units){if(vs&&!seen(u,vn,vs))continue;if(u.type==='sam'||u.type==='aa')ring(u.r,u.c,rngU(u)[1]+(u.type==='aa'?.4:0),u.type==='sam'?'#b383ff':mapCol(u.nat),.07);}
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const x=G.map[r][c];if(x.owner===vn&&x.bld&&x.bld.type==='radar'&&!x.bld.left)ring(r,c,5,'#5cd18a',.03);}
  for(const u of G.units)if(u.nat===vn&&u.type==='aor')ring(u.r,u.c,UT.aor.replen,'#5cd18a',.05);
  for(const u of G.units)if(u.nat===vn&&u.type==='tnk')ring(u.r,u.c,UT.tnk.tanker,'#f0c45a',.05);
  if(UI.sel){const s=UI.sel;const hi=rngU(s)[1];if(dmgBase(s.type,'inf')||dmgBase(s.type,'ftr')||dmgBase(s.type,'dd'))ring(s.r,s.c,hi,FX.hit,.05);}
  const hl=(keys,attrs)=>{for(const k of keys){const [cx,cy]=px(kr(k),kc(k));hlH+=`<polygon points="${hexPts(cx,cy,R-1.6)}" ${attrs}/>`;}};
  if(UI.reach)hl(UI.reach.keys(),`fill="#2f6bff" fill-opacity=".22" stroke="${FX.move}" stroke-opacity=".5" stroke-width=".8"`);
  hl(UI.loads,`fill="none" stroke="${FX.move}" stroke-width="2" stroke-dasharray="3 2"`);
  hl(UI.unloads,`fill="${FX.ok}" fill-opacity=".35" stroke="${FX.ok}" stroke-width="2"`);
  if(UI.phase==='msl'&&UI.mt!=null){const sp=UI.sp??1;for(const [a,b] of strikeHexes(kr(UI.mt),kc(UI.mt),sp)){const dd=dist(a,b,kr(UI.mt),kc(UI.mt));const [cx,cy]=px(a,b);hlH+=`<polygon points="${hexPts(cx,cy,R-1.4)}" fill="${FX.hit}" fill-opacity="${(.55-dd*.15).toFixed(2)}" stroke="${FX.hit}" stroke-width="1.2"/>`;}const [mx,my]=px(kr(UI.mt),kc(UI.mt));hlH+=`<circle cx="${mx}" cy="${my}" r="${((sp+.5)*S3*R).toFixed(0)}" fill="none" stroke="${FX.hit}" stroke-width="2" stroke-dasharray="6 4"/>`;}
  hl(UI.targets,`fill="${FX.hit}" fill-opacity=".18" stroke="${FX.hit}" stroke-width="2.4"`);if(UI.fc!=null)hl([UI.fc],`fill="${FX.hit}" fill-opacity=".42" stroke="${FX.hit}" stroke-width="3.5"`);
  if(UI.pane)hl([key(UI.pane.r,UI.pane.c)],`fill="none" stroke="${FX.ink}" stroke-width="2" stroke-dasharray="3 2"`);
  $('#g-board').innerHTML=grid+terrH+`<g pointer-events="none">${trH}${scH}${rng}${sitesH}${fortH}${hlH}</g>`;
  renderUnits(vs,vn);
  let top='';for(const u of G.units){if(u.nat!==vn||!u.order||u.order.t!=='goto')continue;const [x1,y1]=px(u.r,u.c),[x2,y2]=px(u.order.r,u.order.c);top+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${mapCol(vn)}" stroke-width="1.4" stroke-dasharray="2 4" opacity=".8"/><path d="M${x2} ${y2}v-12l8 3-8 3" fill="${mapCol(vn)}" stroke="#0b0f14" stroke-width=".6"/>`;}
  if(G.hint&&G.cur===vn){const a=G.units.find(u=>u.id===G.hint.u);if(a){const [x1,y1]=px(a.r,a.c),[x2,y2]=px(kr(G.hint.t),kc(G.hint.t));
    top=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${FX.hit}" stroke-width="2" stroke-dasharray="4 3" opacity=".9"/><circle cx="${x2}" cy="${y2}" r="14" fill="none" stroke="${FX.hit}" stroke-width="1.5" stroke-dasharray="2 2"/>`;}}
  $('#g-top').innerHTML=top;drawPath();
  const zw=(W*UI.zoom).toFixed(0),zh=(H*UI.zoom).toFixed(0);const st=$('#stage');st.style.width=zw+'px';st.style.height=zh+'px';
  const svg=$('#map');svg.setAttribute('viewBox',`0 0 ${W.toFixed(1)} ${H.toFixed(1)}`);svg.setAttribute('width',zw);svg.setAttribute('height',zh);
  updateHUD();renderActbar();}
function updateHUD(){if(typeof document==='undefined'||!G)return;const h=hourOf(),vn=G.viewer,N=G.nats[vn];const night=isNight();
  const ic=night?`<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M8.5 1.2A5 5 0 1 0 10.8 9 4 4 0 0 1 8.5 1.2Z" fill="#e8ecef"/></svg>`:`<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="2.6" fill="#f0c45a"/><g stroke="#f0c45a" stroke-width="1.2">${[0,45,90,135].map(a=>`<path d="M6 .4V2M6 10V11.6" transform="rotate(${a} 6 6)"/>`).join('')}</g></svg>`;
  $('#hud-clock').innerHTML=`${ic}<b>${String(h).padStart(2,'0')}:00</b><small>R${G.turn} · ${WX[G.wx].n}</small>`;
  const pl=$('#hud-region');pl.style.borderColor=mapCol(vn);updateRegion();}
function updateRegion(){const b=$('#board');if(!b||!G)return;const st=$('#stage');const x=(b.scrollLeft+b.clientWidth/2-st.offsetLeft)/UI.zoom,y=(b.scrollTop+b.clientHeight/2-st.offsetTop)/UI.zoom;const h=hexAt(x,y);$('#hud-region').textContent=regionAt((h/COLS)|0,h%COLS);}
function renderActbar(){const el=$('#actbar');if(!el)return;const n=G.cur;if(G.handoff){el.hidden=true;return;}el.hidden=false;let h='';const s=UI.sel;
  if(G.over){const w=G.over.win;el.innerHTML=`<b>${w==null?'작전 실패':NATS[w].full+' 승리'}</b><span>${G.turn}라운드</span><div class="ab"><button class="btn sm" data-act="report" id="ab-rep">보고서</button><button class="btn sm primary" data-act="new" id="ab-new">새 작전</button></div>`;return;}
  if(isAI(n)||G.busy){el.innerHTML=`<b style="color:${mapCol(n)}">${NATS[n].full}</b><span>AI 작전 중…</span>`;return;}
  if(UI.phase==='goto'&&s){h=`<b>${UT[s.type].n} 목표 지정</b><span>지도에서 목표 지점을 탭하세요. 매 턴 자동으로 이동합니다.</span><div class="ab"><button class="btn sm" data-act="goto-cancel" id="ab-gc">취소</button></div>`;}
  else if(UI.phase==='msl'&&UI.mk==='b'&&UI.mt!=null){h=`<b>탄도미사일 타격 범위</b><span>${SPREAD[UI.sp??1].desc} · 같은 칸을 다시 탭하거나 발사</span><div class="ab">${[0,1,2].map(sp=>`<button class="btn sm${(UI.sp??1)===sp?' primary':''}" data-act="spread:${sp}" id="ab-sp${sp}">${SPREAD[sp].n}</button>`).join('')}<button class="btn sm primary" data-act="fire-msl" id="ab-fire-msl">발사</button><button class="btn sm" data-act="msl-cancel" id="ab-mslc2">취소</button></div>`;}
  else if(UI.phase==='msl'){h=`<b>${MSL[UI.mk].n} 발사</b><span>${UI.targets.length?'붉은 칸 목표를 탭하세요':'사정권 안에 보이는 목표 없음'}</span><div class="ab"><button class="btn sm" data-act="msl-cancel" id="ab-mslc">취소</button></div>`;}
  else if(s&&UI.fc!=null){const d=unitAt(kr(UI.fc),kc(UI.fc));const ev=d?calcDmg(s,d,false):0;const lo=Math.round(ev*.85),hi=d?Math.min(d.hp,Math.round(ev*1.15)):0;
    h=`<b>${UT[s.type].n} → ${d?UT[d.type].n:''}</b><span>예상 −${lo}~${hi}${d&&lo>=d.hp?' · 격파 확실':d&&hi>=d.hp?' · 격파 가능':''}</span><div class="ab"><button class="btn sm primary" data-act="confirm" id="ab-fire">공격</button><button class="btn sm" data-act="fc-cancel" id="ab-fcc">취소</button></div>`;}
  else if(s){const t=UT[s.type];const info=`체력 ${s.hp}${t.fuel?` · 연료 ${s.fuel}`:''}${t.ammo?` · 탄약 ${s.ammo}`:''}${s.cargo?` · 탑재 ${UT[s.cargo.type].n}`:''}`;
    const tips=[];if(UI.reach&&UI.reach.size>1)tips.push('파랑 이동');if(UI.loads.length)tips.push('점선 탑승');if(UI.unloads.length)tips.push('초록 상륙');if(UI.targets.length)tips.push('빨강 공격');
    h=`<b>${t.n}</b><span>${info}${tips.length?' · '+tips.join(' · '):''}</span><div class="ab">${capturable(s)?`<button class="btn sm primary" data-act="capture" id="ab-cap">점령</button>`:''}<button class="btn sm" data-act="wait" id="ab-wait">대기</button>${UI.phase==='select'?(s.order?`<button class="btn sm" data-act="unorder" id="ab-unord">명령 해제</button>`:`<button class="btn sm" data-act="goto" id="ab-goto">목표 이동</button><button class="btn sm" data-act="sentry" id="ab-sentry">경계</button>`):''}${(()=>{if(t.d!=='air')return '';const k=baseKeyOf(s.r,s.c);return k!=null&&cell(kr(k),kc(k)).owner===n&&hangar(k).length<baseCap(k)?`<button class="btn sm primary" data-act="store" id="ab-store">격납</button>`:'';})()}${UI.phase==='moved'&&!UI.orig?'':`<button class="btn sm" data-act="cancel" id="ab-cancel">${UI.phase==='moved'?'되돌리기':'해제'}</button>`}</div>`;}
  else if(UI.pane){const x=cell(UI.pane.r,UI.pane.c);const nm=names().city[key(UI.pane.r,UI.pane.c)]||'';const mine=x.owner===n&&(producer(x)||buildable(n,UI.pane.r,UI.pane.c)||fortable(n,UI.pane.r,UI.pane.c));
    h=`<b>${x.bld?BT[x.bld.type].n:x.rig?'해상 유전':TR[x.t].n}${nm?' '+nm:''}</b><span>${natName(x.owner)}${x.occ>0?` · 안정화 ${x.occ}턴`:''}</span><div class="ab">${mine||buildable(n,UI.pane.r,UI.pane.c)||fortable(n,UI.pane.r,UI.pane.c)?`<button class="btn sm primary" data-act="panel" id="ab-panel">생산·건설</button>`:`<button class="btn sm" data-act="panel" id="ab-panel">정보</button>`}<button class="btn sm" data-act="close" id="ab-close">닫기</button></div>`;}
  else{const left=G.units.filter(u=>u.nat===n&&!u.done&&!u.order).length;const ordN=G.units.filter(u=>u.nat===n&&u.order).length;h=`<b>${NATS[n].name} 사령부</b><span>대기 부대 ${left}${ordN?` · 예약 명령 ${ordN}`:''}${G.vic?` · ${G.turn}/${G.vic}R`:''}</span><div class="ab">${left?`<button class="btn sm" data-act="next" id="ab-next">다음 부대</button>`:''}<button class="btn sm primary" data-act="end" id="ab-end">턴 종료</button></div>`;}
  el.innerHTML=h;}
function centerOn(r,c){const [x,y]=px(r,c);const b=$('#board'),st=$('#stage');b.scrollLeft=st.offsetLeft+x*UI.zoom-b.clientWidth/2;b.scrollTop=st.offsetTop+y*UI.zoom-b.clientHeight/2;updateRegion();}
let toastT=null;
function toast(m){if(typeof document==='undefined')return;const el=$('#toast');if(!el)return;el.textContent=m;el.hidden=false;el.classList.remove('in');void el.offsetWidth;el.classList.add('in');clearTimeout(toastT);toastT=setTimeout(()=>{el.hidden=true;},2600);}
function fxKill(u){G.scorch=G.scorch||[];if(UT[u.type].d!=='air')G.scorch.push({r:u.r,c:u.c,t:G.turn,s:UT[u.type].d==='sea'?1:0});if(G.scorch.length>40)G.scorch.shift();
  if(typeof document==='undefined')return;const g=$('#g-pops');if(!g)return;const [x,y]=px(u.r,u.c);const ns='http://www.w3.org/2000/svg';const made=[];
  const mk=(t,at,cls)=>{const e=document.createElementNS(ns,t);for(const k in at)e.setAttribute(k,at[k]);if(cls)e.setAttribute('class',cls);g.appendChild(e);made.push(e);return e;};
  setTimeout(()=>{sfx('boom');mk('circle',{cx:x,cy:y,r:'9'},'flash big');for(let i=0;i<7;i++)mk('circle',{cx:(x+(Math.random()-.5)*16).toFixed(1),cy:(y+(Math.random()-.5)*12).toFixed(1),r:(4+Math.random()*3).toFixed(1),style:`animation-delay:${i*110}ms`},'smoke');},450);
  setTimeout(()=>made.forEach(e=>e.remove()),3600);}
function fxFire(a,d){if(typeof document==='undefined')return;sfx(dist(a.r,a.c,d.r,d.c)>1||UT[a.type].ind?'arty':'shot',.8);const g=$('#g-pops');if(!g)return;const ns='http://www.w3.org/2000/svg';const made=[];
  const mk=(t,at,cls)=>{const e=document.createElementNS(ns,t);for(const k in at)e.setAttribute(k,at[k]);if(cls)e.setAttribute('class',cls);g.appendChild(e);made.push(e);return e;};
  const [x1,y1]=px(a.r,a.c),[x2,y2]=px(d.r,d.c);const dd=dist(a.r,a.c,d.r,d.c);const far=dd>1||UT[a.type].ind;
  if(far){const n=['art','bb'].includes(a.type)?3:1;const mx=(x1+x2)/2,my=Math.min(y1,y2)-24-dd*7;
    for(let i=0;i<n;i++){const o=(i-(n-1)/2)*5;mk('path',{d:`M${x1+o} ${y1}Q${mx+o} ${my} ${x2+o*1.6} ${y2+o*.6}`,pathLength:'100',style:`animation-delay:${i*110}ms`},'streak');}}
  else{const L2=Math.hypot(x2-x1,y2-y1)||1,ux=(x2-x1)/L2,uy=(y2-y1)/L2;mk('line',{x1:x1+ux*10,y1:y1+uy*10,x2:x2-ux*6,y2:y2-uy*6},'tracer');}
  mk('circle',{cx:(x1+(x2-x1)*.16).toFixed(1),cy:(y1+(y2-y1)*.16).toFixed(1),r:'3'},'flash');
  setTimeout(()=>{sfx('hit',.7);mk('circle',{cx:x2,cy:y2,r:'5'},'flash');for(let i=0;i<4;i++)mk('circle',{cx:(x2+(Math.random()-.5)*12).toFixed(1),cy:(y2+(Math.random()-.5)*9).toFixed(1),r:(3+Math.random()*2.5).toFixed(1),style:`animation-delay:${i*130}ms`},'smoke');},far?560:170);
  setTimeout(()=>made.forEach(e=>e.remove()),3200);}
// 마우스를 올린 칸까지의 이동 경로 미리보기 (데스크톱)
function drawPath(){const g=$('#g-path');if(!g)return;const s=UI.sel,k=UI.hk;if(!s||UI.phase!=='select'||!UI.reach||k==null||!UI.reach.has(k)||k===key(s.r,s.c)){g.innerHTML='';return;}
  const pts=[];let c=k,guard=0;while(c!=null&&guard++<60){pts.push(px(kr(c),kc(c)));if(c===key(s.r,s.c))break;c=UI.reach.prev.get(c);}
  if(pts[pts.length-1][0]!==px(s.r,s.c)[0]||pts[pts.length-1][1]!==px(s.r,s.c)[1])pts.push(px(s.r,s.c));pts.reverse();const [ex,ey]=pts[pts.length-1];const cost=UI.reach.get(k);
  g.innerHTML=`<polyline points="${pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')}" fill="none" stroke="#0b0f14" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity=".5"/><polyline points="${pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')}" fill="none" stroke="#f2efe6" stroke-width="2.2" stroke-dasharray="5 4" stroke-linecap="round" stroke-linejoin="round"/>`+
    `<circle cx="${ex}" cy="${ey}" r="5" fill="#f2efe6"/><g transform="translate(${ex+9},${ey-14})"><rect width="${UT[s.type].fuel?52:30}" height="13" rx="2" fill="rgba(9,13,18,.9)"/><text x="5" y="9.5" font-family="IBM Plex Mono,monospace" font-size="8" fill="#e9e6dc">${cost}칸${UT[s.type].fuel?` · 연료−${cost}`:''}</text></g>`;}
