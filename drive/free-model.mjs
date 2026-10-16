import {wheelSurface} from './road-surfaces.mjs?v=2';
import {districtProps} from './district-layout.mjs?v=1';
export const STREETS=[-120,0,120];
export const LIMIT=145;
export const PLACES=[
 {id:'school',name:'教習所',x:-108,z:112,color:0x427fa3},
 {id:'shop',name:'商店街',x:12,z:-48,color:0xc28b50},
 {id:'park',name:'中央公園',x:-48,z:12,color:0x648b55},
 {id:'sea',name:'海辺の広場',x:131,z:45,color:0x3f98a8}
];
export const STREET_PROPS=[{x:19,z:-99,w:1.2,d:1},{x:19,z:39,w:1.2,d:1},...[-104,-64,-24,24,64,104].flatMap(z=>[{x:10.5,z,w:.28,d:.28},{x:-10.5,z,w:.16,d:.16}]),{x:-11,z:-13,w:.13,d:.13}];
export const BUILDINGS=[];
for(const x of [-90,-60,-30,30,60,90])for(const z of [-90,-60,-30,30,60,90]){
 if((x<0&&z>0)||(x<0&&z<0&&x>-80&&z>-80))continue;
 BUILDINGS.push({x,z,w:18,d:18,h:7+((Math.abs(x)+Math.abs(z))%7),color:[0xd5c5af,0xdfe1d9,0xc9d3d4,0xc5bba9][BUILDINGS.length%4]});
}
export const DISTRICT_PROPS=districtProps(BUILDINGS);
const SOLIDS=[...BUILDINGS,...STREET_PROPS,...DISTRICT_PROPS];
export const onRoad=(x,z)=>STREETS.some(t=>Math.abs(x-t)<8||Math.abs(z-t)<8);
export function blocked(x,z){return Math.abs(x)>LIMIT||Math.abs(z)>LIMIT||SOLIDS.some(b=>Math.abs(x-b.x)<b.w/2+1.3&&Math.abs(z-b.z)<b.d/2+1.3);}
export class FreeDrive{
 constructor(){this.x=-123;this.z=103;this.heading=0;this.v=0;this.gear=1;this.steer=0;this.input={gas:false,brake:false,steer:0};this.phase='ready';this.distance=0;this.visited=new Set();this.impact=false;}
 get speed(){return Math.abs(this.v)*3.6;}
 release(){this.input={gas:false,brake:false,steer:0};this.steer=0;}
 changeGear(){if(this.speed>.8)return false;this.v=0;this.gear*=-1;return true;}
 recover(){const candidates=STREETS.flatMap(t=>[{x:t-3,z:Math.max(-130,Math.min(130,this.z)),heading:0},{x:Math.max(-130,Math.min(130,this.x)),z:t+3,heading:Math.PI/2}]);candidates.sort((a,b)=>Math.hypot(a.x-this.x,a.z-this.z)-Math.hypot(b.x-this.x,b.z-this.z));Object.assign(this,candidates[0],{v:0});this.release();}
 step(dt){if(this.phase!=='running'||!Number.isFinite(dt)||dt<=0)return;const n=Math.ceil(Math.min(dt,.25)*120),s=Math.min(dt,.25)/n;this.impact=false;for(let i=0;i<n;i++)this.tick(s);}
 tick(dt){
 const {gas,brake}=this.input;this.steer+=(Math.max(-1,Math.min(1,this.input.steer))-this.steer)*Math.min(1,dt*9);
 if(brake)this.v=Math.sign(this.v)*Math.max(0,Math.abs(this.v)-9*dt);
 else if(gas)this.v+=this.gear*(this.gear===1?4.6:3)*dt;
 else this.v=Math.sign(this.v)*Math.max(0,Math.abs(this.v)-.75*dt);
 const surface=wheelSurface(this.x,this.z,this.heading);
 // Wheel contact applies resistance in either gear, while allowing escape at low speed.
 if(surface!=='road'){const limit=surface==='curb'?2:3;this.v=Math.sign(this.v)*Math.max(0,Math.abs(this.v)-(Math.abs(this.v)>limit?12:1.2)*dt);}
 const top=onRoad(this.x,this.z)?22:5;this.v=Math.max(-5,Math.min(top,this.v));
 const angle=this.steer*.58/(1+Math.abs(this.v)*.07),h=this.heading+this.v/2.7*Math.tan(angle)*dt;
 const x=this.x+Math.sin(h)*this.v*dt,z=this.z-Math.cos(h)*this.v*dt;
 if(blocked(x,z)){if(Math.abs(this.v)>1)this.impact=true;this.v=0;}
 else{this.distance+=Math.abs(this.v)*dt;this.x=x;this.z=z;this.heading=Math.atan2(Math.sin(h),Math.cos(h));}
 for(const p of PLACES)if(Math.hypot(p.x-this.x,p.z-this.z)<16&&this.speed<8)this.visited.add(p.id);
 }
 snapshot(){return{x:this.x,z:this.z,heading:this.heading,distance:this.distance,visited:[...this.visited]};}
 restore(s){if(!s||!['x','z','heading','distance'].every(k=>Number.isFinite(s[k]))||s.distance<0||blocked(s.x,s.z))return false;this.x=s.x;this.z=s.z;this.heading=Math.atan2(Math.sin(s.heading),Math.cos(s.heading));this.distance=s.distance;this.visited=new Set(Array.isArray(s.visited)?s.visited.filter(id=>PLACES.some(p=>p.id===id)):[]);return true;}
}
