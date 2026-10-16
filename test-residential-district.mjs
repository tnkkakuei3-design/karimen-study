import assert from 'node:assert/strict';
import * as T from './drive/vendor/three.module.min.js';
import {BUILDINGS,STREETS,DISTRICT_PROPS,blocked} from './drive/free-model.mjs';
import {houseFront} from './drive/district-layout.mjs';
import {createDetailedHouse,createResidentialDistrict} from './drive/detailed-house.mjs';
const homes=BUILDINGS.filter(b=>b.detailed),shops=BUILDINGS.filter(b=>b.lotX===30);
assert.ok(homes.length>10);assert.ok(shops.every(b=>!b.detailed&&b.w===18&&b.d===18));
for(const b of homes){
 const f=houseFront(b),{group}=createDetailedHouse(b);group.updateMatrixWorld(true);
 const direction=new T.Vector3(0,0,1).applyQuaternion(group.quaternion);assert.ok(Math.abs(direction.x-(f.alongZ?0:f.sign))<1e-6);assert.ok(Math.abs(direction.z-(f.alongZ?f.sign:0))<1e-6);
 const frontPoint=f.point(0,Math.abs(b.lotX)===90||Math.abs(b.lotZ)===90?8:3);assert.equal(blocked(frontPoint.x,frontPoint.z),false,'garden entry remains clear');
 const mailbox=f.point(1.9,(Math.abs(b.lotX)===90||Math.abs(b.lotZ)===90?10:5)-.1);
 const groundRay=new T.Raycaster(new T.Vector3(mailbox.x,2.2,mailbox.z),new T.Vector3(0,-1,0));assert.ok(groundRay.intersectObject(group,true).some(h=>h.point.y>.8),'mailbox rendering matches collider in each orientation');
 for(const dx of [-b.w/2,0,b.w/2])for(const dz of [-b.d/2,0,b.d/2])assert.ok(blocked(b.x+dx,b.z+dz));
}
const {group}=createResidentialDistrict(BUILDINGS);assert.equal(group.userData.houseCount,homes.length);assert.ok(group.children.length<=12);
let triangles=0;for(const mesh of group.children){for(const a of Object.values(mesh.geometry.attributes))assert.ok(a.array.every(Number.isFinite));triangles+=mesh.geometry.attributes.position.count/3;assert.ok(mesh.geometry.boundingSphere.radius<260);}
assert.ok(triangles<250000,'district geometry budget');
for(const street of STREETS)for(const offset of [-3,3])for(let n=-135;n<=135;n+=3){assert.equal(blocked(street+offset,n),false);assert.equal(blocked(n,street+offset),false);}
console.log({houses:homes.length,shops:shops.length,drawMeshes:group.children.length,triangles});console.log('PASS: all homes upgraded, entrances face streets, visual mailbox/collider alignment, road clearance and bounded merged geometry. GPU frame rate not tested.');
