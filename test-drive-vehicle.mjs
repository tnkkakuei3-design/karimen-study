import assert from 'node:assert/strict';
import {Drive} from './drive/engine.mjs';
import {ArcadeDrive} from './drive/arcade.mjs';
function run(car,seconds,hz=120){for(let i=0;i<seconds*hz;i++)car.step(1/hz);return car;}
for(const Type of [Drive,ArcadeDrive]){
 const d=new Type();d.start();d.steer(.35);run(d,.5);assert.ok(d.x>-1.38&&d.x<-.9,'partial input produces continuous movement, not a lane snap');
 d.steer(0);run(d,1);assert.ok(Math.abs(d.steering)<.001,'wheel returns smoothly');assert.ok(Math.abs(d.heading)<.04,'heading assistance settles');
 d.v=0;const x=d.x;d.steer(-1);run(d,.5);assert.equal(d.x,x,'steering at rest does not translate car');
 d.input.gas=true;run(d,.1);assert.ok(d.v>0&&d.v<.15,'throttle ramps up');
 d.input.brake=true;run(d,1);assert.equal(d.v,0,'brake overrides accelerator');
 d.pause();assert.equal(d.input.steer,0);assert.equal(d.input.gas,false);assert.equal(d.input.brake,false);
}
for(const i of [0,1,2]){
 const d=new Drive(i);d.start();
 for(let n=0;n<120*90&&d.phase==='running';n++){
  if(d.cueVisible)d.mark();
  const stopAt=d.scene.line+(i===2?2:10);
  d.input.brake=d.distance<=stopAt+d.v*d.v/12+.6;
  d.input.gas=!d.input.brake&&d.v<5;
  if(d.stopped){d.input.brake=true;d.input.gas=false;d.observe('left');d.observe('right');}
  d.step(1/120);
 }
 assert.equal(d.outcome?.safe,true,`course ${i} remains completable with safe braking`);
}
const trajectories=[30,60,120].map(hz=>{const d=new Drive();d.start();d.steer(.25);run(d,1,hz);d.steer(0);d.input.brake=true;run(d,2,hz);return d;});
for(const d of trajectories){assert.ok(Math.abs(d.x-trajectories[0].x)<1e-9);assert.ok(Math.abs(d.z-trajectories[0].z)<1e-9);}
const edge=new ArcadeDrive();edge.start();edge.input.gas=true;edge.steer(1);run(edge,10);assert.ok(edge.x<=2.45);assert.ok(Number.isFinite(edge.heading));
console.log('PASS: continuous steering, centering, stationary steering, pedal ramp/brake priority, pause release, all safe-course completions, frame-rate independence, road bounds.');

for(let i=0;i<3;i++)for(const safe of [true,false])for(const correct of [true,false]){
 const d=new Drive(i);d.start();assert.equal(d.answerReview(i),false);d.firstBrake={beforeAppearance:true};d.checks={left:true,right:true};d.finish(safe,'test');
 assert.equal(d.answerReview(-1),false);assert.equal(d.answerReview(3),false);assert.equal(d.answerReview(.5),false);
 assert.equal(d.answerReview(correct?i:(i+1)%3),true);assert.equal(d.outcome.detection,correct?30:0);assert.ok(d.outcome.score<=(safe?100:59));
 if(safe)assert.equal(d.outcome.score,correct?100:70);
 const score=d.outcome.score;assert.equal(d.answerReview(i),false);assert.equal(d.outcome.score,score);
}
console.log('PASS: post-drive answers, wrong answers, one-shot grading, invalid input, safe score and unsafe score cap.');
