/* ===================== BOOT ===================== */
if(typeof document!=='undefined'){(function init(){if(!document.fullscreenEnabled){const f=$('#b-fs');if(f)f.hidden=true;}document.addEventListener('keydown',e=>{if(e.key==='Escape'&&UI.sheet){UI.sheet=false;render();}});if(window.innerWidth<520)UI.zoom=1.15;
  const saved=loadSave();showSetup();
  newGame({slots:['human','ai','ai','ai','ai','none'],size:'l',fog:false,speed:0});render();requestAnimationFrame(centerHQ);})();}
