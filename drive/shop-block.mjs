import * as T from './vendor/three.module.min.js';
import {STREET_PROPS} from './free-model.mjs?v=district1';
// Six west-facing shopfronts on the central street. All dimensions are metres.
export const SHOPS=[
 {z:-90,name:'みなと食堂',sub:'定食・沖縄そば',color:0x925044},
 {z:-60,name:'まちのパン屋',sub:'焼きたてのパン',color:0xb29152},
 {z:-30,name:'青空青果店',sub:'野菜とくだもの',color:0x577862},
 {z:30,name:'喫茶 なぎさ',sub:'珈琲と軽食',color:0x4d7180},
 {z:60,name:'ひかり書店',sub:'本と文房具',color:0x776959},
 {z:90,name:'まるい商店',sub:'日用品・飲みもの',color:0x597684}
];
export function addShopBlock({scene,box,mat}){
 const atlas=document.createElement('canvas');atlas.width=512;atlas.height=512;
 const ctx=atlas.getContext('2d');ctx.fillStyle='#f4efdf';ctx.fillRect(0,0,512,512);
 SHOPS.forEach((s,i)=>{const y=i*80;ctx.fillStyle='#'+s.color.toString(16).padStart(6,'0');ctx.fillRect(0,y,512,76);ctx.fillStyle='#fff9e8';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 32px sans-serif';ctx.fillText(s.name,256,y+25);ctx.font='15px sans-serif';ctx.fillText(s.sub,256,y+57);});
 const texture=new T.CanvasTexture(atlas);texture.colorSpace=T.SRGBColorSpace;
 const signMat=new T.MeshLambertMaterial({map:texture});
 for(let i=0;i<SHOPS.length;i++){
  const s=SHOPS[i],z=s.z;
  // Setback pavement, step, glazed door, display window, recessed shutters.
  box(15.5,.18,z,11,.12,20,0xc8c2ae);box(20.7,.35,z,1,.35,17,0xb5b2a6);
  box(20.91,1.9,z, .16,3.1,16,0x424e4c);
  box(20.78,1.85,z+4,.08,2.7,2,0x9fb5b3);box(20.68,1.9,z+4,.08,3, .12,0xe4ded1);
  box(20.74,1.8,z-2.3,.08,2.35,7.3,0x8ea9ab);
  for(const off of [-5.8,-2.3,1.2])box(20.65,1.8,z+off,.12,2.6,.12,0xe4ded1);
  box(20.6,.75,z-2.3,.15,.3,7.7,0xe4ded1);
  box(20.72,1.85,z-7.1,.1,2.8,1.5,0x9c9e93);
  for(let y=.55;y<3.1;y+=.22)box(20.62,y,z-7.1,.1,.035,1.5,0x697777);
  // Signboard and projecting canopy give the facades depth.
  box(20.58,3.65,z,.3,1.05,16.4,0xe4ded1);
  const geo=new T.PlaneGeometry(15.8,.92),uv=geo.attributes.uv;
  for(let k=0;k<uv.count;k++)uv.setY(k,1-(i*80+(1-uv.getY(k))*76)/512);
  const sign=new T.Mesh(geo,signMat);sign.rotation.y=-Math.PI/2;sign.position.set(20.4,3.65,z);scene.add(sign);
  box(19.6,3.08,z,2.3,.18,16.4,s.color);box(18.5,2.87,z,.13,.42,16.4,s.color);
  for(let j=-7;j<=7;j+=2)box(19.6,3.18,z+j,2.3,.03,.55,0xe4ded1);
  // Upper floor balconies and AC units use a shared material palette.
  box(20.4,5.25,z,1.4,.15,13,0x697777);box(19.75,5.8,z,.09,1.1,13,0x697777);
  for(let j=-6;j<=6;j+=1.5)box(19.75,5.8,z+j,.1,1.1,.07,0xe4ded1);
  box(20.3,4.6,z+7,.8,.7,1.2,0xe4ded1);
  for(let j=0;j<5;j++)box(19.88,4.38+j*.1,z+7,.03,.03,1,0x697777);
 }
 // Curbs and drainage stay outside the sixteen-metre carriageway, with intersection gaps.
 for(const side of [-1,1])for(const [a,b] of [[-108,-14],[14,108]]){
  const z=(a+b)/2,len=b-a;
  box(side*9,.2,z,1.7,.3,len,0xc8c2ae);box(side*8.08,.25,z,.16,.36,len,0xe4ded1);
  box(side*7.8,.15,z,.32,.025,len,0x697777);
  for(let n=a+3;n<b;n+=6){box(side*9,.36,n,1.7,.015,.035,0xb5b2a6);box(side*7.8,.18,n,.32,.025,.55,0x424e4c);}
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
