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
 const errors=[],downloads=[],intervals=[],clock={now:Date.parse('2026-10-11T12:00:00Z')};
 const console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e));
 const dom=new JSDOM(html,{url:'https://tnkkakuei3-design.github.io/karimen-study/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:console});
 const w=dom.window;w.document.hasFocus=()=>true;let randomSeed=123456;w.Math.random=()=>((randomSeed=(Math.imul(randomSeed,1664525)+1013904223)>>>0)/4294967296);for(const [k,v] of Object.entries(seed))w.localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));
 w.matchMedia=()=>({matches:false,addEventListener(){}});w.scrollTo=()=>{};w.requestAnimationFrame=fn=>fn();w.setInterval=fn=>{intervals.push(fn);return intervals.length};
 w.HTMLElement.prototype.scrollIntoView=function(){};w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 class ClockDate extends Date{constructor(...a){super(...(a.length?a:[clock.now]))}static now(){return clock.now}}
 w.Date=ClockDate;w.URL.createObjectURL=blob=>{downloads.push(blob);return 'blob:progress'};w.URL.revokeObjectURL=()=>{};
 const ctx=dom.getInternalVMContext();for(const name of ['questions.js','learning-content.js','cloud-record.js','model.js','visuals.js','notebook-content.js','question-guides.js','app.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),ctx,{filename:name});
 const run=code=>vm.runInContext(code,ctx),query=selector=>w.document.querySelector(selector),all=selector=>[...w.document.querySelectorAll(selector)];
 const click=selector=>{const el=query(selector);assert.ok(el,`missing control: ${selector}`);assert.ok(!el.disabled,`disabled control: ${selector}`);el.click();if(errors.length)throw errors[0]};
 return {dom,w,clock,intervals,errors,downloads,run,query,all,click,close:()=>dom.window.close()};
}
let a=app();assert.equal(a.run('achievementFor(50,50,false).kind'),'complete');assert.equal(a.run('achievementFor(10,10).kind'),'complete');assert.equal(a.run('achievementFor(44,50).kind'),'retry');assert.equal(a.run('achievementFor(45,50).kind'),'pass');assert.equal(a.run('achievementFor(48,50).kind'),'excellent');assert.equal(a.run('achievementFor(50,50).kind'),'perfect');assert.equal(a.all('#mock .set-card').length,10);assert.equal(a.query('#mock').hidden,false);assert.ok(a.query('#mock .home-character'));assert.equal(a.query('#tabs').hidden,false);assert.equal(a.query('#tab-mock').getAttribute('aria-selected'),'true');
a.click('[data-action="detail"][data-set="3"]');assert.match(a.query('#detail').textContent,/代替問題 1問・補足問題 1問/);a.click('[data-action="start-mock"]');
assert.equal(a.run('state.session.ids.length'),50);assert.equal(a.run('state.session.ids.every(id=>WORKSHEETS[2].orderedIds.includes(id))'),true);assert.equal(a.query('#tab-learn').disabled,true);assert.equal(a.query('#tab-review').disabled,true);assert.equal(a.query('#tabs').hidden,true);assert.ok(a.w.document.body.classList.contains('exam-active'));assert.equal(a.all('#play .home-character,#play .result-character').length,0);assert.equal(a.all('#play .feedback').length,0);assert.equal(a.all('#play .source-link').length,0);
a.run("openNotes(); openFigure('dist');");assert.equal(a.query('#notes').hidden,true);assert.equal(a.query('#figure-dialog').open,false);
a.click('[data-action="answer"][data-value="true"]');a.click('[data-action="answer"][data-value="false"]');assert.equal(a.run('state.session.answers[0]'),false);assert.equal(a.all('#play .feedback').length,0);
a.click('[data-action="flag"]');assert.equal(a.run('state.session.flags[0]'),true);a.click('[data-action="next"]');assert.equal(a.run('state.session.index'),1);a.click('[data-action="unanswered"]');assert.equal(a.run('state.session.index'),2);
const imageIndex=a.run('state.session.ids.indexOf(403)');a.click(`[data-action="jump"][data-index="${imageIndex}"]`);assert.ok(a.query('#play [data-question-visual="403"] img'));a.click('[data-action="question-zoom"]');assert.equal(a.query('#figure-dialog').open,true);assert.equal(a.all('#figure-dialog .visual-answer').length,0);a.click('[data-action="close-figure"]');assert.equal(a.run('state.session.index'),imageIndex);
const deadline=a.run('state.session.endAt');a.click('[data-action="pause"]');a.click('#confirm-yes');assert.equal(a.query('#mock').hidden,false);a.click('#mock [data-action="resume"]');assert.equal(a.run('state.session.endAt'),deadline);
a.clock.now=deadline;a.run('updateTimer()');assert.equal(a.query('#result').hidden,false);assert.equal(a.run('state.session'),null);assert.equal(a.run('state.attempts.length'),1);assert.equal(a.query('#tab-learn').disabled,false);assert.equal(a.query('#tabs').hidden,false);assert.equal(a.w.document.body.classList.contains('exam-active'),false);a.run('updateTimer();renderResult();');assert.equal(a.run('state.attempts.length'),1);
const saved=a.w.localStorage.getItem('karimen-study-v4');a.close();a=app({'karimen-study-v4':saved});assert.equal(a.run('state.attempts.length'),1);a.click('[data-action="detail"][data-set="3"]');a.click('[data-action="stored-result"]');assert.equal(a.query('#result').hidden,false);assert.match(a.query('#result').textContent,/30分模試の結果/);
a.click('[data-action="result-filter"][data-filter="all"]');assert.equal(a.all('#result > details.review-item').length,50);assert.match(a.query('#result').textContent,/参考問題をもとに作成した代替問題/);assert.equal(a.run('state.attempts.length'),1);
a.click('#tab-learn');assert.equal(a.query('#learn').hidden,false);assert.equal(a.run('CATS.flatMap(categorized).length'),500);assert.equal(a.run('new Set(CATS.flatMap(categorized).map(q=>q.id)).size'),500);a.click('#learn .recommend');assert.equal(a.run('state.session.ids.length'),10);assert.equal(a.run('state.session.mode'),'drill');
a.click('[data-action="answer"][data-value="true"]');assert.equal(a.all('#play .feedback').length,1);assert.ok(a.query('#play #next'));assert.equal(a.w.document.activeElement,a.query('#play .feedback'));assert.equal(a.query('#tabs').hidden,true);assert.equal(a.run('state.stats[state.session.ids[0]].total'),1);
const id=a.run('state.session.ids[0]');a.run('renderPlay();renderPlay()');assert.equal(a.run(`state.stats[${id}].total`),1);
a.click('[data-action="pause"]');a.run('openNotes()');assert.equal(a.all('#notes details.note').length,65);
assert.equal(a.query('#notes .section-character').getAttribute('src'),'./image-a5b30a44fd43.png');
assert.match(a.query('#notes .section-character').alt,/ロボット教官/);
// Reset must clear both search controls and restore the complete notebook without changing records.
const beforeNoteFilter=a.run('JSON.stringify(state)');
a.query('#note-filter').value=a.query('#note-filter option:nth-child(2)').value;a.query('#note-filter').dispatchEvent(new a.w.Event('change',{bubbles:true}));
a.query('#note-search').value='該当しない検索語__';a.query('#note-search').dispatchEvent(new a.w.Event('input',{bubbles:true}));
assert.equal(a.all('#notes details.note').length,0);a.click('[data-action="note-reset"]');
assert.equal(a.query('#note-search').value,'');assert.equal(a.query('#note-filter').value,'');assert.equal(a.all('#notes details.note').length,65);
assert.equal(a.w.document.activeElement,a.query('#note-search'));assert.equal(a.run('JSON.stringify(state)'),beforeNoteFilter);
for(const el of a.all('#notes details.note'))a.run(`populateNote(document.getElementById(${JSON.stringify(el.id)}))`);
assert.equal(a.all('#notes .note-content').filter(el=>!el.innerHTML).length,0);assert.equal(a.run('NOTES.flatMap(noteIds).every(id=>id>=301&&id<=800)'),true);
a.run("openNotes('n-hand')");assert.equal(a.query('#n-hand').open,true);a.click('[data-action="note-return"]');assert.equal(a.query('#learn').hidden,false);
a.click('#tab-review');assert.equal(a.query('#review').hidden,false);assert.ok(a.query('#review').textContent.includes('次は30分あけて'));
// All 500 question texts and image bindings render through the common UI.
a.run('state.session=null');let imageCount=0;
for(let i=0;i<500;i++){
 a.run(`state.session=null;model.begin({ids:[Q[${i}].id],kind:'study'});renderPlay()`);
 assert.equal(a.query('#question').textContent,a.run(`Q[${i}].q`));
 if(a.query('#play [data-question-visual]'))imageCount++;
 assert.equal(a.all('#play .visual-answer').length,0);
 const hadImage=Boolean(a.query('#play [data-question-visual]'));
 a.run('state.session.answers[0]=activeQuestion(state.session.ids[0]).a;renderPlay()');
 assert.equal(a.query('.answered-question .question').textContent,a.run(`Q[${i}].q`));
 assert.ok(a.query('.answered-question').open);
 assert.equal(a.all('#play [data-action="answer"]').length,0);
 assert.equal(Boolean(a.query('#play [data-question-visual]')),hadImage);
 assert.ok(a.query('.learning-points').textContent.includes('覚えるポイント'));
 assert.ok(a.query('#play .source-link'));
}
assert.equal(imageCount,a.run('Q.filter(q=>ADDED_ART[q.id]||IMGQ[q.id]||VISUALS[q.id]).length'));
a.run('state.session=null');a.click('[data-action="settings"]');const before=a.run('JSON.stringify(state)');a.click('[data-action="preview"][data-score="45"]');assert.match(a.query('#achievement-preview').textContent,/合格/);a.click('[data-action="preview"][data-score="50"]');assert.ok(a.query('#achievement-preview .perfect'));assert.equal(a.query('#achievement-preview .flower-stamp text').textContent,'満点');assert.equal(a.run('JSON.stringify(state)'),before);a.click('[data-action="close-preview"]');
a.click('[data-action="theme"][data-value="dark"]');assert.equal(a.w.document.documentElement.dataset.theme,'dark');a.click('[data-action="sound"][data-value="false"]');assert.equal(a.run('state.sound'),false);
assert.equal(a.errors.length,0);a.close();
// The last mock question must lead directly to grading confirmation, including resumed answers.
a=app();a.click('[data-action="detail"][data-set="1"]');a.click('[data-action="start-mock"]');
for(let i=0;i<50;i++){
 const answer=a.run('activeQuestion(state.session.ids[state.session.index]).a');
 a.click(`[data-action="answer"][data-value="${answer}"]`);
 assert.equal(a.query('#next').textContent.trim(),i===49?'採点する':'次の問題へ');
 if(i<49)a.click('#next');
}
const completedAnswers=a.w.localStorage.getItem('karimen-study-v4');a.close();
a=app({'karimen-study-v4':completedAnswers});a.click('#mock [data-action="resume"]');
assert.equal(a.run('state.session.index'),49);assert.equal(a.query('#next').textContent.trim(),'採点する');
a.click('#next');assert.equal(a.query('#confirm').open,true);assert.equal(a.query('#answer-map').open,false);
assert.equal(a.run('state.attempts.length'),0);assert.match(a.query('#confirm-message').textContent,/すべての回答を保存/);
a.click('#confirm-no');assert.equal(a.run('state.session.answers.filter(v=>v!==null).length'),50);
a.click('#next');a.click('#confirm-yes');assert.equal(a.query('#result').hidden,false);
assert.equal(a.run('state.mockResults[1].best.scoreSnapshot'),50);assert.equal(a.run('state.attempts.length'),1);
for(const target of ['learn','review']){assert.equal(a.query('#tab-'+target).disabled,false);a.click('#tab-'+target);assert.equal(a.query('#'+target).hidden,false);}
a.close();
// Missing answers still require the existing warning and do not prevent the final button from working.
a=app();a.click('[data-action="detail"][data-set="1"]');a.click('[data-action="start-mock"]');
a.click('[data-action="jump"][data-index="49"]');a.click('#next');
assert.equal(a.query('#confirm').open,true);assert.match(a.query('#confirm-message').textContent,/未回答が50問/);
a.click('#confirm-no');assert.equal(a.run('state.session.index'),49);assert.equal(a.run('state.attempts.length'),0);
a.click('#next');a.click('#confirm-yes');assert.equal(a.run('state.mockResults[1].best'),null);assert.equal(a.query('#result .accuracy strong').textContent,'—');assert.equal(a.all('#result .result-achievement').length,0);a.close();
// Switching tabs preserves the paused mock; browsing a different round cannot finish it.
for(const target of ['learn','review']){
 a=app();a.click('[data-action="detail"][data-set="1"]');a.click('[data-action="start-mock"]');
 a.click('[data-action="answer"][data-value="true"]');a.click('[data-action="pause"]');a.click('#confirm-yes');
 const pending=a.run('JSON.stringify(state.session)');
 a.click('#tab-'+target);assert.equal(a.query('#confirm').open,false);assert.equal(a.query('#'+target).hidden,false);
 assert.equal(a.run('JSON.stringify(model.sessionFor("mock"))'),pending);assert.equal(a.run('state.attempts.length'),0);
 const persisted=a.w.localStorage.getItem('karimen-study-v4');a.close();a=app({'karimen-study-v4':persisted});
 a.clock.now+=86400000;a.click('#tab-mock');a.click('#mock [data-action="resume"]');
 assert.equal(a.run('state.session.answers[0]'),true);assert.equal(a.run('state.attempts.length'),0);
 a.click('[data-action="pause"]');a.click('#confirm-yes');
 a.click('[data-action="detail"][data-set="2"]');assert.equal(a.query('#detail-title').textContent,'第2回');
 assert.equal(a.run('state.attempts.length'),0);a.click('#detail [data-action="start-mock"]');
 assert.equal(a.query('#confirm').open,true);a.click('#confirm-no');assert.equal(a.run('model.sessionFor("mock").worksheet'),1);
 a.click('[data-action="detail"][data-set="2"]');a.click('#detail [data-action="start-mock"]');a.click('#confirm-yes');
 assert.equal(a.run('state.session.worksheet'),2);assert.equal(a.run('state.attempts.length'),1);
 assert.equal(a.run('state.attempts[0].timeout'),false);assert.equal(a.run('state.attempts[0].answers[0]'),true);a.close();
}
// Active grading confirmation still expires once.
a=app();a.click('[data-action="detail"][data-set="1"]');a.click('[data-action="start-mock"]');a.click('[data-action="submit"]');
a.clock.now=a.run('state.session.endAt');a.run('updateTimer()');assert.equal(a.query('#confirm').open,false);
assert.equal(a.query('#result').hidden,false);assert.equal(a.run('state.attempts.length'),1);assert.equal(a.run('modalAction'),null);a.close();
// A review session can resume from its own tab, including after reload and after its last answer.
a=app();a.run('for(const q of Q.slice(0,3)) model.record(q.id,!q.a); model.save()');a.clock.now+=86400000;
a.click('#tab-review');a.click('#review [data-action="review-ready"]');assert.equal(a.run('state.session.ids.length'),3);
assert.match(a.query('#play [data-action="pause"]').textContent,/復習トップ/);
a.click(`[data-action="answer"][data-value="${a.run('activeQuestion(state.session.ids[0]).a')}"]`);a.click('#next');
const pausedReview=a.run('JSON.stringify(state.session)'),reviewTime=a.clock.now;
a.click('[data-action="pause"]');assert.equal(a.query('#review').hidden,false);
assert.match(a.query('#review [data-action="resume"]').textContent,/1 \/ 3問/);
const reviewSave=a.w.localStorage.getItem('karimen-study-v4');a.close();a=app({'karimen-study-v4':reviewSave});a.clock.now=reviewTime;
a.click('#tab-review');a.click('#review [data-action="resume"]');assert.equal(a.run('JSON.stringify(state.session)'),pausedReview);
for(let i=1;i<3;i++){a.click(`[data-action="answer"][data-value="${a.run('activeQuestion(state.session.ids[state.session.index]).a')}"]`);if(i<2)a.click('#next');}
a.click('[data-action="pause"]');assert.ok(a.query('#review [data-action="resume"]'));
assert.match(a.query('#review').textContent,/途中の復習があります/);assert.doesNotMatch(a.query('#review').textContent,/今すぐの復習は完了です/);
a.click('#review [data-action="resume"]');a.click('#next');a.click('#confirm-yes');assert.equal(a.run('state.attempts.length'),1);
assert.equal(a.run('state.attempts[0].scoreSnapshot'),3);assert.equal(a.run('state.stats[301].total'),2);
a.click('#tab-review');assert.equal(a.query('#review [data-action="resume"]'),null);assert.match(a.query('#review').textContent,/今すぐの復習は完了です/);a.close();
// Keep the actual focused search field alive throughout Japanese composition; filter when committed.
a=app();a.click('#tab-learn');a.run('openNotes()');const beforeSearch=a.run('JSON.stringify(state)');
const composingInput=a.query('#note-search');composingInput.focus();
composingInput.dispatchEvent(new a.w.CompositionEvent('compositionstart',{bubbles:true}));
for(const isComposing of [true,false]){
 composingInput.value='おうだん';composingInput.dispatchEvent(new a.w.InputEvent('input',{bubbles:true,isComposing,inputType:'insertCompositionText',data:'おうだん'}));
 assert.equal(a.query('#note-search'),composingInput);assert.equal(a.w.document.activeElement,composingInput);assert.equal(a.all('#notes details.note').length,65);
}
composingInput.value='横断歩道';composingInput.dispatchEvent(new a.w.CompositionEvent('compositionend',{bubbles:true,data:'横断歩道'}));
assert.equal(a.query('#note-search').value,'横断歩道');assert.ok(a.all('#notes details.note').length>0);assert.ok(a.all('#notes details.note').length<65);
assert.equal(a.w.document.activeElement,a.query('#note-search'));assert.equal(a.run('JSON.stringify(state)'),beforeSearch);
a.query('#note-search').value='検索結果なし__';a.query('#note-search').dispatchEvent(new a.w.InputEvent('input',{bubbles:true,inputType:'insertFromPaste'}));
assert.equal(a.all('#notes details.note').length,0);a.click('[data-action="note-reset"]');assert.equal(a.all('#notes details.note').length,65);a.close();
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
a.click('#result [data-action="result-topic"]');assert.deepEqual(JSON.parse(a.run('JSON.stringify(state.session.ids)')).sort(),JSON.parse(topicIds).sort());assert.equal(a.run('state.session.kind'),'review');assert.equal(a.run('JSON.stringify(state.mockResults[3])'),snapshot);
a.run(`state.session=null;lastResult={...state.mockResults[3].best,legacy:true,scoreSnapshot:7};renderResult();show('result')`);
assert.match(a.query('#result .accuracy').textContent,/14%/);assert.equal(a.all('#result .weak-topic').length,0);assert.equal(a.run('state.mockResults[3].best.scoreSnapshot'),45);
// Export includes the suspended session and old record archive.
a.run('model.begin({ids:[301],kind:"study"});');a.click('[data-action="settings"]');a.click('[data-action="export"]');assert.equal(a.downloads.length,1);assert.equal(a.run('model.exportData().session.ids[0]'),301);
assert.equal(a.errors.length,0);a.close();
// Previous mock scores remain accessible after the content version changes.
a=app();a.run(`model.begin({ids:WORKSHEETS[0].orderedIds,kind:'mock',worksheet:1});state.session.answers=state.session.ids.map(id=>activeQuestion(id).a);model.finish();state.mockResults[1].best.contentVersion='older';state.mockResults[1].best.scoreSnapshot=41;detail(1)`);
assert.match(a.query('#detail').textContent,/以前の内容版の模試記録/);a.click('#detail [data-action="stored-result"]');
assert.equal(a.run('lastResult.scoreSnapshot'),41);assert.match(a.query('#result').textContent,/得点は当時の保存値/);
a.click('#tab-mock');assert.equal(a.query('#mock .achievement-progress b').textContent,'0');
// A clear in another tab has key=null and must lock this tab.
a.w.dispatchEvent(new a.w.StorageEvent('storage',{key:null,newValue:null}));
assert.equal(a.run('externalChange'),true);assert.match(a.query('#storage-warning').textContent,/別のタブ/);
a.click('#tab-learn');assert.equal(a.query('#mock').hidden,false);a.close();
a=app({'karimen-study-v4':{kind:'karimen-progress',version:4,legacyArchive:{history:[null,{score:42}],stats:{1:null},sessions:[{answers:{bad:true},label:'壊れた途中記録'}],checks:null}}});
a.run('renderArchive();show("archive")');assert.match(a.query('#archive').textContent,/42点/);assert.match(a.query('#archive').textContent,/壊れた途中記録/);assert.equal(a.errors.length,0);a.close();
// The chosen result-first design is a display change: answer, resume, and back
// navigation must not record a second attempt or lose the original question.
a=app();a.run("startStudy([710,711,302],'回答デザイン')");a.click('[data-action="answer"][data-value="true"]');
assert.match(a.query('.answer-result-title').textContent,/正解は ×/);
assert.match(a.query('.answer-choice').textContent,/あなたの回答 ○/);
assert.equal(a.query('.point-rules dt').textContent,'原則');
assert.equal(a.query('.point-rules dd').textContent,'軌道敷内は原則通行できない。');
assert.equal(a.query('.point-exception dd').textContent,'右折のための通行などは例外。');
assert.match(a.query('.point-detail').textContent,/路面電車の進行を妨げないようにする。/);
assert.equal(a.w.document.activeElement,a.query('.answer-result'));
const savedAnswer=a.w.localStorage.getItem('karimen-study-v4');a.close();
a=app({'karimen-study-v4':savedAnswer});a.click('#tab-learn');a.click('#learn [data-action="resume"]');
assert.ok(a.query('.answer-result.incorrect'));assert.equal(a.run('state.stats[710].total'),1);
a.click('#next');assert.equal(a.all('.answer-result').length,0);assert.equal(a.all('#play [data-action="answer"]').length,2);
a.click('[data-action="prev"]');assert.ok(a.query('.answer-result.incorrect'));assert.equal(a.run('state.stats[710].total'),1);
assert.equal(a.w.document.activeElement,a.query('.answer-result'));
a.run("state.session=null;startStudy([710,711],'自信なし')");a.query('#uncertain').checked=true;
a.click('[data-action="answer"][data-value="false"]');assert.equal(a.all('.answer-result.incorrect').length,0);
assert.match(a.query('.answer-uncertain').textContent,/復習に残しました/);assert.ok(a.query('.review-schedule-note'));
assert.equal(a.run('model.weak(710)'),true);assert.equal(a.errors.length,0);a.close();
// Category accuracy uses the latest answer to each attempted question, never the entire bank or repeat count.
{
 a=app();a.click('#tab-review');
 assert.equal(a.all('#review .review-now-card,#review .review-timing').length,0);
 assert.equal(a.all('#review .empty').length,1);
 a.click('#tab-learn');
 const metrics=a.query('.category-metrics');
 assert.equal(metrics.open,false);
 metrics.querySelector('summary').click();
 assert.equal(metrics.open,true);
 assert.equal(a.run('state.session'),null);
 assert.ok(metrics.querySelector('.category-accuracy'));
 a.click('.category-entry');
 assert.equal(a.query('#play').hidden,false);
 a.close();
}
{
 a=app();a.click('#tab-learn');
 assert.ok(a.all('.category-accuracy').every(el=>el.textContent==='未学習'));
 assert.ok(a.all('.category-card .progress i').every(el=>el.style.width==='0%'));
 const category=a.run('CATS[0].k'), card=()=>a.query(`.category-card[data-cat="${category}"]`);
 const questionIds=JSON.parse(a.run('JSON.stringify(categorized(CATS[0]).slice(0,2).map(q=>q.id))'));
 a.run(`model.record(${questionIds[0]},!activeQuestion(${questionIds[0]}).a);renderLearn()`);
 assert.equal(card().querySelector('.category-accuracy').textContent,'正解率 0%');
 assert.equal(card().querySelector('.category-answer-count').textContent,'正解 0 / 回答済み 1問');
 a.run(`model.record(${questionIds[1]},activeQuestion(${questionIds[1]}).a);renderLearn()`);
 assert.equal(card().querySelector('.category-accuracy').textContent,'正解率 50%');
 assert.equal(card().querySelector('.category-answer-count').textContent,'正解 1 / 回答済み 2問');
 assert.equal(card().querySelector('.progress i').style.width,'50%');
 assert.match(card().querySelector('.category-sample-note').textContent,/5問未満/);
 assert.match(card().querySelector('.category-coverage').textContent,/学習進捗 2 \/ /);
 for(const filter of ['new','weak','all']){
  a.click(`[data-action="category-filter"][data-filter="${filter}"]`);
  assert.equal(card().querySelector('.category-accuracy').textContent,'正解率 50%');
  assert.equal(card().querySelector('.category-answer-count').textContent,'正解 1 / 回答済み 2問');
 }
 a.run(`model.record(${questionIds[0]},activeQuestion(${questionIds[0]}).a);model.save();renderLearn()`);
 assert.equal(card().querySelector('.category-accuracy').textContent,'正解率 100%');
 assert.equal(card().querySelector('.category-answer-count').textContent,'正解 2 / 回答済み 2問');
 assert.equal(card().querySelector('.progress i').style.width,'100%');
 assert.match(a.query('.learning-overview').textContent,/現在の正解率100%/);
 assert.match(a.query('.learning-cumulative').textContent,/累積正答率 67%/);
 const records=a.w.localStorage.getItem('karimen-study-v4');a.close();
 a=app({'karimen-study-v4':records});a.click('#tab-learn');
 assert.equal(card().querySelector('.category-accuracy').textContent,'正解率 100%');
 assert.equal(a.run(`state.stats[${questionIds[0]}].total`),2);
 assert.equal(a.errors.length,0);a.close();
}
// Result percentages use this attempt, and retry combines wrong/uncertain without bypassing cooldowns.
{
 a=app();
 const ids=JSON.parse(a.run('JSON.stringify([...categorized(CATS[0]).slice(0,5),...categorized(CATS[1]).slice(0,2)].map(q=>q.id))'));
 a.run(`model.record(${ids[0]},!activeQuestion(${ids[0]}).a);model.record(${ids[5]},!activeQuestion(${ids[5]}).a);model.begin({ids:${JSON.stringify(ids)},kind:'study'});`);
 for(let i=0;i<ids.length;i++)a.run(`state.session.index=${i};model.answer(${[0,1,5].includes(i)?'!':''}activeQuestion(${ids[i]}).a,${[0,2].includes(i)});`);
 a.run("lastResult=model.finish();renderResult();show('result')");
 assert.ok(a.query('.result-actions').compareDocumentPosition(a.query('.result-weak')) & 4);
 assert.deepEqual(JSON.parse(a.run('JSON.stringify(resultWeakGroups(lastResult).map(g=>[g.correct,g.answered]))')),[[1,2],[3,5]]);
 assert.equal(a.all('.weak-topic')[0].querySelector('strong').textContent,'正解率 50%');
 assert.equal(a.all('.weak-topic')[1].querySelector('strong').textContent,'正解率 60%');
 assert.equal(a.all('.topic-sample-note').length,1);
 assert.match(a.query('#result-review-plan').textContent,/不正解・自信なし 4問/);
 assert.match(a.query('#result-review-plan').textContent,/今すぐ2問を復習する.*復習待ち2問/);
 assert.equal(a.all('[data-action="result-topic"]')[0].disabled,true);
 a.click('[data-action="result-retry"]');
 assert.deepEqual(JSON.parse(a.run('JSON.stringify(state.session.ids)')).sort((a,b)=>a-b),[ids[1],ids[2]].sort((a,b)=>a-b));
 for(let i=0;i<2;i++)a.run(`state.session.index=${i};model.answer(!activeQuestion(state.session.ids[${i}]).a);`);
 a.run("lastResult=model.finish();renderResult();show('result')");
 assert.match(a.query('#result-review-plan').textContent,/次の復習待ち.*復習待ち2問/);
 assert.equal(a.query('[data-action="result-retry"]').disabled,true);
 assert.ok(a.all('[data-action="result-topic"]').every(el=>el.disabled));
 const detail=a.query('#result details.review-item');detail.open=true;
 const beforeWait=a.run('JSON.stringify(state)');
 a.clock.now+=30*60*1000;a.run('refreshReviewSchedule()');
 assert.equal(a.query('[data-action="result-retry"]').disabled,false);
 assert.match(a.query('#result-review-plan').textContent,/今すぐ2問を復習する/);
 assert.equal(a.query('#result details.review-item'),detail);assert.equal(detail.open,true);
 assert.equal(a.run('JSON.stringify(state)'),beforeWait);
 a.click('[data-action="result-retry"]');assert.equal(a.run('state.session.ids.length'),2);
 assert.equal(a.errors.length,0);a.close();
}
// Ten actual answers (8 correct) must show 80%, leave 40 questions unlearned, and create only 2 review items.
a=app();a.click('[data-action="detail"][data-set="1"]');a.click('[data-action="start-mock"]');
for(let i=0;i<10;i++){
 const value=a.run('activeQuestion(state.session.ids[state.session.index]).a');
 a.click(`[data-action="answer"][data-value="${i<8?value:!value}"]`);if(i<9)a.click('#next');
}
a.click('[data-action="submit"]');assert.match(a.query('#confirm-message').textContent,/回答した問題だけ/);
const beforeEarlyFinish=a.run('JSON.stringify(state.session)');a.click('#confirm-no');assert.equal(a.run('JSON.stringify(state.session)'),beforeEarlyFinish);
a.click('[data-action="submit"]');a.click('#confirm-yes');
assert.match(a.query('#result .accuracy').textContent,/80%/);assert.match(a.query('#result .score').textContent,/8\/ 10問/);
assert.match(a.query('#result .partial-result').textContent,/未回答40問/);assert.equal(a.query('#result .result-achievement'),null);assert.equal(a.query('#result .comparison'),null);
assert.equal(a.run('state.mockResults[1].best'),null);assert.equal(a.run('model.schedule().all.length'),2);
assert.equal(a.all('#result > details.review-item').length,2);
a.click('[data-action="result-filter"][data-filter="unanswered"]');assert.equal(a.all('#result > details.review-item').length,40);
a.click('#tab-learn');assert.match(a.query('.learning-overview').textContent,/回答済み10 \/ 500問現在の正解率80%要復習2問/);
assert.equal(a.run('Q.filter(q=>!state.stats[q.id]?.total).length'),490);
{
 let categoryCorrect=0,categoryAnswered=0;
 for(const card of a.all('.category-card')){
  const counts=card.querySelector('.category-answer-count').textContent.match(/^正解 (\d+) \/ 回答済み (\d+)問$/);
  if(!counts){assert.equal(card.querySelector('.category-accuracy').textContent,'未学習');continue;}
  const correct=Number(counts[1]),answered=Number(counts[2]),percent=Math.round(correct/answered*100);
  categoryCorrect+=correct;categoryAnswered+=answered;
  assert.equal(card.querySelector('.category-accuracy').textContent,`正解率 ${percent}%`);
  assert.equal(card.querySelector('.progress i').style.width,`${percent}%`);
 }
 assert.equal(categoryCorrect,8);assert.equal(categoryAnswered,10);
}
a.click('#tab-mock');assert.match(a.query('#mock .achievement-progress').textContent,/0 \/ 10回/);
a.click('[data-action="detail"][data-set="1"]');assert.match(a.query('#detail').textContent,/模試の途中終了/);assert.doesNotMatch(a.query('#detail').textContent,/最高 8点/);
a.click('[data-action="stored-result"]');assert.match(a.query('#result .accuracy').textContent,/80%/);
a.click('[data-action="result-unanswered"]');assert.equal(a.run('state.session.ids.length'),40);assert.equal(a.run('state.session.kind'),'study');
assert.equal(a.run('state.session.ids.every(id=>!state.stats[id])'),true);a.close();
// Existing browser records are corrected automatically and keep their partial history accessible.
const oldPartial=JSON.parse(fs.readFileSync(path.join(root,'dev/fixtures/unanswered-stats-v4.json'),'utf8')).cases.partialTen;
a=app({'karimen-study-v4':oldPartial});assert.match(a.query('#migration-notice').textContent,/未回答40件/);
a.click('#tab-learn');assert.match(a.query('.learning-overview').textContent,/現在の正解率80%/);assert.equal(a.run('model.schedule().all.length'),2);
a.click('#tab-mock');a.click('[data-action="detail"][data-set="1"]');a.click('[data-action="stored-result"]');
assert.match(a.query('#result .accuracy').textContent,/80%/);assert.equal(a.query('#result .result-achievement'),null);a.close();
// Historical complete attempts compare with other complete attempts, even if an early exit came first.
const oldComparison=JSON.parse(fs.readFileSync(path.join(root,'dev/fixtures/unanswered-stats-v4.json'),'utf8')).cases.realWrongAfterGraduation;
a=app({'karimen-study-v4':oldComparison});a.run("lastResult=state.attempts.find(a=>a.attemptId==='fixture-2');renderResult();show('result')");
assert.equal(a.run('lastResult.scoreSnapshot'),50);assert.equal(a.run('lastResult.previousScore'),0);
assert.match(a.query('#result .comparison').textContent,/はじめての記録/);assert.doesNotMatch(a.query('#result .comparison').textContent,/前回 0点/);a.close();
// All ten mock entry points randomize within the selected round. The visible
// question, image, original number and result rows follow the stored ID order.
for(let set=1;set<=10;set++){
 a=app();a.click(`[data-action="detail"][data-set="${set}"]`);
 assert.match(a.query('#detail').textContent,/毎回ランダム/);
 a.click('#detail [data-action="start-mock"]');
 const order=JSON.parse(a.run('JSON.stringify(state.session.ids)'));
 const original=JSON.parse(a.run(`JSON.stringify(WORKSHEETS[${set-1}].orderedIds)`));
 assert.notDeepEqual(order,original);assert.deepEqual([...order].sort((a,b)=>a-b),original);
 assert.equal(a.query('#question').textContent,a.run('activeQuestion(state.session.ids[0]).q'));
 assert.equal(a.query('#play .tags .badge').textContent,`元の問題：第${set}回・問${a.run('activeQuestion(state.session.ids[0]).number')}`);
 for(const figure of a.all('#play [data-question-visual]'))assert.equal(Number(figure.dataset.questionVisual),order[0]);
 const answer=a.run('activeQuestion(state.session.ids[0]).a');a.click(`[data-action="answer"][data-value="${answer}"]`);
 a.click('[data-action="flag"]');a.click('#next');const session=a.run('JSON.stringify(state.session)');
 a.click('[data-action="pause"]');a.click('#confirm-yes');a.click('#mock [data-action="resume"]');
 assert.equal(a.run('JSON.stringify(state.session)'),session);
 a.click('[data-action="submit"]');a.click('#confirm-yes');assert.equal(a.run('lastResult.scoreSnapshot'),1);
 a.click('[data-action="result-filter"][data-filter="all"]');
 const rows=a.all('#result > details.review-item');assert.equal(rows.length,50);
 for(let i=0;i<50;i++){
  const q=JSON.parse(a.run(`JSON.stringify(activeQuestion(${order[i]}))`));
  assert.ok(rows[i].querySelector('summary').textContent.includes(`出題${i+1} ·`));
  assert.ok(rows[i].querySelector('summary').textContent.includes(`元の問題：第${set}回・問${q.number}`));
  assert.ok(rows[i].querySelector('summary').textContent.includes(q.q));
  for(const figure of rows[i].querySelectorAll('[data-question-visual]'))assert.equal(Number(figure.dataset.questionVisual),q.id);
 }
 a.click('#tab-mock');a.click(`[data-action="detail"][data-set="${set}"]`);a.click('#detail [data-action="start-mock"]');
 assert.notDeepEqual(JSON.parse(a.run('JSON.stringify(state.session.ids)')),order);
 assert.equal(a.errors.length,0);a.close();
}
console.log(`PASS: all ten randomized mock entry points, original-number/result mapping, stable resume; DOM navigation; early-finish accuracy; historical correction; answers for all 500 questions; ${imageCount} image bindings; timer; guided completion; export.`);





// Future reviews are locked; expiry makes them available automatically.
a=app();a.run("model.record(710,!activeQuestion(710).a);model.record(710,activeQuestion(710).a);model.save();navigate('review')");
assert.equal(a.query('[data-action="review-all"]'),null);
assert.equal(a.query('[data-action="practice-again"]'),null);
assert.ok(a.query('#review [data-action="review-one"]').disabled);
assert.equal(a.query('#review [data-action="review-ready"]'),null);
const lockedState=a.run('JSON.stringify(state)');
a.run("startStudy([710],'復習','review')");
assert.equal(a.run('JSON.stringify(state)'),lockedState);
a.clock.now+=30*60*1000;
Object.defineProperty(a.w.document,'hidden',{value:false,configurable:true});
a.intervals.forEach(fn=>fn());
assert.ok(a.query('#review [data-action="review-ready"]'));
assert.equal(a.query('#review [data-action="review-one"]').disabled,false);
a.click('#review [data-action="review-ready"]');
a.click(`[data-action="answer"][data-value="${a.run('activeQuestion(710).a')}"]`);
assert.equal(a.run('model.weak(710)'),false);
assert.equal(a.query('[data-action="practice-again"]'),null);
assert.equal(a.errors.length,0);a.close();

assert.equal(a.errors.length,0);a.close();

a=app();a.click('#tab-learn');
assert.equal(a.all('.learn-switch [role="tab"]').length,2);
a.click('#learn-tab-notes');assert.equal(a.query('#learn-notes').hidden,false);assert.equal(a.query('#learn-categories').hidden,true);assert.equal(a.all('#learn-notes details.note').length,65);
assert.equal(a.all('#note-search').length,1);
a.run("openNotes('n-hand')");assert.equal(a.all('#note-search').length,1);a.click('[data-action="note-return"]');assert.equal(a.all('#learn-notes details.note').length,65);
a.click('#learn-tab-categories');assert.equal(a.query('#learn-categories').hidden,false);assert.equal(a.all('#learn .notes-entry').length,0);
a.close();

// Ten-question study stays available even when reviews are due or waiting.
for(const reviewState of ['none','due','waiting']){
 a=app();
 if(reviewState!=='none')a.run('model.record(301,!activeQuestion(301).a);model.save()');
 if(reviewState==='waiting')a.run('model.record(301,activeQuestion(301).a);model.save()');
 a.click('#tab-learn');
 assert.equal(a.all('#learn .learn-actions button').length,1);
 assert.equal(a.query('#learn [data-action="resume"]'),null);
 assert.equal(a.query('#learn [data-action="quick-study"] strong').textContent,'10問学ぶ');
 a.click('#learn [data-action="quick-study"]');
 assert.equal(a.run('state.session.kind'),'study');assert.equal(a.run('state.session.ids.length'),10);
 assert.equal(a.errors.length,0);a.close();
}
// Study, guided practice and review each resume unchanged, including after reload.
// Switching to ten new questions requires confirmation and retains the old answers.
for(const kind of ['study','guided']){
 a=app();
 if(kind==='guided'){a.click('[data-action="detail"][data-set="1"]');a.click('[data-action="start-guided"]');}
 else if(kind==='review'){
  a.run('for(const q of Q.slice(0,3))model.record(q.id,!q.a);model.save()');
  a.click('#tab-review');a.click('#review [data-action="review-ready"]');
 }else{a.click('#tab-learn');a.click('#learn [data-action="quick-study"]');}
 a.click(`[data-action="answer"][data-value="${a.run('activeQuestion(state.session.ids[0]).a')}"]`);a.click('#next');
 const originalSession=a.run('JSON.stringify(state.session)'),originalStats=a.run('JSON.stringify(state.stats)');
 a.click('[data-action="pause"]');a.click('#tab-learn');
 assert.equal(a.all('#learn .learn-actions button').length,2);
 assert.match(a.query('#learn [data-action="resume"]').textContent,/途中から続ける/);
 assert.match(a.query('#learn [data-action="resume"]').textContent,/1 \/ (3|10|50)問 回答済み/);
 const savedLearning=a.w.localStorage.getItem('karimen-study-v4');a.close();a=app({'karimen-study-v4':savedLearning});
 a.click('#tab-learn');a.click('#learn [data-action="resume"]');
 assert.equal(a.run('JSON.stringify(state.session)'),originalSession);
 assert.deepEqual(JSON.parse(a.run('JSON.stringify(state.stats)')),JSON.parse(originalStats));
 a.click('[data-action="pause"]');a.click('#tab-learn');a.click('#learn [data-action="quick-study"]');
 assert.ok(a.query('#confirm').open);a.click('#confirm-no');
 assert.equal(a.run('JSON.stringify(state.session)'),originalSession);assert.equal(a.run('state.attempts.length'),0);
 a.click('#learn [data-action="quick-study"]');a.click('#confirm-yes');
 assert.equal(a.run('state.session.kind'),'study');assert.equal(a.run('state.session.ids.length'),10);
 assert.notEqual(a.run('state.session.attemptId'),JSON.parse(originalSession).attemptId);
 assert.equal(a.run('state.attempts.length'),1);assert.equal(a.run('state.attempts[0].mode'),kind);
 assert.equal(a.run('state.attempts[0].attemptId'),JSON.parse(originalSession).attemptId);
 assert.deepEqual(JSON.parse(a.run('JSON.stringify(state.attempts[0].answers)')),JSON.parse(originalSession).answers);
 assert.equal(a.run('partialAttempt(state.attempts[0])'),true);assert.equal(a.run('state.attempts[0].scoreSnapshot'),1);
 assert.deepEqual(JSON.parse(a.run('JSON.stringify(state.stats)')),JSON.parse(originalStats));
 assert.equal(a.errors.length,0);a.close();
}
console.log('PASS: permanent ten-question study; conditional resume; reload, cancellation and preserved answers when starting fresh.');

// Browser lifecycle: count only foreground play time, including repeated/out-of-order events.
a=app();
let focused=true,hidden=false;
a.w.document.hasFocus=()=>focused;
Object.defineProperty(a.w.document,'hidden',{configurable:true,get:()=>hidden});
const visibility=()=>a.w.document.dispatchEvent(new a.w.Event('visibilitychange'));
const lifecycle=name=>a.w.dispatchEvent(new a.w.Event(name));
a.click('[data-action="detail"][data-set="1"]');a.click('[data-action="start-mock"]');
a.click('[data-action="answer"][data-value="true"]');a.click('#next');
const bindings=a.run('JSON.stringify([state.session.ids,state.session.answers,state.session.index])');
a.clock.now+=10000;hidden=true;visibility();
assert.equal(a.run('model.remaining()'),1790000);assert.equal(a.run('state.session.timerPaused'),true);
assert.match(a.query('#timer').textContent,/29:50 · 停止中/);
assert.equal(JSON.parse(a.w.localStorage.getItem('karimen-study-v4')).session.remainingMs,1790000);
a.clock.now+=7200000;a.intervals.forEach(fn=>fn());lifecycle('focus');
assert.equal(a.run('model.remaining()'),1790000);assert.equal(a.run('state.attempts.length'),0);
focused=false;hidden=false;visibility();
assert.equal(a.run('state.session.timerPaused'),true);
focused=true;lifecycle('focus');
assert.equal(a.run('state.session.timerPaused'),false);assert.equal(a.query('#timer').textContent,'残り 29:50');
a.clock.now+=15000;focused=false;lifecycle('blur');
assert.equal(a.run('model.remaining()'),1775000);
a.clock.now+=7200000;lifecycle('blur');hidden=true;visibility();hidden=false;visibility();
assert.equal(a.run('model.remaining()'),1775000);assert.equal(a.run('state.session.timerPaused'),true);
focused=true;lifecycle('focus');a.clock.now+=2000;lifecycle('pagehide');
assert.equal(a.run('model.remaining()'),1773000);
a.clock.now+=86400000;lifecycle('focus');
assert.equal(a.run('state.session.timerPaused'),true);assert.equal(a.run('model.remaining()'),1773000);
lifecycle('pageshow');assert.equal(a.run('state.session.timerPaused'),false);
a.clock.now+=5001;a.run('updateTimer()');
assert.equal(JSON.parse(a.w.localStorage.getItem('karimen-study-v4')).session.remainingMs,1767999);
a.clock.now+=1000;a.click('[data-action="pause"]');a.click('#confirm-yes');
const manualRemaining=a.run('model.remaining()');assert.equal(manualRemaining,1766999);
a.clock.now+=86400000;lifecycle('focus');visibility();a.intervals.forEach(fn=>fn());
assert.equal(a.run('model.remaining()'),manualRemaining);assert.equal(a.run('state.session.timerPaused'),true);
assert.equal(a.run('JSON.stringify([state.session.ids,state.session.answers,state.session.index])'),bindings);
const timerSave=a.w.localStorage.getItem('karimen-study-v4'),returnedAt=a.clock.now;
assert.equal(a.errors.length,0);a.close();
a=app({'karimen-study-v4':timerSave});a.clock.now=returnedAt;
assert.equal(a.run('model.remaining()'),manualRemaining);assert.equal(a.run('state.session.timerPaused'),true);
a.click('#mock [data-action="resume"]');assert.equal(a.run('state.session.timerPaused'),false);
assert.equal(a.run('JSON.stringify([state.session.ids,state.session.answers,state.session.index])'),bindings);
a.clock.now+=manualRemaining-1;a.run('updateTimer()');assert.equal(a.run('state.attempts.length'),0);
a.clock.now++;a.run('updateTimer()');assert.equal(a.run('state.session'),null);
assert.equal(a.run('state.attempts.length'),1);assert.equal(a.run('state.attempts[0].timeout'),true);
assert.equal(a.query('#result').hidden,false);lifecycle('pageshow');a.run('updateTimer()');
assert.equal(a.run('state.attempts.length'),1);assert.equal(a.errors.length,0);a.close();
// A lifecycle checkpoint may never overwrite a newer record from another tab.
a=app();a.click('[data-action="detail"][data-set="1"]');a.click('[data-action="start-mock"]');
const newer=JSON.parse(a.w.localStorage.getItem('karimen-study-v4'));newer.session.answers[1]=false;
const newerRaw=JSON.stringify(newer);a.w.localStorage.setItem('karimen-study-v4',newerRaw);
lifecycle('blur');lifecycle('focus');
assert.equal(a.run('model.conflicted'),true);assert.equal(a.w.localStorage.getItem('karimen-study-v4'),newerRaw);
assert.match(a.query('#storage-warning').textContent,/別のタブ/);assert.equal(a.errors.length,0);a.close();
console.log('PASS: hidden/blur/pagehide pauses, visible/focus/pageshow resumes, repeated events, saved remainder, manual pause, reload, active-only timeout and stale-tab protection.');

// Returning focus during pointer-down must not detach the control before click.
a=app();a.click('#tab-learn');
const notesTabBeforeFocus=a.query('#learn-tab-notes');
a.w.dispatchEvent(new a.w.Event('blur'));a.w.dispatchEvent(new a.w.Event('focus'));
notesTabBeforeFocus.click();
assert.equal(a.query('#learn-tab-notes').getAttribute('aria-selected'),'true');
const openNoteBeforeFocus=a.query('#learn-notes details.note');openNoteBeforeFocus.open=true;
a.w.dispatchEvent(new a.w.Event('blur'));a.w.dispatchEvent(new a.w.Event('focus'));
assert.ok(openNoteBeforeFocus.isConnected);assert.equal(openNoteBeforeFocus.open,true);
assert.equal(a.errors.length,0);a.close();
a=app();a.run('model.record(301,!activeQuestion(301).a)');a.click('#tab-review');
const reviewButtonBeforeFocus=a.query('[data-action="review-ready"]');
a.w.dispatchEvent(new a.w.Event('blur'));a.w.dispatchEvent(new a.w.Event('focus'));
reviewButtonBeforeFocus.click();
assert.equal(a.run('state.session.kind'),'review');assert.equal(a.query('#play').hidden,false);
assert.equal(a.errors.length,0);a.close();
// A due review must still become available immediately when the user returns.
a=app();a.run('model.record(301,!activeQuestion(301).a);state.stats[301].reviewAt=Date.now()+1000');
a.click('#tab-review');a.query('.review-graduation').open=true;
const statsBeforeFocus=a.run('JSON.stringify(state.stats)');
assert.equal(a.query('[data-action="review-ready"]'),null);
a.w.dispatchEvent(new a.w.Event('blur'));a.clock.now+=1001;a.w.dispatchEvent(new a.w.Event('focus'));
assert.ok(a.query('[data-action="review-ready"]'));assert.equal(a.query('.review-graduation').open,true);
assert.equal(a.run('JSON.stringify(state.stats)'),statsBeforeFocus);
assert.equal(a.errors.length,0);a.close();
console.log('PASS: first click after focus return, open notes, review controls, and due-review refresh without changing records.');

// Each tab resumes its own saved mode, while insights distinguish recent performance and weak topics.
{
 a=app();a.click('[data-action="detail"][data-set="1"]');a.click('[data-action="start-mock"]');
 a.click('[data-action="answer"][data-value="true"]');a.clock.now+=5000;
 a.click('[data-action="pause"]');a.click('#confirm-yes');a.click('#tab-learn');a.click('[data-action="quick-study"]');
 a.click(`[data-action="answer"][data-value="${a.run('activeQuestion(state.session.ids[0]).a')}"]`);
 a.click('[data-action="pause"]');
 a.run("for(const q of Q.filter(q=>!model.sessionFor('study').ids.includes(q.id)).slice(-2))model.record(q.id,!q.a);model.save()");
 a.click('#tab-review');a.click('[data-action="review-ready"]');
 a.click(`[data-action="answer"][data-value="${a.run('activeQuestion(state.session.ids[0]).a')}"]`);a.click('[data-action="pause"]');
 const saved=JSON.parse(a.run("JSON.stringify(Object.fromEntries(['mock','study','review'].map(k=>[k,model.sessionFor(k)])))"));
 const data=a.w.localStorage.getItem('karimen-study-v4');a.close();a=app({'karimen-study-v4':data});
 for(const [mode,tab] of [['study','learn'],['review','review'],['mock','mock']]){
  a.click('#tab-'+tab);a.click(`#${tab} [data-action="resume"]`);
  assert.equal(a.run('state.session.attemptId'),saved[mode].attemptId);
  assert.deepEqual(JSON.parse(a.run('JSON.stringify(state.session.answers)')),saved[mode].answers);
  if(mode==='mock')assert.equal(a.run('model.remaining()'),saved.mock.remainingMs);
  a.click('[data-action="pause"]');if(mode==='mock')a.click('#confirm-yes');
 }
 assert.equal(a.run('state.attempts.length'),0);a.close();
 a=app();a.run("for(const q of categorized(CATS[0]).slice(0,5))model.record(q.id,q.a);for(const q of categorized(CATS[1]).slice(0,5))model.record(q.id,!q.a);model.save()");
 a.click('#tab-learn');
 assert.equal(a.query('.learning-cumulative').open,false);
 assert.equal(a.query('.learning-cumulative summary').textContent,'成績の詳細');
 assert.equal(a.query('.learning-metric-help'),null);
 a.query('#category-sort').value='weak';
 a.query('#category-sort').dispatchEvent(new a.w.Event('change',{bubbles:true}));
 assert.equal(a.query('.category-card').dataset.cat,a.run('CATS[1].k'));
 a.click('[data-action="learn-section"][data-section="notes"]');assert.ok(a.query('.note-recommendations'));
 const note=a.query('.note-recommendation').dataset.id;a.click('.note-recommendation');assert.equal(a.query('#'+note).open,true);
 const recent=a.run("recentMockSummary({list:[{total:50,answers:Array(50).fill(true),scoreSnapshot:50},{total:50,answers:[true,...Array(49).fill(null)],scoreSnapshot:1},{total:50,answers:Array(50).fill(true),scoreSnapshot:40}]})");
 assert.equal(recent,'直近2回：50点 → 40点');assert.equal(a.errors.length,0);a.close();
}
console.log('PASS: three-mode resume after reload, difficulty ordering, related-note navigation and recent full-mock scores.');
// Review status follows real answers, including the immediate first retry and uncertainty.
{
 const a=app();
 const begin="model.begin({ids:[Q[0].id],kind:'review'})";
 a.run("model.begin({ids:[Q[0].id],kind:'study'});model.answer(!Q[0].a);model.finish();renderReview()");
 assert.match(a.query('.review-progress').textContent,/卒業まで正解あと2回/);
 assert.equal(a.query('.review-row').disabled,false);
 assert.match(a.run('reviewSchedule(Q[0])'),/今すぐ復習できます/);
 assert.doesNotMatch(a.run('reviewSchedule(Q[0])'),/リセット/);
 a.run(`${begin};model.answer(Q[0].a);model.finish();renderReview()`);
 assert.match(a.query('.review-progress').textContent,/正解あと1回/);
 assert.equal(a.query('.review-row').disabled,true);
 assert.match(a.query('.review-row-status').textContent,/あと30分/);
 assert.ok(a.query('.review-row-status .icon'));
 a.clock.now+=30*60000;
 a.run(`${begin};model.answer(!Q[0].a);model.finish();renderReview()`);
 assert.match(a.run('reviewSchedule(Q[0])'),/不正解のため、卒業に向けた正解回数をリセット/);
 assert.match(a.query('.review-progress').textContent,/正解あと2回/);
 a.clock.now+=30*60000;
 a.run(`${begin};model.answer(Q[0].a,true);model.finish()`);
 assert.match(a.run('reviewSchedule(Q[0])'),/自信なしのため/);
 for(let i=0;i<2;i++){a.clock.now+=30*60000;a.run(`${begin};model.answer(Q[0].a);model.finish()`);}
 assert.equal(a.run('reviewSchedule(Q[0])'),'');
 assert.equal(a.errors.length,0);a.close();
}
console.log('PASS: review status for first error, correct retry, reset, uncertainty and graduation.');
