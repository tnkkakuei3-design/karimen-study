import * as T from './vendor/three.module.min.js';
import {STREET_PROPS,BUILDINGS} from './free-model.mjs?v=houses1';
// Six west-facing shopfronts on the central street. All dimensions are metres.
export const SHOPS=[
 {z:-90,door:3.8,window:-3,windowW:5.6,roof:'tile',canopy:12,name:'みなと食堂',sub:'定食・沖縄そば',color:0x925044},
 {z:-60,door:-4.6,window:2.8,windowW:8,roof:'gable',canopy:15,name:'まちのパン屋',sub:'焼きたてのパン',color:0xb29152},
 {z:-30,door:0,window:5,windowW:4,roof:'flat',canopy:17,name:'青空青果店',sub:'野菜とくだもの',color:0x577862},
 {z:30,door:4.8,window:-2.8,windowW:7.6,roof:'clerestory',canopy:11,name:'喫茶 なぎさ',sub:'珈琲と軽食',color:0x4d7180},
 {z:60,door:-5,window:2,windowW:9,roof:'stepped',canopy:14,name:'ひかり書店',sub:'本と文房具',color:0x776959},
 {z:90,door:0,window:-5,windowW:4.2,roof:'parapet',canopy:9,name:'まるい商店',sub:'日用品・飲みもの',color:0x597684}
];
export function addShopBlock({scene,box,mat,anisotropy=1}){
 const atlas=document.createElement('canvas');atlas.width=1024;atlas.height=1024;
 const ctx=atlas.getContext('2d');ctx.scale(2,2);ctx.fillStyle='#f4efdf';ctx.fillRect(0,0,512,512);
 SHOPS.forEach((s,i)=>{const y=i*80;ctx.fillStyle='#'+s.color.toString(16).padStart(6,'0');ctx.fillRect(0,y,512,76);ctx.fillStyle='#fff9e8';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 32px sans-serif';ctx.fillText(s.name,256,y+25);ctx.font='15px sans-serif';ctx.fillText(s.sub,256,y+57);});
 const texture=new T.CanvasTexture(atlas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=anisotropy;
 const signMat=new T.MeshLambertMaterial({map:texture});
 for(let i=0;i<SHOPS.length;i++){
  const s=SHOPS[i],z=s.z;
  // Setback pavement, step, glazed door, display window, recessed shutters.
  box(15.5,.18,z,11,.12,20,0xc8c2ae);box(20.7,.35,z,1,.35,17,0xb5b2a6);
  box(20.91,1.9,z, .16,3.1,16,0x424e4c);
  box(20.78,1.85,z+s.door,.08,2.7,i===2?3.4:2,0x9fb5b3);box(20.68,1.9,z+s.door,.08,3,.12,0xe4ded1);
  box(20.74,1.8,z+s.window,.08,2.35,s.windowW,0x8ea9ab);
  for(let j=-s.windowW/2;j<=s.windowW/2+.01;j+=s.windowW/(i===4?4:2))box(20.65,1.8,z+s.window+j,.12,2.5,.12,0xe4ded1);
  box(20.6,.62,z+s.window,.15,.25,s.windowW+.3,0xe4ded1);
  if(i===0)for(const j of [-.7,0,.7])box(20.5,2.65,z+s.door+j,.08,.65,.6,s.color); // noren
  if(i===2)for(const j of [-5,-3]){box(20.4,.65,z+j,.6,1,1.6,0xb29152);box(20.35,1.25,z+j,.7,.25,1.5,0x577862);}
  if(i===4)for(let j=-1;j<=5;j+=1)box(20.6,1.1,z+j,.1,.6,.5,[0x925044,0xb29152,0x577862][(j+1)%3]);
  if(i===5){box(20.7,1.8,z+5,.1,2.8,4,0x9c9e93);for(let y=.55;y<3.1;y+=.22)box(20.6,y,z+5,.1,.035,4,0x697777);}
  const roofY=BUILDINGS.find(b=>b.x===30&&b.z===z).h;
  if(s.roof==='tile'||s.roof==='gable'){
   const shape=new T.Shape();shape.moveTo(-9.6,0);shape.lineTo(9.6,0);shape.lineTo(0,s.roof==='tile'?2:3.6);shape.closePath();
   const roof=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:19.2,bevelEnabled:false,steps:1,curveSegments:1}),mat(s.roof==='tile'?0x925044:0x776959));
   roof.rotation.y=Math.PI/2;roof.position.set(20.4,roofY,z);roof.castShadow=true;roof.receiveShadow=true;scene.add(roof);
  }else{
   box(30,roofY+.2,z,19.2,.4,19.2,0x697777);
   if(s.roof==='clerestory'){box(30,roofY+1.1,z,10,1.5,12,0x8ea9ab);box(30,roofY+1.9,z,11,.25,13,0x697777);}
   if(s.roof==='stepped'){box(21,roofY+.9,z,.4,1.8,14,s.color);box(21,roofY+2,z,.4,.6,7,s.color);}
   if(s.roof==='parapet')for(const dz of [-9,9])box(30,roofY+.8,z+dz,18,1.2,.35,0xe4ded1);
  }
  // Signboard and projecting canopy give the facades depth.
  box(20.58,3.65,z,.3,1.05,16.4,0xe4ded1);
  const geo=new T.PlaneGeometry(15.8,.92),uv=geo.attributes.uv;
  for(let k=0;k<uv.count;k++)uv.setY(k,1-(i*80+(1-uv.getY(k))*76)/512);
  const sign=new T.Mesh(geo,signMat);sign.rotation.y=-Math.PI/2;sign.position.set(20.4,3.65,z);scene.add(sign);
  box(19.6,3.08,z,2.3,.18,s.canopy,s.color);box(18.5,2.87,z,.13,.42,s.canopy,s.color);
  for(let j=-s.canopy/2+.6;j<s.canopy/2;j+=2)box(19.6,3.18,z+j,2.3,.03,.55,0xe4ded1);
  // Upper floor balconies and AC units use a shared material palette.
  box(20.4,5.25,z,1.4,.15,13,0x697777);box(19.75,5.8,z,.09,1.1,13,0x697777);
  for(let j=-6;j<=6;j+=1.5)box(19.75,5.8,z+j,.1,1.1,.07,0xe4ded1);
  box(20.3,4.6,z+7,.8,.7,1.2,0xe4ded1);
  for(let j=0;j<5;j++)box(19.88,4.38+j*.1,z+7,.03,.03,1,0x697777);
 }
 // Utility poles and warm street lamps; poles are part of the box instance batches.
 const points=[];
 for(const z of [-104,-64,-24,24,64,104]){
  box(10.5,4.7,z,.28,9.4,.28,0x697777);box(10.5,8.4,z,3.2,.14,.14,0x697777);
  for(const x of [9.3,10.5,11.7])box(x,8.65,z,.16,.35,.16,0xe4ded1);
  box(-10.5,2.8,z,.16,5.6,.16,0x424e4c);box(-9.6,5.5,z,1.9,.12,.12,0x424e4c);box(-8.8,5.4,z,.65,.12,.4,0xf0dba1);
 }
 const zs=[-104,-64,-24,24,64,104];for(let i=0;i<zs.length-1;i++)for(const x of [9.3,10.5,11.7]){
  for(let j=0;j<12;j++){const a=j/12,b=(j+1)/12;points.push(x,8.85-Math.sin(a*Math.PI)*.6,zs[i]+(zs[i+1]-zs[i])*a,x,8.85-Math.sin(b*Math.PI)*.6,zs[i]+(zs[i+1]-zs[i])*b);}
 }
 const wires=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(points,3)),new T.LineBasicMaterial({color:0x39494e}));scene.add(wires);
 for(const p of STREET_PROPS.slice(0,2)){
  box(p.x,1.1,p.z,p.w,2.1,p.d,0xe4ded1);box(p.x-.62,1.4,p.z,.04,.95,.78,0x424e4c);
  for(const y of [1.12,1.45,1.78])for(let j=0;j<4;j++)box(p.x-.66,y,p.z-.28+j*.18,.06,.19,.1,[0x925044,0x577862,0xb29152,0x4d7180][j]);
  box(p.x-.65,.48,p.z,.05,.2,.6,0x424e4c);box(p.x-.65,.88,p.z+.34,.05,.17,.09,0xb29152);
 }
 // Convex roadside mirror: a curved low-poly surface, no costly reflection rendering.
 box(-11,1.8,-13,.13,3.6,.13,0xb29152);
 const rim=new T.Mesh(new T.CylinderGeometry(.55,.55,.09,16),mat(0xb29152));rim.rotation.x=Math.PI/2;rim.position.set(-11,3.8,-13);scene.add(rim);
 const mirror=new T.Mesh(new T.SphereGeometry(.47,12,6,0,Math.PI*2,0,Math.PI/2),mat(0x9fb5b3));mirror.rotation.x=Math.PI/2;mirror.position.set(-11,3.8,-12.94);scene.add(mirror);
}
