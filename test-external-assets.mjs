import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as Three from './drive/vendor/three.module.min.js';
const files=new URL('./drive/assets/external/',import.meta.url);
const data={};for(const name of ['sedan','tree','rock'])data[name]=JSON.parse(await fs.readFile(new URL(name+'.json',files),'utf8'));
class TextureLoader{load(url,done){const t=new Three.Texture();t.name=url;if(url.includes('/sky.webp'))setTimeout(()=>done(t),5);else queueMicrotask(()=>done(t));}}
const context=vm.createContext({T:{...Three,TextureLoader},URL,AbortSignal,console,fetch:async url=>({ok:true,json:async()=>JSON.parse(await fs.readFile(url,'utf8'))})});
let source=await fs.readFile(new URL('./drive/external-assets.mjs',import.meta.url),'utf8');source=source.replace(/^import .*;\n/gm,'').replace(/^export /gm,'').replace("new URL('./assets/external/',import.meta.url)",`new URL(${JSON.stringify(files.href)})`);
vm.runInContext(source+'\nglobalThis.api={assetGeometry,applySurface,installExternalAssets};',context);
let triangles=0;for(const model of Object.values(data))for(const {geo}of context.api.assetGeometry(model)){assert.ok(geo.attributes.position.array.every(Number.isFinite));assert.ok(geo.attributes.normal.array.every(Number.isFinite));triangles+=geo.attributes.position.count/3;}
assert.ok(triangles<3000);const scene=new Three.Scene(),car=new Three.Group(),oldBody=new Three.Mesh(new Three.BoxGeometry()),lamp=new Three.Mesh(),shadow=new Three.Mesh(undefined,new Three.MeshBasicMaterial({transparent:true}));car.add(oldBody,lamp,shadow);scene.add(car);
const oldTree=new Three.InstancedMesh(new Three.BoxGeometry(),new Three.MeshLambertMaterial(),1);scene.add(oldTree);
const renderer={shadowMap:{}},wheels=[],materials=new Map([[0x555f62,new Three.MeshLambertMaterial()],[0xdfe1d9,new Three.MeshLambertMaterial()]]);
const result=await context.api.installExternalAssets({scene,renderer,materials,car,wheels,lamps:[lamp],trunks:[[0,1,20],[5,1,20]],treeMeshes:[oldTree]});
assert.equal(Object.keys(result).length,6);assert.equal(oldBody.visible,false);assert.equal(lamp.visible,true);assert.equal(shadow.visible,true);assert.equal(wheels.length,2);assert.ok(wheels.every(w=>w.position.z>0));assert.equal(oldTree.parent,null);assert.equal(renderer.shadowMap.needsUpdate,true);assert.ok(scene.environment&&scene.background);assert.ok(scene.background.name.includes('sky-background.webp'),'late environment does not overwrite sharp sky');
const asset=car.children.at(-1);asset.updateMatrixWorld(true);const size=new Three.Box3().setFromObject(asset).getSize(new Three.Vector3());assert.ok(size.x<2.6&&size.z<4.4&&size.y<1.8,JSON.stringify(size));
for(const material of materials.values()){const shader={vertexShader:Three.ShaderLib.lambert.vertexShader,fragmentShader:Three.ShaderLib.lambert.fragmentShader};material.onBeforeCompile(shader);assert.ok(shader.vertexShader.includes('vSurfaceUv='));assert.ok(shader.fragmentShader.includes('texture2D( map, vSurfaceUv )'));}
// Failed requests preserve the original car and trees, instead of blocking driving.
context.fetch=async()=>{throw new Error('simulated offline');};const fallback=new Three.Group(),body=new Three.Mesh();fallback.add(body);context.console={warn(){}};
await context.api.installExternalAssets({scene:new Three.Scene(),renderer:{shadowMap:{}},materials:new Map(),car:fallback,wheels:[],lamps:[],trunks:[],treeMeshes:[]});assert.equal(body.visible,true);
console.log('PASS: CC0 model geometry, dimensions, wheel orientation, asset installation, shader injection and offline model fallback.',{triangles});
