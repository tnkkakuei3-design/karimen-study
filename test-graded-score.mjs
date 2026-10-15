import assert from 'node:assert/strict';
import {Drive,gradeDriving,crossingEnd,HAZARD_REVIEWS} from './drive/engine.mjs';
function run(index,brakeAt,dt=1/120){
 const d=new Drive(index);d.start();let approach=false;
 for(let t=0;t<60&&d.phase==='running';t+=dt){
  if(d.idle>2&&d.eventTime===null)approach=true;
  if(approach){d.input.brake=d.eventTime!==null;d.input.gas=!d.input.brake&&d.v<1;}
  else {d.input.brake=d.distance<brakeAt;d.input.gas=!d.input.brake;}
  if(d.stopped){d.observe('left');d.observe('right');}d.step(dt);
 }
 if(d.outcome){d.answerReview(HAZARD_REVIEWS[index].correct);const o=d.outcome;assert.equal(o.score,o.detection+o.anticipation+o.stopping+o.confirmation);assert.ok(o.score>=0&&o.score<=100);if(!o.safe)assert.equal(o.rank,'もう一度');}
 return d;
}
for(const i of [0,1]){
 const early=run(i,40),late=run(i,25),none=run(i,0);
 assert.ok(early.outcome.safe);assert.ok(!late.outcome.safe);
 assert.ok(early.outcome.anticipation>late.outcome.anticipation);
 assert.ok(late.outcome.anticipation>none.outcome.anticipation);
 assert.ok(Math.abs(run(i,40,1/30).outcome.score-early.outcome.score)<=1);
}
const intersection=[30,31,32,33,34,35,36].map(at=>run(2,at)).filter(d=>d.outcome?.safe);
assert.ok(intersection.length>0,'intersection remains completable');
assert.ok(intersection.some(d=>d.outcome.stopping>0&&d.outcome.stopping<30),'stop position receives partial credit');
const d=new Drive(0);d.start();d.z=d.scene.hazard-10;d.v=0;d.input.brake=true;
d.step(.2);const short=gradeDriving(d).stopping;
d.step(.6);const held=gradeDriving(d).stopping;
assert.ok(short>0&&short<held);assert.equal(held,30);
d.grading.waitStart=1;d.grading.waitSeconds=(crossingEnd(0)-1)*.5;
assert.equal(gradeDriving(d).confirmation,5);
d.waitedForCrossing=true;assert.equal(gradeDriving(d).confirmation,10);
const crash=run(0,0);assert.equal(crash.outcome.stopping,0,'impact animation must not earn stop points');
console.log('PASS: early/late/no braking, partial stops, half/full wait, collision, score totals, frame-rate stability, intersection completion');
