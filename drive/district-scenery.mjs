import * as T from './vendor/three.module.min.js';
import {BUILDINGS,DISTRICT_PROPS} from './free-model.mjs?v=curb1';
import {houseFront} from './district-layout.mjs?v=1';
export function addDistricts({scene,box,mat}){
 const homes=BUILDINGS.filter(b=>b.x!==30),dummy=new T.Object3D();
 // One shared gabled roof geometry, two instance batches for tile colours.
 const vertices=[-.5,0,-.5,.5,0,-.5,0,1,-.5,-.5,0,.5,0,1,.5,.5,0,.5,-.5,0,-.5,0,1,-.5,-.5,0,.5,0,1,-.5,0,1,.5,-.5,0,.5,0,1,-.5,.5,0,-.5,.5,0,.5,0,1,-.5,.5,0,.5,0,1,.5];
 for(let i=0;i<vertices.length;i+=9)for(let k=0;k<3;k++){const v=vertices[i+3+k];vertices[i+3+k]=vertices[i+6+k];vertices[i+6+k]=v;}
 const roof=new T.BufferGeometry();roof.setAttribute('position',new T.Float32BufferAttribute(vertices,3));roof.computeVertexNormals();
 const greens=[];
 for(const [parity,color]of [[0,0x966951],[1,0x627275]]){
  const group=homes.filter((_,i)=>i%2===parity),mesh=new T.InstancedMesh(roof,mat(color),group.length);
  group.forEach((b,i)=>{dummy.position.set(b.x,b.h+.15,b.z);dummy.rotation.set(0,0,0);dummy.scale.set(b.w+1.6,2.6,b.d+1.6);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();scene.add(mesh);
 }
 for(const b of homes){
  box(b.x,b.h+.04,b.z,b.w+1,.16,b.d+1,0xe4ded1);
  const f=houseFront(b);
  const front=(u,y,out,w,h,d,c)=>{const p=f.point(u,out);box(p.x,y,p.z,f.alongZ?w:d,h,f.alongZ?d:w,c);};
  front(0,1.55,.06,1.6,2.8,.16,0x776959);front(-.45,1.9,.17,.22,1.1,.05,0x9fb5b3);front(.5,1.5,.2,.06,.3,.06,0xe4ded1);
  front(0,.24,1.1,2.6,.35,2,0xb5b2a6);front(0,3.1,1,3,.16,2.4,0x627275);
  for(const u of [-5,5]){front(u,1.9,.12,2.8,1.8,.15,0x607f87);front(u,1.9,.25,.1,1.8,.08,0xe4ded1);front(u,.95,.35,3,.12,.7,0xe4ded1);}
  if(!(Math.abs(b.x)===90||Math.abs(b.z)===90))continue;
  // A recessed front garden with a clear path from the gate to the door.
  front(0,.12,5.5,17,.13,9,0x8caa77);front(0,.22,5.5,2,.05,9,0xd8ceb0);
  for(const u of [-7,7]){const p=f.point(u,6);greens.push([p.x,1,p.z]);front(u,.4,6,2.3,.65,2.3,0xb5b2a6);}
  front(1.9,1,9.9,.45,1.8,.45,0xb5b2a6);front(1.9,1.4,9.65,.38,.35,.16,0x776959);
  for(const u of [-5,5]){front(u,.5,10,6,.85,.25,0xb5b2a6);front(u,.96,10,6.2,.12,.35,0xe4ded1);for(let j=-2;j<=2;j++)front(u+j,.6,10.14,.025,.7,.015,0x697777);}
 }
 // Coastal promenade, kerb, sand and steps: no extra objects in the traffic lanes.
 for(let z=-138;z<140;z+=6)box(140,.26,z,10,.02,.04,0xb5b2a6);
 for(const p of DISTRICT_PROPS.filter(p=>p.kind==='bench')){
  box(p.x,.62,p.z,1.1,.12,2.5,0x776959);box(p.x+.48,1.04,p.z,.12,.8,2.5,0x776959);
  for(const dz of [-.9,.9])box(p.x,.32,p.z+dz,.8,.55,.1,0x424e4c);
  for(const dx of [-.3,0,.3])box(p.x+dx,.7,p.z,.025,.02,2.5,0xd8ceb0);
 }
 for(let z=-100;z<=100;z+=40){box(145,2.7,z,.12,5.4,.12,0x424e4c);box(144.6,5.35,z,.9,.15,.55,0xe4ded1);box(144.6,5.25,z,.65,.05,.38,0xf0dba1);}
 // Quiet bands of surf and distant rock islands add a visible horizon without per-frame water effects.
 for(let i=0;i<24;i++){const z=-142+i*12;box(159+(i%3)*1.4,-.34,z,1.2,.04,6+(i%4),0xc1d9d7);box(176+(i%4)*9,-.36,z+5,5,.025,.3,0x88c1c8);}
 for(const [x,z,w,h,d]of [[242,-110,32,7,24],[266,-90,46,12,33],[272,80,38,8,24]]){const rock=new T.Mesh(new T.IcosahedronGeometry(1,1),mat(0x78908b));rock.position.set(x,h*.2,z);rock.scale.set(w,h,d);scene.add(rock);}
 const shrubs=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),mat(0x547e58),greens.length);greens.forEach((p,i)=>{dummy.position.set(...p);dummy.scale.set(1.3,1,1.3);dummy.rotation.set(0,0,0);dummy.updateMatrix();shrubs.setMatrixAt(i,dummy.matrix);});shrubs.castShadow=true;shrubs.computeBoundingSphere();scene.add(shrubs);
}
