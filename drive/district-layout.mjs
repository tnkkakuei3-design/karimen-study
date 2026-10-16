export const COAST_BENCHES=[-80,-40,20,60,100].map(z=>({x:142,z,w:1.15,d:2.5,kind:'bench'}));
export function houseFront(b){const alongZ=Math.abs(b.lotZ??b.z)===90,sign=alongZ?Math.sign(b.z):Math.sign(b.x);return{alongZ,sign,point:(u,out)=>alongZ?{x:b.x+u,z:b.z+sign*(9+out)}:{x:b.x+sign*(9+out),z:b.z+u}};}
export function districtProps(buildings){
 const props=[...COAST_BENCHES,...[-100,-60,-20,20,60,100].map(z=>({x:145,z,w:.12,d:.12,kind:'lamp'}))];
 for(const b of buildings){if(b.x===30)continue;const outer=Math.abs(b.lotX??b.x)===90||Math.abs(b.lotZ??b.z)===90,f=houseFront(b),out=outer?10:5;
  if(outer)for(const u of [-7,7])props.push({...f.point(u,6),w:2.3,d:2.3,kind:'planter'});
  for(const u of [-5,5])props.push({...f.point(u,out),w:f.alongZ?6:.25,d:f.alongZ?.25:6,kind:'wall'});
  props.push({...f.point(1.9,out-.1),w:.45,d:.45,kind:'mailbox'});
 }return props;
}
