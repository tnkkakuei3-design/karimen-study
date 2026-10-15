import {advanceVehicle,steerVehicle,releaseVehicle} from './vehicle.mjs?v=20261015-cockpit1';
import {advanceFrame} from './engine.mjs?v=20261015-review1';
export const ROUTE=[{index:0,z:88},{index:1,z:154},{index:2,z:220}];
export const CROWD_LIMIT=12;
export function visibleCrowd(d){return d.actors.filter(a=>a.hit?d.time-a.hit.at<2.5:!a.passed&&a.z-d.z<48&&a.z-d.z>-4).sort((a,b)=>Math.abs(a.z-d.z)-Math.abs(b.z-d.z)).slice(0,CROWD_LIMIT);}
export class ArcadeDrive{
 constructor(){this.index=3;this.arcade=true;this.guided=false;this.scene={id:'arcade',number:'04',title:'ボーナス・連続ドライブ',name:'飛び出しラッシュ',desc:'左右から次々と飛び出す48人。連続ヒットでコンボを伸ばそう。',area:'ボーナスステージ',hazard:255,initialSpeed:24};this.phase='ready';this.z=0;this.x=-1.38;this.lane=0;this.steering=0;this.v=24/3.6;this.time=0;this.input={gas:false,brake:false};this.events=[];this.combo=0;this.maxCombo=0;this.hits=0;this.points=0;this.lastHit=-Infinity;this.outcome=null;this.detected=null;this.actorClear=false;this.checks={left:false,right:false};this.idle=0;
 this.actors=Array.from({length:48},(_,id)=>{const wave=Math.floor(id/6),j=id%6,side=(j+wave)%2?1:-1;return{id,index:wave<3?0:wave<6?1:2,wave,z:34+wave*26+j*2.2,side,runSpeed:2.8+(id%4)*.45,startX:side*(4.1+(j%3)*.35),x:side*(4.1+(j%3)*.35),targetX:j%3===0?1.38:-1.38,started:null,elapsed:0,hit:null,passed:false};});
 }
 get speed(){return this.v*3.6;}get distance(){return this.scene.hazard-this.z;}get cueVisible(){return false;}get stopZone(){return false;}
 steer(v){steerVehicle(this,v);}start(){this.phase='running';}release(){releaseVehicle(this);}pause(){if(this.phase==='running')this.phase='paused';this.release();}resume(){if(this.phase==='paused')this.phase='running';}mark(){return false;}observe(){return false;}
 step(dt){advanceFrame(this,dt);}
 stepPhysics(dt){if(this.phase!=='running')return;this.time+=dt;const oldZ=this.z;advanceVehicle(this,dt);this.idle=this.v<.1?this.idle+dt:0;
 if(this.time-this.lastHit>4)this.combo=0;
 for(const a of this.actors){if(a.passed||a.hit)continue;
  const arrival=Math.abs(a.startX-a.targetX)/a.runSpeed;
  if(a.started===null&&a.z-this.z<=Math.max(15,this.v*arrival+3))a.started=this.time;
  if(a.started!==null){a.elapsed=this.time-a.started;a.x=a.startX-a.side*a.runSpeed*a.elapsed;}
  if(this.v>.4&&oldZ+2<=a.z+.65&&this.z+2>=a.z-.65&&Math.abs(a.x-this.x)<.95){
   a.hit={at:this.time,x:a.x,z:a.z,speed:this.speed};a.passed=true;this.lastHit=this.time;this.combo++;this.maxCombo=Math.max(this.maxCombo,this.combo);this.hits++;const points=100*this.combo;this.points+=points;this.events.push({type:'impact',time:this.time,index:a.index,actorId:a.id,combo:this.combo,points,speed:this.speed});
  }
  if(this.z>a.z+4||Math.abs(a.x)>7)a.passed=true;
 }
 if(this.z>=255){this.phase='result';this.release();this.outcome={arcade:true,points:this.points,hits:this.hits,maxCombo:this.maxCombo,seconds:this.time,total:this.actors.length};}
 }
}
