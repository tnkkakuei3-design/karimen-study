import {clamp} from './engine.mjs?v=090';
const COLORS={sky:'#dcebf0',skyTop:'#b5d5e4',road:'#7f9098',edge:'#f8f4e7',pavement:'#dadbd2',grass:'#a7bda7',ink:'#18374b'};
export class Renderer{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.w=1;this.h=1;this.hits=[];this.pan=0;}
 size(){const b=this.canvas.getBoundingClientRect();const w=Math.max(1,b.width),h=Math.max(1,b.height),dpr=Math.min(globalThis.devicePixelRatio||1,2);if(this.canvas.width!==Math.round(w*dpr)||this.canvas.height!==Math.round(h*dpr)){this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);}this.w=w;this.h=h;this.ctx.setTransform(dpr,0,0,dpr,0,0);}
 project(x,z,y=0){const d=z-this.pos+4;return{x:this.w*.5+(x-(this.cameraX??-1.65))*this.focal/d+this.pan*this.w*.3,y:this.horizon+(1.6-y)*this.focal/d,s:this.focal/d,d};}
 poly(points,color,stroke){let c=this.ctx;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=.6;c.stroke();}}
 ground(x1,x2,z1,z2,color){if(z2<this.pos-1)return;z1=Math.max(z1,this.pos-1);this.poly([this.project(x1,z1),this.project(x2,z1),this.project(x2,z2),this.project(x1,z2)],color);}
 box(x,z,width,depth,height,front,side,top){
   if(z<this.pos-2||z>this.pos+200)return null;
   const a=this.project(x-width/2,z,0),b=this.project(x+width/2,z,0),c=this.project(x+width/2,z+depth,0),d=this.project(x-width/2,z+depth,0);
   const A=this.project(x-width/2,z,height),B=this.project(x+width/2,z,height),C=this.project(x+width/2,z+depth,height),D=this.project(x-width/2,z+depth,height);
   this.poly([a,d,D,A],side);this.poly([b,c,C,B],side);this.poly([A,B,C,D],top);this.poly([a,b,B,A],front);
   return{a,b,c,d,A,B,C,D,x:Math.min(a.x,b.x,A.x,B.x),y:Math.min(A.y,B.y,C.y,D.y),w:Math.abs(b.x-a.x),h:a.y-Math.min(A.y,C.y),s:a.s};
 }
 house(x,z,variant=0,tall=0){
   const palettes=[['#e9e1ce','#ccc9b9','#9c8f7e'],['#e9e7df','#c0ccc8','#78938a'],['#c7d4d4','#a6b9bd','#66858e'],['#ead5ba','#c9b69e','#a78f79']];
   const p=palettes[variant%4],h=4.4+tall,box=this.box(x,z,5.8,7.3,h,...p);if(!box)return;
   for(let floor=0;floor<(tall>0?3:2);floor++)for(let col=0;col<3;col++){
     const xx=x-1.9+col*1.8,yy=1+floor*1.6;
     this.poly([this.project(xx-.5,z-.02,yy),this.project(xx+.5,z-.02,yy),this.project(xx+.5,z-.02,yy+.9),this.project(xx-.5,z-.02,yy+.9)],'#7c9da9');
     this.poly([this.project(xx-.5,z-.03,yy+.4),this.project(xx+.5,z-.03,yy+.4),this.project(xx+.5,z-.03,yy+.47),this.project(xx-.5,z-.03,yy+.47)],'#dfe7e5');
   }
   this.poly([this.project(x-3,z-.12,h),this.project(x+3,z-.12,h),this.project(x+3,z-.12,h+.2),this.project(x-3,z-.12,h+.2)],p[2]);
   if(x<0)this.box(x+2.8,z-1,1,2,.9,'#9baa8c','#899d80','#b3c29f');
 }
 tree(x,z,variant=0){const p=this.project(x,z),c=this.ctx,s=p.s;if(p.d<3||p.d>200)return;c.fillStyle='#8e8674';c.fillRect(p.x-s*.12,p.y-s*3.3,s*.24,s*3.3);const shades=['#84a98a','#789c80','#98b495'];c.fillStyle=shades[variant%3];c.beginPath();c.ellipse(p.x,p.y-s*3.2,s*1.25,s*1.55,0,0,Math.PI*2);c.fill();c.fillStyle='#b0c6a3';c.beginPath();c.ellipse(p.x-s*.3,p.y-s*3.65,s*.75,s*.9,-.4,0,Math.PI*2);c.fill();}
 pole(x,z){const p=this.project(x,z),q=this.project(x,z,7),c=this.ctx;if(p.d<4)return;c.strokeStyle='#9da9a7';c.lineWidth=Math.max(1,p.s*.12);c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.lineTo(q.x+(x<0?1:-1)*p.s*1.3,q.y);c.stroke();}
 van(x,z){
   const p=this.project(x,z),c=this.ctx,s=p.s;
   this.ground(x-1.1,x+1.2,z-.2,z+4.5,'#687e8240');
   const b=this.box(x,z,1.9,4.2,2.35,'#f3f0df','#d9d9ce','#ffffef');if(!b)return;
   this.poly([this.project(x-.74,z-.02,1.1),this.project(x+.74,z-.02,1.1),this.project(x+.74,z-.02,2.03),this.project(x-.74,z-.02,2.03)],'#73909f');
   c.strokeStyle='#e8e7dd';c.lineWidth=Math.max(1,s*.035);c.beginPath();let A=this.project(x,z-.03,.5),B=this.project(x,z-.03,2.03);c.moveTo(A.x,A.y);c.lineTo(B.x,B.y);c.stroke();
   for(const xx of [x-.83,x+.83]){const q=this.project(xx,z-.02,.45);c.fillStyle='#ce7267';c.fillRect(q.x-s*.08,q.y-s*.2,s*.15,s*.28);c.fillStyle='#263b46';c.fillRect(q.x-s*.14,p.y-s*.25,s*.23,s*.35);}
   const plate=this.project(x,z-.05,.42);c.fillStyle='#e4d8a2';c.fillRect(plate.x-s*.27,plate.y-s*.12,s*.54,s*.21);
   this.hits.push({type:'van',x:b.x-7,y:b.y-6,w:b.w+14,h:b.h+13});
 }
 person(x,z,type,time){
   const p=this.project(x,z),c=this.ctx,s=p.s,child=type==='child',h=child?1.18:1.7;
   if(p.d<2||p.d>200)return;
   const walk=Math.sin(time*6.5)*.22;c.fillStyle='#203f5130';c.beginPath();c.ellipse(p.x,p.y,s*.45,s*.12,0,0,Math.PI*2);c.fill();
   c.lineCap='round';c.strokeStyle='#334857';c.lineWidth=Math.max(2,s*.12);c.beginPath();c.moveTo(p.x,p.y-s*h*.45);c.lineTo(p.x+s*walk,p.y-s*.06);c.moveTo(p.x,p.y-s*h*.45);c.lineTo(p.x-s*walk,p.y-s*.06);c.stroke();
   c.strokeStyle=child?'#daa64c':'#b76f60';c.lineWidth=s*.29;c.beginPath();c.moveTo(p.x,p.y-s*h*.75);c.lineTo(p.x,p.y-s*h*.4);c.stroke();
   c.lineWidth=s*.08;c.beginPath();c.moveTo(p.x-s*.08,p.y-s*h*.7);c.lineTo(p.x-s*.23,p.y-s*h*.45+s*walk);c.moveTo(p.x+s*.08,p.y-s*h*.7);c.lineTo(p.x+s*.25,p.y-s*h*.45-s*walk);c.stroke();
   c.fillStyle='#e7b89a';c.beginPath();c.arc(p.x,p.y-s*h*.88,s*.17,0,Math.PI*2);c.fill();c.fillStyle=child?'#efcc67':'#453f3b';c.beginPath();c.ellipse(p.x,p.y-s*h*.96,s*.2,s*.09,0,Math.PI,Math.PI*2);c.fill();
   if(child){c.fillStyle='#e8ba59';c.fillRect(p.x-s*.26,p.y-s*h*.95,s*.52,s*.035);}
   this.hits.push({type:'person',x:p.x-s*.4-12,y:p.y-s*h-12,w:s*.8+24,h:s*h+25});
 }
 bike(x,z,time){
   const p=this.project(x,z),s=p.s,c=this.ctx;if(p.d<2)return;
   c.strokeStyle='#344e5c';c.lineWidth=Math.max(1,s*.035);
   for(const dx of [-.64,.64]){c.beginPath();c.arc(p.x+dx*s,p.y-.35*s,.34*s,0,Math.PI*2);c.stroke();}
   c.strokeStyle='#a2664e';c.lineWidth=Math.max(1,s*.055);c.beginPath();c.moveTo(p.x-.64*s,p.y-.35*s);c.lineTo(p.x-.25*s,p.y-.86*s);c.lineTo(p.x+.25*s,p.y-.35*s);c.lineTo(p.x-.64*s,p.y-.35*s);c.lineTo(p.x+.15*s,p.y-.91*s);c.lineTo(p.x+.64*s,p.y-.35*s);c.moveTo(p.x+.15*s,p.y-.91*s);c.lineTo(p.x+.22*s,p.y-1.12*s);c.stroke();
   c.strokeStyle='#334857';c.lineWidth=s*.12;c.beginPath();c.moveTo(p.x-.25*s,p.y-.95*s);c.lineTo(p.x-.02*s,p.y-.65*s);c.lineTo(p.x-.22*s,p.y-.37*s);c.stroke();
   c.strokeStyle='#658d92';c.lineWidth=s*.25;c.beginPath();c.moveTo(p.x-.33*s,p.y-1.45*s);c.lineTo(p.x-.25*s,p.y-.95*s);c.stroke();c.lineWidth=s*.09;c.beginPath();c.moveTo(p.x-.28*s,p.y-1.4*s);c.lineTo(p.x+.22*s,p.y-1.12*s);c.stroke();
   c.fillStyle='#dfb699';c.beginPath();c.arc(p.x-.31*s,p.y-1.68*s,.16*s,0,Math.PI*2);c.fill();c.fillStyle='#e4e9e5';c.beginPath();c.ellipse(p.x-.31*s,p.y-1.77*s,.2*s,.1*s,0,Math.PI,Math.PI*2);c.fill();
   this.hits.push({type:'person',x:p.x-s-6,y:p.y-1.9*s,w:2*s+12,h:1.9*s+10});
 }
 sign(x,z,stop=false){
   const p=this.project(x,z),c=this.ctx,s=p.s;if(p.d<3)return;
   c.fillStyle='#a6afaa';c.fillRect(p.x-s*.04,p.y-s*3.1,s*.08,s*3.1);
   if(stop){
     this.poly([{x:p.x-s*.55,y:p.y-s*3.1},{x:p.x+s*.55,y:p.y-s*3.1},{x:p.x,y:p.y-s*2.2}],'#fbf6e9');
     this.poly([{x:p.x-s*.48,y:p.y-s*3.04},{x:p.x+s*.48,y:p.y-s*3.04},{x:p.x,y:p.y-s*2.29}],'#bf5a51');
     if(s>15){c.font=`700 ${Math.max(6,s*.17)}px sans-serif`;c.textAlign='center';c.fillStyle='#fff';c.fillText('止まれ',p.x,p.y-s*2.78);}
     this.hits.push({type:'corner',x:p.x-s*.6-8,y:p.y-s*3.2-8,w:s*1.2+16,h:s*1.1+16});
   }else{c.fillStyle='#4d82ac';c.fillRect(p.x-s*.5,p.y-s*3.1,s,s*.9);this.poly([{x:p.x-s*.4,y:p.y-s*2.28},{x:p.x+s*.4,y:p.y-s*2.28},{x:p.x,y:p.y-s*3.02}],'#f4f2e6');}
 }
 marker(hit,label){const c=this.ctx,x=hit.x+hit.w/2,y=hit.y+hit.h*.38;if(x<-60||x>this.w+60)return;c.strokeStyle='#e4aa43';c.lineWidth=2;c.setLineDash([5,4]);c.beginPath();c.ellipse(x,y,Math.max(22,hit.w*.58),Math.max(24,hit.h*.57),0,0,Math.PI*2);c.stroke();c.setLineDash([]);const ly=clamp(hit.y-22,42,this.h-100),lx=clamp(x,65,this.w-65);c.font='700 11px sans-serif';c.textAlign='center';const tw=c.measureText(label).width+22;c.fillStyle='#fffcf1';c.beginPath();c.roundRect(lx-tw/2,ly-15,tw,24,5);c.fill();c.fillStyle='#815e1f';c.fillText(label,lx,ly+1);}
 render(drive,{hero=false,highlight=false,thumbnail=false,pan=0}={}){
   this.size();let c=this.ctx,w=this.w,h=this.h;this.pos=drive.z;this.cameraX=drive.x;this.pan=pan;this.focal=Math.min(w*1.65,Math.max(w*.85,h*1.45));this.horizon=h*(hero?.31:.34);this.hits=[];
   const grad=c.createLinearGradient(0,0,0,this.horizon);grad.addColorStop(0,COLORS.skyTop);grad.addColorStop(1,COLORS.sky);c.fillStyle=grad;c.fillRect(0,0,w,h);
   c.fillStyle='#f8f8eb9c';for(const cloud of [{x:.19,y:.13,r:.05},{x:.7,y:.09,r:.035}]){c.beginPath();c.ellipse(w*cloud.x,h*cloud.y,w*cloud.r,w*cloud.r*.26,0,0,Math.PI*2);c.fill();}
   c.fillStyle='#bdcfca';c.fillRect(0,this.horizon-5,w,h);c.fillStyle=COLORS.pavement;c.fillRect(0,this.horizon,w,h);
   this.ground(-3.3,3.3,this.pos-1,this.pos+350,COLORS.road);
   for(let z=Math.floor((this.pos-2)/8)*8;z<this.pos+170;z+=8){this.ground(-3.3,3.3,z,z+4,'#ffffff04');this.ground(-.055,.055,z,z+3.6,'#f7f1d9');}
   this.ground(-3.4,-3.29,this.pos-1,this.pos+250,'#eee9d8');this.ground(3.29,3.4,this.pos-1,this.pos+250,'#eee9d8');
   this.ground(-5.4,-5.3,this.pos-1,this.pos+200,'#bbc3b9');this.ground(5.3,5.4,this.pos-1,this.pos+200,'#bbc3b9');
   const sc=drive.scene,hh=sc.hazard,objects=[];
   if(sc.id==='crosswalk'){
     for(let x=-3.1;x<3.2;x+=.72)this.ground(x,x+.44,hh-2,hh+2,'#f8f5e9');
     this.ground(-3.2,-.1,hh-6.25,hh-5.8,'#fff9e7');
     for(const z of [hh-24,hh-41]){if(z<this.pos+2)continue;this.poly([this.project(-1.65,z-2),this.project(-.85,z),this.project(-1.65,z+2),this.project(-2.45,z)],'#e9e8dc');this.poly([this.project(-1.65,z-1.25),this.project(-1.18,z),this.project(-1.65,z+1.25),this.project(-2.12,z)],COLORS.road);}
     objects.push({z:hh+2,draw:()=>this.sign(-4.1,hh+2)});
   }
   if(sc.id==='intersection'){
     this.ground(-60,60,hh-3.5,hh+3.5,COLORS.road);
     this.ground(-3.3,-.1,hh-7.35,hh-7,'#fff7e6');
     objects.push({z:hh-8,draw:()=>this.sign(-4,hh-8,true)});
     objects.push({z:hh-8,draw:()=>{const b=this.box(6.4,hh-8,5.6,7,3.7,'#d2d5cb','#bcc8bf','#869e90');if(b)this.hits.push({type:'corner',x:b.x,y:b.y,w:b.w,h:b.h});}});
   }
   for(let z=12;z<this.pos+180;z+=16){
     if(z+7<this.pos)continue;const n=Math.floor(z/16);
     if(Math.abs(z-hh)>15){objects.push({z,draw:()=>this.house(-8.3,z,n%4)});objects.push({z:z+3,draw:()=>this.house(8.4,z+3,(n+2)%4,n%3===0?1.4:0)});}
     if(Math.abs(z-hh)>13){objects.push({z:z-2,draw:()=>this.tree(n%2===0?-5.3:5.2,z-2,n)});}
     if(n%3===0)objects.push({z:z+4,draw:()=>this.pole(n%2?-5:5,z+4)});
   }
   if(sc.id==='parked')objects.push({z:hh-3.6,draw:()=>this.van(-3.95,hh-3.6)});
   const actorX=clamp(drive.actorX,-7,7);
   if(!drive.impact&&!drive.actorClear&&(sc.actor==='adult'||drive.eventTime!==null||hero||highlight)){objects.push({z:hh,draw:()=>sc.actor==='bike'?this.bike(actorX,hh,drive.time):this.person(actorX,hh,sc.actor,drive.eventTime||0)});}
   objects.sort((a,b)=>b.z-a.z);objects.forEach(o=>o.draw());
   if(sc.id==='parked'&&drive.distance<70&&drive.distance>10){const p=this.project(-4.95,hh-4.5,.22);c.fillStyle='#bb7b5b';c.beginPath();c.arc(p.x,p.y,p.s*.16,0,Math.PI*2);c.fill();}
   if(highlight||drive.detected){const hit=this.hits.find(hh=>hh.type===sc.target);if(hit)this.marker(hit,drive.detected?'危険を発見':sc.id==='parked'?'車の陰に注意':sc.id==='crosswalk'?'渡りたい人':'交差点の死角');}
   if(!thumbnail){
     const y=h*.85;const g=c.createLinearGradient(0,y,0,h);g.addColorStop(0,'#dbe6e7');g.addColorStop(1,'#9eafb8');c.fillStyle=g;c.beginPath();c.moveTo(-w*.1,h);c.quadraticCurveTo(w*.1,y,w*.5,y);c.quadraticCurveTo(w*.9,y,w*1.1,h);c.closePath();c.fill();c.strokeStyle='#9eafb8';c.lineWidth=1;c.beginPath();c.moveTo(w*.2,h*.94);c.quadraticCurveTo(w*.5,h*.91,w*.8,h*.94);c.stroke();
   }
 }
 hit(x,y,type){return this.hits.some(h=>h.type===type&&x>=h.x-12&&x<=h.x+h.w+12&&y>=h.y-12&&y<=h.y+h.h+12);}
}
