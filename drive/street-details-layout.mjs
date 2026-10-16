export const STOP_APPROACHES=[-120,0,120].flatMap(x=>[-120,0,120].flatMap(z=>[-1,1].map(side=>({x,z,side,lineX:x-side*4,lineZ:z+side*14.5,postX:x-side*9.5,postZ:z+side*15}))));
export const PARKING={x:-32,z:62,w:26,d:60,stalls:[42,47,52,57,62,67,72,77,82]};
export const STREET_DETAIL_SOLIDS=[{x:-43,z:62,w:.14,d:.14,kind:'parking-post'},...STOP_APPROACHES.map(p=>({x:p.postX,z:p.postZ,w:.14,d:.14,kind:'stop-post'})),...PARKING.stalls.map(z=>({x:-41,z,w:.22,d:1.8,kind:'wheel-stop'}))];
