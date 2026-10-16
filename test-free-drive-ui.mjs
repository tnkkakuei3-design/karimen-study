import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {JSDOM,VirtualConsole} from 'jsdom';
import {FreeDrive,STREETS,PLACES} from './drive/free-model.mjs';
const html=fs.readFileSync(new URL('./drive/free.html',import.meta.url),'utf8');
const source=fs.readFileSync(new URL('./drive/free-app.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace("await import('./free-world.mjs?v=shops1')",'await Promise.resolve({createWorld:globalThis.makeWorld})');
for(const from of ['karimen','honmen']){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e));const dom=new JSDOM(html,{url:`https://example.org/drive/free.html?from=${from}`,runScripts:'outside-only',virtualConsole:vc});const w=dom.window,$=id=>w.document.getElementById(id);
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>{}});
 w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};w.HTMLElement.prototype.setPointerCapture=()=>{};
 class DriveAudio{setEnabled(){}unlock(){}silence(){}update(){}}
 Object.assign(w,{FreeDrive,STREETS,PLACES,DriveAudio,makeWorld:()=>({render(){},reset(){},camera(){return true},quality(){return true}})});
 await vm.runInContext(`(async()=>{${source}\nglobalThis.driveTest={d,pause,start};})()`,dom.getInternalVMContext());
 assert.equal($('menu').open,true);assert.equal($('start').disabled,false);assert.equal(new URL($('back').href).search,`?from=${from}`);$('start').click();assert.equal(w.driveTest.d.phase,'running');assert.equal($('menu').open,false);
 const event=(id,type,pointerId,clientX=0)=>{const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId,clientX});$(id).dispatchEvent(e);};
 event('gas','pointerdown',1);event('wheel','pointerdown',2,10);event('wheel','pointermove',2,40);assert.ok(w.driveTest.d.input.gas);assert.ok(w.driveTest.d.input.steer>0);event('wheel','pointercancel',2);assert.equal(w.driveTest.d.input.steer,0);assert.ok(w.driveTest.d.input.gas);event('gas','lostpointercapture',1);assert.equal(w.driveTest.d.input.gas,false);
 $('gear').click();assert.equal(w.driveTest.d.gear,-1);w.driveTest.d.v=-2;$('gear').click();assert.equal(w.driveTest.d.gear,-1);w.driveTest.d.v=0;
 w.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowUp'}));assert.ok(w.driveTest.d.input.gas);$('pause').click();assert.equal(w.driveTest.d.phase,'paused');assert.equal(w.driveTest.d.input.gas,false);assert.equal($('gas').disabled,true);assert.ok(w.localStorage.getItem('dondora-free-drive-v1'));$('recover').click();$('start').click();assert.equal(w.driveTest.d.phase,'running');
 $('camera').click();assert.equal($('camera').textContent,'運転席');$('pause').click();$('quality').click();assert.equal($('quality').textContent,'画質：軽量');$('sound').click();assert.equal($('sound').getAttribute('aria-pressed'),'true');
 assert.deepEqual(errors,[]);dom.window.close();
}
console.log('PASS: free-drive DOM startup, multi-touch, cancellation, gear lock, pause/resume, saving, recovery, settings and return links. WebGL rendering is not covered.');
