import * as T from './vendor/three.module.min.js';

const TAU=Math.PI*2;
const BODY_SCALE=new T.Vector3(1.38,1.25,1.62);

// Keep the Kenney body silhouette and separate its baked palette into physical surfaces.
export function sedanSurface(color,center){
 const [r,g,b]=color;
 if(center.y>.79&&b>.85&&r<.94&&g>r)return 'glass';
 if(center.z>1.04&&r>.9&&g>.4&&b<.15)return 'headlight';
 if(center.z<-1.23&&r>.4&&g<.085&&b<.085)return 'tail';
 if(r>.3&&r>g*2&&r>b*2)return 'paint';
 if(r>.5&&Math.abs(r-g)<.12)return 'plate';
 return 'trim';
}

function softenNormals(geometry){
 geometry.computeVertexNormals();const p=geometry.attributes.position,n=geometry.attributes.normal,shared=new Map();
 for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>v.toFixed(5)).join(',');const list=shared.get(key)||[];list.push(i);shared.set(key,list);}
 const result=n.array.slice();
 for(const indices of shared.values())for(const i of indices){const original=new T.Vector3().fromBufferAttribute(n,i),sum=new T.Vector3();for(const j of indices){const other=new T.Vector3().fromBufferAttribute(n,j);if(original.dot(other)>.72)sum.add(other);}sum.normalize();result.set(sum.toArray(),i*3);}
 geometry.setAttribute('normal',new T.BufferAttribute(result,3));return geometry;
}

function geometryFrom(positions,smooth=false){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.computeVertexNormals();if(smooth)softenNormals(g);g.computeBoundingSphere();return g;}

export function createDetailedSedan(parts){
 const root=new T.Group();root.name='detailed-sedan';root.rotation.y=Math.PI;root.position.y=.145;
 const materials={
  paint:new T.MeshPhysicalMaterial({color:0xc65b35,roughness:.28,metalness:.32,clearcoat:.9,clearcoatRoughness:.13,envMapIntensity:.9}),
  glass:new T.MeshPhysicalMaterial({color:0x334e58,roughness:.08,metalness:.12,clearcoat:1,clearcoatRoughness:.07,envMapIntensity:1.25}),
  trim:new T.MeshStandardMaterial({color:0x272e30,roughness:.78}),
  rubber:new T.MeshStandardMaterial({color:0x202427,roughness:.94}),
  chrome:new T.MeshStandardMaterial({color:0xb0b8bc,metalness:.85,roughness:.23}),
  mirror:new T.MeshStandardMaterial({color:0xc5d1d4,metalness:1,roughness:.06,envMapIntensity:1.3}),
  darkMetal:new T.MeshStandardMaterial({color:0x555c60,metalness:.68,roughness:.48}),
  headlight:new T.MeshPhysicalMaterial({color:0xe7eff0,roughness:.12,metalness:.2,clearcoat:1,emissive:0xc9e3e8,emissiveIntensity:.2}),
  tail:new T.MeshPhysicalMaterial({color:0x8c1820,roughness:.2,clearcoat:1,emissive:0xb71b16,emissiveIntensity:.16}),
  brake:new T.MeshPhysicalMaterial({color:0xd6382e,roughness:.2,clearcoat:1,emissive:0xff2c17,emissiveIntensity:1.25}),
  reverse:new T.MeshStandardMaterial({color:0xd9dfdf,roughness:.2,emissive:0xe7f1e8,emissiveIntensity:.03}),
  reverseOn:new T.MeshStandardMaterial({color:0xf0f5ed,roughness:.2,emissive:0xedffed,emissiveIntensity:.8}),
  amber:new T.MeshStandardMaterial({color:0xdc8a27,roughness:.25}),
  plate:new T.MeshStandardMaterial({color:0xe6e5da,roughness:.65})
 };
 // A tiny repeatable normal map supplies tread grooves without extra wheel draw calls.
 const texSize=64,normalData=new Uint8Array(texSize*texSize*4);
 function tread(u,v){const groove=[.37,.5,.63].reduce((s,c)=>s+Math.exp(-Math.pow((v-c)/.013,2)),0),shoulder=Math.abs(v-.5)>.28?0:Math.pow(Math.sin(u*Math.PI*16+v*5),16)*.3;return -groove-shoulder;}
 for(let y=0;y<texSize;y++)for(let x=0;x<texSize;x++){const u=x/texSize,v=y/texSize,n=new T.Vector3(-(tread(u+.008,v)-tread(u-.008,v))*.65,-(tread(u,v+.008)-tread(u,v-.008))*.65,1).normalize(),i=(y*texSize+x)*4;normalData[i]=Math.round((n.x*.5+.5)*255);normalData[i+1]=Math.round((n.y*.5+.5)*255);normalData[i+2]=Math.round((n.z*.5+.5)*255);normalData[i+3]=255;}
 const treadMap=new T.DataTexture(normalData,texSize,texSize);treadMap.wrapS=treadMap.wrapT=T.RepeatWrapping;treadMap.magFilter=T.LinearFilter;treadMap.needsUpdate=true;materials.rubber.normalMap=treadMap;materials.rubber.normalScale.set(.45,.45);
 const batches=new Map(),lamps=[],reverseLamps=[],wheels=[],rollers=[];
 function queue(g,key,transform=new T.Matrix4()){
  const source=g.index?g.toNonIndexed():g;source.applyMatrix4(transform);const a=batches.get(key)||[];a.push(source);batches.set(key,a);if(source!==g)g.dispose();
 }
 function box(x,y,z,w,h,d,key,ry=0){const matrix=new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),ry),new T.Vector3(1,1,1));queue(new T.BoxGeometry(w,h,d),key,matrix);}
 function tube(points,radius,key){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),false,'centripetal');queue(new T.TubeGeometry(curve,Math.max(1,points.length-1)*3,radius,6,false),key);}
 function pane(points,key='glass'){
  const p=points.flat(),g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();queue(g,key);
 }
 const body=parts.find(p=>p.name==='body');if(!body)throw new Error('Sedan body missing');
 const p=body.geo.attributes.position,c=body.geo.attributes.color,classified=new Map();
 for(let i=0;i<p.count;i+=3){const center=new T.Vector3(),color=[0,0,0],positions=[];for(let j=0;j<3;j++){const v=new T.Vector3().fromBufferAttribute(p,i+j);center.add(v);positions.push(...v.multiply(BODY_SCALE).toArray());color[0]+=c.getX(i+j)/3;color[1]+=c.getY(i+j)/3;color[2]+=c.getZ(i+j)/3;}center.multiplyScalar(1/3);const key=sedanSurface(color,center),a=classified.get(key)||[];a.push(...positions);classified.set(key,a);}
 for(const [key,positions]of classified)queue(geometryFrom(positions,key==='paint'),key);
 // Door seams, handles, window seals and mirror faces remain within the original width.
 for(const side of [-1,1]){
  const x=side*.765;
  tube([[x,.73,-.93],[x,1.0,-.93],[side*.65,1.51,-.8]],.009,'trim');
  tube([[x,.72,-.27],[x,1.0,-.27],[side*.65,1.5,-.27]],.008,'trim');
  tube([[x,.72,.72],[x,1.0,.72]],.008,'trim');
  for(const z of [-.59,.34]){box(side*.778,.91,z,.045,.047,.19,'chrome');box(side*.765,.9,z,.018,.08,.23,'trim');}
  tube([[side*.78,.56,-.83],[side*.78,.56,.83]],.025,'trim');
  // Rear quarter glazing sits over the original solid rear pillar panel.
  let rear=[[side*.759,1.03,-.83],[side*.759,1.03,-.32],[side*.658,1.49,-.32],[side*.658,1.49,-.76]];
  if(side>0)rear=rear.reverse();pane(rear);tube([...rear,rear[0]],.012,'trim');
  const mirror=[[side*.84,.9,.518],[side*1.0,.9,.518],[side*1.0,.98,.518],[side*.84,.98,.518]];pane(side>0?mirror.reverse():mirror,'mirror');
 }
 // Bonnet creases and restrained grille details give the nose a readable shape.
 for(const side of [-1,1])tube([[side*.47,1.005,.91],[side*.51,.98,1.55],[side*.47,.91,1.85]],.007,'paint');
 box(0,.65,2.029,.64,.18,.024,'trim');for(const y of [.6,.65,.7])box(0,y,2.048,.59,.014,.015,'chrome');
 box(0,.47,2.052,1.22,.065,.04,'trim');box(0,.48,-2.115,1.2,.065,.035,'trim');
 // Layered lamp lenses, internal projector bowls and fine strips; no dynamic light sources.
 for(const side of [-1,1]){
  const x=side*.59;box(x,.815,1.895,.31,.155,.055,'chrome');
  const projector=new T.CylinderGeometry(.052,.043,.025,16);projector.rotateX(Math.PI/2);queue(projector,'headlight',new T.Matrix4().makeTranslation(x,.815,1.935));
  box(x,.775,1.936,.29,.018,.012,'headlight');box(side*.754,.82,1.83,.026,.075,.12,'amber');
  for(let i=0;i<4;i++)box(side*(.48+i*.065),.817,-2.035,.012,.1,.012,'chrome');
  box(side*.53,.73,-2.047,.15,.043,.025,'reverse');
 }
 // Bumpers and plate recesses use separate matte and metallic finishes.
 for(const z of [-2.114,2.045]){box(0,.375,z,.46,.2,.015,'trim');box(0,.375,z+Math.sign(z)*.011,.405,.155,.015,'plate');for(const x of [-.16,.16])box(x,.426,z+Math.sign(z)*.023,.013,.013,.008,'chrome');}
 box(0,1.14,-1.151,.32,.025,.025,'tail');
 // Wipers and rear demister follow the sloped glass rather than floating above it.
 for(const dx of [-.2,.25])tube([[dx,1.016,.886],[dx-.17,1.095,.815],[dx-.35,1.1,.81]],.008,'trim');
 for(let row=0;row<5;row++){const t=.15+row*.14,y=1.116+t*.393,z=-1.155+t*.204,w=.49-t*.065;box(0,y,z-.008,w*2,.004,.006,'darkMetal');}
 // Merge stationary details by finish, including lamps so their state switches together.
 for(const [key,geometries]of batches){
  const g=new T.BufferGeometry();for(const name of ['position','normal']){const length=geometries.reduce((n,g)=>n+g.attributes[name].array.length,0),a=new Float32Array(length);let offset=0;for(const source of geometries){a.set(source.attributes[name].array,offset);offset+=source.attributes[name].array.length;}g.setAttribute(name,new T.BufferAttribute(a,3));}g.computeBoundingSphere();
  const mesh=new T.Mesh(g,materials[key]);mesh.name='car-'+key;mesh.receiveShadow=true;root.add(mesh);
  if(key==='tail'){mesh.userData.brakeOff=materials.tail;mesh.userData.brakeOn=materials.brake;lamps.push(mesh);}
  if(key==='reverse')reverseLamps.push(mesh);
  geometries.forEach(g=>g.dispose());
 }
 // Round, properly proportioned tyres replace the non-uniformly scaled source wheels.
 const profile=[[-.1,.215],[-.119,.265],[-.112,.327],[-.082,.369],[-.05,.375],[.05,.375],[.082,.369],[.112,.327],[.119,.265],[.1,.215]].map(([x,r])=>new T.Vector2(r,x));
 const tireGeometry=new T.LatheGeometry(profile,32);tireGeometry.rotateZ(Math.PI/2);
 const rimGeometry=new T.TorusGeometry(.225,.018,6,24);rimGeometry.rotateY(Math.PI/2);
 const discGeometry=new T.CylinderGeometry(.196,.196,.016,24);discGeometry.rotateZ(Math.PI/2);
 // Spokes, lug nuts and circumferential grooves are merged once and reused by all four wheels.
 function wheelParts(side){
  const group=new T.Group(),small=[];
  const tire=new T.Mesh(tireGeometry,materials.rubber);tire.name='tyre';group.add(tire);
  const rim=new T.Mesh(rimGeometry,materials.chrome);rim.position.x=side*.119;group.add(rim);
  const disc=new T.Mesh(discGeometry,materials.darkMetal);disc.position.x=side*.095;group.add(disc);
  for(let i=0;i<5;i++){const a=i*TAU/5;const g=new T.BoxGeometry(.027,.15,.035);g.translate(side*.123,.13,0);g.rotateX(a);small.push(g.toNonIndexed());}
  const hub=new T.CylinderGeometry(.065,.065,.035,16);hub.rotateZ(Math.PI/2);hub.translate(side*.125,0,0);small.push(hub.toNonIndexed());
  const merged=new T.BufferGeometry();for(const name of ['position','normal']){const a=new Float32Array(small.reduce((n,g)=>n+g.attributes[name].array.length,0));let at=0;for(const g of small){a.set(g.attributes[name].array,at);at+=g.attributes[name].array.length;}merged.setAttribute(name,new T.BufferAttribute(a,3));}small.forEach(g=>g.dispose());group.add(new T.Mesh(merged,materials.chrome));
  return group;
 }
 for(const side of [-1,1])for(const z of [-1.0692,1.0692]){const steer=new T.Group();steer.position.set(side*.81,.375,z);const roll=wheelParts(side);steer.add(roll);root.add(steer);if(z>0)wheels.push(steer);rollers.push(roll);}
 root.userData.vehicle={rollers,reverseLamps,materials,radius:.375,spin:0};
 root.userData.source='Kenney Car Kit sedan; separated finishes and original detail geometry';
 return {root,wheels,lamps,materials};
}

export function updateDetailedCar(car,{v=0,gear=1},dt){
 const state=car.userData.vehicle;if(!state)return;
 const delta=Number.isFinite(dt)?Math.max(0,Math.min(dt,.25)):0;
 state.spin=(state.spin+v*delta/state.radius)%TAU;for(const wheel of state.rollers)wheel.rotation.x=state.spin;
 for(const lamp of state.reverseLamps)lamp.material=gear<0?state.materials.reverseOn:state.materials.reverse;
}
