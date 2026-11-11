/* ===================== 지도 더 늘리기: 메뉴 =====================
   새 게임 화면의 '지도 종류'에 새 배치 다섯 가지, '지도 크기'에 특대형·초대형을 더한다.
   특대형·초대형은 이동 거리가 긴 만큼 제한 시간이 길다(20분·24분). */
function m2Menu(){if(typeof document==='undefined')return;
  const lay=document.getElementById('opt-layout');
  if(lay)for(const k of M2_LAYOUTS)if(!lay.querySelector(`option[value="${k}"]`)){const o=document.createElement('option');o.value=k;o.textContent=LAYOUTS[k].n;lay.appendChild(o);}
  const sz=document.getElementById('opt-size');
  if(sz)for(const [k,t] of [['xl','특대형 80×80 (거점 20)'],['xxl','초대형 96×96 (거점 24)']])if(!sz.querySelector(`option[value="${k}"]`)){const o=document.createElement('option');o.value=k;o.textContent=t;sz.appendChild(o);}}
try{m2Menu();}catch(e){}
const M2_MAXR={xl:40,xxl:48};
{const _n=newGame;newGame=function(cfg){const g=_n(cfg);try{const G0=typeof G!=='undefined'&&G?G:g;if(G0&&cfg&&!cfg.maxR&&!G0.scn&&G0.win!=='lts'&&M2_MAXR[G0.size]&&G0.maxR<M2_MAXR[G0.size])G0.maxR=M2_MAXR[G0.size];}catch(e){}return g;};}
/* 설명서: 지도 종류와 크기 */
if(typeof manualHtml==='function'){const _mh=manualHtml;manualHtml=function(){let h=_mh();try{h+=manSec('maps','지도 종류 · 크기',manL([
    '<b>크기</b>: 소형 36×36(거점 4) · 중형 52×52(12) · 대형 64×64(16) · 특대형 80×80(20, 시작 부대 10개, 20분) · 초대형 96×96(24, 시작 부대 12개, 24분). 1칸은 약 12m입니다.',
    '<b>대칭 도시·강 도시·농촌·숲·항구</b>: 고층 도심, 강과 다리, 생울타리 들판, 벌목길과 호수, 내항과 부두.',
    '<b>교외 신도시</b>: 큰길 십자로 모퉁이의 쇼핑몰과 넓은 주차장, 막다른 길을 따라 늘어선 마당 있는 단독주택. 낮은 집과 트인 마당이라 집집마다 끊어 싸웁니다.',
    '<b>공업 단지</b>: 큰 창고·공장과 넓은 대로, 한가운데 발전소(냉각탑·굴뚝), 기름 탱크 단지, 화물 인입선. 탱크·냉각탑은 시야를 막고 아무도 못 지나갑니다.',
    '<b>성곽 구시가지</b>: 성벽(약 8m)은 누구도 넘지 못하고 성문으로만 드나듭니다. 성벽 망루는 높은 사격 자리, 안쪽은 좁은 돌길과 박공지붕 집(맨 위층은 다락), 가운데 대성당.',
    '<b>운하 도시</b>: 겹겹의 운하는 다리로만 건넙니다. 다리는 폭파·복구할 수 있어 차량 길목이 되고, 운하 집 창가가 다리를 내려다봅니다.',
    '<b>비행장</b>: 십자 활주로와 유도로, 계류장의 비행기, 격납고·관제탑·연료 탱크. 둘레가 거의 풀밭이라 엄폐가 드뭅니다. 비행기 밑은 보병만 지나갑니다.',
    '[무작위]를 고르면 판마다 열 가지 가운데 하나와 그 땅에 맞는 고저차·계절이 나옵니다.']));}catch(e){}return h;};}
