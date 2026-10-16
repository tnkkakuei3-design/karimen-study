import * as T from './vendor/three.module.min.js';
// Local +Z is the entrance. Shared material batches keep this prototype to eight draw calls.
export function createDetailedHouse(b){
 const group=new T.Group();group.name='detailed-house';group.position.set(b.x,0,b.z);group.rotation.y=Math.PI/2;
 const material=(color,roughness=.85)=>new T.MeshStandardMaterial({color,roughness});
 const materials={wall:material(0xf2eee3),roof:material(0xb8b1a4),trim:material(0xdedbd1),metal:material(0x666d6b,.4),wood:material(0x625448),concrete:material(0xaaa99f),glass:new T.MeshStandardMaterial({color:0x8da7ae,roughness:.17,metalness:.25,envMapIntensity:.8}),dark:material(0x35403e)};
 const batches=new Map(),matrix=new T.Matrix4(),q=new T.Quaternion();
 function add(geometry,key,x,y,z,rotation=0){
  const g=geometry.index?geometry.toNonIndexed():geometry;
  q.setFromAxisAngle(new T.Vector3(0,0,1),rotation);matrix.compose(new T.Vector3(x,y,z),q,new T.Vector3(1,1,1));g.applyMatrix4(matrix);
  const batch=batches.get(key)||{position:[],normal:[],uv:[]};for(const name of ['position','normal','uv'])batch[name].push(...g.attributes[name].array);batches.set(key,batch);g.dispose();if(g!==geometry)geometry.dispose();
 }
 function box(x,y,z,w,h,d,key,rotation=0){
  const g=new T.BoxGeometry(w,h,d),uv=g.attributes.uv;
  // Physical-scale UVs: the same photographic grain size on every face.
  for(let face=0;face<6;face++){const sx=face<2?d:w,sy=(face===2||face===3)?d:h;for(let j=0;j<4;j++){const i=face*4+j;uv.setXY(i,uv.getX(i)*sx/2.5,uv.getY(i)*sy/2.5);}}
  add(g,key,x,y,z,rotation);
 }
 box(0,.32,0,14.6,.6,12.6,'concrete');
 // Recessed entrance: the ground-floor facade is open around the inset door.
 box(0,3.5,-.65,14,6.3,10.7,'wall');box(-4.15,1.95,5.35,5.7,3.2,1.3,'wall');box(4.15,1.95,5.35,5.7,3.2,1.3,'wall');box(0,5.1,5.35,14,3.1,1.3,'wall');
 box(0,1.8,4.73,1.45,2.9,.12,'wood');box(.5,1.7,4.83,.05,.55,.08,'metal');box(-.4,2,4.81,.22,1.3,.04,'glass');
 box(0,.48,6.1,2.8,.22,3,'concrete');box(0,.28,7.7,3.4,.18,1,'concrete');box(0,.24,11.3,3.4,.06,6.4,'concrete');
 box(0,3.52,6.25,3.4,.18,2,'metal');box(1.53,2.2,6.08,.2,.32,.12,'dark');box(1.53,2.2,6.16,.12,.18,.04,'trim');
 // Eaves and separate pitched roof planes, with outward-facing box normals.
 box(0,6.68,0,15.3,.2,13.4,'trim');
 const angle=Math.atan2(2.6,7.65),slope=Math.hypot(7.65,2.6);
 for(const sign of [-1,1])box(sign*3.825,8.05,0,slope,.18,13.5,'roof',-sign*angle);
 box(0,9.37,0,.28,.23,13.6,'metal');
 // Gable infill closes both ends of the roof without a floating triangular gap.
 for(const z of [-6,6]){
  const g=new T.BufferGeometry(),p=[-7,6.78,z,7,6.78,z,0,9.15,z];if(z<0){p.splice(0,9,7,6.78,z,-7,6.78,z,0,9.15,z);}
  g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute([0,0,5.6,0,2.8,.95],2));g.computeVertexNormals();add(g,'wall',0,0,0);
 }
 for(const sign of [-1,1]){
  box(sign*7.65,6.65,0,.18,.2,13.5,'metal');
  for(const z of [-5.7,5.7]){box(sign*7.2,3.5,z,.12,6.2,.12,'metal');box(sign*7.43,6.55,z,.55,.12,.12,'metal');box(sign*7.2,.45,z+.18,.12,.12,.45,'metal');}
 }
 function window(x,y,z,w,h,turn=0){
  // Transform the small facade components for side and rear elevations.
  function part(dx,dy,dz,pw,ph,pd,key){const c=Math.cos(turn),s=Math.sin(turn);box(x+dx*c+dz*s,y+dy,z-dx*s+dz*c,Math.abs(c)*pw+Math.abs(s)*pd,ph,Math.abs(c)*pd+Math.abs(s)*pw,key);}
  part(0,0,.04,w+.2,h+.2,.16,'dark');part(0,0,.14,w,h,.06,'glass');
  for(const dx of [-w/2,0,w/2])part(dx,0,.22,.065,h+.12,.09,'metal');for(const dy of [-h/2,h/2])part(0,dy,.22,w+.12,.065,.09,'metal');
  part(0,-h/2-.12,.25,w+.35,.12,.42,'trim');part(0,h/2+.2,.3,w+.4,.1,.7,'metal');
  // Subtle interior blinds behind the outer frame.
  for(const dx of [-w*.34,w*.34])part(dx,0,.18,.22,h-.15,.025,'trim');
 }
 for(const x of [-4.4,4.4])for(const y of [2,5.05])window(x,y,6.02,2.5,1.65);
 window(0,5.05,6.02,1.6,1.65);
 for(const side of [-1,1])for(const z of [-3,2])for(const y of [2,5.05])window(side*7.02,y,z,1.7,1.45,side*Math.PI/2);
 for(const x of [-4,3.5])for(const y of [2,5.05])window(x,y,-6.02,1.8,1.4,Math.PI);
 // Foundation vents, siding joint, roof-edge fascia, and outdoor compressor.
 for(const x of [-5,-2,2,5])box(x,.45,6.32,.5,.15,.035,'dark');
 box(0,3.55,6.05,14,.12,.12,'trim');box(-5,.9,-6.5,1.4,1,.55,'trim');for(let i=0;i<6;i++)box(-5,.58+i*.12,-6.79,1.1,.035,.03,'metal');
 for(const [key,attrs]of batches){const g=new T.BufferGeometry();for(const [name,data]of Object.entries(attrs))g.setAttribute(name,new T.Float32BufferAttribute(data,name==='uv'?2:3));g.computeBoundingSphere();const mesh=new T.Mesh(g,materials[key]);mesh.name='house-'+key;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}
 return {group,materials};
}
export async function loadHouseTextures(materials,anisotropy=1){
 const base=new URL('./assets/external/',import.meta.url),loader=new T.TextureLoader();
 return Promise.allSettled([['wall','map','plaster.webp'],['wall','normalMap','house-wall-normal.webp'],['roof','map','house-roof.webp'],['roof','normalMap','house-roof-normal.webp']].map(async([key,slot,file])=>{
  const t=await loader.loadAsync(new URL(file,base).href);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=anisotropy;if(slot==='map')t.colorSpace=T.SRGBColorSpace;
  materials[key][slot]=t;materials[key].normalScale.set(.35,.35);materials[key].needsUpdate=true;return file;
 }));
}
