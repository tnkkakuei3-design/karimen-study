import * as T from './drive/vendor/three.module.min.js';
import assert from 'node:assert/strict';
import {createDetailedHouse} from './drive/detailed-house.mjs';
import {BUILDINGS,blocked} from './drive/free-model.mjs';
const houses=BUILDINGS.filter(b=>b.detailed);assert.equal(houses.length,1);
const b=houses[0],{group,materials}=createDetailedHouse(b);assert.equal(group.children.length,8);
let vertices=0;group.traverse(o=>{if(!o.isMesh)return;for(const key of ['position','normal','uv'])assert.ok(o.geometry.attributes[key].array.every(Number.isFinite));vertices+=o.geometry.attributes.position.count;});
assert.ok(vertices<15000);assert.ok(materials.glass.roughness<.25);
// All visible body corners are covered, but the road and garden entrance remain accessible.
for(const dx of [-6,0,6])for(const dz of [-7,0,7])assert.ok(blocked(b.x+dx,b.z+dz));
assert.equal(blocked(117,30),false);assert.equal(blocked(b.x+16,b.z),false);
const roof=group.children.find(o=>o.name==='house-roof'),n=roof.geometry.attributes.normal;
assert.ok([...Array(n.count).keys()].some(i=>n.getY(i)>.8),'roof has upward-facing slopes');
console.log(`PASS: one detailed house, ${group.children.length} material batches, ${vertices} vertices, finite UVs/normals and aligned collision bounds.`);

group.position.set(0,0,0);group.rotation.set(0,0,0);group.updateMatrixWorld(true);
const hits=new T.Raycaster(new T.Vector3(4.7,2,10),new T.Vector3(0,0,-1)).intersectObject(group,true);assert.ok(hits.length);assert.ok(hits[0].point.z<6,'window is recessed inside facade');
