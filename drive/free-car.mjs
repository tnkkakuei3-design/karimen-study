import * as T from './vendor/three.module.min.js';
export function createCar(){
 const car=new T.Group(),materials=new Map(),cube=new T.BoxGeometry(1,1,1);
 const mat=(color,roughness=.65)=>{const key=color+':'+roughness;if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness,metalness:roughness<.4?.18:0}));return materials.get(key);};
 const paint=mat(0xe6bd55,.32),trim=mat(0x333e41),glass=mat(0x587680,.25),chrome=mat(0xb9c3c1,.3);
 function box(x,y,z,w,h,d,m){const mesh=new T.Mesh(cube,m);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);car.add(mesh);return mesh;}
 // Longitudinal sections shape the nose, belt line and sloping cabin pillars.
 function shell(sections,m){const v=[],indices=[];for(const [z,y0,y1,width0,width1]of sections)v.push(-width0,y0,z,width0,y0,z,-width1,y1,z,width1,y1,z);
 for(let i=0;i<sections.length-1;i++){const a=i*4,b=a+4;indices.push(a,b,a+1,a+1,b,b+1,a+2,a+3,b+2,a+3,b+3,b+2,a,a+2,b,a+2,b+2,b,a+1,b+1,a+3,a+3,b+1,b+3);}const n=v.length/3-4;indices.push(0,1,2,1,3,2,n,n+2,n+1,n+1,n+2,n+3);
 for(let i=0;i<indices.length;i+=3){const t=indices[i+1];indices[i+1]=indices[i+2];indices[i+2]=t;}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(indices);g.computeVertexNormals();const mesh=new T.Mesh(g,m);car.add(mesh);return mesh;}
 shell([[-2.08,.5,.79,.77,.81],[-1.75,.43,.97,.88,.89],[-.8,.43,1.02,.9,.9],[1.5,.43,1.02,.9,.89],[2.02,.5,.87,.8,.83]],paint);
 shell([[-.96,1.01,1.03,.84,.83],[-.43,1.01,1.62,.85,.7],[.86,1.01,1.62,.85,.7],[1.43,1.01,1.05,.84,.82]],paint);
 // Glazing sits just outside the cabin surface; narrow pillars remain visible.
 function pane(points){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();const m=new T.Mesh(g,glass);m.material.side=T.DoubleSide;car.add(m);}
 pane([[-.76,1.08,-.91],[.76,1.08,-.91],[.65,1.55,-.48],[-.65,1.55,-.48]]);
 pane([[-.65,1.54,.91],[.65,1.54,.91],[.76,1.08,1.39],[-.76,1.08,1.39]]);
 for(const side of [-1,1]){
  pane([[side*.851,1.08,-.82],[side*.851,1.08,.12],[side*.716,1.55,.12],[side*.716,1.55,-.4]]);
  pane([[side*.851,1.08,.22],[side*.851,1.08,1.29],[side*.716,1.55,.83],[side*.716,1.55,.22]]);
  box(side*.911,.86,.06,.025,.19,.035,trim);box(side*.917,.9,.55,.045,.045,.22,chrome);
  box(side*.99,1.13,-.67,.23,.15,.27,paint);box(side*1.11,1.13,-.66,.015,.1,.19,glass);
  box(side*.915,.53,0,.055,.12,2.25,trim);
 }
 box(0,.53,-2.04,1.58,.16,.12,trim);box(0,.55,2,1.55,.14,.12,trim);box(0,.72,-2.091,.68,.19,.025,trim);
 for(const y of [.66,.72,.78])box(0,y,-2.11,.61,.018,.018,chrome);
 const white=mat(0xf5ead0),red=mat(0x9e4037),braking=mat(0xff483b);braking.emissive.setHex(0x8a130b);
 const lamps=[];for(const x of [-.61,.61]){box(x,.81,-1.98,.36,.19,.1,white);lamps.push(box(x,.79,1.98,.3,.2,.1,red));box(x,.68,2.04,.28,.045,.02,white);}
 box(0,.64,2.082,.4,.18,.025,white);box(0,.58,-2.12,.4,.15,.025,white);
 const wheels=[],tire=new T.CylinderGeometry(.35,.35,.23,16),hub=new T.CylinderGeometry(.2,.2,.245,12);
 for(const x of [-.88,.88])for(const z of [-1.28,1.27]){const pivot=new T.Group();pivot.position.set(x,.36,z);for(const [g,m]of [[tire,mat(0x252c2d)],[hub,chrome]]){const wheel=new T.Mesh(g,m);wheel.rotation.z=Math.PI/2;pivot.add(wheel);}car.add(pivot);if(z<0)wheels.push(pivot);}
 // Soft contact shadow follows the car without rerendering the static shadow map.
 const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');const grad=ctx.createRadialGradient(32,32,4,32,32,32);grad.addColorStop(0,'rgba(25,36,38,.45)');grad.addColorStop(1,'rgba(25,36,38,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,64,64);
 const shadow=new T.Mesh(new T.PlaneGeometry(3.2,5.6),new T.MeshBasicMaterial({map:new T.CanvasTexture(c),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.23;car.add(shadow);
 return{car,wheels,lamps,red,braking};
}
