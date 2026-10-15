// Shared by physics and animation. Distances are metres, time is seconds.
export const PREPARE=1.1,ACCEL_TIME=.45,RUN_SPEED=3.2;
export function pedestrianMotion(elapsed){
 const t=Math.max(0,(elapsed??0)-PREPARE),u=Math.min(t,ACCEL_TIME);
 const travel=RUN_SPEED*(u*u/(2*ACCEL_TIME)+Math.max(0,t-ACCEL_TIME));
 return {x:-4.3+travel,travel,speed:RUN_SPEED*Math.min(t/ACCEL_TIME,1),towardCar:travel*.15,runTime:t};
}
export function pedestrianArrival(x=-1.38){return PREPARE+ACCEL_TIME/2+(x+4.3)/RUN_SPEED;}
export function childMotion(elapsed){
 const t=Math.max(0,(elapsed??0)-.65),u=Math.min(t,.3),travel=3.5*(u*u/.6+Math.max(0,t-.3));
 return {x:-3.7+travel,travel,speed:3.5*Math.min(t/.3,1),towardCar:travel*.1,runTime:t};
}
export function childArrival(x=-1.38){return .8+(x+3.7)/3.5;}

// Predict the bumper's arrival using the same acceleration and speed cap as physics.
export const MAX_SPEED=72/3.6;
export function driveAcceleration(input){return input.brake?-6.8:input.gas?3:-.42;}
export function interceptDistance(index,x,v,acceleration){
 const t=index===0?childArrival(x):index===1?pedestrianArrival(x):.85+(5.3-x)/2.2;
 const limit=acceleration>0?MAX_SPEED:0;
 const accelerating=acceleration===0?t:Math.min(t,Math.max(0,(limit-v)/acceleration));
 const end=Math.max(0,Math.min(MAX_SPEED,v+acceleration*accelerating));
 const distance=v*accelerating+.5*acceleration*accelerating*accelerating+end*(t-accelerating);
 const toward=index===0?(x+3.7)*.1:index===1?(x+4.3)*.15:0;
 return distance+2+toward;
}
