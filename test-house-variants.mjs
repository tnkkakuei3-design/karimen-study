import assert from 'node:assert/strict';
import * as T from './drive/vendor/three.module.min.js';
import {BUILDINGS} from './drive/free-model.mjs';
import {createDetailedHouse,houseVariant,createResidentialDistrict} from './drive/detailed-house.mjs';

const homes=BUILDINGS.filter(b=>b.detailed),samples=new Map();
for(const b of homes)samples.set(houseVariant(b).id,b);
assert.equal(samples.size,4,'four distinct architectural types occur in the actual town');
const heights={};
for(const [type,b]of samples){
 const {group}=createDetailedHouse(b);group.position.set(0,0,0);group.rotation.set(0,0,0);group.updateMatrixWorld(true);
 const roof=group.getObjectByName('house-roof'),glass=group.getObjectByName('house-glass');roof.geometry.computeBoundingBox();
 const bounds=roof.geometry.boundingBox;heights[type]=bounds.max.y;
 assert.ok(bounds.min.x>=-7.8&&bounds.max.x<=7.8&&bounds.min.z>=-6.9&&bounds.max.z<=6.9,'roof stays inside its lot');
 // Rays exercise the actual roof triangles, not just vertex-count metadata.
 const maxX=type==='setback'?5.8:6.7,maxZ=type==='setback'?3.7:5.8;
 for(const x of [-maxX,-3,.3,3,maxX])for(const z of [-5.8,-3,.3,3,maxZ]){
  const hit=new T.Raycaster(new T.Vector3(x,15,z),new T.Vector3(0,-1,0)).intersectObject(roof)[0];
  assert.ok(hit,`${type}: roof closes above ${x},${z}`);assert.ok(hit.face.normal.y>.65,`${type}: roof faces outward`);
 }
 const positions=glass.geometry.attributes.position,upper=[],lower=[];
 for(let i=0;i<positions.count;i++){const p=new T.Vector3().fromBufferAttribute(positions,i);(p.y>4?upper:lower).push(p);}
 assert.ok(lower.length,'ground-floor glazing retained');
 if(type==='bungalow'){assert.equal(upper.length,0);assert.ok(bounds.max.y<6,'bungalow has a truly lower silhouette');}
 else{assert.ok(upper.length);assert.ok(bounds.max.y>8);}
 if(type==='setback'){
  assert.ok(Math.max(...upper.map(p=>p.z))<4.3,'upper facade is actually recessed');
  assert.ok(Math.max(...lower.map(p=>p.z))>5.9,'ground floor retains its footprint');
 }
 // Recessed glazing remains present on all four ground-floor elevations.
 for(const [p,d,axis,limit]of [
  [[4.7,2,10],[0,0,-1],'z',6],[[10,2,-2.7],[-1,0,0],'x',7],
  [[-10,2,-2.7],[1,0,0],'x',7],[[-3.7,2,-10],[0,0,1],'z',6]
 ]){const h=new T.Raycaster(new T.Vector3(...p),new T.Vector3(...d)).intersectObject(group,true)[0];assert.ok(h);assert.ok(Math.abs(h.point[axis])<limit,`${type}: recessed ${axis} glazing`);}
 const entrance=new T.Raycaster(new T.Vector3(.2,1.8,10),new T.Vector3(0,0,-1)).intersectObject(group,true)[0];
 assert.equal(entrance?.object.name,'house-wood',`${type}: entrance door is not hidden by the interior core`);
 // Check the wall immediately under the roof: no open slit between fascia and wall.
 const y=type==='bungalow'?3.8:type==='hip'?6.82:type==='setback'?6.7:7.15,z=type==='setback'?4.2:6;
 const shell=group.getObjectByName('house-wall');
 const hit=new T.Raycaster(new T.Vector3(4,y,10),new T.Vector3(0,0,-1)).intersectObject(shell)[0];
 assert.ok(hit&&Math.abs(hit.point.z-z)<.01,`${type}: front roof junction is closed`);
 group.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.map?.dispose();o.material.dispose();}});
}
assert.ok(new Set(Object.values(heights).map(v=>v.toFixed(1))).size>=3,'town skyline varies in height');
const {group}=createResidentialDistrict(BUILDINGS);assert.equal(group.children.length,12);assert.equal(Object.values(group.userData.variants).reduce((a,b)=>a+b,0),17);
console.log('PASS: four roof/body types, low single storey, recessed upper floor, outward roof coverage, closed roof junctions, four-sided glazing and 12 merged meshes.',{types:group.userData.variants,heights});
