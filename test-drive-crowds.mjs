import assert from 'node:assert/strict';
import {ArcadeDrive,visibleCrowd,CROWD_LIMIT} from './drive/arcade.mjs';
const outcomes=[];
for(const hz of [30,60,120]){
 const d=new ArcadeDrive();assert.equal(d.actors.length,48);assert.equal(new Set(d.actors.map(a=>a.wave)).size,8);d.start();d.input.gas=true;
 let maxVisible=0;
 for(let i=0;i<hz*60&&d.phase==='running';i++){d.step(1/hz);const visible=visibleCrowd(d);maxVisible=Math.max(maxVisible,visible.length);assert.ok(visible.length<=CROWD_LIMIT);}
 assert.equal(d.phase,'result');assert.ok(d.hits>=12,`straight accelerator run produces a crowd rush: ${d.hits}`);assert.ok(d.maxCombo>=6);assert.ok(maxVisible>=6);
 const hits=d.events.filter(e=>e.type==='impact');assert.equal(new Set(hits.map(e=>e.actorId)).size,hits.length,'each person scores once');assert.equal(d.points,hits.reduce((sum,e)=>sum+e.points,0));
 assert.ok(hits.some(e=>d.actors[e.actorId].side===1)&&hits.some(e=>d.actors[e.actorId].side===-1));outcomes.push([d.hits,d.points,d.maxCombo]);
}
assert.deepEqual(outcomes[0],outcomes[1]);assert.deepEqual(outcomes[1],outcomes[2]);
const stopped=new ArcadeDrive();stopped.start();stopped.v=0;for(let i=0;i<1200;i++)stopped.step(1/120);assert.equal(stopped.hits,0);
stopped.combo=8;stopped.lastHit=stopped.time-4.1;stopped.step(.01);assert.equal(stopped.combo,0);
console.log('PASS: 48 people / 8 waves, both-side hits, visible pool bound, single hit scoring, combo timeout and frame-rate consistency.',outcomes[0]);
