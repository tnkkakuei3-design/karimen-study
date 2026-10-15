import {pedestrianMotion,childMotion,MAX_SPEED,driveAcceleration,interceptDistance} from './pedestrian-motion.mjs?v=090';
import {SCENES,clamp,advanceFrame} from './engine.mjs?v=090';
export const ROUTE=[{index:0,z:88},{index:1,z:154},{index:2,z:220}];
export class ArcadeDrive {
 constructor(){this.index=3;this.arcade=true;this.guided=false;this.scene={id:'arcade',number:'04',title:'3場面・連続ドライブ',name:'3つの場面を、ひと続きに。',desc:'アクセルとブレーキで走るフリーゲーム。接触でキャラクターが吹き飛び、連続するとコンボが増えます。',area:'連続コース',hazard:255,initialSpeed:24};this.phase='ready';this.z=0;this.x=-1.38;this.lane=0;this.steering=0;this.v=24/3.6;this.time=0;this.input={gas:false,brake:false};this.events=[];this.combo=0;this.maxCombo=0;this.hits=0;this.points=0;this.outcome=null;this.detected=null;this.actorClear=false;this.checks={left:false,right:false};this.idle=0;this.actors=ROUTE.map(r=>({...r,started:null,elapsed:0,x:r.index===2?5.3:r.index===0?-3.7:-4.3,hit:null,passed:false}));}
 get speed(){return this.v*3.6;}get distance(){return this.scene.hazard-this.z;}get cueVisible(){return false;}get stopZone(){return false;}
 steer(direction){if(this.phase!=='running')return;this.lane=direction>0?1:0;}
 start(){this.phase='running';}release(){this.input.gas=this.input.brake=false;this.steering=0;}pause(){if(this.phase==='running')this.phase='paused';this.release();}resume(){if(this.phase==='paused')this.phase='running';}mark(){return false;}observe(){return false;}
 step(dt){advanceFrame(this,dt);}
 stepPhysics(dt){if(this.phase!=='running')return;this.time+=dt;const oldZ=this.z,oldV=this.v;const target=this.lane?1.38:-1.38,shift=clamp(target-this.x,-Math.min(2.8,this.v*.3)*dt,Math.min(2.8,this.v*.3)*dt);this.x+=shift;this.steering=dt>0?shift/dt/2.8:0;this.v=clamp(this.v+driveAcceleration(this.input)*dt,0,MAX_SPEED);this.z+=(oldV+this.v)*.5*dt;this.idle=this.v<.1?this.idle+dt:0;
  for(const a of this.actors){const distance=a.z-this.z,velocity=a.index===2?-2.2:1.5,delay=a.index===2?.85:.7;
   if(a.started===null&&distance<=interceptDistance(a.index,target,this.v,driveAcceleration(this.input)))a.started=this.time;
   if(a.started!==null&&!a.hit){a.elapsed=this.time-a.started;a.x=(a.index===2?5.3:a.index===0?-3.7:-4.3)+Math.max(0,a.elapsed-delay)*velocity;}
   if(a.index<2&&!a.hit){const motion=(a.index===0?childMotion:pedestrianMotion)(a.started===null?null:a.elapsed);a.x=motion.x;a.currentZ=a.z-motion.towardCar;}
   const actorZ=a.currentZ??a.z;
   // Swept longitudinal crossing uses the front bumper, never distance-only hits.
   if(!a.hit&&!a.passed&&this.v>.4&&oldZ+2<=actorZ+.65&&this.z+2>=actorZ-.65&&Math.abs(a.x-this.x)<(a.index===2?1.35:.95)){
    a.hit={at:this.time,x:a.x,z:actorZ,speed:this.speed};this.combo++;this.maxCombo=Math.max(this.maxCombo,this.combo);this.hits++;this.points+=100*this.combo;this.events.push({type:'impact',time:this.time,index:a.index,combo:this.combo});
   }
   if(!a.passed&&this.z>a.z+4){a.passed=true;if(!a.hit)this.combo=0;}
  }
  if(this.z>=255){this.phase='result';this.release();this.outcome={arcade:true,points:this.points,hits:this.hits,maxCombo:this.maxCombo,seconds:this.time};}
 }
}
