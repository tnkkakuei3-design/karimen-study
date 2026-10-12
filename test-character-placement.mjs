// DOM-level integration checks. This does not simulate a visual browser layout.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {JSDOM,VirtualConsole}=require(process.env.KARIMEN_JSDOM_PATH||'jsdom');
const root=path.dirname(fileURLToPath(import.meta.url));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function app(seed={}){
 const errors=[],downloads=[],clock={now:Date.parse('2026-10-11T12:00:00Z')};
 const console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e));
 const dom=new JSDOM(html,{url:'https://tnkkakuei3-design.github.io/karimen-study/',runScripts:'outside-only',virtualConsole:console});
 const w=dom.window;for(const [k,v] of Object.entries(seed))w.localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));
 w.matchMedia=()=>({matches:false,addEventListener(){}});w.scrollTo=()=>{};w.requestAnimationFrame=fn=>fn();w.setInterval=()=>0;
 w.HTMLElement.prototype.scrollIntoView=function(){};w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 class ClockDate extends Date{constructor(...a){super(...(a.length?a:[clock.now]))}static now(){return clock.now}}
 w.Date=ClockDate;w.URL.createObjectURL=blob=>{downloads.push(blob);return 'blob:progress'};w.URL.revokeObjectURL=()=>{};
 const ctx=dom.getInternalVMContext();for(const name of ['questions.js','learning-content.js','model.js','visuals.js','notebook-content.js','question-guides.js','app.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),ctx,{filename:name});
 const run=code=>vm.runInContext(code,ctx),query=selector=>w.document.querySelector(selector),all=selector=>[...w.document.querySelectorAll(selector)];
 const click=selector=>{const el=query(selector);assert.ok(el,`missing control: ${selector}`);assert.ok(!el.disabled,`disabled control: ${selector}`);el.click();if(errors.length)throw errors[0]};
 return {dom,w,clock,errors,downloads,run,query,all,click,close:()=>dom.window.close()};
}

const a=app();
a.run("navigate('learn')");assert.equal(a.query('#learn .placement-character').getAttribute('src'),'./assets/characters/D047.png');
a.run("navigate('review')");assert.equal(a.query('#review .placement-character').getAttribute('src'),'./assets/characters/D012.png');
a.run("model.record(301,!activeQuestion(301).a);state.stats[301].reviewAt=Date.now()-1;renderReview()");assert.equal(a.query('#review .placement-character').getAttribute('src'),'./assets/characters/D051.png');
a.run("model.begin({ids:[301],kind:'review'});model.answer(activeQuestion(301).a);model.finish();renderReview()");assert.match(a.query('#review').textContent,/今日の復習は完了/);assert.equal(a.query('#review .placement-character').getAttribute('src'),'./assets/characters/D011.png');
a.clock.now+=86400000;a.run('state.stats[301].reviewAt=Date.now()+86400000;renderReview()');assert.equal(a.query('#review .placement-character').getAttribute('src'),'./assets/characters/D012.png');
for(const [score,total,expected] of [[44,50,'image-155cadc1029a'],[45,50,'D004'],[49,50,'D004'],[50,50,'D006'],[9,10,'image-155cadc1029a'],[10,10,'D006']]){
 a.run(`lastResult={ids:[],answers:[],total:${total},scoreSnapshot:${score},mode:'study',completedAt:Date.now(),contentVersion:CONTENT_VERSION};renderResult()`);
 assert.ok(a.query('#result .result-character').getAttribute('src').includes(expected));
}
a.run("openNotes('n-hand')");assert.equal(a.query('#n-hand .caution-guide').getAttribute('src'),'./assets/characters/D042.png');
a.run("state.misses={};state.stats={301:{total:2,correct:1,last:true},999:{total:100,correct:100,last:true}};renderLearn()");
assert.deepEqual(a.all('.learning-overview dd').map(e=>e.textContent.trim()),['1 / 500問','50%','0問']);
a.run("startStudy([301],'表示確認');model.answer(activeQuestion(301).a);renderPlay()");
assert.equal(a.all('.learning-next-bar #next').length,1);
a.close();console.log('PASS: selected assets, completion vs waiting vs unregistered, next-day reset, 44/45/49/50 and 9/10 results, note caution.');
