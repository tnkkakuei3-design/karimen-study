import * as THREE from './vendor/three.module.min.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {clone} from './vendor/SkeletonUtils.js';
import data from './assets/pedestrian-data.mjs';
import {pedestrianMotion,childMotion,PREPARE} from './pedestrian-motion.mjs?v=090';
const bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0));
const asset=await new GLTFLoader().parseAsync(bytes.buffer,'');
const bounds=new THREE.Box3().setFromObject(asset.scene),scale=1.76/(bounds.max.y-bounds.min.y);
export function makePedestrian({kind='adult'}={}){
 const actor=new THREE.Group();actor.name='pedestrian';const body=clone(asset.scene);body.scale.setScalar(scale);body.position.y=-bounds.min.y*scale;actor.add(body);
 body.traverse(o=>{if(o.isMesh){o.material=o.material.clone();if(o.material.name==='Shirt'&&kind!=='adult')o.material.color.set(kind==='child'?'#e3a83c':'#6b927d');o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});
 const mixer=new THREE.AnimationMixer(body),actions={};
 for(const clip of asset.animations){const action=mixer.clipAction(clip);action.play();action.setEffectiveWeight(0);actions[clip.name]=action;}
 const head=body.getObjectByName('Head'),torso=body.getObjectByName('Torso');
 actor.userData={legs:[],arms:[],rig:{kind,body,mixer,actions,head,torso,headRest:head?.quaternion.clone(),torsoRest:torso?.quaternion.clone()}};
 if(kind==='child'){actor.scale.setScalar(.75);head.scale.multiplyScalar(1.17);actor.name='child';}posePedestrian(actor,{elapsed:null,time:0});return actor;
}
export function posePedestrian(actor,{elapsed=null,time=0,flight=null,impactSpeed=24}={}){
 const {kind,body,mixer,actions,head,torso,headRest,torsoRest}=actor.userData.rig;
 if(head)head.quaternion.copy(headRest);if(torso)torso.quaternion.copy(torsoRest);
 const prepare=kind==='child'?.65:PREPARE,m=kind==='child'?childMotion(elapsed):pedestrianMotion(elapsed),running=elapsed!==null&&elapsed>prepare;
 for(const a of Object.values(actions))a.setEffectiveWeight(0);
 const blend=Math.min(1,m.speed/3.2);
 actions.Idle.setEffectiveWeight(running?0:1);actions.Walk.setEffectiveWeight(running?1-blend:0);actions.Run.setEffectiveWeight(running?blend:0);
 // Pose sampling is driven by travelled distance, not display frame count.
 mixer.setTime(running?m.travel/(kind==='child'?1.8:2.8):time);
 body.position.y=-bounds.min.y*scale+blend*.065;
 body.rotation.set(running?Math.min(.16,m.speed*.05):0,0,0);
 actor.rotation.set(0,Math.atan2(1,.15),0);
 if(!running&&head){head.rotation.y+=elapsed===null?Math.sin(time*1.2)*.16:-.65*Math.sin(Math.min(elapsed/prepare,1)*Math.PI);}
 if(!running&&elapsed!==null&&torso)torso.rotation.x+=Math.sin(elapsed/prepare*Math.PI)*.13;
 if(flight!==null){
  // Keep authored limb reaction; tumble only part of a turn, then settle.
  for(const a of Object.values(actions))a.setEffectiveWeight(0);actions.Death.setEffectiveWeight(1);
  const t=Math.max(0,flight);mixer.setTime(Math.min(t*1.45,actions.Death.getClip().duration-.001));
  body.rotation.x=Math.sin(Math.min(t/1.15,1)*Math.PI)*(.5+Math.min(impactSpeed,50)*.005);
  actor.rotation.z=-Math.sin(Math.min(t/1.4,1)*Math.PI)*.48;
 }
 actor.updateMatrixWorld(true);
}
// Two-bone IK keeps hands on the bars and ankles on the rotating pedals.
const V=()=>new THREE.Vector3();
function aim(bone,child,target){
 const origin=bone.getWorldPosition(V()),from=child.getWorldPosition(V()).sub(origin).normalize(),to=target.clone().sub(origin).normalize();
 const world=bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(new THREE.Quaternion().setFromUnitVectors(from,to));
 bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));bone.updateWorldMatrix(false,true);
}
function limb(upper,lower,end,target,pole){
 const a=upper.getWorldPosition(V()),b=lower.getWorldPosition(V()),c=end.getWorldPosition(V()),l1=a.distanceTo(b),l2=b.distanceTo(c),delta=target.clone().sub(a),distance=delta.length();
 const length=THREE.MathUtils.clamp(distance,.001,l1+l2-.001),dir=delta.normalize();
 const bend=pole.clone().sub(a);bend.addScaledVector(dir,-bend.dot(dir)).normalize();
 const along=(l1*l1-l2*l2+length*length)/(2*length),height=Math.sqrt(Math.max(0,l1*l1-along*along));
 const knee=a.clone().addScaledVector(dir,along).addScaledVector(bend,height);
 aim(upper,lower,knee);aim(lower,end,target);
}
export function poseCyclist(bike,{travel=0,time=0,flight=null,impactSpeed=24}={}){
 const rider=bike.userData.rider,rig=rider.userData.rig;
 if(!rig.cycleRest){rig.cycleRest=[];rig.body.traverse(o=>{if(o.isBone)rig.cycleRest.push([o,o.position.clone(),o.quaternion.clone()]);});}
 for(const [bone,pos,rot] of rig.cycleRest){bone.position.copy(pos);bone.quaternion.copy(rot);}
 posePedestrian(rider,{elapsed:null,time:0,flight,impactSpeed});rider.rotation.y=Math.PI/2;
 if(flight!==null){rider.rotation.z=-Math.min(flight,.8)*.45;return;}
 rig.body.rotation.set(0,0,0);const hips=rig.body.getObjectByName('Hips');bike.updateWorldMatrix(true,true);
 const axis=new THREE.Vector3(0,0,1).applyQuaternion(bike.getWorldQuaternion(new THREE.Quaternion()));
 const world=hips.getWorldQuaternion(new THREE.Quaternion()).premultiply(new THREE.Quaternion().setFromAxisAngle(axis,-.32));
 hips.quaternion.copy(hips.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));bike.updateWorldMatrix(true,true);
 const phase=-travel/.4/2.7;bike.userData.wheels.forEach(w=>w.rotation.z=-travel/.4);bike.userData.crank.rotation.z=phase;
 for(const [suffix,side] of [['L',-1],['R',1]]){
  const target=bike.localToWorld(new THREE.Vector3(.08+side*.12*(Math.cos(phase)-Math.sin(phase)),.4+side*.12*(Math.sin(phase)+Math.cos(phase))+.10,side*.14));
  const bone=n=>rig.body.getObjectByName(n+suffix);
  limb(bone('UpperLeg'),bone('LowerLeg'),bone('LowerLeg')?.children[0],target,bike.localToWorld(new THREE.Vector3(.65,1,side*.18)));
  limb(bone('UpperArm'),bone('LowerArm'),bone('Palm'),bike.localToWorld(new THREE.Vector3(.32,1.34,side*.22)),bike.localToWorld(new THREE.Vector3(.10,1.1,side*.45)));
 }
 bike.updateWorldMatrix(true,true);
}
