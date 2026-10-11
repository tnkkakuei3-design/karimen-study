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
 const ctx=dom.getInternalVMContext();for(const name of ['questions.js','learning-content.js','model.js','visuals.js','app.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),ctx,{filename:name});
 const run=code=>vm.runInContext(code,ctx),query=selector=>w.document.querySelector(selector),all=selector=>[...w.document.querySelectorAll(selector)];
 const click=selector=>{const el=query(selector);assert.ok(el,`missing control: ${selector}`);assert.ok(!el.disabled,`disabled control: ${selector}`);el.click();if(errors.length)throw errors[0]};
 return {dom,w,clock,errors,downloads,run,query,all,click,close:()=>dom.window.close()};
}
let a=app();assert.equal(a.run('achievementFor(50,50,false).kind'),'complete');assert.equal(a.run('achievementFor(10,10).kind'),'complete');assert.equal(a.run('achievementFor(44,50).kind'),'retry');assert.equal(a.run('achievementFor(45,50).kind'),'pass');assert.equal(a.run('achievementFor(48,50).kind'),'excellent');assert.equal(a.run('achievementFor(50,50).kind'),'perfect');assert.equal(a.all('#mock .set-card').length,10);assert.equal(a.query('#mock').hidden,false);assert.ok(a.query('#mock .home-character'));assert.equal(a.query('#tabs').hidden,false);assert.equal(a.query('#tab-mock').getAttribute('aria-selected'),'true');
a.click('[data-action="detail"][data-set="3"]');assert.match(a.query('#detail').textContent,/代替問題 1問・補足問題 1問/);a.click('[data-action="start-mock"]');
assert.equal(a.run('state.session.ids.length'),50);assert.equal(a.run('state.session.ids[0]'),401);assert.equal(a.query('#tab-learn').disabled,true);assert.equal(a.query('#tab-review').disabled,true);assert.equal(a.query('#tabs').hidden,true);assert.ok(a.w.document.body.classList.contains('exam-active'));assert.equal(a.all('#play .home-character,#play .result-character').length,0);assert.equal(a.all('#play .feedback').length,0);assert.equal(a.all('#play .source-link').length,0);
a.run("openNotes(); openFigure('dist');");assert.equal(a.query('#notes').hidden,true);assert.equal(a.query('#figure-dialog').open,false);
a.click('[data-action="answer"][data-value="true"]');a.click('[data-action="answer"][data-value="false"]');assert.equal(a.run('state.session.answers[0]'),false);assert.equal(a.all('#play .feedback').length,0);
a.click('[data-action="flag"]');assert.equal(a.run('state.session.flags[0]'),true);a.click('[data-action="next"]');assert.equal(a.run('state.session.index'),1);a.click('[data-action="unanswered"]');assert.equal(a.run('state.session.index'),2);
assert.ok(a.query('#play [data-question-visual="403"] img'));a.click('[data-action="question-zoom"]');assert.equal(a.query('#figure-dialog').open,true);assert.equal(a.all('#figure-dialog .visual-answer').length,0);a.click('[data-action="close-figure"]');assert.equal(a.run('state.session.index'),2);
const deadline=a.run('state.session.endAt');a.click('[data-action="pause"]');a.click('#confirm-yes');assert.equal(a.query('#mock').hidden,false);a.click('#mock [data-action="resume"]');assert.equal(a.run('state.session.endAt'),deadline);
a.clock.now=deadline;a.run('updateTimer()');assert.equal(a.query('#result').hidden,false);assert.equal(a.run('state.session'),null);assert.equal(a.run('state.attempts.length'),1);assert.equal(a.query('#tab-learn').disabled,false);assert.equal(a.query('#tabs').hidden,false);assert.equal(a.w.document.body.classList.contains('exam-active'),false);a.run('updateTimer();renderResult();');assert.equal(a.run('state.attempts.length'),1);
const saved=a.w.localStorage.getItem('karimen-study-v4');a.close();a=app({'karimen-study-v4':saved});assert.equal(a.run('state.attempts.length'),1);a.click('[data-action="detail"][data-set="3"]');a.click('[data-action="stored-result"]');assert.equal(a.query('#result').hidden,false);assert.match(a.query('#result').textContent,/30分模試の結果/);
a.click('[data-action="result-filter"][data-filter="all"]');assert.equal(a.all('#result > details.review-item').length,50);assert.match(a.query('#result').textContent,/参考問題をもとに作成した代替問題/);assert.equal(a.run('state.attempts.length'),1);
a.click('#tab-learn');assert.equal(a.query('#learn').hidden,false);assert.equal(a.run('CATS.flatMap(categorized).length'),500);assert.equal(a.run('new Set(CATS.flatMap(categorized).map(q=>q.id)).size'),500);a.click('#learn .recommend');assert.equal(a.run('state.session.ids.length'),10);assert.equal(a.run('state.session.mode'),'drill');
a.click('[data-action="answer"][data-value="true"]');assert.equal(a.all('#play .feedback').length,1);assert.ok(a.query('#play #next'));assert.equal(a.w.document.activeElement,a.query('#play .feedback'));assert.equal(a.query('#tabs').hidden,true);assert.equal(a.run('state.stats[state.session.ids[0]].total'),1);
const id=a.run('state.session.ids[0]');a.run('renderPlay();renderPlay()');assert.equal(a.run(`state.stats[${id}].total`),1);
a.click('[data-action="pause"]');a.click('[data-action="notes"]');assert.equal(a.all('#notes details.note').length,47);
assert.equal(a.query('#notes .section-character').getAttribute('src'),'./image-a5b30a44fd43.png');
assert.match(a.query('#notes .section-character').alt,/ロボット教官/);
// Reset must clear both search controls and restore the complete notebook without changing records.
const beforeNoteFilter=a.run('JSON.stringify(state)');
a.query('#note-filter').value=a.query('#note-filter option:nth-child(2)').value;a.query('#note-filter').dispatchEvent(new a.w.Event('change',{bubbles:true}));
a.query('#note-search').value='該当しない検索語__';a.query('#note-search').dispatchEvent(new a.w.Event('input',{bubbles:true}));
assert.equal(a.all('#notes details.note').length,0);a.click('[data-action="note-reset"]');
assert.equal(a.query('#note-search').value,'');assert.equal(a.query('#note-filter').value,'');assert.equal(a.all('#notes details.note').length,47);
assert.equal(a.w.document.activeElement,a.query('#note-search'));assert.equal(a.run('JSON.stringify(state)'),beforeNoteFilter);
for(const el of a.all('#notes details.note'))a.run(`populateNote(document.getElementById(${JSON.stringify(el.id)}))`);
assert.equal(a.all('#notes .note-content').filter(el=>!el.innerHTML).length,0);assert.equal(a.run('NOTES.flatMap(noteIds).every(id=>id>=301&&id<=800)'),true);
a.run("openNotes('n-hand')");assert.equal(a.query('#n-hand').open,true);a.click('[data-action="note-return"]');assert.equal(a.query('#learn').hidden,false);
a.click('#tab-review');assert.equal(a.query('#review').hidden,false);assert.ok(a.query('#review').textContent.includes('次回の予定'));
// All 500 question texts and image bindings render through the common UI.
a.run('state.session=null');let imageCount=0;
for(let i=0;i<500;i++){
 a.run(`model.begin({ids:[Q[${i}].id],kind:'study'});renderPlay()`);
 assert.equal(a.query('#question').textContent,a.run(`Q[${i}].q`));
 if(a.query('#play [data-question-visual]'))imageCount++;
 assert.equal(a.all('#play .visual-answer').length,0);
}
assert.equal(imageCount,a.run('Q.filter(q=>ADDED_ART[q.id]||IMGQ[q.id]||VISUALS[q.id]).length'));
a.run('state.session=null');a.click('[data-action="settings"]');const before=a.run('JSON.stringify(state)');a.click('[data-action="preview"][data-score="45"]');assert.match(a.query('#achievement-preview').textContent,/合格/);a.click('[data-action="preview"][data-score="50"]');assert.ok(a.query('#achievement-preview .perfect'));assert.equal(a.query('#achievement-preview .flower-stamp text').textContent,'満点');assert.equal(a.run('JSON.stringify(state)'),before);a.click('[data-action="close-preview"]');
a.click('[data-action="theme"][data-value="dark"]');assert.equal(a.w.document.documentElement.dataset.theme,'dark');a.click('[data-action="sound"][data-value="false"]');assert.equal(a.run('state.sound'),false);
assert.equal(a.errors.length,0);a.close();
// Complete a genuine guided set through clicks; compare mock and guided achievements.
a=app();a.click('[data-action="detail"][data-set="1"]');a.click('[data-action="start-guided"]');
for(let i=0;i<50;i++){const answer=a.run('activeQuestion(state.session.ids[state.session.index]).a');a.click(`[data-action="answer"][data-value="${answer}"]`);a.click('[data-action="next"]');}
a.click('#confirm-yes');assert.equal(a.run('state.guidedResults[1].best.scoreSnapshot'),50);assert.equal(a.run('Object.keys(state.mockResults).length'),0);assert.ok(a.query('#result .perfect'));a.click('#tab-mock');assert.match(a.query('#mock .achievement-progress').textContent,/0 \/ 10回/);
// Visual restoration adds real weak-topic navigation while keeping old scores intact.
assert.equal(a.query('#mock .achievement-progress b').textContent,'0');
a.click('[data-action="detail"][data-set="1"]');assert.equal(a.query('.guided-record .flower-stamp text').textContent,'満点');a.click('[data-action="close-detail"]');
a.run(`model.begin({ids:WORKSHEETS[2].orderedIds,kind:'mock',worksheet:3});state.session.answers=state.session.ids.map((id,i)=>i<45?activeQuestion(id).a:!activeQuestion(id).a);lastResult=model.finish();renderResult();show('result')`);
assert.match(a.query('#result .accuracy').textContent,/90%/);
assert.equal(a.run('resultWeakGroups(lastResult).reduce((n,g)=>n+g.ids.length,0)'),5);
const topicIds=a.run('JSON.stringify(resultWeakGroups(lastResult)[0].ids)'),snapshot=a.run('JSON.stringify(state.mockResults[3])');
a.click('#result [data-action="result-topic"]');assert.equal(a.run('JSON.stringify(state.session.ids)'),topicIds);assert.equal(a.run('state.session.kind'),'review');assert.equal(a.run('JSON.stringify(state.mockResults[3])'),snapshot);
a.run(`state.session=null;lastResult={...state.mockResults[3].best,legacy:true,scoreSnapshot:7};renderResult();show('result')`);
assert.match(a.query('#result .accuracy').textContent,/14%/);assert.equal(a.all('#result .weak-topic').length,0);assert.equal(a.run('state.mockResults[3].best.scoreSnapshot'),45);
// Export includes the suspended session and old record archive.
a.run('model.begin({ids:[301],kind:"study"});');a.click('[data-action="settings"]');a.click('[data-action="export"]');assert.equal(a.downloads.length,1);assert.equal(a.run('model.exportData().session.ids[0]'),301);
assert.equal(a.errors.length,0);a.close();
// Previous mock scores remain accessible after the content version changes.
a=app();a.run(`model.begin({ids:WORKSHEETS[0].orderedIds,kind:'mock',worksheet:1});model.finish();state.mockResults[1].best.contentVersion='older';state.mockResults[1].best.scoreSnapshot=41;detail(1)`);
assert.match(a.query('#detail').textContent,/以前の内容版の模試記録/);a.click('#detail [data-action="stored-result"]');
assert.equal(a.run('lastResult.scoreSnapshot'),41);assert.match(a.query('#result').textContent,/得点は当時の保存値/);
a.click('#tab-mock');assert.equal(a.query('#mock .achievement-progress b').textContent,'0');
// A clear in another tab has key=null and must lock this tab.
a.w.dispatchEvent(new a.w.StorageEvent('storage',{key:null,newValue:null}));
assert.equal(a.run('externalChange'),true);assert.match(a.query('#storage-warning').textContent,/別のタブ/);
a.click('#tab-learn');assert.equal(a.query('#mock').hidden,false);a.close();
a=app({'karimen-study-v4':{kind:'karimen-progress',version:4,legacyArchive:{history:[null,{score:42}],stats:{1:null},sessions:[{answers:{bad:true},label:'壊れた途中記録'}],checks:null}}});
a.run('renderArchive();show("archive")');assert.match(a.query('#archive').textContent,/42点/);assert.match(a.query('#archive').textContent,/壊れた途中記録/);assert.equal(a.errors.length,0);a.close();
console.log(`PASS: DOM navigation; all 500 prompts and ${imageCount} question-image bindings; 47 note bodies; old-version mock access; malformed archive display; storage-clear lock; answer secrecy; timer; guided completion; preview isolation; export.`);
