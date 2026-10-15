import * as THREE from './vendor/three.module.min.js';
import {createWorld,updateWorld,createIntegratedWorld,updateIntegratedWorld} from './world3d.mjs?v=090';
export class Renderer3D {
 constructor(canvas,{onContextLost=()=>{}}={}){
  this.canvas=canvas;this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.95;
  this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  this.ratio=Math.min(globalThis.devicePixelRatio||1,1.5);this.renderer.setPixelRatio(this.ratio);
  this.world=createWorld();this.worlds=new Map([[0,this.world]]);this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.yaw=0;this.currentYaw=0;this.lastWidth=0;this.lastHeight=0;this.failed=false;
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.failed=true;onContextLost();});
 }
 resize(width,height){if(width===this.lastWidth&&height===this.lastHeight)return;this.lastWidth=width;this.lastHeight=height;this.renderer.setSize(width,height,false);this.world.camera.aspect=width/height;this.world.camera.updateProjectionMatrix();}
 render(drive,{still=false,reducedMotion=false,width,height,yaw}={}){
  if(this.failed)throw new Error('WebGL context lost');if(this.world.index!==drive.index){if(!this.worlds.has(drive.index))this.worlds.set(drive.index,drive.index===3?createIntegratedWorld():createWorld({index:drive.index}));this.world=this.worlds.get(drive.index);this.lastWidth=0;this.currentYaw=0;}const r=this.canvas.getBoundingClientRect();this.resize(width||Math.max(1,r.width),height||Math.max(1,r.height));
  if(yaw!==undefined)this.yaw=yaw;this.currentYaw=still?0:this.currentYaw+(this.yaw-this.currentYaw)*.13;
  (drive.arcade?updateIntegratedWorld:updateWorld)(this.world,drive,{yaw:this.currentYaw,still,reducedMotion});this.renderer.render(this.world.scene,this.world.camera);
 }
 snapshot(drive,width,height){this.render(drive,{still:true,width,height,yaw:0});return this.canvas.toDataURL('image/webp',.9);}
 hit(clientX,clientY){this.world.scene.updateMatrixWorld(true);this.world.scene.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingSphere();o.computeBoundingBox();}});const b=this.canvas.getBoundingClientRect();this.pointer.set((clientX-b.left)/b.width*2-1,-(clientY-b.top)/b.height*2+1);this.raycaster.setFromCamera(this.pointer,this.world.camera);const hit=this.raycaster.intersectObjects(this.world.occluders.filter(o=>o.visible),true)[0];if(!hit)return false;let o=hit.object;while(o){if(this.world.targets.includes(o))return true;o=o.parent;}return false;}
 quality(light){this.renderer.setPixelRatio(light?1:this.ratio);this.renderer.shadowMap.enabled=!light;this.lastWidth=0;}
}
