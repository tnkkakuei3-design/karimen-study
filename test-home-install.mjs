// User-facing install invitation, persistence and learning-state regression checks.
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
const ios='Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1';
const android='Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/140.0.0.0 Mobile Safari/537.36';
function app({ua=ios,seed={},standalone=false,legacyStandalone=false,storageBlocked=false}={}){
 const errors=[],frames=[],downloads=[];
 const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',e=>errors.push(e));
 const dom=new JSDOM(html,{url:'https://tnkkakuei3-design.github.io/karimen-study/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole});
 const w=dom.window;w.document.hasFocus=()=>true;
 Object.defineProperty(w.navigator,'userAgent',{value:ua});
 Object.defineProperty(w.navigator,'standalone',{value:legacyStandalone});
 for(const [key,value]of Object.entries(seed))w.localStorage.setItem(key,value);
 if(storageBlocked){const get=w.Storage.prototype.getItem;w.Storage.prototype.getItem=function(key){if(key==='karimen-home-install-seen-v1')throw new Error('blocked');return get.call(this,key)};}
 w.matchMedia=query=>({matches:standalone&&query==='(display-mode: standalone)',addEventListener(){}});
 w.scrollTo=()=>{};w.requestAnimationFrame=fn=>frames.push(fn);w.setInterval=()=>1;
 w.HTMLElement.prototype.scrollIntoView=function(){};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
 w.HTMLDialogElement.prototype.close=function(){if(this.open){this.open=false;this.dispatchEvent(new w.Event('close'))}};
 w.URL.createObjectURL=blob=>{downloads.push(blob);return 'blob:progress'};w.URL.revokeObjectURL=()=>{};
 const ctx=dom.getInternalVMContext();
 for(const name of ['questions.js','learning-content.js','model.js','visuals.js','notebook-content.js','question-guides.js','home-install.js','app.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),ctx,{filename:name});
 frames.splice(0).forEach(fn=>fn());
 const query=selector=>w.document.querySelector(selector);
 const click=selector=>{const target=query(selector);assert.ok(target,selector);assert.equal(target.disabled,false);target.click();assert.equal(errors.length,0,errors[0]?.message)};
 return {w,query,click,downloads,run:code=>vm.runInContext(code,ctx),snapshot:()=>Object.fromEntries(Object.keys(w.localStorage).map(key=>[key,w.localStorage.getItem(key)])),close:()=>{assert.equal(errors.length,0,errors[0]?.message);dom.window.close()}};
}
let a=app();
assert.equal(a.query('#home-install-prompt').hidden,false,'first mobile visit shows invitation');
const initial=a.run('JSON.stringify(state)');
a.click('[data-install-action="dismiss"]');
assert.equal(a.query('#home-install-prompt').hidden,true);
const remembered=a.snapshot();a.close();
a=app({seed:remembered});
assert.equal(a.query('#home-install-prompt').hidden,true,'reload does not repeat invitation');
a.click('#settings-button');a.click('#settings [data-install-action="guide"]');
assert.equal(a.query('#settings').open,false);
assert.equal(a.query('#home-install-guide').open,true);
assert.match(a.query('#home-install-guide-body').textContent,/Safari/);
assert.equal(a.query('.install-records'),null,'new learners see only essential instructions');
a.click('[data-install-platform="android"]');assert.match(a.query('#home-install-guide-body').textContent,/Chrome/);
a.click('#home-install-close');assert.equal(a.query('#settings').open,true,'return to settings');
assert.equal(a.run('JSON.stringify(state)'),initial,'guidance does not change learning records');
a.close();
for(const config of [{standalone:true},{legacyStandalone:true},{ua:'Mozilla/5.0 (X11; Linux x86_64) Chrome/140.0.0.0 Safari/537.36'},{storageBlocked:true}]){
 a=app(config);assert.equal(a.query('#home-install-prompt').hidden,true);a.close();
}
a=app();a.click('[data-action="detail"][data-set="1"]');assert.equal(a.query('#home-install-prompt').hidden,true,'opening a mock hides invitation');
a.click('[data-action="start-mock"]');assert.equal(a.query('#play').hidden,false);
a.run('KarimenHomeInstall.openGuide()');assert.equal(a.query('#home-install-guide').open,false,'no guide during an active exam');
const unfinished=a.snapshot();delete unfinished['karimen-home-install-seen-v1'];a.close();
a=app({seed:unfinished});assert.equal(a.query('#home-install-prompt').hidden,true,'no interruption when returning to unfinished learning');a.close();
a=app();a.click('#tab-learn');a.click('[data-action="quick-study"]');a.click('[data-action="answer"][data-value="true"]');a.click('[data-action="pause"]');
a.click('#settings-button');a.click('#settings [data-install-action="guide"]');
assert.ok(a.query('.install-records'));const beforeExport=a.run('JSON.stringify(state)');
a.click('[data-install-action="export"]');assert.equal(a.downloads.length,1);assert.equal(a.run('JSON.stringify(state)'),beforeExport);a.close();
a=app({ua:android});assert.equal(a.query('#home-install-prompt').hidden,false);
a.click('#home-install-prompt [data-install-action="guide"]');assert.match(a.query('#home-install-guide-body').textContent,/Chrome/);
let prompts=0;const event=new a.w.Event('beforeinstallprompt',{cancelable:true});
event.prompt=async()=>{prompts++};event.userChoice=Promise.resolve({outcome:'dismissed'});a.w.dispatchEvent(event);
assert.equal(event.defaultPrevented,true);assert.equal(prompts,0,'never invoke system installation without a click');
a.click('[data-install-action="native"]');await new Promise(resolve=>setImmediate(resolve));
assert.equal(prompts,1);assert.equal(a.query('[data-install-action="native"]'),null);assert.equal(a.query('.install-steps').children.length,3);
a.w.dispatchEvent(new a.w.Event('appinstalled'));assert.equal(a.query('#home-install-guide').open,false);assert.equal(a.query('#home-install-prompt').hidden,true);a.close();
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
assert.equal(manifest.short_name,'仮免ドリル');assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');
for(const item of manifest.icons){const data=fs.readFileSync(path.join(root,item.src));assert.equal(`${data.readUInt32BE(16)}x${data.readUInt32BE(20)}`,item.sizes)}
const apple=fs.readFileSync(path.join(root,'apple-touch-icon.png'));assert.equal(apple.readUInt32BE(16),180);assert.equal(apple.readUInt32BE(20),180);assert.equal(apple[25],2,'iOS icon is opaque truecolor PNG');
assert.match(html,/<title>仮免ドリル<\/title>/);
for(const base of ['https://tnkkakuei3-design.github.io/karimen-study/','https://migration-check.example/']){
 const page=new JSDOM(html,{url:base});
 assert.equal(page.window.document.querySelector('[rel="apple-touch-icon"]').href,new URL('./apple-touch-icon.png?v=20261012-icon-v2',base).href,'icon stays on the current host and base path');
 page.window.close();
}
console.log('Home-screen checks passed: first visit, dismissal/reload, settings return, standalone/desktop suppression, active/resumed learning, record export, Android manual/native paths and icon metadata.');
