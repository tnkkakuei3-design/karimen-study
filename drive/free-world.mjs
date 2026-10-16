import {createDetailedHouse,loadHouseTextures} from './detailed-house.mjs?v=2';
import {addStreetDetails} from './street-details.mjs?v=1';
import {installExternalAssets,applySurface} from './external-assets.mjs?v=2';
import {createCar} from './free-car.mjs?v=1';
import {addRoadSurfaces} from './road-surfaces.mjs?v=2';
import {addDistricts} from './district-scenery.mjs?v=6';
import * as T from './vendor/three.module.min.js';
import {addShopBlock} from './shop-block.mjs?v=6';
import {STREETS,BUILDINGS,PLACES} from './free-model.mjs?v=house1';
export function createWorld(canvas){
 const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
 const scene=new T.Scene();scene.background=new T.Color(0xc9dbdf);scene.fog=new T.Fog(0xc9dbdf,100,265);
 // A small sky gradient and reusable grain textures avoid large downloaded assets.
 const skyCanvas=document.createElement('canvas');skyCanvas.width=2;skyCanvas.height=256;const skyCtx=skyCanvas.getContext('2d');const skyGradient=skyCtx.createLinearGradient(0,0,0,256);skyGradient.addColorStop(0,'#91b4c9');skyGradient.addColorStop(.65,'#c9dbdf');skyGradient.addColorStop(1,'#e8e4d7');skyCtx.fillStyle=skyGradient;skyCtx.fillRect(0,0,2,256);const sky=new T.CanvasTexture(skyCanvas);sky.colorSpace=T.SRGBColorSpace;scene.background=sky;
 const camera=new T.PerspectiveCamera(58,1,.35,380);scene.add(new T.HemisphereLight(0xe4f0fa,0x80735d,2.1));const sun=new T.DirectionalLight(0xffdfb0,2.6);sun.position.set(-85,75,55);scene.add(sun);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-170,right:170,top:170,bottom:-170,near:1,far:320});sun.shadow.bias=-.00025;sun.shadow.normalBias=.08;
 const cube=new T.BoxGeometry(1,1,1),batches=new Map(),materials=new Map();
 let grass;
 function grassTexture(){if(grass)return grass;const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#ededdf';ctx.fillRect(0,0,128,128);let seed=2731;for(let i=0;i<5000;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=(seed>>>16)%128;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const y=(seed>>>16)%128,shade=200+seed%45;ctx.fillStyle=`rgb(${shade},${Math.min(255,shade+8)},${shade-10})`;ctx.fillRect(x,y,1,2);}grass=new T.CanvasTexture(c);grass.colorSpace=T.SRGBColorSpace;grass.wrapS=grass.wrapT=T.RepeatWrapping;return grass;}
 let grain;
 function grainTexture(){if(grain)return grain;const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#f4f4f4';ctx.fillRect(0,0,128,128);let seed=7381;for(let i=0;i<2200;i++){seed=(seed*1664525+1013904223)>>>0;const x=seed%128;seed=(seed*1664525+1013904223)>>>0;const y=seed%128;const shade=220+seed%31;ctx.fillStyle=`rgb(${shade},${shade},${shade})`;ctx.fillRect(x,y,1,1);}grain=new T.CanvasTexture(c);grain.colorSpace=T.SRGBColorSpace;grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(4,4);return grain;}
 function mat(color){if(!materials.has(color))materials.set(color,([0x607f87,0x8ea9ab,0x9fb5b3].includes(color)?new T.MeshStandardMaterial({color:0x91a9af,roughness:.22,metalness:.12,envMapIntensity:.65}):new T.MeshLambertMaterial({color,map:[0x555f62,0xc8c2ae,0xd8ceb0,0xd5c5af,0xdfe1d9,0xc9d3d4,0xc5bba9].includes(color)?grainTexture():null})));return materials.get(color);}
 function box(x,y,z,w,h,d,color,ry=0){const cast=y+h/2>.5&&Math.min(w,h,d)>.12,key=color+':'+cast;const batch=batches.get(key)||{color,cast,items:[]};batch.items.push({x,y,z,w,h,d,ry});batches.set(key,batch);}
 box(-350,-.3,0,1000,.5,1800,0x8caa77);box(1050,-.65,0,1800,.5,1800,0x5babbc);box(155,-.3,0,12,.3,1800,0xd8ceb0);
 for(const s of STREETS){box(s,-.01,0,20,.2,292,0xbabcb1);box(0,-.01,s,292,.2,20,0xbabcb1);box(s,.11,0,16,.04,292,0x555f62);box(0,.12,s,292,.04,16,0x555f62);}
 for(const s of STREETS)for(let n=-138;n<140;n+=10){if(STREETS.some(k=>Math.abs(n-k)<13))continue;box(s,.16,n,.14,.025,4,0xe8ddbc);}
 for(const x of STREETS)for(const z of STREETS){for(let k=-5;k<=5;k+=2){box(x+k,.18,z+11,1,.02,3,0xeceae0);box(x+k,.18,z-11,1,.02,3,0xeceae0);box(x+11,.18,z+k,3,.02,1,0xeceae0);box(x-11,.18,z+k,3,.02,1,0xeceae0);}}
 function facadeWindow(x,y,z,alongX){
  // A projecting surround, inset pane and sill give the glazing real depth.
  const pane=(offset,w,h,d,c)=>box(x+(alongX?offset:0),y,z+(alongX?0:offset),alongX?d:w,h,alongX?w:d,c);
  pane(.03,2.22,1.72,.14,0xe4ded1);pane(.13,1.94,1.44,.05,0x607f87);
  box(x+(alongX?.12:0),y-.87,z+(alongX?0:.12),alongX?.3:2.35,.12,alongX?2.35:.3,0xb5b2a6);
 }
 for(const b of BUILDINGS){if(b.detailed)continue;box(b.x,b.h/2,b.z,b.w,b.h,b.d,b.color);for(let floor=3;floor<b.h;floor+=3)for(const off of [-5,0,5]){
  // Back facade faces +Z; east-facing sides use +X. West windows are mirrored below.
  facadeWindow(b.x+off,floor,b.z+9.05,false);facadeWindow(b.x+9.05,floor,b.z+off,true);
  box(b.x+off,floor,b.z-9.08,2.22,1.72,.14,0xe4ded1);box(b.x+off,floor,b.z-9.18,1.94,1.44,.05,0x607f87);box(b.x+off,floor-.87,b.z-9.17,2.35,.12,.3,0xb5b2a6);
  box(b.x-9.08,floor,b.z+off,.14,1.72,2.22,0xe4ded1);box(b.x-9.18,floor,b.z+off,.05,1.44,1.94,0x607f87);box(b.x-9.17,floor-.87,b.z+off,.3,.12,2.35,0xb5b2a6);
 }}
 // A spacious teaching ground and a shaded park form distinct western districts.
 box(-58,.03,65,84,.1,86,0xc0c3ad);for(let z=37;z<94;z+=15)box(-73,.1,z,40,.04,.16,0xf3eee0);
 box(-58,.08,-55,72,.15,72,0x78975c);box(-58,.2,-55,5,.05,72,0xd4c4a1);box(-58,.2,-55,72,.05,5,0xd4c4a1);
 for(let z=-135;z<=135;z+=12){box(146,1,z,.18,2,.18,0xd5dcd9);box(146,1.6,z,.14,.12,12,0xd5dcd9);}
 for(const p of PLACES){box(p.x,.12,p.z,9,.15,9,0xd2c9a8);box(p.x,2.5,p.z+4,.15,5,.15,0x5e7478);label(p.name,p.x,5.4,p.z+4,p.color);}
 function label(text,x,y,z,color){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#faf8ee';ctx.fillRect(0,0,512,128);ctx.fillStyle='#'+color.toString(16).padStart(6,'0');ctx.fillRect(0,0,16,128);ctx.font='bold 48px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,262,66);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=Math.min(8,renderer.capabilities?.getMaxAnisotropy?.()||1);const sign=new T.Sprite(new T.SpriteMaterial({map:tex,depthTest:true}));sign.position.set(x,y,z);sign.scale.set(12,3,1);scene.add(sign);}
 const trunks=[],crowns=[];for(let i=0;i<65;i++){const x=i<35?-101+(i%7)*14:137,z=i<35?-101+Math.floor(i/7)*15:-132+(i-35)*9;if(i<35&&Math.abs(x+58)<8)continue;trunks.push([x,1.2,z]);crowns.push([x,3.5,z]);}
 function instances(geometry,color,positions,scale){const mesh=new T.InstancedMesh(geometry,mat(color),positions.length),dummy=new T.Object3D();positions.forEach((p,i)=>{dummy.position.set(...p);dummy.scale.set(...scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();scene.add(mesh);return mesh;}
 const treeMeshes=[];
 treeMeshes.push(instances(cube,0x80684b,trunks,[.5,2.4,.5]));treeMeshes.push(instances(new T.IcosahedronGeometry(1,0),0x547e58,crowns,[2.5,2.8,2.5]));
 addRoadSurfaces(box);
 addShopBlock({scene,box,mat,anisotropy:Math.min(8,renderer.capabilities?.getMaxAnisotropy?.()||1)});
 addDistricts({scene,box,mat});
 addStreetDetails({scene,box,mat,anisotropy:Math.min(8,renderer.capabilities?.getMaxAnisotropy?.()||1)});

 // Thin ground layers and facade decals receive shadows but never cast onto themselves.
 for(const {color,cast,items:arr}of batches.values()){const mesh=new T.InstancedMesh(cube,mat(color),arr.length),dummy=new T.Object3D();arr.forEach((b,i)=>{dummy.position.set(b.x,b.y,b.z);dummy.scale.set(b.w,b.h,b.d);dummy.rotation.y=b.ry;dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.castShadow=cast;mesh.receiveShadow=true;mesh.computeBoundingSphere();scene.add(mesh);}
 for(const color of [0x8caa77,0x78975c])if(materials.has(color))applySurface(materials.get(color),grassTexture(),4);
 const {car,wheels,lamps,red,braking}=createCar();scene.add(car);
 const house=createDetailedHouse(BUILDINGS.find(b=>b.detailed));scene.add(house.group);
 const houseReady=loadHouseTextures(house.materials,Math.min(8,renderer.capabilities?.getMaxAnisotropy?.()||1));
 const externalReady=installExternalAssets({scene,renderer,materials,car,wheels,lamps,trunks,treeMeshes});
 const assetsReady=Promise.allSettled([externalReady,houseReady]);
 const target=new T.Vector3(),look=new T.Vector3();let first=true,low=false,inside=false,lastW=0,lastH=0;
 function render(d,dt){const w=canvas.clientWidth,h=canvas.clientHeight;if(w!==lastW||h!==lastH){renderer.setPixelRatio(low?1:Math.min(devicePixelRatio,2,Math.sqrt(1400000/Math.max(1,w*h))));renderer.setSize(w,h,false);camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();lastW=w;lastH=h;}
 car.position.set(d.x,0,d.z);car.rotation.y=-d.heading;car.visible=!inside;wheels.forEach(m=>m.rotation.y=-d.steer*.4);lamps.forEach(m=>m.material=d.input.brake?braking:red);
 const sx=Math.sin(d.heading),sz=-Math.cos(d.heading);target.set(d.x-sx*(inside?-.6:9),inside?1.65:5.4,d.z-sz*(inside?-.6:9));look.set(d.x+sx*18,inside?1.45:1.4,d.z+sz*18);
 if(first||inside)camera.position.copy(target);else camera.position.lerp(target,1-Math.exp(-dt*9));first=false;camera.lookAt(look);renderer.render(scene,camera);}
 return{render,assetsReady,reset(){first=true;},camera(){inside=!inside;first=true;return inside;},quality(){low=!low;renderer.shadowMap.enabled=!low;renderer.shadowMap.needsUpdate=true;renderer.setPixelRatio(low?1:Math.min(devicePixelRatio,2));lastW=0;return low;}};
}
