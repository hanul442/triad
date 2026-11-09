/* ===================== 지도 다양화: 거점 이름 =====================
   05l-objs가 도시 거점 이름(시청·종합병원…)으로 종류(쓰임)를 정한 뒤, 농촌·숲·항구에서는 같은 쓰임의 그 땅다운 이름으로 바꾼다.
   이름마다 OBJ_KIND에 같은 종류를 등록하므로 쓰임(의료·행정·감시…)은 그대로다. [한국어, 영어 무전] */
const OBJ_LOCAL={
  country:{gov:[['마을회관','the town hall'],['면사무소','the district office'],['영주 저택','the manor']],hosp:[['시골 병원','the clinic']],bcast:[['라디오 중계소','the relay station']],
    comm:[['통신 중계탑','the radio mast']],power:[['변전소','the substation']],rail:[['간이역','the halt']],supply:[['곡물 창고','the granary'],['장터','the market square']],
    spire:[['마을 교회','the church']],bank:[['농협 창고','the co-op']],archive:[['기록 보관소','the records office']],police:[['헌병 초소','the MP post']],air:[['농업 비행장','the airstrip'],['방앗간 들판','the mill field']]},
  forest:{gov:[['산림 관리소','the ranger station'],['산장','the lodge'],['휴양림 본부','the park HQ']],hosp:[['산악 구조대','the mountain rescue post']],bcast:[['산정 중계소','the summit relay']],
    comm:[['산불 감시탑','the fire tower']],power:[['소수력 발전소','the small dam']],rail:[['산골 간이역','the forest halt']],supply:[['제재소','the sawmill'],['보급 창고','the supply depot']],
    spire:[['숲속 예배당','the chapel']],bank:[['벌목 회사','the logging company']],archive:[['측량 사무소','the survey office']],police:[['산림 경찰서','the forest police']],air:[['헬기장','the helipad'],['벌목장 빈터','the clearing']]},
  port:{gov:[['세관','the customs house'],['해양 관리청','the maritime office'],['항만 사령부','the harbor command']],hosp:[['선원 병원','the seamen\'s hospital']],bcast:[['해안 무선국','the coast radio']],
    comm:[['항만 관제탑','the harbor tower']],power:[['항만 변전소','the dock substation']],rail:[['부두 화물역','the freight yard']],supply:[['컨테이너 부두','the container terminal'],['어시장','the fish market']],
    spire:[['등대','the lighthouse']],bank:[['해운 회사','the shipping office']],archive:[['선박 등록소','the ship registry']],police:[['해경 초소','the coast guard post']],air:[['수상기 부두','the seaplane dock'],['여객 터미널','the ferry terminal']]},
};
const OBJ_LOCAL_EN={};
for(const L in OBJ_LOCAL)for(const k in OBJ_LOCAL[L])for(const [ko,en] of OBJ_LOCAL[L][k]){OBJ_KIND[ko]=k;OBJ_LOCAL_EN[ko]=en;}
{const _gm=genMap;genMap=function(seed,...a){const out=_gm(seed,...a);const T=out.feat&&OBJ_LOCAL[out.feat.layout];if(!T)return out;
  const used={};for(const o of out.objs){const k=OBJ_KIND[o.name];const pool=k&&T[k];if(!pool)continue;const i=used[k]=(used[k]||0);used[k]++;if(i<pool.length)o.name=pool[i][0];}
  return out;};}
/* 새 판을 열면 어떤 지도인지 기록에 한 줄 */
{const _ng=newGame;newGame=function(cfg){const g=_ng(cfg);try{if(cfg&&(cfg.layout||cfg.clime)&&!cfg.scn)L(`지도: ${bmMapName()}`);}catch(e){}return g;};}
