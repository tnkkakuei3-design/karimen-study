import assert from 'node:assert/strict';
import {STOP_APPROACHES,PARKING,STREET_DETAIL_SOLIDS} from './drive/street-details-layout.mjs';
import {BUILDINGS,DISTRICT_PROPS,blocked} from './drive/free-model.mjs';
import {houseFront} from './drive/district-layout.mjs';
assert.equal(STOP_APPROACHES.length,18);
for(const p of STOP_APPROACHES){
 assert.ok(Math.abs(p.lineZ-p.z)>12.5,'stop line precedes crossing');
 assert.equal(Math.sign(p.lineX-p.x),-p.side,'line covers left-hand approach lane');
 assert.ok(Math.abs(p.postZ-p.z)>=Math.abs(p.lineZ-p.z),'sign is level with or before line');
 assert.ok(blocked(p.postX,p.postZ));assert.equal(blocked(p.lineX,p.lineZ+p.side*2.5),false);
}
for(const b of BUILDINGS.filter(b=>b.x!==30)){
 const outer=Math.abs(b.lotX)===90||Math.abs(b.lotZ)===90,f=houseFront(b),depth=outer?10:5;
 for(const u of [-5,5]){const p=f.point(u,depth);assert.ok(blocked(p.x,p.z),'house wall matches collider');}
 const gate=f.point(0,depth);assert.equal(blocked(gate.x,gate.z),false,'gate leaves driving clearance');
}
for(const z of PARKING.stalls)assert.equal(blocked(-28,z),false,'parking aisle remains clear');
for(const p of STREET_DETAIL_SOLIDS)assert.ok(blocked(p.x,p.z));
console.log('PASS: 18 left-hand stop approaches, lines before crossings, sign colliders, residential gate clearance and parking aisle.');
