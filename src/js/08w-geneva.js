/* 제네바 협약 위반을 화면에: 관전 중이면 자동 연출이 그 장면으로 가고 알림을 띄운다. 구급차 꼬리표에 보호 상태 */
function genSpec(site,by){if(typeof document==='undefined')return;
  const watch=typeof specOn==='function'&&specOn();if(!watch&&!(G.viewer==null||site.nat===G.viewer||(by&&by.nat===G.viewer)))return;
  toast(`⚠ 제네바 협약 위반: ${by?natName(by.nat):'포격'} → ${natName(site.nat)} ${GEN_NAME[site.k]}`);
  if(watch&&UI.specAuto&&by&&G.units.includes(by)&&typeof specFollow==='function'){specFollow(by,true);UI.specHotT=performance.now()+4000;}}
if(typeof v3UnitTag==='function'){const _ut=v3UnitTag;v3UnitTag=function(u){let h=_ut(u);
  if(u.type==='amb'&&typeof genOn==='function'&&genOn())h+=genProtUnit(u)?'<em title="제네바 협약 보호">✚ 보호</em>':'<em title="보호를 잃음">보호 해제</em>';return h;};}
