import {makePedestrian,posePedestrian,poseCyclist} from './pedestrian.mjs?v=090';
import {pedestrianMotion,childMotion} from './pedestrian-motion.mjs?v=090';
import * as THREE from './vendor/three.module.min.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
const mats=new Map();
const paint=new THREE.MeshPhysicalMaterial({color:'#e9ebe4',roughness:.31,metalness:.18,clearcoat:.45,clearcoatRoughness:.25});
const glass=new THREE.MeshStandardMaterial({color:'#355766',roughness:.2,metalness:.35});
const chrome=new THREE.MeshStandardMaterial({color:'#aab9be',roughness:.28,metalness:.65});
const rubber=new THREE.MeshStandardMaterial({color:'#263139',roughness:.93});
const cache=new Map();
function canvasTexture(key,w,h,paintFn){
 if(cache.has(key))return cache.get(key);if(typeof document==='undefined')return null;
 const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');if(!ctx)return null;
 paintFn(ctx,w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;cache.set(key,t);return t;
}
function compact(g){const name=g.name;const m=mergeEnvironment(g);m.name=name;return m;}
function rod(p,a,b,r,col){const v=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));const m=mesh(p,new THREE.CylinderGeometry(r,r,v.length(),8),col);m.position.copy(new THREE.Vector3(...a).add(new THREE.Vector3(...b)).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return m;}

function mat(color,roughness=.85){const key=color+':'+roughness;if(!mats.has(key))mats.set(key,new THREE.MeshStandardMaterial({color,roughness}));return mats.get(key);}
function mesh(parent,geo,color,x=0,y=0,z=0){const m=new THREE.Mesh(geo,typeof color==='string'?mat(color):color);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(p,x,y,z,w,h,d,col){return mesh(p,new THREE.BoxGeometry(w,h,d),col,x,y,z);}
function round(p,x,y,z,w,h,d,r,col){r=Math.min(r,w/3,h/3,d/3);const s=new THREE.Shape();const a=-w/2+r,b=w/2-r,c=-h/2+r,e=h/2-r;s.moveTo(a,-h/2);s.lineTo(b,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,c);s.lineTo(w/2,e);s.quadraticCurveTo(w/2,h/2,b,h/2);s.lineTo(a,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,e);s.lineTo(-w/2,c);s.quadraticCurveTo(-w/2,-h/2,a,-h/2);const g=new THREE.ExtrudeGeometry(s,{depth:d-r*2,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:r*.5,bevelThickness:r,curveSegments:5});g.translate(0,0,-(d-r*2)/2);return mesh(p,g,col,x,y,z);}
function cyl(p,x,y,z,r1,r2,h,col,segments=10){return mesh(p,new THREE.CylinderGeometry(r1,r2,h,segments),col,x,y,z);}
function sphere(p,x,y,z,r,col,scale=[1,1,1]){const m=mesh(p,new THREE.SphereGeometry(r,12,8),col,x,y,z);m.scale.set(...scale);return m;}
function line(p,points,r,col){const curve=new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v)));return mesh(p,new THREE.TubeGeometry(curve,16,r,5,false),col);}
function texture(text,w=256,h=256,bg='#f8f4df',fg='#374f53'){if(typeof document==='undefined')return null;const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');if(!ctx)return null;ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`700 ${Math.floor(h*.48)}px sans-serif`;ctx.fillText(text,w/2,h/2,w*.9);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
function label(p,x,y,z,w,h,text,bg,fg){const t=texture(text,512,128,bg,fg);const material=t?new THREE.MeshStandardMaterial({map:t,roughness:1}):mat(bg);const m=mesh(p,new THREE.PlaneGeometry(w,h),material,x,y,z);m.castShadow=false;return m;}
function planter(p,x,z,scale=1){cyl(p,x,.25*scale,z,.3*scale,.22*scale,.5*scale,'#ae8068',8);sphere(p,x,.68*scale,z,.42*scale,'#75916a',[1,1.2,1]);}
function tree(p,x,z,size=1){
 const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(size);p.add(g);
 cyl(g,0,1.35,0,.09,.18,2.7,'#7c7868',9);
 for(let i=0;i<5;i++){const a=i*2.4;rod(g,[0,1.7,0],[Math.cos(a)*.8,2.6+i*.14,Math.sin(a)*.6],.055,'#7c7868');}
 for(let i=0;i<13;i++){const a=i*2.399,rad=.6+(i%3)*.15;
 const m=mesh(g,new THREE.IcosahedronGeometry(.72+(i%3)*.1,1),['#5e805e','#779665','#91aa78'][i%3],Math.cos(a)*rad,2.8+(i%4)*.28,Math.sin(a)*rad);m.scale.set(1,1.15,1);}
 cyl(g,0,.09,0,.78,.78,.1,'#999f88',16);
}
function windowPanel(p,x,y,z,w,h){box(p,x,y,z,w+.12,h+.12,.09,'#ede9df');box(p,x,y,z+.06,w,h,.045,'#76939c');box(p,x,y,z+.095,.04,h,.035,'#d8ddd9');box(p,x,y-h*.12,z+.095,w,.035,.035,'#d8ddd9');box(p,x,y-h*.5-.08,z+.11,w+.25,.09,.23,'#a9ada6');}
function house(parent,x,z,seed){const g=new THREE.Group();parent.add(g);g.position.set(x,0,z);g.rotation.y=x<0?Math.PI/2:-Math.PI/2;const w=5.8+(seed%3)*.45,d=5.3,h=seed%4===0?3.5:6.3;const wall=['#ded8c7','#91a8ac','#dcc0a3','#e1e3d9'][seed%4];box(g,0,.2,0,w+.15,.4,d+.15,'#b6b8ac');box(g,0,h/2+.3,0,w,h,d,wall);
 const shape=new THREE.Shape();shape.moveTo(-w*.57,0);shape.lineTo(0,1.5);shape.lineTo(w*.57,0);shape.closePath();if(seed%4===1){box(g,0,h+.28,0,w+.3,.25,d+.3,'#687b7d');for(const sign of [-1,1])box(g,sign*w/2,h+.55,0,.12,.6,d,wall);box(g,0,h+.55,-d/2,w,.6,.12,wall);}else{const roofGeo=new THREE.ExtrudeGeometry(shape,{depth:d+1,bevelEnabled:false});roofGeo.translate(0,h+.2,-(d+1)/2);mesh(g,roofGeo,['#687b7d','#79847e','#8d8c7d'][seed%3]);} 
 // Slender roof seams and eaves, sliding windows, entry canopy, balcony.
 for(const sign of [-1,1])box(g,sign*w*.54,h+.18,0,.16,.14,d+1.1,'#78857f');
 for(const xx of [-w*.27,w*.27]){windowPanel(g,xx,2,d/2+.02,1.55,1.35);if(h>4)windowPanel(g,xx,4.8,d/2+.02,1.6,1.55);}
 box(g,0,1.25,d/2+.04,.95,2.1,.1,'#7b8177');box(g,.34,1.22,d/2+.12,.035,.36,.07,'#d7d7c5');box(g,0,2.4,d/2+.3,1.45,.12,.95,'#7a8988');box(g,0,.22,d/2+.42,1.6,.15,1,'#b5b6aa');
 if(h>4){box(g,w*.25,3.85,d/2+.48,2.35,.17,1.0,'#c5ccc5');box(g,w*.25,4.25,d/2+.98,2.35,.08,.06,'#728381');for(let n=0;n<9;n++)box(g,w*.25-1.1+n*.275,4.05,d/2+.98,.035,.55,.04,'#7f8f8a');}
 cyl(g,-w/2+.14,h/2,d/2+.17,.045,.045,h,'#a6b2a9',6);
 box(g,-w*.34,.7,d/2+.4,.95,.65,.4,'#d6d6cb');for(let j=0;j<5;j++)box(g,-w*.34,.47+j*.1,d/2+.62,.7,.025,.025,'#8c9a93');
 planter(g,-w*.35,d/2+.96,.8);planter(g,w*.35,d/2+.95,.65);
 box(g,0,.45,d/2+1.75,w+.4,.9,.18,'#c8cabe');box(g,0,.95,d/2+1.75,w+.45,.12,.25,'#b6bcb0');
 // Gate opening keeps the entrance readable.
 box(g,0,.5,d/2+1.78,1.2,.95,.22,'#84978d');for(let j=-3;j<=3;j++)box(g,j*.15,.52,d/2+1.91,.04,.73,.035,'#b3bfb2');
 // Facade finish: siding seams, trim, porch light, mailbox and roof ridge.
 for(let yy=.8;yy<h;yy+=.52)box(g,0,yy,d/2+.015,w,.016,.025,'#c7c8bc');
 box(g,0,h+.24,0,.12,.15,d+1.04,'#53666b');
 box(g,-w/2+.09,h/2+.3,d/2+.035,.1,h,.08,'#f1eee4');
 box(g,w/2-.09,h/2+.3,d/2+.035,.1,h,.08,'#f1eee4');
 box(g,.7,1.3,d/2+.16,.2,.3,.08,'#475c61');box(g,.7,1.38,d/2+.21,.13,.04,.01,'#c5d6d2');
 box(g,-.7,1.8,d/2+.18,.13,.25,.15,'#43575b');box(g,-.7,1.8,d/2+.27,.09,.17,.02,'#e3d5ae');
 if(seed%3===0){box(g,w*.32,1.7,d/2+.12,1.8,1.5,.12,'#9dada9');for(let k=0;k<7;k++)box(g,w*.32,1.05+k*.21,d/2+.2,1.8,.035,.035,'#d1d7ce');}
 if(seed%4===1){for(let k=0;k<5;k++)box(g,-w*.35+k*.26,2.9,d/2+.3,.12,.42,.42,['#e6dcc4','#7f9c95'][k%2]);}
 return g;
}
function wheel(p,x,y,z){
 const tire=cyl(p,x,y,z,.32,.32,.23,rubber,24);tire.rotation.z=Math.PI/2;
 const side=x>0?1:-1;const hub=cyl(p,x+side*.123,y,z,.205,.205,.02,chrome,20);hub.rotation.z=Math.PI/2;
 for(let k=0;k<5;k++){const a=k*Math.PI*.4;rod(p,[x+side*.139,y+Math.cos(a)*.065,z+Math.sin(a)*.065],[x+side*.139,y+Math.cos(a)*.185,z+Math.sin(a)*.185],.022,'#70828b');}
 const center=cyl(p,x+side*.147,y,z,.065,.065,.025,chrome,12);center.rotation.z=Math.PI/2;
}
export function makeVan(){
 const g=new THREE.Group();g.name='parked-van';
 round(g,0,.72,0,1.83,.72,4.12,.15,paint);
 round(g,0,1.46,.22,1.81,1.43,3.63,.15,paint);
 round(g,0,1.35,-1.47,1.76,1.28,1.02,.15,paint);
 // Separate dark seals and inset glazing, with a roof lip and true panel seams.
 round(g,0,1.73,2.055,1.58,.73,.035,.055,'#263e48');
 round(g,0,1.75,2.08,1.46,.6,.026,.045,glass);
 box(g,0,1.75,2.105,.055,.66,.025,paint);
 for(const sign of [-1,1]){
  for(const z of [-.43,.65]){round(g,sign*.919,1.7,z,.03,.71,.94,.045,'#263e48');round(g,sign*.94,1.72,z,.018,.6,.84,.035,glass);}
  round(g,sign*.9,1.67,-1.39,.04,.65,.64,.04,glass);
  box(g,sign*.923,1.17,.18,.02,.015,3.15,'#9eaeb0');
  for(const z of [-.93,1.27])box(g,sign*.929,1.2,z,.015,1.32,.018,'#9faeac');
  box(g,sign*.947,1.24,-.69,.03,.055,.23,chrome);
  round(g,sign*1.04,1.5,-1.62,.23,.23,.25,.04,'#455b63');
  round(g,sign*1.045,1.5,-1.48,.2,.17,.015,.025,glass);
  wheel(g,sign*.88,.34,-1.26);wheel(g,sign*.88,.34,1.32);
  round(g,sign*.74,.94,2.08,.21,.48,.07,.035,'#a84d45');
  box(g,sign*.74,.93,2.125,.17,.08,.015,'#f5d7a5');
  box(g,sign*.74,1.09,2.125,.17,.03,.015,'#e6a08b');
  round(g,sign*.66,1,-2.015,.43,.21,.07,.045,'#d9e9e6');
  box(g,sign*.66,.99,-2.057,.35,.04,.012,'#f8e8b9');
 }
 round(g,0,1.68,-1.993,1.49,.68,.025,.06,glass);
 rod(g,[-.6,1.39,-2.019],[-.15,1.48,-2.02],.013,'#283e48');
 rod(g,[.1,1.4,-2.019],[.57,1.48,-2.02],.013,'#283e48');
 round(g,0,.49,2.13,1.76,.18,.14,.05,'#687c81');
 box(g,0,1.08,2.09,.022,.9,.015,'#a4b1ae');
 round(g,0,1.19,2.12,.33,.065,.035,.02,chrome);
 box(g,0,.68,2.17,.56,.26,.02,'#e9d69a');
 box(g,0,.67,2.19,.32,.025,.01,'#536960');
 round(g,0,.72,-2.08,1.1,.22,.04,.03,'#314954');
 for(let j=0;j<3;j++)box(g,0,.65+j*.06,-2.105,.97,.013,.015,chrome);
 round(g,0,2.18,.24,1.64,.09,3.35,.04,'#d6ded9');
 rod(g,[.48,1.48,2.107],[.02,1.55,2.11],.012,'#304b54');
 return compact(g);
}
function figure({child=false,cycling=false}={}){
 const g=new THREE.Group();g.name=child?'child':cycling?'cyclist':'pedestrian';
 const shirt=child?'#e4af3e':'#577d98',pants='#394e64',skin='#d9ad91';
 const torso=new THREE.Group();g.add(torso);
 sphere(torso,0,1.05,0,.29,shirt,[.82,1.1,.53]);
 round(torso,0,.85,0,.41,.14,.27,.05,pants);
 cyl(torso,0,1.36,0,.075,.085,.16,skin,12);
 sphere(torso,0,1.55,-.01,.19,skin,[.83,1.08,.87]);
 sphere(torso,0,1.66,.035,.19,'#3d4148',[.9,.63,.88]);
 sphere(torso,0,1.53,-.175,.035,skin,[.7,1,1.2]);
 for(const side of [-1,1]){sphere(torso,side*.157,1.55,0,.043,skin,[.55,1,.8]);sphere(torso,side*.062,1.59,-.164,.014,'#35464b');}
 const collar=mesh(torso,new THREE.TorusGeometry(.078,.017,5,16),'#e3e1d5',0,1.34,0);collar.rotation.x=Math.PI/2;
 if(child){sphere(torso,0,1.73,0,.205,'#e7bc50',[1,.55,1]);cyl(torso,0,1.69,-.02,.245,.245,.025,'#e7bc50',20);round(torso,0,1.07,.18,.32,.4,.15,.05,'#a75643');for(const side of [-1,1])rod(torso,[side*.12,1.29,-.13],[side*.12,.91,-.15],.023,'#c18465');}
 if(cycling){sphere(torso,0,1.74,0,.215,'#e8e9dc',[1,.55,1]);for(const side of [-1,1]){rod(torso,[side*.13,1.73,-.12],[side*.13,1.76,.12],.018,'#708b94');rod(torso,[side*.18,1.69,0],[0,1.39,-.04],.012,'#627a80');}}
 const fixed=compact(torso);g.remove(torso);g.add(fixed);
 const legs=[],arms=[];
 for(const side of [-1,1]){
  const l=new THREE.Group();l.position.set(side*.115,.8,0);g.add(l);
  sphere(l,0,-.15,0,.105,pants,[.85,1.8,.9]);const knee=new THREE.Group();knee.position.y=-.33;l.add(knee);
  sphere(knee,0,-.15,.015,.085,pants,[1,1.9,1]);
  round(knee,0,-.34,-.065,.17,.13,.29,.05,'#e3e3d9');box(knee,0,-.39,-.07,.17,.025,.28,'#667f87');
  l.userData.knee=knee;legs.push(l);
  const a=new THREE.Group();a.position.set(side*.245,1.26,0);g.add(a);
  sphere(a,0,-.14,0,.086,shirt,[1,1.9,1]);const elbow=new THREE.Group();elbow.position.y=-.27;a.add(elbow);
  sphere(elbow,0,-.105,0,.066,skin,[.92,1.8,.92]);sphere(elbow,0,-.235,0,.065,skin,[.8,1.1,.8]);a.userData.elbow=elbow;arms.push(a);
 }
 if(!child&&!cycling){round(g,.3,.63,.04,.22,.28,.17,.04,'#b89572');rod(g,[.27,.91,.04],[.31,.75,.04],.014,'#876f57');}
 if(child)g.scale.setScalar(.74);
 g.rotation.y=-Math.PI/2;g.userData={legs,arms};return g;
}
export function makeChild(){return makePedestrian({kind:'child'});}
export function makeAdult({cycling=false}={}){return makePedestrian({kind:cycling?'cyclist':'adult'});}
export function makeBicycle(){
 const g=new THREE.Group();g.name='bicycle';const wheels=[];
 for(const x of [-.72,.72]){
  const w=new THREE.Group();w.position.set(x,.42,0);g.add(w);
  mesh(w,new THREE.TorusGeometry(.4,.045,8,24),'#354952');mesh(w,new THREE.TorusGeometry(.35,.016,5,24),'#b6c2c1');
  for(let i=0;i<8;i++){const a=i*Math.PI/4;line(w,[[0,0,0],[Math.cos(a)*.35,Math.sin(a)*.35,0]],.008,'#aab9b7');}wheels.push(w);
 }
 const pts=[[-.72,.42,0],[-.15,.95,0],[.08,.4,0],[.5,1.02,0],[.72,.42,0]];
 for(const [a,b] of [[0,1],[1,2],[2,0],[1,3],[3,2],[3,4],[2,4]])line(g,[pts[a],pts[b]],.035,'#698e85');
 line(g,[[-.15,.95,0],[-.2,1.14,0]],.025,'#b4bdb6');round(g,-.2,1.15,0,.32,.07,.2,.025,'#3f5258');
 line(g,[[.5,1.02,0],[.48,1.34,0],[.32,1.34,.22]],.025,'#adbcb9');line(g,[[.48,1.34,0],[.32,1.34,-.22]],.025,'#adbcb9');
 round(g,.74,1.1,0,.4,.3,.38,.025,'#a6b8b0');
 const rider=makeAdult({cycling:true});rider.position.set(-.22,.25,0);rider.rotation.y=Math.PI/2;
 rider.userData.arms.forEach(a=>a.rotation.x=-.95);rider.userData.legs.forEach((l,i)=>l.rotation.x=i?.4:-.4);g.add(rider);
 // Reverse the complete model: the rider, basket and front wheel face left.
 const crank=new THREE.Group();crank.position.set(.08,.4,0);g.add(crank);for(const sign of [-1,1]){rod(crank,[0,0,sign*.08],[sign*.12,sign*.12,sign*.08],.017,chrome);box(crank,sign*.12,sign*.12,sign*.14,.14,.035,.16,'#344b53');}
 g.rotation.y=Math.PI;g.userData={wheels,rider,crank};poseCyclist(g);return g;
}
function stopSign(parent,textures){
 cyl(parent,-4.1,1.7,-93,.055,.055,3.4,'#a8b6ad',8);
 const shape=new THREE.Shape();shape.moveTo(-.49,.3);shape.lineTo(.49,.3);shape.lineTo(0,-.55);shape.closePath();
 const geo=new THREE.ExtrudeGeometry(shape,{depth:.06,bevelEnabled:false});const sign=mesh(parent,geo,'#f5f0e4',-4.1,3,-93);const inner=mesh(parent,geo.clone(),'#c35e54',-4.1,3,-92.955);inner.scale.set(.88,.88,1);
 if(textures)label(parent,-4.1,3,-92.885,.65,.26,'止まれ','#c35e54','#fff8e8');
 return sign;
}
function makeCockpit(){
 const g=new THREE.Group();g.name='cockpit';
 // Lower dash leaves the road visible even on portrait phones.
 round(g,-.3,-.83,-1.22,2.9,.35,1.1,.12,'#253943');
 round(g,-.3,-.68,-1.66,2.9,.12,.6,.055,'#344a54');
 round(g,-.3,-.74,-1.05,2.8,.035,.13,.013,chrome);
 const wheel=new THREE.Group();wheel.position.set(.1,-.50,-.85);wheel.rotation.x=-.23;g.add(wheel);
 mesh(wheel,new THREE.TorusGeometry(.225,.032,12,48),'#253943');
 mesh(wheel,new THREE.TorusGeometry(.202,.006,6,48),'#748a90');
 round(wheel,0,-.01,.012,.19,.12,.075,.035,'#40555e');
 for(const sign of [-1,1]){const spoke=box(wheel,sign*.13,-.015,0,.12,.045,.035,chrome);spoke.rotation.z=sign*.16;box(wheel,sign*.125,.003,.025,.05,.015,.012,'#1b303a');}
 const spoke=box(wheel,0,-.13,0,.045,.16,.032,chrome);spoke.rotation.z=.05;
 mesh(wheel,new THREE.TorusGeometry(.026,.004,6,20),chrome,0,-.01,.057);
 round(g,.1,-.51,-1.29,.57,.17,.16,.045,'#172b35');
 // A small canvas texture is refreshed only when the displayed speed changes.
 const panel=new THREE.MeshBasicMaterial({color:'#cce4e6',toneMapped:false});
 const display=mesh(g,new THREE.PlaneGeometry(.48,.115),panel,.1,-.49,-1.197);
 const instrument=typeof document!=='undefined'?document.createElement('canvas'):null;
 if(instrument){instrument.width=512;instrument.height=128;const ctx=instrument.getContext('2d');if(ctx){panel.map=new THREE.CanvasTexture(instrument);panel.map.colorSpace=THREE.SRGBColorSpace;g.userData.instrument={ctx,texture:panel.map,last:-1};}}
 for(const xx of [-.57,.64]){round(g,xx,-.69,-1.16,.26,.09,.035,.02,'#102730');for(let k=0;k<4;k++)box(g,xx,-.72+k*.02,-1.135,.22,.005,.008,'#6c838a');}
 round(g,-.32,-.81,-.99,.23,.13,.03,.025,'#162c38');
 box(g,-.32,-.8,-.969,.18,.035,.006,'#56848f');
 // Two resting wipers, under the driver's sightline.
 rod(g,[-.65,-.61,-1.98],[-.12,-.59,-2.05],.008,'#263e48');rod(g,[.2,-.61,-1.98],[.7,-.59,-2.05],.008,'#263e48');
 g.userData.wheel=wheel;
 g.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});return g;
}
function updateInstrument(cockpit,drive){
 const data=cockpit.userData.instrument;if(!data)return;const speed=Math.round(drive.speed);const state=drive.input.brake?'BRAKE':speed===0?'STOP':'DRIVE';
 if(data.last===speed+state)return;data.last=speed+state;const c=data.ctx;c.fillStyle='#122832';c.fillRect(0,0,512,128);
 c.fillStyle='#8db4bc';c.font='17px sans-serif';c.textAlign='left';c.fillText('D',24,37);c.fillText('km/h',302,87);
 c.fillStyle='#eaf7f1';c.font='500 78px sans-serif';c.textAlign='center';c.fillText(String(speed).padStart(2,'0'),250,94);
 c.font='15px sans-serif';c.fillStyle=state==='BRAKE'?'#f2bf7c':'#99bcbf';c.fillText(state,422,72);
 c.strokeStyle='#497581';c.lineWidth=4;c.beginPath();c.moveTo(25,110);c.lineTo(487,110);c.stroke();data.texture.needsUpdate=true;
}
function mergeEnvironment(root){root.updateMatrixWorld(true);const groups=new Map();root.traverse(o=>{if(!o.isMesh)return;let geom=o.geometry.clone();if(geom.index)geom=geom.toNonIndexed();geom.applyMatrix4(o.matrixWorld);for(const k of Object.keys(geom.attributes))if(!['position','normal','uv'].includes(k))geom.deleteAttribute(k);const list=groups.get(o.material)||[];list.push(geom);groups.set(o.material,list);});const merged=new THREE.Group();merged.name='environment';for(const [material,geometries] of groups){const geo=mergeGeometries(geometries,false);if(geo){const m=new THREE.Mesh(geo,material);m.castShadow=true;m.receiveShadow=true;merged.add(m);}geometries.forEach(g=>g.dispose());}root.traverse(o=>{if(o.isMesh)o.geometry.dispose();});return merged;}
function daylight(scene,textures){
 // Vertex-colour sky also works without downloaded images or custom shaders.
 const geo=new THREE.SphereGeometry(240,32,20),colors=[];const positions=geo.attributes.position;
 const top=new THREE.Color('#6ba7c6'),horizon=new THREE.Color('#e2ece6');
 for(let i=0;i<positions.count;i++){const t=Math.pow(Math.max(0,positions.getY(i)/240),.55);const c=horizon.clone().lerp(top,t);colors.push(c.r,c.g,c.b);}
 geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 const sky=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,depthWrite:false,fog:false}));sky.name='sky';sky.renderOrder=-2;scene.add(sky);
 if(textures){const t=canvasTexture('daylight',512,256,(c,w,h)=>{
  const grad=c.createLinearGradient(0,0,0,h);grad.addColorStop(0,'#8bbada');grad.addColorStop(.45,'#deebe6');grad.addColorStop(.53,'#91a693');grad.addColorStop(1,'#566562');c.fillStyle=grad;c.fillRect(0,0,w,h);
  const glow=c.createRadialGradient(120,60,0,120,60,44);glow.addColorStop(0,'#fff7de');glow.addColorStop(.15,'#fff6dd');glow.addColorStop(1,'rgba(255,244,216,0)');c.fillStyle=glow;c.fillRect(65,5,110,110);
 });if(t){t.mapping=THREE.EquirectangularReflectionMapping;scene.environment=t;scene.environmentIntensity=.42;}}
 const clouds=new THREE.Group();clouds.name='clouds';const cloudMat=new THREE.MeshBasicMaterial({color:'#edf3ee',fog:false});
 for(let i=0;i<5;i++){const z=-145-i*9,x=-95+i*48;for(let j=0;j<4;j++){const c=mesh(clouds,new THREE.SphereGeometry(1,12,6),cloudMat,x+j*6,38+(i%3)*12+(j%2)*2,z);c.scale.set(12-j,3+j%2,6);c.castShadow=false;c.receiveShadow=false;}}
 const cloudBatch=compact(clouds);cloudBatch.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});scene.add(cloudBatch);return sky;
}

function contactShadow(scene,width,depth,textures){
 if(!textures)return null;const map=canvasTexture('contact',64,64,(c)=>{const g=c.createRadialGradient(32,32,3,32,32,32);g.addColorStop(0,'rgba(20,34,36,.28)');g.addColorStop(.5,'rgba(20,34,36,.16)');g.addColorStop(1,'rgba(20,34,36,0)');c.fillStyle=g;c.fillRect(0,0,64,64);});if(!map)return null;
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(width,depth),new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.026;scene.add(shadow);return shadow;
}
function streetDetails(env,hazard,index){
 // Flush manholes and paving joints give scale without becoming new hazards.
 for(let z=18;z<185;z+=31){if(Math.abs(z-hazard)<10)continue;const disc=cyl(env,-.25,.014,-z,.34,.34,.012,'#536569',24);disc.castShadow=false;
  for(let k=-2;k<=2;k++)box(env,-.25,.024,-z+k*.09,.49,.009,.013,'#7d8b88');}
 for(const side of [-1,1])for(let z=3;z<180;z+=2.4){if(index===2&&Math.abs(z-hazard)<5)continue;box(env,side*4.25,.126,-z,1.35,.004,.018,'#bbbfb3');}
 for(let i=0;i<6;i++){const z=22+i*27;if(Math.abs(z-hazard)<16)continue;const side=i%2?1:-1;
  box(env,side*5.1,.19,-z,1.1,.3,2.4,'#aaad97');
  for(let j=0;j<5;j++){sphere(env,side*5.1,.48,-z-.8+j*.4,.27,['#688765','#829965'][j%2],[1,.9,1]);}
 }
}
export function createWorld({merged=true,textures=true,index=0,integrated=false}={}){
 const hazard=[88,94,100][index];const intersection=index===2;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#c9e2ec');scene.fog=new THREE.Fog('#dae6e2',85,220);const sky=daylight(scene,textures);
 const camera=new THREE.PerspectiveCamera(57,1,.08,300);camera.rotation.order='YXZ';scene.add(camera);const cockpit=makeCockpit();camera.add(cockpit);
 const hemisphere=new THREE.HemisphereLight('#e8f5ff','#899785',1.65);scene.add(hemisphere);const sun=new THREE.DirectionalLight('#fff0d9',2.65);sun.position.set(-35,48,16);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-28;sun.shadow.camera.right=28;sun.shadow.camera.top=42;sun.shadow.camera.bottom=-38;sun.shadow.camera.near=1;sun.shadow.camera.far=125;sun.shadow.bias=-.00035;sun.shadow.normalBias=.035;sun.shadow.radius=3;scene.add(sun,sun.target);
 let env=new THREE.Group();env.name='environment';
 box(env,0,-.18,integrated?-200:-90,160,.22,integrated?590:370,'#9da98b');
 let asphalt=mat('#626f70');
 if(textures){const tex=canvasTexture('asphalt',256,256,(ctx,w,h)=>{let seed=132;const img=ctx.createImageData(w,h);for(let i=0;i<img.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const n=95+(seed%22);img.data[i]=n;img.data[i+1]=n+7;img.data[i+2]=n+8;img.data[i+3]=255;}ctx.putImageData(img,0,0);});if(tex){tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(2,90);asphalt=new THREE.MeshStandardMaterial({map:tex,roughness:.96});}}
 box(env,0,-.045,integrated?-200:-100,7.1,.09,integrated?510:310,asphalt);
 if(intersection)box(env,0,-.035,-hazard,100,.08,8,asphalt);
 for(const side of [-1,1]){
  const crossZ=integrated?220:hazard;const ranges=(intersection||integrated)?[[integrated?-455:-285,-crossZ-4],[-crossZ+4,55]]:[[-285,55]];
  for(const [from,to] of ranges){const mid=(from+to)/2,len=to-from;box(env,side*4.25,.04,mid,1.4,.16,len,'#dddccc');box(env,side*3.58,.06,mid,.14,.19,len,'#eeeadc');box(env,side*3.35,.009,mid,.1,.014,len,'#efeddf');}
  for(let z=0;z<(integrated?420:210);z+=7){if(Math.abs(z-hazard)<5&&index>0)continue;box(env,side*3.65,.145,-z,.15,.018,.44,'#8c9c96');for(let j=0;j<3;j++)box(env,side*3.65,.157,-z-.12+j*.12,.13,.01,.025,'#506c67');}
 }
 for(let z=-5;z<(integrated?420:210);z+=8){if((index>0&&Math.abs(z-hazard)<9)||(integrated&&(Math.abs(z-154)<5||Math.abs(z-220)<9)))continue;box(env,0,.012,-z,.075,.015,3.4,'#e9e5cf');}
 if(index===1){
  for(let x=-3;x<=3;x+=.8)box(env,x,.018,-hazard,.45,.02,3.3,'#f2eddf');
  box(env,-1.72,.02,-hazard+6,3.1,.025,.35,'#f2eddf');
  // Lowered pavement at the crossing and tactile paving on both approaches.
  for(const side of [-1,1]){box(env,side*4.2,.135,-hazard,1.25,.035,1.8,'#d9bf70');
   for(let j=0;j<4;j++)for(let k=0;k<5;k++)sphere(env,side*4.2-.42+j*.28,.16,-hazard-.6+k*.3,.035,'#b9a265',[1,.4,1]);
   cyl(env,side*4.8,1.7,-hazard+2.8,.045,.045,3.4,'#a9b5b0',8);box(env,side*4.8,3,-hazard+2.8,.72,.65,.06,'#557fa2');
   if(textures){const map=canvasTexture('crosswalk-sign',256,256,(c)=>{c.fillStyle='#28679c';c.fillRect(0,0,256,256);c.fillStyle='#fcf9e9';c.beginPath();c.moveTo(128,22);c.lineTo(236,222);c.lineTo(20,222);c.closePath();c.fill();c.strokeStyle='#28679c';c.lineCap='round';c.lineWidth=14;c.beginPath();c.arc(132,91,13,0,Math.PI*2);c.fillStyle='#28679c';c.fill();c.beginPath();c.moveTo(133,114);c.lineTo(120,145);c.lineTo(100,178);c.moveTo(120,145);c.lineTo(150,178);c.moveTo(128,120);c.lineTo(151,139);c.moveTo(126,121);c.lineTo(106,137);c.stroke();for(let j=0;j<5;j++)c.fillRect(60+j*29,195,18,9);});if(map)mesh(env,new THREE.PlaneGeometry(.66,.6),new THREE.MeshStandardMaterial({map,roughness:.9}),side*4.8,3,-hazard+2.84);}}
 }
 if(intersection){box(env,-1.72,.02,-hazard+7,3.1,.025,.4,'#f2eddf');
  if(textures){const map=canvasTexture('stop-road',256,768,(c)=>{c.clearRect(0,0,256,768);c.fillStyle='#f5f0df';c.font='900 190px sans-serif';c.textAlign='center';c.textBaseline='middle';['止','ま','れ'].forEach((t,i)=>c.fillText(t,128,128+i*256));});if(map){const roadText=mesh(env,new THREE.PlaneGeometry(1.35,4),new THREE.MeshStandardMaterial({map,transparent:true,alphaTest:.2,roughness:1,depthWrite:false}),-1.7,.025,-hazard+15);roadText.rotation.x=-Math.PI/2;roadText.castShadow=false;}}
 }
 for(let i=0;i<(integrated?29:17);i++){const z=6+i*12.7;for(const side of [-1,1]){if((integrated&&(Math.abs(z-154)<14||Math.abs(z-220)<14))||(index===0&&side<0&&Math.abs(z-88)<12)||(index>0&&Math.abs(z-hazard)<14))continue;house(env,side*(8.1+(i%2)*.3),-z,i+(side>0?2:0));if(i%3===0)tree(env,side*5.35,-z-6,.8+(i%2)*.12);}}
 // A quiet garden wall leaves a genuine occluded area behind the parked van.
 if(index===0){box(env,-5.35,.75,-87.6,.22,1.5,15,'#c9cab9');box(env,-5.35,1.55,-87.6,.3,.1,15,'#abb69f');for(let j=0;j<7;j++)sphere(env,-5.8,2,-81-j*2,.9,'#8eaa7c',[.8,.8,1.1]);}
 for(let z=8;z<(integrated?365:205);z+=28){if(intersection&&Math.abs(z-hazard)<7)continue;cyl(env,-4.9,4.8,-z,.105,.16,9.6,'#9caaa4',8);box(env,-4.9,8.8,-z,1.7,.08,.08,'#7e908a');for(const dx of [-.65,0,.65]){cyl(env,-4.9+dx,8.94,-z,.075,.075,.2,'#dbdfd2',6);line(env,[[-4.9+dx,8.9,-z],[-4.9+dx,8.4,-z-14],[-4.9+dx,8.9,-z-28]],.018,'#697d78');}line(env,[[-4.9,6.9,-z],[-4.2,7,-z],[-3.8,6.9,-z]],.055,'#9caaa4');round(env,-3.8,6.84,-z,.45,.12,.2,.04,'#eee6cf');}
 // Utility box, corner mirror and a school-route placard.
 round(env,5.1,.75,-56,.6,1.5,.5,.04,'#b5c5bd');cyl(env,-4.7,1.7,-68,.055,.055,3.4,'#b2b9a3',8);box(env,-4.7,3,-68,.68,.7,.07,'#d0ad55');if(textures)label(env,-4.7,3,-67.95,.62,.55,'通学路','#edcf76','#4d655d');
 for(let j=0;j<7;j++)sphere(env,-50+j*18,2,integrated?-490:-230,35,'#a8bdb2',[1,.5,1]);streetDetails(env,hazard,index);
 scene.add(env);if(merged){scene.remove(env);env=mergeEnvironment(env);scene.add(env);}
 const van=makeVan();van.position.set(index===0?-3.7:4.4,0,index===0?-85.3:-145);scene.add(van);
 const child=index===0?makeChild():index===1?makeAdult():makeBicycle();scene.add(child);const actorShadow=contactShadow(scene,index===2?2:.9,index===2?.9:1.1,textures);const vanShadow=contactShadow(scene,2.4,4.9,textures);if(vanShadow)vanShadow.position.set(van.position.x,.026,van.position.z);
 const corner=new THREE.Group();corner.name='blind-corner';
 if(intersection){
  box(corner,6,2.25,-91.8,4.8,4.5,7.6,'#d9d2c1');box(corner,6,4.55,-91.8,5,.15,7.8,'#8d9b94');
  for(let z=-94;z<=-89;z+=2){const win=box(corner,3.57,2.8,z,.04,1.2,1.1,'#819fa7');box(corner,3.53,2.8,z,.03,1.2,.04,'#d6dfd8');}
  box(corner,3.57,.5,-91.8,.12,1,7.6,'#bdc1b5');stopSign(corner,textures);scene.add(corner);
  const mirror=new THREE.Group();cyl(mirror,-4.6,2,-104.7,.045,.045,4,'#c18a5e',8);const disc=mesh(mirror,new THREE.CircleGeometry(.44,24),'#acbfc0',-4.6,3.65,-104.65);mesh(mirror,new THREE.TorusGeometry(.44,.045,6,24),'#cf975f',-4.6,3.65,-104.62);scene.add(mirror);
 }
 const targets=index===0?[van,child]:index===1?[child]:[corner,child];
 const occluders=[env,van,child,...(intersection?[corner]:[])];
 const marker=new THREE.Mesh(new THREE.TorusGeometry(1.55,.025,6,40),new THREE.MeshBasicMaterial({color:'#e5b354',depthTest:false,transparent:true,opacity:.9}));marker.renderOrder=9;marker.visible=false;scene.add(marker);
 return{scene,camera,sky,actorShadow,environment:env,van,child,cockpit,sun,marker,index,targets,occluders,corner};
}
export function updateWorld(world,drive,{yaw=0,still=false,reducedMotion=false}={}){
 const {camera,child,cockpit,sun,marker}=world;const movement=drive.phase==='running'&&!still&&!reducedMotion;const bob=movement?Math.sin(drive.z*2.8)*.004*Math.min(drive.speed/25,1):0;const pitch=movement?(drive.input.brake?-.012:drive.input.gas?.006:0):0;
 camera.position.set(drive.x??-1.38,1.58+bob,-drive.z);camera.rotation.set(-.015+pitch,yaw-(drive.steering||0)*.035,reducedMotion?0:-(drive.steering||0)*.018,'YXZ');world.sky.position.copy(camera.position);updateInstrument(cockpit,drive);
 // World coordinates follow the engine; the child begins directly behind the van.
 const x=world.index===0?-3.7+Math.max(0,drive.actorX+5.05)*.86:world.index===1?-4.3+Math.max(0,drive.actorX+5.05)*.91:drive.actorX;
 child.position.set(x,world.index===1&&Math.abs(x)>3.6?.13:0,-drive.scene.hazard);child.visible=!drive.actorClear;if(world.actorShadow){world.actorShadow.position.set(x,.027,-drive.scene.hazard);world.actorShadow.visible=child.visible&&Math.abs(x)<3.5;}
 const walk=drive.eventTime!==null&&!still?Math.sin(Math.max(0,drive.eventTime-.85)*8)*.42:0;
 if(world.index===2){child.userData.wheels.forEach(w=>w.rotation.z=drive.eventTime===null?0:-drive.eventTime*5);child.userData.crank.rotation.z=drive.eventTime===null?0:-drive.eventTime*5;
 child.userData.rider.userData.legs.forEach((l,i)=>{l.rotation.x=-.25+(i?1:-1)*walk*.7;l.userData.knee.rotation.x=.65+(i?1:-1)*walk*.45;});child.userData.rider.userData.arms.forEach(a=>a.userData.elbow.rotation.x=-.25);}else{child.userData.legs.forEach((l,i)=>{l.rotation.x=i?walk:-walk;l.userData.knee.rotation.x=-Math.max(0,(i?-walk:walk))*.9;});child.userData.arms.forEach((a,i)=>{a.rotation.x=i?-walk*.7:walk*.7;a.userData.elbow.rotation.x=-.15-Math.abs(walk)*.3;});}
 if(drive.impact){const t=Math.min(2.5,drive.time-drive.impact.at);child.visible=true;child.position.set(drive.impact.x+t*2.2,Math.max(0,6*t-2.8*t*t),-drive.scene.hazard-t*5);child.rotation.z=t*3.2;child.rotation.x=t*2.1;if(world.actorShadow)world.actorShadow.visible=false;}else{child.rotation.x=0;child.rotation.z=0;}
 if(world.index<2){const motion=world.index===0?childMotion(drive.eventTime):pedestrianMotion(drive.eventTime);const flight=drive.impact?drive.time-drive.impact.at:null;
  child.position.set(motion.x,Math.abs(motion.x)>3.6?.13:0,-drive.scene.hazard+motion.towardCar);
  posePedestrian(child,{elapsed:drive.eventTime,time:drive.time,flight,impactSpeed:drive.impact?.speed});
  if(flight!==null){const t=Math.min(flight,2.5),power=Math.min(drive.impact.speed/35,1.4);child.position.set(drive.impact.x+t*(1+power),Math.max(0,5*t-3.4*t*t),-(drive.impact.z??drive.scene.hazard)-t*(2+power*2));}
  if(world.actorShadow){world.actorShadow.position.set(child.position.x,.027,child.position.z);world.actorShadow.visible=child.visible&&flight===null;}
 }
 if(world.index===2)poseCyclist(child,{travel:Math.max(0,5.3-drive.actorX),time:drive.time,flight:drive.impact?drive.time-drive.impact.at:null,impactSpeed:drive.impact?.speed});
 cockpit.userData.wheel.rotation.z=-(drive.steering||0)*.55;
 sun.position.set(-35,48,16-drive.z);sun.target.position.set(0,0,-drive.z-23);sun.target.updateMatrixWorld();
 marker.visible=!!drive.detected;if(world.index===0)marker.position.set(-3.7,1.25,-83.1);else if(world.index===1)marker.position.set(x,1,-drive.scene.hazard+.3);else marker.position.set(3.6,2,-88);marker.scale.setScalar(world.index===1?.55:1);marker.quaternion.copy(camera.quaternion);world.scene.updateMatrixWorld(true);
}

export function createIntegratedWorld(){
 const w=createWorld({integrated:true});w.index=3;
 const additions=new THREE.Group();
 for(let x=-3;x<=3;x+=.8)box(additions,x,.02,-154,.45,.025,3.3,'#f2eddf');
 box(additions,-1.72,.02,-148,3.1,.025,.35,'#f2eddf');
 for(const side of [-1,1]){box(additions,side*4.2,.135,-154,1.25,.035,1.8,'#d9bf70');cyl(additions,side*4.8,1.7,-151.2,.045,.045,3.4,'#a9b5b0');box(additions,side*4.8,3,-151.2,.72,.65,.06,'#557fa2');label(additions,side*4.8,3,-151.15,.66,.5,'横断歩道','#557fa2','#fff8e8');}
 box(additions,0,-.035,-220,100,.08,8,'#626f70');box(additions,-1.72,.02,-213,3.1,.025,.4,'#f2eddf');
 const corner=new THREE.Group();corner.name='arcade-corner';box(corner,6,2.25,-211.8,4.8,4.5,7.6,'#d9d2c1');box(corner,6,4.55,-211.8,5,.15,7.8,'#8d9b94');for(let z=-214;z<=-209;z+=2)box(corner,3.57,2.8,z,.04,1.2,1.1,'#819fa7');
 const sign=new THREE.Group();stopSign(sign,true);sign.position.z=-120;corner.add(sign);w.scene.add(corner);w.scene.add(compact(additions));
 const adult=makeAdult(),bike=makeBicycle();w.scene.add(adult,bike);w.actors=[w.child,adult,bike];w.targets=[w.van,...w.actors,corner];w.occluders.push(adult,bike,corner);w.shadows=[w.actorShadow,contactShadow(w.scene,.9,1.1,true),contactShadow(w.scene,2,.9,true)];
 const sparkMaterial=new THREE.MeshBasicMaterial({color:'#ffe3a0'});w.sparks=w.actors.map(()=>{const g=new THREE.Group();for(let j=0;j<7;j++){const star=mesh(g,new THREE.OctahedronGeometry(.09,0),sparkMaterial);star.userData.angle=j*Math.PI*2/7;}w.scene.add(g);g.visible=false;return g;});return w;
}
export function updateIntegratedWorld(w,d,options={}){
 w.index=0;updateWorld(w,{...d,scene:{hazard:88},speed:d.speed,eventTime:null,actorX:-5.05,actorClear:false,detected:null},options);w.index=3;
 d.actors.forEach((a,i)=>{const actor=w.actors[i],flight=a.hit?d.time-a.hit.at:null;actor.visible=!a.passed||flight!==null&&flight<2.5;actor.rotation.set(0,i===2?Math.PI:-Math.PI/2,0);actor.position.set(a.x,0,-a.z);
  if(flight!==null){const t=Math.min(flight,2.5);actor.position.set(a.hit.x+t*2.2,Math.max(0,6*t-2.8*t*t),-a.z-t*5);actor.rotation.z=t*3.2;actor.rotation.x=t*2.1;}
  else if(i<2){const gait=a.started===null?0:Math.sin(a.elapsed*8)*.42;actor.userData.legs.forEach((l,k)=>{l.rotation.x=k?gait:-gait;l.userData.knee.rotation.x=-Math.max(0,k?-gait:gait)*.9;});actor.userData.arms.forEach((arm,k)=>arm.rotation.x=k?-gait*.7:gait*.7);}
  else {actor.userData.wheels.forEach(wh=>wh.rotation.z=-a.elapsed*5);actor.userData.crank.rotation.z=-a.elapsed*5;actor.userData.rider.userData.legs.forEach((l,k)=>{l.rotation.x=-.25+Math.sin(a.elapsed*5+k*Math.PI)*.3;l.userData.knee.rotation.x=.65;});}
  if(i<2){posePedestrian(actor,{elapsed:a.started===null?null:a.elapsed,time:d.time,flight,impactSpeed:a.hit?.speed});actor.position.z=-(a.currentZ??a.z);
   if(flight!==null){const t=Math.min(flight,2.5),power=Math.min(a.hit.speed/35,1.4);actor.position.set(a.hit.x+t*(1+power),Math.max(0,5*t-3.4*t*t),-(a.hit.z??a.z)-t*(2+power*2));}
   else actor.position.y=Math.abs(a.x)>3.6?.13:0;
  }
  if(i===2)poseCyclist(actor,{travel:Math.max(0,5.3-a.x),time:d.time,flight,impactSpeed:a.hit?.speed});
  const shadow=w.shadows[i];if(shadow){shadow.position.set(actor.position.x,.027,actor.position.z);shadow.visible=actor.visible&&Math.abs(actor.position.x)<3.5;shadow.material.opacity=1/(1+actor.position.y);}
  const sparks=w.sparks[i];sparks.visible=flight!==null&&flight<.6;sparks.position.set(a.hit?.x||0,1.2,-a.z);sparks.children.forEach(p=>{const t=flight||0,angle=p.userData.angle;p.position.set(Math.cos(angle)*t*3,Math.sin(angle)*t*3,t);p.scale.setScalar(Math.max(.1,1-t));});
 });w.scene.updateMatrixWorld(true);
}
