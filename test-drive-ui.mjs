// DOM integration only; Canvas/WebGL rendering is checked separately in a browser.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {JSDOM,VirtualConsole} from 'jsdom';
import {Drive,SCENES,clamp} from './drive/engine.mjs';
import {ArcadeDrive} from './drive/arcade.mjs';
const html=fs.readFileSync(new URL('./drive/index.html',import.meta.url),'utf8');
const source=fs.readFileSync(new URL('./drive/app.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
for(const from of ['karimen','honmen']){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e));
 const dom=new JSDOM(html,{url:`https://karimen-study.pages.dev/drive/?from=${from}`,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
 const w=dom.window,$=id=>w.document.getElementById(id);
 w.matchMedia=()=>({matches:false});w.scrollTo=()=>{};w.requestAnimationFrame=()=>1;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 class Renderer{constructor(canvas){assert.ok(canvas)}invalidateSize(){}render(){}hit(){return true}}
 class DriveAudio{setEnabled(){}unlock(){}silence(){}update(){}}
 Object.assign(w,{Drive,SCENES,clamp,ArcadeDrive,Renderer,DriveAudio});
 const ctx=dom.getInternalVMContext(),run=code=>vm.runInContext(code,ctx);
 run(source);run(fs.readFileSync(new URL('./drive/study-return.mjs',import.meta.url),'utf8'));
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(w.document.querySelectorAll('.course').length,3);
 const ids=[...w.document.querySelectorAll('[id]')].map(el=>el.id);assert.equal(new Set(ids).size,ids.length);
 assert.equal($('study-return').textContent.trim(),from==='honmen'?'本免':'仮免');
 assert.equal($('drive-home').search,`?from=${from}`);
 $('settings-button').click();assert.equal($('drive-settings').open,true);
 assert.equal($('compare-view').disabled,true);assert.match($('render-label').textContent,/2D/);
 $('sound').click();assert.equal($('sound-state').textContent,'オフ');$('close-settings').click();
 for(let i=0;i<3;i++){
  w.document.querySelector(`[data-course="${i}"]`).click();assert.equal($('start-title').textContent,SCENES[i].title);
  $('start').click();assert.equal(run('drive.phase'),'running');
  $('game-settings').click();assert.equal(run('drive.phase'),'paused');
  w.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));assert.equal(run('drive.phase'),'paused');
  $('drive-settings').dispatchEvent(new w.Event('cancel',{cancelable:true}));assert.equal(run('drive.phase'),'running');
  $('pause').click();$('game-settings').click();$('close-settings').click();assert.equal(run('drive.phase'),'paused');
  $('resume').click();run("drive.finish(false,'止まる余裕が足りませんでした');showResult()");
  assert.equal($('result').hidden,false);assert.ok(w.document.querySelector('.result-mascot[src$="D047.png"]'));
  assert.ok(w.document.querySelector('details.timeline'));$('retry').click();$('start').click();
  run("drive.stopDistance=8;drive.finish(true,'安全に止まれました');showResult()");
  assert.ok(w.document.querySelector('.flower-stamp'));assert.equal(w.document.activeElement,$('result'));
  $('result-home').click();assert.equal($('home').hidden,false);
 }
 assert.equal($('completed').textContent,'3 / 3 クリア');
 $('challenge').click();assert.equal($('completed').textContent,'0 / 3 クリア');
 $('guided').click();assert.equal($('completed').textContent,'3 / 3 クリア');
 $('arcade-start').click();$('start').click();run('drive.z=256;drive.step(.01);showResult()');
 assert.match($('result').textContent,/ゲームポイント/);$('arcade-retry').click();assert.equal($('start-title').textContent,'連続ドライブ');
 $('drive-home').click();assert.equal($('home').hidden,false);
 assert.deepEqual(errors,[]);dom.window.close();
}
console.log('PASS: driving navigation, course titles, settings pause/resume/cancel, sound, 2D fallback, both result states, retry, mode-specific progress and arcade result.');
