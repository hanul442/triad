/* ===================== 소리: 게임 사건 연결과 소리 설정 창 =====================
   - 내 편 무전: 병사가 다치면 위생병 호출, 거점 확보·상실, 증원 도착.
   - 소리 버튼은 작은 설정 창을 연다: 켜기/끄기와 전체·전투·무전·환경음 음량. M 키로 음소거. */
(function(){
  // 다친 병사: 내 편이면 다급한 무전
  const cas0=FXH.cas;FXH.cas=function(u,m,out){if(typeof G!=='undefined'&&G&&u&&u.nat===G.viewer&&!isAI(u.nat)&&(out==='hw'||out==='kia'||out==='lw'))sndRadio('casualty');return cas0&&cas0.apply(this,arguments);};
})();
// 전황 기록에서 내 편 사건을 골라 무전으로 알린다
function sndLog(m){if(typeof G==='undefined'||!G||G.boot||typeof m!=='string')return;const me=natName(G.viewer);if(isAI(G.viewer))return;
  if(m.includes('확보')&&m.includes(me+'에게서'))sndRadio('lost');else if(m.startsWith(me)&&m.includes('확보'))sndRadio('capture');
  else if(m.startsWith(me)&&(m.includes('증원')||m.includes('헬기 투입')))sndRadio('reinforce');}
if(typeof document!=='undefined'){
  const L0=L;L=function(m){L0(m);try{sndLog(m);}catch(e){}};
  // 브라우저는 첫 조작 전에 소리를 막는다: 첫 터치·키 입력에서 깨운다
  const wake=()=>{if(SFX.on)audio();};document.addEventListener('pointerdown',wake,{passive:true});document.addEventListener('keydown',wake);
  document.addEventListener('input',e=>{const i=e.target.closest&&e.target.closest('[data-snd]');if(!i)return;SFX.vol[i.dataset.snd]=Math.min(1,Math.max(0,+i.value/100));audio();sndApplyVol();sndSave();
    if(i.dataset.snd==='radio'&&performance.now()-(SFX.lastTest||0)>900){SFX.lastTest=performance.now();SFX.radioEnd=0;sndRadio('ack');}});
  document.addEventListener('click',e=>{const p=document.getElementById('sndpop');if(!p||p.hidden)return;if(e.target.closest('#sndpop,#b-snd'))return;p.hidden=true;},true);
  document.addEventListener('keydown',e=>{if(e.target.closest&&e.target.closest('input,select,textarea'))return;
    if(e.key==='Escape'){const p=document.getElementById('sndpop');if(p&&!p.hidden){p.hidden=true;e.stopImmediatePropagation();const b=document.getElementById('b-snd');if(b)b.focus();}}
    else if(e.key==='m'||e.key==='M'){toggleSound();if(typeof toast==='function')toast(SFX.on?'소리 켬':'소리 끔');if(G)render();}},true);}
function sndPop(){const p=document.getElementById('sndpop'),b=document.getElementById('b-snd');if(!p||!b)return;if(!p.hidden){p.hidden=true;return;}
  sndPopSync();p.hidden=false;const r=b.getBoundingClientRect(),w=p.offsetWidth||232,h=p.offsetHeight||220;
  p.style.left=Math.max(8,r.left-w-8)+'px';p.style.top=Math.max(8,Math.min(innerHeight-h-8,r.top+r.height/2-h/2))+'px';const f=p.querySelector('button,input');if(f)f.focus();}
