import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import * as Three from './drive/vendor/three.module.min.js';
import {FreeDrive,STREETS,BUILDINGS,PLACES} from './drive/free-model.mjs';
const dom=new JSDOM('<canvas id="world"></canvas>',{runScripts:'outside-only'}),w=dom.window;
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>{}});
let renders=0,scene;
class Renderer{setPixelRatio(){}setSize(){}render(s,c){scene=s;renders++;assert.ok(c.projectionMatrix.elements.every(Number.isFinite));s.traverse(o=>{assert.ok(o.position.toArray().every(Number.isFinite));if(o.isInstancedMesh)assert.ok(o.instanceMatrix.array.every(Number.isFinite));});}}
Object.assign(w,{T:{...Three,WebGLRenderer:Renderer},STREETS,BUILDINGS,PLACES});
const source=fs.readFileSync(new URL('./drive/free-world.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function createWorld','function createWorld');
vm.runInContext(source+'\nglobalThis.worldTest=createWorld(document.getElementById("world"));',dom.getInternalVMContext());
const d=new FreeDrive();w.worldTest.render(d,.016);w.worldTest.camera();w.worldTest.render(d,.016);w.worldTest.quality();d.heading=Math.PI;w.worldTest.render(d,.016);assert.equal(renders,3);assert.ok(scene.children.length<60);console.log('PASS: 3D scene construction, finite geometry/camera state, both views and quality switch; static world uses instanced geometry. GPU pixels not tested.');dom.window.close();
