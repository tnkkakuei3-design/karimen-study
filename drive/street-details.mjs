import * as T from './vendor/three.module.min.js';
import {STOP_APPROACHES,PARKING,STREET_DETAIL_SOLIDS} from './street-details-layout.mjs?v=1';
export function addStreetDetails({scene,box,mat,anisotropy=1}){
 // The cross streets are the priority route; centre lines continue through each junction.
 for(const z of [-120,0,120])box(0,.19,z,292,.025,.15,0xeceae0);
 const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.beginPath();ctx.moveTo(12,26);ctx.lineTo(244,26);ctx.lineTo(128,232);ctx.closePath();ctx.fillStyle='#f6f2e5';ctx.fill();ctx.beginPath();ctx.moveTo(25,34);ctx.lineTo(231,34);ctx.lineTo(128,216);ctx.closePath();ctx.fillStyle='#bb3932';ctx.fill();ctx.fillStyle='#fffaf0';ctx.textAlign='center';ctx.font='bold 44px sans-serif';ctx.fillText('止まれ',128,101);ctx.font='bold 25px sans-serif';ctx.fillText('STOP',128,139);
 const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=anisotropy;
 const face=new T.MeshLambertMaterial({map:texture,transparent:true,alphaTest:.5});
 const signGeometry=new T.PlaneGeometry(1.2,1.2),dummy=new T.Object3D(),signs=new T.InstancedMesh(signGeometry,face,STOP_APPROACHES.length);
 STOP_APPROACHES.forEach((p,i)=>{box(p.lineX,.2,p.lineZ,7.5,.03,.45,0xeceae0);box(p.postX,1.4,p.postZ,.14,2.8,.14,0x697777);dummy.position.set(p.postX,2.8,p.postZ);dummy.rotation.y=p.side===1?0:Math.PI;dummy.updateMatrix();signs.setMatrixAt(i,dummy.matrix);});signs.computeBoundingSphere();scene.add(signs);
 // Low distant land remains outside the driveable boundary and below the fog horizon.
 for(const [x,z,w,h,d]of [[-260,-210,80,22,75],[-285,-90,95,35,90],[-290,65,100,28,80],[-260,230,85,20,90]]){const hill=new T.Mesh(new T.IcosahedronGeometry(1,1),mat(0x78908b));hill.position.set(x,-3,z);hill.scale.set(w,h,d);scene.add(hill);}
 box(PARKING.x,.11,PARKING.z,PARKING.w,.14,PARKING.d,0xbabcb1);box(-14.5,.13,62,9,.12,8,0xbabcb1);
 for(const z of PARKING.stalls){box(-38,.2,z-2.5,10,.025,.11,0xeceae0);}
 box(-38,.2,84.5,10,.025,.11,0xeceae0);box(-43,.2,62,.11,.025,45,0xeceae0);
 for(const p of STREET_DETAIL_SOLIDS.filter(p=>p.kind==='wheel-stop'))box(p.x,.3,p.z,p.w,.28,p.d,0xe4ded1);
 box(-43,1.2,62,.14,2.4,.14,0x697777);
 const pc=document.createElement('canvas');pc.width=256;pc.height=128;const pctx=pc.getContext('2d');pctx.fillStyle='#f6f2e5';pctx.fillRect(0,0,256,128);pctx.fillStyle='#3c6468';pctx.textAlign='center';pctx.font='bold 35px sans-serif';pctx.fillText('月極駐車場',128,54);pctx.font='24px sans-serif';pctx.fillText('P',128,95);const pt=new T.CanvasTexture(pc);pt.colorSpace=T.SRGBColorSpace;pt.anisotropy=anisotropy;const ps=new T.Mesh(new T.PlaneGeometry(3,1.5),new T.MeshLambertMaterial({map:pt}));ps.rotation.y=Math.PI/2;ps.position.set(-43,2.6,62);scene.add(ps);
}
