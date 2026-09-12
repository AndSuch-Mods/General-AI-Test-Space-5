// All audio is synthesized here. There are no sampled or third-party assets.
export class Sound{
 constructor(settings){this.settings=settings;this.context=null;this.master=null;this.noiseBuffer=null;this.voices=0;}
 async unlock(){
  try{if(!this.context){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;this.context=new AC();this.master=this.context.createGain();this.master.connect(this.context.destination);const n=this.context.sampleRate*.5;this.noiseBuffer=this.context.createBuffer(1,n,this.context.sampleRate);const a=this.noiseBuffer.getChannelData(0);for(let i=0;i<n;i++)a[i]=Math.random()*2-1;}
   this.master.gain.value=this.settings.sound?this.settings.volume*.45:0;if(this.settings.sound&&this.context.state==='suspended')await this.context.resume();
  }catch{/* Audio must never prevent the game from starting. */}
 }
 update(){if(this.master)this.master.gain.setValueAtTime(this.settings.sound?this.settings.volume*.45:0,this.context.currentTime);}
 suspend(){if(this.context?.state==='running')this.context.suspend().catch(()=>{});}
 tone(f,end,duration=.1,volume=.4,type='square'){
  if(!this.context||!this.settings.sound||this.context.state!=='running'||this.voices>20)return;
  const c=this.context,t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(Math.max(10,end),t+duration);g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(this.master);this.voices++;o.onended=()=>{this.voices--;o.disconnect();g.disconnect();};o.start(t);o.stop(t+duration+.01);
 }
 noise(duration=.12,volume=.6,freq=1600){
  if(!this.context||!this.settings.sound||this.context.state!=='running'||this.voices>20)return;
  const c=this.context,t=c.currentTime,n=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();n.buffer=this.noiseBuffer;f.type='lowpass';f.frequency.value=freq;g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);n.connect(f);f.connect(g);g.connect(this.master);this.voices++;n.onended=()=>{this.voices--;n.disconnect();f.disconnect();g.disconnect();};n.start(t);n.stop(t+duration);
 }
 event(e){
  if(e.type==='shot'){if(e.id==='rail')this.tone(1000,90,.2,.35,'sawtooth');else if(e.id==='rocket'||e.id==='grenade'){this.noise(.18,.5,900);this.tone(120,35,.15,.3,'triangle');}else{this.noise(e.id==='shotgun'?.19:.065,e.id==='uzi'?.35:.5,2400);this.tone(e.id==='shotgun'?90:170,40,.07,.25,'triangle');}}
  else if(e.type==='explosion'){this.noise(.35,.9,650);this.tone(75,22,.35,.45,'triangle');}
  else if(e.type==='pickup')this.tone(550,950,.09,.13,'sine');
  else if(e.type==='unlock'||e.type==='upgrade'){this.tone(440,880,.18,.25,'triangle');}
  else if(e.type==='hurt')this.noise(.12,.25,450);
  else if(e.type==='place')this.tone(130,60,.1,.2,'triangle');
  else if(e.type==='clear')this.tone(330,660,.3,.22,'triangle');
  else if(e.type==='death'){this.tone(220,25,.65,.35,'sawtooth');}
  else if(e.type==='wave')this.tone(170,230,.2,.15,'square');
 }
}
