import assert from 'node:assert/strict';
import * as T from './drive/vendor/three.module.min.js';
import {BUILDINGS,blocked} from './drive/free-model.mjs';
import {SHOPS} from './drive/shop-block.mjs';
import {createDetailedShops} from './drive/detailed-shops.mjs';
const {group,materials}=createDetailedShops(BUILDINGS,SHOPS);group.updateMatrixWorld(true);
assert.equal(group.userData.shopCount,6);assert.ok(group.children.length<=8);assert.equal(BUILDINGS.filter(b=>b.detailed).length+group.userData.shopCount,23);
let triangles=0;for(const m of group.children){for(const a of Object.values(m.geometry.attributes))assert.ok(a.array.every(Number.isFinite));triangles+=m.geometry.attributes.position.count/3;assert.ok(m.geometry.boundingSphere.radius<130);}
assert.ok(triangles<40000);
for(const s of SHOPS){
 const hits=new T.Raycaster(new T.Vector3(15,1.8,s.z+s.window+.23),new T.Vector3(1,0,0)).intersectObject(group,true);
 assert.ok(hits.length);assert.ok(hits[0].point.x>21&&hits[0].point.x<21.4,`${s.name}: storefront glazing is recessed`);
 assert.ok(blocked(30,s.z));assert.equal(blocked(16,s.z),false);
 const upper=new T.Raycaster(new T.Vector3(30,30,s.z),new T.Vector3(0,-1,0)).intersectObject(group,true);assert.ok(upper.length,'roof is closed above the shop');
}
assert.ok(materials.glass.transparent);console.log({shops:6,drawMeshes:group.children.length,triangles});console.log('PASS: all 23 properties detailed; six shop shells, recessed glazing, roof coverage, collision clearance and geometry budget. GPU pixels not tested.');
