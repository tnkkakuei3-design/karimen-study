import assert from 'node:assert/strict';
import {Drive} from './drive/engine.mjs';
for(const dt of [1/30,1/120]){
 for(let i=0;i<3;i++){
  const d=new Drive(i);d.start();d.z=d.scene.hazard-35;d.v=0;d.input.brake=true;
  d.step(5);
  assert.equal(d.eventTime,null,'distant stop must keep actor waiting');
  assert.equal(d.outcome,null);
  let appeared=false;
  for(let t=0;t<60&&d.phase==='running';t+=dt){
   if(d.eventTime!==null)appeared=true;
   const brake=i===2?d.distance<=d.scene.line+4:appeared;
   d.input.brake=brake;d.input.gas=!brake&&d.v<1;
   d.observe('left');d.observe('right');d.step(dt);
  }
  assert.ok(appeared,'restart and approach starts crossing');
  assert.ok(d.outcome?.safe,'slow approach allows another safe stop');
  assert.equal(d.waitInterrupted,false,'restart before crossing is not a wait violation');
  assert.equal(d.events.filter(e=>e.type==='crossing').length,1);
  if(i!==2)assert.equal(d.outcome.confirmation,10);
  const near=new Drive(i);near.start();near.z=near.scene.hazard-near.scene.line-3;near.v=0;near.input.brake=true;
  for(let t=0;t<15&&near.phase==='running';t+=dt){near.step(dt);near.observe('left');near.observe('right');}
  assert.ok(near.outcome?.safe,'waiting near line must complete without restarting');
 }
}
console.log('PASS: all three courses at 30/120 FPS: distant wait, restart, safe re-stop, near-line wait, single crossing, waiting score');
