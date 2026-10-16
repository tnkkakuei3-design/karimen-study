import * as T from './vendor/three.module.min.js';
// Local +Z is the entrance. Static components are merged by material.
export function createDetailedHouse(b){
 const group=new T.Group();group.name='detailed-house';group.position.set(b.x,0,b.z);group.rotation.y=Math.PI/2;
 const material=(color,roughness=.85)=>new T.MeshStandardMaterial({color,roughness});
 const materials={wall:material(0xe9e5db),roof:material(0xbfc6c9,.78),trim:material(0xc7c8c3),metal:material(0x454e4e,.32),wood:material(0x96806a),concrete:material(0xb4b2a9),leaf:material(0x52654a),leafLight:material(0x6e7e50),glass:new T.MeshStandardMaterial({color:0xa7b5b8,roughness:.1,metalness:.15,envMapIntensity:1.25,transparent:true,opacity:.48,depthWrite:false}),dark:material(0x35403e)};
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
  if(key==='wall'){const pos=g.attributes.position;for(let i=0;i<uv.count;i++){const face=Math.floor(i/4);uv.setXY(i,(face<2?pos.getZ(i)+z:pos.getX(i)+x)/2.5,((face===2||face===3)?pos.getZ(i)+z:pos.getY(i)+y)/2.5);}}
  add(g,key,x,y,z,rotation);
 }
 box(0,.32,0,14.6,.6,12.6,'concrete');
 // Recessed entrance: the ground-floor facade is open around the inset door.
 box(0,3.5,-.5,13.6,6.3,10.6,'dark');
 // Side/rear walls are perforated too; interior backing sits behind each pane.
 function elevation(turn,openings){
  const width=Math.abs(turn)===Math.PI?14:12,extent=width/2,offset=width===14?6:7;
  const a=[...new Set([-extent,extent,...openings.flatMap(o=>[o.x-o.w/2,o.x+o.w/2])])].sort((a,b)=>a-b),v=[...new Set([.35,6.65,...openings.flatMap(o=>[o.y-o.h/2,o.y+o.h/2])])].sort((a,b)=>a-b);
  for(let i=1;i<a.length;i++)for(let j=1;j<v.length;j++){const x=(a[i]+a[i-1])/2,y=(v[j]+v[j-1])/2;if(openings.some(o=>Math.abs(x-o.x)<o.w/2&&Math.abs(y-o.y)<o.h/2))continue;const c=Math.cos(turn),sn=Math.sin(turn),w=a[i]-a[i-1];box(x*c+(offset-.1)*sn,y,-x*sn+(offset-.1)*c,Math.abs(c)*w+Math.abs(sn)*.2,v[j]-v[j-1],Math.abs(c)*.2+Math.abs(sn)*w,'wall');}
 }
 for(const side of [-1,1])elevation(side*Math.PI/2,[-3,2].flatMap(z=>[2,5.05].map(y=>({x:-side*z,y,w:1.9,h:1.65}))));
 elevation(Math.PI,[-4,3.5].flatMap(x=>[2,5.05].map(y=>({x:-x,y,w:2,h:1.6}))));

 // Build the facade around real openings; the glazing sits inside the wall thickness.
 const holes=[...[-4.4,4.4].flatMap(x=>[2,5.05].map(y=>({x,y,w:2.7,h:1.85}))),{x:0,y:5.05,w:1.8,h:1.85},{x:0,y:1.95,w:2.6,h:3.2}];
 const xs=[...new Set([-7,7,...holes.flatMap(o=>[o.x-o.w/2,o.x+o.w/2])])].sort((a,b)=>a-b),ys=[...new Set([.35,6.65,...holes.flatMap(o=>[o.y-o.h/2,o.y+o.h/2])])].sort((a,b)=>a-b);
 for(let i=1;i<xs.length;i++)for(let j=1;j<ys.length;j++){const x=(xs[i]+xs[i-1])/2,y=(ys[j]+ys[j-1])/2;if(!holes.some(o=>Math.abs(x-o.x)<o.w/2&&Math.abs(y-o.y)<o.h/2))box(x,y,5.35,xs[i]-xs[i-1],ys[j]-ys[j-1],1.3,'wall');}

 box(0,1.8,4.73,1.45,2.9,.12,'wood');box(.5,1.7,4.83,.05,.55,.08,'metal');box(-.4,2,4.81,.22,1.3,.04,'glass');
 box(0,.48,6.1,2.8,.22,3,'concrete');box(0,.28,7.7,3.4,.18,1,'concrete');
 box(0,3.52,6.25,3.4,.18,2,'metal');box(1.53,2.2,6.08,.2,.32,.12,'dark');box(1.53,2.2,6.16,.12,.18,.04,'trim');
 // Eaves and separate pitched roof planes, with outward-facing box normals.
 box(0,6.68,0,15.3,.2,13.4,'wood');
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
  part(0,0,-.16,w+.2,h+.2,.12,'dark');part(0,0,.14,w,h,.035,'glass');
  for(const dx of [-w/2,0,w/2])part(dx,0,.22,.065,h+.12,.09,'metal');for(const dy of [-h/2,h/2])part(0,dy,.22,w+.12,.065,.09,'metal');
  part(0,-h/2-.12,.25,w+.35,.12,.42,'trim');part(0,h/2+.2,.3,w+.4,.1,.7,'metal');
  // Subtle interior blinds behind the outer frame.
  for(const side of [-1,1]){const width=w*(side<0?.22:.29);part(side*(w/2-width/2-.06),0,.02,width,h-.12,.025,'trim');for(let j=1;j<4;j++)part(side*(w/2-width/2-.06)+(j-2)*width/4,0,.04,.025,h-.12,.025,'concrete');}
 }
 for(const x of [-4.4,4.4])for(const y of [2,5.05])window(x,y,5.8,2.5,1.65);
 window(0,5.05,5.8,1.6,1.65);
 for(const side of [-1,1])for(const z of [-3,2])for(const y of [2,5.05])window(side*6.8,y,z,1.7,1.45,side*Math.PI/2);
 for(const x of [-4,3.5])for(const y of [2,5.05])window(x,y,-5.8,1.8,1.4,Math.PI);
 // Tile laps give the roof silhouette genuine depth, without individual high-poly tiles.
 for(const sign of [-1,1])for(let row=1;row<=10;row++){const x=sign*row*.72,y=9.35-Math.abs(x)*2.6/7.65;box(x,y+.06,0,.055,.065,13.45,'roof',-sign*angle);}
 // Warm timber in the entry recess, visible jambs, a doorbell and porch light.
 for(let i=0;i<9;i++)box(-.64+i*.16,1.8,4.805,.012,2.85,.025,'metal');
 box(-1.24,1.9,5.25,.06,2.9,1,'wood');box(1.24,1.9,5.25,.06,2.9,1,'wood');
 box(-1.52,2.4,6.08,.22,.4,.14,'metal');box(-1.52,2.4,6.17,.15,.26,.035,'trim');
 // A shallow balcony adds an asymmetric silhouette without extending the ground footprint.
 box(-4.4,4.04,6.4,3.2,.16,1.25,'concrete');
 for(const x of [-5.9,-2.9])box(x,4.65,6.95,.075,1.1,.075,'metal');
 box(-4.4,5.18,6.95,3.1,.065,.07,'metal');box(-4.4,4.18,6.95,3.1,.055,.07,'metal');
 for(let i=0;i<15;i++)box(-5.8+i*.2,4.67,6.95,.035,.95,.035,'metal');
 for(const x of [-5.9,-2.9])box(x,5.18,6.5,.07,.065,.9,'metal');
 // Fine roof fascia, gable vent and joinery, kept within the existing roof envelope.
 for(const side of [-1,1])for(const z of [-6.78,6.78])box(side*3.825,8.05,z,slope,.15,.12,'metal',-side*angle);
 box(0,7.45,6.015,.9,.48,.06,'metal');for(let i=0;i<5;i++)box(0,7.28+i*.08,6.055,.78,.025,.04,'dark');
 // Foundation vents, siding joint, roof-edge fascia, and outdoor compressor.
 for(const x of [-5,-2,2,5])box(x,.45,6.32,.5,.15,.035,'dark');
 box(0,3.55,6.05,14,.12,.12,'trim');box(-5,.9,-6.5,1.4,1,.55,'trim');for(let i=0;i<6;i++)box(-5,.58+i*.12,-6.79,1.1,.035,.03,'metal');
 // The garden follows the existing wall/mailbox/planter collision layout exactly.
 box(4.7,.185,12.4,5.6,.09,11.8,'concrete');
 for(let i=0;i<8;i++){box(0,.23,8.9+i*1.2,2.9,.09,1.16,'concrete');box(4.7,.237,7.1+i*1.45,5.6,.012,.025,'dark');}
 for(const side of [-1,1]){
  box(side*5,.5,19,6,.85,.25,'concrete');box(side*5,.96,19,6.2,.12,.35,'trim');
  for(let row=0;row<3;row++){box(side*5,.24+row*.23,19.132,5.95,.012,.012,'dark');for(let i=0;i<8;i++){const x=side*5-2.8+i*.75+(row%2)*.35;if(Math.abs(x-side*5)<2.95)box(x,.34+row*.23,19.134,.012,.2,.012,'dark');}}
  box(side*7,.4,15,2.3,.65,2.3,'concrete');box(side*7,.745,15,2.05,.03,2.05,'dark');
  // Small rounded clusters, varied deterministically; no single faceted blob.
  for(let i=0;i<14;i++){const a=i*2.399,r=.25+(i%4)*.2,g=new T.IcosahedronGeometry(.42+(i%3)*.06,1);g.scale(1,.8,1);add(g,i%3?'leaf':'leafLight',side*7+Math.cos(a)*r,.92+(i%4)*.12,15+Math.sin(a)*r);}
 }
 box(-1.9,1,18.9,.45,1.8,.45,'concrete');box(-1.9,1.4,19.15,.38,.35,.16,'metal');box(-1.9,1.45,19.24,.29,.035,.025,'dark');
 // Timber screen beside the recessed entrance, with narrow physical gaps.
 for(let i=0;i<9;i++)box(1.8+i*.12,1.95,6.13,.065,2.9,.1,'wood');
 for(const [key,attrs]of batches){const g=new T.BufferGeometry();for(const [name,data]of Object.entries(attrs))g.setAttribute(name,new T.Float32BufferAttribute(data,name==='uv'?2:3));if(key==='wall'||key==='concrete'){const pos=g.attributes.position,colors=[];for(let i=0;i<pos.count;i++){const y=pos.getY(i),shade=key==='wall'?(y<.7?.78:y>6.3&&y<7?.84:1):.93;colors.push(shade,shade,shade);}g.setAttribute('color',new T.Float32BufferAttribute(colors,3));materials[key].vertexColors=true;}g.computeBoundingSphere();const mesh=new T.Mesh(g,materials[key]);mesh.name='house-'+key;mesh.castShadow=key!=='glass';mesh.receiveShadow=true;group.add(mesh);}
 // Soft contact shading supplements the broad static shadow map without post-processing.
 function contactMaterial(vertical){const size=64,data=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const nx=(x+.5)/size*2-1,ny=(y+.5)/size*2-1,a=vertical?Math.pow((y+.5)/size,2)*Math.pow(1-Math.abs(nx),.15):Math.pow(Math.max(0,1-Math.max(Math.abs(nx),Math.abs(ny))),.6);const i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=0;data[i+3]=Math.round(a*255);}const map=new T.DataTexture(data,size,size);map.needsUpdate=true;map.magFilter=T.LinearFilter;return new T.MeshBasicMaterial({map,transparent:true,opacity:vertical?.22:.24,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});}
 const groundShade=contactMaterial(false),wallShade=contactMaterial(true),shadeBatches=[[],[]];
 function shade(x,y,z,w,h,ground=false){const g=new T.PlaneGeometry(w,h).toNonIndexed();if(ground)g.rotateX(-Math.PI/2);g.translate(x,y,z);shadeBatches[ground?0:1].push(g);}
 shade(0,.012,0,16,14,true);shade(0,6.3,6.022,14,.55);shade(0,3.22,6.023,3.5,.5);
 for(const x of [-4.4,4.4])for(const y of [2,5.05])shade(x,y-.94,6.025,2.8,.24);
 for(const x of [-7,7])shade(x,.2,15,2.8,2.8,true);
 for(const [i,geometries]of shadeBatches.entries()){const g=new T.BufferGeometry();for(const name of ['position','normal','uv'])g.setAttribute(name,new T.Float32BufferAttribute(geometries.flatMap(a=>Array.from(a.attributes[name].array)),name==='uv'?2:3));const mesh=new T.Mesh(g,i===0?groundShade:wallShade);mesh.renderOrder=1;group.add(mesh);geometries.forEach(g=>g.dispose());}
 return {group,materials};
}
export async function loadHouseTextures(materials,anisotropy=1){
 const base=new URL('./assets/external/',import.meta.url),loader=new T.TextureLoader();
 return Promise.allSettled([['wall','map','house-siding.webp'],['wall','normalMap','house-wall-normal.webp'],['roof','map','house-roof-slate.webp'],['roof','normalMap','house-roof-normal.webp'],['wood','map','house-timber.webp']].map(async([key,slot,file])=>{
  const t=await loader.loadAsync(new URL(file,base).href);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=anisotropy;if(slot==='map')t.colorSpace=T.SRGBColorSpace;
  materials[key][slot]=t;materials[key].normalScale.set(.35,.35);materials[key].needsUpdate=true;return file;
 }));
}
