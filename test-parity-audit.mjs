// Exhaustive content rendering + regressions for the cross-course UI audit.
// jsdom checks structure and behavior, not mobile pixel layout.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {JSDOM,VirtualConsole} from 'jsdom';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM(read('./honmen.html'),{url:'https://example.test/honmen',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window,doc=w.document;
w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.matchMedia=()=>({matches:false,addEventListener(){}});const intervals=[];w.setInterval=f=>{intervals.push(f);return intervals.length;};w.requestAnimationFrame=f=>f();
let time=Date.now();const NativeDate=w.Date;w.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[time]));}static now(){return time;}};
w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
for(const script of doc.querySelectorAll('script[src]'))vm.runInContext(read(script.getAttribute('src').split('?')[0]),dom.getInternalVMContext());
assert.equal(await w.HonmenReady,true);
const app=w.HonmenApp,m=app.model,bank=[...m.byId.values()],click=s=>{const e=doc.querySelector(s);assert.ok(e,s);assert.ok(!e.disabled,s);e.click();};
let images=0,hazards=0;
for(const q of bank){
 assert.ok(m.begin({ids:[q.id],mode:'study',label:'描画検証'}));
 click('#tab-learn');click('#learn [data-h="resume"]');
 assert.equal(doc.querySelector('#question-title').textContent,q.text);
 assert.equal(doc.querySelectorAll('#play .answer-result').length,0);
 assert.equal(doc.querySelectorAll('#play .question-visual img').length,q.image?1:0);
 if(q.image){images++;assert.ok(fs.existsSync(q.image));}
 const keys=q.type==='hazard'?q.answer:[q.answer];
 keys.forEach((v,i)=>click(`#play [data-h="answer"][data-part="${i}"][data-value="${v}"]`));
 if(q.type==='hazard'){hazards++;click('#play [data-h="commit"]');assert.equal(doc.querySelectorAll('#play .h-statement-reasons li').length,3);}
 assert.equal(doc.activeElement,doc.querySelector('#play .answer-result'));
 assert.equal(doc.querySelectorAll('#play .learning-points').length,1);
 assert.equal(doc.querySelector('#learning-points-title').textContent,'覚えるポイント');
 assert.equal(doc.querySelector('.answer-choice').classList.contains('sr-only'),true);
 assert.equal(doc.querySelector('.answered-question .question').textContent,q.text);
 assert.ok(doc.querySelector('#play .source-link'));
 assert.ok(doc.querySelector('#play [data-h="answer-note"]'),'all questions retain notebook navigation');
 const related=w.HonmenNotes.related(q);
 assert.ok(related.length,`direct topic missing: ${q.id}`);
 assert.ok(related.every(n=>w.HonmenNotes.questions(n.id,bank).some(x=>x.id===q.id)),`reverse topic missing: ${q.id}`);
 if(w.HonmenNoteLinks[q.id]){
  const link=doc.querySelector('#play [data-h="answer-note"]');
  assert.equal(link.dataset.note,w.HonmenNoteLinks[q.id][0]);
  click('#play [data-h="answer-note"]');
  const note=doc.querySelector(`#notes [data-h-note="${link.dataset.note}"]`);
  assert.ok(note?.open,`correct topic must open: ${q.id}`);
  assert.ok(note.querySelector('.note-keypoints').textContent.includes(related[0].pts[0]));
  click('#notes [data-h="note-return"]');
  assert.equal(app.view,'play');
  assert.equal(doc.querySelector('.answered-question .question').textContent,q.text);
 }

 if(q===bank[0]){click('#play [data-h="answer-note"]');assert.equal(app.view,'notes');click('#notes [data-h="note-return"]');assert.equal(app.view,'play');assert.equal(doc.querySelector('.answered-question .question').textContent,q.text);}
 assert.equal(doc.querySelectorAll('#play [data-h="answer"]').length,0);
 assert.ok(m.finish('study'));
}
assert.equal(bank.length,760);assert.equal(hazards,40);
// Guided launch from mock must return to learning; previous/new answers survive replacement.
click('#tab-mock');click('[data-h="set"]');click('[data-h="start-set"][data-mode="guided"]');
assert.equal(doc.querySelector('#tab-learn').getAttribute('aria-selected'),'true');
const oldId=m.state.sessions.study.id;
click('#tab-learn');click('#learn [data-h="random"]');click('[data-h="close"]');assert.equal(m.state.sessions.study.id,oldId);
click('#learn [data-h="random"]');click('[data-h="replace-start"]');assert.notEqual(m.state.sessions.study.id,oldId);assert.ok(m.state.attempts.some(a=>a.id===oldId));m.finish('study');
// Keyboard navigation works from a result view, not only home pages.
click('#tab-mock');click('[data-h="settings"]');click('[data-h="records"]');click('[data-h="history"]');
doc.querySelector('#tab-mock').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.equal(app.view,'learn');
// Search reset restores focus and all notebook content.
click('[data-h="learn-section"][data-value="notes"]');const search=doc.querySelector('#note-search');search.value='no-match-audit';search.dispatchEvent(new w.Event('input',{bubbles:true}));click('[data-h="note-reset"]');assert.equal(doc.activeElement,doc.querySelector('#note-search'));
// Equal normalized achievement thresholds and non-fragmented heading markup.
click('[data-h="settings"]');click('[data-h="preview"][data-score="90"]');
for(const [score,kind] of [[89,'retry'],[90,'pass'],[96,'excellent'],[100,'perfect']]){click(`[data-h="preview"][data-score="${score}"]`);assert.ok(doc.querySelector('.result-achievement.'+kind));assert.ok(doc.querySelector('.achievement-copy h3 span'));}
click('#h-dialog [data-h="close"]');
// Review is not silently capped at the exam's 95-question count. Roundtrip the larger session.
for(const q of bank.slice(0,120)){m.state.stats[q.id].reviewAt=1;m.state.stats[q.id].passes=0;}
assert.ok(m.begin({ids:bank.slice(0,120).map(q=>q.id),mode:'review'}));assert.equal(m.state.sessions.review.ids.length,120);assert.equal(w.HonmenModel.normalize(JSON.parse(m.export())).sessions.review.ids.length,120);m.finish('review');
// Time transitions must preserve an expanded/focused summary and clear yesterday's completion.
assert.ok(m.reset());const q=bank[0];m.begin({ids:[q.id]});m.answer('study',0,!q.answer);m.finish('study');m.begin({ids:[q.id],mode:'review'});m.answer('review',0,q.answer);m.finish('review');
click('#tab-learn');click('[data-h="learn-section"][data-value="categories"]');
const categoryCard=doc.querySelector(`[data-h="category"][data-category="${q.category}"]`).closest('article');categoryCard.querySelector('details').open=true;categoryCard.querySelector('summary').focus();
time+=31*60*1000;intervals.forEach(f=>f());
assert.equal(doc.activeElement.tagName,'SUMMARY');assert.ok(doc.activeElement.parentElement.open);assert.equal(doc.activeElement.closest('article').querySelector('[data-h="category"]').dataset.category,q.category);
m.begin({ids:[q.id],mode:'review'});m.answer('review',0,q.answer);m.finish('review');click('#tab-review');assert.match(doc.querySelector('#review .page-heading').textContent,/今日の復習は完了/);
time+=24*60*60*1000;intervals.forEach(f=>f());assert.doesNotMatch(doc.querySelector('#review .page-heading').textContent,/今日の復習は完了/);
assert.deepEqual(errors,[]);await app.storage.flush();app.storage.close();w.close();
console.log(`Parity audit passed: all ${bank.length} honmen prompts and revealed answers, ${images} image bindings, ${hazards} hazards, focus/return/replace/search/keyboard/achievement/review-size regressions.`);
