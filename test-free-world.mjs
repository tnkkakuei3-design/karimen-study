import {addRoadSurfaces} from './drive/road-surfaces.mjs';
import {houseFront} from './drive/district-layout.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import * as Three from './drive/vendor/three.module.min.js';
import {FreeDrive,STREETS,BUILDINGS,PLACES,STREET_PROPS,DISTRICT_PROPS,blocked} from './drive/free-model.mjs';
const dom=new JSDOM('<canvas id="world"></canvas>',{runScripts:'outside-only'}),w=dom.window;
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(_,key)=>(key==='createRadialGradient'||key==='createLinearGradient')?()=>({addColorStop(){}}):()=>{}});
let renders=0,scene,renderer;
class Renderer{constructor(options){renderer=this;this.options=options;}shadowMap={};setPixelRatio(value){this.ratio=value;}setSize(){}render(s,c){scene=s;renders++;assert.ok(c.projectionMatrix.elements.every(Number.isFinite));s.traverse(o=>{assert.ok(o.position.toArray().every(Number.isFinite));if(o.isInstancedMesh)assert.ok(o.instanceMatrix.array.every(Number.isFinite));});}}
Object.assign(w,{addRoadSurfaces,T:{...Three,WebGLRenderer:Renderer},STREETS,BUILDINGS,PLACES,STREET_PROPS,DISTRICT_PROPS,houseFront});
const source=fs.readFileSync(new URL('./drive/free-world.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function createWorld','function createWorld');
const shops=fs.readFileSync(new URL('./drive/shop-block.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
const districts=fs.readFileSync(new URL('./drive/district-scenery.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
const carSource=fs.readFileSync(new URL('./drive/free-car.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
vm.runInContext(carSource+'\n'+districts+'\n'+shops+'\n'+source+'\nglobalThis.worldTest=createWorld(document.getElementById("world"));',dom.getInternalVMContext());
for(const p of [...STREET_PROPS,...DISTRICT_PROPS])assert.ok(blocked(p.x,p.z));assert.equal(blocked(0,-60),false);
for(const street of STREETS)for(const side of [-3,3])for(let n=-135;n<=135;n+=3){assert.equal(blocked(street+side,n),false,'north/south lane remains clear');assert.equal(blocked(n,street+side),false,'east/west lane remains clear');}
assert.equal(renderer.options.antialias,true);const d=new FreeDrive();w.worldTest.render(d,.016);w.worldTest.camera();w.worldTest.render(d,.016);assert.equal(w.worldTest.quality(),true);assert.equal(renderer.shadowMap.enabled,false);assert.equal(renderer.ratio,1);assert.equal(w.worldTest.quality(),false);assert.equal(renderer.shadowMap.enabled,true);assert.ok(renderer.ratio<=2);assert.equal(renderer.shadowMap.autoUpdate,false);d.heading=Math.PI;w.worldTest.render(d,.016);assert.equal(renders,3);const sun=scene.children.find(o=>o.isDirectionalLight);assert.equal(sun.shadow.mapSize.x,2048);const asphalt=scene.children.filter(o=>o.isInstancedMesh&&o.material.color.getHex()===0x555f62);assert.ok(asphalt.length);assert.ok(asphalt.every(o=>!o.castShadow&&o.receiveShadow));const car=scene.children.find(o=>o.isGroup);assert.ok(car,'car group exists');
for(const mesh of car.children.filter(o=>o.isMesh&&o.geometry.index&&[16,20].includes(o.geometry.attributes.position.count))){
 const g=mesh.geometry,p=g.attributes.position;let volume=0;
 for(let i=0;i<g.index.count;i+=3){const a=new Three.Vector3().fromBufferAttribute(p,g.index.getX(i)),b=new Three.Vector3().fromBufferAttribute(p,g.index.getX(i+1)),c=new Three.Vector3().fromBufferAttribute(p,g.index.getX(i+2));volume+=a.dot(b.cross(c))/6;}
 assert.ok(volume>0,'closed car shell faces outward');
}
car.traverse(o=>{if(o.isMesh)assert.ok(o.geometry.attributes.position.array.every(Number.isFinite),'car vertices finite');});
for(const mesh of scene.children.filter(o=>o.isInstancedMesh&&o.geometry.attributes.position.count===18)){const normals=mesh.geometry.attributes.normal;for(let i=0;i<normals.count;i++)assert.ok(normals.getY(i)>=-1e-6,'roof normals face outside/up');}assert.ok(scene.children.length<100, `draw objects: ${scene.children.length}`);let count=0;scene.traverse(o=>{if(o.isInstancedMesh)count+=o.count});assert.ok(count<3000);console.log({drawObjects:scene.children.length,instances:count});console.log('PASS: 3D scene construction, finite geometry/camera state, both views and quality switch; static world uses instanced geometry. GPU pixels not tested.');dom.window.close();
