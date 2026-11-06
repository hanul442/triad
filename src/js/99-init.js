/* ===================== BOOT ===================== */
if(typeof document!=='undefined'){(function init(){if(!document.fullscreenEnabled){const f=$('#b-fs');if(f)f.hidden=true;}
  showSetup();newGame({slots:['ai','ai','none','none'],size:'m',fog:false,speed:0});G.boot=true;render();startView();rtStart();})();}
