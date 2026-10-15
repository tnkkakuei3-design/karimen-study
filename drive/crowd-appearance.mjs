// Stable identities across pool reuse and both renderers.
export const CROWD_STYLES=Object.freeze([
 {name:'grandfather',height:.94,width:.95,shirt:'#839781',pants:'#665f51',hair:'#d8d6cf',skin:'#c99e81',pace:.78,stoop:.14,head:1,bun:false},
 {name:'grandmother',height:.86,width:1.04,shirt:'#a57d9d',pants:'#50485d',hair:'#dcd9d4',skin:'#ddb398',pace:.85,stoop:.12,head:1.04,bun:true},
 {name:'boy',height:.69,width:.82,shirt:'#e2b447',pants:'#466888',hair:'#302b28',skin:'#dcb292',pace:1.25,stoop:0,head:1.18,bun:false},
 {name:'girl',height:.73,width:.8,shirt:'#cb776b',pants:'#586e85',hair:'#45332d',skin:'#e5bda3',pace:1.18,stoop:0,head:1.16,bun:true},
 {name:'man',height:1.05,width:1.08,shirt:'#638ba8',pants:'#343f50',hair:'#332e2b',skin:'#be9275',pace:1,stoop:0,head:1,bun:false},
 {name:'woman',height:.95,width:.91,shirt:'#b16c50',pants:'#45584a',hair:'#594035',skin:'#dab092',pace:1.06,stoop:0,head:1,bun:true}
]);
export const crowdStyle=id=>CROWD_STYLES[id%CROWD_STYLES.length];
