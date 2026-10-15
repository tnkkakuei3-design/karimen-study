import {impactMotion} from './drive/impact-motion.mjs';
// Exercise actual application scheduling with a deterministic 120 Hz display.
// Rendering is stubbed: this measures submitted work, not device GPU/FPS.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {JSDOM,VirtualConsole} from 'jsdom';
import {Drive,SCENES,clamp,HAZARD_REVIEWS} from './drive/engine.mjs';
import {ArcadeDrive,visibleCrowd} from './drive/arcade.mjs';

const baseline=process.argv.includes('--baseline');
const dom=new JSDOM(fs.readFileSync('drive/index.html','utf8'),{url:'https://karimen-study.pages.dev/drive/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:new VirtualConsole()});
const w=dom.window,$=id=>w.document.getElementById(id);
let now=1000,nextId=1,frames=0,draws=0,audio=0;
const pending=new Map();
w.performance.now=()=>now;
w.matchMedia=()=>({matches:false});w.scrollTo=()=>{};
w.requestAnimationFrame=callback=>{const id=nextId++;pending.set(id,callback);return id;};
w.cancelAnimationFrame=id=>pending.delete(id);
w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
w.HTMLDialogElement.prototype.close=function(){this.open=false};
class Renderer{
 constructor(canvas){this.canvas=canvas;}
 invalidateSize(){}
 render(){if(this.canvas.id==='road')draws++;}
 hit(){return true;}
}
class DriveAudio{setEnabled(){}unlock(){}silence(){}impact(){}update(){audio++;}}
Object.assign(w,{impactMotion,Drive,SCENES,clamp,HAZARD_REVIEWS,ArcadeDrive,visibleCrowd,Renderer,DriveAudio});
const ctx=dom.getInternalVMContext(),run=code=>vm.runInContext(code,ctx);
run(fs.readFileSync('drive/app.mjs','utf8').replace(/^import .*;\n/gm,''));
await new Promise(resolve=>setTimeout(resolve,0));
const observer=new w.MutationObserver(()=>{});
observer.observe($('game'),{childList:true,attributes:true,subtree:true});
observer.observe($('instruction'),{childList:true,subtree:true});
function advance(seconds,hz=120){
 const before={frames,draws,audio};observer.takeRecords();
 for(let i=0;i<seconds*hz;i++){
  now+=1000/hz;const callbacks=[...pending.values()];pending.clear();
  for(const callback of callbacks){frames++;callback(now);}
 }
 return{callbacks:frames-before.frames,draws:draws-before.draws,audio:audio-before.audio,mutations:observer.takeRecords().length};
}
const metrics={home:advance(2)};
$('course-list').querySelector('button').click();
await new Promise(resolve=>setTimeout(resolve,0));
advance(.1);metrics.ready=advance(2);
$('start').click();metrics.running=advance(10);
const distance=run('drive.z'),time=run('drive.time');
$('pause').click();advance(.1);metrics.paused=advance(2);
assert.equal(run('drive.z'),distance);assert.equal(run('drive.time'),time);
$('resume').click();advance(.5);assert.ok(run('drive.z')>distance);
const resumedTime=run('drive.time');assert.ok(Math.abs(resumedTime-time-.5)<.02);
Object.defineProperty(w.document,'hidden',{value:true,configurable:true});
w.document.dispatchEvent(new w.Event('visibilitychange'));
metrics.hidden=advance(2);assert.equal(run('drive.time'),resumedTime);
Object.defineProperty(w.document,'hidden',{value:false,configurable:true});
w.document.dispatchEvent(new w.Event('visibilitychange'));advance(.1);
assert.equal(run('drive.phase'),'paused');
metrics.returnedPaused=advance(1);
if(!baseline){
 for(const state of ['home','ready','paused','hidden','returnedPaused'])assert.equal(metrics[state].callbacks,0,`${state}: no idle animation loop`);
 assert.ok(metrics.running.draws>=590&&metrics.running.draws<=602,'120 Hz screens draw at most 60 fps');
 assert.ok(metrics.running.audio<=202,'Audio controls update at most 20 times/second');
 assert.ok(metrics.running.mutations<500,'Unchanged HUD values do not rewrite the DOM');
 // Exercise the 3D branch, 30 fps mode, resizing while paused and WebGL loss.
 w.fake3D={failed:false,yaw:0,currentYaw:0,invalidateSize(){},quality(){},render(){draws++;}};
 run('three=fake3D;threeError=false;threeEnabled=true;lightQuality=true;home();choose(0)');
 await new Promise(resolve=>setTimeout(resolve,0));advance(.1);$('start').click();
 metrics.light=advance(2);
 assert.ok(metrics.light.draws>=59&&metrics.light.draws<=61,'Light mode draws at 30 fps on a 120 Hz display');
 assert.ok(Math.abs(run('drive.time')-2)<.001,'Light mode preserves elapsed simulation time');
 $('game-settings').click();advance(.1);assert.equal(advance(1).draws,0);
 w.dispatchEvent(new w.Event('resize'));assert.equal(advance(.1).draws,1,'A paused resize redraws once');
 assert.equal(advance(1).draws,0);
 $('close-settings').click();const prior=run('drive.time');advance(1,15);
 assert.ok(Math.abs(run('drive.time')-prior-1)<.001,'A slow display does not slow physics');
 // Foreground stalls must not produce repeated pause dialogs or unbounded catch-up.
 for(const gap of [350,800,5000]){
  const before=run('drive.time');now+=gap;const callbacks=[...pending.values()];pending.clear();
  for(const callback of callbacks)callback(now);
  assert.equal(run('drive.phase'),'running');assert.equal($('pause-overlay').hidden,true);
  assert.ok(Math.abs(run('drive.time')-before-.1)<.001,'Stall catch-up is bounded to 100 ms');
 }
 run('drive.input.gas=true;drive.steer(1)');w.dispatchEvent(new w.Event('blur'));
 assert.equal(run('drive.phase'),'running','Visible browser focus changes do not pause');
 assert.equal(run('drive.input.gas'),false);assert.equal(run('drive.input.steer'),0);
 w.fake3D.render=()=>{throw new Error('lost context');};advance(.1);
 assert.equal(run('drive.phase'),'paused');assert.equal(run('threeError'),true);
 advance(.1);assert.equal(advance(1).callbacks,0,'Fallback is paused, with no runaway loop');
 run("drive.finish(false,'test');showResult()");assert.equal(advance(1).callbacks,0);
}
// Reducing draw frequency must not change simulation time or stopping distance.
const trajectories=[];
for(const hz of [30,60,120]){
 const d=new Drive(0);d.start();d.input.brake=true;
 for(let i=0;i<2*hz;i++)d.step(1/hz);
 trajectories.push(d.z);
}
assert.ok(Math.max(...trajectories)-Math.min(...trajectories)<.001);
console.log(JSON.stringify({mode:baseline?'baseline':'optimized',displayHz:120,runningSeconds:10,metrics,stoppingDistance:trajectories},null,2));
dom.window.close();
