import {advanceVehicle,steerVehicle,releaseVehicle} from './vehicle.mjs?v=20261015-cockpit1';
import {pedestrianMotion,childMotion,interceptDistance} from './pedestrian-motion.mjs?v=090';
export const SCENES = [
  {id:'parked',number:'01',name:'車の陰に、誰かいる？',area:'住宅街',level:'基本',duration:'約30秒',title:'駐車車両の陰',desc:'見えない場所を予測して、余裕を持って止まろう。',hazard:88,cue:60,trigger:26,line:4,initialSpeed:24,actor:'child',target:'van',clue:'駐車車両の向こう側は、見えていません。',lesson:'車の陰には、歩行者や自転車がいるかもしれません。姿が見える前から速度を落とし、いつでも止まれるように備えましょう。',point:'「見えない」ことも、危険の手がかり。',color:'#e7ad50'},
  {id:'crosswalk',number:'02',name:'渡りたい人、見えてる？',area:'横断歩道',level:'基本',duration:'約30秒',title:'横断歩道の歩行者',desc:'横断しようとしている人を見つけて、手前で停止。',hazard:94,cue:65,trigger:26,line:6,initialSpeed:27,actor:'adult',target:'person',clue:'左側の歩行者は、横断歩道の方を向いています。',lesson:'横断しようとしている歩行者がいたら、横断歩道の手前で一時停止して進路を譲ります。歩行者だけでなく、周囲の状況も確認しましょう。',point:'道路に出てくる前に、渡りたい人を見つける。',color:'#799dca'},
  {id:'intersection',number:'03',name:'その交差点、見えてる？',area:'一時停止の交差点',level:'応用',duration:'約40秒',title:'見通しの悪い交差点',desc:'停止線でしっかり止まり、左右の安全を確かめよう。',hazard:100,cue:70,trigger:39,line:7,initialSpeed:25,actor:'bike',target:'corner',clue:'「止まれ」と、右側の建物の陰を確認しましょう。',lesson:'一時停止の標識がある交差点では、停止線の直前で一時停止し、交差する道路の安全を確認します。見通しが悪い場合は、止まった後も慎重に進んで確認を続けましょう。',point:'止まることと、安全を確かめることはセット。',color:'#7ba790'}
];

export const HAZARD_REVIEWS=[
 {question:'駐車車両のそばでは、何に備える必要がありましたか？',options:['車の陰から人が出てくること','前の車が見えなくなることだけ','道路の先にある建物の高さ'],correct:0},
 {question:'横断歩道に近づくとき、何に備える必要がありましたか？',options:['横断歩道をすばやく通り過ぎること','歩行者が横断を始めること','後ろの車に道を譲ることだけ'],correct:1},
 {question:'見通しの悪い交差点では、何に備える必要がありましたか？',options:['正面の道路がまっすぐ続くこと','後ろから来る車だけ','建物の陰から自転車などが出てくること'],correct:2}
];
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
// Consume the whole frame interval. Small physics steps retain collision accuracy
// without slowing the world down when rendering falls below 20 FPS.
export function advanceFrame(drive,dt){
  if(!Number.isFinite(dt)||dt<=0||drive.phase!=='running')return;
  const count=Math.ceil(dt/(1/120)),step=dt/count;
  for(let i=0;i<count&&drive.phase==='running';i++)drive.stepPhysics(step);
}
export class Drive {
  constructor(index=0,guided=true){
    this.index=index;this.scene=SCENES[index];this.guided=guided;this.time=0;this.z=0;this.v=this.scene.initialSpeed/3.6;
    this.x=-1.38;this.lane=0;this.steering=0;this.phase='ready';this.input={brake:false,gas:false};this.detected=null;this.firstBrake=null;this.slowedEarly=false;this.slowedLate=false;this.waitInterrupted=false;this.waitedForCrossing=false;this.events=[];
    this.eventTime=null;this.actorX=this.scene.actor==='bike'?5.3:-5.05;this.actorClear=false;this.stopHold=0;
    this.impact=null;this.missedLine=false;this.stopped=false;this.stopDistance=null;this.checks={left:false,right:false};this.closest=Infinity;this.idle=0;this.outcome=null;
  }
  get distance(){return this.scene.hazard-this.z;}
  get speed(){return this.v*3.6;}
  get cueVisible(){return this.distance<=this.scene.cue;}
  get actorVisible(){return this.scene.actor==='adult'||(this.eventTime!==null&&this.eventTime>0.85);}
  get stopZone(){return this.distance>=this.scene.line&&(this.scene.id==='intersection'?this.distance<=this.scene.line+5:this.distance<=this.scene.cue);}
  steer(direction){steerVehicle(this,direction);}
  start(){this.phase='running';}
  pause(){if(this.phase==='running')this.phase='paused';this.release();}
  resume(){if(this.phase==='paused')this.phase='running';}
  release(){releaseVehicle(this);}
  // Recognition is assessed after driving; touching the road never affects the score.
  mark(){return false;}
  answerReview(choice){
    const q=HAZARD_REVIEWS[this.index],out=this.outcome;
    if(this.phase!=='result'||!out||out.reviewAnswered||!Number.isInteger(choice)||choice<0||choice>=q.options.length)return false;
    out.reviewAnswered=true;out.reviewChoice=choice;out.reviewCorrect=choice===q.correct;
    out.detection=out.reviewCorrect?30:0;
    out.score=out.detection+out.anticipation+out.stopping+out.confirmation;
    out.rank=!out.safe?'もう一度':out.score>=90?'S':out.score>=75?'A':out.score>=60?'B':'もう一度';
    return true;
  }
  observe(side){
    if(this.phase!=='running'||!['left','right'].includes(side)||this.checks[side]||this.scene.id!=='intersection'||!this.stopped||!this.stopZone||this.missedLine||this.v>=0.25)return false;
    this.checks[side]=true;this.events.push({type:'check',time:this.time,distance:this.distance,label:side==='left'?'左を確認':'右を確認'});return true;
  }
  step(dt){advanceFrame(this,dt);}
  stepPhysics(dt){
    if(this.phase!=='running')return;
    this.time+=dt;if(this.impact){this.v=0;if(this.time-this.impact.at>2.2)this.finish(false,'接触しました');return;}const previousZ=this.z;
    if(this.input.brake&&this.firstBrake===null&&this.cueVisible){this.firstBrake={time:this.time,distance:this.distance,speed:this.speed,beforeAppearance:this.eventTime===null||this.eventTime<0.85};this.events.push({type:'brake',time:this.time,distance:this.distance,label:'ブレーキ開始'});}
    const a=advanceVehicle(this,dt),target=this.x;
    // Award braking only after a real speed reduction, not a momentary press.
    if(this.firstBrake&&this.speed<=Math.max(0.9,this.firstBrake.speed-3)){
      const early=this.eventTime===null||this.eventTime<(this.scene.actor==='adult'?1.4:0.85);
      if(early)this.slowedEarly=true;else this.slowedLate=true;
    }
    if(this.stopped&&!this.actorClear&&this.v>=0.25)this.waitInterrupted=true;
    this.idle=this.v<0.1?this.idle+dt:0;
    if(this.eventTime===null&&(this.distance<=interceptDistance(this.index,target,this.v,a)||(this.stopZone&&this.v<0.25)))this.eventTime=0;
    if(this.eventTime!==null){
      this.eventTime+=dt;
      const elapsed=Math.max(0,this.eventTime-(this.scene.actor==='adult'?1.4:0.85));
      this.actorX=this.scene.actor==='bike'?5.3-elapsed*2.2:-5.05+elapsed*1.65;
      if(this.index===0){const motion=childMotion(this.eventTime);this.actorX=(motion.x+3.7)/.86-5.05;}
      if(this.index===1){const motion=pedestrianMotion(this.eventTime);this.actorX=(motion.x+4.3)/.91-5.05;}
      this.actorClear=this.scene.actor==='bike'?this.actorX < -4.8:this.actorX > 4.8;
    }
    if(this.v<0.25&&this.stopZone){
      this.stopHold+=dt;
      if(this.stopHold>=0.8&&!this.stopped){this.stopped=true;this.stopDistance=this.distance;this.events.push({type:'stop',time:this.time,distance:this.distance,label:'停止'});}
    }else this.stopHold=0;
    if(this.distance<this.scene.line)this.missedLine=true;
    if(this.scene.id!=='intersection'&&this.stopped&&this.actorClear&&!this.waitInterrupted&&!this.missedLine&&this.v<0.25)this.waitedForCrossing=true;
    const actorWorldX=this.index===0?-3.7+Math.max(0,this.actorX+5.05)*.86:this.index===1?-4.3+Math.max(0,this.actorX+5.05)*.91:this.actorX;
    const actorZ=this.scene.hazard-(this.index===0?childMotion(this.eventTime).towardCar:this.index===1?pedestrianMotion(this.eventTime).towardCar:0);
    if(!this.actorClear&&this.v>.4&&previousZ+2<=actorZ+.65&&this.z+2>=actorZ-.65&&Math.abs(actorWorldX-this.x)<(this.index===2?1.35:.95)){this.impact={at:this.time,x:actorWorldX,z:actorZ,speed:this.speed};this.events.push({type:'impact',time:this.time,distance:this.distance,label:'接触'});this.v=0;this.release();return;}
    if(this.missedLine&&(this.distance < -4||this.v<.1)){this.finish(false,this.scene.id==='intersection'?'停止線を越えました':'止まる余裕が足りませんでした');return;}
    if(!this.missedLine&&this.stopped&&this.actorClear&&this.v<0.25&&(this.scene.id!=='intersection'||(this.checks.left&&this.checks.right))){this.finish(true,'安全に止まれました');}
  }
  finish(safe,reason){
    if(this.outcome)return;
    this.phase='result';this.release();
    const detection=0;
    const anticipation=this.slowedEarly?30:this.slowedLate?18:0;
    const stopping=this.stopped?30:0;
    const confirmation=this.scene.id==='intersection'?5*(Number(this.checks.left)+Number(this.checks.right)):(this.waitedForCrossing?10:0);
    const score=detection+anticipation+stopping+confirmation;
    this.outcome={safe,reason,score,detection,anticipation,stopping,confirmation,rank:!safe?'もう一度':score>=90?'S':score>=75?'A':score>=60?'B':'もう一度',events:this.events.map(e=>({...e})),seconds:this.time,stopDistance:this.stopDistance};
  }
}
