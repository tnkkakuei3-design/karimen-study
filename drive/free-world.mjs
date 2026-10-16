import {addRoadSurfaces} from './road-surfaces.mjs?v=1';
import {addDistricts} from './district-scenery.mjs?v=2';
import * as T from './vendor/three.module.min.js';
import {addShopBlock} from './shop-block.mjs?v=2';
import {STREETS,BUILDINGS,PLACES} from './free-model.mjs?v=curb1';
export function createWorld(canvas){
 const renderer=new T.WebGLRenderer({canvas,antialias:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;
 const scene=new T.Scene();scene.background=new T.Color(0xc5d9dd);scene.fog=new T.Fog(0xc5d9dd,100,300);
 const camera=new T.PerspectiveCamera(58,1,.15,430);scene.add(new T.HemisphereLight(0xf2f7ff,0x69724d,2.5));const sun=new T.DirectionalLight(0xffecd1,2.1);sun.position.set(-65,95,45);scene.add(sun);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-170,right:170,top:170,bottom:-170,near:1,far:320});sun.shadow.bias=-.001;sun.shadow.normalBias=.15;
 const cube=new T.BoxGeometry(1,1,1),batches=new Map(),materials=new Map();
 function mat(color){if(!materials.has(color))materials.set(color,new T.MeshLambertMaterial({color}));return materials.get(color);}
 function box(x,y,z,w,h,d,color,ry=0){const arr=batches.get(color)||[];arr.push({x,y,z,w,h,d,ry});batches.set(color,arr);}
 box(0,-.3,0,306,.5,306,0x8caa77);box(242,-.65,0,180,.5,700,0x5babbc);box(155,-.3,0,12,.3,306,0xd8ceb0);
 for(const s of STREETS){box(s,-.01,0,20,.2,292,0xbabcb1);box(0,-.01,s,292,.2,20,0xbabcb1);box(s,.11,0,16,.04,292,0x555f62);box(0,.12,s,292,.04,16,0x555f62);}
 for(const s of STREETS)for(let n=-138;n<140;n+=10){if(STREETS.some(k=>Math.abs(n-k)<13))continue;box(s,.16,n,.14,.025,4,0xe8ddbc);box(n,.17,s,4,.025,.14,0xe8ddbc);}
 for(const x of STREETS)for(const z of STREETS){for(let k=-5;k<=5;k+=2){box(x+k,.18,z+11,1,.02,3,0xeceae0);box(x+k,.18,z-11,1,.02,3,0xeceae0);box(x+11,.18,z+k,3,.02,1,0xeceae0);box(x-11,.18,z+k,3,.02,1,0xeceae0);}}
 for(const b of BUILDINGS){box(b.x,b.h/2,b.z,b.w,b.h,b.d,b.color);if(b.x===30)box(b.x,b.h+.3,b.z,b.w+1,.6,b.d+1,0x697777);for(let floor=3;floor<b.h;floor+=3)for(const off of [-5,0,5]){box(b.x+off,floor,b.z-9.05,2,1.5,.1,0x607f87);box(b.x-9.05,floor,b.z+off,.1,1.5,2,0x607f87);box(b.x+9.05,floor,b.z+off,.1,1.5,2,0x607f87);box(b.x+off,floor,b.z+9.05,2,1.5,.1,0x607f87);}}
 // A spacious teaching ground and a shaded park form distinct western districts.
 box(-58,.03,65,84,.1,86,0xc0c3ad);for(let z=37;z<94;z+=15)box(-64,.1,z,58,.04,.16,0xf3eee0);
 box(-58,.08,-55,72,.15,72,0x78975c);box(-58,.2,-55,5,.05,72,0xd4c4a1);box(-58,.2,-55,72,.05,5,0xd4c4a1);
 for(let z=-135;z<=135;z+=12){box(146,1,z,.18,2,.18,0xd5dcd9);box(146,1.6,z,.14,.12,12,0xd5dcd9);}
 for(const p of PLACES){box(p.x,.12,p.z,9,.15,9,0xd2c9a8);box(p.x,2.5,p.z+4,.15,5,.15,0x5e7478);label(p.name,p.x,5.4,p.z+4,p.color);}
 function label(text,x,y,z,color){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#faf8ee';ctx.fillRect(0,0,512,128);ctx.fillStyle='#'+color.toString(16).padStart(6,'0');ctx.fillRect(0,0,16,128);ctx.font='bold 48px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,262,66);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const sign=new T.Sprite(new T.SpriteMaterial({map:tex,depthTest:true}));sign.position.set(x,y,z);sign.scale.set(12,3,1);scene.add(sign);}
 const trunks=[],crowns=[];for(let i=0;i<65;i++){const x=i<35?-101+(i%7)*14:137,z=i<35?-101+Math.floor(i/7)*15:-132+(i-35)*9;if(i<35&&Math.abs(x+58)<8)continue;trunks.push([x,1.2,z]);crowns.push([x,3.5,z]);}
 function instances(geometry,color,positions,scale){const mesh=new T.InstancedMesh(geometry,mat(color),positions.length),dummy=new T.Object3D();positions.forEach((p,i)=>{dummy.position.set(...p);dummy.scale.set(...scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();scene.add(mesh);}
 instances(cube,0x80684b,trunks,[.5,2.4,.5]);instances(new T.IcosahedronGeometry(1,0),0x547e58,crowns,[2.5,2.8,2.5]);
 addRoadSurfaces(box);
 addShopBlock({scene,box,mat});
 addDistricts({scene,box,mat});
 for(const [color,arr]of batches){const mesh=new T.InstancedMesh(cube,mat(color),arr.length),dummy=new T.Object3D();arr.forEach((b,i)=>{dummy.position.set(b.x,b.y,b.z);dummy.scale.set(b.w,b.h,b.d);dummy.rotation.y=b.ry;dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();scene.add(mesh);}
 const car=new T.Group();function part(x,y,z,w,h,d,color){const m=new T.Mesh(cube,mat(color));m.position.set(x,y,z);m.scale.set(w,h,d);car.add(m);return m;}
 part(0,.7,0,1.8,.65,4.1,0xf0cd68);part(0,1.22,.12,1.56,.65,2.12,0xe9e7db);part(0,1.3,-.96,1.4,.42,.04,0x54777f);part(0,1.3,1.2,1.4,.42,.04,0x54777f);part(-.79,1.3,.12,.03,.4,1.8,0x54777f);part(.79,1.3,.12,.03,.4,1.8,0x54777f);
 const wheels=[];for(const x of [-.94,.94])for(const z of [-1.25,1.25]){const m=new T.Mesh(new T.CylinderGeometry(.36,.36,.22,12),mat(0x293435));m.rotation.z=Math.PI/2;m.position.set(x,.38,z);car.add(m);if(z<0)wheels.push(m);}
 const lamps=[];for(const x of [-.6,.6]){part(x,.77,-2.07,.4,.18,.04,0xfff6da);lamps.push(part(x,.8,2.07,.4,.18,.04,0x9e4037));}scene.add(car);
 const target=new T.Vector3(),look=new T.Vector3();let first=true,low=false,inside=false,lastW=0,lastH=0;
 function render(d,dt){const w=canvas.clientWidth,h=canvas.clientHeight;if(w!==lastW||h!==lastH){renderer.setSize(w,h,false);camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();lastW=w;lastH=h;}
 car.position.set(d.x,0,d.z);car.rotation.y=-d.heading;car.visible=!inside;wheels.forEach(m=>m.rotation.y=-d.steer*.4);lamps.forEach(m=>m.material=mat(d.input.brake?0xff483b:0x9e4037));
 const sx=Math.sin(d.heading),sz=-Math.cos(d.heading);target.set(d.x-sx*(inside?-.6:9),inside?1.65:5.4,d.z-sz*(inside?-.6:9));look.set(d.x+sx*18,inside?1.45:1.4,d.z+sz*18);
 if(first||inside)camera.position.copy(target);else camera.position.lerp(target,1-Math.exp(-dt*9));first=false;camera.lookAt(look);renderer.render(scene,camera);}
 return{render,reset(){first=true;},camera(){inside=!inside;first=true;return inside;},quality(){low=!low;renderer.shadowMap.enabled=!low;renderer.shadowMap.needsUpdate=true;renderer.setPixelRatio(low?1:Math.min(devicePixelRatio,1.5));lastW=0;return low;}};
}
