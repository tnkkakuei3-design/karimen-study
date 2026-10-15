import assert from 'node:assert/strict';
import {createIntegratedWorld,updateIntegratedWorld} from './drive/world3d.mjs';
import {ArcadeDrive,visibleCrowd,CROWD_LIMIT} from './drive/arcade.mjs';
import {crowdStyle,CROWD_STYLES} from './drive/crowd-appearance.mjs';
const world=createIntegratedWorld(),d=new ArcadeDrive();d.start();d.input.gas=true;
const pool=[...world.crowd],seen=new Set(),identities=new Map();let activeMax=0;
for(let frame=0;frame<3600&&d.phase==='running';frame++){
 d.step(1/60);updateIntegratedWorld(world,d);world.scene.updateMatrixWorld();
 const visible=world.crowd.filter(g=>g.visible);activeMax=Math.max(activeMax,visible.length);
 assert.equal(visible.length,visibleCrowd(d).length);
 for(const g of visible){
  const id=g.userData.actorId,style=crowdStyle(id);seen.add(style.name);
  assert.equal(g.userData.rig.crowdStyle,style);assert.equal(g.userData.rig.bun.visible,style.bun);
  if(identities.has(id))assert.equal(identities.get(id),g,'Visible identities never swap models');
  identities.set(id,g);
  assert.equal(g.scale.y,style.height);
  g.traverse(o=>{for(const v of o.matrixWorld.elements)assert.ok(Number.isFinite(v));});
 }
 for(const id of identities.keys())if(!visible.some(g=>g.userData.actorId===id))identities.delete(id);
}
assert.equal(seen.size,CROWD_STYLES.length);assert.ok(activeMax>=6&&activeMax<=CROWD_LIMIT);
assert.deepEqual(world.crowd,pool,'Full drive reuses the original skeleton pool');
assert.equal(d.phase,'result');
console.log('PASS: all six character types, stable identities, finite animated transforms and fixed model pool throughout the full drive.');
