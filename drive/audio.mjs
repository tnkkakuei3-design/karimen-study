// Small synthesized engine: firing pulses, intake harmonics, tire noise and gear changes.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function engineSoundState(speed,throttle,previousGear=0){
 speed=clamp(Number(speed)||0,0,72);throttle=clamp(Number(throttle)||0,0,1);
 const up=[20,37,56],down=[14,30,47];let gear=clamp(previousGear,0,3);
 if(gear<3&&speed>up[gear])gear++;else if(gear>0&&speed<down[gear-1])gear--;
 const ratios=[150,98,73,56];
 return{gear,rpm:clamp(850+speed*ratios[gear]+throttle*620,850,5700),load:throttle};
}
export class DriveAudio {
 constructor(){this.enabled=false;this.ctx=null;this.car=null;this.gear=0;this.shiftUntil=0;this.effects=new Set();}
 unlock(){try{if(!this.ctx){const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)return;this.ctx=new C();const c=this.ctx;
 this.master=c.createGain();this.master.gain.value=0;this.limiter=c.createDynamicsCompressor();this.limiter.threshold.value=-10;this.limiter.ratio.value=8;this.master.connect(this.limiter).connect(c.destination);
 this.engine=c.createOscillator();this.engine.type='sawtooth';this.filter=c.createBiquadFilter();this.filter.type='lowpass';this.filter.Q.value=.65;this.motorGain=c.createGain();this.motorGain.gain.value=0;this.engine.connect(this.filter).connect(this.motorGain).connect(this.master);this.engine.start();
 this.harmonic=c.createOscillator();this.harmonic.type='triangle';this.harmonicGain=c.createGain();this.harmonicGain.gain.value=0;this.harmonic.connect(this.harmonicGain).connect(this.master);this.harmonic.start();
 const b=c.createBuffer(1,c.sampleRate*2,c.sampleRate),a=b.getChannelData(0);let low=0;for(let i=0;i<a.length;i++){low=.97*low+.03*(Math.random()*2-1);a[i]=low*3;}
 this.noise=c.createBufferSource();this.noise.buffer=b;this.noise.loop=true;
 this.roadFilter=c.createBiquadFilter();this.roadFilter.type='lowpass';this.roadGain=c.createGain();this.roadGain.gain.value=0;this.noise.connect(this.roadFilter).connect(this.roadGain).connect(this.master);
 this.brakeFilter=c.createBiquadFilter();this.brakeFilter.type='bandpass';this.brakeFilter.Q.value=2;this.brakeGain=c.createGain();this.brakeGain.gain.value=0;this.noise.connect(this.brakeFilter).connect(this.brakeGain).connect(this.master);this.noise.start();}this.ctx.resume().catch(()=>{});}catch{}}
 setEnabled(value){this.enabled=value;if(value)this.unlock();else this.silence();}
 silence(){if(this.ctx)this.master.gain.setTargetAtTime(0,this.ctx.currentTime,.02);for(const source of this.effects){try{source.stop();}catch{}}this.effects.clear();}
 update(drive){if(!this.ctx)return;if(!this.enabled||!drive||drive.phase!=='running'){this.silence();return;}
 const t=this.ctx.currentTime,speed=Math.max(0,drive.speed),throttle=drive.input.brake?0:(drive.throttle??(drive.input.gas?1:0));
 if(this.car!==drive){this.car=drive;this.gear=0;this.shiftUntil=0;}
 const state=engineSoundState(speed,throttle,this.gear);if(state.gear!==this.gear){this.gear=state.gear;this.shiftUntil=t+.18;}
 const shift=t<this.shiftUntil,load=shift?throttle*.2:throttle,rpm=state.rpm*(shift?.85:1),pulse=rpm/30;
 this.master.gain.setTargetAtTime(.48,t,.04);this.engine.frequency.setTargetAtTime(pulse,t,.065);this.harmonic.frequency.setTargetAtTime(pulse*.5,t,.09);
 this.filter.frequency.setTargetAtTime(170+rpm*.12+load*650,t,.08);this.motorGain.gain.setTargetAtTime(.065+load*.095,t,.05);this.harmonicGain.gain.setTargetAtTime(.055+load*.055,t,.06);
 this.roadFilter.frequency.setTargetAtTime(350+speed*23,t,.15);this.roadGain.gain.setTargetAtTime(Math.min(.20,speed*speed*.000045),t,.12);
 this.brakeFilter.frequency.setTargetAtTime(650+speed*20,t,.08);this.brakeGain.gain.setTargetAtTime(drive.input.brake&&speed>22?Math.min(.13,(speed-22)*.004):0,t,.04);
 }
 impact(combo=1,speed=24){if(!this.enabled||!this.ctx)return;const c=this.ctx,t=c.currentTime,p=clamp(speed/72,0,1),chain=clamp(combo,1,5);
 const tone=(type,from,to,at,duration,volume)=>{const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(from,at);o.frequency.exponentialRampToValueAtTime(to,at+duration);g.gain.setValueAtTime(volume,at);g.gain.exponentialRampToValueAtTime(.001,at+duration);o.connect(g).connect(this.master);this.effects.add(o);o.onended=()=>{this.effects.delete(o);o.disconnect();g.disconnect();};o.start(at);o.stop(at+duration+.02);};
 tone('sine',110+p*80,35,t,.20+p*.1,.28+p*.25);
 const n=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();n.buffer=this.noise.buffer;f.type='lowpass';f.frequency.value=900+p*2200;g.gain.setValueAtTime(.55+p*.6,t);g.gain.exponentialRampToValueAtTime(.001,t+.13);n.connect(f).connect(g).connect(this.master);this.effects.add(n);n.onended=()=>{this.effects.delete(n);n.disconnect();f.disconnect();g.disconnect();};n.start(t);n.stop(t+.15);
 // A rising cartoon spring follows the impact; combos climb in musical thirds.
 const note=260*Math.pow(2,(chain-1)*4/12);tone('triangle',note*(1+p),note*.55,t+.045,.28+p*.22,.12+p*.08);
 if(chain>1)tone('sine',note*1.5,note*2,t+.13,.15,.1);
 }
}
