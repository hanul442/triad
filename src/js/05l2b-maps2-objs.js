/* ===================== 지도 더 늘리기: 거점 이름 (03d-maps2) =====================
   05l2-biome-objs와 같은 방식: 도시 거점의 종류(쓰임)는 그대로 두고, 새 배치마다 그 땅다운 이름으로 바꾼다. [한국어, 영어 무전] */
Object.assign(OBJ_LOCAL,{
  suburb:{gov:[['주민센터','the community center'],['시청 별관','the city annex']],hosp:[['동네 병원','the clinic']],bcast:[['케이블 방송국','the cable station']],
    comm:[['이동통신 기지국','the cell tower']],power:[['변전소','the substation']],rail:[['전철역','the commuter station']],supply:[['쇼핑몰','the mall'],['대형 마트','the supermarket']],
    spire:[['동네 교회','the church']],bank:[['은행 지점','the bank branch']],archive:[['도서관','the library']],police:[['지구대','the police post']],air:[['고등학교','the high school'],['체육공원','the sports park']]},
  industrial:{gov:[['공단 관리소','the estate office'],['노조 회관','the union hall']],hosp:[['산업 보건소','the plant clinic']],bcast:[['공장 방송실','the plant PA room']],
    comm:[['무선 중계탑','the relay mast']],power:[['화력 발전소','the power station'],['냉각탑','the cooling towers']],rail:[['화물 인입선','the rail siding']],supply:[['기름 탱크','the tank farm'],['물류 창고','the warehouse']],
    spire:[['굴뚝','the smokestack']],bank:[['제철소 본관','the steelworks office']],archive:[['설계 사무소','the drafting office']],police:[['경비 초소','the guard post']],air:[['트럭 차고','the truck depot'],['컨테이너 야적장','the container yard']]},
  oldtown:{gov:[['옛 시청','the old town hall'],['영주 성','the keep']],hosp:[['수도원 병원','the abbey infirmary']],bcast:[['종루','the bell tower']],
    comm:[['성문 망루','the gatehouse']],power:[['물레방아간','the water mill']],rail:[['구시가 역','the old station']],supply:[['장터 광장','the market square'],['길드 회관','the guild hall']],
    spire:[['대성당','the cathedral']],bank:[['상인 회관','the merchants hall']],archive:[['수도원 도서관','the abbey library']],police:[['위병소','the guardhouse']],air:[['성벽 공원','the rampart park'],['옛 광장','the old square']]},
  canal:{gov:[['왕궁','the palace'],['운하 관리청','the canal office']],hosp:[['운하변 병원','the canal hospital']],bcast:[['방송 탑','the broadcast tower']],
    comm:[['교회 첨탑','the steeple']],power:[['양수장','the pumping station']],rail:[['중앙역','Central Station']],supply:[['꽃 시장','the flower market'],['계량소','the weigh house']],
    spire:[['서교회','the west church']],bank:[['동인도 회사','the trading house']],archive:[['해양 박물관','the maritime museum']],police:[['수상 경찰','the river police']],air:[['댐 광장','the dam square'],['선착장','the boat landing']]},
  airfield:{gov:[['비행단 본부','the wing HQ'],['기지 사령부','the base HQ']],hosp:[['기지 의무대','the base clinic']],bcast:[['기상대','the weather station']],
    comm:[['관제탑','the control tower'],['레이더 기지','the radar site']],power:[['비상 발전소','the generator house']],rail:[['보급 하역장','the supply dock']],supply:[['연료 탱크','the fuel farm'],['탄약고','the ammo dump']],
    spire:[['항공 등대','the airfield beacon']],bank:[['정비 격납고','the maintenance hangar']],archive:[['작전 상황실','the ops room']],police:[['헌병대','the MP post']],air:[['계류장','the apron'],['격납고','the hangar']]},
});
for(const L of M2_LAYOUTS)for(const k in OBJ_LOCAL[L])for(const [ko,en] of OBJ_LOCAL[L][k]){if(!OBJ_KIND[ko])OBJ_KIND[ko]=k;OBJ_LOCAL_EN[ko]=en;}
// 특대형·초대형에서 겹친 이름 대신 쓰는 이름
for(const [ko,k,en] of OBJ_EXTRA){OBJ_KIND[ko]=k;OBJ_LOCAL_EN[ko]=en;}
/* 구시가지 옛집·운하 집은 3~5층이어도 박공지붕(맨 위층은 다락이라 지붕에 올라 서지 못한다). 대성당·망루는 평지붕 그대로 */
{const _gr=gableRoof;gableRoof=function(x){return _gr(x)||(isB(x)&&(x.old||x.gable)&&!x.church&&!x.tower&&x.bhp/x.bmax>.6);};}
