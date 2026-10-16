import * as T from './vendor/three.module.min.js';
// Shop shells retain each lot footprint. Static surfaces share district material batches.
export function createDetailedShops(buildings,shops){
 const make=(color,roughness=.85)=>new T.MeshStandardMaterial({color,roughness});
 const materials={wall:make(0xe8e5dc),roof:make(0xbfc6c9,.78),wood:make(0x9c8266),trim:make(0xd0d1ca,.5),metal:make(0x424e4f,.32),concrete:make(0xb4b2aa),dark:make(0x293431),glass:new T.MeshStandardMaterial({color:0xa9bdc1,roughness:.1,metalness:.15,envMapIntensity:1.2,transparent:true,opacity:.48,depthWrite:false})};
 const group=new T.Group();group.name='detailed-shops';const batches=new Map();
 const palette=[0xf0e5d7,0xf7edda,0xe0e9de,0xe6eded,0xe7dfd5,0xdce5e8];
 for(const [index,s]of shops.entries()){
  const b=buildings.find(b=>b.lotX===30&&b.lotZ===s.z),h=b.h,transform=new T.Matrix4().makeRotationY(-Math.PI/2);transform.setPosition(b.x,0,b.z);
  function add(geometry,key,x=0,y=0,z=0,rz=0){const g=geometry.index?geometry.toNonIndexed():geometry;g.rotateZ(rz);g.translate(x,y,z);const p=g.attributes.position;
   // UV scale stays constant across separate wall pieces and differently sized roofs.
   if(key==='wall'||key==='roof'||key==='wood'){const uv=g.attributes.uv,n=g.attributes.normal;for(let i=0;i<p.count;i++){const side=Math.abs(n.getX(i))>.8,top=Math.abs(n.getY(i))>.6;uv.setXY(i,(side?p.getZ(i):p.getX(i))/2.5,(top?p.getZ(i):p.getY(i))/2.5);}}
   const tint=new T.Color(key==='wall'?palette[index]:0xffffff),colors=[];for(let i=0;i<p.count;i++){const shade=key==='wall'?(p.getY(i)<.7?.8:p.getY(i)>h-.6?.88:1):1;colors.push(tint.r*shade,tint.g*shade,tint.b*shade);}g.setAttribute('color',new T.Float32BufferAttribute(colors,3));materials[key].vertexColors=true;g.applyMatrix4(transform);const a=batches.get(key)||[];a.push(g);batches.set(key,a);if(g!==geometry)geometry.dispose();}
  function box(x,y,z,w,height,d,key,rz=0){add(new T.BoxGeometry(w,height,d),key,x,y,z,rz);}
  box(0,h/2,0,16.4,h,16.4,'dark');box(0,.25,0,18,.5,18,'concrete');
  const upper=[];for(let y=5.8;y<h-1;y+=3)for(const x of [-5,0,5])upper.push({x,y,w:2.4,h:1.9});
  const front=[...upper,{x:s.door,y:1.85,w:index===2?3.4:2,h:2.8},{x:s.window,y:1.8,w:s.windowW,h:2.5}];
  function elevation(turn,openings){
   const a=[...new Set([-9,9,...openings.flatMap(o=>[o.x-o.w/2,o.x+o.w/2])])].sort((a,b)=>a-b),v=[...new Set([.5,h,...openings.flatMap(o=>[Math.max(.5,o.y-o.h/2),o.y+o.h/2])])].sort((a,b)=>a-b);
   const c=Math.cos(turn),sn=Math.sin(turn);
   for(let i=1;i<a.length;i++)for(let j=1;j<v.length;j++){const x=(a[i]+a[i-1])/2,y=(v[j]+v[j-1])/2;if(openings.some(o=>Math.abs(x-o.x)<o.w/2&&Math.abs(y-o.y)<o.h/2))continue;const w=a[i]-a[i-1];box(x*c+8.8*sn,y,-x*sn+8.8*c,Math.abs(c)*w+Math.abs(sn)*.4,v[j]-v[j-1],Math.abs(c)*.4+Math.abs(sn)*w,'wall');}
   for(const o of openings){
    function part(dx,dy,dz,w,hh,d,key){box((o.x+dx)*c+dz*sn,o.y+dy,-(o.x+dx)*sn+dz*c,Math.abs(c)*w+Math.abs(sn)*d,hh,Math.abs(c)*d+Math.abs(sn)*w,key);}
    part(0,0,8.4,o.w,o.h,.05,'dark');part(0,0,8.81,o.w-.12,o.h-.1,.035,'glass');
    const sections=Math.max(1,Math.round(o.w/1.5));for(let i=0;i<=sections;i++)part(-o.w/2+i*o.w/sections,0,8.98,.075,o.h,.12,'metal');
    for(const dy of [-o.h/2,o.h/2])part(0,dy,8.98,o.w+.12,.075,.12,'metal');
    part(0,-o.h/2-.08,9.03,o.w+.3,.1,.32,'trim');
    if(o.y>4){for(const sign of [-1,1])part(sign*o.w*.34,0,8.65,o.w*.22,o.h-.15,.035,'trim');part(0,o.h/2+.16,9.17,o.w+.4,.1,.55,'metal');}
   }
  }
  elevation(0,front);for(const turn of [Math.PI/2,-Math.PI/2,Math.PI])elevation(turn,upper);
  // Entry threshold, handles and deep display shelves. Each display uses the shop's content below.
  box(s.door,.35,9.35,index===2?3.8:2.5,.2,1.2,'concrete');box(s.door+.45,1.55,8.97,.06,.55,.08,'metal');
  for(const y of [.8,1.45,2.15])box(s.window,y,8.55,s.windowW-.25,.075,.7,'wood');
  const accent=new T.Color(s.color);
  for(let row=0;row<2;row++)for(let n=0;n<Math.floor(s.windowW/.5);n++){
   const x=s.window-s.windowW/2+.35+n*.5,y=1.06+row*.7;
   if(index===0||index===3){add(new T.CylinderGeometry(.12,.09,.19,8), 'trim',x,y,8.67);box(x,y-.13,8.65,.35,.035,.28,'trim');}
   else if(index===1)add(new T.SphereGeometry(.18,8,5),'wood',x,y,8.66);
   else if(index===2)add(new T.IcosahedronGeometry(.16,1),'wood',x,y,8.66);
   else box(x,y,8.65,index===4?.12:.23,.35,.28,index===4?(n%2?'wood':'trim'):'trim');
  }
  // Stone base, timber reveals and two vertical downpipes meet the pavement.
  for(const x of [-8.7,8.7]){box(x,1.9,9.06,.16,2.85,.16,'wood');box(x,h/2,-9.12,.12,h,.12,'metal');}
  for(let x=-8;x<=8;x+=1.2)box(x,.25,9.015,.015,.45,.025,'dark');
  if(s.roof==='tile'||s.roof==='gable'){
   const rise=s.roof==='tile'?2:3.6,angle=Math.atan2(rise,9.6),slope=Math.hypot(9.6,rise);box(0,h+.04,0,19.2,.16,19.2,'wood');
   for(const sign of [-1,1])box(sign*4.8,h+rise/2,0,slope,.18,19.2,'roof',-sign*angle);
   for(const z of [-9,9]){const verts=z>0?[-9,h,z,9,h,z,0,h+rise-.1,z]:[9,h,z,-9,h,z,0,h+rise-.1,z],g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,.5,1],2));g.computeVertexNormals();add(g,'wall');}
   box(0,h+rise+.06,0,.28,.19,19.3,'metal');for(const sign of [-1,1]){box(sign*9.6,h-.05,0,.16,.2,19.3,'metal');for(let r=1;r<13;r++){const x=sign*r*.72;box(x,h+rise-Math.abs(x)*rise/9.6+.1,0,.055,.06,19.2,'roof',-sign*angle);}}
  }else{
   box(0,h+.16,0,19.2,.32,19.2,'roof');
   for(const x of [-9,9])box(x,h+.65,0,.3,1,18,'wall');for(const z of [-9,9])box(0,h+.65,z,18,1,.3,'wall');
   for(const x of [-9,9])box(x,h+1.2,0,.45,.12,18.5,'metal');for(const z of [-9,9])box(0,h+1.2,z,18.5,.12,.45,'metal');
   if(s.roof==='clerestory'){box(0,h+1,0,10,1.4,12,'glass');box(0,h+1.8,0,11,.2,13,'metal');}
   if(s.roof==='stepped'){box(0,h+1.6,9,12,.8,.4,'wall');box(0,h+2.3,9,6,.6,.4,'wall');}
   box(5,h+.65,-4,2,.8,3,'metal');for(let i=0;i<5;i++)box(5,h+1.07,-5+i*.4,1.7,.025,.06,'trim');
  }
 }
 for(const [key,geometries]of batches){const g=new T.BufferGeometry();for(const name of ['position','normal','uv','color']){const size=name==='uv'?2:3,data=new Float32Array(geometries.reduce((sum,g)=>sum+g.attributes[name].array.length,0));let at=0;for(const item of geometries){data.set(item.attributes[name].array,at);at+=item.attributes[name].array.length;}g.setAttribute(name,new T.BufferAttribute(data,size));}g.computeBoundingSphere();const mesh=new T.Mesh(g,materials[key]);mesh.name='shops-'+key;mesh.castShadow=key!=='glass';mesh.receiveShadow=true;group.add(mesh);geometries.forEach(g=>g.dispose());}
 group.userData.shopCount=shops.length;return{group,materials};
}
