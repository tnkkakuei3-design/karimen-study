import assert from 'node:assert/strict';
import {wheelSurface,ROAD_SURFACES,ROAD_DETAILS,addRoadSurfaces} from './drive/road-surfaces.mjs';
import {FreeDrive} from './drive/free-model.mjs';
const boxes=[];addRoadSurfaces((...args)=>boxes.push(args));assert.equal(boxes.length,ROAD_SURFACES.length+ROAD_DETAILS.length);
for(const [i,s]of ROAD_SURFACES.entries())assert.deepEqual(boxes[i].slice(0,6),[s.x,s.y,s.z,s.w,s.h,s.d]);
assert.equal(wheelSurface(7.14,-50,0),'curb');assert.equal(wheelSurface(9.5,-50,0),'sidewalk');
assert.equal(wheelSurface(7.14,0,0),'road','intersection opening stays clear');
assert.equal(wheelSurface(139,50,0),'sidewalk');
function car(x,v,gear=1,heading=0){const d=new FreeDrive();Object.assign(d,{x,z:-50,v,gear,heading,phase:'running'});d.input.gas=true;return d;}
for(const gear of [1,-1]){
 const road=car(3,gear*5,gear),curb=car(7.14,gear*5,gear);
 for(let i=0;i<60;i++){road.step(1/120);curb.step(1/120);}
 assert.ok(Math.abs(curb.v)<Math.abs(road.v)-1,'curb slows both gears');assert.ok(Math.abs(curb.v)>0,'curb does not trap car');
 const escape=car(8,0,gear,gear===1?-Math.PI/2:Math.PI/2);
 for(let i=0;i<240;i++)escape.step(1/120);
 assert.ok(escape.x<7,'can leave sidewalk');assert.equal(escape.impact,false);
}
console.log('PASS: shared surface rendering, wheel contact, intersection gaps, slowing in both gears and escape.');

for(const t of [-120,0,120])for(const side of [-1,1]){
 assert.equal(wheelSurface(t+side*7.14,50,0),'curb');
 assert.equal(wheelSurface(50,t+side*7.14,Math.PI/2),'curb');
 for(const cross of [-120,0,120])assert.equal(wheelSurface(t+side*7.14,cross,0),'road');
}
