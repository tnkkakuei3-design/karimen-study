import * as T from './vendor/three.module.min.js';
// Stable lot-based styles keep saved drives and collision footprints unchanged.
const HOUSE_TYPES=[
 {id:'gable',floors:2,roof:'gable',rise:2.6},
 {id:'hip',floors:2,roof:'hip',rise:2.25},
 {id:'setback',floors:2,roof:'shed',rise:1.45},
 {id:'bungalow',floors:1,roof:'cross-gable',rise:1.95}
];
export function houseVariant(b){return HOUSE_TYPES[Math.abs(Math.round((b.lotX??b.x)/30)*7+Math.round((b.lotZ??b.z)/30)*11)%HOUSE_TYPES.length];}
// Local +Z is the entrance. Static components are merged by material.
export function createDetailedHouse(b){
 const group=new T.Group();group.name='detailed-house';group.position.set(b.x,0,b.z);const alongZ=Math.abs(b.lotZ??b.z)===90,sign=alongZ?Math.sign(b.z):Math.sign(b.x),outer=Math.abs(b.lotX??b.x)===90||alongZ,gardenEnd=outer?19:14,mailX=1.9*(alongZ?sign:-sign);group.rotation.y=alongZ?(sign>0?0:Math.PI):sign*Math.PI/2;
 const style=houseVariant(b),eave=style.floors===1?3.65:6.65;group.userData.houseType=style.id;group.userData.floors=style.floors;
 const material=(color,roughness=.85)=>new T.MeshStandardMaterial({color,roughness,envMapIntensity:.65});
 const materials={wall:material(0xdcd9cf,.9),roof:material(0xaab1b4,.86),trim:material(0xbfc2bd,.65),metal:material(0x454e4e,.32),wood:material(0x96806a),concrete:material(0xb4b2a9),leaf:material(0x52654a),leafLight:material(0x6e7e50),glass:new T.MeshStandardMaterial({color:0x94a8ad,roughness:.13,metalness:.12,envMapIntensity:1.05,transparent:true,opacity:.48,depthWrite:false}),dark:material(0x35403e)};
 const batches=new Map(),matrix=new T.Matrix4(),q=new T.Quaternion();
 function add(geometry,key,x,y,z,rotation=0){
  const g=geometry.index?geometry.toNonIndexed():geometry;
  if(typeof rotation==='number')q.setFromAxisAngle(new T.Vector3(0,0,1),rotation);else q.copy(rotation);matrix.compose(new T.Vector3(x,y,z),q,new T.Vector3(1,1,1));g.applyMatrix4(matrix);
  const batch=batches.get(key)||{position:[],normal:[],uv:[]};for(const name of ['position','normal','uv'])batch[name].push(...g.attributes[name].array);batches.set(key,batch);g.dispose();if(g!==geometry)geometry.dispose();
 }
 function box(x,y,z,w,h,d,key,rotation=0){
  const g=new T.BoxGeometry(w,h,d),uv=g.attributes.uv;
  // Physical-scale UVs: the same photographic grain size on every face.
  for(let face=0;face<6;face++){const sx=face<2?d:w,sy=(face===2||face===3)?d:h;for(let j=0;j<4;j++){const i=face*4+j;uv.setXY(i,uv.getX(i)*sx/2.5,uv.getY(i)*sy/2.5);}}
  if(key==='wall'){const pos=g.attributes.position;for(let i=0;i<uv.count;i++){const face=Math.floor(i/4);uv.setXY(i,(face<2?pos.getZ(i)+z:pos.getX(i)+x)/2.5,((face===2||face===3)?pos.getZ(i)+z:pos.getY(i)+y)/2.5);}}
  add(g,key,x,y,z,rotation);
 }
 box(0,.32,0,14.6,.6,12.6,'concrete');
 // Floors have independent envelopes, so the modern house has a real recessed upper floor.
 const floors=[{bottom:.35,top:3.65,w:14,front:6,back:-6,y:2}];
 if(style.floors===2)floors.push({bottom:3.65,top:6.65,w:style.id==='setback'?12.4:14,front:style.id==='setback'?4.2:6,back:-6,y:5.05});
 const frontWindows=[];
 function elevation(f,turn,openings){
  const c=Math.cos(turn),sn=Math.sin(turn),side=Math.abs(sn)>.5,width=side?f.front-f.back:f.w,extent=width/2,offset=side?f.w/2:(c>0?f.front:-f.back),shiftZ=side?(f.front+f.back)/2:0,thickness=turn===0?1.3:.2;
  const xs=[...new Set([-extent,extent,...openings.flatMap(o=>[o.x-o.w/2,o.x+o.w/2])])].sort((a,b)=>a-b),ys=[...new Set([f.bottom,f.top,...openings.flatMap(o=>[o.y-o.h/2,o.y+o.h/2])])].sort((a,b)=>a-b);
  for(let i=1;i<xs.length;i++)for(let j=1;j<ys.length;j++){
   const x=(xs[i]+xs[i-1])/2,y=(ys[j]+ys[j-1])/2;if(openings.some(o=>Math.abs(x-o.x)<o.w/2&&Math.abs(y-o.y)<o.h/2))continue;
   box(x*c+(offset-thickness/2)*sn,y,-x*sn+(offset-thickness/2)*c+shiftZ,Math.abs(c)*(xs[i]-xs[i-1])+Math.abs(sn)*thickness,ys[j]-ys[j-1],Math.abs(c)*thickness+Math.abs(sn)*(xs[i]-xs[i-1]),'wall');
  }
  for(const o of openings){if(o.door)continue;window(o.x*c+(offset-.2)*sn,o.y,-o.x*sn+(offset-.2)*c+shiftZ,o.w-.2,o.h-.2,turn);if(turn===0)frontWindows.push({x:o.x,y:o.y,z:f.front,w:o.w});}
 }
 for(const [index,f]of floors.entries()){
  box(0,(f.bottom+f.top)/2,(f.front+f.back)/2-.6,f.w-.4,f.top-f.bottom,f.front-f.back-1.8,'dark');
  const spacing=style.id==='setback'&&index===1?3.7:4.4;
  const front=[...[-spacing,spacing].map(x=>({x,y:f.y,w:2.7,h:1.85}))];
  if(index===0)front.push({x:0,y:1.95,w:2.6,h:3.2,door:true});else if(style.id!=='setback')front.push({x:0,y:f.y,w:1.8,h:1.85});
  elevation(f,0,front);
  for(const side of [-1,1])elevation(f,side*Math.PI/2,[-3,style.id==='setback'&&index===1?1:2].map(z=>({x:-side*(z-(f.front+f.back)/2),y:f.y,w:1.9,h:1.65})));
  elevation(f,Math.PI,[-4,3.5].map(x=>({x:-x,y:f.y,w:2,h:1.6})));
 }
 box(0,1.8,4.73,1.45,2.9,.12,'wood');box(.5,1.7,4.83,.05,.55,.08,'metal');box(-.4,2,4.81,.22,1.3,.04,'glass');
 box(0,.48,6.1,2.8,.22,3,'concrete');box(0,.28,7.7,3.4,.18,1,'concrete');
 box(0,3.52,6.25,3.4,.18,2,'metal');box(1.53,2.2,6.08,.2,.32,.12,'dark');box(1.53,2.2,6.16,.12,.18,.04,'trim');
 // Roof planes have real thickness and outward normals; hips and setbacks change the skyline.
 function surface(points,key,normal){
  const vertices=points.map(p=>new T.Vector3(...p));
  if(normal&&new T.Vector3().subVectors(vertices[1],vertices[0]).cross(new T.Vector3().subVectors(vertices[2],vertices[0])).dot(new T.Vector3(...normal))<0)vertices.reverse();
  const sideWall=key==='wall'&&Math.abs(normal?.[0]??0)>.5;
  const p=[],uv=[];for(let i=1;i<vertices.length-1;i++)for(const v of [vertices[0],vertices[i],vertices[i+1]]){p.push(v.x,v.y,v.z);uv.push((sideWall?v.z:v.x)/2.5,(key==='wall'?v.y:v.z)/2.5);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();add(g,key,0,0,0);
 }
 function beam(a,b,width,depth,key){const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start),rotation=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize()),mid=start.add(end).multiplyScalar(.5);add(new T.BoxGeometry(width,delta.length(),depth),key,mid.x,mid.y,mid.z,rotation);}
 function roofPanel(points){const center=points.reduce((sum,p)=>sum.add(new T.Vector3(...p)),new T.Vector3()).multiplyScalar(1/points.length);surface(points,'roof',[0,1,0]);surface(points.map(([x,y,z])=>[x,y-.14,z]),'wood',[0,-1,0]);for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];surface([a,b,[b[0],b[1]-.14,b[2]],[a[0],a[1]-.14,a[2]]],'roof',[(a[0]+b[0])/2-center.x,0,(a[2]+b[2])/2-center.z]);}}
 const top=floors.at(-1),roofY=eave+.16;
 if(style.roof==='gable'||style.roof==='cross-gable'){
  const across=style.roof==='cross-gable',run=across?6.75:7.65,halfLength=across?7.65:6.75,wallRun=across?6:7,wallEnd=across?7:6,rise=style.rise;
  const point=(u,y,v)=>across?[v,y,u]:[u,y,v];
  box(0,eave+.03,0,15.3,.18,13.5,'wood');
  for(const side of [-1,1]){
   roofPanel([point(0,roofY+rise,-halfLength),point(side*run,roofY,-halfLength),point(side*run,roofY,halfLength),point(0,roofY+rise,halfLength)]);
   beam(point(side*run,roofY-.05,-halfLength),point(side*run,roofY-.05,halfLength),.18,.2,'metal');
   for(const end of [-1,1])beam(point(0,roofY+rise,end*halfLength),point(side*run,roofY,end*halfLength),.13,.13,'metal');
   for(let row=1;row<=9;row++){const u=side*row*run/10,y=roofY+rise-Math.abs(u)*rise/run+.025;beam(point(u,y,-halfLength),point(u,y,halfLength),.045,.045,'roof');}
  }
  beam(point(0,roofY+rise+.04,-halfLength),point(0,roofY+rise+.04,halfLength),.24,.2,'metal');
  const wallEdge=roofY+rise*(1-wallRun/run)-.14;
  for(const end of [-1,1])surface([point(-wallRun,eave,end*wallEnd),point(wallRun,eave,end*wallEnd),point(wallRun,wallEdge,end*wallEnd),point(0,roofY+rise-.14,end*wallEnd),point(-wallRun,wallEdge,end*wallEnd)],'wall',across?[end,0,0]:[0,0,end]);
  for(const side of [-1,1])surface([point(side*wallRun,eave,-wallEnd),point(side*wallRun,eave,wallEnd),point(side*wallRun,wallEdge,wallEnd),point(side*wallRun,wallEdge,-wallEnd)],'wall',across?[0,0,side]:[side,0,0]);
  if(!across){box(0,7.45,6.015,.9,.48,.06,'metal');for(let i=0;i<5;i++)box(0,7.28+i*.08,6.055,.78,.025,.04,'dark');}
 }else if(style.roof==='hip'){
  const x=7.65,z=6.75,ridge=1.25,high=roofY+style.rise;
  box(0,eave+.03,0,15.3,.18,13.5,'wood');
  for(const side of [-1,1]){
   roofPanel([[side*x,roofY,-z],[side*x,roofY,z],[0,high,ridge],[0,high,-ridge]]);
   roofPanel([[-x,roofY,side*z],[x,roofY,side*z],[0,high,side*ridge]]);
   beam([side*x,roofY-.05,-z],[side*x,roofY-.05,z],.18,.18,'metal');beam([-x,roofY-.05,side*z],[x,roofY-.05,side*z],.18,.18,'metal');
   for(const end of [-1,1])beam([side*x,roofY,-z*end],[0,high,-ridge*end],.17,.16,'roof');
   for(let row=1;row<9;row++){const t=row/9,y=roofY+style.rise*t+.025;beam([side*x*(1-t),y,-z+(z-ridge)*t],[side*x*(1-t),y,z-(z-ridge)*t],.045,.045,'roof');beam([-x*(1-t),y,side*(z-(z-ridge)*t)],[x*(1-t),y,side*(z-(z-ridge)*t)],.045,.045,'roof');}
  }
  beam([0,high+.04,-ridge],[0,high+.04,ridge],.22,.19,'metal');
  const sideY=roofY+style.rise*(1-7/x)-.14,frontY=roofY+style.rise*(z-6)/(z-ridge)-.14,knee=x*(1-(z-6)/(z-ridge));
  for(const side of [-1,1]){
   surface([[side*7,eave,-6],[side*7,eave,6],[side*7,sideY,6],[side*7,sideY,-6]],'wall',[side,0,0]);
   surface([[-7,eave,side*6],[7,eave,side*6],[7,sideY,side*6],[knee,frontY,side*6],[-knee,frontY,side*6],[-7,sideY,side*6]],'wall',[0,0,side]);
  }
 }else{
  const x=top.w/2+.55,front=top.front+.6,back=top.back-.6,high=roofY+style.rise;
  roofPanel([[-x,roofY,front],[x,roofY,front],[x,high,back],[-x,high,back]]);
  const roofHeight=z=>roofY+style.rise*(front-z)/(front-back)-.14;
  for(const side of [-1,1]){
   surface([[side*top.w/2,eave,top.front],[side*top.w/2,eave,top.back],[side*top.w/2,roofHeight(top.back),top.back],[side*top.w/2,roofHeight(top.front),top.front]],'wall',[side,0,0]);
   beam([side*x,roofY,front],[side*x,high,back],.14,.14,'metal');
  }
  surface([[-top.w/2,eave,top.back],[top.w/2,eave,top.back],[top.w/2,roofHeight(top.back),top.back],[-top.w/2,roofHeight(top.back),top.back]],'wall',[0,0,-1]);
  surface([[-top.w/2,eave,top.front],[top.w/2,eave,top.front],[top.w/2,roofHeight(top.front),top.front],[-top.w/2,roofHeight(top.front),top.front]],'wall',[0,0,1]);
  for(const [z,y]of [[front,roofY],[back,high]])beam([-x,y,z],[x,y,z],.18,.18,'metal');
  for(let u=-x+.65;u<x;u+=.8)beam([u,roofY+.025,front],[u,high+.025,back],.035,.035,'roof');
  // The exposed first-floor slab becomes a shallow terrace, with a continuous parapet.
  box(0,3.68,0,14.6,.22,12.6,'concrete');box(0,4.12,6.08,14,.75,.22,'wall');box(0,4.53,6.08,14.3,.1,.32,'metal');
  for(const side of [-1,1]){box(side*6.9,4.12,5.1,.2,.75,1.9,'wall');box(side*6.9,4.53,5.1,.3,.1,2.1,'metal');}
 }
 for(const side of [-1,1])for(const z of [-5.7,style.id==='setback'?3.8:5.7]){
  const x=side*(top.w/2+.2);box(x,eave/2+.12,z,.12,eave-.35,.12,'metal');box(x,.45,z+.18,.12,.12,.45,'metal');
 }
 function window(x,y,z,w,h,turn=0){
  // Transform the small facade components for side and rear elevations.
  function part(dx,dy,dz,pw,ph,pd,key){const c=Math.cos(turn),s=Math.sin(turn);box(x+dx*c+dz*s,y+dy,z-dx*s+dz*c,Math.abs(c)*pw+Math.abs(s)*pd,ph,Math.abs(c)*pd+Math.abs(s)*pw,key);}
  part(0,0,-.16,w+.2,h+.2,.12,'dark');part(0,0,.14,w,h,.035,'glass');
  for(const dx of [-w/2,0,w/2])part(dx,0,.22,.065,h+.12,.09,'metal');for(const dy of [-h/2,h/2])part(0,dy,.22,w+.12,.065,.09,'metal');
  part(0,-h/2-.12,.25,w+.35,.12,.42,'trim');part(0,h/2+.2,.3,w+.4,.1,.7,'metal');
  // Subtle interior blinds behind the outer frame.
  for(const side of [-1,1]){const width=w*(side<0?.22:.29);part(side*(w/2-width/2-.06),0,.02,width,h-.12,.025,'trim');for(let j=1;j<4;j++)part(side*(w/2-width/2-.06)+(j-2)*width/4,0,.04,.025,h-.12,.025,'concrete');}
 }
 // Warm timber in the entry recess, visible jambs, a doorbell and porch light.
 for(let i=0;i<9;i++)box(-.64+i*.16,1.8,4.805,.012,2.85,.025,'metal');
 box(-1.24,1.9,5.25,.06,2.9,1,'wood');box(1.24,1.9,5.25,.06,2.9,1,'wood');
 box(-1.52,2.4,6.08,.22,.4,.14,'metal');box(-1.52,2.4,6.17,.15,.26,.035,'trim');
 // Balconies alternate sides; the low bungalow keeps an open eave instead.
 if(style.floors===2&&style.id!=='setback'){
  const center=style.id==='hip'?4.4:-4.4;box(center,4.04,6.4,3.2,.16,1.25,'concrete');
  for(const x of [center-1.5,center+1.5]){box(x,4.65,6.95,.075,1.1,.075,'metal');box(x,5.18,6.5,.07,.065,.9,'metal');}
  for(const y of [4.18,5.18])box(center,y,6.95,3.1,.065,.07,'metal');
  for(let i=0;i<15;i++)box(center-1.4+i*.2,4.67,6.95,.035,.95,.035,'metal');
 }
 // Foundation vents, siding joint, roof-edge fascia, and outdoor compressor.
 for(const x of [-5,-2,2,5])box(x,.45,6.32,.5,.15,.035,'dark');
 if(style.floors===2)box(0,3.55,6.05,14,.12,.12,'trim');box(-5,.9,-6.5,1.4,1,.55,'trim');for(let i=0;i<6;i++)box(-5,.58+i*.12,-6.79,1.1,.035,.03,'metal');
 // The garden follows the existing wall/mailbox/planter collision layout exactly.
 box(4.7,.185,(6.5+gardenEnd-.7)/2,5.6,.09,gardenEnd-7.2,'concrete');
 for(let z=8.9;z<gardenEnd-.5;z+=1.2)box(0,.23,z,2.9,.09,1.16,'concrete');for(let z=7.1;z<gardenEnd-.7;z+=1.45)box(4.7,.237,z,5.6,.012,.025,'dark');
 for(const side of [-1,1]){
  box(side*5,.5,gardenEnd,6,.85,.25,'concrete');box(side*5,.96,gardenEnd,6.2,.12,.35,'trim');
  for(let row=0;row<3;row++){box(side*5,.24+row*.23,gardenEnd+.132,5.95,.012,.012,'dark');for(let i=0;i<8;i++){const x=side*5-2.8+i*.75+(row%2)*.35;if(Math.abs(x-side*5)<2.95)box(x,.34+row*.23,gardenEnd+.134,.012,.2,.012,'dark');}}
  if(outer){box(side*7,.4,15,2.3,.65,2.3,'concrete');box(side*7,.745,15,2.05,.03,2.05,'dark');
  // Small rounded clusters, varied deterministically; no single faceted blob.
  for(let i=0;i<14;i++){const a=i*2.399,r=.25+(i%4)*.2,g=new T.IcosahedronGeometry(.42+(i%3)*.06,1);g.scale(1,.8,1);add(g,i%3?'leaf':'leafLight',side*7+Math.cos(a)*r,.92+(i%4)*.12,15+Math.sin(a)*r);}}
 }
 box(mailX,1,gardenEnd-.1,.45,1.8,.45,'concrete');box(mailX,1.4,gardenEnd+.15,.38,.35,.16,'metal');box(mailX,1.45,gardenEnd+.24,.29,.035,.025,'dark');
 // Timber screen beside the recessed entrance, with narrow physical gaps.
 for(let i=0;i<9;i++)box(1.8+i*.12,1.95,6.13,.065,2.9,.1,'wood');
 for(const [key,attrs]of batches){const g=new T.BufferGeometry();for(const [name,data]of Object.entries(attrs))g.setAttribute(name,new T.Float32BufferAttribute(data,name==='uv'?2:3));if(key==='wall'||key==='concrete'){const pos=g.attributes.position,colors=[];for(let i=0;i<pos.count;i++){const y=pos.getY(i),shade=key==='wall'?(y<.7?.78:y>eave-.35&&y<eave+.35?.88:1):.93;colors.push(shade,shade,shade);}g.setAttribute('color',new T.Float32BufferAttribute(colors,3));materials[key].vertexColors=true;}g.computeBoundingSphere();const mesh=new T.Mesh(g,materials[key]);mesh.name='house-'+key;mesh.castShadow=key!=='glass';mesh.receiveShadow=true;group.add(mesh);}
 // Soft contact shading supplements the broad static shadow map without post-processing.
 function contactMaterial(vertical){const size=64,data=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const nx=(x+.5)/size*2-1,ny=(y+.5)/size*2-1,a=vertical?Math.pow((y+.5)/size,2)*Math.pow(1-Math.abs(nx),.15):Math.pow(Math.max(0,1-Math.max(Math.abs(nx),Math.abs(ny))),.6);const i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=0;data[i+3]=Math.round(a*255);}const map=new T.DataTexture(data,size,size);map.needsUpdate=true;map.magFilter=T.LinearFilter;return new T.MeshBasicMaterial({map,transparent:true,opacity:vertical?.22:.24,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});}
 const groundShade=contactMaterial(false),wallShade=contactMaterial(true),shadeBatches=[[],[]];
 function shade(x,y,z,w,h,ground=false){const g=new T.PlaneGeometry(w,h).toNonIndexed();if(ground)g.rotateX(-Math.PI/2);g.translate(x,y,z);shadeBatches[ground?0:1].push(g);}
 shade(0,.012,0,16,14,true);shade(0,eave-.32,top.front+.022,top.w,.55);shade(0,3.22,6.023,3.5,.5);
 for(const o of frontWindows)shade(o.x,o.y-.94,o.z+.025,o.w+.1,.24);
 if(outer)for(const x of [-7,7])shade(x,.2,15,2.8,2.8,true);
 for(const [i,geometries]of shadeBatches.entries()){const g=new T.BufferGeometry();for(const name of ['position','normal','uv'])g.setAttribute(name,new T.Float32BufferAttribute(geometries.flatMap(a=>Array.from(a.attributes[name].array)),name==='uv'?2:3));const mesh=new T.Mesh(g,i===0?groundShade:wallShade);mesh.name=i===0?'house-ground-contact':'house-wall-contact';mesh.renderOrder=1;group.add(mesh);geometries.forEach(g=>g.dispose());}
 return {group,materials};
}
export async function loadHouseTextures(materials,anisotropy=1){
 const base=new URL('./assets/external/',import.meta.url),loader=new T.TextureLoader();
 return Promise.allSettled([['wall','map','house-siding.webp'],['wall','normalMap','house-wall-normal.webp'],['roof','map','house-roof-slate.webp'],['roof','normalMap','house-roof-normal.webp'],['wood','map','house-timber.webp']].map(async([key,slot,file])=>{
  const t=await loader.loadAsync(new URL(file,base).href);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=anisotropy;if(slot==='map')t.colorSpace=T.SRGBColorSpace;
  materials[key][slot]=t;materials[key].normalScale.set(key==='wall'?.22:.3,key==='wall'?.22:.3);materials[key].needsUpdate=true;return file;
 }));
}

// Merge repeated residential details into district-wide material batches.
// Colours vary through vertex colours, sharing textures rather than downloading per house.
export function createResidentialDistrict(buildings){
 const group=new T.Group();group.name='residential-district';const batches=new Map();let sharedMaterials;
 const palettes=[{wall:0xffffff,roof:0xffffff,wood:0xffffff},{wall:0xe7edf0,roof:0xc5d4db,wood:0xd4c5b5},{wall:0xf1e9da,roof:0xb6beb9,wood:0xebd6bb},{wall:0xe0e5dc,roof:0xd0c8c0,wood:0xc5b19d}];
 let count=0;const variants={};
 for(const b of buildings.filter(b=>b.detailed)){
  const house=createDetailedHouse(b),palette=palettes[count++%palettes.length];const type=house.group.userData.houseType;variants[type]=(variants[type]||0)+1;sharedMaterials??=house.materials;house.group.updateMatrixWorld(true);
  for(const mesh of house.group.children){
   const key=mesh.name.replace('house-',''),g=mesh.geometry;g.applyMatrix4(mesh.matrixWorld);
   const batch=batches.get(key)||{geometries:[],material:sharedMaterials[key]||mesh.material,cast:mesh.castShadow,receive:mesh.receiveShadow,order:mesh.renderOrder};
   if(key!=='glass'&&!key.includes('contact')){const tint=new T.Color(palette[key]??0xffffff),existing=g.attributes.color,a=new Float32Array(g.attributes.position.count*3);for(let i=0;i<g.attributes.position.count;i++){a[i*3]=(existing?.getX(i)??1)*tint.r;a[i*3+1]=(existing?.getY(i)??1)*tint.g;a[i*3+2]=(existing?.getZ(i)??1)*tint.b;}g.setAttribute('color',new T.BufferAttribute(a,3));batch.material.vertexColors=true;}
   batch.geometries.push(g);batches.set(key,batch);
   if(mesh.material!==batch.material){if(key.includes('contact'))mesh.material.map?.dispose();mesh.material.dispose();}
  }
 }
 for(const [key,batch]of batches){const merged=new T.BufferGeometry();for(const name of Object.keys(batch.geometries[0].attributes)){const itemSize=batch.geometries[0].attributes[name].itemSize,total=batch.geometries.reduce((n,g)=>n+g.attributes[name].array.length,0),a=new Float32Array(total);let offset=0;for(const g of batch.geometries){a.set(g.attributes[name].array,offset);offset+=g.attributes[name].array.length;}merged.setAttribute(name,new T.BufferAttribute(a,itemSize));}merged.computeBoundingBox();merged.computeBoundingSphere();const mesh=new T.Mesh(merged,batch.material);mesh.name='district-'+key;mesh.castShadow=batch.cast;mesh.receiveShadow=batch.receive;mesh.renderOrder=batch.order;group.add(mesh);batch.geometries.forEach(g=>g.dispose());}
 group.userData.houseCount=count;group.userData.variants=variants;return{group,materials:sharedMaterials};
}
