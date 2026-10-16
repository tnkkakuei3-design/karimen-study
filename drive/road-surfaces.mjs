// Shared visual and drivable-surface geometry (metres). Curbs slow, never block.
export const ROAD_SURFACES=[];
for(const side of [-1,1])for(const [a,b] of [[-108,-14],[14,108]]){
 const z=(a+b)/2,d=b-a;
 ROAD_SURFACES.push({x:side*9,z,w:1.7,d,y:.2,h:.3,color:0xc8c2ae,kind:'sidewalk'},
 {x:side*8.08,z,w:.16,d,y:.25,h:.36,color:0xe4ded1,kind:'curb'});
}
ROAD_SURFACES.push({x:140,z:0,w:10,d:286,y:.17,h:.15,color:0xd8ceb0,kind:'sidewalk'},
 {x:133.2,z:0,w:.25,d:286,y:.22,h:.3,color:0xe4ded1,kind:'curb'});
export function wheelSurface(x,z,heading){
 const sin=Math.sin(heading),cos=Math.cos(heading);let result='road';
 for(const side of [-.94,.94])for(const forward of [-1.25,1.25]){
  const wx=x+cos*side+sin*forward,wz=z+sin*side-cos*forward;
  for(const s of ROAD_SURFACES)if(Math.abs(wx-s.x)<=s.w/2+.12&&Math.abs(wz-s.z)<=s.d/2+.12){
   if(s.kind==='curb')return 'curb';result='sidewalk';
  }
 }
 return result;
}
export function addRoadSurfaces(box){for(const s of ROAD_SURFACES)box(s.x,s.y,s.z,s.w,s.h,s.d,s.color);}
