/* ===================== 화면: 맞은 자리의 구멍·불탄 건물·내려앉은 위층 (05o3-scar) =====================
   v3BuildCity(07w-city 장식까지) 다음에 건물마다 덧그린다.
   - 벽 구멍: 검은 속(불규칙한 세 조각), 둘레 그을음, 깨진 콘크리트 조각·철근, 구멍에 걸친 바닥판, 벽 밑 부스러기.
     모서리를 맞은 구멍은 옆 벽까지 이어진다. 지붕 구멍은 위에서 보이는 검은 구멍.
   - 불탄 건물(x.burnt·x.gut): 창이 까맣게 비고 창 위로 그을음이 번진다. 벽은 서 있다.
   - 위층이 내려앉은 칸(x.lost): 꺾인 기둥 그루터기·철근·옥상 위 잔해. */
function scView(){const T=V3.T,g=V3.G.city;if(!G||!g||!T||typeof cxInst!=='function')return;const m=cxMats(),G2=cxGeos();const H=v3Hash,FH=FLOOR_H,IN=.08;
  const HO=[],SO=[],SG=[],RI=[],IR=[],PA=[];
  const conc=['#6e6a63','#7d786f','#5f5b55','#857f75'];
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=G.map[r][c];if(x.t!=='bldg'||x.lm)continue;const sc=x.scar,burnt=x.burnt||(x.gut||0)>.45;if(!(sc&&sc.length)&&!burnt&&!x.lost)continue;
    const k=key(r,c),top=.06+bldgH(x)*FH,nf=Math.max(1,Math.round(bldgH(x)));
    const op=s=>{const dr=[-1,0,1,0][s],dc=[0,1,0,-1][s];return !inb(r+dr,c+dc)||G.map[r+dr][c+dc].t!=='bldg';};
    const dmg=1-x.bhp/x.bmax;const same=(a,b)=>inb(a,b)&&G.map[a][b].t==='bldg'&&x.blk!=null&&G.map[a][b].blk===x.blk&&G.map[a][b].bhp/G.map[a][b].bmax>.5&&dmg<.5;   // 07w-city와 같은 외벽 자리
    const x0=c+(same(r,c-1)?0:IN),x1=c+1-(same(r,c+1)?0:IN),z0=r+(same(r-1,c)?0:IN),z1=r+1-(same(r+1,c)?0:IN);
    const faces=cxFaces(r,c,x0,x1,z0,z1);const side=f=>f.nz<-.5?0:f.nx>.5?1:f.nz>.5?2:3;const F=[null,null,null,null];for(const f of faces)F[side(f)]=f;
    // 벽 구멍 하나: 면 f, 면 위 거리 d, 높이 y
    const hole=(f,d,y,w,hh,seed,full)=>{const at=(dd,o)=>cxAt(f,dd,o);const [px,pz]=at(d,.02);const cy0=y-hh/2+.02;
      // 깨져 나간 둘레(밝은 콘크리트 속살) 위에 검은 속: 덩어리 몇 개를 돌려 겹쳐 불규칙하게
      for(let i=0;i<7;i++){const a=i/7*6.283+H(seed,40+i)*.7,rr=.4+H(seed,41+i)*.12;const [qx,qz]=at(d+Math.cos(a)*w*rr,.012+i*.0004);
        HO.push({x:qx,y:y+Math.sin(a)*hh*rr,z:qz,sx:w*(.35+H(seed,42+i)*.25),sy:hh*(.25+H(seed,43+i)*.2),sz:.012,ry:f.ry,rz:H(seed,44+i)*3,col:H(seed,45+i)<.5?'#8f8a80':'#7c776e',k,cy:cy0});}
      HO.push({x:px,y,z:pz,sx:w*.78,sy:hh*.78,sz:.02,ry:f.ry,rz:(H(seed,1)-.5)*.5,col:'#0d0c0b',k,cy:cy0});
      for(let i=0;i<4;i++){const a=i/4*6.283+H(seed,i+20)*1.2;const [qx,qz]=at(d+Math.cos(a)*w*.2,.0205+i*.0003);HO.push({x:qx,y:y+Math.sin(a)*hh*.2,z:qz,sx:w*(.42+H(seed,i+3)*.2),sy:hh*(.38+H(seed,i+5)*.2),sz:.02,ry:f.ry,rz:H(seed,i+7)*3,col:i%2?'#121110':'#0a0908',k,cy:cy0});}
      if(!full)return;
      const [sx,sz]=at(d,.003);SG.push({x:sx,y:y+hh*.5,z:sz,sx:w*1.7,sy:hh*2,sz:1,ry:f.ry,col:'#ffffff',k,cy:y-hh/2+.02});
      const n=6+((H(seed,9)*4)|0);for(let i=0;i<n;i++){const a=i/n*6.283+H(seed,10+i)*.6;const [qx,qz]=at(d+Math.cos(a)*w*.5,.026+H(seed,30+i)*.01);const s=.007+H(seed,50+i)*.012;
        RI.push({x:qx,y:y+Math.sin(a)*hh*.5,z:qz,sx:s,sy:s*.8,sz:s,rx:H(seed,70+i)*3,ry:H(seed,90+i)*6,col:conc[(H(seed,110+i)*4)|0],k});}
      for(let i=0;i<3;i++){const a=H(seed,130+i)*6.283;const [qx,qz]=at(d+Math.cos(a)*w*.42,.03);const l=.025+H(seed,140+i)*.04;
        IR.push({x:qx,y:y+Math.sin(a)*hh*.42,z:qz,sx:.003,sy:l,sz:.003,rx:(H(seed,150+i)-.5)*1.4,ry:f.ry,rz:a-Math.PI/2+(H(seed,160+i)-.5),col:'#3d3128',k});}
      // 구멍에 걸친 바닥판
      const ys=.06+Math.round((y-.06)/FH)*FH;if(hh>FH*.45&&Math.abs(ys-y)<hh*.45&&ys<top-.02){const [qx,qz]=at(d,.02);PA.push({x:qx,y:ys,z:qz,sx:w*.92,sy:.016,sz:.03,ry:f.ry,col:'#8b867d',k});}
      // 벽 밑 부스러기
      const nd=2+((H(seed,170)*3)|0);for(let i=0;i<nd;i++){const [qx,qz]=at(d+(H(seed,180+i)-.5)*w*1.4,.03+H(seed,190+i)*.12);const s=.01+H(seed,200+i)*.018;RI.push({x:qx,y:s*.3,z:qz,sx:s*1.3,sy:s*.6,sz:s,rx:H(seed,210+i)*3,ry:H(seed,220+i)*6,col:conc[(H(seed,230+i)*4)|0]});}};
    if(sc)sc.forEach((q,qi)=>{const seed=k*31+qi*7+((q.t*100)|0);const w=Math.max(.04,2*q.R),hh=Math.min(Math.max(.035,2*q.R*.82),top-.08);
      if(q.s===4){// 지붕 구멍
        const px=c+q.t,pz=r+q.u,y=top+.004;
        for(let i=0;i<7;i++){const a=i/7*6.283+H(seed,40+i)*.7,rr=.38+H(seed,41+i)*.12;HO.push({x:px+Math.cos(a)*w*rr,y:y-.001,z:pz+Math.sin(a)*w*rr,sx:w*(.35+H(seed,42+i)*.25),sy:.01,sz:w*(.25+H(seed,43+i)*.2),ry:H(seed,44+i)*3,col:H(seed,45+i)<.5?'#8f8a80':'#7c776e',k,cy:top-.03});}
        HO.push({x:px,y,z:pz,sx:w*.72,sy:.012,sz:w*.68,ry:H(seed,1)*3,col:'#0d0c0b',k,cy:top-.03});
        for(let i=0;i<4;i++){const a=i/4*6.283+H(seed,i+20)*1.2;HO.push({x:px+Math.cos(a)*w*.2,y:y+.0005*(i+1),z:pz+Math.sin(a)*w*.2,sx:w*(.4+H(seed,i+3)*.2),sy:.012,sz:w*(.36+H(seed,i+5)*.2),ry:H(seed,i+7)*3,col:i%2?'#121110':'#0a0908',k,cy:top-.03});}
        const n=7;for(let i=0;i<n;i++){const a=i/n*6.283+H(seed,10+i);const s=.008+H(seed,50+i)*.012;RI.push({x:px+Math.cos(a)*w*.5,y:top+s*.4,z:pz+Math.sin(a)*w*.45,sx:s,sy:s*.7,sz:s,rx:H(seed,70+i)*3,ry:H(seed,90+i)*6,col:conc[(H(seed,110+i)*4)|0],k});}
        for(let i=0;i<2;i++){const a=H(seed,130+i)*6.283;IR.push({x:px+Math.cos(a)*w*.4,y:top+.02,z:pz+Math.sin(a)*w*.4,sx:.003,sy:.04,sz:.003,rx:(H(seed,150+i)-.5)*1.4,rz:(H(seed,160+i)-.5)*1.4,col:'#3d3128',k});}
        return;}
      const f=F[q.s];if(!f)return;
      const X=q.s===0||q.s===2?c+q.t:f.ax,Z=q.s===1||q.s===3?r+q.t:f.az;let d=(X-f.ax)*f.dx+(Z-f.az)*f.dz;
      const y=Math.min(top-hh*.5-.01,.06+(q.fl+.42+(H(seed,5)-.5)*.2)*FH);
      d=Math.max(w*.3,Math.min(f.len-w*.3,d));hole(f,d,y,w,hh,seed,true);
      // 모서리: 옆 벽까지 이어진 구멍
      const corner=d<w*.55||d>f.len-w*.55;if(corner){const s2=d<w*.55?(f===F[0]?1:f===F[1]?2:f===F[2]?3:0):(f===F[0]?3:f===F[1]?0:f===F[2]?1:2);const f2=F[s2];
        if(f2){const atStart=Math.hypot(f2.ax-(f.ax+f.dx*d),f2.az-(f.az+f.dz*d))<Math.hypot(f2.ax+f2.dx*f2.len-(f.ax+f.dx*d),f2.az+f2.dz*f2.len-(f.az+f.dz*d));
          hole(f2,atStart?w*.3:f2.len-w*.3,y,w*.7,hh,seed+5,false);}}});
    // 불탄 건물: 빈 창과 그을음
    if(burnt){const ks=x.ks||(x.ind?'ware':x.f>=8?'tower':x.dist==='res'&&x.f<=2?'house':'panel');const bk=x.blk??k;const s=ks==='house'&&H(bk,5)<.45?0:(KSTY[ks]||KSTY.panel).s;
      const W=CX_WIN[s]||CX_WIN[0],u0=((H(bk,3)*8)|0)*.37,gut=Math.max(x.burnt?.75:0,x.gut||0);
      for(const f of faces){const fk=k*4+side(f);for(const [t,n] of cxCols(f,u0,.06)){for(let i=0;i<nf;i++){if(H(fk,2000+i*16+n)>gut*.8)continue;
          const y0=.06+i*FH+W[0]*FH,hw=(W[1]-W[0])*FH;const [px,pz]=cxAt(f,t,.016);
          HO.push({x:px,y:y0+hw/2,z:pz,sx:.115,sy:hw*.92,sz:.012,ry:f.ry,col:'#0b0a09',k,cy:y0+.02});
          if(H(fk,2400+i*16+n)<.5){const [qx,qz]=cxAt(f,t,.004);SG.push({x:qx,y:y0+hw+FH*.35,z:qz,sx:.13+H(fk,2600+n)*.05,sy:FH*.8,sz:1,ry:f.ry,col:'#ffffff',k,cy:y0+hw});}}}}}
    // 내려앉은 위층: 꺾인 기둥 그루터기, 철근, 옥상 위 잔해
    if(x.lost){const n=4+((H(k,3000)*3)|0);for(let i=0;i<n;i++){const e=(H(k,3010+i)*4)|0,t=H(k,3020+i);const px=e===0||e===2?x0+(x1-x0)*t:e===1?x1-.02:x0+.02,pz=e===1||e===3?z0+(z1-z0)*t:e===0?z0+.02:z1-.02;const l=.04+H(k,3030+i)*.1;
        PA.push({x:px,y:top+l/2,z:pz,sx:.03,sy:l,sz:.03,rx:(H(k,3040+i)-.5)*.5,rz:(H(k,3050+i)-.5)*.5,col:'#8d877d',k,cy:top});
        IR.push({x:px+.01,y:top+l+.02,z:pz,sx:.003,sy:.05,sz:.003,rx:(H(k,3060+i)-.5)*1.6,rz:(H(k,3070+i)-.5)*1.6,col:'#3d3128',k,cy:top});}
      for(let i=0;i<12;i++){const s=.015+Math.pow(H(k,3100+i),2)*.05;RI.push({x:x0+.05+(x1-x0-.1)*H(k,3110+i),y:top+s*.3,z:z0+.05+(z1-z0-.1)*H(k,3120+i),sx:s*1.4,sy:s*.6,sz:s,rx:H(k,3130+i)*3,ry:H(k,3140+i)*6,col:conc[(H(k,3150+i)*4)|0],k,cy:top});}}}
  cxInst(g,G2.box,m.paint,HO,{keyed:1,noShadow:1});cxInst(g,G2.plane,m.soot,SO,{keyed:1,noShadow:1,noRecv:1});cxInst(g,G2.plane,m.grime,SG,{keyed:1,noShadow:1,noRecv:1});cxInst(g,G2.dode,m.deb,RI,{keyed:1});cxInst(g,G2.box,m.iron,IR,{keyed:1,noShadow:1});cxInst(g,G2.box,m.paint,PA,{keyed:1});}
if(typeof v3BuildCity==='function'){const f=v3BuildCity;v3BuildCity=function(){const r=f.apply(this,arguments);try{scView();}catch(e){console.warn('scar view',e);}return r;};}
