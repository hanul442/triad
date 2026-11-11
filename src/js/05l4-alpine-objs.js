/* ===================== 알프스 산악: 거점 =====================
   03d-alpine이 거점 자리를 땅 모양(alpRole)으로 골라 둔다: 고개 분지(pass) · 봉우리 꼭대기(summit) · 골짜기 마을(valley) · 산장(hut).
   - 자리를 옮기지 않는다(05l-objs objRelocate는 넓은 곳을 찾아 옮기는데, 봉우리 관측소가 산 아래로 내려가면 안 된다).
   - 이름과 쓰임은 역할에 맞춘다. 같은 역할 네 벌(세력마다 하나)은 이름·쓰임이 다르지만 모두 그 땅다운 것이다.
     봉우리는 감시(내려다봄) 쓰임이 많다: 산 위 관측소가 골짜기를 지배한다(FM 3-97.6). [한국어, 영어 무전, 쓰임] */
const ALP_OBJ={
  pass:[['고개 구호소','the hospice','hosp'],['국경 세관','the customs house','gov'],['고개 호텔','the pass hotel','bank'],['우편·전신소','the post office','comm']],
  summit:[['정상 관측소','the summit lookout','comm'],['기상 관측소','the weather station','comm'],['산정 중계소','the summit relay','bcast'],['정상 레이더 기지','the summit radar','comm']],
  valley:[['골짜기 여관','the inn','gov'],['산골 장터','the village market','supply'],['수력 발전소','the hydro plant','power'],['케이블카 역','the cable car station','rail']],
  hut:[['산악 구조대 산장','the rescue hut','hosp'],['대피 산장','the refuge','supply'],['산악 헬기장','the mountain helipad','air'],['국경 경비 초소','the border post','police']]};
const ALP_OBJ_EN={};
for(const r in ALP_OBJ)for(const [ko,en,k] of ALP_OBJ[r]){OBJ_KIND[ko]=k;ALP_OBJ_EN[ko]=en;}
{const _or=objRelocate;objRelocate=function(map,objs,GS){if(objs&&objs.length&&map[objs[0].r]&&map[objs[0].r][objs[0].c].alpRole)return;return _or(map,objs,GS);};}
{const _gm=genMap;genMap=function(seed,...a){const out=_gm(seed,...a);if(!out.feat||out.feat.layout!=='alpine')return out;
  const k={};for(const o of out.objs){const x=out.map[o.r][o.c];const role=x.alpRole;const L=ALP_OBJ[role];if(!L)continue;const i=k[role]=(k[role]||0);k[role]++;const [ko,,kind]=L[i%L.length];
    o.name=ko;x.lk=kind;const col=OBJK[kind]&&OBJK[kind].col;if(col){x.lkc=col;if(x.t==='bldg'&&x.blk!=null)for(let r=Math.max(0,o.r-3);r<=Math.min(N-1,o.r+3);r++)for(let c=Math.max(0,o.c-3);c<=Math.min(N-1,o.c+3);c++){const y=out.map[r][c];if(y.t==='bldg'&&y.blk===x.blk){y.lkc=col;y.lk=kind;}}}}
  return out;};}
