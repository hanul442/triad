/* ===================== AUDIO ===================== */
// 효과음은 파일 없이 Web Audio로 합성한다. 첫 사용자 조작 이후에만 소리가 난다.
const SFX={ctx:null,on:true,last:{}};
try{if(typeof localStorage!=='undefined')SFX.on=localStorage.getItem('triad-sound')!=='0';}catch(e){}
function audio(){if(typeof window==='undefined'||!SFX.on)return null;try{if(!SFX.ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;SFX.ctx=new AC();SFX.master=SFX.ctx.createGain();SFX.master.gain.value=.55;SFX.master.connect(SFX.ctx.destination);}
  if(SFX.ctx.state==='suspended')SFX.ctx.resume();return SFX.ctx;}catch(e){return null;}}
function noiseBuf(a,dur){const b=a.createBuffer(1,Math.max(1,Math.floor(a.sampleRate*dur)),a.sampleRate);const d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return b;}
function sfx(kind,vol=1){const a=audio();if(!a)return;const now=performance.now();if(now-(SFX.last[kind]||0)<70)return;SFX.last[kind]=now;const t=a.currentTime;
  const env=(node,peak,dur,attack=.005)=>{const g=a.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(peak*vol,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+dur);node.connect(g);g.connect(SFX.master);return g;};
  const noise=(dur,type,freq,q=1)=>{const s=a.createBufferSource();s.buffer=noiseBuf(a,dur);const f=a.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;s.connect(f);s.start(t);return f;};
  const tone=(freq,dur,type='sine',to)=>{const o=a.createOscillator();o.type=type;o.frequency.setValueAtTime(freq,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+dur);o.start(t);o.stop(t+dur+.05);return o;};
  if(kind==='shot'){env(noise(.14,'bandpass',1900,.8),.35,.13);}
  else if(kind==='arty'){env(noise(.35,'lowpass',700),.5,.32);env(tone(110,.25,'sine',50),.3,.25);}
  else if(kind==='boom'){env(noise(.9,'lowpass',380),.75,.85,.01);env(tone(70,.6,'sine',30),.5,.6);}
  else if(kind==='hit'){env(noise(.4,'lowpass',600),.35,.35);}
  else if(kind==='launch'){const f=noise(.9,'bandpass',500,2);f.frequency.exponentialRampToValueAtTime(2600,t+.8);env(f,.35,.85,.06);}
  else if(kind==='flak'){for(let i=0;i<3;i++){const s=a.createBufferSource();s.buffer=noiseBuf(a,.06);const f=a.createBiquadFilter();f.type='highpass';f.frequency.value=1400;const g=a.createGain();g.gain.setValueAtTime(.0001,t+i*.07);g.gain.exponentialRampToValueAtTime(.3*vol,t+i*.07+.004);g.gain.exponentialRampToValueAtTime(.0001,t+i*.07+.06);s.connect(f);f.connect(g);g.connect(SFX.master);s.start(t+i*.07);}}
  else if(kind==='click'){env(tone(880,.05),.12,.05);}
  else if(kind==='turn'){const o1=tone(660,.18);env(o1,.18,.2);const o2=a.createOscillator();o2.frequency.value=990;const g=a.createGain();g.gain.setValueAtTime(.0001,t+.14);g.gain.exponentialRampToValueAtTime(.16*vol,t+.16);g.gain.exponentialRampToValueAtTime(.0001,t+.42);o2.connect(g);g.connect(SFX.master);o2.start(t+.14);o2.stop(t+.5);}
  else if(kind==='build'){env(tone(330,.12,'triangle'),.16,.12);}
  else if(kind==='win'){[523,659,784,1046].forEach((f,i)=>{const o=a.createOscillator();o.type='triangle';o.frequency.value=f;const g=a.createGain();g.gain.setValueAtTime(.0001,t+i*.13);g.gain.exponentialRampToValueAtTime(.18*vol,t+i*.13+.02);g.gain.exponentialRampToValueAtTime(.0001,t+i*.13+.5);o.connect(g);g.connect(SFX.master);o.start(t+i*.13);o.stop(t+i*.13+.6);});}
}
function toggleSound(){SFX.on=!SFX.on;try{localStorage.setItem('triad-sound',SFX.on?'1':'0');}catch(e){}if(SFX.on)sfx('click');}
