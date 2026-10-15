// Lightweight, assisted bicycle model. SI units; shared by every course.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const follow=(from,to,dt,tau)=>from+(to-from)*(-Math.expm1(-dt/tau));
export function steerVehicle(car,value){if(car.phase==='running')car.input.steer=clamp(Number(value)||0,-1,1);}
export function releaseVehicle(car){car.input.brake=car.input.gas=false;car.input.steer=0;car.throttle=car.brakePressure=0;}
export function advanceVehicle(car,dt){
 car.steering=follow(car.steering||0,car.input.steer||0,dt,.12);
 car.throttle=follow(car.throttle||0,car.input.gas&&!car.input.brake?1:0,dt,.32);
 car.brakePressure=follow(car.brakePressure||0,car.input.brake?1:0,dt,car.input.brake?.07:.12);
 const v=car.v,drag=.22+.012*v+.0015*v*v;
 const a=car.throttle*(3.25-.055*v)-drag-car.brakePressure*6.8;
 car.v=clamp(v+a*dt,0,72/3.6);car.acceleration=(car.v-v)/dt;
 car.bodyPitch=follow(car.bodyPitch||0,car.acceleration*.0035,dt,.22);
 // Speed-sensitive steering and gentle heading assistance keep touch controls manageable.
 const wheelAngle=car.steering*.42/(1+v*.16);
 car.heading=clamp((car.heading||0)+((v/2.65)*Math.tan(wheelAngle)-(car.heading||0)*1.8)*dt,-.28,.28);
 const distance=(v+car.v)*.5*dt;
 car.x+=Math.sin(car.heading)*distance;car.z+=Math.cos(car.heading)*distance;
 // A soft road-edge constraint avoids abrupt lane snaps or leaving the rendered road.
 if(Math.abs(car.x)>2.45){car.x=clamp(car.x,-2.45,2.45);if(Math.sign(car.heading)===Math.sign(car.x))car.heading=0;}
 car.lane=car.x>0?1:0;
 return a;
}
