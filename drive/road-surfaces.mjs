// Shared visual and drivable-surface geometry (metres). Curbs slow, never block.
export const ROAD_SURFACES=[];
export const ROAD_DETAILS=[];
// Twelve-metre intersection openings preserve crosswalks and turning space.
for(const street of [-120,0,120])for(const alongZ of [true,false])for(const side of [-1,1])for(const [a,b] of [[-146,-134],[-106,-14],[14,106],[134,146]]){
 const mid=(a+b)/2,len=b-a;
 const rect=(offset,width,y,h,color,kind)=>({x:alongZ?street+side*offset:mid,z:alongZ?mid:street+side*offset,w:alongZ?width:len,d:alongZ?len:width,y,h,color,kind});
 ROAD_SURFACES.push(rect(9,1.7,.2,.3,0xc8c2ae,'sidewalk'),rect(8.08,.16,.25,.36,0xe4ded1,'curb'));
 ROAD_DETAILS.push(rect(7.8,.32,.15,.025,0x697777,'drain'));
 // Narrow seams break up long kerbs without changing the drivable surface.
 for(let n=a+1;n<b;n+=2)ROAD_DETAILS.push({x:alongZ?street+side*8.08:n,z:alongZ?n:street+side*8.08,w:alongZ?.165:.018,d:alongZ?.018:.165,y:.435,h:.008,color:0x92968e,kind:'curb-joint'});

 for(let n=a+3;n<b;n+=12){
  ROAD_DETAILS.push({x:alongZ?street+side*7.8:n,z:alongZ?n:street+side*7.8,w:alongZ?.32:.55,d:alongZ?.55:.32,y:.18,h:.025,color:0x424e4c});
  for(const offset of [-.18,-.06,.06,.18])ROAD_DETAILS.push({x:alongZ?street+side*7.8:n+offset,z:alongZ?n+offset:street+side*7.8,w:alongZ?.25:.035,d:alongZ?.035:.25,y:.198,h:.008,color:0x92968e,kind:'grate-bar'});
 }
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
export function addRoadSurfaces(box){for(const s of [...ROAD_SURFACES,...ROAD_DETAILS])box(s.x,s.y,s.z,s.w,s.h,s.d,s.color);}
