// Stylized, non-graphic impact motion shared by both renderers.
export function impactMotion(elapsed,speed=24){
 const power=Math.max(0,Math.min(1,(Number(speed)||0)/72)),t=Math.max(0,Math.min(2.5,elapsed));
 const launch=.8+power*7,air=Math.min(t,launch/4.5),landed=t>air;
 return{x:air*(.3+power*3),y:Math.max(0,launch*air-4.5*air*air),z:air*(.6+power*10),roll:air*(power<.18?.45:2+power*7),pitch:air*(.2+power*4),power,landed};
}
