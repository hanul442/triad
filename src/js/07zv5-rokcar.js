/* ===================== 지휘·연락 차량 모형: 코란도 스포츠·렉스턴 스포츠·타스만 (홀수 세력: UAZ-469·UAZ 패트리엇·하이럭스) =====================
   07zv-vehicles의 vxKit를 쓴다. 치수는 m, 앞이 +x, 땅이 y=0. 군용 지휘차는 위장 무늬 없이 단색 국방색(무광에 가까운 민수 도장)이라
   '국방색' 재질(olv)을 따로 둔다. 검은 군 번호판, 작은 등화관제등, 안테나 받침을 단다.
   - 코란도 스포츠(2012~): 둥근 앞, 짧은 짐칸, 짐칸 롤바와 안테나 하나.
   - 렉스턴 스포츠(2020~): 더 크고 각진 그릴, 짐칸 위 하드톱(지휘 장비·짐), 안테나 둘.
   - 타스만(2025~): 각진 앞과 굵은 펜더, 짐칸 자리에 통신 모듈 상자(문·환기구), 오른쪽 스노클, 강철 범퍼·윈치, 안테나 셋.
   - 홀수 세력: UAZ-469(천 지붕 각진 지프) · UAZ 패트리엇(상자 SUV) · 하이럭스(짐칸 통신 상자). */
{const _mo=vxMatOf;vxMatOf=function(k,n){if(k==='olv')return vxMat('olv'+(n%2),{c:n%2?'#535c43':'#434a32',r:.6,mt:.28,dk:.8});return _mo(k,n);};}
/* 민수 픽업 공통: 바퀴·아래 차체·운전실·짐칸 벽. o={L(앞 끝 x), R(뒤 끝 x), w, wb:[앞축,뒤축], r(바퀴), hood, cab:[뒤,앞유리 아래,지붕 앞,지붕 뒤 x], roof, bed:false면 짐칸 없음} */
function rcBody(K,n,o){const {B,P}=K;const w=o.w,hw=w/2;
  for(const x of o.wb)for(const s of [-1,1])K.wheel(o.r,.27,x,o.r,s*(hw-.13),null,false);
  // 펜더(바퀴 위 둥근 턱)
  for(const x of o.wb)for(const s of [-1,1])B(o.r*2.3,.1,.14,x,o.r*2+.04,s*(hw-.02),o.flare?'dark':'olv');
  // 아래 차체(옆모습): 앞 범퍼 → 보닛 → 운전실 아래 → 짐칸 아래
  P([[o.R,.42],[o.L-.12,.42],[o.L,.62],[o.L,o.hood-.06],[o.L-.25,o.hood],[o.cab[1],o.hood+.05],[o.R,o.hood+.05]],w,0,0,0,'olv');
  // 운전실
  const [c0,c1,c2,c3]=o.cab;P([[c0,o.hood],[c1,o.hood],[c2,o.roof],[c3,o.roof]],w-.1,0,0,0,'olv');
  const ang=Math.atan2(o.roof-o.hood,c1-c2);
  B(.04,(o.roof-o.hood)/Math.sin(ang)*.92,w-.24,(c1+c2)/2+.01,(o.hood+o.roof)/2,0,'glass',null,[0,0,Math.PI/2-ang]);  // 앞유리
  for(const s of [-1,1]){B((c2-c3)*.4,(o.roof-o.hood)*.62,.03,c3+(c2-c3)*.72,o.hood+(o.roof-o.hood)*.47,s*(hw-.04),'glass');      // 앞문 창
    B((c2-c3)*.36,(o.roof-o.hood)*.62,.03,c3+(c2-c3)*.27,o.hood+(o.roof-o.hood)*.47,s*(hw-.04),'glass');                           // 뒷문 창
    B(.03,o.hood-.5,.03,c3+(c2-c3)*.5,(o.hood+.5)/2,s*(hw+.005),'dark');                                                            // 문틈
    B(.12,.1,.16,c1-.05,o.hood+.18,s*(hw+.07),'dark');}                                                                              // 사이드미러
  // 앞: 그릴·전조등·등화관제등·검은 군 번호판
  B(.05,o.hood-.72,w*.48,o.L+.005,(o.hood+.62)/2+.05,0,'dark');for(let i=0;i<3;i++)B(.03,.03,w*.46,o.L+.02,.72+i*.1,0,'steel');
  for(const s of [-1,1]){K.lamp(o.L-.06,o.hood-.14,s*(hw-.24));B(.05,.06,.1,o.L+.01,.6,s*(hw-.15),'lens');}
  B(.02,.12,.42,o.L+.03,.52,0,'dark');B(.025,.03,.3,o.L+.04,.53,0,'white');
  // 뒤: 후미등·번호판
  for(const s of [-1,1])B(.05,.24,.1,o.R-.01,o.hood-.2,s*(hw-.08),'red');
  B(.02,.12,.42,o.R-.03,.62,0,'dark');B(.025,.03,.3,o.R-.04,.63,0,'white');
  if(o.bed!==false){const bx0=o.R,bx1=c0-.05,bl=bx1-bx0,bh=o.bedH||.48;
    for(const s of [-1,1])B(bl,bh,.06,(bx0+bx1)/2,o.hood+.05+bh/2,s*(hw-.03),'olv');
    B(.06,bh,w-.06,bx0+.03,o.hood+.05+bh/2,0,'olv');B(bl-.1,.04,w-.18,(bx0+bx1)/2,o.hood+.07,0,'dark');}
  // 문 위 세력 표식·견인 고리
  K.mark(n,[c3+(c2-c3)*.5,o.hood-.2,hw+.01],'z+',.32);K.mark(n,[c3+(c2-c3)*.5,o.hood-.2,-hw-.01],'z-',.32);
  B(.14,.06,.06,o.R-.08,.4,0,'steel');}
/* 코란도 스포츠 / UAZ-469 */
function vxKorando(K,n){const {B,C}=K;
  if(n%2===0){const o={L:2.5,R:-2.5,w:1.9,wb:[1.5,-1.55],r:.37,hood:1.05,cab:[-.55,1.05,.45,-.5],roof:1.78};rcBody(K,n,o);
    B(.06,.55,1.7,-.62,1.33,0,'dark');B(.06,.06,1.7,-.62,1.6,0,'dark');for(const s of [-1,1])B(.06,.55,.06,-.62,1.33,s*.85,'dark');   // 짐칸 롤바
    B(1.3,.06,1.2,-.05,1.81,0,'dark');                                                                                                     // 지붕 가로대
    K.ant(-.7,1.6,-.8,2.2);K.can(-2.1,1.3,.6);K.bag(-1.5,1.25,-.3,.9);}
  else{// UAZ-469: 짧은 상자 차체, 세운 앞유리, 천 지붕
    for(const x of [1.2,-1.2])for(const s of [-1,1])K.wheel(.39,.26,x,.39,s*.75,null,false);
    B(4.0,.6,1.75,0,.72,0,'olv');B(1.35,.18,1.6,1.3,1.08,0,'olv');
    for(const s of [-1,1]){B(1.0,.08,.22,1.2,.82,s*.9,'olv');B(1.0,.08,.22,-1.2,.82,s*.9,'olv');}
    B(.05,.55,1.6,.6,1.38,0,'glass');B(.06,.6,1.68,.62,1.38,0,'olv',null,[0,0,0]);B(.04,.5,1.5,.66,1.38,0,'glass');
    B(2.55,.68,1.72,-.7,1.38,0,'canvas');for(const s of [-1,1])B(1.0,.3,.03,-.2,1.42,s*.87,'glass');
    for(let i=0;i<5;i++)B(.04,.36,.06,1.99,.82,-.32+i*.16,'dark');for(const s of [-1,1])K.lamp(1.97,.95,s*.56);
    B(.02,.12,.4,2.02,.5,0,'dark');K.Cz(.36,.24,-2.12,.95,.0,'tire',null,10);
    K.mark(n,[.2,.82,.88],'z+',.3);K.mark(n,[.2,.82,-.88],'z-',.3);K.mark(n,[1.3,1.18,0],'y',.4);K.ant(-1.8,1.02,-.7,2.0);}}
/* 렉스턴 스포츠 / UAZ 패트리엇 */
function vxRexton(K,n){const {B}=K;
  if(n%2===0){const o={L:2.55,R:-2.55,w:1.95,wb:[1.6,-1.6],r:.39,hood:1.1,cab:[-.5,1.15,.5,-.45],roof:1.85};rcBody(K,n,o);
    for(let i=0;i<4;i++)B(.03,.32,.05,o.L+.03,.95,-.45+i*.3,'steel');                                                                 // 큰 각진 그릴 세로살
    B(2.0,.62,1.86,-1.5,1.47,0,'olv');B(2.02,.05,1.88,-1.5,1.8,0,'dark');                                                             // 짐칸 하드톱
    for(const s of [-1,1])B(1.3,.34,.03,-1.45,1.5,s*.94,'glass');B(.03,.38,1.3,-2.52,1.5,0,'glass');
    B(1.2,.06,1.25,.05,1.88,0,'dark');for(const s of [-1,1])B(1.2,.05,.05,.05,1.92,s*.62,'steel');                                   // 지붕 가로대
    K.ant(-2.3,1.82,.75,2.4);K.ant(-2.3,1.82,-.75,1.8);K.can(-2.65,.95,.7);}
  else{// UAZ 패트리엇: 높은 상자 SUV, 뒷문 예비 타이어
    for(const x of [1.4,-1.35])for(const s of [-1,1])K.wheel(.4,.27,x,.4,s*.8,null,false);
    K.P([[-2.35,.45],[2.25,.45],[2.35,.65],[2.33,1.1],[1.05,1.18],[-2.35,1.2]],1.9,0,0,0,'olv');
    K.P([[-2.35,1.15],[1.05,1.15],[.4,1.95],[-2.3,1.95]],1.84,0,0,0,'olv');B(.04,.6,1.6,.75,1.55,0,'glass',null,[0,0,.7]);
    for(const s of [-1,1]){for(const x of [-.05,-.95,-1.8])B(.72,.42,.03,x,1.6,s*.93,'glass');B(1.0,.1,.16,1.4,.88,s*.95,'dark');B(1.0,.1,.16,-1.35,.88,s*.95,'dark');}
    for(let i=0;i<5;i++)B(.03,.3,.05,2.36,.85,-.4+i*.2,'steel');for(const s of [-1,1])K.lamp(2.3,1.0,s*.66);B(.02,.12,.4,2.38,.52,0,'dark');
    K.Cz(.38,.25,-2.48,1.1,0,'tire',null,10);B(1.6,.05,1.3,-.8,2.0,0,'dark');
    K.mark(n,[-.5,.85,.96],'z+',.32);K.mark(n,[-.5,.85,-.96],'z-',.32);K.mark(n,[-.6,2.0,0],'y',.5);K.ant(-2.1,1.95,.7,2.2);K.ant(-2.1,1.95,-.7,1.7);}}
/* 타스만 / 하이럭스: 짐칸 자리 통신 모듈 */
function vxTasman(K,n){const {B,C}=K;const west=n%2===0;
  const o=west?{L:2.7,R:-2.7,w:1.93,wb:[1.65,-1.6],r:.4,hood:1.15,cab:[-.6,1.2,.45,-.55],roof:1.9,bed:false,flare:1}
              :{L:2.65,R:-2.65,w:1.86,wb:[1.6,-1.55],r:.38,hood:1.08,cab:[-.6,1.1,.4,-.55],roof:1.82,bed:false};
  rcBody(K,n,o);const hw=o.w/2;
  // 통신 모듈(셸터): 운전실 뒤를 막지 않고 이어 붙은 상자, 옆문, 환기구, 지붕 안테나 받침
  const sx0=o.R+.02,sx1=o.cab[0]-.04,sl=sx1-sx0,sy0=o.hood+.05,sh=west?.98:.86;
  B(sl,sh,o.w-.04,(sx0+sx1)/2,sy0+sh/2,0,'olv');B(sl+.04,.05,o.w,(sx0+sx1)/2,sy0+sh+.02,0,'dark');
  for(const s of [-1,1]){B(.7,sh*.8,.03,sx0+sl*.6,sy0+sh*.45,s*(hw-.0),'dark');B(.66,sh*.76,.03,sx0+sl*.6,sy0+sh*.45,s*(hw+.01),'olv');   // 옆문
    B(.06,.08,.1,sx0+sl*.6+.25,sy0+sh*.45,s*(hw+.04),'steel');B(.4,.22,.03,sx0+sl*.2,sy0+sh*.7,s*(hw+.01),'slat');}                    // 손잡이·환기구
  B(.03,sh*.6,.7,sx0-.01,sy0+sh*.45,0,'dark');                                                                                       // 뒷문
  const top=sy0+sh+.05;
  K.ant(sx0+.25,top,hw-.2,west?2.8:2.4);K.ant(sx0+.25,top,-hw+.2,2.2);K.ant(sx1-.3,top,-hw+.25,1.6);                                // 안테나 셋
  C(.18,.18,.12,sx1-.45,top+.06,.35,'dark',null,null,10);                                                                            // 위성 단말 돔
  if(west){// 스노클(오른쪽 A필러 따라 지붕까지), 강철 범퍼·윈치, 굵은 펜더
    C(.05,.05,o.roof-o.hood+.25,o.cab[1]-.12,(o.hood+o.roof)/2+.1,hw+.08,'dark',null,null,8);B(.16,.1,.12,o.cab[1]-.08,o.roof+.22,hw+.08,'dark');
    B(.18,.3,o.w+.04,o.L+.1,.62,0,'steel');B(.2,.16,.5,o.L+.12,.82,0,'dark');K.Cz(.08,.36,o.L+.12,.66,0,'drum',null,8);              // 범퍼·윈치
    for(const s of [-1,1])C(.02,.02,1.4,o.L+.15,1.4,s*(hw-.05),'dark',null,null,4);                                                   // 범퍼 안테나 받침(휩 안테나)
    for(const x of o.wb)for(const s of [-1,1])B(o.r*2.4,.12,.18,x,o.r*2+.02,s*(hw+.03),'dark');}
  else{B(.14,.24,o.w,o.L+.06,.6,0,'dark');}}
Object.assign(VX_BUILD,{korando:vxKorando,rexton:vxRexton,tasman:vxTasman});
