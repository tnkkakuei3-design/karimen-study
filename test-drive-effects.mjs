import assert from 'node:assert/strict';
import {engineSoundState,DriveAudio} from './drive/audio.mjs';
import {impactMotion} from './drive/impact-motion.mjs';
assert.ok(engineSoundState(18,1).rpm>engineSoundState(18,0).rpm);
assert.ok(engineSoundState(21,1,0).rpm<engineSoundState(19,1,0).rpm,'upshift drops RPM');
assert.equal(engineSoundState(19,1,1).gear,1,'hysteresis prevents gear chatter');
assert.equal(engineSoundState(13,0,1).gear,0);
for(const speed of [0,8,24,50,72])for(const t of [0,.1,.5,1,2.5,10]){
 const f=impactMotion(t,speed);for(const key of ['x','y','z','roll','pitch'])assert.ok(Number.isFinite(f[key]));assert.ok(f.y>=0);
}
assert.ok(impactMotion(.4,72).y>impactMotion(.4,8).y);
assert.ok(impactMotion(.4,72).roll>impactMotion(.4,8).roll);
assert.deepEqual(impactMotion(10,72),impactMotion(2.5,72),'finished motion is stable');
let nodes=0;const params=[];
class Param{constructor(){this.value=0;}setTargetAtTime(v){assert.ok(Number.isFinite(v));params.push(v);}setValueAtTime(v){assert.ok(Number.isFinite(v));}exponentialRampToValueAtTime(v){assert.ok(Number.isFinite(v)&&v>0);}}
class Node{constructor(){nodes++;for(const k of ['gain','frequency','Q','threshold','ratio'])this[k]=new Param();}connect(n){return n;}disconnect(){}start(){}stop(){this.onended?.();}}
class Context{constructor(){this.currentTime=1;this.sampleRate=1000;this.destination=new Node();}createGain(){return new Node();}createDynamicsCompressor(){return new Node();}createOscillator(){return new Node();}createBiquadFilter(){return new Node();}createBufferSource(){return new Node();}createBuffer(c,n){return{getChannelData:()=>new Float32Array(n)}}resume(){return Promise.resolve();}}
globalThis.AudioContext=Context;
const audio=new DriveAudio();audio.setEnabled(true);const built=nodes;
const d={phase:'running',speed:30,throttle:1,input:{gas:true,brake:false}};
for(let i=0;i<200;i++){audio.ctx.currentTime+=.05;audio.update(d);}
assert.equal(nodes,built,'steady engine updates allocate no audio nodes');
audio.impact(1,8);audio.impact(3,72);assert.equal(audio.effects.size,0,'ended effects disconnect');
audio.setEnabled(false);const muted=nodes;audio.impact(5,72);assert.equal(nodes,muted,'muted hits allocate nothing');
d.phase='paused';audio.update(d);assert.equal(params.at(-1),0,'pause silences audio');
console.log('PASS: RPM/load/gear response, finite speed-dependent flight, stable landing, audio graph reuse, effect cleanup and mute/pause.');
