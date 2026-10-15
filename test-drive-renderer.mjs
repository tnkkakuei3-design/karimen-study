// Real scene/animation code; GPU submission is stubbed for deterministic checks.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from './drive/vendor/three.module.min.js';
import {createWorld,updateWorld,createIntegratedWorld,updateIntegratedWorld} from './drive/world3d.mjs';
import {Drive} from './drive/engine.mjs';
import {ArcadeDrive} from './drive/arcade.mjs';
class WebGLRenderer{
 constructor(){this.shadowMap={};}
 setPixelRatio(value){this.ratio=value;}
 setSize(w,h){this.size=[w,h];}
 render(scene){scene.updateMatrixWorld();}
}
let reads=0,size={width:640,height:360};
const canvas={getBoundingClientRect(){reads++;return size;},addEventListener(){},toDataURL(){return 'data:image/webp;base64,preview';}};
const context=vm.createContext({THREE:{...THREE,WebGLRenderer},createWorld,updateWorld,createIntegratedWorld,updateIntegratedWorld,devicePixelRatio:2});
const source=fs.readFileSync('drive/renderer3d.mjs','utf8').replace(/^import .*;\n/gm,'').replace('export class','class');
const Renderer3D=vm.runInContext(source+'\nRenderer3D',context);
const renderer=new Renderer3D(canvas);assert.equal(renderer.worlds.size,0,'No unselected course is constructed');
const d=new Drive(0);d.start();
for(let i=0;i<120;i++){d.step(1/60);renderer.render(d);}
assert.equal(reads,1,'Steady frames reuse canvas dimensions');
assert.equal(renderer.worlds.size,1);assert.equal(renderer.world.camera.aspect,640/360);
size={width:360,height:640};renderer.invalidateSize();renderer.render(d);
assert.equal(reads,2);assert.equal(renderer.world.camera.aspect,360/640);
renderer.snapshot(d,420,320);assert.equal(reads,2,'Snapshots use explicit dimensions');
renderer.render(d);assert.equal(renderer.world.camera.aspect,360/640,'Live size is restored after a snapshot');
renderer.quality(true);assert.equal(renderer.renderer.ratio,1);assert.equal(renderer.renderer.shadowMap.enabled,false);
renderer.quality(false);assert.equal(renderer.renderer.ratio,1.5);assert.equal(renderer.renderer.shadowMap.enabled,true);
let matrixUpdates=0;const original=THREE.Object3D.prototype.updateMatrix;
THREE.Object3D.prototype.updateMatrix=function(){matrixUpdates++;return original.call(this);};
const limits=[12000,12000,125000,140000];
for(let index=0;index<4;index++){
 const drive=index===3?new ArcadeDrive():new Drive(index);drive.start();
 renderer.render(drive);matrixUpdates=0;
 for(let frame=0;frame<120;frame++){drive.step(1/60);renderer.render(drive);}
 assert.ok(matrixUpdates<limits[index],`Course ${index}: repeated matrix updates stay within budget (${matrixUpdates})`);
 renderer.world.scene.traverse(o=>{for(const v of o.matrixWorld.elements)assert.ok(Number.isFinite(v),'World transform remains finite');});
 // Fixed geometry must still have its authored placement for shadows/raycasting.
 assert.equal(renderer.world.van.matrixWorld.elements[12],renderer.world.van.position.x);
 assert.equal(renderer.world.van.matrixWorld.elements[14],renderer.world.van.position.z);
 console.log(`Course ${index}: ${matrixUpdates} matrix compositions over 120 rendered frames.`);
}
THREE.Object3D.prototype.updateMatrix=original;
console.log('PASS: lazy course creation, cached sizing, orientation change, snapshot restoration, quality mode and all four scene/animation paths. GPU performance is not measured here.');
